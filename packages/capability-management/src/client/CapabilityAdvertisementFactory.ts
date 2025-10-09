#!/usr/bin/env node

/**
 * UEP Capability Advertisement Factory
 * 
 * Factory class that simplifies the integration of capability advertisement
 * in agent registration with automatic setup, configuration, and lifecycle management.
 * 
 * Research-based implementation features:
 * - One-line setup for capability advertisement integration
 * - Automatic agent registration and capability discovery
 * - Intelligent configuration with sensible defaults
 * - Comprehensive error handling and recovery
 * - Built-in monitoring and observability
 * - Production-ready lifecycle management
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.3
 */

import chalk from 'chalk';
import { EventEmitter } from 'events';
import {
  AgentCapability,
  SemVer
} from '../types/CapabilitySchema.js';
import { parseSemVer } from '../utils/CapabilityVersioning.js';
import { 
  AgentRegistrationClient,
  AgentRegistrationConfig
} from './AgentRegistrationClient.js';
import {
  AgentCapabilityManager,
  CapabilityManagerConfig
} from './AgentCapabilityManager.js';

/**
 * Factory configuration options
 */
export interface CapabilityAdvertisementConfig {
  // Basic agent information
  agentId?: string;                         // Auto-generated if not provided
  agentName?: string;                       // Defaults to process name
  agentVersion?: string | SemVer;           // Defaults to package.json version
  
  // Registry service
  registryUrl?: string;                     // Defaults to localhost:3001
  
  // Capabilities
  initialCapabilities?: AgentCapability[];  // Initial capabilities to register
  autoDiscovery?: boolean;                  // Enable automatic capability discovery
  
  // Lifecycle management
  autoStart?: boolean;                      // Automatically start registration
  gracefulShutdown?: boolean;               // Enable graceful shutdown handling
  
  // Monitoring and observability
  enableLogging?: boolean;                  // Enable console logging
  enableMetrics?: boolean;                  // Enable performance metrics
  
  // Advanced configuration
  registrationConfig?: Partial<AgentRegistrationConfig>;
  capabilityManagerConfig?: Partial<CapabilityManagerConfig>;
}

/**
 * Factory status information
 */
export interface FactoryStatus {
  initialized: boolean;
  registered: boolean;
  capabilitiesCount: number;
  lastHeartbeat?: Date;
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    lastCheck: Date;
  };
  uptime: number;
}

/**
 * Capability Advertisement Factory class
 */
export class CapabilityAdvertisementFactory extends EventEmitter {
  private config: CapabilityAdvertisementConfig;
  private registrationClient?: AgentRegistrationClient;
  private capabilityManager?: AgentCapabilityManager;
  private startTime: Date = new Date();
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;

  constructor(config: CapabilityAdvertisementConfig = {}) {
    super();
    
    // Apply intelligent defaults
    this.config = this.applyDefaults(config);
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the factory with automatic setup
   */
  public async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        console.warn(chalk.yellow('⚠️ Factory already initialized'));
        return;
      }

      if (this.config.enableLogging) {
        console.log(chalk.blue('🏭 Initializing Capability Advertisement Factory...'));
        console.log(chalk.cyan(`📋 Agent: ${this.config.agentId} v${this.getVersionString()}`));
        console.log(chalk.cyan(`🌐 Registry: ${this.config.registryUrl}`));
      }
      
      // Create registration client
      const registrationConfig = this.buildRegistrationConfig();
      this.registrationClient = new AgentRegistrationClient(registrationConfig);
      
      // Create capability manager
      const managerConfig = this.buildCapabilityManagerConfig();
      this.capabilityManager = new AgentCapabilityManager(this.registrationClient, managerConfig);
      
      // Setup event forwarding
      this.setupEventForwarding();
      
      // Initialize components
      await this.registrationClient.initialize();
      
      // Register initial capabilities
      if (this.config.initialCapabilities) {
        await this.registerInitialCapabilities();
      }
      
      this.isInitialized = true;
      
      if (this.config.enableLogging) {
        console.log(chalk.green('✅ Capability Advertisement Factory initialized'));
      }
      
      this.emit('initialized');
      
