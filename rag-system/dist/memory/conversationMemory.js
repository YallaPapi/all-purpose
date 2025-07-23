"use strict";
/**
 * Conversation Memory Store
 *
 * Use context7: Session management and conversation history storage
 * Following All-Purpose Pattern: Works with ANY conversation types and contexts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationMemory = void 0;
exports.createConversationMemory = createConversationMemory;
const embeddingAdapter_1 = require("../embeddings/embeddingAdapter");
const upstashVectorClient_1 = require("../vectordb/upstashVectorClient");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
/**
 * Conversation Memory Store
 * Manages conversation history with semantic search and session tracking
 */
class ConversationMemory {
    constructor(config = {}) {
        this.activeSessions = new Map();
        this.config = {
            maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
            maxSessionMessages: 1000,
            enableSemanticSearch: true,
            embeddingModel: 'text-embedding-3-small',
            sessionCleanupInterval: 60 * 60 * 1000, // 1 hour
            ...config
        };
        this.embeddings = (0, embeddingAdapter_1.createEmbeddingAdapter)({
            sourceModel: this.config.embeddingModel
        });
        this.vectorClient = (0, upstashVectorClient_1.createUpstashVectorClient)();
        logger_1.logger.info('Conversation Memory initialized', {
            maxSessionDuration: this.config.maxSessionDuration,
            maxSessionMessages: this.config.maxSessionMessages,
            enableSemanticSearch: this.config.enableSemanticSearch
        });
        // Start session cleanup timer
        this.startSessionCleanup();
    }
    /**
     * Start a new conversation session
     */
    async startSession(projectContext, metadata = {}) {
        const sessionId = (0, uuid_1.v4)();
        const session = {
            id: sessionId,
            projectContext,
            startTime: new Date(),
            lastActivity: new Date(),
            messageCount: 0,
            metadata: {
                projectName: metadata.projectName,
                taskContext: metadata.taskContext,
                userIntent: metadata.userIntent
            }
        };
        this.activeSessions.set(sessionId, session);
        logger_1.logger.info('New conversation session started', {
            sessionId,
            projectContext,
            metadata
        });
        return sessionId;
    }
    /**
     * Add a message to conversation memory
     */
    async addMessage(sessionId, role, content, metadata = {}) {
        const messageId = (0, uuid_1.v4)();
        const timestamp = new Date();
        // Update session activity
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.lastActivity = timestamp;
            session.messageCount++;
        }
        const message = {
            id: messageId,
            role,
            content,
            timestamp,
            sessionId,
            metadata: {
                taskId: metadata.taskId,
                command: metadata.command,
                context: metadata.context,
                tokens: metadata.tokens
            }
        };
        // Store in vector database if semantic search is enabled
        if (this.config.enableSemanticSearch && content.length > 10) {
            try {
                const embedding = await this.embeddings.generateEmbedding(content);
                const vectorPoint = {
                    id: `msg-${messageId}`,
                    vector: embedding.embedding,
                    metadata: {
                        messageId,
                        role,
                        content,
                        timestamp: timestamp.toISOString(),
                        sessionId,
                        projectContext: session?.projectContext || '',
                        ...metadata
                    }
                };
                await this.vectorClient.upsertVectors([vectorPoint]);
                logger_1.logger.debug('Message stored in vector database', {
                    messageId,
                    sessionId,
                    role,
                    contentLength: content.length
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to store message in vector database', {
                    messageId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        logger_1.logger.info('Message added to conversation memory', {
            messageId,
            sessionId,
            role,
            contentLength: content.length
        });
        return messageId;
    }
    /**
     * Search conversation history
     */
    async searchConversations(query) {
        if (!this.config.enableSemanticSearch) {
            logger_1.logger.warn('Semantic search disabled, returning empty results');
            return [];
        }
        logger_1.logger.info('Searching conversation history', {
            query: query.query.substring(0, 100) + '...',
            sessionId: query.sessionId,
            maxResults: query.maxResults
        });
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.embeddings.generateEmbedding(query.query);
            // Search for similar conversations
            const searchResults = await this.vectorClient.searchVectors(queryEmbedding.embedding, {
                topK: query.maxResults || 10,
                includeMetadata: true,
                scoreThreshold: 0.6
            });
            // Filter and format results
            const conversationResults = [];
            for (const result of searchResults) {
                const metadata = result.metadata;
                if (!metadata)
                    continue;
                // Apply filters
                if (query.sessionId && metadata.sessionId !== query.sessionId)
                    continue;
                if (query.roleFilter && !query.roleFilter.includes(metadata.role))
                    continue;
                // Apply time range filter
                if (query.timeRange) {
                    const messageTime = new Date(metadata.timestamp);
                    if (query.timeRange.start && messageTime < query.timeRange.start)
                        continue;
                    if (query.timeRange.end && messageTime > query.timeRange.end)
                        continue;
                }
                // Exclude current session if specified
                if (!query.includeCurrentSession && this.activeSessions.has(metadata.sessionId))
                    continue;
                const message = {
                    id: metadata.messageId,
                    role: metadata.role,
                    content: metadata.content,
                    timestamp: new Date(metadata.timestamp),
                    sessionId: metadata.sessionId,
                    metadata: {
                        taskId: metadata.taskId,
                        command: metadata.command,
                        context: metadata.context,
                        tokens: metadata.tokens
                    }
                };
                const session = this.activeSessions.get(metadata.sessionId) || {
                    id: metadata.sessionId,
                    projectContext: metadata.projectContext || '',
                    startTime: new Date(metadata.timestamp),
                    lastActivity: new Date(metadata.timestamp),
                    messageCount: 1,
                    metadata: {}
                };
                conversationResults.push({
                    message,
                    relevanceScore: result.score,
                    sessionContext: session,
                    snippet: this.generateSnippet(metadata.content, query.query)
                });
            }
            logger_1.logger.info('Conversation search completed', {
                resultsFound: conversationResults.length,
                query: query.query.substring(0, 50) + '...'
            });
            return conversationResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
        catch (error) {
            logger_1.logger.error('Conversation search failed', {
                error: error instanceof Error ? error.message : String(error),
                query: query.query.substring(0, 50) + '...'
            });
            return [];
        }
    }
    /**
     * Get conversation context for a session
     */
    async getSessionContext(sessionId, messageLimit = 10) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            logger_1.logger.warn('Session not found', { sessionId });
            return [];
        }
        // For now, return recent messages via search
        // In a full implementation, you'd maintain session message history
        const results = await this.searchConversations({
            query: session.projectContext,
            sessionId,
            maxResults: messageLimit,
            includeCurrentSession: true
        });
        return results
            .map(r => r.message)
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    /**
     * End a conversation session
     */
    async endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            logger_1.logger.warn('Attempted to end non-existent session', { sessionId });
            return;
        }
        this.activeSessions.delete(sessionId);
        logger_1.logger.info('Conversation session ended', {
            sessionId,
            duration: Date.now() - session.startTime.getTime(),
            messageCount: session.messageCount
        });
    }
    /**
     * Get active sessions
     */
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    /**
     * Clean up expired sessions
     */
    async cleanupSessions() {
        const now = Date.now();
        const expiredSessions = [];
        for (const [sessionId, session] of this.activeSessions) {
            const sessionAge = now - session.lastActivity.getTime();
            if (sessionAge > this.config.maxSessionDuration ||
                session.messageCount > this.config.maxSessionMessages) {
                expiredSessions.push(sessionId);
            }
        }
        for (const sessionId of expiredSessions) {
            await this.endSession(sessionId);
        }
        if (expiredSessions.length > 0) {
            logger_1.logger.info('Cleaned up expired sessions', {
                expiredCount: expiredSessions.length
            });
        }
    }
    /**
     * Start session cleanup timer
     */
    startSessionCleanup() {
        this.sessionCleanupTimer = setInterval(() => this.cleanupSessions(), this.config.sessionCleanupInterval);
    }
    /**
     * Stop session cleanup timer
     */
    stopSessionCleanup() {
        if (this.sessionCleanupTimer) {
            clearInterval(this.sessionCleanupTimer);
            this.sessionCleanupTimer = undefined;
        }
    }
    /**
     * Generate snippet from content
     */
    generateSnippet(content, query) {
        const maxLength = 200;
        if (content.length <= maxLength) {
            return content;
        }
        // Try to find relevant section
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        let bestPosition = 0;
        let bestScore = 0;
        for (let i = 0; i <= content.length - maxLength; i += 50) {
            const window = content.slice(i, i + maxLength).toLowerCase();
            const score = queryWords.reduce((sum, word) => {
                return sum + (window.includes(word) ? 1 : 0);
            }, 0);
            if (score > bestScore) {
                bestScore = score;
                bestPosition = i;
            }
        }
        let snippet = content.slice(bestPosition, bestPosition + maxLength);
        // Try to end at word boundary
        const lastSpace = snippet.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.7) {
            snippet = snippet.slice(0, lastSpace);
        }
        if (bestPosition > 0)
            snippet = '...' + snippet;
        if (bestPosition + maxLength < content.length)
            snippet = snippet + '...';
        return snippet.trim();
    }
    /**
     * Shutdown conversation memory
     */
    async shutdown() {
        this.stopSessionCleanup();
        // End all active sessions
        for (const sessionId of this.activeSessions.keys()) {
            await this.endSession(sessionId);
        }
        logger_1.logger.info('Conversation Memory shutdown completed');
    }
}
exports.ConversationMemory = ConversationMemory;
/**
 * Create conversation memory with default configuration
 */
function createConversationMemory(config) {
    return new ConversationMemory(config);
}
//# sourceMappingURL=conversationMemory.js.map