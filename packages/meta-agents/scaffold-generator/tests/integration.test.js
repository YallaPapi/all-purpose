/**
 * Integration Tests for Scaffold Generator
 * Tests the complete workflow end-to-end
 */

const fs = require('fs-extra');
const path = require('path');
const { ScaffoldGeneratorAgent, main } = require('../main');

describe('Scaffold Generator Integration', () => {
  let tempDir;
  let templatesDir;
  
  const samplePRD = {
    tasks: [
      {
        id: 1,
        title: 'Initialize System',
        description: 'Set up the basic system components',
        details: 'Create configuration, logging, and error handling',
        priority: 'high'
      },
      {
        id: 2,
        title: 'Implement Core Logic',
        description: 'Build the main processing functionality',
        priority: 'medium'
      }
    ],
    metadata: {
      projectName: 'Example Agent',
      description: 'An example agent for testing the complete workflow',
      author: 'Integration Test',
      license: 'MIT',
      repository: 'https://github.com/test/example-agent',
      keywords: ['test', 'example'],
      additionalConfig: {
        testMode: true,
        debugLevel: 2
      }
    }
  };

  beforeEach(async () => {
    tempDir = path.join(__dirname, 'temp-integration', `test-${Date.now()}`);
    templatesDir = path.join(__dirname, '../templates');
    
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    try {
      if (tempDir && await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('ScaffoldGeneratorAgent Class', () => {
    test('complete workflow with agent class', async () => {
      const agent = new ScaffoldGeneratorAgent({
        outputDir: tempDir,
        templatesDir: templatesDir,
        logLevel: 'error' // Suppress logs during test
      });

      // Initialize
      await agent.initialize();
      expect(agent.isInitialized).toBe(true);

      // Process
      const result = await agent.process(samplePRD);
      
      expect(result.success).toBe(true);
      expect(result.agentName).toBe('example');
      expect(result.files.length).toBeGreaterThan(0);
      
      // Verify generated files
      const agentDir = path.join(tempDir, 'example');
      expect(await fs.pathExists(path.join(agentDir, 'main.js'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'README.md'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'config', 'default.json'))).toBe(true);
      
      // Verify file contents
      const mainContent = await fs.readFile(path.join(agentDir, 'main.js'), 'utf8');
      expect(mainContent).toContain('ExampleAgent');
      expect(mainContent).toContain('Initialize System');
      expect(mainContent).toContain('Implement Core Logic');
      
      const readmeContent = await fs.readFile(path.join(agentDir, 'README.md'), 'utf8');
      expect(readmeContent).toContain('# Example');
      expect(readmeContent).toContain('**Initialize System** (Priority: high)');
      
      const packageContent = await fs.readFile(path.join(agentDir, 'package.json'), 'utf8');
      const packageData = JSON.parse(packageContent);
      expect(packageData.name).toBe('example');
      expect(packageData.keywords).toContain('test');
      expect(packageData.keywords).toContain('example');
      
      const configContent = await fs.readFile(path.join(agentDir, 'config', 'default.json'), 'utf8');
      const configData = JSON.parse(configContent);
      expect(configData['example'].name).toBe('Example');
      expect(configData.custom.testMode).toBe(true);
      expect(configData.custom.debugLevel).toBe(2);

      // Cleanup
      await agent.cleanup();
      expect(agent.isInitialized).toBe(false);
    });

    test('handles file input', async () => {
      // Create temporary PRD file
      const prdFile = path.join(tempDir, 'test-prd.json');
      await fs.writeFile(prdFile, JSON.stringify(samplePRD, null, 2));

      const agent = new ScaffoldGeneratorAgent({
        outputDir: tempDir,
        templatesDir: templatesDir,
        logLevel: 'error'
      });

      await agent.initialize();
      const result = await agent.process(prdFile);
      
      expect(result.success).toBe(true);
      expect(result.agentName).toBe('example');
      
      await agent.cleanup();
    });

    test('handles JSON string input', async () => {
      const agent = new ScaffoldGeneratorAgent({
        outputDir: tempDir,
        templatesDir: templatesDir,
        logLevel: 'error'
      });

      await agent.initialize();
      const result = await agent.process(JSON.stringify(samplePRD));
      
      expect(result.success).toBe(true);
      expect(result.agentName).toBe('example');
      
      await agent.cleanup();
    });

    test('respects configuration options', async () => {
      const agent = new ScaffoldGeneratorAgent({
        outputDir: tempDir,
        templatesDir: templatesDir,
        includeTests: true,
        includeGitignore: true,
        logLevel: 'error'
      });

      await agent.initialize();
      const result = await agent.process(samplePRD);
      
      const agentDir = path.join(tempDir, 'example');
      expect(await fs.pathExists(path.join(agentDir, 'tests', 'example.test.js'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, '.gitignore'))).toBe(true);
      
      await agent.cleanup();
    });
  });

  describe('main function', () => {
    test('programmatic usage with main function', async () => {
      const result = await main({
        input: samplePRD,
        outputDir: tempDir,
        templatesDir: templatesDir,
        logLevel: 'error'
      });

      expect(result.success).toBe(true);
      expect(result.agentName).toBe('example');
      
      // Verify files were created
      const agentDir = path.join(tempDir, 'example');
      expect(await fs.pathExists(agentDir)).toBe(true);
    });

    test('handles errors gracefully', async () => {
      // Test with invalid PRD data
      const invalidPRD = {
        // Missing required fields
      };

      await expect(main({
        input: invalidPRD,
        outputDir: tempDir,
        templatesDir: templatesDir,
        logLevel: 'error'
      })).rejects.toThrow();
    });
  });

  describe('generated agent functionality', () => {
    test('generated agent is executable and functional', async () => {
      const agent = new ScaffoldGeneratorAgent({
        outputDir: tempDir,
        templatesDir: templatesDir,
        logLevel: 'error'
      });

      await agent.initialize();
      await agent.process(samplePRD);
      await agent.cleanup();

      // Try to load and test the generated agent
      const agentPath = path.join(tempDir, 'example', 'main.js');
      
      // Verify the file is executable
      const stats = await fs.stat(agentPath);
      expect(stats.isFile()).toBe(true);
      
      // Test that the generated code is valid JavaScript
      expect(async () => {
        const generatedModule = require(agentPath);
        expect(generatedModule.ExampleAgent).toBeDefined();
        expect(generatedModule.main).toBeDefined();
      }).not.toThrow();
    });

    test('generated package.json has correct structure', async () => {
      const agent = new ScaffoldGeneratorAgent({
        outputDir: tempDir,
        templatesDir: templatesDir,
        logLevel: 'error'
      });

      await agent.initialize();
      await agent.process(samplePRD);
      await agent.cleanup();

      const packagePath = path.join(tempDir, 'example', 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageData = JSON.parse(packageContent);

      // Verify required fields
      expect(packageData.name).toBe('example');
      expect(packageData.version).toBe('1.0.0');
      expect(packageData.main).toBe('main.js');
      expect(packageData.scripts).toBeDefined();
      expect(packageData.dependencies).toBeDefined();
      expect(packageData.devDependencies).toBeDefined();
      
      // Verify binary entry
      expect(packageData.bin['example']).toBe('./main.js');
      
      // Verify essential dependencies
      expect(packageData.dependencies['fs-extra']).toBeDefined();
      expect(packageData.dependencies.chalk).toBeDefined();
      expect(packageData.devDependencies.jest).toBeDefined();
      expect(packageData.devDependencies.eslint).toBeDefined();
    });
  });
});