/**
 * UEP Registry Integration - Service Discovery with UEP Protocol Support
 * Extends the base agent registry with UEP-specific functionality including
 * protocol validation, agent capabilities, service mesh integration, and
 * distributed coordination patterns.
 */

import { AgentRegistration, AgentStatus, HealthCheckResult, CapabilityProvider } from '../agent-registry/AgentRegistration';

export interface UEPAgentRegistration extends AgentRegistration {
  /** UEP-specific protocol information */
  uepProtocol: {
    /** Supported UEP protocol versions */
    supportedVersions: string[];
    /** Current active protocol version */
    activeVersion: string;
    /** Protocol-specific capabilities */
    protocolCapabilities: UEPProtocolCapability[];
    /** Validation rule sets supported by this agent */
    validationRules: string[];
  };
  
  /** Service mesh integration details */
  serviceMesh: {
    /** Namespace where the agent is deployed */
    namespace: string;
    /** Service name in the mesh */
    serviceName: string;
    /** Pod selector labels */
    labels: Record<string, string>;
    /** Circuit breaker configuration */
    circuitBreaker?: CircuitBreakerConfig;
    /** Rate limiting configuration */
    rateLimit?: RateLimitConfig;
  };
  
  /** Agent coordination preferences */
  coordination: {
    /** Preferred communication patterns */
    communicationPatterns: CommunicationPattern[];
    /** Agent dependencies */
    dependencies: AgentDependency[];
    /** Load balancing preferences */
    loadBalancing: LoadBalancingStrategy;
    /** Retry policies */
    retryPolicy: RetryPolicyConfig;
  };
  
  /** Security and authentication */
  security: {
    /** Required authentication methods */
    authMethods: AuthMethod[];
    /** SSL/TLS configuration */
    tls?: TLSConfig;
    /** Allowed origins for CORS */
    allowedOrigins?: string[];
    /** API key requirements */
    apiKeyRequired?: boolean;
  };
}

export interface UEPProtocolCapability {
  /** Capability identifier */
  id: string;
  /** Capability name */
  name: string;
  /** Version of the capability */
  version: string;
  /** Message types supported */
  messageTypes: string[];
  /** Validation requirements */
  validationRequirements: ValidationRequirement[];
  /** Performance characteristics */
  performance: {
    maxThroughput: number;
    averageLatency: number;
    maxConcurrency: number;
  };
}

export interface ValidationRequirement {
  /** Validation rule identifier */
  ruleId: string;
  /** Rule description */
  description: string;
  /** Is this rule mandatory */
  mandatory: boolean;
  /** Rule parameters */
  parameters: Record<string, any>;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  timeoutMs: number;
  resetTimeoutMs: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstSize: number;
  windowSizeMs: number;
}

export type CommunicationPattern = 'request-response' | 'publish-subscribe' | 'streaming' | 'event-driven';

export interface AgentDependency {
  agentId: string;
  dependencyType: 'required' | 'optional' | 'fallback';
  healthCheckEnabled: boolean;
  timeoutMs?: number;
}

export type LoadBalancingStrategy = 'round-robin' | 'weighted' | 'least-connections' | 'random' | 'consistent-hash';

export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export type AuthMethod = 'jwt' | 'mutual-tls' | 'api-key' | 'oauth2';

export interface TLSConfig {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  verifyClient?: boolean;
}

/**
 * UEP Registry Client - Manages agent registration and discovery
 */
export class UEPRegistryClient {
  private registrations: Map<string, UEPAgentRegistration> = new Map();
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(
    private config: UEPRegistryConfig
  ) {}

  /**
   * Register a UEP agent with the registry
   */
  async registerAgent(registration: UEPAgentRegistration): Promise<void> {
    try {
      // Validate UEP protocol compliance
      await this.validateUEPCompliance(registration);
      
      // Register with service registry
      await this.registerWithServiceRegistry(registration);
      
      // Store local registration
      this.registrations.set(registration.id, registration);
      
      // Start health monitoring
      this.startHealthMonitoring(registration);
      
      // Emit registration event
      this.emit('agent-registered', { registration });
      
      console.log(`UEP Agent registered: ${registration.id} (${registration.name})`);
      
    } catch (error) {
      console.error(`Failed to register UEP agent ${registration.id}:`, error);
      throw error;
    }
  }

