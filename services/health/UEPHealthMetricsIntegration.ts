/**
 * UEP Health Metrics Integration
 * 
 * Integration layer that connects the UEP Health Monitoring Service with
 * the Prometheus Metrics Collector. Provides seamless metric collection,
 * windowed analysis, and success/failure rate calculation.
 * 
 * Research-based implementation features:
 * - Automated metric collection from health events
 * - Success/failure rate calculation with configurable windows
 * - Response time SLO monitoring and alerting
 * - Resource utilization trending and anomaly detection
 * - Custom UEP protocol compliance tracking
 * - Prometheus-compatible alerting rule generation
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { UEPMetricsCollector } from './UEPMetricsCollector';
import type { AgentHealthStatus } from './UEPHealthMonitoringService';

// Configuration interfaces
interface MetricsIntegrationConfig {
  enableAutoCollection: boolean;
  healthCheckInterval: number;
  sloThresholds: {
    responseTimeP95: number; // 95th percentile response time SLO in seconds
    successRate: number; // Success rate SLO as percentage
    availabilityTarget: number; // Availability target as percentage
    complianceMinimum: number; // Minimum compliance score (0-1)
  };
  alerting: {
    enableAutoAlerting: boolean;
    alertingRules: AlertingRule[];
  };
  windowed: {
    shortTerm: number; // Short-term window in seconds (e.g., 5 minutes)
    mediumTerm: number; // Medium-term window in seconds (e.g., 30 minutes)
    longTerm: number; // Long-term window in seconds (e.g., 4 hours)
  };
}

interface AlertingRule {
  name: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: 'warning' | 'critical';
  description: string;
}

interface WindowedMetrics {
  timeWindow: string;
  startTime: Date;
  endTime: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    availabilityPercentage: number;
  };
}

interface HealthTrendAnalysis {
  agentId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  trends: {
    healthScore: {
      current: number;
      previous: number;
      change: number;
      trend: 'improving' | 'degrading' | 'stable';
    };
    responseTime: {
      current: number;
      previous: number;
      change: number;
      trend: 'improving' | 'degrading' | 'stable';
    };
    availability: {
      current: number;
      previous: number;
      change: number;
      trend: 'improving' | 'degrading' | 'stable';
    };
  };
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    description: string;
  }>;
}

/**
 * UEP Health Metrics Integration Service
 * 
 * Orchestrates metrics collection, analysis, and alerting for UEP health monitoring.
 * Integrates with both the health monitoring service and Prometheus metrics collector.
 */
export class UEPHealthMetricsIntegration extends EventEmitter {
  private logger: winston.Logger;
  private metricsCollector: UEPMetricsCollector;
  private config: MetricsIntegrationConfig;
  
  // Metrics tracking
  private agentMetricsCache = new Map<string, AgentHealthStatus>();
  private metricHistory = new Map<string, Array<{ timestamp: Date; metrics: any }>>();
  private windowedMetricsCache = new Map<string, WindowedMetrics[]>();
  
