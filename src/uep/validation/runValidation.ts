#!/usr/bin/env ts-node

/**
 * System Validation Runner
 * 
 * Executes comprehensive real-world testing of the Meta Agent Autonomy system.
 * No mocks, no test data - this validates the actual working system.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs-extra';
import { runSystemValidation, SystemValidator } from './SystemValidator';

// Load environment variables
dotenv.config();

/**
 * Environment check
 */
async function checkEnvironment(): Promise<boolean> {
  console.log('🔍 Checking environment setup...');

  const requiredEnvVars = [
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and ensure these variables are set.');
    return false;
  }

  console.log('✅ Environment variables configured');

  // Test Redis connectivity
  try {
    const { Redis } = require('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
      automaticDeserialization: false,
    });

    const pingResult = await redis.ping();
    if (pingResult !== 'PONG') {
      console.error('❌ Redis connectivity test failed');
      return false;
    }

    console.log('✅ Redis connectivity confirmed');
  } catch (error) {
    console.error('❌ Redis connection error:', error);
    return false;
  }

  return true;
}

/**
 * Print validation summary
 */
function printValidationSummary(report: any): void {
  console.log('\n' + '='.repeat(80));
  console.log('🎯 SYSTEM VALIDATION COMPLETE');
  console.log('='.repeat(80));
  
  // Overall status
  const statusEmoji = report.overallStatus === 'PASSED' ? '✅' : 
                     report.overallStatus === 'PARTIAL' ? '⚠️' : '❌';
  console.log(`${statusEmoji} Overall Status: ${report.overallStatus}`);
  
  // Test results
  console.log(`📊 Test Results: ${report.passedTests}/${report.totalTests} passed`);
  console.log(`⏱️  Total Duration: ${(report.duration / 1000).toFixed(2)}s`);
  
  // Failed tests
  if (report.failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    report.results
      .filter((r: any) => !r.passed)
      .forEach((test: any) => {
        console.log(`   - ${test.testName}: ${test.error}`);
      });
  }

  // System health
  console.log('\n🏥 SYSTEM HEALTH:');
  const health = report.systemHealth;
  console.log(`   - System Health: ${health.systemHealth}`);
  console.log(`   - Active Agents: ${health.projectStats?.agentStats?.total || 0}`);
  console.log(`   - Total Tasks: ${health.projectStats?.taskStats?.total || 0}`);
  console.log(`   - Performance Monitoring: ${health.performance?.isMonitoring ? 'Active' : 'Inactive'}`);
  console.log(`   - Escalation Engine: ${health.escalation?.initialized ? 'Initialized' : 'Not Initialized'}`);

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach((rec: string) => {
      console.log(`   ${rec}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Debug issues
 */
async function debugIssues(report: any): Promise<void> {
  const failedTests = report.results.filter((r: any) => !r.passed);
  
  if (failedTests.length === 0) {
    console.log('🎉 No issues to debug - all tests passed!');
    return;
  }

  console.log('\n🔧 DEBUGGING FAILED TESTS...');
  
  for (const test of failedTests) {
    console.log(`\n🐛 Debugging: ${test.testName}`);
    console.log(`   Error: ${test.error}`);
    console.log(`   Duration: ${test.duration}ms`);
    
    // Provide specific debugging guidance
    if (test.testName.includes('Redis')) {
      console.log('   💡 Check Redis connection and credentials');
      console.log('   💡 Verify KV_REST_API_URL and KV_REST_API_TOKEN');
    } else if (test.testName.includes('Performance')) {
      console.log('   💡 Check system resources and network latency');
      console.log('   💡 Consider increasing timeout thresholds');
    } else if (test.testName.includes('Agent')) {
      console.log('   💡 Check agent registration and status tracking');
      console.log('   💡 Verify agent metadata and capabilities');
    } else if (test.testName.includes('Task')) {
      console.log('   💡 Check task creation and status updates');
      console.log('   💡 Verify task dependencies and lifecycle');
    } else if (test.testName.includes('Integration')) {
      console.log('   💡 Check component initialization order');
      console.log('   💡 Verify event synchronization');
    }
  }

  // Suggest retry
  if (failedTests.some((t: any) => t.error?.includes('timeout') || t.error?.includes('connection'))) {
    console.log('\n🔄 Some failures may be transient. Consider retrying the validation.');
  }
}

/**
 * Validate system configuration
 */
async function validateSystemConfiguration(): Promise<boolean> {
  console.log('⚙️  Validating system configuration...');

  try {
    // Check if required files exist
    const requiredFiles = [
      'src/uep/ProjectContextManager.ts',
      'src/uep/ProjectContextIntegration.ts',
      'src/uep/IOAIntegration.ts',
      'src/uep/EscalationEngine.ts',
      'src/uep/PerformanceMonitor.ts',
      'src/uep/interfaces/IProjectContext.ts'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (!await fs.pathExists(filePath)) {
        console.error(`❌ Required file missing: ${file}`);
        return false;
      }
    }

    console.log('✅ All required system files present');

    // Check TypeScript compilation
    try {
      require('../ProjectContextManager');
      require('../ProjectContextIntegration');
      require('../IOAIntegration');
      require('../EscalationEngine');
      require('../PerformanceMonitor');
      console.log('✅ TypeScript modules load successfully');
    } catch (error) {
      console.error('❌ TypeScript compilation error:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ System configuration validation failed:', error);
    return false;
  }
}

/**
 * Generate detailed report
 */
async function generateDetailedReport(report: any): Promise<void> {
  try {
    const reportDir = path.join(process.cwd(), '.validation-reports');
    await fs.ensureDir(reportDir);

    // Generate markdown report
    const markdownReport = `
# System Validation Report

**Generated:** ${new Date().toISOString()}  
**Status:** ${report.overallStatus}  
**Duration:** ${(report.duration / 1000).toFixed(2)}s

## Summary

- **Total Tests:** ${report.totalTests}
- **Passed:** ${report.passedTests}
- **Failed:** ${report.failedTests}
- **Success Rate:** ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%

## Test Results

${report.results.map((test: any) => `
### ${test.passed ? '✅' : '❌'} ${test.testName}

- **Status:** ${test.passed ? 'PASSED' : 'FAILED'}
- **Duration:** ${test.duration}ms
- **Timestamp:** ${test.timestamp}
${test.error ? `- **Error:** ${test.error}` : ''}
${test.details ? `- **Details:** \`\`\`json\n${JSON.stringify(test.details, null, 2)}\n\`\`\`` : ''}
`).join('\n')}

## System Health

\`\`\`json
${JSON.stringify(report.systemHealth, null, 2)}
\`\`\`

## Recommendations

${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

---
*Generated by Meta Agent Autonomy System Validator*
`;

    const markdownPath = path.join(reportDir, 'validation-report.md');
    await fs.writeFile(markdownPath, markdownReport);

    console.log(`📄 Detailed report saved: ${markdownPath}`);

  } catch (error) {
    console.error('❌ Failed to generate detailed report:', error);
  }
}

/**
 * Main validation runner
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Meta Agent Autonomy System Validation');
  console.log('📅 ' + new Date().toISOString());
  console.log('🏗️  Using REAL components and REAL data\n');

  try {
    // Step 1: Environment check
    const envOk = await checkEnvironment();
    if (!envOk) {
      console.error('💥 Environment check failed - cannot proceed');
      process.exit(1);
    }

    // Step 2: System configuration check
    const configOk = await validateSystemConfiguration();
    if (!configOk) {
      console.error('💥 System configuration validation failed - cannot proceed');
      process.exit(1);
    }

    // Step 3: Run comprehensive validation
    console.log('🏃 Running comprehensive system validation...\n');
    const report = await runSystemValidation();

    // Step 4: Print summary
    printValidationSummary(report);

    // Step 5: Debug issues if any
    await debugIssues(report);

    // Step 6: Generate detailed report
    await generateDetailedReport(report);

    // Step 7: Exit with appropriate code
    if (report.overallStatus === 'PASSED') {
      console.log('\n🎉 SYSTEM VALIDATION SUCCESSFUL!');
      console.log('✅ Meta Agent Autonomy system is working correctly');
      console.log('🚀 System is ready for production use');
      process.exit(0);
    } else if (report.overallStatus === 'PARTIAL') {
      console.log('\n⚠️  PARTIAL SUCCESS - Some issues detected');
      console.log('🔧 Review failed tests and apply recommended fixes');
      process.exit(1);
    } else {
      console.log('\n💥 VALIDATION FAILED');
      console.log('❌ System has critical issues that must be resolved');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 VALIDATION CRASHED:', error);
    console.error('🔧 Check logs above for debugging information');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Main execution failed:', error);
    process.exit(1);
  });
}

export { main as runValidation };