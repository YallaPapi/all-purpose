"use strict";
/**
 * Embedding Adapter
 *
 * Adapts OpenAI embeddings to match vector database dimensions
 * Following All-Purpose Pattern: Configurable for ANY dimension requirements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultEmbeddingAdapter = exports.EmbeddingAdapter = void 0;
exports.createEmbeddingAdapter = createEmbeddingAdapter;
const openaiEmbeddings_1 = require("./openaiEmbeddings");
const logger_1 = require("../utils/logger");
/**
 * Embedding Adapter Service
 * Converts embeddings to match vector database requirements
 */
class EmbeddingAdapter {
    constructor(config = {}) {
        this.config = {
            targetDimension: 1024, // Match your Upstash Vector DB
            sourceModel: 'text-embedding-3-small',
            adaptationMethod: 'truncate',
            preserveNorm: true,
            ...config
        };
        this.openaiEmbeddings = new openaiEmbeddings_1.OpenAIEmbeddings({
            model: this.config.sourceModel
        });
        logger_1.embeddingLogger.info('Embedding Adapter initialized', {
            targetDimension: this.config.targetDimension,
            sourceModel: this.config.sourceModel,
            method: this.config.adaptationMethod
        });
    }
    /**
     * Generate adapted embedding for a single text
     */
    async generateEmbedding(text) {
        const results = await this.generateEmbeddings([text]);
        return results.results[0];
    }
    /**
     * Generate adapted embeddings for multiple texts
     */
    async generateEmbeddings(texts) {
        logger_1.embeddingLogger.info('Generating adapted embeddings', {
            textCount: texts.length,
            targetDimension: this.config.targetDimension
        });
        // Generate original embeddings
        const originalResults = await this.openaiEmbeddings.generateEmbeddings(texts);
        // Adapt each embedding
        const adaptedResults = originalResults.results.map(result => {
            const adaptedEmbedding = this.adaptEmbedding(result.embedding);
            return {
                text: result.text,
                embedding: adaptedEmbedding,
                originalDimension: result.embedding.length,
                targetDimension: this.config.targetDimension,
                adaptationMethod: this.config.adaptationMethod,
                tokens: result.tokens,
                model: result.model
            };
        });
        logger_1.embeddingLogger.info('Embedding adaptation completed', {
            processed: adaptedResults.length,
            originalDim: adaptedResults[0]?.originalDimension,
            targetDim: adaptedResults[0]?.targetDimension,
            method: this.config.adaptationMethod
        });
        return {
            results: adaptedResults,
            totalTokens: originalResults.totalTokens,
            totalCost: originalResults.totalCost
        };
    }
    /**
     * Adapt a single embedding vector to target dimensions
     */
    adaptEmbedding(embedding) {
        const originalDim = embedding.length;
        const targetDim = this.config.targetDimension;
        if (originalDim === targetDim) {
            return [...embedding]; // Already correct size
        }
        let adapted;
        switch (this.config.adaptationMethod) {
            case 'truncate':
                adapted = this.truncateEmbedding(embedding, targetDim);
                break;
            case 'pad':
                adapted = this.padEmbedding(embedding, targetDim);
                break;
            case 'normalize':
                adapted = this.normalizeEmbedding(embedding, targetDim);
                break;
            default:
                throw new Error(`Unknown adaptation method: ${this.config.adaptationMethod}`);
        }
        // Preserve L2 norm if requested
        if (this.config.preserveNorm) {
            adapted = this.preserveL2Norm(embedding, adapted);
        }
        return adapted;
    }
    /**
     * Truncate embedding to target dimension (keep first N dimensions)
     */
    truncateEmbedding(embedding, targetDim) {
        if (embedding.length <= targetDim) {
            return [...embedding];
        }
        // Simple truncation - keep the first N dimensions
        // This preserves the most important components in most embedding models
        return embedding.slice(0, targetDim);
    }
    /**
     * Pad embedding to target dimension (add zeros)
     */
    padEmbedding(embedding, targetDim) {
        if (embedding.length >= targetDim) {
            return embedding.slice(0, targetDim);
        }
        // Pad with zeros
        const padded = [...embedding];
        while (padded.length < targetDim) {
            padded.push(0);
        }
        return padded;
    }
    /**
     * Normalize embedding by averaging into target dimension
     */
    normalizeEmbedding(embedding, targetDim) {
        const originalDim = embedding.length;
        if (originalDim === targetDim) {
            return [...embedding];
        }
        if (originalDim < targetDim) {
            // Interpolate to higher dimension
            const normalized = [];
            const ratio = originalDim / targetDim;
            for (let i = 0; i < targetDim; i++) {
                const sourceIndex = i * ratio;
                const lowerIndex = Math.floor(sourceIndex);
                const upperIndex = Math.min(Math.ceil(sourceIndex), originalDim - 1);
                const weight = sourceIndex - lowerIndex;
                const value = embedding[lowerIndex] * (1 - weight) + embedding[upperIndex] * weight;
                normalized.push(value);
            }
            return normalized;
        }
        else {
            // Average down to lower dimension
            const normalized = [];
            const ratio = originalDim / targetDim;
            for (let i = 0; i < targetDim; i++) {
                const start = Math.floor(i * ratio);
                const end = Math.floor((i + 1) * ratio);
                let sum = 0;
                for (let j = start; j < end && j < originalDim; j++) {
                    sum += embedding[j];
                }
                normalized.push(sum / (end - start));
            }
            return normalized;
        }
    }
    /**
     * Preserve the L2 norm of the original embedding
     */
    preserveL2Norm(original, adapted) {
        // Calculate L2 norms
        const originalNorm = Math.sqrt(original.reduce((sum, val) => sum + val * val, 0));
        const adaptedNorm = Math.sqrt(adapted.reduce((sum, val) => sum + val * val, 0));
        if (adaptedNorm === 0) {
            return adapted; // Avoid division by zero
        }
        // Scale adapted embedding to preserve original norm
        const scale = originalNorm / adaptedNorm;
        return adapted.map(val => val * scale);
    }
    /**
     * Get embedding dimension for current configuration
     */
    getEmbeddingDimension() {
        return this.config.targetDimension;
    }
    /**
     * Validate that an embedding matches target dimension
     */
    validateEmbedding(embedding) {
        if (embedding.length !== this.config.targetDimension) {
            return {
                valid: false,
                reason: `Embedding dimension ${embedding.length} doesn't match target ${this.config.targetDimension}`
            };
        }
        if (embedding.some(val => !isFinite(val))) {
            return {
                valid: false,
                reason: 'Embedding contains non-finite values'
            };
        }
        return { valid: true };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.EmbeddingAdapter = EmbeddingAdapter;
/**
 * Create embedding adapter with default configuration
 */
function createEmbeddingAdapter(config) {
    return new EmbeddingAdapter(config);
}
/**
 * Default embedding adapter for current vector database (lazy initialization)
 */
exports.defaultEmbeddingAdapter = (() => {
    try {
        return createEmbeddingAdapter({
            targetDimension: 1024, // Match Upstash Vector DB
            sourceModel: 'text-embedding-3-small',
            adaptationMethod: 'truncate',
            preserveNorm: true
        });
    }
    catch (error) {
        // Return null if not ready - will be created when needed
        return null;
    }
})();
//# sourceMappingURL=embeddingAdapter.js.map