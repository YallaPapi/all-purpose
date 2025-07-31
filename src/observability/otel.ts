/**
 * OpenTelemetry Instrumentation Setup for Meta-Agent Factory
 * Context7 Methodology Implementation
 * 
 * This file initializes OpenTelemetry with Context7-compliant configuration
 * for distributed trace context propagation across Node.js microservices.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as api from '@opentelemetry/api';

// Service identification from environment variables
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'meta-agent-factory';
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || '1.0.0';
const SERVICE_NAMESPACE = process.env.OTEL_SERVICE_NAMESPACE || 'meta-agent-factory';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// OpenTelemetry Collector endpoint configuration
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';
const OTLP_PROTOCOL = process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'http/protobuf';

// Context7 Resource Configuration
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: SERVICE_NAMESPACE,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
  
  // Meta-Agent Factory specific attributes
  'meta-agent.factory.type': 'core-service',
  'meta-agent.context7.enabled': 'true',
  'uep.protocol.version': process.env.UEP_PROTOCOL_VERSION || '2.0.0',
  
  // Container context
  'container.id': process.env.HOSTNAME || 'unknown',
  'k8s.pod.name': process.env.K8S_POD_NAME || process.env.HOSTNAME || 'unknown',
  'k8s.namespace.name': process.env.K8S_NAMESPACE || 'meta-agents',
});

// OTLP Trace Exporter with Context7 configuration
const traceExporter = new OTLPTraceExporter({
  url: `${OTLP_ENDPOINT}/v1/traces`,
  headers: {
    // Add authentication headers if needed
    ...(process.env.OTEL_EXPORTER_OTLP_HEADERS ? 
       JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {}),
  },
});

// Auto-instrumentation configuration for Context7 compatibility
const instrumentations = getNodeAutoInstrumentations({
  // HTTP instrumentation with Context7 enhancements
  '@opentelemetry/instrumentation-http': {
    enabled: true,
    ignoreIncomingRequestHook: (req) => {
      // Ignore health check endpoints to reduce noise
      const ignoredPaths = ['/health', '/metrics', '/ready', '/live'];
      return ignoredPaths.some(path => req.url?.includes(path));
    },
    requestHook: (span, request) => {
      // Add Context7-specific attributes
      span.setAttributes({
        'http.context7.boundary': 'http-ingress',
        'meta-agent.request.id': request.headers['x-request-id'] || 'unknown',
        'uep.correlation.id': request.headers['x-uep-correlation-id'] || 'unknown',
      });
    },
    responseHook: (span, response) => {
      // Add response context
      span.setAttributes({
        'http.context7.boundary': 'http-egress',
        'http.response.size': response.getHeader('content-length') || 0,
      });
    }
  },
  
  // Express instrumentation
  '@opentelemetry/instrumentation-express': {
    enabled: true,
    requestHook: (span, info) => {
      span.setAttributes({
        'express.route': info.route || 'unknown',
        'express.context7.middleware': 'enabled',
      });
    }
  },
  
  // Redis instrumentation for cache operations
  '@opentelemetry/instrumentation-redis': {
    enabled: true,
    requestHook: (span, request) => {
      span.setAttributes({
        'redis.context7.cache': 'true',
        'meta-agent.cache.operation': request.command || 'unknown',
      });
    }
  },
  
  // File system instrumentation for meta-agent operations
  '@opentelemetry/instrumentation-fs': {
    enabled: true,
    requestHook: (span, request) => {
      span.setAttributes({
        'fs.context7.operation': 'file-access',
        'meta-agent.file.type': request.path?.split('.').pop() || 'unknown',
      });
    }
  },
  
  // DNS instrumentation for service discovery
  '@opentelemetry/instrumentation-dns': {
    enabled: true,
  },
  
  // Disable noisy instrumentations in development
  '@opentelemetry/instrumentation-pino': {
    enabled: process.env.NODE_ENV === 'production',
  },
  '@opentelemetry/instrumentation-winston': {
    enabled: process.env.NODE_ENV === 'production',
  },
});

// Initialize OpenTelemetry SDK with Context7 configuration
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations,
  // Enable automatic resource detection
  autoDetectResources: true,
});

// Context7 Enhancement: Custom span processor for UEP protocol integration
class Context7SpanProcessor implements api.SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  
  onStart(span: api.Span, parentContext: api.Context): void {
    // Add Context7 metadata to all spans
    const baggage = api.propagation.getBaggage(parentContext);
    
    if (baggage) {
      // Extract UEP protocol metadata from baggage
      const uepAgentId = baggage.getEntry('uep.agent.id')?.value;
      const uepTaskId = baggage.getEntry('uep.task.id')?.value;
      const uepWorkflowId = baggage.getEntry('uep.workflow.id')?.value;
      
      if (uepAgentId) span.setAttribute('uep.agent.id', uepAgentId);
      if (uepTaskId) span.setAttribute('uep.task.id', uepTaskId);
      if (uepWorkflowId) span.setAttribute('uep.workflow.id', uepWorkflowId);
    }
    
    // Add Context7 boundary markers
    span.setAttributes({
      'context7.span.created': Date.now(),
      'context7.boundary.explicit': 'true',
      'meta-agent.factory.service': SERVICE_NAME,
    });
  }
  
  onEnd(span: api.ReadableSpan): void {
    // Context7 cleanup - could add custom logic here
    console.debug(`Context7: Span ended - ${span.name} (${span.spanContext().spanId})`);
  }
  
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

// Add Context7 span processor
const traceProvider = api.trace.getTracerProvider() as any;
if (traceProvider.addSpanProcessor) {
  traceProvider.addSpanProcessor(new Context7SpanProcessor());
}

// Initialize and start SDK
console.log(`Initializing OpenTelemetry for ${SERVICE_NAME}...`);
console.log(`OTLP Endpoint: ${OTLP_ENDPOINT}`);
console.log(`Environment: ${ENVIRONMENT}`);
console.log(`Context7 enabled: true`);

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down OpenTelemetry SDK...');
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.error('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

// Initialize Context7 propagation
import { initializeContext7Propagation } from './context7-propagators.js';

// Initialize Context7 propagators after SDK setup
sdk.start().then(() => {
  initializeContext7Propagation();
  console.log('Context7 propagation initialized');
});

// Export Context7 utilities for manual instrumentation
export const tracer = api.trace.getTracer('meta-agent-factory', SERVICE_VERSION);
export const meter = api.metrics.getMeter('meta-agent-factory', SERVICE_VERSION);

// Context7 Manual Instrumentation Helpers
export class Context7Utils {
  /**
   * Create explicit context boundary for UEP protocol operations
   */
  static async withUEPContext<T>(
    operationName: string,
    uepMetadata: {
      agentId?: string;
      taskId?: string;
      workflowId?: string;
      messageId?: string;
    },
    operation: () => Promise<T>
  ): Promise<T> {
    const span = tracer.startSpan(`uep.${operationName}`, {
      attributes: {
        'uep.operation': operationName,
        'context7.boundary': 'uep-protocol',
        ...uepMetadata,
      },
    });
    
    // Create baggage with UEP metadata
    let baggage = api.propagation.createBaggage();
    if (uepMetadata.agentId) {
      baggage = baggage.setEntry('uep.agent.id', { value: uepMetadata.agentId });
    }
    if (uepMetadata.taskId) {
      baggage = baggage.setEntry('uep.task.id', { value: uepMetadata.taskId });
    }
    if (uepMetadata.workflowId) {
      baggage = baggage.setEntry('uep.workflow.id', { value: uepMetadata.workflowId });
    }
    if (uepMetadata.messageId) {
      baggage = baggage.setEntry('uep.message.id', { value: uepMetadata.messageId });
    }
    
    const contextWithBaggage = api.propagation.setBaggage(api.context.active(), baggage);
    const contextWithSpan = api.trace.setSpan(contextWithBaggage, span);
    
    try {
      return await api.context.with(contextWithSpan, operation);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: api.SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  }
  
  /**
   * Preserve context across async boundaries (Context7 Principle 3)
   */
  static async withAsyncContext<T>(
    context: api.Context,
    operation: () => Promise<T>
  ): Promise<T> {
    return api.context.with(context, operation);
  }
  
  /**
   * Create new root context with explicit boundary (Context7 Principle 1)
   */
  static createRootContext(operationName: string): api.Context {
    const span = tracer.startSpan(operationName, {
      attributes: {
        'context7.boundary': 'root',
        'context7.explicit.creation': 'true',
      },
    });
    
    return api.trace.setSpan(api.context.active(), span);
  }
  
  /**
   * Inject context into UEP message (Context7 Principle 2)
   */
  static injectUEPContext(context: api.Context, message: any): any {
    const headers: Record<string, string> = {};
    api.propagation.inject(context, headers);
    
    return {
      ...message,
      metadata: {
        ...message.metadata,
        traceContext: headers,
      },
    };
  }
  
  /**
   * Extract context from UEP message (Context7 Principle 2)
   */
  static extractUEPContext(message: any): api.Context {
    const headers = message.metadata?.traceContext || {};
    return api.propagation.extract(api.context.active(), headers);
  }
}

console.log('OpenTelemetry initialized with Context7 methodology support');
export default sdk;