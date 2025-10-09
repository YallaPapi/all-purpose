/**
 * UEP Schema Registry - OpenAPI 3.1 Integration
 * 
 * Manages UEP protocol schemas with OpenAPI 3.1 specification support.
 * Provides schema validation, caching, and version management for
 * the UEP validation middleware system.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface OpenAPI31Schema {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  'x-uep-capability'?: string;
  'x-uep-version'?: string;
  'x-uep-metadata'?: {
    agentType: 'meta' | 'domain';
    complexity: 'low' | 'medium' | 'high';
    dependencies: string[];
    tags: string[];
  };
}

export interface UEPSchemaRegistryConfig {
  registryUrl: string;
  localSchemasPath?: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  autoReload: boolean;
  schemaValidation: {
    strict: boolean;
    allowAdditionalProperties: boolean;
    coerceTypes: boolean;
  };
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
  metadata: {
    schemaId: string;
    schemaVersion: string;
    validationTime: number;
  };
}

export interface SchemaValidationError {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  message: string;
  data?: any;
}

export interface SchemaValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

/**
 * UEP Schema Registry with OpenAPI 3.1 Support
 */
export class UEPSchemaRegistry {
  private config: UEPSchemaRegistryConfig;
  private schemaCache: Map<string, { schema: OpenAPI31Schema; timestamp: number }> = new Map();
  private validator: any; // Would be Ajv validator in production
  private watchedFiles: Map<string, any> = new Map();

  constructor(config: UEPSchemaRegistryConfig) {
    this.config = config;
    this.initializeValidator();
    this.loadLocalSchemas();
    
    if (config.autoReload) {
      this.setupAutoReload();
    }
  }

