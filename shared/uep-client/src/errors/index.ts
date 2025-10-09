/**
 * UEP Error Handling System
 * 
 * Comprehensive error handling, recovery, and validation system for UEP agents.
 * Provides standardized error types, protocol validation, automatic recovery,
 * and integration utilities for robust UEP agent implementations.
 * 
 * @example Basic Usage
 * ```typescript
 * import { 
 *   initializeUEPErrorHandling,
 *   UEPErrorFactory,
 *   UEPProtocolValidator,
 *   withRecovery
 * } from '@uep/errors';
 * 
 * // Initialize error handling system
 * const errorHandler = initializeUEPErrorHandling(client);
 * 
 * // Create and use validator
 * const validator = new UEPProtocolValidator();
 * const result = await validator.validateMessage(message);
 * 
 * // Wrap functions with recovery
 * const resilientOperation = withRecovery(riskyOperation, recovery);
 * ```
 */

// Core Error Types and Classes
export {
  UEPError,
  UEPProtocolError,
  UEPValidationError,
  UEPTimeoutError,
  UEPAgentError,
  UEPRegistryError,
  UEPRateLimitError,
  UEPErrorFactory,
  UEPErrorType,
  UEPErrorSeverity,
  UEPErrorCategory,
  UEPErrorInfo,
  UEP_ERROR_HTTP_CODES
} from './UEPErrors.js';

// Error Handler and Middleware
export {
  UEPErrorHandler,
  UEPErrorHandlerConfig,
  UEPErrorStatistics,
  UEPErrorContext,
  getUEPErrorHandler,
  initializeUEPErrorHandling
} from './UEPErrorHandler.js';

// Error Recovery and Resilience
export {
  UEPErrorRecovery,
  UEPRecoveryConfig,
  RetryOptions,
  RecoveryResult,
  RecoveryStrategy,
  FallbackFunction,
  withRecovery
} from './UEPErrorRecovery.js';

// Protocol Validation
export {
  UEPProtocolValidator,
  UEPProtocolValidatorConfig,
  ValidationContext,
  ProtocolValidationResult,
  ValidationRule,
  ValidationRuleConfig,
  createValidationError
} from './UEPProtocolValidator.js';

/**
 * Error Handling System Configuration
 */
export interface UEPErrorSystemConfig {
  errorHandler?: import('./UEPErrorHandler.js').UEPErrorHandlerConfig;
  recovery?: import('./UEPErrorRecovery.js').UEPRecoveryConfig;
  validator?: import('./UEPProtocolValidator.js').UEPProtocolValidatorConfig;
}

/**
 * Initialize complete UEP error handling system
 */
export async function initializeUEPErrorSystem(
  client?: import('../core/UEPTypes.js').UEPClient,
  config: UEPErrorSystemConfig = {}
): Promise<{
  errorHandler: import('./UEPErrorHandler.js').UEPErrorHandler;
  recovery: import('./UEPErrorRecovery.js').UEPErrorRecovery;
  validator: import('./UEPProtocolValidator.js').UEPProtocolValidator;
}> {
  const { initializeUEPErrorHandling } = await import('./UEPErrorHandler.js');
  const { UEPErrorRecovery } = await import('./UEPErrorRecovery.js');
  const { UEPProtocolValidator } = await import('./UEPProtocolValidator.js');

  // Initialize error handler
  const errorHandler = initializeUEPErrorHandling(client, config.errorHandler);

  // Initialize recovery system
  const recovery = new UEPErrorRecovery(errorHandler, config.recovery);
  if (client) {
    recovery.initialize(client);
  }

  // Initialize validator
  const validator = new UEPProtocolValidator(config.validator);

  return {
    errorHandler,
    recovery,
    validator
  };
}

/**
 * Error handling utilities and helpers
 */
