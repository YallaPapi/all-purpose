/**
 * RAG Processing Pipeline
 *
 * Use context7: Complete pipeline integration with proper error handling
 * Following All-Purpose Pattern: Configurable orchestration for ANY document types
 */
import { EventEmitter } from 'events';
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
export declare class RAGPipeline extends EventEmitter {
    private config;
    private documentProcessor;
    private embeddings;
    private vectorClient;
    private fileWatcher?;
    private isProcessing;
    private stats;
    constructor(config?: Partial<PipelineConfig>);
    /**
     * Start the complete RAG pipeline
     */
    start(): Promise<void>;
    /**
     * Stop the RAG pipeline
     */
    stop(): Promise<void>;
    /**
     * Process all documents in the source directory
     */
    processAllDocuments(): Promise<ProcessingProgress>;
    /**
     * Process a single file (for incremental updates)
     */
    processFile(filePath: string): Promise<void>;
    /**
     * Remove file from vector database
     */
    removeFile(filePath: string): Promise<void>;
    /**
     * Generate embeddings for document chunks
     */
    private generateEmbeddings;
    /**
     * Store embeddings in vector database
     */
    private storeEmbeddings;
    /**
     * Setup file watcher for incremental updates
     */
    private setupFileWatcher;
    /**
     * Get file information for processing
     */
    private getFileInfo;
    /**
     * Simple delay utility
     */
    private delay;
    /**
     * Get current pipeline statistics
     */
    getStats(): PipelineStats;
    /**
     * Get current configuration
     */
    getConfig(): PipelineConfig;
}
/**
 * Create RAG pipeline with default configuration
 */
export declare function createRAGPipeline(config?: Partial<PipelineConfig>): RAGPipeline;
//# sourceMappingURL=ragPipeline.d.ts.map