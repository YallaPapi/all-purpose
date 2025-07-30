#!/usr/bin/env node

/**
 * UEP Agent Capability Management Schema
 * 
 * Comprehensive TypeScript interfaces for agent capability management with semantic versioning,
 * compatibility checking, and dynamic capability discovery. Based on TaskMaster research
 * findings for enterprise-grade capability management systems.
 * 
 * Research-based implementation features:
 * - Semantic versioning (SemVer) with MAJOR.MINOR.PATCH
 * - Backward compatibility checking algorithms
 * - Extensible metadata structure for capability evolution
 * - Type-safe interfaces for agent registration and discovery
 * - Support for capability deprecation and migration
 * - Version range compatibility and negotiation
 * - Capability substitution and fallback mechanisms
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.1
 */

/**
 * Semantic Version representation following SemVer specification
 * MAJOR.MINOR.PATCH where:
 * - MAJOR: Incompatible API/capability changes
 * - MINOR: Backward-compatible additions or improvements  
 * - PATCH: Backward-compatible bug fixes or minor changes
 */
export interface SemVer {
  major: number;                           // Breaking changes increment
  minor: number;                           // Backward-compatible additions
  patch: number;                           // Backward-compatible fixes
  prerelease?: string;                     // Pre-release identifier (alpha, beta, rc)
  build?: string;                          // Build metadata
}

/**
 * Parameter definition for capability inputs and outputs
 */
export interface ParameterDefinition {
  name: string;                            // Parameter name
  type: string;                            // TypeScript type definition
  description?: string;                    // Parameter description
  required?: boolean;                      // Is parameter required
  defaultValue?: any;                      // Default value if optional
  validation?: {                           // Validation rules
    pattern?: string;                      // Regex pattern for strings  
    min?: number;                          // Minimum value for numbers
    max?: number;                          // Maximum value for numbers
    enum?: any[];                          // Allowed values
    format?: string;                       // Format specification (email, url, etc.)
  };
  examples?: any[];                        // Example values
}

/**
 * Return type specification for capability outputs
 */
export interface ReturnTypeDefinition {
  type: string;                            // TypeScript return type
  description?: string;                    // Return value description
  schema?: Record<string, any>;            // JSON Schema for complex types
  examples?: any[];                        // Example return values
}

/**
 * Usage example for capability documentation
 */
export interface CapabilityExample {
  name: string;                            // Example name
  description: string;                     // Example description
  input: Record<string, any>;              // Example input parameters
  output: any;                             // Expected output
  notes?: string;                          // Additional notes
}

/**
 * Performance characteristics for capability
 */
export interface PerformanceMetrics {
  averageLatency?: number;                 // Average response time in ms
  maxLatency?: number;                     // Maximum response time in ms
  throughput?: number;                     // Requests per second capacity
  resourceUsage?: {                        // Resource consumption
    cpu?: number;                          // CPU usage percentage
    memory?: number;                       // Memory usage in MB
    storage?: number;                      // Storage usage in MB
  };
  scalingLimits?: {                        // Scaling characteristics
    maxConcurrentRequests?: number;        // Max concurrent requests
    maxQueueSize?: number;                 // Max queue length
  };
}

/**
 * Capability constraints and requirements
 */
export interface CapabilityConstraints {
  requiredCapabilities?: string[];         // Other capabilities this one depends on
  incompatibleCapabilities?: string[];    // Capabilities that conflict with this one
  minimumAgentVersion?: SemVer;            // Minimum agent version required
  platformRequirements?: string[];        // Platform/OS requirements
  resourceRequirements?: {                 // Minimum resource requirements
    minCpu?: number;                       // Minimum CPU cores
    minMemory?: number;                    // Minimum memory in MB
    minStorage?: number;                   // Minimum storage in MB
  };
  networkRequirements?: {                  // Network requirements
    outboundConnections?: string[];        // Required outbound connections
    inboundPorts?: number[];               // Required inbound ports
    protocols?: string[];                  // Required network protocols
  };
}

/**
 * Core capability definition with comprehensive metadata
 */
export interface AgentCapability {
  // Core identification
  id: string;                              // Unique capability identifier (e.g., "image-classification")
  name: string;                            // Human-readable capability name
  version: SemVer;                         // Semantic version of the capability
  description: string;                     // Detailed capability description
  category?: string;                       // Capability category for organization
  
  // Interface specification
  parameters?: ParameterDefinition[];      // Input parameters definition
  returns?: ReturnTypeDefinition;          // Return type specification
  examples?: CapabilityExample[];          // Usage examples
  
  // Versioning and lifecycle
  deprecated?: boolean;                    // Deprecation flag
  deprecationNotice?: string;              // Deprecation message
  replacedBy?: string;                     // Replacement capability ID
  introducedIn?: SemVer;                   // Version when capability was introduced
  
  // Compatibility and constraints
  constraints?: CapabilityConstraints;     // Capability constraints
  
