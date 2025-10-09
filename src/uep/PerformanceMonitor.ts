/**
 * Performance Monitor and Health Check System
 * 
 * Provides comprehensive performance monitoring, health checks, and system
 * observability for the ProjectContext Meta Agent Autonomy system.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ProjectContextManager } from './ProjectContextManager';
import { ProjectContextIntegration } from './ProjectContextIntegration';
import { IOAIntegration } from './IOAIntegration';
import { EscalationEngine } from './EscalationEngine';
import {
  ProjectContextStats,
  HealthStatus,
  ProjectEventType,
  ProjectContextEvent
} from './interfaces/IProjectContext';

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  projectId: string;
  enableRealTimeMonitoring: boolean;
  enablePerformanceLogging: boolean;
  enableHealthChecks: boolean;
  enablePredictiveAnalysis: boolean;
  enableAlerting: boolean;
  
  // Monitoring intervals
  metricsCollectionInterval: number; // seconds
  healthCheckInterval: number; // seconds
  performanceReportInterval: number; // minutes
  
  // Thresholds
  responseTimeThreshold: number; // milliseconds
  throughputThreshold: number; // operations per second
  errorRateThreshold: number; // percentage
  memoryUsageThreshold: number; // percentage
  cpuUsageThreshold: number; // percentage
  
  // Storage
  metricsRetentionDays: number;
  reportOutputPath: string;
  enableMetricsPersistence: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  timestamp: Date;
  projectId: string;
  
  // Response time metrics
  responseTime: {
    min: number;
    max: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  
  // Throughput metrics
  throughput: {
    operationsPerSecond: number;
    tasksPerSecond: number;
    eventsPerSecond: number;
    requestsPerSecond: number;
  };
  
  // Error metrics
  errors: {
    errorRate: number; // percentage
    totalErrors: number;
    errorsByType: Record<string, number>;
    criticalErrors: number;
  };
  
  // Resource metrics
  resources: {
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
    redisConnections: number;
    activeAgents: number;
    pendingTasks: number;
  };
  
  // System metrics
  system: {
    uptime: number; // milliseconds
    totalOperations: number;
    cacheHitRate: number; // percentage
    escalationCount: number;
    healthScore: number; // 0-100
  };
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  componentName: string;
  status: HealthStatus;
  lastChecked: Date;
  responseTime: number; // milliseconds
  message: string;
  details: Record<string, any>;
  score: number; // 0-100
}

/**
 * System health report
 */
export interface SystemHealthReport {
  timestamp: Date;
  projectId: string;
  overallStatus: HealthStatus;
  overallScore: number; // 0-100
  components: HealthCheckResult[];
  trends: HealthTrend[];
  recommendations: string[];
  alerts: HealthAlert[];
}

/**
 * Health trend data
 */
export interface HealthTrend {
  metric: string;
  timeframe: string; // e.g., "1h", "24h", "7d"
  trend: 'improving' | 'stable' | 'degrading';
  changePercentage: number;
  data: Array<{ timestamp: Date; value: number }>;
}

/**
 * Health alert
 */
export interface HealthAlert {
  alertId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  threshold: number;
  actualValue: number;
  timestamp: Date;
  acknowledged: boolean;
}

/**
 * Performance benchmark
 */
export interface PerformanceBenchmark {
  name: string;
  description: string;
  operation: () => Promise<any>;
  expectedDuration: number; // milliseconds
  tolerance: number; // percentage
}

/**
 * Performance Monitor Implementation
 */
