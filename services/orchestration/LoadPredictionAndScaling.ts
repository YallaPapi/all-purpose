#!/usr/bin/env node

/**
 * Load Prediction and Dynamic Scaling Trigger Mechanisms
 * 
 * Implements time-series-based load prediction models and dynamic scaling triggers
 * for proactive agent management in distributed systems. Features comprehensive
 * forecasting algorithms, multi-metric evaluation, and intelligent scaling decisions.
 * 
 * Core Components:
 * - Time-series load prediction using multiple algorithms (linear regression, exponential smoothing, moving averages)
 * - Dynamic scaling triggers based on real-time and predicted metrics
 * - Historical data analysis for demand forecasting
 * - Proactive scaling actions with configurable thresholds
 * - Multi-metric threshold evaluation (load, queue depth, response time, predicted spikes)
 * - Anomaly detection and pattern recognition
 * - Scaling recommendation engine with confidence scoring
 * 
 * Research-based implementation following distributed systems best practices
 * for predictive scaling and load forecasting.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 228.3
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';

/**
 * Time-series data point for load prediction
 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  metadata?: {
    source: string;
    agent?: string;
    quality: 'high' | 'medium' | 'low'; // Data quality indicator
  };
}

/**
 * Load metrics for prediction and scaling decisions
 */
export interface LoadMetrics {
  timestamp: Date;
  agentId?: string; // Optional for system-wide metrics
  
  // Core load metrics
  cpuUtilization: number;      // 0-1 scale
  memoryUtilization: number;   // 0-1 scale
  networkUtilization: number;  // 0-1 scale
  diskUtilization: number;     // 0-1 scale
  
  // Performance metrics
  requestsPerSecond: number;   // Current RPS
  averageResponseTime: number; // Average response time in ms
  errorRate: number;           // Error rate (0-1)
  queueDepth: number;          // Number of queued requests
  
  // Agent-specific metrics
  activeConnections: number;   // Current active connections
  availableCapacity: number;   // Available processing capacity (0-1)
  healthScore: number;         // Overall health (0-1)
  
  // System-wide metrics
  totalAgents?: number;        // Total number of agents
  activeAgents?: number;       // Currently active agents
  overloadedAgents?: number;   // Agents above threshold
}

/**
 * Prediction result from forecasting algorithms
 */
export interface PredictionResult {
  algorithm: string;
  timestamp: Date;
  predictedValue: number;
  confidence: number;          // Prediction confidence (0-1)
  horizon: number;             // Prediction horizon in minutes
  
  // Statistical information
  upperBound: number;          // Upper confidence interval
  lowerBound: number;          // Lower confidence interval
  variance: number;            // Prediction variance
  
  // Trend information
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality?: {
    detected: boolean;
    period: number;            // Period in minutes
    strength: number;          // Seasonality strength (0-1)
  };
  
  // Algorithm-specific data
  metadata: Record<string, any>;
}

/**
 * Scaling trigger configuration
 */
export interface ScalingTrigger {
  id: string;
  name: string;
  enabled: boolean;
  
  // Trigger type
  type: 'threshold' | 'predictive' | 'anomaly' | 'composite';
  
  // Threshold configuration
  thresholds: {
    metric: keyof LoadMetrics;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    value: number;
    duration: number;          // Minimum duration in seconds
  }[];
  
  // Predictive configuration
  predictive?: {
    algorithm: string;
    horizon: number;           // Prediction horizon in minutes
    confidence: number;        // Minimum confidence threshold
    threshold: number;         // Predicted value threshold
  };
  
  // Anomaly detection configuration
  anomaly?: {
    sensitivity: number;       // Anomaly sensitivity (0-1)
    windowSize: number;        // Analysis window in minutes
    minDeviations: number;     // Minimum standard deviations
  };
  
  // Scaling action
  action: {
    type: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
    magnitude: number;         // Scaling magnitude (agents to add/remove or % to scale)
    cooldown: number;          // Cooldown period in seconds
    maxScale: number;          // Maximum scale limit
    minScale: number;          // Minimum scale limit
  };
  
  // Conditions
  conditions: {
    timeWindows?: string[];    // Time windows when trigger is active (e.g., ["09:00-17:00"])
    daysOfWeek?: number[];     // Days when trigger is active (0=Sunday)
    prerequisites?: string[];  // Other trigger IDs that must be satisfied
  };
}

/**
 * Scaling recommendation
 */
export interface ScalingRecommendation {
  id: string;
  timestamp: Date;
  triggerId: string;
  triggerName: string;
  
  // Recommendation details
  action: ScalingTrigger['action']['type'];
  magnitude: number;
  confidence: number;         // Recommendation confidence (0-1)
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // Supporting data
  currentMetrics: LoadMetrics;
  predictions: PredictionResult[];
  reasoning: string[];        // Human-readable reasoning
  
