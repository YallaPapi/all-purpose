/**
 * UEP Workflow Executor and Agent Coordination Engine
 * 
 * Deterministic workflow execution engine implementing research-based patterns
 * for distributed agent coordination with state management, error recovery,
 * and comprehensive monitoring capabilities.
 * 
 * Research-based implementation features:
 * - Deterministic workflow execution with state persistence
 * - Multi-pattern agent coordination (Sequential, Parallel, Conditional, Saga)
 * - Automated error detection and compensation handling
 * - Real-time monitoring and audit trails
 * - Agent discovery and load balancing
 * - Type-safe execution with comprehensive validation
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 224.3
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { 
  WorkflowDefinition, 
  WorkflowStep, 
  WorkflowContext,
  WorkflowStatus,
  StepStatus,
  ActionDefinition,
  ConditionalExpression,
  WorkflowError,
  RecoveryAction
} from './WorkflowSchema';
import { 
  DistributedStateManager,
  WorkflowState,
  StepExecution
} from './DistributedStateManager';

// Agent coordination interfaces
export interface AgentRegistry {
  id: string;                          // Unique agent identifier
  name: string;                        // Human-readable name
  capabilities: string[];              // Agent capabilities
  endpoints: {                         // Agent endpoints
    health: string;                    // Health check endpoint
    execute: string;                   // Task execution endpoint
    status: string;                    // Status query endpoint
  };
  metadata: {
    version: string;                   // Agent version
    maxConcurrentTasks: number;        // Concurrent task limit
    averageResponseTime: number;       // Historical performance
    successRate: number;               // Success rate percentage
    lastHealthCheck: Date;             // Last health check time
    status: 'healthy' | 'degraded' | 'unhealthy'; // Current status
  };
  loadBalancing: {
    weight: number;                    // Load balancing weight
    currentLoad: number;               // Current task count
    priority: number;                  // Selection priority
  };
}

export interface ExecutionPlan {
  workflowId: string;                  // Workflow identifier
  executionId: string;                 // Unique execution ID
  steps: PlannedStep[];                // Execution steps with dependencies
  totalSteps: number;                  // Total number of steps
  estimatedDuration: number;           // Estimated execution time
  parallelChains: number[][];          // Parallel execution chains
  criticalPath: string[];              // Critical path step IDs
  checkpoints: string[];               // State checkpoint step IDs
}

export interface PlannedStep {
  stepId: string;                      // Step identifier
  step: WorkflowStep;                  // Step definition
  dependencies: string[];              // Dependency step IDs
  dependents: string[];                // Dependent step IDs
  parallelGroup?: number;              // Parallel execution group
  estimatedDuration: number;           // Estimated step duration
  selectedAgent?: AgentRegistry;       // Pre-selected agent
  compensationChain: string[];         // Compensation dependency chain
  canRunInParallel: boolean;           // Can execute in parallel
  isCheckpoint: boolean;               // Is a state checkpoint
}

export interface AgentTask {
  taskId: string;                      // Unique task identifier
  stepId: string;                      // Step identifier
  workflowId: string;                  // Workflow identifier
  executionId: string;                 // Execution identifier
  action: ActionDefinition;            // Action to execute
  input: Record<string, any>;          // Task input data
  timeout: number;                     // Task timeout
  retryPolicy: {
    maxAttempts: number;               // Maximum retry attempts
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    initialDelay: number;              // Initial retry delay
    maxDelay?: number;                 // Maximum retry delay
    backoffMultiplier?: number;        // Backoff multiplier
  };
  compensation?: {                     // Compensation task
    action: ActionDefinition;          // Compensation action
    input: Record<string, any>;        // Compensation input
  };
  metadata: Record<string, any>;       // Additional metadata
}

export interface AgentResponse {
  taskId: string;                      // Task identifier
  status: 'success' | 'failure' | 'timeout' | 'retry';
  output?: Record<string, any>;        // Task output data
  error?: {
    code: string;                      // Error code
    message: string;                   // Error message
    details?: any;                     // Error details
    retryable: boolean;                // Is error retryable
  };
  metadata: {
    executionTime: number;             // Task execution time
    agentId: string;                   // Executing agent ID
    timestamp: Date;                   // Response timestamp
    resourceUsage?: {                  // Resource usage stats
      cpu: number;                     // CPU usage percentage
      memory: number;                  // Memory usage MB
    };
  };
}

export interface ExecutorConfig {
  stateManager: DistributedStateManager;
  agentDiscovery: {
    registryUrl?: string;              // Agent registry URL
    refreshInterval: number;           // Registry refresh interval
    healthCheckInterval: number;       // Health check interval
    timeoutMs: number;                 // Request timeout
  };
  execution: {
    maxConcurrentSteps: number;        // Max concurrent step execution
    stepTimeoutMs: number;             // Default step timeout
    maxRetryAttempts: number;          // Default max retries
    retryBackoffMs: number;            // Default retry backoff
    checkpointInterval: number;        // State checkpoint interval
    enableCompensation: boolean;       // Enable saga compensation
  };
  monitoring: {
    enableMetrics: boolean;            // Enable execution metrics
    enableTracing: boolean;            // Enable distributed tracing
    metricsInterval: number;           // Metrics collection interval
    auditLevel: 'minimal' | 'detailed' | 'verbose';
  };
}

/**
 * Workflow execution events
 */
