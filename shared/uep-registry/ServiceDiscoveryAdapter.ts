/**
 * Service Discovery Adapter - Multi-Backend Service Discovery
 * Provides unified interface for service discovery across different backends
 * including Consul, etcd, Kubernetes, and custom UEP registries
 */

import { UEPAgentRegistration, UEPRegistryClient, LoadBalancingConfig } from './UEPRegistryIntegration';

export interface ServiceDiscoveryConfig {
  backend: 'consul' | 'etcd' | 'kubernetes' | 'memory';
  endpoint: string;
  watchEnabled?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  healthCheckEnabled?: boolean;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

export interface ServiceEndpoint {
  id: string;
  address: string;
  port: number;
  metadata: Record<string, string>;
  health: 'healthy' | 'unhealthy' | 'unknown';
  weight?: number;
}

export interface ServiceInfo {
  serviceName: string;
  endpoints: ServiceEndpoint[];
  capabilities: string[];
  protocolVersions: string[];
  loadBalancing: LoadBalancingConfig;
  lastUpdated: Date;
}

/**
 * Abstract Service Discovery Backend
 */
abstract class ServiceDiscoveryBackend {
  constructor(protected config: ServiceDiscoveryConfig) {}

  abstract async register(registration: UEPAgentRegistration): Promise<void>;
  abstract async deregister(agentId: string): Promise<void>;
  abstract async discover(serviceName: string): Promise<ServiceInfo>;
  abstract async discoverByCapability(capability: string): Promise<ServiceInfo[]>;
  abstract async watchService(serviceName: string, callback: (service: ServiceInfo) => void): Promise<() => void>;
  abstract async healthCheck(agentId: string): Promise<boolean>;
}

/**
 * Consul Service Discovery Backend
 */
class ConsulServiceDiscovery extends ServiceDiscoveryBackend {
  async register(registration: UEPAgentRegistration): Promise<void> {
    const consulService = {
      ID: registration.id,
      Name: registration.serviceMesh.serviceName,
      Tags: [
        ...registration.capabilities,
        ...registration.uepProtocol.supportedVersions.map(v => `uep-${v}`),
        `load-balancing:${registration.coordination.loadBalancing}`
      ],
      Address: new URL(registration.endpoints.api).hostname,
      Port: parseInt(new URL(registration.endpoints.api).port) || 80,
      Meta: {
        uep_active_version: registration.uepProtocol.activeVersion,
        namespace: registration.serviceMesh.namespace,
        description: registration.metadata.description,
        version: registration.version
      },
      Check: {
        HTTP: registration.endpoints.health,
        Interval: '30s',
        Timeout: '10s',
        DeregisterCriticalServiceAfter: '5m'
      },
      Weights: {
        Passing: 10,
        Warning: 1
      }
    };

    try {
      const response = await fetch(`${this.config.endpoint}/v1/agent/service/register`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.auth?.token && { 'X-Consul-Token': this.config.auth.token })
        },
        body: JSON.stringify(consulService)
      });

      if (!response.ok) {
        throw new Error(`Consul registration failed: ${response.statusText}`);
      }

