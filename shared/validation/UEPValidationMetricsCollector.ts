/**
 * UEP Validation Metrics Collector
 * 
 * Centralized metrics collection and aggregation system for all UEP validation
 * components. Provides unified metrics, dashboard integration, alerting thresholds,
 * and comprehensive performance monitoring across all validation layers.
 * Based on TaskMaster research findings and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge, Summary, register, collectDefaultMetrics } from 'prom-client';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { UEPValidationResult, UEPProtocolMessage } from '../../containers/api-gateway/src/validation/UEPValidationMiddleware';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPMetricsConfig {
  enableDetailedMetrics: boolean;
  enablePerformanceMetrics: boolean;
  enableBusinessMetrics: boolean;
  enableAlerts: boolean;
  metricPrefix: string;
  alertThresholds: {
    errorRateThreshold: number;
    latencyThreshold: number;
    throughputThreshold: number;
    cacheHitRateThreshold: number;
  };
  aggregationIntervals: {
    shortTerm: number; // 1 minute
    mediumTerm: number; // 5 minutes
    longTerm: number; // 15 minutes
  };
  enableHistogramBuckets: boolean;
  customBuckets: {
    latency: number[];
    throughput: number[];
    cacheSize: number[];
  };
  enableMetricsPersistence: boolean;
  persistenceInterval: number;
}

export interface UEPValidationMetricsSummary {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  cacheHitRate: number;
  componentBreakdown: {
    apiGateway: UEPComponentMetrics;
    serviceToService: UEPComponentMetrics;
    eventValidation: UEPComponentMetrics;
    errorHandling: UEPComponentMetrics;
  };
  alertsTriggered: UEPAlert[];
  timeRange: {
    start: Date;
    end: Date;
    duration: number;
  };
}

export interface UEPComponentMetrics {
  totalOperations: number;
  successOperations: number;
  failedOperations: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughputPerSecond: number;
  errorTypes: Record<string, number>;
  cacheHitRate?: number;
  uniqueErrors: string[];
}

export interface UEPAlert {
  id: string;
  type: 'error_rate' | 'latency' | 'throughput' | 'cache_performance' | 'system_health';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  actualValue: number;
  component: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface UEPMetricsSnapshot {
  timestamp: Date;
  metrics: {
    validations: {
      total: number;
      rate: number;
      errors: number;
      errorRate: number;
    };
    performance: {
      averageLatency: number;
      p95Latency: number;
      p99Latency: number;
      throughput: number;
    };
    cache: {
      hitRate: number;
      size: number;
      evictions: number;
      memoryUsage: number;
    };
    components: Record<string, UEPComponentMetrics>;
  };
}

// =============================================================================
// UEP Validation Metrics Collector Core Class
// =============================================================================

export class UEPValidationMetricsCollector extends EventEmitter {
  private readonly config: UEPMetricsConfig;
  private readonly logger = new Logger('UEPValidationMetricsCollector');
  private readonly tracer = trace.getTracer('uep-validation-metrics-collector', '1.0.0');
  
  // Core metrics
  private readonly metrics: {
    // Validation metrics
    validationsTotal: Counter;
    validationDuration: Histogram;
    validationErrors: Counter;
    validationSuccess: Counter;
    validationThroughput: Summary;
    
    // Component-specific metrics
    apiGatewayValidations: Counter;
    serviceValidations: Counter;
    eventValidations: Counter;
    errorHandling: Counter;
    
    // Performance metrics
    validationLatency: Histogram;
    cachePerformance: Histogram;
    systemResourceUsage: Gauge;
    concurrentValidations: Gauge;
    
    // Business metrics
    protocolCompliance: Gauge;
    schemaVersionDistribution: Counter;
    agentTypeDistribution: Counter;
    messageTypeDistribution: Counter;
    
    // Health metrics
    componentHealth: Gauge;
    alertsTriggered: Counter;
    systemUptime: Gauge;
  };

  // Metrics storage and aggregation
  private readonly metricsHistory: Map<string, number[]> = new Map();
  private readonly activeAlerts: Map<string, UEPAlert> = new Map();
  private readonly componentStats: Map<string, UEPComponentMetrics> = new Map();
  
  // Aggregation timers
  private readonly aggregationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<UEPMetricsConfig> = {}) {
    super();
    
    this.config = {
      enableDetailedMetrics: true,
      enablePerformanceMetrics: true,
      enableBusinessMetrics: true,
      enableAlerts: true,
      metricPrefix: 'uep_validation_',
      alertThresholds: {
        errorRateThreshold: 0.05, // 5%
        latencyThreshold: 1000, // 1 second
        throughputThreshold: 100, // requests per second
        cacheHitRateThreshold: 0.8 // 80%
      },
      aggregationIntervals: {
        shortTerm: 60000, // 1 minute
        mediumTerm: 300000, // 5 minutes
        longTerm: 900000 // 15 minutes
      },
      enableHistogramBuckets: true,
      customBuckets: {
        latency: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
        throughput: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
        cacheSize: [100, 500, 1000, 5000, 10000, 25000, 50000, 100000]
      },
      enableMetricsPersistence: true,
      persistenceInterval: 60000, // 1 minute
      ...config
    };

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup aggregation timers
    this.setupAggregation();

    // Enable default system metrics
    if (this.config.enablePerformanceMetrics) {
      collectDefaultMetrics({ prefix: this.config.metricPrefix });
    }

    this.logger.info('UEP Validation Metrics Collector initialized', {
      detailedMetrics: this.config.enableDetailedMetrics,
      performanceMetrics: this.config.enablePerformanceMetrics,
      businessMetrics: this.config.enableBusinessMetrics,
      alertsEnabled: this.config.enableAlerts
    });
  }

  // =============================================================================
  // Metrics Recording
  // =============================================================================

  public recordValidation(
    component: string,
    result: UEPValidationResult,
    message?: UEPProtocolMessage,
    duration?: number
  ): void {
    return this.tracer.startActiveSpan('uep.metrics.record_validation', (span) => {
      try {
        span.setAttributes({
          'metrics.component': component,
          'metrics.valid': result.valid,
          'metrics.error_count': result.errors.length,
          'metrics.duration_ms': duration || result.validationTime
        });

        const labels = {
          component,
          result: result.valid ? 'success' : 'failure',
          cache_hit: result.cacheHit ? 'true' : 'false'
        };

        // Core validation metrics
        this.metrics.validationsTotal.inc(labels);
        
        if (result.valid) {
          this.metrics.validationSuccess.inc({ component });
        } else {
          this.metrics.validationErrors.inc({ 
            component, 
            error_type: result.errors[0]?.code || 'unknown'
          });
        }

        // Duration metrics
        const validationDuration = (duration || result.validationTime) / 1000;
        this.metrics.validationDuration.observe(labels, validationDuration);
        this.metrics.validationLatency.observe({ component }, validationDuration);

        // Component-specific metrics
        this.recordComponentMetrics(component, result, validationDuration);

        // Business metrics
        if (this.config.enableBusinessMetrics && message) {
          this.recordBusinessMetrics(message, result);
        }

        // Update component statistics
        this.updateComponentStats(component, result, validationDuration);

        // Check alert thresholds
        if (this.config.enableAlerts) {
          this.checkAlertThresholds(component, result, validationDuration);
        }

        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Failed to record validation metrics', {
          component,
          error: (error as Error).message
        });
      }
    });
  }

  public recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'eviction',
    component: string,
    duration: number,
    size?: number
  ): void {
    const durationSeconds = duration / 1000;
    
    this.metrics.cachePerformance.observe(
      { component, operation },
      durationSeconds
    );

    // Update cache statistics
    this.updateCacheMetrics(operation, component, size);
  }

  public recordSystemHealth(component: string, health: number): void {
    this.metrics.componentHealth.set({ component }, health);
    
    // Trigger alert if health is below threshold
    if (this.config.enableAlerts && health < 0.8) {
      this.triggerAlert({
        type: 'system_health',
        severity: health < 0.5 ? 'critical' : 'warning',
        message: `Component ${component} health is ${(health * 100).toFixed(1)}%`,
        metric: 'component_health',
        threshold: 0.8,
        actualValue: health,
        component
      });
    }
  }

  // =============================================================================
  // Component-Specific Metrics
  // =============================================================================

  private recordComponentMetrics(
    component: string,
    result: UEPValidationResult,
    duration: number
  ): void {
    switch (component) {
      case 'api-gateway':
        this.metrics.apiGatewayValidations.inc({
          result: result.valid ? 'success' : 'failure',
          cache_hit: result.cacheHit ? 'true' : 'false'
        });
        break;
        
      case 'service-to-service':
        this.metrics.serviceValidations.inc({
          result: result.valid ? 'success' : 'failure'
        });
        break;
        
      case 'event-validation':
        this.metrics.eventValidations.inc({
          result: result.valid ? 'success' : 'failure'
        });
        break;
        
      case 'error-handling':
        this.metrics.errorHandling.inc({
          result: result.valid ? 'success' : 'failure'
        });
        break;
    }
  }

  private recordBusinessMetrics(message: UEPProtocolMessage, result: UEPValidationResult): void {
    // Protocol compliance
    this.metrics.protocolCompliance.set(result.valid ? 1 : 0);
    
    // Schema version distribution
    this.metrics.schemaVersionDistribution.inc({
      version: result.schemaVersion
    });
    
    // Agent type distribution
    if (message.source?.agentType) {
      this.metrics.agentTypeDistribution.inc({
        agent_type: message.source.agentType
      });
    }
    
    // Message type distribution
    if (message.messageType) {
      this.metrics.messageTypeDistribution.inc({
        message_type: message.messageType
      });
    }
  }

  // =============================================================================
  // Statistics and Aggregation
  // =============================================================================

  private updateComponentStats(
    component: string,
    result: UEPValidationResult,
    duration: number
  ): void {
    const stats = this.componentStats.get(component) || {
      totalOperations: 0,
      successOperations: 0,
      failedOperations: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughputPerSecond: 0,
      errorTypes: {},
      uniqueErrors: []
    };

    stats.totalOperations++;
    
    if (result.valid) {
      stats.successOperations++;
    } else {
      stats.failedOperations++;
      
      // Track error types
      for (const error of result.errors) {
        stats.errorTypes[error.code] = (stats.errorTypes[error.code] || 0) + 1;
        
        if (!stats.uniqueErrors.includes(error.code)) {
          stats.uniqueErrors.push(error.code);
        }
      }
    }

    // Update latency metrics (simplified running average)
    stats.averageLatency = (stats.averageLatency * (stats.totalOperations - 1) + duration) / stats.totalOperations;

    this.componentStats.set(component, stats);
  }

  private updateCacheMetrics(
    operation: string,
    component: string,
    size?: number
  ): void {
    const key = `cache_${component}_${operation}`;
    const history = this.metricsHistory.get(key) || [];
    
    history.push(Date.now());
    
    // Keep only last hour of data
    const oneHourAgo = Date.now() - 3600000;
    const recentHistory = history.filter(timestamp => timestamp > oneHourAgo);
    
    this.metricsHistory.set(key, recentHistory);
  }

  // =============================================================================
  // Alert Management
  // =============================================================================

  private checkAlertThresholds(
    component: string,
    result: UEPValidationResult,
    duration: number
  ): void {
    const stats = this.componentStats.get(component);
    if (!stats) return;

    // Error rate alert
    const errorRate = stats.failedOperations / stats.totalOperations;
    if (errorRate > this.config.alertThresholds.errorRateThreshold) {
      this.triggerAlert({
        type: 'error_rate',
        severity: errorRate > 0.2 ? 'critical' : 'warning',
        message: `High error rate in ${component}: ${(errorRate * 100).toFixed(1)}%`,
        metric: 'error_rate',
        threshold: this.config.alertThresholds.errorRateThreshold,
        actualValue: errorRate,
        component
      });
    }

    // Latency alert
    if (duration > this.config.alertThresholds.latencyThreshold) {
      this.triggerAlert({
        type: 'latency',
        severity: duration > 5000 ? 'critical' : 'warning',
        message: `High validation latency in ${component}: ${duration.toFixed(0)}ms`,
        metric: 'latency',
        threshold: this.config.alertThresholds.latencyThreshold,
        actualValue: duration,
        component
      });
    }
  }

  private triggerAlert(alertData: Omit<UEPAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alertId = `${alertData.type}_${alertData.component}_${Date.now()}`;
    
    const alert: UEPAlert = {
      id: alertId,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    };

    this.activeAlerts.set(alertId, alert);
    this.metrics.alertsTriggered.inc({
      type: alert.type,
      severity: alert.severity,
      component: alert.component
    });

    this.emit('alertTriggered', alert);
    
    this.logger.warn('Alert triggered', {
      alertId,
      type: alert.type,
      severity: alert.severity,
      component: alert.component,
      message: alert.message
    });
  }

  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      this.emit('alertResolved', alert);
      this.logger.info('Alert resolved', { alertId, resolvedAt: alert.resolvedAt });
    }
  }

  // =============================================================================
  // Aggregation and Reporting
  // =============================================================================

  private setupAggregation(): void {
    // Short-term aggregation (1 minute)
    this.aggregationTimers.set('short', setInterval(() => {
      this.performAggregation('short');
    }, this.config.aggregationIntervals.shortTerm));

    // Medium-term aggregation (5 minutes)
    this.aggregationTimers.set('medium', setInterval(() => {
      this.performAggregation('medium');
    }, this.config.aggregationIntervals.mediumTerm));

    // Long-term aggregation (15 minutes)
    this.aggregationTimers.set('long', setInterval(() => {
      this.performAggregation('long');
    }, this.config.aggregationIntervals.longTerm));
  }

  private performAggregation(interval: 'short' | 'medium' | 'long'): void {
    try {
      const snapshot = this.createMetricsSnapshot();
      
      this.emit('metricsAggregated', {
        interval,
        snapshot,
        timestamp: new Date()
      });

      // Persist metrics if enabled
      if (this.config.enableMetricsPersistence) {
        this.persistMetrics(interval, snapshot);
      }

    } catch (error) {
      this.logger.error('Metrics aggregation failed', {
        interval,
        error: (error as Error).message
      });
    }
  }

  private createMetricsSnapshot(): UEPMetricsSnapshot {
    const timestamp = new Date();
    const components: Record<string, UEPComponentMetrics> = {};
    
    for (const [component, stats] of this.componentStats) {
      components[component] = { ...stats };
    }

    return {
      timestamp,
      metrics: {
        validations: {
          total: Array.from(this.componentStats.values()).reduce((sum, stats) => sum + stats.totalOperations, 0),
          rate: this.calculateRate('validations'),
          errors: Array.from(this.componentStats.values()).reduce((sum, stats) => sum + stats.failedOperations, 0),
          errorRate: this.calculateErrorRate()
        },
        performance: {
          averageLatency: this.calculateAverageLatency(),
          p95Latency: this.calculatePercentileLatency(95),
          p99Latency: this.calculatePercentileLatency(99),
          throughput: this.calculateThroughput()
        },
        cache: {
          hitRate: this.calculateCacheHitRate(),
          size: this.calculateCacheSize(),
          evictions: this.calculateCacheEvictions(),
          memoryUsage: this.calculateCacheMemoryUsage()
        },
        components
      }
    };
  }

  // =============================================================================
  // Calculation Helpers
  // =============================================================================

  private calculateRate(metric: string): number {
    // Calculate operations per second over last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentOperations = this.metricsHistory.get(metric) || [];
    return recentOperations.filter(timestamp => timestamp > oneMinuteAgo).length / 60;
  }

  private calculateErrorRate(): number {
    const totalOps = Array.from(this.componentStats.values()).reduce((sum, stats) => sum + stats.totalOperations, 0);
    const totalErrors = Array.from(this.componentStats.values()).reduce((sum, stats) => sum + stats.failedOperations, 0);
    return totalOps > 0 ? totalErrors / totalOps : 0;
  }

  private calculateAverageLatency(): number {
    const components = Array.from(this.componentStats.values());
    if (components.length === 0) return 0;
    
    const totalLatency = components.reduce((sum, stats) => sum + stats.averageLatency, 0);
    return totalLatency / components.length;
  }

  private calculatePercentileLatency(percentile: number): number {
    // Simplified percentile calculation - in production, use proper percentile algorithms
    return this.calculateAverageLatency() * (percentile / 50); // Rough approximation
  }

  private calculateThroughput(): number {
    return this.calculateRate('throughput');
  }

  private calculateCacheHitRate(): number {
    const hits = this.metricsHistory.get('cache_hits') || [];
    const misses = this.metricsHistory.get('cache_misses') || [];
    const total = hits.length + misses.length;
    return total > 0 ? hits.length / total : 0;
  }

  private calculateCacheSize(): number {
    // This would come from the cache manager
    return 0; // Placeholder
  }

  private calculateCacheEvictions(): number {
    return (this.metricsHistory.get('cache_evictions') || []).length;
  }

  private calculateCacheMemoryUsage(): number {
    // This would come from the cache manager
    return 0; // Placeholder
  }

  // =============================================================================
  // Persistence
  // =============================================================================

  private persistMetrics(interval: string, snapshot: UEPMetricsSnapshot): void {
    // In production, this would write to a time-series database
    this.logger.debug('Metrics persisted', {
      interval,
      timestamp: snapshot.timestamp,
      totalValidations: snapshot.metrics.validations.total,
      errorRate: snapshot.metrics.validations.errorRate
    });
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getMetricsSummary(timeRange?: { start: Date; end: Date }): UEPValidationMetricsSummary {
    const start = timeRange?.start || new Date(Date.now() - 3600000); // Last hour
    const end = timeRange?.end || new Date();
    
    const componentBreakdown: any = {};
    for (const [component, stats] of this.componentStats) {
      componentBreakdown[component] = { ...stats };
    }

    return {
      totalValidations: Array.from(this.componentStats.values()).reduce((sum, stats) => sum + stats.totalOperations, 0),
      successfulValidations: Array.from(this.componentStats.values()).reduce((sum, stats) => sum + stats.successOperations, 0),
      failedValidations: Array.from(this.componentStats.values()).reduce((sum, stats) => sum + stats.failedOperations, 0),
      averageLatency: this.calculateAverageLatency(),
      errorRate: this.calculateErrorRate(),
      throughput: this.calculateThroughput(),
      cacheHitRate: this.calculateCacheHitRate(),
      componentBreakdown,
      alertsTriggered: Array.from(this.activeAlerts.values()).filter(alert => 
        alert.timestamp >= start && alert.timestamp <= end
      ),
      timeRange: {
        start,
        end,
        duration: end.getTime() - start.getTime()
      }
    };
  }

  public getCurrentAlerts(): UEPAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  public getMetricsForDashboard(): Record<string, any> {
    return {
      summary: this.getMetricsSummary(),
      snapshot: this.createMetricsSnapshot(),
      alerts: this.getCurrentAlerts(),
      componentStats: Object.fromEntries(this.componentStats)
    };
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics() {
    const prefix = this.config.metricPrefix;

    return {
      // Core validation metrics
      validationsTotal: new Counter({
        name: `${prefix}total`,
        help: 'Total number of validations performed',
        labelNames: ['component', 'result', 'cache_hit']
      }),

      validationDuration: new Histogram({
        name: `${prefix}duration_seconds`,
        help: 'Duration of validation operations',
        labelNames: ['component', 'result', 'cache_hit'],
        buckets: this.config.customBuckets.latency
      }),

      validationErrors: new Counter({
        name: `${prefix}errors_total`,
        help: 'Total validation errors',
        labelNames: ['component', 'error_type']
      }),

      validationSuccess: new Counter({
        name: `${prefix}success_total`,
        help: 'Total successful validations',
        labelNames: ['component']
      }),

      validationThroughput: new Summary({
        name: `${prefix}throughput`,
        help: 'Validation throughput',
        labelNames: ['component']
      }),

      // Component-specific metrics
      apiGatewayValidations: new Counter({
        name: `${prefix}api_gateway_total`,
        help: 'API Gateway validations',
        labelNames: ['result', 'cache_hit']
      }),

      serviceValidations: new Counter({
        name: `${prefix}service_validations_total`,
        help: 'Service-to-service validations',
        labelNames: ['result']
      }),

      eventValidations: new Counter({
        name: `${prefix}event_validations_total`,
        help: 'Event validations',
        labelNames: ['result']
      }),

      errorHandling: new Counter({
        name: `${prefix}error_handling_total`,
        help: 'Error handling operations',
        labelNames: ['result']
      }),

      // Performance metrics
      validationLatency: new Histogram({
        name: `${prefix}latency_seconds`,
        help: 'Validation latency',
        labelNames: ['component'],
        buckets: this.config.customBuckets.latency
      }),

      cachePerformance: new Histogram({
        name: `${prefix}cache_performance_seconds`,
        help: 'Cache operation performance',
        labelNames: ['component', 'operation'],
        buckets: [0.0001, 0.001, 0.01, 0.1, 1.0]
      }),

      systemResourceUsage: new Gauge({
        name: `${prefix}system_resource_usage`,
        help: 'System resource usage',
        labelNames: ['resource_type']
      }),

      concurrentValidations: new Gauge({
        name: `${prefix}concurrent_validations`,
        help: 'Number of concurrent validations'
      }),

      // Business metrics
      protocolCompliance: new Gauge({
        name: `${prefix}protocol_compliance`,
        help: 'Protocol compliance rate'
      }),

      schemaVersionDistribution: new Counter({
        name: `${prefix}schema_version_distribution`,
        help: 'Distribution of schema versions',
        labelNames: ['version']
      }),

      agentTypeDistribution: new Counter({
        name: `${prefix}agent_type_distribution`,
        help: 'Distribution of agent types',
        labelNames: ['agent_type']
      }),

      messageTypeDistribution: new Counter({
        name: `${prefix}message_type_distribution`,
        help: 'Distribution of message types',
        labelNames: ['message_type']
      }),

      // Health metrics
      componentHealth: new Gauge({
        name: `${prefix}component_health`,
        help: 'Component health status',
        labelNames: ['component']
      }),

      alertsTriggered: new Counter({
        name: `${prefix}alerts_triggered_total`,
        help: 'Total alerts triggered',
        labelNames: ['type', 'severity', 'component']
      }),

      systemUptime: new Gauge({
        name: `${prefix}system_uptime_seconds`,
        help: 'System uptime in seconds'
      })
    };
  }

  public async shutdown(): Promise<void> {
    // Clear aggregation timers
    for (const [interval, timer] of this.aggregationTimers) {
      clearInterval(timer);
    }
    
    this.aggregationTimers.clear();
    this.activeAlerts.clear();
    this.componentStats.clear();
    this.metricsHistory.clear();
    
    this.removeAllListeners();
    this.emit('shutdown', { timestamp: new Date() });
  }
}

export default UEPValidationMetricsCollector;