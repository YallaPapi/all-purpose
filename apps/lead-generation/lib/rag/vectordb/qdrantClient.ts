/**
 * Qdrant Vector Database Client
 * 
 * Central client for interacting with Qdrant vector database
 * Following All-Purpose Pattern: NO hardcoded limitations on collection types
 * Based on TaskMaster research findings for optimal RAG implementation
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { logger } from '../utils/logger';

export interface QdrantConfig {
  url: string;
  port?: number;
  apiKey?: string;
}

export interface CollectionConfig {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
  description?: string;
}

export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, any>;
  vector?: number[];
}

export interface SearchOptions {
  limit?: number;
  filter?: any;
  withPayload?: boolean;
  withVector?: boolean;
  scoreThreshold?: number;
}

/**
 * Qdrant Vector Database Client
 * Provides comprehensive vector operations for RAG system
 */
export class QdrantVectorClient {
  private client: QdrantClient;
  private config: QdrantConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: QdrantConfig) {
    this.config = config;
    this.client = new QdrantClient({ 
      url: config.url,
      apiKey: config.apiKey 
    });
    
    logger.info('Qdrant client initialized', { url: config.url });
  }

  /**
   * Check if Qdrant server is healthy and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use context7: Simple health check by getting collections
      await this.client.getCollections();
      logger.debug('Qdrant health check successful');
      return true;
    } catch (error) {
      logger.error('Qdrant health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring(intervalMs: number = 30000): void {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        logger.warn('Qdrant server health check failed during monitoring');
      }
    }, intervalMs);
    
    logger.info('Qdrant health monitoring started', { intervalMs });
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info('Qdrant health monitoring stopped');
    }
  }

  /**
   * Create a collection with specified configuration
   */
  async createCollection(config: CollectionConfig): Promise<boolean> {
    try {
      // Check if collection already exists
      const exists = await this.collectionExists(config.name);
      if (exists) {
        logger.info('Collection already exists', { collection: config.name });
        return true;
      }

      await this.client.createCollection(config.name, {
        vectors: {
          size: config.vectorSize,
          distance: config.distance
        }
      });

      logger.info('Collection created successfully', config);
      return true;
    } catch (error) {
      logger.error('Failed to create collection', { 
        collection: config.name, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Check if a collection exists
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      await this.client.getCollection(collectionName);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo(collectionName: string): Promise<any> {
    try {
      const info = await this.client.getCollection(collectionName);
      logger.debug('Retrieved collection info', { collection: collectionName, info });
      return info;
    } catch (error) {
      logger.error('Failed to get collection info', { 
        collection: collectionName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Insert or update vectors in a collection
   */
  async upsertVectors(collectionName: string, points: VectorPoint[]): Promise<boolean> {
    try {
      await this.client.upsert(collectionName, {
        wait: true,
        points: points.map(point => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload || {}
        }))
      });

      logger.info('Vectors upserted successfully', { 
        collection: collectionName, 
        count: points.length 
      });
      return true;
    } catch (error) {
      logger.error('Failed to upsert vectors', { 
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
  async searchVectors(
    collectionName: string, 
    queryVector: number[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
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

      logger.debug('Vector search completed', { 
        collection: collectionName, 
        resultCount: results.length,
        limit: options.limit 
      });

      return results.map(result => ({
        id: result.id,
        score: result.score,
        payload: result.payload || undefined,
        vector: result.vector as number[] | undefined
      }));
    } catch (error) {
      logger.error('Vector search failed', { 
        collection: collectionName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(collectionName: string, vectorIds: (string | number)[]): Promise<boolean> {
    try {
      await this.client.delete(collectionName, {
        wait: true,
        points: vectorIds
      });

      logger.info('Vectors deleted successfully', { 
        collection: collectionName, 
        count: vectorIds.length 
      });
      return true;
    } catch (error) {
      logger.error('Failed to delete vectors', { 
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
  async getCollectionStats(collectionName: string): Promise<any> {
    try {
      const info = await this.client.getCollection(collectionName);
      return {
        pointsCount: info.points_count,
        vectorsCount: info.vectors_count,
        indexedVectorsCount: info.indexed_vectors_count,
        status: info.status
      };
    } catch (error) {
      logger.error('Failed to get collection stats', { 
        collection: collectionName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Initialize standard collections for RAG system
   */
  async initializeRAGCollections(): Promise<boolean> {
    const collections: CollectionConfig[] = [
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
      logger.info('All RAG collections initialized successfully');
    } else {
      logger.warn('Some RAG collections failed to initialize');
    }

    return allSuccess;
  }

  /**
   * Get all collection names
   */
  async getAllCollections(): Promise<string[]> {
    try {
      const response = await this.client.getCollections();
      return response.collections.map(c => c.name);
    } catch (error) {
      logger.error('Failed to get collections list', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    this.stopHealthMonitoring();
    logger.info('Qdrant client closed');
  }
}

/**
 * Create a Qdrant client instance with default configuration
 */
export function createQdrantClient(config?: Partial<QdrantConfig>): QdrantVectorClient {
  const defaultConfig: QdrantConfig = {
    url: 'http://localhost:6333',
    ...config
  };

  return new QdrantVectorClient(defaultConfig);
}

/**
 * Default Qdrant client instance
 */
export const defaultQdrantClient = createQdrantClient();