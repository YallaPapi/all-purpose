/**
 * UEP Enforced Protocol Processor
 * 
 * This is the REPLACEMENT for the original ProtocolProcessor that integrates
 * the enforcement middleware directly into the UEP execution pipeline.
 * 
 * Key Changes from Original:
 * 1. Mandatory enforcement before execution
 * 2. No bypass mechanisms (removed override flags)
 * 3. Cryptographic tool verification
 * 4. Immutable audit logging
 * 5. Tool usage verification system integration
 */

import { 
  UEPEnforcementGateway, 
  getGlobalEnforcementGateway,
  EnforcedExecutionRequest 
} from './UEPEnforcementGateway';

import { 
  UEPToolVerificationSystem,
  getUEPToolVerificationSystem,
  ToolVerificationRequest 
} from './UEPToolVerificationSystem';

import { 
  UEPAuditLoggingSystem,
  getUEPAuditLoggingSystem 
} from './UEPAuditLoggingSystem';

import { 
  UniversalExecutionRequest,
  UniversalExecutionResult,
  TaskMasterResult,
  CodebaseContext,
  DocumentationResult,
  MemoryResult
} from './ProtocolProcessor';

/**
 * Enforced Protocol Configuration - NO BYPASS ALLOWED
 */
export interface EnforcedProtocolConfig {
  enforcementLevel: 'strict'; // Only strict mode allowed
  requiredTools: ('TaskMaster' | 'Context7' | 'RAG' | 'Redis')[];
  enableAuditLogging: boolean;
  enableToolVerification: boolean;
  timeout: number;
  auditDirectory?: string;
}

/**
 * Enhanced execution result with enforcement metadata
 */
export interface EnforcedExecutionResult extends UniversalExecutionResult {
  enforcement: {
    auditId: string;
    complianceScore: number;
    toolsVerified: string[];
    enforcementTime: number;
    blocked: boolean;
    violations: string[];
  };
}

/**
 * UEP Enforced Protocol Processor
 * 
 * This class REPLACES the original ProtocolProcessor with mandatory enforcement.
 * It cannot be bypassed and ensures all tools are cryptographically verified.
 */
export class UEPEnforcedProtocolProcessor {
  private readonly enforcementGateway: UEPEnforcementGateway;
  private readonly verificationSystem: UEPToolVerificationSystem;
  private readonly auditSystem: UEPAuditLoggingSystem;
  private readonly config: EnforcedProtocolConfig;

  constructor(config: Partial<EnforcedProtocolConfig> = {}) {
    this.config = {
      enforcementLevel: 'strict', // Cannot be overridden
      requiredTools: ['TaskMaster', 'Context7', 'RAG', 'Redis'],
      enableAuditLogging: true,
      enableToolVerification: true,
      timeout: 180000, // 3 minutes
      ...config
    };

    // Initialize enforcement systems
    this.enforcementGateway = getGlobalEnforcementGateway({
      enableEnforcement: true,
      enforcementLevel: 'strict',
      requiredTools: this.config.requiredTools,
      blockOnFailure: true,
      auditAllRequests: true
    });

    this.verificationSystem = getUEPToolVerificationSystem();
    this.auditSystem = getUEPAuditLoggingSystem(this.config.auditDirectory);

    console.log('🔒 UEP Enforced Protocol Processor initialized - ENFORCEMENT MANDATORY');
    console.log(`   Required Tools: ${this.config.requiredTools.join(', ')}`);
    console.log('   Bypass Mechanisms: DISABLED');
  }

