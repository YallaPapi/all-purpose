#!/usr/bin/env node

/**
 * Enhanced Scaffold Generator Agent with UEP Integration
 * 
 * This is an enhanced version of the Scaffold Generator that uses the Universal Execution Protocol
 * for standardized execution, enhanced validation, and improved context awareness.
 * 
 * Features:
 * - UEP-enhanced scaffold generation
 * - Standardized validation and compliance
 * - Enhanced codebase awareness
 * - Improved memory integration
 * - Context-aware template selection
 * - Collision risk detection
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { enhanceAgentWithUEP } from '../uep/agentIntegration.js';

// ES modules don't have __dirname, so we need to create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import original Scaffold Generator (ES module with named exports)
import { ScaffoldGeneratorAgent } from './scaffold-generator/main.js';

/**
 * Enhanced Scaffold Generator with UEP Integration
 */
class EnhancedScaffoldGenerator extends ScaffoldGeneratorAgent {
  constructor(config = {}) {
    super({
      ...config,
      // Force enable memory for UEP integration
      memoryEnabled: true,
      // Enhanced configuration
      uepEnabled: config.uepEnabled !== false,
      enhancedValidation: config.enhancedValidation !== false,
      enhancedContext: config.enhancedContext !== false,
      collisionDetection: config.collisionDetection !== false
    });

    this.enhancedAgent = null;
    this.uepEnabled = this.config.uepEnabled;
  }

  /**
   * Enhanced initialization with UEP setup
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Enhanced Scaffold Generator with UEP integration...');

      // Call original initialization
      await super.initialize();

      // Initialize UEP enhancement if enabled
      if (this.uepEnabled) {
        await this.initializeUEP();
      }

      if (this.uepEnabled && this.enhancedAgent) {
        console.log('✅ Enhanced Scaffold Generator initialized with UEP middleware');
        console.log(`   - UEP Status: ${this.enhancedAgent.isEnhanced() ? 'Enabled' : 'Fallback'}`);
        console.log(`   - Agent ID: ${this.enhancedAgent.getAgentId()}`);
        console.log(`   - Enhanced Features: Validation, Context Awareness, Collision Detection`);
      } else {
        console.log('✅ Enhanced Scaffold Generator initialized in fallback mode (UEP disabled)');
      }

    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Scaffold Generator:', error.message);
      throw error;
    }
  }

  /**
   * Initialize UEP enhancement
   */
  async initializeUEP() {
    try {
      console.log('🧠 Initializing UEP enhancement for Scaffold Generator...');

      // Enhance this agent instance with UEP
      this.enhancedAgent = await enhanceAgentWithUEP(this, 'enhanced-scaffold-generator', {
        agentType: 'scaffold-generator',
        enableUEP: true,
        enableValidation: this.config.enhancedValidation,
        enableMemoryIntegration: true,
        enableCaching: true,
        enableDebugMode: false,
        timeout: 180000, // 3 minutes for complex scaffold generation
        workingDirectory: this.config.outputDir,
        logLevel: 'minimal'
      });

      console.log('✅ UEP enhancement initialized successfully');

    } catch (error) {
      console.warn('⚠️ UEP enhancement failed, continuing with fallback:', error.message);
      this.uepEnabled = false;
    }
  }

  /**
   * Enhanced scaffold processing with UEP middleware
   */
  async _processCore(input, memory = '') {
    if (!this.uepEnabled || !this.enhancedAgent) {
      // Fallback to original processing
      return await super._processCore(input, memory);
    }

    try {
      console.log('🧠 Processing scaffold generation via UEP middleware...');

      // Create enhanced task input
      const taskInput = {
        taskDescription: `Generate agent scaffold from PRD input: ${typeof input === 'string' ? path.basename(input) : 'object'}`,
        input,
        memory,
        taskType: 'scaffold-generation',
        originalMethod: 'processCore',
        outputDirectory: this.config.outputDir,
        templatesDirectory: this.config.templatesDir
      };

      // Process through UEP-enhanced agent
      const result = await this.enhancedAgent.process(taskInput, {
        sessionId: `scaffold-${Date.now()}`,
        taskDescription: 'Agent scaffold generation',
        enableContextualMemory: true,
        enableCodebaseAwareness: true,
        enableCollisionDetection: this.config.collisionDetection,
        enableDocumentationLookup: true
      });

      if (result.success) {
        // If UEP processing succeeded, use UEP-enhanced processing
        return await this.processWithUEPContext(input, memory, result.uepMetadata);
      } else {
        console.warn('⚠️ UEP processing failed, falling back to original method');
        return await super._processCore(input, memory);
      }

    } catch (error) {
      console.warn('⚠️ UEP processing error, falling back to original method:', error.message);
      return await super._processCore(input, memory);
    }
  }

