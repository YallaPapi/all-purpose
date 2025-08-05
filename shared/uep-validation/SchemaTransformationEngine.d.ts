/**
 * UEP Schema Transformation Engine
 *
 * Handles message transformation between different UEP protocol versions,
 * enabling backward and forward compatibility through intelligent schema migration.
 *
 * Key Features:
 * - Bi-directional message transformation
 * - Schema validation and compatibility checking
 * - Field mapping and value transformation
 * - Performance-optimized transformation caching
 * - Comprehensive error handling and reporting
 */
import { UEPMessage } from './UEPProtocolVersioning';
export interface SchemaTransformation {
    fromVersion: string;
    toVersion: string;
    fieldMappings: FieldMapping[];
    valueTransformations: ValueTransformation[];
    validationRules: ValidationRule[];
    performanceLevel: 'fast' | 'standard' | 'comprehensive';
}
export interface FieldMapping {
    sourceField: string;
    targetField: string;
    required: boolean;
    defaultValue?: any;
    transformation?: (value: any) => any;
    validationRule?: string;
}
export interface ValueTransformation {
    field: string;
    fromType: string;
    toType: string;
    transformer: (value: any) => any;
    validator?: (value: any) => boolean;
}
export interface ValidationRule {
    field: string;
    rule: string;
    errorMessage: string;
    severity: 'error' | 'warning' | 'info';
}
export interface TransformationResult {
    success: boolean;
    transformedMessage?: UEPMessage;
    errors: TransformationError[];
    warnings: string[];
    metadata: TransformationMetadata;
}
export interface TransformationError {
    code: string;
    message: string;
    field?: string;
    originalValue?: any;
    expectedType?: string;
}
export interface TransformationMetadata {
    transformationTime: number;
    fromVersion: string;
    toVersion: string;
    fieldsTransformed: number;
    valuesTransformed: number;
    validationsPassed: number;
    validationsFailed: number;
}
export interface UEPProtocolSchema {
    version: string;
    schema: {
        type: 'object';
        properties: Record<string, SchemaProperty>;
        required: string[];
        additionalProperties?: boolean;
    };
    examples: any[];
    documentation: string;
}
export interface SchemaProperty {
    type: string;
    description: string;
    format?: string;
    enum?: any[];
    properties?: Record<string, SchemaProperty>;
    items?: SchemaProperty;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    default?: any;
}
/**
 * Registry for protocol schema transformations
 */
export declare class TransformationRegistry {
    private transformations;
    private schemas;
    private cache;
    constructor();
    /**
     * Get transformation rules between two versions
     */
    getTransformation(fromVersion: string, toVersion: string): SchemaTransformation | null;
    /**
     * Register a new transformation
     */
    registerTransformation(transformation: SchemaTransformation): void;
    /**
     * Get schema for a specific version
     */
    getSchema(version: string): UEPProtocolSchema | null;
    /**
     * Register a new schema
     */
    registerSchema(schema: UEPProtocolSchema): void;
    /**
     * Initialize default transformations between versions
     */
    private initializeDefaultTransformations;
    /**
     * Initialize backward transformations (newer to older versions)
     */
    private initializeBackwardTransformations;
    /**
     * Initialize protocol schemas for each version
     */
    private initializeSchemas;
}
/**
 * Schema Transformation Engine
 */
export declare class SchemaTransformationEngine {
    private registry;
    private compatibilityManager;
    private transformationCache;
    constructor();
    /**
     * Transform message from one version to another
     */
    transformMessage(message: UEPMessage, fromVersion: string, toVersion: string): Promise<TransformationResult>;
    /**
     * Apply transformation rules to message
     */
    private applyTransformation;
    /**
     * Validate transformed message against target schema
     */
    private validateTransformedMessage;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Set nested value in object using dot notation
     */
    private setNestedValue;
    /**
     * Validate field value against rule
     */
    private validateField;
    /**
     * Generate cache key for transformation result
     */
    private generateCacheKey;
    /**
     * Generate hash of message for caching
     */
    private hashMessage;
}
//# sourceMappingURL=SchemaTransformationEngine.d.ts.map