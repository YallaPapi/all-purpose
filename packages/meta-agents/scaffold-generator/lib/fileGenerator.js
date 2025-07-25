/**
 * File Generator - Creates agent scaffold files and directories
 * 
 * Handles creation of directory structure and files using templates
 * Following current best practices for file system operations.
 */

const fs = require('fs-extra');
const path = require('path');
const TemplateEngine = require('./templateEngine');

class FileGenerator {
  constructor(outputDir, templatesDir) {
    this.outputDir = outputDir;
    this.templateEngine = new TemplateEngine(templatesDir);
    this.generatedFiles = [];
    this.createdDirectories = [];
  }

  /**
   * Generate complete agent scaffold
   * @param {Object} agentData - Parsed PRD data
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generation result
   */
  async generateAgent(agentData, options = {}) {
    const { agentName } = agentData;
    const kebabCaseName = this.toKebabCase(agentName);
    const agentDir = path.join(this.outputDir, kebabCaseName);

    try {
      // Create agent directory structure
      await this.createDirectoryStructure(agentDir);
      
      // Generate standard files
      await this.generateMainFile(agentDir, agentData);
      await this.generateReadme(agentDir, agentData);
      await this.generatePackageJson(agentDir, agentData);
      await this.generateConfig(agentDir, agentData);
      await this.generateEslintConfig(agentDir);
      
      // Generate additional files if specified
      if (options.includeTests) {
        await this.generateTestFiles(agentDir, agentData);
      }

      if (options.includeGitignore) {
        await this.generateGitignore(agentDir);
      }

      return {
        success: true,
        agentName: kebabCaseName,
        outputPath: agentDir,
        files: this.generatedFiles,
        directories: this.createdDirectories,
        summary: `Generated ${this.generatedFiles.length} files in ${this.createdDirectories.length} directories`
      };
    } catch (error) {
      throw new Error(`Failed to generate agent scaffold: ${error.message}`);
    }
  }

  /**
   * Create directory structure for agent
   * @param {string} agentDir - Base agent directory
   * @returns {Promise<void>}
   */
  async createDirectoryStructure(agentDir) {
    const directories = [
      agentDir,
      path.join(agentDir, 'config'),
      path.join(agentDir, 'tests'),
      path.join(agentDir, 'templates')
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
      this.createdDirectories.push(dir);
    }
  }

  /**
   * Generate main.js file using template
   * @param {string} agentDir - Agent directory
   * @param {Object} agentData - Agent data
   * @returns {Promise<void>}
   */
  async generateMainFile(agentDir, agentData) {
    const content = await this.templateEngine.render('main.js', agentData);
    const filePath = path.join(agentDir, 'main.js');
    
    await fs.writeFile(filePath, content, 'utf8');
    await fs.chmod(filePath, 0o755); // Make executable
    this.generatedFiles.push(filePath);
  }

  /**
   * Generate README.md file using template
   * @param {string} agentDir - Agent directory
   * @param {Object} agentData - Agent data
   * @returns {Promise<void>}
   */
  async generateReadme(agentDir, agentData) {
    const content = await this.templateEngine.render('README.md', agentData);
    const filePath = path.join(agentDir, 'README.md');
    
    await fs.writeFile(filePath, content, 'utf8');
    this.generatedFiles.push(filePath);
  }

  /**
   * Generate package.json file using template
   * @param {string} agentDir - Agent directory
   * @param {Object} agentData - Agent data
   * @returns {Promise<void>}
   */
  async generatePackageJson(agentDir, agentData) {
    const content = await this.templateEngine.render('package.json', agentData);
    const filePath = path.join(agentDir, 'package.json');
    
    await fs.writeFile(filePath, content, 'utf8');
    this.generatedFiles.push(filePath);
  }

  /**
   * Generate config/default.json file using template
   * @param {string} agentDir - Agent directory
   * @param {Object} agentData - Agent data
   * @returns {Promise<void>}
   */
  async generateConfig(agentDir, agentData) {
    const content = await this.templateEngine.render('config/default.json', agentData);
    const filePath = path.join(agentDir, 'config', 'default.json');
    
    await fs.writeFile(filePath, content, 'utf8');
    this.generatedFiles.push(filePath);
  }

  /**
   * Generate eslint.config.js file
   * @param {string} agentDir - Agent directory
   * @returns {Promise<void>}
   */
  async generateEslintConfig(agentDir) {
    const eslintConfig = `const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always']
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly'
      }
    }
  }
];
`;
    const filePath = path.join(agentDir, 'eslint.config.js');
    await fs.writeFile(filePath, eslintConfig, 'utf8');
    this.generatedFiles.push(filePath);
  }

