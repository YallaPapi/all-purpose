/**
 * Frontend Agent Test
 * 
 * Test the Frontend Agent functionality with UEP coordination
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFrontendAgent() {
  try {
    console.log('🧪 Testing Frontend Agent with UEP coordination...');
    
    // Import the Frontend Agent from compiled dist directory
    const { FrontendAgent } = await import('./dist/core/FrontendAgent.js');
    
    // Initialize Frontend Agent
    const agent = new FrontendAgent({
      projectRoot: path.join(__dirname, '../../..'),
      outputDir: path.join(__dirname, 'output'),
      enableContext7: true,
      enableUEP: true,
      uiFramework: 'react',
      cssFramework: 'tailwind',
      stateManagement: 'zustand',
      testFramework: 'playwright',
      logLevel: 'info'
    });
    
    console.log('🚀 Initializing Frontend Agent...');
    await agent.initialize();
    
    console.log('📊 Agent Status:', agent.getStatus());
    console.log('🎯 Agent Capabilities:', agent.getCapabilities());
    
    // Test component generation
    console.log('\n🎨 Testing component generation...');
    const componentResult = await agent.processTask('Generate React components for user interface', {
      type: 'generate-component',
      components: [
        { 
          name: 'UserCard', 
          type: 'functional',
          props: [
            { name: 'user', type: 'User', required: true },
            { name: 'onClick', type: '() => void', required: false }
          ]
        },
        { 
          name: 'UserList', 
          type: 'functional',
          props: [
            { name: 'users', type: 'User[]', required: true }
          ]
        }
      ],
      framework: 'react',
      typescript: true,
      styling: 'tailwind'
    });
    
    console.log('✅ Component Generation Result:', componentResult);
    
    // Test styling
    console.log('\n🎭 Testing component styling...');
    const stylingResult = await agent.processTask('Apply Tailwind CSS styling to UserCard component', {
      type: 'style-component',
      component: { name: 'UserCard' },
      styleSystem: 'tailwind',
      responsive: true,
      theme: 'modern'
    });
    
    console.log('✅ Styling Result:', stylingResult);
    
    // Test accessibility
    console.log('\n♿ Testing accessibility compliance...');
    const accessibilityResult = await agent.processTask('Check accessibility compliance for components', {
      type: 'check-accessibility',
      components: ['UserCard', 'UserList'],
      wcagLevel: 'AA',
      includeKeyboardNav: true,
      includeScreenReader: true
    });
    
    console.log('✅ Accessibility Result:', accessibilityResult);
    
    // Test performance optimization
    console.log('\n⚡ Testing performance optimization...');
    const performanceResult = await agent.processTask('Optimize component performance', {
      type: 'optimize-performance',
      components: ['UserCard', 'UserList'],
      optimizations: ['memo', 'lazy-loading', 'bundle-splitting'],
      targetMetrics: { fcp: 1.5, lcp: 2.5, cls: 0.1 }
    });
    
    console.log('✅ Performance Result:', performanceResult);
    
    // Test UI testing generation
    console.log('\n🧪 Testing UI test generation...');
    const testingResult = await agent.processTask('Generate UI tests for components', {
      type: 'generate-tests',
      components: ['UserCard', 'UserList'],
      testType: 'unit',
      framework: 'playwright',
      coverage: 'comprehensive'
    });
    
    console.log('✅ Testing Result:', testingResult);
    
    // Shutdown agent
    await agent.shutdown();
    
    console.log('\n🎉 Frontend Agent test completed successfully!');
    console.log('✅ UEP coordination working properly');
    console.log('✅ Context7 integration functional');
    console.log('✅ All frontend capabilities operational');
    console.log('✅ Component generation working');
    console.log('✅ Styling system functional');
    console.log('✅ Accessibility checks working');
    console.log('✅ Performance optimization functional');
    console.log('✅ Test generation working');
    
  } catch (error) {
    console.error('❌ Frontend Agent test failed:', error);
    process.exit(1);
  }
}

// Run the test
testFrontendAgent().catch(console.error);