/**
 * API Design Engine
 * 
 * Generates RESTful API endpoints with Express.js patterns
 * Implements Context7-aware API design with security and validation
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { Logger } from 'winston';

import {
  BackendEngine,
  BackendTask,
  ProcessingResult,
  APIEndpoint,
  GeneratedFile,
  BackendAgentConfig
} from '../types/index.js';

/**
 * API Design Engine for generating backend API endpoints
 */
export default class APIDesignEngine extends EventEmitter implements BackendEngine {
  public readonly name = 'APIDesignEngine';
  private logger: Logger;
  private config: BackendAgentConfig;
  private isInitialized = false;
  private templates = new Map<string, HandlebarsTemplateDelegate>();

  constructor(options: {
    logger: Logger;
    config: BackendAgentConfig;
    projectRoot: string;
  }) {
    super();
    
    this.logger = options.logger;
    this.config = options.config;

    this.logger.info('API Design Engine created');
  }

  /**
   * Initialize the API Design Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing API Design Engine...');

      // Load Handlebars templates
      await this.loadTemplates();

      // Register Handlebars helpers
      this.registerHandlebarsHelpers();

      this.isInitialized = true;
      this.logger.info('✅ API Design Engine initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize API Design Engine', { error });
      throw error;
    }
  }

  /**
   * Process API design task
   */
  async process(task: BackendTask): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('API Design Engine not initialized');
    }

    this.logger.info('🔄 Processing API design task', { taskId: task.id });

    try {
      const { endpoints = [], framework = 'express', authentication = false } = task.requirements;

      // Generate API endpoints based on requirements and context
      const generatedEndpoints = await this.generateEndpoints(endpoints, task);

      // Generate API files
      const generatedFiles = await this.generateAPIFiles(generatedEndpoints, {
        framework,
        authentication,
        projectName: 'backend-api'
      });

      // Generate middleware files
      const middlewareFiles = await this.generateMiddleware(generatedEndpoints, {
        framework,
        authentication
      });

      // Generate validation files
      const validationFiles = await this.generateValidation(generatedEndpoints);

      const allFiles = [...generatedFiles, ...middlewareFiles, ...validationFiles];

      const result: ProcessingResult = {
        taskId: task.id,
        success: true,
        data: {
          endpoints: generatedEndpoints,
          framework,
          authentication,
          filesGenerated: allFiles.length
        },
        generatedFiles: allFiles,
        recommendations: this.generateRecommendations(generatedEndpoints),
        nextSteps: this.generateNextSteps(generatedEndpoints, authentication)
      };

      this.logger.info('✅ API design task completed', {
        taskId: task.id,
        endpointsGenerated: generatedEndpoints.length,
        filesGenerated: allFiles.length
      });

      return result;

    } catch (error) {
      this.logger.error('❌ API design task failed', { taskId: task.id, error });
      
      return {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate API endpoints based on requirements and context
   */
  private async generateEndpoints(requirements: any[], task: BackendTask): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];

    // Analyze existing endpoints from context
    const existingEndpoints = task.context.apiEndpoints || [];
    this.logger.info('Found existing endpoints in context', { count: existingEndpoints.length });

    // Generate new endpoints based on requirements
    for (const req of requirements) {
      const endpoint: APIEndpoint = {
        path: req.path || `/${req.resource || 'resource'}`,
        method: req.method || 'GET',
        handler: req.handler || `${req.resource || 'resource'}Handler`,
        middleware: this.generateEndpointMiddleware(req),
        validation: this.generateValidationSchema(req),
        documentation: req.description || `${req.method || 'GET'} ${req.path || req.resource}`,
        parameters: this.generateParameters(req),
        responses: this.generateResponses(req)
      };

      endpoints.push(endpoint);
    }

    // If no requirements provided, generate CRUD endpoints for common resources
    if (requirements.length === 0) {
      const resources = this.extractResourcesFromContext(task.context);
      for (const resource of resources) {
        endpoints.push(...this.generateCRUDEndpoints(resource));
      }
    }

    return endpoints;
  }

  /**
   * Generate API files from endpoints
   */
  private async generateAPIFiles(endpoints: APIEndpoint[], options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate main router file
    const routerTemplate = this.templates.get('express-router');
    if (routerTemplate) {
      const routerContent = routerTemplate({
        endpoints,
        projectName: options.projectName,
        framework: options.framework,
        authentication: options.authentication,
        timestamp: new Date().toISOString()
      });

      files.push({
        path: 'src/routes/api.ts',
        content: routerContent,
        type: 'source',
        language: 'typescript',
        description: 'Main API router with all endpoints'
      });
    }

    // Generate individual route files for complex endpoints
    for (const endpoint of endpoints) {
      if (this.isComplexEndpoint(endpoint)) {
        const routeTemplate = this.templates.get('route-handler');
        if (routeTemplate) {
          const routeContent = routeTemplate({
            endpoint,
            framework: options.framework,
            authentication: options.authentication
          });

          const fileName = `${endpoint.path.replace(/[:/]/g, '-').replace(/^-+/, '')}.ts`;
          files.push({
            path: `src/routes/${fileName}`,
            content: routeContent,
            type: 'source',
            language: 'typescript',
            description: `Route handler for ${endpoint.method} ${endpoint.path}`
          });
        }
      }
    }

    return files;
  }

  /**
   * Generate middleware files
   */
  private async generateMiddleware(endpoints: APIEndpoint[], options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate authentication middleware if needed
    if (options.authentication) {
      const authTemplate = this.templates.get('auth-middleware');
      if (authTemplate) {
        const authContent = authTemplate({
          authStrategy: 'jwt', // default
          framework: options.framework
        });

        files.push({
          path: 'src/middleware/auth.ts',
          content: authContent,
          type: 'source',
          language: 'typescript',
          description: 'Authentication middleware'
        });
      }
    }

    // Generate validation middleware
    const validationTemplate = this.templates.get('validation-middleware');
    if (validationTemplate) {
      const validationContent = validationTemplate({
        endpoints,
        framework: options.framework
      });

      files.push({
        path: 'src/middleware/validation.ts',
        content: validationContent,
        type: 'source',
        language: 'typescript',
        description: 'Request validation middleware'
      });
    }

    // Generate error handling middleware
    const errorTemplate = this.templates.get('error-middleware');
    if (errorTemplate) {
      const errorContent = errorTemplate({
        framework: options.framework
      });

      files.push({
        path: 'src/middleware/errorHandler.ts',
        content: errorContent,
        type: 'source',
        language: 'typescript',
        description: 'Error handling middleware'
      });
    }

    return files;
  }

  /**
   * Generate validation files
   */
  private async generateValidation(endpoints: APIEndpoint[]): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate validation schemas
    const schemaTemplate = this.templates.get('validation-schema');
    if (schemaTemplate) {
      const schemaContent = schemaTemplate({
        endpoints
      });

      files.push({
        path: 'src/validation/schemas.ts',
        content: schemaContent,
        type: 'source',
        language: 'typescript',
        description: 'Joi validation schemas for API endpoints'
      });
    }

    return files;
  }

  /**
   * Load Handlebars templates
   */
  private async loadTemplates(): Promise<void> {
    const templateDir = path.join(__dirname, '..', 'templates', 'api');
    
    const templateFiles = [
      'express-router.hbs',
      'route-handler.hbs',
      'auth-middleware.hbs',
      'validation-middleware.hbs',
      'error-middleware.hbs',
      'validation-schema.hbs'
    ];

    for (const templateFile of templateFiles) {
      try {
        const templatePath = path.join(templateDir, templateFile);
        const templateContent = await this.loadTemplateContent(templateFile);
        const template = Handlebars.compile(templateContent);
        const templateName = path.basename(templateFile, '.hbs');
        this.templates.set(templateName, template);
        
        this.logger.debug(`Loaded template: ${templateName}`);
      } catch (error) {
        this.logger.warn(`Failed to load template: ${templateFile}`, { error });
      }
    }
  }

  /**
   * Load template content (fallback to inline templates if files don't exist)
   */
  private async loadTemplateContent(templateFile: string): Promise<string> {
    // Inline templates as fallback
    const inlineTemplates: Record<string, string> = {
      'express-router.hbs': `
/**
 * {{projectName}} API Router
 * Generated on {{timestamp}}
 * Framework: {{framework}}
 */

import express from 'express';
{{#if authentication}}
import { authenticateToken } from '../middleware/auth.js';
{{/if}}
import { validateRequest } from '../middleware/validation.js';
import { errorHandler } from '../middleware/errorHandler.js';

const router = express.Router();

{{#each endpoints}}
/**
 * {{documentation}}
 */
router.{{method}}('{{path}}'{{#if ../authentication}}, authenticateToken{{/if}}, validateRequest('{{handler}}'), async (req, res, next) => {
  try {
    // TODO: Implement {{handler}} logic
    res.json({
      success: true,
      message: '{{documentation}}',
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

{{/each}}

router.use(errorHandler);

export default router;
`,
      'auth-middleware.hbs': `
/**
 * Authentication Middleware
 * JWT-based authentication
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access token required' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }
    
    req.user = user;
    next();
  });
};
`,
      'validation-middleware.hbs': `
/**
 * Request Validation Middleware
 * Joi-based request validation
 */

import joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validationSchemas } from '../validation/schemas.js';

export const validateRequest = (schemaName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = validationSchemas[schemaName];
    
    if (!schema) {
      return next();
    }

    const { error } = schema.validate({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    next();
  };
};
`,
      'error-middleware.hbs': `
/**
 * Error Handling Middleware
 * Centralized error handling
 */

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error);

  // Default error response
  let status = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};
`,
      'validation-schema.hbs': `
/**
 * Validation Schemas
 * Joi schemas for API request validation
 */

import joi from 'joi';

export const validationSchemas: Record<string, joi.Schema> = {
{{#each endpoints}}
  '{{handler}}': joi.object({
    {{#if parameters}}
    params: joi.object({
      {{#each parameters}}
      {{name}}: joi.{{type}}(){{#if required}}.required(){{/if}},
      {{/each}}
    }),
    {{/if}}
    body: joi.object({
      // TODO: Define body schema for {{handler}}
    }),
    query: joi.object({
      // TODO: Define query schema for {{handler}}
    })
  }),
{{/each}}
};
`
    };

    return inlineTemplates[templateFile] || '';
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('lower', function(str: string) {
      return str ? str.toLowerCase() : '';
    });

    Handlebars.registerHelper('upper', function(str: string) {
      return str ? str.toUpperCase() : '';
    });

    Handlebars.registerHelper('camelCase', function(str: string) {
      return str ? str.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) : '';
    });
  }

  /**
   * Helper methods
   */
  private generateEndpointMiddleware(req: any): string[] {
    const middleware: string[] = [];
    
    if (req.authentication !== false) {
      middleware.push('authenticateToken');
    }
    
    if (req.validation !== false) {
      middleware.push('validateRequest');
    }
    
    return middleware;
  }

  private generateValidationSchema(req: any): any {
    return {
      schema: {
        body: req.bodySchema || {},
        query: req.querySchema || {},
        params: req.paramsSchema || {}
      },
      options: {
        stripUnknown: true,
        allowUnknown: false
      }
    };
  }

  private generateParameters(req: any): any[] {
    const parameters: any[] = [];
    
    // Extract path parameters
    const pathParams = (req.path || '').match(/:(\w+)/g) || [];
    for (const param of pathParams) {
      parameters.push({
        name: param.substring(1),
        type: 'string',
        location: 'path',
        required: true,
        description: `Path parameter: ${param}`
      });
    }
    
    // Add additional parameters from requirements
    if (req.parameters) {
      parameters.push(...req.parameters);
    }
    
    return parameters;
  }

  private generateResponses(req: any): any[] {
    return [
      {
        statusCode: 200,
        description: 'Success',
        schema: req.responseSchema || {},
        examples: req.responseExamples || []
      },
      {
        statusCode: 400,
        description: 'Bad Request',
        schema: { error: 'string' },
        examples: []
      },
      {
        statusCode: 500,
        description: 'Internal Server Error',
        schema: { error: 'string' },
        examples: []
      }
    ];
  }

  private extractResourcesFromContext(context: any): string[] {
    const resources = new Set<string>();
    
    // Extract from existing endpoints
    if (context.apiEndpoints) {
      for (const endpoint of context.apiEndpoints) {
        const pathSegments = endpoint.path.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          resources.add(pathSegments[0]);
        }
      }
    }
    
    // Extract from database schemas
    if (context.databaseSchemas) {
      for (const schema of context.databaseSchemas) {
        resources.add(schema.tableName);
      }
    }
    
    return Array.from(resources);
  }

  private generateCRUDEndpoints(resource: string): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [
      {
        path: `/${resource}`,
        method: 'GET',
        handler: `get${this.capitalize(resource)}`,
        middleware: ['validateRequest'],
        validation: { schema: {}, options: {} },
        documentation: `Get all ${resource}`,
        parameters: [],
        responses: []
      },
      {
        path: `/${resource}/:id`,
        method: 'GET',
        handler: `get${this.capitalize(resource)}ById`,
        middleware: ['validateRequest'],
        validation: { schema: {}, options: {} },
        documentation: `Get ${resource} by ID`,
        parameters: [{ name: 'id', type: 'string', location: 'path', required: true, description: 'Resource ID' }],
        responses: []
      },
      {
        path: `/${resource}`,
        method: 'POST',
        handler: `create${this.capitalize(resource)}`,
        middleware: ['authenticateToken', 'validateRequest'],
        validation: { schema: {}, options: {} },
        documentation: `Create new ${resource}`,
        parameters: [],
        responses: []
      },
      {
        path: `/${resource}/:id`,
        method: 'PUT',
        handler: `update${this.capitalize(resource)}`,
        middleware: ['authenticateToken', 'validateRequest'],
        validation: { schema: {}, options: {} },
        documentation: `Update ${resource} by ID`,
        parameters: [{ name: 'id', type: 'string', location: 'path', required: true, description: 'Resource ID' }],
        responses: []
      },
      {
        path: `/${resource}/:id`,
        method: 'DELETE',
        handler: `delete${this.capitalize(resource)}`,
        middleware: ['authenticateToken', 'validateRequest'],
        validation: { schema: {}, options: {} },
        documentation: `Delete ${resource} by ID`,
        parameters: [{ name: 'id', type: 'string', location: 'path', required: true, description: 'Resource ID' }],
        responses: []
      }
    ];

    return endpoints;
  }

  private isComplexEndpoint(endpoint: APIEndpoint): boolean {
    return endpoint.parameters.length > 2 || 
           endpoint.middleware.length > 2 || 
           endpoint.path.includes('/:') && endpoint.path.split('/').length > 3;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateRecommendations(endpoints: APIEndpoint[]): string[] {
    const recommendations: string[] = [];
    
    recommendations.push('Implement proper error handling in all endpoints');
    recommendations.push('Add comprehensive input validation');
    recommendations.push('Consider implementing rate limiting');
    recommendations.push('Add API documentation with OpenAPI/Swagger');
    
    if (endpoints.some(e => e.method !== 'GET')) {
      recommendations.push('Implement CSRF protection for state-changing operations');
    }
    
    return recommendations;
  }

  private generateNextSteps(endpoints: APIEndpoint[], hasAuth: boolean): string[] {
    const nextSteps: string[] = [];
    
    nextSteps.push('Review and customize generated endpoint handlers');
    nextSteps.push('Implement business logic for each endpoint');
    nextSteps.push('Add comprehensive tests for all endpoints');
    
    if (hasAuth) {
      nextSteps.push('Configure JWT secrets and authentication flow');
    }
    
    nextSteps.push('Add API documentation and examples');
    nextSteps.push('Configure deployment and environment variables');
    
    return nextSteps;
  }

  /**
   * Get engine capabilities
   */
  getCapabilities(): any {
    return {
      frameworks: ['express', 'fastify', 'koa'],
      features: ['CRUD', 'authentication', 'validation', 'middleware', 'error-handling'],
      outputFormats: ['typescript', 'javascript'],
      patterns: ['RESTful', 'OpenAPI']
    };
  }

  /**
   * Get engine status
   */
  getStatus(): any {
    return {
      name: this.name,
      initialized: this.isInitialized,
      templatesLoaded: this.templates.size,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down API Design Engine...');
    this.templates.clear();
    this.isInitialized = false;
    this.logger.info('✅ API Design Engine shut down successfully');
  }
}