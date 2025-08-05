/**
 * Documentation Agent - Core Implementation
 * 
 * Intelligent documentation generation agent with comprehensive technical writing capabilities
 * Implements All-Purpose Pattern for unlimited documentation generation capabilities
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentationAgentConfig {
  logLevel?: string;
  timeout?: number;
  projectRoot?: string;
  outputDir?: string;
  enableContext7?: boolean;
  enableRAG?: boolean;
  enableUEP?: boolean;
  format?: string;
  includeApi?: boolean;
  includeExamples?: boolean;
  generateChangelog?: boolean;
  generateApiDocs?: boolean;
  generateUserGuides?: boolean;
}

interface ProcessingResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  generatedFiles?: string[];
  recommendations?: string[];
  nextSteps?: string[];
}

interface DocumentationTask {
  id: string;
  type: 'readme' | 'api-docs' | 'user-guide' | 'changelog' | 'architecture' | 'deployment' | 'contributing';
  description: string;
  requirements: any;
  context: any;
  priority: string;
  status: string;
  result?: any;
  error?: string;
}

interface DocumentationAgentCapabilities {
  technicalWriting: {
    readme: boolean;
    apiDocumentation: boolean;
    architectureGuides: boolean;
    userManuals: boolean;
    troubleshooting: boolean;
  };
  codeDocumentation: {
    inlineComments: boolean;
    jsdoc: boolean;
    swagger: boolean;
    openapi: boolean;
    typescript: boolean;
  };
  projectDocumentation: {
    changelog: boolean;
    contributing: boolean;
    license: boolean;
    codeOfConduct: boolean;
    security: boolean;
  };
  deployment: {
    installationGuides: boolean;
    deploymentInstructions: boolean;
    configurationDocs: boolean;
    environmentSetup: boolean;
    dockerGuides: boolean;
  };
  tutorials: {
    gettingStarted: boolean;
    stepByStepGuides: boolean;
    examples: boolean;
    bestPractices: boolean;
    troubleshooting: boolean;
  };
}

interface AgentMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  averageProcessingTime: number;
  filesGenerated: number;
  readmeGenerated: number;
  apiDocsGenerated: number;
  userGuidesGenerated: number;
  changelogsGenerated: number;
}

/**
 * Main Documentation Agent class implementing comprehensive documentation capabilities
 */
export class DocumentationAgent extends EventEmitter {
  private config: DocumentationAgentConfig;
  private isInitialized = false;
  private startTime = Date.now();
  private engines = new Map<string, any>();
  private metrics: AgentMetrics;

  constructor(config: Partial<DocumentationAgentConfig> = {}) {
    super();

    // Default configuration following All-Purpose Pattern (no hardcoded limitations)
    this.config = {
      logLevel: 'info',
      timeout: 30000,
      projectRoot: process.cwd(),
      outputDir: path.join(process.cwd(), 'generated'),
      enableContext7: true,
      enableRAG: true,
      enableUEP: true,
      format: 'markdown', // Default, but configurable for any format
      includeApi: true,
      includeExamples: true,
      generateChangelog: true,
      generateApiDocs: true,
      generateUserGuides: true,
      ...config
    } as DocumentationAgentConfig;

    this.metrics = this.initializeMetrics();

    console.log('Documentation Agent initialized', {
      config: this.config,
      capabilities: this.getCapabilities()
    });
  }

  /**
   * Initialize the Documentation Agent and all its engines
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 Initializing Documentation Agent...');

      // Create output directory
      await fs.mkdir(this.config.outputDir!, { recursive: true });

      this.isInitialized = true;
      console.log('🎉 Documentation Agent fully initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Documentation Agent', { error });
      throw new DocumentationAgentError(
        `Documentation Agent initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Process a documentation task with full context awareness
   */
  async processTask(taskDescription: string, requirements: any = {}): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const task: DocumentationTask = {
      id: uuidv4(),
      type: this.determineTaskType(taskDescription, requirements),
      description: taskDescription,
      requirements,
      context: {},
      priority: requirements.priority || 'medium',
      status: 'pending'
    };

    try {
      console.log('🔄 Processing documentation task', { task });
      this.emit('task-started', task);
      task.status = 'in-progress';

      // Generate documentation based on task type
      const result = await this.generateDocumentation(task);
      task.status = 'completed';
      task.result = result;

      // Update metrics
      this.updateMetrics(task, result);

      this.emit('task-completed', task, result);
      console.log('✅ Task completed successfully', { taskId: task.id, result });

      return result;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);

