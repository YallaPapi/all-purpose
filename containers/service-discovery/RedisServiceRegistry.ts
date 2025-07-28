/**
 * Redis-Based Service Registry Implementation
 * Task 191.2: Implement Redis-Based Service Registry with Health Checking
 * 
 * This provides a complementary registry to Consul using Redis for:
 * - High-performance service lookup (sub-10ms)
 * - Simple deployment scenarios
 * - Development environments
 * - Caching layer for Consul registry
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';
import {
  AgentRegistrationMetadata,
  AgentRegistrationUpdate,
  AgentRegistrationEvent,
  ServiceDiscoveryQuery,
  ServiceDiscoveryResult,
  AgentStatus,
  validateAgentRegistration
} from '../src/uep/service-registry/types/AgentRegistration.js';

export interface RedisRegistryConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
  };
  healthCheck: {
    interval: number;           // Milliseconds between health checks
    timeout: number;            // Milliseconds to wait for health response
    retries: number;            // Number of failed checks before marking unhealthy
    deregistrationDelay: number; // Milliseconds to wait before auto-deregistering
  };
  heartbeat: {
    interval: number;           // Milliseconds between heartbeat updates
    ttl: number;                // Seconds for heartbeat TTL
  };
}

interface HealthCheckState {
  consecutiveFailures: number;
  lastSuccessful: string;
  lastAttempt: string;
  timeoutId?: NodeJS.Timeout;
}

export class RedisServiceRegistry extends EventEmitter {
  private redis: Redis;
  private config: RedisRegistryConfig;
  private registeredAgents: Map<string, AgentRegistrationMetadata> = new Map();
  private healthCheckStates: Map<string, HealthCheckState> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown = false;

  // Redis key patterns
  private readonly KEYS = {
    AGENT: (id: string) => `${this.config.redis.keyPrefix || 'uep:agent'}:${id}`,
    AGENT_LIST: () => `${this.config.redis.keyPrefix || 'uep:agent'}:list`,
    AGENT_BY_TYPE: (type: string) => `${this.config.redis.keyPrefix || 'uep:agent'}:type:${type}`,
    AGENT_CAPABILITIES: (capability: string) => `${this.config.redis.keyPrefix || 'uep:agent'}:capability:${capability}`,
    AGENT_HEARTBEAT: (id: string) => `${this.config.redis.keyPrefix || 'uep:agent'}:heartbeat:${id}`,
    AGENT_HEALTH: (id: string) => `${this.config.redis.keyPrefix || 'uep:agent'}:health:${id}`,
    REGISTRY_EVENTS: () => `${this.config.redis.keyPrefix || 'uep:agent'}:events`
  };

  constructor(config: RedisRegistryConfig) {
    super();
    this.config = config;
    
    // Initialize Redis connection
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryDelayOnFailover: config.redis.retryDelayOnFailover,
      enableReadyCheck: config.redis.enableReadyCheck,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest
    });

    this.setupRedisEventHandlers();
  }

  /**
   * Initialize Redis connection and event handlers
   */
  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('Redis Service Registry connected');
    });

    this.redis.on('error', (error) => {
      console.error('Redis Service Registry error:', error);
      this.emit('error', error);
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis Service Registry reconnecting...');
    });

    this.redis.on('ready', () => {
      console.log('Redis Service Registry ready');
    });
  }

  /**
   * Register an agent with the service registry
   */
  async registerAgent(metadata: AgentRegistrationMetadata): Promise<void> {
    // Validate registration data
    const validation = validateAgentRegistration(metadata);
    if (!validation.valid) {
      const error = new Error(`Agent registration validation failed: ${validation.errors.join(', ')}`);
      this.emit('error', error);
      throw error;
    }

    try {
      const pipeline = this.redis.pipeline();
      const agentId = metadata.agentId;
      const agentKey = this.KEYS.AGENT(agentId);
      
      // Store complete agent metadata
      pipeline.hset(agentKey, 'metadata', JSON.stringify(metadata));
      pipeline.hset(agentKey, 'status', metadata.status);
      pipeline.hset(agentKey, 'last_updated', new Date().toISOString());
      pipeline.hset(agentKey, 'registration_time', metadata.registrationTime);
      
      // Add to agent list
      pipeline.sadd(this.KEYS.AGENT_LIST(), agentId);
      
      // Index by agent type
      pipeline.sadd(this.KEYS.AGENT_BY_TYPE(metadata.agentType), agentId);
      
      // Index by capabilities
      for (const capability of metadata.capabilities) {
        pipeline.sadd(this.KEYS.AGENT_CAPABILITIES(capability.name), agentId);
      }
      
      // Set heartbeat with TTL
      pipeline.setex(
        this.KEYS.AGENT_HEARTBEAT(agentId), 
        this.config.heartbeat.ttl, 
        new Date().toISOString()
      );
      
      // Set initial health status
      pipeline.hset(this.KEYS.AGENT_HEALTH(agentId), {
        status: 'healthy',
        last_check: new Date().toISOString(),
        consecutive_failures: '0',
        check_url: this.buildHealthCheckUrl(metadata)
      });

      await pipeline.exec();
      
      // Store locally
      this.registeredAgents.set(agentId, metadata);
      
      // Initialize health check state
      this.healthCheckStates.set(agentId, {
        consecutiveFailures: 0,
        lastSuccessful: new Date().toISOString(),
        lastAttempt: new Date().toISOString()
      });
      
      // Start monitoring
      this.startHealthMonitoring(metadata);
      this.startHeartbeatUpdates(metadata);
      
      // Publish registration event
      await this.publishEvent({
        eventType: 'register',
        agentId,
        timestamp: new Date().toISOString(),
        metadata,
        source: 'RedisServiceRegistry'
      });
      
      this.emit('agentRegistered', metadata);
      console.log(`Agent ${agentId} (${metadata.agentType}) registered in Redis registry`);
      
    } catch (error) {
      const regError = new Error(`Failed to register agent ${metadata.agentId}: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', regError);
      throw regError;
    }
  }

  /**
   * Deregister an agent from the service registry
   */
  async deregisterAgent(agentId: string, reason?: string): Promise<void> {
    try {
      const metadata = this.registeredAgents.get(agentId);
      if (!metadata) {
        // Check if agent exists in Redis
        const exists = await this.redis.exists(this.KEYS.AGENT(agentId));
        if (!exists) {
          throw new Error(`Agent ${agentId} not found in registry`);
        }
        
        // Get metadata from Redis
        const storedMetadata = await this.redis.hget(this.KEYS.AGENT(agentId), 'metadata');
        if (storedMetadata) {
          const parsedMetadata = JSON.parse(storedMetadata) as AgentRegistrationMetadata;
          this.registeredAgents.set(agentId, parsedMetadata);
        }
      }

      const pipeline = this.redis.pipeline();
      
      // Remove agent data
      pipeline.del(this.KEYS.AGENT(agentId));
      pipeline.del(this.KEYS.AGENT_HEARTBEAT(agentId));
      pipeline.del(this.KEYS.AGENT_HEALTH(agentId));
      
      // Remove from indexes
      pipeline.srem(this.KEYS.AGENT_LIST(), agentId);
      
      if (metadata) {
        pipeline.srem(this.KEYS.AGENT_BY_TYPE(metadata.agentType), agentId);
        for (const capability of metadata.capabilities) {
          pipeline.srem(this.KEYS.AGENT_CAPABILITIES(capability.name), agentId);
        }
      }

      await pipeline.exec();
      
      // Stop monitoring
      this.stopHealthMonitoring(agentId);
      this.stopHeartbeatUpdates(agentId);
      
      // Remove local data
      this.registeredAgents.delete(agentId);
      this.healthCheckStates.delete(agentId);
      
      // Publish deregistration event
      await this.publishEvent({
        eventType: 'deregister',
        agentId,
        timestamp: new Date().toISOString(),
        reason,
        source: 'RedisServiceRegistry'
      });
      
      this.emit('agentDeregistered', agentId);
      console.log(`Agent ${agentId} deregistered from Redis registry${reason ? ` (${reason})` : ''}`);
      
    } catch (error) {
      const deregError = new Error(`Failed to deregister agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', deregError);
      throw deregError;
    }
  }

  /**
   * Update agent metadata and heartbeat
   */
  async updateAgent(update: AgentRegistrationUpdate): Promise<void> {
    try {
      const existingMetadata = this.registeredAgents.get(update.agentId);
      if (!existingMetadata) {
        throw new Error(`Agent ${update.agentId} not found in registry`);
      }

      // Merge update with existing metadata
      const updatedMetadata = { ...existingMetadata, ...update };
      const agentKey = this.KEYS.AGENT(update.agentId);
      
      const pipeline = this.redis.pipeline();
      
      // Update stored metadata
      pipeline.hset(agentKey, 'metadata', JSON.stringify(updatedMetadata));
      pipeline.hset(agentKey, 'last_updated', new Date().toISOString());
      
      if (update.status) {
        pipeline.hset(agentKey, 'status', update.status);
      }
      
      // Update heartbeat
      pipeline.setex(
        this.KEYS.AGENT_HEARTBEAT(update.agentId), 
        this.config.heartbeat.ttl, 
        update.lastHeartbeat
      );

      await pipeline.exec();
      
      // Update local storage
      this.registeredAgents.set(update.agentId, updatedMetadata);
      
      // Publish update event
      await this.publishEvent({
        eventType: 'update',
        agentId: update.agentId,
        timestamp: new Date().toISOString(),
        metadata: update,
        previousMetadata: existingMetadata,
        source: 'RedisServiceRegistry'
      });
      
      this.emit('agentUpdated', update.agentId, update);
      
    } catch (error) {
      const updateError = new Error(`Failed to update agent ${update.agentId}: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', updateError);
      throw updateError;
    }
  }

  /**
   * Discover agents based on query criteria
   */
  async discoverAgents(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    const startTime = Date.now();
    
    try {
      let agentIds: string[] = [];
      
      // Get initial set of agent IDs based on primary filter
      if (query.agentType) {
        agentIds = await this.redis.smembers(this.KEYS.AGENT_BY_TYPE(query.agentType));
      } else if (query.capabilities && query.capabilities.length > 0) {
        // Intersection of agents with all required capabilities
        const capabilityKeys = query.capabilities.map(cap => this.KEYS.AGENT_CAPABILITIES(cap));
        if (capabilityKeys.length === 1) {
          agentIds = await this.redis.smembers(capabilityKeys[0]);
        } else {
          agentIds = await this.redis.sinter(...capabilityKeys);
        }
      } else {
        agentIds = await this.redis.smembers(this.KEYS.AGENT_LIST());
      }
      
      // Fetch agent metadata in parallel
      const agentDataPromises = agentIds.map(async (agentId) => {
        try {
          const [metadataStr, status, lastUpdated] = await this.redis.hmget(
            this.KEYS.AGENT(agentId),
            'metadata', 'status', 'last_updated'
          );
          
          if (!metadataStr) {
            return null; // Agent data missing, skip
          }
          
          const metadata = JSON.parse(metadataStr) as AgentRegistrationMetadata;
          
          // Update with current status if available
          if (status) {
            metadata.status = status as AgentStatus;
          }
          
          return metadata;
        } catch (error) {
          console.warn(`Failed to fetch agent ${agentId}:`, error);
          return null;
        }
      });
      
      const allAgents = (await Promise.all(agentDataPromises))
        .filter((agent): agent is AgentRegistrationMetadata => agent !== null);
      
      // Apply additional filters
      let filteredAgents = this.applyFilters(allAgents, query);
      
      // Filter by health status if requested
      if (query.healthyOnly) {
        const healthyAgents = await this.filterHealthyAgents(filteredAgents);
        filteredAgents = healthyAgents;
      }
      
      // Apply sorting
      if (query.sortBy) {
        filteredAgents = this.sortAgents(filteredAgents, query.sortBy, query.sortOrder || 'asc');
      }
      
      // Apply pagination
      const totalCount = filteredAgents.length;
      if (query.offset || query.limit) {
        const offset = query.offset || 0;
        const limit = query.limit || filteredAgents.length;
        filteredAgents = filteredAgents.slice(offset, offset + limit);
      }

      const result: ServiceDiscoveryResult = {
        agents: filteredAgents,
        totalCount,
        query,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      this.emit('discoveryQuery', query, result);
      return result;
      
    } catch (error) {
      const discoveryError = new Error(`Service discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', discoveryError);
      throw discoveryError;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentRegistrationMetadata | null> {
    try {
      // Try local cache first
      const cached = this.registeredAgents.get(agentId);
      if (cached) {
        return cached;
      }

      // Fetch from Redis
      const metadataStr = await this.redis.hget(this.KEYS.AGENT(agentId), 'metadata');
      if (!metadataStr) {
        return null;
      }

      const metadata = JSON.parse(metadataStr) as AgentRegistrationMetadata;
      
      // Update local cache
      this.registeredAgents.set(agentId, metadata);
      
      return metadata;
      
    } catch (error) {
      this.emit('error', error as Error);
      return null;
    }
  }

  /**
   * Get all registered agents
   */
  async getAllAgents(): Promise<AgentRegistrationMetadata[]> {
    const agentIds = await this.redis.smembers(this.KEYS.AGENT_LIST());
    const agents: AgentRegistrationMetadata[] = [];
    
    for (const agentId of agentIds) {
      const agent = await this.getAgent(agentId);
      if (agent) {
        agents.push(agent);
      }
    }
    
    return agents;
  }

  /**
   * Perform health check on an agent
   */
  async performHealthCheck(agentId: string): Promise<boolean> {
    try {
      const metadata = this.registeredAgents.get(agentId);
      if (!metadata) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const healthCheckUrl = this.buildHealthCheckUrl(metadata);
      const healthState = this.healthCheckStates.get(agentId);
      
      if (!healthState) {
        throw new Error(`Health check state not found for agent ${agentId}`);
      }

      // Perform HTTP health check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheck.timeout);
      
      try {
        const response = await fetch(healthCheckUrl, {
          method: metadata.healthCheck.method,
          signal: controller.signal,
          headers: {
            'User-Agent': 'UEP-Redis-Registry/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        const isHealthy = response.status === (metadata.healthCheck.expectedStatus || 200);
        
        if (isHealthy) {
          // Reset failure count and update state
          healthState.consecutiveFailures = 0;
          healthState.lastSuccessful = new Date().toISOString();
          
          // Update health status in Redis
          await this.redis.hmset(this.KEYS.AGENT_HEALTH(agentId), {
            status: 'healthy',
            last_check: new Date().toISOString(),
            consecutive_failures: '0',
            last_successful: healthState.lastSuccessful
          });
          
          this.emit('healthCheckPassed', agentId);
        } else {
          this.handleHealthCheckFailure(agentId, new Error(`HTTP ${response.status}`));
        }
        
        healthState.lastAttempt = new Date().toISOString();
        return isHealthy;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        this.handleHealthCheckFailure(agentId, fetchError as Error);
        return false;
      }
      
    } catch (error) {
      const healthError = error instanceof Error ? error : new Error(String(error));
      this.emit('healthCheckFailed', agentId, healthError);
      return false;
    }
  }

  /**
   * Graceful shutdown - cleanup all resources
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.log('Shutting down Redis service registry...');
    
    // Stop all monitoring
    for (const agentId of this.registeredAgents.keys()) {
      this.stopHealthMonitoring(agentId);
      this.stopHeartbeatUpdates(agentId);
    }
    
    // Publish shutdown event
    await this.publishEvent({
      eventType: 'deregister',
      agentId: 'all',
      timestamp: new Date().toISOString(),
      reason: 'Registry shutdown',
      source: 'RedisServiceRegistry'
    });
    
    // Clear local data
    this.registeredAgents.clear();
    this.healthCheckStates.clear();
    this.healthCheckIntervals.clear();
    this.heartbeatIntervals.clear();
    
    // Close Redis connection
    await this.redis.quit();
    
    console.log('Redis service registry shutdown complete');
  }

  // Private helper methods

  private buildHealthCheckUrl(metadata: AgentRegistrationMetadata): string {
    const protocol = metadata.network.tlsEnabled ? 'https' : 'http';
    const port = metadata.network.healthCheckPort || metadata.network.port;
    return `${protocol}://${metadata.network.address}:${port}${metadata.healthCheck.endpoint}`;
  }

  private async handleHealthCheckFailure(agentId: string, error: Error): Promise<void> {
    const healthState = this.healthCheckStates.get(agentId);
    if (!healthState) return;
    
    healthState.consecutiveFailures++;
    healthState.lastAttempt = new Date().toISOString();
    
    // Update health status in Redis
    await this.redis.hmset(this.KEYS.AGENT_HEALTH(agentId), {
      status: healthState.consecutiveFailures >= this.config.healthCheck.retries ? 'unhealthy' : 'degraded',
      last_check: new Date().toISOString(),
      consecutive_failures: healthState.consecutiveFailures.toString(),
      last_error: error.message
    });
    
    // Emit health check failure
    this.emit('healthCheckFailed', agentId, error);
    
    // Auto-deregister if too many failures
    if (healthState.consecutiveFailures >= this.config.healthCheck.retries) {
      // Schedule deregistration after delay
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.deregisterAgent(agentId, `Health check failed ${healthState.consecutiveFailures} times`)
            .catch(err => console.error(`Failed to auto-deregister unhealthy agent ${agentId}:`, err));
        }
      }, this.config.healthCheck.deregistrationDelay);
    }
  }

  private startHealthMonitoring(metadata: AgentRegistrationMetadata): void {
    const interval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        await this.performHealthCheck(metadata.agentId);
      } catch (error) {
        console.error(`Health monitoring error for agent ${metadata.agentId}:`, error);
      }
    }, this.config.healthCheck.interval);
    
    this.healthCheckIntervals.set(metadata.agentId, interval);
  }

  private stopHealthMonitoring(agentId: string): void {
    const interval = this.healthCheckIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(agentId);
    }
  }

  private startHeartbeatUpdates(metadata: AgentRegistrationMetadata): void {
    const interval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        await this.updateAgent({
          agentId: metadata.agentId,
          lastHeartbeat: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Heartbeat update error for agent ${metadata.agentId}:`, error);
      }
    }, this.config.heartbeat.interval);
    
    this.heartbeatIntervals.set(metadata.agentId, interval);
  }

  private stopHeartbeatUpdates(agentId: string): void {
    const interval = this.heartbeatIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(agentId);
    }
  }

  private async filterHealthyAgents(agents: AgentRegistrationMetadata[]): Promise<AgentRegistrationMetadata[]> {
    const healthyAgents: AgentRegistrationMetadata[] = [];
    
    for (const agent of agents) {
      try {
        const healthData = await this.redis.hmget(
          this.KEYS.AGENT_HEALTH(agent.agentId),
          'status', 'consecutive_failures'
        );
        
        const [status, failures] = healthData;
        const isHealthy = status === 'healthy' || (status !== 'unhealthy' && parseInt(failures || '0') < this.config.healthCheck.retries);
        
        if (isHealthy) {
          healthyAgents.push(agent);
        }
      } catch (error) {
        // If health data is missing, assume healthy (newly registered)
        healthyAgents.push(agent);
      }
    }
    
    return healthyAgents;
  }

  private applyFilters(agents: AgentRegistrationMetadata[], query: ServiceDiscoveryQuery): AgentRegistrationMetadata[] {
    return agents.filter(agent => {
      // Environment filter
      if (query.environment && agent.environment !== query.environment) {
        return false;
      }

      // Status filter
      if (query.status && !query.status.includes(agent.status)) {
        return false;
      }

      // Performance filters
      if (query.maxLoad && agent.currentMetrics.currentLoad > query.maxLoad) {
        return false;
      }

      if (query.minCapacity && agent.currentMetrics.maxCapacity < query.minCapacity) {
        return false;
      }

      if (query.maxResponseTime && agent.currentMetrics.averageResponseTime > query.maxResponseTime) {
        return false;
      }

      if (query.maxErrorRate && agent.currentMetrics.errorRate > query.maxErrorRate) {
        return false;
      }

      return true;
    });
  }

  private sortAgents(agents: AgentRegistrationMetadata[], sortBy: string, sortOrder: 'asc' | 'desc'): AgentRegistrationMetadata[] {
    return agents.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'load':
          valueA = a.currentMetrics.currentLoad;
          valueB = b.currentMetrics.currentLoad;
          break;
        case 'response_time':
          valueA = a.currentMetrics.averageResponseTime;
          valueB = b.currentMetrics.averageResponseTime;
          break;
        case 'error_rate':
          valueA = a.currentMetrics.errorRate;
          valueB = b.currentMetrics.errorRate;
          break;
        case 'capacity':
          valueA = a.currentMetrics.maxCapacity;
          valueB = b.currentMetrics.maxCapacity;
          break;
        case 'registration_time':
          valueA = new Date(a.registrationTime).getTime();
          valueB = new Date(b.registrationTime).getTime();
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private async publishEvent(event: AgentRegistrationEvent): Promise<void> {
    try {
      await this.redis.lpush(this.KEYS.REGISTRY_EVENTS(), JSON.stringify(event));
      // Keep only the last 1000 events
      await this.redis.ltrim(this.KEYS.REGISTRY_EVENTS(), 0, 999);
    } catch (error) {
      console.warn('Failed to publish registry event:', error);
    }
  }
}

// Export configuration factory
export function createRedisRegistryConfig(overrides: Partial<RedisRegistryConfig> = {}): RedisRegistryConfig {
  return {
    redis: {
      host: 'localhost',
      port: 6379,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      keyPrefix: 'uep:registry',
      ...overrides.redis
    },
    healthCheck: {
      interval: 30000,        // 30 seconds
      timeout: 5000,          // 5 seconds
      retries: 3,             // 3 consecutive failures
      deregistrationDelay: 60000, // 1 minute delay before auto-deregistering
      ...overrides.healthCheck
    },
    heartbeat: {
      interval: 15000,        // 15 seconds
      ttl: 60,                // 60 seconds TTL
      ...overrides.heartbeat
    }
  };
}