#!/usr/bin/env node

/**
 * Full Integration Test
 * Tests the complete PRD to working software flow
 */

import { connect, StringCodec, JSONCodec } from 'nats';
import fs from 'fs/promises';
import path from 'path';

const sc = StringCodec();
const jc = JSONCodec();

// Test PRD content
const testPRD = `# E-Commerce Platform PRD

## Overview
Build a modern e-commerce platform with user authentication, product catalog, and shopping cart.

## Requirements

### Functional Requirements
1. User registration and authentication
2. Product listing with search and filters
3. Shopping cart functionality
4. Order management
5. Admin dashboard

### Technical Requirements
- Backend: Node.js with Express
- Database: PostgreSQL with Prisma ORM
- Frontend: React with TypeScript
- Authentication: JWT tokens
- API: RESTful with OpenAPI documentation

## User Stories
1. As a user, I want to register and login
2. As a user, I want to browse products
3. As a user, I want to add items to cart
4. As a user, I want to place orders
5. As an admin, I want to manage products
`;

async function testFullIntegration() {
  console.log('🚀 Full Integration Test: PRD to Working Software\n');
  
  let nc;
  
  try {
    // Connect to NATS
    nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS\n');
    
    // Step 1: Submit PRD to factory-core
    console.log('📋 Step 1: Submitting PRD to factory...');
    
    const prdRequest = {
      id: `prd-${Date.now()}`,
      type: 'parse-prd',
      prd: testPRD,
      options: {
        generateProject: true,
        includeTests: true,
        deploymentReady: true
      }
    };
    
    // Publish to factory-core endpoint
    const response = await fetch('http://localhost:3005/api/factory/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prdRequest)
    }).catch(err => null);
    
    if (response && response.ok) {
      const result = await response.json();
      console.log('✅ PRD submitted successfully');
      console.log(`   Request ID: ${result.requestId}`);
    } else {
      console.log('⚠️  Factory API not available, trying NATS...');
      
      // Try NATS directly
      await nc.publish('factory.prd.submit', jc.encode(prdRequest));
      console.log('✅ PRD submitted via NATS');
    }
    
    // Step 2: Monitor agent activity
    console.log('\n📊 Step 2: Monitoring agent activity...');
    
    const agentActivity = new Map();
    const sub = nc.subscribe('agent.*');
    
    // Monitor for 30 seconds
    const monitorPromise = new Promise((resolve) => {
      setTimeout(() => {
        sub.unsubscribe();
        resolve();
      }, 30000);
    });
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = jc.decode(msg.data);
          const subject = msg.subject;
          
          if (!agentActivity.has(subject)) {
            agentActivity.set(subject, []);
          }
          agentActivity.get(subject).push(data);
          
          console.log(`   📨 ${subject}: ${data.agentType || data.type || 'activity'}`);
        } catch (e) {
          // Ignore decode errors
        }
      }
    })();
    
    // Wait for monitoring to complete
    await monitorPromise;
    
    // Step 3: Check results
    console.log('\n📦 Step 3: Checking generated output...');
    
    const outputDirs = [
      './generated',
      './output',
      './.test-output'
    ];
    
    let foundOutput = false;
    for (const dir of outputDirs) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          const files = await fs.readdir(dir);
          if (files.length > 0) {
            console.log(`✅ Found output in ${dir}:`);
            for (const file of files.slice(0, 5)) {
              console.log(`   - ${file}`);
            }
            if (files.length > 5) {
              console.log(`   ... and ${files.length - 5} more files`);
            }
            foundOutput = true;
          }
        }
      } catch (e) {
        // Directory doesn't exist
      }
    }
    
    if (!foundOutput) {
      console.log('❌ No generated output found');
    }
    
    // Step 4: Summary
    console.log('\n📊 Integration Test Summary:');
    console.log(`   Total agent messages: ${Array.from(agentActivity.values()).flat().length}`);
    console.log(`   Unique subjects: ${agentActivity.size}`);
    console.log(`   Output generated: ${foundOutput ? 'Yes' : 'No'}`);
    
    // List active subjects
    if (agentActivity.size > 0) {
      console.log('\n   Active subjects:');
      for (const [subject, messages] of agentActivity) {
        console.log(`     - ${subject}: ${messages.length} messages`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (nc) {
      await nc.close();
    }
  }
}

// Run the test
console.log('Starting full integration test...\n');
console.log('This test will:');
console.log('1. Submit a PRD to the factory');
console.log('2. Monitor agent activity for 30 seconds');
console.log('3. Check for generated output\n');

testFullIntegration().catch(console.error);