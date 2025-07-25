/**
 * Documentation Event Listener System
 * 
 * Listens to Meta Agent Autonomy system events and triggers real-time
 * documentation updates through the DocumentationManager.
 * 
 * Integrates with ProjectContext, UEP agents, and external systems.
 */

import { EventEmitter } from 'events';
import DocumentationManager from './DocumentationManager';
import {
  DocumentationEvent,
  DocumentationEventType,
  DocumentationCategory,
  DocumentType,
  EventSource
} from './interfaces/IDocumentationManager';

export interface EventListenerConfig {
  enabled: boolean;
  projectContextIntegration: boolean;
  uepAgentIntegration: boolean;
  gitIntegration: boolean;
  fileSystemIntegration: boolean;
  taskMasterIntegration: boolean;
  documentationManager: DocumentationManager;
  debounceMs: number;
  batchEvents: boolean;
  logLevel: 'silent' | 'minimal' | 'verbose' | 'debug';
}

export interface AgentEvent {
  agentId: string;
  agentType: string;
  eventType: string;
  timestamp: Date;
  projectId: string;
  taskId?: string;
  sessionId?: string;
  data: Record<string, any>;
  metadata: {
    performance: {
      duration: number;
      complianceScore: number;
      success: boolean;
    };
    context: {
      codebaseAwareness: boolean;
      workingMemory: boolean;
      previousTasks: string[];
    };
  };
}

export interface ProjectEvent {
  projectId: string;
  eventType: string;
  timestamp: Date;
  agentId?: string;
  taskId?: string;
  data: Record<string, any>;
  changes: {
    type: 'create' | 'update' | 'delete';
    entity: 'project' | 'task' | 'agent' | 'handoff';
    before?: any;
    after?: any;
  };
}

export interface GitEvent {
  repository: string;
  branch: string;
  commit: string;
  author: string;
  timestamp: Date;
  files: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
  message: string;
  tags: string[];
}

export interface FileSystemEvent {
  filePath: string;
  eventType: 'create' | 'update' | 'delete' | 'rename';
  timestamp: Date;
  fileType: string;
  size: number;
  content?: string;
  metadata: Record<string, any>;
}

export interface TaskMasterEvent {
  taskId: string;
  projectId: string;
  eventType: string;
  timestamp: Date;
  agentId?: string;
  data: {
    title: string;
    description: string;
    status: string;
    priority: string;
    research?: any;
    complexity?: any;
  };
}

export class DocumentationEventListener extends EventEmitter {
  private config: EventListenerConfig;
  private documentationManager: DocumentationManager;
  private eventQueue: DocumentationEvent[];
  private isProcessing: boolean;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  private integrations: Map<string, boolean>;

  constructor(config: EventListenerConfig) {
    super();

    this.config = {
      enabled: true,
      projectContextIntegration: true,
      uepAgentIntegration: true,
      gitIntegration: true,
      fileSystemIntegration: true,
      taskMasterIntegration: true,
      debounceMs: 2000,
      batchEvents: true,
      logLevel: 'minimal',
      ...config
    };

    this.documentationManager = config.documentationManager;
    this.eventQueue = [];
    this.isProcessing = false;
    this.debounceTimers = new Map();
    this.integrations = new Map();
  }

