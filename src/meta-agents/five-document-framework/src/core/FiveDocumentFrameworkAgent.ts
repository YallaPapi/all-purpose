#!/usr/bin/env node

/**
 * Five Document Framework Agent - The Systematizer
 * 
 * This meta-agent implements systematic documentation generation by:
 * 1. Analyzing project structure and configuration
 * 2. Generating the 5 core documents using dynamic templates
 * 3. Validating cross-document consistency 
 * 4. Integrating with other meta-agents for unified workflow
 * 
 * Architecture Pattern: Analyze → Generate → Validate → Integrate
 * Integration: TaskMaster API, Context7, PRD-Parser, Scaffold-Generator
 * 
 * Following All-Purpose Pattern: NO hardcoded limitations on project types
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import Handlebars from 'handlebars';
import { glob } from 'glob';
import semver from 'semver';
import yaml from 'yaml';

import {
  ProjectConfig,
  DocumentGenerationConfig,
  DocumentGenerationResult,
  DocumentResult,
  GenerationError,
  ConsistencyCheck,
  TemplateContext,
  FiveDocumentFrameworkConfig,
  MetaAgentIntegration
} from '../types/index.js';

import { TemplateEngine } from './TemplateEngine.js';
import { ConsistencyValidator } from './ConsistencyValidator.js';
import { ProjectAnalyzer } from './ProjectAnalyzer.js';

/**
 * Five Document Framework Agent - Generates systematic documentation
 * NO limitations on project types, technologies, or configurations
 */
export class FiveDocumentFrameworkAgent extends EventEmitter {
  private config: FiveDocumentFrameworkConfig;
  private templateEngine: TemplateEngine;
  private consistencyValidator: ConsistencyValidator;
  private projectAnalyzer: ProjectAnalyzer;
  private isInitialized: boolean = false;

  // Core documents that are always generated
  private readonly coreDocuments = [
    'CHANGELOG.md',
    'ENVIRONMENT_SETUP.md', 
    'DEBUGGING_GUIDE.md',
    'PARAMETER_MAPPING.md',
    'README-task-master.md'
  ];

  constructor(config: FiveDocumentFrameworkConfig) {
    super();
    
    // All-Purpose Pattern: NO hardcoded defaults, unlimited configuration
    this.config = {
      ...config, // Start with provided config
      projectConfig: config.projectConfig || {},
      generationConfig: config.generationConfig || {},
      templateDir: config.templateDir || path.join(process.cwd(), 'templates'),
      outputDir: config.outputDir || process.cwd(),
      validateConsistency: config.validateConsistency !== false // Default to true
    };

    this.templateEngine = new TemplateEngine({
      templateDir: this.config.templateDir!,
      projectConfig: this.config.projectConfig
    });
    
    this.consistencyValidator = new ConsistencyValidator();
    this.projectAnalyzer = new ProjectAnalyzer();
  }

