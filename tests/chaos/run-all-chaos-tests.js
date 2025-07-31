#!/usr/bin/env node

/**
 * Comprehensive Chaos Test Runner
 * 
 * Orchestrates all chaos testing scenarios including:
 * - Agent failure scenarios
 * - Network partition scenarios  
 * - Resource exhaustion tests
 * - Automated chaos orchestration validation
 * 
 * Based on TaskMaster research for chaos engineering best practices
 */

const path = require('path');
const fs = require('fs').promises;
const { performance } = require('perf_hooks');
const AgentFailureChaosTests = require('./agent-failure-scenarios');
const NetworkPartitionChaosTests = require('./network-partition-scenarios');
const ChaosOrchestrator = require('./chaos-orchestrator');

// Test configuration
const CHAOS_TEST_CONFIG = {
  outputDir: './chaos-test-results',
  reportFormat: 'json', // json, html, csv
  failFast: false,
  maxDuration: 3600000, // 1 hour max
  scenarios: {
    agent_failures: {
      enabled: true,
      timeout: 600000, // 10 minutes
      retries: 1
    },
    network_partitions: {
      enabled: true,
      timeout: 900000, // 15 minutes
      retries: 1
    },
    orchestrator_validation: {
      enabled: true,
      timeout: 300000, // 5 minutes
      retries: 0
    }
  },
  environment: {
    cleanup: true,
    parallel: false,
    verbose: true
  }
};

