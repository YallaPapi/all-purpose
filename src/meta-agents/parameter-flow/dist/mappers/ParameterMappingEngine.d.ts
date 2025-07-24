/**
 * Parameter Mapping Engine - Generates parameter mapping between components
 *
 * Creates intelligent parameter mapping systems with unlimited complexity
 * Following All-Purpose Pattern: NO hardcoded limitations on mapping scope
 */
import { EventEmitter } from 'events';
import { ParameterFlowConfig, ParameterMappingSchema, ParameterMappingResult, ValidationChain, SerializationHandler } from '../types/index.js';
export declare class ParameterMappingEngine extends EventEmitter {
    private config;
    private isInitialized;
    private generatedMappings;
    private activeMappings;
    private mappingPerformance;
    constructor(config: ParameterFlowConfig);
    initialize(): Promise<void>;
    /**
     * Generate parameter mapping between components
     */
    generateMapping(request: {
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
     * Generate mappings for topology
     */
    generateMappingsForTopology(topology: any): Promise<ParameterMappingSchema[]>;
    /**
     * Build validation chains for mappings
     */
    buildValidationChains(mappings: ParameterMappingSchema[]): Promise<ValidationChain[]>;
    /**
     * Build serialization handlers for mappings
     */
    buildSerializationHandlers(mappings: ParameterMappingSchema[]): Promise<SerializationHandler[]>;
    /**
     * Private helper methods
     */
    private analyzeSchemas;
    private extractSchemaFields;
    private findCommonFields;
    private analyzeTypeCompatibility;
    private assessSchemaComplexity;
    private generateMappingRules;
    private createTransformationLogic;
    private buildValidationRules;
    private buildParameterSchema;
    private extractParameterDefinitions;
    private extractSchemaConstraints;
    private determineMappingType;
    private assessMappingComplexity;
    private generateMappingTestCases;
    private calculateQualityMetrics;
    private convertToMappingRule;
}
export default ParameterMappingEngine;
//# sourceMappingURL=ParameterMappingEngine.d.ts.map