/**
 * UEP Validation Architecture - Core Validation Engine
 * Implements UEP protocol validation at API Gateway and service-to-service levels
 * 
 * Features:
 * - Multi-layer validation (API Gateway + Service Mesh)
 * - WASM-based validation for Envoy proxies
 * - Circuit breaking on validation failures
 * - Protocol versioning support
 */

export interface UEPValidationConfig {
  enableApiGatewayValidation: boolean;
  enableServiceMeshValidation: boolean;
  circuitBreakerThreshold: number;
  timeoutMs: number;
  retryAttempts: number;
  validationLevel: 'strict' | 'permissive' | 'disabled';
}

export interface UEPValidationResult {
  isValid: boolean;
  validationLevel: string;
  errors: ValidationError[];
  metadata: ValidationMetadata;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationMetadata {
  timestamp: Date;
  validatorVersion: string;
  protocolVersion: string;
  latencyMs: number;
}

/**
 * Core UEP Validation Engine
 * Handles protocol validation across API Gateway and service mesh
 */
export class UEPValidationEngine {
  private config: UEPValidationConfig;
  private circuitBreakerState: Map<string, CircuitBreakerState> = new Map();

  constructor(config: UEPValidationConfig) {
    this.config = config;
  }

  /**
   * Validate UEP protocol message at API Gateway level
   */
  async validateApiGateway(request: any): Promise<UEPValidationResult> {
    if (!this.config.enableApiGatewayValidation) {
      return this.createBypassResult();
    }

    const startTime = Date.now();
    const errors: ValidationError[] = [];

    try {
      // Validate UEP headers
      if (!request.headers['x-uep-version']) {
        errors.push({
          code: 'MISSING_UEP_VERSION',
          message: 'UEP protocol version header missing',
          field: 'x-uep-version',
          severity: 'error'
        });
      }

      // Validate UEP message structure
      if (!this.validateMessageStructure(request.body)) {
        errors.push({
          code: 'INVALID_MESSAGE_STRUCTURE',
          message: 'UEP message structure validation failed',
          severity: 'error'
        });
      }

      // Validate protocol compliance
      const protocolErrors = await this.validateProtocolCompliance(request);
      errors.push(...protocolErrors);

      const latencyMs = Date.now() - startTime;
      
      return {
        isValid: errors.filter(e => e.severity === 'error').length === 0,
        validationLevel: 'api-gateway',
        errors,
        metadata: {
          timestamp: new Date(),
          validatorVersion: '1.0.0',
          protocolVersion: request.headers['x-uep-version'] || 'unknown',
          latencyMs
        }
      };

    } catch (error) {
      return {
        isValid: false,
        validationLevel: 'api-gateway',
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error.message}`,
          severity: 'error'
        }],
        metadata: {
          timestamp: new Date(),
          validatorVersion: '1.0.0',
          protocolVersion: 'unknown',
          latencyMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Validate UEP protocol at service mesh level
   */
  async validateServiceMesh(request: any, serviceId: string): Promise<UEPValidationResult> {
    if (!this.config.enableServiceMeshValidation) {
      return this.createBypassResult();
    }

    // Check circuit breaker state
    if (this.isCircuitBreakerOpen(serviceId)) {
      return {
        isValid: false,
        validationLevel: 'service-mesh',
        errors: [{
          code: 'CIRCUIT_BREAKER_OPEN',
          message: `Circuit breaker open for service ${serviceId}`,
          severity: 'error'
        }],
        metadata: {
          timestamp: new Date(),
          validatorVersion: '1.0.0',
          protocolVersion: 'unknown',
          latencyMs: 0
        }
      };
    }

    const startTime = Date.now();
    const errors: ValidationError[] = [];

    try {
      // Service-specific validation
      const serviceValidation = await this.validateServiceSpecific(request, serviceId);
      errors.push(...serviceValidation);

      // Inter-service communication validation
      const commValidation = await this.validateInterServiceComm(request, serviceId);
      errors.push(...commValidation);

      const latencyMs = Date.now() - startTime;
      const isValid = errors.filter(e => e.severity === 'error').length === 0;

      // Update circuit breaker state
      this.updateCircuitBreaker(serviceId, isValid);

      return {
        isValid,
        validationLevel: 'service-mesh',
        errors,
        metadata: {
          timestamp: new Date(),
          validatorVersion: '1.0.0',
          protocolVersion: request.headers?.['x-uep-version'] || 'unknown',
          latencyMs
        }
      };

    } catch (error) {
      this.updateCircuitBreaker(serviceId, false);
      
      return {
        isValid: false,
        validationLevel: 'service-mesh',
        errors: [{
          code: 'SERVICE_VALIDATION_ERROR',
          message: `Service validation failed: ${error.message}`,
          severity: 'error'
        }],
        metadata: {
          timestamp: new Date(),
          validatorVersion: '1.0.0',
          protocolVersion: 'unknown',
          latencyMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Validate UEP message structure
   */
  private validateMessageStructure(body: any): boolean {
    if (!body) return false;

    // Basic UEP message structure validation
    const requiredFields = ['messageType', 'agentId', 'timestamp', 'payload'];
    return requiredFields.every(field => body.hasOwnProperty(field));
  }

  /**
   * Validate protocol compliance
   */
  private async validateProtocolCompliance(request: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate agent ID format
    if (request.body?.agentId && !this.validateAgentId(request.body.agentId)) {
      errors.push({
        code: 'INVALID_AGENT_ID',
        message: 'Agent ID format validation failed',
        field: 'agentId',
        severity: 'error'
      });
    }

    // Validate message type
    if (request.body?.messageType && !this.validateMessageType(request.body.messageType)) {
      errors.push({
        code: 'INVALID_MESSAGE_TYPE',
        message: 'Unknown message type',
        field: 'messageType',
        severity: 'warning'
      });
    }

    // Validate timestamp
    if (request.body?.timestamp && !this.validateTimestamp(request.body.timestamp)) {
      errors.push({
        code: 'INVALID_TIMESTAMP',
        message: 'Timestamp validation failed',
        field: 'timestamp',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Validate service-specific requirements
   */
  private async validateServiceSpecific(request: any, serviceId: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Load service-specific validation rules
    const serviceRules = await this.getServiceValidationRules(serviceId);
    
    for (const rule of serviceRules) {
      if (!this.applyValidationRule(request, rule)) {
        errors.push({
          code: `SERVICE_RULE_${rule.id}`,
          message: rule.errorMessage,
          severity: rule.severity
        });
      }
    }

    return errors;
  }

  /**
   * Validate inter-service communication
   */
  private async validateInterServiceComm(request: any, serviceId: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Validate service authorization
    if (!await this.validateServiceAuthorization(request, serviceId)) {
      errors.push({
        code: 'UNAUTHORIZED_SERVICE',
        message: `Service ${serviceId} not authorized for this operation`,
        severity: 'error'
      });
    }

    // Validate communication pattern
    if (!this.validateCommunicationPattern(request, serviceId)) {
      errors.push({
        code: 'INVALID_COMM_PATTERN',
        message: 'Invalid communication pattern detected',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitBreakerOpen(serviceId: string): boolean {
    const state = this.circuitBreakerState.get(serviceId);
    if (!state) return false;

    return state.failures >= this.config.circuitBreakerThreshold &&
           Date.now() - state.lastFailure < 30000; // 30 second timeout
  }

  private updateCircuitBreaker(serviceId: string, success: boolean): void {
    let state = this.circuitBreakerState.get(serviceId) || { failures: 0, lastFailure: 0 };

    if (success) {
      state.failures = Math.max(0, state.failures - 1);
    } else {
      state.failures++;
      state.lastFailure = Date.now();
    }

    this.circuitBreakerState.set(serviceId, state);
  }

  /**
   * Helper validation methods
   */
  private validateAgentId(agentId: string): boolean {
    return /^[a-zA-Z0-9\-_]+$/.test(agentId) && agentId.length >= 3 && agentId.length <= 50;
  }

  private validateMessageType(messageType: string): boolean {
    const validTypes = ['task', 'response', 'event', 'query', 'command'];
    return validTypes.includes(messageType);
  }

  private validateTimestamp(timestamp: any): boolean {
    const ts = new Date(timestamp);
    const now = new Date();
    const diff = Math.abs(now.getTime() - ts.getTime());
    return !isNaN(ts.getTime()) && diff < 300000; // 5 minute tolerance
  }

  private async getServiceValidationRules(serviceId: string): Promise<ValidationRule[]> {
    // Mock implementation - would load from configuration
    return [
      {
        id: 'PAYLOAD_SIZE',
        condition: (req: any) => JSON.stringify(req.body).length < 1024 * 1024,
        errorMessage: 'Payload too large',
        severity: 'error'
      }
    ];
  }

  private applyValidationRule(request: any, rule: ValidationRule): boolean {
    return rule.condition(request);
  }

  private async validateServiceAuthorization(request: any, serviceId: string): Promise<boolean> {
    // Mock implementation - would check service registry
    return true;
  }

  private validateCommunicationPattern(request: any, serviceId: string): boolean {
    // Mock implementation - would validate against allowed patterns
    return true;
  }

  private createBypassResult(): UEPValidationResult {
    return {
      isValid: true,
      validationLevel: 'bypass',
      errors: [],
      metadata: {
        timestamp: new Date(),
        validatorVersion: '1.0.0',
        protocolVersion: 'bypass',
        latencyMs: 0
      }
    };
  }
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
}

interface ValidationRule {
  id: string;
  condition: (request: any) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning';
}

/**
 * UEP Validation Middleware for Express/API Gateway
 */
export class UEPValidationMiddleware {
  private validationEngine: UEPValidationEngine;

  constructor(config: UEPValidationConfig) {
    this.validationEngine = new UEPValidationEngine(config);
  }

  /**
   * Express middleware for API Gateway validation
   */
  apiGatewayMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const result = await this.validationEngine.validateApiGateway(req);
        
        if (!result.isValid) {
          return res.status(400).json({
            error: 'UEP validation failed',
            details: result.errors,
            metadata: result.metadata
          });
        }

        // Add validation metadata to request
        req.uepValidation = result;
        next();
      } catch (error) {
        res.status(500).json({
          error: 'UEP validation error',
          message: error.message
        });
      }
    };
  }

  /**
   * Service mesh validation
   */
  async validateServiceRequest(request: any, serviceId: string): Promise<UEPValidationResult> {
    return await this.validationEngine.validateServiceMesh(request, serviceId);
  }
}

export default UEPValidationEngine;