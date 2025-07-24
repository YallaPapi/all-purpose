/**
 * Integration Architecture Builder - Builds complete integration architectures
 *
 * Constructs comprehensive integration systems with unlimited complexity
 * Following All-Purpose Pattern: NO hardcoded limitations on architecture scope
 */
import { EventEmitter } from 'events';
import { ParameterFlowConfig, IntegrationComponent, IntegrationConnection, DataFlowPath, ComponentDependency } from '../types/index.js';
export declare class IntegrationArchitectureBuilder extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: ParameterFlowConfig);
    initialize(): Promise<void>;
    /**
     * Analyze integration requirements and build architecture design
     */
    analyzeRequirements(request: any): Promise<any>;
    /**
     * Design integration topology from requirements
     */
    designTopology(request: any, analysis: any): Promise<any>;
    /**
     * Generate complete integration code
     */
    generateIntegrationCode(topology: any, mappings: any[], pipelines: any[]): Promise<any>;
    /**
     * Build integration components from component specifications
     */
    buildComponents(componentSpecs: any[]): Promise<IntegrationComponent[]>;
    /**
     * Build integration connections between components
     */
    buildConnections(topology: any): Promise<IntegrationConnection[]>;
    /**
     * Build data flow paths through the integration
     */
    buildDataFlowPaths(topology: any): Promise<DataFlowPath[]>;
    /**
     * Analyze component dependencies
     */
    analyzeDependencies(topology: any): Promise<ComponentDependency[]>;
    /**
     * Identify critical paths in the integration
     */
    identifyCriticalPaths(topology: any): Promise<string[]>;
    /**
     * Private helper methods for architecture building
     */
    private assessComplexity;
    private identifyIntegrationPatterns;
    private analyzeDataFlowRequirements;
    private analyzePerformanceRequirements;
    private analyzeReliabilityRequirements;
    private analyzeScalabilityRequirements;
    private determineTopologyType;
    private designComponentLayout;
    private designConnectionStrategy;
    private designDataFlowStrategy;
    private designSynchronizationStrategy;
    private designPerformanceOptimizations;
    private designReliabilityMechanisms;
    private buildSingleComponent;
    private buildSingleConnection;
    private buildSingleDataFlowPath;
    private generateCoreIntegrationFiles;
    private generateComponentAdapters;
    private generateConnectionHandlers;
    private generateDataFlowControllers;
    private generateSynchronizationServices;
    private generateMonitoringInstrumentation;
    private generateConfigurationFiles;
    private generateDeploymentScripts;
    private generateIntegrationOrchestratorCode;
    private generateComponentAdapterCode;
    private groupComponentsByFunction;
    private determineIsolationRequirements;
    private calculateResourceAllocation;
    private determineDeploymentStrategy;
    private selectOptimalProtocols;
    private designLoadBalancing;
    private designCircuitBreaking;
    private designRetryPolicies;
    private designBufferingStrategy;
    private designBackpressureHandling;
    private designFlowControl;
    private designPrioritization;
    private selectConsistencyModel;
    private designLockingStrategy;
    private designTransactionManagement;
    private designConflictResolution;
    private designCompressionStrategy;
    private designConnectionPooling;
    private designBatchingOptimizations;
    private designParallelizationStrategy;
    private designHealthChecking;
    private designFailoverMechanisms;
    private designDisasterRecovery;
    private designMonitoring;
    private buildParameterDefinitions;
    private buildEventDefinitions;
    private buildMethodDefinitions;
    private generateConnectionSpecs;
    private identifyDataFlowPaths;
    private identifyDependencies;
    private analyzeCriticalityOfPaths;
    private buildTransformationSteps;
    private buildValidationRules;
    private buildErrorHandlingStrategies;
    private buildDataFlowSteps;
    private calculatePathLatency;
    private calculatePathReliability;
    private generateConnectionHandlerCode;
    private generateDataFlowControllerCode;
    private generateSynchronizationServiceCode;
    private generateMonitoringServiceCode;
    private generateDockerComposeFile;
}
export default IntegrationArchitectureBuilder;
//# sourceMappingURL=IntegrationArchitectureBuilder.d.ts.map