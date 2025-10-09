/**
 * UEP Agent Registration Data Model - TypeScript Interfaces
 * 
 * Complete type definitions for registering UEP agents with Consul service discovery,
 * supporting containerized microservices architecture and UEP protocol compliance.
 * 
 * @version 2.0.0
 * @author UEP Meta-Agent Factory
 * @since 2025-01-28
 */

// =============================================================================
// CORE AGENT REGISTRATION INTERFACE
// =============================================================================

/**
 * Complete agent registration data structure for UEP agents in Consul
 */
export interface UEPAgentRegistration {
  /** Unique agent identifier (DNS-compliant, globally unique) */
  id: string;
  
  /** Human-readable agent name for display and logging */
  name: string;
  
  /** Semantic version following semver specification */
  version: string;
  
  /** Category of agent for organizational and routing purposes */
  agentType: AgentType;
  
  /** Consul-specific registration configuration */
  consul: ConsulConfiguration;
  
  /** UEP protocol-specific configuration */
  uep: UEPConfiguration;
  
  /** Network endpoints for agent communication */
  endpoints: EndpointConfiguration;
  
  /** Health monitoring configuration */
  health: HealthConfiguration;
  
  /** Container and deployment configuration */
  container: ContainerConfiguration;
  
  /** List of capabilities provided by this agent */
  capabilities: string[];
  
  /** Agent coordination and dependency configuration */
  coordination: CoordinationConfiguration;
  
  /** Security and authentication configuration */
  security: SecurityConfiguration;
  
  /** Monitoring and observability configuration */
  observability?: ObservabilityConfiguration;
  
  /** Additional metadata and configuration */
  metadata?: MetadataConfiguration;
}

// =============================================================================
// ENUMERATION TYPES
// =============================================================================

export type AgentType = 
  | 'meta-agent'
  | 'domain-agent'
  | 'infrastructure-service'
  | 'coordination-service'
  | 'validation-service';

export type Environment = 'development' | 'staging' | 'production';

export type LoadBalancingStrategy = 
  | 'round-robin'
  | 'weighted'
  | 'least-connections'
  | 'random'
  | 'consistent-hash';

export type MessageType = 
  | 'task'
  | 'command'
  | 'query'
  | 'event'
  | 'validation'
  | 'coordination';

export type CommunicationPattern = 
  | 'request-response'
  | 'publish-subscribe'
  | 'streaming'
  | 'event-driven';

export type DependencyType = 'required' | 'optional' | 'fallback';

export type AuthMethod = 'jwt' | 'mutual-tls' | 'api-key' | 'oauth2' | 'none';

export type MetricsFormat = 'prometheus' | 'statsd' | 'opentelemetry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFormat = 'json' | 'text';

export type LogOutput = 'stdout' | 'stderr' | 'file';

export type TraceSampler = 'always' | 'never' | 'probabilistic';

export type TraceExporter = 'jaeger' | 'zipkin' | 'otlp';

export type ImagePullPolicy = 'Always' | 'IfNotPresent' | 'Never';

export type Protocol = 'TCP' | 'UDP';

export type ClusterRole = 'primary' | 'secondary' | 'follower';

export type HealthCheckType = 'tcp' | 'script' | 'grpc' | 'docker';

// =============================================================================
// CONSUL CONFIGURATION
// =============================================================================

export interface ConsulConfiguration {
  /** Service name in Consul (must be DNS-compliant) */
  serviceName: string;
  
  /** Tags for service discovery and filtering */
  tags: string[];
  
  /** Metadata for Consul service registration */
  meta: ConsulMetadata;
  
  /** Health check configuration for Consul */
  check: ConsulHealthCheck;
  
  /** Service weights for load balancing */
  weights?: ConsulWeights;
}

export interface ConsulMetadata {
  /** Active UEP protocol version */
  uep_version: string;
  
  /** Comma-separated list of agent capabilities */
  uep_capabilities: string;
  
  /** Deployment environment */
  environment: Environment;
  
  /** Preferred load balancing strategy */
  load_balancing?: LoadBalancingStrategy;
  
  /** Kubernetes namespace (for containerized deployments) */
  namespace?: string;
  