  /**
   * Initialize the agent - Context7 enhanced setup
   */
  async initialize(): Promise<void> {
    try {
      this.emit('agent:initializing', {
        agent: 'Five-Document-Framework',
        config: this.config,
        timestamp: new Date().toISOString()
      });

      // Ensure output directory exists
      await fs.ensureDir(this.config.outputDir!);

      // Initialize template engine with custom templates
      await this.templateEngine.initialize();

      // Register Handlebars helpers for document generation
      this.registerHandlebarsHelpers();

      this.isInitialized = true;

      this.emit('agent:initialized', {
        agent: 'Five-Document-Framework',
        capabilities: this.getCapabilities(),
        timestamp: new Date().toISOString()
      });

      console.log(chalk.green('📚 Five Document Framework Agent initialized successfully'));
      console.log(chalk.blue(`📁 Output: ${this.config.outputDir}`));
      console.log(chalk.blue(`📄 Templates: ${this.config.templateDir}`));
      
    } catch (error: any) {
      this.emit('agent:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate documentation framework - main entry point
   */
  async generate(input?: {
    projectOverride?: ProjectConfig;
    generationOverride?: DocumentGenerationConfig;
    documentsToGenerate?: string[];
    validateOnly?: boolean;
  }): Promise<DocumentGenerationResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.emit('generation:start', {
        input,
        timestamp: new Date().toISOString()
      });

      // Step 1: Analyze project structure and configuration
      console.log(chalk.blue('🔍 Analyzing project structure...'));
      const projectConfig = input?.projectOverride || 
                           await this.projectAnalyzer.analyzeProject(this.config.outputDir!) ||
                           this.config.projectConfig;

      const generationConfig = input?.generationOverride || this.config.generationConfig;

      // Step 2: Generate template context
      const templateContext = this.createTemplateContext(projectConfig, generationConfig);

      // Step 3: Generate documents
      console.log(chalk.blue('📝 Generating documentation framework...'));
      const documentsToGenerate = input?.documentsToGenerate || this.coreDocuments;
      const documentResults: DocumentResult[] = [];
      const errors: GenerationError[] = [];

      for (const documentType of documentsToGenerate) {
        try {
          const result = await this.generateDocument(documentType, templateContext);
          documentResults.push(result);
          
          console.log(chalk.green(`✅ Generated: ${documentType}`));
          
          // Emit event for real-time progress
          this.emit('document:generated', { documentType, result });
          
        } catch (error: any) {
          const generationError: GenerationError = {
            documentType,
            error: error.message,
            severity: 'error',
            suggestion: `Check template for ${documentType} and ensure all required variables are provided`
          };
          errors.push(generationError);
          
          console.log(chalk.red(`❌ Failed to generate: ${documentType} - ${error.message}`));
        }
      }

      // Step 4: Validate consistency if enabled
      let consistencyCheck: ConsistencyCheck | undefined;
      if (this.config.validateConsistency && !input?.validateOnly) {
        console.log(chalk.blue('🔍 Validating document consistency...'));
        consistencyCheck = await this.consistencyValidator.validate(
          documentResults.map(r => r.filePath),
          templateContext
        );
      }

      const totalTime = Date.now() - startTime;
      
      const result: DocumentGenerationResult = {
        success: errors.length === 0,
        documentsGenerated: documentResults,
        errors,
        warnings: consistencyCheck?.crossReferences
          .filter(ref => !ref.isValid)
          .map(ref => `Cross-reference issue: ${ref.sourceDocument} → ${ref.targetDocument}`) || [],
        performance: {
          totalTime,
          documentsProcessed: documentResults.length,
          templatesUsed: new Set(documentResults.map(r => r.templateUsed)).size
        }
      };

      this.emit('generation:complete', {
        result,
        timestamp: new Date().toISOString()
      });

      console.log(chalk.green(`🎉 Framework generation complete in ${totalTime}ms`));
      console.log(chalk.blue(`📊 Documents generated: ${documentResults.length}`));
      if (errors.length > 0) {
        console.log(chalk.red(`⚠️  Errors: ${errors.length}`));
      }

      return result;

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      
      this.emit('generation:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        documentsGenerated: [],
        errors: [{
          documentType: 'system',
          error: error.message,
          severity: 'error'
        }],
        warnings: [],
        performance: {
          totalTime,
          documentsProcessed: 0,
          templatesUsed: 0
        }
      };
    }
  }

  /**
   * Generate individual document
   */
  private async generateDocument(
    documentType: string, 
    context: TemplateContext
  ): Promise<DocumentResult> {
    const templateName = this.getTemplateName(documentType);
    const outputPath = path.join(this.config.outputDir!, documentType);

    // Check if document exists and should be backed up
    if (await fs.pathExists(outputPath) && this.config.generationConfig.backupExisting) {
      await this.backupExistingDocument(outputPath);
    }

    // Generate document content
    const content = await this.templateEngine.render(templateName, context);
    
    // Write document
    await fs.writeFile(outputPath, content, 'utf8');
    
    // Get file stats
    const stats = await fs.stat(outputPath);
    
    return {
      documentType,
      filePath: outputPath,
      templateUsed: templateName,
      variablesApplied: this.extractVariables(context),
      size: stats.size,
      lastModified: stats.mtime
    };
  }

  /**
   * Create template context with all necessary data
   */
  private createTemplateContext(
    projectConfig: ProjectConfig, 
    generationConfig: DocumentGenerationConfig
  ): TemplateContext {
    const timestamp = new Date();
    
    return {
      project: projectConfig,
      generation: generationConfig,
      timestamp,
      version: projectConfig.version || '1.0.0',
      
      helpers: {
        formatDate: (date: Date) => date.toISOString().split('T')[0],
        capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
        slugify: (str: string) => str.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        joinArray: (arr: string[], separator = ', ') => arr.join(separator),
        hasProperty: (obj: any, prop: string) => obj && Object.prototype.hasOwnProperty.call(obj, prop),
        // Add more helpers as needed - UNLIMITED helper functions
      },
      
      computed: {
        hasEnvironments: !!(projectConfig.environments && Object.keys(projectConfig.environments).length > 0),
        hasIntegrations: !!(projectConfig.integrations && Object.keys(projectConfig.integrations).length > 0),
        hasCustomSections: !!(generationConfig.documents && Object.keys(generationConfig.documents).length > 0),
        technologyList: this.extractTechnologies(projectConfig),
        environmentList: Object.keys(projectConfig.environments || {}),
        // Add more computed values as needed - UNLIMITED computed values
      }
    };
  }

  /**
   * Extract technologies from project config
   */
  private extractTechnologies(config: ProjectConfig): string[] {
    const technologies: string[] = [];
    
    if (config.technologies) {
      Object.values(config.technologies).forEach(techArray => {
        if (Array.isArray(techArray)) {
          technologies.push(...techArray);
        }
      });
    }
    
    return [...new Set(technologies)].sort();
  }

  /**
   * Get template name for document type
   */
  private getTemplateName(documentType: string): string {
    const templateMap: Record<string, string> = {
      'CHANGELOG.md': 'changelog.hbs',
      'ENVIRONMENT_SETUP.md': 'environment-setup.hbs', 
      'DEBUGGING_GUIDE.md': 'debugging-guide.hbs',
      'PARAMETER_MAPPING.md': 'parameter-mapping.hbs',
      'README-task-master.md': 'readme-taskmaster.hbs'
    };
    
    return templateMap[documentType] || `${documentType.toLowerCase().replace(/\\.md$/, '')}.hbs`;
  }

  /**
   * Backup existing document
   */
  private async backupExistingDocument(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    await fs.copy(filePath, backupPath);
    console.log(chalk.yellow(`📋 Backed up: ${path.basename(filePath)} → ${path.basename(backupPath)}`));
  }

  /**
   * Extract variables used in template context
   */
  private extractVariables(context: TemplateContext): Record<string, any> {
    return {
      projectName: context.project.name,
      projectVersion: context.project.version,
      timestamp: context.timestamp,
      hasEnvironments: context.computed.hasEnvironments,
      hasIntegrations: context.computed.hasIntegrations,
      technologyCount: context.computed.technologyList.length
    };
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Date formatting
    Handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toISOString().split('T')[0];
    });