      // Auto-start if configured
      if (this.config.autoStart) {
        await this.start();
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize Capability Advertisement Factory:'), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start capability advertisement
   */
  public async start(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (!this.registrationClient) {
        throw new Error('Registration client not initialized');
      }

      if (this.config.enableLogging) {
        console.log(chalk.blue('🚀 Starting capability advertisement...'));
      }
      
      await this.registrationClient.register();
      
      if (this.config.enableLogging) {
        console.log(chalk.green('✅ Capability advertisement started'));
      }
      
      this.emit('started');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start capability advertisement:'), error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop capability advertisement
   */
  public async stop(): Promise<void> {
    try {
      if (this.config.enableLogging) {
        console.log(chalk.yellow('🛑 Stopping capability advertisement...'));
      }
      
      this.isShuttingDown = true;
      
      if (this.registrationClient) {
        await this.registrationClient.shutdown();
      }
      
      if (this.config.enableLogging) {
        console.log(chalk.green('✅ Capability advertisement stopped'));
      }
      
      this.emit('stopped');
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to stop capability advertisement:'), error);
      this.emit('error', error);
    }
  }

  /**
   * Add a capability to the agent
   */
  public async addCapability(capability: AgentCapability): Promise<void> {
    if (!this.capabilityManager) {
      throw new Error('Capability manager not initialized');
    }
    
    await this.capabilityManager.registerCapability(capability);
    
    if (this.config.enableLogging) {
      console.log(chalk.green(`✅ Capability added: ${capability.id} v${capability.version.major}.${capability.version.minor}.${capability.version.patch}`));
    }
  }

  /**
   * Remove a capability from the agent
   */
  public async removeCapability(capabilityId: string): Promise<void> {
    if (!this.capabilityManager) {
      throw new Error('Capability manager not initialized');
    }
    
    await this.capabilityManager.removeCapability(capabilityId);
    
    if (this.config.enableLogging) {
      console.log(chalk.yellow(`🗑️ Capability removed: ${capabilityId}`));
    }
  }

  /**
   * Update a capability
   */
  public async updateCapability(
    capabilityId: string,
    updates: Partial<AgentCapability>,
    versionBump?: 'patch' | 'minor' | 'major'
  ): Promise<void> {
    if (!this.capabilityManager) {
      throw new Error('Capability manager not initialized');
    }
    
    await this.capabilityManager.updateCapability(capabilityId, updates, versionBump);
    
    if (this.config.enableLogging) {
      console.log(chalk.blue(`🔄 Capability updated: ${capabilityId}`));
    }
  }

  /**
   * Record a capability invocation (for performance tracking)
   */
  public recordInvocation(
    capabilityId: string,
    latency: number,
    success: boolean,
    error?: Error
  ): void {
    if (!this.capabilityManager) return;
    
    this.capabilityManager.recordInvocation(capabilityId, latency, success, error);
  }

  /**
   * Get current factory status
   */
  public getStatus(): FactoryStatus {
    const registrationStatus = this.registrationClient?.getStatus();
    
    return {
      initialized: this.isInitialized,
      registered: registrationStatus?.registered || false,
      capabilitiesCount: registrationStatus?.capabilities.length || 0,
      lastHeartbeat: registrationStatus?.lastHeartbeat,
      health: registrationStatus?.health || {
        status: 'unknown',
        lastCheck: new Date()
      },
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    };
  }

  /**
   * Get all registered capabilities
   */
  public getCapabilities(): AgentCapability[] {
    return this.capabilityManager?.getAllCapabilities() || [];
  }

  /**
   * Create a simple factory instance with minimal configuration
   */
  public static createSimple(
    agentId: string,
    capabilities: AgentCapability[],
    registryUrl?: string
  ): CapabilityAdvertisementFactory {
    return new CapabilityAdvertisementFactory({
      agentId,
      initialCapabilities: capabilities,
      registryUrl,
      autoStart: true,
      enableLogging: true,
      enableMetrics: true,
      gracefulShutdown: true
    });
  }

  /**
   * Create a production-ready factory instance
   */
  public static createProduction(config: CapabilityAdvertisementConfig): CapabilityAdvertisementFactory {
    const productionConfig: CapabilityAdvertisementConfig = {
      ...config,
      enableLogging: config.enableLogging !== false,
      enableMetrics: config.enableMetrics !== false,
      gracefulShutdown: config.gracefulShutdown !== false,
      autoDiscovery: config.autoDiscovery !== false,
      registrationConfig: {
        autoReregister: true,
        maxRetries: 10,
        heartbeatInterval: 30000,
        consul: {
          enabled: true
        },
        ...config.registrationConfig
      },
      capabilityManagerConfig: {
        performanceTracking: true,
        autoVersioning: false, // Disabled in production for stability
        dependencyResolution: {
          autoResolve: true,
          conflictStrategy: 'stable'
        },
        ...config.capabilityManagerConfig
      }
    };
    
    return new CapabilityAdvertisementFactory(productionConfig);
  }

  /**
   * Apply intelligent defaults to configuration
   */
  private applyDefaults(config: CapabilityAdvertisementConfig): CapabilityAdvertisementConfig {
    const packageInfo = this.getPackageInfo();
    
    return {
      agentId: config.agentId || `agent-${process.pid}-${Date.now()}`,
      agentName: config.agentName || packageInfo.name || process.title,
      agentVersion: config.agentVersion || packageInfo.version || '1.0.0',
      registryUrl: config.registryUrl || process.env.CAPABILITY_REGISTRY_URL || 'http://localhost:3001',
      initialCapabilities: config.initialCapabilities || [],
      autoDiscovery: config.autoDiscovery !== false,
      autoStart: config.autoStart !== false,
      gracefulShutdown: config.gracefulShutdown !== false,
      enableLogging: config.enableLogging !== false,
      enableMetrics: config.enableMetrics !== false,
      ...config
    };
  }

  /**
   * Build registration client configuration
   */
  private buildRegistrationConfig(): AgentRegistrationConfig {
    const agentVersion = typeof this.config.agentVersion === 'string' 
      ? parseSemVer(this.config.agentVersion) 
      : this.config.agentVersion!;

    return {
      agentId: this.config.agentId!,
      agentName: this.config.agentName,
      agentVersion,
      registryUrl: this.config.registryUrl!,
      autoReregister: true,
      discovery: {
        autoDiscovery: this.config.autoDiscovery
      },
      consul: {
        enabled: process.env.CONSUL_ENABLED === 'true'
      },
      ...this.config.registrationConfig
    };
  }

  /**
   * Build capability manager configuration
   */
  private buildCapabilityManagerConfig(): CapabilityManagerConfig {
    return {
      performanceTracking: this.config.enableMetrics,
      autoVersioning: false, // Conservative default
      dependencyResolution: {
        autoResolve: true
      },
      ...this.config.capabilityManagerConfig
    };
  }

  /**
   * Register initial capabilities
   */
  private async registerInitialCapabilities(): Promise<void> {
    if (!this.config.initialCapabilities || !this.capabilityManager) return;

    for (const capability of this.config.initialCapabilities) {
      await this.capabilityManager.registerCapability(capability);
    }

    if (this.config.enableLogging) {
      console.log(chalk.green(`✅ Registered ${this.config.initialCapabilities.length} initial capabilities`));
    }
  }

  /**
   * Setup event forwarding from components
   */
  private setupEventForwarding(): void {
    if (this.registrationClient) {
      // Forward registration events
      this.registrationClient.on('registered', (data) => {
        this.emit('registered', data);
      });
      
      this.registrationClient.on('deregistered', () => {
        this.emit('deregistered');
      });
      
      this.registrationClient.on('heartbeatSent', () => {
        this.emit('heartbeat');
      });
      
      this.registrationClient.on('error', (error) => {
        this.emit('error', error);
      });
    }
    
    if (this.capabilityManager) {
      // Forward capability events
      this.capabilityManager.on('capabilityRegistered', (event) => {
        this.emit('capabilityAdded', event);
      });
      
      this.capabilityManager.on('capabilityUpdated', (event) => {
        this.emit('capabilityUpdated', event);
      });
      
      this.capabilityManager.on('capabilityRemoved', (event) => {
        this.emit('capabilityRemoved', event);
      });
      
      this.capabilityManager.on('performanceWarning', (warning) => {
        this.emit('performanceWarning', warning);
      });
      
      this.capabilityManager.on('error', (error) => {
        this.emit('error', error);
      });
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Graceful shutdown handling
    if (this.config.gracefulShutdown) {
      const shutdown = async (signal: string) => {
        if (this.isShuttingDown) return;
        
        if (this.config.enableLogging) {
          console.log(chalk.yellow(`\n🔄 Received ${signal}, shutting down gracefully...`));
        }
        
        try {
          await this.stop();
          process.exit(0);
        } catch (error) {
          console.error(chalk.red('❌ Error during graceful shutdown:'), error);
          process.exit(1);
        }
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    }
    
    // Error handling
    this.on('error', (error) => {
      if (this.config.enableLogging) {
        console.error(chalk.red('❌ Factory error:'), error);
      }
    });
  }

  /**
   * Get package information
   */
  private getPackageInfo(): { name?: string; version?: string } {
    try {
      // Try to read package.json from current working directory
      const fs = require('fs');
      const path = require('path');
      const packagePath = path.join(process.cwd(), 'package.json');
      
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return {
          name: packageJson.name,
          version: packageJson.version
        };
      }
    } catch (error) {
      // Ignore errors and use defaults
    }
    
    return {};
  }

  /**
   * Get version string
   */
  private getVersionString(): string {
    const version = this.config.agentVersion;
    if (typeof version === 'string') {
      return version;
    }
    return `${version!.major}.${version!.minor}.${version!.patch}`;
  }
}

/**
 * Convenience function for quick setup
 */
export function createCapabilityAdvertisement(
  agentId: string,
  capabilities: AgentCapability[],
  registryUrl?: string
): CapabilityAdvertisementFactory {
  return CapabilityAdvertisementFactory.createSimple(agentId, capabilities, registryUrl);
}

/**
 * Convenience function for production setup
 */
export function createProductionCapabilityAdvertisement(
  config: CapabilityAdvertisementConfig
): CapabilityAdvertisementFactory {
  return CapabilityAdvertisementFactory.createProduction(config);
}

export default CapabilityAdvertisementFactory;