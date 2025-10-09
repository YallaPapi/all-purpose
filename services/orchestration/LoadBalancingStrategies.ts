#!/usr/bin/env node

/**
 * Multiple Load Balancing Strategies Implementation
 * 
 * Implements four core load balancing strategies using the Strategy pattern:
 * - Round-Robin: Sequential and even distribution across agents
 * - Least-Connection: Routes to agent with fewest active connections
 * - Resource-Aware: Considers real-time resource metrics (CPU, memory, etc.)
 * - Capability-Weighted: Distributes based on agent processing power and capabilities
 * 
 * Features:
 * - Strategy pattern for modularity and extensibility
 * - Dynamic configuration switching at runtime
 * - Seamless strategy transitions without service disruption
 * - Custom weighting support for specialized tasks
 * - Comprehensive monitoring and metrics collection
 * - Configuration-driven strategy selection
 * 
 * Research-based implementation following distributed systems best practices
 * for load balancing algorithm design and implementation.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 228.2
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';

/**
 * Agent information for load balancing decisions
 */
export interface Agent {
  id: string;
  endpoint: string;
  status: 'active' | 'inactive' | 'maintenance';
  
  // Connection tracking
  activeConnections: number;
  maxConnections: number;
  
  // Resource metrics
  resources: {
    cpuUsage: number;        // 0-1 scale
    memoryUsage: number;     // 0-1 scale
    diskUsage: number;       // 0-1 scale
    networkUsage: number;    // 0-1 scale
    lastUpdated: Date;
  };
  
  // Capability metrics
  capabilities: {
    weight: number;          // Processing weight (1-10 scale)
    specializations: string[]; // List of specialized task types
    performanceScore: number; // Historical performance (0-1 scale)
    reliability: number;     // Reliability score (0-1 scale)
  };
  
  // Health metrics
  health: {
    isHealthy: boolean;
    responseTime: number;    // Average response time in ms
    errorRate: number;       // Error rate (0-1 scale)
    uptime: number;          // Uptime percentage (0-1 scale)
  };
}

/**
 * Request context for load balancing decisions
 */
export interface RequestContext {
  id: string;
  type: string;                    // Request/task type
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Resource requirements
  requirements: {
    cpu: number;                   // Required CPU (0-1 scale)
    memory: number;                // Required memory (0-1 scale)
    estimatedDuration: number;     // Estimated duration in ms
  };
  
  // Routing preferences
  preferences: {
    preferredAgents?: string[];    // Preferred agent IDs
    avoidAgents?: string[];        // Agents to avoid
    requireSpecialization?: string; // Required specialization
  };
  
  // SLA requirements
  sla: {
    maxResponseTime: number;       // Maximum acceptable response time
    requiredReliability: number;   // Required reliability (0-1 scale)
  };
}

/**
 * Strategy selection result
 */
export interface StrategyResult {
  selectedAgent: Agent | null;
  strategy: string;
  confidence: number;              // Selection confidence (0-1 scale)
  reasoning: string[];             // Human-readable selection reasons
  alternatives: {
    agent: Agent;
    score: number;
    reason: string;
  }[];
  metrics: {
    selectionTime: number;         // Time taken to select agent in ms
    agentsConsidered: number;      // Number of agents evaluated
    strategyOverhead: number;      // Strategy-specific overhead in ms
  };
}

/**
 * Strategy configuration
 */
export interface StrategyConfig {
  name: string;
  enabled: boolean;
  
  // General parameters
  healthCheckThreshold: number;    // Minimum health score (0-1)
  maxResponseTimeThreshold: number; // Maximum acceptable response time
  
  // Strategy-specific parameters
  parameters: {
    // Round-robin specific
    startIndex?: number;
    
    // Resource-aware specific
    cpuThreshold?: number;         // CPU usage threshold (0-1)
    memoryThreshold?: number;      // Memory usage threshold (0-1)
    resourceWeights?: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
    
    // Capability-weighted specific
    minWeight?: number;            // Minimum agent weight
    specializationBonus?: number;  // Bonus for specialization match
    performanceWeight?: number;    // Weight for performance score
    reliabilityWeight?: number;    // Weight for reliability score
    
    // Least-connection specific
    connectionWeight?: number;     // Weight for connection count
    capacityWeight?: number;       // Weight for connection capacity
  };
}

/**
 * Abstract base class for load balancing strategies
 */
export abstract class LoadBalancingStrategy extends EventEmitter {
  protected config: StrategyConfig;
  protected name: string;

  constructor(config: StrategyConfig) {
    super();
    this.config = config;
    this.name = config.name;
  }

