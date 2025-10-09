/**
 * UEP Validation Middleware
 * 
 * This module provides middleware integration for the UEP Message Validator,
 * allowing seamless validation of messages as they flow through the message broker.
 * 
 * Features:
 * - Pre-processing validation hooks
 * - Post-processing validation hooks
 * - Configurable validation policies
 * - Performance monitoring and metrics
 * - Error handling and recovery strategies
 */

import { EventEmitter } from 'events';
import { UEPMessage } from './UEPMessageBroker';
import { UEPMessageValidator, ValidationResult, UEPMessageValidatorConfig } from './UEPMessageValidator';

/**
 * Validation Middleware Configuration
 */
export interface ValidationMiddlewareConfig {
  // Validation timing
  timing: {
    enablePreProcessing: boolean;
    enablePostProcessing: boolean;
    timeoutMs: number;
    asyncValidation: boolean;
  };

  // Policy configuration
  policies: {
    failFast: boolean;
    continueOnWarnings: boolean;
    rejectInvalidMessages: boolean;
    quarantineMode: boolean;
    maxRetries: number;
  };

  // Performance settings
  performance: {
    enableMetrics: boolean;
    enableProfiling: boolean;
    sampleRate: number;
    maxConcurrentValidations: number;
  };

  // Error handling
  errorHandling: {
    enableErrorRecovery: boolean;
    fallbackValidation: boolean;
    notifyOnValidationFailure: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
}

/**
 * Validation Context
 */
export interface ValidationContext {
  messageId: string;
  timestamp: Date;
  source: string;
  attempt: number;
  metadata?: Record<string, any>;
}

/**
 * Validation Policy
 */
export interface ValidationPolicy {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  conditions: ValidationCondition[];
  actions: ValidationAction[];
}

/**
 * Validation Condition
 */
export interface ValidationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'exists' | 'gt' | 'lt';
  value: any;
  negate?: boolean;
}

/**
 * Validation Action
 */
export interface ValidationAction {
  type: 'reject' | 'quarantine' | 'transform' | 'notify' | 'log';
  parameters?: Record<string, any>;
}

/**
 * Middleware Statistics
 */
export interface MiddlewareStats {
  totalProcessed: number;
  validMessages: number;
  invalidMessages: number;
  quarantinedMessages: number;
  averageValidationTime: number;
  peakValidationTime: number;
  errorRate: number;
  throughputPerSecond: number;
}

/**
 * UEP Validation Middleware Implementation
 */
export class UEPValidationMiddleware extends EventEmitter {
  private config: ValidationMiddlewareConfig;
  private validator: UEPMessageValidator;
  private policies: ValidationPolicy[] = [];
  private activeValidations = new Map<string, Promise<ValidationResult>>();
  private stats: MiddlewareStats = {
    totalProcessed: 0,
    validMessages: 0,
    invalidMessages: 0,
    quarantinedMessages: 0,
    averageValidationTime: 0,
    peakValidationTime: 0,
    errorRate: 0,
    throughputPerSecond: 0,
  };
  private lastStatsUpdate = Date.now();

  constructor(
    config: ValidationMiddlewareConfig,
    validatorConfig: UEPMessageValidatorConfig
  ) {
    super();
    this.config = config;
    this.validator = new UEPMessageValidator(validatorConfig);
    this.setupDefaultPolicies();
  }

  /**
   * Initialize the middleware
   */
  async initialize(): Promise<void> {
    try {
      this.emit('middleware:initializing');
      
      await this.validator.initialize();
      this.setupEventHandlers();
      
      if (this.config.performance.enableMetrics) {
        this.startMetricsCollection();
      }

      this.emit('middleware:initialized');
    } catch (error) {
      this.emit('middleware:error', error);
      throw new Error(`Failed to initialize validation middleware: ${error.message}`);
    }
  }

  /**
   * Pre-processing validation hook
   */
  async validateBeforeProcessing<T>(
    message: UEPMessage<T>,
    context: ValidationContext
  ): Promise<ValidationResult> {
    if (!this.config.timing.enablePreProcessing) {
      return { valid: true, errors: [], warnings: [] };
    }

    return this.performValidation(message, context, 'pre-processing');
  }