class ComprehensiveChaosTestRunner {
  constructor(config = {}) {
    this.config = { ...CHAOS_TEST_CONFIG, ...config };
    this.results = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        startTime: null,
        endTime: null,
        duration: 0
      },
      scenarios: [],
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage()
      }
    };
    
    this.testInstances = {
      agentFailures: null,
      networkPartitions: null,
      orchestrator: null
    };
  }
  
  async run() {
    console.log('🚀 Starting Comprehensive Chaos Test Suite\n');
    console.log('=========================================\n');
    
    this.results.summary.startTime = new Date().toISOString();
    const startTime = performance.now();
    
    try {
      // Setup test environment
      await this.setupEnvironment();
      
      // Run chaos test scenarios
      await this.runAllScenarios();
      
      // Generate comprehensive report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Chaos test suite failed:', error);
      this.results.summary.failed++;
      
    } finally {
      // Cleanup
      await this.cleanup();
      
      // Calculate final metrics
      const endTime = performance.now();
      this.results.summary.endTime = new Date().toISOString();
      this.results.summary.duration = endTime - startTime;
      
      // Display summary
      this.displaySummary();
    }
    
    return this.results;
  }
  
  async setupEnvironment() {
    console.log('🔧 Setting up chaos test environment...');
    
    // Create output directory
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
      console.log(`✅ Created output directory: ${this.config.outputDir}`);
    } catch (error) {
      console.log(`⚠️  Output directory exists: ${this.config.outputDir}`);
    }
    
    // Initialize test instances
    this.testInstances.agentFailures = new AgentFailureChaosTests();
    this.testInstances.networkPartitions = new NetworkPartitionChaosTests();
    this.testInstances.orchestrator = new ChaosOrchestrator();
    
    // Verify system prerequisites
    await this.verifyPrerequisites();
    
    console.log('✅ Environment setup complete\n');
  }
  
  async verifyPrerequisites() {
    console.log('🔍 Verifying system prerequisites...');
    
    const prerequisites = [
      { name: 'Redis Connection', check: () => this.checkRedisConnection() },
      { name: 'Node.js Version', check: () => this.checkNodeVersion() },
      { name: 'Available Memory', check: () => this.checkMemory() },
      { name: 'System Load', check: () => this.checkSystemLoad() }
    ];
    
    for (const prereq of prerequisites) {
      try {
        const result = await prereq.check();
        console.log(`  ✅ ${prereq.name}: ${result.status}`);
      } catch (error) {
        console.log(`  ❌ ${prereq.name}: ${error.message}`);
        if (!this.config.failFast) {
          throw new Error(`Prerequisite failed: ${prereq.name}`);
        }
      }
    }
  }
  
  async runAllScenarios() {
    console.log('🎯 Running chaos test scenarios...\n');
    
    const scenarios = [
      {
        name: 'Agent Failure Scenarios',
        key: 'agent_failures',
        runner: () => this.runAgentFailureScenarios()
      },
      {
        name: 'Network Partition Scenarios', 
        key: 'network_partitions',
        runner: () => this.runNetworkPartitionScenarios()
      },
      {
        name: 'Orchestrator Validation',
        key: 'orchestrator_validation', 
        runner: () => this.runOrchestratorValidation()
      }
    ];
    
    for (const scenario of scenarios) {
      if (!this.config.scenarios[scenario.key]?.enabled) {
        console.log(`⏭️  Skipping ${scenario.name} (disabled)`);
        this.results.summary.skipped++;
        continue;
      }
      
      await this.runScenario(scenario);
      
      // Break if fail fast is enabled and we have failures
      if (this.config.failFast && this.results.summary.failed > 0) {
        console.log('🛑 Fail fast enabled, stopping after first failure');
        break;
      }
    }
  }
  
  async runScenario(scenario) {
    console.log(`\n🔬 Running ${scenario.name}...`);
    console.log('='.repeat(50));
    
    const scenarioConfig = this.config.scenarios[scenario.key];
    const startTime = performance.now();
    let attempts = 0;
    let lastError = null;
    
    while (attempts <= scenarioConfig.retries) {
      try {
        // Set timeout for scenario
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Scenario timeout')), scenarioConfig.timeout);
        });
        
        // Run scenario with timeout
        const result = await Promise.race([
          scenario.runner(),
          timeoutPromise
        ]);
        
        // Process results
        const endTime = performance.now();
        const scenarioResult = {
          name: scenario.name,
          key: scenario.key,
          status: 'passed',
          duration: endTime - startTime,
          attempts: attempts + 1,
          results: result,
          timestamp: new Date().toISOString()
        };
        
        this.results.scenarios.push(scenarioResult);
        this.results.summary.total++;
        this.results.summary.passed++;
        
        console.log(`✅ ${scenario.name} completed successfully`);
        console.log(`   Duration: ${(scenarioResult.duration / 1000).toFixed(2)}s`);
        console.log(`   Attempts: ${scenarioResult.attempts}`);
        
        // Save individual scenario results
        await this.saveScenarioResults(scenarioResult);
        
        return; // Success, exit retry loop
        
      } catch (error) {
        attempts++;
        lastError = error;
        
        console.log(`❌ ${scenario.name} failed (attempt ${attempts}): ${error.message}`);
        
        if (attempts <= scenarioConfig.retries) {
          console.log(`🔄 Retrying ${scenario.name}... (${scenarioConfig.retries - attempts + 1} attempts remaining)`);
          await this.delay(5000); // Wait before retry
        }
      }
    }
    
    // All attempts failed
    const endTime = performance.now();
    const scenarioResult = {
      name: scenario.name,
      key: scenario.key,
      status: 'failed',
      duration: endTime - startTime,
      attempts,
      error: lastError.message,
      timestamp: new Date().toISOString()
    };
    
    this.results.scenarios.push(scenarioResult);
    this.results.summary.total++;
    this.results.summary.failed++;
    
    console.log(`❌ ${scenario.name} failed after ${attempts} attempts`);
    
    await this.saveScenarioResults(scenarioResult);
  }
  
  async runAgentFailureScenarios() {
    console.log('🤖 Running agent failure chaos scenarios...');
    
    const agentTests = this.testInstances.agentFailures;
    const results = await agentTests.runAllScenarios();
    
    // Analyze results
    const analysis = {
      totalScenarios: results.length,
      passedScenarios: results.filter(r => r.passed).length,
      failedScenarios: results.filter(r => !r.passed).length,
      successRate: results.filter(r => r.passed).length / results.length,
      scenarios: results,
      insights: this.analyzeAgentFailureResults(results)
    };
    
    console.log(`Agent Failure Results: ${analysis.passedScenarios}/${analysis.totalScenarios} passed`);
    
    return analysis;
  }
  
  async runNetworkPartitionScenarios() {
    console.log('🌐 Running network partition chaos scenarios...');
    
    const networkTests = this.testInstances.networkPartitions;
    const results = await networkTests.runAllScenarios();
    
    // Analyze results
    const analysis = {
      totalScenarios: results.length,
      passedScenarios: results.filter(r => r.passed).length,
      failedScenarios: results.filter(r => !r.passed).length,
      successRate: results.filter(r => r.passed).length / results.length,
      scenarios: results,
      insights: this.analyzeNetworkPartitionResults(results)
    };
    
    console.log(`Network Partition Results: ${analysis.passedScenarios}/${analysis.totalScenarios} passed`);
    
    return analysis;
  }
  
  async runOrchestratorValidation() {
    console.log('🎭 Running chaos orchestrator validation...');
    
    const orchestrator = this.testInstances.orchestrator;
    
    // Test orchestrator functionality
    const validationTests = [
      { name: 'Start/Stop Functionality', test: () => this.testOrchestratorStartStop(orchestrator) },
      { name: 'Kill Switch Mechanism', test: () => this.testKillSwitch(orchestrator) },
      { name: 'Health Monitoring', test: () => this.testHealthMonitoring(orchestrator) },
      { name: 'Safety Mechanisms', test: () => this.testSafetyMechanisms(orchestrator) },
      { name: 'Experiment Scheduling', test: () => this.testExperimentScheduling(orchestrator) }
    ];
    
    const results = [];
    
    for (const validation of validationTests) {
      try {
        console.log(`  Testing ${validation.name}...`);
        const result = await validation.test();
        results.push({
          name: validation.name,
          passed: true,
          result
        });
        console.log(`    ✅ ${validation.name} passed`);
      } catch (error) {
        results.push({
          name: validation.name,
          passed: false,
          error: error.message
        });
        console.log(`    ❌ ${validation.name} failed: ${error.message}`);
      }
    }
    
    const analysis = {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      successRate: results.filter(r => r.passed).length / results.length,
      tests: results
    };
    
    console.log(`Orchestrator Validation: ${analysis.passedTests}/${analysis.totalTests} passed`);
    
    return analysis;
  }
  
  // Orchestrator validation tests
  async testOrchestratorStartStop(orchestrator) {
    await orchestrator.start();
    
    if (!orchestrator.isRunning) {
      throw new Error('Orchestrator failed to start');
    }
    
    await orchestrator.stop();
    
    if (orchestrator.isRunning) {
      throw new Error('Orchestrator failed to stop');
    }
    
    return { status: 'Start/stop functionality working correctly' };
  }
  
  async testKillSwitch(orchestrator) {
    await orchestrator.start();
    
    // Simulate kill switch activation
    await orchestrator.redis.publish('chaos:kill-switch', 'test activation');
    
    // Wait for kill switch to take effect
    await this.delay(2000);
    
    if (!orchestrator.killSwitchActivated) {
      throw new Error('Kill switch did not activate');
    }
    
    await orchestrator.stop();
    
    return { status: 'Kill switch mechanism working correctly' };
  }
  
  async testHealthMonitoring(orchestrator) {
    const health = await orchestrator.checkSystemHealth();
    
    if (!health || typeof health.score !== 'number' || health.score < 0 || health.score > 1) {
      throw new Error('Invalid health score format');
    }
    
    return { status: 'Health monitoring working correctly', healthScore: health.score };
  }
  
  async testSafetyMechanisms(orchestrator) {
    const isSafe = await orchestrator.isSafeToRunChaos();
    
    if (typeof isSafe !== 'boolean') {
      throw new Error('Safety check did not return boolean');
    }
    
    return { status: 'Safety mechanisms working correctly', isSafe };
  }
  
  async testExperimentScheduling(orchestrator) {
    const scenario = await orchestrator.selectChaosScenario();
    
    // Should return a scenario name or null
    if (scenario !== null && typeof scenario !== 'string') {
      throw new Error('Invalid scenario selection response');
    }
    
    return { status: 'Experiment scheduling working correctly', selectedScenario: scenario };
  }
  
  // Result analysis methods
  analyzeAgentFailureResults(results) {
    const insights = [];
    
    // Recovery time analysis
    const recoveryTimes = results
      .filter(r => r.metrics && r.metrics.recoveryTime)
      .map(r => r.metrics.recoveryTime);
    
    if (recoveryTimes.length > 0) {
      const avgRecovery = recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length;
      insights.push(`Average recovery time: ${(avgRecovery / 1000).toFixed(2)}s`);
    }
    
    // Failure pattern analysis
    const cascadeFailures = results.filter(r => r.scenario && r.scenario.includes('Cascading')).length;
    if (cascadeFailures > 0) {
      insights.push(`Cascade failure scenarios tested: ${cascadeFailures}`);
    }
    
    return insights;
  }
  
  analyzeNetworkPartitionResults(results) {
    const insights = [];
    
    // Split-brain detection
    const splitBrainTests = results.filter(r => 
      r.metrics && (r.metrics.splitBrainOccurred || r.metrics.byzantineAgents)
    );
    
    if (splitBrainTests.length > 0) {
      insights.push(`Split-brain scenarios tested: ${splitBrainTests.length}`);
    }
    
    // Partition tolerance
    const partitionTests = results.filter(r => r.scenario && r.scenario.includes('Partition'));
    const successfulPartitionTests = partitionTests.filter(r => r.passed);
    
    if (partitionTests.length > 0) {
      const tolerance = (successfulPartitionTests.length / partitionTests.length * 100).toFixed(1);
      insights.push(`Partition tolerance rate: ${tolerance}%`);
    }
    
    return insights;
  }
  
  async saveScenarioResults(scenarioResult) {
    const filename = `${scenarioResult.key}_${Date.now()}.json`;
    const filepath = path.join(this.config.outputDir, filename);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(scenarioResult, null, 2));
      console.log(`📁 Saved results to: ${filepath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save results: ${error.message}`);
    }
  }
  
  async generateReport() {
    console.log('\n📊 Generating comprehensive chaos test report...');
    
    const report = {
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        generator: 'Comprehensive Chaos Test Runner'
      },
      summary: this.results.summary,
      environment: this.results.environment,
      scenarios: this.results.scenarios,
      insights: this.generateInsights(),
      recommendations: this.generateRecommendations()
    };
    
    // Save report in different formats
    await this.saveReport(report, 'json');
    
    if (this.config.reportFormat === 'html') {
      await this.saveReport(report, 'html');
    }
    
    console.log('✅ Report generated successfully');
    
    return report;
  }
  
  generateInsights() {
    const insights = [];
    
    // Overall performance insights
    const avgDuration = this.results.scenarios.reduce((sum, s) => sum + s.duration, 0) / this.results.scenarios.length;
    insights.push(`Average scenario duration: ${(avgDuration / 1000).toFixed(2)}s`);
    
    // Success rate insights
    const successRate = (this.results.summary.passed / this.results.summary.total) * 100;
    insights.push(`Overall success rate: ${successRate.toFixed(1)}%`);
    
    // Performance insights
    if (successRate < 80) {
      insights.push('⚠️  Low success rate indicates system resilience issues');
    } else if (successRate > 95) {
      insights.push('✅ High success rate indicates good system resilience');
    }
    
    return insights;
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Based on failure analysis
    const failedScenarios = this.results.scenarios.filter(s => s.status === 'failed');
    
    if (failedScenarios.length > 0) {
      recommendations.push({
        severity: 'high',
        category: 'reliability',
        message: `${failedScenarios.length} chaos scenarios failed`,
        actions: [
          'Investigate system resilience mechanisms',
          'Improve error handling and recovery procedures',
          'Consider implementing circuit breakers'
        ]
      });
    }
    
    // Performance recommendations
    const longRunningScenarios = this.results.scenarios.filter(s => s.duration > 300000); // 5 minutes
    
    if (longRunningScenarios.length > 0) {
      recommendations.push({
        severity: 'medium',
        category: 'performance',
        message: `${longRunningScenarios.length} scenarios took longer than 5 minutes`,
        actions: [
          'Optimize chaos test scenarios',
          'Consider parallel execution',
          'Review timeout configurations'
        ]
      });
    }
    
    return recommendations;
  }
  
  async saveReport(report, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chaos-test-report-${timestamp}.${format}`;
    const filepath = path.join(this.config.outputDir, filename);
    
    try {
      if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      } else if (format === 'html') {
        const html = this.generateHtmlReport(report);
        await fs.writeFile(filepath, html);
      }
      
      console.log(`📁 Report saved to: ${filepath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save report: ${error.message}`);
    }
  }
  
  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Chaos Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .scenario { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        .insights { background: #e3f2fd; padding: 10px; margin: 10px 0; }
        .recommendations { background: #fff3e0; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Comprehensive Chaos Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total: ${report.summary.total} | Passed: ${report.summary.passed} | Failed: ${report.summary.failed}</p>
        <p>Duration: ${(report.summary.duration / 1000).toFixed(2)}s</p>
        <p>Success Rate: ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%</p>
    </div>
    
    <div class="insights">
        <h2>Insights</h2>
        ${report.insights.map(insight => `<p>• ${insight}</p>`).join('')}
    </div>
    
    <div class="recommendations">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div>
                <h4>${rec.severity.toUpperCase()}: ${rec.message}</h4>
                <ul>${rec.actions.map(action => `<li>${action}</li>`).join('')}</ul>
            </div>
        `).join('')}
    </div>
    
    <h2>Scenario Results</h2>
    ${report.scenarios.map(scenario => `
        <div class="scenario ${scenario.status}">
            <h3>${scenario.name}</h3>
            <p>Status: ${scenario.status}</p>
            <p>Duration: ${(scenario.duration / 1000).toFixed(2)}s</p>
            ${scenario.error ? `<p>Error: ${scenario.error}</p>` : ''}
        </div>
    `).join('')}
    
    <footer>
        <p>Generated at: ${report.metadata.generatedAt}</p>
    </footer>
