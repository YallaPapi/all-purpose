import { connect, NatsConnection, JSONCodec, JetStreamClient, Subscription } from 'nats';
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
      this.isConnected = true;

      this.nc.closed().then(() => {
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.emit('connected');
      console.log('✅ EventBus connected to NATS');
    } catch (error) {
      console.error('❌ EventBus connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      // Close all subscriptions
      for (const [topic, sub] of this.subscriptions) {
        try {
          await sub.unsubscribe();
        } catch (error) {
          console.warn(`Warning: Failed to unsubscribe from ${topic}:`, error);
        }
      }
      this.subscriptions.clear();

      await this.nc.close();
      this.nc = null;
      this.js = null;
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
    if (!this.js || !this.isConnected) {
      throw new Error('EventBus not connected');
    }

    try {
      const consumerConfig: any = {
        durable_name: options?.durable || `consumer-${subject.replace(/\./g, '-')}-${Date.now()}`,
        deliver_policy: options?.deliverPolicy || 'all',
        ack_policy: 'explicit',
        ack_wait: 30000000000, // 30 seconds in nanoseconds
        max_deliver: 3
      };

      // Determine stream based on subject
      let streamName = 'META_AGENT_EVENTS';
      if (subject.startsWith('domain.')) {
        streamName = 'DOMAIN_AGENT_EVENTS';
      } else if (subject.startsWith('factory.')) {
        streamName = 'FACTORY_COORDINATION';
      } else if (subject.startsWith('metrics.')) {
        streamName = 'SYSTEM_METRICS';
      }

      const subscription = await this.js.subscribe(subject, {
        ...consumerConfig,
        stream: streamName
      });

      this.subscriptions.set(subject, subscription);

      // Process messages
      (async () => {
        for await (const m of subscription) {
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
    const subscription = this.subscriptions.get(subject);
    if (subscription) {
      await subscription.unsubscribe();
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