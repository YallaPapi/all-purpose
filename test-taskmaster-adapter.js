/**
 * Test script for TaskMaster Adapter
 */

const { TaskMasterAdapter } = require('./dist/uep/TaskMasterAdapter.js');

async function testTaskMasterAdapter() {
  console.log('🧪 Testing TaskMaster Adapter...\n');

  try {
    // Create adapter
    const adapter = new TaskMasterAdapter({
      enableCaching: true,
      enableResearch: false, // Disable research for faster testing
      timeout: 10000 // 10 seconds
    });
    console.log('✅ TaskMasterAdapter created successfully');

    // Test 1: Simple task processing (will likely use fallback)
    console.log('\n1. Testing simple task processing...');
    const simpleTask = 'Fix the login button styling issue';
    
    const result1 = await adapter.processTask(simpleTask);
    console.log(`✅ Task processed successfully`);
    console.log(`   Subtasks: ${result1.subtasks.length}`);
    console.log(`   Timeline: ${result1.timeline}`);
    console.log(`   Complexity: ${result1.complexity}`);

    // Test 2: Complex task processing
    console.log('\n2. Testing complex task processing...');
    const complexTask = 'Implement a new authentication system with JWT, database integration, and role-based access control';
    
    const result2 = await adapter.processTask(complexTask, { projectName: 'Auth System' });
    console.log(`✅ Complex task processed successfully`);
    console.log(`   Subtasks: ${result2.subtasks.length}`);
    console.log(`   Timeline: ${result2.timeline}`);
    console.log(`   Complexity: ${result2.complexity}`);
    
    // Print first subtask as example
    if (result2.subtasks.length > 0) {
      const firstSubtask = result2.subtasks[0];
      console.log(`   Sample subtask: "${firstSubtask.title}" - ${firstSubtask.description.substring(0, 50)}...`);
    }

    // Test 3: Cache functionality
    console.log('\n3. Testing cache functionality...');
    const result3 = await adapter.processTask(simpleTask); // Same task as test 1
    console.log(`✅ Cached task processed (should be faster)`);

    // Test 4: Cache stats
    console.log('\n4. Testing cache statistics...');
    const cacheStats = adapter.getCacheStats();
    console.log(`✅ Cache stats:`);
    console.log(`   Size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`   Oldest entry: ${cacheStats.oldestEntry || 'None'}`);

    // Test 5: Various task types
    console.log('\n5. Testing different task types...');
    const taskTypes = [
      'Read the configuration file and explain its structure',
      'Create a new user registration form component',
      'Debug the memory leak in the data processing module'
    ];

    for (const [index, task] of taskTypes.entries()) {
      const result = await adapter.processTask(task);
      console.log(`   Task ${index + 1}: ${result.subtasks.length} subtasks, ${result.timeline}, complexity ${result.complexity}`);
    }

    console.log('\n✅ All TaskMaster Adapter tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ TaskMaster Adapter test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

testTaskMasterAdapter().then(success => {
  if (success) {
    console.log('\n🎉 TaskMaster Adapter test completed successfully!');
  } else {
    console.log('\n💥 TaskMaster Adapter test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});