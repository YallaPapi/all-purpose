/**
 * Agent Registration Framework - Core Types and Interfaces
 * 
 * This module defines the core data structures and interfaces for the agent
 * registration framework, providing type safety and standardization for
 * agent metadata, capabilities, and health status reporting.
 */

/**
 * Represents the registration data structure for an agent
 * containing all necessary metadata for service discovery and coordination
 */
export interface AgentRegistration {
  /** Unique agent identifier - must be globally unique across all agents */
  id: string;
  
  /** Human-readable agent name for display and logging purposes */
  name: string;
  
  /** Semantic version following semver specification (e.g., "1.2.3") */
  version: string;
  
  /** Array of capability identifiers that this agent provides */
  capabilities: string[];
  
  /** Network endpoints where the agent can be reached */
  endpoints: {
    /** Health check endpoint for monitoring agent status */
    health: string;
    /** Main API endpoint for agent interactions */
    api: string;
    /** Optional metrics endpoint for performance monitoring */
    metrics?: string;
  };
  
  /** Additional metadata and configuration for the agent */
  metadata: {
    /** Brief description of the agent's purpose and functionality */
    description: string;
    /** Optional resource requirements for container orchestration */
    resourceRequirements?: {
      /** Memory limit in Kubernetes format (e.g., "512Mi", "1Gi") */
      memory?: string;
      /** CPU limit in Kubernetes format (e.g., "0.5", "1000m") */
      cpu?: string;
    };
    /** Optional categorization tags for filtering and organization */
    tags?: string[];
  };
  
  /** Current operational status of the agent */
  status: AgentStatus;
}

/**
 * Enumeration of possible agent operational states
 */
export type AgentStatus = "starting" | "healthy" | "degraded" | "unhealthy";

/**
 * Configuration options for the agent registrar
 */
export interface RegistrarConfig {
  /** Service registry endpoint (e.g., Consul, etcd) */
  registryEndpoint: string;
  
  /** Agent registration data */
  registration: AgentRegistration;
  
  /** Health check interval in milliseconds (default: 30000) */
  healthCheckInterval?: number;
  
  /** Maximum retry attempts for registration failures (default: 5) */
  maxRetryAttempts?: number;
  
  /** Initial retry delay in milliseconds (default: 1000) */
  initialRetryDelay?: number;
  
  /** Maximum retry delay in milliseconds (default: 30000) */
  maxRetryDelay?: number;
  
  /** Optional authentication configuration for registry access */
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  /** Overall health status */
  status: AgentStatus;
  
  /** Timestamp of the health check */
  timestamp: Date;
  
  /** Optional detailed health information */
  details?: {
    /** Memory usage information */
    memory?: {
      used: number;
      available: number;
      percentage: number;
    };
    
    /** CPU usage information */
    cpu?: {
      percentage: number;
    };
    
    /** Response time metrics */
    responseTime?: {
      average: number;
      p95: number;
      p99: number;
    };
    
    /** Custom health indicators */
    custom?: Record<string, unknown>;
  };
  
  /** Error message if health check failed */
  error?: string;
}

/**
 * Event types emitted by the agent registrar
 */
export interface RegistrarEvents {
  'registered': { registration: AgentRegistration };
  'deregistered': { agentId: string };
  'health-updated': { agentId: string; health: HealthCheckResult };
  'capabilities-updated': { agentId: string; capabilities: string[] };
  'error': { error: Error; context: string };
}

/**
 * Interface for capability providers
 */
export interface CapabilityProvider {
  /** Unique identifier for the capability */
  id: string;
  
  /** Human-readable name for the capability */
  name: string;
  
  /** Version of the capability implementation */
  version: string;
  
  /** Check if the capability is currently available */
  isAvailable(): boolean;
  
  /** Get detailed information about the capability */
  getDetails(): Record<string, unknown>;
}