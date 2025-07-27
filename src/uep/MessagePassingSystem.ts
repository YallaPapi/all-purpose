/**
 * UEP Message Passing System
 * 
 * Implements the standardized message passing subsystem that enables 
 * agent-to-agent communication using a standardized JSON schema.
 * 
 * Task 31.1: Design Message Passing System with Standardized JSON Schema
 */

import { EventEmitter } from 'events';

// Message Types
export type MessageType = 
  | 'task.request'
  | 'task.response' 
  | 'task.status'
  | 'agent.heartbeat'
  | 'agent.ready'
  | 'agent.error'
  | 'context.share'
  | 'context.request'
  | 'system.broadcast';

// Message Priority Levels
export type MessagePriority = 'low' | 'medium' | 'high' | 'urgent';

// Message Status
export type MessageStatus = 'pending' | 'delivered' | 'acknowledged' | 'failed' | 'expired';

// Standardized Message Schema
export interface UEPMessage {
  // Core message identification
  id: string;
  type: MessageType;
  timestamp: number;
  
  // Routing information
  from: string;           // Source agent ID
  to: string | string[];  // Target agent ID(s) or 'broadcast'
  
  // Message metadata
  priority: MessagePriority;
  status: MessageStatus;
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

// Message Delivery Result
export interface MessageDeliveryResult {
  messageId: string;
  delivered: boolean;
  deliveredAt: number;
  acknowledgedAt?: number;
  error?: string;
  retryCount: number;
}

// Agent Registration Info
export interface AgentRegistration {
  agentId: string;
  agentType: string;
  capabilities: string[];
  subscribedMessageTypes: MessageType[];
  lastHeartbeat: number;
  status: 'online' | 'offline' | 'busy';
}

/**
 * Message Queue Interface
 */
export interface IMessageQueue {
  publish(message: UEPMessage): Promise<void>;
  subscribe(agentId: string, callback: (message: UEPMessage) => Promise<void>): Promise<void>;
  unsubscribe(agentId: string): Promise<void>;
  getQueueSize(agentId: string): Promise<number>;
}

/**
 * Redis-based Message Queue Implementation
 */
export class RedisMessageQueue implements IMessageQueue {
  private redis: any;
  private subscribers: Map<string, (message: UEPMessage) => Promise<void>> = new Map();

  constructor() {
    // Initialize Redis connection using environment variables
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { Redis } = require('@upstash/redis');
      this.redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    }
  }

  async publish(message: UEPMessage): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not configured for message queue');
    }

    const targets = Array.isArray(message.to) ? message.to : [message.to];
    
    for (const target of targets) {
      const queueKey = target === 'broadcast' ? 'uep:broadcast:queue' : `uep:agent:${target}:queue`;
      await this.redis.lpush(queueKey, JSON.stringify(message));
      
      // Set message expiration if timeout specified
      if (message.options.timeout) {
        const expirationKey = `uep:message:${message.id}:expiry`;
        await this.redis.setex(expirationKey, Math.ceil(message.options.timeout / 1000), '1');
      }
    }
  }

  async subscribe(agentId: string, callback: (message: UEPMessage) => Promise<void>): Promise<void> {
    this.subscribers.set(agentId, callback);
    
    // Start polling for messages
    this.pollMessages(agentId);
  }

  async unsubscribe(agentId: string): Promise<void> {
    this.subscribers.delete(agentId);
  }

  async getQueueSize(agentId: string): Promise<number> {
    if (!this.redis) return 0;
    
    const queueKey = `uep:agent:${agentId}:queue`;
    return await this.redis.llen(queueKey);
  }

  private async pollMessages(agentId: string): Promise<void> {
    const callback = this.subscribers.get(agentId);
    if (!callback || !this.redis) return;

    try {
      const queueKey = `uep:agent:${agentId}:queue`;
      const broadcastKey = 'uep:broadcast:queue';
      
      // Check both agent-specific queue and broadcast queue
      const [agentMessage, broadcastMessage] = await Promise.all([
        this.redis.rpop(queueKey),
        this.redis.rpop(broadcastKey)
      ]);

      const messages = [agentMessage, broadcastMessage].filter(Boolean);
      
      for (const messageStr of messages) {
        try {
          const message: UEPMessage = JSON.parse(messageStr);
          await callback(message);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      }
    } catch (error) {
      console.error(`Error polling messages for ${agentId}:`, error);
    }

    // Continue polling if still subscribed
    if (this.subscribers.has(agentId)) {
      setTimeout(() => this.pollMessages(agentId), 100); // Poll every 100ms
    }
  }
}

/**
 * In-Memory Message Queue (Fallback)
 */
