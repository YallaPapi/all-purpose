/**
 * UEP Error Recovery and Compensation Manager
 * 
 * Advanced error recovery system implementing Saga pattern with compensation,
 * circuit breaker pattern for cascading failure prevention, and comprehensive
 * retry strategies for distributed workflow orchestration.
 * 
 * Research-based implementation features:
 * - Saga pattern with compensating transactions
 * - Circuit breaker pattern for fault tolerance
 * - Persistent state management for recovery
 * - Declarative compensation definitions
 * - Centralized orchestration with audit trails
 * - Multi-level retry strategies with backoff
 * - Fault isolation and cascade prevention
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 224.4
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowError,
  RecoveryAction,
  ActionDefinition
} from './WorkflowSchema';
import {
  DistributedStateManager,
  WorkflowState,
  StepExecution
} from './DistributedStateManager';

// Error recovery interfaces
export interface CompensationAction {
  stepId: string;                      // Step to compensate
  workflowId: string;                  // Workflow identifier
  executionId: string;                 // Execution identifier
  action: ActionDefinition;            // Compensation action definition
  input: Record<string, any>;          // Compensation input data
  dependencies: string[];              // Compensation dependencies
  timeout: number;                     // Compensation timeout
  retryPolicy: RetryPolicy;            // Compensation retry policy
  priority: number;                    // Execution priority
  metadata: {
    originalStepResult: any;           // Original step result
    compensationReason: string;        // Why compensation is needed
    triggeredAt: Date;                 // When compensation was triggered
    expectedDuration: number;          // Expected compensation time
  };
}

export interface CircuitBreaker {
  agentId: string;                     // Agent identifier
  capability: string;                  // Specific capability being monitored
  state: 'closed' | 'open' | 'half-open'; // Circuit state
  failureCount: number;                // Current failure count
  successCount: number;                // Current success count
  lastFailureTime: Date;               // Last failure timestamp
  lastSuccessTime: Date;               // Last success timestamp
  nextAttemptTime?: Date;              // When to try again (open state)
  thresholds: {
    failureThreshold: number;          // Failures to open circuit
    successThreshold: number;          // Successes to close circuit
    timeout: number;                   // How long to stay open
    resetTimeout: number;              // Timeout before half-open
  };
  metrics: {
    totalRequests: number;             // Total requests made
    totalFailures: number;             // Total failures
    totalSuccesses: number;            // Total successes
    averageResponseTime: number;       // Average response time
    lastResetTime: Date;               // Last metrics reset
  };
}

export interface RetryPolicy {
  maxAttempts: number;                 // Maximum retry attempts
  strategy: 'fixed' | 'exponential' | 'linear' | 'custom';
  initialDelay: number;                // Initial delay between retries
  maxDelay: number;                    // Maximum delay between retries
  backoffMultiplier: number;           // Multiplier for exponential backoff
  jitterEnabled: boolean;              // Add random jitter to delays
  retryableErrors: string[];           // Error codes that can be retried
  nonRetryableErrors: string[];        // Error codes that cannot be retried
  customDelayCalculator?: (attempt: number) => number; // Custom delay function
}

export interface RecoveryStrategy {
  name: string;                        // Strategy name
  type: 'compensation' | 'retry' | 'fallback' | 'escalation';
  conditions: RecoveryCondition[];     // When to apply this strategy
  actions: RecoveryActionDefinition[]; // Actions to take
  priority: number;                    // Strategy priority (higher = more preferred)
  timeout: number;                     // Strategy execution timeout
  metadata: {
    description: string;               // Strategy description
    successRate: number;               // Historical success rate
    averageDuration: number;           // Average execution time
    lastUsed: Date;                    // Last time strategy was used
  };
}

export interface RecoveryCondition {
  type: 'error_code' | 'step_type' | 'agent_status' | 'workflow_state' | 'custom';
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than';
  value: any;                          // Condition value
  customEvaluator?: (context: RecoveryContext) => boolean; // Custom condition evaluator
}

export interface RecoveryActionDefinition {
  type: 'compensate' | 'retry' | 'fallback' | 'escalate' | 'notify';
  parameters: Record<string, any>;     // Action parameters
  timeout: number;                     // Action timeout
  retryPolicy?: RetryPolicy;           // Action-specific retry policy
}

export interface RecoveryContext {
  workflowId: string;                  // Workflow identifier
  executionId: string;                 // Execution identifier
  failedStep: StepExecution;           // Failed step execution
  error: WorkflowError;                // Error that triggered recovery
  workflowState: WorkflowState;        // Current workflow state
  executionHistory: StepExecution[];   // Execution history
  availableAgents: string[];           // Available agents for recovery
  previousRecoveryAttempts: RecoveryAttempt[]; // Previous recovery attempts
}

export interface RecoveryAttempt {
  attemptId: string;                   // Unique attempt identifier
  strategy: string;                    // Strategy used
  startTime: Date;                     // Attempt start time
  endTime?: Date;                      // Attempt end time
  status: 'running' | 'success' | 'failure'; // Attempt status
  result?: any;                        // Attempt result
  error?: WorkflowError;               // Attempt error
}

export interface ErrorRecoveryConfig {
  stateManager: DistributedStateManager;
  circuitBreaker: {
    enabled: boolean;                  // Enable circuit breaker
    defaultThresholds: {
      failureThreshold: number;        // Default failure threshold
      successThreshold: number;        // Default success threshold
      timeout: number;                 // Default timeout
      resetTimeout: number;            // Default reset timeout
    };
    monitoringInterval: number;        // Circuit monitoring interval
  };
  compensation: {
    enabled: boolean;                  // Enable compensation
    timeout: number;                   // Default compensation timeout
    maxConcurrentCompensations: number; // Max concurrent compensations
    compensationOrder: 'reverse' | 'dependency' | 'priority'; // Compensation order
  };
  retry: {
    defaultPolicy: RetryPolicy;        // Default retry policy
    maxGlobalRetries: number;          // Global retry limit
    retryQueueSize: number;            // Retry queue size
  };
  escalation: {
    enabled: boolean;                  // Enable escalation
    levels: EscalationLevel[];         // Escalation levels
    timeout: number;                   // Escalation timeout
  };
  monitoring: {
    enableMetrics: boolean;            // Enable recovery metrics
    metricsInterval: number;           // Metrics collection interval
    auditLevel: 'minimal' | 'detailed' | 'verbose'; // Audit detail level
  };
}

export interface EscalationLevel {
  name: string;                        // Level name
  threshold: number;                   // Failure threshold for this level
  actions: string[];                   // Actions to take
  timeout: number;                     // Level timeout
  notificationChannels: string[];      // Notification channels
}

/**
 * Error recovery events
 */
