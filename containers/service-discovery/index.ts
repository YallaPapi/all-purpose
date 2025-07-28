/**
 * UEP Service Discovery and Registry System
 * Task 191.3: TypeScript Service Discovery Client Library Main Export
 * 
 * This is the main entry point for the UEP Service Discovery system,
 * providing unified access to all service registry and discovery components.
 */

// Core service registry implementations
export { RedisServiceRegistry, createRedisRegistryConfig } from './RedisServiceRegistry.js';
export type { RedisRegistryConfig } from './RedisServiceRegistry.js';

// Re-export Consul registry (from existing UEP infrastructure)
export { ConsulServiceRegistry } from '../src/uep/service-registry/ConsulServiceRegistry.js';
export type { ConsulConfig } from '../src/uep/service-registry/ConsulServiceRegistry.js';

// Unified service discovery client
export { 
  ServiceDiscoveryClient,
  createServiceDiscoveryConfig,
  createRedisOnlyConfig,
  createConsulOnlyConfig,
  createHybridConfig
} from './ServiceDiscoveryClient.js';

export type {
  ServiceDiscoveryClientConfig,
  RegistryBackend,
  ClientMetrics,
  CircuitBreakerState,
  CacheEntry
} from './ServiceDiscoveryClient.js';

// High-level agent helper
export {
  AgentServiceHelper,
  createAgentHelper,
  createHealthEndpoint,
  createMetricsEndpoint
} from './AgentServiceHelper.js';

export type {
  AgentConfig,
  AgentServiceOptions
} from './AgentServiceHelper.js';

// Type definitions (re-exported from existing UEP infrastructure)
export type {
  AgentRegistrationMetadata,
  AgentRegistrationUpdate,
  AgentRegistrationEvent,
  ServiceDiscoveryQuery,
  ServiceDiscoveryResult,
  ConsulServiceRegistration,
  UEPAgentCapability,
  ResourceRequirements,
  HealthCheckConfig,
  LoadMetrics,
  AgentVersionInfo,
  NetworkConfig,
  SecurityContext,
  MonitoringConfig,
  AgentStatus,
  DeepPartial
} from '../src/uep/service-registry/types/AgentRegistration.js';

// Validation utilities
export {
  isValidAgentId,
  isValidAgentStatus,
  validateAgentRegistration,
  convertToConsulRegistration
} from '../src/uep/service-registry/types/AgentRegistration.js';

// Version information
export const VERSION = '1.0.0';
export const SUPPORTED_UEP_VERSION = '2.0.0';
export const COMPATIBLE_REGISTRIES = ['redis', 'consul'] as const;

// Default configurations
export const DEFAULT_REDIS_CONFIG = {
  host: 'localhost',
  port: 6379,
  keyPrefix: 'uep:registry'
};

export const DEFAULT_CONSUL_CONFIG = {
  host: 'localhost',
  port: 8500,
  secure: false,
  promisify: true
};

// Common patterns and utilities
export namespace ServiceDiscoveryPatterns {
  /**
   * Create a basic agent configuration with sensible defaults
   */
  export function createBasicAgentConfig(overrides: Partial<any> = {}) {
    return {
      agentType: 'generic-agent',
      host: 'localhost',
      port: 3000,
      capabilities: ['basic'],
      environment: 'development',
      ...overrides
    };
  }

  /**
   * Create a Redis-based service discovery setup
   */
  export function createRedisSetup(redisUrl: string = 'redis://localhost:6379') {
    const url = new URL(redisUrl);
    return {
      backend: 'redis' as const,
      redis: createRedisRegistryConfig({
        redis: {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password || undefined
        }
      })
    };
  }

  /**
   * Create a Consul-based service discovery setup
   */
  export function createConsulSetup(consulUrl: string = 'http://localhost:8500') {
    const url = new URL(consulUrl);
    return {
      backend: 'consul' as const,
      consul: {
        host: url.hostname,
        port: parseInt(url.port) || 8500,
        secure: url.protocol === 'https:'
      }
    };
  }

  /**
   * Create a hybrid Redis + Consul setup for maximum reliability
   */
  export function createHybridSetup(
    redisUrl: string = 'redis://localhost:6379',
    consulUrl: string = 'http://localhost:8500'
  ) {
    return {
      backend: 'hybrid' as const,
      redis: createRedisSetup(redisUrl).redis,
      consul: createConsulSetup(consulUrl).consul
    };
  }
}

