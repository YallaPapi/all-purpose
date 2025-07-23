/**
 * Five Document Framework Agent - Public API
 * 
 * Entry point for programmatic usage of the Five Document Framework Agent
 */

export { FiveDocumentFrameworkAgent } from './core/FiveDocumentFrameworkAgent.js';
export { TemplateEngine } from './core/TemplateEngine.js';
export { ConsistencyValidator } from './core/ConsistencyValidator.js';
export { ProjectAnalyzer } from './core/ProjectAnalyzer.js';

export type {
  ProjectConfig,
  DocumentGenerationConfig,
  DocumentGenerationResult,
  DocumentResult,
  GenerationError,
  ConsistencyCheck,
  TemplateContext,
  FiveDocumentFrameworkConfig,
  MetaAgentIntegration,
  EnvironmentConfig,
  ApiIntegration,
  DatabaseIntegration,
  ServiceIntegration
} from './types/index.js';

// Default export for convenience
export { FiveDocumentFrameworkAgent as default } from './core/FiveDocumentFrameworkAgent.js';