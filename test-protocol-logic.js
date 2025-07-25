/**
 * Test script for Protocol Logic Layer
 */

const { ReasoningProtocol, ReasoningPhase } = require('./dist/uep/ProtocolLogicLayer.js');

async function testProtocolLogic() {
  console.log('🧪 Testing Protocol Logic Layer...\n');

  try {
    // Create reasoning protocol with test configuration
    const protocol = new ReasoningProtocol({
      enableStepValidation: true,
      enableCustomPatterns: true,
      enableParallelExecution: false,
      maxExecutionTime: 30000,
      retryPolicy: {
        maxRetries: 2,
        retryDelay: 100,
        backoffMultiplier: 1.5
      },
      defaultPattern: 'universal',
      enableAuditLogging: true
    });
    console.log('✅ ReasoningProtocol created successfully');

    // Test 1: Universal pattern execution
    console.log('\n1. Testing universal pattern execution...');
    const context1 = {
      taskDescription: 'Implement user authentication system with JWT tokens',
      requesterType: 'agent',
      agentId: 'auth-builder',
      sessionId: 'test-session-1',
      goals: ['Secure authentication', 'JWT token management', 'User session handling'],
      metrics: ['Security compliance', 'Performance benchmarks', 'User experience'],
      fallbacks: ['Basic authentication fallback', 'Session timeout handling'],
      constraints: ['Must be compatible with existing API', 'Follow security best practices'],
      preferences: { pattern: 'universal' },
      stepResults: {},
      metadata: { projectType: 'web-app', framework: 'express' }
    };

    const result1 = await protocol.executeReasoningProtocol(context1);
    console.log(`✅ Universal pattern execution completed`);
    console.log(`   Success: ${result1.success}`);
    console.log(`   Pattern used: ${result1.pattern}`);
    console.log(`   Steps completed: ${Object.keys(result1.results).length}`);
    console.log(`   Processing time: ${result1.processingTime}ms`);
    console.log(`   Insights generated: ${result1.insights.length}`);
    console.log(`   Recommendations: ${result1.recommendations.length}`);

    // Test 2: Fast pattern execution
    console.log('\n2. Testing fast pattern execution...');
    const context2 = {
      taskDescription: 'Read the current configuration file',
      requesterType: 'human',
      sessionId: 'test-session-2',
      goals: ['Understand current settings'],
      metrics: ['Task completion'],
      fallbacks: ['Manual file inspection'],
      constraints: [],
      preferences: { pattern: 'fast' },
      stepResults: {},
      metadata: { complexity: 'low' }
    };

    const result2 = await protocol.executeReasoningProtocol(context2);
    console.log(`✅ Fast pattern execution completed`);
    console.log(`   Success: ${result2.success}`);
    console.log(`   Pattern used: ${result2.pattern}`);
    console.log(`   Steps completed: ${Object.keys(result2.results).length}`);
    console.log(`   Processing time: ${result2.processingTime}ms`);

    // Test 3: Comprehensive pattern execution
    console.log('\n3. Testing comprehensive pattern execution...');
    const context3 = {
      taskDescription: 'Design and implement a scalable microservices architecture for enterprise application',
      requesterType: 'agent',
      agentId: 'architecture-agent',
      sessionId: 'test-session-3',
      goals: ['Scalable architecture', 'High availability', 'Performance optimization'],
      metrics: ['System throughput', 'Response times', 'Reliability scores'],
      fallbacks: ['Monolithic fallback', 'Simplified architecture'],
      constraints: ['Budget limitations', 'Timeline constraints', 'Technology stack requirements'],
      preferences: { pattern: 'comprehensive' },
      stepResults: {},
      metadata: { complexity: 'high', riskLevel: 'high' }
    };

    const result3 = await protocol.executeReasoningProtocol(context3);
    console.log(`✅ Comprehensive pattern execution completed`);
    console.log(`   Success: ${result3.success}`);
    console.log(`   Pattern used: ${result3.pattern}`);
    console.log(`   Steps completed: ${Object.keys(result3.results).length}`);
    console.log(`   Processing time: ${result3.processingTime}ms`);

    // Test 4: Pattern selection based on task complexity
    console.log('\n4. Testing automatic pattern selection...');
    const simpleTask = {
      taskDescription: 'Check if file exists',
      requesterType: 'human',
      sessionId: 'test-session-4',
      goals: ['Verify file existence'],
      metrics: ['Success/failure'],
      fallbacks: ['Manual check'],
      constraints: [],
      preferences: {}, // No pattern specified
      stepResults: {},
      metadata: {}
    };

    const complexTask = {
      taskDescription: 'Implement complex distributed system with multiple microservices and security layers',
      requesterType: 'agent',
      agentId: 'system-builder',
      sessionId: 'test-session-5',
      goals: ['Distributed architecture', 'Security integration', 'Performance optimization'],
      metrics: ['System metrics', 'Security scores', 'Performance benchmarks'],
      fallbacks: ['Simplified architecture'],
      constraints: ['Enterprise requirements'],
      preferences: {}, // No pattern specified  
      stepResults: {},
      metadata: {}
    };

    const simpleResult = await protocol.executeReasoningProtocol(simpleTask);
    const complexResult = await protocol.executeReasoningProtocol(complexTask);

    console.log(`   Simple task pattern: ${simpleResult.pattern} (${Object.keys(simpleResult.results).length} steps)`);
    console.log(`   Complex task pattern: ${complexResult.pattern} (${Object.keys(complexResult.results).length} steps)`);

    // Test 5: Custom pattern creation
    console.log('\n5. Testing custom pattern creation...');
    const customPattern = {
      name: 'testing-pattern',
      description: 'Specialized pattern for testing scenarios',
      applicableAgents: ['test-agent'],
      applicableTaskTypes: ['test'],
      steps: [
        {
          name: 'prepare-test',
          phase: ReasoningPhase.CLARIFY,
          description: 'Prepare test environment and requirements',
          requirements: ['taskDescription'],
          outputs: ['testPlan'],
          dependencies: [],
          isOptional: false
        },
        {
          name: 'execute-test',
          phase: ReasoningPhase.EXECUTE,
          description: 'Execute the test scenarios',
          requirements: ['testPlan'],
          outputs: ['testResults'],
          dependencies: ['prepare-test'],
          isOptional: false
        }
      ],
      fallbackBehavior: 'continue',
      maxRetries: 1
    };

    protocol.addCustomPattern(customPattern);
    
    const customContext = {
      taskDescription: 'Run comprehensive test suite',
      requesterType: 'agent',
      agentId: 'test-agent',
      sessionId: 'test-session-6',
      goals: ['Verify system functionality'],
      metrics: ['Test coverage', 'Pass rate'],
      fallbacks: ['Manual testing'],
      constraints: [],
      preferences: { pattern: 'testing-pattern' },
      stepResults: {},
      metadata: {}
    };

    const customResult = await protocol.executeReasoningProtocol(customContext);
    console.log(`✅ Custom pattern execution completed`);
    console.log(`   Pattern used: ${customResult.pattern}`);
    console.log(`   Steps completed: ${Object.keys(customResult.results).length}`);

    // Test 6: Pattern management
    console.log('\n6. Testing pattern management...');
    const availablePatterns = protocol.getAvailablePatterns();
    console.log(`✅ Available patterns: ${availablePatterns.join(', ')}`);
    console.log(`   Total patterns: ${availablePatterns.length}`);

    // Test 7: Execution monitoring
    console.log('\n7. Testing execution monitoring...');
    const activeExecutions = protocol.getActiveExecutions();
    console.log(`✅ Active executions: ${activeExecutions.length}`);

    // Test 8: Event handling
    console.log('\n8. Testing event handling...');
    let eventCount = 0;
    protocol.on('step:completed', (data) => {
      eventCount++;
    });

    const eventTestContext = {
      taskDescription: 'Test event emission',
      requesterType: 'human',
      sessionId: 'test-session-7',
      goals: ['Test events'],
      metrics: ['Event count'],
      fallbacks: [],
      constraints: [],
      preferences: { pattern: 'fast' },
      stepResults: {},
      metadata: {}
    };

    await protocol.executeReasoningProtocol(eventTestContext);
    console.log(`✅ Event handling test completed`);
    console.log(`   Events emitted: ${eventCount}`);

    // Test 9: Audit trail validation
    console.log('\n9. Testing audit trail...');
    if (result1.auditTrail && result1.auditTrail.length > 0) {
      console.log(`✅ Audit trail generated with ${result1.auditTrail.length} entries`);
      const firstEntry = result1.auditTrail[0];
      console.log(`   Sample entry: ${firstEntry.step} (${firstEntry.phase}) - ${firstEntry.success ? 'Success' : 'Failed'}`);
    }

    console.log('\n✅ All Protocol Logic Layer tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ Protocol Logic Layer test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

testProtocolLogic().then(success => {
  if (success) {
    console.log('\n🎉 Protocol Logic Layer test completed successfully!');
  } else {
    console.log('\n💥 Protocol Logic Layer test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});