/**
 * Project Context Tracker
 * 
 * Use context7: TaskMaster integration with file change tracking
 * Following All-Purpose Pattern: Configurable for ANY project structure and task types
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';
import { logger, processingLogger } from '../utils/logger';
import { FileWatcher, FileChangeEvent } from '../processing/fileWatcher';
import { DocumentProcessor } from '../processing/documentProcessor';

export interface TaskFileMapping {
  taskId: string;
  files: string[];
  lastModified: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  description?: string;
  metadata?: Record<string, any>;
}

export interface ProjectContextConfig {
  projectDir: string;
  taskMasterConfigPath: string;
  trackingCacheFile: string;
  enableRealTimeTracking: boolean;
  autoUpdateOnTaskChange: boolean;
  fileAssociationPatterns: Record<string, string[]>;
}

export interface ContextUpdate {
  type: 'task_status_changed' | 'file_changed' | 'task_file_associated' | 'context_refreshed';
  taskId?: string;
  filePath?: string;
  oldStatus?: string;
  newStatus?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Project Context Tracker
 * Links TaskMaster tasks with file changes and maintains project context awareness
 */
export class ProjectContextTracker extends EventEmitter {
  private config: ProjectContextConfig;
  private taskFileMappings: Map<string, TaskFileMapping> = new Map();
  private fileToTasks: Map<string, Set<string>> = new Map();
  private fileWatcher?: FileWatcher;
  private isTracking = false;

  constructor(config: Partial<ProjectContextConfig> = {}) {
    super();

    this.config = {
      projectDir: process.cwd(),
      taskMasterConfigPath: path.join(process.cwd(), '.taskmaster'),
      trackingCacheFile: path.join(process.cwd(), '.rag-cache', 'project-context.json'),
      enableRealTimeTracking: true,
      autoUpdateOnTaskChange: true,
      fileAssociationPatterns: {
        'docs': ['**/*.md', '**/*.txt'],
        'code': ['src/**/*.ts', 'src/**/*.js', 'lib/**/*.ts'],
        'config': ['*.json', '*.yaml', '*.yml', '.env*'],
        'meta-agents': ['src/meta-agents/**/*']
      },
      ...config
    };

    processingLogger.info('Project Context Tracker initialized', {
      projectDir: this.config.projectDir,
      realTimeTracking: this.config.enableRealTimeTracking
    });
  }

  /**
   * Start project context tracking
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) {
      processingLogger.warn('Project context tracking is already active');
      return;
    }

    try {
      // Load existing mappings from cache
      await this.loadMappingsFromCache();

      // Initialize TaskMaster integration
      await this.initializeTaskMasterIntegration();

      // Setup file watching if enabled
      if (this.config.enableRealTimeTracking) {
        await this.setupFileWatching();
      }

      // Perform initial context sync
      await this.syncProjectContext();

      this.isTracking = true;
      processingLogger.info('Project context tracking started successfully');
      this.emit('trackingStarted', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to start project context tracking', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Stop project context tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      // Stop file watching
      if (this.fileWatcher) {
        await this.fileWatcher.stopWatching();
      }

      // Save current mappings to cache
      await this.saveMappingsToCache();

      this.isTracking = false;
      processingLogger.info('Project context tracking stopped');
      this.emit('trackingStopped', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to stop project context tracking', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Associate files with a TaskMaster task
   */
  async associateFilesWithTask(taskId: string, files: string[], metadata?: Record<string, any>): Promise<void> {
    const absoluteFiles = files.map(f => path.resolve(this.config.projectDir, f));
    
    // Update task mapping
    const existingMapping = this.taskFileMappings.get(taskId);
    const taskMapping: TaskFileMapping = {
      taskId,
      files: absoluteFiles,
      lastModified: new Date(),
      status: existingMapping?.status || 'pending',
      description: metadata?.description || existingMapping?.description,
      metadata: { ...existingMapping?.metadata, ...metadata }
    };

    this.taskFileMappings.set(taskId, taskMapping);

    // Update file-to-task reverse mapping
    for (const file of absoluteFiles) {
      if (!this.fileToTasks.has(file)) {
        this.fileToTasks.set(file, new Set());
      }
      this.fileToTasks.get(file)!.add(taskId);
    }

    processingLogger.info('Files associated with task', {
      taskId,
      files: files.length,
      fileList: files
    });

    this.emit('contextUpdated', {
      type: 'task_file_associated',
      taskId,
      timestamp: new Date(),
      metadata: { files }
    } as ContextUpdate);

    // Save to cache
    await this.saveMappingsToCache();
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, newStatus: TaskFileMapping['status'], metadata?: Record<string, any>): Promise<void> {
    const mapping = this.taskFileMappings.get(taskId);
    if (!mapping) {
      processingLogger.warn('Attempted to update status for unknown task', { taskId });
      return;
    }

    const oldStatus = mapping.status;
    mapping.status = newStatus;
    mapping.lastModified = new Date();
    
    if (metadata) {
      mapping.metadata = { ...mapping.metadata, ...metadata };
    }

    processingLogger.info('Task status updated', {
      taskId,
      oldStatus,
      newStatus,
      files: mapping.files.length
    });

    this.emit('contextUpdated', {
      type: 'task_status_changed',
      taskId,
      oldStatus,
      newStatus,
      timestamp: new Date(),
      metadata
    } as ContextUpdate);

    // Auto-update RAG context if enabled
    if (this.config.autoUpdateOnTaskChange) {
      await this.updateTaskContext(taskId);
    }

    // Save to cache
    await this.saveMappingsToCache();
  }