  /**
   * Select the best agent for the given request
   */
  abstract selectAgent(agents: Agent[], request: RequestContext): Promise<StrategyResult>;

  /**
   * Update strategy configuration
   */
  public updateConfiguration(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configurationUpdated', { strategy: this.name, config: this.config });
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): StrategyConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Filter healthy and available agents
   */
  protected filterAvailableAgents(agents: Agent[], request: RequestContext): Agent[] {
    const startTime = Date.now();
    
    const availableAgents = agents.filter(agent => {
      // Check agent status
      if (agent.status !== 'active') {
        return false;
      }

      // Check health threshold
      if (!agent.health.isHealthy) {
        return false;
      }

      // Check response time threshold
      if (agent.health.responseTime > this.config.maxResponseTimeThreshold) {
        return false;
      }

      // Check SLA requirements
      if (agent.health.responseTime > request.sla.maxResponseTime) {
        return false;
      }

      if (agent.capabilities.reliability < request.sla.requiredReliability) {
        return false;
      }

      // Check resource capacity
      const resourceMargin = 0.1; // 10% safety margin
      if (agent.resources.cpuUsage + request.requirements.cpu + resourceMargin > 1.0) {
        return false;
      }

      if (agent.resources.memoryUsage + request.requirements.memory + resourceMargin > 1.0) {
        return false;
      }

      // Check connection capacity
      if (agent.activeConnections >= agent.maxConnections) {
        return false;
      }

      // Check preferences
      if (request.preferences.avoidAgents?.includes(agent.id)) {
        return false;
      }

      // Check specialization requirement
      if (request.preferences.requireSpecialization) {
        if (!agent.capabilities.specializations.includes(request.preferences.requireSpecialization)) {
          return false;
        }
      }

      return true;
    });

    const filterTime = Date.now() - startTime;
    this.emit('agentsFiltered', {
      strategy: this.name,
      totalAgents: agents.length,
      availableAgents: availableAgents.length,
      filterTime
    });

    return availableAgents;
  }

  /**
   * Create strategy result
   */
  protected createResult(
    selectedAgent: Agent | null,
    reasoning: string[],
    alternatives: StrategyResult['alternatives'],
    metrics: StrategyResult['metrics'],
    confidence: number = 0.8
  ): StrategyResult {
    return {
      selectedAgent,
      strategy: this.name,
      confidence,
      reasoning,
      alternatives,
      metrics
    };
  }
}

/**
 * Round-Robin Load Balancing Strategy
 * Distributes requests sequentially and evenly across all available agents
 */
export class RoundRobinStrategy extends LoadBalancingStrategy {
  private currentIndex: number = 0;
  private agentSelectionCount: Map<string, number> = new Map();

  constructor(config: Partial<StrategyConfig> = {}) {
    const defaultConfig: StrategyConfig = {
      name: 'round-robin',
      enabled: true,
      healthCheckThreshold: 0.7,
      maxResponseTimeThreshold: 5000,
      parameters: {
        startIndex: 0
      }
    };

    super({ ...defaultConfig, ...config });
    this.currentIndex = this.config.parameters.startIndex || 0;
  }

  async selectAgent(agents: Agent[], request: RequestContext): Promise<StrategyResult> {
    const startTime = Date.now();
    
    try {
      const availableAgents = this.filterAvailableAgents(agents, request);
      
      if (availableAgents.length === 0) {
        return this.createResult(
          null,
          ['No healthy agents available'],
          [],
          {
            selectionTime: Date.now() - startTime,
            agentsConsidered: agents.length,
            strategyOverhead: 0
          },
          0
        );
      }

      // Apply round-robin selection
      const selectedAgent = availableAgents[this.currentIndex % availableAgents.length];
      this.currentIndex = (this.currentIndex + 1) % availableAgents.length;

      // Update selection count
      const currentCount = this.agentSelectionCount.get(selectedAgent.id) || 0;
      this.agentSelectionCount.set(selectedAgent.id, currentCount + 1);

      // Generate alternatives (other agents in order)
      const alternatives = availableAgents
        .filter(agent => agent.id !== selectedAgent.id)
        .slice(0, 3)
        .map((agent, index) => ({
          agent,
          score: 1 - (index * 0.1), // Decreasing score based on round-robin order
          reason: `Next in round-robin sequence (position ${index + 1})`
        }));

      const reasoning = [
        `Selected via round-robin algorithm (index ${this.currentIndex - 1})`,
        `Agent has been selected ${this.agentSelectionCount.get(selectedAgent.id)} times`,
        `Evenly distributing load across ${availableAgents.length} available agents`
      ];

      this.emit('agentSelected', {
        strategy: this.name,
        agentId: selectedAgent.id,
        method: 'round-robin',
        index: this.currentIndex - 1
      });

      return this.createResult(
        selectedAgent,
        reasoning,
        alternatives,
        {
          selectionTime: Date.now() - startTime,
          agentsConsidered: availableAgents.length,
          strategyOverhead: 1 // Minimal overhead for round-robin
        },
        0.9 // High confidence for simple round-robin
      );

    } catch (error) {
      console.error(chalk.red(`❌ Error in round-robin strategy: ${error}`));
      this.emit('strategyError', { strategy: this.name, error });
      throw error;
    }
  }

