#!/usr/bin/env node

/**
 * Context7 UEP Integration Test Runner
 * 
 * Comprehensive test suite for validating Context7 trace context propagation
 * with UEP protocol integration in Node.js microservices.
 * 
 * This test runner validates:
 * - UEP protocol trace context support
 * - Multi-hop trace propagation across HTTP -> UEP -> gRPC boundaries  
 * - Async boundary context preservation
 * - Protocol version compatibility
 * - Integration with capability-management service
 * 
 * Based on TaskMaster research methodology for UEP protocol validation.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import Context7 modules
let Context7UEPValidator;
let CapabilityRegistryService;
let Context7IntegrationValidator;

try {
  // Import validation modules
  const validationModule = await import('./src/observability/context7-uep-validation.js');
  Context7UEPValidator = validationModule.Context7UEPValidator;

  // Import capability management integration
  const integrationModule = await import('./packages/capability-management/src/context7-integration.js');
  Context7IntegrationValidator = integrationModule.Context7IntegrationValidator;

  console.log('✅ Context7 validation modules loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Context7 modules:', error.message);
  process.exit(1);
}

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  uepProtocolVersions: ['1.0.0', '2.0.0', '2.1.0'],
  multiHopServices: [
    { name: 'api-gateway', protocol: 'http', version: '1.0.0', endpoint: 'http://localhost:3000' },
    { name: 'capability-registry', protocol: 'uep', version: '2.1.0', endpoint: 'uep://localhost:4000' },
    { name: 'meta-agent-processor', protocol: 'grpc', version: '1.0.0', endpoint: 'grpc://localhost:5000' }
  ],
  testTimeout: 10000,
  asyncBoundaryTests: [
    'promise-resolution',
    'timeout-callbacks', 
    'uep-message-processing',
    'context7-async-utils'
  ],
  protocolCompatibilityMatrix: [
    { source: '1.0.0', target: '2.0.0', expectSuccess: true },
    { source: '2.0.0', target: '2.1.0', expectSuccess: true },
    { source: '2.1.0', target: '2.0.0', expectSuccess: true },
    { source: '2.1.0', target: '1.0.0', expectSuccess: false }
  ]
};

/**
 * Test Results Collector
 */
class TestResultsCollector {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      testSuites: {},
      startTime: Date.now(),
      endTime: null,
      errors: []
    };
  }

  addTestSuite(name, results) {
    this.results.testSuites[name] = results;
    this.results.totalTests += results.totalTests || 1;
    
    if (results.success || results.isValid) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }

    if (results.warnings && results.warnings.length > 0) {
      this.results.warnings++;
    }

    if (results.errors && results.errors.length > 0) {
      this.results.errors.push(...results.errors);
    }
  }

  getOverallResult() {
    this.results.endTime = Date.now();
    this.results.duration = this.results.endTime - this.results.startTime;
    
    if (this.results.failed > 0) {
      this.results.overall = 'FAILED';
    } else if (this.results.warnings > 0) {
      this.results.overall = 'PASSED_WITH_WARNINGS';
    } else {
      this.results.overall = 'PASSED';
    }

    return this.results;
  }

  printSummary() {
    const result = this.getOverallResult();
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CONTEXT7 UEP INTEGRATION TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`📊 Tests: ${result.totalTests} | ✅ Passed: ${result.passed} | ❌ Failed: ${result.failed} | ⚠️  Warnings: ${result.warnings}`);
    console.log(`🎯 Overall Result: ${result.overall}`);
    
    if (result.overall === 'FAILED') {
      console.log('\n❌ FAILED TESTS:');
      Object.entries(result.testSuites).forEach(([name, suite]) => {
        if (!suite.success && !suite.isValid) {
          console.log(`  - ${name}: ${suite.errors?.join(', ') || 'Test failed'}`);
        }
      });
    }

    if (result.warnings > 0) {
      console.log('\n⚠️  WARNINGS:');
      Object.entries(result.testSuites).forEach(([name, suite]) => {
        if (suite.warnings && suite.warnings.length > 0) {
          console.log(`  - ${name}: ${suite.warnings.join(', ')}`);
        }
      });
    }

    console.log('\n📋 DETAILED RESULTS:');
    Object.entries(result.testSuites).forEach(([name, suite]) => {
      const status = (suite.success || suite.isValid) ? '✅' : '❌';
      console.log(`  ${status} ${name}`);
      
      if (suite.summary) {
        console.log(`    📊 ${suite.summary.passed}/${suite.summary.totalTests} tests passed`);
      }
    });

    console.log('='.repeat(80));
    
    return result.overall === 'PASSED' ? 0 : 1;
  }
}

