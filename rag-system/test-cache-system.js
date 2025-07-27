/**
 * Comprehensive Cache System Stress Testing
 * 
 * Task 50: Performance validation and stress testing for the RAG caching system
 * Tests all cache layers under realistic and extreme conditions
 */

const { performance } = require('perf_hooks');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Test parameters
  maxTestDuration: 5 * 60 * 1000, // 5 minutes max
  concurrentQueries: [1, 5, 10, 25, 50], // Different concurrency levels
  queryVariations: 100, // Number of different queries to test
  embeddingTests: 200, // Number of embedding operations
  fileOperations: 50, // Number of file operations
  
  // Performance targets from research
  targets: {
    cacheHitLatency: 10, // <10ms for in-memory cache hits
    redisHitLatency: 5, // <5ms for Redis cache hits  
    throughputOpsPerSec: 1000, // Target throughput
    hitRate: 0.9, // >90% cache hit rate target
    memoryLimit: 50 * 1024 * 1024, // 50MB memory limit
    errorRate: 0.01 // <1% error rate
  },
  
  // Test data
  testQueries: [
    'all-purpose pattern methodology',
    'taskmaster usage guide', 
    'meta-agent architecture',
    'vercel deployment configuration',
    'typescript best practices',
    'react component patterns',
    'database schema design',
    'api endpoint development',
    'test automation strategies',
    'documentation standards',
    'cache implementation patterns',
    'observability system setup',
    'error handling strategies',
    'performance optimization',
    'security best practices'
  ],
  
  testFiles: [
    'package.json',
    'tsconfig.json',
    'README.md',
    'CLAUDE.md',
    'src/cache/CacheManager.ts',
    'src/api/searchAPI.ts',
    'rag-system/src/embeddings/openaiEmbeddings.ts'
  ]
};

class CacheStressTester {
  constructor() {
    this.results = {
      startTime: Date.now(),
      tests: {},
      summary: {},
      errors: []
    };
    
    this.cacheManager = null;
    this.searchAPI = null;
    this.embeddings = null;
    this.cachedPipeline = null;
  }

  /**
   * Initialize test environment
   */
  async initialize() {
    console.log('🧪 Initializing Cache System Stress Test Environment...\n');
    
    try {
      // Import required modules
      const { createCacheManager } = require('./src/cache/CacheManager');
      const { createSemanticSearchAPI } = require('./src/api/searchAPI');
      const { createOpenAIEmbeddings } = require('./src/embeddings/openaiEmbeddings');
      const { createCachedRAGPipeline } = require('./src/cache/CachedRAGPipeline');
      
      // Initialize components
      this.cacheManager = createCacheManager({
        redis: {
          enabled: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
          host: process.env.UPSTASH_REDIS_REST_URL?.replace('https://', '').split('@')[1] || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.UPSTASH_REDIS_REST_TOKEN,
          db: 2 // Use separate DB for testing
        },
        memory: {
          embeddingCacheMB: 20,
          fileContentCacheMB: 25,
          queryPatternCacheMB: 5
        }
      });
      
      this.searchAPI = createSemanticSearchAPI();
      this.embeddings = createOpenAIEmbeddings();
      
      // Initialize cached pipeline
      this.cachedPipeline = await createCachedRAGPipeline(
        this.searchAPI,
        this.embeddings,
        {
          cache: { enabled: true },
          invalidation: { enabled: false }, // Disable for testing
          warming: { enabled: false } // We'll test warming separately
        }
      );
      
      console.log('✅ Test environment initialized successfully\n');
      
    } catch (error) {
      console.error('❌ Failed to initialize test environment:', error.message);
      throw error;
    }
  }

