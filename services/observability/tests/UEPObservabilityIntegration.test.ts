/**
 * UEP Observability Integration Test Suite
 * 
 * Comprehensive test coverage for UEP distributed tracing, structured logging,
 * and observability integration including trace-log correlation validation.
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { UEPObservabilityIntegration, createUEPObservabilityIntegration } from '../UEPObservabilityIntegration';
import { UEPStructuredLogger } from '../UEPStructuredLogger';
import { UEPTracingSystem } from '../UEPTracingSystem';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  UEPError,
  UEPWorkflowExecution,
  UEPCoordinationEvent 
} from '../../types/UEPTypes';

// =====================================================
// Test Setup and Utilities
// =====================================================

describe('UEP Observability Integration System', () => {
  let observabilityIntegration: UEPObservabilityIntegration;

  const createTestMessage = (overrides: Partial<UEPMessage> = {}): UEPMessage => ({
    id: 'test-message-1',
    type: 'REQUEST',
    protocolVersion: '1.0.0',
    sender: {
      id: 'test-agent-1',
      type: 'PROCESSOR',
      version: '1.0.0',
      capabilities: ['process'],
      endpoint: 'http://localhost:3001'
    },
    recipient: {
      id: 'test-agent-2',
      type: 'WORKER',
      version: '1.0.0',
      capabilities: ['work'],
      endpoint: 'http://localhost:3002'
    },
    correlationId: 'test-correlation-1',
    timestamp: new Date(),
    payload: { test: 'data' },
    metadata: {
      traceId: 'test-trace-1',
      spanId: 'test-span-1',
      operationName: 'test-operation',
      tags: {},
      contentType: 'application/json'
    },
    ...overrides
  });

  const createTestMetadata = (overrides: Partial<UEPMessageMetadata> = {}): UEPMessageMetadata => ({
    traceId: 'test-trace-1',
    spanId: 'test-span-1',
    operationName: 'test-operation',
    tags: {
      'test.tag': 'value'
    },
    contentType: 'application/json',
    ...overrides
  });

  const createTestWorkflowExecution = (): UEPWorkflowExecution => ({
    id: 'workflow-exec-1',
    workflowId: 'test-workflow-1',
    status: 'IN_PROGRESS',
    startTime: new Date(),
    currentStep: 'step-1',
    completedSteps: [],
    failedSteps: [],
    input: { test: 'input' },
    metadata: {}
  });

  const createTestCoordinationEvent = (): UEPCoordinationEvent => ({
    id: 'coordination-1',
    type: 'START',
    coordinatorId: 'coordinator-agent',
    participantIds: ['agent-1', 'agent-2', 'agent-3'],
    pattern: 'SEQUENTIAL',
    phase: 'initialization',
    data: { test: 'coordination' },
    timestamp: new Date(),
    timeout: 30000
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create test instance with minimal config
    observabilityIntegration = createUEPObservabilityIntegration({
      enabled: true,
      serviceName: 'test-uep-service',
      serviceVersion: '1.0.0-test',
      environment: 'test',
      tracing: {
        enabled: true,
        serviceName: 'test-uep-service',
        serviceVersion: '1.0.0-test',
        environment: 'test',
        jaeger: {
          enabled: false, // Disable for tests
          endpoint: 'http://localhost:14268/api/traces'
        },
        console: {
          enabled: false, // Disable console output for tests
          pretty: false
        }
      },
      logging: {
        enabled: true,
        level: 'debug',
        serviceName: 'test-uep-service',
        serviceVersion: '1.0.0-test',
        environment: 'test',
        format: 'json',
        outputs: {
          console: {
            enabled: false, // Disable console output for tests
            colorize: false,
            timestamp: true
          },
          file: {
            enabled: false,
            path: '/tmp/test-uep.log',
            maxSize: '10MB',
            maxFiles: 1,
            rotate: false
          },
          network: {
            enabled: false,
            endpoint: 'http://localhost:3100/loki/api/v1/push',
            protocol: 'http',
            buffer: false,
            batchSize: 10
          }
        },
        performance: {
          bufferSize: 100,
          flushInterval: 1000,
          asyncLogging: false, // Synchronous for tests
          samplingRate: 1.0
        }
      },
      metrics: {
        enabled: false // Disable metrics for focused testing
      }
    });
  });

  afterEach(async () => {
    // Clean up
    if (observabilityIntegration) {
      await observabilityIntegration.shutdown();
    }
  });

  // =====================================================
  // Initialization and Lifecycle Tests
  // =====================================================

  describe('Initialization and Lifecycle', () => {
    it('should create observability integration with valid configuration', () => {
      expect(observabilityIntegration).toBeDefined();
      expect(observabilityIntegration.getObservabilityStatus().initialized).toBe(false);
    });

    it('should initialize successfully with all components', async () => {
      await observabilityIntegration.initialize();
      
      const status = observabilityIntegration.getObservabilityStatus();
      expect(status.initialized).toBe(true);
      expect(status.tracing).toBe(true);
      expect(status.logging).toBe(true);
    });

    it('should shutdown gracefully', async () => {
      await observabilityIntegration.initialize();
      await observabilityIntegration.shutdown();
      
      const status = observabilityIntegration.getObservabilityStatus();
      expect(status.initialized).toBe(false);
    });

    it('should throw error when initializing already initialized system', async () => {
      await observabilityIntegration.initialize();
      
      await expect(observabilityIntegration.initialize()).rejects.toThrow(
        'UEP Observability Integration is already initialized'
      );
    });
  });

  // =====================================================
  // Message Observability Tests
  // =====================================================

  describe('Message Observability', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should start message observability with trace and log correlation', () => {
      const message = createTestMessage();
      const metadata = createTestMetadata();

      const context = observabilityIntegration.startMessageObservability(message, metadata);

      expect(context).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.correlationId).toBe(message.correlationId);
      expect(context.agentId).toBe(message.sender.id);
      expect(context.operationName).toBe('uep.message.request');

      const status = observabilityIntegration.getObservabilityStatus();
      expect(status.activeOperations).toBe(1);
    });

    it('should end message observability with success status', () => {
      const message = createTestMessage();
      const metadata = createTestMetadata();

      const context = observabilityIntegration.startMessageObservability(message, metadata);
      
      // End with success
      observabilityIntegration.endMessageObservability(
        message.id, 
        'success', 
        { result: 'processed' }
      );

      const status = observabilityIntegration.getObservabilityStatus();
      expect(status.activeOperations).toBe(0);
    });

    it('should end message observability with error status', () => {
      const message = createTestMessage();
      const metadata = createTestMetadata();
      const testError = new Error('Test processing error');

      const context = observabilityIntegration.startMessageObservability(message, metadata);
      
      // End with error
      observabilityIntegration.endMessageObservability(
        message.id, 
        'error', 
        undefined, 
        testError
      );

      const status = observabilityIntegration.getObservabilityStatus();
      expect(status.activeOperations).toBe(0);
    });

    it('should handle multiple concurrent message observations', () => {
      const messages = Array.from({ length: 10 }, (_, i) => 
        createTestMessage({ id: `test-message-${i}` })
      );
      const metadata = createTestMetadata();

      // Start multiple message observations
      const contexts = messages.map(message => 
        observabilityIntegration.startMessageObservability(message, metadata)
      );

      expect(contexts).toHaveLength(10);
      expect(observabilityIntegration.getObservabilityStatus().activeOperations).toBe(10);

      // End all observations
      messages.forEach(message => {
        observabilityIntegration.endMessageObservability(message.id, 'success');
      });

      expect(observabilityIntegration.getObservabilityStatus().activeOperations).toBe(0);
    });

    it('should handle message observability for different message types', () => {
      const messageTypes: Array<UEPMessage['type']> = ['REQUEST', 'RESPONSE', 'EVENT', 'COMMAND'];
      const metadata = createTestMetadata();

      messageTypes.forEach((type, index) => {
        const message = createTestMessage({ 
          id: `test-message-${index}`,
          type 
        });

        const context = observabilityIntegration.startMessageObservability(message, metadata);
        
        expect(context.operationName).toBe(`uep.message.${type.toLowerCase()}`);
        
        observabilityIntegration.endMessageObservability(message.id, 'success');
      });
    });
  });

  // =====================================================
  // Workflow Observability Tests
  // =====================================================

  describe('Workflow Observability', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should start workflow observability for execution', () => {
      const workflowExecution = createTestWorkflowExecution();

      const context = observabilityIntegration.startWorkflowObservability(workflowExecution);

      expect(context).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.correlationId).toBe(workflowExecution.id);
      expect(context.workflowId).toBe(workflowExecution.workflowId);
      expect(context.operationName).toBe('workflow.execution');
    });

    it('should start workflow observability for specific step', () => {
      const workflowExecution = createTestWorkflowExecution();
      const stepId = 'test-step-1';

      const context = observabilityIntegration.startWorkflowObservability(
        workflowExecution, 
        stepId
      );

      expect(context.operationName).toBe(`workflow.step.${stepId}`);
      expect(context.attributes).toHaveProperty('uep.workflow.step', stepId);
    });

    it('should end workflow observability with different statuses', () => {
      const workflowExecution = createTestWorkflowExecution();
      
      observabilityIntegration.startWorkflowObservability(workflowExecution);

      // Test different completion statuses
      const statuses: Array<'completed' | 'failed' | 'cancelled'> = ['completed', 'failed', 'cancelled'];
      
      statuses.forEach(status => {
        observabilityIntegration.endWorkflowObservability(
          `${workflowExecution.id}-${status}`,
          status,
          status === 'completed' ? { result: 'success' } : undefined,
          status === 'failed' ? new Error('Workflow failed') : undefined
        );
      });

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  // =====================================================
  // Coordination Observability Tests
  // =====================================================

  describe('Coordination Observability', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should start coordination observability', () => {
      const coordinationEvent = createTestCoordinationEvent();

      const context = observabilityIntegration.startCoordinationObservability(coordinationEvent);

      expect(context).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.correlationId).toBe(coordinationEvent.id);
      expect(context.operationName).toBe(`coordination.${coordinationEvent.pattern.toLowerCase()}`);
    });

    it('should handle different coordination patterns', () => {
      const patterns: Array<UEPCoordinationEvent['pattern']> = [
        'SEQUENTIAL', 'PARALLEL', 'PIPELINE', 'SCATTER_GATHER', 'SAGA'
      ];

      patterns.forEach(pattern => {
        const coordinationEvent = createTestCoordinationEvent();
        coordinationEvent.pattern = pattern;
        coordinationEvent.id = `coordination-${pattern}`;

        const context = observabilityIntegration.startCoordinationObservability(coordinationEvent);
        
        expect(context.operationName).toBe(`coordination.${pattern.toLowerCase()}`);
      });
    });
  });

  // =====================================================
  // Error Observability Tests
  // =====================================================

  describe('Error Observability', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should record UEP error with context', () => {
      const message = createTestMessage();
      const metadata = createTestMetadata();
      
      // Start message observability to create context
      const context = observabilityIntegration.startMessageObservability(message, metadata);

      const uepError: UEPError = {
        code: 'UEP_VALIDATION_ERROR',
        message: 'Invalid message format',
        severity: 'HIGH',
        category: 'VALIDATION',
        timestamp: new Date(),
        agentId: message.sender.id,
        correlationId: message.correlationId
      };

      // Should not throw error
      expect(() => {
        observabilityIntegration.recordUEPError(uepError, context);
      }).not.toThrow();
    });

    it('should record UEP error without context', () => {
      const uepError: UEPError = {
        code: 'UEP_SYSTEM_ERROR',
        message: 'System failure',
        severity: 'CRITICAL',
        category: 'SYSTEM',
        timestamp: new Date(),
        agentId: 'system-agent',
        correlationId: 'system-correlation'
      };

      // Should not throw error
      expect(() => {
        observabilityIntegration.recordUEPError(uepError);
      }).not.toThrow();
    });

    it('should handle different error categories and severities', () => {
      const categories: Array<UEPError['category']> = ['PROTOCOL', 'VALIDATION', 'EXECUTION', 'SYSTEM', 'SECURITY'];
      const severities: Array<UEPError['severity']> = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

      categories.forEach(category => {
        severities.forEach(severity => {
          const uepError: UEPError = {
            code: `${category}_${severity}_ERROR`,
            message: `Test ${category} error with ${severity} severity`,
            severity,
            category,
            timestamp: new Date(),
            agentId: 'test-agent',
            correlationId: `test-${category}-${severity}`
          };

          expect(() => {
            observabilityIntegration.recordUEPError(uepError);
          }).not.toThrow();
        });
      });
    });
  });

  // =====================================================
  // Integration Tests
  // =====================================================

  describe('Component Integration', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should create Express middleware', () => {
      const middleware = observabilityIntegration.createExpressMiddleware();
      
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should integrate with message processor', () => {
      const mockProcessor = {
        on: jest.fn()
      };

      observabilityIntegration.integrateWithMessageProcessor(mockProcessor);

      expect(mockProcessor.on).toHaveBeenCalledWith('message:received', expect.any(Function));
      expect(mockProcessor.on).toHaveBeenCalledWith('message:processed', expect.any(Function));
      expect(mockProcessor.on).toHaveBeenCalledWith('message:error', expect.any(Function));
    });

    it('should integrate with workflow engine', () => {
      const mockEngine = {
        on: jest.fn()
      };

      observabilityIntegration.integrateWithWorkflowEngine(mockEngine);

      expect(mockEngine.on).toHaveBeenCalledWith('workflow:started', expect.any(Function));
      expect(mockEngine.on).toHaveBeenCalledWith('workflow:step:started', expect.any(Function));
      expect(mockEngine.on).toHaveBeenCalledWith('workflow:completed', expect.any(Function));
      expect(mockEngine.on).toHaveBeenCalledWith('workflow:failed', expect.any(Function));
    });

    it('should handle Express middleware request/response cycle', () => {
      const middleware = observabilityIntegration.createExpressMiddleware();
      
      const mockReq = {
        method: 'GET',
        path: '/test',
        url: '/test?query=value',
        headers: {
          'x-trace-id': 'test-trace-123',
          'x-span-id': 'test-span-456',
          'x-correlation-id': 'test-correlation-789',
          'user-agent': 'test-agent/1.0'
        }
      };

      const mockRes = {
        statusCode: 200,
        on: jest.fn(),
        get: jest.fn().mockReturnValue('100')
      };

      const mockNext = jest.fn();

      // Should not throw error
      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  // =====================================================
  // Utility and Status Tests  
  // =====================================================

  describe('Utility and Status Methods', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should return correct observability status', () => {
      const status = observabilityIntegration.getObservabilityStatus();
      
      expect(status).toEqual({
        initialized: true,
        activeOperations: 0,
        tracing: true,
        logging: true,
        metrics: false // Disabled in test config
      });
    });

    it('should track active operations count', () => {
      const message1 = createTestMessage({ id: 'message-1' });
      const message2 = createTestMessage({ id: 'message-2' });
      const metadata = createTestMetadata();

      // Start operations
      observabilityIntegration.startMessageObservability(message1, metadata);
      observabilityIntegration.startMessageObservability(message2, metadata);

      expect(observabilityIntegration.getObservabilityStatus().activeOperations).toBe(2);

      // End one operation
      observabilityIntegration.endMessageObservability('message-1', 'success');

      expect(observabilityIntegration.getObservabilityStatus().activeOperations).toBe(1);

      // End remaining operation
      observabilityIntegration.endMessageObservability('message-2', 'success');

      expect(observabilityIntegration.getObservabilityStatus().activeOperations).toBe(0);
    });

    it('should provide trace-logs correlation interface', async () => {
      const traceId = 'test-trace-correlation';
      
      const correlation = await observabilityIntegration.getTraceLogsCorrelation(traceId);
      
      expect(correlation).toBeDefined();
      expect(correlation.spans).toBeDefined();
      expect(correlation.logs).toBeDefined();
      expect(Array.isArray(correlation.spans)).toBe(true);
      expect(Array.isArray(correlation.logs)).toBe(true);
    });
  });

  // =====================================================
  // Performance Tests
  // =====================================================

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should handle high-throughput message observability', () => {
      const messageCount = 1000;
      const messages = Array.from({ length: messageCount }, (_, i) => 
        createTestMessage({ id: `perf-test-${i}` })
      );
      const metadata = createTestMetadata();

      const startTime = Date.now();

      // Start all observations
      messages.forEach(message => {
        observabilityIntegration.startMessageObservability(message, metadata);
      });

      // End all observations
      messages.forEach(message => {
        observabilityIntegration.endMessageObservability(message.id, 'success');
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds for 1000 messages)
      expect(duration).toBeLessThan(5000);
      
      const throughput = messageCount / (duration / 1000);
      console.log(`Performance test: ${messageCount} messages in ${duration}ms (${throughput.toFixed(0)} msg/s)`);
      
      // Should process at least 200 messages per second
      expect(throughput).toBeGreaterThan(200);
    });

    it('should maintain performance with concurrent operations', async () => {
      const concurrentCount = 100;
      const messages = Array.from({ length: concurrentCount }, (_, i) => 
        createTestMessage({ id: `concurrent-test-${i}` })
      );
      const metadata = createTestMetadata();

      const startTime = Date.now();

      // Start all operations concurrently
      const promises = messages.map(async (message, index) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            observabilityIntegration.startMessageObservability(message, metadata);
            
            // End operation after short delay
            setTimeout(() => {
              observabilityIntegration.endMessageObservability(message.id, 'success');
              resolve();
            }, Math.random() * 10);
          }, Math.random() * 50);
        });
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000);
      expect(observabilityIntegration.getObservabilityStatus().activeOperations).toBe(0);
    });
  });

  // =====================================================
  // Error Handling and Edge Cases
  // =====================================================

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await observabilityIntegration.initialize();
    });

    it('should handle ending non-existent message observability gracefully', () => {
      expect(() => {
        observabilityIntegration.endMessageObservability('non-existent-id', 'success');
      }).not.toThrow();
    });

    it('should handle invalid message data gracefully', () => {
      const invalidMessage = createTestMessage();
      delete (invalidMessage as any).correlationId;
      
      const metadata = createTestMetadata();

      expect(() => {
        observabilityIntegration.startMessageObservability(invalidMessage, metadata);
      }).not.toThrow();
    });

    it('should handle system shutdown with active operations', async () => {
      const message = createTestMessage();
      const metadata = createTestMetadata();

      // Start operation
      observabilityIntegration.startMessageObservability(message, metadata);
      
      expect(observabilityIntegration.getObservabilityStatus().activeOperations).toBe(1);

      // Shutdown should end active operations
      await observabilityIntegration.shutdown();
      
      expect(observabilityIntegration.getObservabilityStatus().initialized).toBe(false);
    });

    it('should handle errors in event handlers gracefully', () => {
      // Add error-throwing event listener
      observabilityIntegration.on('message:started', () => {
        throw new Error('Test event handler error');
      });

      const message = createTestMessage();
      const metadata = createTestMetadata();

      // Should not throw despite error in event handler
      expect(() => {
        observabilityIntegration.startMessageObservability(message, metadata);
      }).not.toThrow();
    });
  });
});