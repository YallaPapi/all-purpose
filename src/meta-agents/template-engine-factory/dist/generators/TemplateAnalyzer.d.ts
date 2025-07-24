/**
 * Template Analyzer - Analyzes templates and conversion opportunities
 *
 * Analyzes existing templates and system requirements to understand conversion opportunities
 * Following All-Purpose Pattern: NO hardcoded limitations on template types or complexity
 */
import { EventEmitter } from 'events';
import { TemplateEngineFactoryConfig, SystemGenerationRequest, TemplateAnalysisResult } from '../types/index.js';
export declare class TemplateAnalyzer extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: TemplateEngineFactoryConfig);
    initialize(): Promise<void>;
    /**
     * Analyze template file for conversion opportunities
     */
    analyzeTemplate(templatePath: string): Promise<TemplateAnalysisResult>;
    /**
     * Analyze system requirements
     */
    analyzeRequirements(request: SystemGenerationRequest): Promise<any>;
    /**
     * Private analysis methods
     */
    private performTemplateAnalysis;
    private generateConversionRecommendations;
    private performAllPurposeAnalysis;
    private extractTemplateVariables;
    private identifyDynamicElements;
    private identifyHardcodedElements;
    private detectTemplateEngine;
    private calculateComplexityScore;
    private identifyOptimizationOpportunities;
    private recommendTemplateEngine;
    private recommendVariations;
    private recommendFallbacks;
    private recommendValidations;
    private estimateConversionEffort;
    private detectAllPurposeViolations;
    private suggestAllPurposeImprovements;
    private calculateComplianceScore;
    private assessUnlimitedScalability;
    private assessComplexity;
    private identifyIntegrationPoints;
    private assessScalabilityRequirements;
    private extractPerformanceTargets;
    private assessCustomizationNeeds;
}
export default TemplateAnalyzer;
//# sourceMappingURL=TemplateAnalyzer.d.ts.map