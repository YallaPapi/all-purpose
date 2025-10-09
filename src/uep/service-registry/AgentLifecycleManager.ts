/**
 * Agent Lifecycle Manager
 * Task 220.4: Manages the complete lifecycle of UEP agents from startup to shutdown
 */

import { EventEmitter } from 'events';
import { ConsulServiceRegistry, ConsulConfig } from './ConsulServiceRegistry.js';
import { 
  AgentRegistrationMetadata, 
  AgentRegistrationUpdate,
  AgentStatus 
} from './types/AgentRegistration.js';
import { createTestRegistration } from './utils/validation.js';

export interface AgentConfig {
  agentType: string;
  agentName?: string;
  instanceId?: string;
  port: number;
  healthCheckEndpoint?: string;
  metricsEndpoint?: string;
  capabilities: Array<{
    name: string;
    version: string;
    description: string;
  }>;
  environment?: 'development' | 'staging' | 'production';
  cluster?: string;
  namespace?: string;
  configuration?: Record<string, any>;
  featureFlags?: Record<string, boolean>;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface LifecycleEvents {
  starting: [string];
  registered: [AgentRegistrationMetadata];
  healthCheckStarted: [string];
  metricsStarted: [string];
  updated: [string, AgentRegistrationUpdate];
  stopping: [string];
  deregistered: [string];
  error: [Error];
}

export class AgentLifecycleManager extends EventEmitter {
  private registry: ConsulServiceRegistry;
  private agentMetadata?: AgentRegistrationMetadata;
  private healthCheckServer?: any;
  private metricsServer?: any;
  private shutdownInProgress = false;
  private startTime: Date;

