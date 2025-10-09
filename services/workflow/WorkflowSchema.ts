/**
 * UEP Workflow Schema Definition and Versioning System
 * 
 * Comprehensive workflow schema system for distributed agent coordination
 * using TypeScript JSON Schema with semantic versioning and validation.
 * Implements research-based patterns: Saga, Mediator, Command, Observer.
 * 
 * Research-based implementation features:
 * - Semantic versioning with backward compatibility
 * - Saga pattern with compensation logic
 * - Mediator pattern for agent coordination
 * - Command pattern for step execution
 * - Observer pattern for real-time monitoring
 * - JSON Schema validation with runtime type safety
 * - Migration scripts for schema evolution
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 224.1
 */

import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import winston from 'winston';
import { z } from 'zod';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

// Core workflow schema interfaces following research patterns

/**
 * Main workflow definition interface implementing Saga pattern
 */
export interface WorkflowDefinition {
  id: string;                          // Unique workflow identifier
  name: string;                        // Human-readable name
  description?: string;                // Optional description
  version: string;                     // Semantic version (e.g., "1.2.0")
  schemaVersion: string;               // Schema compatibility version
  tags?: string[];                     // Optional workflow tags
  
  // Workflow execution configuration
  steps: WorkflowStep[];               // Ordered array of steps
  errorHandling: ErrorStrategy;        // Global error handling strategy
  timeout?: number;                    // Overall workflow timeout in ms
  retryPolicy?: RetryPolicy;           // Default retry policy
  
  // Coordination and observability
  coordination: CoordinationConfig;    // Agent coordination settings
  monitoring: MonitoringConfig;        // Monitoring and audit configuration
  
  // Metadata
  createdAt: string;                   // ISO timestamp
  updatedAt: string;                   // ISO timestamp
  createdBy?: string;                  // Optional creator identifier
  metadata?: Record<string, any>;      // Additional metadata
}

/**
 * Individual workflow step implementing Command pattern
 */
export interface WorkflowStep {
  id: string;                          // Step identifier
  name: string;                        // Human-readable name
  description?: string;                // Optional description
  
  // Agent coordination requirements
  requiredCapabilities: string[];      // Required agent capabilities
  preferredAgents?: string[];          // Preferred agent IDs
  excludedAgents?: string[];           // Excluded agent IDs
  
  // Step execution configuration
  action: ActionDefinition;            // Action to perform
  compensation?: ActionDefinition;     // Saga compensation action
  input: InputMapping[];               // Input parameter mapping
  output: OutputMapping[];             // Output parameter mapping
  
  // Execution control
  retryStrategy?: RetryStrategy;       // Step-specific retry strategy
  timeout?: number;                    // Step timeout in ms
  parallel?: boolean;                  // Can run in parallel with next step
  condition?: ConditionalExpression;   // Conditional execution expression
  dependencies?: string[];             // Step dependencies (step IDs)
  
  // Monitoring and validation
  validation?: ValidationRules;        // Input/output validation rules
  monitoring?: StepMonitoringConfig;   // Step-specific monitoring
}

/**
 * Action definition for Command pattern implementation
 */
export interface ActionDefinition {
  type: ActionType;                    // Type of action
  endpoint?: string;                   // API endpoint for HTTP actions
  method?: string;                     // HTTP method
  command?: string;                    // Command string for shell actions
  script?: string;                     // Script content for script actions
  parameters?: Record<string, any>;    // Action parameters
  headers?: Record<string, string>;    // HTTP headers
  authentication?: AuthConfig;         // Authentication configuration
}

/**
 * Error handling strategy configuration
 */
export interface ErrorStrategy {
  strategy: 'fail-fast' | 'continue' | 'compensate' | 'retry-then-compensate';
  maxRetries?: number;                 // Maximum retry attempts
  retryDelay?: number;                 // Delay between retries (ms)
  fallbackAction?: ActionDefinition;   // Fallback action on failure
  notificationChannels?: string[];     // Error notification channels
}

/**
 * Coordination configuration for Mediator pattern
 */
export interface CoordinationConfig {
  mode: 'sequential' | 'parallel' | 'mixed';
  maxConcurrentSteps?: number;         // Maximum concurrent step execution
  coordinatorId?: string;              // Specific coordinator agent ID
  communicationTimeout?: number;       // Agent communication timeout
  heartbeatInterval?: number;          // Agent heartbeat interval
  failureThreshold?: number;           // Agent failure threshold
}

