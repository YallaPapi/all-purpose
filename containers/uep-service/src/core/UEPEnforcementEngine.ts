import { EventEmitter } from 'events';
import { UEPValidationEngine } from './UEPValidationEngine';
import { UEPProtocolProcessor } from './UEPProtocolProcessor';

export interface UEPViolation {
  id: string;
  timestamp: Date;
  violationType: 'VALIDATION' | 'PROTOCOL' | 'ENFORCEMENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  description: string;
  context: any;
  remediation?: string;
}

export interface EnforcementAction {
  type: 'WARN' | 'BLOCK' | 'THROTTLE' | 'QUARANTINE' | 'TERMINATE';
  target: string;
  duration?: number;
  metadata?: any;
}

export interface UEPEnforcementPolicy {
  name: string;
  conditions: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'regex';
    value: any;
  }>;
  actions: EnforcementAction[];
  cooldownMs?: number;
  maxViolations?: number;
}

export class UEPEnforcementEngine extends EventEmitter {
  private validationEngine: UEPValidationEngine;
  private protocolProcessor: UEPProtocolProcessor;
  private violations: Map<string, UEPViolation[]> = new Map();
  private policies: UEPEnforcementPolicy[] = [];
  private activeEnforcements: Map<string, EnforcementAction[]> = new Map();

  constructor() {
    super();
    this.validationEngine = new UEPValidationEngine();
    this.protocolProcessor = new UEPProtocolProcessor();
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    this.policies = [
      {
        name: 'Critical Validation Failures',
        conditions: [
          { field: 'severity', operator: 'eq', value: 'CRITICAL' },
          { field: 'violationType', operator: 'eq', value: 'VALIDATION' }
        ],
        actions: [
          { type: 'BLOCK', target: 'source' },
          { type: 'WARN', target: 'administrator' }
        ],
        maxViolations: 1
      },
      {
        name: 'High Frequency Violations',
        conditions: [
          { field: 'frequency', operator: 'gt', value: 10 }
        ],
        actions: [
          { type: 'THROTTLE', target: 'source', duration: 60000 },
          { type: 'WARN', target: 'administrator' }
        ],
        cooldownMs: 300000,
        maxViolations: 3
      },
      {
        name: 'Resource Abuse',
        conditions: [
          { field: 'description', operator: 'contains', value: 'resource limit' }
        ],
        actions: [
          { type: 'QUARANTINE', target: 'source', duration: 300000 }
        ],
        maxViolations: 2
      },
      {
        name: 'Protocol Tampering',
        conditions: [
          { field: 'violationType', operator: 'eq', value: 'PROTOCOL' },
          { field: 'description', operator: 'contains', value: 'tampering' }
        ],
        actions: [
          { type: 'TERMINATE', target: 'source' },
          { type: 'WARN', target: 'security' }
        ],
        maxViolations: 1
      }
    ];
  }

