/**
 * NATS Event Bus Implementation
 * 
 * Provides real NATS integration for meta-agent communication
 * Replaces the stub EventBus with actual NATS JetStream functionality
 */

import { connect, NatsConnection, JetStreamClient, JetStreamManager, JsMsg, PubAck } from 'nats';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger.js';

export interface NATSEventBusConfig {
  servers: string[];
  user?: string;
  pass?: string;
  namespace?: string;
  jetstream?: {
    domain?: string;
    timeout?: number;
  };
}

export interface Subscription {
  id: string;
  subject: string;
  unsubscribe: () => Promise<void>;
}

export class NATSEventBus extends EventEmitter {
  private config: NATSEventBusConfig;
  private connection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private logger: Logger;
  private subscriptions = new Map<string, any>();
  private connected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor(config: NATSEventBusConfig) {
    super();
    this.config = {
      namespace: 'meta-agent',
      ...config
    };
    this.logger = new Logger('NATSEventBus');
  }

  /**
   * Connect to NATS server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      this.logger.warn('Already connected to NATS');
      return;
    }

    try {
      this.logger.info('Connecting to NATS servers:', this.config.servers);

      // Connect to NATS
      this.connection = await connect({
        servers: this.config.servers,
        user: this.config.user,
        pass: this.config.pass,
        reconnect: true,
        maxReconnectAttempts: this.maxReconnectAttempts,
        reconnectTimeWait: 2000,
        timeout: 10000,
      });

      // Setup connection handlers
      this.setupConnectionHandlers();

      // Initialize JetStream
      this.jetstream = this.connection.jetstream({
        domain: this.config.jetstream?.domain,
        timeout: this.config.jetstream?.timeout || 5000,
      });

      this.jsm = await this.connection.jetstreamManager({
        domain: this.config.jetstream?.domain,
        timeout: this.config.jetstream?.timeout || 5000,
      });

      // Create default streams
      await this.createDefaultStreams();

      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      this.logger.info('Successfully connected to NATS');

    } catch (error) {
      this.logger.error('Failed to connect to NATS:', error);
      this.emit('error', error);
      throw new Error(`Failed to connect to NATS: ${error.message}`);
    }
  }

  /**
   * Disconnect from NATS
   */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.connection) {
      return;
    }

    try {
      this.logger.info('Disconnecting from NATS...');

      // Unsubscribe all
      for (const [id, sub] of this.subscriptions) {
        try {
          await sub.unsubscribe();
        } catch (error) {
          this.logger.warn(`Failed to unsubscribe ${id}:`, error);
        }
      }
      this.subscriptions.clear();

      // Drain and close connection
      await this.connection.drain();
      await this.connection.close();

      this.connection = null;
      this.jetstream = null;
      this.jsm = null;
      this.connected = false;

      this.emit('disconnected');
      this.logger.info('Disconnected from NATS');

    } catch (error) {
      this.logger.error('Error during disconnect:', error);
      throw error;
    }
  }

  /**
   * Publish a message to a subject
   */
  async publish(subject: string, data: any): Promise<PubAck | void> {
    if (!this.connected || !this.jetstream) {
      throw new Error('Not connected to NATS');
    }

    try {
      const fullSubject = this.buildSubject(subject);
      const message = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        data,
        metadata: {
          source: 'meta-agent-factory',
          version: '1.0.0'
        }
      };

      const payload = JSON.stringify(message);
      
      this.logger.debug(`Publishing to ${fullSubject}:`, data);
      
      const ack = await this.jetstream.publish(fullSubject, payload, {
        msgID: message.id,
        timeout: 5000
      });

      this.emit('message:published', { subject: fullSubject, messageId: message.id });
      
      return ack;

    } catch (error) {
      this.logger.error(`Failed to publish to ${subject}:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Subscribe to a subject
   */
  async subscribe(subject: string, handler: (message: any) => Promise<void> | void): Promise<Subscription> {
    if (!this.connected || !this.jetstream) {
      throw new Error('Not connected to NATS');
    }

    try {
      const fullSubject = this.buildSubject(subject);
      const subscriptionId = this.generateId();

      this.logger.info(`Subscribing to ${fullSubject}`);

      // Create consumer configuration
      const consumerOpts = {
        durable_name: `consumer-${subscriptionId}`,
        deliver_policy: 'new',
        ack_policy: 'explicit',
        ack_wait: 30000000000, // 30 seconds in nanoseconds
        max_deliver: 3,
        filter_subject: fullSubject
      };

      // Get the appropriate stream
      const streamName = this.getStreamForSubject(fullSubject);
      
      // Create consumer
      const consumer = await this.jetstream.consumers.get(streamName, consumerOpts);
      
      // Start consuming messages
      const messages = await consumer.consume({
        max_messages: 100,
        expires: 30000,
      });

      // Process messages
      this.processMessages(messages, handler, subscriptionId);

      // Store subscription
      const subscription = {
        id: subscriptionId,
        subject: fullSubject,
        consumer,
        messages,
        unsubscribe: async () => {
          try {
            // Stop consuming
            messages.stop();
            // Delete consumer
            await this.jsm?.consumers.delete(streamName, consumerOpts.durable_name);
            this.subscriptions.delete(subscriptionId);
            this.logger.info(`Unsubscribed from ${fullSubject}`);
          } catch (error) {
            this.logger.error(`Failed to unsubscribe from ${fullSubject}:`, error);
            throw error;
          }
        }
      };

      this.subscriptions.set(subscriptionId, subscription);
      this.emit('subscription:created', { subject: fullSubject, id: subscriptionId });

      return {
        id: subscriptionId,
        subject: fullSubject,
        unsubscribe: subscription.unsubscribe
      };

    } catch (error) {
      this.logger.error(`Failed to subscribe to ${subject}:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Request-reply pattern
   */
  async request(subject: string, data: any, timeout: number = 5000): Promise<any> {
    if (!this.connected || !this.connection) {
      throw new Error('Not connected to NATS');
    }

    return new Promise((resolve, reject) => {
      const fullSubject = this.buildSubject(subject);
      const correlationId = this.generateId();
      const replySubject = `_INBOX.${correlationId}`;

      // Setup reply subscription
      const subscription = this.connection!.subscribe(replySubject, {
        max: 1,
        timeout,
      });

      (async () => {
        try {
          for await (const msg of subscription) {
            try {
              const response = JSON.parse(msg.data.toString());
              resolve(response.data);
            } catch (parseError) {
              reject(new Error(`Failed to parse response: ${parseError.message}`));
            }
            break;
          }
        } catch (error) {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }
      })();

      // Send request
      const message = {
        id: correlationId,
        timestamp: new Date().toISOString(),
        data,
        replyTo: replySubject
      };

      this.connection!.publish(fullSubject, JSON.stringify(message));
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.connection !== null && !this.connection.isClosed();
  }

  /**
   * Get connection stats
   */
  getStats() {
    if (!this.connection) {
      return null;
    }

    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
      stats: this.connection.stats()
    };
  }

  /**
   * Private helper methods
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.closed().then(() => {
      this.connected = false;
      this.logger.warn('NATS connection closed');
      this.emit('disconnected');
    });

    (async () => {
      for await (const status of this.connection!.status()) {
        switch (status.type) {
          case 'reconnecting':
            this.reconnectAttempts++;
            this.logger.warn(`Reconnecting to NATS (attempt ${this.reconnectAttempts})`);
            this.emit('reconnecting', this.reconnectAttempts);
            break;
          case 'reconnect':
            this.logger.info('Reconnected to NATS');
            this.emit('reconnected');
            break;
          case 'disconnect':
            this.logger.warn('Disconnected from NATS');
            this.emit('disconnected');
            break;
          case 'error':
            this.logger.error('NATS connection error:', status.data);
            this.emit('error', status.data);
            break;
        }
      }
    })();
  }

  private async createDefaultStreams(): Promise<void> {
    if (!this.jsm) return;

    const streams = [
      {
        name: 'META_AGENT_EVENTS',
        subjects: [`${this.config.namespace}.event.>`],
        retention: 'limits',
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days
        storage: 'file',
        replicas: 1
      },
      {
        name: 'META_AGENT_COMMANDS',
        subjects: [`${this.config.namespace}.command.>`],
        retention: 'workqueue',
        max_age: 24 * 60 * 60 * 1000000000, // 24 hours
        storage: 'file',
        replicas: 1
      },
      {
        name: 'FACTORY_COORDINATION',
        subjects: [`factory.>`],
        retention: 'limits',
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days
        storage: 'file',
        replicas: 1
      }
    ];

    for (const streamConfig of streams) {
      try {
        await this.jsm.streams.info(streamConfig.name);
        this.logger.debug(`Stream ${streamConfig.name} already exists`);
      } catch (error) {
        // Stream doesn't exist, create it
        try {
          await this.jsm.streams.add(streamConfig);
          this.logger.info(`Created stream: ${streamConfig.name}`);
        } catch (createError) {
          this.logger.error(`Failed to create stream ${streamConfig.name}:`, createError);
        }
      }
    }
  }

  private buildSubject(subject: string): string {
    // If subject already has namespace, return as is
    if (subject.startsWith(this.config.namespace!)) {
      return subject;
    }
    
    // Add namespace prefix
    return `${this.config.namespace}.${subject}`;
  }

  private getStreamForSubject(subject: string): string {
    if (subject.includes('.event.')) {
      return 'META_AGENT_EVENTS';
    } else if (subject.includes('.command.')) {
      return 'META_AGENT_COMMANDS';
    } else if (subject.startsWith('factory.')) {
      return 'FACTORY_COORDINATION';
    }
    
    // Default to events stream
    return 'META_AGENT_EVENTS';
  }

  private async processMessages(
    messages: any,
    handler: (message: any) => Promise<void> | void,
    subscriptionId: string
  ): Promise<void> {
    (async () => {
      try {
        for await (const jsMsg of messages) {
          try {
            const message = JSON.parse(jsMsg.data.toString());
            
            this.logger.debug(`Received message on subscription ${subscriptionId}:`, message);
            
            // Call handler with message data
            await handler(message.data);
            
            // Acknowledge message
            jsMsg.ack();
            
            this.emit('message:processed', { 
              subscriptionId,
              messageId: message.id,
              subject: jsMsg.subject 
            });
            
          } catch (error) {
            this.logger.error(`Error processing message:`, error);
            
            // NAK the message for redelivery
            jsMsg.nak();
            
            this.emit('message:error', { 
              subscriptionId,
              error,
              subject: jsMsg.subject 
            });
          }
        }
      } catch (error) {
        this.logger.error(`Subscription ${subscriptionId} error:`, error);
        this.emit('subscription:error', { subscriptionId, error });
      }
    })();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory function for creating EventBus with NATS
export function createNATSEventBus(config: NATSEventBusConfig): NATSEventBus {
  return new NATSEventBus(config);
}