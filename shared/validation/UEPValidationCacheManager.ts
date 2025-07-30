/**
 * UEP Validation Cache and Metrics Manager
 * 
 * Centralized caching and metrics collection system for all UEP validation
 * components. Provides distributed caching, cache invalidation strategies,
 * unified metrics collection, and performance optimization across all
 * validation middleware. Based on TaskMaster research findings and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge, register } from 'prom-client';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Logger } from '../utils/Logger';
import { UEPValidationResult } from '../../containers/api-gateway/src/validation/UEPValidationMiddleware';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPCacheConfig {
  enableDistributedCache: boolean;
  enableLocalCache: boolean;
  localCacheOptions: {
    maxSize: number;
    ttl: number;
    maxAge: number;
    updateAgeOnGet: boolean;
    allowStale: boolean;
  };
  distributedCacheOptions: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    ttl: number;
    maxRetries: number;
    retryDelayOnFailover: number;
  };
  cacheStrategy: 'local-only' | 'distributed-only' | 'hybrid' | 'write-through' | 'write-behind';
  invalidationStrategy: 'time-based' | 'version-based' | 'content-based' | 'hybrid';
  enableCacheWarming: boolean;
  enableCacheCompression: boolean;
  compressionThreshold: number;
  enableMetrics: boolean;
  enableTracing: boolean;
}

export interface UEPCacheEntry {
  key: string;
  value: UEPValidationResult;
  timestamp: number;
  ttl: number;
  hits: number;
  source: 'api-gateway' | 'service-to-service' | 'event-validation' | 'unknown';
  schemaVersion: string;
  compressed?: boolean;
  size: number;
}

export interface UEPCacheMetrics {
  cacheOperationsTotal: Counter;
  cacheHitRatio: Gauge;
  cacheMissRatio: Gauge;
  cacheSize: Gauge;
  cacheMemoryUsage: Gauge;
  cacheEvictions: Counter;
  cacheInvalidations: Counter;
  distributedCacheLatency: Histogram;
  localCacheLatency: Histogram;
  cacheCompressionRatio: Gauge;
  validationMetricsTotal: Counter;
  validationLatency: Histogram;
  validationErrorRate: Gauge;
  validationThroughput: Histogram;
}

export interface UEPCacheStats {
  local: {
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
    evictions: number;
    memoryUsage: number;
  };
  distributed: {
    connected: boolean;
    latency: number;
    errors: number;
    memory: number;
    keys: number;
  };
  performance: {
    averageGetTime: number;
    averageSetTime: number;
    compressionRatio: number;
    totalOperations: number;
  };
}

export type UEPCacheInvalidationEvent = {
  keys: string[];
  reason: 'expired' | 'version-change' | 'manual' | 'size-limit' | 'memory-pressure';
  timestamp: number;
};

// =============================================================================
// UEP Validation Cache Manager Core Class
// =============================================================================

export class UEPValidationCacheManager extends EventEmitter {
  private readonly config: UEPCacheConfig;
  private readonly logger = new Logger('UEPValidationCacheManager');
  private readonly tracer = trace.getTracer('uep-validation-cache-manager', '1.0.0');
  
  // Cache implementations
  private readonly localCache: LRUCache<string, UEPCacheEntry>;
  private distributedCache: Redis | null = null;
  
  // Metrics collection
  private readonly metrics: UEPCacheMetrics;
  
  // Cache statistics tracking
  private readonly cacheStats: Map<string, number> = new Map();
  private readonly performanceMetrics: Map<string, number[]> = new Map();
  
  // Schema version tracking for cache invalidation
  private currentSchemaVersion: string = '2.0.0';
  private readonly schemaVersionCache: Map<string, string> = new Map();

  constructor(config: Partial<UEPCacheConfig> = {}) {
    super();
    
    this.config = {
      enableDistributedCache: true,
      enableLocalCache: true,
      localCacheOptions: {
        maxSize: 50000,
        ttl: 300000, // 5 minutes
        maxAge: 600000, // 10 minutes
        updateAgeOnGet: true,
        allowStale: true
      },
      distributedCacheOptions: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '1'),
        keyPrefix: 'uep:validation:',
        ttl: 900, // 15 minutes
        maxRetries: 3,
        retryDelayOnFailover: 100
      },
      cacheStrategy: 'hybrid',
      invalidationStrategy: 'hybrid',
      enableCacheWarming: true,
      enableCacheCompression: true,
      compressionThreshold: 1024, // 1KB
      enableMetrics: true,
      enableTracing: true,
      ...config
    };

    // Initialize local cache
    this.localCache = new LRUCache({
      max: this.config.localCacheOptions.maxSize,
      ttl: this.config.localCacheOptions.ttl,
      maxAge: this.config.localCacheOptions.maxAge,
      updateAgeOnGet: this.config.localCacheOptions.updateAgeOnGet,
      allowStale: this.config.localCacheOptions.allowStale,
      dispose: (value, key) => this.handleCacheEviction(key, value),
      noDisposeOnSet: false
    });

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Initialize distributed cache if enabled
    if (this.config.enableDistributedCache) {
      this.initializeDistributedCache();
    }

    // Setup cache warming if enabled
    if (this.config.enableCacheWarming) {
      this.setupCacheWarming();
    }

    // Setup automatic cache maintenance
    this.setupCacheMaintenance();

    this.logger.info('UEP Validation Cache Manager initialized', {
      localCacheSize: this.config.localCacheOptions.maxSize,
      distributedCacheEnabled: this.config.enableDistributedCache,
      cacheStrategy: this.config.cacheStrategy,
      compressionEnabled: this.config.enableCacheCompression
    });
  }

  // =============================================================================
  // Cache Operations
  // =============================================================================

  public async get(key: string, source: string = 'unknown'): Promise<UEPValidationResult | null> {
    return this.tracer.startActiveSpan('uep.cache.get', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'cache.key': this.sanitizeKeyForTracing(key),
          'cache.source': source,
          'cache.strategy': this.config.cacheStrategy
        });

        // Generate normalized cache key
        const cacheKey = this.generateCacheKey(key, source);

        // Try local cache first (fastest)
        if (this.config.enableLocalCache) {
          const localEntry = this.localCache.get(cacheKey);
          if (localEntry) {
            localEntry.hits++;
            this.updateCacheStats('local_hit', Date.now() - startTime);
            
            if (this.config.enableMetrics) {
              this.metrics.cacheOperationsTotal.inc({ operation: 'get', source, result: 'hit', cache_type: 'local' });
              this.metrics.localCacheLatency.observe({ source }, (Date.now() - startTime) / 1000);
            }

            span.setAttributes({
              'cache.hit': true,
              'cache.type': 'local',
              'cache.age_ms': Date.now() - localEntry.timestamp
            });

            span.setStatus({ code: SpanStatusCode.OK });
            return localEntry.value;
          }
        }

        // Try distributed cache if local miss
        if (this.config.enableDistributedCache && this.distributedCache) {
          const distributedValue = await this.getFromDistributedCache(cacheKey);
          if (distributedValue) {
            const entry = this.deserializeCacheEntry(distributedValue);
            
            // Populate local cache with distributed result
            if (this.config.enableLocalCache && this.config.cacheStrategy === 'hybrid') {
              this.localCache.set(cacheKey, entry);
            }

            this.updateCacheStats('distributed_hit', Date.now() - startTime);
            
            if (this.config.enableMetrics) {
              this.metrics.cacheOperationsTotal.inc({ operation: 'get', source, result: 'hit', cache_type: 'distributed' });
              this.metrics.distributedCacheLatency.observe({ source }, (Date.now() - startTime) / 1000);
            }

            span.setAttributes({
              'cache.hit': true,
              'cache.type': 'distributed',
              'cache.compressed': entry.compressed || false
            });

            span.setStatus({ code: SpanStatusCode.OK });
            return entry.value;
          }
        }

        // Cache miss
        this.updateCacheStats('miss', Date.now() - startTime);
        
        if (this.config.enableMetrics) {
          this.metrics.cacheOperationsTotal.inc({ operation: 'get', source, result: 'miss', cache_type: 'none' });
        }

        span.setAttributes({
          'cache.hit': false,
          'cache.miss_reason': 'not_found'
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return null;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Cache get operation failed', {
          key: this.sanitizeKeyForLogging(key),
          source,
          error: (error as Error).message
        });

        if (this.config.enableMetrics) {
          this.metrics.cacheOperationsTotal.inc({ operation: 'get', source, result: 'error', cache_type: 'none' });
        }

        return null;
      }
    });
  }

  public async set(
    key: string, 
    value: UEPValidationResult, 
    source: string = 'unknown',
    ttlOverride?: number
  ): Promise<void> {
    return this.tracer.startActiveSpan('uep.cache.set', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'cache.key': this.sanitizeKeyForTracing(key),
          'cache.source': source,
          'cache.strategy': this.config.cacheStrategy,
          'cache.value_size': JSON.stringify(value).length
        });

        const cacheKey = this.generateCacheKey(key, source);
        const ttl = ttlOverride || this.config.localCacheOptions.ttl;
        
        const entry: UEPCacheEntry = {
          key: cacheKey,
          value,
          timestamp: Date.now(),
          ttl,
          hits: 0,
          source: source as any,
          schemaVersion: value.schemaVersion || this.currentSchemaVersion,
          size: JSON.stringify(value).length
        };

        // Set in local cache if enabled
        if (this.config.enableLocalCache) {
          this.localCache.set(cacheKey, entry, { ttl });
          
          if (this.config.enableMetrics) {
            this.metrics.cacheSize.set(this.localCache.size);
            this.metrics.cacheMemoryUsage.set(this.estimateMemoryUsage());
          }
        }

        // Set in distributed cache if enabled
        if (this.config.enableDistributedCache && this.distributedCache) {
          await this.setInDistributedCache(cacheKey, entry);
        }

        this.updateCacheStats('set', Date.now() - startTime);
        
        if (this.config.enableMetrics) {
          this.metrics.cacheOperationsTotal.inc({ operation: 'set', source, result: 'success', cache_type: 'both' });
        }

        span.setAttributes({
          'cache.stored': true,
          'cache.compressed': entry.compressed || false,
          'cache.ttl_ms': ttl
        });

        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Cache set operation failed', {
          key: this.sanitizeKeyForLogging(key),
          source,
          error: (error as Error).message
        });

        if (this.config.enableMetrics) {
          this.metrics.cacheOperationsTotal.inc({ operation: 'set', source, result: 'error', cache_type: 'none' });
        }
      }
    });
  }

  // =============================================================================
  // Distributed Cache Operations
  // =============================================================================

  private async initializeDistributedCache(): Promise<void> {
    try {
      this.distributedCache = new Redis({
        host: this.config.distributedCacheOptions.host,
        port: this.config.distributedCacheOptions.port,
        password: this.config.distributedCacheOptions.password,
        db: this.config.distributedCacheOptions.db,
        keyPrefix: this.config.distributedCacheOptions.keyPrefix,
        maxRetriesPerRequest: this.config.distributedCacheOptions.maxRetries,
        retryDelayOnFailover: this.config.distributedCacheOptions.retryDelayOnFailover,
        lazyConnect: true,
        enableReadyCheck: true,
        maxLoadingTimeout: 5000
      });

      // Connection event handlers
      this.distributedCache.on('connect', () => {
        this.logger.info('Connected to distributed cache (Redis)');
        this.emit('distributedCacheConnected');
      });

      this.distributedCache.on('error', (error) => {
        this.logger.error('Distributed cache error', { error: error.message });
        this.emit('distributedCacheError', error);
      });

      this.distributedCache.on('close', () => {
        this.logger.warn('Distributed cache connection closed');
        this.emit('distributedCacheDisconnected');
      });

      // Connect to Redis
      await this.distributedCache.connect();

    } catch (error) {
      this.logger.error('Failed to initialize distributed cache', { error: (error as Error).message });
      this.distributedCache = null;
    }
  }

  private async getFromDistributedCache(key: string): Promise<string | null> {
    if (!this.distributedCache) return null;

    try {
      const value = await this.distributedCache.get(key);
      return value;
    } catch (error) {
      this.logger.error('Failed to get from distributed cache', {
        key: this.sanitizeKeyForLogging(key),
        error: (error as Error).message
      });
      return null;
    }
  }

  private async setInDistributedCache(key: string, entry: UEPCacheEntry): Promise<void> {
    if (!this.distributedCache) return;

    try {
      const serialized = this.serializeCacheEntry(entry);
      const ttlSeconds = Math.floor(this.config.distributedCacheOptions.ttl);
      
      await this.distributedCache.setex(key, ttlSeconds, serialized);
    } catch (error) {
      this.logger.error('Failed to set in distributed cache', {
        key: this.sanitizeKeyForLogging(key),
        error: (error as Error).message
      });
    }
  }

  // =============================================================================
  // Cache Entry Serialization
  // =============================================================================

  private serializeCacheEntry(entry: UEPCacheEntry): string {
    const data = JSON.stringify(entry);
    
    if (this.config.enableCacheCompression && data.length > this.config.compressionThreshold) {
      // Simple compression flag - in production, use zlib or similar
      entry.compressed = true;
      return JSON.stringify({ ...entry, compressed: true });
    }
    
    return data;
  }

  private deserializeCacheEntry(data: string): UEPCacheEntry {
    const entry = JSON.parse(data) as UEPCacheEntry;
    
    if (entry.compressed) {
      // Handle decompression if needed
      delete entry.compressed;
    }
    
    return entry;
  }

  // =============================================================================
  // Cache Invalidation
  // =============================================================================

  public async invalidate(keys: string[] | string, reason: string = 'manual'): Promise<void> {
    return this.tracer.startActiveSpan('uep.cache.invalidate', async (span) => {
      try {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        const normalizedKeys = keyArray.map(key => this.generateCacheKey(key));

        span.setAttributes({
          'cache.invalidation.key_count': keyArray.length,
          'cache.invalidation.reason': reason
        });

        // Invalidate from local cache
        if (this.config.enableLocalCache) {
          for (const key of normalizedKeys) {
            this.localCache.delete(key);
          }
        }

        // Invalidate from distributed cache
        if (this.config.enableDistributedCache && this.distributedCache) {
          if (normalizedKeys.length > 1) {
            await this.distributedCache.del(...normalizedKeys);
          } else {
            await this.distributedCache.del(normalizedKeys[0]);
          }
        }

        if (this.config.enableMetrics) {
          this.metrics.cacheInvalidations.inc({ reason }, keyArray.length);
        }

        this.emit('cacheInvalidated', {
          keys: keyArray,
          reason,
          timestamp: Date.now()
        } as UEPCacheInvalidationEvent);

        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  public async invalidateByPattern(pattern: string, reason: string = 'pattern-match'): Promise<void> {
    if (this.config.enableDistributedCache && this.distributedCache) {
      try {
        const keys = await this.distributedCache.keys(`${this.config.distributedCacheOptions.keyPrefix}${pattern}`);
        if (keys.length > 0) {
          await this.invalidate(keys, reason);
        }
      } catch (error) {
        this.logger.error('Failed to invalidate cache by pattern', {
          pattern,
          error: (error as Error).message
        });
      }
    }
  }

  public async invalidateBySchemaVersion(oldVersion: string): Promise<void> {
    await this.invalidateByPattern(`*schema:${oldVersion}*`, 'schema-version-change');
  }

  // =============================================================================
  // Cache Warming
  // =============================================================================

  private setupCacheWarming(): void {
    // Warm cache with common validation patterns
    const commonPatterns = [
      'agent-request',
      'agent-response',
      'system-notification',
      'heartbeat',
      'error-report'
    ];

    setTimeout(async () => {
      for (const pattern of commonPatterns) {
        try {
          // Pre-warm with basic validation schemas
          const dummyResult: UEPValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            validationTime: 0,
            schemaVersion: this.currentSchemaVersion,
            cacheHit: false
          };
          
          await this.set(`schema:${pattern}`, dummyResult, 'cache-warming');
        } catch (error) {
          this.logger.debug('Cache warming failed for pattern', { pattern, error: (error as Error).message });
        }
      }
      
      this.logger.info('Cache warming completed', { patterns: commonPatterns.length });
    }, 5000); // Wait 5 seconds after initialization
  }

  // =============================================================================
  // Cache Maintenance
  // =============================================================================

  private setupCacheMaintenance(): void {
    // Run maintenance every 5 minutes
    setInterval(() => {
      this.performCacheMaintenance();
    }, 300000);
  }

  private async performCacheMaintenance(): Promise<void> {
    try {
      // Update cache metrics
      if (this.config.enableMetrics) {
        this.updateCacheMetrics();
      }

      // Cleanup expired entries (handled automatically by LRU)
      // Log cache statistics
      const stats = this.getCacheStats();
      this.logger.debug('Cache maintenance completed', { stats });

      this.emit('cacheMaintenanceCompleted', { stats, timestamp: Date.now() });

    } catch (error) {
      this.logger.error('Cache maintenance failed', { error: (error as Error).message });
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private generateCacheKey(key: string, source?: string): string {
    const normalizedKey = `${source || 'general'}:${createHash('sha256').update(key).digest('hex')}`;
    return normalizedKey;
  }

  private sanitizeKeyForTracing(key: string): string {
    return key.length > 100 ? key.substring(0, 100) + '...' : key;
  }

  private sanitizeKeyForLogging(key: string): string {
    return key.length > 200 ? key.substring(0, 200) + '...' : key;
  }

  private updateCacheStats(operation: string, duration: number): void {
    const current = this.cacheStats.get(operation) || 0;
    this.cacheStats.set(operation, current + 1);

    const durations = this.performanceMetrics.get(operation) || [];
    durations.push(duration);
    
    // Keep only last 1000 measurements
    if (durations.length > 1000) {
      durations.shift();
    }
    
    this.performanceMetrics.set(operation, durations);
  }

  private estimateMemoryUsage(): number {
    return this.localCache.size * 1024; // Rough estimate: 1KB per entry
  }

  private handleCacheEviction(key: string, entry: UEPCacheEntry): void {
    if (this.config.enableMetrics) {
      this.metrics.cacheEvictions.inc({ source: entry.source, reason: 'size_limit' });
    }

    this.emit('cacheEntryEvicted', { key, entry, timestamp: Date.now() });
  }

  // =============================================================================
  // Metrics Management
  // =============================================================================

  private initializeMetrics(): UEPCacheMetrics {
    const prefix = 'uep_validation_cache_';

    return {
      cacheOperationsTotal: new Counter({
        name: `${prefix}operations_total`,
        help: 'Total cache operations',
        labelNames: ['operation', 'source', 'result', 'cache_type']
      }),

      cacheHitRatio: new Gauge({
        name: `${prefix}hit_ratio`,
        help: 'Cache hit ratio'
      }),

      cacheMissRatio: new Gauge({
        name: `${prefix}miss_ratio`,
        help: 'Cache miss ratio'
      }),

      cacheSize: new Gauge({
        name: `${prefix}size_entries`,
        help: 'Number of entries in cache'
      }),

      cacheMemoryUsage: new Gauge({
        name: `${prefix}memory_usage_bytes`,
        help: 'Estimated memory usage in bytes'
      }),

      cacheEvictions: new Counter({
        name: `${prefix}evictions_total`,
        help: 'Total cache evictions',
        labelNames: ['source', 'reason']
      }),

      cacheInvalidations: new Counter({
        name: `${prefix}invalidations_total`,
        help: 'Total cache invalidations',
        labelNames: ['reason']
      }),

      distributedCacheLatency: new Histogram({
        name: `${prefix}distributed_latency_seconds`,
        help: 'Distributed cache operation latency',
        labelNames: ['source'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
      }),

      localCacheLatency: new Histogram({
        name: `${prefix}local_latency_seconds`,
        help: 'Local cache operation latency',
        labelNames: ['source'],
        buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1]
      }),

      cacheCompressionRatio: new Gauge({
        name: `${prefix}compression_ratio`,
        help: 'Cache compression ratio'
      }),

      validationMetricsTotal: new Counter({
        name: `${prefix}validations_total`,
        help: 'Total validations processed through cache',
        labelNames: ['source', 'result', 'cache_hit']
      }),

      validationLatency: new Histogram({
        name: `${prefix}validation_latency_seconds`,
        help: 'Validation latency including cache operations',
        labelNames: ['source', 'cache_hit'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
      }),

      validationErrorRate: new Gauge({
        name: `${prefix}validation_error_rate`,
        help: 'Rate of validation errors'
      }),

      validationThroughput: new Histogram({
        name: `${prefix}validation_throughput_per_second`,
        help: 'Validation throughput per second',
        labelNames: ['source'],
        buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
      })
    };
  }

  private updateCacheMetrics(): void {
    const localHits = this.cacheStats.get('local_hit') || 0;
    const distributedHits = this.cacheStats.get('distributed_hit') || 0;
    const misses = this.cacheStats.get('miss') || 0;
    const total = localHits + distributedHits + misses;

    if (total > 0) {
      this.metrics.cacheHitRatio.set((localHits + distributedHits) / total);
      this.metrics.cacheMissRatio.set(misses / total);
    }

    this.metrics.cacheSize.set(this.localCache.size);
    this.metrics.cacheMemoryUsage.set(this.estimateMemoryUsage());
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getCacheStats(): UEPCacheStats {
    const localHits = this.cacheStats.get('local_hit') || 0;
    const distributedHits = this.cacheStats.get('distributed_hit') || 0;
    const misses = this.cacheStats.get('miss') || 0;
    const total = localHits + distributedHits + misses;

    return {
      local: {
        size: this.localCache.size,
        maxSize: this.localCache.max || 0,
        hitRate: total > 0 ? localHits / total : 0,
        missRate: total > 0 ? misses / total : 0,
        evictions: this.cacheStats.get('evictions') || 0,
        memoryUsage: this.estimateMemoryUsage()
      },
      distributed: {
        connected: !!this.distributedCache,
        latency: this.getAveragePerformance('distributed_hit'),
        errors: this.cacheStats.get('distributed_errors') || 0,
        memory: 0, // Would need Redis INFO command
        keys: 0  // Would need Redis DBSIZE command
      },
      performance: {
        averageGetTime: this.getAveragePerformance('get'),
        averageSetTime: this.getAveragePerformance('set'),
        compressionRatio: 0.8, // Placeholder
        totalOperations: total
      }
    };
  }

  private getAveragePerformance(operation: string): number {
    const durations = this.performanceMetrics.get(operation) || [];
    if (durations.length === 0) return 0;
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  public clearCache(): void {
    this.localCache.clear();
    if (this.distributedCache) {
      this.distributedCache.flushdb().catch(error => {
        this.logger.error('Failed to clear distributed cache', { error: error.message });
      });
    }
    this.emit('cacheCleared', { timestamp: Date.now() });
  }

  public updateSchemaVersion(newVersion: string): void {
    const oldVersion = this.currentSchemaVersion;
    this.currentSchemaVersion = newVersion;
    
    // Invalidate entries with old schema version
    this.invalidateBySchemaVersion(oldVersion);
    
    this.emit('schemaVersionUpdated', { oldVersion, newVersion, timestamp: Date.now() });
  }

  public async shutdown(): Promise<void> {
    this.localCache.clear();
    
    if (this.distributedCache) {
      await this.distributedCache.quit();
    }
    
    this.removeAllListeners();
    this.emit('shutdown', { timestamp: Date.now() });
  }
}

export default UEPValidationCacheManager;