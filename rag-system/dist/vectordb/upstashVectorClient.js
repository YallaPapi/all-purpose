"use strict";
/**
 * Upstash Vector Database Client
 *
 * Vercel-native vector database client using Upstash Vector
 * Following All-Purpose Pattern: NO hardcoded limitations on collection types
 * Aligned with main project's Vercel-native architecture
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultUpstashVectorClient = exports.UpstashVectorClient = void 0;
exports.createUpstashVectorClient = createUpstashVectorClient;
const vector_1 = require("@upstash/vector");
const logger_1 = require("../utils/logger");
/**
 * Upstash Vector Database Client
 * Provides comprehensive vector operations for RAG system on Vercel
 */
class UpstashVectorClient {
    constructor(config) {
        this.config = config;
        this.index = new vector_1.Index({
            url: config.url,
            token: config.token
        });
        logger_1.logger.info('Upstash Vector client initialized', { url: config.url });
    }
    /**
     * Check if Upstash Vector service is healthy and accessible
     */
    async healthCheck() {
        try {
            // Simple health check by getting index info
            await this.index.info();
            logger_1.logger.debug('Upstash Vector health check successful');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Upstash Vector health check failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Insert or update vectors
     */
    async upsertVectors(points) {
        try {
            const vectors = points.map(point => ({
                id: point.id,
                vector: point.vector,
                metadata: point.metadata || {}
            }));
            await this.index.upsert(vectors);
            logger_1.logger.info('Vectors upserted successfully', {
                count: points.length
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to upsert vectors', {
                count: points.length,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Search for similar vectors
     */
    async searchVectors(queryVector, options = {}) {
        try {
            const searchParams = {
                vector: queryVector,
                topK: options.topK || 5,
                includeMetadata: options.includeMetadata !== false,
                includeVectors: options.includeVectors || false
            };
            if (options.filter) {
                searchParams.filter = options.filter;
            }
            const results = await this.index.query(searchParams);
            logger_1.logger.debug('Vector search completed', {
                resultCount: results.length,
                topK: options.topK
            });
            return results.map(result => ({
                id: String(result.id),
                score: result.score,
                metadata: result.metadata || undefined,
                vector: result.vector || undefined
            }));
        }
        catch (error) {
            logger_1.logger.error('Vector search failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Delete vectors by IDs
     */
    async deleteVectors(vectorIds) {
        try {
            await this.index.delete(vectorIds);
            logger_1.logger.info('Vectors deleted successfully', {
                count: vectorIds.length
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete vectors', {
                count: vectorIds.length,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Get index statistics
     */
    async getIndexStats() {
        try {
            const info = await this.index.info();
            return {
                vectorCount: info.vectorCount,
                pendingVectorCount: info.pendingVectorCount,
                indexSize: info.indexSize,
                dimension: info.dimension,
                similarityFunction: info.similarityFunction
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get index stats', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Reset the entire index (delete all vectors)
     */
    async resetIndex() {
        try {
            await this.index.reset();
            logger_1.logger.info('Index reset successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to reset index', {
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
}
exports.UpstashVectorClient = UpstashVectorClient;
/**
 * Create an Upstash Vector client instance with default configuration
 */
function createUpstashVectorClient(config) {
    const defaultConfig = {
        url: process.env.UPSTASH_VECTOR_REST_URL || '',
        token: process.env.UPSTASH_VECTOR_REST_TOKEN || '',
        ...config
    };
    if (!defaultConfig.url || !defaultConfig.token) {
        throw new Error('UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables are required');
    }
    return new UpstashVectorClient(defaultConfig);
}
/**
 * Default Upstash Vector client instance (lazy initialization)
 */
exports.defaultUpstashVectorClient = (() => {
    try {
        return createUpstashVectorClient();
    }
    catch (error) {
        // Return null if env vars not available - will be created when needed
        return null;
    }
})();
//# sourceMappingURL=upstashVectorClient.js.map