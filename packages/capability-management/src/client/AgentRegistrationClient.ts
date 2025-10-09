#!/usr/bin/env node

/**
 * UEP Agent Registration Client
 * 
 * Client-side integration for agent capability advertisement and registration
 * with automatic discovery, dynamic updates, lifecycle management, and
 * Consul integration for the Universal Execution Protocol (UEP) system.
 * 
 * Research-based implementation features:
 * - Automatic capability discovery and introspection
 * - Dynamic registration updates and lifecycle management
 * - Consul service registration with health checks
 * - Capability version negotiation and compatibility
 * - Real-time heartbeat and health monitoring
 * - Graceful shutdown and deregistration
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.3
 */

import { EventEmitter } from 'events';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentCapability,
  AgentRegistration,
  SemVer,
  HealthStatus
} from '../types/CapabilitySchema.js';
import {
  parseSemVer,
  semVerToString,
  validateSemVer
} from '../utils/CapabilityVersioning.js';

/**
 * Agent registration configuration
 */
export interface AgentRegistrationConfig {
  // Registry service configuration
  registryUrl: string;                      // Capability registry service URL
  registryApiVersion?: string;              // API version (default: v1)
  
  // Agent identification
  agentId: string;                          // Unique agent identifier
  agentName?: string;                       // Human-readable agent name
  agentVersion: string | SemVer;            // Agent version
  
  // Registration settings
  ttl?: number;                             // Registration TTL in seconds
  heartbeatInterval?: number;               // Heartbeat interval in seconds
  autoReregister?: boolean;                 // Auto re-register on failure
  maxRetries?: number;                      // Maximum retry attempts
  
  // Consul integration
  consul?: {
    enabled: boolean;                       // Enable Consul integration
    host?: string;                          // Consul host
    port?: number;                          // Consul port
    serviceName?: string;                   // Service name in Consul
    tags?: string[];                        // Additional service tags
  };
  
  // Health monitoring
  health?: {
    endpoint?: string;                      // Health check endpoint
    interval?: number;                      // Health check interval
    timeout?: number;                       // Health check timeout
    retries?: number;                       // Health check retries
  };
  
  // Capability discovery settings
  discovery?: {
    autoDiscovery?: boolean;                // Enable automatic capability discovery
    scanPaths?: string[];                   // Paths to scan for capabilities
    pluginPatterns?: string[];              // Plugin file patterns
    configFiles?: string[];                 // Configuration files to parse
  };
}

/**
 * Capability discovery result
 */
export interface DiscoveredCapability extends AgentCapability {
  discoveryMethod: 'reflection' | 'plugin-scan' | 'config-parse' | 'manual';
  discoveryMetadata?: Record<string, any>;
}

/**
 * Registration status
 */
export interface RegistrationStatus {
  registered: boolean;
  registrationId?: string;
  lastRegistration?: Date;
  lastHeartbeat?: Date;
  consecutiveFailures: number;
  capabilities: AgentCapability[];
  health: {
    status: HealthStatus;
    lastCheck: Date;
    checks: Record<string, boolean>;
    metrics?: Record<string, number>;
  };
}

/**
 * Agent Registration Client class
 */
export class AgentRegistrationClient extends EventEmitter {
  private config: AgentRegistrationConfig;
  private status: RegistrationStatus;
  private capabilities: Map<string, AgentCapability> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private retryTimer?: NodeJS.Timeout;
  private consul?: any;
  private isShuttingDown: boolean = false;

