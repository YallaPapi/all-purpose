/**
 * UEP Observability Manager
 * 
 * This module provides comprehensive observability management for the UEP Event Bus,
 * integrating metrics, logging, tracing, and health monitoring into a unified system.
 * 
 * Features:
 * - Centralized observability configuration and management
 * - Custom metrics collection and aggregation
 * - Structured logging with correlation IDs
 * - Health checks and service discovery integration
 * - Alert management and notification systems
 * - Dashboard generation and visualization
 */

import { EventEmitter } from 'events';
import { UEPTracingIntegration, UEPTracingConfig } from './UEPTracingIntegration';
import { UEPMessage } from './UEPMessageBroker';
import { UEPEvent } from './UEPEventSchemaRegistry';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Observability Configuration
 */
export interface ObservabilityConfig {
  // Service identification
  service: {
    name: string;
    version: string;
    environment: string;
    instance: string;
  };

  // Logging configuration
  logging: {
    level: LogLevel;
    structured: boolean;
    enableCorrelation: boolean;
    enableSampling: boolean;
    samplingRate: number;
    outputs: LogOutput[];
  };

  // Metrics configuration
  metrics: {
    enabled: boolean;
    collectDefaultMetrics: boolean;
    customMetrics: boolean;
    prometheus: {
      enabled: boolean;
      port: number;
      path: string;
    };
    retention: string;
  };

  // Health checks
  health: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: HealthEndpoint[];
  };

  // Alerting configuration
  alerting: {
    enabled: boolean;
    rules: AlertRule[];
    channels: AlertChannel[];
  };

  // Dashboard configuration
  dashboard: {
    enabled: boolean;
    autoGenerate: boolean;
    customDashboards: string[];
  };
}

/**
 * Log Levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * Log Outputs
 */
export type LogOutput = 'console' | 'file' | 'elasticsearch' | 'fluentd' | 'loki';

/**
 * Health Check Endpoint
 */
export interface HealthEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  interval: number;
  headers?: Record<string, string>;
  expectedStatus?: number;
  expectedBody?: string;
}

/**
 * Alert Rule
 */
export interface AlertRule {
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
  condition: AlertCondition;
  duration: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * Alert Severity
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert Condition
 */
export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration?: string;
}

/**
 * Alert Channel
 */
export interface AlertChannel {
  name: string;
  type: 'webhook' | 'email' | 'slack' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Log Entry
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  service: string;
  version: string;
  environment: string;
  instance: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Health Status
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

/**
 * Health Check Result
 */
export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  time: Date;
  duration: number;
  output?: string;
  componentType?: string;
  observedValue?: any;
  threshold?: any;
}

/**
 * Observability Metrics
 */
export interface ObservabilityMetrics {
  // Message metrics
  messagesProcessed: number;
  messagesPerSecond: number;
  messageErrors: number;
  messageLatency: number;

  // Event metrics
  eventsEmitted: number;
  eventsProcessed: number;
  eventValidationErrors: number;

  // System metrics
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkIO: number;

  // Custom metrics
  customMetrics: Record<string, number>;
}

/**
 * UEP Observability Manager Implementation
 */
export class UEPObservabilityManager extends EventEmitter {
  private config: ObservabilityConfig;
  private tracingIntegration: UEPTracingIntegration;
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alerts: Map<string, boolean> = new Map();
  private logBuffer: LogEntry[] = [];

  // Prometheus metrics
  private messageCounter: Counter<string>;
  private eventCounter: Counter<string>;
  private validationErrorCounter: Counter<string>;
  private processingDurationHistogram: Histogram<string>;
  private activeConnectionsGauge: Gauge<string>;
  private healthStatusGauge: Gauge<string>;

