/**
 * Template Engine
 *
 * Use context7: Handlebars-based template rendering engine
 * Following All-Purpose Pattern: Configurable engine that works with ANY template structure
 */
import { TemplateRegistry } from './TemplateRegistry.js';
import { TemplateContext, GenerationResult, TemplateRegistryConfig, HandlebarsHelper } from './types.js';
import { DetectionResult } from '../patterns/types.js';
export interface TemplateEngineConfig {
    registry?: TemplateRegistry;
    registryConfig?: TemplateRegistryConfig;
    defaultContext?: Partial<TemplateContext>;
    enableDebug?: boolean;
    outputPath?: string;
}
export declare class TemplateEngine {
    private registry;
    private config;
    private defaultContext;
    constructor(config?: TemplateEngineConfig);
    /**
     * Generate code using a template by ID
     */
    generateCode(templateId: string, context?: Partial<TemplateContext>): Promise<GenerationResult>;
    /**
     * Generate code for replacing a detected anti-pattern
     */
    generateReplacementForPattern(detectionResult: DetectionResult, additionalContext?: Partial<TemplateContext>): Promise<GenerationResult>;
    /**
     * Generate code using template source directly
     */
    generateFromSource(templateSource: string, context?: Partial<TemplateContext>): Promise<GenerationResult>;
    /**
     * Generate multiple code snippets using different templates
     */
    generateBatch(requests: Array<{
        templateId: string;
        context: Partial<TemplateContext>;
        outputName?: string;
    }>): Promise<Record<string, GenerationResult>>;
    /**
     * Save generated code to file
     */
    saveGeneratedCode(result: GenerationResult, filePath: string, options?: {
        overwrite?: boolean;
        backup?: boolean;
    }): Promise<void>;
    /**
     * Get template registry for direct access
     */
    getRegistry(): TemplateRegistry;
    /**
     * Register additional helpers
     */
    registerHelper(helper: HandlebarsHelper): void;
    /**
     * List available templates
     */
    listAvailableTemplates(): Array<{
        id: string;
        name: string;
        category: string;
        description: string;
    }>;
    /**
     * Preview template rendering without full generation
     */
    previewTemplate(templateId: string, context?: Partial<TemplateContext>): Promise<{
        preview: string;
        context: TemplateContext;
    }>;
    private mergeContext;
    private getTemplateIdForPattern;
    private enrichContextForPattern;
    private generateConfigKey;
}
//# sourceMappingURL=TemplateEngine.d.ts.map