  // Performance and quality
  performance?: PerformanceMetrics;        // Performance characteristics
  reliability?: {                          // Reliability metrics
    successRate?: number;                  // Success rate percentage
    errorHandling?: string[];              // Supported error handling strategies
    retryPolicy?: {                        // Retry configuration
      maxRetries?: number;
      backoffStrategy?: 'linear' | 'exponential' | 'fixed';
      baseDelay?: number;
    };
  };
  
  // Documentation and metadata
  documentation?: {                        // Extended documentation
    detailedDescription?: string;          // Comprehensive description
    useCases?: string[];                   // Common use cases
    limitations?: string[];                // Known limitations
    troubleshooting?: Record<string, string>; // Common issues and solutions
    changelog?: ChangelogEntry[];          // Version history
  };
  
  // Extensible metadata
  metadata?: Record<string, any>;          // Additional custom metadata
  tags?: string[];                         // Searchable tags
  
  // Compliance and governance
  compliance?: {                           // Compliance information
    standards?: string[];                  // Compliance standards met
    certifications?: string[];             // Relevant certifications
    auditTrail?: boolean;                  // Audit trail required
    dataClassification?: string;           // Data classification level
  };
  
  // Registration metadata
  registeredAt?: Date;                     // Registration timestamp
  registeredBy?: string;                   // Agent that registered this capability
  lastUpdated?: Date;                      // Last update timestamp
}

/**
 * Changelog entry for capability version history
 */
export interface ChangelogEntry {
  version: SemVer;                         // Version this change applies to
  date: Date;                              // Change date
  type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security'; // Change type
  description: string;                     // Change description
  breakingChange?: boolean;                // Is this a breaking change
  migrationGuide?: string;                 // Migration instructions if breaking
}

/**
 * Version range specification for capability requirements
 */
export interface VersionRange {
  operator: '>=' | '>' | '<=' | '<' | '=' | '~' | '^'; // Version comparison operator
  version: SemVer;                         // Target version
}

/**
 * Capability requirement specification for workflows and agents
 */
export interface CapabilityRequirement {
  capabilityId: string;                    // Required capability ID
  versionRange?: VersionRange;             // Version requirement
  optional?: boolean;                      // Is this requirement optional
  alternatives?: string[];                 // Alternative capability IDs
  constraints?: CapabilityConstraints;     // Additional constraints
  priority?: number;                       // Requirement priority (higher = more important)
}

/**
 * Agent registration payload with capabilities
 */
export interface AgentRegistration {
  // Agent identification
  agentId: string;                         // Unique agent identifier
  agentName?: string;                      // Human-readable agent name
  agentVersion: SemVer;                    // Agent version
  
  // Capabilities
  capabilities: AgentCapability[];         // Advertised capabilities
  
  // Agent metadata
  description?: string;                    // Agent description
  maintainer?: string;                     // Agent maintainer
  contact?: string;                        // Contact information
  
  // Runtime information
  endpoints?: {                            // Agent endpoints
    health?: string;                       // Health check endpoint
    metrics?: string;                      // Metrics endpoint
    api?: string;                          // Main API endpoint
  };
  
  // Registration metadata
  registrationTime: Date;                  // Registration timestamp
  ttl?: number;                            // Time to live in seconds
  
  // Environment information
  environment?: {                          // Runtime environment
    platform?: string;                     // Platform/OS information
    runtime?: string;                      // Runtime version (Node.js, etc.)
    location?: string;                     // Geographic location
    datacenter?: string;                   // Datacenter identifier
  };
}

/**
 * Capability search criteria for discovery
 */
export interface CapabilitySearchCriteria {
  capabilityId?: string;                   // Exact capability ID match
  namePattern?: string;                    // Name pattern (regex)
  category?: string;                       // Capability category
  tags?: string[];                         // Required tags
  versionRange?: VersionRange;             // Version requirement
  includeDeprecated?: boolean;             // Include deprecated capabilities
  
  // Performance requirements
  maxLatency?: number;                     // Maximum acceptable latency
  minThroughput?: number;                  // Minimum required throughput
  
  // Constraint filters
  platformRequirements?: string[];        // Platform requirements
  resourceConstraints?: {                  // Resource constraints
    maxCpu?: number;
    maxMemory?: number;
    maxStorage?: number;
  };
  
  // Result configuration
  limit?: number;                          // Maximum results to return
  sortBy?: 'name' | 'version' | 'performance' | 'reliability'; // Sort criteria
  sortOrder?: 'asc' | 'desc';              // Sort order
}

/**
 * Capability search result
 */
export interface CapabilitySearchResult {
  capability: AgentCapability;             // Matching capability
  agentId: string;                         // Agent providing this capability
  compatibilityScore?: number;             // Compatibility score (0-1)
  performanceScore?: number;               // Performance score (0-1)
  overallScore?: number;                   // Overall matching score (0-1)
  matchReasons?: string[];                 // Reasons why this capability matched
}

/**
 * Capability compatibility result
 */
