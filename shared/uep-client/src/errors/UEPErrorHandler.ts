/**
 * UEP Error Handler and Middleware
 * 
 * Comprehensive error handling middleware for UEP agents that catches,
 * processes, and formats errors according to UEP protocol standards.
 * 
 * Features:
 * - Automatic error detection and classification
 * - Protocol violation monitoring and reporting
 * - Error transformation and response formatting
 * - Integration with tracing and monitoring systems
 * - Circuit breaker pattern for error recovery
 * - Error rate limiting and throttling
 */

import { EventEmitter } from 'events';
import {
  UEPError,
  UEPErrorType,
  UEPErrorSeverity,
  UEPErrorCategory,
  UEPErrorInfo,
  UEPErrorFactory
} from './UEPErrors.js';
import {
  UEPMessage,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  UEPTracingContext,
  UEPClient
} from '../core/UEPTypes.js';

/**
 * Error Handler Configuration
 */
export interface UEPErrorHandlerConfig {
  enableAutoRecovery?: boolean;
  enableCircuitBreaker?: boolean;
  enableErrorRateTracking?: boolean;
  enableDetailedLogging?: boolean;
  maxErrorRate?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  errorRetentionPeriod?: number;
  suppressedErrorTypes?: UEPErrorType[];
  customErrorTransforms?: Map<string, (error: Error) => UEPError>;
}

/**
 * Error Statistics
 */
export interface UEPErrorStatistics {
  totalErrors: number;
  errorsByType: Map<UEPErrorType, number>;
  errorsBySeverity: Map<UEPErrorSeverity, number>;
  errorsByCategory: Map<UEPErrorCategory, number>;
  errorRate: number;
  recentErrors: UEPErrorInfo[];
  lastError?: UEPErrorInfo;
  circuitBreakerStatus: 'closed' | 'open' | 'half-open';
}

/**
 * Error Context Information
 */
export interface UEPErrorContext {
  operation?: string;
  agentId?: string;
  capability?: string;
  requestId?: string;
  messageId?: string;
  tracing?: UEPTracingContext;
  metadata?: Record<string, any>;
}

/**
 * Circuit Breaker State
 */
interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

/**
 * UEP Error Handler Implementation
 */
export class UEPErrorHandler extends EventEmitter {
  private readonly config: Required<UEPErrorHandlerConfig>;
  private readonly errorHistory: UEPErrorInfo[] = [];
  private readonly errorCounts = new Map<UEPErrorType, number>();
  private readonly severityCounts = new Map<UEPErrorSeverity, number>();
  private readonly categoryCounts = new Map<UEPErrorCategory, number>();
  private circuitBreakerState: CircuitBreakerState;
  private lastErrorRateCalculation = Date.now();
  private client?: UEPClient;

  constructor(config: UEPErrorHandlerConfig = {}) {
    super();
    
    this.config = {
      enableAutoRecovery: true,
      enableCircuitBreaker: true,
      enableErrorRateTracking: true,
      enableDetailedLogging: true,
      maxErrorRate: 0.1, // 10% error rate threshold
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      errorRetentionPeriod: 300000, // 5 minutes
      suppressedErrorTypes: [],
      customErrorTransforms: new Map(),
      ...config
    };

    this.circuitBreakerState = {
      status: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };

    // Setup periodic error cleanup
    setInterval(() => this.cleanupOldErrors(), 60000); // Every minute
  }

  /**
   * Initialize error handler with UEP client
   */
  initialize(client: UEPClient): void {
    this.client = client;
    
    // Listen for client errors
    if (client && typeof client.on === 'function') {
      client.on('error', (error: Error) => {
        this.handleError(error, { operation: 'client-communication' });
      });
    }
  }

  /**
   * Handle any error and convert to UEP format
   */
  handleError(error: Error | UEPError, context: UEPErrorContext = {}): UEPError {
    // Convert to UEPError if not already
    const uepError = this.convertToUEPError(error, context);
    
    // Record error statistics
    this.recordError(uepError);
    
    // Update circuit breaker state
    if (this.config.enableCircuitBreaker) {
      this.updateCircuitBreaker(uepError);
    }
    
    // Log error if enabled
    if (this.config.enableDetailedLogging) {
      this.logError(uepError, context);
    }
    
    // Emit error event for external handling
    this.emit('error', uepError, context);
    
    // Attempt auto-recovery if enabled
    if (this.config.enableAutoRecovery) {
      this.attemptAutoRecovery(uepError, context);
    }
    
    return uepError;
  }