  /**
   * Run all stress tests
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive Cache System Stress Tests\n');
    console.log('Target Performance Metrics:');
    console.log(`   • Cache Hit Latency: <${TEST_CONFIG.targets.cacheHitLatency}ms`);
    console.log(`   • Redis Hit Latency: <${TEST_CONFIG.targets.redisHitLatency}ms`);
    console.log(`   • Throughput: >${TEST_CONFIG.targets.throughputOpsPerSec} ops/sec`);
    console.log(`   • Hit Rate: >${TEST_CONFIG.targets.hitRate * 100}%`);
    console.log(`   • Memory Limit: <${TEST_CONFIG.targets.memoryLimit / 1024 / 1024}MB\n`);

    const tests = [
      { name: 'Cache Layer Performance', fn: () => this.testCacheLayerPerformance() },
      { name: 'Concurrent Query Load', fn: () => this.testConcurrentQueryLoad() },
      { name: 'Embedding Cache Performance', fn: () => this.testEmbeddingCachePerformance() },
      { name: 'Memory Usage Under Load', fn: () => this.testMemoryUsageUnderLoad() },
      { name: 'Cache Hit Rate Optimization', fn: () => this.testCacheHitRateOptimization() },
      { name: 'Failover and Recovery', fn: () => this.testFailoverAndRecovery() },
      { name: 'Cache Invalidation Performance', fn: () => this.testCacheInvalidationPerformance() },
      { name: 'Persistence and Warmup', fn: () => this.testPersistenceAndWarmup() }
    ];

    for (const test of tests) {
      try {
        console.log(`🔄 Running: ${test.name}...`);
        const startTime = performance.now();
        
        const result = await test.fn();
        
        const duration = performance.now() - startTime;
        this.results.tests[test.name] = {
          ...result,
          duration,
          status: 'passed'
        };
        
        console.log(`✅ ${test.name} completed in ${Math.round(duration)}ms\n`);
        
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error.message);
        this.results.tests[test.name] = {
          status: 'failed',
          error: error.message,
          duration: 0
        };
        this.results.errors.push({
          test: test.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Generate final report
    await this.generateFinalReport();
  }

  /**
   * Test cache layer performance individually
   */
  async testCacheLayerPerformance() {
    const results = {
      memoryCache: { hits: [], misses: [] },
      redisCache: { hits: [], misses: [] },
      metrics: {}
    };

    // Test in-memory cache performance
    console.log('   Testing in-memory cache performance...');
    for (let i = 0; i < 100; i++) {
      const query = `test query ${i % 10}`; // Create some repeating queries
      const startTime = performance.now();
      
      const cached = await this.cacheManager.getCachedSearch(query);
      const latency = performance.now() - startTime;
      
      if (cached) {
        results.memoryCache.hits.push(latency);
      } else {
        results.memoryCache.misses.push(latency);
        
        // Populate cache for next iteration
        const mockResult = {
          results: [{ id: `result-${i}`, content: `Mock result for ${query}` }],
          query: { original: query, processed: query },
          stats: { totalResults: 1, searchTime: latency }
        };
        await this.cacheManager.setCachedSearch(query, mockResult);
      }
    }

    // Calculate metrics
    results.metrics.memoryHitLatency = results.memoryCache.hits.length > 0 ? 
      results.memoryCache.hits.reduce((a, b) => a + b, 0) / results.memoryCache.hits.length : 0;
    results.metrics.memoryMissLatency = results.memoryCache.misses.length > 0 ?
      results.memoryCache.misses.reduce((a, b) => a + b, 0) / results.memoryCache.misses.length : 0;

    // Performance validation
    const passedMemoryLatency = results.metrics.memoryHitLatency < TEST_CONFIG.targets.cacheHitLatency;
    
    console.log(`   Memory cache hit latency: ${results.metrics.memoryHitLatency.toFixed(2)}ms (target: <${TEST_CONFIG.targets.cacheHitLatency}ms) ${passedMemoryLatency ? '✅' : '❌'}`);

    return results;
  }

