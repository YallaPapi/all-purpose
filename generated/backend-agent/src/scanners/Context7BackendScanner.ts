/**
 * Context7 Backend Scanner
 * 
 * Integrates Context7 codebase scanning for Backend Agent
 * Identifies existing API patterns, database schemas, and backend conventions
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

interface BackendPatterns {
  apiEndpoints: ApiEndpoint[];
  databaseSchemas: DatabaseSchema[];
  authMiddleware: AuthMiddleware[];
  routePatterns: RoutePattern[];
  securityPatterns: SecurityPattern[];
  testPatterns: TestPattern[];
}

interface ApiEndpoint {
  path: string;
  method: string;
  handler: string;
  middleware: string[];
  validation: any;
  documentation: string;
}

interface DatabaseSchema {
  tableName: string;
  columns: any[];
  relationships: any[];
  indexes: any[];
}

interface AuthMiddleware {
  name: string;
  type: string;
  implementation: string;
}

interface RoutePattern {
  framework: string;
  pattern: string;
  usage: string;
}

interface SecurityPattern {
  type: string;
  implementation: string;
  riskLevel: string;
}

interface TestPattern {
  framework: string;
  type: string;
  pattern: string;
}

/**
 * Context7 Backend Scanner for analyzing existing backend patterns
 */
export class Context7BackendScanner extends EventEmitter {
  private projectRoot: string;
  private scanPatterns: string[];
  private ignorePatterns: string[];
  private isInitialized = false;

  constructor(options: {
    projectRoot: string;
    scanPatterns?: string[];
    ignorePatterns?: string[];
  }) {
    super();
    
    this.projectRoot = options.projectRoot;
    this.scanPatterns = options.scanPatterns || [
      '**/*.{ts,js}',
      '**/api/**/*',
      '**/routes/**/*',
      '**/models/**/*',
      '**/middleware/**/*',
      '**/controllers/**/*',
      '**/services/**/*',
      '**/*.sql',
      '**/migrations/**/*',
      '**/tests/**/*',
      '**/*test*/**/*',
      '**/*spec*'
    ];
    this.ignorePatterns = options.ignorePatterns || [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.git/**'
    ];
  }

  /**
   * Initialize the Context7 Backend Scanner
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 Initializing Context7 Backend Scanner...');
      
      // Validate project root exists
      await fs.access(this.projectRoot);
      
      this.isInitialized = true;
      console.log('✅ Context7 Backend Scanner initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Context7 Backend Scanner', error);
      throw error;
    }
  }

  /**
   * Scan codebase for backend patterns using Context7 insights
   */
  async scanForBackendPatterns(): Promise<BackendPatterns> {
    if (!this.isInitialized) {
      throw new Error('Context7 Backend Scanner not initialized');
    }

    console.log('🔍 Scanning codebase for backend patterns...');

    try {
      const patterns: BackendPatterns = {
        apiEndpoints: [],
        databaseSchemas: [],
        authMiddleware: [],
        routePatterns: [],
        securityPatterns: [],
        testPatterns: []
      };

      // Scan for API endpoints
      patterns.apiEndpoints = await this.scanApiEndpoints();
      
      // Scan for database schemas
      patterns.databaseSchemas = await this.scanDatabaseSchemas();
      
      // Scan for authentication middleware
      patterns.authMiddleware = await this.scanAuthMiddleware();
      
      // Scan for route patterns
      patterns.routePatterns = await this.scanRoutePatterns();
      
      // Scan for security patterns
      patterns.securityPatterns = await this.scanSecurityPatterns();
      
      // Scan for test patterns
      patterns.testPatterns = await this.scanTestPatterns();

      console.log('✅ Backend pattern scanning completed', {
        apiEndpoints: patterns.apiEndpoints.length,
        databaseSchemas: patterns.databaseSchemas.length,
        authMiddleware: patterns.authMiddleware.length,
        routePatterns: patterns.routePatterns.length,
        securityPatterns: patterns.securityPatterns.length,
        testPatterns: patterns.testPatterns.length
      });

      this.emit('scan-completed', patterns);
      return patterns;

    } catch (error) {
      console.error('❌ Backend pattern scanning failed', error);
      this.emit('scan-failed', error);
      throw error;
    }
  }

  /**
   * Scan for API endpoints in the codebase
   */
  private async scanApiEndpoints(): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];
    
    // Look for Express.js route definitions
    const expressRoutes = await this.findFileContents([
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
    ]);

    for (const route of expressRoutes) {
      endpoints.push({
        path: route.path || '',
        method: route.method?.toUpperCase() || 'GET',
        handler: route.handler || 'handler',
        middleware: route.middleware || [],
        validation: route.validation || {},
        documentation: route.documentation || `${route.method} ${route.path}`
      });
    }

    // Look for Next.js API routes
    const nextApiRoutes = await this.findNextApiRoutes();
    endpoints.push(...nextApiRoutes);

    return endpoints;
  }

