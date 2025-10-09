/**
 * UEP Task State Management Module
 * 
 * Implements the subsystem responsible for tracking and updating the state 
 * of tasks (pending, in-progress, completed, failed) throughout their lifecycle.
 * 
 * Task 31.2: Implement Task State Management Module
 * Depends on: Task 31.1 (Message Passing System)
 */

import { EventEmitter } from 'events';
import { MessagePassingSystem, UEPMessage } from './MessagePassingSystem';

// Task State Types
export type TaskState = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled' | 'blocked';

// Task Priority Levels
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Task Status Update Reason
export type TaskStatusReason = 
  | 'created'
  | 'assigned' 
  | 'started'
  | 'progress_update'
  | 'completed_successfully'
  | 'failed_error'
  | 'cancelled_user'
  | 'blocked_dependency'
  | 'timeout'
  | 'retry_exhausted';

// Task Definition
export interface UEPTask {
  // Core identification
  id: string;
  sessionId: string;
  parentTaskId?: string;
  
  // Task metadata
  title: string;
  description: string;
  type: string;
  priority: TaskPriority;
  
  // State management
  state: TaskState;
  stateHistory: TaskStateTransition[];
  
  // Assignment and execution
  assignedAgentId?: string;
  requesterAgentId: string;
  
  // Progress tracking
  progress: number; // 0-100
  startedAt?: number;
  completedAt?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  
  // Task data
  input: any;
  output?: any;
  error?: string;
  
  // Dependencies and relationships
  dependencies: string[]; // Task IDs this task depends on
  dependents: string[];   // Task IDs that depend on this task
  
  // Configuration
  options: {
    timeout?: number;
    maxRetries?: number;
    retryCount: number;
    autoRetry: boolean;
    persistent: boolean;
  };
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

// Task State Transition Record
export interface TaskStateTransition {
  id: string;
  taskId: string;
  fromState: TaskState;
  toState: TaskState;
  reason: TaskStatusReason;
  agentId: string;
  timestamp: number;
  metadata?: any;
  error?: string;
}

// Task Query Options
export interface TaskQueryOptions {
  states?: TaskState[];
  assignedAgentId?: string;
  requesterAgentId?: string;
  priority?: TaskPriority[];
  sessionId?: string;
  type?: string[];
  createdAfter?: number;
  createdBefore?: number;
  limit?: number;
  offset?: number;
}

// Task Update Request
export interface TaskUpdateRequest {
  taskId: string;
  agentId: string;
  updates: {
    state?: TaskState;
    progress?: number;
    output?: any;
    error?: string;
    assignedAgentId?: string;
  };
  reason: TaskStatusReason;
  metadata?: any;
}

// Task Statistics
export interface TaskStatistics {
  total: number;
  byState: Record<TaskState, number>;
  byPriority: Record<TaskPriority, number>;
  averageCompletionTime: number;
  successRate: number;
  activeAgents: number;
  systemUptime: number;
}

/**
 * Task State Manager Implementation
 */
export class TaskStateManager extends EventEmitter {
  private tasks: Map<string, UEPTask> = new Map();
  private stateTransitions: Map<string, TaskStateTransition[]> = new Map();
  private agentTasks: Map<string, Set<string>> = new Map(); // agentId -> taskId set
  private sessionTasks: Map<string, Set<string>> = new Map(); // sessionId -> taskId set
  private messageSystem: MessagePassingSystem;
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(messageSystem: MessagePassingSystem) {
    super();
    this.messageSystem = messageSystem;
    
    // Register this TaskStateManager as a system agent
    this.registerAsSystemAgent();
    
    // Listen for message system events
    this.messageSystem.on('task.message', this.handleTaskMessage.bind(this));
    
    // Start background cleanup
    this.startBackgroundCleanup();
    
    console.log('🗂️ Task State Manager initialized');
  }

