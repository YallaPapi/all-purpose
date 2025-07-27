/**
 * Quick test to verify UEP imports work
 */

console.log('Testing UEP imports...');

try {
  // Test the exact import path from agentIntegration.js
  const { createUEPAgentWrapper } = require('./dist/uep/UEPAgentWrapper.js');
  console.log('✅ UEP import successful:', typeof createUEPAgentWrapper);
  
  // Test if we can create a wrapper
  const wrapper = createUEPAgentWrapper({
    enableUEP: true,
    logLevel: 'debug'
  });
  
  console.log('✅ UEP wrapper created successfully');
  console.log('✅ UEP system is available for use');
  
} catch (error) {
  console.log('❌ UEP import failed:', error.message);
  console.log('Stack trace:', error.stack);
}