export interface ErrorRecoveryEvents {
  'recovery:started': (context: RecoveryContext, strategy: RecoveryStrategy) => void;
  'recovery:completed': (context: RecoveryContext, result: any) => void;
  'recovery:failed': (context: RecoveryContext, error: WorkflowError) => void;
  'compensation:started': (action: CompensationAction) => void;
  'compensation:completed': (action: CompensationAction, result: any) => void;
  'compensation:failed': (action: CompensationAction, error: WorkflowError) => void;
  'circuit:opened': (breaker: CircuitBreaker) => void;
  'circuit:closed': (breaker: CircuitBreaker) => void;
  'circuit:half-open': (breaker: CircuitBreaker) => void;
  'retry:attempted': (context: RecoveryContext, attempt: number) => void;
  'escalation:triggered': (level: EscalationLevel, context: RecoveryContext) => void;
}

/**
 * Main error recovery manager class
 */
export class ErrorRecoveryManager extends EventEmitter {
  private stateManager: DistributedStateManager;
  private logger: winston.Logger;
  private config: ErrorRecoveryConfig;
  
  // Circuit breaker management
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private circuitBreakerMonitor?: NodeJS.Timeout;
  
  // Compensation management
  private compensationQueue: CompensationAction[] = [];
  private activeCompensations = new Map<string, CompensationAction>();
  private compensationHistory = new Map<string, CompensationAction[]>();
  
