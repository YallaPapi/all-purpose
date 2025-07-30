/**
 * UEP Workflow Engine
 * 
 * Core orchestration engine for executing UEP multi-agent workflows.
 * Provides step execution, flow control, error handling, compensation,
 * state management, and real-time monitoring. Supports multiple execution
 * strategies including sequential, parallel, and event-driven patterns.
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
  UEPWorkflowDefinition, 
  UEPWorkflowStep, 
  UEPWorkflowFlow,
  UEPWorkflowAgentDefinition 
} from './UEPWorkflowDefinition';
import UEPWorkflowLoader from './UEPWorkflowLoader';
import UEPDiscoveryClient from '../discovery/UEPDiscoveryClient';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPWorkflowEngineConfig {
  maxConcurrentWorkflows: number;
  maxConcurrentSteps: number;
  stepExecutionTimeout: number;
  workflowExecutionTimeout: number;
  enableStateManagement: boolean;
  enableCompensation: boolean;
  enableMonitoring: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  retryPolicyDefault: UEPRetryConfiguration;
  executionStrategies: string[];
  agentCommunicationTimeout: number;
  heartbeatInterval: number;
  checkpointInterval: number;
  maxRetryAttempts: number;
  compensationTimeout: number;
}

export interface UEPWorkflowExecution {
  executionId: string;
  workflowId: string;
  definition: UEPWorkflowDefinition;
  status: UEPExecutionStatus;
  startTime: Date;
  endTime?: Date;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  variables: Record<string, any>;
  context: UEPExecutionContext;
  agents: Map<string, UEPAgentInstance>;
  checkpoints: UEPCheckpoint[];
  compensationLog: UEPCompensationEntry[];
  metrics: UEPExecutionMetrics;
  error?: UEPWorkflowError;
}

export interface UEPExecutionContext {
  userId?: string;
  sessionId?: string;
  correlationId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  environment: 'development' | 'staging' | 'production';
  region?: string;
  tags: Record<string, string>;
  configuration: Record<string, any>;
  permissions: string[];
  timeout: number;
  retryPolicy: UEPRetryConfiguration;
}

export interface UEPAgentInstance {
  agentId: string;
  definition: UEPWorkflowAgentDefinition;
  registration: any; // From UEPAgentRegistration
  status: 'initializing' | 'ready' | 'executing' | 'idle' | 'error' | 'terminating';
  connection?: any; // Connection details
  lastHeartbeat: Date;
  executedSteps: string[];
  assignedSteps: string[];
  performance: UEPAgentPerformance;
  resources: UEPResourceUsage;
}

export interface UEPStepExecution {
  stepId: string;
  executionId: string;
  agentId: string;
  status: UEPStepStatus;
  startTime: Date;
  endTime?: Date;
  input: any;
  output?: any;
  error?: UEPStepError;
  retryCount: number;
  compensated: boolean;
  metrics: UEPStepMetrics;
  traces: UEPStepTrace[];
}

export interface UEPCheckpoint {
  id: string;
  executionId: string;
  timestamp: Date;
  stepId: string;
  state: UEPExecutionState;
  variables: Record<string, any>;
  agentStates: Record<string, any>;
  completedSteps: string[];
  checksum: string;
}

export interface UEPCompensationEntry {
  id: string;
  stepId: string;
  timestamp: Date;
  action: string;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration: number;
}

export interface UEPWorkflowEngineMetrics {
  workflowsExecuted: Counter;
  workflowExecutionTime: Histogram;
  stepsExecuted: Counter;
  stepExecutionTime: Histogram;
  activeWorkflows: Gauge;
  activeSteps: Gauge;
  workflowErrors: Counter;
  stepErrors: Counter;
  compensationsExecuted: Counter;
  agentUtilization: Gauge;
  resourceUsage: Gauge;
}

export type UEPExecutionStatus = 
  | 'pending' 
  | 'initializing' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled' 
  | 'compensating' 
  | 'compensated';

export type UEPStepStatus = 
  | 'pending' 
  | 'waiting' 
  | 'executing' 
  | 'completed' 
  | 'failed' 
  | 'skipped' 
  | 'compensating' 
  | 'compensated';

export type UEPExecutionState = 
  | 'initializing' 
  | 'ready' 
  | 'executing' 
  | 'waiting' 
  | 'error' 
  | 'completed';

// =============================================================================
// UEP Workflow Engine Core Class
// =============================================================================

export class UEPWorkflowEngine extends EventEmitter {
  private readonly config: UEPWorkflowEngineConfig;
  private readonly logger = new Logger('UEPWorkflowEngine');
  private readonly tracer = trace.getTracer('uep-workflow-engine', '1.0.0');

  // Core dependencies
  private readonly workflowLoader: UEPWorkflowLoader;
  private readonly discoveryClient: UEPDiscoveryClient;

  // Execution management
  private readonly activeExecutions: Map<string, UEPWorkflowExecution> = new Map();
  private readonly stepExecutions: Map<string, UEPStepExecution> = new Map();
  private readonly executionQueue: Array<{ execution: UEPWorkflowExecution; priority: number }> = [];

  // Agent management
  private readonly agentPool: Map<string, UEPAgentInstance> = new Map();
  private readonly agentAssignments: Map<string, string[]> = new Map(); // agentId -> stepIds

  // Monitoring and timers
  private executionTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private checkpointTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  // Metrics
  private readonly metrics: UEPWorkflowEngineMetrics;

  // State management
  private readonly checkpoints: Map<string, UEPCheckpoint[]> = new Map();
  private readonly compensationLog: Map<string, UEPCompensationEntry[]> = new Map();

  constructor(
    workflowLoader: UEPWorkflowLoader,
    discoveryClient: UEPDiscoveryClient,
    config: Partial<UEPWorkflowEngineConfig> = {}
  ) {
    super();

    this.config = {
      maxConcurrentWorkflows: 100,
      maxConcurrentSteps: 1000,
      stepExecutionTimeout: 300000, // 5 minutes
      workflowExecutionTimeout: 3600000, // 1 hour
      enableStateManagement: true,
      enableCompensation: true,
      enableMonitoring: true,
      enableMetrics: true,
      enableTracing: true,
      retryPolicyDefault: {
        enabled: true,
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['timeout', 'network', 'temporary'],
        nonRetryableErrors: ['authentication', 'authorization', 'validation']
      },
      executionStrategies: ['sequential', 'parallel', 'conditional', 'event-driven'],
      agentCommunicationTimeout: 30000,
      heartbeatInterval: 30000,
      checkpointInterval: 60000,
      maxRetryAttempts: 5,
      compensationTimeout: 300000,
      ...config
    };

    this.workflowLoader = workflowLoader;
    this.discoveryClient = discoveryClient;

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Start background processes
    this.startBackgroundProcesses();

    this.logger.info('UEP Workflow Engine initialized', {
      maxConcurrentWorkflows: this.config.maxConcurrentWorkflows,
      maxConcurrentSteps: this.config.maxConcurrentSteps,
      enableStateManagement: this.config.enableStateManagement,
      enableCompensation: this.config.enableCompensation
    });
  }

  // =============================================================================
  // Workflow Execution Methods
  // =============================================================================

  public async executeWorkflow(
    workflowId: string,
    input: any = {},
    context: Partial<UEPExecutionContext> = {}
  ): Promise<string> {
    return this.tracer.startActiveSpan('uep.workflow.execute', async (span) => {
      try {
        span.setAttributes({
          'workflow.id': workflowId,
          'workflow.has_input': Object.keys(input).length > 0
        });

        // Check capacity
        if (this.activeExecutions.size >= this.config.maxConcurrentWorkflows) {
          throw new Error('Maximum concurrent workflows limit reached');
        }

        // Load workflow definition
        const workflowResult = await this.workflowLoader.loadWorkflow({
          type: 'file', // This would be determined based on workflowId
          source: workflowId
        });

        // Create execution instance
        const execution = await this.createExecution(workflowResult.definition, input, context);

        // Initialize agents
        await this.initializeAgents(execution);

        // Start execution
        await this.startExecution(execution);

        span.setAttributes({
          'workflow.execution_id': execution.executionId,
          'workflow.agent_count': execution.definition.agents.length,
          'workflow.step_count': execution.definition.steps.length
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return execution.executionId;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Failed to execute workflow', {
          workflowId,
          error: (error as Error).message
        });

        throw error;
      }
    });
  }

  public async pauseExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'paused';
    
    this.emit('executionPaused', {
      executionId,
      timestamp: new Date()
    });

    this.logger.info('Workflow execution paused', { executionId });
  }

  public async resumeExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== 'paused') {
      throw new Error(`Cannot resume execution with status: ${execution.status}`);
    }

    execution.status = 'running';
    await this.processExecution(execution);

    this.emit('executionResumed', {
      executionId,
      timestamp: new Date()
    });

    this.logger.info('Workflow execution resumed', { executionId });
  }

  public async cancelExecution(executionId: string, reason: string = 'User cancelled'): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.error = {
      type: 'cancellation',
      message: reason,
      timestamp: new Date(),
      context: { reason }
    };

    // Cancel running steps
    for (const stepId of execution.completedSteps) {
      const stepExecution = this.stepExecutions.get(`${executionId}:${stepId}`);
      if (stepExecution && stepExecution.status === 'executing') {
        stepExecution.status = 'failed';
        stepExecution.error = {
          type: 'cancelled',
          message: 'Workflow cancelled',
          code: 'WORKFLOW_CANCELLED'
        };
      }
    }

    // Start compensation if enabled
    if (this.config.enableCompensation) {
      await this.startCompensation(execution);
    }

    this.activeExecutions.delete(executionId);

    this.emit('executionCancelled', {
      executionId,
      reason,
      timestamp: new Date()
    });

    this.logger.info('Workflow execution cancelled', { executionId, reason });
  }

  // =============================================================================
  // Execution Management
  // =============================================================================

  private async createExecution(
    definition: UEPWorkflowDefinition,
    input: any,
    contextOverrides: Partial<UEPExecutionContext>
  ): Promise<UEPWorkflowExecution> {
    const executionId = uuidv4();
    const correlationId = contextOverrides.correlationId || uuidv4();

    const context: UEPExecutionContext = {
      correlationId,
      priority: 'medium',
      environment: 'production',
      tags: {},
      configuration: {},
      permissions: [],
      timeout: definition.metadata.timeout,
      retryPolicy: this.config.retryPolicyDefault,
      ...contextOverrides
    };

    const execution: UEPWorkflowExecution = {
      executionId,
      workflowId: definition.metadata.id,
      definition,
      status: 'pending',
      startTime: new Date(),
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      variables: { input, ...input },
      context,
      agents: new Map(),
      checkpoints: [],
      compensationLog: [],
      metrics: {
        stepsExecuted: 0,
        stepsSuccessful: 0,
        stepsFailed: 0,
        executionTime: 0,
        compensationTime: 0,
        resourceUsage: {
          cpu: 0,
          memory: 0,
          network: 0,
          storage: 0
        }
      }
    };

    this.activeExecutions.set(executionId, execution);
    this.checkpoints.set(executionId, []);
    this.compensationLog.set(executionId, []);

    return execution;
  }

  private async initializeAgents(execution: UEPWorkflowExecution): Promise<void> {
    for (const agentDef of execution.definition.agents) {
      try {
        // Discover available agents
        const discovery = await this.discoveryClient.discoverAgents({
          agentType: agentDef.type,
          capabilities: agentDef.requirements.capabilities,
          environment: execution.context.environment
        });

        if (discovery.agents.length === 0) {
          throw new Error(`No available agents found for type: ${agentDef.type}`);
        }

        // Select best agent (simplified selection)
        const selectedAgent = discovery.agents[0];

        // Create agent instance
        const agentInstance: UEPAgentInstance = {
          agentId: selectedAgent.agentId,
          definition: agentDef,
          registration: selectedAgent,
          status: 'initializing',
          lastHeartbeat: new Date(),
          executedSteps: [],
          assignedSteps: [],
          performance: {
            averageExecutionTime: 0,
            successRate: 100,
            errorRate: 0,
            throughput: 0
          },
          resources: {
            cpu: 0,
            memory: 0,
            network: 0,
            storage: 0
          }
        };

        execution.agents.set(agentDef.id, agentInstance);
        this.agentPool.set(selectedAgent.agentId, agentInstance);

        // Initialize agent
        await this.initializeAgent(agentInstance, execution);

      } catch (error) {
        this.logger.error('Failed to initialize agent', {
          executionId: execution.executionId,
          agentId: agentDef.id,
          error: (error as Error).message
        });

        execution.status = 'failed';
        execution.error = {
          type: 'agent-initialization',
          message: `Failed to initialize agent ${agentDef.id}: ${(error as Error).message}`,
          timestamp: new Date(),
          context: { agentId: agentDef.id }
        };

        throw error;
      }
    }
  }

  private async initializeAgent(agent: UEPAgentInstance, execution: UEPWorkflowExecution): Promise<void> {
    return this.tracer.startActiveSpan('uep.workflow.agent_init', async (span) => {
      try {
        span.setAttributes({
          'agent.id': agent.agentId,
          'agent.type': agent.definition.type
        });

        // Execute initialization lifecycle hooks
        for (const hook of agent.definition.lifecycle.initialization.hooks) {
          await this.executeLifecycleHook(agent, hook, execution);
        }

        agent.status = 'ready';
        agent.lastHeartbeat = new Date();

        span.setStatus({ code: SpanStatusCode.OK });

        this.logger.info('Agent initialized successfully', {
          executionId: execution.executionId,
          agentId: agent.agentId
        });

      } catch (error) {
        agent.status = 'error';
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  private async startExecution(execution: UEPWorkflowExecution): Promise<void> {
    execution.status = 'running';
    execution.startTime = new Date();

    // Add to processing queue
    this.executionQueue.push({
      execution,
      priority: this.getPriorityScore(execution.context.priority)
    });

    // Sort queue by priority
    this.executionQueue.sort((a, b) => b.priority - a.priority);

    // Update metrics
    this.metrics.workflowsExecuted.inc({
      workflow_id: execution.workflowId
    });
    this.metrics.activeWorkflows.set(this.activeExecutions.size);

    this.emit('executionStarted', {
      executionId: execution.executionId,
      workflowId: execution.workflowId,
      timestamp: execution.startTime
    });

    this.logger.info('Workflow execution started', {
      executionId: execution.executionId,
      workflowId: execution.workflowId
    });

    // Start processing immediately if possible
    await this.processExecutionQueue();
  }

  // =============================================================================
  // Step Execution Methods
  // =============================================================================

  private async processExecutionQueue(): Promise<void> {
    while (this.executionQueue.length > 0) {
      const activeStepCount = this.stepExecutions.size;
      if (activeStepCount >= this.config.maxConcurrentSteps) {
        break; // Wait for some steps to complete
      }

      const queueItem = this.executionQueue.shift();
      if (!queueItem) break;

      try {
        await this.processExecution(queueItem.execution);
      } catch (error) {
        this.logger.error('Failed to process execution', {
          executionId: queueItem.execution.executionId,
          error: (error as Error).message
        });
      }
    }
  }

  private async processExecution(execution: UEPWorkflowExecution): Promise<void> {
    if (execution.status !== 'running') {
      return;
    }

    try {
      // Get next steps to execute
      const nextSteps = this.getNextSteps(execution);
      
      if (nextSteps.length === 0) {
        // Check if workflow is complete
        if (this.isWorkflowComplete(execution)) {
          await this.completeExecution(execution);
        }
        return;
      }

      // Execute steps based on flow configuration
      for (const step of nextSteps) {
        await this.executeStep(execution, step);
      }

    } catch (error) {
      await this.handleExecutionError(execution, error as Error);
    }
  }

  private async executeStep(execution: UEPWorkflowExecution, step: UEPWorkflowStep): Promise<void> {
    return this.tracer.startActiveSpan('uep.workflow.step_execute', async (span) => {
      const stepExecutionId = `${execution.executionId}:${step.id}`;
      
      try {
        span.setAttributes({
          'step.id': step.id,
          'step.type': step.type,
          'step.agent_id': step.agentId,
          'execution.id': execution.executionId
        });

        // Create step execution
        const stepExecution: UEPStepExecution = {
          stepId: step.id,
          executionId: execution.executionId,
          agentId: step.agentId,
          status: 'pending',
          startTime: new Date(),
          input: this.prepareStepInput(execution, step),
          retryCount: 0,
          compensated: false,
          metrics: {
            executionTime: 0,
            retryCount: 0,
            resourceUsage: {
              cpu: 0,
              memory: 0,
              network: 0,
              storage: 0
            }
          },
          traces: []
        };

        this.stepExecutions.set(stepExecutionId, stepExecution);

        // Check preconditions
        if (!await this.checkStepPreconditions(execution, step)) {
          stepExecution.status = 'skipped';
          execution.skippedSteps.push(step.id);
          this.stepExecutions.delete(stepExecutionId);
          return;
        }

        // Get agent for execution
        const agent = execution.agents.get(step.agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${step.agentId}`);
        }

        // Execute step with retry logic
        stepExecution.status = 'executing';
        execution.currentStep = step.id;

        const result = await this.executeStepWithRetry(stepExecution, agent, step, execution);
        
        stepExecution.output = result;
        stepExecution.status = 'completed';
        stepExecution.endTime = new Date();
        stepExecution.metrics.executionTime = stepExecution.endTime.getTime() - stepExecution.startTime.getTime();

        // Update execution state
        execution.completedSteps.push(step.id);
        execution.variables = { ...execution.variables, ...this.extractStepOutput(step, result) };

        // Check postconditions
        await this.checkStepPostconditions(execution, step, result);

        // Update metrics
        this.updateStepMetrics(stepExecution);
        execution.metrics.stepsExecuted++;
        execution.metrics.stepsSuccessful++;

        span.setAttributes({
          'step.status': 'completed',
          'step.execution_time': stepExecution.metrics.executionTime,
          'step.retry_count': stepExecution.retryCount
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.emit('stepCompleted', {
          executionId: execution.executionId,
          stepId: step.id,
          output: result,
          duration: stepExecution.metrics.executionTime,
          timestamp: stepExecution.endTime
        });

        this.logger.info('Step executed successfully', {
          executionId: execution.executionId,
          stepId: step.id,
          duration: stepExecution.metrics.executionTime
        });

      } catch (error) {
        await this.handleStepError(execution, step, error as Error);
        
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      } finally {
        // Clean up step execution if completed or failed
        const stepExecution = this.stepExecutions.get(stepExecutionId);
        if (stepExecution && ['completed', 'failed', 'skipped'].includes(stepExecution.status)) {
          this.stepExecutions.delete(stepExecutionId);
        }
      }
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private getNextSteps(execution: UEPWorkflowExecution): UEPWorkflowStep[] {
    const availableSteps: UEPWorkflowStep[] = [];
    
    for (const step of execution.definition.steps) {
      // Skip if already completed, failed, or skipped
      if (execution.completedSteps.includes(step.id) ||
          execution.failedSteps.includes(step.id) ||
          execution.skippedSteps.includes(step.id)) {
        continue;
      }

      // Check if all dependencies are satisfied
      const dependenciesSatisfied = step.dependencies.every(dep => 
        execution.completedSteps.includes(dep)
      );

      if (dependenciesSatisfied) {
        availableSteps.push(step);
      }
    }

    return availableSteps;
  }

  private isWorkflowComplete(execution: UEPWorkflowExecution): boolean {
    const totalSteps = execution.definition.steps.length;
    const processedSteps = execution.completedSteps.length + 
                          execution.failedSteps.length + 
                          execution.skippedSteps.length;

    return processedSteps === totalSteps;
  }

  private async completeExecution(execution: UEPWorkflowExecution): Promise<void> {
    execution.status = 'completed';
    execution.endTime = new Date();
    execution.metrics.executionTime = execution.endTime.getTime() - execution.startTime.getTime();

    // Clean up agents
    for (const agent of execution.agents.values()) {
      await this.cleanupAgent(agent, execution);
    }

    // Update metrics
    this.metrics.workflowExecutionTime.observe(
      { workflow_id: execution.workflowId },
      execution.metrics.executionTime / 1000
    );

    this.activeExecutions.delete(execution.executionId);
    this.metrics.activeWorkflows.set(this.activeExecutions.size);

    this.emit('executionCompleted', {
      executionId: execution.executionId,
      workflowId: execution.workflowId,
      duration: execution.metrics.executionTime,
      stepsExecuted: execution.metrics.stepsExecuted,
      timestamp: execution.endTime
    });

    this.logger.info('Workflow execution completed', {
      executionId: execution.executionId,
      workflowId: execution.workflowId,
      duration: execution.metrics.executionTime,
      stepsExecuted: execution.metrics.stepsExecuted
    });
  }

  private getPriorityScore(priority: string): number {
    switch (priority) {
      case 'critical': return 100;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }

  private prepareStepInput(execution: UEPWorkflowExecution, step: UEPWorkflowStep): any {
    // Apply input mapping and transformations
    const input: any = {};
    
    for (const mapping of step.input.dataMapping) {
      const sourceValue = this.evaluateJsonPath(execution.variables, mapping.source);
      input[mapping.target] = mapping.transformation 
        ? this.applyTransformation(sourceValue, mapping.transformation)
        : sourceValue;
    }

    return input;
  }

  private extractStepOutput(step: UEPWorkflowStep, result: any): Record<string, any> {
    const output: Record<string, any> = {};
    
    for (const mapping of step.output.resultMapping) {
      const sourceValue = this.evaluateJsonPath(result, mapping.source);
      const targetKey = mapping.target.replace(/^\$\./, '');
      output[targetKey] = mapping.transformation
        ? this.applyTransformation(sourceValue, mapping.transformation)
        : sourceValue;
    }

    return output;
  }

  private evaluateJsonPath(data: any, path: string): any {
    // Simplified JSONPath evaluation
    if (path.startsWith('$.')) {
      const keys = path.slice(2).split('.');
      let result = data;
      for (const key of keys) {
        result = result?.[key];
      }
      return result;
    }
    return data[path];
  }

  private applyTransformation(value: any, transformation: string): any {
    // Simplified transformation application
    // In a real implementation, this would support various transformation functions
    return value;
  }

  // =============================================================================
  // Background Processes
  // =============================================================================

  private startBackgroundProcesses(): void {
    // Execution processing timer
    this.executionTimer = setInterval(() => {
      this.processExecutionQueue().catch(error => {
        this.logger.error('Execution queue processing failed', { error: error.message });
      });
    }, 1000); // Process every second

    // Heartbeat timer
    if (this.config.heartbeatInterval > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.performHeartbeatCheck().catch(error => {
          this.logger.error('Heartbeat check failed', { error: error.message });
        });
      }, this.config.heartbeatInterval);
    }

    // Checkpoint timer
    if (this.config.enableStateManagement && this.config.checkpointInterval > 0) {
      this.checkpointTimer = setInterval(() => {
        this.performCheckpointing().catch(error => {
          this.logger.error('Checkpointing failed', { error: error.message });
        });
      }, this.config.checkpointInterval);
    }

    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 300000); // Cleanup every 5 minutes
  }

  private async performHeartbeatCheck(): Promise<void> {
    const now = new Date();
    const timeoutThreshold = this.config.agentCommunicationTimeout;

    for (const agent of this.agentPool.values()) {
      const timeSinceLastHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > timeoutThreshold) {
        agent.status = 'error';
        
        this.logger.warn('Agent heartbeat timeout', {
          agentId: agent.agentId,
          timeSinceLastHeartbeat
        });

        this.emit('agentTimeout', {
          agentId: agent.agentId,
          timeSinceLastHeartbeat,
          timestamp: now
        });
      }
    }
  }

  private async performCheckpointing(): Promise<void> {
    for (const execution of this.activeExecutions.values()) {
      if (execution.status === 'running') {
        await this.createCheckpoint(execution);
      }
    }
  }

  private performCleanup(): void {
    // Clean up completed step executions
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    
    for (const [key, stepExecution] of this.stepExecutions) {
      if (stepExecution.endTime && stepExecution.endTime.getTime() < cutoffTime) {
        this.stepExecutions.delete(key);
      }
    }

    // Clean up agent pool
    for (const [agentId, agent] of this.agentPool) {
      if (agent.status === 'error' && 
          agent.lastHeartbeat.getTime() < cutoffTime) {
        this.agentPool.delete(agentId);
      }
    }
  }

  // =============================================================================
  // Placeholder Methods (to be implemented)
  // =============================================================================

  private async executeLifecycleHook(agent: UEPAgentInstance, hook: any, execution: UEPWorkflowExecution): Promise<void> {
    // Implementation would execute lifecycle hooks
  }

  private async checkStepPreconditions(execution: UEPWorkflowExecution, step: UEPWorkflowStep): Promise<boolean> {
    // Implementation would check step preconditions
    return true;
  }

  private async executeStepWithRetry(stepExecution: UEPStepExecution, agent: UEPAgentInstance, step: UEPWorkflowStep, execution: UEPWorkflowExecution): Promise<any> {
    // Implementation would execute step with retry logic
    return { success: true, data: 'Mock result' };
  }

  private async checkStepPostconditions(execution: UEPWorkflowExecution, step: UEPWorkflowStep, result: any): Promise<void> {
    // Implementation would check step postconditions
  }

  private async handleStepError(execution: UEPWorkflowExecution, step: UEPWorkflowStep, error: Error): Promise<void> {
    // Implementation would handle step errors
  }

  private async handleExecutionError(execution: UEPWorkflowExecution, error: Error): Promise<void> {
    // Implementation would handle execution errors
  }

  private async startCompensation(execution: UEPWorkflowExecution): Promise<void> {
    // Implementation would start compensation process
  }

  private async cleanupAgent(agent: UEPAgentInstance, execution: UEPWorkflowExecution): Promise<void> {
    // Implementation would cleanup agent resources
  }

  private async createCheckpoint(execution: UEPWorkflowExecution): Promise<void> {
    // Implementation would create execution checkpoint
  }

  private updateStepMetrics(stepExecution: UEPStepExecution): void {
    this.metrics.stepsExecuted.inc({
      step_type: 'generic',
      status: stepExecution.status
    });

    this.metrics.stepExecutionTime.observe(
      { step_type: 'generic' },
      stepExecution.metrics.executionTime / 1000
    );
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPWorkflowEngineMetrics {
    const prefix = 'uep_workflow_engine_';

    return {
      workflowsExecuted: new Counter({
        name: `${prefix}workflows_executed_total`,
        help: 'Total workflows executed',
        labelNames: ['workflow_id']
      }),

      workflowExecutionTime: new Histogram({
        name: `${prefix}workflow_execution_time_seconds`,
        help: 'Workflow execution time',
        labelNames: ['workflow_id'],
        buckets: [1, 10, 30, 60, 300, 600, 1800, 3600]
      }),

      stepsExecuted: new Counter({
        name: `${prefix}steps_executed_total`,
        help: 'Total steps executed',
        labelNames: ['step_type', 'status']
      }),

      stepExecutionTime: new Histogram({
        name: `${prefix}step_execution_time_seconds`,
        help: 'Step execution time',
        labelNames: ['step_type'],
        buckets: [0.1, 1, 5, 10, 30, 60, 300]
      }),

      activeWorkflows: new Gauge({
        name: `${prefix}active_workflows`,
        help: 'Number of active workflows'
      }),

      activeSteps: new Gauge({
        name: `${prefix}active_steps`,
        help: 'Number of active steps'
      }),

      workflowErrors: new Counter({
        name: `${prefix}workflow_errors_total`,
        help: 'Total workflow errors',
        labelNames: ['error_type']
      }),

      stepErrors: new Counter({
        name: `${prefix}step_errors_total`,
        help: 'Total step errors',
        labelNames: ['error_type']
      }),

      compensationsExecuted: new Counter({
        name: `${prefix}compensations_executed_total`,
        help: 'Total compensations executed',
        labelNames: ['compensation_type']
      }),

      agentUtilization: new Gauge({
        name: `${prefix}agent_utilization`,
        help: 'Agent utilization percentage',
        labelNames: ['agent_type']
      }),

      resourceUsage: new Gauge({
        name: `${prefix}resource_usage`,
        help: 'Resource usage',
        labelNames: ['resource_type']
      })
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getExecutionStatus(executionId: string): UEPWorkflowExecution | null {
    return this.activeExecutions.get(executionId) || null;
  }

  public getActiveExecutions(): UEPWorkflowExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  public getEngineStats(): Record<string, any> {
    return {
      activeExecutions: this.activeExecutions.size,
      activeSteps: this.stepExecutions.size,
      agentPool: this.agentPool.size,
      queueLength: this.executionQueue.length
    };
  }

  public async shutdown(): Promise<void> {
    // Clear timers
    if (this.executionTimer) clearInterval(this.executionTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.checkpointTimer) clearInterval(this.checkpointTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);

    // Cancel active executions
    for (const execution of this.activeExecutions.values()) {
      await this.cancelExecution(execution.executionId, 'Engine shutdown');
    }

    this.emit('shutdown');
  }
}

// =============================================================================
// Supporting Interface Definitions
// =============================================================================

export interface UEPRetryConfiguration {
  enabled: boolean;
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

export interface UEPAgentPerformance {
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
}

export interface UEPResourceUsage {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}

export interface UEPExecutionMetrics {
  stepsExecuted: number;
  stepsSuccessful: number;
  stepsFailed: number;
  executionTime: number;
  compensationTime: number;
  resourceUsage: UEPResourceUsage;
}

export interface UEPStepMetrics {
  executionTime: number;
  retryCount: number;
  resourceUsage: UEPResourceUsage;
}

export interface UEPStepTrace {
  timestamp: Date;
  event: string;
  data: any;
}

export interface UEPWorkflowError {
  type: string;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface UEPStepError {
  type: string;
  message: string;
  code: string;
  retryable?: boolean;
  context?: Record<string, any>;
}

export default UEPWorkflowEngine;