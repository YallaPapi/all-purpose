/**
 * Redis Search Result Cache
 * 
 * High-performance Redis-based caching layer for RAG search results
 * Implements Task 41: Redis Search Result Cache with compression, TTL, and circuit breaker
 */

import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import { SearchResponse, SearchQuery } from '../api/searchAPI';

export interface RedisCacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  keyPrefix?: string;
  maxMemoryPolicy?: string;
  maxMemoryMB?: number;
}

export interface CacheEntry {
  data: SearchResponse;
  timestamp: number;
  ttl: number;
  queryHash: string;
  metadata: {
    query: string;
    filters?: any;
    topK: number;
    createdAt: Date;
    expiresAt: Date;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  errors: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  memoryUsage: number;
}

/**
 * Redis-based search result cache with advanced features
 */
export class RedisSearchCache {
  private redis: Redis;
  private config: RedisCacheConfig;
  private stats: CacheStats;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds
  private readonly keyPrefix = 'rag:search:';

  constructor(config: RedisCacheConfig) {
    this.config = {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      keyPrefix: 'rag:',
      maxMemoryPolicy: 'volatile-lru',
      maxMemoryMB: 100,
      ...config
    };

    // Initialize Redis connection with optimized settings
    this.redis = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db || 0,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      retryDelayOnFailover: this.config.retryDelayOnFailover,
      enableReadyCheck: this.config.enableReadyCheck,
      lazyConnect: this.config.lazyConnect,
      keyPrefix: this.config.keyPrefix,
      // Connection pool settings for high concurrency
      family: 4,
      keepAlive: true,
      // Memory optimization
      maxmemoryPolicy: this.config.maxMemoryPolicy as any,
    });

