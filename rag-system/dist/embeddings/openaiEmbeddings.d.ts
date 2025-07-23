/**
 * OpenAI Embeddings Service
 *
 * Use context7: OpenAI embeddings with proper error handling and caching
 * Following All-Purpose Pattern: Configurable for ANY embedding model
 */
export interface EmbeddingConfig {
    apiKey: string;
    model: string;
    batchSize: number;
    retryAttempts: number;
    retryDelay: number;
}
export interface EmbeddingResult {
    text: string;
    embedding: number[];
    tokens: number;
    model: string;
}
export interface BatchEmbeddingResult {
    results: EmbeddingResult[];
    totalTokens: number;
    totalCost: number;
}
/**
 * OpenAI Embeddings Service
 * Handles embedding generation with batching, retries, and cost tracking
 */
export declare class OpenAIEmbeddings {
    private client?;
    private config;
    private readonly MODEL_COSTS;
    constructor(config?: Partial<EmbeddingConfig>);
    /**
     * Get or create OpenAI client with validation
     */
    private getClient;
    /**
     * Generate embedding for a single text
     */
    generateEmbedding(text: string): Promise<EmbeddingResult>;
    /**
     * Generate embeddings for multiple texts with batching
     */
    generateEmbeddings(texts: string[]): Promise<BatchEmbeddingResult>;
    /**
     * Process a single batch of texts
     */
    private processBatch;
    /**
     * Get embedding dimension for the current model
     */
    getEmbeddingDimension(): number;
    /**
     * Validate text for embedding (check length, content)
     */
    validateText(text: string): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Simple delay utility
     */
    private delay;
    /**
     * Get current configuration
     */
    getConfig(): EmbeddingConfig;
}
/**
 * Create OpenAI embeddings service with default configuration
 */
export declare function createOpenAIEmbeddings(config?: Partial<EmbeddingConfig>): OpenAIEmbeddings;
/**
 * Default OpenAI embeddings instance (lazy initialization)
 */
export declare const defaultEmbeddings: OpenAIEmbeddings | null;
//# sourceMappingURL=openaiEmbeddings.d.ts.map