  /**
   * Register TaskStateManager as a system agent to receive messages
   */
  private async registerAsSystemAgent(): Promise<void> {
    try {
      await this.messageSystem.registerAgent({
        agentId: 'task-state-manager',
        agentType: 'system-task-manager',
        capabilities: ['task-creation', 'task-state-management', 'task-coordination'],
        subscribedMessageTypes: ['task.request', 'task.response', 'task.status']
      });
      console.log('✅ Task State Manager registered as system agent');
    } catch (error) {
      console.warn('⚠️ Failed to register TaskStateManager as agent:', error);
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData: Partial<UEPTask>): Promise<UEPTask> {
    const now = Date.now();
    
    const task: UEPTask = {
      id: taskData.id || this.generateTaskId(),
      sessionId: taskData.sessionId || this.generateSessionId(),
      parentTaskId: taskData.parentTaskId,
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      type: taskData.type || 'generic',
      priority: taskData.priority || 'medium',
      state: 'pending',
      stateHistory: [],
      assignedAgentId: taskData.assignedAgentId,
      requesterAgentId: taskData.requesterAgentId || 'system',
      progress: 0,
      input: taskData.input || {},
      dependencies: taskData.dependencies || [],
      dependents: [],
      options: {
        timeout: 300000, // 5 minutes default
        maxRetries: 3,
        retryCount: 0,
        autoRetry: true,
        persistent: false,
        ...taskData.options
      },
      createdAt: now,
      updatedAt: now,
      expiresAt: taskData.options?.timeout ? now + taskData.options.timeout : undefined
    };

    // Validate dependencies
    await this.validateDependencies(task.dependencies);
    
    // Store task
    this.tasks.set(task.id, task);
    this.stateTransitions.set(task.id, []);
    
    // Update agent and session mappings
    if (task.assignedAgentId) {
      this.addTaskToAgent(task.assignedAgentId, task.id);
    }
    this.addTaskToSession(task.sessionId, task.id);
    
    // Record initial state transition
    await this.recordStateTransition(task.id, 'pending', 'pending', 'created', task.requesterAgentId);
    
    this.emit('task.created', task);
    
    console.log(`📋 Task created: ${task.id} (${task.title})`);
    return task;
  }

  /**
   * Update task state and properties
   */
  async updateTask(updateRequest: TaskUpdateRequest): Promise<boolean> {
    const task = this.tasks.get(updateRequest.taskId);
    if (!task) {
      throw new Error(`Task ${updateRequest.taskId} not found`);
    }

    const previousState = task.state;
    const now = Date.now();
    
    // Validate state transition
    if (updateRequest.updates.state && !this.isValidStateTransition(previousState, updateRequest.updates.state)) {
      throw new Error(`Invalid state transition from ${previousState} to ${updateRequest.updates.state}`);
    }

    // Apply updates atomically
    const updatedTask = { ...task };
    
    if (updateRequest.updates.state) {
      updatedTask.state = updateRequest.updates.state;
      
      // Update progress based on state
      if (updateRequest.updates.state === 'in-progress' && updatedTask.progress === 0) {
        updatedTask.progress = 1;
        updatedTask.startedAt = now;
      } else if (updateRequest.updates.state === 'completed') {
        updatedTask.progress = 100;
        updatedTask.completedAt = now;
        updatedTask.actualDuration = updatedTask.startedAt ? now - updatedTask.startedAt : undefined;
      } else if (updateRequest.updates.state === 'failed') {
        updatedTask.completedAt = now;
        updatedTask.actualDuration = updatedTask.startedAt ? now - updatedTask.startedAt : undefined;
      }
    }
    
    if (updateRequest.updates.progress !== undefined) {
      updatedTask.progress = Math.max(0, Math.min(100, updateRequest.updates.progress));
    }
    
    if (updateRequest.updates.output !== undefined) {
      updatedTask.output = updateRequest.updates.output;
    }
    
    if (updateRequest.updates.error !== undefined) {
      updatedTask.error = updateRequest.updates.error;
    }
    
    if (updateRequest.updates.assignedAgentId !== undefined) {
      // Update agent mappings
      if (task.assignedAgentId) {
        this.removeTaskFromAgent(task.assignedAgentId, task.id);
      }
      if (updateRequest.updates.assignedAgentId) {
        this.addTaskToAgent(updateRequest.updates.assignedAgentId, task.id);
      }
      updatedTask.assignedAgentId = updateRequest.updates.assignedAgentId;
    }
    
    updatedTask.updatedAt = now;
    
    // Store updated task
    this.tasks.set(task.id, updatedTask);
    
    // Record state transition if state changed
    if (updateRequest.updates.state && previousState !== updateRequest.updates.state) {
      await this.recordStateTransition(
        task.id,
        previousState,
        updateRequest.updates.state,
        updateRequest.reason,
        updateRequest.agentId,
        updateRequest.metadata
      );
    }
    
    // Check and update dependent tasks
    if (updatedTask.state === 'completed' || updatedTask.state === 'failed') {
      await this.updateDependentTasks(updatedTask);
    }
    
    // Send state update notification
    await this.notifyStateChange(updatedTask, previousState);
    
    this.emit('task.updated', { task: updatedTask, previousState, updateRequest });
    
    console.log(`📝 Task updated: ${task.id} (${previousState} -> ${updatedTask.state})`);
    return true;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): UEPTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Query tasks with filters
   */
  queryTasks(options: TaskQueryOptions = {}): UEPTask[] {
    let results = Array.from(this.tasks.values());

    // Apply filters
    if (options.states && options.states.length > 0) {
      results = results.filter(task => options.states!.includes(task.state));
    }
    
    if (options.assignedAgentId) {
      results = results.filter(task => task.assignedAgentId === options.assignedAgentId);
    }
    
    if (options.requesterAgentId) {
      results = results.filter(task => task.requesterAgentId === options.requesterAgentId);
    }
    
    if (options.priority && options.priority.length > 0) {
      results = results.filter(task => options.priority!.includes(task.priority));
    }
    
    if (options.sessionId) {
      results = results.filter(task => task.sessionId === options.sessionId);
    }
    
    if (options.type && options.type.length > 0) {
      results = results.filter(task => options.type!.includes(task.type));
    }
    
    if (options.createdAfter) {
      results = results.filter(task => task.createdAt >= options.createdAfter!);
    }
    
    if (options.createdBefore) {
      results = results.filter(task => task.createdAt <= options.createdBefore!);
    }

    // Sort by priority and creation time
    results.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return a.createdAt - b.createdAt; // Older tasks first
    });

