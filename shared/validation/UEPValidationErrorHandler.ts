/**
 * UEP Standardized Validation Error Handler
 * 
 * Comprehensive error handling system for UEP protocol validation failures
 * providing consistent error formatting, logging, metrics collection, and
 * response generation across all validation contexts. Based on TaskMaster
 * research findings and Context7 methodology.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { Request, Response } from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { Logger } from '../utils/Logger';
import { UEPValidationError, UEPValidationResult } from '../../containers/api-gateway/src/validation/UEPValidationMiddleware';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPErrorContext {
  requestId: string;
  correlationId?: string;
  endpoint: string;
  method: string;
  userAgent?: string;
  clientIp?: string;
  timestamp: string;
  validationContext: 'api-gateway' | 'service-to-service' | 'event-validation' | 'grpc' | 'unknown';
  serviceId?: string;
  agentType?: string;
  protocolVersion: string;
}

export interface UEPStandardizedError {
  error: {
    code: string;
    message: string;
    type: 'validation_error' | 'protocol_error' | 'system_error' | 'authentication_error' | 'authorization_error';
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  details: {
    violations: UEPValidationError[];
    warnings: UEPValidationError[];
    context: UEPErrorContext;
    validationTime: number;
    schemaVersion: string;
  };
  suggestions?: {
    fixes: string[];
    documentation: string[];
    examples: Record<string, any>[];
  };
  metadata: {
    timestamp: string;
    requestId: string;
    correlationId?: string;
    supportCode: string;
    retryable: boolean;
    expectedFormat?: any;
  };
}

export interface UEPErrorHandlerConfig {
  enableDetailedErrors: boolean;
  enableSuggestions: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  includeStackTrace: boolean;
  includeSensitiveData: boolean;
  maxErrorHistory: number;
  errorCacheTimeout: number;
  enableErrorAggregation: boolean;
  sanitizeErrors: boolean;
}

export interface UEPErrorMetrics {
  validationErrorsTotal: Counter;
  errorsByType: Counter;
  errorsBySeverity: Counter;
  errorResponseTime: Histogram;
  activeErrors: Gauge;
  errorAggregations: Counter;
}

export type UEPErrorHandler = (error: Error, context: UEPErrorContext, validationResult?: UEPValidationResult) => Promise<UEPStandardizedError>;
export type UEPErrorLogger = (error: UEPStandardizedError, originalError?: Error) => void;

// =============================================================================
// UEP Validation Error Handler Core Class
// =============================================================================

export class UEPValidationErrorHandler {
  private readonly config: UEPErrorHandlerConfig;
  private readonly logger = new Logger('UEPValidationErrorHandler');
  private readonly tracer = trace.getTracer('uep-validation-error-handler', '1.0.0');
  
  // Error tracking and aggregation
  private readonly errorHistory: Map<string, UEPStandardizedError[]> = new Map();
  private readonly errorAggregations: Map<string, number> = new Map();
  
  // Metrics collection
  private readonly metrics: UEPErrorMetrics;
  
  // Custom error handlers by context
  private readonly contextHandlers: Map<string, UEPErrorHandler> = new Map();

  constructor(config: Partial<UEPErrorHandlerConfig> = {}) {
    this.config = {
      enableDetailedErrors: true,
      enableSuggestions: true,
      enableMetrics: true,
      enableTracing: true,
      logLevel: 'warn',
      includeStackTrace: false,
      includeSensitiveData: false,
      maxErrorHistory: 1000,
      errorCacheTimeout: 300000, // 5 minutes
      enableErrorAggregation: true,
      sanitizeErrors: true,
      ...config
    };

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Set up error history cleanup
    this.setupErrorHistoryCleanup();
  }

  // =============================================================================
  // Core Error Handling Logic
  // =============================================================================

  public async handleValidationError(
    validationResult: UEPValidationResult,
    context: UEPErrorContext,
    originalError?: Error
  ): Promise<UEPStandardizedError> {
    return this.tracer.startActiveSpan('uep.error.handle_validation', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'error.context': context.validationContext,
          'error.endpoint': context.endpoint,
          'error.method': context.method,
          'error.request_id': context.requestId,
          'validation.error_count': validationResult.errors.length,
          'validation.warning_count': validationResult.warnings.length
        });

        // Generate support code for tracking
        const supportCode = this.generateSupportCode(context);

        // Determine error type and severity
        const errorType = this.determineErrorType(validationResult, originalError);
        const severity = this.determineSeverity(validationResult, context);

        // Create standardized error
        const standardizedError: UEPStandardizedError = {
          error: {
            code: this.generateErrorCode(validationResult, context),
            message: this.generateErrorMessage(validationResult, context),
            type: errorType,
            severity
          },
          details: {
            violations: this.sanitizeErrors(validationResult.errors),
            warnings: this.sanitizeErrors(validationResult.warnings),
            context: this.sanitizeContext(context),
            validationTime: validationResult.validationTime,
            schemaVersion: validationResult.schemaVersion
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: context.requestId,
            correlationId: context.correlationId,
            supportCode,
            retryable: this.isRetryable(validationResult, context)
          }
        };

        // Add suggestions if enabled
        if (this.config.enableSuggestions) {
          standardizedError.suggestions = this.generateSuggestions(validationResult, context);
        }

        // Add expected format if helpful
        if (this.config.enableDetailedErrors) {
          standardizedError.metadata.expectedFormat = this.generateExpectedFormat(validationResult);
        }

        // Track error history
        if (this.config.enableErrorAggregation) {
          this.trackError(standardizedError, context);
        }

        // Update metrics
        if (this.config.enableMetrics) {
          this.updateMetrics(standardizedError, Date.now() - startTime);
        }

        // Log error
        this.logError(standardizedError, originalError);

        span.setAttributes({
          'error.support_code': supportCode,
          'error.type': errorType,
          'error.severity': severity,
          'error.retryable': standardizedError.metadata.retryable
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return standardizedError;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        // Fallback error response
        return this.createFallbackError(context, originalError || error as Error);
      }
    });
  }

  // =============================================================================
  // Express Error Middleware
  // =============================================================================

  public getExpressErrorMiddleware() {
    return async (error: any, req: Request, res: Response, next: any) => {
      return this.tracer.startActiveSpan('uep.error.express_middleware', async (span) => {
        try {
          const context: UEPErrorContext = {
            requestId: req.get('X-Request-ID') || this.generateRequestId(),
            correlationId: req.get('X-Correlation-ID'),
            endpoint: `${req.method} ${req.path}`,
            method: req.method,
            userAgent: req.get('User-Agent'),
            clientIp: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString(),
            validationContext: 'api-gateway',
            agentType: req.get('X-UEP-Agent-Type'),
            protocolVersion: req.get('X-UEP-Protocol-Version') || '2.0.0'
          };

          span.setAttributes({
            'http.method': req.method,
            'http.url': req.url,
            'http.status_code': res.statusCode,
            'error.type': error.name || 'unknown',
            'error.context': context.validationContext
          });

          let standardizedError: UEPStandardizedError;

          // Handle validation errors specifically
          if (error.validationResult) {
            standardizedError = await this.handleValidationError(
              error.validationResult as UEPValidationResult,
              context,
              error
            );
          } else {
            // Handle other errors
            const validationResult: UEPValidationResult = {
              valid: false,
              errors: [{
                code: 'SYSTEM_ERROR',
                message: error.message || 'An unexpected error occurred',
                severity: 'error'
              }],
              warnings: [],
              validationTime: 0,
              schemaVersion: '2.0.0',
              cacheHit: false
            };

            standardizedError = await this.handleValidationError(
              validationResult,
              context,
              error
            );
          }

          // Determine HTTP status code
          const statusCode = this.getHttpStatusCode(standardizedError);

          // Set response headers
          res.set({
            'Content-Type': 'application/json',
            'X-Error-Support-Code': standardizedError.metadata.supportCode,
            'X-Request-ID': context.requestId,
            'X-UEP-Error-Type': standardizedError.error.type,
            'X-UEP-Error-Severity': standardizedError.error.severity
          });

          if (context.correlationId) {
            res.set('X-Correlation-ID', context.correlationId);
          }

          // Send error response
          res.status(statusCode).json(standardizedError);

          span.setAttributes({
            'http.response.status_code': statusCode,
            'error.support_code': standardizedError.metadata.supportCode
          });

          span.setStatus({ code: SpanStatusCode.OK });

        } catch (middlewareError) {
          span.recordException(middlewareError as Error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: (middlewareError as Error).message });
          
          // Final fallback
          res.status(500).json({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'An internal server error occurred',
              type: 'system_error',
              severity: 'critical'
            },
            metadata: {
              timestamp: new Date().toISOString(),
              supportCode: this.generateSupportCode({} as UEPErrorContext)
            }
          });
        }
      });
    };
  }

  // =============================================================================
  // Error Classification and Analysis
  // =============================================================================

  private determineErrorType(
    validationResult: UEPValidationResult,
    originalError?: Error
  ): UEPStandardizedError['error']['type'] {
    if (originalError?.name === 'UnauthorizedError') return 'authentication_error';
    if (originalError?.name === 'ForbiddenError') return 'authorization_error';
    
    if (validationResult.errors.some(e => e.code.includes('PROTOCOL'))) {
      return 'protocol_error';
    }
    
    if (validationResult.errors.some(e => e.code.includes('VALIDATION'))) {
      return 'validation_error';
    }
    
    return 'system_error';
  }

  private determineSeverity(
    validationResult: UEPValidationResult,
    context: UEPErrorContext
  ): UEPStandardizedError['error']['severity'] {
    const errorCodes = validationResult.errors.map(e => e.code);
    
    if (errorCodes.some(code => code.includes('SECURITY') || code.includes('AUTH'))) {
      return 'critical';
    }
    
    if (errorCodes.some(code => code.includes('PROTOCOL') || code.includes('REQUIRED'))) {
      return 'high';
    }
    
    if (context.validationContext === 'api-gateway') {
      return 'medium';
    }
    
    return 'low';
  }

  private isRetryable(
    validationResult: UEPValidationResult,
    context: UEPErrorContext
  ): boolean {
    // System errors are generally retryable
    if (validationResult.errors.some(e => e.code.includes('SYSTEM') || e.code.includes('TIMEOUT'))) {
      return true;
    }
    
    // Validation errors are not retryable unless the data changes
    if (validationResult.errors.some(e => e.code.includes('VALIDATION') || e.code.includes('SCHEMA'))) {
      return false;
    }
    
    // Protocol errors might be retryable if they're version-related
    if (validationResult.errors.some(e => e.code.includes('VERSION'))) {
      return true;
    }
    
    return false;
  }

  // =============================================================================
  // Error Message and Code Generation
  // =============================================================================

  private generateErrorCode(
    validationResult: UEPValidationResult,
    context: UEPErrorContext
  ): string {
    const primaryError = validationResult.errors[0];
    if (!primaryError) return 'UEP_UNKNOWN_ERROR';
    
    const contextPrefix = context.validationContext.toUpperCase().replace('-', '_');
    return `UEP_${contextPrefix}_${primaryError.code}`;
  }

  private generateErrorMessage(
    validationResult: UEPValidationResult,
    context: UEPErrorContext
  ): string {
    const errorCount = validationResult.errors.length;
    const warningCount = validationResult.warnings.length;
    
    if (errorCount === 1 && warningCount === 0) {
      return `UEP validation failed: ${validationResult.errors[0].message}`;
    }
    
    if (errorCount > 1) {
      return `UEP validation failed with ${errorCount} error${errorCount > 1 ? 's' : ''}${warningCount > 0 ? ` and ${warningCount} warning${warningCount > 1 ? 's' : ''}` : ''}`;
    }
    
    return 'UEP validation failed due to protocol compliance issues';
  }

  private generateSuggestions(
    validationResult: UEPValidationResult,
    context: UEPErrorContext
  ): UEPStandardizedError['suggestions'] {
    const fixes: string[] = [];
    const documentation: string[] = [];
    const examples: Record<string, any>[] = [];

    for (const error of validationResult.errors) {
      switch (error.code) {
        case 'VALIDATION_REQUIRED':
          fixes.push(`Add the required field: ${error.field}`);
          break;
        case 'VALIDATION_TYPE':
          fixes.push(`Ensure field '${error.field}' is of the correct type`);
          break;
        case 'VALIDATION_FORMAT':
          fixes.push(`Check the format of field '${error.field}'`);
          break;
        case 'PROTOCOL_VERSION_MISMATCH':
          fixes.push('Update the protocol version to match the expected version');
          documentation.push('https://docs.uep-factory.com/protocol-versions');
          break;
        default:
          fixes.push('Review the UEP protocol documentation for compliance requirements');
      }
    }

    // Add generic documentation
    documentation.push('https://docs.uep-factory.com/validation-guide');
    documentation.push('https://docs.uep-factory.com/troubleshooting');

    // Generate example for common errors
    if (validationResult.errors.some(e => e.code.includes('REQUIRED'))) {
      examples.push({
        description: 'Example of a valid UEP message structure',
        example: {
          messageId: '550e8400-e29b-41d4-a716-446655440000',
          messageType: 'agent-request',
          version: '2.0.0',
          timestamp: '2025-01-29T12:00:00.000Z',
          source: {
            agentId: 'agent-123',
            agentType: 'processing-agent',
            version: '1.0.0'
          },
          payload: {
            action: 'process-data',
            data: {}
          }
        }
      });
    }

    return { fixes, documentation, examples };
  }

  private generateExpectedFormat(validationResult: UEPValidationResult): any {
    // Generate a template of the expected format based on validation errors
    const template: any = {
      messageId: 'string (UUID v4)',
      messageType: 'string (kebab-case)',
      version: 'string (semver)',
      timestamp: 'string (ISO 8601)',
      source: {
        agentId: 'string',
        agentType: 'string (kebab-case)',
        version: 'string (semver)'
      },
      payload: 'object'
    };

    // Add optional fields mentioned in errors
    for (const error of validationResult.errors) {
      if (error.field?.includes('target')) {
        template.target = {
          agentId: 'string',
          agentType: 'string (kebab-case)'
        };
      }
      if (error.field?.includes('headers')) {
        template.headers = 'object (optional)';
      }
      if (error.field?.includes('traceId')) {
        template.traceId = 'string (32 char hex, optional)';
      }
      if (error.field?.includes('correlationId')) {
        template.correlationId = 'string (optional)';
      }
    }

    return template;
  }

  // =============================================================================
  // Error Sanitization and Security
  // =============================================================================

  private sanitizeErrors(errors: UEPValidationError[]): UEPValidationError[] {
    if (!this.config.sanitizeErrors) return errors;

    return errors.map(error => ({
      ...error,
      value: this.config.includeSensitiveData ? error.value : this.sanitizeValue(error.value)
    }));
  }

  private sanitizeContext(context: UEPErrorContext): UEPErrorContext {
    if (!this.config.sanitizeErrors) return context;

    return {
      ...context,
      userAgent: this.config.includeSensitiveData ? context.userAgent : '[REDACTED]',
      clientIp: this.config.includeSensitiveData ? context.clientIp : '[REDACTED]'
    };
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Check for potential sensitive patterns
      if (/token|key|secret|password|auth/i.test(value)) {
        return '[REDACTED]';
      }
      if (value.length > 100) {
        return value.substring(0, 100) + '... [TRUNCATED]';
      }
    }
    return value;
  }

  // =============================================================================
  // Error Tracking and Aggregation
  // =============================================================================

  private trackError(error: UEPStandardizedError, context: UEPErrorContext): void {
    const errorKey = `${context.endpoint}:${error.error.code}`;
    
    // Track in history
    if (!this.errorHistory.has(errorKey)) {
      this.errorHistory.set(errorKey, []);
    }
    
    const history = this.errorHistory.get(errorKey)!;
    history.push(error);
    
    // Limit history size
    if (history.length > this.config.maxErrorHistory) {
      history.shift();
    }
    
    // Track aggregations
    const aggregationKey = `${context.validationContext}:${error.error.type}:${error.error.severity}`;
    this.errorAggregations.set(
      aggregationKey,
      (this.errorAggregations.get(aggregationKey) || 0) + 1
    );
  }

  private setupErrorHistoryCleanup(): void {
    setInterval(() => {
      const cutoffTime = Date.now() - this.config.errorCacheTimeout;
      
      for (const [key, errors] of this.errorHistory.entries()) {
        const filteredErrors = errors.filter(error => 
          new Date(error.metadata.timestamp).getTime() > cutoffTime
        );
        
        if (filteredErrors.length === 0) {
          this.errorHistory.delete(key);
        } else {
          this.errorHistory.set(key, filteredErrors);
        }
      }
    }, this.config.errorCacheTimeout / 2);
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private generateSupportCode(context: UEPErrorContext): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const contextPrefix = context.validationContext?.substr(0, 2).toUpperCase() || 'UX';
    return `${contextPrefix}-${timestamp}-${random}`.toUpperCase();
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getHttpStatusCode(error: UEPStandardizedError): number {
    switch (error.error.type) {
      case 'validation_error':
      case 'protocol_error':
        return 400;
      case 'authentication_error':
        return 401;
      case 'authorization_error':
        return 403;
      case 'system_error':
        return error.error.severity === 'critical' ? 503 : 500;
      default:
        return 500;
    }
  }

  private createFallbackError(context: UEPErrorContext, error: Error): UEPStandardizedError {
    return {
      error: {
        code: 'UEP_SYSTEM_FALLBACK_ERROR',
        message: 'An unexpected error occurred during error processing',
        type: 'system_error',
        severity: 'critical'
      },
      details: {
        violations: [{
          code: 'SYSTEM_ERROR',
          message: error.message,
          severity: 'error'
        }],
        warnings: [],
        context: this.sanitizeContext(context),
        validationTime: 0,
        schemaVersion: '2.0.0'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        correlationId: context.correlationId,
        supportCode: this.generateSupportCode(context),
        retryable: false
      }
    };
  }

  // =============================================================================
  // Logging
  // =============================================================================

  private logError(error: UEPStandardizedError, originalError?: Error): void {
    const logData = {
      supportCode: error.metadata.supportCode,
      errorCode: error.error.code,
      errorType: error.error.type,
      severity: error.error.severity,
      context: error.details.context.validationContext,
      endpoint: error.details.context.endpoint,
      violationCount: error.details.violations.length,
      warningCount: error.details.warnings.length
    };

    switch (error.error.severity) {
      case 'critical':
        this.logger.error('Critical UEP validation error', logData, originalError);
        break;
      case 'high':
        this.logger.error('High severity UEP validation error', logData, originalError);
        break;
      case 'medium':
        this.logger.warn('Medium severity UEP validation error', logData);
        break;
      case 'low':
        this.logger.info('Low severity UEP validation error', logData);
        break;
    }
  }

  // =============================================================================
  // Metrics
  // =============================================================================

  private initializeMetrics(): UEPErrorMetrics {
    const prefix = 'uep_validation_error_';

    return {
      validationErrorsTotal: new Counter({
        name: `${prefix}total`,
        help: 'Total validation errors handled',
        labelNames: ['context', 'endpoint', 'error_type', 'severity']
      }),

      errorsByType: new Counter({
        name: `${prefix}by_type_total`,
        help: 'Errors grouped by type',
        labelNames: ['error_type', 'context']
      }),

      errorsBySeverity: new Counter({
        name: `${prefix}by_severity_total`,
        help: 'Errors grouped by severity',
        labelNames: ['severity', 'context']
      }),

      errorResponseTime: new Histogram({
        name: `${prefix}response_time_seconds`,
        help: 'Error handling response time',
        labelNames: ['error_type', 'context'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
      }),

      activeErrors: new Gauge({
        name: `${prefix}active_errors`,
        help: 'Number of active error types being tracked'
      }),

      errorAggregations: new Counter({
        name: `${prefix}aggregations_total`,
        help: 'Error aggregations by context and type',
        labelNames: ['context', 'error_type', 'severity']
      })
    };
  }

  private updateMetrics(error: UEPStandardizedError, responseTime: number): void {
    const context = error.details.context.validationContext;
    const endpoint = error.details.context.endpoint;

    this.metrics.validationErrorsTotal.inc({
      context,
      endpoint,
      error_type: error.error.type,
      severity: error.error.severity
    });

    this.metrics.errorsByType.inc({
      error_type: error.error.type,
      context
    });

    this.metrics.errorsBySeverity.inc({
      severity: error.error.severity,
      context
    });

    this.metrics.errorResponseTime.observe(
      { error_type: error.error.type, context },
      responseTime / 1000
    );

    this.metrics.activeErrors.set(this.errorHistory.size);
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public registerCustomHandler(context: string, handler: UEPErrorHandler): void {
    this.contextHandlers.set(context, handler);
  }

  public getErrorStats() {
    return {
      config: this.config,
      errorHistory: {
        totalTypes: this.errorHistory.size,
        totalAggregations: this.errorAggregations.size,
        aggregations: Object.fromEntries(this.errorAggregations)
      },
      customHandlers: Array.from(this.contextHandlers.keys())
    };
  }

  public clearErrorHistory(): void {
    this.errorHistory.clear();
    this.errorAggregations.clear();
  }
}

export default UEPValidationErrorHandler;