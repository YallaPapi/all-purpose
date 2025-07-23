/**
 * Semantic Search API
 *
 * Use context7: Advanced semantic search with context ranking and query enhancement
 * Following All-Purpose Pattern: Configurable search for ANY documentation types
 */
export interface SearchConfig {
    maxResults: number;
    scoreThreshold: number;
    enableQueryExpansion: boolean;
    enableContextRanking: boolean;
    enableRecencyBoost: boolean;
    recencyDecayDays: number;
    contextWeights: {
        relevance: number;
        recency: number;
        fileType: number;
        section: number;
    };
}
export interface SearchQuery {
    query: string;
    filters?: {
        fileType?: string[];
        filePath?: string[];
        language?: string[];
        dateRange?: {
            start?: Date;
            end?: Date;
        };
        contentType?: string[];
    };
    options?: {
        maxResults?: number;
        scoreThreshold?: number;
        includeMetadata?: boolean;
        includeContent?: boolean;
        expandQuery?: boolean;
    };
}
export interface EnhancedSearchResult {
    id: string;
    content: string;
    relevanceScore: number;
    contextScore: number;
    finalScore: number;
    metadata: {
        filePath: string;
        fileName: string;
        fileType: string;
        chunkIndex: number;
        totalChunks: number;
        lastModified: Date;
        language?: string;
        section?: string;
        title?: string;
        contentType?: string;
    };
    snippet: string;
    highlights: string[];
    rank: number;
}
export interface SearchResponse {
    results: EnhancedSearchResult[];
    query: {
        original: string;
        expanded?: string[];
        processed: string;
    };
    stats: {
        totalResults: number;
        searchTime: number;
        processingTime: number;
        embeddingTime: number;
    };
    suggestions?: string[];
}
/**
 * Advanced Semantic Search Service
 * Provides intelligent document retrieval with context-aware ranking
 */
export declare class SemanticSearchAPI {
    private config;
    private embeddings;
    private vectorClient;
    constructor(config?: Partial<SearchConfig>);
    /**
     * Perform semantic search with advanced ranking
     */
    search(searchQuery: SearchQuery): Promise<SearchResponse>;
    /**
     * Process and enhance the search query
     */
    private processQuery;
    /**
     * Expand query with related terms and concepts
     */
    private expandQuery;
    /**
     * Apply search filters to results
     */
    private applyFilters;
    /**
     * Rank results using multiple factors
     */
    private rankResults;
    /**
     * Get file type priority for ranking
     */
    private getFileTypePriority;
    /**
     * Get section priority for ranking
     */
    private getSectionPriority;
    /**
     * Enhance search results with snippets and highlights
     */
    private enhanceResults;
    /**
     * Extract meaningful terms from query
     */
    private extractQueryTerms;
    /**
     * Generate content snippet with context
     */
    private generateSnippet;
    /**
     * Find highlighted terms in content
     */
    private findHighlights;
    /**
     * Generate search suggestions for poor results
     */
    private generateSuggestions;
    /**
     * Simple string similarity calculation
     */
    private calculateSimilarity;
    /**
     * Get current configuration
     */
    getConfig(): SearchConfig;
}
/**
 * Create semantic search API with default configuration
 */
export declare function createSemanticSearchAPI(config?: Partial<SearchConfig>): SemanticSearchAPI;
//# sourceMappingURL=searchAPI.d.ts.map