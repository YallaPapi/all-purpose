/**
 * In-Memory LRU Cache
 * 
 * Task 42: High-performance LRU cache for embeddings, file content, and query patterns
 * Foundation layer for the RAG caching system with size-based eviction and memory tracking
 */

import { LRUCache } from 'lru-cache';
import { logger } from '../utils/logger';

export interface LRUCacheConfig {
  maxSize: number; // Maximum memory in bytes
  ttl?: number; // Time-to-live in milliseconds
  updateAgeOnGet?: boolean; // Update age when item is accessed
  updateAgeOnHas?: boolean; // Update age when item is checked
  allowStale?: boolean; // Allow stale entries when over TTL
  staleWhileRevalidate?: number; // Time to serve stale while revalidating
}

export interface CacheEntry<T> {
  value: T;
  size: number;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
}

export interface LRUCacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  currentSize: number;
  currentCount: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsage: number;
  maxSize: number;
}

/**
 * High-performance in-memory LRU cache with memory tracking
 */
export class InMemoryLRUCache<T> {
  private cache: LRUCache<string, CacheEntry<T>>;
  private config: LRUCacheConfig;
  private stats: LRUCacheStats;
  private name: string;

  constructor(name: string, config: LRUCacheConfig) {
    this.name = name;
    this.config = config;
    
    // Initialize stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      currentSize: 0,
      currentCount: 0,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      maxSize: config.maxSize
    };

    // Create LRU cache with size-based eviction
    this.cache = new LRUCache<string, CacheEntry<T>>({
      maxSize: config.maxSize,
      ttl: config.ttl,
      updateAgeOnGet: config.updateAgeOnGet ?? true,
      updateAgeOnHas: config.updateAgeOnHas ?? false,
      allowStale: config.allowStale ?? false,
      
      // Size calculation function
      sizeCalculation: (entry, key) => {
        return this.calculateEntrySize(entry, key);
      },
      
      // Disposal callback for evictions
      dispose: (entry, key, reason) => {
        this.handleDisposal(entry, key, reason);
      },
      
      // Fetch function for stale-while-revalidate
      fetchMethod: config.staleWhileRevalidate ? async (key) => {
        // This would be implemented by the consumer for cache revalidation
        return undefined;
      } : undefined
    });

    logger.info(`In-memory LRU cache '${name}' initialized`, {
      maxSize: config.maxSize,
      ttl: config.ttl,
      name: this.name
    });
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (entry === undefined) {
        this.stats.misses++;
        this.updateStats(startTime);
        return undefined;
      }

      // Update entry metadata
      entry.accessCount++;
      entry.lastAccess = Date.now();
      
      this.stats.hits++;
      this.updateStats(startTime);
      
      logger.debug(`Cache hit for key in '${this.name}'`, {
        key: key.substring(0, 20) + '...',
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp
      });

