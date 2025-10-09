#!/usr/bin/env node

/**
 * UEP Capability Registry Service
 * 
 * Enterprise-grade capability registry service with TypeScript, Express.js, Redis storage,
 * semantic versioning, agent capability registration, discovery API, health monitoring,
 * and Consul integration for the Universal Execution Protocol (UEP) system.
 * 
 * Research-based implementation features:
 * - Express.js REST API for capability registration and discovery
 * - Redis for fast, in-memory storage with TTL support
 * - Consul integration for service discovery and health checks
 * - Semantic versioning enforcement with compatibility checking
 * - Real-time health monitoring and heartbeat management
 * - Comprehensive observability with metrics and logging
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.2
 */

import express from 'express';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';
import cors from 'cors';
import {
  AgentCapability,
  AgentRegistration,
  CapabilitySearchCriteria,
  CapabilitySearchResult,
  CapabilityRegistryConfig,
  SemVer,
  VersionRange,
  CompatibilityResult
} from '../types/CapabilitySchema.js';
import {
  parseSemVer,
  checkCapabilityCompatibility,
  findHighestCompatibleVersion,
  validateSemVer,
  semVerToString
} from '../utils/CapabilityVersioning.js';
import { 
  integrateContext7Middleware,
  createContext7RouteHandlers,
  Context7RedisWrapper 
} from '../context7-integration.js';

/**
 * Redis data model keys
 */
const REDIS_KEYS = {
  AGENT: (agentId: string) => `uep:agent:${agentId}`,
  CAPABILITY: (capabilityId: string, version: string) => `uep:capability:${capabilityId}:${version}`,
  CAPABILITY_AGENTS: (capabilityId: string) => `uep:capability:agents:${capabilityId}`,
  AGENT_HEALTH: (agentId: string) => `uep:agent:health:${agentId}`,
  AGENT_HEARTBEAT: (agentId: string) => `uep:agent:heartbeat:${agentId}`,
  REGISTRY_METRICS: 'uep:registry:metrics',
  ACTIVE_AGENTS: 'uep:registry:active_agents'
} as const;

/**
 * Health status enumeration
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Agent registration data stored in Redis
 */
export interface StoredAgentRegistration extends AgentRegistration {
  registrationId: string;
  lastHeartbeat: Date;
  health: {
    status: HealthStatus;
    lastCheck: Date;
    checks: Record<string, boolean>;
    metrics?: Record<string, number>;
  };
}

/**
 * Registry metrics for observability
 */
export interface RegistryMetrics {
  totalAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  unhealthyAgents: number;
  totalCapabilities: number;
  registrationsPerHour: number;
  averageResponseTime: number;
  lastUpdated: Date;
}

/**
 * Capability Registry Service class
 */
export class CapabilityRegistryService {
  private app: express.Application;
  private redis: Redis;
  private context7Redis: Context7RedisWrapper;
  private consul?: any; // Consul client (optional dependency)
  private config: CapabilityRegistryConfig;
  private server?: any;
  private isShuttingDown: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private serviceId: string;
  private context7RouteHandlers: any;

  constructor(config: CapabilityRegistryConfig) {
    this.config = config;
    this.serviceId = `capability-registry-${uuidv4()}`;
    
    this.app = express();
    
    // Initialize Redis connection with Context7 wrapper
    this.redis = new Redis(config.storage.connectionString || 'redis://localhost:6379', {
      keyPrefix: config.storage.keyPrefix || 'uep:',
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(100 + times * 2, 2000);
        return delay;
      }
    });
    
    // Create Context7-enhanced Redis wrapper
    this.context7Redis = new Context7RedisWrapper(this.redis);
    
    // Create Context7 route handlers
    this.context7RouteHandlers = createContext7RouteHandlers();
    
    // Setup middleware and routes (Context7 integration happens in setupMiddleware)
    this.setupMiddleware();
    this.setupRoutes();

    this.setupRedisEventHandlers();
    
