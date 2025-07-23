"use strict";
/**
 * Context Injection API
 *
 * Use context7: Smart prompt enhancement with relevant documentation
 * Following All-Purpose Pattern: Configurable context injection for ANY prompt types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextHelpers = exports.ContextAPI = void 0;
exports.createContextAPI = createContextAPI;
const embeddingAdapter_1 = require("../embeddings/embeddingAdapter");
const upstashVectorClient_1 = require("../vectordb/upstashVectorClient");
const logger_1 = require("../utils/logger");
/**
 * Context Injection API
 * Provides intelligent context enhancement for prompts
 */
class ContextAPI {
    constructor(config = {}) {
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
        this.embeddings = (0, embeddingAdapter_1.createEmbeddingAdapter)();
        this.vectorClient = (0, upstashVectorClient_1.createUpstashVectorClient)();
        logger_1.apiLogger.info('Context API initialized', {
            maxContextLength: this.config.maxContextLength,
            autoEnhancement: this.config.enableAutoEnhancement
        });
    }
    /**
     * Search for relevant context based on a query
     */
    async searchContext(query) {
        const startTime = Date.now();
        logger_1.apiLogger.info('Searching for context', {
            prompt: query.prompt.substring(0, 100) + '...',
            maxResults: query.maxResults
        });
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.embeddings.generateEmbedding(query.prompt);
            // Search for similar vectors
            const searchResults = await this.vectorClient.searchVectors(queryEmbedding.embedding, {
                topK: query.maxResults || this.config.defaultMaxResults,
                includeMetadata: query.includeMetadata !== false,
                scoreThreshold: query.scoreThreshold || this.config.defaultScoreThreshold
            });
            // Convert to context results
            const contextResults = searchResults.map(result => ({
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
            logger_1.apiLogger.info('Context search completed', {
                resultsFound: contextResults.length,
                searchTime
            });
            return contextResults;
        }
        catch (error) {
            logger_1.apiLogger.error('Context search failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Enhance a prompt with relevant context
     */
    async enhancePrompt(query) {
        const startTime = Date.now();
        logger_1.apiLogger.info('Enhancing prompt with context', {
            prompt: query.prompt.substring(0, 100) + '...'
        });
        try {
            // Search for relevant context
            const contextResults = await this.searchContext(query);
            if (contextResults.length === 0) {
                logger_1.apiLogger.info('No context found, returning original prompt');
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
            logger_1.apiLogger.info('Prompt enhancement completed', {
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
        }
        catch (error) {
            logger_1.apiLogger.error('Prompt enhancement failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Add context to the knowledge base
     */
    async addContext(content, metadata = {}) {
        logger_1.apiLogger.info('Adding context to knowledge base', {
            contentLength: content.length,
            fileName: metadata.fileName
        });
        try {
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
                logger_1.apiLogger.info('Context added successfully', {
                    id: vectorPoint.id,
                    fileName: metadata.fileName
                });
            }
            return success;
        }
        catch (error) {
            logger_1.apiLogger.error('Failed to add context', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Build context string from results
     */
    buildContextString(results) {
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
    formatContextItem(result) {
        const header = result.metadata.fileName
            ? `## ${result.metadata.fileName}${result.metadata.section ? ` - ${result.metadata.section}` : ''}`
            : '## Relevant Information';
        return `${header}\n\n${result.snippet}`;
    }
    /**
     * Generate a snippet from content
     */
    generateSnippet(content, query) {
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
        if (bestPosition > 0)
            snippet = '...' + snippet;
        if (bestPosition + maxSnippetLength < content.length)
            snippet = snippet + '...';
        return snippet.trim();
    }
    /**
     * Generate unique ID for context
     */
    generateContextId(content, metadata) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256')
            .update(content + JSON.stringify(metadata))
            .digest('hex');
        return `ctx-${hash.substring(0, 16)}`;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.ContextAPI = ContextAPI;
/**
 * Create context API with default configuration
 */
function createContextAPI(config) {
    return new ContextAPI(config);
}
/**
 * Quick helper functions for common operations
 */
exports.contextHelpers = {
    /**
     * Quick context search
     */
    async search(prompt, maxResults = 3) {
        const api = createContextAPI();
        return api.searchContext({ prompt, maxResults });
    },
    /**
     * Quick prompt enhancement
     */
    async enhance(prompt, maxResults = 3) {
        const api = createContextAPI();
        const result = await api.enhancePrompt({ prompt, maxResults });
        return result.enhancedPrompt;
    },
    /**
     * Add documentation
     */
    async addDoc(content, fileName, section) {
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
//# sourceMappingURL=contextAPI.js.map