/**
 * Cache Manager
 * 
 * Task 43: Unified Cache Manager that coordinates Redis and in-memory cache layers
 * Central API for all cache operations with intelligent routing and fallback logic
 */

import { createHash } from 'crypto';
import { RedisSearchCache } from './RedisSearchCache';
import { InMemoryLRUCache, CacheFactory } from './InMemoryLRUCache';
import { SearchResponse, SearchQuery, EnhancedSearchResult } from '../api/searchAPI';
import { logger } from '../utils/logger';

export interface CacheManagerConfig {
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxMemoryMB?: number;
  };
  memory: {
    enabled: boolean;
    embeddingCacheMB: number;
    fileContentCacheMB: number;
    queryPatternCacheMB: number;
  };
  fallbackStrategy: 'redis-first' | 'memory-first' | 'both';
  enableMetrics: boolean;
}

export interface ProcessedFile {
  content: string;
  chunks: string[];
  metadata: {
    filePath: string;
    fileName: string;
    fileType: string;
    lastModified: Date;
    size: number;
    chunkCount: number;
  };
  embeddings?: number[][];
}

export interface CacheStats {
  redis: {
    enabled: boolean;
    connected: boolean;
    hits: number;
    misses: number;
    errors: number;
    hitRate: number;
    memoryBytes: number;
    entries: number;
    averageResponseTime: number;
  };
  memory: {
    embeddings: {
      hits: number;
      misses: number;
      hitRate: number;
      memoryBytes: number;
      entries: number;
      evictions: number;
    };
    fileContent: {
      hits: number;
      misses: number;
      hitRate: number;
      memoryBytes: number;
      entries: number;
      evictions: number;
    };
    queryPatterns: {
      hits: number;
      misses: number;
      hitRate: number;
      memoryBytes: number;
      entries: number;
      evictions: number;
    };
  };
  overall: {
    totalHits: number;
    totalMisses: number;
    overallHitRate: number;
    totalMemoryBytes: number;
  };
}

/**
 * Unified Cache Manager coordinating multiple cache layers
 */
export class CacheManager {
  private config: CacheManagerConfig;
  private redisCache?: RedisSearchCache;
  private embeddingCache!: InMemoryLRUCache<number[]>;
  private fileContentCache!: InMemoryLRUCache<ProcessedFile>;
  private queryPatternCache!: InMemoryLRUCache<any>;
  private isHealthy = true;
  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 30000; // 30 seconds

  constructor(config: CacheManagerConfig) {
    this.config = {
      ...config,
      fallbackStrategy: config.fallbackStrategy || 'redis-first',
      enableMetrics: config.enableMetrics !== undefined ? config.enableMetrics : true
    };

    // Initialize Redis cache if enabled
    if (this.config.redis.enabled) {
      try {
        this.redisCache = new RedisSearchCache({
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.db || 1,
          maxMemoryMB: this.config.redis.maxMemoryMB || 100
        });
        logger.info('Redis cache initialized in CacheManager');
      } catch (error) {
        logger.error('Failed to initialize Redis cache', {
          error: error instanceof Error ? error.message : String(error)
        });
        this.config.redis.enabled = false;
      }
    }

    // Initialize in-memory caches
    if (this.config.memory.enabled) {
      this.embeddingCache = CacheFactory.createEmbeddingCache(
        this.config.memory.embeddingCacheMB
      );
      this.fileContentCache = CacheFactory.createFileContentCache(
        this.config.memory.fileContentCacheMB
      );
      this.queryPatternCache = CacheFactory.createQueryPatternCache(
        this.config.memory.queryPatternCacheMB
      );
      
      logger.info('In-memory caches initialized in CacheManager', {
        embeddingCacheMB: this.config.memory.embeddingCacheMB,
        fileContentCacheMB: this.config.memory.fileContentCacheMB,
        queryPatternCacheMB: this.config.memory.queryPatternCacheMB
      });
    }

    logger.info('CacheManager initialized', {
      redisEnabled: this.config.redis.enabled,
      memoryEnabled: this.config.memory.enabled,
      fallbackStrategy: this.config.fallbackStrategy
    });
  }

