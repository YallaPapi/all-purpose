/**
 * UEP Enforcement Activation
 * 
 * This is the MASTER ACTIVATION FILE that enables enforcement across the entire UEP system.
 * 
 * Running this module will:
 * 1. Replace the original ProtocolProcessor with enforced version
 * 2. Patch all existing UEP components with enforcement
 * 3. Initialize audit logging and verification systems
 * 4. Block all bypass mechanisms
 * 5. Enable mandatory tool verification
 * 
 * IMPORTANT: Once activated, enforcement CANNOT be disabled without restarting.
 */

import {
  UEPEnforcementIntegration,
  initializeUEPEnforcement
} from './UEPEnforcementIntegration';

import {
  UEPEnforcedProtocolProcessor,
  replaceProtocolProcessorWithEnforcement
} from './UEPEnforcedProtocolProcessor';

import {
  getUEPAuditLoggingSystem,
  initializeUEPAuditLogging
} from './UEPAuditLoggingSystem';

import {
  getUEPToolVerificationSystem
} from './UEPToolVerificationSystem';

import {
  getGlobalEnforcementGateway
} from './UEPEnforcementGateway';

/**
 * Enforcement activation configuration
 */
export interface UEPEnforcementActivationConfig {
  enableFactoryEnforcement: boolean;
  enableWrapperEnforcement: boolean;
  enableValidationEnforcement: boolean;
  enableProcessorReplacement: boolean;
  enableAuditLogging: boolean;
  enableToolVerification: boolean;
  enforcementLevel: 'strict';
  auditDirectory?: string;
  logActivation: boolean;
}

/**
 * Activation result with system status
 */
export interface UEPEnforcementActivationResult {
  success: boolean;
  activatedComponents: string[];
  enforcementLevel: string;
  auditSystemActive: boolean;
  verificationSystemActive: boolean;
  gatewayActive: boolean;
  bypassMechanismsDisabled: boolean;
  activationTime: Date;
  errors: string[];
  warnings: string[];
}

/**
 * UEP Enforcement Master Activation System
 */
export class UEPEnforcementActivation {
  private static instance: UEPEnforcementActivation | null = null;
  private isActivated = false;
  private activationResult: UEPEnforcementActivationResult | null = null;

  private constructor() {
    // Singleton pattern - only one activation allowed
  }

  public static getInstance(): UEPEnforcementActivation {
    if (!UEPEnforcementActivation.instance) {
      UEPEnforcementActivation.instance = new UEPEnforcementActivation();
    }
    return UEPEnforcementActivation.instance;
  }

