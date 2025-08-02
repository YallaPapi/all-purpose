/**
 * NATS Agent Wrapper
 * 
 * Wraps meta-agents with NATS communication capabilities
 * Handles task assignment, execution, and result publishing
 */

import { EventEmitter } from 'events';
import { NATSEventBus, createNATSEventBus } from '../../containers/factory-core/src/services/NATSEventBus.js';
import { v4 as uuidv4 } from 'uuid';

export interface AgentConfig {
  id: string;
  type: string;
  capability: string;
  nats: {
    servers: string[];
    user?: string;
    pass?: string;
  };
  heartbeatInterval?: number;
}

export interface TaskExecution {
  taskId: string;
  workflowId: string;
  task: any;
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

export abstract class NATSAgentWrapper extends EventEmitter {
  protected config: AgentConfig;
  protected eventBus: NATSEventBus;
  protected currentTask?: TaskExecution;
  protected heartbeatInterval?: NodeJS.Timeout;
  protected status: 'idle' | 'busy' | 'error' = 'idle';
  private taskSubscription?: any;

  constructor(config: AgentConfig) {
    super();
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      ...config
    };

    this.eventBus = createNATSEventBus({
      servers: config.nats.servers,
      user: config.nats.user,
      pass: config.nats.pass,
      namespace: 'agent'
    });
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    // Connect to NATS
    await this.eventBus.connect();

    // Register agent
    await this.registerAgent();

    // Setup task subscription
    await this.setupTaskSubscription();

    // Start heartbeat
    this.startHeartbeat();

    // Initialize agent-specific resources
    await this.onInitialize();

    this.emit('initialized');
  }

  /**
   * Shutdown the agent
   */
  async shutdown(): Promise<void> {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Unsubscribe from tasks
    if (this.taskSubscription) {
      await this.taskSubscription.unsubscribe();
    }

    // Shutdown agent-specific resources
    await this.onShutdown();

    // Disconnect from NATS
    await this.eventBus.disconnect();

    this.emit('shutdown');
  }

  /**
   * Abstract method for agent implementation
   */
  protected abstract async executeTask(task: any): Promise<any>;

  /**
   * Optional lifecycle hooks
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclass if needed
  }

  protected async onShutdown(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Private methods
   */
  private async registerAgent(): Promise<void> {
    await this.eventBus.publish('coordinator.agent.register', {
      agent: {
        id: this.config.id,
        type: this.config.type,
        capability: this.config.capability,
        status: this.status,
        instance: process.env.HOSTNAME || 'localhost',
        metadata: {
          pid: process.pid,
          platform: process.platform,
          nodeVersion: process.version
        }
      },
      timestamp: new Date()
    });
  }

  private async setupTaskSubscription(): Promise<void> {
    const subject = `agent.${this.config.id}.task.assign`;
    
    this.taskSubscription = await this.eventBus.subscribe(subject, async (data: any) => {
      if (this.status === 'busy') {
        // Reject task if busy
        await this.eventBus.publish('task.rejected', {
          taskId: data.taskId,
          agentId: this.config.id,
          reason: 'Agent busy',
          timestamp: new Date()
        });
        return;
      }

      // Accept task
      this.currentTask = {
        taskId: data.taskId,
        workflowId: data.workflowId,
        task: data.task,
        startTime: new Date()
      };

      this.status = 'busy';

      // Notify task acceptance
      await this.eventBus.publish('task.accepted', {
        taskId: data.taskId,
        agentId: this.config.id,
        timestamp: new Date()
      });

      // Execute task
      try {
        const result = await this.executeTask(data.task);
        
        this.currentTask.result = result;
        this.currentTask.endTime = new Date();

        // Publish completion
        await this.eventBus.publish('task.completed', {
          taskId: data.taskId,
          agentId: this.config.id,
          result,
          duration: this.currentTask.endTime.getTime() - this.currentTask.startTime.getTime(),
          timestamp: new Date()
        });

        this.emit('task:completed', this.currentTask);

      } catch (error) {
        this.currentTask.error = error.message;
        this.currentTask.endTime = new Date();

        // Publish failure
        await this.eventBus.publish('task.failed', {
          taskId: data.taskId,
          agentId: this.config.id,
          error: error.message,
          duration: this.currentTask.endTime.getTime() - this.currentTask.startTime.getTime(),
          timestamp: new Date()
        });

        this.emit('task:failed', this.currentTask);
        this.status = 'error';
      }

      // Reset status
      this.status = 'idle';
      this.currentTask = undefined;
    });
  }

  private startHeartbeat(): void {
    // Send initial heartbeat
    this.sendHeartbeat();

    // Setup interval
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      await this.eventBus.publish('agent.heartbeat', {
        agentId: this.config.id,
        status: this.status,
        currentTask: this.currentTask?.taskId,
        metrics: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          cpuUsage: process.cpuUsage()
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error(`Failed to send heartbeat:`, error);
    }
  }

  /**
   * Helper methods for agents
   */
  protected async publishProgress(progress: number, message?: string): Promise<void> {
    if (!this.currentTask) return;

    await this.eventBus.publish('task.progress', {
      taskId: this.currentTask.taskId,
      agentId: this.config.id,
      progress,
      message,
      timestamp: new Date()
    });
  }

  protected async publishLog(level: 'info' | 'warn' | 'error', message: string, data?: any): Promise<void> {
    await this.eventBus.publish('agent.log', {
      agentId: this.config.id,
      taskId: this.currentTask?.taskId,
      level,
      message,
      data,
      timestamp: new Date()
    });
  }

  protected async requestResource(resourceType: string, requirements: any): Promise<any> {
    const requestId = uuidv4();
    
    // Use request-reply pattern
    const response = await this.eventBus.request('resource.request', {
      requestId,
      agentId: this.config.id,
      resourceType,
      requirements,
      timestamp: new Date()
    }, 30000); // 30 second timeout

    return response;
  }
}

/**
 * Example implementation for a concrete agent
 */
export class ExampleAgent extends NATSAgentWrapper {
  constructor(config: Omit<AgentConfig, 'type' | 'capability'>) {
    super({
      ...config,
      type: 'example',
      capability: 'example-processing'
    });
  }

  protected async executeTask(task: any): Promise<any> {
    // Log task start
    await this.publishLog('info', 'Starting example task', { task });

    // Simulate work with progress updates
    for (let i = 0; i <= 100; i += 20) {
      await this.publishProgress(i, `Processing step ${i / 20 + 1}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    }

    // Return result
    return {
      success: true,
      processedAt: new Date(),
      data: {
        input: task,
        output: 'Example processing complete'
      }
    };
  }

  protected async onInitialize(): Promise<void> {
    console.log('Example agent initialized');
  }

  protected async onShutdown(): Promise<void> {
    console.log('Example agent shutting down');
  }
}