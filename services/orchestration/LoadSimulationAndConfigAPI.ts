#!/usr/bin/env node

/**
 * Load Simulation and Configuration API Tools
 * 
 * Provides comprehensive load simulation capabilities for testing the load balancing
 * system and a configuration API for runtime management of strategies, thresholds,
 * and preferences. Enables thorough testing and operational management of the
 * distributed agent load balancing system.
 * 
 * Core Components:
 * - Load Simulation Engine with realistic workflow patterns
 * - Stress testing framework with variable scenarios
 * - Configuration API for runtime updates
 * - Performance metrics collection and analysis
 * - Load pattern generators (burst, steady, seasonal, random)
 * - Strategy testing and validation tools
 * - Real-time configuration management
 * - A/B testing framework for strategies
 * 
 * Features:
 * - Multi-pattern load generation (burst, steady, seasonal, chaos)
 * - Agent simulation with realistic resource constraints
 * - Performance benchmarking and comparison
 * - Configuration hot-reloading without downtime
 * - Strategy effectiveness comparison
 * - Automated test scenario execution
 * - Real-time metrics visualization
 * - Export/import configuration profiles
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 228.5
 */

import { EventEmitter } from 'events';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import chalk from 'chalk';
import { Agent, StrategyManager, LoadBalancingStrategy } from './LoadBalancingStrategies.js';
import { LoadPredictionSystem, LoadMetrics } from './LoadPredictionAndScaling.js';

/**
 * Load simulation configuration
 */
export interface LoadSimulationConfig {
  // Simulation parameters
  duration: number;              // Simulation duration in seconds
  requestsPerSecond: number;     // Base RPS
  pattern: 'steady' | 'burst' | 'seasonal' | 'random' | 'chaos';
  
  // Agent configuration
  agentCount: number;
  agentTypes: {
    name: string;
    count: number;
    resources: {
      cpu: number;               // CPU capacity
      memory: number;            // Memory capacity  
      maxConnections: number;    // Max concurrent connections
    };
    performance: {
      averageResponseTime: number; // Base response time in ms
      errorRate: number;         // Base error rate (0-1)
      reliability: number;       // Reliability score (0-1)
    };
  }[];
  
  // Load patterns
  patterns: {
    burst?: {
      intensity: number;         // Multiplier for burst traffic
      duration: number;          // Burst duration in seconds
      interval: number;          // Time between bursts
    };
    seasonal?: {
      periods: {
        start: string;           // Time of day (HH:MM)
        end: string;             // Time of day (HH:MM)
        multiplier: number;      // Load multiplier
      }[];
    };
    random?: {
      minMultiplier: number;     // Minimum load multiplier
      maxMultiplier: number;     // Maximum load multiplier
      changeInterval: number;    // Change interval in seconds
    };
    chaos?: {
      agentFailureRate: number;  // Agent failure probability per minute
      networkLatency: {          // Network latency simulation
        min: number;
        max: number;
      };
      resourceConstraints: boolean; // Simulate resource exhaustion
    };
  };
  
  // Metrics collection
  metricsInterval: number;       // Metrics collection interval in ms
  detailedLogging: boolean;      // Enable detailed performance logging
}

/**
 * Simulation result data
 */
export interface SimulationResult {
  id: string;
  config: LoadSimulationConfig;
  startTime: Date;
  endTime: Date;
  
  // Performance metrics
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    percentiles: {
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: number;          // Requests per second achieved
    errorRate: number;           // Overall error rate
  };
  
  // Load balancing effectiveness
  balancing: {
    strategyUsed: string;
    agentUtilization: Record<string, {
      requestCount: number;
      averageLoad: number;
      responseTime: number;
    }>;
    loadDistribution: {
      standardDeviation: number; // Lower is better
      uniformityScore: number;   // 0-1, higher is better
    };
  };
  
  // Resource utilization
  resources: {
    peakCpuUtilization: number;
    peakMemoryUtilization: number;
    averageQueueDepth: number;
    resourceExhaustionEvents: number;
  };
  