export class InMemoryMessageQueue implements IMessageQueue {
  private queues: Map<string, UEPMessage[]> = new Map();
  private subscribers: Map<string, (message: UEPMessage) => Promise<void>> = new Map();

  async publish(message: UEPMessage): Promise<void> {
    const targets = Array.isArray(message.to) ? message.to : [message.to];
    
    for (const target of targets) {
      if (target === 'broadcast') {
        // Deliver to all subscribed agents
        for (const [agentId, callback] of this.subscribers) {
          try {
            await callback({ ...message, to: agentId });
          } catch (error) {
            console.error(`Error delivering broadcast message to ${agentId}:`, error);
          }
        }
      } else {
        // Add to specific agent queue
        if (!this.queues.has(target)) {
          this.queues.set(target, []);
        }
        this.queues.get(target)!.push(message);
        
        // Deliver immediately if agent is subscribed
        const callback = this.subscribers.get(target);
        if (callback) {
          try {
            await callback(message);
            // Remove from queue after successful delivery
            const queue = this.queues.get(target)!;
            const index = queue.indexOf(message);
            if (index > -1) {
              queue.splice(index, 1);
            }
          } catch (error) {
            console.error(`Error delivering message to ${target}:`, error);
          }
        }
      }
    }
  }

  async subscribe(agentId: string, callback: (message: UEPMessage) => Promise<void>): Promise<void> {
    this.subscribers.set(agentId, callback);
    
    // Deliver any queued messages
    const queue = this.queues.get(agentId);
    if (queue && queue.length > 0) {
      const messages = [...queue];
      queue.length = 0; // Clear queue
      
      for (const message of messages) {
        try {
          await callback(message);
        } catch (error) {
          console.error(`Error delivering queued message to ${agentId}:`, error);
        }
      }
    }
  }

  async unsubscribe(agentId: string): Promise<void> {
    this.subscribers.delete(agentId);
  }

  async getQueueSize(agentId: string): Promise<number> {
    return this.queues.get(agentId)?.length || 0;
  }
}

/**
 * UEP Message Passing System
 */
export class MessagePassingSystem extends EventEmitter {
  private messageQueue: IMessageQueue;
  private agents: Map<string, AgentRegistration> = new Map();
  private pendingMessages: Map<string, UEPMessage> = new Map();
  private messageTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(useRedis: boolean = true) {
    super();
    
    // Initialize message queue
    this.messageQueue = useRedis && this.isRedisConfigured() 
      ? new RedisMessageQueue() 
      : new InMemoryMessageQueue();
    
    // Start background tasks
    this.startHeartbeatMonitor();
    this.startMessageCleanup();
  }

  private isRedisConfigured(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  /**
   * Register an agent with the message passing system
   */
  async registerAgent(registration: Omit<AgentRegistration, 'lastHeartbeat' | 'status'>): Promise<void> {
    const agentReg: AgentRegistration = {
      ...registration,
      lastHeartbeat: Date.now(),
      status: 'online'
    };
    
    this.agents.set(registration.agentId, agentReg);
    
    // Subscribe to messages for this agent
    await this.messageQueue.subscribe(registration.agentId, async (message) => {
      await this.processIncomingMessage(message);
    });
    
    this.emit('agent.registered', agentReg);
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'offline';
      await this.messageQueue.unsubscribe(agentId);
      this.agents.delete(agentId);
      this.emit('agent.unregistered', { agentId });
    }
  }

