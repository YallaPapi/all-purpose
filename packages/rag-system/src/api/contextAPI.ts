/**
 * Context Injection API
 * 
 * Use context7: Smart prompt enhancement with relevant documentation
 * Following All-Purpose Pattern: Configurable context injection for ANY prompt types
 */

import { createEmbeddingAdapter, EmbeddingAdapter } from '../embeddings/embeddingAdapter';
import { createUpstashVectorClient, UpstashVectorClient } from '../vectordb/upstashVectorClient';
import { logger, apiLogger } from '../utils/logger';

export interface ContextQuery {
  prompt: string;
  maxResults?: number;
  scoreThreshold?: number;
  contextTypes?: string[];
  includeMetadata?: boolean;
}

export interface ContextResult {
  id: string;
  content: string;
  relevanceScore: number;
  metadata: {
    fileName?: string;
    filePath?: string;
    section?: string;
    contentType?: string;
    lastModified?: Date;
  };
  snippet: string;
}

export interface EnhancedPrompt {
  originalPrompt: string;
  enhancedPrompt: string;
  contextResults: ContextResult[];
  stats: {
    contextItemsFound: number;
    totalContextLength: number;
    enhancementTime: number;
  };
}

export interface ContextConfig {
  maxContextLength: number;
  contextTemplate: string;
  enableAutoEnhancement: boolean;
  defaultMaxResults: number;
  defaultScoreThreshold: number;
}

/**
 * Context Injection API
 * Provides intelligent context enhancement for prompts
 */
export class ContextAPI {
  private config: ContextConfig;
  private embeddings: EmbeddingAdapter;
  private vectorClient: UpstashVectorClient;

  constructor(config: Partial<ContextConfig> = {}) {
    this.config = {
      maxContextLength: 4000, // Use context7: Safe context window limit
      contextTemplate: `# Project Context

{context}

# Your Task

{originalPrompt}

Please use the project context above to inform your response. Follow established patterns and methodologies.`,
      enableAutoEnhancement: true,
      defaultMaxResults: 5,
      defaultScoreThreshold: 0.7,
      ...config
    };

    this.embeddings = createEmbeddingAdapter();
    this.vectorClient = createUpstashVectorClient();

    apiLogger.info('Context API initialized', {
      maxContextLength: this.config.maxContextLength,
      autoEnhancement: this.config.enableAutoEnhancement
    });
  }

