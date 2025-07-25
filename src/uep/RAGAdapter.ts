/**
 * Universal Execution Protocol - RAG Adapter
 * 
 * Adapter for document retrieval using existing Upstash vector store.
 * Integrates with existing RAG system to provide task-relevant documentation.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { z } from 'zod';
import { RAGAdapter as IRAGAdapter, DocumentationResult } from './ProtocolProcessor';

// Configuration for RAG searches
export interface RAGSearchConfig {
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
  preferredSources: string[];
  excludedSources: string[];
  fileTypeWeights: Record<string, number>;
}

// Enhanced search query interface
export interface EnhancedSearchQuery {
  query: string;
  context?: any;
  filters?: {
    fileType?: string[];
    filePath?: string[];
    language?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    contentType?: string[];
    tags?: string[];
  };
  options?: {
    maxResults?: number;
    scoreThreshold?: number;
    includeMetadata?: boolean;
    includeContent?: boolean;
    expandQuery?: boolean;
    boostFactors?: Record<string, number>;
  };
}

// Search result from vector store
export interface VectorSearchResult {
  id: string;
  content: string;
  metadata: {
    source: string;
    filePath: string;
    fileType: string;
    section?: string;
    language?: string;
    lastModified?: Date;
    tags?: string[];
    chunkIndex?: number;
    totalChunks?: number;
  };
  score: number;
  enhancedScore?: number;
}

// Cache entry interface
interface RAGCacheEntry {
  query: string;
  context: any;
  results: DocumentationResult[];
  timestamp: Date;
  metadata: {
    searchTime: number;
    totalResults: number;
    filters: any;
  };
}

/**
 * Mock RAG System Integration (for development/testing)
 * In production, this would integrate with the actual RAG system
 */
class MockRAGSystem {
  
  async search(query: EnhancedSearchQuery): Promise<VectorSearchResult[]> {
    // Mock implementation that simulates real RAG responses
    const mockResults: VectorSearchResult[] = [];
    
    // Generate mock results based on query keywords
    const keywords = this.extractKeywords(query.query);
    const resultCount = Math.min(query.options?.maxResults || 5, 10);
    
    for (let i = 0; i < resultCount; i++) {
      const keyword = keywords[i % keywords.length] || 'general';
      
      mockResults.push({
        id: `doc-${i + 1}`,
        content: this.generateMockContent(keyword, query.query),
        metadata: {
          source: `documentation/${keyword}.md`,
          filePath: `/docs/${keyword}.md`,
          fileType: 'markdown',
          section: `Section ${i + 1}`,
          language: 'en',
          lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          tags: [keyword, 'documentation'],
          chunkIndex: i,
          totalChunks: resultCount
        },
        score: 0.9 - (i * 0.1)
      });
    }
    
    return mockResults;
  }
  
  private extractKeywords(query: string): string[] {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }
  
