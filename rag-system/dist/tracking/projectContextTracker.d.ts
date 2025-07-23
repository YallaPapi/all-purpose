/**
 * Project Context Tracker
 *
 * Use context7: TaskMaster integration with file change tracking
 * Following All-Purpose Pattern: Configurable for ANY project structure and task types
 */
import { EventEmitter } from 'events';
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
export declare class ProjectContextTracker extends EventEmitter {
    private config;
    private taskFileMappings;
    private fileToTasks;
    private fileWatcher?;
    private isTracking;
    constructor(config?: Partial<ProjectContextConfig>);
    /**
     * Start project context tracking
     */
    startTracking(): Promise<void>;
    /**
     * Stop project context tracking
     */
    stopTracking(): Promise<void>;
    /**
     * Associate files with a TaskMaster task
     */
    associateFilesWithTask(taskId: string, files: string[], metadata?: Record<string, any>): Promise<void>;
    /**
     * Update task status
     */
    updateTaskStatus(taskId: string, newStatus: TaskFileMapping['status'], metadata?: Record<string, any>): Promise<void>;
    /**
     * Get files associated with a task
     */
    getTaskFiles(taskId: string): string[];
    /**
     * Get tasks associated with a file
     */
    getFileTasks(filePath: string): string[];
    /**
     * Get current project context summary
     */
    getProjectContext(): {
        totalTasks: number;
        activeTasks: number;
        completedTasks: number;
        trackedFiles: number;
        recentActivity: ContextUpdate[];
    };
    /**
     * Initialize TaskMaster integration
     */
    private initializeTaskMasterIntegration;
    /**
     * Sync with TaskMaster tasks
     */
    private syncTaskMasterTasks;
    /**
     * Create intelligent file-task associations based on patterns
     */
    private createIntelligentAssociations;
    /**
     * Setup file watching for context tracking
     */
    private setupFileWatching;
    /**
     * Handle file change events
     */
    private handleFileChange;
    /**
     * Update RAG context for a specific task
     */
    private updateTaskContext;
    /**
     * Sync complete project context
     */
    private syncProjectContext;
    /**
     * Load mappings from cache file
     */
    private loadMappingsFromCache;
    /**
     * Save mappings to cache file
     */
    private saveMappingsToCache;
    /**
     * Get current tracking status
     */
    isActive(): boolean;
    /**
     * Get current configuration
     */
    getConfig(): ProjectContextConfig;
}
/**
 * Create project context tracker with default configuration
 */
export declare function createProjectContextTracker(config?: Partial<ProjectContextConfig>): ProjectContextTracker;
//# sourceMappingURL=projectContextTracker.d.ts.map