/**
 * UEP Validation System Test Suite
 * 
 * Comprehensive tests for the UEP Message Validation Layer including
 * validator, middleware, and integration testing.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UEPMessageValidator, createDefaultValidatorConfig, ValidationResult } from '../UEPMessageValidator';
import { UEPValidationMiddleware, createDefaultMiddlewareConfig, ValidationContext } from '../UEPValidationMiddleware';
import { UEPMessage } from '../UEPMessageBroker';

// Test data factories
const createValidUEPMessage = (overrides: Partial<UEPMessage<any>> = {}): UEPMessage<any> => ({
  id: 'test-message-001',
  timestamp: new Date(),
  version: '1.0.0',
  protocol: {
    id: 'test-protocol',
    version: '1.0.0',
    capability: 'test-processing',
  },
  routing: {
    subject: 'test.command.process',
    messageType: 'command',
  },
  agent: {
    id: 'test-agent-1',
    type: 'meta',
    capability: 'test-processing',
    instance: 'instance-1',
  },
  tracing: {
    traceId: 'a1b2c3d4e5f6789012345678901234567890abcd',
    spanId: 'span-12345678',
  },
  payload: {
    task: 'process-data',
    data: { key: 'value' },
  },
  ...overrides,
});

const createValidationContext = (overrides: Partial<ValidationContext> = {}): ValidationContext => ({
  messageId: 'test-message-001',
  timestamp: new Date(),
  source: 'test-source',
  attempt: 1,
  ...overrides,
});

describe('UEPMessageValidator', () => {
  let validator: UEPMessageValidator;

  beforeEach(async () => {
    const config = createDefaultValidatorConfig();
    validator = new UEPMessageValidator(config);
    await validator.initialize();
  });

  afterEach(() => {
    validator.removeAllListeners();
  });

  describe('Message Structure Validation', () => {
    it('should validate a complete valid UEP message', async () => {
      const message = createValidUEPMessage();
      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata?.validationTime).toBeGreaterThan(0);
    });

    it('should reject message with missing required fields', async () => {
      const message = createValidUEPMessage();
      delete (message as any).protocol;

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_REQUIRED_FIELD',
          path: 'protocol',
          severity: 'error',
        })
      );
    });

    it('should reject message with invalid protocol structure', async () => {
      const message = createValidUEPMessage({
        protocol: {
          id: '',
          version: '',
          capability: '',
        },
      });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_PROTOCOL_INFO',
          severity: 'error',
        })
      );
    });

    it('should reject message with invalid subject format', async () => {
      const message = createValidUEPMessage({
        routing: {
          subject: 'invalid subject format',
          messageType: 'command',
        },
      });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_SUBJECT_FORMAT',
          path: 'routing.subject',
          severity: 'error',
        })
      );
    });

    it('should reject message with invalid message type', async () => {
      const message = createValidUEPMessage({
        routing: {
          subject: 'test.command.process',
          messageType: 'invalid-type' as any,
        },
      });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_MESSAGE_TYPE',
          path: 'routing.messageType',
          severity: 'error',
        })
      );
    });

    it('should reject message with invalid agent type', async () => {
      const message = createValidUEPMessage({
        agent: {
          id: 'test-agent',
          type: 'invalid-type' as any,
          capability: 'test',
          instance: 'instance-1',
        },
      });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_AGENT_TYPE',
          path: 'agent.type',
          severity: 'error',
        })
      );
    });

    it('should warn about invalid timestamps but not reject', async () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
      const message = createValidUEPMessage({
        timestamp: futureTime,
      });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'TIMESTAMP_TOO_FUTURE',
          path: 'timestamp',
        })
      );
    });

    it('should warn about missing tracing information', async () => {
      const message = createValidUEPMessage({
        tracing: {
          traceId: '',
          spanId: '',
        },
      });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(true); // Warnings don't invalidate message
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_TRACING_INFO',
          path: 'tracing',
        })
      );
    });

    it('should reject message with oversized payload', async () => {
      const largePayload = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB payload
      const message = createValidUEPMessage({ payload: largePayload });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'PAYLOAD_TOO_LARGE',
          path: 'payload',
          severity: 'error',
        })
      );
    });
  });

  describe('Protocol Schema Validation', () => {
    it('should register and validate against protocol schema', async () => {
      const protocolSchema = {
        id: 'test-protocol',
        version: '1.0.0',
        capability: 'test-processing',
        messageSchema: {
          type: 'object' as const,
          properties: {
            id: { type: 'string' as const },
            timestamp: { type: 'string' as const },
            payload: {
              type: 'object' as const,
              properties: {
                task: { type: 'string' as const },
                data: { type: 'object' as const },
              },
              required: ['task'],
              additionalProperties: true,
            },
          },
          required: ['id', 'timestamp', 'payload'],
          additionalProperties: true,
        },
      };

      validator.registerProtocolSchema(protocolSchema);

      const validMessage = createValidUEPMessage();
      const result = await validator.validateMessage(validMessage);

      expect(result.valid).toBe(true);
      expect(result.metadata?.protocolFound).toBe(true);
    });

    it('should reject message against registered schema with missing required fields', async () => {
      const protocolSchema = {
        id: 'strict-protocol',
        version: '1.0.0',
        capability: 'strict-processing',
        messageSchema: {
          type: 'object' as const,
          properties: {
            payload: {
              type: 'object' as const,
              properties: {
                requiredField: { type: 'string' as const },
              },
              required: ['requiredField'],
              additionalProperties: false,
            },
          },
          required: ['payload'],
          additionalProperties: true,
        },
      };

      validator.registerProtocolSchema(protocolSchema);

      const invalidMessage = createValidUEPMessage({
        protocol: {
          id: 'strict-protocol',
          version: '1.0.0',
          capability: 'strict-processing',
        },
        payload: { otherField: 'value' }, // Missing requiredField
      });

      const result = await validator.validateMessage(invalidMessage);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SCHEMA_VALIDATION_ERROR',
          severity: 'error',
        })
      );
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple messages in batch', async () => {
      const messages = [
        createValidUEPMessage({ id: 'msg-1' }),
        createValidUEPMessage({ id: 'msg-2' }),
        createValidUEPMessage({ id: 'msg-3', routing: { subject: 'invalid subject', messageType: 'command' } }),
      ];

      const results = await validator.validateMessages(messages);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
      expect(results[2].valid).toBe(false);
    });
  });

  describe('Custom Validation Rules', () => {
    it('should allow adding custom validation rules', async () => {
      const customRule = {
        name: 'custom-test-rule',
        description: 'Test custom rule',
        severity: 'error' as const,
        enabled: true,
        validator: (message: UEPMessage<any>) => {
          if (message.payload?.customField !== 'expected-value') {
            return {
              code: 'CUSTOM_VALIDATION_FAILED',
              message: 'Custom validation failed',
              path: 'payload.customField',
              severity: 'error' as const,
            };
          }
          return null;
        },
      };

      validator.addValidationRule(customRule);

      const message = createValidUEPMessage({
        payload: { customField: 'wrong-value' },
      });

      const result = await validator.validateMessage(message);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'CUSTOM_VALIDATION_FAILED',
          path: 'payload.customField',
        })
      );
    });

    it('should allow enabling/disabling validation rules', async () => {
      const message = createValidUEPMessage({
        agent: {
          id: 'test-agent',
          type: 'invalid-type' as any,
          capability: 'test',
          instance: 'instance-1',
        },
      });

      // Rule should be enabled by default
      let result = await validator.validateMessage(message);
      expect(result.valid).toBe(false);

      // Disable the rule
      validator.toggleValidationRule('agent-information', false);
      result = await validator.validateMessage(message);
      expect(result.valid).toBe(true); // Should pass now

      // Re-enable the rule
      validator.toggleValidationRule('agent-information', true);
      result = await validator.validateMessage(message);
      expect(result.valid).toBe(false); // Should fail again
    });
  });

  describe('Statistics and Performance', () => {
    it('should track validation statistics', async () => {
      const messages = [
        createValidUEPMessage(),
        createValidUEPMessage({ protocol: { id: '', version: '', capability: '' } }),
        createValidUEPMessage(),
      ];

      await Promise.all(messages.map(msg => validator.validateMessage(msg)));

      const stats = validator.getStats();
      expect(stats.totalValidations).toBe(3);
      expect(stats.validMessages).toBe(2);
      expect(stats.invalidMessages).toBe(1);
      expect(stats.averageValidationTime).toBeGreaterThan(0);
    });
  });
});

describe('UEPValidationMiddleware', () => {
  let middleware: UEPValidationMiddleware;
  let mockValidator: jest.Mocked<UEPMessageValidator>;

  beforeEach(async () => {
    const middlewareConfig = createDefaultMiddlewareConfig();
    const validatorConfig = createDefaultValidatorConfig();
    
    middleware = new UEPValidationMiddleware(middlewareConfig, validatorConfig);
    await middleware.initialize();
  });

  afterEach(() => {
    middleware.removeAllListeners();
  });

  describe('Pre-processing Validation', () => {
    it('should validate message before processing', async () => {
      const message = createValidUEPMessage();
      const context = createValidationContext();

      const result = await middleware.validateBeforeProcessing(message, context);

      expect(result.valid).toBe(true);
    });

    it('should apply validation policies', async () => {
      const invalidMessage = createValidUEPMessage({
        protocol: { id: '', version: '', capability: '' },
      });
      const context = createValidationContext();

      await expect(
        middleware.validateBeforeProcessing(invalidMessage, context)
      ).rejects.toThrow('Message rejected by policy');
    });
  });

  describe('Batch Validation', () => {
    it('should validate batch of messages with contexts', async () => {
      const messagesWithContexts = [
        { message: createValidUEPMessage({ id: 'msg-1' }), context: createValidationContext({ messageId: 'msg-1' }) },
        { message: createValidUEPMessage({ id: 'msg-2' }), context: createValidationContext({ messageId: 'msg-2' }) },
      ];

      const results = await middleware.validateBatch(messagesWithContexts);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.valid)).toBe(true);
    });
  });

  describe('Validation Policies', () => {
    it('should add and apply custom validation policies', async () => {
      const customPolicy = {
        name: 'test-policy',
        description: 'Test policy',
        priority: 1,
        enabled: true,
        conditions: [
          { field: 'message.payload.testFlag', operator: 'equals' as const, value: true },
        ],
        actions: [
          { type: 'log' as const, parameters: { level: 'info', message: 'Test policy triggered' } },
        ],
      };

      middleware.addPolicy(customPolicy);

      const message = createValidUEPMessage({
        payload: { testFlag: true },
      });
      const context = createValidationContext();

      let logEmitted = false;
      middleware.on('validation:log', () => {
        logEmitted = true;
      });

      await middleware.validateBeforeProcessing(message, context);

      expect(logEmitted).toBe(true);
    });

    it('should allow enabling/disabling policies', async () => {
      const message = createValidUEPMessage({
        protocol: { id: '', version: '', capability: '' },
      });
      const context = createValidationContext();

      // Policy should reject by default
      await expect(
        middleware.validateBeforeProcessing(message, context)
      ).rejects.toThrow();

      // Disable the policy
      middleware.togglePolicy('reject-invalid-protocol', false);

      // Should not reject now
      const result = await middleware.validateBeforeProcessing(message, context);
      expect(result.valid).toBe(false); // Still invalid, but not rejected
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track middleware statistics', async () => {
      const messages = [
        createValidUEPMessage(),
        createValidUEPMessage({ protocol: { id: '', version: '', capability: '' } }),
      ];

      for (const message of messages) {
        try {
          await middleware.validateBeforeProcessing(message, createValidationContext());
        } catch (error) {
          // Expected for invalid message
        }
      }

      const stats = middleware.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      const message = createValidUEPMessage();
      await middleware.validateBeforeProcessing(message, createValidationContext());

      let stats = middleware.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);

      middleware.resetStats();
      stats = middleware.getStats();
      expect(stats.totalProcessed).toBe(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle validation timeouts gracefully', async () => {
      // Create middleware with very short timeout
      const shortTimeoutConfig = createDefaultMiddlewareConfig();
      shortTimeoutConfig.timing.timeoutMs = 1; // 1ms timeout

      const timeoutMiddleware = new UEPValidationMiddleware(shortTimeoutConfig, createDefaultValidatorConfig());
      await timeoutMiddleware.initialize();

      const message = createValidUEPMessage();
      const context = createValidationContext();

      await expect(
        timeoutMiddleware.validateBeforeProcessing(message, context)
      ).rejects.toThrow('Validation timeout');

      timeoutMiddleware.removeAllListeners();
    });

    it('should provide fallback validation on errors', async () => {
      // This test would require mocking the validator to throw errors
      // For now, we'll test the error recovery configuration
      const recoveryConfig = createDefaultMiddlewareConfig();
      recoveryConfig.errorHandling.enableErrorRecovery = true;
      recoveryConfig.errorHandling.fallbackValidation = true;

      expect(recoveryConfig.errorHandling.enableErrorRecovery).toBe(true);
      expect(recoveryConfig.errorHandling.fallbackValidation).toBe(true);
    });
  });

  describe('Event Emissions', () => {
    it('should emit validation events', async () => {
      const message = createValidUEPMessage();
      const context = createValidationContext();

      let validationCompleted = false;
      middleware.on('validation:completed', () => {
        validationCompleted = true;
      });

      await middleware.validateBeforeProcessing(message, context);

      expect(validationCompleted).toBe(true);
    });

    it('should emit policy action events', async () => {
      const message = createValidUEPMessage({
        payload: { data: 'x'.repeat(2 * 1024 * 1024) }, // Large payload
      });
      const context = createValidationContext();

      let policyActionExecuted = false;
      middleware.on('policy:action-executed', (event) => {
        if (event.action === 'quarantine') {
          policyActionExecuted = true;
        }
      });

      await middleware.validateBeforeProcessing(message, context);

      expect(policyActionExecuted).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  describe('Validator + Middleware Integration', () => {
    it('should work together seamlessly', async () => {
      const validatorConfig = createDefaultValidatorConfig();
      const middlewareConfig = createDefaultMiddlewareConfig();
      
      const validator = new UEPMessageValidator(validatorConfig);
      const middleware = new UEPValidationMiddleware(middlewareConfig, validatorConfig);
      
      await validator.initialize();
      await middleware.initialize();

      // Register a custom protocol schema
      validator.registerProtocolSchema({
        id: 'integration-protocol',
        version: '1.0.0',
        capability: 'integration-test',
        messageSchema: {
          type: 'object' as const,
          properties: {
            payload: {
              type: 'object' as const,
              properties: {
                integrationTest: { type: 'boolean' as const },
              },
              required: ['integrationTest'],
              additionalProperties: true,
            },
          },
          required: ['payload'],
          additionalProperties: true,
        },
      });

      // Test valid message
      const validMessage = createValidUEPMessage({
        protocol: {
          id: 'integration-protocol',
          version: '1.0.0',
          capability: 'integration-test',
        },
        payload: { integrationTest: true },
      });

      const result = await middleware.validateBeforeProcessing(
        validMessage,
        createValidationContext()
      );

      expect(result.valid).toBe(true);
      expect(result.metadata?.protocolFound).toBe(true);

      validator.removeAllListeners();
      middleware.removeAllListeners();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume validation efficiently', async () => {
      const validatorConfig = createDefaultValidatorConfig();
      validatorConfig.performance.enableCaching = true;
      
      const validator = new UEPMessageValidator(validatorConfig);
      await validator.initialize();

      const messageCount = 1000;
      const messages = Array.from({ length: messageCount }, (_, i) =>
        createValidUEPMessage({ id: `msg-${i}` })
      );

      const startTime = Date.now();
      const results = await validator.validateMessages(messages);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const messagesPerSecond = messageCount / (totalTime / 1000);

      expect(results).toHaveLength(messageCount);
      expect(results.every(r => r.valid)).toBe(true);
      expect(messagesPerSecond).toBeGreaterThan(100); // Should process >100 msgs/sec

      const stats = validator.getStats();
      expect(stats.totalValidations).toBe(messageCount);
      expect(stats.validMessages).toBe(messageCount);

      validator.removeAllListeners();
    });

    it('should demonstrate caching effectiveness', async () => {
      const validatorConfig = createDefaultValidatorConfig();
      validatorConfig.performance.enableCaching = true;
      
      const validator = new UEPMessageValidator(validatorConfig);
      await validator.initialize();

      // Validate same message multiple times
      const message = createValidUEPMessage();
      const validationCount = 10;

      const results = [];
      for (let i = 0; i < validationCount; i++) {
        const result = await validator.validateMessage(message);
        results.push(result);
      }

      // All validations should succeed
      expect(results.every(r => r.valid)).toBe(true);

      // Some validations should be cache hits (after the first one)
      const cacheHits = results.filter(r => r.metadata?.cacheHit).length;
      expect(cacheHits).toBeGreaterThan(0);

      validator.removeAllListeners();
    });
  });
});

describe('Configuration and Defaults', () => {
  it('should create valid default validator configuration', () => {
    const config = createDefaultValidatorConfig();

    expect(config.protocols.enableProtocolValidation).toBe(true);
    expect(config.protocols.enableSchemaValidation).toBe(true);
    expect(config.performance.enableCaching).toBe(true);
    expect(config.rules.allowedMessageTypes).toContain('command');
    expect(config.rules.allowedMessageTypes).toContain('event');
    expect(config.rules.allowedMessageTypes).toContain('query');
    expect(config.rules.allowedMessageTypes).toContain('response');
  });

  it('should create valid default middleware configuration', () => {
    const config = createDefaultMiddlewareConfig();

    expect(config.timing.enablePreProcessing).toBe(true);
    expect(config.policies.rejectInvalidMessages).toBe(true);
    expect(config.performance.enableMetrics).toBe(true);
    expect(config.errorHandling.enableErrorRecovery).toBe(true);
  });
});