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

      // TODO: Add more anti-pattern detectors
      // - Conditional logic based on hardcoded values
      // - Hardcoded API endpoints
      // - Hardcoded UI text
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
    // TODO: Implement transformation logic
    // This will replace hardcoded elements with universal patterns
    
    return {
      transformedFiles: [],
      templatesGenerated: [],
      configurationSchema: {}
    };
  }

  /**
   * Validate that transformed code has no limitations
   */
  private async validateUniversality(
    parseResults: ParseResult[], 
    analysis: AnalysisResult
  ): Promise<ValidationResult> {
    // TODO: Implement validation logic
    // This will ensure no hardcoded limitations remain
    
    return {
      isUniversal: analysis.antiPatterns.length === 0,
      hasLimitations: analysis.antiPatterns.length > 0,
      issues: []
    };
  }

  /**
   * Initialize Context7 patterns
   */
  private async initializeContext7(): Promise<void> {
    // TODO: Implement Context7 integration
    console.log(chalk.blue('🔧 Initializing Context7 patterns...'));
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

    return recommendations;
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
        'Universal code generation',
        'Context7 enhancement'
      ],
      languages: ['JavaScript', 'TypeScript'],
      integrations: ['TaskMaster', 'Context7', 'PRD-Parser', 'Scaffold-Generator'],
      performance: {
        maxFiles: this.config.maxFiles || 'unlimited',
        maxDepth: this.config.maxDepth || 'unlimited',
        concurrency: this.config.concurrency
      }
    };
  }
}

// CLI interface for standalone usage
if (require.main === module) {
  const agent = new AllPurposePatternAgent();
  
  // Event logging for observability
  agent.on('agent:initialized', data => console.log('🚀 Agent ready:', data));
  agent.on('processing:complete', data => console.log('✅ Processing complete:', data.result.performance));
  agent.on('agent:error', data => console.error('❌ Agent error:', data));

  // Start processing
  agent.process().catch(error => {
    console.error('❌ Failed to process codebase:', error);
    process.exit(1);
  });
}

export default AllPurposePatternAgent;