  /**
   * Reset round-robin index
   */
  public resetIndex(): void {
    this.currentIndex = 0;
    this.agentSelectionCount.clear();
    this.emit('indexReset', { strategy: this.name });
  }

  /**
   * Get selection statistics
   */
  public getStatistics(): { currentIndex: number; selectionCounts: Record<string, number> } {
    return {
      currentIndex: this.currentIndex,
      selectionCounts: Object.fromEntries(this.agentSelectionCount)
    };
  }
}

/**
 * Least-Connection Load Balancing Strategy
 * Routes requests to the agent with the fewest active connections
 */
export class LeastConnectionStrategy extends LoadBalancingStrategy {
  private connectionHistory: Map<string, number[]> = new Map();

  constructor(config: Partial<StrategyConfig> = {}) {
    const defaultConfig: StrategyConfig = {
      name: 'least-connection',
      enabled: true,
      healthCheckThreshold: 0.7,
      maxResponseTimeThreshold: 5000,
      parameters: {
        connectionWeight: 0.7,
        capacityWeight: 0.3
      }
    };

    super({ ...defaultConfig, ...config });
  }

  async selectAgent(agents: Agent[], request: RequestContext): Promise<StrategyResult> {
    const startTime = Date.now();
    
    try {
      const availableAgents = this.filterAvailableAgents(agents, request);
      
      if (availableAgents.length === 0) {
        return this.createResult(
          null,
          ['No healthy agents available'],
          [],
          {
            selectionTime: Date.now() - startTime,
            agentsConsidered: agents.length,
            strategyOverhead: 0
          },
          0
        );
      }

      // Calculate scores for each agent
      const agentScores = availableAgents.map(agent => {
        const connectionRatio = agent.activeConnections / agent.maxConnections;
        const connectionScore = 1 - connectionRatio; // Lower connections = higher score
        
        // Consider connection capacity
        const capacityScore = (agent.maxConnections - agent.activeConnections) / agent.maxConnections;
        
        // Calculate weighted score
        const overallScore = (
          connectionScore * (this.config.parameters.connectionWeight || 0.7) +
          capacityScore * (this.config.parameters.capacityWeight || 0.3)
        );

        return {
          agent,
          score: overallScore,
          connectionRatio,
          availableCapacity: agent.maxConnections - agent.activeConnections
        };
      });

      // Sort by score (highest first)
      agentScores.sort((a, b) => b.score - a.score);
      
      const selectedAgent = agentScores[0].agent;
      const selectedScore = agentScores[0];

      // Update connection history
      this.updateConnectionHistory(selectedAgent.id, selectedAgent.activeConnections);

      // Generate alternatives
      const alternatives = agentScores
        .slice(1, 4)
        .map(item => ({
          agent: item.agent,
          score: item.score,
          reason: `${item.agent.activeConnections} active connections (${(item.connectionRatio * 100).toFixed(1)}% capacity)`
        }));

      const reasoning = [
        `Selected agent with lowest connection load (${selectedAgent.activeConnections}/${selectedAgent.maxConnections})`,
        `Connection utilization: ${(selectedScore.connectionRatio * 100).toFixed(1)}%`,
        `Available capacity: ${selectedScore.availableCapacity} connections`,
        `Weighted score: ${selectedScore.score.toFixed(3)}`
      ];

      this.emit('agentSelected', {
        strategy: this.name,
        agentId: selectedAgent.id,
        method: 'least-connection',
        activeConnections: selectedAgent.activeConnections,
        score: selectedScore.score
      });

      return this.createResult(
        selectedAgent,
        reasoning,
        alternatives,
        {
          selectionTime: Date.now() - startTime,
          agentsConsidered: availableAgents.length,
          strategyOverhead: 5 // Moderate overhead for connection tracking
        },
        0.85 // Good confidence based on real-time connection data
      );

    } catch (error) {
      console.error(chalk.red(`❌ Error in least-connection strategy: ${error}`));
      this.emit('strategyError', { strategy: this.name, error });
      throw error;
    }
  }

