/**
 * UEP Performance Cache - Schema Validation Optimization
 * 
 * High-performance caching system for UEP validation schemas and results.
 * Optimizes validation performance through intelligent caching strategies,
 * result memoization, and batch processing.
 */

import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';

export interface CacheConfig {
  maxSchemaEntries: number;
  maxResultEntries: number;
  schemaTTL: number; // milliseconds
  resultTTL: number; // milliseconds
  enableCompression: boolean;
  enableMetrics: boolean;
  cleanupInterval: number; // milliseconds
  persistentStorage?: {
    enabled: boolean;
    path: string;
    syncInterval: number;
  };
}

export interface CacheMetrics {
  schemaCache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
    evictions: number;
  };
  resultCache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
    evictions: number;
  };
  performance: {
    averageValidationTime: number;
    cachedValidationTime: number;
    performanceImprovement: number;
  };
  memory: {
    heapUsed: number;
    cacheMemoryUsage: number;
  };
}

export interface ValidationCacheKey {
  capability: string;
  schemaVersion: string;
  dataHash: string;
  validationOptions?: string;
}

export interface CachedValidationResult {
  result: any;
  timestamp: Date;
  ttl: number;
  hitCount: number;
  lastAccess: Date;
  metadata: {
    originalValidationTime: number;
    schemaId: string;
    cacheVersion: string;
  };
}

/**
 * High-Performance UEP Validation Cache
 */
export class UEPPerformanceCache extends EventEmitter {
  private config: CacheConfig;
  private schemaCache: LRUCache<string, any>;
  private resultCache: LRUCache<string, CachedValidationResult>;
  private metrics: CacheMetrics;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private compressionEnabled: boolean;

  constructor(config: CacheConfig) {
    super();
    this.config = config;
    this.compressionEnabled = config.enableCompression;
    
    this.initializeCaches();
    this.initializeMetrics();
    this.setupCleanup();
    
    if (config.persistentStorage?.enabled) {
      this.setupPersistentStorage();
    }
  }

  /**
   * Get schema from cache or fetch if not cached
   */
  async getSchema(
    capability: string,
    version: string,
    fetchFn: () => Promise<any>
  ): Promise<any> {
    const cacheKey = `${capability}:${version}`;
    
    // Check cache first
    const cached = this.schemaCache.get(cacheKey);
    if (cached) {
      this.metrics.schemaCache.hits++;
      this.updateHitRate('schema');
      this.emit('cache-hit', { type: 'schema', key: cacheKey });
      return cached;
    }

    // Cache miss - fetch and cache
    this.metrics.schemaCache.misses++;
    this.updateHitRate('schema');
    
    try {
      const schema = await fetchFn();
      
      // Compress if enabled
      const cacheValue = this.compressionEnabled ? 
        this.compress(schema) : schema;
      
      this.schemaCache.set(cacheKey, cacheValue);
      this.emit('cache-miss', { type: 'schema', key: cacheKey });
      
      return schema;
    } catch (error) {
      this.emit('cache-error', { type: 'schema', key: cacheKey, error });
      throw error;
    }
  }

  /**
   * Get validation result from cache or validate if not cached
   */
  async getValidationResult(
    cacheKey: ValidationCacheKey,
    validateFn: () => Promise<any>
  ): Promise<{ result: any; fromCache: boolean; validationTime: number }> {
    const keyString = this.serializeCacheKey(cacheKey);
    const startTime = Date.now();
    
    // Check cache first
    const cached = this.resultCache.get(keyString);
    if (cached && this.isCacheEntryValid(cached)) {
      // Update access metadata
      cached.hitCount++;
      cached.lastAccess = new Date();
      this.resultCache.set(keyString, cached);
      
      this.metrics.resultCache.hits++;
      this.updateHitRate('result');
      
      const cacheTime = Date.now() - startTime;
      this.updatePerformanceMetrics(cacheTime, true);
      
      this.emit('validation-cache-hit', { key: keyString, hitCount: cached.hitCount });
      
      return {
        result: cached.result,
        fromCache: true,
        validationTime: cacheTime
      };
    }

    // Cache miss - validate and cache
    this.metrics.resultCache.misses++;
    this.updateHitRate('result');
    
    try {
      const validationStartTime = Date.now();
      const result = await validateFn();
      const validationTime = Date.now() - validationStartTime;
      
      // Cache the result
      const cachedResult: CachedValidationResult = {
        result,
        timestamp: new Date(),
        ttl: this.config.resultTTL,
        hitCount: 0,
        lastAccess: new Date(),
        metadata: {
          originalValidationTime: validationTime,
          schemaId: cacheKey.capability,
          cacheVersion: '1.0.0'
        }
      };
      
      this.resultCache.set(keyString, cachedResult);
      this.updatePerformanceMetrics(validationTime, false);
      
      this.emit('validation-cache-miss', { key: keyString, validationTime });
      
      return {
        result,
        fromCache: false,
        validationTime: Date.now() - startTime
      };
      
    } catch (error) {
      this.emit('validation-cache-error', { key: keyString, error });
      throw error;
    }
  }

