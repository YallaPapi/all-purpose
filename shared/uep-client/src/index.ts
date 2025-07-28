/**
 * UEP Client Library - Main Entry Point
 * 
 * TypeScript client library for UEP (Universal Execution Protocol) with
 * comprehensive support for agent interfaces, message validation, tracing,
 * and service discovery.
 * 
 * @version 1.0.0
 * @author UEP Development Team
 * @license MIT
 */

// Core Types and Interfaces
export {
  // Core Types
  UEPProtocolInfo,
  UEPAgentInfo,
  UEPRouting,
  UEPTracingContext,
  UEPHeaders,
  UEPMessage,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  UEPError,
  UEPCapability,
  UEPAgentManifest,
  UEPServiceEntry,
  UEPConnectionConfig,
  UEPClientOptions,
  UEPRequestOptions,
  UEPSubscriptionOptions,
  UEPHealthStatus,
  UEPMetrics,
  
  // Type Guards
  UEPTypeGuards,
  
  // Constants
  UEPConstants
} from './core/UEPTypes.js';

// Core Client
export {
  UEPClient
} from './core/UEPClient.js';

// Message Validation
export {
  UEPMessageValidator,
  UEPValidationConfig,
  UEPValidationRule,
  ValidationResult
} from './core/UEPMessageValidator.js';

// Distributed Tracing
export {
  UEPTracing,
  UEPTracingConfig,
  SpanInfo,
  TracingStats,
  createDefaultTracingConfig
} from './core/UEPTracing.js';

// Service Registry
export {
  UEPServiceRegistry,
  ServiceRegistryConfig,
  ServiceQueryOptions,
  RegistrationOptions,
  RegistryStats
} from './core/UEPServiceRegistry.js';

// Agent Decorators
export {
  // Decorators
  UEPAgent,
  UEPCapability,
  UEPEventHandler,
  UEPValidate,
  UEPRateLimit,
  UEPTrace,
  
  // Configuration Interfaces
  UEPAgentConfig,
  UEPCapabilityConfig,
  UEPEventHandlerConfig,
  
  // Utility Functions
  getAgentConfig,
  getAgentCapabilities,
  getAgentEventHandlers,
  createAgentManifest,
  startAllAgents,
  stopAllAgents,
  
  // Agent Registry
  AgentRegistry
} from './decorators/UEPAgentDecorators.js';

// Utility Functions and Helpers
export {
  createUEPClient,
  createUEPMessage,
  createUEPRequest,
  createUEPResponse,
  createUEPEvent,
  parseUEPMessage,
  validateUEPMessage,
  extractTraceFromMessage,
  injectTraceIntoMessage
} from './utils/UEPHelpers.js';

// Version Information
export const VERSION = '1.0.0';
export const PROTOCOL_VERSION = '1.0.0';

/**
 * Default configuration factory functions
 */
export const UEPDefaults = {
  /**
   * Create default client options
   */
  createClientOptions: (agentId: string, agentType: 'meta' | 'domain' | 'factory' | 'orchestrator'): UEPClientOptions => ({
    connection: {
      servers: ['nats://localhost:4222'],
      namespace: 'uep',
      timeouts: {
        connect: 10000,
        request: 30000,
        keepAlive: 60000
      },
      retry: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        maxDelay: 30000
      }
    },
    agent: {
      id: agentId,
      type: agentType,
      capability: agentId,
      version: '1.0.0'
    },
    tracing: {
      enabled: true,
      serviceName: agentId,
      sampleRate: 1.0
    },
    validation: {
      enabled: true,
      strictMode: false,
      schemaValidation: true
    },
    performance: {
      maxConcurrentRequests: 100,
      messageBufferSize: 1000,
      compressionEnabled: false
    },
    monitoring: {
      metricsEnabled: true,
      healthCheckEnabled: true,
      loggingLevel: 'info'
    }
  }),

  /**
   * Create default validation configuration
   */
  createValidationConfig: (): UEPValidationConfig => ({
    enabled: true,
    strictMode: false,
    schemaValidation: true,
    cacheSize: 1000
  }),

  /**
   * Create default service registry configuration
   */
  createServiceRegistryConfig: (): ServiceRegistryConfig => ({
    connection: {
      servers: ['nats://localhost:4222'],
      namespace: 'uep'
    },
    updateInterval: 30000,
    healthCheckInterval: 60000,
    retentionPeriod: 300000,
    enableAutoCleanup: true
  })
} as const;

/**
 * Quick start helper for creating and connecting a UEP client
 */
export async function quickStartUEPClient(
  agentId: string,
  agentType: 'meta' | 'domain' | 'factory' | 'orchestrator',
  servers: string[] = ['nats://localhost:4222']
): Promise<UEPClient> {
  const options = UEPDefaults.createClientOptions(agentId, agentType);
  options.connection.servers = servers;

  const client = new UEPClient(options);
  await client.connect();

  return client;
}

/**
 * Error Classes
 */
export class UEPClientError extends Error {
  constructor(message: string, public readonly code: string, public readonly retryable: boolean = false) {
    super(message);
    this.name = 'UEPClientError';
  }
}

export class UEPValidationError extends UEPClientError {
  constructor(message: string, public readonly violations: string[]) {
    super(message, 'VALIDATION_ERROR', false);
    this.name = 'UEPValidationError';
  }
}

export class UEPConnectionError extends UEPClientError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR', true);
    this.name = 'UEPConnectionError';
  }
}

export class UEPTimeoutError extends UEPClientError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR', true);
    this.name = 'UEPTimeoutError';
  }
}

/**
 * Re-export commonly used types for convenience
 */
import {
  UEPClientOptions,
  UEPValidationConfig,
  ServiceRegistryConfig
} from './core/UEPTypes.js';