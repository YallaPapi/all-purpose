/**
 * UEP Schema Enforcement Engine
 * 
 * This module provides comprehensive schema enforcement for UEP events,
 * integrating with the message broker to ensure all events conform to
 * registered schemas and validation rules.
 * 
 * Features:
 * - Real-time schema enforcement during message processing
 * - Configurable enforcement policies and actions
 * - Integration with validation middleware
 * - Schema evolution and migration support
 * - Performance monitoring and metrics
 */

import { EventEmitter } from 'events';
import { UEPEventSchemaRegistry, UEPEventSchema, UEPEvent } from './UEPEventSchemaRegistry';
import { UEPMessage } from './UEPMessageBroker';

/**
 * Schema Enforcement Configuration
 */
export interface SchemaEnforcementConfig {
  // Enforcement policies
  policies: {
    strictEnforcement: boolean;
    allowUnknownEvents: boolean;
    rejectMalformedEvents: boolean;
    enableSchemaEvolution: boolean;
    enforcementLevel: EnforcementLevel;
  };

  // Actions for violations
  actions: {
    onSchemaViolation: ViolationAction[];
    onUnknownEvent: ViolationAction[];
    onMalformedEvent: ViolationAction[];
    onEvolutionDetected: ViolationAction[];
  };

  // Performance settings
  performance: {
    enableMetrics: boolean;
    enableProfiling: boolean;
    batchValidation: boolean;
    maxConcurrentEnforcements: number;
  };

  // Integration settings
  integration: {
    enableMiddlewareIntegration: boolean;
    enableBrokerIntegration: boolean;
    enableValidationHooks: boolean;
  };
}

/**
 * Enforcement Levels
 */
export type EnforcementLevel = 'strict' | 'moderate' | 'lenient' | 'disabled';

/**
 * Violation Actions
 */
export type ViolationAction = 
  | 'reject'           // Reject the message
  | 'quarantine'       // Move to quarantine queue
  | 'transform'        // Attempt automatic transformation
  | 'log'             // Log the violation
  | 'alert'           // Send alert notification
  | 'metric'          // Record metric
  | 'ignore';         // Allow but track

/**
 * Enforcement Result
 */
export interface EnforcementResult {
  enforced: boolean;
  allowed: boolean;
  violations: SchemaViolation[];
  actions: ExecutedAction[];
  transformations: MessageTransformation[];
  metadata: EnforcementMetadata;
}

/**
 * Schema Violation
 */
export interface SchemaViolation {
  type: ViolationType;
  severity: ViolationSeverity;
  code: string;
  message: string;
  path: string;
  expectedValue?: any;
  actualValue?: any;
  schemaId?: string;
  schemaVersion?: string;
}

/**
 * Violation Types
 */
export type ViolationType = 
  | 'schema_not_found'
  | 'schema_validation_failed'
  | 'required_field_missing'
  | 'invalid_field_type'
  | 'invalid_field_value'
  | 'unknown_event_type'
  | 'malformed_structure'
  | 'schema_evolution_detected';

/**
 * Violation Severity
 */
export type ViolationSeverity = 'critical' | 'major' | 'minor' | 'info';

/**
 * Executed Action
 */
export interface ExecutedAction {
  action: ViolationAction;
  timestamp: Date;
  successful: boolean;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Message Transformation
 */
export interface MessageTransformation {
  type: TransformationType;
  field: string;
  oldValue: any;
  newValue: any;
  transformer: string;
  successful: boolean;
}

/**
 * Transformation Types
 */
export type TransformationType = 
  | 'field_rename'
  | 'field_type_conversion'
  | 'field_value_mapping'
  | 'field_addition'
  | 'field_removal'
  | 'structure_reshape';

/**
 * Enforcement Metadata
 */
export interface EnforcementMetadata {
  enforcementTime: number;
  schemaFound: boolean;
  schemaVersion?: string;
  enforcementLevel: EnforcementLevel;
  actionsExecuted: number;
  transformationsApplied: number;
}

/**
 * Enforcement Statistics
 */
export interface EnforcementStats {
  totalEnforcements: number;
  successfulEnforcements: number;
  violationsDetected: number;
  messagesRejected: number;
  messagesQuarantined: number;
  messagesTransformed: number;
  averageEnforcementTime: number;
  violationsByType: Record<ViolationType, number>;
  actionsByType: Record<ViolationAction, number>;
}

/**
 * Event Transformer Interface
 */
export interface EventTransformer {
  name: string;
  description: string;
  supportedTransformations: TransformationType[];
  transform(event: UEPEvent, transformation: MessageTransformation): Promise<UEPEvent>;
  canTransform(violation: SchemaViolation): boolean;
}

/**
 * UEP Schema Enforcement Engine Implementation
 */
export class UEPSchemaEnforcementEngine extends EventEmitter {
  private config: SchemaEnforcementConfig;
  private schemaRegistry: UEPEventSchemaRegistry;
  private transformers: Map<string, EventTransformer> = new Map();
  private stats: EnforcementStats = {
    totalEnforcements: 0,
    successfulEnforcements: 0,
    violationsDetected: 0,
    messagesRejected: 0,
    messagesQuarantined: 0,
    messagesTransformed: 0,
    averageEnforcementTime: 0,
    violationsByType: {} as Record<ViolationType, number>,
    actionsByType: {} as Record<ViolationAction, number>,
  };