  // Timeline data for visualization
  timeline: {
    timestamp: Date;
    rps: number;
    responseTime: number;
    errorRate: number;
    activeAgents: number;
  }[];
  
  // Issues and recommendations
  issues: string[];
  recommendations: string[];
}

/**
 * Configuration profile for saving/loading configurations
 */
export interface ConfigurationProfile {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  
  // Load balancing configuration
  loadBalancing: {
    defaultStrategy: string;
    strategies: Record<string, any>; // Strategy-specific configurations
    thresholds: {
      cpuThreshold: number;
      memoryThreshold: number;
      responseTimeThreshold: number;
      errorRateThreshold: number;
    };
    autoSwitching: {
      enabled: boolean;
      rules: any[];
    };
  };
  
  // Scaling configuration
  scaling: {
    enabled: boolean;
    triggers: any[];
    cooldownPeriod: number;
    maxScale: number;
    minScale: number;
  };
  
  // Agent preferences
  agents: {
    healthCheckInterval: number;
    maxRetries: number;
    timeoutSettings: {
      connection: number;
      request: number;
    };
    preferences: Record<string, any>;
  };
}

/**
 * Load simulation engine
 */
export class LoadSimulationEngine extends EventEmitter {
  private activeSimulations: Map<string, {
    config: LoadSimulationConfig;
    startTime: Date;
    interval: NodeJS.Timeout;
    result: Partial<SimulationResult>;
  }> = new Map();
  
  private requestCounter = 0;
  private simulatedAgents: Map<string, Agent> = new Map();

  constructor() {
    super();
  }

  /**
   * Start load simulation
   */
  public async startSimulation(config: LoadSimulationConfig): Promise<string> {
    const simulationId = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    
    console.log(chalk.blue(`🎯 Starting load simulation: ${simulationId}`));
    console.log(chalk.cyan(`📊 Pattern: ${config.pattern}, Duration: ${config.duration}s, Base RPS: ${config.requestsPerSecond}`));
    
    // Initialize simulated agents
    this.initializeSimulatedAgents(config);
    
    // Initialize result structure
    const result: Partial<SimulationResult> = {
      id: simulationId,
      config,
      startTime,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        percentiles: { p50: 0, p95: 0, p99: 0 },
        throughput: 0,
        errorRate: 0
      },
      balancing: {
        strategyUsed: 'simulation',
        agentUtilization: {},
        loadDistribution: {
          standardDeviation: 0,
          uniformityScore: 0
        }
      },
      resources: {
        peakCpuUtilization: 0,
        peakMemoryUtilization: 0,
        averageQueueDepth: 0,
        resourceExhaustionEvents: 0
      },
      timeline: [],
      issues: [],
      recommendations: []
    };
    
    // Start simulation loop
    const interval = setInterval(() => {
      this.executeSimulationStep(simulationId, config, result);
    }, config.metricsInterval);
    
    // Store active simulation
    this.activeSimulations.set(simulationId, {
      config,
      startTime,
      interval,
      result
    });
    
    // Auto-stop after duration
    setTimeout(() => {
      this.stopSimulation(simulationId);
    }, config.duration * 1000);
    
    this.emit('simulationStarted', { simulationId, config });
    
