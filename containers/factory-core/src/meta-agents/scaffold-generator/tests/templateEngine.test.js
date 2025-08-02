/**
 * Tests for Template Engine
 * Following current Jest best practices for testing Handlebars integration
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const TemplateEngine = require('../lib/templateEngine');

describe('Template Engine', () => {
  let templateEngine;
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for test templates
    tempDir = path.join(os.tmpdir(), `scaffold-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
    
    templateEngine = new TemplateEngine(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    test('initializes with default templates directory', () => {
      const engine = new TemplateEngine();
      expect(engine.templatesDir).toContain('templates');
    });

    test('initializes with custom templates directory', () => {
      const customDir = '/custom/path';
      const engine = new TemplateEngine(customDir);
      expect(engine.templatesDir).toBe(customDir);
    });
  });

  describe('registerHelpers', () => {
    test('registers string transformation helpers', () => {
      const template = templateEngine.compileTemplate('{{lowercase name}} {{uppercase name}} {{capitalize name}}');
      const result = template({ name: 'Test Agent' });
      expect(result).toBe('test agent TEST AGENT Test Agent');
    });

    test('registers case conversion helpers', () => {
      const template = templateEngine.compileTemplate('{{kebabCase name}} {{camelCase name}} {{pascalCase name}}');
      const result = template({ name: 'Test Agent Name' });
      expect(result).toBe('test-agent-name testAgentName TestAgentName');
    });

    test('registers date helpers', () => {
      const template = templateEngine.compileTemplate('{{formatDate "YYYY-MM-DD"}} {{currentYear}}');
      const result = template({});
      
      const currentYear = new Date().getFullYear();
      expect(result).toContain(String(currentYear));
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    test('registers conditional helpers', () => {
      const template = templateEngine.compileTemplate('{{#ifEquals status "active"}}Active{{else}}Inactive{{/ifEquals}}');
      
      expect(template({ status: 'active' })).toBe('Active');
      expect(template({ status: 'inactive' })).toBe('Inactive');
    });

    test('registers array helpers', () => {
      const template = templateEngine.compileTemplate('Length: {{length items}}');
      expect(template({ items: [1, 2, 3] })).toBe('Length: 3');
      expect(template({ items: [] })).toBe('Length: 0');
      expect(template({})).toBe('Length: 0');
    });
  });

  describe('compileTemplate', () => {
    test('compiles template from string', () => {
      const templateString = 'Hello {{name}}!';
      const compiled = templateEngine.compileTemplate(templateString);
      
      expect(typeof compiled).toBe('function');
      expect(compiled({ name: 'World' })).toBe('Hello World!');
    });

    test('caches compiled template with key', () => {
      const templateString = 'Hello {{name}}!';
      templateEngine.compileTemplate(templateString, 'greeting');
      
      expect(templateEngine.compiledTemplates.has('greeting')).toBe(true);
    });

    test('throws error for invalid template string', () => {
      expect(() => templateEngine.compileTemplate(null)).toThrow('Template string is required');
      expect(() => templateEngine.compileTemplate('')).toThrow('Template string is required');
    });
  });

  describe('loadTemplate', () => {
    test('loads and compiles template from file', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = path.join(tempDir, 'greeting.hbs');
      await fs.writeFile(templatePath, templateContent);

      const compiled = await templateEngine.loadTemplate('greeting');
      expect(typeof compiled).toBe('function');
      expect(compiled({ name: 'World' })).toBe('Hello World!');
    });

    test('caches loaded templates', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = path.join(tempDir, 'greeting.hbs');
      await fs.writeFile(templatePath, templateContent);

      await templateEngine.loadTemplate('greeting');
      expect(templateEngine.compiledTemplates.has('greeting')).toBe(true);
      
      // Second call should use cache
      await templateEngine.loadTemplate('greeting');
      expect(templateEngine.compiledTemplates.size).toBe(1);
    });

    test('throws error for missing template', async () => {
      await expect(templateEngine.loadTemplate('nonexistent'))
        .rejects.toThrow('Template not found: nonexistent.hbs');
    });
  });

  describe('render', () => {
    test('renders template by name', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = path.join(tempDir, 'greeting.hbs');
      await fs.writeFile(templatePath, templateContent);

      const result = await templateEngine.render('greeting', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    test('renders with compiled template function', async () => {
      const compiled = templateEngine.compileTemplate('Hello {{name}}!');
      const result = await templateEngine.render(compiled, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    test('renders with empty data object', async () => {
      const templateContent = 'Hello World!';
      const templatePath = path.join(tempDir, 'static.hbs');
      await fs.writeFile(templatePath, templateContent);

      const result = await templateEngine.render('static');
      expect(result).toBe('Hello World!');
    });

    test('throws error for invalid template parameter', async () => {
      await expect(templateEngine.render(123, {}))
        .rejects.toThrow('Template must be a string');
    });
  });

  describe('renderFromFile', () => {
    test('renders template from file path', async () => {
      const templateContent = 'Hello {{name}}!';
      const templatePath = path.join(tempDir, 'greeting.hbs');
      await fs.writeFile(templatePath, templateContent);

      const result = await templateEngine.renderFromFile(templatePath, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    test('throws error for missing file', async () => {
      const nonexistentPath = path.join(tempDir, 'nonexistent.hbs');
      await expect(templateEngine.renderFromFile(nonexistentPath, {}))
        .rejects.toThrow('Failed to render template from file');
    });
  });

  describe('templateExists', () => {
    test('returns true for existing template', async () => {
      const templatePath = path.join(tempDir, 'test.hbs');
      await fs.writeFile(templatePath, 'content');

      const exists = await templateEngine.templateExists('test');
      expect(exists).toBe(true);
    });

    test('returns false for non-existing template', async () => {
      const exists = await templateEngine.templateExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('listTemplates', () => {
    test('lists available templates', async () => {
      await fs.writeFile(path.join(tempDir, 'template1.hbs'), 'content1');
      await fs.writeFile(path.join(tempDir, 'template2.hbs'), 'content2');
      await fs.writeFile(path.join(tempDir, 'nottemplate.txt'), 'content3');

      const templates = await templateEngine.listTemplates();
      expect(templates).toEqual(expect.arrayContaining(['template1', 'template2']));
      expect(templates).not.toContain('nottemplate');
      expect(templates.length).toBe(2);
    });

    test('returns empty array when no templates exist', async () => {
      const templates = await templateEngine.listTemplates();
      expect(templates).toEqual([]);
    });
  });

  describe('clearCache', () => {
    test('clears specific template from cache', async () => {
      templateEngine.compileTemplate('Hello!', 'test1');
      templateEngine.compileTemplate('Hi!', 'test2');

      expect(templateEngine.compiledTemplates.size).toBe(2);
      
      templateEngine.clearCache('test1');
      expect(templateEngine.compiledTemplates.size).toBe(1);
      expect(templateEngine.compiledTemplates.has('test2')).toBe(true);
    });

    test('clears all templates from cache', async () => {
      templateEngine.compileTemplate('Hello!', 'test1');
      templateEngine.compileTemplate('Hi!', 'test2');

      expect(templateEngine.compiledTemplates.size).toBe(2);
      
      templateEngine.clearCache();
      expect(templateEngine.compiledTemplates.size).toBe(0);
    });
  });

  describe('custom helpers', () => {
    test('registers single custom helper', () => {
      templateEngine.registerHelper('reverse', (str) => str.split('').reverse().join(''));
      
      const template = templateEngine.compileTemplate('{{reverse text}}');
      expect(template({ text: 'hello' })).toBe('olleh');
    });

    test('registers multiple custom helpers', () => {
      const helpers = {
        double: (num) => num * 2,
        triple: (num) => num * 3
      };
      
      templateEngine.registerHelpers(helpers);
      
      const template = templateEngine.compileTemplate('{{double num}} {{triple num}}');
      expect(template({ num: 5 })).toBe('10 15');
    });
  });

  describe('helper edge cases', () => {
    test('handles undefined/null values in helpers gracefully', () => {
      const template = templateEngine.compileTemplate('{{lowercase name}} {{kebabCase name}} {{length items}}');
      const result = template({ name: null, items: undefined });
      expect(result).toBe('  0');
    });

    test('handles empty strings in helpers', () => {
      const template = templateEngine.compileTemplate('{{capitalize name}} {{kebabCase name}}');
      const result = template({ name: '' });
      expect(result).toBe(' ');
    });
  });
});