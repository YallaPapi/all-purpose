/**
 * Embedding Adapter
 *
 * Adapts OpenAI embeddings to match vector database dimensions
 * Following All-Purpose Pattern: Configurable for ANY dimension requirements
 */
export interface AdapterConfig {
    targetDimension: number;
    sourceModel: string;
    adaptationMethod: 'truncate' | 'pad' | 'normalize';
    preserveNorm: boolean;
}
export interface AdaptedEmbeddingResult {
    text: string;
    embedding: number[];
    originalDimension: number;
    targetDimension: number;
    adaptationMethod: string;
    tokens: number;
    model: string;
}
/**
 * Embedding Adapter Service
 * Converts embeddings to match vector database requirements
 */
export declare class EmbeddingAdapter {
    private config;
    private openaiEmbeddings;
    constructor(config?: Partial<AdapterConfig>);
    /**
     * Generate adapted embedding for a single text
     */
    generateEmbedding(text: string): Promise<AdaptedEmbeddingResult>;
    /**
     * Generate adapted embeddings for multiple texts
     */
    generateEmbeddings(texts: string[]): Promise<{
        results: AdaptedEmbeddingResult[];
        totalTokens: number;
        totalCost: number;
    }>;
    /**
     * Adapt a single embedding vector to target dimensions
     */
    private adaptEmbedding;
    /**
     * Truncate embedding to target dimension (keep first N dimensions)
     */
    private truncateEmbedding;
    /**
     * Pad embedding to target dimension (add zeros)
     */
    private padEmbedding;
    /**
     * Normalize embedding by averaging into target dimension
     */
    private normalizeEmbedding;
    /**
     * Preserve the L2 norm of the original embedding
     */
    private preserveL2Norm;
    /**
     * Get embedding dimension for current configuration
     */
    getEmbeddingDimension(): number;
    /**
     * Validate that an embedding matches target dimension
     */
    validateEmbedding(embedding: number[]): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Get current configuration
     */
    getConfig(): AdapterConfig;
}
/**
 * Create embedding adapter with default configuration
 */
export declare function createEmbeddingAdapter(config?: Partial<AdapterConfig>): EmbeddingAdapter;
/**
 * Default embedding adapter for current vector database (lazy initialization)
 */
export declare const defaultEmbeddingAdapter: EmbeddingAdapter | null;
//# sourceMappingURL=embeddingAdapter.d.ts.map