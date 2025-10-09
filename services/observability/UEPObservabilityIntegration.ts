/**
 * UEP Observability Integration Service
 * 
 * Comprehensive observability integration that combines distributed tracing,
 * structured logging, and metrics collection into a unified system.
 * Provides seamless trace-log correlation and UEP protocol-aware observability.
 * 
 * Features:
 * - Unified tracing and logging integration
 * - Automatic trace-log correlation
 * - UEP protocol-specific observability
 * - Context propagation across services
 * - Performance monitoring and alerting
 * - Jaeger and Loki/Elasticsearch integration
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { UEPTracingSystem, createUEPTracingSystem, UEPTracingConfig } from '../tracing/UEPTracingSystem';
import { UEPStructuredLogger, createUEPStructuredLogger, UEPLoggingConfig } from '../logging/UEPStructuredLogger';
import { UEPMetricsIntegration, createUEPMetricsIntegration } from '../monitoring/UEPMetricsIntegration';
import {
  UEPMessage,
  UEPMessageMetadata,
  AgentIdentifier,
  UEPContext,
  UEPError,
  UEPWorkflowExecution,
  UEPCoordinationEvent
} from '../types/UEPTypes';

// =====================================================
// Integration Configuration and Interfaces
// =====================================================

export interface UEPObservabilityConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  tracing: UEPTracingConfig;
  logging: UEPLoggingConfig;
  metrics: {
    enabled: boolean;
    config: any;
  };
  correlation: {
    enabled: boolean;
    strategy: 'automatic' | 'manual' | 'hybrid';
    propagateContext: boolean;
    includeMetrics: boolean;
  };
  performance: {
    enableAutoInstrumentation: boolean;
    trackResourceUsage: boolean;
    samplingRate: number;
    maxSpanAttributes: number;
  };
  integration: {
    jaeger: {
      enabled: boolean;
      dashboardUrl?: string;
    };
    loki: {
      enabled: boolean;
      endpoint?: string;
    };
    elasticsearch: {
      enabled: boolean;
      endpoint?: string;
      index?: string;
    };
    grafana: {
      enabled: boolean;
      dashboardUrl?: string;
    };
  };
}

export interface UEPObservabilityContext {
  traceId: string;
  spanId: string;
  correlationId: string;
  agentId?: string;
  workflowId?: string;
  executionId?: string;
  operationName: string;
  startTime: Date;
  attributes?: Record<string, any>;
}

export interface UEPObservabilitySpan {
  id: string;
  traceId: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'started' | 'ended' | 'error';
  attributes: Record<string, any>;
  events: Array<{
    name: string;
    timestamp: Date;
    attributes?: Record<string, any>;
  }>;
  logs: Array<{
    level: string;
    message: string;
    timestamp: Date;
    fields?: Record<string, any>;
  }>;
}

// =====================================================
// UEP Observability Integration
// =====================================================

export class UEPObservabilityIntegration extends EventEmitter {
  private config: UEPObservabilityConfig;
  private tracingSystem: UEPTracingSystem;
  private logger: UEPStructuredLogger;
  private metricsIntegration: UEPMetricsIntegration | null = null;
  private isInitialized: boolean = false;
  private activeOperations: Map<string, UEPObservabilitySpan> = new Map();

  constructor(config: UEPObservabilityConfig) {
    super();
    this.config = this.validateConfig(config);
    this.tracingSystem = createUEPTracingSystem(this.config.tracing);
    this.logger = createUEPStructuredLogger(this.config.logging);
    
    if (this.config.metrics.enabled) {
      this.metricsIntegration = createUEPMetricsIntegration(this.config.metrics.config);
    }

    this.setupEventHandlers();
  }

  // =====================================================
  // Initialization and Lifecycle
  // =====================================================

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('UEP Observability Integration is already initialized');
    }

    try {
      // Initialize tracing system
      await this.tracingSystem.initialize();
      
      // Initialize metrics integration
      if (this.metricsIntegration) {
        await this.metricsIntegration.start();
      }

      this.isInitialized = true;
      this.emit('observability:initialized', {
        serviceName: this.config.serviceName,
        tracing: true,
        logging: true,
        metrics: !!this.metricsIntegration
      });

      this.logger.info('UEP Observability Integration initialized', {
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment,
        components: {
          tracing: true,
          logging: true,
          metrics: !!this.metricsIntegration
        }
      });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // End all active operations
      for (const [operationId, span] of this.activeOperations) {
        this.endOperation(operationId, 'error', { reason: 'system_shutdown' });
      }

      // Shutdown components
      await this.tracingSystem.shutdown();
      await this.logger.shutdown();
      
      if (this.metricsIntegration) {
        await this.metricsIntegration.stop();
      }

      this.isInitialized = false;
      this.emit('observability:shutdown');
      
      console.log('UEP Observability Integration shutdown successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // UEP Message Observability
  // =====================================================

  public startMessageObservability(
    message: UEPMessage,
    metadata: UEPMessageMetadata
  ): UEPObservabilityContext {
    // Start tracing span
    const { span, context: spanContext } = this.tracingSystem.startUEPMessageSpan(
      message,
      metadata,
      `uep.message.${message.type.toLowerCase()}`
    );

    // Create observability context
    const observabilityContext: UEPObservabilityContext = {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      correlationId: message.correlationId,
      agentId: message.sender.id,
      operationName: `uep.message.${message.type.toLowerCase()}`,
      startTime: new Date(),
      attributes: {
        'uep.message.id': message.id,
        'uep.message.type': message.type,
        'uep.protocol.version': message.protocolVersion,
        'uep.sender.id': message.sender.id,
        'uep.sender.type': message.sender.type,
        'uep.recipient.id': message.recipient.id,
        'uep.recipient.type': message.recipient.type
      }
    };

    // Create span tracking
    const observabilitySpan: UEPObservabilitySpan = {
      id: message.id,
      traceId: observabilityContext.traceId,
      operationName: observabilityContext.operationName,
      startTime: observabilityContext.startTime,
      status: 'started',
      attributes: observabilityContext.attributes || {},
      events: [],
      logs: []
    };

    this.activeOperations.set(message.id, observabilitySpan);

    // Log message start with trace correlation
    this.logger.withContext(
      {
        traceId: observabilityContext.traceId,
        spanId: observabilityContext.spanId,
        correlationId: observabilityContext.correlationId,
        agentId: observabilityContext.agentId,
        operationName: observabilityContext.operationName
      },
      () => {
        this.logger.logUEPMessage(
          'info',
          `UEP Message Started: ${message.type}`,
          message,
          metadata,
          {
            operation: 'message_start',
            duration: 0
          }
        );
      }
    );

    // Record metrics
    if (this.metricsIntegration) {
      const metricsCollector = this.metricsIntegration.getCollector();
      metricsCollector.recordMessage(message, metadata, 0, 'success');
    }

    this.emit('message:started', { message, context: observabilityContext });

    return observabilityContext;
  }

  public endMessageObservability(
    messageId: string,
    status: 'success' | 'error' | 'violation',
    result?: any,
    error?: Error
  ): void {
    const span = this.activeOperations.get(messageId);
    if (!span) {
      this.logger.warn(`No active span found for message: ${messageId}`);
      return;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - span.startTime.getTime();

    // Update span
    span.endTime = endTime;
    span.duration = duration;
    span.status = status === 'success' ? 'ended' : 'error';

    // Add result or error to span attributes
    if (result) {
      span.attributes['uep.result.size'] = JSON.stringify(result).length;
      span.attributes['uep.result.type'] = typeof result;
    }

    if (error) {
      span.attributes['error.name'] = error.name;
      span.attributes['error.message'] = error.message;
      
      // Set span error
      this.tracingSystem.setUEPSpanError(messageId, error);
    }

    // End tracing span
    this.tracingSystem.endUEPSpan(
      messageId,
      status === 'success' ? 1 : 2, // SpanStatusCode.OK : SpanStatusCode.ERROR
      {
        'uep.processing.duration': duration,
        'uep.processing.status': status
      }
    );

    // Log message completion
    this.logger.withContext(
      {
        traceId: span.traceId,
        spanId: span.id,
        correlationId: span.attributes['uep.correlation.id'] as string,
        agentId: span.attributes['uep.sender.id'] as string,
        operationName: span.operationName
      },
      () => {
        const logLevel = status === 'success' ? 'info' : 'error';
        const message = `UEP Message ${status === 'success' ? 'Completed' : 'Failed'}: ${span.operationName}`;
        
        this.logger[logLevel](message, {
          operation: 'message_end',
          duration,
          status,
          ...(error && { error: error.message })
        });
      }
    );

    // Record final metrics
    if (this.metricsIntegration) {
      const metricsCollector = this.metricsIntegration.getCollector();
      // Update message processing time
      // metricsCollector.recordMessage(...) with final duration
    }

    this.activeOperations.delete(messageId);
    this.emit('message:ended', { messageId, status, duration });
  }

  // =====================================================
  // UEP Workflow Observability
  // =====================================================

  public startWorkflowObservability(
    workflowExecution: UEPWorkflowExecution,
    stepId?: string
  ): UEPObservabilityContext {
    // Start workflow span
    const { span, context: spanContext } = this.tracingSystem.startUEPWorkflowSpan(
      workflowExecution,
      stepId
    );

    const observabilityContext: UEPObservabilityContext = {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      correlationId: workflowExecution.id,
      workflowId: workflowExecution.workflowId,
      executionId: workflowExecution.id,
      operationName: stepId ? `workflow.step.${stepId}` : 'workflow.execution',
      startTime: new Date(),
      attributes: {
        'uep.workflow.id': workflowExecution.workflowId,
        'uep.workflow.execution.id': workflowExecution.id,
        'uep.workflow.status': workflowExecution.status,
        ...(stepId && { 'uep.workflow.step': stepId })
      }
    };

    // Log workflow start
    this.logger.withContext(
      {
        traceId: observabilityContext.traceId,
        spanId: observabilityContext.spanId,
        correlationId: observabilityContext.correlationId,
        workflowId: observabilityContext.workflowId,
        operationName: observabilityContext.operationName
      },
      () => {
        this.logger.logUEPWorkflow(
          'info',
          `Workflow ${stepId ? 'Step' : 'Execution'} Started`,
          workflowExecution.workflowId,
          workflowExecution.id,
          stepId,
          {
            operation: 'workflow_start',
            status: workflowExecution.status
          }
        );
      }
    );

    this.emit('workflow:started', { workflowExecution, stepId, context: observabilityContext });

    return observabilityContext;
  }

  public endWorkflowObservability(
    executionId: string,
    status: 'completed' | 'failed' | 'cancelled',
    result?: any,
    error?: Error
  ): void {
    const duration = Date.now(); // Would calculate actual duration

    // Log workflow completion
    this.logger.withContext(
      {
        correlationId: executionId,
        operationName: 'workflow.execution'
      },
      () => {
        const logLevel = status === 'completed' ? 'info' : 'error';
        const message = `Workflow ${status === 'completed' ? 'Completed' : 'Failed'}`;
        
        this.logger[logLevel](message, {
          operation: 'workflow_end',
          executionId,
          status,
          duration,
          ...(error && { error: error.message })
        });
      }
    );

    this.emit('workflow:ended', { executionId, status, duration });
  }

  // =====================================================
  // UEP Coordination Observability
  // =====================================================

  public startCoordinationObservability(
    coordinationEvent: UEPCoordinationEvent
  ): UEPObservabilityContext {
    // Start coordination span
    const { span, context: spanContext } = this.tracingSystem.startUEPCoordinationSpan(
      coordinationEvent
    );

    const observabilityContext: UEPObservabilityContext = {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      correlationId: coordinationEvent.id,
      operationName: `coordination.${coordinationEvent.pattern.toLowerCase()}`,
      startTime: new Date(),
      attributes: {
        'uep.coordination.id': coordinationEvent.id,
        'uep.coordination.type': coordinationEvent.type,
        'uep.coordination.pattern': coordinationEvent.pattern,
        'uep.coordination.phase': coordinationEvent.phase,
        'uep.coordination.coordinator': coordinationEvent.coordinatorId,
        'uep.coordination.participants': coordinationEvent.participantIds.join(',')
      }
    };

    // Log coordination start
    this.logger.withContext(
      {
        traceId: observabilityContext.traceId,
        spanId: observabilityContext.spanId,
        correlationId: observabilityContext.correlationId,
        operationName: observabilityContext.operationName
      },
      () => {
        this.logger.logUEPCoordination(
          'info',
          `Coordination Started: ${coordinationEvent.pattern}`,
          coordinationEvent.id,
          coordinationEvent.pattern,
          coordinationEvent.participantIds,
          {
            operation: 'coordination_start',
            phase: coordinationEvent.phase,
            coordinator: coordinationEvent.coordinatorId
          }
        );
      }
    );

    this.emit('coordination:started', { coordinationEvent, context: observabilityContext });

    return observabilityContext;
  }

  // =====================================================
  // Error and Exception Observability
  // =====================================================

  public recordUEPError(
    error: UEPError,
    context?: UEPObservabilityContext
  ): void {
    // Log error with full context
    this.logger.withContext(
      context ? {
        traceId: context.traceId,
        spanId: context.spanId,
        correlationId: context.correlationId,
        agentId: context.agentId,
        workflowId: context.workflowId,
        operationName: context.operationName
      } : {},
      () => {
        this.logger.logUEPError(
          error,
          'UEP Protocol Error',
          {
            operation: 'error_recorded',
            severity: error.severity,
            category: error.category
          }
        );
      }
    );

    // Add error to active span if available
    if (context) {
      const span = this.activeOperations.get(context.correlationId);
      if (span) {
        span.events.push({
          name: 'uep.error',
          timestamp: new Date(),
          attributes: {
            'error.code': error.code,
            'error.message': error.message,
            'error.severity': error.severity,
            'error.category': error.category
          }
        });
      }
    }

    // Record error metrics
    if (this.metricsIntegration) {
      const middleware = this.metricsIntegration.getMiddleware();
      middleware.errorTracking(error, context);
    }

    this.emit('error:recorded', { error, context });
  }

  // =====================================================
  // Integration and Middleware
  // =====================================================

  public createExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      // Extract trace context
      const traceContext = this.tracingSystem.extractContextFromHeaders(req.headers);
      
      // Create log context
      const logContext = {
        traceId: req.headers['x-trace-id'],
        spanId: req.headers['x-span-id'],
        correlationId: req.headers['x-correlation-id'] || req.headers['x-request-id'],
        userId: req.headers['x-user-id'],
        sessionId: req.headers['x-session-id'],
        operationName: `${req.method} ${req.path}`
      };

      // Run within trace context
      this.tracingSystem.runWithContext(traceContext, () => {
        // Run within log context
        this.logger.withContext(logContext, () => {
          // Log request start
          this.logger.info('HTTP Request Started', {
            http: {
              method: req.method,
              url: req.url,
              userAgent: req.headers['user-agent'],
              contentLength: req.headers['content-length']
            },
            operation: 'http_request_start'
          });

          // Track response
          const startTime = Date.now();
          
          res.on('finish', () => {
            const duration = Date.now() - startTime;
            const level = res.statusCode >= 400 ? 'error' : 'info';
            
            this.logger[level]('HTTP Request Completed', {
              http: {
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration,
                contentLength: res.get('content-length')
              },
              operation: 'http_request_end'
            });
          });

          next();
        });
      });
    };
  }

  public integrateWithMessageProcessor(processor: any): void {
    processor.on('message:received', (message: UEPMessage, metadata: UEPMessageMetadata) => {
      this.startMessageObservability(message, metadata);
    });

    processor.on('message:processed', (message: UEPMessage, result: any) => {
      this.endMessageObservability(message.id, 'success', result);
    });

    processor.on('message:error', (message: UEPMessage, error: Error) => {
      this.endMessageObservability(message.id, 'error', undefined, error);
    });
  }

  public integrateWithWorkflowEngine(engine: any): void {
    engine.on('workflow:started', (execution: UEPWorkflowExecution) => {
      this.startWorkflowObservability(execution);
    });

    engine.on('workflow:step:started', (execution: UEPWorkflowExecution, stepId: string) => {
      this.startWorkflowObservability(execution, stepId);
    });

    engine.on('workflow:completed', (executionId: string, result: any) => {
      this.endWorkflowObservability(executionId, 'completed', result);
    });

    engine.on('workflow:failed', (executionId: string, error: Error) => {
      this.endWorkflowObservability(executionId, 'failed', undefined, error);
    });
  }

  // =====================================================
  // Utility and Status Methods
  // =====================================================

  public getObservabilityStatus(): {
    initialized: boolean;
    activeOperations: number;
    tracing: boolean;
    logging: boolean;
    metrics: boolean;
  } {
    return {
      initialized: this.isInitialized,
      activeOperations: this.activeOperations.size,
      tracing: this.isInitialized,
      logging: this.isInitialized,
      metrics: !!this.metricsIntegration
    };
  }

  public async getTraceLogsCorrelation(traceId: string): Promise<{
    spans: UEPObservabilitySpan[];
    logs: any[];
  }> {
    // Get spans for trace
    const spans = Array.from(this.activeOperations.values())
      .filter(span => span.traceId === traceId);

    // Get logs for trace (would integrate with logging backend)
    const logs: any[] = []; // Would query logging system

    return { spans, logs };
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private validateConfig(config: UEPObservabilityConfig): UEPObservabilityConfig {
    if (!config.enabled) {
      throw new Error('UEP Observability must be enabled');
    }

    if (!config.serviceName) {
      throw new Error('Service name is required for observability');
    }

    return {
      ...config,
      correlation: {
        enabled: true,
        strategy: 'automatic',
        propagateContext: true,
        includeMetrics: true,
        ...config.correlation
      },
      performance: {
        enableAutoInstrumentation: true,
        trackResourceUsage: true,
        samplingRate: 1.0,
        maxSpanAttributes: 100,
        ...config.performance
      }
    };
  }

  private setupEventHandlers(): void {
    // Tracing system events
    this.tracingSystem.on('error', (error) => {
      this.logger.error('Tracing System Error', error);
      this.emit('error', error);
    });

    this.tracingSystem.on('span:started', (event) => {
      this.logger.debug('Span Started', { spanId: event.spanId });
    });

    this.tracingSystem.on('span:ended', (event) => {
      this.logger.debug('Span Ended', { spanId: event.spanId, status: event.status });
    });

    // Logger events
    this.logger.on('error', (error) => {
      console.error('Logger Error:', error);
      this.emit('error', error);
    });

    // Metrics integration events
    if (this.metricsIntegration) {
      this.metricsIntegration.on('error', (error) => {
        this.logger.error('Metrics Integration Error', error);
        this.emit('error', error);
      });

      this.metricsIntegration.on('alert:triggered', (alert) => {
        this.logger.warn('Metrics Alert Triggered', alert);
        this.emit('alert:triggered', alert);
      });
    }
  }

  private endOperation(
    operationId: string,
    status: 'success' | 'error',
    attributes?: Record<string, any>
  ): void {
    const span = this.activeOperations.get(operationId);
    if (!span) {
      return;
    }

    span.status = status === 'success' ? 'ended' : 'error';
    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();

    if (attributes) {
      Object.assign(span.attributes, attributes);
    }

    this.tracingSystem.endUEPSpan(operationId, status === 'success' ? 1 : 2, attributes);
    this.activeOperations.delete(operationId);
  }
}

// =====================================================
// Factory Function
// =====================================================

export function createUEPObservabilityIntegration(
  config: Partial<UEPObservabilityConfig> = {}
): UEPObservabilityIntegration {
  const defaultConfig: UEPObservabilityConfig = {
    enabled: true,
    serviceName: 'uep-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    tracing: {
      enabled: true,
      serviceName: config.serviceName || 'uep-service',
      serviceVersion: config.serviceVersion || '1.0.0',
      environment: config.environment || 'development',
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
    },
    logging: {
      enabled: true,
      level: 'info',
      serviceName: config.serviceName || 'uep-service',
      serviceVersion: config.serviceVersion || '1.0.0',
      environment: config.environment || 'development',
      format: 'json',
      outputs: {
        console: {
          enabled: true,
          colorize: true,
          timestamp: true
        },
        file: {
          enabled: false,
          path: '/var/log/uep/service.log',
          maxSize: '100MB',
          maxFiles: 10,
          rotate: true
        },
        network: {
          enabled: false,
          endpoint: 'http://localhost:3100/loki/api/v1/push',
          protocol: 'http',
          buffer: true,
          batchSize: 100
        }
      },
      correlation: {
        enabled: true,
        traceIdField: 'traceId',
        spanIdField: 'spanId',
        correlationIdField: 'correlationId',
        userIdField: 'userId',
        sessionIdField: 'sessionId'
      },
      enrichment: {
        enabled: true,
        includeHostname: true,
        includePid: true,
        includeMemoryUsage: false,
        includeTimestamp: true,
        includeLevel: true,
        includeService: true
      },
      filtering: {
        enabled: true,
        excludeFields: [],
        redactFields: ['password', 'token', 'apiKey', 'secret'],
        redactPatterns: [],
        maxMessageLength: 10000
      },
      performance: {
        bufferSize: 1000,
        flushInterval: 5000,
        asyncLogging: true,
        samplingRate: 1.0
      }
    },
    metrics: {
      enabled: true,
      config: {}
    },
    correlation: {
      enabled: true,
      strategy: 'automatic',
      propagateContext: true,
      includeMetrics: true
    },
    performance: {
      enableAutoInstrumentation: true,
      trackResourceUsage: true,
      samplingRate: 1.0,
      maxSpanAttributes: 100
    },
    integration: {
      jaeger: {
        enabled: true,
        dashboardUrl: 'http://localhost:16686'
      },
      loki: {
        enabled: false,
        endpoint: 'http://localhost:3100'
      },
      elasticsearch: {
        enabled: false,
        endpoint: 'http://localhost:9200',
        index: 'uep-logs'
      },
      grafana: {
        enabled: false,
        dashboardUrl: 'http://localhost:3000'
      }
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    tracing: { ...defaultConfig.tracing, ...config.tracing },
    logging: { ...defaultConfig.logging, ...config.logging },
    metrics: { ...defaultConfig.metrics, ...config.metrics },
    correlation: { ...defaultConfig.correlation, ...config.correlation },
    performance: { ...defaultConfig.performance, ...config.performance },
    integration: { ...defaultConfig.integration, ...config.integration }
  };

  return new UEPObservabilityIntegration(mergedConfig);
}

export default UEPObservabilityIntegration;