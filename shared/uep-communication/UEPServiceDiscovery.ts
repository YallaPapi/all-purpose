/**
 * UEP Service Discovery Integration
 * 
 * Integrates UEP communication patterns with the service discovery system,
 * enabling automatic agent discovery, capability advertising, and 
 * intelligent routing for the Meta-Agent Factory.
 */

import { UEPAgentCommunicator } from './UEPAgentCommunication.js';
import { ServiceDiscoveryAdapter } from '../uep-registry/ServiceDiscoveryAdapter.js';
import { AgentRegistrar } from '../agent-registry/AgentRegistrar.js';
import { AgentRegistration } from '../agent-registry/AgentRegistration.js';

export interface UEPServiceDiscoveryConfig {
  registryUrl: string;
  agentId: string;
  agentType: 'meta' | 'domain';
  capabilities: string[];
  healthCheckInterval: number;
  discoveryRefreshInterval: number;
  autoRegister: boolean;
}

export interface DiscoveredAgent {
  id: string;
  type: 'meta' | 'domain';
  capabilities: string[];
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastSeen: Date;
  metadata: any;
}

export interface CapabilityQuery {
  capability: string;
  agentType?: 'meta' | 'domain';
  excludeAgents?: string[];
  loadBalancing?: 'round-robin' | 'least-connections' | 'random';
}

/**
 * UEP Service Discovery Manager
 * Manages agent registration, discovery, and capability-based routing
 */
export class UEPServiceDiscoveryManager {
  private config: UEPServiceDiscoveryConfig;
  private communicator: UEPAgentCommunicator;
  private serviceAdapter: ServiceDiscoveryAdapter;
  private registrar: AgentRegistrar;
  private discoveredAgents: Map<string, DiscoveredAgent> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private discoveryTimer: NodeJS.Timeout | null = null;

