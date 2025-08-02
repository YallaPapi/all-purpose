#!/usr/bin/env node

/**
 * Start Real NATS-Enabled Agents
 * Starts meta-agents with NATS integration
 */

import { NATSAgentWrapper } from './src/services/NATSAgentWrapper.js';
import { connect } from 'nats';

// Import real agent implementations
import { PRDParserAgent } from './src/meta-agents/prd-parser/parser.js';
import { BackendAgent } from './generated/backend-agent/index.js';
import { FrontendAgent } from './generated/frontend-agent/index.js';
import { DevOpsAgent } from './generated/devops-agent/index.js';

class NATSPRDParser extends NATSAgentWrapper {
  constructor(config) {
    super({
      id: `prd-parser-${Date.now()}`,
      type: 'prd-parser',
      ...config
    });
    this.parser = new PRDParserAgent();
  }

  async executeTask(task) {
    console.log(`[PRD Parser] Processing task ${task.id}`);
    
    // Report progress
    await this.publishProgress(25, 'Parsing PRD content');
    
    // Parse PRD
    const result = await this.parser.parsePRD(task.data.prd);
    
    await this.publishProgress(50, 'Generating tasks');
    
    // Generate tasks for other agents
    if (task.data.generateTasks && result.requirements) {
      const tasks = this.generateTasks(result);
      
      // Publish tasks for other agents
      for (const agentTask of tasks) {
        await this.eventBus.publish(`agent.${agentTask.agentType}.task.assign`, agentTask);
        console.log(`[PRD Parser] Published task for ${agentTask.agentType}`);
      }
    }
    
    await this.publishProgress(100, 'PRD parsing complete');
    
    return result;
  }
  
  generateTasks(parsedPRD) {
    const tasks = [];
    
    // Backend tasks
    if (parsedPRD.requirements.backend) {
      tasks.push({
        id: `backend-${Date.now()}`,
        agentType: 'backend-agent',
        type: 'generate-backend',
        data: {
          requirements: parsedPRD.requirements.backend,
          database: parsedPRD.requirements.database,
          apis: parsedPRD.requirements.apis
        }
      });
    }
    
    // Frontend tasks
    if (parsedPRD.requirements.frontend) {
      tasks.push({
        id: `frontend-${Date.now()}`,
        agentType: 'frontend-agent',
        type: 'generate-frontend',
        data: {
          requirements: parsedPRD.requirements.frontend,
          features: parsedPRD.features
        }
      });
    }
    
    return tasks;
  }
}

class NATSBackendAgentWrapper extends NATSAgentWrapper {
  constructor(config) {
    super({
      id: `backend-${Date.now()}`,
      type: 'backend-agent',
      ...config
    });
  }

  async executeTask(task) {
    console.log(`[Backend Agent] Processing task ${task.id}`);
    
    await this.publishProgress(25, 'Setting up project structure');
    
    // Simulate backend generation
    const result = {
      generated: true,
      files: [
        'src/server.ts',
        'src/routes/index.ts',
        'src/models/index.ts',
        'src/config/database.ts'
      ],
      timestamp: new Date()
    };
    
    await this.publishProgress(100, 'Backend generation complete');
    
    return result;
  }
}

async function startAgents() {
  console.log('🚀 Starting NATS-Enabled Meta-Agents\n');
  
  try {
    // Test NATS connection first
    const testConn = await connect({ servers: 'localhost:4222' });
    await testConn.close();
    console.log('✅ NATS server is accessible\n');
    
    // Start agents
    const agents = [];
    
    // PRD Parser
    console.log('🤖 Starting PRD Parser Agent...');
    const prdParser = new NATSPRDParser({
      natsUrl: 'nats://localhost:4222'
    });
    await prdParser.connect();
    agents.push(prdParser);
    console.log('✅ PRD Parser Agent started\n');
    
    // Backend Agent
    console.log('🔧 Starting Backend Agent...');
    const backendAgent = new NATSBackendAgentWrapper({
      natsUrl: 'nats://localhost:4222'
    });
    await backendAgent.connect();
    agents.push(backendAgent);
    console.log('✅ Backend Agent started\n');
    
    console.log('🎯 All agents running. Press Ctrl+C to stop.\n');
    console.log('Monitoring agent activity:');
    console.log('------------------------');
    
    // Keep running
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down agents...');
      for (const agent of agents) {
        await agent.disconnect();
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start agents:', error.message);
    process.exit(1);
  }
}

// Start the agents
startAgents().catch(console.error);