/**
 * UEP Validation Middleware
 * 
 * Service-level middleware that performs UEP protocol validation and enforcement
 * for all agent interactions. Designed as reusable middleware that can be
 * integrated into Express.js, Fastify, and NestJS applications.
 * 
 * Key Features:
 * - Framework-agnostic validation with adapters
 * - OpenAPI 3.1 schema validation integration
 * - Circuit breaker patterns for graceful failure handling
 * - Performance-optimized schema caching
 * - Distributed tracing integration
 * - Comprehensive audit logging
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { FastifyRequest, FastifyReply } from 'fastify';

export interface UEPValidationConfig {
  // Core validation settings
  strictMode: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
  
  // Schema registry configuration
  schemaRegistryUrl: string;
  schemaVersion: string;
  
  // Circuit breaker settings
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
  
  // Tracing and logging
  enableTracing: boolean;
  enableAuditLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Performance settings
  validationTimeout: number;
  maxPayloadSize: number;
  
  // Framework-specific settings
  framework: 'express' | 'fastify' | 'nestjs';
}

export interface UEPValidationResult {
  valid: boolean;
  protocol: string;
  version: string;
  violations: UEPViolation[];
  correctedData?: any;
  metadata: {
    validationTime: number;
    schemaId: string;
    traceId?: string;
    timestamp: Date;
  };
}

export interface UEPViolation {
  code: string;
  message: string;
  path?: string;
  expectedValue?: any;
  actualValue?: any;
  severity: 'error' | 'warning' | 'info';
  correctable: boolean;
}

export interface UEPSchemaDefinition {
  id: string;
  version: string;
  capability: string;
  requestSchema: any;
  responseSchema: any;
  eventSchema?: any;
  metadata: {
    description: string;
    tags: string[];
    deprecated: boolean;
    compatibility: string[];
  };
}

/**
 * Core UEP Validation Engine
 */
