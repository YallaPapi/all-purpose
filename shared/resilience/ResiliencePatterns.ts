/**
 * Resilience Patterns Implementation
 * Comprehensive collection of resilience patterns for distributed systems
 * Including: Circuit Breaker, Bulkhead, Timeout, Retry, Fallback, Cache, Rate Limiter
 */

import { CircuitBreakerEngine, CircuitBreakerConfig, RetryConfig, BulkheadConfig, FallbackConfig } from './CircuitBreakerEngine';

export interface RateLimiterConfig {
  requestsPerWindow: number;        // Number of requests allowed per window
  windowSizeMs: number;            // Size of the time window in milliseconds
  burstSize: number;               // Maximum burst size
  enableDistributed: boolean;       // Enable distributed rate limiting
}

export interface CacheConfig {
  maxSize: number;                 // Maximum cache size
  ttlMs: number;                  // Time to live in milliseconds
  enableLRU: boolean;             // Enable LRU eviction
  enableCompression: boolean;      // Enable response compression
}

export interface HealthCheckConfig {
  intervalMs: number;             // Health check interval
  timeoutMs: number;              // Health check timeout
  failureThreshold: number;       // Failures before marking unhealthy
  successThreshold: number;       // Successes before marking healthy
}

export interface ResilienceConfig {
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
  bulkhead: BulkheadConfig;
  fallback: FallbackConfig;
  rateLimit: RateLimiterConfig;
  cache: CacheConfig;
  healthCheck: HealthCheckConfig;
}

/**
 * Comprehensive Resilience Pattern Engine
 */
export class ResilienceEngine {
  private circuitBreaker: CircuitBreakerEngine;
  private rateLimit: RateLimiter;
  private cache: ResilienceCache;
  private healthChecker: HealthChecker;

  constructor(
    private serviceName: string,
    private config: ResilienceConfig
  ) {
    this.circuitBreaker = new CircuitBreakerEngine(
      serviceName,
      config.circuitBreaker,
      config.retry,
      config.bulkhead,
      config.fallback
    );
    
    this.rateLimit = new RateLimiter(serviceName, config.rateLimit);
    this.cache = new ResilienceCache(serviceName, config.cache);
    this.healthChecker = new HealthChecker(serviceName, config.healthCheck);
  }

  /**
   * Execute operation with all resilience patterns
   */
  async execute<T>(
    operation: () => Promise<T>,
    cacheKey?: string,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    // Check rate limit
    if (!await this.rateLimit.isAllowed()) {
      throw new Error(`Rate limit exceeded for service: ${this.serviceName}`);
    }

    // Try cache first if key provided
    if (cacheKey) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check health status
    if (!await this.healthChecker.isHealthy()) {
      if (fallbackOperation) {
        return await fallbackOperation();
      }
      throw new Error(`Service ${this.serviceName} is unhealthy`);
    }

    // Execute with circuit breaker and other patterns
    const result = await this.circuitBreaker.execute(operation, fallbackOperation);

    // Cache successful result
    if (cacheKey) {
      await this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Get comprehensive resilience statistics
   */
  getStats(): ResilienceStats {
    return {
      serviceName: this.serviceName,
      circuitBreaker: this.circuitBreaker.getStats(),
      rateLimit: this.rateLimit.getStats(),
      cache: this.cache.getStats(),
      healthCheck: this.healthChecker.getStats()
    };
  }

  /**
   * Reset all resilience components
   */
  reset(): void {
    this.circuitBreaker.reset();
    this.rateLimit.reset();
    this.cache.clear();
    this.healthChecker.reset();
  }
}

/**
 * Token Bucket Rate Limiter
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private requestCounts: Map<number, number> = new Map();

  constructor(
    private serviceName: string,
    private config: RateLimiterConfig
  ) {
    this.tokens = config.burstSize;
    this.lastRefill = Date.now();
  }

  async isAllowed(): Promise<boolean> {
    this.refillTokens();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(
      (timePassed / this.config.windowSizeMs) * this.config.requestsPerWindow
    );

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.burstSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }

    // Clean up old request counts
    const windowStart = now - this.config.windowSizeMs;
    for (const [timestamp] of this.requestCounts) {
      if (timestamp < windowStart) {
        this.requestCounts.delete(timestamp);
      }
    }
  }

  getStats(): RateLimitStats {
    return {
      serviceName: this.serviceName,
      currentTokens: this.tokens,
      maxTokens: this.config.burstSize,
      requestsInWindow: Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0),
      windowSizeMs: this.config.windowSizeMs
    };
  }

  reset(): void {
    this.tokens = this.config.burstSize;
    this.lastRefill = Date.now();
    this.requestCounts.clear();
  }
}

/**
 * LRU Cache with TTL support
 */
export class ResilienceCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];

