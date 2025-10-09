/**
 * Template Engine
 * 
 * Use context7: Handlebars-based template rendering engine
 * Following All-Purpose Pattern: Configurable engine that works with ANY template structure
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { TemplateRegistry } from './TemplateRegistry.js';
import { 
  TemplateContext, 
  GenerationResult, 
  TemplateRegistryConfig,
  HandlebarsHelper 
} from './types.js';
import { DetectionResult } from '../patterns/types.js';
import { logger } from '../utils/logger.js';

export interface TemplateEngineConfig {
  registry?: TemplateRegistry;
  registryConfig?: TemplateRegistryConfig;
  defaultContext?: Partial<TemplateContext>;
  enableDebug?: boolean;
  outputPath?: string;
}

export class TemplateEngine {
  private registry: TemplateRegistry;
  private config: TemplateEngineConfig;
  private defaultContext: Partial<TemplateContext>;

  constructor(config: TemplateEngineConfig = {}) {
    this.config = {
      enableDebug: false,
      ...config
    };

    // Initialize registry
    this.registry = config.registry || new TemplateRegistry(config.registryConfig);
    
    // Set default context
    this.defaultContext = {
      project: {
        name: 'all-purpose-project',
        root: process.cwd(),
        language: 'typescript'
      },
      ...config.defaultContext
    };

    logger.info('TemplateEngine initialized', {
      hasCustomRegistry: !!config.registry,
      debugEnabled: this.config.enableDebug
    });
  }

  /**
   * Generate code using a template by ID
   */
  async generateCode(templateId: string, context: Partial<TemplateContext> = {}): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Get compiled template
      const compiledTemplate = this.registry.getCompiledTemplate(templateId);
      if (!compiledTemplate) {
        return {
          success: false,
          generatedCode: '',
          metadata: {
            templateId,
            templateVersion: 'unknown',
            generationTime: Date.now() - startTime,
            contextUsed: {}
          },
          errors: [`Template not found: ${templateId}`]
        };
      }

      // Merge context with defaults
      const fullContext = this.mergeContext(context);

      // Render template
      const generatedCode = compiledTemplate(fullContext);

      // Get template metadata
      const template = this.registry.getTemplate(templateId);
      
      const result: GenerationResult = {
        success: true,
        generatedCode,
        metadata: {
          templateId,
          templateVersion: template?.metadata.version || '1.0.0',
          generationTime: Date.now() - startTime,
          contextUsed: fullContext
        }
      };

      if (this.config.enableDebug) {
        logger.debug('Template generation completed', {
          templateId,
          generationTime: result.metadata.generationTime,
          outputLength: generatedCode.length
        });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error('Template generation failed', {
        templateId,
        error: errorMessage,
        generationTime: Date.now() - startTime
      });

      return {
        success: false,
        generatedCode: '',
        metadata: {
          templateId,
          templateVersion: 'unknown',
          generationTime: Date.now() - startTime,
          contextUsed: context
        },
        errors: [errorMessage]
      };
    }
  }

  /**
   * Generate code for replacing a detected anti-pattern
   */
  async generateReplacementForPattern(
    detectionResult: DetectionResult,
    additionalContext: Partial<TemplateContext> = {}
  ): Promise<GenerationResult> {
    
    // Determine template ID based on detection result
    const templateId = this.getTemplateIdForPattern(detectionResult.ruleId);
    
    // Build context from detection result
    const context: Partial<TemplateContext> = {
      detectionResult: {
        filePath: detectionResult.filePath,
        lineNumber: detectionResult.lineNumber,
        columnNumber: detectionResult.columnNumber,
        originalCode: detectionResult.codeSnippet,
        patternType: detectionResult.ruleId,
        metadata: detectionResult.metadata
      },
      ...additionalContext
    };

    // Add pattern-specific context
    this.enrichContextForPattern(context, detectionResult);

    return this.generateCode(templateId, context);
  }

  /**
   * Generate code using template source directly
   */
  async generateFromSource(
    templateSource: string, 
    context: Partial<TemplateContext> = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      // Compile template on the fly
      const handlebars = this.registry.getHandlebarsInstance();
      const compiledTemplate = handlebars.compile(templateSource);

      // Merge context with defaults
      const fullContext = this.mergeContext(context);

      // Render template
      const generatedCode = compiledTemplate(fullContext);

      return {
        success: true,
        generatedCode,
        metadata: {
          templateId: 'inline',
          templateVersion: '1.0.0',
          generationTime: Date.now() - startTime,
          contextUsed: fullContext
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        generatedCode: '',
        metadata: {
          templateId: 'inline',
          templateVersion: '1.0.0',
          generationTime: Date.now() - startTime,
          contextUsed: context
        },
        errors: [errorMessage]
      };
    }
  }

  /**
   * Generate multiple code snippets using different templates
   */
  async generateBatch(requests: Array<{
    templateId: string;
    context: Partial<TemplateContext>;
    outputName?: string;
  }>): Promise<Record<string, GenerationResult>> {
    
    const results: Record<string, GenerationResult> = {};
    
    // Process requests in parallel
    const promises = requests.map(async (request, index) => {
      const outputName = request.outputName || `output_${index}`;
      const result = await this.generateCode(request.templateId, request.context);
      return { outputName, result };
    });

    const batchResults = await Promise.all(promises);
    
    for (const { outputName, result } of batchResults) {
      results[outputName] = result;
    }

    logger.info('Batch template generation completed', {
      requestCount: requests.length,
      successCount: Object.values(results).filter(r => r.success).length
    });

    return results;
  }

  /**
   * Save generated code to file
   */
  async saveGeneratedCode(
    result: GenerationResult, 
    filePath: string, 
    options: { overwrite?: boolean; backup?: boolean } = {}
  ): Promise<void> {
    if (!result.success) {
      throw new Error('Cannot save failed generation result');
    }

    const { overwrite = false, backup = true } = options;
    
    // Check if file exists
    if (await fs.pathExists(filePath) && !overwrite) {
      throw new Error(`File already exists: ${filePath}. Use overwrite option to replace.`);
    }

    // Create backup if requested
    if (backup && await fs.pathExists(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copy(filePath, backupPath);
      logger.debug('Backup created', { originalPath: filePath, backupPath });
    }

    // Ensure directory exists
    await fs.ensureDir(path.dirname(filePath));

    // Write generated code
    await fs.writeFile(filePath, result.generatedCode, 'utf-8');

    logger.info('Generated code saved', {
      filePath,
      templateId: result.metadata.templateId,
      codeLength: result.generatedCode.length
    });
  }

  /**
   * Get template registry for direct access
   */
  getRegistry(): TemplateRegistry {
    return this.registry;
  }

  /**
   * Register additional helpers
   */
  registerHelper(helper: HandlebarsHelper): void {
    this.registry.registerHelper(helper);
  }

  /**
   * List available templates
   */
  listAvailableTemplates(): Array<{
    id: string;
    name: string;
    category: string;
    description: string;
  }> {
    return this.registry.listTemplates().map(template => ({
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description
    }));
  }

  /**
   * Preview template rendering without full generation
   */
  async previewTemplate(
    templateId: string, 
    context: Partial<TemplateContext> = {}
  ): Promise<{ preview: string; context: TemplateContext }> {
    const fullContext = this.mergeContext(context);
    const result = await this.generateCode(templateId, context);
    
    return {
      preview: result.generatedCode.substring(0, 500) + (result.generatedCode.length > 500 ? '...' : ''),
      context: fullContext
    };
  }

  private mergeContext(context: Partial<TemplateContext>): TemplateContext {
    return {
      ...this.defaultContext,
      ...context,
      // Merge nested objects properly
      config: {
        ...this.defaultContext.config,
        ...context.config
      },
      userInputs: {
        ...this.defaultContext.userInputs,
        ...context.userInputs
      },
      project: {
        ...this.defaultContext.project,
        ...context.project
      }
    } as TemplateContext;
  }

  private getTemplateIdForPattern(ruleId: string): string {
    // Map rule IDs to template IDs
    const templateMap: Record<string, string> = {
      'hardcoded-arrays': 'dynamic-array-config',
      'limitation-constants': 'configurable-constant',
      'conditional-logic': 'dynamic-conditional',
      'hardcoded-endpoints': 'configurable-endpoint',
      'hardcoded-ui-text': 'localizable-text'
    };

    return templateMap[ruleId] || 'generic-replacement';
  }

  private enrichContextForPattern(context: Partial<TemplateContext>, detectionResult: DetectionResult): void {
    // Add pattern-specific context based on the detection result
    switch (detectionResult.ruleId) {
      case 'hardcoded-arrays':
        if (detectionResult.metadata?.variableName) {
          context.config = {
            ...context.config,
            arrayName: detectionResult.metadata.variableName,
            configKey: this.generateConfigKey(detectionResult.metadata.variableName)
          };
        }
        break;

      case 'limitation-constants':
        if (detectionResult.metadata?.variableName && detectionResult.metadata?.value) {
          context.config = {
            ...context.config,
            constantName: detectionResult.metadata.variableName,
            defaultValue: detectionResult.metadata.value,
            configKey: this.generateConfigKey(detectionResult.metadata.variableName)
          };
        }
        break;

      case 'hardcoded-endpoints':
        if (detectionResult.metadata?.endpoint) {
          context.config = {
            ...context.config,
            endpointUrl: detectionResult.metadata.endpoint,
            configKey: 'apiEndpoints.' + this.generateConfigKey(detectionResult.metadata.endpoint)
          };
        }
        break;

      default:
        // Generic enrichment
        context.config = {
          ...context.config,
          patternType: detectionResult.ruleId,
          originalValue: detectionResult.codeSnippet
        };
    }
  }

  private generateConfigKey(value: string): string {
    return value
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }
}