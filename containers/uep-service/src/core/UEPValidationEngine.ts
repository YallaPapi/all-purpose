import { validateEventAgainstSchema } from '../schemas/event-schemas.js';
import { Logger } from '../utils/Logger.js';

export interface UEPRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
}

export interface UEPValidationResult {
  valid: boolean;
  protocol?: string;
  violations?: string[];
  enforcement?: string;
  metadata?: any;
  correctedData?: any;
}

export interface UEPRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  enforcement: 'strict' | 'warn' | 'monitor';
  validator: (data: any) => boolean | string[];
}

export class UEPValidationEngine {
  private logger = new Logger('UEPValidationEngine');
  private rules: Map<string, UEPRule> = new Map();
  private metrics = {
    totalValidations: 0,
    successfulValidations: 0,
    failedValidations: 0,
    violations: 0,
    correctedViolations: 0
  };

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Meta-Agent Protocol Rules
    this.addRule({
      id: 'meta-agent-creation',
      name: 'Meta-Agent Creation Protocol',
      description: 'Validates meta-agent creation follows UEP standards',
      pattern: /^meta\.agent\.created$/,
      enforcement: 'strict',
      validator: (data) => {
        const required = ['agentId', 'type', 'status'];
        const missing = required.filter(field => !data[field]);
        if (missing.length > 0) {
          return [`Missing required fields: ${missing.join(', ')}`];
        }
        
        const validTypes = [
          'all-purpose-pattern', 'prd-parser', 'scaffold-generator',
          'template-engine-factory', 'parameter-flow', 'five-document-framework',
          'thirty-minute-rule', 'vercel-native-architecture', 'infra-orchestrator',
          'backend-agent', 'frontend-agent'
        ];
        
        if (!validTypes.includes(data.type)) {
          return [`Invalid agent type: ${data.type}`];
        }
        
        return true;
      }
    });

    // Factory Task Assignment Rules
    this.addRule({
      id: 'factory-task-assignment',
      name: 'Factory Task Assignment Protocol',
      description: 'Validates task assignments follow UEP workflow standards',
      pattern: /^factory\.task\.assigned$/,
      enforcement: 'strict',
      validator: (data) => {
        const required = ['taskId', 'agentId', 'task'];
        const missing = required.filter(field => !data[field]);
        if (missing.length > 0) {
          return [`Missing required fields: ${missing.join(', ')}`];
        }
        
        // Validate task ID format
        if (!/^task-\d+-[a-z0-9]+$/.test(data.taskId)) {
          return ['Invalid task ID format. Must be: task-{timestamp}-{hash}'];
        }
        
        return true;
      }
    });

    // Domain Agent Protocol Rules
    this.addRule({
      id: 'domain-agent-execution',
      name: 'Domain Agent Execution Protocol',
      description: 'Validates domain agent operations follow UEP standards',
      pattern: /^domain\.(lead-generation|documentation|qa-testing|devops|prospector)\./,
      enforcement: 'warn',
      validator: (data) => {
        if (!data.domain || !data.action) {
          return ['Domain agent events must specify domain and action'];
        }
        
        const validDomains = ['lead-generation', 'documentation', 'qa-testing', 'devops', 'prospector'];
        if (!validDomains.includes(data.domain)) {
          return [`Invalid domain: ${data.domain}`];
        }
        
        const validActions = ['execute', 'analyze', 'complete', 'error'];
        if (!validActions.includes(data.action)) {
          return [`Invalid action: ${data.action}`];
        }
        
        return true;
      }
    });

    // Resource Constraint Rules
    this.addRule({
      id: 'resource-constraints',
      name: 'Resource Constraint Protocol',
      description: 'Enforces resource usage limits per UEP guidelines',
      pattern: /^(meta|factory|domain)\./,
      enforcement: 'monitor',
      validator: (data) => {
        const warnings = [];
        
        // Check for excessive payload size
        const payload = JSON.stringify(data);
        if (payload.length > 1048576) { // 1MB
          warnings.push('Event payload exceeds 1MB limit');
        }
        
        // Check for excessive array lengths
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value) && value.length > 1000) {
            warnings.push(`Array field '${key}' exceeds 1000 items`);
          }
        }
        
