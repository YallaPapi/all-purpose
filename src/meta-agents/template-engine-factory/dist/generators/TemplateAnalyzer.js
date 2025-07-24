/**
 * Template Analyzer - Analyzes templates and conversion opportunities
 *
 * Analyzes existing templates and system requirements to understand conversion opportunities
 * Following All-Purpose Pattern: NO hardcoded limitations on template types or complexity
 */
import { EventEmitter } from 'events';
import fs from 'fs-extra';
import chalk from 'chalk';
export class TemplateAnalyzer extends EventEmitter {
    config;
    isInitialized = false;
    constructor(config) {
        super();
        this.config = config;
    }
    async initialize() {
        this.isInitialized = true;
        console.log(chalk.blue('🔍 Template Analyzer initialized'));
    }
    /**
     * Analyze template file for conversion opportunities
     */
    async analyzeTemplate(templatePath) {
        console.log(chalk.blue(`🔍 Analyzing template: ${templatePath}`));
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const analysisId = `analysis-${Date.now()}`;
        // Analyze template content
        const analysis = this.performTemplateAnalysis(templateContent);
        // Generate conversion recommendations
        const recommendations = this.generateConversionRecommendations(analysis);
        // Perform All-Purpose Pattern analysis
        const allPurposeAnalysis = this.performAllPurposeAnalysis(templateContent, analysis);
        const result = {
            analysisId,
            templatePath,
            templateContent,
            analysis,
            recommendations,
            allPurposeAnalysis
        };
        this.emit('analyzer:complete', {
            templatePath,
            result,
            timestamp: new Date().toISOString()
        });
        return result;
    }
    /**
     * Analyze system requirements
     */
    async analyzeRequirements(request) {
        console.log(chalk.blue(`📋 Analyzing requirements for: ${request.systemName}`));
        const analysis = {
            complexity: this.assessComplexity(request),
            integrationPoints: this.identifyIntegrationPoints(request),
            scalabilityRequirements: this.assessScalabilityRequirements(request),
            performanceTargets: this.extractPerformanceTargets(request),
            customizationNeeds: this.assessCustomizationNeeds(request)
        };
        return analysis;
    }
    /**
     * Private analysis methods
     */
    performTemplateAnalysis(content) {
        const variables = this.extractTemplateVariables(content);
        const dynamicElements = this.identifyDynamicElements(content);
        const hardcodedElements = this.identifyHardcodedElements(content);
        return {
            templateEngine: this.detectTemplateEngine(content),
            contextVariables: variables,
            dynamicElements,
            hardcodedElements,
            complexityScore: this.calculateComplexityScore(variables, dynamicElements, hardcodedElements),
            optimizationOpportunities: this.identifyOptimizationOpportunities(content, dynamicElements)
        };
    }
    generateConversionRecommendations(analysis) {
        return {
            suggestedTemplateEngine: this.recommendTemplateEngine(analysis),
            suggestedVariations: this.recommendVariations(analysis),
            suggestedFallbacks: this.recommendFallbacks(analysis),
            suggestedValidations: this.recommendValidations(analysis),
            estimatedEffort: this.estimateConversionEffort(analysis)
        };
    }
    performAllPurposeAnalysis(content, analysis) {
        const violations = this.detectAllPurposeViolations(content);
        const improvements = this.suggestAllPurposeImprovements(violations);
        return {
            complianceScore: this.calculateComplianceScore(violations),
            violations,
            improvements,
            unlimitedScalabilityScore: this.assessUnlimitedScalability(analysis)
        };
    }
    extractTemplateVariables(content) {
        const variables = [];
        // Extract Mustache variables {{variable}}
        const mustacheMatches = content.match(/\{\{([^}]+)\}\}/g);
        if (mustacheMatches) {
            mustacheMatches.forEach(match => {
                const variable = match.replace(/[\{\}]/g, '').trim();
                if (!variables.includes(variable)) {
                    variables.push(variable);
                }
            });
        }
        // Extract Handlebars variables {{variable}}
        const handlebarsMatches = content.match(/\{\{([^}]+)\}\}/g);
        if (handlebarsMatches) {
            handlebarsMatches.forEach(match => {
                const variable = match.replace(/[\{\}]/g, '').trim();
                if (!variables.includes(variable)) {
                    variables.push(variable);
                }
            });
        }
        return variables;
    }
    identifyDynamicElements(content) {
        const elements = [];
        // Identify loops, conditionals, and dynamic content
        if (content.includes('{{#each')) {
            elements.push('iterative-content');
        }
        if (content.includes('{{#if')) {
            elements.push('conditional-content');
        }
        if (content.includes('{{>')) {
            elements.push('partial-templates');
        }
        return elements;
    }
    identifyHardcodedElements(content) {
        const elements = [];
        // Identify hardcoded text, arrays, and values
        const hardcodedStrings = content.match(/"[^"]*"/g) || [];
        const hardcodedNumbers = content.match(/\b\d+\b/g) || [];
        if (hardcodedStrings.length > 0) {
            elements.push('hardcoded-strings');
        }
        if (hardcodedNumbers.length > 0) {
            elements.push('hardcoded-numbers');
        }
        return elements;
    }
    detectTemplateEngine(content) {
        if (content.includes('{{#') || content.includes('{{/')) {
            return 'handlebars';
        }
        if (content.includes('{{') && content.includes('}}')) {
            return 'mustache';
        }
        return 'unknown';
    }
    calculateComplexityScore(variables, dynamicElements, hardcodedElements) {
        return variables.length * 2 + dynamicElements.length * 5 + hardcodedElements.length * 3;
    }
    identifyOptimizationOpportunities(content, dynamicElements) {
        const opportunities = [];
        if (dynamicElements.includes('iterative-content')) {
            opportunities.push('optimize-loops');
        }
        if (dynamicElements.includes('conditional-content')) {
            opportunities.push('optimize-conditionals');
        }
        if (content.length > 10000) {
            opportunities.push('template-splitting');
        }
        return opportunities;
    }
    recommendTemplateEngine(analysis) {
        if (analysis.dynamicElements.length > 3) {
            return 'handlebars';
        }
        return 'mustache';
    }
    recommendVariations(analysis) {
        const variations = [];
        if (analysis.contextVariables.some((v) => v.includes('industry'))) {
            variations.push('industry-specific');
        }
        if (analysis.contextVariables.some((v) => v.includes('location'))) {
            variations.push('location-specific');
        }
        if (analysis.contextVariables.some((v) => v.includes('persona'))) {
            variations.push('persona-specific');
        }
        return variations;
    }
    recommendFallbacks(analysis) {
        return ['default-content', 'error-handling', 'graceful-degradation'];
    }
    recommendValidations(analysis) {
        return ['context-validation', 'content-validation', 'output-validation'];
    }
    estimateConversionEffort(analysis) {
        const score = analysis.complexityScore;
        if (score < 20)
            return 'low';
        if (score < 50)
            return 'medium';
        return 'high';
    }
    detectAllPurposeViolations(content) {
        const violations = [];
        // Check for hardcoded limitations
        if (content.includes('[') && content.includes(']')) {
            violations.push('hardcoded-arrays');
        }
        if (content.match(/\b(max|limit|only)\b/i)) {
            violations.push('hardcoded-limitations');
        }
        if (content.match(/\b(specific|fixed|constant)\b/i)) {
            violations.push('hardcoded-constraints');
        }
        return violations;
    }
    suggestAllPurposeImprovements(violations) {
        const improvements = [];
        violations.forEach(violation => {
            switch (violation) {
                case 'hardcoded-arrays':
                    improvements.push('convert-to-dynamic-arrays');
                    break;
                case 'hardcoded-limitations':
                    improvements.push('remove-artificial-limits');
                    break;
                case 'hardcoded-constraints':
                    improvements.push('implement-unlimited-scalability');
                    break;
            }
        });
        return improvements;
    }
    calculateComplianceScore(violations) {
        const maxScore = 100;
        const penaltyPerViolation = 15;
        return Math.max(0, maxScore - (violations.length * penaltyPerViolation));
    }
    assessUnlimitedScalability(analysis) {
        let score = 100;
        if (analysis.hardcodedElements.length > 0) {
            score -= analysis.hardcodedElements.length * 10;
        }
        if (analysis.complexityScore > 100) {
            score -= 20; // High complexity might limit scalability
        }
        return Math.max(0, score);
    }
    assessComplexity(request) {
        const factors = [
            request.specification.contentTypes.length,
            request.specification.contextTypes.length,
            request.specification.variationRequirements.length,
            request.integrationRequirements.metaAgents.length
        ];
        const totalComplexity = factors.reduce((sum, factor) => sum + factor, 0);
        if (totalComplexity < 10)
            return 'low';
        if (totalComplexity < 25)
            return 'medium';
        return 'high';
    }
    identifyIntegrationPoints(request) {
        return [
            ...request.integrationRequirements.metaAgents,
            ...request.integrationRequirements.externalSystems
        ];
    }
    assessScalabilityRequirements(request) {
        return {
            horizontal: true,
            vertical: true,
            distributed: request.integrationRequirements.externalSystems.length > 0,
            edge: false // Can be configured based on requirements
        };
    }
    extractPerformanceTargets(request) {
        return request.qualityRequirements.performanceTargets || {
            renderTime: 100, // ms
            throughput: 1000, // requests/second
            memoryUsage: 'optimized'
        };
    }
    assessCustomizationNeeds(request) {
        return {
            templateCustomization: request.specification.variationRequirements.length > 0,
            contextCustomization: request.specification.contextTypes.length > 1,
            integrationCustomization: request.integrationRequirements.metaAgents.length > 0,
            advancedCustomization: Object.keys(request.customRequirements || {}).length > 0
        };
    }
}
export default TemplateAnalyzer;
//# sourceMappingURL=TemplateAnalyzer.js.map