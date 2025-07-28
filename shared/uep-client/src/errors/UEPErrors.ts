/**
 * UEP Protocol Error Handling System
 * 
 * Standardized error types, codes, and handling for UEP protocol violations
 * and agent communication failures. Provides consistent error responses
 * across all UEP agents while maintaining protocol compliance.
 * 
 * Features:
 * - UEP-specific error types and inheritance hierarchy
 * - Standardized error codes with RFC 7807 Problem Details
 * - Protocol violation detection and classification
 * - Error serialization for UEP message format
 * - Integration with tracing and monitoring systems
 */

import { UEPMessage, UEPRequest, UEPResponse, UEPTracingContext } from '../core/UEPTypes.js';

/**
 * Base UEP Error Interface
 */
export interface UEPErrorInfo {
  code: string;
  message: string;
  type: UEPErrorType;
  severity: UEPErrorSeverity;
  category: UEPErrorCategory;
  timestamp: Date;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, any>;
  cause?: Error;
  remediation?: string;
}

/**
 * UEP Error Types
 */
export enum UEPErrorType {
  // Protocol Errors
  PROTOCOL_VIOLATION = 'PROTOCOL_VIOLATION',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  SCHEMA_VALIDATION_FAILED = 'SCHEMA_VALIDATION_FAILED',
  ROUTING_ERROR = 'ROUTING_ERROR',
  
  // Communication Errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  
  // Agent Errors
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  CAPABILITY_NOT_FOUND = 'CAPABILITY_NOT_FOUND',
  AGENT_UNAVAILABLE = 'AGENT_UNAVAILABLE',
  CAPABILITY_DISABLED = 'CAPABILITY_DISABLED',
  AGENT_OVERLOADED = 'AGENT_OVERLOADED',
  
  // Registry Errors
  REGISTRY_UNAVAILABLE = 'REGISTRY_UNAVAILABLE',
  SERVICE_NOT_REGISTERED = 'SERVICE_NOT_REGISTERED',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  DISCOVERY_FAILED = 'DISCOVERY_FAILED',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  
  // Authentication & Authorization
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Rate Limiting & Throttling
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  THROTTLED = 'THROTTLED',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  
  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  
  // Internal Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

/**
 * Error Severity Levels
 */
export enum UEPErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error Categories for Classification
 */
export enum UEPErrorCategory {
  PROTOCOL = 'protocol',
  COMMUNICATION = 'communication',
  AGENT = 'agent',
  REGISTRY = 'registry',
  SECURITY = 'security',
  RESOURCE = 'resource',
  SYSTEM = 'system'
}

/**
 * HTTP Status Code Mapping for UEP Errors
 */
export const UEP_ERROR_HTTP_CODES: Record<UEPErrorType, number> = {
  [UEPErrorType.PROTOCOL_VIOLATION]: 400,
  [UEPErrorType.VERSION_MISMATCH]: 400,
  [UEPErrorType.INVALID_MESSAGE_FORMAT]: 400,
  [UEPErrorType.SCHEMA_VALIDATION_FAILED]: 400,
  [UEPErrorType.ROUTING_ERROR]: 400,
  
  [UEPErrorType.CONNECTION_FAILED]: 503,
  [UEPErrorType.TIMEOUT]: 408,
  [UEPErrorType.SERIALIZATION_ERROR]: 422,
  [UEPErrorType.DESERIALIZATION_ERROR]: 422,
  [UEPErrorType.MESSAGE_TOO_LARGE]: 413,
  
  [UEPErrorType.AGENT_NOT_FOUND]: 404,
  [UEPErrorType.CAPABILITY_NOT_FOUND]: 404,
  [UEPErrorType.AGENT_UNAVAILABLE]: 503,
  [UEPErrorType.CAPABILITY_DISABLED]: 503,
  [UEPErrorType.AGENT_OVERLOADED]: 503,
  
  [UEPErrorType.REGISTRY_UNAVAILABLE]: 503,
  [UEPErrorType.SERVICE_NOT_REGISTERED]: 404,
  [UEPErrorType.REGISTRATION_FAILED]: 500,
  [UEPErrorType.DISCOVERY_FAILED]: 500,
  [UEPErrorType.HEALTH_CHECK_FAILED]: 503,
  
  [UEPErrorType.AUTHENTICATION_FAILED]: 401,
  [UEPErrorType.AUTHORIZATION_FAILED]: 403,
  [UEPErrorType.TOKEN_EXPIRED]: 401,
  [UEPErrorType.INSUFFICIENT_PERMISSIONS]: 403,
  
  [UEPErrorType.RATE_LIMIT_EXCEEDED]: 429,
  [UEPErrorType.QUOTA_EXCEEDED]: 429,
  [UEPErrorType.THROTTLED]: 429,
  [UEPErrorType.CIRCUIT_BREAKER_OPEN]: 503,
  
  [UEPErrorType.RESOURCE_NOT_FOUND]: 404,
  [UEPErrorType.RESOURCE_CONFLICT]: 409,
  [UEPErrorType.RESOURCE_EXHAUSTED]: 507,
  [UEPErrorType.DEPENDENCY_FAILED]: 424,
  
  [UEPErrorType.INTERNAL_ERROR]: 500,
  [UEPErrorType.NOT_IMPLEMENTED]: 501,
  [UEPErrorType.CONFIGURATION_ERROR]: 500,
  [UEPErrorType.VALIDATION_ERROR]: 422
};

/**
 * Base UEP Error Class
 */
export class UEPError extends Error {
  public readonly code: string;
  public readonly type: UEPErrorType;
  public readonly severity: UEPErrorSeverity;
  public readonly category: UEPErrorCategory;
  public readonly timestamp: Date;
  public readonly traceId?: string;
  public readonly spanId?: string;
  public readonly metadata?: Record<string, any>;
  public readonly cause?: Error;
  public readonly remediation?: string;
  public readonly httpStatusCode: number;

