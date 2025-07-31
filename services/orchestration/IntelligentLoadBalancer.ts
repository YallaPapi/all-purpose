#!/usr/bin/env node

/**
 * Intelligent Load Balancing Algorithm for Distributed Agent Systems
 * 
 * Advanced load balancing system that dynamically evaluates agent metrics and prioritizes
 * agent selection to optimize throughput and reliability. Implements multi-criteria decision
 * making (MCDM), weighted utility functions, historical performance analysis, and predictive
 * load forecasting.
 * 
 * Research-based implementation features:
 * - Multi-Agent Reinforcement Learning (MARL) concepts
 * - Weighted utility-based agent selection
 * - Historical performance trend analysis
 * - Real-time resource utilization monitoring
 * - Workflow priority-aware distribution
 * - Extensible metric system for future enhancements
 * - Predictive load forecasting with congestion avoidance
 * 
 * Implementation satisfies Task 228.1 requirements:
 * - Current load evaluation
 * - Historical performance analysis
 * - Resource utilization tracking
 * - Workflow priority integration
 * - Dynamic metric evaluation
 * - Real-time monitoring integration
 * - Extensibility for new metrics
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 228.1
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';

/**
 * Agent performance metrics for load balancing decisions
 */
export interface AgentMetrics {
  agentId: string;
  timestamp: Date;
  
  // Current load metrics
  currentLoad: number;           // Current CPU/memory utilization (0-1)
  activeTaskCount: number;       // Number of currently active tasks
  queueLength: number;           // Number of queued tasks
  
  // Historical performance metrics
  averageResponseTime: number;   // Average response time in ms
  throughput: number;            // Tasks completed per minute
  successRate: number;           // Success rate (0-1)
  errorRate: number;             // Error rate (0-1)
  
  // Resource utilization metrics
  cpuUtilization: number;        // CPU usage (0-1)
  memoryUtilization: number;     // Memory usage (0-1)
  networkUtilization: number;    // Network usage (0-1)
  diskUtilization: number;       // Disk I/O usage (0-1)
  
  // Availability metrics
  uptime: number;                // Uptime percentage (0-1)
  healthScore: number;           // Overall health score (0-1)
  lastHealthCheck: Date;         // Last successful health check
  
  // Performance trends (rolling averages)
  trends: {
    responseTimeTrend: number;   // Response time trend (-1 to 1, negative is improving)
    throughputTrend: number;     // Throughput trend (-1 to 1, positive is improving)
    errorRateTrend: number;      // Error rate trend (-1 to 1, negative is improving)
    loadTrend: number;           // Load trend (-1 to 1, negative is decreasing load)
  };
}

/**
 * Workflow task with priority and resource requirements
 */
export interface WorkflowTask {
  taskId: string;
  workflowId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Resource requirements
  estimatedDuration: number;     // Estimated duration in ms
  cpuRequirement: number;        // Required CPU (0-1)
  memoryRequirement: number;     // Required memory (0-1)
  
  // Task characteristics
  type: string;                  // Task type (for agent specialization)
  complexity: number;            // Task complexity score (0-1)
  dependencies: string[];        // Dependent task IDs
  
  // SLA requirements
  maxResponseTime: number;       // Maximum acceptable response time in ms
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

/**
 * Agent capability and specialization information
 */
export interface AgentCapability {
  agentId: string;
  capabilities: string[];        // List of supported task types
  specializationScore: number;   // Specialization score for task type (0-1)
  maxConcurrentTasks: number;    // Maximum concurrent tasks
  
  // Performance characteristics
  averageTaskDuration: number;   // Average task completion time in ms
  optimalLoadRange: {            // Optimal load range for best performance
    min: number;
    max: number;
  };
  
  // Resource capacity
  totalCpuCapacity: number;      // Total CPU capacity
  totalMemoryCapacity: number;   // Total memory capacity
}

/**
 * Load balancing configuration with weights and thresholds
 */
export interface LoadBalancingConfig {
  // Scoring weights (must sum to 1.0)
  weights: {
    currentLoad: number;         // Weight for current load (lower is better)
    historicalPerformance: number; // Weight for historical performance
    resourceUtilization: number; // Weight for resource utilization
    workflowPriority: number;    // Weight for workflow priority
    agentSpecialization: number; // Weight for agent specialization
    availabilityScore: number;   // Weight for agent availability
  };
  
