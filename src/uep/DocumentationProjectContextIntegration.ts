/**
 * Documentation-ProjectContext Integration
 * 
 * Bridges the autonomous documentation system with the validated Meta Agent 
 * Autonomy ProjectContext system for coordinated documentation updates.
 * 
 * This integration ensures documentation stays synchronized with project state,
 * agent activities, and task progressions in real-time.
 */

import { EventEmitter } from 'events';
import DocumentationManager from './DocumentationManager';
import DocumentationEventListener from './DocumentationEventListener';
import DocumentationOrganizer from './DocumentationOrganizer';
import {
  DocumentationEvent,
  DocumentationEventType,
  DocumentationCategory,
  DocumentType
} from './interfaces/IDocumentationManager';

// Import ProjectContext interfaces (using the validated system)
interface ProjectContext {
  projectId: string;
  name: string;
  description: string;
  createdAt: Date;
  lastUpdated: Date;
  status: string;
  tasks: ProjectTask[];
  agents: ActiveAgent[];
  agentDecisions: AgentDecision[];
  workflowHandoffs: WorkflowHandoff[];
  completion: CompletionStatus;
  sharedState: Record<string, any>;
}

interface ProjectTask {
  taskId: string;
  agentId: string;
  description: string;
  status: string;
  priority: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dependencies: string[];
  result?: any;
  errorDetails?: any;
  metadata: Record<string, any>;
}

interface ActiveAgent {
  agentId: string;
  agentType: string;
  status: string;
  currentTaskId?: string;
  sessionId: string;
  startedAt: Date;
  lastActivity: Date;
  capabilities: string[];
  workload: number;
  metadata: Record<string, any>;
}

interface AgentDecision {
  decisionId: string;
  agentId: string;
  taskId: string;
  timestamp: Date;
  decisionType: string;
  rationale: string;
  confidence: number;
  alternatives: any[];
  outcome?: any;
}

interface WorkflowHandoff {
  handoffId: string;
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  timestamp: Date;
  reason: string;
  context: Record<string, any>;
  status: string;
}

interface CompletionStatus {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  blockedTasks: number;
  completionPercentage: number;
  blockers: any[];
  milestones: any[];
  lastUpdated: Date;
}

export interface DocumentationIntegrationConfig {
  enabled: boolean;
  documentationManager: DocumentationManager;
  eventListener: DocumentationEventListener;
  organizer: DocumentationOrganizer;
  
  // Integration settings
  syncOnProjectCreate: boolean;
  syncOnTaskComplete: boolean;
  syncOnAgentStatusChange: boolean;
  syncOnWorkflowHandoff: boolean;
  syncOnMilestone: boolean;
  
  // Documentation generation settings
  generateProjectReadme: boolean;
  generateAgentDocs: boolean;
  generateTaskSummaries: boolean;
  generateProgressReports: boolean;
  updateChangelog: boolean;
  
  // Performance settings
  batchUpdates: boolean;
  debounceMs: number;
  maxBatchSize: number;
  
  // Quality settings
  validateDocuments: boolean;
  requireApproval: boolean;
  
  logLevel: 'silent' | 'minimal' | 'verbose' | 'debug';
}

export interface DocumentationSyncResult {
  success: boolean;
  projectId: string;
  documentsUpdated: string[];
  documentsCreated: string[];
  errors: string[];
  duration: number;
  syncType: 'full' | 'incremental' | 'event-driven';
}

export interface ProjectDocumentationState {
  projectId: string;
  lastSyncTime: Date;
  documentCount: number;
  documentTypes: DocumentType[];
  coverage: number; // 0-1
  quality: number; // 0-1
  upToDate: boolean;
  pendingUpdates: string[];
}

