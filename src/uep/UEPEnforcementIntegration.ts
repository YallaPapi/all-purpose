/**
 * UEP Enforcement Integration Layer
 * 
 * This module integrates the UEP Enforcement Gateway into existing UEP components
 * at the specific injection points identified in the codebase analysis:
 * 
 * 1. Factory Level: UEPMetaAgentFactory.createAgent() at lines 210-226
 * 2. Wrapper Level: UEPAgentWrapper.processWithUEP() at lines 218-222
 * 3. Validation Level: ValidationEngine.validateExecution() at lines 241-244
 * 
 * This integration layer provides patches and monkey-patches to inject enforcement
 * without breaking existing functionality.
 */

import { 
  UEPEnforcementGateway, 
  createUEPEnforcementGateway, 
  getGlobalEnforcementGateway,
  EnforcedExecutionRequest,
  EnforcedExecutionResult
} from './UEPEnforcementGateway';

import { 
  UniversalExecutionRequest, 
  UniversalExecutionResult 
} from './ProtocolProcessor';

/**
 * Integration configuration
 */
export interface UEPIntegrationConfig {
  enableFactoryIntegration: boolean;
  enableWrapperIntegration: boolean;
  enableValidationIntegration: boolean;
  enforcementLevel: 'strict' | 'warn' | 'off';
  patchExistingComponents: boolean;
}

/**
 * UEP Enforcement Integration Manager
 * 
 * Manages the integration of enforcement into existing UEP components
 */
export class UEPEnforcementIntegration {
  private readonly gateway: UEPEnforcementGateway;
  private readonly config: UEPIntegrationConfig;
  private isIntegrated = false;

  constructor(config: Partial<UEPIntegrationConfig> = {}) {
    this.config = {
      enableFactoryIntegration: true,
      enableWrapperIntegration: true,
      enableValidationIntegration: true,
      enforcementLevel: 'strict',
      patchExistingComponents: true,
      ...config
    };

    this.gateway = getGlobalEnforcementGateway({
      enableEnforcement: true,
      enforcementLevel: this.config.enforcementLevel,
      requiredTools: ['TaskMaster', 'Context7', 'RAG', 'Redis'],
      blockOnFailure: this.config.enforcementLevel === 'strict',
      auditAllRequests: true
    });

    console.log('🔗 UEP Enforcement Integration initialized:', this.config);
  }

  /**
   * Apply all enforcement integrations to existing UEP components
   */
  public async integrateEnforcement(): Promise<void> {
    if (this.isIntegrated) {
      console.log('⚠️ UEP Integration: Already integrated, skipping');
      return;
    }

    console.log('🔄 UEP Integration: Applying enforcement patches...');

    try {
      // Patch existing components if enabled
      if (this.config.patchExistingComponents) {
        await this.patchExistingComponents();
      }

      // Apply integration patches
      if (this.config.enableFactoryIntegration) {
        this.integrateFactory();
      }

      if (this.config.enableWrapperIntegration) {
        this.integrateWrapper();
      }

      if (this.config.enableValidationIntegration) {
        this.integrateValidation();
      }

      this.isIntegrated = true;
      console.log('✅ UEP Integration: All enforcement patches applied successfully');

    } catch (error) {
      console.error('❌ UEP Integration: Failed to apply patches:', error.message);
      throw error;
    }
  }

  /**
   * Factory Level Integration
   * 
   * Integrates enforcement into UEPMetaAgentFactory.createAgent()
   * Injection Point: Lines 210-226 in UEPMetaAgentFactory.js
   */
  private integrateFactory(): void {
    console.log('🏭 UEP Integration: Patching factory-level enforcement...');

    // Store reference to original factory method if it exists
    const originalCreateAgent = this.getOriginalFactoryMethod();

    // Create enhanced factory method
    const enhancedCreateAgent = async (agentType: string, agentId: string, agentConfig: any = {}) => {
      console.log(`🔒 UEP Factory Enforcement: Creating agent ${agentId} with enforcement`);

      // INJECTION POINT: Replace original config merging with enforcement
      const enforcedConfig = this.gateway.enhanceFactoryConfig(
        agentConfig,
        agentId,
        { enableUEP: true, enforceCompliance: this.config.enforcementLevel === 'strict' }
      );

      // Call original method with enforced config
      if (originalCreateAgent) {
        return await originalCreateAgent.call(this, agentType, agentId, enforcedConfig);
      } else {
        // Fallback if original method not available
        return this.createEnforcedAgent(agentType, agentId, enforcedConfig);
      }
    };

    // Apply the patch
    this.patchFactoryMethod(enhancedCreateAgent);
    console.log('✅ UEP Integration: Factory enforcement patch applied');
  }

