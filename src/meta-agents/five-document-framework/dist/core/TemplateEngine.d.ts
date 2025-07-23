/**
 * Template Engine for Five Document Framework Agent
 *
 * Handles dynamic template processing with Handlebars
 * Following All-Purpose Pattern: UNLIMITED template customization
 */
import Handlebars from 'handlebars';
import { ProjectConfig, TemplateContext } from '../types/index.js';
export interface TemplateEngineConfig {
    templateDir: string;
    projectConfig: ProjectConfig;
    customHelpers?: Record<string, Handlebars.HelperDelegate>;
    templateCache?: boolean;
}
export declare class TemplateEngine {
    private config;
    private templateCache;
    private initialized;
    constructor(config: TemplateEngineConfig);
    /**
     * Initialize template engine and load templates
     */
    initialize(): Promise<void>;
    /**
     * Render template with context
     */
    render(templateName: string, context: TemplateContext): Promise<string>;
    /**
     * Get compiled template (with caching if enabled)
     */
    private getTemplate;
    /**
     * Load and register partial templates
     */
    private loadPartials;
    /**
     * Preload all templates into cache
     */
    private preloadTemplates;
    /**
     * Clear template cache
     */
    clearCache(): void;
    /**
     * Check if template exists
     */
    templateExists(templateName: string): Promise<boolean>;
    /**
     * Get list of available templates
     */
    getAvailableTemplates(): Promise<string[]>;
    /**
     * Register custom helper
     */
    registerHelper(name: string, helper: Handlebars.HelperDelegate): void;
    /**
     * Register custom partial
     */
    registerPartial(name: string, content: string): void;
    /**
     * Validate template syntax
     */
    validateTemplate(templateName: string): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Get template statistics
     */
    getStatistics(): {
        cachedTemplates: number;
        availableHelpers: string[];
        availablePartials: string[];
    };
}
