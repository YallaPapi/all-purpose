#!/usr/bin/env node

/**
 * Test NATS-enabled PRD Parser
 */

import { NATSAgentWrapper } from './src/services/NATSAgentWrapper.js';
import { connect } from 'nats';
import fs from 'fs/promises';

// Simple test coordinator
async function testNATSPRDParser() {
  console.log('🧪 Testing NATS-enabled PRD Parser\n');

  let nc;

  try {
    // First, create a simple PRD parser instance
    const mockParser = {
      parse: async (content, options) => {
        console.log('📄 Parsing PRD content...');
        return {
          success: true,
          parsed: {
            title: 'Test Project',
            requirements: ['REQ-001', 'REQ-002'],
            techStack: ['Node.js', 'Express'],
            sections: {
              overview: content.substring(0, 100) + '...'
            }
          }
        };
      }
    };

    // Create NATS-enabled wrapper
    const prdAgent = new NATSAgentWrapper(
      {
        id: 'test-prd-parser-001',
        type: 'prd-parser',
        name: 'Test PRD Parser',
        capabilities: ['prd-parsing', 'requirements-extraction']
      },
      mockParser
    );

    // Connect agent
    await prdAgent.connect();
    console.log('✅ PRD Parser connected to NATS\n');

    // Connect as coordinator to send tasks
    console.log('🎯 Connecting as coordinator...');
    nc = await connect({
      servers: 'nats://localhost:4222',
      user: 'factory',
      pass: 'factory-secret'
    });

    // Subscribe to task results
    const resultSub = nc.subscribe('task.completed');
    (async () => {
      for await (const msg of resultSub) {
        const result = JSON.parse(msg.string());
        console.log('\n📨 Task completed:', result);
        
        // Unsubscribe after receiving result
        resultSub.unsubscribe();
      }
    })();

    // Send a PRD parsing task
    console.log('\n📤 Sending PRD parsing task...');
    const task = {
      id: `task-${Date.now()}`,
      type: 'parse-prd',
      payload: {
        content: `# Test Project

## Overview
This is a test project for validating NATS integration.

## Requirements
- Must support CRUD operations
- Should have authentication
- Must use Node.js and Express

## Technical Stack
- Node.js
- Express
- MongoDB`,
        options: {}
      }
    };

    await nc.publish('agent.test-prd-parser-001.task', JSON.stringify(task));
    console.log('✅ Task sent to PRD parser');

    // Wait for result
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (nc) {
      await nc.drain();
    }
    process.exit(0);
  }
}

// Run test
testNATSPRDParser().catch(console.error);