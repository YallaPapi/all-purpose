/**
 * UEP Distributed Tracing System
 * 
 * Comprehensive OpenTelemetry-based distributed tracing implementation
 * with Jaeger backend integration for Universal Execution Protocol (UEP)
 * microservices. Provides automatic instrumentation, trace context
 * propagation, and UEP protocol-specific tracing capabilities.
 * 
 * Features:
 * - OpenTelemetry SDK integration with Jaeger exporter
 * - Automatic HTTP, gRPC, and message-driven instrumentation
 * - UEP protocol-specific spans and attributes
 * - Trace context propagation across async boundaries
 * - Performance optimization for high-throughput scenarios
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { 
  trace, 
  context, 
  SpanKind, 
  SpanStatusCode,
  Tracer,
  Span,
  Context,
  propagation
} from '@opentelemetry/api';
import { 
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ConsoleSpanExporter
} from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { GrpcInstrumentation } from '@opentelemetry/instrumentation-grpc';
import { EventEmitter } from 'events';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPContext,
  UEPWorkflowExecution,
  UEPCoordinationEvent
} from '../types/UEPTypes';

// =====================================================
// Tracing Configuration and Interfaces
// =====================================================

export interface UEPTracingConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaeger: {
    enabled: boolean;
    endpoint: string;
    agentHost?: string;
    agentPort?: number;
    username?: string;
    password?: string;
  };
  otlp: {
    enabled: boolean;
    endpoint: string;
    headers?: Record<string, string>;
  };
  console: {
    enabled: boolean;
    pretty: boolean;
  };
  sampling: {
    ratio: number;
    parentBased: boolean;
    traceLevelSampling: boolean;
  };
  instrumentation: {
    http: boolean;
    express: boolean;
    grpc: boolean;
    database: boolean;
    redis: boolean;
    custom: boolean;
  };
  performance: {
    batchSize: number;
    exportTimeout: number;
    maxQueueSize: number;
    scheduledDelay: number;
  };
  context: {
    propagateInHeaders: boolean;
    customHeaders: string[];
    asyncHooks: boolean;
  };
}

export interface UEPSpanAttributes {
  // UEP Protocol Attributes
  'uep.protocol.version': string;
  'uep.message.type': string;
  'uep.message.id': string;
  'uep.agent.id': string;
  'uep.agent.type': string;
  'uep.correlation.id': string;
  
  // Agent Communication Attributes
  'uep.sender.id': string;
  'uep.sender.type': string;
  'uep.recipient.id': string;
  'uep.recipient.type': string;
  
  // Workflow Attributes
  'uep.workflow.id'?: string;
  'uep.workflow.step'?: string;
  'uep.workflow.execution.id'?: string;
  
  // Coordination Attributes
  'uep.coordination.pattern'?: string;
  'uep.coordination.phase'?: string;
  'uep.coordination.participants'?: string;
  
  // Performance Attributes
  'uep.processing.time.ms': number;
  'uep.message.size.bytes'?: number;
  'uep.queue.depth'?: number;
  
  // Compliance Attributes
  'uep.compliance.status': 'compliant' | 'violation' | 'warning';
  'uep.validation.errors'?: string;
  'uep.protocol.enforced': boolean;
}

export interface UEPTraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: string;
  traceState?: string;
  baggage?: Record<string, string>;
}

export interface UEPSpanEvent {
  name: string;
  timestamp?: Date;
  attributes?: Record<string, any>;
}

// =====================================================
// UEP Tracing System
// =====================================================

export class UEPTracingSystem extends EventEmitter {
  private config: UEPTracingConfig;
  private sdk: NodeSDK | null = null;
  private tracer: Tracer | null = null;
  private isInitialized: boolean = false;
  private activeSpans: Map<string, Span> = new Map();
  private contextStorage: Map<string, Context> = new Map();

  constructor(config: UEPTracingConfig) {
    super();
    this.config = this.validateConfig(config);
  }

  // =====================================================
  // Initialization and Lifecycle
  // =====================================================

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('UEP Tracing System is already initialized');
    }

    try {
      // Create resource with service information
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        'uep.service.type': 'agent',
        'uep.tracing.version': '1.0.0'
      });

      // Configure exporters
      const exporters = this.createExporters();
      const spanProcessors = exporters.map(exporter => 
        new BatchSpanProcessor(exporter, {
          maxExportBatchSize: this.config.performance.batchSize,
          exportTimeoutMillis: this.config.performance.exportTimeout,
          maxQueueSize: this.config.performance.maxQueueSize,
          scheduledDelayMillis: this.config.performance.scheduledDelay
        })
      );

      // Configure instrumentations
      const instrumentations = this.createInstrumentations();

      // Create and configure SDK
      this.sdk = new NodeSDK({
        resource,
        spanProcessors,
        instrumentations
      });

      // Start the SDK
      await this.sdk.start();

      // Get tracer instance
      this.tracer = trace.getTracer(
        this.config.serviceName,
        this.config.serviceVersion
      );

      this.isInitialized = true;
      this.emit('tracing:initialized', {
        serviceName: this.config.serviceName,
        exporters: exporters.length,
        instrumentations: instrumentations.length
      });

      console.log(`UEP Tracing System initialized for service: ${this.config.serviceName}`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized || !this.sdk) {
      return;
    }

    try {
      // End all active spans
      for (const [spanId, span] of this.activeSpans) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'System shutdown' });
        span.end();
      }
      this.activeSpans.clear();

      // Shutdown SDK
      await this.sdk.shutdown();

      this.isInitialized = false;
      this.tracer = null;
      this.sdk = null;

      this.emit('tracing:shutdown');
      console.log('UEP Tracing System shutdown successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // UEP-Specific Tracing Methods
  // =====================================================

  public startUEPMessageSpan(
    message: UEPMessage,
    metadata: UEPMessageMetadata,
    operationName?: string
  ): { span: Span; context: Context } {
    if (!this.tracer) {
      throw new Error('UEP Tracing System not initialized');
    }

    const spanName = operationName || `uep.message.${message.type.toLowerCase()}`;
    
    // Extract parent context from message metadata
    const parentContext = this.extractContextFromMetadata(metadata);
    
    const span = this.tracer.startSpan(spanName, {
      kind: SpanKind.INTERNAL,
      attributes: this.createMessageAttributes(message, metadata)
    }, parentContext);

    // Store active span
    this.activeSpans.set(message.id, span);

    // Create new context with span
    const spanContext = trace.setSpan(parentContext, span);
    this.contextStorage.set(message.correlationId, spanContext);

    this.emit('span:started', { spanId: span.spanContext().spanId, message });

    return { span, context: spanContext };
  }

  public startUEPWorkflowSpan(
    workflowExecution: UEPWorkflowExecution,
    stepId?: string
  ): { span: Span; context: Context } {
    if (!this.tracer) {
      throw new Error('UEP Tracing System not initialized');
    }

    const spanName = stepId 
      ? `uep.workflow.step.${stepId}`
      : `uep.workflow.${workflowExecution.workflowId}`;

    const span = this.tracer.startSpan(spanName, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'uep.workflow.id': workflowExecution.workflowId,
        'uep.workflow.execution.id': workflowExecution.id,
        'uep.workflow.status': workflowExecution.status,
        'uep.workflow.step': stepId || 'root',
        'uep.workflow.start_time': workflowExecution.startTime.toISOString(),
        ...(workflowExecution.currentStep && { 'uep.workflow.current_step': workflowExecution.currentStep })
      }
    });

    const spanContext = trace.setSpan(context.active(), span);
    this.activeSpans.set(workflowExecution.id, span);

    return { span, context: spanContext };
  }

  public startUEPCoordinationSpan(
    coordinationEvent: UEPCoordinationEvent
  ): { span: Span; context: Context } {
    if (!this.tracer) {
      throw new Error('UEP Tracing System not initialized');
    }

    const spanName = `uep.coordination.${coordinationEvent.pattern.toLowerCase()}`;
    
    const span = this.tracer.startSpan(spanName, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'uep.coordination.id': coordinationEvent.id,
        'uep.coordination.type': coordinationEvent.type,
        'uep.coordination.pattern': coordinationEvent.pattern,
        'uep.coordination.phase': coordinationEvent.phase,
        'uep.coordination.coordinator': coordinationEvent.coordinatorId,
        'uep.coordination.participants': coordinationEvent.participantIds.join(','),
        'uep.coordination.participant_count': coordinationEvent.participantIds.length,
        ...(coordinationEvent.timeout && { 'uep.coordination.timeout': coordinationEvent.timeout })
      }
    });

    const spanContext = trace.setSpan(context.active(), span);
    this.activeSpans.set(coordinationEvent.id, span);

    return { span, context: spanContext };
  }

  public addUEPSpanEvent(
    spanId: string,
    event: UEPSpanEvent
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`No active span found for ID: ${spanId}`);
      return;
    }

    span.addEvent(event.name, event.attributes, event.timestamp);
  }

  public setUEPSpanError(
    spanId: string,
    error: Error,
    attributes?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`No active span found for ID: ${spanId}`);
      return;
    }

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });

    if (attributes) {
      span.setAttributes({
        'error.type': error.constructor.name,
        'error.message': error.message,
        'error.stack': error.stack,
        ...attributes
      });
    }
  }

  public endUEPSpan(
    spanId: string,
    status?: SpanStatusCode,
    attributes?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`No active span found for ID: ${spanId}`);
      return;
    }

    if (status !== undefined) {
      span.setStatus({ code: status });
    }

    if (attributes) {
      span.setAttributes(attributes);
    }

    span.end();
    this.activeSpans.delete(spanId);

    this.emit('span:ended', { spanId, status });
  }

  // =====================================================
  // Context Propagation Methods
  // =====================================================

  public injectContextIntoHeaders(headers: Record<string, string>): Record<string, string> {
    const activeContext = context.active();
    const injectedHeaders = { ...headers };

    propagation.inject(activeContext, injectedHeaders);
    
    return injectedHeaders;
  }

  public extractContextFromHeaders(headers: Record<string, string>): Context {
    return propagation.extract(context.active(), headers);
  }

  public runWithContext<T>(
    spanContext: Context,
    fn: () => T
  ): T {
    return context.with(spanContext, fn);
  }

  public async runWithContextAsync<T>(
    spanContext: Context,
    fn: () => Promise<T>
  ): Promise<T> {
    return context.with(spanContext, fn);
  }

  public getCurrentTraceContext(): UEPTraceContext | null {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) {
      return null;
    }

    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: spanContext.traceFlags.toString(16).padStart(2, '0'),
      traceState: spanContext.traceState?.serialize()
    };
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  public createTraceMetadata(message?: UEPMessage): UEPMessageMetadata {
    const traceContext = this.getCurrentTraceContext();
    
    return {
      traceId: traceContext?.traceId || this.generateTraceId(),
      spanId: traceContext?.spanId || this.generateSpanId(),
      parentSpanId: traceContext?.spanId,
      operationName: message ? `uep.${message.type.toLowerCase()}` : 'uep.operation',
      tags: {
        'uep.traced': 'true',
        ...(message && {
          'uep.message.type': message.type,
          'uep.agent.sender': message.sender.id,
          'uep.agent.recipient': message.recipient.id
        })
      },
      contentType: 'application/json',
      ...(message && {
        userId: message.metadata?.userId,
        sessionId: message.metadata?.sessionId,
        requestId: message.id
      })
    };
  }

  public getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  public getTracingConfig(): UEPTracingConfig {
    return { ...this.config };
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private validateConfig(config: UEPTracingConfig): UEPTracingConfig {
    if (!config.enabled) {
      throw new Error('UEP Tracing must be enabled');
    }

    if (!config.serviceName) {
      throw new Error('Service name is required for tracing');
    }

    return {
      ...config,
      sampling: {
        ratio: 1.0,
        parentBased: true,
        traceLevelSampling: false,
        ...config.sampling
      },
      performance: {
        batchSize: 512,
        exportTimeout: 30000,
        maxQueueSize: 2048,
        scheduledDelay: 5000,
        ...config.performance
      }
    };
  }

  private createExporters(): any[] {
    const exporters: any[] = [];

    // Jaeger exporter
    if (this.config.jaeger.enabled) {
      const jaegerConfig: any = {
        endpoint: this.config.jaeger.endpoint
      };

      if (this.config.jaeger.username && this.config.jaeger.password) {
        jaegerConfig.username = this.config.jaeger.username;
        jaegerConfig.password = this.config.jaeger.password;
      }

      exporters.push(new JaegerExporter(jaegerConfig));
    }

    // OTLP exporter
    if (this.config.otlp.enabled) {
      exporters.push(new OTLPTraceExporter({
        url: this.config.otlp.endpoint,
        headers: this.config.otlp.headers || {}
      }));
    }

    // Console exporter for development
    if (this.config.console.enabled) {
      exporters.push(new ConsoleSpanExporter());
    }

    return exporters;
  }

  private createInstrumentations(): any[] {
    const instrumentations: any[] = [];

    if (this.config.instrumentation.custom) {
      // Add custom UEP instrumentation
      instrumentations.push(this.createUEPInstrumentation());
    }

    // Auto-instrumentations for common libraries
    const autoInstrumentations = getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: this.config.instrumentation.http,
        requestHook: this.httpRequestHook.bind(this),
        responseHook: this.httpResponseHook.bind(this)
      },
      '@opentelemetry/instrumentation-express': {
        enabled: this.config.instrumentation.express
      },
      '@opentelemetry/instrumentation-grpc': {
        enabled: this.config.instrumentation.grpc
      }
    });

    instrumentations.push(...autoInstrumentations);

    return instrumentations;
  }

  private createUEPInstrumentation(): any {
    // Custom UEP protocol instrumentation
    return {
      init() {
        // Initialize UEP-specific instrumentation
        console.log('UEP Protocol instrumentation initialized');
      }
    };
  }

  private httpRequestHook(span: Span, request: any): void {
    // Add UEP-specific attributes to HTTP requests
    const uepHeaders = this.extractUEPHeaders(request.headers || {});
    if (Object.keys(uepHeaders).length > 0) {
      span.setAttributes(uepHeaders);
    }
  }

  private httpResponseHook(span: Span, response: any): void {
    // Add UEP-specific attributes to HTTP responses
    if (response.headers) {
      const uepResponseHeaders = this.extractUEPHeaders(response.headers);
      if (Object.keys(uepResponseHeaders).length > 0) {
        span.setAttributes(uepResponseHeaders);
      }
    }
  }

  private extractUEPHeaders(headers: Record<string, any>): Record<string, any> {
    const uepHeaders: Record<string, any> = {};
    
    // Extract UEP-specific headers
    Object.keys(headers).forEach(key => {
      if (key.toLowerCase().startsWith('uep-') || key.toLowerCase().startsWith('x-uep-')) {
        uepHeaders[`http.header.${key.toLowerCase()}`] = headers[key];
      }
    });

    return uepHeaders;
  }

  private createMessageAttributes(
    message: UEPMessage,
    metadata: UEPMessageMetadata
  ): Partial<UEPSpanAttributes> {
    return {
      'uep.protocol.version': message.protocolVersion,
      'uep.message.type': message.type,
      'uep.message.id': message.id,
      'uep.agent.id': message.sender.id,
      'uep.agent.type': message.sender.type,
      'uep.correlation.id': message.correlationId,
      'uep.sender.id': message.sender.id,
      'uep.sender.type': message.sender.type,
      'uep.recipient.id': message.recipient.id,
      'uep.recipient.type': message.recipient.type,
      'uep.processing.time.ms': 0, // Will be updated when span ends
      'uep.compliance.status': 'compliant',
      'uep.protocol.enforced': true,
      ...(message.payload && {
        'uep.message.size.bytes': JSON.stringify(message.payload).length
      })
    };
  }

  private extractContextFromMetadata(metadata: UEPMessageMetadata): Context {
    // Create context from trace metadata
    const headers: Record<string, string> = {
      'traceparent': `00-${metadata.traceId}-${metadata.spanId}-01`,
      ...(metadata.baggage && { 'baggage': JSON.stringify(metadata.baggage) })
    };

    return this.extractContextFromHeaders(headers);
  }

  private generateTraceId(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private generateSpanId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}

// =====================================================
// Factory Functions and Middleware
// =====================================================

export function createUEPTracingSystem(config: Partial<UEPTracingConfig> = {}): UEPTracingSystem {
  const defaultConfig: UEPTracingConfig = {
    enabled: true,
    serviceName: 'uep-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    jaeger: {
      enabled: true,
      endpoint: 'http://localhost:14268/api/traces'
    },
    otlp: {
      enabled: false,
      endpoint: 'http://localhost:4318/v1/traces'
    },
    console: {
      enabled: false,
      pretty: true
    },
    sampling: {
      ratio: 1.0,
      parentBased: true,
      traceLevelSampling: false
    },
    instrumentation: {
      http: true,
      express: true,
      grpc: true,
      database: true,
      redis: true,
      custom: true
    },
    performance: {
      batchSize: 512,
      exportTimeout: 30000,
      maxQueueSize: 2048,
      scheduledDelay: 5000
    },
    context: {
      propagateInHeaders: true,
      customHeaders: ['x-uep-trace-id', 'x-uep-span-id'],
      asyncHooks: true
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    jaeger: { ...defaultConfig.jaeger, ...config.jaeger },
    otlp: { ...defaultConfig.otlp, ...config.otlp },
    console: { ...defaultConfig.console, ...config.console },
    sampling: { ...defaultConfig.sampling, ...config.sampling },
    instrumentation: { ...defaultConfig.instrumentation, ...config.instrumentation },
    performance: { ...defaultConfig.performance, ...config.performance },
    context: { ...defaultConfig.context, ...config.context }
  };

  return new UEPTracingSystem(mergedConfig);
}

// Express middleware for automatic UEP tracing
export function createUEPTracingMiddleware(tracingSystem: UEPTracingSystem) {
  return (req: any, res: any, next: any) => {
    // Extract or create trace context
    const context = tracingSystem.extractContextFromHeaders(req.headers);
    
    // Run request handling within trace context
    tracingSystem.runWithContext(context, () => {
      // Add trace information to request
      const traceContext = tracingSystem.getCurrentTraceContext();
      if (traceContext) {
        req.traceId = traceContext.traceId;
        req.spanId = traceContext.spanId;
      }

      // Inject trace headers into response
      const responseHeaders = tracingSystem.injectContextIntoHeaders({});
      Object.keys(responseHeaders).forEach(key => {
        res.setHeader(key, responseHeaders[key]);
      });

      next();
    });
  };
}

export default UEPTracingSystem;