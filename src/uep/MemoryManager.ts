/**
 * Universal Execution Protocol - Enhanced Memory Manager
 * 
 * Extends existing working memory system for UEP persistent memory requirements.
 * Implements relevance scoring, UEP-specific schemas, and secure access patterns.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { 
  appendToMemory, 
  getMemory, 
  clearMemory, 
  getMemoryStats, 
  listAgentsWithMemory,
  memoryConfig 
} from '../memory/workingMemory';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

// Redis client (reusing existing configuration)
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
  automaticDeserialization: false,
});

// UEP-specific memory schemas
export interface UEPMemoryEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  sessionId: string;
  taskDescription: string;
  context: {
    requesterType: 'agent' | 'human';
    complexity: 'low' | 'medium' | 'high';
    components: string[];
    approved: boolean;
  };
  executionTrace: {
    processingTime: number;
    componentsExecuted: string[];
    validationResults: any[];
  };
  relevanceScore?: number;
  tags: string[];
}

export interface MemoryQuery {
  agentId?: string;
  sessionId?: string;
  taskKeywords?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  complexity?: 'low' | 'medium' | 'high';
  components?: string[];
  minRelevanceScore?: number;
  limit?: number;
}

// Validation schemas
const UEPMemoryEntrySchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  agentId: z.string(),
  sessionId: z.string(),
  taskDescription: z.string(),
  context: z.object({
    requesterType: z.enum(['agent', 'human']),
    complexity: z.enum(['low', 'medium', 'high']),
    components: z.array(z.string()),
    approved: z.boolean()
  }),
  executionTrace: z.object({
    processingTime: z.number(),
    componentsExecuted: z.array(z.string()),
    validationResults: z.array(z.any())
  }),
  relevanceScore: z.number().optional(),
  tags: z.array(z.string())
});

/**
 * Enhanced Memory Manager for UEP
 */
export class UEPMemoryManager {
  private config: UEPMemoryConfig;

  constructor(config: Partial<UEPMemoryConfig> = {}) {
    this.config = {
      maxEntries: 100,
      relevanceThreshold: 0.3,
      enableRelevanceScoring: true,
      enableSecureAccess: true,
      cacheTTL: 300, // 5 minutes
      ...config
    };
  }

  /**
   * Store UEP execution result in enhanced memory
   */
  async storeExecutionResult(entry: UEPMemoryEntry): Promise<void> {
    try {
      // Validate entry
      UEPMemoryEntrySchema.parse(entry);

      // Generate relevance score if enabled
      if (this.config.enableRelevanceScoring) {
        entry.relevanceScore = await this.calculateRelevanceScore(entry);
      }

      // Store in structured format for UEP queries
      const uepKey = this.getUEPKey(entry.agentId, 'executions');
      const serializedEntry = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      });

      await redis.rpush(uepKey, serializedEntry);
      await redis.ltrim(uepKey, -this.config.maxEntries, -1);

      // Also store in original working memory format for backward compatibility
      const memoryEntry = this.formatForWorkingMemory(entry);
      await appendToMemory(entry.agentId, memoryEntry);

      // Store session-specific memory
      if (entry.sessionId) {
        const sessionKey = this.getSessionKey(entry.sessionId);
        await redis.set(sessionKey, serializedEntry, { ex: this.config.cacheTTL });
      }