  /**
   * Search for relevant context based on a query
   */
  async searchContext(query: ContextQuery): Promise<ContextResult[]> {
    const startTime = Date.now();
    apiLogger.info('Searching for context', { 
      prompt: query.prompt ? query.prompt.substring(0, 100) + '...' : '[no prompt]',
      maxResults: query.maxResults 
    });

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.generateEmbedding(query.prompt);

      // Search for similar vectors
      const searchResults = await this.vectorClient.searchVectors(
        queryEmbedding.embedding,
        {
          topK: query.maxResults || this.config.defaultMaxResults,
          includeMetadata: query.includeMetadata !== false,
          scoreThreshold: query.scoreThreshold || this.config.defaultScoreThreshold
        }
      );

      // Convert to context results
      const contextResults: ContextResult[] = searchResults.map(result => ({
        id: result.id,
        content: result.metadata?.content || '',
        relevanceScore: result.score,
        metadata: {
          fileName: result.metadata?.fileName,
          filePath: result.metadata?.filePath,
          section: result.metadata?.section,
          contentType: result.metadata?.contentType,
          lastModified: result.metadata?.lastModified ? new Date(result.metadata.lastModified) : undefined
        },
        snippet: this.generateSnippet(result.metadata?.content || '', query.prompt)
      }));

      const searchTime = Date.now() - startTime;
      apiLogger.info('Context search completed', {
        resultsFound: contextResults.length,
        searchTime
      });

      return contextResults;

    } catch (error) {
      apiLogger.error('Context search failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Enhance a prompt with relevant context
   */
  async enhancePrompt(query: ContextQuery): Promise<EnhancedPrompt> {
    const startTime = Date.now();
    apiLogger.info('Enhancing prompt with context', { 
      prompt: query.prompt ? query.prompt.substring(0, 100) + '...' : '[no prompt]' 
    });

    try {
      // Search for relevant context
      const contextResults = await this.searchContext(query);

      if (contextResults.length === 0) {
        apiLogger.info('No context found, returning original prompt');
        return {
          originalPrompt: query.prompt,
          enhancedPrompt: query.prompt,
          contextResults: [],
          stats: {
            contextItemsFound: 0,
            totalContextLength: 0,
            enhancementTime: Date.now() - startTime
          }
        };
      }

      // Build context string
      const contextString = this.buildContextString(contextResults);
      
      // Apply template
      const enhancedPrompt = this.config.contextTemplate
        .replace('{context}', contextString)
        .replace('{originalPrompt}', query.prompt);

      const enhancementTime = Date.now() - startTime;
      
      apiLogger.info('Prompt enhancement completed', {
        contextItems: contextResults.length,
        contextLength: contextString.length,
        enhancementTime
      });

      return {
        originalPrompt: query.prompt,
        enhancedPrompt,
        contextResults,
        stats: {
          contextItemsFound: contextResults.length,
          totalContextLength: contextString.length,
          enhancementTime
        }
      };

    } catch (error) {
      apiLogger.error('Prompt enhancement failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Add context to the knowledge base
   */
  async addContext(
    content: string,
    metadata: {
      fileName?: string;
      filePath?: string;
      section?: string;
      contentType?: string;
      title?: string;
    } = {}
  ): Promise<boolean> {
    apiLogger.info('Adding context to knowledge base', {
      contentLength: content.length,
      fileName: metadata.fileName,
      contentPreview: content ? content.substring(0, 100) + '...' : '[no content]',
      contentType: typeof content
    });

    try {
      // Validate content before embedding
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error(`Invalid content for embedding: ${typeof content}, length: ${content?.length || 0}`);
      }

      // Generate embedding
      const embedding = await this.embeddings.generateEmbedding(content);

      // Create vector point
      const vectorPoint = {
        id: this.generateContextId(content, metadata),
        vector: embedding.embedding,
        metadata: {
          content,
          ...metadata,
          addedAt: new Date().toISOString()
        }
      };

      // Store in vector database
      const success = await this.vectorClient.upsertVectors([vectorPoint]);

      if (success) {
        apiLogger.info('Context added successfully', {
          id: vectorPoint.id,
          fileName: metadata.fileName
        });
      }

      return success;

    } catch (error) {
      apiLogger.error('Failed to add context', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Build context string from results
   */
  private buildContextString(results: ContextResult[]): string {
    let contextString = '';
    let totalLength = 0;

    for (const result of results) {
      const contextItem = this.formatContextItem(result);
      
      // Check if adding this item would exceed the limit
      if (totalLength + contextItem.length > this.config.maxContextLength) {
        break;
      }

      contextString += contextItem + '\n\n';
      totalLength += contextItem.length;
    }

    return contextString.trim();
  }

  /**
   * Format a single context item
   */
  private formatContextItem(result: ContextResult): string {
    const header = result.metadata.fileName 
      ? `## ${result.metadata.fileName}${result.metadata.section ? ` - ${result.metadata.section}` : ''}`
      : '## Relevant Information';

    return `${header}\n\n${result.snippet}`;
  }

  /**
   * Generate a snippet from content
   */
  private generateSnippet(content: string, query: string): string {
    const maxSnippetLength = 300;
    
    if (content.length <= maxSnippetLength) {
      return content;
    }

    // Try to find the most relevant part
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let bestPosition = 0;
    let bestScore = 0;

    // Look for sections with the most query words
    for (let i = 0; i <= content.length - maxSnippetLength; i += 50) {
      const window = content.slice(i, i + maxSnippetLength).toLowerCase();
      const score = queryWords.reduce((sum, word) => {
        return sum + (window.includes(word) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }

    let snippet = content.slice(bestPosition, bestPosition + maxSnippetLength);
    
    // Try to end at a sentence boundary
    const lastPeriod = snippet.lastIndexOf('.');
    if (lastPeriod > maxSnippetLength * 0.7) {
      snippet = snippet.slice(0, lastPeriod + 1);
    }

    // Add ellipsis if needed
    if (bestPosition > 0) snippet = '...' + snippet;
    if (bestPosition + maxSnippetLength < content.length) snippet = snippet + '...';

    return snippet.trim();
  }

  /**
   * Generate unique ID for context
   */
  private generateContextId(content: string, metadata: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256')
      .update(content + JSON.stringify(metadata))
      .digest('hex');
    return `ctx-${hash.substring(0, 16)}`;
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextConfig {
    return { ...this.config };
  }
}

/**
 * Create context API with default configuration
 */
export function createContextAPI(config?: Partial<ContextConfig>): ContextAPI {
  return new ContextAPI(config);
}

/**
 * Quick helper functions for common operations
 */
export const contextHelpers = {
  /**
   * Quick context search
   */
  async search(prompt: string, maxResults = 3): Promise<ContextResult[]> {
    const api = createContextAPI();
    return api.searchContext({ prompt, maxResults });
  },

  /**
   * Quick prompt enhancement
   */
  async enhance(prompt: string, maxResults = 3): Promise<string> {
    const api = createContextAPI();
    const result = await api.enhancePrompt({ prompt, maxResults });
    return result.enhancedPrompt;
  },

  /**
   * Add documentation
   */
  async addDoc(content: string, fileName: string, section?: string): Promise<boolean> {
    const api = createContextAPI();
    return api.addContext(content, { 
      fileName, 
      section,
      contentType: 'documentation',
      filePath: fileName 
    });
  }
};

// Use context7: No default exports that initialize immediately