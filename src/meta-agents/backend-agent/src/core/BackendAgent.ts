/**
 * Backend Agent - Core Implementation
 * 
 * Intelligent backend development agent with Context7 integration
 * Implements All-Purpose Pattern for unlimited backend development capabilities
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';

import {
  BackendAgentConfig,
  BackendAgentCapabilities,
  BackendAgentStatus,
  BackendTask,
  ProcessingResult,
  BackendEngine,
  UEPContext,
  Context7ScanResult,
  BackendAgentEvents,
  AgentMetrics,
  GeneratedFile
} from '../types/index.js';

import { createLogger } from '../utils/logger.js';
import { Context7ScannerAdapter } from '../adapters/Context7ScannerAdapter.js';
import { UEPWrapper } from './UEPWrapper.js';

/**
 * Main Backend Agent class implementing comprehensive backend development capabilities
 */
export class BackendAgent extends EventEmitter {
  private config: BackendAgentConfig;
  private logger: Logger;
  private isInitialized = false;
  private startTime = Date.now();
  private engines = new Map<string, BackendEngine>();
  private context7Scanner?: Context7ScannerAdapter;
  private uepWrapper?: UEPWrapper;
  private metrics: AgentMetrics;

  constructor(config: Partial<BackendAgentConfig> = {}) {
    super();

    // Default configuration following All-Purpose Pattern (no hardcoded limitations)
    this.config = {
      logLevel: 'info',
      timeout: 30000,
      projectRoot: process.cwd(),
      outputDir: path.join(process.cwd(), 'generated'),
      enableContext7: true,
      enableRAG: true,
      enableUEP: true,
      apiFramework: 'express', // Default, but configurable for any framework
      databaseType: 'postgresql', // Default, but configurable for any database
      authStrategy: 'jwt', // Default, but configurable for any auth strategy
      testFramework: 'jest', // Default, but configurable for any test framework
      ...config
    } as BackendAgentConfig;

    this.logger = createLogger('backend-agent', this.config.logLevel);
    this.metrics = this.initializeMetrics();

    this.logger.info('Backend Agent initialized', {
      config: this.config,
      capabilities: this.getCapabilities()
    });
  }

