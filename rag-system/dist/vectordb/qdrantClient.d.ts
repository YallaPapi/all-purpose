/**
 * Qdrant Vector Database Client
 *
 * Central client for interacting with Qdrant vector database
 * Following All-Purpose Pattern: NO hardcoded limitations on collection types
 * Based on TaskMaster research findings for optimal RAG implementation
 */
export interface QdrantConfig {
    url: string;
    port?: number;
    apiKey?: string;
}
export interface CollectionConfig {
    name: string;
    vectorSize: number;
    distance: 'Cosine' | 'Euclid' | 'Dot';
    description?: string;
}
export interface VectorPoint {
    id: string | number;
    vector: number[];
    payload?: Record<string, any>;
}
export interface SearchResult {
    id: string | number;
    score: number;
    payload?: Record<string, any>;
    vector?: number[];
}
export interface SearchOptions {
    limit?: number;
    filter?: any;
    withPayload?: boolean;
    withVector?: boolean;
    scoreThreshold?: number;
}
/**
 * Qdrant Vector Database Client
 * Provides comprehensive vector operations for RAG system
 */
export declare class QdrantVectorClient {
    private client;
    private config;
    private healthCheckInterval?;
    constructor(config: QdrantConfig);
    /**
     * Check if Qdrant server is healthy and accessible
     */
    healthCheck(): Promise<boolean>;
    /**
     * Start periodic health monitoring
     */
    startHealthMonitoring(intervalMs?: number): void;
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring(): void;
    /**
     * Create a collection with specified configuration
     */
    createCollection(config: CollectionConfig): Promise<boolean>;
    /**
     * Check if a collection exists
     */
    collectionExists(collectionName: string): Promise<boolean>;
    /**
     * Get collection information
     */
    getCollectionInfo(collectionName: string): Promise<any>;
    /**
     * Insert or update vectors in a collection
     */
    upsertVectors(collectionName: string, points: VectorPoint[]): Promise<boolean>;
    /**
     * Search for similar vectors
     */
    searchVectors(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Delete vectors by IDs
     */
    deleteVectors(collectionName: string, vectorIds: (string | number)[]): Promise<boolean>;
    /**
     * Get collection statistics
     */
    getCollectionStats(collectionName: string): Promise<any>;
    /**
     * Initialize standard collections for RAG system
     */
    initializeRAGCollections(): Promise<boolean>;
    /**
     * Get all collection names
     */
    getAllCollections(): Promise<string[]>;
    /**
     * Close the client connection
     */
    close(): Promise<void>;
}
/**
 * Create a Qdrant client instance with default configuration
 */
export declare function createQdrantClient(config?: Partial<QdrantConfig>): QdrantVectorClient;
/**
 * Default Qdrant client instance
 */
export declare const defaultQdrantClient: QdrantVectorClient;
//# sourceMappingURL=qdrantClient.d.ts.map