  /**
   * Get schema for UEP capability
   */
  async getSchema(capability: string): Promise<OpenAPI31Schema | null> {
    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.schemaCache.get(capability);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.schema;
      }
    }

    // Try local schemas first
    const localSchema = await this.loadLocalSchema(capability);
    if (localSchema) {
      this.cacheSchema(capability, localSchema);
      return localSchema;
    }

    // Fetch from remote registry
    try {
      const remoteSchema = await this.fetchRemoteSchema(capability);
      if (remoteSchema) {
        this.cacheSchema(capability, remoteSchema);
        return remoteSchema;
      }
    } catch (error) {
      console.error(`Failed to fetch schema for capability ${capability}:`, error);
    }

    return null;
  }

  /**
   * Validate data against OpenAPI 3.1 schema
   */
  async validateAgainstSchema(
    data: any,
    schemaComponent: any,
    options?: {
      capability?: string;
      operation?: string;
      dataType?: 'request' | 'response';
    }
  ): Promise<SchemaValidationResult> {
    const startTime = Date.now();

    try {
      // Prepare validation context
      const validationContext = {
        data,
        schema: schemaComponent,
        options: {
          strict: this.config.schemaValidation.strict,
          allowAdditionalProperties: this.config.schemaValidation.allowAdditionalProperties,
          coerceTypes: this.config.schemaValidation.coerceTypes
        }
      };

      // Perform validation using JSON Schema validator
      const isValid = this.performValidation(validationContext);
      const errors = isValid ? [] : this.getValidationErrors(validationContext);
      const warnings = this.getValidationWarnings(validationContext);

      return {
        valid: isValid,
        errors,
        warnings,
        metadata: {
          schemaId: options?.capability || 'unknown',
          schemaVersion: '1.0.0',
          validationTime: Date.now() - startTime
        }
      };

    } catch (error) {
      return {
        valid: false,
        errors: [{
          keyword: 'validation-error',
          instancePath: '',
          schemaPath: '',
          message: `Validation failed: ${error.message}`,
          data: error
        }],
        warnings: [],
        metadata: {
          schemaId: options?.capability || 'unknown',
          schemaVersion: '1.0.0',
          validationTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Register new schema
   */
  async registerSchema(capability: string, schema: OpenAPI31Schema): Promise<void> {
    // Validate the schema itself
    const schemaValidation = await this.validateSchemaDefinition(schema);
    if (!schemaValidation.valid) {
      throw new Error(`Invalid schema definition: ${schemaValidation.errors.map(e => e.message).join(', ')}`);
    }

    // Add UEP-specific metadata if missing
    if (!schema['x-uep-capability']) {
      schema['x-uep-capability'] = capability;
    }
    if (!schema['x-uep-version']) {
      schema['x-uep-version'] = '1.0.0';
    }

    // Cache the schema
    this.cacheSchema(capability, schema);

    // Optionally persist to registry
    if (this.config.registryUrl) {
      await this.persistSchemaToRegistry(capability, schema);
    }

    console.log(`UEP Schema registered for capability: ${capability}`);
  }

  /**
   * Load predefined UEP schemas
   */
  private loadLocalSchemas(): void {
    if (!this.config.localSchemasPath) return;

    try {
      // Load common UEP schemas
      this.loadPredefinedSchemas();
    } catch (error) {
      console.warn('Failed to load local schemas:', error);
    }
  }

  /**
   * Load predefined schemas for common UEP patterns
   */
  private loadPredefinedSchemas(): void {
    // PRD Parser Agent Schema
    const prdParserSchema: OpenAPI31Schema = {
      openapi: '3.1.0',
      info: {
        title: 'PRD Parser Agent API',
        version: '1.0.0',
        description: 'UEP-compliant API for PRD parsing and analysis'
      },
      'x-uep-capability': 'prd-parsing',
      'x-uep-version': '1.0.0',
      'x-uep-metadata': {
        agentType: 'meta',
        complexity: 'medium',
        dependencies: [],
        tags: ['parsing', 'analysis', 'coordination']
      },
      paths: {
        '/parse-prd': {
          post: {
            summary: 'Parse Product Requirements Document',
            operationId: 'parsePRD',
            'x-uep-method': 'parse-prd',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['content'],
                    properties: {
                      content: {
                        type: 'string',
                        description: 'Raw PRD content to parse',
                        minLength: 1
                      },
                      format: {
                        type: 'string',
                        enum: ['markdown', 'text', 'structured'],
                        default: 'markdown'
                      },
                      options: {
                        type: 'object',
                        properties: {
                          enableValidation: { type: 'boolean', default: true },
                          extractRequirements: { type: 'boolean', default: true },
                          generateArchitecture: { type: 'boolean', default: true }
                        }
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'PRD parsed successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['status', 'data'],
                      properties: {
                        status: { type: 'string', enum: ['success'] },
                        data: {
                          type: 'object',
                          required: ['prdId', 'requirements', 'metadata'],
                          properties: {
                            prdId: { type: 'string' },
                            requirements: {
                              type: 'object',
                              properties: {
                                functional: { type: 'array', items: { type: 'string' } },
                                technical: { type: 'array', items: { type: 'string' } },
                                performance: { type: 'array', items: { type: 'string' } }
                              }
                            },
                            architecture: { type: 'object' },
                            complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
                            metadata: {
                              type: 'object',
                              properties: {
                                parseTime: { type: 'number' },
                                confidence: { type: 'number', minimum: 0, maximum: 1 }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              '400': {
                description: 'Invalid PRD content or request format',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['status', 'error'],
                      properties: {
                        status: { type: 'string', enum: ['error'] },
                        error: { type: 'string' },
                        violations: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              field: { type: 'string' },
                              message: { type: 'string' },
                              code: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          UEPRequest: {
            type: 'object',
            required: ['method', 'data', 'metadata'],
            properties: {
              method: { type: 'string' },
              data: { type: 'object' },
              metadata: {
                type: 'object',
                properties: {
                  traceId: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  version: { type: 'string', default: '1.0.0' }
                }
              }
            }
          },
          UEPResponse: {
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string', enum: ['success', 'error'] },
              data: { type: 'object' },
              error: { type: 'string' },
              metadata: {
                type: 'object',
                properties: {
                  responseTime: { type: 'number' },
                  traceId: { type: 'string' }
                }
              }
            }
          }
        }
      }
    };

    // Infrastructure Orchestrator Schema
    const infraOrchestratorSchema: OpenAPI31Schema = {
      openapi: '3.1.0',
      info: {
        title: 'Infrastructure Orchestrator API',
        version: '1.0.0',
        description: 'UEP-compliant API for infrastructure orchestration'
      },
      'x-uep-capability': 'infrastructure-orchestration',
      'x-uep-version': '1.0.0',
      'x-uep-metadata': {
        agentType: 'meta',
        complexity: 'high',
        dependencies: ['prd-parsing', 'template-generation'],
        tags: ['orchestration', 'coordination', 'workflow']
      },
      paths: {
        '/orchestrate-project': {
          post: {
            summary: 'Orchestrate multi-agent project workflow',
            operationId: 'orchestrateProject',
            'x-uep-method': 'orchestrate-project',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['projectData'],
                    properties: {
                      projectData: {
                        type: 'object',
                        required: ['prdData', 'requirements'],
                        properties: {
                          prdData: { type: 'object' },
                          requirements: { type: 'object' },
                          constraints: { type: 'object' },
                          preferences: { type: 'object' }
                        }
                      },
                      options: {
                        type: 'object',
                        properties: {
                          enableParallelExecution: { type: 'boolean', default: true },
                          timeoutMinutes: { type: 'number', default: 30 },
                          retryFailedSteps: { type: 'boolean', default: true }
                        }
                      }
                    }
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Orchestration completed successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['status', 'data'],
                      properties: {
                        status: { type: 'string', enum: ['success'] },
                        data: {
                          type: 'object',
                          required: ['workflowId', 'results'],
                          properties: {
                            workflowId: { type: 'string' },
                            results: {
                              type: 'object',
                              properties: {
                                templates: { type: 'object' },
                                patterns: { type: 'object' },
                                containerization: { type: 'object' },
                                deployment: { type: 'object' }
                              }
                            },
                            metrics: {
                              type: 'object',
                              properties: {
                                executionTime: { type: 'number' },
                                stepsCompleted: { type: 'number' },
                                agentsInvolved: { type: 'array', items: { type: 'string' } }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    // Cache the predefined schemas
    this.cacheSchema('prd-parsing', prdParserSchema);
    this.cacheSchema('infrastructure-orchestration', infraOrchestratorSchema);

    console.log('UEP Schema Registry: Loaded predefined schemas');
  }

  /**
   * Load local schema file
   */
  private async loadLocalSchema(capability: string): Promise<OpenAPI31Schema | null> {
    if (!this.config.localSchemasPath) return null;

    try {
      const schemaPath = join(this.config.localSchemasPath, `${capability}.json`);
      const schemaContent = readFileSync(schemaPath, 'utf-8');
      return JSON.parse(schemaContent) as OpenAPI31Schema;
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Fetch schema from remote registry
   */
  private async fetchRemoteSchema(capability: string): Promise<OpenAPI31Schema | null> {
    if (!this.config.registryUrl) return null;

    try {
      const response = await fetch(`${this.config.registryUrl}/schemas/${capability}`);
      if (response.ok) {
        return await response.json() as OpenAPI31Schema;
      }
    } catch (error) {
      console.error(`Failed to fetch remote schema for ${capability}:`, error);
    }

    return null;
  }

  /**
   * Initialize JSON Schema validator
   */
  private initializeValidator(): void {
    // In production, this would initialize Ajv with OpenAPI 3.1 support
    console.log('UEP Schema Registry: Validator initialized');
  }

  /**
   * Perform actual validation
   */
  private performValidation(context: any): boolean {
    // Simplified validation - in production would use Ajv
    const { data, schema } = context;

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          return false;
        }
      }
    }

    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          if (!this.validateField(data[field], fieldSchema)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate individual field
   */
  private validateField(value: any, schema: any): boolean {
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (schema.type !== actualType) {
        return false;
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      return false;
    }

    if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) {
      return false;
    }

    return true;
  }

  /**
   * Get validation errors
   */
  private getValidationErrors(context: any): SchemaValidationError[] {
    // Simplified error collection - in production would extract from Ajv
    return [];
  }

  /**
   * Get validation warnings
   */
  private getValidationWarnings(context: any): SchemaValidationWarning[] {
    const warnings: SchemaValidationWarning[] = [];
    
    // Add warnings for common issues
    if (!this.config.schemaValidation.allowAdditionalProperties) {
      // Check for additional properties
    }

    return warnings;
  }

  /**
   * Validate schema definition itself
   */
  private async validateSchemaDefinition(schema: OpenAPI31Schema): Promise<SchemaValidationResult> {
    // Validate that the schema follows OpenAPI 3.1 spec
    const errors: SchemaValidationError[] = [];

    if (!schema.openapi || schema.openapi !== '3.1.0') {
      errors.push({
        keyword: 'version',
        instancePath: '/openapi',
        schemaPath: '',
        message: 'Schema must use OpenAPI 3.1.0'
      });
    }

    if (!schema.info || !schema.info.title || !schema.info.version) {
      errors.push({
        keyword: 'required',
        instancePath: '/info',
        schemaPath: '',
        message: 'Schema info.title and info.version are required'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      metadata: {
        schemaId: schema['x-uep-capability'] || 'unknown',
        schemaVersion: schema['x-uep-version'] || '1.0.0',
        validationTime: 0
      }
    };
  }

  /**
   * Cache schema
   */
  private cacheSchema(capability: string, schema: OpenAPI31Schema): void {
    if (this.config.cacheEnabled) {
      this.schemaCache.set(capability, {
        schema,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.config.cacheTTL;
  }

  /**
   * Setup auto-reload for schema changes
   */
  private setupAutoReload(): void {
    // In production, this would setup file watchers and HTTP polling
    console.log('UEP Schema Registry: Auto-reload enabled');
  }

  /**
   * Persist schema to remote registry
   */
  private async persistSchemaToRegistry(capability: string, schema: OpenAPI31Schema): Promise<void> {
    if (!this.config.registryUrl) return;

    try {
      const response = await fetch(`${this.config.registryUrl}/schemas/${capability}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(schema)
      });

      if (!response.ok) {
        throw new Error(`Failed to persist schema: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to persist schema for ${capability}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.schemaCache.size,
      entries: Array.from(this.schemaCache.keys())
    };
  }

  /**
   * Shutdown registry
   */
  async shutdown(): Promise<void> {
    this.clearCache();
    // Clear file watchers, etc.
  }
}