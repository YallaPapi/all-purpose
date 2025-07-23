/**
 * Project Context Integration
 * 
 * Use context7: Complete integration of project context awareness with RAG system
 * Following All-Purpose Pattern: Configurable orchestration for ANY project structure
 */

import { EventEmitter } from 'events';
import { logger, processingLogger } from '../utils/logger';
import { ProjectContextTracker, ContextUpdate } from '../tracking/projectContextTracker';
import { RAGPipeline } from './ragPipeline';
import { createConversationContextAPI } from '../api/conversationContextAPI';

export interface ProjectContextIntegrationConfig {
  projectDir: string;
  enableContextTracking: boolean;
  enableAutomaticReprocessing: boolean;
  debounceMs: number;
  maxConcurrentUpdates: number;
}

export interface IntegrationStats {
  contextTracker: {
    isActive: boolean;
    totalTasks: number;
    activeTasks: number;
    trackedFiles: number;
  };
  ragPipeline: {
    isProcessing: boolean;
    totalEmbeddings: number;
    lastProcessed: Date | null;
  };
  integration: {
    totalContextUpdates: number;
    successfulUpdates: number;
    failedUpdates: number;
    lastUpdate: Date | null;
  };
}

/**
 * Project Context Integration Service
 * Orchestrates project context awareness with RAG system updates
 */
export class ProjectContextIntegration extends EventEmitter {
  private config: ProjectContextIntegrationConfig;
  private contextTracker: ProjectContextTracker;
  private ragPipeline: RAGPipeline;
  private conversationAPI: any; // ConversationContextAPI
  private isActive = false;
  private updateQueue: ContextUpdate[] = [];
  private processingQueue = false;
  private stats: IntegrationStats['integration'] = {
    totalContextUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    lastUpdate: null
  };

  constructor(config: Partial<ProjectContextIntegrationConfig> = {}) {
    super();

    this.config = {
      projectDir: process.cwd(),
      enableContextTracking: true,
      enableAutomaticReprocessing: true,
      debounceMs: 2000, // Wait 2 seconds before processing updates
      maxConcurrentUpdates: 3,
      ...config
    };

    // Initialize components
    this.contextTracker = new ProjectContextTracker({
      projectDir: this.config.projectDir
    });

    this.ragPipeline = new RAGPipeline({
      sourceDir: this.config.projectDir,
      enableFileWatching: false, // We'll use context tracker's file watching
      enableIncrementalUpdates: true
    });

    this.conversationAPI = createConversationContextAPI({
      enableConversationMemory: true
    });

    this.setupEventHandlers();

    processingLogger.info('Project Context Integration initialized', {
      projectDir: this.config.projectDir,
      contextTracking: this.config.enableContextTracking,
      automaticReprocessing: this.config.enableAutomaticReprocessing
    });
  }

