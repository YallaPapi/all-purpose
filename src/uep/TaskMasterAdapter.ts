/**
 * Universal Execution Protocol - TaskMaster Adapter
 * 
 * Adapter to automate task breakdown via TaskMaster CLI for all incoming tasks.
 * Implements caching, error handling, and integration with existing TaskMaster system.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { z } from 'zod';
import { TaskMasterAdapter as ITaskMasterAdapter, TaskMasterResult } from './ProtocolProcessor';

const execAsync = promisify(exec);

// Validation schemas
const TaskMasterTaskSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string(),
  status: z.string().optional(),
  priority: z.string().optional(),
  dependencies: z.array(z.union([z.string(), z.number()])).optional(),
  details: z.string().optional(),
  testStrategy: z.string().optional(),
  subtasks: z.array(z.any()).optional()
});

const TaskMasterResponseSchema = z.object({
  master: z.object({
    tasks: z.array(TaskMasterTaskSchema),
    metadata: z.object({
      projectName: z.string(),
      totalTasks: z.number(),
      sourceFile: z.string().optional(),
      generatedAt: z.string().optional()
    }).optional()
  })
});

// Cache entry interface
interface CacheEntry {
  taskDescription: string;
  result: TaskMasterResult;
  timestamp: Date;
  context?: any;
}

/**
 * TaskMaster CLI Adapter Implementation
 */
export class TaskMasterAdapter implements ITaskMasterAdapter {
  private config: TaskMasterConfig;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(config: Partial<TaskMasterConfig> = {}) {
    this.config = {
      cliCommand: 'task-master',
      timeout: 60000, // 60 seconds
      maxCacheEntries: 100,
      cacheTimeout: 300000, // 5 minutes
      enableCaching: true,
      enableResearch: true,
      workingDirectory: process.cwd(),
      ...config
    };
  }

  /**
   * Main entry point for processing tasks
   */
  async processTask(taskDescription: string, context?: any): Promise<TaskMasterResult> {
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.getCachedResult(taskDescription, context);
        if (cached) {
          console.log(`📋 TaskMaster: Using cached result for "${taskDescription.substring(0, 50)}..."`);
          return cached;
        }
      }

      console.log(`🚀 TaskMaster: Processing task "${taskDescription.substring(0, 50)}..."`);

      // Create temporary PRD for the task
      const prdContent = this.createTaskPRD(taskDescription, context);
      const tempPrdPath = await this.createTempPRD(prdContent);

