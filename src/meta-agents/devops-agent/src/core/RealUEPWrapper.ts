/**
 * Real UEP (Universal Execution Protocol) Wrapper for DevOps Agent
 * 
 * Production-ready UEP integration with NATS transport for DevOps Agent coordination
 * Adapted from Frontend Agent RealUEPWrapper with DevOps-specific functionality
 */

import { EventEmitter } from 'events';
import { connect, NatsConnection, JetStreamClient, JetStreamManager, ConsumerConfig, StreamConfig } from 'nats';
import { Logger } from 'winston';

import {
  DevOpsTask,
  ProcessingResult,
  DevOpsAgentCapabilities
} from '../types/index.js';

import { createLogger } from '../utils/logger.js';

// Real UEP Message Types
export type UEPMessageType = 'command' | 'response' | 'event' | 'request' | 'heartbeat';
export type UEPMessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type UEPMessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Real UEP Message Interface - Production UEP Protocol
export interface RealUEPMessage {
  id: string;
  type: UEPMessageType;
  timestamp: number;
  from: string;
  to: string | string[];
  priority: UEPMessagePriority;
  status: UEPMessageStatus;
  correlationId?: string;
  parentMessageId?: string;
  payload: any;
  options: {
    timeout?: number;
    retryCount?: number;
    requireAcknowledgment?: boolean;
    persistent?: boolean;
    broadcast?: boolean;
  };
  metadata: {
    retryAttempts: number;
    lastRetry?: number;
    deliveredAt?: number;
    acknowledgedAt?: number;
    processingTime?: number;
    route?: string[];
  };
}

// Real UEP Context Interface
export interface RealUEPContext {
  sessionId: string;
  memory: Record<string, any>;
  codebaseContext: Record<string, any>;
  validationResults: Record<string, any>;
  agentCoordination?: {
    activeAgents: string[];
    taskDistribution: Record<string, any>;
    knowledgeSharing: Record<string, any>;
  };
}

export interface RealUEPWrapperConfig {
  agentId: string;
  agentType: 'domain-specific' | 'infrastructure' | 'coordination';
  capabilities: DevOpsAgentCapabilities;
  natsUrl?: string;
  enableRealTimeUpdates?: boolean;
  enableTaskDistribution?: boolean;
  streamName?: string;
  subjectPrefix?: string;
}

/**
 * Real UEP Wrapper for DevOps Agent coordination using NATS transport
 */
export class RealUEPWrapper extends EventEmitter {
  private config: RealUEPWrapperConfig;
  private logger: Logger;
  private isInitialized = false;
  private sessionId: string;
  private natsConnection?: NatsConnection;
  private jetStream?: JetStreamClient;
  private jetStreamManager?: JetStreamManager;
  private activeMessages = new Map<string, RealUEPMessage>();
  private responseHandlers = new Map<string, (message: RealUEPMessage) => void>();

  constructor(config: RealUEPWrapperConfig) {
    super();

    this.config = {
      natsUrl: 'nats://localhost:4222',
      enableRealTimeUpdates: true,
      enableTaskDistribution: true,
      streamName: 'UEP_MESSAGES',
      subjectPrefix: 'uep.devops',
      ...config
    };

    this.logger = createLogger(`real-uep-wrapper-${config.agentId}`, 'info');
    this.sessionId = this.generateSessionId();

    this.logger.info('Real UEP Wrapper initialized for DevOps Agent', {
      agentId: this.config.agentId,
      sessionId: this.sessionId,
      natsUrl: this.config.natsUrl,
      capabilities: this.config.capabilities
    });
  }

