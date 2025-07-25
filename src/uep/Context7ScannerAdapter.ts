/**
 * Universal Execution Protocol - Context7 Scanner Adapter
 * 
 * Adapter for automatic codebase awareness before task execution.
 * Scans repository, identifies relevant code blocks, detects collision risks.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { z } from 'zod';
import { Context7Adapter as IContext7Adapter, CodebaseContext } from './ProtocolProcessor';

// File patterns for different languages
const SCAN_PATTERNS = {
  javascript: /\.(js|jsx|mjs|cjs)$/i,
  typescript: /\.(ts|tsx)$/i,
  python: /\.py$/i,
  java: /\.java$/i,
  php: /\.php$/i,
  go: /\.go$/i,
  rust: /\.rs$/i,
  ruby: /\.rb$/i,
  config: /\.(json|yaml|yml|toml|ini)$/i,
  markdown: /\.(md|mdx)$/i
};

// Keywords for relevance scoring
const RELEVANCE_KEYWORDS = {
  high: ['function', 'class', 'interface', 'type', 'component', 'service', 'api', 'route'],
  medium: ['export', 'import', 'const', 'let', 'var', 'async', 'await'],
  low: ['console', 'log', 'debug', 'comment', 'todo']
};

// Collision risk patterns
const COLLISION_PATTERNS = {
  functions: /^(function\s+|const\s+\w+\s*=|async\s+function)/m,
  classes: /^(class\s+|export\s+class)/m,
  variables: /^(let|const|var)\s+(\w+)/m,
  imports: /^import\s+.*from/m,
  exports: /^export\s+(default\s+)?/m
};

// Cache entry interface
interface ScanCacheEntry {
  taskDescription: string;
  result: CodebaseContext;
  timestamp: Date;
  filesScanned: string[];
  projectHash: string;
}

// File analysis result
interface FileAnalysis {
  filePath: string;
  language: string;
  functions: string[];
  classes: string[];
  imports: string[];
  exports: string[];
  dependencies: string[];
  relevanceScore: number;
  collisionRisks: string[];
  snippets: string[];
}

/**
 * Context7 Scanner Adapter Implementation
 */
export class Context7ScannerAdapter implements IContext7Adapter {
  private config: Context7ScannerConfig;
  private cache: Map<string, ScanCacheEntry> = new Map();

