/**
 * File Watcher Service
 *
 * Use context7: Chokidar file watching with proper event handling
 * Following All-Purpose Pattern: Configurable for ANY file patterns and directories
 */
import { EventEmitter } from 'events';
import { DocumentProcessor } from './documentProcessor';
export interface WatcherConfig {
    watchDir: string;
    filePatterns: string[];
    excludePatterns: string[];
    debounceMs: number;
    enableBatching: boolean;
    batchTimeoutMs: number;
    maxBatchSize: number;
}
export interface FileChangeEvent {
    type: 'added' | 'changed' | 'deleted';
    filePath: string;
    fileName: string;
    timestamp: Date;
}
export interface BatchProcessingEvent {
    changes: FileChangeEvent[];
    batchId: string;
    timestamp: Date;
}
/**
 * File Watcher Service
 * Monitors file changes and triggers intelligent reprocessing
 */
export declare class FileWatcher extends EventEmitter {
    private config;
    private watcher?;
    private processor;
    private isWatching;
    private pendingChanges;
    private batchTimer?;
    private lastBatchId;
    constructor(processor: DocumentProcessor, config?: Partial<WatcherConfig>);
    /**
     * Start watching for file changes
     */
    startWatching(): Promise<void>;
    /**
     * Stop watching for file changes
     */
    stopWatching(): Promise<void>;
    /**
     * Setup file system event handlers
     */
    private setupEventHandlers;
    /**
     * Handle individual file change events
     */
    private handleFileChange;
    /**
     * Schedule batch processing with debouncing
     */
    private scheduleBatchProcessing;
    /**
     * Process all pending changes as a batch
     */
    private processPendingChanges;
    /**
     * Process a single file change
     */
    private processFileChange;
    /**
     * Process file addition or modification
     */
    private processFileUpdate;
    /**
     * Process file deletion
     */
    private processFileDelete;
    /**
     * Get current watching status
     */
    isActive(): boolean;
    /**
     * Get current configuration
     */
    getConfig(): WatcherConfig;
    /**
     * Get statistics about pending changes
     */
    getStats(): {
        isWatching: boolean;
        pendingChanges: number;
        lastBatchId: number;
        hasPendingBatch: boolean;
    };
}
/**
 * Create file watcher with default configuration
 */
export declare function createFileWatcher(processor: DocumentProcessor, config?: Partial<WatcherConfig>): FileWatcher;
/**
 * Default file watcher instance (requires processor)
 */
export declare function createDefaultFileWatcher(processor: DocumentProcessor): FileWatcher;
//# sourceMappingURL=fileWatcher.d.ts.map