  /**
   * Generate basic test files
   * @param {string} agentDir - Agent directory
   * @param {Object} agentData - Agent data
   * @returns {Promise<void>}
   */
  async generateTestFiles(agentDir, agentData) {
    const kebabCaseName = this.toKebabCase(agentData.agentName);
    const pascalCaseName = this.toPascalCase(agentData.agentName);
    
    const testContent = `/**
 * Tests for ${agentData.agentName} Agent
 */

const { ${pascalCaseName}Agent, main } = require('../main');

describe('${pascalCaseName}Agent', () => {
  let agent;

  beforeEach(() => {
    agent = new ${pascalCaseName}Agent({
      logLevel: 'error' // Suppress logs during tests
    });
  });

  afterEach(async () => {
    if (agent && agent.isInitialized) {
      await agent.cleanup();
    }
  });

  describe('constructor', () => {
    test('creates agent with default config', () => {
      expect(agent.config.logLevel).toBe('error');
      expect(agent.config.timeout).toBe(30000);
      expect(agent.isInitialized).toBe(false);
    });

    test('creates agent with custom config', () => {
      const customAgent = new ${pascalCaseName}Agent({
        logLevel: 'debug',
        timeout: 60000
      });
      
      expect(customAgent.config.logLevel).toBe('debug');
      expect(customAgent.config.timeout).toBe(60000);
    });
  });

  describe('initialize', () => {
    test('initializes successfully', async () => {
      await agent.initialize();
      expect(agent.isInitialized).toBe(true);
    });
  });

  describe('process', () => {
    test('throws error if not initialized', async () => {
      await expect(agent.process({})).rejects.toThrow('Agent not initialized');
    });

    test('processes input successfully', async () => {
      await agent.initialize();
      
      const input = { test: 'data' };
      const result = await agent.process(input);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
      expect(result.processedAt).toBeDefined();
    });
  });

  describe('getStatus', () => {
    test('returns correct status', () => {
      const status = agent.getStatus();
      
      expect(status.name).toBe('${agentData.agentName}');
      expect(status.initialized).toBe(false);
      expect(status.config).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });
  });

  describe('cleanup', () => {
    test('cleans up successfully', async () => {
      await agent.initialize();
      await agent.cleanup();
      expect(agent.isInitialized).toBe(false);
    });
  });
});

describe('main function', () => {
  test('executes successfully with input', async () => {
    const input = { test: 'data' };
    const result = await main({ input, logLevel: 'error' });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(input);
  });

  test('handles errors gracefully', async () => {
    // Test with invalid config that might cause issues
    await expect(main({ 
      input: null, 
      logLevel: 'error',
      timeout: -1 
    })).rejects.toThrow();
  });
});
`;

    const filePath = path.join(agentDir, 'tests', `${kebabCaseName}.test.js`);
    await fs.writeFile(filePath, testContent, 'utf8');
    this.generatedFiles.push(filePath);
  }

  /**
   * Generate .gitignore file
   * @param {string} agentDir - Agent directory
   * @returns {Promise<void>}
   */
  async generateGitignore(agentDir) {
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs
*.log

# Temporary files
tmp/
temp/
`;

    const filePath = path.join(agentDir, '.gitignore');
    await fs.writeFile(filePath, gitignoreContent, 'utf8');
    this.generatedFiles.push(filePath);
  }

  /**
   * Get generation summary
   * @returns {Object} - Summary of generated files and directories
   */
  getSummary() {
    return {
      files: this.generatedFiles.length,
      directories: this.createdDirectories.length,
      generatedFiles: this.generatedFiles,
      createdDirectories: this.createdDirectories
    };
  }

  /**
   * Clean up generated files (for testing)
   * @returns {Promise<void>}
   */
  async cleanup() {
    for (const dir of this.createdDirectories.reverse()) {
      try {
        await fs.remove(dir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    this.generatedFiles = [];
    this.createdDirectories = [];
  }

  /**
   * Convert string to kebab-case
   * @param {string} str - Input string
   * @returns {string} - Kebab-case string
   */
  toKebabCase(str) {
    if (typeof str !== 'string') return '';
    return str
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Convert string to PascalCase
   * @param {string} str - Input string
   * @returns {string} - PascalCase string
   */
  toPascalCase(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '');
  }
}

module.exports = FileGenerator;