/**
 * Watch gRPC Gateway
 * 
 * gRPC service implementation for real-time watch subscriptions and
 * streaming of agent registry events. Provides high-performance binary
 * protocol streaming for agent state monitoring.
 */

import { Controller, Logger, OnModuleDestroy } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject, merge, interval } from 'rxjs';
import { map, filter, takeUntil, bufferTime, mergeMap, catchError } from 'rxjs/operators';
import { WatchService } from './watch.service';
import { RegisteredAgent, AgentType, HealthStatus } from '../registry/dto/registry.dto';

// gRPC message interfaces for watch operations
interface GrpcWatchRequest {
  subscriptionId?: string;
  filters?: GrpcWatchFilters;
  clientId?: string;
  options?: GrpcWatchOptions;
}

interface GrpcWatchFilters {
  agentIds?: string[];
  agentTypes?: string[];
  capabilities?: string[];
  tags?: string[];
  healthStatuses?: string[];
  eventTypes?: string[];
  includeMetadata?: boolean;
  includeHistory?: boolean;
}

interface GrpcWatchOptions {
  batchSize?: number;
  debounceMs?: number;
  bufferTimeMs?: number;
  maxEvents?: number;
  compression?: boolean;
}

interface GrpcWatchResponse {
  subscriptionId: string;
  events: GrpcWatchEvent[];
  metadata: GrpcWatchMetadata;
  error?: string;
}

interface GrpcWatchEvent {
  id: string;
  type: string;
  timestamp: string;
  agentId: string;
  agent?: RegisteredAgent;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
  source: string;
}

interface GrpcWatchMetadata {
  totalEvents: number;
  batchIndex: number;
  isComplete: boolean;
  processingTime: number;
  compression?: string;
}

interface GrpcSubscriptionInfo {
  id: string;
  clientId: string;
  filters: GrpcWatchFilters;
  createdAt: string;
  lastActivity: string;
  eventCount: number;
  status: string;
}

interface GrpcWatchStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalEvents: number;
  eventsByType: { [key: string]: number };
  clientCount: number;
  averageEventsPerSubscription: number;
  uptime: number;
}

interface GrpcEventReplayRequest {
  startTime?: string;
  endTime?: string;
  filters?: GrpcWatchFilters;
  limit?: number;
  offset?: number;
}