  async enforceCompliance(request: any, context: any): Promise<{
    allowed: boolean;
    violations: UEPViolation[];
    actions: EnforcementAction[];
    metadata?: any;
  }> {
    const violations: UEPViolation[] = [];
    const actions: EnforcementAction[] = [];

    try {
      // 1. Run validation
      const validationResult = await this.validationEngine.validateRequest(request);
      if (!validationResult.isValid) {
        for (const error of validationResult.errors) {
          const violation: UEPViolation = {
            id: this.generateViolationId(),
            timestamp: new Date(),
            violationType: 'VALIDATION',
            severity: this.determineSeverity(error),
            source: context.source || 'unknown',
            description: error.message,
            context: { request, error },
            remediation: error.remediation
          };
          violations.push(violation);
        }
      }

      // 2. Run protocol processing
      const processingResult = await this.protocolProcessor.process(request, context);
      if (!processingResult.success) {
        const violation: UEPViolation = {
          id: this.generateViolationId(),
          timestamp: new Date(),
          violationType: 'PROTOCOL',
          severity: 'HIGH',
          source: context.source || 'unknown',
          description: `Protocol processing failed: ${processingResult.error}`,
          context: { request, processingResult },
          remediation: 'Review protocol compliance requirements'
        };
        violations.push(violation);
      }

      // 3. Record violations
      for (const violation of violations) {
        this.recordViolation(violation);
      }

      // 4. Apply enforcement policies
      const enforcementActions = await this.applyEnforcementPolicies(violations, context);
      actions.push(...enforcementActions);

      // 5. Execute actions
      for (const action of actions) {
        await this.executeEnforcementAction(action, context);
      }

      // 6. Determine if request is allowed
      const isBlocked = actions.some(action => action.type === 'BLOCK' || action.type === 'TERMINATE');
      const allowed = violations.length === 0 || !isBlocked;

      // 7. Emit enforcement event
      this.emit('enforcement', {
        source: context.source,
        violations,
        actions,
        allowed,
        timestamp: new Date()
      });

      return {
        allowed,
        violations,
        actions,
        metadata: {
          validationResult,
          processingResult,
          totalViolations: this.getViolationCount(context.source)
        }
      };

    } catch (error) {
      // Critical enforcement failure
      const criticalViolation: UEPViolation = {
        id: this.generateViolationId(),
        timestamp: new Date(),
        violationType: 'ENFORCEMENT',
        severity: 'CRITICAL',
        source: context.source || 'unknown',
        description: `Enforcement engine failure: ${error.message}`,
        context: { request, error },
        remediation: 'Contact system administrator'
      };

      violations.push(criticalViolation);
      this.recordViolation(criticalViolation);

      // Default to blocking on critical failures
      const blockAction: EnforcementAction = {
        type: 'BLOCK',
        target: context.source || 'unknown',
        metadata: { reason: 'enforcement_failure' }
      };
      actions.push(blockAction);

      return {
        allowed: false,
        violations,
        actions,
        metadata: { error: error.message }
      };
    }
  }

  private async applyEnforcementPolicies(violations: UEPViolation[], context: any): Promise<EnforcementAction[]> {
    const actions: EnforcementAction[] = [];

    for (const policy of this.policies) {
      const sourceViolations = this.violations.get(context.source) || [];
      const recentViolations = sourceViolations.filter(v => 
        Date.now() - v.timestamp.getTime() < (policy.cooldownMs || 300000)
      );

      // Check if policy conditions are met
      const conditionsMet = violations.some(violation => 
        this.evaluatePolicyConditions(violation, policy.conditions, recentViolations)
      );

      if (conditionsMet) {
        // Check violation threshold
        if (policy.maxViolations && recentViolations.length >= policy.maxViolations) {
          for (const actionTemplate of policy.actions) {
            const action: EnforcementAction = {
              ...actionTemplate,
              target: actionTemplate.target === 'source' ? context.source : actionTemplate.target
            };
            actions.push(action);
          }
        }
      }
    }

    return actions;
  }

