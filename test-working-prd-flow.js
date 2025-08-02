#!/usr/bin/env node

/**
 * Test Working PRD Flow
 * Submit a PRD and see it processed by NATS agents
 */

import { connect, StringCodec, JSONCodec } from 'nats';

const sc = StringCodec();
const jc = JSONCodec();

const testPRD = `# Simple API Service PRD

## Overview
Build a REST API service for user management.

## Requirements
- User CRUD operations
- JWT authentication
- PostgreSQL database
- Express.js backend
- Unit tests

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users/profile
- PUT /api/users/profile
`;

async function testWorkingFlow() {
  console.log('🚀 Testing Working PRD Flow\n');
  
  let nc;
  
  try {
    nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS\n');
    
    // Monitor responses
    const responses = [];
    const sub = nc.subscribe('task.completed', { max: 10 });
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = jc.decode(msg.data);
          responses.push(data);
          console.log(`✅ Task completed: ${data.taskId} by ${data.agentId}`);
        } catch (e) {
          console.log('📨 Received completion message');
        }
      }
    })();
    
    // Submit PRD to parser
    console.log('📋 Submitting PRD to parser agent...');
    
    const prdTask = {
      id: `prd-task-${Date.now()}`,
      type: 'parse-prd',
      data: {
        prd: testPRD,
        generateTasks: true
      }
    };
    
    // Request-reply to get immediate response
    try {
      const response = await nc.request(
        'agent.prd-parser.task.assign',
        jc.encode(prdTask),
        { timeout: 5000 }
      );
      
      const result = jc.decode(response.data);
      console.log('✅ PRD parsed successfully:', result);
    } catch (err) {
      // Fallback to publish
      console.log('⚠️  Using publish instead of request');
      await nc.publish('agent.prd-parser.task.assign', jc.encode(prdTask));
    }
    
    // Wait for processing
    console.log('\n⏳ Waiting for agents to process...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check results
    console.log('\n📊 Processing Summary:');
    console.log(`Completed tasks: ${responses.length}`);
    
    responses.forEach(response => {
      console.log(`  - ${response.taskId}: ${response.status}`);
    });
    
    // Cleanup
    sub.unsubscribe();
    await nc.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testWorkingFlow().catch(console.error);