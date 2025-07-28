/**
 * Agent Registrar - Core Registration Framework
 * 
 * This module implements the main AgentRegistrar class that provides
 * a standardized framework for agent registration, health reporting,
 * and lifecycle management with service discovery systems.
 */

import { EventEmitter } from 'events';
import {
  AgentRegistration,
  AgentStatus,
  RegistrarConfig,
  HealthCheckResult,
  RegistrarEvents,
  CapabilityProvider
} from './AgentRegistration.js';

/**
 * Main agent registration framework class
 * Implements singleton pattern to ensure consistent registration across the agent
 */
export class AgentRegistrar extends EventEmitter<RegistrarEvents> {
  private static instance: AgentRegistrar | null = null;
  
  private config: RegistrarConfig;
  private isRegistered: boolean = false;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  private shutdownHooks: Array<() => Promise<void>> = [];
  private capabilityProviders: Map<string, CapabilityProvider> = new Map();
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(config: RegistrarConfig) {
    super();
    this.config = this.validateAndNormalizeConfig(config);
    this.setupProcessHandlers();
  }
  
  /**
   * Get or create the singleton instance of AgentRegistrar
   */
  public static getInstance(config?: RegistrarConfig): AgentRegistrar {
    if (!AgentRegistrar.instance) {
      if (!config) {
        throw new Error('Configuration required for first initialization of AgentRegistrar');
      }
      AgentRegistrar.instance = new AgentRegistrar(config);
    }
    return AgentRegistrar.instance;
  }
  
  /**
   * Check if the registrar has been initialized
   */
  public static isInitialized(): boolean {
    return AgentRegistrar.instance !== null;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static reset(): void {
    if (AgentRegistrar.instance) {
      AgentRegistrar.instance.shutdown();
      AgentRegistrar.instance = null;
    }
  }
  
  /**
   * Register the agent with the service registry
   */
  public async register(): Promise<void> {
    try {
      this.updateStatus('starting');
      
      // Update capabilities from providers before registration
      await this.updateCapabilitiesFromProviders();
      
      // Attempt registration with retry logic
      await this.registerWithRetry();
      
      this.isRegistered = true;
      this.retryCount = 0;
      this.updateStatus('healthy');
      
      // Start periodic health reporting
      this.startHealthReporting();
      
      this.emit('registered', { registration: this.config.registration });
      
      console.log(`Agent ${this.config.registration.name} registered successfully with ID: ${this.config.registration.id}`);
      
    } catch (error) {
      this.updateStatus('unhealthy');
      const registrationError = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { error: registrationError, context: 'registration' });
      throw registrationError;
    }
  }
  
