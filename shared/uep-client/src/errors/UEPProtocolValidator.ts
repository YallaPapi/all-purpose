/**
 * UEP Protocol Compliance Validator
 * 
 * Comprehensive validation system for UEP protocol compliance,
 * detecting and classifying protocol violations for proper error handling.
 * 
 * Features:
 * - Message format validation
 * - Protocol version compatibility checking
 * - Schema compliance verification
 * - Routing validation
 * - Agent capability validation
 * - Tracing context validation
 * - Performance and security compliance
 */

import {
  UEPError,
  UEPErrorType,
  UEPErrorFactory,
  UEPValidationError
} from './UEPErrors.js';
import {
  UEPMessage,
  UEPRequest,
  UEPResponse,
  UEPEvent,
  UEPProtocolInfo,
  UEPRouting,
  UEPAgentInfo,
  UEPTracingContext
} from '../core/UEPTypes.js';

/**
 * Validation Rule Configuration
 */
export interface ValidationRuleConfig {
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  description: string;
  remediation?: string;
}

/**
 * Protocol Validation Configuration
 */
export interface UEPProtocolValidatorConfig {
  strictMode?: boolean;
  enablePerformanceValidation?: boolean;
  enableSecurityValidation?: boolean;
  maxMessageSize?: number;
  allowedVersions?: string[];
  requiredFields?: string[];
  customRules?: Map<string, ValidationRuleConfig>;
}

/**
 * Validation Context
 */
export interface ValidationContext {
  messageType: 'request' | 'response' | 'event';
  agentId?: string;
  capability?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Validation Result
 */
export interface ProtocolValidationResult {
  valid: boolean;
  errors: UEPError[];
  warnings: UEPError[];
  info: UEPError[];
  context: ValidationContext;
  metrics: {
    validationDuration: number;
    rulesExecuted: number;
    violationsFound: number;
  };
}

/**
 * Validation Rule Function
 */
export type ValidationRule = (
  message: UEPMessage<any>,
  context: ValidationContext
) => Promise<UEPError[]>;

/**
 * UEP Protocol Validator Implementation
 */
export class UEPProtocolValidator {
  private readonly config: Required<UEPProtocolValidatorConfig>;
  private readonly validationRules = new Map<string, ValidationRule>();
  private readonly ruleConfigs = new Map<string, ValidationRuleConfig>();

  constructor(config: UEPProtocolValidatorConfig = {}) {
    this.config = {
      strictMode: true,
      enablePerformanceValidation: true,
      enableSecurityValidation: true,
      maxMessageSize: 1024 * 1024, // 1MB
      allowedVersions: ['1.0.0'],
      requiredFields: ['id', 'timestamp', 'version', 'protocol', 'routing', 'agent', 'tracing', 'payload'],
      customRules: new Map(),
      ...config
    };

    this.initializeDefaultRules();
    this.initializeCustomRules();
  }

  /**
   * Validate UEP message for protocol compliance
   */
  async validateMessage(
    message: UEPMessage<any>,
    context: Partial<ValidationContext> = {}
  ): Promise<ProtocolValidationResult> {
    const startTime = Date.now();
    const validationContext: ValidationContext = {
      messageType: this.detectMessageType(message),
      timestamp: new Date(),
      ...context
    };

    const errors: UEPError[] = [];
    const warnings: UEPError[] = [];
    const info: UEPError[] = [];
    let rulesExecuted = 0;

    // Execute all validation rules
    for (const [ruleName, rule] of this.validationRules) {
      const ruleConfig = this.ruleConfigs.get(ruleName);
      
      if (!ruleConfig?.enabled) {
        continue;
      }

      try {
        rulesExecuted++;
        const ruleViolations = await rule(message, validationContext);

        for (const violation of ruleViolations) {
          switch (ruleConfig.severity) {
            case 'error':
              errors.push(violation);
              break;
            case 'warning':
              warnings.push(violation);
              break;
            case 'info':
              info.push(violation);
              break;
          }
        }
      } catch (ruleError) {
        errors.push(UEPErrorFactory.internalError(
          `Validation rule '${ruleName}' failed: ${ruleError.message}`,
          ruleError as Error
        ));
      }
    }

    const validationDuration = Date.now() - startTime;
    const valid = errors.length === 0 && (this.config.strictMode ? warnings.length === 0 : true);

    return {
      valid,
      errors,
      warnings,
      info,
      context: validationContext,
      metrics: {
        validationDuration,
        rulesExecuted,
        violationsFound: errors.length + warnings.length + info.length
      }
    };
  }