  private generateMockContent(keyword: string, query: string): string {
    const templates = [
      `## ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Documentation\n\nThis section covers ${keyword} implementation details related to "${query.substring(0, 50)}..."\n\n### Key Concepts\n- Configuration and setup\n- Best practices and patterns\n- Common troubleshooting steps`,
      
      `### ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Guide\n\nFor tasks involving "${query.substring(0, 30)}...", consider the following approach:\n\n1. Initialize the ${keyword} system\n2. Configure relevant parameters\n3. Implement error handling\n4. Test thoroughly`,
      
      `# ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Reference\n\nWhen working with ${keyword} in the context of "${query.substring(0, 40)}...", refer to:\n\n- API documentation\n- Configuration examples\n- Integration patterns\n- Performance considerations`,
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

/**
 * RAG Adapter Implementation
 */
export class RAGAdapter implements IRAGAdapter {
  private config: RAGSearchConfig;
  private cache: Map<string, RAGCacheEntry> = new Map();
  private ragSystem: MockRAGSystem; // In production, this would be the actual RAG system

  constructor(config: Partial<RAGSearchConfig> = {}) {
    this.config = {
      maxResults: 10,
      scoreThreshold: 0.3,
      enableQueryExpansion: true,
      enableContextRanking: true,
      enableRecencyBoost: true,
      recencyDecayDays: 30,
      contextWeights: {
        relevance: 0.4,
        recency: 0.2,
        fileType: 0.2,
        section: 0.2
      },
      preferredSources: [
        'documentation',
        'readme',
        'guides',
        'api-docs',
        'tutorials'
      ],
      excludedSources: [
        'node_modules',
        'build',
        'dist',
        'coverage'
      ],
      fileTypeWeights: {
        'markdown': 1.0,
        'typescript': 0.8,
        'javascript': 0.8,
        'json': 0.6,
        'yaml': 0.6,
        'txt': 0.4
      },
      ...config
    };

    this.ragSystem = new MockRAGSystem();
  }

  /**
   * Main entry point for searching documentation
   */
  async searchDocumentation(query: string, context?: any): Promise<DocumentationResult[]> {
    try {
      console.log(`🔍 RAG: Searching documentation for "${query.substring(0, 50)}..."`);

      // Check cache first
      const cached = this.getCachedResult(query, context);
      if (cached) {
        console.log(`📋 RAG: Using cached documentation results`);
        return cached;
      }

      const startTime = Date.now();

      // Prepare enhanced search query
      const enhancedQuery = this.prepareSearchQuery(query, context);

      // Execute search
      const searchResults = await this.executeSearch(enhancedQuery);

      // Process and rank results
      const processedResults = this.processSearchResults(searchResults, query, context);

      // Convert to documentation format
      const documentationResults = this.convertToDocumentationResults(processedResults);

      // Cache results
      const searchTime = Date.now() - startTime;
      this.cacheResults(query, context, documentationResults, searchTime, searchResults.length);

      console.log(`✅ RAG: Found ${documentationResults.length} relevant documents (${searchTime}ms)`);

      return documentationResults;

    } catch (error) {
      console.error(`❌ RAG: Documentation search failed: ${error.message}`);
      
      // Return fallback documentation
      return this.createFallbackDocumentation(query, error.message);
    }
  }

  /**
   * Prepare enhanced search query with context
   */
  private prepareSearchQuery(query: string, context?: any): EnhancedSearchQuery {
    const enhancedQuery: EnhancedSearchQuery = {
      query: this.expandQuery(query),
      context,
      filters: {
        fileType: this.getPreferredFileTypes(query),
        contentType: ['documentation', 'guide', 'reference', 'tutorial']
      },
      options: {
        maxResults: this.config.maxResults,
        scoreThreshold: this.config.scoreThreshold,
        includeMetadata: true,
        includeContent: true,
        expandQuery: this.config.enableQueryExpansion
      }
    };

    // Add context-based filters
    if (context) {
      enhancedQuery.filters = {
        ...enhancedQuery.filters,
        ...this.extractContextFilters(context)
      };
    }

    return enhancedQuery;
  }

  /**
   * Expand query with related terms
   */
  private expandQuery(query: string): string {
    if (!this.config.enableQueryExpansion) {
      return query;
    }

    const queryLower = query.toLowerCase();
    const expansions: string[] = [];

    // Common expansion patterns
    const expansionMap: Record<string, string[]> = {
      'auth': ['authentication', 'authorization', 'login', 'jwt', 'token'],
      'database': ['db', 'sql', 'query', 'schema', 'migration'],
      'api': ['endpoint', 'route', 'request', 'response', 'rest'],
      'config': ['configuration', 'setup', 'environment', 'settings'],
      'test': ['testing', 'spec', 'unit test', 'integration test'],
      'deploy': ['deployment', 'build', 'ci/cd', 'production'],
      'error': ['exception', 'bug', 'debug', 'troubleshoot'],
      'user': ['account', 'profile', 'registration', 'user management']
    };

    for (const [key, terms] of Object.entries(expansionMap)) {
      if (queryLower.includes(key)) {
        expansions.push(...terms);
      }
    }

    if (expansions.length > 0) {
      return `${query} ${expansions.slice(0, 3).join(' ')}`;
    }

    return query;
  }

  /**
   * Get preferred file types based on query
   */
  private getPreferredFileTypes(query: string): string[] {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('typescript') || queryLower.includes('ts')) {
      return ['typescript', 'markdown'];
    }
    
    if (queryLower.includes('javascript') || queryLower.includes('js')) {
      return ['javascript', 'markdown'];
    }
    
    if (queryLower.includes('config') || queryLower.includes('setup')) {
      return ['json', 'yaml', 'markdown'];
    }
    
    // Default preference
    return ['markdown', 'typescript', 'javascript'];
  }

  /**
   * Extract context-based filters
   */
  private extractContextFilters(context: any): any {
    const filters: any = {};

    if (context.projectType) {
      filters.tags = [context.projectType];
    }

    if (context.language) {
      filters.language = [context.language];
    }

    if (context.framework) {
      filters.tags = [...(filters.tags || []), context.framework];
    }

    return filters;
  }

  /**
   * Execute search against RAG system
   */
  private async executeSearch(query: EnhancedSearchQuery): Promise<VectorSearchResult[]> {
    try {
      // In production, this would call the actual RAG system
      const results = await this.ragSystem.search(query);
      
      // Filter by excluded sources
      return results.filter(result => 
        !this.config.excludedSources.some(excluded => 
          result.metadata.source.toLowerCase().includes(excluded.toLowerCase())
        )
      );

    } catch (error) {
      console.warn(`⚠️ RAG: Vector search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Process and rank search results
   */
  private processSearchResults(
    results: VectorSearchResult[], 
    originalQuery: string, 
    context?: any
  ): VectorSearchResult[] {
    
    if (!this.config.enableContextRanking) {
      return results;
    }

    // Calculate enhanced scores
    const enhancedResults = results.map(result => ({
      ...result,
      enhancedScore: this.calculateEnhancedScore(result, originalQuery, context)
    }));

    // Sort by enhanced score
    enhancedResults.sort((a, b) => (b.enhancedScore || 0) - (a.enhancedScore || 0));

    // Filter by score threshold
    return enhancedResults.filter(result => 
      (result.enhancedScore || 0) >= this.config.scoreThreshold
    );
  }

  /**
   * Calculate enhanced relevance score
   */
  private calculateEnhancedScore(
    result: VectorSearchResult, 
    query: string, 
    context?: any
  ): number {
    let score = result.score * this.config.contextWeights.relevance;

    // Recency boost
    if (this.config.enableRecencyBoost && result.metadata.lastModified) {
      const ageInDays = (Date.now() - result.metadata.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - (ageInDays / this.config.recencyDecayDays));
      score += recencyScore * this.config.contextWeights.recency;
    }

    // File type boost
    const fileTypeWeight = this.config.fileTypeWeights[result.metadata.fileType] || 0.5;
    score += fileTypeWeight * this.config.contextWeights.fileType;

    // Section boost (prefer certain sections)
    if (result.metadata.section) {
      const section = result.metadata.section.toLowerCase();
      const sectionBoosts = {
        'introduction': 0.8,
        'getting started': 0.9,
        'configuration': 0.7,
        'api reference': 0.6,
        'troubleshooting': 0.5
      };
      
      const sectionBoost = sectionBoosts[section] || 0.5;
      score += sectionBoost * this.config.contextWeights.section;
    }

    // Preferred source boost
    if (this.config.preferredSources.some(preferred => 
        result.metadata.source.toLowerCase().includes(preferred.toLowerCase())
    )) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Convert to documentation results format
   */
  private convertToDocumentationResults(results: VectorSearchResult[]): DocumentationResult[] {
    return results.map(result => ({
      content: result.content,
      source: result.metadata.source,
      relevanceScore: result.enhancedScore || result.score,
      metadata: {
        filePath: result.metadata.filePath,
        fileType: result.metadata.fileType,
        section: result.metadata.section,
        language: result.metadata.language,
        lastModified: result.metadata.lastModified?.toISOString(),
        tags: result.metadata.tags,
        chunkInfo: {
          index: result.metadata.chunkIndex,
          total: result.metadata.totalChunks
        }
      }
    }));
  }

  /**
   * Create fallback documentation when search fails
   */
  private createFallbackDocumentation(query: string, errorMessage: string): DocumentationResult[] {
    console.log(`🔄 RAG: Creating fallback documentation for failed search`);

    const fallbackDocs: DocumentationResult[] = [
      {
        content: `# Documentation Search Failed\n\nUnable to retrieve relevant documentation for: "${query}"\n\nError: ${errorMessage}\n\n## Suggested Actions\n\n1. Check documentation sources are available\n2. Verify vector database connectivity\n3. Review search query formatting\n4. Consult manual documentation if available`,
        source: 'fallback/search-failure.md',
        relevanceScore: 0.1,
        metadata: {
          type: 'fallback',
          generated: new Date().toISOString(),
          originalQuery: query,
          errorMessage
        }
      }
    ];

    // Add basic documentation if query suggests common topics
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('auth') || queryLower.includes('login')) {
      fallbackDocs.push({
        content: `# Authentication Patterns\n\nCommon authentication implementation patterns:\n\n- JWT token-based authentication\n- Session-based authentication\n- OAuth integration\n- Multi-factor authentication\n\nRefer to project-specific authentication documentation for detailed implementation.`,
        source: 'fallback/auth-patterns.md',
        relevanceScore: 0.3,
        metadata: { type: 'pattern-fallback' }
      });
    }

    if (queryLower.includes('api') || queryLower.includes('endpoint')) {
      fallbackDocs.push({
        content: `# API Development Patterns\n\nStandard API development approaches:\n\n- RESTful API design\n- Error handling patterns\n- Request/response validation\n- Rate limiting and security\n\nConsult project API documentation for specific implementation details.`,
        source: 'fallback/api-patterns.md',
        relevanceScore: 0.3,
        metadata: { type: 'pattern-fallback' }
      });
    }

    return fallbackDocs;
  }

  /**
   * Cache management
   */
  private getCachedResult(query: string, context?: any): DocumentationResult[] | null {
    const cacheKey = this.generateCacheKey(query, context);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if cache is expired (5 minutes)
    const age = Date.now() - entry.timestamp.getTime();
    if (age > 300000) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry.results;
  }

  private cacheResults(
    query: string,
    context: any,
    results: DocumentationResult[],
    searchTime: number,
    totalResults: number
  ): void {
    const cacheKey = this.generateCacheKey(query, context);
    
    // Clean up old entries if cache is full (max 50 entries)
    if (this.cache.size >= 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(cacheKey, {
      query,
      context,
      results,
      timestamp: new Date(),
      metadata: {
        searchTime,
        totalResults,
        filters: context
      }
    });
  }

  private generateCacheKey(query: string, context?: any): string {
    const contextHash = context ? JSON.stringify(context) : '';
    return `${query}:${contextHash}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  }

  /**
   * Public utility methods
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 RAG: Cache cleared');
  }

  getCacheStats(): {
    size: number;
    entries: Array<{
      query: string;
      resultsCount: number;
      age: number;
      searchTime: number;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      query: entry.query.substring(0, 50),
      resultsCount: entry.results.length,
      age: Date.now() - entry.timestamp.getTime(),
      searchTime: entry.metadata.searchTime
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RAGSearchConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 RAG: Configuration updated');
  }
}

// Factory function
export function createRAGAdapter(config?: Partial<RAGSearchConfig>): RAGAdapter {
  return new RAGAdapter(config);
}

// Export for use in ProtocolProcessor
export { RAGAdapter as default };