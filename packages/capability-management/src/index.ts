#!/usr/bin/env node

/**
 * UEP Capability Management System - Main Export Module
 * 
 * Entry point for the UEP Capability Management System providing
 * capability schema definitions, versioning utilities, and registry service.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.2
 */

// Export capability schema types and interfaces
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
} from './types/CapabilitySchema.js';

// Export type guards and constants
export { CapabilityTypeGuards, CAPABILITY_CONSTANTS } from './types/CapabilitySchema.js';

// Export versioning utilities
export {
  parseSemVer,
  semVerToString,
  compareSemVer,
  isVersionEqual,
  isVersionGreater,
  isVersionLess,
  satisfiesVersionRange,
  parseVersionRange,
  checkCapabilityCompatibility,
  findHighestCompatibleVersion,
  isPrerelease,
  getNextMajorVersion,
  getNextMinorVersion,
  getNextPatchVersion,
  validateSemVer,
  calculateVersionCompatibilityScore,
  CapabilityVersionUtils
} from './utils/CapabilityVersioning.js';

// Export registry service
export { 
  CapabilityRegistryService,
  type HealthStatus,
  type StoredAgentRegistration,
  type RegistryMetrics
} from './services/CapabilityRegistryService.js';

// Export server utilities
export { startServer, loadConfiguration } from './server.js';

// Export client components
export { 
  AgentRegistrationClient,
  type AgentRegistrationConfig,
  type DiscoveredCapability,
  type RegistrationStatus
} from './client/AgentRegistrationClient.js';

export {
  AgentCapabilityManager,
  type CapabilityManagerConfig,
  type CapabilityUpdateEvent,
  type CapabilityPerformanceData,
  type CapabilityDependency
} from './client/AgentCapabilityManager.js';

export {
  CapabilityAdvertisementFactory,
  type CapabilityAdvertisementConfig,
  type FactoryStatus,
  createCapabilityAdvertisement,
  createProductionCapabilityAdvertisement
} from './client/CapabilityAdvertisementFactory.js';

// Export algorithm components
export {
  CapabilityMatchingEngine,
  type MatchingCriteria,
  type AgentPerformanceData,
  type MatchingResult,
  type NegotiationData,
  type NegotiationRequest
} from './algorithms/CapabilityMatchingEngine.js';

export {
  ContractNetProtocol,
  type CNPMessage,
  type CNPMessageType,
  type CallForProposals,
  type Proposal,
  type ContractAward,
  type NegotiationSession,
  type ProposalEvaluation
} from './algorithms/ContractNetProtocol.js';

export {
  ConstraintSatisfactionSolver,
  type ConstraintVariable,
  type Constraint,
  type CSPProblem,
  type CSPSolution,
  type AgentConstraintMapping
} from './algorithms/ConstraintSatisfactionSolver.js';

// Package metadata
export const PACKAGE_INFO = {
  name: '@uep/capability-management',
  version: '1.0.0',
  description: 'UEP Agent Capability Management System with Registry Service, Discovery API, and Semantic Versioning',
  features: [
    'Semantic versioning with SemVer compliance',
    'Agent capability registration and discovery',
    'Version compatibility checking and negotiation',
    'Redis-based storage with TTL support',
    'Express.js REST API with comprehensive endpoints',
    'Consul integration for service discovery',
    'Real-time health monitoring and heartbeat management',
    'Comprehensive observability with metrics and logging',
    'Enterprise-grade production readiness'
  ],
  endpoints: {
    registration: [
      'POST /api/v1/agents/register',
      'PUT /api/v1/agents/:agentId/capabilities',
      'POST /api/v1/agents/:agentId/heartbeat',
      'DELETE /api/v1/agents/:agentId'
    ],
    discovery: [
      'GET /api/v1/capabilities',
      'GET /api/v1/capabilities/:capabilityId',
      'GET /api/v1/capabilities/:capabilityId/versions',
      'GET /api/v1/agents',
      'GET /api/v1/agents/:agentId'
    ],
    health: [
      'GET /health',
      'GET /api/v1/health/agents',
      'GET /api/v1/health/capabilities'
    ],
    monitoring: [
      'GET /api/v1/metrics',
      'GET /api/v1/admin/stats',
      'POST /api/v1/admin/cleanup'
    ]
  }
} as const;