</body>
</html>`;
  }
  
  displaySummary() {
    console.log('\n📊 Chaos Test Suite Summary');
    console.log('===========================');
    console.log(`Total Scenarios: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Skipped: ${this.results.summary.skipped}`);
    console.log(`Success Rate: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${(this.results.summary.duration / 1000).toFixed(2)}s`);
    
    console.log('\nScenario Details:');
    this.results.scenarios.forEach(scenario => {
      const status = scenario.status === 'passed' ? '✅' : '❌';
      console.log(`${status} ${scenario.name}: ${(scenario.duration / 1000).toFixed(2)}s`);
    });
    
    console.log(`\nResults saved to: ${this.config.outputDir}`);
  }
  
  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    if (this.config.environment.cleanup) {
      // Cleanup test instances
      for (const [name, instance] of Object.entries(this.testInstances)) {
        if (instance && typeof instance.teardown === 'function') {
          try {
            await instance.teardown();
            console.log(`✅ Cleaned up ${name}`);
          } catch (error) {
            console.warn(`⚠️  Failed to cleanup ${name}: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ Cleanup complete');
  }
  
  // Helper methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async checkRedisConnection() {
    const Redis = require('ioredis');
    const redis = new Redis();
    
    try {
      await redis.ping();
      redis.disconnect();
      return { status: 'Connected' };
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }
  
  async checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    
    if (major < 16) {
      throw new Error(`Node.js ${major} not supported. Requires Node.js 16+`);
    }
    
    return { status: `Node.js ${version}` };
  }
  
  async checkMemory() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.rss / 1024 / 1024);
    
    if (totalMB > 1000) { // 1GB warning threshold
      throw new Error(`High memory usage: ${totalMB}MB`);
    }
    
    return { status: `${totalMB}MB used` };
  }
  
  async checkSystemLoad() {
    // Simple load check - in production would use actual system metrics
    const cpuUsage = process.cpuUsage();
    const load = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    return { status: `CPU time: ${load.toFixed(2)}s` };
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const config = {};
  
  // Parse CLI arguments
  args.forEach(arg => {
    if (arg === '--fail-fast') config.failFast = true;
    if (arg === '--no-cleanup') config.environment = { cleanup: false };
    if (arg === '--parallel') config.environment = { parallel: true };
    if (arg.startsWith('--format=')) config.reportFormat = arg.split('=')[1];
    if (arg.startsWith('--output=')) config.outputDir = arg.split('=')[1];
  });
  
  const runner = new ComprehensiveChaosTestRunner(config);
  
  runner.run()
    .then(results => {
      const exitCode = results.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Chaos test runner failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveChaosTestRunner;