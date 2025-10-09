/**
 * Agent Registration Data Model and Metadata Schema
 * Task 220.3: Define comprehensive data structures for UEP agent registration
 */

export interface UEPAgentCapability {
  name: string;
  version: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  dependencies?: string[];
  resourceRequirements?: ResourceRequirements;
}

export interface ResourceRequirements {
  cpu: {
    min: string;    // e.g., "100m"
    max: string;    // e.g., "500m"
    preferred: string; // e.g., "250m"
  };
  memory: {
    min: string;    // e.g., "128Mi"
    max: string;    // e.g., "512Mi"
    preferred: string; // e.g., "256Mi"
  };
  storage?: {
    temporary: string; // e.g., "1Gi"
    persistent?: string; // e.g., "5Gi"
  };
  gpu?: {
    required: boolean;
    type?: string;  // e.g., "nvidia.com/gpu"
    count?: number;
  };
}

export interface HealthCheckConfig {
  endpoint: string;           // e.g., "/health"
  method: 'GET' | 'POST';
  interval: string;           // e.g., "15s"
  timeout: string;           // e.g., "5s"
  initialDelay?: string;     // e.g., "30s"
  failureThreshold: number;  // Number of failures before unhealthy
  successThreshold: number;  // Number of successes to be healthy
  expectedStatus?: number;   // Expected HTTP status code (default: 200)
  expectedResponse?: string; // Expected response body pattern
}

export interface LoadMetrics {
  currentLoad: number;        // 0-100 percentage
  maxCapacity: number;        // Maximum concurrent operations
  averageResponseTime: number; // Milliseconds
  errorRate: number;          // 0-1 percentage
  queueLength: number;        // Current queue size
  lastUpdated: string;        // ISO 8601 timestamp
}

export interface AgentVersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  gitCommit?: string;
  buildDate?: string;
}

export interface NetworkConfig {
  address: string;     // IP address or hostname
  port: number;        // Primary service port
  additionalPorts?: Record<string, number>; // Named additional ports
  protocol: 'http' | 'https' | 'grpc' | 'tcp';
  tlsEnabled: boolean;
  healthCheckPort?: number;
  metricsPort?: number;
}

export interface SecurityContext {
  tlsRequired: boolean;
  certificateFingerprint?: string;
  allowedClients?: string[]; // Client certificate subjects
  aclTokens?: {
    agent: string;
    service: string;
  };
  encryptionEnabled: boolean;
  auditLogging: boolean;
}

export interface MonitoringConfig {
  metricsEnabled: boolean;
  metricsEndpoint: string;    // e.g., "/metrics"
  metricsFormat: 'prometheus' | 'json' | 'statsd';
  tracingEnabled: boolean;
  tracingEndpoint?: string;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  healthMetrics: boolean;
}

export interface AgentRegistrationMetadata {
  // Core identification
  agentId: string;            // Unique identifier (UUID)
  agentName: string;          // Human-readable name
  agentType: string;          // e.g., "prd-parser", "scaffold-generator"
  instanceId: string;         // Unique instance identifier
  
  // Version and build information
  version: AgentVersionInfo;
  
  // Capabilities and features
  capabilities: UEPAgentCapability[];
  supportedProtocols: string[]; // e.g., ["UEP/2.0", "HTTP/1.1", "gRPC"]
  
  // Network configuration
  network: NetworkConfig;
  
  // Resource information
  resources: ResourceRequirements;
  currentMetrics: LoadMetrics;
  
  // Health and monitoring
  healthCheck: HealthCheckConfig;
  monitoring: MonitoringConfig;
  
  // Security configuration
  security: SecurityContext;
  
  // Environment and deployment
  environment: 'development' | 'staging' | 'production';
  cluster: string;            // Cluster identifier
  namespace: string;          // Kubernetes namespace
  podName?: string;           // Kubernetes pod name
  nodeName?: string;          // Kubernetes node name
  
  // Operational metadata
  startTime: string;          // ISO 8601 timestamp
  lastHeartbeat: string;      // ISO 8601 timestamp
  registrationTime: string;   // ISO 8601 timestamp
  status: AgentStatus;
  