    // Apply pagination
    if (options.offset || options.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      results = results.slice(start, end);
    }

    return results;
  }

  /**
   * Get task state history
   */
  getTaskStateHistory(taskId: string): TaskStateTransition[] {
    return this.stateTransitions.get(taskId) || [];
  }

  /**
   * Get tasks assigned to an agent
   */
  getAgentTasks(agentId: string, states?: TaskState[]): UEPTask[] {
    const taskIds = this.agentTasks.get(agentId) || new Set();
    const tasks = Array.from(taskIds)
      .map(id => this.tasks.get(id))
      .filter(task => task !== undefined) as UEPTask[];
    
    if (states && states.length > 0) {
      return tasks.filter(task => states.includes(task.state));
    }
    
    return tasks;
  }

  /**
   * Get system statistics
   */
  getStatistics(): TaskStatistics {
    const tasks = Array.from(this.tasks.values());
    const now = Date.now();
    
    // Count by state
    const byState: Record<TaskState, number> = {
      'pending': 0,
      'in-progress': 0,
      'completed': 0,
      'failed': 0,
      'cancelled': 0,
      'blocked': 0
    };
    
    // Count by priority
    const byPriority: Record<TaskPriority, number> = {
      'low': 0,
      'medium': 0,
      'high': 0,
      'urgent': 0
    };
    
    let totalCompletionTime = 0;
    let completedTasks = 0;
    let successfulTasks = 0;
    
    for (const task of tasks) {
      byState[task.state]++;
      byPriority[task.priority]++;
      
      if (task.state === 'completed' || task.state === 'failed') {
        completedTasks++;
        if (task.actualDuration) {
          totalCompletionTime += task.actualDuration;
        }
        
        if (task.state === 'completed') {
          successfulTasks++;
        }
      }
    }
    
    return {
      total: tasks.length,
      byState,
      byPriority,
      averageCompletionTime: completedTasks > 0 ? totalCompletionTime / completedTasks : 0,
      successRate: completedTasks > 0 ? successfulTasks / completedTasks : 0,
      activeAgents: this.agentTasks.size,
      systemUptime: now - (this.tasks.size > 0 ? Math.min(...tasks.map(t => t.createdAt)) : now)
    };
  }