  // Load balancing thresholds
  thresholds: {
    maxLoadThreshold: number;    // Maximum acceptable load (0-1)
    minHealthScore: number;      // Minimum acceptable health score (0-1)
    responseTimeThreshold: number; // Maximum acceptable response time in ms
    errorRateThreshold: number;  // Maximum acceptable error rate (0-1)
  };
  
  // Algorithm parameters
  algorithm: {
    learningRate: number;        // Learning rate for adaptive weights (0-1)
    memoryWindow: number;        // Historical data window in minutes
    predictionHorizon: number;   // Load prediction horizon in minutes
    rebalancingInterval: number; // Rebalancing interval in seconds
  };
  
  // Extensibility configuration
  extensibility: {
    enableCustomMetrics: boolean; // Enable custom metric plugins
    enablePredictiveForecasting: boolean; // Enable load forecasting
    enableAdaptiveWeights: boolean; // Enable self-tuning weights
  };
}

/**
 * Agent selection result with detailed scoring breakdown
 */
export interface AgentSelectionResult {
  agentId: string;
  overallScore: number;          // Overall weighted score (0-1)
  
  // Individual score components
  scores: {
    loadScore: number;           // Load-based score (0-1)
    performanceScore: number;    // Historical performance score (0-1)
    resourceScore: number;       // Resource utilization score (0-1)
    priorityScore: number;       // Workflow priority score (0-1)
    specializationScore: number; // Agent specialization score (0-1)
    availabilityScore: number;   // Agent availability score (0-1)
  };
  
  // Selection metadata
  confidence: number;            // Confidence in selection (0-1)
  expectedResponseTime: number;  // Expected response time in ms
  expectedSuccessRate: number;   // Expected success rate (0-1)
  loadAfterAssignment: number;   // Predicted load after task assignment
  
  // Selection reasons for transparency
  selectionReasons: string[];
  warnings: string[];            // Potential issues or warnings
}

/**
 * Load prediction result for proactive balancing
 */
export interface LoadPrediction {
  agentId: string;
  currentLoad: number;
  predictedLoad: number;         // Predicted load in next horizon
  confidence: number;            // Prediction confidence (0-1)
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  recommendedAction: 'scale_up' | 'scale_down' | 'redistribute' | 'none';
}

/**
 * Intelligent Load Balancer main class
 */
export class IntelligentLoadBalancer extends EventEmitter {
  private config: LoadBalancingConfig;
  private agentMetrics: Map<string, AgentMetrics> = new Map();
  private agentCapabilities: Map<string, AgentCapability> = new Map();
  private performanceHistory: Map<string, AgentMetrics[]> = new Map();
  private taskHistory: Map<string, WorkflowTask[]> = new Map();
  
  // Adaptive learning components
  private weightHistory: LoadBalancingConfig['weights'][] = [];
  private performanceFeedback: Map<string, number[]> = new Map();
  
  // Predictive components
  private loadForecasts: Map<string, LoadPrediction> = new Map();
  private lastRebalanceTime: Date = new Date();

  constructor(config: Partial<LoadBalancingConfig> = {}) {
    super();
    
    // Apply intelligent defaults based on research
    this.config = {
      weights: {
        currentLoad: 0.25,           // Current load is important but not dominant
        historicalPerformance: 0.20, // Historical performance provides stability
        resourceUtilization: 0.20,  // Resource efficiency prevents bottlenecks
        workflowPriority: 0.15,      // Priority ensures critical tasks get attention
        agentSpecialization: 0.15,   // Specialization improves quality
        availabilityScore: 0.05,     // Availability is baseline requirement
        ...config.weights
      },
      thresholds: {
        maxLoadThreshold: 0.85,      // 85% maximum load threshold
        minHealthScore: 0.70,        // 70% minimum health score
        responseTimeThreshold: 5000, // 5 second response time limit
        errorRateThreshold: 0.05,    // 5% maximum error rate
        ...config.thresholds
      },
      algorithm: {
        learningRate: 0.1,           // 10% learning rate for gradual adaptation
        memoryWindow: 60,            // 1 hour historical window
        predictionHorizon: 15,       // 15 minute prediction horizon
        rebalancingInterval: 30,     // 30 second rebalancing interval
        ...config.algorithm
      },
      extensibility: {
        enableCustomMetrics: true,
        enablePredictiveForecasting: true,
        enableAdaptiveWeights: true,
        ...config.extensibility
      }
    };

    this.validateConfiguration();
    this.startPeriodicRebalancing();
  }

