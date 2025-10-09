/**
 * UEP Metrics Collection System
 * 
 * Comprehensive metrics collection for Universal Execution Protocol (UEP)
 * compliance, performance, and coordination patterns across all containerized agents.
 * 
 * Features:
 * - Protocol compliance tracking
 * - Performance metrics (latency, throughput, error rates)
 * - Agent coordination patterns
 * - Custom UEP metrics for Prometheus
 * - Real-time metric aggregation
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { promisify } from 'util';
import * as promClient from 'prom-client';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPProtocolVersion,
  UEPCoordinationEvent,
  UEPComplianceReport,
  UEPPerformanceReport
} from '../types/UEPTypes';

// =====================================================
// Core Interfaces and Types
// =====================================================

export interface UEPMetricsConfig {
  collection: {
    enabled: boolean;
    interval: number; // milliseconds
    retention: string; // e.g., "7d", "30d"
    bufferSize: number;
  };
  prometheus: {
    port: number;
    endpoint: string;
    prefix: string;
    labels: Record<string, string>;
  };
  compliance: {
    strictMode: boolean;
    violationThreshold: number;
    alertingEnabled: boolean;
  };
  performance: {
    percentiles: number[];
    sampleRate: number;
    buckets: number[];
  };
  export: {
    enabled: boolean;
    format: 'prometheus' | 'json' | 'csv';
    destination: string;
  };
}

export interface UEPMetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labelNames: string[];
  buckets?: number[];
  percentiles?: number[];
}

export interface UEPMetricSample {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
  agentId: string;
  correlationId?: string;
}

export interface UEPComplianceMetrics {
  protocolVersion: string;
  totalMessages: number;
  compliantMessages: number;
  violations: UEPViolationMetric[];
  complianceRate: number;
  lastUpdated: Date;
}

export interface UEPViolationMetric {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  firstSeen: Date;
  lastSeen: Date;
}

export interface UEPPerformanceMetrics {
  latency: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  throughput: {
    messagesPerSecond: number;
    bytesPerSecond: number;
  };
  errorRate: {
    rate: number;
    count: number;
    types: Record<string, number>;
  };
  agentCoordination: {
    activeAgents: number;
    coordinationEvents: number;
    successfulCoordinations: number;
    failedCoordinations: number;
  };
}

export interface UEPCoordinationMetrics {
  totalCoordinations: number;
  successfulCoordinations: number;
  failedCoordinations: number;
  coordinationPatterns: Record<string, number>;
  averageCoordinationTime: number;
  agentParticipation: Record<string, number>;
}

// =====================================================
// UEP Metrics Collector
// =====================================================

export class UEPMetricsCollector extends EventEmitter {
  private config: UEPMetricsConfig;
  private metrics: Map<string, promClient.Metric<string>> = new Map();
  private registry: promClient.Registry;
  private sampleBuffer: UEPMetricSample[] = [];
  private complianceTracker: Map<string, UEPComplianceMetrics> = new Map();
  private performanceTracker: Map<string, UEPPerformanceMetrics> = new Map();
  private coordinationTracker: Map<string, UEPCoordinationMetrics> = new Map();
  private collectInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  // Prometheus metrics
  private messageCounter: promClient.Counter<string>;
  private complianceGauge: promClient.Gauge<string>;
  private latencyHistogram: promClient.Histogram<string>;
  private throughputGauge: promClient.Gauge<string>;
  private errorCounter: promClient.Counter<string>;
  private coordinationCounter: promClient.Counter<string>;
  private agentStatusGauge: promClient.Gauge<string>;
  private protocolVersionGauge: promClient.Gauge<string>;

  constructor(config: UEPMetricsConfig) {
    super();
    this.config = this.validateConfig(config);
    this.registry = new promClient.Registry();
    this.initializeMetrics();
    this.setupEventHandlers();
  }

  // =====================================================
  // Initialization Methods
  // =====================================================

  private validateConfig(config: UEPMetricsConfig): UEPMetricsConfig {
    if (!config.collection?.enabled) {
      throw new Error('Metrics collection must be enabled');
    }

    if (config.collection.interval < 1000) {
      throw new Error('Collection interval must be at least 1000ms');
    }

    if (!config.prometheus?.port || config.prometheus.port < 1 || config.prometheus.port > 65535) {
      throw new Error('Invalid Prometheus port configuration');
    }

    return {
      ...config,
      prometheus: {
        prefix: 'uep_',
        endpoint: '/metrics',
        labels: {},
        ...config.prometheus
      },
      performance: {
        percentiles: [0.5, 0.9, 0.95, 0.99],
        sampleRate: 1.0,
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        ...config.performance
      }
    };
  }

  private initializeMetrics(): void {
    const prefix = this.config.prometheus.prefix;
    const defaultLabels = this.config.prometheus.labels;

    // Message processing metrics
    this.messageCounter = new promClient.Counter({
      name: `${prefix}messages_total`,
      help: 'Total number of UEP messages processed',
      labelNames: ['agent_id', 'message_type', 'protocol_version', 'status'],
      registers: [this.registry]
    });

    // Protocol compliance metrics
    this.complianceGauge = new promClient.Gauge({
      name: `${prefix}compliance_rate`,
      help: 'UEP protocol compliance rate (0-1)',
      labelNames: ['agent_id', 'protocol_version'],
      registers: [this.registry]
    });

    // Performance metrics
    this.latencyHistogram = new promClient.Histogram({
      name: `${prefix}message_duration_seconds`,
      help: 'UEP message processing duration in seconds',
      labelNames: ['agent_id', 'message_type', 'operation'],
      buckets: this.config.performance.buckets,
      registers: [this.registry]
    });

    this.throughputGauge = new promClient.Gauge({
      name: `${prefix}throughput_messages_per_second`,
      help: 'UEP message throughput in messages per second',
      labelNames: ['agent_id', 'direction'],
      registers: [this.registry]
    });

    // Error tracking metrics
    this.errorCounter = new promClient.Counter({
      name: `${prefix}errors_total`,
      help: 'Total number of UEP protocol errors',
      labelNames: ['agent_id', 'error_type', 'severity'],
      registers: [this.registry]
    });

    // Coordination metrics
    this.coordinationCounter = new promClient.Counter({
      name: `${prefix}coordinations_total`,
      help: 'Total number of agent coordination events',
      labelNames: ['coordinator_id', 'participant_id', 'pattern', 'status'],
      registers: [this.registry]
    });

    // Agent status metrics
    this.agentStatusGauge = new promClient.Gauge({
      name: `${prefix}agent_status`,
      help: 'Agent status (1=active, 0=inactive)',
      labelNames: ['agent_id', 'agent_type', 'version'],
      registers: [this.registry]
    });

    // Protocol version tracking
    this.protocolVersionGauge = new promClient.Gauge({
      name: `${prefix}protocol_version`,
      help: 'UEP protocol version in use',
      labelNames: ['agent_id', 'version'],
      registers: [this.registry]
    });

    // Set default labels
    this.registry.setDefaultLabels(defaultLabels);
  }

  private setupEventHandlers(): void {
    this.on('message:processed', this.handleMessageProcessed.bind(this));
    this.on('compliance:violation', this.handleComplianceViolation.bind(this));
    this.on('performance:sample', this.handlePerformanceSample.bind(this));
    this.on('coordination:event', this.handleCoordinationEvent.bind(this));
    this.on('agent:status', this.handleAgentStatus.bind(this));
    this.on('error', this.handleError.bind(this));
  }

  // =====================================================
  // Public API Methods
  // =====================================================

  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Metrics collector is already running');
    }

    try {
      // Start collection interval
      this.collectInterval = setInterval(
        this.collectMetrics.bind(this),
        this.config.collection.interval
      );

      // Start Prometheus metrics server
      await this.startMetricsServer();

      this.isRunning = true;
      this.emit('collector:started');
      
      console.log(`UEP Metrics Collector started on port ${this.config.prometheus.port}`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Stop collection interval
      if (this.collectInterval) {
        clearInterval(this.collectInterval);
        this.collectInterval = null;
      }

      // Final metrics collection
      await this.collectMetrics();

      // Export final metrics if configured
      if (this.config.export.enabled) {
        await this.exportMetrics();
      }

      this.isRunning = false;
      this.emit('collector:stopped');
      
      console.log('UEP Metrics Collector stopped');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public recordMessage(
    message: UEPMessage,
    metadata: UEPMessageMetadata,
    processingTime: number,
    status: 'success' | 'error' | 'violation'
  ): void {
    // Record message counter
    this.messageCounter.inc({
      agent_id: message.sender.id,
      message_type: message.type,
      protocol_version: message.protocolVersion,
      status
    });

    // Record processing latency
    this.latencyHistogram.observe(
      {
        agent_id: message.sender.id,
        message_type: message.type,
        operation: 'process'
      },
      processingTime / 1000 // Convert to seconds
    );

    // Emit processing event
    this.emit('message:processed', {
      message,
      metadata,
      processingTime,
      status,
      timestamp: new Date()
    });
  }

  public recordCompliance(
    agentId: string,
    protocolVersion: string,
    complianceRate: number,
    violations?: UEPViolationMetric[]
  ): void {
    // Update compliance gauge
    this.complianceGauge.set(
      { agent_id: agentId, protocol_version: protocolVersion },
      complianceRate
    );

    // Record violations
    if (violations && violations.length > 0) {
      violations.forEach(violation => {
        this.errorCounter.inc({
          agent_id: agentId,
          error_type: violation.type,
          severity: violation.severity
        });
      });
    }

    // Update compliance tracker
    const complianceKey = `${agentId}:${protocolVersion}`;
    this.complianceTracker.set(complianceKey, {
      protocolVersion,
      totalMessages: this.messageCounter.get().values.reduce((sum, metric) => 
        metric.labels.agent_id === agentId ? sum + metric.value : sum, 0),
      compliantMessages: Math.floor(complianceRate * 100),
      violations: violations || [],
      complianceRate,
      lastUpdated: new Date()
    });
  }

  public recordPerformance(
    agentId: string,
    metrics: Partial<UEPPerformanceMetrics>
  ): void {
    if (metrics.throughput) {
      this.throughputGauge.set(
        { agent_id: agentId, direction: 'inbound' },
        metrics.throughput.messagesPerSecond
      );
    }

    if (metrics.errorRate) {
      Object.entries(metrics.errorRate.types || {}).forEach(([errorType, count]) => {
        this.errorCounter.inc(
          { agent_id: agentId, error_type: errorType, severity: 'medium' },
          count
        );
      });
    }

    // Emit performance sample
    this.emit('performance:sample', {
      agentId,
      metrics,
      timestamp: new Date()
    });
  }

  public recordCoordination(
    coordinatorId: string,
    participantId: string,
    pattern: string,
    status: 'success' | 'failure',
    duration?: number
  ): void {
    // Record coordination counter
    this.coordinationCounter.inc({
      coordinator_id: coordinatorId,
      participant_id: participantId,
      pattern,
      status
    });

    // Record coordination latency if provided
    if (duration !== undefined) {
      this.latencyHistogram.observe(
        {
          agent_id: coordinatorId,
          message_type: 'coordination',
          operation: pattern
        },
        duration / 1000
      );
    }

    // Emit coordination event
    this.emit('coordination:event', {
      coordinatorId,
      participantId,
      pattern,
      status,
      duration,
      timestamp: new Date()
    });
  }

  public recordAgentStatus(
    agentId: string,
    agentType: string,
    version: string,
    status: 'active' | 'inactive'
  ): void {
    this.agentStatusGauge.set(
      { agent_id: agentId, agent_type: agentType, version },
      status === 'active' ? 1 : 0
    );

    this.emit('agent:status', {
      agentId,
      agentType,
      version,
      status,
      timestamp: new Date()
    });
  }

  public getComplianceReport(agentId?: string): UEPComplianceReport[] {
    const reports: UEPComplianceReport[] = [];
    
    for (const [key, metrics] of this.complianceTracker) {
      if (!agentId || key.startsWith(`${agentId}:`)) {
        reports.push({
          agentId: key.split(':')[0],
          protocolVersion: metrics.protocolVersion,
          complianceRate: metrics.complianceRate,
          totalMessages: metrics.totalMessages,
          violations: metrics.violations,
          lastUpdated: metrics.lastUpdated
        });
      }
    }

    return reports;
  }

  public getPerformanceReport(agentId?: string): UEPPerformanceReport[] {
    const reports: UEPPerformanceReport[] = [];
    
    for (const [key, metrics] of this.performanceTracker) {
      if (!agentId || key === agentId) {
        reports.push({
          agentId: key,
          latency: metrics.latency,
          throughput: metrics.throughput,
          errorRate: metrics.errorRate,
          coordination: metrics.agentCoordination,
          timestamp: new Date()
        });
      }
    }

    return reports;
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  public getRegistry(): promClient.Registry {
    return this.registry;
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private async collectMetrics(): Promise<void> {
    try {
      // Process sample buffer
      this.processSampleBuffer();

      // Update aggregated metrics
      await this.updateAggregatedMetrics();

      // Emit collection event
      this.emit('metrics:collected', {
        sampleCount: this.sampleBuffer.length,
        timestamp: new Date()
      });

      // Clear processed samples
      this.sampleBuffer = [];
    } catch (error) {
      this.emit('error', error);
    }
  }

  private processSampleBuffer(): void {
    // Group samples by agent and metric type
    const groupedSamples = new Map<string, Map<string, UEPMetricSample[]>>();

    this.sampleBuffer.forEach(sample => {
      if (!groupedSamples.has(sample.agentId)) {
        groupedSamples.set(sample.agentId, new Map());
      }
      
      const agentSamples = groupedSamples.get(sample.agentId)!;
      if (!agentSamples.has(sample.name)) {
        agentSamples.set(sample.name, []);
      }
      
      agentSamples.get(sample.name)!.push(sample);
    });

    // Process each agent's samples
    for (const [agentId, agentSamples] of groupedSamples) {
      this.processAgentSamples(agentId, agentSamples);
    }
  }

  private processAgentSamples(
    agentId: string,
    samples: Map<string, UEPMetricSample[]>
  ): void {
    for (const [metricName, metricSamples] of samples) {
      switch (metricName) {
        case 'latency':
          this.processLatencySamples(agentId, metricSamples);
          break;
        case 'throughput':
          this.processThroughputSamples(agentId, metricSamples);
          break;
        case 'error_rate':
          this.processErrorSamples(agentId, metricSamples);
          break;
        default:
          this.processGenericSamples(agentId, metricName, metricSamples);
      }
    }
  }

  private processLatencySamples(agentId: string, samples: UEPMetricSample[]): void {
    if (samples.length === 0) return;

    const values = samples.map(s => s.value).sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    const latencyMetrics: UEPPerformanceMetrics['latency'] = {
      mean,
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
      max: Math.max(...values)
    };

    // Update performance tracker
    if (!this.performanceTracker.has(agentId)) {
      this.performanceTracker.set(agentId, this.createEmptyPerformanceMetrics());
    }
    
    const metrics = this.performanceTracker.get(agentId)!;
    metrics.latency = latencyMetrics;
    this.performanceTracker.set(agentId, metrics);
  }

  private processThroughputSamples(agentId: string, samples: UEPMetricSample[]): void {
    if (samples.length === 0) return;

    const latestSample = samples[samples.length - 1];
    const throughputMetrics = {
      messagesPerSecond: latestSample.value,
      bytesPerSecond: latestSample.labels.bytes_per_second ? 
        parseFloat(latestSample.labels.bytes_per_second) : 0
    };

    // Update performance tracker
    if (!this.performanceTracker.has(agentId)) {
      this.performanceTracker.set(agentId, this.createEmptyPerformanceMetrics());
    }
    
    const metrics = this.performanceTracker.get(agentId)!;
    metrics.throughput = throughputMetrics;
    this.performanceTracker.set(agentId, metrics);
  }

  private processErrorSamples(agentId: string, samples: UEPMetricSample[]): void {
    if (samples.length === 0) return;

    const totalErrors = samples.reduce((sum, sample) => sum + sample.value, 0);
    const errorTypes: Record<string, number> = {};
    
    samples.forEach(sample => {
      const errorType = sample.labels.error_type || 'unknown';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + sample.value;
    });

    const errorMetrics = {
      rate: totalErrors / samples.length,
      count: totalErrors,
      types: errorTypes
    };

    // Update performance tracker
    if (!this.performanceTracker.has(agentId)) {
      this.performanceTracker.set(agentId, this.createEmptyPerformanceMetrics());
    }
    
    const metrics = this.performanceTracker.get(agentId)!;
    metrics.errorRate = errorMetrics;
    this.performanceTracker.set(agentId, metrics);
  }

  private processGenericSamples(
    agentId: string,
    metricName: string,
    samples: UEPMetricSample[]
  ): void {
    // Process any other metric types
    samples.forEach(sample => {
      this.emit('metric:processed', {
        agentId,
        metricName,
        sample,
        timestamp: new Date()
      });
    });
  }

  private async updateAggregatedMetrics(): Promise<void> {
    // Update system-wide aggregated metrics
    const totalAgents = this.agentStatusGauge.get().values.length;
    const activeAgents = this.agentStatusGauge.get().values
      .filter(metric => metric.value === 1).length;

    // System health metrics could be added here
    this.emit('metrics:aggregated', {
      totalAgents,
      activeAgents,
      timestamp: new Date()
    });
  }

  private createEmptyPerformanceMetrics(): UEPPerformanceMetrics {
    return {
      latency: { mean: 0, p50: 0, p95: 0, p99: 0, max: 0 },
      throughput: { messagesPerSecond: 0, bytesPerSecond: 0 },
      errorRate: { rate: 0, count: 0, types: {} },
      agentCoordination: {
        activeAgents: 0,
        coordinationEvents: 0,
        successfulCoordinations: 0,
        failedCoordinations: 0
      }
    };
  }

  private percentile(values: number[], p: number): number {
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private async startMetricsServer(): Promise<void> {
    // This would typically start an HTTP server for Prometheus scraping
    // Implementation depends on the HTTP framework being used
    console.log(`Metrics server would start on port ${this.config.prometheus.port}`);
  }

  private async exportMetrics(): Promise<void> {
    if (!this.config.export.enabled) return;

    try {
      const metrics = await this.getMetrics();
      
      switch (this.config.export.format) {
        case 'prometheus':
          await this.exportPrometheusFormat(metrics);
          break;
        case 'json':
          await this.exportJsonFormat();
          break;
        case 'csv':
          await this.exportCsvFormat();
          break;
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async exportPrometheusFormat(metrics: string): Promise<void> {
    // Export in Prometheus format
    console.log('Exporting metrics in Prometheus format to:', this.config.export.destination);
  }

  private async exportJsonFormat(): Promise<void> {
    // Export in JSON format
    console.log('Exporting metrics in JSON format to:', this.config.export.destination);
  }

  private async exportCsvFormat(): Promise<void> {
    // Export in CSV format
    console.log('Exporting metrics in CSV format to:', this.config.export.destination);
  }

  // =====================================================
  // Event Handlers
  // =====================================================

  private handleMessageProcessed(event: any): void {
    // Process message event and update relevant metrics
    this.sampleBuffer.push({
      name: 'message_processed',
      value: 1,
      labels: {
        agent_id: event.message.sender.id,
        message_type: event.message.type,
        status: event.status
      },
      timestamp: event.timestamp,
      agentId: event.message.sender.id,
      correlationId: event.message.correlationId
    });
  }

  private handleComplianceViolation(event: any): void {
    // Handle compliance violation events
    this.emit('alert:compliance_violation', event);
  }

  private handlePerformanceSample(event: any): void {
    // Handle performance sample events
    if (event.metrics.latency) {
      this.sampleBuffer.push({
        name: 'latency',
        value: event.metrics.latency.mean,
        labels: {
          agent_id: event.agentId,
          metric_type: 'latency'
        },
        timestamp: event.timestamp,
        agentId: event.agentId
      });
    }
  }

  private handleCoordinationEvent(event: any): void {
    // Handle coordination events
    this.sampleBuffer.push({
      name: 'coordination',
      value: 1,
      labels: {
        coordinator_id: event.coordinatorId,
        participant_id: event.participantId,
        pattern: event.pattern,
        status: event.status
      },
      timestamp: event.timestamp,
      agentId: event.coordinatorId
    });
  }

  private handleAgentStatus(event: any): void {
    // Handle agent status changes
    this.emit('agent:status_changed', event);
  }

  private handleError(error: Error): void {
    console.error('UEP Metrics Collector Error:', error);
  }
}

// =====================================================
// Factory Functions
// =====================================================

export function createUEPMetricsCollector(config: Partial<UEPMetricsConfig> = {}): UEPMetricsCollector {
  const defaultConfig: UEPMetricsConfig = {
    collection: {
      enabled: true,
      interval: 30000, // 30 seconds
      retention: '7d',
      bufferSize: 10000
    },
    prometheus: {
      port: 9090,
      endpoint: '/metrics',
      prefix: 'uep_',
      labels: {
        service: 'uep-metrics-collector',
        version: '1.0.0'
      }
    },
    compliance: {
      strictMode: true,
      violationThreshold: 0.05, // 5% violation threshold
      alertingEnabled: true
    },
    performance: {
      percentiles: [0.5, 0.9, 0.95, 0.99],
      sampleRate: 1.0,
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
    },
    export: {
      enabled: false,
      format: 'prometheus',
      destination: '/tmp/uep-metrics'
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    collection: { ...defaultConfig.collection, ...config.collection },
    prometheus: { ...defaultConfig.prometheus, ...config.prometheus },
    compliance: { ...defaultConfig.compliance, ...config.compliance },
    performance: { ...defaultConfig.performance, ...config.performance },
    export: { ...defaultConfig.export, ...config.export }
  };

  return new UEPMetricsCollector(mergedConfig);
}

export default UEPMetricsCollector;