/**
 * Monitoring configuration for Observer pattern
 */
export interface MonitoringConfig {
  enableAuditTrail: boolean;           // Enable detailed audit logging
  enableMetrics: boolean;              // Enable metrics collection
  enableRealTimeUpdates: boolean;      // Enable real-time status updates
  notificationChannels?: string[];     // Notification channels
  metricsLabels?: Record<string, string>; // Additional metrics labels
  auditLevel: 'minimal' | 'detailed' | 'verbose'; // Audit detail level
}

/**
 * Parameter mapping definitions
 */
export interface InputMapping {
  source: string;                      // Source parameter name
  target: string;                      // Target parameter name
  transformation?: TransformationRule; // Optional transformation
  required?: boolean;                  // Is parameter required
  defaultValue?: any;                  // Default value if missing
}

export interface OutputMapping {
  source: string;                      // Source result field
  target: string;                      // Target output name
  transformation?: TransformationRule; // Optional transformation
  publishToContext?: boolean;          // Publish to workflow context
}

/**
 * Conditional execution expression
 */
export interface ConditionalExpression {
  expression: string;                  // Boolean expression
  language: 'javascript' | 'jsonpath' | 'custom'; // Expression language
  context?: Record<string, any>;       // Additional context variables
}

/**
 * Retry policy and strategy
 */
export interface RetryPolicy {
  maxAttempts: number;                 // Maximum retry attempts
  backoffStrategy: 'fixed' | 'exponential' | 'linear'; // Backoff strategy
  initialDelay: number;                // Initial delay in ms
  maxDelay?: number;                   // Maximum delay in ms
  backoffMultiplier?: number;          // Multiplier for exponential backoff
  retryConditions?: string[];          // Conditions that trigger retry
}

export interface RetryStrategy extends RetryPolicy {
  // Step-specific retry configuration
  retryableErrors?: string[];          // Error types that can be retried
  nonRetryableErrors?: string[];       // Error types that cannot be retried
}

/**
 * Validation rules for input/output
 */
export interface ValidationRules {
  schema?: object;                     // JSON Schema for validation
  customValidators?: string[];         // Custom validator function names
  strictMode?: boolean;                // Strict validation mode
}

/**
 * Step-specific monitoring configuration
 */
export interface StepMonitoringConfig {
  enableMetrics?: boolean;             // Enable step metrics
  enableTracing?: boolean;             // Enable distributed tracing
  customLabels?: Record<string, string>; // Custom metrics labels
  alertThresholds?: AlertThreshold[];  // Alert thresholds
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metric: string;                      // Metric name
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  value: number;                       // Threshold value
  duration?: number;                   // Duration before alert (ms)
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Transformation rule for parameter mapping
 */
export interface TransformationRule {
  type: 'jsonpath' | 'javascript' | 'template' | 'custom';
  expression: string;                  // Transformation expression
  parameters?: Record<string, any>;    // Additional parameters
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2';
  token?: string;                      // Bearer token
  username?: string;                   // Basic auth username
  password?: string;                   // Basic auth password
  apiKey?: string;                     // API key
  apiKeyHeader?: string;               // API key header name
}

// Enums and type definitions
export type ActionType = 'http' | 'grpc' | 'shell' | 'script' | 'internal' | 'agent-call';

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  workflowId: string;                  // Workflow instance ID
  executionId: string;                 // Unique execution ID
  status: WorkflowStatus;              // Current workflow status
  startTime: Date;                     // Execution start time
  endTime?: Date;                      // Execution end time
  variables: Record<string, any>;      // Workflow variables
  stepResults: Record<string, any>;    // Results from completed steps
  errors: WorkflowError[];             // Accumulated errors
  metrics: WorkflowMetrics;            // Execution metrics
}

/**
 * Workflow error information
 */
export interface WorkflowError {
  stepId?: string;                     // Step that caused the error
  timestamp: Date;                     // When error occurred
  type: string;                        // Error type
  message: string;                     // Error message
  details?: any;                       // Additional error details
  recovery?: RecoveryAction;           // Recovery action taken
}

/**
 * Recovery action information
 */