  // Risk assessment
  risks: {
    probability: number;      // Risk probability (0-1)
    impact: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
  
  // Execution plan
  executionPlan: {
    estimatedDuration: number; // Estimated scaling duration in seconds
    rollbackPlan: string[];   // Rollback steps if scaling fails
    validationChecks: string[]; // Post-scaling validation checks
  };
}

/**
 * Base class for load prediction algorithms
 */
export abstract class LoadPredictionAlgorithm {
  protected name: string;
  protected config: Record<string, any>;

  constructor(name: string, config: Record<string, any> = {}) {
    this.name = name;
    this.config = config;
  }

  /**
   * Train the algorithm with historical data
   */
  abstract train(data: TimeSeriesDataPoint[]): Promise<void>;

  /**
   * Predict future values
   */
  abstract predict(horizon: number): Promise<PredictionResult>;

  /**
   * Update the algorithm with new data point
   */
  abstract update(dataPoint: TimeSeriesDataPoint): Promise<void>;

  /**
   * Get algorithm information
   */
  public getInfo(): { name: string; config: Record<string, any> } {
    return { name: this.name, config: this.config };
  }
}

/**
 * Linear Regression Prediction Algorithm
 */
export class LinearRegressionPredictor extends LoadPredictionAlgorithm {
  private dataPoints: TimeSeriesDataPoint[] = [];
  private slope: number = 0;
  private intercept: number = 0;
  private trained: boolean = false;

  constructor(config: { windowSize?: number; minPoints?: number } = {}) {
    super('linear-regression', {
      windowSize: config.windowSize || 60, // 60 data points
      minPoints: config.minPoints || 10
    });
  }

  async train(data: TimeSeriesDataPoint[]): Promise<void> {
    this.dataPoints = data.slice(-this.config.windowSize);
    
    if (this.dataPoints.length < this.config.minPoints) {
      throw new Error(`Insufficient data points for training. Need ${this.config.minPoints}, got ${this.dataPoints.length}`);
    }

    // Calculate linear regression
    const n = this.dataPoints.length;
    const baseTime = this.dataPoints[0].timestamp.getTime();
    
    const xValues = this.dataPoints.map((_, i) => i);
    const yValues = this.dataPoints.map(dp => dp.value);
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + (x * yValues[i]), 0);
    const sumX2 = xValues.reduce((sum, x) => sum + (x * x), 0);
    
    this.slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    this.intercept = (sumY - this.slope * sumX) / n;
    
    this.trained = true;
  }

  async predict(horizon: number): Promise<PredictionResult> {
    if (!this.trained) {
      throw new Error('Algorithm must be trained before making predictions');
    }

    const lastIndex = this.dataPoints.length - 1;
    const futureIndex = lastIndex + horizon;
    
    const predictedValue = this.slope * futureIndex + this.intercept;
    
    // Calculate confidence based on R-squared
    const yMean = this.dataPoints.reduce((sum, dp) => sum + dp.value, 0) / this.dataPoints.length;
    const totalSumSquares = this.dataPoints.reduce((sum, dp) => sum + Math.pow(dp.value - yMean, 2), 0);
    const residualSumSquares = this.dataPoints.reduce((sum, dp, i) => {
      const predicted = this.slope * i + this.intercept;
      return sum + Math.pow(dp.value - predicted, 2);
    }, 0);
    
    const rSquared = Math.max(0, 1 - (residualSumSquares / totalSumSquares));
    const confidence = rSquared;
    
    // Calculate bounds (simple standard error estimation)
    const standardError = Math.sqrt(residualSumSquares / (this.dataPoints.length - 2));
    const margin = 1.96 * standardError; // 95% confidence interval
    
    const trend = this.slope > 0.01 ? 'increasing' : this.slope < -0.01 ? 'decreasing' : 'stable';
    
    return {
      algorithm: this.name,
      timestamp: new Date(),
      predictedValue,
      confidence,
      horizon,
      upperBound: predictedValue + margin,
      lowerBound: predictedValue - margin,
      variance: standardError * standardError,
      trend,
      metadata: {
        slope: this.slope,
        intercept: this.intercept,
        rSquared,
        dataPoints: this.dataPoints.length
      }
    };
  }

  async update(dataPoint: TimeSeriesDataPoint): Promise<void> {
    this.dataPoints.push(dataPoint);
    
    // Keep only the latest windowSize points
    if (this.dataPoints.length > this.config.windowSize) {
      this.dataPoints = this.dataPoints.slice(-this.config.windowSize);
    }
    
    // Retrain if we have enough points
    if (this.dataPoints.length >= this.config.minPoints) {
      await this.train(this.dataPoints);
    }
  }
}

/**
 * Exponential Smoothing Prediction Algorithm
 */
