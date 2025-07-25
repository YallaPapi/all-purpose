/**
 * UEP Enforcement Gateway
 * 
 * This is the MAIN ENTRY POINT for all UEP enforcement.
 * Acts as a gatekeeper that blocks execution until compliance is verified.
 * 
 * Injection Points (from codebase analysis):
 * 1. Factory Level: UEPMetaAgentFactory.createAgent() at lines 210-226
 * 2. Wrapper Level: UEPAgentWrapper.processWithUEP() at lines 218-222
 * 3. Validation Level: ValidationEngine.validateExecution() at lines 241-244
 * 
 * This gateway replaces the current validation system with enforcement middleware.
 */

import { 
  UEPEnforcementMiddleware, 
  EnforcementContext, 
  EnforcementResult, 
  UEPEnforcementError,
  getUEPEnforcementMiddleware 
} from './UEPEnforcementMiddleware';

import { 
  UniversalExecutionRequest, 
  UniversalExecutionResult,
  TaskMasterResult,
  CodebaseContext,
  DocumentationResult
} from './ProtocolProcessor';

/**
 * Gateway configuration for enforcement levels
 */
export interface UEPGatewayConfig {
  enableEnforcement: boolean;
  enforcementLevel: 'strict' | 'warn' | 'off';
  requiredTools: ('TaskMaster' | 'Context7' | 'RAG' | 'Redis')[];
  blockOnFailure: boolean;
  auditAllRequests: boolean;
  performanceMode: boolean;
}

/**
 * Enhanced execution request with enforcement metadata
 */
export interface EnforcedExecutionRequest extends UniversalExecutionRequest {
  enforcementConfig?: Partial<UEPGatewayConfig>;
  bypassToken?: string; // Emergency bypass (admin only)
}

/**
 * Enhanced execution result with enforcement data
 */
export interface EnforcedExecutionResult extends UniversalExecutionResult {
  enforcementResult: EnforcementResult;
  complianceScore: number;
  auditId: string;
  toolsValidated: string[];
}

/**
 * UEP Enforcement Gateway
 * 
 * This class acts as the main gatekeeper for all UEP operations.
 * It intercepts requests and enforces tool usage compliance BEFORE allowing execution.
 */
export class UEPEnforcementGateway {
  private readonly middleware: UEPEnforcementMiddleware;
  private readonly config: UEPGatewayConfig;
  
  constructor(config: Partial<UEPGatewayConfig> = {}) {
    this.middleware = getUEPEnforcementMiddleware();
    this.config = {
      enableEnforcement: true,
      enforcementLevel: 'strict',
      requiredTools: ['TaskMaster', 'Context7', 'RAG', 'Redis'],
      blockOnFailure: true,
      auditAllRequests: true,
      performanceMode: false,
      ...config
    };
    
    console.log('🔒 UEP Enforcement Gateway initialized:', {
      enabled: this.config.enableEnforcement,
      level: this.config.enforcementLevel,
      tools: this.config.requiredTools,
      blocking: this.config.blockOnFailure
    });
  }

