/**
 * Frontend Agent - Core Implementation
 * 
 * Intelligent frontend development agent with Context7 integration
 * Implements All-Purpose Pattern for unlimited frontend development capabilities
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';

import {
  FrontendAgentConfig,
  FrontendAgentCapabilities,
  FrontendAgentStatus,
  FrontendTask,
  ProcessingResult,
  FrontendEngine,
  UEPContext,
  Context7ScanResult,
  FrontendAgentEvents,
  AgentMetrics
} from '../types/index.js';

import { createLogger } from '../utils/logger.js';
import { Context7ScannerAdapter } from '../adapters/Context7ScannerAdapter.js';
import { RealUEPWrapper } from './RealUEPWrapper.js';

/**
 * Main Frontend Agent class implementing comprehensive frontend development capabilities
 */
export class FrontendAgent extends EventEmitter {
  private config: FrontendAgentConfig;
  private logger: Logger;
  private isInitialized = false;
  private startTime = Date.now();
  private engines = new Map<string, FrontendEngine>();
  private context7Scanner?: Context7ScannerAdapter;
  private uepWrapper?: RealUEPWrapper;
  private metrics: AgentMetrics;

  constructor(config: Partial<FrontendAgentConfig> = {}) {
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
      uiFramework: 'react', // Default, but configurable for any framework
      cssFramework: 'tailwind', // Default, but configurable for any CSS approach
      stateManagement: 'redux', // Default, but configurable for any state solution
      testFramework: 'jest', // Default, but configurable for any test framework
      ...config
    } as FrontendAgentConfig;

    this.logger = createLogger('frontend-agent', this.config.logLevel);
    this.metrics = this.initializeMetrics();

