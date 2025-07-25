/**
 * Project Context Manager - Core Implementation
 * 
 * Central manager for shared project state across all meta-agents.
 * Provides autonomous coordination, task delegation, and context persistence.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { EventEmitter } from 'events';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import {
  IProjectContextManager,
  ProjectContext,
  ProjectContextConfig,
  ProjectTask,
  ActiveAgent,
  AgentDecision,
  WorkflowHandoff,
  CompletionStatus,
  ProjectContextStats,
  ProjectContextEvent,
  ProjectEventType,
  ContextHistoryEntry,
  ProjectContextError,
  ProjectNotFoundError,
  AgentNotFoundError,
  TaskNotFoundError,
  TaskStatus,
  AgentStatus,
  HandoffStatus,
  HealthStatus
} from './interfaces/IProjectContext';

/**
 * Redis key patterns for project context storage
 */
const RedisKeys = {
  project: (projectId: string) => `project:context:${projectId}`,
  tasks: (projectId: string) => `project:tasks:${projectId}`,
  agents: (projectId: string) => `project:agents:${projectId}`,
  decisions: (projectId: string) => `project:decisions:${projectId}`,
  handoffs: (projectId: string) => `project:handoffs:${projectId}`,
  completion: (projectId: string) => `project:completion:${projectId}`,
  history: (projectId: string) => `project:history:${projectId}`,
  sharedState: (projectId: string) => `project:shared:${projectId}`,
  
  // Indexes for fast queries
  agentActivity: (agentId: string) => `index:agent:activity:${agentId}`,
  taskDependencies: (taskId: string) => `index:task:dependencies:${taskId}`,
  projectStatus: (status: string) => `index:project:status:${status}`,
  dailyActivity: (date: string) => `index:activity:daily:${date}`
};

/**
 * Default configuration for ProjectContext Manager
 */
const DEFAULT_CONFIG: Partial<ProjectContextConfig> = {
  maxTasks: 1000,
  maxAgents: 50,
  maxHistoryEntries: 1000,
  cacheTTL: 3600, // 1 hour
  enablePersistence: true,
  enableCrossAgentSharing: true,
  enableAuditLogging: true,
  enableUEPIntegration: true,
  enableIOAIntegration: true,
  enableRAGIntegration: true,
  batchUpdateSize: 100,
  maxConcurrentOperations: 10,
  enableCaching: true,
  
  escalationTimeouts: {
    taskStuckThreshold: 30, // 30 minutes
    agentUnresponsiveThreshold: 15, // 15 minutes
    handoffAcknowledgmentTimeout: 5, // 5 minutes
    decisionReviewTimeout: 60 // 1 hour
  },
  
  escalationRules: [
    {
      condition: 'task_stuck',
      action: 'notify_ioa',
      priority: 1,
      enabled: true
    },
    {
      condition: 'agent_unresponsive',
      action: 'reassign_task',
      priority: 2,
      enabled: true
    },
    {
      condition: 'handoff_timeout',
      action: 'escalate_to_user',
      priority: 3,
      enabled: true
    }
  ]
};

/**
 * ProjectContext Manager Implementation
 * 
 * Manages shared project state, agent coordination, and task delegation
 * for autonomous meta-agent operations.
 */
export class ProjectContextManager extends EventEmitter implements IProjectContextManager {
  private redis: Redis;
  private config: ProjectContextConfig;
  private isInitialized = false;
  private cache = new Map<string, any>();
  private operationQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(config: Partial<ProjectContextConfig> = {}) {
    super();
    
    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    } as ProjectContextConfig;

    // Initialize Redis connection
    this.redis = new Redis({
      url: this.config.redisUrl || process.env.KV_REST_API_URL!,
      token: this.config.redisToken || process.env.KV_REST_API_TOKEN!,
      automaticDeserialization: false,
    });

