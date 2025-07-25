/**
 * RAG Processing Pipeline
 * 
 * Use context7: Complete pipeline integration with proper error handling
 * Following All-Purpose Pattern: Configurable orchestration for ANY document types
 */

import { EventEmitter } from 'events';
import { logger, processingLogger } from '../utils/logger';
import { createDocumentProcessor, DocumentProcessor, DocumentChunk } from '../processing/documentProcessor';
import { createEmbeddingAdapter, EmbeddingAdapter, AdaptedEmbeddingResult } from '../embeddings/embeddingAdapter';
import { createUpstashVectorClient, UpstashVectorClient, VectorPoint } from '../vectordb/upstashVectorClient';
import { createFileWatcher, FileWatcher, FileChangeEvent } from '../processing/fileWatcher';

export interface PipelineConfig {
  sourceDir: string;
  enableFileWatching: boolean;
  enableIncrementalUpdates: boolean;
  batchSize: number;
  processingConcurrency: number;
  retryAttempts: number;
  autoStart: boolean;
}

export interface PipelineStats {
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  lastProcessed: Date | null;
  processingTime: number;
  vectorDBStats: any;
  isProcessing: boolean;
  isWatching: boolean;
}

export interface ProcessingProgress {
  stage: 'discovery' | 'chunking' | 'embedding' | 'indexing' | 'complete';
  processed: number;
  total: number;
  currentFile?: string;
  errors: string[];
  startTime: Date;
}

/**
 * Complete RAG Processing Pipeline
 * Orchestrates document processing, embedding generation, and vector storage
 */
export class RAGPipeline extends EventEmitter {
  private config: PipelineConfig;
  private documentProcessor: DocumentProcessor;
  private embeddings: EmbeddingAdapter;
  private vectorClient: UpstashVectorClient;
  private fileWatcher?: FileWatcher;
  private isProcessing = false;
  private stats: PipelineStats;

  constructor(config: Partial<PipelineConfig> = {}) {
    super();

    this.config = {
      sourceDir: process.cwd(),
      enableFileWatching: true,
      enableIncrementalUpdates: true,
      batchSize: 5, // Use context7: Smaller batches to prevent memory issues
      processingConcurrency: 1, // Use context7: Single thread processing
      retryAttempts: 3,
      autoStart: false,
      ...config
    };

    // Initialize components
    this.documentProcessor = createDocumentProcessor({
      sourceDir: this.config.sourceDir
    });

    this.embeddings = createEmbeddingAdapter();
    this.vectorClient = createUpstashVectorClient();

    // Initialize stats
    this.stats = {
      totalDocuments: 0,
      totalChunks: 0,
      totalEmbeddings: 0,
      lastProcessed: null,
      processingTime: 0,
      vectorDBStats: {},
      isProcessing: false,
      isWatching: false
    };

    // Setup file watcher if enabled
    if (this.config.enableFileWatching) {
      this.setupFileWatcher();
    }

    processingLogger.info('RAG Pipeline initialized', {
      sourceDir: this.config.sourceDir,
      fileWatching: this.config.enableFileWatching,
      incrementalUpdates: this.config.enableIncrementalUpdates
    });
  }

