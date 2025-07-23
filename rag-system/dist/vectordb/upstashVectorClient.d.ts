/**
 * Upstash Vector Database Client
 *
 * Vercel-native vector database client using Upstash Vector
 * Following All-Purpose Pattern: NO hardcoded limitations on collection types
 * Aligned with main project's Vercel-native architecture
 */
export interface UpstashVectorConfig {
    url: string;
    token: string;
}
export interface VectorPoint {
    id: string;
    vector: number[];
    metadata?: Record<string, any>;
}
export interface SearchResult {
    id: string;
    score: number;
    metadata?: Record<string, any>;
    vector?: number[];
}
export interface SearchOptions {
    topK?: number;
    filter?: string;
    includeMetadata?: boolean;
    includeVectors?: boolean;
    scoreThreshold?: number;
}
/**
 * Upstash Vector Database Client
 * Provides comprehensive vector operations for RAG system on Vercel
 */
export declare class UpstashVectorClient {
    private index;
    private config;
    constructor(config: UpstashVectorConfig);
    /**
     * Check if Upstash Vector service is healthy and accessible
     */
    healthCheck(): Promise<boolean>;
    /**
     * Insert or update vectors
     */
    upsertVectors(points: VectorPoint[]): Promise<boolean>;
    /**
     * Search for similar vectors
     */
    searchVectors(queryVector: number[], options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Delete vectors by IDs
     */
    deleteVectors(vectorIds: string[]): Promise<boolean>;
    /**
     * Get index statistics
     */
    getIndexStats(): Promise<any>;
    /**
     * Reset the entire index (delete all vectors)
     */
    resetIndex(): Promise<boolean>;
}
/**
 * Create an Upstash Vector client instance with default configuration
 */
export declare function createUpstashVectorClient(config?: Partial<UpstashVectorConfig>): UpstashVectorClient;
/**
 * Default Upstash Vector client instance (lazy initialization)
 */
export declare const defaultUpstashVectorClient: UpstashVectorClient | null;
//# sourceMappingURL=upstashVectorClient.d.ts.map