  // Intervals and timers
  private collectionInterval: NodeJS.Timeout | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(
    metricsCollector: UEPMetricsCollector,
    config: Partial<MetricsIntegrationConfig> = {}
  ) {
    super();
    
    this.metricsCollector = metricsCollector;
    
    // Default configuration
    const defaultConfig: MetricsIntegrationConfig = {
      enableAutoCollection: true,
      healthCheckInterval: 30000, // 30 seconds
      sloThresholds: {
        responseTimeP95: 0.5, // 500ms
        successRate: 99.0, // 99%
        availabilityTarget: 99.9, // 99.9%
        complianceMinimum: 0.95 // 95%
      },
      alerting: {
        enableAutoAlerting: true,
        alertingRules: this.getDefaultAlertingRules()
      },
      windowed: {
        shortTerm: 300, // 5 minutes
        mediumTerm: 1800, // 30 minutes
        longTerm: 14400 // 4 hours
      }
    };
    
    this.config = { ...defaultConfig, ...config };

    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/health-metrics-integration.log' })
      ]
    });

    this.logger.info('UEP Health Metrics Integration initialized');
  }

  /**
   * Start the integration service
   */
  public async start(): Promise<void> {
    this.logger.info('Starting UEP Health Metrics Integration service...');

    // Start metrics collection
    if (this.config.enableAutoCollection) {
      this.startAutomaticCollection();
    }

    // Start trend analysis
    this.startTrendAnalysis();

    this.logger.info('UEP Health Metrics Integration service started successfully');
    this.emit('started');
  }

  /**
   * Stop the integration service
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping UEP Health Metrics Integration service...');

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    this.logger.info('UEP Health Metrics Integration service stopped');
    this.emit('stopped');
  }

  /**
   * Process health status update from monitoring service
   */
  public processHealthStatusUpdate(healthStatus: AgentHealthStatus): void {
    const agentId = healthStatus.agentId;
    const serviceName = healthStatus.serviceName;
    
    // Update cache
    this.agentMetricsCache.set(agentId, healthStatus);
    
    // Record metrics in Prometheus
    this.recordHealthMetrics(healthStatus);
    
    // Store historical data
    this.storeHistoricalMetrics(agentId, healthStatus);
    
    // Analyze for anomalies
    this.analyzeForAnomalies(healthStatus);
    
    this.logger.debug(`Processed health status update for agent ${agentId}`);
  }

  /**
   * Record health metrics in Prometheus
   */
  private recordHealthMetrics(healthStatus: AgentHealthStatus): void {
    const { agentId, serviceName, status, metrics } = healthStatus;
    
    // Record health score
    const healthScore = this.calculateHealthScore(healthStatus);
    this.metricsCollector.updateHealthScore(agentId, serviceName, healthScore);
    
    // Record response time
    if (metrics.responseTime > 0) {
      this.metricsCollector.recordRequest(
        agentId,
        serviceName,
        'health-check',
        'GET',
        status === 'passing' ? 'success' : 'failure',
        metrics.responseTime / 1000 // Convert to seconds
      );
    }
    
    // Record resource utilization
    const cpuUsage = metrics.resourceUtilization.cpu;
    const memoryUsage = metrics.resourceUtilization.memory;
    
    // Update gauges directly through the metrics collector's internal methods
    // Note: This requires the metrics collector to expose these methods
    
    // Record protocol compliance if available
    const complianceScore = metrics.customMetrics?.['uep_compliance_score'] || 1.0;
    this.metricsCollector.updateComplianceScore(agentId, '1.0', complianceScore);
    
    // Record health check
    this.metricsCollector.recordHealthCheck(
      agentId,
      'ttl-check',
      status === 'passing' ? 'pass' : status === 'warning' ? 'pass' : 'fail',
      0.001 // Minimal duration for TTL checks
    );
  }

  /**
   * Calculate comprehensive health score
   */
  private calculateHealthScore(healthStatus: AgentHealthStatus): number {
    const { status, metrics } = healthStatus;
    
    // Base score from status
    let baseScore = 0;
    switch (status) {
      case 'passing':
        baseScore = 100;
        break;
      case 'warning':
        baseScore = 70;
        break;
      case 'critical':
        baseScore = 20;
        break;
    }
    
    // Adjust for response time (lower is better)
    const responseTimePenalty = Math.min(30, metrics.responseTime / 100); // Max 30 point penalty
    
    // Adjust for success rate
    const successRateBonus = (metrics.successRate - 90) / 10 * 5; // Up to 5 point bonus/penalty
    
    // Adjust for resource utilization
    const cpuPenalty = Math.max(0, (metrics.resourceUtilization.cpu - 80) / 20 * 10); // Penalty if CPU > 80%
    const memoryPenalty = Math.max(0, (metrics.resourceUtilization.memory - 80) / 20 * 10); // Penalty if memory > 80%
    
    const finalScore = Math.max(0, Math.min(100, 
      baseScore - responseTimePenalty + successRateBonus - cpuPenalty - memoryPenalty
    ));
    
    return Math.round(finalScore);
  }

  /**
   * Store historical metrics for trend analysis
   */
  private storeHistoricalMetrics(agentId: string, healthStatus: AgentHealthStatus): void {
    if (!this.metricHistory.has(agentId)) {
      this.metricHistory.set(agentId, []);
    }
    
    const history = this.metricHistory.get(agentId)!;
    history.push({
      timestamp: new Date(),
      metrics: {
        status: healthStatus.status,
        healthScore: this.calculateHealthScore(healthStatus),
        responseTime: healthStatus.metrics.responseTime,
        successRate: healthStatus.metrics.successRate,
        cpuUsage: healthStatus.metrics.resourceUtilization.cpu,
        memoryUsage: healthStatus.metrics.resourceUtilization.memory
      }
    });
    
    // Keep only last 1000 entries per agent
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Analyze metrics for anomalies
   */
  private analyzeForAnomalies(healthStatus: AgentHealthStatus): void {
    const agentId = healthStatus.agentId;
    const history = this.metricHistory.get(agentId);
    
    if (!history || history.length < 10) {
      return; // Need at least 10 data points
    }
    
    const recent = history.slice(-10);
    const current = healthStatus.metrics;
    
    // Check for response time spikes
    const avgResponseTime = recent.reduce((sum, h) => sum + h.metrics.responseTime, 0) / recent.length;
    if (current.responseTime > avgResponseTime * 2) {
      this.emit('anomalyDetected', {
        agentId,
        type: 'response_time_spike',
        severity: 'medium',
        details: {
          current: current.responseTime,
          average: avgResponseTime,
          threshold: avgResponseTime * 2
        }
      });
    }
    
    // Check for success rate drops
    const avgSuccessRate = recent.reduce((sum, h) => sum + h.metrics.successRate, 0) / recent.length;
    if (current.successRate < avgSuccessRate * 0.9) {
      this.emit('anomalyDetected', {
        agentId,
        type: 'success_rate_drop',
        severity: 'high',
        details: {
          current: current.successRate,
          average: avgSuccessRate,
          threshold: avgSuccessRate * 0.9
        }
      });
    }
    
    // Check for resource utilization spikes
    const avgCpuUsage = recent.reduce((sum, h) => sum + h.metrics.cpuUsage, 0) / recent.length;
    if (current.resourceUtilization.cpu > Math.max(avgCpuUsage * 1.5, 80)) {
      this.emit('anomalyDetected', {
        agentId,
        type: 'cpu_usage_spike',
        severity: 'medium',
        details: {
          current: current.resourceUtilization.cpu,
          average: avgCpuUsage,
          threshold: Math.max(avgCpuUsage * 1.5, 80)
        }
      });
    }
  }

  /**
   * Calculate windowed metrics for success/failure rates
   */
  public calculateWindowedMetrics(agentId: string, windowSeconds: number): WindowedMetrics | null {
    const history = this.metricHistory.get(agentId);
    if (!history) {
      return null;
    }
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - (windowSeconds * 1000));
    
    const windowData = history.filter(h => h.timestamp >= windowStart);
    
    if (windowData.length === 0) {
      return null;
    }
    
    const totalRequests = windowData.length;
    const successfulRequests = windowData.filter(h => h.metrics.status === 'passing').length;
    const failedRequests = totalRequests - successfulRequests;
    
    const successRate = (successfulRequests / totalRequests) * 100;
    const errorRate = (failedRequests / totalRequests) * 100;
    
    const responseTimes = windowData.map(h => h.metrics.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    
    const availabilityPercentage = (windowData.filter(h => h.metrics.status !== 'critical').length / totalRequests) * 100;
    
    return {
      timeWindow: `${windowSeconds}s`,
      startTime: windowStart,
      endTime: now,
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate,
        averageResponseTime,
        p95ResponseTime,
        errorRate,
        availabilityPercentage
      }
    };
  }

  /**
   * Generate health trend analysis for an agent
   */
  public generateHealthTrendAnalysis(agentId: string, hoursBack: number = 24): HealthTrendAnalysis | null {
    const history = this.metricHistory.get(agentId);
    if (!history || history.length < 20) {
      return null;
    }
    
    const now = new Date();
    const analysisStart = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    
    const relevantHistory = history.filter(h => h.timestamp >= analysisStart);
    
    if (relevantHistory.length < 10) {
      return null;
    }
    
    // Split into current and previous periods
    const midpoint = Math.floor(relevantHistory.length / 2);
    const previousPeriod = relevantHistory.slice(0, midpoint);
    const currentPeriod = relevantHistory.slice(midpoint);
    
    // Calculate averages for each period
    const previousAvgs = this.calculatePeriodAverages(previousPeriod);
    const currentAvgs = this.calculatePeriodAverages(currentPeriod);
    
    // Determine trends
    const healthTrend = this.determineTrend(previousAvgs.healthScore, currentAvgs.healthScore);
    const responseTimeTrend = this.determineTrend(previousAvgs.responseTime, currentAvgs.responseTime, true); // Lower is better
    const availabilityTrend = this.determineTrend(previousAvgs.availability, currentAvgs.availability);
    
    // Identify anomalies
    const anomalies = this.identifyAnomalies(relevantHistory);
    
    return {
      agentId,
      timeRange: {
        start: analysisStart,
        end: now
      },
      trends: {
        healthScore: {
          current: currentAvgs.healthScore,
          previous: previousAvgs.healthScore,
          change: currentAvgs.healthScore - previousAvgs.healthScore,
          trend: healthTrend
        },
        responseTime: {
          current: currentAvgs.responseTime,
          previous: previousAvgs.responseTime,
          change: currentAvgs.responseTime - previousAvgs.responseTime,
          trend: responseTimeTrend
        },
        availability: {
          current: currentAvgs.availability,
          previous: previousAvgs.availability,
          change: currentAvgs.availability - previousAvgs.availability,
          trend: availabilityTrend
        }
      },
      anomalies
    };
  }

  /**
   * Calculate period averages
   */
  private calculatePeriodAverages(period: Array<{ timestamp: Date; metrics: any }>): any {
    const length = period.length;
    
    return {
      healthScore: period.reduce((sum, p) => sum + p.metrics.healthScore, 0) / length,
      responseTime: period.reduce((sum, p) => sum + p.metrics.responseTime, 0) / length,
      availability: (period.filter(p => p.metrics.status !== 'critical').length / length) * 100
    };
  }

  /**
   * Determine trend direction
   */
  private determineTrend(
    previous: number, 
    current: number, 
    lowerIsBetter: boolean = false
  ): 'improving' | 'degrading' | 'stable' {
    const changePercent = Math.abs((current - previous) / previous) * 100;
    
    if (changePercent < 2) {
      return 'stable';
    }
    
    const isImproving = lowerIsBetter ? current < previous : current > previous;
    return isImproving ? 'improving' : 'degrading';
  }

  /**
   * Identify anomalies in historical data
   */
  private identifyAnomalies(history: Array<{ timestamp: Date; metrics: any }>): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    description: string;
  }> {
    const anomalies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: Date;
      description: string;
    }> = [];
    
    // Look for consecutive failures
    let consecutiveFailures = 0;
    for (const entry of history) {
      if (entry.metrics.status === 'critical') {
        consecutiveFailures++;
      } else {
        if (consecutiveFailures >= 3) {
          anomalies.push({
            type: 'consecutive_failures',
            severity: 'high',
            timestamp: entry.timestamp,
            description: `${consecutiveFailures} consecutive critical status reports`
          });
        }
        consecutiveFailures = 0;
      }
    }
    
    // Look for response time spikes
    const responseTimes = history.map(h => h.metrics.responseTime);
    const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    const stdDev = Math.sqrt(responseTimes.reduce((sum, rt) => sum + Math.pow(rt - avgResponseTime, 2), 0) / responseTimes.length);
    
    for (let i = 0; i < history.length; i++) {
      const responseTime = history[i].metrics.responseTime;
      if (responseTime > avgResponseTime + (2 * stdDev)) {
        anomalies.push({
          type: 'response_time_anomaly',
          severity: 'medium',
          timestamp: history[i].timestamp,
          description: `Response time ${responseTime}ms significantly above average ${avgResponseTime.toFixed(2)}ms`
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Start automatic metrics collection
   */
  private startAutomaticCollection(): void {
    this.collectionInterval = setInterval(() => {
      // Collect metrics for all cached agents
      for (const [agentId, healthStatus] of this.agentMetricsCache) {
        this.recordHealthMetrics(healthStatus);
      }
    }, this.config.healthCheckInterval);
    
    this.logger.info(`Started automatic metrics collection with ${this.config.healthCheckInterval}ms interval`);
  }

  /**
   * Start trend analysis
   */
  private startTrendAnalysis(): void {
    // Run trend analysis every 5 minutes
    this.analysisInterval = setInterval(() => {
      for (const agentId of this.agentMetricsCache.keys()) {
        const trendAnalysis = this.generateHealthTrendAnalysis(agentId, 1); // Last hour
        if (trendAnalysis) {
          this.emit('trendAnalysisCompleted', { agentId, analysis: trendAnalysis });
        }
      }
    }, 300000); // 5 minutes
    
    this.logger.info('Started trend analysis with 5-minute interval');
  }

  /**
   * Get default alerting rules
   */
  private getDefaultAlertingRules(): AlertingRule[] {
    return [
      {
        name: 'HighResponseTime',
        condition: 'uep_agent_response_time_seconds{quantile="0.95"}',
        threshold: this.config.sloThresholds.responseTimeP95,
        duration: 300, // 5 minutes
        severity: 'warning',
        description: '95th percentile response time exceeds SLO'
      },
      {
        name: 'LowSuccessRate',
        condition: 'rate(uep_agent_requests_total{status="success"}[5m]) / rate(uep_agent_requests_total[5m]) * 100',
        threshold: this.config.sloThresholds.successRate,
        duration: 180, // 3 minutes
        severity: 'critical',
        description: 'Success rate below SLO threshold'
      },
      {
        name: 'LowAvailability',
        condition: 'avg_over_time(uep_agent_health_score[15m])',
        threshold: this.config.sloThresholds.availabilityTarget,
        duration: 600, // 10 minutes
        severity: 'critical',
        description: 'Agent availability below target'
      },
      {
        name: 'ProtocolCompliance',
        condition: 'uep_protocol_compliance_score',
        threshold: this.config.sloThresholds.complianceMinimum,
        duration: 120, // 2 minutes
        severity: 'warning',
        description: 'UEP protocol compliance below minimum threshold'
      }
    ];
  }

  /**
   * Get current metrics summary
   */
  public getMetricsSummary(): any {
    const agents = Array.from(this.agentMetricsCache.keys());
    const summary = {
      timestamp: new Date().toISOString(),
      totalAgents: agents.length,
      healthyAgents: 0,
      warningAgents: 0,
      criticalAgents: 0,
      averageHealthScore: 0,
      sloCompliance: {
        responseTime: 0,
        successRate: 0,
        availability: 0
      }
    };

    // Calculate summary statistics
    for (const [agentId, healthStatus] of this.agentMetricsCache) {
      switch (healthStatus.status) {
        case 'passing':
          summary.healthyAgents++;
          break;
        case 'warning':
          summary.warningAgents++;
          break;
        case 'critical':
          summary.criticalAgents++;
          break;
      }
    }

    // Calculate average health score
    if (agents.length > 0) {
      let totalHealthScore = 0;
      for (const healthStatus of this.agentMetricsCache.values()) {
        totalHealthScore += this.calculateHealthScore(healthStatus);
      }
      summary.averageHealthScore = totalHealthScore / agents.length;
    }

    return summary;
  }
}

/**
 * Factory function to create UEP Health Metrics Integration
 */
export function createUEPHealthMetricsIntegration(
  metricsCollector: UEPMetricsCollector,
  config: Partial<MetricsIntegrationConfig> = {}
): UEPHealthMetricsIntegration {
  return new UEPHealthMetricsIntegration(metricsCollector, config);
}

// Export types
export type {
  MetricsIntegrationConfig,
  AlertingRule,
  WindowedMetrics,
  HealthTrendAnalysis
};