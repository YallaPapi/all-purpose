/**
 * Agent Service Helper
 * Task 191.3: Simplified helper for agent service registration and discovery
 * 
 * A high-level helper that makes it extremely easy for UEP agents to:
 * 1. Register themselves on startup
 * 2. Discover other agents
 * 3. Report health status
 * 4. Handle graceful shutdown
 */

import { ServiceDiscoveryClient, createServiceDiscoveryConfig } from './ServiceDiscoveryClient.js';
import {
  AgentRegistrationMetadata,
  ServiceDiscoveryQuery,
  ServiceDiscoveryResult,
  AgentStatus,
  UEPAgentCapability
} from '../src/uep/service-registry/types/AgentRegistration.js';

export interface AgentConfig {
  // Basic agent information
  agentType: string;
  agentName?: string;
  version?: string;
  
  // Network configuration
  host: string;
  port: number;
  healthEndpoint?: string;
  metricsEndpoint?: string;
  
  // Capabilities
  capabilities: string[];
  
  // Environment
  environment?: 'development' | 'staging' | 'production';
  cluster?: string;
  namespace?: string;
  
  // Custom metadata
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface AgentServiceOptions {
  // Service discovery configuration
  registryUrl?: string;
  registryType?: 'redis' | 'consul' | 'hybrid';
  
  // Auto-management options
  autoRegisterOnStartup?: boolean;
  autoDeregisterOnShutdown?: boolean;
  autoHealthReporting?: boolean;
  
  // Health check configuration
  healthCheckInterval?: number; // milliseconds
  healthCheckTimeout?: number;  // milliseconds
  
  // Discovery caching
  enableDiscoveryCache?: boolean;
  discoveryCacheTtl?: number;   // seconds
  
  // Retry and resilience
  retryAttempts?: number;
  circuitBreakerEnabled?: boolean;
}

/**
 * High-level agent service helper
 * 
 * This class provides a simple interface for UEP agents to integrate
 * with the service discovery system without dealing with low-level details.
 */
export class AgentServiceHelper {
  private client: ServiceDiscoveryClient;
  private config: AgentConfig;
  private options: Required<AgentServiceOptions>;
  private agentMetadata?: AgentRegistrationMetadata;
  private healthCheckInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: AgentConfig, options: AgentServiceOptions = {}) {
    this.config = config;
    this.options = {
      registryUrl: options.registryUrl || 'redis://localhost:6379',
      registryType: options.registryType || 'redis',
      autoRegisterOnStartup: options.autoRegisterOnStartup ?? true,
      autoDeregisterOnShutdown: options.autoDeregisterOnShutdown ?? true,
      autoHealthReporting: options.autoHealthReporting ?? true,
      healthCheckInterval: options.healthCheckInterval || 30000,
      healthCheckTimeout: options.healthCheckTimeout || 5000,
      enableDiscoveryCache: options.enableDiscoveryCache ?? true,
      discoveryCacheTtl: options.discoveryCacheTtl || 300,
      retryAttempts: options.retryAttempts || 3,
      circuitBreakerEnabled: options.circuitBreakerEnabled ?? true
    };

    this.client = this.createServiceDiscoveryClient();
    this.setupEventHandlers();
    this.setupShutdownHandlers();
  }

  /**
   * Initialize the agent service (call this on agent startup)
   */
  async start(): Promise<void> {
    try {
      console.log(`Starting agent service for ${this.config.agentType}...`);
      
      // Initialize the client
      await this.client.initialize();
      
      // Auto-register if enabled
      if (this.options.autoRegisterOnStartup) {
        await this.register();
      }
      
      // Start health reporting if enabled
      if (this.options.autoHealthReporting) {
        this.startHealthReporting();
      }
      
      console.log(`Agent service started successfully for ${this.config.agentType}`);
      
    } catch (error) {
      const startError = new Error(`Failed to start agent service: ${error instanceof Error ? error.message : String(error)}`);
      console.error(startError.message);
      throw startError;
    }
  }

