/**
 * OpenTelemetry Instrumentation for Capability Management Service
 * Context7 Methodology Implementation
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as api from '@opentelemetry/api';

// Service Configuration
const SERVICE_NAME = 'capability-management';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// OpenTelemetry Configuration
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

// Context7 Resource Configuration for Capability Management
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
  [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'meta-agent-factory',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
  
  // Capability Management specific attributes
  'meta-agent.service.type': 'capability-management',
  'uep.capability.registry': 'true',
  'context7.enabled': 'true',
  'container.id': process.env.HOSTNAME || 'unknown',
});

// Initialize SDK
const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: `${OTLP_ENDPOINT}/v1/traces`,
  }),
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': {
      enabled: true,
      ignoreIncomingRequestHook: (req) => {
        const ignoredPaths = ['/health', '/metrics', '/ready'];
        return ignoredPaths.some(path => req.url?.includes(path));
      },
      requestHook: (span, request) => {
        span.setAttributes({
          'capability.service.request': 'true',
          'uep.capability.operation': request.url || 'unknown',
        });
      },
    },
    '@opentelemetry/instrumentation-express': {
      enabled: true,
    },
    '@opentelemetry/instrumentation-redis': {
      enabled: true,
    },
  })],
});

console.log(`Initializing OpenTelemetry for ${SERVICE_NAME}...`);
sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry terminated'))
    .catch((error) => console.error('Error terminating OpenTelemetry', error))
    .finally(() => process.exit(0));
});

// Export utilities
export const tracer = api.trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
export const meter = api.metrics.getMeter(SERVICE_NAME, SERVICE_VERSION);

export default sdk;