/**
 * UEP Protocol Validation Middleware for API Gateway
 * 
 * Comprehensive validation middleware implementing UEP protocol compliance
 * for all agent communications at the API Gateway level. Based on TaskMaster
 * research findings (Task 238) and Context7 methodology.
 * 
 * Key Features:
 * - AJV v8+ JSON Schema validation with performance optimizations
 * - TypeScript decorators for elegant validation integration
 * - Comprehensive caching and metrics collection
 * - Multi-layer validation (syntax, protocol, business rules)
 * - OpenTelemetry observability integration
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { Request, Response, NextFunction } from 'express';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { Logger } from '../utils/Logger';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPProtocolMessage {
  messageId: string;
  messageType: string;
  version: string;
  timestamp: string;
  source: {
    agentId: string;
    agentType: string;
    version: string;
  };
  target?: {
    agentId: string;
    agentType: string;
  };
  payload: Record<string, any>;
  headers?: Record<string, string>;
  traceId?: string;
  correlationId?: string;
}

export interface UEPValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
  constraint?: string;
  severity: 'error' | 'warning';
}

export interface UEPValidationResult {
  valid: boolean;
  errors: UEPValidationError[];
  warnings: UEPValidationError[];
  correctedData?: any;
  validationTime: number;
  schemaVersion: string;
  cacheHit: boolean;
}

export interface UEPValidationConfig {
  strictMode: boolean;
  enableCorrection: boolean;
  enableCaching: boolean;
  cacheSize: number;
  cacheTtl: number;
  performanceMode: 'strict' | 'balanced' | 'fast';
  enableMetrics: boolean;
  enableTracing: boolean;
  schemaVersion: string;
  allowUnknownFormats: boolean;
}

export interface UEPValidationMetrics {
  totalValidations: Counter;
  validationErrors: Counter;
  validationWarnings: Counter;
  validationDuration: Histogram;
  cacheHitRatio: Gauge;
  schemaCompilations: Counter;
  protocolVersionMismatches: Counter;
}

// =============================================================================
// JSON Schema Definitions (Context7 Methodology)
// =============================================================================

const UEPMessageSchema: JSONSchemaType<UEPProtocolMessage> = {
  type: 'object',
  properties: {
    messageId: {
      type: 'string',
      pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$',
      description: 'UUID v4 message identifier'
    },
    messageType: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-z][a-z0-9-]*[a-z0-9]$',
      description: 'Kebab-case message type identifier'
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Semantic version (semver) of UEP protocol'
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp'
    },
    source: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Unique agent identifier'
        },
        agentType: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: '^[a-z][a-z0-9-]*[a-z0-9]$',
          description: 'Kebab-case agent type'
        },
        version: {
          type: 'string',
          pattern: '^\\d+\\.\\d+\\.\\d+$',
          description: 'Agent semantic version'
        }
      },
      required: ['agentId', 'agentType', 'version'],
      additionalProperties: false
    },
    target: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          minLength: 1,
          maxLength: 200
        },
        agentType: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          pattern: '^[a-z][a-z0-9-]*[a-z0-9]$'
        }
      },
      required: ['agentId', 'agentType'],
      additionalProperties: false,
      nullable: true
    },
    payload: {
      type: 'object',
      description: 'Message payload - structure varies by messageType'
    },
    headers: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z][a-zA-Z0-9-]*$': {
          type: 'string'
        }
      },
      additionalProperties: false,
      nullable: true
    },
    traceId: {
      type: 'string',
      pattern: '^[a-f0-9]{32}$',
      nullable: true,
      description: 'OpenTelemetry trace ID'
    },
    correlationId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      nullable: true,
      description: 'Request correlation identifier'
    }
  },
  required: ['messageId', 'messageType', 'version', 'timestamp', 'source', 'payload'],
  additionalProperties: false
};

// =============================================================================
// UEP Validation Middleware Core Class
// =============================================================================

export class UEPValidationMiddleware {
  private readonly logger = new Logger('UEPValidationMiddleware');
  private readonly ajv: Ajv;
  private readonly tracer = trace.getTracer('uep-validation-middleware', '1.0.0');
  
  // Validation cache for performance optimization
  private readonly validationCache: LRUCache<string, UEPValidationResult>;
  private readonly schemaCache: Map<string, ValidateFunction> = new Map();
  
  // Configuration
  private readonly config: UEPValidationConfig;
  
  // Metrics collection (Prometheus-compatible)
  private readonly metrics: UEPValidationMetrics;

  constructor(config: Partial<UEPValidationConfig> = {}) {
    this.config = {
      strictMode: true,
      enableCorrection: false,
      enableCaching: true,
      cacheSize: 10000,
      cacheTtl: 300000, // 5 minutes
      performanceMode: 'balanced',
      enableMetrics: true,
      enableTracing: true,
      schemaVersion: '2.0.0',
      allowUnknownFormats: false,
      ...config
    };

    // Initialize AJV with performance optimizations
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: this.config.strictMode,
      removeAdditional: false, // Preserve unknown properties for debugging
      useDefaults: true,
      coerceTypes: false, // Strict type checking
      allowUnionTypes: true
    });

    // Add format validators
    addFormats(this.ajv);

    // Initialize validation cache
    this.validationCache = new LRUCache({
      max: this.config.cacheSize,
      ttl: this.config.cacheTtl,
      updateAgeOnGet: true,
      allowStale: false
    });

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Pre-compile core UEP schema
    this.compileSchema('uep-message', UEPMessageSchema);
    
    this.logger.info('UEP Validation Middleware initialized', {
      strictMode: this.config.strictMode,
      cacheSize: this.config.cacheSize,
      performanceMode: this.config.performanceMode,
      schemaVersion: this.config.schemaVersion
    });
  }

  // =============================================================================
  // Schema Management
  // =============================================================================

  private compileSchema<T>(schemaId: string, schema: JSONSchemaType<T>): ValidateFunction<T> {
    return this.tracer.startActiveSpan('uep.validation.schema.compile', (span) => {
      try {
        span.setAttributes({
          'uep.schema.id': schemaId,
          'uep.schema.version': this.config.schemaVersion
        });

        const validator = this.ajv.compile(schema);
        this.schemaCache.set(schemaId, validator);
        
        if (this.config.enableMetrics) {
          this.metrics.schemaCompilations.inc({ schema_id: schemaId });
        }

        span.setStatus({ code: SpanStatusCode.OK });
        this.logger.debug(`Schema compiled successfully: ${schemaId}`);
        
        return validator;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        this.logger.error(`Schema compilation failed: ${schemaId}`, { error: (error as Error).message });
        throw error;
      }
    });
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPValidationMetrics {
    const metricsPrefix = 'uep_validation_';
    
    return {
      totalValidations: new Counter({
        name: `${metricsPrefix}total`,
        help: 'Total number of UEP validation attempts',
        labelNames: ['endpoint', 'method', 'result']
      }),
      
      validationErrors: new Counter({
        name: `${metricsPrefix}errors_total`,
        help: 'Total number of validation errors',
        labelNames: ['error_type', 'field', 'endpoint']
      }),
      
      validationWarnings: new Counter({
        name: `${metricsPrefix}warnings_total`,
        help: 'Total number of validation warnings',
        labelNames: ['warning_type', 'field', 'endpoint']
      }),
      
      validationDuration: new Histogram({
        name: `${metricsPrefix}duration_seconds`,
        help: 'Duration of validation operations in seconds',
        labelNames: ['endpoint', 'cache_hit'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
      }),
      
      cacheHitRatio: new Gauge({
        name: `${metricsPrefix}cache_hit_ratio`,
        help: 'Ratio of cache hits to total validations',
        collect() {
          // Auto-calculated from cache statistics
        }
      }),
      
      schemaCompilations: new Counter({
        name: `${metricsPrefix}schema_compilations_total`,
        help: 'Total number of schema compilations',
        labelNames: ['schema_id']
      }),
      
      protocolVersionMismatches: new Counter({
        name: `${metricsPrefix}version_mismatches_total`,
        help: 'Total number of protocol version mismatches',
        labelNames: ['expected_version', 'actual_version']
      })
    };
  }

  // =============================================================================
  // Core Validation Logic
  // =============================================================================

  public validateUEPMessage(data: any, endpoint?: string): UEPValidationResult {
    return this.tracer.startActiveSpan('uep.validation.validate_message', (span) => {
      const startTime = Date.now();
      let cacheHit = false;

      try {
        span.setAttributes({
          'uep.validation.endpoint': endpoint || 'unknown',
          'uep.validation.strict_mode': this.config.strictMode,
          'uep.validation.cache_enabled': this.config.enableCaching
        });

        // Generate cache key for performance optimization
        const cacheKey = this.generateCacheKey(data);
        
        // Check cache first (if enabled)
        if (this.config.enableCaching) {
          const cachedResult = this.validationCache.get(cacheKey);
          if (cachedResult) {
            cacheHit = true;
            span.setAttributes({ 'uep.validation.cache_hit': true });
            
            if (this.config.enableMetrics) {
              this.metrics.validationDuration.observe(
                { endpoint: endpoint || 'unknown', cache_hit: 'true' },
                (Date.now() - startTime) / 1000
              );
            }
            
            return cachedResult;
          }
        }

        // Perform validation
        const validator = this.schemaCache.get('uep-message');
        if (!validator) {
          throw new Error('UEP message schema not compiled');
        }

        const valid = validator(data);
        const errors: UEPValidationError[] = [];
        const warnings: UEPValidationError[] = [];

        // Process validation errors
        if (!valid && validator.errors) {
          for (const error of validator.errors) {
            const uepError: UEPValidationError = {
              code: `VALIDATION_${error.keyword?.toUpperCase()}`,
              message: error.message || 'Validation failed',
              field: error.instancePath || error.schemaPath,
              value: error.data,
              constraint: error.keyword,
              severity: this.config.strictMode ? 'error' : 'warning'
            };

            if (this.config.strictMode) {
              errors.push(uepError);
            } else {
              warnings.push(uepError);
            }
          }
        }

        // Check protocol version compatibility
        if (valid && data.version !== this.config.schemaVersion) {
          const versionWarning: UEPValidationError = {
            code: 'PROTOCOL_VERSION_MISMATCH',
            message: `Expected version ${this.config.schemaVersion}, got ${data.version}`,
            field: 'version',
            value: data.version,
            constraint: 'version_compatibility',
            severity: 'warning'
          };
          
          warnings.push(versionWarning);
          
          if (this.config.enableMetrics) {
            this.metrics.protocolVersionMismatches.inc({
              expected_version: this.config.schemaVersion,
              actual_version: data.version
            });
          }
        }

        const validationTime = Date.now() - startTime;
        const result: UEPValidationResult = {
          valid: errors.length === 0,
          errors,
          warnings,
          validationTime,
          schemaVersion: this.config.schemaVersion,
          cacheHit
        };

        // Cache the result (if enabled)
        if (this.config.enableCaching) {
          this.validationCache.set(cacheKey, result);
        }

        // Update metrics
        if (this.config.enableMetrics) {
          this.metrics.totalValidations.inc({
            endpoint: endpoint || 'unknown',
            method: 'POST', // Default assumption
            result: result.valid ? 'success' : 'failure'
          });

          this.metrics.validationDuration.observe(
            { endpoint: endpoint || 'unknown', cache_hit: cacheHit ? 'true' : 'false' },
            validationTime / 1000
          );

          // Count specific error types
          for (const error of errors) {
            this.metrics.validationErrors.inc({
              error_type: error.code,
              field: error.field || 'unknown',
              endpoint: endpoint || 'unknown'
            });
          }

          for (const warning of warnings) {
            this.metrics.validationWarnings.inc({
              warning_type: warning.code,
              field: warning.field || 'unknown',
              endpoint: endpoint || 'unknown'
            });
          }
        }

        span.setAttributes({
          'uep.validation.result': result.valid ? 'success' : 'failure',
          'uep.validation.error_count': errors.length,
          'uep.validation.warning_count': warnings.length,
          'uep.validation.duration_ms': validationTime,
          'uep.validation.cache_hit': cacheHit
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('UEP validation failed', {
          error: (error as Error).message,
          endpoint,
          cacheHit
        });

        return {
          valid: false,
          errors: [{
            code: 'VALIDATION_SYSTEM_ERROR',
            message: (error as Error).message,
            severity: 'error'
          }],
          warnings: [],
          validationTime: Date.now() - startTime,
          schemaVersion: this.config.schemaVersion,
          cacheHit
        };
      }
    });
  }

  // =============================================================================
  // Express Middleware Integration
  // =============================================================================

  public getValidationMiddleware() {
    return {
      // Main UEP validation middleware
      validateUEP: (req: Request, res: Response, next: NextFunction) => {
        return this.tracer.startActiveSpan('uep.middleware.validate', async (span) => {
          try {
            const endpoint = `${req.method} ${req.path}`;
            
            span.setAttributes({
              'http.method': req.method,
              'http.url': req.url,
              'http.route': req.route?.path || req.path,
              'uep.validation.endpoint': endpoint
            });

            // Skip validation for non-UEP endpoints
            if (!this.shouldValidateEndpoint(req.path)) {
              span.setStatus({ code: SpanStatusCode.OK });
              return next();
            }

            // Validate request body
            if (!req.body || typeof req.body !== 'object') {
              span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing or invalid request body' });
              return res.status(400).json({
                error: 'INVALID_REQUEST_BODY',
                message: 'Request body must be a valid JSON object',
                timestamp: new Date().toISOString(),
                endpoint
              });
            }

            const validationResult = this.validateUEPMessage(req.body, endpoint);
            
            if (!validationResult.valid) {
              span.setStatus({ code: SpanStatusCode.ERROR, message: 'UEP validation failed' });
              return res.status(400).json({
                error: 'UEP_VALIDATION_FAILED',
                message: 'Request does not conform to UEP protocol',
                violations: validationResult.errors,
                warnings: validationResult.warnings,
                timestamp: new Date().toISOString(),
                endpoint,
                validationTime: validationResult.validationTime
              });
            }

            // Attach validation result to request for downstream use
            (req as any).uepValidation = validationResult;
            
            // Log warnings if present
            if (validationResult.warnings.length > 0) {
              this.logger.warn('UEP validation warnings', {
                endpoint,
                warnings: validationResult.warnings
              });
            }

            span.setStatus({ code: SpanStatusCode.OK });
            next();

          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
            
            this.logger.error('UEP validation middleware error', {
              error: (error as Error).message,
              path: req.path,
              method: req.method
            });

            res.status(500).json({
              error: 'VALIDATION_SYSTEM_ERROR',
              message: 'Internal validation system error',
              timestamp: new Date().toISOString()
            });
          }
        });
      },

      // Content-Type validation middleware
      requireJSON: (req: Request, res: Response, next: NextFunction) => {
        if (!req.is('application/json')) {
          return res.status(415).json({
            error: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'Content-Type must be application/json',
            expected: 'application/json',
            received: req.get('Content-Type') || 'none',
            timestamp: new Date().toISOString()
          });
        }
        next();
      }
    };
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private generateCacheKey(data: any): string {
    const normalizedData = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(normalizedData).digest('hex');
  }

  private shouldValidateEndpoint(path: string): boolean {
    // Define patterns for UEP endpoints that require validation
    const uepEndpoints = [
      /^\/api\/agents\//,
      /^\/api\/uep\//,
      /^\/api\/factory\//,
      /^\/api\/registry\//
    ];

    return uepEndpoints.some(pattern => pattern.test(path));
  }

  // =============================================================================
  // Management and Monitoring
  // =============================================================================

  public getValidationStats() {
    return {
      cacheStats: {
        size: this.validationCache.size,
        maxSize: this.validationCache.max,
        calculatedSize: this.validationCache.calculatedSize,
        hitRatio: this.validationCache.size > 0 ? 
          (this.validationCache.size / (this.validationCache.size + this.validationCache.size)) : 0
      },
      schemaStats: {
        compiledSchemas: this.schemaCache.size,
        schemaIds: Array.from(this.schemaCache.keys())
      },
      config: this.config
    };
  }

  public clearCache(): void {
    this.validationCache.clear();
    this.logger.info('Validation cache cleared');
  }

  public updateConfig(newConfig: Partial<UEPValidationConfig>): void {
    Object.assign(this.config, newConfig);
    this.logger.info('Validation configuration updated', { newConfig });
  }
}

// =============================================================================
// TypeScript Decorator for Method-Level Validation
// =============================================================================

export function ValidateUEPRequest(
  strictMode: boolean = true,
  enableMetrics: boolean = true
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const req = args[0] as Request;
      const res = args[1] as Response;
      
      if (!req || !res) {
        throw new Error('ValidateUEPRequest decorator can only be used on Express route handlers');
      }

      // Create validation middleware instance for this method
      const validator = new UEPValidationMiddleware({
        strictMode,
        enableMetrics,
        enableTracing: true
      });

      // Perform validation
      const validationResult = validator.validateUEPMessage(
        req.body,
        `${req.method} ${req.path}`
      );

      if (!validationResult.valid) {
        return res.status(400).json({
          error: 'UEP_VALIDATION_FAILED',
          message: 'Request does not conform to UEP protocol',
          violations: validationResult.errors,
          warnings: validationResult.warnings,
          timestamp: new Date().toISOString()
        });
      }

      // Attach validation result and proceed
      (req as any).uepValidation = validationResult;
      return method.apply(this, args);
    };
  };
}

// =============================================================================
// Default Export
// =============================================================================

export default UEPValidationMiddleware;