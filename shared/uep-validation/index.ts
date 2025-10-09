/**
 * UEP Validation Architecture - Public API
 * Exports all validation components for use across the system
 */

export {
  UEPValidationEngine,
  UEPValidationMiddleware,
  UEPValidationConfig,
  UEPValidationResult,
  ValidationError,
  ValidationMetadata
} from './UEPValidationArchitecture';

// Re-export for convenience
export default { UEPValidationEngine, UEPValidationMiddleware };