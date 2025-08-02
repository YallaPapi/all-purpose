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
   * Core processing logic (enhanced with memory context)
   */
  async _processCore(input, memory = '') {
    try {
      console.log(chalk.blue('🔄 Processing PRD input for agent generation'));
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
      
      // Parse and validate input
      const agentData = parseInput(prdData);
      console.log(chalk.green(`✅ Parsed PRD for agent: ${agentData.agentName}`));
      
      // Check if output directory already exists
      const kebabCaseName = this.toKebabCase(agentData.agentName);
      const outputPath = path.join(this.config.outputDir, kebabCaseName);
      
      if (await fs.pathExists(outputPath) && !this.config.overwrite) {
        throw new Error(`Agent directory already exists: ${outputPath}. Use --overwrite to replace it.`);
      }
      
      // Generate agent scaffold
      console.log(chalk.blue('🏗️  Generating agent scaffold...'));
      const generationOptions = {
        includeTests: this.config.includeTests,
        includeGitignore: this.config.includeGitignore
      };
      
      const result = await this.fileGenerator.generateAgent(agentData, generationOptions);
      
      console.log(chalk.green(`✅ Successfully generated agent: ${result.agentName}`));
      console.log(chalk.blue(`📁 Output directory: ${result.outputPath}`));
      console.log(chalk.blue(`📄 Generated ${result.files.length} files in ${result.directories.length} directories`));
      
      const processResult = {
        success: true,
        agentName: result.agentName,
        outputPath: result.outputPath,
        files: result.files,
        directories: result.directories,
        summary: result.summary,
        processedAt: new Date().toISOString(),
        memoryContext: memory ? true : false
      };
      
      return `Generated agent scaffold for ${result.agentName}. Created ${result.files.length} files in ${result.directories.length} directories at ${result.outputPath}`;
      
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
    .description('Generate agent scaffolds from PRD-Parser output')
    .version('1.0.0');

  program
    .command('generate')
    .alias('gen')
    .description('Generate agent scaffold from PRD input')
    .argument('<input>', 'PRD input file or JSON string')
    .option('-o, --output <dir>', 'Output directory', process.cwd())
    .option('-t, --templates <dir>', 'Templates directory', path.join(__dirname, 'templates'))
    .option('--no-tests', 'Skip generating test files')
    .option('--no-gitignore', 'Skip generating .gitignore file')
    .option('--overwrite', 'Overwrite existing agent directory')
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
        
        console.log(chalk.green('\\n🎉 Agent scaffold generated successfully!'));
        console.log(chalk.blue(`Agent: ${result.agentName}`));
        console.log(chalk.blue(`Path: ${result.outputPath}`));
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
        
        const agentData = parseInput(prdData);
        
        console.log(chalk.green('\\n✅ PRD validation successful!'));
        console.log(chalk.blue(`Agent Name: ${agentData.agentName}`));
        console.log(chalk.blue(`Description: ${agentData.description}`));
        console.log(chalk.blue(`Tasks: ${agentData.tasks ? agentData.tasks.length : 0}`));
        
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