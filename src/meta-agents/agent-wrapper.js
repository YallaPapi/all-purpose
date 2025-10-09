#!/usr/bin/env node

/**
 * Agent Wrapper - Handles agent startup and NATS integration
 * 
 * This wrapper provides a standardized way to start meta-agents
 * with proper error handling and NATS communication
 */

import { NATSAgentWrapper } from '../../services/NATSAgentWrapper.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get agent type from command line
const agentType = process.argv[2];
const agentId = process.argv[3] || `${agentType}-${Date.now()}`;

if (!agentType) {
  console.error('Usage: node agent-wrapper.js <agent-type> [agent-id]');
  process.exit(1);
}

/**
 * Simple agent implementation that logs activity
 */
class SimpleMetaAgent extends NATSAgentWrapper {
  constructor(config) {
    super(config);
    this.agentType = config.type;
  }

  protected async executeTask(task) {
    console.log(`[${this.config.id}] Executing task:`, task);
    
    // Simulate work
    await this.publishProgress(25, 'Starting task execution');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.publishProgress(50, 'Processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.publishProgress(75, 'Finalizing...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.publishProgress(100, 'Task complete');
    
    return {
      success: true,
      agentType: this.agentType,
      taskCompleted: task,
      timestamp: new Date()
    };
  }

  protected async onInitialize() {
    console.log(`[${this.config.id}] ${this.agentType} agent initialized`);
  }

  protected async onShutdown() {
    console.log(`[${this.config.id}] ${this.agentType} agent shutting down`);
  }
}

// Start the agent
async function startAgent() {
  console.log(`🚀 Starting ${agentType} agent with ID: ${agentId}`);

  const natsConfig = {
    servers: ['nats://localhost:4222'],
    user: 'factory',
    pass: 'factory-secret'
  };

  const agent = new SimpleMetaAgent({
    id: agentId,
    type: agentType,
    capability: `${agentType}-processing`,
    nats: natsConfig
  });

  try {
    await agent.initialize();
    console.log(`✅ ${agentType} agent started successfully`);
    
    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.log(`\n🛑 Shutting down ${agentType} agent...`);
      await agent.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await agent.shutdown();
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    console.error(`❌ Failed to start ${agentType} agent:`, error);
    process.exit(1);
  }
}

// Run
startAgent().catch(console.error);