  /**
   * Get cached search results with intelligent fallback
   */
  async getCachedSearch(query: string, filters?: any, topK?: number): Promise<SearchResponse | null> {
    try {
      if (this.config.fallbackStrategy === 'redis-first' && this.redisCache) {
        // Try Redis first
        const redisResult = await this.redisCache.getCachedSearch(query, filters, topK);
        if (redisResult) {
          return redisResult;
        }
      }

      if (this.config.fallbackStrategy === 'memory-first' || !this.redisCache) {
        // Try memory cache patterns
        const queryKey = this.generateQueryKey(query, filters, topK);
        const memoryResult = this.queryPatternCache?.get(queryKey);
        if (memoryResult) {
          return memoryResult;
        }
      }

      if (this.config.fallbackStrategy === 'both') {
        // Try both simultaneously (faster but more resource intensive)
        const promises: Promise<SearchResponse | null>[] = [];
        
        if (this.redisCache) {
          promises.push(this.redisCache.getCachedSearch(query, filters, topK));
        }
        
        if (this.queryPatternCache) {
          const queryKey = this.generateQueryKey(query, filters, topK);
          promises.push(Promise.resolve(this.queryPatternCache.get(queryKey) || null));
        }

        const results = await Promise.allSettled(promises);
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            return result.value;
          }
        }
      }

