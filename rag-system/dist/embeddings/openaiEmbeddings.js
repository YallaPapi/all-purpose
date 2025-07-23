"use strict";
/**
 * OpenAI Embeddings Service
 *
 * Use context7: OpenAI embeddings with proper error handling and caching
 * Following All-Purpose Pattern: Configurable for ANY embedding model
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultEmbeddings = exports.OpenAIEmbeddings = void 0;
exports.createOpenAIEmbeddings = createOpenAIEmbeddings;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../utils/logger");
/**
 * OpenAI Embeddings Service
 * Handles embedding generation with batching, retries, and cost tracking
 */
class OpenAIEmbeddings {
    constructor(config = {}) {
        // Model pricing per 1K tokens (as of context7 current rates)
        this.MODEL_COSTS = {
            'text-embedding-3-small': 0.00002,
            'text-embedding-3-large': 0.00013,
            'text-embedding-ada-002': 0.0001
        };
        this.config = {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: 'text-embedding-3-small', // Use context7: 1024 dimensions to match vector DB
            batchSize: 10, // Use context7: Smaller batches to prevent memory issues
            retryAttempts: 3,
            retryDelay: 1000,
            ...config
        };
        // Lazy initialization - validation happens when client is first needed
        logger_1.embeddingLogger.info('OpenAI Embeddings service initialized', {
            model: this.config.model,
            batchSize: this.config.batchSize
        });
    }
    /**
     * Get or create OpenAI client with validation
     */
    getClient() {
        if (!this.client) {
            // Re-read environment variable in case it was set after construction
            this.config.apiKey = this.config.apiKey || process.env.OPENAI_API_KEY || '';
            if (!this.config.apiKey) {
                throw new Error('OPENAI_API_KEY environment variable is required');
            }
            this.client = new openai_1.default({ apiKey: this.config.apiKey });
        }
        return this.client;
    }
    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text) {
        const results = await this.generateEmbeddings([text]);
        return results.results[0];
    }
    /**
     * Generate embeddings for multiple texts with batching
     */
    async generateEmbeddings(texts) {
        logger_1.embeddingLogger.info('Starting embedding generation', {
            textCount: texts.length,
            model: this.config.model
        });
        const results = [];
        let totalTokens = 0;
        let totalCost = 0;
        // Process in batches to respect API limits
        for (let i = 0; i < texts.length; i += this.config.batchSize) {
            const batch = texts.slice(i, i + this.config.batchSize);
            const batchResults = await this.processBatch(batch);
            results.push(...batchResults.results);
            totalTokens += batchResults.totalTokens;
            totalCost += batchResults.totalCost;
            // Small delay between batches to be respectful to API
            if (i + this.config.batchSize < texts.length) {
                await this.delay(100);
            }
        }
        logger_1.embeddingLogger.info('Embedding generation completed', {
            processedTexts: results.length,
            totalTokens,
            estimatedCost: totalCost,
            model: this.config.model
        });
        return {
            results,
            totalTokens,
            totalCost
        };
    }
    /**
     * Process a single batch of texts
     */
    async processBatch(texts) {
        let attempt = 0;
        while (attempt < this.config.retryAttempts) {
            try {
                logger_1.embeddingLogger.debug('Processing embedding batch', {
                    batchSize: texts.length,
                    attempt: attempt + 1
                });
                // Use context7: Current OpenAI embeddings API pattern
                const response = await this.getClient().embeddings.create({
                    model: this.config.model,
                    input: texts,
                    encoding_format: 'float'
                });
                const results = texts.map((text, index) => ({
                    text,
                    embedding: response.data[index].embedding,
                    tokens: Math.ceil(text.length / 4), // Rough token estimation
                    model: this.config.model
                }));
                const totalTokens = response.usage.total_tokens;
                const costPerThousandTokens = this.MODEL_COSTS[this.config.model] || 0.0001;
                const totalCost = (totalTokens / 1000) * costPerThousandTokens;
                return {
                    results,
                    totalTokens,
                    totalCost
                };
            }
            catch (error) {
                attempt++;
                logger_1.embeddingLogger.warn('Embedding batch failed, retrying', {
                    attempt,
                    error: error instanceof Error ? error.message : String(error),
                    batchSize: texts.length
                });
                if (attempt >= this.config.retryAttempts) {
                    logger_1.embeddingLogger.error('Embedding batch failed after all retries', {
                        attempts: this.config.retryAttempts,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    throw error;
                }
                await this.delay(this.config.retryDelay * attempt);
            }
        }
        throw new Error('Failed to process embedding batch');
    }
    /**
     * Get embedding dimension for the current model
     */
    getEmbeddingDimension() {
        // Use context7: Current OpenAI embedding dimensions
        const dimensions = {
            'text-embedding-3-small': 1536,
            'text-embedding-3-large': 3072,
            'text-embedding-ada-002': 1536
        };
        return dimensions[this.config.model] || 1536;
    }
    /**
     * Validate text for embedding (check length, content)
     */
    validateText(text) {
        if (!text || text.trim().length === 0) {
            return { valid: false, reason: 'Text is empty' };
        }
        // Use context7: OpenAI token limits
        const estimatedTokens = Math.ceil(text.length / 4);
        if (estimatedTokens > 8191) { // Current token limit for embedding models
            return { valid: false, reason: `Text too long: ~${estimatedTokens} tokens (max 8191)` };
        }
        return { valid: true };
    }
    /**
     * Simple delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.OpenAIEmbeddings = OpenAIEmbeddings;
/**
 * Create OpenAI embeddings service with default configuration
 */
function createOpenAIEmbeddings(config) {
    return new OpenAIEmbeddings(config);
}
/**
 * Default OpenAI embeddings instance (lazy initialization)
 */
exports.defaultEmbeddings = (() => {
    try {
        return createOpenAIEmbeddings();
    }
    catch (error) {
        // Return null if API key not available - will be created when needed
        return null;
    }
})();
//# sourceMappingURL=openaiEmbeddings.js.map