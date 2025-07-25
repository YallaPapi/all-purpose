/**
 * Universal Execution Protocol - CLI Wrapper for Human Prompts
 * 
 * Command-line interface for human prompt enhancement using UEP.
 * Intercepts prompts, enhances with context, and integrates with Claude Code workflow.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { ProtocolProcessor, UniversalExecutionRequest, createProtocolProcessor } from './ProtocolProcessor';
import { ValidationEngine, createValidationEngine } from './ValidationEngine';
import { TaskMasterAdapter, createTaskMasterAdapter } from './TaskMasterAdapter';
import { Context7ScannerAdapter, createContext7ScannerAdapter } from './Context7ScannerAdapter';
import { RAGAdapter, createRAGAdapter } from './RAGAdapter';

// CLI Configuration
export interface UEPCLIConfig {
  enableEnhancement: boolean;
  enableDebugMode: boolean;
  enableInteractiveMode: boolean;
  enableCaching: boolean;
  outputFormat: 'plain' | 'json' | 'enhanced';
  logLevel: 'silent' | 'minimal' | 'verbose' | 'debug';
  maxPromptLength: number;
  enhancementTimeout: number;
  workingDirectory: string;
  configFile?: string;
  sessionFile?: string;
}

// Enhanced prompt result
export interface EnhancedPromptResult {
  originalPrompt: string;
  enhancedPrompt: string;
  enhancements: {
    memory: string;
    codebaseContext: string;
    documentation: string;
    taskBreakdown: string;
  };
  metadata: {
    processingTime: number;
    enhancementScore: number;
    componentsUsed: string[];
    sessionId: string;
  };
  recommendations: string[];
  warnings: string[];
}

// CLI session data
export interface CLISession {
  id: string;
  startTime: Date;
  prompts: Array<{
    timestamp: Date;
    original: string;
    enhanced: string;
    approved: boolean;
    metadata: any;
  }>;
  metadata: {
    userType: 'developer' | 'designer' | 'analyst' | 'other';
    projectContext: string;
    preferences: Record<string, any>;
  };
}

/**
 * UEP CLI Wrapper Implementation
 */
export class UEPCLIWrapper {
  private config: UEPCLIConfig;
  private protocolProcessor: ProtocolProcessor;
  private session: CLISession;
  private rl: readline.Interface;

  constructor(config: Partial<UEPCLIConfig> = {}) {
    this.config = {
      enableEnhancement: true,
      enableDebugMode: false,
      enableInteractiveMode: true,
      enableCaching: true,
      outputFormat: 'enhanced',
      logLevel: 'minimal',
      maxPromptLength: 10000,
      enhancementTimeout: 30000,
      workingDirectory: process.cwd(),
      ...config
    };

    this.initializeProtocolProcessor();
    this.initializeSession();
    this.initializeReadline();
  }

  /**
   * Initialize UEP Protocol Processor
   */
  private initializeProtocolProcessor(): void {
    const adapters = {
      taskMaster: createTaskMasterAdapter({
        enableCaching: this.config.enableCaching,
        timeout: this.config.enhancementTimeout
      }),
      context7: createContext7ScannerAdapter({
        projectRoot: this.config.workingDirectory,
        enableCaching: this.config.enableCaching
      }),
      rag: createRAGAdapter(),
      validation: createValidationEngine()
    };

    this.protocolProcessor = createProtocolProcessor(adapters, {
      enableAuditLogging: this.config.logLevel === 'debug',
      enforceCompliance: !this.config.enableDebugMode
    });
  }

  /**
   * Initialize CLI session
   */
  private initializeSession(): void {
    this.session = {
      id: this.generateSessionId(),
      startTime: new Date(),
      prompts: [],
      metadata: {
        userType: 'developer', // Default, can be configured
        projectContext: path.basename(this.config.workingDirectory),
        preferences: {}
      }
    };
  }

