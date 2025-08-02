#!/usr/bin/env node

/**
 * Test Real PRD Processing
 * Submit a PRD to the factory and monitor processing
 */

import fetch from 'node-fetch';
import { connect, StringCodec, JSONCodec } from 'nats';

const sc = StringCodec();
const jc = JSONCodec();

const testPRD = `# Task Management System PRD

## Overview
Build a task management system with real-time updates and team collaboration.

## Requirements

### Core Features
1. User authentication with JWT
2. Task CRUD operations
3. Real-time updates via WebSockets
4. Team workspaces
5. Task assignment and notifications

### Technical Stack
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL with Prisma
- Frontend: React + TypeScript
- Real-time: Socket.io
- Deployment: Docker + Kubernetes
`;

async function testRealPRDProcessing() {
  console.log('🚀 Testing Real PRD Processing\n');
  
  let nc;
  
  try {
    // Connect to NATS for monitoring
    nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS for monitoring\n');
    
    // Monitor agent activity
    const activityLog = [];
    const sub = nc.subscribe('agent.*', { max: 100 });
    
    (async () => {
      for await (const msg of sub) {
        const subject = msg.subject;
        try {
          const data = jc.decode(msg.data);
          activityLog.push({ subject, data, timestamp: new Date() });
          console.log(`📨 ${new Date().toLocaleTimeString()} - ${subject}`);
        } catch (e) {
          // Ignore decode errors
        }
      }
    })();
    
    // Step 1: Create PRD Parser Agent
    console.log('📋 Step 1: Creating PRD Parser Agent...');
    const parserResponse = await fetch('http://localhost:3005/api/factory/meta-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentType: 'prd-parser',
        config: { outputFormat: 'structured' }
      })
    });
    
    const parser = await parserResponse.json();
    console.log(`✅ Created parser: ${parser.data.id}\n`);
    
    // Step 2: Submit PRD for parsing
    console.log('📋 Step 2: Submitting PRD for parsing...');
    const taskResponse = await fetch('http://localhost:3005/api/factory/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: parser.data.id,
        taskType: 'parse-prd',
        data: {
          prd: testPRD,
          generateTasks: true
        }
      })
    }).catch(err => null);
    
    if (taskResponse && taskResponse.ok) {
      const task = await taskResponse.json();
      console.log(`✅ Task submitted: ${task.data.id}`);
    } else {
      // Try NATS directly
      console.log('⚠️  Task API not available, trying NATS...');
      await nc.publish(`agent.${parser.data.id}.task.assign`, jc.encode({
        id: `task-${Date.now()}`,
        type: 'parse-prd',
        data: {
          prd: testPRD,
          generateTasks: true
        }
      }));
      console.log('✅ Task submitted via NATS');
    }
    
    // Step 3: Create other agents
    console.log('\n📋 Step 3: Creating other agents...');
    const agentTypes = ['backend-agent', 'frontend-agent', 'devops-agent'];
    const agents = {};
    
    for (const type of agentTypes) {
      try {
        const response = await fetch('http://localhost:3005/api/factory/meta-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentType: type, config: {} })
        });
        
        if (response.ok) {
          const agent = await response.json();
          agents[type] = agent.data;
          console.log(`✅ Created ${type}: ${agent.data.id}`);
        }
      } catch (err) {
        console.log(`❌ Failed to create ${type}: ${err.message}`);
      }
    }
    
    // Wait for processing
    console.log('\n⏳ Waiting 30 seconds for processing...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Step 4: Check results
    console.log('\n📊 Processing Summary:');
    console.log(`Total agent messages: ${activityLog.length}`);
    
    // Group by subject
    const subjects = {};
    activityLog.forEach(log => {
      subjects[log.subject] = (subjects[log.subject] || 0) + 1;
    });
    
    console.log('\nMessage breakdown:');
    Object.entries(subjects).forEach(([subject, count]) => {
      console.log(`  ${subject}: ${count} messages`);
    });
    
    // Check for task completions
    const completions = activityLog.filter(log => 
      log.subject.includes('completed') || log.subject.includes('finished')
    );
    console.log(`\nCompleted tasks: ${completions.length}`);
    
    // Stop monitoring
    sub.unsubscribe();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (nc) {
      await nc.close();
    }
  }
}

// Run the test
console.log('Testing real PRD processing with factory-core...\n');
testRealPRDProcessing().catch(console.error);