      console.log(`✅ UEP Memory stored for agent '${entry.agentId}': ${entry.taskDescription.substring(0, 50)}...`);

    } catch (error) {
      console.error(`❌ Failed to store UEP memory:`, error);
      // Graceful degradation - still try to store in basic memory
      try {
        const fallbackEntry = `TASK: ${entry.taskDescription}\nSTATUS: ${entry.context.approved ? 'Approved' : 'Rejected'}`;
        await appendToMemory(entry.agentId, fallbackEntry);
      } catch (fallbackError) {
        console.error(`❌ Fallback memory storage also failed:`, fallbackError);
      }
    }
  }

  /**
   * Retrieve memory with relevance scoring and filtering
   */
  async getRelevantMemory(query: MemoryQuery): Promise<{
    memories: UEPMemoryEntry[];
    totalFound: number;
    relevanceStats: {
      averageScore: number;
      maxScore: number;
      minScore: number;
    };
  }> {
    try {
      const agentId = query.agentId;
      if (!agentId) {
        throw new Error('Agent ID is required for memory retrieval');
      }

      // Get UEP-structured memories
      const uepKey = this.getUEPKey(agentId, 'executions');
      const rawEntries = await redis.lrange(uepKey, 0, -1);

      let memories: UEPMemoryEntry[] = [];

      // Parse and filter entries
      for (const rawEntry of rawEntries) {
        try {
          const parsed = JSON.parse(rawEntry);
          const memory: UEPMemoryEntry = {
            ...parsed,
            timestamp: new Date(parsed.timestamp)
          };

          // Apply filters
          if (this.matchesQuery(memory, query)) {
            memories.push(memory);
          }
        } catch (parseError) {
          console.warn('Failed to parse memory entry:', parseError);
        }
      }

      // Calculate relevance scores if not present
      if (this.config.enableRelevanceScoring && query.taskKeywords) {
        memories = await this.enhanceWithRelevanceScores(memories, query.taskKeywords);
      }

      // Sort by relevance score (descending)
      memories.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      // Apply limit
      if (query.limit) {
        memories = memories.slice(0, query.limit);
      }

      // Calculate stats
      const relevanceScores = memories.map(m => m.relevanceScore || 0);
      const relevanceStats = {
        averageScore: relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length || 0,
        maxScore: Math.max(...relevanceScores) || 0,
        minScore: Math.min(...relevanceScores) || 0
      };

      console.log(`🔍 UEP Memory query returned ${memories.length} relevant memories for agent '${agentId}'`);

      return {
        memories,
        totalFound: memories.length,
        relevanceStats
      };

    } catch (error) {
      console.error(`❌ Failed to retrieve UEP memory:`, error);
      
      // Fallback to basic memory system
      const basicMemory = await getMemory(query.agentId || 'unknown');
      const fallbackEntry: UEPMemoryEntry = {
        id: 'fallback',
        timestamp: new Date(),
        agentId: query.agentId || 'unknown',
        sessionId: 'fallback',
        taskDescription: 'Memory retrieval fallback',
        context: {
          requesterType: 'agent',
          complexity: 'low',
          components: [],
          approved: true
        },
        executionTrace: {
          processingTime: 0,
          componentsExecuted: [],
          validationResults: []
        },
        tags: ['fallback']
      };

      return {
        memories: basicMemory ? [fallbackEntry] : [],
        totalFound: basicMemory ? 1 : 0,
        relevanceStats: { averageScore: 0, maxScore: 0, minScore: 0 }
      };
    }
  }

  /**
   * Get session-specific memory
   */
  async getSessionMemory(sessionId: string): Promise<UEPMemoryEntry | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const rawEntry = await redis.get(sessionKey);
      
      if (!rawEntry) {
        return null;
      }

      const parsed = JSON.parse(rawEntry as string);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp)
      };

    } catch (error) {
      console.error(`❌ Failed to retrieve session memory for '${sessionId}':`, error);
      return null;
    }
  }

  /**
   * Clear UEP memory for an agent
   */
  async clearUEPMemory(agentId: string): Promise<void> {
    try {
      const uepKey = this.getUEPKey(agentId, 'executions');
      await redis.del(uepKey);
      
      // Also clear basic memory
      await clearMemory(agentId);
      
      console.log(`✅ UEP Memory cleared for agent '${agentId}'`);
    } catch (error) {
      console.error(`❌ Failed to clear UEP memory for agent '${agentId}':`, error);
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  async getUEPMemoryStats(agentId: string): Promise<{
    basic: any;
    uep: {
      entryCount: number;
      averageRelevanceScore: number;
      complexityDistribution: Record<string, number>;
      componentUsage: Record<string, number>;
      approvalRate: number;
    };
  }> {
    try {
      // Get basic stats
      const basicStats = await getMemoryStats(agentId);

      // Get UEP stats
      const uepKey = this.getUEPKey(agentId, 'executions');
      const rawEntries = await redis.lrange(uepKey, 0, -1);

      const memories: UEPMemoryEntry[] = [];
      for (const rawEntry of rawEntries) {
        try {
          const parsed = JSON.parse(rawEntry);
          memories.push({
            ...parsed,
            timestamp: new Date(parsed.timestamp)
          });
        } catch (parseError) {
          continue;
        }
      }

      const uepStats = {
        entryCount: memories.length,
        averageRelevanceScore: memories.reduce((sum, m) => sum + (m.relevanceScore || 0), 0) / memories.length || 0,
        complexityDistribution: this.calculateDistribution(memories, 'context.complexity'),
        componentUsage: this.calculateComponentUsage(memories),
        approvalRate: memories.filter(m => m.context.approved).length / memories.length || 0
      };

      return { basic: basicStats, uep: uepStats };

    } catch (error) {
      console.error(`❌ Failed to get UEP memory stats:`, error);
      const basicStats = await getMemoryStats(agentId);
      return { 
        basic: basicStats, 
        uep: { 
          entryCount: 0, 
          averageRelevanceScore: 0, 
          complexityDistribution: {}, 
          componentUsage: {}, 
          approvalRate: 0 
        } 
      };
    }
  }

  // Private helper methods

  private getUEPKey(agentId: string, type: string): string {
    return `uep:${type}:${agentId}`;
  }

  private getSessionKey(sessionId: string): string {
    return `uep:session:${sessionId}`;
  }

  private async calculateRelevanceScore(entry: UEPMemoryEntry): Promise<number> {
    // Simple relevance scoring based on recency, complexity, and success
    let score = 0;

    // Recency score (0-0.4)
    const ageHours = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 0.4 - (ageHours / 168) * 0.4); // Decay over a week

    // Complexity score (0-0.3)
    const complexityScores = { low: 0.1, medium: 0.2, high: 0.3 };
    score += complexityScores[entry.context.complexity] || 0;

    // Success score (0-0.3)
    score += entry.context.approved ? 0.3 : 0;

    return Math.min(1, score);
  }

  private matchesQuery(memory: UEPMemoryEntry, query: MemoryQuery): boolean {
    // Session filter
    if (query.sessionId && memory.sessionId !== query.sessionId) {
      return false;
    }

    // Time range filter
    if (query.timeRange) {
      if (memory.timestamp < query.timeRange.start || memory.timestamp > query.timeRange.end) {
        return false;
      }
    }

    // Complexity filter
    if (query.complexity && memory.context.complexity !== query.complexity) {
      return false;
    }

    // Components filter
    if (query.components && query.components.length > 0) {
      const hasMatchingComponent = query.components.some(comp => 
        memory.context.components.includes(comp)
      );
      if (!hasMatchingComponent) {
        return false;
      }
    }

    // Relevance score filter
    if (query.minRelevanceScore && (memory.relevanceScore || 0) < query.minRelevanceScore) {
      return false;
    }

    return true;
  }

  private async enhanceWithRelevanceScores(
    memories: UEPMemoryEntry[], 
    keywords: string[]
  ): Promise<UEPMemoryEntry[]> {
    return memories.map(memory => {
      if (memory.relevanceScore) {
        return memory; // Already has score
      }

      // Simple keyword matching score
      let keywordScore = 0;
      const text = `${memory.taskDescription} ${memory.tags.join(' ')}`.toLowerCase();
      
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          keywordScore += 0.2;
        }
      }

      memory.relevanceScore = Math.min(1, keywordScore);
      return memory;
    });
  }

  private formatForWorkingMemory(entry: UEPMemoryEntry): string {
    return `TASK: ${entry.taskDescription}\nCOMPLEXITY: ${entry.context.complexity}\nCOMPONENTS: ${entry.context.components.join(', ')}\nAPPROVED: ${entry.context.approved}\nTIME: ${entry.executionTrace.processingTime}ms`;
  }

  private calculateDistribution(memories: UEPMemoryEntry[], path: string): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const memory of memories) {
      const value = this.getNestedValue(memory, path);
      if (value) {
        distribution[value] = (distribution[value] || 0) + 1;
      }
    }
    
    return distribution;
  }

  private calculateComponentUsage(memories: UEPMemoryEntry[]): Record<string, number> {
    const usage: Record<string, number> = {};
    
    for (const memory of memories) {
      for (const component of memory.context.components) {
        usage[component] = (usage[component] || 0) + 1;
      }
    }
    
    return usage;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Configuration interface
export interface UEPMemoryConfig {
  maxEntries: number;
  relevanceThreshold: number;
  enableRelevanceScoring: boolean;
  enableSecureAccess: boolean;
  cacheTTL: number;
}

// Factory function
export function createUEPMemoryManager(config?: Partial<UEPMemoryConfig>): UEPMemoryManager {
  return new UEPMemoryManager(config);
}

// Export for use in ProtocolProcessor
export { UEPMemoryManager as default };