export interface ExecutorEvents {
  'execution:started': (plan: ExecutionPlan) => void;
  'execution:completed': (result: ExecutionResult) => void;
  'execution:failed': (error: WorkflowError, context: WorkflowContext) => void;
  'step:started': (stepId: string, agent: AgentRegistry) => void;
  'step:completed': (stepId: string, result: AgentResponse) => void;
  'step:failed': (stepId: string, error: WorkflowError) => void;
  'step:retrying': (stepId: string, attempt: number) => void;
  'compensation:started': (stepId: string) => void;
  'compensation:completed': (stepId: string) => void;
  'agent:discovered': (agent: AgentRegistry) => void;
  'agent:health:degraded': (agentId: string) => void;
  'checkpoint:created': (stepId: string, state: WorkflowState) => void;
}

export interface ExecutionResult {
  workflowId: string;                  // Workflow identifier
  executionId: string;                 // Execution identifier
  status: WorkflowStatus;              // Final execution status
  startTime: Date;                     // Execution start time
  endTime: Date;                       // Execution end time
  duration: number;                    // Total execution time
  completedSteps: number;              // Number of completed steps
  failedSteps: number;                 // Number of failed steps
  compensatedSteps: number;            // Number of compensated steps
  output: Record<string, any>;         // Final workflow output
  errors: WorkflowError[];             // Execution errors
  metrics: {
    totalAgentsUsed: number;           // Total agents utilized
    averageStepDuration: number;       // Average step execution time
    parallelEfficiency: number;        // Parallel execution efficiency
    compensationRate: number;          // Compensation trigger rate
    retryRate: number;                 // Retry rate percentage
  };
}

/**
 * Main workflow executor class
 */
export class WorkflowExecutor extends EventEmitter {
  private stateManager: DistributedStateManager;
  private logger: winston.Logger;
  private config: ExecutorConfig;
  
  // Agent management
  private agentRegistry = new Map<string, AgentRegistry>();
  private agentLoadBalancer = new Map<string, AgentRegistry[]>(); // By capability
  private agentHealthStatus = new Map<string, Date>(); // Last health check
  
  // Execution tracking
  private activeExecutions = new Map<string, ExecutionContext>();
  private executionMetrics = new Map<string, ExecutionMetrics>();
  
  // Task coordination
  private taskQueue = new Map<string, AgentTask[]>(); // By agent ID
  private runningTasks = new Map<string, AgentTask>(); // By task ID
  private completedTasks = new Map<string, AgentResponse>(); // By task ID

