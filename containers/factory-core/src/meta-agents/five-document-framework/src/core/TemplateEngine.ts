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

import { ProjectConfig, TemplateContext } from '../types/index.js';

export interface TemplateEngineConfig {
  templateDir: string;
  projectConfig: ProjectConfig;
  customHelpers?: Record<string, Handlebars.HelperDelegate>;
  templateCache?: boolean;
}

export class TemplateEngine {
  private config: TemplateEngineConfig;
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private initialized: boolean = false;

  constructor(config: TemplateEngineConfig) {
    this.config = {
      templateCache: true, // Default to caching enabled
      ...config
    };
  }

  /**
   * Initialize template engine and load templates
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

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

    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize template engine:'), error);
      throw error;
    }
  }

  /**
   * Render template with context
   */
  async render(templateName: string, context: TemplateContext): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Get compiled template
      const template = await this.getTemplate(templateName);
      
      // Render with context
      const rendered = template(context);
      
      return rendered;

    } catch (error) {
      console.error(chalk.red(`❌ Failed to render template ${templateName}:`), error);
      throw new Error(`Template rendering failed: ${error}`);
    }
  }

  /**
   * Get compiled template (with caching if enabled)
   */
  private async getTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.config.templateCache && this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
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
  private async loadPartials(): Promise<void> {
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

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to load some partials:'), error);
    }
  }

  /**
   * Preload all templates into cache
   */
  private async preloadTemplates(): Promise<void> {
    try {
      const templateFiles = await glob('*.hbs', { 
        cwd: this.config.templateDir,
        absolute: false 
      });

      for (const templateFile of templateFiles) {
        try {
          await this.getTemplate(templateFile);
          console.log(chalk.blue(`📄 Preloaded template: ${templateFile}`));
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Failed to preload template ${templateFile}:`), error);
        }
      }

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to preload templates:'), error);
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    console.log(chalk.blue('🧹 Template cache cleared'));
  }

  /**
   * Check if template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    const templatePath = path.join(this.config.templateDir, templateName);
    return await fs.pathExists(templatePath);
  }

  /**
   * Get list of available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const templateFiles = await glob('*.hbs', { 
        cwd: this.config.templateDir,
        absolute: false 
      });
      
      return templateFiles;
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to get available templates:'), error);
      return [];
    }
  }

  /**
   * Register custom helper
   */
  registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    Handlebars.registerHelper(name, helper);
    console.log(chalk.blue(`🔧 Registered helper: ${name}`));
  }

  /**
   * Register custom partial
   */
  registerPartial(name: string, content: string): void {
    Handlebars.registerPartial(name, content);
    console.log(chalk.blue(`📄 Registered partial: ${name}`));
  }

  /**
   * Validate template syntax
   */
  async validateTemplate(templateName: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const templatePath = path.join(this.config.templateDir, templateName);
      
      if (!await fs.pathExists(templatePath)) {
        return { valid: false, error: 'Template file not found' };
      }

      const templateSource = await fs.readFile(templatePath, 'utf8');
      
      try {
        Handlebars.compile(templateSource);
        return { valid: true };
      } catch (compileError: any) {
        return { valid: false, error: compileError.message };
      }

    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get template statistics
   */
  getStatistics(): {
    cachedTemplates: number;
    availableHelpers: string[];
    availablePartials: string[];
  } {
    return {
      cachedTemplates: this.templateCache.size,
      availableHelpers: Object.keys(Handlebars.helpers),
      availablePartials: Object.keys(Handlebars.partials)
    };
  }
}