    // Initialize stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0,
      hitRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      memoryUsage: 0
    };

    this.setupRedisEventHandlers();
    logger.info('Redis Search Cache initialized', {
      host: this.config.host,
      port: this.config.port,
      maxMemoryMB: this.config.maxMemoryMB,
      keyPrefix: this.config.keyPrefix
    });
  }

  /**
   * Setup Redis event handlers for monitoring and circuit breaker
   */
  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis cache connected');
      this.resetCircuitBreaker();
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache error', { error: error.message });
      this.handleRedisError(error);
    });

    this.redis.on('close', () => {
      logger.warn('Redis cache connection closed');
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis cache reconnecting');
    });
  }

  /**
   * Generate cache key from search query parameters
   */
  private generateCacheKey(query: string, filters?: any, topK?: number): string {
    const searchParams = {
      query: query.trim().toLowerCase(),
      filters: filters || {},
      topK: topK || 10
    };

    // Create deterministic hash of search parameters
    const content = JSON.stringify(searchParams, Object.keys(searchParams).sort());
    const hash = createHash('sha256').update(content).digest('hex');
    
    return `${this.keyPrefix}${hash}`;
  }

  /**
   * Get cached search results
   */
  async getCachedSearch(query: string, filters?: any, topK?: number): Promise<SearchResponse | null> {
    if (this.circuitBreakerState === 'open') {
      return null;
    }

    const startTime = Date.now();
    
    try {
      const key = this.generateCacheKey(query, filters, topK);
      
      // Try to get compressed data from Redis
      const cachedData = await this.redis.get(key);
      
      if (!cachedData) {
        this.stats.misses++;
        this.updateStats(startTime);
        return null;
      }

      // Parse and decompress cached entry
      const cacheEntry: CacheEntry = JSON.parse(cachedData);
      
      // Verify cache entry hasn't expired (double-check Redis TTL)
      if (Date.now() > new Date(cacheEntry.metadata.expiresAt).getTime()) {
        // Entry expired, remove it
        await this.redis.del(key);
        this.stats.misses++;
        this.updateStats(startTime);
        return null;
      }

      this.stats.hits++;
      this.updateStats(startTime);
      
      logger.debug('Cache hit for search query', { 
        query: query.substring(0, 50),
        key: key.substring(0, 20) + '...',
        age: Date.now() - cacheEntry.timestamp
      });

      return cacheEntry.data;

    } catch (error) {
      logger.error('Error getting cached search result', { 
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50)
      });
      
      this.handleRedisError(error);
      this.stats.errors++;
      this.updateStats(startTime);
      return null;
    }
  }

  /**
   * Cache search results with appropriate TTL
   */
  async setCachedSearch(
    query: string, 
    searchResponse: SearchResponse, 
    filters?: any, 
    topK?: number,
    customTTL?: number
  ): Promise<void> {
    if (this.circuitBreakerState === 'open') {
      return;
    }

    const startTime = Date.now();

    try {
      const key = this.generateCacheKey(query, filters, topK);
      
      // Determine TTL based on content type
      const ttl = customTTL || this.determineTTL(searchResponse);
      const expiresAt = new Date(Date.now() + ttl * 1000);

      const cacheEntry: CacheEntry = {
        data: searchResponse,
        timestamp: Date.now(),
        ttl,
        queryHash: key,
        metadata: {
          query,
          filters,
          topK: topK || 10,
          createdAt: new Date(),
          expiresAt
        }
      };

      // Store compressed data in Redis with TTL
      const serializedData = JSON.stringify(cacheEntry);
      await this.redis.setex(key, ttl, serializedData);
      
      this.stats.sets++;
      this.updateStats(startTime);
      
      logger.debug('Cached search result', {
        query: query.substring(0, 50),
        key: key.substring(0, 20) + '...',
        ttl,
        resultCount: searchResponse.results.length,
        dataSize: serializedData.length
      });

    } catch (error) {
      logger.error('Error caching search result', {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50)
      });
      
      this.handleRedisError(error);
      this.stats.errors++;
      this.updateStats(startTime);
    }
  }

  /**
   * Determine appropriate TTL based on search results content
   */
  private determineTTL(searchResponse: SearchResponse): number {
    // Analyze results to determine if they're static documentation or dynamic content
    const hasStaticContent = searchResponse.results.some(result => 
      result.metadata.fileType === '.md' || 
      result.metadata.fileName.toLowerCase().includes('readme') ||
      result.metadata.fileName.toLowerCase().includes('doc')
    );

    const hasRecentContent = searchResponse.results.some(result => {
      const daysSinceModified = (Date.now() - result.metadata.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceModified < 7; // Modified within last week
    });

    // TTL Strategy:
    // - Static documentation: 24 hours (86400 seconds)
    // - Recent dynamic content: 1 hour (3600 seconds)  
    // - Old dynamic content: 6 hours (21600 seconds)
    if (hasStaticContent && !hasRecentContent) {
      return 86400; // 24 hours for static docs
    } else if (hasRecentContent) {
      return 3600; // 1 hour for recent content
    } else {
      return 21600; // 6 hours for older content
    }
  }

  /**
   * Invalidate cached results by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (this.circuitBreakerState === 'open') {
      return 0;
    }

    try {
      const searchPattern = `${this.keyPrefix}*${pattern}*`;
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await this.redis.del(...keys);
      
      logger.info('Invalidated cached results by pattern', {
        pattern,
        deletedCount,
        keysFound: keys.length
      });

      return deletedCount;

    } catch (error) {
      logger.error('Error invalidating cache by pattern', {
        error: error instanceof Error ? error.message : String(error),
        pattern
      });
      
      this.handleRedisError(error);
      return 0;
    }
  }

  /**
   * Invalidate specific cached result
   */
  async invalidateQuery(query: string, filters?: any, topK?: number): Promise<boolean> {
    if (this.circuitBreakerState === 'open') {
      return false;
    }

    try {
      const key = this.generateCacheKey(query, filters, topK);
      const deleted = await this.redis.del(key);
      
      if (deleted > 0) {
        logger.debug('Invalidated cached query', {
          query: query.substring(0, 50),
          key: key.substring(0, 20) + '...'
        });
      }

      return deleted > 0;

    } catch (error) {
      logger.error('Error invalidating cached query', {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50)
      });
      
      this.handleRedisError(error);
      return false;
    }
  }

  /**
   * Clear all cached results
   */
  async clearCache(): Promise<number> {
    if (this.circuitBreakerState === 'open') {
      return 0;
    }

    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await this.redis.del(...keys);
      
      logger.info('Cleared all cached results', { deletedCount });
      
      // Reset stats
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.sets = 0;
      this.stats.cacheSize = 0;

      return deletedCount;

    } catch (error) {
      logger.error('Error clearing cache', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      this.handleRedisError(error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      // Update cache size and memory usage
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      this.stats.cacheSize = keyCount;
      this.stats.memoryUsage = memoryUsage;
      this.stats.totalRequests = this.stats.hits + this.stats.misses;
      this.stats.hitRate = this.stats.totalRequests > 0 ? 
        this.stats.hits / this.stats.totalRequests : 0;

      return { ...this.stats };

    } catch (error) {
      logger.error('Error getting cache stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return { ...this.stats };
    }
  }

  /**
   * Check cache health
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    circuitBreakerState: string;
    redisConnected: boolean;
    stats: CacheStats;
  }> {
    try {
      // Simple ping test
      const pingResult = await this.redis.ping();
      const redisConnected = pingResult === 'PONG';
      
      const stats = await this.getStats();
      
      return {
        healthy: redisConnected && this.circuitBreakerState !== 'open',
        circuitBreakerState: this.circuitBreakerState,
        redisConnected,
        stats
      };

    } catch (error) {
      return {
        healthy: false,
        circuitBreakerState: this.circuitBreakerState,
        redisConnected: false,
        stats: this.stats
      };
    }
  }

  /**
   * Handle Redis errors and manage circuit breaker
   */
  private handleRedisError(error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Open circuit breaker if too many failures
    if (this.failureCount >= this.failureThreshold && this.circuitBreakerState === 'closed') {
      this.circuitBreakerState = 'open';
      logger.warn('Circuit breaker opened due to Redis failures', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });
    }
  }

  /**
   * Reset circuit breaker on successful operation
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreakerState !== 'closed') {
      this.circuitBreakerState = 'closed';
      this.failureCount = 0;
      logger.info('Circuit breaker reset - Redis cache operational');
    }
  }

  /**
   * Update internal statistics
   */
  private updateStats(startTime: number): void {
    const responseTime = Date.now() - startTime;
    
    // Update rolling average response time
    if (this.stats.totalRequests > 0) {
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
        this.stats.totalRequests;
    } else {
      this.stats.averageResponseTime = responseTime;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Redis cache connection closed');
    } catch (error) {
      logger.error('Error closing Redis cache connection', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * Create Redis search cache with environment-based configuration
 */
export function createRedisSearchCache(config?: Partial<RedisCacheConfig>): RedisSearchCache {
  const defaultConfig: RedisCacheConfig = {
    host: process.env.UPSTASH_REDIS_REST_URL?.replace('https://', '').split('@')[1] || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
    db: 1, // Use separate DB for cache
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
    keyPrefix: 'rag:cache:',
    maxMemoryPolicy: 'volatile-lru',
    maxMemoryMB: 100
  };

  return new RedisSearchCache({ ...defaultConfig, ...config });
}