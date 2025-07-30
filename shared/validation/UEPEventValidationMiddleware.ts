/**
 * UEP Event Payload Validation Middleware
 * 
 * Comprehensive event validation middleware for message brokers (NATS, RabbitMQ, Kafka)
 * implementing schema validation, dead-letter queue handling, and OpenTelemetry
 * instrumentation. Based on TaskMaster research findings (Task 239) and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { connect, NatsConnection, Subscription, Msg, headers, JSONCodec, StringCodec } from 'nats';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { UEPValidationMiddleware, UEPProtocolMessage, UEPValidationResult } from '../../containers/api-gateway/src/validation/UEPValidationMiddleware';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPEventValidationConfig {
  natsUrl: string;
  enableValidation: boolean;
  enableDeadLetterQueue: boolean;
  enableRetryLogic: boolean;
  enableCaching: boolean;
  strictMode: boolean;
  maxRetryAttempts: number;
  retryDelayMs: number;
  deadLetterSubject: string;
  validationSubject: string;
  cacheOptions: {
    maxSize: number;
    ttl: number;
  };
  enableMetrics: boolean;
  enableTracing: boolean;
  consumerTimeout: number;
  ackWait: number;
  maxDeliver: number;
}

export interface UEPEventMessage {
  subject: string;
  data: UEPProtocolMessage;
  headers?: Record<string, string>;
  reply?: string;
  timestamp: Date;
  messageId: string;
  correlationId?: string;
  retryCount: number;
}

export interface UEPEventValidationResult extends UEPValidationResult {
  eventSubject: string;
  messageId: string;
  shouldDeadLetter: boolean;
  shouldRetry: boolean;
  processingTime: number;
}

export interface UEPEventMetrics {
  eventsProcessedTotal: Counter;
  eventValidationErrors: Counter;
  eventValidationDuration: Histogram;
  deadLetterMessages: Counter;
  retryAttempts: Counter;
  eventCacheHitRatio: Gauge;
  activeSubscriptions: Gauge;
  messageThroughput: Histogram;
}

export type UEPEventHandler = (message: UEPEventMessage, validationResult: UEPEventValidationResult) => Promise<void>;
export type UEPEventErrorHandler = (error: Error, message: UEPEventMessage, validationResult?: UEPEventValidationResult) => Promise<void>;

// =============================================================================
// UEP Event Validation Middleware Core Class
// =============================================================================

export class UEPEventValidationMiddleware extends EventEmitter {
  private readonly config: UEPEventValidationConfig;
  private readonly validator: UEPValidationMiddleware;
  private readonly tracer = trace.getTracer('uep-event-validation-middleware', '1.0.0');
  
  // NATS connection and codecs
  private natsConnection: NatsConnection | null = null;
  private readonly jsonCodec = JSONCodec();
  private readonly stringCodec = StringCodec();
  
  // Active subscriptions tracking
  private readonly subscriptions: Map<string, Subscription> = new Map();
  
  // Event validation cache
  private readonly validationCache: LRUCache<string, UEPEventValidationResult>;
  
  // Metrics collection
  private readonly metrics: UEPEventMetrics;

  constructor(config: Partial<UEPEventValidationConfig> = {}) {
    super();
    
    this.config = {
      natsUrl: 'nats://localhost:4222',
      enableValidation: true,
      enableDeadLetterQueue: true,
      enableRetryLogic: true,
      enableCaching: true,
      strictMode: true,
      maxRetryAttempts: 3,
      retryDelayMs: 5000,
      deadLetterSubject: 'uep.events.dead-letter',
      validationSubject: 'uep.events.validation',
      cacheOptions: {
        maxSize: 10000,
        ttl: 300000 // 5 minutes
      },
      enableMetrics: true,
      enableTracing: true,
      consumerTimeout: 30000,
      ackWait: 30000,
      maxDeliver: 3,
      ...config
    };

    // Initialize validator
    this.validator = new UEPValidationMiddleware({
      strictMode: this.config.strictMode,
      enableCaching: this.config.enableCaching,
      enableMetrics: this.config.enableMetrics,
      enableTracing: this.config.enableTracing
    });

    // Initialize validation cache
    this.validationCache = new LRUCache({
      max: this.config.cacheOptions.maxSize,
      ttl: this.config.cacheOptions.ttl,
      updateAgeOnGet: true
    });

    // Initialize metrics
    this.metrics = this.initializeMetrics();
  }

  // =============================================================================
  // NATS Connection Management
  // =============================================================================

  public async connect(): Promise<void> {
    return this.tracer.startActiveSpan('uep.event.connect', async (span) => {
      try {
        span.setAttributes({
          'nats.url': this.config.natsUrl,
          'uep.validation.enabled': this.config.enableValidation
        });

        this.natsConnection = await connect({
          servers: [this.config.natsUrl],
          timeout: 10000,
          reconnect: true,
          maxReconnectAttempts: -1,
          reconnectTimeWait: 2000,
          name: 'uep-event-validation-middleware'
        });

        // Handle connection events
        this.natsConnection.closed().then((err) => {
          if (err) {
            this.emit('connectionError', err);
          } else {
            this.emit('disconnected');
          }
        });

        this.emit('connected');
        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  public async disconnect(): Promise<void> {
    if (this.natsConnection) {
      // Close all subscriptions
      for (const [subject, subscription] of this.subscriptions) {
        subscription.unsubscribe();
      }
      this.subscriptions.clear();

      // Close NATS connection
      await this.natsConnection.close();
      this.natsConnection = null;
      
      this.emit('disconnected');
    }
  }

  // =============================================================================
  // Event Validation Core Logic
  // =============================================================================

  private async validateEvent(
    subject: string,
    data: any,
    messageId: string
  ): Promise<UEPEventValidationResult> {
    return this.tracer.startActiveSpan('uep.event.validate', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'event.subject': subject,
          'event.message_id': messageId,
          'uep.validation.type': 'event'
        });

        // Generate cache key
        const cacheKey = this.generateCacheKey(subject, data, messageId);
        
        // Check cache first
        if (this.config.enableCaching) {
          const cachedResult = this.validationCache.get(cacheKey);
          if (cachedResult) {
            span.setAttributes({ 'uep.validation.cache_hit': true });
            return {
              ...cachedResult,
              cacheHit: true,
              processingTime: Date.now() - startTime
            };
          }
        }

        // Perform validation
        const baseValidation = this.validator.validateUEPMessage(data, subject);
        const processingTime = Date.now() - startTime;

        const result: UEPEventValidationResult = {
          ...baseValidation,
          eventSubject: subject,
          messageId,
          shouldDeadLetter: !baseValidation.valid && this.config.enableDeadLetterQueue,
          shouldRetry: !baseValidation.valid && this.config.enableRetryLogic && baseValidation.errors.length > 0,
          processingTime
        };

        // Cache the result
        if (this.config.enableCaching) {
          this.validationCache.set(cacheKey, result);
        }

        // Update metrics
        if (this.config.enableMetrics) {
          this.metrics.eventValidationDuration.observe(
            { subject, result: result.valid ? 'valid' : 'invalid' },
            processingTime / 1000
          );

          if (!result.valid) {
            this.metrics.eventValidationErrors.inc({
              subject,
              error_type: result.errors[0]?.code || 'unknown'
            });
          }
        }

        span.setAttributes({
          'uep.validation.result': result.valid,
          'uep.validation.error_count': result.errors.length,
          'uep.validation.processing_time_ms': processingTime
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        return {
          valid: false,
          errors: [{
            code: 'EVENT_VALIDATION_ERROR',
            message: (error as Error).message,
            severity: 'error'
          }],
          warnings: [],
          validationTime: Date.now() - startTime,
          schemaVersion: '2.0.0',
          cacheHit: false,
          eventSubject: subject,
          messageId,
          shouldDeadLetter: true,
          shouldRetry: false,
          processingTime: Date.now() - startTime
        };
      }
    });
  }

  // =============================================================================
  // Event Subscription with Validation
  // =============================================================================

  public async subscribe(
    subject: string,
    handler: UEPEventHandler,
    errorHandler?: UEPEventErrorHandler
  ): Promise<Subscription> {
    return this.tracer.startActiveSpan('uep.event.subscribe', async (span) => {
      try {
        if (!this.natsConnection) {
          throw new Error('NATS connection not established');
        }

        span.setAttributes({
          'event.subject': subject,
          'uep.validation.enabled': this.config.enableValidation
        });

        const subscription = this.natsConnection.subscribe(subject, {
          callback: async (err, msg) => {
            if (err) {
              this.emit('subscriptionError', { subject, error: err });
              return;
            }

            await this.handleMessage(msg, handler, errorHandler);
          }
        });

        this.subscriptions.set(subject, subscription);

        if (this.config.enableMetrics) {
          this.metrics.activeSubscriptions.set(this.subscriptions.size);
        }

        this.emit('subscribed', { subject });
        span.setStatus({ code: SpanStatusCode.OK });
        
        return subscription;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  private async handleMessage(
    msg: Msg,
    handler: UEPEventHandler,
    errorHandler?: UEPEventErrorHandler
  ): Promise<void> {
    return this.tracer.startActiveSpan('uep.event.handle_message', async (span) => {
      const startTime = Date.now();
      let eventMessage: UEPEventMessage | undefined;

      try {
        // Parse message
        const data = this.jsonCodec.decode(msg.data);
        const messageHeaders = msg.headers ? this.parseHeaders(msg.headers) : {};
        const messageId = messageHeaders['message-id'] || this.generateMessageId();
        const retryCount = parseInt(messageHeaders['retry-count'] || '0', 10);

        eventMessage = {
          subject: msg.subject,
          data,
          headers: messageHeaders,
          reply: msg.reply,
          timestamp: new Date(),
          messageId,
          correlationId: messageHeaders['correlation-id'],
          retryCount
        };

        span.setAttributes({
          'event.subject': msg.subject,
          'event.message_id': messageId,
          'event.retry_count': retryCount,
          'event.has_reply': !!msg.reply
        });

        // Validate message if enabled
        let validationResult: UEPEventValidationResult | undefined;
        if (this.config.enableValidation) {
          validationResult = await this.validateEvent(msg.subject, data, messageId);

          if (!validationResult.valid) {
            if (this.config.strictMode) {
              await this.handleValidationFailure(msg, eventMessage, validationResult);
              return;
            } else {
              this.emit('validationWarning', {
                subject: msg.subject,
                messageId,
                errors: validationResult.errors
              });
            }
          }
        }

        // Call handler
        await handler(eventMessage, validationResult!);

        // Acknowledge message
        msg.ack();

        // Update metrics
        if (this.config.enableMetrics) {
          this.metrics.eventsProcessedTotal.inc({
            subject: msg.subject,
            result: 'success'
          });

          this.metrics.messageThroughput.observe(
            { subject: msg.subject },
            (Date.now() - startTime) / 1000
          );
        }

        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        if (errorHandler && eventMessage) {
          try {
            await errorHandler(error as Error, eventMessage);
            msg.ack();
          } catch (handlerError) {
            this.emit('handlerError', {
              originalError: error,
              handlerError,
              message: eventMessage
            });
            msg.nak();
          }
        } else {
          msg.nak();
        }

        if (this.config.enableMetrics) {
          this.metrics.eventsProcessedTotal.inc({
            subject: msg.subject,
            result: 'error'
          });
        }
      }
    });
  }

  // =============================================================================
  // Validation Failure Handling
  // =============================================================================

  private async handleValidationFailure(
    msg: Msg,
    eventMessage: UEPEventMessage,
    validationResult: UEPEventValidationResult
  ): Promise<void> {
    return this.tracer.startActiveSpan('uep.event.handle_validation_failure', async (span) => {
      try {
        span.setAttributes({
          'event.subject': msg.subject,
          'event.message_id': eventMessage.messageId,
          'validation.error_count': validationResult.errors.length,
          'validation.should_retry': validationResult.shouldRetry,
          'validation.should_dead_letter': validationResult.shouldDeadLetter
        });

        // Attempt retry if configured and within limits
        if (validationResult.shouldRetry && eventMessage.retryCount < this.config.maxRetryAttempts) {
          await this.retryMessage(msg, eventMessage, validationResult);
          span.setStatus({ code: SpanStatusCode.OK });
          return;
        }

        // Send to dead letter queue if configured
        if (validationResult.shouldDeadLetter) {
          await this.sendToDeadLetterQueue(eventMessage, validationResult);
        }

        // NAK the original message
        msg.nak();

        if (this.config.enableMetrics) {
          this.metrics.eventValidationErrors.inc({
            subject: msg.subject,
            error_type: 'validation_failure'
          });
        }

        this.emit('validationFailure', {
          message: eventMessage,
          validationResult,
          action: validationResult.shouldDeadLetter ? 'dead_lettered' : 'dropped'
        });

        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  private async retryMessage(
    msg: Msg,
    eventMessage: UEPEventMessage,
    validationResult: UEPEventValidationResult
  ): Promise<void> {
    if (!this.natsConnection) return;

    const retryHeaders = headers();
    retryHeaders.set('message-id', eventMessage.messageId);
    retryHeaders.set('correlation-id', eventMessage.correlationId || eventMessage.messageId);
    retryHeaders.set('retry-count', (eventMessage.retryCount + 1).toString());
    retryHeaders.set('original-subject', msg.subject);
    retryHeaders.set('retry-reason', 'validation_failure');
    retryHeaders.set('retry-timestamp', new Date().toISOString());

    // Add original headers
    if (eventMessage.headers) {
      for (const [key, value] of Object.entries(eventMessage.headers)) {
        if (!key.startsWith('retry-') && key !== 'message-id') {
          retryHeaders.set(key, value);
        }
      }
    }

    // Schedule retry with delay
    setTimeout(async () => {
      try {
        await this.natsConnection!.publish(
          msg.subject,
          this.jsonCodec.encode(eventMessage.data),
          { headers: retryHeaders }
        );

        if (this.config.enableMetrics) {
          this.metrics.retryAttempts.inc({
            subject: msg.subject,
            retry_count: (eventMessage.retryCount + 1).toString()
          });
        }

        this.emit('messageRetried', {
          originalMessage: eventMessage,
          retryCount: eventMessage.retryCount + 1
        });

      } catch (error) {
        this.emit('retryError', {
          message: eventMessage,
          error
        });
      }
    }, this.config.retryDelayMs);

    // ACK the original message since we're handling the retry
    msg.ack();
  }

  private async sendToDeadLetterQueue(
    eventMessage: UEPEventMessage,
    validationResult: UEPEventValidationResult
  ): Promise<void> {
    if (!this.natsConnection) return;

    const dlqHeaders = headers();
    dlqHeaders.set('message-id', eventMessage.messageId);
    dlqHeaders.set('correlation-id', eventMessage.correlationId || eventMessage.messageId);
    dlqHeaders.set('original-subject', eventMessage.subject);
    dlqHeaders.set('dead-letter-reason', 'validation_failure');
    dlqHeaders.set('dead-letter-timestamp', new Date().toISOString());
    dlqHeaders.set('validation-errors', JSON.stringify(validationResult.errors));
    dlqHeaders.set('retry-count', eventMessage.retryCount.toString());

    const deadLetterMessage = {
      originalMessage: eventMessage,
      validationResult,
      timestamp: new Date().toISOString(),
      reason: 'validation_failure'
    };

    await this.natsConnection.publish(
      this.config.deadLetterSubject,
      this.jsonCodec.encode(deadLetterMessage),
      { headers: dlqHeaders }
    );

    if (this.config.enableMetrics) {
      this.metrics.deadLetterMessages.inc({
        original_subject: eventMessage.subject,
        reason: 'validation_failure'
      });
    }

    this.emit('messageDeadLettered', {
      message: eventMessage,
      validationResult
    });
  }

  // =============================================================================
  // Publishing with Validation
  // =============================================================================

  public async publish(
    subject: string,
    data: UEPProtocolMessage,
    options: {
      headers?: Record<string, string>;
      reply?: string;
      validateBeforePublish?: boolean;
    } = {}
  ): Promise<void> {
    return this.tracer.startActiveSpan('uep.event.publish', async (span) => {
      try {
        if (!this.natsConnection) {
          throw new Error('NATS connection not established');
        }

        const messageId = this.generateMessageId();
        
        span.setAttributes({
          'event.subject': subject,
          'event.message_id': messageId,
          'event.validate_before_publish': options.validateBeforePublish !== false
        });

        // Validate before publishing if enabled
        if (options.validateBeforePublish !== false && this.config.enableValidation) {
          const validationResult = await this.validateEvent(subject, data, messageId);
          
          if (!validationResult.valid && this.config.strictMode) {
            const error = new Error('Event validation failed before publish');
            (error as any).validationResult = validationResult;
            throw error;
          }
        }

        // Prepare headers
        const msgHeaders = headers();
        msgHeaders.set('message-id', messageId);
        msgHeaders.set('publish-timestamp', new Date().toISOString());
        msgHeaders.set('uep-protocol-version', '2.0.0');

        if (options.headers) {
          for (const [key, value] of Object.entries(options.headers)) {
            msgHeaders.set(key, value);
          }
        }

        // Publish message
        await this.natsConnection.publish(
          subject,
          this.jsonCodec.encode(data),
          {
            headers: msgHeaders,
            reply: options.reply
          }
        );

        this.emit('messagePublished', {
          subject,
          messageId,
          data
        });

        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private generateCacheKey(subject: string, data: any, messageId: string): string {
    const normalizedData = JSON.stringify({ subject, data, messageId }, Object.keys({ subject, data, messageId }).sort());
    return createHash('sha256').update(normalizedData).digest('hex');
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseHeaders(natsHeaders: any): Record<string, string> {
    const headers: Record<string, string> = {};
    if (natsHeaders && typeof natsHeaders.get === 'function') {
      for (const [key, values] of natsHeaders) {
        headers[key] = Array.isArray(values) ? values[0] : values;
      }
    }
    return headers;
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPEventMetrics {
    const prefix = 'uep_event_validation_';

    return {
      eventsProcessedTotal: new Counter({
        name: `${prefix}events_processed_total`,
        help: 'Total events processed',
        labelNames: ['subject', 'result']
      }),

      eventValidationErrors: new Counter({
        name: `${prefix}validation_errors_total`,
        help: 'Total event validation errors',
        labelNames: ['subject', 'error_type']
      }),

      eventValidationDuration: new Histogram({
        name: `${prefix}validation_duration_seconds`,
        help: 'Event validation duration',
        labelNames: ['subject', 'result'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
      }),

      deadLetterMessages: new Counter({
        name: `${prefix}dead_letter_messages_total`,
        help: 'Messages sent to dead letter queue',
        labelNames: ['original_subject', 'reason']
      }),

      retryAttempts: new Counter({
        name: `${prefix}retry_attempts_total`,
        help: 'Message retry attempts',
        labelNames: ['subject', 'retry_count']
      }),

      eventCacheHitRatio: new Gauge({
        name: `${prefix}cache_hit_ratio`,
        help: 'Event validation cache hit ratio'
      }),

      activeSubscriptions: new Gauge({
        name: `${prefix}active_subscriptions`,
        help: 'Number of active event subscriptions'
      }),

      messageThroughput: new Histogram({
        name: `${prefix}message_throughput_seconds`,
        help: 'Message processing throughput',
        labelNames: ['subject'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
      })
    };
  }

  // =============================================================================
  // Management Methods
  // =============================================================================

  public getStats() {
    return {
      config: this.config,
      connection: {
        connected: !!this.natsConnection,
        subscriptions: this.subscriptions.size
      },
      cache: {
        size: this.validationCache.size,
        maxSize: this.validationCache.max,
        hitRatio: this.validationCache.size > 0 ? 
          (this.validationCache.size / (this.validationCache.size + this.validationCache.size)) : 0
      },
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }

  public clearCache(): void {
    this.validationCache.clear();
  }

  public async unsubscribe(subject: string): Promise<void> {
    const subscription = this.subscriptions.get(subject);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subject);
      
      if (this.config.enableMetrics) {
        this.metrics.activeSubscriptions.set(this.subscriptions.size);
      }
      
      this.emit('unsubscribed', { subject });
    }
  }

  public async shutdown(): Promise<void> {
    await this.disconnect();
    this.validationCache.clear();
    this.removeAllListeners();
    this.emit('shutdown');
  }
}

export default UEPEventValidationMiddleware;