  /**
   * Post-processing validation hook
   */
  async validateAfterProcessing<T>(
    message: UEPMessage<T>,
    context: ValidationContext
  ): Promise<ValidationResult> {
    if (!this.config.timing.enablePostProcessing) {
      return { valid: true, errors: [], warnings: [] };
    }

    return this.performValidation(message, context, 'post-processing');
  }

  /**
   * Batch validation for multiple messages
   */
  async validateBatch<T>(
    messages: { message: UEPMessage<T>; context: ValidationContext }[]
  ): Promise<ValidationResult[]> {
    const startTime = Date.now();

    try {
      // Check concurrent validation limit
      if (this.activeValidations.size >= this.config.performance.maxConcurrentValidations) {
        throw new Error('Maximum concurrent validations exceeded');
      }

      // Extract messages for batch validation
      const messageList = messages.map(item => item.message);
      
      // Perform batch validation
      const results = await this.validator.validateMessages(messageList);

      // Apply policies to each result
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const context = messages[i].context;
        
        await this.applyPolicies(messages[i].message, result, context);
      }

      // Update statistics
      this.updateBatchStats(results, Date.now() - startTime);

      this.emit('batch:validated', { count: messages.length, results });
      return results;

    } catch (error) {
      this.emit('batch:error', { error, messageCount: messages.length });
      throw error;
    }
  }

  /**
   * Add validation policy
   */
  addPolicy(policy: ValidationPolicy): void {
    // Insert policy in priority order
    const insertIndex = this.policies.findIndex(p => p.priority > policy.priority);
    if (insertIndex === -1) {
      this.policies.push(policy);
    } else {
      this.policies.splice(insertIndex, 0, policy);
    }

    this.emit('policy:added', { name: policy.name, priority: policy.priority });
  }

  /**
   * Remove validation policy
   */
  removePolicy(name: string): boolean {
    const index = this.policies.findIndex(p => p.name === name);
    if (index !== -1) {
      this.policies.splice(index, 1);
      this.emit('policy:removed', { name });
      return true;
    }
    return false;
  }

  /**
   * Enable/disable validation policy
   */
  togglePolicy(name: string, enabled: boolean): boolean {
    const policy = this.policies.find(p => p.name === name);
    if (policy) {
      policy.enabled = enabled;
      this.emit('policy:toggled', { name, enabled });
      return true;
    }
    return false;
  }

  /**
   * Get middleware statistics
   */
  getStats(): MiddlewareStats {
    this.updateThroughputStats();
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalProcessed: 0,
      validMessages: 0,
      invalidMessages: 0,
      quarantinedMessages: 0,
      averageValidationTime: 0,
      peakValidationTime: 0,
      errorRate: 0,
      throughputPerSecond: 0,
    };
    this.lastStatsUpdate = Date.now();
    this.emit('stats:reset');
  }

  /**
   * Private helper methods
   */
  private async performValidation<T>(
    message: UEPMessage<T>,
    context: ValidationContext,
    phase: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const validationId = `${context.messageId}-${phase}`;

    try {
      // Check if validation is already in progress
      if (this.activeValidations.has(validationId)) {
        return await this.activeValidations.get(validationId)!;
      }

      // Create validation promise
      const validationPromise = this.executeValidation(message, context);
      this.activeValidations.set(validationId, validationPromise);

      // Wait for validation with timeout
      const result = await Promise.race([
        validationPromise,
        this.createTimeoutPromise(validationId),
      ]);

      // Apply validation policies
      await this.applyPolicies(message, result, context);

      // Update statistics
      this.updateStats(result, Date.now() - startTime);

      this.emit('validation:completed', { 
        messageId: context.messageId, 
        phase, 
        result,
        duration: Date.now() - startTime,
      });

      return result;

    } catch (error) {
      this.emit('validation:error', { 
        messageId: context.messageId, 
        phase, 
        error,
        duration: Date.now() - startTime,
      });
      
      if (this.config.errorHandling.enableErrorRecovery) {
        return this.handleValidationError(message, context, error);
      }
      
      throw error;
    } finally {
      this.activeValidations.delete(validationId);
    }
  }

  private async executeValidation<T>(
    message: UEPMessage<T>,
    context: ValidationContext
  ): Promise<ValidationResult> {
    if (this.config.timing.asyncValidation) {
      return new Promise((resolve, reject) => {
        setImmediate(async () => {
          try {
            const result = await this.validator.validateMessage(message);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    } else {
      return await this.validator.validateMessage(message);
    }
  }

  private createTimeoutPromise(validationId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Validation timeout for ${validationId}`));
      }, this.config.timing.timeoutMs);
    });
  }

  private async applyPolicies<T>(
    message: UEPMessage<T>,
    result: ValidationResult,
    context: ValidationContext
  ): Promise<void> {
    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      // Check if policy conditions are met
      if (await this.evaluatePolicy(policy, message, result, context)) {
        // Execute policy actions
        await this.executePolicyActions(policy, message, result, context);

        // Stop processing if this is a blocking policy
        if (policy.actions.some(action => action.type === 'reject')) {
          break;
        }
      }
    }
  }

  private async evaluatePolicy<T>(
    policy: ValidationPolicy,
    message: UEPMessage<T>,
    result: ValidationResult,
    context: ValidationContext
  ): Promise<boolean> {
    for (const condition of policy.conditions) {
      if (!this.evaluateCondition(condition, message, result, context)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition<T>(
    condition: ValidationCondition,
    message: UEPMessage<T>,
    result: ValidationResult,
    context: ValidationContext
  ): boolean {
    let value: any;

    // Get the field value
    if (condition.field.startsWith('message.')) {
      const path = condition.field.substring(8);
      value = this.getNestedValue(message, path);
    } else if (condition.field.startsWith('result.')) {
      const path = condition.field.substring(7);
      value = this.getNestedValue(result, path);
    } else if (condition.field.startsWith('context.')) {
      const path = condition.field.substring(8);
      value = this.getNestedValue(context, path);
    } else {
      return false;
    }

    // Evaluate condition
    let matches = false;
    switch (condition.operator) {
      case 'equals':
        matches = value === condition.value;
        break;
      case 'contains':
        matches = String(value).includes(String(condition.value));
        break;
      case 'matches':
        matches = new RegExp(condition.value).test(String(value));
        break;
      case 'exists':
        matches = value !== undefined && value !== null;
        break;
      case 'gt':
        matches = Number(value) > Number(condition.value);
        break;
      case 'lt':
        matches = Number(value) < Number(condition.value);
        break;
    }

    return condition.negate ? !matches : matches;
  }

  private async executePolicyActions<T>(
    policy: ValidationPolicy,
    message: UEPMessage<T>,
    result: ValidationResult,
    context: ValidationContext
  ): Promise<void> {
    for (const action of policy.actions) {
      try {
        await this.executeAction(action, message, result, context);
        
        this.emit('policy:action-executed', {
          policy: policy.name,
          action: action.type,
          messageId: context.messageId,
        });
      } catch (error) {
        this.emit('policy:action-error', {
          policy: policy.name,
          action: action.type,
          messageId: context.messageId,
          error,
        });
      }
    }
  }

  private async executeAction<T>(
    action: ValidationAction,
    message: UEPMessage<T>,
    result: ValidationResult,
    context: ValidationContext
  ): Promise<void> {
    switch (action.type) {
      case 'reject':
        result.valid = false;
        if (this.config.policies.rejectInvalidMessages) {
          throw new Error(`Message rejected by policy: ${action.parameters?.reason || 'validation failed'}`);
        }
        break;

      case 'quarantine':
        this.stats.quarantinedMessages++;
        this.emit('message:quarantined', { message, result, context });
        break;

      case 'transform':
        // Apply transformation logic
        if (action.parameters?.transformer) {
          await this.applyTransformation(message, action.parameters.transformer);
        }
        break;

      case 'notify':
        this.emit('validation:notification', {
          type: action.parameters?.notificationType || 'warning',
          message: action.parameters?.message || 'Validation notification',
          context,
          result,
        });
        break;

      case 'log':
        const logLevel = action.parameters?.level || this.config.errorHandling.logLevel;
        this.logValidationEvent(logLevel, action.parameters?.message || 'Policy action executed', {
          message,
          result,
          context,
        });
        break;
    }
  }

  private async applyTransformation<T>(message: UEPMessage<T>, transformer: any): Promise<void> {
    // Transformation logic would go here
    // This is a placeholder for custom transformation implementations
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async handleValidationError<T>(
    message: UEPMessage<T>,
    context: ValidationContext,
    error: Error
  ): Promise<ValidationResult> {
    if (this.config.errorHandling.fallbackValidation) {
      // Implement fallback validation logic
      return {
        valid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${error.message}`,
          path: 'validation',
          severity: 'error',
        }],
        warnings: [],
      };
    }

    throw error;
  }

  private setupDefaultPolicies(): void {
    // High Priority Policies
    this.addPolicy({
      name: 'reject-invalid-protocol',
      description: 'Reject messages with invalid protocol information',
      priority: 1,
      enabled: true,
      conditions: [
        { field: 'result.valid', operator: 'equals', value: false },
        { field: 'result.errors', operator: 'contains', value: 'INVALID_PROTOCOL' },
      ],
      actions: [
        { type: 'reject', parameters: { reason: 'Invalid protocol information' } },
        { type: 'log', parameters: { level: 'error', message: 'Message rejected due to invalid protocol' } },
      ],
    });

    // Medium Priority Policies
    this.addPolicy({
      name: 'quarantine-oversized',
      description: 'Quarantine messages that exceed size limits',
      priority: 5,
      enabled: true,
      conditions: [
        { field: 'result.errors', operator: 'contains', value: 'PAYLOAD_TOO_LARGE' },
      ],
      actions: [
        { type: 'quarantine', parameters: { reason: 'Message size exceeds limits' } },
        { type: 'notify', parameters: { notificationType: 'warning', message: 'Large message quarantined' } },
      ],
    });

    // Low Priority Policies
    this.addPolicy({
      name: 'log-warnings',
      description: 'Log validation warnings',
      priority: 10,
      enabled: true,
      conditions: [
        { field: 'result.warnings', operator: 'exists', value: true },
      ],
      actions: [
        { type: 'log', parameters: { level: 'warn', message: 'Validation warnings detected' } },
      ],
    });
  }

  private setupEventHandlers(): void {
    this.validator.on('message:validated', (event) => {
      this.emit('validator:message-validated', event);
    });

    this.validator.on('validation:error', (event) => {
      this.emit('validator:error', event);
    });
  }

  private startMetricsCollection(): void {
    // Periodically update throughput statistics
    setInterval(() => {
      this.updateThroughputStats();
    }, 5000); // Update every 5 seconds
  }

  private updateStats(result: ValidationResult, validationTime: number): void {
    this.stats.totalProcessed++;
    
    if (result.valid) {
      this.stats.validMessages++;
    } else {
      this.stats.invalidMessages++;
    }

    // Update timing statistics
    this.stats.averageValidationTime = 
      (this.stats.averageValidationTime * (this.stats.totalProcessed - 1) + validationTime) / 
      this.stats.totalProcessed;

    if (validationTime > this.stats.peakValidationTime) {
      this.stats.peakValidationTime = validationTime;
    }

    // Update error rate
    this.stats.errorRate = this.stats.invalidMessages / this.stats.totalProcessed;
  }

  private updateBatchStats(results: ValidationResult[], totalTime: number): void {
    for (const result of results) {
      this.updateStats(result, totalTime / results.length);
    }
  }

  private updateThroughputStats(): void {
    const now = Date.now();
    const timeDiff = (now - this.lastStatsUpdate) / 1000; // Convert to seconds
    
    this.stats.throughputPerSecond = this.stats.totalProcessed / timeDiff;
    this.lastStatsUpdate = now;
  }

  private logValidationEvent(level: string, message: string, data: any): void {
    if (this.config.errorHandling.logLevel !== 'debug' && level === 'debug') {
      return;
    }

    this.emit('validation:log', { level, message, data, timestamp: new Date() });
  }
}

/**
 * Create default middleware configuration
 */
export function createDefaultMiddlewareConfig(): ValidationMiddlewareConfig {
  return {
    timing: {
      enablePreProcessing: true,
      enablePostProcessing: false,
      timeoutMs: 5000,
      asyncValidation: false,
    },
    policies: {
      failFast: false,
      continueOnWarnings: true,
      rejectInvalidMessages: true,
      quarantineMode: false,
      maxRetries: 3,
    },
    performance: {
      enableMetrics: true,
      enableProfiling: false,
      sampleRate: 1.0,
      maxConcurrentValidations: 100,
    },
    errorHandling: {
      enableErrorRecovery: true,
      fallbackValidation: true,
      notifyOnValidationFailure: true,
      logLevel: 'warn',
    },
  };
}