  // Configuration and feature flags
  configuration: Record<string, any>;
  featureFlags: Record<string, boolean>;
  
  // Custom metadata
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export type AgentStatus = 
  | 'initializing'     // Agent is starting up
  | 'healthy'         // Agent is operational
  | 'degraded'        // Agent has issues but still functional
  | 'unhealthy'       // Agent is not functioning properly
  | 'maintenance'     // Agent is in maintenance mode
  | 'shutting-down'   // Agent is gracefully shutting down
  | 'unknown';        // Status cannot be determined

export interface ConsulServiceRegistration {
  // Consul-specific fields
  ID: string;                 // Unique service ID
  Name: string;              // Service name
  Tags: string[];            // Service tags for filtering
  Address: string;           // Service address
  Port: number;              // Service port
  
  // Metadata (Consul's Meta field)
  Meta: {
    // UEP Protocol metadata
    uep_protocol_version: string;
    uep_agent_type: string;
    uep_capabilities: string;        // Comma-separated list
    uep_version: string;
    
    // Performance metadata
    current_load: string;
    max_capacity: string;
    avg_response_time: string;
    error_rate: string;
    
    // Environment metadata
    environment: string;
    cluster: string;
    namespace: string;
    pod_name?: string;
    node_name?: string;
    
    // Operational metadata
    start_time: string;
    last_heartbeat: string;
    registration_time: string;
    
    // Security metadata
    tls_enabled: string;
    encryption_enabled: string;
    certificate_fingerprint?: string;
    
    // Custom metadata
    [key: string]: string;
  };
  
  // Health check configuration
  Check?: {
    Name: string;
    HTTP?: string;
    HTTPS?: string;
    TCP?: string;
    Script?: string;
    Interval: string;
    Timeout: string;
    DeregisterCriticalServiceAfter?: string;
    TLSSkipVerify?: boolean;
    Method?: string;
    Header?: Record<string, string[]>;
    Body?: string;
  };
  
  // Connect proxy configuration (for service mesh)
  Connect?: {
    SidecarService?: {
      Tags: string[];
      Port: number;
      Proxy: {
        Upstreams: Array<{
          DestinationType: string;
          DestinationName: string;
          LocalBindPort: number;
        }>;
        Config: Record<string, any>;
      };
    };
  };
  
  // Weights for load balancing
  Weights?: {
    Passing: number;
    Warning: number;
  };
}

export interface ServiceDiscoveryQuery {
  // Basic filtering
  serviceName?: string;
  agentType?: string;
  capabilities?: string[];
  tags?: string[];
  
  // Environmental filtering
  environment?: string;
  cluster?: string;
  namespace?: string;
  
  // Status filtering
  status?: AgentStatus[];
  healthyOnly?: boolean;
  
  // Performance filtering
  maxLoad?: number;
  minCapacity?: number;
  maxResponseTime?: number;
  maxErrorRate?: number;
  
  // Geographic/network filtering
  region?: string;
  zone?: string;
  network?: string;
  