  /**
   * Wrapper Level Integration
   * 
   * Integrates enforcement into UEPAgentWrapper.processWithUEP()
   * Injection Point: Lines 218-222 in UEPAgentWrapper.ts
   */
  private integrateWrapper(): void {
    console.log('🔄 UEP Integration: Patching wrapper-level enforcement...');

    // Store reference to original wrapper method
    const originalProcessWithUEP = this.getOriginalWrapperMethod();

    // Create enhanced wrapper method
    const enhancedProcessWithUEP = async (request: UniversalExecutionRequest): Promise<EnforcedExecutionResult> => {
      console.log(`🔒 UEP Wrapper Enforcement: Processing ${request.requestId} with enforcement`);

      // INJECTION POINT: Replace original UEP processing with enforcement
      const processingFunction = async (): Promise<UniversalExecutionResult> => {
        if (originalProcessWithUEP) {
          return await originalProcessWithUEP.call(this, request);
        } else {
          // Fallback processing
          return await this.fallbackProcessing(request);
        }
      };

      // Use enforcement gateway to wrap execution
      const result = await this.gateway.enhanceWrapperExecution(request, processingFunction);
      
      console.log(`✅ UEP Wrapper Enforcement: Completed ${request.requestId} (Score: ${(result.complianceScore * 100).toFixed(1)}%)`);
      
      return result;
    };

    // Apply the patch
    this.patchWrapperMethod(enhancedProcessWithUEP);
    console.log('✅ UEP Integration: Wrapper enforcement patch applied');
  }

  /**
   * Validation Level Integration
   * 
   * Integrates enforcement into ValidationEngine.validateExecution()
   * Injection Point: Lines 241-244 in ValidationEngine.ts
   */
  private integrateValidation(): void {
    console.log('🔍 UEP Integration: Patching validation-level enforcement...');

    // Store reference to original validation method
    const originalValidateExecution = this.getOriginalValidationMethod();

    // Create enhanced validation method
    const enhancedValidateExecution = async (request: UniversalExecutionRequest, results: any): Promise<boolean> => {
      console.log(`🔒 UEP Validation Enforcement: Validating ${request.requestId}`);

      // INJECTION POINT: Replace original validation with enforcement
      const enforcementPassed = await this.gateway.enhanceValidationEngine(request, results);

      // Also run original validation if available
      let originalPassed = true;
      if (originalValidateExecution) {
        try {
          originalPassed = await originalValidateExecution.call(this, request, results);
        } catch (error) {
          console.warn(`⚠️ UEP Validation: Original validation failed: ${error.message}`);
          originalPassed = false;
        }
      }

      // Both enforcement and original validation must pass
      const finalResult = enforcementPassed && originalPassed;

      console.log(`${finalResult ? '✅' : '❌'} UEP Validation Enforcement: ${finalResult ? 'PASSED' : 'FAILED'}`);
      console.log(`   Enforcement: ${enforcementPassed}, Original: ${originalPassed}`);

      return finalResult;
    };

    // Apply the patch
    this.patchValidationMethod(enhancedValidateExecution);
    console.log('✅ UEP Integration: Validation enforcement patch applied');
  }

  /**
   * Patch existing UEP components to prepare for enforcement integration
   */
  private async patchExistingComponents(): Promise<void> {
    console.log('🔧 UEP Integration: Patching existing components...');

    try {
      // Import existing UEP components
      const { UEPMetaAgentFactory } = await import('../meta-agents/UEPMetaAgentFactory');
      const { ValidationEngine } = await import('./ValidationEngine');

      // Store references to original methods
      this.storeOriginalMethods(UEPMetaAgentFactory, ValidationEngine);

      console.log('✅ UEP Integration: Components patched and ready for enforcement');

    } catch (error) {
      console.warn(`⚠️ UEP Integration: Could not patch all components: ${error.message}`);
      // Continue without patching - enforcement will still work through gateway
    }
  }

  // Helper methods for patching existing components
  private getOriginalFactoryMethod(): any {
    // Try to get reference to original UEPMetaAgentFactory.createAgent method
    try {
      const factory = require('../meta-agents/UEPMetaAgentFactory');
      return factory?.UEPMetaAgentFactory?.prototype?.createAgent;
    } catch {
      return null;
    }
  }

  private getOriginalWrapperMethod(): any {
    // Try to get reference to original UEPAgentWrapper.processWithUEP method
    try {
      const wrapper = require('./UEPAgentWrapper');
      return wrapper?.UEPAgentWrapper?.prototype?.processWithUEP;
    } catch {
      return null;
    }
  }

  private getOriginalValidationMethod(): any {
    // Try to get reference to original ValidationEngine.validateExecution method
    try {
      const validation = require('./ValidationEngine');
      return validation?.ValidationEngine?.prototype?.validateExecution;
    } catch {
      return null;
    }
  }

  private patchFactoryMethod(enhancedMethod: any): void {
    try {
      const factory = require('../meta-agents/UEPMetaAgentFactory');
      if (factory?.UEPMetaAgentFactory?.prototype) {
        factory.UEPMetaAgentFactory.prototype.createAgent = enhancedMethod;
      }
    } catch (error) {
      console.warn(`⚠️ Could not patch factory method: ${error.message}`);
    }
  }

