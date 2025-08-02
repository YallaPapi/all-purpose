/**
 * Real Context7 Client using MCP Tools
 * 
 * This implementation actually calls the Context7 MCP tools
 * that are available in the Claude Code environment
 */

import { Logger } from 'winston';
import { LibraryMatch, LibraryDocs, CodeSnippet } from './Context7Client';

// These functions are available in Claude Code environment
declare function mcp__context7__resolve_library_id(params: { libraryName: string }): Promise<any>;
declare function mcp__context7__get_library_docs(params: { 
  context7CompatibleLibraryID: string; 
  topic?: string; 
  tokens?: number 
}): Promise<any>;

/**
 * Real Context7 Client that uses actual MCP tools
 */
export class RealContext7Client {
  private logger: Logger;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 300000; // 5 minutes

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Resolve a library name to Context7 library ID
   */
  async resolveLibraryId(libraryName: string): Promise<LibraryMatch | null> {
    try {
      this.logger.info(`🔍 Resolving library ID for: ${libraryName}`);

      // Check cache first
      const cacheKey = `resolve:${libraryName}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Call the actual MCP tool
      const response = await mcp__context7__resolve_library_id({ libraryName });
      
      // Parse response to find the best match
      if (response && response.includes('Context7-compatible library ID:')) {
        // Extract the first match from the response
        const lines = response.split('\n');
        let currentMatch: Partial<LibraryMatch> = {};
        
        for (const line of lines) {
          if (line.includes('Title:')) {
            currentMatch.title = line.split('Title:')[1].trim();
          } else if (line.includes('Context7-compatible library ID:')) {
            currentMatch.libraryId = line.split('Context7-compatible library ID:')[1].trim();
          } else if (line.includes('Description:')) {
            currentMatch.description = line.split('Description:')[1].trim();
          } else if (line.includes('Code Snippets:')) {
            currentMatch.codeSnippets = parseInt(line.split('Code Snippets:')[1].trim());
          } else if (line.includes('Trust Score:')) {
            currentMatch.trustScore = parseFloat(line.split('Trust Score:')[1].trim());
            
            // We have a complete match
            if (currentMatch.libraryId) {
              const match = currentMatch as LibraryMatch;
              this.addToCache(cacheKey, match);
              this.logger.info(`✅ Found library match: ${match.libraryId}`);
              return match;
            }
          }
        }
      }

      this.logger.warn(`⚠️ No match found for library: ${libraryName}`);
      return null;

    } catch (error) {
      this.logger.error(`❌ Failed to resolve library ID`, { error });
      return null;
    }
  }

  /**
   * Get documentation for a specific library
   */
  async getLibraryDocs(
    libraryId: string,
    topic?: string,
    maxTokens: number = 5000
  ): Promise<LibraryDocs | null> {
    try {
      // Check cache first
      const cacheKey = `docs:${libraryId}:${topic || 'general'}:${maxTokens}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      this.logger.info(`📚 Fetching library docs for: ${libraryId}`, { topic, maxTokens });

      // Call the actual MCP tool
      const response = await mcp__context7__get_library_docs({
        context7CompatibleLibraryID: libraryId,
        topic,
        tokens: maxTokens
      });

      // Parse the response into our LibraryDocs format
      const snippets: CodeSnippet[] = [];
      
      if (response && response.includes('CODE SNIPPETS')) {
        const sections = response.split('----------------------------------------');
        
        for (const section of sections) {
          if (section.includes('TITLE:') && section.includes('CODE:')) {
            const titleMatch = section.match(/TITLE:\s*(.+)/);
            const descMatch = section.match(/DESCRIPTION:\s*(.+)/);
            const sourceMatch = section.match(/SOURCE:\s*(.+)/);
            const langMatch = section.match(/LANGUAGE:\s*(.+)/);
            const codeMatch = section.match(/CODE:\s*```[\s\S]*?```([\s\S]*?)(?=LANGUAGE:|$)/);
            
            if (titleMatch) {
              const snippet: CodeSnippet = {
                title: titleMatch[1].trim(),
                description: descMatch ? descMatch[1].trim() : '',
                source: sourceMatch ? sourceMatch[1].trim() : 'context7',
                language: langMatch ? langMatch[1].trim().toLowerCase() : 'javascript',
                code: ''
              };
              
              // Extract code between backticks
              const codeBlockMatch = section.match(/```(?:\w+)?\s*([\s\S]*?)```/);
              if (codeBlockMatch) {
                snippet.code = codeBlockMatch[1].trim();
              }
              
              if (snippet.code) {
                snippets.push(snippet);
              }
            }
          }
        }
      }

      const docs: LibraryDocs = {
        libraryId,
        topic,
        snippets
      };

      // Cache the results
      this.addToCache(cacheKey, docs);
      this.logger.info(`✅ Retrieved ${docs.snippets.length} code snippets`);

      return docs;

    } catch (error) {
      this.logger.error(`❌ Failed to fetch library docs`, { error });
      return null;
    }
  }

  /**
   * Get documentation for multiple libraries
   */
  async getMultipleLibraryDocs(
    libraries: Array<{ name: string; topics?: string[] }>,
    maxTokensPerLibrary: number = 2000
  ): Promise<Map<string, LibraryDocs>> {
    const results = new Map<string, LibraryDocs>();

    for (const lib of libraries) {
      // First resolve the library ID
      const libraryMatch = await this.resolveLibraryId(lib.name);
      if (!libraryMatch) continue;

      // Then fetch docs for each topic
      if (lib.topics && lib.topics.length > 0) {
        for (const topic of lib.topics) {
          const docs = await this.getLibraryDocs(
            libraryMatch.libraryId,
            topic,
            maxTokensPerLibrary
          );
          if (docs) {
            results.set(`${lib.name}:${topic}`, docs);
          }
        }
      } else {
        // Fetch general docs
        const docs = await this.getLibraryDocs(
          libraryMatch.libraryId,
          undefined,
          maxTokensPerLibrary
        );
        if (docs) {
          results.set(lib.name, docs);
        }
      }
    }

    return results;
  }

  /**
   * Clear the documentation cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('🧹 Documentation cache cleared');
  }

  /**
   * Helper: Get from cache if not expired
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.cacheTTL) {
        this.logger.debug(`Cache hit for: ${key}`);
        return cached.data;
      } else {
        this.cache.delete(key);
      }
    }
    return null;
  }

  /**
   * Helper: Add to cache
   */
  private addToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

/**
 * Export as default implementation
 */
export { RealContext7Client as Context7Client };