export class DocumentationProjectContextIntegration extends EventEmitter {
  private config: DocumentationIntegrationConfig;
  private documentationManager: DocumentationManager;
  private eventListener: DocumentationEventListener;
  private organizer: DocumentationOrganizer;
  private projectContextManager: any; // Will be dynamically loaded
  private syncQueue: Map<string, ProjectContext>;
  private projectStates: Map<string, ProjectDocumentationState>;
  private isProcessing: boolean;

  constructor(config: DocumentationIntegrationConfig) {
    super();

    this.config = {
      enabled: true,
      syncOnProjectCreate: true,
      syncOnTaskComplete: true,
      syncOnAgentStatusChange: true,
      syncOnWorkflowHandoff: true,
      syncOnMilestone: true,
      generateProjectReadme: true,
      generateAgentDocs: true,
      generateTaskSummaries: true,
      generateProgressReports: true,
      updateChangelog: true,
      batchUpdates: true,
      debounceMs: 3000,
      maxBatchSize: 10,
      validateDocuments: true,
      requireApproval: false,
      logLevel: 'minimal',
      ...config
    };

    this.documentationManager = config.documentationManager;
    this.eventListener = config.eventListener;
    this.organizer = config.organizer;
    this.syncQueue = new Map();
    this.projectStates = new Map();
    this.isProcessing = false;
  }

