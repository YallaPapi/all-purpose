/**
 * Discovery Service
 * 
 * Advanced capability-based agent discovery service for UEP registry.
 * Provides sophisticated filtering, ranking, and selection algorithms
 * for finding optimal agents based on capabilities and requirements.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistryCacheService } from '../registry/registry-cache.service';
import { EtcdService } from '../etcd/etcd.service';
import { metricsHelpers } from '../monitoring/prometheus.setup';
import { RegisteredAgent, AgentType, HealthStatus } from '../registry/dto/registry.dto';

interface DiscoveryQuery {
  capabilities?: string[];
  agentType?: AgentType;
  tags?: string[];
  healthStatus?: HealthStatus[];
  version?: string;
  versionRange?: string;
  location?: string;
  maxResponseTime?: number;
  minSuccessRate?: number;
  excludeAgents?: string[];
  includeAgents?: string[];
  sortBy?: 'health' | 'performance' | 'version' | 'load' | 'proximity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface DiscoveryResult {
  agent: RegisteredAgent;
  score: number;
  matchedCapabilities: string[];
  healthScore: number;
  performanceScore: number;
  availabilityScore: number;
  reason: string[];
}

interface DiscoveryResponse {
  results: DiscoveryResult[];
  totalCount: number;
  queryTime: number;
  filters: DiscoveryQuery;
  suggestions?: string[];
}

interface CapabilityIndex {
  name: string;
  agents: string[];
  popularity: number;
  averageResponseTime: number;
  successRate: number;
}

interface AgentLoadInfo {
  agentId: string;
  currentLoad: number;
  maxCapacity: number;
  utilizationRate: number;
  queueLength: number;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly capabilityIndex = new Map<string, CapabilityIndex>();
  private readonly agentLoadInfo = new Map<string, AgentLoadInfo>();
  private readonly defaultLimit: number;
  private readonly maxLimit: number;
  private readonly cacheDiscoveryResults: boolean;

  constructor(
    private readonly cacheService: RegistryCacheService,
    private readonly etcdService: EtcdService,
    private readonly configService: ConfigService,
  ) {
    this.defaultLimit = this.configService.get<number>('DISCOVERY_DEFAULT_LIMIT', 10);
    this.maxLimit = this.configService.get<number>('DISCOVERY_MAX_LIMIT', 100);
    this.cacheDiscoveryResults = this.configService.get<boolean>('CACHE_DISCOVERY_RESULTS', true);
    
    this.logger.log(`Discovery Service initialized (cache: ${this.cacheDiscoveryResults})`);
    this.initializeCapabilityIndex();
  }

  /**
   * Discover agents based on capabilities and filters
   */
  async discoverAgents(query: DiscoveryQuery): Promise<DiscoveryResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Discovering agents with query:`, query);

      // Validate query parameters
      this.validateDiscoveryQuery(query);

      // Check cache for similar queries
      const cacheKey = this.generateQueryCacheKey(query);
      if (this.cacheDiscoveryResults) {
        const cachedResult = await this.cacheService.getCachedDiscoveryResult(cacheKey);
        if (cachedResult) {
          metricsHelpers.recordCacheHit('discovery');
          this.logger.debug(`Discovery cache hit for query: ${cacheKey}`);
          return cachedResult;
        }
        metricsHelpers.recordCacheMiss('discovery');
      }

      // Get all agents as base set
      const allAgents = await this.getAllEligibleAgents(query);
      
      // Apply filters
      const filteredAgents = await this.applyFilters(allAgents, query);
      
      // Score and rank agents
      const scoredResults = await this.scoreAndRankAgents(filteredAgents, query);
      
      // Apply pagination
      const paginatedResults = this.applyPagination(scoredResults, query);
      
      // Generate suggestions for better discovery
      const suggestions = await this.generateDiscoverySuggestions(query, scoredResults.length);

      const response: DiscoveryResponse = {
        results: paginatedResults,
        totalCount: scoredResults.length,
        queryTime: Date.now() - startTime,
        filters: query,
        suggestions,
      };

      // Cache the result
      if (this.cacheDiscoveryResults && scoredResults.length > 0) {
        await this.cacheService.cacheDiscoveryResult(cacheKey, response, 60); // Cache for 60 seconds
      }

      // Record metrics
      metricsHelpers.recordDiscoveryQuery(
        query.capabilities?.length || 0,
        scoredResults.length,
        response.queryTime,
      );

      this.logger.debug(`Discovery completed: ${scoredResults.length} agents found in ${response.queryTime}ms`);
      return response;

    } catch (error) {
      const queryTime = Date.now() - startTime;
      metricsHelpers.recordDiscoveryError(error.message, queryTime);
      
      this.logger.error('Agent discovery failed:', error);
      throw error;
    }
  }

  /**
   * Get capability suggestions based on partial input
   */
  async getCapabilitySuggestions(partial: string, limit: number = 10): Promise<string[]> {
    try {
      const suggestions: string[] = [];
      const partialLower = partial.toLowerCase();

      // Search through capability index
      for (const [capability] of this.capabilityIndex.entries()) {
        if (capability.toLowerCase().includes(partialLower)) {
          suggestions.push(capability);
        }
      }

      // Sort by popularity and relevance
      suggestions.sort((a, b) => {
        const aIndex = this.capabilityIndex.get(a);
        const bIndex = this.capabilityIndex.get(b);
        
        if (!aIndex || !bIndex) return 0;
        
        // Exact matches first
        const aExact = a.toLowerCase() === partialLower ? 1 : 0;
        const bExact = b.toLowerCase() === partialLower ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        // Then by popularity
        return bIndex.popularity - aIndex.popularity;
      });

      return suggestions.slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to get capability suggestions:', error);
      return [];
    }
  }

  /**
   * Get detailed capability information
   */
  async getCapabilityInfo(capability: string): Promise<{
    name: string;
    agentCount: number;
    averageResponseTime: number;
    successRate: number;
    popularTags: string[];
    relatedCapabilities: string[];
  } | null> {
    try {
      const capabilityIndex = this.capabilityIndex.get(capability);
      if (!capabilityIndex) {
        return null;
      }

      // Get agents with this capability
      const agents = await Promise.all(
        capabilityIndex.agents.map(agentId => this.cacheService.getAgent(agentId))
      );
      
      const validAgents = agents.filter(agent => agent !== null) as RegisteredAgent[];

      // Calculate popular tags
      const tagCounts = new Map<string, number>();
      for (const agent of validAgents) {
        if (agent.tags) {
          for (const tag of agent.tags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
      }
      
      const popularTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);

      // Find related capabilities (capabilities that often appear together)
      const relatedCapabilities = await this.findRelatedCapabilities(capability, validAgents);

      return {
        name: capability,
        agentCount: validAgents.length,
        averageResponseTime: capabilityIndex.averageResponseTime,
        successRate: capabilityIndex.successRate,
        popularTags,
        relatedCapabilities,
      };
    } catch (error) {
      this.logger.error(`Failed to get capability info for ${capability}:`, error);
      return null;
    }
  }

  /**
   * Get agent discovery recommendations based on usage patterns
   */
  async getDiscoveryRecommendations(agentId?: string): Promise<{
    recommendedCapabilities: string[];
    trendingCapabilities: string[];
    alternativeAgents: string[];
  }> {
    try {
      // Get trending capabilities (most queried recently)
      const trendingCapabilities = Array.from(this.capabilityIndex.entries())
        .sort((a, b) => b[1].popularity - a[1].popularity)
        .slice(0, 10)
        .map(([name]) => name);

      let recommendedCapabilities: string[] = [];
      let alternativeAgents: string[] = [];

      if (agentId) {
        const agent = await this.cacheService.getAgent(agentId);
        if (agent) {
          // Recommend capabilities based on agent's current capabilities
          recommendedCapabilities = await this.getRecommendedCapabilities(agent);
          
          // Find alternative agents with similar capabilities
          alternativeAgents = await this.findAlternativeAgents(agent);
        }
      } else {
        // General recommendations based on popular capabilities
        recommendedCapabilities = trendingCapabilities.slice(0, 5);
      }

      return {
        recommendedCapabilities,
        trendingCapabilities,
        alternativeAgents,
      };
    } catch (error) {
      this.logger.error('Failed to get discovery recommendations:', error);
      return {
        recommendedCapabilities: [],
        trendingCapabilities: [],
        alternativeAgents: [],
      };
    }
  }

  /**
   * Bulk capability check for multiple agents
   */
  async bulkCapabilityCheck(
    agentIds: string[],
    requiredCapabilities: string[]
  ): Promise<Map<string, { hasAllCapabilities: boolean; missingCapabilities: string[]; score: number }>> {
    const results = new Map();

    try {
      const agents = await Promise.all(
        agentIds.map(id => this.cacheService.getAgent(id))
      );

      for (let i = 0; i < agentIds.length; i++) {
        const agentId = agentIds[i];
        const agent = agents[i];

        if (!agent) {
          results.set(agentId, {
            hasAllCapabilities: false,
            missingCapabilities: requiredCapabilities,
            score: 0,
          });
          continue;
        }

        const agentCapabilities = new Set(agent.capabilities.map(cap => cap.name));
        const missingCapabilities = requiredCapabilities.filter(cap => !agentCapabilities.has(cap));
        const hasAllCapabilities = missingCapabilities.length === 0;
        
        // Calculate capability match score
        const matchedCount = requiredCapabilities.length - missingCapabilities.length;
        const score = requiredCapabilities.length > 0 ? matchedCount / requiredCapabilities.length : 0;

        results.set(agentId, {
          hasAllCapabilities,
          missingCapabilities,
          score,
        });
      }

      return results;
    } catch (error) {
      this.logger.error('Bulk capability check failed:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async initializeCapabilityIndex(): Promise<void> {
    try {
      this.logger.debug('Initializing capability index');
      
      const allAgents = await this.cacheService.getAllAgentIds();
      const capabilityMap = new Map<string, { agents: Set<string>; responseTimes: number[]; }>();

      for (const agentId of allAgents) {
        const agent = await this.cacheService.getAgent(agentId);
        if (!agent) continue;

        for (const capability of agent.capabilities) {
          if (!capabilityMap.has(capability.name)) {
            capabilityMap.set(capability.name, { agents: new Set(), responseTimes: [] });
          }

          const capData = capabilityMap.get(capability.name)!;
          capData.agents.add(agentId);
          
          if (agent.health.responseTime) {
            capData.responseTimes.push(agent.health.responseTime);
          }
        }
      }

      // Build capability index
      for (const [capabilityName, capData] of capabilityMap.entries()) {
        const averageResponseTime = capData.responseTimes.length > 0
          ? capData.responseTimes.reduce((sum, time) => sum + time, 0) / capData.responseTimes.length
          : 0;

        this.capabilityIndex.set(capabilityName, {
          name: capabilityName,
          agents: Array.from(capData.agents),
          popularity: capData.agents.size,
          averageResponseTime,
          successRate: 0.95, // Would be calculated from actual metrics
        });
      }

      this.logger.log(`Capability index initialized with ${this.capabilityIndex.size} capabilities`);
    } catch (error) {
      this.logger.error('Failed to initialize capability index:', error);
    }
  }

  private validateDiscoveryQuery(query: DiscoveryQuery): void {
    if (query.limit && query.limit > this.maxLimit) {
      throw new BadRequestException(`Limit cannot exceed ${this.maxLimit}`);
    }

    if (query.offset && query.offset < 0) {
      throw new BadRequestException('Offset cannot be negative');
    }

    if (query.maxResponseTime && query.maxResponseTime <= 0) {
      throw new BadRequestException('Max response time must be positive');
    }

    if (query.minSuccessRate && (query.minSuccessRate < 0 || query.minSuccessRate > 1)) {
      throw new BadRequestException('Min success rate must be between 0 and 1');
    }

    if (query.capabilities && query.capabilities.length > 50) {
      throw new BadRequestException('Cannot query more than 50 capabilities at once');
    }
  }

  private async getAllEligibleAgents(query: DiscoveryQuery): Promise<RegisteredAgent[]> {
    let agents: RegisteredAgent[];

    // Start with capability-based filtering for efficiency
    if (query.capabilities && query.capabilities.length > 0) {
      const agentIds = new Set<string>();
      
      for (const capability of query.capabilities) {
        const capabilityAgents = await this.cacheService.getAgentsByCapability(capability);
        for (const agentId of capabilityAgents) {
          agentIds.add(agentId);
        }
      }

      agents = await Promise.all(
        Array.from(agentIds).map(id => this.cacheService.getAgent(id))
      );
      agents = agents.filter(agent => agent !== null) as RegisteredAgent[];
    } else if (query.agentType) {
      agents = await this.cacheService.getAgentsByType(query.agentType);
    } else {
      const allAgentIds = await this.cacheService.getAllAgentIds();
      agents = await Promise.all(
        allAgentIds.map(id => this.cacheService.getAgent(id))
      );
      agents = agents.filter(agent => agent !== null) as RegisteredAgent[];
    }

    return agents;
  }

  private async applyFilters(agents: RegisteredAgent[], query: DiscoveryQuery): Promise<RegisteredAgent[]> {
    return agents.filter(agent => {
      // Health status filter
      if (query.healthStatus && query.healthStatus.length > 0) {
        if (!query.healthStatus.includes(agent.health.status as HealthStatus)) {
          return false;
        }
      }

      // Agent type filter
      if (query.agentType && agent.type !== query.agentType) {
        return false;
      }

      // Tags filter (agent must have all specified tags)
      if (query.tags && query.tags.length > 0) {
        if (!agent.tags || !query.tags.every(tag => agent.tags.includes(tag))) {
          return false;
        }
      }

      // Version filter
      if (query.version && agent.version !== query.version) {
        return false;
      }

      // Response time filter
      if (query.maxResponseTime && agent.health.responseTime > query.maxResponseTime) {
        return false;
      }

      // Exclude agents filter
      if (query.excludeAgents && query.excludeAgents.includes(agent.id)) {
        return false;
      }

      // Include agents filter (if specified, only include these agents)
      if (query.includeAgents && query.includeAgents.length > 0) {
        if (!query.includeAgents.includes(agent.id)) {
          return false;
        }
      }

      // Capability filter (agent must have all required capabilities)
      if (query.capabilities && query.capabilities.length > 0) {
        const agentCapabilities = new Set(agent.capabilities.map(cap => cap.name));
        if (!query.capabilities.every(cap => agentCapabilities.has(cap))) {
          return false;
        }
      }

      return true;
    });
  }

  private async scoreAndRankAgents(agents: RegisteredAgent[], query: DiscoveryQuery): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];

    for (const agent of agents) {
      const result = await this.scoreAgent(agent, query);
      results.push(result);
    }

    // Sort by score (descending) and then by specified sort criteria
    results.sort((a, b) => {
      if (query.sortBy) {
        const order = query.sortOrder === 'asc' ? 1 : -1;
        
        switch (query.sortBy) {
          case 'health':
            return (b.healthScore - a.healthScore) * order;
          case 'performance':
            return (b.performanceScore - a.performanceScore) * order;
          case 'version':
            return agent.version.localeCompare(agent.version) * order;
          case 'load':
            const aLoad = this.agentLoadInfo.get(a.agent.id)?.utilizationRate || 0;
            const bLoad = this.agentLoadInfo.get(b.agent.id)?.utilizationRate || 0;
            return (aLoad - bLoad) * order;
        }
      }
      
      // Default sort by overall score
      return b.score - a.score;
    });

    return results;
  }

  private async scoreAgent(agent: RegisteredAgent, query: DiscoveryQuery): Promise<DiscoveryResult> {
    let score = 0;
    let healthScore = 0;
    let performanceScore = 0;
    let availabilityScore = 0;
    const reasons: string[] = [];
    const matchedCapabilities: string[] = [];

    // Capability matching score (40% of total)
    if (query.capabilities && query.capabilities.length > 0) {
      const agentCapabilities = new Set(agent.capabilities.map(cap => cap.name));
      const matchedCount = query.capabilities.filter(cap => {
        if (agentCapabilities.has(cap)) {
          matchedCapabilities.push(cap);
          return true;
        }
        return false;
      }).length;
      
      const capabilityScore = matchedCount / query.capabilities.length;
      score += capabilityScore * 0.4;
      
      if (capabilityScore === 1) {
        reasons.push('Has all required capabilities');
      } else {
        reasons.push(`Has ${matchedCount}/${query.capabilities.length} required capabilities`);
      }
    } else {
      score += 0.4; // Full score if no specific capabilities required
      reasons.push('No specific capability requirements');
    }

    // Health score (25% of total)
    switch (agent.health.status) {
      case HealthStatus.HEALTHY:
        healthScore = 1.0;
        reasons.push('Agent is healthy');
        break;
      case HealthStatus.DEGRADED:
        healthScore = 0.6;
        reasons.push('Agent is degraded');
        break;
      case HealthStatus.UNHEALTHY:
        healthScore = 0.2;
        reasons.push('Agent is unhealthy');
        break;
      default:
        healthScore = 0.1;
        reasons.push('Agent health status unknown');
    }
    score += healthScore * 0.25;

    // Performance score (20% of total)
    if (agent.health.responseTime) {
      // Better performance for lower response times (max 5000ms)
      performanceScore = Math.max(0, 1 - (agent.health.responseTime / 5000));
      score += performanceScore * 0.2;
      reasons.push(`Response time: ${agent.health.responseTime}ms`);
    } else {
      performanceScore = 0.5; // Neutral score if no data
      score += performanceScore * 0.2;
    }

    // Availability score (15% of total)
    const consecutiveFailures = agent.health.consecutiveFailures || 0;
    availabilityScore = Math.max(0, 1 - (consecutiveFailures * 0.2)); // Reduce score by 20% per failure
    score += availabilityScore * 0.15;
    
    if (consecutiveFailures === 0) {
      reasons.push('No recent failures');
    } else {
      reasons.push(`${consecutiveFailures} consecutive failures`);
    }

    // Agent load score (if available)
    const loadInfo = this.agentLoadInfo.get(agent.id);
    if (loadInfo) {
      const loadScore = Math.max(0, 1 - loadInfo.utilizationRate);
      score += loadScore * 0.1;
      reasons.push(`Load utilization: ${(loadInfo.utilizationRate * 100).toFixed(1)}%`);
    }

    return {
      agent,
      score: Math.min(1, score), // Cap at 1.0
      matchedCapabilities,
      healthScore,
      performanceScore,
      availabilityScore,
      reason: reasons,
    };
  }

  private applyPagination(results: DiscoveryResult[], query: DiscoveryQuery): DiscoveryResult[] {
    const limit = query.limit || this.defaultLimit;
    const offset = query.offset || 0;
    
    return results.slice(offset, offset + limit);
  }

  private async generateDiscoverySuggestions(query: DiscoveryQuery, resultCount: number): Promise<string[]> {
    const suggestions: string[] = [];

    if (resultCount === 0) {
      suggestions.push('No agents found. Try relaxing your filters.');
      
      if (query.healthStatus && query.healthStatus.length === 1 && query.healthStatus[0] === HealthStatus.HEALTHY) {
        suggestions.push('Consider including degraded agents in your search.');
      }
      
      if (query.capabilities && query.capabilities.length > 3) {
        suggestions.push('Try searching with fewer required capabilities.');
      }
    } else if (resultCount < 3) {
      suggestions.push('Limited results found. Consider broadening your search criteria.');
    }

    if (query.capabilities && query.capabilities.length > 0) {
      // Suggest related capabilities
      const relatedCapabilities = await this.findRelatedCapabilitiesForQuery(query.capabilities);
      if (relatedCapabilities.length > 0) {
        suggestions.push(`Related capabilities: ${relatedCapabilities.slice(0, 3).join(', ')}`);
      }
    }

    return suggestions;
  }

  private generateQueryCacheKey(query: DiscoveryQuery): string {
    // Create a deterministic cache key from query parameters
    const keyParts = [
      query.capabilities?.sort().join(',') || '',
      query.agentType || '',
      query.tags?.sort().join(',') || '',
      query.healthStatus?.sort().join(',') || '',
      query.version || '',
      query.maxResponseTime || '',
      query.minSuccessRate || '',
      query.sortBy || '',
      query.sortOrder || '',
      query.limit || this.defaultLimit,
      query.offset || 0,
    ];

    return `discovery:${Buffer.from(keyParts.join('|')).toString('base64')}`;
  }

  private async findRelatedCapabilities(capability: string, agents: RegisteredAgent[]): Promise<string[]> {
    const relatedCapabilities = new Map<string, number>();

    for (const agent of agents) {
      for (const cap of agent.capabilities) {
        if (cap.name !== capability) {
          relatedCapabilities.set(cap.name, (relatedCapabilities.get(cap.name) || 0) + 1);
        }
      }
    }

    return Array.from(relatedCapabilities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  private async findRelatedCapabilitiesForQuery(capabilities: string[]): Promise<string[]> {
    const relatedCapabilities = new Set<string>();

    for (const capability of capabilities) {
      const capInfo = this.capabilityIndex.get(capability);
      if (capInfo) {
        const agents = await Promise.all(
          capInfo.agents.map(id => this.cacheService.getAgent(id))
        );
        
        const validAgents = agents.filter(agent => agent !== null) as RegisteredAgent[];
        const related = await this.findRelatedCapabilities(capability, validAgents);
        
        for (const rel of related) {
          relatedCapabilities.add(rel);
        }
      }
    }

    return Array.from(relatedCapabilities);
  }

  private async getRecommendedCapabilities(agent: RegisteredAgent): Promise<string[]> {
    // Find capabilities that frequently appear with agent's current capabilities
    const currentCapabilities = new Set(agent.capabilities.map(cap => cap.name));
    const recommendations = new Map<string, number>();

    for (const capability of agent.capabilities) {
      const related = await this.findRelatedCapabilities(capability.name, [agent]);
      for (const rel of related) {
        if (!currentCapabilities.has(rel)) {
          recommendations.set(rel, (recommendations.get(rel) || 0) + 1);
        }
      }
    }

    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  private async findAlternativeAgents(agent: RegisteredAgent): Promise<string[]> {
    const agentCapabilities = new Set(agent.capabilities.map(cap => cap.name));
    const alternatives: { agentId: string; score: number }[] = [];

    const allAgentIds = await this.cacheService.getAllAgentIds();
    
    for (const agentId of allAgentIds) {
      if (agentId === agent.id) continue;
      
      const otherAgent = await this.cacheService.getAgent(agentId);
      if (!otherAgent || otherAgent.type !== agent.type) continue;

      const otherCapabilities = new Set(otherAgent.capabilities.map(cap => cap.name));
      
      // Calculate similarity score based on shared capabilities
      const intersection = new Set([...agentCapabilities].filter(cap => otherCapabilities.has(cap)));
      const union = new Set([...agentCapabilities, ...otherCapabilities]);
      
      const similarity = intersection.size / union.size;
      
      if (similarity > 0.3) { // At least 30% similarity
        alternatives.push({ agentId, score: similarity });
      }
    }

    return alternatives
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(alt => alt.agentId);
  }
}