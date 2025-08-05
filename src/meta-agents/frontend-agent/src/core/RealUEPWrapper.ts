/**
 * REAL UEP (Universal Execution Protocol) Wrapper for Frontend Agent
 * 
 * ZAD MANDATE PHASE 3 - FRONTEND AGENT UEP INTEGRATION
 * 
 * Uses the REAL UEP message format from MessagePassingSystem.ts
 * Implements NATS-based communication instead of HTTP endpoints
 * 
 * NO FAKE SHIT: This is the production-ready UEP integration for Frontend Agent
 */

import { EventEmitter } from 'events';
import { connect, NatsConnection, JSONCodec } from 'nats';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';

import {
  FrontendTask,
  ProcessingResult,
  FrontendAgentCapabilities
} from '../types/index.js';

import { createLogger } from '../utils/logger.js';

// REAL UEP Message Types from MessagePassingSystem.ts
export type UEPMessageType = 
  | 'task.request'
  | 'task.response' 
  | 'task.status'
  | 'agent.heartbeat'
  | 'agent.ready'
  | 'agent.error'
  | 'context.share'
  | 'context.request'
  | 'system.broadcast';

export type UEPMessagePriority = 'low' | 'medium' | 'high' | 'urgent';
export type UEPMessageStatus = 'pending' | 'delivered' | 'acknowledged' | 'failed' | 'expired';

// REAL UEP Message Format from MessagePassingSystem.ts
export interface RealUEPMessage {
  // Core message identification
  id: string;
  type: UEPMessageType;
  timestamp: number;
  
  // Routing information
  from: string;           // Source agent ID
  to: string | string[];  // Target agent ID(s) or 'broadcast'
  
  // Message metadata
  priority: UEPMessagePriority;
  status: UEPMessageStatus;
  correlationId?: string; // For request/response correlation
  parentMessageId?: string; // For message threading
  
  // Message content
  payload: any;
  
  // Delivery and processing options
  options: {
    timeout?: number;           // Message timeout in ms
    retryCount?: number;        // Number of retry attempts
    requireAcknowledgment?: boolean; // Require delivery confirmation
    persistent?: boolean;       // Store message persistently
    broadcast?: boolean;        // Broadcast to all agents
  };
  
  // Processing metadata
  metadata: {
    retryAttempts: number;
    lastRetry?: number;
    deliveredAt?: number;
    acknowledgedAt?: number;
    processingTime?: number;
    route?: string[];        // Message routing path
  };
}

export interface RealUEPWrapperConfig {
  agentId: string;
  agentType: 'domain-specific' | 'infrastructure' | 'coordination';
  capabilities: FrontendAgentCapabilities;
  natsUrl?: string;
  enableRealTimeUpdates?: boolean;
  enableTaskDistribution?: boolean;
}

/**
 * REAL UEP Wrapper using actual UEP specification and NATS transport for Frontend Agent
 */
export class RealUEPWrapper extends EventEmitter {
  private config: RealUEPWrapperConfig;
  private logger: Logger;
  private natsConnection?: NatsConnection;
  private jc = JSONCodec();
  private isInitialized = false;
  private sessionId: string;
  private activeMessages = new Map<string, RealUEPMessage>();

  constructor(config: RealUEPWrapperConfig) {
    super();

    this.config = {
      natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
      enableRealTimeUpdates: true,
      enableTaskDistribution: true,
      ...config
    };

    this.logger = createLogger(`real-uep-wrapper-${config.agentId}`, 'info');
    this.sessionId = uuidv4();

    this.logger.info('REAL UEP Wrapper (Frontend Agent) initialized', {
      agentId: this.config.agentId,
      sessionId: this.sessionId,
      capabilities: this.config.capabilities,
      natsUrl: this.config.natsUrl
    });
  }

