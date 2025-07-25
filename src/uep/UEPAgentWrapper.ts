/**
 * Universal Execution Protocol - Agent Wrapper
 * 
 * Wraps existing meta-agents to use UEP standardized execution pipeline.
 * Provides backward compatibility while enforcing UEP compliance.
 * 
 * Following ADD methodology: Zero hardcoded limitations, All-Purpose Pattern compliance
 */

import { ProtocolProcessor, UniversalExecutionRequest, createProtocolProcessor } from './ProtocolProcessor';
import { ValidationEngine, createValidationEngine } from './ValidationEngine';
import { TaskMasterAdapter, createTaskMasterAdapter } from './TaskMasterAdapter';
import { Context7ScannerAdapter, createContext7ScannerAdapter } from './Context7ScannerAdapter';
import { RAGAdapter, createRAGAdapter } from './RAGAdapter';

// Agent wrapper configuration
export interface UEPAgentWrapperConfig {
  enableUEP: boolean;
  enableValidation: boolean;
  enableMemoryIntegration: boolean;
  enableCaching: boolean;
  enableDebugMode: boolean;
  timeout: number;
  agentType: string;
  workingDirectory: string;
  logLevel: 'silent' | 'minimal' | 'verbose' | 'debug';
}

// Wrapped agent interface
export interface WrappedAgent {
  originalAgent: any;
  agentId: string;
  agentType: string;
  isUEPEnabled: boolean;
  process: (input: any, options?: any) => Promise<any>;
  initialize?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  getStatus: () => any;
}

// Agent execution result
export interface AgentExecutionResult {
  success: boolean;
  result: any;
  processingTime: number;
  uepMetadata?: {
    validationResults: any[];
    contextEnhancements: any;
    memoryUsage: boolean;
    complianceScore: number;
  };
  originalResult: any;
  agentId: string;
  timestamp: string;
}

/**
 * UEP Agent Wrapper Implementation
 */
export class UEPAgentWrapper {
  private config: UEPAgentWrapperConfig;
  private protocolProcessor: ProtocolProcessor;
  private wrappedAgents: Map<string, WrappedAgent> = new Map();

  constructor(config: Partial<UEPAgentWrapperConfig> = {}) {
    this.config = {
      enableUEP: true,
      enableValidation: true,
      enableMemoryIntegration: true,
      enableCaching: true,
      enableDebugMode: false,
      timeout: 60000,
      agentType: 'meta-agent',
      workingDirectory: process.cwd(),
      logLevel: 'minimal',
      ...config
    };

    this.initializeUEP();
  }

