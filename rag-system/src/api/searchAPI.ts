/**
 * Semantic Search API
 * 
 * Use context7: Advanced semantic search with context ranking and query enhancement
 * Following All-Purpose Pattern: Configurable search for ANY documentation types
 */

import { createEmbeddingAdapter, EmbeddingAdapter } from '../embeddings/embeddingAdapter';
import { createUpstashVectorClient, UpstashVectorClient, SearchResult } from '../vectordb/upstashVectorClient';
import { logger, apiLogger } from '../utils/logger';

export interface SearchConfig {
  maxResults: number;
  scoreThreshold: number;
  enableQueryExpansion: boolean;
  enableContextRanking: boolean;
  enableRecencyBoost: boolean;
  recencyDecayDays: number;
  contextWeights: {
    relevance: number;
    recency: number;
    fileType: number;
    section: number;
  };
}

export interface SearchQuery {
  query: string;
  filters?: {
    fileType?: string[];
    filePath?: string[];
    language?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    contentType?: string[];
  };
  options?: {
    maxResults?: number;
    scoreThreshold?: number;
    includeMetadata?: boolean;
    includeContent?: boolean;
    expandQuery?: boolean;
  };
}

export interface EnhancedSearchResult {
  id: string;
  content: string;
  relevanceScore: number;
  contextScore: number;
  finalScore: number;
  metadata: {
    filePath: string;
    fileName: string;
    fileType: string;
    chunkIndex: number;
    totalChunks: number;
    lastModified: Date;
    language?: string;
    section?: string;
    title?: string;
    contentType?: string;
  };
  snippet: string;
  highlights: string[];
  rank: number;
}

export interface SearchResponse {
  results: EnhancedSearchResult[];
  query: {
    original: string;
    expanded?: string[];
    processed: string;
  };
  stats: {
    totalResults: number;
    searchTime: number;
    processingTime: number;
    embeddingTime: number;
  };
  suggestions?: string[];
}

/**
 * Advanced Semantic Search Service
 * Provides intelligent document retrieval with context-aware ranking
 */
export class SemanticSearchAPI {
  private config: SearchConfig;
  private embeddings: EmbeddingAdapter;
  private vectorClient: UpstashVectorClient;

  constructor(config: Partial<SearchConfig> = {}) {
    this.config = {
      maxResults: 10,
      scoreThreshold: 0.7,
      enableQueryExpansion: true,
      enableContextRanking: true,
      enableRecencyBoost: true,
      recencyDecayDays: 30,
      contextWeights: {
        relevance: 0.6,
        recency: 0.2,
        fileType: 0.1,
        section: 0.1
      },
      ...config
    };

    this.embeddings = createEmbeddingAdapter();
    this.vectorClient = createUpstashVectorClient();

    apiLogger.info('Semantic Search API initialized', {
      maxResults: this.config.maxResults,
      scoreThreshold: this.config.scoreThreshold,
      contextRanking: this.config.enableContextRanking
    });
  }

  /**
   * Perform semantic search with advanced ranking
   */
  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    apiLogger.info('Performing semantic search', { 
      query: searchQuery.query,
      filters: searchQuery.filters ? Object.keys(searchQuery.filters) : []
    });

