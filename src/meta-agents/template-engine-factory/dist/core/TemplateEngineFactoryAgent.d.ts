#!/usr/bin/env node
/**
 * Template Engine Factory Agent - The CODE BUILDER for Dynamic Systems
 *
 * This meta-agent converts hardcoded content into dynamic, scalable template systems
 * by generating complete working code that creates unlimited variations from templates.
 *
 * Core Mission: BUILDS ENTIRE DYNAMIC SYSTEMS that generate content (not just templates)
 *
 * Architecture Pattern: Analyze → Generate → Build → Integrate → Deploy
 * Integration: All-Purpose Pattern Agent, IOA, Context7, RAG System
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on content types or use cases
 */
import { EventEmitter } from 'events';
import { TemplateEngineFactoryConfig, TemplateEngineFactoryCapabilities, SystemGenerationRequest, SystemGenerationResult, DynamicTemplateSystem, TemplateAnalysisResult } from '../types/index.js';
/**
 * Template Engine Factory Agent - Builds complete dynamic content generation systems
 * NO limitations on template types, content systems, or complexity levels
 */
export declare class TemplateEngineFactoryAgent extends EventEmitter {
    private config;
    private dynamicSystemBuilder;
    private templateAnalyzer;
    private codeGenerator;
    private integrationCoordinator;
    private isInitialized;
    private generatedSystems;
    private activeGenerations;
    private metaAgentIntegrations;
    constructor(config?: TemplateEngineFactoryConfig);
    /**
     * Initialize the agent - Context7 enhanced setup
     */
    initialize(): Promise<void>;
    /**
     * Generate a complete dynamic template system - main entry point
     */
    generateDynamicSystem(request: SystemGenerationRequest): Promise<SystemGenerationResult>;
    /**
     * Analyze existing templates to understand conversion opportunities
     */
    analyzeTemplate(templatePath: string): Promise<TemplateAnalysisResult>;
    /**
     * Get list of generated systems
     */
    getGeneratedSystems(): DynamicTemplateSystem[];
    /**
     * Get specific generated system by ID
     */
    getGeneratedSystem(systemId: string): DynamicTemplateSystem | undefined;
    /**
     * Get active generation requests
     */
    getActiveGenerations(): SystemGenerationRequest[];
    /**
     * Get agent capabilities
     */
    getCapabilities(): TemplateEngineFactoryCapabilities;
    /**
     * Private helper methods
     */
    private setupEventForwarding;
    private initializeAllPurposePatternIntegration;
    private initializeInfrastructureOrchestratorIntegration;
    private initializeContext7Integration;
    private initializeRAGSystemIntegration;
    private analyzeSystemRequirements;
    private designSystemArchitecture;
    private generateTemplateFiles;
    private generateContextProcessors;
    private generateVariationGenerators;
    private generateFallbackHandlers;
    private generateValidationEngines;
    private generateIntegrationUnits;
    private writeSystemToDisk;
    private countGeneratedFiles;
    private countLinesOfCode;
    private countComponents;
    private assessQuality;
    private assessIntegrations;
    private generateRecommendations;
    private assessDeploymentReadiness;
}
export default TemplateEngineFactoryAgent;
//# sourceMappingURL=TemplateEngineFactoryAgent.d.ts.map