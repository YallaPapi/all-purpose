# 📊 **Test Metrics Capture Strategies for Node.js Test Runners**

## **Enterprise Patterns for Comprehensive Test Observability 2024-2025**

**Version**: 1.0.0  
**Last Updated**: August 1, 2025  
**Target Audience**: DevOps Engineers, Test Architects, SRE Teams  
**Tech Stack**: Jest, Mocha, Cypress, Playwright, Node.js

---

## 📋 **Table of Contents**

1. [Executive Summary](#executive-summary)
2. [Universal Metrics Schema](#universal-metrics-schema)
3. [Jest Custom Reporters](#jest-custom-reporters)
4. [Mocha Metrics Integration](#mocha-metrics-integration)
5. [Cypress Dashboard Alternatives](#cypress-dashboard-alternatives)
6. [Playwright Advanced Reporting](#playwright-advanced-reporting)
7. [Real-Time Metrics Streaming](#real-time-metrics-streaming)
8. [CI/CD Integration Patterns](#cicd-integration-patterns)
9. [Performance Metrics Collection](#performance-metrics-collection)
10. [Reference Implementation](#reference-implementation)

---

## 🎯 **Executive Summary**

Modern test suites generate vast amounts of data that, when properly captured and analyzed, provide critical insights into code quality, test reliability, and system performance. This guide presents production-ready patterns for capturing, standardizing, and streaming test metrics across all major Node.js test runners.

**Key Benefits**:
- ✅ **Unified Observability**: Single schema across all test runners
- ✅ **Real-Time Insights**: Live metrics during test execution
- ✅ **Performance Tracking**: CPU, memory, and timing metrics
- ✅ **Flakiness Detection**: Historical analysis and trends
- ✅ **CI/CD Integration**: Seamless pipeline metrics collection

---

## 📐 **Universal Metrics Schema**

### **Core Test Metrics Schema**

```typescript
interface TestMetric {
  // Identification
  id: string;                    // Unique test execution ID
  suite: string;                 // Test suite name
  test: string;                  // Test case name
  runner: 'jest' | 'mocha' | 'cypress' | 'playwright' | 'vitest';
  
  // Execution Details
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration_ms: number;           // Test execution time
  start_time: string;            // ISO 8601 timestamp
  end_time: string;              // ISO 8601 timestamp
  
  // Environment
  environment: {
    node_version: string;
    os: string;
    cpu_arch: string;
    ci_provider?: string;
    branch?: string;
    commit_sha?: string;
    build_id?: string;
  };
  
  // Error Information
  error?: {
    message: string;
    stack?: string;
    type?: string;
    expected?: any;
    actual?: any;
  };
  
  // Performance Metrics
  performance?: {
    cpu_percent: number;         // Average CPU usage
    memory_mb: number;           // Peak memory usage
    heap_used_mb: number;        // Peak heap usage
    external_mb?: number;        // External memory
  };
  
  // Additional Metadata
  metadata?: {
    retries?: number;            // Number of retry attempts
    flaky?: boolean;             // Flakiness indicator
    tags?: string[];             // Custom tags
    browser?: string;            // For browser tests
    viewport?: { width: number; height: number };
    [key: string]: any;          // Extensible metadata
  };
}
```

### **Aggregated Metrics Schema**

```typescript
interface TestSuiteMetrics {
  suite_id: string;
  suite_name: string;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  start_time: string;
  end_time: string;
  
  // Statistical Metrics
  stats: {
    mean_duration_ms: number;
    median_duration_ms: number;
    p95_duration_ms: number;
    p99_duration_ms: number;
    slowest_test: string;
    fastest_test: string;
  };
  
  // Resource Usage
  resource_usage: {
    peak_cpu_percent: number;
    peak_memory_mb: number;
    avg_cpu_percent: number;
    avg_memory_mb: number;
  };
  
  // Coverage Metrics
  coverage?: {
    lines: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
  };
}
```

---

## 🃏 **Jest Custom Reporters**

### **Implementation: Comprehensive Jest Metrics Reporter**

```typescript
import { Reporter, Test, TestResult, AggregatedResult, Context } from '@jest/reporters';
import { performance } from 'perf_hooks';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

export class JestMetricsReporter implements Reporter {
  private metrics: TestMetric[] = [];
  private startTime: number = 0;
  private metricsStream?: MetricsStreamer;

  constructor(globalConfig: any, options: any) {
    this.metricsStream = options.stream ? new MetricsStreamer(options.streamUrl) : undefined;
  }

  onRunStart(results: AggregatedResult, options: any): void {
    this.startTime = performance.now();
    console.log('📊 Jest Metrics Reporter: Starting test run');
  }

  onTestStart(test: Test): void {
    // Initialize per-test resource tracking
    if (global.gc) global.gc(); // Force garbage collection if exposed
  }

  onTestResult(
    test: Test,
    testResult: TestResult,
    aggregatedResult: AggregatedResult
  ): void {
    const suiteMetrics = this.extractSuiteMetrics(test, testResult);
    
    // Extract individual test metrics
    testResult.testResults.forEach((result) => {
      const metric: TestMetric = {
        id: uuidv4(),
        suite: testResult.testFilePath,
        test: result.fullName,
        runner: 'jest',
        status: this.mapStatus(result.status),
        duration_ms: result.duration || 0,
        start_time: new Date(testResult.perfStats.start).toISOString(),
        end_time: new Date(testResult.perfStats.end).toISOString(),
        
        environment: {
          node_version: process.version,
          os: `${os.platform()}-${os.release()}`,
          cpu_arch: os.arch(),
          ci_provider: process.env.CI ? this.detectCIProvider() : undefined,
          branch: process.env.GIT_BRANCH || process.env.GITHUB_REF,
          commit_sha: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
          build_id: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
        },
        
        error: result.failureDetails?.[0] ? {
          message: result.failureMessages?.[0] || 'Unknown error',
          stack: result.failureDetails[0].stack,
          type: result.failureDetails[0].error?.name,
        } : undefined,
        
        performance: this.collectPerformanceMetrics(),
        
        metadata: {
          retries: result.retryReasons?.length || 0,
          flaky: (result.retryReasons?.length || 0) > 0,
          tags: this.extractTags(result.fullName),
          snapshot: {
            added: testResult.snapshot.added,
            updated: testResult.snapshot.updated,
            matched: testResult.snapshot.matched,
            unmatched: testResult.snapshot.unmatched,
          },
        },
      };
      
      this.metrics.push(metric);
      
      // Stream metric in real-time if configured
      if (this.metricsStream) {
        this.metricsStream.send(metric);
      }
    });
  }

  onRunComplete(contexts: Set<Context>, results: AggregatedResult): void {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;
    
    // Generate suite-level metrics
    const suiteMetrics: TestSuiteMetrics = {
      suite_id: uuidv4(),
      suite_name: 'Jest Test Suite',
      total_tests: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      skipped: results.numPendingTests,
      duration_ms: totalDuration,
      start_time: new Date(results.startTime).toISOString(),
      end_time: new Date().toISOString(),
      
      stats: this.calculateStatistics(this.metrics),
      resource_usage: this.aggregateResourceUsage(this.metrics),
      coverage: this.extractCoverageData(results),
    };
    
    // Save metrics to file
    this.saveMetrics(this.metrics, suiteMetrics);
    
    // Stream final summary
    if (this.metricsStream) {
      this.metricsStream.sendSummary(suiteMetrics);
      this.metricsStream.close();
    }
    
    console.log(`📊 Jest Metrics Reporter: Captured ${this.metrics.length} test metrics`);
  }

  private mapStatus(status: string): TestMetric['status'] {
    const statusMap: Record<string, TestMetric['status']> = {
      passed: 'passed',
      failed: 'failed',
      skipped: 'skipped',
      pending: 'pending',
      todo: 'skipped',
    };
    return statusMap[status] || 'skipped';
  }

  private collectPerformanceMetrics(): TestMetric['performance'] {
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    return {
      cpu_percent: (usage.user + usage.system) / 1000000 * 100, // Convert to percentage
      memory_mb: memUsage.rss / 1024 / 1024,
      heap_used_mb: memUsage.heapUsed / 1024 / 1024,
      external_mb: memUsage.external / 1024 / 1024,
    };
  }

  private extractTags(testName: string): string[] {
    const tags: string[] = [];
    
    // Extract tags from test name patterns
    const tagPattern = /@(\w+)/g;
    let match;
    while ((match = tagPattern.exec(testName)) !== null) {
      tags.push(match[1]);
    }
    
    // Add automatic tags based on test name
    if (testName.includes('api')) tags.push('api');
    if (testName.includes('unit')) tags.push('unit');
    if (testName.includes('integration')) tags.push('integration');
    if (testName.includes('e2e')) tags.push('e2e');
    
    return [...new Set(tags)];
  }

  private detectCIProvider(): string {
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.GITLAB_CI) return 'gitlab-ci';
    if (process.env.JENKINS_URL) return 'jenkins';
    if (process.env.CIRCLECI) return 'circleci';
    if (process.env.TRAVIS) return 'travis-ci';
    if (process.env.BUILDKITE) return 'buildkite';
    return 'unknown';
  }

  private calculateStatistics(metrics: TestMetric[]): TestSuiteMetrics['stats'] {
    const durations = metrics.map(m => m.duration_ms).sort((a, b) => a - b);
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];
    
    const slowest = metrics.reduce((max, m) => 
      m.duration_ms > max.duration_ms ? m : max
    );
    const fastest = metrics.reduce((min, m) => 
      m.duration_ms < min.duration_ms ? m : min
    );
    
    return {
      mean_duration_ms: mean,
      median_duration_ms: median,
      p95_duration_ms: p95,
      p99_duration_ms: p99,
      slowest_test: slowest.test,
      fastest_test: fastest.test,
    };
  }

  private aggregateResourceUsage(metrics: TestMetric[]): TestSuiteMetrics['resource_usage'] {
    const cpuValues = metrics.map(m => m.performance?.cpu_percent || 0);
    const memoryValues = metrics.map(m => m.performance?.memory_mb || 0);
    
    return {
      peak_cpu_percent: Math.max(...cpuValues),
      peak_memory_mb: Math.max(...memoryValues),
      avg_cpu_percent: cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length,
      avg_memory_mb: memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length,
    };
  }

  private extractCoverageData(results: AggregatedResult): TestSuiteMetrics['coverage'] {
    if (!results.coverageMap) return undefined;
    
    const summary = results.coverageMap.getCoverageSummary();
    
    return {
      lines: {
        total: summary.lines.total,
        covered: summary.lines.covered,
        percentage: summary.lines.pct,
      },
      branches: {
        total: summary.branches.total,
        covered: summary.branches.covered,
        percentage: summary.branches.pct,
      },
      functions: {
        total: summary.functions.total,
        covered: summary.functions.covered,
        percentage: summary.functions.pct,
      },
      statements: {
        total: summary.statements.total,
        covered: summary.statements.covered,
        percentage: summary.statements.pct,
      },
    };
  }

  private saveMetrics(metrics: TestMetric[], suiteMetrics: TestSuiteMetrics): void {
    const fs = require('fs');
    const path = require('path');
    
    const outputDir = process.env.TEST_METRICS_DIR || './test-metrics';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsFile = path.join(outputDir, `jest-metrics-${timestamp}.json`);
    
    fs.writeFileSync(metricsFile, JSON.stringify({
      suite: suiteMetrics,
      tests: metrics,
    }, null, 2));
    
    console.log(`📁 Metrics saved to: ${metricsFile}`);
  }

  private extractSuiteMetrics(test: Test, testResult: TestResult): any {
    // Additional suite-level metrics extraction
    return {
      file: testResult.testFilePath,
      numPassingTests: testResult.numPassingTests,
      numFailingTests: testResult.numFailingTests,
      numPendingTests: testResult.numPendingTests,
      perfStats: testResult.perfStats,
    };
  }
}

// Jest configuration
export default {
  reporters: [
    'default',
    ['<rootDir>/jest-metrics-reporter.js', {
      stream: true,
      streamUrl: process.env.METRICS_STREAM_URL || 'ws://localhost:3000/metrics',
    }],
  ],
};
```

---

## 🧪 **Mocha Metrics Integration**

### **Implementation: Mocha Custom Reporter**

```typescript
import { reporters, Runner, Suite, Test } from 'mocha';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';

export class MochaMetricsReporter extends reporters.Base {
  private metrics: TestMetric[] = [];
  private suiteStack: Suite[] = [];
  private startTime: number = 0;
  private testStartTime: Map<string, number> = new Map();
  private metricsStream?: MetricsStreamer;

  constructor(runner: Runner, options: any) {
    super(runner, options);
    
    this.metricsStream = options.reporterOptions?.stream 
      ? new MetricsStreamer(options.reporterOptions.streamUrl)
      : undefined;
    
    this.registerEventHandlers(runner);
  }

  private registerEventHandlers(runner: Runner): void {
    runner.on('start', () => {
      this.startTime = performance.now();
      console.log('📊 Mocha Metrics Reporter: Starting test run');
    });

    runner.on('suite', (suite: Suite) => {
      this.suiteStack.push(suite);
    });

    runner.on('suite end', () => {
      this.suiteStack.pop();
    });

    runner.on('test', (test: Test) => {
      this.testStartTime.set(test.fullTitle(), performance.now());
    });

    runner.on('test end', (test: Test) => {
      const endTime = performance.now();
      const startTime = this.testStartTime.get(test.fullTitle()) || endTime;
      const duration = endTime - startTime;
      
      const metric: TestMetric = {
        id: uuidv4(),
        suite: this.getCurrentSuite(),
        test: test.title,
        runner: 'mocha',
        status: this.mapTestState(test.state),
        duration_ms: duration,
        start_time: new Date(Date.now() - duration).toISOString(),
        end_time: new Date().toISOString(),
        
        environment: {
          node_version: process.version,
          os: `${os.platform()}-${os.release()}`,
          cpu_arch: os.arch(),
          ci_provider: this.detectCIProvider(),
          branch: process.env.GIT_BRANCH || process.env.GITHUB_REF,
          commit_sha: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
          build_id: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
        },
        
        error: test.err ? {
          message: test.err.message,
          stack: test.err.stack,
          type: test.err.name,
          expected: test.err.expected,
          actual: test.err.actual,
        } : undefined,
        
        performance: this.collectPerformanceMetrics(),
        
        metadata: {
          retries: test.currentRetry ? test.currentRetry() : 0,
          flaky: test.currentRetry ? test.currentRetry() > 0 : false,
          tags: this.extractTags(test),
          slow: test.slow ? test.duration > test.slow() : false,
          timeout: test.timeout(),
        },
      };
      
      this.metrics.push(metric);
      
      // Stream metric in real-time
      if (this.metricsStream) {
        this.metricsStream.send(metric);
      }
      
      this.testStartTime.delete(test.fullTitle());
    });

    runner.on('end', () => {
      this.generateAndSaveSummary();
    });
  }

  private getCurrentSuite(): string {
    return this.suiteStack
      .filter(s => s.title)
      .map(s => s.title)
      .join(' > ');
  }

  private mapTestState(state?: string): TestMetric['status'] {
    switch (state) {
      case 'passed': return 'passed';
      case 'failed': return 'failed';
      case 'pending': return 'pending';
      default: return 'skipped';
    }
  }

  private extractTags(test: Test): string[] {
    const tags: string[] = [];
    
    // Extract from test title
    const tagPattern = /@(\w+)/g;
    let match;
    while ((match = tagPattern.exec(test.title)) !== null) {
      tags.push(match[1]);
    }
    
    // Extract from test file path
    if (test.file) {
      if (test.file.includes('/unit/')) tags.push('unit');
      if (test.file.includes('/integration/')) tags.push('integration');
      if (test.file.includes('/e2e/')) tags.push('e2e');
      if (test.file.includes('/api/')) tags.push('api');
    }
    
    return [...new Set(tags)];
  }

  private collectPerformanceMetrics(): TestMetric['performance'] {
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    return {
      cpu_percent: (usage.user + usage.system) / 1000000 * 100,
      memory_mb: memUsage.rss / 1024 / 1024,
      heap_used_mb: memUsage.heapUsed / 1024 / 1024,
      external_mb: memUsage.external / 1024 / 1024,
    };
  }

  private detectCIProvider(): string | undefined {
    if (!process.env.CI) return undefined;
    
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.GITLAB_CI) return 'gitlab-ci';
    if (process.env.JENKINS_URL) return 'jenkins';
    if (process.env.CIRCLECI) return 'circleci';
    return 'unknown';
  }

  private generateAndSaveSummary(): void {
    const endTime = performance.now();
    const stats = this.runner.stats;
    
    const suiteMetrics: TestSuiteMetrics = {
      suite_id: uuidv4(),
      suite_name: 'Mocha Test Suite',
      total_tests: stats.tests,
      passed: stats.passes,
      failed: stats.failures,
      skipped: stats.pending,
      duration_ms: endTime - this.startTime,
      start_time: new Date(stats.start).toISOString(),
      end_time: new Date(stats.end).toISOString(),
      
      stats: this.calculateStatistics(this.metrics),
      resource_usage: this.aggregateResourceUsage(this.metrics),
    };
    
    this.saveMetrics(this.metrics, suiteMetrics);
    
    if (this.metricsStream) {
      this.metricsStream.sendSummary(suiteMetrics);
      this.metricsStream.close();
    }
    
    console.log(`📊 Mocha Metrics Reporter: Captured ${this.metrics.length} test metrics`);
  }

  // Reuse statistics calculation methods from Jest reporter
  private calculateStatistics(metrics: TestMetric[]): TestSuiteMetrics['stats'] {
    // Implementation identical to Jest reporter
    const durations = metrics.map(m => m.duration_ms).sort((a, b) => a - b);
    return {
      mean_duration_ms: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      median_duration_ms: durations[Math.floor(durations.length / 2)],
      p95_duration_ms: durations[Math.floor(durations.length * 0.95)],
      p99_duration_ms: durations[Math.floor(durations.length * 0.99)],
      slowest_test: metrics.reduce((max, m) => m.duration_ms > max.duration_ms ? m : max).test,
      fastest_test: metrics.reduce((min, m) => m.duration_ms < min.duration_ms ? m : min).test,
    };
  }

  private aggregateResourceUsage(metrics: TestMetric[]): TestSuiteMetrics['resource_usage'] {
    // Implementation identical to Jest reporter
    const cpuValues = metrics.map(m => m.performance?.cpu_percent || 0);
    const memoryValues = metrics.map(m => m.performance?.memory_mb || 0);
    
    return {
      peak_cpu_percent: Math.max(...cpuValues),
      peak_memory_mb: Math.max(...memoryValues),
      avg_cpu_percent: cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length,
      avg_memory_mb: memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length,
    };
  }

  private saveMetrics(metrics: TestMetric[], suiteMetrics: TestSuiteMetrics): void {
    const fs = require('fs');
    const path = require('path');
    
    const outputDir = process.env.TEST_METRICS_DIR || './test-metrics';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsFile = path.join(outputDir, `mocha-metrics-${timestamp}.json`);
    
    fs.writeFileSync(metricsFile, JSON.stringify({
      suite: suiteMetrics,
      tests: metrics,
    }, null, 2));
  }
}

// Mocha configuration (.mocharc.js)
module.exports = {
  reporter: './mocha-metrics-reporter.js',
  reporterOptions: {
    stream: true,
    streamUrl: process.env.METRICS_STREAM_URL || 'ws://localhost:3000/metrics',
  },
};
```

---

## 🌐 **Cypress Dashboard Alternatives**

### **Implementation: Cypress Metrics Plugin**

```typescript
// cypress/plugins/metrics-plugin.ts
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';

interface CypressTestMetric extends TestMetric {
  metadata: TestMetric['metadata'] & {
    browser?: string;
    viewport?: { width: number; height: number };
    screenshots?: string[];
    video?: string;
  };
}

export function setupMetricsPlugin(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  const metrics: CypressTestMetric[] = [];
  let suiteStartTime: number;
  
  on('before:run', (details) => {
    suiteStartTime = Date.now();
    console.log('📊 Cypress Metrics Plugin: Starting test run');
  });
  
  on('after:spec', (spec, results) => {
    if (!results) return;
    
    results.tests.forEach((test) => {
      const attempts = test.attempts;
      
      attempts.forEach((attempt, index) => {
        const metric: CypressTestMetric = {
          id: uuidv4(),
          suite: spec.relative,
          test: test.title.join(' > '),
          runner: 'cypress',
          status: attempt.state as TestMetric['status'],
          duration_ms: attempt.wallClockDuration || 0,
          start_time: new Date(attempt.wallClockStartedAt).toISOString(),
          end_time: new Date(attempt.wallClockStartedAt + (attempt.wallClockDuration || 0)).toISOString(),
          
          environment: {
            node_version: process.version,
            os: `${os.platform()}-${os.release()}`,
            cpu_arch: os.arch(),
            ci_provider: detectCIProvider(),
            branch: process.env.GIT_BRANCH || process.env.GITHUB_REF,
            commit_sha: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
            build_id: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
          },
          
          error: attempt.error ? {
            message: attempt.error.message,
            stack: attempt.error.stack,
            type: attempt.error.name,
          } : undefined,
          
          performance: {
            cpu_percent: 0, // Not available in Cypress context
            memory_mb: 0,
            heap_used_mb: 0,
          },
          
          metadata: {
            retries: index,
            flaky: test.attempts.length > 1,
            tags: extractTags(test.title),
            browser: results.browserName,
            viewport: {
              width: results.config.viewportWidth,
              height: results.config.viewportHeight,
            },
            screenshots: attempt.screenshots?.map(s => s.path),
            video: results.video,
          },
        };
        
        metrics.push(metric);
      });
    });
  });
  
  on('after:run', (results) => {
    const suiteMetrics: TestSuiteMetrics = {
      suite_id: uuidv4(),
      suite_name: 'Cypress Test Suite',
      total_tests: results.totalTests,
      passed: results.totalPassed,
      failed: results.totalFailed,
      skipped: results.totalPending + results.totalSkipped,
      duration_ms: results.totalDuration,
      start_time: new Date(results.startedTestsAt).toISOString(),
      end_time: new Date(results.endedTestsAt).toISOString(),
      
      stats: calculateStatistics(metrics),
      resource_usage: {
        peak_cpu_percent: 0,
        peak_memory_mb: 0,
        avg_cpu_percent: 0,
        avg_memory_mb: 0,
      },
    };
    
    saveMetrics(metrics, suiteMetrics);
    
    // Send to metrics service
    if (config.env.METRICS_API_URL) {
      sendMetricsToAPI(metrics, suiteMetrics, config.env.METRICS_API_URL);
    }
  });
  
  return config;
}

// Cypress configuration
export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      setupMetricsPlugin(on, config);
    },
    env: {
      METRICS_API_URL: process.env.METRICS_API_URL,
    },
  },
});

// Support file for browser metrics
Cypress.on('test:after:run', (test, runnable) => {
  // Capture browser performance metrics
  cy.window().then((win) => {
    const perfData = win.performance.getEntriesByType('measure');
    const navigationTiming = win.performance.getEntriesByType('navigation')[0];
    
    // Store performance data for the plugin
    Cypress.env(`perf_${test.id}`, {
      measures: perfData,
      navigation: navigationTiming,
      memory: (win.performance as any).memory,
    });
  });
});
```

---

## 🎭 **Playwright Advanced Reporting**

### **Implementation: Playwright Metrics Reporter**

```typescript
import { Reporter, TestCase, TestResult, FullResult, Suite } from '@playwright/test/reporter';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

class PlaywrightMetricsReporter implements Reporter {
  private metrics: TestMetric[] = [];
  private startTime: number = 0;
  private metricsStream?: MetricsStreamer;

  constructor(options: any) {
    this.metricsStream = options.stream 
      ? new MetricsStreamer(options.streamUrl)
      : undefined;
  }

  onBegin(config: any, suite: Suite): void {
    this.startTime = Date.now();
    console.log('📊 Playwright Metrics Reporter: Starting test run');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const metric: TestMetric = {
      id: uuidv4(),
      suite: test.parent.title,
      test: test.title,
      runner: 'playwright',
      status: this.mapStatus(result.status),
      duration_ms: result.duration,
      start_time: new Date(result.startTime).toISOString(),
      end_time: new Date(result.startTime + result.duration).toISOString(),
      
      environment: {
        node_version: process.version,
        os: `${os.platform()}-${os.release()}`,
        cpu_arch: os.arch(),
        ci_provider: this.detectCIProvider(),
        branch: process.env.GIT_BRANCH || process.env.GITHUB_REF,
        commit_sha: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
        build_id: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
      },
      
      error: result.error ? {
        message: result.error.message,
        stack: result.error.stack,
        type: result.error.name,
      } : undefined,
      
      performance: this.extractPerformanceMetrics(result),
      
      metadata: {
        retries: result.retry,
        flaky: result.status === 'flaky',
        tags: this.extractTags(test),
        browser: test.parent.project()?.name,
        annotations: test.annotations,
        attachments: result.attachments?.map(a => ({
          name: a.name,
          contentType: a.contentType,
          path: a.path,
        })),
        trace: result.attachments?.find(a => a.name === 'trace')?.path,
        video: result.attachments?.find(a => a.name === 'video')?.path,
        screenshots: result.attachments
          ?.filter(a => a.contentType?.startsWith('image/'))
          .map(a => a.path),
      },
    };
    
    this.metrics.push(metric);
    
    // Stream metric in real-time
    if (this.metricsStream) {
      this.metricsStream.send(metric);
    }
  }

  onEnd(result: FullResult): void {
    const endTime = Date.now();
    
    const suiteMetrics: TestSuiteMetrics = {
      suite_id: uuidv4(),
      suite_name: 'Playwright Test Suite',
      total_tests: this.metrics.length,
      passed: this.metrics.filter(m => m.status === 'passed').length,
      failed: this.metrics.filter(m => m.status === 'failed').length,
      skipped: this.metrics.filter(m => m.status === 'skipped').length,
      duration_ms: endTime - this.startTime,
      start_time: new Date(this.startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      
      stats: this.calculateStatistics(this.metrics),
      resource_usage: this.aggregateResourceUsage(this.metrics),
    };
    
    this.saveMetrics(this.metrics, suiteMetrics);
    
    if (this.metricsStream) {
      this.metricsStream.sendSummary(suiteMetrics);
      this.metricsStream.close();
    }
    
    console.log(`📊 Playwright Metrics Reporter: Captured ${this.metrics.length} test metrics`);
  }

  private mapStatus(status: string): TestMetric['status'] {
    switch (status) {
      case 'passed': return 'passed';
      case 'failed': return 'failed';
      case 'timedOut': return 'failed';
      case 'skipped': return 'skipped';
      case 'flaky': return 'passed'; // Flaky tests eventually pass
      default: return 'skipped';
    }
  }

  private extractPerformanceMetrics(result: TestResult): TestMetric['performance'] {
    // Extract from test attachments or steps
    const perfStep = result.steps.find(s => s.title.includes('performance'));
    
    if (perfStep && perfStep.data) {
      return perfStep.data as TestMetric['performance'];
    }
    
    // Default metrics
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    return {
      cpu_percent: (usage.user + usage.system) / 1000000 * 100,
      memory_mb: memUsage.rss / 1024 / 1024,
      heap_used_mb: memUsage.heapUsed / 1024 / 1024,
    };
  }

  private extractTags(test: TestCase): string[] {
    const tags: string[] = [];
    
    // Extract from test title
    const tagPattern = /@(\w+)/g;
    let match;
    while ((match = tagPattern.exec(test.title)) !== null) {
      tags.push(match[1]);
    }
    
    // Extract from annotations
    test.annotations.forEach(annotation => {
      if (annotation.type === 'tag') {
        tags.push(annotation.description || '');
      }
    });
    
    // Add test type tags
    if (test.title.toLowerCase().includes('e2e')) tags.push('e2e');
    if (test.title.toLowerCase().includes('api')) tags.push('api');
    if (test.title.toLowerCase().includes('visual')) tags.push('visual');
    
    return [...new Set(tags.filter(Boolean))];
  }

  private detectCIProvider(): string | undefined {
    // Implementation identical to other reporters
    if (!process.env.CI) return undefined;
    
    if (process.env.GITHUB_ACTIONS) return 'github-actions';
    if (process.env.GITLAB_CI) return 'gitlab-ci';
    if (process.env.JENKINS_URL) return 'jenkins';
    return 'unknown';
  }

  private calculateStatistics(metrics: TestMetric[]): TestSuiteMetrics['stats'] {
    // Implementation identical to other reporters
    const durations = metrics.map(m => m.duration_ms).sort((a, b) => a - b);
    return {
      mean_duration_ms: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      median_duration_ms: durations[Math.floor(durations.length / 2)],
      p95_duration_ms: durations[Math.floor(durations.length * 0.95)],
      p99_duration_ms: durations[Math.floor(durations.length * 0.99)],
      slowest_test: metrics.reduce((max, m) => m.duration_ms > max.duration_ms ? m : max).test,
      fastest_test: metrics.reduce((min, m) => m.duration_ms < min.duration_ms ? m : min).test,
    };
  }

  private aggregateResourceUsage(metrics: TestMetric[]): TestSuiteMetrics['resource_usage'] {
    // Implementation identical to other reporters
    const cpuValues = metrics.map(m => m.performance?.cpu_percent || 0);
    const memoryValues = metrics.map(m => m.performance?.memory_mb || 0);
    
    return {
      peak_cpu_percent: Math.max(...cpuValues),
      peak_memory_mb: Math.max(...memoryValues),
      avg_cpu_percent: cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length,
      avg_memory_mb: memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length,
    };
  }

  private saveMetrics(metrics: TestMetric[], suiteMetrics: TestSuiteMetrics): void {
    const fs = require('fs');
    const path = require('path');
    
    const outputDir = process.env.TEST_METRICS_DIR || './test-metrics';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsFile = path.join(outputDir, `playwright-metrics-${timestamp}.json`);
    
    fs.writeFileSync(metricsFile, JSON.stringify({
      suite: suiteMetrics,
      tests: metrics,
    }, null, 2));
  }
}

// Playwright configuration
export default defineConfig({
  reporter: [
    ['html'],
    ['./playwright-metrics-reporter.ts', {
      stream: true,
      streamUrl: process.env.METRICS_STREAM_URL || 'ws://localhost:3000/metrics',
    }],
  ],
});
```

---

## 🚀 **Real-Time Metrics Streaming**

### **Implementation: Metrics Streaming Service**

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import axios from 'axios';

export class MetricsStreamer extends EventEmitter {
  private ws?: WebSocket;
  private httpEndpoint?: string;
  private buffer: TestMetric[] = [];
  private flushInterval?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private endpoint: string, private options: StreamerOptions = {}) {
    super();
    this.initialize();
  }

  private initialize(): void {
    if (this.endpoint.startsWith('ws://') || this.endpoint.startsWith('wss://')) {
      this.initializeWebSocket();
    } else if (this.endpoint.startsWith('http://') || this.endpoint.startsWith('https://')) {
      this.initializeHTTP();
    } else {
      throw new Error(`Unsupported endpoint protocol: ${this.endpoint}`);
    }
  }

  private initializeWebSocket(): void {
    try {
      this.ws = new WebSocket(this.endpoint, {
        headers: this.options.headers,
      });

      this.ws.on('open', () => {
        console.log('📡 Connected to metrics stream');
        this.reconnectAttempts = 0;
        this.flushBuffer();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        this.handleReconnect();
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.handleReconnect();
      });
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
      this.handleReconnect();
    }
  }

  private initializeHTTP(): void {
    this.httpEndpoint = this.endpoint;
    
    // Set up periodic flushing for HTTP endpoints
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.options.flushIntervalMs || 5000);
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.initializeWebSocket();
    }, delay);
  }

  send(metric: TestMetric): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'test_metric',
          data: metric,
        }));
      } catch (error) {
        console.error('❌ Failed to send metric:', error);
        this.buffer.push(metric);
      }
    } else if (this.httpEndpoint) {
      this.buffer.push(metric);
      
      // Flush immediately if buffer is large
      if (this.buffer.length >= (this.options.bufferSize || 100)) {
        this.flushBuffer();
      }
    } else {
      this.buffer.push(metric);
    }
  }

  sendSummary(summary: TestSuiteMetrics): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'suite_summary',
          data: summary,
        }));
      } catch (error) {
        console.error('❌ Failed to send summary:', error);
      }
    } else if (this.httpEndpoint) {
      this.sendHTTP([summary], 'suite_summary');
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metricsToSend = [...this.buffer];
    this.buffer = [];

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'batch_metrics',
          data: metricsToSend,
        }));
      } catch (error) {
        console.error('❌ Failed to flush buffer:', error);
        // Re-add to buffer
        this.buffer.unshift(...metricsToSend);
      }
    } else if (this.httpEndpoint) {
      await this.sendHTTP(metricsToSend, 'batch_metrics');
    }
  }

  private async sendHTTP(data: any[], type: string): Promise<void> {
    try {
      await axios.post(this.httpEndpoint!, {
        type,
        data,
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        timeout: this.options.httpTimeout || 10000,
      });
    } catch (error) {
      console.error('❌ Failed to send HTTP metrics:', error);
      // Re-add to buffer for retry
      if (type === 'batch_metrics') {
        this.buffer.unshift(...data);
      }
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    this.flushBuffer();
  }
}

