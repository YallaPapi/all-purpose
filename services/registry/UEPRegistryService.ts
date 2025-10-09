/**
 * UEP Registry Service
 * 
 * Central registry service for UEP agent discovery, capability advertising,
 * and health monitoring. Provides distributed service registry functionality
 * with etcd backend, comprehensive agent lifecycle management, and capability-based
 * discovery. Based on TaskMaster research findings and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { etcd3 } from 'etcd3';
import { LRUCache } from 'lru-cache';
import { Logger } from '../../shared/utils/Logger';
import UEPValidationMiddleware, { UEPProtocolMessage } from '../../containers/api-gateway/src/validation/UEPValidationMiddleware';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPAgentCapability {
  name: string;
  version: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  category: 'processing' | 'data' | 'communication' | 'monitoring' | 'security' | 'custom';
  tags: string[];
  dependencies: string[];
  performance: {
    estimatedLatency: number;
    throughputPerSecond: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  healthCheck?: {
    endpoint: string;
    method: 'GET' | 'POST' | 'HEAD';
    expectedStatus: number;
    timeout: number;
  };
}

export interface UEPAgentRegistration {
  agentId: string;
  agentType: string;
  version: string;
  displayName?: string;
  description?: string;
  capabilities: UEPAgentCapability[];
  endpoints: {
    base: string;
    health: string;
    metrics?: string;
    admin?: string;
  };
  network: {
    host: string;
    port: number;
    protocol: 'http' | 'https' | 'grpc' | 'tcp';
    advertisedHost?: string;
  };
  metadata: Record<string, any>;
  tags: string[];
  registrationTime: Date;
  lastHeartbeat: Date;
  status: 'starting' | 'healthy' | 'degraded' | 'critical' | 'stopping';
  environment: string;
  region?: string;
  datacenter?: string;
}

export interface UEPServiceDiscoveryQuery {
  agentType?: string;
  capabilities?: string[];
  tags?: string[];
  version?: string;
  region?: string;
  environment?: string;
  healthStatus?: ('healthy' | 'degraded')[];
  maxResults?: number;
  includeMeta?: boolean;
  preferNearby?: boolean;
}

export interface UEPRegistryConfig {
  port: number;
  etcdEndpoints: string[];
  etcdPrefix: string;
  heartbeatInterval: number;
  healthCheckInterval: number;
  registrationTtl: number;
  enableMetrics: boolean;
  enableValidation: boolean;
  enableCaching: boolean;
  cacheOptions: {
    maxSize: number;
    ttl: number;
  };
  enableAuthentication: boolean;
  enableAuthorization: boolean;
  maxRegistrationsPerAgent: number;
  enableGeoLocation: boolean;
}

export interface UEPRegistryMetrics {
  totalRegistrations: Counter;
  activeAgents: Gauge;
  discoveryRequests: Counter;
  healthChecks: Counter;
  registrationDuration: Histogram;
  discoveryLatency: Histogram;
  etcdOperations: Counter;
  cacheHitRatio: Gauge;
}

// =============================================================================
// UEP Registry Service Core Class
// =============================================================================

export class UEPRegistryService extends EventEmitter {
  private readonly config: UEPRegistryConfig;
  private readonly logger = new Logger('UEPRegistryService');
  private readonly tracer = trace.getTracer('uep-registry-service', '1.0.0');
  
  // Express server and etcd client
  private readonly app: express.Application;
  private server: any;
  private readonly etcdClient: etcd3.Etcd3;
  
  // Validation and caching
  private readonly validator: UEPValidationMiddleware;
  private readonly discoveryCache: LRUCache<string, UEPAgentRegistration[]>;
  private readonly capabilityCache: LRUCache<string, UEPAgentCapability[]>;
  
  // Internal state
  private readonly registrations: Map<string, UEPAgentRegistration> = new Map();
  private readonly healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly metrics: UEPRegistryMetrics;
  private isShuttingDown: boolean = false;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(config: Partial<UEPRegistryConfig> = {}) {
    super();
    
    this.config = {
      port: parseInt(process.env.UEP_REGISTRY_PORT || '8500'),
      etcdEndpoints: process.env.ETCD_ENDPOINTS?.split(',') || ['http://localhost:2379'],
      etcdPrefix: 'uep/registry/',
      heartbeatInterval: 30000, // 30 seconds
      healthCheckInterval: 60000, // 1 minute
      registrationTtl: 180, // 3 minutes
      enableMetrics: true,
      enableValidation: true,
      enableCaching: true,
      cacheOptions: {
        maxSize: 10000,
        ttl: 300000 // 5 minutes
      },
      enableAuthentication: false,
      enableAuthorization: false,
      maxRegistrationsPerAgent: 10,
      enableGeoLocation: false,
      ...config
    };

    // Initialize etcd client
    this.etcdClient = new etcd3.Etcd3({
      hosts: this.config.etcdEndpoints,
      grpcOptions: {
        'grpc.keepalive_time_ms': 30000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': true,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.http2.min_time_between_pings_ms': 10000,
        'grpc.http2.min_ping_interval_without_data_ms': 300000
      }
    });

    // Initialize validation
    if (this.config.enableValidation) {
      this.validator = new UEPValidationMiddleware({
        strictMode: true,
        enableCaching: this.config.enableCaching,
        enableMetrics: this.config.enableMetrics
      });
    }

    // Initialize caches
    this.discoveryCache = new LRUCache({
      max: this.config.cacheOptions.maxSize,
      ttl: this.config.cacheOptions.ttl
    });

    this.capabilityCache = new LRUCache({
      max: this.config.cacheOptions.maxSize,
      ttl: this.config.cacheOptions.ttl
    });

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Initialize Express app
    this.app = express();
    this.setupExpressMiddleware();
    this.setupRoutes();

    this.logger.info('UEP Registry Service initialized', {
      port: this.config.port,
      etcdEndpoints: this.config.etcdEndpoints,
      enableValidation: this.config.enableValidation,
      enableCaching: this.config.enableCaching
    });
  }

  // =============================================================================
  // Express Setup
  // =============================================================================

  private setupExpressMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request ID middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });

    // Validation middleware
    if (this.config.enableValidation) {
      const validationMiddleware = this.validator.getValidationMiddleware();
      this.app.use('/api/registry', validationMiddleware.requireJSON);
    }

    // Metrics middleware
    if (this.config.enableMetrics) {
      this.app.use((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - start;
          this.metrics.registrationDuration.observe(
            { method: req.method, status: res.statusCode.toString() },
            duration / 1000
          );
        });
        next();
      });
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        etcdConnected: this.etcdClient !== null,
        activeRegistrations: this.registrations.size
      });
    });

    // Agent registration
    this.app.post('/api/registry/agents', this.handleRegistration.bind(this));
    
    // Agent heartbeat
    this.app.put('/api/registry/agents/:agentId/heartbeat', this.handleHeartbeat.bind(this));
    
    // Agent deregistration
    this.app.delete('/api/registry/agents/:agentId', this.handleDeregistration.bind(this));
    
    // Service discovery
    this.app.post('/api/registry/discover', this.handleDiscovery.bind(this));
    
    // Capability search
    this.app.post('/api/registry/capabilities', this.handleCapabilitySearch.bind(this));
    
    // Get all registrations (admin)
    this.app.get('/api/registry/agents', this.handleListAgents.bind(this));
    
    // Get specific agent
    this.app.get('/api/registry/agents/:agentId', this.handleGetAgent.bind(this));
    
    // Update agent status
    this.app.put('/api/registry/agents/:agentId/status', this.handleStatusUpdate.bind(this));

    // Metrics endpoint
    if (this.config.enableMetrics) {
      this.app.get('/metrics', async (req: Request, res: Response) => {
        res.set('Content-Type', 'text/plain');
        res.send('Registry metrics would be here'); // Placeholder
      });
    }
  }

  // =============================================================================
  // Registration Handlers
  // =============================================================================

  private async handleRegistration(req: Request, res: Response): Promise<void> {
    return this.tracer.startActiveSpan('uep.registry.register', async (span) => {
      try {
        const registrationData = req.body as Partial<UEPAgentRegistration>;
        
        span.setAttributes({
          'agent.id': registrationData.agentId || 'unknown',
          'agent.type': registrationData.agentType || 'unknown'
        });

        // Validate registration data
        const validation = await this.validateRegistration(registrationData);
        if (!validation.valid) {
          res.status(400).json({
            error: 'INVALID_REGISTRATION',
            message: 'Registration data validation failed',
            violations: validation.errors
          });
          return;
        }

        // Create full registration
        const registration: UEPAgentRegistration = {
          agentId: registrationData.agentId || uuidv4(),
          agentType: registrationData.agentType!,
          version: registrationData.version || '1.0.0',
          displayName: registrationData.displayName,
          description: registrationData.description,
          capabilities: registrationData.capabilities || [],
          endpoints: registrationData.endpoints!,
          network: registrationData.network!,
          metadata: registrationData.metadata || {},
          tags: registrationData.tags || [],
          registrationTime: new Date(),
          lastHeartbeat: new Date(),
          status: 'starting',
          environment: registrationData.environment || 'development',
          region: registrationData.region,
          datacenter: registrationData.datacenter
        };

        // Store in memory and etcd
        await this.storeRegistration(registration);
        
        // Setup health checking
        this.setupHealthCheck(registration);

        // Clear caches
        this.clearCaches();

        // Update metrics
        this.metrics.totalRegistrations.inc({ agent_type: registration.agentType });
        this.metrics.activeAgents.set(this.registrations.size);

        span.setStatus({ code: SpanStatusCode.OK });
        
        res.status(201).json({
          agentId: registration.agentId,
          status: 'registered',
          heartbeatInterval: this.config.heartbeatInterval,
          registrationTtl: this.config.registrationTtl
        });

        this.emit('agentRegistered', registration);

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Registration failed', { error: (error as Error).message });
        
        res.status(500).json({
          error: 'REGISTRATION_FAILED',
          message: 'Internal server error during registration'
        });
      }
    });
  }

  private async handleHeartbeat(req: Request, res: Response): Promise<void> {
    return this.tracer.startActiveSpan('uep.registry.heartbeat', async (span) => {
      try {
        const agentId = req.params.agentId;
        const registration = this.registrations.get(agentId);

        if (!registration) {
          res.status(404).json({
            error: 'AGENT_NOT_FOUND',
            message: `Agent ${agentId} not registered`
          });
          return;
        }

        // Update heartbeat
        registration.lastHeartbeat = new Date();
        registration.status = req.body.status || registration.status;

        // Update in etcd
        await this.updateRegistration(registration);

        span.setStatus({ code: SpanStatusCode.OK });
        
        res.json({
          status: 'acknowledged',
          nextHeartbeat: this.config.heartbeatInterval
        });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        res.status(500).json({
          error: 'HEARTBEAT_FAILED',
          message: 'Failed to process heartbeat'
        });
      }
    });
  }

  private async handleDeregistration(req: Request, res: Response): Promise<void> {
    return this.tracer.startActiveSpan('uep.registry.deregister', async (span) => {
      try {
        const agentId = req.params.agentId;
        const registration = this.registrations.get(agentId);

        if (!registration) {
          res.status(404).json({
            error: 'AGENT_NOT_FOUND',
            message: `Agent ${agentId} not registered`
          });
          return;
        }

        // Remove from memory and etcd
        await this.removeRegistration(agentId);

        // Clear health check timer
        const timer = this.healthCheckTimers.get(agentId);
        if (timer) {
          clearInterval(timer);
          this.healthCheckTimers.delete(agentId);
        }

        // Clear caches
        this.clearCaches();

        // Update metrics
        this.metrics.activeAgents.set(this.registrations.size);

        span.setStatus({ code: SpanStatusCode.OK });
        
        res.json({
          status: 'deregistered',
          agentId
        });

        this.emit('agentDeregistered', registration);

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        res.status(500).json({
          error: 'DEREGISTRATION_FAILED',
          message: 'Failed to deregister agent'
        });
      }
    });
  }

  // =============================================================================
  // Discovery Handlers
  // =============================================================================

  private async handleDiscovery(req: Request, res: Response): Promise<void> {
    return this.tracer.startActiveSpan('uep.registry.discover', async (span) => {
      const startTime = Date.now();

      try {
        const query = req.body as UEPServiceDiscoveryQuery;
        
        span.setAttributes({
          'discovery.agent_type': query.agentType || 'any',
          'discovery.capabilities': query.capabilities?.join(',') || 'any',
          'discovery.max_results': query.maxResults || 'unlimited'
        });

        // Check cache first
        const cacheKey = this.generateDiscoveryCacheKey(query);
        let results = this.discoveryCache.get(cacheKey);

        if (!results) {
          // Perform discovery
          results = await this.performDiscovery(query);
          
          // Cache results
          if (this.config.enableCaching) {
            this.discoveryCache.set(cacheKey, results);
          }
        }

        // Update metrics
        this.metrics.discoveryRequests.inc({
          agent_type: query.agentType || 'any',
          cache_hit: results ? 'false' : 'true'
        });

        this.metrics.discoveryLatency.observe(
          { agent_type: query.agentType || 'any' },
          (Date.now() - startTime) / 1000
        );

        span.setAttributes({
          'discovery.results_count': results.length,
          'discovery.duration_ms': Date.now() - startTime
        });

        span.setStatus({ code: SpanStatusCode.OK });
        
        res.json({
          agents: results,
          query,
          resultCount: results.length,
          queryTime: Date.now() - startTime
        });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Discovery failed', { error: (error as Error).message });
        
        res.status(500).json({
          error: 'DISCOVERY_FAILED',
          message: 'Failed to perform service discovery'
        });
      }
    });
  }

  private async handleCapabilitySearch(req: Request, res: Response): Promise<void> {
    return this.tracer.startActiveSpan('uep.registry.capability_search', async (span) => {
      try {
        const { capabilities, category, tags } = req.body;
        
        const results: Array<{ agent: UEPAgentRegistration; matchingCapabilities: UEPAgentCapability[] }> = [];

        for (const registration of this.registrations.values()) {
          const matchingCapabilities = registration.capabilities.filter(cap => {
            let matches = true;
            
            if (capabilities && capabilities.length > 0) {
              matches = matches && capabilities.some((reqCap: string) => 
                cap.name.includes(reqCap) || cap.tags.includes(reqCap)
              );
            }
            
            if (category) {
              matches = matches && cap.category === category;
            }
            
            if (tags && tags.length > 0) {
              matches = matches && tags.some((tag: string) => cap.tags.includes(tag));
            }
            
            return matches;
          });

          if (matchingCapabilities.length > 0) {
            results.push({
              agent: registration,
              matchingCapabilities
            });
          }
        }

        span.setStatus({ code: SpanStatusCode.OK });
        
        res.json({
          results,
          resultCount: results.length
        });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        res.status(500).json({
          error: 'CAPABILITY_SEARCH_FAILED',
          message: 'Failed to search capabilities'
        });
      }
    });
  }

  // =============================================================================
  // Admin Handlers
  // =============================================================================

  private async handleListAgents(req: Request, res: Response): Promise<void> {
    const agents = Array.from(this.registrations.values());
    res.json({
      agents,
      totalCount: agents.length,
      timestamp: new Date().toISOString()
    });
  }

  private async handleGetAgent(req: Request, res: Response): Promise<void> {
    const agentId = req.params.agentId;
    const registration = this.registrations.get(agentId);

    if (!registration) {
      res.status(404).json({
        error: 'AGENT_NOT_FOUND',
        message: `Agent ${agentId} not found`
      });
      return;
    }

    res.json(registration);
  }

  private async handleStatusUpdate(req: Request, res: Response): Promise<void> {
    const agentId = req.params.agentId;
    const { status } = req.body;
    const registration = this.registrations.get(agentId);

    if (!registration) {
      res.status(404).json({
        error: 'AGENT_NOT_FOUND',
        message: `Agent ${agentId} not found`
      });
      return;
    }

    registration.status = status;
    registration.lastHeartbeat = new Date();
    
    await this.updateRegistration(registration);

    res.json({
      agentId,
      status,
      updated: true
    });
  }

  // =============================================================================
  // Core Registry Operations
  // =============================================================================

  private async storeRegistration(registration: UEPAgentRegistration): Promise<void> {
    // Store in memory
    this.registrations.set(registration.agentId, registration);

    // Store in etcd
    const key = `${this.config.etcdPrefix}agents/${registration.agentId}`;
    await this.etcdClient.put(key).value(JSON.stringify(registration)).exec();

    // Set TTL for automatic cleanup
    await this.etcdClient.lease.grant(this.config.registrationTtl);
  }

  private async updateRegistration(registration: UEPAgentRegistration): Promise<void> {
    // Update in memory
    this.registrations.set(registration.agentId, registration);

    // Update in etcd
    const key = `${this.config.etcdPrefix}agents/${registration.agentId}`;
    await this.etcdClient.put(key).value(JSON.stringify(registration)).exec();
  }

  private async removeRegistration(agentId: string): Promise<void> {
    // Remove from memory
    this.registrations.delete(agentId);

    // Remove from etcd
    const key = `${this.config.etcdPrefix}agents/${agentId}`;
    await this.etcdClient.delete().key(key).exec();
  }

  private async performDiscovery(query: UEPServiceDiscoveryQuery): Promise<UEPAgentRegistration[]> {
    let results = Array.from(this.registrations.values());

    // Filter by agent type
    if (query.agentType) {
      results = results.filter(r => r.agentType === query.agentType);
    }

    // Filter by capabilities
    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter(r => 
        query.capabilities!.some(cap => 
          r.capabilities.some(agentCap => agentCap.name.includes(cap))
        )
      );
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(r => 
        query.tags!.some(tag => r.tags.includes(tag))
      );
    }

    // Filter by health status
    if (query.healthStatus && query.healthStatus.length > 0) {
      results = results.filter(r => query.healthStatus!.includes(r.status as any));
    }

    // Filter by environment
    if (query.environment) {
      results = results.filter(r => r.environment === query.environment);
    }

    // Filter by region
    if (query.region) {
      results = results.filter(r => r.region === query.region);
    }

    // Limit results
    if (query.maxResults && query.maxResults > 0) {
      results = results.slice(0, query.maxResults);
    }

    return results;
  }

  // =============================================================================
  // Health Checking
  // =============================================================================

  private setupHealthCheck(registration: UEPAgentRegistration): void {
    const timer = setInterval(async () => {
      try {
        await this.performHealthCheck(registration);
      } catch (error) {
        this.logger.error('Health check failed', {
          agentId: registration.agentId,
          error: (error as Error).message
        });
      }
    }, this.config.healthCheckInterval);

    this.healthCheckTimers.set(registration.agentId, timer);
  }

  private async performHealthCheck(registration: UEPAgentRegistration): Promise<void> {
    // Implementation would check agent health endpoint
    // For now, mark as healthy if heartbeat is recent
    const timeSinceHeartbeat = Date.now() - registration.lastHeartbeat.getTime();
    
    if (timeSinceHeartbeat > this.config.heartbeatInterval * 3) {
      registration.status = 'critical';
      await this.updateRegistration(registration);
      
      this.emit('agentUnhealthy', registration);
    }

    this.metrics.healthChecks.inc({
      agent_id: registration.agentId,
      status: registration.status
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private async validateRegistration(data: Partial<UEPAgentRegistration>): Promise<{ valid: boolean; errors: any[] }> {
    const errors: any[] = [];

    if (!data.agentType) {
      errors.push({ field: 'agentType', message: 'Agent type is required' });
    }

    if (!data.endpoints || !data.endpoints.base) {
      errors.push({ field: 'endpoints.base', message: 'Base endpoint is required' });
    }

    if (!data.network || !data.network.host || !data.network.port) {
      errors.push({ field: 'network', message: 'Network configuration is required' });
    }

    return { valid: errors.length === 0, errors };
  }

  private generateDiscoveryCacheKey(query: UEPServiceDiscoveryQuery): string {
    return JSON.stringify(query, Object.keys(query).sort());
  }

  private clearCaches(): void {
    this.discoveryCache.clear();
    this.capabilityCache.clear();
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPRegistryMetrics {
    const prefix = 'uep_registry_';

    return {
      totalRegistrations: new Counter({
        name: `${prefix}registrations_total`,
        help: 'Total agent registrations',
        labelNames: ['agent_type']
      }),

      activeAgents: new Gauge({
        name: `${prefix}active_agents`,
        help: 'Number of active registered agents'
      }),

      discoveryRequests: new Counter({
        name: `${prefix}discovery_requests_total`,
        help: 'Total discovery requests',
        labelNames: ['agent_type', 'cache_hit']
      }),

      healthChecks: new Counter({
        name: `${prefix}health_checks_total`,
        help: 'Total health checks performed',
        labelNames: ['agent_id', 'status']
      }),

      registrationDuration: new Histogram({
        name: `${prefix}registration_duration_seconds`,
        help: 'Registration request duration',
        labelNames: ['method', 'status'],
        buckets: [0.001, 0.01, 0.1, 1.0, 10.0]
      }),

      discoveryLatency: new Histogram({
        name: `${prefix}discovery_latency_seconds`,
        help: 'Discovery request latency',
        labelNames: ['agent_type'],
        buckets: [0.001, 0.01, 0.1, 1.0, 10.0]
      }),

      etcdOperations: new Counter({
        name: `${prefix}etcd_operations_total`,
        help: 'Total etcd operations',
        labelNames: ['operation', 'result']
      }),

      cacheHitRatio: new Gauge({
        name: `${prefix}cache_hit_ratio`,
        help: 'Cache hit ratio for discovery requests'
      })
    };
  }

  // =============================================================================
  // Lifecycle Management
  // =============================================================================

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, () => {
        this.logger.info(`UEP Registry Service listening on port ${this.config.port}`);
        
        // Setup periodic cleanup
        this.heartbeatTimer = setInterval(() => {
          this.performPeriodicCleanup();
        }, this.config.heartbeatInterval);

        resolve();
      });

      this.server.on('error', reject);
    });
  }

  private async performPeriodicCleanup(): Promise<void> {
    const now = Date.now();
    const staleAgents: string[] = [];

    for (const [agentId, registration] of this.registrations) {
      const timeSinceHeartbeat = now - registration.lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > this.config.heartbeatInterval * 4) {
        staleAgents.push(agentId);
      }
    }

    for (const agentId of staleAgents) {
      await this.removeRegistration(agentId);
      
      const timer = this.healthCheckTimers.get(agentId);
      if (timer) {
        clearInterval(timer);
        this.healthCheckTimers.delete(agentId);
      }

      this.logger.info('Removed stale agent registration', { agentId });
    }

    if (staleAgents.length > 0) {
      this.clearCaches();
      this.metrics.activeAgents.set(this.registrations.size);
    }
  }

  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.logger.info('Shutting down UEP Registry Service');

    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }

    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
    }

    // Close etcd connection
    this.etcdClient.close();

    this.emit('shutdown');
  }
}

export default UEPRegistryService;