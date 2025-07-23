/**
 * Template Loader
 *
 * Use context7: Template loading and initialization system
 * Following All-Purpose Pattern: Configurable loader that works with ANY template structure
 */
import * as path from 'path';
import { TemplateRegistry } from './TemplateRegistry.js';
import { TemplateEngine } from './TemplateEngine.js';
import { logger } from '../utils/logger.js';
export class TemplateLoader {
    registry;
    engine;
    config;
    constructor(config = {}) {
        this.config = {
            templatesPath: path.join(__dirname, '../../templates'),
            autoLoad: true,
            enableBuiltInTemplates: true,
            ...config
        };
        this.registry = new TemplateRegistry();
        this.engine = new TemplateEngine({ registry: this.registry });
        if (this.config.autoLoad) {
            this.loadTemplates();
        }
    }
    /**
     * Load all templates from configured paths
     */
    async loadTemplates() {
        logger.info('Loading templates', { config: this.config });
        try {
            // Load built-in templates
            if (this.config.enableBuiltInTemplates && this.config.templatesPath) {
                await this.loadBuiltInTemplates();
            }
            // Load custom templates
            if (this.config.customTemplatesPath) {
                await this.loadCustomTemplates();
            }
            const stats = this.registry.getStatistics();
            logger.info('Template loading completed', {
                totalTemplates: stats.totalTemplates,
                compiledTemplates: stats.compiledTemplates,
                categories: stats.categoryCounts
            });
        }
        catch (error) {
            logger.error('Template loading failed', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Load built-in templates for anti-pattern replacements
     */
    async loadBuiltInTemplates() {
        if (!this.config.templatesPath)
            return;
        await this.registry.registerTemplatesFromDirectory(this.config.templatesPath);
        logger.debug('Built-in templates loaded', {
            path: this.config.templatesPath
        });
    }
    /**
     * Load custom user templates
     */
    async loadCustomTemplates() {
        if (!this.config.customTemplatesPath)
            return;
        await this.registry.registerTemplatesFromDirectory(this.config.customTemplatesPath);
        logger.debug('Custom templates loaded', {
            path: this.config.customTemplatesPath
        });
    }
    /**
     * Get the template engine instance
     */
    getEngine() {
        return this.engine;
    }
    /**
     * Get the template registry instance
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Register additional templates programmatically
     */
    registerDefaultTemplates() {
        // Register fallback templates if files are not found
        this.registerGenericReplacementTemplate();
        this.registerConfigHelperTemplate();
        logger.debug('Default fallback templates registered');
    }
    /**
     * Create template engine with loaded templates
     */
    static async create(config = {}) {
        const loader = new TemplateLoader(config);
        await loader.loadTemplates();
        loader.registerDefaultTemplates();
        return loader.getEngine();
    }
    registerGenericReplacementTemplate() {
        const genericTemplate = `
{{!-- Generic replacement template for any hardcoded pattern --}}
// Configuration-driven replacement for: {{detectionResult.originalCode}}
const configValue = {{config.configPath}}?.{{config.configKey}} || {{config.fallbackValue}};

{{#if config.addComment}}
/**
 * This value was previously hardcoded as: {{detectionResult.originalCode}}
 * It has been replaced with configuration-driven approach
 * 
 * Add to your config file:
 * {
 *   "{{config.configKey}}": {{config.fallbackValue}}
 * }
 */
{{/if}}
`;
        this.registry.registerTemplateFromSource('generic-replacement', genericTemplate, {
            name: 'Generic Replacement',
            description: 'Fallback template for any detected anti-pattern',
            category: 'generic',
            version: '1.0.0'
        });
    }
    registerConfigHelperTemplate() {
        const configHelperTemplate = `
{{!-- Configuration helper utilities --}}
// Configuration helper for {{config.configKey}}
export const {{camelCase config.configKey}}Config = {
  get: (key: string, fallback?: any) => {
    const config = {{config.configPath}} || {};
    return config[key] ?? fallback;
  },
  
  set: (key: string, value: any) => {
    {{config.configPath}} = {{config.configPath}} || {};
    {{config.configPath}}[key] = value;
  },
  
  has: (key: string) => {
    const config = {{config.configPath}} || {};
    return key in config;
  }
};

{{#ifEquals project.language "typescript"}}
// Type definitions
interface ConfigHelper {
  get<T>(key: string, fallback?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
}
{{/ifEquals}}
`;
        this.registry.registerTemplateFromSource('config-helper', configHelperTemplate, {
            name: 'Configuration Helper',
            description: 'Utility template for configuration management',
            category: 'generic',
            version: '1.0.0'
        });
    }
}
//# sourceMappingURL=TemplateLoader.js.map