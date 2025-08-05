/**
 * REAL UEP (Universal Execution Protocol) Wrapper for PRD-Parser Agent
 * 
 * CYCLE 1 UEP INTEGRATION - PRD PARSER
 * 
 * Uses the REAL UEP message format from MessagePassingSystem.ts
 * Implements NATS-based communication instead of HTTP endpoints
 * 
 * NO FAKE SHIT: This is the production-ready UEP integration for PRD-Parser Agent
 */

import { EventEmitter } from 'events';
import { connect } from 'nats';
import { v4 as uuidv4 } from 'uuid';

// REAL UEP Message Types from MessagePassingSystem.ts
const UEPMessageTypes = {
  TASK_REQUEST: 'task.request',
  TASK_RESPONSE: 'task.response', 
  TASK_STATUS: 'task.status',
  AGENT_HEARTBEAT: 'agent.heartbeat',
  AGENT_READY: 'agent.ready',
  AGENT_ERROR: 'agent.error',
  CONTEXT_SHARE: 'context.share',
  CONTEXT_REQUEST: 'context.request',
  SYSTEM_BROADCAST: 'system.broadcast'
};

/**
 * REAL UEP Wrapper using actual UEP specification and NATS transport for PRD-Parser Agent
 */
export class RealUEPWrapper extends EventEmitter {
  constructor(config) {
    super();
    
    this.config = {
      agentId: config.agentId || 'prd-parser-agent',
      agentType: config.agentType || 'infrastructure',
      capabilities: config.capabilities || this.getDefaultCapabilities(),
      natsUrl: config.natsUrl || process.env.NATS_URL || 'nats://localhost:4222',
      enableRealTimeUpdates: config.enableRealTimeUpdates !== false,
      enableTaskDistribution: config.enableTaskDistribution !== false,
      ...config
    };
    
    this.natsConnection = null;
    this.isInitialized = false;
    this.sessionId = uuidv4();
    this.activeMessages = new Map();
    
    console.log(`🔗 REAL UEP Wrapper (PRD-Parser Agent) created with config:`, {
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      natsUrl: this.config.natsUrl,
      sessionId: this.sessionId
    });
  }

  /**
   * Initialize REAL UEP wrapper with NATS connection
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ REAL UEP Wrapper (PRD-Parser) already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing REAL UEP Wrapper (PRD-Parser Agent)...');
      
      // Connect to NATS server
      this.natsConnection = await connect({ 
        servers: this.config.natsUrl,
        name: `${this.config.agentId}-${this.sessionId}`,
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000
      });
      
      console.log(`✅ NATS connection established for PRD-Parser Agent: ${this.config.natsUrl}`);
      
      // Set up message subscriptions
      await this.setupSubscriptions();
      
      // Send agent ready signal
      await this.sendAgentReady();
      
      this.isInitialized = true;
      console.log('🎉 REAL UEP Wrapper (PRD-Parser Agent) initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize REAL UEP Wrapper (PRD-Parser):', error);
      throw error;
    }
  }

  /**
   * Setup NATS subscriptions for UEP message handling
   */
  async setupSubscriptions() {
    if (!this.natsConnection) {
      throw new Error('NATS connection not available');
    }

    try {
      // Subscribe to direct messages for this agent
      const directSubject = `uep.agent.${this.config.agentId}`;
      const directSub = this.natsConnection.subscribe(directSubject);
      
      console.log(`📡 PRD-Parser Agent subscribed to: ${directSubject}`);
      
      // Process direct messages
      (async () => {
        for await (const msg of directSub) {
          try {
            const uepMessage = JSON.parse(new TextDecoder().decode(msg.data));
            await this.handleIncomingMessage(uepMessage, msg);
          } catch (error) {
            console.error('❌ Error processing direct message:', error);
          }
        }
      })();

      // Subscribe to broadcast messages
      const broadcastSubject = 'uep.broadcast';
      const broadcastSub = this.natsConnection.subscribe(broadcastSubject);
      
      console.log(`📡 PRD-Parser Agent subscribed to broadcasts: ${broadcastSubject}`);
      
      // Process broadcast messages
      (async () => {
        for await (const msg of broadcastSub) {
          try {
            const uepMessage = JSON.parse(new TextDecoder().decode(msg.data));
            if (uepMessage.from !== this.config.agentId) {
              await this.handleIncomingMessage(uepMessage, msg);
            }
          } catch (error) {
            console.error('❌ Error processing broadcast message:', error);
          }
        }
      })();

      // Subscribe to PRD processing requests
      const prdSubject = 'uep.prd.process';
      const prdSub = this.natsConnection.subscribe(prdSubject);
      
      console.log(`📡 PRD-Parser Agent subscribed to PRD requests: ${prdSubject}`);
      
      // Process PRD requests
      (async () => {
        for await (const msg of prdSub) {
          try {
            const uepMessage = JSON.parse(new TextDecoder().decode(msg.data));
            this.emit('prd-request', uepMessage);
          } catch (error) {
            console.error('❌ Error processing PRD request:', error);
          }
        }
      })();

    } catch (error) {
      console.error('❌ Failed to setup subscriptions:', error);
      throw error;
    }
  }

