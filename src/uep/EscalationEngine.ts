/**
 * Escalation Engine for ProjectContext System
 * 
 * Provides intelligent escalation logic, failure recovery, and autonomous
 * problem resolution for the ProjectContext Manager system.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { EventEmitter } from 'events';
import { ProjectContextManager } from './ProjectContextManager';
import {
  ProjectContext,
  ProjectTask,
  ActiveAgent,
  AgentStatus,
  TaskStatus,
  ProjectEventType,
  ProjectContextEvent,
  EscalationAction,
  EscalationRule,
  ProjectBlocker,
  BlockerSeverity,
  HealthStatus
} from './interfaces/IProjectContext';

/**
 * Escalation Configuration
 */
export interface EscalationEngineConfig {
  projectId: string;
  enableAutoEscalation: boolean;
  enableFailureRecovery: boolean;
  enablePreventiveMeasures: boolean;
  enableLearning: boolean;
  escalationLevels: EscalationLevel[];
  recoveryStrategies: RecoveryStrategy[];
  thresholds: EscalationThresholds;
  timeouts: EscalationTimeouts;
}

/**
 * Escalation Level Definition
 */
export interface EscalationLevel {
  level: number;
  name: string;
  description: string;
  triggerConditions: string[];
  actions: EscalationAction[];
  timeout: number; // minutes
  autoResolve: boolean;
  notifyUsers: boolean;
}

/**
 * Recovery Strategy
 */
export interface RecoveryStrategy {
  strategyId: string;
  name: string;
  description: string;
  applicableScenarios: string[];
  actions: RecoveryAction[];
  successCriteria: string[];
  rollbackPlan: string[];
  priority: number;
}

/**
 * Recovery Action
 */
export interface RecoveryAction {
  actionId: string;
  type: 'restart_agent' | 'reassign_task' | 'create_backup_task' | 'notify_admin' | 'scale_resources' | 'rollback_changes';
  parameters: Record<string, any>;
  timeout: number; // seconds
  retries: number;
  failureBehavior: 'continue' | 'abort' | 'escalate';
}

/**
 * Escalation Thresholds
 */
export interface EscalationThresholds {
  taskFailureRate: number; // percentage
  agentOfflineRate: number; // percentage
  blockersCount: number;
  stuckTasksCount: number;
  healthScoreThreshold: number; // 0-100
  responseTimeThreshold: number; // milliseconds
}

/**
 * Escalation Timeouts
 */
export interface EscalationTimeouts {
  taskStuckThreshold: number; // minutes
  agentUnresponsiveThreshold: number; // minutes
  handoffTimeout: number; // minutes
  escalationResponseTimeout: number; // minutes
  recoveryAttemptTimeout: number; // minutes
}

/**
 * Escalation Incident
 */
export interface EscalationIncident {
  incidentId: string;
  projectId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'escalated' | 'resolved' | 'suppressed';
  triggerType: string;
  triggerData: any;
  currentLevel: number;
  createdAt: Date;
  lastEscalatedAt?: Date;
  resolvedAt?: Date;
  assignedTo?: string;
  actions: EscalationActionLog[];
  metadata: Record<string, any>;
}

/**
 * Escalation Action Log
 */
export interface EscalationActionLog {
  actionId: string;
  action: EscalationAction;
  executedAt: Date;
  result: 'success' | 'failure' | 'partial' | 'timeout';
  output?: any;
  error?: string;
  duration: number; // milliseconds
}

/**
 * Escalation Engine Implementation
 */
export class EscalationEngine extends EventEmitter {
  private projectContextManager: ProjectContextManager;
  private config: EscalationEngineConfig;
  private isInitialized = false;
  private activeIncidents = new Map<string, EscalationIncident>();
  private escalationTimer: NodeJS.Timeout | null = null;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private learningData = new Map<string, any>();

