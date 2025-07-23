/**
 * Conversation Memory Store
 * 
 * Use context7: Session management and conversation history storage
 * Following All-Purpose Pattern: Works with ANY conversation types and contexts
 */

import { createEmbeddingAdapter, EmbeddingAdapter } from '../embeddings/embeddingAdapter';
import { createUpstashVectorClient, UpstashVectorClient } from '../vectordb/upstashVectorClient';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

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
  maxSessionDuration: number; // milliseconds
  maxSessionMessages: number;
  enableSemanticSearch: boolean;
  embeddingModel: string;
  sessionCleanupInterval: number;
}

/**
 * Conversation Memory Store
 * Manages conversation history with semantic search and session tracking
 */
export class ConversationMemory {
  private config: ConversationMemoryConfig;
  private embeddings: EmbeddingAdapter;
  private vectorClient: UpstashVectorClient;
  private activeSessions: Map<string, ConversationSession> = new Map();
  private sessionCleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<ConversationMemoryConfig> = {}) {
    this.config = {
      maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxSessionMessages: 1000,
      enableSemanticSearch: true,
      embeddingModel: 'text-embedding-3-small',
      sessionCleanupInterval: 60 * 60 * 1000, // 1 hour
      ...config
    };

    this.embeddings = createEmbeddingAdapter({
      sourceModel: this.config.embeddingModel
    });

    this.vectorClient = createUpstashVectorClient();

    logger.info('Conversation Memory initialized', {
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
  async startSession(projectContext: string, metadata: any = {}): Promise<string> {
    const sessionId = uuidv4();
    const session: ConversationSession = {
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
    
    logger.info('New conversation session started', {
      sessionId,
      projectContext,
      metadata
    });

    return sessionId;
  }

  /**
   * Add a message to conversation memory
   */
  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata: any = {}
  ): Promise<string> {
    const messageId = uuidv4();
    const timestamp = new Date();

    // Update session activity
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = timestamp;
      session.messageCount++;
    }

    const message: ConversationMessage = {
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
        
        logger.debug('Message stored in vector database', {
          messageId,
          sessionId,
          role,
          contentLength: content.length
        });
      } catch (error) {
        logger.error('Failed to store message in vector database', {
          messageId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('Message added to conversation memory', {
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
  async searchConversations(query: ConversationQuery): Promise<ConversationResult[]> {
    if (!this.config.enableSemanticSearch) {
      logger.warn('Semantic search disabled, returning empty results');
      return [];
    }

    logger.info('Searching conversation history', {
      query: query.query.substring(0, 100) + '...',
      sessionId: query.sessionId,
      maxResults: query.maxResults
    });

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.generateEmbedding(query.query);

      // Search for similar conversations
      const searchResults = await this.vectorClient.searchVectors(
        queryEmbedding.embedding,
        {
          topK: query.maxResults || 10,
          includeMetadata: true,
          scoreThreshold: 0.6
        }
      );

      // Filter and format results
      const conversationResults: ConversationResult[] = [];

      for (const result of searchResults) {
        const metadata = result.metadata;
        if (!metadata) continue;

        // Apply filters
        if (query.sessionId && metadata.sessionId !== query.sessionId) continue;
        if (query.roleFilter && !query.roleFilter.includes(metadata.role)) continue;
        
        // Apply time range filter
        if (query.timeRange) {
          const messageTime = new Date(metadata.timestamp);
          if (query.timeRange.start && messageTime < query.timeRange.start) continue;
          if (query.timeRange.end && messageTime > query.timeRange.end) continue;
        }

        // Exclude current session if specified
        if (!query.includeCurrentSession && this.activeSessions.has(metadata.sessionId)) continue;

        const message: ConversationMessage = {
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
        } as ConversationSession;

        conversationResults.push({
          message,
          relevanceScore: result.score,
          sessionContext: session,
          snippet: this.generateSnippet(metadata.content, query.query)
        });
      }

      logger.info('Conversation search completed', {
        resultsFound: conversationResults.length,
        query: query.query.substring(0, 50) + '...'
      });

      return conversationResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      logger.error('Conversation search failed', {
        error: error instanceof Error ? error.message : String(error),
        query: query.query.substring(0, 50) + '...'
      });
      return [];
    }
  }

  /**
   * Get conversation context for a session
   */
  async getSessionContext(sessionId: string, messageLimit: number = 10): Promise<ConversationMessage[]> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
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
  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      logger.warn('Attempted to end non-existent session', { sessionId });
      return;
    }

    this.activeSessions.delete(sessionId);
    
    logger.info('Conversation session ended', {
      sessionId,
      duration: Date.now() - session.startTime.getTime(),
      messageCount: session.messageCount
    });
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): ConversationSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

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
      logger.info('Cleaned up expired sessions', {
        expiredCount: expiredSessions.length
      });
    }
  }

  /**
   * Start session cleanup timer
   */
  private startSessionCleanup(): void {
    this.sessionCleanupTimer = setInterval(
      () => this.cleanupSessions(),
      this.config.sessionCleanupInterval
    );
  }

  /**
   * Stop session cleanup timer
   */
  stopSessionCleanup(): void {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
      this.sessionCleanupTimer = undefined;
    }
  }

  /**
   * Generate snippet from content
   */
  private generateSnippet(content: string, query: string): string {
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

    if (bestPosition > 0) snippet = '...' + snippet;
    if (bestPosition + maxLength < content.length) snippet = snippet + '...';

    return snippet.trim();
  }

  /**
   * Shutdown conversation memory
   */
  async shutdown(): Promise<void> {
    this.stopSessionCleanup();
    
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.endSession(sessionId);
    }
    
    logger.info('Conversation Memory shutdown completed');
  }
}

/**
 * Create conversation memory with default configuration
 */
export function createConversationMemory(config?: Partial<ConversationMemoryConfig>): ConversationMemory {
  return new ConversationMemory(config);
}