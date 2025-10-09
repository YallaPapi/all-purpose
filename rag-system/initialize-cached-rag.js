/**
 * RAG Caching System Initialization & Integration
 * 
 * Automatically sets up the complete RAG caching system with:
 * - Multi-layer caching (Redis + In-memory LRU)
 * - File-based cache invalidation with semantic matching
 * - Persistent cache warming across sessions
 * - Real-time observability and monitoring
 * - Production-ready performance and reliability
 */

const path = require('path');

class CachedRAGInitializer {
  constructor() {
    this.components = {};
    this.initializationLog = [];
    this.startTime = Date.now();
  }

  /**
   * Initialize the complete cached RAG system
   */
  async initializeSystem() {
    console.log('🚀 Initializing Complete RAG Caching System...\n');
    
    try {
      // Step 1: Initialize cache components
      await this.initializeCacheComponents();
      
      // Step 2: Setup cache invalidation
      await this.setupCacheInvalidation();
      
      // Step 3: Initialize cache warming
      await this.initializeCacheWarming();
      
      // Step 4: Create cached RAG pipeline
      await this.createCachedPipeline();
      
      // Step 5: Start background services
      await this.startBackgroundServices();
      
      // Step 6: Perform initial health check
      await this.performHealthCheck();
      
      // Step 7: Generate initialization report
      await this.generateInitializationReport();
      
      console.log('✅ RAG Caching System fully initialized and operational!\n');
      
      return this.components;
      
    } catch (error) {
      console.error('❌ Failed to initialize RAG caching system:', error.message);
      throw error;
    }
  }

  /**
   * Initialize cache components
   */
  async initializeCacheComponents() {
    console.log('📦 Initializing cache components...');
    
    try {
      // Import cache modules
      const { createCacheManager } = require('./src/cache/CacheManager');
      
      // Initialize cache manager with production configuration
      this.components.cacheManager = createCacheManager({
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
      });
      
      // Test cache manager
      const cacheHealth = await this.components.cacheManager.healthCheck();
      
      this.log('Cache Manager', cacheHealth.healthy ? 'success' : 'warning', 
        cacheHealth.healthy ? 
          `Redis: ${cacheHealth.redis ? 'connected' : 'disconnected'}, Memory: ${cacheHealth.memory ? 'ready' : 'error'}` :
          'Cache manager initialized with warnings'
      );
      
      console.log(`   ✅ Cache Manager: ${cacheHealth.healthy ? 'Fully operational' : 'Partial operation (memory-only)'}`);
      
    } catch (error) {
      this.log('Cache Manager', 'error', error.message);
      throw error;
    }
  }