  constructor(
    type: UEPErrorType,
    message: string,
    options?: Partial<{
      code: string;
      severity: UEPErrorSeverity;
      metadata: Record<string, any>;
      cause: Error;
      remediation: string;
      tracing: UEPTracingContext;
    }>
  ) {
    super(message);
    
    this.name = 'UEPError';
    this.type = type;
    this.code = options?.code || type;
    this.severity = options?.severity || this.determineSeverity(type);
    this.category = this.determineCategory(type);
    this.timestamp = new Date();
    this.traceId = options?.tracing?.traceId;
    this.spanId = options?.tracing?.spanId;
    this.metadata = options?.metadata;
    this.cause = options?.cause;
    this.remediation = options?.remediation;
    this.httpStatusCode = UEP_ERROR_HTTP_CODES[type];

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UEPError);
    }
  }

  /**
   * Convert error to UEP response format
   */
  toUEPResponse(): UEPResponse<UEPErrorInfo> {
    return {
      success: false,
      error: this.toErrorInfo(),
      metadata: {
        httpStatusCode: this.httpStatusCode,
        timestamp: this.timestamp.toISOString()
      }
    } as UEPResponse<UEPErrorInfo>;
  }

  /**
   * Convert error to error info object
   */
  toErrorInfo(): UEPErrorInfo {
    return {
      code: this.code,
      message: this.message,
      type: this.type,
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp,
      traceId: this.traceId,
      spanId: this.spanId,
      metadata: this.metadata,
      cause: this.cause,
      remediation: this.remediation
    };
  }

  /**
   * Convert error to RFC 7807 Problem Details format
   */
  toProblemDetails(): Record<string, any> {
    return {
      type: `https://uep.dev/errors/${this.type.toLowerCase()}`,
      title: this.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      status: this.httpStatusCode,
      detail: this.message,
      instance: this.traceId || undefined,
      timestamp: this.timestamp.toISOString(),
      code: this.code,
      severity: this.severity,
      category: this.category,
      metadata: this.metadata,
      remediation: this.remediation
    };
  }

  /**
   * Determine error severity based on type
   */
  private determineSeverity(type: UEPErrorType): UEPErrorSeverity {
    switch (type) {
      case UEPErrorType.INTERNAL_ERROR:
      case UEPErrorType.REGISTRY_UNAVAILABLE:
      case UEPErrorType.CONNECTION_FAILED:
      case UEPErrorType.AUTHENTICATION_FAILED:
        return UEPErrorSeverity.CRITICAL;
        
      case UEPErrorType.AGENT_UNAVAILABLE:
      case UEPErrorType.TIMEOUT:
      case UEPErrorType.RESOURCE_EXHAUSTED:
      case UEPErrorType.CIRCUIT_BREAKER_OPEN:
        return UEPErrorSeverity.HIGH;
        
      case UEPErrorType.RATE_LIMIT_EXCEEDED:
      case UEPErrorType.VALIDATION_ERROR:
      case UEPErrorType.SCHEMA_VALIDATION_FAILED:
        return UEPErrorSeverity.MEDIUM;
        
      default:
        return UEPErrorSeverity.LOW;
    }
  }

  /**
   * Determine error category based on type
   */
  private determineCategory(type: UEPErrorType): UEPErrorCategory {
    if ([
      UEPErrorType.PROTOCOL_VIOLATION,
      UEPErrorType.VERSION_MISMATCH,
      UEPErrorType.INVALID_MESSAGE_FORMAT,
      UEPErrorType.SCHEMA_VALIDATION_FAILED,
      UEPErrorType.ROUTING_ERROR
    ].includes(type)) {
      return UEPErrorCategory.PROTOCOL;
    }
    
    if ([
      UEPErrorType.CONNECTION_FAILED,
      UEPErrorType.TIMEOUT,
      UEPErrorType.SERIALIZATION_ERROR,
      UEPErrorType.DESERIALIZATION_ERROR,
      UEPErrorType.MESSAGE_TOO_LARGE
    ].includes(type)) {
      return UEPErrorCategory.COMMUNICATION;
    }
    
    if ([
      UEPErrorType.AGENT_NOT_FOUND,
      UEPErrorType.CAPABILITY_NOT_FOUND,
      UEPErrorType.AGENT_UNAVAILABLE,
      UEPErrorType.CAPABILITY_DISABLED,
      UEPErrorType.AGENT_OVERLOADED
    ].includes(type)) {
      return UEPErrorCategory.AGENT;
    }
    
    if ([
      UEPErrorType.REGISTRY_UNAVAILABLE,
      UEPErrorType.SERVICE_NOT_REGISTERED,
      UEPErrorType.REGISTRATION_FAILED,
      UEPErrorType.DISCOVERY_FAILED,
      UEPErrorType.HEALTH_CHECK_FAILED
    ].includes(type)) {
      return UEPErrorCategory.REGISTRY;
    }
    
    if ([
      UEPErrorType.AUTHENTICATION_FAILED,
      UEPErrorType.AUTHORIZATION_FAILED,
      UEPErrorType.TOKEN_EXPIRED,
      UEPErrorType.INSUFFICIENT_PERMISSIONS
    ].includes(type)) {
      return UEPErrorCategory.SECURITY;
    }
    
    if ([
      UEPErrorType.RESOURCE_NOT_FOUND,
      UEPErrorType.RESOURCE_CONFLICT,
      UEPErrorType.RESOURCE_EXHAUSTED,
      UEPErrorType.DEPENDENCY_FAILED
    ].includes(type)) {
      return UEPErrorCategory.RESOURCE;
    }
    
    return UEPErrorCategory.SYSTEM;
  }
}

