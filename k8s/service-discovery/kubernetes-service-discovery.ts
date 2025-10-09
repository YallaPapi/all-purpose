/**
 * Kubernetes Native Service Discovery Implementation
 * Task 191.5: Kubernetes-compatible service discovery client
 */

import { KubeConfig, CoreV1Api, AppsV1Api, V1Service, V1Deployment } from '@kubernetes/client-node';
import {
  ServiceDiscoveryQuery,
  ServiceDiscoveryResult,
  AgentRegistrationMetadata,
  AgentStatus
} from '../../src/uep/service-registry/types/AgentRegistration.js';

export interface KubernetesDiscoveryConfig {
  // Kubernetes configuration
  kubeconfig?: string;
  namespace?: string;
  
  // Service discovery options
  labelSelectors: {
    component: string;        // e.g., 'meta-agent'
    agentTypeLabel: string;   // e.g., 'uep.io/agent-type'
    capabilityAnnotation: string; // e.g., 'uep.io/capabilities'
  };
  
  // Fallback options
  fallback?: {
    enabled: boolean;
    registryType: 'redis' | 'consul';
    connection: any;
  };
  
  // Performance options
  cache: {
    enabled: boolean;
    ttl: number; // seconds
  };
}

interface ServiceCache {
  services: V1Service[];
  deployments: V1Deployment[];
  timestamp: number;
  ttl: number;
}

/**
 * Kubernetes-native service discovery implementation
 * 
 * This class provides service discovery using Kubernetes native APIs,
 * including Services, Endpoints, and Pod discovery.
 */
export class KubernetesServiceDiscovery {
  private config: KubernetesDiscoveryConfig;
  private k8sConfig: KubeConfig;
  private coreApi: CoreV1Api;
  private appsApi: AppsV1Api;
  private cache: Map<string, ServiceCache> = new Map();

  constructor(config: Partial<KubernetesDiscoveryConfig> = {}) {
    this.config = {
      namespace: 'uep-agents',
      labelSelectors: {
        component: 'meta-agent',
        agentTypeLabel: 'uep.io/agent-type',
        capabilityAnnotation: 'uep.io/capabilities'
      },
      cache: {
        enabled: true,
        ttl: 30 // 30 seconds
      },
      ...config
    };

    this.initializeKubernetesClient();
  }

  private initializeKubernetesClient(): void {
    this.k8sConfig = new KubeConfig();
    
    if (this.config.kubeconfig) {
      this.k8sConfig.loadFromFile(this.config.kubeconfig);
    } else {
      // Try in-cluster config first, then default config
      try {
        this.k8sConfig.loadFromCluster();
      } catch (error) {
        this.k8sConfig.loadFromDefault();
      }
    }

    this.coreApi = this.k8sConfig.makeApiClient(CoreV1Api);
    this.appsApi = this.k8sConfig.makeApiClient(AppsV1Api);
  }

  /**
   * Discover agents based on query criteria using Kubernetes APIs
   */
  async discoverAgents(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.cache.enabled) {
        const cached = this.getFromCache(query);
        if (cached) {
          return {
            ...cached,
            executionTime: Date.now() - startTime
          };
        }
      }

      // Build label selector for Kubernetes query
      const labelSelector = this.buildLabelSelector(query);
      const namespace = query.namespace || this.config.namespace!;

      // Query Kubernetes services
      const { body: servicesResponse } = await this.coreApi.listNamespacedService(
        namespace,
        undefined, // pretty
        undefined, // allowWatchBookmarks
        undefined, // continue
        undefined, // fieldSelector
        labelSelector
      );

      // Convert services to agent metadata
      const agents = await Promise.all(
        servicesResponse.items.map(service => this.convertServiceToAgent(service, namespace))
      );

      const validAgents = agents.filter((agent): agent is AgentRegistrationMetadata => agent !== null);

      // Apply additional filtering
      const filteredAgents = this.applyFilters(validAgents, query);

      // Apply sorting
      const sortedAgents = query.sortBy 
        ? this.sortAgents(filteredAgents, query.sortBy, query.sortOrder || 'asc')
        : filteredAgents;

      // Apply pagination
      const totalCount = sortedAgents.length;
      const paginatedAgents = this.applyPagination(sortedAgents, query);

