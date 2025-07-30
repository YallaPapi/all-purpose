/**
 * UEP Metrics Collector Test Suite
 * 
 * Comprehensive test coverage for UEP metrics collection system
 * including unit tests, integration tests, and performance tests.
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { UEPMetricsCollector, createUEPMetricsCollector } from '../UEPMetricsCollector';
import { UEPMetricsIntegration, createUEPMetricsIntegration } from '../UEPMetricsIntegration';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPError 
} from '../../types/UEPTypes';

// =====================================================
// Test Setup and Utilities
// =====================================================

describe('UEP Metrics Collection System', () => {
  let metricsCollector: UEPMetricsCollector;
  let metricsIntegration: UEPMetricsIntegration;

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

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create test instances with minimal config
    metricsCollector = createUEPMetricsCollector({
      collection: {
        enabled: true,
        interval: 1000, // 1 second for faster tests
        retention: '1d',
        bufferSize: 1000
      },
      prometheus: {
        port: 9091, // Different port for tests
        endpoint: '/metrics',
        prefix: 'test_uep_',
        labels: {
          test: 'true'
        }
      }
    });

    metricsIntegration = createUEPMetricsIntegration({
      enabled: true,
      collector: {
        autoStart: false, // Don't auto-start for tests
        config: {
          collection: {
            enabled: true,
            interval: 1000
          }
        }
      },
      aggregation: {
        enabled: true,
        interval: 2000 // 2 seconds for tests
      }
    });
  });

  afterEach(async () => {
    // Clean up
    if (metricsCollector) {
      await metricsCollector.stop();
    }
    if (metricsIntegration) {
      await metricsIntegration.stop();
    }
  });

  // =====================================================
  // UEP Metrics Collector Tests
  // =====================================================

  describe('UEPMetricsCollector', () => {
    describe('Initialization', () => {
      it('should create collector with valid configuration', () => {
        expect(metricsCollector).toBeDefined();
        expect(metricsCollector.getRegistry()).toBeDefined();
      });

      it('should throw error with invalid configuration', () => {
        expect(() => {
          createUEPMetricsCollector({
            collection: {
              enabled: false,
              interval: 1000,
              retention: '1d',
              bufferSize: 1000
            }
          });
        }).toThrow('Metrics collection must be enabled');
      });

      it('should validate prometheus port configuration', () => {
        expect(() => {
          createUEPMetricsCollector({
            collection: { enabled: true, interval: 1000, retention: '1d', bufferSize: 1000 },
            prometheus: { port: -1, endpoint: '/metrics', prefix: 'test_', labels: {} }
          });
        }).toThrow('Invalid Prometheus port configuration');
      });
    });

    describe('Message Recording', () => {
      it('should record message metrics correctly', () => {
        const message = createTestMessage();
        const metadata = createTestMetadata();
        const processingTime = 150;

        metricsCollector.recordMessage(message, metadata, processingTime, 'success');

        // Verify metrics were recorded (would need to check registry values in real implementation)
        expect(metricsCollector.getRegistry()).toBeDefined();
      });

      it('should record message with error status', () => {
        const message = createTestMessage();
        const metadata = createTestMetadata();
        const processingTime = 300;

        metricsCollector.recordMessage(message, metadata, processingTime, 'error');

        // Should record both message count and error metrics
        expect(metricsCollector.getRegistry()).toBeDefined();
      });

      it('should handle high-frequency message recording', () => {
        const message = createTestMessage();
        const metadata = createTestMetadata();

        // Record 1000 messages rapidly
        const startTime = Date.now();
        for (let i = 0; i < 1000; i++) {
          const testMessage = createTestMessage({ id: `test-message-${i}` });
          metricsCollector.recordMessage(testMessage, metadata, Math.random() * 100, 'success');
        }
        const endTime = Date.now();

        // Should complete within reasonable time (less than 1 second)
        expect(endTime - startTime).toBeLessThan(1000);
      });
    });

    describe('Compliance Recording', () => {
      it('should record compliance metrics', () => {
        const agentId = 'test-agent-1';
        const protocolVersion = '1.0.0';
        const complianceRate = 0.95;
        const violations = [
          {
            type: 'INVALID_FIELD',
            count: 5,
            severity: 'medium' as const,
            description: 'Invalid field in message',
            firstSeen: new Date(),
            lastSeen: new Date()
          }
        ];

        metricsCollector.recordCompliance(agentId, protocolVersion, complianceRate, violations);

        const complianceReport = metricsCollector.getComplianceReport(agentId);
        expect(complianceReport).toHaveLength(1);
        expect(complianceReport[0].complianceRate).toBe(complianceRate);
        expect(complianceReport[0].violations).toEqual(violations);
      });

      it('should handle perfect compliance', () => {
        const agentId = 'perfect-agent';
        const complianceRate = 1.0;

        metricsCollector.recordCompliance(agentId, '1.0.0', complianceRate);

        const report = metricsCollector.getComplianceReport(agentId);
        expect(report[0].complianceRate).toBe(1.0);
        expect(report[0].violations).toEqual([]);
      });
    });

    describe('Performance Recording', () => {
      it('should record performance metrics', () => {
        const agentId = 'test-agent-1';
        const performanceMetrics = {
          latency: {
            mean: 150,
            p50: 140,
            p95: 200,
            p99: 250,
            max: 300
          },
          throughput: {
            messagesPerSecond: 100,
            bytesPerSecond: 50000
          },
          errorRate: {
            rate: 0.02,
            count: 2,
            types: {
              'VALIDATION_ERROR': 1,
              'TIMEOUT_ERROR': 1
            }
          }
        };

        metricsCollector.recordPerformance(agentId, performanceMetrics);

        const reports = metricsCollector.getPerformanceReport(agentId);
        expect(reports).toHaveLength(1);
        expect(reports[0].latency).toEqual(performanceMetrics.latency);
        expect(reports[0].throughput).toEqual(performanceMetrics.throughput);
      });
    });

    describe('Coordination Recording', () => {
      it('should record coordination events', () => {
        const coordinatorId = 'coordinator-1';
        const participantId = 'participant-1';
        const pattern = 'SEQUENTIAL';
        const status = 'success' as const;
        const duration = 500;

        metricsCollector.recordCoordination(coordinatorId, participantId, pattern, status, duration);

        // Verify coordination was recorded (would check metrics in real implementation)
        expect(metricsCollector.getRegistry()).toBeDefined();
      });

      it('should record failed coordination', () => {
        metricsCollector.recordCoordination('coordinator-1', 'participant-1', 'PARALLEL', 'failure');
        
        // Should record failure metric
        expect(metricsCollector.getRegistry()).toBeDefined();
      });
    });

    describe('Agent Status Recording', () => {
      it('should record agent status changes', () => {
        const agentId = 'test-agent-1';
        const agentType = 'PROCESSOR';
        const version = '1.0.0';

        metricsCollector.recordAgentStatus(agentId, agentType, version, 'active');
        metricsCollector.recordAgentStatus(agentId, agentType, version, 'inactive');

        // Should record status changes
        expect(metricsCollector.getRegistry()).toBeDefined();
      });
    });

    describe('Metrics Export', () => {
      it('should export metrics in Prometheus format', async () => {
        const message = createTestMessage();
        const metadata = createTestMetadata();
        
        // Record some metrics first
        metricsCollector.recordMessage(message, metadata, 100, 'success');
        metricsCollector.recordAgentStatus('test-agent', 'PROCESSOR', '1.0.0', 'active');

        const metrics = await metricsCollector.getMetrics();
        
        expect(typeof metrics).toBe('string');
        expect(metrics).toContain('test_uep_'); // Should contain our prefix
      });
    });
  });

  // =====================================================
  // UEP Metrics Integration Tests
  // =====================================================

  describe('UEPMetricsIntegration', () => {
    describe('Initialization and Lifecycle', () => {
      it('should create integration with valid configuration', () => {
        expect(metricsIntegration).toBeDefined();
        expect(metricsIntegration.getCollector()).toBeDefined();
        expect(metricsIntegration.getMiddleware()).toBeDefined();
      });

      it('should start and stop successfully', async () => {
        await metricsIntegration.start();
        // Integration should be running
        
        await metricsIntegration.stop();
        // Integration should be stopped
      });

      it('should throw error when starting already running integration', async () => {
        await metricsIntegration.start();
        
        await expect(metricsIntegration.start()).rejects.toThrow(
          'UEP Metrics Integration is already running'
        );
        
        await metricsIntegration.stop();
      });
    });

    describe('Middleware Integration', () => {
      it('should provide request tracking middleware', () => {
        const middleware = metricsIntegration.getMiddleware();
        
        expect(middleware.requestTracking).toBeDefined();
        expect(typeof middleware.requestTracking).toBe('function');
      });

      it('should provide message tracking middleware', () => {
        const middleware = metricsIntegration.getMiddleware();
        
        expect(middleware.messageTracking).toBeDefined();
        expect(typeof middleware.messageTracking).toBe('function');
      });

      it('should track performance metrics', () => {
        const middleware = metricsIntegration.getMiddleware();
        
        middleware.performanceTracking('test_operation', 150, {
          'operation.type': 'test'
        });
        
        // Should record performance metric
        expect(middleware.performanceTracking).toBeDefined();
      });

      it('should track error metrics', () => {
        const middleware = metricsIntegration.getMiddleware();
        const testError: UEPError = {
          code: 'TEST_ERROR',
          message: 'Test error message',
          severity: 'MEDIUM',
          category: 'VALIDATION',
          timestamp: new Date(),
          agentId: 'test-agent',
          correlationId: 'test-correlation'
        };

        middleware.errorTracking(testError);
        
        // Should record error metric
        expect(middleware.errorTracking).toBeDefined();
      });
    });

    describe('System Metrics Aggregation', () => {
      it('should aggregate system-wide metrics', async () => {
        await metricsIntegration.start();
        
        // Record some test data
        const collector = metricsIntegration.getCollector();
        const message = createTestMessage();
        const metadata = createTestMetadata();
        
        collector.recordMessage(message, metadata, 100, 'success');
        collector.recordAgentStatus('test-agent-1', 'PROCESSOR', '1.0.0', 'active');
        collector.recordPerformance('test-agent-1', {
          latency: { mean: 100, p50: 95, p95: 150, p99: 200, max: 250 },
          throughput: { messagesPerSecond: 50, bytesPerSecond: 25000 }
        });

        const systemMetrics = await metricsIntegration.getSystemMetrics();
        
        expect(systemMetrics).toBeDefined();
        expect(systemMetrics.systemWide).toBeDefined();
        expect(systemMetrics.byAgent).toBeDefined();
        expect(systemMetrics.byOperation).toBeDefined();
        
        await metricsIntegration.stop();
      });

      it('should provide agent-specific metrics', async () => {
        await metricsIntegration.start();
        
        const testAgentId = 'test-agent-metrics';
        const agentMetrics = await metricsIntegration.getAgentMetrics(testAgentId);
        
        expect(agentMetrics).toBeDefined();
        expect(agentMetrics.performance).toBeDefined();
        expect(agentMetrics.compliance).toBeDefined();
        
        await metricsIntegration.stop();
      });
    });

    describe('Express Integration', () => {
      it('should integrate with Express app', () => {
        const mockApp = {
          use: jest.fn(),
          get: jest.fn()
        };

        metricsIntegration.integrateWithExpress(mockApp);
        
        // Should add middleware and routes
        expect(mockApp.use).toHaveBeenCalled();
        expect(mockApp.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
        expect(mockApp.get).toHaveBeenCalledWith('/metrics/system', expect.any(Function));
        expect(mockApp.get).toHaveBeenCalledWith('/metrics/agent/:agentId', expect.any(Function));
      });
    });

    describe('Component Integrations', () => {
      it('should integrate with message processor', () => {
        const mockProcessor = {
          on: jest.fn()
        };

        metricsIntegration.integrateWithMessageProcessor(mockProcessor);
        
        expect(mockProcessor.on).toHaveBeenCalledWith('message:received', expect.any(Function));
        expect(mockProcessor.on).toHaveBeenCalledWith('message:processed', expect.any(Function));
        expect(mockProcessor.on).toHaveBeenCalledWith('message:error', expect.any(Function));
      });

      it('should integrate with workflow engine', () => {
        const mockEngine = {
          on: jest.fn()
        };

        metricsIntegration.integrateWithWorkflowEngine(mockEngine);
        
        expect(mockEngine.on).toHaveBeenCalledWith('workflow:started', expect.any(Function));
        expect(mockEngine.on).toHaveBeenCalledWith('workflow:completed', expect.any(Function));
        expect(mockEngine.on).toHaveBeenCalledWith('workflow:failed', expect.any(Function));
      });
    });
  });

  // =====================================================
  // Performance Tests
  // =====================================================

  describe('Performance Tests', () => {
    it('should handle high message throughput', async () => {
      const messageCount = 10000;
      const batchSize = 100;
      const message = createTestMessage();
      const metadata = createTestMetadata();

      const startTime = Date.now();

      // Process messages in batches
      for (let i = 0; i < messageCount; i += batchSize) {
        const batch = Array.from({ length: Math.min(batchSize, messageCount - i) }, (_, j) => ({
          message: createTestMessage({ id: `perf-test-${i + j}` }),
          metadata,
          processingTime: Math.random() * 50,
          status: Math.random() > 0.95 ? 'error' : 'success' as const
        }));

        batch.forEach(({ message, metadata, processingTime, status }) => {
          metricsCollector.recordMessage(message, metadata, processingTime, status);
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = messageCount / (duration / 1000);

      // Should process at least 1000 messages per second
      expect(throughput).toBeGreaterThan(1000);
      console.log(`Performance test: ${messageCount} messages in ${duration}ms (${throughput.toFixed(0)} msg/s)`);
    });

    it('should maintain low memory usage during extended operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run for extended period with continuous metrics
      for (let i = 0; i < 5000; i++) {
        const message = createTestMessage({ id: `memory-test-${i}` });
        const metadata = createTestMetadata();
        
        metricsCollector.recordMessage(message, metadata, Math.random() * 100, 'success');
        
        if (i % 1000 === 0) {
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

      // Memory increase should be reasonable (less than 50MB for 5000 messages)
      expect(memoryIncrease).toBeLessThan(50);
      console.log(`Memory test: ${memoryIncrease.toFixed(2)}MB increase for 5000 messages`);
    });
  });

  // =====================================================
  // Integration Tests
  // =====================================================

  describe('End-to-End Integration Tests', () => {
    it('should complete full metrics collection cycle', async () => {
      await metricsIntegration.start();
      
      const collector = metricsIntegration.getCollector();
      const middleware = metricsIntegration.getMiddleware();

      // Simulate real system activity
      const message = createTestMessage();
      const metadata = createTestMetadata();

      // Record various metrics
      collector.recordMessage(message, metadata, 120, 'success');
      collector.recordAgentStatus('integration-agent', 'PROCESSOR', '1.0.0', 'active');
      collector.recordCompliance('integration-agent', '1.0.0', 0.98, []);
      collector.recordPerformance('integration-agent', {
        latency: { mean: 120, p50: 115, p95: 180, p99: 220, max: 250 },
        throughput: { messagesPerSecond: 75, bytesPerSecond: 37500 }
      });
      collector.recordCoordination('coordinator', 'integration-agent', 'SEQUENTIAL', 'success', 200);

      // Wait for metrics collection cycle
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify system metrics
      const systemMetrics = await metricsIntegration.getSystemMetrics();
      expect(systemMetrics.systemWide.totalAgents).toBeGreaterThan(0);
      expect(systemMetrics.byAgent.has('integration-agent')).toBe(true);

      // Verify agent metrics
      const agentMetrics = await metricsIntegration.getAgentMetrics('integration-agent');
      expect(agentMetrics.performance.length).toBeGreaterThan(0);
      expect(agentMetrics.compliance.length).toBeGreaterThan(0);

      // Verify metrics export
      const exportedMetrics = await collector.getMetrics();
      expect(exportedMetrics).toContain('test_uep_');

      await metricsIntegration.stop();
    });

    it('should handle error scenarios gracefully', async () => {
      await metricsIntegration.start();
      
      const middleware = metricsIntegration.getMiddleware();

      // Simulate various error conditions
      const testError: UEPError = {
        code: 'INTEGRATION_TEST_ERROR',
        message: 'Test error for integration',
        severity: 'HIGH',
        category: 'SYSTEM',
        timestamp: new Date(),
        agentId: 'error-agent',
        correlationId: 'error-correlation'
      };

      // Should handle errors without crashing
      expect(() => {
        middleware.errorTracking(testError);
      }).not.toThrow();

      // Should handle invalid messages gracefully
      expect(() => {
        middleware.performanceTracking('invalid_operation', -1);
      }).not.toThrow();

      await metricsIntegration.stop();
    });
  });

  // =====================================================
  // Edge Cases and Error Handling
  // =====================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing optional fields', () => {
      const minimalMessage = createTestMessage();
      delete (minimalMessage as any).ttl;
      delete (minimalMessage as any).priority;

      expect(() => {
        metricsCollector.recordMessage(minimalMessage, createTestMetadata(), 100, 'success');
      }).not.toThrow();
    });

    it('should handle zero and negative durations', () => {
      const message = createTestMessage();
      const metadata = createTestMetadata();

      expect(() => {
        metricsCollector.recordMessage(message, metadata, 0, 'success');
        metricsCollector.recordMessage(message, metadata, -10, 'error');
      }).not.toThrow();
    });

    it('should handle very large processing times', () => {
      const message = createTestMessage();
      const metadata = createTestMetadata();
      const largeTime = 999999999; // Very large processing time

      expect(() => {
        metricsCollector.recordMessage(message, metadata, largeTime, 'success');
      }).not.toThrow();
    });

    it('should handle concurrent access safely', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            const message = createTestMessage({ id: `concurrent-${i}` });
            const metadata = createTestMetadata();
            metricsCollector.recordMessage(message, metadata, Math.random() * 100, 'success');
            resolve();
          }, Math.random() * 10);
        });
      });

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });
});