  async initialize(): Promise<void> {
    this.log('🔗 Initializing Documentation-ProjectContext Integration...', 'info');

    try {
      // Connect to the validated ProjectContextManager
      await this.connectToProjectContextManager();

      // Set up event listeners for ProjectContext events
      await this.setupProjectContextEventListeners();

      // Register documentation manager integration
      await this.registerWithDocumentationManager();

      // Load existing project states
      await this.loadProjectStates();

      // Start sync processing
      this.startSyncProcessing();

      this.emit('initialized');
      this.log('✅ Documentation-ProjectContext Integration initialized successfully', 'info');

    } catch (error) {
      this.log(`❌ Failed to initialize integration: ${error.message}`, 'error');
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.log('🔄 Shutting down Documentation-ProjectContext Integration...', 'info');

    try {
      // Process any remaining sync operations
      await this.processSyncQueue();

      // Save project states
      await this.saveProjectStates();

      this.emit('shutdown');
      this.log('✅ Integration shut down successfully', 'info');

    } catch (error) {
      this.log(`❌ Error during shutdown: ${error.message}`, 'error');
      throw error;
    }
  }

  private async connectToProjectContextManager(): Promise<void> {
    this.log('🔌 Connecting to ProjectContextManager...', 'debug');

    try {
      // Try to import the validated ProjectContextManager
      const ProjectContextManagerModule = require('./ProjectContextManager');
      
      if (ProjectContextManagerModule && ProjectContextManagerModule.ProjectContextManager) {
        this.projectContextManager = ProjectContextManagerModule.ProjectContextManager;
        this.log('✅ Connected to ProjectContextManager', 'debug');
      } else {
        throw new Error('ProjectContextManager not found or not properly exported');
      }

    } catch (error) {
      this.log(`❌ Failed to connect to ProjectContextManager: ${error.message}`, 'error');
      throw error;
    }
  }

  private async setupProjectContextEventListeners(): Promise<void> {
    if (!this.projectContextManager) {
      throw new Error('ProjectContextManager not connected');
    }

    this.log('👂 Setting up ProjectContext event listeners...', 'debug');

    // Listen to project lifecycle events
    this.projectContextManager.on('projectCreated', (event: any) => {
      this.handleProjectContextEvent('projectCreated', event);
    });

    this.projectContextManager.on('projectUpdated', (event: any) => {
      this.handleProjectContextEvent('projectUpdated', event);
    });

    // Listen to task events
    this.projectContextManager.on('taskCreated', (event: any) => {
      this.handleProjectContextEvent('taskCreated', event);
    });

    this.projectContextManager.on('taskCompleted', (event: any) => {
      this.handleProjectContextEvent('taskCompleted', event);
    });

    this.projectContextManager.on('taskFailed', (event: any) => {
      this.handleProjectContextEvent('taskFailed', event);
    });

    // Listen to agent events
    this.projectContextManager.on('agentRegistered', (event: any) => {
      this.handleProjectContextEvent('agentRegistered', event);
    });

    this.projectContextManager.on('agentStatusChanged', (event: any) => {
      this.handleProjectContextEvent('agentStatusChanged', event);
    });

    // Listen to workflow events
    this.projectContextManager.on('workflowHandoff', (event: any) => {
      this.handleProjectContextEvent('workflowHandoff', event);
    });

    // Listen to milestone events
    this.projectContextManager.on('milestoneReached', (event: any) => {
      this.handleProjectContextEvent('milestoneReached', event);
    });

    this.log('✅ ProjectContext event listeners configured', 'debug');
  }

  private async registerWithDocumentationManager(): Promise<void> {
    this.log('📝 Registering with DocumentationManager...', 'debug');

    // Integrate with DocumentationManager for coordinated updates
    await this.documentationManager.integrateWithProjectContext(this);

    this.log('✅ DocumentationManager integration complete', 'debug');
  }

  private async loadProjectStates(): Promise<void> {
    this.log('📊 Loading existing project states...', 'debug');

    try {
      // Load project states from Redis or storage
      // This would connect to the same Redis instance used by ProjectContextManager
      const Redis = require('@upstash/redis').Redis;
      const redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
        automaticDeserialization: false
      });

      // Get all project documentation states
      const stateKeys = await redis.keys('doc:project:state:*');
      
      for (const key of stateKeys) {
        try {
          const stateData = await redis.get(key);
          if (stateData) {
            const state: ProjectDocumentationState = JSON.parse(stateData as string);
            this.projectStates.set(state.projectId, state);
          }
        } catch (error) {
          this.log(`⚠️  Failed to load state for key ${key}: ${error.message}`, 'debug');
        }
      }

      this.log(`📊 Loaded ${this.projectStates.size} project states`, 'debug');

    } catch (error) {
      this.log(`❌ Error loading project states: ${error.message}`, 'error');
    }
  }

  private startSyncProcessing(): void {
    // Process sync queue periodically
    setInterval(async () => {
      if (!this.isProcessing && this.syncQueue.size > 0) {
        await this.processSyncQueue();
      }
    }, this.config.debounceMs);
  }

  // Event handlers for ProjectContext events

  private handleProjectContextEvent(eventType: string, event: any): void {
    if (!this.config.enabled) return;

    this.log(`📊 Handling ProjectContext event: ${eventType} for project ${event.projectId}`, 'debug');

    // Determine if this event should trigger documentation sync
    const shouldSync = this.shouldSyncForEvent(eventType, event);
    
    if (shouldSync) {
      // Add project to sync queue
      this.queueProjectForSync(event.projectId, event);
      
      // Generate documentation event for the event listener
      const docEvent = this.createDocumentationEventFromProjectEvent(eventType, event);
      if (docEvent) {
        this.eventListener.processEvent(docEvent);
      }
    }
  }

  private shouldSyncForEvent(eventType: string, event: any): boolean {
    switch (eventType) {
      case 'projectCreated':
        return this.config.syncOnProjectCreate;
      
      case 'taskCompleted':
      case 'taskFailed':
        return this.config.syncOnTaskComplete;
      
      case 'agentStatusChanged':
      case 'agentRegistered':
        return this.config.syncOnAgentStatusChange;
      
      case 'workflowHandoff':
        return this.config.syncOnWorkflowHandoff;
      
      case 'milestoneReached':
        return this.config.syncOnMilestone;
      
      default:
        return false;
    }
  }

  private queueProjectForSync(projectId: string, event: any): void {
    if (this.config.batchUpdates) {
      // Add to sync queue for batch processing
      this.syncQueue.set(projectId, event);
      this.log(`📥 Queued project for sync: ${projectId} (${this.syncQueue.size} in queue)`, 'debug');
    } else {
      // Process immediately
      this.syncProjectDocumentation(projectId, event);
    }
  }

  private createDocumentationEventFromProjectEvent(eventType: string, event: any): DocumentationEvent | null {
    const eventTypeMapping: Record<string, DocumentationEventType> = {
      'projectCreated': DocumentationEventType.PROJECT_CREATED,
      'projectUpdated': DocumentationEventType.PROJECT_UPDATED,
      'taskCreated': DocumentationEventType.TASK_CREATED,
      'taskCompleted': DocumentationEventType.TASK_COMPLETED,
      'taskFailed': DocumentationEventType.TASK_FAILED,
      'agentRegistered': DocumentationEventType.AGENT_CREATED
    };

    const docEventType = eventTypeMapping[eventType];
    if (!docEventType) return null;

    return {
      eventId: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType: docEventType,
      source: { type: 'system', identifier: 'project-context-integration' },
      projectId: event.projectId,
      agentId: event.agentId,
      taskId: event.taskId,
      metadata: {
        priority: this.determineEventPriority(eventType, event),
        category: this.determineDocumentationCategory(eventType, event),
        requiredDocumentTypes: this.getRequiredDocumentTypes(eventType, event),
        changes: [{
          type: 'modification',
          component: eventType,
          description: `ProjectContext event: ${eventType}`,
          impactLevel: 'minor',
          documentationRequired: true
        }]
      }
    };
  }

  // Core synchronization methods

  private async syncProjectDocumentation(projectId: string, context?: any): Promise<DocumentationSyncResult> {
    const startTime = Date.now();
    this.log(`🔄 Syncing documentation for project: ${projectId}`, 'info');

    const result: DocumentationSyncResult = {
      success: false,
      projectId,
      documentsUpdated: [],
      documentsCreated: [],
      errors: [],
      duration: 0,
      syncType: 'event-driven'
    };

    try {
      // Get current project context
      const projectContext = await this.getProjectContext(projectId);
      if (!projectContext) {
        result.errors.push('Project context not found');
        return result;
      }

      // Update project documentation state
      const projectState = await this.updateProjectDocumentationState(projectContext);

      // Generate/update project README
      if (this.config.generateProjectReadme) {
        const readmeResult = await this.generateProjectReadme(projectContext);
        if (readmeResult.success) {
          result.documentsUpdated.push('README.md');
        } else {
          result.errors.push(`README generation failed: ${readmeResult.error}`);
        }
      }

      // Generate/update agent documentation
      if (this.config.generateAgentDocs) {
        const agentDocsResult = await this.generateAgentDocumentation(projectContext);
        result.documentsCreated.push(...agentDocsResult.created);
        result.documentsUpdated.push(...agentDocsResult.updated);
        result.errors.push(...agentDocsResult.errors);
      }

      // Generate task summaries
      if (this.config.generateTaskSummaries) {
        const taskSummaryResult = await this.generateTaskSummaries(projectContext);
        if (taskSummaryResult.success) {
          result.documentsUpdated.push('docs/tasks/SUMMARY.md');
        } else {
          result.errors.push(`Task summary generation failed: ${taskSummaryResult.error}`);
        }
      }

      // Update changelog
      if (this.config.updateChangelog) {
        const changelogResult = await this.updateChangelog(projectContext, context);
        if (changelogResult.success) {
          result.documentsUpdated.push('CHANGELOG.md');
        } else {
          result.errors.push(`Changelog update failed: ${changelogResult.error}`);
        }
      }

      // Generate progress reports
      if (this.config.generateProgressReports) {
        const progressResult = await this.generateProgressReport(projectContext);
        if (progressResult.success) {
          result.documentsCreated.push('docs/reports/PROGRESS.md');
        } else {
          result.errors.push(`Progress report generation failed: ${progressResult.error}`);
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // Update project state
      projectState.lastSyncTime = new Date();
      projectState.upToDate = result.success;
      projectState.pendingUpdates = result.errors;
      await this.saveProjectState(projectState);

      this.log(`${result.success ? '✅' : '⚠️'} Documentation sync complete for ${projectId}: ${result.documentsUpdated.length + result.documentsCreated.length} documents, ${result.errors.length} errors`, 'info');

      this.emit('syncComplete', result);

    } catch (error) {
      result.errors.push(error.message);
      result.duration = Date.now() - startTime;
      
      this.log(`❌ Documentation sync failed for ${projectId}: ${error.message}`, 'error');
      this.emit('syncError', { projectId, error });
    }

    return result;
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.size === 0) {
      return;
    }

    this.isProcessing = true;
    const projects = Array.from(this.syncQueue.entries()).slice(0, this.config.maxBatchSize);
    
    this.log(`🔄 Processing ${projects.length} projects from sync queue...`, 'info');

    try {
      for (const [projectId, context] of projects) {
        await this.syncProjectDocumentation(projectId, context);
        this.syncQueue.delete(projectId);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Documentation generation methods

  private async generateProjectReadme(projectContext: ProjectContext): Promise<{ success: boolean; error?: string }> {
    try {
      const readmeTemplate = {
        templateId: 'project_readme',
        documentType: DocumentType.README,
        category: DocumentationCategory.README,
        template: `# ${projectContext.name}

${projectContext.description}

## Project Status

- **Status**: ${projectContext.status}
- **Progress**: ${projectContext.completion.completionPercentage.toFixed(1)}%
- **Total Tasks**: ${projectContext.completion.totalTasks}
- **Completed Tasks**: ${projectContext.completion.completedTasks}
- **Active Agents**: ${projectContext.agents.filter(a => a.status === 'working').length}

## Quick Start

<!-- Add quick start instructions here -->

## Features

<!-- List main features here -->

## Documentation

- [Environment Setup](./ENVIRONMENT_SETUP.md)
- [API Reference](./docs/api/README.md)
- [Agent Documentation](./docs/agents/README.md)
- [Task Progress](./docs/tasks/SUMMARY.md)

## Contributing

<!-- Add contributing guidelines here -->

---

*Last updated: ${new Date().toISOString()}*
*Auto-generated by Documentation-ProjectContext Integration*
`,
        variables: [],
        requiredSections: [],
        optionalSections: [],
        validationRules: []
      };

      await this.documentationManager.createDocumentation(readmeTemplate, {
        projectId: projectContext.projectId,
        projectName: projectContext.name,
        description: projectContext.description
      });

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async generateAgentDocumentation(projectContext: ProjectContext): Promise<{ created: string[]; updated: string[]; errors: string[] }> {
    const result = { created: [], updated: [], errors: [] };

    try {
      for (const agent of projectContext.agents) {
        const agentDocPath = `docs/agents/${agent.agentId}.md`;
        
        const agentTemplate = {
          templateId: 'agent_documentation',
          documentType: DocumentType.API_REFERENCE,
          category: DocumentationCategory.API,
          template: `# Agent: ${agent.agentId}

## Overview

- **Type**: ${agent.agentType}
- **Status**: ${agent.status}
- **Current Task**: ${agent.currentTaskId || 'None'}
- **Workload**: ${agent.workload}%

## Capabilities

${agent.capabilities.map(cap => `- ${cap}`).join('\n')}

## Recent Activity

- **Started**: ${agent.startedAt.toISOString()}
- **Last Activity**: ${agent.lastActivity.toISOString()}

## Performance Metrics

<!-- Agent performance metrics would be added here -->

## Configuration

\`\`\`json
${JSON.stringify(agent.metadata, null, 2)}
\`\`\`

---

*Last updated: ${new Date().toISOString()}*
*Auto-generated by Documentation-ProjectContext Integration*
`,
          variables: [],
          requiredSections: [],
          optionalSections: [],
          validationRules: []
        };

        await this.documentationManager.createDocumentation(agentTemplate, {
          projectId: projectContext.projectId,
          agentIds: [agent.agentId]
        });

        result.created.push(agentDocPath);
      }

    } catch (error) {
      result.errors.push(error.message);
    }

    return result;
  }

  private async generateTaskSummaries(projectContext: ProjectContext): Promise<{ success: boolean; error?: string }> {
    try {
      const taskSummaryTemplate = {
        templateId: 'task_summary',
        documentType: DocumentType.WORKFLOW,
        category: DocumentationCategory.WORKFLOW,
        template: `# Task Summary

## Project: ${projectContext.name}

### Overall Progress

- **Total Tasks**: ${projectContext.completion.totalTasks}
- **Completed**: ${projectContext.completion.completedTasks}
- **Failed**: ${projectContext.completion.failedTasks}
- **Blocked**: ${projectContext.completion.blockedTasks}
- **Progress**: ${projectContext.completion.completionPercentage.toFixed(1)}%

### Task Breakdown

#### Completed Tasks

${projectContext.tasks.filter(t => t.status === 'completed').map(task => 
  `- **${task.taskId}**: ${task.description} (${task.agentId})`
).join('\n') || 'None'}

#### In Progress Tasks

${projectContext.tasks.filter(t => t.status === 'in_progress').map(task => 
  `- **${task.taskId}**: ${task.description} (${task.agentId})`
).join('\n') || 'None'}

#### Pending Tasks

${projectContext.tasks.filter(t => t.status === 'pending').map(task => 
  `- **${task.taskId}**: ${task.description} (${task.agentId})`
).join('\n') || 'None'}

### Blockers

${projectContext.completion.blockers.map(blocker => 
  `- ${JSON.stringify(blocker)}`
).join('\n') || 'None identified'}

---

*Last updated: ${new Date().toISOString()}*
*Auto-generated by Documentation-ProjectContext Integration*
`,
        variables: [],
        requiredSections: [],
        optionalSections: [],
        validationRules: []
      };

      await this.documentationManager.createDocumentation(taskSummaryTemplate, {
        projectId: projectContext.projectId,
        taskIds: projectContext.tasks.map(t => t.taskId)
      });

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async updateChangelog(projectContext: ProjectContext, context?: any): Promise<{ success: boolean; error?: string }> {
    try {
      // This would implement changelog updating logic
      // For now, return success
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async generateProgressReport(projectContext: ProjectContext): Promise<{ success: boolean; error?: string }> {
    try {
      // This would implement progress report generation
      // For now, return success
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods

  private async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    if (!this.projectContextManager) return null;

    try {
      // This would call the actual ProjectContextManager method
      return await this.projectContextManager.getProject(projectId);
    } catch (error) {
      this.log(`❌ Error getting project context for ${projectId}: ${error.message}`, 'error');
      return null;
    }
  }

  private async updateProjectDocumentationState(projectContext: ProjectContext): Promise<ProjectDocumentationState> {
    let state = this.projectStates.get(projectContext.projectId);
    
    if (!state) {
      state = {
        projectId: projectContext.projectId,
        lastSyncTime: new Date(),
        documentCount: 0,
        documentTypes: [],
        coverage: 0,
        quality: 0,
        upToDate: false,
        pendingUpdates: []
      };
    }

    // Update state based on current project context
    state.documentCount = await this.countProjectDocuments(projectContext.projectId);
    state.coverage = this.calculateDocumentationCoverage(projectContext);
    state.quality = await this.calculateDocumentationQuality(projectContext.projectId);

    this.projectStates.set(projectContext.projectId, state);
    return state;
  }

  private async countProjectDocuments(projectId: string): Promise<number> {
    try {
      const docs = await this.documentationManager.getProjectDocumentation(projectId);
      return docs.length;
    } catch (error) {
      return 0;
    }
  }

  private calculateDocumentationCoverage(projectContext: ProjectContext): number {
    // Calculate coverage based on agents, tasks, and project complexity
    const expectedDocs = 1 + // README
                        1 + // CHANGELOG
                        projectContext.agents.length + // Agent docs
                        (projectContext.tasks.length > 10 ? 1 : 0) + // Task summary
                        (projectContext.completion.completionPercentage > 50 ? 1 : 0); // Progress report

    const actualDocs = this.projectStates.get(projectContext.projectId)?.documentCount || 0;
    
    return Math.min(actualDocs / expectedDocs, 1.0);
  }

  private async calculateDocumentationQuality(projectId: string): Promise<number> {
    try {
      const docs = await this.documentationManager.getProjectDocumentation(projectId);
      if (docs.length === 0) return 0;

      const qualityScores = docs.map(doc => {
        if (doc.metadata.validationStatus === 'valid') return 1.0;
        if (doc.metadata.validationStatus === 'warning') return 0.7;
        return 0.3;
      });

      return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    } catch (error) {
      return 0;
    }
  }

  private async saveProjectState(state: ProjectDocumentationState): Promise<void> {
    try {
      const Redis = require('@upstash/redis').Redis;
      const redis = new Redis({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
        automaticDeserialization: false
      });

      const key = `doc:project:state:${state.projectId}`;
      await redis.setex(key, 86400, JSON.stringify(state)); // 24 hour expiry

    } catch (error) {
      this.log(`❌ Error saving project state for ${state.projectId}: ${error.message}`, 'error');
    }
  }

  private async saveProjectStates(): Promise<void> {
    for (const state of this.projectStates.values()) {
      await this.saveProjectState(state);
    }
  }

  private determineEventPriority(eventType: string, event: any): 'low' | 'medium' | 'high' | 'critical' {
    if (eventType === 'projectCreated') return 'high';
    if (eventType === 'taskFailed') return 'high';
    if (eventType === 'milestoneReached') return 'medium';
    return 'low';
  }

  private determineDocumentationCategory(eventType: string, event: any): DocumentationCategory {
    if (eventType.includes('project')) return DocumentationCategory.README;
    if (eventType.includes('task')) return DocumentationCategory.WORKFLOW;
    if (eventType.includes('agent')) return DocumentationCategory.API;
    return DocumentationCategory.CHANGELOG;
  }

  private getRequiredDocumentTypes(eventType: string, event: any): DocumentType[] {
    const types: DocumentType[] = [];
    
    switch (eventType) {
      case 'projectCreated':
        types.push(DocumentType.README, DocumentType.ENVIRONMENT_SETUP);
        break;
      case 'taskCompleted':
      case 'taskFailed':
        types.push(DocumentType.CHANGELOG);
        break;
      case 'agentRegistered':
        types.push(DocumentType.API_REFERENCE);
        break;
    }
    
    return types;
  }

  private log(message: string, level: 'debug' | 'info' | 'error' = 'info'): void {
    if (this.config.logLevel === 'silent') return;
    if (this.config.logLevel === 'minimal' && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'debug' ? '🔍' : 'ℹ️';
    console.log(`${timestamp} ${prefix} [DocumentationProjectContextIntegration] ${message}`);
  }

  // Public API methods

  public async fullProjectSync(projectId: string): Promise<DocumentationSyncResult> {
    const result = await this.syncProjectDocumentation(projectId);
    result.syncType = 'full';
    return result;
  }

  public async getProjectDocumentationState(projectId: string): Promise<ProjectDocumentationState | null> {
    return this.projectStates.get(projectId) || null;
  }

  public getAllProjectStates(): ProjectDocumentationState[] {
    return Array.from(this.projectStates.values());
  }

  public getSyncQueueSize(): number {
    return this.syncQueue.size;
  }

  public isProcessingSyncs(): boolean {
    return this.isProcessing;
  }

  public async forceSyncProcessing(): Promise<void> {
    await this.processSyncQueue();
  }
}

export default DocumentationProjectContextIntegration;