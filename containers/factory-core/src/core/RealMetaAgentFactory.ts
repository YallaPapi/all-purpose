import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { AgentLoader } from './AgentLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MetaAgent {
  id: string;
  type: string;
  status: 'idle' | 'busy' | 'error';
  createdAt: Date;
  lastUsed: Date;
  config: any;
  instance?: any; // The actual agent instance
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

export class RealMetaAgentFactory extends EventEmitter {
  private agents: Map<string, MetaAgent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private logger: Logger;
  private eventBus: EventBus;
  private agentInstances: Map<string, any> = new Map();
  private agentLoader: AgentLoader;
  
  // Paths to actual agent implementations (will be resolved by AgentLoader)
  private agentPaths: Record<string, string> = {
    'prd-parser': '/app/src/meta-agents/prd-parser/parser.js',
    'scaffold-generator': '/app/src/meta-agents/scaffold-generator/main.js',
    'all-purpose-pattern': '/app/src/meta-agents/all-purpose-pattern/src/main.ts',
    'template-engine-factory': '/app/src/meta-agents/template-engine-factory/src/main.ts',
    'parameter-flow': '/app/src/meta-agents/parameter-flow/src/main.ts',
    'five-document-framework': '/app/src/meta-agents/five-document-framework/src/main.ts',
    'thirty-minute-rule': '/app/src/meta-agents/thirty-minute-rule/src/main.ts',
    'vercel-native-architecture': '/app/src/meta-agents/vercel-native-architecture/src/main.ts',
    'infra-orchestrator': '/app/src/meta-agents/infra-orchestrator/src/main.ts',
    'backend-agent': '/app/src/meta-agents/backend-agent/src/main.ts',
    'frontend-agent': '/app/src/meta-agents/frontend-agent/src/main.ts',
    'memory-integration': '/app/src/memory/agentMemoryIntegration.js'
  };

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.logger = new Logger('RealMetaAgentFactory');
    this.agentLoader = new AgentLoader();
    this.logger.info('RealMetaAgentFactory initialized with environment-aware agent loading');
  }

  getAvailableAgentTypes(): string[] {
    return Object.keys(this.agentPaths);
  }

  async createMetaAgent(type: string, config: any): Promise<MetaAgent> {
    if (!this.agentPaths[type]) {
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

    // Load the actual agent implementation
    try {
      const agentPath = this.agentPaths[type];
      
      // Use AgentLoader to handle different import scenarios
      const AgentModule = await this.agentLoader.loadAgent(type, agentPath);
      const agentInstance = this.agentLoader.instantiateAgent(type, AgentModule, config);
      
      agent.instance = agentInstance;
      agent.status = 'idle';
      this.agentInstances.set(agentId, agentInstance);
      
      this.logger.info(`Successfully loaded agent ${type}`);
      
    } catch (error) {
      this.logger.error(`Failed to load agent ${type}:`, error);
      agent.status = 'error';
    }

    this.agents.set(agentId, agent);
    this.logger.info(`Created REAL meta-agent: ${agentId} of type: ${type}`);
    
    // Publish agent creation event
    if (this.eventBus.isConnected()) {
      await this.eventBus.publish('event.agent.created', {
        agentId,
        type,
        status: 'created',
        config,
        hasRealImplementation: !!agent.instance
      });
    }
    
    this.emit('agentCreated', agent);
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

    if (!agent.instance) {
      throw new Error(`Agent ${agentId} has no implementation loaded`);
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

    this.logger.info(`Executing REAL task ${taskId} on agent ${agentId}`);

    try {
      agentTask.status = 'running';
      
      // Execute the actual agent logic
      const result = await this.executeRealAgentLogic(agent, task);
      
      agentTask.status = 'completed';
      agentTask.result = result;
      agentTask.completedAt = new Date();
      agent.status = 'idle';

      this.logger.info(`Task ${taskId} completed successfully with REAL results`);
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

  private async executeRealAgentLogic(agent: MetaAgent, task: any): Promise<any> {
    const instance = agent.instance;
    
    switch (agent.type) {
      case 'prd-parser':
        // PRD Parser expects content or file path
        if (task.content) {
          return await instance.parse(task.content, task.options || {});
        } else if (task.filePath) {
          const fs = await import('fs/promises');
          const content = await fs.readFile(task.filePath, 'utf-8');
          return await instance.parse(content, { ...task.options, filepath: task.filePath });
        }
        throw new Error('PRD Parser requires either filePath or content');
        
      case 'scaffold-generator':
        // Scaffold generator expects project config
        return await instance.generateScaffold(task);
        
      case 'all-purpose-pattern':
        // Pattern detector expects code to analyze
        return await instance.detectPatterns(task.code || task.filePath);
        
      case 'backend-agent':
        // Backend agent can generate various backend components
        if (task.action === 'generateAPI') {
          return await instance.generateAPI(task.spec);
        } else if (task.action === 'generateDatabase') {
          return await instance.generateDatabaseSchema(task.schema);
        }
        return await instance.execute(task);
        
      default:
        // Generic execution for other agents
        if (instance.execute) {
          return await instance.execute(task);
        } else if (instance.run) {
          return await instance.run(task);
        } else if (instance.process) {
          return await instance.process(task);
        }
        
        throw new Error(`No execution method found for agent type: ${agent.type}`);
    }
  }

  async getTaskStatus(taskId: string): Promise<AgentTask | undefined> {
    return this.tasks.get(taskId);
  }

  async getAgentStatus(agentId: string): Promise<MetaAgent | undefined> {
    return this.agents.get(agentId);
  }
}