  /** Role in multi-instance deployments */
  cluster_role?: ClusterRole;
  
  /** Additional custom metadata */
  [key: string]: string | undefined;
}

export interface ConsulHealthCheck {
  /** HTTP health check endpoint URL */
  http: string;
  
  /** Health check interval (e.g., '30s', '1m', '5m') */
  interval: string;
  
  /** Health check timeout (e.g., '10s', '30s') */
  timeout: string;
  
  /** Time after which critical services are deregistered */
  deregister_critical_service_after?: string;
  
  /** Skip TLS certificate verification for health checks */
  tls_skip_verify?: boolean;
}

export interface ConsulWeights {
  /** Weight when all health checks are passing */
  passing?: number;
  
  /** Weight when health checks are in warning state */
  warning?: number;
}

// =============================================================================
// UEP PROTOCOL CONFIGURATION
// =============================================================================

export interface UEPConfiguration {
  /** List of supported UEP protocol versions */
  supportedVersions: string[];
  
  /** Current active UEP protocol version */
  activeVersion: string;
  
  /** UEP protocol capabilities */
  protocolCapabilities: UEPProtocolCapability[];
  
  /** Supported communication patterns */
  communicationPatterns?: CommunicationPattern[];
}

export interface UEPProtocolCapability {
  /** Unique capability identifier */
  id: string;
  
  /** Human-readable capability name */
  name: string;
  
  /** Capability implementation version */
  version: string;
  
  /** UEP message types supported by this capability */
  messageTypes: MessageType[];
  
  /** Performance characteristics */
  performance: PerformanceMetrics;
  
  /** Validation requirements */
  validationRules?: ValidationRule[];
}

export interface PerformanceMetrics {
  /** Maximum requests per second */
  maxThroughput: number;
  
  /** Average response time in milliseconds */
  averageLatency: number;
  
  /** Maximum concurrent requests */
  maxConcurrency: number;
}

export interface ValidationRule {
  /** Validation rule identifier */
  ruleId: string;
  
  /** Human-readable rule description */
  description?: string;
  
  /** Whether this validation rule is required */
  mandatory: boolean;
  
  /** Rule-specific parameters */
  parameters?: Record<string, any>;
}

// =============================================================================
// ENDPOINT CONFIGURATION
// =============================================================================

export interface EndpointConfiguration {
  /** Main API endpoint for agent interactions */
  api: string;
  
  /** Health check endpoint for monitoring */
  health: string;
  
  /** Optional metrics endpoint for observability */
  metrics?: string;
  
  /** Optional administrative endpoint for management */
  admin?: string;
  
  /** Optional gRPC endpoint for high-performance communication */
  grpc?: string;
}

// =============================================================================
// HEALTH CONFIGURATION
// =============================================================================

export interface HealthConfiguration {
  /** Health check interval in seconds */
  checkInterval: number;
  
  /** Health check timeout in seconds */
  timeout: number;
  
  /** Number of consecutive successful checks to mark healthy */
  healthyThreshold: number;
  
  /** Number of consecutive failed checks to mark unhealthy */
  unhealthyThreshold: number;
  
  /** Grace period during startup (seconds) before health checks begin */
  startupGracePeriod?: number;
  
  /** Custom health checks */
  customChecks?: CustomHealthCheck[];
}

export interface CustomHealthCheck {
  /** Custom health check name */
  name: string;
  
  /** Type of custom health check */
  type: HealthCheckType;
  
  /** Type-specific configuration for the health check */
  config: Record<string, any>;
}

// =============================================================================
// CONTAINER CONFIGURATION
// =============================================================================

export interface ContainerConfiguration {
  /** Container image configuration */
  image: ImageConfiguration;
  
  /** Container port configuration */
  ports: PortConfiguration[];
  
  /** Container resource configuration */
  resources: ResourceConfiguration;
  
  /** Environment variables */
  environment?: EnvironmentVariable[];
  
  /** Volume mounts */
  volumes?: VolumeConfiguration[];
}

export interface ImageConfiguration {
  /** Container image repository */
  repository: string;
  
  /** Container image tag */
  tag: string;
  
  /** Container image pull policy */
  pullPolicy?: ImagePullPolicy;
}

export interface PortConfiguration {
  /** Port name for reference */
  name: string;
  
