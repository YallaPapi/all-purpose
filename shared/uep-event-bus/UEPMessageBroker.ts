/**
 * UEP Message Broker - Scalable Event Bus for Containerized Agent Communication
 * 
 * This module implements a NATS JetStream-based message broker that provides
 * scalable, reliable, and protocol-compliant messaging between UEP agents.
 * 
 * Features:
 * - Subject-based routing with hierarchical namespacing
 * - High availability with clustered deployment
 * - Protocol validation integration
 * - Dead letter queue handling
 * - Circuit breaker patterns
 * - Message tracing and observability
 */

import { 
  connect, 
  NatsConnection, 
  JetStreamManager, 
  JetStreamClient, 
  StreamConfig, 
  ConsumerConfig,
  PubAck,
  JsMsg,
  NatsError,
  ConsumerMessages,
  ConsumerOpts
} from 'nats';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * UEP Message Broker Configuration
 */
export interface UEPMessageBrokerConfig {
  // NATS Connection
  servers: string[];
  username?: string;
  password?: string;
  token?: string;
  tls?: {
    cert?: string;
    key?: string;
    ca?: string;
    verifyHost?: boolean;
  };
  
  // JetStream Configuration
  jetstream: {
    domain?: string;
    apiPrefix?: string;
    timeout?: number;
    maxCachedPubAcks?: number;
  };
  
  // UEP-specific Configuration
  uep: {
    namespace: string;
    enableValidation: boolean;
    enableTracing: boolean;
    enableDeadLetter: boolean;
    maxRetries: number;
    ackTimeout: number;
    maxDeliver: number;
  };
  
  // Performance Configuration
  performance: {
    maxPendingMessages: number;
    maxPendingBytes: number;
    batchSize: number;
    maxWaiting: number;
  };
  
  // Reliability Configuration
  reliability: {
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
    heartbeatInterval: number;
  };
}

/**
 * UEP Message Envelope
 */
export interface UEPMessage<T = any> {
  // Message metadata
  id: string;
  timestamp: Date;
  version: string;
  
  // UEP Protocol information
  protocol: {
    id: string;
    version: string;
    capability: string;
  };
  
  // Routing information
  routing: {
    subject: string;
    replyTo?: string;
    correlationId?: string;
    messageType: 'command' | 'event' | 'query' | 'response';
  };
  
  // Agent information
  agent: {
    id: string;
    type: 'meta' | 'domain';
    capability: string;
    instance: string;
  };
  
  // Tracing information
  tracing: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    baggage?: Record<string, string>;
  };
  
  // Message payload
  payload: T;
  
  // Headers for additional metadata
  headers?: Record<string, string>;
}

/**
 * Message Publication Options
 */
export interface PublishOptions {
  subject: string;
  replyTo?: string;
  correlationId?: string;
  timeout?: number;
  headers?: Record<string, string>;
  expectAck?: boolean;
  messageId?: string;
}

/**
 * Message Subscription Options
 */
export interface SubscribeOptions {
  subject: string;
  queue?: string;
  durableName?: string;
  deliverAll?: boolean;
  deliverLast?: boolean;
  deliverNew?: boolean;
  startSequence?: number;
  startTime?: Date;
  ackExplicit?: boolean;
  ackWait?: number;
  maxDeliver?: number;
  filterSubject?: string;
  replayPolicy?: 'instant' | 'original';
  rateLimit?: number;
  maxAckPending?: number;
  heartbeatInterval?: number;
  flowControl?: boolean;
}

/**
 * Circuit Breaker State
 */
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
}

/**
 * Stream Statistics
 */
export interface StreamStats {
  name: string;
  subjects: string[];
  messages: number;
  bytes: number;
  firstSeq: number;
  lastSeq: number;
  consumers: number;
  config: StreamConfig;
}

/**
 * Consumer Statistics
 */
export interface ConsumerStats {
  name: string;
  streamName: string;
  delivered: {
    consumerSeq: number;
    streamSeq: number;
  };
  ackFloor: {
    consumerSeq: number;
    streamSeq: number;
  };
  pending: number;
  redelivered: number;
  config: ConsumerConfig;
}

