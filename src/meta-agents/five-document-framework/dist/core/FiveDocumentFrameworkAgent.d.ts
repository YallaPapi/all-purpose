#!/usr/bin/env node
/**
 * Five Document Framework Agent - The Systematizer
 *
 * This meta-agent implements systematic documentation generation by:
 * 1. Analyzing project structure and configuration
 * 2. Generating the 5 core documents using dynamic templates
 * 3. Validating cross-document consistency
 * 4. Integrating with other meta-agents for unified workflow
 *
 * Architecture Pattern: Analyze → Generate → Validate → Integrate
 * Integration: TaskMaster API, Context7, PRD-Parser, Scaffold-Generator
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on project types
 */
import { EventEmitter } from 'events';
import { ProjectConfig, DocumentGenerationConfig, DocumentGenerationResult, FiveDocumentFrameworkConfig } from '../types/index.js';
/**
 * Five Document Framework Agent - Generates systematic documentation
 * NO limitations on project types, technologies, or configurations
 */
export declare class FiveDocumentFrameworkAgent extends EventEmitter {
    private config;
    private templateEngine;
    private consistencyValidator;
    private projectAnalyzer;
    private isInitialized;
    private readonly coreDocuments;
    constructor(config: FiveDocumentFrameworkConfig);
    /**
     * Initialize the agent - Context7 enhanced setup
     */
    initialize(): Promise<void>;
    /**
     * Generate documentation framework - main entry point
     */
    generate(input?: {
        projectOverride?: ProjectConfig;
        generationOverride?: DocumentGenerationConfig;
        documentsToGenerate?: string[];
        validateOnly?: boolean;
    }): Promise<DocumentGenerationResult>;
    /**
     * Generate individual document
     */
    private generateDocument;
    /**
     * Create template context with all necessary data
     */
    private createTemplateContext;
    /**
     * Extract technologies from project config
     */
    private extractTechnologies;
    /**
     * Get template name for document type
     */
    private getTemplateName;
    /**
     * Backup existing document
     */
    private backupExistingDocument;
    /**
     * Extract variables used in template context
     */
    private extractVariables;
    /**
     * Register Handlebars helpers
     */
    private registerHandlebarsHelpers;
    /**
     * Get agent capabilities
     */
    getCapabilities(): Record<string, any>;
}
export default FiveDocumentFrameworkAgent;
