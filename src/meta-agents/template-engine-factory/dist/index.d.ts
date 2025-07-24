/**
 * Template Engine Factory Agent - Main Export
 *
 * The CODE BUILDER for Dynamic Systems - Converts hardcoded content into
 * dynamic, scalable template systems by generating complete working code.
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on template types or complexity
 */
export { TemplateEngineFactoryAgent } from './core/TemplateEngineFactoryAgent.js';
export { DynamicSystemBuilder } from './generators/DynamicSystemBuilder.js';
export { TemplateAnalyzer } from './generators/TemplateAnalyzer.js';
export { CodeGenerationEngine } from './generators/CodeGenerationEngine.js';
export { IntegrationCoordinator } from './utils/IntegrationCoordinator.js';
export * from './types/index.js';
export { default } from './core/TemplateEngineFactoryAgent.js';
/**
 * Create a new Template Engine Factory Agent with default configuration
 */
import { TemplateEngineFactoryAgent } from './core/TemplateEngineFactoryAgent.js';
import type { TemplateEngineFactoryConfig } from './types/index.js';
export declare function createTemplateEngineFactoryAgent(config?: TemplateEngineFactoryConfig): TemplateEngineFactoryAgent;
/**
 * Quick-start function for dynamic system generation
 */
export declare function generateDynamicSystem(systemName: string, specification: {
    templateEngine?: 'mustache' | 'handlebars' | 'custom';
    contentTypes?: string[];
    contextTypes?: string[];
    variationRequirements?: string[];
    fallbackRequirements?: string[];
    validationRequirements?: string[];
}, options?: {
    outputDirectory?: string;
    integrations?: {
        metaAgents?: string[];
        externalSystems?: string[];
        context7Integration?: boolean;
        ragSystemCompatible?: boolean;
    };
    quality?: {
        performanceTargets?: Record<string, any>;
        scalabilityTargets?: Record<string, any>;
        maintainabilityTargets?: Record<string, any>;
        testingRequirements?: string[];
    };
}): Promise<TemplateEngineFactoryAgent>;
//# sourceMappingURL=index.d.ts.map