  /**
   * Scan for database schemas
   */
  private async scanDatabaseSchemas(): Promise<DatabaseSchema[]> {
    const schemas: DatabaseSchema[] = [];
    
    // Look for Prisma schemas
    const prismaSchemas = await this.findFileContents([
      /model\s+(\w+)\s*{([^}]+)}/g
    ]);

    // Look for SQL CREATE TABLE statements
    const sqlSchemas = await this.findFileContents([
      /CREATE\s+TABLE\s+(\w+)\s*\(([^)]+)\)/gi
    ]);

    // Process found schemas
    for (const schema of [...prismaSchemas, ...sqlSchemas]) {
      schemas.push({
        tableName: schema.name || '',
        columns: schema.columns || [],
        relationships: schema.relationships || [],
        indexes: schema.indexes || []
      });
    }

    return schemas;
  }

  /**
   * Scan for authentication middleware
   */
  private async scanAuthMiddleware(): Promise<AuthMiddleware[]> {
    const middleware: AuthMiddleware[] = [];
    
    // Look for JWT middleware
    const jwtMiddleware = await this.findFileContents([
      /jwt\.verify/g,
      /passport\.authenticate/g,
      /authenticateToken/g
    ]);

    for (const auth of jwtMiddleware) {
      middleware.push({
        name: auth.name || 'authMiddleware',
        type: auth.type || 'jwt',
        implementation: auth.implementation || ''
      });
    }

    return middleware;
  }

  /**
   * Scan for route patterns
   */
  private async scanRoutePatterns(): Promise<RoutePattern[]> {
    const patterns: RoutePattern[] = [];
    
    // Detect framework usage
    const frameworks = await this.detectFrameworks();
    
    for (const framework of frameworks) {
      patterns.push({
        framework: framework.name,
        pattern: framework.pattern,
        usage: framework.usage
      });
    }

    return patterns;
  }

  /**
   * Scan for security patterns
   */
  private async scanSecurityPatterns(): Promise<SecurityPattern[]> {
    const patterns: SecurityPattern[] = [];
    
    // Look for security implementations
    const securityPatterns = [
      { pattern: /helmet\(/g, type: 'helmet', riskLevel: 'low' },
      { pattern: /cors\(/g, type: 'cors', riskLevel: 'medium' },
      { pattern: /bcrypt\./g, type: 'password-hashing', riskLevel: 'low' },
      { pattern: /rateLimit/g, type: 'rate-limiting', riskLevel: 'low' }
    ];

    for (const pattern of securityPatterns) {
      const matches = await this.findFileContents([pattern.pattern]);
      if (matches.length > 0) {
        patterns.push({
          type: pattern.type,
          implementation: matches[0]?.implementation || '',
          riskLevel: pattern.riskLevel
        });
      }
    }

    return patterns;
  }

  /**
   * Scan for test patterns
   */
  private async scanTestPatterns(): Promise<TestPattern[]> {
    const patterns: TestPattern[] = [];
    
    // Look for testing frameworks
    const testPatterns = [
      { pattern: /describe\(/g, framework: 'jest', type: 'unit' },
      { pattern: /it\(/g, framework: 'jest', type: 'unit' },
      { pattern: /test\(/g, framework: 'jest', type: 'unit' },
      { pattern: /supertest/g, framework: 'supertest', type: 'integration' }
    ];

    for (const pattern of testPatterns) {
      const matches = await this.findFileContents([pattern.pattern]);
      if (matches.length > 0) {
        patterns.push({
          framework: pattern.framework,
          type: pattern.type,
          pattern: matches[0]?.pattern || ''
        });
      }
    }

    return patterns;
  }

  /**
   * Helper method to find file contents matching patterns
   */
  private async findFileContents(patterns: RegExp[]): Promise<any[]> {
    // This would integrate with the actual Context7 scanning results
    // For now, return mock data based on the Context7 scan results we received
    return [
      {
        name: 'defaultEndpoint',
        path: '/api/test',
        method: 'GET',
        handler: 'testHandler',
        middleware: ['cors'],
        validation: {},
        documentation: 'Test endpoint'
      }
    ];
  }

  /**
   * Find Next.js API routes
   */
  private async findNextApiRoutes(): Promise<ApiEndpoint[]> {
    const routes: ApiEndpoint[] = [];
    
    // Look for pages/api or app/api directories
    const apiDirs = [
      path.join(this.projectRoot, 'pages', 'api'),
      path.join(this.projectRoot, 'app', 'api')
    ];

    for (const apiDir of apiDirs) {
      try {
        await fs.access(apiDir);
        const files = await this.scanDirectory(apiDir, /\.(ts|js)$/);
        
        for (const file of files) {
          const relativePath = path.relative(apiDir, file);
          const routePath = '/' + relativePath.replace(/\.(ts|js)$/, '').replace(/\\/g, '/');
          
          routes.push({
            path: routePath,
            method: 'GET', // Next.js routes can handle multiple methods
            handler: 'nextApiHandler',
            middleware: [],
            validation: {},
            documentation: `Next.js API route: ${routePath}`
          });
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    return routes;
  }

  /**
   * Detect backend frameworks in use
   */
  private async detectFrameworks(): Promise<any[]> {
    const frameworks = [];
    
    // Check package.json for dependencies
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (dependencies.express) {
        frameworks.push({
          name: 'Express.js',
          pattern: 'app.METHOD(path, handler)',
          usage: 'REST API endpoints'
        });
      }
      
      if (dependencies.fastify) {
        frameworks.push({
          name: 'Fastify',
          pattern: 'fastify.METHOD(path, handler)',
          usage: 'High-performance REST API'
        });
      }
      
      if (dependencies.next) {
        frameworks.push({
          name: 'Next.js',
          pattern: 'pages/api/[...].ts',
          usage: 'Full-stack React framework API routes'
        });
      }
      
    } catch (error) {
      console.warn('Could not analyze package.json for framework detection');
    }

    return frameworks;
  }

  /**
   * Recursively scan directory for files
   */
  private async scanDirectory(dir: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath, pattern);
          files.push(...subFiles);
        } else if (pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory access error, skip
    }
    
    return files;
  }

  /**
   * Get scanner status
   */
  getStatus(): any {
    return {
      name: 'Context7BackendScanner',
      initialized: this.isInitialized,
      projectRoot: this.projectRoot,
      scanPatterns: this.scanPatterns.length,
      ignorePatterns: this.ignorePatterns.length
    };
  }

  /**
   * Shutdown the scanner
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Context7 Backend Scanner...');
    this.isInitialized = false;
    console.log('✅ Context7 Backend Scanner shut down successfully');
  }
}

export default Context7BackendScanner;