  /** Port number inside the container */
  containerPort: number;
  
  /** Port protocol */
  protocol: Protocol;
  
  /** Port number exposed by the service */
  servicePort?: number;
}

export interface ResourceConfiguration {
  /** Resource requests */
  requests: ResourceRequirements;
  
  /** Resource limits */
  limits?: ResourceRequirements;
}

export interface ResourceRequirements {
  /** Memory request/limit (e.g., '512Mi', '1Gi') */
  memory: string;
  
  /** CPU request/limit (e.g., '500m', '1') */
  cpu: string;
}

export interface EnvironmentVariable {
  /** Environment variable name */
  name: string;
  
  /** Environment variable value */
  value?: string;
  
  /** Source for environment variable value (ConfigMap, Secret, etc.) */
  valueFrom?: Record<string, any>;
}

export interface VolumeConfiguration {
  /** Volume name */
  name: string;
  
  /** Path where volume is mounted in container */
  mountPath: string;
  
  /** Whether volume is read-only */
  readOnly?: boolean;
  
  /** Volume source configuration */
  source?: Record<string, any>;
}

// =============================================================================
// COORDINATION CONFIGURATION
// =============================================================================

export interface CoordinationConfiguration {
  /** Agent dependencies */
  dependencies?: AgentDependency[];
  
  /** Preferred load balancing strategy */
  loadBalancing: LoadBalancingStrategy;
  
  /** Retry policy configuration */
  retryPolicy: RetryPolicyConfiguration;
  
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfiguration;
  
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfiguration;
}

export interface AgentDependency {
  /** ID of the dependent agent */
  agentId: string;
  
  /** Type of dependency relationship */
  dependencyType: DependencyType;
  
  /** Whether to monitor dependency health */
  healthCheckEnabled?: boolean;
  
  /** Timeout for dependency calls in milliseconds */
  timeoutMs?: number;
}

export interface RetryPolicyConfiguration {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Base delay between retries in milliseconds */
  baseDelayMs: number;
  
  /** Maximum delay between retries */
  maxDelayMs?: number;
  
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier?: number;
  
  /** Error types that should trigger retries */
  retryableErrors?: string[];
}

export interface CircuitBreakerConfiguration {
  /** Whether circuit breaker is enabled */
  enabled: boolean;
  
  /** Number of failures before opening circuit */
  failureThreshold?: number;
  
  /** Circuit breaker timeout in milliseconds */
  timeoutMs?: number;
  
  /** Time before attempting to close circuit */
  resetTimeoutMs?: number;
}

export interface RateLimitConfiguration {
  /** Whether rate limiting is enabled */
  enabled: boolean;
  
  /** Maximum requests per second */
  requestsPerSecond?: number;
  
  /** Maximum burst size */
  burstSize?: number;
  
  /** Rate limit window size in milliseconds */
  windowSizeMs?: number;
}

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

export interface SecurityConfiguration {
  /** Supported authentication methods */
  authMethods: AuthMethod[];
  
  /** TLS configuration */
  tls?: TLSConfiguration;
  
  /** Allowed origins for CORS */
  allowedOrigins?: string[];
  
  /** Whether API key authentication is required */
  apiKeyRequired?: boolean;
  
  /** Role-based access control configuration */
  rbac?: RBACConfiguration;
}

export interface TLSConfiguration {
  /** Whether TLS is enabled */
  enabled: boolean;
  
  /** Path to TLS certificate file */
  certPath?: string;
  
  /** Path to TLS private key file */
  keyPath?: string;
  
  /** Path to CA certificate file */
  caPath?: string;
  
  /** Whether to verify client certificates */
  verifyClient?: boolean;
}

export interface RBACConfiguration {
  /** Whether RBAC is enabled */
  enabled: boolean;
  
  /** Role definitions */
  roles?: RoleDefinition[];
}

export interface RoleDefinition {
  /** Role name */
  name: string;
  
  /** List of permissions for this role */
  permissions: string[];
}

// =============================================================================
// OBSERVABILITY CONFIGURATION
// =============================================================================

export interface ObservabilityConfiguration {
  /** Metrics configuration */
  metrics?: MetricsConfiguration;
  