      console.log(`Registered service ${registration.id} with Consul`);
    } catch (error) {
      console.error('Failed to register with Consul:', error);
      throw error;
    }
  }

  async deregister(agentId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.endpoint}/v1/agent/service/deregister/${agentId}`, {
        method: 'PUT',
        headers: {
          ...(this.config.auth?.token && { 'X-Consul-Token': this.config.auth.token })
        }
      });

      if (!response.ok) {
        throw new Error(`Consul deregistration failed: ${response.statusText}`);
      }

      console.log(`Deregistered service ${agentId} from Consul`);
    } catch (error) {
      console.error('Failed to deregister from Consul:', error);
      throw error;
    }
  }

  async discover(serviceName: string): Promise<ServiceInfo> {
    try {
      const response = await fetch(`${this.config.endpoint}/v1/health/service/${serviceName}?passing=true`, {
        headers: {
          ...(this.config.auth?.token && { 'X-Consul-Token': this.config.auth.token })
        }
      });

      if (!response.ok) {
        throw new Error(`Consul discovery failed: ${response.statusText}`);
      }

      const services = await response.json();
      return this.parseConsulServices(serviceName, services);
    } catch (error) {
      console.error('Failed to discover from Consul:', error);
      throw error;
    }
  }

  async discoverByCapability(capability: string): Promise<ServiceInfo[]> {
    try {
      const response = await fetch(`${this.config.endpoint}/v1/catalog/services`, {
        headers: {
          ...(this.config.auth?.token && { 'X-Consul-Token': this.config.auth.token })
        }
      });

      if (!response.ok) {
        throw new Error(`Consul service catalog failed: ${response.statusText}`);
      }

      const services = await response.json();
      const matchingServices: ServiceInfo[] = [];

      for (const [serviceName, tags] of Object.entries(services)) {
        if ((tags as string[]).includes(capability)) {
          const serviceInfo = await this.discover(serviceName);
          matchingServices.push(serviceInfo);
        }
      }

      return matchingServices;
    } catch (error) {
      console.error('Failed to discover by capability from Consul:', error);
      throw error;
    }
  }

  async watchService(serviceName: string, callback: (service: ServiceInfo) => void): Promise<() => void> {
    let watching = true;
    let lastIndex = 0;

    const watch = async () => {
      while (watching) {
        try {
          const response = await fetch(
            `${this.config.endpoint}/v1/health/service/${serviceName}?wait=30s&index=${lastIndex}`,
            {
              headers: {
                ...(this.config.auth?.token && { 'X-Consul-Token': this.config.auth.token })
              }
            }
          );

          if (response.ok) {
            lastIndex = parseInt(response.headers.get('X-Consul-Index') || '0');
            const services = await response.json();
            const serviceInfo = this.parseConsulServices(serviceName, services);
            callback(serviceInfo);
          }
        } catch (error) {
          if (watching) {
            console.error('Consul watch error:', error);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Retry after 5s
          }
        }
      }
    };

    watch();
    return () => { watching = false; };
  }

  async healthCheck(agentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.endpoint}/v1/agent/health/service/id/${agentId}`, {
        headers: {
          ...(this.config.auth?.token && { 'X-Consul-Token': this.config.auth.token })
        }
      });

      if (!response.ok) return false;

      const health = await response.json();
      return health.AggregatedStatus === 'passing';
    } catch (error) {
      return false;
    }
  }

  private parseConsulServices(serviceName: string, services: any[]): ServiceInfo {
    const endpoints: ServiceEndpoint[] = services.map(service => ({
      id: service.Service.ID,
      address: service.Service.Address,
      port: service.Service.Port,
      metadata: service.Service.Meta || {},
      health: this.parseConsulHealth(service.Checks),
      weight: service.Service.Weights?.Passing || 1
    }));

    const allTags = new Set<string>();
    const protocolVersions = new Set<string>();
    let loadBalancingStrategy = 'round-robin';

    for (const service of services) {
      for (const tag of service.Service.Tags || []) {
        allTags.add(tag);
        if (tag.startsWith('uep-')) {
          protocolVersions.add(tag.substring(4));
        }
        if (tag.startsWith('load-balancing:')) {
          loadBalancingStrategy = tag.substring(15);
        }
      }
    }

    const capabilities = Array.from(allTags).filter(tag => 
      !tag.startsWith('uep-') && !tag.startsWith('load-balancing:')
    );

    return {
      serviceName,
      endpoints,
      capabilities,
      protocolVersions: Array.from(protocolVersions),
      loadBalancing: {
        strategy: loadBalancingStrategy as any,
        endpoints: endpoints.map(e => `http://${e.address}:${e.port}`),
        healthCheck: '/health',
        retryPolicy: {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT']
        }
      },
      lastUpdated: new Date()
    };
  }

  private parseConsulHealth(checks: any[]): 'healthy' | 'unhealthy' | 'unknown' {
    if (!checks || checks.length === 0) return 'unknown';
    
    for (const check of checks) {
      if (check.Status === 'critical') return 'unhealthy';
    }
    
    return 'healthy';
  }
}

/**
 * Kubernetes Service Discovery Backend
 */
class KubernetesServiceDiscovery extends ServiceDiscoveryBackend {
  async register(registration: UEPAgentRegistration): Promise<void> {
    // In Kubernetes, registration is typically handled by the service controller
    // This would update service annotations and labels
    console.log('Kubernetes registration handled by service mesh');
  }

  async deregister(agentId: string): Promise<void> {
    console.log('Kubernetes deregistration handled by service mesh');
  }

  async discover(serviceName: string): Promise<ServiceInfo> {
    // Use Kubernetes API to discover services
    try {
      const response = await fetch(`${this.config.endpoint}/api/v1/services`, {
        headers: {
          'Authorization': `Bearer ${this.config.auth?.token}`,
          'Content-Type': 'application/json'
        }
      });

      const services = await response.json();
      return this.parseKubernetesService(serviceName, services);
    } catch (error) {
      console.error('Failed to discover from Kubernetes:', error);
      throw error;
    }
  }

