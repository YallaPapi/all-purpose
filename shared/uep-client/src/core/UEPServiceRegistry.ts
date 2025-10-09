/**
 * UEP Service Registry
 * 
 * Provides service discovery and registration capabilities for UEP agents,
 * enabling automatic capability discovery and load balancing.
 * 
 * Features:
 * - Automatic service registration and discovery
 * - Health monitoring and status updates
 * - Capability-based routing
 * - Load balancing and failover support
 * - Event-driven updates and notifications
 */

import { EventEmitter } from 'events';
import { 
  UEPServiceEntry, 
  UEPConnectionConfig, 
  UEPCapability,
  UEPHealthStatus
} from './UEPTypes.js';

/**
 * Service Registry Configuration
 */
export interface ServiceRegistryConfig {
  connection: UEPConnectionConfig;
  updateInterval: number;
  healthCheckInterval?: number;
  retentionPeriod?: number;
  enableAutoCleanup?: boolean;
}

/**
 * Service Query Options
 */
export interface ServiceQueryOptions {
  capability?: string;
  agentType?: string;
  version?: string;
  status?: 'healthy' | 'unhealthy' | 'unknown';
  tags?: Record<string, string>;
  region?: string;
  zone?: string;
}

/**
 * Registration Options
 */
export interface RegistrationOptions {
  ttl?: number;
  healthCheckEndpoint?: string;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

/**
 * Service Registry Statistics
 */
export interface RegistryStats {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  registrations: number;
  deregistrations: number;
  queries: number;
  lastUpdate: Date;
}

/**
 * UEP Service Registry Implementation
 */
export class UEPServiceRegistry extends EventEmitter {
  private readonly config: ServiceRegistryConfig;
  private connection: any = null;
  private services = new Map<string, UEPServiceEntry>();
  private subscriptions = new Map<string, any>();
  
  private stats: RegistryStats = {
    totalServices: 0,
    healthyServices: 0,
    unhealthyServices: 0,
    registrations: 0,
    deregistrations: 0,
    queries: 0,
    lastUpdate: new Date()
  };

  private updateInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(config: ServiceRegistryConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the service registry
   */
  async initialize(connection: any): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.connection = connection;

      // Subscribe to service registry updates
      await this.setupRegistrySubscriptions();

      // Start periodic updates
      this.startPeriodicUpdates();

      // Start health checking
      if (this.config.healthCheckInterval) {
        this.startHealthChecking();
      }

      // Load existing services
      await this.loadExistingServices();

      this.initialized = true;
      this.emit('initialized');

    } catch (error) {
      throw new Error(`Failed to initialize service registry: ${error.message}`);
    }
  }

  /**
   * Shutdown the service registry
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // Stop intervals
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Unsubscribe from all subscriptions
      for (const subscription of this.subscriptions.values()) {
        await subscription.unsubscribe();
      }
      this.subscriptions.clear();

      // Clear services
      this.services.clear();

      this.initialized = false;
      this.emit('shutdown');

    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Register a service
   */
  async register(
    service: Omit<UEPServiceEntry, 'registeredAt' | 'lastHealthCheck'>,
    options: RegistrationOptions = {}
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('Service registry not initialized');
    }