  /**
   * Initialize the Backend Agent and all its engines
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing Backend Agent...');

      // Initialize Context7 Scanner
      if (this.config.enableContext7) {
        this.context7Scanner = new Context7ScannerAdapter({
          projectRoot: this.config.projectRoot,
          scanPatterns: [
            '**/*.{ts,js,tsx,jsx}',
            '**/api/**/*',
            '**/routes/**/*',
            '**/models/**/*',
            '**/middleware/**/*',
            '**/controllers/**/*',
            '**/services/**/*',
            '**/*.sql',
            '**/migrations/**/*',
            '**/tests/**/*'
          ],
          ignorePatterns: [
            '**/node_modules/**',
            '**/dist/**', 
            '**/build/**',
            '**/.git/**'
          ]
        });
        
        await this.context7Scanner.initialize();
        this.logger.info('✅ Context7 Scanner initialized');
      }

      // Initialize UEP Wrapper
      if (this.config.enableUEP) {
        this.uepWrapper = new UEPWrapper({
          agentId: 'backend-agent',
          agentType: 'domain-specific',
          capabilities: this.getCapabilities()
        });
        
        await this.uepWrapper.initialize();
        this.logger.info('✅ UEP Wrapper initialized');
      }

      // Initialize all engines
      await this.initializeEngines();

      // Create output directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      this.isInitialized = true;
      this.logger.info('🎉 Backend Agent fully initialized');

    } catch (error) {
      this.logger.error('❌ Failed to initialize Backend Agent', { error });
      throw new BackendAgentError(
        `Backend Agent initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Initialize all backend development engines
   */
  private async initializeEngines(): Promise<void> {
    const engineConfigs = [
      { name: 'APIDesignEngine', module: () => import('../engines/APIDesignEngine.js') },
      { name: 'DatabaseSchemaEngine', module: () => import('../engines/DatabaseSchemaEngine.js') },
      { name: 'SecurityAnalysisEngine', module: () => import('../engines/SecurityAnalysisEngine.js') },
      { name: 'TestingFrameworkEngine', module: () => import('../engines/TestingFrameworkEngine.js') },
      { name: 'DocumentationEngine', module: () => import('../engines/DocumentationEngine.js') }
    ];

    for (const engineConfig of engineConfigs) {
      try {
        const EngineModule = await engineConfig.module();
        // Handle double default export from TypeScript compilation
        const EngineClass = (EngineModule as any).default?.default || (EngineModule as any).default;
        const engine = new EngineClass({
          logger: this.logger,
          config: this.config,
          projectRoot: this.config.projectRoot
        });

        await engine.initialize();
        this.engines.set(engineConfig.name, engine);
        
        this.emit('engine-initialized', engineConfig.name);
        this.logger.info(`✅ ${engineConfig.name} initialized`);

      } catch (error) {
        this.logger.warn(`⚠️ Failed to initialize ${engineConfig.name}`, { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        // Continue with other engines - All-Purpose Pattern allows partial functionality
      }
    }
  }

  /**
   * Process a backend development task with full context awareness
   */
  async processTask(taskDescription: string, requirements: any = {}): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      throw new BackendAgentError('Backend Agent not initialized', 'configuration');
    }

    const task: BackendTask = {
      id: uuidv4(),
      type: this.determineTaskType(taskDescription, requirements),
      description: taskDescription,
      requirements,
      context: {} as Context7ScanResult,
      priority: requirements.priority || 'medium',
      status: 'pending'
    };

    try {
      this.logger.info('🔄 Processing backend task', { task });
      this.emit('task-started', task);
      task.status = 'in-progress';

      // Step 1: Scan codebase with Context7 for relevant context
      if (this.config.enableContext7 && this.context7Scanner) {
        this.logger.info('🔍 Scanning codebase for context...');
        task.context = await this.context7Scanner.scanForBackendPatterns(taskDescription);
        this.emit('context-updated', task.context);
        this.logger.info('✅ Context scanning completed', {
          relevantFiles: task.context.relevantFiles?.length || 0,
          patterns: task.context.codePatterns?.length || 0
        });
      }

      // Step 2: Process with appropriate engine
      const engine = this.selectEngine(task.type);
      if (!engine) {
        throw new BackendAgentError(`No suitable engine found for task type: ${task.type}`, 'processing');
      }

      const result = await engine.process(task);
      task.status = 'completed';
      task.result = result;

      // Step 3: Update metrics
      this.updateMetrics(task, result);

      // Step 4: UEP coordination if enabled
      if (this.config.enableUEP && this.uepWrapper) {
        await this.uepWrapper.sendTaskResult(task, result);
      }

      this.emit('task-completed', task, result);
      this.logger.info('✅ Task completed successfully', { taskId: task.id, result });

      return result;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);

      const backendError = error instanceof BackendAgentError ? error : 
        new BackendAgentError(`Task processing failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');

      this.emit('task-failed', task, backendError);
      this.logger.error('❌ Task failed', { task, error: backendError });

      throw backendError;
    }
  }

  /**
   * Write generated files to disk
   */
  private async writeGeneratedFiles(files: GeneratedFile[], baseOutputPath?: string): Promise<void> {
    const outputPath = baseOutputPath || this.config.outputDir;
    
    for (const file of files) {
      try {
        const fullPath = path.join(outputPath, file.path);
        const dirPath = path.dirname(fullPath);
        
        // Ensure directory exists
        await fs.mkdir(dirPath, { recursive: true });
        
        // Write file content
        await fs.writeFile(fullPath, file.content, 'utf8');
        
        this.logger.info(`✅ Written file: ${file.path} (${file.type})`);
        this.emit('file-written', { path: fullPath, type: file.type });
        
      } catch (error) {
        this.logger.error(`❌ Failed to write file: ${file.path}`, { error });
        throw new BackendAgentError(
          `Failed to write file ${file.path}: ${error instanceof Error ? error.message : String(error)}`,
          'processing'
        );
      }
    }
    
    this.logger.info(`✅ Written ${files.length} files to ${outputPath}`);
  }

  /**
   * Generate API endpoints based on requirements
   */
  async generateAPI(requirements: {
    endpoints: any[];
    framework?: string;
    database?: string;
    authentication?: boolean;
    outputPath?: string;
  }): Promise<ProcessingResult> {
    const result = await this.processTask('Generate API endpoints with full implementation', {
      type: 'api-design',
      ...requirements
    });
    
    // Write generated files to disk if successful
    if (result.success && result.generatedFiles && result.generatedFiles.length > 0) {
      await this.writeGeneratedFiles(result.generatedFiles, requirements.outputPath);
    }
    
    return result;
  }

  /**
   * Design database schema with migrations
   */
  async designDatabase(requirements: {
    entities: any[];
    relationships: any[];
    migrations?: boolean;
    database?: string;
    outputPath?: string;
  }): Promise<ProcessingResult> {
    const result = await this.processTask('Design database schema with migrations', {
      type: 'database-design',
      ...requirements
    });
    
    // Write generated files to disk if successful
    if (result.success && result.generatedFiles && result.generatedFiles.length > 0) {
      await this.writeGeneratedFiles(result.generatedFiles, requirements.outputPath);
    }
    
    return result;
  }

  /**
   * Perform security analysis on codebase
   */
  async analyzeSecurity(requirements: {
    scanPaths?: string[];
    rules?: string[];
    severity?: string;
  } = {}): Promise<ProcessingResult> {
    return this.processTask('Perform comprehensive security analysis', {
      type: 'security-analysis',
      ...requirements
    });
  }

  /**
   * Generate comprehensive test suites
   */
  async generateTests(requirements: {
    testTypes?: string[];
    coverage?: number;
    framework?: string;
  } = {}): Promise<ProcessingResult> {
    return this.processTask('Generate comprehensive test suites', {
      type: 'test-generation',
      ...requirements
    });
  }

  /**
   * Generate API documentation
   */
  async generateDocumentation(requirements: {
    format?: string;
    includeExamples?: boolean;
    generateSwagger?: boolean;
  } = {}): Promise<ProcessingResult> {
    return this.processTask('Generate comprehensive API documentation', {
      type: 'documentation',
      ...requirements
    });
  }

  /**
   * Get comprehensive agent status
   */
  getStatus(): BackendAgentStatus {
    return {
      name: 'Backend Agent',
      version: '1.0.0',
      initialized: this.isInitialized,
      uptime: Date.now() - this.startTime,
      config: this.config,
      capabilities: this.getCapabilities(),
      engines: Array.from(this.engines.entries()).map(([name, engine]) => ({
        name,
        initialized: true,
        status: 'active',
        lastActivity: new Date().toISOString(),
        processedTasks: 0,
        errors: 0
      })),
      metrics: this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): BackendAgentCapabilities {
    return {
      apiDesign: {
        restfulEndpoints: true,
        graphqlSchema: true,
        middlewareGeneration: true,
        errorHandling: true,
        inputValidation: true
      },
      database: {
        schemaDesign: true,
        migrationGeneration: true,
        queryOptimization: true,
        relationshipModeling: true,
        ormIntegration: ['Prisma', 'TypeORM', 'Sequelize', 'Mongoose']
      },
      security: {
        authenticationFlow: true,
        authorizationMiddleware: true,
        securityAudit: true,
        rateLimiting: true,
        jwtImplementation: true,
        oauthIntegration: true
      },
      testing: {
        unitTestGeneration: true,
        integrationTests: true,
        mockDataCreation: true,
        apiTesting: true,
        loadTesting: true
      },
      documentation: {
        apiDocumentation: true,
        schemaDocumentation: true,
        deploymentGuides: true,
        swaggerGeneration: true
      }
    };
  }

  /**
   * Shutdown the agent and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Backend Agent...');

    try {
      // Shutdown all engines
      for (const [name, engine] of this.engines) {
        try {
          await engine.shutdown();
          this.logger.info(`✅ ${name} shut down`);
        } catch (error) {
          this.logger.warn(`⚠️ Error shutting down ${name}`, { error });
        }
      }

      // Shutdown UEP wrapper
      if (this.uepWrapper) {
        await this.uepWrapper.shutdown();
      }

      // Shutdown Context7 scanner
      if (this.context7Scanner) {
        await this.context7Scanner.shutdown();
      }

      this.isInitialized = false;
      this.logger.info('✅ Backend Agent shut down successfully');

    } catch (error) {
      this.logger.error('❌ Error during shutdown', { error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private determineTaskType(description: string, requirements: any): BackendTask['type'] {
    if (requirements.type) return requirements.type;
    
    const desc = description.toLowerCase();
    if (desc.includes('api') || desc.includes('endpoint') || desc.includes('route')) return 'api-design';
    if (desc.includes('database') || desc.includes('schema') || desc.includes('model')) return 'database-design';
    if (desc.includes('security') || desc.includes('vulnerability') || desc.includes('auth')) return 'security-analysis';
    if (desc.includes('test') || desc.includes('testing') || desc.includes('spec')) return 'test-generation';
    if (desc.includes('document') || desc.includes('doc') || desc.includes('swagger')) return 'documentation';

    return 'api-design'; // Default
  }

  private selectEngine(taskType: BackendTask['type']): BackendEngine | undefined {
    const engineMap = {
      'api-design': 'APIDesignEngine',
      'database-design': 'DatabaseSchemaEngine',
      'security-analysis': 'SecurityAnalysisEngine',
      'test-generation': 'TestingFrameworkEngine',
      'documentation': 'DocumentationEngine'
    };

    const engineName = engineMap[taskType];
    return engineName ? this.engines.get(engineName) : undefined;
  }

  private initializeMetrics(): AgentMetrics {
    return {
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksFailed: 0,
      averageProcessingTime: 0,
      filesGenerated: 0,
      apiEndpointsCreated: 0,
      databaseSchemasDesigned: 0,
      securityIssuesFound: 0,
      testsGenerated: 0
    };
  }

  private updateMetrics(task: BackendTask, result: ProcessingResult): void {
    if (result.success) {
      this.metrics.tasksCompleted++;
      this.metrics.filesGenerated += result.generatedFiles?.length || 0;

      switch (task.type) {
        case 'api-design':
          this.metrics.apiEndpointsCreated += result.data?.endpoints?.length || 0;
          break;
        case 'database-design':
          this.metrics.databaseSchemasDesigned += result.data?.schemas?.length || 0;
          break;
        case 'security-analysis':
          this.metrics.securityIssuesFound += result.data?.vulnerabilities?.length || 0;
          break;
        case 'test-generation':
          this.metrics.testsGenerated += result.data?.tests?.length || 0;
          break;
      }
    } else {
      this.metrics.tasksFailed++;
    }
  }
}

/**
 * Backend Agent Error class for typed error handling
 */
export class BackendAgentError extends Error {
  public code: string;
  public type: 'configuration' | 'processing' | 'validation' | 'integration' | 'template';
  public details?: any;
  public suggestions?: string[];

  constructor(
    message: string,
    type: 'configuration' | 'processing' | 'validation' | 'integration' | 'template',
    code?: string,
    details?: any,
    suggestions?: string[]
  ) {
    super(message);
    this.name = 'BackendAgentError';
    this.type = type;
    this.code = code || type.toUpperCase();
    this.details = details;
    this.suggestions = suggestions;
  }
}