  async initialize(): Promise<void> {
    this.log('🎧 Initializing Documentation Event Listener...', 'info');

    try {
      // Initialize integrations based on configuration
      if (this.config.projectContextIntegration) {
        await this.initializeProjectContextIntegration();
      }

      if (this.config.uepAgentIntegration) {
        await this.initializeUEPAgentIntegration();
      }

      if (this.config.gitIntegration) {
        await this.initializeGitIntegration();
      }

      if (this.config.fileSystemIntegration) {
        await this.initializeFileSystemIntegration();
      }

      if (this.config.taskMasterIntegration) {
        await this.initializeTaskMasterIntegration();
      }

      // Start event processing
      this.startEventProcessing();

      this.emit('initialized');
      this.log('✅ Documentation Event Listener initialized successfully', 'info');

    } catch (error) {
      this.log(`❌ Failed to initialize Documentation Event Listener: ${error.message}`, 'error');
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.log('🔄 Shutting down Documentation Event Listener...', 'info');

    try {
      // Clear debounce timers
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();

      // Process remaining events
      await this.processEventQueue();

      this.emit('shutdown');
      this.log('✅ Documentation Event Listener shut down successfully', 'info');

    } catch (error) {
      this.log(`❌ Error during shutdown: ${error.message}`, 'error');
      throw error;
    }
  }

  // ProjectContext Integration
  private async initializeProjectContextIntegration(): Promise<void> {
    this.log('🔗 Setting up ProjectContext integration...', 'debug');

    try {
      // Try to find and integrate with ProjectContextManager
      const ProjectContextManager = await this.tryImport('./ProjectContextManager');
      
      if (ProjectContextManager) {
        // Listen to project context events
        const projectContextEvents = [
          'projectCreated',
          'projectUpdated', 
          'taskCreated',
          'taskCompleted',
          'taskFailed',
          'agentRegistered',
          'agentStatusChanged',
          'workflowHandoff',
          'escalationTriggered'
        ];

        for (const eventType of projectContextEvents) {
          ProjectContextManager.on(eventType, (event: ProjectEvent) => {
            this.handleProjectContextEvent(eventType, event);
          });
        }

        this.integrations.set('projectContext', true);
        this.log('✅ ProjectContext integration active', 'info');
      } else {
        this.log('⚠️  ProjectContext not found - integration skipped', 'debug');
        this.integrations.set('projectContext', false);
      }

    } catch (error) {
      this.log(`❌ ProjectContext integration failed: ${error.message}`, 'error');
      this.integrations.set('projectContext', false);
    }
  }

  // UEP Agent Integration
  private async initializeUEPAgentIntegration(): Promise<void> {
    this.log('🤖 Setting up UEP Agent integration...', 'debug');

    try {
      // Try to find and integrate with UEPMetaAgentFactory
      const UEPMetaAgentFactory = await this.tryImport('./UEPMetaAgentFactory');
      
      if (UEPMetaAgentFactory) {
        // Listen to UEP agent events
        const agentEvents = [
          'agentCreated',
          'agentStarted',
          'agentCompleted',
          'agentFailed',
          'agentValidated',
          'complianceScored',
          'performanceMetrics'
        ];

        for (const eventType of agentEvents) {
          UEPMetaAgentFactory.on(eventType, (event: AgentEvent) => {
            this.handleUEPAgentEvent(eventType, event);
          });
        }

        this.integrations.set('uepAgent', true);
        this.log('✅ UEP Agent integration active', 'info');
      } else {
        this.log('⚠️  UEP Agent Factory not found - integration skipped', 'debug');
        this.integrations.set('uepAgent', false);
      }

    } catch (error) {
      this.log(`❌ UEP Agent integration failed: ${error.message}`, 'error');
      this.integrations.set('uepAgent', false);
    }
  }

  // Git Integration
  private async initializeGitIntegration(): Promise<void> {
    this.log('📦 Setting up Git integration...', 'debug');

    try {
      // Try to set up git hook integration
      const { exec } = require('child_process');
      const fs = require('fs-extra');
      const path = require('path');

      // Check if we're in a git repository
      exec('git rev-parse --is-inside-work-tree', async (error: any, stdout: string) => {
        if (error) {
          this.log('⚠️  Not in a git repository - Git integration skipped', 'debug');
          this.integrations.set('git', false);
          return;
        }

        // Set up git hooks for documentation events
        const hookPath = '.git/hooks/post-commit';
        const hookContent = `#!/bin/sh
# Auto-generated hook for Documentation Event Listener
node -e "
const { DocumentationEventListener } = require('./dist/uep/DocumentationEventListener');
const listener = require('./doc-event-listener-instance');
if (listener) {
  listener.handleGitCommit();
}
"`;

        try {
          await fs.writeFile(hookPath, hookContent);
          await fs.chmod(hookPath, '755');
          this.log('✅ Git hooks configured', 'debug');
        } catch (hookError) {
          this.log(`⚠️  Could not set up git hooks: ${hookError.message}`, 'debug');
        }

        this.integrations.set('git', true);
        this.log('✅ Git integration active', 'info');
      });

    } catch (error) {
      this.log(`❌ Git integration failed: ${error.message}`, 'error');
      this.integrations.set('git', false);
    }
  }

  // File System Integration
  private async initializeFileSystemIntegration(): Promise<void> {
    this.log('📁 Setting up File System integration...', 'debug');

    try {
      const chokidar = require('chokidar');
      
      // Watch for relevant file changes
      const watcher = chokidar.watch(['./**/*.ts', './**/*.js', './**/*.md', './**/*.json'], {
        ignored: [
          /node_modules/,
          /\.git/,
          /dist/,
          /\.next/,
          /\.vercel/
        ],
        persistent: true
      });

      // Handle file events
      watcher
        .on('add', (filePath: string) => this.handleFileSystemEvent('create', filePath))
        .on('change', (filePath: string) => this.handleFileSystemEvent('update', filePath))
        .on('unlink', (filePath: string) => this.handleFileSystemEvent('delete', filePath));

      this.integrations.set('fileSystem', true);
      this.log('✅ File System integration active', 'info');

    } catch (error) {
      this.log(`❌ File System integration failed: ${error.message}`, 'error');
      this.integrations.set('fileSystem', false);
    }
  }

  // TaskMaster Integration
  private async initializeTaskMasterIntegration(): Promise<void> {
    this.log('📋 Setting up TaskMaster integration...', 'debug');

    try {
      // Try to find TaskMaster enhanced system
      const fs = require('fs-extra');
      const taskMasterPath = './rag-system/task-master-enhanced.js';
      
      if (await fs.pathExists(taskMasterPath)) {
        // Set up TaskMaster event monitoring
        // This would integrate with TaskMaster's event system if available
        
        this.integrations.set('taskMaster', true);
        this.log('✅ TaskMaster integration active', 'info');
      } else {
        this.log('⚠️  TaskMaster not found - integration skipped', 'debug');
        this.integrations.set('taskMaster', false);
      }

    } catch (error) {
      this.log(`❌ TaskMaster integration failed: ${error.message}`, 'error');
      this.integrations.set('taskMaster', false);
    }
  }

  // Event Handlers

  private handleProjectContextEvent(eventType: string, event: ProjectEvent): void {
    this.log(`📊 ProjectContext event: ${eventType} for project ${event.projectId}`, 'debug');

    const documentationEvent = this.createDocumentationEvent({
      eventType: this.mapProjectEventToDocumentationType(eventType),
      source: { type: 'system', identifier: 'project-context' },
      projectId: event.projectId,
      agentId: event.agentId,
      taskId: event.taskId,
      metadata: {
        priority: this.determineEventPriority(eventType, event),
        category: this.determineDocumentationCategory(eventType, event),
        requiredDocumentTypes: this.getRequiredDocumentTypes(eventType, event),
        changes: this.extractChangeDescriptions(event)
      }
    });

    this.queueDocumentationEvent(documentationEvent);
  }

  private handleUEPAgentEvent(eventType: string, event: AgentEvent): void {
    this.log(`🤖 UEP Agent event: ${eventType} for agent ${event.agentId}`, 'debug');

    const documentationEvent = this.createDocumentationEvent({
      eventType: this.mapAgentEventToDocumentationType(eventType),
      source: { type: 'agent', identifier: event.agentId, context: { agentType: event.agentType } },
      projectId: event.projectId,
      agentId: event.agentId,
      taskId: event.taskId,
      metadata: {
        priority: this.determineAgentEventPriority(eventType, event),
        category: this.determineAgentDocumentationCategory(eventType, event),
        requiredDocumentTypes: this.getAgentRequiredDocumentTypes(eventType, event),
        relatedComponents: [event.agentType],
        changes: [{
          type: 'addition',
          component: event.agentId,
          description: `Agent ${eventType}: ${event.agentType}`,
          impactLevel: event.metadata.performance.success ? 'minor' : 'major',
          documentationRequired: true
        }]
      }
    });

    this.queueDocumentationEvent(documentationEvent);
  }

  public handleGitCommit(): void {
    this.log('📦 Git commit detected', 'debug');

    // Get git commit information
    const { execSync } = require('child_process');
    
    try {
      const commitHash = execSync('git rev-parse HEAD').toString().trim();
      const commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
      const files = execSync('git diff-tree --no-commit-id --name-status -r HEAD').toString().trim();
      
      const gitEvent: GitEvent = {
        repository: process.cwd(),
        branch: execSync('git branch --show-current').toString().trim(),
        commit: commitHash,
        author: execSync('git log -1 --pretty=%an').toString().trim(),
        timestamp: new Date(),
        files: this.parseGitFiles(files),
        message: commitMessage,
        tags: []
      };

      const documentationEvent = this.createDocumentationEvent({
        eventType: DocumentationEventType.CODE_COMMITTED,
        source: { type: 'git', identifier: 'git-hook' },
        projectId: 'default',
        metadata: {
          priority: this.determineGitEventPriority(gitEvent),
          category: DocumentationCategory.CHANGELOG,
          requiredDocumentTypes: [DocumentType.CHANGELOG],
          affectedFiles: [...gitEvent.files.added, ...gitEvent.files.modified, ...gitEvent.files.deleted],
          changes: [{
            type: 'modification',
            component: 'codebase',
            description: `Git commit: ${gitEvent.message}`,
            impactLevel: this.assessGitCommitImpact(gitEvent),
            documentationRequired: true
          }]
        }
      });

      this.queueDocumentationEvent(documentationEvent);

    } catch (error) {
      this.log(`❌ Error processing git commit: ${error.message}`, 'error');
    }
  }

  private handleFileSystemEvent(eventType: 'create' | 'update' | 'delete', filePath: string): void {
    this.log(`📁 File system event: ${eventType} for ${filePath}`, 'debug');

    // Determine if this file change should trigger documentation updates
    if (this.shouldProcessFileChange(filePath, eventType)) {
      const documentationEvent = this.createDocumentationEvent({
        eventType: this.mapFileEventToDocumentationType(eventType),
        source: { type: 'file_watcher', identifier: 'chokidar' },
        projectId: 'default',
        metadata: {
          priority: this.determineFileEventPriority(filePath, eventType),
          category: this.determineFileDocumentationCategory(filePath, eventType),
          requiredDocumentTypes: this.getFileRequiredDocumentTypes(filePath, eventType),
          affectedFiles: [filePath],
          changes: [{
            type: eventType as any,
            component: path.basename(filePath, path.extname(filePath)),
            description: `File ${eventType}: ${filePath}`,
            impactLevel: this.assessFileChangeImpact(filePath, eventType),
            documentationRequired: true
          }]
        }
      });

      this.queueDocumentationEvent(documentationEvent);
    }
  }

  // Event Processing

  private queueDocumentationEvent(event: DocumentationEvent): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.config.batchEvents) {
      // Add to queue for batch processing
      this.eventQueue.push(event);
      this.log(`📥 Queued documentation event: ${event.eventType} (${this.eventQueue.length} in queue)`, 'debug');
    } else {
      // Process immediately
      this.processDocumentationEvent(event);
    }

