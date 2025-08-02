/**
 * Agent Coordinator Service
 * 
 * Manages agent communication and coordination using NATS messaging
 * Provides high-level orchestration for meta-agent workflows
 */

import { EventEmitter } from 'events';
import { NATSEventBus, createNATSEventBus } from '../../containers/factory-core/src/services/NATSEventBus.js';
import { v4 as uuidv4 } from 'uuid';

export interface AgentInfo {
  id: string;
  type: string;
  capability: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  lastSeen: Date;
  instance?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTask {
  id: string;
  workflowId: string;
  agentType: string;
  task: any;
  dependencies?: string[];
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed';
  assignedAgent?: string;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  tasks: WorkflowTask[];
  status: 'created' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface CoordinatorConfig {
  nats: {
    servers: string[];
    user?: string;
    pass?: string;
  };
  heartbeatInterval?: number;
  taskTimeout?: number;
}

export class AgentCoordinator extends EventEmitter {
  private eventBus: NATSEventBus;
  private agents = new Map<string, AgentInfo>();
  private workflows = new Map<string, Workflow>();
  private config: CoordinatorConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private taskTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(config: CoordinatorConfig) {
    super();
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      taskTimeout: 300000, // 5 minutes
      ...config
    };

    this.eventBus = createNATSEventBus({
      servers: config.nats.servers,
      user: config.nats.user,
      pass: config.nats.pass,
      namespace: 'coordinator'
    });
  }

  /**
   * Initialize the coordinator
   */
  async initialize(): Promise<void> {
    // Connect to NATS
    await this.eventBus.connect();

    // Setup subscriptions
    await this.setupSubscriptions();

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    this.emit('initialized');
  }

  /**
   * Shutdown the coordinator
   */
  async shutdown(): Promise<void> {
    // Stop heartbeat monitoring
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Clear task timeouts
    for (const timeout of this.taskTimeouts.values()) {
      clearTimeout(timeout);
    }

    // Disconnect from NATS
    await this.eventBus.disconnect();

    this.emit('shutdown');
  }

  /**
   * Register an agent
   */
  async registerAgent(agent: Omit<AgentInfo, 'lastSeen'>): Promise<void> {
    const agentInfo: AgentInfo = {
      ...agent,
      lastSeen: new Date()
    };

    this.agents.set(agent.id, agentInfo);

    // Publish agent registration event
    await this.eventBus.publish('agent.registered', {
      agent: agentInfo,
      timestamp: new Date()
    });

    this.emit('agent:registered', agentInfo);
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: AgentInfo['status']): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = status;
    agent.lastSeen = new Date();

    // Publish status update
    await this.eventBus.publish('agent.status.updated', {
      agentId,
      status,
      timestamp: new Date()
    });

    this.emit('agent:status-changed', { agentId, status });
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(name: string, description?: string): Promise<Workflow> {
    const workflow: Workflow = {
      id: uuidv4(),
      name,
      description,
      tasks: [],
      status: 'created',
      createdAt: new Date()
    };

    this.workflows.set(workflow.id, workflow);

    // Publish workflow creation event
    await this.eventBus.publish('workflow.created', {
      workflow,
      timestamp: new Date()
    });

    this.emit('workflow:created', workflow);
    return workflow;
  }

  /**
   * Add task to workflow
   */
  async addTaskToWorkflow(
    workflowId: string,
    agentType: string,
    task: any,
    dependencies?: string[]
  ): Promise<WorkflowTask> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const workflowTask: WorkflowTask = {
      id: uuidv4(),
      workflowId,
      agentType,
      task,
      dependencies,
      status: 'pending',
      createdAt: new Date()
    };

    workflow.tasks.push(workflowTask);

    // Publish task addition event
    await this.eventBus.publish('workflow.task.added', {
      workflowId,
      task: workflowTask,
      timestamp: new Date()
    });

    this.emit('workflow:task-added', { workflowId, task: workflowTask });
    return workflowTask;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'running';

    // Publish workflow start event
    await this.eventBus.publish('workflow.started', {
      workflowId,
      timestamp: new Date()
    });

    this.emit('workflow:started', workflowId);

    // Process tasks
    await this.processTasks(workflow);
  }