  /**
   * Handle incoming UEP messages
   */
  async handleIncomingMessage(uepMessage, natsMsg) {
    console.log(`📥 PRD-Parser Agent received UEP message:`, {
      id: uepMessage.id,
      type: uepMessage.type,
      from: uepMessage.from,
      timestamp: uepMessage.timestamp
    });

    try {
      // Update message status
      uepMessage.metadata = uepMessage.metadata || {};
      uepMessage.metadata.deliveredAt = Date.now();
      
      switch (uepMessage.type) {
        case UEPMessageTypes.TASK_REQUEST:
          this.emit('task-assigned', uepMessage.payload);
          break;
          
        case UEPMessageTypes.CONTEXT_REQUEST:
          await this.handleContextRequest(uepMessage, natsMsg);
          break;
          
        case UEPMessageTypes.AGENT_HEARTBEAT:
          await this.handleHeartbeat(uepMessage);
          break;
          
        case UEPMessageTypes.SYSTEM_BROADCAST:
          this.emit('system-broadcast', uepMessage.payload);
          break;
          
        default:
          console.log(`🔄 PRD-Parser Agent received message type: ${uepMessage.type}`);
          this.emit('message', uepMessage);
      }

      // Send acknowledgment if required
      if (uepMessage.options?.requireAcknowledgment && natsMsg.reply) {
        const ackMessage = this.createUEPMessage(
          UEPMessageTypes.TASK_STATUS,
          uepMessage.from,
          { status: 'acknowledged', originalMessageId: uepMessage.id },
          { correlationId: uepMessage.id }
        );
        
        natsMsg.respond(JSON.stringify(ackMessage));
      }

    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }

  /**
   * Send agent ready signal to UEP system
   */
  async sendAgentReady() {
    const readyMessage = this.createUEPMessage(
      UEPMessageTypes.AGENT_READY,
      'uep.registry',
      {
        agentId: this.config.agentId,
        agentType: this.config.agentType,
        capabilities: this.config.capabilities,
        status: 'ready',
        sessionId: this.sessionId
      }
    );

    await this.publishMessage('uep.registry.agent-ready', readyMessage);
    console.log('📤 PRD-Parser Agent ready signal sent');
  }

  /**
   * Send heartbeat to UEP system
   */
  async sendHeartbeat() {
    const heartbeatMessage = this.createUEPMessage(
      UEPMessageTypes.AGENT_HEARTBEAT,
      'uep.registry',
      {
        agentId: this.config.agentId,
        status: 'healthy',
        uptime: Date.now() - this.sessionId,
        activeMessages: this.activeMessages.size
      }
    );

    await this.publishMessage('uep.heartbeat', heartbeatMessage);
  }

  /**
   * Send PRD parsing result to requesting agent or system
   */
  async sendPRDResult(targetAgent, prdResult) {
    const resultMessage = this.createUEPMessage(
      UEPMessageTypes.TASK_RESPONSE,
      targetAgent,
      {
        type: 'prd-parsing-result',
        result: prdResult,
        timestamp: Date.now()
      }
    );

    const subject = targetAgent === 'broadcast' ? 'uep.broadcast' : `uep.agent.${targetAgent}`;
    await this.publishMessage(subject, resultMessage);
    
    console.log(`📤 PRD-Parser result sent to ${targetAgent}`);
  }

  /**
   * Send task result to UEP system
   */
  async sendTaskResult(task, result) {
    const resultMessage = this.createUEPMessage(
      UEPMessageTypes.TASK_RESPONSE,
      'uep.coordination',
      {
        taskId: task.id,
        agentId: this.config.agentId,
        result: result,
        timestamp: Date.now(),
        processingTime: result.processingTime || 0
      },
      { correlationId: task.id }
    );

    await this.publishMessage('uep.results', resultMessage);
    console.log(`📤 PRD-Parser task result sent for task: ${task.id}`);
  }

  /**
   * Broadcast PRD analysis to all interested agents
   */
  async broadcastPRDAnalysis(prdAnalysis) {
    const broadcastMessage = this.createUEPMessage(
      UEPMessageTypes.SYSTEM_BROADCAST,
      'broadcast',
      {
        type: 'prd-analysis',
        analysis: prdAnalysis,
        timestamp: Date.now(),
        sourceAgent: this.config.agentId
      }
    );

    await this.publishMessage('uep.broadcast', broadcastMessage);
    console.log('📤 PRD analysis broadcasted to all agents');
  }

  /**
   * Create UEP message with proper format
   */
  createUEPMessage(type, to, payload, options = {}) {
    return {
      // Core message identification
      id: uuidv4(),
      type: type,
      timestamp: Date.now(),
      
      // Routing information
      from: this.config.agentId,
      to: to,
      
      // Message metadata
      priority: options.priority || 'medium',
      status: 'pending',
      correlationId: options.correlationId,
      parentMessageId: options.parentMessageId,
      
      // Message content
      payload: payload,
      
      // Delivery and processing options
      options: {
        timeout: options.timeout || 30000,
        retryCount: options.retryCount || 3,
        requireAcknowledgment: options.requireAcknowledgment || false,
        persistent: options.persistent || true,
        broadcast: options.broadcast || false,
        ...options
      },
      
      // Processing metadata
      metadata: {
        retryAttempts: 0,
        route: [this.config.agentId]
      }
    };
  }

  /**
   * Publish message to NATS subject
   */
  async publishMessage(subject, message) {
    if (!this.natsConnection) {
      throw new Error('NATS connection not available');
    }

    try {
      const messageData = JSON.stringify(message);
      this.natsConnection.publish(subject, messageData);
      
      // Track active message
      this.activeMessages.set(message.id, message);
      
      // Clean up old messages (older than 5 minutes)
      setTimeout(() => {
        this.activeMessages.delete(message.id);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Error publishing message:', error);
      throw error;
    }
  }

  /**
   * Handle context requests from other agents
   */
  async handleContextRequest(uepMessage, natsMsg) {
    const contextResponse = {
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      capabilities: this.config.capabilities,
      status: 'ready',
      lastActivity: Date.now()
    };

    if (natsMsg.reply) {
      const responseMessage = this.createUEPMessage(
        UEPMessageTypes.CONTEXT_SHARE,
        uepMessage.from,
        contextResponse,
        { correlationId: uepMessage.id }
      );
      
      natsMsg.respond(JSON.stringify(responseMessage));
    }
  }

  /**
   * Handle heartbeat from other agents
   */
  async handleHeartbeat(uepMessage) {
    console.log(`💓 Heartbeat received from ${uepMessage.from}`);
    this.emit('agent-heartbeat', uepMessage.payload);
  }

  /**
   * Get default capabilities for PRD-Parser Agent
   */
  getDefaultCapabilities() {
    return {
      prdParsing: {
        requirementExtraction: true,
        taskGeneration: true,
        researchIntegration: true,
        contextIntegration: true,
        gitIntegration: true
      },
      formats: {
        markdown: true,
        json: true,
        yaml: true
      },
      analysis: {
        complexityAnalysis: true,
        dependencyMapping: true,
        riskAssessment: true,
        effortEstimation: true
      },
      integration: {
        taskMaster: true,
        context7: true,
        git: true,
        memory: true
      }
    };
  }

  /**
   * Get current agent status
   */
  getStatus() {
    return {
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      initialized: this.isInitialized,
      sessionId: this.sessionId,
      natsConnected: !!this.natsConnection,
      activeMessages: this.activeMessages.size,
      capabilities: this.config.capabilities
    };
  }

  /**
   * Shutdown REAL UEP wrapper
   */
  async shutdown() {
    console.log('🛑 Shutting down REAL UEP Wrapper (PRD-Parser Agent)...');
    
    try {
      // Send agent offline signal
      if (this.natsConnection && this.isInitialized) {
        const offlineMessage = this.createUEPMessage(
          UEPMessageTypes.AGENT_ERROR,
          'uep.registry',
          {
            agentId: this.config.agentId,
            status: 'offline',
            reason: 'shutdown'
          }
        );
        
        await this.publishMessage('uep.registry.agent-offline', offlineMessage);
      }
      
      // Close NATS connection
      if (this.natsConnection) {
        await this.natsConnection.close();
        this.natsConnection = null;
      }
      
      // Clear active messages
      this.activeMessages.clear();
      
      this.isInitialized = false;
      console.log('✅ REAL UEP Wrapper (PRD-Parser Agent) shut down successfully');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}

export default RealUEPWrapper;