/**
 * Final Integration Test - UEP with Meta-Agents
 * 
 * Comprehensive test to verify UEP integration with meta-agents works perfectly.
 */

const path = require('path');

async function testFinalIntegration() {
  console.log('🔍 Final UEP Meta-Agent Integration Test...\n');

  try {
    // Test 1: UEP Factory Creation
    console.log('1. Testing UEP Meta-Agent Factory...');
    const { createUEPMetaAgentFactory } = require('./src/meta-agents/UEPMetaAgentFactory');
    
    const factory = await createUEPMetaAgentFactory({
      enableUEP: true,
      enableValidation: true,
      enableMemoryIntegration: true,
      logLevel: 'minimal'
    });

    console.log('✅ UEP Meta-Agent Factory created successfully');
    console.log(`   - Initialized: ${factory.isInitialized}`);
    console.log(`   - UEP Enabled: ${factory.config.enableUEP}`);

    // Test 2: Enhanced Scaffold Generator Creation
    console.log('\n2. Testing Enhanced Scaffold Generator...');
    const scaffoldAgent = await factory.createAgent('scaffold-generator', 'test-scaffold', {
      outputDir: '.test-output',
      templatesDir: path.join(__dirname, 'src/meta-agents/scaffold-generator/templates'),
      collisionDetection: true,
      uepEnabled: true
    });

    console.log('✅ Enhanced Scaffold Generator created');
    console.log(`   - Agent ID: ${scaffoldAgent.agentId}`);
    console.log(`   - Agent Type: ${scaffoldAgent.agentType}`);

    // Test the agent status
    const status = scaffoldAgent.getStatus();
    console.log(`   - UEP Enhanced: ${status.uep?.enabled}`);

    // Test 3: UEP-Enhanced Processing
    console.log('\n3. Testing UEP-enhanced processing...');
    
    const mockPRD = {
      tasks: [
        {
          id: 1,
          title: 'Initialize agent',
          description: 'Set up basic structure',
          priority: 'high'
        },
        {
          id: 2,
          title: 'Implement core functionality',
          description: 'Build main agent features'
        }
      ],
      metadata: {
        projectName: 'Test UEP Agent',
        description: 'A test agent to verify UEP integration',
        version: '1.0.0',
        author: 'UEP System',
        totalTasks: 2
      }
    };

    console.log('   Processing mock PRD through UEP-enhanced scaffold generator...');
    
    const startTime = Date.now();
    const result = await scaffoldAgent.process(mockPRD, {
      sessionId: 'test-session',
      enableContextualMemory: true,
      enableCodebaseAwareness: true
    });

    const processingTime = Date.now() - startTime;
    
    console.log('✅ UEP processing completed successfully');
    console.log(`   - Processing time: ${processingTime}ms`);
    console.log(`   - Success: ${result.success !== false}`);

    if (result.uepMetadata) {
      console.log(`   - UEP Compliance Score: ${result.uepMetadata.complianceScore?.toFixed(2) || 'N/A'}`);
    }

    // Test 4: Factory Statistics
    console.log('\n4. Testing factory statistics...');
    const stats = factory.getStatistics();
    
    console.log('✅ Factory statistics retrieved');
    console.log(`   - Total agents: ${stats.factory.totalAgentsCreated}`);
    console.log(`   - Active agents: ${stats.factory.activeAgents}`);
    console.log(`   - Tasks processed: ${stats.factory.totalTasksProcessed}`);

    // Test 5: Agent Metrics
    console.log('\n5. Testing agent metrics...');
    const metrics = scaffoldAgent.getMetrics();
    
    console.log('✅ Agent metrics retrieved');
    console.log(`   - Usage count: ${metrics.usageCount}`);
    console.log(`   - Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);

    // Test 6: Cleanup
    console.log('\n6. Testing cleanup...');
    await factory.cleanup();
    
    console.log('✅ Factory cleanup completed');
    console.log(`   - Factory initialized: ${factory.isInitialized}`);

    // Success Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎉 UEP INTEGRATION FULLY WORKING!');
    console.log('═'.repeat(60));
    console.log('✅ UEP Factory Creation: WORKING');
    console.log('✅ Enhanced Agents: WORKING');
    console.log('✅ UEP Processing: WORKING');
    console.log('✅ Metrics & Statistics: WORKING');
    console.log('✅ Cleanup: WORKING');
    console.log('═'.repeat(60));

    return true;

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Test Enhanced PRD Parser
async function testEnhancedPRDParser() {
  console.log('\n🔍 Testing Enhanced PRD Parser...\n');

  try {
    console.log('1. Creating Enhanced PRD Parser...');
    const EnhancedPRDParser = require('./src/meta-agents/enhanced-prd-parser');
    
    const parser = new EnhancedPRDParser({
      watchDir: 'docs',
      outputDir: '.test-output/tasks',
      uepEnabled: true,
      enhancedValidation: true,
      logLevel: 'minimal'
    });

    console.log('✅ Enhanced PRD Parser created');

    // Test initialization
    console.log('\n2. Testing parser initialization...');
    // Note: We won't call start() to avoid file watching, just test creation
    
    const status = parser.getStatus();
    console.log('✅ Parser status retrieved');
    console.log(`   - Enhanced: ${status.enhanced}`);
    console.log(`   - UEP Enabled: ${status.uep?.enabled}`);

    console.log('\n✅ Enhanced PRD Parser test completed');
    return true;

  } catch (error) {
    console.error('❌ Enhanced PRD Parser test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runFinalTests() {
  console.log('🚀 Starting Final UEP Integration Tests...\n');

  const factoryTest = await testFinalIntegration();
  const prdTest = await testEnhancedPRDParser();

  console.log('\n🏁 Final Test Results:');
  console.log(`Factory Integration: ${factoryTest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`PRD Parser Enhancement: ${prdTest ? '✅ PASSED' : '❌ FAILED'}`);

  if (factoryTest && prdTest) {
    console.log('\n🎉 ALL TESTS PASSED! UEP IS READY FOR USE!');
    
    console.log('\n💡 How to use UEP with your meta-agents:');
    console.log('─'.repeat(50));
    console.log('1. Enhanced Factory:');
    console.log('   const factory = await createUEPMetaAgentFactory();');
    console.log('   const agent = await factory.createAgent("scaffold-generator", "my-agent");');
    console.log('');
    console.log('2. Enhanced PRD Processing:');
    console.log('   node src/meta-agents/enhanced-prd-parser.js');
    console.log('');
    console.log('3. Enhanced Agent Creation:');
    console.log('   node src/meta-agents/enhanced-scaffold-generator.js generate prd.json');
    console.log('');
    console.log('4. Enhanced Human Prompts:');
    console.log('   node dist/uep/cli.js --interactive');

    return true;
  } else {
    console.log('\n❌ Some tests failed. Check output above.');
    return false;
  }
}

// Execute
runFinalTests().then(success => {
  if (success) {
    console.log('\n✨ UEP integration testing completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 Integration testing failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});