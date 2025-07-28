/**
 * Discovery gRPC Gateway
 * 
 * gRPC service implementation for UEP agent discovery operations.
 * Provides high-performance binary protocol access for capability-based
 * agent discovery with streaming capabilities.
 */

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject, from } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { DiscoveryService } from './discovery.service';
import { AgentType, HealthStatus, RegisteredAgent } from '../registry/dto/registry.dto';

// gRPC message interfaces for discovery operations
interface GrpcDiscoveryRequest {
  capabilities?: string[];
  agentType?: string;
  tags?: string[];
  healthStatus?: string[];
  version?: string;
  maxResponseTime?: number;
  minSuccessRate?: number;
  excludeAgents?: string[];
  includeAgents?: string[];
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
  offset?: number;
}

interface GrpcDiscoveryResponse {
  results: GrpcDiscoveryResult[];
  totalCount: number;
  queryTime: number;
  suggestions?: string[];
}

interface GrpcDiscoveryResult {
  agent: RegisteredAgent;
  score: number;
  matchedCapabilities: string[];
  healthScore: number;
  performanceScore: number;
  availabilityScore: number;
  reason: string[];
}

interface GrpcCapabilitySuggestionRequest {
  query: string;
  limit?: number;
}

interface GrpcCapabilitySuggestionResponse {
  suggestions: string[];
  query: string;
  count: number;
}

interface GrpcCapabilityInfoRequest {
  capability: string;
}

interface GrpcCapabilityInfoResponse {
  name: string;
  agentCount: number;
  averageResponseTime: number;
  successRate: number;
  popularTags: string[];
  relatedCapabilities: string[];
  found: boolean;
}

interface GrpcRecommendationRequest {
  agentId?: string;
}

interface GrpcRecommendationResponse {
  recommendedCapabilities: string[];
  trendingCapabilities: string[];
  alternativeAgents: string[];
}

interface GrpcBulkCapabilityCheckRequest {
  agentIds: string[];
  requiredCapabilities: string[];
}

interface GrpcBulkCapabilityCheckResponse {
  results: { [key: string]: GrpcCapabilityCheckResult };
}

interface GrpcCapabilityCheckResult {
  hasAllCapabilities: boolean;
  missingCapabilities: string[];
  score: number;
}

interface GrpcDiscoveryStreamRequest {
  query: GrpcDiscoveryRequest;
  watchUpdates?: boolean;
  batchSize?: number;
}

interface GrpcDiscoveryStreamResponse {
  results: GrpcDiscoveryResult[];
  isComplete: boolean;
  batchIndex: number;
  totalBatches: number;
}

interface GrpcAgentsByCapabilityRequest {
  capability: string;
  healthyOnly?: boolean;
  limit?: number;
}

interface GrpcAgentsByCapabilityResponse {
  capability: string;
  agents: RegisteredAgent[];
  totalCount: number;
  healthyCount: number;
}

@Controller()
export class DiscoveryGateway {
  private readonly logger = new Logger(DiscoveryGateway.name);
  private readonly discoveryStreams = new Map<string, Subject<GrpcDiscoveryStreamResponse>>();

  constructor(private readonly discoveryService: DiscoveryService) {
    this.logger.log('Discovery gRPC Gateway initialized');
  }

  /**
   * Discover agents via gRPC
   */
  @GrpcMethod('DiscoveryService', 'DiscoverAgents')
  async discoverAgents(request: GrpcDiscoveryRequest): Promise<GrpcDiscoveryResponse> {
    try {
      this.logger.debug('gRPC DiscoverAgents called');
      
      // Convert gRPC request to internal query format
      const query: any = {
        capabilities: request.capabilities,
        agentType: request.agentType as AgentType,
        tags: request.tags,
        healthStatus: request.healthStatus?.map(status => status as HealthStatus),
        version: request.version,
        maxResponseTime: request.maxResponseTime,
        minSuccessRate: request.minSuccessRate,
        excludeAgents: request.excludeAgents,
        includeAgents: request.includeAgents,
        sortBy: request.sortBy as any,
        sortOrder: request.sortOrder as 'asc' | 'desc',
        limit: request.limit,
        offset: request.offset,
      };

      const result = await this.discoveryService.discoverAgents(query);

      return {
        results: result.results.map(r => ({
          agent: r.agent,
          score: r.score,
          matchedCapabilities: r.matchedCapabilities,
          healthScore: r.healthScore,
          performanceScore: r.performanceScore,
          availabilityScore: r.availabilityScore,
          reason: r.reason,
        })),
        totalCount: result.totalCount,
        queryTime: result.queryTime,
        suggestions: result.suggestions,
      };
    } catch (error) {
      this.logger.error('gRPC DiscoverAgents failed:', error);
      throw error;
    }
  }

