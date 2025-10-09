#!/usr/bin/env node

/**
 * UEP Capability Matching Engine
 * 
 * Advanced capability matching and negotiation algorithms for UEP system with
 * version compatibility, intelligent agent selection, performance-based ranking,
 * constraint satisfaction, and multi-criteria decision making.
 * 
 * Research-based implementation features:
 * - Semantic version compatibility checking with range support
 * - Multi-criteria decision making (MCDM) with configurable weights
 * - Performance-based ranking with real-time metrics
 * - Constraint satisfaction problem (CSP) solving
 * - Contract Net Protocol for agent negotiation
 * - Fallback and escalation mechanisms
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.4
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';
import {
  AgentCapability,
  CapabilityRequirement,
  CompatibilityResult,
  CapabilitySearchResult,
  SemVer,
  VersionRange,
  PerformanceMetrics
} from '../types/CapabilitySchema.js';
import {
  checkCapabilityCompatibility,
  satisfiesVersionRange,
  calculateVersionCompatibilityScore,
  compareSemVer
} from '../utils/CapabilityVersioning.js';

/**
 * Matching criteria with configurable weights
 */
export interface MatchingCriteria {
  // Version compatibility
  versionWeight: number;                    // Weight for version compatibility (0-1)
  allowPrerelease: boolean;                 // Allow pre-release versions
  
  // Performance criteria
  performanceWeight: number;                // Weight for performance metrics (0-1)
  latencyWeight: number;                    // Weight for latency in performance score
  throughputWeight: number;                 // Weight for throughput in performance score
  reliabilityWeight: number;                // Weight for reliability in performance score
  
  // Constraint satisfaction
  constraintWeight: number;                 // Weight for constraint satisfaction (0-1)
  hardConstraints: boolean;                 // Treat constraints as hard requirements
  
  // Agent selection preferences
  preferStable: boolean;                    // Prefer stable (non-prerelease) versions
  preferLatest: boolean;                    // Prefer latest compatible version
  loadBalancing: 'round-robin' | 'least-loaded' | 'random' | 'performance'; // Load balancing strategy
  
  // Negotiation settings
  enableNegotiation: boolean;               // Enable negotiation for ties
  negotiationTimeout: number;               // Negotiation timeout in ms
  maxCandidates: number;                    // Maximum candidates for negotiation
}

/**
 * Agent performance data for ranking
 */
export interface AgentPerformanceData {
  agentId: string;
  capability: AgentCapability;
  metrics: {
    averageLatency: number;                 // Average response time in ms
    throughput: number;                     // Requests per second
    successRate: number;                    // Success rate (0-1)
    availability: number;                   // Availability percentage (0-1)
    currentLoad: number;                    // Current load percentage (0-1)
    lastUpdated: Date;                      // Last metrics update
  };
  constraints: {
    satisfied: boolean;                     // Are all constraints satisfied
    violations: string[];                   // List of constraint violations
    score: number;                          // Constraint satisfaction score (0-1)
  };
}

/**
 * Matching result with detailed scoring
 */
export interface MatchingResult {
  agentId: string;
  capability: AgentCapability;
  compatibilityScore: number;               // Version compatibility score (0-1)
  performanceScore: number;                 // Performance score (0-1)
  constraintScore: number;                  // Constraint satisfaction score (0-1)
  overallScore: number;                     // Weighted overall score (0-1)
  ranking: number;                          // Final ranking position
  matchReasons: string[];                   // Reasons for match
  performanceData?: AgentPerformanceData;   // Detailed performance data
  negotiationData?: NegotiationData;        // Negotiation results if applicable
}

/**
 * Negotiation data for contract net protocol
 */
export interface NegotiationData {
  bidId: string;                            // Unique bid identifier
  bidPrice: number;                         // Bid price/score
  estimatedLatency: number;                 // Estimated response time
  availability: Date;                       // Earliest availability
  terms: Record<string, any>;               // Additional negotiation terms
  confidence: number;                       // Confidence in bid (0-1)
}

/**
 * Negotiation request for contract net protocol
 */
