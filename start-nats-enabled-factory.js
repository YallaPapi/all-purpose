#!/usr/bin/env node

/**
 * Start NATS-Enabled Factory
 * Creates a bridge between factory-created agents and NATS
 */

import { connect, JSONCodec } from 'nats';
import fetch from 'node-fetch';

const jc = JSONCodec();

class FactoryNATSBridge {
  constructor() {
    this.nc = null;
    this.agents = new Map();
    this.factoryUrl = 'http://localhost:3005';
  }

  async connect() {
    console.log('🌉 Starting Factory-NATS Bridge\n');
    
    // Connect to NATS
    this.nc = await connect({ servers: 'localhost:4222' });
    console.log('✅ Connected to NATS');
    
    // Subscribe to factory events
    await this.subscribeToFactoryEvents();
    
    // Subscribe to task submissions
    await this.subscribeToTaskSubmissions();
    
    console.log('✅ Bridge ready\n');
  }

  async subscribeToFactoryEvents() {
    // Listen for agent creation events
    const sub = this.nc.subscribe('meta.agent.created');
    
    (async () => {
      for await (const msg of sub) {
        try {
          const event = jc.decode(msg.data);
          console.log(`🤖 Agent created: ${event.agentId} (${event.type})`);
          
          // Create NATS handler for this agent
          await this.createNATSHandler(event.agentId, event.type);
        } catch (err) {
          console.error('Error handling agent creation:', err);
        }
      }
    })();
  }

  async subscribeToTaskSubmissions() {
    // Listen for task submissions
    const sub = this.nc.subscribe('factory.task.submit');
    
    (async () => {
      for await (const msg of sub) {
        try {
          const task = jc.decode(msg.data);
          console.log(`📋 Task submitted: ${task.taskId} for ${task.agentType}`);
          
          // Process the task
          await this.processTask(task);
        } catch (err) {
          console.error('Error handling task submission:', err);
        }
      }
    })();
  }

  async createNATSHandler(agentId, agentType) {
    // Subscribe to agent-specific tasks
    const taskSub = this.nc.subscribe(`agent.${agentType}.task.assign`);
    
    (async () => {
      for await (const msg of taskSub) {
        try {
          const task = jc.decode(msg.data);
          console.log(`[${agentId}] Received task: ${task.id}`);
          
          // Execute task based on type
          const result = await this.executeAgentTask(agentId, agentType, task);
          
          // Publish result
          if (msg.reply) {
            await this.nc.publish(msg.reply, jc.encode(result));
          }
          
          // Publish completion event
          await this.nc.publish('task.completed', jc.encode({
            taskId: task.id,
            agentId: agentId,
            status: 'completed',
            result: result
          }));
          
          console.log(`[${agentId}] Task completed: ${task.id}`);
          
        } catch (err) {
          console.error(`[${agentId}] Task error:`, err);
        }
      }
    })();
    
    // Send heartbeats
    setInterval(async () => {
      await this.nc.publish('agent.heartbeat', jc.encode({
        agentId: agentId,
        agentType: agentType,
        status: 'active',
        timestamp: new Date()
      }));
    }, 30000);
    
    this.agents.set(agentId, { type: agentType, sub: taskSub });
  }

  async executeAgentTask(agentId, agentType, task) {
    console.log(`[${agentId}] Executing ${task.type} task...`);
    
    // Simulate different agent behaviors
    switch (agentType) {
      case 'prd-parser':
        return await this.executePRDParser(task);
      
      case 'backend-agent':
        return await this.executeBackendAgent(task);
        
      case 'frontend-agent':
        return await this.executeFrontendAgent(task);
        
      default:
        return { processed: true, agentType, taskId: task.id };
    }
  }

  async executePRDParser(task) {
    const prd = task.data.prd || task.data.content || '';
    
    // Simple PRD parsing
    const result = {
      title: prd.match(/^#\s+(.+)$/m)?.[1] || 'Untitled',
      requirements: {
        backend: ['Node.js', 'Express', 'PostgreSQL'],
        frontend: ['React', 'TypeScript'],
        database: ['PostgreSQL']
      },
      tasks: []
    };
    
    // Generate tasks for other agents
    if (task.data.generateTasks) {
      // Backend task
      const backendTask = {
        id: `backend-task-${Date.now()}`,
        type: 'generate-backend',
        data: {
          requirements: result.requirements.backend,
          database: result.requirements.database
        }
      };
      
      await this.nc.publish('agent.backend-agent.task.assign', jc.encode(backendTask));
      console.log('[PRD Parser] Published backend task');
      
      // Frontend task
      const frontendTask = {
        id: `frontend-task-${Date.now()}`,
        type: 'generate-frontend',
        data: {
          requirements: result.requirements.frontend
        }
      };
      
      await this.nc.publish('agent.frontend-agent.task.assign', jc.encode(frontendTask));
      console.log('[PRD Parser] Published frontend task');
    }
    
    return result;
  }

  async executeBackendAgent(task) {
    return {
      generated: true,
      files: [
        'src/server.js',
        'src/routes/index.js',
        'src/models/user.js',
        'src/config/database.js'
      ],
      framework: 'express',
      database: 'postgresql'
    };
  }

  async executeFrontendAgent(task) {
    return {
      generated: true,
      files: [
        'src/App.tsx',
        'src/components/index.ts',
        'src/pages/Home.tsx',
        'src/api/client.ts'
      ],
      framework: 'react',
      typescript: true
    };
  }

  async processTask(task) {
    // Find or create agent
    let agentId = task.agentId;
    
    if (!this.agents.has(agentId)) {
      // Create agent via factory API
      try {
        const res = await fetch(`${this.factoryUrl}/api/factory/meta-agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType: task.agentType,
            config: {}
          })
        });
        
        if (res.ok) {
          const agent = await res.json();
          agentId = agent.data.id;
          console.log(`✅ Created agent: ${agentId}`);
          
          // Create NATS handler
          await this.createNATSHandler(agentId, task.agentType);
        }
      } catch (err) {
        console.error('Failed to create agent:', err);
        return;
      }
    }
    
    // Execute task
    const result = await this.executeAgentTask(agentId, task.agentType, task);
    
    // Publish result
    await this.nc.publish('task.completed', jc.encode({
      taskId: task.taskId,
      agentId: agentId,
      result: result
    }));
  }

  async disconnect() {
    if (this.nc) {
      await this.nc.close();
    }
  }
}

// Start the bridge
async function main() {
  const bridge = new FactoryNATSBridge();
  
  try {
    await bridge.connect();
    
    console.log('🎯 Factory-NATS Bridge running');
    console.log('📡 Monitoring for agent creation and tasks...\n');
    
    // Keep running
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down bridge...');
      await bridge.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start bridge:', error);
    process.exit(1);
  }
}

main().catch(console.error);