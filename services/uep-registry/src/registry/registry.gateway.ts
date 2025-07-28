/**
 * Registry gRPC Gateway
 * 
 * gRPC service implementation for UEP agent registration and management.
 * Provides high-performance binary protocol access for agent operations.
 */

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { RegistryService } from './registry.service';
import {
  AgentRegistrationDto,
  AgentUpdateDto,
  RegisteredAgent,
  RegistrationResponse,
  DeregistrationResponse,
  AgentType,
} from './dto/registry.dto';

// gRPC message interfaces
interface GrpcAgentRegistrationRequest {
  agent: AgentRegistrationDto;
}

interface GrpcAgentResponse {
  agent?: RegisteredAgent;
  error?: string;
}

interface GrpcRegistrationResponse {
  success: boolean;
  agentId: string;
  leaseId?: number;
  ttl: number;
  message: string;
  registeredAt: string;
  heartbeatInterval: number;
}

interface GrpcDeregistrationRequest {
  agentId: string;
  reason?: string;
}

interface GrpcDeregistrationResponse {
  success: boolean;
  agentId: string;
  message: string;
  deregisteredAt: string;
  reason: string;
}

interface GrpcAgentUpdateRequest {
  agentId: string;
  updates: AgentUpdateDto;
}

interface GrpcGetAgentRequest {
  agentId: string;
}

interface GrpcGetAgentsByTypeRequest {
  type: AgentType;
}

interface GrpcAgentListResponse {
  agents: RegisteredAgent[];
}

interface GrpcHeartbeatRequest {
  agentId: string;
  health?: any;
  metadata?: Record<string, any>;
}

interface GrpcHeartbeatResponse {
  success: boolean;
  ttl: number;
  message?: string;
  nextHeartbeat: string;
}

interface GrpcRegistryStatsRequest {
  // Empty request
}

interface GrpcRegistryStatsResponse {
  totalAgents: number;
  agentsByType: Record<string, number>;
  healthyAgents: number;
  unhealthyAgents: number;
  averageResponseTime: number;
  uptime: number;
  timestamp: string;
}

interface GrpcAgentWatchRequest {
  agentId?: string;
  type?: AgentType;
  watchHealth?: boolean;
}

interface GrpcAgentWatchResponse {
  eventType: 'registered' | 'deregistered' | 'updated' | 'health_changed';
  agentId: string;
  agent?: RegisteredAgent;
  timestamp: string;
}

@Controller()
export class RegistryGateway {
  private readonly logger = new Logger(RegistryGateway.name);
  private readonly watchStreams = new Map<string, Subject<GrpcAgentWatchResponse>>();

  constructor(private readonly registryService: RegistryService) {
    this.logger.log('Registry gRPC Gateway initialized');
  }

  /**
   * Register agent via gRPC
   */
  @GrpcMethod('RegistryService', 'RegisterAgent')
  async registerAgent(data: GrpcAgentRegistrationRequest): Promise<GrpcRegistrationResponse> {
    try {
      this.logger.debug(`gRPC RegisterAgent called for: ${data.agent.id}`);
      
      const result = await this.registryService.registerAgent(data.agent);
      
      return {
        success: result.success,
        agentId: result.agentId,
        leaseId: result.leaseId,
        ttl: result.ttl,
        message: result.message,
        registeredAt: result.registeredAt.toISOString(),
        heartbeatInterval: result.heartbeatInterval,
      };
    } catch (error) {
      this.logger.error(`gRPC RegisterAgent failed for ${data.agent.id}:`, error);
      throw error;
    }
  }

