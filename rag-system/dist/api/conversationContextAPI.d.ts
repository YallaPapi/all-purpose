/**
 * Conversation-Aware Context API
 *
 * Use context7: Enhanced context injection with conversation memory
 * Following All-Purpose Pattern: Works with ANY conversation and documentation types
 */
import { ContextQuery, ContextResult, EnhancedPrompt } from './contextAPI';
import { ConversationResult } from '../memory/conversationMemory';
export interface ConversationContextQuery extends ContextQuery {
    sessionId?: string;
    includeConversationHistory?: boolean;
    conversationWeight?: number;
    maxConversationResults?: number;
}
export interface ConversationEnhancedPrompt extends EnhancedPrompt {
    conversationResults: ConversationResult[];
    conversationStats: {
        conversationItemsFound: number;
        sessionContext: string;
        totalConversationLength: number;
    };
}
export interface ConversationContextConfig {
    enableConversationMemory: boolean;
    defaultConversationWeight: number;
    maxConversationResults: number;
    conversationContextTemplate: string;
}
/**
 * Conversation-Aware Context API
 * Combines documentation context with conversation history for enhanced prompts
 */
export declare class ConversationContextAPI {
    private contextAPI;
    private conversationMemory;
    private config;
    private currentSessionId?;
    constructor(config?: Partial<ConversationContextConfig>);
    /**
     * Start a new conversation session
     */
    startSession(projectContext: string, metadata?: any): Promise<string>;
    /**
     * Add user message to conversation
     */
    addUserMessage(content: string, metadata?: any): Promise<string>;
    /**
     * Add assistant message to conversation
     */
    addAssistantMessage(content: string, metadata?: any): Promise<string>;
    /**
     * Search for context with conversation awareness
     */
    searchContext(query: ConversationContextQuery): Promise<{
        documentationResults: ContextResult[];
        conversationResults: ConversationResult[];
    }>;
    /**
     * Enhance prompt with both documentation and conversation context
     */
    enhancePrompt(query: ConversationContextQuery): Promise<ConversationEnhancedPrompt>;
    /**
     * Add context to knowledge base (delegates to ContextAPI)
     */
    addContext(content: string, metadata?: any): Promise<boolean>;
    /**
     * Get session context
     */
    getSessionContext(sessionId?: string): Promise<any>;
    /**
     * End current session
     */
    endSession(): Promise<void>;
    /**
     * Get active sessions
     */
    getActiveSessions(): any[];
    /**
     * Build documentation context string
     */
    private buildDocumentationContext;
    /**
     * Build conversation context string
     */
    private buildConversationContext;
    /**
     * Shutdown the conversation context API
     */
    shutdown(): Promise<void>;
}
/**
 * Create conversation-aware context API with default configuration
 */
export declare function createConversationContextAPI(config?: Partial<ConversationContextConfig>): ConversationContextAPI;
//# sourceMappingURL=conversationContextAPI.d.ts.map