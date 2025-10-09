/**
 * UEP Event Schema Registry
 * 
 * This module provides a comprehensive registry for UEP event schemas,
 * enabling standardized event formats across the message broker system.
 * 
 * Features:
 * - Standard UEP event schemas for common interaction patterns
 * - Dynamic schema registration and validation
 * - Event schema versioning and evolution
 * - Performance-optimized schema compilation
 * - Integration with message validation system
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';

/**
 * UEP Event Schema Configuration
 */
export interface UEPEventSchemaConfig {
  // Schema management
  schema: {
    enableVersioning: boolean;
    strictMode: boolean;
    allowSchemaEvolution: boolean;
    validateSchemaCompatibility: boolean;
  };

  // Performance settings
  performance: {
    enableCaching: boolean;
    cacheSize: number;
    cacheTTL: number;
    precompileSchemas: boolean;
  };

  // Validation settings
  validation: {
    enableRuntimeValidation: boolean;
    collectAllErrors: boolean;
    removeAdditional: boolean;
    coerceTypes: boolean;
  };

  // Registry settings
  registry: {
    allowDynamicRegistration: boolean;
    enableSchemaDiscovery: boolean;
    schemaStoragePath?: string;
  };
}

/**
 * UEP Event Schema Definition
 */
export interface UEPEventSchema {
  // Schema identity
  id: string;
  version: string;
  name: string;
  description: string;

  // Schema metadata
  metadata: {
    category: EventCategory;
    priority: EventPriority;
    scope: EventScope;
    lifecycle: SchemaLifecycle;
    compatibility: CompatibilityLevel;
    tags: string[];
    author: string;
    createdAt: Date;
    updatedAt: Date;
  };

  // Event structure definition
  eventSchema: JSONSchemaType<UEPEvent>;

  // Payload schema (dynamic based on event type)
  payloadSchema?: JSONSchemaType<any>;

  // Validation rules
  validationRules?: EventValidationRule[];

  // Examples
  examples?: UEPEventExample[];
}

/**
 * Base UEP Event Structure
 */
export interface UEPEvent {
  // Event identity
  eventId: string;
  eventType: string;
  eventVersion: string;
  timestamp: string;

  // Event metadata
  metadata: {
    category: EventCategory;
    priority: EventPriority;
    scope: EventScope;
    correlationId?: string;
    causationId?: string;
    source: EventSource;
  };

  // Agent context
  agent: {
    id: string;
    type: 'meta' | 'domain';
    capability: string;
    instance: string;
  };

  // Event payload (type-specific)
  payload: any;

  // Additional context
  context?: {
    environment?: string;
    tenant?: string;
    namespace?: string;
    tracing?: {
      traceId: string;
      spanId: string;
      parentSpanId?: string;
    };
  };
}

/**
 * Event Categories
 */
export type EventCategory = 
  | 'system'           // System-level events
  | 'lifecycle'        // Agent lifecycle events
  | 'coordination'     // Agent coordination events
  | 'data'            // Data processing events
  | 'error'           // Error and failure events
  | 'monitoring'      // Monitoring and health events
  | 'security'        // Security and audit events
  | 'business'        // Business logic events
  | 'integration';    // External integration events

/**
 * Event Priorities
 */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Event Scopes
 */
export type EventScope = 'global' | 'cluster' | 'namespace' | 'agent' | 'local';

/**
 * Schema Lifecycle States
 */
export type SchemaLifecycle = 'draft' | 'active' | 'deprecated' | 'retired';

/**
 * Compatibility Levels
 */
export type CompatibilityLevel = 'breaking' | 'backward' | 'forward' | 'full';

/**
 * Event Source Information
 */
export interface EventSource {
  service: string;
  version: string;
  instance: string;
  host?: string;
  region?: string;
}

/**
 * Event Validation Rule
 */
export interface EventValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning';
  validator: (event: UEPEvent) => ValidationResult | null;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  code: string;
  message: string;
  path: string;
  value?: any;
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
 * Event Example
 */
export interface UEPEventExample {
  name: string;
  description: string;
  event: UEPEvent;
  valid: boolean;
}

/**
 * Schema Registration Result
 */