  /**
   * Initialize Real UEP wrapper with NATS connection and JetStream
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing Real UEP Wrapper for DevOps Agent...');

      // Connect to NATS server
      this.natsConnection = await connect({
        servers: this.config.natsUrl,
        name: `devops-agent-${this.config.agentId}`,
        timeout: 5000,
        maxReconnectAttempts: -1, // Infinite reconnects
        reconnectTimeWait: 2000,
      });

      this.logger.info('✅ Connected to NATS server', { url: this.config.natsUrl });

      // Setup JetStream
      this.jetStream = this.natsConnection.jetstream();
      this.jetStreamManager = await this.natsConnection.jetstreamManager();

      // Ensure stream exists
      await this.setupStream();

      // Setup message subscriptions
      await this.setupSubscriptions();

      // Register DevOps agent with coordination system
      await this.registerAgent();

      // Setup message handlers
      this.setupMessageHandlers();

      // Start heartbeat for real-time coordination
      if (this.config.enableRealTimeUpdates) {
        this.startHeartbeat();
      }

      this.isInitialized = true;
      this.logger.info('✅ Real UEP Wrapper for DevOps Agent initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize Real UEP Wrapper for DevOps Agent', { error });
      throw error;
    }
  }

  /**
   * Send task result to coordination system via NATS
   */
  async sendTaskResult(task: DevOpsTask, result: ProcessingResult): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'coordination-system',
      priority: 'normal',
      status: 'completed',
      payload: {
        taskId: task.id,
        taskType: task.type,
        result,
        completedAt: new Date().toISOString(),
        processingTime: result.processingTime || 0,
        success: result.success,
        devopsMetrics: {
          containerConfigs: result.data?.containerConfigs || 0,
          deploymentConfigs: result.data?.deploymentConfigs || 0,
          cicdPipelines: result.data?.cicdPipelines || 0,
          monitoringSetups: result.data?.monitoringSetups || 0
        }
      },
      options: {
        requireAcknowledgment: true,
        persistent: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(message, `${this.config.subjectPrefix}.task.result`);
  }

  /**
   * Send task status update
   */
  async sendTaskUpdate(task: DevOpsTask): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'event',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'coordination-system',
      priority: 'normal',
      status: 'processing',
      payload: {
        type: 'task-update',
        taskId: task.id,
        status: task.status,
        progress: this.calculateTaskProgress(task),
        updatedAt: new Date().toISOString(),
        devopsContext: {
          platform: task.requirements?.platform || 'vercel',
          containerRuntime: task.requirements?.containerRuntime || 'docker',
          deploymentStrategy: task.requirements?.deploymentStrategy || 'rolling'
        }
      },
      options: {
        persistent: false,
        broadcast: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(message, `${this.config.subjectPrefix}.task.update`);
  }

  /**
   * Request task from coordination system
   */
  async requestTask(taskType?: string, priority?: string): Promise<DevOpsTask | null> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'coordination-system',
      priority: (priority as UEPMessagePriority) || 'normal',
      status: 'pending',
      payload: {
        type: 'task-request',
        taskType,
        priority,
        capabilities: this.config.capabilities,
        currentLoad: this.getCurrentLoad(),
        preferredTasks: ['setup-docker', 'configure-deployment', 'setup-cicd', 'setup-monitoring']
      },
      options: {
        timeout: 10000,
        requireAcknowledgment: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    const response = await this.sendMessageAndWaitForResponse(message, `${this.config.subjectPrefix}.task.request`);
    return response?.payload?.task || null;
  }

