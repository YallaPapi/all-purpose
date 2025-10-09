/**
 * InfraOrchestrator (IOA) Integration Adapter
 * 
 * Integrates ProjectContext Manager with InfraOrchestrator for autonomous
 * system management, compliance monitoring, and escalation handling.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs-extra';
import { ProjectContextManager } from './ProjectContextManager';
import {
  ProjectContext,
  AgentStatus,
  TaskStatus,
  ProjectEventType,
  ProjectContextEvent,
  EscalationAction,
  EscalationRule,
  ProjectBlocker,
  Milestone
} from './interfaces/IProjectContext';

/**
 * IOA Integration Configuration
 */
export interface IOAIntegrationConfig {
  projectId: string;
  ioaProjectRoot?: string;
  enableComplianceIntegration: boolean;
  enableTaskGeneration: boolean;
  enableDocumentationSync: boolean;
  enableRAGKnowledgeSync: boolean;
  enableEscalationHandling: boolean;
  complianceScoreThreshold: number;
  escalationTimeouts: {
    complianceCheckInterval: number; // minutes
    escalationResponseTimeout: number; // minutes
    documentationSyncInterval: number; // minutes
  };
}

/**
 * IOA Status Information
 */
export interface IOAStatus {
  initialized: boolean;
  lastComplianceCheck: Date;
  complianceScore: number;
  projectHealth: 'excellent' | 'good' | 'fair' | 'poor';
  activeEscalations: number;
  lastDocumentationUpdate: Date;
  lastRAGSync: Date;
}

/**
 * Escalation Context
 */
export interface EscalationContext {
  escalationId: string;
  projectId: string;
  escalationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trigger: string;
  context: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: EscalationAction[];
}

/**
 * Compliance Integration Data
 */
export interface ComplianceIntegration {
  auditReport: any;
  projectContextStats: any;
  complianceMapping: Map<string, string>; // IOA rule -> ProjectContext task
  lastSync: Date;
}

/**
 * IOA Integration Adapter
 * 
 * Bridges ProjectContext Manager with InfraOrchestrator for autonomous system management
 */
export class IOAIntegration extends EventEmitter {
  private projectContextManager: ProjectContextManager;
  private config: IOAIntegrationConfig;
  private ioaInstance: any = null;
  private isInitialized = false;
  private complianceTimer: NodeJS.Timeout | null = null;
  private documentationTimer: NodeJS.Timeout | null = null;
  private activeEscalations = new Map<string, EscalationContext>();
  private ioaStatus: IOAStatus;
  private complianceIntegration: ComplianceIntegration;

  constructor(
    projectContextManager: ProjectContextManager,
    config: Partial<IOAIntegrationConfig> = {}
  ) {
    super();
    
    this.projectContextManager = projectContextManager;
    this.config = {
      projectId: config.projectId || `ioa_integration_${Date.now()}`,
      ioaProjectRoot: config.ioaProjectRoot || process.cwd(),
      enableComplianceIntegration: config.enableComplianceIntegration ?? true,
      enableTaskGeneration: config.enableTaskGeneration ?? true,
      enableDocumentationSync: config.enableDocumentationSync ?? true,
      enableRAGKnowledgeSync: config.enableRAGKnowledgeSync ?? true,
      enableEscalationHandling: config.enableEscalationHandling ?? true,
      complianceScoreThreshold: config.complianceScoreThreshold ?? 75,
      escalationTimeouts: {
        complianceCheckInterval: config.escalationTimeouts?.complianceCheckInterval ?? 30, // 30 minutes
        escalationResponseTimeout: config.escalationTimeouts?.escalationResponseTimeout ?? 5, // 5 minutes
        documentationSyncInterval: config.escalationTimeouts?.documentationSyncInterval ?? 60, // 1 hour
        ...config.escalationTimeouts
      },
      ...config
    };

    this.ioaStatus = {
      initialized: false,
      lastComplianceCheck: new Date(0),
      complianceScore: 0,
      projectHealth: 'poor',
      activeEscalations: 0,
      lastDocumentationUpdate: new Date(0),
      lastRAGSync: new Date(0)
    };

    this.complianceIntegration = {
      auditReport: null,
      projectContextStats: null,
      complianceMapping: new Map(),
      lastSync: new Date(0)
    };

    console.log('🔗 IOA Integration Adapter initialized', {
      projectId: this.config.projectId,
      enableComplianceIntegration: this.config.enableComplianceIntegration,
      enableEscalationHandling: this.config.enableEscalationHandling
    });
  }

