/**
 * UEP Metrics Collector
 * 
 * Advanced Prometheus metrics collection system for UEP health monitoring.
 * Implements counters, histograms, gauges, and custom indicators following
 * 2024 best practices for Node.js observability.
 * 
 * Research-based implementation features:
 * - prom-client integration with proper metric types
 * - Response time histograms with SLO-optimized buckets
 * - Success/failure rate tracking with windowed analysis
 * - CPU/memory resource utilization monitoring
 * - Custom UEP protocol compliance indicators
 * - Low-cardinality labeling for optimal Prometheus performance
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation
 */

import * as client from 'prom-client';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';
import winston from 'winston';

// Types for metric collection
interface MetricLabels {
  agent_id?: string;
  service_name?: string;
  endpoint?: string;
  status?: 'success' | 'failure' | 'timeout';
  protocol_version?: string;
  environment?: string;
}

interface ResourceMetrics {
  cpuUsagePercent: number;
  memoryUsageBytes: number;
  memoryUsagePercent: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  loadAverage1m: number;
  openFileDescriptors: number;
  uptime: number;
}

interface UEPProtocolMetrics {
  complianceScore: number;
  protocolViolations: number;
  coordinationLatency: number;
  messageQueueDepth: number;
  activeConnections: number;
}

interface HealthMetrics {
  lastHeartbeat: number;
  healthScore: number;
  consecutiveFailures: number;
  totalHealthChecks: number;
  averageResponseTime: number;
}

/**
 * UEP Metrics Collector Class
 * 
 * Comprehensive metrics collection system using prom-client with
 * specialized support for UEP agent health monitoring and performance tracking.
 */
export class UEPMetricsCollector extends EventEmitter {
  private logger: winston.Logger;
  private metricsRegistry: client.Registry;
  private collectInterval: NodeJS.Timeout | null = null;
  private isCollecting = false;

  // Core Prometheus Metrics - Counters
  private requestsTotal: client.Counter<string>;
  private errorsTotal: client.Counter<string>;
  private protocolViolationsTotal: client.Counter<string>;
  private healthChecksTotal: client.Counter<string>;
  private coordinationEventsTotal: client.Counter<string>;

  // Core Prometheus Metrics - Histograms
  private responseTimeHistogram: client.Histogram<string>;
  private coordinationLatencyHistogram: client.Histogram<string>;
  private messageSizeHistogram: client.Histogram<string>;
  private healthCheckDurationHistogram: client.Histogram<string>;

  // Core Prometheus Metrics - Gauges
  private cpuUsageGauge: client.Gauge<string>;
  private memoryUsageGauge: client.Gauge<string>;
  private heapUsageGauge: client.Gauge<string>;
  private loadAverageGauge: client.Gauge<string>;
  private openFilesGauge: client.Gauge<string>;
  private uptimeGauge: client.Gauge<string>;

  // UEP-Specific Metrics
  private uepComplianceGauge: client.Gauge<string>;
  private activeAgentsGauge: client.Gauge<string>;
  private healthScoreGauge: client.Gauge<string>;
  private messageQueueDepthGauge: client.Gauge<string>;
  private activeConnectionsGauge: client.Gauge<string>;

  // Configuration
  private config = {
    collectInterval: 15000, // 15 seconds
    enableDefaultMetrics: true,
    labelNames: {
      agent: 'agent_id',
      service: 'service_name',
      endpoint: 'endpoint',
      status: 'status',
      environment: 'environment'
    }
  };