  async discoverByCapability(capability: string): Promise<ServiceInfo[]> {
    // Discover services with specific labels/annotations
    const labelSelector = `capability=${capability}`;
    
    try {
      const response = await fetch(
        `${this.config.endpoint}/api/v1/services?labelSelector=${labelSelector}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.auth?.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const services = await response.json();
      return services.items.map((service: any) => this.parseKubernetesService(service.metadata.name, { items: [service] }));
    } catch (error) {
      console.error('Failed to discover by capability from Kubernetes:', error);
      throw error;
    }
  }

  async watchService(serviceName: string, callback: (service: ServiceInfo) => void): Promise<() => void> {
    // Use Kubernetes watch API
    let watching = true;

    const watch = async () => {
      while (watching) {
        try {
          const response = await fetch(
            `${this.config.endpoint}/api/v1/watch/services?fieldSelector=metadata.name=${serviceName}`,
            {
              headers: {
                'Authorization': `Bearer ${this.config.auth?.token}`
              }
            }
          );

          const reader = response.body?.getReader();
          if (reader) {
            while (watching) {
              const { done, value } = await reader.read();
              if (done) break;

              const event = JSON.parse(new TextDecoder().decode(value));
              if (event.type === 'MODIFIED' || event.type === 'ADDED') {
                const serviceInfo = this.parseKubernetesService(serviceName, { items: [event.object] });
                callback(serviceInfo);
              }
            }
          }
        } catch (error) {
          if (watching) {
            console.error('Kubernetes watch error:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
    };

    watch();
    return () => { watching = false; };
  }

  async healthCheck(agentId: string): Promise<boolean> {
    // Check pod readiness through Kubernetes API
    try {
      const response = await fetch(`${this.config.endpoint}/api/v1/pods?labelSelector=app=${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.auth?.token}`
        }
      });

      const pods = await response.json();
      return pods.items.some((pod: any) => 
        pod.status.conditions?.some((condition: any) => 
          condition.type === 'Ready' && condition.status === 'True'
        )
      );
    } catch (error) {
      return false;
    }
  }

  private parseKubernetesService(serviceName: string, services: any): ServiceInfo {
    const service = services.items.find((s: any) => s.metadata.name === serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const endpoints: ServiceEndpoint[] = service.spec.ports?.map((port: any) => ({
      id: `${serviceName}-${port.port}`,
      address: service.spec.clusterIP,
      port: port.port,
      metadata: service.metadata.annotations || {},
      health: 'unknown' as const,
      weight: 1
    })) || [];

    const capabilities = Object.keys(service.metadata.labels || {})
      .filter(key => key.startsWith('capability-'))
      .map(key => key.substring(11));

    const protocolVersions = Object.keys(service.metadata.annotations || {})
      .filter(key => key.startsWith('uep.protocol/'))
      .map(key => key.substring(13));

    return {
      serviceName,
      endpoints,
      capabilities,
      protocolVersions,
      loadBalancing: {
        strategy: 'round-robin',
        endpoints: endpoints.map(e => `http://${e.address}:${e.port}`),
        healthCheck: '/health',
        retryPolicy: {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT']
        }
      },
      lastUpdated: new Date()
    };
  }
}

/**
 * In-Memory Service Discovery Backend (for testing/development)
 */
class MemoryServiceDiscovery extends ServiceDiscoveryBackend {
  private services: Map<string, UEPAgentRegistration> = new Map();
  private watchers: Map<string, Function[]> = new Map();

  async register(registration: UEPAgentRegistration): Promise<void> {
    this.services.set(registration.id, registration);
    this.notifyWatchers(registration.serviceMesh.serviceName);
    console.log(`Registered service ${registration.id} in memory`);
  }

  async deregister(agentId: string): Promise<void> {
    const registration = this.services.get(agentId);
    if (registration) {
      this.services.delete(agentId);
      this.notifyWatchers(registration.serviceMesh.serviceName);
      console.log(`Deregistered service ${agentId} from memory`);
    }
  }

  async discover(serviceName: string): Promise<ServiceInfo> {
    const matchingServices = Array.from(this.services.values())
      .filter(service => service.serviceMesh.serviceName === serviceName);

    if (matchingServices.length === 0) {
      throw new Error(`Service ${serviceName} not found`);
    }

    return this.buildServiceInfo(serviceName, matchingServices);
  }

