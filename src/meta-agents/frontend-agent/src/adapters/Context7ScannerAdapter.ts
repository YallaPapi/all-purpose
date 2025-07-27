/**
 * Context7 Scanner Adapter
 * 
 * Integrates with Context7 system for intelligent codebase scanning
 * Provides backend-specific pattern recognition and context extraction
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { Logger } from 'winston';

import {
  Context7ScanRequest,
  Context7ScanResult,
  FileContext,
  CodePattern,
  APIEndpoint,
  DatabaseSchema,
  MiddlewarePattern,
  SecurityPattern,
  TestingPattern
} from '../types/index.js';

import { createLogger } from '../utils/logger.js';

export interface Context7ScannerConfig {
  projectRoot: string;
  scanPatterns: string[];
  ignorePatterns: string[];
  maxFileSize?: number;
  enableSemanticAnalysis?: boolean;
  relevanceThreshold?: number;
}

/**
 * Context7 Scanner Adapter for backend-specific codebase analysis
 */
export class Context7ScannerAdapter extends EventEmitter {
  private config: Context7ScannerConfig;
  private logger: Logger;
  private isInitialized = false;

  // Backend-specific pattern definitions
  private readonly backendPatterns = {
    apiEndpoints: [
      /\.(get|post|put|delete|patch|head|options)\s*\(['"`]([^'"`]+)['"`]/gi,
      /router\.(get|post|put|delete|patch)\s*\(['"`]([^'"`]+)['"`]/gi,
      /@(Get|Post|Put|Delete|Patch)\s*\(['"`]([^'"`]+)['"`]/gi,
      /app\.(get|post|put|delete|patch)\s*\(['"`]([^'"`]+)['"`]/gi
    ],
    
    databaseModels: [
      /class\s+(\w+).*extends.*Model/gi,
      /@Entity\s*\(\s*['"`]?(\w+)['"`]?\s*\)/gi,
      /const\s+(\w+)Schema\s*=\s*new\s+Schema/gi,
      /model\s*\(\s*['"`](\w+)['"`]/gi
    ],
    
    middlewareFunctions: [
      /function\s+(\w+).*\(req,?\s*res,?\s*next\)/gi,
      /const\s+(\w+)\s*=\s*\(req,?\s*res,?\s*next\)/gi,
      /@Middleware\s*\(\s*\)/gi,
      /app\.use\s*\(\s*(['"`]?[^'"`\)]+['"`]?)?\s*,?\s*(\w+)/gi
    ],
    
    authPatterns: [
      /(jwt|passport|oauth|authenticate|authorize|token|session)/gi,
      /@UseGuards\s*\(\s*(\w+)\s*\)/gi,
      /passport\.(use|authenticate)/gi,
      /jwt\.(sign|verify|decode)/gi
    ],
    
    validationSchemas: [
      /(joi|yup|zod|ajv).*schema/gi,
      /@IsString|@IsNumber|@IsEmail|@IsOptional/gi,
      /validate\s*\(\s*[^)]+\s*\)/gi,
      /body\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gi
    ],
    
    errorHandling: [
      /try\s*\{[\s\S]*?catch\s*\(/gi,
      /\.catch\s*\(\s*([^)]+)\s*\)/gi,
      /@Catch\s*\(\s*(\w+)\s*\)/gi,
      /throw\s+new\s+(\w+Error)/gi
    ],
    
    databaseQueries: [
      /SELECT\s+.+FROM\s+(\w+)/gi,
      /INSERT\s+INTO\s+(\w+)/gi,
      /UPDATE\s+(\w+)\s+SET/gi,
      /DELETE\s+FROM\s+(\w+)/gi,
      /findOne|findMany|findFirst|create|update|delete|upsert/gi
    ],
    
    securityPatterns: [
      /helmet|cors|csrf|xss|sanitize|escape/gi,
      /bcrypt|scrypt|argon2/gi,
      /rateLimit|rateLimiter/gi,
      /https?:\/\/[^\s'"`]+/gi
    ]
  };

  constructor(config: Context7ScannerConfig) {
    super();

    this.config = {
      maxFileSize: 1024 * 1024, // 1MB default limit
      enableSemanticAnalysis: true,
      relevanceThreshold: 0.3,
      ...config
    };

    this.logger = createLogger('context7-scanner', 'info');

    this.logger.info('Context7 Scanner Adapter initialized', {
      projectRoot: this.config.projectRoot,
      scanPatterns: this.config.scanPatterns.length,
      ignorePatterns: this.config.ignorePatterns.length
    });
  }

  /**
   * Initialize the Context7 scanner
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing Context7 Scanner...');

      // Validate project root exists
      await fs.access(this.config.projectRoot);

      this.isInitialized = true;
      this.logger.info('✅ Context7 Scanner initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize Context7 Scanner', { error });
      throw error;
    }
  }

  /**
   * Scan codebase for backend-specific patterns and context
   */
  async scanForBackendPatterns(taskDescription: string): Promise<Context7ScanResult> {
    if (!this.isInitialized) {
      throw new Error('Context7 Scanner not initialized');
    }

    this.logger.info('🔍 Scanning codebase for backend patterns', { task: taskDescription });

    try {
      // Step 1: Discover relevant files
      const relevantFiles = await this.discoverRelevantFiles(taskDescription);

      // Step 2: Extract code patterns
      const codePatterns = await this.extractCodePatterns(relevantFiles);

      // Step 3: Analyze API endpoints
      const apiEndpoints = await this.extractAPIEndpoints(relevantFiles);

      // Step 4: Analyze database schemas
      const databaseSchemas = await this.extractDatabaseSchemas(relevantFiles);

      // Step 5: Analyze middleware patterns
      const middlewarePatterns = await this.extractMiddlewarePatterns(relevantFiles);

      // Step 6: Analyze security patterns
      const securityPatterns = await this.extractSecurityPatterns(relevantFiles);

      // Step 7: Analyze testing patterns
      const testingPatterns = await this.extractTestingPatterns(relevantFiles);

      const result: Context7ScanResult = {
        relevantFiles,
        codePatterns,
        apiEndpoints,
        databaseSchemas,
        middlewarePatterns,
        securityPatterns,
        testingPatterns
      };

      this.logger.info('✅ Backend pattern scan completed', {
        relevantFiles: relevantFiles.length,
        codePatterns: codePatterns.length,
        apiEndpoints: apiEndpoints.length,
        databaseSchemas: databaseSchemas.length,
        middlewarePatterns: middlewarePatterns.length,
        securityPatterns: securityPatterns.length,
        testingPatterns: testingPatterns.length
      });

      return result;

    } catch (error) {
      this.logger.error('❌ Backend pattern scan failed', { error });
      throw error;
    }
  }

  /**
   * Discover files relevant to the task
   */
  private async discoverRelevantFiles(taskDescription: string): Promise<FileContext[]> {
    const allFiles = await glob(this.config.scanPatterns, {
      cwd: this.config.projectRoot,
      ignore: this.config.ignorePatterns,
      absolute: true
    });

    const relevantFiles: FileContext[] = [];

    for (const filePath of allFiles) {
      try {
        const stats = await fs.stat(filePath);
        
        // Skip files that are too large
        if (stats.size > this.config.maxFileSize!) {
          continue;
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const language = this.detectLanguage(filePath);
        const relevanceScore = this.calculateRelevanceScore(content, taskDescription);

        // Only include files above relevance threshold
        if (relevanceScore >= this.config.relevanceThreshold!) {
          relevantFiles.push({
            filePath: path.relative(this.config.projectRoot, filePath),
            content,
            language,
            relevanceScore,
            lastModified: stats.mtime.toISOString(),
            size: stats.size
          });
        }

      } catch (error) {
        this.logger.warn('⚠️ Failed to process file', { filePath, error });
        continue;
      }
    }

    // Sort by relevance score (highest first)
    return relevantFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Extract general code patterns from files
   */
  private async extractCodePatterns(files: FileContext[]): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    for (const file of files) {
      // Extract function definitions
      const functionMatches = file.content.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*{))/gi);
      for (const match of functionMatches) {
        const functionName = match[1] || match[2];
        if (functionName) {
          patterns.push({
            type: 'utility',
            pattern: match[0],
            description: `Function: ${functionName}`,
            examples: [match[0]],
            filePath: file.filePath,
            lineNumber: this.getLineNumber(file.content, match.index || 0)
          });
        }
      }

      // Extract class definitions
      const classMatches = file.content.matchAll(/class\s+(\w+)([^{]*){/gi);
      for (const match of classMatches) {
        patterns.push({
          type: 'model',
          pattern: match[0],
          description: `Class: ${match[1]}`,
          examples: [match[0]],
          filePath: file.filePath,
          lineNumber: this.getLineNumber(file.content, match.index || 0)
        });
      }

      // Extract import statements
      const importMatches = file.content.matchAll(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/gi);
      for (const match of importMatches) {
        patterns.push({
          type: 'utility',
          pattern: match[0],
          description: `Import: ${match[1]}`,
          examples: [match[0]],
          filePath: file.filePath,
          lineNumber: this.getLineNumber(file.content, match.index || 0)
        });
      }
    }

    return patterns;
  }

  /**
   * Extract API endpoints from files
   */
  private async extractAPIEndpoints(files: FileContext[]): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];

    for (const file of files) {
      for (const pattern of this.backendPatterns.apiEndpoints) {
        const matches = file.content.matchAll(pattern);
        
        for (const match of matches) {
          const method = match[1]?.toUpperCase() as APIEndpoint['method'];
          const path = match[2];
          
          if (method && path) {
            endpoints.push({
              path,
              method,
              handler: this.extractHandlerName(file.content, match.index || 0),
              middleware: this.extractMiddleware(file.content, match.index || 0),
              validation: { schema: {}, options: {} },
              documentation: this.extractDocumentation(file.content, match.index || 0),
              parameters: this.extractParameters(file.content, path),
              responses: this.extractResponses(file.content, match.index || 0)
            });
          }
        }
      }
    }

    return this.deduplicateEndpoints(endpoints);
  }

  /**
   * Extract database schemas from files
   */
  private async extractDatabaseSchemas(files: FileContext[]): Promise<DatabaseSchema[]> {
    const schemas: DatabaseSchema[] = [];

    for (const file of files) {
      for (const pattern of this.backendPatterns.databaseModels) {
        const matches = file.content.matchAll(pattern);
        
        for (const match of matches) {
          const tableName = match[1];
          
          if (tableName) {
            const schema: DatabaseSchema = {
              tableName,
              columns: this.extractColumns(file.content, match.index || 0),
              indexes: [],
              foreignKeys: [],
              constraints: []
            };

            schemas.push(schema);
          }
        }
      }
    }

    return schemas;
  }

  /**
   * Extract middleware patterns from files
   */
  private async extractMiddlewarePatterns(files: FileContext[]): Promise<MiddlewarePattern[]> {
    const patterns: MiddlewarePattern[] = [];

    for (const file of files) {
      for (const pattern of this.backendPatterns.middlewareFunctions) {
        const matches = file.content.matchAll(pattern);
        
        for (const match of matches) {
          const name = match[1] || match[2];
          
          if (name) {
            patterns.push({
              name,
              type: this.classifyMiddlewareType(name, file.content),
              implementation: match[0],
              configuration: {},
              dependencies: this.extractDependencies(file.content)
            });
          }
        }
      }
    }

    return patterns;
  }

  /**
   * Extract security patterns from files
   */
  private async extractSecurityPatterns(files: FileContext[]): Promise<SecurityPattern[]> {
    const patterns: SecurityPattern[] = [];

    for (const file of files) {
      for (const pattern of this.backendPatterns.securityPatterns) {
        const matches = file.content.matchAll(pattern);
        
        for (const match of matches) {
          patterns.push({
            type: this.classifySecurityType(match[0]),
            pattern: match[0],
            description: `Security pattern: ${match[0]}`,
            implementation: this.extractSecurityImplementation(file.content, match.index || 0),
            riskLevel: this.assessRiskLevel(match[0]),
            mitigation: this.suggestMitigation(match[0])
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Extract testing patterns from files
   */
  private async extractTestingPatterns(files: FileContext[]): Promise<TestingPattern[]> {
    const patterns: TestingPattern[] = [];

    for (const file of files) {
      // Look for test files and patterns
      if (file.filePath.includes('test') || file.filePath.includes('spec')) {
        const testMatches = file.content.matchAll(/(describe|it|test)\s*\(['"`]([^'"`]+)['"`]/gi);
        
        for (const match of testMatches) {
          patterns.push({
            type: this.classifyTestType(file.filePath),
            framework: this.detectTestFramework(file.content),
            pattern: match[0],
            description: `Test: ${match[2]}`,
            examples: [match[0]]
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Helper methods
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'tsx',
      '.jsx': 'jsx',
      '.py': 'python',
      '.sql': 'sql',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown'
    };
    return langMap[ext] || 'text';
  }

  private calculateRelevanceScore(content: string, taskDescription: string): number {
    const taskKeywords = taskDescription.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let score = 0;
    let totalKeywords = taskKeywords.length;

    for (const keyword of taskKeywords) {
      if (contentLower.includes(keyword)) {
        score += 1;
      }
    }

    // Boost score for backend-specific patterns
    const backendKeywords = ['api', 'router', 'middleware', 'database', 'model', 'controller', 'service', 'auth'];
    for (const keyword of backendKeywords) {
      if (contentLower.includes(keyword)) {
        score += 0.5;
        totalKeywords += 0.5;
      }
    }

    return totalKeywords > 0 ? score / totalKeywords : 0;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private extractHandlerName(content: string, index: number): string {
    const line = content.split('\n')[this.getLineNumber(content, index) - 1];
    const handlerMatch = line.match(/,\s*(\w+)/);
    return handlerMatch ? handlerMatch[1] : 'anonymous';
  }

  private extractMiddleware(content: string, index: number): string[] {
    // Simple middleware extraction - could be enhanced
    const line = content.split('\n')[this.getLineNumber(content, index) - 1];
    const middlewareMatch = line.match(/\[\s*([^[\]]+)\s*\]/);
    return middlewareMatch ? middlewareMatch[1].split(',').map(m => m.trim()) : [];
  }

  private extractDocumentation(content: string, index: number): string {
    const lines = content.split('\n');
    const currentLine = this.getLineNumber(content, index) - 1;
    
    // Look for JSDoc comments above the endpoint
    let docLines: string[] = [];
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('*') || line.startsWith('/**') || line.startsWith('*/')) {
        docLines.unshift(line);
      } else if (line === '' || line.startsWith('//')) {
        continue;
      } else {
        break;
      }
    }
    
    return docLines.join(' ').replace(/[/*]/g, '').trim();
  }

  private extractParameters(content: string, path: string): any[] {
    const pathParams = path.match(/:(\w+)/g) || [];
    return pathParams.map(param => ({
      name: param.substring(1),
      type: 'string',
      location: 'path',
      required: true,
      description: `Path parameter: ${param}`
    }));
  }

  private extractResponses(content: string, index: number): any[] {
    // Simple response extraction - could be enhanced
    return [
      { statusCode: 200, description: 'Success', schema: {}, examples: [] },
      { statusCode: 400, description: 'Bad Request', schema: {}, examples: [] },
      { statusCode: 500, description: 'Internal Server Error', schema: {}, examples: [] }
    ];
  }

  private extractColumns(content: string, index: number): any[] {
    // Simple column extraction - would need enhancement for real schemas
    return [];
  }

  private extractDependencies(content: string): string[] {
    const imports = content.matchAll(/import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/gi);
    return Array.from(imports).map(match => match[1]);
  }

  private classifyMiddlewareType(name: string, content: string): MiddlewarePattern['type'] {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('auth')) return 'authentication';
    if (nameLower.includes('valid')) return 'validation';
    if (nameLower.includes('log')) return 'logging';
    if (nameLower.includes('error')) return 'error-handling';
    if (nameLower.includes('cors')) return 'cors';
    if (nameLower.includes('rate')) return 'rate-limiting';
    return 'authentication'; // default
  }

  private classifySecurityType(pattern: string): SecurityPattern['type'] {
    const patternLower = pattern.toLowerCase();
    if (patternLower.includes('jwt') || patternLower.includes('token')) return 'authentication';
    if (patternLower.includes('helmet') || patternLower.includes('cors')) return 'input-validation';
    if (patternLower.includes('rate')) return 'rate-limiting';
    if (patternLower.includes('bcrypt') || patternLower.includes('hash')) return 'encryption';
    return 'input-validation';
  }

  private extractSecurityImplementation(content: string, index: number): string {
    const lines = content.split('\n');
    const currentLine = this.getLineNumber(content, index);
    return lines[currentLine - 1] || '';
  }

  private assessRiskLevel(pattern: string): SecurityPattern['riskLevel'] {
    const patternLower = pattern.toLowerCase();
    if (patternLower.includes('password') || patternLower.includes('secret')) return 'high';
    if (patternLower.includes('token') || patternLower.includes('auth')) return 'medium';
    return 'low';
  }

  private suggestMitigation(pattern: string): string[] {
    const patternLower = pattern.toLowerCase();
    if (patternLower.includes('password')) {
      return ['Use strong password hashing (bcrypt, scrypt)', 'Implement password strength requirements'];
    }
    if (patternLower.includes('jwt')) {
      return ['Use secure JWT signing algorithms', 'Implement token expiration', 'Store secrets securely'];
    }
    return ['Follow security best practices', 'Regular security audits'];
  }

  private classifyTestType(filePath: string): TestingPattern['type'] {
    if (filePath.includes('integration')) return 'integration';
    if (filePath.includes('e2e')) return 'e2e';
    if (filePath.includes('load')) return 'load';
    if (filePath.includes('security')) return 'security';
    return 'unit';
  }

  private detectTestFramework(content: string): string {
    if (content.includes('jest')) return 'jest';
    if (content.includes('mocha')) return 'mocha';
    if (content.includes('vitest')) return 'vitest';
    if (content.includes('cypress')) return 'cypress';
    return 'unknown';
  }

  private deduplicateEndpoints(endpoints: APIEndpoint[]): APIEndpoint[] {
    const seen = new Set<string>();
    return endpoints.filter(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Shutdown the scanner
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Context7 Scanner...');
    this.isInitialized = false;
    this.logger.info('✅ Context7 Scanner shut down successfully');
  }
}