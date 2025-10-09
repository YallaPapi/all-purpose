#!/usr/bin/env node

/**
 * Scaffold Generator Agent - Main Application
 * 
 * Generates agent scaffolds from PRD-Parser output
 * Following current best practices for CLI applications and file generation
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import CommonJS lib modules using require (now with .cjs extension)
const { parseInput } = require('./lib/inputParser.cjs');
const FileGenerator = require('./lib/fileGenerator.cjs');
import { fileURLToPath } from 'url';

// Working Memory Integration following ADD methodology
import { createMemoryEnhancedAgent } from '../../memory/agentMemoryIntegration.js';

// ES modules don't have __dirname, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ScaffoldGeneratorAgent {
  constructor(config = {}) {
    this.config = {
      logLevel: config.logLevel || 'info',
      timeout: config.timeout || 30000,
      outputDir: config.outputDir || process.cwd(),
      templatesDir: config.templatesDir || path.join(__dirname, 'templates'),
      includeTests: config.includeTests !== false, // Default to true
      includeGitignore: config.includeGitignore !== false, // Default to true
      overwrite: config.overwrite || false,
      memoryEnabled: config.memoryEnabled !== false, // Working memory integration
      agentId: config.agentId || 'scaffold-generator-001', // Agent identifier for memory
      ...config
    };
    
    this.isInitialized = false;
    this.fileGenerator = null;
    
    // Working Memory Integration - following ADD methodology
    this.memoryAgent = this.config.memoryEnabled ? 
      createMemoryEnhancedAgent(this.config.agentId, this) : null;
  }

  /**
   * Initialize the Scaffold Generator agent
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log(chalk.blue('🚀 Initializing Scaffold Generator agent...'));
      
      // Initialize components
      this.fileGenerator = new FileGenerator(this.config.outputDir, this.config.templatesDir);
      
      // Verify output directory
      await fs.ensureDir(this.config.outputDir);
      
      // Verify templates directory
      if (!await fs.pathExists(this.config.templatesDir)) {
        throw new Error(`Templates directory not found: ${this.config.templatesDir}`);
      }
      
      this.isInitialized = true;
      console.log(chalk.green('✅ Scaffold Generator agent initialized successfully'));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to initialize Scaffold Generator agent: ${error.message}`));
      throw error;
    }
  }

  /**
   * Process PRD-Parser input and generate agent scaffold with memory integration
   * @param {Object|string} input - PRD-Parser output or file path
   * @returns {Promise<Object>} - Generation result
   */
  async process(input = {}) {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    const taskDescription = `Generate agent scaffold from PRD input: ${typeof input === 'string' ? input : 'object'}`;
    
    // Use memory-enhanced execution following ADD methodology
    if (this.memoryAgent) {
      return await this.memoryAgent.executeWithMemory(
        taskDescription,
        async (contextualPrompt, memory) => {
          return await this._processCore(input, memory);
        }
      );
    } else {
      return await this._processCore(input);
    }
  }

  /**
   * Analyze PRD to determine project type and structure
   */
  _analyzeProjectStructure(prdData) {
    const description = (prdData.description || '').toLowerCase();
    const title = (prdData.title || prdData.projectName || '').toLowerCase();
    const fullText = `${description} ${title}`.toLowerCase();
    
    // Determine project type and framework
    let projectType = 'generic';
    let framework = 'node';
    let directories = ['src', 'config', 'tests'];
    let baseFiles = ['package.json', 'README.md', '.env.example'];
    
    // Next.js project
    if (fullText.includes('next') || fullText.includes('react') && fullText.includes('server')) {
      projectType = 'nextjs';
      framework = 'nextjs';
      directories = ['app', 'components', 'lib', 'public', 'styles'];
      baseFiles = ['package.json', 'next.config.js', 'tailwind.config.js', 'tsconfig.json', '.env.example', 'README.md'];
    }
    // React project
    else if (fullText.includes('react') || fullText.includes('frontend')) {
      projectType = 'react';
      framework = 'react';
      directories = ['src', 'src/components', 'src/hooks', 'src/utils', 'public'];
      baseFiles = ['package.json', 'tsconfig.json', '.env.example', 'README.md'];
    }
    // Express API
    else if (fullText.includes('api') || fullText.includes('express') || fullText.includes('backend')) {
      projectType = 'express';
      framework = 'express';
      directories = ['src', 'src/routes', 'src/middleware', 'src/models', 'src/controllers', 'config', 'tests'];
      baseFiles = ['package.json', 'server.js', '.env.example', 'README.md'];
    }
    // Mobile app
    else if (fullText.includes('mobile') || fullText.includes('react native')) {
      projectType = 'react-native';
      framework = 'react-native';
      directories = ['src', 'src/components', 'src/screens', 'src/navigation', 'assets', 'android', 'ios'];
      baseFiles = ['package.json', 'App.js', 'index.js', 'metro.config.js', 'README.md'];
    }
    
    return {
      projectType,
      framework,
      directories,
      baseFiles,
      projectName: prdData.projectName || prdData.title || 'generated-project',
      description: prdData.description || 'Generated project'
    };
  }

  /**
   * Create project directory structure
   */
  async _createProjectStructure(outputPath, structure) {
    // Create all directories
    for (const dir of structure.directories) {
      const fullPath = path.join(outputPath, dir);
      await fs.ensureDir(fullPath);
    }
    
    // Create basic files
    const createdFiles = [];
    
    // Generate package.json
    if (structure.baseFiles.includes('package.json')) {
      const packageJson = this._generatePackageJson(structure);
      await fs.writeFile(path.join(outputPath, 'package.json'), packageJson);
      createdFiles.push('package.json');
    }
    
    // Generate README.md
    if (structure.baseFiles.includes('README.md')) {
      const readme = this._generateReadme(structure);
      await fs.writeFile(path.join(outputPath, 'README.md'), readme);
      createdFiles.push('README.md');
    }
    
    // Generate basic config files based on project type
    for (const file of structure.baseFiles) {
      if (!['package.json', 'README.md'].includes(file)) {
        const content = this._generateConfigFile(file, structure);
        if (content) {
          await fs.writeFile(path.join(outputPath, file), content);
          createdFiles.push(file);
        }
      }
    }
    
    return createdFiles;
  }

  /**
   * Generate package.json content
   */
  _generatePackageJson(structure) {
    const packageJson = {
      name: structure.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      description: structure.description,
      main: structure.projectType === 'nextjs' ? 'next.config.js' : 'index.js',
      scripts: {},
      dependencies: {},
      devDependencies: {}
    };
    
    // Add framework-specific scripts and dependencies
    switch (structure.projectType) {
      case 'nextjs':
        packageJson.scripts = {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        };
        packageJson.dependencies = {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        };
        break;
        
      case 'react':
        packageJson.scripts = {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test',
          eject: 'react-scripts eject'
        };
        packageJson.dependencies = {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-scripts': '^5.0.1'
        };
        break;
        
      case 'express':
        packageJson.scripts = {
          start: 'node server.js',
          dev: 'nodemon server.js',
          test: 'jest'
        };
        packageJson.dependencies = {
          express: '^4.18.0',
          cors: '^2.8.5',
          helmet: '^7.0.0'
        };
        packageJson.devDependencies = {
          nodemon: '^3.0.0'
        };
        break;
        
      default:
        packageJson.scripts = {
          start: 'node index.js',
          test: 'jest'
        };
    }
    
    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generate README.md content
   */
  _generateReadme(structure) {
    return `# ${structure.projectName}

${structure.description}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Project Structure

\`\`\`
${structure.projectName}/
${structure.directories.map(dir => `├── ${dir}/`).join('\n')}
${structure.baseFiles.map(file => `├── ${file}`).join('\n')}
\`\`\`

## Built with ${structure.framework}

Generated by All-Purpose Meta-Agent Factory
`;
  }

  /**
   * Generate config file content
   */
  _generateConfigFile(filename, structure) {
    switch (filename) {
      case 'next.config.js':
        return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`;
        
      case 'tailwind.config.js':
        return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
        
      case 'tsconfig.json':
        return JSON.stringify({
          compilerOptions: {
            target: 'es5',
            lib: ['dom', 'dom.iterable', 'es6'],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: 'esnext',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: 'preserve',
            incremental: true,
            plugins: [{ name: 'next' }],
            paths: { '@/*': ['./src/*'] }
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules']
        }, null, 2);
        
      case '.env.example':
        return `# ${structure.projectName} Environment Variables
NODE_ENV=development
PORT=3000
`;
        
      case 'server.js':
        return `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ${structure.projectName}',
    description: '${structure.description}'
  });
});