export interface RecoveryAction {
  type: 'retry' | 'compensate' | 'skip' | 'fallback';
  timestamp: Date;                     // When recovery was attempted
  success: boolean;                    // Was recovery successful
  details?: any;                       // Recovery details
}

/**
 * Workflow execution metrics
 */
export interface WorkflowMetrics {
  totalSteps: number;                  // Total number of steps
  completedSteps: number;              // Number of completed steps
  failedSteps: number;                 // Number of failed steps
  skippedSteps: number;                // Number of skipped steps
  totalDuration?: number;              // Total execution duration (ms)
  avgStepDuration?: number;            // Average step duration (ms)
  retryCount: number;                  // Total retry attempts
  compensationCount: number;           // Total compensation actions
  agentUtilization: Record<string, number>; // Agent utilization stats
}

/**
 * Schema versioning and validation system
 */
export class WorkflowSchemaManager extends EventEmitter {
  private logger: winston.Logger;
  private validator: Ajv;
  private schemaRegistry = new Map<string, JSONSchemaType<any>>();
  private migrations = new Map<string, MigrationFunction>();
  
  // Current schema version
  public static readonly CURRENT_SCHEMA_VERSION = '1.0.0';
  
  // Schema directory path
  private schemaDir: string;

  constructor(schemaDir = './schemas/workflow') {
    super();
    
    this.schemaDir = schemaDir;
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/workflow-schema.log' })
      ]
    });

    // Initialize AJV validator with formats
    this.validator = new Ajv({ 
      allErrors: true, 
      validateFormats: true,
      addUsedSchema: false
    });
    addFormats(this.validator);
    
    // Initialize default schemas and migrations
    this.initializeSchemas();
    this.initializeMigrations();
  }

  /**
   * Initialize default workflow schemas
   */
  private initializeSchemas(): void {
    // Workflow definition schema
    const workflowSchema: JSONSchemaType<WorkflowDefinition> = {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string', nullable: true },
        version: { 
          type: 'string', 
          pattern: '^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9]+)?$' // Semantic version pattern
        },
        schemaVersion: { type: 'string' },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          nullable: true 
        },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1 },
              name: { type: 'string', minLength: 1 },
              description: { type: 'string', nullable: true },
              requiredCapabilities: {
                type: 'array',
                items: { type: 'string' }
              },
              preferredAgents: {
                type: 'array',
                items: { type: 'string' },
                nullable: true
              },
              excludedAgents: {
                type: 'array',
                items: { type: 'string' },
                nullable: true
              },
              action: {
                type: 'object',
                properties: {
                  type: { 
                    type: 'string',
                    enum: ['http', 'grpc', 'shell', 'script', 'internal', 'agent-call']
                  },
                  endpoint: { type: 'string', nullable: true },
                  method: { type: 'string', nullable: true },
                  command: { type: 'string', nullable: true },
                  script: { type: 'string', nullable: true },
                  parameters: { type: 'object', nullable: true },
                  headers: { type: 'object', nullable: true },
                  authentication: { type: 'object', nullable: true }
                },
                required: ['type'],
                additionalProperties: false
              },
              compensation: { type: 'object', nullable: true },
              input: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                    transformation: { type: 'object', nullable: true },
                    required: { type: 'boolean', nullable: true },
                    defaultValue: { nullable: true }
                  },
                  required: ['source', 'target'],
                  additionalProperties: false
                }
              },
              output: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                    transformation: { type: 'object', nullable: true },
                    publishToContext: { type: 'boolean', nullable: true }
                  },
                  required: ['source', 'target'],
                  additionalProperties: false
                }
              },
              retryStrategy: { type: 'object', nullable: true },
              timeout: { type: 'number', minimum: 0, nullable: true },
              parallel: { type: 'boolean', nullable: true },
              condition: { type: 'object', nullable: true },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
                nullable: true
              },
              validation: { type: 'object', nullable: true },
              monitoring: { type: 'object', nullable: true }
            },
            required: ['id', 'name', 'requiredCapabilities', 'action', 'input', 'output'],
            additionalProperties: false
          }
        },
        errorHandling: {
          type: 'object',
          properties: {
            strategy: {
              type: 'string',
              enum: ['fail-fast', 'continue', 'compensate', 'retry-then-compensate']
            },
            maxRetries: { type: 'number', minimum: 0, nullable: true },
            retryDelay: { type: 'number', minimum: 0, nullable: true },
            fallbackAction: { type: 'object', nullable: true },
            notificationChannels: {
              type: 'array',
              items: { type: 'string' },
              nullable: true
            }
          },
          required: ['strategy'],
          additionalProperties: false
        },
        timeout: { type: 'number', minimum: 0, nullable: true },
        retryPolicy: { type: 'object', nullable: true },
        coordination: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['sequential', 'parallel', 'mixed']
            },
            maxConcurrentSteps: { type: 'number', minimum: 1, nullable: true },
            coordinatorId: { type: 'string', nullable: true },
            communicationTimeout: { type: 'number', minimum: 0, nullable: true },
            heartbeatInterval: { type: 'number', minimum: 0, nullable: true },
            failureThreshold: { type: 'number', minimum: 0, nullable: true }
          },
          required: ['mode'],
          additionalProperties: false
        },
        monitoring: {
          type: 'object',
          properties: {
            enableAuditTrail: { type: 'boolean' },
            enableMetrics: { type: 'boolean' },
            enableRealTimeUpdates: { type: 'boolean' },
            notificationChannels: {
              type: 'array',
              items: { type: 'string' },
              nullable: true
            },
            metricsLabels: { type: 'object', nullable: true },
            auditLevel: {
              type: 'string',
              enum: ['minimal', 'detailed', 'verbose']
            }
          },
          required: ['enableAuditTrail', 'enableMetrics', 'enableRealTimeUpdates', 'auditLevel'],
          additionalProperties: false
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        createdBy: { type: 'string', nullable: true },
        metadata: { type: 'object', nullable: true }
      },
      required: [
        'id', 'name', 'version', 'schemaVersion', 'steps', 
        'errorHandling', 'coordination', 'monitoring', 'createdAt', 'updatedAt'
      ],
      additionalProperties: false
    };

    this.schemaRegistry.set('1.0.0', workflowSchema);
    this.validator.addSchema(workflowSchema, 'workflow-v1.0.0');
    
    this.logger.info('Initialized workflow schemas', {
      versions: Array.from(this.schemaRegistry.keys())
    });
  }

  /**
   * Initialize schema migration functions
   */
  private initializeMigrations(): void {
    // Example migration from hypothetical v0.9.0 to v1.0.0
    this.migrations.set('0.9.0->1.0.0', (oldDefinition: any): WorkflowDefinition => {
      return {
        ...oldDefinition,
        schemaVersion: '1.0.0',
        coordination: {
          mode: oldDefinition.executionMode || 'sequential',
          maxConcurrentSteps: oldDefinition.maxConcurrency || undefined,
          communicationTimeout: 30000,
          heartbeatInterval: 5000,
          failureThreshold: 3
        },
        monitoring: {
          enableAuditTrail: true,
          enableMetrics: true,
          enableRealTimeUpdates: true,
          auditLevel: 'detailed'
        },
        updatedAt: new Date().toISOString()
      };
    });
    
    this.logger.info('Initialized schema migrations', {
      migrations: Array.from(this.migrations.keys())
    });
  }

  /**
   * Validate workflow definition against schema
   */
  public validateWorkflow(definition: any, version?: string): ValidationResult {
    const schemaVersion = version || definition.schemaVersion || WorkflowSchemaManager.CURRENT_SCHEMA_VERSION;
    const schema = this.schemaRegistry.get(schemaVersion);
    
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown schema version: ${schemaVersion}`],
        warnings: []
      };
    }

    const validate = this.validator.getSchema(`workflow-v${schemaVersion}`);
    if (!validate) {
      return {
        valid: false,
        errors: [`Schema validator not found for version: ${schemaVersion}`],
        warnings: []
      };
    }

    const valid = validate(definition);
    const errors = validate.errors ? 
      validate.errors.map(err => `${err.instancePath}: ${err.message}`) : [];
    
    // Additional semantic validations
    const warnings = this.performSemanticValidation(definition);

    return {
      valid: valid === true,
      errors,
      warnings
    };
  }

  /**
   * Perform semantic validation beyond schema checking
   */
  private performSemanticValidation(definition: WorkflowDefinition): string[] {
    const warnings: string[] = [];
    
    // Check for circular dependencies
    const stepIds = new Set(definition.steps.map(s => s.id));
    for (const step of definition.steps) {
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            warnings.push(`Step ${step.id} depends on non-existent step: ${dep}`);
          }
        }
      }
    }
    
    // Check for unreachable steps
    const reachableSteps = new Set<string>();
    const queue = [...definition.steps.filter(s => !s.dependencies || s.dependencies.length === 0)];
    
    while (queue.length > 0) {
      const step = queue.shift()!;
      reachableSteps.add(step.id);
      
      // Find steps that depend on this step
      const dependentSteps = definition.steps.filter(s => 
        s.dependencies && s.dependencies.includes(step.id)
      );
      
      for (const dependentStep of dependentSteps) {
        if (!reachableSteps.has(dependentStep.id) && 
            dependentStep.dependencies!.every(dep => reachableSteps.has(dep))) {
          queue.push(dependentStep);
        }
      }
    }
    
    const unreachableSteps = definition.steps.filter(s => !reachableSteps.has(s.id));
    for (const step of unreachableSteps) {
      warnings.push(`Step ${step.id} is unreachable due to circular or missing dependencies`);
    }
    
    return warnings;
  }

  /**
   * Migrate workflow definition to latest schema version
   */
  public async migrateWorkflow(definition: any, targetVersion?: string): Promise<WorkflowDefinition> {
    const currentVersion = definition.schemaVersion || '0.9.0'; // Default to old version
    const target = targetVersion || WorkflowSchemaManager.CURRENT_SCHEMA_VERSION;
    
    if (currentVersion === target) {
      return definition as WorkflowDefinition;
    }

    const migrationKey = `${currentVersion}->${target}`;
    const migration = this.migrations.get(migrationKey);
    
    if (!migration) {
      throw new Error(`No migration path from ${currentVersion} to ${target}`);
    }

    const migratedDefinition = migration(definition);
    
    // Validate migrated definition
    const validation = this.validateWorkflow(migratedDefinition, target);
    if (!validation.valid) {
      throw new Error(`Migration failed validation: ${validation.errors.join(', ')}`);
    }

    this.logger.info('Successfully migrated workflow definition', {
      workflowId: definition.id,
      fromVersion: currentVersion,
      toVersion: target
    });

    this.emit('workflowMigrated', {
      workflowId: definition.id,
      fromVersion: currentVersion,
      toVersion: target,
      definition: migratedDefinition
    });

    return migratedDefinition;
  }

  /**
   * Load workflow definition from file with validation and migration
   */
  public async loadWorkflowFromFile(filePath: string): Promise<WorkflowDefinition> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const definition = JSON.parse(content);
      
      // Migrate if necessary
      const migratedDefinition = await this.migrateWorkflow(definition);
      
      // Validate
      const validation = this.validateWorkflow(migratedDefinition);
      if (!validation.valid) {
        throw new Error(`Invalid workflow definition: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        this.logger.warn('Workflow validation warnings', {
          filePath,
          warnings: validation.warnings
        });
      }

      return migratedDefinition;
    } catch (error) {
      this.logger.error('Failed to load workflow from file', {
        filePath,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Save workflow definition to file
   */
  public async saveWorkflowToFile(definition: WorkflowDefinition, filePath: string): Promise<void> {
    // Validate before saving
    const validation = this.validateWorkflow(definition);
    if (!validation.valid) {
      throw new Error(`Cannot save invalid workflow: ${validation.errors.join(', ')}`);
    }

    try {
      const content = JSON.stringify(definition, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
      
      this.logger.info('Saved workflow definition to file', {
        workflowId: definition.id,
        filePath,
        version: definition.version
      });
    } catch (error) {
      this.logger.error('Failed to save workflow to file', {
        workflowId: definition.id,
        filePath,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Create workflow definition with defaults
   */
  public createWorkflowDefinition(
    id: string,
    name: string,
    steps: Omit<WorkflowStep, 'id'>[]
  ): WorkflowDefinition {
    const now = new Date().toISOString();
    
    return {
      id,
      name,
      version: '1.0.0',
      schemaVersion: WorkflowSchemaManager.CURRENT_SCHEMA_VERSION,
      steps: steps.map((step, index) => ({
        ...step,
        id: step.name?.toLowerCase().replace(/\s+/g, '-') || `step-${index + 1}`
      })),
      errorHandling: {
        strategy: 'retry-then-compensate',
        maxRetries: 3,
        retryDelay: 1000
      },
      coordination: {
        mode: 'sequential',
        communicationTimeout: 30000,
        heartbeatInterval: 5000,
        failureThreshold: 3
      },
      monitoring: {
        enableAuditTrail: true,
        enableMetrics: true,
        enableRealTimeUpdates: true,
        auditLevel: 'detailed'
      },
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Get supported schema versions
   */
  public getSupportedVersions(): string[] {
    return Array.from(this.schemaRegistry.keys()).sort();
  }

  /**
   * Get current schema version
   */
  public getCurrentVersion(): string {
    return WorkflowSchemaManager.CURRENT_SCHEMA_VERSION;
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Migration function type
 */
export type MigrationFunction = (oldDefinition: any) => WorkflowDefinition;

/**
 * Factory function to create workflow schema manager
 */
export function createWorkflowSchemaManager(schemaDir?: string): WorkflowSchemaManager {
  return new WorkflowSchemaManager(schemaDir);
}

// Zod schemas for runtime validation (alternative to AJV)
export const WorkflowDefinitionZodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/),
  schemaVersion: z.string(),
  tags: z.array(z.string()).optional(),
  steps: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    requiredCapabilities: z.array(z.string()),
    preferredAgents: z.array(z.string()).optional(),
    excludedAgents: z.array(z.string()).optional(),
    action: z.object({
      type: z.enum(['http', 'grpc', 'shell', 'script', 'internal', 'agent-call']),
      endpoint: z.string().optional(),
      method: z.string().optional(),
      command: z.string().optional(),
      script: z.string().optional(),
      parameters: z.record(z.any()).optional(),
      headers: z.record(z.string()).optional(),
      authentication: z.object({}).optional()
    }),
    compensation: z.object({}).optional(),
    input: z.array(z.object({
      source: z.string(),
      target: z.string(),
      transformation: z.object({}).optional(),
      required: z.boolean().optional(),
      defaultValue: z.any().optional()
    })),
    output: z.array(z.object({
      source: z.string(),
      target: z.string(),
      transformation: z.object({}).optional(),
      publishToContext: z.boolean().optional()
    })),
    retryStrategy: z.object({}).optional(),
    timeout: z.number().min(0).optional(),
    parallel: z.boolean().optional(),
    condition: z.object({}).optional(),
    dependencies: z.array(z.string()).optional(),
    validation: z.object({}).optional(),
    monitoring: z.object({}).optional()
  })),
  errorHandling: z.object({
    strategy: z.enum(['fail-fast', 'continue', 'compensate', 'retry-then-compensate']),
    maxRetries: z.number().min(0).optional(),
    retryDelay: z.number().min(0).optional(),
    fallbackAction: z.object({}).optional(),
    notificationChannels: z.array(z.string()).optional()
  }),
  timeout: z.number().min(0).optional(),
  retryPolicy: z.object({}).optional(),
  coordination: z.object({
    mode: z.enum(['sequential', 'parallel', 'mixed']),
    maxConcurrentSteps: z.number().min(1).optional(),
    coordinatorId: z.string().optional(),
    communicationTimeout: z.number().min(0).optional(),
    heartbeatInterval: z.number().min(0).optional(),
    failureThreshold: z.number().min(0).optional()
  }),
  monitoring: z.object({
    enableAuditTrail: z.boolean(),
    enableMetrics: z.boolean(),
    enableRealTimeUpdates: z.boolean(),
    notificationChannels: z.array(z.string()).optional(),
    metricsLabels: z.record(z.string()).optional(),
    auditLevel: z.enum(['minimal', 'detailed', 'verbose'])
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Export all types for external use
export type {
  WorkflowStep,
  ActionDefinition,
  ErrorStrategy,
  CoordinationConfig,
  MonitoringConfig,
  InputMapping,
  OutputMapping,
  ConditionalExpression,
  RetryPolicy,
  RetryStrategy,
  ValidationRules,
  StepMonitoringConfig,
  AlertThreshold,
  TransformationRule,
  AuthConfig,
  WorkflowContext,
  WorkflowError,
  RecoveryAction,
  WorkflowMetrics
};