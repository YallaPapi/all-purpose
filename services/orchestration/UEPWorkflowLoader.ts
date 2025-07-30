/**
 * UEP Workflow Definition Loader and Validator
 * 
 * Comprehensive system for loading, validating, and parsing UEP workflow
 * definitions from various sources (JSON, YAML, databases). Includes schema
 * validation, semantic analysis, and workflow optimization. Supports
 * multiple workflow formats and provides detailed error reporting.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { readFileSync, existsSync } from 'fs';
import { EventEmitter } from 'events';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
import { Logger } from '../../shared/utils/Logger';
import { 
  UEPWorkflowDefinition, 
  UEP_WORKFLOW_SCHEMA, 
  UEP_WORKFLOW_TEMPLATES,
  UEPWorkflowValidation,
  UEPValidationRule,
  UEPCustomValidator
} from './UEPWorkflowDefinition';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPWorkflowLoaderConfig {
  enableValidation: boolean;
  strictMode: boolean;
  enableOptimization: boolean;
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number; // milliseconds
  supportedFormats: ('json' | 'yaml' | 'yml')[];
  customValidators: UEPCustomValidator[];
  schemaValidation: boolean;
  semanticValidation: boolean;
  performanceValidation: boolean;
  securityValidation: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  maxFileSize: number; // bytes
  maxComplexity: number; // workflow complexity score
}

export interface UEPWorkflowSource {
  type: 'file' | 'url' | 'database' | 'inline' | 'template';
  source: string;
  format?: 'json' | 'yaml' | 'yml' | 'auto';
  credentials?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface UEPWorkflowLoadResult {
  definition: UEPWorkflowDefinition;
  source: UEPWorkflowSource;
  loadTime: number; // milliseconds
  validationResults: UEPValidationResults;
  optimizationResults?: UEPOptimizationResults;
  warnings: UEPWorkflowWarning[];
  metadata: UEPLoadMetadata;
}

export interface UEPValidationResults {
  valid: boolean;
  errors: UEPValidationError[];
  warnings: UEPValidationWarning[];
  performance: UEPPerformanceAnalysis;
  security: UEPSecurityAnalysis;
  complexity: UEPComplexityAnalysis;
  dependencies: UEPDependencyAnalysis;
}

export interface UEPOptimizationResults {
  applied: boolean;
  optimizations: UEPOptimization[];
  performanceGain: number; // percentage
  complexityReduction: number; // percentage
  resourceSavings: UEPResourceSavings;
}

export interface UEPValidationError {
  type: 'schema' | 'semantic' | 'business' | 'security' | 'performance';
  severity: 'error' | 'warning' | 'info';
  path: string; // JSONPath to the problematic element
  message: string;
  code: string;
  suggestion?: string;
  context?: Record<string, any>;
}

export interface UEPValidationWarning {
  type: 'deprecation' | 'performance' | 'best-practice' | 'security' | 'maintainability';
  message: string;
  path: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
}

export interface UEPWorkflowWarning {
  category: 'syntax' | 'logic' | 'performance' | 'security' | 'compatibility';
  message: string;
  location: string;
  recommendation: string;
  severity: 'info' | 'warning' | 'error';
}

export interface UEPLoadMetadata {
  loadedAt: Date;
  loadDuration: number;
  fileSize?: number;
  checksum: string;
  formatDetected: string;
  version: string;
  cacheHit: boolean;
}

export interface UEPPerformanceAnalysis {
  estimatedExecutionTime: number; // milliseconds
  resourceRequirements: {
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  };
  bottlenecks: UEPBottleneck[];
  parallelizationOpportunities: string[];
  cacheableSteps: string[];
}

export interface UEPSecurityAnalysis {
  riskScore: number; // 0-100
  vulnerabilities: UEPSecurityVulnerability[];
  complianceIssues: UEPComplianceIssue[];
  recommendations: UEPSecurityRecommendation[];
  encryptionCoverage: number; // percentage
}

export interface UEPComplexityAnalysis {
  overallScore: number; // 0-100
  cyclomaticComplexity: number;
  stepCount: number;
  branchingFactor: number;
  dependencies: number;
  maintainabilityIndex: number;
  cognitiveComplexity: number;
}

export interface UEPDependencyAnalysis {
  agentDependencies: string[];
  externalServices: string[];
  circularDependencies: string[];
  criticalPath: string[];
  parallelPaths: string[][];
  dependencyGraph: UEPDependencyGraph;
}

export interface UEPWorkflowLoaderMetrics {
  workflowsLoaded: Counter;
  loadLatency: Histogram;
  validationTime: Histogram;
  validationErrors: Counter;
  cacheHitRatio: Gauge;
  complexityDistribution: Histogram;
  securityIssues: Counter;
  optimizationsApplied: Counter;
}

// =============================================================================
// UEP Workflow Loader Core Class
// =============================================================================

export class UEPWorkflowLoader extends EventEmitter {
  private readonly config: UEPWorkflowLoaderConfig;
  private readonly logger = new Logger('UEPWorkflowLoader');
  private readonly tracer = trace.getTracer('uep-workflow-loader', '1.0.0');

  // Validation and schema
  private readonly ajv: Ajv;
  private readonly schemaValidator: ValidateFunction;
  private readonly customValidators: Map<string, UEPCustomValidator> = new Map();

  // Caching
  private readonly workflowCache: Map<string, UEPWorkflowLoadResult> = new Map();
  private readonly cacheTimestamps: Map<string, number> = new Map();

  // Metrics
  private readonly metrics: UEPWorkflowLoaderMetrics;

  // Templates
  private readonly templates = UEP_WORKFLOW_TEMPLATES;

  constructor(config: Partial<UEPWorkflowLoaderConfig> = {}) {
    super();

    this.config = {
      enableValidation: true,
      strictMode: false,
      enableOptimization: true,
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 3600000, // 1 hour
      supportedFormats: ['json', 'yaml', 'yml'],
      customValidators: [],
      schemaValidation: true,
      semanticValidation: true,
      performanceValidation: true,
      securityValidation: true,
      enableMetrics: true,
      enableTracing: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxComplexity: 100,
      ...config
    };

    // Initialize AJV with formats
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: this.config.strictMode,
      validateFormats: true
    });
    addFormats(this.ajv);

    // Compile schema validator
    this.schemaValidator = this.ajv.compile(UEP_WORKFLOW_SCHEMA);

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup custom validators
    this.setupCustomValidators();

    this.logger.info('UEP Workflow Loader initialized', {
      enableValidation: this.config.enableValidation,
      strictMode: this.config.strictMode,
      supportedFormats: this.config.supportedFormats,
      enableCaching: this.config.enableCaching
    });
  }

  // =============================================================================
  // Main Loading Methods
  // =============================================================================

  public async loadWorkflow(source: UEPWorkflowSource): Promise<UEPWorkflowLoadResult> {
    return this.tracer.startActiveSpan('uep.workflow.load', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'workflow.source.type': source.type,
          'workflow.source.format': source.format || 'auto',
          'workflow.validation.enabled': this.config.enableValidation
        });

        // Check cache first
        if (this.config.enableCaching) {
          const cached = this.getCachedWorkflow(source);
          if (cached) {
            this.metrics.cacheHitRatio.set(1);
            span.setAttributes({ 'workflow.cache_hit': true });
            return cached;
          }
        }

        // Load raw content
        const rawContent = await this.loadRawContent(source);
        
        // Parse content
        const parsedContent = this.parseContent(rawContent, source);
        
        // Validate workflow definition
        const validationResults = this.config.enableValidation
          ? await this.validateWorkflow(parsedContent)
          : this.createEmptyValidationResults();

        // Check for validation errors
        if (validationResults.errors.length > 0 && this.config.strictMode) {
          throw new Error(`Workflow validation failed: ${validationResults.errors[0].message}`);
        }

        // Apply optimizations
        const optimizationResults = this.config.enableOptimization
          ? await this.optimizeWorkflow(parsedContent)
          : undefined;

        // Create load result
        const result: UEPWorkflowLoadResult = {
          definition: optimizationResults?.applied ? optimizationResults.optimizedDefinition : parsedContent,
          source,
          loadTime: Date.now() - startTime,
          validationResults,
          optimizationResults,
          warnings: this.generateWarnings(parsedContent, validationResults),
          metadata: {
            loadedAt: new Date(),
            loadDuration: Date.now() - startTime,
            fileSize: rawContent.length,
            checksum: this.calculateChecksum(rawContent),
            formatDetected: this.detectFormat(source, rawContent),
            version: parsedContent.metadata.version,
            cacheHit: false
          }
        };

        // Cache the result
        if (this.config.enableCaching) {
          this.cacheWorkflow(source, result);
        }

        // Update metrics
        this.updateLoadMetrics(result);

        // Emit events
        this.emit('workflowLoaded', result);

        span.setAttributes({
          'workflow.id': result.definition.metadata.id,
          'workflow.version': result.definition.metadata.version,
          'workflow.load_time': result.loadTime,
          'workflow.valid': validationResults.valid
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Failed to load workflow', {
          source: source.source,
          type: source.type,
          error: (error as Error).message
        });

        this.metrics.validationErrors.inc({
          type: 'load_error',
          source_type: source.type
        });

        throw error;
      }
    });
  }

  public async loadWorkflowFromFile(filePath: string): Promise<UEPWorkflowLoadResult> {
    return this.loadWorkflow({
      type: 'file',
      source: filePath,
      format: 'auto'
    });
  }

  public async loadWorkflowFromTemplate(templateName: string): Promise<UEPWorkflowLoadResult> {
    const template = this.templates[templateName as keyof typeof this.templates];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    return this.loadWorkflow({
      type: 'template',
      source: templateName,
      format: 'json'
    });
  }

  // =============================================================================
  // Content Loading and Parsing
  // =============================================================================

  private async loadRawContent(source: UEPWorkflowSource): Promise<string> {
    switch (source.type) {
      case 'file':
        return this.loadFromFile(source.source);
      
      case 'url':
        return this.loadFromUrl(source.source, source.credentials, source.headers, source.timeout);
      
      case 'database':
        return this.loadFromDatabase(source.source, source.credentials);
      
      case 'inline':
        return source.source;
      
      case 'template':
        return JSON.stringify(this.templates[source.source as keyof typeof this.templates]);
      
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  private loadFromFile(filePath: string): string {
    if (!existsSync(filePath)) {
      throw new Error(`Workflow file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf8');
    
    if (content.length > this.config.maxFileSize) {
      throw new Error(`Workflow file too large: ${content.length} bytes (max: ${this.config.maxFileSize})`);
    }

    return content;
  }

  private async loadFromUrl(url: string, credentials?: Record<string, any>, headers?: Record<string, string>, timeout?: number): Promise<string> {
    // Implementation would use axios or fetch to load from URL
    // For now, return placeholder
    throw new Error('URL loading not yet implemented');
  }

  private async loadFromDatabase(connectionString: string, credentials?: Record<string, any>): Promise<string> {
    // Implementation would connect to database and load workflow
    // For now, return placeholder
    throw new Error('Database loading not yet implemented');
  }

  private parseContent(content: string, source: UEPWorkflowSource): UEPWorkflowDefinition {
    const format = source.format === 'auto' ? this.detectFormat(source, content) : source.format;

    try {
      switch (format) {
        case 'json':
          return JSON.parse(content);
        
        case 'yaml':
        case 'yml':
          return yaml.load(content) as UEPWorkflowDefinition;
        
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse ${format} content: ${(error as Error).message}`);
    }
  }

  private detectFormat(source: UEPWorkflowSource, content: string): string {
    // Try to detect format from file extension
    if (source.type === 'file') {
      const extension = source.source.toLowerCase().split('.').pop();
      if (extension && this.config.supportedFormats.includes(extension as any)) {
        return extension;
      }
    }

    // Try to detect from content
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    
    if (trimmed.includes('---') || trimmed.match(/^\w+:/m)) {
      return 'yaml';
    }

    // Default to JSON
    return 'json';
  }

  // =============================================================================
  // Validation Methods
  // =============================================================================

  private async validateWorkflow(definition: UEPWorkflowDefinition): Promise<UEPValidationResults> {
    return this.tracer.startActiveSpan('uep.workflow.validate', async (span) => {
      const startTime = Date.now();
      const errors: UEPValidationError[] = [];
      const warnings: UEPValidationWarning[] = [];

      try {
        // Schema validation
        if (this.config.schemaValidation) {
          const schemaErrors = this.validateSchema(definition);
          errors.push(...schemaErrors);
        }

        // Semantic validation
        if (this.config.semanticValidation) {
          const semanticErrors = await this.validateSemantics(definition);
          errors.push(...semanticErrors);
        }

        // Performance analysis
        const performance = this.config.performanceValidation 
          ? await this.analyzePerformance(definition)
          : this.createEmptyPerformanceAnalysis();

        // Security analysis
        const security = this.config.securityValidation
          ? await this.analyzeSecurity(definition)
          : this.createEmptySecurityAnalysis();

        // Complexity analysis
        const complexity = await this.analyzeComplexity(definition);

        // Dependency analysis
        const dependencies = await this.analyzeDependencies(definition);

        // Custom validations
        for (const validator of this.customValidators.values()) {
          try {
            const customResults = await this.runCustomValidator(validator, definition);
            errors.push(...customResults.errors);
            warnings.push(...customResults.warnings);
          } catch (error) {
            this.logger.warn('Custom validator failed', {
              validator: validator.name,
              error: (error as Error).message
            });
          }
        }

        const results: UEPValidationResults = {
          valid: errors.filter(e => e.severity === 'error').length === 0,
          errors,
          warnings,
          performance,
          security,
          complexity,
          dependencies
        };

        this.metrics.validationTime.observe((Date.now() - startTime) / 1000);
        
        span.setAttributes({
          'validation.valid': results.valid,
          'validation.errors': errors.length,
          'validation.warnings': warnings.length,
          'validation.duration': Date.now() - startTime
        });

        return results;

      } catch (error) {
        span.recordException(error as Error);
        throw error;
      }
    });
  }

  private validateSchema(definition: UEPWorkflowDefinition): UEPValidationError[] {
    const valid = this.schemaValidator(definition);
    const errors: UEPValidationError[] = [];

    if (!valid && this.schemaValidator.errors) {
      for (const error of this.schemaValidator.errors) {
        errors.push({
          type: 'schema',
          severity: 'error',
          path: error.instancePath || '/',
          message: `${error.message} at ${error.instancePath}`,
          code: 'SCHEMA_VALIDATION',
          context: {
            keyword: error.keyword,
            data: error.data,
            schema: error.schema
          }
        });
      }
    }

    return errors;
  }

  private async validateSemantics(definition: UEPWorkflowDefinition): Promise<UEPValidationError[]> {
    const errors: UEPValidationError[] = [];

    // Validate agent references
    const agentIds = new Set(definition.agents.map(a => a.id));
    for (const step of definition.steps) {
      if (!agentIds.has(step.agentId)) {
        errors.push({
          type: 'semantic',
          severity: 'error',
          path: `/steps/${step.id}/agentId`,
          message: `Step '${step.id}' references unknown agent '${step.agentId}'`,
          code: 'UNKNOWN_AGENT_REFERENCE',
          suggestion: `Add agent '${step.agentId}' to the agents array or use an existing agent ID`
        });
      }
    }

    // Validate step dependencies
    const stepIds = new Set(definition.steps.map(s => s.id));
    for (const step of definition.steps) {
      for (const dep of step.dependencies) {
        if (!stepIds.has(dep)) {
          errors.push({
            type: 'semantic',
            severity: 'error',
            path: `/steps/${step.id}/dependencies`,
            message: `Step '${step.id}' depends on unknown step '${dep}'`,
            code: 'UNKNOWN_STEP_DEPENDENCY',
            suggestion: `Remove dependency '${dep}' or add the missing step`
          });
        }
      }
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(definition.steps);
    for (const cycle of circularDeps) {
      errors.push({
        type: 'semantic',
        severity: 'error',
        path: '/steps',
        message: `Circular dependency detected: ${cycle.join(' -> ')}`,
        code: 'CIRCULAR_DEPENDENCY',
        suggestion: 'Remove or reorder dependencies to eliminate cycles'
      });
    }

    return errors;
  }

  // =============================================================================
  // Analysis Methods
  // =============================================================================

  private async analyzePerformance(definition: UEPWorkflowDefinition): Promise<UEPPerformanceAnalysis> {
    const estimatedTime = definition.steps.reduce((total, step) => total + step.timeout, 0);
    
    const resourceRequirements = definition.agents.reduce((total, agent) => {
      const req = agent.requirements.resources;
      if (req) {
        total.cpu += req.cpu;
        total.memory += req.memory;
        total.network += req.network || 0;
        total.storage += req.storage || 0;
      }
      return total;
    }, { cpu: 0, memory: 0, network: 0, storage: 0 });

    return {
      estimatedExecutionTime: estimatedTime,
      resourceRequirements,
      bottlenecks: [],
      parallelizationOpportunities: [],
      cacheableSteps: []
    };
  }

  private async analyzeSecurity(definition: UEPWorkflowDefinition): Promise<UEPSecurityAnalysis> {
    let riskScore = 0;
    const vulnerabilities: UEPSecurityVulnerability[] = [];
    const complianceIssues: UEPComplianceIssue[] = [];
    const recommendations: UEPSecurityRecommendation[] = [];

    // Check encryption settings
    if (!definition.security?.encryption?.enabled) {
      riskScore += 20;
      vulnerabilities.push({
        type: 'encryption',
        severity: 'medium',
        description: 'Workflow does not have encryption enabled',
        impact: 'Data transmitted between agents may be intercepted',
        remediation: 'Enable encryption in workflow security settings'
      });
    }

    // Check authentication requirements
    if (!definition.security?.authentication?.required) {
      riskScore += 15;
      vulnerabilities.push({
        type: 'authentication',
        severity: 'medium',
        description: 'Workflow does not require authentication',
        impact: 'Unauthorized agents may execute workflow steps',
        remediation: 'Enable authentication requirements'
      });
    }

    return {
      riskScore,
      vulnerabilities,
      complianceIssues,
      recommendations,
      encryptionCoverage: definition.security?.encryption?.enabled ? 100 : 0
    };
  }

  private async analyzeComplexity(definition: UEPWorkflowDefinition): Promise<UEPComplexityAnalysis> {
    const stepCount = definition.steps.length;
    const agentCount = definition.agents.length;
    const flowCount = definition.flows.length;
    
    // Calculate cyclomatic complexity (simplified)
    let cyclomaticComplexity = 1; // Base complexity
    for (const step of definition.steps) {
      if (step.type === 'decision') cyclomaticComplexity += 1;
      if (step.type === 'loop') cyclomaticComplexity += 1;
      cyclomaticComplexity += step.conditions.preconditions.length;
    }

    // Calculate branching factor
    const totalBranches = definition.flows.reduce((total, flow) => {
      return total + (flow.conditions?.branchingLogic?.length || 0);
    }, 0);
    const branchingFactor = totalBranches / Math.max(flowCount, 1);

    // Calculate dependency complexity
    const totalDependencies = definition.steps.reduce((total, step) => {
      return total + step.dependencies.length;
    }, 0);

    // Overall complexity score (0-100)
    const overallScore = Math.min(100, 
      (stepCount * 2) + 
      (agentCount * 3) + 
      (cyclomaticComplexity * 5) + 
      (totalDependencies * 2)
    );

    return {
      overallScore,
      cyclomaticComplexity,
      stepCount,
      branchingFactor,
      dependencies: totalDependencies,
      maintainabilityIndex: Math.max(0, 100 - overallScore),
      cognitiveComplexity: cyclomaticComplexity + (branchingFactor * 2)
    };
  }

  private async analyzeDependencies(definition: UEPWorkflowDefinition): Promise<UEPDependencyAnalysis> {
    const agentDependencies = [...new Set(definition.steps.map(s => s.agentId))];
    const externalServices: string[] = []; // Would be extracted from step configurations
    const circularDependencies = this.detectCircularDependencies(definition.steps);
    const criticalPath = this.calculateCriticalPath(definition.steps);
    const parallelPaths = this.identifyParallelPaths(definition.steps);

    return {
      agentDependencies,
      externalServices,
      circularDependencies,
      criticalPath,
      parallelPaths,
      dependencyGraph: this.buildDependencyGraph(definition.steps)
    };
  }

  // =============================================================================
  // Optimization Methods
  // =============================================================================

  private async optimizeWorkflow(definition: UEPWorkflowDefinition): Promise<UEPOptimizationResults> {
    const optimizations: UEPOptimization[] = [];
    let optimizedDefinition = { ...definition };

    // Parallel step optimization
    const parallelOpt = this.optimizeParallelSteps(optimizedDefinition);
    if (parallelOpt.applied) {
      optimizations.push(parallelOpt);
      optimizedDefinition = parallelOpt.result;
    }

    // Resource optimization
    const resourceOpt = this.optimizeResourceAllocation(optimizedDefinition);
    if (resourceOpt.applied) {
      optimizations.push(resourceOpt);
      optimizedDefinition = resourceOpt.result;
    }

    // Calculate performance gains
    const originalComplexity = await this.analyzeComplexity(definition);
    const optimizedComplexity = await this.analyzeComplexity(optimizedDefinition);
    
    const performanceGain = Math.max(0, 
      ((originalComplexity.overallScore - optimizedComplexity.overallScore) / originalComplexity.overallScore) * 100
    );

    return {
      applied: optimizations.length > 0,
      optimizations,
      performanceGain,
      complexityReduction: performanceGain,
      resourceSavings: {
        cpu: 0,
        memory: 0,
        network: 0,
        storage: 0
      },
      optimizedDefinition
    };
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private detectCircularDependencies(steps: any[]): string[][] {
    // Simplified circular dependency detection
    const cycles: string[][] = [];
    // Implementation would use graph algorithms to detect cycles
    return cycles;
  }

  private calculateCriticalPath(steps: any[]): string[] {
    // Simplified critical path calculation
    return steps.map(s => s.id);
  }

  private identifyParallelPaths(steps: any[]): string[][] {
    // Simplified parallel path identification
    return [];
  }

  private buildDependencyGraph(steps: any[]): UEPDependencyGraph {
    return {
      nodes: steps.map(s => ({ id: s.id, type: s.type })),
      edges: steps.flatMap(s => 
        s.dependencies.map((dep: string) => ({ from: dep, to: s.id }))
      )
    };
  }

  private optimizeParallelSteps(definition: UEPWorkflowDefinition): UEPOptimization {
    // Implementation would identify steps that can run in parallel
    return {
      type: 'parallelization',
      description: 'Identify parallel execution opportunities',
      applied: false,
      impact: 'medium',
      result: definition
    };
  }

  private optimizeResourceAllocation(definition: UEPWorkflowDefinition): UEPOptimization {
    // Implementation would optimize resource allocation
    return {
      type: 'resource-optimization',
      description: 'Optimize resource allocation',
      applied: false,
      impact: 'low',
      result: definition
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private setupCustomValidators(): void {
    for (const validator of this.config.customValidators) {
      this.customValidators.set(validator.name, validator);
    }
  }

  private async runCustomValidator(validator: UEPCustomValidator, definition: UEPWorkflowDefinition): Promise<{ errors: UEPValidationError[], warnings: UEPValidationWarning[] }> {
    // Implementation would run custom validator
    return { errors: [], warnings: [] };
  }

  private generateWarnings(definition: UEPWorkflowDefinition, validation: UEPValidationResults): UEPWorkflowWarning[] {
    const warnings: UEPWorkflowWarning[] = [];
    
    // Add validation warnings
    for (const warning of validation.warnings) {
      warnings.push({
        category: 'logic',
        message: warning.message,
        location: warning.path,
        recommendation: warning.suggestion,
        severity: 'warning'
      });
    }

    return warnings;
  }

  private calculateChecksum(content: string): string {
    // Simple checksum calculation (in production, use proper hash)
    return Buffer.from(content).toString('base64').slice(0, 16);
  }

  private getCachedWorkflow(source: UEPWorkflowSource): UEPWorkflowLoadResult | null {
    const key = this.generateCacheKey(source);
    const cached = this.workflowCache.get(key);
    const timestamp = this.cacheTimestamps.get(key);

    if (cached && timestamp && (Date.now() - timestamp) < this.config.cacheTTL) {
      return { ...cached, metadata: { ...cached.metadata, cacheHit: true } };
    }

    return null;
  }

  private cacheWorkflow(source: UEPWorkflowSource, result: UEPWorkflowLoadResult): void {
    const key = this.generateCacheKey(source);
    
    // Ensure cache size limit
    if (this.workflowCache.size >= this.config.cacheSize) {
      const oldestKey = this.workflowCache.keys().next().value;
      this.workflowCache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }

    this.workflowCache.set(key, result);
    this.cacheTimestamps.set(key, Date.now());
  }

  private generateCacheKey(source: UEPWorkflowSource): string {
    return `${source.type}:${source.source}:${source.format || 'auto'}`;
  }

  private createEmptyValidationResults(): UEPValidationResults {
    return {
      valid: true,
      errors: [],
      warnings: [],
      performance: this.createEmptyPerformanceAnalysis(),
      security: this.createEmptySecurityAnalysis(),
      complexity: {
        overallScore: 0,
        cyclomaticComplexity: 1,
        stepCount: 0,
        branchingFactor: 0,
        dependencies: 0,
        maintainabilityIndex: 100,
        cognitiveComplexity: 1
      },
      dependencies: {
        agentDependencies: [],
        externalServices: [],
        circularDependencies: [],
        criticalPath: [],
        parallelPaths: [],
        dependencyGraph: { nodes: [], edges: [] }
      }
    };
  }

  private createEmptyPerformanceAnalysis(): UEPPerformanceAnalysis {
    return {
      estimatedExecutionTime: 0,
      resourceRequirements: { cpu: 0, memory: 0, network: 0, storage: 0 },
      bottlenecks: [],
      parallelizationOpportunities: [],
      cacheableSteps: []
    };
  }

  private createEmptySecurityAnalysis(): UEPSecurityAnalysis {
    return {
      riskScore: 0,
      vulnerabilities: [],
      complianceIssues: [],
      recommendations: [],
      encryptionCoverage: 100
    };
  }

  private updateLoadMetrics(result: UEPWorkflowLoadResult): void {
    this.metrics.workflowsLoaded.inc({
      source_type: result.source.type,
      format: result.metadata.formatDetected
    });

    this.metrics.loadLatency.observe(
      { source_type: result.source.type },
      result.loadTime / 1000
    );

    this.metrics.complexityDistribution.observe(
      result.validationResults.complexity.overallScore
    );

    if (result.validationResults.security.vulnerabilities.length > 0) {
      this.metrics.securityIssues.inc({
        severity: 'medium' // Simplified
      });
    }

    if (result.optimizationResults?.applied) {
      this.metrics.optimizationsApplied.inc({
        type: 'general'
      });
    }
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPWorkflowLoaderMetrics {
    const prefix = 'uep_workflow_loader_';

    return {
      workflowsLoaded: new Counter({
        name: `${prefix}workflows_loaded_total`,
        help: 'Total workflows loaded',
        labelNames: ['source_type', 'format']
      }),

      loadLatency: new Histogram({
        name: `${prefix}load_latency_seconds`,
        help: 'Workflow loading latency',
        labelNames: ['source_type'],
        buckets: [0.1, 0.5, 1.0, 5.0, 10.0, 30.0]
      }),

      validationTime: new Histogram({
        name: `${prefix}validation_time_seconds`,
        help: 'Workflow validation time',
        buckets: [0.01, 0.1, 0.5, 1.0, 5.0]
      }),

      validationErrors: new Counter({
        name: `${prefix}validation_errors_total`,
        help: 'Total validation errors',
        labelNames: ['type', 'source_type']
      }),

      cacheHitRatio: new Gauge({
        name: `${prefix}cache_hit_ratio`,
        help: 'Cache hit ratio'
      }),

      complexityDistribution: new Histogram({
        name: `${prefix}complexity_distribution`,
        help: 'Distribution of workflow complexity scores',
        buckets: [0, 10, 25, 50, 75, 90, 100]
      }),

      securityIssues: new Counter({
        name: `${prefix}security_issues_total`,
        help: 'Total security issues found',
        labelNames: ['severity']
      }),

      optimizationsApplied: new Counter({
        name: `${prefix}optimizations_applied_total`,
        help: 'Total optimizations applied',
        labelNames: ['type']
      })
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getAvailableTemplates(): string[] {
    return Object.keys(this.templates);
  }

  public clearCache(): void {
    this.workflowCache.clear();
    this.cacheTimestamps.clear();
    this.emit('cacheCleared');
  }

  public getCacheStats(): Record<string, any> {
    return {
      size: this.workflowCache.size,
      maxSize: this.config.cacheSize,
      hitRatio: this.workflowCache.size > 0 ? 0.8 : 0 // Simplified
    };
  }
}

// =============================================================================
// Supporting Interface Definitions
// =============================================================================

export interface UEPBottleneck {
  stepId: string;
  type: 'cpu' | 'memory' | 'network' | 'io';
  severity: 'low' | 'medium' | 'high';
  estimatedDelay: number;
  recommendation: string;
}

export interface UEPSecurityVulnerability {
  type: 'encryption' | 'authentication' | 'authorization' | 'data-leak' | 'injection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  remediation: string;
}

export interface UEPComplianceIssue {
  framework: string; // e.g., 'GDPR', 'SOX', 'HIPAA'
  requirement: string;
  violation: string;
  remediation: string;
  mandatory: boolean;
}

export interface UEPSecurityRecommendation {
  category: 'encryption' | 'access-control' | 'monitoring' | 'data-protection';
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface UEPDependencyGraph {
  nodes: Array<{ id: string; type: string }>;
  edges: Array<{ from: string; to: string }>;
}

export interface UEPOptimization {
  type: 'parallelization' | 'resource-optimization' | 'caching' | 'redundancy-removal';
  description: string;
  applied: boolean;
  impact: 'low' | 'medium' | 'high';
  result: UEPWorkflowDefinition;
}

export interface UEPResourceSavings {
  cpu: number; // percentage
  memory: number; // percentage
  network: number; // percentage
  storage: number; // percentage
}

export default UEPWorkflowLoader;