export interface SchemaRegistrationResult {
  success: boolean;
  schemaId: string;
  version: string;
  errors: string[];
  warnings: string[];
}

/**
 * UEP Event Schema Registry Implementation
 */
export class UEPEventSchemaRegistry extends EventEmitter {
  private config: UEPEventSchemaConfig;
  private ajv: Ajv;
  private schemas: Map<string, UEPEventSchema> = new Map();
  private validators: LRUCache<string, ValidateFunction>;
  private schemasByCategory: Map<EventCategory, Set<string>> = new Map();
  private schemasByType: Map<string, Set<string>> = new Map();

  constructor(config: UEPEventSchemaConfig) {
    super();
    this.config = config;
    this.setupAjv();
    this.setupCache();
    this.initializeStandardSchemas();
  }

  /**
   * Initialize the schema registry
   */
  async initialize(): Promise<void> {
    try {
      this.emit('registry:initializing');

      // Load schemas from storage if configured
      if (this.config.registry.schemaStoragePath) {
        await this.loadSchemasFromStorage();
      }

      // Precompile schemas if enabled
      if (this.config.performance.precompileSchemas) {
        await this.precompileAllSchemas();
      }

      this.emit('registry:initialized');
    } catch (error) {
      this.emit('registry:error', error);
      throw new Error(`Failed to initialize UEP Event Schema Registry: ${error.message}`);
    }
  }

  /**
   * Register a new event schema
   */
  registerSchema(schema: UEPEventSchema): SchemaRegistrationResult {
    try {
      const schemaKey = this.generateSchemaKey(schema.id, schema.version);
      const result: SchemaRegistrationResult = {
        success: false,
        schemaId: schema.id,
        version: schema.version,
        errors: [],
        warnings: [],
      };

      // Validate schema definition
      const validationResult = this.validateSchemaDefinition(schema);
      if (!validationResult.valid) {
        result.errors = validationResult.errors.map(e => e.message);
        return result;
      }

      // Check for compatibility if schema already exists
      if (this.config.schema.validateSchemaCompatibility) {
        const compatibilityResult = this.checkSchemaCompatibility(schema);
        if (!compatibilityResult.compatible) {
          result.errors = compatibilityResult.errors;
          if (!this.config.schema.allowSchemaEvolution) {
            return result;
          }
        }
        result.warnings = compatibilityResult.warnings;
      }

      // Register the schema
      this.schemas.set(schemaKey, schema);

      // Update indexes
      this.updateSchemaIndexes(schema);

      // Compile validator if enabled
      if (this.config.performance.precompileSchemas) {
        this.compileSchemaValidator(schema);
      }

      result.success = true;
      this.emit('schema:registered', { schemaId: schema.id, version: schema.version });

      return result;

    } catch (error) {
      this.emit('schema:registration-error', { schema: schema.id, error });
      return {
        success: false,
        schemaId: schema.id,
        version: schema.version,
        errors: [error.message],
        warnings: [],
      };
    }
  }

  /**
   * Get an event schema
   */
  getSchema(schemaId: string, version?: string): UEPEventSchema | null {
    if (version) {
      const schemaKey = this.generateSchemaKey(schemaId, version);
      return this.schemas.get(schemaKey) || null;
    }

    // Get latest version if no version specified
    return this.getLatestSchemaVersion(schemaId);
  }