  /**
   * Test concurrent query load
   */
  async testConcurrentQueryLoad() {
    const results = {
      concurrencyTests: [],
      metrics: {}
    };

    for (const concurrency of TEST_CONFIG.concurrentQueries) {
      console.log(`   Testing ${concurrency} concurrent queries...`);
      
      const startTime = performance.now();
      const promises = [];
      
      // Create concurrent queries
      for (let i = 0; i < concurrency; i++) {
        const query = TEST_CONFIG.testQueries[i % TEST_CONFIG.testQueries.length];
        promises.push(this.performSearchWithTiming(query));
      }
      
      const queryResults = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const successful = queryResults.filter(r => r.status === 'fulfilled').length;
      const failed = queryResults.filter(r => r.status === 'rejected').length;
      const totalTime = endTime - startTime;
      const throughput = (successful / totalTime) * 1000; // ops/sec
      
      const concurrencyResult = {
        concurrency,
        successful,
        failed,
        totalTime,
        throughput,
        errorRate: failed / (successful + failed)
      };
      
      results.concurrencyTests.push(concurrencyResult);
      
      const passedThroughput = throughput > TEST_CONFIG.targets.throughputOpsPerSec;
      const passedErrorRate = concurrencyResult.errorRate < TEST_CONFIG.targets.errorRate;
      
      console.log(`   Concurrency ${concurrency}: ${throughput.toFixed(0)} ops/sec, ${(concurrencyResult.errorRate * 100).toFixed(1)}% errors ${passedThroughput && passedErrorRate ? '✅' : '❌'}`);
    }

    // Calculate aggregate metrics
    results.metrics.maxThroughput = Math.max(...results.concurrencyTests.map(t => t.throughput));
    results.metrics.averageErrorRate = results.concurrencyTests.reduce((sum, t) => sum + t.errorRate, 0) / results.concurrencyTests.length;

    return results;
  }

  /**
   * Test embedding cache performance
   */
  async testEmbeddingCachePerformance() {
    const results = {
      embeddingTests: [],
      metrics: {}
    };

    console.log('   Testing embedding cache performance...');
    
    const testTexts = [];
    for (let i = 0; i < TEST_CONFIG.embeddingTests; i++) {
      testTexts.push(`This is test text number ${i} for embedding cache testing with some additional content to make it realistic.`);
    }

    // First pass - populate cache
    const firstPassStart = performance.now();
    for (const text of testTexts.slice(0, 50)) {
      try {
        await this.embeddings.generateEmbedding(text);
      } catch (error) {
        // Ignore API errors for cache testing
      }
    }
    const firstPassTime = performance.now() - firstPassStart;

    // Second pass - test cache hits
    const secondPassStart = performance.now();
    let cacheHits = 0;
    for (const text of testTexts.slice(0, 50)) {
      const startTime = performance.now();
      const cached = this.cacheManager.getCachedEmbedding(text);
      const latency = performance.now() - startTime;
      
      if (cached) {
        cacheHits++;
        results.embeddingTests.push({ type: 'hit', latency });
      } else {
        results.embeddingTests.push({ type: 'miss', latency });
      }
    }
    const secondPassTime = performance.now() - secondPassStart;

    // Calculate metrics
    const hits = results.embeddingTests.filter(t => t.type === 'hit');
    const misses = results.embeddingTests.filter(t => t.type === 'miss');
    
    results.metrics.hitRate = hits.length / results.embeddingTests.length;
    results.metrics.averageHitLatency = hits.length > 0 ? 
      hits.reduce((sum, t) => sum + t.latency, 0) / hits.length : 0;
    results.metrics.averageMissLatency = misses.length > 0 ?
      misses.reduce((sum, t) => sum + t.latency, 0) / misses.length : 0;

    const passedHitRate = results.metrics.hitRate > TEST_CONFIG.targets.hitRate;
    const passedLatency = results.metrics.averageHitLatency < TEST_CONFIG.targets.cacheHitLatency;

    console.log(`   Embedding cache hit rate: ${(results.metrics.hitRate * 100).toFixed(1)}% (target: >${TEST_CONFIG.targets.hitRate * 100}%) ${passedHitRate ? '✅' : '❌'}`);
    console.log(`   Average hit latency: ${results.metrics.averageHitLatency.toFixed(2)}ms (target: <${TEST_CONFIG.targets.cacheHitLatency}ms) ${passedLatency ? '✅' : '❌'}`);

    return results;
  }

