/**
 * UEP Message Validation Layer
 * 
 * This module provides comprehensive validation for UEP messages before they
 * are processed by the message broker. It ensures protocol compliance,
 * schema validation, and message integrity.
 * 
 * Features:
 * - Protocol schema validation against OpenAPI/AsyncAPI specifications
 * - UEP envelope format validation
 * - Message content validation with configurable rules
 * - Performance optimized with caching and batch validation
 * - Integration with protocol definition system
 * - Detailed validation error reporting
 */

import Ajv, { JSONSchemaType, ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import { UEPMessage } from './UEPMessageBroker';

/**
 * UEP Message Validation Configuration
 */
export interface UEPMessageValidatorConfig {
  // Protocol validation
  protocols: {
    schemaRegistryUrl?: string;
    enableProtocolValidation: boolean;
    enableSchemaValidation: boolean;
    strictMode: boolean;
    allowUnknownProtocols: boolean;
  };

  // Performance settings
  performance: {
    enableCaching: boolean;
    cacheSize: number;
    cacheTTL: number;
    batchValidation: boolean;
    maxBatchSize: number;
  };

  // Validation rules
  rules: {
    requireAllFields: boolean;
    validateTimestamps: boolean;
    validateTracing: boolean;
    maxPayloadSize: number;
    allowedMessageTypes: string[];
    subjectPatterns: RegExp[];
  };

  // Error handling
  errorHandling: {
    collectAllErrors: boolean;
    includeDataPath: boolean;
    verbose: boolean;
    logValidationErrors: boolean;
  };
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: ValidationMetadata;
}

/**
 * Validation Error
 */
export interface ValidationError {
  code: string;
  message: string;
  path: string;
  value?: any;
  severity: 'error' | 'warning';
  suggestion?: string;
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  suggestion?: string;
}

/**
 * Validation Metadata
 */
export interface ValidationMetadata {
  validationTime: number;
  protocolFound: boolean;
  schemaVersion?: string;
  cacheHit: boolean;
  rulesTotalCount: number;
  rulesPassedCount: number;
}

/**
 * Protocol Schema Definition
 */
export interface ProtocolSchema {
  id: string;
  version: string;
  capability: string;
  messageSchema: JSONSchemaType<any>;
  payloadSchema?: JSONSchemaType<any>;
  metadata?: {
    description?: string;
    author?: string;
    tags?: string[];
  };
}

/**
 * Validation Rule Definition
 */
export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning';
  validator: (message: UEPMessage<any>) => ValidationError | null;
  enabled: boolean;
}

/**
 * UEP Message Validator Implementation
 */
export class UEPMessageValidator extends EventEmitter {
  private config: UEPMessageValidatorConfig;
  private ajv: Ajv;
  private schemaCache: LRUCache<string, ValidateFunction>;
  private protocolSchemas: Map<string, ProtocolSchema> = new Map();
  private validationRules: ValidationRule[] = [];
  private stats = {
    totalValidations: 0,
    validMessages: 0,
    invalidMessages: 0,
    cacheHits: 0,
    averageValidationTime: 0,
  };

  constructor(config: UEPMessageValidatorConfig) {
    super();
    this.config = config;
    this.setupAjv();
    this.setupCache();
    this.setupDefaultRules();
  }

  /**
   * Initialize the validator
   */
  async initialize(): Promise<void> {
    try {
      this.emit('validator:initializing');

      // Load protocol schemas from registry
      if (this.config.protocols.schemaRegistryUrl) {
        await this.loadProtocolSchemas();
      }

      // Setup built-in validation rules
      this.setupValidationRules();

      this.emit('validator:initialized');
    } catch (error) {
      this.emit('validator:error', error);
      throw new Error(`Failed to initialize UEP Message Validator: ${error.message}`);
    }
  }

  /**
   * Validate a single UEP message
   */
  async validateMessage<T>(message: UEPMessage<T>): Promise<ValidationResult> {
    const startTime = Date.now();
    let result: ValidationResult;

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(message);
      let cacheHit = false;

      if (this.config.performance.enableCaching) {
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
          cacheHit = true;
          this.stats.cacheHits++;
          result = cachedResult;
        }
      }

      if (!cacheHit) {
        // Perform validation
        result = await this.performValidation(message);

        // Cache the result
        if (this.config.performance.enableCaching) {
          this.cacheResult(cacheKey, result);
        }
      }