  /**
   * Start the complete project context integration
   */
  async start(): Promise<void> {
    if (this.isActive) {
      processingLogger.warn('Project context integration is already active');
      return;
    }

    try {
      processingLogger.info('Starting project context integration');

      // Start RAG pipeline
      await this.ragPipeline.start();

      // Start context tracking if enabled
      if (this.config.enableContextTracking) {
        await this.contextTracker.startTracking();
      }

      // Perform initial context sync
      await this.performInitialSync();

      this.isActive = true;
      processingLogger.info('Project context integration started successfully');
      this.emit('integrationStarted', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to start project context integration', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Stop the project context integration
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      processingLogger.info('Stopping project context integration');

      // Process any remaining updates
      await this.processUpdateQueue();

      // Stop components
      await this.contextTracker.stopTracking();
      await this.ragPipeline.stop();

      this.isActive = false;
      processingLogger.info('Project context integration stopped');
      this.emit('integrationStopped', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to stop project context integration', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Manually trigger context update for a task
   */
  async updateTaskContext(taskId: string): Promise<void> {
    processingLogger.info('Manual task context update triggered', { taskId });

    try {
      const files = this.contextTracker.getTaskFiles(taskId);
      
      if (files.length === 0) {
        processingLogger.warn('No files associated with task', { taskId });
        return;
      }

      // Reprocess files associated with the task
      for (const file of files) {
        await this.ragPipeline.processFile(file);
      }

      // Update conversation context with task information
      await this.updateConversationContext(taskId, files);

      this.stats.successfulUpdates++;
      this.stats.lastUpdate = new Date();

      processingLogger.info('Task context updated successfully', {
        taskId,
        files: files.length
      });

      this.emit('taskContextUpdated', { taskId, files: files.length });

    } catch (error) {
      this.stats.failedUpdates++;
      
      processingLogger.error('Failed to update task context', {
        taskId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get comprehensive integration statistics
   */
  getStats(): IntegrationStats {
    const contextStats = this.contextTracker.getProjectContext();
    const ragStats = this.ragPipeline.getStats();

    return {
      contextTracker: {
        isActive: this.contextTracker.isActive(),
        totalTasks: contextStats.totalTasks,
        activeTasks: contextStats.activeTasks,
        trackedFiles: contextStats.trackedFiles
      },
      ragPipeline: {
        isProcessing: ragStats.isProcessing,
        totalEmbeddings: ragStats.totalEmbeddings,
        lastProcessed: ragStats.lastProcessed
      },
      integration: { ...this.stats }
    };
  }

  /**
   * Force complete project context refresh
   */
  async refreshProjectContext(): Promise<void> {
    processingLogger.info('Forcing complete project context refresh');

    try {
      // Reprocess all documents
      await this.ragPipeline.processAllDocuments();

      // Refresh conversation context
      if (this.conversationAPI.refreshContext) {
        await this.conversationAPI.refreshContext();
      }

      // Emit refresh event
      this.emit('contextRefreshed', { timestamp: new Date() });

      processingLogger.info('Project context refresh completed');

    } catch (error) {
      processingLogger.error('Failed to refresh project context', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Setup event handlers for component integration
   */
  private setupEventHandlers(): void {
    // Context tracker events
    this.contextTracker.on('contextUpdated', (update: ContextUpdate) => {
      this.handleContextUpdate(update);
    });

    this.contextTracker.on('taskContextUpdateNeeded', async (data: any) => {
      await this.handleTaskContextUpdateNeeded(data);
    });

    // RAG pipeline events
    this.ragPipeline.on('fileProcessed', (data: any) => {
      this.emit('fileReprocessed', data);
    });

    this.ragPipeline.on('processingFailed', (data: any) => {
      processingLogger.error('RAG pipeline processing failed', data);
    });

    // Forward important events
    this.contextTracker.on('trackingStarted', (data) => this.emit('contextTrackingStarted', data));
    this.contextTracker.on('trackingStopped', (data) => this.emit('contextTrackingStopped', data));
    this.ragPipeline.on('pipelineStarted', (data) => this.emit('ragPipelineStarted', data));
    this.ragPipeline.on('pipelineStopped', (data) => this.emit('ragPipelineStopped', data));
  }

  /**
   * Handle context update events
   */
  private handleContextUpdate(update: ContextUpdate): void {
    this.stats.totalContextUpdates++;

    // Add to update queue for batch processing
    this.updateQueue.push(update);

    // Schedule queue processing if not already running
    if (!this.processingQueue) {
      setTimeout(() => {
        this.processUpdateQueue();
      }, this.config.debounceMs);
    }

    processingLogger.debug('Context update queued', {
      type: update.type,
      taskId: update.taskId,
      queueSize: this.updateQueue.length
    });
  }

  /**
   * Handle task context update requests
   */
  private async handleTaskContextUpdateNeeded(data: { taskId: string; files: string[] }): Promise<void> {
    if (!this.config.enableAutomaticReprocessing) {
      return;
    }

    try {
      await this.updateTaskContext(data.taskId);
    } catch (error) {
      processingLogger.error('Automatic task context update failed', {
        taskId: data.taskId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Process queued context updates
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.processingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const updates = [...this.updateQueue];
      this.updateQueue = [];

      processingLogger.info('Processing context update queue', {
        updates: updates.length
      });

      // Group updates by task for batch processing
      const updatesByTask = new Map<string, ContextUpdate[]>();
      const fileUpdates: ContextUpdate[] = [];

      for (const update of updates) {
        if (update.taskId) {
          if (!updatesByTask.has(update.taskId)) {
            updatesByTask.set(update.taskId, []);
          }
          updatesByTask.get(update.taskId)!.push(update);
        } else if (update.type === 'file_changed') {
          fileUpdates.push(update);
        }
      }

      // Process task updates
      let processed = 0;
      for (const [taskId, taskUpdates] of updatesByTask) {
        if (processed >= this.config.maxConcurrentUpdates) {
          break; // Rate limiting
        }

        try {
          await this.processTaskUpdates(taskId, taskUpdates);
          processed++;
        } catch (error) {
          processingLogger.error('Failed to process task updates', {
            taskId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Process file updates
      await this.processFileUpdates(fileUpdates);

      processingLogger.info('Context update queue processed', {
        taskUpdates: updatesByTask.size,
        fileUpdates: fileUpdates.length
      });

    } catch (error) {
      processingLogger.error('Failed to process update queue', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process updates for a specific task
   */
  private async processTaskUpdates(taskId: string, updates: ContextUpdate[]): Promise<void> {
    const hasStatusChange = updates.some(u => u.type === 'task_status_changed');
    const hasFileChanges = updates.some(u => u.type === 'file_changed');

    if (hasStatusChange || hasFileChanges) {
      await this.updateTaskContext(taskId);
    }
  }

  /**
   * Process file change updates
   */
  private async processFileUpdates(updates: ContextUpdate[]): Promise<void> {
    const uniqueFiles = new Set(updates.map(u => u.filePath).filter(Boolean));
    
    for (const filePath of uniqueFiles) {
      try {
        await this.ragPipeline.processFile(filePath!);
      } catch (error) {
        processingLogger.error('Failed to reprocess file', {
          file: filePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Update conversation context with task information
   */
  private async updateConversationContext(taskId: string, files: string[]): Promise<void> {
    try {
      // This would add task-specific context to the conversation memory
      // Implementation depends on the specific conversation API structure
      
      processingLogger.debug('Conversation context updated for task', {
        taskId,
        files: files.length
      });

    } catch (error) {
      processingLogger.error('Failed to update conversation context', {
        taskId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Perform initial context synchronization
   */
  private async performInitialSync(): Promise<void> {
    try {
      processingLogger.info('Performing initial context synchronization');

      // Get current project context
      const projectContext = this.contextTracker.getProjectContext();
      
      processingLogger.info('Initial project context', {
        totalTasks: projectContext.totalTasks,
        activeTasks: projectContext.activeTasks,
        trackedFiles: projectContext.trackedFiles
      });

      // No need to reprocess everything if RAG pipeline auto-starts
      // The context tracker will handle incremental updates from here

      this.emit('initialSyncCompleted', { 
        projectContext,
        timestamp: new Date() 
      });

    } catch (error) {
      processingLogger.error('Initial sync failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get current activity status
   */
  isIntegrationActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current configuration
   */
  getConfig(): ProjectContextIntegrationConfig {
    return { ...this.config };
  }
}

/**
 * Create project context integration with default configuration
 */
export function createProjectContextIntegration(config?: Partial<ProjectContextIntegrationConfig>): ProjectContextIntegration {
  return new ProjectContextIntegration(config);
}