  /**
   * Create error response middleware for UEP requests
   */
  createErrorMiddleware() {
    return async (
      request: UEPRequest<any>,
      response: UEPResponse<any>,
      next: (error?: Error) => void
    ): Promise<void> => {
      try {
        await next();
      } catch (error) {
        const context: UEPErrorContext = {
          operation: 'request-processing',
          requestId: request.id,
          messageId: request.id,
          tracing: request.tracing,
          agentId: request.agent?.id,
          capability: request.routing?.subject
        };
        
        const uepError = this.handleError(error as Error, context);
        
        // Transform response to error format
        Object.assign(response, uepError.toUEPResponse());
      }
    };
  }

  /**
   * Wrap async function with error handling
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: Partial<UEPErrorContext> = {}
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        throw this.handleError(error as Error, context);
      }
    }) as T;
  }

  /**
   * Wrap sync function with error handling
   */
  wrapSync<T extends (...args: any[]) => any>(
    fn: T,
    context: Partial<UEPErrorContext> = {}
  ): T {
    return ((...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        throw this.handleError(error as Error, context);
      }
    }) as T;
  }

  /**
   * Check if circuit breaker allows operation
   */
  isCircuitBreakerOpen(): boolean {
    if (!this.config.enableCircuitBreaker) {
      return false;
    }
    
    const now = Date.now();
    
    switch (this.circuitBreakerState.status) {
      case 'open':
        if (now >= this.circuitBreakerState.nextAttemptTime) {
          this.circuitBreakerState.status = 'half-open';
          this.emit('circuit-breaker-half-open');
          return false;
        }
        return true;
        
      case 'half-open':
      case 'closed':
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Get current error statistics
   */
  getStatistics(): UEPErrorStatistics {
    const now = Date.now();
    const recentPeriod = 60000; // 1 minute
    const recentErrors = this.errorHistory.filter(
      error => now - error.timestamp.getTime() < recentPeriod
    );
    
    return {
      totalErrors: this.errorHistory.length,
      errorsByType: new Map(this.errorCounts),
      errorsBySeverity: new Map(this.severityCounts),
      errorsByCategory: new Map(this.categoryCounts),
      errorRate: recentErrors.length / (recentPeriod / 1000), // errors per second
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      lastError: this.errorHistory[this.errorHistory.length - 1],
      circuitBreakerStatus: this.circuitBreakerState.status
    };
  }

  /**
   * Reset error statistics
   */
  resetStatistics(): void {
    this.errorHistory.length = 0;
    this.errorCounts.clear();
    this.severityCounts.clear();
    this.categoryCounts.clear();
    this.circuitBreakerState = {
      status: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };
    
    this.emit('statistics-reset');
  }

  /**
   * Add custom error transform
   */
  addErrorTransform(errorName: string, transform: (error: Error) => UEPError): void {
    this.config.customErrorTransforms.set(errorName, transform);
  }

  /**
   * Convert any error to UEPError
   */
  private convertToUEPError(error: Error | UEPError, context: UEPErrorContext): UEPError {
    // Already a UEPError
    if (error instanceof UEPError) {
      return error;
    }
    
    // Check for custom transforms
    const transform = this.config.customErrorTransforms.get(error.constructor.name);
    if (transform) {
      return transform(error);
    }
    
    // Convert based on error type/message patterns
    if (this.isTimeoutError(error)) {
      return UEPErrorFactory.timeout(context.operation || 'operation', 5000);
    }
    
    if (this.isValidationError(error)) {
      return UEPErrorFactory.validationFailed(error.message, []);
    }
    
    if (this.isNetworkError(error)) {
      return new UEPError(UEPErrorType.CONNECTION_FAILED, error.message, {
        cause: error,
        tracing: context.tracing,
        metadata: context.metadata
      });
    }
    
    if (this.isAuthError(error)) {
      return UEPErrorFactory.authenticationFailed(error.message);
    }
    
    // Default to internal error
    return UEPErrorFactory.internalError(error.message, error);
  }

  /**
   * Record error in statistics
   */
  private recordError(error: UEPError): void {
    // Skip suppressed error types
    if (this.config.suppressedErrorTypes.includes(error.type)) {
      return;
    }
    
    // Add to history
    this.errorHistory.push(error.toErrorInfo());
    
    // Update counters
    this.errorCounts.set(error.type, (this.errorCounts.get(error.type) || 0) + 1);
    this.severityCounts.set(error.severity, (this.severityCounts.get(error.severity) || 0) + 1);
    this.categoryCounts.set(error.category, (this.categoryCounts.get(error.category) || 0) + 1);
    
    // Emit statistics update
    this.emit('error-recorded', error);
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(error: UEPError): void {
    const now = Date.now();
    
    // Only count critical/high severity errors for circuit breaker
    if (error.severity !== UEPErrorSeverity.CRITICAL && error.severity !== UEPErrorSeverity.HIGH) {
      return;
    }
    
    this.circuitBreakerState.failureCount++;
    this.circuitBreakerState.lastFailureTime = now;
    
    // Check if we should open the circuit breaker
    if (this.circuitBreakerState.status === 'closed' &&
        this.circuitBreakerState.failureCount >= this.config.circuitBreakerThreshold) {
      
      this.circuitBreakerState.status = 'open';
      this.circuitBreakerState.nextAttemptTime = now + this.config.circuitBreakerTimeout;
      
      this.emit('circuit-breaker-opened', {
        failureCount: this.circuitBreakerState.failureCount,
        lastError: error
      });
    }
    
    // Handle half-open state
    if (this.circuitBreakerState.status === 'half-open') {
      // Failure in half-open state - go back to open
      this.circuitBreakerState.status = 'open';
      this.circuitBreakerState.nextAttemptTime = now + this.config.circuitBreakerTimeout;
      
      this.emit('circuit-breaker-reopened');
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: UEPError, context: UEPErrorContext): void {
    const logData = {
      error: error.toErrorInfo(),
      context,
      timestamp: new Date().toISOString()
    };
    
    switch (error.severity) {
      case UEPErrorSeverity.CRITICAL:
        console.error('🚨 UEP CRITICAL ERROR:', JSON.stringify(logData, null, 2));
        break;
      case UEPErrorSeverity.HIGH:
        console.error('❌ UEP HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      case UEPErrorSeverity.MEDIUM:
        console.warn('⚠️ UEP MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      case UEPErrorSeverity.LOW:
        console.log('ℹ️ UEP LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
        break;
      default:
        console.log('🔍 UEP ERROR:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Attempt automatic recovery based on error type
   */
  private attemptAutoRecovery(error: UEPError, context: UEPErrorContext): void {
    switch (error.type) {
      case UEPErrorType.CONNECTION_FAILED:
        this.emit('auto-recovery-attempt', { type: 'reconnect', error, context });
        break;
        
      case UEPErrorType.REGISTRY_UNAVAILABLE:
        this.emit('auto-recovery-attempt', { type: 'registry-reconnect', error, context });
        break;
        
      case UEPErrorType.AGENT_UNAVAILABLE:
        this.emit('auto-recovery-attempt', { type: 'agent-discovery', error, context });
        break;
        
      default:
        // No auto-recovery for this error type
        break;
    }
  }

  /**
   * Clean up old errors from history
   */
  private cleanupOldErrors(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.errorRetentionPeriod;
    
    // Remove old errors
    const originalLength = this.errorHistory.length;
    this.errorHistory.splice(0, this.errorHistory.findIndex(
      error => error.timestamp.getTime() > cutoffTime
    ));
    
    if (this.errorHistory.length < originalLength) {
      this.emit('error-history-cleaned', {
        removed: originalLength - this.errorHistory.length,
        remaining: this.errorHistory.length
      });
    }
  }

  /**
   * Error type detection helpers
   */
  private isTimeoutError(error: Error): boolean {
    return /timeout|timed out/i.test(error.message) || error.name === 'TimeoutError';
  }

  private isValidationError(error: Error): boolean {
    return /validation|invalid|schema/i.test(error.message) || error.name === 'ValidationError';
  }

  private isNetworkError(error: Error): boolean {
    return /network|connection|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error.message) ||
           error.name === 'NetworkError';
  }

  private isAuthError(error: Error): boolean {
    return /auth|unauthorized|forbidden|401|403/i.test(error.message) ||
           error.name === 'AuthenticationError';
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: UEPErrorHandler | null = null;

/**
 * Get or create global error handler
 */
export function getUEPErrorHandler(config?: UEPErrorHandlerConfig): UEPErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new UEPErrorHandler(config);
  }
  return globalErrorHandler;
}

/**
 * Initialize global error handling
 */
export function initializeUEPErrorHandling(
  client?: UEPClient,
  config?: UEPErrorHandlerConfig
): UEPErrorHandler {
  const handler = getUEPErrorHandler(config);
  
  if (client) {
    handler.initialize(client);
  }
  
  // Setup global uncaught exception handling
  process.on('uncaughtException', (error) => {
    const uepError = handler.handleError(error, { operation: 'uncaught-exception' });
    console.error('Uncaught Exception handled by UEP Error Handler:', uepError.toErrorInfo());
    
    // Don't exit process - let the application decide
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const uepError = handler.handleError(error, { operation: 'unhandled-rejection' });
    console.error('Unhandled Rejection handled by UEP Error Handler:', uepError.toErrorInfo());
  });
  
  return handler;
}

export {
  UEPErrorHandler,
  UEPErrorHandlerConfig,
  UEPErrorStatistics,
  UEPErrorContext
};