interface StreamerOptions {
  headers?: Record<string, string>;
  bufferSize?: number;
  flushIntervalMs?: number;
  httpTimeout?: number;
}

// Server-side metrics receiver
export class MetricsReceiver {
  private wss: WebSocket.Server;
  private metricsStore: MetricsStore;

  constructor(port: number = 3000) {
    this.wss = new WebSocket.Server({ port });
    this.metricsStore = new MetricsStore();
    
    this.wss.on('connection', (ws) => {
      console.log('📡 New metrics client connected');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('🔌 Client disconnected');
      });
    });
    
    console.log(`📊 Metrics receiver listening on port ${port}`);
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'test_metric':
        this.metricsStore.addMetric(message.data);
        break;
        
      case 'batch_metrics':
        message.data.forEach((metric: TestMetric) => {
          this.metricsStore.addMetric(metric);
        });
        break;
        
      case 'suite_summary':
        this.metricsStore.addSummary(message.data);
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }
}
```

---

## 🔧 **CI/CD Integration Patterns**

### **GitHub Actions Integration**

```yaml
name: Test Metrics Collection

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-with-metrics:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Start Metrics Service
      run: |
        docker run -d \
          --name metrics-collector \
          -p 3000:3000 \
          -v $PWD/metrics:/metrics \
          your-org/metrics-collector:latest
          
    - name: Run Tests with Metrics
      env:
        TEST_METRICS_DIR: ./test-metrics
        METRICS_STREAM_URL: ws://localhost:3000/metrics
        COLLECT_COVERAGE: true
      run: |
        npm run test:jest -- --reporters=default --reporters=./jest-metrics-reporter.js
        npm run test:mocha -- --reporter=./mocha-metrics-reporter.js
        npm run test:cypress
        npm run test:playwright
        
    - name: Upload Metrics Artifacts
      uses: actions/upload-artifact@v3
      with:
        name: test-metrics-${{ github.run_id }}
        path: |
          test-metrics/
          coverage/
          
    - name: Process and Store Metrics
      run: |
        node scripts/process-metrics.js \
          --input=./test-metrics \
          --output=./processed-metrics \
          --format=prometheus
          
    - name: Send Metrics to Time-Series DB
      env:
        PROMETHEUS_PUSHGATEWAY_URL: ${{ secrets.PROMETHEUS_PUSHGATEWAY_URL }}
      run: |
        curl -X POST -H "Content-Type: text/plain" \
          --data-binary @processed-metrics/metrics.prom \
          "$PROMETHEUS_PUSHGATEWAY_URL/metrics/job/test-metrics/instance/${{ github.run_id }}"
          
    - name: Comment PR with Metrics Summary
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const summary = JSON.parse(fs.readFileSync('./processed-metrics/summary.json'));
          
          const comment = `## 📊 Test Metrics Summary
          
          **Total Tests**: ${summary.total_tests}
          **Passed**: ${summary.passed} ✅
          **Failed**: ${summary.failed} ❌
          **Skipped**: ${summary.skipped} ⏭️
          
          **Duration**: ${(summary.duration_ms / 1000).toFixed(2)}s
          **Mean Test Duration**: ${summary.stats.mean_duration_ms.toFixed(2)}ms
          **P95 Duration**: ${summary.stats.p95_duration_ms.toFixed(2)}ms
          
          **Coverage**: ${summary.coverage?.lines.percentage.toFixed(2)}%
          
          [View Full Report](https://metrics.your-org.com/dashboard/${context.issue.number})`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment,
          });