  /**
   * Send coordination message to other agents
   */
  async coordinateWithAgents(agentTypes: string[], message: any): Promise<any[]> {
    const coordinationMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: agentTypes,
      priority: 'normal',
      status: 'pending',
      payload: {
        type: 'agent-coordination',
        targetAgents: agentTypes,
        message,
        coordinationId: this.generateMessageId(),
        devopsCoordination: {
          requiresInfrastructure: message.requiresInfrastructure || false,
          deploymentDependencies: message.deploymentDependencies || [],
          environmentRequirements: message.environmentRequirements || {}
        }
      },
      options: {
        timeout: 15000,
        requireAcknowledgment: true,
        broadcast: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    const response = await this.sendMessageAndWaitForResponse(coordinationMessage, `${this.config.subjectPrefix}.coordination`);
    return response?.payload?.responses || [];
  }

  /**
   * Update capabilities with coordination system
   */
  async updateCapabilities(capabilities: Partial<DevOpsAgentCapabilities>): Promise<void> {
    this.config.capabilities = { ...this.config.capabilities, ...capabilities };

    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'event',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'coordination-system',
      priority: 'normal',
      status: 'completed',
      payload: {
        type: 'capabilities-update',
        capabilities: this.config.capabilities,
        updatedAt: new Date().toISOString(),
        devopsCapabilities: {
          supportedPlatforms: Object.keys(this.config.capabilities.deployment || {}),
          containerRuntimes: Object.keys(this.config.capabilities.containerization || {}),
          cicdPlatforms: Object.keys(this.config.capabilities.cicd || {}),
          monitoringStacks: Object.keys(this.config.capabilities.monitoring || {})
        }
      },
      options: {
        persistent: true,
        broadcast: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(message, `${this.config.subjectPrefix}.capabilities.update`);
  }

  /**
   * Get current coordination context from UEP system
   */
  async getCoordinationContext(): Promise<RealUEPContext> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'request',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'coordination-system',
      priority: 'normal',
      status: 'pending',
      payload: {
        type: 'context-request',
        sessionId: this.sessionId,
        contextType: 'devops-coordination'
      },
      options: {
        timeout: 10000,
        requireAcknowledgment: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    const response = await this.sendMessageAndWaitForResponse(message, `${this.config.subjectPrefix}.context.request`);
    
    return {
      sessionId: this.sessionId,
      memory: response?.payload?.memory || {},
      codebaseContext: response?.payload?.codebaseContext || {},
      validationResults: response?.payload?.validationResults || {},
      agentCoordination: {
        activeAgents: response?.payload?.activeAgents || [],
        taskDistribution: response?.payload?.taskDistribution || {},
        knowledgeSharing: response?.payload?.knowledgeSharing || {}
      }
    };
  }

  /**
   * Shutdown Real UEP wrapper and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Real UEP Wrapper for DevOps Agent...');

    try {
      // Unregister from coordination system
      await this.unregisterAgent();

      // Clear active messages and handlers
      this.activeMessages.clear();
      this.responseHandlers.clear();

      // Stop heartbeat
      this.stopHeartbeat();

      // Close NATS connection
      if (this.natsConnection) {
        await this.natsConnection.close();
        this.natsConnection = undefined;
      }

      this.isInitialized = false;
      this.logger.info('✅ Real UEP Wrapper for DevOps Agent shut down successfully');

    } catch (error) {
      this.logger.error('❌ Error shutting down Real UEP Wrapper for DevOps Agent', { error });
      throw error;
    }
  }

  /**
   * Private methods for NATS and UEP protocol handling
   */
  private async setupStream(): Promise<void> {
    try {
      const streamConfig: Partial<StreamConfig> = {
        name: this.config.streamName!,
        subjects: [`${this.config.subjectPrefix}.*`],
        retention: 'limits',
        max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
        max_msgs: 10000,
        storage: 'memory'
      };

      await this.jetStreamManager!.streams.add(streamConfig);
      this.logger.info('✅ JetStream stream configured', { stream: this.config.streamName });
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        this.logger.info('Stream already exists, continuing...', { stream: this.config.streamName });
      } else {
        throw error;
      }
    }
  }

  private async setupSubscriptions(): Promise<void> {
    if (!this.jetStream) return;

    // Subscribe to task assignments
    const taskConsumer = await this.jetStream.consumers.get(this.config.streamName!, 'devops-task-consumer');
    const taskMessages = await taskConsumer.consume({ max_messages: 100 });

    for await (const msg of taskMessages) {
      try {
        const uepMessage: RealUEPMessage = JSON.parse(msg.data.toString());
        
        if (uepMessage.to === this.config.agentId || 
            (Array.isArray(uepMessage.to) && uepMessage.to.includes(this.config.agentId))) {
          await this.handleIncomingMessage(uepMessage);
        }
        
        msg.ack();
      } catch (error) {
        this.logger.error('❌ Error processing message', { error });
        msg.nak();
      }
    }
  }

  private async registerAgent(): Promise<void> {
    const registrationMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'event',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'coordination-system',
      priority: 'high',
      status: 'completed',
      payload: {
        type: 'agent-registration',
        agentType: this.config.agentType,
        capabilities: this.config.capabilities,
        status: 'online',
        registeredAt: new Date().toISOString(),
        devopsInfo: {
          supportedPlatforms: ['vercel', 'netlify', 'aws', 'gcp', 'azure'],
          containerRuntimes: ['docker', 'podman'],
          specializations: ['containerization', 'deployment', 'cicd', 'monitoring']
        }
      },
      options: {
        persistent: true,
        requireAcknowledgment: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(registrationMessage, `${this.config.subjectPrefix}.agent.register`);
    this.logger.info('✅ DevOps Agent registered with Real UEP coordination system');
  }

  private async unregisterAgent(): Promise<void> {
    const unregistrationMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'event',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'coordination-system',
      priority: 'high',
      status: 'completed',
      payload: {
        type: 'agent-unregistration',
        reason: 'shutdown',
        unregisteredAt: new Date().toISOString()
      },
      options: {
        persistent: true,
        requireAcknowledgment: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(unregistrationMessage, `${this.config.subjectPrefix}.agent.unregister`);
    this.logger.info('✅ DevOps Agent unregistered from Real UEP coordination system');
  }

  private setupMessageHandlers(): void {
    // Handle incoming coordination messages
    this.on('message-received', (message: RealUEPMessage) => {
      this.handleIncomingMessage(message);
    });

    // Handle task distribution
    if (this.config.enableTaskDistribution) {
      this.on('task-assigned', (task: DevOpsTask) => {
        this.emit('new-task', task);
      });
    }
  }

  private async handleIncomingMessage(message: RealUEPMessage): Promise<void> {
    this.logger.debug('📨 Received Real UEP message', { message });

    // Handle response messages
    if (message.type === 'response' && this.responseHandlers.has(message.correlationId || message.id)) {
      const handler = this.responseHandlers.get(message.correlationId || message.id);
      if (handler) {
        handler(message);
        this.responseHandlers.delete(message.correlationId || message.id);
        return;
      }
    }

    switch (message.payload?.type) {
      case 'task-assignment':
        this.emit('task-assigned', message.payload.task);
        break;
        
      case 'coordination-request':
        await this.handleCoordinationRequest(message);
        break;
        
      case 'capabilities-query':
        await this.handleCapabilitiesQuery(message);
        break;
        
      case 'status-request':
        await this.handleStatusRequest(message);
        break;
        
      default:
        this.logger.debug('Unknown Real UEP message type', { type: message.payload?.type });
    }
  }

  private async handleCoordinationRequest(message: RealUEPMessage): Promise<void> {
    const response: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: message.from,
      priority: 'normal',
      status: 'completed',
      correlationId: message.id,
      payload: {
        type: 'coordination-response',
        requestId: message.id,
        capabilities: this.config.capabilities,
        currentLoad: this.getCurrentLoad(),
        availableForTask: true,
        devopsStatus: {
          activeTasks: this.activeMessages.size,
          supportedOperations: ['containerization', 'deployment', 'cicd', 'monitoring'],
          resourceUtilization: this.getCurrentLoad()
        }
      },
      options: {
        requireAcknowledgment: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(response, `${this.config.subjectPrefix}.coordination.response`);
  }

  private async handleCapabilitiesQuery(message: RealUEPMessage): Promise<void> {
    const response: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: message.from,
      priority: 'normal',
      status: 'completed',
      correlationId: message.id,
      payload: {
        type: 'capabilities-response',
        requestId: message.id,
        capabilities: this.config.capabilities,
        agentType: this.config.agentType,
        status: 'available'
      },
      options: {
        requireAcknowledgment: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(response, `${this.config.subjectPrefix}.capabilities.response`);
  }

  private async handleStatusRequest(message: RealUEPMessage): Promise<void> {
    const response: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: message.from,
      priority: 'normal',
      status: 'completed',
      correlationId: message.id,
      payload: {
        type: 'status-response',
        requestId: message.id,
        status: {
          agentId: this.config.agentId,
          initialized: this.isInitialized,
          sessionId: this.sessionId,
          activeMessages: this.activeMessages.size,
          capabilities: this.config.capabilities,
          uptime: Date.now() - parseInt(this.sessionId.split('_')[1])
        }
      },
      options: {
        requireAcknowledgment: true
      },
      metadata: {
        retryAttempts: 0
      }
    };

    await this.sendMessage(response, `${this.config.subjectPrefix}.status.response`);
  }

  private heartbeatInterval?: NodeJS.Timeout;

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      const heartbeatMessage: RealUEPMessage = {
        id: this.generateMessageId(),
        type: 'heartbeat',
        timestamp: Date.now(),
        from: this.config.agentId,
        to: 'coordination-system',
        priority: 'low',
        status: 'completed',
        payload: {
          type: 'heartbeat',
          status: 'alive',
          load: this.getCurrentLoad(),
          timestamp: new Date().toISOString(),
          devopsMetrics: {
            activeTasks: this.activeMessages.size,
            supportedPlatforms: Object.keys(this.config.capabilities.deployment || {}).length,
            healthStatus: 'healthy'
          }
        },
        options: {
          persistent: false
        },
        metadata: {
          retryAttempts: 0
        }
      };

      try {
        await this.sendMessage(heartbeatMessage, `${this.config.subjectPrefix}.heartbeat`);
      } catch (error) {
        this.logger.warn('💓 Real UEP heartbeat failed', { error });
      }
    }, 30000); // 30 second heartbeat
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private async sendMessage(message: RealUEPMessage, subject: string): Promise<void> {
    if (!this.jetStream) {
      throw new Error('JetStream not initialized');
    }

    this.activeMessages.set(message.id, message);

    try {
      const ack = await this.jetStream.publish(subject, JSON.stringify(message));
      
      this.emit('message-sent', message);
      this.logger.debug('📤 Real UEP message sent', { 
        messageId: message.id, 
        type: message.type, 
        subject,
        ack: ack.seq 
      });

      // Remove from active messages after successful send
      setTimeout(() => {
        this.activeMessages.delete(message.id);
      }, 5000);
      
    } catch (error) {
      this.activeMessages.delete(message.id);
      this.logger.error('❌ Failed to send Real UEP message', { message, subject, error });
      throw error;
    }
  }

  private async sendMessageAndWaitForResponse(message: RealUEPMessage, subject: string, timeout = 10000): Promise<RealUEPMessage | null> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.responseHandlers.delete(message.id);
        reject(new Error('Real UEP message response timeout'));
      }, timeout);

      const responseHandler = (response: RealUEPMessage) => {
        clearTimeout(timeoutHandle);
        this.responseHandlers.delete(message.id);
        resolve(response);
      };

      this.responseHandlers.set(message.id, responseHandler);
      this.sendMessage(message, subject).catch(reject);
    });
  }

  private calculateTaskProgress(task: DevOpsTask): number {
    // DevOps-specific progress calculation
    switch (task.status) {
      case 'pending': return 0;
      case 'in-progress': 
        // More granular progress for DevOps tasks
        if (task.type === 'setup-docker') return 40;
        if (task.type === 'configure-deployment') return 60;
        if (task.type === 'setup-cicd') return 50;
        if (task.type === 'setup-monitoring') return 30;
        return 50;
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  }

  private getCurrentLoad(): number {
    // DevOps-specific load calculation
    const baseLoad = Math.min(this.activeMessages.size / 20, 1.0);
    const handlerLoad = Math.min(this.responseHandlers.size / 10, 0.5);
    return Math.min(baseLoad + handlerLoad, 1.0);
  }

  private generateMessageId(): string {
    return `devops_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `devops_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}