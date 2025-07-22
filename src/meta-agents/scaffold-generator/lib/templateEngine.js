/**
 * Template Engine - Handlebars Integration
 * 
 * Provides template rendering capabilities using Handlebars.js 4.7.8
 * Following current best practices for template organization and helpers.
 */

const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

class TemplateEngine {
  constructor(templatesDir) {
    this.templatesDir = templatesDir || path.join(__dirname, '../templates');
    this.compiledTemplates = new Map(); // Cache compiled templates
    
    // Register custom helpers on initialization
    this.registerBuiltInHelpers();
  }

  /**
   * Register built-in Handlebars helpers for common transformations
   * Following current best practices for helper registration
   */
  registerBuiltInHelpers() {
    // String transformation helpers
    Handlebars.registerHelper('lowercase', (str) => {
      return typeof str === 'string' ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('uppercase', (str) => {
      return typeof str === 'string' ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('capitalize', (str) => {
      if (typeof str !== 'string' || str.length === 0) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Convert to kebab-case (for file names)
    Handlebars.registerHelper('kebabCase', (str) => {
      if (typeof str !== 'string') return '';
      return str
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    });

    // Convert to camelCase (for JavaScript identifiers)
    Handlebars.registerHelper('camelCase', (str) => {
      if (typeof str !== 'string') return '';
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
    });

    // Convert to PascalCase (for class names)
    Handlebars.registerHelper('pascalCase', (str) => {
      if (typeof str !== 'string') return '';
      return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
        .replace(/\s+/g, '');
    });

    // Date formatting helper
    Handlebars.registerHelper('formatDate', (format) => {
      const date = new Date();
      const formatStr = format || 'YYYY-MM-DD';
      
      return formatStr
        .replace('YYYY', date.getFullYear())
        .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(date.getDate()).padStart(2, '0'))
        .replace('HH', String(date.getHours()).padStart(2, '0'))
        .replace('mm', String(date.getMinutes()).padStart(2, '0'))
        .replace('ss', String(date.getSeconds()).padStart(2, '0'));
    });

    // Current year helper
    Handlebars.registerHelper('currentYear', () => {
      return new Date().getFullYear();
    });

    // Conditional helpers
    Handlebars.registerHelper('ifEquals', (arg1, arg2, options) => {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifNotEmpty', (value, options) => {
      if (value && (typeof value === 'string' ? value.trim() : value)) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Array helpers
    Handlebars.registerHelper('length', (array) => {
      return Array.isArray(array) ? array.length : 0;
    });

    // JSON helper for debugging
    Handlebars.registerHelper('json', (obj) => {
      return JSON.stringify(obj, null, 2);
    });
  }

  /**
   * Load template from file with caching
   * @param {string} templateName - Name of template (without .hbs extension)
   * @returns {Promise<Function>} - Compiled Handlebars template
   */
  async loadTemplate(templateName) {
    // Check cache first
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName);
    }

    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiledTemplate = Handlebars.compile(templateContent);
      
      // Cache the compiled template
      this.compiledTemplates.set(templateName, compiledTemplate);
      
      return compiledTemplate;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Template not found: ${templateName}.hbs in ${this.templatesDir}`);
      }
      throw new Error(`Failed to load template ${templateName}: ${error.message}`);
    }
  }

  /**
   * Compile template from string
   * @param {string} templateString - Template content as string
   * @param {string} cacheKey - Optional key to cache compiled template
   * @returns {Function} - Compiled Handlebars template
   */
  compileTemplate(templateString, cacheKey) {
    if (!templateString || typeof templateString !== 'string') {
      throw new Error('Template string is required and must be a string');
    }

    try {
      const compiledTemplate = Handlebars.compile(templateString);
      
      // Cache if key provided
      if (cacheKey) {
        this.compiledTemplates.set(cacheKey, compiledTemplate);
      }
      
      return compiledTemplate;
    } catch (error) {
      throw new Error(`Failed to compile template: ${error.message}`);
    }
  }

  /**
   * Render template with data
   * @param {string|Function} template - Template name or compiled template
   * @param {Object} data - Data to render template with
   * @returns {Promise<string>} - Rendered template
   */
  async render(template, data = {}) {
    try {
      let compiledTemplate;

      if (typeof template === 'string') {
        // Load template by name
        compiledTemplate = await this.loadTemplate(template);
      } else if (typeof template === 'function') {
        // Use provided compiled template
        compiledTemplate = template;
      } else {
        throw new Error('Template must be a string (template name) or function (compiled template)');
      }

      // Render with data
      return compiledTemplate(data);
    } catch (error) {
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  /**
   * Render template from file path with data
   * @param {string} templatePath - Full path to template file
   * @param {Object} data - Data to render template with
   * @returns {Promise<string>} - Rendered template
   */
  async renderFromFile(templatePath, data = {}) {
    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      const compiledTemplate = this.compileTemplate(templateContent);
      return compiledTemplate(data);
    } catch (error) {
      throw new Error(`Failed to render template from file ${templatePath}: ${error.message}`);
    }
  }

  /**
   * Check if template exists
   * @param {string} templateName - Name of template
   * @returns {Promise<boolean>} - Whether template exists
   */
  async templateExists(templateName) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
      return await fs.pathExists(templatePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * List available templates
   * @returns {Promise<string[]>} - Array of template names (without .hbs extension)
   */
  async listTemplates() {
    try {
      const files = await fs.readdir(this.templatesDir);
      return files
        .filter(file => file.endsWith('.hbs'))
        .map(file => file.replace('.hbs', ''));
    } catch (error) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }
  }

  /**
   * Clear template cache
   * @param {string} templateName - Optional specific template to clear, or all if not provided
   */
  clearCache(templateName) {
    if (templateName) {
      this.compiledTemplates.delete(templateName);
    } else {
      this.compiledTemplates.clear();
    }
  }

  /**
   * Register a custom helper
   * @param {string} name - Helper name
   * @param {Function} fn - Helper function
   */
  registerHelper(name, fn) {
    Handlebars.registerHelper(name, fn);
  }

  /**
   * Register multiple helpers at once
   * @param {Object} helpers - Object with helper name/function pairs
   */
  registerHelpers(helpers) {
    if (helpers && typeof helpers === 'object') {
      Object.entries(helpers).forEach(([name, fn]) => {
        if (typeof fn === 'function') {
          this.registerHelper(name, fn);
        }
      });
    }
  }
}

module.exports = TemplateEngine;