```

### **GitLab CI Integration**

```yaml
stages:
  - test
  - metrics

variables:
  TEST_METRICS_DIR: "./test-metrics"
  METRICS_API_URL: "https://metrics.your-org.com/api/v1/ingest"

test:metrics:
  stage: test
  image: node:20
  services:
    - name: your-org/metrics-collector:latest
      alias: metrics-collector
  
  before_script:
    - npm ci
    - export METRICS_STREAM_URL="ws://metrics-collector:3000/metrics"
    
  script:
    - npm run test:all -- --metrics
    
  after_script:
    - |
      # Process metrics
      node scripts/aggregate-metrics.js \
        --input=$TEST_METRICS_DIR \
        --output=metrics-summary.json
        
      # Send to API
      curl -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $METRICS_API_TOKEN" \
        -d @metrics-summary.json \
        $METRICS_API_URL
        
  artifacts:
    when: always
    paths:
      - test-metrics/
      - coverage/
    reports:
      junit: test-results/junit.xml
    expire_in: 30 days

metrics:analyze:
  stage: metrics
  image: your-org/metrics-analyzer:latest
  dependencies:
    - test:metrics
    
  script:
    - analyze-trends --input=test-metrics/ --previous=30d
    - detect-flaky-tests --threshold=0.1
    - generate-report --format=html --output=metrics-report.html
    
  artifacts:
    paths:
      - metrics-report.html
    expose_as: 'Test Metrics Report'