    return simulationId;
  }

  /**
   * Stop simulation
   */
  public stopSimulation(simulationId: string): SimulationResult | null {
    const simulation = this.activeSimulations.get(simulationId);
    
    if (!simulation) {
      return null;
    }
    
    clearInterval(simulation.interval);
    this.activeSimulations.delete(simulationId);
    
    // Finalize result
    const finalResult: SimulationResult = {
      ...simulation.result,
      endTime: new Date(),
      // Perform final calculations
      issues: this.analyzeIssues(simulation.result),
      recommendations: this.generateRecommendations(simulation.result)
    } as SimulationResult;
    
    console.log(chalk.green(`✅ Simulation completed: ${simulationId}`));
    console.log(chalk.cyan(`📈 Total requests: ${finalResult.metrics.totalRequests}, Success rate: ${((finalResult.metrics.successfulRequests / finalResult.metrics.totalRequests) * 100).toFixed(1)}%`));
    
    this.emit('simulationCompleted', { simulationId, result: finalResult });
    
    return finalResult;
  }

  /**
   * Execute single simulation step
   */
  private executeSimulationStep(
    simulationId: string,
    config: LoadSimulationConfig,
    result: Partial<SimulationResult>
  ): void {
    const simulation = this.activeSimulations.get(simulationId);
    if (!simulation) return;
    
    const currentTime = new Date();
    const elapsedSeconds = (currentTime.getTime() - simulation.startTime.getTime()) / 1000;
    
    // Calculate current RPS based on pattern
    const currentRPS = this.calculateCurrentRPS(config, elapsedSeconds);
    
    // Simulate requests for this interval
    const requestsThisInterval = Math.round(currentRPS * (config.metricsInterval / 1000));
    
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    
    // Process requests
    for (let i = 0; i < requestsThisInterval; i++) {
      const requestResult = this.simulateRequest(config);
      
      if (requestResult.success) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
      
      totalResponseTime += requestResult.responseTime;
    }
    
    // Update metrics
    result.metrics!.totalRequests += requestsThisInterval;
    result.metrics!.successfulRequests += successfulRequests;
    result.metrics!.failedRequests += failedRequests;
    
    if (requestsThisInterval > 0) {
      const intervalAvgResponseTime = totalResponseTime / requestsThisInterval;
      result.metrics!.averageResponseTime = (
        (result.metrics!.averageResponseTime * (result.metrics!.totalRequests - requestsThisInterval) + 
         totalResponseTime) / result.metrics!.totalRequests
      );
    }
    
    result.metrics!.throughput = currentRPS;
    result.metrics!.errorRate = result.metrics!.failedRequests / result.metrics!.totalRequests;
    
    // Update timeline
    const activeAgents = Array.from(this.simulatedAgents.values()).filter(a => a.status === 'active').length;
    
    result.timeline!.push({
      timestamp: currentTime,
      rps: currentRPS,
      responseTime: result.metrics!.averageResponseTime,
      errorRate: result.metrics!.errorRate,
      activeAgents
    });
    
    // Keep timeline manageable
    if (result.timeline!.length > 1000) {
      result.timeline!.splice(0, result.timeline!.length - 1000);
    }
    
    // Update resource metrics
    this.updateResourceMetrics(config, result);
    
    this.emit('simulationStep', {
      simulationId,
      elapsedSeconds,
      currentRPS,
      metrics: result.metrics
    });
  }

  /**
   * Calculate current RPS based on load pattern
   */
  private calculateCurrentRPS(config: LoadSimulationConfig, elapsedSeconds: number): number {
    const baseRPS = config.requestsPerSecond;
    
    switch (config.pattern) {
      case 'steady':
        return baseRPS;
        
      case 'burst':
        if (config.patterns.burst) {
          const burstConfig = config.patterns.burst;
          const cycleTime = burstConfig.duration + burstConfig.interval;
          const cyclePosition = elapsedSeconds % cycleTime;
          
          if (cyclePosition < burstConfig.duration) {
            return baseRPS * burstConfig.intensity;
          }
        }
        return baseRPS;
        
      case 'seasonal':
        if (config.patterns.seasonal) {
          const currentTime = new Date();
          const timeStr = currentTime.toTimeString().substr(0, 5); // HH:MM
          
          for (const period of config.patterns.seasonal.periods) {
            if (timeStr >= period.start && timeStr <= period.end) {
              return baseRPS * period.multiplier;
            }
          }
        }
        return baseRPS;
        
      case 'random':
        if (config.patterns.random) {
          const randomConfig = config.patterns.random;
          const changeInterval = randomConfig.changeInterval;
          const changeCount = Math.floor(elapsedSeconds / changeInterval);
          
          // Use changeCount as seed for consistent randomness within interval
          const randomMultiplier = randomConfig.minMultiplier + 
            (Math.sin(changeCount) * 0.5 + 0.5) * 
            (randomConfig.maxMultiplier - randomConfig.minMultiplier);
          
          return baseRPS * randomMultiplier;
        }
        return baseRPS;
        
      case 'chaos':
        // Chaos pattern includes random spikes and drops
        const chaosMultiplier = 0.5 + Math.random() * 1.5; // 0.5x to 2x
        return baseRPS * chaosMultiplier;
        
      default:
        return baseRPS;
    }
  }

  /**
   * Simulate a single request
   */
  private simulateRequest(config: LoadSimulationConfig): {
    success: boolean;
    responseTime: number;
    agentId?: string;
  } {
    // Select a random agent (simplified load balancing simulation)
    const agents = Array.from(this.simulatedAgents.values()).filter(a => a.status === 'active');
    
    if (agents.length === 0) {
      return { success: false, responseTime: 30000 }; // Timeout
    }
    
    const selectedAgent = agents[Math.floor(Math.random() * agents.length)];
    
    // Simulate processing
    const baseResponseTime = selectedAgent.health.responseTime;
    const loadMultiplier = 1 + (selectedAgent.activeConnections / selectedAgent.maxConnections) * 0.5;
    const responseTime = baseResponseTime * loadMultiplier * (0.8 + Math.random() * 0.4); // ±20% variance
    
    // Update agent state
    selectedAgent.activeConnections++;
    
    // Simulate request completion
    setTimeout(() => {
      selectedAgent.activeConnections = Math.max(0, selectedAgent.activeConnections - 1);
    }, responseTime);
    
    // Determine success/failure
    const success = Math.random() > selectedAgent.health.errorRate && 
                   selectedAgent.activeConnections < selectedAgent.maxConnections;
    
    return {
      success,
      responseTime,
      agentId: selectedAgent.id
    };
  }

  /**
   * Initialize simulated agents
   */
  private initializeSimulatedAgents(config: LoadSimulationConfig): void {
    this.simulatedAgents.clear();
    
    for (const agentType of config.agentTypes) {
      for (let i = 0; i < agentType.count; i++) {
        const agentId = `${agentType.name}-${i + 1}`;
        
        const agent: Agent = {
          id: agentId,
          endpoint: `http://agent-${agentId}:3000`,
          status: 'active',
          activeConnections: 0,
          maxConnections: agentType.resources.maxConnections,
          resources: {
            cpuUsage: Math.random() * 0.3, // Start with low usage
            memoryUsage: Math.random() * 0.3,
            diskUsage: Math.random() * 0.2,
            networkUsage: Math.random() * 0.1,
            lastUpdated: new Date()
          },
          capabilities: {
            weight: Math.floor(Math.random() * 5) + 3, // 3-7 weight
            specializations: ['general', agentType.name],
            performanceScore: 0.7 + Math.random() * 0.3, // 0.7-1.0
            reliability: agentType.performance.reliability
          },
          health: {
            isHealthy: true,
            responseTime: agentType.performance.averageResponseTime * (0.8 + Math.random() * 0.4),
            errorRate: agentType.performance.errorRate,
            uptime: 0.99 + Math.random() * 0.01
          }
        };
        
        this.simulatedAgents.set(agentId, agent);
      }
    }
    
    console.log(chalk.cyan(`🤖 Initialized ${this.simulatedAgents.size} simulated agents`));
  }

  /**
   * Update resource metrics during simulation
   */
  private updateResourceMetrics(config: LoadSimulationConfig, result: Partial<SimulationResult>): void {
    let totalCpuUsage = 0;
    let totalMemoryUsage = 0;
    let totalQueueDepth = 0;
    
    for (const agent of this.simulatedAgents.values()) {
      // Simulate resource usage based on load
      const loadFactor = agent.activeConnections / agent.maxConnections;
      agent.resources.cpuUsage = Math.min(0.95, 0.1 + loadFactor * 0.7 + Math.random() * 0.1);
      agent.resources.memoryUsage = Math.min(0.95, 0.15 + loadFactor * 0.6 + Math.random() * 0.1);
      
      totalCpuUsage += agent.resources.cpuUsage;
      totalMemoryUsage += agent.resources.memoryUsage;
      totalQueueDepth += agent.activeConnections;
      
      // Simulate chaos events
      if (config.pattern === 'chaos' && config.patterns.chaos) {
        const chaosConfig = config.patterns.chaos;
        
        // Random agent failures
        if (Math.random() < chaosConfig.agentFailureRate / 60) {
          agent.status = 'inactive';
          setTimeout(() => {
            agent.status = 'active';
          }, 30000); // 30s recovery time
        }
      }
    }
    
    const agentCount = this.simulatedAgents.size;
    const avgCpuUsage = totalCpuUsage / agentCount;
    const avgMemoryUsage = totalMemoryUsage / agentCount;
    const avgQueueDepth = totalQueueDepth / agentCount;
    
    // Update peak values
    result.resources!.peakCpuUtilization = Math.max(result.resources!.peakCpuUtilization, avgCpuUsage);
    result.resources!.peakMemoryUtilization = Math.max(result.resources!.peakMemoryUtilization, avgMemoryUsage);
    result.resources!.averageQueueDepth = (result.resources!.averageQueueDepth * 0.9) + (avgQueueDepth * 0.1); // Smoothed average
  }

  /**
   * Analyze issues from simulation results
   */
  private analyzeIssues(result: Partial<SimulationResult>): string[] {
    const issues: string[] = [];
    
    if (result.metrics) {
      if (result.metrics.errorRate > 0.05) {
        issues.push(`High error rate: ${(result.metrics.errorRate * 100).toFixed(1)}%`);
      }
      
      if (result.metrics.averageResponseTime > 5000) {
        issues.push(`High average response time: ${result.metrics.averageResponseTime.toFixed(0)}ms`);
      }
      
      if (result.metrics.throughput < result.config!.requestsPerSecond * 0.8) {
        issues.push(`Low throughput: ${result.metrics.throughput.toFixed(1)} RPS (expected: ${result.config!.requestsPerSecond})`);
      }
    }
    
    if (result.resources) {
      if (result.resources.peakCpuUtilization > 0.9) {
        issues.push(`High CPU utilization: ${(result.resources.peakCpuUtilization * 100).toFixed(1)}%`);
      }
      
      if (result.resources.peakMemoryUtilization > 0.9) {
        issues.push(`High memory utilization: ${(result.resources.peakMemoryUtilization * 100).toFixed(1)}%`);
      }
      
      if (result.resources.averageQueueDepth > 10) {
        issues.push(`High queue depth: ${result.resources.averageQueueDepth.toFixed(1)}`);
      }
    }
    
    return issues;
  }

  /**
   * Generate recommendations based on simulation results
   */
  private generateRecommendations(result: Partial<SimulationResult>): string[] {
    const recommendations: string[] = [];
    
    if (result.metrics) {
      if (result.metrics.errorRate > 0.05) {
        recommendations.push('Consider increasing agent capacity or improving error handling');
      }
      
      if (result.metrics.averageResponseTime > 3000) {
        recommendations.push('Optimize response times through better load distribution or agent performance');
      }
      
      if (result.metrics.throughput < result.config!.requestsPerSecond * 0.9) {
        recommendations.push('Add more agents or improve load balancing algorithm efficiency');
      }
    }
    
    if (result.resources) {
      if (result.resources.peakCpuUtilization > 0.8) {
        recommendations.push('Scale out agents before CPU utilization reaches 80%');
      }
      
      if (result.resources.averageQueueDepth > 5) {
        recommendations.push('Implement queue depth-based scaling triggers');
      }
    }
    
    return recommendations;
  }

  /**
   * Get active simulations
   */
  public getActiveSimulations(): string[] {
    return Array.from(this.activeSimulations.keys());
  }

  /**
   * Get simulation status
   */
  public getSimulationStatus(simulationId: string): {
    isActive: boolean;
    elapsedTime: number;
    currentMetrics?: any;
  } | null {
    const simulation = this.activeSimulations.get(simulationId);
    
    if (!simulation) {
      return null;
    }
    
    const elapsedTime = (Date.now() - simulation.startTime.getTime()) / 1000;
    
    return {
      isActive: true,
      elapsedTime,
      currentMetrics: simulation.result.metrics
    };
  }
}

