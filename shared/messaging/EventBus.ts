import { connect, NatsConnection, JSONCodec, JetStreamClient, JetStreamManager, Subscription, RetentionPolicy, StorageType, DiscardPolicy, DeliverPolicy, AckPolicy } from 'nats';
import { EventEmitter } from 'events';

export interface EventMessage {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  data: any;
  correlationId?: string;
  replyTo?: string;
}

export interface EventHandler {
  (message: EventMessage): Promise<void> | void;
}

export class EventBus extends EventEmitter {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private jc = JSONCodec();
  private subscriptions: Map<string, Subscription> = new Map();
  private isConnected = false;

  constructor(
    private natsUrl: string = 'nats://nats-broker:4222',
    private credentials?: { user: string; pass: string }
  ) {
    super();
  }

  async connect(): Promise<void> {
    try {
      this.nc = await connect({
        servers: [this.natsUrl],
        user: this.credentials?.user || 'factory',
        pass: this.credentials?.pass || 'factory-secret',
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectTimeWait: 2000
      });

      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();
      
      // Create required JetStream streams before any consumers
      await this.ensureStreamsExist();
      
      this.isConnected = true;

      this.nc.closed().then(() => {
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.emit('connected');
      console.log('✅ EventBus connected to NATS with streams initialized');
    } catch (error) {
      console.error('❌ EventBus connection failed:', error);
      throw error;
    }
  }

  /**
   * Ensure all required JetStream streams exist before creating consumers
   */
  private async ensureStreamsExist(): Promise<void> {
    if (!this.jsm) {
      throw new Error('JetStreamManager not initialized');
    }

    const streams = [
      {
        name: 'META_AGENT_EVENTS',
        config: {
          name: 'META_AGENT_EVENTS',
          subjects: ['meta.agent.>'],
          storage: StorageType.File,
          retention: RetentionPolicy.Limits,
          max_consumers: 100,
          max_msgs: 10000,
          max_bytes: 100 * 1024 * 1024, // 100MB
          max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
          discard: DiscardPolicy.Old,
          duplicate_window: 120000000000 // 2 minutes in nanoseconds
        }
      },
      {
        name: 'DOMAIN_AGENT_EVENTS',
        config: {
          name: 'DOMAIN_AGENT_EVENTS',
          subjects: ['domain.>'],
          storage: StorageType.File,
          retention: RetentionPolicy.Limits,
          max_consumers: 100,
          max_msgs: 10000,
          max_bytes: 100 * 1024 * 1024, // 100MB
          max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
          discard: DiscardPolicy.Old,
          duplicate_window: 120000000000 // 2 minutes in nanoseconds
        }
      },
      {
        name: 'FACTORY_COORDINATION',
        config: {
          name: 'FACTORY_COORDINATION',
          subjects: ['factory.>'],
          storage: StorageType.File,
          retention: RetentionPolicy.Limits,
          max_consumers: 50,
          max_msgs: 5000,
          max_bytes: 50 * 1024 * 1024, // 50MB
          max_age: 12 * 60 * 60 * 1000000000, // 12 hours in nanoseconds
          discard: DiscardPolicy.Old,
          duplicate_window: 120000000000 // 2 minutes in nanoseconds
        }
      },
      {
        name: 'SYSTEM_METRICS',
        config: {
          name: 'SYSTEM_METRICS',
          subjects: ['metrics.>'],
          storage: StorageType.File,
          retention: RetentionPolicy.Limits,
          max_consumers: 20,
          max_msgs: 20000,
          max_bytes: 200 * 1024 * 1024, // 200MB
          max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
          discard: DiscardPolicy.Old,
          duplicate_window: 300000000000 // 5 minutes in nanoseconds
        }
      }
    ];

    for (const stream of streams) {
      try {
        // Check if stream already exists
        await this.jsm.streams.info(stream.name);
        console.log(`✅ Stream ${stream.name} already exists`);
      } catch (error) {
        // Stream doesn't exist, create it
        try {
          await this.jsm.streams.add(stream.config);
          console.log(`✅ Created stream ${stream.name}`);
        } catch (createError) {
          console.error(`❌ Failed to create stream ${stream.name}:`, createError);
          throw createError;
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      // Close all subscriptions
      for (const [topic, messages] of this.subscriptions) {
        try {
          messages.stop();
        } catch (error) {
          console.warn(`Warning: Failed to stop consumer for ${topic}:`, error);
        }
      }
      this.subscriptions.clear();

      await this.nc.close();
      this.nc = null;
      this.js = null;
      this.jsm = null;
      this.isConnected = false;
      this.emit('disconnected');
      console.log('✅ EventBus disconnected from NATS');
    }
  }

  async publish(
    subject: string,
    data: any,
    options?: {
      correlationId?: string;
      replyTo?: string;
      source?: string;
    }
  ): Promise<void> {
    if (!this.js || !this.isConnected) {
      throw new Error('EventBus not connected');
    }

    const message: EventMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: subject,
      source: options?.source || 'unknown',
      timestamp: new Date().toISOString(),
      data,
      correlationId: options?.correlationId,
      replyTo: options?.replyTo
    };

    try {
      await this.js.publish(subject, this.jc.encode(message));
      this.emit('published', { subject, message });
    } catch (error) {
      console.error(`❌ Failed to publish to ${subject}:`, error);
      throw error;
    }
  }

  async subscribe(
    subject: string,
    handler: EventHandler,
    options?: {
      queue?: string;
      durable?: string;
      deliverPolicy?: 'all' | 'last' | 'new' | 'by_start_time' | 'by_start_sequence';
    }
  ): Promise<void> {
    if (!this.js || !this.jsm || !this.isConnected) {
      throw new Error('EventBus not connected');
    }

    try {
      // Determine stream based on subject
      let streamName = 'META_AGENT_EVENTS';
      if (subject.startsWith('meta.agent')) {
        streamName = 'META_AGENT_EVENTS';
      } else if (subject.startsWith('domain.')) {
        streamName = 'DOMAIN_AGENT_EVENTS';
      } else if (subject.startsWith('factory.')) {
        streamName = 'FACTORY_COORDINATION';
      } else if (subject.startsWith('metrics.')) {
        streamName = 'SYSTEM_METRICS';
      }

      // Create consumer configuration using proper NATS format
      const consumerConfig = {
        durable_name: options?.durable || `consumer-${subject.replace(/\./g, '-')}-${Date.now()}`,
        deliver_policy: options?.deliverPolicy || DeliverPolicy.All,
        ack_policy: AckPolicy.Explicit,
        ack_wait: 30000000000, // 30 seconds in nanoseconds
        max_deliver: 3,
        filterSubject: subject
      };

      // Ensure the stream exists before creating consumer
      try {
        await this.jsm.streams.info(streamName);
      } catch (streamError) {
        throw new Error(`Stream ${streamName} does not exist. Stream creation may have failed during initialization.`);
      }

      // Create the consumer first using JetStreamManager with proper nesting
      let consumerInfo;
      try {
        consumerInfo = await this.jsm.consumers.add(streamName, {
          config: consumerConfig  // Nest config under 'config' property (NATS 2.29.3 requirement)
        });
        console.log(`✅ Created consumer ${consumerName} for stream ${streamName}`);
      } catch (consumerError: any) {
        if (consumerError.message?.includes('10014') || consumerError.message?.includes('consumer not found')) {
          // Consumer might already exist, try to get info
          try {
            consumerInfo = await this.jsm.consumers.info(streamName, consumerName);
            console.log(`ℹ️ Using existing consumer ${consumerName} for stream ${streamName}`);
          } catch (infoError) {
            throw new Error(`Failed to create or retrieve consumer ${consumerName}: ${consumerError.message}`);
          }
        } else {
          throw consumerError;
        }
      }
      
      // Now get the consumer using correct NATS 2.29.3 API (consumer name only)
      const consumer = await this.js.consumers.get(streamName, consumerName);

      // Start consuming messages
      const messages = await consumer.consume({
        max_messages: 100,
        expires: 30000
      });

      this.subscriptions.set(subject, messages);

      // Process messages
      (async () => {
        for await (const m of messages) {
          try {
            const message: EventMessage = this.jc.decode(m.data);
            await handler(message);
            m.ack();
            this.emit('messageProcessed', { subject, message });
          } catch (error) {
            console.error(`❌ Error processing message from ${subject}:`, error);
            m.nak();
            this.emit('messageError', { subject, error });
          }
        }
      })();

      this.emit('subscribed', { subject, options });
      console.log(`✅ Subscribed to ${subject} on stream ${streamName}`);
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${subject}:`, error);
      throw error;
    }
  }

  async unsubscribe(subject: string): Promise<void> {
    const messages = this.subscriptions.get(subject);
    if (messages) {
      messages.stop();
      this.subscriptions.delete(subject);
      this.emit('unsubscribed', { subject });
      console.log(`✅ Unsubscribed from ${subject}`);
    }
  }

  async request(
    subject: string,
    data: any,
    timeout: number = 30000,
    options?: {
      correlationId?: string;
      source?: string;
    }
  ): Promise<EventMessage> {
    if (!this.nc || !this.isConnected) {
      throw new Error('EventBus not connected');
    }

    const message: EventMessage = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: subject,
      source: options?.source || 'unknown',
      timestamp: new Date().toISOString(),
      data,
      correlationId: options?.correlationId
    };

    try {
      const response = await this.nc.request(
        subject,
        this.jc.encode(message),
        { timeout }
      );
      
      const responseMessage: EventMessage = this.jc.decode(response.data);
      this.emit('responseReceived', { subject, request: message, response: responseMessage });
      return responseMessage;
    } catch (error) {
      console.error(`❌ Request to ${subject} failed:`, error);
      throw error;
    }
  }

  isConnected_(): boolean {
    return this.isConnected;
  }

  getConnectionStatus(): {
    connected: boolean;
    subscriptions: string[];
    natsUrl: string;
  } {
    return {
      connected: this.isConnected,
      subscriptions: Array.from(this.subscriptions.keys()),
      natsUrl: this.natsUrl
    };
  }
}