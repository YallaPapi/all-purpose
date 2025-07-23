/**
 * Context Injection API
 *
 * Use context7: Smart prompt enhancement with relevant documentation
 * Following All-Purpose Pattern: Configurable context injection for ANY prompt types
 */
export interface ContextQuery {
    prompt: string;
    maxResults?: number;
    scoreThreshold?: number;
    contextTypes?: string[];
    includeMetadata?: boolean;
}
export interface ContextResult {
    id: string;
    content: string;
    relevanceScore: number;
    metadata: {
        fileName?: string;
        filePath?: string;
        section?: string;
        contentType?: string;
        lastModified?: Date;
    };
    snippet: string;
}
export interface EnhancedPrompt {
    originalPrompt: string;
    enhancedPrompt: string;
    contextResults: ContextResult[];
    stats: {
        contextItemsFound: number;
        totalContextLength: number;
        enhancementTime: number;
    };
}
export interface ContextConfig {
    maxContextLength: number;
    contextTemplate: string;
    enableAutoEnhancement: boolean;
    defaultMaxResults: number;
    defaultScoreThreshold: number;
}
/**
 * Context Injection API
 * Provides intelligent context enhancement for prompts
 */
export declare class ContextAPI {
    private config;
    private embeddings;
    private vectorClient;
    constructor(config?: Partial<ContextConfig>);
    /**
     * Search for relevant context based on a query
     */
    searchContext(query: ContextQuery): Promise<ContextResult[]>;
    /**
     * Enhance a prompt with relevant context
     */
    enhancePrompt(query: ContextQuery): Promise<EnhancedPrompt>;
    /**
     * Add context to the knowledge base
     */
    addContext(content: string, metadata?: {
        fileName?: string;
        filePath?: string;
        section?: string;
        contentType?: string;
        title?: string;
    }): Promise<boolean>;
    /**
     * Build context string from results
     */
    private buildContextString;
    /**
     * Format a single context item
     */
    private formatContextItem;
    /**
     * Generate a snippet from content
     */
    private generateSnippet;
    /**
     * Generate unique ID for context
     */
    private generateContextId;
    /**
     * Get current configuration
     */
    getConfig(): ContextConfig;
}
/**
 * Create context API with default configuration
 */
export declare function createContextAPI(config?: Partial<ContextConfig>): ContextAPI;
/**
 * Quick helper functions for common operations
 */
export declare const contextHelpers: {
    /**
     * Quick context search
     */
    search(prompt: string, maxResults?: number): Promise<ContextResult[]>;
    /**
     * Quick prompt enhancement
     */
    enhance(prompt: string, maxResults?: number): Promise<string>;
    /**
     * Add documentation
     */
    addDoc(content: string, fileName: string, section?: string): Promise<boolean>;
};
//# sourceMappingURL=contextAPI.d.ts.map