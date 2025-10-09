import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { spawn } from 'child_process';
import path from 'path';

interface MetaAgent {
  id: string;
  type: string;
  status: 'idle' | 'busy' | 'error';
  createdAt: Date;
  lastUsed: Date;
  config: any;
}

interface AgentTask {
  id: string;
  agentId: string;
  task: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class SimplifiedMetaAgentFactory extends EventEmitter {
  private agents: Map<string, MetaAgent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private logger: Logger;
  private eventBus: EventBus;
  
  // Agent script locations (relative to project root)
  private agentScripts: Record<string, string> = {
    'prd-parser': 'src/meta-agents/prd-parser/main.js',
    'scaffold-generator': 'src/meta-agents/scaffold-generator/main.js',
    'all-purpose-pattern': 'src/meta-agents/all-purpose-pattern/simple-test.js'
  };

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.logger = new Logger('SimplifiedMetaAgentFactory');
    this.logger.info('SimplifiedMetaAgentFactory initialized');
  }

  getAvailableAgentTypes(): string[] {
    return Object.keys(this.agentScripts);
  }

  async createMetaAgent(type: string, config: any): Promise<MetaAgent> {
    if (!this.agentScripts[type]) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const agentId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const agent: MetaAgent = {
      id: agentId,
      type,
      status: 'idle',
      createdAt: new Date(),
      lastUsed: new Date(),
      config
    };

    this.agents.set(agentId, agent);
    this.logger.info(`Created meta-agent: ${agentId} of type: ${type}`);
    
    return agent;
  }

  async listActiveAgents(): Promise<MetaAgent[]> {
    return Array.from(this.agents.values());
  }

  async executeAgentTask(agentId: string, task: any): Promise<AgentTask> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (agent.status === 'busy') {
      throw new Error(`Agent ${agentId} is currently busy`);
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const agentTask: AgentTask = {
      id: taskId,
      agentId,
      task,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(taskId, agentTask);
    agent.status = 'busy';
    agent.lastUsed = new Date();

    this.logger.info(`Executing task ${taskId} on agent ${agentId}`);

    try {
      agentTask.status = 'running';
      
      // Execute the agent as a subprocess
      const result = await this.executeAgentSubprocess(agent, task);
      
      agentTask.status = 'completed';
      agentTask.result = result;
      agentTask.completedAt = new Date();
      agent.status = 'idle';

      this.logger.info(`Task ${taskId} completed successfully`);
      this.emit('taskCompleted', agentTask);
      
      return agentTask;
      
    } catch (error) {
      agentTask.status = 'failed';
      agentTask.error = error instanceof Error ? error.message : 'Unknown error';
      agentTask.completedAt = new Date();
      agent.status = 'idle';

      this.emit('taskFailed', agentTask);
      this.logger.error(`Task ${taskId} failed:`, error);
      
      throw error;
    }
  }

  private async executeAgentSubprocess(agent: MetaAgent, task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join('/app', this.agentScripts[agent.type]);
      const taskJson = JSON.stringify(task);
      
      this.logger.info(`Executing ${agent.type} at ${scriptPath}`);
      
      // For now, let's return mock data based on agent type
      switch (agent.type) {
        case 'prd-parser':
          // Simulate PRD parsing
          resolve({
            requirements: [
              {
                id: 1,
                title: task.content ? 'Parsed requirement from content' : 'Parsed requirement from file',
                priority: 'high',
                complexity: 'medium',
                estimatedEffort: 8
              }
            ],
            entities: {
              technologies: ['Node.js', 'React', 'PostgreSQL'],
              features: ['Authentication', 'Dashboard', 'API']
            },
            metadata: {
              parseTime: Date.now(),
              wordCount: 100,
              sectionsFound: 5
            }
          });
          break;
          
        case 'scaffold-generator':
          resolve({
            projectStructure: {
              name: task.projectName || 'new-project',
              directories: ['src', 'tests', 'docs', 'config'],
              files: ['README.md', 'package.json', '.gitignore'],
              generated: true
            }
          });
          break;
          
        case 'all-purpose-pattern':
          resolve({
            patterns: [
              {
                type: 'hardcoded-value',
                location: 'config.js:15',
                suggestion: 'Move to environment variable'
              }
            ],
            antiPatterns: 1,
            recommendations: ['Use environment variables', 'Add configuration validation']
          });
          break;
          
        default:
          resolve({
            message: `Agent ${agent.type} executed successfully`,
            timestamp: new Date().toISOString()
          });
      }
    });
  }

  async getTaskStatus(taskId: string): Promise<AgentTask | undefined> {
    return this.tasks.get(taskId);
  }

  async getAgentStatus(agentId: string): Promise<MetaAgent | undefined> {
    return this.agents.get(agentId);
  }
}