  constructor(
    private serviceName: string,
    private config: CacheConfig
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access order for LRU
    if (this.config.enableLRU) {
      this.updateAccessOrder(key);
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const expiresAt = Date.now() + this.config.ttlMs;
    
    // Compress value if enabled
    const compressedValue = this.config.enableCompression ? 
      this.compress(value) : value;

    this.cache.set(key, {
      value: compressedValue,
      expiresAt,
      createdAt: Date.now()
    });

    // Update access order
    this.updateAccessOrder(key);

    // Evict if over capacity
    if (this.cache.size > this.config.maxSize) {
      this.evictLRU();
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()!;
      this.cache.delete(oldestKey);
    }
  }

  private compress<T>(value: T): T {
    // Simple compression placeholder - in production use actual compression
    return value;
  }

  getStats(): CacheStats {
    let hitCount = 0;
    let missCount = 0;
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (Date.now() > entry.expiresAt) {
        expiredCount++;
      } else {
        hitCount++;
      }
    }

    return {
      serviceName: this.serviceName,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: hitCount / (hitCount + missCount) || 0,
      expiredEntries: expiredCount
    };
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

/**
 * Health Checker with exponential backoff
 */
export class HealthChecker {
  private isServiceHealthy: boolean = true;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  private lastCheckTime: number = 0;
  private checkInProgress: boolean = false;

  constructor(
    private serviceName: string,
    private config: HealthCheckConfig
  ) {
    this.startHealthChecks();
  }

  async isHealthy(): Promise<boolean> {
    return this.isServiceHealthy;
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      if (!this.checkInProgress) {
        await this.performHealthCheck();
      }
    }, this.config.intervalMs);
  }

  private async performHealthCheck(): Promise<void> {
    this.checkInProgress = true;
    this.lastCheckTime = Date.now();

    try {
      // Health check implementation would go here
      // For now, simulate with random success/failure
      const isHealthy = await this.executeHealthCheck();
      
      if (isHealthy) {
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;
        
        if (!this.isServiceHealthy && this.consecutiveSuccesses >= this.config.successThreshold) {
          this.isServiceHealthy = true;
          console.log(`Service ${this.serviceName} marked as healthy`);
        }
      } else {
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
        
        if (this.isServiceHealthy && this.consecutiveFailures >= this.config.failureThreshold) {
          this.isServiceHealthy = false;
          console.log(`Service ${this.serviceName} marked as unhealthy`);
        }
      }
    } catch (error) {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
      console.error(`Health check failed for ${this.serviceName}:`, error);
    } finally {
      this.checkInProgress = false;
    }
  }

  private async executeHealthCheck(): Promise<boolean> {
    // Mock health check - replace with actual implementation
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(Math.random() > 0.1); // 90% success rate
      }, 100);
    });
  }

  getStats(): HealthCheckStats {
    return {
      serviceName: this.serviceName,
      isHealthy: this.isServiceHealthy,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastCheckTime: new Date(this.lastCheckTime)
    };
  }

  reset(): void {
    this.isServiceHealthy = true;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastCheckTime = 0;
  }
}