```

---

## 📈 **Performance Metrics Collection**

### **Advanced Performance Monitoring**

```typescript
import { performance, PerformanceObserver } from 'perf_hooks';
import v8 from 'v8';
import { cpuUsage, memoryUsage } from 'process';

export class PerformanceMetricsCollector {
  private observer?: PerformanceObserver;
  private gcMetrics: any[] = [];
  private resourceMetrics: Map<string, ResourceMetrics> = new Map();

  constructor() {
    this.setupPerformanceObserver();
    this.setupGCTracking();
  }

  private setupPerformanceObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'measure' && entry.name.startsWith('test-')) {
          this.recordTestPerformance(entry);
        }
      });
    });
    
    this.observer.observe({ entryTypes: ['measure', 'mark'] });
  }

  private setupGCTracking(): void {
    if (global.gc) {
      // If --expose-gc flag is used
      const originalGC = global.gc;
      global.gc = () => {
        const before = memoryUsage();
        originalGC();
        const after = memoryUsage();
        
        this.gcMetrics.push({
          timestamp: Date.now(),
          heapFreed: before.heapUsed - after.heapUsed,
          duration: performance.now(),
        });
      };
    }
    
    // V8 heap statistics
    setInterval(() => {
      const heapStats = v8.getHeapStatistics();
      const heapSpaces = v8.getHeapSpaceStatistics();
      
      this.recordHeapMetrics(heapStats, heapSpaces);
    }, 1000);
  }

  startTest(testName: string): void {
    performance.mark(`test-start-${testName}`);
    
    const startCpu = cpuUsage();
    const startMem = memoryUsage();
    
    this.resourceMetrics.set(testName, {
      startTime: performance.now(),
      startCpu,
      startMemory: startMem,
      samples: [],
    });
    
    // Start sampling
    const interval = setInterval(() => {
      const metrics = this.resourceMetrics.get(testName);
      if (!metrics) {
        clearInterval(interval);
        return;
      }
      
      metrics.samples.push({
        timestamp: performance.now(),
        cpu: cpuUsage(startCpu),
        memory: memoryUsage(),
      });
    }, 100); // Sample every 100ms
    
    this.resourceMetrics.get(testName)!.samplingInterval = interval;
  }

  endTest(testName: string): TestPerformanceMetrics {
    performance.mark(`test-end-${testName}`);
    performance.measure(
      `test-${testName}`,
      `test-start-${testName}`,
      `test-end-${testName}`
    );
    
    const metrics = this.resourceMetrics.get(testName);
    if (!metrics) {
      throw new Error(`No metrics found for test: ${testName}`);
    }
    
    // Stop sampling
    if (metrics.samplingInterval) {
      clearInterval(metrics.samplingInterval);
    }
    
    const endCpu = cpuUsage(metrics.startCpu);
    const endMem = memoryUsage();
    const duration = performance.now() - metrics.startTime;
    
    // Calculate statistics
    const cpuSamples = metrics.samples.map(s => 
      (s.cpu.user + s.cpu.system) / 1000 // Convert to ms
    );
    const memSamples = metrics.samples.map(s => 
      s.memory.heapUsed / 1024 / 1024 // Convert to MB
    );
    
    const perfMetrics: TestPerformanceMetrics = {
      duration_ms: duration,
      cpu: {
        total_ms: (endCpu.user + endCpu.system) / 1000,
        user_ms: endCpu.user / 1000,
        system_ms: endCpu.system / 1000,
        percent: ((endCpu.user + endCpu.system) / 1000 / duration) * 100,
        samples: cpuSamples,
        peak_percent: Math.max(...cpuSamples.map(s => (s / duration) * 100)),
      },
      memory: {
        start_heap_mb: metrics.startMemory.heapUsed / 1024 / 1024,
        end_heap_mb: endMem.heapUsed / 1024 / 1024,
        peak_heap_mb: Math.max(...memSamples),
        avg_heap_mb: memSamples.reduce((a, b) => a + b, 0) / memSamples.length,
        start_rss_mb: metrics.startMemory.rss / 1024 / 1024,
        end_rss_mb: endMem.rss / 1024 / 1024,
        external_mb: endMem.external / 1024 / 1024,
        array_buffers_mb: endMem.arrayBuffers / 1024 / 1024,
      },
      gc: this.extractGCMetrics(metrics.startTime, performance.now()),
    };
    
    // Clean up
    this.resourceMetrics.delete(testName);
    
    return perfMetrics;
  }

  private recordTestPerformance(entry: PerformanceEntry): void {
    // Store performance entry for later analysis
    const testName = entry.name.replace('test-', '');
    console.log(`⏱️ Test "${testName}" took ${entry.duration.toFixed(2)}ms`);
  }

  private recordHeapMetrics(stats: any, spaces: any[]): void {
    // Record heap metrics for memory leak detection
    const metrics = {
      timestamp: Date.now(),
      total_heap_size: stats.total_heap_size,
      used_heap_size: stats.used_heap_size,
      heap_size_limit: stats.heap_size_limit,
      spaces: spaces.map(space => ({
        name: space.space_name,
        size: space.space_size,
        used: space.space_used_size,
        available: space.space_available_size,
      })),
    };
    
    // Store or stream metrics
  }

  private extractGCMetrics(startTime: number, endTime: number): any {
    const relevantGCs = this.gcMetrics.filter(
      gc => gc.timestamp >= startTime && gc.timestamp <= endTime
    );
    
    return {
      count: relevantGCs.length,
      total_duration_ms: relevantGCs.reduce((sum, gc) => sum + gc.duration, 0),
      total_heap_freed_mb: relevantGCs.reduce((sum, gc) => sum + gc.heapFreed, 0) / 1024 / 1024,
    };
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Clear all intervals
    this.resourceMetrics.forEach(metrics => {
      if (metrics.samplingInterval) {
        clearInterval(metrics.samplingInterval);
      }
    });
  }
}

