#!/usr/bin/env node

/**
 * Test Factory Workflow
 * Uses the actual factory-core API to process a PRD
 */

import fetch from 'node-fetch';
import { connect, JSONCodec } from 'nats';

const jc = JSONCodec();

const testPRD = `# Simple User Management API

## Overview
Build a REST API for user management with authentication.

## Requirements
- User registration and login
- JWT authentication
- PostgreSQL database
- Express.js framework
- Input validation
- Error handling

## Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users/profile
- PUT /api/users/profile
`;

async function testFactoryWorkflow() {
  console.log('🚀 Testing Factory Workflow\n');
  
  let nc;
  
  try {
    // Connect to NATS to monitor activity
    nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS for monitoring\n');
    
    // Monitor all factory and agent events
    const events = [];
    const sub = nc.subscribe('factory.>', { max: 100 });
    const agentSub = nc.subscribe('agent.>', { max: 100 });
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = jc.decode(msg.data);
          events.push({ subject: msg.subject, data, time: new Date() });
          console.log(`📨 ${msg.subject}`);
        } catch (e) {
          // Ignore decode errors
        }
      }
    })();
    
    (async () => {
      for await (const msg of agentSub) {
        try {
          const data = jc.decode(msg.data);
          events.push({ subject: msg.subject, data, time: new Date() });
          console.log(`🤖 ${msg.subject}`);
        } catch (e) {
          // Ignore decode errors
        }
      }
    })();
    
    // Step 1: Create PRD Parser Agent via factory
    console.log('📋 Step 1: Creating PRD Parser Agent...');
    const parserRes = await fetch('http://localhost:3005/api/factory/meta-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType: 'prd-parser',
        config: {
          outputFormat: 'structured',
          generateTasks: true
        }
      })
    });
    
    const parser = await parserRes.json();
    console.log('✅ Parser created:', parser.data.id);
    
    // Step 2: Create task endpoint or use NATS
    console.log('\n📋 Step 2: Submitting PRD for parsing...');
    
    // Try task endpoint first
    const taskRes = await fetch('http://localhost:3005/api/factory/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: parser.data.id,
        taskType: 'parse-prd',
        data: {
          prd: testPRD
        }
      })
    }).catch(() => null);
    
    if (taskRes && taskRes.ok) {
      const task = await taskRes.json();
      console.log('✅ Task submitted via API:', task.id);
    } else {
      // Use NATS directly
      console.log('⚠️  Using NATS for task submission...');
      
      const taskId = `task-${Date.now()}`;
      await nc.publish('factory.task.submit', jc.encode({
        taskId,
        agentId: parser.data.id,
        agentType: 'prd-parser',
        taskType: 'parse-prd',
        data: {
          prd: testPRD
        }
      }));
      
      console.log('✅ Task submitted via NATS:', taskId);
    }
    
    // Step 3: Create other agents
    console.log('\n📋 Step 3: Creating other agents...');
    
    const agentTypes = ['backend-agent', 'frontend-agent', 'devops-agent'];
    for (const type of agentTypes) {
      try {
        const res = await fetch('http://localhost:3005/api/factory/meta-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentType: type, config: {} })
        });
        
        if (res.ok) {
          const agent = await res.json();
          console.log(`✅ Created ${type}: ${agent.data.id}`);
        }
      } catch (err) {
        console.error(`❌ Failed to create ${type}:`, err.message);
      }
    }
    
    // Wait and monitor
    console.log('\n⏳ Monitoring for 20 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Check JetStream for workflow events
    console.log('\n📊 Checking JetStream streams...');
    const js = nc.jetstream();
    const streams = await js.streams.list().next();
    
    for (const stream of streams) {
      const info = await js.streams.info(stream.config.name);
      if (info.state.messages > 0) {
        console.log(`   ${stream.config.name}: ${info.state.messages} messages`);
      }
    }
    
    // Summary
    console.log('\n📊 Workflow Summary:');
    console.log(`Total events captured: ${events.length}`);
    
    // Group by subject prefix
    const groups = {};
    events.forEach(e => {
      const prefix = e.subject.split('.').slice(0, 2).join('.');
      groups[prefix] = (groups[prefix] || 0) + 1;
    });
    
    Object.entries(groups).forEach(([prefix, count]) => {
      console.log(`   ${prefix}.*: ${count} events`);
    });
    
    // Clean up
    sub.unsubscribe();
    agentSub.unsubscribe();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (nc) {
      await nc.close();
    }
  }
}

// Run the test
testFactoryWorkflow().catch(console.error);