/**
 * UEP Message Validator
 * 
 * Provides comprehensive validation for UEP messages using OpenAPI 3.1 schemas
 * and custom UEP protocol validation rules with performance optimization.
 * 
 * Features:
 * - OpenAPI 3.1 schema validation
 * - UEP protocol compliance checking
 * - Custom validation rules
 * - Performance-optimized validation caching
 * - Detailed error reporting with suggestions
 */

import Ajv, { Schema, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { 
  UEPMessage, 
  UEPRequest, 
  UEPResponse, 
  UEPEvent, 
  UEPTypeGuards,
  UEPConstants 
} from './UEPTypes.js';

/**
 * Validation Configuration
 */
export interface UEPValidationConfig {
  enabled: boolean;
  strictMode: boolean;
  schemaValidation: boolean;
  customRules?: UEPValidationRule[];
  cacheSize?: number;
}

/**
 * Custom Validation Rule
 */
export interface UEPValidationRule {
  name: string;
  description: string;
  validate: (message: UEPMessage) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
  category: 'protocol' | 'security' | 'performance' | 'business';
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  metadata?: {
    validationTime: number;
    rulesApplied: string[];
    cacheHit?: boolean;
  };
}

/**
 * UEP Message Validator Implementation
 */
export class UEPMessageValidator {
  private readonly config: UEPValidationConfig;
  private readonly ajv: Ajv;
  private readonly schemaCache = new Map<string, ValidateFunction>();
  private readonly validationCache = new Map<string, ValidationResult>();
  private readonly customRules: UEPValidationRule[] = [];

  // Built-in schemas
  private readonly messageSchema: Schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    required: ['id', 'timestamp', 'version', 'protocol', 'routing', 'agent', 'tracing', 'payload'],
    properties: {
      id: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
        description: 'UUID v4 message identifier'
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'ISO 8601 timestamp'
      },
      version: {
        type: 'string',
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Semantic version'
      },
      protocol: {
        type: 'object',
        required: ['id', 'version', 'capability'],
        properties: {
          id: { type: 'string', minLength: 1 },
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          capability: { type: 'string', minLength: 1 },
          compatibility: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      routing: {
        type: 'object',
        required: ['subject', 'messageType'],
        properties: {
          subject: { type: 'string', minLength: 1 },
          replyTo: { type: 'string' },
          correlationId: { type: 'string' },
          messageType: {
            type: 'string',
            enum: ['command', 'event', 'query', 'response']
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high', 'urgent']
          }
        }
      },
      agent: {
        type: 'object',
        required: ['id', 'type', 'capability', 'instance', 'version', 'status'],
        properties: {
          id: { type: 'string', minLength: 1 },
          type: {
            type: 'string',
            enum: ['meta', 'domain', 'factory', 'orchestrator']
          },
          capability: { type: 'string', minLength: 1 },
          instance: { type: 'string', minLength: 1 },
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          status: {
            type: 'string',
            enum: ['initializing', 'ready', 'busy', 'error', 'shutdown']
          }
        }
      },
      tracing: {
        type: 'object',
        required: ['traceId', 'spanId'],
        properties: {
          traceId: { 
            type: 'string', 
            pattern: '^[a-fA-F0-9]{32}$',
            description: '32-character hex trace ID'
          },
          spanId: { 
            type: 'string', 
            pattern: '^[a-fA-F0-9]{16}$',
            description: '16-character hex span ID'
          },
          parentSpanId: { 
            type: 'string', 
            pattern: '^[a-fA-F0-9]{16}$' 
          },
          baggage: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z][a-zA-Z0-9_-]*$': { type: 'string' }
            }
          },
          sampled: { type: 'boolean' }
        }
      },
      payload: {
        description: 'Message payload - can be any type'
      },
      headers: {
        type: 'object',
        patternProperties: {
          '^[a-zA-Z][a-zA-Z0-9_-]*$': { type: 'string' }
        }
      }
    },
    additionalProperties: false
  };

  private readonly requestSchema: Schema = {
    ...this.messageSchema,
    required: [...this.messageSchema.required, 'expectResponse'],
    properties: {
      ...this.messageSchema.properties,
      expectResponse: {
        type: 'boolean',
        const: true
      },
      routing: {
        ...this.messageSchema.properties.routing,
        required: ['subject', 'messageType', 'replyTo'],
        properties: {
          ...this.messageSchema.properties.routing.properties,
          messageType: {
            type: 'string',
            enum: ['command', 'query']
          },
          replyTo: { type: 'string', minLength: 1 },
          timeout: { type: 'number', minimum: 1000, maximum: 300000 }
        }
      }
    }
  };

  private readonly responseSchema: Schema = {
    ...this.messageSchema,
    required: [...this.messageSchema.required, 'success'],
    properties: {
      ...this.messageSchema.properties,
      success: { type: 'boolean' },
      error: {
        type: 'object',
        required: ['code', 'message', 'retryable', 'timestamp'],
        properties: {
          code: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1 },
          details: { type: 'object' },
          retryable: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      routing: {
        ...this.messageSchema.properties.routing,
        required: ['subject', 'messageType', 'correlationId'],
        properties: {
          ...this.messageSchema.properties.routing.properties,
          messageType: {
            type: 'string',
            const: 'response'
          },
          correlationId: { type: 'string', minLength: 1 }
        }
      }
    }
  };

  private readonly eventSchema: Schema = {
    ...this.messageSchema,
    required: [...this.messageSchema.required, 'eventType', 'eventVersion'],
    properties: {
      ...this.messageSchema.properties,
      eventType: { type: 'string', minLength: 1 },
      eventVersion: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      routing: {
        ...this.messageSchema.properties.routing,
        properties: {
          ...this.messageSchema.properties.routing.properties,
          messageType: {
            type: 'string',
            const: 'event'
          }
        }
      }
    }
  };

  constructor(config: UEPValidationConfig) {
    this.config = config;
    
    // Initialize AJV with OpenAPI 3.1 support
    this.ajv = new Ajv({
      strict: config.strictMode,
      allErrors: true,
      verbose: true,
      discriminator: true,
      removeAdditional: false
    });

    // Add format validators
    addFormats(this.ajv);

    // Compile schemas
    this.compileSchemas();

    // Add custom validation rules
    this.initializeCustomRules();
    if (config.customRules) {
      this.customRules.push(...config.customRules);
    }
  }

  /**
   * Validate a generic UEP message
   */
  async validateMessage<T>(message: UEPMessage<T>): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return { valid: true, errors: [], warnings: [], suggestions: [] };
    }

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(message);

    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached) {
      cached.metadata = {
        ...cached.metadata,
        validationTime: Date.now() - startTime,
        cacheHit: true
      };
      return cached;
    }

    const result = await this.performValidation(message, 'message');
    result.metadata = {
      validationTime: Date.now() - startTime,
      rulesApplied: ['schema', ...this.customRules.map(r => r.name)],
      cacheHit: false
    };

    // Cache result
    this.cacheResult(cacheKey, result);
    
    return result;
  }

  /**
   * Validate a UEP request message
   */
  async validateRequest<T>(request: UEPRequest<T>): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return { valid: true, errors: [], warnings: [], suggestions: [] };
    }

    const startTime = Date.now();
    
    // Type guard check
    if (!UEPTypeGuards.isUEPRequest(request)) {
      return {
        valid: false,
        errors: ['Message is not a valid UEP request'],
        warnings: [],
        suggestions: ['Ensure message has expectResponse: true and replyTo field'],
        metadata: {
          validationTime: Date.now() - startTime,
          rulesApplied: ['type-guard']
        }
      };
    }

    return await this.performValidation(request, 'request');
  }

  /**
   * Validate a UEP response message
   */
  async validateResponse<T>(response: UEPResponse<T>): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return { valid: true, errors: [], warnings: [], suggestions: [] };
    }

    const startTime = Date.now();
    
    // Type guard check
    if (!UEPTypeGuards.isUEPResponse(response)) {
      return {
        valid: false,
        errors: ['Message is not a valid UEP response'],
        warnings: [],
        suggestions: ['Ensure message has success field and correlationId'],
        metadata: {
          validationTime: Date.now() - startTime,
          rulesApplied: ['type-guard']
        }
      };
    }

    return await this.performValidation(response, 'response');
  }

  /**
   * Validate a UEP event message
   */
  async validateEvent<T>(event: UEPEvent<T>): Promise<ValidationResult> {
    if (!this.config.enabled) {
      return { valid: true, errors: [], warnings: [], suggestions: [] };
    }

    const startTime = Date.now();
    
    // Type guard check
    if (!UEPTypeGuards.isUEPEvent(event)) {
      return {
        valid: false,
        errors: ['Message is not a valid UEP event'],
        warnings: [],
        suggestions: ['Ensure message has eventType and eventVersion fields'],
        metadata: {
          validationTime: Date.now() - startTime,
          rulesApplied: ['type-guard']
        }
      };
    }

    return await this.performValidation(event, 'event');
  }

  /**
   * Add a custom validation rule
   */
  addCustomRule(rule: UEPValidationRule): void {
    this.customRules.push(rule);
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get validation statistics
   */
  getStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
    customRules: number;
  } {
    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // Would need to track this
      customRules: this.customRules.length
    };
  }

  /**
   * Private methods
   */
  private compileSchemas(): void {
    this.schemaCache.set('message', this.ajv.compile(this.messageSchema));
    this.schemaCache.set('request', this.ajv.compile(this.requestSchema));
    this.schemaCache.set('response', this.ajv.compile(this.responseSchema));
    this.schemaCache.set('event', this.ajv.compile(this.eventSchema));
  }

  private async performValidation(
    message: UEPMessage, 
    schemaType: 'message' | 'request' | 'response' | 'event'
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Schema validation
    if (this.config.schemaValidation) {
      const validator = this.schemaCache.get(schemaType);
      if (validator && !validator(message)) {
        const schemaErrors = validator.errors?.map(err => 
          `${err.instancePath}: ${err.message} (${JSON.stringify(err.data)})`
        ) || [];
        errors.push(...schemaErrors);
      }
    }

    // Custom rule validation
    for (const rule of this.customRules) {
      try {
        const ruleResult = rule.validate(message);
        
        if (rule.severity === 'error') {
          errors.push(...ruleResult.errors);
        } else if (rule.severity === 'warning') {
          warnings.push(...ruleResult.errors);
        }
        
        suggestions.push(...ruleResult.suggestions);
      } catch (error) {
        warnings.push(`Custom rule '${rule.name}' failed: ${error.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private initializeCustomRules(): void {
    // Protocol version compatibility rule
    this.customRules.push({
      name: 'protocol-version-compatibility',
      description: 'Validates protocol version compatibility',
      severity: 'error',
      category: 'protocol',
      validate: (message: UEPMessage): ValidationResult => {
        const errors: string[] = [];
        const suggestions: string[] = [];

        if (message.protocol.version !== UEPConstants.PROTOCOL_VERSION) {
          errors.push(`Unsupported protocol version: ${message.protocol.version}`);
          suggestions.push(`Use protocol version ${UEPConstants.PROTOCOL_VERSION}`);
        }

        return { valid: errors.length === 0, errors, warnings: [], suggestions };
      }
    });

    // Message size rule
    this.customRules.push({
      name: 'message-size-limit',
      description: 'Validates message size limits',
      severity: 'warning',
      category: 'performance',
      validate: (message: UEPMessage): ValidationResult => {
        const errors: string[] = [];
        const suggestions: string[] = [];

        const messageSize = JSON.stringify(message).length;
        if (messageSize > UEPConstants.MAX_MESSAGE_SIZE) {
          errors.push(`Message size ${messageSize} exceeds limit ${UEPConstants.MAX_MESSAGE_SIZE}`);
          suggestions.push('Consider compressing payload or splitting into multiple messages');
        }

        return { valid: errors.length === 0, errors, warnings: [], suggestions };
      }
    });

    // Agent status rule
    this.customRules.push({
      name: 'agent-status-check',
      description: 'Validates agent status is appropriate for message type',
      severity: 'warning',
      category: 'business',
      validate: (message: UEPMessage): ValidationResult => {
        const errors: string[] = [];
        const suggestions: string[] = [];

        if (message.routing.messageType === 'command' && message.agent.status !== 'ready') {
          errors.push(`Agent status '${message.agent.status}' not suitable for command messages`);
          suggestions.push('Wait for agent to be in ready state before sending commands');
        }

        return { valid: errors.length === 0, errors, warnings: [], suggestions };
      }
    });

    // Subject naming convention rule
    this.customRules.push({
      name: 'subject-naming-convention',
      description: 'Validates subject follows UEP naming conventions',
      severity: 'warning',
      category: 'protocol',
      validate: (message: UEPMessage): ValidationResult => {
        const errors: string[] = [];
        const suggestions: string[] = [];

        const subjectParts = message.routing.subject.split('.');
        if (subjectParts.length < 3) {
          errors.push('Subject should follow namespace.type.capability pattern');
          suggestions.push('Use format: namespace.agent-type.capability');
        }

        return { valid: errors.length === 0, errors, warnings: [], suggestions };
      }
    });
  }

  private generateCacheKey(message: UEPMessage): string {
    // Generate a cache key based on message structure (not content)
    return `${message.routing.messageType}:${message.protocol.version}:${message.agent.type}`;
  }

  private cacheResult(key: string, result: ValidationResult): void {
    const maxCacheSize = this.config.cacheSize ?? 1000;
    
    if (this.validationCache.size >= maxCacheSize) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.validationCache.keys().next().value;
      this.validationCache.delete(firstKey);
    }

    this.validationCache.set(key, result);
  }
}

export { UEPMessageValidator };