      return null;

    } catch (error) {
      logger.error('Error getting cached search result', {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50)
      });
      return null;
    }
  }

  /**
   * Cache search results in appropriate layers
   */
  async setCachedSearch(
    query: string, 
    searchResponse: SearchResponse, 
    filters?: any, 
    topK?: number,
    customTTL?: number
  ): Promise<void> {
    try {
      const promises: Promise<void>[] = [];

      // Cache in Redis if enabled
      if (this.redisCache && this.config.redis.enabled) {
        promises.push(
          this.redisCache.setCachedSearch(query, searchResponse, filters, topK, customTTL)
        );
      }

      // Cache in memory if enabled and response is small enough
      if (this.queryPatternCache && this.config.memory.enabled) {
        const queryKey = this.generateQueryKey(query, filters, topK);
        const responseSize = this.estimateObjectSize(searchResponse);
        
        // Only cache in memory if response is reasonably sized
        if (responseSize < 1024 * 1024) { // 1MB limit for memory cache
          this.queryPatternCache.set(queryKey, searchResponse);
        }
      }

      // Wait for all cache operations to complete
      await Promise.allSettled(promises);

    } catch (error) {
      logger.error('Error caching search result', {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50)
      });
    }
  }

  /**
   * Get cached embedding with fallback
   */
  getCachedEmbedding(content: string): number[] | null {
    if (!this.config.memory.enabled || !this.embeddingCache) {
      return null;
    }

    try {
      const contentHash = this.generateContentHash(content);
      return this.embeddingCache.get(contentHash) || null;
    } catch (error) {
      logger.error('Error getting cached embedding', {
        error: error instanceof Error ? error.message : String(error),
        contentPreview: content.substring(0, 50)
      });
      return null;
    }
  }

  /**
   * Cache embedding in memory
   */
  setCachedEmbedding(content: string, embedding: number[]): void {
    if (!this.config.memory.enabled || !this.embeddingCache) {
      return;
    }

    try {
      const contentHash = this.generateContentHash(content);
      this.embeddingCache.set(contentHash, embedding);
    } catch (error) {
      logger.error('Error caching embedding', {
        error: error instanceof Error ? error.message : String(error),
        contentPreview: content.substring(0, 50),
        embeddingLength: embedding.length
      });
    }
  }

  /**
   * Get cached file content
   */
  getCachedFileContent(filePath: string): ProcessedFile | null {
    if (!this.config.memory.enabled || !this.fileContentCache) {
      return null;
    }

    try {
      return this.fileContentCache.get(filePath) || null;
    } catch (error) {
      logger.error('Error getting cached file content', {
        error: error instanceof Error ? error.message : String(error),
        filePath
      });
      return null;
    }
  }

  /**
   * Cache file content in memory
   */
  setCachedFileContent(filePath: string, content: ProcessedFile): void {
    if (!this.config.memory.enabled || !this.fileContentCache) {
      return;
    }

    try {
      this.fileContentCache.set(filePath, content);
    } catch (error) {
      logger.error('Error caching file content', {
        error: error instanceof Error ? error.message : String(error),
        filePath,
        contentSize: content.content.length
      });
    }
  }

  /**
   * Invalidate cached results for a specific file
   */
  async invalidateFile(filePath: string): Promise<void> {
    try {
      const promises: Promise<any>[] = [];

      // Invalidate in Redis
      if (this.redisCache && this.config.redis.enabled) {
        promises.push(this.redisCache.invalidatePattern(filePath));
      }

      // Invalidate in memory caches
      if (this.config.memory.enabled) {
        // Remove file content directly
        if (this.fileContentCache) {
          this.fileContentCache.delete(filePath);
        }

        // Remove related embeddings and query patterns
        const fileBasename = filePath.split('/').pop() || filePath;
        
        // Search for keys containing the file name in embeddings cache
        if (this.embeddingCache) {
          const embeddingKeys = this.embeddingCache.keys();
          for (const key of embeddingKeys) {
            if (key.includes(fileBasename)) {
              this.embeddingCache.delete(key);
            }
          }
        }

        // Search for keys containing the file path in query patterns
        if (this.queryPatternCache) {
          const queryKeys = this.queryPatternCache.keys();
          for (const key of queryKeys) {
            if (key.includes(filePath) || key.includes(fileBasename)) {
              this.queryPatternCache.delete(key);
            }
          }
        }
      }

      await Promise.allSettled(promises);
      
      logger.info('Cache invalidated for file', { filePath });

    } catch (error) {
      logger.error('Error invalidating file cache', {
        error: error instanceof Error ? error.message : String(error),
        filePath
      });
    }
  }

  /**
   * Invalidate cached results by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const promises: Promise<any>[] = [];

      // Invalidate in Redis
      if (this.redisCache && this.config.redis.enabled) {
        promises.push(this.redisCache.invalidatePattern(pattern));
      }

      // Invalidate in memory caches
      if (this.config.memory.enabled) {
        const caches = [this.embeddingCache, this.fileContentCache, this.queryPatternCache];
        
        for (const cache of caches) {
          if (cache) {
            const keys = cache.keys();
            for (const key of keys) {
              if (key.includes(pattern)) {
                cache.delete(key);
              }
            }
          }
        }
      }

      await Promise.allSettled(promises);
      
      logger.info('Cache invalidated by pattern', { pattern });

    } catch (error) {
      logger.error('Error invalidating cache by pattern', {
        error: error instanceof Error ? error.message : String(error),
        pattern
      });
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    try {
      const promises: Promise<any>[] = [];

      // Clear Redis cache
      if (this.redisCache && this.config.redis.enabled) {
        promises.push(this.redisCache.clearCache());
      }

      // Clear memory caches
      if (this.config.memory.enabled) {
        if (this.embeddingCache) this.embeddingCache.clear();
        if (this.fileContentCache) this.fileContentCache.clear();
        if (this.queryPatternCache) this.queryPatternCache.clear();
      }

      await Promise.allSettled(promises);
      
      logger.info('All caches cleared');

    } catch (error) {
      logger.error('Error clearing all caches', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const stats: CacheStats = {
        redis: {
          enabled: this.config.redis.enabled,
          connected: false,
          hits: 0,
          misses: 0,
          errors: 0,
          hitRate: 0,
          memoryBytes: 0,
          entries: 0,
          averageResponseTime: 0
        },
        memory: {
          embeddings: {
            hits: 0,
            misses: 0,
            hitRate: 0,
            memoryBytes: 0,
            entries: 0,
            evictions: 0
          },
          fileContent: {
            hits: 0,
            misses: 0,
            hitRate: 0,
            memoryBytes: 0,
            entries: 0,
            evictions: 0
          },
          queryPatterns: {
            hits: 0,
            misses: 0,
            hitRate: 0,
            memoryBytes: 0,
            entries: 0,
            evictions: 0
          }
        },
        overall: {
          totalHits: 0,
          totalMisses: 0,
          overallHitRate: 0,
          totalMemoryBytes: 0
        }
      };

      // Get Redis stats
      if (this.redisCache && this.config.redis.enabled) {
        try {
          const redisStats = await this.redisCache.getStats();
          stats.redis = {
            enabled: true,
            connected: true,
            hits: redisStats.hits,
            misses: redisStats.misses,
            errors: redisStats.errors,
            hitRate: redisStats.hitRate,
            memoryBytes: redisStats.memoryUsage,
            entries: redisStats.cacheSize,
            averageResponseTime: redisStats.averageResponseTime
          };
        } catch (error) {
          stats.redis.connected = false;
        }
      }

      // Get memory cache stats
      if (this.config.memory.enabled) {
        if (this.embeddingCache) {
          const embeddingStats = this.embeddingCache.getStats();
          stats.memory.embeddings = {
            hits: embeddingStats.hits,
            misses: embeddingStats.misses,
            hitRate: embeddingStats.hitRate,
            memoryBytes: embeddingStats.memoryUsage,
            entries: embeddingStats.currentCount,
            evictions: embeddingStats.evictions
          };
        }

        if (this.fileContentCache) {
          const fileStats = this.fileContentCache.getStats();
          stats.memory.fileContent = {
            hits: fileStats.hits,
            misses: fileStats.misses,
            hitRate: fileStats.hitRate,
            memoryBytes: fileStats.memoryUsage,
            entries: fileStats.currentCount,
            evictions: fileStats.evictions
          };
        }

        if (this.queryPatternCache) {
          const queryStats = this.queryPatternCache.getStats();
          stats.memory.queryPatterns = {
            hits: queryStats.hits,
            misses: queryStats.misses,
            hitRate: queryStats.hitRate,
            memoryBytes: queryStats.memoryUsage,
            entries: queryStats.currentCount,
            evictions: queryStats.evictions
          };
        }
      }

      // Calculate overall stats
      stats.overall.totalHits = 
        stats.redis.hits + 
        stats.memory.embeddings.hits + 
        stats.memory.fileContent.hits + 
        stats.memory.queryPatterns.hits;

      stats.overall.totalMisses = 
        stats.redis.misses + 
        stats.memory.embeddings.misses + 
        stats.memory.fileContent.misses + 
        stats.memory.queryPatterns.misses;

      const totalRequests = stats.overall.totalHits + stats.overall.totalMisses;
      stats.overall.overallHitRate = totalRequests > 0 ? 
        stats.overall.totalHits / totalRequests : 0;

      stats.overall.totalMemoryBytes = 
        stats.redis.memoryBytes + 
        stats.memory.embeddings.memoryBytes + 
        stats.memory.fileContent.memoryBytes + 
        stats.memory.queryPatterns.memoryBytes;

      return stats;

    } catch (error) {
      logger.error('Error getting cache stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check overall cache health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    redis: boolean;
    memory: boolean;
    details: any;
  }> {
    const now = Date.now();
    
    // Use cached result if recent
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return {
        healthy: this.isHealthy,
        redis: this.config.redis.enabled && !!this.redisCache,
        memory: this.config.memory.enabled,
        details: { cached: true }
      };
    }

    try {
      const health = {
        healthy: true,
        redis: true,
        memory: true,
        details: {} as any
      };

      // Check Redis health
      if (this.redisCache && this.config.redis.enabled) {
        try {
          const redisHealth = await this.redisCache.healthCheck();
          health.redis = redisHealth.healthy;
          health.details.redis = redisHealth;
        } catch (error) {
          health.redis = false;
          health.details.redis = { error: error instanceof Error ? error.message : String(error) };
        }
      }

      // Check memory cache health
      if (this.config.memory.enabled) {
        try {
          const memoryStats = {
            embeddings: this.embeddingCache?.getStats(),
            fileContent: this.fileContentCache?.getStats(),
            queryPatterns: this.queryPatternCache?.getStats()
          };
          health.details.memory = memoryStats;
        } catch (error) {
          health.memory = false;
          health.details.memory = { error: error instanceof Error ? error.message : String(error) };
        }
      }

      health.healthy = health.redis && health.memory;
      
      this.isHealthy = health.healthy;
      this.lastHealthCheck = now;
      
      return health;

    } catch (error) {
      logger.error('Error during cache health check', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        healthy: false,
        redis: false,
        memory: false,
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Generate cache key for queries
   */
  private generateQueryKey(query: string, filters?: any, topK?: number): string {
    const queryParams = {
      query: query.trim().toLowerCase(),
      filters: filters || {},
      topK: topK || 10
    };
    
    const content = JSON.stringify(queryParams, Object.keys(queryParams).sort());
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate hash for content
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Estimate object size in bytes
   */
  private estimateObjectSize(obj: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(obj), 'utf8');
    } catch {
      return 1024; // 1KB fallback estimate
    }
  }

  /**
   * Close all cache connections
   */
  async close(): Promise<void> {
    try {
      if (this.redisCache) {
        await this.redisCache.close();
      }
      logger.info('CacheManager closed');
    } catch (error) {
      logger.error('Error closing CacheManager', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * Create CacheManager with environment-based configuration
 */
export function createCacheManager(config?: Partial<CacheManagerConfig>): CacheManager {
  const defaultConfig: CacheManagerConfig = {
    redis: {
      enabled: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      host: process.env.UPSTASH_REDIS_REST_URL?.replace('https://', '').split('@')[1] || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      db: 1,
      maxMemoryMB: 100
    },
    memory: {
      enabled: true,
      embeddingCacheMB: 20,
      fileContentCacheMB: 25,
      queryPatternCacheMB: 5
    },
    fallbackStrategy: 'redis-first',
    enableMetrics: true
  };

  return new CacheManager({ ...defaultConfig, ...config });
}