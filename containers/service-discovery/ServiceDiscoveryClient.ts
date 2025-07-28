/**
 * TypeScript Service Discovery Client Library
 * Task 191.3: Develop TypeScript Service Discovery Client Library
 * 
 * A unified client library that provides a simple, consistent interface
 * for agents to register with and discover services from both Redis and Consul registries.
 */

import { EventEmitter } from 'events';
import { RedisServiceRegistry, createRedisRegistryConfig, RedisRegistryConfig } from './RedisServiceRegistry.js';
import { ConsulServiceRegistry } from '../src/uep/service-registry/ConsulServiceRegistry.js';
import {
  AgentRegistrationMetadata,
  AgentRegistrationUpdate,
  ServiceDiscoveryQuery,
  ServiceDiscoveryResult,
  AgentStatus,
  UEPAgentCapability
} from '../src/uep/service-registry/types/AgentRegistration.js';

export type RegistryBackend = 'redis' | 'consul' | 'hybrid';

export interface ServiceDiscoveryClientConfig {
  // Registry backend configuration
  backend: RegistryBackend;
  
  // Redis configuration (required for 'redis' and 'hybrid')
  redis?: RedisRegistryConfig;
  
  // Consul configuration (required for 'consul' and 'hybrid')
  consul?: {
    host: string;
    port: string | number;
    secure: boolean;
    token?: string;
    ca?: string;
    cert?: string;
    key?: string;
    promisify: boolean;
    defaults?: {
      token?: string;
    };
  };
  
  // Client behavior configuration
  client: {
    // Automatic registration on startup
    autoRegister: boolean;
    
    // Graceful deregistration on shutdown
    autoDeregister: boolean;
    
    // Health check reporting
    enableHealthReporting: boolean;
    
    // Metric collection and reporting
    enableMetrics: boolean;
    
    // Retry configuration
    retryAttempts: number;
    retryDelay: number; // milliseconds
    
    // Caching configuration
    cacheEnabled: boolean;
    cacheTtl: number; // seconds
    
    // Circuit breaker configuration
    circuitBreakerEnabled: boolean;
    circuitBreakerThreshold: number; // failure threshold
    circuitBreakerTimeout: number; // milliseconds
  };
  
  // Agent metadata template
  agentDefaults?: Partial<AgentRegistrationMetadata>;
}

export interface ClientMetrics {
  registrationAttempts: number;
  registrationSuccesses: number;
  registrationFailures: number;
  discoveryQueries: number;
  discoverySuccesses: number;
  discoveryFailures: number;
  healthCheckReports: number;
  lastRegistrationTime?: string;
  lastDiscoveryTime?: string;
  uptime: number;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: string;
  nextAttemptTime?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Unified Service Discovery Client
 * 
 * Provides a simple, consistent interface for service registration and discovery
 * that works with multiple registry backends (Redis, Consul, or both).
 */
export class ServiceDiscoveryClient extends EventEmitter {
  private config: ServiceDiscoveryClientConfig;
  private redisRegistry?: RedisServiceRegistry;
  private consulRegistry?: ConsulServiceRegistry;
  private registeredAgent?: AgentRegistrationMetadata;
  private metrics: ClientMetrics;
  private circuitBreaker: CircuitBreakerState;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private shutdownInProgress = false;
  
  // Timers for periodic operations
  private healthReportTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  private cacheCleanupTimer?: NodeJS.Timeout;

  constructor(config: ServiceDiscoveryClientConfig) {
    super();
    this.config = config;
    this.metrics = {
      registrationAttempts: 0,
      registrationSuccesses: 0,
      registrationFailures: 0,
      discoveryQueries: 0,
      discoverySuccesses: 0,
      discoveryFailures: 0,
      healthCheckReports: 0,
      uptime: Date.now()
    };
    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0
    };
    
    this.validateConfig();
    this.initializeRegistries();
    this.setupPeriodicTasks();
    this.setupShutdownHandlers();
  }

