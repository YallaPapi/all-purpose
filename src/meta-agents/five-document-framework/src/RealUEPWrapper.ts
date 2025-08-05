/**
 * REAL UEP (Universal Execution Protocol) Wrapper for Five-Document-Framework Agent
 * 
 * CYCLE 7 UEP INTEGRATION - FIVE-DOCUMENT-FRAMEWORK AGENT
 * 
 * Uses the REAL UEP message format from MessagePassingSystem.ts
 * Implements NATS-based communication instead of HTTP endpoints
 * 
 * NO FAKE SHIT: This is the production-ready UEP integration for Five-Document-Framework Agent
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
 * REAL UEP Wrapper using actual UEP specification and NATS transport for Five-Document-Framework Agent
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

    console.log('🔗 REAL UEP Wrapper (Five-Document-Framework Agent) initialized', {
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
      console.log('🚀 Initializing REAL UEP Wrapper (Five-Document-Framework Agent) with NATS...');

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
      console.log('✅ REAL UEP Wrapper (Five-Document-Framework Agent) initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize REAL UEP Wrapper (Five-Document-Framework Agent)', { error });
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
        taskType: task.type || 'generate-documentation-framework',
        result,
        completedAt: new Date().toISOString(),
        processingTime: result.performance?.totalTime || 0,
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
    console.log('📤 Documentation framework result sent via REAL UEP (Five-Document-Framework Agent)', { 
      taskId: task.id, 
      success: result.success,
      documentsGenerated: result.documentsGenerated?.length || 0,
      messageId: message.id
    });
  }

  /**
   * Send documentation generation update using REAL UEP format
   */
  async sendDocumentationUpdate(documentation: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.status',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'factory-core',
      priority: 'low',
      status: 'pending',
      payload: {
        type: 'documentation-update',
        documentation,
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
   * Broadcast documentation framework results to all agents
   */
  async broadcastDocumentationFramework(frameworkResult: any): Promise<void> {
    const broadcastMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'system.broadcast',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'broadcast',
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'documentation-framework',
        frameworkResult,
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
    console.log('📤 Documentation framework broadcasted to all agents');
  }

  /**
   * Send document generation result to requesting agent
   */
  async sendDocumentGenerationResult(targetAgent: string, generationResult: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'document-generation-result',
        generationResult,
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

    await this.sendMessage(message, 'document.generation.result');
    console.log('📤 Document generation result sent to', targetAgent);
  }

  /**
   * Send consistency validation result to requesting agent
   */
  async sendConsistencyValidationResult(targetAgent: string, validationResult: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'high',
      status: 'pending',
      payload: {
        type: 'consistency-validation-result',
        validationResult,
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

    await this.sendMessage(message, 'consistency.validation.result');
    console.log('📤 Consistency validation result sent to', targetAgent);
  }

  /**
   * Send template processing result to requesting agent
   */
  async sendTemplateProcessingResult(targetAgent: string, templateResult: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'template-processing-result',
        templateResult,
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

    await this.sendMessage(message, 'template.processing.result');
    console.log('📤 Template processing result sent to', targetAgent);
  }

  /**
   * Process incoming REAL UEP message
   */
  private async handleIncomingMessage(message: RealUEPMessage): Promise<void> {
    console.log('📨 Received REAL UEP message (Five-Document-Framework Agent)', { 
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
      console.error('❌ Error processing REAL UEP message (Five-Document-Framework Agent)', { 
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
    
    // Convert REAL UEP message to Five-Document-Framework task format
    const task = {
      id: taskData.id || message.id,
      type: taskData.type || 'generate',
      description: taskData.description || taskData.title || 'Documentation framework generation task from REAL UEP',
      projectOverride: taskData.projectOverride || taskData.projectConfig,
      generationOverride: taskData.generationOverride || taskData.generationConfig,
      documentsToGenerate: taskData.documentsToGenerate || taskData.documents,
      validateOnly: taskData.validateOnly || false,
      outputDir: taskData.outputDir || process.cwd(),
      templateDir: taskData.templateDir,
      validateConsistency: taskData.validateConsistency !== false,
      configuration: taskData.configuration || {},
      context: taskData.context || {},
      priority: message.priority as any || 'medium'
    };

    console.log('📋 Received documentation framework task via REAL UEP (Five-Document-Framework Agent)', { 
      taskId: task.id, 
      type: task.type,
      documentsToGenerate: task.documentsToGenerate?.length || 'all',
      description: task.description,
      messageId: message.id
    });

    // Emit task for processing by FiveDocumentFrameworkAgent
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
    console.log('✅ Five-Document-Framework Agent registered via REAL UEP');
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

    // Subscribe to documentation generation requests
    const documentationSubject = 'documentation.generation.request';
    const documentationSubscription = this.natsConnection.subscribe(documentationSubject);

    // Subscribe to consistency validation requests
    const validationSubject = 'consistency.validation.request';
    const validationSubscription = this.natsConnection.subscribe(validationSubject);

    // Subscribe to template processing requests
    const templateSubject = 'template.processing.request';
    const templateSubscription = this.natsConnection.subscribe(templateSubject);

    console.log('🎧 NATS subscriptions established (Five-Document-Framework Agent)', {
      agentTaskSubject,
      broadcastSubject,
      documentationSubject,
      validationSubject,
      templateSubject
    });

    // Handle agent-specific messages
    (async () => {
      for await (const msg of agentSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing agent task message (Five-Document-Framework Agent)', { error });
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
          console.error('❌ Error processing broadcast message (Five-Document-Framework Agent)', { error });
        }
      }
    })();

    // Handle documentation generation requests
    (async () => {
      for await (const msg of documentationSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing documentation request (Five-Document-Framework Agent)', { error });
        }
      }
    })();

    // Handle consistency validation requests
    (async () => {
      for await (const msg of validationSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing validation request (Five-Document-Framework Agent)', { error });
        }
      }
    })();

    // Handle template processing requests
    (async () => {
      for await (const msg of templateSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing template request (Five-Document-Framework Agent)', { error });
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

      console.log('📤 REAL UEP message sent via NATS (Five-Document-Framework Agent)', { 
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
      console.error('❌ Failed to send REAL UEP message (Five-Document-Framework Agent)', { message, error });
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
        console.warn('💓 Heartbeat failed (Five-Document-Framework Agent)', { error });
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
    console.log('🛑 Shutting down REAL UEP Wrapper (Five-Document-Framework Agent)...');

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
      console.log('✅ REAL UEP Wrapper (Five-Document-Framework Agent) shut down successfully');

    } catch (error) {
      console.error('❌ Error shutting down REAL UEP Wrapper (Five-Document-Framework Agent)', { error });
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
    console.log('✅ Five-Document-Framework Agent unregistered via REAL UEP');
  }
}