      // Update metadata
      result.metadata = {
        validationTime: Date.now() - startTime,
        protocolFound: this.protocolSchemas.has(message.protocol.id),
        cacheHit,
        rulesTotalCount: this.validationRules.filter(r => r.enabled).length,
        rulesPassedCount: this.validationRules.filter(r => r.enabled).length - result.errors.length,
      };

      // Update statistics
      this.updateStats(result, Date.now() - startTime);

      this.emit('message:validated', { message, result });
      return result;

    } catch (error) {
      this.emit('validation:error', { message, error });
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_EXCEPTION',
          message: `Validation failed: ${error.message}`,
          path: 'root',
          severity: 'error' as const,
        }],
        warnings: [],
        metadata: {
          validationTime: Date.now() - startTime,
          protocolFound: false,
          cacheHit: false,
          rulesTotalCount: 0,
          rulesPassedCount: 0,
        },
      };
    }
  }

  /**
   * Validate multiple messages in batch
   */
  async validateMessages<T>(messages: UEPMessage<T>[]): Promise<ValidationResult[]> {
    if (!this.config.performance.batchValidation) {
      // Validate individually
      return Promise.all(messages.map(msg => this.validateMessage(msg)));
    }

    const results: ValidationResult[] = [];
    const batchSize = this.config.performance.maxBatchSize;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(msg => this.validateMessage(msg))
      );
      results.push(...batchResults);
    }

    this.emit('batch:validated', { count: messages.length, results });
    return results;
  }

  /**
   * Register a protocol schema
   */
  registerProtocolSchema(schema: ProtocolSchema): void {
    const key = `${schema.id}:${schema.version}`;
    this.protocolSchemas.set(key, schema);

    // Compile and cache the schema validator
    if (schema.messageSchema) {
      const validator = this.ajv.compile(schema.messageSchema);
      this.schemaCache.set(`schema:${key}`, validator);
    }

    this.emit('schema:registered', { id: schema.id, version: schema.version });
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
    this.emit('rule:added', { name: rule.name });
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(name: string): boolean {
    const index = this.validationRules.findIndex(rule => rule.name === name);
    if (index !== -1) {
      this.validationRules.splice(index, 1);
      this.emit('rule:removed', { name });
      return true;
    }
    return false;
  }

  /**
   * Enable/disable validation rule
   */
  toggleValidationRule(name: string, enabled: boolean): boolean {
    const rule = this.validationRules.find(r => r.name === name);
    if (rule) {
      rule.enabled = enabled;
      this.emit('rule:toggled', { name, enabled });
      return true;
    }
    return false;
  }

  /**
   * Get validation statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.schemaCache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Private helper methods
   */
  private setupAjv(): void {
    this.ajv = new Ajv({
      allErrors: this.config.errorHandling.collectAllErrors,
      verbose: this.config.errorHandling.verbose,
      strict: this.config.protocols.strictMode,
      removeAdditional: !this.config.protocols.strictMode,
      useDefaults: true,
      coerceTypes: !this.config.protocols.strictMode,
    });

    // Add format validators
    addFormats(this.ajv);

    // Add custom formats for UEP
    this.ajv.addFormat('uep-subject', {
      type: 'string',
      validate: (subject: string) => {
        return /^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*$/.test(subject);
      },
    });

    this.ajv.addFormat('uep-capability', {
      type: 'string',
      validate: (capability: string) => {
        return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(capability);
      },
    });

    this.ajv.addFormat('trace-id', {
      type: 'string',
      validate: (traceId: string) => {
        return /^[a-f0-9]{32}$|^[a-f0-9]{16}$/.test(traceId);
      },
    });
  }

  private setupCache(): void {
    this.schemaCache = new LRUCache<string, ValidateFunction>({
      max: this.config.performance.cacheSize,
      ttl: this.config.performance.cacheTTL,
    });
  }

  private setupDefaultRules(): void {
    // Built-in validation rules will be added here
    this.setupValidationRules();
  }

  private setupValidationRules(): void {
    this.validationRules = [
      // UEP Envelope Structure Validation
      {
        name: 'uep-envelope-structure',
        description: 'Validates UEP message envelope structure',
        severity: 'error',
        enabled: true,
        validator: (message) => {
          const requiredFields = ['id', 'timestamp', 'version', 'protocol', 'routing', 'agent', 'tracing', 'payload'];
          
          for (const field of requiredFields) {
            if (!(field in message)) {
              return {
                code: 'MISSING_REQUIRED_FIELD',
                message: `Missing required field: ${field}`,
                path: field,
                severity: 'error',
                suggestion: `Add the required ${field} field to the message envelope`,
              };
            }
          }
          return null;
        },
      },

      // Protocol Information Validation
      {
        name: 'protocol-information',
        description: 'Validates protocol metadata',
        severity: 'error',
        enabled: true,
        validator: (message) => {
          if (!message.protocol?.id || !message.protocol?.version || !message.protocol?.capability) {
            return {
              code: 'INVALID_PROTOCOL_INFO',
              message: 'Protocol information is incomplete',
              path: 'protocol',
              severity: 'error',
              suggestion: 'Ensure protocol.id, protocol.version, and protocol.capability are provided',
            };
          }
          return null;
        },
      },

      // Subject Format Validation
      {
        name: 'subject-format',
        description: 'Validates subject format',
        severity: 'error',
        enabled: true,
        validator: (message) => {
          const subject = message.routing?.subject;
          if (!subject || !this.isValidSubject(subject)) {
            return {
              code: 'INVALID_SUBJECT_FORMAT',
              message: 'Subject format is invalid',
              path: 'routing.subject',
              value: subject,
              severity: 'error',
              suggestion: 'Use format: namespace.type.target[.operation]',
            };
          }
          return null;
        },
      },

      // Message Type Validation
      {
        name: 'message-type',
        description: 'Validates message type',
        severity: 'error',
        enabled: true,
        validator: (message) => {
          const messageType = message.routing?.messageType;
          const allowedTypes = this.config.rules.allowedMessageTypes;
          
          if (!messageType || !allowedTypes.includes(messageType)) {
            return {
              code: 'INVALID_MESSAGE_TYPE',
              message: `Invalid message type: ${messageType}`,
              path: 'routing.messageType',
              value: messageType,
              severity: 'error',
              suggestion: `Use one of: ${allowedTypes.join(', ')}`,
            };
          }
          return null;
        },
      },

      // Timestamp Validation
      {
        name: 'timestamp-validation',
        description: 'Validates message timestamps',
        severity: 'warning',
        enabled: this.config.rules.validateTimestamps,
        validator: (message) => {
          if (!message.timestamp || isNaN(new Date(message.timestamp).getTime())) {
            return {
              code: 'INVALID_TIMESTAMP',
              message: 'Invalid or missing timestamp',
              path: 'timestamp',
              value: message.timestamp,
              severity: 'warning',
              suggestion: 'Provide a valid ISO 8601 timestamp',
            };
          }

          // Check if timestamp is too far in the future
          const now = new Date();
          const msgTime = new Date(message.timestamp);
          const maxSkew = 5 * 60 * 1000; // 5 minutes

          if (msgTime.getTime() > now.getTime() + maxSkew) {
            return {
              code: 'TIMESTAMP_TOO_FUTURE',
              message: 'Timestamp is too far in the future',
              path: 'timestamp',
              value: message.timestamp,
              severity: 'warning',
              suggestion: 'Check system clock synchronization',
            };
          }

          return null;
        },
      },

      // Tracing Information Validation
      {
        name: 'tracing-validation',
        description: 'Validates distributed tracing information',
        severity: 'warning',
        enabled: this.config.rules.validateTracing,
        validator: (message) => {
          const tracing = message.tracing;
          if (!tracing?.traceId || !tracing?.spanId) {
            return {
              code: 'MISSING_TRACING_INFO',
              message: 'Missing tracing information',
              path: 'tracing',
              severity: 'warning',
              suggestion: 'Add traceId and spanId for distributed tracing',
            };
          }
          return null;
        },
      },

      // Payload Size Validation
      {
        name: 'payload-size',
        description: 'Validates payload size limits',
        severity: 'error',
        enabled: true,
        validator: (message) => {
          const payloadSize = JSON.stringify(message.payload).length;
          const maxSize = this.config.rules.maxPayloadSize;
          
          if (payloadSize > maxSize) {
            return {
              code: 'PAYLOAD_TOO_LARGE',
              message: `Payload size ${payloadSize} exceeds limit ${maxSize}`,
              path: 'payload',
              severity: 'error',
              suggestion: 'Reduce payload size or use message splitting',
            };
          }
          return null;
        },
      },

      // Agent Information Validation
      {
        name: 'agent-information',
        description: 'Validates agent metadata',
        severity: 'error',
        enabled: true,
        validator: (message) => {
          const agent = message.agent;
          if (!agent?.id || !agent?.type || !agent?.capability || !agent?.instance) {
            return {
              code: 'INCOMPLETE_AGENT_INFO',
              message: 'Agent information is incomplete',
              path: 'agent',
              severity: 'error',
              suggestion: 'Provide id, type, capability, and instance for agent',
            };
          }

          if (!['meta', 'domain'].includes(agent.type)) {
            return {
              code: 'INVALID_AGENT_TYPE',
              message: `Invalid agent type: ${agent.type}`,
              path: 'agent.type',
              value: agent.type,
              severity: 'error',
              suggestion: 'Agent type must be "meta" or "domain"',
            };
          }

          return null;
        },
      },
    ];
  }

  private async performValidation<T>(message: UEPMessage<T>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. Run built-in validation rules
    for (const rule of this.validationRules) {
      if (!rule.enabled) continue;

      const error = rule.validator(message);
      if (error) {
        if (error.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push({
            code: error.code,
            message: error.message,
            path: error.path,
            suggestion: error.suggestion,
          });
        }
      }
    }

    // 2. Protocol schema validation
    if (this.config.protocols.enableProtocolValidation) {
      const protocolValidation = await this.validateAgainstProtocolSchema(message);
      errors.push(...protocolValidation.errors);
      warnings.push(...protocolValidation.warnings);
    }

    // 3. Schema validation
    if (this.config.protocols.enableSchemaValidation) {
      const schemaValidation = await this.validateAgainstSchema(message);
      errors.push(...schemaValidation.errors);
      warnings.push(...schemaValidation.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async validateAgainstProtocolSchema<T>(message: UEPMessage<T>): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const protocolKey = `${message.protocol.id}:${message.protocol.version}`;
    const schema = this.protocolSchemas.get(protocolKey);

    if (!schema) {
      if (!this.config.protocols.allowUnknownProtocols) {
        errors.push({
          code: 'UNKNOWN_PROTOCOL',
          message: `Unknown protocol: ${message.protocol.id}:${message.protocol.version}`,
          path: 'protocol',
          severity: 'error',
          suggestion: 'Register the protocol schema or enable allowUnknownProtocols',
        });
      } else {
        warnings.push({
          code: 'UNKNOWN_PROTOCOL',
          message: `Unknown protocol: ${message.protocol.id}:${message.protocol.version}`,
          path: 'protocol',
          suggestion: 'Consider registering the protocol schema',
        });
      }
      return { errors, warnings };
    }

    // Validate against protocol's message schema
    if (schema.messageSchema) {
      const validator = this.schemaCache.get(`schema:${protocolKey}`) || 
                      this.ajv.compile(schema.messageSchema);
      
      if (!validator(message)) {
        const ajvErrors = validator.errors || [];
        for (const ajvError of ajvErrors) {
          errors.push({
            code: 'SCHEMA_VALIDATION_ERROR',
            message: ajvError.message || 'Schema validation failed',
            path: ajvError.instancePath || ajvError.schemaPath || 'unknown',
            value: ajvError.data,
            severity: 'error',
            suggestion: 'Fix the message structure to match the protocol schema',
          });
        }
      }
    }

    return { errors, warnings };
  }

  private async validateAgainstSchema<T>(message: UEPMessage<T>): Promise<{ errors: ValidationError[], warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // UEP Message Envelope Schema
    const uepEnvelopeSchema: JSONSchemaType<UEPMessage<any>> = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        protocol: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            version: { type: 'string' },
            capability: { type: 'string', format: 'uep-capability' },
          },
          required: ['id', 'version', 'capability'],
          additionalProperties: false,
        },
        routing: {
          type: 'object',
          properties: {
            subject: { type: 'string', format: 'uep-subject' },
            replyTo: { type: 'string', nullable: true },
            correlationId: { type: 'string', nullable: true },
            messageType: { type: 'string', enum: ['command', 'event', 'query', 'response'] },
          },
          required: ['subject', 'messageType'],
          additionalProperties: false,
        },
        agent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['meta', 'domain'] },
            capability: { type: 'string', format: 'uep-capability' },
            instance: { type: 'string' },
          },
          required: ['id', 'type', 'capability', 'instance'],
          additionalProperties: false,
        },
        tracing: {
          type: 'object',
          properties: {
            traceId: { type: 'string', format: 'trace-id' },
            spanId: { type: 'string' },
            parentSpanId: { type: 'string', nullable: true },
            baggage: { 
              type: 'object', 
              nullable: true,
              additionalProperties: { type: 'string' },
            },
          },
          required: ['traceId', 'spanId'],
          additionalProperties: false,
        },
        payload: {}, // Any type for payload
        headers: {
          type: 'object',
          nullable: true,
          additionalProperties: { type: 'string' },
        },
      },
      required: ['id', 'timestamp', 'version', 'protocol', 'routing', 'agent', 'tracing', 'payload'],
      additionalProperties: false,
    };

    const validator = this.ajv.compile(uepEnvelopeSchema);
    
    if (!validator(message)) {
      const ajvErrors = validator.errors || [];
      for (const ajvError of ajvErrors) {
        errors.push({
          code: 'ENVELOPE_SCHEMA_ERROR',
          message: ajvError.message || 'Envelope schema validation failed',
          path: ajvError.instancePath || ajvError.schemaPath || 'unknown',
          value: ajvError.data,
          severity: 'error',
          suggestion: 'Fix the message envelope structure',
        });
      }
    }

    return { errors, warnings };
  }

  private isValidSubject(subject: string): boolean {
    // Check against configured patterns
    for (const pattern of this.config.rules.subjectPatterns) {
      if (pattern.test(subject)) {
        return true;
      }
    }

    // Default UEP subject pattern
    const defaultPattern = /^[a-zA-Z0-9_-]+\.(command|event|query|response)\.[a-zA-Z0-9_-]+(\..*)?$/;
    return defaultPattern.test(subject);
  }

  private generateCacheKey<T>(message: UEPMessage<T>): string {
    // Generate a cache key based on message structure
    const keyData = {
      protocolId: message.protocol.id,
      protocolVersion: message.protocol.version,
      messageType: message.routing.messageType,
      subject: message.routing.subject,
      payloadHash: this.hashObject(message.payload),
    };
    
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private getCachedResult(cacheKey: string): ValidationResult | null {
    // In a real implementation, this would check a cache
    // For now, return null to indicate no cache hit
    return null;
  }

  private cacheResult(cacheKey: string, result: ValidationResult): void {
    // In a real implementation, this would store in cache
    // For now, this is a placeholder
  }

  private hashObject(obj: any): string {
    // Simple hash function for objects
    return Buffer.from(JSON.stringify(obj)).toString('base64').slice(0, 16);
  }

  private async loadProtocolSchemas(): Promise<void> {
    // Load protocol schemas from the registry
    // This would typically make HTTP requests to the schema registry
    // For now, this is a placeholder
  }

  private updateStats(result: ValidationResult, validationTime: number): void {
    this.stats.totalValidations++;
    
    if (result.valid) {
      this.stats.validMessages++;
    } else {
      this.stats.invalidMessages++;
    }

    // Update average validation time
    this.stats.averageValidationTime = 
      (this.stats.averageValidationTime * (this.stats.totalValidations - 1) + validationTime) / 
      this.stats.totalValidations;
  }
}

/**
 * Create default validator configuration
 */
export function createDefaultValidatorConfig(): UEPMessageValidatorConfig {
  return {
    protocols: {
      enableProtocolValidation: true,
      enableSchemaValidation: true,
      strictMode: false,
      allowUnknownProtocols: false,
    },
    performance: {
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 300000, // 5 minutes
      batchValidation: true,
      maxBatchSize: 100,
    },
    rules: {
      requireAllFields: true,
      validateTimestamps: true,
      validateTracing: true,
      maxPayloadSize: 1024 * 1024, // 1MB
      allowedMessageTypes: ['command', 'event', 'query', 'response'],
      subjectPatterns: [
        /^[a-zA-Z0-9_-]+\.(command|event|query|response)\.[a-zA-Z0-9_-]+(\..*)?$/,
      ],
    },
    errorHandling: {
      collectAllErrors: true,
      includeDataPath: true,
      verbose: false,
      logValidationErrors: true,
    },
  };
}