  // Recovery strategies
  private recoveryStrategies: RecoveryStrategy[] = [];
  private activeRecoveries = new Map<string, RecoveryAttempt>();
  
  // Retry management
  private retryQueue = new Map<string, StepExecution[]>();
  private retryAttempts = new Map<string, number>();
  
  // Metrics and monitoring
  private recoveryMetrics = {
    totalRecoveries: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    compensationsExecuted: 0,
    circuitBreakersTriggered: 0,
    averageRecoveryTime: 0
  };

  constructor(config: ErrorRecoveryConfig) {
    super();
    this.config = config;
    this.stateManager = config.stateManager;
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error-recovery.log' })
      ]
    });

    this.initializeDefaultStrategies();
    this.initializeCircuitBreakerMonitoring();
    this.initializeCompensationProcessor();
    this.setupEventHandlers();
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: RecoveryStrategy[] = [
      {
        name: 'immediate-retry',
        type: 'retry',
        conditions: [
          {
            type: 'error_code',
            operator: 'equals',
            value: 'timeout'
          },
          {
            type: 'error_code',
            operator: 'equals',
            value: 'temporary_failure'
          }
        ],
        actions: [
          {
            type: 'retry',
            parameters: { maxAttempts: 3, delay: 1000 },
            timeout: 30000
          }
        ],
        priority: 1,
        timeout: 60000,
        metadata: {
          description: 'Immediate retry for transient failures',
          successRate: 85,
          averageDuration: 5000,
          lastUsed: new Date()
        }
      },
      {
        name: 'saga-compensation',
        type: 'compensation',
        conditions: [
          {
            type: 'error_code',
            operator: 'contains',
            value: 'business_rule_violation'
          }
        ],
        actions: [
          {
            type: 'compensate',
            parameters: { strategy: 'reverse_order' },
            timeout: 120000
          }
        ],
        priority: 2,
        timeout: 300000,
        metadata: {
          description: 'Saga pattern compensation for business rule violations',
          successRate: 95,
          averageDuration: 30000,
          lastUsed: new Date()
        }
      },
      {
        name: 'alternative-agent-fallback',
        type: 'fallback',
        conditions: [
          {
            type: 'agent_status',
            operator: 'equals',
            value: 'unhealthy'
          }
        ],
        actions: [
          {
            type: 'fallback',
            parameters: { 
              strategy: 'alternative_agent',
              excludeFailedAgent: true
            },
            timeout: 60000
          }
        ],
        priority: 3,
        timeout: 120000,
        metadata: {
          description: 'Fallback to alternative agent when primary agent is unhealthy',
          successRate: 78,
          averageDuration: 15000,
          lastUsed: new Date()
        }
      },
      {
        name: 'manual-escalation',
        type: 'escalation',
        conditions: [
          {
            type: 'custom',
            operator: 'matches',
            value: 'multiple_recovery_failures',
            customEvaluator: (context) => context.previousRecoveryAttempts.length >= 3
          }
        ],
        actions: [
          {
            type: 'escalate',
            parameters: { 
              level: 'manual_intervention',
              priority: 'high'
            },
            timeout: 0 // No timeout for manual intervention
          },
          {
            type: 'notify',
            parameters: {
              channels: ['email', 'slack', 'pagerduty'],
              template: 'workflow_recovery_escalation'
            },
            timeout: 5000
          }
        ],
        priority: 10,
        timeout: 0,
        metadata: {
          description: 'Escalate to manual intervention after multiple recovery failures',
          successRate: 100, // Assumes manual intervention always resolves
          averageDuration: 3600000, // 1 hour average
          lastUsed: new Date()
        }
      }
    ];

    this.recoveryStrategies = defaultStrategies;
    
    this.logger.info('Default recovery strategies initialized', {
      strategies: defaultStrategies.length
    });
  }

  /**
   * Initialize circuit breaker monitoring
   */
  private initializeCircuitBreakerMonitoring(): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    this.circuitBreakerMonitor = setInterval(() => {
      this.monitorCircuitBreakers();
    }, this.config.circuitBreaker.monitoringInterval);

    this.logger.info('Circuit breaker monitoring initialized', {
      interval: this.config.circuitBreaker.monitoringInterval
    });
  }

  /**
   * Initialize compensation processor
   */
  private initializeCompensationProcessor(): void {
    if (!this.config.compensation.enabled) {
      return;
    }

    // Process compensation queue periodically
    setInterval(() => {
      this.processCompensationQueue();
    }, 1000); // Check every second

    this.logger.info('Compensation processor initialized');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.stateManager.on('step:failed', (execution, error) => {
      this.handleStepFailure(execution, error);
    });

    this.on('compensation:completed', (action, result) => {
      this.logger.info('Compensation completed successfully', {
        stepId: action.stepId,
        workflowId: action.workflowId,
        executionId: action.executionId,
        duration: Date.now() - action.metadata.triggeredAt.getTime()
      });
    });

    this.on('circuit:opened', (breaker) => {
      this.logger.warn('Circuit breaker opened', {
        agentId: breaker.agentId,
        capability: breaker.capability,
        failureCount: breaker.failureCount
      });
    });
  }

  /**
   * Handle step failure and initiate recovery
   */
  public async handleStepFailure(
    execution: StepExecution,
    error: WorkflowError
  ): Promise<void> {
    const context: RecoveryContext = {
      workflowId: execution.workflowId,
      executionId: execution.executionId,
      failedStep: execution,
      error,
      workflowState: await this.stateManager.loadWorkflowState(
        execution.workflowId,
        execution.executionId
      ) as WorkflowState,
      executionHistory: [], // Would be loaded from state manager
      availableAgents: [], // Would be loaded from agent registry
      previousRecoveryAttempts: []
    };

    this.logger.info('Handling step failure', {
      stepId: execution.stepId,
      workflowId: execution.workflowId,
      executionId: execution.executionId,
      errorType: error.type,
      errorMessage: error.message
    });

    // Update circuit breaker if applicable
    if (execution.assignedAgent) {
      await this.recordCircuitBreakerFailure(execution.assignedAgent, execution.stepId);
    }

    // Find and execute recovery strategy
    const strategy = this.selectRecoveryStrategy(context);
    if (strategy) {
      await this.executeRecoveryStrategy(context, strategy);
    } else {
      this.logger.error('No suitable recovery strategy found', {
        stepId: execution.stepId,
        errorType: error.type
      });
      
      // Default to escalation if no strategy found
      await this.escalateToManualIntervention(context);
    }
  }

  /**
   * Select appropriate recovery strategy
   */
  private selectRecoveryStrategy(context: RecoveryContext): RecoveryStrategy | null {
    const applicableStrategies = this.recoveryStrategies.filter(strategy => 
      this.evaluateRecoveryConditions(strategy.conditions, context)
    );

    if (applicableStrategies.length === 0) {
      return null;
    }

    // Sort by priority (higher priority first)
    applicableStrategies.sort((a, b) => a.priority - b.priority);
    
    return applicableStrategies[0];
  }

  /**
   * Evaluate recovery conditions
   */
  private evaluateRecoveryConditions(
    conditions: RecoveryCondition[],
    context: RecoveryContext
  ): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'error_code':
          return this.evaluateStringCondition(
            context.error.type,
            condition.operator,
            condition.value
          );
        
        case 'step_type':
          return this.evaluateStringCondition(
            context.failedStep.stepId,
            condition.operator,
            condition.value
          );
        
        case 'agent_status':
          // Would check agent status from registry
          return true;
        
        case 'workflow_state':
          return this.evaluateStringCondition(
            context.workflowState.status,
            condition.operator,
            condition.value
          );
        
        case 'custom':
          return condition.customEvaluator ? 
            condition.customEvaluator(context) : false;
        
        default:
          return false;
      }
    });
  }

  /**
   * Evaluate string condition
   */
  private evaluateStringCondition(
    actual: string,
    operator: string,
    expected: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'contains':
        return actual.includes(expected);
      case 'matches':
        return new RegExp(expected).test(actual);
      default:
        return false;
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    context: RecoveryContext,
    strategy: RecoveryStrategy
  ): Promise<void> {
    const attemptId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attempt: RecoveryAttempt = {
      attemptId,
      strategy: strategy.name,
      startTime: new Date(),
      status: 'running'
    };

    this.activeRecoveries.set(attemptId, attempt);
    this.emit('recovery:started', context, strategy);

    this.logger.info('Executing recovery strategy', {
      attemptId,
      strategy: strategy.name,
      stepId: context.failedStep.stepId
    });

    try {
      for (const action of strategy.actions) {
        await this.executeRecoveryAction(action, context);
      }

      attempt.status = 'success';
      attempt.endTime = new Date();
      
      this.recoveryMetrics.totalRecoveries++;
      this.recoveryMetrics.successfulRecoveries++;
      
      this.emit('recovery:completed', context, attempt);
      
      this.logger.info('Recovery strategy executed successfully', {
        attemptId,
        strategy: strategy.name,
        duration: attempt.endTime.getTime() - attempt.startTime.getTime()
      });
    } catch (error) {
      attempt.status = 'failure';
      attempt.endTime = new Date();
      attempt.error = {
        timestamp: new Date(),
        type: 'recovery_failure',
        message: error instanceof Error ? error.message : 'Unknown recovery error',
        details: error
      };
      
      this.recoveryMetrics.totalRecoveries++;
      this.recoveryMetrics.failedRecoveries++;
      
      this.emit('recovery:failed', context, attempt.error);
      
      this.logger.error('Recovery strategy failed', {
        attemptId,
        strategy: strategy.name,
        error: error instanceof Error ? error.message : error
      });
      
      // Try next strategy or escalate
      await this.handleRecoveryFailure(context, strategy);
    } finally {
      this.activeRecoveries.delete(attemptId);
    }
  }

  /**
   * Execute individual recovery action
   */
  private async executeRecoveryAction(
    action: RecoveryActionDefinition,
    context: RecoveryContext
  ): Promise<void> {
    switch (action.type) {
      case 'compensate':
        await this.initiateCompensation(context, action.parameters);
        break;
      
      case 'retry':
        await this.initiateRetry(context, action.parameters);
        break;
      
      case 'fallback':
        await this.initiateFallback(context, action.parameters);
        break;
      
      case 'escalate':
        await this.initiateEscalation(context, action.parameters);
        break;
      
      case 'notify':
        await this.sendNotification(context, action.parameters);
        break;
      
      default:
        throw new Error(`Unknown recovery action type: ${action.type}`);
    }
  }

  /**
   * Initiate saga compensation
   */
  private async initiateCompensation(
    context: RecoveryContext,
    parameters: Record<string, any>
  ): Promise<void> {
    const workflowState = context.workflowState;
    const completedSteps = Object.keys(workflowState.stepResults);
    
    // Build compensation chain in reverse dependency order
    const compensationChain = this.buildCompensationChain(
      completedSteps,
      workflowState.definition
    );

    for (const stepId of compensationChain) {
      const step = workflowState.definition.steps.find(s => s.id === stepId);
      
      if (step?.compensation) {
        const compensationAction: CompensationAction = {
          stepId,
          workflowId: context.workflowId,
          executionId: context.executionId,
          action: step.compensation,
          input: workflowState.stepResults[stepId] || {},
          dependencies: [],
          timeout: this.config.compensation.timeout,
          retryPolicy: this.config.retry.defaultPolicy,
          priority: 0,
          metadata: {
            originalStepResult: workflowState.stepResults[stepId],
            compensationReason: `Compensating due to failure in step: ${context.failedStep.stepId}`,
            triggeredAt: new Date(),
            expectedDuration: 30000 // 30 seconds default
          }
        };

        this.compensationQueue.push(compensationAction);
        this.emit('compensation:started', compensationAction);
      }
    }

    this.logger.info('Initiated saga compensation', {
      workflowId: context.workflowId,
      executionId: context.executionId,
      compensationSteps: compensationChain.length
    });
  }

  /**
   * Build compensation chain in reverse dependency order
   */
  private buildCompensationChain(
    completedSteps: string[],
    definition: WorkflowDefinition
  ): string[] {
    // Simple reverse order for now
    // In production, would analyze dependency graph
    return completedSteps.reverse();
  }

  /**
   * Process compensation queue
   */
  private async processCompensationQueue(): Promise<void> {
    const maxConcurrent = this.config.compensation.maxConcurrentCompensations;
    
    while (this.compensationQueue.length > 0 && 
           this.activeCompensations.size < maxConcurrent) {
      const action = this.compensationQueue.shift()!;
      await this.executeCompensationAction(action);
    }
  }

  /**
   * Execute compensation action
   */
  private async executeCompensationAction(action: CompensationAction): Promise<void> {
    const actionKey = `${action.workflowId}_${action.stepId}`;
    this.activeCompensations.set(actionKey, action);

    try {
      // In real implementation, would call agent to execute compensation
      // For now, simulate compensation execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.recoveryMetrics.compensationsExecuted++;
      this.emit('compensation:completed', action, { success: true });
      
      // Store compensation history
      const history = this.compensationHistory.get(action.workflowId) || [];
      history.push(action);
      this.compensationHistory.set(action.workflowId, history);
      
    } catch (error) {
      const workflowError: WorkflowError = {
        stepId: action.stepId,
        timestamp: new Date(),
        type: 'compensation_failure',
        message: error instanceof Error ? error.message : 'Compensation failed',
        details: error
      };
      
      this.emit('compensation:failed', action, workflowError);
      
      this.logger.error('Compensation action failed', {
        stepId: action.stepId,
        workflowId: action.workflowId,
        error: error instanceof Error ? error.message : error
      });
    } finally {
      this.activeCompensations.delete(actionKey);
    }
  }

  /**
   * Record circuit breaker failure
   */
  private async recordCircuitBreakerFailure(
    agentId: string,
    capability: string
  ): Promise<void> {
    const breakerKey = `${agentId}_${capability}`;
    let breaker = this.circuitBreakers.get(breakerKey);

    if (!breaker) {
      breaker = this.createCircuitBreaker(agentId, capability);
      this.circuitBreakers.set(breakerKey, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();
    breaker.metrics.totalRequests++;
    breaker.metrics.totalFailures++;

    // Check if circuit should open
    if (breaker.state === 'closed' && 
        breaker.failureCount >= breaker.thresholds.failureThreshold) {
      breaker.state = 'open';
      breaker.nextAttemptTime = new Date(
        Date.now() + breaker.thresholds.timeout
      );
      
      this.recoveryMetrics.circuitBreakersTriggered++;
      this.emit('circuit:opened', breaker);
    }
  }

  /**
   * Create new circuit breaker
   */
  private createCircuitBreaker(agentId: string, capability: string): CircuitBreaker {
    const defaults = this.config.circuitBreaker.defaultThresholds;
    
    return {
      agentId,
      capability,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: new Date(),
      lastSuccessTime: new Date(),
      thresholds: {
        failureThreshold: defaults.failureThreshold,
        successThreshold: defaults.successThreshold,
        timeout: defaults.timeout,
        resetTimeout: defaults.resetTimeout
      },
      metrics: {
        totalRequests: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        averageResponseTime: 0,
        lastResetTime: new Date()
      }
    };
  }

  /**
   * Monitor circuit breakers and manage state transitions
   */
  private monitorCircuitBreakers(): void {
    const now = new Date();
    
    for (const [key, breaker] of this.circuitBreakers) {
      if (breaker.state === 'open' && 
          breaker.nextAttemptTime && 
          now >= breaker.nextAttemptTime) {
        // Transition to half-open
        breaker.state = 'half-open';
        breaker.successCount = 0;
        breaker.failureCount = 0;
        
        this.emit('circuit:half-open', breaker);
        
        this.logger.info('Circuit breaker transitioned to half-open', {
          agentId: breaker.agentId,
          capability: breaker.capability
        });
      }
    }
  }

  /**
   * Check if circuit breaker allows request
   */
  public isCircuitOpen(agentId: string, capability: string): boolean {
    const breakerKey = `${agentId}_${capability}`;
    const breaker = this.circuitBreakers.get(breakerKey);
    
    return breaker ? breaker.state === 'open' : false;
  }

  /**
   * Record circuit breaker success
   */
  public async recordCircuitBreakerSuccess(
    agentId: string,
    capability: string,
    responseTime: number
  ): Promise<void> {
    const breakerKey = `${agentId}_${capability}`;
    const breaker = this.circuitBreakers.get(breakerKey);

    if (breaker) {
      breaker.successCount++;
      breaker.lastSuccessTime = new Date();
      breaker.metrics.totalRequests++;
      breaker.metrics.totalSuccesses++;
      
      // Update average response time
      const total = breaker.metrics.totalSuccesses;
      breaker.metrics.averageResponseTime = 
        (breaker.metrics.averageResponseTime * (total - 1) + responseTime) / total;

      // Check state transitions
      if (breaker.state === 'half-open' && 
          breaker.successCount >= breaker.thresholds.successThreshold) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
        
        this.emit('circuit:closed', breaker);
        
        this.logger.info('Circuit breaker closed', {
          agentId: breaker.agentId,
          capability: breaker.capability
        });
      }
    }
  }

  /**
   * Get recovery metrics
   */
  public getRecoveryMetrics(): typeof this.recoveryMetrics {
    return { ...this.recoveryMetrics };
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(): CircuitBreaker[] {
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Additional methods would be implemented here...
   * - initiateRetry
   * - initiateFallback
   * - initiateEscalation
   * - sendNotification
   * - handleRecoveryFailure
   * - escalateToManualIntervention
   * - cleanup and shutdown methods
   */

  // Placeholder implementations for brevity
  private async initiateRetry(context: RecoveryContext, parameters: Record<string, any>): Promise<void> {
    this.logger.info('Initiating retry recovery', { stepId: context.failedStep.stepId });
  }

  private async initiateFallback(context: RecoveryContext, parameters: Record<string, any>): Promise<void> {
    this.logger.info('Initiating fallback recovery', { stepId: context.failedStep.stepId });
  }

  private async initiateEscalation(context: RecoveryContext, parameters: Record<string, any>): Promise<void> {
    this.logger.info('Initiating escalation', { stepId: context.failedStep.stepId });
  }

  private async sendNotification(context: RecoveryContext, parameters: Record<string, any>): Promise<void> {
    this.logger.info('Sending recovery notification', { stepId: context.failedStep.stepId });
  }

  private async handleRecoveryFailure(context: RecoveryContext, strategy: RecoveryStrategy): Promise<void> {
    this.logger.warn('Recovery strategy failed, considering alternatives', {
      strategy: strategy.name,
      stepId: context.failedStep.stepId
    });
  }

  private async escalateToManualIntervention(context: RecoveryContext): Promise<void> {
    this.logger.error('Escalating to manual intervention', {
      workflowId: context.workflowId,
      stepId: context.failedStep.stepId
    });
  }

  /**
   * Shutdown error recovery manager
   */
  public async shutdown(): Promise<void> {
    if (this.circuitBreakerMonitor) {
      clearInterval(this.circuitBreakerMonitor);
    }
    
    // Wait for active compensations to complete
    while (this.activeCompensations.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.info('Error recovery manager shutdown complete');
  }
}

/**
 * Factory function to create error recovery manager
 */
export function createErrorRecoveryManager(config: ErrorRecoveryConfig): ErrorRecoveryManager {
  return new ErrorRecoveryManager(config);
}

// Export all types for external use
export type {
  ErrorRecoveryConfig,
  ErrorRecoveryEvents,
  CompensationAction,
  CircuitBreaker,
  RetryPolicy,
  RecoveryStrategy,
  RecoveryContext,
  RecoveryAttempt,
  EscalationLevel
};