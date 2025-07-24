/**
 * Data Transformation Engine - Builds data transformation pipelines
 *
 * Creates unlimited scalability data transformation pipelines
 * Following All-Purpose Pattern: NO hardcoded limitations on pipeline complexity
 */
import { EventEmitter } from 'events';
import { ParameterFlowConfig, TransformationPipeline, DataFlowController, SynchronizationPoint, ConflictResolver, IntegrityChecker } from '../types/index.js';
export declare class DataTransformationEngine extends EventEmitter {
    private config;
    private isInitialized;
    private activePipelines;
    private pipelinePerformance;
    private transformationCache;
    constructor(config: ParameterFlowConfig);
    initialize(): Promise<void>;
    /**
     * Build transformation pipelines for mappings
     */
    buildPipelinesForMappings(topology: any, mappings: any[]): Promise<TransformationPipeline[]>;
    /**
     * Build flow controllers for topology
     */
    buildFlowControllers(topology: any): Promise<DataFlowController[]>;
    /**
     * Build synchronization points for topology
     */
    buildSynchronizationPoints(topology: any): Promise<SynchronizationPoint[]>;
    /**
     * Build conflict resolvers for topology
     */
    buildConflictResolvers(topology: any): Promise<ConflictResolver[]>;
    /**
     * Build integrity checkers for topology
     */
    buildIntegrityCheckers(topology: any): Promise<IntegrityChecker[]>;
    /**
     * Private helper methods for pipeline building
     */
    private buildSinglePipeline;
    private buildTransformationSteps;
    private mapLogicTypeToStepType;
    private determineExecutionMode;
    private buildRetryPolicy;
    private buildErrorHandlingStrategies;
    private buildMonitoringConfiguration;
    private buildCachingStrategy;
    private buildPartitioningStrategy;
    private buildLoadBalancingStrategy;
    private buildResourceAllocation;
    private optimizePipelineConnections;
    private canFusePipelines;
    private calculateTotalResourceUsage;
}
export default DataTransformationEngine;
//# sourceMappingURL=DataTransformationEngine.d.ts.map