  /**
   * Update connection history for analysis
   */
  private updateConnectionHistory(agentId: string, connectionCount: number): void {
    const history = this.connectionHistory.get(agentId) || [];
    history.push(connectionCount);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.connectionHistory.set(agentId, history);
  }

  /**
   * Get connection statistics
   */
  public getStatistics(): Record<string, { current: number; average: number; trend: string }> {
    const stats: Record<string, { current: number; average: number; trend: string }> = {};
    
    for (const [agentId, history] of this.connectionHistory.entries()) {
      if (history.length > 0) {
        const current = history[history.length - 1];
        const average = history.reduce((sum, val) => sum + val, 0) / history.length;
        
        let trend = 'stable';
        if (history.length >= 2) {
          const recent = history.slice(-5);
          const older = history.slice(-10, -5);
          
          if (recent.length > 0 && older.length > 0) {
            const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
            const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
            
            if (recentAvg > olderAvg * 1.1) trend = 'increasing';
            else if (recentAvg < olderAvg * 0.9) trend = 'decreasing';
          }
        }
        
        stats[agentId] = { current, average, trend };
      }
    }
    
    return stats;
  }
}

/**
 * Resource-Aware Load Balancing Strategy
 * Considers real-time resource metrics (CPU, memory, disk, network) for agent selection
 */
export class ResourceAwareStrategy extends LoadBalancingStrategy {
  private resourceHistory: Map<string, Agent['resources'][]> = new Map();

  constructor(config: Partial<StrategyConfig> = {}) {
    const defaultConfig: StrategyConfig = {
      name: 'resource-aware',
      enabled: true,
      healthCheckThreshold: 0.7,
      maxResponseTimeThreshold: 5000,
      parameters: {
        cpuThreshold: 0.8,
        memoryThreshold: 0.8,
        resourceWeights: {
          cpu: 0.4,
          memory: 0.3,
          disk: 0.2,
          network: 0.1
        }
      }
    };

    super({ ...defaultConfig, ...config });
  }

  async selectAgent(agents: Agent[], request: RequestContext): Promise<StrategyResult> {
    const startTime = Date.now();
    
    try {
      let availableAgents = this.filterAvailableAgents(agents, request);
      
      // Additional resource-based filtering
      availableAgents = availableAgents.filter(agent => {
        return (
          agent.resources.cpuUsage < (this.config.parameters.cpuThreshold || 0.8) &&
          agent.resources.memoryUsage < (this.config.parameters.memoryThreshold || 0.8)
        );
      });
      
      if (availableAgents.length === 0) {
        return this.createResult(
          null,
          ['No agents with sufficient resources available'],
          [],
          {
            selectionTime: Date.now() - startTime,
            agentsConsidered: agents.length,
            strategyOverhead: 0
          },
          0
        );
      }

      // Calculate resource scores for each agent
      const agentScores = availableAgents.map(agent => {
        const weights = this.config.parameters.resourceWeights || {
          cpu: 0.4, memory: 0.3, disk: 0.2, network: 0.1
        };
        
        // Calculate individual resource scores (1 - usage = availability)
        const cpuScore = 1 - agent.resources.cpuUsage;
        const memoryScore = 1 - agent.resources.memoryUsage;
        const diskScore = 1 - agent.resources.diskUsage;
        const networkScore = 1 - agent.resources.networkUsage;
        
        // Calculate weighted resource score
        const resourceScore = (
          cpuScore * weights.cpu +
          memoryScore * weights.memory +
          diskScore * weights.disk +
          networkScore * weights.network
        );
        
        // Consider request requirements
        const cpuFit = (1 - agent.resources.cpuUsage) >= request.requirements.cpu ? 1 : 0.5;
        const memoryFit = (1 - agent.resources.memoryUsage) >= request.requirements.memory ? 1 : 0.5;
        const requirementScore = (cpuFit + memoryFit) / 2;
        
        // Calculate final score
        const overallScore = resourceScore * 0.7 + requirementScore * 0.3;
        
        return {
          agent,
          score: overallScore,
          resourceScore,
          requirementScore,
          breakdown: {
            cpu: cpuScore,
            memory: memoryScore,
            disk: diskScore,
            network: networkScore
          }
        };
      });

      // Sort by score (highest first)
      agentScores.sort((a, b) => b.score - a.score);
      
      const selectedAgent = agentScores[0].agent;
      const selectedScore = agentScores[0];

      // Update resource history
      this.updateResourceHistory(selectedAgent.id, selectedAgent.resources);

      // Generate alternatives
      const alternatives = agentScores
        .slice(1, 4)
        .map(item => ({
          agent: item.agent,
          score: item.score,
          reason: `Resource score: ${item.resourceScore.toFixed(3)} (CPU: ${(item.breakdown.cpu * 100).toFixed(1)}%, Memory: ${(item.breakdown.memory * 100).toFixed(1)}%)`
        }));

      const reasoning = [
        `Selected agent with best resource availability (score: ${selectedScore.score.toFixed(3)})`,
        `CPU usage: ${(selectedAgent.resources.cpuUsage * 100).toFixed(1)}% (${((1 - selectedAgent.resources.cpuUsage) * 100).toFixed(1)}% available)`,
        `Memory usage: ${(selectedAgent.resources.memoryUsage * 100).toFixed(1)}% (${((1 - selectedAgent.resources.memoryUsage) * 100).toFixed(1)}% available)`,
        `Resource requirements satisfied: CPU ${request.requirements.cpu > 0 ? '✓' : '-'}, Memory ${request.requirements.memory > 0 ? '✓' : '-'}`
      ];

      this.emit('agentSelected', {
        strategy: this.name,
        agentId: selectedAgent.id,
        method: 'resource-aware',
        resourceScore: selectedScore.resourceScore,
        cpuUsage: selectedAgent.resources.cpuUsage,
        memoryUsage: selectedAgent.resources.memoryUsage
      });

      return this.createResult(
        selectedAgent,
        reasoning,
        alternatives,
        {
          selectionTime: Date.now() - startTime,
          agentsConsidered: availableAgents.length,
          strategyOverhead: 8 // Higher overhead for resource analysis
        },
        0.9 // High confidence based on detailed resource analysis
      );

    } catch (error) {
      console.error(chalk.red(`❌ Error in resource-aware strategy: ${error}`));
      this.emit('strategyError', { strategy: this.name, error });
      throw error;
    }
  }

