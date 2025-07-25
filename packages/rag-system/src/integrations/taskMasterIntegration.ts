/**
 * TaskMaster CLI Integration
 * 
 * Use context7: Pre-command context lookup for TaskMaster commands
 * Following All-Purpose Pattern: Works with ANY TaskMaster commands
 */

import { spawn } from 'child_process';
import { createContextAPI, ContextAPI } from '../api/contextAPI';
import { logger } from '../utils/logger';

export interface TaskMasterConfig {
  enableContextInjection: boolean;
  enhancedCommands: string[];
  contextThreshold: number;
  maxContextItems: number;
  debugMode: boolean;
}

/**
 * Commands that benefit from context injection
 */
const DEFAULT_ENHANCED_COMMANDS = [
  'research',
  'expand', 
  'parse-prd',
  'add-task',
  'update'
];

/**
 * TaskMaster Integration with RAG Context
 */
export class TaskMasterIntegration {
  private config: TaskMasterConfig;
  private contextAPI: ContextAPI;

  constructor(config: Partial<TaskMasterConfig> = {}) {
    this.config = {
      enableContextInjection: true,
      enhancedCommands: DEFAULT_ENHANCED_COMMANDS,
      contextThreshold: 0.6,
      maxContextItems: 3,
      debugMode: process.env.DEBUG === '1',
      ...config
    };

    this.contextAPI = createContextAPI({
      defaultScoreThreshold: this.config.contextThreshold,
      defaultMaxResults: this.config.maxContextItems
    });

    logger.info('TaskMaster integration initialized', {
      enableContextInjection: this.config.enableContextInjection,
      enhancedCommands: this.config.enhancedCommands.length
    });
  }

