/**
 * Agent Registration Framework - Main Export Module
 * 
 * This module provides the main exports for the agent registration framework,
 * including the core AgentRegistrar class and all related types and interfaces.
 */

export { AgentRegistrar } from './AgentRegistrar.js';
export {
  AgentRegistration,
  AgentStatus,
  RegistrarConfig,
  HealthCheckResult,
  RegistrarEvents,
  CapabilityProvider
} from './AgentRegistration.js';

/**
 * Convenience function to create and initialize an AgentRegistrar instance
 */
export function createAgentRegistrar(config: RegistrarConfig): AgentRegistrar {
  return AgentRegistrar.getInstance(config);
}

/**
 * Convenience function to get existing AgentRegistrar instance
 */
export function getAgentRegistrar(): AgentRegistrar {
  return AgentRegistrar.getInstance();
}