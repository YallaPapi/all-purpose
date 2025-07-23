/**
 * Project Context Integration
 *
 * Use context7: Complete integration of project context awareness with RAG system
 * Following All-Purpose Pattern: Configurable orchestration for ANY project structure
 */
import { EventEmitter } from 'events';
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
export declare class ProjectContextIntegration extends EventEmitter {
    private config;
    private contextTracker;
    private ragPipeline;
    private conversationAPI;
    private isActive;
    private updateQueue;
    private processingQueue;
    private stats;
    constructor(config?: Partial<ProjectContextIntegrationConfig>);
    /**
     * Start the complete project context integration
     */
    start(): Promise<void>;
    /**
     * Stop the project context integration
     */
    stop(): Promise<void>;
    /**
     * Manually trigger context update for a task
     */
    updateTaskContext(taskId: string): Promise<void>;
    /**
     * Get comprehensive integration statistics
     */
    getStats(): IntegrationStats;
    /**
     * Force complete project context refresh
     */
    refreshProjectContext(): Promise<void>;
    /**
     * Setup event handlers for component integration
     */
    private setupEventHandlers;
    /**
     * Handle context update events
     */
    private handleContextUpdate;
    /**
     * Handle task context update requests
     */
    private handleTaskContextUpdateNeeded;
    /**
     * Process queued context updates
     */
    private processUpdateQueue;
    /**
     * Process updates for a specific task
     */
    private processTaskUpdates;
    /**
     * Process file change updates
     */
    private processFileUpdates;
    /**
     * Update conversation context with task information
     */
    private updateConversationContext;
    /**
     * Perform initial context synchronization
     */
    private performInitialSync;
    /**
     * Get current activity status
     */
    isIntegrationActive(): boolean;
    /**
     * Get current configuration
     */
    getConfig(): ProjectContextIntegrationConfig;
}
/**
 * Create project context integration with default configuration
 */
export declare function createProjectContextIntegration(config?: Partial<ProjectContextIntegrationConfig>): ProjectContextIntegration;
//# sourceMappingURL=projectContextIntegration.d.ts.map