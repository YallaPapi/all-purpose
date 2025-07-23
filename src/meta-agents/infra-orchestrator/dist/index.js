/**
 * Infrastructure Orchestrator Agent - Public API
 *
 * Use context7: Main exports for IOA functionality
 * Following All-Purpose Pattern: Configurable API that works with ANY project structure
 */
// Core components
export { InfraOrchestrator } from './core/InfraOrchestrator.js';
// Pattern detection system
export { PatternDetectionEngine } from './patterns/PatternDetectionEngine.js';
export { PatternRegistry } from './patterns/PatternRegistry.js';
export { ResultClassifier } from './patterns/ResultClassifier.js';
// Template generation system
export { TemplateRegistry, TemplateEngine, TemplateLoader } from './templates/index.js';
export { createTemplateSystem, createIntegratedTemplateSystem, createQuickTemplateSystem } from './templates/factory.js';
// Individual detectors
export { HardcodedArrayDetector } from './patterns/detectors/HardcodedArrayDetector.js';
export { LimitationConstantDetector } from './patterns/detectors/LimitationConstantDetector.js';
export { ConditionalLogicDetector } from './patterns/detectors/ConditionalLogicDetector.js';
export { HardcodedEndpointDetector } from './patterns/detectors/HardcodedEndpointDetector.js';
export { HardcodedUITextDetector } from './patterns/detectors/HardcodedUITextDetector.js';
// Types and interfaces
export * from './types/config.js';
export * from './patterns/types.js';
export * from './templates/types.js';
// Utilities
export { logger } from './utils/logger.js';
// Default configuration
export const DEFAULT_IOA_CONFIG = {
    mode: 'orchestrate',
    enableRAGIntegration: true,
    enableMetaAgentCoordination: true,
    enableAutoComplianceEnforcement: true,
    orchestration: {
        enableAutoDocs: true,
        enableAutoTasks: true
    },
    compliance: {
        allPurposePatternEnforcement: true,
        environmentValidation: true,
        parameterMappingValidation: true,
        debugEndpointValidation: true,
        hardcodeDetection: true,
        ragUsageValidation: true
    },
    cicd: {
        enableGitHubActions: false,
        enableAutoPR: false,
        enableAutoCommit: false,
        branchProtection: true
    }
};
//# sourceMappingURL=index.js.map