  /**
   * Initialize readline interface
   */
  private initializeReadline(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🧠 UEP> '
    });
  }

  /**
   * Main CLI entry point
   */
  async run(): Promise<void> {
    await this.displayWelcome();
    
    if (this.config.enableInteractiveMode) {
      await this.runInteractiveMode();
    } else {
      await this.runSinglePromptMode();
    }
  }

  /**
   * Display welcome message
   */
  private async displayWelcome(): Promise<void> {
    if (this.config.logLevel === 'silent') return;

    console.log('\n🧠 Universal Execution Protocol - CLI Wrapper');
    console.log('═'.repeat(50));
    console.log(`📁 Project: ${this.session.metadata.projectContext}`);
    console.log(`🆔 Session: ${this.session.id}`);
    console.log(`⚙️  Enhancement: ${this.config.enableEnhancement ? 'Enabled' : 'Disabled'}`);
    console.log(`🐛 Debug Mode: ${this.config.enableDebugMode ? 'Enabled' : 'Disabled'}`);
    
    if (this.config.enableInteractiveMode) {
      console.log('\n💡 Enter your prompts below. Type "help" for commands, "exit" to quit.');
      console.log('');
    }
  }

  /**
   * Run interactive mode
   */
  private async runInteractiveMode(): Promise<void> {
    return new Promise((resolve) => {
      this.rl.prompt();

      this.rl.on('line', async (input) => {
        const trimmedInput = input.trim();
        
        if (trimmedInput === 'exit' || trimmedInput === 'quit') {
          await this.handleExit();
          resolve();
          return;
        }

        if (trimmedInput === 'help') {
          this.displayHelp();
          this.rl.prompt();
          return;
        }

        if (trimmedInput === 'session') {
          this.displaySessionInfo();
          this.rl.prompt();
          return;
        }

        if (trimmedInput === 'config') {
          this.displayConfig();
          this.rl.prompt();
          return;
        }

        if (trimmedInput.startsWith('set ')) {
          await this.handleConfigUpdate(trimmedInput);
          this.rl.prompt();
          return;
        }

        if (trimmedInput.length === 0) {
          this.rl.prompt();
          return;
        }

        // Process the prompt
        await this.processPrompt(trimmedInput);
        this.rl.prompt();
      });

      this.rl.on('close', async () => {
        await this.handleExit();
        resolve();
      });
    });
  }

  /**
   * Run single prompt mode (for non-interactive usage)
   */
  private async runSinglePromptMode(): Promise<void> {
    const args = process.argv.slice(2);
    const promptText = args.join(' ');
    
    if (promptText.length === 0) {
      console.error('❌ No prompt provided for single-prompt mode');
      process.exit(1);
    }

    await this.processPrompt(promptText);
  }

  /**
   * Process a user prompt through UEP
   */
  private async processPrompt(promptText: string): Promise<void> {
    if (promptText.length > this.config.maxPromptLength) {
      console.warn(`⚠️ Prompt truncated to ${this.config.maxPromptLength} characters`);
      promptText = promptText.substring(0, this.config.maxPromptLength);
    }

    const startTime = Date.now();

    try {
      if (this.config.enableEnhancement) {
        const enhancedResult = await this.enhancePrompt(promptText);
        this.displayEnhancedResult(enhancedResult);
        
        // Store in session
        this.session.prompts.push({
          timestamp: new Date(),
          original: promptText,
          enhanced: enhancedResult.enhancedPrompt,
          approved: true,
          metadata: enhancedResult.metadata
        });
      } else {
        // Pass through without enhancement
        this.displayPlainResult(promptText);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Prompt processing failed after ${processingTime}ms:`);
      console.error(`   ${error.message}`);
      
      if (this.config.enableDebugMode) {
        console.error('\n🐛 Debug trace:');
        console.error(error.stack);
      }

      // Store failed prompt
      this.session.prompts.push({
        timestamp: new Date(),
        original: promptText,
        enhanced: promptText, // Fallback to original
        approved: false,
        metadata: { error: error.message, processingTime }
      });
    }
  }

  /**
   * Enhance prompt using UEP
   */
  private async enhancePrompt(promptText: string): Promise<EnhancedPromptResult> {
    if (this.config.logLevel === 'verbose' || this.config.logLevel === 'debug') {
      console.log(`🔄 Enhancing prompt: "${promptText.substring(0, 50)}..."`);
    }

    // Create UEP request
    const request: UniversalExecutionRequest = {
      taskDescription: promptText,
      requesterType: 'human',
      sessionId: this.session.id,
      context: {
        userType: this.session.metadata.userType,
        projectContext: this.session.metadata.projectContext,
        workingDirectory: this.config.workingDirectory,
        preferences: this.session.metadata.preferences
      },
      overrides: {
        debugMode: this.config.enableDebugMode
      }
    };

    // Process through UEP
    const result = await this.protocolProcessor.processTask(request);

    // Format enhanced prompt
    const enhancedPrompt = this.formatEnhancedPrompt(promptText, result);

    return {
      originalPrompt: promptText,
      enhancedPrompt,
      enhancements: {
        memory: result.context.memory || '',
        codebaseContext: this.formatCodebaseContext(result.context.codebase),
        documentation: this.formatDocumentation(result.context.documentation),
        taskBreakdown: this.formatTaskBreakdown(result.context.taskBreakdown)
      },
      metadata: {
        processingTime: result.processingTime,
        enhancementScore: this.calculateEnhancementScore(result),
        componentsUsed: Object.keys(result.context).filter(key => result.context[key]),
        sessionId: this.session.id
      },
      recommendations: this.extractRecommendations(result),
      warnings: this.extractWarnings(result)
    };
  }

  /**
   * Format enhanced prompt
   */
  private formatEnhancedPrompt(originalPrompt: string, result: any): string {
    let enhanced = `# Enhanced Task Request\n\n## Original Request\n${originalPrompt}\n\n`;

    // Add memory context
    if (result.context.memory) {
      enhanced += `## Working Memory Context\n${result.context.memory}\n\n`;
    }

    // Add codebase context
    if (result.context.codebase) {
      const codebase = result.context.codebase;
      enhanced += `## Codebase Context\n`;
      
      if (codebase.relevantFiles && codebase.relevantFiles.length > 0) {
        enhanced += `### Relevant Files\n${codebase.relevantFiles.slice(0, 5).map(f => `- ${f}`).join('\n')}\n\n`;
      }
      
      if (codebase.functions && codebase.functions.length > 0) {
        enhanced += `### Available Functions\n${codebase.functions.slice(0, 10).map(f => `- ${f}()`).join('\n')}\n\n`;
      }
      
      if (codebase.collisionRisks && codebase.collisionRisks.length > 0) {
        enhanced += `### ⚠️ Potential Collision Risks\n${codebase.collisionRisks.slice(0, 3).map(r => `- ${r}`).join('\n')}\n\n`;
      }
    }

    // Add documentation context
    if (result.context.documentation && result.context.documentation.length > 0) {
      enhanced += `## Relevant Documentation\n`;
      result.context.documentation.slice(0, 3).forEach((doc, index) => {
        enhanced += `### ${index + 1}. ${doc.source}\n`;
        enhanced += `${doc.content.substring(0, 200)}...\n\n`;
      });
    }

    // Add task breakdown
    if (result.context.taskBreakdown) {
      const breakdown = result.context.taskBreakdown;
      enhanced += `## Suggested Approach\n`;
      enhanced += `**Estimated Complexity:** ${breakdown.complexity}/10\n`;
      enhanced += `**Estimated Timeline:** ${breakdown.timeline}\n\n`;
      
      if (breakdown.subtasks && breakdown.subtasks.length > 0) {
        enhanced += `### Task Breakdown\n`;
        breakdown.subtasks.forEach((task, index) => {
          enhanced += `${index + 1}. **${task.title}**\n   ${task.description}\n`;
        });
        enhanced += '\n';
      }
    }

    enhanced += `## Execute the Original Request\n${originalPrompt}`;

    return enhanced;
  }

  /**
   * Display enhanced result
   */
  private displayEnhancedResult(result: EnhancedPromptResult): void {
    switch (this.config.outputFormat) {
      case 'json':
        console.log(JSON.stringify(result, null, 2));
        break;
        
      case 'plain':
        console.log(result.enhancedPrompt);
        break;
        
      case 'enhanced':
      default:
        console.log('\n📝 Enhanced Prompt:');
        console.log('═'.repeat(60));
        console.log(result.enhancedPrompt);
        console.log('═'.repeat(60));
        
        // Show metadata if verbose
        if (this.config.logLevel === 'verbose' || this.config.logLevel === 'debug') {
          console.log(`\n📊 Processing: ${result.metadata.processingTime}ms | Enhancement Score: ${result.metadata.enhancementScore.toFixed(2)} | Components: ${result.metadata.componentsUsed.join(', ')}`);
        }

        // Show warnings
        if (result.warnings.length > 0) {
          console.log(`\n⚠️ Warnings:`);
          result.warnings.forEach(warning => console.log(`   - ${warning}`));
        }

        // Show recommendations
        if (result.recommendations.length > 0 && this.config.logLevel !== 'minimal') {
          console.log(`\n💡 Recommendations:`);
          result.recommendations.slice(0, 3).forEach(rec => console.log(`   - ${rec}`));
        }
        break;
    }
  }

  /**
   * Display plain result (no enhancement)
   */
  private displayPlainResult(promptText: string): void {
    console.log('\n📝 Prompt (No Enhancement):');
    console.log('═'.repeat(60));
    console.log(promptText);
    console.log('═'.repeat(60));
  }

  /**
   * Display help information
   */
  private displayHelp(): void {
    console.log('\n📚 UEP CLI Commands:');
    console.log('  help        - Show this help message');
    console.log('  session     - Show current session information');
    console.log('  config      - Show current configuration');
    console.log('  set <key>=<value> - Update configuration');
    console.log('  exit/quit   - Exit the CLI');
    console.log('\n💡 Configuration Options:');
    console.log('  set enhancement=true/false  - Enable/disable prompt enhancement');
    console.log('  set debug=true/false        - Enable/disable debug mode');
    console.log('  set format=plain/json/enhanced - Set output format');
    console.log('  set loglevel=silent/minimal/verbose/debug - Set log level');
    console.log('');
  }

  /**
   * Display session information
   */
  private displaySessionInfo(): void {
    const uptime = Date.now() - this.session.startTime.getTime();
    const promptCount = this.session.prompts.length;
    const successfulPrompts = this.session.prompts.filter(p => p.approved).length;
    
    console.log('\n📊 Session Information:');
    console.log(`  ID: ${this.session.id}`);
    console.log(`  Uptime: ${Math.round(uptime / 1000)}s`);
    console.log(`  Prompts: ${promptCount} (${successfulPrompts} successful)`);
    console.log(`  Project: ${this.session.metadata.projectContext}`);
    console.log(`  User Type: ${this.session.metadata.userType}`);
    console.log('');
  }

  /**
   * Display configuration
   */
  private displayConfig(): void {
    console.log('\n⚙️ Current Configuration:');
    console.log(`  Enhancement: ${this.config.enableEnhancement}`);
    console.log(`  Debug Mode: ${this.config.enableDebugMode}`);
    console.log(`  Interactive: ${this.config.enableInteractiveMode}`);
    console.log(`  Output Format: ${this.config.outputFormat}`);
    console.log(`  Log Level: ${this.config.logLevel}`);
    console.log(`  Working Dir: ${this.config.workingDirectory}`);
    console.log('');
  }

  /**
   * Handle configuration updates
   */
  private async handleConfigUpdate(input: string): Promise<void> {
    const match = input.match(/^set\s+(\w+)=(.+)$/);
    if (!match) {
      console.log('❌ Invalid format. Use: set <key>=<value>');
      return;
    }

    const [, key, value] = match;
    
    try {
      switch (key.toLowerCase()) {
        case 'enhancement':
          this.config.enableEnhancement = value.toLowerCase() === 'true';
          break;
        case 'debug':
          this.config.enableDebugMode = value.toLowerCase() === 'true';
          break;
        case 'format':
          if (['plain', 'json', 'enhanced'].includes(value)) {
            this.config.outputFormat = value as any;
          } else {
            throw new Error('Invalid format. Use: plain, json, or enhanced');
          }
          break;
        case 'loglevel':
          if (['silent', 'minimal', 'verbose', 'debug'].includes(value)) {
            this.config.logLevel = value as any;
          } else {
            throw new Error('Invalid log level. Use: silent, minimal, verbose, or debug');
          }
          break;
        default:
          throw new Error(`Unknown configuration key: ${key}`);
      }
      
      console.log(`✅ Updated ${key} = ${value}`);
      
    } catch (error) {
      console.log(`❌ Configuration update failed: ${error.message}`);
    }
  }

  /**
   * Handle CLI exit
   */
  private async handleExit(): Promise<void> {
    if (this.config.logLevel !== 'silent') {
      const promptCount = this.session.prompts.length;
      const sessionDuration = Date.now() - this.session.startTime.getTime();
      
      console.log('\n👋 Session Summary:');
      console.log(`   Prompts processed: ${promptCount}`);
      console.log(`   Session duration: ${Math.round(sessionDuration / 1000)}s`);
      console.log('   Thank you for using UEP CLI!');
    }

    // Save session if configured
    if (this.config.sessionFile) {
      await this.saveSession();
    }

    this.rl.close();
  }

  /**
   * Save session to file
   */
  private async saveSession(): Promise<void> {
    try {
      if (this.config.sessionFile) {
        await fs.writeFile(this.config.sessionFile, JSON.stringify(this.session, null, 2));
        if (this.config.logLevel === 'debug') {
          console.log(`💾 Session saved to ${this.config.sessionFile}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to save session: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  private formatCodebaseContext(codebase: any): string {
    if (!codebase) return '';
    
    let formatted = '';
    if (codebase.relevantFiles) {
      formatted += `Files: ${codebase.relevantFiles.slice(0, 3).join(', ')}`;
    }
    if (codebase.functions) {
      formatted += `\nFunctions: ${codebase.functions.slice(0, 5).join(', ')}`;
    }
    return formatted;
  }

  private formatDocumentation(docs: any[]): string {
    if (!docs || docs.length === 0) return '';
    
    return docs.slice(0, 2).map(doc => 
      `${doc.source}: ${doc.content.substring(0, 100)}...`
    ).join('\n');
  }

  private formatTaskBreakdown(breakdown: any): string {
    if (!breakdown) return '';
    
    let formatted = `Complexity: ${breakdown.complexity}, Timeline: ${breakdown.timeline}`;
    if (breakdown.subtasks && breakdown.subtasks.length > 0) {
      formatted += `\nSubtasks: ${breakdown.subtasks.length}`;
    }
    return formatted;
  }

  private calculateEnhancementScore(result: any): number {
    let score = 0;
    
    if (result.context.memory) score += 0.2;
    if (result.context.codebase) score += 0.3;
    if (result.context.documentation) score += 0.3;
    if (result.context.taskBreakdown) score += 0.2;
    
    return Math.min(1, score);
  }

  private extractRecommendations(result: any): string[] {
    const recommendations = [];
    
    if (result.context.codebase?.collisionRisks?.length > 0) {
      recommendations.push('Review potential collision risks before implementation');
    }
    
    if (result.context.taskBreakdown?.complexity > 7) {
      recommendations.push('Consider breaking down this complex task into smaller parts');
    }
    
    if (!result.context.documentation || result.context.documentation.length === 0) {
      recommendations.push('Consider adding documentation for this task');
    }
    
    return recommendations;
  }

  private extractWarnings(result: any): string[] {
    const warnings = [];
    
    if (!result.approved) {
      warnings.push('Task enhancement was not fully approved by validation');
    }
    
    if (result.processingTime > 20000) {
      warnings.push('Enhancement took longer than expected - consider simplifying the request');
    }
    
    if (result.validationResults?.some(v => v.result === 'warning')) {
      warnings.push('Some validation checks returned warnings');
    }
    
    return warnings;
  }

  private generateSessionId(): string {
    return `uep-cli-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }
}

/**
 * CLI Program Setup
 */
export function createCLIProgram(): Command {
  const program = new Command();
  
  program
    .name('uep-cli')
    .description('Universal Execution Protocol CLI for enhanced human prompts')
    .version('1.0.0');

  program
    .option('-e, --enhancement <boolean>', 'Enable prompt enhancement', 'true')
    .option('-d, --debug', 'Enable debug mode')
    .option('-i, --interactive', 'Run in interactive mode', true)
    .option('-f, --format <format>', 'Output format (plain|json|enhanced)', 'enhanced')
    .option('-l, --log-level <level>', 'Log level (silent|minimal|verbose|debug)', 'minimal')
    .option('-w, --working-dir <path>', 'Working directory', process.cwd())
    .option('-c, --config <file>', 'Configuration file')
    .option('-s, --session <file>', 'Session save file')
    .action(async (options) => {
      const config: Partial<UEPCLIConfig> = {
        enableEnhancement: options.enhancement === 'true',
        enableDebugMode: options.debug || false,
        enableInteractiveMode: options.interactive,
        outputFormat: options.format,
        logLevel: options.logLevel,
        workingDirectory: options.workingDir,
        configFile: options.config,
        sessionFile: options.session
      };

      const cli = new UEPCLIWrapper(config);
      await cli.run();
    });

  return program;
}

// Export for direct usage
export { UEPCLIWrapper as default };