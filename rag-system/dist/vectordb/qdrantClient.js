"use strict";
/**
 * Qdrant Vector Database Client
 *
 * Central client for interacting with Qdrant vector database
 * Following All-Purpose Pattern: NO hardcoded limitations on collection types
 * Based on TaskMaster research findings for optimal RAG implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultQdrantClient = exports.QdrantVectorClient = void 0;
exports.createQdrantClient = createQdrantClient;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const logger_1 = require("../utils/logger");
/**
 * Qdrant Vector Database Client
 * Provides comprehensive vector operations for RAG system
 */
class QdrantVectorClient {
    constructor(config) {
        this.config = config;
        this.client = new js_client_rest_1.QdrantClient({
            url: config.url,
            apiKey: config.apiKey
        });
        logger_1.logger.info('Qdrant client initialized', { url: config.url });
    }
    /**
     * Check if Qdrant server is healthy and accessible
     */
    async healthCheck() {
        try {
            // Use context7: Simple health check by getting collections
            await this.client.getCollections();
            logger_1.logger.debug('Qdrant health check successful');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Qdrant health check failed', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    /**
     * Start periodic health monitoring
     */
    startHealthMonitoring(intervalMs = 30000) {
        this.healthCheckInterval = setInterval(async () => {
            const isHealthy = await this.healthCheck();
            if (!isHealthy) {
                logger_1.logger.warn('Qdrant server health check failed during monitoring');
            }
        }, intervalMs);
        logger_1.logger.info('Qdrant health monitoring started', { intervalMs });
    }
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
            logger_1.logger.info('Qdrant health monitoring stopped');
        }
    }
    /**
     * Create a collection with specified configuration
     */
    async createCollection(config) {
        try {
            // Check if collection already exists
            const exists = await this.collectionExists(config.name);
            if (exists) {
                logger_1.logger.info('Collection already exists', { collection: config.name });
                return true;
            }
            await this.client.createCollection(config.name, {
                vectors: {
                    size: config.vectorSize,
                    distance: config.distance
                }
            });
            logger_1.logger.info('Collection created successfully', config);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to create collection', {
                collection: config.name,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Check if a collection exists
     */
    async collectionExists(collectionName) {
        try {
            await this.client.getCollection(collectionName);
            return true;
        }
        catch (error) {
            if (error.status === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Get collection information
     */
    async getCollectionInfo(collectionName) {
        try {
            const info = await this.client.getCollection(collectionName);
            logger_1.logger.debug('Retrieved collection info', { collection: collectionName, info });
            return info;
        }
        catch (error) {
            logger_1.logger.error('Failed to get collection info', {
                collection: collectionName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Insert or update vectors in a collection
     */
    async upsertVectors(collectionName, points) {
        try {
            await this.client.upsert(collectionName, {
                wait: true,
                points: points.map(point => ({
                    id: point.id,
                    vector: point.vector,
                    payload: point.payload || {}
                }))
            });
            logger_1.logger.info('Vectors upserted successfully', {
                collection: collectionName,
                count: points.length
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to upsert vectors', {
                collection: collectionName,
                count: points.length,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Search for similar vectors
     */
    async searchVectors(collectionName, queryVector, options = {}) {
        try {
            const searchParams = {
                vector: queryVector,
                limit: options.limit || 5,
                with_payload: options.withPayload !== false,
                with_vector: options.withVector || false,
                score_threshold: options.scoreThreshold,
                filter: options.filter
            };
            const results = await this.client.search(collectionName, searchParams);
            logger_1.logger.debug('Vector search completed', {
                collection: collectionName,
                resultCount: results.length,
                limit: options.limit
            });
            return results.map(result => ({
                id: result.id,
                score: result.score,
                payload: result.payload || undefined,
                vector: result.vector
            }));
        }
        catch (error) {
            logger_1.logger.error('Vector search failed', {
                collection: collectionName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Delete vectors by IDs
     */
    async deleteVectors(collectionName, vectorIds) {
        try {
            await this.client.delete(collectionName, {
                wait: true,
                points: vectorIds
            });
            logger_1.logger.info('Vectors deleted successfully', {
                collection: collectionName,
                count: vectorIds.length
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete vectors', {
                collection: collectionName,
                count: vectorIds.length,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Get collection statistics
     */
    async getCollectionStats(collectionName) {
        try {
            const info = await this.client.getCollection(collectionName);
            return {
                pointsCount: info.points_count,
                vectorsCount: info.vectors_count,
                indexedVectorsCount: info.indexed_vectors_count,
                status: info.status
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get collection stats', {
                collection: collectionName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Initialize standard collections for RAG system
     */
    async initializeRAGCollections() {
        const collections = [
            {
                name: 'project_docs',
                vectorSize: 3072, // OpenAI text-embedding-3-large
                distance: 'Cosine',
                description: 'Project documentation embeddings'
            },
            {
                name: 'code_snippets',
                vectorSize: 3072,
                distance: 'Cosine',
                description: 'Code documentation and snippets'
            },
            {
                name: 'chat_history',
                vectorSize: 3072,
                distance: 'Cosine',
                description: 'Conversation history embeddings'
            },
            {
                name: 'task_context',
                vectorSize: 3072,
                distance: 'Cosine',
                description: 'Task and project context information'
            }
        ];
        let allSuccess = true;
        for (const collection of collections) {
            const success = await this.createCollection(collection);
            if (!success) {
                allSuccess = false;
            }
        }
        if (allSuccess) {
            logger_1.logger.info('All RAG collections initialized successfully');
        }
        else {
            logger_1.logger.warn('Some RAG collections failed to initialize');
        }
        return allSuccess;
    }
    /**
     * Get all collection names
     */
    async getAllCollections() {
        try {
            const response = await this.client.getCollections();
            return response.collections.map(c => c.name);
        }
        catch (error) {
            logger_1.logger.error('Failed to get collections list', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
    /**
     * Close the client connection
     */
    async close() {
        this.stopHealthMonitoring();
        logger_1.logger.info('Qdrant client closed');
    }
}
exports.QdrantVectorClient = QdrantVectorClient;
/**
 * Create a Qdrant client instance with default configuration
 */
function createQdrantClient(config) {
    const defaultConfig = {
        url: 'http://localhost:6333',
        ...config
    };
    return new QdrantVectorClient(defaultConfig);
}
/**
 * Default Qdrant client instance
 */
exports.defaultQdrantClient = createQdrantClient();
//# sourceMappingURL=qdrantClient.js.map