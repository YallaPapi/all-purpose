/**
 * Conversation Memory Store
 *
 * Use context7: Session management and conversation history storage
 * Following All-Purpose Pattern: Works with ANY conversation types and contexts
 */
export interface ConversationMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    sessionId: string;
    metadata?: {
        taskId?: string;
        command?: string;
        context?: string;
        tokens?: number;
    };
}
export interface ConversationSession {
    id: string;
    userId?: string;
    projectContext: string;
    startTime: Date;
    lastActivity: Date;
    messageCount: number;
    metadata: {
        projectName?: string;
        taskContext?: string;
        userIntent?: string;
    };
}
export interface ConversationQuery {
    query: string;
    sessionId?: string;
    maxResults?: number;
    timeRange?: {
        start?: Date;
        end?: Date;
    };
    includeCurrentSession?: boolean;
    roleFilter?: ('user' | 'assistant' | 'system')[];
}
export interface ConversationResult {
    message: ConversationMessage;
    relevanceScore: number;
    sessionContext: ConversationSession;
    snippet: string;
}
export interface ConversationMemoryConfig {
    maxSessionDuration: number;
    maxSessionMessages: number;
    enableSemanticSearch: boolean;
    embeddingModel: string;
    sessionCleanupInterval: number;
}
/**
 * Conversation Memory Store
 * Manages conversation history with semantic search and session tracking
 */
export declare class ConversationMemory {
    private config;
    private embeddings;
    private vectorClient;
    private activeSessions;
    private sessionCleanupTimer?;
    constructor(config?: Partial<ConversationMemoryConfig>);
    /**
     * Start a new conversation session
     */
    startSession(projectContext: string, metadata?: any): Promise<string>;
    /**
     * Add a message to conversation memory
     */
    addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: any): Promise<string>;
    /**
     * Search conversation history
     */
    searchConversations(query: ConversationQuery): Promise<ConversationResult[]>;
    /**
     * Get conversation context for a session
     */
    getSessionContext(sessionId: string, messageLimit?: number): Promise<ConversationMessage[]>;
    /**
     * End a conversation session
     */
    endSession(sessionId: string): Promise<void>;
    /**
     * Get active sessions
     */
    getActiveSessions(): ConversationSession[];
    /**
     * Clean up expired sessions
     */
    private cleanupSessions;
    /**
     * Start session cleanup timer
     */
    private startSessionCleanup;
    /**
     * Stop session cleanup timer
     */
    stopSessionCleanup(): void;
    /**
     * Generate snippet from content
     */
    private generateSnippet;
    /**
     * Shutdown conversation memory
     */
    shutdown(): Promise<void>;
}
/**
 * Create conversation memory with default configuration
 */
export declare function createConversationMemory(config?: Partial<ConversationMemoryConfig>): ConversationMemory;
//# sourceMappingURL=conversationMemory.d.ts.map