/**
 * Cached RAG Pipeline Integration
 * 
 * Task 48: Complete RAG pipeline integration with multi-layer caching
 * Intercepts search, embedding, and context operations with intelligent caching
 */

import { CacheManager, createCacheManager } from './CacheManager';
import { CacheInvalidator, createCacheInvalidator } from './CacheInvalidator';
import { CacheWarmer, createCacheWarmer } from './CacheWarmer';
import { SemanticSearchAPI, SearchQuery, SearchResponse } from '../api/searchAPI';
import { OpenAIEmbeddings } from '../embeddings/openaiEmbeddings';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';

export interface CachedRAGConfig {
  cache: {
    enabled: boolean;
    redis: {
      enabled: boolean;
      host: string;
      port: number;
      password?: string;
      db?: number;
    };
    memory: {
      embeddingCacheMB: number;
      fileContentCacheMB: number;
      queryPatternCacheMB: number;
    };
    fallbackStrategy: 'redis-first' | 'memory-first' | 'both';
  };
  invalidation: {
    enabled: boolean;
    watchPatterns: string[];
    debounceMs: number;
    enableSemanticInvalidation: boolean;
  };
  warming: {
    enabled: boolean;
    onStartup: boolean;
    backgroundWarming: boolean;
    maxWarmupTimeMs: number;
  };
  analytics: {
    enabled: boolean;
    trackDetailedMetrics: boolean;
  };
}

export interface CachedRAGStats {
  cache: any;
  invalidation: any;
  warming: any;
  pipeline: {
    totalSearches: number;
    cachedSearches: number;
    totalEmbeddings: number;
    cachedEmbeddings: number;
    averageSearchTime: number;
    averageEmbeddingTime: number;
    cacheHitRate: number;
    uptime: number;
  };
}

/**
 * Complete RAG pipeline with intelligent multi-layer caching
 */
export class CachedRAGPipeline {
  private config: CachedRAGConfig;
  private cacheManager!: CacheManager;
  private cacheInvalidator!: CacheInvalidator;
  private cacheWarmer!: CacheWarmer;
  private originalSearchAPI: SemanticSearchAPI;
  private originalEmbeddings: OpenAIEmbeddings;
  private isInitialized = false;
  private startTime = Date.now();

  // Pipeline statistics
  private stats = {
    totalSearches: 0,
    cachedSearches: 0,
    totalEmbeddings: 0,
    cachedEmbeddings: 0,
    searchTimes: [] as number[],
    embeddingTimes: [] as number[]
  };

  constructor(
    searchAPI: SemanticSearchAPI,
    embeddings: OpenAIEmbeddings,
    config: Partial<CachedRAGConfig> = {}
  ) {
    this.originalSearchAPI = searchAPI;
    this.originalEmbeddings = embeddings;

    this.config = {
      cache: {
        enabled: true,
        redis: {
          enabled: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
          host: process.env.UPSTASH_REDIS_REST_URL?.replace('https://', '').split('@')[1] || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.UPSTASH_REDIS_REST_TOKEN,
          db: 1
        },
        memory: {
          embeddingCacheMB: 20,
          fileContentCacheMB: 25,
          queryPatternCacheMB: 5
        },
        fallbackStrategy: 'redis-first'
      },
      invalidation: {
        enabled: true,
        watchPatterns: ['**/*.{ts,js,md,json,txt,py,yaml,yml}'],
        debounceMs: 1000,
        enableSemanticInvalidation: true
      },
      warming: {
        enabled: true,
        onStartup: true,
        backgroundWarming: true,
        maxWarmupTimeMs: 5 * 60 * 1000 // 5 minutes
      },
      analytics: {
        enabled: true,
        trackDetailedMetrics: true
      },
      ...config
    };

    logger.info('Cached RAG Pipeline initializing', {
      cacheEnabled: this.config.cache.enabled,
      invalidationEnabled: this.config.invalidation.enabled,
      warmingEnabled: this.config.warming.enabled
    });
  }