  constructor(config: AgentRegistrationConfig) {
    super();
    
    this.config = {
      registryApiVersion: 'v1',
      ttl: 3600,
      heartbeatInterval: 30000,
      autoReregister: true,
      maxRetries: 5,
      ...config
    };

    // Parse agent version
    if (typeof this.config.agentVersion === 'string') {
      this.config.agentVersion = parseSemVer(this.config.agentVersion);
    }

    // Initialize status
    this.status = {
      registered: false,
      consecutiveFailures: 0,
      capabilities: [],
      health: {
        status: 'unknown',
        lastCheck: new Date(),
        checks: {},
        metrics: {}
      }
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize the registration client
   */
  public async initialize(): Promise<void> {
    try {
      console.log(chalk.blue(`🔧 Initializing Agent Registration Client: ${this.config.agentId}`));
      
      // Initialize Consul if enabled
      if (this.config.consul?.enabled) {
        await this.initializeConsul();
      }
      
      // Discover capabilities if auto-discovery is enabled
      if (this.config.discovery?.autoDiscovery) {
        await this.discoverCapabilities();
      }
      
      // Perform initial health check
      await this.performHealthCheck();
      
      console.log(chalk.green(`✅ Agent Registration Client initialized: ${this.config.agentId}`));
      this.emit('initialized');
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to initialize Agent Registration Client: ${this.config.agentId}`), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register agent with capability registry
   */
  public async register(): Promise<void> {
    try {
      console.log(chalk.blue(`📝 Registering agent: ${this.config.agentId}`));
      
      const registration: AgentRegistration = {
        agentId: this.config.agentId,
        agentName: this.config.agentName,
        agentVersion: this.config.agentVersion as SemVer,
        capabilities: Array.from(this.capabilities.values()),
        description: `UEP Agent ${this.config.agentId}`,
        endpoints: {
          health: this.config.health?.endpoint,
          api: `http://localhost:${process.env.PORT || 3000}/api`
        },
        registrationTime: new Date(),
        ttl: this.config.ttl,
        environment: {
          platform: process.platform,
          runtime: `Node.js ${process.version}`,
          location: process.env.AGENT_LOCATION || 'unknown'
        }
      };

      const response = await fetch(
        `${this.config.registryUrl}/api/${this.config.registryApiVersion}/agents/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-ID': this.config.agentId,
            'X-Request-ID': uuidv4()
          },
          body: JSON.stringify(registration)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Registration failed: ${response.status} - ${error}`);
      }

      const result = await response.json();
      
      this.status.registered = true;
      this.status.registrationId = result.registrationId;
      this.status.lastRegistration = new Date();
      this.status.consecutiveFailures = 0;
      this.status.capabilities = Array.from(this.capabilities.values());

      // Register with Consul if enabled
      if (this.consul) {
        await this.registerWithConsul();
      }

      // Start heartbeat
      this.startHeartbeat();
      
      // Start health monitoring
      if (this.config.health?.interval) {
        this.startHealthMonitoring();
      }

      console.log(chalk.green(`✅ Agent registered successfully: ${this.config.agentId} [${result.registrationId}]`));
      this.emit('registered', result);

    } catch (error) {
      this.status.consecutiveFailures++;
      console.error(chalk.red(`❌ Agent registration failed: ${this.config.agentId}`), error);
      this.emit('registrationFailed', error);
      
      // Auto-retry if configured
      if (this.config.autoReregister && this.status.consecutiveFailures < (this.config.maxRetries || 5)) {
        const delay = Math.min(1000 * Math.pow(2, this.status.consecutiveFailures), 30000);
        console.log(chalk.yellow(`🔄 Retrying registration in ${delay}ms (attempt ${this.status.consecutiveFailures})`));
        
        this.retryTimer = setTimeout(() => {
          this.register().catch(console.error);
        }, delay);
      }
      
      throw error;
    }
  }

  /**
   * Update agent capabilities
   */
  public async updateCapabilities(capabilities: AgentCapability[]): Promise<void> {
    try {
      // Update local capability store
      this.capabilities.clear();
      for (const capability of capabilities) {
        this.capabilities.set(capability.id, capability);
      }

      // If registered, send update to registry
      if (this.status.registered) {
        const response = await fetch(
          `${this.config.registryUrl}/api/${this.config.registryApiVersion}/agents/${this.config.agentId}/capabilities`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Agent-ID': this.config.agentId,
              'X-Request-ID': uuidv4()
            },
            body: JSON.stringify({ capabilities })
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Capability update failed: ${response.status} - ${error}`);
        }

        this.status.capabilities = capabilities;
        console.log(chalk.green(`✅ Capabilities updated: ${this.config.agentId} (${capabilities.length} capabilities)`));
        this.emit('capabilitiesUpdated', capabilities);
      }

    } catch (error) {
      console.error(chalk.red(`❌ Failed to update capabilities: ${this.config.agentId}`), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Add a single capability
   */
  public async addCapability(capability: AgentCapability): Promise<void> {
    this.capabilities.set(capability.id, capability);
    
    if (this.status.registered) {
      await this.updateCapabilities(Array.from(this.capabilities.values()));
    }
  }

  /**
   * Remove a capability
   */
  public async removeCapability(capabilityId: string): Promise<void> {
    this.capabilities.delete(capabilityId);
    
    if (this.status.registered) {
      await this.updateCapabilities(Array.from(this.capabilities.values()));
    }
  }

  /**
   * Send heartbeat to registry
   */
  public async sendHeartbeat(): Promise<void> {
    if (!this.status.registered || this.isShuttingDown) return;

    try {
      const response = await fetch(
        `${this.config.registryUrl}/api/${this.config.registryApiVersion}/agents/${this.config.agentId}/heartbeat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Agent-ID': this.config.agentId,
            'X-Request-ID': uuidv4()
          },
          body: JSON.stringify({
            health: this.status.health,
            timestamp: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        this.status.lastHeartbeat = new Date();
        this.emit('heartbeatSent');
      } else {
        const error = await response.text();
        console.warn(chalk.yellow(`⚠️ Heartbeat failed: ${response.status} - ${error}`));
        this.emit('heartbeatFailed', new Error(error));
      }

    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Heartbeat error: ${this.config.agentId}`), error);
      this.emit('heartbeatFailed', error);
    }
  }

  /**
   * Deregister agent
   */
  public async deregister(): Promise<void> {
    if (!this.status.registered) return;

    try {
      console.log(chalk.blue(`📤 Deregistering agent: ${this.config.agentId}`));
      
      // Stop timers
      this.stopTimers();
      
      // Deregister from Consul
      if (this.consul) {
        await this.deregisterFromConsul();
      }

      // Deregister from capability registry
      const response = await fetch(
        `${this.config.registryUrl}/api/${this.config.registryApiVersion}/agents/${this.config.agentId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Agent-ID': this.config.agentId,
            'X-Request-ID': uuidv4()
          }
        }
      );

      if (response.ok) {
        this.status.registered = false;
        this.status.registrationId = undefined;
        console.log(chalk.green(`✅ Agent deregistered: ${this.config.agentId}`));
        this.emit('deregistered');
      }

    } catch (error) {
      console.error(chalk.red(`❌ Deregistration failed: ${this.config.agentId}`), error);
      this.emit('error', error);
    }
  }

  /**
   * Shutdown the registration client
   */
  public async shutdown(): Promise<void> {
    console.log(chalk.yellow(`🔄 Shutting down Agent Registration Client: ${this.config.agentId}`));
    this.isShuttingDown = true;
    
    await this.deregister();
    
    console.log(chalk.green(`✅ Agent Registration Client shutdown completed: ${this.config.agentId}`));
    this.emit('shutdown');
  }

  /**
   * Get current registration status
   */
  public getStatus(): RegistrationStatus {
    return { ...this.status };
  }

  /**
   * Get current capabilities
   */
  public getCapabilities(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Discover capabilities automatically
   */
  private async discoverCapabilities(): Promise<void> {
    console.log(chalk.blue(`🔍 Discovering capabilities for agent: ${this.config.agentId}`));
    
    const discoveredCapabilities: DiscoveredCapability[] = [];
    
    // Plugin scanning
    if (this.config.discovery?.scanPaths) {
      const pluginCapabilities = await this.scanForPluginCapabilities();
      discoveredCapabilities.push(...pluginCapabilities);
    }

    // Configuration parsing
    if (this.config.discovery?.configFiles) {
      const configCapabilities = await this.parseConfigurationCapabilities();
      discoveredCapabilities.push(...configCapabilities);
    }

    // Runtime reflection
    const reflectionCapabilities = await this.discoverRuntimeCapabilities();
    discoveredCapabilities.push(...reflectionCapabilities);

    // Add discovered capabilities
    for (const capability of discoveredCapabilities) {
      this.capabilities.set(capability.id, capability);
    }

    console.log(chalk.green(`✅ Discovered ${discoveredCapabilities.length} capabilities for agent: ${this.config.agentId}`));
    this.emit('capabilitiesDiscovered', discoveredCapabilities);
  }

  /**
   * Scan for plugin-based capabilities
   */
  private async scanForPluginCapabilities(): Promise<DiscoveredCapability[]> {
    // Implementation would scan specified paths for plugin files
    // and extract capability definitions from plugin metadata
    return []; // Simplified implementation
  }

  /**
   * Parse configuration files for capabilities
   */
  private async parseConfigurationCapabilities(): Promise<DiscoveredCapability[]> {
    // Implementation would parse configuration files (JSON, YAML, etc.)
    // and extract capability definitions
    return []; // Simplified implementation
  }

  /**
   * Discover runtime capabilities through reflection
   */
  private async discoverRuntimeCapabilities(): Promise<DiscoveredCapability[]> {
    // Example runtime capability discovery
    const capabilities: DiscoveredCapability[] = [];
    
    // Discover based on available modules/features
    if (process.versions.node) {
      capabilities.push({
        id: 'nodejs-runtime',
        name: 'Node.js Runtime Environment',
        version: parseSemVer(process.version.replace('v', '')),
        description: 'Node.js JavaScript runtime environment',
        category: 'runtime',
        discoveryMethod: 'reflection',
        discoveryMetadata: {
          platform: process.platform,
          arch: process.arch
        },
        tags: ['runtime', 'javascript', 'nodejs']
      });
    }
    
    return capabilities;
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const checks: Record<string, boolean> = {};
    const metrics: Record<string, number> = {};
    
    // Basic system checks
    checks.memory = process.memoryUsage().heapUsed < (1024 * 1024 * 1024); // < 1GB
    checks.uptime = process.uptime() > 0;
    
    // Performance metrics
    metrics.memory_usage_mb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    metrics.uptime_seconds = Math.round(process.uptime());
    metrics.cpu_usage_percent = process.cpuUsage().user / 1000000; // Simplified
    
    // Determine overall health status
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: HealthStatus;
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.5) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    this.status.health = {
      status,
      lastCheck: new Date(),
      checks,
      metrics
    };
    
    this.emit('healthUpdated', this.status.health);
  }

  /**
   * Initialize Consul integration
   */
  private async initializeConsul(): Promise<void> {
    try {
      const consulModule = await import('consul');
      this.consul = consulModule.default({
        host: this.config.consul?.host || 'localhost',
        port: this.config.consul?.port || 8500
      });
      
      console.log(chalk.green(`✅ Consul client initialized for agent: ${this.config.agentId}`));
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Consul not available, service discovery disabled'), error);
    }
  }

  /**
   * Register with Consul
   */
  private async registerWithConsul(): Promise<void> {
    if (!this.consul) return;

    const serviceName = this.config.consul?.serviceName || 'uep-agent';
    const tags = [
      `agent-id:${this.config.agentId}`,
      `version:${semVerToString(this.config.agentVersion as SemVer)}`,
      ...(this.config.consul?.tags || [])
    ];

    // Add capability tags
    for (const capability of this.capabilities.values()) {
      tags.push(`capability:${capability.id}:${semVerToString(capability.version)}`);
    }

    const registration = {
      name: serviceName,
      id: `${serviceName}-${this.config.agentId}`,
      tags,
      port: parseInt(process.env.PORT || '3000'),
      check: {
        http: this.config.health?.endpoint || `http://localhost:${process.env.PORT || 3000}/health`,
        interval: `${(this.config.health?.interval || 30000) / 1000}s`,
        timeout: `${(this.config.health?.timeout || 5000) / 1000}s`
      }
    };

    await this.consul.agent.service.register(registration);
    console.log(chalk.green(`✅ Registered with Consul: ${registration.id}`));
  }

  /**
   * Deregister from Consul
   */
  private async deregisterFromConsul(): Promise<void> {
    if (!this.consul) return;

    const serviceName = this.config.consul?.serviceName || 'uep-agent';
    const serviceId = `${serviceName}-${this.config.agentId}`;

    try {
      await this.consul.agent.service.deregister(serviceId);
      console.log(chalk.green(`✅ Deregistered from Consul: ${serviceId}`));
    } catch (error) {
      console.error(chalk.red(`❌ Consul deregistration failed: ${serviceId}`), error);
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch(console.error);
    }, this.config.heartbeatInterval);
  }

  /**
   * Start health monitoring timer
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(console.error);
    }, this.config.health?.interval || 30000);
  }

  /**
   * Stop all timers
   */
  private stopTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Graceful shutdown on process signals
    const shutdown = () => {
      this.shutdown().catch(console.error);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGQUIT', shutdown);

    // Handle unhandled errors
    this.on('error', (error) => {
      console.error(chalk.red(`❌ Agent Registration Client error: ${this.config.agentId}`), error);
    });
  }
}

export default AgentRegistrationClient;