  /**
   * Execute TaskMaster command with context enhancement
   */
  async executeCommand(args: string[]): Promise<number> {
    if (args.length === 0) {
      return this.runTaskMaster(args);
    }

    const command = args[0];
    
    // Check if this command should be enhanced
    if (!this.config.enableContextInjection || !this.shouldEnhanceCommand(command)) {
      logger.info('Executing TaskMaster command without enhancement', { command });
      return this.runTaskMaster(args);
    }

    logger.info('Enhancing TaskMaster command with context', { command });

    try {
      const enhancedArgs = await this.enhanceCommandArgs(command, args);
      return this.runTaskMaster(enhancedArgs);
    } catch (error) {
      logger.error('Failed to enhance command, falling back to original', {
        command,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.runTaskMaster(args);
    }
  }

  /**
   * Check if command should be enhanced with context
   */
  private shouldEnhanceCommand(command: string): boolean {
    return this.config.enhancedCommands.includes(command);
  }

  /**
   * Enhance command arguments with relevant context
   */
  private async enhanceCommandArgs(command: string, args: string[]): Promise<string[]> {
    const enhancer = this.getCommandEnhancer(command);
    if (!enhancer) {
      return args;
    }

    return enhancer(args);
  }

  /**
   * Get command-specific enhancer function
   */
  private getCommandEnhancer(command: string): ((args: string[]) => Promise<string[]>) | null {
    switch (command) {
      case 'research':
        return this.enhanceResearchCommand.bind(this);
      case 'expand':
        return this.enhanceExpandCommand.bind(this);
      case 'parse-prd':
        return this.enhanceParsePrdCommand.bind(this);
      case 'add-task':
        return this.enhanceAddTaskCommand.bind(this);
      case 'update':
        return this.enhanceUpdateCommand.bind(this);
      default:
        return null;
    }
  }

  /**
   * Enhance research command with development methodology context
   */
  private async enhanceResearchCommand(args: string[]): Promise<string[]> {
    const promptIndex = this.findPromptArgIndex(args);
    if (promptIndex === -1) {
      return args;
    }

    const originalPrompt = args[promptIndex];
    const enhancedPrompt = await this.enhancePromptWithContext(
      originalPrompt,
      'meta-agent development research methodology'
    );

    const newArgs = [...args];
    newArgs[promptIndex] = enhancedPrompt;
    
    this.logEnhancement('research', originalPrompt, enhancedPrompt);
    return newArgs;
  }

  /**
   * Enhance expand command with task breakdown patterns
   */
  private async enhanceExpandCommand(args: string[]): Promise<string[]> {
    const promptIndex = this.findPromptArgIndex(args, '--prompt');
    if (promptIndex === -1) {
      return args;
    }

    const originalPrompt = args[promptIndex];
    const enhancedPrompt = await this.enhancePromptWithContext(
      originalPrompt,
      'task expansion All-Purpose Pattern methodology'
    );

    const newArgs = [...args];
    newArgs[promptIndex] = enhancedPrompt;

    this.logEnhancement('expand', originalPrompt, enhancedPrompt);
    return newArgs;
  }

  /**
   * Enhance parse-prd command with PRD parsing patterns
   */
  private async enhanceParsePrdCommand(args: string[]): Promise<string[]> {
    // For parse-prd, we can inject context as a system message or add context to the process
    const contextQuery = 'PRD parsing task generation All-Purpose Pattern';
    const contextResults = await this.contextAPI.searchContext({
      prompt: contextQuery,
      maxResults: 2
    });

    if (contextResults.length > 0) {
      logger.info('Adding context to parse-prd execution', {
        contextItems: contextResults.length
      });
      
      // Add environment variable to pass context to TaskMaster
      process.env.TASKMASTER_CONTEXT = this.buildContextString(contextResults);
    }

    return args;
  }

  /**
   * Enhance add-task command with task creation patterns
   */
  private async enhanceAddTaskCommand(args: string[]): Promise<string[]> {
    const promptIndex = this.findPromptArgIndex(args, '--prompt');
    if (promptIndex === -1) {
      return args;
    }

    const originalPrompt = args[promptIndex];
    const enhancedPrompt = await this.enhancePromptWithContext(
      originalPrompt,
      'task creation 5-Document Framework meta-agent patterns'
    );

    const newArgs = [...args];
    newArgs[promptIndex] = enhancedPrompt;

    this.logEnhancement('add-task', originalPrompt, enhancedPrompt);
    return newArgs;
  }

  /**
   * Enhance update command with project context
   */
  private async enhanceUpdateCommand(args: string[]): Promise<string[]> {
    const promptIndex = this.findPromptArgIndex(args, '--prompt');
    if (promptIndex === -1) {
      return args;
    }

    const originalPrompt = args[promptIndex];
    const enhancedPrompt = await this.enhancePromptWithContext(
      originalPrompt,
      'task update Vercel-native architecture patterns'
    );

    const newArgs = [...args];
    newArgs[promptIndex] = enhancedPrompt;

    this.logEnhancement('update', originalPrompt, enhancedPrompt);
    return newArgs;
  }

  /**
   * Enhance prompt with relevant context
   */
  private async enhancePromptWithContext(prompt: string, contextQuery: string): Promise<string> {
    const enhanced = await this.contextAPI.enhancePrompt({
      prompt: `${contextQuery}\n\nOriginal request: ${prompt}`,
      maxResults: this.config.maxContextItems,
      scoreThreshold: this.config.contextThreshold
    });

    return enhanced.enhancedPrompt;
  }

  /**
   * Find prompt argument index in args array
   */
  private findPromptArgIndex(args: string[], flag: string = ''): number {
    if (!flag) {
      // For positional arguments (like research command)
      return args.findIndex(arg => !arg.startsWith('--') && arg !== args[0]);
    }

    // For flag-based arguments
    const flagIndex = args.findIndex(arg => arg.startsWith(flag));
    if (flagIndex === -1) return -1;

    // Check if it's --flag=value format
    if (args[flagIndex].includes('=')) {
      return flagIndex;
    }

    // Check if next arg is the value
    if (flagIndex + 1 < args.length && !args[flagIndex + 1].startsWith('--')) {
      return flagIndex + 1;
    }

    return -1;
  }

  /**
   * Build context string for environment variable
   */
  private buildContextString(results: any[]): string {
    return results.map(r => `${r.metadata.fileName || 'Context'}: ${r.snippet}`).join('\n\n');
  }

  /**
   * Log enhancement details for debugging
   */
  private logEnhancement(command: string, original: string, enhanced: string): void {
    if (this.config.debugMode) {
      logger.info('Command enhanced with context', {
        command,
        originalLength: original.length,
        enhancedLength: enhanced.length,
        contextAdded: enhanced.length - original.length
      });
    }
  }

  /**
   * Execute the actual TaskMaster command
   */
  private runTaskMaster(args: string[]): Promise<number> {
    return new Promise((resolve, reject) => {
      const taskMasterPath = 'node';
      
      logger.info('Executing TaskMaster command', {
        command: args[0] || 'help',
        args: args.length
      });

      const child = spawn(taskMasterPath, ['node_modules/task-master-ai/bin/task-master.js', ...args], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env }
      });

      child.on('close', (code) => {
        const exitCode = code || 0;
        logger.info('TaskMaster command completed', { 
          exitCode,
          command: args[0] || 'help'
        });
        resolve(exitCode);
      });

      child.on('error', (error) => {
        logger.error('TaskMaster command failed', {
          error: error.message,
          command: args[0] || 'help'
        });
        reject(error);
      });
    });
  }
}

/**
 * Create TaskMaster integration with default configuration
 */
export function createTaskMasterIntegration(config?: Partial<TaskMasterConfig>): TaskMasterIntegration {
  return new TaskMasterIntegration(config);
}

/**
 * CLI wrapper function for TaskMaster with context
 */
export async function runTaskMasterWithContext(args: string[] = []): Promise<number> {
  const integration = createTaskMasterIntegration();
  return integration.executeCommand(args);
}