  /**
   * Get capability suggestions via gRPC
   */
  @GrpcMethod('DiscoveryService', 'GetCapabilitySuggestions')
  async getCapabilitySuggestions(
    request: GrpcCapabilitySuggestionRequest
  ): Promise<GrpcCapabilitySuggestionResponse> {
    try {
      this.logger.debug(`gRPC GetCapabilitySuggestions called for: ${request.query}`);
      
      const suggestions = await this.discoveryService.getCapabilitySuggestions(
        request.query,
        request.limit || 10
      );

      return {
        suggestions,
        query: request.query,
        count: suggestions.length,
      };
    } catch (error) {
      this.logger.error('gRPC GetCapabilitySuggestions failed:', error);
      throw error;
    }
  }

  /**
   * Get capability information via gRPC
   */
  @GrpcMethod('DiscoveryService', 'GetCapabilityInfo')
  async getCapabilityInfo(request: GrpcCapabilityInfoRequest): Promise<GrpcCapabilityInfoResponse> {
    try {
      this.logger.debug(`gRPC GetCapabilityInfo called for: ${request.capability}`);
      
      const info = await this.discoveryService.getCapabilityInfo(request.capability);

      if (!info) {
        return {
          name: request.capability,
          agentCount: 0,
          averageResponseTime: 0,
          successRate: 0,
          popularTags: [],
          relatedCapabilities: [],
          found: false,
        };
      }

      return {
        ...info,
        found: true,
      };
    } catch (error) {
      this.logger.error('gRPC GetCapabilityInfo failed:', error);
      throw error;
    }
  }

  /**
   * Get discovery recommendations via gRPC
   */
  @GrpcMethod('DiscoveryService', 'GetRecommendations')
  async getRecommendations(request: GrpcRecommendationRequest): Promise<GrpcRecommendationResponse> {
    try {
      this.logger.debug(`gRPC GetRecommendations called for agent: ${request.agentId || 'none'}`);
      
      const recommendations = await this.discoveryService.getDiscoveryRecommendations(request.agentId);

      return recommendations;
    } catch (error) {
      this.logger.error('gRPC GetRecommendations failed:', error);
      throw error;
    }
  }

  /**
   * Bulk capability check via gRPC
   */
  @GrpcMethod('DiscoveryService', 'BulkCapabilityCheck')
  async bulkCapabilityCheck(
    request: GrpcBulkCapabilityCheckRequest
  ): Promise<GrpcBulkCapabilityCheckResponse> {
    try {
      this.logger.debug(`gRPC BulkCapabilityCheck called for ${request.agentIds.length} agents`);
      
      const results = await this.discoveryService.bulkCapabilityCheck(
        request.agentIds,
        request.requiredCapabilities
      );

      const grpcResults: { [key: string]: GrpcCapabilityCheckResult } = {};
      for (const [agentId, result] of results.entries()) {
        grpcResults[agentId] = result;
      }

      return { results: grpcResults };
    } catch (error) {
      this.logger.error('gRPC BulkCapabilityCheck failed:', error);
      throw error;
    }
  }

