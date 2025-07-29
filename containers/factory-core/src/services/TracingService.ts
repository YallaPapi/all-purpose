import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-otlp-http';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

// Tracing service for Meta-Agent Factory
export class TracingService {
  private sdk: NodeSDK | null = null;
  private tracer = trace.getTracer('meta-agent-factory', '1.0.0');

  constructor() {
    this.initializeTracing();
  }

  private initializeTracing() {
    // Only initialize in production or when OTEL_EXPORTER_OTLP_ENDPOINT is set
    if (process.env.NODE_ENV !== 'production' && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      console.log('Tracing disabled - not in production and no OTEL endpoint configured');
      return;
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || 'factory-core';
    const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

    // Create trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: {},
    });

    // Create metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
      headers: {},
    });

    // Resource configuration
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'meta-agent-factory',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      [SemanticResourceAttributes.CONTAINER_NAME]: process.env.HOSTNAME || 'unknown',
      // Custom attributes for agent identification
      'agent.type': 'meta-agent',
      'agent.count': '11',
      'factory.component': 'core',
    });

    // Initialize Node SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000, // Export metrics every 30 seconds
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable noisy instrumentations
          '@opentelemetry/instrumentation-dns': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          // Configure HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreincomingRequestHook: (req) => {
              // Ignore health checks and metrics endpoints
              const url = req.url || '';
              return url.includes('/health') || url.includes('/metrics') || url.includes('/ready');
            },
            applyCustomAttributesOnSpan: (span, request, response) => {
              // Add custom attributes to HTTP spans
              const agent = request.headers['x-agent-type'] as string;
              const capability = request.headers['x-capability'] as string;
              const requestId = request.headers['x-request-id'] as string;
              
              if (agent) span.setAttributes({ 'agent.type': agent });
              if (capability) span.setAttributes({ 'agent.capability': capability });
              if (requestId) span.setAttributes({ 'request.id': requestId });
            }
          },
          // Configure Express instrumentation
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          // Configure Redis instrumentation
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),
      ],
    });

    // Start the SDK
    this.sdk.start();
    console.log(`OpenTelemetry tracing initialized for ${serviceName}`);
  }

  // Create a span for agent operations
  public async traceAgentOperation<T>(
    operationName: string,
    agentType: string,
    capability: string,
    operation: (span: any) => Promise<T>,
    attributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      operationName,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'agent.type': agentType,
          'agent.capability': capability,
          'operation.name': operationName,
          ...attributes,
        },
      },
      async (span) => {
        try {
          const result = await operation(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  // Create a span for UEP protocol operations
  public async traceUEPOperation<T>(
    operationName: string,
    operation: (span: any) => Promise<T>,
    attributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      `uep.${operationName}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'uep.operation': operationName,
          'protocol.name': 'UEP',
          'protocol.version': '1.0',
          ...attributes,
        },
      },
      async (span) => {
        try {
          const result = await operation(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  // Create a span for factory coordination
  public async traceFactoryCoordination<T>(
    coordinationType: string,
    operation: (span: any) => Promise<T>,
    attributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      `factory.coordination.${coordinationType}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'factory.coordination.type': coordinationType,
          'factory.component': 'core',
          ...attributes,
        },
      },
      async (span) => {
        try {
          const result = await operation(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error: any) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  // Add trace context to log messages
  public getTraceContext(): { traceId?: string; spanId?: string } {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) return {};

    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  // Middleware for Express to add trace context
  public createTracingMiddleware() {
    return (req: any, res: any, next: any) => {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        
        // Add trace context to request for logging
        req.traceContext = {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        };

        // Add trace headers to response
        res.setHeader('x-trace-id', spanContext.traceId);
        res.setHeader('x-span-id', spanContext.spanId);
      }
      next();
    };
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        console.log('OpenTelemetry SDK shut down successfully');
      } catch (error) {
        console.error('Error shutting down OpenTelemetry SDK:', error);
      }
    }
  }

  // Manual span creation for complex operations
  public createSpan(name: string, attributes: Record<string, string | number | boolean> = {}) {
    return this.tracer.startSpan(name, {
      kind: SpanKind.INTERNAL,
      attributes,
    });
  }

  // Get current trace ID for correlation with logs
  public getCurrentTraceId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    return activeSpan?.spanContext().traceId;
  }

  // Get current span ID for correlation with logs
  public getCurrentSpanId(): string | undefined {
    const activeSpan = trace.getActiveSpan();
    return activeSpan?.spanContext().spanId;
  }
}

// Global tracing service instance
export const tracingService = new TracingService();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  await tracingService.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await tracingService.shutdown();
  process.exit(0);
});