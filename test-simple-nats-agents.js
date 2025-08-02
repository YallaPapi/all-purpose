/**
 * Simple NATS Agent Test
 * 
 * Tests basic NATS communication between agents without complex dependencies
 */

import { connect } from 'nats';
import { EventEmitter } from 'events';

class SimpleAgent extends EventEmitter {
  constructor(id, type) {
    super();
    this.id = id;
    this.type = type;
    this.status = 'idle';
    this.nc = null;
    this.subscription = null;
  }

  async connect() {
    console.log(`[${this.id}] Connecting to NATS...`);
    
    this.nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });

    console.log(`[${this.id}] ✅ Connected to NATS`);

    // Register agent
    await this.register();
    
    // Subscribe to tasks
    await this.subscribeToTasks();
    
    // Start heartbeat
    this.startHeartbeat();
  }

  async register() {
    await this.nc.publish('agent.register', JSON.stringify({
      id: this.id,
      type: this.type,
      status: this.status,
      timestamp: new Date()
    }));
    console.log(`[${this.id}] ✅ Registered`);
  }

  async subscribeToTasks() {
    const subject = `agent.${this.id}.task`;
    this.subscription = this.nc.subscribe(subject);
    
    console.log(`[${this.id}] 📥 Listening for tasks on ${subject}`);

    (async () => {
      for await (const msg of this.subscription) {
        const task = JSON.parse(msg.data);
        console.log(`[${this.id}] 📋 Received task:`, task);
        
        this.status = 'busy';
        await this.executeTask(task);
        this.status = 'idle';
      }
    })();
  }

  async executeTask(task) {
    console.log(`[${this.id}] 🔄 Executing task...`);
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Publish completion
    await this.nc.publish('task.completed', JSON.stringify({
      agentId: this.id,
      taskId: task.id,
      result: { success: true, data: `Processed by ${this.id}` },
      timestamp: new Date()
    }));
    
    console.log(`[${this.id}] ✅ Task completed`);
  }

  startHeartbeat() {
    setInterval(async () => {
      await this.nc.publish('agent.heartbeat', JSON.stringify({
        id: this.id,
        type: this.type,
        status: this.status,
        timestamp: new Date()
      }));
    }, 5000);
  }

  async shutdown() {
    console.log(`[${this.id}] Shutting down...`);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.nc) {
      await this.nc.drain();
    }
  }
}

class SimpleCoordinator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.nc = null;
  }

  async connect() {
    console.log('[Coordinator] Connecting to NATS...');
    
    this.nc = await connect({
      servers: ['nats://localhost:4222'],
      user: 'factory',
      pass: 'factory-secret'
    });

    console.log('[Coordinator] ✅ Connected to NATS');

    // Subscribe to agent events
    await this.subscribeToAgentEvents();
  }

  async subscribeToAgentEvents() {
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
        if (this.agents.has(hb.id)) {
          this.agents.get(hb.id).lastSeen = new Date();
          this.agents.get(hb.id).status = hb.status;
        }
      }
    })();

    // Task completions
    const completeSub = this.nc.subscribe('task.completed');
    (async () => {
      for await (const msg of completeSub) {
        const completion = JSON.parse(msg.data);
        console.log(`[Coordinator] ✅ Task completed by ${completion.agentId}`);
      }
    })();

    console.log('[Coordinator] 📥 Listening for agent events');
  }

  async assignTask(agentId, task) {
    console.log(`[Coordinator] 📌 Assigning task to ${agentId}`);
    await this.nc.publish(`agent.${agentId}.task`, JSON.stringify({
      id: `task-${Date.now()}`,
      ...task
    }));
  }

  getAgents() {
    return Array.from(this.agents.values());
  }

  async shutdown() {
    console.log('[Coordinator] Shutting down...');
    if (this.nc) {
      await this.nc.drain();
    }
  }
}

// Test function
async function runTest() {
  console.log('🧪 Simple NATS Agent Test\n');

  const coordinator = new SimpleCoordinator();
  const agents = [];

  try {
    // Start coordinator
    await coordinator.connect();
    
    // Start agents
    const agentConfigs = [
      { id: 'agent-1', type: 'pattern-detector' },
      { id: 'agent-2', type: 'code-generator' },
      { id: 'agent-3', type: 'validator' }
    ];

    for (const config of agentConfigs) {
      const agent = new SimpleAgent(config.id, config.type);
      await agent.connect();
      agents.push(agent);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait for registrations
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show registered agents
    console.log('\n📊 Registered Agents:');
    coordinator.getAgents().forEach(agent => {
      console.log(`   - ${agent.id} (${agent.type}): ${agent.status}`);
    });

    // Assign some tasks
    console.log('\n🚀 Assigning tasks...\n');
    
    await coordinator.assignTask('agent-1', {
      type: 'analyze',
      data: 'Find patterns in code'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    await coordinator.assignTask('agent-2', {
      type: 'generate',
      data: 'Create new component'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    await coordinator.assignTask('agent-3', {
      type: 'validate',
      data: 'Check generated code'
    });

    // Wait for completions
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    for (const agent of agents) {
      await agent.shutdown();
    }
    
    await coordinator.shutdown();
    
    console.log('✅ Cleanup complete');
  }
}

// Run the test
runTest().catch(console.error);