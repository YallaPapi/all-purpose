#!/usr/bin/env node

/**
 * End-to-End Working Test
 * Complete PRD to code generation flow
 */

import { connect, JSONCodec } from 'nats';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const jc = JSONCodec();

const testPRD = `# Task Tracker API

## Overview
Simple REST API for task management

## Requirements
- Create, read, update, delete tasks
- PostgreSQL database
- Express.js server
- JWT authentication
- Input validation

## Endpoints
- POST /api/tasks - Create task
- GET /api/tasks - List tasks
- PUT /api/tasks/:id - Update task
- DELETE /api/tasks/:id - Delete task
`;

async function testEndToEnd() {
  console.log('🚀 End-to-End Working Test\n');
  console.log('This test will:');
  console.log('1. Submit a PRD through the factory');
  console.log('2. Process it with NATS-enabled agents');
  console.log('3. Generate actual code output\n');
  
  let nc;
  
  try {
    // Connect to NATS
    nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS\n');
    
    // Track all events
    const events = [];
    const completions = [];
    
    // Subscribe to completion events
    const completeSub = nc.subscribe('task.completed');
    (async () => {
      for await (const msg of completeSub) {
        try {
          const completion = jc.decode(msg.data);
          completions.push(completion);
          console.log(`✅ Task completed: ${completion.taskId} by ${completion.agentId}`);
          
          // Show result summary
          if (completion.result) {
            if (completion.result.files) {
              console.log(`   Generated files: ${completion.result.files.join(', ')}`);
            }
            if (completion.result.title) {
              console.log(`   PRD Title: ${completion.result.title}`);
            }
          }
        } catch (e) {
          // Ignore decode errors
        }
      }
    })();
    
    // Step 1: Create agents via factory
    console.log('📋 Step 1: Creating agents via factory...');
    
    const agents = {};
    const agentTypes = ['prd-parser', 'backend-agent', 'frontend-agent'];
    
    for (const type of agentTypes) {
      const res = await fetch('http://localhost:3005/api/factory/meta-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: type, config: {} })
      });
      
      if (res.ok) {
        const agent = await res.json();
        agents[type] = agent.data;
        console.log(`✅ Created ${type}: ${agent.data.id}`);
        
        // Publish creation event for bridge
        await nc.publish('meta.agent.created', jc.encode({
          agentId: agent.data.id,
          type: type,
          status: 'created'
        }));
      }
    }
    
    console.log('');
    
    // Step 2: Submit PRD
    console.log('📋 Step 2: Submitting PRD for processing...');
    
    const prdTask = {
      taskId: `prd-${Date.now()}`,
      agentId: agents['prd-parser'].id,
      agentType: 'prd-parser',
      taskType: 'parse-prd',
      data: {
        prd: testPRD,
        generateTasks: true
      }
    };
    
    await nc.publish('factory.task.submit', jc.encode(prdTask));
    console.log(`✅ PRD submitted: ${prdTask.taskId}\n`);
    
    // Step 3: Wait for processing
    console.log('⏳ Processing (waiting 15 seconds)...\n');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 4: Check results
    console.log('\n📊 Processing Results:');
    console.log(`Total completions: ${completions.length}`);
    
    if (completions.length > 0) {
      console.log('\nCompleted tasks:');
      completions.forEach(c => {
        console.log(`  - ${c.taskId} (${c.agentId})`);
      });
      
      // Check if files were generated
      const backendCompletion = completions.find(c => c.agentId.includes('backend'));
      const frontendCompletion = completions.find(c => c.agentId.includes('frontend'));
      
      if (backendCompletion?.result?.files) {
        console.log('\n✅ Backend code generated:');
        backendCompletion.result.files.forEach(f => console.log(`   - ${f}`));
      }
      
      if (frontendCompletion?.result?.files) {
        console.log('\n✅ Frontend code generated:');
        frontendCompletion.result.files.forEach(f => console.log(`   - ${f}`));
      }
    } else {
      console.log('\n❌ No tasks completed');
      console.log('\nTroubleshooting:');
      console.log('1. Is the factory-NATS bridge running? (node start-nats-enabled-factory.js)');
      console.log('2. Are agents subscribing to NATS topics?');
      console.log('3. Check docker logs for errors');
    }
    
    // Check output directory
    console.log('\n📁 Checking for generated output...');
    const outputDirs = ['./generated', './output', './.test-output'];
    
    for (const dir of outputDirs) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          const files = await fs.readdir(dir);
          if (files.length > 0) {
            console.log(`✅ Found output in ${dir}: ${files.length} items`);
          }
        }
      } catch (e) {
        // Directory doesn't exist
      }
    }
    
    // Clean up
    completeSub.unsubscribe();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (nc) {
      await nc.close();
    }
  }
}

// Run the test
testEndToEnd().catch(console.error);