  /**
   * Initialize UEP Protocol Processor
   */
  private initializeUEP(): void {
    if (!this.config.enableUEP) {
      return; // Skip UEP initialization if disabled
    }

    const adapters = {
      taskMaster: createTaskMasterAdapter({
        enableCaching: this.config.enableCaching,
        timeout: this.config.timeout
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

    if (this.config.logLevel === 'debug') {
      console.log('🧠 UEP Agent Wrapper initialized with Protocol Processor');
    }
  }

  /**
   * Wrap an existing agent with UEP middleware
   */
  async wrapAgent(agent: any, agentId: string, agentType?: string): Promise<WrappedAgent> {
    if (!agent) {
      throw new Error('Agent cannot be null or undefined');
    }

    if (this.wrappedAgents.has(agentId)) {
      if (this.config.logLevel !== 'silent') {
        console.warn(`⚠️ Agent ${agentId} is already wrapped. Returning existing wrapper.`);
      }
      return this.wrappedAgents.get(agentId)!;
    }

    // Validate agent interface
    this.validateAgentInterface(agent, agentId);

    // Create wrapped agent
    const wrappedAgent: WrappedAgent = {
      originalAgent: agent,
      agentId,
      agentType: agentType || this.config.agentType,
      isUEPEnabled: this.config.enableUEP,
      
      // Wrap the process method with UEP middleware
      process: async (input: any, options: any = {}) => {
        return await this.processWithUEP(agent, agentId, input, options);
      },

      // Preserve original methods if they exist
      initialize: agent.initialize ? agent.initialize.bind(agent) : undefined,
      cleanup: agent.cleanup ? agent.cleanup.bind(agent) : undefined,
      
      // Enhanced status method
      getStatus: () => {
        const originalStatus = agent.getStatus ? agent.getStatus() : { initialized: true };
        return {
          ...originalStatus,
          uep: {
            enabled: this.config.enableUEP,
            agentId,
            agentType: agentType || this.config.agentType,
            wrapperVersion: '1.0.0'
          }
        };
      }
    };

    // Store wrapped agent
    this.wrappedAgents.set(agentId, wrappedAgent);

    if (this.config.logLevel === 'verbose' || this.config.logLevel === 'debug') {
      console.log(`✅ Agent ${agentId} wrapped with UEP (Type: ${wrappedAgent.agentType})`);
    }

    return wrappedAgent;
  }

  /**
   * Process agent task through UEP middleware
   */
  private async processWithUEP(
    agent: any, 
    agentId: string, 
    input: any, 
    options: any = {}
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // If UEP is disabled, execute agent directly
      if (!this.config.enableUEP) {
        const result = await this.executeAgentDirect(agent, input, options);
        return {
          success: true,
          result,
          processingTime: Date.now() - startTime,
          originalResult: result,
          agentId,
          timestamp: new Date().toISOString()
        };
      }

      // Create UEP request
      const uepRequest: UniversalExecutionRequest = {
        taskDescription: this.extractTaskDescription(input, options),
        requesterType: 'agent',
        sessionId: options.sessionId || `agent-${agentId}-${Date.now()}`,
        context: {
          agentId,
          agentType: this.wrappedAgents.get(agentId)?.agentType || 'unknown',
          input,
          options,
          workingDirectory: this.config.workingDirectory
        },
        overrides: {
          debugMode: this.config.enableDebugMode
        }
      };

      if (this.config.logLevel === 'debug') {
        console.log(`🔄 Processing ${agentId} through UEP middleware`);
      }

      // Process through UEP Protocol Processor
      const uepResult = await this.protocolProcessor.processTask(uepRequest);

      // Execute agent with enhanced context
      const agentResult = await this.executeAgentWithContext(agent, input, options, uepResult);

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(uepResult);

      const executionResult: AgentExecutionResult = {
        success: true,
        result: agentResult,
        processingTime: Date.now() - startTime,
        uepMetadata: {
          validationResults: uepResult.validationResults || [],
          contextEnhancements: uepResult.context,
          memoryUsage: !!uepResult.context.memory,
          complianceScore
        },
        originalResult: agentResult,
        agentId,
        timestamp: new Date().toISOString()
      };

      if (this.config.logLevel === 'verbose' || this.config.logLevel === 'debug') {
        console.log(`✅ ${agentId} completed via UEP (${executionResult.processingTime}ms, Score: ${complianceScore.toFixed(2)})`);
      }

      return executionResult;

    } catch (error) {
      const executionResult: AgentExecutionResult = {
        success: false,
        result: { error: error.message },
        processingTime: Date.now() - startTime,
        originalResult: null,
        agentId,
        timestamp: new Date().toISOString()
      };

      if (this.config.logLevel !== 'silent') {
        console.error(`❌ ${agentId} execution failed: ${error.message}`);
      }

      return executionResult;
    }
  }

  /**
   * Execute agent directly (bypass UEP)
   */
  private async executeAgentDirect(agent: any, input: any, options: any): Promise<any> {
    if (typeof agent.process === 'function') {
      return await agent.process(input, options);
    } else if (typeof agent._processCore === 'function') {
      return await agent._processCore(input);
    } else if (typeof agent === 'function') {
      return await agent(input, options);
    } else {
      throw new Error('Agent does not have a recognizable process method');
    }
  }

  /**
   * Execute agent with enhanced UEP context
   */
  private async executeAgentWithContext(
    agent: any, 
    input: any, 
    options: any, 
    uepResult: any
  ): Promise<any> {
    // Enhance options with UEP context
    const enhancedOptions = {
      ...options,
      uepContext: {
        memory: uepResult.context.memory,
        codebaseContext: uepResult.context.codebase,
        documentation: uepResult.context.documentation,
        taskBreakdown: uepResult.context.taskBreakdown,
        validationResults: uepResult.validationResults
      }
    };

    // Execute agent with enhanced context
    return await this.executeAgentDirect(agent, input, enhancedOptions);
  }

  /**
   * Validate agent interface
   */
  private validateAgentInterface(agent: any, agentId: string): void {
    if (!agent) {
      throw new Error(`Agent ${agentId} is null or undefined`);
    }

    // Check for recognizable process methods
    const hasProcessMethod = typeof agent.process === 'function';
    const hasProcessCoreMethod = typeof agent._processCore === 'function';
    const isFunction = typeof agent === 'function';

    if (!hasProcessMethod && !hasProcessCoreMethod && !isFunction) {
      throw new Error(`Agent ${agentId} does not have a recognizable process method (process, _processCore, or function)`);
    }

    if (this.config.logLevel === 'debug') {
      console.log(`🔍 Agent ${agentId} interface validated (process: ${hasProcessMethod}, _processCore: ${hasProcessCoreMethod}, function: ${isFunction})`);
    }
  }

  /**
   * Extract task description from input
   */
  private extractTaskDescription(input: any, options: any): string {
    // Try to extract meaningful task description
    if (typeof input === 'string') {
      return input.substring(0, 200);
    }
    
    if (input && typeof input === 'object') {
      if (input.taskDescription) return input.taskDescription;
      if (input.description) return input.description;
      if (input.task) return input.task;
      if (input.prompt) return input.prompt;
      if (input.agentName) return `Process task for agent: ${input.agentName}`;
    }

    if (options && options.taskDescription) {
      return options.taskDescription;
    }

    return 'Meta-agent task execution';
  }

  /**
   * Calculate compliance score based on UEP result
   */
  private calculateComplianceScore(uepResult: any): number {
    let score = 0;
    let maxScore = 0;

    // Memory integration
    maxScore += 0.2;
    if (uepResult.context.memory) score += 0.2;

    // Codebase awareness
    maxScore += 0.25;
    if (uepResult.context.codebase) score += 0.25;

    // Documentation integration
    maxScore += 0.2;
    if (uepResult.context.documentation) score += 0.2;

    // Task breakdown
    maxScore += 0.15;
    if (uepResult.context.taskBreakdown) score += 0.15;

    // Validation compliance
    maxScore += 0.2;
    if (uepResult.validationResults && uepResult.validationResults.length > 0) {
      const passedValidations = uepResult.validationResults.filter(v => v.result === 'pass').length;
      const totalValidations = uepResult.validationResults.length;
      score += 0.2 * (passedValidations / totalValidations);
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Unwrap an agent (remove UEP middleware)
   */
  unwrapAgent(agentId: string): any {
    const wrappedAgent = this.wrappedAgents.get(agentId);
    if (!wrappedAgent) {
      throw new Error(`Agent ${agentId} is not wrapped`);
    }

    this.wrappedAgents.delete(agentId);
    
    if (this.config.logLevel === 'verbose' || this.config.logLevel === 'debug') {
      console.log(`🔓 Agent ${agentId} unwrapped from UEP`);
    }

    return wrappedAgent.originalAgent;
  }

  /**
   * Get all wrapped agents
   */
  getWrappedAgents(): Map<string, WrappedAgent> {
    return new Map(this.wrappedAgents);
  }

  /**
   * Get wrapper statistics
   */
  getStatistics(): any {
    const agents = Array.from(this.wrappedAgents.values());
    
    return {
      totalWrappedAgents: agents.length,
      agentTypes: [...new Set(agents.map(a => a.agentType))],
      uepEnabled: this.config.enableUEP,
      configuration: {
        validation: this.config.enableValidation,
        memoryIntegration: this.config.enableMemoryIntegration,
        caching: this.config.enableCaching,
        debugMode: this.config.enableDebugMode
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update wrapper configuration
   */
  updateConfig(newConfig: Partial<UEPAgentWrapperConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize UEP if enabled status changed
    if (newConfig.enableUEP !== undefined) {
      this.initializeUEP();
    }

    if (this.config.logLevel === 'verbose' || this.config.logLevel === 'debug') {
      console.log('⚙️ UEP Agent Wrapper configuration updated');
    }
  }
}

/**
 * Factory function for creating UEP Agent Wrapper
 */
export function createUEPAgentWrapper(config: Partial<UEPAgentWrapperConfig> = {}): UEPAgentWrapper {
  return new UEPAgentWrapper(config);
}

// Export types and wrapper
export { UEPAgentWrapper as default };