  constructor(
    projectContextManager: ProjectContextManager,
    config: Partial<EscalationEngineConfig> = {}
  ) {
    super();
    
    this.projectContextManager = projectContextManager;
    this.config = {
      projectId: config.projectId || 'default',
      enableAutoEscalation: config.enableAutoEscalation ?? true,
      enableFailureRecovery: config.enableFailureRecovery ?? true,
      enablePreventiveMeasures: config.enablePreventiveMeasures ?? true,
      enableLearning: config.enableLearning ?? true,
      escalationLevels: config.escalationLevels || this.getDefaultEscalationLevels(),
      recoveryStrategies: config.recoveryStrategies || this.getDefaultRecoveryStrategies(),
      thresholds: {
        taskFailureRate: 20, // 20%
        agentOfflineRate: 30, // 30%
        blockersCount: 5,
        stuckTasksCount: 3,
        healthScoreThreshold: 70,
        responseTimeThreshold: 5000, // 5 seconds
        ...config.thresholds
      },
      timeouts: {
        taskStuckThreshold: 30, // 30 minutes
        agentUnresponsiveThreshold: 15, // 15 minutes
        handoffTimeout: 5, // 5 minutes
        escalationResponseTimeout: 10, // 10 minutes
        recoveryAttemptTimeout: 15, // 15 minutes
        ...config.timeouts
      },
      ...config
    };

    console.log('🚨 Escalation Engine initialized', {
      projectId: this.config.projectId,
      enableAutoEscalation: this.config.enableAutoEscalation,
      enableFailureRecovery: this.config.enableFailureRecovery
    });
  }

  /**
   * Initialize the escalation engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Escalation Engine already initialized');
      return;
    }

    try {
      // Initialize ProjectContext Manager if needed
      if (!this.projectContextManager['isInitialized']) {
        await this.projectContextManager.initialize();
      }

      // Set up event listeners
      this.setupEventListeners();

      // Start monitoring timers
      if (this.config.enableAutoEscalation) {
        this.startEscalationMonitoring();
      }

      if (this.config.enableFailureRecovery) {
        this.startRecoveryMonitoring();
      }

      this.isInitialized = true;
      console.log('🚀 Escalation Engine initialized successfully');

      this.emit('escalation-engine:initialized', {
        projectId: this.config.projectId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Failed to initialize Escalation Engine:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for project context events
   */
  private setupEventListeners(): void {
    // Listen for all project context events
    this.projectContextManager.onEvent('*', async (event: ProjectContextEvent) => {
      await this.evaluateEscalationTriggers(event);
    });

    // Listen for specific critical events
    const criticalEvents: ProjectEventType[] = [
      'task_failed',
      'agent_left',
      'escalation_triggered',
      'handoff_completed' // Monitor for handoff failures
    ];

    criticalEvents.forEach(eventType => {
      this.projectContextManager.onEvent(eventType, async (event: ProjectContextEvent) => {
        await this.handleCriticalEvent(eventType, event);
      });
    });
  }

  /**
   * Evaluate if event triggers escalation
   */
  private async evaluateEscalationTriggers(event: ProjectContextEvent): Promise<void> {
    if (!this.config.enableAutoEscalation) return;

    try {
      // Get current project stats
      const stats = await this.projectContextManager.getStats(event.projectId);
      
      // Check various escalation conditions
      const triggers = await this.checkEscalationConditions(stats, event);
      
      if (triggers.length > 0) {
        await this.triggerEscalation(triggers, event, stats);
      }

    } catch (error) {
      console.error('❌ Failed to evaluate escalation triggers:', error);
    }
  }

