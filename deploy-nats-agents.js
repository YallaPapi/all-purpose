#!/usr/bin/env node

/**
 * Deploy NATS-Enabled Agents
 * Uses existing NATSAgentWrapper to start agents
 */

import { NATSAgentWrapper } from './src/services/NATSAgentWrapper.js';

// Mock agents for testing
const mockPRDParser = {
  id: 'prd-parser-mock',
  type: 'prd-parser',
  parsePRD: async (content) => {
    console.log('[PRD Parser] Parsing PRD...');
    return {
      title: 'Parsed PRD',
      requirements: {
        backend: ['Node.js', 'Express', 'PostgreSQL'],
        frontend: ['React', 'TypeScript'],
        database: ['PostgreSQL', 'Prisma']
      },
      features: ['Authentication', 'CRUD Operations', 'Real-time Updates']
    };
  }
};

const mockBackendAgent = {
  id: 'backend-agent-mock',
  type: 'backend-agent',
  generateBackend: async (requirements) => {
    console.log('[Backend Agent] Generating backend...');
    return {
      files: ['server.ts', 'routes/index.ts', 'models/user.ts'],
      generated: true
    };
  }
};

async function deployAgents() {
  console.log('🚀 Deploying NATS-Enabled Agents\n');
  
  const agents = [];
  
  try {
    // Deploy PRD Parser
    console.log('📋 Deploying PRD Parser Agent...');
    const prdParserWrapper = new NATSAgentWrapper(
      {
        id: `prd-parser-${Date.now()}`,
        type: 'prd-parser',
        natsUrl: 'nats://localhost:4222',
        capabilities: ['parse-prd', 'generate-tasks']
      },
      mockPRDParser
    );
    
    // Override executeTask to handle PRD parsing
    prdParserWrapper.executeTask = async function(task) {
      console.log(`[${this.config.id}] Executing task ${task.id}`);
      
      if (this.status === 'busy') {
        throw new Error('Agent is busy');
      }
      
      this.status = 'busy';
      this.currentTask = task;
      
      try {
        // Parse PRD
        await this.publishProgress(10, 'Starting PRD parsing');
        const result = await this.wrappedAgent.parsePRD(task.data.prd || task.data.content);
        
        await this.publishProgress(50, 'PRD parsed successfully');
        
        // Generate tasks for other agents if requested
        if (task.data.generateTasks) {
          await this.publishProgress(75, 'Generating tasks for agents');
          
          // Create backend task
          if (result.requirements?.backend) {
            const backendTask = {
              id: `backend-task-${Date.now()}`,
              type: 'generate-backend',
              data: {
                requirements: result.requirements.backend,
                database: result.requirements.database
              }
            };
            
            await this.nc.publish('agent.backend-agent.task.assign', 
              JSON.stringify(backendTask));
            console.log(`[${this.config.id}] Published backend task`);
          }
        }
        
        await this.publishProgress(100, 'Task complete');
        
        this.status = 'idle';
        this.currentTask = null;
        
        return result;
      } catch (error) {
        this.status = 'idle';
        this.currentTask = null;
        throw error;
      }
    };
    
    await prdParserWrapper.connect();
    agents.push(prdParserWrapper);
    console.log('✅ PRD Parser deployed\n');
    
    // Deploy Backend Agent
    console.log('🔧 Deploying Backend Agent...');
    const backendWrapper = new NATSAgentWrapper(
      {
        id: `backend-agent-${Date.now()}`,
        type: 'backend-agent',
        natsUrl: 'nats://localhost:4222',
        capabilities: ['generate-backend', 'create-api']
      },
      mockBackendAgent
    );
    
    // Override executeTask for backend generation
    backendWrapper.executeTask = async function(task) {
      console.log(`[${this.config.id}] Executing task ${task.id}`);
      
      if (this.status === 'busy') {
        throw new Error('Agent is busy');
      }
      
      this.status = 'busy';
      this.currentTask = task;
      
      try {
        await this.publishProgress(10, 'Starting backend generation');
        
        const result = await this.wrappedAgent.generateBackend(task.data.requirements);
        
        await this.publishProgress(100, 'Backend generated');
        
        this.status = 'idle';
        this.currentTask = null;
        
        return result;
      } catch (error) {
        this.status = 'idle';
        this.currentTask = null;
        throw error;
      }
    };
    
    await backendWrapper.connect();
    agents.push(backendWrapper);
    console.log('✅ Backend Agent deployed\n');
    
    console.log('🎯 Agents deployed and listening for tasks');
    console.log('📡 Monitoring NATS activity...\n');
    
    // Keep process running
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down agents...');
      for (const agent of agents) {
        await agent.disconnect();
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Deploy agents
deployAgents().catch(console.error);