    console.log('🗂️ ProjectContextManager initialized', {
      projectId: this.config.projectId,
      enablePersistence: this.config.enablePersistence,
      enableCaching: this.config.enableCaching,
      maxTasks: this.config.maxTasks
    });
  }

  /**
   * Initialize the ProjectContext Manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ProjectContextManager already initialized');
      return;
    }

    try {
      // Test Redis connection
      await this.redis.ping();
      console.log('✅ Redis connection established for ProjectContext');

      // Set up event listeners
      this.setupEventListeners();

      // Start background processing
      this.startBackgroundProcessing();

      this.isInitialized = true;
      console.log('🚀 ProjectContextManager initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize ProjectContextManager:', error);
      throw new ProjectContextError('Initialization failed', 'INIT_FAILED');
    }
  }

  /**
   * Shutdown the manager gracefully
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down ProjectContextManager...');
    
    // Process any remaining operations
    await this.processOperationQueue();
    
    // Clear cache
    this.cache.clear();
    
    this.isInitialized = false;
    console.log('✅ ProjectContextManager shutdown complete');
  }

  // =====================================
  // Project Management
  // =====================================

  /**
   * Create a new project context
   */
  async createProject(config: ProjectContextConfig): Promise<string> {
    const projectId = config.projectId || this.generateProjectId();
    
    const projectContext: ProjectContext = {
      projectId,
      name: config.projectId || 'Unnamed Project',
      description: '',
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'initializing',
      metadata: {},
      tasks: [],
      taskDependencies: [],
      agents: [],
      agentDecisions: [],
      workflowHandoffs: [],
      completion: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        blockedTasks: 0,
        completionPercentage: 0,
        blockers: [],
        milestones: [],
        lastUpdated: new Date()
      },
      sharedState: {},
      contextHistory: []
    };

    try {
      await this.storeProjectContext(projectId, projectContext);
      await this.addToIndex('project:status:initializing', projectId);
      
      // Log creation event
      await this.addHistoryEntry(projectId, {
        changeType: 'task_created',
        description: `Project ${projectId} created`,
        changes: { status: 'initializing' }
      });

      this.emitEvent(projectId, 'project_created', { projectContext });
      
      console.log(`✅ Project context created: ${projectId}`);
      return projectId;

    } catch (error) {
      console.error(`❌ Failed to create project ${projectId}:`, error);
      throw new ProjectContextError('Project creation failed', 'CREATE_FAILED', projectId);
    }
  }

  /**
   * Get project context
   */
  async getProject(projectId: string): Promise<ProjectContext | null> {
    try {
      // Check cache first
      const cacheKey = `project:${projectId}`;
      if (this.config.enableCaching && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const projectData = await this.redis.get(RedisKeys.project(projectId));
      
      if (!projectData) {
        return null;
      }

      const project = this.deserializeProjectContext(projectData);
      
      // Cache the result
      if (this.config.enableCaching) {
        this.cache.set(cacheKey, project);
        setTimeout(() => this.cache.delete(cacheKey), this.config.cacheTTL * 1000);
      }

      return project;

    } catch (error) {
      console.error(`❌ Failed to get project ${projectId}:`, error);
      throw new ProjectContextError('Project retrieval failed', 'GET_FAILED', projectId);
    }
  }

  /**
   * Update project context
   */
  async updateProject(projectId: string, updates: Partial<ProjectContext>): Promise<void> {
    try {
      const existing = await this.getProject(projectId);
      if (!existing) {
        throw new ProjectNotFoundError(projectId);
      }

      const updated: ProjectContext = {
        ...existing,
        ...updates,
        lastUpdated: new Date()
      };

      await this.storeProjectContext(projectId, updated);
      
      // Log update event
      await this.addHistoryEntry(projectId, {
        changeType: 'task_updated',
        description: `Project ${projectId} updated`,
        changes: updates
      });

      this.emitEvent(projectId, 'project_updated', { updates });
      
      console.log(`✅ Project context updated: ${projectId}`);

    } catch (error) {
      console.error(`❌ Failed to update project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Delete project context
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      // Remove all related data
      const operations = [
        this.redis.del(RedisKeys.project(projectId)),
        this.redis.del(RedisKeys.tasks(projectId)),
        this.redis.del(RedisKeys.agents(projectId)),
        this.redis.del(RedisKeys.decisions(projectId)),
        this.redis.del(RedisKeys.handoffs(projectId)),
        this.redis.del(RedisKeys.completion(projectId)),
        this.redis.del(RedisKeys.history(projectId)),
        this.redis.del(RedisKeys.sharedState(projectId))
      ];

      await Promise.all(operations);
      
      // Clear from cache
      this.cache.delete(`project:${projectId}`);
      
      console.log(`✅ Project context deleted: ${projectId}`);

    } catch (error) {
      console.error(`❌ Failed to delete project ${projectId}:`, error);
      throw new ProjectContextError('Project deletion failed', 'DELETE_FAILED', projectId);
    }
  }

  // =====================================
  // Task Management
  // =====================================

  /**
   * Add a new task to the project
   */
  async addTask(projectId: string, task: Omit<ProjectTask, 'taskId' | 'createdAt'>): Promise<string> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const taskId = this.generateTaskId();
      const newTask: ProjectTask = {
        ...task,
        taskId,
        createdAt: new Date(),
        status: 'pending',
        toolsUsed: []
      };

      // Add task to project
      project.tasks.push(newTask);
      project.completion.totalTasks++;
      project.lastUpdated = new Date();

      await this.storeProjectContext(projectId, project);
      
      // Update completion tracking
      await this.updateCompletionStatus(projectId);
      
      // Log task creation
      await this.addHistoryEntry(projectId, {
        changeType: 'task_created',
        agentId: task.agentId,
        description: `Task created: ${task.description}`,
        changes: { taskId, status: 'pending' }
      });

      this.emitEvent(projectId, 'task_created', { task: newTask });
      
      console.log(`✅ Task added to project ${projectId}: ${taskId}`);
      return taskId;

    } catch (error) {
      console.error(`❌ Failed to add task to project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update task status and details
   */
  async updateTask(projectId: string, taskId: string, updates: Partial<ProjectTask>): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const taskIndex = project.tasks.findIndex(t => t.taskId === taskId);
      if (taskIndex === -1) {
        throw new TaskNotFoundError(projectId, taskId);
      }

      const existingTask = project.tasks[taskIndex];
      project.tasks[taskIndex] = {
        ...existingTask,
        ...updates
      };

      project.lastUpdated = new Date();
      await this.storeProjectContext(projectId, project);
      
      // Update completion if status changed
      if (updates.status) {
        await this.updateCompletionStatus(projectId);
      }
      
      // Log task update
      await this.addHistoryEntry(projectId, {
        changeType: 'task_updated',
        agentId: existingTask.agentId,
        description: `Task updated: ${existingTask.description}`,
        changes: updates
      });

      // Emit appropriate events
      if (updates.status === 'completed') {
        this.emitEvent(projectId, 'task_completed', { taskId, task: project.tasks[taskIndex] });
      } else if (updates.status === 'failed') {
        this.emitEvent(projectId, 'task_failed', { taskId, task: project.tasks[taskIndex] });
      }
      
      console.log(`✅ Task updated in project ${projectId}: ${taskId}`);

    } catch (error) {
      console.error(`❌ Failed to update task ${taskId} in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Complete a task with result
   */
  async completeTask(projectId: string, taskId: string, result?: any): Promise<void> {
    await this.updateTask(projectId, taskId, {
      status: 'completed',
      completedAt: new Date(),
      result
    });
  }

  /**
   * Mark task as failed with error details
   */
  async failTask(projectId: string, taskId: string, error: string): Promise<void> {
    await this.updateTask(projectId, taskId, {
      status: 'failed',
      completedAt: new Date(),
      errorDetails: error
    });
  }

  /**
   * Get tasks with optional filtering
   */
  async getTasks(projectId: string, filters?: any): Promise<ProjectTask[]> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      let tasks = project.tasks;

      // Apply filters if provided
      if (filters) {
        if (filters.status) {
          tasks = tasks.filter(t => filters.status.includes(t.status));
        }
        if (filters.agentId) {
          tasks = tasks.filter(t => t.agentId === filters.agentId);
        }
        if (filters.priority) {
          tasks = tasks.filter(t => filters.priority.includes(t.priority));
        }
      }

      return tasks;

    } catch (error) {
      console.error(`❌ Failed to get tasks for project ${projectId}:`, error);
      throw error;
    }
  }

  // =====================================
  // Agent Coordination
  // =====================================

  /**
   * Register an agent with the project
   */
  async registerAgent(projectId: string, agent: Omit<ActiveAgent, 'startedAt' | 'lastActivity'>): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      // Check if agent already registered
      const existingIndex = project.agents.findIndex(a => a.agentId === agent.agentId);
      
      const activeAgent: ActiveAgent = {
        ...agent,
        startedAt: new Date(),
        lastActivity: new Date()
      };

      if (existingIndex >= 0) {
        project.agents[existingIndex] = activeAgent;
      } else {
        project.agents.push(activeAgent);
      }

      project.lastUpdated = new Date();
      await this.storeProjectContext(projectId, project);
      
      // Add to agent activity index
      await this.addToIndex(RedisKeys.agentActivity(agent.agentId), projectId);
      
      // Log agent registration
      await this.addHistoryEntry(projectId, {
        changeType: 'agent_joined',
        agentId: agent.agentId,
        description: `Agent ${agent.agentId} joined project`,
        changes: { agentType: agent.agentType, status: agent.status }
      });

      this.emitEvent(projectId, 'agent_joined', { agent: activeAgent });
      
      console.log(`✅ Agent registered in project ${projectId}: ${agent.agentId}`);

    } catch (error) {
      console.error(`❌ Failed to register agent ${agent.agentId} in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister an agent from the project
   */
  async unregisterAgent(projectId: string, agentId: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const agentIndex = project.agents.findIndex(a => a.agentId === agentId);
      if (agentIndex === -1) {
        throw new AgentNotFoundError(projectId, agentId);
      }

      project.agents.splice(agentIndex, 1);
      project.lastUpdated = new Date();
      
      await this.storeProjectContext(projectId, project);
      
      // Log agent departure
      await this.addHistoryEntry(projectId, {
        changeType: 'agent_left',
        agentId,
        description: `Agent ${agentId} left project`,
        changes: {}
      });

      this.emitEvent(projectId, 'agent_left', { agentId });
      
      console.log(`✅ Agent unregistered from project ${projectId}: ${agentId}`);

    } catch (error) {
      console.error(`❌ Failed to unregister agent ${agentId} from project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(projectId: string, agentId: string, status: AgentStatus): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const agentIndex = project.agents.findIndex(a => a.agentId === agentId);
      if (agentIndex === -1) {
        throw new AgentNotFoundError(projectId, agentId);
      }

      project.agents[agentIndex].status = status;
      project.agents[agentIndex].lastActivity = new Date();
      project.lastUpdated = new Date();
      
      await this.storeProjectContext(projectId, project);
      
      console.log(`✅ Agent status updated in project ${projectId}: ${agentId} -> ${status}`);

    } catch (error) {
      console.error(`❌ Failed to update agent status for ${agentId} in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Record an agent decision
   */
  async recordDecision(projectId: string, decision: Omit<AgentDecision, 'decisionId' | 'timestamp'>): Promise<string> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const decisionId = this.generateDecisionId();
      const agentDecision: AgentDecision = {
        ...decision,
        decisionId,
        timestamp: new Date()
      };

      project.agentDecisions.push(agentDecision);
      project.lastUpdated = new Date();
      
      await this.storeProjectContext(projectId, project);
      
      // Log decision
      await this.addHistoryEntry(projectId, {
        changeType: 'decision_made',
        agentId: decision.agentId,
        description: `Decision made: ${decision.decisionType}`,
        changes: { decisionId, confidence: decision.confidence }
      });

      this.emitEvent(projectId, 'decision_made', { decision: agentDecision });
      
      console.log(`✅ Decision recorded in project ${projectId}: ${decisionId}`);
      return decisionId;

    } catch (error) {
      console.error(`❌ Failed to record decision in project ${projectId}:`, error);
      throw error;
    }
  }

  // =====================================
  // Workflow Handoffs
  // =====================================

  /**
   * Initiate a workflow handoff between agents
   */
  async initiateHandoff(projectId: string, handoff: Omit<WorkflowHandoff, 'handoffId' | 'timestamp' | 'status'>): Promise<string> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const handoffId = this.generateHandoffId();
      const workflowHandoff: WorkflowHandoff = {
        ...handoff,
        handoffId,
        timestamp: new Date(),
        status: 'initiated',
        acknowledged: false
      };

      project.workflowHandoffs.push(workflowHandoff);
      project.lastUpdated = new Date();
      
      await this.storeProjectContext(projectId, project);
      
      // Log handoff initiation
      await this.addHistoryEntry(projectId, {
        changeType: 'handoff_initiated',
        agentId: handoff.fromAgentId,
        description: `Handoff initiated: ${handoff.fromAgentId} -> ${handoff.toAgentId}`,
        changes: { handoffId, taskId: handoff.taskId, handoffType: handoff.handoffType }
      });

      this.emitEvent(projectId, 'handoff_initiated', { handoff: workflowHandoff });
      
      console.log(`✅ Handoff initiated in project ${projectId}: ${handoffId}`);
      return handoffId;

    } catch (error) {
      console.error(`❌ Failed to initiate handoff in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Acknowledge a workflow handoff
   */
  async acknowledgeHandoff(projectId: string, handoffId: string, agentId: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const handoffIndex = project.workflowHandoffs.findIndex(h => h.handoffId === handoffId);
      if (handoffIndex === -1) {
        throw new ProjectContextError('Handoff not found', 'HANDOFF_NOT_FOUND', projectId);
      }

      const handoff = project.workflowHandoffs[handoffIndex];
      
      // Verify the acknowledging agent is the target
      if (handoff.toAgentId !== agentId) {
        throw new ProjectContextError('Unauthorized handoff acknowledgment', 'UNAUTHORIZED_ACK', projectId, agentId);
      }

      handoff.acknowledged = true;
      handoff.acknowledgedAt = new Date();
      handoff.status = 'acknowledged';
      
      project.lastUpdated = new Date();
      await this.storeProjectContext(projectId, project);
      
      console.log(`✅ Handoff acknowledged in project ${projectId}: ${handoffId}`);

    } catch (error) {
      console.error(`❌ Failed to acknowledge handoff ${handoffId} in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Complete a workflow handoff
   */
  async completeHandoff(projectId: string, handoffId: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const handoffIndex = project.workflowHandoffs.findIndex(h => h.handoffId === handoffId);
      if (handoffIndex === -1) {
        throw new ProjectContextError('Handoff not found', 'HANDOFF_NOT_FOUND', projectId);
      }

      project.workflowHandoffs[handoffIndex].status = 'completed';
      project.workflowHandoffs[handoffIndex].completedAt = new Date();
      
      project.lastUpdated = new Date();
      await this.storeProjectContext(projectId, project);
      
      // Log handoff completion
      await this.addHistoryEntry(projectId, {
        changeType: 'handoff_completed',
        description: `Handoff completed: ${handoffId}`,
        changes: { handoffId, status: 'completed' }
      });

      this.emitEvent(projectId, 'handoff_completed', { handoffId });
      
      console.log(`✅ Handoff completed in project ${projectId}: ${handoffId}`);

    } catch (error) {
      console.error(`❌ Failed to complete handoff ${handoffId} in project ${projectId}:`, error);
      throw error;
    }
  }

  // =====================================
  // Context Sharing
  // =====================================

  /**
   * Share context with specific agents
   */
  async shareContext(projectId: string, agentIds: string[], context: any): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const contextKey = `shared_context_${Date.now()}`;
      project.sharedState[contextKey] = {
        context,
        agentIds,
        createdAt: new Date()
      };

      project.lastUpdated = new Date();
      await this.storeProjectContext(projectId, project);
      
      console.log(`✅ Context shared in project ${projectId} with agents: ${agentIds.join(', ')}`);

    } catch (error) {
      console.error(`❌ Failed to share context in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get shared context for specific agent
   */
  async getSharedContext(projectId: string, agentId: string): Promise<any> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      const sharedContexts = Object.values(project.sharedState)
        .filter((shared: any) => shared.agentIds.includes(agentId))
        .map((shared: any) => shared.context);

      return sharedContexts;

    } catch (error) {
      console.error(`❌ Failed to get shared context for agent ${agentId} in project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update shared state
   */
  async updateSharedState(projectId: string, key: string, value: any): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      project.sharedState[key] = value;
      project.lastUpdated = new Date();
      
      await this.storeProjectContext(projectId, project);
      
      console.log(`✅ Shared state updated in project ${projectId}: ${key}`);

    } catch (error) {
      console.error(`❌ Failed to update shared state in project ${projectId}:`, error);
      throw error;
    }
  }

  // =====================================
  // Monitoring and Statistics
  // =====================================

  /**
   * Get project statistics
   */
  async getStats(projectId: string): Promise<ProjectContextStats> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      // Calculate task statistics
      const tasksByStatus = project.tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<TaskStatus, number>);

      const tasksByPriority = project.tasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1;
        return acc;
      }, {} as any);

      const completedTasks = project.tasks.filter(t => t.status === 'completed');
      const averageCompletionTime = completedTasks.length > 0 
        ? completedTasks.reduce((acc, task) => {
            if (task.completedAt && task.startedAt) {
              return acc + (task.completedAt.getTime() - task.startedAt.getTime());
            }
            return acc;
          }, 0) / completedTasks.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      const successRate = project.tasks.length > 0 
        ? completedTasks.length / project.tasks.length 
        : 0;

      // Calculate agent statistics
      const agentsByStatus = project.agents.reduce((acc, agent) => {
        acc[agent.status] = (acc[agent.status] || 0) + 1;
        return acc;
      }, {} as Record<AgentStatus, number>);

      const averageWorkload = project.agents.length > 0
        ? project.agents.reduce((acc, agent) => acc + agent.workload, 0) / project.agents.length
        : 0;

      // Health indicators
      const stuckTasks = project.tasks.filter(t => 
        t.status === 'in_progress' && 
        t.startedAt && 
        (Date.now() - t.startedAt.getTime()) > (this.config.escalationTimeouts.taskStuckThreshold * 60 * 1000)
      );

      const unresponsiveAgents = project.agents.filter(a =>
        a.status === 'working' &&
        (Date.now() - a.lastActivity.getTime()) > (this.config.escalationTimeouts.agentUnresponsiveThreshold * 60 * 1000)
      );

      let overallStatus: HealthStatus = 'healthy';
      if (project.completion.blockers.length > 0 || stuckTasks.length > 0) {
        overallStatus = 'warning';
      }
      if (unresponsiveAgents.length > 0 || project.tasks.filter(t => t.status === 'failed').length > project.tasks.length * 0.1) {
        overallStatus = 'critical';
      }

      const stats: ProjectContextStats = {
        projectId,
        generatedAt: new Date(),
        taskStats: {
          total: project.tasks.length,
          byStatus: tasksByStatus,
          byPriority: tasksByPriority,
          averageCompletionTime,
          successRate
        },
        agentStats: {
          total: project.agents.length,
          byStatus: agentsByStatus,
          averageWorkload,
          totalDecisions: project.agentDecisions.length,
          totalHandoffs: project.workflowHandoffs.length
        },
        performance: {
          contextUpdateLatency: 50, // TODO: Calculate actual latency
          cacheHitRate: 0.8, // TODO: Calculate actual cache hit rate
          errorRate: 0.02, // TODO: Calculate actual error rate
          throughput: 100 // TODO: Calculate actual throughput
        },
        health: {
          overallStatus,
          blockerCount: project.completion.blockers.length,
          stuckTaskCount: stuckTasks.length,
          unresponsiveAgentCount: unresponsiveAgents.length,
          recommendations: []
        }
      };

      return stats;

    } catch (error) {
      console.error(`❌ Failed to get stats for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Get project health status
   */
  async getHealth(projectId: string): Promise<HealthStatus> {
    const stats = await this.getStats(projectId);
    return stats.health.overallStatus;
  }

  /**
   * Get project history
   */
  async getHistory(projectId: string, options?: any): Promise<ContextHistoryEntry[]> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new ProjectNotFoundError(projectId);
      }

      let history = project.contextHistory;

      // Apply filters if provided
      if (options) {
        if (options.agentId) {
          history = history.filter(entry => entry.agentId === options.agentId);
        }
        if (options.changeType) {
          history = history.filter(entry => entry.changeType === options.changeType);
        }
        if (options.limit) {
          history = history.slice(-options.limit);
        }
      }

      return history;

    } catch (error) {
      console.error(`❌ Failed to get history for project ${projectId}:`, error);
      throw error;
    }
  }

  // =====================================
  // Event System
  // =====================================

  /**
   * Set up event listener for specific event type
   */
  onEvent(eventType: ProjectEventType, callback: (event: ProjectContextEvent) => void): void {
    this.on(eventType, callback);
  }

  /**
   * Emit a project event
   */
  emitEvent(projectId: string, eventType: ProjectEventType, data: any): void {
    const event: ProjectContextEvent = {
      eventId: this.generateEventId(),
      projectId,
      eventType,
      data,
      timestamp: new Date(),
      metadata: {}
    };

    this.emit(eventType, event);
    this.emit('*', event); // Emit to wildcard listeners
  }

  // =====================================
  // Private Helper Methods
  // =====================================

  /**
   * Store project context in Redis
   */
  private async storeProjectContext(projectId: string, context: ProjectContext): Promise<void> {
    try {
      const serialized = this.serializeProjectContext(context);
      await this.redis.setex(RedisKeys.project(projectId), this.config.cacheTTL, serialized);
      
      // Clear cache
      this.cache.delete(`project:${projectId}`);
      
    } catch (error) {
      console.error(`❌ Failed to store project context ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Update completion status
   */
  private async updateCompletionStatus(projectId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) return;

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.status === 'completed').length;
    const failedTasks = project.tasks.filter(t => t.status === 'failed').length;
    const blockedTasks = project.tasks.filter(t => t.status === 'blocked').length;

    project.completion = {
      ...project.completion,
      totalTasks,
      completedTasks,
      failedTasks,
      blockedTasks,
      completionPercentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      lastUpdated: new Date()
    };

    await this.storeProjectContext(projectId, project);
  }

  /**
   * Add entry to project history
   */
  private async addHistoryEntry(projectId: string, entry: Omit<ContextHistoryEntry, 'entryId' | 'timestamp' | 'metadata'>): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) return;

    const historyEntry: ContextHistoryEntry = {
      ...entry,
      entryId: this.generateHistoryId(),
      timestamp: new Date(),
      metadata: {}
    };

    project.contextHistory.push(historyEntry);
    
    // Limit history size
    if (project.contextHistory.length > this.config.maxHistoryEntries) {
      project.contextHistory = project.contextHistory.slice(-this.config.maxHistoryEntries);
    }

    await this.storeProjectContext(projectId, project);
  }

  /**
   * Add item to Redis index
   */
  private async addToIndex(indexKey: string, value: string): Promise<void> {
    try {
      await this.redis.sadd(indexKey, value);
    } catch (error) {
      console.warn(`⚠️ Failed to add to index ${indexKey}:`, error);
    }
  }

  /**
   * Serialize project context for storage
   */
  private serializeProjectContext(context: ProjectContext): string {
    return JSON.stringify(context, (key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
  }

  /**
   * Deserialize project context from storage
   */
  private deserializeProjectContext(data: any): ProjectContext {
    return JSON.parse(data, (key, value) => {
      if (value && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for escalation events
    this.on('escalation_triggered', (event: ProjectContextEvent) => {
      console.log(`🚨 Escalation triggered in project ${event.projectId}:`, event.data);
      // TODO: Implement escalation logic
    });

    // Listen for milestone events
    this.on('milestone_reached', (event: ProjectContextEvent) => {
      console.log(`🎯 Milestone reached in project ${event.projectId}:`, event.data);
    });
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    setInterval(() => {
      this.processOperationQueue();
    }, 1000); // Process queue every second
  }

  /**
   * Process operation queue
   */
  private async processOperationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const operations = this.operationQueue.splice(0, this.config.batchUpdateSize);
      await Promise.all(operations.map(op => op()));
    } catch (error) {
      console.error('❌ Error processing operation queue:', error);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Generate unique IDs
   */
  private generateProjectId(): string {
    return `proj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateDecisionId(): string {
    return `decision_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateHandoffId(): string {
    return `handoff_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateHistoryId(): string {
    return `history_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Factory function to create ProjectContext Manager
 */
export function createProjectContextManager(config?: Partial<ProjectContextConfig>): ProjectContextManager {
  return new ProjectContextManager(config);
}

/**
 * Global instance for easy access
 */
let globalProjectContextManager: ProjectContextManager | null = null;

/**
 * Get global ProjectContext Manager instance
 */
export function getGlobalProjectContextManager(config?: Partial<ProjectContextConfig>): ProjectContextManager {
  if (!globalProjectContextManager) {
    globalProjectContextManager = new ProjectContextManager(config);
  }
  return globalProjectContextManager;
}

export * from './interfaces/IProjectContext';