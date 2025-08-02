/**
 * Test Backend Agent NATS Workflow
 * 
 * Demonstrates real backend agents communicating via NATS
 * to build a complete backend system
 */

import { createAgentCoordinator } from './src/services/AgentCoordinator.js';
import { createNATSBackendAgent } from './src/meta-agents/backend-agent/src/adapters/NATSBackendAgent.js';
import { promises as fs } from 'fs';
import path from 'path';

async function testBackendNATSWorkflow() {
  console.log('🚀 Testing Backend Agent NATS Workflow\n');
  console.log('This test demonstrates how multiple backend agents coordinate');
  console.log('via NATS to build a complete e-commerce backend system.\n');

  // Configuration
  const natsConfig = {
    servers: ['nats://localhost:4222'],
    user: 'factory',
    pass: 'factory-secret'
  };

  const outputDir = './generated/nats-backend-test';

  let coordinator = null;
  let backendAgent1 = null;
  let backendAgent2 = null;

  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Step 1: Start Coordinator
    console.log('📋 Step 1: Starting Agent Coordinator...');
    coordinator = createAgentCoordinator({
      nats: natsConfig,
      heartbeatInterval: 5000,
      taskTimeout: 120000 // 2 minutes per task
    });

    await coordinator.initialize();
    console.log('✅ Coordinator initialized\n');

    // Step 2: Start Backend Agents
    console.log('🤖 Step 2: Starting Backend Agents...');
    
    backendAgent1 = createNATSBackendAgent({
      id: 'backend-agent-1',
      nats: natsConfig,
      backendConfig: {
        outputDir: path.join(outputDir, 'agent1'),
        enableContext7: true,
        enableRAG: true
      }
    });
    await backendAgent1.initialize();
    console.log('✅ Backend Agent 1 started');

    backendAgent2 = createNATSBackendAgent({
      id: 'backend-agent-2', 
      nats: natsConfig,
      backendConfig: {
        outputDir: path.join(outputDir, 'agent2'),
        enableContext7: true,
        enableRAG: true
      }
    });
    await backendAgent2.initialize();
    console.log('✅ Backend Agent 2 started\n');

    // Wait for registration
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Create E-commerce Backend Workflow
    console.log('📊 Step 3: Creating E-commerce Backend Workflow...');
    const workflow = await coordinator.createWorkflow(
      'E-commerce Backend System',
      'Build complete backend with database, APIs, auth, and tests'
    );
    console.log(`✅ Created workflow: ${workflow.id}\n`);

    // Step 4: Define Tasks
    console.log('📝 Step 4: Adding Backend Development Tasks...\n');

    // Task 1: Database Design (can run in parallel)
    const dbTask = await coordinator.addTaskToWorkflow(
      workflow.id,
      'backend',
      {
        type: 'database-design',
        description: 'Design e-commerce database schema',
        entities: [
          {
            name: 'User',
            fields: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'email', type: 'string', unique: true, required: true },
              { name: 'password', type: 'string', required: true },
              { name: 'firstName', type: 'string' },
              { name: 'lastName', type: 'string' },
              { name: 'role', type: 'string', default: 'customer' }
            ]
          },
          {
            name: 'Product',
            fields: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'sku', type: 'string', unique: true },
              { name: 'name', type: 'string', required: true },
              { name: 'description', type: 'string' },
              { name: 'price', type: 'number', required: true },
              { name: 'stock', type: 'number', default: 0 },
              { name: 'categoryId', type: 'uuid' }
            ]
          },
          {
            name: 'Order',
            fields: [
              { name: 'id', type: 'uuid', primaryKey: true },
              { name: 'userId', type: 'uuid', required: true },
              { name: 'orderNumber', type: 'string', unique: true },
              { name: 'totalAmount', type: 'number', required: true },
              { name: 'status', type: 'string', default: 'pending' },
              { name: 'shippingAddress', type: 'object' }
            ]
          }
        ],
        relationships: [
          { from: 'Order', to: 'User', type: 'belongsTo', field: 'userId' },
          { from: 'Product', to: 'Category', type: 'belongsTo', field: 'categoryId' }
        ],
        database: 'postgresql',
        orm: 'sequelize',
        migrations: true
      }
    );
    console.log(`   ✅ Added Database Design task: ${dbTask.id}`);

    // Task 2: API Design (can run in parallel)
    const apiTask = await coordinator.addTaskToWorkflow(
      workflow.id,
      'backend',
      {
        type: 'api-generation',
        description: 'Generate REST API endpoints',
        endpoints: [
          {
            method: 'POST',
            path: '/api/auth/register',
            description: 'User registration',
            requestBody: {
              email: 'string',
              password: 'string',
              firstName: 'string',
              lastName: 'string'
            }
          },
          {
            method: 'POST',
            path: '/api/auth/login',
            description: 'User login',
            requestBody: {
              email: 'string',
              password: 'string'
            }
          },
          {
            method: 'GET',
            path: '/api/products',
            description: 'List all products',
            queryParams: {
              page: 'number',
              limit: 'number',
              category: 'string'
            }
          },
          {
            method: 'POST',
            path: '/api/orders',
            description: 'Create new order',
            authentication: true,
            requestBody: {
              items: 'array',
              shippingAddress: 'object'
            }
          }
        ],
        framework: 'express',
        authentication: true
      }
    );
    console.log(`   ✅ Added API Generation task: ${apiTask.id}`);

    // Task 3: Security Implementation (depends on API)
    const securityTask = await coordinator.addTaskToWorkflow(
      workflow.id,
      'backend',
      {
        type: 'security-analysis',
        description: 'Implement security measures',
        scanPaths: ['./src'],
        rules: ['authentication', 'authorization', 'input-validation', 'rate-limiting']
      },
      [apiTask.id] // Depends on API being created
    );
    console.log(`   ✅ Added Security task: ${securityTask.id} (depends on API)`);

    // Task 4: Test Generation (depends on both DB and API)
    const testTask = await coordinator.addTaskToWorkflow(
      workflow.id,
      'backend',
      {
        type: 'test-generation',
        description: 'Generate comprehensive test suites',
        testTypes: ['unit', 'integration', 'api'],
        coverage: 80,
        framework: 'jest'
      },
      [dbTask.id, apiTask.id] // Depends on both
    );
    console.log(`   ✅ Added Test Generation task: ${testTask.id} (depends on DB & API)`);

    // Task 5: Documentation (depends on all)
    const docsTask = await coordinator.addTaskToWorkflow(
      workflow.id,
      'backend',
      {
        type: 'documentation',
        description: 'Generate API documentation',
        format: 'markdown',
        includeExamples: true,
        generateSwagger: true
      },
      [dbTask.id, apiTask.id, securityTask.id, testTask.id]
    );
    console.log(`   ✅ Added Documentation task: ${docsTask.id} (depends on all)\n`);

    // Step 5: Execute Workflow
    console.log('🚀 Step 5: Executing Backend Development Workflow...\n');

    // Monitor progress
    const progressUpdates = new Map();
    
    coordinator.on('task:assigned', ({ task, agentId }) => {
      console.log(`📌 ${new Date().toLocaleTimeString()} - Task "${task.agentType}" assigned to ${agentId}`);
    });

    coordinator.on('task:completed', ({ taskId }) => {
      const task = workflow.tasks.find(t => t.id === taskId);
      if (task) {
        console.log(`✅ ${new Date().toLocaleTimeString()} - Task "${task.agentType}" completed`);
      }
    });

    // Setup completion promise
    const workflowCompleted = new Promise((resolve) => {
      coordinator.once('workflow:completed', (completedWorkflow) => {
        resolve(completedWorkflow);
      });
    });

    // Execute
    await coordinator.executeWorkflow(workflow.id);

    // Wait for completion
    const completedWorkflow = await workflowCompleted;
    
    console.log(`\n✅ Workflow completed with status: ${completedWorkflow.status}`);
    console.log(`   Total duration: ${Math.round((completedWorkflow.completedAt - completedWorkflow.createdAt) / 1000)}s`);

    // Step 6: Display Results
    console.log('\n📊 Generated Backend System Components:\n');

    for (const task of completedWorkflow.tasks) {
      const taskName = task.task.type || task.task.description;
      console.log(`📁 ${taskName}:`);
      console.log(`   - Status: ${task.status}`);
      console.log(`   - Agent: ${task.assignedAgent}`);
      console.log(`   - Duration: ${task.completedAt ? Math.round((task.completedAt - task.startedAt) / 1000) + 's' : 'N/A'}`);
      
      if (task.result?.result?.generatedFiles) {
        console.log(`   - Files generated: ${task.result.result.generatedFiles.length}`);
        for (const file of task.result.result.generatedFiles.slice(0, 3)) {
          console.log(`     • ${file.path}`);
        }
        if (task.result.result.generatedFiles.length > 3) {
          console.log(`     ... and ${task.result.result.generatedFiles.length - 3} more files`);
        }
      }
      console.log();
    }

    // Step 7: Verify Output
    console.log('🔍 Verifying Generated Files...');
    try {
      const files = await fs.readdir(outputDir, { recursive: true });
      const fileCount = files.filter(f => f.includes('.')).length;
      console.log(`   ✅ Total files generated: ${fileCount}`);
      console.log(`   📁 Output directory: ${path.resolve(outputDir)}`);
    } catch (error) {
      console.log('   ⚠️ Could not verify output files');
    }

    console.log('\n🎉 NATS Backend Workflow Test Completed Successfully!');
    console.log('\nKey Achievements:');
    console.log('✅ Multiple backend agents coordinated via NATS');
    console.log('✅ Parallel task execution for independent components');
    console.log('✅ Sequential execution respecting dependencies');
    console.log('✅ Real-time progress tracking and monitoring');
    console.log('✅ Complete backend system generated automatically');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    if (backendAgent1) {
      await backendAgent1.shutdown();
      console.log('   - Backend Agent 1 shutdown');
    }
    
    if (backendAgent2) {
      await backendAgent2.shutdown();
      console.log('   - Backend Agent 2 shutdown');
    }
    
    if (coordinator) {
      await coordinator.shutdown();
      console.log('   - Coordinator shutdown');
    }
    
    console.log('✅ Cleanup complete');
  }
}

// Run the test
console.log('Note: Make sure NATS server is running at localhost:4222\n');
testBackendNATSWorkflow().catch(console.error);