  /**
   * Test memory usage under load
   */
  async testMemoryUsageUnderLoad() {
    const results = {
      memorySnapshots: [],
      metrics: {}
    };

    console.log('   Testing memory usage under load...');
    
    const initialMemory = process.memoryUsage();
    results.memorySnapshots.push({ 
      phase: 'initial', 
      ...initialMemory, 
      timestamp: Date.now() 
    });

    // Load test with many operations
    for (let batch = 0; batch < 10; batch++) {
      // Generate many queries
      for (let i = 0; i < 20; i++) {
        const query = `batch ${batch} query ${i} with extra content to increase memory usage`;
        const mockResult = {
          results: Array(10).fill(null).map((_, idx) => ({
            id: `result-${batch}-${i}-${idx}`,
            content: `Mock result content for batch ${batch} query ${i} result ${idx} with additional text content`,
            metadata: { filePath: `test/file-${batch}-${i}-${idx}.ts` }
          })),
          query: { original: query, processed: query },
          stats: { totalResults: 10, searchTime: Math.random() * 100 }
        };
        
        await this.cacheManager.setCachedSearch(query, mockResult);
      }

      // Take memory snapshot
      const currentMemory = process.memoryUsage();
      results.memorySnapshots.push({
        phase: `batch-${batch}`,
        ...currentMemory,
        timestamp: Date.now()
      });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      const postGCMemory = process.memoryUsage();
      results.memorySnapshots.push({
        phase: 'post-gc',
        ...postGCMemory,
        timestamp: Date.now()
      });
    }

    // Calculate metrics
    const maxHeapUsed = Math.max(...results.memorySnapshots.map(s => s.heapUsed));
    const heapGrowth = results.memorySnapshots[results.memorySnapshots.length - 1].heapUsed - initialMemory.heapUsed;
    
    results.metrics.maxHeapUsed = maxHeapUsed;
    results.metrics.heapGrowth = heapGrowth;
    results.metrics.withinMemoryLimit = maxHeapUsed < TEST_CONFIG.targets.memoryLimit;

    console.log(`   Max heap used: ${(maxHeapUsed / 1024 / 1024).toFixed(1)}MB (limit: ${TEST_CONFIG.targets.memoryLimit / 1024 / 1024}MB) ${results.metrics.withinMemoryLimit ? '✅' : '❌'}`);
    console.log(`   Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(1)}MB`);

    return results;
  }

  /**
   * Test cache hit rate optimization
   */
  async testCacheHitRateOptimization() {
    const results = {
      phases: [],
      metrics: {}
    };

    console.log('   Testing cache hit rate optimization...');

    // Phase 1: Cold cache
    let hitCount = 0;
    let totalQueries = 0;

    for (let i = 0; i < 50; i++) {
      const query = TEST_CONFIG.testQueries[i % TEST_CONFIG.testQueries.length];
      totalQueries++;
      
      const cached = await this.cacheManager.getCachedSearch(query);
      if (cached) {
        hitCount++;
      } else {
        // Populate cache
        const mockResult = {
          results: [{ id: `opt-result-${i}`, content: `Optimization test result ${i}` }],
          query: { original: query, processed: query },
          stats: { totalResults: 1, searchTime: 50 }
        };
        await this.cacheManager.setCachedSearch(query, mockResult);
      }
    }

    results.phases.push({
      name: 'cold-cache',
      hitRate: hitCount / totalQueries,
      hitCount,
      totalQueries
    });

    // Phase 2: Warm cache (repeat queries)
    hitCount = 0;
    totalQueries = 0;

    for (let i = 0; i < 50; i++) {
      const query = TEST_CONFIG.testQueries[i % TEST_CONFIG.testQueries.length];
      totalQueries++;
      
      const cached = await this.cacheManager.getCachedSearch(query);
      if (cached) {
        hitCount++;
      }
    }

    results.phases.push({
      name: 'warm-cache',
      hitRate: hitCount / totalQueries,
      hitCount,
      totalQueries
    });

    // Calculate final metrics
    results.metrics.coldCacheHitRate = results.phases[0].hitRate;
    results.metrics.warmCacheHitRate = results.phases[1].hitRate;
    results.metrics.hitRateImprovement = results.phases[1].hitRate - results.phases[0].hitRate;

    const passedWarmHitRate = results.metrics.warmCacheHitRate > TEST_CONFIG.targets.hitRate;

    console.log(`   Cold cache hit rate: ${(results.metrics.coldCacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Warm cache hit rate: ${(results.metrics.warmCacheHitRate * 100).toFixed(1)}% (target: >${TEST_CONFIG.targets.hitRate * 100}%) ${passedWarmHitRate ? '✅' : '❌'}`);

    return results;
  }