  /** Logging configuration */
  logging?: LoggingConfiguration;
  
  /** Tracing configuration */
  tracing?: TracingConfiguration;
}

export interface MetricsConfiguration {
  /** Whether metrics collection is enabled */
  enabled: boolean;
  
  /** Metrics format */
  format?: MetricsFormat;
  
  /** Metrics endpoint path */
  path?: string;
  
  /** Metrics collection interval in seconds */
  interval?: number;
}

export interface LoggingConfiguration {
  /** Logging level */
  level?: LogLevel;
  
  /** Log format */
  format?: LogFormat;
  
  /** Log output destination */
  output?: LogOutput;
}

export interface TracingConfiguration {
  /** Whether distributed tracing is enabled */
  enabled: boolean;
  
  /** Trace sampling strategy */
  sampler?: TraceSampler;
  
  /** Sampling rate for traces */
  samplingRate?: number;
  
  /** Trace exporter type */
  exporter?: TraceExporter;
}

// =============================================================================
// METADATA CONFIGURATION
// =============================================================================

export interface MetadataConfiguration {
  /** Brief description of the agent's purpose and functionality */
  description?: string;
  
  /** Documentation URLs */
  documentation?: DocumentationConfiguration;
  
  /** Key-value labels for organization and filtering */
  labels?: Record<string, string>;
  
  /** Additional annotations for external tools */
  annotations?: Record<string, string>;
  
  /** Timestamp when registration was created */
  created?: string;
  
  /** Timestamp when registration was last updated */
  lastUpdated?: string;
}

export interface DocumentationConfiguration {
  /** URL to agent documentation */
  url?: string;
  
  /** URL to OpenAPI/Swagger specification */
  apiSpec?: string;
}

// =============================================================================
// CONSUL SERVICE REGISTRATION FORMAT
// =============================================================================

/**
 * Consul service registration payload format
 * Used for direct registration with Consul API
 */
export interface ConsulService {
  /** Service ID (unique per node) */
  ID: string;
  
  /** Service name */
  Name: string;
  
  /** Service tags */
  Tags: string[];
  
  /** Service address */
  Address: string;
  
  /** Service port */
  Port: number;
  
  /** Service metadata */
  Meta: Record<string, string>;
  
  /** Health check configuration */
  Check: ConsulServiceCheck;
  
  /** Service weights */
  Weights?: ConsulServiceWeights;
}

export interface ConsulServiceCheck {
  /** HTTP endpoint for health checks */
  HTTP?: string;
  
  /** Health check interval */
  Interval: string;
  
  /** Health check timeout */
  Timeout: string;
  
  /** Deregister service after being critical for this long */
  DeregisterCriticalServiceAfter?: string;
  
  /** Skip TLS verification */
  TLSSkipVerify?: boolean;
}

export interface ConsulServiceWeights {
  /** Weight for passing instances */
  Passing: number;
  
  /** Weight for warning instances */
  Warning: number;
}

// =============================================================================
// UTILITY TYPES AND HELPERS
// =============================================================================

/**
 * Agent registration validation result
 */
export interface ValidationResult {
  /** Whether the registration is valid */
  valid: boolean;
  
  /** List of validation errors */
  errors: string[];
  
  /** List of validation warnings */
  warnings: string[];
}

/**
 * Agent registration status
 */
export type RegistrationStatus = 'registering' | 'registered' | 'healthy' | 'unhealthy' | 'deregistered';

/**
 * Agent discovery query
 */
export interface AgentDiscoveryQuery {
  /** Filter by capabilities */
  capabilities?: string[];
  
  /** Filter by agent type */
  agentType?: AgentType;
  
  /** Filter by UEP protocol version */
  uepVersion?: string;
  
  /** Filter by environment */
  environment?: Environment;
  
  /** Filter by namespace */
  namespace?: string;
  
  /** Include only healthy agents */
  healthyOnly?: boolean;
}

/**
 * Agent discovery result
 */
export interface AgentDiscoveryResult {
  /** List of matching agents */
  agents: UEPAgentRegistration[];
  
  /** Total number of agents found */
  total: number;
  
  /** Number of healthy agents */
  healthy: number;
  
  /** Discovery timestamp */
  timestamp: string;
}