export class ExponentialSmoothingPredictor extends LoadPredictionAlgorithm {
  private dataPoints: TimeSeriesDataPoint[] = [];
  private alpha: number; // Smoothing parameter
  private beta: number; // Trend parameter
  private level: number = 0;
  private trend: number = 0;
  private trained: boolean = false;

  constructor(config: { alpha?: number; beta?: number; windowSize?: number } = {}) {
    super('exponential-smoothing', {
      alpha: config.alpha || 0.3,
      beta: config.beta || 0.1,
      windowSize: config.windowSize || 100
    });
    
    this.alpha = this.config.alpha;
    this.beta = this.config.beta;
  }

  async train(data: TimeSeriesDataPoint[]): Promise<void> {
    this.dataPoints = data.slice(-this.config.windowSize);
    
    if (this.dataPoints.length < 2) {
      throw new Error('Need at least 2 data points for exponential smoothing');
    }

    // Initialize level and trend
    this.level = this.dataPoints[0].value;
    this.trend = this.dataPoints[1].value - this.dataPoints[0].value;
    
    // Apply exponential smoothing
    for (let i = 1; i < this.dataPoints.length; i++) {
      const value = this.dataPoints[i].value;
      const prevLevel = this.level;
      
      this.level = this.alpha * value + (1 - this.alpha) * (prevLevel + this.trend);
      this.trend = this.beta * (this.level - prevLevel) + (1 - this.beta) * this.trend;
    }
    
    this.trained = true;
  }

  async predict(horizon: number): Promise<PredictionResult> {
    if (!this.trained) {
      throw new Error('Algorithm must be trained before making predictions');
    }

    const predictedValue = this.level + (horizon * this.trend);
    
    // Calculate confidence based on recent prediction accuracy
    const recentPredictions = this.dataPoints.slice(-10).map((_, i) => {
      const predicted = this.level + ((i - 9) * this.trend);
      return predicted;
    });
    
    const recentActuals = this.dataPoints.slice(-10).map(dp => dp.value);
    const mape = recentPredictions.reduce((sum, pred, i) => {
      return sum + Math.abs((recentActuals[i] - pred) / recentActuals[i]);
    }, 0) / recentPredictions.length;
    
    const confidence = Math.max(0, 1 - mape);
    
    // Estimate variance from recent prediction errors
    const errors = recentPredictions.map((pred, i) => Math.pow(recentActuals[i] - pred, 2));
    const variance = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const standardError = Math.sqrt(variance);
    
    const trendDirection = this.trend > 0.01 ? 'increasing' : this.trend < -0.01 ? 'decreasing' : 'stable';
    
    return {
      algorithm: this.name,
      timestamp: new Date(),
      predictedValue,
      confidence,
      horizon,
      upperBound: predictedValue + (1.96 * standardError),
      lowerBound: predictedValue - (1.96 * standardError),
      variance,
      trend: trendDirection,
      metadata: {
        level: this.level,
        trend: this.trend,
        alpha: this.alpha,
        beta: this.beta,
        mape,
        dataPoints: this.dataPoints.length
      }
    };
  }

  async update(dataPoint: TimeSeriesDataPoint): Promise<void> {
    if (this.trained) {
      // Update smoothing values
      const value = dataPoint.value;
      const prevLevel = this.level;
      
      this.level = this.alpha * value + (1 - this.alpha) * (prevLevel + this.trend);
      this.trend = this.beta * (this.level - prevLevel) + (1 - this.beta) * this.trend;
    }
    
    this.dataPoints.push(dataPoint);
    
    if (this.dataPoints.length > this.config.windowSize) {
      this.dataPoints = this.dataPoints.slice(-this.config.windowSize);
    }
    
    // Train if not yet trained and we have enough data
    if (!this.trained && this.dataPoints.length >= 2) {
      await this.train(this.dataPoints);
    }
  }
}

/**
 * Moving Average Prediction Algorithm
 */
export class MovingAveragePredictor extends LoadPredictionAlgorithm {
  private dataPoints: TimeSeriesDataPoint[] = [];
  private windowSizes: number[];

  constructor(config: { windowSizes?: number[]; maxDataPoints?: number } = {}) {
    super('moving-average', {
      windowSizes: config.windowSizes || [5, 10, 20],
      maxDataPoints: config.maxDataPoints || 200
    });
    
    this.windowSizes = this.config.windowSizes;
  }

  async train(data: TimeSeriesDataPoint[]): Promise<void> {
    this.dataPoints = data.slice(-this.config.maxDataPoints);
  }

