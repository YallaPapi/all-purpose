/**
 * Consul Service Registry Implementation
 * Task 220.4: Service Registration, Health Checking, and Deregistration Patterns
 */

import Consul from 'consul';
import { EventEmitter } from 'events';
import {
  AgentRegistrationMetadata,
  AgentRegistrationUpdate,
  AgentRegistrationEvent,
  ServiceDiscoveryQuery,
  ServiceDiscoveryResult,
  ConsulServiceRegistration,
  convertToConsulRegistration,
  AgentStatus
} from './types/AgentRegistration.js';
import { validator, ValidationResult } from './utils/validation.js';

export interface ConsulConfig {
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
}

export interface RegistryEvents {
  agentRegistered: [AgentRegistrationMetadata];
  agentDeregistered: [string];
  agentUpdated: [string, AgentRegistrationUpdate];
  healthCheckFailed: [string, Error];
  healthCheckPassed: [string];
  discoveryQuery: [ServiceDiscoveryQuery, ServiceDiscoveryResult];
  error: [Error];
}

export class ConsulServiceRegistry extends EventEmitter {
  private consul: Consul.Consul;
  private registeredAgents: Map<string, AgentRegistrationMetadata> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private config: ConsulConfig;

  constructor(config: ConsulConfig) {
    super();
    this.config = config;
    this.consul = new Consul({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ca: config.ca,
      cert: config.cert,
      key: config.key,
      promisify: config.promisify,
      defaults: config.defaults
    });
  }

