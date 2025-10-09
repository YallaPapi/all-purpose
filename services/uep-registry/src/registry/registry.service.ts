/**
 * Registry Service
 * 
 * Core service for UEP agent registration, deregistration, and lifecycle management.
 * Handles agent metadata storage, health tracking, and protocol compatibility.
 */

import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { EtcdService } from '../etcd/etcd.service';
import { RegistryValidationService } from './registry-validation.service';
import { RegistryCacheService } from './registry-cache.service';
import { metricsHelpers } from '../monitoring/prometheus.setup';
import { 
  AgentRegistrationDto, 
  AgentUpdateDto, 
  RegisteredAgent, 
  AgentHealthStatus,
  RegistrationResponse,
  DeregistrationResponse,
  HealthStatus,
} from './dto/registry.dto';

@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name);
  private readonly registryPrefix = 'uep/registry/agents/';
  private readonly healthPrefix = 'uep/registry/health/';
  private readonly defaultTtl: number;
  private readonly maxConcurrentRegistrations: number;
  private currentRegistrations = 0;

  constructor(
    private readonly etcdService: EtcdService,
    private readonly validationService: RegistryValidationService,
    private readonly cacheService: RegistryCacheService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly configService: ConfigService,
    @InjectQueue('registry-operations') private registryQueue: Queue,
    @InjectQueue('health-monitoring') private healthQueue: Queue,
  ) {
    this.defaultTtl = this.configService?.get<number>('UEP_REGISTRY_TTL_SECONDS', 300) || parseInt(process.env.UEP_REGISTRY_TTL_SECONDS || '300');
    this.maxConcurrentRegistrations = this.configService?.get<number>('MAX_CONCURRENT_REGISTRATIONS', 100) || parseInt(process.env.MAX_CONCURRENT_REGISTRATIONS || '100');
    
    this.logger.log(`Registry service initialized with TTL: ${this.defaultTtl}s, Max concurrent: ${this.maxConcurrentRegistrations}`);
  }

  /**
   * Register a new UEP agent
   */
  async registerAgent(registrationDto: AgentRegistrationDto): Promise<RegistrationResponse> {
    const startTime = Date.now();
    
    // Check concurrent registration limit
    if (this.currentRegistrations >= this.maxConcurrentRegistrations) {
      throw new BadRequestException('Maximum concurrent registrations exceeded');
    }

    this.currentRegistrations++;
    
    try {
      this.logger.log(`Registering agent: ${registrationDto.id}`);

      // Validate registration data
      await this.validationService.validateRegistration(registrationDto);

      // Check if agent already exists
      const existingAgent = await this.getAgentById(registrationDto.id);
      if (existingAgent) {
        throw new ConflictException(`Agent ${registrationDto.id} is already registered`);
      }

      // Create registered agent object
      const registeredAgent: RegisteredAgent = {
        ...registrationDto,
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        health: {
          status: HealthStatus.HEALTHY,
          lastChecked: new Date(),
          consecutiveFailures: 0,
          responseTime: 0,
        },
        metadata: {
          ...registrationDto.metadata,
          registryVersion: '1.0.0',
          lastUpdated: new Date(),
        },
      };

      // Store in etcd with lease
      const agentKey = `${this.registryPrefix}${registrationDto.id}`;
      const healthKey = `${this.healthPrefix}${registrationDto.id}`;
      
      const leaseId = await this.etcdService.putWithLease(
        agentKey,
        JSON.stringify(registeredAgent),
        this.defaultTtl,
      );

      // Store health information separately
      await this.etcdService.putWithLease(
        healthKey,
        JSON.stringify(registeredAgent.health),
        this.defaultTtl,
      );

      // Cache the agent information
      await this.cacheService.setAgent(registrationDto.id, registeredAgent);

      // Schedule health monitoring
      await this.scheduleHealthMonitoring(registrationDto.id);

      // Update metrics
      metricsHelpers.recordAgentRegistration(
        registeredAgent.type,
        registeredAgent.name,
        'success',
      );

      // Emit registration event
      this.eventEmitter.emit('agent.registered', {
        agent: registeredAgent,
        leaseId,
        registrationTime: Date.now() - startTime,
      });

      this.logger.log(`Successfully registered agent: ${registrationDto.id} with lease ${leaseId}`);

      return {
        success: true,
        agentId: registrationDto.id,
        leaseId: parseInt(leaseId), // Convert string to number for compatibility
        ttl: this.defaultTtl,
        message: 'Agent registered successfully',
        registeredAt: registeredAgent.registeredAt,
        heartbeatInterval: this.configService?.get<number>('UEP_HEALTH_CHECK_INTERVAL_SECONDS', 30) || parseInt(process.env.UEP_HEALTH_CHECK_INTERVAL_SECONDS || '30'),
      };

    } catch (error) {
      metricsHelpers.recordAgentRegistration(
        registrationDto.type,
        registrationDto.name,
        'failure',
      );

      this.logger.error(`Failed to register agent ${registrationDto.id}:`, error);
      throw error;
    } finally {
      this.currentRegistrations--;
    }
  }

  /**
   * Deregister an existing UEP agent
   */
  async deregisterAgent(agentId: string, reason: string = 'manual'): Promise<DeregistrationResponse> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Deregistering agent: ${agentId}, reason: ${reason}`);

      // Get agent information before deletion
      const agent = await this.getAgentById(agentId);
      if (!agent) {
        throw new NotFoundException(`Agent ${agentId} not found`);
      }

      // Remove from etcd
      const agentKey = `${this.registryPrefix}${agentId}`;
      const healthKey = `${this.healthPrefix}${agentId}`;
      
      await Promise.all([
        this.etcdService.delete(agentKey),
        this.etcdService.delete(healthKey),
      ]);

      // Remove from cache
      await this.cacheService.removeAgent(agentId);

      // Cancel health monitoring
      await this.cancelHealthMonitoring(agentId);

      // Update metrics
      metricsHelpers.recordAgentDeregistration(
        agent.type,
        agent.name,
        reason,
      );

      // Emit deregistration event
      this.eventEmitter.emit('agent.deregistered', {
        agent,
        reason,
        deregistrationTime: Date.now() - startTime,
      });

      this.logger.log(`Successfully deregistered agent: ${agentId}`);

      return {
        success: true,
        agentId,
        message: 'Agent deregistered successfully',
        deregisteredAt: new Date(),
        reason,
      };

    } catch (error) {
      this.logger.error(`Failed to deregister agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent information
   */
  async updateAgent(agentId: string, updateDto: AgentUpdateDto): Promise<RegisteredAgent> {
    try {
      this.logger.log(`Updating agent: ${agentId}`);

      // Get existing agent
      const existingAgent = await this.getAgentById(agentId);
      if (!existingAgent) {
        throw new NotFoundException(`Agent ${agentId} not found`);
      }

      // Validate update data
      await this.validationService.validateUpdate(updateDto);

      // Create updated agent object
      const updatedAgent: RegisteredAgent = {
        ...existingAgent,
        ...updateDto,
        lastHeartbeat: new Date(),
        metadata: {
          ...existingAgent.metadata,
          ...updateDto.metadata,
          lastUpdated: new Date(),
        },
      };

      // Store updated information
      const agentKey = `${this.registryPrefix}${agentId}`;
      await this.etcdService.put(agentKey, JSON.stringify(updatedAgent));

      // Update cache
      await this.cacheService.setAgent(agentId, updatedAgent);

      // Emit update event
      this.eventEmitter.emit('agent.updated', {
        agentId,
        previousAgent: existingAgent,
        updatedAgent,
      });

      this.logger.log(`Successfully updated agent: ${agentId}`);
      return updatedAgent;

    } catch (error) {
      this.logger.error(`Failed to update agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: string): Promise<RegisteredAgent | null> {
    try {
      // Try cache first
      const cachedAgent = await this.cacheService.getAgent(agentId);
      if (cachedAgent) {
        metricsHelpers.recordCacheHit('agent');
        return cachedAgent;
      }

      metricsHelpers.recordCacheMiss('agent');

      // Get from etcd
      const agentKey = `${this.registryPrefix}${agentId}`;
      const agentData = await this.etcdService.get(agentKey);
      
      if (!agentData) {
        return null;
      }

      const agent = JSON.parse(agentData) as RegisteredAgent;
      
      // Update cache
      await this.cacheService.setAgent(agentId, agent);
      
      return agent;

    } catch (error) {
      this.logger.error(`Failed to get agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Get all registered agents
   */
  async getAllAgents(): Promise<RegisteredAgent[]> {
    try {
      const agentData = await this.etcdService.getPrefix(this.registryPrefix);
      
      const agents: RegisteredAgent[] = [];
      for (const [key, value] of Object.entries(agentData)) {
        try {
          const agent = JSON.parse(value) as RegisteredAgent;
          agents.push(agent);
        } catch (error) {
          this.logger.warn(`Failed to parse agent data for key ${key}:`, error);
        }
      }

      return agents;

    } catch (error) {
      this.logger.error('Failed to get all agents:', error);
      throw error;
    }
  }

  /**
   * Get agents by type
   */
  async getAgentsByType(type: 'meta' | 'domain' | 'system'): Promise<RegisteredAgent[]> {
    try {
      const allAgents = await this.getAllAgents();
      return allAgents.filter(agent => agent.type === type);
    } catch (error) {
      this.logger.error(`Failed to get agents by type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Update agent health status
   */
  async updateAgentHealth(agentId: string, healthStatus: AgentHealthStatus): Promise<void> {
    try {
      const agent = await this.getAgentById(agentId);
      if (!agent) {
        this.logger.warn(`Attempted to update health for non-existent agent: ${agentId}`);
        return;
      }

      // Update health information
      agent.health = {
        ...healthStatus,
        lastChecked: new Date(),
      };
      agent.lastHeartbeat = new Date();

      // Store updated health
      const healthKey = `${this.healthPrefix}${agentId}`;
      await this.etcdService.put(healthKey, JSON.stringify(agent.health));

      // Update cache
      await this.cacheService.setAgent(agentId, agent);

      // Emit health update event
      this.eventEmitter.emit('agent.health.updated', {
        agentId,
        health: healthStatus,
      });

      metricsHelpers.recordHealthCheck(
        agentId,
        healthStatus.status === 'healthy' ? 'success' : 'failure',
        healthStatus.responseTime,
      );

    } catch (error) {
      this.logger.error(`Failed to update health for agent ${agentId}:`, error);
    }
  }

  /**
   * Send heartbeat for agent
   */
  async heartbeat(agentId: string): Promise<{ success: boolean; ttl: number }> {
    try {
      const agent = await this.getAgentById(agentId);
      if (!agent) {
        throw new NotFoundException(`Agent ${agentId} not found`);
      }

      // Update last heartbeat
      agent.lastHeartbeat = new Date();
      
      // Renew lease by updating the agent data
      const agentKey = `${this.registryPrefix}${agentId}`;
      await this.etcdService.put(agentKey, JSON.stringify(agent));

      // Update cache
      await this.cacheService.setAgent(agentId, agent);

      return {
        success: true,
        ttl: this.defaultTtl,
      };

    } catch (error) {
      this.logger.error(`Heartbeat failed for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule health monitoring for an agent
   */
  private async scheduleHealthMonitoring(agentId: string): Promise<void> {
    const healthCheckInterval = (this.configService?.get<number>('UEP_HEALTH_CHECK_INTERVAL_SECONDS', 30) || parseInt(process.env.UEP_HEALTH_CHECK_INTERVAL_SECONDS || '30')) * 1000;

    await this.healthQueue.add(
      'monitor-agent-health',
      { agentId },
      {
        repeat: { every: healthCheckInterval },
        jobId: `health-${agentId}`,
      },
    );

    this.logger.debug(`Scheduled health monitoring for agent: ${agentId}`);
  }

  /**
   * Cancel health monitoring for an agent
   */
  private async cancelHealthMonitoring(agentId: string): Promise<void> {
    try {
      await this.healthQueue.removeRepeatable('monitor-agent-health', {
        every: (this.configService?.get<number>('UEP_HEALTH_CHECK_INTERVAL_SECONDS', 30) || parseInt(process.env.UEP_HEALTH_CHECK_INTERVAL_SECONDS || '30')) * 1000,
        jobId: `health-${agentId}`,
      });

      this.logger.debug(`Cancelled health monitoring for agent: ${agentId}`);
    } catch (error) {
      this.logger.warn(`Failed to cancel health monitoring for agent ${agentId}:`, error);
    }
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<{
    totalAgents: number;
    agentsByType: Record<string, number>;
    healthyAgents: number;
    unhealthyAgents: number;
    averageResponseTime: number;
  }> {
    try {
      const allAgents = await this.getAllAgents();
      
      const stats = {
        totalAgents: allAgents.length,
        agentsByType: {} as Record<string, number>,
        healthyAgents: 0,
        unhealthyAgents: 0,
        averageResponseTime: 0,
      };

      let totalResponseTime = 0;

      for (const agent of allAgents) {
        // Count by type
        stats.agentsByType[agent.type] = (stats.agentsByType[agent.type] || 0) + 1;

        // Count by health
        if (agent.health.status === 'healthy') {
          stats.healthyAgents++;
        } else {
          stats.unhealthyAgents++;
        }

        // Sum response times
        totalResponseTime += agent.health.responseTime;
      }

      // Calculate average response time
      if (allAgents.length > 0) {
        stats.averageResponseTime = totalResponseTime / allAgents.length;
      }

      return stats;

    } catch (error) {
      this.logger.error('Failed to get registry stats:', error);
      throw error;
    }
  }
}