export interface NegotiationRequest {
  requestId: string;                        // Unique request identifier
  requirement: CapabilityRequirement;       // Capability requirement
  constraints: Record<string, any>;         // Additional constraints
  deadline: Date;                           // Response deadline
  maxBids: number;                          // Maximum number of bids to accept
  criteria: MatchingCriteria;               // Matching criteria
}

/**
 * Capability Matching Engine class
 */
export class CapabilityMatchingEngine extends EventEmitter {
  private criteria: MatchingCriteria;
  private performanceCache: Map<string, AgentPerformanceData> = new Map();
  private negotiationRequests: Map<string, NegotiationRequest> = new Map();
  private loadBalancingCounters: Map<string, number> = new Map();

  constructor(criteria: Partial<MatchingCriteria> = {}) {
    super();
    
    // Apply intelligent defaults
    this.criteria = {
      versionWeight: 0.3,
      allowPrerelease: false,
      performanceWeight: 0.4,
      latencyWeight: 0.4,
      throughputWeight: 0.3,
      reliabilityWeight: 0.3,
      constraintWeight: 0.3,
      hardConstraints: true,
      preferStable: true,
      preferLatest: true,
      loadBalancing: 'performance',
      enableNegotiation: true,
      negotiationTimeout: 5000,
      maxCandidates: 5,
      ...criteria
    };
  }

  /**
   * Find best matching agents for a capability requirement
   */
  public async findBestMatches(
    requirement: CapabilityRequirement,
    availableAgents: CapabilitySearchResult[],
    performanceData?: Map<string, AgentPerformanceData>
  ): Promise<MatchingResult[]> {
    try {
      console.log(chalk.blue(`🔍 Finding best matches for capability: ${requirement.capabilityId}`));
      
      // Update performance cache if provided
      if (performanceData) {
        for (const [agentId, data] of performanceData) {
          this.performanceCache.set(agentId, data);
        }
      }
      
      // Step 1: Filter compatible agents
      const compatibleAgents = this.filterCompatibleAgents(requirement, availableAgents);
      console.log(chalk.cyan(`📋 Found ${compatibleAgents.length} compatible agents`));
      
      if (compatibleAgents.length === 0) {
        return [];
      }
      
      // Step 2: Calculate detailed scores for each compatible agent
      const scoredResults = await this.calculateDetailedScores(requirement, compatibleAgents);
      
      // Step 3: Apply constraint satisfaction
      const constraintSatisfiedResults = this.applyConstraintSatisfaction(requirement, scoredResults);
      
      // Step 4: Rank agents using multi-criteria decision making
      const rankedResults = this.rankAgentsByMCDM(constraintSatisfiedResults);
      
      // Step 5: Apply load balancing strategy
      const loadBalancedResults = this.applyLoadBalancing(rankedResults);
      
      // Step 6: Handle negotiation if enabled and multiple top candidates
      const finalResults = this.criteria.enableNegotiation 
        ? await this.handleNegotiation(requirement, loadBalancedResults)
        : loadBalancedResults;
      
      console.log(chalk.green(`✅ Found ${finalResults.length} ranked matches`));
      
      this.emit('matchingCompleted', {
        requirement,
        results: finalResults,
        totalCandidates: availableAgents.length,
        compatibleCandidates: compatibleAgents.length
      });
      
      return finalResults;
      
    } catch (error) {
      console.error(chalk.red('❌ Error in capability matching:'), error);
      this.emit('matchingError', { requirement, error });
      throw error;
    }
  }

