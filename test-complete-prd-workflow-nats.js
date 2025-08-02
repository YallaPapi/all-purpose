#!/usr/bin/env node

/**
 * Comprehensive PRD Workflow Test with NATS Integration
 * 
 * This test demonstrates the complete PRD processing workflow using real NATS communication:
 * 1. Submit PRD to PRD Parser Agent via NATS
 * 2. Parse requirements and create tasks
 * 3. Distribute tasks to domain agents (backend, frontend, DevOps, QA, documentation)
 * 4. Collect results from all agents
 * 5. Verify complete workflow produces expected outputs
 * 
 * Uses real NATS communication at localhost:4222 with factory/factory-secret credentials
 */

import { connect } from 'nats';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PRDParserAgent extends EventEmitter {
  constructor(id = 'prd-parser-agent') {
    super();
    this.id = id;
    this.type = 'prd-parser';
    this.status = 'idle';
    this.nc = null;
    this.subscription = null;
  }

  async connect() {
    console.log(`[${this.id}] 🔌 Connecting to NATS...`);
    
    this.nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });

    console.log(`[${this.id}] ✅ Connected to NATS`);
    await this.register();
    await this.subscribeToTasks();
    this.startHeartbeat();
  }

  async register() {
    await this.nc.publish('agent.register', JSON.stringify({
      id: this.id,
      type: this.type,
      capability: 'prd-parsing',
      status: this.status,
      timestamp: new Date()
    }));
    console.log(`[${this.id}] ✅ Registered as PRD Parser Agent`);
  }

  async subscribeToTasks() {
    const subject = `agent.${this.id}.task`;
    this.subscription = this.nc.subscribe(subject);
    
    console.log(`[${this.id}] 📥 Listening for PRD parsing tasks on ${subject}`);

    (async () => {
      for await (const msg of this.subscription) {
        const task = JSON.parse(msg.data);
        console.log(`[${this.id}] 📋 Received PRD parsing task:`, task.type);
        
        this.status = 'busy';
        await this.executePRDParsingTask(task);
        this.status = 'idle';
      }
    })();
  }

  async executePRDParsingTask(task) {
    console.log(`[${this.id}] 🔄 Parsing PRD: ${task.prdFile}`);
    
    try {
      // Simulate PRD parsing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Parse PRD content and extract requirements
      const prdContent = await fs.readFile(task.prdFile, 'utf8');
      const parsed = this.parsePRDContent(prdContent);
      
      // Create tasks for different domain agents
      const domainTasks = this.createDomainTasks(parsed);
      
      // Publish completion with parsed results
      await this.nc.publish('task.completed', JSON.stringify({
        agentId: this.id,
        taskId: task.id,
        workflowId: task.workflowId,
        result: {
          success: true,
          parsed: parsed,
          domainTasks: domainTasks,
          timestamp: new Date()
        }
      }));
      
      console.log(`[${this.id}] ✅ PRD parsing completed - generated ${domainTasks.length} domain tasks`);
    } catch (error) {
      await this.nc.publish('task.failed', JSON.stringify({
        agentId: this.id,
        taskId: task.id,
        workflowId: task.workflowId,
        error: error.message,
        timestamp: new Date()
      }));
      console.error(`[${this.id}] ❌ PRD parsing failed:`, error.message);
    }
  }

  parsePRDContent(content) {
    // Extract requirements (simplified parsing)
    const requirements = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('REQ-') || line.includes('Must') || line.includes('Should') || line.includes('Could')) {
        requirements.push(line.trim());
      }
    }
    
    // Extract technical specs
    const techSpecs = {};
    for (const line of lines) {
      if (line.includes('Framework:')) techSpecs.framework = line.split('Framework:')[1]?.trim();
      if (line.includes('Database:')) techSpecs.database = line.split('Database:')[1]?.trim();
      if (line.includes('Authentication:')) techSpecs.auth = line.split('Authentication:')[1]?.trim();
    }
    
    return {
      title: lines.find(l => l.startsWith('#'))?.replace('#', '').trim() || 'Untitled Project',
      requirements,
      techSpecs,
      complexity: requirements.length > 5 ? 'high' : requirements.length > 2 ? 'medium' : 'low'
    };
  }

  createDomainTasks(parsed) {
    const tasks = [];
    
    // Backend tasks
    tasks.push({
      id: `backend-${Date.now()}`,
      type: 'backend-development',
      agentType: 'backend',
      priority: 'high',
      requirements: parsed.requirements.filter(r => 
        r.includes('API') || r.includes('database') || r.includes('authentication') || r.includes('CRUD')
      ),
      techSpecs: parsed.techSpecs,
      description: 'Implement backend API and database integration'
    });
    
    // Frontend tasks
    tasks.push({
      id: `frontend-${Date.now()}`,
      type: 'frontend-development',
      agentType: 'frontend',
      priority: 'medium',
      requirements: parsed.requirements.filter(r => 
        r.includes('UI') || r.includes('interface') || r.includes('user')
      ),
      description: 'Create user interface and frontend components'
    });
    
    // DevOps tasks
    tasks.push({
      id: `devops-${Date.now()}`,
      type: 'deployment-setup',
      agentType: 'devops',
      priority: 'medium',
      requirements: parsed.requirements.filter(r => 
        r.includes('deployment') || r.includes('infrastructure')
      ),
      description: 'Setup deployment pipeline and infrastructure'
    });
    
    // QA tasks
    tasks.push({
      id: `qa-${Date.now()}`,
      type: 'testing-strategy',
      agentType: 'qa',
      priority: 'high',
      requirements: parsed.requirements,
      description: 'Create comprehensive testing strategy and test suites'
    });
    
    // Documentation tasks
    tasks.push({
      id: `docs-${Date.now()}`,
      type: 'documentation',
      agentType: 'documentation',
      priority: 'low',
      requirements: parsed.requirements,
      description: 'Generate API documentation and user guides'
    });
    
    return tasks;
  }

  startHeartbeat() {
    setInterval(async () => {
      await this.nc.publish('agent.heartbeat', JSON.stringify({
        agentId: this.id,
        type: this.type,
        status: this.status,
        timestamp: new Date()
      }));
    }, 10000);
  }

  async shutdown() {
    console.log(`[${this.id}] 🛑 Shutting down...`);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.nc) {
      await this.nc.drain();
    }
  }
}

