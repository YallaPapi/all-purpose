/**
 * Agent Lifecycle Service
 * 
 * Manages UEP agent lifecycle events, state transitions, and coordination
 * between registry components. Handles event-driven architecture for
 * agent registration, health monitoring, and cleanup operations.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RegistryCacheService } from './registry-cache.service';
import { EtcdService } from '../etcd/etcd.service';
import { metricsHelpers } from '../monitoring/prometheus.setup';
import { RegisteredAgent, HealthStatus } from './dto/registry.dto';

interface AgentLifecycleEvent {
  agentId: string;
  agent?: RegisteredAgent;
  eventType: 'registered' | 'deregistered' | 'updated' | 'health_changed' | 'lease_expired';
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface AgentLeaseInfo {
  agentId: string;
  leaseId: number;
  ttl: number;
  expiresAt: Date;
}

@Injectable()
export class AgentLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentLifecycleService.name);
  private readonly activeLeases = new Map<string, AgentLeaseInfo>();
  private readonly lifecycleEventQueue: AgentLifecycleEvent[] = [];
  private readonly maxEventQueueSize: number;
  private readonly healthCheckTimeout: number;
  private readonly leaseRenewalThreshold: number;
  private isShuttingDown = false;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: RegistryCacheService,
    private readonly etcdService: EtcdService,
    @Optional() private readonly configService: ConfigService,
    @InjectQueue('registry-cleanup') private cleanupQueue: Queue,
    @InjectQueue('health-monitoring') private healthQueue: Queue,
  ) {
    this.maxEventQueueSize = this.configService?.get<number>('LIFECYCLE_EVENT_QUEUE_SIZE', 1000) || parseInt(process.env.LIFECYCLE_EVENT_QUEUE_SIZE || '1000');
    this.healthCheckTimeout = this.configService?.get<number>('HEALTH_CHECK_TIMEOUT_MS', 5000) || parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '5000');
    this.leaseRenewalThreshold = this.configService?.get<number>('LEASE_RENEWAL_THRESHOLD_SECONDS', 60) || parseInt(process.env.LEASE_RENEWAL_THRESHOLD_SECONDS || '60');
    
    this.logger.log(`Agent Lifecycle Service initialized with queue size: ${this.maxEventQueueSize}`);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Starting Agent Lifecycle Service');
    
    // Initialize lease tracking
    await this.initializeLeaseTracking();
    
    // Start background processes
    await this.startBackgroundProcesses();
    
    this.logger.log('Agent Lifecycle Service started');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Agent Lifecycle Service');
    this.isShuttingDown = true;
    
    // Process remaining events
    await this.processEventQueue();
    
    // Clean up resources
    this.activeLeases.clear();
    
    this.logger.log('Agent Lifecycle Service shutdown complete');
  }

  /**
   * Handle agent registration events
   */
  @OnEvent('agent.registered')
  async handleAgentRegistered(payload: {
    agent: RegisteredAgent;
    leaseId: number;
    registrationTime: number;
  }): Promise<void> {
    try {
      this.logger.debug(`Handling agent registration: ${payload.agent.id}`);
      
      // Track lease information
      const ttl = this.configService?.get<number>('UEP_REGISTRY_TTL_SECONDS', 300) || parseInt(process.env.UEP_REGISTRY_TTL_SECONDS || '300');
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + ttl);
      
      this.activeLeases.set(payload.agent.id, {
        agentId: payload.agent.id,
        leaseId: payload.leaseId,
        ttl,
        expiresAt,
      });

      // Create lifecycle event
      const event: AgentLifecycleEvent = {
        agentId: payload.agent.id,
        agent: payload.agent,
        eventType: 'registered',
        timestamp: new Date(),
        metadata: {
          leaseId: payload.leaseId,
          registrationTime: payload.registrationTime,
          ttl,
        },
      };

      await this.queueLifecycleEvent(event);

      // Schedule lease monitoring
      await this.scheduleLeaseMonitoring(payload.agent.id, payload.leaseId, ttl);

      // Update metrics
      metricsHelpers.recordAgentLifecycleEvent('registered', payload.agent.type);

      this.logger.debug(`Agent registration handled: ${payload.agent.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle agent registration for ${payload.agent.id}:`, error);
    }
  }

  /**
   * Handle agent deregistration events
   */
  @OnEvent('agent.deregistered')
  async handleAgentDeregistered(payload: {
    agent: RegisteredAgent;
    reason: string;
    deregistrationTime: number;
  }): Promise<void> {
    try {
      this.logger.debug(`Handling agent deregistration: ${payload.agent.id}`);
      
      // Remove lease tracking
      this.activeLeases.delete(payload.agent.id);

      // Cancel monitoring jobs
      await this.cancelAgentMonitoring(payload.agent.id);

      // Create lifecycle event
      const event: AgentLifecycleEvent = {
        agentId: payload.agent.id,
        agent: payload.agent,
        eventType: 'deregistered',
        timestamp: new Date(),
        metadata: {
          reason: payload.reason,
          deregistrationTime: payload.deregistrationTime,
        },
      };

      await this.queueLifecycleEvent(event);

      // Schedule cleanup tasks
      await this.scheduleAgentCleanup(payload.agent.id, payload.reason);

      // Update metrics
      metricsHelpers.recordAgentLifecycleEvent('deregistered', payload.agent.type);

      this.logger.debug(`Agent deregistration handled: ${payload.agent.id}`);
    } catch (error) {
      this.logger.error(`Failed to handle agent deregistration for ${payload.agent.id}:`, error);
    }
  }

  /**
   * Handle agent update events
   */
  @OnEvent('agent.updated')
  async handleAgentUpdated(payload: {
    agentId: string;
    previousAgent: RegisteredAgent;
    updatedAgent: RegisteredAgent;
  }): Promise<void> {
    try {
      this.logger.debug(`Handling agent update: ${payload.agentId}`);
      
      // Create lifecycle event
      const event: AgentLifecycleEvent = {
        agentId: payload.agentId,
        agent: payload.updatedAgent,
        eventType: 'updated',
        timestamp: new Date(),
        metadata: {
          previousVersion: payload.previousAgent.version,
          newVersion: payload.updatedAgent.version,
          changedFields: this.detectChangedFields(payload.previousAgent, payload.updatedAgent),
        },
      };

      await this.queueLifecycleEvent(event);

      // Check if capabilities changed and update monitoring
      if (this.capabilitiesChanged(payload.previousAgent, payload.updatedAgent)) {
        await this.updateCapabilityMonitoring(payload.agentId, payload.updatedAgent);
      }

      // Update metrics
      metricsHelpers.recordAgentLifecycleEvent('updated', payload.updatedAgent.type);

      this.logger.debug(`Agent update handled: ${payload.agentId}`);
    } catch (error) {
      this.logger.error(`Failed to handle agent update for ${payload.agentId}:`, error);
    }
  }

  /**
   * Handle agent health change events
   */
  @OnEvent('agent.health.updated')
  async handleAgentHealthUpdated(payload: {
    agentId: string;
    health: any;
  }): Promise<void> {
    try {
      this.logger.debug(`Handling health update for agent: ${payload.agentId}`);
      
      const agent = await this.cacheService.getAgent(payload.agentId);
      if (!agent) {
        this.logger.warn(`Health update for non-existent agent: ${payload.agentId}`);
        return;
      }

      // Check for health status changes
      const previousStatus = agent.health.status;
      const newStatus = payload.health.status;
      
      if (previousStatus !== newStatus) {
        // Create lifecycle event for health change
        const event: AgentLifecycleEvent = {
          agentId: payload.agentId,
          agent,
          eventType: 'health_changed',
          timestamp: new Date(),
          metadata: {
            previousStatus,
            newStatus,
            responseTime: payload.health.responseTime,
            consecutiveFailures: payload.health.consecutiveFailures,
          },
        };

        await this.queueLifecycleEvent(event);

        // Handle unhealthy agents
        if (newStatus === HealthStatus.UNHEALTHY) {
          await this.handleUnhealthyAgent(payload.agentId, agent);
        }

        // Handle recovered agents
        if (previousStatus === HealthStatus.UNHEALTHY && newStatus === HealthStatus.HEALTHY) {
          await this.handleAgentRecovery(payload.agentId, agent);
        }
      }

      // Update metrics
      metricsHelpers.recordHealthCheck(
        payload.agentId,
        newStatus === HealthStatus.HEALTHY ? 'success' : 'failure',
        payload.health.responseTime,
      );

      this.logger.debug(`Health update handled for agent: ${payload.agentId}`);
    } catch (error) {
      this.logger.error(`Failed to handle health update for ${payload.agentId}:`, error);
    }
  }

  /**
   * Periodic lease monitoring and renewal
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorLeases(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const now = new Date();
      const expiringSoon: AgentLeaseInfo[] = [];

      // Check for leases expiring soon
      for (const [agentId, leaseInfo] of this.activeLeases.entries()) {
        const timeUntilExpiry = leaseInfo.expiresAt.getTime() - now.getTime();
        
        if (timeUntilExpiry <= this.leaseRenewalThreshold * 1000) {
          expiringSoon.push(leaseInfo);
        }
      }

      // Process expiring leases
      for (const leaseInfo of expiringSoon) {
        await this.handleExpiringLease(leaseInfo);
      }

      if (expiringSoon.length > 0) {
        this.logger.debug(`Processed ${expiringSoon.length} expiring leases`);
      }
    } catch (error) {
      this.logger.error('Error during lease monitoring:', error);
    }
  }

  /**
   * Periodic cleanup of orphaned data
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupOrphanedData(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      // Schedule cleanup job
      await this.cleanupQueue.add('cleanup-orphaned-data', {
        timestamp: new Date(),
      });

      this.logger.debug('Scheduled orphaned data cleanup');
    } catch (error) {
      this.logger.error('Error scheduling orphaned data cleanup:', error);
    }
  }

  /**
   * Process lifecycle event queue
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processEventQueue(): Promise<void> {
    if (this.lifecycleEventQueue.length === 0) return;

    try {
      const events = this.lifecycleEventQueue.splice(0, 100);
      
      for (const event of events) {
        await this.processLifecycleEvent(event);
      }

      this.logger.debug(`Processed ${events.length} lifecycle events`);
    } catch (error) {
      this.logger.error('Error processing lifecycle event queue:', error);
    }
  }

  /**
   * Private helper methods
   */

  private async initializeLeaseTracking(): Promise<void> {
    try {
      // Load existing agents and their lease information
      const agentData = await this.etcdService.getPrefix('uep/registry/agents/');
      
      for (const [key, value] of Object.entries(agentData)) {
        try {
          const agent = JSON.parse(value) as RegisteredAgent;
          const agentId = key.replace('uep/registry/agents/', '');
          
          // Estimate lease expiration (this would ideally come from etcd lease info)
          const expiresAt = new Date(agent.lastHeartbeat);
          expiresAt.setSeconds(expiresAt.getSeconds() + 300);
          
          this.activeLeases.set(agentId, {
            agentId,
            leaseId: 0, // Would need to retrieve from etcd
            ttl: 300,
            expiresAt,
          });
        } catch (error) {
          this.logger.warn(`Failed to parse agent data for key ${key}:`, error);
        }
      }

      this.logger.log(`Initialized lease tracking for ${this.activeLeases.size} agents`);
    } catch (error) {
      this.logger.error('Failed to initialize lease tracking:', error);
    }
  }

  private async startBackgroundProcesses(): Promise<void> {
    // Any additional background processes can be started here
    this.logger.debug('Background processes started');
  }

  private async queueLifecycleEvent(event: AgentLifecycleEvent): Promise<void> {
    if (this.lifecycleEventQueue.length >= this.maxEventQueueSize) {
      // Remove oldest event to make room
      this.lifecycleEventQueue.shift();
      this.logger.warn('Lifecycle event queue full, removed oldest event');
    }

    this.lifecycleEventQueue.push(event);
  }

  private async processLifecycleEvent(event: AgentLifecycleEvent): Promise<void> {
    try {
      // Emit internal events for other services to consume
      this.eventEmitter.emit(`lifecycle.${event.eventType}`, event);
      
      // Log significant events
      if (event.eventType === 'registered' || event.eventType === 'deregistered') {
        this.logger.log(`Agent ${event.agentId} ${event.eventType} at ${event.timestamp.toISOString()}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process lifecycle event for ${event.agentId}:`, error);
    }
  }

  private async scheduleLeaseMonitoring(agentId: string, leaseId: number, ttl: number): Promise<void> {
    const monitoringInterval = Math.min(ttl * 1000 / 3, 30000); // Monitor at 1/3 of TTL or 30s max

    await this.healthQueue.add(
      'monitor-agent-lease',
      { agentId, leaseId, ttl },
      {
        repeat: { every: monitoringInterval },
        jobId: `lease-${agentId}`,
      },
    );
  }

  private async cancelAgentMonitoring(agentId: string): Promise<void> {
    try {
      // Cancel health monitoring
      await this.healthQueue.removeRepeatable('monitor-agent-health', {
        every: 30000,
        jobId: `health-${agentId}`,
      });

      // Cancel lease monitoring
      await this.healthQueue.removeRepeatable('monitor-agent-lease', {
        every: 30000, // This should match the actual interval
        jobId: `lease-${agentId}`,
      });
    } catch (error) {
      this.logger.warn(`Failed to cancel monitoring for agent ${agentId}:`, error);
    }
  }

  private async scheduleAgentCleanup(agentId: string, reason: string): Promise<void> {
    await this.cleanupQueue.add(
      'cleanup-agent-data',
      { agentId, reason, timestamp: new Date() },
      { delay: 5000 }, // Delay cleanup by 5 seconds
    );
  }

  private async handleExpiringLease(leaseInfo: AgentLeaseInfo): Promise<void> {
    try {
      // Check if agent is still active
      const agent = await this.cacheService.getAgent(leaseInfo.agentId);
      if (!agent) {
        this.activeLeases.delete(leaseInfo.agentId);
        return;
      }

      // Attempt to check agent health before lease expiry
      const healthCheckResult = await this.performHealthCheck(leaseInfo.agentId);
      
      if (!healthCheckResult.healthy) {
        // Agent is unhealthy and lease is expiring
        const event: AgentLifecycleEvent = {
          agentId: leaseInfo.agentId,
          agent,
          eventType: 'lease_expired',
          timestamp: new Date(),
          metadata: {
            leaseId: leaseInfo.leaseId,
            reason: 'health_check_failed',
          },
        };

        await this.queueLifecycleEvent(event);
        this.activeLeases.delete(leaseInfo.agentId);
      }
    } catch (error) {
      this.logger.error(`Failed to handle expiring lease for ${leaseInfo.agentId}:`, error);
    }
  }

  private async performHealthCheck(agentId: string): Promise<{ healthy: boolean; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const agent = await this.cacheService.getAgent(agentId);
      if (!agent || !agent.healthEndpoint) {
        return { healthy: false, responseTime: 0, error: 'No health endpoint' };
      }

      // This would make an actual HTTP request to the agent's health endpoint
      // For now, we'll simulate based on the last known health status
      const responseTime = Date.now() - startTime;
      const healthy = agent.health.status === HealthStatus.HEALTHY;
      
      return { healthy, responseTime };
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async handleUnhealthyAgent(agentId: string, agent: RegisteredAgent): Promise<void> {
    // Increase monitoring frequency for unhealthy agents
    await this.healthQueue.add(
      'intensive-health-monitoring',
      { agentId },
      {
        repeat: { every: 10000 }, // Every 10 seconds
        jobId: `intensive-health-${agentId}`,
      },
    );

    this.logger.warn(`Agent ${agentId} marked as unhealthy, increased monitoring`);
  }

  private async handleAgentRecovery(agentId: string, agent: RegisteredAgent): Promise<void> {
    // Remove intensive monitoring
    try {
      await this.healthQueue.removeRepeatable('intensive-health-monitoring', {
        every: 10000,
        jobId: `intensive-health-${agentId}`,
      });
    } catch (error) {
      // Ignore if job doesn't exist
    }

    this.logger.log(`Agent ${agentId} recovered to healthy status`);
  }

  private async updateCapabilityMonitoring(agentId: string, agent: RegisteredAgent): Promise<void> {
    // Update capability-specific monitoring if needed
    this.logger.debug(`Updated capability monitoring for agent: ${agentId}`);
  }

  private detectChangedFields(previous: RegisteredAgent, updated: RegisteredAgent): string[] {
    const changes: string[] = [];
    
    if (previous.name !== updated.name) changes.push('name');
    if (previous.version !== updated.version) changes.push('version');
    if (previous.description !== updated.description) changes.push('description');
    if (JSON.stringify(previous.capabilities) !== JSON.stringify(updated.capabilities)) changes.push('capabilities');
    if (JSON.stringify(previous.endpoints) !== JSON.stringify(updated.endpoints)) changes.push('endpoints');
    if (JSON.stringify(previous.tags) !== JSON.stringify(updated.tags)) changes.push('tags');
    
    return changes;
  }

  private capabilitiesChanged(previous: RegisteredAgent, updated: RegisteredAgent): boolean {
    return JSON.stringify(previous.capabilities) !== JSON.stringify(updated.capabilities);
  }
}