  /**
   * Filter agents based on version compatibility and basic requirements
   */
  private filterCompatibleAgents(
    requirement: CapabilityRequirement,
    availableAgents: CapabilitySearchResult[]
  ): CapabilitySearchResult[] {
    return availableAgents.filter(agent => {
      // Check capability ID match
      const capabilityMatch = agent.capability.id === requirement.capabilityId ||
                             requirement.alternatives?.includes(agent.capability.id);
      
      if (!capabilityMatch) {
        return false;
      }
      
      // Check version compatibility
      if (requirement.versionRange) {
        const versionCompatible = satisfiesVersionRange(
          agent.capability.version,
          requirement.versionRange
        );
        
        if (!versionCompatible) {
          return false;
        }
      }
      
      // Check prerelease preference
      if (!this.criteria.allowPrerelease && agent.capability.version.prerelease) {
        return false;
      }
      
      // Check basic constraints
      if (this.criteria.hardConstraints && requirement.constraints) {
        const compatibility = checkCapabilityCompatibility(agent.capability, requirement);
        if (!compatibility.compatible) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Calculate detailed scores for compatible agents
   */
  private async calculateDetailedScores(
    requirement: CapabilityRequirement,
    compatibleAgents: CapabilitySearchResult[]
  ): Promise<MatchingResult[]> {
    const results: MatchingResult[] = [];
    
    for (const agent of compatibleAgents) {
      const performanceData = this.performanceCache.get(agent.agentId);
      
      // Calculate version compatibility score
      const compatibilityScore = requirement.versionRange
        ? calculateVersionCompatibilityScore(agent.capability.version, requirement.versionRange)
        : 1.0;
      
      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(agent.capability, performanceData);
      
      // Calculate constraint satisfaction score
      const constraintScore = this.calculateConstraintScore(agent.capability, requirement);
      
      // Calculate weighted overall score
      const overallScore = (
        compatibilityScore * this.criteria.versionWeight +
        performanceScore * this.criteria.performanceWeight +
        constraintScore * this.criteria.constraintWeight
      );
      
      const matchReasons = this.generateMatchReasons(
        agent.capability,
        requirement,
        compatibilityScore,
        performanceScore,
        constraintScore
      );
      
      results.push({
        agentId: agent.agentId,
        capability: agent.capability,
        compatibilityScore,
        performanceScore,
        constraintScore,
        overallScore,
        ranking: 0, // Will be set during ranking
        matchReasons,
        performanceData
      });
    }
    
    return results;
  }

  /**
   * Calculate performance score based on metrics
   */
  private calculatePerformanceScore(
    capability: AgentCapability,
    performanceData?: AgentPerformanceData
  ): number {
    if (!performanceData) {
      // Fallback to capability's declared performance metrics
      if (capability.performance) {
        const latencyScore = capability.performance.averageLatency 
          ? Math.max(0, 1 - (capability.performance.averageLatency / 10000)) // Normalize to 10s max
          : 0.5;
        
        const throughputScore = capability.performance.throughput 
          ? Math.min(1, capability.performance.throughput / 1000) // Normalize to 1000 req/s max
          : 0.5;
        
        const reliabilityScore = capability.reliability?.successRate || 0.9;
        
        return (
          latencyScore * this.criteria.latencyWeight +
          throughputScore * this.criteria.throughputWeight +
          reliabilityScore * this.criteria.reliabilityWeight
        );
      }
      
      return 0.5; // Default score when no performance data available
    }
    
    // Calculate score from real-time metrics
    const latencyScore = Math.max(0, 1 - (performanceData.metrics.averageLatency / 10000));
    const throughputScore = Math.min(1, performanceData.metrics.throughput / 1000);
    const reliabilityScore = performanceData.metrics.successRate;
    const availabilityScore = performanceData.metrics.availability;
    const loadScore = 1 - performanceData.metrics.currentLoad; // Lower load is better
    
    return (
      latencyScore * this.criteria.latencyWeight +
      throughputScore * this.criteria.throughputWeight +
      reliabilityScore * this.criteria.reliabilityWeight +
      availabilityScore * 0.1 + // Small weight for availability
      loadScore * 0.1 // Small weight for current load
    );
  }

  /**
   * Calculate constraint satisfaction score
   */
  private calculateConstraintScore(
    capability: AgentCapability,
    requirement: CapabilityRequirement
  ): number {
    if (!requirement.constraints) {
      return 1.0; // No constraints to satisfy
    }
    
    const compatibility = checkCapabilityCompatibility(capability, requirement);
    
    if (compatibility.constraintCompatible === false) {
      return this.criteria.hardConstraints ? 0 : 0.1; // Low score for violations
    }
    
    return compatibility.score || 1.0;
  }

  /**
   * Apply constraint satisfaction filtering
   */
  private applyConstraintSatisfaction(
    requirement: CapabilityRequirement,
    scoredResults: MatchingResult[]
  ): MatchingResult[] {
    if (!this.criteria.hardConstraints) {
      return scoredResults; // Soft constraints already handled in scoring
    }
    
    return scoredResults.filter(result => {
      const compatibility = checkCapabilityCompatibility(result.capability, requirement);
      return compatibility.constraintCompatible !== false;
    });
  }

  /**
   * Rank agents using multi-criteria decision making (MCDM)
   */
  private rankAgentsByMCDM(results: MatchingResult[]): MatchingResult[] {
    // Sort by overall score (descending)
    const sorted = results.sort((a, b) => b.overallScore - a.overallScore);
    
    // Apply additional ranking criteria
    const ranked = sorted.map((result, index) => {
      let adjustedScore = result.overallScore;
      
      // Prefer stable versions if enabled
      if (this.criteria.preferStable && result.capability.version.prerelease) {
        adjustedScore *= 0.9;
      }
      
      // Prefer latest versions if enabled
      if (this.criteria.preferLatest) {
        const versionScore = this.calculateVersionRecencyScore(result.capability.version);
        adjustedScore += versionScore * 0.1; // Small boost for newer versions
      }
      
      return {
        ...result,
        overallScore: adjustedScore,
        ranking: index + 1
      };
    });
    
    // Re-sort after adjustments
    return ranked.sort((a, b) => b.overallScore - a.overallScore)
                 .map((result, index) => ({ ...result, ranking: index + 1 }));
  }

  /**
   * Apply load balancing strategy
   */
  private applyLoadBalancing(results: MatchingResult[]): MatchingResult[] {
    if (results.length <= 1) {
      return results;
    }
    
    switch (this.criteria.loadBalancing) {
      case 'round-robin':
        return this.applyRoundRobinBalancing(results);
      
      case 'least-loaded':
        return this.applyLeastLoadedBalancing(results);
      
      case 'random':
        return this.applyRandomBalancing(results);
      
      case 'performance':
      default:
        return results; // Already sorted by performance
    }
  }

  /**
   * Apply round-robin load balancing
   */
  private applyRoundRobinBalancing(results: MatchingResult[]): MatchingResult[] {
    // Group results by score tier (similar scores)
    const scoreTiers = this.groupByScoreTier(results);
    
    // Apply round-robin within each tier
    const balanced: MatchingResult[] = [];
    
    for (const tier of scoreTiers) {
      if (tier.length === 1) {
        balanced.push(tier[0]);
      } else {
        // Sort by round-robin counter
        const sorted = tier.sort((a, b) => {
          const countA = this.loadBalancingCounters.get(a.agentId) || 0;
          const countB = this.loadBalancingCounters.get(b.agentId) || 0;
          return countA - countB;
        });
        
        balanced.push(...sorted);
        
        // Update counter for selected agent
        const selected = sorted[0];
        this.loadBalancingCounters.set(
          selected.agentId,
          (this.loadBalancingCounters.get(selected.agentId) || 0) + 1
        );
      }
    }
    
    return balanced;
  }

  /**
   * Apply least-loaded balancing
   */
  private applyLeastLoadedBalancing(results: MatchingResult[]): MatchingResult[] {
    return results.sort((a, b) => {
      const loadA = a.performanceData?.metrics.currentLoad || 0.5;
      const loadB = b.performanceData?.metrics.currentLoad || 0.5;
      
      // Primary sort by load (ascending)
      if (Math.abs(loadA - loadB) > 0.1) {
        return loadA - loadB;
      }
      
      // Secondary sort by overall score (descending)
      return b.overallScore - a.overallScore;
    });
  }

  /**
   * Apply random balancing (weighted by score)
   */
  private applyRandomBalancing(results: MatchingResult[]): MatchingResult[] {
    // Group by score tier and randomize within tiers
    const scoreTiers = this.groupByScoreTier(results);
    
    const randomized: MatchingResult[] = [];
    
    for (const tier of scoreTiers) {
      // Shuffle the tier
      const shuffled = tier.sort(() => Math.random() - 0.5);
      randomized.push(...shuffled);
    }
    
    return randomized;
  }

  /**
   * Group results by score tier (similar scores)
   */
  private groupByScoreTier(results: MatchingResult[]): MatchingResult[][] {
    const tiers: MatchingResult[][] = [];
    const tierThreshold = 0.1; // 10% score difference threshold
    
    for (const result of results) {
      let addedToTier = false;
      
      for (const tier of tiers) {
        const tierAvgScore = tier.reduce((sum, r) => sum + r.overallScore, 0) / tier.length;
        
        if (Math.abs(result.overallScore - tierAvgScore) <= tierThreshold) {
          tier.push(result);
          addedToTier = true;
          break;
        }
      }
      
      if (!addedToTier) {
        tiers.push([result]);
      }
    }
    
    return tiers;
  }

  /**
   * Handle negotiation using Contract Net Protocol
   */
  private async handleNegotiation(
    requirement: CapabilityRequirement,
    results: MatchingResult[]
  ): Promise<MatchingResult[]> {
    // Only negotiate if we have multiple top candidates
    const topCandidates = results.slice(0, this.criteria.maxCandidates);
    
    if (topCandidates.length <= 1) {
      return results;
    }
    
    // Check if top candidates have similar scores (worth negotiating)
    const topScore = topCandidates[0].overallScore;
    const competitiveThreshold = 0.1; // 10% score difference
    
    const competitiveCandidates = topCandidates.filter(
      candidate => (topScore - candidate.overallScore) <= competitiveThreshold
    );
    
    if (competitiveCandidates.length <= 1) {
      return results;
    }
    
    console.log(chalk.blue(`🤝 Initiating negotiation with ${competitiveCandidates.length} competitive candidates`));
    
    try {
      const negotiationResults = await this.conductNegotiation(requirement, competitiveCandidates);
      
      // Merge negotiation results back into main results
      const updatedResults = results.map(result => {
        const negotiationData = negotiationResults.get(result.agentId);
        if (negotiationData) {
          return {
            ...result,
            negotiationData,
            overallScore: result.overallScore * negotiationData.confidence
          };
        }
        return result;
      });
      
      // Re-sort after negotiation
      return updatedResults.sort((a, b) => b.overallScore - a.overallScore)
                          .map((result, index) => ({ ...result, ranking: index + 1 }));
      
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Negotiation failed, using original results:'), error);
      return results;
    }
  }

  /**
   * Conduct negotiation using Contract Net Protocol
   */
  private async conductNegotiation(
    requirement: CapabilityRequirement,
    candidates: MatchingResult[]
  ): Promise<Map<string, NegotiationData>> {
    const requestId = `negotiation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const negotiationRequest: NegotiationRequest = {
      requestId,
      requirement,
      constraints: {},
      deadline: new Date(Date.now() + this.criteria.negotiationTimeout),
      maxBids: candidates.length,
      criteria: this.criteria
    };
    
    this.negotiationRequests.set(requestId, negotiationRequest);
    
    // Simulate negotiation (in a real implementation, this would involve network calls)
    const negotiationResults = new Map<string, NegotiationData>();
    
    for (const candidate of candidates) {
      const bid = this.generateBid(candidate, negotiationRequest);
      negotiationResults.set(candidate.agentId, bid);
    }
    
    this.negotiationRequests.delete(requestId);
    
    console.log(chalk.green(`✅ Negotiation completed with ${negotiationResults.size} bids`));
    
    return negotiationResults;
  }

  /**
   * Generate a bid for negotiation
   */
  private generateBid(candidate: MatchingResult, request: NegotiationRequest): NegotiationData {
    const performanceData = candidate.performanceData;
    
    // Calculate bid price based on performance and load
    const baseBidPrice = candidate.overallScore;
    const loadAdjustment = performanceData ? (1 - performanceData.metrics.currentLoad) * 0.1 : 0;
    const bidPrice = baseBidPrice + loadAdjustment;
    
    // Estimate latency
    const estimatedLatency = performanceData?.metrics.averageLatency || 
                           candidate.capability.performance?.averageLatency || 
                           1000;
    
    // Calculate earliest availability
    const baseDelay = performanceData?.metrics.currentLoad ? 
                     performanceData.metrics.currentLoad * 1000 : 0;
    const availability = new Date(Date.now() + baseDelay);
    
    // Calculate confidence
    const confidence = performanceData?.metrics.successRate || 0.9;
    
    return {
      bidId: `bid-${candidate.agentId}-${Date.now()}`,
      bidPrice,
      estimatedLatency,
      availability,
      terms: {
        guaranteedSLA: candidate.capability.reliability?.successRate || 0.95,
        maxRetries: candidate.capability.reliability?.retryPolicy?.maxRetries || 3
      },
      confidence
    };
  }

  /**
   * Generate match reasons for transparency
   */
  private generateMatchReasons(
    capability: AgentCapability,
    requirement: CapabilityRequirement,
    compatibilityScore: number,
    performanceScore: number,
    constraintScore: number
  ): string[] {
    const reasons: string[] = [];
    
    // Version compatibility
    if (compatibilityScore >= 0.9) {
      reasons.push('Excellent version compatibility');
    } else if (compatibilityScore >= 0.7) {
      reasons.push('Good version compatibility');
    } else {
      reasons.push('Basic version compatibility');
    }
    
    // Performance
    if (performanceScore >= 0.8) {
      reasons.push('High performance metrics');
    } else if (performanceScore >= 0.6) {
      reasons.push('Adequate performance metrics');
    } else {
      reasons.push('Limited performance data');
    }
    
    // Constraints
    if (constraintScore >= 0.9) {
      reasons.push('All constraints satisfied');
    } else if (constraintScore >= 0.7) {
      reasons.push('Most constraints satisfied');
    } else {
      reasons.push('Some constraint violations');
    }
    
    // Additional factors
    if (capability.deprecated) {
      reasons.push('Capability is deprecated');
    }
    
    if (capability.version.prerelease) {
      reasons.push('Pre-release version');
    }
    
    if (capability.tags?.includes('enterprise')) {
      reasons.push('Enterprise-grade capability');
    }
    
    return reasons;
  }

  /**
   * Calculate version recency score (newer versions get higher scores)
   */
  private calculateVersionRecencyScore(version: SemVer): number {
    // Simple heuristic: higher version numbers are assumed to be newer
    // In a real implementation, this could use actual release dates
    const versionSum = version.major * 1000000 + version.minor * 1000 + version.patch;
    return Math.min(1, versionSum / 10000000); // Normalize to 0-1 range
  }

  /**
   * Update performance data for an agent
   */
  public updatePerformanceData(agentId: string, data: AgentPerformanceData): void {
    this.performanceCache.set(agentId, data);
    this.emit('performanceUpdated', { agentId, data });
  }

  /**
   * Get current matching criteria
   */
  public getCriteria(): MatchingCriteria {
    return { ...this.criteria };
  }

  /**
   * Update matching criteria
   */
  public updateCriteria(newCriteria: Partial<MatchingCriteria>): void {
    this.criteria = { ...this.criteria, ...newCriteria };
    this.emit('criteriaUpdated', this.criteria);
  }

  /**
   * Clear performance cache
   */
  public clearPerformanceCache(): void {
    this.performanceCache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; lastUpdated: Date } {
    const entries = Array.from(this.performanceCache.values());
    const lastUpdated = entries.length > 0 
      ? new Date(Math.max(...entries.map(e => e.metrics.lastUpdated.getTime())))
      : new Date();
    
    return {
      size: this.performanceCache.size,
      lastUpdated
    };
  }
}

export default CapabilityMatchingEngine;