app.listen(PORT, () => {
  console.log(\`🚀 ${structure.projectName} server running on port \${PORT}\`);
});`;
        
      default:
        return null;
    }
  }

  /**
   * Core processing logic (enhanced with memory context)
   */
  async _processCore(input, memory = '') {
    try {
      console.log(chalk.blue('🔄 Processing PRD input for project scaffold generation'));
      if (memory && this.config.memoryEnabled) {
        console.log(chalk.blue(`🧠 Using memory context: ${memory.split('\n\n').length} previous entries`));
      }
      
      let prdData;
      
      // Handle input - could be object, file path, or JSON string
      if (typeof input === 'string') {
        if (await fs.pathExists(input)) {
          // Input is a file path
          console.log(chalk.blue(`📄 Reading PRD from file: ${input}`));
          const fileContent = await fs.readFile(input, 'utf8');
          try {
            prdData = JSON.parse(fileContent);
          } catch (parseError) {
            throw new Error(`Invalid JSON in file ${input}: ${parseError.message}`);
          }
        } else {
          // Input is a JSON string
          try {
            prdData = JSON.parse(input);
          } catch (parseError) {
            throw new Error(`Invalid JSON string: ${parseError.message}`);
          }
        }
      } else if (typeof input === 'object' && input !== null) {
        prdData = input;
      } else {
        throw new Error('Input must be an object, file path, or JSON string');
      }
      
      // Analyze PRD to determine project structure
      console.log(chalk.blue('🔍 Analyzing PRD to determine project structure...'));
      const structure = this._analyzeProjectStructure(prdData);
      console.log(chalk.green(`✅ Detected project type: ${structure.projectType} (${structure.framework})`));
      
      // Create output directory
      const kebabCaseName = this.toKebabCase(structure.projectName);
      const outputPath = path.join(this.config.outputDir, kebabCaseName);
      
      if (await fs.pathExists(outputPath) && !this.config.overwrite) {
        throw new Error(`Project directory already exists: ${outputPath}. Use --overwrite to replace it.`);
      }
      
      // Ensure base output directory exists
      await fs.ensureDir(outputPath);
      
      // Generate project structure
      console.log(chalk.blue('🏗️  Creating project directory structure...'));
      const createdFiles = await this._createProjectStructure(outputPath, structure);
      
      console.log(chalk.green(`✅ Successfully generated project scaffold: ${structure.projectName}`));
      console.log(chalk.blue(`📁 Output directory: ${outputPath}`));
      console.log(chalk.blue(`📂 Created ${structure.directories.length} directories`));
      console.log(chalk.blue(`📄 Generated ${createdFiles.length} files`));
      console.log(chalk.blue(`🏗️  Project type: ${structure.projectType} (${structure.framework})`));
      
      return {
        success: true,
        projectName: structure.projectName,
        outputPath: outputPath,
        projectType: structure.projectType,
        framework: structure.framework,
        directories: structure.directories,
        files: createdFiles,
        processedAt: new Date().toISOString(),
        memoryContext: memory ? true : false
      };
      
    } catch (error) {
      console.error(chalk.red(`❌ Processing failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      console.log(chalk.blue('🧹 Cleaning up Scaffold Generator agent...'));
      
      // Clear any cached templates
      if (this.fileGenerator && this.fileGenerator.templateEngine) {
        this.fileGenerator.templateEngine.clearCache();
      }
      
      this.isInitialized = false;
      console.log(chalk.green('✅ Cleanup completed'));
    } catch (error) {
      console.error(chalk.red(`❌ Cleanup failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get agent status
   * @returns {Object} - Current agent status
   */
  getStatus() {
    return {
      name: 'Scaffold Generator',
      initialized: this.isInitialized,
      config: this.config,
      timestamp: new Date().toISOString()
    };
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
}

/**
 * Main execution function for programmatic usage
 * @param {Object} options - Runtime options
 * @returns {Promise<Object>} - Execution result
 */
async function main(options = {}) {
  const agent = new ScaffoldGeneratorAgent(options);
  
  try {
    await agent.initialize();
    const result = await agent.process(options.input);
    return result;
  } catch (error) {
    console.error(chalk.red(`❌ Scaffold Generator execution failed: ${error.message}`));
    throw error;
  } finally {
    await agent.cleanup();
  }
}

/**
 * CLI setup and command handling
 */
function setupCLI() {
  const program = new Command();
  
  program
    .name('scaffold-generator')
    .description('Generate software applications or meta-agent scaffolds from PRD input')
    .version('1.0.0');

  program
    .command('generate')
    .alias('gen')
    .description('Generate project scaffold from PRD input')
    .argument('<input>', 'PRD input file or JSON string')
    .option('-o, --output <dir>', 'Output directory', process.cwd())
    .option('-t, --templates <dir>', 'Templates directory', path.join(__dirname, 'templates'))
    .option('--no-tests', 'Skip generating test files')
    .option('--no-gitignore', 'Skip generating .gitignore file')
    .option('--overwrite', 'Overwrite existing project directory')
    .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
    .action(async (input, options) => {
      try {
        const config = {
          outputDir: options.output,
          templatesDir: options.templates,
          includeTests: options.tests,
          includeGitignore: options.gitignore,
          overwrite: options.overwrite,
          logLevel: options.logLevel,
          input: input
        };
        
        const result = await main(config);
        
        console.log(chalk.green('\\n🎉 Project scaffold generated successfully!'));
        console.log(chalk.blue(`Project: ${result.projectName}`));
        console.log(chalk.blue(`Type: ${result.projectType} (${result.framework})`));
        console.log(chalk.blue(`Path: ${result.outputPath}`));
        console.log(chalk.blue(`Directories: ${result.directories.length}`));
        console.log(chalk.blue(`Files: ${result.files.length}`));
        
        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`\\n💥 Generation failed: ${error.message}`));
        process.exit(1);
      }
    });

  program
    .command('validate')
    .description('Validate PRD input without generating files')
    .argument('<input>', 'PRD input file or JSON string')
    .action(async (input) => {
      try {
        let prdData;
        if (await fs.pathExists(input)) {
          const fileContent = await fs.readFile(input, 'utf8');
          prdData = JSON.parse(fileContent);
        } else {
          prdData = JSON.parse(input);
        }
        
        const instance = new ScaffoldGeneratorAgent();
        const structure = instance._analyzeProjectStructure(prdData);
        
        console.log(chalk.green('\\n✅ PRD validation successful!'));
        console.log(chalk.blue(`Project Name: ${structure.projectName}`));
        console.log(chalk.blue(`Project Type: ${structure.projectType}`));
        console.log(chalk.blue(`Framework: ${structure.framework}`));
        console.log(chalk.blue(`Description: ${structure.description}`));
        console.log(chalk.blue(`Directories: ${structure.directories.join(', ')}`));
        console.log(chalk.blue(`Base Files: ${structure.baseFiles.join(', ')}`));
        
        process.exit(0);
      } catch (error) {
        console.error(chalk.red(`\\n❌ Validation failed: ${error.message}`));
        process.exit(1);
      }
    });

  return program;
}

// Export for programmatic usage
export {
  ScaffoldGeneratorAgent,
  main
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const program = setupCLI();
  program.parse();
}