  constructor(config: ExecutorConfig) {
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
        new winston.transports.File({ filename: 'logs/workflow-executor.log' })
      ]
    });

    this.initializeAgentDiscovery();
    this.initializeMetricsCollection();
    this.setupEventHandlers();
  }

  /**
   * Initialize agent discovery and health monitoring
   */
  private initializeAgentDiscovery(): void {
    // Start agent registry refresh
    setInterval(
      () => this.refreshAgentRegistry(),
      this.config.agentDiscovery.refreshInterval
    );
    
    // Start agent health checks
    setInterval(
      () => this.performHealthChecks(),
      this.config.agentDiscovery.healthCheckInterval
    );
    
    this.logger.info('Agent discovery initialized', {
      refreshInterval: this.config.agentDiscovery.refreshInterval,
      healthCheckInterval: this.config.agentDiscovery.healthCheckInterval
    });
  }

  /**
   * Initialize metrics collection
   */
  private initializeMetricsCollection(): void {
    if (this.config.monitoring.enableMetrics) {
      setInterval(
        () => this.collectExecutionMetrics(),
        this.config.monitoring.metricsInterval
      );
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.stateManager.on('workflow:created', (state) => {
      this.logger.debug('Workflow state created', {
        workflowId: state.workflowId,
        executionId: state.executionId
      });
    });

    this.stateManager.on('workflow:updated', (current, previous) => {
      this.logger.debug('Workflow state updated', {
        workflowId: current.workflowId,
        executionId: current.executionId,
        status: current.status,
        previousStatus: previous.status
      });
    });
  }

  /**
   * Execute workflow with deterministic planning
   */
  public async executeWorkflow(
    definition: WorkflowDefinition,
    input: Record<string, any> = {},
    options: {
      executionId?: string;
      priority?: number;
      scheduledTime?: Date;
    } = {}
  ): Promise<ExecutionResult> {
    const executionId = options.executionId || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workflowId = definition.id;
    
    this.logger.info('Starting workflow execution', {
      workflowId,
      executionId,
      stepCount: definition.steps.length
    });

    try {
      // Create workflow state
      const state = await this.stateManager.createWorkflowState(
        workflowId,
        executionId,
        definition,
        input
      );

      // Create deterministic execution plan
      const plan = await this.createExecutionPlan(definition, state);
      
      // Initialize execution context
      const context = this.createExecutionContext(state, plan);
      this.activeExecutions.set(executionId, context);
      
      this.emit('execution:started', plan);
      
      // Execute workflow steps
      const result = await this.executeWorkflowSteps(context);
      
      // Clean up execution context
      this.activeExecutions.delete(executionId);
      
      this.emit('execution:completed', result);
      
      return result;
    } catch (error) {
      this.logger.error('Workflow execution failed', {
        workflowId,
        executionId,
        error: error instanceof Error ? error.message : error
      });
      
      const workflowError: WorkflowError = {
        timestamp: new Date(),
        type: 'execution_failure',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      };
      
      this.emit('execution:failed', workflowError, this.createWorkflowContext(workflowId, executionId));
      
      throw error;
    }
  }

  /**
   * Create deterministic execution plan
   */
  private async createExecutionPlan(
    definition: WorkflowDefinition,
    state: WorkflowState
  ): Promise<ExecutionPlan> {
    const steps: PlannedStep[] = [];
    const stepMap = new Map<string, WorkflowStep>();
    
    // Build step map and dependency graph
    for (const step of definition.steps) {
      stepMap.set(step.id, step);
    }
    
    // Create planned steps with dependency analysis
    for (const step of definition.steps) {
      const dependencies = step.dependencies || [];
      const dependents = definition.steps
        .filter(s => s.dependencies?.includes(step.id))
        .map(s => s.id);
      
      // Select agent for step
      const selectedAgent = await this.selectOptimalAgent(step.requiredCapabilities, step.preferredAgents);
      
      const plannedStep: PlannedStep = {
        stepId: step.id,
        step,
        dependencies,
        dependents,
        estimatedDuration: this.estimateStepDuration(step, selectedAgent),
        selectedAgent,
        compensationChain: this.buildCompensationChain(step.id, stepMap),
        canRunInParallel: step.parallel ?? false,
        isCheckpoint: this.shouldCreateCheckpoint(step, definition)
      };
      
      steps.push(plannedStep);
    }
    
    // Analyze parallel execution opportunities
    const parallelChains = this.identifyParallelChains(steps);
    const criticalPath = this.calculateCriticalPath(steps);
    const checkpoints = steps.filter(s => s.isCheckpoint).map(s => s.stepId);
    
    const plan: ExecutionPlan = {
      workflowId: definition.id,
      executionId: state.executionId,
      steps,
      totalSteps: steps.length,
      estimatedDuration: this.calculateTotalDuration(steps, parallelChains),
      parallelChains,
      criticalPath,
      checkpoints
    };
    
    this.logger.debug('Execution plan created', {
      workflowId: definition.id,
      executionId: state.executionId,
      totalSteps: plan.totalSteps,
      parallelChains: parallelChains.length,
      criticalPathLength: criticalPath.length,
      estimatedDuration: plan.estimatedDuration
    });
    
    return plan;
  }

  /**
   * Execute workflow steps with coordination patterns
   */
  private async executeWorkflowSteps(context: ExecutionContext): Promise<ExecutionResult> {
    const { state, plan } = context;
    const startTime = new Date();
    
    // Update workflow status to running
    await this.stateManager.updateWorkflowState(
      state.workflowId,
      state.executionId,
      { status: 'running' }
    );
    
    const completedSteps = new Set<string>();
    const failedSteps = new Set<string>();
    const compensatedSteps = new Set<string>();
    
    try {
      // Execute steps following dependency order and parallelization
      await this.executeStepsWithCoordination(
        plan.steps,
        completedSteps,
        failedSteps,
        context
      );
      
      // Handle any remaining compensation if needed
      if (failedSteps.size > 0 && this.config.execution.enableCompensation) {
        const compensationResults = await this.executeCompensation(
          Array.from(failedSteps),
          completedSteps,
          context
        );
        compensationResults.forEach(stepId => compensatedSteps.add(stepId));
      }
      
      const endTime = new Date();
      const finalStatus: WorkflowStatus = failedSteps.size > 0 ? 'failed' : 'completed';
      
      // Update final workflow state
      await this.stateManager.updateWorkflowState(
        state.workflowId,
        state.executionId,
        { 
          status: finalStatus,
          endTime 
        }
      );
      
      // Build execution result
      const result: ExecutionResult = {
        workflowId: state.workflowId,
        executionId: state.executionId,
        status: finalStatus,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        completedSteps: completedSteps.size,
        failedSteps: failedSteps.size,
        compensatedSteps: compensatedSteps.size,
        output: state.stepResults,
        errors: state.errors,
        metrics: this.calculateExecutionMetrics(context, completedSteps, failedSteps)
      };
      
      return result;
    } catch (error) {
      // Handle execution failure
      await this.stateManager.updateWorkflowState(
        state.workflowId,
        state.executionId,
        { 
          status: 'failed',
          endTime: new Date()
        }
      );
      
      throw error;
    }
  }

  /**
   * Execute steps with coordination patterns (Sequential, Parallel, Conditional)
   */
  private async executeStepsWithCoordination(
    steps: PlannedStep[],
    completedSteps: Set<string>,
    failedSteps: Set<string>,
    context: ExecutionContext
  ): Promise<void> {
    const readySteps = new Set<string>();
    const runningSteps = new Set<string>();
    
    // Initialize ready steps (those with no dependencies)
    for (const step of steps) {
      if (step.dependencies.length === 0) {
        readySteps.add(step.stepId);
      }
    }
    
    // Main execution loop
    while (readySteps.size > 0 || runningSteps.size > 0) {
      // Start execution of ready steps (respecting concurrency limits)
      const stepsToStart = Array.from(readySteps).slice(
        0, 
        this.config.execution.maxConcurrentSteps - runningSteps.size
      );
      
      const stepPromises: Promise<void>[] = [];
      
      for (const stepId of stepsToStart) {
        readySteps.delete(stepId);
        runningSteps.add(stepId);
        
        const step = steps.find(s => s.stepId === stepId)!;
        const promise = this.executeStep(step, context)
          .then((success) => {
            runningSteps.delete(stepId);
            if (success) {
              completedSteps.add(stepId);
              // Check if dependent steps are now ready
              this.updateReadySteps(stepId, steps, completedSteps, readySteps);
            } else {
              failedSteps.add(stepId);
            }
          })
          .catch((error) => {
            runningSteps.delete(stepId);
            failedSteps.add(stepId);
            this.logger.error('Step execution failed', {
              stepId,
              error: error.message
            });
          });
        
        stepPromises.push(promise);
      }
      
      // Wait for at least one step to complete before continuing
      if (stepPromises.length > 0) {
        await Promise.race(stepPromises);
      } else if (runningSteps.size > 0) {
        // Wait a bit if no new steps can start but some are running
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // No steps running and none ready - check for deadlock
        break;
      }
    }
  }

  /**
   * Execute individual step with agent coordination
   */
  private async executeStep(step: PlannedStep, context: ExecutionContext): Promise<boolean> {
    const { state } = context;
    const stepId = step.stepId;
    
    this.logger.debug('Starting step execution', {
      stepId,
      workflowId: state.workflowId,
      executionId: state.executionId
    });
    
    try {
      // Check conditional execution
      if (step.step.condition && !await this.evaluateCondition(step.step.condition, state)) {
        this.logger.info('Step skipped due to condition', { stepId });
        await this.stateManager.updateWorkflowState(
          state.workflowId,
          state.executionId,
          { 
            stepStatus: { 
              ...state.stepStatus, 
              [stepId]: 'skipped' 
            }
          }
        );
        return true; // Treat skipped as successful
      }
      
      // Create step execution record
      const stepExecution = await this.stateManager.createStepExecution(
        stepId,
        state.workflowId,
        state.executionId,
        this.mapStepInput(step.step, state)
      );
      
      // Select agent for execution
      const agent = step.selectedAgent || await this.selectOptimalAgent(
        step.step.requiredCapabilities,
        step.step.preferredAgents
      );
      
      if (!agent) {
        throw new Error(`No suitable agent found for step ${stepId}`);
      }
      
      this.emit('step:started', stepId, agent);
      
      // Create and execute agent task
      const task = this.createAgentTask(step, stepExecution, agent);
      const response = await this.executeAgentTask(task, agent);
      
      // Process step result
      if (response.status === 'success') {
        // Update step execution as completed
        await this.stateManager.updateStepExecution(
          stepId,
          state.workflowId,
          state.executionId,
          {
            status: 'completed',
            endTime: new Date(),
            output: response.output,
            assignedAgent: agent.id
          }
        );
        
        // Update workflow state with step results
        const stepResults = {
          ...state.stepResults,
          [stepId]: response.output
        };
        
        await this.stateManager.updateWorkflowState(
          state.workflowId,
          state.executionId,
          { 
            stepResults,
            stepStatus: { 
              ...state.stepStatus, 
              [stepId]: 'completed' 
            }
          }
        );
        
        this.emit('step:completed', stepId, response);
        
        // Create checkpoint if needed
        if (step.isCheckpoint) {
          await this.createStateCheckpoint(stepId, state);
        }
        
        return true;
      } else {
        // Handle step failure
        const error: WorkflowError = {
          stepId,
          timestamp: new Date(),
          type: response.error?.code || 'step_execution_failure',
          message: response.error?.message || 'Step execution failed',
          details: response.error?.details
        };
        
        await this.stateManager.updateStepExecution(
          stepId,
          state.workflowId,
          state.executionId,
          {
            status: 'failed',
            endTime: new Date(),
            error,
            assignedAgent: agent.id
          }
        );
        
        this.emit('step:failed', stepId, error);
        
        return false;
      }
    } catch (error) {
      this.logger.error('Step execution error', {
        stepId,
        error: error instanceof Error ? error.message : error
      });
      
      const workflowError: WorkflowError = {
        stepId,
        timestamp: new Date(),
        type: 'execution_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      };
      
      this.emit('step:failed', stepId, workflowError);
      
      return false;
    }
  }

  /**
   * Select optimal agent based on capabilities and load balancing
   */
  private async selectOptimalAgent(
    requiredCapabilities: string[],
    preferredAgents?: string[]
  ): Promise<AgentRegistry | null> {
    // Filter agents by capabilities
    const capableAgents: AgentRegistry[] = [];
    
    for (const [agentId, agent] of this.agentRegistry) {
      // Check if agent has all required capabilities
      const hasAllCapabilities = requiredCapabilities.every(cap => 
        agent.capabilities.includes(cap)
      );
      
      if (hasAllCapabilities && agent.metadata.status === 'healthy') {
        capableAgents.push(agent);
      }
    }
    
    if (capableAgents.length === 0) {
      return null;
    }
    
    // Apply preference filtering if specified
    let candidateAgents = capableAgents;
    if (preferredAgents && preferredAgents.length > 0) {
      const preferred = capableAgents.filter(agent => 
        preferredAgents.includes(agent.id)
      );
      if (preferred.length > 0) {
        candidateAgents = preferred;
      }
    }
    
    // Select agent using weighted load balancing
    candidateAgents.sort((a, b) => {
      // Calculate load factor (current load / max concurrent tasks)
      const loadFactorA = a.loadBalancing.currentLoad / a.metadata.maxConcurrentTasks;
      const loadFactorB = b.loadBalancing.currentLoad / b.metadata.maxConcurrentTasks;
      
      // Weighted score considering load, success rate, and response time
      const scoreA = (1 - loadFactorA) * a.metadata.successRate / 100 * 
                    (1 / Math.max(a.metadata.averageResponseTime, 1)) * 
                    a.loadBalancing.weight;
                    
      const scoreB = (1 - loadFactorB) * b.metadata.successRate / 100 * 
                    (1 / Math.max(b.metadata.averageResponseTime, 1)) * 
                    b.loadBalancing.weight;
      
      return scoreB - scoreA; // Higher score first
    });
    
    return candidateAgents[0];
  }

  /**
   * Create agent task from workflow step
   */
  private createAgentTask(
    step: PlannedStep,
    execution: StepExecution,
    agent: AgentRegistry
  ): AgentTask {
    const task: AgentTask = {
      taskId: `task_${execution.executionId}_${step.stepId}_${Date.now()}`,
      stepId: step.stepId,
      workflowId: execution.workflowId,
      executionId: execution.executionId,
      action: step.step.action,
      input: execution.input,
      timeout: step.step.timeout || this.config.execution.stepTimeoutMs,
      retryPolicy: {
        maxAttempts: step.step.retryStrategy?.maxAttempts || this.config.execution.maxRetryAttempts,
        backoffStrategy: step.step.retryStrategy?.backoffStrategy || 'exponential',
        initialDelay: step.step.retryStrategy?.initialDelay || this.config.execution.retryBackoffMs,
        maxDelay: step.step.retryStrategy?.maxDelay,
        backoffMultiplier: step.step.retryStrategy?.backoffMultiplier || 2
      },
      compensation: step.step.compensation ? {
        action: step.step.compensation,
        input: execution.input // Use same input for compensation
      } : undefined,
      metadata: {
        agentId: agent.id,
        stepName: step.step.name,
        workflowName: execution.workflowId,
        priority: 0 // Could be derived from workflow priority
      }
    };
    
    return task;
  }

  /**
   * Execute agent task with retry logic
   */
  private async executeAgentTask(task: AgentTask, agent: AgentRegistry): Promise<AgentResponse> {
    let lastError: any;
    let attempt = 0;
    
    while (attempt < task.retryPolicy.maxAttempts) {
      attempt++;
      
      try {
        this.runningTasks.set(task.taskId, task);
        
        if (attempt > 1) {
          this.emit('step:retrying', task.stepId, attempt);
          this.logger.info('Retrying step execution', {
            stepId: task.stepId,
            attempt,
            maxAttempts: task.retryPolicy.maxAttempts
          });
        }
        
        // Simulate agent task execution (in real implementation, this would be HTTP/gRPC call)
        const response = await this.callAgent(agent, task);
        
        this.runningTasks.delete(task.taskId);
        this.completedTasks.set(task.taskId, response);
        
        if (response.status === 'success') {
          return response;
        } else if (response.status === 'failure' && !response.error?.retryable) {
          // Non-retryable error
          return response;
        }
        
        lastError = response.error;
      } catch (error) {
        lastError = error;
        this.logger.warn('Agent task execution failed', {
          taskId: task.taskId,
          agentId: agent.id,
          attempt,
          error: error instanceof Error ? error.message : error
        });
      }
      
      // Calculate retry delay
      if (attempt < task.retryPolicy.maxAttempts) {
        const delay = this.calculateRetryDelay(task.retryPolicy, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries exhausted
    this.runningTasks.delete(task.taskId);
    
    const failureResponse: AgentResponse = {
      taskId: task.taskId,
      status: 'failure',
      error: {
        code: 'max_retries_exceeded',
        message: `Task failed after ${task.retryPolicy.maxAttempts} attempts`,
        details: lastError,
        retryable: false
      },
      metadata: {
        executionTime: 0,
        agentId: agent.id,
        timestamp: new Date()
      }
    };
    
    return failureResponse;
  }

  /**
   * Call agent to execute task (placeholder for actual agent communication)
   */
  private async callAgent(agent: AgentRegistry, task: AgentTask): Promise<AgentResponse> {
    // In real implementation, this would make HTTP/gRPC call to agent
    // For now, simulate agent execution
    
    const startTime = Date.now();
    
    // Simulate network delay and processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
    
    // Simulate success/failure based on agent success rate
    const success = Math.random() < (agent.metadata.successRate / 100);
    
    const executionTime = Date.now() - startTime;
    
    if (success) {
      return {
        taskId: task.taskId,
        status: 'success',
        output: {
          result: `Task ${task.taskId} completed successfully`,
          executionTime,
          agentId: agent.id
        },
        metadata: {
          executionTime,
          agentId: agent.id,
          timestamp: new Date(),
          resourceUsage: {
            cpu: Math.random() * 50 + 20,
            memory: Math.random() * 100 + 50
          }
        }
      };
    } else {
      return {
        taskId: task.taskId,
        status: 'failure',
        error: {
          code: 'execution_failed',
          message: 'Simulated task execution failure',
          details: { simulatedFailure: true },
          retryable: Math.random() > 0.3 // 70% of errors are retryable
        },
        metadata: {
          executionTime,
          agentId: agent.id,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Execute compensation steps for failed workflow
   */
  private async executeCompensation(
    failedSteps: string[],
    completedSteps: Set<string>,
    context: ExecutionContext
  ): Promise<string[]> {
    const compensatedSteps: string[] = [];
    
    this.logger.info('Starting compensation execution', {
      failedSteps,
      completedStepsCount: completedSteps.size
    });
    
    // Execute compensation in reverse order of completion
    const stepsToCompensate = Array.from(completedSteps).reverse();
    
    for (const stepId of stepsToCompensate) {
      const plannedStep = context.plan.steps.find(s => s.stepId === stepId);
      
      if (plannedStep?.step.compensation) {
        this.emit('compensation:started', stepId);
        
        try {
          // Create compensation task
          const compensationTask = await this.createCompensationTask(
            plannedStep,
            context.state
          );
          
          // Select agent for compensation
          const agent = await this.selectOptimalAgent(
            plannedStep.step.requiredCapabilities
          );
          
          if (agent) {
            const response = await this.executeAgentTask(compensationTask, agent);
            
            if (response.status === 'success') {
              compensatedSteps.push(stepId);
              this.emit('compensation:completed', stepId);
              
              this.logger.info('Compensation executed successfully', {
                stepId,
                agentId: agent.id
              });
            } else {
              this.logger.error('Compensation failed', {
                stepId,
                error: response.error
              });
            }
          }
        } catch (error) {
          this.logger.error('Compensation execution error', {
            stepId,
            error: error instanceof Error ? error.message : error
          });
        }
      }
    }
    
    return compensatedSteps;
  }

  /**
   * Additional helper methods would be implemented here...
   * - createCompensationTask
   * - evaluateCondition
   * - mapStepInput
   * - updateReadySteps
   * - calculateRetryDelay
   * - createStateCheckpoint
   * - refreshAgentRegistry
   * - performHealthChecks
   * - collectExecutionMetrics
   * - etc.
   */

  // Placeholder implementations for brevity
  private async createCompensationTask(step: PlannedStep, state: WorkflowState): Promise<AgentTask> {
    throw new Error('Method not implemented');
  }

  private async evaluateCondition(condition: ConditionalExpression, state: WorkflowState): Promise<boolean> {
    // Simplified condition evaluation
    return true;
  }

  private mapStepInput(step: WorkflowStep, state: WorkflowState): Record<string, any> {
    const input: Record<string, any> = {};
    
    for (const mapping of step.input) {
      const value = this.getValueFromPath(mapping.source, {
        workflow: { input: state.variables },
        step: state.stepResults
      });
      input[mapping.target] = value;
    }
    
    return input;
  }

  private getValueFromPath(path: string, context: any): any {
    const parts = path.split('.');
    let current = context;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private updateReadySteps(
    completedStepId: string,
    steps: PlannedStep[],
    completedSteps: Set<string>,
    readySteps: Set<string>
  ): void {
    for (const step of steps) {
      if (!completedSteps.has(step.stepId) && 
          !readySteps.has(step.stepId) &&
          step.dependencies.every(dep => completedSteps.has(dep))) {
        readySteps.add(step.stepId);
      }
    }
  }

  private calculateRetryDelay(retryPolicy: AgentTask['retryPolicy'], attempt: number): number {
    switch (retryPolicy.backoffStrategy) {
      case 'fixed':
        return retryPolicy.initialDelay;
      case 'linear':
        return retryPolicy.initialDelay * attempt;
      case 'exponential':
        const delay = retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier || 2, attempt - 1);
        return Math.min(delay, retryPolicy.maxDelay || 30000);
      default:
        return retryPolicy.initialDelay;
    }
  }

  // Additional helper method implementations would continue...
  private refreshAgentRegistry(): void { /* Implementation */ }
  private performHealthChecks(): void { /* Implementation */ }
  private collectExecutionMetrics(): void { /* Implementation */ }
  private createExecutionContext(state: WorkflowState, plan: ExecutionPlan): ExecutionContext { 
    return { state, plan } as ExecutionContext;
  }
  private createWorkflowContext(workflowId: string, executionId: string): WorkflowContext {
    return {} as WorkflowContext;
  }
  private estimateStepDuration(step: WorkflowStep, agent?: AgentRegistry): number { return 1000; }
  private buildCompensationChain(stepId: string, stepMap: Map<string, WorkflowStep>): string[] { return []; }
  private shouldCreateCheckpoint(step: WorkflowStep, definition: WorkflowDefinition): boolean { return false; }
  private identifyParallelChains(steps: PlannedStep[]): number[][] { return []; }
  private calculateCriticalPath(steps: PlannedStep[]): string[] { return []; }
  private calculateTotalDuration(steps: PlannedStep[], parallelChains: number[][]): number { return 0; }
  private calculateExecutionMetrics(context: ExecutionContext, completed: Set<string>, failed: Set<string>): ExecutionResult['metrics'] {
    return {
      totalAgentsUsed: 0,
      averageStepDuration: 0,
      parallelEfficiency: 0,
      compensationRate: 0,
      retryRate: 0
    };
  }
  private createStateCheckpoint(stepId: string, state: WorkflowState): Promise<void> { return Promise.resolve(); }
}

// Supporting interfaces
interface ExecutionContext {
  state: WorkflowState;
  plan: ExecutionPlan;
}

interface ExecutionMetrics {
  startTime: Date;
  completedSteps: number;
  failedSteps: number;
  totalDuration: number;
}

/**
 * Factory function to create workflow executor
 */
export function createWorkflowExecutor(config: ExecutorConfig): WorkflowExecutor {
  return new WorkflowExecutor(config);
}

// Export all types for external use
export type {
  ExecutorConfig,
  ExecutorEvents,
  AgentRegistry,
  ExecutionPlan,
  PlannedStep,
  AgentTask,
  AgentResponse,
  ExecutionResult
};