  /**
   * Initialize the cached RAG pipeline
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Cached RAG Pipeline components');

      // Initialize cache manager
      if (this.config.cache.enabled) {
        this.cacheManager = createCacheManager({
          redis: this.config.cache.redis,
          memory: {
            enabled: true,
            embeddingCacheMB: this.config.cache.memory.embeddingCacheMB,
            fileContentCacheMB: this.config.cache.memory.fileContentCacheMB,
            queryPatternCacheMB: this.config.cache.memory.queryPatternCacheMB
          },
          fallbackStrategy: this.config.cache.fallbackStrategy,
          enableMetrics: this.config.analytics.enabled
        });

        logger.info('Cache manager initialized');
      }

      // Initialize cache invalidator
      if (this.config.invalidation.enabled && this.cacheManager) {
        this.cacheInvalidator = createCacheInvalidator(this.cacheManager, {
          watchPatterns: this.config.invalidation.watchPatterns,
          debounceMs: this.config.invalidation.debounceMs,
          enableSemanticInvalidation: this.config.invalidation.enableSemanticInvalidation
        });

        // Start watching for file changes
        await this.cacheInvalidator.startWatching();
        logger.info('Cache invalidation system started');
      }

      // Initialize cache warmer
      if (this.config.warming.enabled && this.cacheManager) {
        this.cacheWarmer = createCacheWarmer(
          this.cacheManager,
          this.originalSearchAPI,
          {
            enabled: this.config.warming.enabled,
            backgroundWarming: this.config.warming.backgroundWarming,
            maxWarmupTimeMs: this.config.warming.maxWarmupTimeMs
          }
        );

        // Start background warming if enabled
        if (this.config.warming.onStartup) {
          logger.info('Starting background cache warming');
          this.cacheWarmer.startWarmup({ priority: 'high' })
            .catch(error => {
              logger.warn('Background cache warming failed', {
                error: error instanceof Error ? error.message : String(error)
              });
            });
        }

        logger.info('Cache warming system initialized');
      }

      // Patch the original APIs to use caching
      this.patchSearchAPI();
      this.patchEmbeddingAPI();

      this.isInitialized = true;
      logger.info('Cached RAG Pipeline fully initialized');

    } catch (error) {
      logger.error('Failed to initialize Cached RAG Pipeline', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Patch the search API to use caching
   */
  private patchSearchAPI(): void {
    if (!this.cacheManager) return;

    const originalSearch = this.originalSearchAPI.search.bind(this.originalSearchAPI);

    this.originalSearchAPI.search = async (searchQuery: SearchQuery): Promise<SearchResponse> => {
      const startTime = Date.now();
      this.stats.totalSearches++;

      try {
        // Generate cache key
        const cacheKey = this.generateSearchCacheKey(searchQuery);
        
        // Try to get from cache first
        const cached = await this.cacheManager.getCachedSearch(
          searchQuery.query,
          searchQuery.filters,
          searchQuery.options?.maxResults
        );

        if (cached) {
          // Cache hit
          this.stats.cachedSearches++;
          const responseTime = Date.now() - startTime;
          this.stats.searchTimes.push(responseTime);

          logger.debug('Search cache hit', {
            query: searchQuery.query.substring(0, 50),
            responseTime,
            resultCount: cached.results.length
          });

          // Update stats in cached response
          cached.stats.searchTime = responseTime;
          
          return cached;
        }

        // Cache miss - perform actual search
        const result = await originalSearch(searchQuery);
        const responseTime = Date.now() - startTime;
        this.stats.searchTimes.push(responseTime);

        // Cache the result asynchronously
        this.cacheManager.setCachedSearch(
          searchQuery.query,
          result,
          searchQuery.filters,
          searchQuery.options?.maxResults
        ).catch(error => {
          logger.warn('Failed to cache search result', {
            error: error instanceof Error ? error.message : String(error),
            query: searchQuery.query.substring(0, 50)
          });
        });

        logger.debug('Search cache miss', {
          query: searchQuery.query.substring(0, 50),
          responseTime,
          resultCount: result.results.length
        });

        return result;

      } catch (error) {
        logger.error('Error in cached search', {
          error: error instanceof Error ? error.message : String(error),
          query: searchQuery.query.substring(0, 50)
        });

        // Fallback to original search on error
        return originalSearch(searchQuery);
      }
    };
  }