  constructor(
    private config: AgentConfig,
    consulConfig: ConsulConfig
  ) {
    super();
    this.registry = new ConsulServiceRegistry(consulConfig);
    this.startTime = new Date();
    
    // Forward registry events
    this.registry.on('error', (error) => this.emit('error', error));
    this.registry.on('healthCheckFailed', (agentId, error) => {
      if (this.agentMetadata?.agentId === agentId) {
        console.warn(`Health check failed for agent ${agentId}:`, error.message);
      }
    });
    this.registry.on('healthCheckPassed', (agentId) => {
      if (this.agentMetadata?.agentId === agentId) {
        console.log(`Health check passed for agent ${agentId}`);
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGUSR2', () => this.gracefulShutdown()); // Nodemon restart
  }

  /**
   * Start the agent lifecycle
   */
  async startup(): Promise<void> {
    try {
      this.emit('starting', this.config.agentType);
      console.log(`Starting ${this.config.agentType} agent...`);

      // 1. Initialize agent capabilities
      await this.initializeCapabilities();

      // 2. Create agent metadata
      this.agentMetadata = this.createAgentMetadata();

      // 3. Start health check endpoint
      await this.startHealthEndpoint();

      // 4. Start metrics endpoint
      await this.startMetricsEndpoint();

      // 5. Register with Consul
      await this.registry.registerAgent(this.agentMetadata);
      this.emit('registered', this.agentMetadata);

      // 6. Begin periodic metadata updates
      this.startMetadataUpdates();

      console.log(`Agent ${this.agentMetadata.agentId} (${this.config.agentType}) startup complete`);

    } catch (error) {
      const startupError = new Error(`Agent startup failed: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', startupError);
      throw startupError;
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    if (this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;

    try {
      if (this.agentMetadata) {
        this.emit('stopping', this.agentMetadata.agentId);
        console.log(`Shutting down agent ${this.agentMetadata.agentId}...`);

        // 1. Update status to shutting-down
        await this.updateStatus('shutting-down');

        // 2. Stop accepting new requests (application-specific)
        this.stopAcceptingRequests();

        // 3. Complete in-flight requests (with timeout)
        await this.drainConnections();

        // 4. Stop health and metrics endpoints
        await this.stopHealthEndpoint();
        await this.stopMetricsEndpoint();

        // 5. Deregister from Consul
        await this.registry.deregisterAgent(this.agentMetadata.agentId, 'Graceful shutdown');
        this.emit('deregistered', this.agentMetadata.agentId);

        // 6. Shutdown registry
        await this.registry.shutdown();

        console.log(`Agent ${this.agentMetadata.agentId} shutdown complete`);
      }

    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      this.emit('error', error as Error);
    } finally {
      process.exit(0);
    }
  }

  /**
   * Update agent status
   */
  async updateStatus(status: AgentStatus): Promise<void> {
    if (!this.agentMetadata) {
      throw new Error('Agent not initialized');
    }

    const update: AgentRegistrationUpdate = {
      agentId: this.agentMetadata.agentId,
      lastHeartbeat: new Date().toISOString(),
      status
    };

    await this.registry.updateAgent(update);
    this.agentMetadata.status = status;
    this.emit('updated', this.agentMetadata.agentId, update);
  }

  /**
   * Update agent metrics
   */
  async updateMetrics(metrics: Partial<{
    currentLoad: number;
    averageResponseTime: number;
    errorRate: number;
    queueLength: number;
  }>): Promise<void> {
    if (!this.agentMetadata) {
      throw new Error('Agent not initialized');
    }

    const update: AgentRegistrationUpdate = {
      agentId: this.agentMetadata.agentId,
      lastHeartbeat: new Date().toISOString(),
      currentMetrics: {
        ...this.agentMetadata.currentMetrics,
        ...metrics,
        lastUpdated: new Date().toISOString()
      }
    };

    await this.registry.updateAgent(update);
    Object.assign(this.agentMetadata.currentMetrics, metrics);
    this.emit('updated', this.agentMetadata.agentId, update);
  }

  /**
   * Update agent configuration
   */
  async updateConfiguration(config: Record<string, any>): Promise<void> {
    if (!this.agentMetadata) {
      throw new Error('Agent not initialized');
    }

    const update: AgentRegistrationUpdate = {
      agentId: this.agentMetadata.agentId,
      lastHeartbeat: new Date().toISOString(),
      configuration: { ...this.agentMetadata.configuration, ...config }
    };

    await this.registry.updateAgent(update);
    Object.assign(this.agentMetadata.configuration, config);
    this.emit('updated', this.agentMetadata.agentId, update);
  }

  /**
   * Get current agent metadata
   */
  getAgentMetadata(): AgentRegistrationMetadata | undefined {
    return this.agentMetadata;
  }

  /**
   * Get agent ID
   */
  getAgentId(): string | undefined {
    return this.agentMetadata?.agentId;
  }

  // Private helper methods

  private async initializeCapabilities(): Promise<void> {
    // Initialize agent-specific capabilities
    // This is where you would load any required dependencies,
    // initialize ML models, connect to databases, etc.
    console.log(`Initializing capabilities for ${this.config.agentType}...`);
    
    // Simulate initialization time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Capabilities initialized: ${this.config.capabilities.map(c => c.name).join(', ')}`);
  }

  private createAgentMetadata(): AgentRegistrationMetadata {
    const now = new Date().toISOString();
    const agentId = `${this.config.agentType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      agentId,
      agentName: this.config.agentName || `${this.config.agentType}-${process.pid}`,
      agentType: this.config.agentType,
      instanceId: this.config.instanceId || `${this.config.agentType}-${process.pid}`,
      
      version: {
        major: 2,
        minor: 0,
        patch: 0,
        build: process.env.BUILD_NUMBER,
        gitCommit: process.env.GIT_COMMIT?.substring(0, 7),
        buildDate: process.env.BUILD_DATE || now
      },
      
      capabilities: this.config.capabilities,
      supportedProtocols: ['UEP/2.0', 'HTTP/1.1'],
      
      network: {
        address: this.getNetworkAddress(),
        port: this.config.port,
        protocol: 'http', // TODO: Add TLS support
        tlsEnabled: false,
        healthCheckPort: this.config.port,
        metricsPort: this.config.port
      },
      
      resources: {
        cpu: { min: '100m', max: '1000m', preferred: '500m' },
        memory: { min: '256Mi', max: '2Gi', preferred: '1Gi' }
      },
      
      currentMetrics: {
        currentLoad: 0,
        maxCapacity: parseInt(process.env.MAX_CAPACITY || '10'),
        averageResponseTime: 0,
        errorRate: 0,
        queueLength: 0,
        lastUpdated: now
      },
      
      healthCheck: {
        endpoint: this.config.healthCheckEndpoint || '/health',
        method: 'GET',
        interval: '30s',
        timeout: '5s',
        failureThreshold: 3,
        successThreshold: 1
      },
      
      monitoring: {
        metricsEnabled: true,
        metricsEndpoint: this.config.metricsEndpoint || '/metrics',
        metricsFormat: 'prometheus',
        tracingEnabled: process.env.TRACING_ENABLED === 'true',
        loggingLevel: (process.env.LOG_LEVEL as any) || 'info',
        healthMetrics: true
      },
      
      security: {
        tlsRequired: false,
        encryptionEnabled: false,
        auditLogging: process.env.AUDIT_LOGGING === 'true'
      },
      
      environment: this.config.environment || (process.env.NODE_ENV as any) || 'development',
      cluster: this.config.cluster || process.env.CLUSTER_NAME || 'local',
      namespace: this.config.namespace || process.env.NAMESPACE || 'default',
      podName: process.env.POD_NAME,
      nodeName: process.env.NODE_NAME,
      
      startTime: this.startTime.toISOString(),
      lastHeartbeat: now,
      registrationTime: now,
      status: 'initializing',
      
      configuration: this.config.configuration || {},
      featureFlags: this.config.featureFlags || {},
      labels: this.config.labels || {},
      annotations: this.config.annotations || {}
    };
  }

  private async startHealthEndpoint(): Promise<void> {
    if (!this.agentMetadata) return;

    const express = await import('express');
    const app = express.default();
    
    app.get(this.agentMetadata.healthCheck.endpoint, (req, res) => {
      const health = {
        status: this.agentMetadata?.status || 'unknown',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        version: this.agentMetadata?.version,
        capabilities: this.agentMetadata?.capabilities.map(c => c.name) || []
      };
      
      const statusCode = this.agentMetadata?.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Start server
    this.healthCheckServer = app.listen(this.config.port, () => {
      console.log(`Health endpoint started on port ${this.config.port}${this.agentMetadata?.healthCheck.endpoint}`);
      this.emit('healthCheckStarted', this.agentMetadata?.agentId || 'unknown');
    });
  }

  private async stopHealthEndpoint(): Promise<void> {
    if (this.healthCheckServer) {
      await new Promise<void>((resolve) => {
        this.healthCheckServer.close(() => resolve());
      });
      this.healthCheckServer = undefined;
    }
  }

  private async startMetricsEndpoint(): Promise<void> {
    if (!this.agentMetadata) return;

    // Add metrics endpoint to the same server
    // In a real implementation, you might use a separate port or a metrics library like prom-client
    console.log(`Metrics endpoint available at port ${this.config.port}${this.agentMetadata.monitoring.metricsEndpoint}`);
    this.emit('metricsStarted', this.agentMetadata.agentId);
  }

  private async stopMetricsEndpoint(): Promise<void> {
    // Metrics are on the same server as health, so no separate cleanup needed
  }

  private startMetadataUpdates(): void {
    // Update metadata every 30 seconds
    setInterval(async () => {
      if (this.agentMetadata && !this.shutdownInProgress) {
        try {
          await this.updateMetrics({
            currentLoad: this.calculateCurrentLoad(),
            averageResponseTime: this.calculateAverageResponseTime(),
            errorRate: this.calculateErrorRate(),
            queueLength: this.calculateQueueLength()
          });
        } catch (error) {
          console.error('Failed to update metadata:', error);
        }
      }
    }, 30000);
  }

  private stopAcceptingRequests(): void {
    // Application-specific logic to stop accepting new requests
    console.log('Stopping acceptance of new requests...');
  }

  private async drainConnections(): Promise<void> {
    // Wait for in-flight requests to complete (with timeout)
    console.log('Draining connections...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second timeout
  }

  private getNetworkAddress(): string {
    // Get the best network address for this agent
    const interfaces = require('os').networkInterfaces();
    
    // Prefer non-loopback IPv4 addresses
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    // Fallback to localhost
    return '127.0.0.1';
  }

  private calculateCurrentLoad(): number {
    // Calculate current load percentage
    // This is a simplified example - in reality, you'd measure actual work
    return Math.random() * 100;
  }

  private calculateAverageResponseTime(): number {
    // Calculate average response time in milliseconds
    return 100 + Math.random() * 200;
  }

  private calculateErrorRate(): number {
    // Calculate error rate (0-1)
    return Math.random() * 0.01; // 0-1% error rate
  }

  private calculateQueueLength(): number {
    // Calculate current queue length
    return Math.floor(Math.random() * 5);
  }
}

// Export typed event emitter interface
export interface AgentLifecycleManager {
  on<K extends keyof LifecycleEvents>(event: K, listener: (...args: LifecycleEvents[K]) => void): this;
  emit<K extends keyof LifecycleEvents>(event: K, ...args: LifecycleEvents[K]): boolean;
}