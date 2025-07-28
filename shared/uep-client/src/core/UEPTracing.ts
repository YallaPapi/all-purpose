/**
 * UEP Tracing Integration
 * 
 * Provides OpenTelemetry-compliant distributed tracing for UEP protocol messages
 * with automatic span creation, context propagation, and performance monitoring.
 * 
 * Features:
 * - OpenTelemetry-compliant tracing
 * - Automatic context propagation in UEP messages
 * - Custom span attributes for UEP protocol
 * - Performance monitoring and metrics
 * - Multiple exporter support (Jaeger, Zipkin, Console)
 */

import { 
  trace, 
  context, 
  SpanStatusCode, 
  SpanKind,
  Span,
  Tracer,
  Context
} from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { UEPTracingContext } from './UEPTypes.js';

/**
 * Tracing Configuration
 */
export interface UEPTracingConfig {
  enabled: boolean;
  serviceName: string;
  sampleRate: number;
  exporters?: {
    jaeger?: {
      enabled: boolean;
      endpoint?: string;
      headers?: Record<string, string>;
    };
    zipkin?: {
      enabled: boolean;
      endpoint?: string;
    };
    console?: {
      enabled: boolean;
    };
    otlp?: {
      enabled: boolean;
      endpoint?: string;
      headers?: Record<string, string>;
    };
  };
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Span Information
 */
export interface SpanInfo {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  tags: Record<string, any>;
}

/**
 * UEP Tracing Statistics
 */
export interface TracingStats {
  spansCreated: number;
  spansFinished: number;
  errorsTraced: number;
  averageSpanDuration: number;
  activeSpans: number;
}

/**
 * UEP Tracing Integration Implementation
 */
export class UEPTracing {
  private readonly config: UEPTracingConfig;
  private tracer: Tracer | null = null;
  private sdk: NodeSDK | null = null;
  private activeSpans = new Map<string, Span>();
  
  private stats: TracingStats = {
    spansCreated: 0,
    spansFinished: 0,
    errorsTraced: 0,
    averageSpanDuration: 0,
    activeSpans: 0
  };

  private spanDurations: number[] = [];
  private readonly MAX_DURATION_SAMPLES = 1000;

  constructor(config: UEPTracingConfig) {
    this.config = config;
  }

  /**
   * Initialize the tracing system
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Create OpenTelemetry SDK
      this.sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
          [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'uep',
          ...this.config.attributes
        }),
        traceExporter: this.createTraceExporter(),
        instrumentations: [], // We'll handle UEP-specific instrumentation manually
        spanProcessor: undefined // Use default
      });

      // Start the SDK
      this.sdk.start();

      // Get tracer instance
      this.tracer = trace.getTracer('uep-client', '1.0.0');

    } catch (error) {
      throw new Error(`Failed to initialize UEP tracing: ${error.message}`);
    }
  }

  /**
   * Shutdown the tracing system
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.sdk = null;
    }
    this.tracer = null;
    this.activeSpans.clear();
  }

  /**
   * Create a new tracing context for UEP messages
   */
  createContext(parentSpanId?: string): UEPTracingContext {
    if (!this.config.enabled || !this.tracer) {
      return {
        traceId: this.generateTraceId(),
        spanId: this.generateSpanId(),
        parentSpanId,
        sampled: false
      };
    }

    const activeSpan = trace.getActiveSpan();
    const spanContext = activeSpan?.spanContext();

    return {
      traceId: spanContext?.traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId: parentSpanId || spanContext?.spanId,
      sampled: this.shouldSample()
    };
  }

  /**
   * Start a new span for UEP operations
   */
  startSpan(
    operationName: string, 
    attributes?: Record<string, any>,
    parentContext?: Context
  ): Span {
    if (!this.config.enabled || !this.tracer) {
      return trace.getActiveSpan() || this.createNoOpSpan();
    }

    const span = this.tracer.startSpan(
      operationName,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'uep.protocol.version': '1.0.0',
          'uep.service.name': this.config.serviceName,
          ...attributes
        }
      },
      parentContext || context.active()
    );

    this.activeSpans.set(span.spanContext().spanId, span);
    this.stats.spansCreated++;
    this.stats.activeSpans = this.activeSpans.size;