  /**
   * Initialize REAL UEP wrapper with NATS connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing REAL UEP Wrapper (Frontend Agent) with NATS...');

      // Connect to NATS server
      this.natsConnection = await connect({
        servers: this.config.natsUrl,
        timeout: 5000,
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectTimeWait: 1000
      });

      this.logger.info('✅ NATS connection established', {
        serverId: this.natsConnection.info?.server_id,
        serverName: this.natsConnection.info?.server_name
      });

      // Register agent with coordination system using REAL UEP format
      await this.registerAgent();

      // Setup NATS message subscriptions
      await this.setupNATSSubscriptions();

      // Start heartbeat for real-time coordination
      if (this.config.enableRealTimeUpdates) {
        this.startHeartbeat();
      }

      this.isInitialized = true;
      this.logger.info('✅ REAL UEP Wrapper (Frontend Agent) initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize REAL UEP Wrapper (Frontend Agent)', { error });
      throw error;
    }
  }

  /**
   * Send task result using REAL UEP message format
   */
  async sendTaskResult(task: FrontendTask, result: ProcessingResult): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'factory-core', // Send back to factory
      priority: 'medium',
      status: 'pending',
      correlationId: task.id, // Use task ID for correlation
      payload: {
        taskId: task.id,
        taskType: task.type,
        result,
        completedAt: new Date().toISOString(),
        processingTime: result.processingTime || 0,
        success: result.success,
        agentId: this.config.agentId
      },
      options: {
        timeout: 30000,
        retryCount: 3,
        requireAcknowledgment: true,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(message, 'task.result');
    this.logger.info('📤 Task result sent via REAL UEP (Frontend Agent)', { 
      taskId: task.id, 
      success: result.success,
      messageId: message.id
    });
  }

  /**
   * Send task status update using REAL UEP format
   */
  async sendTaskUpdate(task: FrontendTask): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.status',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'factory-core',
      priority: 'low',
      status: 'pending',
      correlationId: task.id,
      payload: {
        taskId: task.id,
        status: task.status,
        progress: this.calculateTaskProgress(task),
        updatedAt: new Date().toISOString(),
        agentId: this.config.agentId
      },
      options: {
        timeout: 15000,
        retryCount: 2,
        requireAcknowledgment: false,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(message, 'task.status');
  }