  /**
   * Initialize the client and optionally register the agent
   */
  async initialize(agentMetadata?: AgentRegistrationMetadata): Promise<void> {
    try {
      // Test registry connections
      await this.testConnections();
      
      // Auto-register if configured and metadata provided
      if (this.config.client.autoRegister && agentMetadata) {
        await this.registerAgent(agentMetadata);
      }
      
      this.emit('initialized');
      console.log('Service Discovery Client initialized successfully');
      
    } catch (error) {
      const initError = new Error(`Failed to initialize Service Discovery Client: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', initError);
      throw initError;
    }
  }

  /**
   * Register an agent with the service registry
   */
  async registerAgent(metadata: AgentRegistrationMetadata): Promise<void> {
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open - registration temporarily disabled');
    }

    this.metrics.registrationAttempts++;
    
    try {
      // Merge with defaults
      const fullMetadata = this.mergeWithDefaults(metadata);
      
      // Register with primary backend
      if (this.config.backend === 'redis' || this.config.backend === 'hybrid') {
        if (!this.redisRegistry) {
          throw new Error('Redis registry not initialized');
        }
        await this.redisRegistry.registerAgent(fullMetadata);
      }
      
      if (this.config.backend === 'consul' || this.config.backend === 'hybrid') {
        if (!this.consulRegistry) {
          throw new Error('Consul registry not initialized');
        }
        await this.consulRegistry.registerAgent(fullMetadata);
      }
      
      // Store registration locally
      this.registeredAgent = fullMetadata;
      this.metrics.registrationSuccesses++;
      this.metrics.lastRegistrationTime = new Date().toISOString();
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      this.emit('agentRegistered', fullMetadata);
      console.log(`Agent ${fullMetadata.agentId} registered successfully`);
      
    } catch (error) {
      this.metrics.registrationFailures++;
      this.handleCircuitBreakerFailure();
      
      const regError = new Error(`Failed to register agent: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('registrationError', regError);
      throw regError;
    }
  }

  /**
   * Deregister the agent from the service registry
   */
  async deregisterAgent(reason?: string): Promise<void> {
    if (!this.registeredAgent) {
      throw new Error('No agent is currently registered');
    }

    try {
      const agentId = this.registeredAgent.agentId;
      
      // Deregister from all configured backends
      const deregistrationPromises: Promise<void>[] = [];
      
      if (this.redisRegistry && (this.config.backend === 'redis' || this.config.backend === 'hybrid')) {
        deregistrationPromises.push(this.redisRegistry.deregisterAgent(agentId, reason));
      }
      
      if (this.consulRegistry && (this.config.backend === 'consul' || this.config.backend === 'hybrid')) {
        deregistrationPromises.push(this.consulRegistry.deregisterAgent(agentId, reason));
      }
      
      await Promise.all(deregistrationPromises);
      
      // Clear local registration
      this.registeredAgent = undefined;
      
      this.emit('agentDeregistered', agentId);
      console.log(`Agent ${agentId} deregistered successfully${reason ? ` (${reason})` : ''}`);
      
    } catch (error) {
      const deregError = new Error(`Failed to deregister agent: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('deregistrationError', deregError);
      throw deregError;
    }
  }

  /**
   * Update agent metadata
   */
  async updateAgent(update: AgentRegistrationUpdate): Promise<void> {
    if (!this.registeredAgent) {
      throw new Error('No agent is currently registered');
    }

    try {
      // Update in all configured backends
      const updatePromises: Promise<void>[] = [];
      
      if (this.redisRegistry && (this.config.backend === 'redis' || this.config.backend === 'hybrid')) {
        updatePromises.push(this.redisRegistry.updateAgent(update));
      }
      
      if (this.consulRegistry && (this.config.backend === 'consul' || this.config.backend === 'hybrid')) {
        updatePromises.push(this.consulRegistry.updateAgent(update));
      }
      
      await Promise.all(updatePromises);
      
      // Update local registration
      this.registeredAgent = { ...this.registeredAgent, ...update };
      
      this.emit('agentUpdated', update);
      
    } catch (error) {
      const updateError = new Error(`Failed to update agent: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('updateError', updateError);
      throw updateError;
    }
  }

  /**
   * Discover agents based on query criteria
   */
  async discoverAgents(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    // Check cache first
    if (this.config.client.cacheEnabled) {
      const cached = this.getFromCache(`discovery:${JSON.stringify(query)}`);
      if (cached) {
        this.emit('discoveryFromCache', query, cached);
        return cached;
      }
    }

    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open - discovery temporarily disabled');
    }

    this.metrics.discoveryQueries++;
    
    try {
      let result: ServiceDiscoveryResult;
      
      // Use primary backend for discovery
      if (this.config.backend === 'redis' || this.config.backend === 'hybrid') {
        if (!this.redisRegistry) {
          throw new Error('Redis registry not initialized');
        }
        result = await this.redisRegistry.discoverAgents(query);
      } else if (this.config.backend === 'consul') {
        if (!this.consulRegistry) {
          throw new Error('Consul registry not initialized');
        }
        result = await this.consulRegistry.discoverAgents(query);
      } else {
        throw new Error(`Unsupported backend: ${this.config.backend}`);
      }
      
      // For hybrid mode, merge results from both backends
      if (this.config.backend === 'hybrid' && this.consulRegistry) {
        try {
          const consulResult = await this.consulRegistry.discoverAgents(query);
          result = this.mergeDiscoveryResults(result, consulResult);
        } catch (error) {
          console.warn('Failed to query Consul in hybrid mode:', error);
        }
      }
      
      this.metrics.discoverySuccesses++;
      this.metrics.lastDiscoveryTime = new Date().toISOString();
      
      // Cache result
      if (this.config.client.cacheEnabled) {
        this.setCache(`discovery:${JSON.stringify(query)}`, result);
      }
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      this.emit('discoveryCompleted', query, result);
      return result;
      
    } catch (error) {
      this.metrics.discoveryFailures++;
      this.handleCircuitBreakerFailure();
      
      const discoveryError = new Error(`Failed to discover agents: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('discoveryError', discoveryError);
      throw discoveryError;
    }
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string): Promise<AgentRegistrationMetadata | null> {
    // Check cache first
    if (this.config.client.cacheEnabled) {
      const cached = this.getFromCache(`agent:${agentId}`);
      if (cached) {
        return cached;
      }
    }

    try {
      let agent: AgentRegistrationMetadata | null = null;
      
      // Try primary backend
      if (this.config.backend === 'redis' || this.config.backend === 'hybrid') {
        if (this.redisRegistry) {
          agent = await this.redisRegistry.getAgent(agentId);
        }
      }
      
      // Fallback to Consul if not found and in hybrid mode
      if (!agent && this.config.backend === 'consul' || (this.config.backend === 'hybrid' && this.consulRegistry)) {
        agent = await this.consulRegistry!.getAgent(agentId);
      }
      
      // Cache result
      if (agent && this.config.client.cacheEnabled) {
        this.setCache(`agent:${agentId}`, agent);
      }
      
      return agent;
      
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Report current health status
   */
  async reportHealth(status: AgentStatus, metadata?: Record<string, any>): Promise<void> {
    if (!this.registeredAgent) {
      throw new Error('No agent is currently registered');
    }

    try {
      await this.updateAgent({
        agentId: this.registeredAgent.agentId,
        lastHeartbeat: new Date().toISOString(),
        status,
        ...(metadata && { annotations: { ...this.registeredAgent.annotations, ...metadata } })
      });
      
      this.metrics.healthCheckReports++;
      this.emit('healthReported', status, metadata);
      
    } catch (error) {
      this.emit('healthReportError', error);
      throw error;
    }
  }

  /**
   * Get client metrics
   */
  getMetrics(): ClientMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime
    };
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0
    };
    this.emit('circuitBreakerReset');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cacheCleared');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.shutdownInProgress) {
      return;
    }
    
    this.shutdownInProgress = true;
    console.log('Shutting down Service Discovery Client...');
    
    try {
      // Clear timers
      if (this.healthReportTimer) clearInterval(this.healthReportTimer);
      if (this.metricsTimer) clearInterval(this.metricsTimer);
      if (this.cacheCleanupTimer) clearInterval(this.cacheCleanupTimer);
      
      // Auto-deregister if configured
      if (this.config.client.autoDeregister && this.registeredAgent) {
        await this.deregisterAgent('Client shutdown');
      }
      
      // Shutdown registries
      const shutdownPromises: Promise<void>[] = [];
      
      if (this.redisRegistry) {
        shutdownPromises.push(this.redisRegistry.shutdown());
      }
      
      if (this.consulRegistry) {
        shutdownPromises.push(this.consulRegistry.shutdown());
      }
      
      await Promise.all(shutdownPromises);
      
      // Clear cache
      this.cache.clear();
      
      this.emit('shutdown');
      console.log('Service Discovery Client shutdown complete');
      
    } catch (error) {
      console.error('Error during Service Discovery Client shutdown:', error);
      this.emit('shutdownError', error);
    }
  }

  // Private helper methods

  private validateConfig(): void {
    if (!this.config.backend) {
      throw new Error('Registry backend must be specified');
    }

    if ((this.config.backend === 'redis' || this.config.backend === 'hybrid') && !this.config.redis) {
      throw new Error('Redis configuration required for redis/hybrid backend');
    }

    if ((this.config.backend === 'consul' || this.config.backend === 'hybrid') && !this.config.consul) {
      throw new Error('Consul configuration required for consul/hybrid backend');
    }
  }

  private initializeRegistries(): void {
    // Initialize Redis registry
    if (this.config.backend === 'redis' || this.config.backend === 'hybrid') {
      this.redisRegistry = new RedisServiceRegistry(this.config.redis!);
      this.setupRegistryEventHandlers(this.redisRegistry, 'redis');
    }

    // Initialize Consul registry
    if (this.config.backend === 'consul' || this.config.backend === 'hybrid') {
      this.consulRegistry = new ConsulServiceRegistry(this.config.consul!);
      this.setupRegistryEventHandlers(this.consulRegistry, 'consul');
    }
  }

  private setupRegistryEventHandlers(registry: RedisServiceRegistry | ConsulServiceRegistry, type: string): void {
    registry.on('error', (error) => {
      this.emit('registryError', type, error);
    });

    registry.on('agentRegistered', (metadata) => {
      this.emit('backendRegistration', type, metadata);
    });

    registry.on('agentDeregistered', (agentId) => {
      this.emit('backendDeregistration', type, agentId);
    });
  }

  private setupPeriodicTasks(): void {
    // Health reporting
    if (this.config.client.enableHealthReporting) {
      this.healthReportTimer = setInterval(async () => {
        if (this.registeredAgent && !this.shutdownInProgress) {
          try {
            await this.reportHealth('healthy');
          } catch (error) {
            console.warn('Failed to report health:', error);
          }
        }
      }, 30000); // Every 30 seconds
    }

    // Metrics collection
    if (this.config.client.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.emit('metricsUpdate', this.getMetrics());
      }, 60000); // Every minute
    }

    // Cache cleanup
    if (this.config.client.cacheEnabled) {
      this.cacheCleanupTimer = setInterval(() => {
        this.cleanupCache();
      }, 300000); // Every 5 minutes
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = () => {
      this.shutdown().catch(console.error);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('beforeExit', shutdown);
  }

  private async testConnections(): Promise<void> {
    const testPromises: Promise<void>[] = [];

    if (this.redisRegistry) {
      testPromises.push(this.testRedisConnection());
    }

    if (this.consulRegistry) {
      testPromises.push(this.testConsulConnection());
    }

    await Promise.all(testPromises);
  }

  private async testRedisConnection(): Promise<void> {
    // Test Redis connection by attempting a simple operation
    try {
      await this.redisRegistry!.getAllAgents();
    } catch (error) {
      throw new Error(`Redis connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async testConsulConnection(): Promise<void> {
    // Test Consul connection by attempting a simple operation
    try {
      await this.consulRegistry!.getAllAgents();
    } catch (error) {
      throw new Error(`Consul connection test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private mergeWithDefaults(metadata: AgentRegistrationMetadata): AgentRegistrationMetadata {
    if (!this.config.agentDefaults) {
      return metadata;
    }

    return {
      ...this.config.agentDefaults,
      ...metadata,
      // Ensure critical fields are not overridden by defaults
      agentId: metadata.agentId,
      agentType: metadata.agentType,
      registrationTime: metadata.registrationTime,
      lastHeartbeat: metadata.lastHeartbeat
    };
  }

  private mergeDiscoveryResults(redis: ServiceDiscoveryResult, consul: ServiceDiscoveryResult): ServiceDiscoveryResult {
    // Merge agents from both sources, deduplicating by agentId
    const agentMap = new Map<string, AgentRegistrationMetadata>();
    
    // Add Redis agents first
    for (const agent of redis.agents) {
      agentMap.set(agent.agentId, agent);
    }
    
    // Add Consul agents, preferring newer data
    for (const agent of consul.agents) {
      const existing = agentMap.get(agent.agentId);
      if (!existing || new Date(agent.lastHeartbeat) > new Date(existing.lastHeartbeat)) {
        agentMap.set(agent.agentId, agent);
      }
    }

    return {
      agents: Array.from(agentMap.values()),
      totalCount: agentMap.size,
      query: redis.query,
      executionTime: Math.max(redis.executionTime, consul.executionTime),
      timestamp: new Date().toISOString()
    };
  }

  private isCircuitOpen(): boolean {
    if (!this.config.client.circuitBreakerEnabled) {
      return false;
    }

    if (this.circuitBreaker.state === 'open') {
      // Check if we should attempt to close
      if (this.circuitBreaker.nextAttemptTime && new Date().toISOString() > this.circuitBreaker.nextAttemptTime) {
        this.circuitBreaker.state = 'half-open';
        this.emit('circuitBreakerHalfOpen');
        return false;
      }
      return true;
    }

    return false;
  }

  private handleCircuitBreakerFailure(): void {
    if (!this.config.client.circuitBreakerEnabled) {
      return;
    }

    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date().toISOString();

    if (this.circuitBreaker.failureCount >= this.config.client.circuitBreakerThreshold) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.nextAttemptTime = new Date(Date.now() + this.config.client.circuitBreakerTimeout).toISOString();
      this.emit('circuitBreakerOpen');
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.client.cacheTtl
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }
}

// Configuration factory functions
export function createServiceDiscoveryConfig(overrides: Partial<ServiceDiscoveryClientConfig> = {}): ServiceDiscoveryClientConfig {
  return {
    backend: 'redis',
    client: {
      autoRegister: false,
      autoDeregister: true,
      enableHealthReporting: true,
      enableMetrics: true,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheEnabled: true,
      cacheTtl: 300, // 5 minutes
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000 // 1 minute
    },
    ...overrides
  };
}

// Convenience factory for Redis-only configuration
export function createRedisOnlyConfig(redisConfig: Partial<RedisRegistryConfig> = {}): ServiceDiscoveryClientConfig {
  return createServiceDiscoveryConfig({
    backend: 'redis',
    redis: createRedisRegistryConfig(redisConfig)
  });
}

// Convenience factory for Consul-only configuration
export function createConsulOnlyConfig(consulConfig: Partial<ServiceDiscoveryClientConfig['consul']> = {}): ServiceDiscoveryClientConfig {
  return createServiceDiscoveryConfig({
    backend: 'consul',
    consul: {
      host: 'localhost',
      port: 8500,
      secure: false,
      promisify: true,
      ...consulConfig
    }
  });
}

// Convenience factory for hybrid configuration
export function createHybridConfig(
  redisConfig: Partial<RedisRegistryConfig> = {},
  consulConfig: Partial<ServiceDiscoveryClientConfig['consul']> = {}
): ServiceDiscoveryClientConfig {
  return createServiceDiscoveryConfig({
    backend: 'hybrid',
    redis: createRedisRegistryConfig(redisConfig),
    consul: {
      host: 'localhost',
      port: 8500,
      secure: false,
      promisify: true,
      ...consulConfig
    }
  });
}