  constructor(config: Partial<typeof UEPMetricsCollector.prototype.config> = {}) {
    super();
    
    this.config = { ...this.config, ...config };
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/metrics-collector.log' })
      ]
    });

    // Create custom registry for isolation
    this.metricsRegistry = new client.Registry();
    
    // Initialize all metrics
    this.initializeCounters();
    this.initializeHistograms();
    this.initializeGauges();
    
    // Collect Node.js default metrics if enabled
    if (this.config.enableDefaultMetrics) {
      client.collectDefaultMetrics({ 
        register: this.metricsRegistry,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Optimize for typical GC patterns
        eventLoopMonitoringPrecision: 5
      });
    }

    this.logger.info('UEP Metrics Collector initialized successfully');
  }

  /**
   * Initialize Prometheus Counter metrics
   */
  private initializeCounters(): void {
    // Total requests counter with status and endpoint labels
    this.requestsTotal = new client.Counter({
      name: 'uep_agent_requests_total',
      help: 'Total number of requests handled by the UEP agent',
      labelNames: ['agent_id', 'service_name', 'endpoint', 'status', 'method'],
      registers: [this.metricsRegistry]
    });

    // Error tracking counter
    this.errorsTotal = new client.Counter({
      name: 'uep_agent_errors_total',
      help: 'Total number of errors encountered by the UEP agent',
      labelNames: ['agent_id', 'service_name', 'error_type', 'severity'],
      registers: [this.metricsRegistry]
    });

    // Protocol violations counter for UEP compliance
    this.protocolViolationsTotal = new client.Counter({
      name: 'uep_protocol_violations_total',
      help: 'Total number of UEP protocol violations detected',
      labelNames: ['agent_id', 'violation_type', 'severity'],
      registers: [this.metricsRegistry]
    });

    // Health checks counter
    this.healthChecksTotal = new client.Counter({
      name: 'uep_health_checks_total',
      help: 'Total number of health checks performed',
      labelNames: ['agent_id', 'check_type', 'result'],
      registers: [this.metricsRegistry]
    });

    // Coordination events counter
    this.coordinationEventsTotal = new client.Counter({
      name: 'uep_coordination_events_total',
      help: 'Total number of agent coordination events',
      labelNames: ['agent_id', 'event_type', 'target_agent'],
      registers: [this.metricsRegistry]
    });
  }

  /**
   * Initialize Prometheus Histogram metrics
   */
  private initializeHistograms(): void {
    // Response time histogram with SLO-optimized buckets
    this.responseTimeHistogram = new client.Histogram({
      name: 'uep_agent_response_time_seconds',
      help: 'Response time distribution for UEP agent requests',
      labelNames: ['agent_id', 'service_name', 'endpoint'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0], // Optimized for typical latency SLOs
      registers: [this.metricsRegistry]
    });

    // Coordination latency histogram
    this.coordinationLatencyHistogram = new client.Histogram({
      name: 'uep_coordination_latency_seconds',
      help: 'Latency distribution for agent coordination operations',
      labelNames: ['agent_id', 'operation_type', 'target_agent'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0], // Coordination-specific buckets
      registers: [this.metricsRegistry]
    });

    // Message size histogram
    this.messageSizeHistogram = new client.Histogram({
      name: 'uep_message_size_bytes',
      help: 'Size distribution of UEP protocol messages',
      labelNames: ['agent_id', 'message_type', 'direction'],
      buckets: [64, 256, 1024, 4096, 16384, 65536, 262144], // Network packet size buckets
      registers: [this.metricsRegistry]
    });

    // Health check duration histogram
    this.healthCheckDurationHistogram = new client.Histogram({
      name: 'uep_health_check_duration_seconds',
      help: 'Duration distribution of health check operations',
      labelNames: ['agent_id', 'check_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0], // Health check specific buckets
      registers: [this.metricsRegistry]
    });
  }

  /**
   * Initialize Prometheus Gauge metrics
   */
  private initializeGauges(): void {
    // CPU usage gauge
    this.cpuUsageGauge = new client.Gauge({
      name: 'uep_agent_cpu_usage_percent',
      help: 'Current CPU usage percentage of the UEP agent',
      labelNames: ['agent_id', 'service_name'],
      registers: [this.metricsRegistry]
    });

    // Memory usage gauge
    this.memoryUsageGauge = new client.Gauge({
      name: 'uep_agent_memory_usage_bytes',
      help: 'Current memory usage in bytes',
      labelNames: ['agent_id', 'service_name', 'memory_type'],
      registers: [this.metricsRegistry]
    });

    // Heap usage gauge
    this.heapUsageGauge = new client.Gauge({
      name: 'uep_agent_heap_usage_bytes',
      help: 'Current heap usage in bytes',
      labelNames: ['agent_id', 'heap_type'],
      registers: [this.metricsRegistry]
    });

    // Load average gauge
    this.loadAverageGauge = new client.Gauge({
      name: 'uep_agent_load_average',
      help: 'System load average',
      labelNames: ['agent_id', 'period'],
      registers: [this.metricsRegistry]
    });

    // Open files gauge
    this.openFilesGauge = new client.Gauge({
      name: 'uep_agent_open_files_total',
      help: 'Number of open file descriptors',
      labelNames: ['agent_id'],
      registers: [this.metricsRegistry]
    });

    // Uptime gauge
    this.uptimeGauge = new client.Gauge({
      name: 'uep_agent_uptime_seconds',
      help: 'Agent uptime in seconds',
      labelNames: ['agent_id', 'service_name'],
      registers: [this.metricsRegistry]
    });

    // UEP compliance score gauge
    this.uepComplianceGauge = new client.Gauge({
      name: 'uep_protocol_compliance_score',
      help: 'Current UEP protocol compliance score (0-1)',
      labelNames: ['agent_id', 'protocol_version'],
      registers: [this.metricsRegistry]
    });

    // Active agents gauge
    this.activeAgentsGauge = new client.Gauge({
      name: 'uep_active_agents_total',
      help: 'Number of currently active UEP agents',
      labelNames: ['service_name', 'environment'],
      registers: [this.metricsRegistry]
    });

    // Health score gauge
    this.healthScoreGauge = new client.Gauge({
      name: 'uep_agent_health_score',
      help: 'Current agent health score (0-100)',
      labelNames: ['agent_id', 'service_name'],
      registers: [this.metricsRegistry]
    });

    // Message queue depth gauge
    this.messageQueueDepthGauge = new client.Gauge({
      name: 'uep_message_queue_depth',
      help: 'Current depth of message queue',
      labelNames: ['agent_id', 'queue_type'],
      registers: [this.metricsRegistry]
    });

    // Active connections gauge
    this.activeConnectionsGauge = new client.Gauge({
      name: 'uep_active_connections_total',
      help: 'Number of active connections',
      labelNames: ['agent_id', 'connection_type'],
      registers: [this.metricsRegistry]
    });
  }

  /**
   * Start automatic metrics collection
   */
  public startCollection(): void {
    if (this.isCollecting) {
      this.logger.warn('Metrics collection is already running');
      return;
    }

    this.isCollecting = true;
    this.logger.info(`Starting metrics collection with ${this.config.collectInterval}ms interval`);

    // Initial collection
    this.collectSystemMetrics();

    // Set up periodic collection
    this.collectInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.collectInterval);

    this.emit('collectionStarted');
  }

  /**
   * Stop automatic metrics collection
   */
  public stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }

    this.logger.info('Stopped metrics collection');
    this.emit('collectionStopped');
  }

  /**
   * Collect system-level resource metrics
   */
  private collectSystemMetrics(): void {
    try {
      const agentId = process.env.AGENT_ID || 'unknown';
      const serviceName = process.env.SERVICE_NAME || 'uep-agent';

      // CPU usage (requires sampling over time)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = this.calculateCpuPercent(cpuUsage);
      this.cpuUsageGauge.set({ agent_id: agentId, service_name: serviceName }, cpuPercent);

      // Memory usage
      const memoryUsage = process.memoryUsage();
      this.memoryUsageGauge.set(
        { agent_id: agentId, service_name: serviceName, memory_type: 'rss' },
        memoryUsage.rss
      );
      this.memoryUsageGauge.set(
        { agent_id: agentId, service_name: serviceName, memory_type: 'heap_total' },
        memoryUsage.heapTotal
      );
      this.memoryUsageGauge.set(
        { agent_id: agentId, service_name: serviceName, memory_type: 'heap_used' },
        memoryUsage.heapUsed
      );
      this.memoryUsageGauge.set(
        { agent_id: agentId, service_name: serviceName, memory_type: 'external' },
        memoryUsage.external
      );

      // Heap usage
      this.heapUsageGauge.set({ agent_id: agentId, heap_type: 'used' }, memoryUsage.heapUsed);
      this.heapUsageGauge.set({ agent_id: agentId, heap_type: 'total' }, memoryUsage.heapTotal);

      // Load average
      const loadAverage = os.loadavg();
      this.loadAverageGauge.set({ agent_id: agentId, period: '1m' }, loadAverage[0]);
      this.loadAverageGauge.set({ agent_id: agentId, period: '5m' }, loadAverage[1]);
      this.loadAverageGauge.set({ agent_id: agentId, period: '15m' }, loadAverage[2]);

      // Uptime
      this.uptimeGauge.set({ agent_id: agentId, service_name: serviceName }, process.uptime());

      this.logger.debug('System metrics collected successfully');
      
    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuPercent(cpuUsage: NodeJS.CpuUsage): number {
    // This is a simplified calculation - in production, you'd want to track over time
    const totalUsage = cpuUsage.user + cpuUsage.system;
    const totalTime = process.uptime() * 1000000; // Convert to microseconds
    return Math.min(100, (totalUsage / totalTime) * 100);
  }

  /**
   * Record a request with timing and status
   */
  public recordRequest(
    agentId: string,
    serviceName: string,
    endpoint: string,
    method: string,
    status: 'success' | 'failure' | 'timeout',
    durationSeconds: number
  ): void {
    // Increment request counter
    this.requestsTotal.inc({
      agent_id: agentId,
      service_name: serviceName,
      endpoint,
      status,
      method
    });

    // Record response time
    this.responseTimeHistogram.observe(
      { agent_id: agentId, service_name: serviceName, endpoint },
      durationSeconds
    );

    this.logger.debug(`Recorded request: ${endpoint} ${status} ${durationSeconds}s`);
  }

  /**
   * Record an error occurrence
   */
  public recordError(
    agentId: string,
    serviceName: string,
    errorType: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    this.errorsTotal.inc({
      agent_id: agentId,
      service_name: serviceName,
      error_type: errorType,
      severity
    });

    this.logger.debug(`Recorded error: ${errorType} (${severity})`);
  }

  /**
   * Record UEP protocol violation
   */
  public recordProtocolViolation(
    agentId: string,
    violationType: string,
    severity: 'warning' | 'error' | 'critical'
  ): void {
    this.protocolViolationsTotal.inc({
      agent_id: agentId,
      violation_type: violationType,
      severity
    });

    this.logger.warn(`UEP protocol violation: ${violationType} (${severity})`);
  }

  /**
   * Record health check result
   */
  public recordHealthCheck(
    agentId: string,
    checkType: string,
    result: 'pass' | 'fail' | 'timeout',
    durationSeconds: number
  ): void {
    this.healthChecksTotal.inc({
      agent_id: agentId,
      check_type: checkType,
      result
    });

    this.healthCheckDurationHistogram.observe(
      { agent_id: agentId, check_type: checkType },
      durationSeconds
    );

    this.logger.debug(`Health check: ${checkType} ${result} ${durationSeconds}s`);
  }

  /**
   * Record coordination event
   */
  public recordCoordinationEvent(
    agentId: string,
    eventType: string,
    targetAgent: string,
    latencySeconds?: number
  ): void {
    this.coordinationEventsTotal.inc({
      agent_id: agentId,
      event_type: eventType,
      target_agent: targetAgent
    });

    if (latencySeconds !== undefined) {
      this.coordinationLatencyHistogram.observe(
        { agent_id: agentId, operation_type: eventType, target_agent: targetAgent },
        latencySeconds
      );
    }

    this.logger.debug(`Coordination event: ${eventType} -> ${targetAgent}`);
  }

  /**
   * Update UEP compliance score
   */
  public updateComplianceScore(
    agentId: string,
    protocolVersion: string,
    score: number
  ): void {
    // Normalize score to 0-1 range
    const normalizedScore = Math.max(0, Math.min(1, score));
    
    this.uepComplianceGauge.set(
      { agent_id: agentId, protocol_version: protocolVersion },
      normalizedScore
    );

    this.logger.debug(`UEP compliance score updated: ${agentId} = ${normalizedScore}`);
  }

  /**
   * Update agent health score
   */
  public updateHealthScore(
    agentId: string,
    serviceName: string,
    score: number
  ): void {
    // Normalize score to 0-100 range
    const normalizedScore = Math.max(0, Math.min(100, score));
    
    this.healthScoreGauge.set(
      { agent_id: agentId, service_name: serviceName },
      normalizedScore
    );

    this.logger.debug(`Health score updated: ${agentId} = ${normalizedScore}`);
  }

  /**
   * Update active agents count
   */
  public updateActiveAgents(serviceName: string, environment: string, count: number): void {
    this.activeAgentsGauge.set(
      { service_name: serviceName, environment },
      count
    );
  }

  /**
   * Update message queue depth
   */
  public updateMessageQueueDepth(
    agentId: string,
    queueType: string,
    depth: number
  ): void {
    this.messageQueueDepthGauge.set(
      { agent_id: agentId, queue_type: queueType },
      depth
    );
  }

  /**
   * Update active connections count
   */
  public updateActiveConnections(
    agentId: string,
    connectionType: string,
    count: number
  ): void {
    this.activeConnectionsGauge.set(
      { agent_id: agentId, connection_type: connectionType },
      count
    );
  }

  /**
   * Record message size
   */
  public recordMessageSize(
    agentId: string,
    messageType: string,
    direction: 'inbound' | 'outbound',
    sizeBytes: number
  ): void {
    this.messageSizeHistogram.observe(
      { agent_id: agentId, message_type: messageType, direction },
      sizeBytes
    );
  }

  /**
   * Get all metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    return await this.metricsRegistry.metrics();
  }

  /**
   * Get metrics registry for custom integration
   */
  public getRegistry(): client.Registry {
    return this.metricsRegistry;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metricsRegistry.resetMetrics();
    this.logger.info('All metrics have been reset');
  }

  /**
   * Get current metric values summary
   */
  public getMetricsSummary(): any {
    const summary = {
      timestamp: new Date().toISOString(),
      collection: {
        isActive: this.isCollecting,
        interval: this.config.collectInterval
      },
      systemMetrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        loadAverage: os.loadavg()
      }
    };

    return summary;
  }

  /**
   * Shutdown metrics collector gracefully
   */
  public shutdown(): void {
    this.logger.info('Shutting down UEP Metrics Collector...');
    
    this.stopCollection();
    this.metricsRegistry.clear();
    
    this.logger.info('UEP Metrics Collector shutdown complete');
  }
}

/**
 * Factory function to create UEP Metrics Collector
 */
export function createUEPMetricsCollector(
  config: Partial<InstanceType<typeof UEPMetricsCollector>['config']> = {}
): UEPMetricsCollector {
  return new UEPMetricsCollector(config);
}

// Export types for external use
export type {
  MetricLabels,
  ResourceMetrics,
  UEPProtocolMetrics,
  HealthMetrics
};