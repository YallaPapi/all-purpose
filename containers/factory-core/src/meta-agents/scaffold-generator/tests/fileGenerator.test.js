/**
 * Tests for File Generator
 * Tests the complete file and directory generation functionality
 */

const fs = require('fs-extra');
const path = require('path');
const FileGenerator = require('../lib/fileGenerator');

describe('FileGenerator', () => {
  let fileGenerator;
  let tempDir;
  let templatesDir;
  
  const sampleAgentData = {
    agentName: 'Test Agent',
    description: 'A test agent for validation',
    tasks: [
      {
        id: 1,
        title: 'Setup Project',
        description: 'Initialize project structure',
        priority: 'high'
      }
    ],
    metadata: {
      author: 'Test Developer',
      license: 'MIT'
    }
  };

  beforeEach(async () => {
    // Create temporary directories
    tempDir = path.join(__dirname, 'temp', `test-${Date.now()}`);
    templatesDir = path.join(__dirname, '../templates');
    
    await fs.ensureDir(tempDir);
    
    fileGenerator = new FileGenerator(tempDir, templatesDir);
  });

  afterEach(async () => {
    // Cleanup generated files and directories
    try {
      if (tempDir && await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }, 10000);

  describe('constructor', () => {
    test('initializes with correct properties', () => {
      expect(fileGenerator.outputDir).toBe(tempDir);
      expect(fileGenerator.templateEngine).toBeDefined();
      expect(fileGenerator.generatedFiles).toEqual([]);
      expect(fileGenerator.createdDirectories).toEqual([]);
    });
  });

  describe('generateAgent', () => {
    test('generates complete agent scaffold', async () => {
      const result = await fileGenerator.generateAgent(sampleAgentData);
      
      expect(result.success).toBe(true);
      expect(result.agentName).toBe('test-agent');
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.directories.length).toBeGreaterThan(0);
      
      // Check that main files exist
      const agentDir = path.join(tempDir, 'test-agent');
      expect(await fs.pathExists(path.join(agentDir, 'main.js'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'README.md'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'config', 'default.json'))).toBe(true);
    });

    test('generates with additional options', async () => {
      const options = {
        includeTests: true,
        includeGitignore: true
      };
      
      const result = await fileGenerator.generateAgent(sampleAgentData, options);
      
      expect(result.success).toBe(true);
      
      // Check additional files
      const agentDir = path.join(tempDir, 'test-agent');
      expect(await fs.pathExists(path.join(agentDir, 'tests', 'test-agent.test.js'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, '.gitignore'))).toBe(true);
    });

    test('handles generation errors gracefully', async () => {
      // Use invalid template directory
      const badGenerator = new FileGenerator(tempDir, '/nonexistent/path');
      
      await expect(badGenerator.generateAgent(sampleAgentData))
        .rejects.toThrow('Failed to generate agent scaffold');
    });
  });

  describe('createDirectoryStructure', () => {
    test('creates required directories', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      
      await fileGenerator.createDirectoryStructure(agentDir);
      
      expect(await fs.pathExists(agentDir)).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'config'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'tests'))).toBe(true);
      expect(await fs.pathExists(path.join(agentDir, 'templates'))).toBe(true);
      
      expect(fileGenerator.createdDirectories.length).toBe(4);
    });
  });

  describe('generateMainFile', () => {
    test('generates executable main.js file', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      await fs.ensureDir(agentDir);
      
      await fileGenerator.generateMainFile(agentDir, sampleAgentData);
      
      const filePath = path.join(agentDir, 'main.js');
      expect(await fs.pathExists(filePath)).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('Test Agent Agent');
      expect(content).toContain('TestAgentAgent');
      
      // Check file permissions (on Unix systems)
      if (process.platform !== 'win32') {
        const stats = await fs.stat(filePath);
        expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0); // Has execute permission
      }
      
      expect(fileGenerator.generatedFiles).toContain(filePath);
    });
  });

  describe('generateReadme', () => {
    test('generates README.md file', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      await fs.ensureDir(agentDir);
      
      await fileGenerator.generateReadme(agentDir, sampleAgentData);
      
      const filePath = path.join(agentDir, 'README.md');
      expect(await fs.pathExists(filePath)).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('# Test Agent');
      expect(content).toContain('A test agent for validation');
      expect(content).toContain('**Setup Project** (Priority: high)');
      
      expect(fileGenerator.generatedFiles).toContain(filePath);
    });
  });

  describe('generatePackageJson', () => {
    test('generates valid package.json file', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      await fs.ensureDir(agentDir);
      
      await fileGenerator.generatePackageJson(agentDir, sampleAgentData);
      
      const filePath = path.join(agentDir, 'package.json');
      expect(await fs.pathExists(filePath)).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf8');
      const packageData = JSON.parse(content);
      
      expect(packageData.name).toBe('test-agent');
      expect(packageData.description).toBe('A test agent for validation');
      expect(packageData.author).toBe('Test Developer');
      expect(packageData.license).toBe('MIT');
      
      expect(fileGenerator.generatedFiles).toContain(filePath);
    });
  });

  describe('generateConfig', () => {
    test('generates config/default.json file', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      await fs.ensureDir(path.join(agentDir, 'config'));
      
      await fileGenerator.generateConfig(agentDir, sampleAgentData);
      
      const filePath = path.join(agentDir, 'config', 'default.json');
      expect(await fs.pathExists(filePath)).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf8');
      const configData = JSON.parse(content);
      
      expect(configData['test-agent']).toBeDefined();
      expect(configData['test-agent'].name).toBe('Test Agent');
      expect(configData.environment).toBeDefined();
      expect(configData.performance).toBeDefined();
      
      expect(fileGenerator.generatedFiles).toContain(filePath);
    });
  });

  describe('generateEslintConfig', () => {
    test('generates eslint.config.js file', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      await fs.ensureDir(agentDir);
      
      await fileGenerator.generateEslintConfig(agentDir);
      
      const filePath = path.join(agentDir, 'eslint.config.js');
      expect(await fs.pathExists(filePath)).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('js.configs.recommended');
      expect(content).toContain('module.exports');
      
      expect(fileGenerator.generatedFiles).toContain(filePath);
    });
  });

  describe('generateTestFiles', () => {
    test('generates test files', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      await fs.ensureDir(path.join(agentDir, 'tests'));
      
      await fileGenerator.generateTestFiles(agentDir, sampleAgentData);
      
      const filePath = path.join(agentDir, 'tests', 'test-agent.test.js');
      expect(await fs.pathExists(filePath)).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('TestAgentAgent');
      expect(content).toContain('describe(');
      expect(content).toContain('test(');
      expect(content).toContain('expect(');
      
      expect(fileGenerator.generatedFiles).toContain(filePath);
    });
  });

  describe('generateGitignore', () => {
    test('generates .gitignore file', async () => {
      const agentDir = path.join(tempDir, 'test-agent');
      await fs.ensureDir(agentDir);
      
      await fileGenerator.generateGitignore(agentDir);
      
      const filePath = path.join(agentDir, '.gitignore');
      expect(await fs.pathExists(filePath)).toBe(true);
      
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).toContain('coverage/');
      
      expect(fileGenerator.generatedFiles).toContain(filePath);
    });
  });

  describe('helper methods', () => {
    test('toKebabCase converts strings correctly', () => {
      expect(fileGenerator.toKebabCase('Test Agent')).toBe('test-agent');
      expect(fileGenerator.toKebabCase('MyAwesome Agent!')).toBe('myawesome-agent');
      expect(fileGenerator.toKebabCase('Simple')).toBe('simple');
      expect(fileGenerator.toKebabCase('')).toBe('');
    });

    test('toPascalCase converts strings correctly', () => {
      expect(fileGenerator.toPascalCase('test agent')).toBe('TestAgent');
      expect(fileGenerator.toPascalCase('my awesome agent')).toBe('MyAwesomeAgent');
      expect(fileGenerator.toPascalCase('simple')).toBe('Simple');
      expect(fileGenerator.toPascalCase('')).toBe('');
    });
  });

  describe('getSummary', () => {
    test('returns correct summary', async () => {
      await fileGenerator.generateAgent(sampleAgentData);
      
      const summary = fileGenerator.getSummary();
      
      expect(summary.files).toBeGreaterThan(0);
      expect(summary.directories).toBeGreaterThan(0);
      expect(Array.isArray(summary.generatedFiles)).toBe(true);
      expect(Array.isArray(summary.createdDirectories)).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('removes generated files and directories', async () => {
      await fileGenerator.generateAgent(sampleAgentData);
      
      const agentDir = path.join(tempDir, 'test-agent');
      expect(await fs.pathExists(agentDir)).toBe(true);
      
      await fileGenerator.cleanup();
      
      expect(fileGenerator.generatedFiles).toEqual([]);
      expect(fileGenerator.createdDirectories).toEqual([]);
    });
  });
});