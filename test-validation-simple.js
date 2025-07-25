/**
 * Simple test for ValidationEngine functionality
 */

const { ValidationEngine, TaskComplexityAnalyzer } = require('./dist/uep/ValidationEngine.js');

async function testValidation() {
  console.log('🧪 Testing ValidationEngine basic functionality...\n');
  
  // Test complexity analysis
  console.log('1. Task Complexity Analysis:');
  const tasks = [
    'Show me the files in the current directory',
    'Update the login function to use bcrypt',
    'Build a complete e-commerce platform with payment processing'
  ];

  tasks.forEach(task => {
    const complexity = TaskComplexityAnalyzer.analyzeComplexity(task);
    const requiresContext = TaskComplexityAnalyzer.requiresContext(task);
    console.log(`  "${task.substring(0, 40)}..." → Complexity: ${complexity}, Context: ${requiresContext}`);
  });

  console.log('\n2. ValidationEngine Creation:');
  try {
    const validationEngine = new ValidationEngine();
    console.log('  ✅ ValidationEngine created successfully');
    
    // Test matrix access
    const matrix = validationEngine.getValidationMatrix();
    console.log(`  ✅ Validation matrix loaded with ${matrix.length} entries`);
    
    return validationEngine;
  } catch (error) {
    console.error('  ❌ Failed to create ValidationEngine:', error.message);
    return null;
  }
}

testValidation().then(engine => {
  if (engine) {
    console.log('\n✅ ValidationEngine tests passed!');
  } else {
    console.log('\n❌ ValidationEngine tests failed!');
  }
}).catch(console.error);