  constructor(config: Partial<Context7ScannerConfig> = {}) {
    this.config = {
      projectRoot: process.cwd(),
      maxScanDepth: 6,
      maxFilesPerScan: 200,
      excludePatterns: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.log',
        '*.lock',
        '.env*',
        'coverage/**'
      ],
      includePatterns: [
        'src/**',
        'lib/**',
        'app/**',
        'pages/**',
        'components/**',
        '*.config.*',
        'package.json',
        'README.md'
      ],
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      maxCacheEntries: 50,
      relevanceThreshold: 0.3,
      enableASTAnalysis: true,
      enableCollisionDetection: true,
      ...config
    };
  }

  /**
   * Main entry point for codebase scanning
   */
  async scanCodebase(taskDescription: string): Promise<CodebaseContext> {
    try {
      console.log(`🔍 Context7: Scanning codebase for "${taskDescription.substring(0, 50)}..."`);

      // Check cache first
      if (this.config.enableCaching) {
        const cached = await this.getCachedResult(taskDescription);
        if (cached) {
          console.log(`📋 Context7: Using cached scan result`);
          return cached;
        }
      }

      // Discover relevant files
      const relevantFiles = await this.discoverRelevantFiles(taskDescription);
      
      // Analyze files
      const fileAnalyses = await this.analyzeFiles(relevantFiles, taskDescription);
      
      // Extract codebase context
      const context = this.extractCodebaseContext(fileAnalyses, taskDescription);
      
      // Cache result
      if (this.config.enableCaching) {
        await this.cacheResult(taskDescription, context, relevantFiles);
      }

      console.log(`✅ Context7: Scan completed - ${context.relevantFiles.length} files, ${context.functions.length} functions`);
      
      return context;

    } catch (error) {
      console.error(`❌ Context7: Scan failed: ${error.message}`);
      
      // Return minimal fallback context
      return this.createFallbackContext(taskDescription, error.message);
    }
  }

  /**
   * Discover files relevant to the task
   */
  private async discoverRelevantFiles(taskDescription: string): Promise<string[]> {
    const allFiles = await this.getAllProjectFiles();
    const keywords = this.extractTaskKeywords(taskDescription);
    
    const relevantFiles: Array<{ file: string; score: number }> = [];

    for (const file of allFiles) {
      const score = await this.calculateFileRelevance(file, keywords, taskDescription);
      
      if (score >= this.config.relevanceThreshold) {
        relevantFiles.push({ file, score });
      }
    }

    // Sort by relevance and take top files
    relevantFiles.sort((a, b) => b.score - a.score);
    const selectedFiles = relevantFiles
      .slice(0, this.config.maxFilesPerScan)
      .map(rf => rf.file);

    console.log(`🎯 Context7: Selected ${selectedFiles.length} relevant files from ${allFiles.length} total`);
    
    return selectedFiles;
  }

  /**
   * Get all project files matching patterns
   */
  private async getAllProjectFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      await this.scanDirectory(this.config.projectRoot, files, 0);
    } catch (error) {
      console.warn(`⚠️ Context7: Error scanning directory: ${error.message}`);
    }

    return files;
  }

  /**
   * Recursively scan directory for files
   */
  private async scanDirectory(dir: string, files: string[], depth: number): Promise<void> {
    if (depth >= this.config.maxScanDepth) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.config.projectRoot, fullPath);

        // Check exclude patterns
        if (this.shouldExcludePath(relativePath)) continue;

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, files, depth + 1);
        } else if (entry.isFile()) {
          // Check include patterns and file types
          if (this.shouldIncludeFile(relativePath)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Context7: Cannot read directory ${dir}: ${error.message}`);
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExcludePath(relativePath: string): boolean {
    return this.config.excludePatterns.some(pattern => 
      this.matchesPattern(relativePath, pattern)
    );
  }

  /**
   * Check if file should be included
   */
  private shouldIncludeFile(relativePath: string): boolean {
    // If no include patterns, include all non-excluded files
    if (this.config.includePatterns.length === 0) {
      return true;
    }

    return this.config.includePatterns.some(pattern => 
      this.matchesPattern(relativePath, pattern)
    );
  }

  /**
   * Simple glob pattern matching
   */
  private matchesPattern(str: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(str.replace(/\\/g, '/'));
  }

  /**
   * Calculate file relevance score
   */
  private async calculateFileRelevance(
    filePath: string,
    keywords: string[],
    taskDescription: string
  ): Promise<number> {
    let score = 0;

    // File name relevance
    const fileName = path.basename(filePath, path.extname(filePath));
    const fileNameLower = fileName.toLowerCase();
    
    for (const keyword of keywords) {
      if (fileNameLower.includes(keyword.toLowerCase())) {
        score += 0.4;
      }
    }

    // File path relevance
    const relativePath = path.relative(this.config.projectRoot, filePath);
    const pathParts = relativePath.split(path.sep);
    
    for (const keyword of keywords) {
      if (pathParts.some(part => part.toLowerCase().includes(keyword.toLowerCase()))) {
        score += 0.2;
      }
    }

    // File type relevance
    const language = this.detectFileLanguage(filePath);
    if (language && this.isRelevantLanguage(language, taskDescription)) {
      score += 0.3;
    }

    // Content relevance (light sampling to avoid performance issues)
    if (score > 0.2) {
      try {
        const content = await this.sampleFileContent(filePath);
        const contentScore = this.calculateContentRelevance(content, keywords);
        score += contentScore * 0.5;
      } catch (error) {
        // Ignore content read errors
      }
    }

    return Math.min(1, score);
  }

  /**
   * Analyze selected files
   */
  private async analyzeFiles(filePaths: string[], taskDescription: string): Promise<FileAnalysis[]> {
    const analyses: FileAnalysis[] = [];

    for (const filePath of filePaths) {
      try {
        const analysis = await this.analyzeFile(filePath, taskDescription);
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.warn(`⚠️ Context7: Failed to analyze ${filePath}: ${error.message}`);
      }
    }

    return analyses;
  }

  /**
   * Analyze individual file
   */
  private async analyzeFile(filePath: string, taskDescription: string): Promise<FileAnalysis | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const language = this.detectFileLanguage(filePath);
      
      let analysis: Partial<FileAnalysis> = {
        filePath,
        language,
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        dependencies: [],
        collisionRisks: [],
        snippets: []
      };

      // AST Analysis for JavaScript/TypeScript files
      if (this.config.enableASTAnalysis && (language === 'javascript' || language === 'typescript')) {
        const astAnalysis = await this.performASTAnalysis(content, filePath);
        analysis = { ...analysis, ...astAnalysis };
      } else {
        // Basic text analysis for other file types
        analysis = { ...analysis, ...this.performTextAnalysis(content, filePath) };
      }

      // Calculate relevance score
      const keywords = this.extractTaskKeywords(taskDescription);
      analysis.relevanceScore = this.calculateContentRelevance(content, keywords);

      // Detect collision risks
      if (this.config.enableCollisionDetection) {
        analysis.collisionRisks = this.detectCollisionRisks(content, taskDescription);
      }

      // Extract relevant code snippets
      analysis.snippets = this.extractRelevantSnippets(content, keywords);

      return analysis as FileAnalysis;

    } catch (error) {
      console.warn(`⚠️ Context7: Error analyzing file ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Perform AST analysis for JavaScript/TypeScript files
   */
  private async performASTAnalysis(content: string, filePath: string): Promise<Partial<FileAnalysis>> {
    const analysis: Partial<FileAnalysis> = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: []
    };

    try {
      const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
      
      const ast = parse(content, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        plugins: isTypeScript 
          ? ['typescript', 'jsx', 'decorators-legacy'] 
          : ['jsx', 'decorators-legacy']
      });

      traverse(ast, {
        FunctionDeclaration(path) {
          if (path.node.id) {
            analysis.functions!.push(path.node.id.name);
          }
        },
        
        ArrowFunctionExpression(path) {
          const parent = path.parent;
          if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
            analysis.functions!.push(parent.id.name);
          }
        },

        ClassDeclaration(path) {
          if (path.node.id) {
            analysis.classes!.push(path.node.id.name);
          }
        },

        ImportDeclaration(path) {
          const source = path.node.source.value;
          analysis.imports!.push(source);
          if (!source.startsWith('.') && !source.startsWith('/')) {
            analysis.dependencies!.push(source);
          }
        },

        ExportDeclaration(path) {
          if (t.isExportNamedDeclaration(path.node)) {
            path.node.specifiers?.forEach(spec => {
              if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
                analysis.exports!.push(spec.exported.name);
              }
            });
          }
        }
      });

    } catch (error) {
      console.warn(`⚠️ Context7: AST parsing failed for ${filePath}: ${error.message}`);
      // Fall back to text analysis
      return this.performTextAnalysis(content, filePath);
    }

    return analysis;
  }

  /**
   * Perform basic text analysis for non-JS/TS files
   */
  private performTextAnalysis(content: string, filePath: string): Partial<FileAnalysis> {
    const analysis: Partial<FileAnalysis> = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      dependencies: []
    };

    // Simple regex-based extraction
    const functionMatches = content.match(/(?:function|def|func)\s+(\w+)/g) || [];
    analysis.functions = functionMatches.map(match => 
      match.replace(/(?:function|def|func)\s+/, '')
    );

    const classMatches = content.match(/(?:class|interface|type)\s+(\w+)/g) || [];
    analysis.classes = classMatches.map(match => 
      match.replace(/(?:class|interface|type)\s+/, '')
    );

    return analysis;
  }

  /**
   * Extract codebase context from file analyses
   */
  private extractCodebaseContext(analyses: FileAnalysis[], taskDescription: string): CodebaseContext {
    const context: CodebaseContext = {
      relevantFiles: [],
      functions: [],
      snippets: [],
      collisionRisks: [],
      dependencies: []
    };

    // Sort analyses by relevance score
    analyses.sort((a, b) => b.relevanceScore - a.relevanceScore);

    for (const analysis of analyses) {
      context.relevantFiles.push(analysis.filePath);
      context.functions.push(...analysis.functions);
      context.snippets.push(...analysis.snippets);
      context.collisionRisks.push(...analysis.collisionRisks);
      context.dependencies.push(...analysis.dependencies);
    }

    // Remove duplicates and limit results
    context.functions = [...new Set(context.functions)].slice(0, 50);
    context.snippets = [...new Set(context.snippets)].slice(0, 20);
    context.collisionRisks = [...new Set(context.collisionRisks)].slice(0, 10);
    context.dependencies = [...new Set(context.dependencies)].slice(0, 30);

    return context;
  }

  /**
   * Helper methods
   */
  private extractTaskKeywords(taskDescription: string): string[] {
    // Simple keyword extraction
    const words = taskDescription.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return [...new Set(words)].slice(0, 10);
  }

  private detectFileLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    
    for (const [language, pattern] of Object.entries(SCAN_PATTERNS)) {
      if (pattern.test(ext)) {
        return language;
      }
    }
    
    return 'unknown';
  }

  private isRelevantLanguage(language: string, taskDescription: string): boolean {
    const description = taskDescription.toLowerCase();
    
    // Basic language relevance heuristics
    if (description.includes('javascript') || description.includes('js')) {
      return language === 'javascript' || language === 'typescript';
    }
    
    if (description.includes('typescript') || description.includes('ts')) {
      return language === 'typescript';
    }
    
    if (description.includes('python')) {
      return language === 'python';
    }
    
    // Default: JS/TS and config files are generally relevant
    return ['javascript', 'typescript', 'config', 'markdown'].includes(language);
  }

  private async sampleFileContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.substring(0, 1000); // Sample first 1KB
    } catch (error) {
      return '';
    }
  }

  private calculateContentRelevance(content: string, keywords: string[]): number {
    let score = 0;
    const contentLower = content.toLowerCase();
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const matches = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      score += Math.min(matches * 0.1, 0.3); // Cap per keyword
    }
    
    return Math.min(1, score);
  }

  private detectCollisionRisks(content: string, taskDescription: string): string[] {
    const risks: string[] = [];
    
    // Check for naming collisions based on task description
    const taskWords = this.extractTaskKeywords(taskDescription);
    
    for (const word of taskWords) {
      for (const [type, pattern] of Object.entries(COLLISION_PATTERNS)) {
        if (pattern.test(content) && content.toLowerCase().includes(word.toLowerCase())) {
          risks.push(`Potential ${type} collision with existing code containing '${word}'`);
        }
      }
    }
    
    return risks;
  }

  private extractRelevantSnippets(content: string, keywords: string[]): string[] {
    const snippets: string[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();
      
      for (const keyword of keywords) {
        if (lineLower.includes(keyword.toLowerCase())) {
          // Extract 3-line context around the match
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length, i + 2);
          const snippet = lines.slice(start, end).join('\n').trim();
          
          if (snippet.length > 10 && snippet.length < 300) {
            snippets.push(snippet);
          }
          break;
        }
      }
    }
    
    return snippets.slice(0, 10); // Limit snippets
  }

  private createFallbackContext(taskDescription: string, errorMessage: string): CodebaseContext {
    console.log(`🔄 Context7: Creating fallback context due to scan failure`);
    
    return {
      relevantFiles: [],
      functions: [],
      snippets: [`// Context7 scan failed: ${errorMessage}`],
      collisionRisks: ['Unable to detect collision risks due to scan failure'],
      dependencies: []
    };
  }

  /**
   * Cache management
   */
  private async getCachedResult(taskDescription: string): Promise<CodebaseContext | null> {
    const cacheKey = this.generateCacheKey(taskDescription);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if cache is expired
    const age = Date.now() - entry.timestamp.getTime();
    if (age > this.config.cacheTimeout) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    // Check if project files have changed (simple check)
    const currentHash = await this.generateProjectHash();
    if (currentHash !== entry.projectHash) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }

  private async cacheResult(
    taskDescription: string,
    result: CodebaseContext,
    filesScanned: string[]
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(taskDescription);
    
    // Clean up old entries if cache is full
    if (this.cache.size >= this.config.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    const projectHash = await this.generateProjectHash();
    
    this.cache.set(cacheKey, {
      taskDescription,
      result,
      timestamp: new Date(),
      filesScanned,
      projectHash
    });
  }

  private generateCacheKey(taskDescription: string): string {
    return taskDescription.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  }

  private async generateProjectHash(): Promise<string> {
    // Simple hash based on package.json mtime (if exists)
    try {
      const packagePath = path.join(this.config.projectRoot, 'package.json');
      const stats = await fs.stat(packagePath);
      return stats.mtime.getTime().toString();
    } catch (error) {
      return Date.now().toString();
    }
  }

  /**
   * Public utility methods
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Context7: Cache cleared');
  }

  getCacheStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ task: string; age: number; filesScanned: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      task: entry.taskDescription.substring(0, 50),
      age: Date.now() - entry.timestamp.getTime(),
      filesScanned: entry.filesScanned.length
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheEntries,
      entries
    };
  }
}

// Configuration interface
export interface Context7ScannerConfig {
  projectRoot: string;
  maxScanDepth: number;
  maxFilesPerScan: number;
  excludePatterns: string[];
  includePatterns: string[];
  enableCaching: boolean;
  cacheTimeout: number;
  maxCacheEntries: number;
  relevanceThreshold: number;
  enableASTAnalysis: boolean;
  enableCollisionDetection: boolean;
}

// Factory function
export function createContext7ScannerAdapter(config?: Partial<Context7ScannerConfig>): Context7ScannerAdapter {
  return new Context7ScannerAdapter(config);
}

// Export for use in ProtocolProcessor
export { Context7ScannerAdapter as default };