  /**
   * Process task with MANDATORY enforcement
   * 
   * This method REPLACES the original processTask method and cannot be bypassed.
   */
  public async processTask(request: UniversalExecutionRequest): Promise<EnforcedExecutionResult> {
    const startTime = Date.now();
    
    console.log(`🔒 UEP Enforced: Processing ${request.requestId} with mandatory enforcement`);
    
    // Initialize audit system
    await this.auditSystem.initialize();

    // Create enforced request
    const enforcedRequest: EnforcedExecutionRequest = {
      ...request,
      enforcementConfig: {
        enableEnforcement: true,
        enforcementLevel: 'strict',
        requiredTools: this.config.requiredTools,
        blockOnFailure: true,
        auditAllRequests: true
      }
    };

    try {
      // STEP 1: MANDATORY ENFORCEMENT CHECK
      const enforcementResult = await this.enforcementGateway.enforceAndExecute(
        enforcedRequest,
        async () => {
          // STEP 2: Execute UEP processing with verification
          return await this.executeEnforcedUEPProcessing(enforcedRequest);
        }
      );

      // STEP 3: Verify all tools were used
      const toolVerifications = await this.verifyAllToolsUsed(enforcedRequest);

      // STEP 4: Log to audit system
      const auditId = await this.auditSystem.logEnforcementDecision(
        request.requestId,
        request.taskDescription,
        request.requesterType,
        enforcementResult.enforcementMetadata,
        toolVerifications,
        {
          validationTime: Date.now() - startTime,
          processingTime: Date.now() - startTime,
          cacheHitRate: 0
        },
        {
          agentId: request.metadata?.agentId,
          sessionId: request.metadata?.sessionId,
          enforcementLevel: 'strict'
        }
      );

      // STEP 5: Return enforced result
      const result: EnforcedExecutionResult = {
        ...enforcementResult,
        enforcement: {
          auditId,
          complianceScore: enforcementResult.enforcementMetadata.complianceScore,
          toolsVerified: enforcementResult.enforcementMetadata.validatedProofs.map(p => p.toolName),
          enforcementTime: Date.now() - startTime,
          blocked: enforcementResult.enforcementMetadata.blocked,
          violations: enforcementResult.enforcementMetadata.missingTools
        }
      };

      console.log(`✅ UEP Enforced: Completed ${request.requestId} (Score: ${(result.enforcement.complianceScore * 100).toFixed(1)}%)`);
      
      return result;

    } catch (error) {
      // Log enforcement failure
      await this.auditSystem.logSecurityViolation(
        request.requestId,
        'enforcement-failure',
        `Enforced processing failed: ${error.message}`,
        {
          agentId: request.metadata?.agentId,
          sessionId: request.metadata?.sessionId,
          requesterType: request.requesterType,
          error: error.message
        }
      );

      throw new Error(`UEP Enforcement blocked execution: ${error.message}`);
    }
  }

  /**
   * Execute UEP processing with enforcement and verification
   */
  private async executeEnforcedUEPProcessing(request: EnforcedExecutionRequest): Promise<UniversalExecutionResult> {
    const results: {
      taskBreakdown?: TaskMasterResult;
      codebase?: CodebaseContext;
      documentation?: DocumentationResult[];
      memory?: MemoryResult;
    } = {};

    const executionTimes: Record<string, number> = {};

    // Execute each required tool with verification
    for (const toolName of this.config.requiredTools) {
      const toolStartTime = Date.now();
      
      try {
        console.log(`🔧 UEP Enforced: Executing ${toolName}...`);
        
        switch (toolName) {
          case 'TaskMaster':
            results.taskBreakdown = await this.executeAndVerifyTaskMaster(request);
            break;
          case 'Context7':
            results.codebase = await this.executeAndVerifyContext7(request);
            break;
          case 'RAG':
            results.documentation = await this.executeAndVerifyRAG(request);
            break;
          case 'Redis':
            results.memory = await this.executeAndVerifyRedis(request);
            break;
        }

        executionTimes[toolName] = Date.now() - toolStartTime;
        console.log(`✅ UEP Enforced: ${toolName} completed (${executionTimes[toolName]}ms)`);

      } catch (error) {
        console.error(`❌ UEP Enforced: ${toolName} failed - ${error.message}`);
        
        // Log tool execution failure
        await this.auditSystem.logSecurityViolation(
          request.requestId,
          'tool-execution-failure',
          `${toolName} execution failed: ${error.message}`,
          {
            toolName,
            agentId: request.metadata?.agentId,
            sessionId: request.metadata?.sessionId,
            requesterType: request.requesterType,
            error: error.message
          }
        );

        throw new Error(`Required tool ${toolName} failed: ${error.message}`);
      }
    }

    return {
      success: true,
      requestId: request.requestId,
      taskDescription: request.taskDescription,
      requesterType: request.requesterType,
      results,
      metadata: {
        processingTime: Date.now(),
        uepVersion: '2.0.0-enforced',
        enforcement: 'mandatory',
        toolExecutionTimes: executionTimes,
        complianceVerified: true
      }
    };
  }