interface ResourceMetrics {
  startTime: number;
  startCpu: any;
  startMemory: any;
  samples: Array<{
    timestamp: number;
    cpu: any;
    memory: any;
  }>;
  samplingInterval?: NodeJS.Timeout;
}

interface TestPerformanceMetrics {
  duration_ms: number;
  cpu: {
    total_ms: number;
    user_ms: number;
    system_ms: number;
    percent: number;
    samples: number[];
    peak_percent: number;
  };
  memory: {
    start_heap_mb: number;
    end_heap_mb: number;
    peak_heap_mb: number;
    avg_heap_mb: number;
    start_rss_mb: number;
    end_rss_mb: number;
    external_mb: number;
    array_buffers_mb: number;
  };
  gc: {
    count: number;
    total_duration_ms: number;
    total_heap_freed_mb: number;
  };
}
```

---

## 🔨 **Reference Implementation**

### **Unified Metrics Collection Service**

```typescript
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import Redis from 'ioredis';

export class UnifiedMetricsService {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private influx: InfluxDB;
  private elastic: ElasticsearchClient;
  private redis: Redis;

  constructor(private config: MetricsServiceConfig) {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    // Initialize storage backends
    this.influx = new InfluxDB({
      url: config.influxUrl,
      token: config.influxToken,
    });
    
    this.elastic = new ElasticsearchClient({
      node: config.elasticUrl,
      auth: config.elasticAuth,
    });
    
    this.redis = new Redis(config.redisUrl);
    
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupRoutes(): void {
    this.app.use(express.json({ limit: '10mb' }));
    
    // HTTP endpoint for batch metrics
    this.app.post('/api/metrics/batch', async (req, res) => {
      try {
        const { type, data } = req.body;
        
        await this.processMetrics(type, data);
        
        res.json({ success: true, count: data.length });
      } catch (error) {
        console.error('Failed to process metrics:', error);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Query endpoints
    this.app.get('/api/metrics/summary/:suite', async (req, res) => {
      try {
        const summary = await this.getTestSummary(req.params.suite);
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Flaky test detection
    this.app.get('/api/metrics/flaky-tests', async (req, res) => {
      try {
        const flaky = await this.detectFlakyTests(
          parseInt(req.query.days as string) || 7
        );
        res.json(flaky);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleWebSocketMessage(data, ws);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: error.message }));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }

  private async handleWebSocketMessage(data: any, ws: WebSocket): Promise<void> {
    switch (data.type) {
      case 'test_metric':
        await this.storeTestMetric(data.data);
        // Broadcast to other connected clients for real-time dashboard
        this.broadcast(data, ws);
        break;
        
      case 'batch_metrics':
        await this.processMetrics('batch_metrics', data.data);
        break;
        
      case 'suite_summary':
        await this.storeSuiteSummary(data.data);
        break;
        
      case 'subscribe':
        // Handle real-time subscription
        this.handleSubscription(data.channel, ws);
        break;
    }
  }

  private async storeTestMetric(metric: TestMetric): Promise<void> {
    // Store in InfluxDB for time-series analysis
    const point = new Point('test_metrics')
      .tag('runner', metric.runner)
      .tag('suite', metric.suite)
      .tag('test', metric.test)
      .tag('status', metric.status)
      .tag('environment', metric.environment.os)
      .tag('ci_provider', metric.environment.ci_provider || 'local')
      .tag('branch', metric.environment.branch || 'unknown')
      .floatField('duration_ms', metric.duration_ms)
      .floatField('cpu_percent', metric.performance?.cpu_percent || 0)
      .floatField('memory_mb', metric.performance?.memory_mb || 0)
      .timestamp(new Date(metric.start_time));
    
    const writeApi = this.influx.getWriteApi(
      this.config.influxOrg,
      this.config.influxBucket
    );
    
    writeApi.writePoint(point);
    await writeApi.close();
    
    // Store detailed result in Elasticsearch
    await this.elastic.index({
      index: `test-metrics-${new Date().toISOString().split('T')[0]}`,
      body: metric,
    });
    
    // Update real-time metrics in Redis
    await this.updateRealtimeMetrics(metric);
  }

  private async storeSuiteSummary(summary: TestSuiteMetrics): Promise<void> {
    // Store summary in InfluxDB
    const point = new Point('suite_metrics')
      .tag('suite_name', summary.suite_name)
      .intField('total_tests', summary.total_tests)
      .intField('passed', summary.passed)
      .intField('failed', summary.failed)
      .intField('skipped', summary.skipped)
      .floatField('duration_ms', summary.duration_ms)
      .floatField('mean_duration_ms', summary.stats.mean_duration_ms)
      .floatField('p95_duration_ms', summary.stats.p95_duration_ms)
      .floatField('peak_cpu_percent', summary.resource_usage.peak_cpu_percent)
      .floatField('peak_memory_mb', summary.resource_usage.peak_memory_mb)
      .timestamp(new Date(summary.start_time));
    
    const writeApi = this.influx.getWriteApi(
      this.config.influxOrg,
      this.config.influxBucket
    );
    
    writeApi.writePoint(point);
    await writeApi.close();
    
    // Store in Elasticsearch for detailed analysis
    await this.elastic.index({
      index: 'suite-summaries',
      body: summary,
    });
  }

  private async updateRealtimeMetrics(metric: TestMetric): Promise<void> {
    const key = `metrics:realtime:${metric.suite}`;
    
    await this.redis.hincrby(key, 'total', 1);
    await this.redis.hincrby(key, metric.status, 1);
    await this.redis.hincrbyfloat(key, 'total_duration', metric.duration_ms);
    
    // Set expiry
    await this.redis.expire(key, 3600); // 1 hour
  }

  private async processMetrics(type: string, metrics: TestMetric[]): Promise<void> {
    // Process in batches for efficiency
    const batchSize = 100;
    
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      
      await Promise.all([
        this.batchStoreInflux(batch),
        this.batchStoreElastic(batch),
        this.batchUpdateRedis(batch),
      ]);
    }
  }

  private async batchStoreInflux(metrics: TestMetric[]): Promise<void> {
    const writeApi = this.influx.getWriteApi(
      this.config.influxOrg,
      this.config.influxBucket
    );
    
    metrics.forEach(metric => {
      const point = new Point('test_metrics')
        .tag('runner', metric.runner)
        .tag('suite', metric.suite)
        .tag('test', metric.test)
        .tag('status', metric.status)
        .floatField('duration_ms', metric.duration_ms)
        .timestamp(new Date(metric.start_time));
      
      writeApi.writePoint(point);
    });
    
    await writeApi.close();
  }

  private async batchStoreElastic(metrics: TestMetric[]): Promise<void> {
    const operations = metrics.flatMap(metric => [
      { index: { _index: `test-metrics-${new Date().toISOString().split('T')[0]}` } },
      metric
    ]);
    
    await this.elastic.bulk({ operations });
  }

  private async batchUpdateRedis(metrics: TestMetric[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    metrics.forEach(metric => {
      const key = `metrics:realtime:${metric.suite}`;
      pipeline.hincrby(key, 'total', 1);
      pipeline.hincrby(key, metric.status, 1);
      pipeline.expire(key, 3600);
    });
    
    await pipeline.exec();
  }

  private async detectFlakyTests(days: number): Promise<any[]> {
    const query = {
      index: 'test-metrics-*',
      body: {
        size: 0,
        query: {
          range: {
            start_time: {
              gte: `now-${days}d`,
            },
          },
        },
        aggs: {
          tests: {
            terms: {
              field: 'test.keyword',
              size: 1000,
            },
            aggs: {
              statuses: {
                terms: {
                  field: 'status.keyword',
                },
              },
              failure_rate: {
                bucket_script: {
                  buckets_path: {
                    failed: 'statuses["failed"]>_count',
                    total: '_count',
                  },
                  script: 'params.failed / params.total',
                },
              },
            },
          },
        },
      },
    };
    
    const result = await this.elastic.search(query);
    
    // Filter tests with inconsistent results
    const flaky = result.body.aggregations.tests.buckets
      .filter((bucket: any) => {
        const statuses = bucket.statuses.buckets;
        const hasPass = statuses.some((s: any) => s.key === 'passed');
        const hasFail = statuses.some((s: any) => s.key === 'failed');
        return hasPass && hasFail;
      })
      .map((bucket: any) => ({
        test: bucket.key,
        total_runs: bucket.doc_count,
        failure_rate: bucket.failure_rate.value,
        statuses: bucket.statuses.buckets,
      }));
    
    return flaky;
  }

  private async getTestSummary(suite: string): Promise<any> {
    const summary = await this.redis.hgetall(`metrics:realtime:${suite}`);
    
    return {
      suite,
      total: parseInt(summary.total || '0'),
      passed: parseInt(summary.passed || '0'),
      failed: parseInt(summary.failed || '0'),
      skipped: parseInt(summary.skipped || '0'),
      average_duration: parseFloat(summary.total_duration || '0') / parseInt(summary.total || '1'),
      last_updated: new Date().toISOString(),
    };
  }

  private broadcast(data: any, sender: WebSocket): void {
    this.wss.clients.forEach(client => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  private handleSubscription(channel: string, ws: WebSocket): void {
    // Implement channel-based subscriptions for real-time updates
    // This could use Redis pub/sub for scalability
  }

  start(): void {
    const port = this.config.port || 3000;
    
    this.server.listen(port, () => {
      console.log(`📊 Unified Metrics Service running on port ${port}`);
    });
  }
}

interface MetricsServiceConfig {
  port?: number;
  influxUrl: string;
  influxToken: string;
  influxOrg: string;
  influxBucket: string;
  elasticUrl: string;
  elasticAuth?: any;
  redisUrl: string;
}

// Start the service
const service = new UnifiedMetricsService({
  influxUrl: process.env.INFLUX_URL || 'http://localhost:8086',
  influxToken: process.env.INFLUX_TOKEN!,
  influxOrg: process.env.INFLUX_ORG || 'your-org',
  influxBucket: process.env.INFLUX_BUCKET || 'test-metrics',
  elasticUrl: process.env.ELASTIC_URL || 'http://localhost:9200',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
});

service.start();
```

---

## 🎯 **Best Practices and Recommendations**

### **Implementation Checklist**

1. **Standardize Schema**
   - ✅ Use unified TestMetric interface across all runners
   - ✅ Include environment and performance data
   - ✅ Add extensible metadata fields

2. **Real-Time Streaming**
   - ✅ Implement WebSocket streaming for live dashboards
   - ✅ Buffer metrics for reliability
   - ✅ Support both push and pull models

3. **Storage Strategy**
   - ✅ Time-series DB for metrics (InfluxDB/Prometheus)
   - ✅ Document store for detailed results (Elasticsearch)
   - ✅ Cache for real-time data (Redis)

4. **CI/CD Integration**
   - ✅ Artifact collection in all major CI platforms
   - ✅ Automated metrics processing
   - ✅ PR comments with summaries

5. **Performance Monitoring**
   - ✅ CPU and memory tracking
   - ✅ Test duration analysis
   - ✅ Resource usage trends

6. **Flakiness Detection**
   - ✅ Historical analysis
   - ✅ Automated alerts
   - ✅ Retry tracking

---

**This comprehensive guide provides production-ready patterns for capturing test metrics across all major Node.js test runners, enabling powerful observability and insights into test suite performance and reliability.**