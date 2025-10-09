/**
 * REAL UEP (Universal Execution Protocol) Wrapper for Thirty-Minute-Rule Agent
 * 
 * CYCLE 8 UEP INTEGRATION - THIRTY-MINUTE-RULE AGENT
 * 
 * Uses the REAL UEP message format from MessagePassingSystem.ts
 * Implements NATS-based communication instead of HTTP endpoints
 * 
 * NO FAKE SHIT: This is the production-ready UEP integration for Thirty-Minute-Rule Agent
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
 * REAL UEP Wrapper using actual UEP specification and NATS transport for Thirty-Minute-Rule Agent
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

    console.log('🔗 REAL UEP Wrapper (Thirty-Minute-Rule Agent) initialized', {
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
      console.log('🚀 Initializing REAL UEP Wrapper (Thirty-Minute-Rule Agent) with NATS...');

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
      console.log('✅ REAL UEP Wrapper (Thirty-Minute-Rule Agent) initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize REAL UEP Wrapper (Thirty-Minute-Rule Agent)', { error });
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
        taskType: task.type || 'debugging-session',
        result,
        completedAt: new Date().toISOString(),
        processingTime: result.performance?.totalTime || 0,
        success: result.success || (result.sessionId ? true : false),
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
    console.log('📤 Debugging session result sent via REAL UEP (Thirty-Minute-Rule Agent)', { 
      taskId: task.id, 
      success: result.success || (result.sessionId ? true : false),
      sessionId: result.sessionId || 'unknown',
      messageId: message.id
    });
  }

  /**
   * Send debugging session update using REAL UEP format
   */
  async sendDebuggingUpdate(session: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.status',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'factory-core',
      priority: 'low',
      status: 'pending',
      payload: {
        type: 'debugging-update',
        session,
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
   * Broadcast debugging session results to all agents
   */
  async broadcastDebuggingSession(sessionResult: any): Promise<void> {
    const broadcastMessage: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'system.broadcast',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: 'broadcast',
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'debugging-session',
        sessionResult,
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
    console.log('📤 Debugging session broadcasted to all agents');
  }

  /**
   * Send debug endpoint generation result to requesting agent
   */
  async sendDebugEndpointResult(targetAgent: string, endpointResult: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'debug-endpoint-result',
        endpointResult,
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

    await this.sendMessage(message, 'debug.endpoint.result');
    console.log('📤 Debug endpoint result sent to', targetAgent);
  }

  /**
   * Send isolation test result to requesting agent
   */
  async sendIsolationTestResult(targetAgent: string, testResult: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'high',
      status: 'pending',
      payload: {
        type: 'isolation-test-result',
        testResult,
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

    await this.sendMessage(message, 'isolation.test.result');
    console.log('📤 Isolation test result sent to', targetAgent);
  }

  /**
   * Send extracted knowledge to requesting agent
   */
  async sendExtractedKnowledge(targetAgent: string, knowledge: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'medium',
      status: 'pending',
      payload: {
        type: 'extracted-knowledge',
        knowledge,
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

    await this.sendMessage(message, 'extracted.knowledge.result');
    console.log('📤 Extracted knowledge sent to', targetAgent);
  }

  /**
   * Send debugging status to requesting agent
   */
  async sendDebuggingStatus(targetAgent: string, status: any): Promise<void> {
    const message: RealUEPMessage = {
      id: this.generateMessageId(),
      type: 'task.response',
      timestamp: Date.now(),
      from: this.config.agentId,
      to: targetAgent,
      priority: 'low',
      status: 'pending',
      payload: {
        type: 'debugging-status',
        status,
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

    await this.sendMessage(message, 'debugging.status.result');
    console.log('📤 Debugging status sent to', targetAgent);
  }

  /**
   * Process incoming REAL UEP message
   */
  private async handleIncomingMessage(message: RealUEPMessage): Promise<void> {
    console.log('📨 Received REAL UEP message (Thirty-Minute-Rule Agent)', { 
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
      console.error('❌ Error processing REAL UEP message (Thirty-Minute-Rule Agent)', { 
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
    
    // Convert REAL UEP message to Thirty-Minute-Rule task format
    const task = {
      id: taskData.id || message.id,
      type: taskData.type || 'debugging-session',
      description: taskData.description || taskData.title || 'Debugging session task from REAL UEP',
      component: taskData.component,
      timeLimit: taskData.timeLimit,
      priority: taskData.priority || message.priority,
      autoGenerateEndpoints: taskData.autoGenerateEndpoints,
      runIsolationTests: taskData.runIsolationTests,
      enableFallbacks: taskData.enableFallbacks,
      customStrategies: taskData.customStrategies,
      metadata: taskData.metadata || {},
      configuration: taskData.configuration || {},
      context: taskData.context || {}
    };

    console.log('📋 Received debugging session task via REAL UEP (Thirty-Minute-Rule Agent)', { 
      taskId: task.id, 
      type: task.type,
      component: task.component,
      timeLimit: task.timeLimit,
      description: task.description,
      messageId: message.id
    });

    // Emit task for processing by ThirtyMinuteRuleAgent
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
    console.log('✅ Thirty-Minute-Rule Agent registered via REAL UEP');
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

    // Subscribe to debugging session requests
    const debuggingSubject = 'debugging.session.request';
    const debuggingSubscription = this.natsConnection.subscribe(debuggingSubject);

    // Subscribe to debug endpoint generation requests
    const endpointSubject = 'debug.endpoint.request';
    const endpointSubscription = this.natsConnection.subscribe(endpointSubject);

    // Subscribe to isolation testing requests
    const isolationSubject = 'isolation.test.request';
    const isolationSubscription = this.natsConnection.subscribe(isolationSubject);

    // Subscribe to knowledge extraction requests
    const knowledgeSubject = 'knowledge.extraction.request';
    const knowledgeSubscription = this.natsConnection.subscribe(knowledgeSubject);

    // Subscribe to debugging status requests
    const statusSubject = 'debugging.status.request';
    const statusSubscription = this.natsConnection.subscribe(statusSubject);

    console.log('🎧 NATS subscriptions established (Thirty-Minute-Rule Agent)', {
      agentTaskSubject,
      broadcastSubject,
      debuggingSubject,
      endpointSubject,
      isolationSubject,
      knowledgeSubject,
      statusSubject
    });

    // Handle agent-specific messages
    (async () => {
      for await (const msg of agentSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing agent task message (Thirty-Minute-Rule Agent)', { error });
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
          console.error('❌ Error processing broadcast message (Thirty-Minute-Rule Agent)', { error });
        }
      }
    })();

    // Handle debugging session requests
    (async () => {
      for await (const msg of debuggingSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing debugging request (Thirty-Minute-Rule Agent)', { error });
        }
      }
    })();

    // Handle debug endpoint generation requests
    (async () => {
      for await (const msg of endpointSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing endpoint request (Thirty-Minute-Rule Agent)', { error });
        }
      }
    })();

    // Handle isolation testing requests
    (async () => {
      for await (const msg of isolationSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing isolation request (Thirty-Minute-Rule Agent)', { error });
        }
      }
    })();

    // Handle knowledge extraction requests
    (async () => {
      for await (const msg of knowledgeSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing knowledge request (Thirty-Minute-Rule Agent)', { error });
        }
      }
    })();

    // Handle debugging status requests
    (async () => {
      for await (const msg of statusSubscription) {
        try {
          const uepMessage = this.jc.decode(msg.data) as RealUEPMessage;
          await this.handleIncomingMessage(uepMessage);
        } catch (error) {
          console.error('❌ Error processing status request (Thirty-Minute-Rule Agent)', { error });
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

      console.log('📤 REAL UEP message sent via NATS (Thirty-Minute-Rule Agent)', { 
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
      console.error('❌ Failed to send REAL UEP message (Thirty-Minute-Rule Agent)', { message, error });
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
        console.warn('💓 Heartbeat failed (Thirty-Minute-Rule Agent)', { error });
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
    console.log('🛑 Shutting down REAL UEP Wrapper (Thirty-Minute-Rule Agent)...');

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
      console.log('✅ REAL UEP Wrapper (Thirty-Minute-Rule Agent) shut down successfully');

    } catch (error) {
      console.error('❌ Error shutting down REAL UEP Wrapper (Thirty-Minute-Rule Agent)', { error });
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
    console.log('✅ Thirty-Minute-Rule Agent unregistered via REAL UEP');
  }
}