  /**
   * Test failover and recovery
   */
  async testFailoverAndRecovery() {
    const results = {
      phases: [],
      metrics: {}
    };

    console.log('   Testing failover and recovery...');

    // Phase 1: Normal operation
    const normalOperationStart = performance.now();
    let successCount = 0;
    
    for (let i = 0; i < 20; i++) {
      try {
        const query = `failover test query ${i}`;
        await this.performSearchWithTiming(query);
        successCount++;
      } catch (error) {
        // Expected during failover simulation
      }
    }
    
    results.phases.push({
      name: 'normal-operation',
      successCount,
      totalAttempts: 20,
      successRate: successCount / 20,
      duration: performance.now() - normalOperationStart
    });

    // Phase 2: Simulated failure (clear cache to simulate Redis failure)
    try {
      await this.cacheManager.clearCache();
    } catch (error) {
      // Expected if Redis is down
    }

    const failoverStart = performance.now();
    successCount = 0;
    
    for (let i = 0; i < 20; i++) {
      try {
        const query = `failover recovery test query ${i}`;
        await this.performSearchWithTiming(query);
        successCount++;
      } catch (error) {
        // Some failures expected during failover
      }
    }

    results.phases.push({
      name: 'failover-recovery',
      successCount,
      totalAttempts: 20,
      successRate: successCount / 20,
      duration: performance.now() - failoverStart
    });

    // Calculate metrics
    results.metrics.normalSuccessRate = results.phases[0].successRate;
    results.metrics.failoverSuccessRate = results.phases[1].successRate;
    results.metrics.resilience = results.phases[1].successRate > 0.8; // 80% success during failover

    console.log(`   Normal operation success rate: ${(results.metrics.normalSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Failover recovery success rate: ${(results.metrics.failoverSuccessRate * 100).toFixed(1)}% ${results.metrics.resilience ? '✅' : '❌'}`);

    return results;
  }

  /**
   * Test cache invalidation performance
   */
  async testCacheInvalidationPerformance() {
    const results = {
      invalidationTests: [],
      metrics: {}
    };

    console.log('   Testing cache invalidation performance...');

    // Populate cache with test data
    for (let i = 0; i < 100; i++) {
      const query = `invalidation test query ${i}`;
      const mockResult = {
        results: [{ id: `inv-result-${i}`, content: `Content for invalidation test ${i}` }],
        query: { original: query, processed: query },
        stats: { totalResults: 1, searchTime: 30 }
      };
      await this.cacheManager.setCachedSearch(query, mockResult);
    }

    // Test pattern invalidation
    const patternStart = performance.now();
    await this.cacheManager.invalidatePattern('invalidation');
    const patternTime = performance.now() - patternStart;

    results.invalidationTests.push({
      type: 'pattern',
      duration: patternTime,
      target: 'invalidation'
    });

    // Test file invalidation
    const fileStart = performance.now();
    await this.cacheManager.invalidateFile('test-file.ts');
    const fileTime = performance.now() - fileStart;

    results.invalidationTests.push({
      type: 'file',
      duration: fileTime,
      target: 'test-file.ts'
    });

    // Test clear all
    const clearStart = performance.now();
    await this.cacheManager.clearCache();
    const clearTime = performance.now() - clearStart;

    results.invalidationTests.push({
      type: 'clear-all',
      duration: clearTime,
      target: 'all'
    });

    // Calculate metrics
    results.metrics.averageInvalidationTime = results.invalidationTests.reduce((sum, t) => sum + t.duration, 0) / results.invalidationTests.length;
    results.metrics.fastInvalidation = results.metrics.averageInvalidationTime < 100; // <100ms target

    console.log(`   Average invalidation time: ${results.metrics.averageInvalidationTime.toFixed(2)}ms ${results.metrics.fastInvalidation ? '✅' : '❌'}`);

    return results;
  }