  /**
   * Get available agents of a specific type
   */
  getAvailableAgents(agentType: string): AgentInfo[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.type === agentType && agent.status === 'idle'
    );
  }

  /**
   * Get workflow status
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Private methods
   */
  private async setupSubscriptions(): Promise<void> {
    // Agent heartbeat
    await this.eventBus.subscribe('agent.heartbeat', async (data: any) => {
      const agent = this.agents.get(data.agentId);
      if (agent) {
        agent.lastSeen = new Date();
        agent.status = data.status || 'idle';
      }
    });

    // Task completion
    await this.eventBus.subscribe('task.completed', async (data: any) => {
      await this.handleTaskCompletion(data.taskId, data.result);
    });

    // Task failure
    await this.eventBus.subscribe('task.failed', async (data: any) => {
      await this.handleTaskFailure(data.taskId, data.error);
    });

    // Agent offline
    await this.eventBus.subscribe('agent.offline', async (data: any) => {
      const agent = this.agents.get(data.agentId);
      if (agent) {
        agent.status = 'offline';
        this.emit('agent:offline', data.agentId);
      }
    });
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = this.config.heartbeatInterval! * 2; // 2x heartbeat interval

      for (const [agentId, agent] of this.agents) {
        const timeSinceLastSeen = now.getTime() - agent.lastSeen.getTime();
        
        if (timeSinceLastSeen > timeout && agent.status !== 'offline') {
          agent.status = 'offline';
          this.emit('agent:timeout', agentId);
          
          // Publish agent offline event
          this.eventBus.publish('agent.offline', {
            agentId,
            lastSeen: agent.lastSeen,
            timestamp: now
          }).catch(error => {
            console.error(`Failed to publish agent offline event:`, error);
          });
        }
      }
    }, this.config.heartbeatInterval);
  }

  private async processTasks(workflow: Workflow): Promise<void> {
    const pendingTasks = workflow.tasks.filter(t => t.status === 'pending');
    
    for (const task of pendingTasks) {
      // Check dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        const dependenciesMet = task.dependencies.every(depId => {
          const depTask = workflow.tasks.find(t => t.id === depId);
          return depTask && depTask.status === 'completed';
        });

        if (!dependenciesMet) {
          continue; // Skip this task for now
        }
      }

      // Find available agent
      const availableAgents = this.getAvailableAgents(task.agentType);
      if (availableAgents.length === 0) {
        continue; // No agents available
      }

      // Assign task to agent
      const agent = availableAgents[0];
      await this.assignTaskToAgent(task, agent.id);
    }

    // Check if workflow is complete
    const allTasksComplete = workflow.tasks.every(
      t => t.status === 'completed' || t.status === 'failed'
    );

    if (allTasksComplete) {
      workflow.status = workflow.tasks.some(t => t.status === 'failed') ? 'failed' : 'completed';
      workflow.completedAt = new Date();

      // Publish workflow completion
      await this.eventBus.publish('workflow.completed', {
        workflowId: workflow.id,
        status: workflow.status,
        timestamp: workflow.completedAt
      });

      this.emit('workflow:completed', workflow);
    } else {
      // Schedule next check
      setTimeout(() => {
        this.processTasks(workflow).catch(error => {
          console.error(`Error processing tasks for workflow ${workflow.id}:`, error);
        });
      }, 5000); // Check every 5 seconds
    }
  }

  private async assignTaskToAgent(task: WorkflowTask, agentId: string): Promise<void> {
    task.assignedAgent = agentId;
    task.status = 'assigned';
    task.startedAt = new Date();

    // Update agent status
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'busy';
    }

    // Set task timeout
    const timeout = setTimeout(() => {
      this.handleTaskTimeout(task.id);
    }, this.config.taskTimeout!);
    this.taskTimeouts.set(task.id, timeout);

    // Publish task assignment
    await this.eventBus.publish(`agent.${agentId}.task.assign`, {
      taskId: task.id,
      workflowId: task.workflowId,
      task: task.task,
      timestamp: new Date()
    });

    this.emit('task:assigned', { task, agentId });
  }

  private async handleTaskCompletion(taskId: string, result: any): Promise<void> {
    // Find task
    let task: WorkflowTask | undefined;
    let workflow: Workflow | undefined;

    for (const wf of this.workflows.values()) {
      const found = wf.tasks.find(t => t.id === taskId);
      if (found) {
        task = found;
        workflow = wf;
        break;
      }
    }

    if (!task || !workflow) {
      console.error(`Task ${taskId} not found`);
      return;
    }

    // Update task
    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date();

    // Clear timeout
    const timeout = this.taskTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.taskTimeouts.delete(taskId);
    }

    // Update agent status
    if (task.assignedAgent) {
      const agent = this.agents.get(task.assignedAgent);
      if (agent) {
        agent.status = 'idle';
      }
    }

    this.emit('task:completed', { taskId, result });

    // Continue workflow processing
    await this.processTasks(workflow);
  }

  private async handleTaskFailure(taskId: string, error: string): Promise<void> {
    // Find task
    let task: WorkflowTask | undefined;
    let workflow: Workflow | undefined;

    for (const wf of this.workflows.values()) {
      const found = wf.tasks.find(t => t.id === taskId);
      if (found) {
        task = found;
        workflow = wf;
        break;
      }
    }

    if (!task || !workflow) {
      console.error(`Task ${taskId} not found`);
      return;
    }

    // Update task
    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date();

    // Clear timeout
    const timeout = this.taskTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.taskTimeouts.delete(taskId);
    }

    // Update agent status
    if (task.assignedAgent) {
      const agent = this.agents.get(task.assignedAgent);
      if (agent) {
        agent.status = 'error';
      }
    }

    this.emit('task:failed', { taskId, error });

    // Continue workflow processing
    await this.processTasks(workflow);
  }

  private async handleTaskTimeout(taskId: string): Promise<void> {
    await this.handleTaskFailure(taskId, 'Task timeout');
  }
}

// Export factory function
export function createAgentCoordinator(config: CoordinatorConfig): AgentCoordinator {
  return new AgentCoordinator(config);
}