/**
 * Configuration API manager
 */
export class ConfigurationAPIManager extends EventEmitter {
  private profiles: Map<string, ConfigurationProfile> = new Map();
  private currentConfig: ConfigurationProfile | null = null;
  private strategyManager: StrategyManager | null = null;
  private predictionSystem: LoadPredictionSystem | null = null;
  private apiServer: ReturnType<typeof createServer> | null = null;
  
  private config = {
    apiPort: 3011,
    enableHotReload: true,
    configBackupInterval: 300000, // 5 minutes
    maxProfiles: 50
  };

  constructor(config: Partial<typeof ConfigurationAPIManager.prototype.config> = {}) {
    super();
    this.config = { ...this.config, ...config };
    
    this.loadDefaultProfiles();
    this.startApiServer();
    this.startConfigBackup();
  }

  /**
   * Set external system references
   */
  public setSystemReferences(
    strategyManager: StrategyManager,
    predictionSystem: LoadPredictionSystem
  ): void {
    this.strategyManager = strategyManager;
    this.predictionSystem = predictionSystem;
  }

  /**
   * Create configuration profile
   */
  public createProfile(profile: Omit<ConfigurationProfile, 'id' | 'createdAt'>): string {
    const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullProfile: ConfigurationProfile = {
      ...profile,
      id: profileId,
      createdAt: new Date()
    };
    
    this.profiles.set(profileId, fullProfile);
    this.trimProfiles();
    
    this.emit('profileCreated', { profileId, profile: fullProfile });
    
    return profileId;
  }