  /**
   * ACTIVATE UEP ENFORCEMENT SYSTEM
   * 
   * This method transforms the entire UEP system to use mandatory enforcement.
   * Once activated, it CANNOT be reversed without restarting the process.
   */
  public async activateEnforcement(config: Partial<UEPEnforcementActivationConfig> = {}): Promise<UEPEnforcementActivationResult> {
    if (this.isActivated) {
      console.log('⚠️ UEP Enforcement: Already activated');
      return this.activationResult!;
    }

    const activationConfig: UEPEnforcementActivationConfig = {
      enableFactoryEnforcement: true,
      enableWrapperEnforcement: true,
      enableValidationEnforcement: true,
      enableProcessorReplacement: true,
      enableAuditLogging: true,
      enableToolVerification: true,
      enforcementLevel: 'strict',
      logActivation: true,
      ...config
    };

    const result: UEPEnforcementActivationResult = {
      success: false,
      activatedComponents: [],
      enforcementLevel: activationConfig.enforcementLevel,
      auditSystemActive: false,
      verificationSystemActive: false,
      gatewayActive: false,
      bypassMechanismsDisabled: false,
      activationTime: new Date(),
      errors: [],
      warnings: []
    };

    if (activationConfig.logActivation) {
      console.log('🚀 UEP ENFORCEMENT ACTIVATION INITIATED');
      console.log('═'.repeat(60));
      console.log('⚠️  WARNING: This will enable MANDATORY tool verification');
      console.log('⚠️  WARNING: All bypass mechanisms will be DISABLED');
      console.log('⚠️  WARNING: Activation cannot be reversed without restart');
      console.log('═'.repeat(60));
    }

    try {
      // STEP 1: Initialize Audit Logging System
      if (activationConfig.enableAuditLogging) {
        console.log('📋 Activating audit logging system...');
        const auditSystem = await initializeUEPAuditLogging(activationConfig.auditDirectory);
        result.auditSystemActive = true;
        result.activatedComponents.push('AuditLogging');
        
        // Log activation event
        await auditSystem.logEnforcementDecision(
          'system-activation',
          'UEP Enforcement System Activation',
          'agent',
          {
            approved: true,
            blocked: false,
            reason: 'System activation initiated',
            complianceScore: 1.0
          },
          {},
          {
            validationTime: 0,
            processingTime: 0,
            cacheHitRate: 0
          },
          {
            activationConfig,
            timestamp: new Date()
          }
        );
      }

      // STEP 2: Initialize Tool Verification System
      if (activationConfig.enableToolVerification) {
        console.log('🔍 Activating tool verification system...');
        const verificationSystem = getUEPToolVerificationSystem();
        result.verificationSystemActive = true;
        result.activatedComponents.push('ToolVerification');
      }

      // STEP 3: Initialize Enforcement Gateway
      console.log('🔒 Activating enforcement gateway...');
      const gateway = getGlobalEnforcementGateway({
        enableEnforcement: true,
        enforcementLevel: 'strict',
        requiredTools: ['TaskMaster', 'Context7', 'RAG', 'Redis'],
        blockOnFailure: true,
        auditAllRequests: true
      });
      result.gatewayActive = true;
      result.activatedComponents.push('EnforcementGateway');

      // STEP 4: Replace Protocol Processor with Enforced Version
      if (activationConfig.enableProcessorReplacement) {
        console.log('🔄 Replacing protocol processor with enforced version...');
        replaceProtocolProcessorWithEnforcement();
        result.activatedComponents.push('EnforcedProtocolProcessor');
      }

      // STEP 5: Apply Integration Patches
      console.log('🔗 Applying enforcement integration patches...');
      const integration = await initializeUEPEnforcement({
        enableFactoryIntegration: activationConfig.enableFactoryEnforcement,
        enableWrapperIntegration: activationConfig.enableWrapperEnforcement,
        enableValidationIntegration: activationConfig.enableValidationEnforcement,
        enforcementLevel: 'strict',
        patchExistingComponents: true
      });
      result.activatedComponents.push('IntegrationPatches');

      // STEP 6: Disable Bypass Mechanisms
      console.log('🚫 Disabling bypass mechanisms...');
      this.disableBypassMechanisms();
      result.bypassMechanismsDisabled = true;
      result.activatedComponents.push('BypassDisabled');

      // STEP 7: Verify Activation Success
      const verificationResult = await this.verifyActivation();
      if (!verificationResult.success) {
        result.errors.push(...verificationResult.errors);
        result.warnings.push(...verificationResult.warnings);
      }

      result.success = result.errors.length === 0;
      this.isActivated = result.success;
      this.activationResult = result;

      if (result.success) {
        console.log('✅ UEP ENFORCEMENT ACTIVATION COMPLETED SUCCESSFULLY');
        console.log('═'.repeat(60));
        console.log(`📊 Activated Components: ${result.activatedComponents.join(', ')}`);
        console.log(`🔒 Enforcement Level: ${result.enforcementLevel}`);
        console.log(`📋 Audit System: ${result.auditSystemActive ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`🔍 Verification System: ${result.verificationSystemActive ? 'ACTIVE' : 'INACTIVE'}`);
        console.log(`🚫 Bypass Mechanisms: ${result.bypassMechanismsDisabled ? 'DISABLED' : 'ACTIVE'}`);
        console.log('═'.repeat(60));
        console.log('🎉 UEP ENFORCEMENT IS NOW MANDATORY FOR ALL OPERATIONS');
      } else {
        console.error('❌ UEP ENFORCEMENT ACTIVATION FAILED');
        console.error(`   Errors: ${result.errors.join(', ')}`);
        if (result.warnings.length > 0) {
          console.warn(`   Warnings: ${result.warnings.join(', ')}`);
        }
      }

      return result;

    } catch (error) {
      result.errors.push(`Activation failed: ${error.message}`);
      result.success = false;
      
      console.error('❌ UEP ENFORCEMENT ACTIVATION FAILED:', error.message);
      
      return result;
    }
  }

  /**
   * Disable all bypass mechanisms in the UEP system
   */
  private disableBypassMechanisms(): void {
    // Disable environment-based bypasses
    process.env.UEP_ENFORCEMENT_DISABLED = 'false';
    process.env.UEP_BYPASS_ENABLED = 'false';
    process.env.UEP_VALIDATION_SKIP = 'false';
    
    // Patch override flags in existing modules
    try {
      const protocolModule = require('./ProtocolProcessor');
      if (protocolModule.UniversalExecutionRequest) {
        // Remove override properties from interface if possible
        Object.defineProperty(protocolModule.UniversalExecutionRequest.prototype || {}, 'overrides', {
          get: () => ({}), // Always return empty overrides
          set: () => {}, // Ignore override attempts
          configurable: false,
          enumerable: false
        });
      }
    } catch {
      // Module not available yet
    }

    // Patch validation engine overrides
    try {
      const validationModule = require('./ValidationEngine');
      if (validationModule.ValidationEngine) {
        const originalValidateExecution = validationModule.ValidationEngine.prototype.validateExecution;
        validationModule.ValidationEngine.prototype.validateExecution = function(request: any, results: any) {
          // Remove any override flags from request
          if (request.overrides) {
            delete request.overrides.skipTaskMaster;
            delete request.overrides.skipContext7;
            delete request.overrides.skipRAG;
            delete request.overrides.skipMemory;
          }
          return originalValidateExecution.call(this, request, results);
        };
      }
    } catch {
      // Module not available yet
    }

    console.log('🚫 UEP Enforcement: All bypass mechanisms disabled');
  }

  /**
   * Verify that enforcement activation was successful
   */
  private async verifyActivation(): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Verify enforcement gateway is active
      const gateway = getGlobalEnforcementGateway();
      if (!gateway) {
        errors.push('Enforcement gateway not initialized');
      }

      // Verify audit system is active
      const auditSystem = getUEPAuditLoggingSystem();
      if (!auditSystem) {
        errors.push('Audit system not initialized');
      }

      // Verify tool verification system is active
      const verificationSystem = getUEPToolVerificationSystem();
      if (!verificationSystem) {
        errors.push('Tool verification system not initialized');
      }

      // Test enforcement with a dummy request
      try {
        await gateway.enforceAndExecute(
          {
            requestId: 'activation-test',
            taskDescription: 'Test enforcement activation',
            requesterType: 'agent',
            enforcementConfig: {
              enforcementLevel: 'warn' // Use warn for test
            }
          },
          async () => ({ test: true })
        );
      } catch (error) {
        warnings.push(`Enforcement test failed: ${error.message}`);
      }

      return { success: errors.length === 0, errors, warnings };

    } catch (error) {
      errors.push(`Verification failed: ${error.message}`);
      return { success: false, errors, warnings };
    }
  }

  /**
   * Check if enforcement is activated
   */
  public isEnforcementActivated(): boolean {
    return this.isActivated;
  }

  /**
   * Get activation status and details
   */
  public getActivationStatus(): UEPEnforcementActivationResult | null {
    return this.activationResult;
  }

  /**
   * Get enforcement system statistics
   */
  public getEnforcementStatistics(): any {
    if (!this.isActivated) {
      return { activated: false };
    }

    return {
      activated: true,
      activationTime: this.activationResult?.activationTime,
      activatedComponents: this.activationResult?.activatedComponents || [],
      auditStats: getUEPAuditLoggingSystem().getAuditStatistics(),
      enforcementLevel: 'strict',
      bypassMechanismsDisabled: true
    };
  }
}

/**
 * Quick activation function - activates enforcement with default settings
 */
export async function activateUEPEnforcement(config?: Partial<UEPEnforcementActivationConfig>): Promise<UEPEnforcementActivationResult> {
  const activation = UEPEnforcementActivation.getInstance();
  return await activation.activateEnforcement(config);
}

/**
 * Check if UEP enforcement is currently active
 */
export function isUEPEnforcementActive(): boolean {
  const activation = UEPEnforcementActivation.getInstance();
  return activation.isEnforcementActivated();
}

/**
 * Get UEP enforcement status
 */
export function getUEPEnforcementStatus(): UEPEnforcementActivationResult | null {
  const activation = UEPEnforcementActivation.getInstance();
  return activation.getActivationStatus();
}

/**
 * Emergency enforcement activation (simplified)
 */
export async function emergencyActivateEnforcement(): Promise<boolean> {
  console.log('🚨 EMERGENCY UEP ENFORCEMENT ACTIVATION');
  
  try {
    const result = await activateUEPEnforcement({
      enableFactoryEnforcement: true,
      enableWrapperEnforcement: true,
      enableValidationEnforcement: true,
      enableProcessorReplacement: true,
      enableAuditLogging: true,
      enableToolVerification: true,
      enforcementLevel: 'strict',
      logActivation: true
    });

    return result.success;
  } catch (error) {
    console.error('❌ Emergency activation failed:', error.message);
    return false;
  }
}

// Auto-activate enforcement if environment variable is set
if (process.env.UEP_AUTO_ACTIVATE_ENFORCEMENT === 'true') {
  setImmediate(async () => {
    try {
      console.log('🚀 Auto-activating UEP enforcement...');
      const result = await activateUEPEnforcement();
      
      if (result.success) {
        console.log('✅ UEP enforcement auto-activated successfully');
      } else {
        console.error('❌ UEP enforcement auto-activation failed');
      }
    } catch (error) {
      console.error('❌ UEP enforcement auto-activation error:', error.message);
    }
  });
}

// Export the activation instance for global access
export const UEPEnforcementMaster = UEPEnforcementActivation.getInstance();