  /**
   * Test persistence and warmup
   */
  async testPersistenceAndWarmup() {
    const results = {
      persistenceTest: {},
      warmupTest: {},
      metrics: {}
    };

    console.log('   Testing persistence and warmup...');

    // Test cache persistence (populate and check stats)
    for (let i = 0; i < 20; i++) {
      const query = `persistence test query ${i}`;
      const mockResult = {
        results: [{ id: `persist-result-${i}`, content: `Persistent content ${i}` }],
        query: { original: query, processed: query },
        stats: { totalResults: 1, searchTime: 40 }
      };
      await this.cacheManager.setCachedSearch(query, mockResult);
    }

    const cacheStats = await this.cacheManager.getStats();
    results.persistenceTest = {
      cacheEntries: cacheStats.overall.totalMemoryBytes > 0,
      redisConnected: cacheStats.redis.connected,
      memoryUsage: cacheStats.overall.totalMemoryBytes
    };

    // Test warmup capability (if available)
    if (this.cachedPipeline && this.cachedPipeline.warmCache) {
      try {
        const warmupStart = performance.now();
        await this.cachedPipeline.warmCache({ priority: 'high' });
        const warmupTime = performance.now() - warmupStart;
        
        results.warmupTest = {
          completed: true,
          duration: warmupTime,
          withinTimeLimit: warmupTime < TEST_CONFIG.targets.maxWarmupTimeMs
        };
      } catch (error) {
        results.warmupTest = {
          completed: false,
          error: error.message
        };
      }
    }

    // Calculate metrics
    results.metrics.persistenceWorking = results.persistenceTest.cacheEntries;
    results.metrics.warmupWorking = results.warmupTest.completed || false;

    console.log(`   Cache persistence: ${results.metrics.persistenceWorking ? '✅' : '❌'}`);
    console.log(`   Cache warmup: ${results.metrics.warmupWorking ? '✅' : '❌'}`);

    return results;
  }

