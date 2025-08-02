#!/usr/bin/env node

/**
 * Test NATS-Enabled Agent
 * A simple agent that connects to NATS and processes tasks
 */

import { connect, StringCodec, JSONCodec } from 'nats';

const sc = StringCodec();
const jc = JSONCodec();

class TestAgent {
  constructor(config) {
    this.config = {
      id: config.id || `test-agent-${Date.now()}`,
      type: config.type || 'test-agent',
      natsUrl: config.natsUrl || 'nats://localhost:4222',
      ...config
    };
    this.nc = null;
    this.subscription = null;
  }

  async connect() {
    console.log(`🔌 Connecting agent ${this.config.id} to NATS...`);
    
    try {
      this.nc = await connect({ 
        servers: this.config.natsUrl,
        name: this.config.id
      });
      
      console.log(`✅ Connected to NATS server`);
      
      // Subscribe to task queue
      const subject = `agent.${this.config.type}.tasks`;
      this.subscription = this.nc.subscribe(subject, {
        queue: this.config.type // Queue group for load balancing
      });
      
      console.log(`📬 Subscribed to ${subject} (queue: ${this.config.type})`);
      
      // Start processing tasks
      this.processTasks();
      
      // Send heartbeat
      this.startHeartbeat();
      
      // Register agent
      await this.registerAgent();
      
    } catch (error) {
      console.error(`❌ Failed to connect: ${error.message}`);
      throw error;
    }
  }

  async processTasks() {
    console.log(`🔄 Starting task processor...`);
    
    for await (const msg of this.subscription) {
      try {
        const task = jc.decode(msg.data);
        console.log(`📋 Received task: ${task.id}`);
        
        // Process the task
        const result = await this.processTask(task);
        
        // Send response
        if (msg.reply) {
          await this.nc.publish(msg.reply, jc.encode({
            taskId: task.id,
            agentId: this.config.id,
            status: 'completed',
            result: result
          }));
        }
        
        // Publish completion event
        await this.nc.publish('agent.task.completed', jc.encode({
          taskId: task.id,
          agentId: this.config.id,
          agentType: this.config.type,
          timestamp: new Date().toISOString()
        }));
        
      } catch (error) {
        console.error(`❌ Task processing error: ${error.message}`);
        
        if (msg.reply) {
          await this.nc.publish(msg.reply, jc.encode({
            taskId: task?.id || 'unknown',
            agentId: this.config.id,
            status: 'failed',
            error: error.message
          }));
        }
      }
    }
  }

  async processTask(task) {
    console.log(`🔧 Processing task ${task.id} of type ${task.type}`);
    
    // Simulate task processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock result
    return {
      processed: true,
      timestamp: new Date().toISOString(),
      data: task.data
    };
  }

  async startHeartbeat() {
    setInterval(async () => {
      try {
        await this.nc.publish('agent.heartbeat', jc.encode({
          agentId: this.config.id,
          agentType: this.config.type,
          status: 'active',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Heartbeat error:', error.message);
      }
    }, 5000);
  }

  async registerAgent() {
    console.log(`📝 Registering agent...`);
    
    await this.nc.publish('agent.register', jc.encode({
      agentId: this.config.id,
      agentType: this.config.type,
      capabilities: ['process-task', 'heartbeat'],
      timestamp: new Date().toISOString()
    }));
    
    console.log(`✅ Agent registered`);
  }

  async disconnect() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
    }
    if (this.nc) {
      await this.nc.close();
    }
    console.log(`👋 Agent ${this.config.id} disconnected`);
  }
}

// Run the test agent
async function main() {
  const agent = new TestAgent({
    type: 'test-agent',
    natsUrl: 'nats://localhost:4222'
  });
  
  try {
    await agent.connect();
    console.log(`\n🤖 Test agent running. Press Ctrl+C to stop.\n`);
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down...');
      await agent.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start agent:', error);
    process.exit(1);
  }
}

main().catch(console.error);