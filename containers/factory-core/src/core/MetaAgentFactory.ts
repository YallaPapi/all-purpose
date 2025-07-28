import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../../../../shared/messaging/EventBus.js';

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

export class MetaAgentFactory extends EventEmitter {
  private agents: Map<string, MetaAgent> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private logger = new Logger('MetaAgentFactory');
  private eventBus: EventBus;

  private availableAgentTypes = [
    'all-purpose-pattern',
    'prd-parser',
    'scaffold-generator',
    'template-engine-factory',
    'parameter-flow',
    'five-document-framework',
    'thirty-minute-rule',
    'vercel-native-architecture',
    'infra-orchestrator',
    'backend-agent',
    'frontend-agent'
  ];

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.logger.info('MetaAgentFactory initialized');
  }

  getAvailableAgentTypes(): string[] {
    return this.availableAgentTypes;
  }

  async createMetaAgent(type: string, config: any = {}): Promise<MetaAgent> {
    if (!this.availableAgentTypes.includes(type)) {
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
    
    // Publish agent creation event
    if (this.eventBus.isConnected_()) {
      await this.eventBus.publish('meta.agent.created', {
        agentId,
        type,
        status: 'created',
        config
      }, { source: 'factory-core' });
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

    // Publish task assignment event
    if (this.eventBus.isConnected_()) {
      await this.eventBus.publish('factory.task.assigned', {
        taskId,
        agentId,
        task
      }, { source: 'factory-core' });
    }

    try {
      agentTask.status = 'running';
      
      // Publish task start event
      if (this.eventBus.isConnected_()) {
        await this.eventBus.publish('meta.agent.started', {
          agentId,
          taskId,
          status: 'running'
        }, { source: 'factory-core' });
      }

      const result = await this.executeAgentLogic(agent, task);
      
      agentTask.status = 'completed';
      agentTask.result = result;
      agentTask.completedAt = new Date();
      agent.status = 'idle';

      // Publish task completion event
      if (this.eventBus.isConnected_()) {
        await this.eventBus.publish('meta.agent.completed', {
          agentId,
          taskId,
          result,
          status: 'completed'
        }, { source: 'factory-core' });
      }

      this.emit('taskCompleted', agentTask);
      this.logger.info(`Task ${taskId} completed successfully`);
      
      return agentTask;
    } catch (error) {
      agentTask.status = 'failed';
      agentTask.error = error.message;
      agentTask.completedAt = new Date();
      agent.status = 'error';

      // Publish task failure event
      if (this.eventBus.isConnected_()) {
        await this.eventBus.publish('meta.agent.failed', {
          agentId,
          taskId,
          error: error.message,
          status: 'failed'
        }, { source: 'factory-core' });
      }

      this.emit('taskFailed', agentTask);
      this.logger.error(`Task ${taskId} failed:`, error);
      
      throw error;
    }
  }

  private async executeAgentLogic(agent: MetaAgent, task: any): Promise<any> {
    switch (agent.type) {
      case 'all-purpose-pattern':
        return this.executeAllPurposePattern(task);
      case 'prd-parser':
        return this.executePRDParser(task);
      case 'scaffold-generator':
        return this.executeScaffoldGenerator(task);
      case 'template-engine-factory':
        return this.executeTemplateEngineFactory(task);
      case 'parameter-flow':
        return this.executeParameterFlow(task);
      case 'five-document-framework':
        return this.executeFiveDocumentFramework(task);
      case 'thirty-minute-rule':
        return this.executeThirtyMinuteRule(task);
      case 'vercel-native-architecture':
        return this.executeVercelNativeArchitecture(task);
      case 'infra-orchestrator':
        return this.executeInfraOrchestrator(task);
      case 'backend-agent':
        return this.executeBackendAgent(task);
      case 'frontend-agent':
        return this.executeFrontendAgent(task);
      default:
        throw new Error(`No execution logic for agent type: ${agent.type}`);
    }
  }

  private async executeAllPurposePattern(task: any): Promise<any> {
    this.logger.info('Executing All-Purpose Pattern detection');
    return {
      type: 'pattern-detection',
      patterns: [],
      recommendations: [],
      timestamp: new Date().toISOString()
    };
  }

  private async executePRDParser(task: any): Promise<any> {
    this.logger.info('Executing PRD Parser');
    return {
      type: 'prd-analysis',
      requirements: [],
      structure: {},
      timestamp: new Date().toISOString()
    };
  }

  private async executeScaffoldGenerator(task: any): Promise<any> {
    this.logger.info('Executing Scaffold Generator');
    return {
      type: 'scaffold-generation',
      files: [],
      structure: {},
      timestamp: new Date().toISOString()
    };
  }

  private async executeTemplateEngineFactory(task: any): Promise<any> {
    this.logger.info('Executing Template Engine Factory');
    return {
      type: 'template-generation',
      templates: [],
      engine: 'handlebars',
      timestamp: new Date().toISOString()
    };
  }

  private async executeParameterFlow(task: any): Promise<any> {
    this.logger.info('Executing Parameter Flow');
    return {
      type: 'parameter-mapping',
      flows: [],
      mappings: {},
      timestamp: new Date().toISOString()
    };
  }

  private async executeFiveDocumentFramework(task: any): Promise<any> {
    this.logger.info('Executing Five Document Framework');
    return {
      type: 'documentation-framework',
      documents: [],
      structure: {},
      timestamp: new Date().toISOString()
    };
  }

  private async executeThirtyMinuteRule(task: any): Promise<any> {
    this.logger.info('Executing Thirty Minute Rule');
    return {
      type: 'debugging-session',
      components: [],
      isolations: [],
      timestamp: new Date().toISOString()
    };
  }

  private async executeVercelNativeArchitecture(task: any): Promise<any> {
    this.logger.info('Executing Vercel Native Architecture');
    return {
      type: 'vercel-optimization',
      architecture: {},
      optimizations: [],
      timestamp: new Date().toISOString()
    };
  }

  private async executeInfraOrchestrator(task: any): Promise<any> {
    this.logger.info('Executing Infra Orchestrator');
    return {
      type: 'infrastructure-coordination',
      deployments: [],
      orchestration: {},
      timestamp: new Date().toISOString()
    };
  }

  private async executeBackendAgent(task: any): Promise<any> {
    this.logger.info('Executing Backend Agent');
    return {
      type: 'backend-generation',
      apis: [],
      database: {},
      timestamp: new Date().toISOString()
    };
  }

  private async executeFrontendAgent(task: any): Promise<any> {
    this.logger.info('Executing Frontend Agent');
    return {
      type: 'frontend-generation',
      components: [],
      routes: [],
      timestamp: new Date().toISOString()
    };
  }

  getAgentById(agentId: string): MetaAgent | undefined {
    return this.agents.get(agentId);
  }

  getTaskById(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  async deleteAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    if (agent.status === 'busy') {
      throw new Error(`Cannot delete busy agent: ${agentId}`);
    }

    this.agents.delete(agentId);
    this.emit('agentDeleted', agent);
    this.logger.info(`Deleted agent: ${agentId}`);
    
    return true;
  }
}