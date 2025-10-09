/**
 * Tests for Standard File Templates
 * Verifies that all template files render correctly with sample data
 */

const path = require('path');
const TemplateEngine = require('../lib/templateEngine');

describe('Standard File Templates', () => {
  let templateEngine;
  const templatesDir = path.join(__dirname, '../templates');
  
  const sampleData = {
    agentName: 'Test Agent',
    description: 'A test agent for validation purposes',
    tasks: [
      {
        id: 1,
        title: 'Setup Project',
        description: 'Initialize project structure',
        details: 'Create directories and configuration',
        priority: 'high'
      },
      {
        id: 2,
        title: 'Implement Core Logic',
        description: 'Build main functionality',
        priority: 'medium'
      }
    ],
    metadata: {
      author: 'Test Developer',
      license: 'MIT',
      repository: 'https://github.com/test/test-agent',
      keywords: ['test', 'validation'],
      additionalConfig: {
        customSetting: 'value'
      }
    }
  };

  beforeEach(() => {
    templateEngine = new TemplateEngine(templatesDir);
  });

  describe('main.js template', () => {
    test('renders main.js template correctly', async () => {
      const result = await templateEngine.render('main.js', sampleData);
      
      // Check basic structure
      expect(result).toContain('Test Agent Agent');
      expect(result).toContain('A test agent for validation purposes');
      expect(result).toContain('class TestAgentAgent');
      expect(result).toContain('module.exports');
      
      // Check task comments are included
      expect(result).toContain('Task 1: Setup Project');
      expect(result).toContain('Task 2: Implement Core Logic');
      
      // Check functionality structure
      expect(result).toContain('async initialize()');
      expect(result).toContain('async process(input');
      expect(result).toContain('async cleanup()');
      expect(result).toContain('getStatus()');
      
      // Check CLI execution handling
      expect(result).toContain('require.main === module');
    });
  });

  describe('README.md template', () => {
    test('renders README.md template correctly', async () => {
      const result = await templateEngine.render('README.md', sampleData);
      
      // Check main sections
      expect(result).toContain('# Test Agent');
      expect(result).toContain('A test agent for validation purposes');
      expect(result).toContain('## Overview');
      expect(result).toContain('## Features');
      expect(result).toContain('## Installation');
      expect(result).toContain('## Configuration');
      expect(result).toContain('## Usage');
      
      // Check task listing
      expect(result).toContain('**Setup Project** (Priority: high)');
      expect(result).toContain('**Implement Core Logic** (Priority: medium)');
      
      // Check code examples
      expect(result).toContain('```javascript');
      expect(result).toContain('const { TestAgentAgent }');
      expect(result).toContain('```bash');
      
      // Check API reference
      expect(result).toContain('## API Reference');
      expect(result).toContain('### TestAgentAgent Class');
      
      // Check development info
      expect(result).toContain('## Development');
      expect(result).toContain('## Error Handling');
      expect(result).toContain('## Logging');
    });

    test('handles missing tasks gracefully', async () => {
      const dataWithoutTasks = { ...sampleData };
      delete dataWithoutTasks.tasks;
      
      const result = await templateEngine.render('README.md', dataWithoutTasks);
      
      // Should show default features instead of tasks
      expect(result).toContain('- Core Test Agent functionality');
      expect(result).toContain('- Robust error handling and logging');
    });
  });

  describe('package.json template', () => {
    test('renders package.json template correctly', async () => {
      const result = await templateEngine.render('package.json', sampleData);
      
      // Parse as JSON to validate structure
      const packageData = JSON.parse(result);
      
      // Check basic fields
      expect(packageData.name).toBe('test-agent');
      expect(packageData.description).toBe('A test agent for validation purposes');
      expect(packageData.main).toBe('main.js');
      expect(packageData.version).toBe('1.0.0');
      
      // Check bin entry
      expect(packageData.bin['test-agent']).toBe('./main.js');
      
      // Check scripts
      expect(packageData.scripts.start).toBe('node main.js');
      expect(packageData.scripts.test).toBe('jest');
      expect(packageData.scripts.lint).toBe('eslint .');
      
      // Check keywords
      expect(packageData.keywords).toContain('agent');
      expect(packageData.keywords).toContain('test-agent');
      expect(packageData.keywords).toContain('test');
      expect(packageData.keywords).toContain('validation');
      
      // Check dependencies
      expect(packageData.dependencies).toHaveProperty('fs-extra');
      expect(packageData.dependencies).toHaveProperty('chalk');
      
      // Check dev dependencies
      expect(packageData.devDependencies).toHaveProperty('jest');
      expect(packageData.devDependencies).toHaveProperty('eslint');
      
      // Check Jest configuration
      expect(packageData.jest.testEnvironment).toBe('node');
      expect(packageData.jest.coverageThreshold.global.lines).toBe(80);
      
      // Check metadata
      expect(packageData.author).toBe('Test Developer');
      expect(packageData.license).toBe('MIT');
      expect(packageData.repository.url).toBe('https://github.com/test/test-agent');
    });

    test('handles missing metadata gracefully', async () => {
      const dataWithoutMetadata = {
        agentName: 'Simple Agent',
        description: 'Simple description'
      };
      
      const result = await templateEngine.render('package.json', dataWithoutMetadata);
      const packageData = JSON.parse(result);
      
      // Should use defaults
      expect(packageData.author).toBe('Scaffold Generator');
      expect(packageData.license).toBe('ISC');
      expect(packageData.repository.url).toContain('# Add your repository URL');
    });
  });

  describe('config/default.json template', () => {
    test('renders config template correctly', async () => {
      const result = await templateEngine.render('config/default.json', sampleData);
      
      // Parse as JSON to validate structure
      const configData = JSON.parse(result);
      
      // Check main agent config
      expect(configData['test-agent']).toBeDefined();
      expect(configData['test-agent'].enabled).toBe(true);
      expect(configData['test-agent'].name).toBe('Test Agent');
      expect(configData['test-agent'].description).toBe('A test agent for validation purposes');
      expect(configData['test-agent'].logLevel).toBe('info');
      expect(configData['test-agent'].timeout).toBe(30000);
      
      // Check environment config
      expect(configData.environment.nodeEnv).toBe('development');
      expect(configData.environment.debugMode).toBe(false);
      
      // Check performance config
      expect(configData.performance.maxConcurrency).toBe(10);
      expect(configData.performance.batchSize).toBe(100);
      
      // Check monitoring config
      expect(configData.monitoring.enableMetrics).toBe(true);
      expect(configData.monitoring.healthCheckPort).toBe(3001);
      
      // Check tasks config
      expect(configData.tasks.defaultPriority).toBe('medium');
      expect(configData.tasks.maxTasksPerRun).toBe(1000);
      
      // Check custom config injection
      expect(configData.custom.customSetting).toBe('value');
    });

    test('handles missing additional config', async () => {
      const dataWithoutCustom = { ...sampleData };
      delete dataWithoutCustom.metadata.additionalConfig;
      
      const result = await templateEngine.render('config/default.json', dataWithoutCustom);
      const configData = JSON.parse(result);
      
      // Should not have custom section
      expect(configData.custom).toBeUndefined();
    });
  });

  describe('template completeness', () => {
    test('all required templates exist', async () => {
      const templates = await templateEngine.listTemplates();
      
      expect(templates).toContain('main.js');
      expect(templates).toContain('README.md');
      expect(templates).toContain('package.json');
    });

    test('config template exists in subdirectory', async () => {
      const configTemplateExists = await templateEngine.templateExists('config/default.json');
      expect(configTemplateExists).toBe(true);
    });
  });
});