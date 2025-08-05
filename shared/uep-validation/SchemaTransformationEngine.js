"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaTransformationEngine = exports.TransformationRegistry = void 0;
const VersionCompatibilityMatrix_1 = require("./VersionCompatibilityMatrix");
/**
 * Registry for protocol schema transformations
 */
class TransformationRegistry {
    constructor() {
        this.transformations = new Map();
        this.schemas = new Map();
        this.cache = new Map();
        this.initializeDefaultTransformations();
        this.initializeSchemas();
    }
    /**
     * Get transformation rules between two versions
     */
    getTransformation(fromVersion, toVersion) {
        const key = `${fromVersion}->${toVersion}`;
        return this.transformations.get(key) || null;
    }
    /**
     * Register a new transformation
     */
    registerTransformation(transformation) {
        const key = `${transformation.fromVersion}->${transformation.toVersion}`;
        this.transformations.set(key, transformation);
    }
    /**
     * Get schema for a specific version
     */
    getSchema(version) {
        return this.schemas.get(version) || null;
    }
    /**
     * Register a new schema
     */
    registerSchema(schema) {
        this.schemas.set(schema.version, schema);
    }
    /**
     * Initialize default transformations between versions
     */
    initializeDefaultTransformations() {
        // 1.0 -> 1.1 transformation
        this.registerTransformation({
            fromVersion: '1.0',
            toVersion: '1.1',
            performanceLevel: 'fast',
            fieldMappings: [
                {
                    sourceField: 'error',
                    targetField: 'errorDetails',
                    required: false,
                    transformation: (error) => {
                        if (typeof error === 'string') {
                            return {
                                message: error,
                                code: 'UNKNOWN_ERROR',
                                timestamp: new Date().toISOString(),
                                severity: 'error'
                            };
                        }
                        return error;
                    }
                },
                {
                    sourceField: 'metadata',
                    targetField: 'structuredMetadata',
                    required: false,
                    defaultValue: {},
                    transformation: (metadata) => {
                        if (!metadata || typeof metadata !== 'object') {
                            return { legacy: metadata || null };
                        }
                        return metadata;
                    }
                }
            ],
            valueTransformations: [
                {
                    field: 'timestamp',
                    fromType: 'string',
                    toType: 'string',
                    transformer: (timestamp) => {
                        // Ensure ISO 8601 format
                        try {
                            return new Date(timestamp).toISOString();
                        }
                        catch {
                            return new Date().toISOString();
                        }
                    },
                    validator: (value) => !isNaN(Date.parse(value))
                }
            ],
            validationRules: [
                {
                    field: 'structuredMetadata',
                    rule: 'object',
                    errorMessage: 'Structured metadata must be an object',
                    severity: 'warning'
                }
            ]
        });
        // 1.1 -> 2.0 transformation
        this.registerTransformation({
            fromVersion: '1.1',
            toVersion: '2.0',
            performanceLevel: 'standard',
            fieldMappings: [
                {
                    sourceField: 'agentId',
                    targetField: 'agentIdentifier',
                    required: true,
                    transformation: (agentId) => ({
                        id: agentId,
                        type: 'meta-agent',
                        capabilities: [],
                        version: '2.0'
                    })
                },
                {
                    sourceField: 'circuitBreakerState',
                    targetField: 'circuitBreakerConfig',
                    required: false,
                    defaultValue: {
                        enabled: true,
                        threshold: 5,
                        timeout: 30000,
                        state: 'closed'
                    }
                }
            ],
            valueTransformations: [
                {
                    field: 'payload',
                    fromType: 'object',
                    toType: 'object',
                    transformer: (payload) => {
                        // Add circuit breaker context to payload
                        return {
                            ...payload,
                            circuitBreakerContext: {
                                requestId: Math.random().toString(36).substr(2, 9),
                                timestamp: new Date().toISOString()
                            }
                        };
                    }
                }
            ],
            validationRules: [
                {
                    field: 'agentIdentifier',
                    rule: 'required-object',
                    errorMessage: 'Agent identifier must be a structured object in v2.0',
                    severity: 'error'
                }
            ]
        });
        // 2.0 -> 2.1 transformation
        this.registerTransformation({
            fromVersion: '2.0',
            toVersion: '2.1',
            performanceLevel: 'standard',
            fieldMappings: [
                {
                    sourceField: 'tracing',
                    targetField: 'distributedTracing',
                    required: false,
                    defaultValue: {
                        enabled: true,
                        traceId: null,
                        spanId: null,
                        parentSpanId: null
                    }
                },
                {
                    sourceField: 'performance',
                    targetField: 'performanceMetrics',
                    required: false,
                    defaultValue: {
                        startTime: null,
                        endTime: null,
                        duration: null,
                        memoryUsage: null,
                        cpuUsage: null
                    }
                }
            ],
            valueTransformations: [
                {
                    field: 'distributedTracing',
                    fromType: 'object',
                    toType: 'object',
                    transformer: (tracing) => {
                        if (!tracing || !tracing.traceId) {
                            return {
                                ...tracing,
                                traceId: Math.random().toString(36).substr(2, 16),
                                spanId: Math.random().toString(36).substr(2, 8),
                                startTime: new Date().toISOString()
                            };
                        }
                        return tracing;
                    }
                }
            ],
            validationRules: [
                {
                    field: 'distributedTracing',
                    rule: 'tracing-format',
                    errorMessage: 'Distributed tracing must follow OpenTelemetry format',
                    severity: 'warning'
                }
            ]
        });
        // Backward transformations
        this.initializeBackwardTransformations();
    }
    /**
     * Initialize backward transformations (newer to older versions)
     */
    initializeBackwardTransformations() {
        // 1.1 -> 1.0 (backward compatibility)
        this.registerTransformation({
            fromVersion: '1.1',
            toVersion: '1.0',
            performanceLevel: 'fast',
            fieldMappings: [
                {
                    sourceField: 'errorDetails',
                    targetField: 'error',
                    required: false,
                    transformation: (errorDetails) => {
                        if (typeof errorDetails === 'object' && errorDetails.message) {
                            return errorDetails.message;
                        }
                        return errorDetails;
                    }
                },
                {
                    sourceField: 'structuredMetadata',
                    targetField: 'metadata',
                    required: false,
                    transformation: (structured) => {
                        if (structured && structured.legacy !== undefined) {
                            return structured.legacy;
                        }
                        return structured;
                    }
                }
            ],
            valueTransformations: [],
            validationRules: [
                {
                    field: 'error',
                    rule: 'simple-string',
                    errorMessage: 'Error should be a simple string in v1.0',
                    severity: 'info'
                }
            ]
        });
        // 2.0 -> 1.1 (backward compatibility)
        this.registerTransformation({
            fromVersion: '2.0',
            toVersion: '1.1',
            performanceLevel: 'standard',
            fieldMappings: [
                {
                    sourceField: 'agentIdentifier',
                    targetField: 'agentId',
                    required: true,
                    transformation: (identifier) => {
                        if (typeof identifier === 'object' && identifier.id) {
                            return identifier.id;
                        }
                        return identifier;
                    }
                }
            ],
            valueTransformations: [
                {
                    field: 'payload',
                    fromType: 'object',
                    toType: 'object',
                    transformer: (payload) => {
                        // Remove circuit breaker context for backward compatibility
                        const { circuitBreakerContext, ...cleanPayload } = payload;
                        return cleanPayload;
                    }
                }
            ],
            validationRules: []
        });
        // 2.1 -> 2.0 (backward compatibility)
        this.registerTransformation({
            fromVersion: '2.1',
            toVersion: '2.0',
            performanceLevel: 'fast',
            fieldMappings: [
                {
                    sourceField: 'distributedTracing',
                    targetField: 'tracing',
                    required: false,
                    transformation: (distributedTracing) => {
                        if (distributedTracing) {
                            return {
                                enabled: distributedTracing.enabled || false,
                                id: distributedTracing.traceId
                            };
                        }
                        return null;
                    }
                }
            ],
            valueTransformations: [],
            validationRules: []
        });
    }
    /**
     * Initialize protocol schemas for each version
     */
    initializeSchemas() {
        // UEP v1.0 Schema
        this.registerSchema({
            version: '1.0',
            documentation: 'Basic UEP protocol with minimal features',
            examples: [
                {
                    messageType: 'task',
                    agentId: 'meta-agent-factory',
                    timestamp: '2024-01-01T00:00:00.000Z',
                    payload: { action: 'create-project' },
                    version: '1.0'
                }
            ],
            schema: {
                type: 'object',
                required: ['messageType', 'agentId', 'timestamp', 'payload', 'version'],
                properties: {
                    messageType: {
                        type: 'string',
                        description: 'Type of message being sent',
                        enum: ['task', 'response', 'event', 'query', 'command']
                    },
                    agentId: {
                        type: 'string',
                        description: 'Unique identifier of the sending agent',
                        pattern: '^[a-zA-Z0-9_-]{3,50}$'
                    },
                    timestamp: {
                        type: 'string',
                        description: 'ISO 8601 timestamp',
                        format: 'date-time'
                    },
                    payload: {
                        type: 'object',
                        description: 'Message payload'
                    },
                    version: {
                        type: 'string',
                        description: 'UEP protocol version',
                        enum: ['1.0']
                    },
                    error: {
                        type: 'string',
                        description: 'Error message if applicable'
                    },
                    metadata: {
                        type: 'object',
                        description: 'Additional metadata'
                    }
                }
            }
        });
        // UEP v1.1 Schema
        this.registerSchema({
            version: '1.1',
            documentation: 'Enhanced UEP protocol with improved error reporting',
            examples: [
                {
                    messageType: 'task',
                    agentId: 'meta-agent-factory',
                    timestamp: '2024-01-01T00:00:00.000Z',
                    payload: { action: 'create-project' },
                    version: '1.1',
                    errorDetails: {
                        message: 'Validation failed',
                        code: 'VALIDATION_ERROR',
                        timestamp: '2024-01-01T00:00:00.000Z',
                        severity: 'error'
                    },
                    structuredMetadata: {
                        correlationId: 'abc123',
                        sourceAgent: 'frontend-agent'
                    }
                }
            ],
            schema: {
                type: 'object',
                required: ['messageType', 'agentId', 'timestamp', 'payload', 'version'],
                properties: {
                    messageType: {
                        type: 'string',
                        description: 'Type of message being sent',
                        enum: ['task', 'response', 'event', 'query', 'command']
                    },
                    agentId: {
                        type: 'string',
                        description: 'Unique identifier of the sending agent',
                        pattern: '^[a-zA-Z0-9_-]{3,50}$'
                    },
                    timestamp: {
                        type: 'string',
                        description: 'ISO 8601 timestamp',
                        format: 'date-time'
                    },
                    payload: {
                        type: 'object',
                        description: 'Message payload'
                    },
                    version: {
                        type: 'string',
                        description: 'UEP protocol version',
                        enum: ['1.1']
                    },
                    errorDetails: {
                        type: 'object',
                        description: 'Structured error information',
                        properties: {
                            message: { type: 'string' },
                            code: { type: 'string' },
                            timestamp: { type: 'string', format: 'date-time' },
                            severity: { type: 'string', enum: ['error', 'warning', 'info'] }
                        }
                    },
                    structuredMetadata: {
                        type: 'object',
                        description: 'Structured metadata'
                    }
                }
            }
        });
        // UEP v2.0 Schema
        this.registerSchema({
            version: '2.0',
            documentation: 'Full-featured UEP protocol with circuit breaker integration',
            examples: [
                {
                    messageType: 'task',
                    agentIdentifier: {
                        id: 'meta-agent-factory',
                        type: 'meta-agent',
                        capabilities: ['project-creation'],
                        version: '2.0'
                    },
                    timestamp: '2024-01-01T00:00:00.000Z',
                    payload: {
                        action: 'create-project',
                        circuitBreakerContext: {
                            requestId: 'req123',
                            timestamp: '2024-01-01T00:00:00.000Z'
                        }
                    },
                    version: '2.0',
                    circuitBreakerConfig: {
                        enabled: true,
                        threshold: 5,
                        timeout: 30000,
                        state: 'closed'
                    }
                }
            ],
            schema: {
                type: 'object',
                required: ['messageType', 'agentIdentifier', 'timestamp', 'payload', 'version'],
                properties: {
                    messageType: {
                        type: 'string',
                        description: 'Type of message being sent',
                        enum: ['task', 'response', 'event', 'query', 'command']
                    },
                    agentIdentifier: {
                        type: 'object',
                        description: 'Structured agent identifier',
                        properties: {
                            id: { type: 'string' },
                            type: { type: 'string' },
                            capabilities: { type: 'array', items: { type: 'string' } },
                            version: { type: 'string' }
                        },
                        required: ['id', 'type']
                    },
                    timestamp: {
                        type: 'string',
                        description: 'ISO 8601 timestamp',
                        format: 'date-time'
                    },
                    payload: {
                        type: 'object',
                        description: 'Message payload'
                    },
                    version: {
                        type: 'string',
                        description: 'UEP protocol version',
                        enum: ['2.0']
                    },
                    circuitBreakerConfig: {
                        type: 'object',
                        description: 'Circuit breaker configuration'
                    }
                }
            }
        });
    }
}
exports.TransformationRegistry = TransformationRegistry;
/**
 * Schema Transformation Engine
 */