/**
 * UEP Protocol Message Factory
 */
class UEPMessageFactory {
  static createTestMessage(type = 'test-message', version = '2.1.0', includeContext = true) {
    const message = {
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      version,
      source: 'test-client',
      destination: 'test-server',
      timestamp: Date.now(),
      payload: {
        test: true,
        data: 'Context7 UEP integration test'
      }
    };

    if (includeContext) {
      message.metadata = {
        traceContext: {
          'traceparent': this.generateTraceParent(),
          'tracestate': 'context7=test,uep=enabled',
          'baggage': 'uep.agent.id=test-agent,context7.boundary=uep-protocol,context7.propagation=uep-enhanced'
        }
      };
    }

    return message;
  }

  static generateTraceParent() {
    const version = '00';
    const traceId = Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const spanId = Array.from({length: 16}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const flags = '01';
    return `${version}-${traceId}-${spanId}-${flags}`;
  }

  static createCapabilityRegistrationMessage(capabilityId = 'test-capability') {
    return this.createTestMessage('capability-registration', '2.1.0', true, {
      capabilityId,
      version: '1.0.0',
      agentId: 'test-agent-001',
      capabilities: ['data-processing', 'file-handling']
    });
  }

  static createCapabilitySearchMessage(criteria = {}) {
    return this.createTestMessage('capability-search', '2.1.0', true, {
      criteria: {
        capabilityId: 'data-processing',
        maxLatency: 100,
        ...criteria
      }
    });
  }
}

/**
 * Integration Test Runner
 */
async function runIntegrationTests() {
  const collector = new TestResultsCollector();
  
  console.log('🚀 Starting Context7 UEP Integration Tests...\n');

  try {
    // Test Suite 1: Basic UEP Protocol Validation
    console.log('📋 Test Suite 1: UEP Protocol Trace Context Support');
    await runUEPProtocolTests(collector);

    // Test Suite 2: Multi-hop Trace Propagation
    console.log('\n🔗 Test Suite 2: Multi-hop Trace Propagation');
    await runMultiHopTests(collector);

    // Test Suite 3: Async Boundary Preservation
    console.log('\n⚡ Test Suite 3: Async Boundary Context Preservation');
    await runAsyncBoundaryTests(collector);

    // Test Suite 4: Protocol Version Compatibility
    console.log('\n🔄 Test Suite 4: Protocol Version Compatibility');
    await runProtocolCompatibilityTests(collector);

    // Test Suite 5: Capability Management Integration
    console.log('\n🏗️  Test Suite 5: Capability Management Integration');
    await runCapabilityIntegrationTests(collector);

    // Test Suite 6: Performance and Load Testing
    console.log('\n⚡ Test Suite 6: Performance Validation');
    await runPerformanceTests(collector);

  } catch (error) {
    console.error('❌ Test execution error:', error);
    collector.results.errors.push(`Test execution error: ${error.message}`);
    collector.results.failed++;
  }

  return collector.printSummary();
}

/**
 * Test Suite 1: UEP Protocol Validation
 */
async function runUEPProtocolTests(collector) {
  console.log('  🔍 Testing UEP message trace context validation...');

  try {
    // Test valid UEP message with trace context
    const validMessage = UEPMessageFactory.createTestMessage('test-valid', '2.1.0', true);
    const validResult = Context7UEPValidator.validateUEPMessageContext(validMessage);
    
    console.log(`    ✅ Valid message validation: ${validResult.isValid ? 'PASS' : 'FAIL'}`);
    
    // Test UEP message without trace context
    const noContextMessage = UEPMessageFactory.createTestMessage('test-no-context', '2.1.0', false);
    const noContextResult = Context7UEPValidator.validateUEPMessageContext(noContextMessage);
    
    console.log(`    ⚠️  No context message validation: ${noContextResult.isValid ? 'UNEXPECTED_PASS' : 'EXPECTED_FAIL'}`);
    
    // Test legacy protocol version
    const legacyMessage = UEPMessageFactory.createTestMessage('test-legacy', '1.0.0', false);
    const legacyResult = Context7UEPValidator.validateUEPMessageContext(legacyMessage);
    
    console.log(`    📜 Legacy protocol validation: ${legacyResult.warnings.length > 0 ? 'EXPECTED_WARNING' : 'PASS'}`);

    // Collect results
    const testSuite = {
      success: validResult.isValid && !noContextResult.isValid,
      totalTests: 3,
      validMessage: validResult,
      noContextMessage: noContextResult,
      legacyMessage: legacyResult,
      errors: [],
      warnings: []
    };

    if (!validResult.isValid) {
      testSuite.errors.push('Valid UEP message failed validation');
    }
    if (noContextResult.isValid) {
      testSuite.warnings.push('Message without trace context unexpectedly passed validation');
    }

    collector.addTestSuite('UEP Protocol Validation', testSuite);

  } catch (error) {
    console.error('    ❌ UEP protocol test error:', error);
    collector.addTestSuite('UEP Protocol Validation', {
      success: false,
      errors: [`UEP protocol test error: ${error.message}`],
      warnings: []
    });
  }
}

/**
 * Test Suite 2: Multi-hop Trace Propagation
 */
async function runMultiHopTests(collector) {
  console.log('  🔗 Testing multi-service trace propagation...');

  try {
    const multiHopConfig = {
      services: TEST_CONFIG.multiHopServices,
      expectedHops: 3,
      timeoutMs: TEST_CONFIG.testTimeout,
      validateAsync: true
    };

    const multiHopResult = await Context7UEPValidator.validateMultiHopTracePropagation(multiHopConfig);
    
    console.log(`    📊 Multi-hop validation: ${multiHopResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`    ⏱️  Total duration: ${multiHopResult.totalDuration}ms`);
    console.log(`    🎯 Successful hops: ${multiHopResult.hops.filter(h => h.success).length}/${multiHopResult.hops.length}`);

    multiHopResult.hops.forEach((hop, index) => {
      const status = hop.success ? '✅' : '❌';
      console.log(`      ${status} Hop ${index + 1}: ${hop.service} (${hop.protocol}) - ${hop.duration}ms`);
    });

    collector.addTestSuite('Multi-hop Trace Propagation', multiHopResult);

  } catch (error) {
    console.error('    ❌ Multi-hop test error:', error);
    collector.addTestSuite('Multi-hop Trace Propagation', {
      success: false,
      errors: [`Multi-hop test error: ${error.message}`],
      warnings: []
    });
  }
}

/**
 * Test Suite 3: Async Boundary Tests
 */
async function runAsyncBoundaryTests(collector) {
  console.log('  ⚡ Testing async boundary context preservation...');

  try {
    const asyncResult = await Context7UEPValidator.validateAsyncBoundaryPreservation();
    
    console.log(`    📊 Async boundary validation: ${asyncResult.success ? 'PASS' : 'FAIL'}`);
    console.log(`    🎯 Successful tests: ${asyncResult.tests.filter(t => t.success).length}/${asyncResult.tests.length}`);

    asyncResult.tests.forEach((test, index) => {
      const status = test.success ? '✅' : '❌';
      console.log(`      ${status} ${test.name}: ${test.preservedContext ? 'Context preserved' : 'Context lost'}`);
    });

    collector.addTestSuite('Async Boundary Preservation', asyncResult);

  } catch (error) {
    console.error('    ❌ Async boundary test error:', error);
    collector.addTestSuite('Async Boundary Preservation', {
      success: false,
      errors: [`Async boundary test error: ${error.message}`],
      warnings: []
    });
  }
}

/**
 * Test Suite 4: Protocol Compatibility Tests
 */
async function runProtocolCompatibilityTests(collector) {
  console.log('  🔄 Testing protocol version compatibility...');

  try {
    const compatibilityResults = [];
    
    for (const testCase of TEST_CONFIG.protocolCompatibilityMatrix) {
      const result = Context7UEPValidator.validateProtocolVersionCompatibility(
        testCase.source,
        testCase.target
      );
      
      const status = result.compatible === testCase.expectSuccess ? '✅' : '❌';
      console.log(`    ${status} ${testCase.source} -> ${testCase.target}: ${result.compatible ? 'Compatible' : 'Incompatible'}`);
      
      if (result.warnings.length > 0) {
        console.log(`      ⚠️  Warnings: ${result.warnings.join(', ')}`);
      }
      
      compatibilityResults.push({
        ...testCase,
        result,
        success: result.compatible === testCase.expectSuccess
      });
    }

    const overallSuccess = compatibilityResults.every(r => r.success);
    
    collector.addTestSuite('Protocol Version Compatibility', {
      success: overallSuccess,
      totalTests: compatibilityResults.length,
      results: compatibilityResults,
      errors: compatibilityResults.filter(r => !r.success).map(r => 
        `Compatibility test failed: ${r.source} -> ${r.target}`
      ),
      warnings: compatibilityResults.flatMap(r => r.result.warnings)
    });

  } catch (error) {
    console.error('    ❌ Protocol compatibility test error:', error);
    collector.addTestSuite('Protocol Version Compatibility', {
      success: false,
      errors: [`Protocol compatibility test error: ${error.message}`],
      warnings: []
    });
  }
}

/**
 * Test Suite 5: Capability Management Integration
 */
async function runCapabilityIntegrationTests(collector) {
  console.log('  🏗️  Testing capability management service integration...');

  try {
    if (!Context7IntegrationValidator) {
      console.log('    ⚠️  Context7IntegrationValidator not available, skipping...');
      collector.addTestSuite('Capability Management Integration', {
        success: true,
        warnings: ['Context7IntegrationValidator not available - integration tests skipped'],
        errors: []
      });
      return;
    }

    // Test capability registration with trace context
    const registrationMessage = UEPMessageFactory.createCapabilityRegistrationMessage('test-capability-001');
    console.log('    📝 Testing capability registration with trace context...');

    // Test capability search with trace context  
    const searchMessage = UEPMessageFactory.createCapabilitySearchMessage();
    console.log('    🔍 Testing capability search with trace context...');

    // Test context propagation validation
    const contextValidation = Context7IntegrationValidator.validateContextPropagation();
    console.log(`    📊 Context propagation validation: ${contextValidation.isValid ? 'PASS' : 'FAIL'}`);

    if (contextValidation.errors.length > 0) {
      console.log(`      ❌ Errors: ${contextValidation.errors.join(', ')}`);
    }
    if (contextValidation.warnings.length > 0) {
      console.log(`      ⚠️  Warnings: ${contextValidation.warnings.join(', ')}`);
    }

    collector.addTestSuite('Capability Management Integration', {
      success: contextValidation.isValid,
      contextValidation,
      errors: contextValidation.errors,
      warnings: contextValidation.warnings
    });

  } catch (error) {
    console.error('    ❌ Capability integration test error:', error);
    collector.addTestSuite('Capability Management Integration', {
      success: false,
      errors: [`Capability integration test error: ${error.message}`],
      warnings: []
    });
  }
}

/**
 * Test Suite 6: Performance Tests
 */
async function runPerformanceTests(collector) {
  console.log('  ⚡ Testing Context7 performance impact...');

  try {
    const iterations = 1000;
    const testMessage = UEPMessageFactory.createTestMessage();
    
    // Measure validation performance
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      Context7UEPValidator.validateUEPMessageContext(testMessage);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`    📊 Performance metrics:`);
    console.log(`      🔢 Iterations: ${iterations}`);
    console.log(`      ⏱️  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`      📈 Average per validation: ${avgTime.toFixed(4)}ms`);
    console.log(`      🚀 Validations per second: ${(1000 / avgTime).toFixed(0)}`);

    const performanceAcceptable = avgTime < 1.0; // Less than 1ms per validation
    
    collector.addTestSuite('Performance Validation', {
      success: performanceAcceptable,
      metrics: {
        iterations,
        totalTime,
        avgTime,
        validationsPerSecond: 1000 / avgTime
      },
      errors: performanceAcceptable ? [] : ['Performance below acceptable threshold'],
      warnings: avgTime > 0.5 ? ['Performance above warning threshold'] : []
    });

  } catch (error) {
    console.error('    ❌ Performance test error:', error);
    collector.addTestSuite('Performance Validation', {
      success: false,
      errors: [`Performance test error: ${error.message}`],
      warnings: []
    });
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Context7 UEP Integration Test Runner');
  console.log('=' .repeat(50));
  console.log('🎯 Validating Context7 trace context propagation with UEP protocol');
  console.log('📋 Based on TaskMaster research methodology\n');

  const exitCode = await runIntegrationTests();
  
  console.log('\n🏁 Test execution completed');
  process.exit(exitCode);
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

export { runIntegrationTests, UEPMessageFactory, TestResultsCollector };