  async discoverByCapability(capability: string): Promise<ServiceInfo[]> {
    const serviceGroups = new Map<string, UEPAgentRegistration[]>();

    for (const service of this.services.values()) {
      if (service.capabilities.includes(capability)) {
        const serviceName = service.serviceMesh.serviceName;
        if (!serviceGroups.has(serviceName)) {
          serviceGroups.set(serviceName, []);
        }
        serviceGroups.get(serviceName)!.push(service);
      }
    }

    return Array.from(serviceGroups.entries()).map(([serviceName, services]) =>
      this.buildServiceInfo(serviceName, services)
    );
  }

  async watchService(serviceName: string, callback: (service: ServiceInfo) => void): Promise<() => void> {
    const watchers = this.watchers.get(serviceName) || [];
    watchers.push(callback);
    this.watchers.set(serviceName, watchers);

    return () => {
      const currentWatchers = this.watchers.get(serviceName) || [];
      const index = currentWatchers.indexOf(callback);
      if (index > -1) {
        currentWatchers.splice(index, 1);
      }
    };
  }

  async healthCheck(agentId: string): Promise<boolean> {
    const registration = this.services.get(agentId);
    return registration?.status === 'healthy' || false;
  }

  private buildServiceInfo(serviceName: string, services: UEPAgentRegistration[]): ServiceInfo {
    const endpoints: ServiceEndpoint[] = services.map(service => ({
      id: service.id,
      address: new URL(service.endpoints.api).hostname,
      port: parseInt(new URL(service.endpoints.api).port) || 80,
      metadata: {
        version: service.version,
        description: service.metadata.description
      },
      health: service.status === 'healthy' ? 'healthy' : 'unhealthy',
      weight: 1
    }));

    const allCapabilities = new Set<string>();
    const protocolVersions = new Set<string>();

    for (const service of services) {
      service.capabilities.forEach(cap => allCapabilities.add(cap));
      service.uepProtocol.supportedVersions.forEach(ver => protocolVersions.add(ver));
    }

    return {
      serviceName,
      endpoints,
      capabilities: Array.from(allCapabilities),
      protocolVersions: Array.from(protocolVersions),
      loadBalancing: {
        strategy: services[0]?.coordination.loadBalancing || 'round-robin',
        endpoints: endpoints.map(e => `http://${e.address}:${e.port}`),
        healthCheck: '/health',
        retryPolicy: services[0]?.coordination.retryPolicy || {
          maxAttempts: 3,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT']
        }
      },
      lastUpdated: new Date()
    };
  }

  private notifyWatchers(serviceName: string): void {
    const watchers = this.watchers.get(serviceName) || [];
    if (watchers.length > 0) {
      this.discover(serviceName).then(serviceInfo => {
        watchers.forEach(callback => {
          try {
            callback(serviceInfo);
          } catch (error) {
            console.error('Watcher callback error:', error);
          }
        });
      }).catch(error => {
        console.error('Failed to notify watchers:', error);
      });
    }
  }
}

/**
 * Unified Service Discovery Adapter
 */
export class ServiceDiscoveryAdapter {
  private backend: ServiceDiscoveryBackend;
  private cache: Map<string, { data: ServiceInfo; expires: number }> = new Map();

  constructor(config: ServiceDiscoveryConfig) {
    switch (config.backend) {
      case 'consul':
        this.backend = new ConsulServiceDiscovery(config);
        break;
      case 'kubernetes':
        this.backend = new KubernetesServiceDiscovery(config);
        break;
      case 'memory':
        this.backend = new MemoryServiceDiscovery(config);
        break;
      default:
        throw new Error(`Unsupported service discovery backend: ${config.backend}`);
    }
  }

  async register(registration: UEPAgentRegistration): Promise<void> {
    return this.backend.register(registration);
  }

  async deregister(agentId: string): Promise<void> {
    return this.backend.deregister(agentId);
  }

  async discover(serviceName: string): Promise<ServiceInfo> {
    // Check cache first
    const cached = this.cache.get(serviceName);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const serviceInfo = await this.backend.discover(serviceName);
    
    // Cache the result
    this.cache.set(serviceName, {
      data: serviceInfo,
      expires: Date.now() + 30000 // 30 second cache
    });

    return serviceInfo;
  }

  async discoverByCapability(capability: string): Promise<ServiceInfo[]> {
    return this.backend.discoverByCapability(capability);
  }

  async watchService(serviceName: string, callback: (service: ServiceInfo) => void): Promise<() => void> {
    return this.backend.watchService(serviceName, callback);
  }

  async healthCheck(agentId: string): Promise<boolean> {
    return this.backend.healthCheck(agentId);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export default ServiceDiscoveryAdapter;