/**
 * UEP Message Broker Implementation
 */
export class UEPMessageBroker extends EventEmitter {
  private config: UEPMessageBrokerConfig;
  private connection: NatsConnection | null = null;
  private jetstream: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: UEPMessageBrokerConfig) {
    super();
    this.config = config;
    this.validateConfig();
  }

  /**
   * Initialize and connect to NATS JetStream
   */
  async initialize(): Promise<void> {
    try {
      this.emit('broker:initializing');

      // Connect to NATS
      this.connection = await connect({
        servers: this.config.servers,
        user: this.config.username,
        pass: this.config.password,
        token: this.config.token,
        tls: this.config.tls,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
        maxPendingMsgs: this.config.performance.maxPendingMessages,
        maxPendingBytes: this.config.performance.maxPendingBytes,
      });

      // Set up connection event handlers
      this.setupConnectionHandlers();

      // Initialize JetStream
      this.jetstream = this.connection.jetstream({
        domain: this.config.jetstream.domain,
        apiPrefix: this.config.jetstream.apiPrefix,
        timeout: this.config.jetstream.timeout || 5000,
      });

      this.jsm = await this.connection.jetstreamManager({
        domain: this.config.jetstream.domain,
        apiPrefix: this.config.jetstream.apiPrefix,
        timeout: this.config.jetstream.timeout || 5000,
      });

      // Create default streams
      await this.createDefaultStreams();

      // Start heartbeat monitoring if enabled
      if (this.config.reliability.heartbeatInterval > 0) {
        this.startHeartbeat();
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('broker:connected');

    } catch (error) {
      this.emit('broker:error', error);
      throw new Error(`Failed to initialize UEP Message Broker: ${error.message}`);
    }
  }

  /**
   * Publish a UEP message
   */
  async publish<T>(
    message: Omit<UEPMessage<T>, 'id' | 'timestamp'>,
    options: PublishOptions = { subject: message.routing.subject }
  ): Promise<PubAck | void> {
    if (!this.isConnected || !this.jetstream) {
      throw new Error('Broker not connected');
    }

    try {
      // Create complete UEP message
      const uepMessage: UEPMessage<T> = {
        ...message,
        id: options.messageId || uuidv4(),
        timestamp: new Date(),
      };

      // Validate subject format
      this.validateSubject(options.subject);

      // Check circuit breaker
      if (this.config.reliability.enableCircuitBreaker) {
        this.checkCircuitBreaker(options.subject);
      }

      // Serialize message
      const payload = JSON.stringify(uepMessage);

      // Build headers
      const headers = {
        'Nats-Msg-Id': uepMessage.id,
        'UEP-Protocol-Id': uepMessage.protocol.id,
        'UEP-Protocol-Version': uepMessage.protocol.version,
        'UEP-Agent-Id': uepMessage.agent.id,
        'UEP-Agent-Type': uepMessage.agent.type,
        'UEP-Trace-Id': uepMessage.tracing.traceId,
        'UEP-Span-Id': uepMessage.tracing.spanId,
        'UEP-Message-Type': uepMessage.routing.messageType,
        'UEP-Timestamp': uepMessage.timestamp.toISOString(),
        ...options.headers,
        ...uepMessage.headers,
      };

      // Publish message
      const pubOptions = {
        msgID: uepMessage.id,
        headers,
        timeout: options.timeout || this.config.uep.ackTimeout,
      };

      let ack: PubAck | void;
      if (options.expectAck !== false) {
        ack = await this.jetstream.publish(options.subject, payload, pubOptions);
      } else {
        this.jetstream.publish(options.subject, payload, pubOptions);
      }

      // Update circuit breaker on success
      if (this.config.reliability.enableCircuitBreaker) {
        this.recordSuccess(options.subject);
      }

      this.emit('message:published', { subject: options.subject, messageId: uepMessage.id });
      return ack;

    } catch (error) {
      // Update circuit breaker on failure
      if (this.config.reliability.enableCircuitBreaker) {
        this.recordFailure(options.subject);
      }

      this.emit('message:publish-error', { subject: options.subject, error });
      throw error;
    }
  }

  /**
   * Subscribe to UEP messages
   */
  async subscribe<T>(
    options: SubscribeOptions,
    handler: (message: UEPMessage<T>, jsMsg: JsMsg) => Promise<void> | void
  ): Promise<ConsumerMessages> {
    if (!this.isConnected || !this.jetstream) {
      throw new Error('Broker not connected');
    }

    try {
      // Validate subject format
      this.validateSubject(options.subject);

      // Build consumer configuration
      const consumerConfig: Partial<ConsumerConfig> = {
        durable_name: options.durableName,
        deliver_subject: options.queue ? `${options.queue}.>` : undefined,
        ack_policy: options.ackExplicit !== false ? 'explicit' : 'none',
        ack_wait: (options.ackWait || this.config.uep.ackTimeout) * 1000000, // Convert to nanoseconds
        max_deliver: options.maxDeliver || this.config.uep.maxDeliver,
        filter_subject: options.filterSubject || options.subject,
        replay_policy: options.replayPolicy || 'instant',
        rate_limit_bps: options.rateLimit,
        max_ack_pending: options.maxAckPending || this.config.performance.maxPendingMessages,
        heartbeat_interval: options.heartbeatInterval ? options.heartbeatInterval * 1000000000 : undefined, // Convert to nanoseconds
        flow_control: options.flowControl,
      };

      // Set delivery policy
      if (options.deliverAll) {
        consumerConfig.deliver_policy = 'all';
      } else if (options.deliverLast) {
        consumerConfig.deliver_policy = 'last';
      } else if (options.deliverNew) {
        consumerConfig.deliver_policy = 'new';
      } else if (options.startSequence) {
        consumerConfig.deliver_policy = 'by_start_sequence';
        consumerConfig.opt_start_seq = options.startSequence;
      } else if (options.startTime) {
        consumerConfig.deliver_policy = 'by_start_time';
        consumerConfig.opt_start_time = options.startTime.toISOString();
      }

      // Create consumer
      const consumer = await this.jetstream.consumers.get(
        this.getStreamName(options.subject),
        consumerConfig as ConsumerConfig
      );

      // Start consuming messages
      const messages = await consumer.consume({
        max_messages: this.config.performance.batchSize || 1,
        expires: 30000, // 30 seconds
      } as ConsumerOpts);

      // Process messages
      this.processMessages(messages, handler);

      this.emit('subscription:created', { subject: options.subject, consumer: consumerConfig.durable_name });
      return messages;

    } catch (error) {
      this.emit('subscription:error', { subject: options.subject, error });
      throw error;
    }
  }

  /**
   * Request-response pattern
   */
  async request<TRequest, TResponse>(
    message: Omit<UEPMessage<TRequest>, 'id' | 'timestamp'>,
    options: PublishOptions & { timeout?: number } = { subject: message.routing.subject }
  ): Promise<UEPMessage<TResponse>> {
    if (!this.isConnected || !this.connection) {
      throw new Error('Broker not connected');
    }

    return new Promise((resolve, reject) => {
      const timeoutMs = options.timeout || 30000;
      const correlationId = options.correlationId || uuidv4();
      
      // Create reply subject
      const replySubject = `${this.config.uep.namespace}.reply.${correlationId}`;
      
      // Set up response handler
      const subscription = this.connection!.subscribe(replySubject, {
        max: 1,
        timeout: timeoutMs,
      });

      (async () => {
        try {
          for await (const msg of subscription) {
            try {
              const response: UEPMessage<TResponse> = JSON.parse(msg.data.toString());
              resolve(response);
            } catch (parseError) {
              reject(new Error(`Failed to parse response: ${parseError.message}`));
            }
            break;
          }
        } catch (error) {
          reject(error);
        }
      })();

      // Send request
      const requestMessage = {
        ...message,
        routing: {
          ...message.routing,
          replyTo: replySubject,
          correlationId,
          messageType: 'query' as const,
        },
      };

      this.publish(requestMessage, { ...options, subject: options.subject, correlationId })
        .catch(reject);
    });
  }

  /**
   * Get stream statistics
   */
  async getStreamStats(streamName?: string): Promise<StreamStats[]> {
    if (!this.jsm) {
      throw new Error('JetStream Manager not initialized');
    }

    try {
      const streams = streamName ? [streamName] : await this.listStreams();
      const stats: StreamStats[] = [];

      for (const name of streams) {
        const info = await this.jsm.streams.info(name);
        stats.push({
          name: info.config.name,
          subjects: info.config.subjects || [],
          messages: info.state.messages,
          bytes: info.state.bytes,
          firstSeq: info.state.first_seq,
          lastSeq: info.state.last_seq,
          consumers: info.state.consumers,
          config: info.config,
        });
      }

      return stats;
    } catch (error) {
      this.emit('stats:error', error);
      throw error;
    }
  }

  /**
   * Get consumer statistics
   */
  async getConsumerStats(streamName: string, consumerName?: string): Promise<ConsumerStats[]> {
    if (!this.jsm) {
      throw new Error('JetStream Manager not initialized');
    }

    try {
      const consumers = consumerName ? [consumerName] : await this.listConsumers(streamName);
      const stats: ConsumerStats[] = [];

      for (const name of consumers) {
        const info = await this.jsm.consumers.info(streamName, name);
        stats.push({
          name: info.name,
          streamName: info.stream_name,
          delivered: info.delivered,
          ackFloor: info.ack_floor,
          pending: info.num_pending,
          redelivered: info.num_redelivered,
          config: info.config,
        });
      }

      return stats;
    } catch (error) {
      this.emit('stats:error', error);
      throw error;
    }
  }

  /**
   * Disconnect from NATS
   */
  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.connection) {
        await this.connection.drain();
        await this.connection.close();
        this.connection = null;
      }

      this.jetstream = null;
      this.jsm = null;

      this.emit('broker:disconnected');
    } catch (error) {
      this.emit('broker:error', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateConfig(): void {
    if (!this.config.servers || this.config.servers.length === 0) {
      throw new Error('At least one NATS server must be configured');
    }

    if (!this.config.uep.namespace) {
      throw new Error('UEP namespace must be configured');
    }

    if (this.config.uep.namespace.includes('.')) {
      throw new Error('UEP namespace cannot contain dots');
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.addEventListener('connect', () => {
      this.emit('connection:connected');
      this.reconnectAttempts = 0;
    });

    this.connection.addEventListener('disconnect', () => {
      this.emit('connection:disconnected');
    });

    this.connection.addEventListener('reconnect', () => {
      this.emit('connection:reconnected');
      this.reconnectAttempts++;
    });

    this.connection.addEventListener('error', (error) => {
      this.emit('connection:error', error);
    });
  }

  private async createDefaultStreams(): Promise<void> {
    if (!this.jsm) return;

    const defaultStreams = [
      {
        name: `${this.config.uep.namespace.toUpperCase()}_COMMANDS`,
        subjects: [`${this.config.uep.namespace}.command.>`],
        retention: 'workqueue' as const,
        max_age: 24 * 60 * 60 * 1000000000, // 24 hours in nanoseconds
      },
      {
        name: `${this.config.uep.namespace.toUpperCase()}_EVENTS`,
        subjects: [`${this.config.uep.namespace}.event.>`],
        retention: 'limits' as const,
        max_age: 7 * 24 * 60 * 60 * 1000000000, // 7 days in nanoseconds
      },
      {
        name: `${this.config.uep.namespace.toUpperCase()}_QUERIES`,
        subjects: [`${this.config.uep.namespace}.query.>`],
        retention: 'workqueue' as const,
        max_age: 1 * 60 * 60 * 1000000000, // 1 hour in nanoseconds
      },
    ];

    for (const streamConfig of defaultStreams) {
      try {
        await this.jsm.streams.info(streamConfig.name);
        // Stream exists, skip creation
      } catch (error) {
        // Stream doesn't exist, create it
        await this.jsm.streams.add(streamConfig);
        this.emit('stream:created', { name: streamConfig.name });
      }
    }

    // Create dead letter stream if enabled
    if (this.config.uep.enableDeadLetter) {
      const deadLetterStream = {
        name: `${this.config.uep.namespace.toUpperCase()}_DLQ`,
        subjects: [`${this.config.uep.namespace}.dlq.>`],
        retention: 'limits' as const,
        max_age: 30 * 24 * 60 * 60 * 1000000000, // 30 days in nanoseconds
      };

      try {
        await this.jsm.streams.info(deadLetterStream.name);
      } catch (error) {
        await this.jsm.streams.add(deadLetterStream);
        this.emit('stream:created', { name: deadLetterStream.name });
      }
    }
  }

  private validateSubject(subject: string): void {
    if (!subject.startsWith(this.config.uep.namespace)) {
      throw new Error(`Subject must start with UEP namespace: ${this.config.uep.namespace}`);
    }

    const parts = subject.split('.');
    if (parts.length < 3) {
      throw new Error('UEP subject must have at least 3 parts: namespace.type.target');
    }

    const validTypes = ['command', 'event', 'query', 'response', 'dlq', 'reply'];
    if (!validTypes.includes(parts[1])) {
      throw new Error(`Invalid message type: ${parts[1]}. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  private getStreamName(subject: string): string {
    const parts = subject.split('.');
    const messageType = parts[1];
    
    switch (messageType) {
      case 'command':
        return `${this.config.uep.namespace.toUpperCase()}_COMMANDS`;
      case 'event':
        return `${this.config.uep.namespace.toUpperCase()}_EVENTS`;
      case 'query':
        return `${this.config.uep.namespace.toUpperCase()}_QUERIES`;
      case 'dlq':
        return `${this.config.uep.namespace.toUpperCase()}_DLQ`;
      default:
        throw new Error(`Unknown message type for stream mapping: ${messageType}`);
    }
  }

  private async processMessages<T>(
    messages: ConsumerMessages,
    handler: (message: UEPMessage<T>, jsMsg: JsMsg) => Promise<void> | void
  ): Promise<void> {
    try {
      for await (const jsMsg of messages) {
        try {
          const uepMessage: UEPMessage<T> = JSON.parse(jsMsg.data.toString());
          
          // Validate message format
          this.validateUEPMessage(uepMessage);
          
          // Process message
          await handler(uepMessage, jsMsg);
          
          // Acknowledge message
          jsMsg.ack();
          
          this.emit('message:processed', { 
            messageId: uepMessage.id, 
            subject: jsMsg.subject 
          });
          
        } catch (error) {
          this.emit('message:process-error', { 
            subject: jsMsg.subject, 
            error 
          });
          
          // Handle failed message
          await this.handleFailedMessage(jsMsg, error);
        }
      }
    } catch (error) {
      this.emit('subscription:error', error);
    }
  }

  private validateUEPMessage(message: any): void {
    const requiredFields = ['id', 'timestamp', 'version', 'protocol', 'routing', 'agent', 'tracing', 'payload'];
    
    for (const field of requiredFields) {
      if (!(field in message)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (!message.protocol.id || !message.protocol.version) {
      throw new Error('Protocol information is incomplete');
    }
    
    if (!message.agent.id || !message.agent.type) {
      throw new Error('Agent information is incomplete');
    }
    
    if (!message.tracing.traceId || !message.tracing.spanId) {
      throw new Error('Tracing information is incomplete');
    }
  }

  private async handleFailedMessage(jsMsg: JsMsg, error: Error): Promise<void> {
    const deliveryCount = jsMsg.info?.redeliveryCount || 0;
    
    if (deliveryCount >= this.config.uep.maxRetries) {
      // Send to dead letter queue if enabled
      if (this.config.uep.enableDeadLetter) {
        await this.sendToDeadLetter(jsMsg, error);
      }
      jsMsg.ack(); // Acknowledge to prevent further redelivery
    } else {
      jsMsg.nak(1000); // Negative acknowledge with 1 second delay
    }
  }

  private async sendToDeadLetter(jsMsg: JsMsg, error: Error): Promise<void> {
    if (!this.jetstream) return;

    try {
      const dlqSubject = `${this.config.uep.namespace}.dlq.${jsMsg.subject}`;
      const dlqMessage = {
        originalSubject: jsMsg.subject,
        originalData: jsMsg.data.toString(),
        error: error.message,
        timestamp: new Date().toISOString(),
        deliveryCount: jsMsg.info?.redeliveryCount || 0,
      };

      await this.jetstream.publish(dlqSubject, JSON.stringify(dlqMessage));
      this.emit('message:dead-letter', { subject: jsMsg.subject, error: error.message });
    } catch (dlqError) {
      this.emit('dlq:error', { originalError: error, dlqError });
    }
  }

  private checkCircuitBreaker(subject: string): void {
    const breaker = this.circuitBreakers.get(subject);
    if (!breaker) return;

    const now = new Date();
    
    if (breaker.state === 'open') {
      if (now < breaker.nextAttemptTime) {
        throw new Error(`Circuit breaker open for subject: ${subject}`);
      } else {
        breaker.state = 'half-open';
      }
    }
  }

  private recordSuccess(subject: string): void {
    const breaker = this.circuitBreakers.get(subject);
    if (breaker) {
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failureCount = 0;
      }
    }
  }

  private recordFailure(subject: string): void {
    let breaker = this.circuitBreakers.get(subject);
    if (!breaker) {
      breaker = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: new Date(),
        nextAttemptTime: new Date(),
      };
      this.circuitBreakers.set(subject, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    if (breaker.failureCount >= this.config.reliability.circuitBreakerThreshold) {
      breaker.state = 'open';
      breaker.nextAttemptTime = new Date(
        Date.now() + this.config.reliability.circuitBreakerTimeout
      );
      this.emit('circuit-breaker:opened', { subject });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.connection && this.connection.isDraining()) {
          return;
        }

        // Send heartbeat message
        const heartbeat = {
          timestamp: new Date(),
          brokerId: this.config.uep.namespace,
          status: 'healthy',
        };

        await this.connection?.publish(
          `${this.config.uep.namespace}.heartbeat`,
          JSON.stringify(heartbeat)
        );

        this.emit('broker:heartbeat');
      } catch (error) {
        this.emit('broker:heartbeat-error', error);
      }
    }, this.config.reliability.heartbeatInterval);
  }

  private async listStreams(): Promise<string[]> {
    if (!this.jsm) return [];
    
    const streams = await this.jsm.streams.list().next();
    return streams.map(info => info.config.name);
  }

  private async listConsumers(streamName: string): Promise<string[]> {
    if (!this.jsm) return [];
    
    const consumers = await this.jsm.consumers.list(streamName).next();
    return consumers.map(info => info.name);
  }

  /**
   * Health check method
   */
  isHealthy(): boolean {
    return this.isConnected && 
           this.connection !== null && 
           !this.connection.isClosed() && 
           !this.connection.isDraining();
  }

  /**
   * Get broker statistics
   */
  getStats(): {
    connected: boolean;
    reconnectAttempts: number;
    circuitBreakers: number;
    openCircuitBreakers: number;
  } {
    const openBreakers = Array.from(this.circuitBreakers.values())
      .filter(breaker => breaker.state === 'open').length;

    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      circuitBreakers: this.circuitBreakers.size,
      openCircuitBreakers: openBreakers,
    };
  }
}

/**
 * Default configuration factory
 */
export function createDefaultBrokerConfig(namespace: string = 'uep'): UEPMessageBrokerConfig {
  return {
    servers: ['nats://localhost:4222'],
    
    jetstream: {
      timeout: 5000,
      maxCachedPubAcks: 1000,
    },
    
    uep: {
      namespace,
      enableValidation: true,
      enableTracing: true,
      enableDeadLetter: true,
      maxRetries: 3,
      ackTimeout: 30000,
      maxDeliver: 5,
    },
    
    performance: {
      maxPendingMessages: 1000,
      maxPendingBytes: 64 * 1024 * 1024, // 64MB
      batchSize: 10,
      maxWaiting: 100,
    },
    
    reliability: {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      heartbeatInterval: 30000,
    },
  };
}