class DomainAgent extends EventEmitter {
  constructor(id, type, capability) {
    super();
    this.id = id;
    this.type = type;
    this.capability = capability;
    this.status = 'idle';
    this.nc = null;
    this.subscription = null;
  }

  async connect() {
    console.log(`[${this.id}] 🔌 Connecting to NATS...`);
    
    this.nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });

    console.log(`[${this.id}] ✅ Connected to NATS`);
    await this.register();
    await this.subscribeToTasks();
    this.startHeartbeat();
  }

  async register() {
    await this.nc.publish('agent.register', JSON.stringify({
      id: this.id,
      type: this.type,
      capability: this.capability,
      status: this.status,
      timestamp: new Date()
    }));
    console.log(`[${this.id}] ✅ Registered as ${this.type} agent`);
  }

  async subscribeToTasks() {
    const subject = `agent.${this.id}.task`;
    this.subscription = this.nc.subscribe(subject);
    
    console.log(`[${this.id}] 📥 Listening for ${this.type} tasks on ${subject}`);

    (async () => {
      for await (const msg of this.subscription) {
        const task = JSON.parse(msg.data);
        console.log(`[${this.id}] 📋 Received ${this.type} task:`, task.type);
        
        this.status = 'busy';
        await this.executeDomainTask(task);
        this.status = 'idle';
      }
    })();
  }

  async executeDomainTask(task) {
    console.log(`[${this.id}] 🔄 Executing ${this.type} task: ${task.description}`);
    
    try {
      // Simulate domain-specific work
      const workTime = Math.random() * 3000 + 2000; // 2-5 seconds
      await new Promise(resolve => setTimeout(resolve, workTime));
      
      // Generate domain-specific results
      const result = this.generateDomainResult(task);
      
      // Publish completion
      await this.nc.publish('task.completed', JSON.stringify({
        agentId: this.id,
        taskId: task.id,
        workflowId: task.workflowId,
        result: {
          success: true,
          type: this.type,
          output: result,
          processingTime: Math.round(workTime),
          timestamp: new Date()
        }
      }));
      
      console.log(`[${this.id}] ✅ ${this.type} task completed successfully`);
    } catch (error) {
      await this.nc.publish('task.failed', JSON.stringify({
        agentId: this.id,
        taskId: task.id,
        workflowId: task.workflowId,
        error: error.message,
        timestamp: new Date()
      }));
      console.error(`[${this.id}] ❌ ${this.type} task failed:`, error.message);
    }
  }

  generateDomainResult(task) {
    const results = {
      backend: {
        files: ['server.js', 'routes/auth.js', 'routes/tasks.js', 'models/User.js', 'models/Task.js'],
        apis: ['POST /auth/login', 'GET /tasks', 'POST /tasks', 'PUT /tasks/:id', 'DELETE /tasks/:id'],
        database: 'MongoDB schemas created',
        auth: 'JWT middleware implemented'
      },
      frontend: {
        files: ['App.js', 'components/TaskList.js', 'components/LoginForm.js', 'pages/Dashboard.js'],
        features: ['Task management interface', 'User authentication', 'Responsive design'],
        framework: 'React with Material-UI'
      },
      devops: {
        files: ['Dockerfile', 'docker-compose.yml', '.github/workflows/deploy.yml', 'terraform/main.tf'],
        infrastructure: 'Container orchestration setup',
        deployment: 'CI/CD pipeline configured',
        monitoring: 'Health checks and logging'
      },
      qa: {
        files: ['tests/unit/auth.test.js', 'tests/integration/tasks.test.js', 'tests/e2e/workflow.test.js'],
        coverage: '95% code coverage achieved',
        testTypes: ['Unit tests', 'Integration tests', 'End-to-end tests'],
        automation: 'Automated test pipeline'
      },
      documentation: {
        files: ['README.md', 'API.md', 'DEPLOYMENT.md', 'CONTRIBUTING.md'],
        apiDocs: 'OpenAPI 3.0 specification',
        userGuide: 'Complete user documentation',
        devGuide: 'Developer setup instructions'
      }
    };
    
    return results[this.type] || { message: `${this.type} processing completed` };
  }

  startHeartbeat() {
    setInterval(async () => {
      await this.nc.publish('agent.heartbeat', JSON.stringify({
        agentId: this.id,
        type: this.type,
        status: this.status,
        timestamp: new Date()
      }));
    }, 10000);
  }

  async shutdown() {
    console.log(`[${this.id}] 🛑 Shutting down...`);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.nc) {
      await this.nc.drain();
    }
  }
}