export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceMonitorConfig;
  private projectContextManager: ProjectContextManager;
  private integrations: {
    projectContext?: ProjectContextIntegration;
    ioa?: IOAIntegration;
    escalation?: EscalationEngine;
  } = {};
  
  private isInitialized = false;
  private isMonitoring = false;
  private metricsHistory: PerformanceMetrics[] = [];
  private healthHistory: SystemHealthReport[] = [];
  private currentMetrics: PerformanceMetrics | null = null;
  private currentHealthReport: SystemHealthReport | null = null;
  
  // Timers
  private metricsTimer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private reportTimer: NodeJS.Timeout | null = null;
  
  // Performance tracking
  private operationTimings: number[] = [];
  private operationCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private startTime = Date.now();
  
  // Health checks
  private healthCheckers = new Map<string, () => Promise<HealthCheckResult>>();
  private activeAlerts = new Map<string, HealthAlert>();

  constructor(
    projectContextManager: ProjectContextManager,
    config: Partial<PerformanceMonitorConfig> = {}
  ) {
    super();
    
    this.projectContextManager = projectContextManager;
    this.config = {
      projectId: config.projectId || 'default',
      enableRealTimeMonitoring: config.enableRealTimeMonitoring ?? true,
      enablePerformanceLogging: config.enablePerformanceLogging ?? true,
      enableHealthChecks: config.enableHealthChecks ?? true,
      enablePredictiveAnalysis: config.enablePredictiveAnalysis ?? true,
      enableAlerting: config.enableAlerting ?? true,
      
      metricsCollectionInterval: config.metricsCollectionInterval ?? 30, // 30 seconds
      healthCheckInterval: config.healthCheckInterval ?? 60, // 1 minute
      performanceReportInterval: config.performanceReportInterval ?? 15, // 15 minutes
      
      responseTimeThreshold: config.responseTimeThreshold ?? 1000, // 1 second
      throughputThreshold: config.throughputThreshold ?? 10, // 10 ops/sec
      errorRateThreshold: config.errorRateThreshold ?? 5, // 5%
      memoryUsageThreshold: config.memoryUsageThreshold ?? 80, // 80%
      cpuUsageThreshold: config.cpuUsageThreshold ?? 70, // 70%
      
      metricsRetentionDays: config.metricsRetentionDays ?? 7,
      reportOutputPath: config.reportOutputPath || './.monitoring',
      enableMetricsPersistence: config.enableMetricsPersistence ?? true,
      
      ...config
    };

    // Initialize health checkers
    this.initializeHealthCheckers();

    console.log('📊 Performance Monitor initialized', {
      projectId: this.config.projectId,
      enableRealTimeMonitoring: this.config.enableRealTimeMonitoring,
      enableHealthChecks: this.config.enableHealthChecks
    });
  }

  /**
   * Initialize the performance monitor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Performance Monitor already initialized');
      return;
    }

    try {
      // Initialize ProjectContext Manager if needed
      if (!this.projectContextManager['isInitialized']) {
        await this.projectContextManager.initialize();
      }

      // Set up event listeners
      this.setupEventListeners();

      // Create monitoring directories
      if (this.config.enableMetricsPersistence) {
        await fs.ensureDir(this.config.reportOutputPath);
      }

      // Load historical data
      await this.loadHistoricalData();

      this.isInitialized = true;
      console.log('🚀 Performance Monitor initialized successfully');

      this.emit('monitor:initialized', {
        projectId: this.config.projectId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Failed to initialize Performance Monitor:', error);
      throw error;
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Performance Monitor must be initialized first');
    }

    if (this.isMonitoring) {
      console.log('⚠️ Performance Monitor already monitoring');
      return;
    }

    console.log('📈 Starting performance monitoring...');

    // Start metrics collection
    if (this.config.enableRealTimeMonitoring) {
      this.startMetricsCollection();
    }

    // Start health checks
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    // Start performance reports
    this.startPerformanceReports();

    this.isMonitoring = true;
    console.log('✅ Performance monitoring started');

    this.emit('monitor:started', {
      projectId: this.config.projectId,
      timestamp: new Date()
    });
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    console.log('⏹️ Stopping performance monitoring...');

    // Clear timers
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }

    // Save final data
    if (this.config.enableMetricsPersistence) {
      await this.saveMetricsData();
      await this.saveHealthData();
    }

    this.isMonitoring = false;
    console.log('✅ Performance monitoring stopped');

    this.emit('monitor:stopped', {
      projectId: this.config.projectId,
      timestamp: new Date()
    });
  }

  /**
   * Connect integrations for enhanced monitoring
   */
  connectIntegrations(integrations: {
    projectContext?: ProjectContextIntegration;
    ioa?: IOAIntegration;
    escalation?: EscalationEngine;
  }): void {
    this.integrations = integrations;
    
    // Set up integration event listeners
    if (integrations.projectContext) {
      integrations.projectContext.on('*', (event: any) => {
        this.recordOperation('integration_event', Date.now() - event.timestamp);
      });
    }

    if (integrations.ioa) {
      integrations.ioa.on('*', (event: any) => {
        this.recordOperation('ioa_event', Date.now() - event.timestamp);
      });
    }

    if (integrations.escalation) {
      integrations.escalation.on('*', (event: any) => {
        this.recordOperation('escalation_event', Date.now() - event.timestamp);
      });
    }

    console.log('🔗 Performance Monitor integrations connected');
  }

  /**
   * Record operation performance
   */
  recordOperation(operationType: string, duration: number, success: boolean = true): void {
    if (!this.isMonitoring) return;

    // Record timing
    this.operationTimings.push(duration);
    
    // Limit timing history
    if (this.operationTimings.length > 1000) {
      this.operationTimings = this.operationTimings.slice(-500);
    }

    // Record operation count
    const currentCount = this.operationCounts.get(operationType) || 0;
    this.operationCounts.set(operationType, currentCount + 1);

    // Record errors
    if (!success) {
      const errorCount = this.errorCounts.get(operationType) || 0;
      this.errorCounts.set(operationType, errorCount + 1);
    }

    // Emit real-time event
    this.emit('operation:recorded', {
      type: operationType,
      duration,
      success,
      timestamp: new Date()
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('❌ Metrics collection failed:', error);
      }
    }, this.config.metricsCollectionInterval * 1000);

    console.log(`📊 Metrics collection started (interval: ${this.config.metricsCollectionInterval}s)`);
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthTimer = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('❌ Health checks failed:', error);
      }
    }, this.config.healthCheckInterval * 1000);

    console.log(`🏥 Health checks started (interval: ${this.config.healthCheckInterval}s)`);
  }

  /**
   * Start performance reports
   */
  private startPerformanceReports(): void {
    this.reportTimer = setInterval(async () => {
      try {
        await this.generatePerformanceReport();
      } catch (error) {
        console.error('❌ Performance report generation failed:', error);
      }
    }, this.config.performanceReportInterval * 60 * 1000);

    console.log(`📋 Performance reports started (interval: ${this.config.performanceReportInterval}m)`);
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date();
    
    // Calculate response time metrics
    const responseTime = this.calculateResponseTimeMetrics();
    
    // Calculate throughput metrics
    const throughput = this.calculateThroughputMetrics();
    
    // Calculate error metrics
    const errors = this.calculateErrorMetrics();
    
    // Calculate resource metrics
    const resources = await this.calculateResourceMetrics();
    
    // Calculate system metrics
    const system = await this.calculateSystemMetrics();

    const metrics: PerformanceMetrics = {
      timestamp,
      projectId: this.config.projectId,
      responseTime,
      throughput,
      errors,
      resources,
      system
    };

    this.currentMetrics = metrics;
    this.metricsHistory.push(metrics);

    // Limit history
    if (this.metricsHistory.length > 2880) { // 24 hours at 30s intervals
      this.metricsHistory = this.metricsHistory.slice(-1440); // Keep 12 hours
    }

    // Check thresholds and trigger alerts
    await this.checkPerformanceThresholds(metrics);

    this.emit('metrics:collected', metrics);

    if (this.config.enablePerformanceLogging) {
      console.log(`📊 Metrics collected - RT: ${responseTime.average}ms, TPS: ${throughput.operationsPerSecond}, Errors: ${errors.errorRate}%`);
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    const timestamp = new Date();
    const components: HealthCheckResult[] = [];

    // Run all health checkers
    for (const [componentName, checker] of this.healthCheckers) {
      try {
        const result = await checker();
        components.push(result);
      } catch (error) {
        components.push({
          componentName,
          status: 'critical',
          lastChecked: timestamp,
          responseTime: 0,
          message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
          details: { error },
          score: 0
        });
      }
    }

    // Calculate overall health
    const overallScore = this.calculateOverallHealthScore(components);
    const overallStatus = this.determineOverallHealthStatus(overallScore);

    // Generate trends
    const trends = this.calculateHealthTrends();

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations(components);

    // Check for new alerts
    const alerts = await this.checkHealthAlerts(components);

    const healthReport: SystemHealthReport = {
      timestamp,
      projectId: this.config.projectId,
      overallStatus,
      overallScore,
      components,
      trends,
      recommendations,
      alerts
    };

    this.currentHealthReport = healthReport;
    this.healthHistory.push(healthReport);

    // Limit history
    if (this.healthHistory.length > 1440) { // 24 hours at 1m intervals
      this.healthHistory = this.healthHistory.slice(-720); // Keep 12 hours
    }

    this.emit('health:checked', healthReport);

    if (this.config.enablePerformanceLogging) {
      console.log(`🏥 Health check completed - Status: ${overallStatus}, Score: ${overallScore}`);
    }
  }

  /**
   * Calculate response time metrics
   */
  private calculateResponseTimeMetrics(): PerformanceMetrics['responseTime'] {
    if (this.operationTimings.length === 0) {
      return { min: 0, max: 0, average: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.operationTimings].sort((a, b) => a - b);
    const length = sorted.length;

    return {
      min: sorted[0],
      max: sorted[length - 1],
      average: sorted.reduce((sum, time) => sum + time, 0) / length,
      p50: sorted[Math.floor(length * 0.5)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)]
    };
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughputMetrics(): PerformanceMetrics['throughput'] {
    const intervalSeconds = this.config.metricsCollectionInterval;
    const totalOperations = Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0);

    return {
      operationsPerSecond: totalOperations / intervalSeconds,
      tasksPerSecond: (this.operationCounts.get('task') || 0) / intervalSeconds,
      eventsPerSecond: (this.operationCounts.get('event') || 0) / intervalSeconds,
      requestsPerSecond: (this.operationCounts.get('request') || 0) / intervalSeconds
    };
  }

  /**
   * Calculate error metrics
   */
  private calculateErrorMetrics(): PerformanceMetrics['errors'] {
    const totalOperations = Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);

    const errorsByType: Record<string, number> = {};
    for (const [type, count] of this.errorCounts) {
      errorsByType[type] = count;
    }

    return {
      errorRate: totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0,
      totalErrors,
      errorsByType,
      criticalErrors: this.errorCounts.get('critical') || 0
    };
  }

  /**
   * Calculate resource metrics
   */
  private async calculateResourceMetrics(): Promise<PerformanceMetrics['resources']> {
    try {
      // Get project stats
      const stats = await this.projectContextManager.getStats(this.config.projectId);

      // Mock system resource metrics (would integrate with actual monitoring in production)
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      return {
        memoryUsage: memoryUsagePercentage,
        cpuUsage: Math.random() * 100, // Mock CPU usage
        redisConnections: 1, // Mock Redis connections
        activeAgents: stats.agentStats.total - (stats.agentStats.byStatus.offline || 0),
        pendingTasks: stats.taskStats.byStatus.pending || 0
      };
    } catch (error) {
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        redisConnections: 0,
        activeAgents: 0,
        pendingTasks: 0
      };
    }
  }

  /**
   * Calculate system metrics
   */
  private async calculateSystemMetrics(): Promise<PerformanceMetrics['system']> {
    try {
      const stats = await this.projectContextManager.getStats(this.config.projectId);
      const totalOperations = Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0);
      
      // Calculate cache hit rate (mock implementation)
      const cacheHitRate = Math.random() * 100; // Would be calculated from actual cache stats

      // Get escalation count
      const escalationCount = this.integrations.escalation?.getActiveIncidents().length || 0;

      // Calculate health score
      const healthScore = this.currentHealthReport?.overallScore || 100;

      return {
        uptime: Date.now() - this.startTime,
        totalOperations,
        cacheHitRate,
        escalationCount,
        healthScore
      };
    } catch (error) {
      return {
        uptime: Date.now() - this.startTime,
        totalOperations: 0,
        cacheHitRate: 0,
        escalationCount: 0,
        healthScore: 0
      };
    }
  }

  /**
   * Initialize health checkers
   */
  private initializeHealthCheckers(): void {
    // ProjectContext Manager health check
    this.healthCheckers.set('project-context-manager', async () => {
      const startTime = Date.now();
      try {
        const project = await this.projectContextManager.getProject(this.config.projectId);
        const responseTime = Date.now() - startTime;
        
        if (!project) {
          return {
            componentName: 'project-context-manager',
            status: 'critical' as HealthStatus,
            lastChecked: new Date(),
            responseTime,
            message: 'Project not found',
            details: { projectId: this.config.projectId },
            score: 0
          };
        }

        const score = responseTime < 100 ? 100 : Math.max(0, 100 - (responseTime - 100) / 10);
        
        return {
          componentName: 'project-context-manager',
          status: this.getHealthStatusFromScore(score),
          lastChecked: new Date(),
          responseTime,
          message: 'Operating normally',
          details: { 
            projectStatus: project.status,
            taskCount: project.tasks.length,
            agentCount: project.agents.length
          },
          score
        };
      } catch (error) {
        return {
          componentName: 'project-context-manager',
          status: 'critical' as HealthStatus,
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`,
          details: { error },
          score: 0
        };
      }
    });

    // Redis health check
    this.healthCheckers.set('redis', async () => {
      const startTime = Date.now();
      try {
        // Mock Redis ping (would use actual Redis client in production)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        const responseTime = Date.now() - startTime;
        
        const score = responseTime < 50 ? 100 : Math.max(0, 100 - (responseTime - 50) / 5);
        
        return {
          componentName: 'redis',
          status: this.getHealthStatusFromScore(score),
          lastChecked: new Date(),
          responseTime,
          message: 'Redis connection healthy',
          details: { connectionPool: 'active' },
          score
        };
      } catch (error) {
        return {
          componentName: 'redis',
          status: 'critical' as HealthStatus,
          lastChecked: new Date(),
          responseTime: Date.now() - startTime,
          message: `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
          details: { error },
          score: 0
        };
      }
    });

    // System resources health check
    this.healthCheckers.set('system-resources', async () => {
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      let score = 100;
      let status: HealthStatus = 'healthy';
      let message = 'System resources normal';

      if (memoryPercentage > this.config.memoryUsageThreshold) {
        score -= (memoryPercentage - this.config.memoryUsageThreshold) * 2;
        status = 'degraded';
        message = 'High memory usage detected';
      }

      if (memoryPercentage > 95) {
        score = 0;
        status = 'critical';
        message = 'Critical memory usage';
      }

      return {
        componentName: 'system-resources',
        status,
        lastChecked: new Date(),
        responseTime: 0,
        message,
        details: {
          memoryUsage: memoryPercentage,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal
        },
        score: Math.max(0, score)
      };
    });
  }

  /**
   * Calculate overall health score
   */
  private calculateOverallHealthScore(components: HealthCheckResult[]): number {
    if (components.length === 0) return 0;
    
    const totalScore = components.reduce((sum, component) => sum + component.score, 0);
    return Math.round(totalScore / components.length);
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealthStatus(score: number): HealthStatus {
    return this.getHealthStatusFromScore(score);
  }

  /**
   * Get health status from score
   */
  private getHealthStatusFromScore(score: number): HealthStatus {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  /**
   * Calculate health trends
   */
  private calculateHealthTrends(): HealthTrend[] {
    const trends: HealthTrend[] = [];
    
    // Calculate trend for overall health score
    const recentReports = this.healthHistory.slice(-12); // Last 12 reports
    if (recentReports.length >= 2) {
      const scores = recentReports.map(r => r.overallScore);
      const firstScore = scores[0];
      const lastScore = scores[scores.length - 1];
      const changePercentage = ((lastScore - firstScore) / firstScore) * 100;
      
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      if (Math.abs(changePercentage) > 5) {
        trend = changePercentage > 0 ? 'improving' : 'degrading';
      }
      
      trends.push({
        metric: 'overall_health_score',
        timeframe: '1h',
        trend,
        changePercentage,
        data: recentReports.map(r => ({
          timestamp: r.timestamp,
          value: r.overallScore
        }))
      });
    }

    return trends;
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(components: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];
    
    for (const component of components) {
      if (component.status === 'critical' || component.status === 'poor') {
        recommendations.push(`Address critical issues in ${component.componentName}: ${component.message}`);
      }
      
      if (component.componentName === 'system-resources' && component.details.memoryUsage > 80) {
        recommendations.push('Consider optimizing memory usage or scaling resources');
      }
      
      if (component.responseTime > this.config.responseTimeThreshold) {
        recommendations.push(`Improve response time for ${component.componentName} (current: ${component.responseTime}ms)`);
      }
    }

    // Add general recommendations based on trends
    if (this.currentMetrics) {
      if (this.currentMetrics.errors.errorRate > this.config.errorRateThreshold) {
        recommendations.push(`Error rate is high (${this.currentMetrics.errors.errorRate.toFixed(1)}%) - investigate error causes`);
      }
      
      if (this.currentMetrics.throughput.operationsPerSecond < this.config.throughputThreshold) {
        recommendations.push('System throughput is below threshold - consider performance optimization');
      }
    }

    return recommendations.slice(0, 10); // Limit to top 10
  }

  /**
   * Check health alerts
   */
  private async checkHealthAlerts(components: HealthCheckResult[]): Promise<HealthAlert[]> {
    const newAlerts: HealthAlert[] = [];

    for (const component of components) {
      // Check for critical component status
      if (component.status === 'critical') {
        const alertId = `critical_${component.componentName}_${Date.now()}`;
        const alert: HealthAlert = {
          alertId,
          severity: 'critical',
          component: component.componentName,
          message: `Critical health status: ${component.message}`,
          threshold: 0,
          actualValue: component.score,
          timestamp: new Date(),
          acknowledged: false
        };

        newAlerts.push(alert);
        this.activeAlerts.set(alertId, alert);
      }

      // Check response time threshold
      if (component.responseTime > this.config.responseTimeThreshold) {
        const alertId = `response_time_${component.componentName}_${Date.now()}`;
        const alert: HealthAlert = {
          alertId,
          severity: 'warning',
          component: component.componentName,
          message: `Response time exceeded threshold`,
          threshold: this.config.responseTimeThreshold,
          actualValue: component.responseTime,
          timestamp: new Date(),
          acknowledged: false
        };

        newAlerts.push(alert);
        this.activeAlerts.set(alertId, alert);
      }
    }

    // Clean up old alerts (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.timestamp < oneHourAgo) {
        this.activeAlerts.delete(alertId);
      }
    }

    return newAlerts;
  }

  /**
   * Check performance thresholds
   */
  private async checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<void> {
    // Check response time threshold
    if (metrics.responseTime.average > this.config.responseTimeThreshold) {
      this.emit('alert:performance', {
        type: 'response_time_threshold',
        message: `Average response time ${metrics.responseTime.average}ms exceeds threshold ${this.config.responseTimeThreshold}ms`,
        severity: 'warning',
        metrics
      });
    }

    // Check error rate threshold
    if (metrics.errors.errorRate > this.config.errorRateThreshold) {
      this.emit('alert:performance', {
        type: 'error_rate_threshold',
        message: `Error rate ${metrics.errors.errorRate.toFixed(1)}% exceeds threshold ${this.config.errorRateThreshold}%`,
        severity: 'error',
        metrics
      });
    }

    // Check throughput threshold
    if (metrics.throughput.operationsPerSecond < this.config.throughputThreshold) {
      this.emit('alert:performance', {
        type: 'throughput_threshold',
        message: `Throughput ${metrics.throughput.operationsPerSecond.toFixed(1)} ops/sec below threshold ${this.config.throughputThreshold}`,
        severity: 'warning',
        metrics
      });
    }
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(): Promise<void> {
    if (!this.config.enableMetricsPersistence) return;

    try {
      const report = {
        timestamp: new Date(),
        projectId: this.config.projectId,
        timeframe: `${this.config.performanceReportInterval} minutes`,
        
        currentMetrics: this.currentMetrics,
        currentHealth: this.currentHealthReport,
        
        summary: {
          totalOperations: Array.from(this.operationCounts.values()).reduce((sum, count) => sum + count, 0),
          totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
          uptime: Date.now() - this.startTime,
          activeAlerts: this.activeAlerts.size
        },
        
        trends: this.calculateHealthTrends(),
        
        alerts: Array.from(this.activeAlerts.values()).filter(alert => !alert.acknowledged)
      };

      const reportPath = path.join(
        this.config.reportOutputPath,
        `performance-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      );

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      console.log(`📋 Performance report generated: ${reportPath}`);
      this.emit('report:generated', { reportPath, report });

    } catch (error) {
      console.error('❌ Failed to generate performance report:', error);
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for project context events
    this.projectContextManager.onEvent('*', (event: ProjectContextEvent) => {
      this.recordOperation('project_context_event', 0, true);
    });

    // Listen for task events for performance tracking
    this.projectContextManager.onEvent('task_created', (event: ProjectContextEvent) => {
      this.recordOperation('task_created', Date.now() - event.timestamp.getTime(), true);
    });

    this.projectContextManager.onEvent('task_failed', (event: ProjectContextEvent) => {
      this.recordOperation('task_failed', Date.now() - event.timestamp.getTime(), false);
    });
  }

  /**
   * Load historical data
   */
  private async loadHistoricalData(): Promise<void> {
    if (!this.config.enableMetricsPersistence) return;

    try {
      const metricsPath = path.join(this.config.reportOutputPath, 'metrics-history.json');
      const healthPath = path.join(this.config.reportOutputPath, 'health-history.json');

      if (await fs.pathExists(metricsPath)) {
        const data = await fs.readJSON(metricsPath);
        this.metricsHistory = data.metrics || [];
      }

      if (await fs.pathExists(healthPath)) {
        const data = await fs.readJSON(healthPath);
        this.healthHistory = data.health || [];
      }

      console.log(`📊 Loaded historical data: ${this.metricsHistory.length} metrics, ${this.healthHistory.length} health reports`);

    } catch (error) {
      console.warn('⚠️ Failed to load historical data:', error);
    }
  }

  /**
   * Save metrics data
   */
  private async saveMetricsData(): Promise<void> {
    try {
      const metricsPath = path.join(this.config.reportOutputPath, 'metrics-history.json');
      await fs.writeJSON(metricsPath, { 
        metrics: this.metricsHistory.slice(-1000), // Keep last 1000 entries
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('❌ Failed to save metrics data:', error);
    }
  }

  /**
   * Save health data
   */
  private async saveHealthData(): Promise<void> {
    try {
      const healthPath = path.join(this.config.reportOutputPath, 'health-history.json');
      await fs.writeJSON(healthPath, {
        health: this.healthHistory.slice(-1000), // Keep last 1000 entries
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('❌ Failed to save health data:', error);
    }
  }

  /**
   * Run performance benchmarks
   */
  async runBenchmarks(benchmarks: PerformanceBenchmark[]): Promise<Map<string, { duration: number; passed: boolean; details: any }>> {
    const results = new Map();

    console.log(`🏃 Running ${benchmarks.length} performance benchmarks...`);

    for (const benchmark of benchmarks) {
      const startTime = Date.now();
      
      try {
        const result = await benchmark.operation();
        const duration = Date.now() - startTime;
        
        const passed = duration <= benchmark.expectedDuration * (1 + benchmark.tolerance / 100);
        
        results.set(benchmark.name, {
          duration,
          passed,
          details: {
            expectedDuration: benchmark.expectedDuration,
            tolerance: benchmark.tolerance,
            result
          }
        });

        console.log(`${passed ? '✅' : '❌'} ${benchmark.name}: ${duration}ms (expected: ${benchmark.expectedDuration}ms)`);

      } catch (error) {
        results.set(benchmark.name, {
          duration: Date.now() - startTime,
          passed: false,
          details: { error }
        });

        console.log(`❌ ${benchmark.name}: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.emit('benchmarks:completed', { results });
    return results;
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    isMonitoring: boolean;
    currentMetrics: PerformanceMetrics | null;
    currentHealth: SystemHealthReport | null;
    activeAlerts: HealthAlert[];
    config: PerformanceMonitorConfig;
  } {
    return {
      isMonitoring: this.isMonitoring,
      currentMetrics: this.currentMetrics,
      currentHealth: this.currentHealthReport,
      activeAlerts: Array.from(this.activeAlerts.values()),
      config: this.config
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): PerformanceMetrics[] {
    return limit ? this.metricsHistory.slice(-limit) : this.metricsHistory;
  }

  /**
   * Get health history
   */
  getHealthHistory(limit?: number): SystemHealthReport[] {
    return limit ? this.healthHistory.slice(-limit) : this.healthHistory;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Shutdown performance monitor
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Performance Monitor...');

    await this.stopMonitoring();

    // Save final data
    if (this.config.enableMetricsPersistence) {
      await this.saveMetricsData();
      await this.saveHealthData();
    }

    this.isInitialized = false;
    console.log('✅ Performance Monitor shutdown complete');
  }
}

/**
 * Factory function for creating performance monitor
 */
export function createPerformanceMonitor(
  projectContextManager: ProjectContextManager,
  config?: Partial<PerformanceMonitorConfig>
): PerformanceMonitor {
  return new PerformanceMonitor(projectContextManager, config);
}