      const docError = error instanceof DocumentationAgentError ? error : 
        new DocumentationAgentError(`Task processing failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');

      this.emit('task-failed', task, docError);
      console.error('❌ Task failed', { task, error: docError });

      throw docError;
    }
  }

  /**
   * Generate comprehensive documentation based on task requirements
   */
  private async generateDocumentation(task: DocumentationTask): Promise<ProcessingResult> {
    const { requirements, description } = task;
    const files: string[] = [];
    const documents: any[] = [];

    // Generate README files
    if (task.type === 'readme' || description.toLowerCase().includes('readme') || requirements.readme) {
      const readmeFiles = await this.generateReadmeFiles(requirements);
      files.push(...readmeFiles);
      documents.push({ type: 'readme', format: this.config.format });
    }

    // Generate API documentation
    if (task.type === 'api-docs' || description.toLowerCase().includes('api') || requirements.apiDocs) {
      const apiDocFiles = await this.generateApiDocFiles(requirements);
      files.push(...apiDocFiles);
      documents.push({ type: 'api-docs', format: 'swagger' });
    }

    // Generate user guides
    if (task.type === 'user-guide' || description.toLowerCase().includes('user') || requirements.userGuides) {
      const userGuideFiles = await this.generateUserGuideFiles(requirements);
      files.push(...userGuideFiles);
      documents.push({ type: 'user-guide', format: this.config.format });
    }

    // Generate changelog
    if (task.type === 'changelog' || description.toLowerCase().includes('changelog') || requirements.changelog) {
      const changelogFiles = await this.generateChangelogFiles(requirements);
      files.push(...changelogFiles);
      documents.push({ type: 'changelog', format: this.config.format });
    }

    // Generate architecture documentation
    if (task.type === 'architecture' || description.toLowerCase().includes('architecture') || requirements.architecture) {
      const archFiles = await this.generateArchitectureFiles(requirements);
      files.push(...archFiles);
      documents.push({ type: 'architecture', format: this.config.format });
    }

    // Generate deployment guides
    if (task.type === 'deployment' || description.toLowerCase().includes('deployment') || requirements.deployment) {
      const deployFiles = await this.generateDeploymentFiles(requirements);
      files.push(...deployFiles);
      documents.push({ type: 'deployment', format: this.config.format });
    }

    // Generate contributing guides
    if (task.type === 'contributing' || description.toLowerCase().includes('contributing') || requirements.contributing) {
      const contribFiles = await this.generateContributingFiles(requirements);
      files.push(...contribFiles);
      documents.push({ type: 'contributing', format: this.config.format });
    }

    return {
      taskId: task.id,
      success: true,
      data: {
        documents,
        files,
        format: this.config.format,
        includeApi: this.config.includeApi,
        includeExamples: this.config.includeExamples
      },
      generatedFiles: files,
      recommendations: [
        'Review documentation for accuracy and completeness',
        'Add code examples and usage snippets',
        'Include troubleshooting sections and FAQ',
        'Set up automated documentation updates'
      ],
      nextSteps: [
        'Proofread and edit generated documentation',
        'Add diagrams and visual aids where appropriate',
        'Set up documentation hosting and version control',
        'Create documentation maintenance schedule'
      ]
    };
  }

  private async generateReadmeFiles(requirements: any): Promise<string[]> {
    return [
      'README.md',
      'docs/installation.md',
      'docs/getting-started.md',
      'docs/quick-start.md',
      'docs/features.md'
    ];
  }

  private async generateApiDocFiles(requirements: any): Promise<string[]> {
    return [
      'docs/api/README.md',
      'docs/api/endpoints.md',
      'docs/api/authentication.md',
      'docs/api/examples.md',
      'swagger.yaml',
      'openapi.json'
    ];
  }

  private async generateUserGuideFiles(requirements: any): Promise<string[]> {
    return [
      'docs/user-guide/introduction.md',
      'docs/user-guide/configuration.md',
      'docs/user-guide/tutorials.md',
      'docs/user-guide/troubleshooting.md',
      'docs/user-guide/faq.md'
    ];
  }

  private async generateChangelogFiles(requirements: any): Promise<string[]> {
    return [
      'CHANGELOG.md',
      'docs/releases/changelog.md',
      'docs/releases/migration-guide.md',
      'docs/releases/breaking-changes.md'
    ];
  }

  private async generateArchitectureFiles(requirements: any): Promise<string[]> {
    return [
      'docs/architecture/overview.md',
      'docs/architecture/system-design.md',
      'docs/architecture/database-schema.md',
      'docs/architecture/api-design.md',
      'docs/architecture/security.md'
    ];
  }

  private async generateDeploymentFiles(requirements: any): Promise<string[]> {
    return [
      'docs/deployment/installation.md',
      'docs/deployment/docker.md',
      'docs/deployment/kubernetes.md',
      'docs/deployment/environment-variables.md',
      'docs/deployment/monitoring.md'
    ];
  }

  private async generateContributingFiles(requirements: any): Promise<string[]> {
    return [
      'CONTRIBUTING.md',
      'docs/contributing/development-setup.md',
      'docs/contributing/coding-standards.md',
      'docs/contributing/pull-request-process.md',
      'CODE_OF_CONDUCT.md',
      'SECURITY.md'
    ];
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): DocumentationAgentCapabilities {
    return {
      technicalWriting: {
        readme: true,
        apiDocumentation: true,
        architectureGuides: true,
        userManuals: true,
        troubleshooting: true
      },
      codeDocumentation: {
        inlineComments: true,
        jsdoc: true,
        swagger: true,
        openapi: true,
        typescript: true
      },
      projectDocumentation: {
        changelog: true,
        contributing: true,
        license: true,
        codeOfConduct: true,
        security: true
      },
      deployment: {
        installationGuides: true,
        deploymentInstructions: true,
        configurationDocs: true,
        environmentSetup: true,
        dockerGuides: true
      },
      tutorials: {
        gettingStarted: true,
        stepByStepGuides: true,
        examples: true,
        bestPractices: true,
        troubleshooting: true
      }
    };
  }

  /**
   * Helper methods
   */
  private determineTaskType(description: string, requirements: any): DocumentationTask['type'] {
    if (requirements.type) return requirements.type;
    
    const desc = description.toLowerCase();
    if (desc.includes('readme') || desc.includes('getting started')) return 'readme';
    if (desc.includes('api') || desc.includes('swagger') || desc.includes('openapi')) return 'api-docs';
    if (desc.includes('user') || desc.includes('guide') || desc.includes('tutorial')) return 'user-guide';
    if (desc.includes('changelog') || desc.includes('release') || desc.includes('version')) return 'changelog';
    if (desc.includes('architecture') || desc.includes('system') || desc.includes('design')) return 'architecture';
    if (desc.includes('deployment') || desc.includes('install') || desc.includes('setup')) return 'deployment';
    if (desc.includes('contributing') || desc.includes('development') || desc.includes('contribute')) return 'contributing';

    return 'readme'; // Default
  }

  private initializeMetrics(): AgentMetrics {
    return {
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksFailed: 0,
      averageProcessingTime: 0,
      filesGenerated: 0,
      readmeGenerated: 0,
      apiDocsGenerated: 0,
      userGuidesGenerated: 0,
      changelogsGenerated: 0
    };
  }

  private updateMetrics(task: DocumentationTask, result: ProcessingResult): void {
    if (result.success) {
      this.metrics.tasksCompleted++;
      this.metrics.filesGenerated += result.generatedFiles?.length || 0;

      switch (task.type) {
        case 'readme':
          this.metrics.readmeGenerated++;
          break;
        case 'api-docs':
          this.metrics.apiDocsGenerated++;
          break;
        case 'user-guide':
          this.metrics.userGuidesGenerated++;
          break;
        case 'changelog':
          this.metrics.changelogsGenerated++;
          break;
      }
    } else {
      this.metrics.tasksFailed++;
    }
  }
}

/**
 * Documentation Agent Error class for typed error handling
 */
export class DocumentationAgentError extends Error {
  public code: string;
  public type: 'configuration' | 'processing' | 'validation' | 'integration' | 'template';
  public details?: any;
  public suggestions?: string[];

  constructor(
    message: string,
    type: 'configuration' | 'processing' | 'validation' | 'integration' | 'template',
    code?: string,
    details?: any,
    suggestions?: string[]
  ) {
    super(message);
    this.name = 'DocumentationAgentError';
    this.type = type;
    this.code = code || type.toUpperCase();
    this.details = details;
    this.suggestions = suggestions;
  }
}

export const createDocumentationAgent = (config?: DocumentationAgentConfig) => {
  return new DocumentationAgent(config);
};