/**
 * Specific UEP Error Subclasses
 */

export class UEPProtocolError extends UEPError {
  constructor(message: string, options?: Parameters<typeof UEPError.prototype.constructor>[2]) {
    super(UEPErrorType.PROTOCOL_VIOLATION, message, {
      ...options,
      remediation: options?.remediation || 'Ensure message follows UEP protocol specification'
    });
    this.name = 'UEPProtocolError';
  }
}

export class UEPValidationError extends UEPError {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[] = [], options?: Parameters<typeof UEPError.prototype.constructor>[2]) {
    super(UEPErrorType.SCHEMA_VALIDATION_FAILED, message, {
      ...options,
      metadata: {
        ...options?.metadata,
        validationErrors
      },
      remediation: options?.remediation || 'Fix validation errors and ensure schema compliance'
    });
    this.name = 'UEPValidationError';
    this.validationErrors = validationErrors;
  }
}

export class UEPTimeoutError extends UEPError {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number, options?: Parameters<typeof UEPError.prototype.constructor>[2]) {
    super(UEPErrorType.TIMEOUT, message, {
      ...options,
      metadata: {
        ...options?.metadata,
        timeoutMs
      },
      remediation: options?.remediation || 'Increase timeout value or optimize agent performance'
    });
    this.name = 'UEPTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class UEPAgentError extends UEPError {
  public readonly agentId: string;