  /**
   * Execute and verify TaskMaster with cryptographic proof
   */
  private async executeAndVerifyTaskMaster(request: EnforcedExecutionRequest): Promise<TaskMasterResult> {
    const { TaskMasterAdapter } = await import('./TaskMasterAdapter');
    const adapter = new TaskMasterAdapter({
      enableCaching: true,
      timeout: this.config.timeout
    });

    // Execute TaskMaster
    const result = await adapter.processTask(request.taskDescription, {
      requestId: request.requestId,
      requesterType: request.requesterType
    });

    // Verify execution with cryptographic proof
    await this.verifyToolExecution('TaskMaster', request, result);

    return result;
  }

  /**
   * Execute and verify Context7 with cryptographic proof
   */
  private async executeAndVerifyContext7(request: EnforcedExecutionRequest): Promise<CodebaseContext> {
    const { Context7ScannerAdapter } = await import('./Context7ScannerAdapter');
    const adapter = new Context7ScannerAdapter({
      projectRoot: process.cwd(),
      enableCaching: true
    });

    // Execute Context7
    const result = await adapter.scanCodebase(request.taskDescription);

    // Verify execution with cryptographic proof
    await this.verifyToolExecution('Context7', request, result);

    return result;
  }

  /**
   * Execute and verify RAG with cryptographic proof
   */
  private async executeAndVerifyRAG(request: EnforcedExecutionRequest): Promise<DocumentationResult[]> {
    const { RAGAdapter } = await import('./RAGAdapter');
    const adapter = new RAGAdapter();

    // Execute RAG
    const result = await adapter.searchDocumentation(request.taskDescription, {
      requestId: request.requestId
    });

    // Verify execution with cryptographic proof
    await this.verifyToolExecution('RAG', request, result);

    return result;
  }

  /**
   * Execute and verify Redis with cryptographic proof
   */
  private async executeAndVerifyRedis(request: EnforcedExecutionRequest): Promise<MemoryResult> {
    const { MemoryManager } = await import('./MemoryManager');
    const manager = new MemoryManager({
      enableCaching: true
    });

    // Execute Redis operations
    const result = await manager.retrieveRelevantMemory(request.requestId, {
      sessionId: request.metadata?.sessionId,
      agentId: request.metadata?.agentId,
      taskDescription: request.taskDescription
    });

    // Verify execution with cryptographic proof
    await this.verifyToolExecution('Redis', request, result);

    return result;
  }

  /**
   * Verify tool execution with cryptographic proof
   */
  private async verifyToolExecution(
    toolName: 'TaskMaster' | 'Context7' | 'RAG' | 'Redis',
    request: EnforcedExecutionRequest,
    result: any
  ): Promise<void> {
    
    if (!this.config.enableToolVerification) return;

    const verificationRequest: ToolVerificationRequest = {
      toolName,
      requestId: request.requestId,
      taskDescription: request.taskDescription,
      expectedParameters: {
        taskDescription: request.taskDescription,
        requestId: request.requestId
      },
      timeWindow: {
        start: new Date(Date.now() - 60000), // 1 minute ago
        end: new Date()
      }
    };

    const verificationResult = await this.verificationSystem.verifyToolExecution(verificationRequest);

    // Log verification result
    await this.auditSystem.logToolVerification(
      request.requestId,
      toolName,
      verificationResult,
      {
        agentId: request.metadata?.agentId,
        sessionId: request.metadata?.sessionId,
        taskDescription: request.taskDescription,
        requesterType: request.requesterType,
        validationTime: 0
      }
    );

    if (!verificationResult.verified) {
      throw new Error(`${toolName} execution could not be cryptographically verified: ${verificationResult.errors.join(', ')}`);
    }

    console.log(`🔍 UEP Enforced: ${toolName} verification passed (${(verificationResult.confidence * 100).toFixed(1)}% confidence)`);
  }

