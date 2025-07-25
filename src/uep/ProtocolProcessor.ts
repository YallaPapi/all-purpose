/**
 * Universal Execution Protocol - Core Protocol Processor
 * 
 * Central enforcement engine that orchestrates the UEP flow for all agent and human tasks.
 * Implements middleware pattern with dependency injection for extensibility.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import { appendToMemory, getMemory } from '../memory/workingMemory';
import { UEPMemoryManager, UEPMemoryEntry, MemoryQuery } from './MemoryManager';

// Core interfaces and types
export interface UniversalExecutionRequest {
  taskDescription: string;
  requesterType: 'agent' | 'human';
  agentId?: string;
  sessionId?: string;
  context?: Record<string, any>;
  overrides?: {
    skipTaskMaster?: boolean;
    skipContext7?: boolean;
    skipMemory?: boolean;
    skipRAG?: boolean;
    debugMode?: boolean;
  };
}

export interface ExecutionProtocolResult {
  approved: boolean;
  enhancedTask: string;
  context: {
    memory: string;
    codebase?: CodebaseContext;
    documentation?: DocumentationResult[];
    taskBreakdown?: TaskMasterResult;
  };
  executionTrace: ExecutionStep[];
  validationResults: ValidationResult[];
  processingTime: number;
}

export interface CodebaseContext {
  relevantFiles: string[];
  functions: string[];
  snippets: string[];
  collisionRisks: string[];
  dependencies: string[];
}

export interface DocumentationResult {
  content: string;
  source: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}

export interface TaskMasterResult {
  subtasks: Array<{
    id: string;
    title: string;
    description: string;
    dependencies: string[];
  }>;
  timeline: string;
  complexity: number;
}

export interface ValidationResult {
  component: 'TaskMaster' | 'Context7' | 'Memory' | 'RAG' | 'Protocol';
  required: boolean;
  present: boolean;
  fallbackUsed?: string;
  result: 'success' | 'warning' | 'error' | 'blocked';
  message: string;
}

export interface ExecutionStep {
  timestamp: Date;
  component: string;
  action: string;
  result: 'success' | 'warning' | 'error';
  details: string;
  duration?: number;
}

// Adapter interfaces
export interface TaskMasterAdapter {
  processTask(taskDescription: string, context?: any): Promise<TaskMasterResult>;
}

export interface Context7Adapter {
  scanCodebase(taskDescription: string): Promise<CodebaseContext>;
}

export interface RAGAdapter {
  searchDocumentation(query: string, context?: any): Promise<DocumentationResult[]>;
}

export interface ValidationEngine {
  validateExecution(request: UniversalExecutionRequest, results: any): Promise<ValidationResult[]>;
}

// Request validation schema
const ExecutionRequestSchema = z.object({
  taskDescription: z.string().min(1, "Task description is required"),
  requesterType: z.enum(['agent', 'human']),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  context: z.record(z.any()).optional(),
  overrides: z.object({
    skipTaskMaster: z.boolean().optional(),
    skipContext7: z.boolean().optional(),
    skipMemory: z.boolean().optional(),
    skipRAG: z.boolean().optional(),
    debugMode: z.boolean().optional(),
  }).optional()
});

/**
 * Universal Execution Protocol Processor
 * 
 * Main orchestration engine that enforces protocol compliance and context enrichment
 */
export class ProtocolProcessor extends EventEmitter {
  private taskMasterAdapter: TaskMasterAdapter;
  private context7Adapter: Context7Adapter;
  private ragAdapter: RAGAdapter;
  private validationEngine: ValidationEngine;
  private memoryManager: UEPMemoryManager;
  private config: UEPConfig;

