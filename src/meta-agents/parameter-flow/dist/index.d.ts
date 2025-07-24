/**
 * Parameter Flow Agent - Main Exports
 *
 * The INTEGRATION BUILDER for System Architecture
 * Following All-Purpose Pattern: NO hardcoded limitations on integration complexity
 */
export { ParameterFlowAgent } from './core/ParameterFlowAgent.js';
export { IntegrationArchitectureBuilder } from './builders/IntegrationArchitectureBuilder.js';
export { ParameterMappingEngine } from './mappers/ParameterMappingEngine.js';
export { DataTransformationEngine } from './transformers/DataTransformationEngine.js';
export { IntegrationTestBuilder } from './validators/IntegrationTestBuilder.js';
export { MetaAgentCoordinator } from './integrations/MetaAgentCoordinator.js';
export * from './types/index.js';
export { default as CLI } from './main.js';
export { ParameterFlowAgent as default } from './core/ParameterFlowAgent.js';
//# sourceMappingURL=index.d.ts.map