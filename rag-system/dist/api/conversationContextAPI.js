"use strict";
/**
 * Conversation-Aware Context API
 *
 * Use context7: Enhanced context injection with conversation memory
 * Following All-Purpose Pattern: Works with ANY conversation and documentation types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationContextAPI = void 0;
exports.createConversationContextAPI = createConversationContextAPI;
const contextAPI_1 = require("./contextAPI");
const conversationMemory_1 = require("../memory/conversationMemory");
const logger_1 = require("../utils/logger");
/**
 * Conversation-Aware Context API
 * Combines documentation context with conversation history for enhanced prompts
 */
class ConversationContextAPI {
    constructor(config = {}) {
        this.config = {
            enableConversationMemory: true,
            defaultConversationWeight: 0.3,
            maxConversationResults: 5,
            conversationContextTemplate: `# Project Context

{documentationContext}

# Conversation History

{conversationContext}

# Your Task

{originalPrompt}

Use both the project documentation and conversation history to inform your response. Follow established patterns and consider the conversation flow.`,
            ...config
        };
        this.contextAPI = (0, contextAPI_1.createContextAPI)();
        this.conversationMemory = (0, conversationMemory_1.createConversationMemory)();
        logger_1.logger.info('Conversation Context API initialized', {
            enableConversationMemory: this.config.enableConversationMemory,
            defaultConversationWeight: this.config.defaultConversationWeight
        });
    }
    /**
     * Start a new conversation session
     */
    async startSession(projectContext, metadata = {}) {
        if (!this.config.enableConversationMemory) {
            return 'disabled';
        }
        this.currentSessionId = await this.conversationMemory.startSession(projectContext, metadata);
        logger_1.logger.info('Started conversation session', { sessionId: this.currentSessionId });
        return this.currentSessionId;
    }
    /**
     * Add user message to conversation
     */
    async addUserMessage(content, metadata = {}) {
        if (!this.config.enableConversationMemory || !this.currentSessionId) {
            return '';
        }
        return this.conversationMemory.addMessage(this.currentSessionId, 'user', content, metadata);
    }
    /**
     * Add assistant message to conversation
     */
    async addAssistantMessage(content, metadata = {}) {
        if (!this.config.enableConversationMemory || !this.currentSessionId) {
            return '';
        }
        return this.conversationMemory.addMessage(this.currentSessionId, 'assistant', content, metadata);
    }
    /**
     * Search for context with conversation awareness
     */
    async searchContext(query) {
        const startTime = Date.now();
        logger_1.logger.info('Searching for conversation-aware context', {
            prompt: query.prompt.substring(0, 100) + '...',
            includeConversationHistory: query.includeConversationHistory,
            sessionId: query.sessionId
        });
        // Search documentation context
        const documentationResults = await this.contextAPI.searchContext(query);
        // Search conversation history if enabled
        let conversationResults = [];
        if (this.config.enableConversationMemory && query.includeConversationHistory) {
            const conversationQuery = {
                query: query.prompt,
                sessionId: query.sessionId || this.currentSessionId,
                maxResults: query.maxConversationResults || this.config.maxConversationResults,
                includeCurrentSession: false, // Don't include current session to avoid loops
                roleFilter: ['user', 'assistant'] // Exclude system messages
            };
            conversationResults = await this.conversationMemory.searchConversations(conversationQuery);
        }
        const searchTime = Date.now() - startTime;
        logger_1.logger.info('Conversation-aware search completed', {
            documentationResults: documentationResults.length,
            conversationResults: conversationResults.length,
            searchTime
        });
        return {
            documentationResults,
            conversationResults
        };
    }
    /**
     * Enhance prompt with both documentation and conversation context
     */
    async enhancePrompt(query) {
        const startTime = Date.now();
        logger_1.logger.info('Enhancing prompt with conversation context', {
            prompt: query.prompt.substring(0, 100) + '...',
            includeConversationHistory: query.includeConversationHistory
        });
        // Add user message to conversation if session is active
        if (this.currentSessionId && query.includeConversationHistory) {
            await this.addUserMessage(query.prompt, {
                context: 'prompt_enhancement'
            });
        }
        // Get both types of context
        const { documentationResults, conversationResults } = await this.searchContext({
            ...query,
            includeConversationHistory: query.includeConversationHistory ?? true
        });
        // Build context strings
        const documentationContext = this.buildDocumentationContext(documentationResults);
        const conversationContext = this.buildConversationContext(conversationResults);
        // Apply conversation-aware template
        let enhancedPrompt;
        if (conversationResults.length > 0) {
            enhancedPrompt = this.config.conversationContextTemplate
                .replace('{documentationContext}', documentationContext)
                .replace('{conversationContext}', conversationContext)
                .replace('{originalPrompt}', query.prompt);
        }
        else {
            // Fall back to documentation-only enhancement
            const docOnly = await this.contextAPI.enhancePrompt(query);
            enhancedPrompt = docOnly.enhancedPrompt;
        }
        const enhancementTime = Date.now() - startTime;
        const result = {
            originalPrompt: query.prompt,
            enhancedPrompt,
            contextResults: documentationResults,
            conversationResults,
            stats: {
                contextItemsFound: documentationResults.length,
                totalContextLength: documentationContext.length,
                enhancementTime
            },
            conversationStats: {
                conversationItemsFound: conversationResults.length,
                sessionContext: this.currentSessionId || 'none',
                totalConversationLength: conversationContext.length
            }
        };
        logger_1.logger.info('Conversation-aware prompt enhancement completed', {
            documentationItems: documentationResults.length,
            conversationItems: conversationResults.length,
            enhancementTime
        });
        return result;
    }
    /**
     * Add context to knowledge base (delegates to ContextAPI)
     */
    async addContext(content, metadata = {}) {
        return this.contextAPI.addContext(content, metadata);
    }
    /**
     * Get session context
     */
    async getSessionContext(sessionId) {
        if (!this.config.enableConversationMemory) {
            return null;
        }
        const targetSessionId = sessionId || this.currentSessionId;
        if (!targetSessionId) {
            return null;
        }
        return this.conversationMemory.getSessionContext(targetSessionId);
    }
    /**
     * End current session
     */
    async endSession() {
        if (this.currentSessionId && this.config.enableConversationMemory) {
            await this.conversationMemory.endSession(this.currentSessionId);
            this.currentSessionId = undefined;
        }
    }
    /**
     * Get active sessions
     */
    getActiveSessions() {
        if (!this.config.enableConversationMemory) {
            return [];
        }
        return this.conversationMemory.getActiveSessions();
    }
    /**
     * Build documentation context string
     */
    buildDocumentationContext(results) {
        if (results.length === 0) {
            return 'No relevant documentation found.';
        }
        return results.map(result => {
            const header = result.metadata.fileName
                ? `## ${result.metadata.fileName}${result.metadata.section ? ` - ${result.metadata.section}` : ''}`
                : '## Relevant Documentation';
            return `${header}\n\n${result.snippet}`;
        }).join('\n\n');
    }
    /**
     * Build conversation context string
     */
    buildConversationContext(results) {
        if (results.length === 0) {
            return 'No relevant conversation history found.';
        }
        return results.map(result => {
            const timestamp = result.message.timestamp.toLocaleString();
            const role = result.message.role.toUpperCase();
            return `### ${role} (${timestamp})\n\n${result.snippet}`;
        }).join('\n\n');
    }
    /**
     * Shutdown the conversation context API
     */
    async shutdown() {
        if (this.currentSessionId) {
            await this.endSession();
        }
        if (this.conversationMemory) {
            await this.conversationMemory.shutdown();
        }
        logger_1.logger.info('Conversation Context API shutdown completed');
    }
}
exports.ConversationContextAPI = ConversationContextAPI;
/**
 * Create conversation-aware context API with default configuration
 */
function createConversationContextAPI(config) {
    return new ConversationContextAPI(config);
}
//# sourceMappingURL=conversationContextAPI.js.map