  constructor(
    adapters: {
      taskMaster: TaskMasterAdapter;
      context7: Context7Adapter;
      rag: RAGAdapter;
      validation: ValidationEngine;
    },
    config: Partial<UEPConfig> = {}
  ) {
    super();
    
    this.taskMasterAdapter = adapters.taskMaster;
    this.context7Adapter = adapters.context7;
    this.ragAdapter = adapters.rag;
    this.validationEngine = adapters.validation;
    this.memoryManager = new UEPMemoryManager({
      enableRelevanceScoring: true,
      enableSecureAccess: true,
      maxEntries: config.maxMemoryEntries || 100
    });
    
    this.config = {
      maxProcessingTime: 30000, // 30 seconds
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      enableAuditLogging: true,
      enforceCompliance: true,
      maxMemoryEntries: 100,
      ...config
    };

    this.setupEventHandlers();
  }

  /**
   * Main entry point for processing any task through UEP
   */
  async processTask(request: UniversalExecutionRequest): Promise<ExecutionProtocolResult> {
    const startTime = Date.now();
    const executionTrace: ExecutionStep[] = [];
    
    try {
      // Validate input
      this.addTrace(executionTrace, 'Validation', 'Input validation', 'success', 'Request validated');
      const validatedRequest = ExecutionRequestSchema.parse(request) as UniversalExecutionRequest;
      
      // Generate session ID if not provided
      const sessionId = validatedRequest.sessionId || this.generateSessionId();
      
      // Ensure we have a complete request object
      const completeRequest: UniversalExecutionRequest = {
        ...validatedRequest,
        sessionId
      };
      
      this.emit('processing:started', {
        sessionId,
        taskDescription: completeRequest.taskDescription,
        requesterType: completeRequest.requesterType
      });

      // Step 1: Retrieve working memory
      const memory = await this.retrieveMemory(completeRequest, executionTrace);
      
      // Step 2: Execute component pipeline
      const componentResults = await this.executeComponentPipeline(completeRequest, executionTrace);
      
      // Step 3: Validate compliance
      const validationResults = await this.validateCompliance(completeRequest, componentResults, executionTrace);
      
      // Step 4: Determine approval
      const approved = this.determineApproval(validationResults);
      
      // Step 5: Enhance task with context
      const enhancedTask = this.enhanceTask(completeRequest, componentResults, memory);
      
      // Step 6: Store execution result in memory
      if (approved) {
        await this.storeExecutionResult(completeRequest, componentResults, executionTrace);
      }

      const processingTime = Date.now() - startTime;
      
      const result: ExecutionProtocolResult = {
        approved,
        enhancedTask,
        context: {
          memory,
          codebase: componentResults.codebase,
          documentation: componentResults.documentation,
          taskBreakdown: componentResults.taskBreakdown
        },
        executionTrace,
        validationResults,
        processingTime
      };

      this.emit('processing:completed', {
        sessionId,
        approved,
        processingTime,
        componentsExecuted: Object.keys(componentResults).length
      });

      // Audit logging
      if (this.config.enableAuditLogging) {
        await this.logAuditEntry(validatedRequest, result);
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.addTrace(executionTrace, 'Error', 'Processing failed', 'error', error.message);
      
      this.emit('processing:failed', {
        sessionId: request.sessionId,
        error: error.message,
        processingTime
      });

      throw new Error(`UEP processing failed: ${error.message}`);
    }
  }

  /**
   * Retrieve enhanced working memory for context
   */
  private async retrieveMemory(request: UniversalExecutionRequest, trace: ExecutionStep[]): Promise<string> {
    if (request.overrides?.skipMemory) {
      this.addTrace(trace, 'Memory', 'Memory retrieval skipped', 'warning', 'Skipped by override');
      return '';
    }

    try {
      const agentId = request.agentId || 'human-user';
      
      // First try enhanced UEP memory with relevance scoring
      const memoryQuery: MemoryQuery = {
        agentId,
        taskKeywords: this.extractKeywords(request.taskDescription),
        minRelevanceScore: 0.2,
        limit: 10
      };
      
      const uepMemoryResult = await this.memoryManager.getRelevantMemory(memoryQuery);
      
      if (uepMemoryResult.memories.length > 0) {
        // Format UEP memories for context
        const formattedMemory = uepMemoryResult.memories.map(memory => 
          `[${memory.timestamp.toISOString()}] ${memory.taskDescription} (${memory.context.complexity}, ${memory.context.approved ? 'approved' : 'rejected'})`
        ).join('\n\n');
        
        this.addTrace(trace, 'Memory', 'Enhanced memory retrieval', 'success', 
          `Retrieved ${uepMemoryResult.memories.length} relevant memory entries (avg relevance: ${uepMemoryResult.relevanceStats.averageScore.toFixed(2)})`);
        
        return formattedMemory;
      }
      
      // Fallback to basic memory system
      const basicMemory = await getMemory(agentId);
      
      this.addTrace(trace, 'Memory', 'Basic memory retrieval', 'success', 
        `Retrieved ${basicMemory.split('\n\n').filter(e => e.trim()).length} basic memory entries`);
      
      return basicMemory;
      
    } catch (error) {
      this.addTrace(trace, 'Memory', 'Memory retrieval failed', 'warning', error.message);
      return ''; // Graceful degradation
    }
  }

  /**
   * Execute all component adapters in parallel
   */
  private async executeComponentPipeline(
    request: UniversalExecutionRequest, 
    trace: ExecutionStep[]
  ): Promise<{
    taskBreakdown?: TaskMasterResult;
    codebase?: CodebaseContext;
    documentation?: DocumentationResult[];
  }> {
    const results: any = {};
    const promises: Promise<void>[] = [];

    // TaskMaster breakdown
    if (!request.overrides?.skipTaskMaster) {
      promises.push(
        this.taskMasterAdapter.processTask(request.taskDescription, request.context)
          .then(result => {
            results.taskBreakdown = result;
            this.addTrace(trace, 'TaskMaster', 'Task breakdown', 'success', 
              `Generated ${result.subtasks.length} subtasks`);
          })
          .catch(error => {
            this.addTrace(trace, 'TaskMaster', 'Task breakdown failed', 'warning', error.message);
          })
      );
    }

    // Context7 codebase scan
    if (!request.overrides?.skipContext7) {
      promises.push(
        this.context7Adapter.scanCodebase(request.taskDescription)
          .then(result => {
            results.codebase = result;
            this.addTrace(trace, 'Context7', 'Codebase scan', 'success', 
              `Found ${result.relevantFiles.length} relevant files`);
          })
          .catch(error => {
            this.addTrace(trace, 'Context7', 'Codebase scan failed', 'warning', error.message);
          })
      );
    }

    // RAG documentation search
    if (!request.overrides?.skipRAG) {
      promises.push(
        this.ragAdapter.searchDocumentation(request.taskDescription, request.context)
          .then(result => {
            results.documentation = result;
            this.addTrace(trace, 'RAG', 'Documentation search', 'success', 
              `Found ${result.length} relevant documents`);
          })
          .catch(error => {
            this.addTrace(trace, 'RAG', 'Documentation search failed', 'warning', error.message);
          })
      );
    }

    // Execute all components in parallel with timeout
    await Promise.race([
      Promise.allSettled(promises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Component pipeline timeout')), this.config.maxProcessingTime)
      )
    ]);

    return results;
  }

  /**
   * Validate execution compliance against protocol requirements
   */
  private async validateCompliance(
    request: UniversalExecutionRequest,
    results: any,
    trace: ExecutionStep[]
  ): Promise<ValidationResult[]> {
    try {
      const validationResults = await this.validationEngine.validateExecution(request, results);
      
      this.addTrace(trace, 'Validation', 'Compliance check', 'success', 
        `Validated ${validationResults.length} components`);
      
      return validationResults;
    } catch (error) {
      this.addTrace(trace, 'Validation', 'Compliance check failed', 'error', error.message);
      throw error;
    }
  }

  /**
   * Determine if task execution should be approved based on validation results
   */
  private determineApproval(validationResults: ValidationResult[]): boolean {
    if (!this.config.enforceCompliance) {
      return true; // Debug mode or testing
    }

    // Check for any blocking errors
    const blockingErrors = validationResults.filter(v => v.result === 'blocked' || v.result === 'error');
    
    if (blockingErrors.length > 0) {
      console.warn('🚫 UEP: Task blocked due to validation failures:', 
        blockingErrors.map(e => e.message).join(', '));
      return false;
    }

    // Check required components
    const requiredComponents = validationResults.filter(v => v.required && !v.present);
    
    if (requiredComponents.length > 0) {
      console.warn('⚠️ UEP: Missing required components:', 
        requiredComponents.map(c => c.component).join(', '));
      return false;
    }

    return true;
  }

  /**
   * Enhance original task with retrieved context
   */
  private enhanceTask(
    request: UniversalExecutionRequest,
    results: any,
    memory: string
  ): string {
    let enhancedTask = `ENHANCED TASK: ${request.taskDescription}\n\n`;
    
    // Add memory context
    if (memory) {
      enhancedTask += `WORKING MEMORY CONTEXT:\n${memory}\n\n`;
    }
    
    // Add codebase context
    if (results.codebase) {
      enhancedTask += `CODEBASE CONTEXT:\n`;
      enhancedTask += `Relevant files: ${results.codebase.relevantFiles.join(', ')}\n`;
      enhancedTask += `Functions: ${results.codebase.functions.join(', ')}\n`;
      if (results.codebase.collisionRisks.length > 0) {
        enhancedTask += `⚠️ Collision risks: ${results.codebase.collisionRisks.join(', ')}\n`;
      }
      enhancedTask += '\n';
    }
    
    // Add documentation context
    if (results.documentation && results.documentation.length > 0) {
      enhancedTask += `DOCUMENTATION CONTEXT:\n`;
      results.documentation.forEach(doc => {
        enhancedTask += `- ${doc.source}: ${doc.content.substring(0, 200)}...\n`;
      });
      enhancedTask += '\n';
    }
    
    // Add task breakdown
    if (results.taskBreakdown) {
      enhancedTask += `TASK BREAKDOWN:\n`;
      results.taskBreakdown.subtasks.forEach(subtask => {
        enhancedTask += `${subtask.id}. ${subtask.title}\n   ${subtask.description}\n`;
      });
      enhancedTask += '\n';
    }
    
    enhancedTask += `ORIGINAL TASK: ${request.taskDescription}`;
    
    return enhancedTask;
  }

  /**
   * Store execution result in enhanced UEP memory
   */
  private async storeExecutionResult(
    request: UniversalExecutionRequest,
    results: any,
    trace: ExecutionStep[]
  ): Promise<void> {
    try {
      const agentId = request.agentId || 'human-user';
      const sessionId = request.sessionId || this.generateSessionId();
      
      // Create UEP memory entry
      const uepEntry: UEPMemoryEntry = {
        id: `${sessionId}-${Date.now()}`,
        timestamp: new Date(),
        agentId,
        sessionId,
        taskDescription: request.taskDescription,
        context: {
          requesterType: request.requesterType,
          complexity: this.determineTaskComplexity(request.taskDescription),
          components: Object.keys(results).filter(key => results[key]),
          approved: true
        },
        executionTrace: {
          processingTime: trace.reduce((total, step) => total + (step.duration || 0), 0),
          componentsExecuted: Object.keys(results).filter(key => results[key]),
          validationResults: [] // Would be populated from actual validation
        },
        tags: this.extractKeywords(request.taskDescription)
      };
      
      // Store in enhanced UEP memory
      await this.memoryManager.storeExecutionResult(uepEntry);
      
      this.addTrace(trace, 'Memory', 'Store enhanced execution result', 'success', 
        `UEP memory entry stored with ${uepEntry.context.components.length} components`);
        
    } catch (error) {
      // Fallback to basic memory storage
      try {
        const agentId = request.agentId || 'human-user';
        const executionSummary = `TASK: ${request.taskDescription}\nCOMPONENTS: ${Object.keys(results).join(', ')}\nSTATUS: Approved`;
        await appendToMemory(agentId, executionSummary);
        
        this.addTrace(trace, 'Memory', 'Store execution result (fallback)', 'warning', 
          `Stored in basic memory due to UEP error: ${error.message}`);
      } catch (fallbackError) {
        this.addTrace(trace, 'Memory', 'Store execution result failed', 'warning', fallbackError.message);
      }
    }
  }

  /**
   * Add execution step to trace
   */
  private addTrace(
    trace: ExecutionStep[], 
    component: string, 
    action: string, 
    result: 'success' | 'warning' | 'error', 
    details: string
  ): void {
    trace.push({
      timestamp: new Date(),
      component,
      action,
      result,
      details
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `uep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set up event handlers for monitoring
   */
  private setupEventHandlers(): void {
    this.on('processing:started', (data) => {
      console.log(`🚀 UEP: Processing started - ${data.taskDescription.substring(0, 50)}...`);
    });

    this.on('processing:completed', (data) => {
      console.log(`✅ UEP: Processing completed - ${data.approved ? 'APPROVED' : 'REJECTED'} (${data.processingTime}ms)`);
    });

    this.on('processing:failed', (data) => {
      console.error(`❌ UEP: Processing failed - ${data.error} (${data.processingTime}ms)`);
    });
  }

  /**
   * Log audit entry for compliance
   */
  private async logAuditEntry(request: UniversalExecutionRequest, result: ExecutionProtocolResult): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      sessionId: request.sessionId,
      requesterType: request.requesterType,
      agentId: request.agentId,
      taskDescription: request.taskDescription,
      approved: result.approved,
      processingTime: result.processingTime,
      validationResults: result.validationResults,
      componentsExecuted: Object.keys(result.context).filter(k => result.context[k]).length
    };

    // Store audit log (could be extended to external logging service)
    console.log('📋 UEP Audit:', JSON.stringify(auditEntry, null, 2));
  }

  /**
   * Extract keywords from task description for memory relevance scoring
   */
  private extractKeywords(taskDescription: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = taskDescription.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Remove common stop words
    const stopWords = ['this', 'that', 'with', 'from', 'they', 'them', 'will', 'have', 'been', 'were', 'said', 'what', 'when', 'where', 'would', 'could', 'should'];
    const keywords = words.filter(word => !stopWords.includes(word));
    
    // Return unique keywords
    return [...new Set(keywords)].slice(0, 10); // Limit to 10 keywords
  }

  /**
   * Determine task complexity based on description
   */
  private determineTaskComplexity(taskDescription: string): 'low' | 'medium' | 'high' {
    const description = taskDescription.toLowerCase();
    
    const highComplexityIndicators = [
      'implement', 'build', 'create system', 'architecture', 'database',
      'integration', 'migration', 'refactor', 'multiple files', 'complex',
      'framework', 'api', 'authentication', 'security', 'performance'
    ];
    
    const mediumComplexityIndicators = [
      'update', 'modify', 'enhance', 'add feature', 'fix bug', 'configure',
      'test', 'document', 'review', 'optimize', 'single file'
    ];
    
    if (highComplexityIndicators.some(indicator => description.includes(indicator))) {
      return 'high';
    }
    
    if (mediumComplexityIndicators.some(indicator => description.includes(indicator))) {
      return 'medium';
    }
    
    return 'low';
  }
}

// Configuration interface
export interface UEPConfig {
  maxProcessingTime: number;
  enableCaching: boolean;
  cacheTimeout: number;
  enableAuditLogging: boolean;
  enforceCompliance: boolean;
  maxMemoryEntries: number;
}

// Factory function for creating configured processor
export function createProtocolProcessor(
  adapters: {
    taskMaster: TaskMasterAdapter;
    context7: Context7Adapter;
    rag: RAGAdapter;
    validation: ValidationEngine;
  },
  config?: Partial<UEPConfig>
): ProtocolProcessor {
  return new ProtocolProcessor(adapters, config);
}