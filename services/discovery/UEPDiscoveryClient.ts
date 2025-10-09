/**
 * UEP Discovery Client Library
 * 
 * TypeScript client library for service discovery and agent lookup through
 * the UEP Registry Service. Provides capability-based discovery, connection
 * management, load balancing, and health-aware routing with comprehensive
 * caching and retry logic. Based on TaskMaster research findings and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { LRUCache } from 'lru-cache';
import CircuitBreaker from 'opossum';
import { Logger } from '../../shared/utils/Logger';
import { UEPAgentRegistration, UEPAgentCapability, UEPServiceDiscoveryQuery } from '../registry/UEPRegistryService';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPDiscoveryClientConfig {
  registryEndpoints: string[];
  enableLoadBalancing: boolean;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'random' | 'weighted';
  enableHealthChecking: boolean;
  healthCheckInterval: number;
  enableCaching: boolean;
  cacheOptions: {
    maxSize: number;
    ttl: number;
    refreshThreshold: number; // Refresh cache when TTL drops below this percentage
  };
  retryOptions: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  circuitBreakerOptions: {
    enabled: boolean;
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
  };
  connectionPooling: {
    enabled: boolean;
    maxConnections: number;
    maxIdleTime: number;
    keepAlive: boolean;
  };
  enableMetrics: boolean;
  enableTracing: boolean;
  requestTimeout: number;
  preferredRegion?: string;
  preferredDatacenter?: string;
}

export interface UEPAgentConnection {
  agentId: string;
  baseUrl: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUsed: Date;
  connectionCount: number;
  responseTime: number;
  errorCount: number;
  registration: UEPAgentRegistration;
}

export interface UEPDiscoveryResult {
  agents: UEPAgentRegistration[];
  connections: UEPAgentConnection[];
  query: UEPServiceDiscoveryQuery;
  resultCount: number;
  queryTime: number;
  cacheHit: boolean;
  loadBalancerRecommendation?: UEPAgentConnection;
}

export interface UEPCapabilityMatch {
  agent: UEPAgentRegistration;
  matchingCapabilities: UEPAgentCapability[];
  score: number; // 0-1 relevance score
  connection?: UEPAgentConnection;
}

export interface UEPDiscoveryMetrics {
  discoveryRequests: Counter;
  discoveryLatency: Histogram;
  cacheHitRatio: Gauge;
  activeConnections: Gauge;
  connectionErrors: Counter;
  healthChecks: Counter;
  loadBalancerDecisions: Counter;
  circuitBreakerEvents: Counter;
  capabilityMatches: Counter;
}

// =============================================================================
// UEP Discovery Client Core Class
// =============================================================================

export class UEPDiscoveryClient extends EventEmitter {
  private readonly config: UEPDiscoveryClientConfig;
  private readonly logger = new Logger('UEPDiscoveryClient');
  private readonly tracer = trace.getTracer('uep-discovery-client', '1.0.0');
  
  // HTTP clients and circuit breakers
  private readonly httpClients: Map<string, AxiosInstance> = new Map();
  private readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();
  
  // Connection management
  private readonly connections: Map<string, UEPAgentConnection> = new Map();
  private readonly connectionPools: Map<string, UEPAgentConnection[]> = new Map();
  
  // Caching
  private readonly discoveryCache: LRUCache<string, UEPDiscoveryResult>;
  private readonly capabilityCache: LRUCache<string, UEPCapabilityMatch[]>;
  private readonly healthCache: LRUCache<string, boolean>;
  
  // Load balancing
  private readonly loadBalancerState: Map<string, number> = new Map(); // For round-robin tracking
  
  // Metrics and monitoring
  private readonly metrics: UEPDiscoveryMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private currentRegistryIndex: number = 0;

  constructor(config: Partial<UEPDiscoveryClientConfig> = {}) {
    super();
    
    this.config = {
      registryEndpoints: config.registryEndpoints || ['http://localhost:8500'],
      enableLoadBalancing: true,
      loadBalancingStrategy: 'round-robin',
      enableHealthChecking: true,
      healthCheckInterval: 30000, // 30 seconds
      enableCaching: true,
      cacheOptions: {
        maxSize: 5000,
        ttl: 300000, // 5 minutes
        refreshThreshold: 0.2 // Refresh when 20% of TTL remains
      },
      retryOptions: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
      },
      circuitBreakerOptions: {
        enabled: true,
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      },
      connectionPooling: {
        enabled: true,
        maxConnections: 100,
        maxIdleTime: 300000, // 5 minutes
        keepAlive: true
      },
      enableMetrics: true,
      enableTracing: true,
      requestTimeout: 30000,
      preferredRegion: config.preferredRegion,
      preferredDatacenter: config.preferredDatacenter,
      ...config
    };

    // Initialize caches
    this.discoveryCache = new LRUCache({
      max: this.config.cacheOptions.maxSize,
      ttl: this.config.cacheOptions.ttl,
      updateAgeOnGet: true
    });

    this.capabilityCache = new LRUCache({
      max: this.config.cacheOptions.maxSize,
      ttl: this.config.cacheOptions.ttl,
      updateAgeOnGet: true
    });

    this.healthCache = new LRUCache({
      max: this.config.cacheOptions.maxSize,
      ttl: this.config.healthCheckInterval * 2, // Cache health for 2x check interval
      updateAgeOnGet: false
    });

    // Initialize HTTP clients for each registry endpoint
    this.initializeHttpClients();

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup health checks
    if (this.config.enableHealthChecking) {
      this.setupHealthChecks();
    }

    this.logger.info('UEP Discovery Client initialized', {
      registryEndpoints: this.config.registryEndpoints,
      loadBalancingStrategy: this.config.loadBalancingStrategy,
      enableCaching: this.config.enableCaching,
      enableHealthChecking: this.config.enableHealthChecking
    });
  }

  // =============================================================================
  // HTTP Client Initialization
  // =============================================================================

  private initializeHttpClients(): void {
    for (const endpoint of this.config.registryEndpoints) {
      const client = axios.create({
        baseURL: endpoint,
        timeout: this.config.requestTimeout,
        headers: {
          'Content-Type': 'application/json',
          'X-UEP-Client': 'discovery-client/1.0.0'
        },
        maxRedirects: 3,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      // Add request interceptor for tracing
      if (this.config.enableTracing) {
        client.interceptors.request.use((config) => {
          const span = trace.getActiveSpan();
          if (span) {
            config.headers = {
              ...config.headers,
              'X-Trace-ID': span.spanContext().traceId
            };
          }
          return config;
        });
      }

      // Add response interceptor for metrics
      if (this.config.enableMetrics) {
        client.interceptors.response.use(
          (response) => {
            this.updateConnectionMetrics(endpoint, 'success', response.status);
            return response;
          },
          (error) => {
            this.updateConnectionMetrics(endpoint, 'error', error.response?.status || 0);
            return Promise.reject(error);
          }
        );
      }

      this.httpClients.set(endpoint, client);

      // Initialize circuit breaker if enabled
      if (this.config.circuitBreakerOptions.enabled) {
        const breaker = new CircuitBreaker(
          async (requestConfig: AxiosRequestConfig) => {
            return client(requestConfig);
          },
          {
            timeout: this.config.circuitBreakerOptions.timeout,
            errorThresholdPercentage: this.config.circuitBreakerOptions.errorThresholdPercentage,
            resetTimeout: this.config.circuitBreakerOptions.resetTimeout,
            name: `registry-${endpoint}`
          }
        );

        // Circuit breaker event handlers
        breaker.on('open', () => {
          this.logger.warn('Circuit breaker opened', { endpoint });
          this.metrics.circuitBreakerEvents.inc({ endpoint, event: 'open' });
        });

        breaker.on('halfOpen', () => {
          this.logger.info('Circuit breaker half-open', { endpoint });
          this.metrics.circuitBreakerEvents.inc({ endpoint, event: 'half_open' });
        });

        breaker.on('close', () => {
          this.logger.info('Circuit breaker closed', { endpoint });
          this.metrics.circuitBreakerEvents.inc({ endpoint, event: 'close' });
        });

        this.circuitBreakers.set(endpoint, breaker);
      }
    }
  }

  // =============================================================================
  // Core Discovery Methods
  // =============================================================================

  public async discoverAgents(query: UEPServiceDiscoveryQuery): Promise<UEPDiscoveryResult> {
    return this.tracer.startActiveSpan('uep.discovery.discover_agents', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'discovery.agent_type': query.agentType || 'any',
          'discovery.capabilities': query.capabilities?.join(',') || 'any',
          'discovery.environment': query.environment || 'any'
        });

        // Generate cache key
        const cacheKey = this.generateCacheKey(query);
        
        // Check cache first
        if (this.config.enableCaching) {
          const cachedResult = this.discoveryCache.get(cacheKey);
          if (cachedResult) {
            // Check if we need to refresh the cache
            const cacheAge = Date.now() - (cachedResult.queryTime || 0);
            const refreshThreshold = this.config.cacheOptions.ttl * this.config.cacheOptions.refreshThreshold;
            
            if (cacheAge < refreshThreshold) {
              span.setAttributes({ 'discovery.cache_hit': true });
              
              this.metrics.discoveryRequests.inc({ cache_hit: 'true', agent_type: query.agentType || 'any' });
              
              return cachedResult;
            }
          }
        }

        // Perform discovery
        const result = await this.performDiscoveryWithRetry(query);
        result.queryTime = Date.now() - startTime;
        result.cacheHit = false;

        // Update connections
        await this.updateConnections(result.agents);

        // Apply load balancing recommendation
        if (this.config.enableLoadBalancing && result.agents.length > 0) {
          result.loadBalancerRecommendation = this.selectAgent(result.agents, query);
        }

        // Cache the result
        if (this.config.enableCaching) {
          this.discoveryCache.set(cacheKey, result);
        }

        // Update metrics
        this.metrics.discoveryRequests.inc({ cache_hit: 'false', agent_type: query.agentType || 'any' });
        this.metrics.discoveryLatency.observe(
          { agent_type: query.agentType || 'any' },
          result.queryTime / 1000
        );

        span.setAttributes({
          'discovery.result_count': result.resultCount,
          'discovery.duration_ms': result.queryTime,
          'discovery.cache_hit': false
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Discovery failed', { 
          query, 
          error: (error as Error).message 
        });

        throw error;
      }
    });
  }

  public async findByCapabilities(
    capabilities: string[],
    options: { 
      category?: string;
      tags?: string[];
      minScore?: number;
      maxResults?: number;
    } = {}
  ): Promise<UEPCapabilityMatch[]> {
    return this.tracer.startActiveSpan('uep.discovery.find_by_capabilities', async (span) => {
      try {
        span.setAttributes({
          'discovery.capabilities': capabilities.join(','),
          'discovery.category': options.category || 'any',
          'discovery.min_score': options.minScore || 0
        });

        // Check cache first
        const cacheKey = this.generateCapabilityCacheKey(capabilities, options);
        if (this.config.enableCaching) {
          const cachedResult = this.capabilityCache.get(cacheKey);
          if (cachedResult) {
            return cachedResult;
          }
        }

        // Make request to registry
        const response = await this.makeRegistryRequest('/api/registry/capabilities', 'POST', {
          capabilities,
          category: options.category,
          tags: options.tags
        });

        // Calculate capability matching scores
        const matches: UEPCapabilityMatch[] = response.data.results.map((result: any) => ({
          agent: result.agent,
          matchingCapabilities: result.matchingCapabilities,
          score: this.calculateCapabilityScore(result.matchingCapabilities, capabilities),
          connection: this.connections.get(result.agent.agentId)
        }));

        // Filter by minimum score
        const filteredMatches = matches.filter(match => 
          match.score >= (options.minScore || 0)
        );

        // Sort by score (highest first)
        filteredMatches.sort((a, b) => b.score - a.score);

        // Limit results
        const finalResults = options.maxResults 
          ? filteredMatches.slice(0, options.maxResults)
          : filteredMatches;

        // Cache the result
        if (this.config.enableCaching) {
          this.capabilityCache.set(cacheKey, finalResults);
        }

        // Update metrics
        this.metrics.capabilityMatches.inc(
          { category: options.category || 'any' },
          finalResults.length
        );

        span.setAttributes({
          'discovery.matches_found': finalResults.length,
          'discovery.average_score': finalResults.reduce((sum, match) => sum + match.score, 0) / finalResults.length || 0
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return finalResults;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  public async getAgent(agentId: string): Promise<UEPAgentRegistration | null> {
    return this.tracer.startActiveSpan('uep.discovery.get_agent', async (span) => {
      try {
        span.setAttributes({ 'agent.id': agentId });

        const response = await this.makeRegistryRequest(`/api/registry/agents/${agentId}`, 'GET');
        
        if (response.status === 404) {
          return null;
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return response.data;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        if ((error as any).response?.status === 404) {
          return null;
        }
        
        throw error;
      }
    });
  }

  // =============================================================================
  // Connection Management
  // =============================================================================

  private async updateConnections(agents: UEPAgentRegistration[]): Promise<void> {
    for (const agent of agents) {
      let connection = this.connections.get(agent.agentId);
      
      if (!connection) {
        connection = {
          agentId: agent.agentId,
          baseUrl: agent.endpoints.base,
          status: 'disconnected',
          lastUsed: new Date(0),
          connectionCount: 0,
          responseTime: 0,
          errorCount: 0,
          registration: agent
        };
        
        this.connections.set(agent.agentId, connection);
      } else {
        // Update registration data
        connection.registration = agent;
      }

      // Update connection pool
      this.updateConnectionPool(agent.agentType, connection);
    }

    // Update metrics
    this.metrics.activeConnections.set(this.connections.size);
  }

  private updateConnectionPool(agentType: string, connection: UEPAgentConnection): void {
    if (!this.config.connectionPooling.enabled) return;

    let pool = this.connectionPools.get(agentType);
    if (!pool) {
      pool = [];
      this.connectionPools.set(agentType, pool);
    }

    // Add connection if not already in pool
    if (!pool.find(c => c.agentId === connection.agentId)) {
      pool.push(connection);
      
      // Limit pool size
      if (pool.length > this.config.connectionPooling.maxConnections) {
        pool.shift(); // Remove oldest connection
      }
    }
  }

  private selectAgent(agents: UEPAgentRegistration[], query: UEPServiceDiscoveryQuery): UEPAgentConnection | undefined {
    const availableConnections = agents
      .map(agent => this.connections.get(agent.agentId))
      .filter(conn => conn && conn.status !== 'error') as UEPAgentConnection[];

    if (availableConnections.length === 0) return undefined;

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.selectRoundRobin(availableConnections, query.agentType || 'default');
      
      case 'least-connections':
        return this.selectLeastConnections(availableConnections);
      
      case 'random':
        return availableConnections[Math.floor(Math.random() * availableConnections.length)];
      
      case 'weighted':
        return this.selectWeighted(availableConnections);
      
      default:
        return availableConnections[0];
    }
  }

  private selectRoundRobin(connections: UEPAgentConnection[], key: string): UEPAgentConnection {
    const currentIndex = this.loadBalancerState.get(key) || 0;
    const nextIndex = (currentIndex + 1) % connections.length;
    this.loadBalancerState.set(key, nextIndex);
    
    this.metrics.loadBalancerDecisions.inc({ strategy: 'round_robin', agent_type: key });
    
    return connections[currentIndex];
  }

  private selectLeastConnections(connections: UEPAgentConnection[]): UEPAgentConnection {
    const selected = connections.reduce((least, current) => 
      current.connectionCount < least.connectionCount ? current : least
    );
    
    this.metrics.loadBalancerDecisions.inc({ strategy: 'least_connections', agent_type: 'any' });
    
    return selected;
  }

  private selectWeighted(connections: UEPAgentConnection[]): UEPAgentConnection {
    // Weight based on response time and error rate
    const weights = connections.map(conn => {
      const errorRate = conn.connectionCount > 0 ? conn.errorCount / conn.connectionCount : 0;
      const responseTimeWeight = conn.responseTime > 0 ? 1000 / conn.responseTime : 1;
      const errorWeight = Math.max(0.1, 1 - errorRate);
      
      return responseTimeWeight * errorWeight;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let weightSum = 0;
    for (let i = 0; i < connections.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        this.metrics.loadBalancerDecisions.inc({ strategy: 'weighted', agent_type: 'any' });
        return connections[i];
      }
    }
    
    return connections[0];
  }

  // =============================================================================
  // Health Checking
  // =============================================================================

  private setupHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.connections.values()).map(connection => 
      this.checkConnectionHealth(connection)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkConnectionHealth(connection: UEPAgentConnection): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check cache first
      const cacheKey = `health:${connection.agentId}`;
      const cachedHealth = this.healthCache.get(cacheKey);
      
      if (cachedHealth !== undefined) {
        return;
      }

      // Perform health check
      const healthEndpoint = connection.registration.endpoints.health;
      const response = await axios.get(healthEndpoint, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 300;

      // Update connection status
      connection.status = isHealthy ? 'connected' : 'error';
      connection.responseTime = responseTime;

      if (!isHealthy) {
        connection.errorCount++;
      }

      // Cache health result
      this.healthCache.set(cacheKey, isHealthy);

      // Update metrics
      this.metrics.healthChecks.inc({
        agent_id: connection.agentId,
        status: isHealthy ? 'healthy' : 'unhealthy'
      });

      // Emit health change events
      this.emit('healthChange', {
        agentId: connection.agentId,
        healthy: isHealthy,
        responseTime
      });

    } catch (error) {
      connection.status = 'error';
      connection.errorCount++;
      
      this.metrics.connectionErrors.inc({
        agent_id: connection.agentId,
        error_type: 'health_check'
      });

      this.logger.debug('Health check failed', {
        agentId: connection.agentId,
        error: (error as Error).message
      });
    }
  }

  // =============================================================================
  // Registry Communication
  // =============================================================================

  private async performDiscoveryWithRetry(query: UEPServiceDiscoveryQuery): Promise<UEPDiscoveryResult> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retryOptions.maxAttempts; attempt++) {
      try {
        const response = await this.makeRegistryRequest('/api/registry/discover', 'POST', query);
        
        return {
          agents: response.data.agents,
          connections: [],
          query,
          resultCount: response.data.resultCount,
          queryTime: response.data.queryTime,
          cacheHit: false
        };

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryOptions.maxAttempts - 1) {
          const delay = Math.min(
            this.config.retryOptions.baseDelay * Math.pow(this.config.retryOptions.backoffMultiplier, attempt),
            this.config.retryOptions.maxDelay
          );
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private async makeRegistryRequest(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any): Promise<any> {
    let lastError: Error;
    
    // Try each registry endpoint in order
    for (let i = 0; i < this.config.registryEndpoints.length; i++) {
      const endpointIndex = (this.currentRegistryIndex + i) % this.config.registryEndpoints.length;
      const endpoint = this.config.registryEndpoints[endpointIndex];
      
      try {
        const client = this.httpClients.get(endpoint);
        if (!client) continue;

        let response;
        
        if (this.config.circuitBreakerOptions.enabled) {
          const breaker = this.circuitBreakers.get(endpoint);
          if (breaker) {
            response = await breaker.fire({
              method: method.toLowerCase(),
              url: path,
              data
            });
          } else {
            response = await client.request({
              method: method.toLowerCase(),
              url: path,
              data
            });
          }
        } else {
          response = await client.request({
            method: method.toLowerCase(),
            url: path,
            data
          });
        }

        // Update current registry index for round-robin
        this.currentRegistryIndex = endpointIndex;
        
        return response;

      } catch (error) {
        lastError = error as Error;
        
        this.logger.debug('Registry request failed', {
          endpoint,
          path,
          method,
          error: (error as Error).message
        });
      }
    }

    throw lastError!;
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private generateCacheKey(query: UEPServiceDiscoveryQuery): string {
    return JSON.stringify(query, Object.keys(query).sort());
  }

  private generateCapabilityCacheKey(capabilities: string[], options: any): string {
    return `cap:${JSON.stringify({ capabilities, ...options }, Object.keys({ capabilities, ...options }).sort())}`;
  }

  private calculateCapabilityScore(matchingCapabilities: UEPAgentCapability[], requestedCapabilities: string[]): number {
    if (matchingCapabilities.length === 0 || requestedCapabilities.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let maxScore = 0;

    for (const requested of requestedCapabilities) {
      maxScore++;
      
      for (const capability of matchingCapabilities) {
        if (capability.name === requested) {
          totalScore += 1.0; // Exact match
          break;
        } else if (capability.name.includes(requested) || capability.tags.includes(requested)) {
          totalScore += 0.7; // Partial match
          break;
        } else if (capability.tags.some(tag => tag.includes(requested))) {
          totalScore += 0.3; // Tag match
          break;
        }
      }
    }

    return maxScore > 0 ? totalScore / maxScore : 0;
  }

  private updateConnectionMetrics(endpoint: string, result: 'success' | 'error', statusCode: number): void {
    if (result === 'error') {
      this.metrics.connectionErrors.inc({
        endpoint,
        status_code: statusCode.toString()
      });
    }
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPDiscoveryMetrics {
    const prefix = 'uep_discovery_client_';

    return {
      discoveryRequests: new Counter({
        name: `${prefix}requests_total`,
        help: 'Total discovery requests',
        labelNames: ['cache_hit', 'agent_type']
      }),

      discoveryLatency: new Histogram({
        name: `${prefix}latency_seconds`,
        help: 'Discovery request latency',
        labelNames: ['agent_type'],
        buckets: [0.001, 0.01, 0.1, 1.0, 10.0]
      }),

      cacheHitRatio: new Gauge({
        name: `${prefix}cache_hit_ratio`,
        help: 'Cache hit ratio'
      }),

      activeConnections: new Gauge({
        name: `${prefix}active_connections`,
        help: 'Number of active agent connections'
      }),

      connectionErrors: new Counter({
        name: `${prefix}connection_errors_total`,
        help: 'Total connection errors',
        labelNames: ['agent_id', 'error_type', 'endpoint', 'status_code']
      }),

      healthChecks: new Counter({
        name: `${prefix}health_checks_total`,
        help: 'Total health checks performed',
        labelNames: ['agent_id', 'status']
      }),

      loadBalancerDecisions: new Counter({
        name: `${prefix}load_balancer_decisions_total`,
        help: 'Load balancer decisions',
        labelNames: ['strategy', 'agent_type']
      }),

      circuitBreakerEvents: new Counter({
        name: `${prefix}circuit_breaker_events_total`,
        help: 'Circuit breaker events',
        labelNames: ['endpoint', 'event']
      }),

      capabilityMatches: new Counter({
        name: `${prefix}capability_matches_total`,
        help: 'Capability matches found',
        labelNames: ['category']
      })
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getConnectionStats(): Record<string, any> {
    const stats = {
      totalConnections: this.connections.size,
      healthyConnections: Array.from(this.connections.values()).filter(c => c.status === 'connected').length,
      connectionPools: Object.fromEntries(
        Array.from(this.connectionPools.entries()).map(([type, pool]) => [
          type,
          {
            size: pool.length,
            healthy: pool.filter(c => c.status === 'connected').length
          }
        ])
      ),
      loadBalancerState: Object.fromEntries(this.loadBalancerState)
    };

    return stats;
  }

  public clearCaches(): void {
    this.discoveryCache.clear();
    this.capabilityCache.clear();
    this.healthCache.clear();
    
    this.emit('cachesCleared');
  }

  public async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Close circuit breakers
    for (const breaker of this.circuitBreakers.values()) {
      breaker.shutdown();
    }

    this.connections.clear();
    this.connectionPools.clear();
    this.clearCaches();

    this.emit('shutdown');
  }
}

export default UEPDiscoveryClient;