  /**
   * Get files associated with a task
   */
  getTaskFiles(taskId: string): string[] {
    const mapping = this.taskFileMappings.get(taskId);
    return mapping ? [...mapping.files] : [];
  }

  /**
   * Get tasks associated with a file
   */
  getFileTasks(filePath: string): string[] {
    const absolutePath = path.resolve(this.config.projectDir, filePath);
    const tasks = this.fileToTasks.get(absolutePath);
    return tasks ? Array.from(tasks) : [];
  }

  /**
   * Get current project context summary
   */
  getProjectContext(): {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    trackedFiles: number;
    recentActivity: ContextUpdate[];
  } {
    const tasks = Array.from(this.taskFileMappings.values());
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const trackedFiles = this.fileToTasks.size;

    return {
      totalTasks,
      activeTasks,
      completedTasks,
      trackedFiles,
      recentActivity: [] // Could be enhanced with activity history
    };
  }

  /**
   * Initialize TaskMaster integration
   */
  private async initializeTaskMasterIntegration(): Promise<void> {
    try {
      // Check if TaskMaster config exists
      const configExists = await fs.pathExists(this.config.taskMasterConfigPath);
      if (!configExists) {
        processingLogger.warn('TaskMaster config not found', { 
          path: this.config.taskMasterConfigPath 
        });
        return;
      }

      // Read TaskMaster tasks and create initial associations
      await this.syncTaskMasterTasks();

      processingLogger.info('TaskMaster integration initialized');

    } catch (error) {
      processingLogger.error('TaskMaster integration failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Sync with TaskMaster tasks
   */
  private async syncTaskMasterTasks(): Promise<void> {
    try {
      // This would typically read TaskMaster's task list
      // For now, we'll create intelligent associations based on file patterns
      await this.createIntelligentAssociations();

    } catch (error) {
      processingLogger.error('Failed to sync TaskMaster tasks', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Create intelligent file-task associations based on patterns
   */
  private async createIntelligentAssociations(): Promise<void> {
    // RAG system tasks
    const ragFiles = [
      'rag-system/**/*.ts',
      'rag-system/**/*.js',
      'rag-system/test-*.js'
    ];

    await this.associateFilesWithTask('task-5-project-context', ragFiles, {
      description: 'Project Context Awareness - Task tracking and file change detection',
      category: 'rag-system'
    });

    // Meta-agent factory tasks
    const metaAgentFiles = [
      'src/meta-agents/**/*.ts',
      'src/meta-agents/**/*.js',
      'docs-consolidated/prd_*.md',
      'docs-consolidated/meta_agent_factory.md'
    ];

    await this.associateFilesWithTask('task-meta-agents', metaAgentFiles, {
      description: 'Meta-Agent Factory development',
      category: 'meta-agents'
    });

    // Documentation tasks
    const docFiles = [
      'docs-consolidated/*.md',
      'README.md',
      'COMPREHENSIVE_PROJECT_STATUS.md'
    ];

    await this.associateFilesWithTask('task-documentation', docFiles, {
      description: 'Project documentation and consolidation',
      category: 'documentation'
    });

    processingLogger.info('Intelligent task-file associations created');
  }

  /**
   * Setup file watching for context tracking
   */
  private async setupFileWatching(): Promise<void> {
    if (!this.fileWatcher) {
      const processor = new DocumentProcessor({
        sourceDir: this.config.projectDir
      });

      // Create file watcher with project-specific patterns
      const { createFileWatcher } = await import('../processing/fileWatcher');
      this.fileWatcher = createFileWatcher(processor, {
        watchDir: this.config.projectDir,
        filePatterns: Object.values(this.config.fileAssociationPatterns).flat()
      });

      // Handle file change events
      this.fileWatcher.on('fileChanged', (event: FileChangeEvent) => {
        this.handleFileChange(event);
      });

      await this.fileWatcher.startWatching();
      processingLogger.info('File watching setup for context tracking');
    }
  }

  /**
   * Handle file change events
   */
  private async handleFileChange(event: FileChangeEvent): Promise<void> {
    const associatedTasks = this.getFileTasks(event.filePath);
    
    if (associatedTasks.length === 0) {
      return; // File not associated with any tasks
    }

    processingLogger.debug('File change affects tasks', {
      file: event.fileName,
      type: event.type,
      tasks: associatedTasks
    });

    // Update last modified time for affected tasks
    for (const taskId of associatedTasks) {
      const mapping = this.taskFileMappings.get(taskId);
      if (mapping) {
        mapping.lastModified = new Date();
      }
    }

    this.emit('contextUpdated', {
      type: 'file_changed',
      filePath: event.filePath,
      timestamp: new Date(),
      metadata: { 
        changeType: event.type,
        affectedTasks: associatedTasks 
      }
    } as ContextUpdate);

    // Auto-update context for affected tasks if enabled
    if (this.config.autoUpdateOnTaskChange) {
      for (const taskId of associatedTasks) {
        await this.updateTaskContext(taskId);
      }
    }
  }

  /**
   * Update RAG context for a specific task
   */
  private async updateTaskContext(taskId: string): Promise<void> {
    const mapping = this.taskFileMappings.get(taskId);
    if (!mapping) {
      return;
    }

    try {
      // This would trigger re-embedding of task-related files
      // For now, emit an event that the RAG pipeline can listen to
      this.emit('taskContextUpdateNeeded', {
        taskId,
        files: mapping.files,
        status: mapping.status,
        timestamp: new Date()
      });

      processingLogger.debug('Task context update triggered', {
        taskId,
        files: mapping.files.length
      });

    } catch (error) {
      processingLogger.error('Failed to update task context', {
        taskId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Sync complete project context
   */
  private async syncProjectContext(): Promise<void> {
    try {
      // Refresh all task-file associations
      await this.createIntelligentAssociations();

      // Emit context refresh event
      this.emit('contextUpdated', {
        type: 'context_refreshed',
        timestamp: new Date(),
        metadata: {
          totalTasks: this.taskFileMappings.size,
          trackedFiles: this.fileToTasks.size
        }
      } as ContextUpdate);

      processingLogger.info('Project context synced', {
        tasks: this.taskFileMappings.size,
        files: this.fileToTasks.size
      });

    } catch (error) {
      processingLogger.error('Failed to sync project context', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Load mappings from cache file
   */
  private async loadMappingsFromCache(): Promise<void> {
    try {
      if (await fs.pathExists(this.config.trackingCacheFile)) {
        const cacheData = await fs.readJSON(this.config.trackingCacheFile);
        
        // Restore task mappings
        if (cacheData.taskFileMappings) {
          this.taskFileMappings = new Map(Object.entries(cacheData.taskFileMappings));
        }

        // Rebuild file-to-task mapping
        this.fileToTasks.clear();
        for (const [taskId, mapping] of this.taskFileMappings) {
          for (const file of (mapping as TaskFileMapping).files) {
            if (!this.fileToTasks.has(file)) {
              this.fileToTasks.set(file, new Set());
            }
            this.fileToTasks.get(file)!.add(taskId);
          }
        }

        processingLogger.info('Project context cache loaded', {
          tasks: this.taskFileMappings.size,
          files: this.fileToTasks.size
        });
      }
    } catch (error) {
      processingLogger.warn('Failed to load context cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Save mappings to cache file
   */
  private async saveMappingsToCache(): Promise<void> {
    try {
      // Ensure cache directory exists
      await fs.ensureDir(path.dirname(this.config.trackingCacheFile));

      // Convert Map to object for JSON serialization
      const cacheData = {
        taskFileMappings: Object.fromEntries(this.taskFileMappings),
        lastUpdated: new Date().toISOString()
      };

      await fs.writeJSON(this.config.trackingCacheFile, cacheData, { spaces: 2 });
      
      processingLogger.debug('Project context cache saved');

    } catch (error) {
      processingLogger.error('Failed to save context cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get current tracking status
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Get current configuration
   */
  getConfig(): ProjectContextConfig {
    return { ...this.config };
  }
}

/**
 * Create project context tracker with default configuration
 */
export function createProjectContextTracker(config?: Partial<ProjectContextConfig>): ProjectContextTracker {
  return new ProjectContextTracker(config);
}