  /**
   * Patch the embedding API to use caching
   */
  private patchEmbeddingAPI(): void {
    if (!this.cacheManager) return;

    const originalGenerateEmbedding = this.originalEmbeddings.generateEmbedding.bind(this.originalEmbeddings);
    const originalGenerateEmbeddings = this.originalEmbeddings.generateEmbeddings.bind(this.originalEmbeddings);

    // Patch single embedding generation
    this.originalEmbeddings.generateEmbedding = async (text: string) => {
      const startTime = Date.now();
      this.stats.totalEmbeddings++;

      try {
        // Check cache first
        const cached = this.cacheManager.getCachedEmbedding(text);
        
        if (cached) {
          // Cache hit
          this.stats.cachedEmbeddings++;
          const responseTime = Date.now() - startTime;
          this.stats.embeddingTimes.push(responseTime);

          logger.debug('Embedding cache hit', {
            textPreview: text.substring(0, 50),
            responseTime,
            embeddingLength: cached.length
          });

          return {
            text,
            embedding: cached,
            tokens: Math.ceil(text.length / 4),
            model: this.originalEmbeddings.getConfig().model
          };
        }

        // Cache miss - generate embedding
        const result = await originalGenerateEmbedding(text);
        const responseTime = Date.now() - startTime;
        this.stats.embeddingTimes.push(responseTime);

        // Cache the embedding asynchronously
        this.cacheManager.setCachedEmbedding(text, result.embedding);

        logger.debug('Embedding cache miss', {
          textPreview: text.substring(0, 50),
          responseTime,
          embeddingLength: result.embedding.length
        });

        return result;

      } catch (error) {
        logger.error('Error in cached embedding generation', {
          error: error instanceof Error ? error.message : String(error),
          textPreview: text.substring(0, 50)
        });

        // Fallback to original embedding generation
        return originalGenerateEmbedding(text);
      }
    };

    // Patch batch embedding generation
    this.originalEmbeddings.generateEmbeddings = async (texts: string[]) => {
      const startTime = Date.now();
      
      try {
        const results = [];
        const uncachedTexts = [];
        const uncachedIndices = [];

        // Check cache for each text
        for (let i = 0; i < texts.length; i++) {
          const text = texts[i];
          const cached = this.cacheManager.getCachedEmbedding(text);
          
          if (cached) {
            // Cache hit
            this.stats.cachedEmbeddings++;
            results[i] = {
              text,
              embedding: cached,
              tokens: Math.ceil(text.length / 4),
              model: this.originalEmbeddings.getConfig().model
            };
          } else {
            // Cache miss
            uncachedTexts.push(text);
            uncachedIndices.push(i);
          }
        }

        // Generate embeddings for uncached texts
        if (uncachedTexts.length > 0) {
          this.stats.totalEmbeddings += uncachedTexts.length;
          
          const batchResult = await originalGenerateEmbeddings(uncachedTexts);
          
          // Cache the new embeddings and fill results
          for (let i = 0; i < batchResult.results.length; i++) {
            const result = batchResult.results[i];
            const originalIndex = uncachedIndices[i];
            
            // Cache the embedding
            this.cacheManager.setCachedEmbedding(result.text, result.embedding);
            
            // Add to results
            results[originalIndex] = result;
          }

          const responseTime = Date.now() - startTime;
          this.stats.embeddingTimes.push(responseTime);

          logger.debug('Batch embedding generation', {
            totalTexts: texts.length,
            cachedTexts: texts.length - uncachedTexts.length,
            uncachedTexts: uncachedTexts.length,
            responseTime
          });

          return {
            results,
            totalTokens: batchResult.totalTokens,
            totalCost: batchResult.totalCost
          };
        } else {
          // All were cached
          const responseTime = Date.now() - startTime;
          this.stats.embeddingTimes.push(responseTime);

          logger.debug('All embeddings were cached', {
            totalTexts: texts.length,
            responseTime
          });

          return {
            results,
            totalTokens: results.reduce((sum, r) => sum + r.tokens, 0),
            totalCost: 0 // No cost for cached results
          };
        }

      } catch (error) {
        logger.error('Error in cached batch embedding generation', {
          error: error instanceof Error ? error.message : String(error),
          textCount: texts.length
        });

        // Fallback to original batch embedding generation
        return originalGenerateEmbeddings(texts);
      }
    };
  }

  /**
   * Generate cache key for search queries
   */
  private generateSearchCacheKey(searchQuery: SearchQuery): string {
    const keyData = {
      query: searchQuery.query.trim().toLowerCase(),
      filters: searchQuery.filters || {},
      options: searchQuery.options || {}
    };
    
    return createHash('sha256')
      .update(JSON.stringify(keyData, Object.keys(keyData).sort()))
      .digest('hex');
  }

  /**
   * Get comprehensive pipeline statistics
   */
  async getStats(): Promise<CachedRAGStats> {
    const uptime = Date.now() - this.startTime;
    
    const pipelineStats = {
      totalSearches: this.stats.totalSearches,
      cachedSearches: this.stats.cachedSearches,
      totalEmbeddings: this.stats.totalEmbeddings,
      cachedEmbeddings: this.stats.cachedEmbeddings,
      averageSearchTime: this.stats.searchTimes.length > 0 ? 
        this.stats.searchTimes.reduce((a, b) => a + b, 0) / this.stats.searchTimes.length : 0,
      averageEmbeddingTime: this.stats.embeddingTimes.length > 0 ?
        this.stats.embeddingTimes.reduce((a, b) => a + b, 0) / this.stats.embeddingTimes.length : 0,
      cacheHitRate: this.stats.totalSearches > 0 ? 
        this.stats.cachedSearches / this.stats.totalSearches : 0,
      uptime
    };

    return {
      cache: this.cacheManager ? await this.cacheManager.getStats() : null,
      invalidation: this.cacheInvalidator ? this.cacheInvalidator.getStats() : null,
      warming: this.cacheWarmer ? this.cacheWarmer.getStats() : null,
      pipeline: pipelineStats
    };
  }

