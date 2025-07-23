/**
 * TaskMaster CLI Integration
 *
 * Use context7: Pre-command context lookup for TaskMaster commands
 * Following All-Purpose Pattern: Works with ANY TaskMaster commands
 */
export interface TaskMasterConfig {
    enableContextInjection: boolean;
    enhancedCommands: string[];
    contextThreshold: number;
    maxContextItems: number;
    debugMode: boolean;
}
/**
 * TaskMaster Integration with RAG Context
 */
export declare class TaskMasterIntegration {
    private config;
    private contextAPI;
    constructor(config?: Partial<TaskMasterConfig>);
    /**
     * Execute TaskMaster command with context enhancement
     */
    executeCommand(args: string[]): Promise<number>;
    /**
     * Check if command should be enhanced with context
     */
    private shouldEnhanceCommand;
    /**
     * Enhance command arguments with relevant context
     */
    private enhanceCommandArgs;
    /**
     * Get command-specific enhancer function
     */
    private getCommandEnhancer;
    /**
     * Enhance research command with development methodology context
     */
    private enhanceResearchCommand;
    /**
     * Enhance expand command with task breakdown patterns
     */
    private enhanceExpandCommand;
    /**
     * Enhance parse-prd command with PRD parsing patterns
     */
    private enhanceParsePrdCommand;
    /**
     * Enhance add-task command with task creation patterns
     */
    private enhanceAddTaskCommand;
    /**
     * Enhance update command with project context
     */
    private enhanceUpdateCommand;
    /**
     * Enhance prompt with relevant context
     */
    private enhancePromptWithContext;
    /**
     * Find prompt argument index in args array
     */
    private findPromptArgIndex;
    /**
     * Build context string for environment variable
     */
    private buildContextString;
    /**
     * Log enhancement details for debugging
     */
    private logEnhancement;
    /**
     * Execute the actual TaskMaster command
     */
    private runTaskMaster;
}
/**
 * Create TaskMaster integration with default configuration
 */
export declare function createTaskMasterIntegration(config?: Partial<TaskMasterConfig>): TaskMasterIntegration;
/**
 * CLI wrapper function for TaskMaster with context
 */
export declare function runTaskMasterWithContext(args?: string[]): Promise<number>;
//# sourceMappingURL=taskMasterIntegration.d.ts.map