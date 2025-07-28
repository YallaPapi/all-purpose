/**
 * UEP Agent Registration Utilities
 * 
 * Utility functions for creating, validating, and transforming agent registrations
 * for the UEP Meta-Agent Factory Consul integration.
 * 
 * @version 2.0.0
 * @author UEP Meta-Agent Factory
 * @since 2025-01-28
 */

import {
  UEPAgentRegistration,
  ConsulService,
  ValidationResult,
  AgentDiscoveryQuery,
  AgentDiscoveryResult,
  RegistrationStatus,
  AgentType,
  Environment,
  LoadBalancingStrategy
} from './agent-registration-types';

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate a UEP agent registration
 */
export function validateAgentRegistration(registration: UEPAgentRegistration): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!registration.id) {
    errors.push('Agent ID is required');
  } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(registration.id)) {
    errors.push('Agent ID must be DNS-compliant (lowercase, alphanumeric, hyphens)');
  }

  if (!registration.name) {
    errors.push('Agent name is required');
  }

  if (!registration.version) {
    errors.push('Agent version is required');
  } else if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(registration.version)) {
    errors.push('Agent version must follow semantic versioning');
  }

  // Validate Consul configuration
  if (!registration.consul) {
    errors.push('Consul configuration is required');
  } else {
    if (!registration.consul.serviceName) {
      errors.push('Consul service name is required');
    } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(registration.consul.serviceName)) {
      errors.push('Consul service name must be DNS-compliant');
    }

    if (!registration.consul.tags || registration.consul.tags.length < 2) {
      errors.push('At least 2 Consul tags are required');
    }

    if (!registration.consul.meta) {
      errors.push('Consul metadata is required');
    } else {
      if (!registration.consul.meta.uep_version) {
        errors.push('UEP version in Consul metadata is required');
      }
      if (!registration.consul.meta.uep_capabilities) {
        errors.push('UEP capabilities in Consul metadata is required');
      }
      if (!registration.consul.meta.environment) {
        errors.push('Environment in Consul metadata is required');
      }
    }

    if (!registration.consul.check) {
      errors.push('Consul health check configuration is required');
    } else {
      if (!registration.consul.check.http) {
        errors.push('HTTP health check endpoint is required');
      }
      if (!registration.consul.check.interval) {
        errors.push('Health check interval is required');
      }
      if (!registration.consul.check.timeout) {
        errors.push('Health check timeout is required');
      }
    }
  }

  // Validate UEP configuration
  if (!registration.uep) {
    errors.push('UEP configuration is required');
  } else {
    if (!registration.uep.supportedVersions || registration.uep.supportedVersions.length === 0) {
      errors.push('At least one supported UEP version is required');
    }

    if (!registration.uep.activeVersion) {
      errors.push('Active UEP version is required');
    } else if (registration.uep.supportedVersions && !registration.uep.supportedVersions.includes(registration.uep.activeVersion)) {
      errors.push('Active UEP version must be in supported versions list');
    }

    if (!registration.uep.protocolCapabilities || registration.uep.protocolCapabilities.length === 0) {
      errors.push('At least one UEP protocol capability is required');
    } else {
      registration.uep.protocolCapabilities.forEach((capability, index) => {
        if (!capability.id) {
          errors.push(`Protocol capability ${index + 1} must have an ID`);
        }
        if (!capability.name) {
          errors.push(`Protocol capability ${index + 1} must have a name`);
        }
        if (!capability.version) {
          errors.push(`Protocol capability ${index + 1} must have a version`);
        }
        if (!capability.messageTypes || capability.messageTypes.length === 0) {
          errors.push(`Protocol capability ${index + 1} must support at least one message type`);
        }
        if (!capability.performance) {
          errors.push(`Protocol capability ${index + 1} must have performance metrics`);
        }
      });
    }
  }

  // Validate endpoints
  if (!registration.endpoints) {
    errors.push('Endpoints configuration is required');
  } else {
    if (!registration.endpoints.api) {
      errors.push('API endpoint is required');
    } else {
      try {
        new URL(registration.endpoints.api);
      } catch {
        errors.push('API endpoint must be a valid URL');
      }
    }

    if (!registration.endpoints.health) {
      errors.push('Health endpoint is required');
    } else {
      try {
        new URL(registration.endpoints.health);
      } catch {
        errors.push('Health endpoint must be a valid URL');
      }
    }
  }

  // Validate capabilities
  if (!registration.capabilities || registration.capabilities.length === 0) {
    errors.push('At least one capability is required');
  }

  // Validate container configuration
  if (!registration.container) {
    errors.push('Container configuration is required');
  } else {
    if (!registration.container.image) {
      errors.push('Container image configuration is required');
    } else {
      if (!registration.container.image.repository) {
        errors.push('Container image repository is required');
      }
      if (!registration.container.image.tag) {
        errors.push('Container image tag is required');
      }
    }

    if (!registration.container.ports || registration.container.ports.length === 0) {
      errors.push('At least one container port is required');
    }

    if (!registration.container.resources || !registration.container.resources.requests) {
      errors.push('Container resource requests are required');
    }
  }

  // Validate coordination
  if (!registration.coordination) {
    errors.push('Coordination configuration is required');
  } else {
    if (!registration.coordination.retryPolicy) {
      errors.push('Retry policy is required');
    }
  }

  // Validate security
  if (!registration.security) {
    errors.push('Security configuration is required');
  } else {
    if (!registration.security.authMethods || registration.security.authMethods.length === 0) {
      errors.push('At least one authentication method is required');
    }
  }

  // Add warnings for optional but recommended fields
  if (!registration.endpoints.metrics) {
    warnings.push('Metrics endpoint is recommended for observability');
  }

  if (!registration.observability || !registration.observability.metrics || !registration.observability.metrics.enabled) {
    warnings.push('Metrics collection is recommended for monitoring');
  }

  if (!registration.metadata || !registration.metadata.description) {
    warnings.push('Agent description is recommended for documentation');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// =============================================================================
// TRANSFORMATION FUNCTIONS
// =============================================================================

/**
 * Transform UEP agent registration to Consul service format
 */
export function toConsulService(registration: UEPAgentRegistration): ConsulService {
  const apiUrl = new URL(registration.endpoints.api);
  
  return {
    ID: registration.id,
    Name: registration.consul.serviceName,
    Tags: registration.consul.tags,
    Address: apiUrl.hostname,
    Port: parseInt(apiUrl.port) || (apiUrl.protocol === 'https:' ? 443 : 80),
    Meta: registration.consul.meta,
    Check: {
      HTTP: registration.consul.check.http,
      Interval: registration.consul.check.interval,
      Timeout: registration.consul.check.timeout,
      DeregisterCriticalServiceAfter: registration.consul.check.deregister_critical_service_after,
      TLSSkipVerify: registration.consul.check.tls_skip_verify
    },
    Weights: registration.consul.weights ? {
      Passing: registration.consul.weights.passing || 1,
      Warning: registration.consul.weights.warning || 1
    } : undefined
  };
}

/**
 * Create a basic agent registration template
 */
export function createAgentRegistrationTemplate(
  id: string,
  name: string,
  agentType: AgentType,
  capabilities: string[],
  options: Partial<UEPAgentRegistration> = {}
): UEPAgentRegistration {
  const timestamp = new Date().toISOString();
  
  return {
    id,
    name,
    version: '1.0.0',
    agentType,
    consul: {
      serviceName: id,
      tags: ['uep', agentType, 'v1.0', 'development'],
      meta: {
        uep_version: '2.0',
        uep_capabilities: capabilities.join(','),
        environment: 'development',
        load_balancing: 'round-robin'
      },
      check: {
        http: `http://${id}:3000/health`,
        interval: '30s',
        timeout: '10s'
      }
    },
    uep: {
      supportedVersions: ['2.0'],
      activeVersion: '2.0',
      protocolCapabilities: [
        {
          id: capabilities[0] || 'basic',
          name: capabilities[0] || 'Basic Capability',
          version: '1.0.0',
          messageTypes: ['task', 'query'],
          performance: {
            maxThroughput: 100,
            averageLatency: 100,
            maxConcurrency: 10
          }
        }
      ],
      communicationPatterns: ['request-response']
    },
    endpoints: {
      api: `http://${id}:3000`,
      health: `http://${id}:3000/health`,
      metrics: `http://${id}:3000/metrics`
    },
    health: {
      checkInterval: 30,
      timeout: 10,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      startupGracePeriod: 60
    },
    container: {
      image: {
        repository: `uep/${id}`,
        tag: 'latest',
        pullPolicy: 'IfNotPresent'
      },
      ports: [
        {
          name: 'http',
          containerPort: 3000,
          protocol: 'TCP',
          servicePort: 3000
        }
      ],
      resources: {
        requests: {
          memory: '256Mi',
          cpu: '250m'
        },
        limits: {
          memory: '512Mi',
          cpu: '500m'
        }
      },
      environment: [
        { name: 'NODE_ENV', value: 'development' },
        { name: 'UEP_VERSION', value: '2.0' },
        { name: 'LOG_LEVEL', value: 'info' }
      ]
    },
    capabilities,
    coordination: {
      loadBalancing: 'round-robin',
      retryPolicy: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2.0,
        retryableErrors: ['timeout', 'connection-refused', '5xx']
      }
    },
    security: {
      authMethods: ['none'],
      apiKeyRequired: false
    },
    observability: {
      metrics: {
        enabled: true,
        format: 'prometheus',
        path: '/metrics',
        interval: 15
      },
      logging: {
        level: 'info',
        format: 'json',
        output: 'stdout'
      }
    },
    metadata: {
      description: `${name} - ${agentType} for the UEP Meta-Agent Factory`,
      created: timestamp,
      lastUpdated: timestamp
    },
    ...options
  };
}