  // Sorting and limiting
  sortBy?: 'load' | 'response_time' | 'error_rate' | 'capacity' | 'registration_time';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ServiceDiscoveryResult {
  agents: AgentRegistrationMetadata[];
  totalCount: number;
  query: ServiceDiscoveryQuery;
  executionTime: number; // milliseconds
  timestamp: string;     // ISO 8601
}

export interface AgentRegistrationEvent {
  eventType: 'register' | 'deregister' | 'update' | 'health_change';
  agentId: string;
  timestamp: string;
  metadata?: Partial<AgentRegistrationMetadata>;
  previousMetadata?: Partial<AgentRegistrationMetadata>;
  reason?: string;
  source: string; // Component that triggered the event
}

// Validation schemas and type guards
export function isValidAgentId(agentId: string): boolean {
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(agentId);
}

export function isValidAgentStatus(status: string): status is AgentStatus {
  const validStatuses = ['initializing', 'healthy', 'degraded', 'unhealthy', 'maintenance', 'shutting-down', 'unknown'];
  return validStatuses.includes(status);
}

export function validateAgentRegistration(registration: Partial<AgentRegistrationMetadata>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Required fields validation
  if (!registration.agentId) {
    errors.push('agentId is required');
  } else if (!isValidAgentId(registration.agentId)) {
    errors.push('agentId must be a valid UUID');
  }
  
  if (!registration.agentName) {
    errors.push('agentName is required');
  }
  
  if (!registration.agentType) {
    errors.push('agentType is required');
  }
  
  if (!registration.network?.address) {
    errors.push('network.address is required');
  }
  
  if (!registration.network?.port || registration.network.port < 1 || registration.network.port > 65535) {
    errors.push('network.port must be a valid port number (1-65535)');
  }
  
  if (registration.status && !isValidAgentStatus(registration.status)) {
    errors.push('status must be a valid AgentStatus');
  }
  
  // Capability validation
  if (registration.capabilities) {
    for (const capability of registration.capabilities) {
      if (!capability.name || !capability.version) {
        errors.push(`capability missing required fields: ${JSON.stringify(capability)}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function convertToConsulRegistration(metadata: AgentRegistrationMetadata): ConsulServiceRegistration {
  return {
    ID: metadata.agentId,
    Name: `uep-${metadata.agentType}`,
    Tags: [
      'uep-meta-agent',
      `agent-type:${metadata.agentType}`,
      `environment:${metadata.environment}`,
      `version:${metadata.version.major}.${metadata.version.minor}.${metadata.version.patch}`,
      ...metadata.capabilities.map(cap => `capability:${cap.name}`),
      ...Object.entries(metadata.labels).map(([key, value]) => `${key}:${value}`)
    ],
    Address: metadata.network.address,
    Port: metadata.network.port,
    
    Meta: {
      uep_protocol_version: metadata.supportedProtocols.find(p => p.startsWith('UEP/')) || 'UEP/2.0',
      uep_agent_type: metadata.agentType,
      uep_capabilities: metadata.capabilities.map(cap => cap.name).join(','),
      uep_version: `${metadata.version.major}.${metadata.version.minor}.${metadata.version.patch}`,
      
      current_load: metadata.currentMetrics.currentLoad.toString(),
      max_capacity: metadata.currentMetrics.maxCapacity.toString(),
      avg_response_time: metadata.currentMetrics.averageResponseTime.toString(),
      error_rate: metadata.currentMetrics.errorRate.toString(),
      
      environment: metadata.environment,
      cluster: metadata.cluster,
      namespace: metadata.namespace,
      pod_name: metadata.podName,
      node_name: metadata.nodeName,
      
      start_time: metadata.startTime,
      last_heartbeat: metadata.lastHeartbeat,
      registration_time: metadata.registrationTime,
      
      tls_enabled: metadata.security.tlsRequired.toString(),
      encryption_enabled: metadata.security.encryptionEnabled.toString(),
      certificate_fingerprint: metadata.security.certificateFingerprint,
      
      ...Object.entries(metadata.annotations).reduce((acc, [key, value]) => {
        acc[`annotation_${key}`] = value;
        return acc;
      }, {} as Record<string, string>)
    },
    
    Check: {
      Name: `${metadata.agentType} Health Check`,
      [metadata.network.protocol.toUpperCase()]: `${metadata.network.protocol}://${metadata.network.address}:${metadata.healthCheck.endpoint ? metadata.network.port : (metadata.network.healthCheckPort || metadata.network.port)}${metadata.healthCheck.endpoint}`,
      Interval: metadata.healthCheck.interval,
      Timeout: metadata.healthCheck.timeout,
      DeregisterCriticalServiceAfter: '60s',
      TLSSkipVerify: !metadata.security.tlsRequired,
      Method: metadata.healthCheck.method
    },
    
    Weights: {
      Passing: Math.max(1, Math.round(100 - metadata.currentMetrics.currentLoad)),
      Warning: Math.max(1, Math.round(50 - metadata.currentMetrics.currentLoad / 2))
    }
  };
}

// Export type utilities
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AgentRegistrationUpdate = DeepPartial<AgentRegistrationMetadata> & {
  agentId: string; // Always required for updates
  lastHeartbeat: string; // Always updated
};