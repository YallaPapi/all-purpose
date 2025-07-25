/**
 * Test script for UEP ValidationEngine
 */

const { ValidationEngine, TaskComplexityAnalyzer } = require('./src/uep/ValidationEngine.ts');

async function testValidationEngine() {
  console.log('🧪 Testing UEP ValidationEngine...\n');

  const validationEngine = new ValidationEngine();

  // Test 1: High complexity agent task
  console.log('Test 1: High complexity agent task');
  const request1 = {
    taskDescription: 'Implement a new authentication system with JWT and database integration',
    requesterType: 'agent',
    agentId: 'auth-builder',
    sessionId: 'test-session-1'
  };

  const results1 = {
    taskBreakdown: { subtasks: [{ id: '1', title: 'Setup JWT', description: 'Configure JWT auth', dependencies: [] }], timeline: '2 days', complexity: 8 },
    codebase: { relevantFiles: ['auth.js'], functions: ['login', 'logout'], snippets: [], collisionRisks: [], dependencies: [] },
    memory: 'Previous auth work completed',
    documentation: [{ content: 'JWT documentation', source: 'docs/auth.md', relevanceScore: 0.9, metadata: {} }]
  };

  try {
    const validation1 = await validationEngine.validateExecution(request1, results1);
    console.log('✅ Validation Results:');
    validation1.forEach(v => {
      console.log(`  ${v.component}: ${v.result} - ${v.message}`);
    });
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Simple human task with overrides
  console.log('Test 2: Simple human task with overrides');
  const request2 = {
    taskDescription: 'Show me the current git status',
    requesterType: 'human',
    sessionId: 'test-session-2',
    overrides: {
      skipTaskMaster: true,
      skipContext7: true,
      skipRAG: true
    }
  };

  const results2 = {
    memory: ''
  };

  try {
    const validation2 = await validationEngine.validateExecution(request2, results2);
    console.log('✅ Validation Results:');
    validation2.forEach(v => {
      console.log(`  ${v.component}: ${v.result} - ${v.message}`);
    });
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Task complexity analysis
  console.log('Test 3: Task complexity analysis');
  const tasks = [
    'Show me the files in the current directory',
    'Update the login function to use bcrypt',
    'Build a complete e-commerce platform with payment processing'
  ];

  tasks.forEach(task => {
    const complexity = TaskComplexityAnalyzer.analyzeComplexity(task);
    const requiresContext = TaskComplexityAnalyzer.requiresContext(task);
    console.log(`Task: "${task}"`);
    console.log(`  Complexity: ${complexity}, Requires Context: ${requiresContext}`);
  });
}

// Run tests
testValidationEngine().catch(console.error);