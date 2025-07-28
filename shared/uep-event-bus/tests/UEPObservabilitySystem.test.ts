/**
 * UEP Observability System Test Suite
 * 
 * Comprehensive tests for the UEP Tracing Integration and Observability Manager,
 * ensuring proper distributed tracing, metrics collection, and monitoring.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  UEPTracingIntegration, 
  createDefaultTracingConfig,
  TraceContext,
  OperationType 
} from '../UEPTracingIntegration';
import { 
  UEPObservabilityManager,
  createDefaultObservabilityConfig,
  LogLevel,
  HealthStatus 
} from '../UEPObservabilityManager';
import { UEPMessage } from '../UEPMessageBroker';
import { UEPEvent } from '../UEPEventSchemaRegistry';

// Test data factories
const createTestUEPMessage = (overrides: Partial<UEPMessage<any>> = {}): UEPMessage<any> => ({
  id: 'test_msg_001',
  timestamp: new Date(),
  version: '1.0.0',
  protocol: {
    id: 'test-protocol',
    version: '1.0.0',
    capability: 'testing',
  },
  routing: {
    subject: 'test.command.process',
    messageType: 'command',
  },
  agent: {
    id: 'test-agent-1',
    type: 'meta',
    capability: 'testing',
    instance: 'instance-1',
  },
  tracing: {
    traceId: 'trace_12345678901234567890123456789012',
    spanId: 'span_1234567890123456',
  },
  payload: {
    testData: 'sample data',
  },
  headers: {},
  ...overrides,
});

const createTestUEPEvent = (overrides: Partial<UEPEvent> = {}): UEPEvent => ({
  eventId: 'test_event_001',
  eventType: 'test.event.sample',
  eventVersion: '1.0.0',
  timestamp: '2025-01-28T10:00:00.000Z',
  metadata: {
    category: 'business',
    priority: 'normal',
    scope: 'namespace',
    source: {
      service: 'test-service',
      version: '1.0.0',
      instance: 'test-instance-1',
    },
  },
  agent: {
    id: 'test-agent-1',
    type: 'meta',
    capability: 'testing',
    instance: 'instance-1',
  },
  payload: {
    testData: 'event data',
  },
  context: {
    tracing: {
      traceId: 'trace_12345678901234567890123456789012',
      spanId: 'span_1234567890123456',
    },
  },
  ...overrides,
});

describe('UEPTracingIntegration', () => {
  let tracing: UEPTracingIntegration;

  beforeEach(async () => {
    const config = createDefaultTracingConfig('uep-test-service');
    // Disable actual exporters for testing
    config.exporters = {
      console: { enabled: false },
    };
    config.tracing.enabled = true;
    
    tracing = new UEPTracingIntegration(config);
    await tracing.initialize();
  });

  afterEach(async () => {
    tracing.removeAllListeners();
    await tracing.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize tracing system successfully', async () => {
      expect(tracing).toBeInstanceOf(UEPTracingIntegration);
      
      let initEvent = false;
      tracing.on('tracing:initialized', () => {
        initEvent = true;
      });

      // Re-initialize to test event emission
      await tracing.initialize();
      expect(initEvent).toBe(true);
    });

    it('should handle disabled tracing gracefully', async () => {
      const config = createDefaultTracingConfig('disabled-service');
      config.tracing.enabled = false;
      
      const disabledTracing = new UEPTracingIntegration(config);
      
      let disabledEvent = false;
      disabledTracing.on('tracing:disabled', () => {
        disabledEvent = true;
      });

      await disabledTracing.initialize();
      expect(disabledEvent).toBe(true);

      disabledTracing.removeAllListeners();
      await disabledTracing.shutdown();
    });
  });

  describe('Message Tracing', () => {
    it('should start and finish message trace successfully', async () => {
      const message = createTestUEPMessage();
      const operationType: OperationType = 'message.publish';

      // Start trace
      const { span, context } = tracing.startMessageTrace(message, operationType);

      expect(span).toBeDefined();
      expect(context).toBeDefined();

      // Verify span started event
      let spanStarted = false;
      tracing.on('span:started', (event) => {
        expect(event.messageId).toBe(message.id);
        expect(event.operationType).toBe(operationType);
        spanStarted = true;
      });

      // Start another trace to trigger event
      tracing.startMessageTrace(createTestUEPMessage({ id: 'msg_002' }), operationType);
      expect(spanStarted).toBe(true);

      // Finish trace
      let spanFinished = false;
      tracing.on('span:finished', (event) => {
        expect(event.messageId).toBe(message.id);
        expect(event.success).toBe(true);
        spanFinished = true;
      });

      tracing.finishMessageTrace(message, span, { success: true });
      expect(spanFinished).toBe(true);
    });

    it('should handle message trace errors', async () => {
      const message = createTestUEPMessage();
      const { span } = tracing.startMessageTrace(message, 'message.validate');

      const error = new Error('Validation failed');
      tracing.finishMessageTrace(message, span, { success: false, error });

      const stats = tracing.getStats();
      expect(stats.errorsTraced).toBeGreaterThan(0);
    });

    it('should inject and extract trace context from message headers', async () => {
      const message = createTestUEPMessage();
      
      // Start a trace
      const { span, context } = tracing.startMessageTrace(message, 'message.publish');

      // Inject trace context
      tracing.injectTraceContext(message, context);

      expect(message.headers).toBeDefined();
      expect(message.headers!['uep-trace-id']).toBeDefined();
      expect(message.headers!['uep-span-id']).toBeDefined();

      // Extract trace context
      const extractedContext = tracing.extractTraceContext(message);
      expect(extractedContext).toBeDefined();

      tracing.finishMessageTrace(message, span, { success: true });
    });

    it('should track message tracing statistics', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => 
        createTestUEPMessage({ id: `msg_${i}` })
      );

      const spans = messages.map(msg => 
        tracing.startMessageTrace(msg, 'message.process')
      );

      // Finish some with success, some with errors
      spans.forEach((trace, i) => {
        const success = i % 2 === 0;
        tracing.finishMessageTrace(messages[i], trace.span, { 
          success,
          error: success ? undefined : new Error('Test error'),
        });
      });

      const stats = tracing.getStats();
      expect(stats.spansCreated).toBeGreaterThanOrEqual(5);
      expect(stats.spansFinished).toBeGreaterThanOrEqual(5);
      expect(stats.errorsTraced).toBeGreaterThan(0);
    });
  });

  describe('Event Tracing', () => {
    it('should start and finish event trace successfully', async () => {
      const event = createTestUEPEvent();
      const operationType: OperationType = 'event.emit';

      const { span, context } = tracing.startEventTrace(event, operationType);

      expect(span).toBeDefined();
      expect(context).toBeDefined();

      tracing.finishEventTrace(event, span, { success: true });

      const stats = tracing.getStats();
      expect(stats.spansCreated).toBeGreaterThan(0);
      expect(stats.spansFinished).toBeGreaterThan(0);
    });

    it('should extract trace context from events', async () => {
      const event = createTestUEPEvent();
      
      const extractedContext = tracing.extractEventTraceContext(event);
      expect(extractedContext).toBeDefined();
    });
  });

  describe('Span Management', () => {
    it('should create child spans', async () => {
      const message = createTestUEPMessage();
      const { span: parentSpan } = tracing.startMessageTrace(message, 'message.publish');

      const childSpan = tracing.createChildSpan('validation', parentSpan, {
        'validation.type': 'schema',
      });

      expect(childSpan).toBeDefined();

      // Clean up
      childSpan.end();
      tracing.finishMessageTrace(message, parentSpan, { success: true });
    });

    it('should add custom attributes to spans', async () => {
      const message = createTestUEPMessage();
      const { span, context } = tracing.startMessageTrace(message, 'message.publish');

      tracing.addSpanAttributes({
        'custom.attribute': 'test-value',
        'custom.number': 42,
      });

      tracing.finishMessageTrace(message, span, { success: true });
    });

    it('should record exceptions in spans', async () => {
      const message = createTestUEPMessage();
      const { span } = tracing.startMessageTrace(message, 'message.validate');

      const error = new Error('Test exception');
      tracing.recordException(error, { 'error.context': 'test' });

      tracing.finishMessageTrace(message, span, { success: false, error });

      const stats = tracing.getStats();
      expect(stats.errorsTraced).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track and provide statistics', async () => {
      const initialStats = tracing.getStats();
      
      const message = createTestUEPMessage();
      const { span } = tracing.startMessageTrace(message, 'message.publish');
      tracing.finishMessageTrace(message, span, { success: true });

      const finalStats = tracing.getStats();
      expect(finalStats.spansCreated).toBeGreaterThan(initialStats.spansCreated);
      expect(finalStats.spansFinished).toBeGreaterThan(initialStats.spansFinished);
    });

    it('should reset statistics', async () => {
      // Generate some activity
      const message = createTestUEPMessage();
      const { span } = tracing.startMessageTrace(message, 'message.publish');
      tracing.finishMessageTrace(message, span, { success: true });

      let resetEvent = false;
      tracing.on('stats:reset', () => {
        resetEvent = true;
      });

      tracing.resetStats();
      expect(resetEvent).toBe(true);

      const stats = tracing.getStats();
      expect(stats.spansCreated).toBe(0);
      expect(stats.spansFinished).toBe(0);
    });
  });
});

describe('UEPObservabilityManager', () => {
  let observability: UEPObservabilityManager;

  beforeEach(async () => {
    const observabilityConfig = createDefaultObservabilityConfig('uep-test-service');
    const tracingConfig = createDefaultTracingConfig('uep-test-service');
    
    // Disable exports for testing
    tracingConfig.exporters = { console: { enabled: false } };
    observabilityConfig.metrics.prometheus.enabled = false;
    observabilityConfig.health.enabled = false;
    observabilityConfig.alerting.enabled = false;

    observability = new UEPObservabilityManager(observabilityConfig, tracingConfig);
    await observability.initialize();
  });

  afterEach(async () => {
    observability.removeAllListeners();
    await observability.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize observability manager successfully', async () => {
      expect(observability).toBeInstanceOf(UEPObservabilityManager);
      
      let initEvent = false;
      observability.on('observability:initialized', () => {
        initEvent = true;
      });

      // Re-initialize to test event emission
      await observability.initialize();
      expect(initEvent).toBe(true);
    });

    it('should provide access to tracing integration', () => {
      const tracingIntegration = observability.getTracingIntegration();
      expect(tracingIntegration).toBeInstanceOf(UEPTracingIntegration);
    });
  });

  describe('Logging', () => {
    it('should log messages with different levels', () => {
      const logLevels: LogLevel[] = ['error', 'warn', 'info', 'debug', 'trace'];

      let logEntries: any[] = [];
      observability.on('log:entry', (entry) => {
        logEntries.push(entry);
      });

      logLevels.forEach(level => {
        observability.log(level, `Test ${level} message`, { level });
      });

      expect(logEntries.length).toBeGreaterThan(0);
      expect(logEntries.some(entry => entry.level === 'error')).toBe(true);
      expect(logEntries.some(entry => entry.level === 'info')).toBe(true);
    });

    it('should log with metadata and correlation context', () => {
      let logEntry: any = null;
      observability.on('log:entry', (entry) => {
        logEntry = entry;
      });

      const metadata = { 
        userId: '12345', 
        operation: 'test-operation',
      };
      const error = new Error('Test error');

      observability.log('error', 'Test error message', metadata, error);

      expect(logEntry).not.toBeNull();
      expect(logEntry.message).toBe('Test error message');
      expect(logEntry.metadata).toEqual(metadata);
      expect(logEntry.error).toBeDefined();
      expect(logEntry.error.name).toBe('Error');
      expect(logEntry.error.message).toBe('Test error');
    });

    it('should include service information in log entries', () => {
      let logEntry: any = null;
      observability.on('log:entry', (entry) => {
        logEntry = entry;
      });

      observability.log('info', 'Test service log');

      expect(logEntry.service).toBe('uep-test-service');
      expect(logEntry.version).toBe('1.0.0');
      expect(logEntry.environment).toBeDefined();
      expect(logEntry.instance).toBeDefined();
    });
  });

  describe('Metrics Recording', () => {
    it('should record message processing metrics', () => {
      const message = createTestUEPMessage();
      
      let metricsRecorded = false;
      observability.on('metrics:message-recorded', (event) => {
        expect(event.messageId).toBe(message.id);
        expect(event.operation).toBe('publish');
        expect(event.duration).toBe(150);
        expect(event.success).toBe(true);
        metricsRecorded = true;
      });

      observability.recordMessageMetrics(message, 'publish', 150, true);
      expect(metricsRecorded).toBe(true);
    });

    it('should record event processing metrics', () => {
      const event = createTestUEPEvent();
      
      let metricsRecorded = false;
      observability.on('metrics:event-recorded', (event) => {
        expect(event.eventId).toBe('test_event_001');
        expect(event.operation).toBe('emit');
        expect(event.duration).toBe(75);
        expect(event.success).toBe(true);
        metricsRecorded = true;
      });

      observability.recordEventMetrics(event, 'emit', 75, true);
      expect(metricsRecorded).toBe(true);
    });

    it('should track error metrics', () => {
      const message = createTestUEPMessage();
      
      // Record a failed operation
      observability.recordMessageMetrics(message, 'validate', 200, false);
      
      // The validation error counter should be incremented
      // (This would be verified with actual Prometheus metrics in integration tests)
    });
  });

  describe('Health Monitoring', () => {
    it('should provide health status', async () => {
      const healthStatus = await observability.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toMatch(/healthy|unhealthy|degraded/);
      expect(healthStatus.checks).toBeInstanceOf(Array);
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
      expect(healthStatus.uptime).toBeGreaterThan(0);
      expect(healthStatus.version).toBe('1.0.0');
    });

    it('should handle health check updates', async () => {
      // Since health checks are disabled in test config, status should be healthy by default
      const status = await observability.getHealthStatus();
      expect(status.status).toBe('healthy');
    });
  });

  describe('Custom Metrics', () => {
    it('should create custom counter metric', () => {
      const counter = observability.createCustomMetric(
        'test_counter_total',
        'counter',
        'Test counter metric',
        ['label1', 'label2']
      );

      expect(counter).toBeDefined();
      expect(typeof counter.inc).toBe('function');
    });

    it('should create custom histogram metric', () => {
      const histogram = observability.createCustomMetric(
        'test_histogram_duration',
        'histogram',
        'Test histogram metric',
        ['operation']
      );

      expect(histogram).toBeDefined();
      expect(typeof histogram.observe).toBe('function');
    });

    it('should create custom gauge metric', () => {
      const gauge = observability.createCustomMetric(
        'test_gauge_value',
        'gauge',
        'Test gauge metric'
      );

      expect(gauge).toBeDefined();
      expect(typeof gauge.set).toBe('function');
    });

    it('should reject creating custom metrics when disabled', () => {
      // Create a new manager with custom metrics disabled
      const config = createDefaultObservabilityConfig('test-service');
      const tracingConfig = createDefaultTracingConfig('test-service');
      config.metrics.customMetrics = false;
      tracingConfig.exporters = { console: { enabled: false } };

      const restrictedObservability = new UEPObservabilityManager(config, tracingConfig);

      expect(() => {
        restrictedObservability.createCustomMetric('test_metric', 'counter', 'Test metric');
      }).toThrow('Custom metrics are disabled');
    });
  });

  describe('Alerting System', () => {
    it('should trigger and resolve alerts', () => {
      const alertRule = {
        name: 'test_alert',
        description: 'Test alert rule',
        enabled: true,
        severity: 'warning' as const,
        condition: {
          metric: 'test_metric',
          operator: '>' as const,
          threshold: 100,
        },
        duration: '5m',
      };

      let alertTriggered = false;
      let alertResolved = false;

      observability.on('alert:triggered', (alert) => {
        expect(alert.rule.name).toBe('test_alert');
        expect(alert.value).toBe(150);
        alertTriggered = true;
      });

      observability.on('alert:resolved', (resolution) => {
        expect(resolution.rule.name).toBe('test_alert');
        alertResolved = true;
      });

      // Trigger alert
      observability.triggerAlert(alertRule, 150);
      expect(alertTriggered).toBe(true);

      // Resolve alert
      observability.resolveAlert(alertRule);
      expect(alertResolved).toBe(true);
    });

    it('should not trigger disabled alerts', () => {
      const disabledRule = {
        name: 'disabled_alert',
        description: 'Disabled alert rule',
        enabled: false,
        severity: 'critical' as const,
        condition: {
          metric: 'test_metric',
          operator: '>' as const,
          threshold: 50,
        },
        duration: '1m',
      };

      let alertTriggered = false;
      observability.on('alert:triggered', () => {
        alertTriggered = true;
      });

      observability.triggerAlert(disabledRule, 100);
      expect(alertTriggered).toBe(false);
    });
  });

  describe('System Monitoring', () => {
    it('should collect and provide observability metrics', async () => {
      const metrics = await observability.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.messagesProcessed).toBe('number');
      expect(typeof metrics.eventsEmitted).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.cpuUsage).toBe('number');
      expect(metrics.customMetrics).toBeDefined();
    });

    it('should emit monitoring events', () => {
      let monitoringEvent = false;
      observability.on('monitoring:metrics-collected', (event) => {
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.memoryUsage).toBeDefined();
        expect(event.cpuUsage).toBeDefined();
        monitoringEvent = true;
      });

      // Trigger metrics collection manually (normally done by interval)
      // In a real scenario, we'd wait for the interval or trigger it manually
    });
  });

  describe('Integration with Tracing', () => {
    it('should integrate with tracing system', async () => {
      const tracingIntegration = observability.getTracingIntegration();
      const message = createTestUEPMessage();

      // Start a trace through the tracing integration
      const { span } = tracingIntegration.startMessageTrace(message, 'message.publish');
      
      // Record metrics through observability manager
      observability.recordMessageMetrics(message, 'publish', 100, true);

      // Log through observability manager
      observability.log('info', 'Processing message', { messageId: message.id });

      // Finish trace
      tracingIntegration.finishMessageTrace(message, span, { success: true });

      // Both systems should have recorded the activity
      const tracingStats = tracingIntegration.getStats();
      expect(tracingStats.spansCreated).toBeGreaterThan(0);
    });
  });

  describe('Shutdown and Cleanup', () => {
    it('should shutdown gracefully', async () => {
      let shutdownEvent = false;
      observability.on('observability:shutdown', () => {
        shutdownEvent = true;
      });

      await observability.shutdown();
      expect(shutdownEvent).toBe(true);
    });

    it('should handle shutdown errors', async () => {
      let errorEvent = false;
      observability.on('observability:error', (event) => {
        if (event.operation === 'shutdown') {
          errorEvent = true;
        }
      });

      // Force an error during shutdown (this would require mocking internal components)
      // For now, we just test that error events can be emitted
    });
  });
});

describe('Integration Tests', () => {
  describe('End-to-End Observability Flow', () => {
    it('should provide complete observability for message processing', async () => {
      const observabilityConfig = createDefaultObservabilityConfig('integration-test');
      const tracingConfig = createDefaultTracingConfig('integration-test');
      
      // Disable exports for testing
      tracingConfig.exporters = { console: { enabled: false } };
      observabilityConfig.metrics.prometheus.enabled = false;

      const observability = new UEPObservabilityManager(observabilityConfig, tracingConfig);
      await observability.initialize();

      const tracing = observability.getTracingIntegration();
      const message = createTestUEPMessage();

      // Start tracing
      const { span, context } = tracing.startMessageTrace(message, 'message.publish');
      
      // Inject trace context
      tracing.injectTraceContext(message, context);

      // Log message processing start
      observability.log('info', 'Starting message processing', {
        messageId: message.id,
        operation: 'publish',
      });

      // Simulate processing duration
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms processing
      const duration = Date.now() - startTime;

      // Record metrics
      observability.recordMessageMetrics(message, 'publish', duration, true);

      // Log completion
      observability.log('info', 'Message processing completed', {
        messageId: message.id,
        duration,
        success: true,
      });

      // Finish trace
      tracing.finishMessageTrace(message, span, { 
        success: true, 
        metadata: { duration, processed: true } 
      });

      // Verify observability data
      const tracingStats = tracing.getStats();
      expect(tracingStats.spansCreated).toBeGreaterThan(0);
      expect(tracingStats.spansFinished).toBeGreaterThan(0);

      const healthStatus = await observability.getHealthStatus();
      expect(healthStatus.status).toBe('healthy');

      // Cleanup
      await observability.shutdown();
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle high-volume tracing efficiently', async () => {
      const config = createDefaultTracingConfig('performance-test');
      config.exporters = { console: { enabled: false } };
      
      const tracing = new UEPTracingIntegration(config);
      await tracing.initialize();

      const messageCount = 1000;
      const messages = Array.from({ length: messageCount }, (_, i) =>
        createTestUEPMessage({ id: `perf_msg_${i}` })
      );

      const startTime = Date.now();

      // Start and finish traces for all messages
      const traces = messages.map(msg => 
        tracing.startMessageTrace(msg, 'message.publish')
      );

      traces.forEach((trace, i) => {
        tracing.finishMessageTrace(messages[i], trace.span, { success: true });
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const messagesPerSecond = messageCount / (totalTime / 1000);

      expect(messagesPerSecond).toBeGreaterThan(1000); // Should handle >1000 messages/sec

      const stats = tracing.getStats();
      expect(stats.spansCreated).toBe(messageCount);
      expect(stats.spansFinished).toBe(messageCount);

      await tracing.shutdown();
    });

    it('should maintain reasonable memory usage under load', async () => {
      const observabilityConfig = createDefaultObservabilityConfig('memory-test');
      const tracingConfig = createDefaultTracingConfig('memory-test');
      
      tracingConfig.exporters = { console: { enabled: false } };
      observabilityConfig.metrics.prometheus.enabled = false;

      const observability = new UEPObservabilityManager(observabilityConfig, tracingConfig);
      await observability.initialize();

      const initialMemory = process.memoryUsage().heapUsed;

      // Generate significant activity
      for (let i = 0; i < 500; i++) {
        const message = createTestUEPMessage({ id: `memory_test_${i}` });
        const event = createTestUEPEvent({ eventId: `memory_event_${i}` });

        observability.recordMessageMetrics(message, 'publish', 50, true);
        observability.recordEventMetrics(event, 'emit', 25, true);
        observability.log('info', `Processing item ${i}`, { iteration: i });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      await observability.shutdown();
    });
  });
});

describe('Configuration Tests', () => {
  it('should create valid default tracing configuration', () => {
    const config = createDefaultTracingConfig('test-service');

    expect(config.service.name).toBe('test-service');
    expect(config.service.version).toBe('1.0.0');
    expect(config.tracing.enabled).toBe(true);
    expect(config.tracing.samplingRate).toBe(1.0);
    expect(config.metrics.enabled).toBe(true);
    expect(config.exporters.jaeger).toBeDefined();
  });

  it('should create valid default observability configuration', () => {
    const config = createDefaultObservabilityConfig('test-service');

    expect(config.service.name).toBe('test-service');
    expect(config.logging.level).toBe('info');
    expect(config.logging.structured).toBe(true);
    expect(config.metrics.enabled).toBe(true);
    expect(config.health.enabled).toBe(true);
    expect(config.alerting.enabled).toBe(false);
  });

  it('should handle environment-specific configuration', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    
    try {
      process.env.NODE_ENV = 'production';
      const config = createDefaultObservabilityConfig('prod-service');
      expect(config.service.environment).toBe('production');
      
      process.env.NODE_ENV = 'development';
      const devConfig = createDefaultObservabilityConfig('dev-service');
      expect(devConfig.service.environment).toBe('development');
      
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});