  /**
   * Update resource history for trend analysis
   */
  private updateResourceHistory(agentId: string, resources: Agent['resources']): void {
    const history = this.resourceHistory.get(agentId) || [];
    history.push({ ...resources });
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.resourceHistory.set(agentId, history);
  }

  /**
   * Get resource statistics and trends
   */
  public getStatistics(): Record<string, {
    current: Agent['resources'];
    average: Partial<Agent['resources']>;
    trends: {
      cpu: string;
      memory: string;
      disk: string;
      network: string;
    };
  }> {
    const stats: Record<string, any> = {};
    
    for (const [agentId, history] of this.resourceHistory.entries()) {
      if (history.length > 0) {
        const current = history[history.length - 1];
        
        // Calculate averages
        const average = {
          cpuUsage: history.reduce((sum, r) => sum + r.cpuUsage, 0) / history.length,
          memoryUsage: history.reduce((sum, r) => sum + r.memoryUsage, 0) / history.length,
          diskUsage: history.reduce((sum, r) => sum + r.diskUsage, 0) / history.length,
          networkUsage: history.reduce((sum, r) => sum + r.networkUsage, 0) / history.length
        };
        
        // Calculate trends
        const trends = {
          cpu: this.calculateResourceTrend(history.map(r => r.cpuUsage)),
          memory: this.calculateResourceTrend(history.map(r => r.memoryUsage)),
          disk: this.calculateResourceTrend(history.map(r => r.diskUsage)),
          network: this.calculateResourceTrend(history.map(r => r.networkUsage))
        };
        
        stats[agentId] = { current, average, trends };
      }
    }
    
    return stats;
  }

  /**
   * Calculate resource trend
   */
  private calculateResourceTrend(values: number[]): string {
    if (values.length < 5) return 'stable';
    
    const recent = values.slice(-5);
    const older = values.slice(-10, -5);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.1) return 'increasing';
    if (recentAvg < olderAvg * 0.9) return 'decreasing';
    return 'stable';
  }
}

/**
 * Capability-Weighted Load Balancing Strategy
 * Distributes requests based on agent processing power, specializations, and historical performance
 */
export class CapabilityWeightedStrategy extends LoadBalancingStrategy {
  private performanceHistory: Map<string, number[]> = new Map();
  private specializationMatches: Map<string, number> = new Map();

