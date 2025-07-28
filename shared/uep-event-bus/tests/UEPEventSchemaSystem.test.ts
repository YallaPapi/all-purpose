/**
 * UEP Event Schema System Test Suite
 * 
 * Comprehensive tests for the UEP Event Schema Registry and
 * Schema Enforcement Engine integration.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  UEPEventSchemaRegistry, 
  createDefaultEventSchemaConfig,
  UEPEventSchema,
  UEPEvent,
  EventCategory 
} from '../UEPEventSchemaRegistry';
import { 
  UEPSchemaEnforcementEngine,
  createDefaultEnforcementConfig,
  SchemaViolation 
} from '../UEPSchemaEnforcementEngine';
import { UEPMessage } from '../UEPMessageBroker';

// Test data factories
const createTestEventSchema = (overrides: Partial<UEPEventSchema> = {}): UEPEventSchema => ({
  id: 'test.event.sample',
  version: '1.0.0',
  name: 'Test Sample Event',
  description: 'A test event for validation',
  metadata: {
    category: 'business',
    priority: 'normal',
    scope: 'namespace',
    lifecycle: 'active',
    compatibility: 'backward',
    tags: ['test', 'sample'],
    author: 'Test Suite',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  eventSchema: {
    type: 'object',
    properties: {
      eventId: { type: 'string' },
      eventType: { type: 'string' },
      eventVersion: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
      metadata: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          priority: { type: 'string' },
          scope: { type: 'string' },
          source: {
            type: 'object',
            properties: {
              service: { type: 'string' },
              version: { type: 'string' },
              instance: { type: 'string' },
            },
            required: ['service', 'version', 'instance'],
            additionalProperties: false,
          },
        },
        required: ['category', 'priority', 'scope', 'source'],
        additionalProperties: false,
      },
      agent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['meta', 'domain'] },
          capability: { type: 'string' },
          instance: { type: 'string' },
        },
        required: ['id', 'type', 'capability', 'instance'],
        additionalProperties: false,
      },
      payload: {
        type: 'object',
        properties: {
          testData: { type: 'string' },
          testNumber: { type: 'number' },
          testBoolean: { type: 'boolean' },
        },
        required: ['testData'],
        additionalProperties: true,
      },
      context: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
      },
    },
    required: ['eventId', 'eventType', 'eventVersion', 'timestamp', 'metadata', 'agent', 'payload'],
    additionalProperties: false,
  },
  examples: [{
    name: 'Valid Test Event',
    description: 'A valid test event example',
    valid: true,
    event: {
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
        testData: 'sample data',
        testNumber: 42,
        testBoolean: true,
      },
    },
  }],
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
    testData: 'sample data',
    testNumber: 42,
    testBoolean: true,
  },
  ...overrides,
});

const createTestUEPMessage = (event: UEPEvent): UEPMessage<UEPEvent> => ({
  id: 'msg_' + event.eventId,
  timestamp: new Date(event.timestamp),
  version: '1.0.0',
  protocol: {
    id: 'event-protocol',
    version: '1.0.0',
    capability: 'event-processing',
  },
  routing: {
    subject: `test.event.${event.eventType}`,
    messageType: 'event',
  },
  agent: event.agent,
  tracing: {
    traceId: 'trace_' + event.eventId,
    spanId: 'span_' + event.eventId,
  },
  payload: event,
});

describe('UEPEventSchemaRegistry', () => {
  let registry: UEPEventSchemaRegistry;

  beforeEach(async () => {
    const config = createDefaultEventSchemaConfig();
    registry = new UEPEventSchemaRegistry(config);
    await registry.initialize();
  });

  afterEach(() => {
    registry.removeAllListeners();
  });

  describe('Schema Registration', () => {
    it('should register a valid event schema', () => {
      const schema = createTestEventSchema();
      const result = registry.registerSchema(schema);

      expect(result.success).toBe(true);
      expect(result.schemaId).toBe(schema.id);
      expect(result.version).toBe(schema.version);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject schema with missing required fields', () => {
      const invalidSchema = createTestEventSchema();
      delete (invalidSchema as any).id;

      const result = registry.registerSchema(invalidSchema);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Schema must have id, version, and eventSchema');
    });

    it('should reject schema with invalid version format', () => {
      const invalidSchema = createTestEventSchema({
        version: 'invalid-version',
      });

      const result = registry.registerSchema(invalidSchema);

      expect(result.success).toBe(false);
      expect(result.errors.some(error => 
        error.includes('Version must follow semantic versioning format')
      )).toBe(true);
    });

    it('should emit schema registration events', async () => {
      const schema = createTestEventSchema();
      let eventEmitted = false;

      registry.on('schema:registered', (event) => {
        expect(event.schemaId).toBe(schema.id);
        expect(event.version).toBe(schema.version);
        eventEmitted = true;
      });

      registry.registerSchema(schema);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('Schema Retrieval', () => {
    beforeEach(() => {
      const schema = createTestEventSchema();
      registry.registerSchema(schema);
    });

    it('should retrieve schema by id and version', () => {
      const schema = registry.getSchema('test.event.sample', '1.0.0');

      expect(schema).not.toBeNull();
      expect(schema?.id).toBe('test.event.sample');
      expect(schema?.version).toBe('1.0.0');
    });

    it('should retrieve latest version when no version specified', () => {
      // Register multiple versions
      const v2Schema = createTestEventSchema({ version: '2.0.0' });
      registry.registerSchema(v2Schema);

      const schema = registry.getSchema('test.event.sample');

      expect(schema).not.toBeNull();
      expect(schema?.version).toBe('2.0.0');
    });

    it('should return null for non-existent schema', () => {
      const schema = registry.getSchema('non.existent.schema');
      expect(schema).toBeNull();
    });
  });

  describe('Event Validation', () => {
    beforeEach(() => {
      const schema = createTestEventSchema();
      registry.registerSchema(schema);
    });

    it('should validate a correct event', async () => {
      const event = createTestUEPEvent();
      const result = await registry.validateEvent(event);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject event with missing required fields', async () => {
      const event = createTestUEPEvent();
      delete (event as any).payload.testData; // Required field

      const result = await registry.validateEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SCHEMA_VALIDATION_ERROR',
        })
      );
    });

    it('should reject event with wrong field types', async () => {
      const event = createTestUEPEvent({
        payload: {
          testData: 'sample data',
          testNumber: 'not a number' as any, // Should be number
          testBoolean: true,
        },
      });

      const result = await registry.validateEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return schema not found error for unknown event type', async () => {
      const event = createTestUEPEvent({
        eventType: 'unknown.event.type',
      });

      const result = await registry.validateEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SCHEMA_NOT_FOUND',
        })
      );
    });

    it('should emit validation events', async () => {
      const event = createTestUEPEvent();
      let eventEmitted = false;

      registry.on('event:validated', (validationEvent) => {
        expect(validationEvent.event).toBe(event.eventId);
        expect(validationEvent.schema).toBe('test.event.sample');
        eventEmitted = true;
      });

      await registry.validateEvent(event);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('Schema Organization', () => {
    beforeEach(() => {
      // Register schemas in different categories
      const businessSchema = createTestEventSchema({
        id: 'business.event.sample',
        metadata: {
          ...createTestEventSchema().metadata,
          category: 'business',
        },
      });

      const systemSchema = createTestEventSchema({
        id: 'system.event.sample',
        metadata: {
          ...createTestEventSchema().metadata,
          category: 'system',
        },
      });

      registry.registerSchema(businessSchema);
      registry.registerSchema(systemSchema);
    });

    it('should retrieve schemas by category', () => {
      const businessSchemas = registry.getSchemasByCategory('business');
      const systemSchemas = registry.getSchemasByCategory('system');

      expect(businessSchemas).toHaveLength(1);
      expect(businessSchemas[0].id).toBe('business.event.sample');

      expect(systemSchemas).toHaveLength(1);
      expect(systemSchemas[0].id).toBe('system.event.sample');
    });

    it('should retrieve schemas by type', () => {
      const schemas = registry.getSchemasByType('business.event.sample');

      expect(schemas).toHaveLength(1);
      expect(schemas[0].id).toBe('business.event.sample');
    });

    it('should list all schemas', () => {
      const allSchemas = registry.listSchemas();

      expect(allSchemas.length).toBeGreaterThanOrEqual(2);
      expect(allSchemas.some(s => s.id === 'business.event.sample')).toBe(true);
      expect(allSchemas.some(s => s.id === 'system.event.sample')).toBe(true);
    });
  });

  describe('Event Creation', () => {
    beforeEach(() => {
      const schema = createTestEventSchema();
      registry.registerSchema(schema);
    });

    it('should create event from schema', () => {
      const payload = {
        testData: 'generated data',
        testNumber: 100,
        testBoolean: false,
      };

      const agent = {
        id: 'test-agent-create',
        type: 'meta' as const,
        capability: 'testing',
        instance: 'create-instance',
      };

      const event = registry.createEventFromSchema('test.event.sample', payload, {}, agent);

      expect(event.eventType).toBe('test.event.sample');
      expect(event.payload).toEqual(payload);
      expect(event.agent).toEqual(agent);
      expect(event.eventId).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('should throw error for unknown schema', () => {
      expect(() => {
        registry.createEventFromSchema('unknown.schema', {}, {}, {
          id: 'test-agent',
          type: 'meta',
          capability: 'testing',
          instance: 'instance',
        });
      }).toThrow('Schema not found: unknown.schema');
    });
  });

  describe('Standard Schemas', () => {
    it('should register standard lifecycle schemas on initialization', () => {
      const agentStartedSchema = registry.getSchema('agent.lifecycle.started');
      const taskCompletedSchema = registry.getSchema('task.coordination.completed');

      expect(agentStartedSchema).not.toBeNull();
      expect(taskCompletedSchema).not.toBeNull();
    });

    it('should validate against standard agent started schema', async () => {
      const event: UEPEvent = {
        eventId: 'agent_started_001',
        eventType: 'agent.lifecycle.started',
        eventVersion: '1.0.0',
        timestamp: '2025-01-28T10:00:00.000Z',
        metadata: {
          category: 'lifecycle',
          priority: 'normal',
          scope: 'cluster',
          source: {
            service: 'test-agent',
            version: '1.0.0',
            instance: 'instance-1',
          },
        },
        agent: {
          id: 'test-agent-1',
          type: 'meta',
          capability: 'testing',
          instance: 'instance-1',
        },
        payload: {
          startupTime: 1500,
          capabilities: ['testing', 'validation'],
          dependencies: ['registry'],
        },
      };

      const result = await registry.validateEvent(event);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('UEPSchemaEnforcementEngine', () => {
  let registry: UEPEventSchemaRegistry;
  let enforcement: UEPSchemaEnforcementEngine;

  beforeEach(async () => {
    const registryConfig = createDefaultEventSchemaConfig();
    registry = new UEPEventSchemaRegistry(registryConfig);
    await registry.initialize();

    const enforcementConfig = createDefaultEnforcementConfig();
    enforcement = new UEPSchemaEnforcementEngine(enforcementConfig, registry);
    await enforcement.initialize();

    // Register test schema
    const schema = createTestEventSchema();
    registry.registerSchema(schema);
  });

  afterEach(() => {
    registry.removeAllListeners();
    enforcement.removeAllListeners();
  });

  describe('Message Enforcement', () => {
    it('should enforce valid event message successfully', async () => {
      const event = createTestUEPEvent();
      const message = createTestUEPMessage(event);

      const result = await enforcement.enforceMessage(message);

      expect(result.enforced).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect violations in invalid event message', async () => {
      const invalidEvent = createTestUEPEvent();
      delete (invalidEvent as any).payload.testData; // Required field

      const message = createTestUEPMessage(invalidEvent);
      const result = await enforcement.enforceMessage(message);

      expect(result.enforced).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe('schema_validation_failed');
    });

    it('should handle malformed message structure', async () => {
      const malformedMessage: UEPMessage<any> = {
        id: 'malformed_msg',
        timestamp: new Date(),
        version: '1.0.0',
        protocol: { id: 'test', version: '1.0.0', capability: 'test' },
        routing: { subject: 'test.malformed', messageType: 'event' },
        agent: { id: 'test', type: 'meta', capability: 'test', instance: 'test' },
        tracing: { traceId: 'trace', spanId: 'span' },
        payload: 'not an event', // Invalid payload
      };

      const result = await enforcement.enforceMessage(malformedMessage);

      expect(result.enforced).toBe(true);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: 'malformed_structure',
          severity: 'critical',
        })
      );
    });

    it('should handle unknown event types based on configuration', async () => {
      const unknownEvent = createTestUEPEvent({
        eventType: 'unknown.event.type',
      });
      const message = createTestUEPMessage(unknownEvent);

      const result = await enforcement.enforceMessage(message);

      expect(result.enforced).toBe(true);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          type: 'schema_not_found',
        })
      );
    });

    it('should emit enforcement events', async () => {
      const event = createTestUEPEvent();
      const message = createTestUEPMessage(event);

      let eventEmitted = false;
      enforcement.on('enforcement:completed', (enforcementEvent) => {
        expect(enforcementEvent.messageId).toBe(message.id);
        expect(enforcementEvent.eventId).toBe(event.eventId);
        eventEmitted = true;
      });

      await enforcement.enforceMessage(message);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('Batch Enforcement', () => {
    it('should enforce multiple messages in batch', async () => {
      const events = [
        createTestUEPEvent({ eventId: 'event_1' }),
        createTestUEPEvent({ eventId: 'event_2' }),
        createTestUEPEvent({ eventId: 'event_3' }),
      ];

      const messages = events.map(event => createTestUEPMessage(event));
      const results = await enforcement.enforceMessages(messages);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.enforced)).toBe(true);
      expect(results.every(r => r.allowed)).toBe(true);
    });

    it('should handle mixed valid and invalid messages in batch', async () => {
      const validEvent = createTestUEPEvent({ eventId: 'valid_event' });
      const invalidEvent = createTestUEPEvent({ eventId: 'invalid_event' });
      delete (invalidEvent as any).payload.testData;

      const messages = [
        createTestUEPMessage(validEvent),
        createTestUEPMessage(invalidEvent),
      ];

      const results = await enforcement.enforceMessages(messages);

      expect(results).toHaveLength(2);
      expect(results[0].allowed).toBe(true);
      expect(results[1].violations.length).toBeGreaterThan(0);
    });
  });

  describe('Enforcement Actions', () => {
    it('should execute configured actions for violations', async () => {
      // Update config to reject on schema violations
      enforcement.updateConfig({
        actions: {
          onSchemaViolation: ['reject', 'log'],
          onUnknownEvent: ['log'],
          onMalformedEvent: ['reject'],
          onEvolutionDetected: ['log'],
        },
      });

      const invalidEvent = createTestUEPEvent();
      delete (invalidEvent as any).payload.testData;

      const message = createTestUEPMessage(invalidEvent);
      const result = await enforcement.enforceMessage(message);

      expect(result.allowed).toBe(false);
      expect(result.actions.some(a => a.action === 'reject')).toBe(true);
      expect(result.actions.some(a => a.action === 'log')).toBe(true);
    });

    it('should emit violation notifications', async () => {
      const invalidEvent = createTestUEPEvent();
      delete (invalidEvent as any).payload.testData;

      let logEmitted = false;
      enforcement.on('violation:logged', () => {
        logEmitted = true;
      });

      const message = createTestUEPMessage(invalidEvent);
      await enforcement.enforceMessage(message);

      expect(logEmitted).toBe(true);
    });
  });

  describe('Event Transformations', () => {
    it('should register and use custom transformers', async () => {
      const customTransformer = {
        name: 'test-transformer',
        description: 'Test transformer',
        supportedTransformations: ['field_type_conversion' as const],
        async transform(event: UEPEvent) {
          // Simple transformation for testing
          return { ...event };
        },
        canTransform(violation: SchemaViolation) {
          return violation.type === 'invalid_field_type';
        },
      };

      enforcement.registerTransformer(customTransformer);

      let transformerRegistered = false;
      enforcement.on('transformer:registered', (event) => {
        expect(event.name).toBe(customTransformer.name);
        transformerRegistered = true;
      });

      expect(transformerRegistered).toBe(true);
    });

    it('should attempt transformations for compatible violations', async () => {
      // Create event with type mismatch that can be transformed
      const event = createTestUEPEvent({
        payload: {
          testData: 'sample data',
          testNumber: '42' as any, // String instead of number
          testBoolean: true,
        },
      });

      const message = createTestUEPMessage(event);
      const result = await enforcement.enforceMessage(message);

      // The built-in transformer should attempt to convert string to number
      expect(result.transformations.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track enforcement statistics', async () => {
      const validEvent = createTestUEPEvent();
      const invalidEvent = createTestUEPEvent();
      delete (invalidEvent as any).payload.testData;

      const messages = [
        createTestUEPMessage(validEvent),
        createTestUEPMessage(invalidEvent),
      ];

      await Promise.all(messages.map(msg => enforcement.enforceMessage(msg)));

      const stats = enforcement.getStats();
      expect(stats.totalEnforcements).toBe(2);
      expect(stats.successfulEnforcements).toBe(1);
      expect(stats.violationsDetected).toBeGreaterThan(0);
      expect(stats.averageEnforcementTime).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      const event = createTestUEPEvent();
      const message = createTestUEPMessage(event);

      await enforcement.enforceMessage(message);

      let stats = enforcement.getStats();
      expect(stats.totalEnforcements).toBeGreaterThan(0);

      enforcement.resetStats();
      stats = enforcement.getStats();
      expect(stats.totalEnforcements).toBe(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update enforcement configuration at runtime', () => {
      const newConfig = {
        policies: {
          strictEnforcement: true,
          enforcementLevel: 'strict' as const,
        },
      };

      let configUpdated = false;
      enforcement.on('config:updated', (event) => {
        expect(event.config.policies.strictEnforcement).toBe(true);
        configUpdated = true;
      });

      enforcement.updateConfig(newConfig);
      expect(configUpdated).toBe(true);
    });

    it('should respect enforcement level changes', async () => {
      // Set enforcement to disabled
      enforcement.updateConfig({
        policies: {
          enforcementLevel: 'disabled',
        },
      });

      const invalidEvent = createTestUEPEvent();
      delete (invalidEvent as any).payload.testData;

      const message = createTestUEPMessage(invalidEvent);
      const result = await enforcement.enforceMessage(message);

      expect(result.allowed).toBe(true); // Should be allowed when disabled
      expect(result.violations).toHaveLength(0);
    });
  });
});

describe('Integration Tests', () => {
  describe('Registry + Enforcement Integration', () => {
    it('should work together seamlessly for event lifecycle', async () => {
      const registryConfig = createDefaultEventSchemaConfig();
      const registry = new UEPEventSchemaRegistry(registryConfig);
      await registry.initialize();

      const enforcementConfig = createDefaultEnforcementConfig();
      const enforcement = new UEPSchemaEnforcementEngine(enforcementConfig, registry);
      await enforcement.initialize();

      // Register a custom schema
      const customSchema = createTestEventSchema({
        id: 'integration.test.event',
        metadata: {
          ...createTestEventSchema().metadata,
          category: 'integration',
        },
      });

      const registrationResult = registry.registerSchema(customSchema);
      expect(registrationResult.success).toBe(true);

      // Create and validate an event
      const event = registry.createEventFromSchema(
        'integration.test.event',
        { testData: 'integration test', testNumber: 999, testBoolean: true },
        { correlationId: 'integration-test-1' },
        {
          id: 'integration-agent',
          type: 'meta',
          capability: 'integration-testing',
          instance: 'test-instance',
        }
      );

      const validationResult = await registry.validateEvent(event);
      expect(validationResult.valid).toBe(true);

      // Enforce the message
      const message = createTestUEPMessage(event);
      const enforcementResult = await enforcement.enforceMessage(message);

      expect(enforcementResult.enforced).toBe(true);
      expect(enforcementResult.allowed).toBe(true);
      expect(enforcementResult.violations).toHaveLength(0);

      registry.removeAllListeners();
      enforcement.removeAllListeners();
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle high-volume event validation efficiently', async () => {
      const registryConfig = createDefaultEventSchemaConfig();
      registryConfig.performance.enableCaching = true;
      
      const registry = new UEPEventSchemaRegistry(registryConfig);
      await registry.initialize();

      // Register schema
      const schema = createTestEventSchema();
      registry.registerSchema(schema);

      const eventCount = 1000;
      const events = Array.from({ length: eventCount }, (_, i) =>
        createTestUEPEvent({ eventId: `perf_test_${i}` })
      );

      const startTime = Date.now();
      const results = await Promise.all(events.map(event => registry.validateEvent(event)));
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const eventsPerSecond = eventCount / (totalTime / 1000);

      expect(results).toHaveLength(eventCount);
      expect(results.every(r => r.valid)).toBe(true);
      expect(eventsPerSecond).toBeGreaterThan(500); // Should validate >500 events/sec

      registry.removeAllListeners();
    });

    it('should demonstrate enforcement engine performance', async () => {
      const registryConfig = createDefaultEventSchemaConfig();
      const registry = new UEPEventSchemaRegistry(registryConfig);
      await registry.initialize();

      const enforcementConfig = createDefaultEnforcementConfig();
      enforcementConfig.performance.batchValidation = true;
      
      const enforcement = new UEPSchemaEnforcementEngine(enforcementConfig, registry);
      await enforcement.initialize();

      // Register schema
      const schema = createTestEventSchema();
      registry.registerSchema(schema);

      const messageCount = 500;
      const messages = Array.from({ length: messageCount }, (_, i) => {
        const event = createTestUEPEvent({ eventId: `enforce_test_${i}` });
        return createTestUEPMessage(event);
      });

      const startTime = Date.now();
      const results = await enforcement.enforceMessages(messages);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const messagesPerSecond = messageCount / (totalTime / 1000);

      expect(results).toHaveLength(messageCount);
      expect(results.every(r => r.enforced)).toBe(true);
      expect(messagesPerSecond).toBeGreaterThan(200); // Should enforce >200 messages/sec

      const stats = enforcement.getStats();
      expect(stats.totalEnforcements).toBe(messageCount);
      expect(stats.averageEnforcementTime).toBeLessThan(50); // Should be <50ms average

      registry.removeAllListeners();
      enforcement.removeAllListeners();
    });
  });
});

describe('Configuration and Defaults', () => {
  it('should create valid default registry configuration', () => {
    const config = createDefaultEventSchemaConfig();

    expect(config.schema.enableVersioning).toBe(true);
    expect(config.performance.enableCaching).toBe(true);
    expect(config.validation.enableRuntimeValidation).toBe(true);
    expect(config.registry.allowDynamicRegistration).toBe(true);
  });

  it('should create valid default enforcement configuration', () => {
    const config = createDefaultEnforcementConfig();

    expect(config.policies.enforcementLevel).toBe('moderate');
    expect(config.actions.onMalformedEvent).toContain('reject');
    expect(config.performance.enableMetrics).toBe(true);
    expect(config.integration.enableMiddlewareIntegration).toBe(true);
  });
});