  /**
   * Register this agent with the service registry
   */
  async register(): Promise<void> {
    try {
      this.agentMetadata = this.buildAgentMetadata();
      await this.client.registerAgent(this.agentMetadata);
      console.log(`Agent ${this.config.agentType} registered successfully`);
    } catch (error) {
      console.error(`Failed to register agent: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Deregister this agent from the service registry
   */
  async deregister(reason?: string): Promise<void> {
    try {
      await this.client.deregisterAgent(reason);
      console.log(`Agent ${this.config.agentType} deregistered successfully`);
    } catch (error) {
      console.error(`Failed to deregister agent: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Find agents by type
   */
  async findAgents(agentType: string, options: {
    healthy?: boolean;
    maxLoad?: number;
    limit?: number;
    environment?: string;
  } = {}): Promise<AgentRegistrationMetadata[]> {
    try {
      const query: ServiceDiscoveryQuery = {
        agentType,
        healthyOnly: options.healthy ?? true,
        maxLoad: options.maxLoad,
        limit: options.limit,
        environment: options.environment || this.config.environment,
        sortBy: 'load',
        sortOrder: 'asc'
      };

      const result = await this.client.discoverAgents(query);
      return result.agents;
      
    } catch (error) {
      console.error(`Failed to find agents of type ${agentType}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Find agents with specific capabilities
   */
  async findCapableAgents(capabilities: string[], options: {
    healthy?: boolean;
    maxLoad?: number;
    limit?: number;
  } = {}): Promise<AgentRegistrationMetadata[]> {
    try {
      const query: ServiceDiscoveryQuery = {
        capabilities,
        healthyOnly: options.healthy ?? true,
        maxLoad: options.maxLoad,
        limit: options.limit,
        environment: this.config.environment,
        sortBy: 'load',
        sortOrder: 'asc'
      };

      const result = await this.client.discoverAgents(query);
      return result.agents;
      
    } catch (error) {
      console.error(`Failed to find agents with capabilities [${capabilities.join(', ')}]: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get the best available agent for a specific type
   */
  async getBestAgent(agentType: string, options: {
    maxLoad?: number;
    maxResponseTime?: number;
    maxErrorRate?: number;
  } = {}): Promise<AgentRegistrationMetadata | null> {
    try {
      const agents = await this.findAgents(agentType, {
        healthy: true,
        maxLoad: options.maxLoad || 80,
        limit: 1
      });

      if (agents.length > 0) {
        const agent = agents[0];
        
        // Additional filtering
        if (options.maxResponseTime && agent.currentMetrics.averageResponseTime > options.maxResponseTime) {
          return null;
        }
        
        if (options.maxErrorRate && agent.currentMetrics.errorRate > options.maxErrorRate) {
          return null;
        }
        
        return agent;
      }

      return null;
      
    } catch (error) {
      console.error(`Failed to get best agent of type ${agentType}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Report health status
   */
  async reportHealth(status: AgentStatus = 'healthy', metadata?: Record<string, any>): Promise<void> {
    try {
      await this.client.reportHealth(status, metadata);
    } catch (error) {
      console.error(`Failed to report health status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update agent load metrics
   */
  async updateLoad(load: number, metrics?: {
    responseTime?: number;
    errorRate?: number;
    queueLength?: number;
  }): Promise<void> {
    try {
      if (!this.agentMetadata) {
        throw new Error('Agent not registered');
      }

      const update = {
        agentId: this.agentMetadata.agentId,
        lastHeartbeat: new Date().toISOString(),
        currentMetrics: {
          ...this.agentMetadata.currentMetrics,
          currentLoad: Math.max(0, Math.min(100, load)), // Clamp to 0-100
          averageResponseTime: metrics?.responseTime ?? this.agentMetadata.currentMetrics.averageResponseTime,
          errorRate: metrics?.errorRate ?? this.agentMetadata.currentMetrics.errorRate,
          queueLength: metrics?.queueLength ?? this.agentMetadata.currentMetrics.queueLength,
          lastUpdated: new Date().toISOString()
        }
      };

      await this.client.updateAgent(update);
      
    } catch (error) {
      console.error(`Failed to update load metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get information about a specific agent
   */
  async getAgent(agentId: string): Promise<AgentRegistrationMetadata | null> {
    try {
      return await this.client.getAgent(agentId);
    } catch (error) {
      console.error(`Failed to get agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Get client metrics and statistics
   */
  getMetrics() {
    return this.client.getMetrics();
  }

  /**
   * Check if the service discovery system is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Try a simple discovery query to test the system
      await this.client.discoverAgents({ limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async stop(reason?: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.log(`Stopping agent service for ${this.config.agentType}...`);
    
    try {
      // Stop health reporting
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      // Auto-deregister if enabled
      if (this.options.autoDeregisterOnShutdown) {
        await this.deregister(reason || 'Agent shutdown');
      }
      
      // Shutdown client
      await this.client.shutdown();
      
      console.log(`Agent service stopped successfully for ${this.config.agentType}`);
      
    } catch (error) {
      console.error(`Error during agent service shutdown: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods

  private createServiceDiscoveryClient(): ServiceDiscoveryClient {
    // Parse registry URL
    const url = new URL(this.options.registryUrl);
    
    let clientConfig;
    
    if (this.options.registryType === 'redis') {
      clientConfig = createServiceDiscoveryConfig({
        backend: 'redis',
        redis: {
          redis: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            keyPrefix: 'uep:registry'
          },
          healthCheck: {
            interval: this.options.healthCheckInterval,
            timeout: this.options.healthCheckTimeout,
            retries: 3,
            deregistrationDelay: 60000
          },
          heartbeat: {
            interval: 15000,
            ttl: 60
          }
        },
        client: {
          autoRegister: false, // We handle this manually
          autoDeregister: false, // We handle this manually
          enableHealthReporting: false, // We handle this manually
          enableMetrics: true,
          retryAttempts: this.options.retryAttempts,
          retryDelay: 1000,
          cacheEnabled: this.options.enableDiscoveryCache,
          cacheTtl: this.options.discoveryCacheTtl,
          circuitBreakerEnabled: this.options.circuitBreakerEnabled,
          circuitBreakerThreshold: 5,
          circuitBreakerTimeout: 60000
        }
      });
    } else {
      throw new Error(`Unsupported registry type: ${this.options.registryType}`);
    }

    return new ServiceDiscoveryClient(clientConfig);
  }

  private buildAgentMetadata(): AgentRegistrationMetadata {
    const now = new Date().toISOString();
    const agentId = `${this.config.agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Parse version string
    const version = this.parseVersion(this.config.version || '1.0.0');

    return {
      agentId,
      agentName: this.config.agentName || `${this.config.agentType} Agent`,
      agentType: this.config.agentType,
      instanceId: agentId,
      
      version,
      
      capabilities: this.config.capabilities.map(name => ({
        name,
        version: this.config.version || '1.0.0',
        description: `${name} capability`
      })),
      
      supportedProtocols: ['UEP/2.0', 'HTTP/1.1'],
      
      network: {
        address: this.config.host,
        port: this.config.port,
        protocol: 'http',
        tlsEnabled: false,
        healthCheckPort: this.config.port
      },
      
      resources: {
        cpu: { min: '100m', max: '1000m', preferred: '500m' },
        memory: { min: '256Mi', max: '2Gi', preferred: '1Gi' }
      },
      
      currentMetrics: {
        currentLoad: 0,
        maxCapacity: 100,
        averageResponseTime: 50,
        errorRate: 0,
        queueLength: 0,
        lastUpdated: now
      },
      
      healthCheck: {
        endpoint: this.config.healthEndpoint || '/health',
        method: 'GET',
        interval: `${this.options.healthCheckInterval / 1000}s`,
        timeout: `${this.options.healthCheckTimeout / 1000}s`,
        failureThreshold: 3,
        successThreshold: 1,
        expectedStatus: 200
      },
      
      monitoring: {
        metricsEnabled: true,
        metricsEndpoint: this.config.metricsEndpoint || '/metrics',
        metricsFormat: 'prometheus',
        tracingEnabled: false,
        loggingLevel: 'info',
        healthMetrics: true
      },
      
      security: {
        tlsRequired: false,
        encryptionEnabled: false,
        auditLogging: false
      },
      
      environment: this.config.environment || 'development',
      cluster: this.config.cluster || 'default',
      namespace: this.config.namespace || 'uep',
      podName: process.env.HOSTNAME || `${this.config.agentType}-pod`,
      nodeName: process.env.NODE_NAME || 'unknown',
      
      startTime: now,
      lastHeartbeat: now,
      registrationTime: now,
      status: 'healthy',
      
      configuration: {
        autoHealthReporting: this.options.autoHealthReporting,
        healthCheckInterval: this.options.healthCheckInterval
      },
      
      featureFlags: {
        enableMetrics: true,
        enableTracing: false
      },
      
      labels: {
        'agent-type': this.config.agentType,
        'version': this.config.version || '1.0.0',
        'environment': this.config.environment || 'development',
        ...this.config.labels
      },
      
      annotations: {
        'service-discovery.uep.io/managed-by': 'AgentServiceHelper',
        'service-discovery.uep.io/created-at': now,
        ...this.config.annotations
      }
    };
  }

  private parseVersion(versionStr: string) {
    const parts = versionStr.split('.');
    return {
      major: parseInt(parts[0]) || 1,
      minor: parseInt(parts[1]) || 0,
      patch: parseInt(parts[2]) || 0,
      build: process.env.BUILD_NUMBER,
      gitCommit: process.env.GIT_COMMIT
    };
  }

  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      console.error(`Service discovery error: ${error.message}`);
    });

    this.client.on('agentRegistered', () => {
      console.log(`Agent ${this.config.agentType} registered with service discovery`);
    });

    this.client.on('agentDeregistered', () => {
      console.log(`Agent ${this.config.agentType} deregistered from service discovery`);
    });
  }

  private setupShutdownHandlers(): void {
    const shutdown = (signal: string) => {
      console.log(`Received ${signal}, shutting down agent service...`);
      this.stop(`Process ${signal}`).catch(console.error);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('beforeExit', () => shutdown('beforeExit'));
  }

  private startHealthReporting(): void {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.reportHealth('healthy');
      }
    }, this.options.healthCheckInterval);
  }
}

// Convenience factory for creating agent helpers
export function createAgentHelper(config: AgentConfig, options?: AgentServiceOptions): AgentServiceHelper {
  return new AgentServiceHelper(config, options);
}

// Express.js middleware for automatic health endpoint creation
export function createHealthEndpoint() {
  return (req: any, res: any) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(health);
  };
}

// Express.js middleware for automatic metrics endpoint
export function createMetricsEndpoint(agentHelper: AgentServiceHelper) {
  return (req: any, res: any) => {
    const metrics = agentHelper.getMetrics();
    
    // Convert to Prometheus format
    const prometheusMetrics = [
      `# HELP agent_registration_attempts_total Total number of registration attempts`,
      `# TYPE agent_registration_attempts_total counter`,
      `agent_registration_attempts_total ${metrics.registrationAttempts}`,
      ``,
      `# HELP agent_registration_successes_total Total number of successful registrations`,
      `# TYPE agent_registration_successes_total counter`, 
      `agent_registration_successes_total ${metrics.registrationSuccesses}`,
      ``,
      `# HELP agent_discovery_queries_total Total number of discovery queries`,
      `# TYPE agent_discovery_queries_total counter`,
      `agent_discovery_queries_total ${metrics.discoveryQueries}`,
      ``,
      `# HELP agent_uptime_seconds Agent uptime in seconds`,
      `# TYPE agent_uptime_seconds gauge`,
      `agent_uptime_seconds ${Math.floor(metrics.uptime / 1000)}`
    ].join('\n');
    
    res.set('Content-Type', 'text/plain');
    res.send(prometheusMetrics);
  };
}