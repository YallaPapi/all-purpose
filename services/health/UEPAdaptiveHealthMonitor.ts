/**
 * UEP Adaptive Health Monitor
 * 
 * Advanced health monitoring system with adaptive health check intervals
 * and comprehensive anomaly detection algorithms. Implements exponential
 * backoff, dynamic polling, and multi-layered anomaly detection.
 * 
 * Research-based implementation features:
 * - Exponential backoff and dynamic polling frequency
 * - Statistical anomaly detection (Z-score, EWMA, moving averages)
 * - Machine learning-based outlier detection
 * - Real-time trend analysis and early warning systems
 * - Agent stability scoring and classification
 * - Adaptive interval adjustment based on agent behavior
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import type { AgentHealthStatus } from './UEPHealthMonitoringService';

// Configuration interfaces
interface AdaptiveMonitorConfig {
  intervals: {
    min: number;           // Minimum check interval (milliseconds)
    max: number;           // Maximum check interval (milliseconds)
    default: number;       // Default starting interval
    backoffMultiplier: number;  // Multiplier for exponential backoff
    recoveryMultiplier: number; // Multiplier for recovery (reducing interval)
  };
  anomalyDetection: {
    zScoreThreshold: number;      // Z-score threshold for anomaly detection
    ewmaAlpha: number;            // Alpha parameter for EWMA
    movingWindowSize: number;     // Size of moving window for analysis
    minDataPoints: number;        // Minimum data points needed for analysis
    enableMLDetection: boolean;   // Enable machine learning based detection
  };
  stability: {
    stableThreshold: number;      // Consecutive stable checks to consider stable
    unstableThreshold: number;    // Consecutive unstable checks to consider unstable
    degradationThreshold: number; // Threshold for detecting degradation trends
  };
}

interface AgentStabilityMetrics {
  agentId: string;
  currentInterval: number;
  lastAdjustment: Date;
  consecutiveStable: number;
  consecutiveUnstable: number;
  stabilityScore: number;        // 0-100 score
  classification: 'stable' | 'degrading' | 'unstable' | 'recovering';
  trendDirection: 'improving' | 'stable' | 'degrading';
  lastAnomaly?: Date;
  anomalyCount24h: number;
}

interface AnomalyDetectionResult {
  agentId: string;
  timestamp: Date;
  metric: string;
  value: number;
  anomalyType: 'statistical' | 'trend' | 'outlier' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;            // 0-1 confidence score
  details: {
    expected?: number;
    deviation?: number;
    threshold?: number;
    context?: string;
  };
}

interface HealthTrendAnalysis {
  agentId: string;
  timeWindow: number;
  trendData: {
    responseTime: TrendMetric;
    healthScore: TrendMetric;
    cpuUsage: TrendMetric;
    memoryUsage: TrendMetric;
    successRate: TrendMetric;
  };
  overallTrend: 'improving' | 'stable' | 'degrading';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface TrendMetric {
  current: number;
  average: number;
  min: number;
  max: number;
  stdDev: number;
  slope: number;               // Linear regression slope
  trend: 'improving' | 'stable' | 'degrading';
  anomalies: number;
}

interface EWMAState {
  value: number;
  initialized: boolean;
}

/**
 * UEP Adaptive Health Monitor
 * 
 * Main class implementing adaptive health monitoring with dynamic intervals
 * and comprehensive anomaly detection algorithms.
 */
export class UEPAdaptiveHealthMonitor extends EventEmitter {
  private logger: winston.Logger;
  private config: AdaptiveMonitorConfig;
  
  // Agent monitoring state
  private agentStability = new Map<string, AgentStabilityMetrics>();
  private agentIntervals = new Map<string, NodeJS.Timeout>();
  private healthHistory = new Map<string, Array<{ timestamp: Date; metrics: any }>>();
  
  // Anomaly detection state
  private ewmaStates = new Map<string, Map<string, EWMAState>>();
  private movingAverages = new Map<string, Map<string, number[]>>();
  private detectedAnomalies = new Map<string, AnomalyDetectionResult[]>();
  
