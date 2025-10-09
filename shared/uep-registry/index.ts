/**
 * UEP Registry Integration - Public API
 * Exports all registry and service discovery components
 */

export {
  UEPRegistryClient,
  UEPRegistryFactory,
  UEPAgentRegistration,
  UEPRegistryConfig,
  UEPRegistryStats,
  UEPProtocolCapability,
  ValidationRequirement,
  CircuitBreakerConfig,
  RateLimitConfig,
  CommunicationPattern,
  AgentDependency,
  LoadBalancingStrategy,
  RetryPolicyConfig,
  AuthMethod,
  TLSConfig,
  LoadBalancingConfig
} from './UEPRegistryIntegration';

export {
  ServiceDiscoveryAdapter,
  ServiceDiscoveryConfig,
  ServiceEndpoint,
  ServiceInfo
} from './ServiceDiscoveryAdapter';

// Re-export base agent registry types for convenience
export {
  AgentRegistration,
  AgentStatus,
  HealthCheckResult,
  CapabilityProvider,
  RegistrarConfig,
  RegistrarEvents
} from '../agent-registry/AgentRegistration';

// Default exports for convenience
export default {
  UEPRegistryClient,
  UEPRegistryFactory,
  ServiceDiscoveryAdapter
};