  /**
   * MAIN ENFORCEMENT ENTRY POINT
   * 
   * This method MUST be called before any UEP execution begins.
   * It validates tool usage and blocks execution if requirements aren't met.
   */
  public async enforceAndExecute<T = any>(
    request: EnforcedExecutionRequest,
    executionFunction: () => Promise<T>
  ): Promise<T & { enforcementMetadata: EnforcementResult }> {
    
    // Check if enforcement is enabled
    if (!this.config.enableEnforcement) {
      console.log('⚠️ UEP Enforcement: Disabled - proceeding without validation');
      const result = await executionFunction();
      return this.addEnforcementMetadata(result, {
        approved: true,
        blocked: false,
        reason: 'Enforcement disabled',
        missingTools: [],
        validatedProofs: [],
        complianceScore: 1.0,
        auditId: `bypass-${Date.now()}`
      });
    }

    // Check for emergency bypass token (admin only)
    if (request.bypassToken && this.validateBypassToken(request.bypassToken)) {
      console.log('⚠️ UEP Enforcement: Emergency bypass used');
      const result = await executionFunction();
      return this.addEnforcementMetadata(result, {
        approved: true,
        blocked: false,
        reason: 'Emergency bypass used',
        missingTools: [],
        validatedProofs: [],
        complianceScore: 1.0,
        auditId: `emergency-bypass-${Date.now()}`
      });
    }

    // Create enforcement context
    const enforcementContext: EnforcementContext = {
      requestId: request.requestId || `req-${Date.now()}`,
      taskDescription: request.taskDescription,
      requesterType: request.requesterType,
      requiredTools: this.determineRequiredTools(request),
      enforcementLevel: request.enforcementConfig?.enforcementLevel || this.config.enforcementLevel,
      sessionId: request.metadata?.sessionId
    };

    console.log(`🔍 UEP Enforcement: Validating request ${enforcementContext.requestId}`);
    console.log(`   Task: "${enforcementContext.taskDescription.substring(0, 100)}..."`);
    console.log(`   Required Tools: ${enforcementContext.requiredTools.join(', ')}`);
    console.log(`   Enforcement Level: ${enforcementContext.enforcementLevel}`);

    try {
      // STEP 1: Enforce protocol compliance BEFORE execution
      const enforcementResult = await this.middleware.enforceProtocol(enforcementContext);
      
      // STEP 2: Check if execution should be blocked
      if (enforcementResult.blocked && this.config.blockOnFailure) {
        throw new UEPEnforcementError(
          `UEP Enforcement blocked execution: ${enforcementResult.reason}`,
          enforcementResult
        );
      }
      
      // STEP 3: Log enforcement decision
      this.logEnforcementDecision(enforcementResult);
      
      // STEP 4: If approved or warnings allowed, proceed with execution
      if (enforcementResult.approved || enforcementContext.enforcementLevel === 'warn') {
        console.log(`✅ UEP Enforcement: Proceeding with execution (Score: ${(enforcementResult.complianceScore * 100).toFixed(1)}%)`);
        
        const result = await executionFunction();
        return this.addEnforcementMetadata(result, enforcementResult);
      } else {
        throw new UEPEnforcementError(
          `UEP Enforcement: Execution not approved - ${enforcementResult.reason}`,
          enforcementResult
        );
      }
      
    } catch (error) {
      if (error instanceof UEPEnforcementError) {
        // Re-throw enforcement errors
        throw error;
      } else {
        // Wrap other errors with enforcement context
        throw new UEPEnforcementError(
          `UEP Enforcement: Execution failed - ${error.message}`,
          {
            approved: false,
            blocked: true,
            reason: `Execution error: ${error.message}`,
            missingTools: enforcementContext.requiredTools,
            validatedProofs: [],
            complianceScore: 0,
            auditId: `error-${Date.now()}`
          }
        );
      }
    }
  }

  /**
   * Validates that all required tools have been executed
   * This is called by the enforcement middleware to verify tool usage
   */
  public async validateToolExecution(
    request: EnforcedExecutionRequest,
    results: {
      taskBreakdown?: TaskMasterResult;
      codebase?: CodebaseContext;
      documentation?: DocumentationResult[];
      memory?: any;
    }
  ): Promise<string[]> {
    
    const validatedTools: string[] = [];
    const requiredTools = this.determineRequiredTools(request);
    
    // Check TaskMaster validation
    if (requiredTools.includes('TaskMaster')) {
      if (results.taskBreakdown && this.validateTaskMasterResult(results.taskBreakdown)) {
        validatedTools.push('TaskMaster');
      }
    }
    
    // Check Context7 validation
    if (requiredTools.includes('Context7')) {
      if (results.codebase && this.validateContext7Result(results.codebase)) {
        validatedTools.push('Context7');
      }
    }
    
    // Check RAG validation
    if (requiredTools.includes('RAG')) {
      if (results.documentation && this.validateRAGResult(results.documentation)) {
        validatedTools.push('RAG');
      }
    }
    
    // Check Redis/Memory validation
    if (requiredTools.includes('Redis')) {
      if (results.memory && this.validateRedisResult(results.memory)) {
        validatedTools.push('Redis');
      }
    }
    
    return validatedTools;
  }

  /**
   * Factory injection point for UEPMetaAgentFactory
   * This replaces the factory-level configuration merging
   */
  public enhanceFactoryConfig(
    agentConfig: any,
    agentId: string,
    factoryConfig: any
  ): any {
    
    const enforcedConfig = {
      ...agentConfig,
      agentId,
      // INJECT ENFORCEMENT CONFIGURATION
      uepEnforcement: {
        enabled: factoryConfig.enableUEP,
        level: factoryConfig.enforceCompliance ? 'strict' : 'warn',
        requiredComponents: ['TaskMaster', 'Context7', 'Memory'],
        gateway: this, // Inject gateway reference
        blockOnFailure: factoryConfig.enforceCompliance,
        auditAllRequests: true
      }
    };
    
    console.log(`🏭 UEP Factory: Enhanced agent config for ${agentId} with enforcement`);
    
    return enforcedConfig;
  }