// =============================================================================
// EXAMPLE REGISTRATIONS
// =============================================================================

/**
 * Example Meta-Agent Factory registration
 */
export const EXAMPLE_META_AGENT_REGISTRATION: UEPAgentRegistration = {
  id: 'meta-agent-factory',
  name: 'Meta-Agent Factory',
  version: '2.0.0',
  agentType: 'meta-agent',
  consul: {
    serviceName: 'meta-agent-factory',
    tags: ['uep', 'meta-agent', 'factory', 'v2.0', 'production'],
    meta: {
      uep_version: '2.0',
      uep_capabilities: 'coordination,scaffolding,validation,orchestration',
      environment: 'production',
      load_balancing: 'least-connections',
      namespace: 'uep-system',
      cluster_role: 'primary'
    },
    check: {
      http: 'http://meta-agent-factory:3000/health',
      interval: '30s',
      timeout: '10s',
      deregister_critical_service_after: '10m'
    },
    weights: {
      passing: 10,
      warning: 1
    }
  },
  uep: {
    supportedVersions: ['2.0', '1.5'],
    activeVersion: '2.0',
    protocolCapabilities: [
      {
        id: 'coordination',
        name: 'Agent Coordination',
        version: '2.0.0',
        messageTypes: ['task', 'command', 'coordination'],
        performance: {
          maxThroughput: 1000,
          averageLatency: 50,
          maxConcurrency: 100
        },
        validationRules: [
          {
            ruleId: 'uep-header-validation',
            description: 'Validate UEP headers are present',
            mandatory: true,
            parameters: {
              required_headers: ['x-uep-version', 'x-uep-agent-id']
            }
          }
        ]
      }
    ],
    communicationPatterns: ['request-response', 'event-driven']
  },
  endpoints: {
    api: 'http://meta-agent-factory:3000',
    health: 'http://meta-agent-factory:3000/health',
    metrics: 'http://meta-agent-factory:3000/metrics',
    admin: 'http://meta-agent-factory:3000/admin'
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
      repository: 'uep/meta-agent-factory',
      tag: 'v2.0.0',
      pullPolicy: 'IfNotPresent'
    },
    ports: [
      {
        name: 'http',
        containerPort: 3000,
        protocol: 'TCP',
        servicePort: 3000
      },
      {
        name: 'grpc',
        containerPort: 8502,
        protocol: 'TCP',
        servicePort: 8502
      }
    ],
    resources: {
      requests: {
        memory: '512Mi',
        cpu: '500m'
      },
      limits: {
        memory: '1Gi',
        cpu: '1'
      }
    },
    environment: [
      { name: 'NODE_ENV', value: 'production' },
      { name: 'UEP_VERSION', value: '2.0' },
      { name: 'LOG_LEVEL', value: 'info' }
    ]
  },
  capabilities: [
    'agent-coordination',
    'project-scaffolding',
    'validation',
    'orchestration'
  ],
  coordination: {
    dependencies: [
      {
        agentId: 'uep-registry',
        dependencyType: 'required',
        healthCheckEnabled: true,
        timeoutMs: 5000
      }
    ],
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
  },
  security: {
    authMethods: ['jwt', 'api-key'],
    tls: {
      enabled: true,
      verifyClient: false
    },
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
    },
    tracing: {
      enabled: true,
      sampler: 'probabilistic',
      samplingRate: 0.1,
      exporter: 'jaeger'
    }
  },
  metadata: {
    description: 'Central coordination agent for the UEP Meta-Agent Factory system',
    documentation: {
      url: 'https://docs.all-purpose.dev/agents/meta-agent-factory',
      apiSpec: 'https://api.all-purpose.dev/meta-agent-factory/openapi.json'
    },
    labels: {
      component: 'meta-agent',
      tier: 'coordination',
      critical: 'true'
    },
    annotations: {
      'prometheus.io/scrape': 'true',
      'prometheus.io/port': '3000',
      'prometheus.io/path': '/metrics'
    },
    created: '2025-01-28T10:00:00Z',
    lastUpdated: '2025-01-28T10:00:00Z'
  }
};

/**
 * Export all types for external use
 */
export default UEPAgentRegistration;