#!/usr/bin/env node

/**
 * Test Working Memory System
 * Comprehensive test of the Redis-based working memory for AI agents
 */

require('dotenv').config();

// Since the TypeScript file needs to be transpiled, let's test the Redis functionality directly
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
  automaticDeserialization: false,
});

const MEMORY_DEPTH = 20;
const memoryKey = (agent) => `agent:mem:${agent}`;

// Test functions
async function appendToMemory(agent, entry) {
  try {
    const key = memoryKey(agent);
    const timestampedEntry = `[${new Date().toISOString()}] ${entry}`;
    
    await redis.rpush(key, timestampedEntry);
    await redis.ltrim(key, -MEMORY_DEPTH, -1);
    
    console.log(`✅ Memory appended for agent '${agent}': ${entry.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to append memory for agent '${agent}':`, error);
    return false;
  }
}

async function getMemory(agent) {
  try {
    const key = memoryKey(agent);
    const items = await redis.lrange(key, 0, -1);
    
    if (!items || items.length === 0) {
      console.log(`ℹ️  No memory found for agent '${agent}'`);
      return '';
    }
    
    const memoryString = items.join('\n\n');
    console.log(`✅ Retrieved memory for agent '${agent}': ${items.length} entries`);
    return memoryString;
  } catch (error) {
    console.error(`❌ Failed to retrieve memory for agent '${agent}':`, error);
    return '';
  }
}

async function clearMemory(agent) {
  try {
    const key = memoryKey(agent);
    await redis.del(key);
    console.log(`✅ Memory cleared for agent '${agent}'`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear memory for agent '${agent}':`, error);
    return false;
  }
}

async function getMemoryStats(agent) {
  try {
    const key = memoryKey(agent);
    const items = await redis.lrange(key, 0, -1);
    
    const stats = {
      entryCount: items?.length || 0,
      memorySize: items?.join('').length || 0,
      oldestEntry: items?.[0] || undefined,
      newestEntry: items?.[items?.length - 1] || undefined,
    };
    
    console.log(`📊 Memory stats for agent '${agent}':`, stats);
    return stats;
  } catch (error) {
    console.error(`❌ Failed to get memory stats for agent '${agent}':`, error);
    return { entryCount: 0, memorySize: 0 };
  }
}

async function testWorkingMemory() {
  console.log('🧪 Testing Working Memory System\n');
  
  const testAgent = 'test-prospector-agent';
  
  // Test 1: Clear any existing memory
  console.log('Test 1: Clearing existing memory...');
  await clearMemory(testAgent);
  
  // Test 2: Verify empty memory
  console.log('\nTest 2: Verifying empty memory...');
  const emptyMemory = await getMemory(testAgent);
  console.log(`Empty memory result: "${emptyMemory}"`);
  
  // Test 3: Add some memory entries
  console.log('\nTest 3: Adding memory entries...');
  const testEntries = [
    'TASK: Initialize Google Places API connection\nRESULT: Successfully connected to Google Places API',
    'TASK: Set up Redis deduplication system\nRESULT: Redis deduplication configured with 10,000 entry limit',
    'TASK: Implement rate limiting logic\nRESULT: Rate limiting implemented with exponential backoff',
    'TASK: Create All-Purpose Pattern configuration\nRESULT: Configuration system accepts unlimited industry/location combinations',
    'TASK: Generate sample lead data\nRESULT: Generated 50 test leads for Italian restaurants in NYC'
  ];
  
  for (const entry of testEntries) {
    await appendToMemory(testAgent, entry);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for timestamps
  }
  
  // Test 4: Retrieve memory
  console.log('\nTest 4: Retrieving memory...');
  const retrievedMemory = await getMemory(testAgent);
  console.log('Retrieved memory:');
  console.log('-'.repeat(80));
  console.log(retrievedMemory);
  console.log('-'.repeat(80));
  
  // Test 5: Check memory stats
  console.log('\nTest 5: Checking memory stats...');
  const stats = await getMemoryStats(testAgent);
  
  // Test 6: Test memory limit (add more than 20 entries)
  console.log('\nTest 6: Testing memory limit (adding 25 more entries)...');
  for (let i = 1; i <= 25; i++) {
    await appendToMemory(testAgent, `TASK: Test entry ${i}\nRESULT: Test result ${i}`);
  }
  
  const finalStats = await getMemoryStats(testAgent);
  console.log(`\nFinal entry count: ${finalStats.entryCount} (should be <= ${MEMORY_DEPTH})`);
  
  // Test 7: Verify memory retrieval still works
  console.log('\nTest 7: Verifying memory retrieval after limit test...');
  const finalMemory = await getMemory(testAgent);
  const entryCount = finalMemory.split('\n\n').filter(entry => entry.trim()).length;
  console.log(`Retrieved ${entryCount} entries from memory`);
  
  // Test 8: Test agent task integration example
  console.log('\nTest 8: Testing agent task integration...');
  async function mockAgentExecution(prompt) {
    // Mock an AI agent response
    return `Executed task with context. Prompt length: ${prompt.length} characters. Context included: ${prompt.includes('recently done') ? 'YES' : 'NO'}`;
  }
  
  const result = await runAgentTaskWithMemory(testAgent, 'Process new lead for coffee shops in Seattle', mockAgentExecution);
  console.log('Agent task result:', result);
  
  // Test 9: Verify the new task was stored
  console.log('\nTest 9: Verifying new task was stored in memory...');
  const updatedStats = await getMemoryStats(testAgent);
  console.log(`Updated entry count: ${updatedStats.entryCount}`);
  
  console.log('\n🎉 Working Memory System Tests Complete!');
  
  // Cleanup
  console.log('\nCleaning up test data...');
  await clearMemory(testAgent);
}

// Agent task integration function
async function runAgentTaskWithMemory(agentName, task, executeTask) {
  const memory = await getMemory(agentName);
  
  const prompt = `
You are ${agentName}.

${memory ? `Here is what you've recently done:\n${memory}\n` : ''}

Your current task is: ${task}
  `.trim();
  
  const result = await executeTask(prompt);
  await appendToMemory(agentName, `TASK: ${task}\nRESULT: ${result}`);
  
  return result;
}

// Run tests
if (require.main === module) {
  testWorkingMemory().catch(console.error);
}