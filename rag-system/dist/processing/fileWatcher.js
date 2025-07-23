"use strict";
/**
 * File Watcher Service
 *
 * Use context7: Chokidar file watching with proper event handling
 * Following All-Purpose Pattern: Configurable for ANY file patterns and directories
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcher = void 0;
exports.createFileWatcher = createFileWatcher;
exports.createDefaultFileWatcher = createDefaultFileWatcher;
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
const logger_1 = require("../utils/logger");
/**
 * File Watcher Service
 * Monitors file changes and triggers intelligent reprocessing
 */
class FileWatcher extends events_1.EventEmitter {
    constructor(processor, config = {}) {
        super();
        this.isWatching = false;
        this.pendingChanges = new Map();
        this.lastBatchId = 0;
        this.processor = processor;
        this.config = {
            watchDir: process.cwd(),
            filePatterns: [
                '**/*.md',
                '**/*.txt',
                '**/*.json',
                '**/*.js',
                '**/*.ts',
                '**/*.tsx',
                '**/*.jsx',
                '**/*.py',
                '**/*.yaml',
                '**/*.yml'
            ],
            excludePatterns: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/logs/**',
                '**/*.log',
                '**/.rag-cache/**'
            ],
            debounceMs: 1000, // Use context7: Good debounce for file changes
            enableBatching: true,
            batchTimeoutMs: 5000, // Process batches every 5 seconds
            maxBatchSize: 20, // Max files per batch
            ...config
        };
        logger_1.processingLogger.info('File watcher initialized', {
            watchDir: this.config.watchDir,
            filePatterns: this.config.filePatterns.length,
            debounceMs: this.config.debounceMs
        });
    }
    /**
     * Start watching for file changes
     */
    async startWatching() {
        if (this.isWatching) {
            logger_1.processingLogger.warn('File watcher is already running');
            return;
        }
        try {
            // Create watch patterns
            const watchPatterns = this.config.filePatterns.map(pattern => path_1.default.join(this.config.watchDir, pattern));
            // Use context7: Chokidar configuration for optimal performance
            this.watcher = chokidar_1.default.watch(watchPatterns, {
                ignored: this.config.excludePatterns.map(pattern => path_1.default.join(this.config.watchDir, pattern)),
                ignoreInitial: true, // Don't fire events for existing files
                persistent: true,
                ignorePermissionErrors: true,
                usePolling: false, // Use native events when possible
                interval: 1000, // Polling interval if needed
                binaryInterval: 3000,
                awaitWriteFinish: {
                    stabilityThreshold: 500, // Wait for file to be stable
                    pollInterval: 100
                }
            });
            // Set up event handlers
            this.setupEventHandlers();
            this.isWatching = true;
            logger_1.processingLogger.info('File watcher started successfully', {
                patterns: watchPatterns.length,
                ignored: this.config.excludePatterns.length
            });
            this.emit('watcherStarted', { timestamp: new Date() });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to start file watcher', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Stop watching for file changes
     */
    async stopWatching() {
        if (!this.isWatching) {
            return;
        }
        try {
            // Process any pending changes
            if (this.pendingChanges.size > 0) {
                await this.processPendingChanges();
            }
            // Clear batch timer
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
                this.batchTimer = undefined;
            }
            // Close watcher
            if (this.watcher) {
                await this.watcher.close();
                this.watcher = undefined;
            }
            this.isWatching = false;
            logger_1.processingLogger.info('File watcher stopped successfully');
            this.emit('watcherStopped', { timestamp: new Date() });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to stop file watcher', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Setup file system event handlers
     */
    setupEventHandlers() {
        if (!this.watcher)
            return;
        // File added
        this.watcher.on('add', (filePath) => {
            this.handleFileChange('added', filePath);
        });
        // File changed
        this.watcher.on('change', (filePath) => {
            this.handleFileChange('changed', filePath);
        });
        // File deleted
        this.watcher.on('unlink', (filePath) => {
            this.handleFileChange('deleted', filePath);
        });
        // Directory added (watch for new files)
        this.watcher.on('addDir', (dirPath) => {
            logger_1.processingLogger.debug('Directory added to watch', { dir: dirPath });
        });
        // Directory deleted
        this.watcher.on('unlinkDir', (dirPath) => {
            logger_1.processingLogger.debug('Directory removed from watch', { dir: dirPath });
        });
        // Watcher errors
        this.watcher.on('error', (error) => {
            logger_1.processingLogger.error('File watcher error', {
                error: error.message
            });
            this.emit('watcherError', { error, timestamp: new Date() });
        });
        // Watcher ready
        this.watcher.on('ready', () => {
            logger_1.processingLogger.info('File watcher is ready and monitoring changes');
            this.emit('watcherReady', { timestamp: new Date() });
        });
    }
    /**
     * Handle individual file change events
     */
    handleFileChange(type, filePath) {
        const fileName = path_1.default.basename(filePath);
        const changeEvent = {
            type,
            filePath,
            fileName,
            timestamp: new Date()
        };
        logger_1.processingLogger.debug('File change detected', {
            type,
            file: fileName,
            path: filePath
        });
        // Add to pending changes (overwrites previous change for same file)
        this.pendingChanges.set(filePath, changeEvent);
        // Emit individual change event
        this.emit('fileChanged', changeEvent);
        // Handle batching
        if (this.config.enableBatching) {
            this.scheduleBatchProcessing();
        }
        else {
            // Process immediately
            this.processFileChange(changeEvent);
        }
    }
    /**
     * Schedule batch processing with debouncing
     */
    scheduleBatchProcessing() {
        // Clear existing timer
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        // Check if batch is ready to process
        if (this.pendingChanges.size >= this.config.maxBatchSize) {
            // Process immediately when batch is full
            this.processPendingChanges();
            return;
        }
        // Schedule batch processing
        this.batchTimer = setTimeout(() => {
            this.processPendingChanges();
        }, this.config.batchTimeoutMs);
    }
    /**
     * Process all pending changes as a batch
     */
    async processPendingChanges() {
        if (this.pendingChanges.size === 0) {
            return;
        }
        const changes = Array.from(this.pendingChanges.values());
        const batchId = `batch-${++this.lastBatchId}`;
        // Clear pending changes
        this.pendingChanges.clear();
        // Clear timer
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = undefined;
        }
        const batchEvent = {
            changes,
            batchId,
            timestamp: new Date()
        };
        logger_1.processingLogger.info('Processing file change batch', {
            batchId,
            changes: changes.length,
            files: changes.map(c => c.fileName)
        });
        // Emit batch processing event
        this.emit('batchProcessing', batchEvent);
        try {
            // Process each change in the batch
            for (const change of changes) {
                await this.processFileChange(change);
            }
            logger_1.processingLogger.info('Batch processing completed successfully', {
                batchId,
                processed: changes.length
            });
            this.emit('batchProcessed', {
                ...batchEvent,
                success: true,
                completedAt: new Date()
            });
        }
        catch (error) {
            logger_1.processingLogger.error('Batch processing failed', {
                batchId,
                error: error instanceof Error ? error.message : String(error)
            });
            this.emit('batchProcessed', {
                ...batchEvent,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                completedAt: new Date()
            });
        }
    }
    /**
     * Process a single file change
     */
    async processFileChange(change) {
        try {
            logger_1.processingLogger.debug('Processing file change', {
                type: change.type,
                file: change.fileName
            });
            switch (change.type) {
                case 'added':
                case 'changed':
                    await this.processFileUpdate(change.filePath);
                    break;
                case 'deleted':
                    await this.processFileDelete(change.filePath);
                    break;
            }
            this.emit('fileProcessed', {
                change,
                success: true,
                completedAt: new Date()
            });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to process file change', {
                file: change.fileName,
                type: change.type,
                error: error instanceof Error ? error.message : String(error)
            });
            this.emit('fileProcessed', {
                change,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                completedAt: new Date()
            });
        }
    }
    /**
     * Process file addition or modification
     */
    async processFileUpdate(filePath) {
        // This would typically trigger reprocessing of the specific file
        // For now, emit an event that can be handled by the main RAG system
        this.emit('fileNeedsReprocessing', {
            filePath,
            action: 'update',
            timestamp: new Date()
        });
    }
    /**
     * Process file deletion
     */
    async processFileDelete(filePath) {
        // This would typically trigger removal from vector database
        // For now, emit an event that can be handled by the main RAG system
        this.emit('fileNeedsReprocessing', {
            filePath,
            action: 'delete',
            timestamp: new Date()
        });
    }
    /**
     * Get current watching status
     */
    isActive() {
        return this.isWatching;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get statistics about pending changes
     */
    getStats() {
        return {
            isWatching: this.isWatching,
            pendingChanges: this.pendingChanges.size,
            lastBatchId: this.lastBatchId,
            hasPendingBatch: !!this.batchTimer
        };
    }
}
exports.FileWatcher = FileWatcher;
/**
 * Create file watcher with default configuration
 */
function createFileWatcher(processor, config) {
    return new FileWatcher(processor, config);
}
/**
 * Default file watcher instance (requires processor)
 */
function createDefaultFileWatcher(processor) {
    return createFileWatcher(processor);
}
//# sourceMappingURL=fileWatcher.js.map