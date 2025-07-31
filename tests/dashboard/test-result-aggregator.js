/**
 * Test Result Aggregator
 * 
 * Based on TaskMaster research for test runners integration:
 * - Integrates with Jest, Mocha, Cypress test runners
 * - Publishes real-time test events to Redis
 * - Aggregates test metrics and stores time-series data
 * - Supports multiple report formats (JUnit XML, JSON, HTML)
 * - CI/CD pipeline integration hooks
 */

const Redis = require('ioredis');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const xml2js = require('xml2js');

// Configuration based on TaskMaster research
const AGGREGATOR_CONFIG = {
  redis: {
    url: process.env.AGGREGATOR_REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'test-dashboard:'
  },
  testRunners: {
    jest: {
      reporterPath: './jest-dashboard-reporter.js',
      outputFile: 'jest-results.json',
      formats: ['json', 'junit']
    },
    mocha: {
      reporterPath: './mocha-dashboard-reporter.js',
      outputFile: 'mocha-results.json',
      formats: ['json', 'junit']
    },
    cypress: {
      reporterPath: 'cypress-multi-reporters',
      outputFile: 'cypress-results.json',
      formats: ['json', 'junit', 'mochawesome']
    }
  },
  aggregation: {
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
    retention: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  hooks: {
    preSuite: [],
    postSuite: [],
    preTest: [],
    postTest: []
  }
};

class TestResultAggregator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = { ...AGGREGATOR_CONFIG, ...config };
    this.redis = new Redis(this.config.redis.url);
    
    // Test execution tracking
    this.currentTestRun = null;
    this.testResults = [];
    this.metrics = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
      suiteStartTime: null,
      suiteEndTime: null
    };
    
    // Event batching for performance
    this.eventBatch = [];
    this.batchTimer = null;
    
    this.initializeReporters();
  }
  
  async initializeReporters() {
    // Create custom reporters for different test runners
    await this.createJestReporter();
    await this.createMochaReporter();
    
    console.log('Test result aggregator initialized');
  }
  
  async createJestReporter() {
    // Jest custom reporter based on TaskMaster research
    const jestReporter = `
/**
 * Jest Dashboard Reporter
 * Publishes test events to Redis for real-time dashboard updates
 */

const Redis = require('ioredis');

class JestDashboardReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.redis = new Redis('${this.config.redis.url}');
    this.testRunId = process.env.TEST_RUN_ID || require('uuid').v4();
  }

  onRunStart(results, options) {
    this.suiteStartTime = Date.now();
    
    this.redis.publish('suite:started', JSON.stringify({
      testRunId: this.testRunId,
      suiteName: 'Jest Test Suite',
      startTime: new Date().toISOString(),
      totalTests: results.numTotalTestSuites
    }));
  }

  onTestStart(test) {
    this.redis.publish('test:started', JSON.stringify({
      testRunId: this.testRunId,
      testName: test.path,
      suiteName: 'Jest',
      startTime: new Date().toISOString()
    }));
  }

  onTestResult(test, testResult, aggregatedResult) {
    const results = testResult.testResults.map(test => ({
      title: test.title,
      status: test.status,
      duration: test.duration,
      failureMessage: test.failureMessage,
      ancestorTitles: test.ancestorTitles
    }));

    if (testResult.testResults.some(t => t.status === 'failed')) {
      this.redis.publish('test:failed', JSON.stringify({
        testRunId: this.testRunId,
        testPath: test.path,
        results,
        error: testResult.failureMessage
      }));
    } else {
      this.redis.publish('test:completed', JSON.stringify({
        testRunId: this.testRunId,
        testPath: test.path,
        results
      }));
    }

    // Publish progress
    const progress = (aggregatedResult.numCompletedTestSuites / aggregatedResult.numTotalTestSuites) * 100;
    this.redis.publish('test:progress', JSON.stringify({
      testRunId: this.testRunId,
      progress: Math.round(progress),
      currentTest: test.path
    }));
  }

  onRunComplete(contexts, results) {
    const metrics = {
      total: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      skipped: results.numPendingTests,
      duration: Date.now() - this.suiteStartTime
    };

    this.redis.publish('suite:completed', JSON.stringify({
      testRunId: this.testRunId,
      suiteName: 'Jest Test Suite',
      endTime: new Date().toISOString(),
      metrics,
      success: results.success
    }));

    this.redis.publish('test:metrics', JSON.stringify({
      type: 'execution',
      testRunId: this.testRunId,
      metrics
    }));

    this.redis.disconnect();
  }
}

module.exports = JestDashboardReporter;
`;
    
    const reporterPath = path.join(__dirname, 'jest-dashboard-reporter.js');
    await fs.writeFile(reporterPath, jestReporter);
  }
  
  async createMochaReporter() {
    // Mocha custom reporter
    const mochaReporter = `
/**
 * Mocha Dashboard Reporter
 * Publishes test events to Redis for real-time dashboard updates
 */

const Redis = require('ioredis');
const { inherits } = require('util');
const { Base } = require('mocha').reporters;

function MochaDashboardReporter(runner, options) {
  Base.call(this, runner, options);

  this.redis = new Redis('${this.config.redis.url}');
  this.testRunId = process.env.TEST_RUN_ID || require('uuid').v4();
  this.stats = {
    passes: 0,
    failures: 0,
    pending: 0,
    tests: 0,
    duration: 0
  };

  runner.once('start', () => {
    this.suiteStartTime = Date.now();
    
    this.redis.publish('suite:started', JSON.stringify({
      testRunId: this.testRunId,
      suiteName: 'Mocha Test Suite',
      startTime: new Date().toISOString()
    }));
  });

  runner.on('test', (test) => {
    this.redis.publish('test:started', JSON.stringify({
      testRunId: this.testRunId,
      testName: test.fullTitle(),
      suiteName: 'Mocha',
      startTime: new Date().toISOString()
    }));
  });

  runner.on('pass', (test) => {
    this.stats.passes++;
    this.stats.tests++;
    
    this.redis.publish('test:completed', JSON.stringify({
      testRunId: this.testRunId,
      testName: test.fullTitle(),
      duration: test.duration,
      results: [{
        title: test.title,
        status: 'passed',
        duration: test.duration
      }]
    }));
  });

  runner.on('fail', (test, err) => {
    this.stats.failures++;
    this.stats.tests++;
    
    this.redis.publish('test:failed', JSON.stringify({
      testRunId: this.testRunId,
      testName: test.fullTitle(),
      error: err.message,
      results: [{
        title: test.title,
        status: 'failed',
        duration: test.duration,
        error: err.message
      }]
    }));
  });

  runner.on('pending', (test) => {
    this.stats.pending++;
    this.stats.tests++;
  });

  runner.once('end', () => {
    this.stats.duration = Date.now() - this.suiteStartTime;
    
    const metrics = {
      total: this.stats.tests,
      passed: this.stats.passes,
      failed: this.stats.failures,
      skipped: this.stats.pending,
      duration: this.stats.duration
    };

    this.redis.publish('suite:completed', JSON.stringify({
      testRunId: this.testRunId,
      suiteName: 'Mocha Test Suite',
      endTime: new Date().toISOString(),
      metrics,
      success: this.stats.failures === 0
    }));

    this.redis.publish('test:metrics', JSON.stringify({
      type: 'execution',
      testRunId: this.testRunId,
      metrics
    }));

    this.redis.disconnect();
  });
}

inherits(MochaDashboardReporter, Base);

module.exports = MochaDashboardReporter;
`;
    
    const reporterPath = path.join(__dirname, 'mocha-dashboard-reporter.js');
    await fs.writeFile(reporterPath, mochaReporter);
  }
  
  // Test execution lifecycle methods
  startTestSuite(suiteName, options = {}) {
    this.currentTestRun = {
      id: uuidv4(),
      suiteName,
      options,
      startTime: new Date(),
      status: 'running'
    };
    
    this.metrics = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
      suiteStartTime: Date.now(),
      suiteEndTime: null
    };
    
    this.publishEvent('suite:started', {
      testRunId: this.currentTestRun.id,
      suiteName,
      startTime: this.currentTestRun.startTime.toISOString(),
      options
    });
    
    return this.currentTestRun.id;
  }
  
  startTest(testName, testSuite = null) {
    if (!this.currentTestRun) {
      throw new Error('No active test suite. Call startTestSuite() first.');
    }
    
    const testId = uuidv4();
    
    this.publishEvent('test:started', {
      testRunId: this.currentTestRun.id,
      testId,
      testName,
      suiteName: testSuite || this.currentTestRun.suiteName,
      startTime: new Date().toISOString()
    });
    
    return testId;
  }
  
  completeTest(testId, testName, result) {
    if (!this.currentTestRun) return;
    
    this.metrics.testsRun++;
    
    if (result.status === 'passed') {
      this.metrics.testsPassed++;
      this.publishEvent('test:completed', {
        testRunId: this.currentTestRun.id,
        testId,
        testName,
        results: [result]
      });
    } else if (result.status === 'failed') {
      this.metrics.testsFailed++;
      this.publishEvent('test:failed', {
        testRunId: this.currentTestRun.id,
        testId,
        testName,
        error: result.error,
        results: [result]
      });
    } else {
      this.metrics.testsSkipped++;
    }
    
    // Store individual test result
    this.testResults.push({
      testId,
      testName,
      result,
      timestamp: new Date().toISOString()
    });
  }
  
  updateProgress(progress, currentTest = null) {
    if (!this.currentTestRun) return;
    
    this.publishEvent('test:progress', {
      testRunId: this.currentTestRun.id,
      progress,
      currentTest
    });
  }
  
  endTestSuite(success = true) {
    if (!this.currentTestRun) return;
    
    this.metrics.suiteEndTime = Date.now();
    this.currentTestRun.status = success ? 'completed' : 'failed';
    this.currentTestRun.endTime = new Date();
    
    const metrics = {
      total: this.metrics.testsRun,
      passed: this.metrics.testsPassed,
      failed: this.metrics.testsFailed,
      skipped: this.metrics.testsSkipped,
      duration: this.metrics.suiteEndTime - this.metrics.suiteStartTime
    };
    
    this.publishEvent('suite:completed', {
      testRunId: this.currentTestRun.id,
      suiteName: this.currentTestRun.suiteName,
      endTime: this.currentTestRun.endTime.toISOString(),
      metrics,
      success
    });
    
    this.publishEvent('test:metrics', {
      type: 'execution',
      testRunId: this.currentTestRun.id,
      metrics
    });
    
    // Store aggregated results
    this.storeTestSuiteResults();
    
    // Reset for next suite
    const completedRun = this.currentTestRun;
    this.currentTestRun = null;
    this.testResults = [];
    
    return completedRun;
  }
  
  publishEvent(eventType, data) {
    // Add to batch for performance
    this.eventBatch.push({ eventType, data, timestamp: Date.now() });
    
    // Immediate publish for critical events
    if (['test:failed', 'suite:completed'].includes(eventType)) {
      this.flushEventBatch();
    } else {
      // Batch other events
      this.scheduleBatchFlush();
    }
  }
  
  scheduleBatchFlush() {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(() => {
      this.flushEventBatch();
    }, this.config.aggregation.flushInterval);
  }
  
  async flushEventBatch() {
    if (this.eventBatch.length === 0) return;
    
    const batch = this.eventBatch.splice(0);
    
    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Publish all events in batch
    const pipeline = this.redis.pipeline();
    
    batch.forEach(({ eventType, data }) => {
      pipeline.publish(eventType, JSON.stringify(data));
    });
    
    try {
      await pipeline.exec();
      console.log(`Published ${batch.length} test events`);
    } catch (error) {
      console.error('Failed to publish event batch:', error);
      
      // Re-add failed events to batch for retry
      this.eventBatch.unshift(...batch);
    }
  }
  
  async storeTestSuiteResults() {
    if (!this.currentTestRun) return;
    
    const suiteResults = {
      testRunId: this.currentTestRun.id,
      suiteName: this.currentTestRun.suiteName,
      startTime: this.currentTestRun.startTime,
      endTime: this.currentTestRun.endTime,
      metrics: this.metrics,
      tests: this.testResults
    };
    
    // Store in Redis with expiration
    const key = `${this.config.redis.keyPrefix}results:${this.currentTestRun.id}`;
    await this.redis.setex(
      key,
      Math.floor(this.config.aggregation.retention / 1000),
      JSON.stringify(suiteResults)
    );
    
    // Add to sorted set for time-based queries
    await this.redis.zadd(
      `${this.config.redis.keyPrefix}results-index`,
      this.currentTestRun.startTime.getTime(),
      this.currentTestRun.id
    );
  }
  
  // Report generation methods
  async generateJUnitReport(testRunId) {
    const results = await this.getTestResults(testRunId);
    if (!results) throw new Error(`Test results not found for run: ${testRunId}`);
    
    const testsuites = {
      $: {
        name: results.suiteName,
        tests: results.metrics.total,
        failures: results.metrics.failed,
        errors: 0,
        skipped: results.metrics.skipped,
        time: (results.metrics.duration / 1000).toFixed(3)
      },
      testsuite: {
        $: {
          name: results.suiteName,
          tests: results.metrics.total,
          failures: results.metrics.failed,
          errors: 0,
          skipped: results.metrics.skipped,
          time: (results.metrics.duration / 1000).toFixed(3)
        },
        testcase: results.tests.map(test => {
          const testcase = {
            $: {
              name: test.testName,
              classname: results.suiteName,
              time: test.result.duration ? (test.result.duration / 1000).toFixed(3) : '0'
            }
          };
          
          if (test.result.status === 'failed') {
            testcase.failure = {
              $: { message: test.result.error || 'Test failed' },
              _: test.result.error || 'Test failed'
            };
          } else if (test.result.status === 'skipped') {
            testcase.skipped = {};
          }
          
          return testcase;
        })
      }
    };
    
    const builder = new xml2js.Builder();
    return builder.buildObject({ testsuites });
  }
  
  async generateJSONReport(testRunId) {
    const results = await this.getTestResults(testRunId);
    if (!results) throw new Error(`Test results not found for run: ${testRunId}`);
    
    return {
      testRunId,
      suiteName: results.suiteName,
      startTime: results.startTime,
      endTime: results.endTime,
      duration: results.metrics.duration,
      summary: {
        total: results.metrics.total,
        passed: results.metrics.passed,
        failed: results.metrics.failed,
        skipped: results.metrics.skipped,
        successRate: results.metrics.total > 0 
          ? ((results.metrics.passed / results.metrics.total) * 100).toFixed(2)
          : 0
      },
      tests: results.tests.map(test => ({
        name: test.testName,
        status: test.result.status,
        duration: test.result.duration,
        error: test.result.error,
        timestamp: test.timestamp
      }))
    };
  }
  
  async generateMarkdownReport(testRunId) {
    const jsonReport = await this.generateJSONReport(testRunId);
    
    return `
# Test Report - ${jsonReport.suiteName}

**Test Run ID:** ${jsonReport.testRunId}  
**Started:** ${new Date(jsonReport.startTime).toLocaleString()}  
**Completed:** ${new Date(jsonReport.endTime).toLocaleString()}  
**Duration:** ${(jsonReport.duration / 1000).toFixed(2)}s  

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${jsonReport.summary.total} |
| Passed | ${jsonReport.summary.passed} |
| Failed | ${jsonReport.summary.failed} |
| Skipped | ${jsonReport.summary.skipped} |
| Success Rate | ${jsonReport.summary.successRate}% |

## Test Details

${jsonReport.tests.map(test => `
### ${test.name}

- **Status:** ${test.status}
- **Duration:** ${test.duration ? (test.duration / 1000).toFixed(2) + 's' : 'N/A'}
${test.error ? `- **Error:** ${test.error}` : ''}
`).join('\n')}

---
*Generated by Test Dashboard at ${new Date().toLocaleString()}*
`;
  }
  
  async getTestResults(testRunId) {
    const key = `${this.config.redis.keyPrefix}results:${testRunId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async getRecentTestRuns(limit = 10) {
    const runs = await this.redis.zrevrange(
      `${this.config.redis.keyPrefix}results-index`,
      0, limit - 1,
      'WITHSCORES'
    );
    
    const results = [];
    for (let i = 0; i < runs.length; i += 2) {
      const testRunId = runs[i];
      const timestamp = runs[i + 1];
      const testResults = await this.getTestResults(testRunId);
      
      if (testResults) {
        results.push({
          testRunId,
          timestamp: parseInt(timestamp),
          suiteName: testResults.suiteName,
          metrics: testResults.metrics
        });
      }
    }
    
    return results;
  }
  
  // CI/CD Integration hooks
  setupCIHooks() {
    // GitHub Actions integration
    if (process.env.GITHUB_ACTIONS) {
      this.on('suite:completed', (data) => {
        console.log(`::set-output name=test-results::${JSON.stringify(data.metrics)}`);
        
        if (!data.success) {
          console.log('::error::Test suite failed');
        }
      });
    }
    
    // GitLab CI integration
    if (process.env.GITLAB_CI) {
      this.on('suite:completed', (data) => {
        console.log(`Test Results: ${JSON.stringify(data.metrics)}`);
      });
    }
    
    // Jenkins integration
    if (process.env.JENKINS_URL) {
      this.on('suite:completed', async (data) => {
        // Generate JUnit report for Jenkins
        const junitReport = await this.generateJUnitReport(data.testRunId);
        await fs.writeFile('test-results.xml', junitReport);
      });
    }
  }
  
  // Cleanup and maintenance
  async cleanup() {
    // Flush any pending events
    await this.flushEventBatch();
    
    // Close Redis connection
    if (this.redis) {
      this.redis.disconnect();
    }
    
    console.log('Test result aggregator cleaned up');
  }
  
  // Static factory methods for different test runners
  static forJest(config = {}) {
    const aggregator = new TestResultAggregator(config);
    aggregator.setupCIHooks();
    return aggregator;
  }
  
  static forMocha(config = {}) {
    const aggregator = new TestResultAggregator(config);
    aggregator.setupCIHooks();
    return aggregator;
  }
  
  static forCypress(config = {}) {
    const aggregator = new TestResultAggregator(config);
    aggregator.setupCIHooks();
    return aggregator;
  }
}

// Export for use in other modules
module.exports = TestResultAggregator;

// CLI usage example
if (require.main === module) {
  const aggregator = new TestResultAggregator();
  
  // Example usage
  async function runExample() {
    // Start a test suite
    const testRunId = aggregator.startTestSuite('Example Test Suite');
    
    // Simulate some tests
    for (let i = 1; i <= 5; i++) {
      const testId = aggregator.startTest(`Test ${i}`, 'Example Suite');
      
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Complete test with result
      aggregator.completeTest(testId, `Test ${i}`, {
        status: i === 3 ? 'failed' : 'passed',
        duration: 1000,
        error: i === 3 ? 'Assertion error' : null
      });
      
      // Update progress
      aggregator.updateProgress((i / 5) * 100, `Test ${i}`);
    }
    
    // End test suite
    const result = aggregator.endTestSuite(true);
    
    console.log('Test suite completed:', result);
    
    // Generate reports
    setTimeout(async () => {
      const jsonReport = await aggregator.generateJSONReport(testRunId);
      console.log('JSON Report:', JSON.stringify(jsonReport, null, 2));
      
      const markdownReport = await aggregator.generateMarkdownReport(testRunId);
      console.log('Markdown Report:', markdownReport);
      
      await aggregator.cleanup();
    }, 2000);
  }
  
  runExample().catch(console.error);
}