  /**
   * Process scaffold generation with enhanced UEP context
   */
  async processWithUEPContext(input, memory, uepMetadata) {
    try {
      console.log('🏗️ Generating scaffold with UEP context enhancement...');
      
      // Display UEP enhancements
      if (uepMetadata && uepMetadata.contextEnhancements) {
        const ctx = uepMetadata.contextEnhancements;
        console.log(`🧠 UEP Context: Memory=${!!ctx.memory}, Codebase=${!!ctx.codebase}, Docs=${!!ctx.documentation}, Tasks=${!!ctx.taskBreakdown}`);
        console.log(`📊 UEP Compliance Score: ${uepMetadata.complianceScore?.toFixed(2) || 'N/A'}`);
        
        // Show collision risks if detected
        if (ctx.codebase && ctx.codebase.collisionRisks && ctx.codebase.collisionRisks.length > 0) {
          console.warn(`⚠️ UEP detected ${ctx.codebase.collisionRisks.length} potential collision risks:`);
          ctx.codebase.collisionRisks.slice(0, 3).forEach(risk => {
            console.warn(`   - ${risk}`);
          });
        }
      }

      // Enhanced memory context
      let enhancedMemory = memory;
      if (uepMetadata?.contextEnhancements?.memory) {
        enhancedMemory = `${memory}\n\n=== UEP Memory Enhancement ===\n${uepMetadata.contextEnhancements.memory}`;
      }

      if (enhancedMemory && this.config.memoryEnabled) {
        console.log(`🧠 Using enhanced memory context: ${enhancedMemory.split('\n\n').length} entries`);
      }
      
      let prdData;
      
      // Handle input with enhanced error reporting
      if (typeof input === 'string') {
        if (await require('fs-extra').pathExists(input)) {
          console.log(`📄 Reading PRD from file: ${input}`);
          
          // Enhanced file reading with UEP context
          if (uepMetadata?.contextEnhancements?.codebase?.relevantFiles) {
            const relevantFiles = uepMetadata.contextEnhancements.codebase.relevantFiles;
            console.log(`🔍 UEP found ${relevantFiles.length} relevant files for context`);
          }
          
          const fileContent = await require('fs-extra').readFile(input, 'utf8');
          try {
            prdData = JSON.parse(fileContent);
          } catch (parseError) {
            throw new Error(`Invalid JSON in file ${input}: ${parseError.message}`);
          }
        } else {
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
      
      // Parse and validate input with enhanced validation
      const { parseInput } = await import('./scaffold-generator/lib/inputParser.js');
      const agentData = parseInput(prdData);
      console.log(`✅ Parsed PRD for agent: ${agentData.agentName}`);
      
      // Enhanced collision detection
      const kebabCaseName = this.toKebabCase(agentData.agentName);
      const outputPath = path.join(this.config.outputDir, kebabCaseName);
      
      // UEP-enhanced collision detection
      if (uepMetadata?.contextEnhancements?.codebase) {
        const codebase = uepMetadata.contextEnhancements.codebase;
        
        // Check for naming conflicts with existing code
        if (codebase.functions && codebase.functions.some(func => func.includes(agentData.agentName))) {
          console.warn(`⚠️ UEP Warning: Agent name "${agentData.agentName}" may conflict with existing functions`);
        }
        
        // Check for similar directory structures
        if (codebase.relevantFiles && codebase.relevantFiles.some(file => file.includes(kebabCaseName))) {
          console.warn(`⚠️ UEP Warning: Similar directory structure detected for "${kebabCaseName}"`);
        }
      }
      
      const fs = await import('fs-extra');
      if (await fs.default.pathExists(outputPath) && !this.config.overwrite) {
        throw new Error(`Agent directory already exists: ${outputPath}. Use --overwrite to replace it.`);
      }
      
      // Enhanced scaffold generation
      console.log('🏗️ Generating agent scaffold with UEP enhancements...');
      
      // Enhanced generation options with UEP context
      const generationOptions = {
        includeTests: this.config.includeTests,
        includeGitignore: this.config.includeGitignore,
        uepContext: uepMetadata?.contextEnhancements,
        complianceScore: uepMetadata?.complianceScore,
        enhancedValidation: this.config.enhancedValidation,
        collisionRisks: uepMetadata?.contextEnhancements?.codebase?.collisionRisks || []
      };
      
      // Enhanced template selection based on UEP context
      if (uepMetadata?.contextEnhancements?.documentation) {
        console.log('📚 Using UEP documentation context for enhanced template selection');
      }
      
      const result = await this.fileGenerator.generateAgent(agentData, generationOptions);
      
      console.log(`✅ Successfully generated enhanced agent: ${result.agentName}`);
      console.log(`📁 Output directory: ${result.outputPath}`);
      console.log(`📄 Generated ${result.files.length} files in ${result.directories.length} directories`);
      
      // Enhanced result with UEP metadata
      const processResult = {
        success: true,
        agentName: result.agentName,
        outputPath: result.outputPath,
        files: result.files,
        directories: result.directories,
        summary: result.summary,
        processedAt: new Date().toISOString(),
        memoryContext: !!enhancedMemory,
        uepEnhanced: true,
        uepMetadata: {
          complianceScore: uepMetadata?.complianceScore,
          contextEnhancements: uepMetadata?.contextEnhancements,
          validationResults: uepMetadata?.validationResults,
          collisionRisks: generationOptions.collisionRisks
        }
      };
      
      // Enhanced success message with UEP information
      let successMessage = `Generated enhanced agent scaffold for ${result.agentName}. Created ${result.files.length} files in ${result.directories.length} directories at ${result.outputPath}`;
      
      if (uepMetadata?.complianceScore) {
        successMessage += `. UEP Compliance Score: ${uepMetadata.complianceScore.toFixed(2)}`;
      }
      
      if (generationOptions.collisionRisks.length > 0) {
        successMessage += `. Warning: ${generationOptions.collisionRisks.length} potential collision risks detected`;
      }
      
      return successMessage;
      
    } catch (error) {
      console.error(`❌ Enhanced scaffold generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enhanced status with UEP information
   */
  getStatus() {
    const originalStatus = super.getStatus();
    
    return {
      ...originalStatus,
      enhanced: true,
      uep: {
        enabled: this.uepEnabled,
        agent: this.enhancedAgent ? {
          id: this.enhancedAgent.getAgentId(),
          type: this.enhancedAgent.agentType,
          enhanced: this.enhancedAgent.isEnhanced()
        } : null,
        features: {
          validation: this.config.enhancedValidation,
          context: this.config.enhancedContext,
          memory: this.config.memoryEnabled,
          collisionDetection: this.config.collisionDetection
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Standardized generate method for factory integration
   * Maps to processWithUEPContext with parameter transformation
   */
  async generate(options = {}) {
    try {
      console.log('🏗️ Enhanced Scaffold Generator - Generate method called');
      console.log('📊 Options received:', JSON.stringify(options, null, 2));
      
      // Transform generate options to processWithUEPContext format
      const input = {
        tasks: options.requirements?.tasks || [],
        metadata: {
          projectName: options.projectName || options.agentName || 'generated-project',
          description: options.description || 'Generated by Enhanced Scaffold Generator',
          version: '1.0.0'
        }
      };
      
      // Call processWithUEPContext with transformed input
      const result = await this.processWithUEPContext(input, '', null);
      
      // Transform result to expected generate format
      return {
        success: true,
        agentName: options.projectName || options.agentName || 'generated-project',
        outputPath: options.outputDirectory || this.config.outputDir || process.cwd(),
        outputDirectory: options.outputDirectory || this.config.outputDir || process.cwd(),
        generatedFiles: result.files || [],
        files: result.files || [],
        directories: result.directories || [],
        summary: result.summary || 'Project generated successfully',
        processingTime: result.processingTime || 0,
        timestamp: new Date().toISOString(),
        methodUsed: 'generate->processWithUEPContext'
      };
      
    } catch (error) {
      console.error('❌ Enhanced Scaffold Generator generate method failed:', error.message);
      return {
        success: false,
        error: error.message,
        agentName: options.projectName || options.agentName || 'generated-project',
        outputDirectory: options.outputDirectory || this.config.outputDir || process.cwd(),
        timestamp: new Date().toISOString(),
        methodUsed: 'generate->processWithUEPContext'
      };
    }
  }

  /**
   * Enhanced cleanup with UEP cleanup
   */
  async cleanup() {
    try {
      // Cleanup UEP enhancement
      if (this.enhancedAgent && this.enhancedAgent.cleanup) {
        await this.enhancedAgent.cleanup();
      }

      // Call original cleanup method
      await super.cleanup();

      console.log('✅ Enhanced Scaffold Generator cleanup completed with UEP cleanup');

    } catch (error) {
      console.error('❌ Enhanced Scaffold Generator cleanup failed:', error.message);
      throw error;
    }
  }
}

/**
 * Factory function for creating enhanced scaffold generator
 */
async function createEnhancedScaffoldGenerator(config = {}) {
  const enhancedGenerator = new EnhancedScaffoldGenerator(config);
  await enhancedGenerator.initialize();
  return enhancedGenerator;
}

/**
 * Main execution function for programmatic usage
 */
async function main(options = {}) {
  const agent = new EnhancedScaffoldGenerator({
    ...options,
    uepEnabled: options.uepEnabled !== false,
    enhancedValidation: options.enhancedValidation !== false,
    enhancedContext: options.enhancedContext !== false,
    collisionDetection: options.collisionDetection !== false
  });
  
  try {
    await agent.initialize();
    const result = await agent.process(options.input);
    return result;
  } catch (error) {
    console.error(`❌ Enhanced Scaffold Generator execution failed: ${error.message}`);
    throw error;
  } finally {
    await agent.cleanup();
  }
}

/**
 * CLI setup and command handling with UEP options
 */
async function setupCLI() {
  const { Command } = await import('commander');
  const program = new Command();
  
  program
    .name('enhanced-scaffold-generator')
    .description('Generate agent scaffolds with UEP enhancement')
    .version('1.0.0');

  program
    .command('generate')
    .alias('gen')
    .description('Generate enhanced agent scaffold from PRD input')
    .argument('<input>', 'PRD input file or JSON string')
    .option('-o, --output <dir>', 'Output directory', process.cwd())
    .option('-t, --templates <dir>', 'Templates directory', path.join(__dirname, 'scaffold-generator/templates'))
    .option('--no-tests', 'Skip generating test files')
    .option('--no-gitignore', 'Skip generating .gitignore file')
    .option('--overwrite', 'Overwrite existing agent directory')
    .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
    .option('--no-uep', 'Disable UEP enhancement')
    .option('--no-validation', 'Disable enhanced validation')
    .option('--no-context', 'Disable enhanced context')
    .option('--no-collision-detection', 'Disable collision detection')
    .action(async (input, options) => {
      try {
        const config = {
          outputDir: options.output,
          templatesDir: options.templates,
          includeTests: options.tests,
          includeGitignore: options.gitignore,
          overwrite: options.overwrite,
          logLevel: options.logLevel,
          input: input,
          uepEnabled: options.uep,
          enhancedValidation: options.validation,
          enhancedContext: options.context,
          collisionDetection: options.collisionDetection
        };
        
        const result = await main(config);
        
        console.log(`\n🎉 Enhanced agent scaffold generated successfully!`);
        console.log(`Agent: ${result.agentName || 'Unknown'}`);
        if (result.outputPath) console.log(`Path: ${result.outputPath}`);
        if (result.files) console.log(`Files: ${result.files.length}`);
        if (result.uepMetadata?.complianceScore) {
          console.log(`UEP Score: ${result.uepMetadata.complianceScore.toFixed(2)}`);
        }
        
        process.exit(0);
      } catch (error) {
        console.error(`\n💥 Enhanced generation failed: ${error.message}`);
        process.exit(1);
      }
    });

  return program;
}

// Export for programmatic usage
export {
  EnhancedScaffoldGenerator,
  createEnhancedScaffoldGenerator,
  main
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const program = await setupCLI();
  program.parse();
}