  /**
   * Batch validate multiple items with cache optimization
   */
  async batchValidate(
    items: Array<{
      cacheKey: ValidationCacheKey;
      validateFn: () => Promise<any>;
    }>
  ): Promise<Array<{ result: any; fromCache: boolean; validationTime: number }>> {
    const results: Array<{ result: any; fromCache: boolean; validationTime: number }> = [];
    const uncachedItems: Array<{ index: number; cacheKey: ValidationCacheKey; validateFn: () => Promise<any> }> = [];
    
    // First pass: check cache for all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const keyString = this.serializeCacheKey(item.cacheKey);
      const cached = this.resultCache.get(keyString);
      
      if (cached && this.isCacheEntryValid(cached)) {
        // Cache hit
        cached.hitCount++;
        cached.lastAccess = new Date();
        this.resultCache.set(keyString, cached);
        
        results[i] = {
          result: cached.result,
          fromCache: true,
          validationTime: 0
        };
        
        this.metrics.resultCache.hits++;
      } else {
        // Cache miss - queue for batch validation
        uncachedItems.push({ index: i, ...item });
        this.metrics.resultCache.misses++;
      }
    }
    
    // Second pass: batch validate uncached items
    if (uncachedItems.length > 0) {
      const batchPromises = uncachedItems.map(async (item) => {
        const startTime = Date.now();
        try {
          const result = await item.validateFn();
          const validationTime = Date.now() - startTime;
          
          // Cache the result
          const cachedResult: CachedValidationResult = {
            result,
            timestamp: new Date(),
            ttl: this.config.resultTTL,
            hitCount: 0,
            lastAccess: new Date(),
            metadata: {
              originalValidationTime: validationTime,
              schemaId: item.cacheKey.capability,
              cacheVersion: '1.0.0'
            }
          };
          
          const keyString = this.serializeCacheKey(item.cacheKey);
          this.resultCache.set(keyString, cachedResult);
          
          return {
            index: item.index,
            result: { result, fromCache: false, validationTime }
          };
        } catch (error) {
          return {
            index: item.index,
            error
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Merge batch results back into main results array
      batchResults.forEach((settled) => {
        if (settled.status === 'fulfilled' && !settled.value.error) {
          results[settled.value.index] = settled.value.result;
        } else {
          // Handle error case
          const error = settled.status === 'rejected' ? settled.reason : settled.value.error;
          throw error;
        }
      });
    }
    
    this.updateHitRate('result');
    return results;
  }

  /**
   * Preload schemas for common capabilities
   */
  async preloadSchemas(
    capabilities: Array<{
      capability: string;
      version: string;
      fetchFn: () => Promise<any>;
    }>
  ): Promise<void> {
    const preloadPromises = capabilities.map(async ({ capability, version, fetchFn }) => {
      try {
        await this.getSchema(capability, version, fetchFn);
      } catch (error) {
        console.warn(`Failed to preload schema for ${capability}:${version}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
    this.emit('schemas-preloaded', { count: capabilities.length });
  }

  /**
   * Invalidate cache entries
   */
  invalidateSchema(capability: string, version?: string): void {
    if (version) {
      const key = `${capability}:${version}`;
      this.schemaCache.delete(key);
    } else {
      // Invalidate all versions of the capability
      for (const key of this.schemaCache.keys()) {
        if (key.startsWith(`${capability}:`)) {
          this.schemaCache.delete(key);
        }
      }
    }
    
    this.emit('schema-invalidated', { capability, version });
  }

  /**
   * Invalidate validation results for capability
   */
  invalidateValidationResults(capability: string): void {
    let invalidatedCount = 0;
    
    for (const [key, cached] of this.resultCache.entries()) {
      const cacheKey = this.deserializeCacheKey(key);
      if (cacheKey.capability === capability) {
        this.resultCache.delete(key);
        invalidatedCount++;
      }
    }
    
    this.emit('validation-results-invalidated', { capability, count: invalidatedCount });
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateMemoryMetrics();
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  getStatistics(): any {
    return {
      schemaCache: {
        size: this.schemaCache.size,
        max: this.schemaCache.max,
        remainingTTL: this.schemaCache.getRemainingTTL,
        keys: Array.from(this.schemaCache.keys())
      },
      resultCache: {
        size: this.resultCache.size,
        max: this.resultCache.max,
        keys: Array.from(this.resultCache.keys()).slice(0, 10) // Limit for readability
      },
      performance: this.metrics.performance,
      memory: this.metrics.memory
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.schemaCache.clear();
    this.resultCache.clear();
    this.resetMetrics();
    this.emit('cache-cleared');
  }

  /**
   * Initialize cache instances
   */
  private initializeCaches(): void {
    this.schemaCache = new LRUCache({
      max: this.config.maxSchemaEntries,
      ttl: this.config.schemaTTL,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.resultCache = new LRUCache({
      max: this.config.maxResultEntries,
      ttl: this.config.resultTTL,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Setup eviction listeners
    this.schemaCache.on('evict', () => {
      this.metrics.schemaCache.evictions++;
    });

    this.resultCache.on('evict', () => {
      this.metrics.resultCache.evictions++;
    });
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      schemaCache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        maxSize: this.config.maxSchemaEntries,
        evictions: 0
      },
      resultCache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        maxSize: this.config.maxResultEntries,
        evictions: 0
      },
      performance: {
        averageValidationTime: 0,
        cachedValidationTime: 0,
        performanceImprovement: 0
      },
      memory: {
        heapUsed: 0,
        cacheMemoryUsage: 0
      }
    };
  }

  /**
   * Setup periodic cleanup
   */
  private setupCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Setup persistent storage
   */
  private setupPersistentStorage(): void {
    // In production, this would setup file-based persistence
    console.log('UEP Performance Cache: Persistent storage enabled');
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    // Update cache sizes
    this.metrics.schemaCache.size = this.schemaCache.size;
    this.metrics.resultCache.size = this.resultCache.size;
    
    // Clean expired entries (LRU cache handles this automatically)
    // Update memory metrics
    this.updateMemoryMetrics();
    
    this.emit('cleanup-performed', {
      schemaSize: this.metrics.schemaCache.size,
      resultSize: this.metrics.resultCache.size
    });
  }

  /**
   * Update hit rate metrics
   */
  private updateHitRate(type: 'schema' | 'result'): void {
    const cache = type === 'schema' ? this.metrics.schemaCache : this.metrics.resultCache;
    const total = cache.hits + cache.misses;
    cache.hitRate = total > 0 ? (cache.hits / total) * 100 : 0;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(validationTime: number, fromCache: boolean): void {
    if (fromCache) {
      // Update cached validation time (moving average)
      this.metrics.performance.cachedValidationTime = 
        (this.metrics.performance.cachedValidationTime + validationTime) / 2;
    } else {
      // Update average validation time (moving average)
      this.metrics.performance.averageValidationTime = 
        (this.metrics.performance.averageValidationTime + validationTime) / 2;
    }
    
    // Calculate performance improvement
    if (this.metrics.performance.averageValidationTime > 0) {
      this.metrics.performance.performanceImprovement = 
        ((this.metrics.performance.averageValidationTime - this.metrics.performance.cachedValidationTime) / 
         this.metrics.performance.averageValidationTime) * 100;
    }
  }

  /**
   * Update memory metrics
   */
  private updateMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memory.heapUsed = memUsage.heapUsed / 1024 / 1024; // MB
    
    // Estimate cache memory usage
    this.metrics.memory.cacheMemoryUsage = 
      (this.schemaCache.size * 1024 + this.resultCache.size * 512) / 1024; // Rough estimate in KB
  }

  /**
   * Serialize cache key
   */
  private serializeCacheKey(key: ValidationCacheKey): string {
    return `${key.capability}:${key.schemaVersion}:${key.dataHash}:${key.validationOptions || ''}`;
  }

  /**
   * Deserialize cache key
   */
  private deserializeCacheKey(keyString: string): ValidationCacheKey {
    const [capability, schemaVersion, dataHash, validationOptions] = keyString.split(':');
    return {
      capability,
      schemaVersion,
      dataHash,
      validationOptions: validationOptions || undefined
    };
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheEntryValid(entry: CachedValidationResult): boolean {
    const now = Date.now();
    const entryAge = now - entry.timestamp.getTime();
    return entryAge < entry.ttl;
  }

  /**
   * Compress data if compression is enabled
   */
  private compress(data: any): any {
    // In production, this would use actual compression (gzip, brotli, etc.)
    return this.compressionEnabled ? JSON.stringify(data) : data;
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.initializeMetrics();
  }

  /**
   * Shutdown cache
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.clearAll();
    this.removeAllListeners();
  }
}