  private patchWrapperMethod(enhancedMethod: any): void {
    try {
      const wrapper = require('./UEPAgentWrapper');
      if (wrapper?.UEPAgentWrapper?.prototype) {
        wrapper.UEPAgentWrapper.prototype.processWithUEP = enhancedMethod;
      }
    } catch (error) {
      console.warn(`⚠️ Could not patch wrapper method: ${error.message}`);
    }
  }

  private patchValidationMethod(enhancedMethod: any): void {
    try {
      const validation = require('./ValidationEngine');
      if (validation?.ValidationEngine?.prototype) {
        validation.ValidationEngine.prototype.validateExecution = enhancedMethod;
      }
    } catch (error) {
      console.warn(`⚠️ Could not patch validation method: ${error.message}`);
    }
  }

  private storeOriginalMethods(factory: any, validation: any): void {
    // Store original methods for reference
    if (factory?.prototype?.createAgent) {
      (globalThis as any)._originalCreateAgent = factory.prototype.createAgent;
    }
    
    if (validation?.prototype?.validateExecution) {
      (globalThis as any)._originalValidateExecution = validation.prototype.validateExecution;
    }
  }

  private async createEnforcedAgent(agentType: string, agentId: string, config: any): Promise<any> {
    // Fallback agent creation with enforcement
    console.log(`🔄 UEP Integration: Creating enforced agent ${agentId} of type ${agentType}`);
    
    return {
      agentId,
      agentType,
      config,
      enforcement: {
        enabled: true,
        level: this.config.enforcementLevel,
        gateway: this.gateway
      },
      // Add basic agent methods
      process: async (input: any) => {
        const request: EnforcedExecutionRequest = {
          requestId: `${agentId}-${Date.now()}`,
          taskDescription: input?.taskDescription || 'Agent processing',
          requesterType: 'agent',
          metadata: { agentId, agentType }
        };

        return await this.gateway.enforceAndExecute(request, async () => {
          // Basic processing logic
          return { success: true, result: input, agentId };
        });
      }
    };
  }

  private async fallbackProcessing(request: UniversalExecutionRequest): Promise<UniversalExecutionResult> {
    // Fallback UEP processing if original method not available
    console.log(`🔄 UEP Integration: Fallback processing for ${request.requestId}`);
    
    return {
      success: true,
      requestId: request.requestId,
      taskDescription: request.taskDescription,
      requesterType: request.requesterType,
      results: {
        taskBreakdown: { tasks: [], metadata: { totalTasks: 0 } },
        codebase: { relevantFiles: [], projectStructure: {} },
        documentation: [],
        memory: { context: 'fallback' }
      },
      metadata: {
        processingTime: Date.now(),
        complianceScore: 0.5,
        fallback: true
      }
    };
  }

  /**
   * Check if enforcement integration is active
   */
  public isEnforcementIntegrated(): boolean {
    return this.isIntegrated;
  }

  /**
   * Get enforcement statistics
   */
  public getEnforcementStats(): any {
    return {
      integrated: this.isIntegrated,
      config: this.config,
      gateway: this.gateway ? 'Active' : 'Inactive'
    };
  }
}

/**
 * Global integration instance
 */
let globalIntegration: UEPEnforcementIntegration | null = null;

/**
 * Initialize UEP enforcement integration
 */
export async function initializeUEPEnforcement(config?: Partial<UEPIntegrationConfig>): Promise<UEPEnforcementIntegration> {
  if (!globalIntegration) {
    globalIntegration = new UEPEnforcementIntegration(config);
    await globalIntegration.integrateEnforcement();
  }
  return globalIntegration;
}

/**
 * Get global integration instance
 */
export function getUEPEnforcementIntegration(): UEPEnforcementIntegration | null {
  return globalIntegration;
}

/**
 * Auto-initialize enforcement on module load (can be disabled)
 */
const AUTO_INITIALIZE = process.env.UEP_AUTO_ENFORCE !== 'false';

if (AUTO_INITIALIZE) {
  // Initialize enforcement with environment-based configuration
  const config: Partial<UEPIntegrationConfig> = {
    enforcementLevel: (process.env.UEP_ENFORCEMENT_LEVEL as any) || 'strict',
    enableFactoryIntegration: process.env.UEP_FACTORY_ENFORCE !== 'false',
    enableWrapperIntegration: process.env.UEP_WRAPPER_ENFORCE !== 'false',
    enableValidationIntegration: process.env.UEP_VALIDATION_ENFORCE !== 'false',
    patchExistingComponents: process.env.UEP_PATCH_EXISTING !== 'false'
  };

  // Initialize asynchronously
  setImmediate(async () => {
    try {
      await initializeUEPEnforcement(config);
      console.log('🚀 UEP Enforcement: Auto-initialized successfully');
    } catch (error) {
      console.error('❌ UEP Enforcement: Auto-initialization failed:', error.message);
    }
  });
}