export const UEPErrorUtils = {
  /**
   * Convert standard Error to UEPError
   */
  fromError: (error: Error, type?: import('./UEPErrors.js').UEPErrorType): import('./UEPErrors.js').UEPError => {
    const { UEPError, UEPErrorType, UEPErrorFactory } = require('./UEPErrors.js');
    
    if (error instanceof UEPError) {
      return error;
    }

    if (type) {
      return new UEPError(type, error.message, { cause: error });
    }

    // Auto-detect error type
    if (error.name === 'TimeoutError' || /timeout/i.test(error.message)) {
      return UEPErrorFactory.timeout('operation', 5000);
    }

    if (error.name === 'ValidationError' || /validation/i.test(error.message)) {
      return UEPErrorFactory.validationFailed(error.message, []);
    }

    return UEPErrorFactory.internalError(error.message, error);
  },

  /**
   * Check if error is retryable
   */
  isRetryable: (error: import('./UEPErrors.js').UEPError): boolean => {
    const { UEPErrorType, UEPErrorSeverity } = require('./UEPErrors.js');
    
    const retryableTypes = [
      UEPErrorType.TIMEOUT,
      UEPErrorType.CONNECTION_FAILED,
      UEPErrorType.AGENT_UNAVAILABLE,
      UEPErrorType.REGISTRY_UNAVAILABLE,
      UEPErrorType.THROTTLED,
      UEPErrorType.RATE_LIMIT_EXCEEDED
    ];

    return retryableTypes.includes(error.type) && 
           error.severity !== UEPErrorSeverity.CRITICAL;
  },

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay: (
    attempt: number,
    baseDelay: number = 1000,
    maxDelay: number = 30000,
    backoffMultiplier: number = 2,
    jitter: boolean = true
  ): number => {
    let delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
    
    if (jitter) {
      delay += Math.random() * delay * 0.1; // ±10% jitter
    }
    
    return Math.floor(delay);
  },

  /**
   * Create error response from UEP error
   */
  toErrorResponse: (error: import('./UEPErrors.js').UEPError): import('../core/UEPTypes.js').UEPResponse<any> => {
    return error.toUEPResponse();
  },

  /**
   * Extract error metadata for logging
   */
  extractMetadata: (error: import('./UEPErrors.js').UEPError): Record<string, any> => {
    return {
      type: error.type,
      code: error.code,
      severity: error.severity,
      category: error.category,
      timestamp: error.timestamp,
      traceId: error.traceId,
      spanId: error.spanId,
      httpStatusCode: error.httpStatusCode,
      metadata: error.metadata,
      remediation: error.remediation
    };
  }
};

/**
 * Common error patterns and factories
 */
export const CommonErrors = {
  // Protocol Errors
  protocolViolation: (message: string, metadata?: Record<string, any>) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.protocolViolation(message, metadata);
  },

  validationFailed: (message: string, errors: string[] = []) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.validationFailed(message, errors);
  },

  // Communication Errors
  timeout: (operation: string, timeoutMs: number) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.timeout(operation, timeoutMs);
  },

  connectionFailed: (endpoint?: string) => {
    const { UEPError, UEPErrorType } = require('./UEPErrors.js');
    return new UEPError(
      UEPErrorType.CONNECTION_FAILED,
      `Connection failed${endpoint ? ` to ${endpoint}` : ''}`,
      { metadata: { endpoint } }
    );
  },

  // Agent Errors
  agentNotFound: (agentId: string) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.agentNotFound(agentId);
  },

  capabilityNotFound: (agentId: string, capability: string) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.capabilityNotFound(agentId, capability);
  },

  // Registry Errors
  registryUnavailable: (endpoint?: string) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.registryUnavailable(endpoint);
  },

  // Rate Limiting
  rateLimitExceeded: (limit: number, windowMs: number, retryAfterMs: number) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.rateLimitExceeded(limit, windowMs, retryAfterMs);
  },

  // Authentication
  authenticationFailed: (reason: string) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.authenticationFailed(reason);
  },

  // Internal Errors
  internalError: (message: string, cause?: Error) => {
    const { UEPErrorFactory } = require('./UEPErrors.js');
    return UEPErrorFactory.internalError(message, cause);
  }
};

/**
 * Type guards for error checking
 */
export const ErrorTypeGuards = {
  isUEPError: (error: any): error is import('./UEPErrors.js').UEPError => {
    const { UEPError } = require('./UEPErrors.js');
    return error instanceof UEPError;
  },

  isProtocolError: (error: any): error is import('./UEPErrors.js').UEPProtocolError => {
    const { UEPProtocolError } = require('./UEPErrors.js');
    return error instanceof UEPProtocolError;
  },

  isValidationError: (error: any): error is import('./UEPErrors.js').UEPValidationError => {
    const { UEPValidationError } = require('./UEPErrors.js');
    return error instanceof UEPValidationError;
  },

  isTimeoutError: (error: any): error is import('./UEPErrors.js').UEPTimeoutError => {
    const { UEPTimeoutError } = require('./UEPErrors.js');
    return error instanceof UEPTimeoutError;
  },

  isRetryableError: (error: any): boolean => {
    return ErrorTypeGuards.isUEPError(error) && UEPErrorUtils.isRetryable(error);
  }
};

// Default export with commonly used items
export default {
  // Core classes
  UEPError: require('./UEPErrors.js').UEPError,
  UEPErrorFactory: require('./UEPErrors.js').UEPErrorFactory,
  UEPErrorHandler: require('./UEPErrorHandler.js').UEPErrorHandler,
  UEPErrorRecovery: require('./UEPErrorRecovery.js').UEPErrorRecovery,
  UEPProtocolValidator: require('./UEPProtocolValidator.js').UEPProtocolValidator,

  // Utilities
  UEPErrorUtils,
  CommonErrors,
  ErrorTypeGuards,

  // Initialization
  initializeUEPErrorSystem,
  initializeUEPErrorHandling: require('./UEPErrorHandler.js').initializeUEPErrorHandling
};