  /**
   * Deregister a UEP agent from the registry
   */
  async deregisterAgent(agentId: string): Promise<void> {
    try {
      // Stop health monitoring
      this.stopHealthMonitoring(agentId);
      
      // Remove from service registry
      await this.deregisterFromServiceRegistry(agentId);
      
      // Remove local registration
      this.registrations.delete(agentId);
      
      // Emit deregistration event
      this.emit('agent-deregistered', { agentId });
      
      console.log(`UEP Agent deregistered: ${agentId}`);
      
    } catch (error) {
      console.error(`Failed to deregister UEP agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Discover agents by capability
   */
  async discoverAgentsByCapability(capability: string): Promise<UEPAgentRegistration[]> {
    const agents: UEPAgentRegistration[] = [];
    
    for (const registration of this.registrations.values()) {
      if (registration.capabilities.includes(capability) ||
          registration.uepProtocol.protocolCapabilities.some(pc => pc.name === capability)) {
        // Check agent health
        const isHealthy = await this.checkAgentHealth(registration.id);
        if (isHealthy) {
          agents.push(registration);
        }
      }
    }
    
    return agents.sort((a, b) => this.calculateAgentScore(b) - this.calculateAgentScore(a));
  }

  /**
   * Discover agents by UEP protocol version
   */
  async discoverAgentsByProtocolVersion(version: string): Promise<UEPAgentRegistration[]> {
    const agents: UEPAgentRegistration[] = [];
    
    for (const registration of this.registrations.values()) {
      if (registration.uepProtocol.supportedVersions.includes(version)) {
        const isHealthy = await this.checkAgentHealth(registration.id);
        if (isHealthy) {
          agents.push(registration);
        }
      }
    }
    
    return agents;
  }

  /**
   * Get agent load balancing configuration
   */
  getLoadBalancingConfig(agentId: string): LoadBalancingConfig | null {
    const registration = this.registrations.get(agentId);
    if (!registration) return null;

    return {
      strategy: registration.coordination.loadBalancing,
      endpoints: [registration.endpoints.api],
      healthCheck: registration.endpoints.health,
      circuitBreaker: registration.serviceMesh.circuitBreaker,
      rateLimit: registration.serviceMesh.rateLimit,
      retryPolicy: registration.coordination.retryPolicy
    };
  }

  /**
   * Watch for agent status changes
   */
  watchAgentStatus(agentId: string, callback: (status: AgentStatus) => void): () => void {
    const listeners = this.eventListeners.get('status-change') || [];
    const listener = (event: any) => {
      if (event.agentId === agentId) {
        callback(event.status);
      }
    };
    
    listeners.push(listener);
    this.eventListeners.set('status-change', listeners);
    
    // Return unsubscribe function
    return () => {
      const currentListeners = this.eventListeners.get('status-change') || [];
      const index = currentListeners.indexOf(listener);
      if (index > -1) {
        currentListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): UEPRegistryStats {
    const totalAgents = this.registrations.size;
    const healthyAgents = Array.from(this.registrations.values())
      .filter(reg => reg.status === 'healthy').length;
    
    const capabilityCounts = new Map<string, number>();
    const protocolVersionCounts = new Map<string, number>();
    
    for (const registration of this.registrations.values()) {
      // Count capabilities
      for (const capability of registration.capabilities) {
        capabilityCounts.set(capability, (capabilityCounts.get(capability) || 0) + 1);
      }
      
      // Count protocol versions
      for (const version of registration.uepProtocol.supportedVersions) {
        protocolVersionCounts.set(version, (protocolVersionCounts.get(version) || 0) + 1);
      }
    }
    
    return {
      totalAgents,
      healthyAgents,
      unhealthyAgents: totalAgents - healthyAgents,
      capabilities: Object.fromEntries(capabilityCounts),
      protocolVersions: Object.fromEntries(protocolVersionCounts),
      averageResponseTime: this.calculateAverageResponseTime(),
      registryHealth: healthyAgents / totalAgents
    };
  }

  /**
   * Validate UEP protocol compliance
   */
  private async validateUEPCompliance(registration: UEPAgentRegistration): Promise<void> {
    // Validate protocol versions
    if (!registration.uepProtocol.supportedVersions.length) {
      throw new Error('Agent must support at least one UEP protocol version');
    }
    
    // Validate active version is in supported versions
    if (!registration.uepProtocol.supportedVersions.includes(registration.uepProtocol.activeVersion)) {
      throw new Error('Active protocol version must be in supported versions');
    }
    
    // Validate protocol capabilities
    for (const capability of registration.uepProtocol.protocolCapabilities) {
      if (!capability.messageTypes.length) {
        throw new Error(`Protocol capability ${capability.id} must support at least one message type`);
      }
    }
    
    // Validate endpoints are reachable
    await this.validateEndpoints(registration.endpoints);
  }

  /**
   * Validate agent endpoints are reachable
   */
  private async validateEndpoints(endpoints: any): Promise<void> {
    try {
      // Test health endpoint
      const healthResponse = await fetch(endpoints.health, { 
        method: 'GET',
        timeout: 5000 
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Health endpoint returned ${healthResponse.status}`);
      }
      
      // Test API endpoint
      const apiResponse = await fetch(endpoints.api, { 
        method: 'GET',
        timeout: 5000 
      });
      
      if (!apiResponse.ok && apiResponse.status !== 404) {
        throw new Error(`API endpoint returned ${apiResponse.status}`);
      }
      
    } catch (error) {
      throw new Error(`Endpoint validation failed: ${error.message}`);
    }
  }

  /**
   * Register with external service registry (Consul, etcd, etc.)
   */
  private async registerWithServiceRegistry(registration: UEPAgentRegistration): Promise<void> {
    if (this.config.serviceRegistryType === 'consul') {
      await this.registerWithConsul(registration);
    } else if (this.config.serviceRegistryType === 'etcd') {
      await this.registerWithEtcd(registration);
    } else if (this.config.serviceRegistryType === 'kubernetes') {
      await this.registerWithKubernetes(registration);
    }
  }

  /**
   * Register with Consul service registry
   */
  private async registerWithConsul(registration: UEPAgentRegistration): Promise<void> {
    const consulPayload = {
      ID: registration.id,
      Name: registration.serviceMesh.serviceName,
      Tags: [
        ...registration.capabilities,
        ...registration.uepProtocol.supportedVersions.map(v => `uep-${v}`),
        ...(registration.metadata.tags || [])
      ],
      Address: new URL(registration.endpoints.api).hostname,
      Port: parseInt(new URL(registration.endpoints.api).port) || 80,
      Meta: {
        uep_active_version: registration.uepProtocol.activeVersion,
        namespace: registration.serviceMesh.namespace,
        load_balancing: registration.coordination.loadBalancing
      },
      Check: {
        HTTP: registration.endpoints.health,
        Interval: '30s',
        Timeout: '10s'
      }
    };

    // In a real implementation, make HTTP request to Consul API
    console.log('Would register with Consul:', consulPayload);
  }

  /**
   * Register with etcd service registry
   */
  private async registerWithEtcd(registration: UEPAgentRegistration): Promise<void> {
    const etcdKey = `/uep/agents/${registration.id}`;
    const etcdValue = JSON.stringify(registration);

    // In a real implementation, use etcd client
    console.log('Would register with etcd:', { key: etcdKey, value: etcdValue });
  }

  /**
   * Register with Kubernetes service registry
   */
  private async registerWithKubernetes(registration: UEPAgentRegistration): Promise<void> {
    // In Kubernetes, registration is typically handled by the service mesh
    // This would update the service's labels and annotations
    console.log('Would update Kubernetes service:', registration.serviceMesh);
  }

  /**
   * Start health monitoring for an agent
   */
  private startHealthMonitoring(registration: UEPAgentRegistration): void {
    const healthCheck = setInterval(async () => {
      try {
        const isHealthy = await this.checkAgentHealth(registration.id);
        const newStatus: AgentStatus = isHealthy ? 'healthy' : 'unhealthy';
        
        if (registration.status !== newStatus) {
          registration.status = newStatus;
          this.emit('status-change', { agentId: registration.id, status: newStatus });
        }
        
      } catch (error) {
        console.error(`Health check failed for agent ${registration.id}:`, error);
        registration.status = 'unhealthy';
        this.emit('status-change', { agentId: registration.id, status: 'unhealthy' });
      }
    }, this.config.healthCheckInterval || 30000);

    this.healthChecks.set(registration.id, healthCheck);
  }

  /**
   * Stop health monitoring for an agent
   */
  private stopHealthMonitoring(agentId: string): void {
    const healthCheck = this.healthChecks.get(agentId);
    if (healthCheck) {
      clearInterval(healthCheck);
      this.healthChecks.delete(agentId);
    }
  }

  /**
   * Check agent health
   */
  private async checkAgentHealth(agentId: string): Promise<boolean> {
    const registration = this.registrations.get(agentId);
    if (!registration) return false;

    try {
      const response = await fetch(registration.endpoints.health, {
        method: 'GET',
        timeout: 5000
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate agent score for load balancing
   */
  private calculateAgentScore(registration: UEPAgentRegistration): number {
    let score = 0;
    
    // Health status weight
    if (registration.status === 'healthy') score += 100;
    else if (registration.status === 'degraded') score += 50;
    else score += 0;
    
    // Protocol capability weight
    score += registration.uepProtocol.protocolCapabilities.length * 10;
    
    // Load balancing preference (prefer least connections)
    if (registration.coordination.loadBalancing === 'least-connections') score += 20;
    
    return score;
  }

  /**
   * Calculate average response time across all agents
   */
  private calculateAverageResponseTime(): number {
    // Mock implementation - would use real metrics
    return 150; // ms
  }

  /**
   * Remove agent from service registry
   */
  private async deregisterFromServiceRegistry(agentId: string): Promise<void> {
    if (this.config.serviceRegistryType === 'consul') {
      // DELETE /v1/agent/service/deregister/{agentId}
      console.log(`Would deregister from Consul: ${agentId}`);
    } else if (this.config.serviceRegistryType === 'etcd') {
      // Delete key from etcd
      console.log(`Would delete from etcd: /uep/agents/${agentId}`);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }
}

/**
 * UEP Registry Configuration
 */
export interface UEPRegistryConfig {
  serviceRegistryType: 'consul' | 'etcd' | 'kubernetes';
  serviceRegistryEndpoint: string;
  healthCheckInterval?: number;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Load balancing configuration
 */
export interface LoadBalancingConfig {
  strategy: LoadBalancingStrategy;
  endpoints: string[];
  healthCheck: string;
  circuitBreaker?: CircuitBreakerConfig;
  rateLimit?: RateLimitConfig;
  retryPolicy: RetryPolicyConfig;
}

/**
 * Registry statistics
 */
export interface UEPRegistryStats {
  totalAgents: number;
  healthyAgents: number;
  unhealthyAgents: number;
  capabilities: Record<string, number>;
  protocolVersions: Record<string, number>;
  averageResponseTime: number;
  registryHealth: number;
}

/**
 * UEP Registry Factory
 */
export class UEPRegistryFactory {
  private static instance: UEPRegistryClient;

  static createRegistry(config: UEPRegistryConfig): UEPRegistryClient {
    if (!UEPRegistryFactory.instance) {
      UEPRegistryFactory.instance = new UEPRegistryClient(config);
    }
    return UEPRegistryFactory.instance;
  }

  static getInstance(): UEPRegistryClient {
    if (!UEPRegistryFactory.instance) {
      throw new Error('Registry not initialized. Call createRegistry() first.');
    }
    return UEPRegistryFactory.instance;
  }
}

export default UEPRegistryClient;