// Health check utilities
export namespace HealthCheckUtils {
  /**
   * Standard health check response format
   */
  export interface StandardHealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version: string;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      details?: any;
    }>;
  }

  /**
   * Create a standard health check response
   */
  export function createHealthResponse(
    status: StandardHealthResponse['status'] = 'healthy',
    checks: StandardHealthResponse['checks'] = []
  ): StandardHealthResponse {
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks: [
        {
          name: 'process',
          status: 'pass',
          details: {
            pid: process.pid,
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
          }
        },
        ...checks
      ]
    };
  }

  /**
   * Validate that a health check response meets UEP standards
   */
  export function validateHealthResponse(response: any): response is StandardHealthResponse {
    return (
      response &&
      typeof response.status === 'string' &&
      ['healthy', 'degraded', 'unhealthy'].includes(response.status) &&
      typeof response.timestamp === 'string' &&
      typeof response.uptime === 'number' &&
      Array.isArray(response.checks)
    );
  }
}

// Metrics utilities
export namespace MetricsUtils {
  /**
   * Standard Prometheus metrics format for UEP agents
   */
  export function formatPrometheusMetrics(metrics: Record<string, number>, labels: Record<string, string> = {}): string {
    const labelString = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    const labelSuffix = labelString ? `{${labelString}}` : '';
    
    return Object.entries(metrics)
      .map(([name, value]) => `uep_agent_${name}${labelSuffix} ${value}`)
      .join('\n');
  }

  /**
   * Calculate agent health score from metrics
   */
  export function calculateHealthScore(metrics: LoadMetrics): number {
    let score = 100;
    
    // Penalize high load (0-100%)
    score -= metrics.currentLoad;
    
    // Penalize high response time (penalty starts at 100ms)
    if (metrics.averageResponseTime > 100) {
      score -= Math.min(50, (metrics.averageResponseTime - 100) / 10);
    }
    
    // Penalize error rate (0-1 becomes 0-100 penalty)
    score -= metrics.errorRate * 100;
    
    // Penalize queue length
    score -= Math.min(20, metrics.queueLength * 2);
    
    return Math.max(0, Math.min(100, score));
  }
}

// Error classes
export class ServiceDiscoveryError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ServiceDiscoveryError';
  }
}

export class RegistrationError extends ServiceDiscoveryError {
  constructor(message: string, public agentId?: string, cause?: Error) {
    super(message, cause);
    this.name = 'RegistrationError';
  }
}

export class DiscoveryError extends ServiceDiscoveryError {
  constructor(message: string, public query?: ServiceDiscoveryQuery, cause?: Error) {
    super(message, cause);
    this.name = 'DiscoveryError';
  }
}

export class HealthCheckError extends ServiceDiscoveryError {
  constructor(message: string, public agentId?: string, cause?: Error) {
    super(message, cause);
    this.name = 'HealthCheckError';
  }
}

// Logging utilities
export namespace LoggingUtils {
  /**
   * Create structured log entries for service discovery events
   */
  export function createLogEntry(
    level: 'info' | 'warn' | 'error',
    event: string,
    details: Record<string, any> = {}
  ) {
    return {
      timestamp: new Date().toISOString(),
      level,
      component: 'service-discovery',
      event,
      ...details
    };
  }

  /**
   * Log agent registration events
   */
  export function logRegistration(agentId: string, agentType: string, success: boolean, error?: Error) {
    const entry = createLogEntry(
      success ? 'info' : 'error',
      'agent_registration',
      {
        agentId,
        agentType,
        success,
        error: error?.message
      }
    );
    
    console.log(JSON.stringify(entry));
  }

  /**
   * Log service discovery queries
   */
  export function logDiscoveryQuery(query: ServiceDiscoveryQuery, result: ServiceDiscoveryResult, error?: Error) {
    const entry = createLogEntry(
      error ? 'error' : 'info',
      'service_discovery_query',
      {
        query: {
          agentType: query.agentType,
          capabilities: query.capabilities,
          environment: query.environment
        },
        resultCount: result?.agents.length || 0,
        executionTime: result?.executionTime,
        error: error?.message
      }
    );
    
    console.log(JSON.stringify(entry));
  }
}

// Export the main classes for direct instantiation
export default {
  RedisServiceRegistry,
  ConsulServiceRegistry,
  ServiceDiscoveryClient,
  AgentServiceHelper,
  VERSION,
  SUPPORTED_UEP_VERSION
};