  /**
   * Private helper methods
   */
  
  private async recordStateTransition(
    taskId: string,
    fromState: TaskState,
    toState: TaskState,
    reason: TaskStatusReason,
    agentId: string,
    metadata?: any
  ): Promise<void> {
    const transition: TaskStateTransition = {
      id: this.generateTransitionId(),
      taskId,
      fromState,
      toState,
      reason,
      agentId,
      timestamp: Date.now(),
      metadata
    };
    
    const history = this.stateTransitions.get(taskId) || [];
    history.push(transition);
    this.stateTransitions.set(taskId, history);
    
    this.emit('task.state.changed', transition);
  }

  private isValidStateTransition(from: TaskState, to: TaskState): boolean {
    const validTransitions: Record<TaskState, TaskState[]> = {
      'pending': ['in-progress', 'cancelled', 'blocked'],
      'in-progress': ['completed', 'failed', 'cancelled', 'blocked'],
      'completed': [], // Terminal state
      'failed': ['pending', 'cancelled'], // Can retry
      'cancelled': [], // Terminal state
      'blocked': ['pending', 'cancelled'] // Can unblock
    };
    
    return validTransitions[from].includes(to);
  }

  private async validateDependencies(dependencies: string[]): Promise<void> {
    for (const depId of dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask) {
        throw new Error(`Dependency task ${depId} not found`);
      }
    }
  }

  private async updateDependentTasks(completedTask: UEPTask): Promise<void> {
    for (const dependentId of completedTask.dependents) {
      const dependentTask = this.tasks.get(dependentId);
      if (!dependentTask) continue;
      
      // Check if all dependencies are completed
      const allDepsCompleted = dependentTask.dependencies.every(depId => {
        const depTask = this.tasks.get(depId);
        return depTask && depTask.state === 'completed';
      });
      
      // If task was blocked and all dependencies are now completed, unblock it
      if (dependentTask.state === 'blocked' && allDepsCompleted) {
        await this.updateTask({
          taskId: dependentId,
          agentId: 'system',
          updates: { state: 'pending' },
          reason: 'blocked_dependency'
        });
      }
    }
  }

  private async notifyStateChange(task: UEPTask, previousState: TaskState): Promise<void> {
    // Send message to assigned agent about state change
    if (task.assignedAgentId) {
      const message: Partial<UEPMessage> = {
        type: 'task.status',
        from: 'task-state-manager',
        to: task.assignedAgentId,
        payload: {
          taskId: task.id,
          previousState,
          currentState: task.state,
          progress: task.progress,
          error: task.error
        },
        options: { requireAcknowledgment: false }
      };
      
      await this.messageSystem.sendMessage(message);
    }
  }

  private handleTaskMessage(message: UEPMessage): void {
    // Handle task-related messages from agents
    if (message.type === 'task.request') {
      this.handleTaskRequest(message);
    } else if (message.type === 'task.response') {
      this.handleTaskResponse(message);
    }
  }

  private async handleTaskRequest(message: UEPMessage): Promise<void> {
    try {
      // Create task from message
      const taskData: Partial<UEPTask> = {
        title: message.payload.title || 'Agent Task Request',
        description: message.payload.description || '',
        type: message.payload.type || 'agent-request',
        priority: message.payload.priority || 'medium',
        requesterAgentId: message.from,
        assignedAgentId: message.payload.assignedAgentId || (message.to !== 'task-state-manager' ? message.to : undefined),
        input: message.payload.input || message.payload,
        sessionId: message.payload.sessionId || message.correlationId,
        options: message.payload.options || {}
      };
      
      const task = await this.createTask(taskData);
      
      // Send response back to requester
      const response: Partial<UEPMessage> = {
        type: 'task.response',
        from: 'task-state-manager',
        to: message.from,
        correlationId: message.id,
        payload: {
          success: true,
          taskId: task.id,
          task
        }
      };
      
      await this.messageSystem.sendMessage(response);
      
      console.log(`📨 Task request processed: ${task.id} for ${message.from}`);
      
    } catch (error) {
      console.error(`❌ Task request failed:`, error);
      
      // Send error response
      const errorResponse: Partial<UEPMessage> = {
        type: 'task.response',
        from: 'task-state-manager',
        to: message.from,
        correlationId: message.id,
        payload: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      
      await this.messageSystem.sendMessage(errorResponse);
    }
  }

  private async handleTaskResponse(message: UEPMessage): Promise<void> {
    const taskId = message.payload.taskId;
    if (!taskId) return;
    
    const updates: any = {};
    
    if (message.payload.state) {
      updates.state = message.payload.state;
    }
    
    if (message.payload.progress !== undefined) {
      updates.progress = message.payload.progress;
    }
    
    if (message.payload.output !== undefined) {
      updates.output = message.payload.output;
    }
    
    if (message.payload.error) {
      updates.error = message.payload.error;
    }
    
    if (Object.keys(updates).length > 0) {
      await this.updateTask({
        taskId,
        agentId: message.from,
        updates,
        reason: 'progress_update'
      });
    }
  }

  private addTaskToAgent(agentId: string, taskId: string): void {
    if (!this.agentTasks.has(agentId)) {
      this.agentTasks.set(agentId, new Set());
    }
    this.agentTasks.get(agentId)!.add(taskId);
  }

  private removeTaskFromAgent(agentId: string, taskId: string): void {
    const agentTaskSet = this.agentTasks.get(agentId);
    if (agentTaskSet) {
      agentTaskSet.delete(taskId);
      if (agentTaskSet.size === 0) {
        this.agentTasks.delete(agentId);
      }
    }
  }

  private addTaskToSession(sessionId: string, taskId: string): void {
    if (!this.sessionTasks.has(sessionId)) {
      this.sessionTasks.set(sessionId, new Set());
    }
    this.sessionTasks.get(sessionId)!.add(taskId);
  }

  private startBackgroundCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTasks();
    }, 60000); // Run every minute
  }

  private cleanupExpiredTasks(): void {
    const now = Date.now();
    const expiredTasks: string[] = [];
    
    for (const [taskId, task] of this.tasks) {
      if (task.expiresAt && now > task.expiresAt && 
          (task.state === 'pending' || task.state === 'in-progress')) {
        expiredTasks.push(taskId);
      }
    }
    
    for (const taskId of expiredTasks) {
      this.updateTask({
        taskId,
        agentId: 'system',
        updates: { state: 'failed', error: 'Task expired' },
        reason: 'timeout'
      });
    }
    
    if (expiredTasks.length > 0) {
      console.log(`🧹 Cleaned up ${expiredTasks.length} expired tasks`);
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransitionId(): string {
    return `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.tasks.clear();
    this.stateTransitions.clear();
    this.agentTasks.clear();
    this.sessionTasks.clear();
    
    console.log('🧹 Task State Manager cleanup completed');
  }
}

// Export factory function
export function createTaskStateManager(messageSystem: MessagePassingSystem): TaskStateManager {
  return new TaskStateManager(messageSystem);
}

export default TaskStateManager;