  /**
   * Process incoming REAL UEP message
   */
  private async handleIncomingMessage(message: RealUEPMessage): Promise<void> {
    this.logger.debug('📨 Received REAL UEP message (Frontend Agent)', { 
      messageId: message.id, 
      type: message.type,
      from: message.from 
    });

    try {
      // Validate REAL UEP message format
      this.validateUEPMessage(message);

      // Update message route
      if (message.metadata.route) {
        message.metadata.route.push(this.config.agentId);
      }

      // Process based on message type using REAL UEP specification
      switch (message.type) {
        case 'task.request':
          await this.handleTaskRequest(message);
          break;
          
        case 'task.response':
          this.emit('task-response', message);
          break;
          
        case 'task.status':
          this.emit('task-status', message);
          break;
          
        case 'agent.heartbeat':
          await this.handleHeartbeat(message);
          break;
          
        case 'context.request':
          await this.handleContextRequest(message);
          break;
          
        case 'system.broadcast':
          this.emit('system-broadcast', message);
          break;
          
        default:
          this.logger.debug('Unknown REAL UEP message type', { type: message.type });
      }

      // Send acknowledgment if required
      if (message.options.requireAcknowledgment) {
        await this.sendAcknowledgment(message);
      }

    } catch (error) {
      this.logger.error('❌ Error processing REAL UEP message (Frontend Agent)', { 
        messageId: message.id, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Send error response if this was a request
      if (message.type.includes('request')) {
        await this.sendErrorResponse(message, error);
      }
    }
  }

  /**
   * Handle task request using REAL UEP format
   */
  private async handleTaskRequest(message: RealUEPMessage): Promise<void> {
    const taskData = message.payload.task || message.payload;
    
    // Convert REAL UEP message to FrontendTask format
    const task: FrontendTask = {
      id: taskData.id || message.id,
      type: taskData.type || 'generate-component',
      description: taskData.description || taskData.title || 'Task from REAL UEP',
      requirements: taskData.requirements || {},
      context: {} as any, // Will be populated during processing
      priority: message.priority as any || 'medium',
      status: 'pending'
    };

    this.logger.info('📋 Received task via REAL UEP (Frontend Agent)', { 
      taskId: task.id, 
      type: task.type,
      description: task.description,
      messageId: message.id
    });

    // Emit task for processing by FrontendAgent
    this.emit('task-assigned', task);
  }

  /**
   * Send acknowledgment using REAL UEP format
   */
  private async sendAcknowledgment(originalMessage: RealUEPMessage): Promise<void> {
    const ackMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: originalMessage.from,
      priority: 'low',
      status: 'pending',
      correlationId: originalMessage.id,
      parentMessageId: originalMessage.id,
      payload: { 
        acknowledged: true,
        originalMessageId: originalMessage.id,
        acknowledgedAt: new Date().toISOString()
      },
      options: {
        timeout: 10000,
        retryCount: 1,
        requireAcknowledgment: false,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(ackMessage, 'acknowledgment');
  }

  /**
   * Register agent using REAL UEP format
   */
  private async registerAgent(): Promise<void> {
    const registrationMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'agent.ready',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'factory-core',
      priority: 'high',
      status: 'pending',
      payload: {
        agentId: this.config.agentId,
        agentType: this.config.agentType,
        capabilities: this.config.capabilities,
        status: 'online',
        registeredAt: new Date().toISOString(),
        sessionId: this.sessionId
      },
      options: {
        timeout: 30000,
        retryCount: 3,
        requireAcknowledgment: true,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(registrationMessage, 'agent.register');
    this.logger.info('✅ Frontend Agent registered via REAL UEP');
  }

  /**
   * Setup NATS subscriptions for REAL UEP messages
   */
  private async setupNATSSubscriptions(): Promise<void> {
    if (!this.natsConnection) {
      throw new Error('NATS connection not established');
    }

    // Subscribe to agent-specific tasks
    const agentTaskSubject = `agent.${this.config.agentId}.task`;
    const agentSubscription = this.natsConnection.subscribe(agentTaskSubject);
    
    // Subscribe to broadcast messages
    const broadcastSubject = 'agent.broadcast';
    const broadcastSubscription = this.natsConnection.subscribe(broadcastSubject);

    this.logger.info('🎧 NATS subscriptions established (Frontend Agent)', {
      agentTaskSubject,
      broadcastSubject
    });

    // Handle agent-specific messages
    (async () => {
      for await (const msg of agentSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          this.logger.error('❌ Error processing agent task message (Frontend Agent)', { error });
        }
      }
    })();

    // Handle broadcast messages
    (async () => {
      for await (const msg of broadcastSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          if (uepMessage.from !== this.config.agentId) { // Don't process our own broadcasts
            await this.handleIncomingMessage(uepMessage);
          }
        } catch (error) {
          this.logger.error('❌ Error processing broadcast message (Frontend Agent)', { error });
        }
      }
    })();
  }

  /**
   * Send REAL UEP message via NATS
   */
  private async sendMessage(message: RealUEPMessage, subject: string): Promise<void> {
    if (!this.natsConnection) {
      throw new Error('NATS connection not established');
    }

    try {
      // Store message for tracking
      this.activeMessages.set(message.id, message);

      // Publish to NATS with proper subject routing
      await this.natsConnection.publish(subject, this.jc.encode(message));
      
      // Update message status
      message.status = 'delivered';
      message.metadata.deliveredAt = Date.now();

      this.logger.debug('📤 REAL UEP message sent via NATS (Frontend Agent)', { 
        messageId: message.id, 
        subject,
        type: message.type 
      });

      // Clean up after delay
      setTimeout(() => {
        this.activeMessages.delete(message.id);
      }, 60000); // Keep for 1 minute

    } catch (error) {
      message.status = 'failed';
      this.activeMessages.delete(message.id);
      this.logger.error('❌ Failed to send REAL UEP message (Frontend Agent)', { message, error });
      throw error;
    }
  }

  /**
   * Validate REAL UEP message format
   */
  private validateUEPMessage(message: RealUEPMessage): void {
    const requiredFields = ['id', 'type', 'timestamp', 'from', 'to', 'priority', 'status', 'payload', 'options', 'metadata'];
    
    for (const field of requiredFields) {
      if (!message.hasOwnProperty(field)) {
        throw new Error(`Invalid REAL UEP message: missing field '${field}'`);
      }
    }

    const validTypes: UEPMessageType[] = [
      'task.request', 'task.response', 'task.status', 'agent.heartbeat', 
      'agent.ready', 'agent.error', 'context.share', 'context.request', 'system.broadcast'
    ];

    if (!validTypes.includes(message.type)) {
      throw new Error(`Invalid REAL UEP message type: ${message.type}`);
    }
  }

  /**
   * Generate unique message ID following UEP specification
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate task progress
   */
  private calculateTaskProgress(task: FrontendTask): number {
    switch (task.status) {
      case 'pending': return 0;
      case 'in-progress': return 50;
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  }

  /**
   * Handle heartbeat messages
   */
  private async handleHeartbeat(message: RealUEPMessage): Promise<void> {
    // Respond with our own heartbeat
    const heartbeatResponse: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'agent.heartbeat',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: message.from,
      priority: 'low',
      status: 'pending',
      correlationId: message.id,
      payload: {
        status: 'alive',
        load: this.getCurrentLoad(),
        capabilities: this.config.capabilities,
        sessionId: this.sessionId
      },
      options: {
        timeout: 10000,
        retryCount: 1,
        requireAcknowledgment: false,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(heartbeatResponse, 'agent.heartbeat');
  }

  /**
   * Handle context request messages
   */
  private async handleContextRequest(message: RealUEPMessage): Promise<void> {
    // Send back agent context
    const contextResponse: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'context.share',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: message.from,
      priority: 'medium',
      status: 'pending',
      correlationId: message.id,
      payload: {
        agentId: this.config.agentId,
        capabilities: this.config.capabilities,
        status: this.isInitialized ? 'ready' : 'initializing',
        activeMessages: this.activeMessages.size,
        sessionId: this.sessionId
      },
      options: {
        timeout: 15000,
        retryCount: 2,
        requireAcknowledgment: false,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(contextResponse, 'context.response');
  }

  /**
   * Send error response
   */
  private async sendErrorResponse(originalMessage: RealUEPMessage, error: any): Promise<void> {
    const errorMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'agent.error',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: originalMessage.from,
      priority: 'high',
      status: 'pending',
      correlationId: originalMessage.id,
      payload: {
        error: error instanceof Error ? error.message : String(error),
        originalMessageId: originalMessage.id,
        erroredAt: new Date().toISOString()
      },
      options: {
        timeout: 30000,
        retryCount: 3,
        requireAcknowledgment: true,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(errorMessage, 'agent.error');
  }

  /**
   * Start heartbeat using REAL UEP format
   */
  private heartbeatInterval?: NodeJS.Timeout;

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.isInitialized) return;

      const heartbeatMessage: RealUEPMessage = {
        id: this.generateMessageId(),
        type: 'agent.heartbeat',
        timestamp: Date.now(),
        from: this.config.agentId,
        to: 'factory-core',
        priority: 'low',
        status: 'pending',
        payload: {
          status: 'alive',
          load: this.getCurrentLoad(),
          capabilities: this.config.capabilities,
          sessionId: this.sessionId,
          uptime: Date.now() - new Date(this.sessionId).getTime()
        },
        options: {
          timeout: 10000,
          retryCount: 1,
          requireAcknowledgment: false,
          persistent: false
        },
        metadata: {
          retryAttempts: 0,
          route: [this.config.agentId]
        }
      };

      try {
        await this.sendMessage(heartbeatMessage, 'agent.heartbeat');
      } catch (error) {
        this.logger.warn('💓 Heartbeat failed (Frontend Agent)', { error });
      }
    }, 30000); // 30 second heartbeat
  }

  /**
   * Get current agent load
   */
  private getCurrentLoad(): number {
    return Math.min(this.activeMessages.size / 10, 1.0);
  }

  /**
   * Shutdown REAL UEP wrapper
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down REAL UEP Wrapper (Frontend Agent)...');

    try {
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }

      // Unregister agent
      if (this.isInitialized) {
        await this.unregisterAgent();
      }

      // Close NATS connection
      if (this.natsConnection) {
        await this.natsConnection.drain();
        this.natsConnection = undefined;
      }

      // Clear active messages
      this.activeMessages.clear();

      this.isInitialized = false;
      this.logger.info('✅ REAL UEP Wrapper (Frontend Agent) shut down successfully');

    } catch (error) {
      this.logger.error('❌ Error shutting down REAL UEP Wrapper (Frontend Agent)', { error });
      throw error;
    }
  }

  /**
   * Unregister agent using REAL UEP format
   */
  private async unregisterAgent(): Promise<void> {
    const unregistrationMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'agent.error', // Use agent.error to indicate going offline
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'factory-core',
      priority: 'medium',
      status: 'pending',
      payload: {
        agentId: this.config.agentId,
        status: 'offline',
        reason: 'shutdown',
        unregisteredAt: new Date().toISOString(),
        sessionId: this.sessionId
      },
      options: {
        timeout: 15000,
        retryCount: 2,
        requireAcknowledgment: false,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(unregistrationMessage, 'agent.unregister');
    this.logger.info('✅ Frontend Agent unregistered via REAL UEP');
  }
}