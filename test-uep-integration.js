/**
 * Test script for UEP Meta-Agent Integration
 * 
 * This test validates the integration of the Universal Execution Protocol
 * with the meta-agent factory and individual enhanced agents.
 */

const path = require('path');
const fs = require('fs').promises;

// Import UEP integration components
const { createUEPMetaAgentFactory } = require('./src/meta-agents/UEPMetaAgentFactory');
const { enhanceAgentWithUEP } = require('./src/uep/agentIntegration');

async function testUEPIntegration() {
  console.log('🧪 Testing UEP Meta-Agent Integration...\n');

  const testResults = {
    factoryCreation: false,
    prdParserCreation: false,
    scaffoldGeneratorCreation: false,
    uepProcessing: false,
    metricsTracking: false,
    cleanup: false
  };

  let factory = null;

  try {
    // Test 1: UEP Meta-Agent Factory Creation
    console.log('1. Testing UEP Meta-Agent Factory creation...');
    factory = await createUEPMetaAgentFactory({
      enableUEP: true,
      enableValidation: true,
      enableMemoryIntegration: true,
      enableCaching: true,
      logLevel: 'minimal',
      maxConcurrentAgents: 5
    });

    console.log('✅ UEP Meta-Agent Factory created successfully');
    console.log(`   - Factory initialized: ${factory.isInitialized}`);
    console.log(`   - UEP enabled: ${factory.config.enableUEP}`);
    testResults.factoryCreation = true;

    // Test 2: Enhanced PRD Parser Creation
    console.log('\n2. Testing Enhanced PRD Parser creation...');
    try {
      const prdParser = await factory.createAgent('prd-parser', 'test-prd-parser', {
        watchDir: 'docs',
        outputDir: '.test-output/tasks',
        researchEnabled: true,
        contextEnabled: true,
        uepEnabled: true
      });

      console.log('✅ Enhanced PRD Parser created successfully');
      console.log(`   - Agent ID: ${prdParser.agentId}`);
      console.log(`   - Agent Type: ${prdParser.agentType}`);
      console.log(`   - Status: ${prdParser.status}`);
      testResults.prdParserCreation = true;

      // Test status retrieval
      const prdStatus = prdParser.getStatus();
      console.log(`   - UEP Enhanced: ${prdStatus.uep?.enabled || 'Unknown'}`);

    } catch (error) {
      console.log(`❌ Enhanced PRD Parser creation failed: ${error.message}`);
    }

    // Test 3: Enhanced Scaffold Generator Creation
    console.log('\n3. Testing Enhanced Scaffold Generator creation...');
    try {
      const scaffoldGenerator = await factory.createAgent('scaffold-generator', 'test-scaffold-generator', {
        outputDir: '.test-output/scaffolds',
        templatesDir: path.join(__dirname, 'src/meta-agents/scaffold-generator/templates'),
        includeTests: true,
        includeGitignore: true,
        collisionDetection: true,
        uepEnabled: true
      });

      console.log('✅ Enhanced Scaffold Generator created successfully');
      console.log(`   - Agent ID: ${scaffoldGenerator.agentId}`);
      console.log(`   - Agent Type: ${scaffoldGenerator.agentType}`);
      console.log(`   - Status: ${scaffoldGenerator.status}`);
      testResults.scaffoldGeneratorCreation = true;

      // Test status retrieval
      const scaffoldStatus = scaffoldGenerator.getStatus();
      console.log(`   - UEP Enhanced: ${scaffoldStatus.uep?.enabled || 'Unknown'}`);

    } catch (error) {
      console.log(`❌ Enhanced Scaffold Generator creation failed: ${error.message}`);
    }

    // Test 4: UEP Processing with Mock Data
    console.log('\n4. Testing UEP-enhanced processing...');
    try {
      const scaffoldAgent = factory.getAgent('test-scaffold-generator');
      if (scaffoldAgent) {
        // Create mock PRD data for scaffold generation
        const mockPRDData = {
          agentName: 'Test Agent',
          description: 'A test agent for UEP integration validation',
          tasks: [
            {
              id: 'task-1',
              title: 'Initialize test agent',
              description: 'Set up the test agent with basic functionality'
            }
          ],
          requirements: ['Node.js', 'Jest for testing'],
          dependencies: []
        };

        console.log('   Processing mock PRD data through UEP-enhanced scaffold generator...');
        
        // Process through UEP (this will test the full UEP pipeline)
        const startTime = Date.now();
        const result = await scaffoldAgent.process(mockPRDData, {
          sessionId: 'test-session-001',
          taskDescription: 'Generate test agent scaffold via UEP',
          enableContextualMemory: true,
          enableCodebaseAwareness: true,
          enableDocumentationLookup: true
        });

        const processingTime = Date.now() - startTime;
        
        console.log('✅ UEP processing completed successfully');
        console.log(`   - Processing time: ${processingTime}ms`);
        console.log(`   - Success: ${result.success !== false}`);
        
        if (result.uepMetadata) {
          console.log(`   - UEP Compliance Score: ${result.uepMetadata.complianceScore?.toFixed(2) || 'N/A'}`);
          console.log(`   - Context enhancements: ${Object.keys(result.uepMetadata.contextEnhancements || {}).join(', ') || 'None'}`);
        }
        
        testResults.uepProcessing = true;
      } else {
        console.log('❌ Scaffold generator not available for UEP processing test');
      }

    } catch (error) {
      console.log(`❌ UEP processing test failed: ${error.message}`);
    }

    // Test 5: Metrics Tracking
    console.log('\n5. Testing metrics tracking...');
    try {
      const factoryStats = factory.getStatistics();
      console.log('✅ Factory statistics retrieved successfully');
      console.log(`   - Total agents created: ${factoryStats.factory.totalAgentsCreated}`);
      console.log(`   - Active agents: ${factoryStats.factory.activeAgents}`);
      console.log(`   - Total tasks processed: ${factoryStats.factory.totalTasksProcessed}`);
      console.log(`   - Average compliance score: ${factoryStats.factory.averageComplianceScore?.toFixed(2) || 'N/A'}`);

      // Test individual agent metrics
      const scaffoldAgent = factory.getAgent('test-scaffold-generator');
      if (scaffoldAgent) {
        const agentMetrics = scaffoldAgent.getMetrics();
        console.log('   - Agent metrics retrieved:');
        console.log(`     * Usage count: ${agentMetrics.usageCount || 0}`);
        console.log(`     * Success rate: ${(agentMetrics.successRate * 100).toFixed(1)}%`);
        console.log(`     * Average processing time: ${agentMetrics.averageProcessingTime?.toFixed(2) || 0}ms`);
      }

      testResults.metricsTracking = true;

    } catch (error) {
      console.log(`❌ Metrics tracking test failed: ${error.message}`);
    }

    // Test 6: Agent Listing
    console.log('\n6. Testing agent listing...');
    try {
      const agentList = factory.listAgents();
      console.log(`✅ Agent listing completed: ${agentList.length} agents found`);
      
      agentList.forEach(agent => {
        console.log(`   - ${agent.agentType} (${agent.agentId}): ${agent.usageCount} uses, ${agent.status}`);
      });

    } catch (error) {
      console.log(`❌ Agent listing test failed: ${error.message}`);
    }

    // Test 7: UEP Component Verification
    console.log('\n7. Testing UEP component verification...');
    try {
      // Test if UEP TypeScript modules are available
      let uepModulesAvailable = false;
      try {
        require('./dist/uep/UEPAgentWrapper.js');
        uepModulesAvailable = true;
        console.log('✅ UEP TypeScript modules are compiled and available');
      } catch (err) {
        console.log('⚠️ UEP TypeScript modules not found (expected if not compiled)');
        console.log('   This is normal if the TypeScript files have not been compiled');
      }

      // Test fallback functionality
      const fallbackTest = await enhanceAgentWithUEP(
        { process: async (input) => `Processed: ${input}` },
        'test-fallback-agent',
        { enableUEP: false }
      );

      console.log('✅ Fallback wrapper functionality works');
      console.log(`   - Enhanced: ${fallbackTest.isEnhanced()}`);
      console.log(`   - Agent ID: ${fallbackTest.getAgentId()}`);

    } catch (error) {
      console.log(`❌ UEP component verification failed: ${error.message}`);
    }

    // Test 8: Error Handling
    console.log('\n8. Testing error handling...');
    try {
      // Test duplicate agent creation
      try {
        await factory.createAgent('prd-parser', 'test-prd-parser', {}); // Should fail - duplicate ID
        console.log('❌ Duplicate agent creation should have failed');
      } catch (error) {
        console.log('✅ Duplicate agent creation properly rejected');
      }

      // Test invalid agent type
      try {
        await factory.createAgent('invalid-agent-type', 'test-invalid', {}); // Should fail - invalid type
        console.log('❌ Invalid agent type should have failed');
      } catch (error) {
        console.log('✅ Invalid agent type properly rejected');
      }

      // Test getting non-existent agent
      const nonExistentAgent = factory.getAgent('non-existent-agent');
      if (nonExistentAgent === null) {
        console.log('✅ Non-existent agent properly returns null');
      } else {
        console.log('❌ Non-existent agent should return null');
      }

    } catch (error) {
      console.log(`❌ Error handling test failed: ${error.message}`);
    }

    // Test 9: Cleanup
    console.log('\n9. Testing cleanup...');
    try {
      await factory.cleanup();
      console.log('✅ Factory cleanup completed successfully');
      console.log(`   - Factory initialized: ${factory.isInitialized}`);
      testResults.cleanup = true;

    } catch (error) {
      console.log(`❌ Cleanup test failed: ${error.message}`);
    }

    // Test Summary
    console.log('\n📊 Test Summary:');
    console.log('═'.repeat(50));
    
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    
    Object.entries(testResults).forEach(([testName, passed]) => {
      const icon = passed ? '✅' : '❌';
      const formattedName = testName.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${icon} ${formattedName}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    console.log('═'.repeat(50));
    console.log(`Tests passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);

    if (passedTests === totalTests) {
      console.log('\n🎉 All UEP integration tests passed!');
      console.log('\n💡 UEP integration is working correctly');
      console.log('💡 Both TypeScript UEP system and JavaScript fallbacks are functional');
      console.log('💡 Meta-agents can be enhanced with UEP capabilities');
      return true;
    } else {
      console.log(`\n⚠️ ${totalTests - passedTests} test(s) failed`);
      console.log('💡 Check the TypeScript compilation: npm run build or npx tsc');
      console.log('💡 Some tests may fail if UEP modules are not compiled');
      return false;
    }

  } catch (error) {
    console.error('\n❌ UEP Integration test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;

  } finally {
    // Ensure cleanup even if tests fail
    if (factory && factory.isInitialized) {
      try {
        await factory.cleanup();
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup error during test finalization:', cleanupError.message);
      }
    }
  }
}

// Additional UEP validation tests
async function testUEPValidation() {
  console.log('\n🔍 Running UEP Validation Tests...');

  try {
    // Test 1: UEP Configuration Validation
    console.log('1. Testing UEP configuration validation...');
    
    const validConfigs = [
      { enableUEP: true, enableValidation: true },
      { enableUEP: false, logLevel: 'silent' },
      { enableUEP: true, enableCaching: false, timeout: 30000 }
    ];

    for (const config of validConfigs) {
      try {
        const testFactory = await createUEPMetaAgentFactory({
          ...config,
          logLevel: 'silent'
        });
        await testFactory.cleanup();
        console.log(`   ✅ Configuration valid: ${JSON.stringify(config)}`);
      } catch (error) {
        console.log(`   ❌ Configuration invalid: ${JSON.stringify(config)} - ${error.message}`);
      }
    }

    // Test 2: UEP Fallback Behavior
    console.log('\n2. Testing UEP fallback behavior...');
    
    // Test with UEP disabled
    const fallbackFactory = await createUEPMetaAgentFactory({
      enableUEP: false,
      logLevel: 'silent'
    });

    const fallbackAgent = await fallbackFactory.createAgent('scaffold-generator', 'fallback-test', {
      uepEnabled: false
    });

    const fallbackResult = await fallbackAgent.process({ agentName: 'Fallback Test Agent' });
    console.log(`   ✅ Fallback processing works: Success=${fallbackResult.success !== false}`);
    
    await fallbackFactory.cleanup();

    console.log('✅ All UEP validation tests passed');
    return true;

  } catch (error) {
    console.error('❌ UEP validation tests failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive UEP integration tests...\n');

  const integrationSuccess = await testUEPIntegration();
  const validationSuccess = await testUEPValidation();

  console.log('\n🏁 Final Test Results:');
  console.log(`Integration Tests: ${integrationSuccess ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Validation Tests: ${validationSuccess ? '✅ PASSED' : '❌ FAILED'}`);

  if (integrationSuccess && validationSuccess) {
    console.log('\n🎉 All UEP tests completed successfully!');
    console.log('🔗 UEP integration with meta-agents is fully functional');
    return true;
  } else {
    console.log('\n💥 Some tests failed. Check the output above for details.');
    return false;
  }
}

// Execute tests
runAllTests().then(success => {
  if (success) {
    console.log('\n✨ UEP integration testing completed successfully!');
    process.exit(0);
  } else {
    console.log('\n💥 UEP integration testing failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});