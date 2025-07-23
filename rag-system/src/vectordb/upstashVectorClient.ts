/**
 * Upstash Vector Database Client
 * 
 * Vercel-native vector database client using Upstash Vector
 * Following All-Purpose Pattern: NO hardcoded limitations on collection types
 * Aligned with main project's Vercel-native architecture
 */

import { Index } from '@upstash/vector';
import { logger } from '../utils/logger';

export interface UpstashVectorConfig {
  url: string;
  token: string;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  vector?: number[];
}

export interface SearchOptions {
  topK?: number;
  filter?: string;
  includeMetadata?: boolean;
  includeVectors?: boolean;
  scoreThreshold?: number;
}

/**
 * Upstash Vector Database Client
 * Provides comprehensive vector operations for RAG system on Vercel
 */
export class UpstashVectorClient {
  private index: Index;
  private config: UpstashVectorConfig;

  constructor(config: UpstashVectorConfig) {
    this.config = config;
    this.index = new Index({
      url: config.url,
      token: config.token
    });
    
    logger.info('Upstash Vector client initialized', { url: config.url });
  }

  /**
   * Check if Upstash Vector service is healthy and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check by getting index info
      await this.index.info();
      logger.debug('Upstash Vector health check successful');
      return true;
    } catch (error) {
      logger.error('Upstash Vector health check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Insert or update vectors
   */
  async upsertVectors(points: VectorPoint[]): Promise<boolean> {
    try {
      const vectors = points.map(point => ({
        id: point.id,
        vector: point.vector,
        metadata: point.metadata || {}
      }));

      await this.index.upsert(vectors);

      logger.info('Vectors upserted successfully', { 
        count: points.length 
      });
      return true;
    } catch (error) {
      logger.error('Failed to upsert vectors', { 
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
    queryVector: number[], 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    try {
      const searchParams: any = {
        vector: queryVector,
        topK: options.topK || 5,
        includeMetadata: options.includeMetadata !== false,
        includeVectors: options.includeVectors || false
      };

      if (options.filter) {
        searchParams.filter = options.filter;
      }

      const results = await this.index.query(searchParams);

      logger.debug('Vector search completed', { 
        resultCount: results.length,
        topK: options.topK 
      });

      return results.map(result => ({
        id: String(result.id),
        score: result.score,
        metadata: result.metadata || undefined,
        vector: result.vector || undefined
      }));
    } catch (error) {
      logger.error('Vector search failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Delete vectors by IDs
   */
  async deleteVectors(vectorIds: string[]): Promise<boolean> {
    try {
      await this.index.delete(vectorIds);

      logger.info('Vectors deleted successfully', { 
        count: vectorIds.length 
      });
      return true;
    } catch (error) {
      logger.error('Failed to delete vectors', { 
        count: vectorIds.length,
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const info = await this.index.info();
      return {
        vectorCount: info.vectorCount,
        pendingVectorCount: info.pendingVectorCount,
        indexSize: info.indexSize,
        dimension: info.dimension,
        similarityFunction: info.similarityFunction
      };
    } catch (error) {
      logger.error('Failed to get index stats', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Reset the entire index (delete all vectors)
   */
  async resetIndex(): Promise<boolean> {
    try {
      await this.index.reset();
      logger.info('Index reset successfully');
      return true;
    } catch (error) {
      logger.error('Failed to reset index', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
}

/**
 * Create an Upstash Vector client instance with default configuration
 */
export function createUpstashVectorClient(config?: Partial<UpstashVectorConfig>): UpstashVectorClient {
  const defaultConfig: UpstashVectorConfig = {
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
export const defaultUpstashVectorClient = (() => {
  try {
    return createUpstashVectorClient();
  } catch (error) {
    // Return null if env vars not available - will be created when needed
    return null;
  }
})();