  private evaluatePolicyConditions(
    violation: UEPViolation, 
    conditions: any[], 
    recentViolations: UEPViolation[]
  ): boolean {
    return conditions.every(condition => {
      let value: any;

      switch (condition.field) {
        case 'severity':
        case 'violationType':
        case 'description':
          value = violation[condition.field];
          break;
        case 'frequency':
          value = recentViolations.length;
          break;
        default:
          value = violation.context?.[condition.field];
      }

      return this.evaluateCondition(value, condition.operator, condition.value);
    });
  }

  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq': return value === expected;
      case 'ne': return value !== expected;
      case 'gt': return value > expected;
      case 'lt': return value < expected;
      case 'contains': return String(value).includes(String(expected));
      case 'regex': return new RegExp(expected).test(String(value));
      default: return false;
    }
  }

  private async executeEnforcementAction(action: EnforcementAction, context: any): Promise<void> {
    switch (action.type) {
      case 'WARN':
        this.emit('warning', {
          target: action.target,
          source: context.source,
          action,
          timestamp: new Date()
        });
        break;

      case 'BLOCK':
        this.addActiveEnforcement(action.target, action);
        this.emit('blocked', {
          target: action.target,
          duration: action.duration || 'indefinite',
          timestamp: new Date()
        });
        break;

      case 'THROTTLE':
        this.addActiveEnforcement(action.target, action);
        if (action.duration) {
          setTimeout(() => {
            this.removeActiveEnforcement(action.target, action);
          }, action.duration);
        }
        break;

      case 'QUARANTINE':
        this.addActiveEnforcement(action.target, action);
        if (action.duration) {
          setTimeout(() => {
            this.removeActiveEnforcement(action.target, action);
          }, action.duration);
        }
        this.emit('quarantined', {
          target: action.target,
          duration: action.duration,
          timestamp: new Date()
        });
        break;

      case 'TERMINATE':
        this.addActiveEnforcement(action.target, action);
        this.emit('terminated', {
          target: action.target,
          timestamp: new Date()
        });
        break;
    }
  }

  private recordViolation(violation: UEPViolation): void {
    const sourceViolations = this.violations.get(violation.source) || [];
    sourceViolations.push(violation);
    this.violations.set(violation.source, sourceViolations);

    // Cleanup old violations (keep last 1000 per source)
    if (sourceViolations.length > 1000) {
      sourceViolations.splice(0, sourceViolations.length - 1000);
    }
  }

  private addActiveEnforcement(target: string, action: EnforcementAction): void {
    const enforcements = this.activeEnforcements.get(target) || [];
    enforcements.push(action);
    this.activeEnforcements.set(target, enforcements);
  }

  private removeActiveEnforcement(target: string, action: EnforcementAction): void {
    const enforcements = this.activeEnforcements.get(target) || [];
    const index = enforcements.indexOf(action);
    if (index > -1) {
      enforcements.splice(index, 1);
      if (enforcements.length === 0) {
        this.activeEnforcements.delete(target);
      } else {
        this.activeEnforcements.set(target, enforcements);
      }
    }
  }

  private determineSeverity(error: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('critical') || message.includes('security') || message.includes('auth')) {
      return 'CRITICAL';
    } else if (message.includes('limit') || message.includes('quota') || message.includes('rate')) {
      return 'HIGH';
    } else if (message.includes('warning') || message.includes('deprecated')) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  private generateViolationId(): string {
    return `uep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getViolationCount(source: string): number {
    return (this.violations.get(source) || []).length;
  }

  // Public API methods
  public getViolations(source?: string): UEPViolation[] {
    if (source) {
      return this.violations.get(source) || [];
    }
    
    const allViolations: UEPViolation[] = [];
    for (const violations of this.violations.values()) {
      allViolations.push(...violations);
    }
    return allViolations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getActiveEnforcements(target?: string): EnforcementAction[] {
    if (target) {
      return this.activeEnforcements.get(target) || [];
    }
    
    const allEnforcements: EnforcementAction[] = [];
    for (const enforcements of this.activeEnforcements.values()) {
      allEnforcements.push(...enforcements);
    }
    return allEnforcements;
  }

  public isBlocked(source: string): boolean {
    const enforcements = this.activeEnforcements.get(source) || [];
    return enforcements.some(e => e.type === 'BLOCK' || e.type === 'TERMINATE');
  }

  public clearViolations(source?: string): void {
    if (source) {
      this.violations.delete(source);
    } else {
      this.violations.clear();
    }
  }

  public addPolicy(policy: UEPEnforcementPolicy): void {
    this.policies.push(policy);
  }

  public removePolicy(name: string): boolean {
    const index = this.policies.findIndex(p => p.name === name);
    if (index > -1) {
      this.policies.splice(index, 1);
      return true;
    }
    return false;
  }
}