    // String manipulation
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('slugify', (str: string) => {
      return str.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    });

    // Array operations
    Handlebars.registerHelper('joinArray', (arr: string[], separator = ', ') => {
      return Array.isArray(arr) ? arr.join(separator) : '';
    });

    // Conditional helpers
    Handlebars.registerHelper('hasProperty', function(obj: any, prop: string) {
      return obj && Object.prototype.hasOwnProperty.call(obj, prop);
    });

    Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    // Technical helpers
    Handlebars.registerHelper('versionBump', (version: string, type: 'patch' | 'minor' | 'major' = 'patch') => {
      return semver.inc(version, type) || version;
    });

    // All-Purpose Pattern: Support for unlimited custom helpers
    Handlebars.registerHelper('getProperty', function(obj: any, prop: string) {
      return obj && obj[prop] !== undefined ? obj[prop] : '';
    });
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): Record<string, any> {
    return {
      name: 'Five Document Framework Agent',
      version: '1.0.0',
      documents: this.coreDocuments,
      features: [
        'Systematic documentation generation',
        'Cross-document consistency validation',
        'Template-driven content creation',
        'Project structure analysis',
        'Meta-agent integration',
        'All-Purpose Pattern compliance'
      ],
      integrations: ['TaskMaster', 'Context7', 'PRD-Parser', 'Scaffold-Generator'],
      templateFormats: ['Handlebars', 'Mustache'],
      outputFormats: ['Markdown', 'YAML', 'JSON'],
      performance: {
        maxDocuments: 'unlimited',
        maxTemplateSize: 'unlimited',
        concurrentGeneration: true
      }
    };
  }
}

export default FiveDocumentFrameworkAgent;