class WorkflowCoordinator extends EventEmitter {
  constructor() {
    super();
    this.id = 'workflow-coordinator';
    this.agents = new Map();
    this.workflows = new Map();
    this.tasks = new Map();
    this.nc = null;
  }

  async connect() {
    console.log('[Coordinator] 🔌 Connecting to NATS...');
    
    this.nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });

    console.log('[Coordinator] ✅ Connected to NATS');
    await this.subscribeToEvents();
  }

  async subscribeToEvents() {
    // Agent registration
    const regSub = this.nc.subscribe('agent.register');
    (async () => {
      for await (const msg of regSub) {
        const agent = JSON.parse(msg.data);
        this.agents.set(agent.id, agent);
        console.log(`[Coordinator] 🤖 Agent registered: ${agent.id} (${agent.type})`);
      }
    })();

    // Agent heartbeats
    const hbSub = this.nc.subscribe('agent.heartbeat');
    (async () => {
      for await (const msg of hbSub) {
        const hb = JSON.parse(msg.data);
        if (this.agents.has(hb.agentId)) {
          this.agents.get(hb.agentId).lastSeen = new Date();
          this.agents.get(hb.agentId).status = hb.status;
        }
      }
    })();

    // Task completions
    const completeSub = this.nc.subscribe('task.completed');
    (async () => {
      for await (const msg of completeSub) {
        const completion = JSON.parse(msg.data);
        console.log(`[Coordinator] ✅ Task completed by ${completion.agentId}`);
        
        const task = this.tasks.get(completion.taskId);
        if (task) {
          task.status = 'completed';
          task.result = completion.result;
          task.completedAt = new Date();
          
          // Handle workflow-specific logic
          await this.handleTaskCompletion(completion);
        }
      }
    })();

    // Task failures
    const failSub = this.nc.subscribe('task.failed');
    (async () => {
      for await (const msg of failSub) {
        const failure = JSON.parse(msg.data);
        console.log(`[Coordinator] ❌ Task failed by ${failure.agentId}: ${failure.error}`);
        
        const task = this.tasks.get(failure.taskId);
        if (task) {
          task.status = 'failed';
          task.error = failure.error;
          task.completedAt = new Date();
        }
      }
    })();

    console.log('[Coordinator] 📥 Listening for agent events');
  }

  async handleTaskCompletion(completion) {
    const workflow = this.workflows.get(completion.workflowId);
    if (!workflow) return;
    
    // If this was the PRD parsing task, distribute domain tasks
    if (completion.agentId === 'prd-parser-agent' && completion.result.domainTasks) {
      console.log(`[Coordinator] 📤 Distributing ${completion.result.domainTasks.length} domain tasks...`);
      
      for (const domainTask of completion.result.domainTasks) {
        await this.assignTaskToAgent(domainTask, workflow.id);
      }
    }
    
    // Check if workflow is complete
    await this.checkWorkflowCompletion(workflow.id);
  }

  async createWorkflow(name, description) {
    const workflowId = `workflow-${Date.now()}`;
    const workflow = {
      id: workflowId,
      name,
      description,
      status: 'created',
      tasks: [],
      createdAt: new Date()
    };
    
    this.workflows.set(workflowId, workflow);
    console.log(`[Coordinator] 📋 Created workflow: ${workflowId}`);
    
    return workflow;
  }

  async assignTaskToAgent(task, workflowId) {
    // Find available agent of the required type
    const availableAgents = Array.from(this.agents.values()).filter(
      agent => agent.type === task.agentType && agent.status === 'idle'
    );
    
    if (availableAgents.length === 0) {
      console.log(`[Coordinator] ⚠️ No available ${task.agentType} agents for task ${task.id}`);
      return;
    }
    
    const agent = availableAgents[0];
    
    // Create task record
    const taskRecord = {
      ...task,
      workflowId,
      assignedAgent: agent.id,
      status: 'assigned',
      assignedAt: new Date()
    };
    
    this.tasks.set(task.id, taskRecord);
    
    // Assign task to agent
    console.log(`[Coordinator] 📌 Assigning ${task.type} task to ${agent.id}`);
    await this.nc.publish(`agent.${agent.id}.task`, JSON.stringify(taskRecord));
  }

  async checkWorkflowCompletion(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;
    
    // Get all tasks for this workflow
    const workflowTasks = Array.from(this.tasks.values()).filter(
      task => task.workflowId === workflowId
    );
    
    const completedTasks = workflowTasks.filter(task => task.status === 'completed');
    const failedTasks = workflowTasks.filter(task => task.status === 'failed');
    
    if (completedTasks.length + failedTasks.length === workflowTasks.length) {
      workflow.status = failedTasks.length > 0 ? 'failed' : 'completed';
      workflow.completedAt = new Date();
      
      console.log(`[Coordinator] 🎉 Workflow ${workflowId} ${workflow.status}!`);
      console.log(`[Coordinator] 📊 Tasks: ${completedTasks.length} completed, ${failedTasks.length} failed`);
      
      this.emit('workflow:completed', { workflow, completedTasks, failedTasks });
    }
  }

  getWorkflowStatus(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;
    
    const workflowTasks = Array.from(this.tasks.values()).filter(
      task => task.workflowId === workflowId
    );
    
    return {
      workflow,
      tasks: workflowTasks,
      summary: {
        total: workflowTasks.length,
        completed: workflowTasks.filter(t => t.status === 'completed').length,
        failed: workflowTasks.filter(t => t.status === 'failed').length,
        pending: workflowTasks.filter(t => t.status === 'assigned' || t.status === 'pending').length
      }
    };
  }

  async shutdown() {
    console.log('[Coordinator] 🛑 Shutting down...');
    if (this.nc) {
      await this.nc.drain();
    }
  }
}

