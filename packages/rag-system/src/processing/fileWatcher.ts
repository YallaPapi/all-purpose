/**
 * File Watcher Service
 * 
 * Use context7: Chokidar file watching with proper event handling
 * Following All-Purpose Pattern: Configurable for ANY file patterns and directories
 */

import chokidar from 'chokidar';
import path from 'path';
import { EventEmitter } from 'events';
import { logger, processingLogger } from '../utils/logger';
import { DocumentProcessor, ProcessingConfig } from './documentProcessor';

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
export class FileWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watcher?: chokidar.FSWatcher;
  private processor: DocumentProcessor;
  private isWatching = false;
  private pendingChanges: Map<string, FileChangeEvent> = new Map();
  private batchTimer?: NodeJS.Timeout;
  private lastBatchId = 0;

  constructor(
    processor: DocumentProcessor,
    config: Partial<WatcherConfig> = {}
  ) {
    super();
    
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

    processingLogger.info('File watcher initialized', {
      watchDir: this.config.watchDir,
      filePatterns: this.config.filePatterns.length,
      debounceMs: this.config.debounceMs
    });
  }

  /**
   * Start watching for file changes
   */
  async startWatching(): Promise<void> {
    if (this.isWatching) {
      processingLogger.warn('File watcher is already running');
      return;
    }

    try {
      // Create watch patterns
      const watchPatterns = this.config.filePatterns.map(pattern => 
        path.join(this.config.watchDir, pattern)
      );

      // Use context7: Chokidar configuration for optimal performance
      this.watcher = chokidar.watch(watchPatterns, {
        ignored: this.config.excludePatterns.map(pattern => 
          path.join(this.config.watchDir, pattern)
        ),
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
      processingLogger.info('File watcher started successfully', {
        patterns: watchPatterns.length,
        ignored: this.config.excludePatterns.length
      });

      this.emit('watcherStarted', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to start file watcher', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
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
      processingLogger.info('File watcher stopped successfully');
      
      this.emit('watcherStopped', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to stop file watcher', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Setup file system event handlers
   */
  private setupEventHandlers(): void {
    if (!this.watcher) return;

    // File added
    this.watcher.on('add', (filePath: string) => {
      this.handleFileChange('added', filePath);
    });

    // File changed
    this.watcher.on('change', (filePath: string) => {
      this.handleFileChange('changed', filePath);
    });

    // File deleted
    this.watcher.on('unlink', (filePath: string) => {
      this.handleFileChange('deleted', filePath);
    });

    // Directory added (watch for new files)
    this.watcher.on('addDir', (dirPath: string) => {
      processingLogger.debug('Directory added to watch', { dir: dirPath });
    });

    // Directory deleted
    this.watcher.on('unlinkDir', (dirPath: string) => {
      processingLogger.debug('Directory removed from watch', { dir: dirPath });
    });

    // Watcher errors
    this.watcher.on('error', (error: Error) => {
      processingLogger.error('File watcher error', {
        error: error.message
      });
      this.emit('watcherError', { error, timestamp: new Date() });
    });

    // Watcher ready
    this.watcher.on('ready', () => {
      processingLogger.info('File watcher is ready and monitoring changes');
      this.emit('watcherReady', { timestamp: new Date() });
    });
  }

  /**
   * Handle individual file change events
   */
  private handleFileChange(type: 'added' | 'changed' | 'deleted', filePath: string): void {
    const fileName = path.basename(filePath);
    const changeEvent: FileChangeEvent = {
      type,
      filePath,
      fileName,
      timestamp: new Date()
    };

    processingLogger.debug('File change detected', {
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
    } else {
      // Process immediately
      this.processFileChange(changeEvent);
    }
  }

  /**
   * Schedule batch processing with debouncing
   */
  private scheduleBatchProcessing(): void {
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
  private async processPendingChanges(): Promise<void> {
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

    const batchEvent: BatchProcessingEvent = {
      changes,
      batchId,
      timestamp: new Date()
    };

    processingLogger.info('Processing file change batch', {
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

      processingLogger.info('Batch processing completed successfully', {
        batchId,
        processed: changes.length
      });

      this.emit('batchProcessed', { 
        ...batchEvent, 
        success: true,
        completedAt: new Date()
      });

    } catch (error) {
      processingLogger.error('Batch processing failed', {
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
  private async processFileChange(change: FileChangeEvent): Promise<void> {
    try {
      processingLogger.debug('Processing file change', {
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

    } catch (error) {
      processingLogger.error('Failed to process file change', {
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
  private async processFileUpdate(filePath: string): Promise<void> {
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
  private async processFileDelete(filePath: string): Promise<void> {
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
  isActive(): boolean {
    return this.isWatching;
  }

  /**
   * Get current configuration
   */
  getConfig(): WatcherConfig {
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

/**
 * Create file watcher with default configuration
 */
export function createFileWatcher(
  processor: DocumentProcessor,
  config?: Partial<WatcherConfig>
): FileWatcher {
  return new FileWatcher(processor, config);
}

/**
 * Default file watcher instance (requires processor)
 */
export function createDefaultFileWatcher(processor: DocumentProcessor): FileWatcher {
  return createFileWatcher(processor);
}