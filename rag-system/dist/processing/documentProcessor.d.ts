/**
 * Document Processing Pipeline
 *
 * Use context7: File processing with proper chunking and metadata extraction
 * Following All-Purpose Pattern: Configurable for ANY file types and chunk strategies
 */
export interface ProcessingConfig {
    sourceDir: string;
    filePatterns: string[];
    excludePatterns: string[];
    chunkSize: number;
    chunkOverlap: number;
    maxFileSize: number;
    enableCache: boolean;
    cacheDir: string;
}
export interface DocumentChunk {
    id: string;
    content: string;
    metadata: {
        filePath: string;
        fileName: string;
        fileType: string;
        chunkIndex: number;
        totalChunks: number;
        startOffset: number;
        endOffset: number;
        contentHash: string;
        lastModified: Date;
        fileSize: number;
        language?: string;
        section?: string;
        title?: string;
    };
}
export interface ProcessingResult {
    chunks: DocumentChunk[];
    processedFiles: number;
    skippedFiles: number;
    errors: string[];
    totalSize: number;
    processingTime: number;
}
export interface FileInfo {
    filePath: string;
    fileName: string;
    fileType: string;
    size: number;
    lastModified: Date;
    contentHash: string;
}
/**
 * Document Processing Service
 * Handles file discovery, content extraction, and intelligent chunking
 */
export declare class DocumentProcessor {
    private config;
    private processedHashes;
    constructor(config?: Partial<ProcessingConfig>);
    /**
     * Process all documents in the configured directory
     */
    processDocuments(): Promise<ProcessingResult>;
    /**
     * Process a single file into chunks
     */
    processFile(fileInfo: FileInfo): Promise<DocumentChunk[]>;
    /**
     * Discover files matching the configured patterns
     */
    private discoverFiles;
    /**
     * Read file content safely
     */
    private readFileContent;
    /**
     * Extract text content based on file type
     */
    private extractText;
    /**
     * Extract meaningful text from markdown
     */
    private extractMarkdownText;
    /**
     * Extract text from JSON with structure info
     */
    private extractJSONText;
    /**
     * Extract text from code files
     */
    private extractCodeText;
    /**
     * Extract text from YAML
     */
    private extractYAMLText;
    /**
     * Create chunks from text content
     */
    private createChunks;
    /**
     * Create a single chunk with metadata
     */
    private createChunk;
    /**
     * Calculate file hash for change detection
     */
    private calculateFileHash;
    /**
     * Flatten object for text extraction
     */
    private flattenObject;
    /**
     * Detect programming language from file extension
     */
    private detectLanguage;
    /**
     * Extract section header from content
     */
    private extractSection;
    /**
     * Extract title from content or filename
     */
    private extractTitle;
    /**
     * Get current configuration
     */
    getConfig(): ProcessingConfig;
}
/**
 * Create document processor with default configuration
 */
export declare function createDocumentProcessor(config?: Partial<ProcessingConfig>): DocumentProcessor;
//# sourceMappingURL=documentProcessor.d.ts.map