    try {
      const fullService: UEPServiceEntry = {
        ...service,
        metadata: {
          ...service.metadata,
          registeredAt: new Date(),
          lastHealthCheck: new Date(),
          ttl: options.ttl,
          ...options.metadata
        },
        tags: options.tags || service.tags
      };

      // Store locally
      this.services.set(service.id, fullService);

      // Publish registration event
      await this.publishServiceEvent('register', fullService);

      this.stats.registrations++;
      this.stats.totalServices = this.services.size;
      this.updateHealthStats();

      this.emit('service-registered', fullService);

    } catch (error) {
      throw new Error(`Failed to register service ${service.id}: ${error.message}`);
    }
  }

  /**
   * Unregister a service
   */
  async unregister(serviceId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Service registry not initialized');
    }

    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    try {
      // Remove locally
      this.services.delete(serviceId);

      // Publish deregistration event
      await this.publishServiceEvent('unregister', service);

      this.stats.deregistrations++;
      this.stats.totalServices = this.services.size;
      this.updateHealthStats();

      this.emit('service-unregistered', service);

    } catch (error) {
      throw new Error(`Failed to unregister service ${serviceId}: ${error.message}`);
    }
  }

  /**
   * Update service health status
   */
  async updateHealth(serviceId: string, status: UEPHealthStatus): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const updatedService: UEPServiceEntry = {
      ...service,
      status: status.status,
      metadata: {
        ...service.metadata,
        lastHealthCheck: new Date(),
        healthDetails: status
      }
    };

    this.services.set(serviceId, updatedService);
    this.updateHealthStats();

    // Publish health update event
    await this.publishServiceEvent('health-update', updatedService);

    this.emit('service-health-updated', updatedService);
  }

  /**
   * Find services by criteria
   */
  async findServices(query: ServiceQueryOptions = {}): Promise<UEPServiceEntry[]> {
    this.stats.queries++;

    const results = Array.from(this.services.values()).filter(service => {
      // Filter by capability
      if (query.capability && !service.capabilities.some(cap => cap.name === query.capability)) {
        return false;
      }

      // Filter by agent type (extract from endpoint)
      if (query.agentType && !service.endpoint.includes(query.agentType)) {
        return false;
      }

      // Filter by version
      if (query.version && service.version !== query.version) {
        return false;
      }

      // Filter by status
      if (query.status && service.status !== query.status) {
        return false;
      }

      // Filter by tags
      if (query.tags && service.tags) {
        for (const [key, value] of Object.entries(query.tags)) {
          if (service.tags[key] !== value) {
            return false;
          }
        }
      }

      // Filter by region
      if (query.region && service.metadata.region !== query.region) {
        return false;
      }

      // Filter by zone
      if (query.zone && service.metadata.zone !== query.zone) {
        return false;
      }

      return true;
    });

    return results.sort((a, b) => {
      // Sort by health status (healthy first), then by registration time
      if (a.status !== b.status) {
        return a.status === 'healthy' ? -1 : 1;
      }
      return b.metadata.registeredAt.getTime() - a.metadata.registeredAt.getTime();
    });
  }

  /**
   * Find services by capability
   */
  async findByCapability(capability: string): Promise<UEPServiceEntry[]> {
    return this.findServices({ capability, status: 'healthy' });
  }

  /**
   * Get a service by ID
   */
  getService(serviceId: string): UEPServiceEntry | null {
    return this.services.get(serviceId) || null;
  }

  /**
   * Get all services
   */
  getAllServices(): UEPServiceEntry[] {
    return Array.from(this.services.values());
  }

  /**
   * Get services by health status
   */
  getServicesByStatus(status: 'healthy' | 'unhealthy' | 'unknown'): UEPServiceEntry[] {
    return Array.from(this.services.values()).filter(service => service.status === status);
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    return { ...this.stats, lastUpdate: new Date() };
  }

  /**
   * Get available capabilities
   */
  getAvailableCapabilities(): UEPCapability[] {
    const capabilities = new Map<string, UEPCapability>();

    for (const service of this.services.values()) {
      if (service.status === 'healthy') {
        for (const capability of service.capabilities) {
          capabilities.set(capability.name, capability);
        }
      }
    }

    return Array.from(capabilities.values());
  }

  /**
   * Select best service for a capability (load balancing)
   */
  async selectService(capability: string, strategy: 'round-robin' | 'random' | 'least-connections' = 'random'): Promise<UEPServiceEntry | null> {
    const services = await this.findByCapability(capability);
    
    if (services.length === 0) {
      return null;
    }

    switch (strategy) {
      case 'random':
        return services[Math.floor(Math.random() * services.length)];
      
      case 'round-robin':
        // Would need to track round-robin state
        return services[0];
      
      case 'least-connections':
        // Would need to track connection counts
        return services[0];
      
      default:
        return services[0];
    }
  }

  /**
   * Private helper methods
   */
  private async setupRegistrySubscriptions(): Promise<void> {
    if (!this.connection) {
      throw new Error('No connection available');
    }

    // Subscribe to service events
    const eventSubject = 'uep.registry.events';
    
    const subscription = await this.connection.subscribe(eventSubject, {
      callback: async (err: Error | null, msg: any) => {
        if (err) {
          this.emit('error', err);
          return;
        }

        try {
          const event = JSON.parse(msg.data);
          await this.handleServiceEvent(event);
        } catch (error) {
          this.emit('error', error);
        }
      }
    });

    this.subscriptions.set('registry-events', subscription);
  }

  private async handleServiceEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'register':
        if (event.service.id !== this.getOwnServiceId()) {
          this.services.set(event.service.id, event.service);
          this.emit('service-discovered', event.service);
        }
        break;

      case 'unregister':
        if (event.service.id !== this.getOwnServiceId()) {
          this.services.delete(event.service.id);
          this.emit('service-removed', event.service);
        }
        break;

      case 'health-update':
        if (event.service.id !== this.getOwnServiceId()) {
          this.services.set(event.service.id, event.service);
          this.emit('service-updated', event.service);
        }
        break;
    }

    this.stats.totalServices = this.services.size;
    this.updateHealthStats();
  }

  private async publishServiceEvent(type: string, service: UEPServiceEntry): Promise<void> {
    if (!this.connection) {
      return;
    }

    const event = {
      type,
      service,
      timestamp: new Date(),
      publisherId: this.getOwnServiceId()
    };

    await this.connection.publish('uep.registry.events', JSON.stringify(event));
  }

  private startPeriodicUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.refreshServices();
      } catch (error) {
        this.emit('error', error);
      }
    }, this.config.updateInterval);
  }

  private startHealthChecking(): void {
    if (!this.config.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.emit('error', error);
      }
    }, this.config.healthCheckInterval);
  }

  private async loadExistingServices(): Promise<void> {
    // In a real implementation, this would query existing services
    // from a persistent store or other registry nodes
  }

  private async refreshServices(): Promise<void> {
    // Remove expired services
    if (this.config.enableAutoCleanup) {
      await this.cleanupExpiredServices();
    }

    // Update statistics
    this.stats.lastUpdate = new Date();
    this.updateHealthStats();
  }

  private async cleanupExpiredServices(): Promise<void> {
    const now = Date.now();
    const retentionPeriod = this.config.retentionPeriod || 300000; // 5 minutes default

    for (const [id, service] of this.services.entries()) {
      const lastSeen = service.metadata.lastHealthCheck.getTime();
      
      if (now - lastSeen > retentionPeriod) {
        this.services.delete(id);
        this.emit('service-expired', service);
      }
    }
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = [];

    for (const service of this.services.values()) {
      if (service.metadata.instance !== this.getOwnInstanceId()) {
        healthCheckPromises.push(this.checkServiceHealth(service));
      }
    }

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkServiceHealth(service: UEPServiceEntry): Promise<void> {
    // In a real implementation, this would perform actual health checks
    // For now, we'll simulate it
    const isHealthy = Math.random() > 0.1; // 90% healthy

    const updatedService: UEPServiceEntry = {
      ...service,
      status: isHealthy ? 'healthy' : 'unhealthy',
      metadata: {
        ...service.metadata,
        lastHealthCheck: new Date()
      }
    };

    this.services.set(service.id, updatedService);
  }

  private updateHealthStats(): void {
    let healthy = 0;
    let unhealthy = 0;

    for (const service of this.services.values()) {
      if (service.status === 'healthy') {
        healthy++;
      } else if (service.status === 'unhealthy') {
        unhealthy++;
      }
    }

    this.stats.healthyServices = healthy;
    this.stats.unhealthyServices = unhealthy;
  }

  private getOwnServiceId(): string {
    // Would return the ID of the current service instance
    return process.env.SERVICE_ID || 'unknown';
  }

  private getOwnInstanceId(): string {
    return process.env.HOSTNAME || 'localhost';
  }
}

export { UEPServiceRegistry };