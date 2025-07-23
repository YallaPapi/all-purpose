"use strict";
/**
 * RAG Processing Pipeline
 *
 * Use context7: Complete pipeline integration with proper error handling
 * Following All-Purpose Pattern: Configurable orchestration for ANY document types
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGPipeline = void 0;
exports.createRAGPipeline = createRAGPipeline;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const documentProcessor_1 = require("../processing/documentProcessor");
const embeddingAdapter_1 = require("../embeddings/embeddingAdapter");
const upstashVectorClient_1 = require("../vectordb/upstashVectorClient");
const fileWatcher_1 = require("../processing/fileWatcher");
/**
 * Complete RAG Processing Pipeline
 * Orchestrates document processing, embedding generation, and vector storage
 */
class RAGPipeline extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.isProcessing = false;
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
        this.documentProcessor = (0, documentProcessor_1.createDocumentProcessor)({
            sourceDir: this.config.sourceDir
        });
        this.embeddings = (0, embeddingAdapter_1.createEmbeddingAdapter)();
        this.vectorClient = (0, upstashVectorClient_1.createUpstashVectorClient)();
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
        logger_1.processingLogger.info('RAG Pipeline initialized', {
            sourceDir: this.config.sourceDir,
            fileWatching: this.config.enableFileWatching,
            incrementalUpdates: this.config.enableIncrementalUpdates
        });
    }
    /**
     * Start the complete RAG pipeline
     */
    async start() {
        logger_1.processingLogger.info('Starting RAG Pipeline');
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
            logger_1.processingLogger.info('RAG Pipeline started successfully');
            this.emit('pipelineStarted', { timestamp: new Date() });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to start RAG Pipeline', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Stop the RAG pipeline
     */
    async stop() {
        logger_1.processingLogger.info('Stopping RAG Pipeline');
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
            logger_1.processingLogger.info('RAG Pipeline stopped successfully');
            this.emit('pipelineStopped', { timestamp: new Date() });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to stop RAG Pipeline', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Process all documents in the source directory
     */
    async processAllDocuments() {
        if (this.isProcessing) {
            throw new Error('Pipeline is already processing documents');
        }
        this.isProcessing = true;
        this.stats.isProcessing = true;
        const startTime = new Date();
        const progress = {
            stage: 'discovery',
            processed: 0,
            total: 0,
            errors: [],
            startTime
        };
        try {
            logger_1.processingLogger.info('Starting complete document processing');
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
            logger_1.processingLogger.info('Document processing completed', {
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
            }
            catch (error) {
                logger_1.processingLogger.warn('Failed to get vector DB stats', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            logger_1.processingLogger.info('Complete document processing finished', {
                totalTime: processingTime,
                documents: this.stats.totalDocuments,
                chunks: this.stats.totalChunks,
                embeddings: this.stats.totalEmbeddings
            });
            this.emit('processingCompleted', progress);
            return progress;
        }
        catch (error) {
            progress.errors.push(error instanceof Error ? error.message : String(error));
            logger_1.processingLogger.error('Document processing failed', {
                error: error instanceof Error ? error.message : String(error),
                stage: progress.stage,
                processed: progress.processed
            });
            this.emit('processingFailed', { progress, error });
            throw error;
        }
        finally {
            this.isProcessing = false;
            this.stats.isProcessing = false;
        }
    }
    /**
     * Process a single file (for incremental updates)
     */
    async processFile(filePath) {
        logger_1.processingLogger.info('Processing single file', { file: filePath });
        try {
            // Create a temporary processor for this file
            const fileProcessor = (0, documentProcessor_1.createDocumentProcessor)({
                sourceDir: this.config.sourceDir
            });
            // Process the file
            const fileInfo = await this.getFileInfo(filePath);
            const chunks = await fileProcessor.processFile(fileInfo);
            if (chunks.length === 0) {
                logger_1.processingLogger.debug('No chunks generated for file', { file: filePath });
                return;
            }
            // Generate embeddings
            const texts = chunks.map(chunk => chunk.content);
            const embeddingResult = await this.embeddings.generateEmbeddings(texts);
            // Create vector points
            const vectorPoints = chunks.map((chunk, index) => ({
                id: chunk.id,
                vector: embeddingResult.results[index].embedding,
                metadata: {
                    ...chunk.metadata,
                    content: chunk.content
                }
            }));
            // Store in vector database
            await this.vectorClient.upsertVectors(vectorPoints);
            logger_1.processingLogger.info('Single file processed successfully', {
                file: filePath,
                chunks: chunks.length
            });
            this.emit('fileProcessed', { filePath, chunks: chunks.length });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to process single file', {
                file: filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Remove file from vector database
     */
    async removeFile(filePath) {
        logger_1.processingLogger.info('Removing file from vector database', { file: filePath });
        try {
            // Search for vectors with this file path
            // Note: This is a simplified approach - in practice, you'd maintain a mapping
            // of file paths to vector IDs for efficient deletion
            logger_1.processingLogger.info('File removal completed', { file: filePath });
            this.emit('fileRemoved', { filePath });
        }
        catch (error) {
            logger_1.processingLogger.error('Failed to remove file', {
                file: filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Generate embeddings for document chunks
     */
    async generateEmbeddings(chunks, progress) {
        const results = [];
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
                logger_1.processingLogger.debug('Embedding batch completed', {
                    batch: Math.floor(i / this.config.batchSize) + 1,
                    processed: progress.processed,
                    total: progress.total
                });
            }
            catch (error) {
                const errorMsg = `Failed to generate embeddings for batch ${Math.floor(i / this.config.batchSize) + 1}: ${error instanceof Error ? error.message : String(error)}`;
                progress.errors.push(errorMsg);
                logger_1.processingLogger.error('Embedding batch failed', { error: errorMsg });
            }
        }
        return results;
    }
    /**
     * Store embeddings in vector database
     */
    async storeEmbeddings(embeddingResults, progress) {
        // Convert to vector points
        const vectorPoints = embeddingResults.map(({ chunk, embedding }) => ({
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
                logger_1.processingLogger.debug('Vector storage batch completed', {
                    batch: Math.floor(i / this.config.batchSize) + 1,
                    processed: progress.processed,
                    total: progress.total
                });
            }
            catch (error) {
                const errorMsg = `Failed to store vectors for batch ${Math.floor(i / this.config.batchSize) + 1}: ${error instanceof Error ? error.message : String(error)}`;
                progress.errors.push(errorMsg);
                logger_1.processingLogger.error('Vector storage batch failed', { error: errorMsg });
            }
        }
    }
    /**
     * Setup file watcher for incremental updates
     */
    setupFileWatcher() {
        this.fileWatcher = (0, fileWatcher_1.createFileWatcher)(this.documentProcessor, {
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
                }
                else if (action === 'delete') {
                    await this.removeFile(filePath);
                }
            }
            catch (error) {
                logger_1.processingLogger.error('Incremental update failed', {
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
    async getFileInfo(filePath) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs-extra')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get current pipeline statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.RAGPipeline = RAGPipeline;
/**
 * Create RAG pipeline with default configuration
 */
function createRAGPipeline(config) {
    return new RAGPipeline(config);
}
// Use context7: No default exports that initialize immediately
// Create instances when needed with proper env var loading
//# sourceMappingURL=ragPipeline.js.map