    this.logger.info('Frontend Agent initialized', {
      config: this.config,
      capabilities: this.getCapabilities()
    });
  }

  /**
   * Initialize the Frontend Agent and all its engines
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing Frontend Agent...');

      // Initialize Context7 Scanner for frontend patterns
      if (this.config.enableContext7) {
        this.context7Scanner = new Context7ScannerAdapter({
          projectRoot: this.config.projectRoot,
          scanPatterns: [
            '**/*.{tsx,jsx,ts,js}',
            '**/*.{vue,svelte}',
            '**/*.{css,scss,sass,less}',
            '**/components/**/*',
            '**/pages/**/*',
            '**/styles/**/*',
            '**/hooks/**/*',
            '**/utils/**/*',
            '**/store/**/*',
            '**/state/**/*',
            '**/tests/**/*'
          ],
          ignorePatterns: [
            '**/node_modules/**',
            '**/dist/**', 
            '**/build/**',
            '**/.next/**',
            '**/.nuxt/**',
            '**/.git/**'
          ]
        });
        
        await this.context7Scanner.initialize();
        this.logger.info('✅ Context7 Scanner initialized');
      }

      // Initialize REAL UEP Wrapper
      if (this.config.enableUEP) {
        this.uepWrapper = new RealUEPWrapper({
          agentId: 'frontend-agent',
          agentType: 'domain-specific',
          capabilities: this.getCapabilities(),
          natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
          enableRealTimeUpdates: true,
          enableTaskDistribution: true
        });
        
        await this.uepWrapper.initialize();
        
        // Setup task assignment handler for UEP messages
        this.uepWrapper.on('task-assigned', (task: FrontendTask) => {
          // Process task automatically when received via UEP
          this.processTask(task.description, task.requirements);
        });
        
        this.logger.info('✅ REAL UEP Wrapper (Frontend Agent) initialized');
      }

      // Initialize all engines
      await this.initializeEngines();

      // Create output directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      this.isInitialized = true;
      this.logger.info('🎉 Frontend Agent fully initialized');

    } catch (error) {
      this.logger.error('❌ Failed to initialize Frontend Agent', { error });
      throw new FrontendAgentError(
        `Frontend Agent initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Initialize all frontend development engines
   */
  private async initializeEngines(): Promise<void> {
    const engineConfigs = [
      { name: 'ComponentGeneratorEngine', path: '../engines/ComponentGeneratorEngine.js' },
      { name: 'UIDesignEngine', path: '../engines/UIDesignEngine.js' },
      { name: 'StateManagementEngine', path: '../engines/StateManagementEngine.js' },
      { name: 'PerformanceOptimizationEngine', path: '../engines/PerformanceOptimizationEngine.js' },
      { name: 'AccessibilityEngine', path: '../engines/AccessibilityEngine.js' }
    ];

    for (const engineConfig of engineConfigs) {
      try {
        const EngineClass = await import(engineConfig.path);
        const engine = new EngineClass.default({
          logger: this.logger,
          config: this.config,
          projectRoot: this.config.projectRoot
        });

        await engine.initialize();
        this.engines.set(engineConfig.name, engine);
        
        this.emit('engine-initialized', engineConfig.name);
        this.logger.info(`✅ ${engineConfig.name} initialized`);

      } catch (error) {
        this.logger.warn(`⚠️ Failed to initialize ${engineConfig.name}`, { error });
        // Continue with other engines - All-Purpose Pattern allows partial functionality
      }
    }
  }

  /**
   * Process a frontend development task with full context awareness
   */
  async processTask(taskDescription: string, requirements: any = {}): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      throw new FrontendAgentError('Frontend Agent not initialized', 'configuration');
    }

    const task: FrontendTask = {
      id: uuidv4(),
      type: this.determineTaskType(taskDescription, requirements),
      description: taskDescription,
      requirements,
      context: {} as Context7ScanResult,
      priority: (requirements.priority as 'low' | 'medium' | 'high' | 'critical') || 'medium',
      status: 'pending'
    };

    try {
      this.logger.info('🔄 Processing frontend task', { task });
      this.emit('task-started', task);
      task.status = 'in-progress';

      // Step 1: Scan codebase with Context7 for relevant context
      if (this.config.enableContext7 && this.context7Scanner) {
        this.logger.info('🔍 Scanning codebase for frontend context...');
        task.context = await this.context7Scanner.scanForFrontendPatterns(taskDescription);
        this.emit('context-updated', task.context);
        this.logger.info('✅ Context scanning completed', {
          relevantFiles: task.context.relevantFiles?.length || 0,
          patterns: task.context.codePatterns?.length || 0
        });
      }

      // Step 2: Process with appropriate engine
      const engine = this.selectEngine(task.type);
      if (!engine) {
        throw new FrontendAgentError(`No suitable engine found for task type: ${task.type}`, 'processing');
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

      const frontendError = error instanceof FrontendAgentError ? error : 
        new FrontendAgentError(`Task processing failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');

      this.emit('task-failed', task, frontendError);
      this.logger.error('❌ Task failed', { task, error: frontendError });

      throw frontendError;
    }
  }

  /**
   * Generate React/Vue/Angular components
   */
  async generateComponents(requirements: {
    framework: string;
    components: any[];
    styling?: string;
    typescript?: boolean;
  }): Promise<ProcessingResult> {
    return this.processTask('Generate UI components with modern patterns', {
      type: 'component-generation',
      ...requirements
    });
  }

  /**
   * Design UI/UX with responsive layouts
   */
  async designUI(requirements: {
    layouts: any[];
    responsive?: boolean;
    accessibility?: boolean;
    cssFramework?: string;
  }): Promise<ProcessingResult> {
    return this.processTask('Design responsive UI with accessibility', {
      type: 'ui-design',
      ...requirements
    });
  }

  /**
   * Setup state management
   */
  async setupStateManagement(requirements: {
    stateLibrary?: string;
    patterns?: string[];
    middleware?: string[];
  } = {}): Promise<ProcessingResult> {
    return this.processTask('Setup state management architecture', {
      type: 'state-management',
      ...requirements
    });
  }

  /**
   * Optimize frontend performance
   */
  async optimizePerformance(requirements: {
    optimizations?: string[];
    bundleAnalysis?: boolean;
    codesplitting?: boolean;
  } = {}): Promise<ProcessingResult> {
    return this.processTask('Optimize frontend performance and bundle size', {
      type: 'performance-optimization',
      ...requirements
    });
  }

  /**
   * Implement accessibility features
   */
  async implementAccessibility(requirements: {
    wcagLevel?: string;
    screenReader?: boolean;
    keyboardNavigation?: boolean;
  } = {}): Promise<ProcessingResult> {
    return this.processTask('Implement comprehensive accessibility features', {
      type: 'accessibility',
      ...requirements
    });
  }

  /**
   * Get comprehensive agent status
   */
  getStatus(): FrontendAgentStatus {
    return {
      name: 'Frontend Agent',
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
  getCapabilities(): FrontendAgentCapabilities {
    return {
      componentGeneration: {
        reactComponents: true,
        vueComponents: true,
        angularComponents: true,
        svelteComponents: true,
        customHooks: true,
        storybook: true
      },
      uiDesign: {
        responsiveDesign: true,
        themingSystem: true,
        designTokens: true,
        componentLibrary: true,
        accessibilityCompliance: true
      },
      stateManagement: {
        globalState: true,
        localState: true,
        asyncDataFetching: true,
        caching: true,
        optimisticUpdates: true
      },
      performance: {
        codesplitting: true,
        lazyLoading: true,
        bundleOptimization: true,
        imageOptimization: true,
        criticalCss: true
      },
      testing: {
        unitTests: true,
        integrationTests: true,
        e2eTests: true,
        visualRegression: true,
        accessibilityTests: true
      }
    };
  }

  /**
   * Shutdown the agent and cleanup resources
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Frontend Agent...');

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
      this.logger.info('✅ Frontend Agent shut down successfully');

    } catch (error) {
      this.logger.error('❌ Error during shutdown', { error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private determineTaskType(description: string, requirements: any): FrontendTask['type'] {
    if (requirements.type) return requirements.type;
    
    const desc = description.toLowerCase();
    if (desc.includes('component') || desc.includes('react') || desc.includes('vue')) return 'component-generation';
    if (desc.includes('ui') || desc.includes('design') || desc.includes('layout')) return 'ui-design';
    if (desc.includes('state') || desc.includes('redux') || desc.includes('store')) return 'state-management';
    if (desc.includes('performance') || desc.includes('optimize') || desc.includes('bundle')) return 'performance-optimization';
    if (desc.includes('accessibility') || desc.includes('a11y') || desc.includes('wcag')) return 'accessibility';

    return 'component-generation'; // Default
  }

  private selectEngine(taskType: FrontendTask['type']): FrontendEngine | undefined {
    const engineMap: Record<string, string> = {
      'component-generation': 'ComponentGeneratorEngine',
      'ui-design': 'UIDesignEngine',
      'state-management': 'StateManagementEngine',
      'performance-optimization': 'PerformanceOptimizationEngine',
      'accessibility': 'AccessibilityEngine',
      'generate-component': 'ComponentGeneratorEngine',
      'design-ui': 'UIDesignEngine',
      'setup-state': 'StateManagementEngine',
      'optimize-performance': 'PerformanceOptimizationEngine',
      'write-tests': 'AccessibilityEngine'
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
      testsGenerated: 0,
      componentsCreated: 0,
      layoutsDesigned: 0,
      performanceOptimizations: 0,
      accessibilityImprovements: 0
    };
  }

  private updateMetrics(task: FrontendTask, result: ProcessingResult): void {
    if (result.success) {
      this.metrics.tasksCompleted++;
      this.metrics.filesGenerated += result.generatedFiles?.length || 0;

      switch (task.type) {
        case 'component-generation':
          this.metrics.componentsCreated += result.data?.components?.length || 0;
          break;
        case 'ui-design':
          this.metrics.layoutsDesigned += result.data?.layouts?.length || 0;
          break;
        case 'performance-optimization':
          this.metrics.performanceOptimizations += result.data?.optimizations?.length || 0;
          break;
        case 'accessibility':
          this.metrics.accessibilityImprovements += result.data?.improvements?.length || 0;
          break;
      }
    } else {
      this.metrics.tasksFailed++;
    }
  }
}

/**
 * Frontend Agent Error class for typed error handling
 */
export class FrontendAgentError extends Error {
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
    this.name = 'FrontendAgentError';
    this.type = type;
    this.code = code || type.toUpperCase();
    this.details = details;
    this.suggestions = suggestions;
  }
}