  /**
   * Perform health check on all components
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: {
      cache: boolean;
      invalidation: boolean;
      warming: boolean;
      pipeline: boolean;
    };
    details: any;
  }> {
    const health = {
      healthy: true,
      components: {
        cache: true,
        invalidation: true,
        warming: true,
        pipeline: this.isInitialized
      },
      details: {} as any
    };

    try {
      // Check cache manager health
      if (this.cacheManager) {
        const cacheHealth = await this.cacheManager.healthCheck();
        health.components.cache = cacheHealth.healthy;
        health.details.cache = cacheHealth;
      }

      // Check invalidation system health
      if (this.cacheInvalidator) {
        const invalidationStats = this.cacheInvalidator.getStats();
        health.details.invalidation = invalidationStats;
      }

      // Check warming system health
      if (this.cacheWarmer) {
        const warmingStats = this.cacheWarmer.getStats();
        const isWarming = this.cacheWarmer.isWarmingUp();
        health.details.warming = { ...warmingStats, isWarming };
      }

      // Check pipeline health
      health.details.pipeline = {
        initialized: this.isInitialized,
        uptime: Date.now() - this.startTime,
        stats: {
          totalSearches: this.stats.totalSearches,
          totalEmbeddings: this.stats.totalEmbeddings,
          cacheHitRate: this.stats.totalSearches > 0 ? 
            this.stats.cachedSearches / this.stats.totalSearches : 0
        }
      };

      health.healthy = Object.values(health.components).every(Boolean);

    } catch (error) {
      health.healthy = false;
      health.details.error = error instanceof Error ? error.message : String(error);
    }

    return health;
  }

  /**
   * Manually trigger cache warming
   */
  async warmCache(options?: {
    priority?: 'high' | 'medium' | 'low' | 'all';
    skipCommonQueries?: boolean;
    skipAgentContexts?: boolean;
    skipFileIndexing?: boolean;
  }): Promise<void> {
    if (!this.cacheWarmer) {
      throw new Error('Cache warming is not enabled');
    }

    return this.cacheWarmer.startWarmup(options);
  }

  /**
   * Manually invalidate cache
   */
  async invalidateCache(options?: {
    pattern?: string;
    filePath?: string;
    clearAll?: boolean;
  }): Promise<void> {
    if (!this.cacheInvalidator || !this.cacheManager) {
      throw new Error('Cache invalidation is not enabled');
    }

    if (options?.clearAll) {
      await this.cacheInvalidator.clearAllCaches('Manual clear all via API');
    } else if (options?.pattern) {
      await this.cacheInvalidator.invalidateByPattern(options.pattern, 'Manual pattern invalidation via API');
    } else if (options?.filePath) {
      await this.cacheInvalidator.invalidateFile(options.filePath, 'Manual file invalidation via API');
    }
  }

  /**
   * Get cache warming progress
   */
  getWarmingProgress() {
    return this.cacheWarmer ? this.cacheWarmer.getProgress() : null;
  }

  /**
   * Shutdown the cached RAG pipeline
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Cached RAG Pipeline');

    try {
      // Stop cache invalidation
      if (this.cacheInvalidator) {
        await this.cacheInvalidator.stopWatching();
      }

      // Stop cache warming
      if (this.cacheWarmer && this.cacheWarmer.isWarmingUp()) {
        await this.cacheWarmer.stopWarmup();
      }

      // Close cache manager
      if (this.cacheManager) {
        await this.cacheManager.close();
      }

      this.isInitialized = false;
      logger.info('Cached RAG Pipeline shut down successfully');

    } catch (error) {
      logger.error('Error during Cached RAG Pipeline shutdown', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

/**
 * Create cached RAG pipeline with auto-initialization
 */
export async function createCachedRAGPipeline(
  searchAPI: SemanticSearchAPI,
  embeddings: OpenAIEmbeddings,
  config?: Partial<CachedRAGConfig>
): Promise<CachedRAGPipeline> {
  const pipeline = new CachedRAGPipeline(searchAPI, embeddings, config);
  await pipeline.initialize();
  return pipeline;
}