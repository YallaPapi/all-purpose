/**
 * Test script for UEP Memory Manager integration
 */

const { UEPMemoryManager } = require('./dist/uep/MemoryManager.js');

async function testMemoryIntegration() {
  console.log('🧪 Testing UEP Memory Manager integration...\n');

  try {
    // Create memory manager
    const memoryManager = new UEPMemoryManager({
      enableRelevanceScoring: true,
      maxEntries: 10
    });
    console.log('✅ UEPMemoryManager created successfully');

    // Test memory entry creation
    const testEntry = {
      id: 'test-entry-1',
      timestamp: new Date(),
      agentId: 'test-agent',
      sessionId: 'test-session-123',
      taskDescription: 'Implement user authentication system with JWT tokens',
      context: {
        requesterType: 'agent',
        complexity: 'high',
        components: ['TaskMaster', 'Context7', 'RAG'],
        approved: true
      },
      executionTrace: {
        processingTime: 1500,
        componentsExecuted: ['TaskMaster', 'Context7'],
        validationResults: []
      },
      tags: ['authentication', 'jwt', 'user', 'system', 'implement']
    };

    console.log('\n2. Testing memory storage...');
    await memoryManager.storeExecutionResult(testEntry);
    console.log('✅ Memory entry stored successfully');

    console.log('\n3. Testing memory retrieval...');
    const memoryQuery = {
      agentId: 'test-agent',
      taskKeywords: ['authentication', 'user'],
      minRelevanceScore: 0.1,
      limit: 5
    };

    const results = await memoryManager.getRelevantMemory(memoryQuery);
    console.log(`✅ Retrieved ${results.memories.length} relevant memories`);
    console.log(`   Total found: ${results.totalFound}`);
    console.log(`   Average relevance: ${results.relevanceStats.averageScore.toFixed(3)}`);

    if (results.memories.length > 0) {
      const memory = results.memories[0];
      console.log(`   Sample memory: "${memory.taskDescription.substring(0, 50)}..." (score: ${memory.relevanceScore?.toFixed(3)})`);
    }

    console.log('\n4. Testing memory stats...');
    const stats = await memoryManager.getUEPMemoryStats('test-agent');
    console.log(`✅ Memory stats retrieved:`);
    console.log(`   UEP entries: ${stats.uep.entryCount}`);
    console.log(`   Average relevance: ${stats.uep.averageRelevanceScore.toFixed(3)}`);
    console.log(`   Approval rate: ${(stats.uep.approvalRate * 100).toFixed(1)}%`);

    console.log('\n✅ All UEP Memory Manager tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ UEP Memory Manager test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

testMemoryIntegration().then(success => {
  if (success) {
    console.log('\n🎉 Memory integration test completed successfully!');
  } else {
    console.log('\n💥 Memory integration test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});