      try {
        // Parse PRD using TaskMaster
        await this.parsePRD(tempPrdPath);

        // Read the generated tasks
        const tasks = await this.readGeneratedTasks();

        // Create result
        const result = this.formatTaskMasterResult(tasks, taskDescription);

        // Cache result
        if (this.config.enableCaching) {
          this.cacheResult(taskDescription, result, context);
        }

        return result;

      } finally {
        // Cleanup temp file
        await this.cleanupTempFile(tempPrdPath);
      }

    } catch (error) {
      console.error(`❌ TaskMaster: Failed to process task: ${error.message}`);
      
      // Return fallback result
      return this.createFallbackResult(taskDescription, error.message);
    }
  }

  /**
   * Create PRD content for the given task
   */
  private createTaskPRD(taskDescription: string, context?: any): string {
    const complexity = this.estimateComplexity(taskDescription);
    const projectName = context?.projectName || 'UEP Task Processing';
    
    return `# ${projectName} - Task Breakdown

## Task Description
${taskDescription}

## Requirements
- Break down this task into actionable subtasks
- Each subtask should be clear and specific
- Include dependencies where appropriate
- Estimate complexity and priority

## Context
${context ? JSON.stringify(context, null, 2) : 'No additional context provided'}

## Complexity Estimate
${complexity}

## Goals
- Create clear, actionable task breakdown
- Ensure proper sequencing of dependencies
- Provide realistic time estimates
- Include test strategy where applicable

## Success Criteria
- All subtasks are well-defined
- Dependencies are clearly mapped
- Implementation path is clear
- Testing approach is specified
`;
  }

  /**
   * Create temporary PRD file
   */
  private async createTempPRD(content: string): Promise<string> {
    const tempDir = path.join(this.config.workingDirectory, '.taskmaster', 'temp');
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create temp directory, using current directory');
    }

    const timestamp = Date.now();
    const tempPath = path.join(tempDir, `uep-task-${timestamp}.md`);
    
    await fs.writeFile(tempPath, content, 'utf8');
    
    console.log(`📝 TaskMaster: Created temp PRD at ${tempPath}`);
    return tempPath;
  }

  /**
   * Parse PRD using TaskMaster CLI
   */
  private async parsePRD(prdPath: string): Promise<void> {
    const command = this.config.enableResearch 
      ? `${this.config.cliCommand} parse-prd "${prdPath}" --research`
      : `${this.config.cliCommand} parse-prd "${prdPath}"`;

    console.log(`⚡ TaskMaster: Executing - ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: this.config.timeout,
        cwd: this.config.workingDirectory,
        env: { ...process.env }
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn(`⚠️ TaskMaster: CLI warnings: ${stderr}`);
      }

      console.log(`✅ TaskMaster: PRD parsed successfully`);
      
    } catch (error) {
      // Check if it's a timeout error
      if (error.signal === 'SIGTERM') {
        throw new Error(`TaskMaster CLI timed out after ${this.config.timeout}ms`);
      }
      
      // Check if command not found
      if (error.code === 'ENOENT') {
        throw new Error('TaskMaster CLI not found. Please ensure task-master is installed.');
      }

      throw new Error(`TaskMaster CLI failed: ${error.message}`);
    }
  }

  /**
   * Read generated tasks from TaskMaster
   */
  private async readGeneratedTasks(): Promise<any[]> {
    const tasksPath = path.join(this.config.workingDirectory, '.taskmaster', 'tasks', 'tasks.json');
    
    try {
      const tasksContent = await fs.readFile(tasksPath, 'utf8');
      const tasksData = JSON.parse(tasksContent);
      
      // Validate structure
      const validated = TaskMasterResponseSchema.parse(tasksData);
      
      return validated.master.tasks;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('TaskMaster tasks file not found. CLI may have failed silently.');
      }
      
      if (error instanceof SyntaxError) {
        throw new Error('TaskMaster generated invalid JSON.');
      }
      
      throw new Error(`Failed to read TaskMaster tasks: ${error.message}`);
    }
  }

  /**
   * Format TaskMaster tasks into UEP result format
   */
  private formatTaskMasterResult(tasks: any[], originalTask: string): TaskMasterResult {
    const subtasks = tasks.map(task => ({
      id: String(task.id),
      title: task.title || 'Untitled Task',
      description: task.description || task.details || 'No description provided',
      dependencies: (task.dependencies || []).map(dep => String(dep))
    }));

    // Estimate timeline based on task count and complexity
    const complexity = subtasks.length > 10 ? 10 : subtasks.length > 5 ? 7 : subtasks.length > 2 ? 5 : 3;
    const timelineEstimate = this.estimateTimeline(subtasks.length, complexity);

    return {
      subtasks,
      timeline: timelineEstimate,
      complexity
    };
  }

  /**
   * Create fallback result when TaskMaster fails
   */
  private createFallbackResult(taskDescription: string, errorMessage: string): TaskMasterResult {
    console.log(`🔄 TaskMaster: Creating fallback breakdown for failed task`);

    // Simple heuristic-based breakdown
    const subtasks = this.createSimpleBreakdown(taskDescription);

    return {
      subtasks,
      timeline: this.estimateTimeline(subtasks.length, 5),
      complexity: 5 // Medium complexity as fallback
    };
  }

  /**
   * Create simple task breakdown using heuristics
   */
  private createSimpleBreakdown(taskDescription: string): Array<{
    id: string;
    title: string;
    description: string;
    dependencies: string[];
  }> {
    const description = taskDescription.toLowerCase();
    
    // Basic patterns for common task types
    if (description.includes('implement') || description.includes('build') || description.includes('create')) {
      return [
        {
          id: '1',
          title: 'Plan and Design',
          description: `Plan the implementation approach for: ${taskDescription}`,
          dependencies: []
        },
        {
          id: '2',
          title: 'Core Implementation',
          description: `Implement the core functionality for: ${taskDescription}`,
          dependencies: ['1']
        },
        {
          id: '3',
          title: 'Testing and Validation',
          description: `Test and validate the implementation`,
          dependencies: ['2']
        }
      ];
    }

    if (description.includes('fix') || description.includes('debug') || description.includes('resolve')) {
      return [
        {
          id: '1',
          title: 'Investigate Issue',
          description: `Investigate and identify the root cause of the issue`,
          dependencies: []
        },
        {
          id: '2',
          title: 'Implement Fix',
          description: `Implement the fix for: ${taskDescription}`,
          dependencies: ['1']
        },
        {
          id: '3',
          title: 'Verify Fix',
          description: `Test and verify the fix works correctly`,
          dependencies: ['2']
        }
      ];
    }

    // Default generic breakdown
    return [
      {
        id: '1',
        title: 'Analyze Requirements',
        description: `Analyze requirements for: ${taskDescription}`,
        dependencies: []
      },
      {
        id: '2',
        title: 'Execute Task',
        description: `Execute the main task: ${taskDescription}`,
        dependencies: ['1']
      }
    ];
  }

  /**
   * Estimate task complexity
   */
  private estimateComplexity(taskDescription: string): string {
    const description = taskDescription.toLowerCase();
    
    const highIndicators = ['system', 'architecture', 'integration', 'migration', 'complex', 'multiple'];
    const mediumIndicators = ['implement', 'build', 'create', 'update', 'modify'];
    const lowIndicators = ['fix', 'read', 'check', 'view', 'simple'];

    if (highIndicators.some(indicator => description.includes(indicator))) {
      return 'High complexity - requires significant planning and multiple components';
    }
    
    if (mediumIndicators.some(indicator => description.includes(indicator))) {
      return 'Medium complexity - standard implementation task';
    }
    
    return 'Low complexity - straightforward task';
  }

  /**
   * Estimate timeline based on subtask count and complexity
   */
  private estimateTimeline(subtaskCount: number, complexity: number): string {
    const baseHours = subtaskCount * (complexity / 5) * 2; // 2 hours per subtask at medium complexity
    
    if (baseHours <= 2) return 'Few hours';
    if (baseHours <= 8) return '1 day';
    if (baseHours <= 16) return '2 days';
    if (baseHours <= 40) return '1 week';
    return 'Multiple weeks';
  }

  /**
   * Cache management
   */
  private getCachedResult(taskDescription: string, context?: any): TaskMasterResult | null {
    const cacheKey = this.generateCacheKey(taskDescription, context);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if cache entry is expired
    const age = Date.now() - entry.timestamp.getTime();
    if (age > this.config.cacheTimeout) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }

  private cacheResult(taskDescription: string, result: TaskMasterResult, context?: any): void {
    const cacheKey = this.generateCacheKey(taskDescription, context);
    
    // Clean up old entries if cache is full
    if (this.cache.size >= this.config.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(cacheKey, {
      taskDescription,
      result,
      timestamp: new Date(),
      context
    });
  }

  private generateCacheKey(taskDescription: string, context?: any): string {
    const contextHash = context ? JSON.stringify(context) : '';
    return `${taskDescription}:${contextHash}`.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`🧹 TaskMaster: Cleaned up temp file ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ TaskMaster: Failed to cleanup temp file: ${error.message}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 TaskMaster: Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry?: Date;
  } {
    const entries = Array.from(this.cache.values());
    const oldestEntry = entries.length > 0 
      ? new Date(Math.min(...entries.map(e => e.timestamp.getTime())))
      : undefined;

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheEntries,
      hitRate: 0, // Would track in production
      oldestEntry
    };
  }
}

// Configuration interface
export interface TaskMasterConfig {
  cliCommand: string;
  timeout: number;
  maxCacheEntries: number;
  cacheTimeout: number;
  enableCaching: boolean;
  enableResearch: boolean;
  workingDirectory: string;
}

// Factory function
export function createTaskMasterAdapter(config?: Partial<TaskMasterConfig>): TaskMasterAdapter {
  return new TaskMasterAdapter(config);
}

// Export for use in ProtocolProcessor
export { TaskMasterAdapter as default };