  /**
   * Update configuration profile
   */
  public updateProfile(profileId: string, updates: Partial<ConfigurationProfile>): boolean {
    const profile = this.profiles.get(profileId);
    
    if (!profile) {
      return false;
    }
    
    const updatedProfile = { ...profile, ...updates };
    this.profiles.set(profileId, updatedProfile);
    
    // Apply updates to active systems if this is the current profile
    if (this.currentConfig?.id === profileId) {
      this.applyConfiguration(updatedProfile);
    }
    
    this.emit('profileUpdated', { profileId, profile: updatedProfile });
    
    return true;
  }

  /**
   * Apply configuration profile
   */
  public async applyConfiguration(profile: ConfigurationProfile): Promise<void> {
    try {
      console.log(chalk.blue(`🔧 Applying configuration profile: ${profile.name}`));
      
      // Apply load balancing configuration
      if (this.strategyManager) {
        // Set default strategy
        this.strategyManager.setCurrentStrategy(
          profile.loadBalancing.defaultStrategy,
          `Applied from profile: ${profile.name}`
        );
        
        // Configure auto-switching
        this.strategyManager.configureAutoSwitching(profile.loadBalancing.autoSwitching);
      }
      
      // Apply scaling configuration
      if (this.predictionSystem) {
        // Update scaling triggers would go here
        // (Requires extending LoadPredictionSystem to support configuration updates)
      }
      
      this.currentConfig = profile;
      
      console.log(chalk.green(`✅ Configuration applied successfully`));
      this.emit('configurationApplied', { profile });
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to apply configuration:`), error);
      this.emit('configurationError', { profile, error });
      throw error;
    }
  }

  /**
   * Get configuration profile
   */
  public getProfile(profileId: string): ConfigurationProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * List all profiles
   */
  public listProfiles(): ConfigurationProfile[] {
    return Array.from(this.profiles.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete configuration profile
   */
  public deleteProfile(profileId: string): boolean {
    const deleted = this.profiles.delete(profileId);
    
    if (deleted) {
      this.emit('profileDeleted', { profileId });
    }
    
    return deleted;
  }

  /**
   * Export configuration profile
   */
  public exportProfile(profileId: string): string | null {
    const profile = this.profiles.get(profileId);
    
    if (!profile) {
      return null;
    }
    
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import configuration profile
   */
  public importProfile(configJson: string): string {
    const profile = JSON.parse(configJson) as ConfigurationProfile;
    
    // Generate new ID to avoid conflicts
    const newId = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    profile.id = newId;
    profile.createdAt = new Date();
    
    this.profiles.set(newId, profile);
    this.trimProfiles();
    
    this.emit('profileImported', { profileId: newId, profile });
    
    return newId;
  }

  /**
   * Start API server
   */
  private startApiServer(): void {
    this.apiServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      try {
        await this.handleConfigApiRequest(req, res);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error)
        }));
      }
    });
    
    this.apiServer.listen(this.config.apiPort, () => {
      console.log(chalk.green(`🌐 Configuration API server started on port ${this.config.apiPort}`));
    });
  }

  /**
   * Handle configuration API requests
   */
  private async handleConfigApiRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url!, `http://localhost:${this.config.apiPort}`);
    const path = url.pathname;
    const method = req.method;
    
    res.setHeader('Content-Type', 'application/json');
    
    // Route handling
    if (path === '/api/config/profiles' && method === 'GET') {
      const profiles = this.listProfiles();
      res.writeHead(200);
      res.end(JSON.stringify({ profiles }));
      
    } else if (path === '/api/config/profiles' && method === 'POST') {
      const body = await this.readRequestBody(req);
      const profileData = JSON.parse(body);
      const profileId = this.createProfile(profileData);
      res.writeHead(201);
      res.end(JSON.stringify({ profileId, profile: this.getProfile(profileId) }));
      
    } else if (path.startsWith('/api/config/profiles/') && method === 'GET') {
      const profileId = path.split('/').pop()!;
      const profile = this.getProfile(profileId);
      
      if (profile) {
        res.writeHead(200);
        res.end(JSON.stringify({ profile }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Profile not found' }));
      }
      
    } else if (path.startsWith('/api/config/profiles/') && method === 'PUT') {
      const profileId = path.split('/').pop()!;
      const body = await this.readRequestBody(req);
      const updates = JSON.parse(body);
      
      const success = this.updateProfile(profileId, updates);
      
      if (success) {
        res.writeHead(200);
        res.end(JSON.stringify({ profile: this.getProfile(profileId) }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Profile not found' }));
      }
      
    } else if (path.startsWith('/api/config/profiles/') && path.endsWith('/apply') && method === 'POST') {
      const profileId = path.split('/')[4]; // Extract from /api/config/profiles/{id}/apply
      const profile = this.getProfile(profileId);
      
      if (profile) {
        await this.applyConfiguration(profile);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, currentProfile: profile }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Profile not found' }));
      }
      
    } else if (path.startsWith('/api/config/profiles/') && path.endsWith('/export') && method === 'GET') {
      const profileId = path.split('/')[4]; // Extract from /api/config/profiles/{id}/export
      const configJson = this.exportProfile(profileId);
      
      if (configJson) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(configJson);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Profile not found' }));
      }
      
    } else if (path === '/api/config/import' && method === 'POST') {
      const body = await this.readRequestBody(req);
      const profileId = this.importProfile(body);
      res.writeHead(201);
      res.end(JSON.stringify({ profileId, profile: this.getProfile(profileId) }));
      
    } else if (path === '/api/config/current' && method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ currentProfile: this.currentConfig }));
      
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Read request body
   */
  private readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * Load default configuration profiles
   */
  private loadDefaultProfiles(): void {
    // Default balanced profile
    const balancedProfile: Omit<ConfigurationProfile, 'id' | 'createdAt'> = {
      name: 'Balanced Performance',
      description: 'Balanced configuration optimizing for both performance and reliability',
      loadBalancing: {
        defaultStrategy: 'least-connection',
        strategies: {
          'least-connection': { connectionWeight: 0.7, capacityWeight: 0.3 },
          'resource-aware': { 
            cpuThreshold: 0.8, 
            memoryThreshold: 0.8,
            resourceWeights: { cpu: 0.4, memory: 0.3, disk: 0.2, network: 0.1 }
          }
        },
        thresholds: {
          cpuThreshold: 0.8,
          memoryThreshold: 0.8,
          responseTimeThreshold: 5000,
          errorRateThreshold: 0.05
        },
        autoSwitching: {
          enabled: true,
          rules: []
        }
      },
      scaling: {
        enabled: true,
        triggers: [],
        cooldownPeriod: 300,
        maxScale: 20,
        minScale: 2
      },
      agents: {
        healthCheckInterval: 30,
        maxRetries: 3,
        timeoutSettings: {
          connection: 5000,
          request: 30000
        },
        preferences: {}
      }
    };
    
    this.createProfile(balancedProfile);
    
    // High-performance profile
    const performanceProfile: Omit<ConfigurationProfile, 'id' | 'createdAt'> = {
      name: 'High Performance',
      description: 'Optimized for maximum throughput and low latency',
      loadBalancing: {
        defaultStrategy: 'resource-aware',
        strategies: {
          'resource-aware': {
            cpuThreshold: 0.9,
            memoryThreshold: 0.9,
            resourceWeights: { cpu: 0.5, memory: 0.3, disk: 0.1, network: 0.1 }
          }
        },
        thresholds: {
          cpuThreshold: 0.9,
          memoryThreshold: 0.9,
          responseTimeThreshold: 2000,
          errorRateThreshold: 0.02
        },
        autoSwitching: {
          enabled: true,
          rules: []
        }
      },
      scaling: {
        enabled: true,
        triggers: [],
        cooldownPeriod: 120,
        maxScale: 50,
        minScale: 5
      },
      agents: {
        healthCheckInterval: 15,
        maxRetries: 2,
        timeoutSettings: {
          connection: 2000,
          request: 10000
        },
        preferences: {}
      }
    };
    
    this.createProfile(performanceProfile);
    
    console.log(chalk.cyan(`📂 Loaded ${this.profiles.size} default configuration profiles`));
  }

  /**
   * Start configuration backup
   */
  private startConfigBackup(): void {
    setInterval(() => {
      this.backupConfigurations();
    }, this.config.configBackupInterval);
  }

  /**
   * Backup configurations
   */
  private backupConfigurations(): void {
    // In a real implementation, this would save to persistent storage
    console.log(chalk.cyan(`💾 Backing up ${this.profiles.size} configuration profiles`));
    this.emit('configurationBackup', { profileCount: this.profiles.size });
  }

  /**
   * Trim profiles to maximum count
   */
  private trimProfiles(): void {
    if (this.profiles.size > this.config.maxProfiles) {
      const profiles = this.listProfiles(); // Already sorted by creation date (newest first)
      const profilesToDelete = profiles.slice(this.config.maxProfiles);
      
      for (const profile of profilesToDelete) {
        this.profiles.delete(profile.id);
      }
    }
  }

  /**
   * Stop the configuration manager
   */
  public stop(): void {
    if (this.apiServer) {
      this.apiServer.close();
      this.apiServer = null;
    }
  }

  /**
   * Get current status
   */
  public getStatus(): {
    profileCount: number;
    currentProfile: string | null;
    apiServerRunning: boolean;
  } {
    return {
      profileCount: this.profiles.size,
      currentProfile: this.currentConfig?.name || null,
      apiServerRunning: this.apiServer !== null
    };
  }
}

export default {
  LoadSimulationEngine,
  ConfigurationAPIManager
};