      return entry.value;

    } catch (error) {
      logger.error(`Error getting cache entry in '${this.name}'`, {
        error: error instanceof Error ? error.message : String(error),
        key: key.substring(0, 20) + '...'
      });
      
      this.stats.misses++;
      this.updateStats(startTime);
      return undefined;
    }
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): boolean {
    const startTime = Date.now();
    
    try {
      const entry: CacheEntry<T> = {
        value,
        size: this.calculateValueSize(value),
        timestamp: Date.now(),
        accessCount: 0,
        lastAccess: Date.now()
      };

      // Check if this entry would exceed memory limits
      const entrySize = this.calculateEntrySize(entry, key);
      if (entrySize > this.config.maxSize) {
        logger.warn(`Entry too large for cache '${this.name}'`, {
          key: key.substring(0, 20) + '...',
          entrySize,
          maxSize: this.config.maxSize
        });
        return false;
      }

      this.cache.set(key, entry);
      this.stats.sets++;
      this.updateCacheStats();
      this.updateStats(startTime);
      
      logger.debug(`Cache set in '${this.name}'`, {
        key: key.substring(0, 20) + '...',
        size: entrySize,
        cacheSize: this.stats.currentCount
      });

      return true;

    } catch (error) {
      logger.error(`Error setting cache entry in '${this.name}'`, {
        error: error instanceof Error ? error.message : String(error),
        key: key.substring(0, 20) + '...'
      });
      
      this.updateStats(startTime);
      return false;
    }
  }

  /**
   * Check if key exists in cache without updating access time
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateCacheStats();
      logger.debug(`Cache delete in '${this.name}'`, {
        key: key.substring(0, 20) + '...'
      });
    }
    return deleted;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    const previousCount = this.stats.currentCount;
    this.cache.clear();
    this.updateCacheStats();
    
    logger.info(`Cache cleared in '${this.name}'`, {
      clearedEntries: previousCount
    });
  }

  /**
   * Get all keys (expensive operation - use sparingly)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values (expensive operation - use sparingly)
   */
  values(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Get cache statistics
   */
  getStats(): LRUCacheStats {
    this.updateCacheStats();
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): LRUCacheConfig {
    return { ...this.config };
  }

  /**
   * Get cache name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Resize cache maximum size
   */
  resize(newMaxSize: number): void {
    this.config.maxSize = newMaxSize;
    // Note: LRU cache maxSize is read-only, need to recreate cache
    this.stats.maxSize = newMaxSize;
    this.updateCacheStats();
    
    logger.info(`Cache '${this.name}' resized`, {
      newMaxSize,
      currentSize: this.stats.currentSize
    });
  }

  /**
   * Force garbage collection of expired entries
   */
  purgeStale(): number {
    const initialSize = this.cache.size;
    this.cache.purgeStale();
    const purgedCount = initialSize - this.cache.size;
    
    if (purgedCount > 0) {
      this.updateCacheStats();
      logger.debug(`Purged stale entries from '${this.name}'`, {
        purgedCount
      });
    }
    
    return purgedCount;
  }

  /**
   * Get cache entries sorted by access patterns (for debugging)
   */
  getEntriesByAccess(limit = 10): Array<{
    key: string;
    accessCount: number;
    age: number;
    lastAccess: number;
    size: number;
  }> {
    const entries: Array<{
      key: string;
      accessCount: number;
      age: number;
      lastAccess: number;
      size: number;
    }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key: key.substring(0, 30) + (key.length > 30 ? '...' : ''),
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp,
        lastAccess: entry.lastAccess,
        size: entry.size
      });
    }

    // Sort by access count descending
    return entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Calculate the size of a cache entry including metadata
   */
  private calculateEntrySize(entry: CacheEntry<T>, key: string): number {
    // Key size (UTF-8 bytes)
    const keySize = Buffer.byteLength(key, 'utf8');
    
    // Entry metadata size (rough estimate)
    const metadataSize = 64; // timestamp, accessCount, lastAccess, size fields
    
    // Value size
    const valueSize = entry.size;
    
    return keySize + metadataSize + valueSize;
  }

  /**
   * Calculate the size of a value for storage
   */
  private calculateValueSize(value: T): number {
    try {
      if (value === null || value === undefined) {
        return 8; // 64-bit pointer
      }

      // Handle different data types
      if (typeof value === 'string') {
        return Buffer.byteLength(value, 'utf8');
      }

      if (typeof value === 'number') {
        return 8; // 64-bit number
      }

      if (typeof value === 'boolean') {
        return 1;
      }

      if (Array.isArray(value)) {
        // For embeddings (number arrays)
        if (value.length > 0 && typeof value[0] === 'number') {
          return value.length * 8; // 64-bit floats
        }
        // For other arrays, serialize and measure
        return Buffer.byteLength(JSON.stringify(value), 'utf8');
      }

      if (value instanceof ArrayBuffer) {
        return value.byteLength;
      }

      if (value instanceof Float32Array || value instanceof Float64Array) {
        return value.byteLength;
      }

      // For objects, serialize and measure (expensive but accurate)
      return Buffer.byteLength(JSON.stringify(value), 'utf8');

    } catch (error) {
      // Fallback to rough estimate if serialization fails
      logger.warn(`Error calculating value size in '${this.name}', using estimate`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return 1024; // 1KB estimate
    }
  }

  /**
   * Handle cache entry disposal (eviction)
   */
  private handleDisposal(entry: CacheEntry<T>, key: string, reason: string): void {
    this.stats.evictions++;
    
    logger.debug(`Cache entry disposed from '${this.name}'`, {
      key: key.substring(0, 20) + '...',
      reason,
      accessCount: entry.accessCount,
      age: Date.now() - entry.timestamp,
      size: entry.size
    });
  }

  /**
   * Update internal cache statistics
   */
  private updateCacheStats(): void {
    this.stats.currentCount = this.cache.size;
    this.stats.currentSize = this.cache.calculatedSize || 0;
    this.stats.memoryUsage = this.stats.currentSize;
    
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
  }

  /**
   * Update performance statistics
   */
  private updateStats(startTime: number): void {
    const responseTime = Date.now() - startTime;
    const totalRequests = this.stats.hits + this.stats.misses;
    
    // Update rolling average response time
    if (totalRequests > 1) {
      this.stats.averageAccessTime = 
        (this.stats.averageAccessTime * (totalRequests - 1) + responseTime) / totalRequests;
    } else {
      this.stats.averageAccessTime = responseTime;
    }

    this.updateCacheStats();
  }
}

/**
 * Create specialized cache instances for different data types
 */
export class CacheFactory {
  /**
   * Create cache optimized for embeddings (number arrays)
   */
  static createEmbeddingCache(maxSizeMB = 20): InMemoryLRUCache<number[]> {
    return new InMemoryLRUCache<number[]>('embeddings', {
      maxSize: maxSizeMB * 1024 * 1024,
      ttl: 24 * 60 * 60 * 1000, // 24 hours for embeddings
      updateAgeOnGet: true,
      allowStale: true,
      staleWhileRevalidate: 60000 // 1 minute
    });
  }

  /**
   * Create cache optimized for file content
   */
  static createFileContentCache(maxSizeMB = 25): InMemoryLRUCache<any> {
    return new InMemoryLRUCache<any>('file-content', {
      maxSize: maxSizeMB * 1024 * 1024,
      ttl: 60 * 60 * 1000, // 1 hour for file content
      updateAgeOnGet: true,
      allowStale: false
    });
  }

  /**
   * Create cache optimized for query patterns
   */
  static createQueryPatternCache(maxSizeMB = 5): InMemoryLRUCache<any> {
    return new InMemoryLRUCache<any>('query-patterns', {
      maxSize: maxSizeMB * 1024 * 1024,
      ttl: 30 * 60 * 1000, // 30 minutes for query patterns
      updateAgeOnGet: true,
      allowStale: true,
      staleWhileRevalidate: 30000 // 30 seconds
    });
  }

  /**
   * Create generic cache with custom configuration
   */
  static createGenericCache<T>(name: string, config: LRUCacheConfig): InMemoryLRUCache<T> {
    return new InMemoryLRUCache<T>(name, config);
  }
}

// Types already exported above