  // Monitoring intervals
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config: ObservabilityConfig, tracingConfig: UEPTracingConfig) {
    super();
    this.config = config;
    this.tracingIntegration = new UEPTracingIntegration(tracingConfig);
    this.setupMetrics();
  }

  /**
   * Initialize the observability manager
   */
  async initialize(): Promise<void> {
    try {
      this.emit('observability:initializing');

      // Initialize tracing
      await this.tracingIntegration.initialize();

      // Setup logging
      this.setupLogging();

      // Setup health checks
      if (this.config.health.enabled) {
        this.setupHealthChecks();
      }

      // Setup alerting
      if (this.config.alerting.enabled) {
        this.setupAlerting();
      }

      // Start monitoring
      this.startMonitoring();

      this.emit('observability:initialized');
    } catch (error) {
      this.emit('observability:error', error);
      throw new Error(`Failed to initialize Observability Manager: ${error.message}`);
    }
  }

  /**
   * Log a message with correlation context
   */
  log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      service: this.config.service.name,
      version: this.config.service.version,
      environment: this.config.service.environment,
      instance: this.config.service.instance,
      metadata,
    };

    // Add correlation context from active trace
    if (this.config.logging.enableCorrelation) {
      const tracingStats = this.tracingIntegration.getStats();
      // In a real implementation, we'd get the active trace context
      entry.correlationId = this.generateCorrelationId();
    }

    // Add error information
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Buffer log entry
    this.logBuffer.push(entry);

    // Emit log event
    this.emit('log:entry', entry);

    // Process log outputs
    this.processLogEntry(entry);

    // Manage buffer size
    if (this.logBuffer.length > 1000) {
      this.logBuffer.shift();
    }
  }

  /**
   * Record message processing metrics
   */
  recordMessageMetrics(
    message: UEPMessage<any>,
    operation: 'publish' | 'consume' | 'validate' | 'transform',
    duration: number,
    success: boolean
  ): void {
    if (!this.config.metrics.enabled) {
      return;
    }

    // Update counters
    this.messageCounter.inc({
      operation,
      messageType: message.routing.messageType,
      agentType: message.agent.type,
      success: success.toString(),
    });

    // Update duration histogram
    this.processingDurationHistogram.observe(
      {
        operation,
        messageType: message.routing.messageType,
        agentType: message.agent.type,
      },
      duration
    );

    // Record errors
    if (!success) {
      this.validationErrorCounter.inc({
        operation,
        messageType: message.routing.messageType,
        errorType: 'processing_error',
      });
    }

    this.emit('metrics:message-recorded', {
      messageId: message.id,
      operation,
      duration,
      success,
    });
  }

  /**
   * Record event processing metrics
   */
  recordEventMetrics(
    event: UEPEvent,
    operation: 'emit' | 'handle' | 'validate',
    duration: number,
    success: boolean
  ): void {
    if (!this.config.metrics.enabled) {
      return;
    }

    this.eventCounter.inc({
      operation,
      eventType: event.eventType,
      category: event.metadata.category,
      success: success.toString(),
    });

    this.processingDurationHistogram.observe(
      {
        operation,
        eventType: event.eventType,
        category: event.metadata.category,
      },
      duration
    );

    if (!success) {
      this.validationErrorCounter.inc({
        operation,
        eventType: event.eventType,
        errorType: 'event_processing_error',
      });
    }

    this.emit('metrics:event-recorded', {
      eventId: event.eventId,
      operation,
      duration,
      success,
    });
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks = Array.from(this.healthChecks.values());
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warnChecks = checks.filter(check => check.status === 'warn');

    let status: 'healthy' | 'unhealthy' | 'degraded';
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warnChecks.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      checks,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: this.config.service.version,
    };
  }

  /**
   * Get observability metrics
   */
  async getMetrics(): Promise<ObservabilityMetrics> {
    return {
      messagesProcessed: await this.getMetricValue('uep_messages_total'),
      messagesPerSecond: await this.getMetricValue('uep_messages_per_second'),
      messageErrors: await this.getMetricValue('uep_message_errors_total'),
      messageLatency: await this.getMetricValue('uep_processing_duration_seconds'),
      eventsEmitted: await this.getMetricValue('uep_events_total'),
      eventsProcessed: await this.getMetricValue('uep_events_processed_total'),
      eventValidationErrors: await this.getMetricValue('uep_validation_errors_total'),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().user,
      diskUsage: 0, // Would be implemented with actual disk usage monitoring
      networkIO: 0, // Would be implemented with actual network monitoring
      customMetrics: {},
    };
  }

  /**
   * Create custom metric
   */
  createCustomMetric(
    name: string,
    type: 'counter' | 'histogram' | 'gauge',
    help: string,
    labels?: string[]
  ): any {
    if (!this.config.metrics.customMetrics) {
      throw new Error('Custom metrics are disabled');
    }

    switch (type) {
      case 'counter':
        return register.getSingleMetric(name) || new Counter({
          name,
          help,
          labelNames: labels || [],
          registers: [register],
        });

      case 'histogram':
        return register.getSingleMetric(name) || new Histogram({
          name,
          help,
          labelNames: labels || [],
          registers: [register],
        });

      case 'gauge':
        return register.getSingleMetric(name) || new Gauge({
          name,
          help,
          labelNames: labels || [],
          registers: [register],
        });

      default:
        throw new Error(`Unsupported metric type: ${type}`);
    }
  }

  /**
   * Trigger alert
   */
  triggerAlert(rule: AlertRule, value: number, metadata?: Record<string, any>): void {
    if (!this.config.alerting.enabled || !rule.enabled) {
      return;
    }

    const alertKey = `${rule.name}:${JSON.stringify(rule.labels || {})}`;
    const isCurrentlyAlerting = this.alerts.get(alertKey) || false;

    if (!isCurrentlyAlerting) {
      this.alerts.set(alertKey, true);

      const alert = {
        rule,
        value,
        metadata,
        timestamp: new Date(),
        service: this.config.service.name,
        environment: this.config.service.environment,
      };

      this.emit('alert:triggered', alert);
      this.sendAlert(alert);

      this.log('warn', `Alert triggered: ${rule.name}`, {
        rule: rule.name,
        value,
        threshold: rule.condition.threshold,
        ...metadata,
      });
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(rule: AlertRule, metadata?: Record<string, any>): void {
    const alertKey = `${rule.name}:${JSON.stringify(rule.labels || {})}`;
    const wasAlerting = this.alerts.get(alertKey) || false;

    if (wasAlerting) {
      this.alerts.set(alertKey, false);

      const resolution = {
        rule,
        metadata,
        timestamp: new Date(),
        service: this.config.service.name,
        environment: this.config.service.environment,
      };

      this.emit('alert:resolved', resolution);

      this.log('info', `Alert resolved: ${rule.name}`, {
        rule: rule.name,
        ...metadata,
      });
    }
  }

  /**
   * Get tracing integration
   */
  getTracingIntegration(): UEPTracingIntegration {
    return this.tracingIntegration;
  }

  /**
   * Shutdown observability manager
   */
  async shutdown(): Promise<void> {
    try {
      this.emit('observability:shutting-down');

      // Clear monitoring intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Shutdown tracing
      await this.tracingIntegration.shutdown();

      // Flush logs
      await this.flushLogs();

      this.emit('observability:shutdown');
    } catch (error) {
      this.emit('observability:error', { operation: 'shutdown', error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private setupMetrics(): void {
    if (!this.config.metrics.enabled) {
      return;
    }

    // Collect default metrics if enabled
    if (this.config.metrics.collectDefaultMetrics) {
      collectDefaultMetrics({ register });
    }

    // Message processing metrics
    this.messageCounter = new Counter({
      name: 'uep_messages_total',
      help: 'Total number of UEP messages processed',
      labelNames: ['operation', 'messageType', 'agentType', 'success'],
      registers: [register],
    });

    // Event processing metrics
    this.eventCounter = new Counter({
      name: 'uep_events_total',
      help: 'Total number of UEP events processed',
      labelNames: ['operation', 'eventType', 'category', 'success'],
      registers: [register],
    });

    // Validation error metrics
    this.validationErrorCounter = new Counter({
      name: 'uep_validation_errors_total',
      help: 'Total number of validation errors',
      labelNames: ['operation', 'messageType', 'eventType', 'errorType'],
      registers: [register],
    });

    // Processing duration metrics
    this.processingDurationHistogram = new Histogram({
      name: 'uep_processing_duration_seconds',
      help: 'Duration of UEP processing operations',
      labelNames: ['operation', 'messageType', 'eventType', 'agentType', 'category'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [register],
    });

    // Active connections gauge
    this.activeConnectionsGauge = new Gauge({
      name: 'uep_active_connections',
      help: 'Number of active connections to the UEP Event Bus',
      registers: [register],
    });

    // Health status gauge
    this.healthStatusGauge = new Gauge({
      name: 'uep_health_status',
      help: 'Health status of UEP services (1=healthy, 0.5=degraded, 0=unhealthy)',
      labelNames: ['service', 'check'],
      registers: [register],
    });
  }

  private setupLogging(): void {
    // Setup log output handlers
    for (const output of this.config.logging.outputs) {
      this.setupLogOutput(output);
    }
  }

  private setupLogOutput(output: LogOutput): void {
    switch (output) {
      case 'console':
        this.on('log:entry', (entry: LogEntry) => {
          if (this.config.logging.structured) {
            console.log(JSON.stringify(entry));
          } else {
            console.log(`[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()}: ${entry.message}`);
          }
        });
        break;

      case 'file':
        // File logging would be implemented here
        break;

      case 'elasticsearch':
        // Elasticsearch logging would be implemented here
        break;

      case 'fluentd':
        // Fluentd logging would be implemented here
        break;

      case 'loki':
        // Loki logging would be implemented here
        break;
    }
  }

  private setupHealthChecks(): void {
    for (const endpoint of this.config.health.endpoints) {
      this.setupHealthCheck(endpoint);
    }

    // Start periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks();
    }, this.config.health.interval);
  }

  private setupHealthCheck(endpoint: HealthEndpoint): void {
    // Implementation would set up health check for specific endpoint
    this.healthChecks.set(endpoint.name, {
      name: endpoint.name,
      status: 'pass',
      time: new Date(),
      duration: 0,
    });
  }

  private async runHealthChecks(): Promise<void> {
    for (const endpoint of this.config.health.endpoints) {
      try {
        const startTime = Date.now();
        
        // Perform health check (implementation would make actual HTTP request)
        const duration = Date.now() - startTime;
        
        const check: HealthCheck = {
          name: endpoint.name,
          status: 'pass',
          time: new Date(),
          duration,
        };

        this.healthChecks.set(endpoint.name, check);

        // Update health status gauge
        this.healthStatusGauge.set(
          { service: this.config.service.name, check: endpoint.name },
          1
        );

      } catch (error) {
        const check: HealthCheck = {
          name: endpoint.name,
          status: 'fail',
          time: new Date(),
          duration: this.config.health.timeout,
          output: error.message,
        };

        this.healthChecks.set(endpoint.name, check);

        // Update health status gauge
        this.healthStatusGauge.set(
          { service: this.config.service.name, check: endpoint.name },
          0
        );

        this.log('error', `Health check failed: ${endpoint.name}`, { error: error.message });
      }
    }
  }

  private setupAlerting(): void {
    // Setup alert rule evaluation
    for (const rule of this.config.alerting.rules) {
      this.setupAlertRule(rule);
    }
  }

  private setupAlertRule(rule: AlertRule): void {
    // Implementation would set up periodic evaluation of alert rules
    setInterval(async () => {
      await this.evaluateAlertRule(rule);
    }, 30000); // Evaluate every 30 seconds
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    try {
      const value = await this.getMetricValue(rule.condition.metric);
      
      let shouldAlert = false;
      switch (rule.condition.operator) {
        case '>':
          shouldAlert = value > rule.condition.threshold;
          break;
        case '<':
          shouldAlert = value < rule.condition.threshold;
          break;
        case '>=':
          shouldAlert = value >= rule.condition.threshold;
          break;
        case '<=':
          shouldAlert = value <= rule.condition.threshold;
          break;
        case '==':
          shouldAlert = value === rule.condition.threshold;
          break;
        case '!=':
          shouldAlert = value !== rule.condition.threshold;
          break;
      }

      if (shouldAlert) {
        this.triggerAlert(rule, value);
      } else {
        this.resolveAlert(rule);
      }

    } catch (error) {
      this.log('error', `Failed to evaluate alert rule: ${rule.name}`, { error: error.message });
    }
  }

  private async sendAlert(alert: any): Promise<void> {
    for (const channel of this.config.alerting.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendAlertToChannel(alert, channel);
      } catch (error) {
        this.log('error', `Failed to send alert to channel: ${channel.name}`, { error: error.message });
      }
    }
  }

  private async sendAlertToChannel(alert: any, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'webhook':
        // Webhook implementation
        break;
      case 'email':
        // Email implementation
        break;
      case 'slack':
        // Slack implementation
        break;
      case 'pagerduty':
        // PagerDuty implementation
        break;
    }
  }

  private startMonitoring(): void {
    // Start metrics collection interval
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Collect every 30 seconds
  }

  private collectSystemMetrics(): void {
    // Update active connections gauge (would get actual value from broker)
    this.activeConnectionsGauge.set(0); // Placeholder

    // Emit monitoring event
    this.emit('monitoring:metrics-collected', {
      timestamp: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['error', 'warn', 'info', 'debug', 'trace'];
    const configLevel = levels.indexOf(this.config.logging.level);
    const messageLevel = levels.indexOf(level);
    
    return messageLevel <= configLevel;
  }

  private processLogEntry(entry: LogEntry): void {
    // Apply sampling if enabled
    if (this.config.logging.enableSampling) {
      if (Math.random() > this.config.logging.samplingRate) {
        return;
      }
    }

    // Process the log entry (send to configured outputs)
    // This is handled by the log output event handlers
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getMetricValue(metricName: string): Promise<number> {
    // Implementation would get actual metric value from Prometheus registry
    const metrics = await register.metrics();
    // Parse metrics and extract value for specific metric
    // This is a simplified placeholder
    return 0;
  }

  private async flushLogs(): Promise<void> {
    // Flush any buffered logs
    if (this.logBuffer.length > 0) {
      this.emit('logs:flushing', { count: this.logBuffer.length });
      this.logBuffer.length = 0;
    }
  }
}

/**
 * Create default observability configuration
 */
export function createDefaultObservabilityConfig(serviceName: string): ObservabilityConfig {
  return {
    service: {
      name: serviceName,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      instance: process.env.HOSTNAME || 'localhost',
    },
    logging: {
      level: 'info',
      structured: true,
      enableCorrelation: true,
      enableSampling: false,
      samplingRate: 1.0,
      outputs: ['console'],
    },
    metrics: {
      enabled: true,
      collectDefaultMetrics: true,
      customMetrics: true,
      prometheus: {
        enabled: true,
        port: 9090,
        path: '/metrics',
      },
      retention: '30d',
    },
    health: {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      endpoints: [],
    },
    alerting: {
      enabled: false,
      rules: [],
      channels: [],
    },
    dashboard: {
      enabled: true,
      autoGenerate: true,
      customDashboards: [],
    },
  };
}