class SchemaTransformationEngine {
    constructor() {
        this.registry = new TransformationRegistry();
        this.compatibilityManager = new VersionCompatibilityMatrix_1.VersionCompatibilityManager();
        this.transformationCache = new Map();
    }
    /**
     * Transform message from one version to another
     */
    async transformMessage(message, fromVersion, toVersion) {
        const startTime = Date.now();
        // Check cache first
        const cacheKey = this.generateCacheKey(message, fromVersion, toVersion);
        const cached = this.transformationCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const result = {
            success: false,
            errors: [],
            warnings: [],
            metadata: {
                transformationTime: 0,
                fromVersion,
                toVersion,
                fieldsTransformed: 0,
                valuesTransformed: 0,
                validationsPassed: 0,
                validationsFailed: 0
            }
        };
        try {
            // Validate compatibility
            const compatibility = this.compatibilityManager.validateCompatibility(fromVersion, toVersion);
            if (!compatibility.compatible && !compatibility.requiresTransformation) {
                result.errors.push({
                    code: 'INCOMPATIBLE_VERSIONS',
                    message: `Versions ${fromVersion} and ${toVersion} are not compatible`,
                });
                return result;
            }
            // Get transformation rules
            const transformation = this.registry.getTransformation(fromVersion, toVersion);
            if (!transformation) {
                result.errors.push({
                    code: 'NO_TRANSFORMATION_FOUND',
                    message: `No transformation found from ${fromVersion} to ${toVersion}`,
                });
                return result;
            }
            // Apply transformation
            const transformedMessage = await this.applyTransformation(message, transformation, result);
            if (transformedMessage) {
                // Validate transformed message
                await this.validateTransformedMessage(transformedMessage, toVersion, result);
                if (result.errors.length === 0) {
                    result.success = true;
                    result.transformedMessage = transformedMessage;
                }
            }
        }
        catch (error) {
            result.errors.push({
                code: 'TRANSFORMATION_ERROR',
                message: `Transformation failed: ${error instanceof Error ? error.message : String(error)}`
            });
        }
        result.metadata.transformationTime = Date.now() - startTime;
        // Cache result if successful
        if (result.success) {
            this.transformationCache.set(cacheKey, result);
        }
        return result;
    }
    /**
     * Apply transformation rules to message
     */
    async applyTransformation(message, transformation, result) {
        const transformedMessage = { ...message };
        // Apply field mappings
        for (const mapping of transformation.fieldMappings) {
            try {
                const sourceValue = this.getNestedValue(message, mapping.sourceField);
                if (sourceValue !== undefined || mapping.defaultValue !== undefined) {
                    const value = sourceValue !== undefined ? sourceValue : mapping.defaultValue;
                    const transformedValue = mapping.transformation ? mapping.transformation(value) : value;
                    this.setNestedValue(transformedMessage, mapping.targetField, transformedValue);
                    result.metadata.fieldsTransformed++;
                }
                else if (mapping.required) {
                    result.errors.push({
                        code: 'MISSING_REQUIRED_FIELD',
                        message: `Required field ${mapping.sourceField} is missing`,
                        field: mapping.sourceField
                    });
                }
            }
            catch (error) {
                result.errors.push({
                    code: 'FIELD_MAPPING_ERROR',
                    message: `Failed to map field ${mapping.sourceField}: ${error instanceof Error ? error.message : String(error)}`,
                    field: mapping.sourceField
                });
            }
        }
        // Apply value transformations
        for (const valueTransform of transformation.valueTransformations) {
            try {
                const currentValue = this.getNestedValue(transformedMessage, valueTransform.field);
                if (currentValue !== undefined) {
                    const transformedValue = valueTransform.transformer(currentValue);
                    if (valueTransform.validator && !valueTransform.validator(transformedValue)) {
                        result.warnings.push(`Value transformation validation failed for field ${valueTransform.field}`);
                    }
                    else {
                        this.setNestedValue(transformedMessage, valueTransform.field, transformedValue);
                        result.metadata.valuesTransformed++;
                    }
                }
            }
            catch (error) {
                result.errors.push({
                    code: 'VALUE_TRANSFORMATION_ERROR',
                    message: `Failed to transform value for field ${valueTransform.field}: ${error instanceof Error ? error.message : String(error)}`,
                    field: valueTransform.field
                });
            }
        }
        // Apply validation rules
        for (const rule of transformation.validationRules) {
            try {
                const fieldValue = this.getNestedValue(transformedMessage, rule.field);
                const isValid = this.validateField(fieldValue, rule.rule);
                if (isValid) {
                    result.metadata.validationsPassed++;
                }
                else {
                    result.metadata.validationsFailed++;
                    if (rule.severity === 'error') {
                        result.errors.push({
                            code: 'VALIDATION_FAILED',
                            message: rule.errorMessage,
                            field: rule.field
                        });
                    }
                    else {
                        result.warnings.push(`${rule.field}: ${rule.errorMessage}`);
                    }
                }
            }
            catch (error) {
                result.errors.push({
                    code: 'VALIDATION_ERROR',
                    message: `Validation error for field ${rule.field}: ${error instanceof Error ? error.message : String(error)}`,
                    field: rule.field
                });
            }
        }
        return result.errors.length === 0 ? transformedMessage : null;
    }
    /**
     * Validate transformed message against target schema
     */
    async validateTransformedMessage(message, version, result) {
        const schema = this.registry.getSchema(version);
        if (!schema) {
            result.warnings.push(`No schema found for version ${version}, skipping validation`);
            return;
        }
        // Basic schema validation
        const requiredFields = schema.schema.required || [];
        for (const field of requiredFields) {
            if (!(field in message)) {
                result.errors.push({
                    code: 'MISSING_REQUIRED_FIELD',
                    message: `Required field ${field} is missing in transformed message`,
                    field
                });
            }
        }
    }
    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!(key in current)) {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    /**
     * Validate field value against rule
     */
    validateField(value, rule) {
        switch (rule) {
            case 'object':
                return typeof value === 'object' && value !== null;
            case 'required-object':
                return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
            case 'simple-string':
                return typeof value === 'string';
            case 'tracing-format':
                return typeof value === 'object' && value?.traceId && value?.spanId;
            default:
                return true;
        }
    }
    /**
     * Generate cache key for transformation result
     */
    generateCacheKey(message, fromVersion, toVersion) {
        const messageHash = this.hashMessage(message);
        return `${fromVersion}->${toVersion}:${messageHash}`;
    }
    /**
     * Generate hash of message for caching
     */
    hashMessage(message) {
        const key = `${message.messageType}:${message.agentId}:${message.version}:${Object.keys(message.payload).length}`;
        return Buffer.from(key).toString('base64').substring(0, 16);
    }
}
exports.SchemaTransformationEngine = SchemaTransformationEngine;
//# sourceMappingURL=SchemaTransformationEngine.js.map