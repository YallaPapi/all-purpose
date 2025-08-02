/**
 * Test Agent Coordinator
 * 
 * Simple coordinator for testing agent communication
 */

import { createAgentCoordinator } from './src/services/AgentCoordinator.js';

async function startTestCoordinator() {
  console.log('🎯 Starting Test Agent Coordinator\n');

  const coordinator = createAgentCoordinator({
    nats: {
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    },
    heartbeatInterval: 10000, // 10 seconds for testing
    taskTimeout: 60000 // 1 minute
  });

  try {
    await coordinator.initialize();
    console.log('✅ Coordinator initialized\n');

    // Monitor agent registrations
    coordinator.on('agent:registered', (agent) => {
      console.log(`🤖 Agent registered: ${agent.id} (${agent.type})`);
    });

    coordinator.on('agent:status-changed', ({ agentId, status }) => {
      console.log(`📊 Agent ${agentId} status: ${status}`);
    });

    coordinator.on('agent:offline', (agentId) => {
      console.log(`⚠️  Agent ${agentId} went offline`);
    });

    // Monitor workflows
    coordinator.on('workflow:created', (workflow) => {
      console.log(`📋 Workflow created: ${workflow.name} (${workflow.id})`);
    });

    coordinator.on('workflow:started', (workflowId) => {
      console.log(`🚀 Workflow ${workflowId} started`);
    });

    coordinator.on('workflow:completed', (workflow) => {
      console.log(`✅ Workflow ${workflow.id} completed (${workflow.status})`);
    });

    // Monitor tasks
    coordinator.on('task:assigned', ({ task, agentId }) => {
      console.log(`📌 Task assigned to ${agentId}: ${task.agentType}`);
    });

    coordinator.on('task:completed', ({ taskId }) => {
      console.log(`✅ Task ${taskId} completed`);
    });

    // Create a test workflow after agents register
    setTimeout(async () => {
      const agents = Array.from(['all-purpose-pattern', 'prd-parser', 'scaffold-generator', 'template-engine', 'parameter-flow'])
        .map(type => coordinator.getAvailableAgents(type))
        .flat();

      console.log(`\n📊 Available agents: ${agents.length}`);
      
      if (agents.length > 0) {
        console.log('\n🧪 Creating test workflow...');
        
        const workflow = await coordinator.createWorkflow(
          'Test Multi-Agent Workflow',
          'Demonstrates agent coordination'
        );

        // Add some test tasks
        const task1 = await coordinator.addTaskToWorkflow(
          workflow.id,
          'all-purpose-pattern',
          { 
            action: 'analyze',
            data: 'Test pattern analysis'
          }
        );

        const task2 = await coordinator.addTaskToWorkflow(
          workflow.id,
          'prd-parser',
          { 
            action: 'parse',
            data: 'Test PRD parsing'
          }
        );

        const task3 = await coordinator.addTaskToWorkflow(
          workflow.id,
          'scaffold-generator',
          { 
            action: 'generate',
            data: 'Test scaffold generation'
          },
          [task1.id, task2.id] // Depends on both previous tasks
        );

        console.log(`✅ Created workflow with ${workflow.tasks.length} tasks`);
        
        // Execute workflow
        console.log('\n🚀 Executing workflow...');
        await coordinator.executeWorkflow(workflow.id);
      }
    }, 5000); // Wait 5 seconds for agents to register

    // Status report every 30 seconds
    setInterval(() => {
      const agents = coordinator.getAvailableAgents('');
      console.log(`\n📊 Status: ${agents.length} agents online`);
    }, 30000);

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down coordinator...');
      await coordinator.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start coordinator:', error);
    process.exit(1);
  }
}

// Run
startTestCoordinator().catch(console.error);