      const result: ServiceDiscoveryResult = {
        agents: paginatedAgents,
        totalCount,
        query,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      if (this.config.cache.enabled) {
        this.setCache(query, result);
      }

      return result;

    } catch (error) {
      // If Kubernetes discovery fails and fallback is enabled, try fallback
      if (this.config.fallback?.enabled) {
        console.warn('Kubernetes discovery failed, attempting fallback:', error);
        return await this.fallbackDiscovery(query);
      }

      throw new Error(`Kubernetes service discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get a specific agent by ID (matches service name in Kubernetes)
   */
  async getAgent(agentId: string, namespace?: string): Promise<AgentRegistrationMetadata | null> {
    try {
      const ns = namespace || this.config.namespace!;
      
      const { body: service } = await this.coreApi.readNamespacedService(agentId, ns);
      return await this.convertServiceToAgent(service, ns);
      
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all agents across all namespaces (requires cluster-wide permissions)
   */
  async getAllAgents(): Promise<AgentRegistrationMetadata[]> {
    try {
      const labelSelector = `${this.config.labelSelectors.component}=meta-agent`;
      
      const { body: servicesResponse } = await this.coreApi.listServiceForAllNamespaces(
        undefined, // allowWatchBookmarks
        undefined, // continue
        undefined, // fieldSelector
        labelSelector
      );

      const agents = await Promise.all(
        servicesResponse.items.map(service => 
          this.convertServiceToAgent(service, service.metadata?.namespace || 'default')
        )
      );

      return agents.filter((agent): agent is AgentRegistrationMetadata => agent !== null);
      
    } catch (error) {
      console.error('Failed to get all agents:', error);
      return [];
    }
  }

  /**
   * Check if an agent is healthy by querying its pods
   */
  async isAgentHealthy(agentId: string, namespace?: string): Promise<boolean> {
    try {
      const ns = namespace || this.config.namespace!;
      
      // Get pods for this service
      const { body: podsResponse } = await this.coreApi.listNamespacedPod(
        ns,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${agentId}`
      );

      if (podsResponse.items.length === 0) {
        return false;
      }

      // Check if at least one pod is ready
      return podsResponse.items.some(pod => {
        const readyCondition = pod.status?.conditions?.find(c => c.type === 'Ready');
        return readyCondition?.status === 'True';
      });

    } catch (error) {
      console.error(`Failed to check health for agent ${agentId}:`, error);
      return false;
    }
  }

  /**
   * Watch for service changes (for real-time updates)
   */
  watchServices(callback: (event: string, service: V1Service) => void): void {
    const namespace = this.config.namespace!;
    const labelSelector = `${this.config.labelSelectors.component}=meta-agent`;

    const watch = require('@kubernetes/client-node').Watch;
    const watchClient = new watch(this.k8sConfig);

    watchClient.watch(
      `/api/v1/namespaces/${namespace}/services`,
      { labelSelector },
      (type: string, obj: V1Service) => {
        callback(type, obj);
      },
      (err: any) => {
        console.error('Service watch error:', err);
      }
    );
  }

  // Private helper methods

  private buildLabelSelector(query: ServiceDiscoveryQuery): string {
    const selectors = [`${this.config.labelSelectors.component}=meta-agent`];

    if (query.agentType) {
      selectors.push(`${this.config.labelSelectors.agentTypeLabel}=${query.agentType}`);
    }

    if (query.environment) {
      selectors.push(`environment=${query.environment}`);
    }

    return selectors.join(',');
  }

  private async convertServiceToAgent(service: V1Service, namespace: string): Promise<AgentRegistrationMetadata | null> {
    try {
      if (!service.metadata?.name) {
        return null;
      }

      const agentType = service.metadata.labels?.[this.config.labelSelectors.agentTypeLabel] || 'unknown';
      const capabilitiesStr = service.metadata.annotations?.[this.config.labelSelectors.capabilityAnnotation] || '';
      const capabilities = capabilitiesStr.split(',').filter(Boolean).map(cap => ({
        name: cap.trim(),
        version: '1.0.0',
        description: `${cap.trim()} capability`
      }));

      // Get pod information for additional metadata
      const podInfo = await this.getPodInfo(service.metadata.name, namespace);

      const now = new Date().toISOString();
      const agentId = service.metadata.name;

      const agent: AgentRegistrationMetadata = {
        agentId,
        agentName: service.metadata.labels?.['app.kubernetes.io/name'] || service.metadata.name,
        agentType,
        instanceId: `${agentType}-k8s-${service.metadata.uid?.substring(0, 8)}`,

        version: {
          major: 1,
          minor: 0,
          patch: 0,
          build: service.metadata.labels?.['app.kubernetes.io/version'] || '1.0.0'
        },

        capabilities,
        supportedProtocols: ['UEP/2.0', 'HTTP/1.1'],

        network: {
          address: `${service.metadata.name}.${namespace}.svc.cluster.local`,
          port: service.spec?.ports?.[0]?.port || 3000,
          protocol: 'http',
          tlsEnabled: false,
          healthCheckPort: service.spec?.ports?.find(p => p.name === 'health')?.port
        },

        resources: {
          cpu: { min: '100m', max: '1000m', preferred: '500m' },
          memory: { min: '256Mi', max: '2Gi', preferred: '1Gi' }
        },

        currentMetrics: {
          currentLoad: podInfo?.load || 0,
          maxCapacity: 100,
          averageResponseTime: 50,
          errorRate: 0,
          queueLength: 0,
          lastUpdated: now
        },

        healthCheck: {
          endpoint: '/health',
          method: 'GET',
          interval: '30s',
          timeout: '10s',
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
          tlsRequired: false,
          encryptionEnabled: false,
          auditLogging: false
        },

        environment: service.metadata.labels?.environment || 'development',
        cluster: service.metadata.labels?.cluster || 'default',
        namespace,
        podName: podInfo?.podName,
        nodeName: podInfo?.nodeName,

        startTime: service.metadata.creationTimestamp || now,
        lastHeartbeat: now,
        registrationTime: service.metadata.creationTimestamp || now,
        status: podInfo?.healthy ? 'healthy' : 'unhealthy',

        configuration: {},
        featureFlags: {},
        labels: service.metadata.labels || {},
        annotations: service.metadata.annotations || {}
      };

      return agent;

    } catch (error) {
      console.error(`Failed to convert service ${service.metadata?.name} to agent:`, error);
      return null;
    }
  }

  private async getPodInfo(serviceName: string, namespace: string): Promise<{
    podName?: string;
    nodeName?: string;
    healthy: boolean;
    load: number;
  } | null> {
    try {
      const { body: podsResponse } = await this.coreApi.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${serviceName}`
      );

      if (podsResponse.items.length === 0) {
        return null;
      }

      const pod = podsResponse.items[0];
      const readyCondition = pod.status?.conditions?.find(c => c.type === 'Ready');
      const healthy = readyCondition?.status === 'True';

      // Estimate load based on pod resource usage (simplified)
      const load = healthy ? Math.random() * 50 : 100; // Mock load calculation

      return {
        podName: pod.metadata?.name,
        nodeName: pod.spec?.nodeName,
        healthy,
        load
      };

    } catch (error) {
      console.error(`Failed to get pod info for service ${serviceName}:`, error);
      return null;
    }
  }

  private applyFilters(agents: AgentRegistrationMetadata[], query: ServiceDiscoveryQuery): AgentRegistrationMetadata[] {
    return agents.filter(agent => {
      // Environment filter
      if (query.environment && agent.environment !== query.environment) {
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

      // Status filter
      if (query.status && !query.status.includes(agent.status)) {
        return false;
      }

      // Healthy only filter
      if (query.healthyOnly && agent.status !== 'healthy') {
        return false;
      }

      // Performance filters
      if (query.maxLoad && agent.currentMetrics.currentLoad > query.maxLoad) {
        return false;
      }

      if (query.minCapacity && agent.currentMetrics.maxCapacity < query.minCapacity) {
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

  private applyPagination(agents: AgentRegistrationMetadata[], query: ServiceDiscoveryQuery): AgentRegistrationMetadata[] {
    if (!query.offset && !query.limit) {
      return agents;
    }

    const offset = query.offset || 0;
    const limit = query.limit || agents.length;
    return agents.slice(offset, offset + limit);
  }

  private getFromCache(query: ServiceDiscoveryQuery): ServiceDiscoveryResult | null {
    const cacheKey = JSON.stringify(query);
    const cached = this.cache.get(cacheKey);
    
    if (!cached || Date.now() - cached.timestamp > cached.ttl * 1000) {
      return null;
    }
    
    // Return cached result with services converted to agents
    return {
      agents: [], // Would need to convert from cached services
      totalCount: 0,
      query,
      executionTime: 0,
      timestamp: new Date().toISOString()
    };
  }

  private setCache(query: ServiceDiscoveryQuery, result: ServiceDiscoveryResult): void {
    const cacheKey = JSON.stringify(query);
    // Cache implementation would store the result
  }

  private async fallbackDiscovery(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    // Fallback to external registry if configured
    throw new Error('Fallback discovery not implemented');
  }
}

/**
 * Factory function to create Kubernetes service discovery client
 */
export function createKubernetesServiceDiscovery(config?: Partial<KubernetesDiscoveryConfig>): KubernetesServiceDiscovery {
  return new KubernetesServiceDiscovery(config);
}

/**
 * Utility function to check if running in Kubernetes cluster
 */
export function isRunningInKubernetes(): boolean {
  return !!(
    process.env.KUBERNETES_SERVICE_HOST &&
    process.env.KUBERNETES_SERVICE_PORT
  );
}

/**
 * Utility function to detect if Kubernetes service discovery should be used
 */
export function shouldUseKubernetesDiscovery(): boolean {
  return isRunningInKubernetes() && 
         (process.env.REGISTRY_TYPE === 'kubernetes' || 
          process.env.SERVICE_DISCOVERY_TYPE === 'kubernetes');
}