    // Debounce processing to avoid overwhelming the system
    const debounceKey = `${event.eventType}_${event.projectId}`;
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!);
    }

    const timer = setTimeout(() => {
      if (this.config.batchEvents && this.eventQueue.length > 0) {
        this.processEventQueue();
      }
      this.debounceTimers.delete(debounceKey);
    }, this.config.debounceMs);

    this.debounceTimers.set(debounceKey, timer);
  }

  private async processDocumentationEvent(event: DocumentationEvent): Promise<void> {
    try {
      this.log(`📝 Processing documentation event: ${event.eventType}`, 'debug');
      
      const updates = await this.documentationManager.processEvent(event);
      
      if (updates.length > 0) {
        this.log(`✅ Generated ${updates.length} documentation updates`, 'info');
        this.emit('documentationUpdated', { event, updates });
      }

    } catch (error) {
      this.log(`❌ Error processing documentation event: ${error.message}`, 'error');
      this.emit('processingError', { event, error });
    }
  }

  private startEventProcessing(): void {
    // Process event queue periodically
    setInterval(async () => {
      if (!this.isProcessing && this.eventQueue.length > 0) {
        await this.processEventQueue();
      }
    }, this.config.debounceMs);
  }

  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const events = this.eventQueue.splice(0); // Take all queued events

    this.log(`🔄 Processing ${events.length} queued documentation events...`, 'info');

    try {
      for (const event of events) {
        await this.processDocumentationEvent(event);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Helper Methods

  private createDocumentationEvent(params: {
    eventType: DocumentationEventType;
    source: EventSource;
    projectId: string;
    agentId?: string;
    taskId?: string;
    metadata: any;
  }): DocumentationEvent {
    return {
      eventId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType: params.eventType,
      source: params.source,
      projectId: params.projectId,
      agentId: params.agentId,
      taskId: params.taskId,
      metadata: params.metadata
    };
  }

  private async tryImport(modulePath: string): Promise<any> {
    try {
      return require(modulePath);
    } catch (error) {
      return null;
    }
  }

  private log(message: string, level: 'debug' | 'info' | 'error' = 'info'): void {
    if (this.config.logLevel === 'silent') return;
    if (this.config.logLevel === 'minimal' && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'debug' ? '🔍' : 'ℹ️';
    console.log(`${timestamp} ${prefix} [DocumentationEventListener] ${message}`);
  }

  // Event mapping methods
  private mapProjectEventToDocumentationType(eventType: string): DocumentationEventType {
    const mapping: Record<string, DocumentationEventType> = {
      'projectCreated': DocumentationEventType.PROJECT_CREATED,
      'projectUpdated': DocumentationEventType.PROJECT_UPDATED,
      'taskCreated': DocumentationEventType.TASK_CREATED,
      'taskCompleted': DocumentationEventType.TASK_COMPLETED,
      'taskFailed': DocumentationEventType.TASK_FAILED,
      'agentRegistered': DocumentationEventType.AGENT_CREATED
    };
    return mapping[eventType] || DocumentationEventType.DOCUMENTATION_REQUESTED;
  }

  private mapAgentEventToDocumentationType(eventType: string): DocumentationEventType {
    const mapping: Record<string, DocumentationEventType> = {
      'agentCreated': DocumentationEventType.AGENT_CREATED,
      'agentCompleted': DocumentationEventType.AGENT_COMPLETED_TASK,
      'agentFailed': DocumentationEventType.AGENT_FAILED
    };
    return mapping[eventType] || DocumentationEventType.DOCUMENTATION_REQUESTED;
  }

  private mapFileEventToDocumentationType(eventType: string): DocumentationEventType {
    const mapping: Record<string, DocumentationEventType> = {
      'create': DocumentationEventType.FILE_CREATED,
      'update': DocumentationEventType.FILE_UPDATED,
      'delete': DocumentationEventType.FILE_DELETED
    };
    return mapping[eventType] || DocumentationEventType.DOCUMENTATION_REQUESTED;
  }

  // Priority determination methods
  private determineEventPriority(eventType: string, event: ProjectEvent): 'low' | 'medium' | 'high' | 'critical' {
    if (eventType.includes('Created')) return 'high';
    if (eventType.includes('Failed')) return 'high';
    if (eventType.includes('Completed')) return 'medium';
    return 'low';
  }

  private determineAgentEventPriority(eventType: string, event: AgentEvent): 'low' | 'medium' | 'high' | 'critical' {
    if (!event.metadata.performance.success) return 'high';
    if (event.metadata.performance.complianceScore < 0.8) return 'medium';
    return 'low';
  }

  private determineGitEventPriority(gitEvent: GitEvent): 'low' | 'medium' | 'high' | 'critical' {
    const fileCount = gitEvent.files.added.length + gitEvent.files.modified.length + gitEvent.files.deleted.length;
    if (fileCount > 10) return 'high';
    if (fileCount > 3) return 'medium';
    return 'low';
  }

  private determineFileEventPriority(filePath: string, eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    if (filePath.includes('README') || filePath.includes('package.json')) return 'high';
    if (filePath.endsWith('.md')) return 'medium';
    return 'low';
  }

  // Category determination methods
  private determineDocumentationCategory(eventType: string, event: ProjectEvent): DocumentationCategory {
    if (eventType.includes('project')) return DocumentationCategory.README;
    if (eventType.includes('task')) return DocumentationCategory.WORKFLOW;
    return DocumentationCategory.CHANGELOG;
  }

  private determineAgentDocumentationCategory(eventType: string, event: AgentEvent): DocumentationCategory {
    return DocumentationCategory.API;
  }

  private determineFileDocumentationCategory(filePath: string, eventType: string): DocumentationCategory {
    if (filePath.endsWith('.md')) return DocumentationCategory.README;
    if (filePath.includes('api') || filePath.includes('src')) return DocumentationCategory.API;
    return DocumentationCategory.CHANGELOG;
  }

  // Required document types determination
  private getRequiredDocumentTypes(eventType: string, event: ProjectEvent): DocumentType[] {
    const types: DocumentType[] = [];
    
    if (eventType.includes('Created')) {
      types.push(DocumentType.README, DocumentType.ENVIRONMENT_SETUP);
    }
    
    if (eventType.includes('Completed') || eventType.includes('Failed')) {
      types.push(DocumentType.CHANGELOG);
    }
    
    return types;
  }

  private getAgentRequiredDocumentTypes(eventType: string, event: AgentEvent): DocumentType[] {
    return [DocumentType.API_REFERENCE, DocumentType.CHANGELOG];
  }

  private getFileRequiredDocumentTypes(filePath: string, eventType: string): DocumentType[] {
    const types: DocumentType[] = [];
    
    if (filePath.includes('src/') || filePath.includes('api/')) {
      types.push(DocumentType.API_REFERENCE);
    }
    
    types.push(DocumentType.CHANGELOG);
    return types;
  }

  // Impact assessment methods
  private assessGitCommitImpact(gitEvent: GitEvent): 'minor' | 'major' | 'breaking' {
    const message = gitEvent.message.toLowerCase();
    if (message.includes('breaking') || message.includes('major')) return 'breaking';
    if (message.includes('feat') || message.includes('add')) return 'major';
    return 'minor';
  }

  private assessFileChangeImpact(filePath: string, eventType: string): 'minor' | 'major' | 'breaking' {
    if (eventType === 'delete') return 'major';
    if (filePath.includes('package.json') || filePath.includes('README')) return 'major';
    return 'minor';
  }

  // File processing filters
  private shouldProcessFileChange(filePath: string, eventType: string): boolean {
    // Skip certain file types and directories
    if (filePath.includes('node_modules')) return false;
    if (filePath.includes('.git/')) return false;
    if (filePath.includes('dist/')) return false;
    if (filePath.includes('.next/')) return false;
    
    // Process documentation files, source files, and configuration files
    const relevantExtensions = ['.md', '.ts', '.js', '.json', '.yml', '.yaml'];
    return relevantExtensions.some(ext => filePath.endsWith(ext));
  }

  private parseGitFiles(gitOutput: string): { added: string[]; modified: string[]; deleted: string[] } {
    const files = { added: [], modified: [], deleted: [] };
    
    for (const line of gitOutput.split('\n')) {
      const [status, filePath] = line.split('\t');
      if (status === 'A') files.added.push(filePath);
      else if (status === 'M') files.modified.push(filePath);
      else if (status === 'D') files.deleted.push(filePath);
    }
    
    return files;
  }

  private extractChangeDescriptions(event: ProjectEvent): any[] {
    return [{
      type: event.changes.type,
      component: event.changes.entity,
      description: `${event.eventType} for ${event.changes.entity}`,
      impactLevel: 'minor',
      documentationRequired: true
    }];
  }

  // Public API for external integration
  public getIntegrationStatus(): Map<string, boolean> {
    return new Map(this.integrations);
  }

  public getEventQueueLength(): number {
    return this.eventQueue.length;
  }

  public isProcessingEvents(): boolean {
    return this.isProcessing;
  }

  public async forceProcessQueue(): Promise<void> {
    await this.processEventQueue();
  }
}

export default DocumentationEventListener;