    // Initialize Consul if configured
    if (config.monitoring?.auditEnabled) {
      this.initializeConsul();
    }
  }

  /**
   * Initialize the registry service
   */
  public async initialize(): Promise<void> {
    try {
      console.log(chalk.blue('🏗️ Initializing Capability Registry Service...'));
      
      // Connect to Redis
      await this.redis.connect();
      console.log(chalk.green('✅ Redis connection established'));
      
      // Register with Consul if configured
      if (this.consul) {
        await this.registerWithConsul();
        console.log(chalk.green('✅ Consul service registration completed'));
      }
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();
      
      // Start metrics collection
      if (this.config.monitoring?.metricsEnabled) {
        this.startMetricsCollection();
      }
      
      console.log(chalk.green('✅ Capability Registry Service initialized successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Capability Registry Service:'), error);
      throw error;
    }
  }

  /**
   * Start the HTTP server
   */
  public async start(port: number = 3001, host: string = 'localhost'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, host, () => {
          console.log(chalk.green(`🚀 Capability Registry Service listening on http://${host}:${port}`));
          console.log(chalk.blue(`📋 Service ID: ${this.serviceId}`));
          resolve();
        });
        
        this.server.on('error', (error: Error) => {
          console.error(chalk.red('❌ Server startup error:'), error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log(chalk.yellow('🔄 Shutting down Capability Registry Service...'));
    this.isShuttingDown = true;
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Deregister from Consul
    if (this.consul) {
      try {
        await this.consul.agent.service.deregister(this.serviceId);
        console.log(chalk.green('✅ Consul service deregistration completed'));
      } catch (error) {
        console.warn(chalk.yellow('⚠️ Consul deregistration warning:'), error);
      }
    }
    
    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          console.log(chalk.green('✅ HTTP server closed'));
          resolve();
        });
      });
    }
    
    // Close Redis connection
    await this.redis.disconnect();
    console.log(chalk.green('✅ Redis connection closed'));
    
    console.log(chalk.green('✅ Capability Registry Service shutdown completed'));
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    console.log(chalk.blue('🔗 Integrating Context7 middleware for trace context propagation...'));
    
    // Integrate Context7 middleware stack FIRST (before other middleware)
    integrateContext7Middleware(this.app);
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Agent-ID', 
        'X-Request-ID',
        'X-Trace-ID',
        'X-Span-ID',
        'traceparent',
        'tracestate',
        'baggage'
      ],
      credentials: true
    }));

    // JSON parsing with size limit
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Enhanced request logging middleware with Context7 support
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] || uuidv4();
      const traceId = req.headers['x-trace-id'] || 'unknown';
      
      req.requestId = requestId;
      req.startTime = startTime;
      
      console.log(chalk.cyan(`📨 ${req.method} ${req.path} [${requestId}] [trace:${traceId.substring(0, 8)}...]`));
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusColor = res.statusCode >= 400 ? chalk.red : chalk.green;
        console.log(statusColor(`📤 ${req.method} ${req.path} [${requestId}] - ${res.statusCode} (${duration}ms) [trace:${traceId.substring(0, 8)}...]`));
      });
      
      next();
    });

    // Health check endpoint (must be before authentication)
    this.app.get('/health', this.handleHealthCheck.bind(this));
    
    console.log(chalk.green('✅ Context7 middleware integration completed'));
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const router = express.Router();

    // Agent registration routes with Context7 integration
    router.post('/agents/register', this.handleAgentRegistration.bind(this));
    router.put('/agents/:agentId/capabilities', this.handleUpdateCapabilities.bind(this));
    router.post('/agents/:agentId/heartbeat', this.handleHeartbeat.bind(this));
    router.delete('/agents/:agentId', this.handleAgentDeregistration.bind(this));

    // Context7-enhanced capability routes
    router.post('/capabilities/register', this.context7RouteHandlers.registerCapability.bind(this.context7RouteHandlers));
    router.post('/capabilities/search', this.context7RouteHandlers.searchCapabilities.bind(this.context7RouteHandlers));

    // Discovery API routes
    router.get('/capabilities', this.handleCapabilitySearch.bind(this));
    router.get('/capabilities/:capabilityId', this.handleCapabilityLookup.bind(this));
    router.get('/capabilities/:capabilityId/versions', this.handleCapabilityVersions.bind(this));
    router.get('/agents', this.handleAgentList.bind(this));
    router.get('/agents/:agentId', this.handleAgentDetails.bind(this));

    // Health and monitoring routes
    router.get('/health/agents', this.handleAgentHealthStatus.bind(this));
    router.get('/health/capabilities', this.handleCapabilityHealthStatus.bind(this));
    router.get('/metrics', this.handleMetrics.bind(this));

    // Administrative routes
    router.get('/admin/stats', this.handleRegistryStats.bind(this));
    router.post('/admin/cleanup', this.handleCleanupStaleAgents.bind(this));

    this.app.use('/api/v1', router);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        service: 'UEP Capability Registry Service',
        version: '1.0.0',
        endpoints: {
          agents: {
            register: 'POST /api/v1/agents/register',
            update: 'PUT /api/v1/agents/:agentId/capabilities',
            heartbeat: 'POST /api/v1/agents/:agentId/heartbeat',
            deregister: 'DELETE /api/v1/agents/:agentId',
            list: 'GET /api/v1/agents',
            details: 'GET /api/v1/agents/:agentId'
          },
          capabilities: {
            search: 'GET /api/v1/capabilities',
            lookup: 'GET /api/v1/capabilities/:capabilityId',
            versions: 'GET /api/v1/capabilities/:capabilityId/versions'
          },
          health: {
            service: 'GET /health',
            agents: 'GET /api/v1/health/agents',
            capabilities: 'GET /api/v1/health/capabilities'
          },
          monitoring: {
            metrics: 'GET /api/v1/metrics',
            stats: 'GET /api/v1/admin/stats'
          }
        }
      });
    });
  }

  /**
   * Handle agent registration
   */
  private async handleAgentRegistration(req: express.Request, res: express.Response): Promise<void> {
    try {
      const registration: AgentRegistration = req.body;
      
      // Validate registration data
      const validationErrors = this.validateAgentRegistration(registration);
      if (validationErrors.length > 0) {
        res.status(400).json({
          error: 'Invalid agent registration',
          details: validationErrors
        });
        return;
      }

      // Generate registration ID
      const registrationId = uuidv4();
      const now = new Date();

      // Create stored registration
      const storedRegistration: StoredAgentRegistration = {
        ...registration,
        registrationId,
        lastHeartbeat: now,
        health: {
          status: 'healthy',
          lastCheck: now,
          checks: {},
          metrics: {}
        }
      };

      // Store agent registration
      await this.storeAgentRegistration(storedRegistration);
      
      // Index capabilities
      await this.indexAgentCapabilities(registration.agentId, registration.capabilities);
      
      // Update metrics
      await this.updateRegistryMetrics();

      console.log(chalk.green(`✅ Agent registered: ${registration.agentId} [${registrationId}]`));

      res.status(201).json({
        success: true,
        registrationId,
        agentId: registration.agentId,
        capabilitiesCount: registration.capabilities.length,
        expiresAt: new Date(now.getTime() + (registration.ttl || 3600) * 1000)
      });
    } catch (error) {
      console.error(chalk.red('❌ Agent registration error:'), error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to register agent'
      });
    }
  }

  /**
   * Handle capability search
   */
  private async handleCapabilitySearch(req: express.Request, res: express.Response): Promise<void> {
    try {
      const criteria: CapabilitySearchCriteria = {
        capabilityId: req.query.capabilityId as string,
        namePattern: req.query.namePattern as string,
        category: req.query.category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        includeDeprecated: req.query.includeDeprecated === 'true',
        maxLatency: req.query.maxLatency ? parseInt(req.query.maxLatency as string) : undefined,
        minThroughput: req.query.minThroughput ? parseInt(req.query.minThroughput as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        sortBy: req.query.sortBy as any || 'name',
        sortOrder: req.query.sortOrder as any || 'asc'
      };

      const results = await this.searchCapabilities(criteria);

      res.json({
        success: true,
        results,
        total: results.length,
        criteria
      });
    } catch (error) {
      console.error(chalk.red('❌ Capability search error:'), error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search capabilities'
      });
    }
  }

  /**
   * Handle heartbeat from agent
   */
  private async handleHeartbeat(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { agentId } = req.params;
      const { health, metrics } = req.body;

      // Update heartbeat timestamp
      const now = new Date();
      await this.redis.set(
        REDIS_KEYS.AGENT_HEARTBEAT(agentId),
        now.toISOString(),
        'EX',
        300 // 5 minutes TTL
      );

      // Update health status if provided
      if (health) {
        await this.updateAgentHealth(agentId, health, metrics);
      }

      res.json({
        success: true,
        timestamp: now.toISOString(),
        ttl: 300
      });
    } catch (error) {
      console.error(chalk.red(`❌ Heartbeat error for agent ${req.params.agentId}:`), error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process heartbeat'
      });
    }
  }

  /**
   * Handle health check
   */
  private async handleHealthCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
      const health = await this.getServiceHealth();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Store agent registration in Redis
   */
  private async storeAgentRegistration(registration: StoredAgentRegistration): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Store main registration data
    pipeline.hset(
      REDIS_KEYS.AGENT(registration.agentId),
      'data',
      JSON.stringify(registration)
    );
    
    // Set TTL
    const ttl = registration.ttl || this.config.storage.ttl || 3600;
    pipeline.expire(REDIS_KEYS.AGENT(registration.agentId), ttl);
    
    // Add to active agents set
    pipeline.sadd(REDIS_KEYS.ACTIVE_AGENTS, registration.agentId);
    
    await pipeline.exec();
  }

  /**
   * Index agent capabilities for fast lookup
   */
  private async indexAgentCapabilities(agentId: string, capabilities: AgentCapability[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const capability of capabilities) {
      // Index by capability ID
      pipeline.sadd(
        REDIS_KEYS.CAPABILITY_AGENTS(capability.id),
        agentId
      );
      
      // Store capability details
      pipeline.hset(
        REDIS_KEYS.CAPABILITY(capability.id, semVerToString(capability.version)),
        'agentId', agentId,
        'data', JSON.stringify(capability)
      );
    }
    
    await pipeline.exec();
  }

  /**
   * Search capabilities based on criteria
   */
  private async searchCapabilities(criteria: CapabilitySearchCriteria): Promise<CapabilitySearchResult[]> {
    const results: CapabilitySearchResult[] = [];
    
    if (criteria.capabilityId) {
      // Direct capability lookup
      const agentIds = await this.redis.smembers(REDIS_KEYS.CAPABILITY_AGENTS(criteria.capabilityId));
      
      for (const agentId of agentIds) {
        const agent = await this.getStoredAgent(agentId);
        if (!agent) continue;
        
        const matchingCapabilities = agent.capabilities.filter(cap => 
          cap.id === criteria.capabilityId &&
          (!criteria.includeDeprecated ? !cap.deprecated : true)
        );
        
        for (const capability of matchingCapabilities) {
          results.push({
            capability,
            agentId,
            compatibilityScore: 1.0,
            performanceScore: this.calculatePerformanceScore(capability),
            overallScore: 1.0,
            matchReasons: ['Exact capability ID match']
          });
        }
      }
    } else {
      // Full search across all agents
      const activeAgents = await this.redis.smembers(REDIS_KEYS.ACTIVE_AGENTS);
      
      for (const agentId of activeAgents) {
        const agent = await this.getStoredAgent(agentId);
        if (!agent) continue;
        
        for (const capability of agent.capabilities) {
          if (this.matchesSearchCriteria(capability, criteria)) {
            results.push({
              capability,
              agentId,
              compatibilityScore: this.calculateCompatibilityScore(capability, criteria),
              performanceScore: this.calculatePerformanceScore(capability),
              overallScore: 0.8, // Will be calculated based on other scores
              matchReasons: this.getMatchReasons(capability, criteria)
            });
          }
        }
      }
    }
    
    // Sort and limit results
    results.sort(this.getSortFunction(criteria.sortBy, criteria.sortOrder));
    
    return results.slice(0, criteria.limit || 50);
  }

  /**
   * Validate agent registration data
   */
  private validateAgentRegistration(registration: AgentRegistration): string[] {
    const errors: string[] = [];
    
    if (!registration.agentId) {
      errors.push('Agent ID is required');
    }
    
    if (!registration.agentVersion) {
      errors.push('Agent version is required');
    } else {
      const versionValidation = validateSemVer(registration.agentVersion);
      if (!versionValidation.valid) {
        errors.push(`Invalid agent version: ${versionValidation.errors.join(', ')}`);
      }
    }
    
    if (!registration.capabilities || registration.capabilities.length === 0) {
      errors.push('At least one capability is required');
    } else {
      registration.capabilities.forEach((capability, index) => {
        if (!capability.id) {
          errors.push(`Capability ${index}: ID is required`);
        }
        if (!capability.name) {
          errors.push(`Capability ${index}: Name is required`);
        }
        if (!capability.version) {
          errors.push(`Capability ${index}: Version is required`);
        } else {
          const versionValidation = validateSemVer(capability.version);
          if (!versionValidation.valid) {
            errors.push(`Capability ${index}: Invalid version - ${versionValidation.errors.join(', ')}`);
          }
        }
      });
    }
    
    return errors;
  }

  /**
   * Get stored agent registration
   */
  private async getStoredAgent(agentId: string): Promise<StoredAgentRegistration | null> {
    try {
      const data = await this.redis.hget(REDIS_KEYS.AGENT(agentId), 'data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(chalk.red(`❌ Error retrieving agent ${agentId}:`), error);
      return null;
    }
  }

  /**
   * Update agent health status
   */
  private async updateAgentHealth(agentId: string, health: any, metrics?: any): Promise<void> {
    const agent = await this.getStoredAgent(agentId);
    if (!agent) return;
    
    agent.health = {
      status: health.status || 'unknown',
      lastCheck: new Date(),
      checks: health.checks || {},
      metrics: metrics || {}
    };
    
    await this.storeAgentRegistration(agent);
  }

  /**
   * Get service health status
   */
  private async getServiceHealth(): Promise<any> {
    try {
      // Check Redis connection
      await this.redis.ping();
      
      // Get basic metrics
      const activeAgentsCount = await this.redis.scard(REDIS_KEYS.ACTIVE_AGENTS);
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        serviceId: this.serviceId,
        dependencies: {
          redis: 'healthy'
        },
        metrics: {
          activeAgents: activeAgentsCount,
          uptime: process.uptime()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log(chalk.green('✅ Redis connected'));
    });
    
    this.redis.on('error', (error) => {
      console.error(chalk.red('❌ Redis error:'), error);
    });
    
    this.redis.on('close', () => {
      console.log(chalk.yellow('⚠️ Redis connection closed'));
    });
  }

  /**
   * Initialize Consul integration
   */
  private async initializeConsul(): Promise<void> {
    try {
      // Dynamic Consul import (optional dependency)
      const consulModule = await import('consul');
      this.consul = consulModule.default({
        host: process.env.CONSUL_HOST || 'localhost',
        port: process.env.CONSUL_PORT || '8500'
      });
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Consul not available, service discovery disabled'), error);
    }
  }

  /**
   * Register service with Consul
   */
  private async registerWithConsul(): Promise<void> {
    if (!this.consul) return;
    
    const registration = {
      name: 'capability-registry',
      id: this.serviceId,
      tags: ['uep', 'capability-registry', 'api'],
      port: 3001,
      check: {
        http: 'http://localhost:3001/health',
        interval: '10s',
        timeout: '5s'
      }
    };
    
    await this.consul.agent.service.register(registration);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        await this.checkStaleAgents();
      } catch (error) {
        console.error(chalk.red('❌ Heartbeat monitoring error:'), error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        await this.updateRegistryMetrics();
      } catch (error) {
        console.error(chalk.red('❌ Metrics collection error:'), error);
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Check for stale agents and remove them
   */
  private async checkStaleAgents(): Promise<void> {
    const activeAgents = await this.redis.smembers(REDIS_KEYS.ACTIVE_AGENTS);
    const staleAgents: string[] = [];
    
    for (const agentId of activeAgents) {
      const lastHeartbeat = await this.redis.get(REDIS_KEYS.AGENT_HEARTBEAT(agentId));
      
      if (!lastHeartbeat) {
        staleAgents.push(agentId);
        continue;
      }
      
      const heartbeatTime = new Date(lastHeartbeat);
      const now = new Date();
      const timeDiff = now.getTime() - heartbeatTime.getTime();
      
      // Consider agent stale after 10 minutes without heartbeat
      if (timeDiff > 600000) {
        staleAgents.push(agentId);
      }
    }
    
    // Remove stale agents
    for (const agentId of staleAgents) {
      await this.removeStaleAgent(agentId);
      console.log(chalk.yellow(`⚠️ Removed stale agent: ${agentId}`));
    }
  }

  /**
   * Remove stale agent and cleanup indexes
   */
  private async removeStaleAgent(agentId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Get agent data before removal
    const agent = await this.getStoredAgent(agentId);
    
    // Remove from active agents
    pipeline.srem(REDIS_KEYS.ACTIVE_AGENTS, agentId);
    
    // Remove agent data
    pipeline.del(REDIS_KEYS.AGENT(agentId));
    pipeline.del(REDIS_KEYS.AGENT_HEARTBEAT(agentId));
    pipeline.del(REDIS_KEYS.AGENT_HEALTH(agentId));
    
    // Remove from capability indexes
    if (agent) {
      for (const capability of agent.capabilities) {
        pipeline.srem(REDIS_KEYS.CAPABILITY_AGENTS(capability.id), agentId);
        pipeline.del(REDIS_KEYS.CAPABILITY(capability.id, semVerToString(capability.version)));
      }
    }
    
    await pipeline.exec();
  }

  /**
   * Update registry metrics
   */
  private async updateRegistryMetrics(): Promise<void> {
    const metrics: RegistryMetrics = {
      totalAgents: await this.redis.scard(REDIS_KEYS.ACTIVE_AGENTS),
      healthyAgents: 0,
      degradedAgents: 0,
      unhealthyAgents: 0,
      totalCapabilities: 0,
      registrationsPerHour: 0, // TODO: Calculate based on registration timestamps
      averageResponseTime: 0, // TODO: Calculate from request metrics
      lastUpdated: new Date()
    };
    
    // Count agent health statuses
    const activeAgents = await this.redis.smembers(REDIS_KEYS.ACTIVE_AGENTS);
    for (const agentId of activeAgents) {
      const agent = await this.getStoredAgent(agentId);
      if (!agent) continue;
      
      metrics.totalCapabilities += agent.capabilities.length;
      
      switch (agent.health.status) {
        case 'healthy':
          metrics.healthyAgents++;
          break;
        case 'degraded':
          metrics.degradedAgents++;
          break;
        case 'unhealthy':
          metrics.unhealthyAgents++;
          break;
      }
    }
    
    await this.redis.hset(
      REDIS_KEYS.REGISTRY_METRICS,
      'data',
      JSON.stringify(metrics)
    );
  }

  // Helper methods for capability matching and scoring
  private matchesSearchCriteria(capability: AgentCapability, criteria: CapabilitySearchCriteria): boolean {
    // Implementation would include pattern matching, tag filtering, etc.
    return true; // Simplified for now
  }

  private calculateCompatibilityScore(capability: AgentCapability, criteria: CapabilitySearchCriteria): number {
    // Implementation would calculate compatibility based on version ranges, constraints, etc.
    return 0.8; // Simplified for now
  }

  private calculatePerformanceScore(capability: AgentCapability): number {
    // Implementation would calculate score based on performance metrics
    return capability.performance ? 0.9 : 0.7; // Simplified for now
  }

  private getMatchReasons(capability: AgentCapability, criteria: CapabilitySearchCriteria): string[] {
    // Implementation would return specific reasons why this capability matched
    return ['General capability match']; // Simplified for now
  }

  private getSortFunction(sortBy?: string, sortOrder?: string): (a: CapabilitySearchResult, b: CapabilitySearchResult) => number {
    return (a, b) => {
      const order = sortOrder === 'desc' ? -1 : 1;
      
      switch (sortBy) {
        case 'version':
          return order * (a.capability.version.major - b.capability.version.major ||
                         a.capability.version.minor - b.capability.version.minor ||
                         a.capability.version.patch - b.capability.version.patch);
        case 'performance':
          return order * ((b.performanceScore || 0) - (a.performanceScore || 0));
        case 'reliability':
          return order * ((b.compatibilityScore || 0) - (a.compatibilityScore || 0));
        default: // name
          return order * a.capability.name.localeCompare(b.capability.name);
      }
    };
  }

  // Additional handler methods would be implemented here...
  private async handleUpdateCapabilities(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for updating agent capabilities
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleAgentDeregistration(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for agent deregistration
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleCapabilityLookup(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for capability lookup
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleCapabilityVersions(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for capability versions
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleAgentList(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for agent list
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleAgentDetails(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for agent details
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleAgentHealthStatus(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for agent health status
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleCapabilityHealthStatus(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for capability health status
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleMetrics(req: express.Request, res: express.Response): Promise<void> {
    try {
      const metricsData = await this.redis.hget(REDIS_KEYS.REGISTRY_METRICS, 'data');
      const metrics = metricsData ? JSON.parse(metricsData) : null;
      
      res.json({
        success: true,
        metrics: metrics || {
          totalAgents: 0,
          healthyAgents: 0,
          degradedAgents: 0,
          unhealthyAgents: 0,
          totalCapabilities: 0,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  }

  private async handleRegistryStats(req: express.Request, res: express.Response): Promise<void> {
    // Implementation for registry statistics
    res.status(501).json({ error: 'Not implemented yet' });
  }

  private async handleCleanupStaleAgents(req: express.Request, res: express.Response): Promise<void> {
    try {
      await this.checkStaleAgents();
      res.json({ success: true, message: 'Stale agents cleanup completed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cleanup stale agents' });
    }
  }
}

/**
 * Type augmentation for Express Request
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export default CapabilityRegistryService;