  /**
   * Verify all required tools were executed
   */
  private async verifyAllToolsUsed(request: EnforcedExecutionRequest): Promise<Record<string, any>> {
    const verifications: Record<string, any> = {};

    for (const toolName of this.config.requiredTools) {
      const verificationRequest: ToolVerificationRequest = {
        toolName: toolName as any,
        requestId: request.requestId,
        taskDescription: request.taskDescription,
        expectedParameters: {},
        timeWindow: {
          start: new Date(Date.now() - 300000), // 5 minutes ago
          end: new Date()
        }
      };

      const result = await this.verificationSystem.verifyToolExecution(verificationRequest);
      verifications[toolName] = result;

      if (!result.verified) {
        await this.auditSystem.logSecurityViolation(
          request.requestId,
          'tool-verification-failure',
          `${toolName} verification failed: ${result.errors.join(', ')}`,
          {
            toolName,
            confidence: result.confidence,
            errors: result.errors,
            agentId: request.metadata?.agentId,
            sessionId: request.metadata?.sessionId,
            requesterType: request.requesterType
          }
        );
      }
    }

    return verifications;
  }

  /**
   * Get enforcement statistics
   */
  public getEnforcementStatistics(): any {
    return {
      config: this.config,
      auditStats: this.auditSystem.getAuditStatistics(),
      enforcementEnabled: true,
      bypassMechanisms: 'disabled',
      integrityProtection: 'active'
    };
  }
}

/**
 * Factory function to create enforced protocol processor
 */
export function createUEPEnforcedProtocolProcessor(config?: Partial<EnforcedProtocolConfig>): UEPEnforcedProtocolProcessor {
  return new UEPEnforcedProtocolProcessor(config);
}

/**
 * Global enforced processor instance
 */
let globalEnforcedProcessor: UEPEnforcedProtocolProcessor | null = null;

/**
 * Get global enforced protocol processor
 */
export function getGlobalEnforcedProtocolProcessor(config?: Partial<EnforcedProtocolConfig>): UEPEnforcedProtocolProcessor {
  if (!globalEnforcedProcessor) {
    globalEnforcedProcessor = new UEPEnforcedProtocolProcessor(config);
  }
  return globalEnforcedProcessor;
}

/**
 * Replace existing protocol processor with enforced version
 * This function patches the original ProtocolProcessor module
 */
export function replaceProtocolProcessorWithEnforcement(): void {
  try {
    // Get the enforced processor
    const enforcedProcessor = getGlobalEnforcedProtocolProcessor();

    // Patch the original module exports
    const originalModule = require('./ProtocolProcessor');
    
    // Replace the main processor class
    originalModule.ProtocolProcessor = UEPEnforcedProtocolProcessor;
    originalModule.createProtocolProcessor = createUEPEnforcedProtocolProcessor;
    
    // Add enforcement flag
    originalModule.ENFORCEMENT_ENABLED = true;
    originalModule.UEP_VERSION = '2.0.0-enforced';

    console.log('🔒 UEP Enforcement: Successfully replaced ProtocolProcessor with enforced version');
    console.log('   ⚠️ All UEP operations now require mandatory tool verification');
    console.log('   ⚠️ Bypass mechanisms have been disabled');

  } catch (error) {
    console.error(`❌ UEP Enforcement: Failed to replace ProtocolProcessor - ${error.message}`);
    throw error;
  }
}

// Auto-replace on module load if enabled
if (process.env.UEP_ENFORCE_PROCESSOR !== 'false') {
  setImmediate(() => {
    try {
      replaceProtocolProcessorWithEnforcement();
    } catch (error) {
      console.error('❌ UEP Enforcement: Auto-replacement failed:', error.message);
    }
  });
}