  /**
   * Validate request message
   */
  async validateRequest(request: UEPRequest<any>): Promise<ProtocolValidationResult> {
    return this.validateMessage(request, {
      messageType: 'request',
      agentId: request.agent?.id,
      capability: request.routing?.subject
    });
  }

  /**
   * Validate response message
   */
  async validateResponse(response: UEPResponse<any>): Promise<ProtocolValidationResult> {
    return this.validateMessage(response, {
      messageType: 'response',
      agentId: response.agent?.id
    });
  }

  /**
   * Validate event message
   */
  async validateEvent(event: UEPEvent<any>): Promise<ProtocolValidationResult> {
    return this.validateMessage(event, {
      messageType: 'event',
      agentId: event.agent?.id
    });
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(
    name: string,
    rule: ValidationRule,
    config: ValidationRuleConfig
  ): void {
    this.validationRules.set(name, rule);
    this.ruleConfigs.set(name, config);
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(name: string): void {
    this.validationRules.delete(name);
    this.ruleConfigs.delete(name);
  }

  /**
   * Enable/disable validation rule
   */
  setRuleEnabled(name: string, enabled: boolean): void {
    const config = this.ruleConfigs.get(name);
    if (config) {
      config.enabled = enabled;
    }
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): string[] {
    return Array.from(this.validationRules.keys());
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Required Fields Validation
    this.addValidationRule(
      'required-fields',
      async (message, context) => {
        const violations: UEPError[] = [];
        
        for (const field of this.config.requiredFields) {
          if (!(field in message) || message[field] === undefined || message[field] === null) {
            violations.push(new UEPError(
              UEPErrorType.INVALID_MESSAGE_FORMAT,
              `Required field '${field}' is missing`,
              {
                metadata: { field, messageType: context.messageType },
                remediation: `Add required field '${field}' to the message`
              }
            ));
          }
        }
        
        return violations;
      },
      {
        enabled: true,
        severity: 'error',
        description: 'Validates that all required fields are present'
      }
    );

    // Protocol Version Validation
    this.addValidationRule(
      'protocol-version',
      async (message, context) => {
        const violations: UEPError[] = [];
        
        if (!message.version) {
          violations.push(new UEPError(
            UEPErrorType.VERSION_MISMATCH,
            'Message version is missing',
            { remediation: 'Add version field to message' }
          ));
        } else if (!this.config.allowedVersions.includes(message.version)) {
          violations.push(new UEPError(
            UEPErrorType.VERSION_MISMATCH,
            `Unsupported protocol version: ${message.version}`,
            {
              metadata: {
                messageVersion: message.version,
                allowedVersions: this.config.allowedVersions
              },
              remediation: `Use one of the supported versions: ${this.config.allowedVersions.join(', ')}`
            }
          ));
        }
        
        return violations;
      },
      {
        enabled: true,
        severity: 'error',
        description: 'Validates protocol version compatibility'
      }
    );

    // Message Size Validation
    this.addValidationRule(
      'message-size',
      async (message, context) => {
        const violations: UEPError[] = [];
        
        const messageSize = JSON.stringify(message).length;
        if (messageSize > this.config.maxMessageSize) {
          violations.push(new UEPError(
            UEPErrorType.MESSAGE_TOO_LARGE,
            `Message size (${messageSize} bytes) exceeds maximum allowed size (${this.config.maxMessageSize} bytes)`,
            {
              metadata: {
                messageSize,
                maxSize: this.config.maxMessageSize,
                compressionAvailable: true
              },
              remediation: 'Reduce message payload size or enable compression'
            }
          ));
        }
        
        return violations;
      },
      {
        enabled: this.config.enablePerformanceValidation,
        severity: 'error',
        description: 'Validates message size limits'
      }
    );

    // Protocol Information Validation
    this.addValidationRule(
      'protocol-info',
      async (message, context) => {
        const violations: UEPError[] = [];
        const protocol = message.protocol as UEPProtocolInfo;
        
        if (!protocol) {
          violations.push(new UEPError(
            UEPErrorType.PROTOCOL_VIOLATION,
            'Protocol information is missing',
            { remediation: 'Add protocol field with id, version, and capability' }
          ));
        } else {
          if (!protocol.id || protocol.id !== 'uep') {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              `Invalid protocol ID: ${protocol.id}`,
              { remediation: 'Set protocol.id to "uep"' }
            ));
          }
          
          if (!protocol.version) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              'Protocol version is missing',
              { remediation: 'Add protocol.version field' }
            ));
          }
          
          if (!protocol.capability) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              'Protocol capability is missing',
              { remediation: 'Add protocol.capability field' }
            ));
          }
        }
        
        return violations;
      },
      {
        enabled: true,
        severity: 'error',
        description: 'Validates protocol information structure'
      }
    );

    // Routing Validation
    this.addValidationRule(
      'routing',
      async (message, context) => {
        const violations: UEPError[] = [];
        const routing = message.routing as UEPRouting;
        
        if (!routing) {
          violations.push(new UEPError(
            UEPErrorType.ROUTING_ERROR,
            'Routing information is missing',
            { remediation: 'Add routing field with subject and messageType' }
          ));
        } else {
          if (!routing.subject) {
            violations.push(new UEPError(
              UEPErrorType.ROUTING_ERROR,
              'Routing subject is missing',
              { remediation: 'Add routing.subject field' }
            ));
          }
          
          if (!routing.messageType || !['command', 'query', 'event'].includes(routing.messageType)) {
            violations.push(new UEPError(
              UEPErrorType.ROUTING_ERROR,
              `Invalid message type: ${routing.messageType}`,
              {
                metadata: { messageType: routing.messageType },
                remediation: 'Set messageType to one of: command, query, event'
              }
            ));
          }
        }
        
        return violations;
      },
      {
        enabled: true,
        severity: 'error',
        description: 'Validates routing information'
      }
    );

    // Agent Information Validation
    this.addValidationRule(
      'agent-info',
      async (message, context) => {
        const violations: UEPError[] = [];
        const agent = message.agent as UEPAgentInfo;
        
        if (!agent) {
          violations.push(new UEPError(
            UEPErrorType.PROTOCOL_VIOLATION,
            'Agent information is missing',
            { remediation: 'Add agent field with id, type, capability, instance, version, and status' }
          ));
        } else {
          const requiredAgentFields = ['id', 'type', 'capability', 'instance', 'version', 'status'];
          
          for (const field of requiredAgentFields) {
            if (!(field in agent) || agent[field] === undefined || agent[field] === null) {
              violations.push(new UEPError(
                UEPErrorType.PROTOCOL_VIOLATION,
                `Agent field '${field}' is missing`,
                {
                  metadata: { field },
                  remediation: `Add agent.${field} field`
                }
              ));
            }
          }
          
          if (agent.type && !['meta', 'domain', 'system'].includes(agent.type)) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              `Invalid agent type: ${agent.type}`,
              {
                metadata: { agentType: agent.type },
                remediation: 'Set agent.type to one of: meta, domain, system'
              }
            ));
          }
          
          if (agent.status && !['initializing', 'ready', 'busy', 'error', 'stopping'].includes(agent.status)) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              `Invalid agent status: ${agent.status}`,
              {
                metadata: { agentStatus: agent.status },
                remediation: 'Set agent.status to one of: initializing, ready, busy, error, stopping'
              }
            ));
          }
        }
        
        return violations;
      },
      {
        enabled: true,
        severity: 'error',
        description: 'Validates agent information structure'
      }
    );

    // Tracing Validation
    this.addValidationRule(
      'tracing',
      async (message, context) => {
        const violations: UEPError[] = [];
        const tracing = message.tracing as UEPTracingContext;
        
        if (!tracing) {
          violations.push(new UEPError(
            UEPErrorType.PROTOCOL_VIOLATION,
            'Tracing context is missing',
            { remediation: 'Add tracing field with traceId and spanId' }
          ));
        } else {
          if (!tracing.traceId) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              'Trace ID is missing',
              { remediation: 'Add tracing.traceId field' }
            ));
          } else if (!/^[0-9a-f]{32}$/.test(tracing.traceId)) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              `Invalid trace ID format: ${tracing.traceId}`,
              {
                metadata: { traceId: tracing.traceId },
                remediation: 'Use 32-character hexadecimal trace ID'
              }
            ));
          }
          
          if (!tracing.spanId) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              'Span ID is missing',
              { remediation: 'Add tracing.spanId field' }
            ));
          } else if (!/^[0-9a-f]{16}$/.test(tracing.spanId)) {
            violations.push(new UEPError(
              UEPErrorType.PROTOCOL_VIOLATION,
              `Invalid span ID format: ${tracing.spanId}`,
              {
                metadata: { spanId: tracing.spanId },
                remediation: 'Use 16-character hexadecimal span ID'
              }
            ));
          }
        }
        
        return violations;
      },
      {
        enabled: true,
        severity: 'error',
        description: 'Validates distributed tracing context'
      }
    );

    // Security Validation
    if (this.config.enableSecurityValidation) {
      this.addValidationRule(
        'security',
        async (message, context) => {
          const violations: UEPError[] = [];
          
          // Check for potential security issues
          const messageStr = JSON.stringify(message);
          
          // Check for common injection patterns
          const injectionPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /function\s*\(/i
          ];
          
          for (const pattern of injectionPatterns) {
            if (pattern.test(messageStr)) {
              violations.push(new UEPError(
                UEPErrorType.VALIDATION_ERROR,
                'Potential security threat detected in message content',
                {
                  severity: 'high',
                  metadata: { pattern: pattern.source },
                  remediation: 'Remove potentially dangerous content from message'
                }
              ));
            }
          }
          
          return violations;
        },
        {
          enabled: true,
          severity: 'warning',
          description: 'Validates message content for security threats'
        }
      );
    }

    // Performance Validation
    if (this.config.enablePerformanceValidation) {
      this.addValidationRule(
        'performance',
        async (message, context) => {
          const violations: UEPError[] = [];
          
          // Check timestamp freshness
          const messageTime = new Date(message.timestamp).getTime();
          const now = Date.now();
          const age = now - messageTime;
          
          if (age > 300000) { // 5 minutes
            violations.push(new UEPError(
              UEPErrorType.VALIDATION_ERROR,
              `Message is too old: ${age}ms`,
              {
                metadata: { messageAge: age, threshold: 300000 },
                remediation: 'Ensure message timestamps are current'
              }
            ));
          }
          
          if (messageTime > now + 60000) { // 1 minute in future
            violations.push(new UEPError(
              UEPErrorType.VALIDATION_ERROR,
              'Message timestamp is in the future',
              {
                metadata: { futureOffset: messageTime - now },
                remediation: 'Ensure system clocks are synchronized'
              }
            ));
          }
          
          return violations;
        },
        {
          enabled: true,
          severity: 'warning',
          description: 'Validates message timing and performance characteristics'
        }
      );
    }
  }

  /**
   * Initialize custom validation rules
   */
  private initializeCustomRules(): void {
    for (const [name, config] of this.config.customRules) {
      this.ruleConfigs.set(name, config);
    }
  }

  /**
   * Detect message type from structure
   */
  private detectMessageType(message: UEPMessage<any>): 'request' | 'response' | 'event' {
    if ('correlationId' in message) {
      return 'response';
    } else if ('routing' in message && message.routing?.messageType === 'event') {
      return 'event';
    } else {
      return 'request';
    }
  }
}

/**
 * Create validation error from validation result
 */
export function createValidationError(result: ProtocolValidationResult): UEPValidationError {
  const errorMessages = result.errors.map(e => e.message);
  const warningMessages = result.warnings.map(e => e.message);
  
  return new UEPValidationError(
    `Protocol validation failed with ${result.errors.length} errors and ${result.warnings.length} warnings`,
    [...errorMessages, ...warningMessages],
    {
      metadata: {
        validationContext: result.context,
        metrics: result.metrics,
        violations: {
          errors: result.errors.length,
          warnings: result.warnings.length,
          info: result.info.length
        }
      }
    }
  );
}

export {
  UEPProtocolValidator,
  UEPProtocolValidatorConfig,
  ValidationContext,
  ProtocolValidationResult,
  ValidationRule,
  ValidationRuleConfig
};