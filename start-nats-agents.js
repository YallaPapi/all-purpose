#!/usr/bin/env node

/**
 * Start NATS-Enabled Meta-Agents
 * 
 * This script wraps existing meta-agents with NATS communication
 * and starts them as distributed services
 */

import { NATSAgentWrapper } from './src/services/NATSAgentWrapper.js';
import PRDParser from './src/meta-agents/prd-parser/parser.js';
import { spawn } from 'child_process';

const agents = [];

// Agent configurations
const agentConfigs = [
  {
    id: 'prd-parser-001',
    type: 'prd-parser',
    name: 'PRD Parser Agent',
    capabilities: ['prd-parsing', 'requirements-extraction', 'task-generation'],
    createAgent: () => new PRDParser()
  },
  // Add more agents as we integrate them
];

async function startAgents() {
  console.log('🚀 Starting NATS-Enabled Meta-Agents\n');

  try {
    // Start each agent
    for (const config of agentConfigs) {
      console.log(`📦 Starting ${config.name}...`);
      
      const wrappedAgent = config.createAgent();
      const natsAgent = new NATSAgentWrapper(config, wrappedAgent);
      
      await natsAgent.connect();
      agents.push(natsAgent);
      
      console.log(`✅ ${config.name} started successfully\n`);
    }

    console.log(`🎉 All ${agents.length} agents started successfully!`);
    console.log('📡 Agents are now listening for tasks via NATS\n');

    // Start monitoring dashboard in separate process
    console.log('🖥️  Starting monitoring dashboard...');
    const dashboard = spawn('node', ['test-agent-coordinator.js'], {
      stdio: 'inherit'
    });

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down agents...');
      
      for (const agent of agents) {
        await agent.shutdown();
      }
      
      if (dashboard) {
        dashboard.kill();
      }
      
      console.log('✅ All agents stopped');
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Failed to start agents:', error);
    process.exit(1);
  }
}

// Run
startAgents().catch(console.error);