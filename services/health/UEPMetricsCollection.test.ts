/**
 * UEP Metrics Collection Tests
 * 
 * Comprehensive test suite for UEP Metrics Collector and Health Metrics Integration.
 * Tests Prometheus metrics collection, windowed analysis, SLO monitoring,
 * and health trend analysis functionality.
 * 
 * Research-based testing following 2024 best practices:
 * - Prometheus metrics validation
 * - Performance and accuracy testing
 * - Windowed metrics calculation verification
 * - Anomaly detection testing
 * - Integration testing with health monitoring
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { UEPMetricsCollector, createUEPMetricsCollector } from './UEPMetricsCollector';
import { UEPHealthMetricsIntegration, createUEPHealthMetricsIntegration } from './UEPHealthMetricsIntegration';
import * as client from 'prom-client';

// Mock prom-client to control metrics behavior
jest.mock('prom-client', () => {
  const actualPromClient = jest.requireActual('prom-client');
  
  return {
    ...actualPromClient,
    collectDefaultMetrics: jest.fn(),
    Registry: jest.fn().mockImplementation(() => ({
      resetMetrics: jest.fn(),
      clear: jest.fn(),
      metrics: jest.fn().mockResolvedValue('# Mocked metrics output'),
      setDefaultLabels: jest.fn(),
      registerMetric: jest.fn()
    })),
    Counter: jest.fn().mockImplementation((config) => ({
      name: config.name,
      help: config.help,
      labelNames: config.labelNames,
      inc: jest.fn(),
      get: jest.fn().mockReturnValue({ values: [] })
    })),
    Histogram: jest.fn().mockImplementation((config) => ({
      name: config.name,
      help: config.help,
      labelNames: config.labelNames,
      buckets: config.buckets,
      observe: jest.fn(),
      get: jest.fn().mockReturnValue({ values: [] })
    })),
    Gauge: jest.fn().mockImplementation((config) => ({
      name: config.name,
      help: config.help,
      labelNames: config.labelNames,
      set: jest.fn(),
      inc: jest.fn(),
      dec: jest.fn(),
      get: jest.fn().mockReturnValue({ values: [] })
    }))
  };
});

describe('UEP Metrics Collector', () => {
  let metricsCollector: UEPMetricsCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsCollector = createUEPMetricsCollector({
      collectInterval: 1000, // 1 second for testing
      enableDefaultMetrics: true
    });
  });

  afterEach(() => {
    if (metricsCollector) {
      metricsCollector.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(metricsCollector).toBeDefined();
      expect(client.Registry).toHaveBeenCalled();
    });

    it('should create all required metric types', () => {
      // Verify counters were created
      expect(client.Counter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'uep_agent_requests_total',
          help: expect.stringContaining('requests'),
          labelNames: expect.arrayContaining(['agent_id', 'service_name'])
        })
      );

      // Verify histograms were created
      expect(client.Histogram).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'uep_agent_response_time_seconds',
          help: expect.stringContaining('Response time'),
          buckets: expect.arrayContaining([0.005, 0.01, 0.025])
        })
      );

      // Verify gauges were created
      expect(client.Gauge).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'uep_agent_cpu_usage_percent',
          help: expect.stringContaining('CPU usage')
        })
      );
    });

    it('should collect default Node.js metrics when enabled', () => {
      expect(client.collectDefaultMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          register: expect.any(Object),
          gcDurationBuckets: expect.any(Array),
          eventLoopMonitoringPrecision: 5
        })
      );
    });
  });

  describe('Metrics Collection', () => {
    it('should start and stop collection correctly', () => {
      metricsCollector.startCollection();
      expect(metricsCollector['isCollecting']).toBe(true);
      
      metricsCollector.stopCollection();
      expect(metricsCollector['isCollecting']).toBe(false);
    });

    it('should record requests with proper labels', () => {
      const mockCounter = metricsCollector['requestsTotal'];
      
      metricsCollector.recordRequest(
        'test-agent-1',
        'test-service',
        '/health',
        'GET',
        'success',
        0.125
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        agent_id: 'test-agent-1',
        service_name: 'test-service',
        endpoint: '/health',
        status: 'success',
        method: 'GET'
      });
    });

    it('should record response times in histogram', () => {
      const mockHistogram = metricsCollector['responseTimeHistogram'];
      
      metricsCollector.recordRequest(
        'test-agent-1',
        'test-service',
        '/health',
        'GET',
        'success',
        0.125
      );

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { agent_id: 'test-agent-1', service_name: 'test-service', endpoint: '/health' },
        0.125
      );
    });

    it('should record errors with proper categorization', () => {
      const mockCounter = metricsCollector['errorsTotal'];
      
      metricsCollector.recordError(
        'test-agent-1',
        'test-service',
        'connection_timeout',
        'high'
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        agent_id: 'test-agent-1',
        service_name: 'test-service',
        error_type: 'connection_timeout',
        severity: 'high'
      });
    });

    it('should record protocol violations', () => {
      const mockCounter = metricsCollector['protocolViolationsTotal'];
      
      metricsCollector.recordProtocolViolation(
        'test-agent-1',
        'invalid_message_format',
        'error'
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        agent_id: 'test-agent-1',
        violation_type: 'invalid_message_format',
        severity: 'error'
      });
    });

    it('should update health scores within valid range', () => {
      const mockGauge = metricsCollector['healthScoreGauge'];
      
      // Test normal range
      metricsCollector.updateHealthScore('test-agent-1', 'test-service', 85);
      expect(mockGauge.set).toHaveBeenCalledWith(
        { agent_id: 'test-agent-1', service_name: 'test-service' },
        85
      );

      // Test clamping to maximum
      metricsCollector.updateHealthScore('test-agent-1', 'test-service', 150);
      expect(mockGauge.set).toHaveBeenCalledWith(
        { agent_id: 'test-agent-1', service_name: 'test-service' },
        100
      );

      // Test clamping to minimum
      metricsCollector.updateHealthScore('test-agent-1', 'test-service', -10);
      expect(mockGauge.set).toHaveBeenCalledWith(
        { agent_id: 'test-agent-1', service_name: 'test-service' },
        0
      );
    });

    it('should update compliance scores within 0-1 range', () => {
      const mockGauge = metricsCollector['uepComplianceGauge'];
      
      // Test normal range
      metricsCollector.updateComplianceScore('test-agent-1', '1.0', 0.95);
      expect(mockGauge.set).toHaveBeenCalledWith(
        { agent_id: 'test-agent-1', protocol_version: '1.0' },
        0.95
      );

      // Test clamping
      metricsCollector.updateComplianceScore('test-agent-1', '1.0', 1.5);
      expect(mockGauge.set).toHaveBeenCalledWith(
        { agent_id: 'test-agent-1', protocol_version: '1.0' },
        1.0
      );
    });
  });

  describe('Health Check Integration', () => {
    it('should record health checks with duration', () => {
      const mockCounter = metricsCollector['healthChecksTotal'];
      const mockHistogram = metricsCollector['healthCheckDurationHistogram'];
      
      metricsCollector.recordHealthCheck(
        'test-agent-1',
        'ttl-check',
        'pass',
        0.002
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        agent_id: 'test-agent-1',
        check_type: 'ttl-check',
        result: 'pass'
      });

      expect(mockHistogram.observe).toHaveBeenCalledWith(
        { agent_id: 'test-agent-1', check_type: 'ttl-check' },
        0.002
      );
    });

    it('should record coordination events', () => {
      const mockCounter = metricsCollector['coordinationEventsTotal'];
      const mockHistogram = metricsCollector['coordinationLatencyHistogram'];
      
      metricsCollector.recordCoordinationEvent(
        'test-agent-1',
        'task_assignment',
        'test-agent-2',
        0.050
      );

      expect(mockCounter.inc).toHaveBeenCalledWith({
        agent_id: 'test-agent-1',
        event_type: 'task_assignment',
        target_agent: 'test-agent-2'
      });

      expect(mockHistogram.observe).toHaveBeenCalledWith({
        agent_id: 'test-agent-1',
        operation_type: 'task_assignment',
        target_agent: 'test-agent-2'
      }, 0.050);
    });
  });

  describe('Metrics Output', () => {
    it('should return Prometheus-formatted metrics', async () => {
      const mockRegistry = metricsCollector.getRegistry();
      mockRegistry.metrics = jest.fn().mockResolvedValue('# HELP test_metric Test metric\n# TYPE test_metric counter\ntest_metric 1');
      
      const metrics = await metricsCollector.getMetrics();
      expect(metrics).toContain('# HELP test_metric Test metric');
      expect(metrics).toContain('test_metric 1');
    });

    it('should provide metrics summary', () => {
      const summary = metricsCollector.getMetricsSummary();
      
      expect(summary).toHaveProperty('timestamp');
      expect(summary).toHaveProperty('collection');
      expect(summary).toHaveProperty('systemMetrics');
      expect(summary.collection).toHaveProperty('isActive');
      expect(summary.systemMetrics).toHaveProperty('uptime');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle high-frequency metric updates', () => {
      const startTime = Date.now();
      
      // Record 1000 metrics
      for (let i = 0; i < 1000; i++) {
        metricsCollector.recordRequest(
          `agent-${i % 10}`,
          'test-service',
          '/health',
          'GET',
          'success',
          0.001
        );
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should reset metrics without memory leaks', () => {
      // Record some metrics
      metricsCollector.recordRequest('test-agent', 'test-service', '/health', 'GET', 'success', 0.1);
      metricsCollector.updateHealthScore('test-agent', 'test-service', 85);
      
      // Reset metrics
      metricsCollector.resetMetrics();
      
      const mockRegistry = metricsCollector.getRegistry();
      expect(mockRegistry.resetMetrics).toHaveBeenCalled();
    });
  });
});

describe('UEP Health Metrics Integration', () => {
  let metricsCollector: UEPMetricsCollector;
  let integration: UEPHealthMetricsIntegration;

  const mockHealthStatus = {
    agentId: 'test-agent-1',
    serviceName: 'test-service',
    status: 'passing' as const,
    lastUpdated: new Date(),
    ttlExpiry: new Date(Date.now() + 30000),
    metadata: {
      version: '1.0.0',
      capabilities: ['processing', 'coordination'],
      endpoints: {
        health: 'http://localhost:8080/health',
        api: 'http://localhost:8080/api'
      }
    },
    metrics: {
      responseTime: 125,
      successRate: 98.5,
      resourceUtilization: {
        cpu: 25,
        memory: 60
      },
      customMetrics: {
        uep_compliance_score: 0.95
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    metricsCollector = createUEPMetricsCollector();
    integration = createUEPHealthMetricsIntegration(metricsCollector, {
      enableAutoCollection: false, // Disable for testing
      healthCheckInterval: 1000,
      sloThresholds: {
        responseTimeP95: 0.5,
        successRate: 99.0,
        availabilityTarget: 99.9,
        complianceMinimum: 0.95
      }
    });
  });

  afterEach(async () => {
    await integration.stop();
    metricsCollector.shutdown();
  });

  describe('Health Status Processing', () => {
    it('should process health status updates', () => {
      integration.processHealthStatusUpdate(mockHealthStatus);
      
      // Check that metrics were recorded
      const mockHealthScoreGauge = metricsCollector['healthScoreGauge'];
      expect(mockHealthScoreGauge.set).toHaveBeenCalledWith(
        expect.objectContaining({ agent_id: 'test-agent-1' }),
        expect.any(Number)
      );
    });

    it('should calculate health scores correctly', () => {
      integration.processHealthStatusUpdate(mockHealthStatus);
      
      // Health score should be calculated based on multiple factors
      const healthScore = integration['calculateHealthScore'](mockHealthStatus);
      expect(healthScore).toBeGreaterThanOrEqual(0);
      expect(healthScore).toBeLessThanOrEqual(100);
      expect(typeof healthScore).toBe('number');
    });

    it('should store historical metrics', () => {
      integration.processHealthStatusUpdate(mockHealthStatus);
      
      const history = integration['metricHistory'].get('test-agent-1');
      expect(history).toBeDefined();
      expect(history!.length).toBe(1);
      expect(history![0]).toHaveProperty('timestamp');
      expect(history![0]).toHaveProperty('metrics');
    });

    it('should limit historical data to prevent memory bloat', () => {
      // Add 1500 entries (more than the 1000 limit)
      for (let i = 0; i < 1500; i++) {
        const statusUpdate = {
          ...mockHealthStatus,
          lastUpdated: new Date(Date.now() + i * 1000)
        };
        integration.processHealthStatusUpdate(statusUpdate);
      }
      
      const history = integration['metricHistory'].get('test-agent-1');
      expect(history!.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Windowed Metrics Calculation', () => {
    beforeEach(() => {
      // Add some historical data
      for (let i = 0; i < 20; i++) {
        const status = i % 4 === 0 ? 'critical' : i % 8 === 0 ? 'warning' : 'passing';
        const statusUpdate = {
          ...mockHealthStatus,
          status: status as any,
          lastUpdated: new Date(Date.now() - (20 - i) * 30000), // 30 second intervals
          metrics: {
            ...mockHealthStatus.metrics,
            responseTime: 100 + (i * 10),
            successRate: status === 'passing' ? 99 : status === 'warning' ? 85 : 50
          }
        };
        integration.processHealthStatusUpdate(statusUpdate);
      }
    });

    it('should calculate windowed metrics correctly', () => {
      const windowedMetrics = integration.calculateWindowedMetrics('test-agent-1', 600); // 10 minutes
      
      expect(windowedMetrics).toBeDefined();
      expect(windowedMetrics!.timeWindow).toBe('600s');
      expect(windowedMetrics!.metrics.totalRequests).toBeGreaterThan(0);
      expect(windowedMetrics!.metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(windowedMetrics!.metrics.successRate).toBeLessThanOrEqual(100);
      expect(windowedMetrics!.metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should return null for agents with no history', () => {
      const windowedMetrics = integration.calculateWindowedMetrics('non-existent-agent', 300);
      expect(windowedMetrics).toBeNull();
    });

    it('should calculate P95 response times correctly', () => {
      const windowedMetrics = integration.calculateWindowedMetrics('test-agent-1', 600);
      
      expect(windowedMetrics!.metrics.p95ResponseTime).toBeGreaterThanOrEqual(
        windowedMetrics!.metrics.averageResponseTime
      );
    });
  });

  describe('Trend Analysis', () => {
    beforeEach(() => {
      // Add historical data spanning 2 hours with a clear trend
      const now = Date.now();
      for (let i = 0; i < 40; i++) {
        const timestamp = now - (40 - i) * 3 * 60 * 1000; // 3-minute intervals over 2 hours
        const degradingTrend = i > 20; // Health degrades after midpoint
        
        const statusUpdate = {
          ...mockHealthStatus,
          status: degradingTrend && i > 35 ? 'warning' as const : 'passing' as const,
          lastUpdated: new Date(timestamp),
          metrics: {
            ...mockHealthStatus.metrics,
            responseTime: degradingTrend ? 200 + (i - 20) * 10 : 100 + i * 2,
            successRate: degradingTrend ? Math.max(80, 100 - (i - 20) * 2) : 99
          }
        };
        integration.processHealthStatusUpdate(statusUpdate);
      }
    });

    it('should generate trend analysis', () => {
      const trendAnalysis = integration.generateHealthTrendAnalysis('test-agent-1', 2);
      
      expect(trendAnalysis).toBeDefined();
      expect(trendAnalysis!.agentId).toBe('test-agent-1');
      expect(trendAnalysis!.trends).toHaveProperty('healthScore');
      expect(trendAnalysis!.trends).toHaveProperty('responseTime');
      expect(trendAnalysis!.trends).toHaveProperty('availability');
    });

    it('should detect degrading trends', () => {
      const trendAnalysis = integration.generateHealthTrendAnalysis('test-agent-1', 2);
      
      // Response time should be degrading due to the test data pattern
      expect(trendAnalysis!.trends.responseTime.trend).toBe('degrading');
      expect(trendAnalysis!.trends.responseTime.change).toBeGreaterThan(0);
    });

    it('should identify anomalies', () => {
      const trendAnalysis = integration.generateHealthTrendAnalysis('test-agent-1', 2);
      
      expect(trendAnalysis!.anomalies).toBeDefined();
      expect(Array.isArray(trendAnalysis!.anomalies)).toBe(true);
      
      // Should detect response time anomalies due to the spike pattern
      const responseTimeAnomalies = trendAnalysis!.anomalies.filter(a => a.type === 'response_time_anomaly');
      expect(responseTimeAnomalies.length).toBeGreaterThan(0);
    });

    it('should return null for insufficient data', () => {
      const trendAnalysis = integration.generateHealthTrendAnalysis('non-existent-agent', 1);
      expect(trendAnalysis).toBeNull();
    });
  });

  describe('Anomaly Detection', () => {
    it('should emit anomaly events for response time spikes', (done) => {
      // Add baseline data
      for (let i = 0; i < 10; i++) {
        const statusUpdate = {
          ...mockHealthStatus,
          metrics: { ...mockHealthStatus.metrics, responseTime: 100 }
        };
        integration.processHealthStatusUpdate(statusUpdate);
      }

      integration.on('anomalyDetected', (anomaly) => {
        expect(anomaly.type).toBe('response_time_spike');
        expect(anomaly.agentId).toBe('test-agent-1');
        done();
      });

      // Trigger spike
      const spikeStatus = {
        ...mockHealthStatus,
        metrics: { ...mockHealthStatus.metrics, responseTime: 500 } // 5x higher
      };
      integration.processHealthStatusUpdate(spikeStatus);
    });

    it('should emit anomaly events for success rate drops', (done) => {
      // Add baseline data
      for (let i = 0; i < 10; i++) {
        const statusUpdate = {
          ...mockHealthStatus,
          metrics: { ...mockHealthStatus.metrics, successRate: 99 }
        };
        integration.processHealthStatusUpdate(statusUpdate);
      }

      integration.on('anomalyDetected', (anomaly) => {
        expect(anomaly.type).toBe('success_rate_drop');
        expect(anomaly.severity).toBe('high');
        done();
      });

      // Trigger drop
      const dropStatus = {
        ...mockHealthStatus,
        metrics: { ...mockHealthStatus.metrics, successRate: 70 } // Significant drop
      };
      integration.processHealthStatusUpdate(dropStatus);
    });

    it('should emit anomaly events for CPU usage spikes', (done) => {
      // Add baseline data
      for (let i = 0; i < 10; i++) {
        const statusUpdate = {
          ...mockHealthStatus,
          metrics: {
            ...mockHealthStatus.metrics,
            resourceUtilization: { cpu: 30, memory: 50 }
          }
        };
        integration.processHealthStatusUpdate(statusUpdate);
      }

      integration.on('anomalyDetected', (anomaly) => {
        expect(anomaly.type).toBe('cpu_usage_spike');
        done();
      });

      // Trigger spike
      const spikeStatus = {
        ...mockHealthStatus,
        metrics: {
          ...mockHealthStatus.metrics,
          resourceUtilization: { cpu: 90, memory: 50 } // High CPU usage
        }
      };
      integration.processHealthStatusUpdate(spikeStatus);
    });
  });

  describe('Service Lifecycle', () => {
    it('should start and stop correctly', async () => {
      await integration.start();
      expect(integration['collectionInterval']).toBeDefined();
      expect(integration['analysisInterval']).toBeDefined();
      
      await integration.stop();
      expect(integration['collectionInterval']).toBeNull();
      expect(integration['analysisInterval']).toBeNull();
    });

    it('should emit lifecycle events', (done) => {
      let eventsReceived = 0;
      
      integration.on('started', () => {
        eventsReceived++;
        if (eventsReceived === 2) done();
      });
      
      integration.on('stopped', () => {
        eventsReceived++;
        if (eventsReceived === 2) done();
      });

      integration.start().then(() => integration.stop());
    });
  });

  describe('Metrics Summary', () => {
    it('should provide comprehensive metrics summary', () => {
      integration.processHealthStatusUpdate(mockHealthStatus);
      integration.processHealthStatusUpdate({
        ...mockHealthStatus,
        agentId: 'test-agent-2',
        status: 'warning'
      });
      integration.processHealthStatusUpdate({
        ...mockHealthStatus,
        agentId: 'test-agent-3',
        status: 'critical'
      });

      const summary = integration.getMetricsSummary();
      
      expect(summary.totalAgents).toBe(3);
      expect(summary.healthyAgents).toBe(1);
      expect(summary.warningAgents).toBe(1);
      expect(summary.criticalAgents).toBe(1);
      expect(summary.averageHealthScore).toBeGreaterThan(0);
    });
  });

  describe('Performance Testing', () => {
    it('should handle high-volume health status updates', () => {
      const startTime = Date.now();
      
      // Process 1000 health status updates
      for (let i = 0; i < 1000; i++) {
        const statusUpdate = {
          ...mockHealthStatus,
          agentId: `test-agent-${i % 50}`, // 50 different agents
          lastUpdated: new Date(Date.now() + i)
        };
        integration.processHealthStatusUpdate(statusUpdate);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently calculate windowed metrics for multiple agents', () => {
      // Add data for multiple agents
      for (let agentIndex = 0; agentIndex < 10; agentIndex++) {
        for (let i = 0; i < 50; i++) {
          const statusUpdate = {
            ...mockHealthStatus,
            agentId: `test-agent-${agentIndex}`,
            lastUpdated: new Date(Date.now() - (50 - i) * 30000)
          };
          integration.processHealthStatusUpdate(statusUpdate);
        }
      }

      const startTime = Date.now();
      
      // Calculate windowed metrics for all agents
      for (let agentIndex = 0; agentIndex < 10; agentIndex++) {
        const metrics = integration.calculateWindowedMetrics(`test-agent-${agentIndex}`, 900);
        expect(metrics).toBeDefined();
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});