/**
 * Infrastructure Orchestrator Agent - Public API
 *
 * Use context7: Main exports for IOA functionality
 * Following All-Purpose Pattern: Configurable API that works with ANY project structure
 */
export { InfraOrchestrator } from './core/InfraOrchestrator.js';
export { PatternDetectionEngine, CodebaseAnalysisReport } from './patterns/PatternDetectionEngine.js';
export { PatternRegistry } from './patterns/PatternRegistry.js';
export { ResultClassifier, ClassificationReport, IssueCategory } from './patterns/ResultClassifier.js';
export { TemplateRegistry, TemplateEngine, TemplateLoader } from './templates/index.js';
export { createTemplateSystem, createIntegratedTemplateSystem, createQuickTemplateSystem } from './templates/factory.js';
export { HardcodedArrayDetector } from './patterns/detectors/HardcodedArrayDetector.js';
export { LimitationConstantDetector } from './patterns/detectors/LimitationConstantDetector.js';
export { ConditionalLogicDetector } from './patterns/detectors/ConditionalLogicDetector.js';
export { HardcodedEndpointDetector } from './patterns/detectors/HardcodedEndpointDetector.js';
export { HardcodedUITextDetector } from './patterns/detectors/HardcodedUITextDetector.js';
export * from './types/config.js';
export * from './patterns/types.js';
export * from './templates/types.js';
export { logger } from './utils/logger.js';
export declare const DEFAULT_IOA_CONFIG: Partial<import('./types/config.js').IOAConfig>;
//# sourceMappingURL=index.d.ts.map