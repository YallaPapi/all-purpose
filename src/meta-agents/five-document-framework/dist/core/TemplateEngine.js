/**
 * Template Engine for Five Document Framework Agent
 *
 * Handles dynamic template processing with Handlebars
 * Following All-Purpose Pattern: UNLIMITED template customization
 */
import path from 'path';
import fs from 'fs-extra';
import Handlebars from 'handlebars';
import { glob } from 'glob';
import chalk from 'chalk';
export class TemplateEngine {
    config;
    templateCache = new Map();
    initialized = false;
    constructor(config) {
        this.config = {
            templateCache: true, // Default to caching enabled
            ...config
        };
    }
    /**
     * Initialize template engine and load templates
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            // Ensure template directory exists
            await fs.ensureDir(this.config.templateDir);
            // Register custom helpers if provided
            if (this.config.customHelpers) {
                Object.entries(this.config.customHelpers).forEach(([name, helper]) => {
                    Handlebars.registerHelper(name, helper);
                });
            }
            // Load and register partials
            await this.loadPartials();
            // Preload templates if caching is enabled
            if (this.config.templateCache) {
                await this.preloadTemplates();
            }
            this.initialized = true;
            console.log(chalk.green('🔧 Template engine initialized'));
        }
        catch (error) {
            console.error(chalk.red('❌ Failed to initialize template engine:'), error);
            throw error;
        }
    }
    /**
     * Render template with context
     */
    async render(templateName, context) {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            // Get compiled template
            const template = await this.getTemplate(templateName);
            // Render with context
            const rendered = template(context);
            return rendered;
        }
        catch (error) {
            console.error(chalk.red(`❌ Failed to render template ${templateName}:`), error);
            throw new Error(`Template rendering failed: ${error}`);
        }
    }
    /**
     * Get compiled template (with caching if enabled)
     */
    async getTemplate(templateName) {
        // Check cache first
        if (this.config.templateCache && this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }
        // Load and compile template
        const templatePath = path.join(this.config.templateDir, templateName);
        if (!await fs.pathExists(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }
        const templateSource = await fs.readFile(templatePath, 'utf8');
        const compiledTemplate = Handlebars.compile(templateSource);
        // Cache if enabled
        if (this.config.templateCache) {
            this.templateCache.set(templateName, compiledTemplate);
        }
        return compiledTemplate;
    }
    /**
     * Load and register partial templates
     */
    async loadPartials() {
        const partialsDir = path.join(this.config.templateDir, 'partials');
        if (!await fs.pathExists(partialsDir)) {
            return; // No partials directory, skip
        }
        try {
            const partialFiles = await glob('**/*.hbs', {
                cwd: partialsDir,
                absolute: false
            });
            for (const partialFile of partialFiles) {
                const partialName = path.basename(partialFile, '.hbs');
                const partialPath = path.join(partialsDir, partialFile);
                const partialContent = await fs.readFile(partialPath, 'utf8');
                Handlebars.registerPartial(partialName, partialContent);
                console.log(chalk.blue(`📄 Registered partial: ${partialName}`));
            }
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to load some partials:'), error);
        }
    }
    /**
     * Preload all templates into cache
     */
    async preloadTemplates() {
        try {
            const templateFiles = await glob('*.hbs', {
                cwd: this.config.templateDir,
                absolute: false
            });
            for (const templateFile of templateFiles) {
                try {
                    await this.getTemplate(templateFile);
                    console.log(chalk.blue(`📄 Preloaded template: ${templateFile}`));
                }
                catch (error) {
                    console.warn(chalk.yellow(`⚠️  Failed to preload template ${templateFile}:`), error);
                }
            }
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to preload templates:'), error);
        }
    }
    /**
     * Clear template cache
     */
    clearCache() {
        this.templateCache.clear();
        console.log(chalk.blue('🧹 Template cache cleared'));
    }
    /**
     * Check if template exists
     */
    async templateExists(templateName) {
        const templatePath = path.join(this.config.templateDir, templateName);
        return await fs.pathExists(templatePath);
    }
    /**
     * Get list of available templates
     */
    async getAvailableTemplates() {
        try {
            const templateFiles = await glob('*.hbs', {
                cwd: this.config.templateDir,
                absolute: false
            });
            return templateFiles;
        }
        catch (error) {
            console.warn(chalk.yellow('⚠️  Failed to get available templates:'), error);
            return [];
        }
    }
    /**
     * Register custom helper
     */
    registerHelper(name, helper) {
        Handlebars.registerHelper(name, helper);
        console.log(chalk.blue(`🔧 Registered helper: ${name}`));
    }
    /**
     * Register custom partial
     */
    registerPartial(name, content) {
        Handlebars.registerPartial(name, content);
        console.log(chalk.blue(`📄 Registered partial: ${name}`));
    }
    /**
     * Validate template syntax
     */
    async validateTemplate(templateName) {
        try {
            const templatePath = path.join(this.config.templateDir, templateName);
            if (!await fs.pathExists(templatePath)) {
                return { valid: false, error: 'Template file not found' };
            }
            const templateSource = await fs.readFile(templatePath, 'utf8');
            try {
                Handlebars.compile(templateSource);
                return { valid: true };
            }
            catch (compileError) {
                return { valid: false, error: compileError.message };
            }
        }
        catch (error) {
            return { valid: false, error: error.message };
        }
    }
    /**
     * Get template statistics
     */
    getStatistics() {
        return {
            cachedTemplates: this.templateCache.size,
            availableHelpers: Object.keys(Handlebars.helpers),
            availablePartials: Object.keys(Handlebars.partials)
        };
    }
}