  constructor(
    config: UEPServiceDiscoveryConfig,
    communicator: UEPAgentCommunicator
  ) {
    this.config = config;
    this.communicator = communicator;
    this.serviceAdapter = new ServiceDiscoveryAdapter(config.registryUrl);
    
    // Initialize agent registrar
    this.registrar = AgentRegistrar.getInstance({
      agentId: config.agentId,
      agentType: config.agentType,
      registryUrl: config.registryUrl,
      capabilities: config.capabilities,
      healthCheckInterval: config.healthCheckInterval,
      metadata: {
        uepEnabled: true,
        communicationPatterns: ['request-reply', 'pub-sub', 'queue']
      }
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize service discovery with auto-registration
   */
  async initialize(): Promise<void> {
    console.log(`UEP Service Discovery: Initializing for agent ${this.config.agentId}`);

    // Auto-register if enabled
    if (this.config.autoRegister) {
      await this.registerSelf();
    }

    // Start periodic discovery refresh
    this.startDiscoveryRefresh();

    // Start health monitoring
    this.startHealthMonitoring();

    // Perform initial discovery
    await this.refreshDiscoveredAgents();

    console.log(`UEP Service Discovery: Initialized successfully`);
  }

  /**
   * Register this agent with the service registry
   */
  async registerSelf(): Promise<void> {
    try {
      const registration: AgentRegistration = {
        id: this.config.agentId,
        type: this.config.agentType,
        capabilities: this.config.capabilities,
        endpoint: `uep://${this.config.agentId}`,
        status: 'healthy',
        metadata: {
          uepEnabled: true,
          lastRegistration: new Date(),
          communicationPatterns: ['request-reply', 'pub-sub', 'queue'],
          version: '1.0.0'
        }
      };

      await this.registrar.register(registration);
      console.log(`UEP Service Discovery: Registered agent ${this.config.agentId}`);

      // Publish registration event via UEP
      await this.communicator.publishEvent('agent-registered', {
        agentId: this.config.agentId,
        capabilities: this.config.capabilities,
        timestamp: new Date()
      }, { tags: ['discovery', 'registration'] });

    } catch (error) {
      console.error('UEP Service Discovery: Registration failed:', error);
      throw error;
    }
  }

  /**
   * Discover agents by capability
   */
  async discoverAgentsByCapability(query: CapabilityQuery): Promise<DiscoveredAgent[]> {
    const agents = Array.from(this.discoveredAgents.values()).filter(agent => {
      // Filter by capability
      if (!agent.capabilities.includes(query.capability)) {
        return false;
      }

      // Filter by agent type if specified
      if (query.agentType && agent.type !== query.agentType) {
        return false;
      }

      // Exclude specified agents
      if (query.excludeAgents && query.excludeAgents.includes(agent.id)) {
        return false;
      }

      // Only include healthy agents
      return agent.status === 'healthy';
    });

    // Apply load balancing strategy
    return this.applyLoadBalancing(agents, query.loadBalancing || 'round-robin');
  }

  /**
   * Get the best agent for a specific capability
   */
  async getBestAgentForCapability(capability: string, agentType?: 'meta' | 'domain'): Promise<DiscoveredAgent | null> {
    const agents = await this.discoverAgentsByCapability({
      capability,
      agentType,
      loadBalancing: 'least-connections'
    });

    return agents.length > 0 ? agents[0] : null;
  }

  /**
   * Request with automatic agent discovery
   */
  async requestWithDiscovery(
    capability: string,
    method: string,
    data: any,
    options?: {
      agentType?: 'meta' | 'domain';
      timeout?: number;
      retryOnFailure?: boolean;
    }
  ): Promise<any> {
    // Discover appropriate agent
    const agent = await this.getBestAgentForCapability(capability, options?.agentType);
    
    if (!agent) {
      throw new Error(`No healthy agents found with capability: ${capability}`);
    }

    try {
      // Make request to discovered agent
      const response = await this.communicator.request(
        agent.id,
        method,
        data,
        {
          timeout: options?.timeout,
          priority: 'normal'
        }
      );

      // Update agent health based on successful response
      this.updateAgentHealth(agent.id, 'healthy');
      return response;

    } catch (error) {
      // Update agent health on failure
      this.updateAgentHealth(agent.id, 'unhealthy');

      // Retry with different agent if enabled
      if (options?.retryOnFailure) {
        const alternateAgent = await this.getBestAgentForCapability(
          capability,
          options?.agentType
        );

        if (alternateAgent && alternateAgent.id !== agent.id) {
          console.log(`Retrying request with alternate agent: ${alternateAgent.id}`);
          return await this.communicator.request(
            alternateAgent.id,
            method,
            data,
            { timeout: options?.timeout }
          );
        }
      }

      throw error;
    }
  }

  /**
   * Publish event with capability-based targeting
   */
  async publishToCapability(
    capability: string,
    eventType: string,
    data: any,
    options?: {
      agentType?: 'meta' | 'domain';
      excludeSelf?: boolean;
    }
  ): Promise<void> {
    // Discover agents with the capability
    const agents = await this.discoverAgentsByCapability({
      capability,
      agentType: options?.agentType,
      excludeAgents: options?.excludeSelf ? [this.config.agentId] : undefined
    });

    if (agents.length === 0) {
      console.warn(`No agents found with capability: ${capability}`);
      return;
    }

    // Publish targeted event
    await this.communicator.publishEvent(eventType, {
      ...data,
      targetCapability: capability,
      targetAgents: agents.map(a => a.id)
    }, {
      tags: ['capability-targeted', capability]
    });

    console.log(`Published event ${eventType} to ${agents.length} agents with capability ${capability}`);
  }

  /**
   * Get all discovered agents
   */
  getDiscoveredAgents(): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values());
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: 'meta' | 'domain'): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values())
      .filter(agent => agent.type === type);
  }

  /**
   * Get capabilities index
   */
  getCapabilitiesIndex(): Map<string, string[]> {
    const index = new Map<string, string[]>();
    
    for (const [capability, agentIds] of this.capabilityIndex.entries()) {
      index.set(capability, Array.from(agentIds));
    }
    
    return index;
  }

  /**
   * Refresh discovered agents from registry
   */
  private async refreshDiscoveredAgents(): Promise<void> {
    try {
      // Get all registered agents from service discovery
      const registrations = await this.serviceAdapter.discoverServices({
        healthyOnly: false // Include all for health tracking
      });

      // Clear current discovery state
      this.discoveredAgents.clear();
      this.capabilityIndex.clear();

      // Process discovered agents
      for (const registration of registrations) {
        const agent: DiscoveredAgent = {
          id: registration.id,
          type: registration.type as 'meta' | 'domain',
          capabilities: registration.capabilities || [],
          endpoint: registration.endpoint,
          status: registration.status === 'healthy' ? 'healthy' : 'unhealthy',
          lastSeen: new Date(registration.lastSeen || Date.now()),
          metadata: registration.metadata || {}
        };

        this.discoveredAgents.set(agent.id, agent);

        // Update capability index
        for (const capability of agent.capabilities) {
          if (!this.capabilityIndex.has(capability)) {
            this.capabilityIndex.set(capability, new Set());
          }
          this.capabilityIndex.get(capability)!.add(agent.id);
        }
      }

      console.log(`UEP Service Discovery: Refreshed ${this.discoveredAgents.size} agents`);

    } catch (error) {
      console.error('UEP Service Discovery: Failed to refresh agents:', error);
    }
  }

  /**
   * Update agent health status
   */
  private updateAgentHealth(agentId: string, status: 'healthy' | 'unhealthy'): void {
    const agent = this.discoveredAgents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastSeen = new Date();
      this.discoveredAgents.set(agentId, agent);
    }
  }

  /**
   * Apply load balancing strategy
   */
  private applyLoadBalancing(
    agents: DiscoveredAgent[], 
    strategy: 'round-robin' | 'least-connections' | 'random'
  ): DiscoveredAgent[] {
    switch (strategy) {
      case 'random':
        return agents.sort(() => Math.random() - 0.5);
      
      case 'least-connections':
        // Simple implementation - in real system would track actual connections
        return agents.sort((a, b) => {
          const aLastSeen = a.lastSeen.getTime();
          const bLastSeen = b.lastSeen.getTime();
          return bLastSeen - aLastSeen; // More recently seen = fewer connections
        });
      
      case 'round-robin':
      default:
        return agents; // Simple round-robin by maintaining order
    }
  }

  /**
   * Setup event handlers for discovery events
   */
  private setupEventHandlers(): void {
    // Listen for agent registration events
    this.communicator.subscribeToEvents(['agent-registered', 'agent-deregistered'], async (event) => {
      console.log(`UEP Service Discovery: Received ${event.eventType} event from ${event.from}`);
      
      // Refresh discovery when agents register/deregister
      if (event.from !== this.config.agentId) {
        await this.refreshDiscoveredAgents();
      }
    });

    // Handle registrar events
    this.registrar.on('registered', () => {
      console.log('UEP Service Discovery: Agent registered successfully');
    });

    this.registrar.on('deregistered', () => {
      console.log('UEP Service Discovery: Agent deregistered');
    });

    this.registrar.on('health-check-failed', (error) => {
      console.warn('UEP Service Discovery: Health check failed:', error);
    });
  }

  /**
   * Start periodic discovery refresh
   */
  private startDiscoveryRefresh(): void {
    this.discoveryTimer = setInterval(async () => {
      await this.refreshDiscoveredAgents();
    }, this.config.discoveryRefreshInterval);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      // Perform health checks on discovered agents
      for (const [agentId, agent] of this.discoveredAgents.entries()) {
        if (agentId === this.config.agentId) continue; // Skip self

        try {
          // Simple ping to check if agent is responsive
          await this.communicator.request(
            agentId,
            'ping',
            {},
            { timeout: 5000 }
          );

          this.updateAgentHealth(agentId, 'healthy');

        } catch (error) {
          this.updateAgentHealth(agentId, 'unhealthy');
          console.warn(`Health check failed for agent ${agentId}:`, error.message);
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Shutdown service discovery
   */
  async shutdown(): Promise<void> {
    console.log('UEP Service Discovery: Shutting down...');

    // Clear timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
    }

    // Deregister from service registry
    try {
      await this.registrar.deregister();
    } catch (error) {
      console.error('Error during deregistration:', error);
    }

    console.log('UEP Service Discovery: Shutdown complete');
  }
}

/**
 * Factory function to create UEP Service Discovery Manager
 */
export async function createUEPServiceDiscovery(
  config: UEPServiceDiscoveryConfig,
  communicator: UEPAgentCommunicator
): Promise<UEPServiceDiscoveryManager> {
  const manager = new UEPServiceDiscoveryManager(config, communicator);
  await manager.initialize();
  return manager;
}

/**
 * Enhanced UEP Agent with built-in service discovery
 */
export class UEPDiscoveryEnabledAgent {
  protected communicator: UEPAgentCommunicator;
  protected discoveryManager: UEPServiceDiscoveryManager;

  constructor(
    communicator: UEPAgentCommunicator,
    discoveryManager: UEPServiceDiscoveryManager
  ) {
    this.communicator = communicator;
    this.discoveryManager = discoveryManager;
  }

  /**
   * Request with automatic capability-based discovery
   */
  async requestCapability(
    capability: string,
    method: string,
    data: any,
    options?: {
      agentType?: 'meta' | 'domain';
      timeout?: number;
      retryOnFailure?: boolean;
    }
  ): Promise<any> {
    return await this.discoveryManager.requestWithDiscovery(
      capability,
      method,
      data,
      options
    );
  }

  /**
   * Publish to agents with specific capability
   */
  async publishToCapability(
    capability: string,
    eventType: string,
    data: any,
    options?: {
      agentType?: 'meta' | 'domain';
      excludeSelf?: boolean;
    }
  ): Promise<void> {
    return await this.discoveryManager.publishToCapability(
      capability,
      eventType,
      data,
      options
    );
  }

  /**
   * Get discovered agents
   */
  getDiscoveredAgents(): DiscoveredAgent[] {
    return this.discoveryManager.getDiscoveredAgents();
  }

  /**
   * Get agents by capability
   */
  async getAgentsByCapability(capability: string): Promise<DiscoveredAgent[]> {
    return await this.discoveryManager.discoverAgentsByCapability({ capability });
  }
}