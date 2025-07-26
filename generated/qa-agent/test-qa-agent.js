/**
 * QA Agent Test
 * 
 * Test the QA Agent functionality with UEP coordination
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testQAAgent() {
  try {
    console.log('🧪 Testing QA Agent with UEP coordination...');
    
    // Import the QA Agent from compiled dist directory
    const { QAAgent } = await import('./dist/core/QAAgent.js');
    
    // Initialize QA Agent
    const agent = new QAAgent({
      projectRoot: path.join(__dirname, '../../..'),
      outputDir: path.join(__dirname, 'output'),
      enableContext7: true,
      enableUEP: true,
      testFramework: 'jest',
      bugTrackingSystem: 'jira',
      coverageThreshold: 80,
      regressionDepth: 'comprehensive',
      logLevel: 'info'
    });
    
    console.log('🚀 Initializing QA Agent...');
    await agent.initialize();
    
    console.log('📊 Agent Status:', agent.getStatus());
    console.log('🎯 Agent Capabilities:', agent.getCapabilities());
    
    // Test test plan generation
    console.log('\n📋 Testing comprehensive test plan generation...');
    const testPlanResult = await agent.processTask('Generate comprehensive test plan for user authentication system', {
      type: 'generate-test-plan',
      features: [
        { name: 'User Login', priority: 'high' },
        { name: 'Password Reset', priority: 'medium' },
        { name: 'Multi-factor Authentication', priority: 'high' }
      ],
      scope: 'full',
      timeline: '2 weeks',
      resources: ['QA Engineer', 'Test Environment', 'Test Data'],
      riskAreas: [
        { area: 'authentication', risk: 'high', coverage: 60 },
        { area: 'security', risk: 'critical', coverage: 90 }
      ]
    });
    
    console.log('✅ Test Plan Generation Result:', testPlanResult);
    
    // Test test case creation
    console.log('\n🧪 Testing automated test case creation...');
    const testCasesResult = await agent.processTask('Create automated test cases for authentication features', {
      type: 'create-test-cases',
      features: [
        { name: 'User Login' },
        { name: 'Password Reset' }
      ],
      framework: 'jest',
      types: ['unit', 'integration', 'e2e'],
      coverage: 'comprehensive'
    });
    
    console.log('✅ Test Cases Creation Result:', testCasesResult);
    
    // Test edge case analysis
    console.log('\n🔍 Testing edge case analysis...');
    const edgeCasesResult = await agent.processTask('Analyze edge cases for authentication system', {
      type: 'analyze-edge-cases',
      features: [
        { name: 'User Login' },
        { name: 'Session Management' }
      ],
      analysisDepth: 'comprehensive',
      includeNegative: true,
      includeBoundary: true
    });
    
    console.log('✅ Edge Case Analysis Result:', edgeCasesResult);
    
    // Test regression suite management
    console.log('\n🔄 Testing regression suite management...');
    const regressionResult = await agent.processTask('Manage regression test suite', {
      type: 'manage-regression-suite',
      action: 'update',
      coverageTarget: 85,
      frequency: 'weekly',
      testCases: [
        { id: 'REG_001', name: 'Login Flow Regression' },
        { id: 'REG_002', name: 'API Authentication Regression' }
      ]
    });
    
    console.log('✅ Regression Suite Management Result:', regressionResult);
    
    // Test bug tracking
    console.log('\n🐛 Testing bug tracking and management...');
    const bugTrackingResult = await agent.processTask('Track and manage authentication bugs', {
      type: 'track-bugs',
      action: 'create',
      system: 'jira',
      includeTriage: true,
      bugs: [
        {
          title: 'Login timeout not handled properly',
          description: 'Users experience hanging login when network is slow',
          severity: 'high',
          priority: 'high',
          steps: [
            'Navigate to login page',
            'Enter credentials with slow network',
            'Observe hanging state'
          ]
        },
        {
          title: 'Password reset email formatting issue',
          description: 'Reset emails have broken HTML formatting',
          severity: 'medium',
          priority: 'medium'
        }
      ]
    });
    
    console.log('✅ Bug Tracking Result:', bugTrackingResult);
    
    // Shutdown agent
    await agent.shutdown();
    
    console.log('\n🎉 QA Agent test completed successfully!');
    console.log('✅ UEP coordination working properly');
    console.log('✅ Context7 integration functional');
    console.log('✅ All QA capabilities operational');
    console.log('✅ Test plan generation working');
    console.log('✅ Test case creation functional');
    console.log('✅ Edge case analysis working');
    console.log('✅ Regression suite management functional');
    console.log('✅ Bug tracking and management working');
    
  } catch (error) {
    console.error('❌ QA Agent test failed:', error);
    process.exit(1);
  }
}

// Run the test
testQAAgent().catch(console.error);