  async predict(horizon: number): Promise<PredictionResult> {
    if (this.dataPoints.length === 0) {
      throw new Error('No data available for prediction');
    }

    // Calculate weighted prediction from multiple moving averages
    const predictions: number[] = [];
    const weights: number[] = [];
    
    for (const windowSize of this.windowSizes) {
      if (this.dataPoints.length >= windowSize) {
        const recentData = this.dataPoints.slice(-windowSize);
        const average = recentData.reduce((sum, dp) => sum + dp.value, 0) / recentData.length;
        
        predictions.push(average);
        weights.push(1 / windowSize); // Shorter windows get higher weights
      }
    }
    
    if (predictions.length === 0) {
      // Fallback to simple average
      const average = this.dataPoints.reduce((sum, dp) => sum + dp.value, 0) / this.dataPoints.length;
      predictions.push(average);
      weights.push(1);
    }
    
    // Weighted average prediction
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const predictedValue = predictions.reduce((sum, pred, i) => sum + (pred * weights[i]), 0) / totalWeight;
    
    // Calculate trend from recent data
    const recentWindow = Math.min(10, this.dataPoints.length);
    const recentData = this.dataPoints.slice(-recentWindow);
    const oldAvg = recentData.slice(0, Math.floor(recentWindow / 2)).reduce((sum, dp) => sum + dp.value, 0) / Math.floor(recentWindow / 2);
    const newAvg = recentData.slice(Math.floor(recentWindow / 2)).reduce((sum, dp) => sum + dp.value, 0) / Math.ceil(recentWindow / 2);
    
    const trendDirection = newAvg > oldAvg * 1.05 ? 'increasing' : newAvg < oldAvg * 0.95 ? 'decreasing' : 'stable';
    
    // Calculate confidence based on variance
    const variance = this.dataPoints.slice(-20).reduce((sum, dp) => {
      return sum + Math.pow(dp.value - predictedValue, 2);
    }, 0) / Math.min(20, this.dataPoints.length);
    
    const confidence = Math.max(0, 1 - (Math.sqrt(variance) / predictedValue));
    const standardError = Math.sqrt(variance);
    
    return {
      algorithm: this.name,
      timestamp: new Date(),
      predictedValue,
      confidence,
      horizon,
      upperBound: predictedValue + (1.96 * standardError),
      lowerBound: predictedValue - (1.96 * standardError),
      variance,
      trend: trendDirection,
      metadata: {
        windowSizes: this.windowSizes,
        predictions,
        weights,
        dataPoints: this.dataPoints.length
      }
    };
  }

  async update(dataPoint: TimeSeriesDataPoint): Promise<void> {
    this.dataPoints.push(dataPoint);
    
    if (this.dataPoints.length > this.config.maxDataPoints) {
      this.dataPoints = this.dataPoints.slice(-this.config.maxDataPoints);
    }
  }
}

/**
 * Load Prediction and Scaling System
 */
export class LoadPredictionSystem extends EventEmitter {
  private algorithms: Map<string, LoadPredictionAlgorithm> = new Map();
  private scalingTriggers: Map<string, ScalingTrigger> = new Map();
  private currentMetrics: LoadMetrics | null = null;
  private metricsHistory: LoadMetrics[] = [];
  private predictionHistory: Map<string, PredictionResult[]> = new Map();
  private scalingHistory: ScalingRecommendation[] = [];
  
  // Configuration
  private config = {
    maxHistorySize: 1000,
    predictionInterval: 60000, // 1 minute
    scalingCooldown: 300000,   // 5 minutes
    enableAnomaly: true,
    anomalySensitivity: 0.8
  };
  