        return warnings.length > 0 ? warnings : true;
      }
    });

    // API Request Protocol Rules
    this.addRule({
      id: 'api-request-validation',
      name: 'API Request Protocol',
      description: 'Validates API requests follow UEP standards',
      pattern: '/api/',
      enforcement: 'strict',
      validator: (request: UEPRequest) => {
        const violations = [];
        
        // Validate required headers
        if (!request.headers['content-type'] && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
          violations.push('Missing Content-Type header for write operations');
        }
        
        // Validate API versioning
        if (!request.path.match(/\/api\/v\d+\//) && !request.path.match(/\/api\/(factory|agents|metrics)\//)) {
          violations.push('API requests must include version or service prefix');
        }
        
        // Validate authentication for sensitive operations
        if (request.path.includes('/admin') && !request.headers['authorization']) {
          violations.push('Admin endpoints require authentication');
        }
        
        return violations.length > 0 ? violations : true;
      }
    });

    this.logger.info(`Initialized ${this.rules.size} UEP validation rules`);
  }

  addRule(rule: UEPRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info(`Added UEP rule: ${rule.name}`);
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.logger.info(`Removed UEP rule: ${ruleId}`);
    }
    return removed;
  }

  async validateRequest(request: UEPRequest): Promise<UEPValidationResult> {
    this.metrics.totalValidations++;
    
    try {
      const violations: string[] = [];
      let enforcement = 'none';
      
      // Check all applicable rules
      for (const rule of this.rules.values()) {
        let applicable = false;
        
        if (typeof rule.pattern === 'string') {
          applicable = request.path.includes(rule.pattern);
        } else {
          applicable = rule.pattern.test(request.path);
        }
        
        if (applicable) {
          const result = rule.validator(request);
          
          if (result !== true) {
            const ruleViolations = Array.isArray(result) ? result : [result];
            violations.push(...ruleViolations.map(v => `${rule.name}: ${v}`));
            
            if (rule.enforcement === 'strict') {
              enforcement = 'strict';
            } else if (rule.enforcement === 'warn' && enforcement !== 'strict') {
              enforcement = 'warn';
            }
          }
        }
      }
      
      const valid = violations.length === 0 || enforcement !== 'strict';
      
      if (valid) {
        this.metrics.successfulValidations++;
      } else {
        this.metrics.failedValidations++;
        this.metrics.violations += violations.length;
      }
      
      return {
        valid,
        protocol: 'UEP-1.0',
        violations: violations.length > 0 ? violations : undefined,
        enforcement: enforcement !== 'none' ? enforcement : undefined,
        metadata: {
          rulesApplied: Array.from(this.rules.keys()),
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      this.logger.error('UEP validation error:', error);
      this.metrics.failedValidations++;
      
      return {
        valid: false,
        violations: [`Validation error: ${error.message}`],
        enforcement: 'strict'
      };
    }
  }

  async validateEvent(eventType: string, eventData: any): Promise<UEPValidationResult> {
    this.metrics.totalValidations++;
    
    try {
      // First, validate against event schemas
      const schemaValidation = validateEvent(eventType, {
        id: eventData.id || `event-${Date.now()}`,
        type: eventType,
        source: eventData.source || 'unknown',
        timestamp: eventData.timestamp || new Date().toISOString(),
        data: eventData
      });
      
      const violations: string[] = [];
      let correctedData = { ...eventData };
      
      if (!schemaValidation.valid) {
        violations.push(...(schemaValidation.errors || ['Schema validation failed']));
      }
      
      // Apply UEP rules
      for (const rule of this.rules.values()) {
        let applicable = false;
        
        if (typeof rule.pattern === 'string') {
          applicable = eventType.includes(rule.pattern);
        } else {
          applicable = rule.pattern.test(eventType);
        }
        
        if (applicable) {
          const result = rule.validator(eventData);
          
          if (result !== true) {
            const ruleViolations = Array.isArray(result) ? result : [result];
            violations.push(...ruleViolations.map(v => `${rule.name}: ${v}`));
          }
        }
      }
      
      // Auto-correct common issues
      if (!eventData.timestamp) {
        correctedData.timestamp = new Date().toISOString();
        this.metrics.correctedViolations++;
      }
      
      if (!eventData.source) {
        correctedData.source = 'uep-corrected';
        this.metrics.correctedViolations++;
      }
      
      const valid = violations.length === 0;
      
      if (valid) {
        this.metrics.successfulValidations++;
      } else {
        this.metrics.failedValidations++;
        this.metrics.violations += violations.length;
      }
      
      return {
        valid,
        protocol: 'UEP-1.0',
        violations: violations.length > 0 ? violations : undefined,
        correctedData: Object.keys(correctedData).length !== Object.keys(eventData).length ? correctedData : undefined
      };
      
    } catch (error) {
      this.logger.error('Event validation error:', error);
      this.metrics.failedValidations++;
      
      return {
        valid: false,
        violations: [`Event validation error: ${error.message}`]
      };
    }
  }

  getStatus(): any {
    return {
      active: true,
      rulesLoaded: this.rules.size,
      version: 'UEP-1.0'
    };
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      successRate: this.metrics.totalValidations > 0 
        ? (this.metrics.successfulValidations / this.metrics.totalValidations * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  getRules(): UEPRule[] {
    return Array.from(this.rules.values());
  }
}