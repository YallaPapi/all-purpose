/**
 * UEP Protocol Client
 * 
 * Main client class for connecting to UEP services and handling protocol-compliant
 * request/response patterns with automatic validation and tracing integration.
 * 
 * Features:
 * - Type-safe request/response handling
 * - Automatic message validation
 * - Distributed tracing integration
 * - Connection management and retry logic
 * - Service discovery integration
 * - Health monitoring and metrics
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  UEPMessage,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  UEPClientOptions,
  UEPRequestOptions,
  UEPSubscriptionOptions,
  UEPAgentInfo,
  UEPProtocolInfo,
  UEPTracingContext,
  UEPHealthStatus,
  UEPMetrics,
  UEPError,
  UEPTypeGuards,
  UEPConstants
} from './UEPTypes.js';
import { UEPMessageValidator } from './UEPMessageValidator.js';
import { UEPTracing } from './UEPTracing.js';
import { UEPServiceRegistry } from './UEPServiceRegistry.js';

/**
 * UEP Client Implementation
 */
export class UEPClient extends EventEmitter {
  private readonly options: UEPClientOptions;
  private readonly validator: UEPMessageValidator;
  private readonly tracing: UEPTracing;
  private readonly serviceRegistry: UEPServiceRegistry;
  
  private connected = false;
  private connecting = false;
  private connection: any = null; // NATS connection
  private subscriptions = new Map<string, any>();
  private pendingRequests = new Map<string, {
    resolve: (response: UEPResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    startTime: number;
  }>();

  private metrics: UEPMetrics = {
    messages: { sent: 0, received: 0, failed: 0, pending: 0 },
    latency: { average: 0, p50: 0, p95: 0, p99: 0 },
    connections: { active: 0, total: 0, errors: 0 },
    memory: { used: 0, available: 0, utilization: 0 },
    timestamp: new Date()
  };

  private latencyStats: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 1000;

  constructor(options: UEPClientOptions) {
    super();
    this.options = { ...options };
    
    // Initialize components
    this.validator = new UEPMessageValidator({
      enabled: options.validation?.enabled ?? true,
      strictMode: options.validation?.strictMode ?? false,
      schemaValidation: options.validation?.schemaValidation ?? true
    });

    this.tracing = new UEPTracing({
      enabled: options.tracing?.enabled ?? true,
      serviceName: options.tracing?.serviceName ?? options.agent.id,
      sampleRate: options.tracing?.sampleRate ?? 1.0
    });

    this.serviceRegistry = new UEPServiceRegistry({
      connection: options.connection,
      updateInterval: 30000
    });

    // Setup monitoring
    if (options.monitoring?.metricsEnabled) {
      this.startMetricsCollection();
    }
  }

  /**
   * Connect to the UEP service
   */
  async connect(): Promise<void> {
    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;
    this.emit('connecting');

    try {
      // Initialize tracing
      await this.tracing.initialize();

      // Connect to message broker (NATS)
      this.connection = await this.createConnection();
      
      // Initialize service registry
      await this.serviceRegistry.initialize(this.connection);

      // Register this client as a service
      await this.registerService();

      // Setup health monitoring
      if (this.options.monitoring?.healthCheckEnabled) {
        this.startHealthMonitoring();
      }

      this.connected = true;
      this.connecting = false;
      this.metrics.connections.active = 1;
      this.metrics.connections.total++;

      this.emit('connected');

    } catch (error) {
      this.connecting = false;
      this.metrics.connections.errors++;
      this.emit('error', error);
      throw new Error(`Failed to connect to UEP service: ${error.message}`);
    }
  }

  /**
   * Disconnect from the UEP service
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.emit('disconnecting');

    try {
      // Cancel pending requests
      for (const [id, request] of this.pendingRequests.entries()) {
        clearTimeout(request.timeout);
        request.reject(new Error('Client disconnecting'));
        this.pendingRequests.delete(id);
      }

      // Close subscriptions
      for (const subscription of this.subscriptions.values()) {
        await subscription.unsubscribe();
      }
      this.subscriptions.clear();

      // Unregister from service registry
      await this.unregisterService();

      // Close connection
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      // Shutdown components
      await this.tracing.shutdown();
      await this.serviceRegistry.shutdown();

      this.connected = false;
      this.metrics.connections.active = 0;

      this.emit('disconnected');

    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to disconnect from UEP service: ${error.message}`);
    }
  }

  /**
   * Send a request and wait for response
   */
  async request<TRequest, TResponse>(
    capability: string,
    payload: TRequest,
    options: UEPRequestOptions = {}
  ): Promise<UEPResponse<TResponse>> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const requestId = uuidv4();
    const replySubject = `_INBOX.${requestId}`;
    const timeout = options.timeout ?? UEPConstants.DEFAULT_TIMEOUT;

    // Create tracing context
    const tracingContext = this.tracing.createContext(options.tracing?.parentSpanId);

    // Create request message
    const request: UEPRequest<TRequest> = {
      id: requestId,
      timestamp: new Date(),
      version: UEPConstants.PROTOCOL_VERSION,
      protocol: this.createProtocolInfo(),
      routing: {
        subject: this.buildSubject(capability),
        replyTo: replySubject,
        correlationId: requestId,
        messageType: 'command',
        priority: options.priority ?? 'normal'
      },
      agent: this.createAgentInfo(),
      tracing: tracingContext,
      payload,
      headers: options.headers,
      expectResponse: true
    };

    // Validate request
    if (this.options.validation?.enabled) {
      const validationResult = await this.validator.validateRequest(request);
      if (!validationResult.valid) {
        throw new Error(`Request validation failed: ${validationResult.errors.join(', ')}`);
      }
    }

    // Start tracing span
    const span = this.tracing.startSpan('uep.request', {
      'uep.capability': capability,
      'uep.request.id': requestId,
      'uep.agent.id': this.options.agent.id
    });

    const startTime = Date.now();

    return new Promise<UEPResponse<TResponse>>((resolve, reject) => {
      // Setup timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        span.setStatus({ code: 2, message: 'Timeout' });
        span.end();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve: (response: UEPResponse<TResponse>) => {
          const duration = Date.now() - startTime;
          this.recordLatency(duration);
          
          span.setAttributes({
            'uep.response.success': response.success,
            'uep.response.duration': duration
          });
          
          if (!response.success && response.error) {
            span.setStatus({ code: 2, message: response.error.message });
          } else {
            span.setStatus({ code: 1 });
          }
          
          span.end();
          resolve(response);
        },
        reject: (error: Error) => {
          span.setStatus({ code: 2, message: error.message });
          span.end();
          reject(error);
        },
        timeout: timeoutHandle,
        startTime
      });

      // Setup reply subscription
      this.setupReplySubscription(replySubject, requestId);

      // Send request
      this.sendMessage(request)
        .catch(error => {
          this.pendingRequests.delete(requestId);
          clearTimeout(timeoutHandle);
          span.setStatus({ code: 2, message: error.message });
          span.end();
          reject(error);
        });
    });
  }

  /**
   * Send an event (fire-and-forget)
   */
  async sendEvent<TPayload>(
    eventType: string,
    payload: TPayload,
    options: Partial<UEPRequestOptions> = {}
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const eventId = uuidv4();
    const tracingContext = this.tracing.createContext(options.tracing?.parentSpanId);

    const event: UEPEvent<TPayload> = {
      id: eventId,
      timestamp: new Date(),
      version: UEPConstants.PROTOCOL_VERSION,
      protocol: this.createProtocolInfo(),
      routing: {
        subject: this.buildSubject(`events.${eventType}`),
        messageType: 'event',
        priority: options.priority ?? 'normal'
      },
      agent: this.createAgentInfo(),
      tracing: tracingContext,
      payload,
      headers: options.headers,
      eventType,
      eventVersion: '1.0.0'
    };

    // Validate event
    if (this.options.validation?.enabled) {
      const validationResult = await this.validator.validateEvent(event);
      if (!validationResult.valid) {
        throw new Error(`Event validation failed: ${validationResult.errors.join(', ')}`);
      }
    }

    // Start tracing span
    const span = this.tracing.startSpan('uep.event', {
      'uep.event.type': eventType,
      'uep.event.id': eventId,
      'uep.agent.id': this.options.agent.id
    });

    try {
      await this.sendMessage(event);
      span.setStatus({ code: 1 });
      this.metrics.messages.sent++;
    } catch (error) {
      span.setStatus({ code: 2, message: error.message });
      this.metrics.messages.failed++;
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Subscribe to messages on a subject
   */
  async subscribe<TPayload>(
    subject: string,
    handler: (message: UEPMessage<TPayload>) => Promise<void> | void,
    options: UEPSubscriptionOptions = {}
  ): Promise<string> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }

    const subscriptionId = uuidv4();
    const fullSubject = this.buildSubject(subject);

    try {
      const subscription = await this.connection.subscribe(fullSubject, {
        queue: options.queue,
        callback: async (err: Error | null, msg: any) => {
          if (err) {
            this.emit('error', err);
            return;
          }

          try {
            const message = this.parseMessage<TPayload>(msg);
            
            // Validate message
            if (this.options.validation?.enabled) {
              const validationResult = await this.validator.validateMessage(message);
              if (!validationResult.valid) {
                this.emit('validation-error', {
                  message,
                  errors: validationResult.errors
                });
                return;
              }
            }

            this.metrics.messages.received++;
            await handler(message);

            // Acknowledge message if needed
            if (options.autoAck !== false) {
              msg.ack();
            }

          } catch (error) {
            this.emit('message-error', { error, message: msg });
            this.metrics.messages.failed++;
            
            // NACK message on error
            if (msg.nak) {
              msg.nak();
            }
          }
        }
      });

      this.subscriptions.set(subscriptionId, subscription);
      return subscriptionId;

    } catch (error) {
      throw new Error(`Failed to subscribe to ${subject}: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from a subject
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    await subscription.unsubscribe();
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<UEPHealthStatus> {
    const checks = [
      {
        name: 'connection',
        status: this.connected ? 'pass' as const : 'fail' as const,
        message: this.connected ? 'Connected' : 'Disconnected',
        duration: 0,
        timestamp: new Date()
      },
      {
        name: 'message_broker',
        status: this.connection ? 'pass' as const : 'fail' as const,
        message: this.connection ? 'NATS connection active' : 'NATS connection inactive',
        duration: 0,
        timestamp: new Date()
      }
    ];

    const failedChecks = checks.filter(check => check.status === 'fail');
    const status = failedChecks.length === 0 ? 'healthy' as const : 'unhealthy' as const;

    return {
      status,
      checks,
      uptime: process.uptime(),
      version: UEPConstants.PROTOCOL_VERSION,
      metadata: {
        agentId: this.options.agent.id,
        agentType: this.options.agent.type,
        capability: this.options.agent.capability
      }
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): UEPMetrics {
    this.updateMemoryMetrics();
    return { ...this.metrics, timestamp: new Date() };
  }

  /**
   * Private helper methods
   */
  private async createConnection(): Promise<any> {
    // Implementation would create NATS connection
    // This is a placeholder - actual implementation would use nats library
    const { connect } = await import('nats');
    
    return await connect({
      servers: this.options.connection.servers,
      user: this.options.connection.authentication?.username,
      pass: this.options.connection.authentication?.password,
      token: this.options.connection.authentication?.token,
      tls: this.options.connection.tls?.enabled ? {
        cert: this.options.connection.authentication?.cert,
        key: this.options.connection.authentication?.key,
        ca: this.options.connection.authentication?.ca
      } : undefined,
      timeout: this.options.connection.timeouts?.connect ?? 10000,
      reconnect: true,
      maxReconnectAttempts: this.options.connection.retry?.maxAttempts ?? 10
    });
  }

  private createProtocolInfo(): UEPProtocolInfo {
    return {
      id: 'uep-protocol',
      version: UEPConstants.PROTOCOL_VERSION,
      capability: this.options.agent.capability,
      compatibility: [UEPConstants.PROTOCOL_VERSION]
    };
  }

  private createAgentInfo(): UEPAgentInfo {
    return {
      id: this.options.agent.id,
      type: this.options.agent.type,
      capability: this.options.agent.capability,
      instance: process.env.HOSTNAME || 'localhost',
      version: this.options.agent.version,
      status: 'ready'
    };
  }

  private buildSubject(capability: string): string {
    const namespace = this.options.connection.namespace ?? UEPConstants.DEFAULT_NAMESPACE;
    return `${namespace}.${this.options.agent.type}.${capability}`;
  }

  private async sendMessage(message: UEPMessage): Promise<void> {
    if (!this.connection) {
      throw new Error('No connection available');
    }

    const subject = message.routing.subject;
    const data = JSON.stringify(message);

    await this.connection.publish(subject, data, {
      reply: message.routing.replyTo,
      headers: message.headers
    });

    this.metrics.messages.sent++;
  }

  private parseMessage<T>(msg: any): UEPMessage<T> {
    try {
      const data = JSON.parse(msg.data);
      
      if (!UEPTypeGuards.isUEPMessage(data)) {
        throw new Error('Invalid UEP message format');
      }

      return data as UEPMessage<T>;
    } catch (error) {
      throw new Error(`Failed to parse message: ${error.message}`);
    }
  }

  private async setupReplySubscription(replySubject: string, requestId: string): Promise<void> {
    const subscription = await this.connection.subscribe(replySubject, {
      max: 1,
      callback: (err: Error | null, msg: any) => {
        if (err) {
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(requestId);
            pending.reject(err);
          }
          return;
        }

        try {
          const response = this.parseMessage<any>(msg);
          
          if (!UEPTypeGuards.isUEPResponse(response)) {
            throw new Error('Invalid response message');
          }

          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(requestId);
            pending.resolve(response);
          }

        } catch (error) {
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(requestId);
            pending.reject(error);
          }
        }
      }
    });

    // Cleanup subscription after use
    setTimeout(() => {
      subscription.unsubscribe();
    }, 60000); // 1 minute cleanup
  }

  private async registerService(): Promise<void> {
    await this.serviceRegistry.register({
      id: this.options.agent.id,
      name: this.options.agent.capability,
      version: this.options.agent.version,
      endpoint: `${this.options.agent.type}.${this.options.agent.capability}`,
      status: 'healthy',
      capabilities: [],
      metadata: {
        registeredAt: new Date(),
        lastHealthCheck: new Date(),
        instance: this.createAgentInfo().instance
      }
    });
  }

  private async unregisterService(): Promise<void> {
    await this.serviceRegistry.unregister(this.options.agent.id);
  }

  private recordLatency(duration: number): void {
    this.latencyStats.push(duration);
    
    if (this.latencyStats.length > this.MAX_LATENCY_SAMPLES) {
      this.latencyStats.shift();
    }

    // Calculate percentiles
    const sorted = [...this.latencyStats].sort((a, b) => a - b);
    const len = sorted.length;
    
    this.metrics.latency.average = sorted.reduce((a, b) => a + b, 0) / len;
    this.metrics.latency.p50 = sorted[Math.floor(len * 0.5)];
    this.metrics.latency.p95 = sorted[Math.floor(len * 0.95)];
    this.metrics.latency.p99 = sorted[Math.floor(len * 0.99)];
  }

  private updateMemoryMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memory.used = memUsage.heapUsed;
    this.metrics.memory.available = memUsage.heapTotal;
    this.metrics.memory.utilization = memUsage.heapUsed / memUsage.heapTotal;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMemoryMetrics();
      this.metrics.messages.pending = this.pendingRequests.size;
      this.emit('metrics', this.getMetrics());
    }, 30000); // Every 30 seconds
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        this.emit('health', health);
      } catch (error) {
        this.emit('error', error);
      }
    }, 30000); // Every 30 seconds
  }
}

export { UEPClient };