/**
 * Project Context Interface Definitions
 * 
 * Core types and interfaces for the ProjectContext Manager system.
 * Provides shared project state across all meta-agents for autonomous coordination.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { EventEmitter } from 'events';

// Core project context structure
export interface ProjectContext {
  projectId: string;
  name: string;
  description: string;
  createdAt: Date;
  lastUpdated: Date;
  status: ProjectStatus;
  metadata: Record<string, any>;
  
  // Task coordination
  tasks: ProjectTask[];
  taskDependencies: TaskDependency[];
  
  // Agent coordination
  agents: ActiveAgent[];
  agentDecisions: AgentDecision[];
  workflowHandoffs: WorkflowHandoff[];
  
  // Completion tracking
  completion: CompletionStatus;
  
  // Context sharing
  sharedState: Record<string, any>;
  contextHistory: ContextHistoryEntry[];
}

export type ProjectStatus = 'initializing' | 'active' | 'paused' | 'completed' | 'archived' | 'failed';

export interface ProjectTask {
  taskId: string;
  agentId: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dependencies: string[];
  result?: any;
  errorDetails?: string;
  metadata: Record<string, any>;
  
  // UEP integration
  uepRequestId?: string;
  toolsUsed: string[];
  complianceScore?: number;
}

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskDependency {
  taskId: string;
  dependsOn: string;
  dependencyType: DependencyType;
  isBlocking: boolean;
  resolvedAt?: Date;
}

export type DependencyType = 'prerequisite' | 'resource' | 'approval' | 'data' | 'integration';

export interface ActiveAgent {
  agentId: string;
  agentType: string;
  status: AgentStatus;
  currentTaskId?: string;
  sessionId: string;
  startedAt: Date;
  lastActivity: Date;
  capabilities: string[];
  workload: number; // 0-100 percentage
  metadata: Record<string, any>;
}

export type AgentStatus = 'idle' | 'working' | 'blocked' | 'escalating' | 'offline';

export interface AgentDecision {
  decisionId: string;
  agentId: string;
  decisionType: DecisionType;
  context: string;
  decision: any;
  reasoning: string;
  confidence: number; // 0-1
  timestamp: Date;
  impactedTasks: string[];
  reviewStatus?: ReviewStatus;
  metadata: Record<string, any>;
}

export type DecisionType = 'task_assignment' | 'delegation' | 'approval' | 'escalation' | 'completion' | 'priority_change' | 'resource_allocation';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface WorkflowHandoff {
  handoffId: string;
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  handoffType: HandoffType;
  context: any;
  reason: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  completedAt?: Date;
  status: HandoffStatus;
  metadata: Record<string, any>;
}

export type HandoffType = 'delegation' | 'escalation' | 'collaboration' | 'transfer' | 'consultation';
export type HandoffStatus = 'initiated' | 'acknowledged' | 'in_progress' | 'completed' | 'rejected' | 'expired';

export interface CompletionStatus {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  blockedTasks: number;
  completionPercentage: number;
  estimatedCompletion?: Date;
  blockers: ProjectBlocker[];
  milestones: Milestone[];
  lastUpdated: Date;
}

export interface ProjectBlocker {
  blockerId: string;
  type: BlockerType;
  description: string;
  severity: BlockerSeverity;
  affectedTasks: string[];
  createdAt: Date;
  resolvedAt?: Date;
  resolutionPlan?: string;
  assignedTo?: string;
}

export type BlockerType = 'dependency' | 'resource' | 'approval' | 'technical' | 'coordination' | 'external';
export type BlockerSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Milestone {
  milestoneId: string;
  name: string;
  description: string;
  targetDate: Date;
  completedAt?: Date;
  progress: number; // 0-100
  dependentTasks: string[];
  status: MilestoneStatus;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';

export interface ContextHistoryEntry {
  entryId: string;
  timestamp: Date;
  changeType: ContextChangeType;
  agentId?: string;
  description: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
}

export type ContextChangeType = 'task_created' | 'task_updated' | 'agent_joined' | 'agent_left' | 'decision_made' | 'handoff_initiated' | 'milestone_reached' | 'blocker_created' | 'blocker_resolved';

// Configuration interfaces
export interface ProjectContextConfig {
  projectId: string;
  maxTasks: number;
  maxAgents: number;
  maxHistoryEntries: number;
  cacheTTL: number; // seconds
  enablePersistence: boolean;
  enableCrossAgentSharing: boolean;
  enableAuditLogging: boolean;
  redisUrl?: string;
  redisToken?: string;
  
  // Integration settings
  enableUEPIntegration: boolean;
  enableIOAIntegration: boolean;
  enableRAGIntegration: boolean;
  
  // Performance settings
  batchUpdateSize: number;
  maxConcurrentOperations: number;
  enableCaching: boolean;
  
  // Escalation settings
  escalationTimeouts: EscalationTimeouts;
  escalationRules: EscalationRule[];
}

export interface EscalationTimeouts {
  taskStuckThreshold: number; // minutes
  agentUnresponsiveThreshold: number; // minutes
  handoffAcknowledgmentTimeout: number; // minutes
  decisionReviewTimeout: number; // minutes
}

export interface EscalationRule {
  condition: string;
  action: EscalationAction;
  priority: number;
  enabled: boolean;
}

export type EscalationAction = 'notify_ioa' | 'reassign_task' | 'request_help' | 'escalate_to_user' | 'pause_project';

// Query and filter interfaces
export interface ProjectContextQuery {
  projectId: string;
  includeHistory?: boolean;
  includeCompletedTasks?: boolean;
  agentFilter?: string[];
  taskStatusFilter?: TaskStatus[];
  dateRange?: DateRange;
  limit?: number;
  offset?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ProjectContextStats {
  projectId: string;
  generatedAt: Date;
  
  // Task statistics
  taskStats: {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    averageCompletionTime: number; // hours
    successRate: number; // 0-1
  };
  
  // Agent statistics
  agentStats: {
    total: number;
    byStatus: Record<AgentStatus, number>;
    averageWorkload: number; // 0-100
    totalDecisions: number;
    totalHandoffs: number;
  };
  
  // Performance metrics
  performance: {
    contextUpdateLatency: number; // milliseconds
    cacheHitRate: number; // 0-1
    errorRate: number; // 0-1
    throughput: number; // operations per minute
  };
  
  // Health indicators
  health: {
    overallStatus: HealthStatus;
    blockerCount: number;
    stuckTaskCount: number;
    unresponsiveAgentCount: number;
    recommendations: string[];
  };
}

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'degraded';

// Event interfaces for integration
export interface ProjectContextEvent {
  eventId: string;
  projectId: string;
  eventType: ProjectEventType;
  agentId?: string;
  data: any;
  timestamp: Date;
  metadata: Record<string, any>;
}

export type ProjectEventType = 
  | 'project_created' 
  | 'project_updated' 
  | 'task_created' 
  | 'task_started' 
  | 'task_completed' 
  | 'task_failed'
  | 'agent_joined' 
  | 'agent_left' 
  | 'decision_made' 
  | 'handoff_initiated' 
  | 'handoff_completed'
  | 'milestone_reached' 
  | 'blocker_created' 
  | 'blocker_resolved' 
  | 'escalation_triggered';

// Manager interface
export interface IProjectContextManager extends EventEmitter {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Project management
  createProject(config: ProjectContextConfig): Promise<string>;
  getProject(projectId: string): Promise<ProjectContext | null>;
  updateProject(projectId: string, updates: Partial<ProjectContext>): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  
  // Task management
  addTask(projectId: string, task: Omit<ProjectTask, 'taskId' | 'createdAt'>): Promise<string>;
  updateTask(projectId: string, taskId: string, updates: Partial<ProjectTask>): Promise<void>;
  completeTask(projectId: string, taskId: string, result?: any): Promise<void>;
  failTask(projectId: string, taskId: string, error: string): Promise<void>;
  getTasks(projectId: string, filters?: any): Promise<ProjectTask[]>;
  
  // Agent coordination
  registerAgent(projectId: string, agent: Omit<ActiveAgent, 'startedAt' | 'lastActivity'>): Promise<void>;
  unregisterAgent(projectId: string, agentId: string): Promise<void>;
  updateAgentStatus(projectId: string, agentId: string, status: AgentStatus): Promise<void>;
  recordDecision(projectId: string, decision: Omit<AgentDecision, 'decisionId' | 'timestamp'>): Promise<string>;
  
  // Workflow handoffs
  initiateHandoff(projectId: string, handoff: Omit<WorkflowHandoff, 'handoffId' | 'timestamp' | 'status'>): Promise<string>;
  acknowledgeHandoff(projectId: string, handoffId: string, agentId: string): Promise<void>;
  completeHandoff(projectId: string, handoffId: string): Promise<void>;
  
  // Context sharing
  shareContext(projectId: string, agentIds: string[], context: any): Promise<void>;
  getSharedContext(projectId: string, agentId: string): Promise<any>;
  updateSharedState(projectId: string, key: string, value: any): Promise<void>;
  
  // Monitoring and stats
  getStats(projectId: string): Promise<ProjectContextStats>;
  getHealth(projectId: string): Promise<HealthStatus>;
  getHistory(projectId: string, options?: any): Promise<ContextHistoryEntry[]>;
  
  // Integration hooks
  onEvent(eventType: ProjectEventType, callback: (event: ProjectContextEvent) => void): void;
  emitEvent(projectId: string, eventType: ProjectEventType, data: any): void;
}

// Error types
export class ProjectContextError extends Error {
  public readonly projectId?: string;
  public readonly agentId?: string;
  public readonly code: string;
  
  constructor(message: string, code: string, projectId?: string, agentId?: string) {
    super(message);
    this.name = 'ProjectContextError';
    this.code = code;
    this.projectId = projectId;
    this.agentId = agentId;
  }
}

export class ProjectNotFoundError extends ProjectContextError {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND', projectId);
  }
}

export class AgentNotFoundError extends ProjectContextError {
  constructor(projectId: string, agentId: string) {
    super(`Agent not found: ${agentId} in project ${projectId}`, 'AGENT_NOT_FOUND', projectId, agentId);
  }
}

export class TaskNotFoundError extends ProjectContextError {
  constructor(projectId: string, taskId: string) {
    super(`Task not found: ${taskId} in project ${projectId}`, 'TASK_NOT_FOUND', projectId);
  }
}

export class ContextAccessError extends ProjectContextError {
  constructor(projectId: string, agentId: string, operation: string) {
    super(`Agent ${agentId} not authorized for ${operation} in project ${projectId}`, 'ACCESS_DENIED', projectId, agentId);
  }
}