/**
 * Resilience Pattern Factory
 */
export class ResilienceFactory {
  private static instance: ResilienceFactory;
  private resilienceEngines: Map<string, ResilienceEngine> = new Map();

  static getInstance(): ResilienceFactory {
    if (!ResilienceFactory.instance) {
      ResilienceFactory.instance = new ResilienceFactory();
    }
    return ResilienceFactory.instance;
  }

  createResilienceEngine(serviceName: string, config?: Partial<ResilienceConfig>): ResilienceEngine {
    const defaultConfig: ResilienceConfig = {
      circuitBreaker: {
        failureThreshold: 5,
        timeoutMs: 5000,
        resetTimeoutMs: 30000,
        halfOpenMaxCalls: 3,
        rollingWindowMs: 60000,
        minimumThroughput: 10,
        errorThresholdPercentage: 50
      },
      retry: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterMs: 500
      },
      bulkhead: {
        maxConcurrentCalls: 10,
        maxQueueSize: 20,
        timeoutMs: 30000
      },
      fallback: {
        enableFallback: true,
        fallbackTimeoutMs: 2000,
        fallbackStrategy: 'default'
      },
      rateLimit: {
        requestsPerWindow: 100,
        windowSizeMs: 60000,
        burstSize: 20,
        enableDistributed: false
      },
      cache: {
        maxSize: 1000,
        ttlMs: 300000, // 5 minutes
        enableLRU: true,
        enableCompression: false
      },
      healthCheck: {
        intervalMs: 30000,
        timeoutMs: 5000,
        failureThreshold: 3,
        successThreshold: 2
      }
    };

    const mergedConfig = this.mergeConfigs(defaultConfig, config || {});
    const engine = new ResilienceEngine(serviceName, mergedConfig);
    
    this.resilienceEngines.set(serviceName, engine);
    return engine;
  }

  getResilienceEngine(serviceName: string): ResilienceEngine | undefined {
    return this.resilienceEngines.get(serviceName);
  }

  getAllStats(): Record<string, ResilienceStats> {
    const stats: Record<string, ResilienceStats> = {};
    for (const [serviceName, engine] of this.resilienceEngines) {
      stats[serviceName] = engine.getStats();
    }
    return stats;
  }

  private mergeConfigs(defaultConfig: ResilienceConfig, userConfig: Partial<ResilienceConfig>): ResilienceConfig {
    return {
      circuitBreaker: { ...defaultConfig.circuitBreaker, ...userConfig.circuitBreaker },
      retry: { ...defaultConfig.retry, ...userConfig.retry },
      bulkhead: { ...defaultConfig.bulkhead, ...userConfig.bulkhead },
      fallback: { ...defaultConfig.fallback, ...userConfig.fallback },
      rateLimit: { ...defaultConfig.rateLimit, ...userConfig.rateLimit },
      cache: { ...defaultConfig.cache, ...userConfig.cache },
      healthCheck: { ...defaultConfig.healthCheck, ...userConfig.healthCheck }
    };
  }
}

// Type definitions for statistics
export interface ResilienceStats {
  serviceName: string;
  circuitBreaker: any;
  rateLimit: RateLimitStats;
  cache: CacheStats;
  healthCheck: HealthCheckStats;
}

export interface RateLimitStats {
  serviceName: string;
  currentTokens: number;
  maxTokens: number;
  requestsInWindow: number;
  windowSizeMs: number;
}

export interface CacheStats {
  serviceName: string;
  size: number;
  maxSize: number;
  hitRate: number;
  expiredEntries: number;
}

export interface HealthCheckStats {
  serviceName: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastCheckTime: Date;
}

interface CacheEntry {
  value: any;
  expiresAt: number;
  createdAt: number;
}

export default ResilienceEngine;