    try {
      // Step 1: Process and enhance query
      const embeddingStartTime = Date.now();
      const processedQuery = await this.processQuery(searchQuery.query);
      const queryEmbedding = await this.embeddings.generateEmbedding(processedQuery.processed);
      const embeddingTime = Date.now() - embeddingStartTime;

      // Step 2: Perform vector search
      const vectorSearchResults = await this.vectorClient.searchVectors(
        queryEmbedding.embedding,
        {
          topK: Math.max(this.config.maxResults * 3, 50), // Get more results for reranking
          includeMetadata: true,
          includeVectors: false,
          scoreThreshold: this.config.scoreThreshold * 0.8 // Lower threshold for initial search
        }
      );

      // Step 3: Apply filters
      const filteredResults = this.applyFilters(vectorSearchResults, searchQuery.filters);

      // Step 4: Enhanced ranking and scoring
      const processingStartTime = Date.now();
      const rankedResults = await this.rankResults(filteredResults, searchQuery);
      const processingTime = Date.now() - processingStartTime;

      // Step 5: Generate enhanced results
      const enhancedResults = await this.enhanceResults(
        rankedResults.slice(0, searchQuery.options?.maxResults || this.config.maxResults),
        searchQuery.query
      );

      // Step 6: Generate suggestions (if no good results)
      const suggestions = enhancedResults.length < 3 ? 
        await this.generateSuggestions(searchQuery.query) : undefined;

      const totalTime = Date.now() - startTime;

      const response: SearchResponse = {
        results: enhancedResults,
        query: {
          original: searchQuery.query,
          expanded: processedQuery.expanded,
          processed: processedQuery.processed
        },
        stats: {
          totalResults: vectorSearchResults.length,
          searchTime: totalTime,
          processingTime,
          embeddingTime
        },
        suggestions
      };

      apiLogger.info('Search completed successfully', {
        query: searchQuery.query,
        results: enhancedResults.length,
        searchTime: totalTime
      });

      return response;

    } catch (error) {
      apiLogger.error('Search failed', {
        query: searchQuery.query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process and enhance the search query
   */
  private async processQuery(query: string): Promise<{
    processed: string;
    expanded?: string[];
  }> {
    let processed = query.trim();
    let expanded: string[] | undefined;

    if (this.config.enableQueryExpansion) {
      // Generate query variations for better recall
      expanded = await this.expandQuery(query);
      
      // Combine original query with expansions
      if (expanded.length > 0) {
        processed = [query, ...expanded.slice(0, 2)].join(' ');
      }
    }

    return { processed, expanded };
  }

  /**
   * Expand query with related terms and concepts
   */
  private async expandQuery(query: string): Promise<string[]> {
    // Simple query expansion based on common development terms
    const expansions: string[] = [];
    
    const developmentTerms: Record<string, string[]> = {
      'agent': ['meta-agent', 'ai agent', 'automation'],
      'taskmaster': ['task master', 'task management', 'workflow'],
      'pattern': ['all-purpose pattern', 'design pattern', 'methodology'],
      'vercel': ['deployment', 'serverless', 'hosting'],
      'rag': ['retrieval', 'embedding', 'vector database'],
      'documentation': ['docs', 'guide', 'reference'],
      'api': ['endpoint', 'route', 'service'],
      'typescript': ['ts', 'javascript', 'type'],
      'database': ['storage', 'persistence', 'data']
    };

    const lowerQuery = query.toLowerCase();
    
    for (const [term, variants] of Object.entries(developmentTerms)) {
      if (lowerQuery.includes(term)) {
        expansions.push(...variants.filter(v => !lowerQuery.includes(v)));
      }
    }

    return expansions.slice(0, 3); // Limit expansions
  }

  /**
   * Apply search filters to results
   */
  private applyFilters(
    results: SearchResult[],
    filters?: SearchQuery['filters']
  ): SearchResult[] {
    if (!filters) return results;

    return results.filter(result => {
      const metadata = result.metadata;
      if (!metadata) return true;

      // File type filter
      if (filters.fileType && filters.fileType.length > 0) {
        const fileType = metadata.fileType?.toLowerCase();
        if (!fileType || !filters.fileType.some(ft => fileType.includes(ft.toLowerCase()))) {
          return false;
        }
      }

      // File path filter
      if (filters.filePath && filters.filePath.length > 0) {
        const filePath = metadata.filePath?.toLowerCase();
        if (!filePath || !filters.filePath.some(fp => filePath.includes(fp.toLowerCase()))) {
          return false;
        }
      }

      // Language filter
      if (filters.language && filters.language.length > 0) {
        const language = metadata.language?.toLowerCase();
        if (!language || !filters.language.some(lang => language.includes(lang.toLowerCase()))) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        const lastModified = new Date(metadata.lastModified);
        
        if (filters.dateRange.start && lastModified < filters.dateRange.start) {
          return false;
        }
        
        if (filters.dateRange.end && lastModified > filters.dateRange.end) {
          return false;
        }
      }

      // Content type filter
      if (filters.contentType && filters.contentType.length > 0) {
        const contentType = metadata.contentType?.toLowerCase();
        if (!contentType || !filters.contentType.some(ct => contentType.includes(ct.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Rank results using multiple factors
   */
  private async rankResults(
    results: SearchResult[],
    searchQuery: SearchQuery
  ): Promise<SearchResult[]> {
    if (!this.config.enableContextRanking) {
      return results;
    }

    const now = new Date();
    const weights = this.config.contextWeights;

    const scoredResults = results.map(result => {
      let contextScore = 0;
      const metadata = result.metadata;

      // Relevance score (original similarity score)
      const relevanceScore = result.score;
      contextScore += relevanceScore * weights.relevance;

      // Recency boost
      if (this.config.enableRecencyBoost && metadata?.lastModified) {
        const lastModified = new Date(metadata.lastModified);
        const daysSinceModified = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 1 - (daysSinceModified / this.config.recencyDecayDays));
        contextScore += recencyScore * weights.recency;
      }

      // File type priority
      if (metadata?.fileType) {
        const fileTypePriority = this.getFileTypePriority(metadata.fileType);
        contextScore += fileTypePriority * weights.fileType;
      }

      // Section importance
      if (metadata?.section) {
        const sectionPriority = this.getSectionPriority(metadata.section);
        contextScore += sectionPriority * weights.section;
      }

      return {
        ...result,
        contextScore,
        finalScore: contextScore
      };
    });

    // Sort by final score
    return scoredResults.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Get file type priority for ranking
   */
  private getFileTypePriority(fileType: string): number {
    const priorities: Record<string, number> = {
      '.md': 0.9,     // Markdown documentation
      '.txt': 0.8,    // Text files
      '.json': 0.7,   // Configuration
      '.ts': 0.6,     // TypeScript code
      '.js': 0.6,     // JavaScript code
      '.py': 0.5,     // Python code
      '.yaml': 0.4,   // YAML config
      '.yml': 0.4     // YAML config
    };

    return priorities[fileType.toLowerCase()] || 0.3;
  }

  /**
   * Get section priority for ranking
   */
  private getSectionPriority(section: string): number {
    const lowerSection = section.toLowerCase();
    
    // Prioritize important sections
    if (lowerSection.includes('overview') || lowerSection.includes('introduction')) return 0.9;
    if (lowerSection.includes('pattern') || lowerSection.includes('methodology')) return 0.8;
    if (lowerSection.includes('example') || lowerSection.includes('usage')) return 0.7;
    if (lowerSection.includes('api') || lowerSection.includes('reference')) return 0.6;
    if (lowerSection.includes('config') || lowerSection.includes('setup')) return 0.5;
    
    return 0.3; // Default priority
  }

  /**
   * Enhance search results with snippets and highlights
   */
  private async enhanceResults(
    results: SearchResult[],
    originalQuery: string
  ): Promise<EnhancedSearchResult[]> {
    const queryTerms = this.extractQueryTerms(originalQuery);

    return results.map((result, index) => {
      const content = result.metadata?.content || '';
      const snippet = this.generateSnippet(content, queryTerms);
      const highlights = this.findHighlights(content, queryTerms);

      return {
        id: result.id,
        content,
        relevanceScore: result.score,
        contextScore: (result as any).contextScore || result.score,
        finalScore: (result as any).finalScore || result.score,
        metadata: {
          filePath: result.metadata?.filePath || '',
          fileName: result.metadata?.fileName || '',
          fileType: result.metadata?.fileType || '',
          chunkIndex: result.metadata?.chunkIndex || 0,
          totalChunks: result.metadata?.totalChunks || 1,
          lastModified: new Date(result.metadata?.lastModified || Date.now()),
          language: result.metadata?.language,
          section: result.metadata?.section,
          title: result.metadata?.title,
          contentType: result.metadata?.contentType
        },
        snippet,
        highlights,
        rank: index + 1
      };
    });
  }

  /**
   * Extract meaningful terms from query
   */
  private extractQueryTerms(query: string): string[] {
    // Simple term extraction - split on whitespace and punctuation
    return query
      .toLowerCase()
      .split(/[\s,.\-_!?]+/)
      .filter(term => term.length > 2)
      .slice(0, 10); // Limit terms
  }

  /**
   * Generate content snippet with context
   */
  private generateSnippet(content: string, queryTerms: string[]): string {
    const maxSnippetLength = 200;
    
    if (content.length <= maxSnippetLength) {
      return content;
    }

    // Find best position for snippet (containing most query terms)
    let bestPosition = 0;
    let bestScore = 0;
    const windowSize = maxSnippetLength;

    for (let i = 0; i <= content.length - windowSize; i += 50) {
      const window = content.slice(i, i + windowSize).toLowerCase();
      const score = queryTerms.reduce((sum, term) => {
        return sum + (window.includes(term) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestPosition = i;
      }
    }

    // Extract snippet and clean up
    let snippet = content.slice(bestPosition, bestPosition + windowSize);
    
    // Try to end at word boundary
    const lastSpace = snippet.lastIndexOf(' ');
    if (lastSpace > windowSize * 0.8) {
      snippet = snippet.slice(0, lastSpace);
    }

    // Add ellipsis if needed
    if (bestPosition > 0) snippet = '...' + snippet;
    if (bestPosition + windowSize < content.length) snippet = snippet + '...';

    return snippet.trim();
  }

  /**
   * Find highlighted terms in content
   */
  private findHighlights(content: string, queryTerms: string[]): string[] {
    const highlights: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const term of queryTerms) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches.slice(0, 3)); // Limit highlights per term
      }
    }

    return Array.from(new Set(highlights)).slice(0, 10); // Remove duplicates and limit
  }

  /**
   * Generate search suggestions for poor results
   */
  private async generateSuggestions(query: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Simple suggestion generation based on common queries
    const commonQueries = [
      'all-purpose pattern',
      'taskmaster usage',
      'meta-agent structure',
      'vercel deployment',
      'documentation overview',
      'project setup',
      'api reference',
      'development guide'
    ];

    // Find similar queries
    const lowerQuery = query.toLowerCase();
    for (const commonQuery of commonQueries) {
      if (this.calculateSimilarity(lowerQuery, commonQuery.toLowerCase()) > 0.3) {
        suggestions.push(commonQuery);
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Simple string similarity calculation
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Get current configuration
   */
  getConfig(): SearchConfig {
    return { ...this.config };
  }
}

/**
 * Create semantic search API with default configuration
 */
export function createSemanticSearchAPI(config?: Partial<SearchConfig>): SemanticSearchAPI {
  return new SemanticSearchAPI(config);
}

// Use context7: No default exports that initialize immediately
// Create instances when needed with proper configuration