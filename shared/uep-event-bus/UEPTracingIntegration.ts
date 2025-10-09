/**
 * UEP Tracing Integration
 * 
 * This module provides comprehensive distributed tracing integration for the
 * UEP Event Bus system using OpenTelemetry standards.
 * 
 * Features:
 * - OpenTelemetry-compliant distributed tracing
 * - Message flow tracking across services
 * - Performance metrics and monitoring
 * - Custom span attributes for UEP-specific data
 * - Integration with popular tracing backends (Jaeger, Zipkin, etc.)
 */

import { 
  trace, 
  context, 
  SpanKind, 
  SpanStatusCode, 
  Span, 
  Context,
  propagation,
  metrics,
  Tracer,
  Meter
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/auto-instrumentations-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { EventEmitter } from 'events';
import { UEPMessage } from './UEPMessageBroker';
import { UEPEvent } from './UEPEventSchemaRegistry';

/**
 * UEP Tracing Configuration
 */
export interface UEPTracingConfig {
  // Service information
  service: {
    name: string;
    version: string;
    environment: string;
    namespace: string;
  };

  // Tracing settings
  tracing: {
    enabled: boolean;
    samplingRate: number;
    maxSpansPerTrace: number;
    spanRetentionTime: number;
    enableBaggage: boolean;
  };

  // Exporters configuration
  exporters: {
    jaeger?: {
      endpoint: string;
      agentHost?: string;
      agentPort?: number;
    };
    zipkin?: {
      endpoint: string;
    };
    otlp?: {
      endpoint: string;
      headers?: Record<string, string>;
    };
    console?: {
      enabled: boolean;
    };
  };

  // Metrics configuration
  metrics: {
    enabled: boolean;
    prometheus?: {
      endpoint: string;
      port: number;
    };
    customMetrics: boolean;
  };

  // Performance settings
  performance: {
    enableProfiling: boolean;
    enableResourceDetection: boolean;
    batchSpanProcessor: boolean;
    maxQueueSize: number;
  };
}

/**
 * Trace Context Information
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
  baggage?: Record<string, string>;
}

/**
 * Message Trace Information
 */
export interface MessageTraceInfo {
  messageId: string;
  traceContext: TraceContext;
  spanId: string;
  operationType: OperationType;
  timestamp: Date;
  duration?: number;
  attributes: Record<string, any>;
}

/**
 * Operation Types for Tracing
 */
export type OperationType = 
  | 'message.publish'
  | 'message.consume'
  | 'message.validate'
  | 'message.transform'
  | 'message.route'
  | 'event.emit'
  | 'event.handle'
  | 'schema.validate'
  | 'enforcement.check'
  | 'broker.connect'
  | 'broker.disconnect';

/**
 * UEP-specific Span Attributes
 */
export interface UEPSpanAttributes {
  // Message attributes
  'uep.message.id': string;
  'uep.message.type': string;
  'uep.message.subject': string;
  'uep.message.size': number;

  // Agent attributes
  'uep.agent.id': string;
  'uep.agent.type': string;
  'uep.agent.capability': string;
  'uep.agent.instance': string;

  // Protocol attributes
  'uep.protocol.id': string;
  'uep.protocol.version': string;
  'uep.protocol.capability': string;

  // Event attributes (if applicable)
  'uep.event.id'?: string;
  'uep.event.type'?: string;
  'uep.event.category'?: string;

  // Performance attributes
  'uep.performance.validation_time'?: number;
  'uep.performance.processing_time'?: number;
  'uep.performance.queue_time'?: number;
}

/**
 * Tracing Statistics
 */
export interface TracingStats {
  tracesStarted: number;
  tracesCompleted: number;
  spansCreated: number;
  spansFinished: number;
  errorsTraced: number;
  averageSpanDuration: number;
  activeSpans: number;
  exportedSpans: number;
}

/**
 * UEP Tracing Integration Implementation
 */
export class UEPTracingIntegration extends EventEmitter {
  private config: UEPTracingConfig;
  private tracer: Tracer;
  private meter: Meter;
  private sdk: NodeSDK | null = null;
  private activeSpans: Map<string, Span> = new Map();
  private stats: TracingStats = {
    tracesStarted: 0,
    tracesCompleted: 0,
    spansCreated: 0,
    spansFinished: 0,
    errorsTraced: 0,
    averageSpanDuration: 0,
    activeSpans: 0,
    exportedSpans: 0,
  };

  // Metrics
  private messageTracingCounter: any;
  private spanDurationHistogram: any;
  private errorCounter: any;
  private activeSpansGauge: any;

  constructor(config: UEPTracingConfig) {
    super();
    this.config = config;
    this.tracer = trace.getTracer('uep-event-bus', config.service.version);
    this.meter = metrics.getMeter('uep-event-bus', config.service.version);
  }

  /**
   * Initialize the tracing integration
   */
  async initialize(): Promise<void> {
    try {
      this.emit('tracing:initializing');

      if (!this.config.tracing.enabled) {
        this.emit('tracing:disabled');
        return;
      }

      // Setup OpenTelemetry SDK
      await this.setupSDK();

      // Setup metrics
      if (this.config.metrics.enabled) {
        this.setupMetrics();
      }

      // Start background monitoring
      this.startMonitoring();

      this.emit('tracing:initialized');
    } catch (error) {
      this.emit('tracing:error', error);
      throw new Error(`Failed to initialize UEP Tracing Integration: ${error.message}`);
    }
  }

  /**
   * Start tracing a message operation
   */
  startMessageTrace(
    message: UEPMessage<any>,
    operationType: OperationType,
    parentContext?: Context
  ): { span: Span; context: Context } {
    if (!this.config.tracing.enabled) {
      return { span: trace.getActiveSpan() as Span, context: context.active() };
    }

    // Extract or create trace context
    const activeContext = parentContext || this.extractTraceContext(message);

    // Create span
    const span = this.tracer.startSpan(
      `${operationType}`,
      {
        kind: this.getSpanKind(operationType),
        attributes: this.buildSpanAttributes(message, operationType),
      },
      activeContext
    );

    // Set UEP-specific attributes
    this.setUEPAttributes(span, message);

    // Store active span
    this.activeSpans.set(message.id, span);

    // Update statistics
    this.stats.spansCreated++;
    this.stats.activeSpans = this.activeSpans.size;

    // Update metrics
    if (this.messageTracingCounter) {
      this.messageTracingCounter.add(1, {
        operation: operationType,
        messageType: message.routing.messageType,
        agentType: message.agent.type,
      });
    }

    this.emit('span:started', {
      messageId: message.id,
      spanId: span.spanContext().spanId,
      traceId: span.spanContext().traceId,
      operationType,
    });

    // Create context with span
    const spanContext = trace.setSpan(activeContext, span);

    return { span, context: spanContext };
  }

  /**
   * Start tracing an event operation
   */
  startEventTrace(
    event: UEPEvent,
    operationType: OperationType,
    parentContext?: Context
  ): { span: Span; context: Context } {
    if (!this.config.tracing.enabled) {
      return { span: trace.getActiveSpan() as Span, context: context.active() };
    }

    const activeContext = parentContext || this.extractEventTraceContext(event);

    const span = this.tracer.startSpan(
      `${operationType}`,
      {
        kind: this.getSpanKind(operationType),
        attributes: this.buildEventSpanAttributes(event, operationType),
      },
      activeContext
    );

    this.setEventAttributes(span, event);

    // Store active span
    this.activeSpans.set(event.eventId, span);

    // Update statistics
    this.stats.spansCreated++;
    this.stats.activeSpans = this.activeSpans.size;

    this.emit('span:started', {
      eventId: event.eventId,
      spanId: span.spanContext().spanId,
      traceId: span.spanContext().traceId,
      operationType,
    });

    const spanContext = trace.setSpan(activeContext, span);
    return { span, context: spanContext };
  }

  /**
   * Finish a message trace
   */
  finishMessageTrace(
    message: UEPMessage<any>,
    span: Span,
    result?: { success: boolean; error?: Error; metadata?: Record<string, any> }
  ): void {
    if (!this.config.tracing.enabled) {
      return;
    }

    const startTime = Date.now();

    try {
      // Set final span attributes
      if (result) {
        span.setStatus({
          code: result.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
          message: result.error?.message,
        });

        if (result.error) {
          span.recordException(result.error);
          this.stats.errorsTraced++;
        }

        if (result.metadata) {
          Object.entries(result.metadata).forEach(([key, value]) => {
            span.setAttribute(`uep.metadata.${key}`, String(value));
          });
        }
      }

      // Calculate duration
      const duration = Date.now() - startTime;
      span.setAttribute('uep.performance.total_duration', duration);

      // Update span duration histogram
      if (this.spanDurationHistogram) {
        this.spanDurationHistogram.record(duration, {
          operation: span.attributes['operation.type'] as string,
          success: result?.success ? 'true' : 'false',
        });
      }

      // End the span
      span.end();

      // Remove from active spans
      this.activeSpans.delete(message.id);

      // Update statistics
      this.stats.spansFinished++;
      this.stats.activeSpans = this.activeSpans.size;

      // Update average duration
      this.updateAverageSpanDuration(duration);

      this.emit('span:finished', {
        messageId: message.id,
        spanId: span.spanContext().spanId,
        duration,
        success: result?.success !== false,
      });

    } catch (error) {
      this.emit('tracing:error', { operation: 'finish-trace', error });
    }
  }

  /**
   * Finish an event trace
   */
  finishEventTrace(
    event: UEPEvent,
    span: Span,
    result?: { success: boolean; error?: Error; metadata?: Record<string, any> }
  ): void {
    if (!this.config.tracing.enabled) {
      return;
    }

    try {
      if (result) {
        span.setStatus({
          code: result.success ? SpanStatusCode.OK : SpanStatusCode.ERROR,
          message: result.error?.message,
        });

        if (result.error) {
          span.recordException(result.error);
          this.stats.errorsTraced++;
        }
      }

      span.end();
      this.activeSpans.delete(event.eventId);

      this.stats.spansFinished++;
      this.stats.activeSpans = this.activeSpans.size;

      this.emit('span:finished', {
        eventId: event.eventId,
        spanId: span.spanContext().spanId,
        success: result?.success !== false,
      });

    } catch (error) {
      this.emit('tracing:error', { operation: 'finish-event-trace', error });
    }
  }

  /**
   * Inject trace context into message headers
   */
  injectTraceContext(message: UEPMessage<any>, context?: Context): void {
    if (!this.config.tracing.enabled) {
      return;
    }

    const activeContext = context || trace.setSpan(context.active(), trace.getActiveSpan()!);
    const headers = message.headers || {};

    // Inject trace context using OpenTelemetry propagation
    propagation.inject(activeContext, headers);

    // Also set UEP-specific tracing headers
    const spanContext = trace.getActiveSpan()?.spanContext();
    if (spanContext) {
      headers['uep-trace-id'] = spanContext.traceId;
      headers['uep-span-id'] = spanContext.spanId;
      if (this.config.tracing.enableBaggage) {
        // Add baggage if available
        const baggage = propagation.getBaggage(activeContext);
        if (baggage) {
          const baggageEntries: Record<string, string> = {};
          baggage.getAllEntries().forEach(([key, entry]) => {
            baggageEntries[key] = entry.value;
          });
          headers['uep-baggage'] = JSON.stringify(baggageEntries);
        }
      }
    }

    message.headers = headers;
  }

  /**
   * Extract trace context from message headers
   */
  extractTraceContext(message: UEPMessage<any>): Context {
    if (!this.config.tracing.enabled || !message.headers) {
      return context.active();
    }

    try {
      // Extract using OpenTelemetry propagation
      const extractedContext = propagation.extract(context.active(), message.headers);

      // Also extract UEP-specific tracing information
      if (message.tracing) {
        // Create span context from UEP tracing information
        const traceContext = trace.setSpanContext(extractedContext, {
          traceId: message.tracing.traceId,
          spanId: message.tracing.spanId,
          traceFlags: 1, // Sampled
        });

        return traceContext;
      }

      return extractedContext;
    } catch (error) {
      this.emit('tracing:error', { operation: 'extract-context', error });
      return context.active();
    }
  }

  /**
   * Extract trace context from event
   */
  extractEventTraceContext(event: UEPEvent): Context {
    if (!this.config.tracing.enabled) {
      return context.active();
    }

    try {
      if (event.context?.tracing) {
        const traceContext = trace.setSpanContext(context.active(), {
          traceId: event.context.tracing.traceId,
          spanId: event.context.tracing.spanId,
          traceFlags: 1,
        });

        return traceContext;
      }

      return context.active();
    } catch (error) {
      this.emit('tracing:error', { operation: 'extract-event-context', error });
      return context.active();
    }
  }

  /**
   * Create a child span
   */
  createChildSpan(
    name: string,
    parentSpan: Span,
    attributes?: Record<string, any>
  ): Span {
    if (!this.config.tracing.enabled) {
      return trace.getActiveSpan() as Span;
    }

    const parentContext = trace.setSpan(context.active(), parentSpan);
    
    const childSpan = this.tracer.startSpan(
      name,
      {
        attributes: attributes || {},
      },
      parentContext
    );

    this.stats.spansCreated++;
    return childSpan;
  }

  /**
   * Add custom attributes to active span
   */
  addSpanAttributes(attributes: Record<string, any>): void {
    if (!this.config.tracing.enabled) {
      return;
    }

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      Object.entries(attributes).forEach(([key, value]) => {
        activeSpan.setAttribute(key, String(value));
      });
    }
  }

  /**
   * Record an exception in the active span
   */
  recordException(error: Error, attributes?: Record<string, any>): void {
    if (!this.config.tracing.enabled) {
      return;
    }

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error, attributes);
      activeSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      
      if (this.errorCounter) {
        this.errorCounter.add(1, {
          errorType: error.constructor.name,
          operation: activeSpan.attributes['operation.type'] as string,
        });
      }

      this.stats.errorsTraced++;
    }
  }

  /**
   * Get tracing statistics
   */
  getStats(): TracingStats {
    return { ...this.stats };
  }

  /**
   * Reset tracing statistics
   */
  resetStats(): void {
    this.stats = {
      tracesStarted: 0,
      tracesCompleted: 0,
      spansCreated: 0,
      spansFinished: 0,
      errorsTraced: 0,
      averageSpanDuration: 0,
      activeSpans: this.activeSpans.size,
      exportedSpans: 0,
    };

    this.emit('stats:reset');
  }

  /**
   * Shutdown tracing system
   */
  async shutdown(): Promise<void> {
    try {
      this.emit('tracing:shutting-down');

      // Finish all active spans
      for (const span of this.activeSpans.values()) {
        span.end();
      }
      this.activeSpans.clear();

      // Shutdown SDK
      if (this.sdk) {
        await this.sdk.shutdown();
      }

      this.emit('tracing:shutdown');
    } catch (error) {
      this.emit('tracing:error', { operation: 'shutdown', error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async setupSDK(): Promise<void> {
    // Create resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.service.name,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.service.version,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: this.config.service.namespace,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.service.environment,
      })
    );

    // Setup exporters
    const traceExporters = [];

    if (this.config.exporters.jaeger) {
      traceExporters.push(new JaegerExporter({
        endpoint: this.config.exporters.jaeger.endpoint,
      }));
    }

    if (this.config.exporters.zipkin) {
      traceExporters.push(new ZipkinExporter({
        url: this.config.exporters.zipkin.endpoint,
      }));
    }

    if (this.config.exporters.otlp) {
      traceExporters.push(new OTLPTraceExporter({
        url: this.config.exporters.otlp.endpoint,
        headers: this.config.exporters.otlp.headers,
      }));
    }

    // Setup SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter: traceExporters.length > 0 ? traceExporters[0] : undefined,
      instrumentations: [getNodeAutoInstrumentations()],
      serviceName: this.config.service.name,
    });

    await this.sdk.start();
  }

  private setupMetrics(): void {
    // Message tracing counter
    this.messageTracingCounter = this.meter.createCounter('uep_messages_traced_total', {
      description: 'Total number of messages traced',
    });

    // Span duration histogram
    this.spanDurationHistogram = this.meter.createHistogram('uep_span_duration_ms', {
      description: 'Duration of UEP spans in milliseconds',
      unit: 'ms',
    });

    // Error counter
    this.errorCounter = this.meter.createCounter('uep_tracing_errors_total', {
      description: 'Total number of tracing errors',
    });

    // Active spans gauge
    this.activeSpansGauge = this.meter.createObservableGauge('uep_active_spans', {
      description: 'Number of currently active spans',
    });

    this.activeSpansGauge.addCallback((result: any) => {
      result.observe(this.activeSpans.size);
    });

    // Setup Prometheus exporter if configured
    if (this.config.metrics.prometheus) {
      const prometheusExporter = new PrometheusExporter({
        endpoint: this.config.metrics.prometheus.endpoint,
        port: this.config.metrics.prometheus.port,
      });
    }
  }

  private getSpanKind(operationType: OperationType): SpanKind {
    switch (operationType) {
      case 'message.publish':
      case 'event.emit':
        return SpanKind.PRODUCER;
      
      case 'message.consume':
      case 'event.handle':
        return SpanKind.CONSUMER;
      
      case 'message.route':
      case 'broker.connect':
      case 'broker.disconnect':
        return SpanKind.CLIENT;
      
      default:
        return SpanKind.INTERNAL;
    }
  }

  private buildSpanAttributes(message: UEPMessage<any>, operationType: OperationType): Record<string, any> {
    return {
      'operation.type': operationType,
      'messaging.system': 'uep-event-bus',
      'messaging.destination': message.routing.subject,
      'messaging.message_id': message.id,
      'messaging.protocol': 'uep',
      'messaging.protocol_version': message.version,
    };
  }

  private buildEventSpanAttributes(event: UEPEvent, operationType: OperationType): Record<string, any> {
    return {
      'operation.type': operationType,
      'event.type': event.eventType,
      'event.id': event.eventId,
      'event.category': event.metadata.category,
      'event.priority': event.metadata.priority,
    };
  }

  private setUEPAttributes(span: Span, message: UEPMessage<any>): void {
    const attributes: Partial<UEPSpanAttributes> = {
      'uep.message.id': message.id,
      'uep.message.type': message.routing.messageType,
      'uep.message.subject': message.routing.subject,
      'uep.message.size': JSON.stringify(message.payload).length,
      'uep.agent.id': message.agent.id,
      'uep.agent.type': message.agent.type,
      'uep.agent.capability': message.agent.capability,
      'uep.agent.instance': message.agent.instance,
      'uep.protocol.id': message.protocol.id,
      'uep.protocol.version': message.protocol.version,
      'uep.protocol.capability': message.protocol.capability,
    };

    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined) {
        span.setAttribute(key, String(value));
      }
    });
  }

  private setEventAttributes(span: Span, event: UEPEvent): void {
    span.setAttribute('uep.event.id', event.eventId);
    span.setAttribute('uep.event.type', event.eventType);
    span.setAttribute('uep.event.category', event.metadata.category);
    span.setAttribute('uep.agent.id', event.agent.id);
    span.setAttribute('uep.agent.type', event.agent.type);
  }

  private startMonitoring(): void {
    // Update active spans gauge periodically
    setInterval(() => {
      this.stats.activeSpans = this.activeSpans.size;
      
      if (this.activeSpansGauge) {
        // Gauge is updated via callback
      }
    }, 5000);

    // Cleanup old spans periodically
    setInterval(() => {
      this.cleanupOldSpans();
    }, 60000); // Every minute
  }

  private cleanupOldSpans(): void {
    // This would implement cleanup logic for spans that haven't been properly finished
    // For now, it's a placeholder
  }

  private updateAverageSpanDuration(duration: number): void {
    this.stats.averageSpanDuration = 
      (this.stats.averageSpanDuration * (this.stats.spansFinished - 1) + duration) / 
      this.stats.spansFinished;
  }
}

/**
 * Create default tracing configuration
 */
export function createDefaultTracingConfig(serviceName: string): UEPTracingConfig {
  return {
    service: {
      name: serviceName,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      namespace: 'uep-event-bus',
    },
    tracing: {
      enabled: true,
      samplingRate: 1.0,
      maxSpansPerTrace: 1000,
      spanRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
      enableBaggage: true,
    },
    exporters: {
      jaeger: {
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      },
      console: {
        enabled: process.env.NODE_ENV === 'development',
      },
    },
    metrics: {
      enabled: true,
      prometheus: {
        endpoint: '/metrics',
        port: 9090,
      },
      customMetrics: true,
    },
    performance: {
      enableProfiling: false,
      enableResourceDetection: true,
      batchSpanProcessor: true,
      maxQueueSize: 2048,
    },
  };
}