  /**
   * Send a message through the system
   */
  async sendMessage(messageData: Partial<UEPMessage>): Promise<MessageDeliveryResult> {
    // Generate message with defaults
    const message: UEPMessage = {
      id: this.generateMessageId(),
      type: messageData.type || 'task.request',
      timestamp: Date.now(),
      from: messageData.from!,
      to: messageData.to!,
      priority: messageData.priority || 'medium',
      status: 'pending',
      correlationId: messageData.correlationId,
      parentMessageId: messageData.parentMessageId,
      payload: messageData.payload || {},
      options: {
        timeout: 30000, // 30 second default timeout
        retryCount: 3,
        requireAcknowledgment: false,
        persistent: false,
        broadcast: false,
        ...messageData.options
      },
      metadata: {
        retryAttempts: 0,
        route: [messageData.from!]
      }
    };

    // Validate message
    this.validateMessage(message);
    
    // Store pending message
    this.pendingMessages.set(message.id, message);
    
    // Set timeout if specified
    if (message.options.timeout) {
      const timeout = setTimeout(() => {
        this.handleMessageTimeout(message.id);
      }, message.options.timeout);
      this.messageTimeouts.set(message.id, timeout);
    }
    
    try {
      // Publish to message queue
      await this.messageQueue.publish(message);
      
      message.status = 'delivered';
      message.metadata.deliveredAt = Date.now();
      
      this.emit('message.sent', message);
      
      return {
        messageId: message.id,
        delivered: true,
        deliveredAt: message.metadata.deliveredAt,
        retryCount: message.metadata.retryAttempts,
        error: undefined
      };
      
    } catch (error) {
      message.status = 'failed';
      
      this.emit('message.failed', { message, error });
      
      return {
        messageId: message.id,
        delivered: false,
        deliveredAt: Date.now(),
        retryCount: message.metadata.retryAttempts,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process incoming message
   */
  private async processIncomingMessage(message: UEPMessage): Promise<void> {
    try {
      // Update message route
      if (typeof message.to === 'string') {
        message.metadata.route = message.metadata.route || [];
        message.metadata.route.push(message.to);
      }
      
      // Emit message received event
      this.emit('message.received', message);
      
      // Handle acknowledgment if required
      if (message.options.requireAcknowledgment) {
        await this.sendAcknowledgment(message);
      }
      
      // Process based on message type
      switch (message.type) {
        case 'agent.heartbeat':
          await this.handleHeartbeat(message);
          break;
          
        case 'task.request':
        case 'task.response':
        case 'task.status':
          this.emit('task.message', message);
          break;
          
        case 'context.share':
        case 'context.request':
          this.emit('context.message', message);
          break;
          
        case 'system.broadcast':
          this.emit('system.message', message);
          break;
          
        default:
          this.emit('message.unknown', message);
      }
      
    } catch (error) {
      this.emit('message.error', { message, error });
    }
  }

  /**
   * Send acknowledgment for a message
   */
  private async sendAcknowledgment(originalMessage: UEPMessage): Promise<void> {
    const ackMessage: Partial<UEPMessage> = {
      type: 'task.response',
      from: typeof originalMessage.to === 'string' ? originalMessage.to : 'system',
      to: originalMessage.from,
      correlationId: originalMessage.id,
      parentMessageId: originalMessage.id,
      payload: { acknowledged: true },
      options: { requireAcknowledgment: false }
    };
    
    await this.sendMessage(ackMessage);
  }

  /**
   * Handle agent heartbeat
   */
  private async handleHeartbeat(message: UEPMessage): Promise<void> {
    const agent = this.agents.get(message.from);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      agent.status = 'online';
      this.emit('agent.heartbeat', { agentId: message.from, timestamp: agent.lastHeartbeat });
    }
  }

  /**
   * Handle message timeout
   */
  private handleMessageTimeout(messageId: string): void {
    const message = this.pendingMessages.get(messageId);
    if (message && message.status === 'pending') {
      message.status = 'expired';
      this.emit('message.timeout', message);
      this.cleanupMessage(messageId);
    }
  }

  /**
   * Validate message format
   */
  private validateMessage(message: UEPMessage): void {
    if (!message.id) throw new Error('Message ID is required');
    if (!message.from) throw new Error('Message sender is required');
    if (!message.to) throw new Error('Message recipient is required');
    if (!message.type) throw new Error('Message type is required');
    if (!message.payload) message.payload = {};
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitor(): void {
    setInterval(() => {
      const now = Date.now();
      const heartbeatTimeout = 60000; // 60 seconds
      
      for (const [agentId, agent] of this.agents) {
        if (now - agent.lastHeartbeat > heartbeatTimeout && agent.status === 'online') {
          agent.status = 'offline';
          this.emit('agent.offline', { agentId, lastHeartbeat: agent.lastHeartbeat });
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start message cleanup
   */
  private startMessageCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 300000; // 5 minutes
      
      for (const [messageId, message] of this.pendingMessages) {
        if (now - message.timestamp > maxAge) {
          this.cleanupMessage(messageId);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Cleanup message resources
   */
  private cleanupMessage(messageId: string): void {
    this.pendingMessages.delete(messageId);
    
    const timeout = this.messageTimeouts.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
      this.messageTimeouts.delete(messageId);
    }
  }

  /**
   * Get system statistics
   */
  getStatistics() {
    return {
      totalAgents: this.agents.size,
      onlineAgents: Array.from(this.agents.values()).filter(a => a.status === 'online').length,
      pendingMessages: this.pendingMessages.size,
      messageQueueType: this.messageQueue.constructor.name,
      uptime: process.uptime()
    };
  }

  /**
   * Get agent list
   */
  getAgents(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get pending messages
   */
  getPendingMessages(): UEPMessage[] {
    return Array.from(this.pendingMessages.values());
  }
}

// Export message passing system factory
export function createMessagePassingSystem(useRedis: boolean = true): MessagePassingSystem {
  return new MessagePassingSystem(useRedis);
}

export default MessagePassingSystem;