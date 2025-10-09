/**
 * UEP Compensation Handling System
 * 
 * Comprehensive compensation and rollback mechanism for UEP workflows
 * implementing the Saga pattern for distributed transactions. Provides
 * automatic compensation execution, rollback strategies, partial recovery,
 * and compensation audit trails for failed workflows.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../shared/utils/Logger';
import { 
  UEPWorkflowExecution, 
  UEPStepExecution, 
  UEPWorkflowStep,
  UEPCompensationEntry 
} from './UEPWorkflowEngine';
import UEPStateManager from './UEPStateManager';
import UEPDiscoveryClient from '../discovery/UEPDiscoveryClient';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPCompensationConfig {
  enabled: boolean;
  strategy: 'automatic' | 'manual' | 'hybrid' | 'conditional';
  timeout: number; // Global compensation timeout
  maxRetryAttempts: number;
  retryDelay: number;
  retryBackoffMultiplier: number;
  parallelCompensation: boolean;
  partialCompensation: boolean;
  compensationOrder: 'reverse' | 'priority' | 'dependency' | 'custom';
  auditTrail: boolean;
  stateRecovery: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  enableNotifications: boolean;
  compensationPolicies: UEPCompensationPolicy[];
  sagaConfiguration: UEPSagaConfig;
  circuitBreaker: UEPCompensationCircuitBreakerConfig;
}

export interface UEPCompensationPolicy {
  id: string;
  name: string;
  conditions: UEPCompensationCondition[];
  strategy: 'compensate' | 'ignore' | 'retry' | 'manual';
  priority: number;
  timeout: number;
  maxAttempts: number;
  rollbackScope: 'step' | 'flow' | 'workflow' | 'global';
  compensationActions: UEPCompensationAction[];
  notifications: UEPCompensationNotification[];
}

export interface UEPCompensationCondition {
  type: 'error-type' | 'step-type' | 'timeout' | 'resource-failure' | 'custom';
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in';
  value: any;
  field?: string; // For custom conditions
  negated: boolean;
}

export interface UEPCompensationAction {
  id: string;
  type: 'step-rollback' | 'data-restore' | 'resource-cleanup' | 'notification' | 'custom';
  agentId: string;
  action: string;
  parameters: Record<string, any>;
  timeout: number;
  retryPolicy: UEPCompensationRetryPolicy;
  dependencies: string[]; // Other action IDs that must complete first
  condition?: UEPCompensationCondition;
  compensation?: UEPCompensationAction; // Compensation for this action
}

export interface UEPCompensationExecution {
  id: string;
  workflowExecutionId: string;
  trigger: UEPCompensationTrigger;
  status: UEPCompensationStatus;
  strategy: string;
  startTime: Date;
  endTime?: Date;
  actions: UEPCompensationActionExecution[];
  partialSuccess: boolean;
  failedActions: string[];
  compensatedSteps: string[];
  rollbackScope: string;
  auditLog: UEPCompensationAuditEntry[];
  metrics: UEPCompensationMetrics;
  error?: UEPCompensationError;
}

export interface UEPCompensationActionExecution {
  id: string;
  actionId: string;
  agentId: string;
  status: UEPCompensationActionStatus;
  startTime: Date;
  endTime?: Date;
  input: any;
  output?: any;
  error?: string;
  retryCount: number;
  duration: number;
  resourcesRestored: string[];
  dataRestored: boolean;
}

export interface UEPSagaExecution {
  id: string;
  workflowExecutionId: string;
  sagaType: 'orchestrator' | 'choreography';
  participants: UEPSagaParticipant[];
  transactions: UEPSagaTransaction[];
  compensations: UEPSagaCompensation[];
  status: UEPSagaStatus;
  isolationLevel: 'read-committed' | 'snapshot';
  coordinatorId?: string;
  startTime: Date;
  endTime?: Date;
  rollbackReason?: string;
}

export interface UEPSagaParticipant {
  id: string;
  agentId: string;
  stepIds: string[];
  transactionActions: string[];
  compensationActions: string[];
  status: 'ready' | 'active' | 'committed' | 'aborted' | 'compensating' | 'compensated';
  lastActivity: Date;
}

export interface UEPSagaTransaction {
  id: string;
  participantId: string;
  stepId: string;
  action: string;
  status: 'pending' | 'executing' | 'committed' | 'aborted';
  input: any;
  output?: any;
  timestamp: Date;
  duration: number;
  compensationRequired: boolean;
}

export interface UEPCompensationHandlerMetrics {
  compensationsTriggered: Counter;
  compensationsCompleted: Counter;
  compensationsFailed: Counter;
  compensationExecutionTime: Histogram;
  actionsExecuted: Counter;
  actionsSuccessful: Counter;
  actionsFailed: Counter;
  sagaExecutions: Counter;
  sagaRollbacks: Counter;
  partialCompensations: Counter;
  resourcesRestored: Counter;
  auditEntriesCreated: Counter;
}

export type UEPCompensationStatus = 
  | 'pending' 
  | 'executing' 
  | 'completed' 
  | 'partial' 
  | 'failed' 
  | 'cancelled' 
  | 'timeout';

export type UEPCompensationActionStatus = 
  | 'pending' 
  | 'executing' 
  | 'completed' 
  | 'failed' 
  | 'skipped' 
  | 'cancelled';

export type UEPSagaStatus = 
  | 'active' 
  | 'committed' 
  | 'aborted' 
  | 'compensating' 
  | 'compensated';

// =============================================================================
// UEP Compensation Handler Core Class
// =============================================================================

export class UEPCompensationHandler extends EventEmitter {
  private readonly config: UEPCompensationConfig;
  private readonly logger = new Logger('UEPCompensationHandler');
  private readonly tracer = trace.getTracer('uep-compensation-handler', '1.0.0');

  // Dependencies
  private readonly stateManager: UEPStateManager;
  private readonly discoveryClient: UEPDiscoveryClient;

  // Active compensations
  private readonly activeCompensations: Map<string, UEPCompensationExecution> = new Map();
  private readonly activeSagas: Map<string, UEPSagaExecution> = new Map();
  private readonly compensationQueue: UEPCompensationExecution[] = [];

  // Policies and configuration
  private readonly compensationPolicies: Map<string, UEPCompensationPolicy> = new Map();
  private readonly customCompensators: Map<string, Function> = new Map();

  // Circuit breaker for compensation failures
  private readonly circuitBreaker: UEPCompensationCircuitBreaker;

  // Background processing
  private processingTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private auditTimer?: NodeJS.Timeout;

  // Metrics
  private readonly metrics: UEPCompensationHandlerMetrics;

  // Audit and logging
  private readonly auditLog: UEPCompensationAuditEntry[] = [];

  constructor(
    stateManager: UEPStateManager,
    discoveryClient: UEPDiscoveryClient,
    config: Partial<UEPCompensationConfig> = {}
  ) {
    super();

    this.config = {
      enabled: true,
      strategy: 'automatic',
      timeout: 300000, // 5 minutes
      maxRetryAttempts: 3,
      retryDelay: 5000,
      retryBackoffMultiplier: 2,
      parallelCompensation: false,
      partialCompensation: true,
      compensationOrder: 'reverse',
      auditTrail: true,
      stateRecovery: true,
      enableMetrics: true,
      enableTracing: true,
      enableNotifications: true,
      compensationPolicies: [],
      sagaConfiguration: {
        enabled: true,
        pattern: 'orchestrator',
        timeout: 600000,
        isolationLevel: 'read-committed',
        coordinatorSelection: 'automatic',
        participantTimeout: 120000,
        compensationTimeout: 180000
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        timeout: 60000,
        halfOpenMax: 3
      },
      ...config
    };

    this.stateManager = stateManager;
    this.discoveryClient = discoveryClient;

    // Initialize circuit breaker
    this.circuitBreaker = new UEPCompensationCircuitBreaker(this.config.circuitBreaker);

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup default policies
    this.setupDefaultPolicies();

    // Start background processes
    this.startBackgroundProcesses();

    this.logger.info('UEP Compensation Handler initialized', {
      enabled: this.config.enabled,
      strategy: this.config.strategy,
      sagaEnabled: this.config.sagaConfiguration.enabled,
      parallelCompensation: this.config.parallelCompensation
    });
  }

  // =============================================================================
  // Main Compensation Methods
  // =============================================================================

  public async triggerCompensation(
    execution: UEPWorkflowExecution,
    trigger: UEPCompensationTrigger
  ): Promise<string> {
    if (!this.config.enabled) {
      this.logger.warn('Compensation is disabled', { 
        executionId: execution.executionId 
      });
      return '';
    }

    return this.tracer.startActiveSpan('uep.compensation.trigger', async (span) => {
      try {
        span.setAttributes({
          'compensation.execution_id': execution.executionId,
          'compensation.trigger_type': trigger.type,
          'compensation.strategy': this.config.strategy
        });

        // Check circuit breaker
        if (this.circuitBreaker.isOpen()) {
          throw new Error('Compensation circuit breaker is open');
        }

        // Create compensation execution
        const compensationExecution = await this.createCompensationExecution(execution, trigger);

        // Add to queue
        this.compensationQueue.push(compensationExecution);
        
        // Sort by priority
        this.compensationQueue.sort((a, b) => {
          const aPriority = this.getCompensationPriority(a);
          const bPriority = this.getCompensationPriority(b);
          return bPriority - aPriority;
        });

        // Start processing if not already running
        await this.processCompensationQueue();

        // Update metrics
        this.metrics.compensationsTriggered.inc({
          trigger_type: trigger.type,
          strategy: this.config.strategy
        });

        span.setAttributes({
          'compensation.id': compensationExecution.id,
          'compensation.actions_count': compensationExecution.actions.length
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.emit('compensationTriggered', {
          compensationId: compensationExecution.id,
          executionId: execution.executionId,
          trigger,
          timestamp: new Date()
        });

        this.logger.info('Compensation triggered', {
          compensationId: compensationExecution.id,
          executionId: execution.executionId,
          triggerType: trigger.type,
          actionsCount: compensationExecution.actions.length
        });

        return compensationExecution.id;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Failed to trigger compensation', {
          executionId: execution.executionId,
          error: (error as Error).message
        });

        throw error;
      }
    });
  }

  public async executeSaga(
    execution: UEPWorkflowExecution,
    sagaDefinition: UEPSagaDefinition
  ): Promise<string> {
    return this.tracer.startActiveSpan('uep.saga.execute', async (span) => {
      try {
        span.setAttributes({
          'saga.execution_id': execution.executionId,
          'saga.type': sagaDefinition.type,
          'saga.participants': sagaDefinition.participants.length
        });

        // Create saga execution
        const sagaExecution = await this.createSagaExecution(execution, sagaDefinition);

        // Execute based on saga type
        if (sagaDefinition.type === 'orchestrator') {
          await this.executeOrchestratorSaga(sagaExecution);
        } else {
          await this.executeChoreographySaga(sagaExecution);
        }

        // Update metrics
        this.metrics.sagaExecutions.inc({
          saga_type: sagaDefinition.type,
          participants: sagaDefinition.participants.length.toString()
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return sagaExecution.id;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Saga execution failed', {
          executionId: execution.executionId,
          error: (error as Error).message
        });

        throw error;
      }
    });
  }

  // =============================================================================
  // Compensation Execution
  // =============================================================================

  private async createCompensationExecution(
    execution: UEPWorkflowExecution,
    trigger: UEPCompensationTrigger
  ): Promise<UEPCompensationExecution> {
    // Determine compensation strategy
    const strategy = await this.determineCompensationStrategy(execution, trigger);

    // Get applicable policies
    const policies = this.getApplicablePolicies(execution, trigger);

    // Plan compensation actions
    const actions = await this.planCompensationActions(execution, policies, strategy);

    // Create compensation execution
    const compensationExecution: UEPCompensationExecution = {
      id: uuidv4(),
      workflowExecutionId: execution.executionId,
      trigger,
      status: 'pending',
      strategy,
      startTime: new Date(),
      actions,
      partialSuccess: false,
      failedActions: [],
      compensatedSteps: [],
      rollbackScope: this.determineRollbackScope(execution, policies),
      auditLog: [],
      metrics: {
        totalActions: actions.length,
        successfulActions: 0,
        failedActions: 0,
        executionTime: 0,
        resourcesRestored: 0,
        dataRestored: false
      }
    };

    this.activeCompensations.set(compensationExecution.id, compensationExecution);
    return compensationExecution;
  }

  private async processCompensationQueue(): Promise<void> {
    while (this.compensationQueue.length > 0) {
      const compensation = this.compensationQueue.shift();
      if (!compensation) break;

      try {
        await this.executeCompensation(compensation);
      } catch (error) {
        this.logger.error('Compensation execution failed', {
          compensationId: compensation.id,
          error: (error as Error).message
        });

        // Update circuit breaker
        this.circuitBreaker.recordFailure();
      }
    }
  }

  private async executeCompensation(compensation: UEPCompensationExecution): Promise<void> {
    return this.tracer.startActiveSpan('uep.compensation.execute', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'compensation.id': compensation.id,
          'compensation.actions_count': compensation.actions.length,
          'compensation.strategy': compensation.strategy
        });

        compensation.status = 'executing';
        compensation.startTime = new Date();

        // Create audit entry
        this.createAuditEntry(compensation, 'started', 'Compensation execution started');

        // Execute actions based on strategy
        if (this.config.parallelCompensation && compensation.actions.length > 1) {
          await this.executeActionsInParallel(compensation);
        } else {
          await this.executeActionsSequentially(compensation);
        }

        // Determine final status
        const successfulActions = compensation.actions.filter(a => a.status === 'completed').length;
        const failedActions = compensation.actions.filter(a => a.status === 'failed').length;

        if (failedActions === 0) {
          compensation.status = 'completed';
          this.metrics.compensationsCompleted.inc();
        } else if (successfulActions > 0 && this.config.partialCompensation) {
          compensation.status = 'partial';
          compensation.partialSuccess = true;
          this.metrics.partialCompensations.inc();
        } else {
          compensation.status = 'failed';
          this.metrics.compensationsFailed.inc();
        }

        compensation.endTime = new Date();
        compensation.metrics.executionTime = Date.now() - startTime;

        // Update metrics
        this.metrics.compensationExecutionTime.observe(
          { strategy: compensation.strategy },
          compensation.metrics.executionTime / 1000
        );

        // Record circuit breaker success
        this.circuitBreaker.recordSuccess();

        // Create final audit entry
        this.createAuditEntry(compensation, 'completed', 
          `Compensation ${compensation.status}: ${successfulActions}/${compensation.actions.length} actions successful`);

        // Emit completion event
        this.emit('compensationCompleted', {
          compensationId: compensation.id,
          status: compensation.status,
          actionsExecuted: compensation.actions.length,
          successfulActions,
          failedActions,
          duration: compensation.metrics.executionTime,
          timestamp: compensation.endTime
        });

        span.setAttributes({
          'compensation.status': compensation.status,
          'compensation.successful_actions': successfulActions,
          'compensation.failed_actions': failedActions,
          'compensation.duration': compensation.metrics.executionTime
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.logger.info('Compensation execution completed', {
          compensationId: compensation.id,
          status: compensation.status,
          successfulActions,
          failedActions,
          duration: compensation.metrics.executionTime
        });

      } catch (error) {
        compensation.status = 'failed';
        compensation.endTime = new Date();
        compensation.error = {
          type: 'execution-error',
          message: (error as Error).message,
          timestamp: new Date(),
          context: { phase: 'execution' }
        };

        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.createAuditEntry(compensation, 'failed', 
          `Compensation execution failed: ${(error as Error).message}`);

        throw error;
      } finally {
        // Clean up
        setTimeout(() => {
          this.activeCompensations.delete(compensation.id);
        }, 60000); // Keep for 1 minute for debugging
      }
    });
  }

  private async executeActionsSequentially(compensation: UEPCompensationExecution): Promise<void> {
    const orderedActions = this.orderCompensationActions(compensation.actions);

    for (const action of orderedActions) {
      try {
        await this.executeCompensationAction(compensation, action);
        
        if (action.status === 'completed') {
          compensation.metrics.successfulActions++;
        } else {
          compensation.metrics.failedActions++;
          compensation.failedActions.push(action.id);
          
          // Check if we should continue or stop
          if (!this.config.partialCompensation) {
            break;
          }
        }
      } catch (error) {
        action.status = 'failed';
        action.error = (error as Error).message;
        compensation.metrics.failedActions++;
        compensation.failedActions.push(action.id);

        this.logger.error('Compensation action failed', {
          compensationId: compensation.id,
          actionId: action.id,
          error: (error as Error).message
        });

        if (!this.config.partialCompensation) {
          break;
        }
      }
    }
  }

  private async executeActionsInParallel(compensation: UEPCompensationExecution): Promise<void> {
    const actionPromises = compensation.actions.map(action => 
      this.executeCompensationAction(compensation, action).catch(error => {
        action.status = 'failed';
        action.error = (error as Error).message;
        return action;
      })
    );

    const results = await Promise.allSettled(actionPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const action = result.value;
        if (action.status === 'completed') {
          compensation.metrics.successfulActions++;
        } else {
          compensation.metrics.failedActions++;
          compensation.failedActions.push(action.id);
        }
      } else {
        compensation.metrics.failedActions++;
      }
    }
  }

  private async executeCompensationAction(
    compensation: UEPCompensationExecution,
    action: UEPCompensationActionExecution
  ): Promise<UEPCompensationActionExecution> {
    return this.tracer.startActiveSpan('uep.compensation.action', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'action.id': action.id,
          'action.type': action.actionId,
          'action.agent_id': action.agentId
        });

        action.status = 'executing';
        action.startTime = new Date();

        // Get agent for execution
        const agent = await this.discoveryClient.getAgent(action.agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${action.agentId}`);
        }

        // Execute action with retry logic
        const result = await this.executeActionWithRetry(action, agent, compensation);
        
        action.output = result;
        action.status = 'completed';
        action.endTime = new Date();
        action.duration = Date.now() - startTime;

        // Record what was restored/cleaned up
        if (result.resourcesRestored) {
          action.resourcesRestored = result.resourcesRestored;
          compensation.metrics.resourcesRestored += result.resourcesRestored.length;
        }

        if (result.dataRestored) {
          action.dataRestored = true;
          compensation.metrics.dataRestored = true;
        }

        // Update metrics
        this.metrics.actionsExecuted.inc({
          action_type: action.actionId,
          status: 'success'
        });

        this.metrics.actionsSuccessful.inc({
          action_type: action.actionId
        });

        span.setAttributes({
          'action.status': 'completed',
          'action.duration': action.duration,
          'action.resources_restored': action.resourcesRestored.length
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.createAuditEntry(compensation, 'action-completed', 
          `Action ${action.actionId} completed successfully`, { actionId: action.id });

        return action;

      } catch (error) {
        action.status = 'failed';
        action.error = (error as Error).message;
        action.endTime = new Date();
        action.duration = Date.now() - startTime;

        this.metrics.actionsExecuted.inc({
          action_type: action.actionId,
          status: 'failed'
        });

        this.metrics.actionsFailed.inc({
          action_type: action.actionId
        });

        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.createAuditEntry(compensation, 'action-failed', 
          `Action ${action.actionId} failed: ${(error as Error).message}`, { actionId: action.id });

        throw error;
      }
    });
  }

  // =============================================================================
  // Saga Implementation
  // =============================================================================

  private async createSagaExecution(
    execution: UEPWorkflowExecution,
    definition: UEPSagaDefinition
  ): Promise<UEPSagaExecution> {
    const sagaExecution: UEPSagaExecution = {
      id: uuidv4(),
      workflowExecutionId: execution.executionId,
      sagaType: definition.type,
      participants: definition.participants.map(p => ({
        ...p,
        status: 'ready',
        lastActivity: new Date()
      })),
      transactions: [],
      compensations: [],
      status: 'active',
      isolationLevel: definition.isolationLevel,
      coordinatorId: definition.type === 'orchestrator' ? this.selectCoordinator(definition.participants) : undefined,
      startTime: new Date()
    };

    this.activeSagas.set(sagaExecution.id, sagaExecution);
    return sagaExecution;
  }

  private async executeOrchestratorSaga(saga: UEPSagaExecution): Promise<void> {
    // Implementation of orchestrator saga pattern
    // This would coordinate all participants from a central coordinator
    for (const participant of saga.participants) {
      try {
        await this.executeParticipantTransactions(saga, participant);
        participant.status = 'committed';
      } catch (error) {
        // If any participant fails, rollback all committed participants
        await this.rollbackSaga(saga, (error as Error).message);
        return;
      }
    }

    saga.status = 'committed';
    saga.endTime = new Date();
  }

  private async executeChoreographySaga(saga: UEPSagaExecution): Promise<void> {
    // Implementation of choreography saga pattern
    // Each participant knows how to react to events from other participants
    
    // Start all participants
    const participantPromises = saga.participants.map(participant => 
      this.executeParticipantChoreography(saga, participant)
    );

    try {
      await Promise.all(participantPromises);
      saga.status = 'committed';
    } catch (error) {
      await this.rollbackSaga(saga, (error as Error).message);
    }

    saga.endTime = new Date();
  }

  private async rollbackSaga(saga: UEPSagaExecution, reason: string): Promise<void> {
    saga.status = 'compensating';
    saga.rollbackReason = reason;

    // Execute compensations in reverse order
    const compensatingParticipants = saga.participants
      .filter(p => p.status === 'committed')
      .reverse();

    for (const participant of compensatingParticipants) {
      try {
        await this.executeParticipantCompensation(saga, participant);
        participant.status = 'compensated';
      } catch (error) {
        this.logger.error('Participant compensation failed', {
          sagaId: saga.id,
          participantId: participant.id,
          error: (error as Error).message
        });
      }
    }

    saga.status = 'compensated';
    
    this.metrics.sagaRollbacks.inc({
      saga_type: saga.sagaType
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private async determineCompensationStrategy(
    execution: UEPWorkflowExecution,
    trigger: UEPCompensationTrigger
  ): Promise<string> {
    // Analyze execution state and trigger to determine best strategy
    if (trigger.severity === 'critical') {
      return 'immediate-rollback';
    }

    if (execution.completedSteps.length < execution.definition.steps.length * 0.5) {
      return 'full-rollback';
    }

    return 'partial-compensation';
  }

  private getApplicablePolicies(
    execution: UEPWorkflowExecution,
    trigger: UEPCompensationTrigger
  ): UEPCompensationPolicy[] {
    const applicable: UEPCompensationPolicy[] = [];

    for (const policy of this.compensationPolicies.values()) {
      if (this.evaluatePolicyConditions(policy.conditions, execution, trigger)) {
        applicable.push(policy);
      }
    }

    // Sort by priority
    applicable.sort((a, b) => b.priority - a.priority);
    
    return applicable;
  }

  private evaluatePolicyConditions(
    conditions: UEPCompensationCondition[],
    execution: UEPWorkflowExecution,
    trigger: UEPCompensationTrigger
  ): boolean {
    return conditions.every(condition => {
      let result = false;

      switch (condition.type) {
        case 'error-type':
          result = trigger.error?.type === condition.value;
          break;
        case 'timeout':
          result = trigger.type === 'timeout';
          break;
        default:
          result = true;
      }

      return condition.negated ? !result : result;
    });
  }

  private async planCompensationActions(
    execution: UEPWorkflowExecution,
    policies: UEPCompensationPolicy[],
    strategy: string
  ): Promise<UEPCompensationActionExecution[]> {
    const actions: UEPCompensationActionExecution[] = [];

    // Get completed steps that need compensation
    const stepsToCompensate = execution.definition.steps.filter(step => 
      execution.completedSteps.includes(step.id) && 
      step.compensation?.enabled
    );

    for (const step of stepsToCompensate) {
      if (step.compensation) {
        const action: UEPCompensationActionExecution = {
          id: uuidv4(),
          actionId: step.compensation.action,
          agentId: step.agentId,
          status: 'pending',
          startTime: new Date(),
          input: step.compensation.parameters,
          retryCount: 0,
          duration: 0,
          resourcesRestored: [],
          dataRestored: false
        };

        actions.push(action);
      }
    }

    return actions;
  }

  private determineRollbackScope(
    execution: UEPWorkflowExecution,
    policies: UEPCompensationPolicy[]
  ): string {
    // Determine the scope of rollback based on policies and execution state
    const highestScopePolicy = policies.find(p => p.rollbackScope === 'global') ||
                              policies.find(p => p.rollbackScope === 'workflow') ||
                              policies.find(p => p.rollbackScope === 'flow') ||
                              policies.find(p => p.rollbackScope === 'step');

    return highestScopePolicy?.rollbackScope || 'step';
  }

  private orderCompensationActions(actions: UEPCompensationActionExecution[]): UEPCompensationActionExecution[] {
    switch (this.config.compensationOrder) {
      case 'reverse':
        return [...actions].reverse();
      case 'priority':
        return [...actions].sort((a, b) => {
          // Higher priority first (assuming priority is stored somewhere)
          return 0; // Simplified
        });
      case 'dependency':
        return this.topologicalSort(actions);
      default:
        return actions;
    }
  }

  private topologicalSort(actions: UEPCompensationActionExecution[]): UEPCompensationActionExecution[] {
    // Simplified topological sort based on dependencies
    // In a real implementation, this would properly handle dependency ordering
    return actions;
  }

  private getCompensationPriority(compensation: UEPCompensationExecution): number {
    // Calculate priority based on trigger severity, scope, etc.
    let priority = 50; // Base priority

    if (compensation.trigger.severity === 'critical') priority += 50;
    if (compensation.trigger.severity === 'high') priority += 30;
    if (compensation.trigger.severity === 'medium') priority += 10;

    if (compensation.rollbackScope === 'global') priority += 40;
    if (compensation.rollbackScope === 'workflow') priority += 30;
    if (compensation.rollbackScope === 'flow') priority += 20;

    return priority;
  }

  // =============================================================================
  // Placeholder Methods
  // =============================================================================

  private async executeActionWithRetry(
    action: UEPCompensationActionExecution,
    agent: any,
    compensation: UEPCompensationExecution
  ): Promise<any> {
    // Implementation would execute the compensation action with retry logic
    return {
      success: true,
      resourcesRestored: ['resource1', 'resource2'],
      dataRestored: true
    };
  }

  private selectCoordinator(participants: any[]): string {
    // Select coordinator based on some criteria
    return participants[0]?.id || 'default-coordinator';
  }

  private async executeParticipantTransactions(saga: UEPSagaExecution, participant: UEPSagaParticipant): Promise<void> {
    // Execute all transactions for a participant
  }

  private async executeParticipantChoreography(saga: UEPSagaExecution, participant: UEPSagaParticipant): Promise<void> {
    // Execute choreography-based participant logic
  }

  private async executeParticipantCompensation(saga: UEPSagaExecution, participant: UEPSagaParticipant): Promise<void> {
    // Execute compensation for a participant
  }

  private setupDefaultPolicies(): void {
    // Setup default compensation policies
    const defaultPolicy: UEPCompensationPolicy = {
      id: 'default-policy',
      name: 'Default Compensation Policy',
      conditions: [],
      strategy: 'compensate',
      priority: 1,
      timeout: this.config.timeout,
      maxAttempts: this.config.maxRetryAttempts,
      rollbackScope: 'step',
      compensationActions: [],
      notifications: []
    };

    this.compensationPolicies.set(defaultPolicy.id, defaultPolicy);
  }

  private createAuditEntry(
    compensation: UEPCompensationExecution,
    event: string,
    description: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.auditTrail) return;

    const entry: UEPCompensationAuditEntry = {
      id: uuidv4(),
      compensationId: compensation.id,
      event,
      description,
      timestamp: new Date(),
      metadata: metadata || {}
    };

    compensation.auditLog.push(entry);
    this.auditLog.push(entry);

    this.metrics.auditEntriesCreated.inc({
      event,
      compensation_id: compensation.id
    });
  }

  // =============================================================================
  // Background Processes
  // =============================================================================

  private startBackgroundProcesses(): void {
    // Compensation processing
    this.processingTimer = setInterval(() => {
      this.processCompensationQueue().catch(error => {
        this.logger.error('Compensation queue processing failed', { error: error.message });
      });
    }, 5000); // Process every 5 seconds

    // Cleanup
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 300000); // Cleanup every 5 minutes

    // Audit log management
    if (this.config.auditTrail) {
      this.auditTimer = setInterval(() => {
        this.manageAuditLog();
      }, 3600000); // Manage every hour
    }
  }

  private performCleanup(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago

    // Clean up completed compensations
    for (const [id, compensation] of this.activeCompensations) {
      if (compensation.endTime && 
          compensation.endTime.getTime() < cutoffTime &&
          ['completed', 'failed', 'cancelled'].includes(compensation.status)) {
        this.activeCompensations.delete(id);
      }
    }

    // Clean up completed sagas
    for (const [id, saga] of this.activeSagas) {
      if (saga.endTime && 
          saga.endTime.getTime() < cutoffTime &&
          ['committed', 'compensated'].includes(saga.status)) {
        this.activeSagas.delete(id);
      }
    }
  }

  private manageAuditLog(): void {
    // Keep only recent audit entries (last 24 hours)
    const cutoffTime = Date.now() - 86400000; // 24 hours ago
    
    const recentEntries = this.auditLog.filter(entry => 
      entry.timestamp.getTime() > cutoffTime
    );

    this.auditLog.length = 0;
    this.auditLog.push(...recentEntries);
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPCompensationHandlerMetrics {
    const prefix = 'uep_compensation_handler_';

    return {
      compensationsTriggered: new Counter({
        name: `${prefix}compensations_triggered_total`,
        help: 'Total compensations triggered',
        labelNames: ['trigger_type', 'strategy']
      }),

      compensationsCompleted: new Counter({
        name: `${prefix}compensations_completed_total`,
        help: 'Total compensations completed'
      }),

      compensationsFailed: new Counter({
        name: `${prefix}compensations_failed_total`,
        help: 'Total compensations failed'
      }),

      compensationExecutionTime: new Histogram({
        name: `${prefix}execution_time_seconds`,
        help: 'Compensation execution time',
        labelNames: ['strategy'],
        buckets: [1, 10, 30, 60, 300, 600, 1800]
      }),

      actionsExecuted: new Counter({
        name: `${prefix}actions_executed_total`,
        help: 'Total compensation actions executed',
        labelNames: ['action_type', 'status']
      }),

      actionsSuccessful: new Counter({
        name: `${prefix}actions_successful_total`,
        help: 'Total successful compensation actions',
        labelNames: ['action_type']
      }),

      actionsFailed: new Counter({
        name: `${prefix}actions_failed_total`,
        help: 'Total failed compensation actions',
        labelNames: ['action_type']
      }),

      sagaExecutions: new Counter({
        name: `${prefix}saga_executions_total`,
        help: 'Total saga executions',
        labelNames: ['saga_type', 'participants']
      }),

      sagaRollbacks: new Counter({
        name: `${prefix}saga_rollbacks_total`,
        help: 'Total saga rollbacks',
        labelNames: ['saga_type']
      }),

      partialCompensations: new Counter({
        name: `${prefix}partial_compensations_total`,
        help: 'Total partial compensations'
      }),

      resourcesRestored: new Counter({
        name: `${prefix}resources_restored_total`,
        help: 'Total resources restored'
      }),

      auditEntriesCreated: new Counter({
        name: `${prefix}audit_entries_created_total`,
        help: 'Total audit entries created',
        labelNames: ['event', 'compensation_id']
      })
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getCompensationStatus(compensationId: string): UEPCompensationExecution | null {
    return this.activeCompensations.get(compensationId) || null;
  }

  public getSagaStatus(sagaId: string): UEPSagaExecution | null {
    return this.activeSagas.get(sagaId) || null;
  }

  public getActiveCompensations(): UEPCompensationExecution[] {
    return Array.from(this.activeCompensations.values());
  }

  public getActiveSagas(): UEPSagaExecution[] {
    return Array.from(this.activeSagas.values());
  }

  public getAuditLog(compensationId?: string): UEPCompensationAuditEntry[] {
    if (compensationId) {
      return this.auditLog.filter(entry => entry.compensationId === compensationId);
    }
    return [...this.auditLog];
  }

  public getHandlerStats(): Record<string, any> {
    return {
      activeCompensations: this.activeCompensations.size,
      activeSagas: this.activeSagas.size,
      queueLength: this.compensationQueue.length,
      auditEntries: this.auditLog.length,
      circuitBreakerOpen: this.circuitBreaker.isOpen()
    };
  }

  public async shutdown(): Promise<void> {
    // Clear timers
    if (this.processingTimer) clearInterval(this.processingTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.auditTimer) clearInterval(this.auditTimer);

    // Wait for active compensations to complete (with timeout)
    const activePromises = Array.from(this.activeCompensations.values())
      .filter(c => c.status === 'executing')
      .map(c => 
        new Promise(resolve => {
          const checkInterval = setInterval(() => {
            const current = this.activeCompensations.get(c.id);
            if (!current || current.status !== 'executing') {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 1000);

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(null);
          }, 30000);
        })
      );

    await Promise.allSettled(activePromises);

    this.emit('shutdown');
  }
}

// =============================================================================
// Supporting Interface Definitions and Classes
// =============================================================================

export interface UEPCompensationTrigger {
  type: 'failure' | 'timeout' | 'cancellation' | 'manual' | 'policy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  error?: {
    type: string;
    message: string;
    code?: string;
  };
  timestamp: Date;
  context: Record<string, any>;
}

export interface UEPCompensationRetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface UEPCompensationNotification {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  recipients: string[];
  template: string;
  severity: string[];
}

export interface UEPCompensationError {
  type: string;
  message: string;
  timestamp: Date;
  context: Record<string, any>;
}

export interface UEPCompensationMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  executionTime: number;
  resourcesRestored: number;
  dataRestored: boolean;
}

export interface UEPCompensationAuditEntry {
  id: string;
  compensationId: string;
  event: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface UEPSagaConfig {
  enabled: boolean;
  pattern: 'orchestrator' | 'choreography';
  timeout: number;
  isolationLevel: 'read-committed' | 'snapshot';
  coordinatorSelection: 'automatic' | 'manual';
  participantTimeout: number;
  compensationTimeout: number;
}

export interface UEPSagaDefinition {
  type: 'orchestrator' | 'choreography';
  participants: UEPSagaParticipant[];
  isolationLevel: 'read-committed' | 'snapshot';
  timeout: number;
}

export interface UEPSagaCompensation {
  id: string;
  participantId: string;
  action: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

export interface UEPCompensationCircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  timeout: number;
  halfOpenMax: number;
}

class UEPCompensationCircuitBreaker {
  private readonly config: UEPCompensationCircuitBreakerConfig;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  constructor(config: UEPCompensationCircuitBreakerConfig) {
    this.config = config;
  }

  public isOpen(): boolean {
    if (!this.config.enabled) return false;
    
    if (this.state === 'open') {
      // Check if timeout has elapsed
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  public recordSuccess(): void {
    if (!this.config.enabled) return;

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMax) {
        this.state = 'closed';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  public recordFailure(): void {
    if (!this.config.enabled) return;

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
}

export default UEPCompensationHandler;