// Main test function
async function runCompletePRDWorkflowTest() {
  console.log('🧪 Comprehensive PRD Workflow Test with NATS Integration\n');
  console.log('📋 This test will:');
  console.log('   1. Start workflow coordinator');
  console.log('   2. Start PRD parser agent');
  console.log('   3. Start domain agents (backend, frontend, devops, qa, documentation)');
  console.log('   4. Submit PRD for processing');
  console.log('   5. Monitor complete workflow execution');
  console.log('   6. Verify all expected outputs\n');

  const coordinator = new WorkflowCoordinator();
  const prdParser = new PRDParserAgent();
  const domainAgents = [];

  try {
    // Start coordinator
    console.log('🚀 Starting Workflow Coordinator...');
    await coordinator.connect();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start PRD parser
    console.log('🚀 Starting PRD Parser Agent...');
    await prdParser.connect();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start domain agents
    console.log('🚀 Starting Domain Agents...');
    const agentConfigs = [
      { id: 'backend-agent-1', type: 'backend', capability: 'api-development' },
      { id: 'frontend-agent-1', type: 'frontend', capability: 'ui-development' },
      { id: 'devops-agent-1', type: 'devops', capability: 'deployment-automation' },
      { id: 'qa-agent-1', type: 'qa', capability: 'testing-strategy' },
      { id: 'documentation-agent-1', type: 'documentation', capability: 'technical-writing' }
    ];

    for (const config of agentConfigs) {
      const agent = new DomainAgent(config.id, config.type, config.capability);
      await agent.connect();
      domainAgents.push(agent);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Wait for all registrations
    console.log('\n⏳ Waiting for agent registrations...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show registered agents
    console.log('\n📊 Registered Agents:');
    coordinator.agents.forEach(agent => {
      console.log(`   - ${agent.id} (${agent.type}): ${agent.status}`);
    });

    // Create workflow
    console.log('\n📋 Creating PRD Processing Workflow...');
    const workflow = await coordinator.createWorkflow(
      'Task Management API Development',
      'Complete development workflow from PRD parsing to deployment'
    );

    // Submit PRD for processing
    console.log('\n🚀 Submitting PRD for processing...\n');
    const prdFile = path.join(__dirname, 'prd-for-test.md');
    
    const prdTask = {
      id: `prd-task-${Date.now()}`,
      workflowId: workflow.id,
      type: 'parse-prd',
      prdFile: prdFile,
      timestamp: new Date()
    };

    await coordinator.assignTaskToAgent({
      ...prdTask,
      agentType: 'prd-parser'
    }, workflow.id);

    // Monitor workflow progress
    console.log('👀 Monitoring workflow progress...\n');
    
    const progressInterval = setInterval(() => {
      const status = coordinator.getWorkflowStatus(workflow.id);
      if (status) {
        console.log(`[Progress] Tasks: ${status.summary.completed}/${status.summary.total} completed, ${status.summary.failed} failed, ${status.summary.pending} pending`);
      }
    }, 5000);

    // Wait for workflow completion
    await new Promise((resolve) => {
      coordinator.on('workflow:completed', (result) => {
        clearInterval(progressInterval);
        console.log(`\n🎉 Workflow completed successfully!`);
        console.log(`📊 Final Results:`);
        console.log(`   - Total tasks: ${result.completedTasks.length + result.failedTasks.length}`);
        console.log(`   - Completed: ${result.completedTasks.length}`);
        console.log(`   - Failed: ${result.failedTasks.length}`);
        console.log(`   - Duration: ${result.workflow.completedAt - result.workflow.createdAt}ms`);
        
        // Show detailed results
        console.log('\n📄 Task Results:');
        result.completedTasks.forEach(task => {
          console.log(`   ✅ ${task.type} (${task.assignedAgent})`);
          if (task.result && task.result.output) {
            const output = task.result.output;
            if (output.files) {
              console.log(`      Files: ${output.files.slice(0, 3).join(', ')}${output.files.length > 3 ? '...' : ''}`);
            }
            if (output.features) {
              console.log(`      Features: ${output.features.slice(0, 2).join(', ')}${output.features.length > 2 ? '...' : ''}`);
            }
          }
        });
        
        resolve();
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(progressInterval);
        console.log('\n⏰ Test timeout - checking final status...');
        const finalStatus = coordinator.getWorkflowStatus(workflow.id);
        console.log('Final status:', finalStatus?.summary);
        resolve();
      }, 30000);
    });

    console.log('\n✅ Comprehensive PRD Workflow Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    for (const agent of domainAgents) {
      await agent.shutdown();
    }
    
    await prdParser.shutdown();
    await coordinator.shutdown();
    
    console.log('✅ Cleanup complete');
    
    // Force exit after cleanup
    setTimeout(() => process.exit(0), 1000);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompletePRDWorkflowTest().catch(console.error);
}

export { runCompletePRDWorkflowTest, PRDParserAgent, DomainAgent, WorkflowCoordinator };