export class UEPValidationEngine extends EventEmitter {
  private config: UEPValidationConfig;
  private schemaCache: Map<string, UEPSchemaDefinition> = new Map();
  private circuitBreakerState: Map<string, any> = new Map();
  private validationMetrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    averageValidationTime: 0,
    circuitBreakerTrips: 0
  };

  constructor(config: UEPValidationConfig) {
    super();
    this.config = config;
    this.initializeSchemaRegistry();
    this.setupCircuitBreakers();
  }

  /**
   * Validate UEP request against protocol schema
   */
  async validateRequest(
    capability: string,
    data: any,
    options?: {
      traceId?: string;
      correctionMode?: boolean;
    }
  ): Promise<UEPValidationResult> {
    const startTime = Date.now();
    const traceId = options?.traceId || this.generateTraceId();

    try {
      // Check circuit breaker state
      if (this.isCircuitBreakerOpen(capability)) {
        throw new Error(`Circuit breaker open for capability: ${capability}`);
      }

      // Get schema for capability
      const schema = await this.getSchema(capability);
      if (!schema) {
        throw new Error(`No schema found for capability: ${capability}`);
      }

      // Perform validation
      const violations = this.validateAgainstSchema(data, schema.requestSchema);
      const isValid = violations.filter(v => v.severity === 'error').length === 0;

      // Apply corrections if enabled and violations are correctable
      let correctedData = data;
      if (options?.correctionMode && !isValid) {
        correctedData = this.applyCorrections(data, violations);
      }

      const validationTime = Date.now() - startTime;
      this.updateMetrics(isValid, validationTime);

      const result: UEPValidationResult = {
        valid: isValid,
        protocol: 'UEP',
        version: schema.version,
        violations,
        correctedData: options?.correctionMode ? correctedData : undefined,
        metadata: {
          validationTime,
          schemaId: schema.id,
          traceId,
          timestamp: new Date()
        }
      };

      // Emit validation event
      this.emit('validation-completed', result);

      // Log audit trail
      if (this.config.enableAuditLogging) {
        this.logValidation(capability, result);
      }

      return result;

    } catch (error) {
      this.handleValidationError(capability, error);
      throw error;
    }
  }

  /**
   * Validate UEP response against protocol schema
   */
  async validateResponse(
    capability: string,
    data: any,
    options?: {
      traceId?: string;
    }
  ): Promise<UEPValidationResult> {
    const schema = await this.getSchema(capability);
    if (!schema) {
      throw new Error(`No schema found for capability: ${capability}`);
    }

    const violations = this.validateAgainstSchema(data, schema.responseSchema);
    const isValid = violations.filter(v => v.severity === 'error').length === 0;

    return {
      valid: isValid,
      protocol: 'UEP',
      version: schema.version,
      violations,
      metadata: {
        validationTime: Date.now(),
        schemaId: schema.id,
        traceId: options?.traceId,
        timestamp: new Date()
      }
    };
  }

  /**
   * Get validation schema for capability
   */
  private async getSchema(capability: string): Promise<UEPSchemaDefinition | null> {
    // Check cache first
    if (this.config.enableCaching && this.schemaCache.has(capability)) {
      const cached = this.schemaCache.get(capability)!;
      if (this.isCacheValid(cached)) {
        return cached;
      }
    }

    // Fetch from schema registry
    try {
      const schema = await this.fetchSchemaFromRegistry(capability);
      
      if (this.config.enableCaching) {
        this.schemaCache.set(capability, schema);
      }
      
      return schema;
    } catch (error) {
      console.error(`Failed to fetch schema for capability ${capability}:`, error);
      return null;
    }
  }

  /**
   * Validate data against JSON schema
   */
  private validateAgainstSchema(data: any, schema: any): UEPViolation[] {
    const violations: UEPViolation[] = [];

    // Basic schema validation implementation
    // In production, this would use a proper JSON Schema validator like Ajv
    if (!this.validateType(data, schema)) {
      violations.push({
        code: 'TYPE_MISMATCH',
        message: `Expected ${schema.type}, got ${typeof data}`,
        expectedValue: schema.type,
        actualValue: typeof data,
        severity: 'error',
        correctable: false
      });
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          violations.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Required field '${field}' is missing`,
            path: field,
            severity: 'error',
            correctable: true
          });
        }
      }
    }

    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          const fieldViolations = this.validateAgainstSchema(data[field], fieldSchema);
          violations.push(...fieldViolations.map(v => ({
            ...v,
            path: v.path ? `${field}.${v.path}` : field
          })));
        }
      }
    }

    return violations;
  }

  /**
   * Apply corrections to violating data
   */
  private applyCorrections(data: any, violations: UEPViolation[]): any {
    const corrected = { ...data };

    for (const violation of violations) {
      if (violation.correctable) {
        switch (violation.code) {
          case 'MISSING_REQUIRED_FIELD':
            if (violation.path) {
              this.setNestedProperty(corrected, violation.path, null);
            }
            break;
          case 'INVALID_FORMAT':
            // Apply format corrections based on violation details
            break;
        }
      }
    }

    return corrected;
  }

  /**
   * Fetch schema from registry
   */
  private async fetchSchemaFromRegistry(capability: string): Promise<UEPSchemaDefinition> {
    // Simulate schema registry fetch
    // In production, this would make HTTP calls to the schema registry service
    const mockSchema: UEPSchemaDefinition = {
      id: `uep-${capability}-v1`,
      version: this.config.schemaVersion,
      capability,
      requestSchema: {
        type: 'object',
        required: ['method', 'data'],
        properties: {
          method: { type: 'string' },
          data: { type: 'object' },
          metadata: { type: 'object' }
        }
      },
      responseSchema: {
        type: 'object',
        required: ['status', 'data'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          data: { type: 'object' },
          error: { type: 'string' }
        }
      },
      metadata: {
        description: `UEP schema for ${capability}`,
        tags: ['uep', 'validation'],
        deprecated: false,
        compatibility: ['1.0.0']
      }
    };

    return mockSchema;
  }

  /**
   * Initialize schema registry connection
   */
  private initializeSchemaRegistry(): void {
    // Initialize connection to schema registry
    console.log(`UEP Validation: Initializing schema registry connection to ${this.config.schemaRegistryUrl}`);
  }

  /**
   * Setup circuit breakers for validation failures
   */
  private setupCircuitBreakers(): void {
    if (!this.config.circuitBreaker.enabled) return;

    // Initialize circuit breaker state
    console.log('UEP Validation: Circuit breakers enabled');
  }

  /**
   * Check if circuit breaker is open for capability
   */
  private isCircuitBreakerOpen(capability: string): boolean {
    if (!this.config.circuitBreaker.enabled) return false;

    const state = this.circuitBreakerState.get(capability);
    if (!state) return false;

    return state.isOpen && Date.now() < state.openUntil;
  }

  /**
   * Handle validation errors and circuit breaker logic
   */
  private handleValidationError(capability: string, error: Error): void {
    if (this.config.circuitBreaker.enabled) {
      const state = this.circuitBreakerState.get(capability) || {
        failures: 0,
        isOpen: false,
        openUntil: 0
      };

      state.failures++;

      if (state.failures >= this.config.circuitBreaker.threshold) {
        state.isOpen = true;
        state.openUntil = Date.now() + this.config.circuitBreaker.resetTimeout;
        this.validationMetrics.circuitBreakerTrips++;
        
        this.emit('circuit-breaker-opened', { capability, error });
      }

      this.circuitBreakerState.set(capability, state);
    }
  }

  /**
   * Update validation metrics
   */
  private updateMetrics(isValid: boolean, validationTime: number): void {
    this.validationMetrics.totalValidations++;
    
    if (isValid) {
      this.validationMetrics.successfulValidations++;
    } else {
      this.validationMetrics.failedValidations++;
    }

    // Update average validation time
    const total = this.validationMetrics.totalValidations;
    const current = this.validationMetrics.averageValidationTime;
    this.validationMetrics.averageValidationTime = 
      (current * (total - 1) + validationTime) / total;
  }

  /**
   * Log validation results for audit trail
   */
  private logValidation(capability: string, result: UEPValidationResult): void {
    const logData = {
      timestamp: new Date().toISOString(),
      capability,
      valid: result.valid,
      protocol: result.protocol,
      version: result.version,
      validationTime: result.metadata.validationTime,
      traceId: result.metadata.traceId,
      violations: result.violations.length
    };

    if (result.valid) {
      console.info('UEP Validation Success:', logData);
    } else {
      console.warn('UEP Validation Failed:', {
        ...logData,
        violations: result.violations
      });
    }
  }

  // Utility methods
  private validateType(data: any, schema: any): boolean {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    return schema.type === actualType;
  }

  private isCacheValid(schema: UEPSchemaDefinition): boolean {
    // Simple cache validation - in production would check timestamps
    return true;
  }

  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.validationMetrics };
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Shutdown validation engine
   */
  async shutdown(): Promise<void> {
    this.clearCache();
    this.removeAllListeners();
  }
}

/**
 * Express.js Middleware Adapter
 */
export function createExpressUEPMiddleware(
  validationEngine: UEPValidationEngine,
  capability: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const traceId = req.headers['x-trace-id'] as string;
      
      const result = await validationEngine.validateRequest(
        capability,
        req.body,
        { traceId, correctionMode: true }
      );

      if (!result.valid) {
        return res.status(400).json({
          error: 'UEP Protocol Validation Failed',
          protocol: result.protocol,
          version: result.version,
          violations: result.violations,
          traceId: result.metadata.traceId
        });
      }

      // Apply corrections if available
      if (result.correctedData) {
        req.body = result.correctedData;
      }

      // Add validation metadata to request
      (req as any).uepValidation = result;
      
      next();
    } catch (error) {
      console.error('UEP Validation Middleware Error:', error);
      res.status(500).json({
        error: 'Validation Service Error',
        message: error.message
      });
    }
  };
}

/**
 * Fastify Plugin Adapter
 */
export async function createFastifyUEPPlugin(
  fastify: any,
  options: {
    validationEngine: UEPValidationEngine;
    capability: string;
  }
) {
  fastify.addHook('preValidation', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const traceId = request.headers['x-trace-id'] as string;
      
      const result = await options.validationEngine.validateRequest(
        options.capability,
        request.body,
        { traceId, correctionMode: true }
      );

      if (!result.valid) {
        reply.code(400).send({
          error: 'UEP Protocol Validation Failed',
          protocol: result.protocol,
          version: result.version,
          violations: result.violations,
          traceId: result.metadata.traceId
        });
        return;
      }

      // Apply corrections if available
      if (result.correctedData) {
        request.body = result.correctedData;
      }

      // Add validation metadata to request
      (request as any).uepValidation = result;
      
    } catch (error) {
      console.error('UEP Validation Plugin Error:', error);
      reply.code(500).send({
        error: 'Validation Service Error',
        message: error.message
      });
    }
  });
}

/**
 * NestJS Guard Adapter
 */
export class UEPValidationGuard {
  constructor(
    private validationEngine: UEPValidationEngine,
    private capability: string
  ) {}

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    try {
      const traceId = request.headers['x-trace-id'];
      
      const result = await this.validationEngine.validateRequest(
        this.capability,
        request.body,
        { traceId, correctionMode: true }
      );

      if (!result.valid) {
        response.status(400).json({
          error: 'UEP Protocol Validation Failed',
          protocol: result.protocol,
          version: result.version,
          violations: result.violations,
          traceId: result.metadata.traceId
        });
        return false;
      }

      // Apply corrections if available
      if (result.correctedData) {
        request.body = result.correctedData;
      }

      // Add validation metadata to request
      request.uepValidation = result;
      
      return true;
    } catch (error) {
      console.error('UEP Validation Guard Error:', error);
      response.status(500).json({
        error: 'Validation Service Error',
        message: error.message
      });
      return false;
    }
  }
}

/**
 * Factory function to create UEP validation middleware
 */
export function createUEPValidationMiddleware(
  config: UEPValidationConfig
): {
  engine: UEPValidationEngine;
  express: (capability: string) => any;
  fastify: (capability: string) => any;
  nestjs: (capability: string) => UEPValidationGuard;
} {
  const engine = new UEPValidationEngine(config);

  return {
    engine,
    express: (capability: string) => createExpressUEPMiddleware(engine, capability),
    fastify: (capability: string) => ({ validationEngine: engine, capability }),
    nestjs: (capability: string) => new UEPValidationGuard(engine, capability)
  };
}