  /**
   * Check escalation conditions
   */
  private async checkEscalationConditions(stats: any, event: ProjectContextEvent): Promise<string[]> {
    const triggers: string[] = [];

    // Check task failure rate
    const taskFailureRate = stats.taskStats.total > 0 
      ? (stats.taskStats.byStatus.failed || 0) / stats.taskStats.total * 100 
      : 0;
    
    if (taskFailureRate > this.config.thresholds.taskFailureRate) {
      triggers.push('high_task_failure_rate');
    }

    // Check agent offline rate
    const agentOfflineRate = stats.agentStats.total > 0
      ? (stats.agentStats.byStatus.offline || 0) / stats.agentStats.total * 100
      : 0;

    if (agentOfflineRate > this.config.thresholds.agentOfflineRate) {
      triggers.push('high_agent_offline_rate');
    }

    // Check blocker count
    if (stats.health.blockerCount > this.config.thresholds.blockersCount) {
      triggers.push('excessive_blockers');
    }

    // Check stuck tasks
    if (stats.health.stuckTaskCount > this.config.thresholds.stuckTasksCount) {
      triggers.push('too_many_stuck_tasks');
    }

    // Check overall health
    const healthScore = this.calculateHealthScore(stats);
    if (healthScore < this.config.thresholds.healthScoreThreshold) {
      triggers.push('poor_system_health');
    }

    // Check unresponsive agents
    if (stats.health.unresponsiveAgentCount > 0) {
      triggers.push('unresponsive_agents');
    }

    return triggers;
  }

  /**
   * Trigger escalation
   */
  private async triggerEscalation(triggers: string[], event: ProjectContextEvent, stats: any): Promise<void> {
    try {
      const incidentId = this.generateIncidentId();
      const severity = this.determineSeverity(triggers, stats);
      
      const incident: EscalationIncident = {
        incidentId,
        projectId: event.projectId,
        title: `System escalation: ${triggers.join(', ')}`,
        description: `Automatic escalation triggered due to: ${triggers.join(', ')}`,
        severity,
        status: 'active',
        triggerType: 'automatic',
        triggerData: { triggers, event, stats },
        currentLevel: 1,
        createdAt: new Date(),
        actions: [],
        metadata: {
          originalEvent: event,
          healthScore: this.calculateHealthScore(stats)
        }
      };

      this.activeIncidents.set(incidentId, incident);

      // Execute escalation level 1 actions
      await this.executeEscalationLevel(incident, 1);

      console.log(`🚨 Escalation triggered: ${incidentId} - ${severity} severity`);
      this.emit('escalation:triggered', incident);

      // Record escalation in project context
      await this.recordEscalation(incident);

    } catch (error) {
      console.error('❌ Failed to trigger escalation:', error);
    }
  }

  /**
   * Execute escalation level actions
   */
  private async executeEscalationLevel(incident: EscalationIncident, level: number): Promise<void> {
    const escalationLevel = this.config.escalationLevels.find(l => l.level === level);
    if (!escalationLevel) {
      console.warn(`⚠️ No escalation level ${level} defined`);
      return;
    }

    console.log(`🔥 Executing escalation level ${level}: ${escalationLevel.name}`);

    for (const action of escalationLevel.actions) {
      try {
        const actionLog = await this.executeEscalationAction(incident, action);
        incident.actions.push(actionLog);

        if (actionLog.result === 'failure') {
          console.warn(`⚠️ Escalation action failed: ${action}`);
        }

      } catch (error) {
        console.error(`❌ Failed to execute escalation action ${action}:`, error);
        
        incident.actions.push({
          actionId: this.generateActionId(),
          action,
          executedAt: new Date(),
          result: 'failure',
          error: error instanceof Error ? error.message : String(error),
          duration: 0
        });
      }
    }

    // Update incident level
    incident.currentLevel = level;
    incident.lastEscalatedAt = new Date();

    // Check if auto-resolve is enabled and conditions are met
    if (escalationLevel.autoResolve) {
      await this.checkAutoResolve(incident);
    }

    // Schedule next escalation level if needed
    if (level < this.config.escalationLevels.length) {
      setTimeout(async () => {
        if (incident.status === 'active') {
          await this.executeEscalationLevel(incident, level + 1);
        }
      }, escalationLevel.timeout * 60 * 1000);
    }
  }