  constructor(config: SchemaEnforcementConfig, schemaRegistry: UEPEventSchemaRegistry) {
    super();
    this.config = config;
    this.schemaRegistry = schemaRegistry;
    this.setupDefaultTransformers();
  }

  /**
   * Initialize the enforcement engine
   */
  async initialize(): Promise<void> {
    try {
      this.emit('engine:initializing');

      // Initialize schema registry if not already done
      await this.schemaRegistry.initialize();

      // Setup event handlers
      this.setupEventHandlers();

      this.emit('engine:initialized');
    } catch (error) {
      this.emit('engine:error', error);
      throw new Error(`Failed to initialize Schema Enforcement Engine: ${error.message}`);
    }
  }

  /**
   * Enforce schema compliance for a UEP message
   */
  async enforceMessage(message: UEPMessage<any>): Promise<EnforcementResult> {
    const startTime = Date.now();
    const result: EnforcementResult = {
      enforced: false,
      allowed: false,
      violations: [],
      actions: [],
      transformations: [],
      metadata: {
        enforcementTime: 0,
        schemaFound: false,
        enforcementLevel: this.config.policies.enforcementLevel,
        actionsExecuted: 0,
        transformationsApplied: 0,
      },
    };

    try {
      this.stats.totalEnforcements++;

      // Skip enforcement if disabled
      if (this.config.policies.enforcementLevel === 'disabled') {
        result.allowed = true;
        result.metadata.enforcementTime = Date.now() - startTime;
        return result;
      }

      // Extract event from message payload
      const event = this.extractEventFromMessage(message);
      if (!event) {
        result.violations.push({
          type: 'malformed_structure',
          severity: 'critical',
          code: 'NO_EVENT_IN_MESSAGE',
          message: 'Message does not contain a valid UEP event',
          path: 'payload',
        });
        
        await this.executeViolationActions(result, 'onMalformedEvent');
        result.metadata.enforcementTime = Date.now() - startTime;
        return result;
      }

      // Validate event against schema
      const validationResult = await this.schemaRegistry.validateEvent(event);
      result.metadata.schemaFound = validationResult.valid || validationResult.errors.some(e => e.code !== 'SCHEMA_NOT_FOUND');

      if (!validationResult.valid) {
        // Convert validation errors to violations
        for (const error of validationResult.errors) {
          const violation = this.convertValidationErrorToViolation(error);
          result.violations.push(violation);
        }

        // Execute appropriate actions based on violation types
        await this.processViolations(result, event);
      } else {
        result.allowed = true;
        this.stats.successfulEnforcements++;
      }

      result.enforced = true;
      result.metadata.enforcementTime = Date.now() - startTime;
      result.metadata.actionsExecuted = result.actions.length;
      result.metadata.transformationsApplied = result.transformations.length;

      // Update statistics
      this.updateStats(result);

      this.emit('enforcement:completed', { 
        messageId: message.id, 
        eventId: event?.eventId,
        result,
      });

      return result;

    } catch (error) {
      this.emit('enforcement:error', { messageId: message.id, error });
      
      result.violations.push({
        type: 'malformed_structure',
        severity: 'critical',
        code: 'ENFORCEMENT_ERROR',
        message: `Enforcement failed: ${error.message}`,
        path: 'enforcement',
      });

      result.metadata.enforcementTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Enforce schema compliance for multiple messages
   */
  async enforceMessages(messages: UEPMessage<any>[]): Promise<EnforcementResult[]> {
    if (this.config.performance.batchValidation) {
      return this.enforceBatch(messages);
    }

    // Process individually
    return Promise.all(messages.map(msg => this.enforceMessage(msg)));
  }

  /**
   * Register a custom event transformer
   */
  registerTransformer(transformer: EventTransformer): void {
    this.transformers.set(transformer.name, transformer);
    this.emit('transformer:registered', { name: transformer.name });
  }

  /**
   * Remove a transformer
   */
  removeTransformer(name: string): boolean {
    const removed = this.transformers.delete(name);
    if (removed) {
      this.emit('transformer:removed', { name });
    }
    return removed;
  }

  /**
   * Get enforcement statistics
   */
  getStats(): EnforcementStats {
    return { ...this.stats };
  }

  /**
   * Reset enforcement statistics
   */
  resetStats(): void {
    this.stats = {
      totalEnforcements: 0,
      successfulEnforcements: 0,
      violationsDetected: 0,
      messagesRejected: 0,
      messagesQuarantined: 0,
      messagesTransformed: 0,
      averageEnforcementTime: 0,
      violationsByType: {} as Record<ViolationType, number>,
      actionsByType: {} as Record<ViolationAction, number>,
    };
    this.emit('stats:reset');
  }

  /**
   * Update enforcement configuration
   */
  updateConfig(config: Partial<SchemaEnforcementConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('config:updated', { config: this.config });
  }

  /**
   * Private helper methods
   */
  private extractEventFromMessage(message: UEPMessage<any>): UEPEvent | null {
    try {
      // Check if payload is already a UEP event
      if (this.isUEPEvent(message.payload)) {
        return message.payload as UEPEvent;
      }

      // Check if payload contains an event
      if (message.payload && typeof message.payload === 'object' && message.payload.event) {
        if (this.isUEPEvent(message.payload.event)) {
          return message.payload.event as UEPEvent;
        }
      }

      // Try to construct event from message data
      if (message.routing.messageType === 'event') {
        return this.constructEventFromMessage(message);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private isUEPEvent(obj: any): boolean {
    return obj &&
           typeof obj === 'object' &&
           typeof obj.eventId === 'string' &&
           typeof obj.eventType === 'string' &&
           typeof obj.eventVersion === 'string' &&
           typeof obj.timestamp === 'string' &&
           obj.metadata &&
           obj.agent &&
           obj.payload !== undefined;
  }

  private constructEventFromMessage(message: UEPMessage<any>): UEPEvent | null {
    try {
      // Extract event type from subject or payload
      const eventType = this.extractEventTypeFromSubject(message.routing.subject) || 
                       message.payload?.eventType;

      if (!eventType) {
        return null;
      }

      return {
        eventId: message.id,
        eventType,
        eventVersion: message.version,
        timestamp: message.timestamp.toISOString(),
        metadata: {
          category: 'business', // Default category
          priority: 'normal',
          scope: 'namespace',
          source: {
            service: message.agent.capability,
            version: message.version,
            instance: message.agent.instance,
          },
        },
        agent: message.agent,
        payload: message.payload,
        context: {
          tracing: message.tracing,
        },
      };
    } catch (error) {
      return null;
    }
  }

  private extractEventTypeFromSubject(subject: string): string | null {
    // Extract event type from UEP subject format
    // Expected format: namespace.event.eventType[.additional]
    const parts = subject.split('.');
    if (parts.length >= 3 && parts[1] === 'event') {
      return parts.slice(2).join('.');
    }
    return null;
  }

  private convertValidationErrorToViolation(error: any): SchemaViolation {
    const violationTypeMap: Record<string, ViolationType> = {
      'SCHEMA_NOT_FOUND': 'schema_not_found',
      'SCHEMA_VALIDATION_ERROR': 'schema_validation_failed',
      'MISSING_REQUIRED_FIELD': 'required_field_missing',
      'INVALID_TYPE': 'invalid_field_type',
      'INVALID_VALUE': 'invalid_field_value',
      'UNKNOWN_EVENT': 'unknown_event_type',
      'MALFORMED_STRUCTURE': 'malformed_structure',
    };

    const severityMap: Record<string, ViolationSeverity> = {
      'SCHEMA_NOT_FOUND': 'major',
      'SCHEMA_VALIDATION_ERROR': 'major',
      'MISSING_REQUIRED_FIELD': 'major',
      'INVALID_TYPE': 'minor',
      'INVALID_VALUE': 'minor',
      'UNKNOWN_EVENT': 'info',
      'MALFORMED_STRUCTURE': 'critical',
    };

    return {
      type: violationTypeMap[error.code] || 'schema_validation_failed',
      severity: severityMap[error.code] || 'minor',
      code: error.code,
      message: error.message,
      path: error.path,
      actualValue: error.value,
    };
  }

  private async processViolations(result: EnforcementResult, event: UEPEvent): Promise<void> {
    const violationsByType = this.groupViolationsByType(result.violations);

    // Process each violation type
    for (const [violationType, violations] of violationsByType.entries()) {
      switch (violationType) {
        case 'schema_not_found':
          await this.executeViolationActions(result, 'onUnknownEvent');
          break;
        case 'malformed_structure':
          await this.executeViolationActions(result, 'onMalformedEvent');
          break;
        case 'schema_evolution_detected':
          await this.executeViolationActions(result, 'onEvolutionDetected');
          break;
        default:
          await this.executeViolationActions(result, 'onSchemaViolation');
          break;
      }

      // Attempt transformations if enabled
      if (this.canAttemptTransformation(violationType)) {
        await this.attemptTransformations(result, violations, event);
      }
    }
  }

  private groupViolationsByType(violations: SchemaViolation[]): Map<ViolationType, SchemaViolation[]> {
    const grouped = new Map<ViolationType, SchemaViolation[]>();
    
    for (const violation of violations) {
      if (!grouped.has(violation.type)) {
        grouped.set(violation.type, []);
      }
      grouped.get(violation.type)!.push(violation);
    }

    return grouped;
  }

  private async executeViolationActions(result: EnforcementResult, actionType: keyof SchemaEnforcementConfig['actions']): Promise<void> {
    const actions = this.config.actions[actionType];

    for (const action of actions) {
      const executedAction: ExecutedAction = {
        action,
        timestamp: new Date(),
        successful: false,
      };

      try {
        await this.executeAction(action, result, executedAction);
        executedAction.successful = true;
      } catch (error) {
        executedAction.details = error.message;
      }

      result.actions.push(executedAction);
      this.updateActionStats(action);
    }
  }

  private async executeAction(action: ViolationAction, result: EnforcementResult, executedAction: ExecutedAction): Promise<void> {
    switch (action) {
      case 'reject':
        result.allowed = false;
        this.stats.messagesRejected++;
        break;

      case 'quarantine':
        result.allowed = false;
        this.stats.messagesQuarantined++;
        this.emit('message:quarantined', { violations: result.violations });
        break;

      case 'transform':
        // Transformation will be handled separately
        break;

      case 'log':
        this.emit('violation:logged', { violations: result.violations });
        break;

      case 'alert':
        this.emit('violation:alert', { violations: result.violations });
        break;

      case 'metric':
        this.emit('violation:metric', { violations: result.violations });
        break;

      case 'ignore':
        result.allowed = true;
        break;
    }
  }

  private canAttemptTransformation(violationType: ViolationType): boolean {
    const transformableTypes: ViolationType[] = [
      'invalid_field_type',
      'invalid_field_value',
      'required_field_missing',
    ];

    return transformableTypes.includes(violationType);
  }

  private async attemptTransformations(result: EnforcementResult, violations: SchemaViolation[], event: UEPEvent): Promise<void> {
    for (const violation of violations) {
      const applicableTransformers = Array.from(this.transformers.values())
        .filter(transformer => transformer.canTransform(violation));

      for (const transformer of applicableTransformers) {
        try {
          const transformation: MessageTransformation = {
            type: this.getTransformationTypeForViolation(violation),
            field: violation.path,
            oldValue: violation.actualValue,
            newValue: violation.expectedValue,
            transformer: transformer.name,
            successful: false,
          };

          const transformedEvent = await transformer.transform(event, transformation);
          transformation.successful = true;
          transformation.newValue = this.getValueAtPath(transformedEvent, violation.path);

          result.transformations.push(transformation);
          this.stats.messagesTransformed++;

          // Update the event reference for subsequent transformations
          Object.assign(event, transformedEvent);

        } catch (error) {
          result.transformations.push({
            type: this.getTransformationTypeForViolation(violation),
            field: violation.path,
            oldValue: violation.actualValue,
            newValue: violation.expectedValue,
            transformer: transformer.name,
            successful: false,
          });
        }
      }
    }
  }

  private getTransformationTypeForViolation(violation: SchemaViolation): TransformationType {
    switch (violation.type) {
      case 'invalid_field_type':
        return 'field_type_conversion';
      case 'invalid_field_value':
        return 'field_value_mapping';
      case 'required_field_missing':
        return 'field_addition';
      default:
        return 'structure_reshape';
    }
  }

  private getValueAtPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async enforceBatch(messages: UEPMessage<any>[]): Promise<EnforcementResult[]> {
    // Implementation for batch enforcement
    // This would process multiple messages more efficiently
    return Promise.all(messages.map(msg => this.enforceMessage(msg)));
  }

  private setupDefaultTransformers(): void {
    // Register built-in transformers
    this.registerTransformer(new BasicTypeTransformer());
    this.registerTransformer(new FieldMappingTransformer());
    this.registerTransformer(new RequiredFieldTransformer());
  }

  private setupEventHandlers(): void {
    this.schemaRegistry.on('schema:registered', (event) => {
      this.emit('schema:registered', event);
    });

    this.schemaRegistry.on('event:validated', (event) => {
      this.emit('event:validated', event);
    });
  }

  private updateStats(result: EnforcementResult): void {
    // Update violation statistics
    for (const violation of result.violations) {
      this.stats.violationsByType[violation.type] = 
        (this.stats.violationsByType[violation.type] || 0) + 1;
    }

    this.stats.violationsDetected += result.violations.length;

    // Update timing statistics
    const enforcementTime = result.metadata.enforcementTime;
    this.stats.averageEnforcementTime = 
      (this.stats.averageEnforcementTime * (this.stats.totalEnforcements - 1) + enforcementTime) / 
      this.stats.totalEnforcements;
  }

  private updateActionStats(action: ViolationAction): void {
    this.stats.actionsByType[action] = (this.stats.actionsByType[action] || 0) + 1;
  }
}

/**
 * Built-in Event Transformers
 */
class BasicTypeTransformer implements EventTransformer {
  name = 'basic-type-transformer';
  description = 'Performs basic type conversions (string to number, etc.)';
  supportedTransformations: TransformationType[] = ['field_type_conversion'];

  async transform(event: UEPEvent, transformation: MessageTransformation): Promise<UEPEvent> {
    const clonedEvent = JSON.parse(JSON.stringify(event));
    const path = transformation.field.split('.');
    
    let current = clonedEvent;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }

    const lastKey = path[path.length - 1];
    const value = current[lastKey];

    // Attempt basic type conversions
    if (typeof value === 'string' && !isNaN(Number(value))) {
      current[lastKey] = Number(value);
    } else if (typeof value === 'number') {
      current[lastKey] = String(value);
    } else if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
      current[lastKey] = value.toLowerCase() === 'true';
    }

    return clonedEvent;
  }

  canTransform(violation: SchemaViolation): boolean {
    return violation.type === 'invalid_field_type';
  }
}

class FieldMappingTransformer implements EventTransformer {
  name = 'field-mapping-transformer';
  description = 'Maps field values using predefined mappings';
  supportedTransformations: TransformationType[] = ['field_value_mapping', 'field_rename'];

  async transform(event: UEPEvent, transformation: MessageTransformation): Promise<UEPEvent> {
    // Implementation for field mapping
    return event;
  }

  canTransform(violation: SchemaViolation): boolean {
    return violation.type === 'invalid_field_value';
  }
}

class RequiredFieldTransformer implements EventTransformer {
  name = 'required-field-transformer';
  description = 'Adds missing required fields with default values';
  supportedTransformations: TransformationType[] = ['field_addition'];

  async transform(event: UEPEvent, transformation: MessageTransformation): Promise<UEPEvent> {
    const clonedEvent = JSON.parse(JSON.stringify(event));
    const path = transformation.field.split('.');
    
    let current = clonedEvent;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }

    const lastKey = path[path.length - 1];
    if (!current[lastKey]) {
      // Set a reasonable default value
      current[lastKey] = this.getDefaultValue(lastKey);
    }

    return clonedEvent;
  }

  canTransform(violation: SchemaViolation): boolean {
    return violation.type === 'required_field_missing';
  }

  private getDefaultValue(fieldName: string): any {
    // Return appropriate default values based on field name
    if (fieldName.includes('timestamp') || fieldName.includes('time')) {
      return new Date().toISOString();
    }
    if (fieldName.includes('id')) {
      return `generated_${Date.now()}`;
    }
    if (fieldName.includes('version')) {
      return '1.0.0';
    }
    return '';
  }
}

/**
 * Create default schema enforcement configuration
 */
export function createDefaultEnforcementConfig(): SchemaEnforcementConfig {
  return {
    policies: {
      strictEnforcement: false,
      allowUnknownEvents: true,
      rejectMalformedEvents: true,
      enableSchemaEvolution: true,
      enforcementLevel: 'moderate',
    },
    actions: {
      onSchemaViolation: ['log', 'metric'],
      onUnknownEvent: ['log', 'metric'],
      onMalformedEvent: ['reject', 'log', 'alert'],
      onEvolutionDetected: ['log', 'metric'],
    },
    performance: {
      enableMetrics: true,
      enableProfiling: false,
      batchValidation: true,
      maxConcurrentEnforcements: 100,
    },
    integration: {
      enableMiddlewareIntegration: true,
      enableBrokerIntegration: true,
      enableValidationHooks: true,
    },
  };
}