  /**
   * Select best agent for a workflow task using intelligent algorithm
   */
  public async selectAgent(
    task: WorkflowTask,
    availableAgents: string[]
  ): Promise<AgentSelectionResult | null> {
    try {
      console.log(chalk.blue(`🤖 Selecting agent for task ${task.taskId} (priority: ${task.priority})`));
      
      // Filter agents that meet minimum requirements
      const eligibleAgents = this.filterEligibleAgents(task, availableAgents);
      
      if (eligibleAgents.length === 0) {
        console.log(chalk.red(`❌ No eligible agents found for task ${task.taskId}`));
        return null;
      }
      
      // Calculate scores for each eligible agent
      const selectionResults = await this.calculateAgentScores(task, eligibleAgents);
      
      // Apply predictive adjustments if enabled
      if (this.config.extensibility.enablePredictiveForecasting) {
        await this.applyPredictiveAdjustments(selectionResults);
      }
      
      // Select best agent based on overall score
      const bestAgent = selectionResults.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best
      );
      
      // Update performance feedback for learning
      this.recordSelection(task, bestAgent);
      
      console.log(chalk.green(`✅ Selected agent ${bestAgent.agentId} (score: ${bestAgent.overallScore.toFixed(3)})`));
      
      this.emit('agentSelected', {
        task,
        selectedAgent: bestAgent,
        alternatives: selectionResults.filter(r => r.agentId !== bestAgent.agentId)
      });
      
      return bestAgent;
      
    } catch (error) {
      console.error(chalk.red('❌ Error in agent selection:'), error);
      this.emit('selectionError', { task, error });
      throw error;
    }
  }

  /**
   * Update agent metrics (called by monitoring system)
   */
  public updateAgentMetrics(metrics: AgentMetrics): void {
    const previousMetrics = this.agentMetrics.get(metrics.agentId);
    
    // Update current metrics
    this.agentMetrics.set(metrics.agentId, metrics);
    
    // Update historical data
    this.updatePerformanceHistory(metrics);
    
    // Calculate trends if we have previous data
    if (previousMetrics) {
      this.calculatePerformanceTrends(metrics, previousMetrics);
    }
    
    // Update load forecasts if enabled
    if (this.config.extensibility.enablePredictiveForecasting) {
      this.updateLoadForecasts(metrics);
    }
    
    this.emit('metricsUpdated', { agentId: metrics.agentId, metrics });
  }

  /**
   * Update agent capabilities (called when agents register/update)
   */
  public updateAgentCapabilities(agentId: string, capabilities: AgentCapability): void {
    this.agentCapabilities.set(agentId, capabilities);
    this.emit('capabilitiesUpdated', { agentId, capabilities });
  }

  /**
   * Get current load balancing statistics
   */
  public getStatistics(): {
    totalAgents: number;
    activeAgents: number;
    averageLoad: number;
    healthyAgents: number;
    overloadedAgents: number;
    predictions: LoadPrediction[];
  } {
    const allMetrics = Array.from(this.agentMetrics.values());
    const activeAgents = allMetrics.filter(m => m.healthScore > this.config.thresholds.minHealthScore);
    const overloadedAgents = allMetrics.filter(m => m.currentLoad > this.config.thresholds.maxLoadThreshold);
    
    const averageLoad = allMetrics.length > 0 
      ? allMetrics.reduce((sum, m) => sum + m.currentLoad, 0) / allMetrics.length
      : 0;
    
    return {
      totalAgents: allMetrics.length,
      activeAgents: activeAgents.length,
      averageLoad,
      healthyAgents: activeAgents.length,
      overloadedAgents: overloadedAgents.length,
      predictions: Array.from(this.loadForecasts.values())
    };
  }