  constructor(config: Partial<StrategyConfig> = {}) {
    const defaultConfig: StrategyConfig = {
      name: 'capability-weighted',
      enabled: true,
      healthCheckThreshold: 0.7,
      maxResponseTimeThreshold: 5000,
      parameters: {
        minWeight: 1,
        specializationBonus: 0.2,
        performanceWeight: 0.4,
        reliabilityWeight: 0.3
      }
    };

    super({ ...defaultConfig, ...config });
  }

  async selectAgent(agents: Agent[], request: RequestContext): Promise<StrategyResult> {
    const startTime = Date.now();
    
    try {
      let availableAgents = this.filterAvailableAgents(agents, request);
      
      // Additional capability-based filtering
      availableAgents = availableAgents.filter(agent => {
        return agent.capabilities.weight >= (this.config.parameters.minWeight || 1);
      });
      
      if (availableAgents.length === 0) {
        return this.createResult(
          null,
          ['No agents with sufficient capabilities available'],
          [],
          {
            selectionTime: Date.now() - startTime,
            agentsConsidered: agents.length,
            strategyOverhead: 0
          },
          0
        );
      }

      // Calculate capability scores for each agent
      const agentScores = availableAgents.map(agent => {
        // Base weight score (normalized to 0-1)
        const weightScore = Math.min(1, agent.capabilities.weight / 10);
        
        // Performance score
        const performanceScore = agent.capabilities.performanceScore;
        
        // Reliability score
        const reliabilityScore = agent.capabilities.reliability;
        
        // Specialization score
        let specializationScore = 0;
        if (request.preferences.requireSpecialization) {
          if (agent.capabilities.specializations.includes(request.preferences.requireSpecialization)) {
            specializationScore = 1;
            // Track specialization matches
            const matches = this.specializationMatches.get(agent.id) || 0;
            this.specializationMatches.set(agent.id, matches + 1);
          }
        }
        
        // Priority-based weighting
        const priorityMultiplier = this.getPriorityMultiplier(request.priority);
        
        // Calculate weighted score
        const baseScore = (
          weightScore * 0.3 +
          performanceScore * (this.config.parameters.performanceWeight || 0.4) +
          reliabilityScore * (this.config.parameters.reliabilityWeight || 0.3)
        );
        
        // Apply specialization bonus
        const specializationBonus = specializationScore * (this.config.parameters.specializationBonus || 0.2);
        
        // Final score with priority adjustment
        const overallScore = (baseScore + specializationBonus) * priorityMultiplier;
        
        return {
          agent,
          score: overallScore,
          breakdown: {
            weight: weightScore,
            performance: performanceScore,
            reliability: reliabilityScore,
            specialization: specializationScore,
            priority: priorityMultiplier
          }
        };
      });

      // Sort by score (highest first)
      agentScores.sort((a, b) => b.score - a.score);
      
      const selectedAgent = agentScores[0].agent;
      const selectedScore = agentScores[0];

      // Update performance history
      this.updatePerformanceHistory(selectedAgent.id, selectedScore.score);

      // Generate alternatives
      const alternatives = agentScores
        .slice(1, 4)
        .map(item => ({
          agent: item.agent,
          score: item.score,
          reason: `Capability score: ${item.score.toFixed(3)} (Weight: ${item.agent.capabilities.weight}, Performance: ${(item.breakdown.performance * 100).toFixed(1)}%)`
        }));

      const reasoning = [
        `Selected agent with highest capability score (${selectedScore.score.toFixed(3)})`,
        `Agent weight: ${selectedAgent.capabilities.weight}/10`,
        `Performance score: ${(selectedScore.breakdown.performance * 100).toFixed(1)}%`,
        `Reliability score: ${(selectedScore.breakdown.reliability * 100).toFixed(1)}%`,
        `Specialization match: ${selectedScore.breakdown.specialization > 0 ? '✓' : '✗'}`,
        `Priority multiplier: ${selectedScore.breakdown.priority.toFixed(2)}x`
      ];

      this.emit('agentSelected', {
        strategy: this.name,
        agentId: selectedAgent.id,
        method: 'capability-weighted',
        capabilityScore: selectedScore.score,
        weight: selectedAgent.capabilities.weight,
        specialization: selectedScore.breakdown.specialization > 0
      });

      return this.createResult(
        selectedAgent,
        reasoning,
        alternatives,
        {
          selectionTime: Date.now() - startTime,
          agentsConsidered: availableAgents.length,
          strategyOverhead: 12 // Higher overhead for capability analysis
        },
        0.95 // Very high confidence based on comprehensive capability analysis
      );

    } catch (error) {
      console.error(chalk.red(`❌ Error in capability-weighted strategy: ${error}`));
      this.emit('strategyError', { strategy: this.name, error });
      throw error;
    }
  }