  /**
   * Validate an event against its schema
   */
  async validateEvent(event: UEPEvent): Promise<ValidationResult> {
    try {
      // Get the appropriate schema
      const schema = this.getSchema(event.eventType, event.eventVersion);
      if (!schema) {
        return {
          valid: false,
          errors: [{
            code: 'SCHEMA_NOT_FOUND',
            message: `Schema not found for event type ${event.eventType} version ${event.eventVersion}`,
            path: 'eventType',
          }],
          warnings: [],
        };
      }

      // Get or compile validator
      const validator = this.getSchemaValidator(schema);

      // Validate against schema
      const isValid = validator(event);
      const result: ValidationResult = {
        valid: isValid,
        errors: [],
        warnings: [],
      };

      // Collect AJV errors
      if (!isValid && validator.errors) {
        result.errors = validator.errors.map(error => ({
          code: 'SCHEMA_VALIDATION_ERROR',
          message: error.message || 'Schema validation failed',
          path: error.instancePath || error.schemaPath || 'unknown',
          value: error.data,
        }));
      }

      // Run custom validation rules
      if (schema.validationRules) {
        for (const rule of schema.validationRules) {
          const ruleResult = rule.validator(event);
          if (ruleResult) {
            if (rule.severity === 'error') {
              result.valid = false;
              result.errors.push(...ruleResult.errors);
            } else {
              result.warnings.push(...ruleResult.warnings);
            }
          }
        }
      }

      this.emit('event:validated', { event: event.eventId, schema: schema.id, result });
      return result;

    } catch (error) {
      this.emit('validation:error', { event: event.eventId, error });
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_EXCEPTION',
          message: `Validation failed: ${error.message}`,
          path: 'root',
        }],
        warnings: [],
      };
    }
  }

  /**
   * List schemas by category
   */
  getSchemasByCategory(category: EventCategory): UEPEventSchema[] {
    const schemaIds = this.schemasByCategory.get(category) || new Set();
    return Array.from(schemaIds).map(id => {
      const [schemaId] = id.split(':');
      return this.getLatestSchemaVersion(schemaId);
    }).filter(Boolean) as UEPEventSchema[];
  }

  /**
   * List schemas by event type
   */
  getSchemasByType(eventType: string): UEPEventSchema[] {
    const schemaVersions = this.schemasByType.get(eventType) || new Set();
    return Array.from(schemaVersions)
      .map(key => this.schemas.get(key))
      .filter(Boolean) as UEPEventSchema[];
  }

  /**
   * List all registered schemas
   */
  listSchemas(): UEPEventSchema[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Remove a schema
   */
  removeSchema(schemaId: string, version: string): boolean {
    const schemaKey = this.generateSchemaKey(schemaId, version);
    const schema = this.schemas.get(schemaKey);
    
    if (!schema) {
      return false;
    }

    // Remove from main storage
    this.schemas.delete(schemaKey);

    // Remove from indexes
    this.removeFromIndexes(schema);

    // Remove cached validator
    this.validators.delete(schemaKey);

    this.emit('schema:removed', { schemaId, version });
    return true;
  }

  /**
   * Create an event instance from schema
   */
  createEventFromSchema(
    schemaId: string, 
    payload: any, 
    metadata: Partial<UEPEvent['metadata']> = {},
    agent: UEPEvent['agent']
  ): UEPEvent {
    const schema = this.getLatestSchemaVersion(schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaId}`);
    }

    const eventId = this.generateEventId();
    const timestamp = new Date().toISOString();

    return {
      eventId,
      eventType: schema.id,
      eventVersion: schema.version,
      timestamp,
      metadata: {
        category: schema.metadata.category,
        priority: schema.metadata.priority,
        scope: schema.metadata.scope,
        source: {
          service: agent.capability,
          version: '1.0.0',
          instance: agent.instance,
        },
        ...metadata,
      },
      agent,
      payload,
    };
  }

  /**
   * Private helper methods
   */
  private setupAjv(): void {
    this.ajv = new Ajv({
      allErrors: this.config.validation.collectAllErrors,
      removeAdditional: this.config.validation.removeAdditional,
      coerceTypes: this.config.validation.coerceTypes,
      strict: this.config.schema.strictMode,
      validateFormats: true,
    });

    // Add format validators
    addFormats(this.ajv);

    // Add custom formats for UEP events
    this.ajv.addFormat('event-id', {
      type: 'string',
      validate: (eventId: string) => /^[a-zA-Z0-9_-]+$/.test(eventId) && eventId.length <= 64,
    });

    this.ajv.addFormat('event-type', {
      type: 'string',
      validate: (eventType: string) => /^[a-zA-Z0-9._-]+$/.test(eventType),
    });

    this.ajv.addFormat('semantic-version', {
      type: 'string',
      validate: (version: string) => /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version),
    });
  }

  private setupCache(): void {
    this.validators = new LRUCache<string, ValidateFunction>({
      max: this.config.performance.cacheSize,
      ttl: this.config.performance.cacheTTL,
    });
  }

  private initializeStandardSchemas(): void {
    // Register standard UEP event schemas
    this.registerStandardSchemas();
  }

  private registerStandardSchemas(): void {
    // Agent Lifecycle Events
    this.registerSchema(this.createAgentStartedSchema());
    this.registerSchema(this.createAgentStoppedSchema());
    this.registerSchema(this.createAgentFailedSchema());

    // Coordination Events
    this.registerSchema(this.createTaskAssignedSchema());
    this.registerSchema(this.createTaskCompletedSchema());
    this.registerSchema(this.createWorkflowStartedSchema());
    this.registerSchema(this.createWorkflowCompletedSchema());

    // System Events
    this.registerSchema(this.createSystemHealthCheckSchema());
    this.registerSchema(this.createResourceUtilizationSchema());

    // Error Events
    this.registerSchema(this.createErrorOccurredSchema());
    this.registerSchema(this.createRecoveryCompletedSchema());

    // Data Events
    this.registerSchema(this.createDataProcessedSchema());
    this.registerSchema(this.createDataValidationFailedSchema());
  }

  private createAgentStartedSchema(): UEPEventSchema {
    return {
      id: 'agent.lifecycle.started',
      version: '1.0.0',
      name: 'Agent Started Event',
      description: 'Emitted when an agent successfully starts',
      metadata: {
        category: 'lifecycle',
        priority: 'normal',
        scope: 'cluster',
        lifecycle: 'active',
        compatibility: 'backward',
        tags: ['agent', 'lifecycle', 'startup'],
        author: 'UEP System',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      eventSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', format: 'event-id' },
          eventType: { type: 'string' },
          eventVersion: { type: 'string', format: 'semantic-version' },
          timestamp: { type: 'string', format: 'date-time' },
          metadata: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              priority: { type: 'string' },
              scope: { type: 'string' },
              correlationId: { type: 'string', nullable: true },
              causationId: { type: 'string', nullable: true },
              source: {
                type: 'object',
                properties: {
                  service: { type: 'string' },
                  version: { type: 'string' },
                  instance: { type: 'string' },
                  host: { type: 'string', nullable: true },
                  region: { type: 'string', nullable: true },
                },
                required: ['service', 'version', 'instance'],
                additionalProperties: false,
              },
            },
            required: ['category', 'priority', 'scope', 'source'],
            additionalProperties: false,
          },
          agent: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['meta', 'domain'] },
              capability: { type: 'string' },
              instance: { type: 'string' },
            },
            required: ['id', 'type', 'capability', 'instance'],
            additionalProperties: false,
          },
          payload: {
            type: 'object',
            properties: {
              startupTime: { type: 'number' },
              configuration: { type: 'object', additionalProperties: true },
              capabilities: { type: 'array', items: { type: 'string' } },
              dependencies: { type: 'array', items: { type: 'string' } },
            },
            required: ['startupTime'],
            additionalProperties: true,
          },
          context: {
            type: 'object',
            nullable: true,
            properties: {
              environment: { type: 'string', nullable: true },
              tenant: { type: 'string', nullable: true },
              namespace: { type: 'string', nullable: true },
              tracing: {
                type: 'object',
                nullable: true,
                properties: {
                  traceId: { type: 'string' },
                  spanId: { type: 'string' },
                  parentSpanId: { type: 'string', nullable: true },
                },
                required: ['traceId', 'spanId'],
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
        },
        required: ['eventId', 'eventType', 'eventVersion', 'timestamp', 'metadata', 'agent', 'payload'],
        additionalProperties: false,
      },
      examples: [{
        name: 'Basic Agent Started',
        description: 'A meta agent starting up',
        valid: true,
        event: {
          eventId: 'evt_agent_started_001',
          eventType: 'agent.lifecycle.started',
          eventVersion: '1.0.0',
          timestamp: '2025-01-28T10:00:00.000Z',
          metadata: {
            category: 'lifecycle',
            priority: 'normal',
            scope: 'cluster',
            source: {
              service: 'prd-parser',
              version: '1.0.0',
              instance: 'prd-parser-001',
            },
          },
          agent: {
            id: 'meta-agent-prd-parser-001',
            type: 'meta',
            capability: 'prd-parsing',
            instance: 'instance-001',
          },
          payload: {
            startupTime: 2500,
            capabilities: ['prd-parsing', 'requirements-extraction'],
            dependencies: ['protocol-registry', 'validation-service'],
          },
        },
      }],
    };
  }

  private createTaskCompletedSchema(): UEPEventSchema {
    return {
      id: 'task.coordination.completed',
      version: '1.0.0',
      name: 'Task Completed Event',
      description: 'Emitted when a task is successfully completed',
      metadata: {
        category: 'coordination',
        priority: 'high',
        scope: 'namespace',
        lifecycle: 'active',
        compatibility: 'backward',
        tags: ['task', 'coordination', 'completion'],
        author: 'UEP System',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      eventSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', format: 'event-id' },
          eventType: { type: 'string' },
          eventVersion: { type: 'string', format: 'semantic-version' },
          timestamp: { type: 'string', format: 'date-time' },
          metadata: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              priority: { type: 'string' },
              scope: { type: 'string' },
              correlationId: { type: 'string', nullable: true },
              causationId: { type: 'string', nullable: true },
              source: {
                type: 'object',
                properties: {
                  service: { type: 'string' },
                  version: { type: 'string' },
                  instance: { type: 'string' },
                  host: { type: 'string', nullable: true },
                  region: { type: 'string', nullable: true },
                },
                required: ['service', 'version', 'instance'],
                additionalProperties: false,
              },
            },
            required: ['category', 'priority', 'scope', 'source'],
            additionalProperties: false,
          },
          agent: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['meta', 'domain'] },
              capability: { type: 'string' },
              instance: { type: 'string' },
            },
            required: ['id', 'type', 'capability', 'instance'],
            additionalProperties: false,
          },
          payload: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              taskType: { type: 'string' },
              executionTime: { type: 'number' },
              result: { type: 'object', additionalProperties: true },
              metrics: {
                type: 'object',
                properties: {
                  duration: { type: 'number' },
                  resourceUsed: { type: 'object', additionalProperties: true },
                  performance: { type: 'object', additionalProperties: true },
                },
                additionalProperties: true,
              },
            },
            required: ['taskId', 'taskType', 'executionTime', 'result'],
            additionalProperties: true,
          },
          context: {
            type: 'object',
            nullable: true,
            properties: {
              environment: { type: 'string', nullable: true },
              tenant: { type: 'string', nullable: true },
              namespace: { type: 'string', nullable: true },
              tracing: {
                type: 'object',
                nullable: true,
                properties: {
                  traceId: { type: 'string' },
                  spanId: { type: 'string' },
                  parentSpanId: { type: 'string', nullable: true },
                },
                required: ['traceId', 'spanId'],
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
        },
        required: ['eventId', 'eventType', 'eventVersion', 'timestamp', 'metadata', 'agent', 'payload'],
        additionalProperties: false,
      },
      examples: [{
        name: 'Task Completion Example',
        description: 'A PRD parsing task completion',
        valid: true,
        event: {
          eventId: 'evt_task_completed_001',
          eventType: 'task.coordination.completed',
          eventVersion: '1.0.0',
          timestamp: '2025-01-28T10:05:00.000Z',
          metadata: {
            category: 'coordination',
            priority: 'high',
            scope: 'namespace',
            correlationId: 'workflow-12345',
            source: {
              service: 'prd-parser',
              version: '1.0.0',
              instance: 'prd-parser-001',
            },
          },
          agent: {
            id: 'meta-agent-prd-parser-001',
            type: 'meta',
            capability: 'prd-parsing',
            instance: 'instance-001',
          },
          payload: {
            taskId: 'task-prd-parse-001',
            taskType: 'prd-parsing',
            executionTime: 15000,
            result: {
              tasksGenerated: 25,
              requirementsExtracted: 42,
              complexity: 'medium',
            },
            metrics: {
              duration: 15000,
              resourceUsed: {
                cpu: '50%',
                memory: '256MB',
              },
            },
          },
        },
      }],
    };
  }

  // Additional schema creation methods would go here...
  private createAgentStoppedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createAgentFailedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createTaskAssignedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createWorkflowStartedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createWorkflowCompletedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createSystemHealthCheckSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createResourceUtilizationSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createErrorOccurredSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createRecoveryCompletedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createDataProcessedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }
  private createDataValidationFailedSchema(): UEPEventSchema { /* Implementation */ return {} as UEPEventSchema; }

  private generateSchemaKey(id: string, version: string): string {
    return `${id}:${version}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateSchemaDefinition(schema: UEPEventSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!schema.id || !schema.version || !schema.eventSchema) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Schema must have id, version, and eventSchema',
        path: 'schema',
      });
    }

    // Validate semantic version
    if (schema.version && !/^\d+\.\d+\.\d+/.test(schema.version)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version must follow semantic versioning format',
        path: 'version',
        value: schema.version,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private checkSchemaCompatibility(schema: UEPEventSchema): { compatible: boolean; errors: string[]; warnings: string[] } {
    // Implementation for schema compatibility checking
    return { compatible: true, errors: [], warnings: [] };
  }

  private updateSchemaIndexes(schema: UEPEventSchema): void {
    const schemaKey = this.generateSchemaKey(schema.id, schema.version);

    // Update category index
    if (!this.schemasByCategory.has(schema.metadata.category)) {
      this.schemasByCategory.set(schema.metadata.category, new Set());
    }
    this.schemasByCategory.get(schema.metadata.category)!.add(schemaKey);

    // Update type index
    if (!this.schemasByType.has(schema.id)) {
      this.schemasByType.set(schema.id, new Set());
    }
    this.schemasByType.get(schema.id)!.add(schemaKey);
  }

  private removeFromIndexes(schema: UEPEventSchema): void {
    const schemaKey = this.generateSchemaKey(schema.id, schema.version);

    // Remove from category index
    this.schemasByCategory.get(schema.metadata.category)?.delete(schemaKey);

    // Remove from type index
    this.schemasByType.get(schema.id)?.delete(schemaKey);
  }

  private getLatestSchemaVersion(schemaId: string): UEPEventSchema | null {
    const versions = this.schemasByType.get(schemaId);
    if (!versions || versions.size === 0) {
      return null;
    }

    // Sort versions and get the latest
    const sortedVersions = Array.from(versions)
      .map(key => {
        const schema = this.schemas.get(key);
        return schema ? { key, version: schema.version, schema } : null;
      })
      .filter(Boolean)
      .sort((a, b) => this.compareVersions(a!.version, b!.version));

    return sortedVersions[sortedVersions.length - 1]?.schema || null;
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA < partB) return -1;
      if (partA > partB) return 1;
    }

    return 0;
  }

  private getSchemaValidator(schema: UEPEventSchema): ValidateFunction {
    const schemaKey = this.generateSchemaKey(schema.id, schema.version);
    
    let validator = this.validators.get(schemaKey);
    if (!validator) {
      validator = this.compileSchemaValidator(schema);
      this.validators.set(schemaKey, validator);
    }

    return validator;
  }

  private compileSchemaValidator(schema: UEPEventSchema): ValidateFunction {
    return this.ajv.compile(schema.eventSchema);
  }

  private async precompileAllSchemas(): Promise<void> {
    for (const schema of this.schemas.values()) {
      this.compileSchemaValidator(schema);
    }
  }

  private async loadSchemasFromStorage(): Promise<void> {
    // Implementation for loading schemas from persistent storage
    // This would typically read from a file system or database
  }
}

/**
 * Create default event schema registry configuration
 */
export function createDefaultEventSchemaConfig(): UEPEventSchemaConfig {
  return {
    schema: {
      enableVersioning: true,
      strictMode: false,
      allowSchemaEvolution: true,
      validateSchemaCompatibility: true,
    },
    performance: {
      enableCaching: true,
      cacheSize: 100,
      cacheTTL: 300000, // 5 minutes
      precompileSchemas: true,
    },
    validation: {
      enableRuntimeValidation: true,
      collectAllErrors: true,
      removeAdditional: false,
      coerceTypes: true,
    },
    registry: {
      allowDynamicRegistration: true,
      enableSchemaDiscovery: true,
    },
  };
}