  constructor(type: UEPErrorType, message: string, agentId: string, options?: Parameters<typeof UEPError.prototype.constructor>[2]) {
    super(type, message, {
      ...options,
      metadata: {
        ...options?.metadata,
        agentId
      }
    });
    this.name = 'UEPAgentError';
    this.agentId = agentId;
  }
}

export class UEPRegistryError extends UEPError {
  public readonly registryEndpoint?: string;

  constructor(type: UEPErrorType, message: string, options?: Parameters<typeof UEPError.prototype.constructor>[2] & { registryEndpoint?: string }) {
    super(type, message, {
      ...options,
      metadata: {
        ...options?.metadata,
        registryEndpoint: options?.registryEndpoint
      }
    });
    this.name = 'UEPRegistryError';
    this.registryEndpoint = options?.registryEndpoint;
  }
}

export class UEPRateLimitError extends UEPError {
  public readonly limit: number;
  public readonly windowMs: number;
  public readonly retryAfterMs: number;

  constructor(limit: number, windowMs: number, retryAfterMs: number, options?: Parameters<typeof UEPError.prototype.constructor>[2]) {
    super(UEPErrorType.RATE_LIMIT_EXCEEDED, `Rate limit exceeded: ${limit} requests per ${windowMs}ms`, {
      ...options,
      metadata: {
        ...options?.metadata,
        limit,
        windowMs,
        retryAfterMs
      },
      remediation: `Wait ${retryAfterMs}ms before retrying or implement exponential backoff`
    });
    this.name = 'UEPRateLimitError';
    this.limit = limit;
    this.windowMs = windowMs;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Error Factory Functions
 */
export const UEPErrorFactory = {
  protocolViolation: (message: string, metadata?: Record<string, any>): UEPProtocolError =>
    new UEPProtocolError(message, { metadata }),

  validationFailed: (message: string, errors: string[]): UEPValidationError =>
    new UEPValidationError(message, errors),

  timeout: (operation: string, timeoutMs: number): UEPTimeoutError =>
    new UEPTimeoutError(`Operation '${operation}' timed out after ${timeoutMs}ms`, timeoutMs),

  agentNotFound: (agentId: string): UEPAgentError =>
    new UEPAgentError(UEPErrorType.AGENT_NOT_FOUND, `Agent '${agentId}' not found`, agentId),

  capabilityNotFound: (agentId: string, capability: string): UEPAgentError =>
    new UEPAgentError(UEPErrorType.CAPABILITY_NOT_FOUND, `Capability '${capability}' not found on agent '${agentId}'`, agentId, {
      metadata: { capability }
    }),

  registryUnavailable: (endpoint?: string): UEPRegistryError =>
    new UEPRegistryError(UEPErrorType.REGISTRY_UNAVAILABLE, 'Service registry is unavailable', { registryEndpoint: endpoint }),

  rateLimitExceeded: (limit: number, windowMs: number, retryAfterMs: number): UEPRateLimitError =>
    new UEPRateLimitError(limit, windowMs, retryAfterMs),

  authenticationFailed: (reason: string): UEPError =>
    new UEPError(UEPErrorType.AUTHENTICATION_FAILED, `Authentication failed: ${reason}`, {
      remediation: 'Verify credentials and ensure proper authentication flow'
    }),

  internalError: (message: string, cause?: Error): UEPError =>
    new UEPError(UEPErrorType.INTERNAL_ERROR, message, {
      cause,
      remediation: 'Contact system administrator if error persists'
    })
};

export {
  UEPError,
  UEPProtocolError,
  UEPValidationError,
  UEPTimeoutError,
  UEPAgentError,
  UEPRegistryError,
  UEPRateLimitError
};