  /**
   * Get agents by capability via gRPC
   */
  @GrpcMethod('DiscoveryService', 'GetAgentsByCapability')
  async getAgentsByCapability(
    request: GrpcAgentsByCapabilityRequest
  ): Promise<GrpcAgentsByCapabilityResponse> {
    try {
      this.logger.debug(`gRPC GetAgentsByCapability called for: ${request.capability}`);
      
      const query: any = {
        capabilities: [request.capability],
        limit: request.limit || 50,
      };

      if (request.healthyOnly) {
        query.healthStatus = [HealthStatus.HEALTHY];
      }

      const result = await this.discoveryService.discoverAgents(query);
      
      const agents = result.results.map(r => r.agent);
      const healthyCount = agents.filter(a => a.health.status === HealthStatus.HEALTHY).length;

      return {
        capability: request.capability,
        agents,
        totalCount: result.totalCount,
        healthyCount,
      };
    } catch (error) {
      this.logger.error('gRPC GetAgentsByCapability failed:', error);
      throw error;
    }
  }

  /**
   * Stream discovery results via gRPC
   */
  @GrpcStreamMethod('DiscoveryService', 'StreamDiscovery')
  streamDiscovery(
    data$: Observable<GrpcDiscoveryStreamRequest>
  ): Observable<GrpcDiscoveryStreamResponse> {
    const streamId = `discovery-${Date.now()}-${Math.random()}`;
    const subject = new Subject<GrpcDiscoveryStreamResponse>();
    
    this.discoveryStreams.set(streamId, subject);
    this.logger.debug(`Created discovery stream: ${streamId}`);

    data$.subscribe({
      next: async (request) => {
        try {
          this.logger.debug('Discovery stream request received');
          
          // Convert request and perform discovery
          const query: any = {
            capabilities: request.query.capabilities,
            agentType: request.query.agentType as AgentType,
            tags: request.query.tags,
            healthStatus: request.query.healthStatus?.map(status => status as HealthStatus),
            version: request.query.version,
            maxResponseTime: request.query.maxResponseTime,
            minSuccessRate: request.query.minSuccessRate,
            excludeAgents: request.query.excludeAgents,
            includeAgents: request.query.includeAgents,
            sortBy: request.query.sortBy as any,
            sortOrder: request.query.sortOrder as 'asc' | 'desc',
            limit: request.query.limit || 1000, // Higher limit for streaming
            offset: request.query.offset,
          };

          const result = await this.discoveryService.discoverAgents(query);
          
          // Stream results in batches
          const batchSize = request.batchSize || 10;
          const totalBatches = Math.ceil(result.results.length / batchSize);
          
          for (let i = 0; i < result.results.length; i += batchSize) {
            const batch = result.results.slice(i, i + batchSize);
            const batchIndex = Math.floor(i / batchSize);
            
            const streamResponse: GrpcDiscoveryStreamResponse = {
              results: batch.map(r => ({
                agent: r.agent,
                score: r.score,
                matchedCapabilities: r.matchedCapabilities,
                healthScore: r.healthScore,
                performanceScore: r.performanceScore,
                availabilityScore: r.availabilityScore,
                reason: r.reason,
              })),
              isComplete: batchIndex === totalBatches - 1,
              batchIndex,
              totalBatches,
            };

            subject.next(streamResponse);
            
            // Small delay between batches to prevent overwhelming
            if (!streamResponse.isComplete) {
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          }

          // If no results, send empty completion
          if (result.results.length === 0) {
            subject.next({
              results: [],
              isComplete: true,
              batchIndex: 0,
              totalBatches: 1,
            });
          }

        } catch (error) {
          this.logger.error('Discovery stream error:', error);
          subject.error(error);
        }
      },
      error: (error) => {
        this.logger.error(`Discovery stream error for ${streamId}:`, error);
        this.discoveryStreams.delete(streamId);
        subject.error(error);
      },
      complete: () => {
        this.logger.debug(`Discovery stream completed: ${streamId}`);
        this.discoveryStreams.delete(streamId);
        subject.complete();
      },
    });

    return subject.asObservable();
  }

  /**
   * Stream capability suggestions via gRPC
   */
  @GrpcStreamMethod('DiscoveryService', 'StreamCapabilitySuggestions')
  streamCapabilitySuggestions(
    data$: Observable<{ query: string; limit?: number }>
  ): Observable<{ suggestions: string[]; partial: boolean; query: string }> {
    return data$.pipe(
      mergeMap(async (request) => {
        try {
          const suggestions = await this.discoveryService.getCapabilitySuggestions(
            request.query,
            request.limit || 20
          );

          return {
            suggestions,
            partial: suggestions.length === (request.limit || 20),
            query: request.query,
          };
        } catch (error) {
          this.logger.error('Stream capability suggestions error:', error);
          throw error;
        }
      }),
      catchError((error) => {
        this.logger.error('Stream capability suggestions failed:', error);
        throw error;
      })
    );
  }

  /**
   * Real-time discovery updates via gRPC streaming
   */
  @GrpcStreamMethod('DiscoveryService', 'WatchDiscoveryUpdates')
  watchDiscoveryUpdates(
    data$: Observable<{
      capabilities?: string[];
      agentType?: string;
      watchNewAgents?: boolean;
      watchHealthChanges?: boolean;
    }>
  ): Observable<{
    eventType: 'agent_added' | 'agent_removed' | 'agent_updated' | 'health_changed';
    agent?: RegisteredAgent;
    agentId: string;
    timestamp: string;
    affectedCapabilities?: string[];
  }> {
    const streamId = `watch-${Date.now()}-${Math.random()}`;
    const subject = new Subject<any>();
    
    this.logger.debug(`Created discovery watch stream: ${streamId}`);

    data$.subscribe({
      next: (request) => {
        this.logger.debug('Discovery watch request received:', request);
        // This would integrate with the registry event system
        // to provide real-time updates based on the watch criteria
      },
      error: (error) => {
        this.logger.error(`Discovery watch stream error for ${streamId}:`, error);
        subject.error(error);
      },
      complete: () => {
        this.logger.debug(`Discovery watch stream completed: ${streamId}`);
        subject.complete();
      },
    });

    return subject.asObservable();
  }

  /**
   * Batch discovery operations via gRPC
   */
  @GrpcMethod('DiscoveryService', 'BatchDiscovery')
  async batchDiscovery(request: {
    queries: GrpcDiscoveryRequest[];
    parallel?: boolean;
  }): Promise<{
    results: GrpcDiscoveryResponse[];
    totalTime: number;
    successCount: number;
    failureCount: number;
  }> {
    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    try {
      this.logger.debug(`gRPC BatchDiscovery called with ${request.queries.length} queries`);
      
      const processQuery = async (query: GrpcDiscoveryRequest): Promise<GrpcDiscoveryResponse | null> => {
        try {
          const result = await this.discoverAgents(query);
          successCount++;
          return result;
        } catch (error) {
          failureCount++;
          this.logger.error('Batch discovery query failed:', error);
          return null;
        }
      };

      let results: (GrpcDiscoveryResponse | null)[];
      
      if (request.parallel) {
        // Execute queries in parallel
        results = await Promise.all(request.queries.map(processQuery));
      } else {
        // Execute queries sequentially
        results = [];
        for (const query of request.queries) {
          const result = await processQuery(query);
          results.push(result);
        }
      }

      const validResults = results.filter(r => r !== null) as GrpcDiscoveryResponse[];

      return {
        results: validResults,
        totalTime: Date.now() - startTime,
        successCount,
        failureCount,
      };
    } catch (error) {
      this.logger.error('gRPC BatchDiscovery failed:', error);
      throw error;
    }
  }

  /**
   * Discovery performance metrics via gRPC
   */
  @GrpcMethod('DiscoveryService', 'GetDiscoveryMetrics')
  async getDiscoveryMetrics(): Promise<{
    totalQueries: number;
    averageQueryTime: number;
    cacheHitRate: number;
    popularCapabilities: { name: string; queryCount: number }[];
    performanceStats: {
      p50: number;
      p95: number;
      p99: number;
    };
  }> {
    try {
      this.logger.debug('gRPC GetDiscoveryMetrics called');
      
      // This would collect actual metrics from the discovery service
      // For now, return mock data structure
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        popularCapabilities: [],
        performanceStats: {
          p50: 0,
          p95: 0,
          p99: 0,
        },
      };
    } catch (error) {
      this.logger.error('gRPC GetDiscoveryMetrics failed:', error);
      throw error;
    }
  }

  /**
   * Clean up streams on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up discovery gRPC streams');
    this.discoveryStreams.forEach((subject, streamId) => {
      subject.complete();
    });
    this.discoveryStreams.clear();
  }
}