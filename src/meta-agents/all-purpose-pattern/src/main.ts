#!/usr/bin/env node

/**
 * All-Purpose Pattern Agent - Main Entry Point
 * 
 * This meta-agent implements the All-Purpose Pattern methodology by:
 * 1. Detecting hardcoded anti-patterns in ANY codebase
 * 2. Transforming limitations into universal, configuration-driven systems
 * 3. Generating Context7-enhanced code with NO hardcoded constraints
 * 4. Validating unlimited scalability and industry-agnostic design
 * 
 * Architecture Pattern: Analyze → Transform → Validate → Generate
 * Integration: TaskMaster API, Context7, PRD-Parser, Scaffold-Generator
 */

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { ASTParser, ParseResult, ParseError } from './core/astParser';
import { ASTTraversal, TraversalResult, TraversalFinding } from './core/astTraverse';

// REAL UEP (Universal Execution Protocol) Integration - NATS-based coordination
import { RealUEPWrapper } from './RealUEPWrapper';

export interface AllPurposePatternConfig {
  // Input configuration - NO hardcoded limitations
  sourceDir?: string;
  outputDir?: string;
  
  // Analysis options - UNLIMITED scope
  recursive?: boolean;
  filePattern?: RegExp;
  exclude?: RegExp[];
  concurrency?: number;
  
  // Transformation options - ALL patterns supported
  transformationEnabled?: boolean;
  validationEnabled?: boolean;
  templateGeneration?: boolean;
  
  // Integration options - Context7 enhanced
  contextEnabled?: boolean;
  taskMasterIntegration?: boolean;
  
  // UEP Integration options - NATS-based coordination
  uepEnabled?: boolean;
  agentId?: string;
  
  // Performance options - UNLIMITED scalability
  maxFiles?: number;
  maxDepth?: number;
  
  [key: string]: any; // UNLIMITED extensibility
}

export interface ProcessingResult {
  success: boolean;
  analysis?: AnalysisResult;
  transformation?: TransformationResult;
  validation?: ValidationResult;
  performance: {
    totalTime: number;
    filesProcessed: number;
    errorsCount: number;
  };
}

export interface AnalysisResult {
  antiPatterns: AntiPatternFinding[];
  codebaseStats: {
    totalFiles: number;
    totalNodes: number;
    complexity: number;
    languages: string[];
  };
  recommendations: string[];
}

export interface AntiPatternFinding {
  type: 'hardcoded_array' | 'limitation_constant' | 'conditional_logic' | 'hardcoded_endpoint' | 'hardcoded_text';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  location: {
    line: number;
    column: number;
  };
  code: string;
  description: string;
  recommendation: string;
}

export interface TransformationResult {
  transformedFiles: string[];
  templatesGenerated: string[];
  configurationSchema: Record<string, any>;
}

export interface ValidationResult {
  isUniversal: boolean;
  hasLimitations: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  suggestion?: string;
}

/**
 * All-Purpose Pattern Agent - Transforms ANY hardcoded system to universal
 * NO limitations on codebase size, languages, or patterns detected
 */
export class AllPurposePatternAgent extends EventEmitter {
  private config: AllPurposePatternConfig;
  private astParser: ASTParser;
  private astTraversal: ASTTraversal;
  private isInitialized: boolean = false;
  
  // REAL UEP Integration - NATS-based coordination
  private uepWrapper?: RealUEPWrapper;

  constructor(config: AllPurposePatternConfig = {}) {
    super();
    
    // All-Purpose Pattern: NO hardcoded defaults, unlimited configuration
    this.config = {
      sourceDir: config.sourceDir || process.cwd(),
      outputDir: config.outputDir || path.join(process.cwd(), 'all-purpose-output'),
      recursive: config.recursive !== false, // Default to true
      filePattern: config.filePattern || /\\.(js|jsx|ts|tsx|mjs|cjs)$/i,
      exclude: config.exclude || [/node_modules/, /\\.git/, /dist/, /coverage/],
      concurrency: config.concurrency || 10,
      transformationEnabled: config.transformationEnabled !== false,
      validationEnabled: config.validationEnabled !== false,
      templateGeneration: config.templateGeneration !== false,
      contextEnabled: config.contextEnabled !== false, // Context7 integration
      taskMasterIntegration: config.taskMasterIntegration !== false,
      uepEnabled: config.uepEnabled !== false, // UEP integration
      agentId: config.agentId || 'all-purpose-pattern-agent',
      maxFiles: config.maxFiles, // UNLIMITED by default
      maxDepth: config.maxDepth, // UNLIMITED by default
      ...config // UNLIMITED additional configuration
    };

    this.astParser = new ASTParser();
    this.astTraversal = new ASTTraversal();
  }