interface GrpcEventReplayResponse {
  events: GrpcWatchEvent[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

interface GrpcHealthWatchRequest {
  agentIds?: string[];
  healthStatuses?: string[];
  alertThresholds?: {
    consecutiveFailures?: number;
    responseTimeMs?: number;
  };
}

interface GrpcDiscoveryWatchRequest {
  capabilities?: string[];
  agentTypes?: string[];
  watchNewAgents?: boolean;
  watchCapabilityChanges?: boolean;
}

@Controller()
export class WatchGateway implements OnModuleDestroy {
  private readonly logger = new Logger(WatchGateway.name);
  private readonly watchStreams = new Map<string, Subject<GrpcWatchResponse>>();
  private readonly shutdownSubject = new Subject<void>();

  constructor(private readonly watchService: WatchService) {
    this.logger.log('Watch gRPC Gateway initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down watch gRPC streams');
    
    this.shutdownSubject.next();
    this.shutdownSubject.complete();
    
    // Close all active streams
    this.watchStreams.forEach((subject, streamId) => {
      subject.complete();
    });
    this.watchStreams.clear();
  }

  /**
   * Create watch subscription via gRPC
   */
  @GrpcMethod('WatchService', 'CreateSubscription')
  async createSubscription(request: GrpcWatchRequest): Promise<{
    subscriptionId: string;
    clientId: string;
    filters: GrpcWatchFilters;
    createdAt: string;
  }> {
    try {
      this.logger.debug('gRPC CreateSubscription called');
      
      const clientId = request.clientId || `grpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert gRPC filters to internal format
      const filters = this.convertFiltersFromGrpc(request.filters || {});
      
      const subscriptionId = await this.watchService.createSubscription(clientId, filters);
      
      return {
        subscriptionId,
        clientId,
        filters: request.filters || {},
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('gRPC CreateSubscription failed:', error);
      throw error;
    }
  }

  /**
   * Get subscription information via gRPC
   */
  @GrpcMethod('WatchService', 'GetSubscription')
  async getSubscription(request: { subscriptionId: string }): Promise<GrpcSubscriptionInfo | { error: string }> {
    try {
      this.logger.debug(`gRPC GetSubscription called for: ${request.subscriptionId}`);
      
      const subscription = this.watchService.getSubscriptionInfo(request.subscriptionId);
      
      if (!subscription) {
        return { error: 'Subscription not found' };
      }

      const now = new Date();
      const lastActivityTime = now.getTime() - subscription.lastActivity.getTime();
      const isActive = lastActivityTime < 5 * 60 * 1000;

      return {
        id: subscription.id,
        clientId: subscription.clientId,
        filters: this.convertFiltersToGrpc(subscription.filters),
        createdAt: subscription.createdAt.toISOString(),
        lastActivity: subscription.lastActivity.toISOString(),
        eventCount: subscription.eventCount,
        status: isActive ? 'active' : 'inactive',
      };
    } catch (error) {
      this.logger.error('gRPC GetSubscription failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Delete subscription via gRPC
   */
  @GrpcMethod('WatchService', 'DeleteSubscription')
  async deleteSubscription(request: { subscriptionId: string }): Promise<{
    success: boolean;
    subscriptionId: string;
    deletedAt: string;
    error?: string;
  }> {
    try {
      this.logger.debug(`gRPC DeleteSubscription called for: ${request.subscriptionId}`);
      
      const success = await this.watchService.unsubscribe(request.subscriptionId);
      
      return {
        success,
        subscriptionId: request.subscriptionId,
        deletedAt: new Date().toISOString(),
        error: success ? undefined : 'Subscription not found',
      };
    } catch (error) {
      this.logger.error('gRPC DeleteSubscription failed:', error);
      return {
        success: false,
        subscriptionId: request.subscriptionId,
        deletedAt: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Get watch statistics via gRPC
   */
  @GrpcMethod('WatchService', 'GetWatchStats')
  async getWatchStats(): Promise<GrpcWatchStats> {
    try {
      this.logger.debug('gRPC GetWatchStats called');
      
      const subscriptions = this.watchService.getActiveSubscriptions();
      const now = new Date();
      
      const activeSubscriptions = subscriptions.filter(sub => {
        const lastActivityTime = now.getTime() - sub.lastActivity.getTime();
        return lastActivityTime < 5 * 60 * 1000;
      });

      const clientCount = new Set(subscriptions.map(sub => sub.clientId)).size;
      const totalEvents = subscriptions.reduce((sum, sub) => sum + sub.eventCount, 0);
      const averageEventsPerSubscription = subscriptions.length > 0 ? totalEvents / subscriptions.length : 0;

      // Mock event type distribution (would be real data in production)
      const eventsByType = {
        agent_registered: Math.floor(totalEvents * 0.15),
        agent_deregistered: Math.floor(totalEvents * 0.10),
        agent_updated: Math.floor(totalEvents * 0.05),
        health_changed: Math.floor(totalEvents * 0.60),
        capabilities_changed: Math.floor(totalEvents * 0.05),
        lease_expired: Math.floor(totalEvents * 0.05),
      };

      return {
        totalSubscriptions: subscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        totalEvents,
        eventsByType,
        clientCount,
        averageEventsPerSubscription: Math.round(averageEventsPerSubscription * 100) / 100,
        uptime: Math.round(process.uptime()),
      };
    } catch (error) {
      this.logger.error('gRPC GetWatchStats failed:', error);
      throw error;
    }
  }

  /**
   * Stream watch events via gRPC
   */
  @GrpcStreamMethod('WatchService', 'StreamEvents')
  streamEvents(data$: Observable<GrpcWatchRequest>): Observable<GrpcWatchResponse> {
    const streamId = `grpc-watch-${Date.now()}-${Math.random()}`;
    const subject = new Subject<GrpcWatchResponse>();
    
    this.watchStreams.set(streamId, subject);
    this.logger.debug(`Created gRPC watch stream: ${streamId}`);

    data$.pipe(
      takeUntil(this.shutdownSubject)
    ).subscribe({
      next: async (request) => {
        try {
          this.logger.debug('gRPC watch stream request received');
          
          // Create or use existing subscription
          let subscriptionId = request.subscriptionId;
          
          if (!subscriptionId) {
            const clientId = request.clientId || `grpc_stream_${Date.now()}`;
            const filters = this.convertFiltersFromGrpc(request.filters || {});
            subscriptionId = await this.watchService.createSubscription(clientId, filters);
          }

          // Set up event streaming with buffering
          const eventStream = this.watchService.getEventStream(
            this.convertFiltersFromGrpc(request.filters || {})
          );

          const bufferTimeMs = request.options?.bufferTimeMs || 100;
          const batchSize = request.options?.batchSize || 10;

          eventStream.pipe(
            bufferTimeMs > 0 ? bufferTime(bufferTimeMs) : map(event => [event]),
            filter((events: any[]) => events.length > 0),
            map((events: any[]) => events.slice(0, batchSize)),
            takeUntil(this.shutdownSubject)
          ).subscribe({
            next: (events) => {
              const grpcEvents = events.map(event => this.convertEventToGrpc(event));
              
              const response: GrpcWatchResponse = {
                subscriptionId,
                events: grpcEvents,
                metadata: {
                  totalEvents: events.length,
                  batchIndex: 0,
                  isComplete: false,
                  processingTime: Date.now(),
                },
              };

              subject.next(response);
            },
            error: (error) => {
              this.logger.error(`gRPC watch stream error for ${streamId}:`, error);
              subject.next({
                subscriptionId,
                events: [],
                metadata: {
                  totalEvents: 0,
                  batchIndex: 0,
                  isComplete: true,
                  processingTime: Date.now(),
                },
                error: error.message,
              });
            },
          });

        } catch (error) {
          this.logger.error('gRPC watch stream request error:', error);
          subject.error(error);
        }
      },
      error: (error) => {
        this.logger.error(`gRPC watch stream error for ${streamId}:`, error);
        this.watchStreams.delete(streamId);
        subject.error(error);
      },
      complete: () => {
        this.logger.debug(`gRPC watch stream completed: ${streamId}`);
        this.watchStreams.delete(streamId);
        subject.complete();
      },
    });

    return subject.asObservable();
  }

  /**
   * Stream health events via gRPC
   */
  @GrpcStreamMethod('WatchService', 'StreamHealthEvents')
  streamHealthEvents(
    data$: Observable<GrpcHealthWatchRequest>
  ): Observable<{
    agentId: string;
    healthStatus: string;
    responseTime?: number;
    consecutiveFailures?: number;
    timestamp: string;
    alert?: {
      type: string;
      message: string;
      severity: string;
    };
  }> {
    return (data$.pipe(
      mergeMap(async (request) => {
        const filters = {
          eventTypes: ['health_changed' as const],
          agentIds: request.agentIds,
          healthStatuses: request.healthStatuses?.map(s => s as HealthStatus),
        };

        return this.watchService.getEventStream(filters).pipe(
          filter(event => event.type === 'health_changed'),
          map(event => {
            const healthData = event.newState || {};
            const alertThresholds = request.alertThresholds || {};
            
            let alert;
            
            // Check for alert conditions
            if (alertThresholds.consecutiveFailures && 
                healthData.consecutiveFailures >= alertThresholds.consecutiveFailures) {
              alert = {
                type: 'consecutive_failures',
                message: `Agent has ${healthData.consecutiveFailures} consecutive failures`,
                severity: 'warning',
              };
            }
            
            if (alertThresholds.responseTimeMs && 
                healthData.responseTime > alertThresholds.responseTimeMs) {
              alert = {
                type: 'high_response_time',
                message: `Response time ${healthData.responseTime}ms exceeds threshold`,
                severity: 'warning',
              };
            }

            return {
              agentId: event.agentId,
              healthStatus: healthData.status || 'unknown',
              responseTime: healthData.responseTime,
              consecutiveFailures: healthData.consecutiveFailures,
              timestamp: event.timestamp.toISOString(),
              alert,
            };
          }),
          takeUntil(this.shutdownSubject)
        );
      }),
      catchError((error) => {
        this.logger.error('Health event stream error:', error);
        throw error;
      })
    ) as any);
  }

  /**
   * Stream discovery events via gRPC
   */
  @GrpcStreamMethod('WatchService', 'StreamDiscoveryEvents')
  streamDiscoveryEvents(
    data$: Observable<GrpcDiscoveryWatchRequest>
  ): Observable<{
    eventType: string;
    agentId: string;
    capabilities?: string[];
    agentType?: string;
    timestamp: string;
    metadata?: any;
  }> {
    return (data$.pipe(
      mergeMap(async (request) => {
        const eventTypes = [];
        
        if (request.watchNewAgents) {
          eventTypes.push('agent_registered', 'agent_deregistered');
        }
        
        if (request.watchCapabilityChanges) {
          eventTypes.push('capabilities_changed', 'agent_updated');
        }

        const filters = {
          eventTypes,
          capabilities: request.capabilities,
          agentTypes: request.agentTypes?.map(t => t as AgentType),
        };

        return this.watchService.getEventStream(filters).pipe(
          map(event => ({
            eventType: event.type,
            agentId: event.agentId,
            capabilities: event.agent?.capabilities?.map(cap => cap.name),
            agentType: event.agent?.type,
            timestamp: event.timestamp.toISOString(),
            metadata: event.metadata,
          })),
          takeUntil(this.shutdownSubject)
        );
      }),
      catchError((error) => {
        this.logger.error('Discovery event stream error:', error);
        throw error;
      })
    ) as any);
  }

  /**
   * Replay events via gRPC
   */
  @GrpcMethod('WatchService', 'ReplayEvents')
  async replayEvents(request: GrpcEventReplayRequest): Promise<GrpcEventReplayResponse> {
    try {
      this.logger.debug('gRPC ReplayEvents called');
      
      // This would normally query actual event history
      // For now, return empty results with proper structure
      return {
        events: [],
        totalCount: 0,
        hasMore: false,
        nextOffset: undefined,
      };
    } catch (error) {
      this.logger.error('gRPC ReplayEvents failed:', error);
      throw error;
    }
  }

  /**
   * Batch subscribe to multiple watch streams
   */
  @GrpcMethod('WatchService', 'BatchSubscribe')
  async batchSubscribe(request: {
    subscriptions: Array<{
      clientId: string;
      filters: GrpcWatchFilters;
      options?: GrpcWatchOptions;
    }>;
  }): Promise<{
    subscriptions: Array<{
      subscriptionId: string;
      clientId: string;
      success: boolean;
      error?: string;
    }>;
    successCount: number;
    failureCount: number;
  }> {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      this.logger.debug(`gRPC BatchSubscribe called for ${request.subscriptions.length} subscriptions`);
      
      for (const subRequest of request.subscriptions) {
        try {
          const filters = this.convertFiltersFromGrpc(subRequest.filters);
          const subscriptionId = await this.watchService.createSubscription(
            subRequest.clientId,
            filters
          );
          
          results.push({
            subscriptionId,
            clientId: subRequest.clientId,
            success: true,
          });
          
          successCount++;
        } catch (error) {
          results.push({
            subscriptionId: '',
            clientId: subRequest.clientId,
            success: false,
            error: error.message,
          });
          
          failureCount++;
        }
      }

      return {
        subscriptions: results,
        successCount,
        failureCount,
      };
    } catch (error) {
      this.logger.error('gRPC BatchSubscribe failed:', error);
      throw error;
    }
  }

  /**
   * Helper methods for data conversion
   */

  private convertFiltersFromGrpc(grpcFilters: GrpcWatchFilters): any {
    return {
      agentIds: grpcFilters.agentIds,
      agentTypes: grpcFilters.agentTypes?.map(t => t as AgentType),
      capabilities: grpcFilters.capabilities,
      tags: grpcFilters.tags,
      healthStatuses: grpcFilters.healthStatuses?.map(s => s as HealthStatus),
      eventTypes: grpcFilters.eventTypes as any[],
      includeMetadata: grpcFilters.includeMetadata,
      includeHistory: grpcFilters.includeHistory,
    };
  }

  private convertFiltersToGrpc(filters: any): GrpcWatchFilters {
    return {
      agentIds: filters.agentIds,
      agentTypes: filters.agentTypes?.map(t => t.toString()),
      capabilities: filters.capabilities,
      tags: filters.tags,
      healthStatuses: filters.healthStatuses?.map(s => s.toString()),
      eventTypes: filters.eventTypes,
      includeMetadata: filters.includeMetadata,
      includeHistory: filters.includeHistory,
    };
  }

  private convertEventToGrpc(event: any): GrpcWatchEvent {
    return {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      agentId: event.agentId,
      agent: event.agent,
      previousState: event.previousState,
      newState: event.newState,
      metadata: event.metadata,
      source: event.source,
    };
  }
}