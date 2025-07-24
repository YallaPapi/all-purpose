/**
 * Code Generation Engine - The actual CODE BUILDER
 *
 * Generates complete working TypeScript/JavaScript code for dynamic template systems
 * Following All-Purpose Pattern: NO hardcoded limitations on generated code complexity
 */
import { EventEmitter } from 'events';
import { TemplateEngineFactoryConfig, GeneratedTemplateFile, GeneratedContextProcessor, GeneratedVariationGenerator, GeneratedFallbackHandler, GeneratedValidationEngine, GeneratedIntegrationUnit } from '../types/index.js';
export declare class CodeGenerationEngine extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: TemplateEngineFactoryConfig);
    initialize(): Promise<void>;
    /**
     * Generate template files for the dynamic system
     */
    generateTemplateFiles(architecture: any): Promise<GeneratedTemplateFile[]>;
    /**
     * Generate context processors - CODE that processes template context
     */
    generateContextProcessors(architecture: any): Promise<GeneratedContextProcessor[]>;
    /**
     * Generate variation generators - CODE that creates content variations
     */
    generateVariationGenerators(architecture: any): Promise<GeneratedVariationGenerator[]>;
    /**
     * Generate fallback handlers - CODE that handles failures gracefully
     */
    generateFallbackHandlers(architecture: any): Promise<GeneratedFallbackHandler[]>;
    /**
     * Generate validation engines - CODE that validates templates and context
     */
    generateValidationEngines(architecture: any): Promise<GeneratedValidationEngine[]>;
    /**
     * Generate integration units - CODE that integrates with other systems
     */
    generateIntegrationUnits(architecture: any): Promise<GeneratedIntegrationUnit[]>;
    /**
     * Private code generation methods
     */
    private generateMainTemplateFile;
    private generateVariationTemplateFiles;
    private generateFallbackTemplateFiles;
    private generateMainContextProcessor;
    private generateSpecializedContextProcessor;
    private generateVariationGenerator;
    private generateFallbackHandler;
    private generateValidationEngine;
    private generateMetaAgentIntegrationUnit;
    private generateContext7IntegrationUnit;
    private generateRAGSystemIntegrationUnit;
    /**
     * Code generation helper methods
     */
    private getTemplateFileExtension;
    private generateHandlebarsTemplate;
    private generateMustacheTemplate;
    private generateHandlebarsVariationTemplate;
    private generateMustacheVariationTemplate;
    private generateFallbackTemplate;
    private generateContextProcessorCode;
    private generateVariationGeneratorCode;
    private generateFallbackHandlerCode;
    private generateValidationEngineCode;
    private generateMetaAgentIntegrationCode;
    private generateContext7IntegrationCode;
    private generateRAGSystemIntegrationCode;
    private generateContextSchema;
    private generateVariationContextSchema;
    private generateFallbackContextSchema;
    private getTemplateDependencies;
    private generateProcessingRules;
    private generateSpecializedProcessingRules;
    private generateTransformationChain;
    private generateSpecializedTransformationChain;
    private generateValidationSchema;
    private generateSpecializedValidationSchema;
    private generateVariationStrategies;
    private getSupportedParameters;
    private getCustomizationOptions;
    private generateFallbackStrategies;
    private getTriggerConditions;
    private getRecoveryPatterns;
    private getEscalationPaths;
    private generateValidationRules;
    private getSupportedSchemas;
    private generateErrorHandlingStrategies;
    private getPerformanceOptimizations;
    private getMetaAgentIntegrationPoints;
    private getMetaAgentDataTransformations;
}
export default CodeGenerationEngine;
//# sourceMappingURL=CodeGenerationEngine.d.ts.map