  /**
   * Initialize the IOA integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ IOA Integration already initialized');
      return;
    }

    try {
      // Initialize ProjectContext Manager if needed
      if (!this.projectContextManager['isInitialized']) {
        await this.projectContextManager.initialize();
      }

      // Set up event listeners
      this.setupEventListeners();

      // Start background monitoring if enabled
      if (this.config.enableComplianceIntegration) {
        this.startComplianceMonitoring();
      }

      if (this.config.enableDocumentationSync) {
        this.startDocumentationSync();
      }

      this.isInitialized = true;
      this.ioaStatus.initialized = true;

      console.log('🚀 IOA Integration initialized successfully');
      this.emit('ioa:initialized', { 
        projectId: this.config.projectId,
        timestamp: new Date() 
      });

    } catch (error) {
      console.error('❌ Failed to initialize IOA Integration:', error);
      throw error;
    }
  }

  /**
   * Connect to an InfraOrchestrator instance
   */
  async connectToIOA(ioaInstance: any): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IOA Integration must be initialized first');
    }

    console.log('🔗 Connecting to InfraOrchestrator...');

    this.ioaInstance = ioaInstance;

    // Set up IOA event forwarding if available
    if (ioaInstance.on && typeof ioaInstance.on === 'function') {
      ioaInstance.on('orchestration:completed', this.handleIOAOrchestrationCompleted.bind(this));
      ioaInstance.on('compliance:audit-completed', this.handleIOAComplianceAudit.bind(this));
      ioaInstance.on('documentation:updated', this.handleIOADocumentationUpdate.bind(this));
    }

    // Perform initial compliance sync
    if (this.config.enableComplianceIntegration) {
      await this.performComplianceSync();
    }

    console.log('✅ Connected to InfraOrchestrator');
    this.emit('ioa:connected', { timestamp: new Date() });
  }

  /**
   * Handle project context events for IOA escalation
   */
  private setupEventListeners(): void {
    // Listen for critical project context events
    const criticalEvents: ProjectEventType[] = [
      'task_failed',
      'agent_left',
      'escalation_triggered'
    ];

    criticalEvents.forEach(eventType => {
      this.projectContextManager.onEvent(eventType, async (event: ProjectContextEvent) => {
        await this.handleCriticalEvent(eventType, event);
      });
    });

    // Listen for project status changes
    this.projectContextManager.onEvent('project_updated', async (event: ProjectContextEvent) => {
      await this.handleProjectStatusChange(event);
    });

    // Listen for milestone events
    this.projectContextManager.onEvent('milestone_reached', async (event: ProjectContextEvent) => {
      await this.handleMilestoneReached(event);
    });
  }

  /**
   * Handle critical events that may require IOA intervention
   */
  private async handleCriticalEvent(eventType: ProjectEventType, event: ProjectContextEvent): Promise<void> {
    if (!this.config.enableEscalationHandling) return;

    try {
      const escalationId = this.generateEscalationId();
      const escalationContext: EscalationContext = {
        escalationId,
        projectId: event.projectId,
        escalationType: eventType,
        severity: this.determineSeverity(eventType, event),
        trigger: `ProjectContext event: ${eventType}`,
        context: event.data,
        timestamp: new Date(),
        resolved: false,
        actions: []
      };

      this.activeEscalations.set(escalationId, escalationContext);
      this.ioaStatus.activeEscalations = this.activeEscalations.size;

      // Trigger IOA escalation handling
      await this.triggerIOAEscalation(escalationContext);

      console.log(`🚨 IOA escalation triggered: ${escalationId} for ${eventType}`);
      this.emit('escalation:triggered', escalationContext);

    } catch (error) {
      console.error(`❌ Failed to handle critical event ${eventType}:`, error);
    }
  }

  /**
   * Trigger IOA escalation handling
   */
  private async triggerIOAEscalation(escalationContext: EscalationContext): Promise<void> {
    try {
      // Create escalation tasks in project context
      const escalationTaskId = await this.projectContextManager.addTask(this.config.projectId, {
        agentId: 'ioa-escalation-handler',
        description: `IOA Escalation: ${escalationContext.escalationType}`,
        status: 'pending' as TaskStatus,
        priority: escalationContext.severity === 'critical' ? 'critical' : 'high',
        dependencies: [],
        metadata: {
          escalationId: escalationContext.escalationId,
          escalationType: escalationContext.escalationType,
          severity: escalationContext.severity,
          ioaTriggered: true,
          originalEvent: escalationContext.context
        }
      });

      escalationContext.actions.push('task_created');

      // If IOA instance is available, trigger orchestration
      if (this.ioaInstance) {
        await this.executeIOAResponse(escalationContext);
      }

      // Record escalation decision
      await this.projectContextManager.recordDecision(this.config.projectId, {
        agentId: 'ioa-integration',
        decisionType: 'escalation',
        context: `Escalation triggered for ${escalationContext.escalationType}`,
        decision: { action: 'escalate_to_ioa', taskId: escalationTaskId },
        reasoning: `Critical event requiring IOA intervention: ${escalationContext.trigger}`,
        confidence: 0.9,
        impactedTasks: [escalationTaskId],
        metadata: {
          escalationId: escalationContext.escalationId,
          severity: escalationContext.severity
        }
      });

    } catch (error) {
      console.error('❌ Failed to trigger IOA escalation:', error);
      escalationContext.actions.push('escalation_failed');
    }
  }

  /**
   * Execute IOA response to escalation
   */
  private async executeIOAResponse(escalationContext: EscalationContext): Promise<void> {
    try {
      switch (escalationContext.escalationType) {
        case 'task_failed':
          await this.handleTaskFailureEscalation(escalationContext);
          break;
          
        case 'agent_left':
          await this.handleAgentOfflineEscalation(escalationContext);
          break;
          
        case 'escalation_triggered':
          await this.handleNestedEscalation(escalationContext);
          break;
          
        default:
          await this.handleGenericEscalation(escalationContext);
      }

    } catch (error) {
      console.error(`❌ Failed to execute IOA response for ${escalationContext.escalationType}:`, error);
    }
  }

  /**
   * Handle task failure escalation
   */
  private async handleTaskFailureEscalation(escalationContext: EscalationContext): Promise<void> {
    // Run compliance audit to check for system issues
    if (this.ioaInstance?.runComplianceAudit) {
      const auditReport = await this.ioaInstance.runComplianceAudit();
      
      if (auditReport.complianceScore < this.config.complianceScoreThreshold) {
        // Generate automatic tasks for compliance issues
        await this.generateComplianceTasks(auditReport, escalationContext);
      }
    }

    escalationContext.actions.push('compliance_audit_executed');
  }

  /**
   * Handle agent offline escalation
   */
  private async handleAgentOfflineEscalation(escalationContext: EscalationContext): Promise<void> {
    // Check system health and potentially restart agents
    const stats = await this.projectContextManager.getStats(this.config.projectId);
    
    if (stats.health.unresponsiveAgentCount > stats.agentStats.total * 0.3) {
      // More than 30% of agents offline - trigger system-wide recovery
      await this.triggerSystemRecovery(escalationContext);
    }

    escalationContext.actions.push('agent_health_check_executed');
  }

  /**
   * Handle nested escalation
   */
  private async handleNestedEscalation(escalationContext: EscalationContext): Promise<void> {
    // Log nested escalation and escalate to user if too many levels
    const nestedCount = Array.from(this.activeEscalations.values())
      .filter(e => e.escalationType === 'escalation_triggered').length;

    if (nestedCount > 3) {
      // Too many nested escalations - escalate to user
      await this.escalateToUser(escalationContext);
    }

    escalationContext.actions.push('nested_escalation_handled');
  }

  /**
   * Handle generic escalation
   */
  private async handleGenericEscalation(escalationContext: EscalationContext): Promise<void> {
    // Run full orchestration cycle
    if (this.ioaInstance?.runFullOrchestration) {
      const orchestrationResult = await this.ioaInstance.runFullOrchestration();
      
      if (!orchestrationResult.success) {
        await this.escalateToUser(escalationContext);
      }
    }

    escalationContext.actions.push('full_orchestration_executed');
  }

  /**
   * Generate compliance tasks based on audit report
   */
  private async generateComplianceTasks(auditReport: any, escalationContext: EscalationContext): Promise<void> {
    try {
      for (const criticalIssue of auditReport.criticalIssues.slice(0, 5)) { // Limit to 5 tasks
        const taskId = await this.projectContextManager.addTask(this.config.projectId, {
          agentId: 'ioa-compliance-agent',
          description: `Fix compliance issue: ${criticalIssue.message}`,
          status: 'pending' as TaskStatus,
          priority: 'high',
          dependencies: [],
          metadata: {
            escalationId: escalationContext.escalationId,
            complianceIssue: true,
            ruleId: criticalIssue.ruleId,
            filePath: criticalIssue.filePath,
            lineNumber: criticalIssue.lineNumber,
            suggestion: criticalIssue.suggestion
          }
        });

        // Map IOA rule to project context task
        this.complianceIntegration.complianceMapping.set(criticalIssue.ruleId, taskId);
      }

      console.log(`✅ Generated ${auditReport.criticalIssues.length} compliance tasks`);
      
    } catch (error) {
      console.error('❌ Failed to generate compliance tasks:', error);
    }
  }

  /**
   * Trigger system recovery
   */
  private async triggerSystemRecovery(escalationContext: EscalationContext): Promise<void> {
    try {
      // Create system recovery milestone
      const project = await this.projectContextManager.getProject(this.config.projectId);
      if (project) {
        const milestone: Milestone = {
          milestoneId: `recovery_${Date.now()}`,
          name: 'System Recovery',
          description: 'Recover from agent failure cascade',
          targetDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          progress: 0,
          dependentTasks: [],
          status: 'pending'
        };

        project.completion.milestones.push(milestone);
        await this.projectContextManager.updateProject(this.config.projectId, project);
      }

      escalationContext.actions.push('system_recovery_initiated');
      console.log('🔄 System recovery initiated');

    } catch (error) {
      console.error('❌ Failed to trigger system recovery:', error);
    }
  }

  /**
   * Escalate to user
   */
  private async escalateToUser(escalationContext: EscalationContext): Promise<void> {
    try {
      // Create high-priority blocker
      const project = await this.projectContextManager.getProject(this.config.projectId);
      if (project) {
        const blocker: ProjectBlocker = {
          blockerId: `user_escalation_${Date.now()}`,
          type: 'coordination',
          description: `User intervention required: ${escalationContext.escalationType}`,
          severity: 'critical',
          affectedTasks: [],
          createdAt: new Date(),
          assignedTo: 'user'
        };

        project.completion.blockers.push(blocker);
        await this.projectContextManager.updateProject(this.config.projectId, project);
      }

      escalationContext.actions.push('escalated_to_user');
      console.log('🚨 Escalated to user intervention');

    } catch (error) {
      console.error('❌ Failed to escalate to user:', error);
    }
  }

  /**
   * Start compliance monitoring
   */
  private startComplianceMonitoring(): void {
    this.complianceTimer = setInterval(async () => {
      try {
        await this.performComplianceSync();
      } catch (error) {
        console.error('❌ Compliance monitoring failed:', error);
      }
    }, this.config.escalationTimeouts.complianceCheckInterval * 60 * 1000);

    console.log(`⏰ Compliance monitoring started (interval: ${this.config.escalationTimeouts.complianceCheckInterval} minutes)`);
  }

  /**
   * Start documentation sync
   */
  private startDocumentationSync(): void {
    this.documentationTimer = setInterval(async () => {
      try {
        await this.syncDocumentation();
      } catch (error) {
        console.error('❌ Documentation sync failed:', error);
      }
    }, this.config.escalationTimeouts.documentationSyncInterval * 60 * 1000);

    console.log(`📝 Documentation sync started (interval: ${this.config.escalationTimeouts.documentationSyncInterval} minutes)`);
  }

  /**
   * Perform compliance sync with IOA
   */
  private async performComplianceSync(): Promise<void> {
    if (!this.ioaInstance) return;

    try {
      console.log('🔍 Performing compliance sync with IOA...');

      // Run IOA compliance audit
      const auditReport = await this.ioaInstance.runComplianceAudit();
      
      // Get project context stats
      const projectStats = await this.projectContextManager.getStats(this.config.projectId);

      // Update compliance integration data
      this.complianceIntegration.auditReport = auditReport;
      this.complianceIntegration.projectContextStats = projectStats;
      this.complianceIntegration.lastSync = new Date();

      // Update IOA status
      this.ioaStatus.lastComplianceCheck = new Date();
      this.ioaStatus.complianceScore = auditReport.complianceScore;
      this.ioaStatus.projectHealth = auditReport.projectHealth;

      // Check if compliance score meets threshold
      if (auditReport.complianceScore < this.config.complianceScoreThreshold) {
        await this.handleComplianceThresholdBreach(auditReport);
      }

      console.log(`✅ Compliance sync completed - Score: ${auditReport.complianceScore}/100`);
      this.emit('compliance:synced', { 
        complianceScore: auditReport.complianceScore,
        projectHealth: auditReport.projectHealth
      });

    } catch (error) {
      console.error('❌ Compliance sync failed:', error);
    }
  }

  /**
   * Handle compliance threshold breach
   */
  private async handleComplianceThresholdBreach(auditReport: any): Promise<void> {
    const escalationId = this.generateEscalationId();
    const escalationContext: EscalationContext = {
      escalationId,
      projectId: this.config.projectId,
      escalationType: 'compliance_threshold_breach',
      severity: 'high',
      trigger: `Compliance score ${auditReport.complianceScore} below threshold ${this.config.complianceScoreThreshold}`,
      context: { auditReport, threshold: this.config.complianceScoreThreshold },
      timestamp: new Date(),
      resolved: false,
      actions: []
    };

    this.activeEscalations.set(escalationId, escalationContext);
    await this.triggerIOAEscalation(escalationContext);
  }

  /**
   * Sync documentation updates
   */
  private async syncDocumentation(): Promise<void> {
    if (!this.config.enableDocumentationSync || !this.ioaInstance) return;

    try {
      console.log('📝 Syncing documentation with IOA...');

      // Get latest project stats for documentation context
      const projectStats = await this.projectContextManager.getStats(this.config.projectId);
      
      // Create documentation context for IOA
      const docContext = {
        projectStats,
        ioaStatus: this.ioaStatus,
        activeEscalations: this.activeEscalations.size,
        lastUpdated: new Date()
      };

      // Store documentation context for IOA to use
      const docCachePath = path.join(this.config.ioaProjectRoot, '.rag-cache', 'project-context-docs.json');
      await fs.ensureDir(path.dirname(docCachePath));
      await fs.writeFile(docCachePath, JSON.stringify(docContext, null, 2));

      this.ioaStatus.lastDocumentationUpdate = new Date();
      
      console.log('✅ Documentation sync completed');
      this.emit('documentation:synced', { timestamp: new Date() });

    } catch (error) {
      console.error('❌ Documentation sync failed:', error);
    }
  }

  /**
   * Handle IOA orchestration completion
   */
  private async handleIOAOrchestrationCompleted(result: any): Promise<void> {
    console.log('🎯 IOA orchestration completed:', result);

    // Update project context with orchestration results
    if (result.success) {
      await this.resolveActiveEscalations('orchestration_success');
    }

    this.emit('ioa:orchestration-completed', result);
  }

  /**
   * Handle IOA compliance audit completion
   */
  private async handleIOAComplianceAudit(auditReport: any): Promise<void> {
    console.log('📊 IOA compliance audit completed:', auditReport);

    // Update IOA status
    this.ioaStatus.complianceScore = auditReport.complianceScore;
    this.ioaStatus.projectHealth = auditReport.projectHealth;
    this.ioaStatus.lastComplianceCheck = new Date();

    this.emit('ioa:compliance-audit-completed', auditReport);
  }

  /**
   * Handle IOA documentation update
   */
  private async handleIOADocumentationUpdate(docData: any): Promise<void> {
    console.log('📝 IOA documentation updated:', docData);

    this.ioaStatus.lastDocumentationUpdate = new Date();
    this.emit('ioa:documentation-updated', docData);
  }

  /**
   * Resolve active escalations
   */
  private async resolveActiveEscalations(reason: string): Promise<void> {
    for (const [escalationId, escalation] of this.activeEscalations) {
      if (!escalation.resolved) {
        escalation.resolved = true;
        escalation.resolvedAt = new Date();
        escalation.actions.push(`resolved_by_${reason}`);
      }
    }

    // Clean up resolved escalations older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [escalationId, escalation] of this.activeEscalations) {
      if (escalation.resolved && escalation.resolvedAt && escalation.resolvedAt < oneHourAgo) {
        this.activeEscalations.delete(escalationId);
      }
    }

    this.ioaStatus.activeEscalations = Array.from(this.activeEscalations.values())
      .filter(e => !e.resolved).length;
  }

  /**
   * Utility methods
   */
  private handleProjectStatusChange(event: ProjectContextEvent): Promise<void> {
    // Handle project status changes
    return Promise.resolve();
  }

  private handleMilestoneReached(event: ProjectContextEvent): Promise<void> {
    console.log('🎯 Milestone reached:', event.data);
    return Promise.resolve();
  }

  private determineSeverity(eventType: ProjectEventType, event: ProjectContextEvent): 'low' | 'medium' | 'high' | 'critical' {
    switch (eventType) {
      case 'task_failed':
        return 'high';
      case 'agent_left':
        return 'medium';
      case 'escalation_triggered':
        return 'critical';
      default:
        return 'low';
    }
  }

  private generateEscalationId(): string {
    return `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get IOA integration status
   */
  getStatus(): IOAStatus & { config: IOAIntegrationConfig } {
    return {
      ...this.ioaStatus,
      config: this.config
    };
  }

  /**
   * Get active escalations
   */
  getActiveEscalations(): EscalationContext[] {
    return Array.from(this.activeEscalations.values());
  }

  /**
   * Get compliance integration data
   */
  getComplianceIntegration(): ComplianceIntegration {
    return { ...this.complianceIntegration };
  }

  /**
   * Shutdown IOA integration
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down IOA Integration...');

    if (this.complianceTimer) {
      clearInterval(this.complianceTimer);
      this.complianceTimer = null;
    }

    if (this.documentationTimer) {
      clearInterval(this.documentationTimer);
      this.documentationTimer = null;
    }

    // Resolve all active escalations
    await this.resolveActiveEscalations('system_shutdown');

    this.isInitialized = false;
    this.ioaStatus.initialized = false;

    console.log('✅ IOA Integration shutdown complete');
  }
}

/**
 * Factory function for creating IOA integration
 */
export function createIOAIntegration(
  projectContextManager: ProjectContextManager,
  config?: Partial<IOAIntegrationConfig>
): IOAIntegration {
  return new IOAIntegration(projectContextManager, config);
}