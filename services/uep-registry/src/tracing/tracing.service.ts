/**
 * UEP Registry Service Tracing Configuration
 * 
 * OpenTelemetry distributed tracing implementation for the UEP Registry Service
 * with service-specific spans and UEP protocol integration.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

export class UEPRegistryTracingService {
  private sdk: NodeSDK | null = null;
  private tracer = trace.getTracer('uep-registry-service', '1.0.0');

  constructor() {
    this.initializeTracing();
  }

  private initializeTracing() {
    // Only initialize in production or when OTEL_EXPORTER_OTLP_ENDPOINT is set
    if (process.env.NODE_ENV !== 'production' && !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      console.log('Tracing disabled - not in production and no OTEL endpoint configured');
      return;
    }

    const serviceName = process.env.OTEL_SERVICE_NAME || 'uep-registry';
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
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'uep-meta-agent-factory',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      [SemanticResourceAttributes.CONTAINER_NAME]: process.env.HOSTNAME || 'unknown',
      // Custom attributes for UEP Registry identification
      'service.type': 'registry',
      'service.role': 'service-discovery',
      'uep.component': 'registry',
      'uep.backend': 'etcd',
    });

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 5000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          '@opentelemetry/instrumentation-net': { enabled: false },
        }),
      ],
    });

    this.sdk.start();
    console.log(`🔍 UEP Registry tracing initialized: ${serviceName}@${serviceVersion} -> ${otlpEndpoint}`);
  }

  /**
   * Trace service registration operations
   */
  async traceServiceRegistration<T>(
    operationType: string,
    serviceName: string,
    serviceData: any,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      `registry.service.${operationType}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'operation.type': operationType,
          'service.name': serviceName,
          'service.id': serviceData.id || 'unknown',
          'service.version': serviceData.version || 'unknown',
          'registry.backend': 'etcd',
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

  /**
   * Trace service discovery operations
   */
  async traceServiceDiscovery<T>(
    operationType: string,
    searchCriteria: any,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      `registry.discovery.${operationType}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'operation.type': operationType,
          'discovery.criteria': JSON.stringify(searchCriteria),
          'registry.backend': 'etcd',
        },
      },
      async (span) => {
        try {
          const result = await operation(span);
          span.setStatus({ code: SpanStatusCode.OK });
          
          // Add results metadata to span
          if (Array.isArray(result)) {
            span.setAttributes({
              'discovery.results.count': result.length,
            });
          }
          
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

  /**
   * Trace health monitoring operations
   */
  async traceHealthCheck<T>(
    serviceId: string,
    checkType: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      `registry.health.${checkType}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'service.id': serviceId,
          'health.check.type': checkType,
          'registry.backend': 'etcd',
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

  /**
   * Get middleware for HTTP request tracing
   */
  getExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      const span = this.tracer.startSpan(`${req.method} ${req.path}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.route': req.path,
          'service.name': 'uep-registry',
        },
      });

      // Add span to request context
      req.span = span;
      
      res.on('finish', () => {
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.response.size': res.get('content-length') || 0,
        });
        
        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`,
          });
        }
        
        span.end();
      });

      next();
    };
  }

  /**
   * Get current active span
   */
  getCurrentSpan() {
    return trace.getActiveSpan();
  }

  /**
   * Shutdown tracing service
   */
  async shutdown() {
    if (this.sdk) {
      await this.sdk.shutdown();
      console.log('🔍 UEP Registry tracing service shut down');
    }
  }
}

// Export singleton instance
export const uepRegistryTracingService = new UEPRegistryTracingService();