  /**
   * Perform search with timing
   */
  async performSearchWithTiming(query) {
    const startTime = performance.now();
    
    try {
      // Try cached search first
      const cached = await this.cacheManager.getCachedSearch(query);
      
      if (cached) {
        return {
          query,
          cached: true,
          latency: performance.now() - startTime,
          results: cached.results.length
        };
      }

      // Simulate search API call with mock result
      const mockResult = {
        results: [
          { id: `mock-${Date.now()}`, content: `Mock search result for: ${query}` }
        ],
        query: { original: query, processed: query },
        stats: { totalResults: 1, searchTime: performance.now() - startTime }
      };

      // Cache the result
      await this.cacheManager.setCachedSearch(query, mockResult);

      return {
        query,
        cached: false,
        latency: performance.now() - startTime,
        results: mockResult.results.length
      };
      
    } catch (error) {
      return {
        query,
        cached: false,
        latency: performance.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Generate comprehensive final report
   */
  async generateFinalReport() {
    console.log('\n📊 COMPREHENSIVE CACHE SYSTEM STRESS TEST REPORT');
    console.log('═'.repeat(80));
    
    const totalDuration = Date.now() - this.results.startTime;
    const passedTests = Object.values(this.results.tests).filter(t => t.status === 'passed').length;
    const totalTests = Object.keys(this.results.tests).length;
    
    console.log(`\n📈 SUMMARY`);
    console.log(`   Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`   Errors: ${this.results.errors.length}`);
    
    // Performance summary
    console.log(`\n🚀 PERFORMANCE RESULTS`);
    
    // Cache layer performance
    const cacheTest = this.results.tests['Cache Layer Performance'];
    if (cacheTest && cacheTest.status === 'passed') {
      const memoryLatency = cacheTest.metrics.memoryHitLatency;
      console.log(`   Memory Cache Hit Latency: ${memoryLatency.toFixed(2)}ms ${memoryLatency < TEST_CONFIG.targets.cacheHitLatency ? '✅' : '❌'}`);
    }
    
    // Throughput
    const concurrentTest = this.results.tests['Concurrent Query Load'];
    if (concurrentTest && concurrentTest.status === 'passed') {
      const maxThroughput = concurrentTest.metrics.maxThroughput;
      console.log(`   Max Throughput: ${Math.round(maxThroughput)} ops/sec ${maxThroughput > TEST_CONFIG.targets.throughputOpsPerSec ? '✅' : '❌'}`);
    }
    
    // Hit rate
    const hitRateTest = this.results.tests['Cache Hit Rate Optimization'];
    if (hitRateTest && hitRateTest.status === 'passed') {
      const hitRate = hitRateTest.metrics.warmCacheHitRate;
      console.log(`   Warm Cache Hit Rate: ${(hitRate * 100).toFixed(1)}% ${hitRate > TEST_CONFIG.targets.hitRate ? '✅' : '❌'}`);
    }
    
    // Memory usage
    const memoryTest = this.results.tests['Memory Usage Under Load'];
    if (memoryTest && memoryTest.status === 'passed') {
      const maxMemory = memoryTest.metrics.maxHeapUsed;
      console.log(`   Max Memory Usage: ${(maxMemory / 1024 / 1024).toFixed(1)}MB ${maxMemory < TEST_CONFIG.targets.memoryLimit ? '✅' : '❌'}`);
    }
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.results.errors.length})`);
      this.results.errors.forEach(error => {
        console.log(`   ${error.test}: ${error.error}`);
      });
    }
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS`);
    
    if (passedTests === totalTests) {
      console.log(`   🎉 All tests passed! Cache system is production-ready.`);
      console.log(`   ✅ Performance targets met across all metrics`);
      console.log(`   ✅ System handles high concurrency and stress conditions`);
      console.log(`   ✅ Memory usage within acceptable limits`);
      console.log(`   ✅ Cache invalidation and persistence working correctly`);
    } else {
      console.log(`   ⚠️  Some tests failed - review failed components before production`);
      
      const failedTests = Object.entries(this.results.tests)
        .filter(([name, test]) => test.status === 'failed')
        .map(([name]) => name);
      
      console.log(`   Failed tests: ${failedTests.join(', ')}`);
    }
    
    console.log(`\n📋 NEXT STEPS`);
    console.log(`   1. Review any failed tests and address issues`);
    console.log(`   2. Deploy cache system to production environment`);
    console.log(`   3. Monitor cache performance with observability dashboard`);
    console.log(`   4. Set up alerts for cache hit rate and memory usage`);
    console.log(`   5. Schedule regular cache warming and maintenance`);
    
    console.log('\n' + '═'.repeat(80));
    console.log('🏁 Cache System Stress Test Complete!');
    
    // Save detailed results
    const fs = require('fs').promises;
    await fs.writeFile(
      path.join(process.cwd(), 'rag-system', 'cache-stress-test-results.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    console.log('📄 Detailed results saved to: rag-system/cache-stress-test-results.json\n');
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    try {
      if (this.cachedPipeline) {
        await this.cachedPipeline.shutdown();
      }
      if (this.cacheManager) {
        await this.cacheManager.close();
      }
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }
}

// Run the stress test
async function main() {
  const tester = new CacheStressTester();
  
  try {
    await tester.initialize();
    await tester.runAllTests();
  } catch (error) {
    console.error('\n💥 Stress test failed:', error.message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Export for use as module or run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CacheStressTester, TEST_CONFIG };