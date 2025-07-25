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

// Re-export for convenience
export { default } from './core/TemplateEngineFactoryAgent.js';

/**
 * Create a new Template Engine Factory Agent with default configuration
 */
import { TemplateEngineFactoryAgent } from './core/TemplateEngineFactoryAgent.js';
import type { TemplateEngineFactoryConfig } from './types/index.js';

export function createTemplateEngineFactoryAgent(config?: TemplateEngineFactoryConfig): TemplateEngineFactoryAgent {
  return new TemplateEngineFactoryAgent(config);
}

/**
 * Quick-start function for dynamic system generation
 */
export async function generateDynamicSystem(
  systemName: string,
  specification: {
    templateEngine?: 'mustache' | 'handlebars' | 'custom';
    contentTypes?: string[];
    contextTypes?: string[];
    variationRequirements?: string[];
    fallbackRequirements?: string[];
    validationRequirements?: string[];
  },
  options?: {
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
  }
): Promise<TemplateEngineFactoryAgent> {
  const agent = new TemplateEngineFactoryAgent({
    outputDirectory: options?.outputDirectory,
    defaultEngine: specification.templateEngine || 'handlebars',
    integration: {
      context7Integration: options?.integrations?.context7Integration,
      ragSystemIntegration: options?.integrations?.ragSystemCompatible,
      allPurposePatternAgent: true,
      infrastructureOrchestrator: true,
      fiveDocumentFramework: true
    }
  });

  await agent.initialize();

  // Generate the dynamic system
  const request = {
    requestId: `system-${Date.now()}`,
    systemName,
    description: `Generated dynamic system: ${systemName}`,
    
    specification: {
      templateEngine: specification.templateEngine || 'handlebars',
      contentTypes: specification.contentTypes || ['html', 'text'],
      contextTypes: specification.contextTypes || ['default'],
      variationRequirements: specification.variationRequirements || [],
      fallbackRequirements: specification.fallbackRequirements || ['error-handling'],
      validationRequirements: specification.validationRequirements || ['context-validation']
    },
    
    integrationRequirements: {
      metaAgents: options?.integrations?.metaAgents || [],
      externalSystems: options?.integrations?.externalSystems || [],
      context7Integration: options?.integrations?.context7Integration || false,
      ragSystemCompatible: options?.integrations?.ragSystemCompatible || false
    },
    
    qualityRequirements: {
      performanceTargets: options?.quality?.performanceTargets || {},
      scalabilityTargets: options?.quality?.scalabilityTargets || {},
      maintainabilityTargets: options?.quality?.maintainabilityTargets || {},
      testingRequirements: options?.quality?.testingRequirements || []
    },
    
    customRequirements: {},
    advancedOptions: {}
  };

  const result = await agent.generateDynamicSystem(request);
  
  console.log(`🚀 Dynamic system generated successfully: ${systemName}`);
  console.log(`📁 Output location: ${result.generatedSystem.systemId}`);
  console.log(`📊 Files generated: ${result.generation.filesGenerated}`);
  console.log(`⚡ Generation time: ${Math.round(result.generation.duration / 1000)}s`);

  return agent;
}