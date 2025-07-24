#!/usr/bin/env node
/**
 * Parameter Flow Agent - The INTEGRATION BUILDER for System Architecture
 *
 * This meta-agent ensures bulletproof data flow between all system components by:
 * 1. Building complete integration architecture with unlimited complexity
 * 2. Generating parameter mapping systems that handle any data transformation
 * 3. Creating data transformation pipelines with unlimited scalability
 * 4. Building comprehensive integration testing frameworks
 * 5. Coordinating seamless data flow across all meta-agents
 * 6. Generating bulletproof integration code for production systems
 *
 * Architecture Pattern: Analyze → Build → Map → Transform → Test → Deploy
 * Integration: All Meta-Agents, Context7, RAG System, External APIs
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on integration complexity
 */
import { EventEmitter } from 'events';
import { ParameterFlowConfig, ParameterFlowCapabilities, IntegrationArchitecture, IntegrationArchitectureResult, ParameterMappingResult, IntegrationTestResult, ParameterMappingSchema, TransformationPipeline } from '../types/index.js';
/**
 * Parameter Flow Agent - Builds complete integration architecture for unlimited system complexity
 * NO limitations on integration depth, parameter complexity, or data flow patterns
 */
export declare class ParameterFlowAgent extends EventEmitter {
    private config;
    private architectureBuilder;
    private parameterMapper;
    private transformationEngine;
    private testBuilder;
    private metaAgentCoordinator;
    private isInitialized;
    private builtArchitectures;
    private parameterMappings;
    private transformationPipelines;
    private testSuites;
    private activeIntegrations;
    constructor(config?: ParameterFlowConfig);
    /**
     * Initialize the agent - Context7 enhanced setup
     */
    initialize(): Promise<void>;
    /**
     * Build complete integration architecture - main entry point
     */
    buildIntegrationArchitecture(request: {
        architectureName: string;
        description: string;
        components: {
            componentId: string;
            componentType: 'meta-agent' | 'external-service' | 'data-store' | 'processing-unit';
            interface: {
                inputParameters: any[];
                outputParameters: any[];
                events: any[];
                methods: any[];
            };
            configuration?: Record<string, any>;
        }[];
        integrationRequirements: {
            dataFlowPatterns: string[];
            synchronizationNeeds: string[];
            performanceTargets: Record<string, any>;
            reliabilityRequirements: Record<string, any>;
        };
        qualityRequirements?: Record<string, any>;
        customRequirements?: Record<string, any>;
    }): Promise<IntegrationArchitectureResult>;
    /**
     * Generate parameter mapping between components
     */
    generateParameterMapping(request: {
        mappingName: string;
        sourceComponent: string;
        targetComponent: string;
        sourceSchema: any;
        targetSchema: any;
        mappingRules?: any[];
        transformationLogic?: any[];
        validationRules?: any[];
    }): Promise<ParameterMappingResult>;
    /**
     * Run comprehensive integration tests
     */
    runIntegrationTests(request: {
        testSuiteId?: string;
        architectureId?: string;
        testScope?: 'unit' | 'integration' | 'system' | 'performance' | 'all';
        testConfiguration?: Record<string, any>;
    }): Promise<IntegrationTestResult>;
    /**
     * Get built architectures
     */
    getBuiltArchitectures(): IntegrationArchitecture[];
    /**
     * Get specific architecture by ID
     */
    getArchitecture(architectureId: string): IntegrationArchitecture | undefined;
    /**
     * Get parameter mappings
     */
    getParameterMappings(): ParameterMappingSchema[];
    /**
     * Get transformation pipelines
     */
    getTransformationPipelines(): TransformationPipeline[];
    /**
     * Get active integrations
     */
    getActiveIntegrations(): any[];
    /**
     * Get agent capabilities
     */
    getCapabilities(): ParameterFlowCapabilities;
    /**
     * Private helper methods
     */
    private setupEventForwarding;
    private initializeMetaAgentIntegrations;
    private initializeContext7Integration;
    private initializeRAGSystemIntegration;
    private analyzeIntegrationRequirements;
    private designIntegrationTopology;
    private generateParameterMappings;
    private buildTransformationPipelines;
    private createIntegrationTestSuites;
    private generateIntegrationCode;
    private buildIntegrationComponents;
    private buildIntegrationConnections;
    private buildDataFlowPaths;
    private analyzeDependencies;
    private identifyCriticalPaths;
    private buildValidationChains;
    private buildSerializationHandlers;
    private buildFlowControllers;
    private buildSynchronizationPoints;
    private buildConflictResolvers;
    private buildIntegrityCheckers;
    private buildMockingFrameworks;
    private buildPerformanceMonitors;
    private buildValidationEngines;
    private assessArchitectureQuality;
    private generateDeploymentConfiguration;
    private writeArchitectureToDisk;
    private assessIntegrationCapabilities;
    private validateArchitecture;
    private assessDeploymentReadiness;
    private generateArchitectureRecommendations;
}
export default ParameterFlowAgent;
//# sourceMappingURL=ParameterFlowAgent.d.ts.map