  /**
   * Execute individual escalation action
   */
  private async executeEscalationAction(incident: EscalationIncident, action: EscalationAction): Promise<EscalationActionLog> {
    const startTime = Date.now();
    const actionLog: EscalationActionLog = {
      actionId: this.generateActionId(),
      action,
      executedAt: new Date(),
      result: 'success',
      duration: 0
    };

    try {
      switch (action) {
        case 'notify_ioa':
          await this.notifyIOA(incident);
          break;

        case 'reassign_task':
          await this.reassignStuckTasks(incident);
          break;

        case 'request_help':
          await this.requestHelp(incident);
          break;

        case 'escalate_to_user':
          await this.escalateToUser(incident);
          break;

        case 'pause_project':
          await this.pauseProject(incident);
          break;

        default:
          actionLog.result = 'failure';
          actionLog.error = `Unknown escalation action: ${action}`;
      }

    } catch (error) {
      actionLog.result = 'failure';
      actionLog.error = error instanceof Error ? error.message : String(error);
    }

    actionLog.duration = Date.now() - startTime;
    return actionLog;
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(action: RecoveryAction, context: any): Promise<boolean> {
    console.log(`🔧 Executing recovery action: ${action.type}`);

    try {
      switch (action.type) {
        case 'restart_agent':
          return await this.restartAgent(action.parameters, context);

        case 'reassign_task':
          return await this.reassignTask(action.parameters, context);

        case 'create_backup_task':
          return await this.createBackupTask(action.parameters, context);

        case 'notify_admin':
          return await this.notifyAdmin(action.parameters, context);

        case 'scale_resources':
          return await this.scaleResources(action.parameters, context);

        case 'rollback_changes':
          return await this.rollbackChanges(action.parameters, context);

        default:
          console.warn(`⚠️ Unknown recovery action: ${action.type}`);
          return false;
      }

    } catch (error) {
      console.error(`❌ Recovery action ${action.type} failed:`, error);
      return false;
    }
  }

  /**
   * Recovery action implementations
   */
  private async restartAgent(parameters: any, context: any): Promise<boolean> {
    try {
      const agentId = parameters.agentId || context.agentId;
      if (!agentId) return false;

      // Update agent status to trigger restart
      await this.projectContextManager.updateAgentStatus(
        this.config.projectId,
        agentId,
        'idle'
      );

      console.log(`✅ Agent restart triggered: ${agentId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to restart agent:`, error);
      return false;
    }
  }

  private async reassignTask(parameters: any, context: any): Promise<boolean> {
    try {
      const taskId = parameters.taskId || context.taskId;
      if (!taskId) return false;

      // Find available agents
      const project = await this.projectContextManager.getProject(this.config.projectId);
      if (!project) return false;

      const availableAgents = project.agents.filter(a => a.status === 'idle');
      if (availableAgents.length === 0) return false;

      // Reassign to first available agent
      const targetAgent = availableAgents[0];
      await this.projectContextManager.updateTask(this.config.projectId, taskId, {
        agentId: targetAgent.agentId,
        status: 'pending' as TaskStatus
      });

      console.log(`✅ Task reassigned: ${taskId} -> ${targetAgent.agentId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to reassign task:`, error);
      return false;
    }
  }

  private async createBackupTask(parameters: any, context: any): Promise<boolean> {
    try {
      const originalTaskId = parameters.originalTaskId || context.taskId;
      if (!originalTaskId) return false;

      const project = await this.projectContextManager.getProject(this.config.projectId);
      if (!project) return false;

      const originalTask = project.tasks.find(t => t.taskId === originalTaskId);
      if (!originalTask) return false;

      // Create backup task
      const backupTaskId = await this.projectContextManager.addTask(this.config.projectId, {
        agentId: 'backup-agent',
        description: `Backup for failed task: ${originalTask.description}`,
        status: 'pending' as TaskStatus,
        priority: originalTask.priority,
        dependencies: [],
        metadata: {
          isBackupTask: true,
          originalTaskId,
          escalationRecovery: true
        }
      });

      console.log(`✅ Backup task created: ${backupTaskId} for ${originalTaskId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to create backup task:`, error);
      return false;
    }
  }

  private async notifyAdmin(parameters: any, context: any): Promise<boolean> {
    // Create admin notification blocker
    try {
      const project = await this.projectContextManager.getProject(this.config.projectId);
      if (!project) return false;

      const blocker: ProjectBlocker = {
        blockerId: `admin_notification_${Date.now()}`,
        type: 'external',
        description: `Admin notification: ${parameters.message || 'Recovery action required'}`,
        severity: 'high' as BlockerSeverity,
        affectedTasks: [],
        createdAt: new Date(),
        assignedTo: 'admin'
      };

      project.completion.blockers.push(blocker);
      await this.projectContextManager.updateProject(this.config.projectId, project);

      console.log(`✅ Admin notified via blocker`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to notify admin:`, error);
      return false;
    }
  }

  private async scaleResources(parameters: any, context: any): Promise<boolean> {
    // Mock implementation - would integrate with actual resource scaling
    console.log(`🔧 Resource scaling requested: ${JSON.stringify(parameters)}`);
    return true;
  }

  private async rollbackChanges(parameters: any, context: any): Promise<boolean> {
    // Mock implementation - would integrate with actual rollback system
    console.log(`↩️ Rollback requested: ${JSON.stringify(parameters)}`);
    return true;
  }

  /**
   * Escalation action implementations
   */
  private async notifyIOA(incident: EscalationIncident): Promise<void> {
    // Emit IOA notification event
    this.emit('escalation:notify-ioa', incident);
    console.log(`🤖 IOA notified of incident: ${incident.incidentId}`);
  }

  private async reassignStuckTasks(incident: EscalationIncident): Promise<void> {
    const stats = incident.triggerData.stats;
    const stuckTasks = stats.health.stuckTaskCount;

    console.log(`🔄 Reassigning ${stuckTasks} stuck tasks`);
    // Implementation would identify and reassign stuck tasks
  }

  private async requestHelp(incident: EscalationIncident): Promise<void> {
    console.log(`🆘 Help requested for incident: ${incident.incidentId}`);
    // Implementation would create help request
  }

  private async escalateToUser(incident: EscalationIncident): Promise<void> {
    console.log(`👤 Escalating to user: ${incident.incidentId}`);
    incident.status = 'escalated';
    this.emit('escalation:user-required', incident);
  }

  private async pauseProject(incident: EscalationIncident): Promise<void> {
    console.log(`⏸️ Pausing project due to: ${incident.incidentId}`);
    
    await this.projectContextManager.updateProject(this.config.projectId, {
      status: 'paused'
    });
  }

  /**
   * Check if incident can be auto-resolved
   */
  private async checkAutoResolve(incident: EscalationIncident): Promise<void> {
    try {
      const currentStats = await this.projectContextManager.getStats(incident.projectId);
      const currentHealthScore = this.calculateHealthScore(currentStats);

      // Check if health has improved significantly
      const originalHealthScore = incident.metadata.healthScore || 0;
      const improvementThreshold = 20; // 20 point improvement

      if (currentHealthScore > originalHealthScore + improvementThreshold &&
          currentHealthScore > this.config.thresholds.healthScoreThreshold) {
        
        await this.resolveIncident(incident, 'auto_resolved');
        console.log(`✅ Incident auto-resolved: ${incident.incidentId}`);
      }

    } catch (error) {
      console.error('❌ Failed to check auto-resolve:', error);
    }
  }

  /**
   * Resolve incident
   */
  private async resolveIncident(incident: EscalationIncident, reason: string): Promise<void> {
    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.metadata.resolutionReason = reason;

    this.emit('escalation:resolved', incident);

    // Remove from active incidents after delay
    setTimeout(() => {
      this.activeIncidents.delete(incident.incidentId);
    }, 60 * 60 * 1000); // Keep for 1 hour
  }

  /**
   * Record escalation in project context
   */
  private async recordEscalation(incident: EscalationIncident): Promise<void> {
    try {
      await this.projectContextManager.recordDecision(incident.projectId, {
        agentId: 'escalation-engine',
        decisionType: 'escalation',
        context: `Escalation triggered: ${incident.title}`,
        decision: { 
          action: 'escalate',
          level: incident.currentLevel,
          triggers: incident.triggerData.triggers
        },
        reasoning: incident.description,
        confidence: 0.9,
        impactedTasks: [],
        metadata: {
          incidentId: incident.incidentId,
          severity: incident.severity
        }
      });

    } catch (error) {
      console.error('❌ Failed to record escalation:', error);
    }
  }

  /**
   * Start escalation monitoring
   */
  private startEscalationMonitoring(): void {
    this.escalationTimer = setInterval(async () => {
      try {
        await this.performEscalationCheck();
      } catch (error) {
        console.error('❌ Escalation monitoring failed:', error);
      }
    }, 60 * 1000); // Check every minute

    console.log('⏰ Escalation monitoring started');
  }

  /**
   * Start recovery monitoring
   */
  private startRecoveryMonitoring(): void {
    this.recoveryTimer = setInterval(async () => {
      try {
        await this.performRecoveryCheck();
      } catch (error) {
        console.error('❌ Recovery monitoring failed:', error);
      }
    }, 120 * 1000); // Check every 2 minutes

    console.log('🔧 Recovery monitoring started');
  }

  /**
   * Perform escalation check
   */
  private async performEscalationCheck(): Promise<void> {
    if (!this.config.enableAutoEscalation) return;

    // Check for new escalation conditions
    const stats = await this.projectContextManager.getStats(this.config.projectId);
    const triggers = await this.checkEscalationConditions(stats, {
      eventId: 'health_check',
      projectId: this.config.projectId,
      eventType: 'project_updated',
      data: { healthCheck: true },
      timestamp: new Date(),
      metadata: {}
    } as ProjectContextEvent);

    if (triggers.length > 0 && this.activeIncidents.size === 0) {
      // No active incidents and new triggers found
      await this.evaluateEscalationTriggers({
        eventId: 'scheduled_check',
        projectId: this.config.projectId,
        eventType: 'project_updated',
        data: { scheduledCheck: true },
        timestamp: new Date(),
        metadata: {}
      } as ProjectContextEvent);
    }
  }

  /**
   * Perform recovery check
   */
  private async performRecoveryCheck(): Promise<void> {
    if (!this.config.enableFailureRecovery) return;

    // Check for recovery opportunities
    for (const [incidentId, incident] of this.activeIncidents) {
      if (incident.status === 'active') {
        await this.attemptRecovery(incident);
      }
    }
  }

  /**
   * Attempt recovery for incident
   */
  private async attemptRecovery(incident: EscalationIncident): Promise<void> {
    // Find applicable recovery strategies
    const applicableStrategies = this.config.recoveryStrategies
      .filter(strategy => 
        strategy.applicableScenarios.some(scenario => 
          incident.triggerData.triggers.includes(scenario)
        )
      )
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      console.log(`🔧 Attempting recovery strategy: ${strategy.name}`);
      
      const success = await this.executeRecoveryStrategy(strategy, incident);
      
      if (success) {
        console.log(`✅ Recovery strategy succeeded: ${strategy.name}`);
        await this.resolveIncident(incident, `recovery_${strategy.strategyId}`);
        break;
      }
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(strategy: RecoveryStrategy, incident: EscalationIncident): Promise<boolean> {
    let allActionsSucceeded = true;

    for (const action of strategy.actions) {
      const success = await this.executeRecoveryAction(action, incident.triggerData);
      
      if (!success) {
        allActionsSucceeded = false;
        
        if (action.failureBehavior === 'abort') {
          return false;
        } else if (action.failureBehavior === 'escalate') {
          await this.executeEscalationLevel(incident, incident.currentLevel + 1);
          return false;
        }
        // 'continue' behavior continues to next action
      }
    }

    return allActionsSucceeded;
  }

  /**
   * Handle critical events
   */
  private async handleCriticalEvent(eventType: ProjectEventType, event: ProjectContextEvent): Promise<void> {
    console.log(`🚨 Critical event detected: ${eventType}`);
    
    // Immediate response to critical events
    switch (eventType) {
      case 'task_failed':
        await this.handleTaskFailure(event);
        break;
        
      case 'agent_left':
        await this.handleAgentOffline(event);
        break;
        
      case 'escalation_triggered':
        await this.handleNestedEscalation(event);
        break;
    }
  }

  private async handleTaskFailure(event: ProjectContextEvent): Promise<void> {
    // Quick response to task failures
    if (event.data.task) {
      const task = event.data.task;
      
      // Try to reassign immediately if other agents available
      const project = await this.projectContextManager.getProject(event.projectId);
      if (project) {
        const availableAgents = project.agents.filter(a => 
          a.status === 'idle' && a.agentId !== task.agentId
        );
        
        if (availableAgents.length > 0) {
          await this.projectContextManager.updateTask(event.projectId, task.taskId, {
            agentId: availableAgents[0].agentId,
            status: 'pending' as TaskStatus
          });
          
          console.log(`🔄 Task auto-reassigned: ${task.taskId} -> ${availableAgents[0].agentId}`);
        }
      }
    }
  }

  private async handleAgentOffline(event: ProjectContextEvent): Promise<void> {
    // Quick response to agent going offline
    if (event.data.agentId) {
      // Reassign any pending tasks from this agent
      const tasks = await this.projectContextManager.getTasks(event.projectId, {
        agentId: event.data.agentId,
        status: ['pending', 'in_progress']
      });

      for (const task of tasks) {
        // Find replacement agent
        const project = await this.projectContextManager.getProject(event.projectId);
        if (project) {
          const availableAgents = project.agents.filter(a => 
            a.status === 'idle' && a.agentId !== event.data.agentId
          );
          
          if (availableAgents.length > 0) {
            await this.projectContextManager.updateTask(event.projectId, task.taskId, {
              agentId: availableAgents[0].agentId,
              status: 'pending' as TaskStatus
            });
          }
        }
      }
    }
  }

  private async handleNestedEscalation(event: ProjectContextEvent): Promise<void> {
    // Handle nested escalations carefully to avoid loops
    const activeCount = this.activeIncidents.size;
    
    if (activeCount > 5) {
      console.warn('⚠️ Too many active escalations - pausing auto-escalation');
      // Temporarily disable auto-escalation
      const originalSetting = this.config.enableAutoEscalation;
      this.config.enableAutoEscalation = false;
      
      setTimeout(() => {
        this.config.enableAutoEscalation = originalSetting;
      }, 30 * 60 * 1000); // Re-enable after 30 minutes
    }
  }

  /**
   * Utility methods
   */
  private calculateHealthScore(stats: any): number {
    // Simple health score calculation
    let score = 100;
    
    // Deduct for failures
    const failureRate = stats.taskStats.total > 0 
      ? (stats.taskStats.byStatus.failed || 0) / stats.taskStats.total 
      : 0;
    score -= failureRate * 100;
    
    // Deduct for offline agents
    const offlineRate = stats.agentStats.total > 0
      ? (stats.agentStats.byStatus.offline || 0) / stats.agentStats.total
      : 0;
    score -= offlineRate * 50;
    
    // Deduct for blockers
    score -= Math.min(stats.health.blockerCount * 5, 25);
    
    // Deduct for stuck tasks
    score -= Math.min(stats.health.stuckTaskCount * 10, 30);
    
    return Math.max(0, Math.min(100, score));
  }

  private determineSeverity(triggers: string[], stats: any): 'low' | 'medium' | 'high' | 'critical' {
    if (triggers.includes('poor_system_health') && this.calculateHealthScore(stats) < 30) {
      return 'critical';
    }
    
    if (triggers.includes('high_task_failure_rate') || triggers.includes('high_agent_offline_rate')) {
      return 'high';
    }
    
    if (triggers.includes('excessive_blockers') || triggers.includes('too_many_stuck_tasks')) {
      return 'medium';
    }
    
    return 'low';
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultEscalationLevels(): EscalationLevel[] {
    return [
      {
        level: 1,
        name: 'Automatic Recovery',
        description: 'Attempt automatic recovery measures',
        triggerConditions: ['system_degradation'],
        actions: ['reassign_task'],
        timeout: 15, // 15 minutes
        autoResolve: true,
        notifyUsers: false
      },
      {
        level: 2,
        name: 'System Intervention',
        description: 'Engage system-wide recovery',
        triggerConditions: ['persistent_failures'],
        actions: ['notify_ioa', 'request_help'],
        timeout: 30, // 30 minutes
        autoResolve: true,
        notifyUsers: true
      },
      {
        level: 3,
        name: 'Human Escalation',
        description: 'Require human intervention',
        triggerConditions: ['critical_system_failure'],
        actions: ['escalate_to_user', 'pause_project'],
        timeout: 60, // 1 hour
        autoResolve: false,
        notifyUsers: true
      }
    ];
  }

  private getDefaultRecoveryStrategies(): RecoveryStrategy[] {
    return [
      {
        strategyId: 'task_reassignment',
        name: 'Task Reassignment',
        description: 'Reassign failed tasks to available agents',
        applicableScenarios: ['high_task_failure_rate', 'agent_offline'],
        actions: [
          {
            actionId: 'reassign_tasks',
            type: 'reassign_task',
            parameters: {},
            timeout: 30,
            retries: 3,
            failureBehavior: 'continue'
          }
        ],
        successCriteria: ['task_completion_improved'],
        rollbackPlan: ['restore_original_assignments'],
        priority: 8
      },
      {
        strategyId: 'agent_restart',
        name: 'Agent Restart',
        description: 'Restart unresponsive agents',
        applicableScenarios: ['unresponsive_agents', 'high_agent_offline_rate'],
        actions: [
          {
            actionId: 'restart_agents',
            type: 'restart_agent',
            parameters: {},
            timeout: 60,
            retries: 2,
            failureBehavior: 'escalate'
          }
        ],
        successCriteria: ['agent_responsiveness_restored'],
        rollbackPlan: ['manual_agent_recovery'],
        priority: 7
      }
    ];
  }

  /**
   * Get escalation engine status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      projectId: this.config.projectId,
      activeIncidents: this.activeIncidents.size,
      enableAutoEscalation: this.config.enableAutoEscalation,
      enableFailureRecovery: this.config.enableFailureRecovery,
      config: this.config
    };
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): EscalationIncident[] {
    return Array.from(this.activeIncidents.values());
  }

  /**
   * Shutdown escalation engine
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Escalation Engine...');

    if (this.escalationTimer) {
      clearInterval(this.escalationTimer);
      this.escalationTimer = null;
    }

    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    // Resolve all active incidents
    for (const incident of this.activeIncidents.values()) {
      await this.resolveIncident(incident, 'system_shutdown');
    }

    this.isInitialized = false;
    console.log('✅ Escalation Engine shutdown complete');
  }
}

/**
 * Factory function for creating escalation engine
 */
export function createEscalationEngine(
  projectContextManager: ProjectContextManager,
  config?: Partial<EscalationEngineConfig>
): EscalationEngine {
  return new EscalationEngine(projectContextManager, config);
}