  /**
   * Wrapper injection point for UEPAgentWrapper  
   * This replaces the wrapper-level UEP processing
   */
  public async enhanceWrapperExecution(
    originalRequest: UniversalExecutionRequest,
    processingFunction: () => Promise<UniversalExecutionResult>
  ): Promise<EnforcedExecutionResult> {
    
    const enforcedRequest: EnforcedExecutionRequest = {
      ...originalRequest,
      enforcementConfig: {
        enableEnforcement: true,
        enforcementLevel: 'strict',
        requiredTools: ['TaskMaster', 'Context7', 'RAG', 'Redis'],
        blockOnFailure: true,
        auditAllRequests: true
      }
    };
    
    console.log(`🔄 UEP Wrapper: Processing ${enforcedRequest.requestId} with enforcement`);
    
    // Use enforcement gateway to wrap execution
    const result = await this.enforceAndExecute(enforcedRequest, processingFunction);
    
    return {
      ...result,
      enforcementResult: result.enforcementMetadata,
      complianceScore: result.enforcementMetadata.complianceScore,
      auditId: result.enforcementMetadata.auditId,
      toolsValidated: result.enforcementMetadata.validatedProofs.map(p => p.toolName)
    };
  }

  /**
   * Validation engine injection point
   * This replaces the validation engine's compliance checking
   */
  public async enhanceValidationEngine(
    request: UniversalExecutionRequest,
    results: any
  ): Promise<boolean> {
    
    const enforcedRequest: EnforcedExecutionRequest = {
      ...request,
      enforcementConfig: {
        enforcementLevel: 'strict',
        blockOnFailure: true
      }
    };
    
    try {
      // Validate tool execution through enforcement
      const validatedTools = await this.validateToolExecution(enforcedRequest, results);
      const requiredTools = this.determineRequiredTools(enforcedRequest);
      
      // All required tools must be validated
      const allValidated = requiredTools.every(tool => validatedTools.includes(tool));
      
      if (!allValidated) {
        const missing = requiredTools.filter(tool => !validatedTools.includes(tool));
        console.log(`🚫 UEP Validation: Missing required tools: ${missing.join(', ')}`);
        return false;
      }
      
      console.log(`✅ UEP Validation: All required tools validated: ${validatedTools.join(', ')}`);
      return true;
      
    } catch (error) {
      console.error(`❌ UEP Validation: Enforcement failed - ${error.message}`);
      return false;
    }
  }

  // Helper methods for tool validation
  private determineRequiredTools(request: EnforcedExecutionRequest): string[] {
    // Override from request config if provided
    if (request.enforcementConfig?.requiredTools) {
      return request.enforcementConfig.requiredTools;
    }
    
    // Use gateway default
    return this.config.requiredTools;
  }

  private validateTaskMasterResult(result: TaskMasterResult): boolean {
    return !!(result && result.tasks && result.tasks.length > 0);
  }

  private validateContext7Result(result: CodebaseContext): boolean {
    return !!(result && result.relevantFiles && result.relevantFiles.length > 0);
  }

  private validateRAGResult(result: DocumentationResult[]): boolean {
    return !!(result && result.length > 0);
  }

  private validateRedisResult(result: any): boolean {
    return !!(result && typeof result === 'object');
  }

  private validateBypassToken(token: string): boolean {
    // In a real implementation, this would validate against secure admin tokens
    const validTokens = ['admin-emergency-bypass-2025', 'uep-admin-override'];
    return validTokens.includes(token);
  }

  private addEnforcementMetadata<T>(
    result: T,
    enforcementResult: EnforcementResult
  ): T & { enforcementMetadata: EnforcementResult } {
    return {
      ...result,
      enforcementMetadata: enforcementResult
    };
  }

  private logEnforcementDecision(result: EnforcementResult): void {
    const emoji = result.approved ? '✅' : '🚫';
    const level = result.blocked ? 'BLOCKED' : result.approved ? 'APPROVED' : 'WARNING';
    
    console.log(`${emoji} UEP Gateway [${level}]: ${result.reason}`);
    console.log(`   Compliance: ${(result.complianceScore * 100).toFixed(1)}%`);
    console.log(`   Tools: ${result.validatedProofs.map(p => p.toolName).join(', ') || 'None'}`);
    
    if (result.missingTools.length > 0) {
      console.log(`   Missing: ${result.missingTools.join(', ')}`);
    }
  }
}

/**
 * Factory function to create enforcement gateway
 */
export function createUEPEnforcementGateway(config?: Partial<UEPGatewayConfig>): UEPEnforcementGateway {
  return new UEPEnforcementGateway(config);
}

/**
 * Global enforcement gateway instance
 */
let globalGateway: UEPEnforcementGateway | null = null;

/**
 * Get or create global enforcement gateway
 */
export function getGlobalEnforcementGateway(config?: Partial<UEPGatewayConfig>): UEPEnforcementGateway {
  if (!globalGateway) {
    globalGateway = new UEPEnforcementGateway(config);
  }
  return globalGateway;
}

/**
 * Convenience function for enforcing UEP compliance
 */
export async function enforceUEPExecution<T>(
  request: EnforcedExecutionRequest,
  executionFunction: () => Promise<T>,
  gatewayConfig?: Partial<UEPGatewayConfig>
): Promise<T & { enforcementMetadata: EnforcementResult }> {
  
  const gateway = getGlobalEnforcementGateway(gatewayConfig);
  return await gateway.enforceAndExecute(request, executionFunction);
}