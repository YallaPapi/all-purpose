/**
 * NATS Backend Agent Adapter
 * 
 * Wraps the Backend Agent with NATS communication capabilities
 * Enables distributed execution via NATS messaging
 */

import { NATSAgentWrapper, AgentConfig } from '../../../../services/NATSAgentWrapper.js';
import { BackendAgent } from '../core/BackendAgent.js';
import { BackendTask } from '../types/index.js';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger.js';

export interface NATSBackendAgentConfig extends Omit<AgentConfig, 'type' | 'capability'> {
  backendConfig?: {
    outputDir?: string;
    enableContext7?: boolean;
    enableRAG?: boolean;
    enableUEP?: boolean;
  };
}

export class NATSBackendAgent extends NATSAgentWrapper {
  private backendAgent: BackendAgent;
  private logger: Logger;

  constructor(config: NATSBackendAgentConfig) {
    super({
      ...config,
      type: 'backend',
      capability: 'backend-generation'
    });

    this.logger = createLogger('nats-backend-agent');
    
    // Initialize backend agent
    this.backendAgent = new BackendAgent({
      outputDir: config.backendConfig?.outputDir || './generated/backend',
      enableContext7: config.backendConfig?.enableContext7 ?? true,
      enableRAG: config.backendConfig?.enableRAG ?? true,
      enableUEP: config.backendConfig?.enableUEP ?? false,
      logLevel: 'info'
    });
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('Initializing NATS Backend Agent...');
    await this.backendAgent.initialize();
    this.logger.info('✅ Backend Agent initialized with NATS communication');
  }

  protected async onShutdown(): Promise<void> {
    this.logger.info('Shutting down NATS Backend Agent...');
    await this.backendAgent.shutdown();
  }

  protected async executeTask(task: any): Promise<any> {
    this.logger.info('Executing backend task', { task });

    try {
      // Determine task type
      const taskType = this.determineTaskType(task);
      
      // Update progress
      await this.publishProgress(10, 'Analyzing task requirements');

      let result;

      switch (taskType) {
        case 'api-generation':
          result = await this.handleAPIGeneration(task);
          break;
          
        case 'database-design':
          result = await this.handleDatabaseDesign(task);
          break;
          
        case 'security-analysis':
          result = await this.handleSecurityAnalysis(task);
          break;
          
        case 'test-generation':
          result = await this.handleTestGeneration(task);
          break;
          
        case 'documentation':
          result = await this.handleDocumentation(task);
          break;
          
        case 'full-backend':
          result = await this.handleFullBackend(task);
          break;
          
        default:
          // Generic task processing
          result = await this.backendAgent.processTask(
            task.description || 'Process backend task',
            task.requirements || task
          );
      }

      await this.publishProgress(100, 'Task completed successfully');
      
      return {
        success: true,
        type: taskType,
        result,
        generatedFiles: result.generatedFiles?.length || 0,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Task execution failed:', error);
      await this.publishLog('error', 'Task execution failed', { error: error.message });
      throw error;
    }
  }

  private determineTaskType(task: any): string {
    if (task.type) return task.type;
    
    const description = (task.description || '').toLowerCase();
    
    if (description.includes('api') || description.includes('endpoint')) {
      return 'api-generation';
    } else if (description.includes('database') || description.includes('schema')) {
      return 'database-design';
    } else if (description.includes('security') || description.includes('auth')) {
      return 'security-analysis';
    } else if (description.includes('test')) {
      return 'test-generation';
    } else if (description.includes('document') || description.includes('swagger')) {
      return 'documentation';
    } else if (description.includes('backend') || description.includes('complete')) {
      return 'full-backend';
    }
    
    return 'generic';
  }

  private async handleAPIGeneration(task: any): Promise<any> {
    await this.publishProgress(20, 'Generating API endpoints');
    await this.publishLog('info', 'Starting API generation', { 
      endpoints: task.endpoints?.length || 0 
    });

    const result = await this.backendAgent.generateAPI({
      endpoints: task.endpoints || [],
      framework: task.framework || 'express',
      database: task.database,
      authentication: task.authentication !== false,
      outputPath: task.outputPath
    });

    await this.publishProgress(80, 'API generation complete');
    return result;
  }

  private async handleDatabaseDesign(task: any): Promise<any> {
    await this.publishProgress(20, 'Designing database schema');
    await this.publishLog('info', 'Starting database design', { 
      entities: task.entities?.length || 0 
    });

    const result = await this.backendAgent.designDatabase({
      entities: task.entities || task.schemas || [],
      relationships: task.relationships || [],
      migrations: task.migrations !== false,
      database: task.database || 'postgresql',
      outputPath: task.outputPath
    });

    await this.publishProgress(80, 'Database design complete');
    return result;
  }

  private async handleSecurityAnalysis(task: any): Promise<any> {
    await this.publishProgress(20, 'Performing security analysis');
    
    const result = await this.backendAgent.analyzeSecurity({
      scanPaths: task.scanPaths,
      rules: task.rules,
      severity: task.severity
    });

    await this.publishProgress(80, 'Security analysis complete');
    return result;
  }

  private async handleTestGeneration(task: any): Promise<any> {
    await this.publishProgress(20, 'Generating test suites');
    
    const result = await this.backendAgent.generateTests({
      testTypes: task.testTypes || ['unit', 'integration'],
      coverage: task.coverage || 80,
      framework: task.framework || 'jest'
    });

    await this.publishProgress(80, 'Test generation complete');
    return result;
  }

  private async handleDocumentation(task: any): Promise<any> {
    await this.publishProgress(20, 'Generating documentation');
    
    const result = await this.backendAgent.generateDocumentation({
      format: task.format || 'markdown',
      includeExamples: task.includeExamples !== false,
      generateSwagger: task.generateSwagger !== false
    });

    await this.publishProgress(80, 'Documentation generation complete');
    return result;
  }

  private async handleFullBackend(task: any): Promise<any> {
    const steps = [
      { progress: 20, message: 'Analyzing requirements' },
      { progress: 30, message: 'Designing database schema' },
      { progress: 50, message: 'Generating API endpoints' },
      { progress: 70, message: 'Creating authentication flow' },
      { progress: 85, message: 'Generating tests' },
      { progress: 95, message: 'Creating documentation' }
    ];

    const results = {
      database: null,
      api: null,
      security: null,
      tests: null,
      documentation: null
    };

    // Step through backend generation
    for (const step of steps) {
      await this.publishProgress(step.progress, step.message);
      await this.publishLog('info', step.message);
    }

    // Database
    if (task.database !== false) {
      results.database = await this.backendAgent.designDatabase({
        entities: task.entities || [],
        relationships: task.relationships || [],
        database: task.databaseType || 'postgresql'
      });
    }

    // API
    if (task.api !== false) {
      results.api = await this.backendAgent.generateAPI({
        endpoints: task.endpoints || [],
        framework: task.framework || 'express',
        authentication: true
      });
    }

    // Security
    if (task.security !== false) {
      results.security = await this.backendAgent.analyzeSecurity();
    }

    // Tests
    if (task.tests !== false) {
      results.tests = await this.backendAgent.generateTests({
        testTypes: ['unit', 'integration', 'api']
      });
    }

    // Documentation
    if (task.documentation !== false) {
      results.documentation = await this.backendAgent.generateDocumentation({
        generateSwagger: true
      });
    }

    return results;
  }
}

// Factory function
export function createNATSBackendAgent(config: NATSBackendAgentConfig): NATSBackendAgent {
  return new NATSBackendAgent(config);
}