  /**
   * Register an agent with the service registry
   */
  async registerAgent(metadata: AgentRegistrationMetadata): Promise<void> {
    // Validate registration data
    const validationResult = validator.validateRegistration(metadata);
    if (!validationResult.valid) {
      const error = new Error(`Agent registration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      this.emit('error', error);
      throw error;
    }

    try {
      // Convert to Consul registration format
      const consulRegistration = convertToConsulRegistration(metadata);
      
      // Validate Consul registration
      const consulValidation = validator.validateConsulRegistration(consulRegistration);
      if (!consulValidation.valid) {
        throw new Error(`Consul registration validation failed: ${consulValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Register with Consul
      await this.consul.agent.service.register(consulRegistration);
      
      // Store metadata locally
      this.registeredAgents.set(metadata.agentId, metadata);
      
      // Start health monitoring
      this.startHealthMonitoring(metadata);
      
      // Start heartbeat updates
      this.startHeartbeatUpdates(metadata);
      
      // Emit registration event
      const event: AgentRegistrationEvent = {
        eventType: 'register',
        agentId: metadata.agentId,
        timestamp: new Date().toISOString(),
        metadata,
        source: 'ConsulServiceRegistry'
      };
      
      this.emit('agentRegistered', metadata);
      
      console.log(`Agent ${metadata.agentId} (${metadata.agentType}) registered successfully`);
      
    } catch (error) {
      const regError = new Error(`Failed to register agent ${metadata.agentId}: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', regError);
      throw regError;
    }
  }

  /**
   * Deregister an agent from the service registry
   */
  async deregisterAgent(agentId: string, reason?: string): Promise<void> {
    try {
      const metadata = this.registeredAgents.get(agentId);
      if (!metadata) {
        throw new Error(`Agent ${agentId} not found in registry`);
      }

      // Deregister from Consul
      await this.consul.agent.service.deregister(agentId);
      
      // Stop monitoring
      this.stopHealthMonitoring(agentId);
      this.stopHeartbeatUpdates(agentId);
      
      // Remove from local storage
      this.registeredAgents.delete(agentId);
      
      // Emit deregistration event
      const event: AgentRegistrationEvent = {
        eventType: 'deregister',
        agentId,
        timestamp: new Date().toISOString(),
        reason,
        source: 'ConsulServiceRegistry'
      };
      
      this.emit('agentDeregistered', agentId);
      
      console.log(`Agent ${agentId} deregistered successfully${reason ? ` (${reason})` : ''}`);
      
    } catch (error) {
      const deregError = new Error(`Failed to deregister agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', deregError);
      throw deregError;
    }
  }

  /**
   * Update agent metadata
   */
  async updateAgent(update: AgentRegistrationUpdate): Promise<void> {
    try {
      const existingMetadata = this.registeredAgents.get(update.agentId);
      if (!existingMetadata) {
        throw new Error(`Agent ${update.agentId} not found in registry`);
      }

      // Validate update
      const validationResult = validator.validateUpdate(update, existingMetadata);
      if (!validationResult.valid) {
        throw new Error(`Agent update validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Merge update with existing metadata
      const updatedMetadata = { ...existingMetadata, ...update };
      
      // Re-register with updated metadata (Consul requires this for metadata changes)
      const consulRegistration = convertToConsulRegistration(updatedMetadata);
      await this.consul.agent.service.register(consulRegistration);
      
      // Update local storage
      this.registeredAgents.set(update.agentId, updatedMetadata);
      
      // Emit update event
      const event: AgentRegistrationEvent = {
        eventType: 'update',
        agentId: update.agentId,
        timestamp: new Date().toISOString(),
        metadata: update,
        previousMetadata: existingMetadata,
        source: 'ConsulServiceRegistry'
      };
      
      this.emit('agentUpdated', update.agentId, update);
      
      console.log(`Agent ${update.agentId} updated successfully`);
      
    } catch (error) {
      const updateError = new Error(`Failed to update agent ${update.agentId}: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', updateError);
      throw updateError;
    }
  }

  /**
   * Discover agents based on query criteria
   */
  async discoverAgents(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    const startTime = Date.now();
    
    try {
      // Build Consul query
      const consulQuery: any = {
        passing: query.healthyOnly !== false
      };
      
      if (query.serviceName) {
        consulQuery.service = query.serviceName;
      }
      
      if (query.tags && query.tags.length > 0) {
        consulQuery.tag = query.tags;
      }

      // Query Consul for services
      let services: any[];
      if (query.serviceName) {
        const result = await this.consul.health.service(consulQuery);
        services = result[1] || [];
      } else {
        // Get all UEP services
        const result = await this.consul.health.service({
          service: 'uep-meta-agent',
          ...consulQuery
        });
        services = result[1] || [];
      }

      // Convert Consul services to agent metadata
      let agents = await this.convertConsulServicesToAgents(services);

      // Apply additional filtering
      agents = this.applyFilters(agents, query);

      // Apply sorting
      if (query.sortBy) {
        agents = this.sortAgents(agents, query.sortBy, query.sortOrder || 'asc');
      }

      // Apply pagination
      const totalCount = agents.length;
      if (query.offset || query.limit) {
        const offset = query.offset || 0;
        const limit = query.limit || agents.length;
        agents = agents.slice(offset, offset + limit);
      }

      const result: ServiceDiscoveryResult = {
        agents,
        totalCount,
        query,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      this.emit('discoveryQuery', query, result);
      
      return result;
      
    } catch (error) {
      const discoveryError = new Error(`Service discovery failed: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('error', discoveryError);
      throw discoveryError;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentRegistrationMetadata | null> {
    try {
      // Try local cache first
      const cached = this.registeredAgents.get(agentId);
      if (cached) {
        return cached;
      }

      // Query Consul directly
      const services = await this.consul.agent.service.list();
      const service = services[agentId];
      
      if (!service) {
        return null;
      }

      return this.convertConsulServiceToAgent(service);
      
    } catch (error) {
      this.emit('error', error as Error);
      return null;
    }
  }

  /**
   * Get all registered agents
   */
  async getAllAgents(): Promise<AgentRegistrationMetadata[]> {
    return Array.from(this.registeredAgents.values());
  }

  /**
   * Perform health check on an agent
   */
  async performHealthCheck(agentId: string): Promise<boolean> {
    try {
      const metadata = this.registeredAgents.get(agentId);
      if (!metadata) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const { network, healthCheck } = metadata;
      const protocol = network.tlsEnabled ? 'https' : 'http';
      const port = network.healthCheckPort || network.port;
      const url = `${protocol}://${network.address}:${port}${healthCheck.endpoint}`;

      // Perform HTTP health check
      const response = await fetch(url, {
        method: healthCheck.method,
        timeout: this.parseTimeToMs(healthCheck.timeout),
        headers: {
          'User-Agent': 'UEP-Service-Registry/2.0'
        }
      });

      const isHealthy = response.status === (healthCheck.expectedStatus || 200);
      
      if (isHealthy) {
        this.emit('healthCheckPassed', agentId);
      } else {
        const error = new Error(`Health check failed: HTTP ${response.status}`);
        this.emit('healthCheckFailed', agentId, error);
      }

      return isHealthy;
      
    } catch (error) {
      const healthError = error instanceof Error ? error : new Error(String(error));
      this.emit('healthCheckFailed', agentId, healthError);
      return false;
    }
  }

  /**
   * Graceful shutdown - deregister all agents
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down service registry...');
    
    const shutdownPromises = Array.from(this.registeredAgents.keys()).map(agentId => 
      this.deregisterAgent(agentId, 'Service registry shutdown')
        .catch(error => console.error(`Failed to deregister agent ${agentId} during shutdown:`, error))
    );
    
    await Promise.all(shutdownPromises);
    
    // Clear all intervals
    this.healthCheckIntervals.forEach(interval => clearInterval(interval));
    this.heartbeatIntervals.forEach(interval => clearInterval(interval));
    
    this.healthCheckIntervals.clear();
    this.heartbeatIntervals.clear();
    this.registeredAgents.clear();
    
    console.log('Service registry shutdown complete');
  }

  // Private helper methods

  private startHealthMonitoring(metadata: AgentRegistrationMetadata): void {
    const intervalMs = this.parseTimeToMs(metadata.healthCheck.interval);
    
    const interval = setInterval(async () => {
      try {
        const isHealthy = await this.performHealthCheck(metadata.agentId);
        
        // Update agent status based on health check
        const currentMetadata = this.registeredAgents.get(metadata.agentId);
        if (currentMetadata) {
          const newStatus: AgentStatus = isHealthy ? 'healthy' : 'unhealthy';
          if (currentMetadata.status !== newStatus) {
            await this.updateAgent({
              agentId: metadata.agentId,
              lastHeartbeat: new Date().toISOString(),
              status: newStatus
            });
          }
        }
      } catch (error) {
        console.error(`Health monitoring error for agent ${metadata.agentId}:`, error);
      }
    }, intervalMs);
    
    this.healthCheckIntervals.set(metadata.agentId, interval);
  }

  private stopHealthMonitoring(agentId: string): void {
    const interval = this.healthCheckIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(agentId);
    }
  }

  private startHeartbeatUpdates(metadata: AgentRegistrationMetadata): void {
    // Update heartbeat every 30 seconds
    const interval = setInterval(async () => {
      try {
        await this.updateAgent({
          agentId: metadata.agentId,
          lastHeartbeat: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Heartbeat update error for agent ${metadata.agentId}:`, error);
      }
    }, 30000);
    
    this.heartbeatIntervals.set(metadata.agentId, interval);
  }

  private stopHeartbeatUpdates(agentId: string): void {
    const interval = this.heartbeatIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(agentId);
    }
  }

  private async convertConsulServicesToAgents(services: any[]): Promise<AgentRegistrationMetadata[]> {
    const agents: AgentRegistrationMetadata[] = [];
    
    for (const service of services) {
      try {
        const agent = await this.convertConsulServiceToAgent(service.Service);
        if (agent) {
          agents.push(agent);
        }
      } catch (error) {
        console.warn(`Failed to convert Consul service to agent:`, error);
      }
    }
    
    return agents;
  }

  private async convertConsulServiceToAgent(service: any): Promise<AgentRegistrationMetadata | null> {
    try {
      // Check if we have this agent in local cache
      const cached = this.registeredAgents.get(service.ID);
      if (cached) {
        return cached;
      }

      // Reconstruct agent metadata from Consul service data
      // This is a simplified version - in production, you might store full metadata in Consul KV
      const metadata: AgentRegistrationMetadata = {
        agentId: service.ID,
        agentName: service.Service,
        agentType: service.Meta?.uep_agent_type || 'unknown',
        instanceId: service.Meta?.pod_name || service.ID,
        
        version: {
          major: 1,
          minor: 0,
          patch: 0
        },
        
        capabilities: service.Meta?.uep_capabilities ? 
          service.Meta.uep_capabilities.split(',').map((name: string) => ({
            name: name.trim(),
            version: '1.0.0',
            description: `Capability: ${name}`
          })) : [],
        
        supportedProtocols: [service.Meta?.uep_protocol_version || 'UEP/2.0'],
        
        network: {
          address: service.Address,
          port: service.Port,
          protocol: service.Meta?.tls_enabled === 'true' ? 'https' : 'http',
          tlsEnabled: service.Meta?.tls_enabled === 'true'
        },
        
        resources: {
          cpu: { min: '100m', max: '500m', preferred: '250m' },
          memory: { min: '256Mi', max: '1Gi', preferred: '512Mi' }
        },
        
        currentMetrics: {
          currentLoad: parseFloat(service.Meta?.current_load || '0'),
          maxCapacity: parseInt(service.Meta?.max_capacity || '10'),
          averageResponseTime: parseFloat(service.Meta?.avg_response_time || '100'),
          errorRate: parseFloat(service.Meta?.error_rate || '0'),
          queueLength: 0,
          lastUpdated: service.Meta?.last_heartbeat || new Date().toISOString()
        },
        
        healthCheck: {
          endpoint: '/health',
          method: 'GET',
          interval: '30s',
          timeout: '5s',
          failureThreshold: 3,
          successThreshold: 1
        },
        
        monitoring: {
          metricsEnabled: true,
          metricsEndpoint: '/metrics',
          metricsFormat: 'prometheus',
          tracingEnabled: false,
          loggingLevel: 'info',
          healthMetrics: true
        },
        
        security: {
          tlsRequired: service.Meta?.tls_enabled === 'true',
          encryptionEnabled: service.Meta?.encryption_enabled === 'true',
          auditLogging: false
        },
        
        environment: service.Meta?.environment || 'production',
        cluster: service.Meta?.cluster || 'unknown',
        namespace: service.Meta?.namespace || 'default',
        podName: service.Meta?.pod_name,
        nodeName: service.Meta?.node_name,
        
        startTime: service.Meta?.start_time || new Date().toISOString(),
        lastHeartbeat: service.Meta?.last_heartbeat || new Date().toISOString(),
        registrationTime: service.Meta?.registration_time || new Date().toISOString(),
        status: 'healthy', // Consul only returns healthy services by default
        
        configuration: {},
        featureFlags: {},
        labels: {},
        annotations: {}
      };
      
      return metadata;
      
    } catch (error) {
      console.error('Failed to convert Consul service to agent metadata:', error);
      return null;
    }
  }

  private applyFilters(agents: AgentRegistrationMetadata[], query: ServiceDiscoveryQuery): AgentRegistrationMetadata[] {
    return agents.filter(agent => {
      // Agent type filter
      if (query.agentType && agent.agentType !== query.agentType) {
        return false;
      }

      // Capabilities filter
      if (query.capabilities && query.capabilities.length > 0) {
        const agentCapabilities = agent.capabilities.map(cap => cap.name);
        const hasRequiredCapabilities = query.capabilities.every(cap => 
          agentCapabilities.includes(cap)
        );
        if (!hasRequiredCapabilities) {
          return false;
        }
      }

      // Environment filter
      if (query.environment && agent.environment !== query.environment) {
        return false;
      }

      // Status filter
      if (query.status && !query.status.includes(agent.status)) {
        return false;
      }

      // Performance filters
      if (query.maxLoad && agent.currentMetrics.currentLoad > query.maxLoad) {
        return false;
      }

      if (query.minCapacity && agent.currentMetrics.maxCapacity < query.minCapacity) {
        return false;
      }

      if (query.maxResponseTime && agent.currentMetrics.averageResponseTime > query.maxResponseTime) {
        return false;
      }

      if (query.maxErrorRate && agent.currentMetrics.errorRate > query.maxErrorRate) {
        return false;
      }

      return true;
    });
  }

  private sortAgents(agents: AgentRegistrationMetadata[], sortBy: string, sortOrder: 'asc' | 'desc'): AgentRegistrationMetadata[] {
    return agents.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'load':
          valueA = a.currentMetrics.currentLoad;
          valueB = b.currentMetrics.currentLoad;
          break;
        case 'response_time':
          valueA = a.currentMetrics.averageResponseTime;
          valueB = b.currentMetrics.averageResponseTime;
          break;
        case 'error_rate':
          valueA = a.currentMetrics.errorRate;
          valueB = b.currentMetrics.errorRate;
          break;
        case 'capacity':
          valueA = a.currentMetrics.maxCapacity;
          valueB = b.currentMetrics.maxCapacity;
          break;
        case 'registration_time':
          valueA = new Date(a.registrationTime).getTime();
          valueB = new Date(b.registrationTime).getTime();
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private parseTimeToMs(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smh])$/);
    if (!match) return 30000; // Default 30 seconds
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers: Record<string, number> = {
      's': 1000,
      'm': 60000,
      'h': 3600000
    };
    
    return value * multipliers[unit];
  }
}

// Export typed event emitter interface
export interface ConsulServiceRegistry {
  on<K extends keyof RegistryEvents>(event: K, listener: (...args: RegistryEvents[K]) => void): this;
  emit<K extends keyof RegistryEvents>(event: K, ...args: RegistryEvents[K]): boolean;
}