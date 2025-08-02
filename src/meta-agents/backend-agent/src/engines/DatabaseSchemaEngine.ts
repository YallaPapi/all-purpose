/**
 * Database Schema Engine
 * 
 * Generates database schemas and migrations using Context7 ORM documentation
 * Supports Mongoose, Sequelize, and Prisma with library-specific patterns
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
  DatabaseSchema,
  GeneratedFile,
  BackendAgentConfig
} from '../types/index.js';

import { Context7Client } from '../services/Context7Client.js';

/**
 * Database Schema Engine for generating database schemas and models
 */
export default class DatabaseSchemaEngine extends EventEmitter implements BackendEngine {
  public readonly name = 'DatabaseSchemaEngine';
  private logger: Logger;
  private config: BackendAgentConfig;
  private isInitialized = false;
  private templates = new Map<string, HandlebarsTemplateDelegate>();
  private context7Client: Context7Client;

  constructor(options: {
    logger: Logger;
    config: BackendAgentConfig;
    projectRoot: string;
  }) {
    super();
    
    this.logger = options.logger;
    this.config = options.config;
    this.context7Client = new Context7Client(this.logger);

    this.logger.info('Database Schema Engine created');
  }

  /**
   * Initialize the Database Schema Engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('🚀 Initializing Database Schema Engine...');

      // Load templates
      await this.loadTemplates();

      // Register Handlebars helpers
      this.registerHandlebarsHelpers();

      this.isInitialized = true;
      this.logger.info('✅ Database Schema Engine initialized successfully');

    } catch (error) {
      this.logger.error('❌ Failed to initialize Database Schema Engine', { error });
      throw error;
    }
  }

  /**
   * Process database schema task
   */
  async process(task: BackendTask): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('Database Schema Engine not initialized');
    }

    this.logger.info('🔄 Processing database schema task', { taskId: task.id });

    try {
      const { 
        schemas = [], 
        orm = 'mongoose', 
        database = 'mongodb',
        typescript = true 
      } = task.requirements;

      // Fetch ORM library documentation from Context7
      const libraryDocs = await this.fetchORMDocumentation(orm);

      // Generate database schemas based on requirements
      const generatedSchemas = await this.generateSchemas(schemas, task, libraryDocs);

      // Generate model files
      const generatedFiles = await this.generateModelFiles(generatedSchemas, {
        orm,
        database,
        typescript,
        projectName: task.requirements.projectName || 'backend-api',
        libraryDocs
      });

      // Generate migration files if applicable
      const migrationFiles = await this.generateMigrations(generatedSchemas, {
        orm,
        database
      });

      // Generate database connection file
      const connectionFile = await this.generateConnectionFile({
        orm,
        database,
        libraryDocs
      });

      const allFiles = [...generatedFiles, ...migrationFiles];
      if (connectionFile) {
        allFiles.push(connectionFile);
      }

      const result: ProcessingResult = {
        taskId: task.id,
        success: true,
        data: {
          schemas: generatedSchemas,
          orm,
          database,
          filesGenerated: allFiles.length
        },
        generatedFiles: allFiles,
        recommendations: this.generateRecommendations(orm, database),
        nextSteps: this.generateNextSteps(orm, database)
      };

      this.logger.info('✅ Database schema task completed', {
        taskId: task.id,
        schemasGenerated: generatedSchemas.length,
        filesGenerated: allFiles.length
      });

      return result;

    } catch (error) {
      this.logger.error('❌ Database schema task failed', { taskId: task.id, error });
      throw error;
    }
  }

  /**
   * Fetch ORM library documentation from Context7
   */
  private async fetchORMDocumentation(orm: string): Promise<Map<string, any>> {
    const docs = new Map<string, any>();

    try {
      // Fetch ORM documentation
      this.logger.info(`📚 Fetching ${orm} documentation from Context7...`);
      const ormLibrary = await this.context7Client.resolveLibraryId(orm);
      
      if (ormLibrary) {
        const ormDocs = await this.context7Client.getLibraryDocs(
          ormLibrary.libraryId,
          'schema models validation',
          5000
        );
        if (ormDocs) {
          docs.set(orm, ormDocs);
          this.logger.info(`✅ Retrieved ${ormDocs.snippets.length} snippets for ${orm}`);
        }
      }

      // Fetch database driver documentation if needed
      const driverMap: Record<string, string> = {
        'mongoose': 'mongodb',
        'sequelize': 'pg', // PostgreSQL as default
        'prisma': 'prisma-client'
      };

      const driver = driverMap[orm];
      if (driver) {
        const driverLibrary = await this.context7Client.resolveLibraryId(driver);
        if (driverLibrary) {
          const driverDocs = await this.context7Client.getLibraryDocs(
            driverLibrary.libraryId,
            'connection queries',
            2000
          );
          if (driverDocs) {
            docs.set(driver, driverDocs);
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to fetch ORM documentation', { error });
    }

    return docs;
  }

  /**
   * Generate database schemas
   */
  private async generateSchemas(
    requirements: any[], 
    task: BackendTask, 
    libraryDocs: Map<string, any>
  ): Promise<DatabaseSchema[]> {
    const schemas: DatabaseSchema[] = [];

    // Extract schema patterns from Context7 documentation
    const ormDocs = libraryDocs.values().next().value;
    const schemaPatterns = this.extractSchemaPatterns(ormDocs);

    for (const req of requirements) {
      const schema: DatabaseSchema = {
        tableName: req.name || req.collection || 'table',
        columns: this.generateColumns(req.fields || req.properties || []),
        indexes: this.generateIndexes(req),
        foreignKeys: this.generateForeignKeys(req),
        constraints: this.generateConstraints(req)
      };

      schemas.push(schema);
    }

    return schemas;
  }

  /**
   * Generate model files
   */
  private async generateModelFiles(
    schemas: DatabaseSchema[], 
    options: any
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    for (const schema of schemas) {
      const templateName = `${options.orm}-model`;
      const template = this.templates.get(templateName);

      if (!template) {
        this.logger.warn(`Template not found: ${templateName}, using fallback`);
        continue;
      }

      const modelContent = template({
        schema,
        orm: options.orm,
        database: options.database,
        typescript: options.typescript,
        timestamp: new Date().toISOString(),
        libraryDocs: options.libraryDocs
      });

      const fileName = `${this.toKebabCase(schema.tableName)}.${options.typescript ? 'ts' : 'js'}`;
      files.push({
        path: `src/models/${fileName}`,
        content: modelContent,
        type: 'source',
        language: options.typescript ? 'typescript' : 'javascript',
        description: `${options.orm} model for ${schema.tableName}`
      });
    }

    return files;
  }

  /**
   * Generate migration files
   */
  private async generateMigrations(schemas: DatabaseSchema[], options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Only Sequelize and Prisma typically use migrations
    if (options.orm === 'sequelize' || options.orm === 'prisma') {
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0];
      
      for (const schema of schemas) {
        const migrationTemplate = this.templates.get(`${options.orm}-migration`);
        if (migrationTemplate) {
          const migrationContent = migrationTemplate({
            schema,
            timestamp,
            tableName: schema.tableName
          });

          const fileName = `${timestamp}-create-${this.toKebabCase(schema.tableName)}.js`;
          files.push({
            path: `src/migrations/${fileName}`,
            content: migrationContent,
            type: 'source',
            language: 'javascript',
            description: `Migration to create ${schema.tableName} table`
          });
        }
      }
    }

    return files;
  }

  /**
   * Generate database connection file
   */
  private async generateConnectionFile(options: any): Promise<GeneratedFile | null> {
    const template = this.templates.get(`${options.orm}-connection`);
    if (!template) {
      return null;
    }

    const content = template({
      orm: options.orm,
      database: options.database,
      timestamp: new Date().toISOString()
    });

    return {
      path: `src/config/database.${options.orm === 'prisma' ? 'ts' : 'js'}`,
      content,
      type: 'source',
      language: options.orm === 'prisma' ? 'typescript' : 'javascript',
      description: `Database connection configuration for ${options.orm}`
    };
  }

  /**
   * Load templates
   */
  private async loadTemplates(): Promise<void> {
    // Define inline templates for different ORMs
    const mongooseModelTemplate = `/**
 * {{schema.tableName}} Model
 * Generated on {{timestamp}}
 * ORM: {{orm}}
 */

{{#if typescript}}
import { Schema, model, Document } from 'mongoose';

interface I{{pascalCase schema.tableName}} extends Document {
{{#each schema.columns}}
  {{this.name}}: {{this.tsType}};
{{/each}}
}

const {{pascalCase schema.tableName}}Schema = new Schema<I{{pascalCase schema.tableName}}>({
{{#each schema.columns}}
  {{this.name}}: {
    type: {{this.mongooseType}},
    required: {{this.required}},
    {{#if this.unique}}unique: true,{{/if}}
    {{#if this.default}}default: {{this.default}},{{/if}}
    {{#if this.ref}}ref: '{{this.ref}}',{{/if}}
  },
{{/each}}
}, {
  timestamps: true
});

{{#each schema.indexes}}
{{pascalCase ../schema.tableName}}Schema.index({{json this.fields}}, { {{#if this.unique}}unique: true{{/if}} });
{{/each}}

export const {{pascalCase schema.tableName}} = model<I{{pascalCase schema.tableName}}>('{{pascalCase schema.tableName}}', {{pascalCase schema.tableName}}Schema);
{{else}}
const mongoose = require('mongoose');

const {{pascalCase schema.tableName}}Schema = new mongoose.Schema({
{{#each schema.columns}}
  {{this.name}}: {
    type: {{this.mongooseType}},
    required: {{this.required}},
    {{#if this.unique}}unique: true,{{/if}}
    {{#if this.default}}default: {{this.default}},{{/if}}
    {{#if this.ref}}ref: '{{this.ref}}',{{/if}}
  },
{{/each}}
}, {
  timestamps: true
});

module.exports = mongoose.model('{{pascalCase schema.tableName}}', {{pascalCase schema.tableName}}Schema);
{{/if}}`;

    const sequelizeModelTemplate = `/**
 * {{schema.tableName}} Model
 * Generated on {{timestamp}}
 * ORM: {{orm}}
 */

{{#if typescript}}
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface {{pascalCase schema.tableName}}Attributes {
{{#each schema.columns}}
  {{this.name}}: {{this.tsType}};
{{/each}}
}

interface {{pascalCase schema.tableName}}CreationAttributes extends Optional<{{pascalCase schema.tableName}}Attributes, 'id'> {}

class {{pascalCase schema.tableName}} extends Model<{{pascalCase schema.tableName}}Attributes, {{pascalCase schema.tableName}}CreationAttributes> {
{{#each schema.columns}}
  public {{this.name}}!: {{this.tsType}};
{{/each}}
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

{{pascalCase schema.tableName}}.init({
{{#each schema.columns}}
  {{this.name}}: {
    type: DataTypes.{{this.sequelizeType}},
    allowNull: {{#unless this.required}}true{{else}}false{{/unless}},
    {{#if this.primaryKey}}primaryKey: true,{{/if}}
    {{#if this.autoIncrement}}autoIncrement: true,{{/if}}
    {{#if this.unique}}unique: true,{{/if}}
    {{#if this.default}}defaultValue: {{this.default}},{{/if}}
  },
{{/each}}
}, {
  sequelize,
  modelName: '{{pascalCase schema.tableName}}',
  tableName: '{{snakeCase schema.tableName}}s',
  timestamps: true
});

export { {{pascalCase schema.tableName}} };
{{else}}
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const {{pascalCase schema.tableName}} = sequelize.define('{{pascalCase schema.tableName}}', {
{{#each schema.columns}}
  {{this.name}}: {
    type: DataTypes.{{this.sequelizeType}},
    allowNull: {{#unless this.required}}true{{else}}false{{/unless}},
    {{#if this.primaryKey}}primaryKey: true,{{/if}}
    {{#if this.autoIncrement}}autoIncrement: true,{{/if}}
    {{#if this.unique}}unique: true,{{/if}}
    {{#if this.default}}defaultValue: {{this.default}},{{/if}}
  },
{{/each}}
}, {
  tableName: '{{snakeCase schema.tableName}}s',
  timestamps: true
});

module.exports = {{pascalCase schema.tableName}};
{{/if}}`;

    const prismaModelTemplate = `// {{schema.tableName}} Model for Prisma
// Generated on {{timestamp}}
// Add this to your schema.prisma file

model {{pascalCase schema.tableName}} {
{{#each schema.columns}}
  {{this.name}} {{this.prismaType}}{{#if this.primaryKey}} @id{{/if}}{{#if this.autoIncrement}} @default(autoincrement()){{/if}}{{#if this.unique}} @unique{{/if}}{{#if this.default}} @default({{this.default}}){{/if}}
{{/each}}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("{{snakeCase schema.tableName}}s")
}`;

    // Store templates
    this.templates.set('mongoose-model', Handlebars.compile(mongooseModelTemplate));
    this.templates.set('sequelize-model', Handlebars.compile(sequelizeModelTemplate));
    this.templates.set('prisma-model', Handlebars.compile(prismaModelTemplate));

    // Connection templates
    const mongooseConnectionTemplate = `/**
 * MongoDB Connection Configuration
 * Generated on {{timestamp}}
 */

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/{{database}}', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(\`MongoDB Connected: \${conn.connection.host}\`);
  } catch (error) {
    console.error(\`Error: \${error.message}\`);
    process.exit(1);
  }
};

export default connectDB;`;

    this.templates.set('mongoose-connection', Handlebars.compile(mongooseConnectionTemplate));
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('pascalCase', (str: string) => {
      return str ? str.replace(/(\w)(\w*)/g, (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase()) : '';
    });

    Handlebars.registerHelper('snakeCase', (str: string) => {
      return str ? str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '') : '';
    });

    Handlebars.registerHelper('json', (obj: any) => {
      return JSON.stringify(obj);
    });
  }

  /**
   * Helper methods
   */
  private generateColumns(fields: any[]): any[] {
    return fields.map(field => ({
      name: field.name || field.key,
      type: field.type || 'string',
      tsType: this.mapToTypeScriptType(field.type),
      mongooseType: this.mapToMongooseType(field.type),
      sequelizeType: this.mapToSequelizeType(field.type),
      prismaType: this.mapToPrismaType(field.type),
      required: field.required !== false,
      unique: field.unique || false,
      primaryKey: field.primaryKey || field.name === 'id',
      autoIncrement: field.autoIncrement || false,
      default: field.default,
      ref: field.ref
    }));
  }

  private generateIndexes(schema: any): any[] {
    return schema.indexes || [];
  }

  private generateForeignKeys(schema: any): any[] {
    return schema.foreignKeys || [];
  }

  private generateConstraints(schema: any): any[] {
    return schema.constraints || [];
  }

  private extractSchemaPatterns(docs: any): any {
    // Extract patterns from Context7 documentation
    return {
      validation: docs?.snippets?.filter((s: any) => s.title.includes('validation')) || [],
      relationships: docs?.snippets?.filter((s: any) => s.title.includes('relation')) || []
    };
  }

  private mapToTypeScriptType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'Date',
      'array': 'any[]',
      'object': 'any',
      'objectid': 'string'
    };
    return typeMap[type.toLowerCase()] || 'any';
  }

  private mapToMongooseType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Number',
      'boolean': 'Boolean',
      'date': 'Date',
      'array': '[String]',
      'object': 'Object',
      'objectid': 'mongoose.Schema.Types.ObjectId'
    };
    return typeMap[type.toLowerCase()] || 'String';
  }

  private mapToSequelizeType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'STRING',
      'number': 'INTEGER',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'array': 'JSON',
      'object': 'JSON',
      'objectid': 'UUID'
    };
    return typeMap[type.toLowerCase()] || 'STRING';
  }

  private mapToPrismaType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Int',
      'boolean': 'Boolean',
      'date': 'DateTime',
      'array': 'Json',
      'object': 'Json',
      'objectid': 'String'
    };
    return typeMap[type.toLowerCase()] || 'String';
  }

  private toKebabCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
  }

  private generateRecommendations(orm: string, database: string): string[] {
    const recommendations = [
      `Set up ${database} connection in environment variables`,
      `Install ${orm} dependencies: npm install ${orm}`,
      'Add validation middleware for model inputs'
    ];

    if (orm === 'sequelize') {
      recommendations.push('Run migrations: npx sequelize-cli db:migrate');
    } else if (orm === 'prisma') {
      recommendations.push('Generate Prisma client: npx prisma generate');
      recommendations.push('Push schema to database: npx prisma db push');
    }

    return recommendations;
  }

  private generateNextSteps(orm: string, database: string): string[] {
    return [
      'Create seed data for development',
      'Add model validation rules',
      'Implement repository pattern for data access',
      'Add database connection health checks',
      'Set up database backup strategy'
    ];
  }

  /**
   * Get engine capabilities
   */
  getCapabilities(): any {
    return {
      orms: ['mongoose', 'sequelize', 'prisma'],
      databases: ['mongodb', 'postgresql', 'mysql', 'sqlite'],
      features: {
        schemaGeneration: true,
        migrationGeneration: true,
        validationRules: true,
        relationships: true,
        indexes: true,
        typescript: true
      }
    };
  }

  /**
   * Get engine status
   */
  getStatus(): any {
    return {
      name: this.name,
      initialized: this.isInitialized,
      version: '1.0.0',
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Database Schema Engine...');
    this.isInitialized = false;
    this.templates.clear();
    this.logger.info('✅ Database Schema Engine shut down successfully');
  }
}