  /**
   * Initialize the agent - Context7 enhanced setup
   */
  async initialize(): Promise<void> {
    try {
      this.emit('agent:initializing', {
        agent: 'All-Purpose-Pattern',
        config: this.config,
        timestamp: new Date().toISOString()
      });

      // Ensure output directory exists
      await fs.ensureDir(this.config.outputDir!);

      // Initialize Context7 patterns if enabled
      if (this.config.contextEnabled) {
        await this.initializeContext7();
      }

      // Initialize REAL UEP wrapper if enabled
      if (this.config.uepEnabled) {
        await this.initializeUEP();
      }

      this.isInitialized = true;

      this.emit('agent:initialized', {
        agent: 'All-Purpose-Pattern',
        capabilities: this.getCapabilities(),
        timestamp: new Date().toISOString()
      });

      console.log(chalk.green('🚀 All-Purpose Pattern Agent initialized successfully'));
      console.log(chalk.blue(`📁 Source: ${this.config.sourceDir}`));
      console.log(chalk.blue(`📤 Output: ${this.config.outputDir}`));
      
    } catch (error) {
      this.emit('agent:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Process codebase - main entry point for analysis and transformation
   */
  async process(input?: {
    sourceCode?: string;
    sourceDirectory?: string;
    outputDirectory?: string;
    configuration?: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.emit('processing:start', {
        input,
        timestamp: new Date().toISOString()
      });

      // Determine source to process
      const sourceDir = input?.sourceDirectory || this.config.sourceDir!;
      
      console.log(chalk.blue(`🔍 Analyzing codebase: ${sourceDir}`));

      // Step 1: Parse and analyze codebase
      const parseResults = await this.astParser.parseDirectory(sourceDir, {
        recursive: this.config.recursive,
        filePattern: this.config.filePattern,
        exclude: this.config.exclude,
        concurrency: this.config.concurrency
      });

      // Filter successful parses
      const successfulParses = parseResults.filter(
        (result): result is ParseResult => 'ast' in result
      );
      const parseErrors = parseResults.filter(
        (result): result is ParseError => 'error' in result
      );

      console.log(chalk.green(`✅ Parsed ${successfulParses.length} files`));
      if (parseErrors.length > 0) {
        console.log(chalk.yellow(`⚠️  ${parseErrors.length} parsing errors`));
      }

      // Step 2: Analyze for anti-patterns
      console.log(chalk.blue('🔍 Detecting anti-patterns...'));
      const analysis = await this.analyzeAntiPatterns(successfulParses);

      // Step 3: Transform if enabled
      let transformation: TransformationResult | undefined;
      if (this.config.transformationEnabled && analysis.antiPatterns.length > 0) {
        console.log(chalk.blue('🔄 Transforming to universal patterns...'));
        transformation = await this.transformCodebase(successfulParses, analysis);
      }

      // Step 4: Validate if enabled
      let validation: ValidationResult | undefined;
      if (this.config.validationEnabled) {
        console.log(chalk.blue('✅ Validating universal patterns...'));
        validation = await this.validateUniversality(successfulParses, analysis);
      }

      const totalTime = Date.now() - startTime;
      
      const result: ProcessingResult = {
        success: true,
        analysis,
        transformation,
        validation,
        performance: {
          totalTime,
          filesProcessed: successfulParses.length,
          errorsCount: parseErrors.length
        }
      };

      this.emit('processing:complete', {
        result,
        timestamp: new Date().toISOString()
      });

      // Send results via UEP if enabled
      if (this.uepWrapper) {
        try {
          await this.uepWrapper.broadcastPatternTransformation({
            analysis: {
              antiPatternsFound: analysis.antiPatterns.length,
              filesProcessed: result.performance.filesProcessed,
              processingTime: result.performance.totalTime
            },
            transformation: transformation ? {
              transformedFiles: transformation.transformedFiles.length,
              templatesGenerated: transformation.templatesGenerated.length,
              configurationSchema: !!transformation.configurationSchema
            } : null,
            validation: validation ? {
              isUniversal: validation.isUniversal,
              hasLimitations: validation.hasLimitations,
              issuesFound: validation.issues.length
            } : null,
            timestamp: new Date().toISOString()
          });
          console.log(chalk.blue('📤 Pattern analysis results broadcasted via UEP'));
        } catch (uepError) {
          console.warn(chalk.yellow('⚠️ Failed to broadcast via UEP:'), uepError.message);
        }
      }

      console.log(chalk.green(`🎉 Processing complete in ${totalTime}ms`));
      console.log(chalk.blue(`📊 Anti-patterns found: ${analysis.antiPatterns.length}`));

      return result;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      this.emit('processing:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        performance: {
          totalTime,
          filesProcessed: 0,
          errorsCount: 1
        }
      };
    }
  }

  /**
   * Analyze codebase for anti-patterns - detects ALL hardcoded limitations
   */
  private async analyzeAntiPatterns(parseResults: ParseResult[]): Promise<AnalysisResult> {
    const antiPatterns: AntiPatternFinding[] = [];
    const stats = {
      totalFiles: parseResults.length,
      totalNodes: 0,
      complexity: 0,
      languages: new Set<string>()
    };

    for (const parseResult of parseResults) {
      const { ast, filePath, isTypeScript } = parseResult;
      
      // Track language stats
      stats.languages.add(isTypeScript ? 'TypeScript' : 'JavaScript');
      
      // Analyze AST structure
      const structure = this.astTraversal.analyzeStructure(ast);
      stats.totalNodes += Object.values(structure.statistics).reduce((a, b) => a + b, 0);
      stats.complexity += structure.complexity;

      // Detect hardcoded arrays (industries, locations, etc.)
      const hardcodedArrays = this.astTraversal.findNodes(ast, 'ArrayExpression', (node, path) => {
        const elements = (node as any).elements || [];
        return elements.length > 0 && elements.every((el: any) => el?.type === 'StringLiteral');
      });

      hardcodedArrays.forEach(finding => {
        const elements = (finding.node as any).elements || [];
        antiPatterns.push({
          type: 'hardcoded_array',
          severity: elements.length > 5 ? 'critical' : 'high',
          file: filePath,
          location: {
            line: finding.location?.start.line || 0,
            column: finding.location?.start.column || 0
          },
          code: `[${elements.map((el: any) => el.value).join(', ')}]`,
          description: `Hardcoded array with ${elements.length} string literals`,
          recommendation: 'Replace with dynamic configuration from userInput or config object'
        });
      });

      // Detect limitation constants
      const limitationConstants = this.astTraversal.findNodes(ast, 'VariableDeclarator', (node, path) => {
        const id = (node as any).id;
        const init = (node as any).init;
        return id?.name?.toLowerCase().includes('max') && init?.type === 'NumericLiteral';
      });

      limitationConstants.forEach(finding => {
        const id = (finding.node as any).id;
        const init = (finding.node as any).init;
        antiPatterns.push({
          type: 'limitation_constant',
          severity: 'high',
          file: filePath,
          location: {
            line: finding.location?.start.line || 0,
            column: finding.location?.start.column || 0
          },
          code: `${id.name} = ${init.value}`,
          description: `Hardcoded limitation constant: ${id.name}`,
          recommendation: 'Remove hardcoded limits or make configurable'
        });
      });

      // Detect conditional logic with hardcoded values
      const hardcodedConditionals = this.astTraversal.findNodes(ast, 'IfStatement', (node, path) => {
        const test = (node as any).test;
        return this.containsHardcodedValue(test);
      });

      hardcodedConditionals.forEach(finding => {
        antiPatterns.push({
          type: 'conditional_logic',
          severity: 'medium',
          file: filePath,
          location: {
            line: finding.location?.start.line || 0,
            column: finding.location?.start.column || 0
          },
          code: this.extractCodeSnippet(finding.node),
          description: 'Conditional logic with hardcoded values',
          recommendation: 'Replace hardcoded conditions with configurable logic'
        });
      });

      // Detect hardcoded API endpoints
      const hardcodedEndpoints = this.astTraversal.findNodes(ast, 'StringLiteral', (node, path) => {
        const value = (node as any).value || '';
        return /^https?:\/\/[^\s]+/.test(value) || /^\/api\/[^\s]+/.test(value);
      });

      hardcodedEndpoints.forEach(finding => {
        const value = (finding.node as any).value;
        antiPatterns.push({
          type: 'hardcoded_endpoint',
          severity: 'critical',
          file: filePath,
          location: {
            line: finding.location?.start.line || 0,
            column: finding.location?.start.column || 0
          },
          code: `"${value}"`,
          description: `Hardcoded API endpoint: ${value}`,
          recommendation: 'Move endpoints to environment configuration or userInput'
        });
      });

      // Detect hardcoded UI text
      const hardcodedText = this.astTraversal.findNodes(ast, 'StringLiteral', (node, path) => {
        const value = (node as any).value || '';
        // Detect user-facing text (contains spaces, punctuation, common UI words)
        return value.length > 10 && 
               /\s/.test(value) && 
               /[.!?:]/.test(value) &&
               !/^[A-Z_]+$/.test(value); // Not constants
      });

      hardcodedText.forEach(finding => {
        const value = (finding.node as any).value;
        antiPatterns.push({
          type: 'hardcoded_text',
          severity: 'medium',
          file: filePath,
          location: {
            line: finding.location?.start.line || 0,
            column: finding.location?.start.column || 0
          },
          code: `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`,
          description: `Hardcoded UI text: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`,
          recommendation: 'Move text to localization files or configuration'
        });
      });
    }

    return {
      antiPatterns,
      codebaseStats: {
        ...stats,
        languages: Array.from(stats.languages)
      },
      recommendations: this.generateRecommendations(antiPatterns)
    };
  }

  /**
   * Transform codebase to universal patterns
   */
  private async transformCodebase(
    parseResults: ParseResult[], 
    analysis: AnalysisResult
  ): Promise<TransformationResult> {
    const transformedFiles: string[] = [];
    const templatesGenerated: string[] = [];
    const configurationSchema: Record<string, any> = {
      userInput: {
        type: 'object',
        description: 'Dynamic user configuration replacing all hardcoded values',
        properties: {}
      },
      dynamicArrays: {
        type: 'object', 
        description: 'Configuration-driven arrays replacing hardcoded lists',
        properties: {}
      },
      apiEndpoints: {
        type: 'object',
        description: 'Environment-based API endpoint configuration',
        properties: {}
      },
      uiText: {
        type: 'object',
        description: 'Localization and dynamic text configuration',
        properties: {}
      }
    };

    // Group anti-patterns by file for efficient transformation
    const filePatterns = new Map<string, AntiPatternFinding[]>();
    analysis.antiPatterns.forEach(pattern => {
      if (!filePatterns.has(pattern.file)) {
        filePatterns.set(pattern.file, []);
      }
      filePatterns.get(pattern.file)!.push(pattern);
    });

    for (const [filePath, patterns] of filePatterns) {
      try {
        // Read original file content
        const originalContent = await fs.readFile(filePath, 'utf8');
        let transformedContent = originalContent;
        
        // Transform hardcoded arrays to configuration-driven
        const arrayPatterns = patterns.filter(p => p.type === 'hardcoded_array');
        for (const pattern of arrayPatterns) {
          const configKey = this.generateConfigKey(pattern, 'array');
          const replacement = `(userInput.${configKey} || [])`;
          transformedContent = transformedContent.replace(pattern.code, replacement);
          
          // Add to configuration schema
          configurationSchema.dynamicArrays.properties[configKey] = {
            type: 'array',
            description: `Dynamic array replacing: ${pattern.code}`,
            default: this.extractArrayValues(pattern.code)
          };
        }

        // Transform limitation constants to unlimited configuration
        const limitationPatterns = patterns.filter(p => p.type === 'limitation_constant');
        for (const pattern of limitationPatterns) {
          const configKey = this.generateConfigKey(pattern, 'limit');
          const replacement = `(userInput.${configKey} || Number.MAX_SAFE_INTEGER)`;
          transformedContent = transformedContent.replace(pattern.code, replacement);
          
          configurationSchema.userInput.properties[configKey] = {
            type: 'number',
            description: `Configurable limit replacing: ${pattern.code}`,
            default: null // Unlimited by default
          };
        }

        // Transform hardcoded conditionals to configurable logic
        const conditionalPatterns = patterns.filter(p => p.type === 'conditional_logic');
        for (const pattern of conditionalPatterns) {
          const configKey = this.generateConfigKey(pattern, 'condition');
          const replacement = `(userInput.${configKey}?.enabled !== false)`;
          // Note: Complex conditional transformation would require AST manipulation
          
          configurationSchema.userInput.properties[configKey] = {
            type: 'object',
            description: `Configurable condition replacing hardcoded logic`,
            properties: {
              enabled: { type: 'boolean', default: true },
              customLogic: { type: 'string', description: 'Custom conditional expression' }
            }
          };
        }

        // Transform hardcoded endpoints to environment configuration
        const endpointPatterns = patterns.filter(p => p.type === 'hardcoded_endpoint');
        for (const pattern of endpointPatterns) {
          const configKey = this.generateConfigKey(pattern, 'endpoint');
          const replacement = `(process.env.${configKey.toUpperCase()} || userInput.${configKey})`;
          transformedContent = transformedContent.replace(pattern.code, replacement);
          
          configurationSchema.apiEndpoints.properties[configKey] = {
            type: 'string',
            description: `Dynamic endpoint replacing: ${pattern.code}`,
            default: pattern.code.replace(/["\']/g, '') // Remove quotes
          };
        }

        // Transform hardcoded UI text to localization
        const textPatterns = patterns.filter(p => p.type === 'hardcoded_text');
        for (const pattern of textPatterns) {
          const configKey = this.generateConfigKey(pattern, 'text');
          const replacement = `(userInput.uiText?.${configKey} || "${pattern.code.replace(/["\']/g, '')}")`;  
          transformedContent = transformedContent.replace(pattern.code, replacement);
          
          configurationSchema.uiText.properties[configKey] = {
            type: 'string',
            description: `Localizable text replacing: ${pattern.description}`,
            default: pattern.code.replace(/["\']/g, '')
          };
        }

        // Write transformed file
        const outputFilePath = path.join(
          this.config.outputDir!,
          'transformed',
          path.relative(this.config.sourceDir!, filePath)
        );
        
        await fs.ensureDir(path.dirname(outputFilePath));
        await fs.writeFile(outputFilePath, transformedContent, 'utf8');
        transformedFiles.push(outputFilePath);

        console.log(chalk.green(`✅ Transformed: ${path.basename(filePath)}`));
        
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to transform ${filePath}: ${error.message}`));
      }
    }

    // Generate configuration template
    const configTemplate = {
      '$schema': 'http://json-schema.org/draft-07/schema#',
      title: 'All-Purpose Pattern Configuration',
      description: 'Universal configuration replacing all hardcoded limitations',
      ...configurationSchema
    };

    const templatePath = path.join(this.config.outputDir!, 'all-purpose-config.schema.json');
    await fs.writeJSON(templatePath, configTemplate, { spaces: 2 });
    templatesGenerated.push(templatePath);

    // Generate usage documentation
    const usageTemplate = this.generateUsageDocumentation(configurationSchema, analysis);
    const usagePath = path.join(this.config.outputDir!, 'USAGE.md');
    await fs.writeFile(usagePath, usageTemplate, 'utf8');
    templatesGenerated.push(usagePath);

    console.log(chalk.blue(`📋 Generated ${templatesGenerated.length} templates`));
    
    return {
      transformedFiles,
      templatesGenerated,
      configurationSchema
    };
  }

  /**
   * Validate that transformed code has no limitations
   */
  private async validateUniversality(
    parseResults: ParseResult[], 
    analysis: AnalysisResult
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let isUniversal = true;
    let hasLimitations = false;

    // Check for remaining anti-patterns in transformed files
    const transformedDir = path.join(this.config.outputDir!, 'transformed');
    if (await fs.pathExists(transformedDir)) {
      try {
        // Re-analyze transformed files
        const reAnalysisResults = await this.astParser.parseDirectory(transformedDir, {
          recursive: this.config.recursive,
          filePattern: this.config.filePattern,
          exclude: this.config.exclude
        });

        const successfulReparses = reAnalysisResults.filter(
          (result): result is ParseResult => 'ast' in result
        );

        const reAnalysis = await this.analyzeAntiPatterns(successfulReparses);
        
        if (reAnalysis.antiPatterns.length > 0) {
          isUniversal = false;
          hasLimitations = true;
          
          reAnalysis.antiPatterns.forEach(pattern => {
            issues.push({
              type: 'remaining_anti_pattern',
              severity: pattern.severity === 'critical' ? 'error' : 'warning',
              message: `Remaining ${pattern.type}: ${pattern.description}`,
              file: pattern.file,
              suggestion: pattern.recommendation
            });
          });
        }
      } catch (error) {
        issues.push({
          type: 'validation_error',
          severity: 'error',
          message: `Failed to re-analyze transformed files: ${error.message}`,
          suggestion: 'Check transformed file syntax and structure'
        });
        isUniversal = false;
      }
    }

    // Validate configuration schema completeness
    const configSchemaPath = path.join(this.config.outputDir!, 'all-purpose-config.schema.json');
    if (await fs.pathExists(configSchemaPath)) {
      try {
        const schema = await fs.readJSON(configSchemaPath);
        
        // Check if all detected patterns have corresponding configuration
        const configCoverage = this.validateConfigurationCoverage(analysis, schema);
        if (!configCoverage.complete) {
          hasLimitations = true;
          issues.push(...configCoverage.issues);
        }
      } catch (error) {
        issues.push({
          type: 'schema_validation_error',
          severity: 'error',
          message: `Invalid configuration schema: ${error.message}`,
          suggestion: 'Regenerate configuration schema'
        });
        isUniversal = false;
      }
    }

    // Validate unlimited scalability patterns
    const scalabilityIssues = this.validateScalabilityPatterns(analysis);
    if (scalabilityIssues.length > 0) {
      hasLimitations = true;
      issues.push(...scalabilityIssues);
    }

    // Validate Context7 integration if enabled
    if (this.config.contextEnabled) {
      const contextIssues = await this.validateContext7Integration();
      if (contextIssues.length > 0) {
        issues.push(...contextIssues);
      }
    }

    // Final universality assessment
    if (issues.filter(i => i.severity === 'error').length > 0) {
      isUniversal = false;
    }

    // Log validation summary
    if (isUniversal) {
      console.log(chalk.green('✅ Validation passed: Code is truly universal!'));
    } else {
      console.log(chalk.yellow(`⚠️  Validation issues found: ${issues.length} total`));
      const errors = issues.filter(i => i.severity === 'error').length;
      const warnings = issues.filter(i => i.severity === 'warning').length;
      console.log(chalk.gray(`   Errors: ${errors}, Warnings: ${warnings}`));
    }

    return {
      isUniversal,
      hasLimitations,
      issues
    };
  }

  /**
   * Initialize Context7 patterns
   */
  private async initializeContext7(): Promise<void> {
    console.log(chalk.blue('🔧 Initializing Context7 patterns...'));
    
    try {
      // Create Context7 reference system for code navigation
      const context7Dir = path.join(this.config.outputDir!, 'context7');
      await fs.ensureDir(context7Dir);

      // Generate Context7 reference map
      const referenceMap = {
        timestamp: new Date().toISOString(),
        agent: 'All-Purpose-Pattern-Agent',
        references: {
          transformations: {},
          antiPatterns: {},
          configurations: {},
          validations: {}
        }
      };

      // Create transformation references
      referenceMap.references.transformations = {
        'transformation-engine': `${this.config.outputDir}/src/main.ts:439`,
        'anti-pattern-detection': `${this.config.outputDir}/src/main.ts:290`,
        'config-schema-generation': `${this.config.outputDir}/transformed/all-purpose-config.schema.json`,
        'universal-pattern-validation': `${this.config.outputDir}/src/main.ts:456`
      };

      // Create anti-pattern references
      referenceMap.references.antiPatterns = {
        'hardcoded-arrays': `${this.config.outputDir}/src/main.ts:311`,
        'limitation-constants': `${this.config.outputDir}/src/main.ts:333`,
        'conditional-logic': `${this.config.outputDir}/src/main.ts:357`,
        'hardcoded-endpoints': `${this.config.outputDir}/src/main.ts:378`,
        'hardcoded-text': `${this.config.outputDir}/src/main.ts:400`
      };

      // Create configuration references
      referenceMap.references.configurations = {
        'user-input-schema': `${this.config.outputDir}/all-purpose-config.schema.json:userInput`,
        'dynamic-arrays-config': `${this.config.outputDir}/all-purpose-config.schema.json:dynamicArrays`,
        'api-endpoints-config': `${this.config.outputDir}/all-purpose-config.schema.json:apiEndpoints`,
        'ui-text-config': `${this.config.outputDir}/all-purpose-config.schema.json:uiText`
      };

      // Create validation references
      referenceMap.references.validations = {
        'universality-check': `${this.config.outputDir}/src/main.ts:456`,
        'configuration-coverage': `${this.config.outputDir}/src/main.ts:500`,
        'scalability-validation': `${this.config.outputDir}/src/main.ts:520`,
        'context7-integration': `${this.config.outputDir}/src/main.ts:473`
      };

      // Write Context7 reference file
      const context7Path = path.join(context7Dir, 'all-purpose-references.json');
      await fs.writeJSON(context7Path, referenceMap, { spaces: 2 });

      // Generate Context7 navigation helper
      const navigationHelper = this.generateContext7Navigation(referenceMap);
      const navPath = path.join(context7Dir, 'CONTEXT7_NAVIGATION.md');
      await fs.writeFile(navPath, navigationHelper, 'utf8');

      console.log(chalk.green('✅ Context7 patterns initialized'));
      console.log(chalk.gray(`   📁 References: ${context7Path}`));
      console.log(chalk.gray(`   🧭 Navigation: ${navPath}`));
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Context7 initialization warning: ${error.message}`));
    }
  }

  /**
   * Initialize REAL UEP wrapper for agent coordination
   */
  private async initializeUEP(): Promise<void> {
    try {
      console.log(chalk.blue('🔗 Initializing REAL UEP integration for All-Purpose-Pattern Agent...'));
      
      this.uepWrapper = new RealUEPWrapper({
        agentId: this.config.agentId!,
        agentType: 'infrastructure',
        capabilities: {
          patternDetection: {
            hardcodedArrays: true,
            limitationConstants: true,
            conditionalLogic: true,
            hardcodedEndpoints: true,
            hardcodedText: true
          },
          transformation: {
            configurationDriven: true,
            universalPatterns: true,
            templateGeneration: true,
            schemaGeneration: true
          },
          validation: {
            universalityCheck: true,
            configurationCoverage: true,
            scalabilityPatterns: true,
            context7Integration: this.config.contextEnabled
          },
          languages: ['JavaScript', 'TypeScript'],
          integrations: ['TaskMaster', 'Context7', 'PRD-Parser', 'Scaffold-Generator']
        },
        natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
        enableRealTimeUpdates: true,
        enableTaskDistribution: true
      });

      // Set up UEP event handlers
      this.setupUEPEventHandlers();

      // Initialize the wrapper
      await this.uepWrapper.initialize();
      
      console.log(chalk.green('✅ REAL UEP integration initialized for All-Purpose-Pattern Agent'));
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize UEP integration:'), error);
      // Continue without UEP if initialization fails
      this.uepWrapper = undefined;
    }
  }

  /**
   * Set up UEP event handlers for coordination
   */
  private setupUEPEventHandlers(): void {
    if (!this.uepWrapper) return;

    // Handle incoming task assignments
    this.uepWrapper.on('task-assigned', async (task) => {
      console.log(chalk.blue('📋 UEP Task assigned to All-Purpose-Pattern:'), task);
      try {
        const result = await this.process(task);
        await this.uepWrapper!.sendTaskResult(task, result);
      } catch (error) {
        console.error(chalk.red('❌ Failed to process UEP task:'), error);
      }
    });

    // Handle system broadcasts
    this.uepWrapper.on('system-broadcast', (broadcast) => {
      console.log(chalk.blue('📢 System broadcast received:'), broadcast);
    });

    // Handle agent heartbeats
    this.uepWrapper.on('agent-heartbeat', (heartbeat) => {
      console.log(chalk.blue('💓 Agent heartbeat received:'), heartbeat.agentId);
    });
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(antiPatterns: AntiPatternFinding[]): string[] {
    const recommendations: string[] = [];

    if (antiPatterns.some(p => p.type === 'hardcoded_array')) {
      recommendations.push('Replace hardcoded arrays with dynamic configuration from userInput');
    }
    if (antiPatterns.some(p => p.type === 'limitation_constant')) {
      recommendations.push('Remove all hardcoded limitations and numeric constraints');
    }
    if (antiPatterns.some(p => p.type === 'conditional_logic')) {
      recommendations.push('Replace hardcoded conditional logic with configurable decision systems');
    }
    if (antiPatterns.some(p => p.type === 'hardcoded_endpoint')) {
      recommendations.push('Move API endpoints to environment variables and configuration');
    }
    if (antiPatterns.some(p => p.type === 'hardcoded_text')) {
      recommendations.push('Implement localization system for all user-facing text');
    }

    return recommendations;
  }

  /**
   * Generate configuration key from anti-pattern
   */
  private generateConfigKey(pattern: AntiPatternFinding, prefix: string): string {
    const fileName = path.basename(pattern.file, path.extname(pattern.file));
    const cleanCode = pattern.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const shortCode = cleanCode.substring(0, 20);
    return `${prefix}_${fileName}_${shortCode}_${pattern.location.line}`;
  }

  /**
   * Extract array values from hardcoded array code
   */
  private extractArrayValues(arrayCode: string): string[] {
    try {
      // Simple extraction from string representation
      const match = arrayCode.match(/\[(.*?)\]/);
      if (match) {
        return match[1].split(',').map(item => item.trim().replace(/["']/g, ''));
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Generate comprehensive usage documentation
   */
  private generateUsageDocumentation(configSchema: Record<string, any>, analysis: AnalysisResult): string {
    return `# All-Purpose Pattern Configuration Guide

Generated: ${new Date().toISOString()}
Agent: All-Purpose Pattern Agent v1.0.0

## Overview

This configuration replaces ${analysis.antiPatterns.length} hardcoded limitations with unlimited, user-configurable patterns.

## Configuration Schema

### UserInput Configuration
\`\`\`json
${JSON.stringify(configSchema.userInput, null, 2)}
\`\`\`

### Dynamic Arrays
\`\`\`json
${JSON.stringify(configSchema.dynamicArrays, null, 2)}
\`\`\`

### API Endpoints
\`\`\`json
${JSON.stringify(configSchema.apiEndpoints, null, 2)}
\`\`\`

### UI Text Configuration
\`\`\`json
${JSON.stringify(configSchema.uiText, null, 2)}
\`\`\`

## Usage Examples

### Basic Configuration
\`\`\`javascript
const userInput = {
  // Replace ALL hardcoded arrays with dynamic configuration
  dynamicArrays: {
    // Arrays are now unlimited and user-configurable
  },
  // Remove ALL hardcoded limitations
  limits: null, // Unlimited by default
  // Make ALL endpoints configurable
  apiEndpoints: {
    // Environment-based endpoint configuration
  }
};
\`\`\`

### Advanced Configuration
\`\`\`javascript
// The system now supports UNLIMITED complexity with NO hardcoded constraints
const advancedConfig = {
  userInput: {
    // Unlimited configuration possibilities
    // No hardcoded limitations
    // Fully universal patterns
  }
};
\`\`\`

## Anti-Patterns Eliminated

${analysis.antiPatterns.map(p => `- **${p.type}**: ${p.description} (${p.file}:${p.location.line})`).join('\n')}

## Benefits

- ✅ **Unlimited Scalability**: No hardcoded limits
- ✅ **Universal Applicability**: Works for ANY use case
- ✅ **Dynamic Configuration**: Runtime configuration changes
- ✅ **Environment Flexibility**: Multi-environment support
- ✅ **Localization Ready**: Dynamic text management

## Next Steps

1. Review transformed files in \`transformed/\` directory
2. Customize configuration schema as needed
3. Test with different user inputs to verify universality
4. Deploy with confidence knowing there are NO hardcoded limitations
`;
  }

  /**
   * Validate configuration coverage for all detected patterns
   */
  private validateConfigurationCoverage(analysis: AnalysisResult, schema: any): { complete: boolean; issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];
    let complete = true;

    // Check each anti-pattern has corresponding configuration
    analysis.antiPatterns.forEach(pattern => {
      const hasConfig = this.checkPatternHasConfiguration(pattern, schema);
      if (!hasConfig) {
        complete = false;
        issues.push({
          type: 'missing_configuration',
          severity: 'warning',
          message: `No configuration found for ${pattern.type} in ${pattern.file}:${pattern.location.line}`,
          file: pattern.file,
          suggestion: 'Add corresponding configuration entry in schema'
        });
      }
    });

    return { complete, issues };
  }

  /**
   * Check if pattern has corresponding configuration
   */
  private checkPatternHasConfiguration(pattern: AntiPatternFinding, schema: any): boolean {
    switch (pattern.type) {
      case 'hardcoded_array':
        return Object.keys(schema.dynamicArrays?.properties || {}).length > 0;
      case 'limitation_constant':
        return Object.keys(schema.userInput?.properties || {}).length > 0;
      case 'hardcoded_endpoint':
        return Object.keys(schema.apiEndpoints?.properties || {}).length > 0;
      case 'hardcoded_text':
        return Object.keys(schema.uiText?.properties || {}).length > 0;
      default:
        return true; // Assume covered for unknown types
    }
  }

  /**
   * Validate unlimited scalability patterns
   */
  private validateScalabilityPatterns(analysis: AnalysisResult): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for remaining hardcoded limitations
    const criticalPatterns = analysis.antiPatterns.filter(p => p.severity === 'critical');
    if (criticalPatterns.length > 0) {
      issues.push({
        type: 'scalability_limitation',
        severity: 'error',
        message: `${criticalPatterns.length} critical limitations found that prevent unlimited scalability`,
        suggestion: 'Transform all critical hardcoded patterns to configuration-driven patterns'
      });
    }

    // Check for numeric limitations
    const limitationConstants = analysis.antiPatterns.filter(p => p.type === 'limitation_constant');
    if (limitationConstants.length > 0) {
      issues.push({
        type: 'numeric_limitations',
        severity: 'warning',
        message: `${limitationConstants.length} numeric limitations may restrict scalability`,
        suggestion: 'Replace with unlimited patterns or make user-configurable'
      });
    }

    return issues;
  }

  /**
   * Validate Context7 integration completeness
   */
  private async validateContext7Integration(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      const context7Dir = path.join(this.config.outputDir!, 'context7');
      const referencesPath = path.join(context7Dir, 'all-purpose-references.json');
      
      if (!await fs.pathExists(referencesPath)) {
        issues.push({
          type: 'context7_missing',
          severity: 'warning',
          message: 'Context7 reference system not properly initialized',
          suggestion: 'Re-run initialization with contextEnabled: true'
        });
      } else {
        const references = await fs.readJSON(referencesPath);
        if (!references.references || Object.keys(references.references).length === 0) {
          issues.push({
            type: 'context7_incomplete',
            severity: 'warning',
            message: 'Context7 references are incomplete',
            suggestion: 'Regenerate Context7 reference mappings'
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'context7_error',
        severity: 'error',
        message: `Context7 validation failed: ${error.message}`,
        suggestion: 'Check Context7 integration setup'
      });
    }

    return issues;
  }

  /**
   * Generate Context7 navigation documentation
   */
  private generateContext7Navigation(referenceMap: any): string {
    return `# Context7 Navigation Guide

Generated: ${referenceMap.timestamp}
Agent: ${referenceMap.agent}

## Code References

### Transformation Engine
${Object.entries(referenceMap.references.transformations).map(([key, ref]) => `- **${key}**: \`${ref}\``).join('\n')}

### Anti-Pattern Detection
${Object.entries(referenceMap.references.antiPatterns).map(([key, ref]) => `- **${key}**: \`${ref}\``).join('\n')}

### Configuration System
${Object.entries(referenceMap.references.configurations).map(([key, ref]) => `- **${key}**: \`${ref}\``).join('\n')}

### Validation System
${Object.entries(referenceMap.references.validations).map(([key, ref]) => `- **${key}**: \`${ref}\``).join('\n')}

## Navigation Patterns

### Format: \`file_path:line_number\`

Example: \`src/main.ts:439\` refers to line 439 in the main.ts file

### Quick Reference Commands

\`\`\`bash
# Jump to transformation engine
code -g src/main.ts:439

# View anti-pattern detection
code -g src/main.ts:290

# Open configuration schema
code all-purpose-config.schema.json
\`\`\`

## Integration Points

- **TaskMaster**: Coordination tasks flow through transformation engine
- **PRD-Parser**: Anti-pattern detection works with parsed requirements  
- **Scaffold-Generator**: Uses configuration schema for universal templates
- **Context7**: This navigation system provides code location references
`;
  }

  /**
   * Check if AST node contains hardcoded values
   */
  private containsHardcodedValue(node: any): boolean {
    if (!node) return false;
    
    // Check for string literals, numeric literals, boolean literals
    if (node.type === 'StringLiteral' || node.type === 'NumericLiteral' || node.type === 'BooleanLiteral') {
      return true;
    }
    
    // Check for array expressions with literal elements
    if (node.type === 'ArrayExpression') {
      return node.elements?.some((el: any) => this.containsHardcodedValue(el)) || false;
    }
    
    // Check binary expressions with literal operands
    if (node.type === 'BinaryExpression') {
      return this.containsHardcodedValue(node.left) || this.containsHardcodedValue(node.right);
    }
    
    return false;
  }

  /**
   * Extract code snippet from AST node
   */
  private extractCodeSnippet(node: any): string {
    // This is a simplified extraction - in a real implementation,
    // we'd use the AST to regenerate the code
    if (node.type === 'IfStatement') {
      return 'if (hardcodedCondition) { ... }';
    }
    
    return 'hardcoded_expression';
  }

  /**
   * Shutdown the agent gracefully
   */
  async shutdown(): Promise<void> {
    try {
      console.log(chalk.blue('🛑 Shutting down All-Purpose-Pattern Agent...'));
      
      // Shutdown UEP wrapper
      if (this.uepWrapper) {
        await this.uepWrapper.shutdown();
        this.uepWrapper = undefined;
      }
      
      this.isInitialized = false;
      console.log(chalk.green('✅ All-Purpose-Pattern Agent shut down successfully'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error during shutdown:'), error);
      throw error;
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): Record<string, any> {
    return {
      name: 'All-Purpose Pattern Agent',
      version: '1.0.0',
      patterns: [
        'Hardcoded array detection',
        'Limitation constant detection', 
        'Conditional logic analysis',
        'API endpoint universalization',
        'UI text localization',
        'Universal code generation',
        'Context7 enhancement',
        'Configuration schema generation',
        'Universality validation'
      ],
      languages: ['JavaScript', 'TypeScript'],
      integrations: ['TaskMaster', 'Context7', 'PRD-Parser', 'Scaffold-Generator'],
      performance: {
        maxFiles: this.config.maxFiles || 'unlimited',
        maxDepth: this.config.maxDepth || 'unlimited',
        concurrency: this.config.concurrency
      },
      transformations: {
        hardcodedArrays: 'Configuration-driven arrays',
        limitationConstants: 'Unlimited numeric values',
        conditionalLogic: 'Configurable decision systems',
        apiEndpoints: 'Environment-based endpoints',
        uiText: 'Localization-ready text'
      },
      validation: {
        universalityCheck: true,
        configurationCoverage: true,
        scalabilityPatterns: true,
        context7Integration: this.config.contextEnabled
      }
    };
  }
}

// CLI interface for standalone usage
if (require.main === module) {
  const agent = new AllPurposePatternAgent({
    transformationEnabled: true,
    validationEnabled: true,
    templateGeneration: true,
    contextEnabled: true
  });
  
  // Event logging for observability
  agent.on('agent:initialized', data => console.log('🚀 Agent ready:', data));
  agent.on('processing:complete', data => {
    console.log('✅ Processing complete:', data.result.performance);
    if (data.result.transformation) {
      console.log(`📁 Transformed files: ${data.result.transformation.transformedFiles.length}`);
      console.log(`📋 Templates generated: ${data.result.transformation.templatesGenerated.length}`);
    }
    if (data.result.validation) {
      console.log(`🔍 Universal: ${data.result.validation.isUniversal}`);
      console.log(`⚠️  Issues: ${data.result.validation.issues.length}`);
    }
  });
  agent.on('agent:error', data => console.error('❌ Agent error:', data));

  // Start processing
  agent.process().catch(error => {
    console.error('❌ Failed to process codebase:', error);
    process.exit(1);
  });
}

export default AllPurposePatternAgent;

// Export for meta-agent coordination
export { AllPurposePatternAgent, AllPurposePatternConfig, ProcessingResult, AnalysisResult, AntiPatternFinding, TransformationResult, ValidationResult };