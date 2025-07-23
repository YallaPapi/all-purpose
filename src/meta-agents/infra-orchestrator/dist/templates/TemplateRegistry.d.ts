/**
 * Template Registry
 *
 * Use context7: Centralized template storage and management system
 * Following All-Purpose Pattern: Configurable registry that works with ANY template structure
 */
import Handlebars from 'handlebars';
import { Template, TemplateMetadata, TemplateRegistryConfig, TemplateValidationResult, HandlebarsHelper } from './types.js';
export declare class TemplateRegistry {
    private templates;
    private compiledTemplates;
    private config;
    private handlebarsInstance;
    constructor(config?: TemplateRegistryConfig);
    /**
     * Register a template by object
     */
    registerTemplate(template: Template): void;
    /**
     * Register a template by source string
     */
    registerTemplateFromSource(id: string, source: string, metadata?: Partial<TemplateMetadata>): void;
    /**
     * Register templates from files in a directory
     */
    registerTemplatesFromDirectory(dirPath: string): Promise<void>;
    /**
     * Get template by ID
     */
    getTemplate(id: string): Template | undefined;
    /**
     * Get compiled template by ID
     */
    getCompiledTemplate(id: string): Handlebars.TemplateDelegate | undefined;
    /**
     * List all templates
     */
    listTemplates(): TemplateMetadata[];
    /**
     * List templates by category
     */
    listTemplatesByCategory(category: string): TemplateMetadata[];
    /**
     * Search templates by tags or name
     */
    searchTemplates(query: string): TemplateMetadata[];
    /**
     * Remove template by ID
     */
    unregisterTemplate(id: string): boolean;
    /**
     * Clear all templates
     */
    clear(): void;
    /**
     * Validate template structure
     */
    validateTemplate(template: Template): TemplateValidationResult;
    /**
     * Register a custom Handlebars helper
     */
    registerHelper(helper: HandlebarsHelper): void;
    /**
     * Get Handlebars instance for advanced usage
     */
    getHandlebarsInstance(): typeof Handlebars;
    /**
     * Get registry statistics
     */
    getStatistics(): {
        totalTemplates: number;
        compiledTemplates: number;
        categoryCounts: Record<string, number>;
        memoryUsage: {
            templatesSize: number;
            compiledSize: number;
        };
    };
    private registerBuiltInHelpers;
}
//# sourceMappingURL=TemplateRegistry.d.ts.map