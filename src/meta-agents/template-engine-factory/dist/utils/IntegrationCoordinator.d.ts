/**
 * Integration Coordinator - Manages integrations with other systems
 *
 * Coordinates integrations with meta-agents, Context7, RAG system, and external APIs
 * Following All-Purpose Pattern: NO hardcoded limitations on integration types
 */
import { EventEmitter } from 'events';
import { TemplateEngineFactoryConfig, MetaAgentIntegration } from '../types/index.js';
export declare class IntegrationCoordinator extends EventEmitter {
    private config;
    private isInitialized;
    private integrations;
    constructor(config: TemplateEngineFactoryConfig);
    initialize(): Promise<void>;
    /**
     * Register a new integration
     */
    registerIntegration(integration: MetaAgentIntegration): Promise<void>;
    /**
     * Get all registered integrations
     */
    getIntegrations(): MetaAgentIntegration[];
    /**
     * Get specific integration by ID
     */
    getIntegration(agentId: string): MetaAgentIntegration | undefined;
    /**
     * Test integration connectivity
     */
    testIntegration(agentId: string): Promise<boolean>;
    /**
     * Send data to integrated system
     */
    sendToIntegration(agentId: string, data: any): Promise<any>;
    /**
     * Private integration initialization methods
     */
    private initializeAllPurposePatternIntegration;
    private initializeInfrastructureOrchestratorIntegration;
    private initializeContext7Integration;
    private initializeRAGSystemIntegration;
    /**
     * Private helper methods
     */
    private transformDataForIntegration;
    private applyDataTransformation;
    private performIntegrationCall;
    private callMetaAgent;
    private callExternalSystem;
    private processIntegrationResponse;
    private transformDetectionToGeneration;
    private transformAnalysisToTemplates;
    private transformStatusReporting;
    private transformHealthMonitoring;
    private transformDocToContext;
    private transformPatternToTemplate;
    private transformKnowledgeToContext;
    private transformSemanticEnrichment;
}
export default IntegrationCoordinator;
//# sourceMappingURL=IntegrationCoordinator.d.ts.map