// =============================================================================
// DISCOVERY FUNCTIONS
// =============================================================================

/**
 * Filter agents based on discovery query
 */
export function filterAgents(
  agents: UEPAgentRegistration[],
  query: AgentDiscoveryQuery
): AgentDiscoveryResult {
  let filteredAgents = [...agents];

  // Filter by capabilities
  if (query.capabilities && query.capabilities.length > 0) {
    filteredAgents = filteredAgents.filter(agent =>
      query.capabilities!.some(capability =>
        agent.capabilities.includes(capability) ||
        agent.uep.protocolCapabilities.some(pc => pc.name === capability)
      )
    );
  }

  // Filter by agent type
  if (query.agentType) {
    filteredAgents = filteredAgents.filter(agent => agent.agentType === query.agentType);
  }

  // Filter by UEP version
  if (query.uepVersion) {
    filteredAgents = filteredAgents.filter(agent =>
      agent.uep.supportedVersions.includes(query.uepVersion!)
    );
  }

  // Filter by environment
  if (query.environment) {
    filteredAgents = filteredAgents.filter(agent =>
      agent.consul.meta.environment === query.environment
    );
  }

  // Filter by namespace
  if (query.namespace) {
    filteredAgents = filteredAgents.filter(agent =>
      agent.consul.meta.namespace === query.namespace
    );
  }

  // TODO: Implement health filtering when we have actual health status
  // This would require integration with actual health checking system
  if (query.healthyOnly) {
    // For now, assume all agents are healthy
    // In real implementation, check actual health status
  }

  const healthyCount = filteredAgents.length; // Placeholder

  return {
    agents: filteredAgents,
    total: filteredAgents.length,
    healthy: healthyCount,
    timestamp: new Date().toISOString()
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique agent ID based on name and type
 */
export function generateAgentId(name: string, agentType: AgentType): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const typePrefix = agentType === 'meta-agent' ? 'meta' : 
                    agentType === 'domain-agent' ? 'domain' :
                    agentType === 'infrastructure-service' ? 'infra' :
                    agentType === 'coordination-service' ? 'coord' :
                    'validation';
  
  return `${typePrefix}-${cleanName}`;
}

/**
 * Calculate the health score of an agent based on its configuration
 */
export function calculateHealthScore(registration: UEPAgentRegistration): number {
  let score = 0;

  // Base score for having required configuration
  score += 50;

  // Bonus for comprehensive health checks
  if (registration.health.customChecks && registration.health.customChecks.length > 0) {
    score += 10;
  }

  // Bonus for observability
  if (registration.observability?.metrics?.enabled) {
    score += 10;
  }
  if (registration.observability?.tracing?.enabled) {
    score += 10;
  }

  // Bonus for security features
  if (registration.security.tls?.enabled) {
    score += 10;
  }
  if (registration.security.authMethods.length > 1) {
    score += 5;
  }

  // Bonus for proper resource limits
  if (registration.container.resources.limits) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Generate Consul tags from agent registration
 */
export function generateConsulTags(registration: UEPAgentRegistration): string[] {
  const tags = new Set<string>();

  // Core tags
  tags.add('uep');
  tags.add(registration.agentType);
  tags.add(`v${registration.uep.activeVersion}`);
  tags.add(registration.consul.meta.environment);

  // Capability tags
  registration.capabilities.forEach(capability => {
    tags.add(`capability:${capability}`);
  });

  // UEP version tags
  registration.uep.supportedVersions.forEach(version => {
    tags.add(`uep-${version}`);
  });

  // Communication pattern tags
  if (registration.uep.communicationPatterns) {
    registration.uep.communicationPatterns.forEach(pattern => {
      tags.add(`comm:${pattern}`);
    });
  }

  // Container tags
  if (registration.container.image.tag !== 'latest') {
    tags.add(`image:${registration.container.image.tag}`);
  }

  // Security tags
  if (registration.security.tls?.enabled) {
    tags.add('tls-enabled');
  }

  // Namespace tag
  if (registration.consul.meta.namespace) {
    tags.add(`ns:${registration.consul.meta.namespace}`);
  }

  return Array.from(tags).sort();
}

/**
 * Merge two agent registrations (useful for updates)
 */
export function mergeRegistrations(
  base: UEPAgentRegistration,
  update: Partial<UEPAgentRegistration>
): UEPAgentRegistration {
  const merged = { ...base, ...update };

  // Update timestamp
  if (merged.metadata) {
    merged.metadata.lastUpdated = new Date().toISOString();
  }

  return merged;
}

/**
 * Check if two registrations are compatible for load balancing
 */
export function areRegistrationsCompatible(
  a: UEPAgentRegistration,
  b: UEPAgentRegistration
): boolean {
  // Same service name
  if (a.consul.serviceName !== b.consul.serviceName) {
    return false;
  }

  // Compatible UEP versions
  const commonVersions = a.uep.supportedVersions.filter(v =>
    b.uep.supportedVersions.includes(v)
  );
  if (commonVersions.length === 0) {
    return false;
  }

  // Same capabilities
  const aCapabilities = new Set(a.capabilities);
  const bCapabilities = new Set(b.capabilities);
  if (aCapabilities.size !== bCapabilities.size) {
    return false;
  }
  for (const cap of aCapabilities) {
    if (!bCapabilities.has(cap)) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// PREDEFINED TEMPLATES
// =============================================================================

/**
 * Predefined templates for common agent types
 */
export const AGENT_TEMPLATES = {
  /**
   * Meta-Agent Factory template
   */
  metaAgentFactory: (): UEPAgentRegistration => 
    createAgentRegistrationTemplate(
      'meta-agent-factory',
      'Meta-Agent Factory',
      'meta-agent',
      ['agent-coordination', 'project-scaffolding', 'validation', 'orchestration'],
      {
        version: '2.0.0',
        container: {
          image: {
            repository: 'uep/meta-agent-factory',
            tag: 'v2.0.0',
            pullPolicy: 'IfNotPresent'
          },
          ports: [
            { name: 'http', containerPort: 3000, protocol: 'TCP', servicePort: 3000 },
            { name: 'grpc', containerPort: 8502, protocol: 'TCP', servicePort: 8502 }
          ],
          resources: {
            requests: { memory: '512Mi', cpu: '500m' },
            limits: { memory: '1Gi', cpu: '1' }
          },
          environment: [
            { name: 'NODE_ENV', value: 'production' },
            { name: 'UEP_VERSION', value: '2.0' },
            { name: 'LOG_LEVEL', value: 'info' }
          ]
        },
        coordination: {
          loadBalancing: 'least-connections',
          retryPolicy: {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2.0,
            retryableErrors: ['timeout', 'connection-refused', '5xx']
          },
          circuitBreaker: {
            enabled: true,
            failureThreshold: 5,
            timeoutMs: 60000,
            resetTimeoutMs: 300000
          }
        }
      }
    ),

  /**
   * Backend Agent template
   */
  backendAgent: (): UEPAgentRegistration =>
    createAgentRegistrationTemplate(
      'backend-agent',
      'Backend Development Agent',
      'domain-agent',
      ['backend-development', 'api-generation', 'database-design', 'testing'],
      {
        consul: {
          serviceName: 'backend-agent',
          tags: ['uep', 'domain-agent', 'backend', 'development'],
          meta: {
            uep_version: '2.0',
            uep_capabilities: 'backend-development,api-generation,database-design,testing',
            environment: 'development',
            load_balancing: 'round-robin',
            specialization: 'backend'
          },
          check: {
            http: 'http://backend-agent:3000/health',
            interval: '30s',
            timeout: '10s'
          }
        }
      }
    ),

  /**
   * UEP Registry template
   */
  uepRegistry: (): UEPAgentRegistration =>
    createAgentRegistrationTemplate(
      'uep-registry',
      'UEP Registry Service',
      'infrastructure-service',
      ['service-discovery', 'agent-registration', 'health-monitoring'],
      {
        consul: {
          serviceName: 'uep-registry',
          tags: ['uep', 'infrastructure', 'registry', 'service-discovery'],
          meta: {
            uep_version: '2.0',
            uep_capabilities: 'service-discovery,agent-registration,health-monitoring',
            environment: 'production',
            load_balancing: 'round-robin',
            critical: 'true'
          },
          check: {
            http: 'http://uep-registry:3000/health',
            interval: '15s',
            timeout: '5s'
          }
        }
      }
    )
};

export default {
  validateAgentRegistration,
  toConsulService,
  createAgentRegistrationTemplate,
  filterAgents,
  generateAgentId,
  calculateHealthScore,
  generateConsulTags,
  mergeRegistrations,
  areRegistrationsCompatible,
  AGENT_TEMPLATES
};