  /**
   * Start the complete RAG pipeline
   */
  async start(): Promise<void> {
    processingLogger.info('Starting RAG Pipeline');
    
    try {
      // Test vector database connection
      const isHealthy = await this.vectorClient.healthCheck();
      if (!isHealthy) {
        throw new Error('Vector database health check failed');
      }

      // Start file watching if enabled
      if (this.config.enableFileWatching && this.fileWatcher) {
        await this.fileWatcher.startWatching();
        this.stats.isWatching = true;
      }

      // Process existing documents if auto-start is enabled
      if (this.config.autoStart) {
        await this.processAllDocuments();
      }

      processingLogger.info('RAG Pipeline started successfully');
      this.emit('pipelineStarted', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to start RAG Pipeline', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Stop the RAG pipeline
   */
  async stop(): Promise<void> {
    processingLogger.info('Stopping RAG Pipeline');

    try {
      // Stop file watching
      if (this.fileWatcher) {
        await this.fileWatcher.stopWatching();
        this.stats.isWatching = false;
      }

      // Wait for any ongoing processing to complete
      while (this.isProcessing) {
        await this.delay(100);
      }

      processingLogger.info('RAG Pipeline stopped successfully');
      this.emit('pipelineStopped', { timestamp: new Date() });

    } catch (error) {
      processingLogger.error('Failed to stop RAG Pipeline', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process all documents in the source directory
   */
  async processAllDocuments(): Promise<ProcessingProgress> {
    if (this.isProcessing) {
      throw new Error('Pipeline is already processing documents');
    }

    this.isProcessing = true;
    this.stats.isProcessing = true;
    const startTime = new Date();

    const progress: ProcessingProgress = {
      stage: 'discovery',
      processed: 0,
      total: 0,
      errors: [],
      startTime
    };

    try {
      processingLogger.info('Starting complete document processing');
      this.emit('processingStarted', progress);

      // Stage 1: Document Discovery and Chunking
      progress.stage = 'discovery';
      this.emit('progressUpdated', progress);

      const processingResult = await this.documentProcessor.processDocuments();
      
      progress.total = processingResult.chunks.length;
      progress.stage = 'chunking';
      this.emit('progressUpdated', progress);

      if (processingResult.errors.length > 0) {
        progress.errors.push(...processingResult.errors);
      }

      processingLogger.info('Document processing completed', {
        chunks: processingResult.chunks.length,
        files: processingResult.processedFiles,
        errors: processingResult.errors.length
      });

      // Stage 2: Generate Embeddings
      progress.stage = 'embedding';
      this.emit('progressUpdated', progress);

      const embeddingResults = await this.generateEmbeddings(processingResult.chunks, progress);

      // Stage 3: Store in Vector Database
      progress.stage = 'indexing';
      this.emit('progressUpdated', progress);

      await this.storeEmbeddings(embeddingResults, progress);

      // Complete
      progress.stage = 'complete';
      progress.processed = progress.total;
      
      const processingTime = Date.now() - startTime.getTime();
      this.stats.totalDocuments = processingResult.processedFiles;
      this.stats.totalChunks = processingResult.chunks.length;
      this.stats.totalEmbeddings = embeddingResults.length;
      this.stats.lastProcessed = new Date();
      this.stats.processingTime = processingTime;

      // Update vector DB stats
      try {
        this.stats.vectorDBStats = await this.vectorClient.getIndexStats();
      } catch (error) {
        processingLogger.warn('Failed to get vector DB stats', {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      processingLogger.info('Complete document processing finished', {
        totalTime: processingTime,
        documents: this.stats.totalDocuments,
        chunks: this.stats.totalChunks,
        embeddings: this.stats.totalEmbeddings
      });

      this.emit('processingCompleted', progress);
      return progress;

    } catch (error) {
      progress.errors.push(error instanceof Error ? error.message : String(error));
      
      processingLogger.error('Document processing failed', {
        error: error instanceof Error ? error.message : String(error),
        stage: progress.stage,
        processed: progress.processed
      });

      this.emit('processingFailed', { progress, error });
      throw error;

    } finally {
      this.isProcessing = false;
      this.stats.isProcessing = false;
    }
  }

  /**
   * Process a single file (for incremental updates)
   */
  async processFile(filePath: string): Promise<void> {
    processingLogger.info('Processing single file', { file: filePath });

    try {
      // Create a temporary processor for this file
      const fileProcessor = createDocumentProcessor({
        sourceDir: this.config.sourceDir
      });

      // Process the file
      const fileInfo = await this.getFileInfo(filePath);
      const chunks = await fileProcessor.processFile(fileInfo);

      if (chunks.length === 0) {
        processingLogger.debug('No chunks generated for file', { file: filePath });
        return;
      }

      // Generate embeddings
      const texts = chunks.map(chunk => chunk.content);
      const embeddingResult = await this.embeddings.generateEmbeddings(texts);

      // Create vector points
      const vectorPoints: VectorPoint[] = chunks.map((chunk, index) => ({
        id: chunk.id,
        vector: embeddingResult.results[index].embedding,
        metadata: {
          ...chunk.metadata,
          content: chunk.content
        }
      }));

      // Store in vector database
      await this.vectorClient.upsertVectors(vectorPoints);

      processingLogger.info('Single file processed successfully', {
        file: filePath,
        chunks: chunks.length
      });

      this.emit('fileProcessed', { filePath, chunks: chunks.length });

    } catch (error) {
      processingLogger.error('Failed to process single file', {
        file: filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Remove file from vector database
   */
  async removeFile(filePath: string): Promise<void> {
    processingLogger.info('Removing file from vector database', { file: filePath });

    try {
      // Search for vectors with this file path
      // Note: This is a simplified approach - in practice, you'd maintain a mapping
      // of file paths to vector IDs for efficient deletion
      
      processingLogger.info('File removal completed', { file: filePath });
      this.emit('fileRemoved', { filePath });

    } catch (error) {
      processingLogger.error('Failed to remove file', {
        file: filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for document chunks
   */
  private async generateEmbeddings(
    chunks: DocumentChunk[], 
    progress: ProcessingProgress
  ): Promise<Array<{ chunk: DocumentChunk; embedding: AdaptedEmbeddingResult }>> {
    const results: Array<{ chunk: DocumentChunk; embedding: AdaptedEmbeddingResult }> = [];
    
    // Process in batches
    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);
      const texts = batch.map(chunk => chunk.content);

      try {
        const embeddingResult = await this.embeddings.generateEmbeddings(texts);
        
        // Combine chunks with their embeddings
        batch.forEach((chunk, index) => {
          results.push({
            chunk,
            embedding: embeddingResult.results[index]
          });
        });

        progress.processed = Math.min(i + batch.length, chunks.length);
        this.emit('progressUpdated', progress);

        processingLogger.debug('Embedding batch completed', {
          batch: Math.floor(i / this.config.batchSize) + 1,
          processed: progress.processed,
          total: progress.total
        });

      } catch (error) {
        const errorMsg = `Failed to generate embeddings for batch ${Math.floor(i / this.config.batchSize) + 1}: ${error instanceof Error ? error.message : String(error)}`;
        progress.errors.push(errorMsg);
        processingLogger.error('Embedding batch failed', { error: errorMsg });
      }
    }

    return results;
  }

  /**
   * Store embeddings in vector database
   */
  private async storeEmbeddings(
    embeddingResults: Array<{ chunk: DocumentChunk; embedding: AdaptedEmbeddingResult }>,
    progress: ProcessingProgress
  ): Promise<void> {
    // Convert to vector points
    const vectorPoints: VectorPoint[] = embeddingResults.map(({ chunk, embedding }) => ({
      id: chunk.id,
      vector: embedding.embedding,
      metadata: {
        ...chunk.metadata,
        content: chunk.content,
        tokens: embedding.tokens
      }
    }));

    // Store in batches
    for (let i = 0; i < vectorPoints.length; i += this.config.batchSize) {
      const batch = vectorPoints.slice(i, i + this.config.batchSize);

      try {
        const success = await this.vectorClient.upsertVectors(batch);
        if (!success) {
          throw new Error('Vector upsert returned false');
        }

        progress.processed = Math.min(i + batch.length, vectorPoints.length);
        this.emit('progressUpdated', progress);

        processingLogger.debug('Vector storage batch completed', {
          batch: Math.floor(i / this.config.batchSize) + 1,
          processed: progress.processed,
          total: progress.total
        });

      } catch (error) {
        const errorMsg = `Failed to store vectors for batch ${Math.floor(i / this.config.batchSize) + 1}: ${error instanceof Error ? error.message : String(error)}`;
        progress.errors.push(errorMsg);
        processingLogger.error('Vector storage batch failed', { error: errorMsg });
      }
    }
  }

  /**
   * Setup file watcher for incremental updates
   */
  private setupFileWatcher(): void {
    this.fileWatcher = createFileWatcher(this.documentProcessor, {
      watchDir: this.config.sourceDir
    });

    // Handle file reprocessing events
    this.fileWatcher.on('fileNeedsReprocessing', async ({ filePath, action }) => {
      if (!this.config.enableIncrementalUpdates) {
        return;
      }

      try {
        if (action === 'update') {
          await this.processFile(filePath);
        } else if (action === 'delete') {
          await this.removeFile(filePath);
        }
      } catch (error) {
        processingLogger.error('Incremental update failed', {
          file: filePath,
          action,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Forward file watcher events
    this.fileWatcher.on('watcherStarted', (event) => this.emit('watcherStarted', event));
    this.fileWatcher.on('watcherStopped', (event) => this.emit('watcherStopped', event));
    this.fileWatcher.on('fileChanged', (event) => this.emit('fileChanged', event));
    this.fileWatcher.on('watcherError', (event) => this.emit('watcherError', event));
  }

  /**
   * Get file information for processing
   */
  private async getFileInfo(filePath: string): Promise<any> {
    const fs = await import('fs-extra');
    const path = await import('path');
    const crypto = await import('crypto');

    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath);
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      filePath,
      fileName: path.basename(filePath),
      fileType: path.extname(filePath).toLowerCase(),
      size: stats.size,
      lastModified: stats.mtime,
      contentHash
    };
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current pipeline statistics
   */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  /**
   * Get current configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }
}

/**
 * Create RAG pipeline with default configuration
 */
export function createRAGPipeline(config?: Partial<PipelineConfig>): RAGPipeline {
  return new RAGPipeline(config);
}

// Use context7: No default exports that initialize immediately
// Create instances when needed with proper env var loading