  /**
   * Update the agent's health status
   */
  public async updateHealth(healthResult?: HealthCheckResult): Promise<void> {
    try {
      const health = healthResult || await this.performHealthCheck();
      
      // Update registration status based on health check
      this.config.registration.status = health.status;
      
      // Report health to service registry
      await this.reportHealthToRegistry(health);
      
      this.emit('health-updated', { 
        agentId: this.config.registration.id, 
        health 
      });
      
    } catch (error) {
      this.updateStatus('unhealthy');
      const healthError = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { error: healthError, context: 'health-update' });
    }
  }
  
  /**
   * Deregister the agent from the service registry
   */
  public async deregister(): Promise<void> {
    try {
      if (!this.isRegistered) {
        return;
      }
      
      // Stop health reporting
      this.stopHealthReporting();
      
      // Execute shutdown hooks
      await this.executeShutdownHooks();
      
      // Remove from service registry
      await this.deregisterFromRegistry();
      
      this.isRegistered = false;
      this.updateStatus('unhealthy');
      
      this.emit('deregistered', { agentId: this.config.registration.id });
      
      console.log(`Agent ${this.config.registration.name} deregistered successfully`);
      
    } catch (error) {
      const deregistrationError = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { error: deregistrationError, context: 'deregistration' });
      throw deregistrationError;
    }
  }
  
  /**
   * Update the agent's capabilities
   */
  public async updateCapabilities(capabilities: string[]): Promise<void> {
    try {
      const oldCapabilities = [...this.config.registration.capabilities];
      this.config.registration.capabilities = capabilities;
      
      if (this.isRegistered) {
        await this.updateRegistrationInRegistry();
      }
      
      this.emit('capabilities-updated', { 
        agentId: this.config.registration.id, 
        capabilities 
      });
      
      console.log(`Agent capabilities updated from [${oldCapabilities.join(', ')}] to [${capabilities.join(', ')}]`);
      
    } catch (error) {
      const capabilityError = error instanceof Error ? error : new Error(String(error));
      this.emit('error', { error: capabilityError, context: 'capability-update' });
      throw capabilityError;
    }
  }
  
  /**
   * Add a capability provider
   */
  public addCapabilityProvider(provider: CapabilityProvider): void {
    this.capabilityProviders.set(provider.id, provider);
  }
  
  /**
   * Remove a capability provider
   */
  public removeCapabilityProvider(providerId: string): void {
    this.capabilityProviders.delete(providerId);
  }
  
  /**
   * Add a shutdown hook to be executed during deregistration
   */
  public addShutdownHook(hook: () => Promise<void>): void {
    this.shutdownHooks.push(hook);
  }
  
  /**
   * Get current registration information
   */
  public getRegistration(): AgentRegistration {
    return { ...this.config.registration };
  }
  
  /**
   * Check if the agent is currently registered
   */
  public isAgentRegistered(): boolean {
    return this.isRegistered;
  }
  
  /**
   * Graceful shutdown of the registrar
   */
  public async shutdown(): Promise<void> {
    try {
      await this.deregister();
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
  
  /**
   * Validate and normalize the configuration
   */
  private validateAndNormalizeConfig(config: RegistrarConfig): RegistrarConfig {
    if (!config.registryEndpoint) {
      throw new Error('Registry endpoint is required');
    }
    
    if (!config.registration) {
      throw new Error('Agent registration data is required');
    }
    
    if (!config.registration.id || !config.registration.name) {
      throw new Error('Agent ID and name are required');
    }
    
    // Set defaults for optional configuration
    return {
      ...config,
      healthCheckInterval: config.healthCheckInterval || 30000,
      maxRetryAttempts: config.maxRetryAttempts || 5,
      initialRetryDelay: config.initialRetryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 30000,
    };
  }
  
  /**
   * Setup process signal handlers for graceful shutdown
   */
  private setupProcessHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
  }
  
  /**
   * Update agent status and emit events
   */
  private updateStatus(status: AgentStatus): void {
    this.config.registration.status = status;
  }
  
  /**
   * Register with exponential backoff retry logic
   */
  private async registerWithRetry(): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetryAttempts!; attempt++) {
      try {
        await this.registerWithRegistry();
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === this.config.maxRetryAttempts) {
          break; // Last attempt failed
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(
          this.config.initialRetryDelay! * Math.pow(2, attempt),
          this.config.maxRetryDelay!
        );
        
        console.warn(`Registration attempt ${attempt + 1} failed, retrying in ${delay}ms...`, lastError.message);
        await this.sleep(delay);
      }
    }
    
    throw new Error(`Registration failed after ${this.config.maxRetryAttempts} attempts. Last error: ${lastError?.message}`);
  }
  
  /**
   * Start periodic health reporting
   */
  private startHealthReporting(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      await this.updateHealth();
    }, this.config.healthCheckInterval);
  }
  
  /**
   * Stop periodic health reporting
   */
  private stopHealthReporting(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
  
  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    try {
      // Basic health check implementation
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Simple health determination based on memory usage
      let status: AgentStatus = 'healthy';
      if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
        status = 'degraded';
      }
      
      return {
        status,
        timestamp: new Date(),
        details: {
          memory: {
            used: memoryUsage.heapUsed,
            available: memoryUsage.heapTotal - memoryUsage.heapUsed,
            percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
          },
          custom: {
            uptime,
            nodeVersion: process.version
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Update capabilities from registered providers
   */
  private async updateCapabilitiesFromProviders(): Promise<void> {
    const availableCapabilities: string[] = [];
    
    for (const [id, provider] of this.capabilityProviders) {
      if (provider.isAvailable()) {
        availableCapabilities.push(id);
      }
    }
    
    // Merge with existing capabilities
    const existingCapabilities = new Set(this.config.registration.capabilities);
    availableCapabilities.forEach(cap => existingCapabilities.add(cap));
    
    this.config.registration.capabilities = Array.from(existingCapabilities);
  }
  
  /**
   * Execute all registered shutdown hooks
   */
  private async executeShutdownHooks(): Promise<void> {
    for (const hook of this.shutdownHooks) {
      try {
        await hook();
      } catch (error) {
        console.error('Error executing shutdown hook:', error);
      }
    }
  }
  
  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Registry-specific methods (to be implemented based on registry type)
  
  /**
   * Register with the service registry (Consul implementation)
   */
  private async registerWithRegistry(): Promise<void> {
    // TODO: Implement Consul registration logic
    // This will be implemented in the next subtask
    console.log('Registering with service registry...', this.config.registration);
  }
  
  /**
   * Report health status to the service registry
   */
  private async reportHealthToRegistry(health: HealthCheckResult): Promise<void> {
    // TODO: Implement Consul health reporting logic
    console.log('Reporting health to registry...', health);
  }
  
  /**
   * Update registration information in the service registry
   */
  private async updateRegistrationInRegistry(): Promise<void> {
    // TODO: Implement Consul update logic
    console.log('Updating registration in registry...', this.config.registration);
  }
  
  /**
   * Remove registration from the service registry
   */
  private async deregisterFromRegistry(): Promise<void> {
    // TODO: Implement Consul deregistration logic
    console.log('Deregistering from service registry...', this.config.registration.id);
  }
}