export interface CompatibilityResult {
  compatible: boolean;                     // Is compatible
  reason?: string;                         // Compatibility reason or failure message
  score?: number;                          // Compatibility score (0-1)
  
  // Version compatibility details
  versionCompatible?: boolean;             // Version compatibility
  versionDetails?: {
    required: VersionRange;
    provided: SemVer;
    compatible: boolean;
    reason?: string;
  };
  
  // Constraint compatibility
  constraintCompatible?: boolean;          // Constraint compatibility
  constraintDetails?: {
    violations?: string[];                 // Constraint violations
    warnings?: string[];                   // Constraint warnings
  };
  
  // Migration information
  migrationRequired?: boolean;             // Is migration required
  migrationPath?: {                        // Migration path information
    steps?: string[];                      // Migration steps
    estimatedEffort?: string;              // Effort estimate
    breakingChanges?: string[];            // Breaking changes to handle
  };
}

/**
 * Capability registry configuration
 */
export interface CapabilityRegistryConfig {
  // Storage configuration
  storage: {
    type: 'redis' | 'consul' | 'memory' | 'database'; // Storage backend
    connectionString?: string;             // Connection string
    keyPrefix?: string;                    // Key prefix for namespacing
    ttl?: number;                          // Default TTL for entries
  };
  
  // Versioning configuration
  versioning: {
    strictSemVer?: boolean;                // Enforce strict semantic versioning
    allowPrerelease?: boolean;             // Allow pre-release versions
    deprecationWarningPeriod?: number;     // Days before deprecated removal
  };
  
  // Validation configuration
  validation: {
    enableSchemaValidation?: boolean;      // Enable JSON schema validation
    customValidators?: string[];           // Custom validation rules
    strictCompatibilityChecking?: boolean; // Strict compatibility checking
  };
  
  // Performance configuration
  performance: {
    cacheEnabled?: boolean;                // Enable capability caching
    cacheTtl?: number;                     // Cache TTL in seconds
    indexingEnabled?: boolean;             // Enable search indexing
    batchSize?: number;                    // Batch size for bulk operations
  };
  
  // Monitoring configuration
  monitoring: {
    metricsEnabled?: boolean;              // Enable metrics collection
    auditEnabled?: boolean;                // Enable audit logging
    healthCheckInterval?: number;          // Health check interval in seconds
  };
}

/**
 * Export all interfaces for external use
 */
export type {
  SemVer,
  ParameterDefinition,
  ReturnTypeDefinition,
  CapabilityExample,
  PerformanceMetrics,
  CapabilityConstraints,
  AgentCapability,
  ChangelogEntry,
  VersionRange,
  CapabilityRequirement,
  AgentRegistration,
  CapabilitySearchCriteria,
  CapabilitySearchResult,
  CompatibilityResult,
  CapabilityRegistryConfig
};

/**
 * Type guards for runtime type checking
 */
export namespace CapabilityTypeGuards {
  export function isSemVer(obj: any): obj is SemVer {
    return obj &&
           typeof obj.major === 'number' &&
           typeof obj.minor === 'number' &&
           typeof obj.patch === 'number';
  }
  
  export function isAgentCapability(obj: any): obj is AgentCapability {
    return obj &&
           typeof obj.id === 'string' &&
           typeof obj.name === 'string' &&
           isSemVer(obj.version) &&
           typeof obj.description === 'string';
  }
  
  export function isAgentRegistration(obj: any): obj is AgentRegistration {
    return obj &&
           typeof obj.agentId === 'string' &&
           isSemVer(obj.agentVersion) &&
           Array.isArray(obj.capabilities) &&
           obj.capabilities.every(isAgentCapability);
  }
}

/**
 * Constants for capability management
 */
export const CAPABILITY_CONSTANTS = {
  // Version constraints
  MAX_MAJOR_VERSION: 999,
  MAX_MINOR_VERSION: 999,
  MAX_PATCH_VERSION: 999,
  
  // String length limits
  MAX_ID_LENGTH: 128,
  MAX_NAME_LENGTH: 256,
  MAX_DESCRIPTION_LENGTH: 2048,
  MAX_TAG_LENGTH: 64,
  MAX_TAGS_COUNT: 20,
  
  // Search limits
  MAX_SEARCH_RESULTS: 1000,
  DEFAULT_SEARCH_LIMIT: 50,
  
  // Performance thresholds
  DEFAULT_MAX_LATENCY: 30000,      // 30 seconds
  DEFAULT_MIN_THROUGHPUT: 1,       // 1 request per second
  
  // Cache settings
  DEFAULT_CACHE_TTL: 300,          // 5 minutes
  DEFAULT_REGISTRY_TTL: 3600,      // 1 hour
  
  // Compatibility scoring
  PERFECT_COMPATIBILITY_SCORE: 1.0,
  MINIMUM_COMPATIBILITY_SCORE: 0.1,
  
  // Deprecation settings
  DEFAULT_DEPRECATION_WARNING_PERIOD: 90, // 90 days
} as const;