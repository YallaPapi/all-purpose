#!/usr/bin/env node

/**
 * Test Workflow Dependency Handling
 * 
 * Verifies that tasks with dependencies are executed in the correct order
 */

import { connect } from 'nats';
import { EventEmitter } from 'events';

class WorkflowOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.nc = null;
    this.workflows = new Map();
    this.tasks = new Map();
    this.completedTasks = new Set();
  }

  async connect() {
    this.nc = await connect({
      servers: 'nats://localhost:4222',
      user: 'factory',
      pass: 'factory-secret'
    });

    // Subscribe to task completions
    const completeSub = this.nc.subscribe('task.completed');
    (async () => {
      for await (const msg of completeSub) {
        const result = JSON.parse(msg.string());
        await this.handleTaskCompletion(result);
      }
    })();

    console.log('✅ Workflow orchestrator connected');
  }

  async createWorkflow(id, tasks) {
    const workflow = {
      id,
      tasks: new Map(),
      status: 'created',
      createdAt: new Date()
    };

    // Add tasks to workflow
    for (const task of tasks) {
      workflow.tasks.set(task.id, {
        ...task,
        status: 'pending',
        dependencies: task.dependencies || []
      });
      this.tasks.set(task.id, task);
    }

    this.workflows.set(id, workflow);
    console.log(`📋 Created workflow ${id} with ${tasks.length} tasks`);
    
    // Start workflow execution
    await this.executeWorkflow(id);
  }

  async executeWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    workflow.status = 'running';
    
    // Find and execute ready tasks
    await this.executeReadyTasks(workflowId);
  }

  async executeReadyTasks(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    for (const [taskId, task] of workflow.tasks) {
      if (task.status === 'pending' && this.areDependenciesMet(task)) {
        await this.executeTask(workflowId, taskId);
      }
    }
  }

  areDependenciesMet(task) {
    // Check if all dependencies are completed
    for (const depId of task.dependencies) {
      if (!this.completedTasks.has(depId)) {
        return false;
      }
    }
    return true;
  }

  async executeTask(workflowId, taskId) {
    const workflow = this.workflows.get(workflowId);
    const task = workflow.tasks.get(taskId);
    
    if (!task || task.status !== 'pending') return;

    task.status = 'running';
    console.log(`🔄 Executing task ${taskId} (deps: ${task.dependencies.join(', ') || 'none'})`);

    // Publish task to appropriate agent
    const subject = task.agentId ? 
      `agent.${task.agentId}.task` : 
      `agent.type.${task.type}.task`;

    await this.nc.publish(subject, JSON.stringify({
      id: taskId,
      workflowId,
      type: task.type,
      payload: task.payload
    }));
  }

  async handleTaskCompletion(result) {
    const { taskId, success } = result;
    
    if (!success) {
      console.log(`❌ Task ${taskId} failed`);
      return;
    }

    console.log(`✅ Task ${taskId} completed`);
    this.completedTasks.add(taskId);

    // Find workflow containing this task
    for (const [workflowId, workflow] of this.workflows) {
      if (workflow.tasks.has(taskId)) {
        const task = workflow.tasks.get(taskId);
        task.status = 'completed';
        task.result = result;

        // Check for newly ready tasks
        await this.executeReadyTasks(workflowId);

        // Check if workflow is complete
        if (this.isWorkflowComplete(workflowId)) {
          workflow.status = 'completed';
          console.log(`🎉 Workflow ${workflowId} completed!`);
          this.emit('workflow:completed', { workflowId, workflow });
        }
        break;
      }
    }
  }

  isWorkflowComplete(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    for (const task of workflow.tasks.values()) {
      if (task.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  async shutdown() {
    if (this.nc) {
      await this.nc.drain();
    }
  }
}

// Test function
async function testWorkflowDependencies() {
  console.log('🧪 Testing Workflow Dependency Handling\n');

  const orchestrator = new WorkflowOrchestrator();

  try {
    await orchestrator.connect();

    // Create a workflow with dependencies
    const tasks = [
      {
        id: 'task-1',
        type: 'parse-prd',
        dependencies: [],
        payload: { content: 'Test PRD content' }
      },
      {
        id: 'task-2',
        type: 'generate-backend',
        dependencies: ['task-1'], // Depends on PRD parsing
        payload: { spec: 'Generate from parsed PRD' }
      },
      {
        id: 'task-3',
        type: 'generate-frontend',
        dependencies: ['task-1'], // Also depends on PRD parsing
        payload: { spec: 'Generate UI from parsed PRD' }
      },
      {
        id: 'task-4',
        type: 'generate-tests',
        dependencies: ['task-2', 'task-3'], // Depends on both backend and frontend
        payload: { spec: 'Generate tests for complete system' }
      },
      {
        id: 'task-5',
        type: 'deploy',
        dependencies: ['task-4'], // Final task depends on tests
        payload: { spec: 'Deploy complete system' }
      }
    ];

    console.log('📊 Workflow structure:');
    console.log('   task-1 (parse-prd)');
    console.log('   ├── task-2 (backend) ─┐');
    console.log('   └── task-3 (frontend) ┴── task-4 (tests) ── task-5 (deploy)');
    console.log('');

    // Create workflow
    await orchestrator.createWorkflow('test-workflow-001', tasks);

    // Wait for completion
    await new Promise((resolve) => {
      orchestrator.on('workflow:completed', ({ workflowId }) => {
        console.log(`\n✅ Workflow ${workflowId} completed with correct dependency order!`);
        resolve();
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        console.log('\n⏰ Test timeout - workflow did not complete');
        resolve();
      }, 30000);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await orchestrator.shutdown();
    console.log('\n🧹 Test cleanup complete');
  }
}

// Simulate some mock agents that complete tasks
async function startMockAgents() {
  const nc = await connect({
    servers: 'nats://localhost:4222',
    user: 'factory',
    pass: 'factory-secret'
  });

  // Subscribe to different task types
  const taskTypes = ['parse-prd', 'generate-backend', 'generate-frontend', 'generate-tests', 'deploy'];
  
  for (const taskType of taskTypes) {
    const sub = nc.subscribe(`agent.type.${taskType}.task`);
    
    (async () => {
      for await (const msg of sub) {
        const task = JSON.parse(msg.string());
        console.log(`[Mock ${taskType}] Processing task ${task.id}...`);
        
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        // Publish completion
        await nc.publish('task.completed', JSON.stringify({
          taskId: task.id,
          agentId: `mock-${taskType}`,
          success: true,
          result: { message: `${taskType} completed` },
          timestamp: new Date()
        }));
      }
    })();
  }

  console.log('🤖 Mock agents started\n');
  return nc;
}

// Run test
async function runTest() {
  // Start mock agents first
  const mockAgentsNc = await startMockAgents();
  
  // Run workflow test
  await testWorkflowDependencies();
  
  // Cleanup
  await mockAgentsNc.drain();
  process.exit(0);
}

runTest().catch(console.error);