  /**
   * Deregister agent via gRPC
   */
  @GrpcMethod('RegistryService', 'DeregisterAgent')
  async deregisterAgent(data: GrpcDeregistrationRequest): Promise<GrpcDeregistrationResponse> {
    try {
      this.logger.debug(`gRPC DeregisterAgent called for: ${data.agentId}`);
      
      const result = await this.registryService.deregisterAgent(data.agentId, data.reason);
      
      return {
        success: result.success,
        agentId: result.agentId,
        message: result.message,
        deregisteredAt: result.deregisteredAt.toISOString(),
        reason: result.reason,
      };
    } catch (error) {
      this.logger.error(`gRPC DeregisterAgent failed for ${data.agentId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent via gRPC
   */
  @GrpcMethod('RegistryService', 'UpdateAgent')
  async updateAgent(data: GrpcAgentUpdateRequest): Promise<GrpcAgentResponse> {
    try {
      this.logger.debug(`gRPC UpdateAgent called for: ${data.agentId}`);
      
      const agent = await this.registryService.updateAgent(data.agentId, data.updates);
      
      return { agent };
    } catch (error) {
      this.logger.error(`gRPC UpdateAgent failed for ${data.agentId}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Get agent by ID via gRPC
   */
  @GrpcMethod('RegistryService', 'GetAgent')
  async getAgent(data: GrpcGetAgentRequest): Promise<GrpcAgentResponse> {
    try {
      this.logger.debug(`gRPC GetAgent called for: ${data.agentId}`);
      
      const agent = await this.registryService.getAgentById(data.agentId);
      
      if (!agent) {
        return { error: `Agent ${data.agentId} not found` };
      }
      
      return { agent };
    } catch (error) {
      this.logger.error(`gRPC GetAgent failed for ${data.agentId}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Get all agents via gRPC
   */
  @GrpcMethod('RegistryService', 'GetAllAgents')
  async getAllAgents(): Promise<GrpcAgentListResponse> {
    try {
      this.logger.debug('gRPC GetAllAgents called');
      
      const agents = await this.registryService.getAllAgents();
      
      return { agents };
    } catch (error) {
      this.logger.error('gRPC GetAllAgents failed:', error);
      throw error;
    }
  }

  /**
   * Get agents by type via gRPC
   */
  @GrpcMethod('RegistryService', 'GetAgentsByType')
  async getAgentsByType(data: GrpcGetAgentsByTypeRequest): Promise<GrpcAgentListResponse> {
    try {
      this.logger.debug(`gRPC GetAgentsByType called for type: ${data.type}`);
      
      const agents = await this.registryService.getAgentsByType(data.type);
      
      return { agents };
    } catch (error) {
      this.logger.error(`gRPC GetAgentsByType failed for type ${data.type}:`, error);
      throw error;
    }
  }

  /**
   * Send heartbeat via gRPC
   */
  @GrpcMethod('RegistryService', 'Heartbeat')
  async heartbeat(data: GrpcHeartbeatRequest): Promise<GrpcHeartbeatResponse> {
    try {
      this.logger.debug(`gRPC Heartbeat called for: ${data.agentId}`);
      
      // Update health if provided
      if (data.health) {
        await this.registryService.updateAgentHealth(data.agentId, data.health);
      }

      // Process heartbeat
      const result = await this.registryService.heartbeat(data.agentId);
      
      // Calculate next heartbeat time
      const nextHeartbeat = new Date();
      nextHeartbeat.setSeconds(nextHeartbeat.getSeconds() + 30);

      return {
        success: result.success,
        ttl: result.ttl,
        message: 'Heartbeat processed successfully',
        nextHeartbeat: nextHeartbeat.toISOString(),
      };
    } catch (error) {
      this.logger.error(`gRPC Heartbeat failed for ${data.agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get registry statistics via gRPC
   */
  @GrpcMethod('RegistryService', 'GetRegistryStats')
  async getRegistryStats(data: GrpcRegistryStatsRequest): Promise<GrpcRegistryStatsResponse> {
    try {
      this.logger.debug('gRPC GetRegistryStats called');
      
      const stats = await this.registryService.getRegistryStats();
      
      return {
        ...stats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('gRPC GetRegistryStats failed:', error);
      throw error;
    }
  }

  /**
   * Watch agent changes via gRPC streaming
   */
  @GrpcStreamMethod('RegistryService', 'WatchAgents')
  watchAgents(data$: Observable<GrpcAgentWatchRequest>): Observable<GrpcAgentWatchResponse> {
    const streamId = `watch-${Date.now()}-${Math.random()}`;
    const subject = new Subject<GrpcAgentWatchResponse>();
    
    this.watchStreams.set(streamId, subject);
    this.logger.debug(`Created agent watch stream: ${streamId}`);

    // Handle incoming watch requests
    data$.subscribe({
      next: (request) => {
        this.logger.debug(`Watch request received:`, request);
        // Configure watch filters based on request
        // This would integrate with the event system
      },
      error: (error) => {
        this.logger.error(`Watch stream error for ${streamId}:`, error);
        this.watchStreams.delete(streamId);
        subject.error(error);
      },
      complete: () => {
        this.logger.debug(`Watch stream completed: ${streamId}`);
        this.watchStreams.delete(streamId);
        subject.complete();
      },
    });

    // Clean up on subscription end
    subject.asObservable().subscribe({
      error: () => this.watchStreams.delete(streamId),
      complete: () => this.watchStreams.delete(streamId),
    });

    return subject.asObservable();
  }

  /**
   * Discover agents by capability via gRPC
   */
  @GrpcMethod('RegistryService', 'DiscoverAgents')
  async discoverAgents(data: {
    capability?: string;
    type?: AgentType;
    tags?: string[];
    healthy?: boolean;
  }): Promise<GrpcAgentListResponse> {
    try {
      this.logger.debug('gRPC DiscoverAgents called with filters:', data);
      
      let agents = await this.registryService.getAllAgents();

      // Filter by type
      if (data.type) {
        agents = agents.filter(agent => agent.type === data.type);
      }

      // Filter by capability
      if (data.capability) {
        agents = agents.filter(agent => 
          agent.capabilities.some(cap => cap.name === data.capability)
        );
      }

      // Filter by tags
      if (data.tags && data.tags.length > 0) {
        agents = agents.filter(agent => 
          agent.tags && data.tags.some(tag => agent.tags.includes(tag))
        );
      }

      // Filter by health status
      if (data.healthy !== undefined) {
        agents = agents.filter(agent => {
          const isHealthy = agent.health.status === 'healthy';
          return data.healthy ? isHealthy : !isHealthy;
        });
      }

      return { agents };
    } catch (error) {
      this.logger.error('gRPC DiscoverAgents failed:', error);
      throw error;
    }
  }

  /**
   * Batch register multiple agents via gRPC
   */
  @GrpcMethod('RegistryService', 'BatchRegisterAgents')
  async batchRegisterAgents(data: { agents: AgentRegistrationDto[] }): Promise<{
    results: GrpcRegistrationResponse[];
    successCount: number;
    failureCount: number;
  }> {
    try {
      this.logger.debug(`gRPC BatchRegisterAgents called for ${data.agents.length} agents`);
      
      const results: GrpcRegistrationResponse[] = [];
      let successCount = 0;
      let failureCount = 0;

      // Process each agent registration
      for (const agent of data.agents) {
        try {
          const result = await this.registryService.registerAgent(agent);
          
          results.push({
            success: result.success,
            agentId: result.agentId,
            leaseId: result.leaseId,
            ttl: result.ttl,
            message: result.message,
            registeredAt: result.registeredAt.toISOString(),
            heartbeatInterval: result.heartbeatInterval,
          });
          
          successCount++;
        } catch (error) {
          results.push({
            success: false,
            agentId: agent.id,
            ttl: 0,
            message: error.message,
            registeredAt: new Date().toISOString(),
            heartbeatInterval: 30,
          });
          
          failureCount++;
        }
      }

      return { results, successCount, failureCount };
    } catch (error) {
      this.logger.error('gRPC BatchRegisterAgents failed:', error);
      throw error;
    }
  }

  /**
   * Broadcast event to all watch streams
   */
  private broadcastEvent(event: GrpcAgentWatchResponse): void {
    this.watchStreams.forEach((subject, streamId) => {
      try {
        subject.next(event);
      } catch (error) {
        this.logger.error(`Failed to broadcast to watch stream ${streamId}:`, error);
        this.watchStreams.delete(streamId);
      }
    });
  }

  /**
   * Handle agent registration events
   */
  onAgentRegistered(agentId: string, agent: RegisteredAgent): void {
    this.broadcastEvent({
      eventType: 'registered',
      agentId,
      agent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle agent deregistration events
   */
  onAgentDeregistered(agentId: string): void {
    this.broadcastEvent({
      eventType: 'deregistered',
      agentId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle agent update events
   */
  onAgentUpdated(agentId: string, agent: RegisteredAgent): void {
    this.broadcastEvent({
      eventType: 'updated',
      agentId,
      agent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle agent health change events
   */
  onAgentHealthChanged(agentId: string, agent: RegisteredAgent): void {
    this.broadcastEvent({
      eventType: 'health_changed',
      agentId,
      agent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Clean up all watch streams
   */
  onModuleDestroy(): void {
    this.logger.log('Cleaning up gRPC watch streams');
    this.watchStreams.forEach((subject, streamId) => {
      subject.complete();
    });
    this.watchStreams.clear();
  }
}