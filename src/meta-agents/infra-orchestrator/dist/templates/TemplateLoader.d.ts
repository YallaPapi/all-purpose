/**
 * Template Loader
 *
 * Use context7: Template loading and initialization system
 * Following All-Purpose Pattern: Configurable loader that works with ANY template structure
 */
import { TemplateRegistry } from './TemplateRegistry.js';
import { TemplateEngine } from './TemplateEngine.js';
export interface TemplateLoaderConfig {
    templatesPath?: string;
    autoLoad?: boolean;
    enableBuiltInTemplates?: boolean;
    customTemplatesPath?: string;
}
export declare class TemplateLoader {
    private registry;
    private engine;
    private config;
    constructor(config?: TemplateLoaderConfig);
    /**
     * Load all templates from configured paths
     */
    loadTemplates(): Promise<void>;
    /**
     * Load built-in templates for anti-pattern replacements
     */
    private loadBuiltInTemplates;
    /**
     * Load custom user templates
     */
    private loadCustomTemplates;
    /**
     * Get the template engine instance
     */
    getEngine(): TemplateEngine;
    /**
     * Get the template registry instance
     */
    getRegistry(): TemplateRegistry;
    /**
     * Register additional templates programmatically
     */
    registerDefaultTemplates(): void;
    /**
     * Create template engine with loaded templates
     */
    static create(config?: TemplateLoaderConfig): Promise<TemplateEngine>;
    private registerGenericReplacementTemplate;
    private registerConfigHelperTemplate;
}
//# sourceMappingURL=TemplateLoader.d.ts.map