import { Logger } from '../utils/Logger.js';
import { EventMessage } from '../../../../shared/messaging/EventBus.js';

export interface UEPProtocolRule {
  id: string;
  name: string;
  scope: 'meta-agent' | 'factory' | 'domain' | 'system' | 'global';
  priority: number;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'regex' | 'exists' | 'range';
    value: any;
  }>;
  actions: Array<{
    type: 'transform' | 'validate' | 'enrich' | 'route' | 'log';
    parameters: any;
  }>;
  enforcement: 'strict' | 'warn' | 'monitor';
}

export interface ProcessingContext {
  source: string;
  timestamp: string;
  correlationId?: string;
  metadata?: any;
}

export interface ProcessingResult {
  success: boolean;
  protocol: string;
  enforcement: string;
  transformedData?: any;
  violations?: string[];
  actions?: Array<{
    type: string;
    result: any;
  }>;
}

export class UEPProtocolProcessor {
  private logger = new Logger('UEPProtocolProcessor');
  private rules: Map<string, UEPProtocolRule> = new Map();
  private lastUpdate: Date = new Date();
  private active = true;
  private metrics = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    transformations: 0,
    violations: 0
  };

  constructor() {
    this.initializeDefaultProtocolRules();
  }

  private initializeDefaultProtocolRules(): void {
    // Meta-Agent Protocol Rules
    this.addRule({
      id: 'meta-agent-lifecycle',
      name: 'Meta-Agent Lifecycle Protocol',
      scope: 'meta-agent',
      priority: 100,
      conditions: [
        { field: 'type', operator: 'regex', value: /^meta\.agent\./ }
      ],
      actions: [
        {
          type: 'validate',
          parameters: { requireFields: ['agentId', 'status'] }
        },
        {
          type: 'enrich',
          parameters: { addTimestamp: true, addProtocolVersion: 'UEP-1.0' }
        },
        {
          type: 'log',
          parameters: { level: 'info', category: 'meta-agent-lifecycle' }
        }
      ],
      enforcement: 'strict'
    });

    // Factory Coordination Protocol
    this.addRule({
      id: 'factory-coordination',
      name: 'Factory Coordination Protocol',
      scope: 'factory',
      priority: 90,
      conditions: [
        { field: 'type', operator: 'regex', value: /^factory\./ }
      ],
      actions: [
        {
          type: 'validate',
          parameters: { requireCorrelationId: true }
        },
        {
          type: 'route',
          parameters: { 
            stream: 'FACTORY_COORDINATION',
            priority: 'normal'
          }
        },
        {
          type: 'enrich',
          parameters: { addFactoryContext: true }
        }
      ],
      enforcement: 'strict'
    });

    // Domain Agent Protocol
    this.addRule({
      id: 'domain-agent-protocol',
      name: 'Domain Agent Protocol',
      scope: 'domain',
      priority: 80,
      conditions: [
        { field: 'type', operator: 'regex', value: /^domain\./ }
      ],
      actions: [
        {
          type: 'validate',
          parameters: { 
            requireFields: ['domain', 'action'],
            validDomains: ['lead-generation', 'documentation', 'qa-testing', 'devops', 'prospector']
          }
        },
        {
          type: 'transform',
          parameters: { 
            normalizeAction: true,
            addDomainMetadata: true
          }
        }
      ],
      enforcement: 'warn'
    });

    // Resource Management Protocol
    this.addRule({
      id: 'resource-management',
      name: 'Resource Management Protocol',
      scope: 'global',
      priority: 70,
      conditions: [
        { field: 'data', operator: 'exists', value: true }
      ],
      actions: [
        {
          type: 'validate',
          parameters: { 
            maxPayloadSize: 1048576, // 1MB
            maxArrayLength: 1000,
            maxStringLength: 10000
          }
        },
        {
          type: 'log',
          parameters: { 
            level: 'debug',
            category: 'resource-usage',
            includeSize: true
          }
        }
      ],
      enforcement: 'monitor'
    });

    // Error Handling Protocol
    this.addRule({
      id: 'error-handling',
      name: 'Error Handling Protocol',
      scope: 'global',
      priority: 60,
      conditions: [
        { field: 'type', operator: 'contains', value: 'error' },
        { field: 'type', operator: 'contains', value: 'failed' }
      ],
      actions: [
        {
          type: 'enrich',
          parameters: { 
            addErrorTracking: true,
            addRetryCount: true,
            addSeverityLevel: true
          }
        },
        {
          type: 'route',
          parameters: { 
            stream: 'FACTORY_COORDINATION',
            subject: 'factory.error.reported',
            priority: 'high'
          }
        },
        {
          type: 'log',
          parameters: { 
            level: 'error',
            category: 'error-tracking',
            includeStackTrace: true
          }
        }
      ],
      enforcement: 'strict'
    });

    this.logger.info(`Initialized ${this.rules.size} UEP protocol rules`);
  }

  addRule(rule: UEPProtocolRule): void {
    this.rules.set(rule.id, rule);
    this.lastUpdate = new Date();
    this.logger.info(`Added UEP protocol rule: ${rule.name}`);
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.lastUpdate = new Date();
      this.logger.info(`Removed UEP protocol rule: ${ruleId}`);
    }
    return removed;
  }

  async process(data: any, context: ProcessingContext): Promise<ProcessingResult> {
    if (!this.active) {
      return {
        success: false,
        protocol: 'UEP-1.0',
        enforcement: 'disabled',
        violations: ['Protocol processor is disabled']
      };
    }

    this.metrics.totalProcessed++;

    try {
      let transformedData = { ...data };
      const violations: string[] = [];
      const actions: Array<{ type: string; result: any }> = [];
      let enforcement = 'none';

      // Get applicable rules sorted by priority (highest first)
      const applicableRules = this.getApplicableRules(data, context);

      for (const rule of applicableRules) {
        try {
          // Execute rule actions
          for (const action of rule.actions) {
            const actionResult = await this.executeAction(
              action,
              transformedData,
              context,
              rule
            );

            if (actionResult.success) {
              if (actionResult.transformedData) {
                transformedData = actionResult.transformedData;
                this.metrics.transformations++;
              }
              actions.push({
                type: action.type,
                result: actionResult.result
              });
            } else {
              violations.push(
                `Rule '${rule.name}' action '${action.type}': ${actionResult.error}`
              );
              this.metrics.violations++;

              if (rule.enforcement === 'strict') {
                enforcement = 'strict';
              } else if (rule.enforcement === 'warn' && enforcement !== 'strict') {
                enforcement = 'warn';
              }
            }
          }
        } catch (error) {
          this.logger.error(`Error executing rule ${rule.id}:`, error);
          violations.push(`Rule execution error: ${error.message}`);
        }
      }

      const success = violations.length === 0 || enforcement !== 'strict';

      if (success) {
        this.metrics.successful++;
      } else {
        this.metrics.failed++;
      }

      return {
        success,
        protocol: 'UEP-1.0',
        enforcement: enforcement !== 'none' ? enforcement : 'passed',
        transformedData: transformedData !== data ? transformedData : undefined,
        violations: violations.length > 0 ? violations : undefined,
        actions
      };

    } catch (error) {
      this.logger.error('Protocol processing error:', error);
      this.metrics.failed++;

      return {
        success: false,
        protocol: 'UEP-1.0',
        enforcement: 'error',
        violations: [`Processing error: ${error.message}`]
      };
    }
  }

  private getApplicableRules(data: any, context: ProcessingContext): UEPProtocolRule[] {
    const applicable: UEPProtocolRule[] = [];

    for (const rule of this.rules.values()) {
      if (this.isRuleApplicable(rule, data, context)) {
        applicable.push(rule);
      }
    }

    // Sort by priority (highest first)
    return applicable.sort((a, b) => b.priority - a.priority);
  }

  private isRuleApplicable(rule: UEPProtocolRule, data: any, context: ProcessingContext): boolean {
    // Check scope
    if (rule.scope !== 'global') {
      const eventType = data.type || '';
      if (!eventType.startsWith(rule.scope === 'meta-agent' ? 'meta.' : rule.scope + '.')) {
        return false;
      }
    }

    // Check conditions
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, data, context)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(condition: any, data: any, context: ProcessingContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, data, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      
      case 'contains':
        return String(fieldValue).includes(condition.value);
      
      case 'regex':
        return condition.value.test(String(fieldValue));
      
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      
      case 'range':
        return fieldValue >= condition.value.min && fieldValue <= condition.value.max;
      
      default:
        this.logger.warn(`Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  private getFieldValue(field: string, data: any, context: ProcessingContext): any {
    if (field.startsWith('context.')) {
      const contextField = field.substring(8);
      return context[contextField];
    }
    
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = data;
      for (const part of parts) {
        value = value?.[part];
      }
      return value;
    }
    
    return data[field];
  }

  private async executeAction(
    action: any,
    data: any,
    context: ProcessingContext,
    rule: UEPProtocolRule
  ): Promise<{ success: boolean; result?: any; transformedData?: any; error?: string }> {
    try {
      switch (action.type) {
        case 'validate':
          return this.executeValidateAction(action.parameters, data);
        
        case 'transform':
          return this.executeTransformAction(action.parameters, data, context);
        
        case 'enrich':
          return this.executeEnrichAction(action.parameters, data, context);
        
        case 'route':
          return this.executeRouteAction(action.parameters, data, context);
        
        case 'log':
          return this.executeLogAction(action.parameters, data, context, rule);
        
        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private executeValidateAction(params: any, data: any): { success: boolean; result?: any; error?: string } {
    const errors: string[] = [];

    if (params.requireFields) {
      for (const field of params.requireFields) {
        if (!data[field]) {
          errors.push(`Required field missing: ${field}`);
        }
      }
    }

    if (params.requireCorrelationId && !data.correlationId) {
      errors.push('Correlation ID is required');
    }

    if (params.validDomains && data.domain && !params.validDomains.includes(data.domain)) {
      errors.push(`Invalid domain: ${data.domain}`);
    }

    if (params.maxPayloadSize) {
      const size = JSON.stringify(data).length;
      if (size > params.maxPayloadSize) {
        errors.push(`Payload size ${size} exceeds limit ${params.maxPayloadSize}`);
      }
    }

    return {
      success: errors.length === 0,
      result: { validationErrors: errors },
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }

  private executeTransformAction(params: any, data: any, context: ProcessingContext): { success: boolean; transformedData: any; result: any } {
    const transformed = { ...data };

    if (params.normalizeAction && transformed.action) {
      transformed.action = transformed.action.toLowerCase().trim();
    }

    if (params.addDomainMetadata && transformed.domain) {
      transformed.domainMetadata = {
        normalizedDomain: transformed.domain.toLowerCase(),
        category: this.getDomainCategory(transformed.domain),
        capabilities: this.getDomainCapabilities(transformed.domain)
      };
    }

    return {
      success: true,
      transformedData: transformed,
      result: { transformations: Object.keys(params) }
    };
  }

  private executeEnrichAction(params: any, data: any, context: ProcessingContext): { success: boolean; transformedData: any; result: any } {
    const enriched = { ...data };

    if (params.addTimestamp) {
      enriched.processedAt = new Date().toISOString();
    }

    if (params.addProtocolVersion) {
      enriched.protocol = params.addProtocolVersion;
    }

    if (params.addFactoryContext) {
      enriched.factoryContext = {
        processor: 'UEP-Protocol-Processor',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    }

    if (params.addErrorTracking && (data.type?.includes('error') || data.type?.includes('failed'))) {
      enriched.errorTracking = {
        errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        severity: this.determineErrorSeverity(data),
        category: this.categorizeError(data),
        context: context.source
      };
    }

    return {
      success: true,
      transformedData: enriched,
      result: { enrichments: Object.keys(params) }
    };
  }

  private executeRouteAction(params: any, data: any, context: ProcessingContext): { success: boolean; result: any } {
    // This would integrate with the actual routing system
    const routing = {
      stream: params.stream || 'default',
      subject: params.subject || data.type,
      priority: params.priority || 'normal',
      targetContext: context
    };

    return {
      success: true,
      result: { routing }
    };
  }

  private executeLogAction(params: any, data: any, context: ProcessingContext, rule: UEPProtocolRule): { success: boolean; result: any } {
    const logData = {
      level: params.level || 'info',
      category: params.category || 'protocol',
      rule: rule.name,
      data: params.includeSize ? { ...data, _size: JSON.stringify(data).length } : data,
      context: context.source,
      timestamp: new Date().toISOString()
    };

    // Use appropriate log level
    switch (params.level) {
      case 'error':
        this.logger.error(`[${params.category}] ${rule.name}`, logData);
        break;
      case 'warn':
        this.logger.warn(`[${params.category}] ${rule.name}`, logData);
        break;
      case 'debug':
        this.logger.debug(`[${params.category}] ${rule.name}`, logData);
        break;
      default:
        this.logger.info(`[${params.category}] ${rule.name}`, logData);
    }

    return {
      success: true,
      result: { logged: true, level: params.level }
    };
  }

  private getDomainCategory(domain: string): string {
    const categories = {
      'lead-generation': 'business',
      'documentation': 'content',
      'qa-testing': 'quality',
      'devops': 'infrastructure',
      'prospector': 'research'
    };
    return categories[domain] || 'unknown';
  }

  private getDomainCapabilities(domain: string): string[] {
    const capabilities = {
      'lead-generation': ['prospect-research', 'contact-discovery', 'lead-scoring'],
      'documentation': ['doc-generation', 'knowledge-extraction', 'content-organization'],
      'qa-testing': ['test-generation', 'bug-detection', 'quality-validation'],
      'devops': ['deployment-automation', 'monitoring-setup', 'pipeline-optimization'],
      'prospector': ['market-analysis', 'competitor-research', 'opportunity-identification']
    };
    return capabilities[domain] || [];
  }

  private determineErrorSeverity(data: any): 'critical' | 'high' | 'medium' | 'low' {
    if (data.type?.includes('failed') && data.error?.includes('timeout')) return 'high';
    if (data.type?.includes('error') && data.error?.includes('validation')) return 'medium';
    if (data.type?.includes('failed')) return 'high';
    return 'medium';
  }

  private categorizeError(data: any): string {
    if (data.type?.includes('meta.agent')) return 'meta-agent';
    if (data.type?.includes('factory')) return 'factory';
    if (data.type?.includes('domain')) return 'domain-agent';
    return 'system';
  }

  isActive(): boolean {
    return this.active;
  }

  getActiveRules(): UEPProtocolRule[] {
    return Array.from(this.rules.values());
  }

  getLastUpdate(): Date {
    return this.lastUpdate;
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      successRate: this.metrics.totalProcessed > 0 
        ? (this.metrics.successful / this.metrics.totalProcessed * 100).toFixed(2) + '%'
        : '0%',
      activeRules: this.rules.size
    };
  }

  setActive(active: boolean): void {
    this.active = active;
    this.logger.info(`Protocol processor ${active ? 'activated' : 'deactivated'}`);
  }
}