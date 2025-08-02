/**
 * Test NATS Integration
 * 
 * Demonstrates the new NATS-based agent communication system
 */

import { createAgentCoordinator } from './src/services/AgentCoordinator.js';
import { ExampleAgent } from './src/services/NATSAgentWrapper.js';

async function testNATSIntegration() {
  console.log('🧪 Testing NATS Integration for Agent Communication\n');

  // Configuration
  const natsConfig = {
    servers: ['nats://localhost:4222'],
    user: 'factory',
    pass: 'factory-secret'
  };

  let coordinator = null;
  let agent1 = null;
  let agent2 = null;

  try {
    // Step 1: Initialize Agent Coordinator
    console.log('📋 Step 1: Starting Agent Coordinator...');
    coordinator = createAgentCoordinator({
      nats: natsConfig,
      heartbeatInterval: 5000, // 5 seconds for testing
      taskTimeout: 60000 // 1 minute
    });

    await coordinator.initialize();
    console.log('✅ Agent Coordinator initialized\n');

    // Step 2: Start Example Agents
    console.log('🤖 Step 2: Starting Example Agents...');
    
    agent1 = new ExampleAgent({
      id: 'example-agent-1',
      nats: natsConfig
    });
    await agent1.initialize();
    console.log('✅ Example Agent 1 started');

    agent2 = new ExampleAgent({
      id: 'example-agent-2',
      nats: natsConfig
    });
    await agent2.initialize();
    console.log('✅ Example Agent 2 started\n');

    // Wait for agents to register
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Create a Workflow
    console.log('📊 Step 3: Creating Workflow...');
    const workflow = await coordinator.createWorkflow(
      'Test NATS Workflow',
      'Demonstrates agent coordination via NATS'
    );
    console.log(`✅ Created workflow: ${workflow.id}\n`);

    // Step 4: Add Tasks to Workflow
    console.log('📝 Step 4: Adding Tasks to Workflow...');
    
    const task1 = await coordinator.addTaskToWorkflow(
      workflow.id,
      'example',
      { 
        name: 'Task 1',
        data: 'Process this data in parallel',
        parallel: true 
      }
    );
    console.log(`✅ Added task 1: ${task1.id}`);

    const task2 = await coordinator.addTaskToWorkflow(
      workflow.id,
      'example',
      { 
        name: 'Task 2',
        data: 'Process this data in parallel too',
        parallel: true 
      }
    );
    console.log(`✅ Added task 2: ${task2.id}`);

    const task3 = await coordinator.addTaskToWorkflow(
      workflow.id,
      'example',
      { 
        name: 'Task 3',
        data: 'Process after tasks 1 and 2',
        sequential: true 
      },
      [task1.id, task2.id] // Dependencies
    );
    console.log(`✅ Added task 3: ${task3.id} (depends on tasks 1 & 2)\n`);

    // Step 5: Execute Workflow
    console.log('🚀 Step 5: Executing Workflow...');
    
    // Setup workflow completion listener
    const workflowCompleted = new Promise((resolve) => {
      coordinator.once('workflow:completed', (completedWorkflow) => {
        resolve(completedWorkflow);
      });
    });

    // Monitor task progress
    coordinator.on('task:assigned', ({ task, agentId }) => {
      console.log(`   📌 Task ${task.id} assigned to ${agentId}`);
    });

    coordinator.on('task:completed', ({ taskId, result }) => {
      console.log(`   ✅ Task ${taskId} completed`);
    });

    // Execute workflow
    await coordinator.executeWorkflow(workflow.id);

    // Wait for completion
    const completedWorkflow = await workflowCompleted;
    console.log(`\n✅ Workflow completed with status: ${completedWorkflow.status}`);

    // Step 6: Show Results
    console.log('\n📊 Workflow Results:');
    for (const task of completedWorkflow.tasks) {
      console.log(`   Task ${task.id}:`);
      console.log(`   - Status: ${task.status}`);
      console.log(`   - Agent: ${task.assignedAgent}`);
      if (task.result) {
        console.log(`   - Result: ${JSON.stringify(task.result.data.output)}`);
      }
      if (task.error) {
        console.log(`   - Error: ${task.error}`);
      }
    }

    // Step 7: Verify NATS Communication
    console.log('\n🔍 NATS Communication Summary:');
    const agents = coordinator.getAvailableAgents('example');
    console.log(`   - Active agents: ${agents.length}`);
    for (const agent of agents) {
      console.log(`     • ${agent.id} - Status: ${agent.status}`);
    }

    console.log('\n✅ NATS Integration Test Completed Successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    if (agent1) {
      await agent1.shutdown();
      console.log('   - Agent 1 shutdown');
    }
    
    if (agent2) {
      await agent2.shutdown();
      console.log('   - Agent 2 shutdown');
    }
    
    if (coordinator) {
      await coordinator.shutdown();
      console.log('   - Coordinator shutdown');
    }
    
    console.log('✅ Cleanup complete');
  }
}

// Run the test
testNATSIntegration().catch(console.error);