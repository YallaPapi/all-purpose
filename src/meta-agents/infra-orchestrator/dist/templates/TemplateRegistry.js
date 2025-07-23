/**
 * Template Registry
 *
 * Use context7: Centralized template storage and management system
 * Following All-Purpose Pattern: Configurable registry that works with ANY template structure
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import Handlebars from 'handlebars';
import { logger } from '../utils/logger.js';
export class TemplateRegistry {
    templates = new Map();
    compiledTemplates = new Map();
    config;
    handlebarsInstance;
    constructor(config = {}) {
        this.config = {
            baseTemplatesPath: './templates',
            autoReload: false,
            cacheCompiledTemplates: true,
            strictMode: false,
            ...config
        };
        // Create isolated Handlebars instance
        this.handlebarsInstance = Handlebars.create();
        // Register built-in helpers
        this.registerBuiltInHelpers();
        // Register custom helpers if provided
        if (this.config.customHelpers) {
            Object.entries(this.config.customHelpers).forEach(([name, helper]) => {
                this.handlebarsInstance.registerHelper(name, helper);
            });
        }
        logger.info('TemplateRegistry initialized', {
            baseTemplatesPath: this.config.baseTemplatesPath,
            cacheEnabled: this.config.cacheCompiledTemplates
        });
    }
    /**
     * Register a template by object
     */
    registerTemplate(template) {
        this.validateTemplate(template);
        this.templates.set(template.metadata.id, template);
        // Pre-compile if caching is enabled
        if (this.config.cacheCompiledTemplates) {
            try {
                const compiled = this.handlebarsInstance.compile(template.source);
                this.compiledTemplates.set(template.metadata.id, compiled);
                template.compiled = compiled;
            }
            catch (error) {
                logger.error('Failed to compile template', {
                    templateId: template.metadata.id,
                    error: error instanceof Error ? error.message : String(error)
                });
                throw new Error(`Failed to compile template ${template.metadata.id}: ${error}`);
            }
        }
        logger.debug('Template registered', {
            id: template.metadata.id,
            name: template.metadata.name,
            category: template.metadata.category
        });
    }
    /**
     * Register a template by source string
     */
    registerTemplateFromSource(id, source, metadata) {
        const template = {
            metadata: {
                id,
                name: metadata?.name || id,
                description: metadata?.description || `Template ${id}`,
                category: metadata?.category || 'generic',
                version: metadata?.version || '1.0.0',
                created: new Date(),
                updated: new Date(),
                ...metadata
            },
            source
        };
        this.registerTemplate(template);
    }
    /**
     * Register templates from files in a directory
     */
    async registerTemplatesFromDirectory(dirPath) {
        if (!await fs.pathExists(dirPath)) {
            logger.warn('Template directory not found', { dirPath });
            return;
        }
        const templateFiles = await glob('**/*.hbs', { cwd: dirPath });
        for (const file of templateFiles) {
            try {
                const fullPath = path.join(dirPath, file);
                const source = await fs.readFile(fullPath, 'utf-8');
                const id = path.basename(file, '.hbs');
                // Try to load metadata file if exists
                const metadataPath = path.join(dirPath, `${path.dirname(file)}/${id}.meta.json`);
                let metadata = {};
                if (await fs.pathExists(metadataPath)) {
                    metadata = await fs.readJSON(metadataPath);
                }
                this.registerTemplateFromSource(id, source, metadata);
            }
            catch (error) {
                logger.error('Failed to register template from file', {
                    file,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        logger.info('Templates registered from directory', {
            dirPath,
            count: templateFiles.length
        });
    }
    /**
     * Get template by ID
     */
    getTemplate(id) {
        return this.templates.get(id);
    }
    /**
     * Get compiled template by ID
     */
    getCompiledTemplate(id) {
        if (this.config.cacheCompiledTemplates) {
            return this.compiledTemplates.get(id);
        }
        const template = this.getTemplate(id);
        if (!template)
            return undefined;
        try {
            return this.handlebarsInstance.compile(template.source);
        }
        catch (error) {
            logger.error('Failed to compile template on demand', {
                templateId: id,
                error: error instanceof Error ? error.message : String(error)
            });
            return undefined;
        }
    }
    /**
     * List all templates
     */
    listTemplates() {
        return Array.from(this.templates.values()).map(t => t.metadata);
    }
    /**
     * List templates by category
     */
    listTemplatesByCategory(category) {
        return this.listTemplates().filter(t => t.category === category);
    }
    /**
     * Search templates by tags or name
     */
    searchTemplates(query) {
        const lowerQuery = query.toLowerCase();
        return this.listTemplates().filter(template => template.name.toLowerCase().includes(lowerQuery) ||
            template.description.toLowerCase().includes(lowerQuery) ||
            template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)));
    }
    /**
     * Remove template by ID
     */
    unregisterTemplate(id) {
        const removed = this.templates.delete(id);
        this.compiledTemplates.delete(id);
        if (removed) {
            logger.debug('Template unregistered', { id });
        }
        return removed;
    }
    /**
     * Clear all templates
     */
    clear() {
        this.templates.clear();
        this.compiledTemplates.clear();
        logger.info('All templates cleared');
    }
    /**
     * Validate template structure
     */
    validateTemplate(template) {
        const errors = [];
        const warnings = [];
        // Check required metadata
        if (!template.metadata.id) {
            errors.push('Template ID is required');
        }
        if (!template.metadata.name) {
            errors.push('Template name is required');
        }
        if (!template.source || template.source.trim().length === 0) {
            errors.push('Template source is required');
        }
        // Check for duplicate ID
        if (this.templates.has(template.metadata.id)) {
            warnings.push(`Template with ID '${template.metadata.id}' already exists and will be overwritten`);
        }
        // Try to compile template to check for syntax errors
        if (template.source) {
            try {
                this.handlebarsInstance.compile(template.source);
            }
            catch (error) {
                errors.push(`Template compilation failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const result = {
            valid: errors.length === 0,
            errors,
            warnings
        };
        if (!result.valid && this.config.strictMode) {
            throw new Error(`Template validation failed: ${errors.join(', ')}`);
        }
        return result;
    }
    /**
     * Register a custom Handlebars helper
     */
    registerHelper(helper) {
        this.handlebarsInstance.registerHelper(helper.name, helper.helper);
        logger.debug('Handlebars helper registered', { name: helper.name });
    }
    /**
     * Get Handlebars instance for advanced usage
     */
    getHandlebarsInstance() {
        return this.handlebarsInstance;
    }
    /**
     * Get registry statistics
     */
    getStatistics() {
        const categoryCounts = {};
        for (const template of this.templates.values()) {
            categoryCounts[template.metadata.category] = (categoryCounts[template.metadata.category] || 0) + 1;
        }
        return {
            totalTemplates: this.templates.size,
            compiledTemplates: this.compiledTemplates.size,
            categoryCounts,
            memoryUsage: {
                templatesSize: this.templates.size,
                compiledSize: this.compiledTemplates.size
            }
        };
    }
    registerBuiltInHelpers() {
        // Config helper - access nested config values
        this.handlebarsInstance.registerHelper('config', function (path, options) {
            const config = options.data.root.config || {};
            return path.split('.').reduce((obj, key) => obj && obj[key], config) || '';
        });
        // User input helper - access user-provided values
        this.handlebarsInstance.registerHelper('userInput', function (key, options) {
            const userInputs = options.data.root.userInputs || {};
            return userInputs[key] || '';
        });
        // Dynamic parameter helper - creates parameter references
        this.handlebarsInstance.registerHelper('dynamicParam', function (name, fallback) {
            return `{{config.${name}}}` + (fallback ? ` || '${fallback}'` : '');
        });
        // Config path helper - generates proper config path references
        this.handlebarsInstance.registerHelper('configPath', function (path) {
            return `config.${path}`;
        });
        // Camel case helper
        this.handlebarsInstance.registerHelper('camelCase', function (str) {
            return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        });
        // Pascal case helper
        this.handlebarsInstance.registerHelper('pascalCase', function (str) {
            const camelCase = str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
        });
        // Snake case helper
        this.handlebarsInstance.registerHelper('snakeCase', function (str) {
            return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        });
        // JSON stringify helper
        this.handlebarsInstance.registerHelper('json', function (context) {
            return JSON.stringify(context, null, 2);
        });
        // If equals helper
        this.handlebarsInstance.registerHelper('ifEquals', function (arg1, arg2, options) {
            return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
        });
        logger.debug('Built-in Handlebars helpers registered');
    }
}
//# sourceMappingURL=TemplateRegistry.js.map