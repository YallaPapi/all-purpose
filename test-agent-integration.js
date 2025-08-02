#!/usr/bin/env node

/**
 * Test Meta-Agent Integration
 * Tests if all agents are properly connected and can process tasks
 */

import { connect, StringCodec } from 'nats';

const sc = StringCodec();

async function testAgentIntegration() {
  console.log('🧪 Testing Meta-Agent Integration\n');

  try {
    // Connect to NATS
    const nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS server');

    // Subscribe to agent responses
    const responses = new Map();
    const sub = nc.subscribe('factory.agent.response');
    
    (async () => {
      for await (const m of sub) {
        const response = JSON.parse(sc.decode(m.data));
        responses.set(response.agentId, response);
        console.log(`📨 Response from ${response.agentType}: ${response.status}`);
      }
    })();

    // Test PRD Parser Agent
    console.log('\n📋 Testing PRD Parser Agent...');
    const prdTask = {
      id: `test-prd-${Date.now()}`,
      type: 'parse-prd',
      data: {
        content: `# Test Project PRD
        
## Overview
A simple test application

## Requirements
- User authentication
- Dashboard
- API endpoints

## Technical Stack
- Node.js
- React
- PostgreSQL`
      }
    };
    
    await nc.publish('factory.agent.task', sc.encode(JSON.stringify({
      agentType: 'prd-parser',
      task: prdTask
    })));

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Backend Agent
    console.log('\n🔧 Testing Backend Agent...');
    const backendTask = {
      id: `test-backend-${Date.now()}`,
      type: 'generate-api',
      data: {
        endpoints: [
          { method: 'POST', path: '/api/auth/login' },
          { method: 'GET', path: '/api/users/profile' }
        ]
      }
    };

    await nc.publish('factory.agent.task', sc.encode(JSON.stringify({
      agentType: 'backend-agent',
      task: backendTask
    })));

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check results
    console.log('\n📊 Test Results:');
    console.log(`Total responses received: ${responses.size}`);
    
    for (const [agentId, response] of responses) {
      console.log(`\nAgent: ${response.agentType}`);
      console.log(`Status: ${response.status}`);
      console.log(`Task ID: ${response.taskId}`);
      if (response.error) {
        console.log(`Error: ${response.error}`);
      }
    }

    // Check agent status via observability
    console.log('\n🔍 Checking Agent Status...');
    const agentStatus = await nc.request('factory.agent.status', sc.encode('{}'), { timeout: 2000 })
      .catch(() => null);
    
    if (agentStatus) {
      const status = JSON.parse(sc.decode(agentStatus.data));
      console.log(`Active agents: ${status.activeAgents || 0}`);
      console.log(`Total tasks processed: ${status.totalTasks || 0}`);
    }

    // Clean up
    sub.unsubscribe();
    await nc.close();
    
    console.log('\n✅ Integration test complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAgentIntegration().catch(console.error);