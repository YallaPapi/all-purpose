/**
 * Parameter Flow Agent - Main Exports
 * 
 * The INTEGRATION BUILDER for System Architecture
 * Following All-Purpose Pattern: NO hardcoded limitations on integration complexity
 */

// Main Agent Class
export { ParameterFlowAgent } from './core/ParameterFlowAgent.js';

// Core Components
export { IntegrationArchitectureBuilder } from './builders/IntegrationArchitectureBuilder.js';
export { ParameterMappingEngine } from './mappers/ParameterMappingEngine.js';
export { DataTransformationEngine } from './transformers/DataTransformationEngine.js';
export { IntegrationTestBuilder } from './validators/IntegrationTestBuilder.js';
export { MetaAgentCoordinator } from './integrations/MetaAgentCoordinator.js';

// All Type Definitions
export * from './types/index.js';

// CLI Interface (optional import)
export { default as CLI } from './main.js';

// Default Export - Main Agent Class
export { ParameterFlowAgent as default } from './core/ParameterFlowAgent.js';