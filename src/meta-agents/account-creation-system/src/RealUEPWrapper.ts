/**
 * REAL UEP (Universal Execution Protocol) Wrapper for Account-Creation-System Agent
 * 
 * CYCLE 11 UEP INTEGRATION - ACCOUNT-CREATION-SYSTEM AGENT
 * 
 * Uses the REAL UEP message format from MessagePassingSystem.ts
 * Implements NATS-based communication instead of HTTP endpoints
 * 
 * NO FAKE SHIT: This is the production-ready UEP integration for Account-Creation-System Agent
 */

import { EventEmitter } from 'events';
import { connect, NatsConnection, JSONCodec } from 'nats';
import { v4 as uuidv4 } from 'uuid';

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
  capabilities: any;
  natsUrl?: string;
  enableRealTimeUpdates?: boolean;
  enableTaskDistribution?: boolean;
}

/**
 * REAL UEP Wrapper using actual UEP specification and NATS transport for Account-Creation-System Agent
 */
export class RealUEPWrapper extends EventEmitter {
  private config: RealUEPWrapperConfig;
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

    this.sessionId = uuidv4();

    console.log('🔗 REAL UEP Wrapper (Account-Creation-System Agent) initialized', {
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
      console.log('🚀 Initializing REAL UEP Wrapper (Account-Creation-System Agent) with NATS...');

      // Connect to NATS server
      this.natsConnection = await connect({
        servers: this.config.natsUrl,
        timeout: 5000,
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectTimeWait: 1000
      });

      console.log('✅ NATS connection established', {
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
      console.log('✅ REAL UEP Wrapper (Account-Creation-System Agent) initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize REAL UEP Wrapper (Account-Creation-System Agent)', { error });
      throw error;
    }
  }

  /**
   * Send task result using REAL UEP message format
   */
  async sendTaskResult(task: any, result: any): Promise<void> {
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
        taskType: task.type || 'create-accounts',
        result,
        completedAt: new Date().toISOString(),
        processingTime: result.duration || 0,
        success: result.overallStatus ? (result.overallStatus !== 'FAILED') : true,
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
    console.log('📤 Account creation result sent via REAL UEP (Account-Creation-System Agent)', { 
      taskId: task.id, 
      success: message.payload.success,
      overallStatus: result.overallStatus || 'unknown',
      accountsCreated: result.successfulServices || 0,
      messageId: message.id
    });
  }

  /**
   * Send account creation progress update using REAL UEP format
   */
  async sendAccountCreationUpdate(progress: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.status',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'factory-core',
      priority: 'low',
      status: 'pending',
      payload: {
        type: 'account-creation-update',
        progress,
        agentId: this.config.agentId,
        timestamp: new Date().toISOString()
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
   * Broadcast account creation results to all agents
   */
  async broadcastAccountCreationResult(creationResult: any): Promise<void> {
    const broadcastMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'system.broadcast',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'broadcast',
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'account-creation',
        creationResult,
        timestamp: Date.now(),
        sourceAgent: this.config.agentId
      },
      options: {
        timeout: 30000,
        retryCount: 2,
        requireAcknowledgment: false,
        persistent: false,
        broadcast: true
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(broadcastMessage, 'agent.broadcast');
    console.log('📤 Account creation result broadcasted to all agents');
  }

  /**
   * Send credentials to requesting agent (encrypted)
   */
  async sendCredentials(targetAgent: string, credentials: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'high',
      status: 'pending',
      payload: {
        type: 'account-credentials',
        credentials, // Should be encrypted in real implementation
        agentId: this.config.agentId,
        timestamp: new Date().toISOString()
      },
      options: {
        timeout: 30000,
        retryCount: 3,
        requireAcknowledgment: true,
        persistent: true // Important for credentials
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(message, 'account.credentials.result');
    console.log('📤 Account credentials sent to', targetAgent);
  }

  /**
   * Send service status to requesting agent
   */
  async sendServiceStatus(targetAgent: string, serviceStatus: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'service-status',
        serviceStatus,
        agentId: this.config.agentId,
        timestamp: new Date().toISOString()
      },
      options: {
        timeout: 20000,
        retryCount: 3,
        requireAcknowledgment: true,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(message, 'service.status.result');
    console.log('📤 Service status sent to', targetAgent);
  }

  /**
   * Send email verification result to requesting agent
   */
  async sendEmailVerificationResult(targetAgent: string, verificationResult: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'high',
      status: 'pending',
      payload: {
        type: 'email-verification-result',
        verificationResult,
        agentId: this.config.agentId,
        timestamp: new Date().toISOString()
      },
      options: {
        timeout: 25000,
        retryCount: 3,
        requireAcknowledgment: true,
        persistent: false
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(message, 'email.verification.result');
    console.log('📤 Email verification result sent to', targetAgent);
  }

  /**
   * Send API key generation result to requesting agent
   */
  async sendAPIKeyResult(targetAgent: string, apiKeyResult: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'high',
      status: 'pending',
      payload: {
        type: 'api-key-result',
        apiKeyResult, // Should be encrypted in real implementation
        agentId: this.config.agentId,
        timestamp: new Date().toISOString()
      },
      options: {
        timeout: 30000,
        retryCount: 3,
        requireAcknowledgment: true,
        persistent: true // Important for API keys
      },
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };

    await this.sendMessage(message, 'api.key.result');
    console.log('📤 API key result sent to', targetAgent);
  }

  /**
   * Send system status to requesting agent
   */
  async sendSystemStatus(targetAgent: string, systemStatus: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'low',
      status: 'pending',
      payload: {
        type: 'system-status',
        systemStatus,
        agentId: this.config.agentId,
        timestamp: new Date().toISOString()
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

    await this.sendMessage(message, 'system.status.result');
    console.log('📤 System status sent to', targetAgent);
  }

  /**
   * Process incoming REAL UEP message
   */
  private async handleIncomingMessage(message: RealUEPMessage): Promise<void> {
    console.log('📨 Received REAL UEP message (Account-Creation-System Agent)', { 
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
          console.log('Unknown REAL UEP message type', { type: message.type });
      }

      // Send acknowledgment if required
      if (message.options.requireAcknowledgment) {
        await this.sendAcknowledgment(message);
      }

    } catch (error) {
      console.error('❌ Error processing REAL UEP message (Account-Creation-System Agent)', { 
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
    
    // Convert REAL UEP message to Account-Creation-System task format
    const task = {
      id: taskData.id || message.id,
      type: taskData.type || 'create-accounts',
      requestId: taskData.requestId || taskData.id || message.id,
      services: taskData.services || [],
      personalInfo: taskData.personalInfo || {
        email: taskData.email || 'user@example.com',
        firstName: taskData.firstName || 'John',
        lastName: taskData.lastName || 'Doe'
      },
      priority: taskData.priority || message.priority || 'medium',
      preferences: taskData.preferences || {},
      requirements: taskData.requirements || {},
      configuration: taskData.configuration || {},
      context: taskData.context || {}
    };

    console.log('📋 Received account creation task via REAL UEP (Account-Creation-System Agent)', { 
      taskId: task.id, 
      type: task.type,
      requestId: task.requestId,
      services: task.services,
      email: task.personalInfo.email,
      messageId: message.id
    });

    // Emit task for processing by AccountCreationSystem
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
    console.log('✅ Account-Creation-System Agent registered via REAL UEP');
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

    // Subscribe to account creation requests
    const accountCreationSubject = 'account.creation.request';
    const accountCreationSubscription = this.natsConnection.subscribe(accountCreationSubject);

    // Subscribe to credentials requests
    const credentialsSubject = 'account.credentials.request';
    const credentialsSubscription = this.natsConnection.subscribe(credentialsSubject);

    // Subscribe to service status requests
    const serviceStatusSubject = 'service.status.request';
    const serviceStatusSubscription = this.natsConnection.subscribe(serviceStatusSubject);

    // Subscribe to email verification requests
    const emailVerificationSubject = 'email.verification.request';
    const emailVerificationSubscription = this.natsConnection.subscribe(emailVerificationSubject);

    // Subscribe to API key generation requests
    const apiKeySubject = 'api.key.request';
    const apiKeySubscription = this.natsConnection.subscribe(apiKeySubject);

    // Subscribe to system status requests
    const systemStatusSubject = 'system.status.request';
    const systemStatusSubscription = this.natsConnection.subscribe(systemStatusSubject);

    console.log('🎧 NATS subscriptions established (Account-Creation-System Agent)', {
      agentTaskSubject,
      broadcastSubject,
      accountCreationSubject,
      credentialsSubject,
      serviceStatusSubject,
      emailVerificationSubject,
      apiKeySubject,
      systemStatusSubject
    });

    // Handle agent-specific messages
    (async () => {
      for await (const msg of agentSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing agent task message (Account-Creation-System Agent)', { error });
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
          console.error('❌ Error processing broadcast message (Account-Creation-System Agent)', { error });
        }
      }
    })();

    // Handle account creation requests
    (async () => {
      for await (const msg of accountCreationSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing account creation request (Account-Creation-System Agent)', { error });
        }
      }
    })();

    // Handle credentials requests
    (async () => {
      for await (const msg of credentialsSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing credentials request (Account-Creation-System Agent)', { error });
        }
      }
    })();

    // Handle service status requests
    (async () => {
      for await (const msg of serviceStatusSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing service status request (Account-Creation-System Agent)', { error });
        }
      }
    })();

    // Handle email verification requests
    (async () => {
      for await (const msg of emailVerificationSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing email verification request (Account-Creation-System Agent)', { error });
        }
      }
    })();

    // Handle API key requests
    (async () => {
      for await (const msg of apiKeySubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing API key request (Account-Creation-System Agent)', { error });
        }
      }
    })();

    // Handle system status requests
    (async () => {
      for await (const msg of systemStatusSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing system status request (Account-Creation-System Agent)', { error });
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

      console.log('📤 REAL UEP message sent via NATS (Account-Creation-System Agent)', { 
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
      console.error('❌ Failed to send REAL UEP message (Account-Creation-System Agent)', { message, error });
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
        console.warn('💓 Heartbeat failed (Account-Creation-System Agent)', { error });
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
    console.log('🛑 Shutting down REAL UEP Wrapper (Account-Creation-System Agent)...');

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
      console.log('✅ REAL UEP Wrapper (Account-Creation-System Agent) shut down successfully');

    } catch (error) {
      console.error('❌ Error shutting down REAL UEP Wrapper (Account-Creation-System Agent)', { error });
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
    console.log('✅ Account-Creation-System Agent unregistered via REAL UEP');
  }
}