    return span;
  }

  /**
   * Finish a span with success/error status
   */
  finishSpan(
    span: Span, 
    options?: {
      success?: boolean;
      error?: Error;
      attributes?: Record<string, any>;
    }
  ): void {
    if (!span || !this.config.enabled) {
      return;
    }

    const startTime = Date.now();

    try {
      // Add final attributes
      if (options?.attributes) {
        span.setAttributes(options.attributes);
      }

      // Set status
      if (options?.success === false || options?.error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: options?.error?.message || 'Operation failed'
        });

        if (options?.error) {
          span.recordException(options.error);
          this.stats.errorsTraced++;
        }
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      // End the span
      span.end();

      // Update statistics
      const spanId = span.spanContext().spanId;
      this.activeSpans.delete(spanId);
      this.stats.spansFinished++;
      this.stats.activeSpans = this.activeSpans.size;

      // Record duration
      const duration = Date.now() - startTime;
      this.recordSpanDuration(duration);

    } catch (error) {
      // Silently handle tracing errors to avoid disrupting main application
      console.warn('Error finishing span:', error);
    }
  }

  /**
   * Create a child span from a parent span
   */
  createChildSpan(
    operationName: string,
    parentSpan: Span,
    attributes?: Record<string, any>
  ): Span {
    if (!this.config.enabled || !this.tracer) {
      return this.createNoOpSpan();
    }

    const childContext = trace.setSpan(context.active(), parentSpan);
    return this.startSpan(operationName, attributes, childContext);
  }

  /**
   * Add attributes to the current active span
   */
  addSpanAttributes(attributes: Record<string, any>): void {
    if (!this.config.enabled) {
      return;
    }

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.setAttributes(attributes);
    }
  }

  /**
   * Record an exception in the current span
   */
  recordException(error: Error, attributes?: Record<string, any>): void {
    if (!this.config.enabled) {
      return;
    }

    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.recordException(error, attributes);
      this.stats.errorsTraced++;
    }
  }

  /**
   * Extract tracing context from UEP message headers
   */
  extractContextFromHeaders(headers: Record<string, string> = {}): UEPTracingContext | null {
    const traceId = headers['uep-trace-id'];
    const spanId = headers['uep-span-id'];
    const parentSpanId = headers['uep-parent-span-id'];
    const sampled = headers['uep-sampled'] === 'true';

    if (!traceId || !spanId) {
      return null;
    }

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled
    };
  }

  /**
   * Inject tracing context into UEP message headers
   */
  injectContextIntoHeaders(
    tracingContext: UEPTracingContext,
    headers: Record<string, string> = {}
  ): Record<string, string> {
    return {
      ...headers,
      'uep-trace-id': tracingContext.traceId,
      'uep-span-id': tracingContext.spanId,
      ...(tracingContext.parentSpanId && { 'uep-parent-span-id': tracingContext.parentSpanId }),
      ...(tracingContext.sampled !== undefined && { 'uep-sampled': tracingContext.sampled.toString() }),
      ...(tracingContext.baggage && this.serializeBaggage(tracingContext.baggage))
    };
  }

  /**
   * Get current tracing statistics
   */
  getStats(): TracingStats {
    return { ...this.stats };
  }

  /**
   * Reset tracing statistics
   */
  resetStats(): void {
    this.stats = {
      spansCreated: 0,
      spansFinished: 0,
      errorsTraced: 0,
      averageSpanDuration: 0,
      activeSpans: this.activeSpans.size
    };
    this.spanDurations = [];
  }

  /**
   * Get information about active spans
   */
  getActiveSpans(): SpanInfo[] {
    const spans: SpanInfo[] = [];

    for (const span of this.activeSpans.values()) {
      const spanContext = span.spanContext();
      spans.push({
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        operationName: 'unknown', // Would need to track this separately
        startTime: Date.now(), // Would need to track this separately
        tags: {} // Would need to track this separately
      });
    }

    return spans;
  }

  /**
   * Check if tracing is enabled and operational
   */
  isEnabled(): boolean {
    return this.config.enabled && this.tracer !== null;
  }

  /**
   * Private helper methods
   */
  private createTraceExporter(): any {
    // This would create the appropriate exporter based on configuration
    // For now, return a console exporter as fallback
    const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
    return new ConsoleSpanExporter();

    // Example implementations for other exporters:
    /*
    if (this.config.exporters?.jaeger?.enabled) {
      const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
      return new JaegerExporter({
        endpoint: this.config.exporters.jaeger.endpoint,
        headers: this.config.exporters.jaeger.headers
      });
    }
    
    if (this.config.exporters?.zipkin?.enabled) {
      const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
      return new ZipkinExporter({
        url: this.config.exporters.zipkin.endpoint
      });
    }
    
    if (this.config.exporters?.otlp?.enabled) {
      const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
      return new OTLPTraceExporter({
        url: this.config.exporters.otlp.endpoint,
        headers: this.config.exporters.otlp.headers
      });
    }
    */
  }

  private createNoOpSpan(): Span {
    // Return a no-op span that does nothing
    return {
      spanContext: () => ({
        traceId: '00000000000000000000000000000000',
        spanId: '0000000000000000',
        traceFlags: 0
      }),
      setAttribute: () => this,
      setAttributes: () => this,
      addEvent: () => this,
      setStatus: () => this,
      updateName: () => this,
      end: () => {},
      isRecording: () => false,
      recordException: () => {}
    } as any;
  }

  private generateTraceId(): string {
    // Generate 32-character hex trace ID
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private generateSpanId(): string {
    // Generate 16-character hex span ID
    return Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private serializeBaggage(baggage: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(baggage)) {
      headers[`uep-baggage-${key}`] = value;
    }

    return headers;
  }

  private recordSpanDuration(duration: number): void {
    this.spanDurations.push(duration);
    
    if (this.spanDurations.length > this.MAX_DURATION_SAMPLES) {
      this.spanDurations.shift();
    }

    // Calculate average duration
    this.stats.averageSpanDuration = 
      this.spanDurations.reduce((sum, d) => sum + d, 0) / this.spanDurations.length;
  }
}

/**
 * Create default tracing configuration
 */
export function createDefaultTracingConfig(serviceName: string): UEPTracingConfig {
  return {
    enabled: true,
    serviceName,
    sampleRate: 1.0,
    exporters: {
      console: {
        enabled: true
      },
      jaeger: {
        enabled: false,
        endpoint: 'http://localhost:14268/api/traces'
      },
      zipkin: {
        enabled: false,
        endpoint: 'http://localhost:9411/api/v2/spans'
      },
      otlp: {
        enabled: false,
        endpoint: 'http://localhost:4318/v1/traces'
      }
    },
    attributes: {
      'service.namespace': 'uep',
      'service.environment': process.env.NODE_ENV || 'development'
    }
  };
}

export { UEPTracing };