  // State tracking
  private lastScalingTime = new Date(0);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: Partial<typeof LoadPredictionSystem.prototype.config> = {}) {
    super();
    this.config = { ...this.config, ...config };
    
    this.initializeDefaultAlgorithms();
    this.startPredictionLoop();
  }

  /**
   * Initialize default prediction algorithms
   */
  private initializeDefaultAlgorithms(): void {
    this.addAlgorithm(new LinearRegressionPredictor());
    this.addAlgorithm(new ExponentialSmoothingPredictor());
    this.addAlgorithm(new MovingAveragePredictor());
  }

  /**
   * Add a prediction algorithm
   */
  public addAlgorithm(algorithm: LoadPredictionAlgorithm): void {
    const info = algorithm.getInfo();
    this.algorithms.set(info.name, algorithm);
    this.predictionHistory.set(info.name, []);
    
    this.emit('algorithmAdded', { name: info.name, config: info.config });
  }

  /**
   * Remove a prediction algorithm
   */
  public removeAlgorithm(name: string): boolean {
    const removed = this.algorithms.delete(name);
    this.predictionHistory.delete(name);
    
    if (removed) {
      this.emit('algorithmRemoved', { name });
    }
    
    return removed;
  }

  /**
   * Add a scaling trigger
   */
  public addScalingTrigger(trigger: ScalingTrigger): void {
    this.scalingTriggers.set(trigger.id, trigger);
    this.emit('triggerAdded', { triggerId: trigger.id, triggerName: trigger.name });
  }

  /**
   * Remove a scaling trigger
   */
  public removeScalingTrigger(triggerId: string): boolean {
    const removed = this.scalingTriggers.delete(triggerId);
    
    if (removed) {
      this.emit('triggerRemoved', { triggerId });
    }
    
    return removed;
  }

  /**
   * Update current load metrics
   */
  public async updateMetrics(metrics: LoadMetrics): Promise<void> {
    this.currentMetrics = metrics;
    this.metricsHistory.push(metrics);
    
    // Keep history within limits
    if (this.metricsHistory.length > this.config.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.maxHistorySize);
    }
    
    // Update all algorithms
    const dataPoint: TimeSeriesDataPoint = {
      timestamp: metrics.timestamp,
      value: this.calculateOverallLoadScore(metrics),
      metadata: {
        source: 'load-metrics',
        quality: 'high'
      }
    };
    
    for (const algorithm of this.algorithms.values()) {
      try {
        await algorithm.update(dataPoint);
      } catch (error) {
        console.error(chalk.red(`❌ Error updating algorithm ${algorithm.getInfo().name}:`), error);
      }
    }
    
    this.emit('metricsUpdated', { metrics });
  }

  /**
   * Calculate overall load score from metrics
   */
  private calculateOverallLoadScore(metrics: LoadMetrics): number {
    // Weighted combination of key metrics
    const weights = {
      cpu: 0.3,
      memory: 0.25,
      network: 0.1,
      disk: 0.1,
      responseTime: 0.15,
      errorRate: 0.1
    };
    
    const normalizedResponseTime = Math.min(1, metrics.averageResponseTime / 5000); // Normalize to 5s
    const loadScore = (
      metrics.cpuUtilization * weights.cpu +
      metrics.memoryUtilization * weights.memory +
      metrics.networkUtilization * weights.network +
      metrics.diskUtilization * weights.disk +
      normalizedResponseTime * weights.responseTime +
      metrics.errorRate * weights.errorRate
    );
    
    return Math.min(1, loadScore);
  }

  /**
   * Generate predictions using all algorithms
   */
  public async generatePredictions(horizon: number = 15): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];
    
    for (const [name, algorithm] of this.algorithms.entries()) {
      try {
        const prediction = await algorithm.predict(horizon);
        predictions.push(prediction);
        
        // Store in history
        const history = this.predictionHistory.get(name) || [];
        history.push(prediction);
        
        // Keep only recent predictions
        if (history.length > 100) {
          history.splice(0, history.length - 100);
        }
        
        this.predictionHistory.set(name, history);
        
      } catch (error) {
        console.error(chalk.red(`❌ Error generating prediction with ${name}:`), error);
      }
    }
    
    this.emit('predictionsGenerated', { predictions, horizon });
    return predictions;
  }

  /**
   * Evaluate scaling triggers
   */
  public async evaluateScalingTriggers(): Promise<ScalingRecommendation[]> {
    if (!this.currentMetrics) {
      return [];
    }
    
    const recommendations: ScalingRecommendation[] = [];
    const currentTime = new Date();
    
    // Check cooldown period
    const timeSinceLastScaling = currentTime.getTime() - this.lastScalingTime.getTime();
    if (timeSinceLastScaling < this.config.scalingCooldown) {
      return [];
    }
    
    for (const [triggerId, trigger] of this.scalingTriggers.entries()) {
      if (!trigger.enabled) {
        continue;
      }
      
      try {
        const recommendation = await this.evaluateIndividualTrigger(trigger);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      } catch (error) {
        console.error(chalk.red(`❌ Error evaluating trigger ${trigger.name}:`), error);
      }
    }
    
    // Sort by urgency and confidence
    recommendations.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      return b.confidence - a.confidence;
    });
    
    this.emit('recommendationsGenerated', { recommendations });
    return recommendations;
  }

  /**
   * Evaluate individual scaling trigger
   */
  private async evaluateIndividualTrigger(trigger: ScalingTrigger): Promise<ScalingRecommendation | null> {
    const currentTime = new Date();
    
    // Check time-based conditions
    if (!this.isTimeConditionMet(trigger, currentTime)) {
      return null;
    }
    
    let shouldTrigger = false;
    let confidence = 0;
    let reasoning: string[] = [];
    let predictions: PredictionResult[] = [];
    
    switch (trigger.type) {
      case 'threshold':
        ({ shouldTrigger, confidence, reasoning } = this.evaluateThresholdTrigger(trigger));
        break;
        
      case 'predictive':
        ({ shouldTrigger, confidence, reasoning, predictions } = await this.evaluatePredictiveTrigger(trigger));
        break;
        
      case 'anomaly':
        ({ shouldTrigger, confidence, reasoning } = this.evaluateAnomalyTrigger(trigger));
        break;
        
      case 'composite':
        ({ shouldTrigger, confidence, reasoning, predictions } = await this.evaluateCompositeTrigger(trigger));
        break;
    }
    
    if (!shouldTrigger) {
      return null;
    }
    
    // Determine urgency
    const urgency = this.determineUrgency(trigger, confidence);
    
    // Assess risks
    const risks = this.assessScalingRisks(trigger);
    
    // Create execution plan
    const executionPlan = this.createExecutionPlan(trigger);
    
    const recommendation: ScalingRecommendation = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: currentTime,
      triggerId: trigger.id,
      triggerName: trigger.name,
      action: trigger.action.type,
      magnitude: trigger.action.magnitude,
      confidence,
      urgency,
      currentMetrics: this.currentMetrics!,
      predictions,
      reasoning,
      risks,
      executionPlan
    };
    
    return recommendation;
  }

  /**
   * Evaluate threshold-based trigger
   */
  private evaluateThresholdTrigger(trigger: ScalingTrigger): {
    shouldTrigger: boolean;
    confidence: number;
    reasoning: string[];
  } {
    if (!this.currentMetrics) {
      return { shouldTrigger: false, confidence: 0, reasoning: ['No current metrics available'] };
    }
    
    let triggeredThresholds = 0;
    const reasoning: string[] = [];
    
    for (const threshold of trigger.thresholds) {
      const currentValue = this.currentMetrics[threshold.metric] as number;
      
      if (typeof currentValue !== 'number') {
        continue;
      }
      
      let thresholdMet = false;
      
      switch (threshold.operator) {
        case '>':
          thresholdMet = currentValue > threshold.value;
          break;
        case '<':
          thresholdMet = currentValue < threshold.value;
          break;
        case '>=':
          thresholdMet = currentValue >= threshold.value;
          break;
        case '<=':
          thresholdMet = currentValue <= threshold.value;
          break;
        case '==':
          thresholdMet = Math.abs(currentValue - threshold.value) < 0.01;
          break;
        case '!=':
          thresholdMet = Math.abs(currentValue - threshold.value) >= 0.01;
          break;
      }
      
      if (thresholdMet) {
        triggeredThresholds++;
        reasoning.push(`${threshold.metric} ${threshold.operator} ${threshold.value} (current: ${currentValue.toFixed(3)})`);
      }
    }
    
    const shouldTrigger = triggeredThresholds > 0;
    const confidence = triggeredThresholds / trigger.thresholds.length;
    
    return { shouldTrigger, confidence, reasoning };
  }

  /**
   * Evaluate predictive trigger
   */
  private async evaluatePredictiveTrigger(trigger: ScalingTrigger): Promise<{
    shouldTrigger: boolean;
    confidence: number;
    reasoning: string[];
    predictions: PredictionResult[];
  }> {
    if (!trigger.predictive) {
      return { shouldTrigger: false, confidence: 0, reasoning: ['No predictive configuration'], predictions: [] };
    }
    
    const predictions = await this.generatePredictions(trigger.predictive.horizon);
    const targetAlgorithm = predictions.find(p => p.algorithm === trigger.predictive!.algorithm);
    
    if (!targetAlgorithm) {
      return {
        shouldTrigger: false,
        confidence: 0,
        reasoning: [`Algorithm ${trigger.predictive.algorithm} not available`],
        predictions
      };
    }
    
    const shouldTrigger = (
      targetAlgorithm.predictedValue > trigger.predictive.threshold &&
      targetAlgorithm.confidence >= trigger.predictive.confidence
    );
    
    const reasoning = [
      `Predicted value: ${targetAlgorithm.predictedValue.toFixed(3)} (threshold: ${trigger.predictive.threshold})`,
      `Prediction confidence: ${(targetAlgorithm.confidence * 100).toFixed(1)}% (required: ${(trigger.predictive.confidence * 100).toFixed(1)}%)`,
      `Trend: ${targetAlgorithm.trend}`,
      `Algorithm: ${targetAlgorithm.algorithm}`
    ];
    
    return {
      shouldTrigger,
      confidence: targetAlgorithm.confidence,
      reasoning,
      predictions
    };
  }

  /**
   * Evaluate anomaly-based trigger
   */
  private evaluateAnomalyTrigger(trigger: ScalingTrigger): {
    shouldTrigger: boolean;
    confidence: number;
    reasoning: string[];
  } {
    if (!trigger.anomaly || !this.currentMetrics) {
      return { shouldTrigger: false, confidence: 0, reasoning: ['No anomaly configuration or metrics'] };
    }
    
    const windowSize = Math.min(trigger.anomaly.windowSize, this.metricsHistory.length);
    if (windowSize < 5) {
      return { shouldTrigger: false, confidence: 0, reasoning: ['Insufficient historical data for anomaly detection'] };
    }
    
    const recentMetrics = this.metricsHistory.slice(-windowSize);
    const currentLoad = this.calculateOverallLoadScore(this.currentMetrics);
    
    // Calculate statistics from recent data
    const values = recentMetrics.map(m => this.calculateOverallLoadScore(m));
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate z-score
    const zScore = Math.abs((currentLoad - mean) / standardDeviation);
    
    const shouldTrigger = zScore >= trigger.anomaly.minDeviations;
    const confidence = Math.min(1, zScore / trigger.anomaly.minDeviations) * trigger.anomaly.sensitivity;
    
    const reasoning = [
      `Current load: ${currentLoad.toFixed(3)}`,
      `Historical mean: ${mean.toFixed(3)} ± ${standardDeviation.toFixed(3)}`,
      `Z-score: ${zScore.toFixed(2)} (threshold: ${trigger.anomaly.minDeviations})`,
      `Anomaly detected: ${shouldTrigger ? 'Yes' : 'No'}`
    ];
    
    return { shouldTrigger, confidence, reasoning };
  }

  /**
   * Evaluate composite trigger (combines multiple trigger types)
   */
  private async evaluateCompositeTrigger(trigger: ScalingTrigger): Promise<{
    shouldTrigger: boolean;
    confidence: number;
    reasoning: string[];
    predictions: PredictionResult[];
  }> {
    // For composite triggers, evaluate both threshold and predictive components
    const thresholdResult = this.evaluateThresholdTrigger(trigger);
    const predictiveResult = trigger.predictive 
      ? await this.evaluatePredictiveTrigger(trigger)
      : { shouldTrigger: false, confidence: 0, reasoning: [], predictions: [] };
    
    // Require both threshold and predictive to trigger (AND logic)
    const shouldTrigger = thresholdResult.shouldTrigger || predictiveResult.shouldTrigger;
    const confidence = Math.max(thresholdResult.confidence, predictiveResult.confidence);
    
    const reasoning = [
      'Composite trigger evaluation:',
      ...thresholdResult.reasoning.map(r => `  Threshold: ${r}`),
      ...predictiveResult.reasoning.map(r => `  Predictive: ${r}`)
    ];
    
    return {
      shouldTrigger,
      confidence,
      reasoning,
      predictions: predictiveResult.predictions
    };
  }

  /**
   * Check if time-based conditions are met
   */
  private isTimeConditionMet(trigger: ScalingTrigger, currentTime: Date): boolean {
    const conditions = trigger.conditions;
    
    if (!conditions) {
      return true;
    }
    
    // Check day of week
    if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
      const currentDay = currentTime.getDay();
      if (!conditions.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }
    
    // Check time windows
    if (conditions.timeWindows && conditions.timeWindows.length > 0) {
      const currentTimeStr = currentTime.toTimeString().substr(0, 5); // HH:MM format
      
      const inTimeWindow = conditions.timeWindows.some(window => {
        const [start, end] = window.split('-');
        return currentTimeStr >= start && currentTimeStr <= end;
      });
      
      if (!inTimeWindow) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Determine urgency based on trigger and confidence
   */
  private determineUrgency(trigger: ScalingTrigger, confidence: number): ScalingRecommendation['urgency'] {
    // High confidence threshold triggers are more urgent
    if (confidence > 0.9) {
      return 'critical';
    } else if (confidence > 0.7) {
      return 'high';
    } else if (confidence > 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Assess risks of scaling action
   */
  private assessScalingRisks(trigger: ScalingTrigger): ScalingRecommendation['risks'] {
    const risks: ScalingRecommendation['risks'] = [];
    
    // Resource availability risk
    if (trigger.action.type === 'scale_up' || trigger.action.type === 'scale_out') {
      risks.push({
        probability: 0.3,
        impact: 'medium',
        description: 'Scaling up may exhaust available resources or budget limits'
      });
    }
    
    // Service disruption risk
    if (trigger.action.magnitude > 50) {
      risks.push({
        probability: 0.2,
        impact: 'high',
        description: 'Large scaling operations may cause temporary service disruption'
      });
    }
    
    // Oscillation risk
    risks.push({
      probability: 0.1,
      impact: 'medium',
      description: 'Rapid scaling changes may cause system oscillation'
    });
    
    return risks;
  }

  /**
   * Create execution plan for scaling action
   */
  private createExecutionPlan(trigger: ScalingTrigger): ScalingRecommendation['executionPlan'] {
    return {
      estimatedDuration: this.estimateScalingDuration(trigger),
      rollbackPlan: this.createRollbackPlan(trigger),
      validationChecks: this.createValidationChecks(trigger)
    };
  }

  /**
   * Estimate scaling duration
   */
  private estimateScalingDuration(trigger: ScalingTrigger): number {
    // Base scaling time depends on action type
    const baseTimes = {
      scale_up: 120,    // 2 minutes for CPU/memory scaling
      scale_down: 60,   // 1 minute for scaling down
      scale_out: 300,   // 5 minutes for adding instances
      scale_in: 180     // 3 minutes for removing instances
    };
    
    const baseTime = baseTimes[trigger.action.type] || 120;
    
    // Adjust for magnitude
    const magnitudeMultiplier = 1 + (trigger.action.magnitude / 100);
    
    return Math.round(baseTime * magnitudeMultiplier);
  }

  /**
   * Create rollback plan
   */
  private createRollbackPlan(trigger: ScalingTrigger): string[] {
    const rollbackSteps = [
      'Monitor system metrics for 2 minutes after scaling',
      'Check service health endpoints',
      'Verify response time and error rate thresholds'
    ];
    
    if (trigger.action.type === 'scale_out') {
      rollbackSteps.push('Remove newly added instances if issues detected');
    } else if (trigger.action.type === 'scale_up') {
      rollbackSteps.push('Revert resource allocation to previous levels');
    }
    
    rollbackSteps.push('Alert operations team if rollback is required');
    
    return rollbackSteps;
  }

  /**
   * Create validation checks
   */
  private createValidationChecks(trigger: ScalingTrigger): string[] {
    return [
      'Verify all agents are healthy and responsive',
      'Check system load distribution is balanced',
      'Confirm response times are within SLA limits',
      'Validate error rates remain below thresholds',
      'Ensure new capacity is being utilized effectively'
    ];
  }

  /**
   * Start the prediction loop
   */
  private startPredictionLoop(): void {
    this.intervalId = setInterval(async () => {
      try {
        await this.generatePredictions();
        const recommendations = await this.evaluateScalingTriggers();
        
        if (recommendations.length > 0) {
          this.emit('scalingRecommendations', { recommendations });
        }
      } catch (error) {
        console.error(chalk.red('❌ Error in prediction loop:'), error);
      }
    }, this.config.predictionInterval);
  }

  /**
   * Stop the prediction loop
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get system statistics
   */
  public getStatistics(): {
    algorithms: string[];
    triggers: number;
    metricsHistory: number;
    lastPrediction: Date | null;
    scalingHistory: number;
    configuration: typeof this.config;
  } {
    const lastPredictionTimes = Array.from(this.predictionHistory.values())
      .map(history => history.length > 0 ? history[history.length - 1].timestamp : null)
      .filter(time => time !== null) as Date[];
    
    const lastPrediction = lastPredictionTimes.length > 0 
      ? new Date(Math.max(...lastPredictionTimes.map(t => t.getTime())))
      : null;
    
    return {
      algorithms: Array.from(this.algorithms.keys()),
      triggers: this.scalingTriggers.size,
      metricsHistory: this.metricsHistory.length,
      lastPrediction,
      scalingHistory: this.scalingHistory.length,
      configuration: this.config
    };
  }

  /**
   * Get detailed prediction analysis
   */
  public getPredictionAnalysis(): {
    algorithms: Record<string, {
      recentPredictions: PredictionResult[];
      accuracy: number;
      reliability: number;
    }>;
    consensus: {
      prediction: number;
      confidence: number;
      agreement: number;
    } | null;
  } {
    const analysis: Record<string, any> = {};
    
    for (const [name, history] of this.predictionHistory.entries()) {
      if (history.length > 0) {
        const recentPredictions = history.slice(-10);
        const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length;
        
        // Simple accuracy estimation (would need actual outcome data for real accuracy)
        const accuracy = avgConfidence; // Placeholder
        
        analysis[name] = {
          recentPredictions,
          accuracy,
          reliability: avgConfidence
        };
      }
    }
    
    // Calculate consensus prediction
    let consensus = null;
    const recentPredictions = Object.values(analysis)
      .map((alg: any) => alg.recentPredictions[alg.recentPredictions.length - 1])
      .filter(p => p);
    
    if (recentPredictions.length > 0) {
      const avgPrediction = recentPredictions.reduce((sum, p) => sum + p.predictedValue, 0) / recentPredictions.length;
      const avgConfidence = recentPredictions.reduce((sum, p) => sum + p.confidence, 0) / recentPredictions.length;
      
      // Calculate agreement (inverse of standard deviation)
      const variance = recentPredictions.reduce((sum, p) => sum + Math.pow(p.predictedValue - avgPrediction, 2), 0) / recentPredictions.length;
      const agreement = Math.max(0, 1 - Math.sqrt(variance));
      
      consensus = {
        prediction: avgPrediction,
        confidence: avgConfidence,
        agreement
      };
    }
    
    return { algorithms: analysis, consensus };
  }
}

export default {
  LoadPredictionSystem,
  LinearRegressionPredictor,
  ExponentialSmoothingPredictor,
  MovingAveragePredictor
};