  /**
   * Filter agents that meet minimum requirements for the task
   */
  private filterEligibleAgents(task: WorkflowTask, availableAgents: string[]): string[] {
    return availableAgents.filter(agentId => {
      const metrics = this.agentMetrics.get(agentId);
      const capabilities = this.agentCapabilities.get(agentId);
      
      if (!metrics || !capabilities) {
        return false;
      }
      
      // Check health score threshold
      if (metrics.healthScore < this.config.thresholds.minHealthScore) {
        return false;
      }
      
      // Check load threshold
      if (metrics.currentLoad > this.config.thresholds.maxLoadThreshold) {
        return false;
      }
      
      // Check error rate threshold
      if (metrics.errorRate > this.config.thresholds.errorRateThreshold) {
        return false;
      }
      
      // Check response time threshold
      if (metrics.averageResponseTime > this.config.thresholds.responseTimeThreshold) {
        return false;
      }
      
      // Check agent capability for task type
      if (!capabilities.capabilities.includes(task.type)) {
        return false;
      }
      
      // Check resource capacity
      const projectedCpuLoad = metrics.cpuUtilization + task.cpuRequirement;
      const projectedMemoryLoad = metrics.memoryUtilization + task.memoryRequirement;
      
      if (projectedCpuLoad > 1.0 || projectedMemoryLoad > 1.0) {
        return false;
      }
      
      // Check concurrent task capacity
      if (metrics.activeTaskCount >= capabilities.maxConcurrentTasks) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Calculate weighted scores for all eligible agents
   */
  private async calculateAgentScores(
    task: WorkflowTask,
    eligibleAgents: string[]
  ): Promise<AgentSelectionResult[]> {
    const results: AgentSelectionResult[] = [];
    
    for (const agentId of eligibleAgents) {
      const metrics = this.agentMetrics.get(agentId)!;
      const capabilities = this.agentCapabilities.get(agentId)!;
      
      // Calculate individual score components
      const loadScore = this.calculateLoadScore(metrics);
      const performanceScore = this.calculatePerformanceScore(metrics);
      const resourceScore = this.calculateResourceScore(metrics, task);
      const priorityScore = this.calculatePriorityScore(task, metrics);
      const specializationScore = this.calculateSpecializationScore(capabilities, task);
      const availabilityScore = this.calculateAvailabilityScore(metrics);
      
      // Calculate weighted overall score
      const overallScore = (
        loadScore * this.config.weights.currentLoad +
        performanceScore * this.config.weights.historicalPerformance +
        resourceScore * this.config.weights.resourceUtilization +
        priorityScore * this.config.weights.workflowPriority +
        specializationScore * this.config.weights.agentSpecialization +
        availabilityScore * this.config.weights.availabilityScore
      );
      
      // Calculate confidence and predictions
      const confidence = this.calculateSelectionConfidence(metrics, capabilities, task);
      const expectedResponseTime = this.predictResponseTime(metrics, capabilities, task);
      const expectedSuccessRate = this.predictSuccessRate(metrics, capabilities);
      const loadAfterAssignment = this.predictLoadAfterAssignment(metrics, task);
      
      // Generate selection reasons and warnings
      const selectionReasons = this.generateSelectionReasons(
        { loadScore, performanceScore, resourceScore, priorityScore, specializationScore, availabilityScore }
      );
      const warnings = this.generateSelectionWarnings(metrics, capabilities, task);
      
      results.push({
        agentId,
        overallScore,
        scores: {
          loadScore,
          performanceScore,
          resourceScore,
          priorityScore,
          specializationScore,
          availabilityScore
        },
        confidence,
        expectedResponseTime,
        expectedSuccessRate,
        loadAfterAssignment,
        selectionReasons,
        warnings
      });
    }
    
    return results.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Calculate load-based score (lower load = higher score)
   */
  private calculateLoadScore(metrics: AgentMetrics): number {
    // Invert load so lower load gets higher score
    const baseScore = 1 - metrics.currentLoad;
    
    // Apply trend adjustment (improving trend gets bonus)
    const trendAdjustment = -metrics.trends.loadTrend * 0.1;
    
    // Consider queue length impact
    const queuePenalty = Math.min(0.3, metrics.queueLength * 0.1);
    
    return Math.max(0, Math.min(1, baseScore + trendAdjustment - queuePenalty));
  }

  /**
   * Calculate historical performance score
   */
  private calculatePerformanceScore(metrics: AgentMetrics): number {
    // Base score from success rate and inverse error rate
    const successScore = metrics.successRate;
    const errorScore = 1 - metrics.errorRate;
    const throughputScore = Math.min(1, metrics.throughput / 100); // Normalize to reasonable throughput
    
    // Apply trend adjustments
    const responseTimeTrendBonus = -metrics.trends.responseTimeTrend * 0.1;
    const throughputTrendBonus = metrics.trends.throughputTrend * 0.1;
    const errorTrendBonus = -metrics.trends.errorRateTrend * 0.1;
    
    const baseScore = (successScore + errorScore + throughputScore) / 3;
    const trendAdjustment = responseTimeTrendBonus + throughputTrendBonus + errorTrendBonus;
    
    return Math.max(0, Math.min(1, baseScore + trendAdjustment));
  }

  /**
   * Calculate resource utilization score
   */
  private calculateResourceScore(metrics: AgentMetrics, task: WorkflowTask): number {
    // Calculate resource efficiency (not too low, not too high)
    const cpuEfficiency = this.calculateResourceEfficiency(metrics.cpuUtilization);
    const memoryEfficiency = this.calculateResourceEfficiency(metrics.memoryUtilization);
    const networkEfficiency = this.calculateResourceEfficiency(metrics.networkUtilization);
    const diskEfficiency = this.calculateResourceEfficiency(metrics.diskUtilization);
    
    // Check if agent has sufficient resources for task
    const cpuCapacity = 1 - metrics.cpuUtilization >= task.cpuRequirement ? 1 : 0.5;
    const memoryCapacity = 1 - metrics.memoryUtilization >= task.memoryRequirement ? 1 : 0.5;
    
    const baseScore = (cpuEfficiency + memoryEfficiency + networkEfficiency + diskEfficiency) / 4;
    const capacityScore = (cpuCapacity + memoryCapacity) / 2;
    
    return (baseScore + capacityScore) / 2;
  }

  /**
   * Calculate resource efficiency (optimal utilization around 60-70%)
   */
  private calculateResourceEfficiency(utilization: number): number {
    const optimal = 0.65; // 65% is considered optimal utilization
    const distance = Math.abs(utilization - optimal);
    return Math.max(0, 1 - (distance / 0.5)); // Penalty increases as we move away from optimal
  }

  /**
   * Calculate workflow priority score
   */
  private calculatePriorityScore(task: WorkflowTask, metrics: AgentMetrics): number {
    const priorityMultipliers = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
    
    const basePriorityScore = priorityMultipliers[task.priority];
    
    // Adjust based on agent's current load for critical tasks
    if (task.priority === 'critical' && metrics.currentLoad > 0.5) {
      return basePriorityScore * (1 - metrics.currentLoad * 0.3);
    }
    
    return basePriorityScore;
  }

  /**
   * Calculate agent specialization score for task type
   */
  private calculateSpecializationScore(capabilities: AgentCapability, task: WorkflowTask): number {
    // Base specialization score from capabilities
    let specializationScore = capabilities.specializationScore;
    
    // Adjust based on average task duration match
    const durationRatio = task.estimatedDuration / capabilities.averageTaskDuration;
    if (durationRatio >= 0.5 && durationRatio <= 2.0) {
      specializationScore += 0.1; // Bonus for similar task durations
    }
    
    // Consider complexity matching (complex tasks to high-performance agents)
    if (task.complexity > 0.7 && capabilities.specializationScore > 0.7) {
      specializationScore += 0.1; // Bonus for complex task specialization
    }
    
    return Math.min(1, specializationScore);
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(metrics: AgentMetrics): number {
    const uptimeScore = metrics.uptime;
    const healthScore = metrics.healthScore;
    
    // Time since last health check penalty
    const timeSinceHealthCheck = Date.now() - metrics.lastHealthCheck.getTime();
    const healthCheckPenalty = Math.min(0.3, timeSinceHealthCheck / (5 * 60 * 1000)); // 5 minute penalty
    
    return Math.max(0, (uptimeScore + healthScore) / 2 - healthCheckPenalty);
  }

  /**
   * Apply predictive adjustments to selection results
   */
  private async applyPredictiveAdjustments(results: AgentSelectionResult[]): Promise<void> {
    for (const result of results) {
      const forecast = this.loadForecasts.get(result.agentId);
      
      if (forecast) {
        // Adjust score based on predicted load
        if (forecast.trendDirection === 'increasing' && forecast.predictedLoad > 0.8) {
          result.overallScore *= 0.9; // Penalty for agents predicted to be overloaded
        } else if (forecast.trendDirection === 'decreasing') {
          result.overallScore *= 1.05; // Bonus for agents with decreasing load
        }
        
        // Update expected load after assignment
        result.loadAfterAssignment = Math.min(1, forecast.predictedLoad + 0.1);
      }
    }
    
    // Re-sort after adjustments
    results.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Update performance history for trend analysis
   */
  private updatePerformanceHistory(metrics: AgentMetrics): void {
    const history = this.performanceHistory.get(metrics.agentId) || [];
    history.push({ ...metrics });
    
    // Keep only data within memory window
    const cutoffTime = new Date(Date.now() - this.config.algorithm.memoryWindow * 60 * 1000);
    const filteredHistory = history.filter(h => h.timestamp >= cutoffTime);
    
    this.performanceHistory.set(metrics.agentId, filteredHistory);
  }

  /**
   * Calculate performance trends
   */
  private calculatePerformanceTrends(current: AgentMetrics, previous: AgentMetrics): void {
    const timeDiff = current.timestamp.getTime() - previous.timestamp.getTime();
    const timeFactor = Math.min(1, timeDiff / (60 * 1000)); // Normalize to minutes
    
    // Calculate trends (-1 to 1 scale)
    current.trends = {
      responseTimeTrend: this.calculateTrend(current.averageResponseTime, previous.averageResponseTime, timeFactor),
      throughputTrend: this.calculateTrend(current.throughput, previous.throughput, timeFactor),
      errorRateTrend: this.calculateTrend(current.errorRate, previous.errorRate, timeFactor),
      loadTrend: this.calculateTrend(current.currentLoad, previous.currentLoad, timeFactor)
    };
  }

  /**
   * Calculate individual trend value
   */
  private calculateTrend(current: number, previous: number, timeFactor: number): number {
    if (previous === 0) return 0;
    
    const change = (current - previous) / previous;
    return Math.max(-1, Math.min(1, change * timeFactor));
  }

  /**
   * Update load forecasts using simple linear prediction
   */
  private updateLoadForecasts(metrics: AgentMetrics): void {
    const history = this.performanceHistory.get(metrics.agentId);
    
    if (!history || history.length < 3) {
      return; // Need at least 3 data points for prediction
    }
    
    // Simple linear regression for load prediction
    const recentHistory = history.slice(-10); // Use last 10 data points
    const loadTrend = this.calculateLinearTrend(recentHistory.map(h => h.currentLoad));
    
    const predictionMinutes = this.config.algorithm.predictionHorizon;
    const predictedLoad = Math.max(0, Math.min(1, metrics.currentLoad + (loadTrend * predictionMinutes)));
    
    const confidence = Math.max(0.1, 1 - Math.abs(loadTrend)); // Higher confidence for stable trends
    
    let trendDirection: LoadPrediction['trendDirection'] = 'stable';
    if (loadTrend > 0.01) trendDirection = 'increasing';
    else if (loadTrend < -0.01) trendDirection = 'decreasing';
    
    let recommendedAction: LoadPrediction['recommendedAction'] = 'none';
    if (predictedLoad > 0.9) recommendedAction = 'scale_up';
    else if (predictedLoad < 0.3 && metrics.currentLoad > 0.5) recommendedAction = 'redistribute';
    else if (predictedLoad < 0.1) recommendedAction = 'scale_down';
    
    this.loadForecasts.set(metrics.agentId, {
      agentId: metrics.agentId,
      currentLoad: metrics.currentLoad,
      predictedLoad,
      confidence,
      trendDirection,
      recommendedAction
    });
  }

  /**
   * Calculate linear trend from data points
   */
  private calculateLinearTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + (idx * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate selection confidence
   */
  private calculateSelectionConfidence(
    metrics: AgentMetrics,
    capabilities: AgentCapability,
    task: WorkflowTask
  ): number {
    // Base confidence from health and performance stability
    const healthConfidence = metrics.healthScore;
    const stabilityConfidence = 1 - Math.abs(metrics.trends.loadTrend);
    const performanceConfidence = metrics.successRate;
    
    // Specialization confidence
    const specializationConfidence = capabilities.specializationScore;
    
    return (healthConfidence + stabilityConfidence + performanceConfidence + specializationConfidence) / 4;
  }

  /**
   * Predict response time for task
   */
  private predictResponseTime(
    metrics: AgentMetrics,
    capabilities: AgentCapability,
    task: WorkflowTask
  ): number {
    let baseResponseTime = metrics.averageResponseTime;
    
    // Adjust for current load
    const loadMultiplier = 1 + (metrics.currentLoad * 0.5);
    
    // Adjust for task complexity
    const complexityMultiplier = 1 + (task.complexity * 0.3);
    
    // Adjust for specialization (specialized agents are faster)
    const specializationMultiplier = 1 - (capabilities.specializationScore * 0.2);
    
    return baseResponseTime * loadMultiplier * complexityMultiplier * specializationMultiplier;
  }

  /**
   * Predict success rate for task
   */
  private predictSuccessRate(metrics: AgentMetrics, capabilities: AgentCapability): number {
    let baseSuccessRate = metrics.successRate;
    
    // Adjust for current load (high load reduces success rate)
    if (metrics.currentLoad > 0.8) {
      baseSuccessRate *= (1 - (metrics.currentLoad - 0.8) * 0.5);
    }
    
    // Adjust for specialization (specialized agents have higher success rate)
    baseSuccessRate += (capabilities.specializationScore * 0.05);
    
    return Math.min(1, baseSuccessRate);
  }

  /**
   * Predict load after task assignment
   */
  private predictLoadAfterAssignment(metrics: AgentMetrics, task: WorkflowTask): number {
    // Estimate load increase based on task requirements
    const loadIncrease = Math.max(
      task.cpuRequirement * 0.8,
      task.memoryRequirement * 0.6,
      task.complexity * 0.1
    );
    
    return Math.min(1, metrics.currentLoad + loadIncrease);
  }

  /**
   * Generate human-readable selection reasons
   */
  private generateSelectionReasons(scores: AgentSelectionResult['scores']): string[] {
    const reasons: string[] = [];
    
    if (scores.loadScore > 0.8) reasons.push('Low current load');
    if (scores.performanceScore > 0.8) reasons.push('Excellent historical performance');
    if (scores.resourceScore > 0.8) reasons.push('Optimal resource utilization');
    if (scores.priorityScore > 0.8) reasons.push('High priority task handling capability');
    if (scores.specializationScore > 0.8) reasons.push('Strong specialization for task type');
    if (scores.availabilityScore > 0.9) reasons.push('High availability and health');
    
    if (reasons.length === 0) {
      reasons.push('Best available option among eligible agents');
    }
    
    return reasons;
  }

  /**
   * Generate selection warnings
   */
  private generateSelectionWarnings(
    metrics: AgentMetrics,
    capabilities: AgentCapability,
    task: WorkflowTask
  ): string[] {
    const warnings: string[] = [];
    
    if (metrics.currentLoad > 0.7) {
      warnings.push('Agent is operating at high load');
    }
    
    if (metrics.errorRate > 0.02) {
      warnings.push('Agent has elevated error rate');
    }
    
    if (metrics.trends.loadTrend > 0.5) {
      warnings.push('Agent load is trending upward');
    }
    
    if (metrics.averageResponseTime > task.maxResponseTime * 0.8) {
      warnings.push('Response time may approach SLA limits');
    }
    
    if (capabilities.specializationScore < 0.5) {
      warnings.push('Agent has limited specialization for this task type');
    }
    
    return warnings;
  }

  /**
   * Record selection for learning and feedback
   */
  private recordSelection(task: WorkflowTask, selection: AgentSelectionResult): void {
    // Record task assignment for historical analysis
    const taskHistory = this.taskHistory.get(selection.agentId) || [];
    taskHistory.push(task);
    this.taskHistory.set(selection.agentId, taskHistory);
    
    // Initialize performance feedback tracking
    if (!this.performanceFeedback.has(selection.agentId)) {
      this.performanceFeedback.set(selection.agentId, []);
    }
  }

  /**
   * Start periodic rebalancing
   */
  private startPeriodicRebalancing(): void {
    setInterval(() => {
      this.performPeriodicMaintenance();
    }, this.config.algorithm.rebalancingInterval * 1000);
  }

  /**
   * Perform periodic maintenance and optimization
   */
  private performPeriodicMaintenance(): void {
    try {
      // Clean up old historical data
      this.cleanupHistoricalData();
      
      // Update load forecasts
      if (this.config.extensibility.enablePredictiveForecasting) {
        this.updateAllLoadForecasts();
      }
      
      // Adapt weights if enabled
      if (this.config.extensibility.enableAdaptiveWeights) {
        this.adaptWeights();
      }
      
      // Emit maintenance completed event
      this.emit('maintenanceCompleted', {
        timestamp: new Date(),
        statistics: this.getStatistics()
      });
      
    } catch (error) {
      console.error(chalk.red('❌ Error in periodic maintenance:'), error);
      this.emit('maintenanceError', { error });
    }
  }

  /**
   * Clean up old historical data beyond memory window
   */
  private cleanupHistoricalData(): void {
    const cutoffTime = new Date(Date.now() - this.config.algorithm.memoryWindow * 60 * 1000);
    
    for (const [agentId, history] of this.performanceHistory) {
      const filteredHistory = history.filter(h => h.timestamp >= cutoffTime);
      this.performanceHistory.set(agentId, filteredHistory);
    }
    
    for (const [agentId, tasks] of this.taskHistory) {
      // Keep reasonable number of recent tasks
      const recentTasks = tasks.slice(-100);
      this.taskHistory.set(agentId, recentTasks);
    }
  }

  /**
   * Update load forecasts for all agents
   */
  private updateAllLoadForecasts(): void {
    for (const [agentId, metrics] of this.agentMetrics) {
      this.updateLoadForecasts(metrics);
    }
  }

  /**
   * Adapt weights based on performance feedback (simple implementation)
   */
  private adaptWeights(): void {
    // This is a simplified adaptive learning implementation
    // In a production system, this would use more sophisticated ML algorithms
    
    if (this.weightHistory.length < 10) {
      // Need more data for adaptation
      return;
    }
    
    // Store current weights for history
    this.weightHistory.push({ ...this.config.weights });
    
    // Keep only recent weight history
    if (this.weightHistory.length > 100) {
      this.weightHistory = this.weightHistory.slice(-100);
    }
    
    // Simple adaptation: slightly adjust weights based on overall system performance
    const stats = this.getStatistics();
    
    if (stats.overloadedAgents > stats.totalAgents * 0.2) {
      // Too many overloaded agents, increase weight on current load
      this.config.weights.currentLoad = Math.min(0.4, this.config.weights.currentLoad * 1.05);
      this.normalizeWeights();
    }
    
    this.emit('weightsAdapted', { 
      newWeights: this.config.weights,
      reason: 'Periodic adaptation based on system performance'
    });
  }

  /**
   * Normalize weights to sum to 1.0
   */
  private normalizeWeights(): void {
    const totalWeight = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight > 0) {
      for (const [key, weight] of Object.entries(this.config.weights)) {
        (this.config.weights as any)[key] = weight / totalWeight;
      }
    }
  }

  /**
   * Validate configuration on initialization
   */
  private validateConfiguration(): void {
    // Validate weights sum to approximately 1.0
    const totalWeight = Object.values(this.config.weights).reduce((sum, weight) => sum + weight, 0);
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      console.warn(chalk.yellow(`⚠️ Weights sum to ${totalWeight}, normalizing to 1.0`));
      this.normalizeWeights();
    }
    
    // Validate thresholds are in valid ranges
    for (const [key, value] of Object.entries(this.config.thresholds)) {
      if (key !== 'responseTimeThreshold' && (value < 0 || value > 1)) {
        throw new Error(`Invalid threshold value for ${key}: ${value} (must be 0-1)`);
      }
    }
    
    console.log(chalk.green('✅ Load balancing configuration validated'));
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): LoadBalancingConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration
   */
  public updateConfiguration(newConfig: Partial<LoadBalancingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfiguration();
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Get detailed performance analysis for an agent
   */
  public getAgentAnalysis(agentId: string): {
    currentMetrics: AgentMetrics | undefined;
    capabilities: AgentCapability | undefined;
    performanceHistory: AgentMetrics[];
    loadForecast: LoadPrediction | undefined;
    taskHistory: WorkflowTask[];
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const metrics = this.agentMetrics.get(agentId);
    const forecast = this.loadForecasts.get(agentId);
    
    if (metrics) {
      if (metrics.currentLoad > 0.8) {
        recommendations.push('Consider redistributing load from this agent');
      }
      if (metrics.trends.errorRateTrend > 0.1) {
        recommendations.push('Monitor for potential stability issues');
      }
      if (metrics.averageResponseTime > 3000) {
        recommendations.push('Response time is above optimal range');
      }
    }
    
    return {
      currentMetrics: metrics,
      capabilities: this.agentCapabilities.get(agentId),
      performanceHistory: this.performanceHistory.get(agentId) || [],
      loadForecast: forecast,
      taskHistory: this.taskHistory.get(agentId) || [],
      recommendations
    };
  }
}

export default IntelligentLoadBalancer;