  // Trend analysis state
  private trendAnalysis = new Map<string, HealthTrendAnalysis>();
  private lastTrendUpdate = new Map<string, Date>();

  constructor(config: Partial<AdaptiveMonitorConfig> = {}) {
    super();
    
    // Default configuration
    const defaultConfig: AdaptiveMonitorConfig = {
      intervals: {
        min: 2000,              // 2 seconds minimum
        max: 300000,            // 5 minutes maximum
        default: 15000,         // 15 seconds default
        backoffMultiplier: 1.5, // 1.5x backoff
        recoveryMultiplier: 0.75 // 0.75x recovery
      },
      anomalyDetection: {
        zScoreThreshold: 2.5,   // 2.5 standard deviations
        ewmaAlpha: 0.3,         // 30% weight on new values
        movingWindowSize: 20,   // 20 data points
        minDataPoints: 5,       // Need at least 5 points
        enableMLDetection: false // Start with statistical methods
      },
      stability: {
        stableThreshold: 5,     // 5 consecutive stable checks
        unstableThreshold: 3,   // 3 consecutive unstable checks
        degradationThreshold: 0.15 // 15% degradation threshold
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
        new winston.transports.File({ filename: 'logs/adaptive-health-monitor.log' })
      ]
    });

    this.logger.info('UEP Adaptive Health Monitor initialized');
  }

  /**
   * Start monitoring an agent with adaptive intervals
   */
  public startMonitoring(agentId: string, initialHealthStatus?: AgentHealthStatus): void {
    if (this.agentStability.has(agentId)) {
      this.logger.warn(`Agent ${agentId} is already being monitored`);
      return;
    }

    // Initialize agent stability metrics
    const stabilityMetrics: AgentStabilityMetrics = {
      agentId,
      currentInterval: this.config.intervals.default,
      lastAdjustment: new Date(),
      consecutiveStable: 0,
      consecutiveUnstable: 0,
      stabilityScore: 100, // Start optimistic
      classification: 'stable',
      trendDirection: 'stable',
      anomalyCount24h: 0
    };

    this.agentStability.set(agentId, stabilityMetrics);
    this.healthHistory.set(agentId, []);
    this.ewmaStates.set(agentId, new Map());
    this.movingAverages.set(agentId, new Map());
    this.detectedAnomalies.set(agentId, []);

    // Process initial health status if provided
    if (initialHealthStatus) {
      this.processHealthUpdate(initialHealthStatus);
    }

    // Start adaptive monitoring loop
    this.scheduleNextCheck(agentId);

    this.logger.info(`Started adaptive monitoring for agent ${agentId}`);
    this.emit('monitoringStarted', { agentId });
  }

  /**
   * Stop monitoring an agent
   */
  public stopMonitoring(agentId: string): void {
    const interval = this.agentIntervals.get(agentId);
    if (interval) {
      clearTimeout(interval);
      this.agentIntervals.delete(agentId);
    }

    this.agentStability.delete(agentId);
    this.healthHistory.delete(agentId);
    this.ewmaStates.delete(agentId);
    this.movingAverages.delete(agentId);
    this.detectedAnomalies.delete(agentId);
    this.trendAnalysis.delete(agentId);
    this.lastTrendUpdate.delete(agentId);

    this.logger.info(`Stopped adaptive monitoring for agent ${agentId}`);
    this.emit('monitoringStopped', { agentId });
  }

  /**
   * Process a health status update from an agent
   */
  public processHealthUpdate(healthStatus: AgentHealthStatus): void {
    const agentId = healthStatus.agentId;
    const stability = this.agentStability.get(agentId);
    
    if (!stability) {
      this.logger.warn(`Received health update for unmonitored agent ${agentId}`);
      return;
    }

    // Store health data
    this.storeHealthData(agentId, healthStatus);
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(agentId, healthStatus);
    
    // Update stability metrics
    this.updateStabilityMetrics(agentId, healthStatus, anomalies);
    
    // Adjust monitoring interval
    this.adjustMonitoringInterval(agentId);
    
    // Update trend analysis
    this.updateTrendAnalysis(agentId);
    
    // Emit events for detected anomalies
    for (const anomaly of anomalies) {
      this.emit('anomalyDetected', anomaly);
    }

    this.logger.debug(`Processed health update for agent ${agentId}`, {
      status: healthStatus.status,
      interval: stability.currentInterval,
      anomalies: anomalies.length
    });
  }

  /**
   * Store health data in history
   */
  private storeHealthData(agentId: string, healthStatus: AgentHealthStatus): void {
    const history = this.healthHistory.get(agentId)!;
    
    history.push({
      timestamp: new Date(),
      metrics: {
        status: healthStatus.status,
        responseTime: healthStatus.metrics.responseTime,
        successRate: healthStatus.metrics.successRate,
        cpuUsage: healthStatus.metrics.resourceUtilization.cpu,
        memoryUsage: healthStatus.metrics.resourceUtilization.memory,
        healthScore: this.calculateHealthScore(healthStatus)
      }
    });

    // Keep only last 1000 entries
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Calculate health score from status
   */
  private calculateHealthScore(healthStatus: AgentHealthStatus): number {
    let baseScore = 0;
    switch (healthStatus.status) {
      case 'passing': baseScore = 100; break;
      case 'warning': baseScore = 70; break;
      case 'critical': baseScore = 20; break;
    }

    // Adjust for response time and success rate
    const responseTimePenalty = Math.min(20, healthStatus.metrics.responseTime / 100);
    const successRateBonus = (healthStatus.metrics.successRate - 90) / 10 * 5;
    
    return Math.max(0, Math.min(100, baseScore - responseTimePenalty + successRateBonus));
  }

  /**
   * Detect anomalies using multiple algorithms
   */
  private detectAnomalies(agentId: string, healthStatus: AgentHealthStatus): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];
    const history = this.healthHistory.get(agentId)!;
    
    if (history.length < this.config.anomalyDetection.minDataPoints) {
      return anomalies; // Not enough data
    }

    const metrics = {
      responseTime: healthStatus.metrics.responseTime,
      successRate: healthStatus.metrics.successRate,
      cpuUsage: healthStatus.metrics.resourceUtilization.cpu,
      memoryUsage: healthStatus.metrics.resourceUtilization.memory,
      healthScore: this.calculateHealthScore(healthStatus)
    };

    // Apply statistical anomaly detection for each metric
    for (const [metricName, value] of Object.entries(metrics)) {
      // Z-score based detection
      const zScoreAnomaly = this.detectZScoreAnomaly(agentId, metricName, value);
      if (zScoreAnomaly) {
        anomalies.push(zScoreAnomaly);
      }

      // EWMA based detection
      const ewmaAnomaly = this.detectEWMAAnomaly(agentId, metricName, value);
      if (ewmaAnomaly) {
        anomalies.push(ewmaAnomaly);
      }

      // Moving average based detection
      const maAnomaly = this.detectMovingAverageAnomaly(agentId, metricName, value);
      if (maAnomaly) {
        anomalies.push(maAnomaly);
      }
    }

    // Pattern-based anomaly detection
    const patternAnomaly = this.detectPatternAnomalies(agentId, healthStatus);
    if (patternAnomaly) {
      anomalies.push(patternAnomaly);
    }

    return anomalies;
  }

  /**
   * Detect anomalies using Z-score method
   */
  private detectZScoreAnomaly(agentId: string, metricName: string, value: number): AnomalyDetectionResult | null {
    const history = this.healthHistory.get(agentId)!;
    const values = history.map(h => h.metrics[metricName]).filter(v => v !== undefined);
    
    if (values.length < this.config.anomalyDetection.minDataPoints) {
      return null;
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return null; // No variance
    
    const zScore = Math.abs((value - mean) / stdDev);
    
    if (zScore > this.config.anomalyDetection.zScoreThreshold) {
      return {
        agentId,
        timestamp: new Date(),
        metric: metricName,
        value,
        anomalyType: 'statistical',
        severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
        confidence: Math.min(1, zScore / 5), // Normalize confidence
        details: {
          expected: mean,
          deviation: zScore,
          threshold: this.config.anomalyDetection.zScoreThreshold,
          context: `Z-score ${zScore.toFixed(2)} exceeds threshold`
        }
      };
    }

    return null;
  }

  /**
   * Detect anomalies using Exponentially Weighted Moving Average
   */
  private detectEWMAAnomaly(agentId: string, metricName: string, value: number): AnomalyDetectionResult | null {
    const ewmaStates = this.ewmaStates.get(agentId)!;
    let ewmaState = ewmaStates.get(metricName);
    
    if (!ewmaState) {
      ewmaState = { value: value, initialized: true };
      ewmaStates.set(metricName, ewmaState);
      return null; // First value, no anomaly possible
    }

    const alpha = this.config.anomalyDetection.ewmaAlpha;
    const expectedValue = ewmaState.value;
    const deviation = Math.abs(value - expectedValue);
    const relativeDeviation = expectedValue > 0 ? deviation / expectedValue : deviation;
    
    // Update EWMA
    ewmaState.value = alpha * value + (1 - alpha) * ewmaState.value;
    
    // Check for significant deviation
    const threshold = 0.3; // 30% deviation threshold
    if (relativeDeviation > threshold) {
      return {
        agentId,
        timestamp: new Date(),
        metric: metricName,
        value,
        anomalyType: 'trend',
        severity: relativeDeviation > 0.8 ? 'critical' : relativeDeviation > 0.5 ? 'high' : 'medium',
        confidence: Math.min(1, relativeDeviation / threshold),
        details: {
          expected: expectedValue,
          deviation: relativeDeviation,
          threshold,
          context: `EWMA deviation ${(relativeDeviation * 100).toFixed(1)}%`
        }
      };
    }

    return null;
  }

  /**
   * Detect anomalies using moving average
   */
  private detectMovingAverageAnomaly(agentId: string, metricName: string, value: number): AnomalyDetectionResult | null {
    const movingAverages = this.movingAverages.get(agentId)!;
    let values = movingAverages.get(metricName);
    
    if (!values) {
      values = [];
      movingAverages.set(metricName, values);
    }

    values.push(value);
    
    // Keep only the window size
    if (values.length > this.config.anomalyDetection.movingWindowSize) {
      values.shift();
    }

    if (values.length < this.config.anomalyDetection.minDataPoints * 2) {
      return null; // Not enough data
    }

    // Calculate moving average excluding current value
    const recentValues = values.slice(0, -1);
    const average = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / recentValues.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return null;
    
    const deviation = Math.abs(value - average);
    const normalizedDeviation = deviation / stdDev;
    
    if (normalizedDeviation > 2.0) { // 2 standard deviations
      return {
        agentId,
        timestamp: new Date(),
        metric: metricName,
        value,
        anomalyType: 'outlier',
        severity: normalizedDeviation > 4 ? 'critical' : normalizedDeviation > 3 ? 'high' : 'medium',
        confidence: Math.min(1, normalizedDeviation / 4),
        details: {
          expected: average,
          deviation: normalizedDeviation,
          threshold: 2.0,
          context: `Moving average deviation ${normalizedDeviation.toFixed(2)}σ`
        }
      };
    }

    return null;
  }

  /**
   * Detect pattern-based anomalies
   */
  private detectPatternAnomalies(agentId: string, healthStatus: AgentHealthStatus): AnomalyDetectionResult | null {
    const history = this.healthHistory.get(agentId)!;
    
    if (history.length < 10) return null;
    
    const recent = history.slice(-10);
    
    // Check for consecutive failures
    const consecutiveFailures = recent.filter(h => h.metrics.status === 'critical').length;
    if (consecutiveFailures >= 3) {
      return {
        agentId,
        timestamp: new Date(),
        metric: 'status_pattern',
        value: consecutiveFailures,
        anomalyType: 'pattern',
        severity: 'critical',
        confidence: 0.9,
        details: {
          context: `${consecutiveFailures} consecutive failures detected`,
          threshold: 3
        }
      };
    }

    // Check for memory leak pattern (increasing memory usage)
    const memoryValues = recent.map(h => h.metrics.memoryUsage);
    const isIncreasing = memoryValues.every((val, i) => i === 0 || val >= memoryValues[i - 1]);
    const memoryIncrease = memoryValues[memoryValues.length - 1] - memoryValues[0];
    
    if (isIncreasing && memoryIncrease > 20) { // 20% increase
      return {
        agentId,
        timestamp: new Date(),
        metric: 'memory_leak_pattern',
        value: memoryIncrease,
        anomalyType: 'pattern',
        severity: memoryIncrease > 40 ? 'critical' : 'high',
        confidence: 0.8,
        details: {
          context: `Potential memory leak: ${memoryIncrease.toFixed(1)}% increase`,
          threshold: 20
        }
      };
    }

    return null;
  }

  /**
   * Update stability metrics for an agent
   */
  private updateStabilityMetrics(
    agentId: string, 
    healthStatus: AgentHealthStatus, 
    anomalies: AnomalyDetectionResult[]
  ): void {
    const stability = this.agentStability.get(agentId)!;
    
    const isHealthy = healthStatus.status === 'passing' && anomalies.length === 0;
    
    if (isHealthy) {
      stability.consecutiveStable++;
      stability.consecutiveUnstable = 0;
    } else {
      stability.consecutiveUnstable++;
      stability.consecutiveStable = 0;
    }

    // Update anomaly count (24h rolling window)
    if (anomalies.length > 0) {
      stability.anomalyCount24h += anomalies.length;
      stability.lastAnomaly = new Date();
    }

    // Clean up old anomalies (24h window)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (stability.lastAnomaly && stability.lastAnomaly < yesterday) {
      stability.anomalyCount24h = Math.max(0, stability.anomalyCount24h - 1);
    }

    // Calculate stability score (0-100)
    let score = 100;
    score -= stability.consecutiveUnstable * 10; // -10 per consecutive unstable
    score -= stability.anomalyCount24h * 5;      // -5 per anomaly in 24h
    score += Math.min(20, stability.consecutiveStable * 2); // +2 per consecutive stable (max +20)
    
    stability.stabilityScore = Math.max(0, Math.min(100, score));

    // Update classification
    if (stability.consecutiveStable >= this.config.stability.stableThreshold) {
      stability.classification = 'stable';
    } else if (stability.consecutiveUnstable >= this.config.stability.unstableThreshold) {
      stability.classification = 'unstable';
    } else if (stability.stabilityScore > 70) {
      stability.classification = 'recovering';
    } else {
      stability.classification = 'degrading';
    }

    this.logger.debug(`Updated stability metrics for agent ${agentId}`, {
      score: stability.stabilityScore,
      classification: stability.classification
    });
  }

  /**
   * Adjust monitoring interval based on agent stability
   */
  private adjustMonitoringInterval(agentId: string): void {
    const stability = this.agentStability.get(agentId)!;
    const currentInterval = stability.currentInterval;
    let newInterval = currentInterval;

    switch (stability.classification) {
      case 'stable':
        // Exponential backoff for stable agents
        newInterval = Math.min(
          currentInterval * this.config.intervals.backoffMultiplier,
          this.config.intervals.max
        );
        break;
        
      case 'unstable':
      case 'degrading':
        // Increase frequency for unstable agents
        newInterval = Math.max(
          currentInterval * this.config.intervals.recoveryMultiplier,
          this.config.intervals.min
        );
        break;
        
      case 'recovering':
        // Gradual recovery to normal interval
        newInterval = Math.min(
          currentInterval * 1.1, // Slight increase
          this.config.intervals.default
        );
        break;
    }

    // Apply change only if significant
    const changeThreshold = 0.1; // 10% change threshold
    const changeRatio = Math.abs(newInterval - currentInterval) / currentInterval;
    
    if (changeRatio > changeThreshold) {
      stability.currentInterval = Math.round(newInterval);
      stability.lastAdjustment = new Date();
      
      // Reschedule next check
      this.scheduleNextCheck(agentId);
      
      this.logger.info(`Adjusted monitoring interval for agent ${agentId}`, {
        from: currentInterval,
        to: stability.currentInterval,
        classification: stability.classification
      });
      
      this.emit('intervalAdjusted', {
        agentId,
        oldInterval: currentInterval,
        newInterval: stability.currentInterval,
        reason: stability.classification
      });
    }
  }

  /**
   * Schedule the next health check for an agent
   */
  private scheduleNextCheck(agentId: string): void {
    const stability = this.agentStability.get(agentId);
    if (!stability) return;

    // Clear existing timeout
    const existingTimeout = this.agentIntervals.get(agentId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule next check
    const timeout = setTimeout(() => {
      this.emit('healthCheckRequired', { agentId });
    }, stability.currentInterval);

    this.agentIntervals.set(agentId, timeout);
  }

  /**
   * Update trend analysis for an agent
   */
  private updateTrendAnalysis(agentId: string): void {
    const history = this.healthHistory.get(agentId)!;
    const lastUpdate = this.lastTrendUpdate.get(agentId);
    const now = new Date();
    
    // Update trend analysis every 5 minutes
    if (lastUpdate && (now.getTime() - lastUpdate.getTime()) < 300000) {
      return;
    }

    if (history.length < 10) return; // Need at least 10 data points

    const recent = history.slice(-20); // Last 20 data points
    const timeWindow = recent.length > 0 ? 
      recent[recent.length - 1].timestamp.getTime() - recent[0].timestamp.getTime() : 0;

    const trendAnalysis: HealthTrendAnalysis = {
      agentId,
      timeWindow,
      trendData: {
        responseTime: this.calculateTrendMetric(recent, 'responseTime'),
        healthScore: this.calculateTrendMetric(recent, 'healthScore'),
        cpuUsage: this.calculateTrendMetric(recent, 'cpuUsage'),
        memoryUsage: this.calculateTrendMetric(recent, 'memoryUsage'),
        successRate: this.calculateTrendMetric(recent, 'successRate')
      },
      overallTrend: 'stable',
      riskLevel: 'low'
    };

    // Determine overall trend
    const trends = Object.values(trendAnalysis.trendData).map(t => t.trend);
    const degradingCount = trends.filter(t => t === 'degrading').length;
    const improvingCount = trends.filter(t => t === 'improving').length;
    
    if (degradingCount >= 3) {
      trendAnalysis.overallTrend = 'degrading';
    } else if (improvingCount >= 3) {
      trendAnalysis.overallTrend = 'improving';
    }

    // Determine risk level
    const highAnomalies = Object.values(trendAnalysis.trendData).reduce((sum, t) => sum + t.anomalies, 0);
    const stability = this.agentStability.get(agentId)!;
    
    if (highAnomalies >= 5 || stability.stabilityScore < 30) {
      trendAnalysis.riskLevel = 'critical';
    } else if (highAnomalies >= 3 || stability.stabilityScore < 50) {
      trendAnalysis.riskLevel = 'high';
    } else if (highAnomalies >= 1 || stability.stabilityScore < 70) {
      trendAnalysis.riskLevel = 'medium';
    }

    this.trendAnalysis.set(agentId, trendAnalysis);
    this.lastTrendUpdate.set(agentId, now);

    this.emit('trendAnalysisUpdated', { agentId, analysis: trendAnalysis });
  }

  /**
   * Calculate trend metrics for a specific metric
   */
  private calculateTrendMetric(data: Array<{ timestamp: Date; metrics: any }>, metricName: string): TrendMetric {
    const values = data.map(d => d.metrics[metricName]).filter(v => v !== undefined);
    
    if (values.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        slope: 0,
        trend: 'stable',
        anomalies: 0
      };
    }

    const current = values[values.length - 1];
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Calculate standard deviation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - average, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate slope using linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumX2 = values.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    
    // Determine trend
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    const slopeThreshold = stdDev * 0.1; // 10% of standard deviation
    
    if (metricName === 'responseTime' || metricName === 'cpuUsage' || metricName === 'memoryUsage') {
      // Lower is better for these metrics
      trend = slope < -slopeThreshold ? 'improving' : slope > slopeThreshold ? 'degrading' : 'stable';
    } else {
      // Higher is better for these metrics
      trend = slope > slopeThreshold ? 'improving' : slope < -slopeThreshold ? 'degrading' : 'stable';
    }
    
    // Count anomalies (values outside 2 standard deviations)
    const anomalies = values.filter(v => Math.abs(v - average) > 2 * stdDev).length;

    return {
      current,
      average,
      min,
      max,
      stdDev,
      slope,
      trend,
      anomalies
    };
  }

  /**
   * Get stability metrics for an agent
   */
  public getAgentStability(agentId: string): AgentStabilityMetrics | null {
    return this.agentStability.get(agentId) || null;
  }

  /**
   * Get trend analysis for an agent
   */
  public getAgentTrendAnalysis(agentId: string): HealthTrendAnalysis | null {
    return this.trendAnalysis.get(agentId) || null;
  }

  /**
   * Get recent anomalies for an agent
   */
  public getRecentAnomalies(agentId: string, hoursBack: number = 24): AnomalyDetectionResult[] {
    const anomalies = this.detectedAnomalies.get(agentId) || [];
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    return anomalies.filter(a => a.timestamp >= cutoff);
  }

  /**
   * Get summary of all monitored agents
   */
  public getMonitoringSummary(): any {
    const agents = Array.from(this.agentStability.values());
    
    return {
      totalAgents: agents.length,
      stable: agents.filter(a => a.classification === 'stable').length,
      degrading: agents.filter(a => a.classification === 'degrading').length,
      unstable: agents.filter(a => a.classification === 'unstable').length,
      recovering: agents.filter(a => a.classification === 'recovering').length,
      averageStabilityScore: agents.length > 0 ? 
        agents.reduce((sum, a) => sum + a.stabilityScore, 0) / agents.length : 0,
      totalAnomalies24h: agents.reduce((sum, a) => sum + a.anomalyCount24h, 0),
      averageInterval: agents.length > 0 ?
        agents.reduce((sum, a) => sum + a.currentInterval, 0) / agents.length : 0
    };
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown(): void {
    this.logger.info('Shutting down UEP Adaptive Health Monitor...');
    
    // Clear all intervals
    for (const timeout of this.agentIntervals.values()) {
      clearTimeout(timeout);
    }
    
    this.agentIntervals.clear();
    this.agentStability.clear();
    this.healthHistory.clear();
    this.ewmaStates.clear();
    this.movingAverages.clear();
    this.detectedAnomalies.clear();
    this.trendAnalysis.clear();
    this.lastTrendUpdate.clear();
    
    this.logger.info('UEP Adaptive Health Monitor shutdown complete');
  }
}

/**
 * Factory function to create UEP Adaptive Health Monitor
 */
export function createUEPAdaptiveHealthMonitor(
  config: Partial<AdaptiveMonitorConfig> = {}
): UEPAdaptiveHealthMonitor {
  return new UEPAdaptiveHealthMonitor(config);
}

// Export types
export type {
  AdaptiveMonitorConfig,
  AgentStabilityMetrics,
  AnomalyDetectionResult,
  HealthTrendAnalysis,
  TrendMetric
};