  /**
   * Get priority multiplier based on request priority
   */
  private getPriorityMultiplier(priority: RequestContext['priority']): number {
    const multipliers = {
      critical: 1.5,
      high: 1.2,
      medium: 1.0,
      low: 0.8
    };
    
    return multipliers[priority] || 1.0;
  }

  /**
   * Update performance history for trend analysis
   */
  private updatePerformanceHistory(agentId: string, score: number): void {
    const history = this.performanceHistory.get(agentId) || [];
    history.push(score);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.performanceHistory.set(agentId, history);
  }

  /**
   * Get capability statistics
   */
  public getStatistics(): {
    performanceHistory: Record<string, { current: number; average: number; trend: string }>;
    specializationMatches: Record<string, number>;
    topPerformers: { agentId: string; averageScore: number }[];
  } {
    const performanceHistory: Record<string, { current: number; average: number; trend: string }> = {};
    
    for (const [agentId, history] of this.performanceHistory.entries()) {
      if (history.length > 0) {
        const current = history[history.length - 1];
        const average = history.reduce((sum, val) => sum + val, 0) / history.length;
        
        let trend = 'stable';
        if (history.length >= 10) {
          const recent = history.slice(-5);
          const older = history.slice(-10, -5);
          
          const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
          const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
          
          if (recentAvg > olderAvg * 1.05) trend = 'improving';
          else if (recentAvg < olderAvg * 0.95) trend = 'declining';
        }
        
        performanceHistory[agentId] = { current, average, trend };
      }
    }
    
    // Calculate top performers
    const topPerformers = Object.entries(performanceHistory)
      .map(([agentId, stats]) => ({ agentId, averageScore: stats.average }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
    
    return {
      performanceHistory,
      specializationMatches: Object.fromEntries(this.specializationMatches),
      topPerformers
    };
  }
}

/**
 * Strategy Manager for dynamic strategy selection and switching
 */
export class StrategyManager extends EventEmitter {
  private strategies: Map<string, LoadBalancingStrategy> = new Map();
  private currentStrategy: string = 'round-robin';
  private strategyHistory: { strategy: string; timestamp: Date; reason: string }[] = [];
  
  // Auto-switching configuration
  private autoSwitching: {
    enabled: boolean;
    rules: {
      condition: string;
      targetStrategy: string;
      threshold: number;
    }[];
  } = {
    enabled: false,
    rules: []
  };

  constructor() {
    super();
    this.initializeDefaultStrategies();
    this.startPeriodicEvaluation();
  }

  /**
   * Initialize default strategies
   */
  private initializeDefaultStrategies(): void {
    this.addStrategy(new RoundRobinStrategy());
    this.addStrategy(new LeastConnectionStrategy());
    this.addStrategy(new ResourceAwareStrategy());
    this.addStrategy(new CapabilityWeightedStrategy());
  }

  /**
   * Add a strategy to the manager
   */
  public addStrategy(strategy: LoadBalancingStrategy): void {
    this.strategies.set(strategy.getConfiguration().name, strategy);
    
    // Forward strategy events
    strategy.on('agentSelected', (data) => {
      this.emit('agentSelected', { ...data, manager: 'strategy-manager' });
    });
    
    strategy.on('strategyError', (data) => {
      this.emit('strategyError', { ...data, manager: 'strategy-manager' });
    });
    
    this.emit('strategyAdded', { 
      strategyName: strategy.getConfiguration().name,
      totalStrategies: this.strategies.size
    });
  }

  /**
   * Remove a strategy from the manager
   */
  public removeStrategy(strategyName: string): boolean {
    const removed = this.strategies.delete(strategyName);
    
    if (removed) {
      // Switch to default if current strategy was removed
      if (this.currentStrategy === strategyName) {
        this.setCurrentStrategy('round-robin', 'Current strategy was removed');
      }
      
      this.emit('strategyRemoved', { 
        strategyName,
        totalStrategies: this.strategies.size
      });
    }
    
    return removed;
  }

  /**
   * Set current strategy
   */
  public setCurrentStrategy(strategyName: string, reason: string = 'Manual selection'): boolean {
    if (!this.strategies.has(strategyName)) {
      return false;
    }
    
    const previousStrategy = this.currentStrategy;
    this.currentStrategy = strategyName;
    
    // Record strategy switch
    this.strategyHistory.push({
      strategy: strategyName,
      timestamp: new Date(),
      reason
    });
    
    // Keep only last 100 switches
    if (this.strategyHistory.length > 100) {
      this.strategyHistory.splice(0, this.strategyHistory.length - 100);
    }
    
    this.emit('strategyChanged', {
      previousStrategy,
      newStrategy: strategyName,
      reason,
      timestamp: new Date()
    });
    
    return true;
  }

  /**
   * Get current strategy
   */
  public getCurrentStrategy(): LoadBalancingStrategy | null {
    return this.strategies.get(this.currentStrategy) || null;
  }

  /**
   * Select agent using current strategy
   */
  public async selectAgent(agents: Agent[], request: RequestContext): Promise<StrategyResult> {
    const strategy = this.getCurrentStrategy();
    
    if (!strategy) {
      throw new Error(`Current strategy '${this.currentStrategy}' not found`);
    }
    
    const result = await strategy.selectAgent(agents, request);
    
    // Check if auto-switching should be triggered
    if (this.autoSwitching.enabled) {
      this.evaluateAutoSwitching(result, agents);
    }
    
    return result;
  }

  /**
   * Configure auto-switching rules
   */
  public configureAutoSwitching(config: StrategyManager['autoSwitching']): void {
    this.autoSwitching = config;
    this.emit('autoSwitchingConfigured', config);
  }

  /**
   * Evaluate auto-switching rules
   */
  private evaluateAutoSwitching(result: StrategyResult, agents: Agent[]): void {
    for (const rule of this.autoSwitching.rules) {
      let shouldSwitch = false;
      
      switch (rule.condition) {
        case 'low_confidence':
          shouldSwitch = result.confidence < rule.threshold;
          break;
          
        case 'high_response_time':
          if (result.selectedAgent) {
            shouldSwitch = result.selectedAgent.health.responseTime > rule.threshold;
          }
          break;
          
        case 'high_error_rate':
          if (result.selectedAgent) {
            shouldSwitch = result.selectedAgent.health.errorRate > rule.threshold;
          }
          break;
          
        case 'resource_pressure':
          const avgResourceUsage = agents.reduce((sum, agent) => {
            return sum + (agent.resources.cpuUsage + agent.resources.memoryUsage) / 2;
          }, 0) / agents.length;
          shouldSwitch = avgResourceUsage > rule.threshold;
          break;
      }
      
      if (shouldSwitch && rule.targetStrategy !== this.currentStrategy) {
        this.setCurrentStrategy(rule.targetStrategy, `Auto-switch: ${rule.condition} threshold exceeded`);
        break; // Only apply first matching rule
      }
    }
  }

  /**
   * Start periodic strategy evaluation
   */
  private startPeriodicEvaluation(): void {
    setInterval(() => {
      this.evaluateStrategies();
    }, 60000); // Evaluate every minute
  }

  /**
   * Evaluate all strategies and provide recommendations
   */
  private evaluateStrategies(): void {
    const strategyStats = new Map<string, any>();
    
    for (const [name, strategy] of this.strategies) {
      let stats = {};
      
      // Get strategy-specific statistics
      if (strategy instanceof RoundRobinStrategy) {
        stats = strategy.getStatistics();
      } else if (strategy instanceof LeastConnectionStrategy) {
        stats = strategy.getStatistics();
      } else if (strategy instanceof ResourceAwareStrategy) {
        stats = strategy.getStatistics();
      } else if (strategy instanceof CapabilityWeightedStrategy) {
        stats = strategy.getStatistics();
      }
      
      strategyStats.set(name, {
        config: strategy.getConfiguration(),
        stats,
        isActive: name === this.currentStrategy
      });
    }
    
    this.emit('strategiesEvaluated', {
      currentStrategy: this.currentStrategy,
      strategies: Object.fromEntries(strategyStats),
      timestamp: new Date()
    });
  }

  /**
   * Get available strategies
   */
  public getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get strategy history
   */
  public getStrategyHistory(): { strategy: string; timestamp: Date; reason: string }[] {
    return [...this.strategyHistory];
  }

  /**
   * Get comprehensive statistics
   */
  public getStatistics(): {
    currentStrategy: string;
    totalStrategies: number;
    strategyHistory: { strategy: string; timestamp: Date; reason: string }[];
    autoSwitching: StrategyManager['autoSwitching'];
  } {
    return {
      currentStrategy: this.currentStrategy,
      totalStrategies: this.strategies.size,
      strategyHistory: this.getStrategyHistory(),
      autoSwitching: this.autoSwitching
    };
  }
}

export default {
  LoadBalancingStrategy,
  RoundRobinStrategy,
  LeastConnectionStrategy,
  ResourceAwareStrategy,
  CapabilityWeightedStrategy,
  StrategyManager
};