  /**
   * Setup cache invalidation
   */
  async setupCacheInvalidation() {
    console.log('🔄 Setting up cache invalidation...');
    
    try {
      const { createCacheInvalidator } = require('./src/cache/CacheInvalidator');
      
      // Initialize cache invalidator
      this.components.cacheInvalidator = createCacheInvalidator(
        this.components.cacheManager,
        {
          watchPatterns: [
            '**/*.{ts,js,tsx,jsx}',
            '**/*.{md,txt,json}',
            '**/*.{yaml,yml}',
            '**/package.json',
            '**/tsconfig.json',
            '**/README*',
            '**/CLAUDE*'
          ],
          ignorePatterns: [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/.next/**',
            '**/logs/**',
            '**/.rag-cache/**'
          ],
          debounceMs: 1000,
          enableSemanticInvalidation: true,
          similarityThreshold: 0.7,
          maxInvalidationBatch: 100,
          persistInvalidationLog: true
        }
      );
      
      // Start file watching
      await this.components.cacheInvalidator.startWatching(process.cwd());
      
      this.log('Cache Invalidation', 'success', 'File watching active with semantic invalidation');
      console.log('   ✅ Cache Invalidation: File watching started');
      
    } catch (error) {
      this.log('Cache Invalidation', 'error', error.message);
      throw error;
    }
  }

  /**
   * Initialize cache warming
   */
  async initializeCacheWarming() {
    console.log('🔥 Initializing cache warming...');
    
    try {
      // Import required modules  
      const { createSemanticSearchAPI } = require('./src/api/searchAPI');
      const { createCacheWarmer } = require('./src/cache/CacheWarmer');
      
      // Create search API for warming
      const searchAPI = createSemanticSearchAPI();
      
      // Initialize cache warmer
      this.components.cacheWarmer = createCacheWarmer(
        this.components.cacheManager,
        searchAPI,
        {
          enabled: true,
          projectPath: process.cwd(),
          warmupManifestPath: path.join(process.cwd(), 'rag-system', '.rag-cache', 'warmup-manifest.json'),
          maxConcurrentQueries: 5,
          maxWarmupTimeMs: 5 * 60 * 1000, // 5 minutes
          persistWarmupState: true,
          backgroundWarming: true,
          commonQueries: [
            'all-purpose pattern methodology',
            'taskmaster usage guide',
            'meta-agent architecture', 
            'vercel deployment configuration',
            'project documentation overview',
            'api reference documentation',
            'development setup guide',
            'typescript configuration',
            'cache implementation',
            'observability system',
            'rag system usage',
            'context7 integration',
            'uep universal execution protocol'
          ],
          agentContexts: {
            'frontend': [
              'react components',
              'tailwind css styling', 
              'ui components',
              'accessibility guidelines',
              'performance optimization'
            ],
            'backend': [
              'api endpoints',
              'database schema',
              'authentication middleware',
              'error handling',
              'testing strategies'
            ],
            'devops': [
              'deployment configuration',
              'ci/cd pipelines',
              'docker containers',
              'monitoring setup',
              'infrastructure'
            ],
            'qa': [
              'test plans',
              'testing frameworks',
              'test automation',
              'quality assurance',
              'bug tracking'
            ],
            'documentation': [
              'markdown documentation',
              'api documentation', 
              'user guides',
              'technical specifications',
              'changelog'
            ]
          }
        }
      );
      
      this.log('Cache Warming', 'success', 'Warming system ready with persistent state');
      console.log('   ✅ Cache Warming: System configured with persistent state');
      
    } catch (error) {
      this.log('Cache Warming', 'error', error.message);
      throw error;
    }
  }

  /**
   * Create cached RAG pipeline
   */
  async createCachedPipeline() {
    console.log('🔗 Creating cached RAG pipeline...');
    
    try {
      const { createSemanticSearchAPI } = require('./src/api/searchAPI');
      const { createOpenAIEmbeddings } = require('./src/embeddings/openaiEmbeddings');
      const { createCachedRAGPipeline } = require('./src/cache/CachedRAGPipeline');
      
      // Create base components
      const searchAPI = createSemanticSearchAPI();
      const embeddings = createOpenAIEmbeddings();
      
      // Create cached pipeline
      this.components.cachedPipeline = await createCachedRAGPipeline(
        searchAPI,
        embeddings,
        {
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
            maxWarmupTimeMs: 5 * 60 * 1000
          },
          analytics: {
            enabled: true,
            trackDetailedMetrics: true
          }
        }
      );
      
      this.log('Cached RAG Pipeline', 'success', 'Full pipeline integration complete');
      console.log('   ✅ Cached RAG Pipeline: Fully integrated and operational');
      
    } catch (error) {
      this.log('Cached RAG Pipeline', 'error', error.message);
      throw error;
    }
  }

  /**
   * Start background services
   */
  async startBackgroundServices() {
    console.log('⚙️ Starting background services...');
    
    try {
      // Start background cache warming
      if (this.components.cacheWarmer) {
        console.log('   🔥 Starting background cache warming...');
        
        // Start warming with progress tracking
        this.components.cacheWarmer.onProgress((progress) => {
          if (progress.phase === 'completed') {
            console.log(`   ✅ Cache warming completed: ${progress.completed} items warmed`);
          } else if (progress.errors.length > 0) {
            console.log(`   ⚠️ Cache warming errors: ${progress.errors.length}`);
          }
        });
        
        // Start warming in background (don't wait)
        this.components.cacheWarmer.startWarmup({ priority: 'high' })
          .catch(error => {
            console.log(`   ⚠️ Background warming failed: ${error.message}`);
          });
      }
      
      this.log('Background Services', 'success', 'Cache warming started in background');
      console.log('   ✅ Background Services: Cache warming started');
      
    } catch (error) {
      this.log('Background Services', 'warning', error.message);
      // Don't throw - background services are optional
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    console.log('🏥 Performing system health check...');
    
    try {
      // Check cached pipeline health
      const pipelineHealth = await this.components.cachedPipeline.healthCheck();
      
      // Check cache stats
      const cacheStats = await this.components.cacheManager.getStats();
      
      // Check invalidation stats
      const invalidationStats = this.components.cacheInvalidator.getStats();
      
      const healthSummary = {
        overall: pipelineHealth.healthy,
        cache: pipelineHealth.components.cache,
        invalidation: pipelineHealth.components.invalidation,
        warming: pipelineHealth.components.warming,
        pipeline: pipelineHealth.components.pipeline,
        stats: {
          cacheHitRate: cacheStats.overall.overallHitRate,
          memoryUsage: `${(cacheStats.overall.totalMemoryBytes / 1024 / 1024).toFixed(1)}MB`,
          invalidationEvents: invalidationStats.totalEvents
        }
      };
      
      if (healthSummary.overall) {
        this.log('Health Check', 'success', `System healthy - ${(healthSummary.stats.cacheHitRate * 100).toFixed(1)}% hit rate, ${healthSummary.stats.memoryUsage} memory`);
        console.log(`   ✅ Health Check: System fully operational`);
        console.log(`      • Cache Hit Rate: ${(healthSummary.stats.cacheHitRate * 100).toFixed(1)}%`);
        console.log(`      • Memory Usage: ${healthSummary.stats.memoryUsage}`);
        console.log(`      • Invalidation Events: ${healthSummary.stats.invalidationEvents}`);
      } else {
        this.log('Health Check', 'warning', 'System operational with warnings');
        console.log(`   ⚠️ Health Check: System operational with warnings`);
      }
      
      this.components.healthSummary = healthSummary;
      
    } catch (error) {
      this.log('Health Check', 'error', error.message);
      console.log(`   ❌ Health Check: ${error.message}`);
    }
  }

  /**
   * Generate initialization report
   */
  async generateInitializationReport() {
    console.log('📊 Generating initialization report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      initializationTime: Date.now() - this.startTime,
      status: 'completed',
      components: {
        cacheManager: !!this.components.cacheManager,
        cacheInvalidator: !!this.components.cacheInvalidator,
        cacheWarmer: !!this.components.cacheWarmer,
        cachedPipeline: !!this.components.cachedPipeline
      },
      configuration: {
        redis: {
          enabled: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
          connected: this.components.healthSummary?.cache || false
        },
        memory: {
          embeddingCacheMB: 20,
          fileContentCacheMB: 25,
          queryPatternCacheMB: 5
        },
        invalidation: {
          fileWatchingEnabled: true,
          semanticInvalidation: true
        },
        warming: {
          backgroundWarming: true,
          persistentState: true
        }
      },
      initializationLog: this.initializationLog,
      healthSummary: this.components.healthSummary || null,
      nextSteps: [
        'Monitor cache performance via observability dashboard',
        'Set up alerts for cache hit rate and memory usage', 
        'Schedule regular cache maintenance',
        'Integrate with production RAG queries',
        'Monitor invalidation patterns and optimize'
      ]
    };
    
    // Save report
    const fs = require('fs').promises;
    const reportPath = path.join(process.cwd(), 'rag-system', '.rag-cache', 'initialization-report.json');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`   ✅ Report saved: ${reportPath}`);
    
    this.components.initializationReport = report;
  }

  /**
   * Log initialization step
   */
  log(component, status, message) {
    this.initializationLog.push({
      component,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get system components
   */
  getComponents() {
    return this.components;
  }

  /**
   * Shutdown system
   */
  async shutdown() {
    console.log('🛑 Shutting down RAG caching system...');
    
    try {
      if (this.components.cachedPipeline) {
        await this.components.cachedPipeline.shutdown();
      }
      
      console.log('   ✅ System shutdown complete');
    } catch (error) {
      console.error('   ❌ Error during shutdown:', error.message);
    }
  }
}

// Export for use as module
module.exports = { CachedRAGInitializer };

// Auto-initialize if run directly
if (require.main === module) {
  const initializer = new CachedRAGInitializer();
  
  initializer.initializeSystem()
    .then(() => {
      console.log('\n🎉 RAG Caching System is ready for production use!');
      console.log('\nTo use the cached RAG system in your application:');
      console.log('```javascript');
      console.log('const { CachedRAGInitializer } = require("./rag-system/initialize-cached-rag");');
      console.log('const initializer = new CachedRAGInitializer();');
      console.log('const components = await initializer.initializeSystem();');
      console.log('```\n');
    })
    .catch(error => {
      console.error('\n💥 Initialization failed:', error.message);
      process.exit(1);
    });
}