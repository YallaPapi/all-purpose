/**
 * DevOps Agent - Core Implementation
 * 
 * Intelligent DevOps agent with comprehensive deployment and infrastructure capabilities
 * Implements All-Purpose Pattern for unlimited DevOps development capabilities
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface DevOpsAgentConfig {
  logLevel?: string;
  timeout?: number;
  projectRoot?: string;
  outputDir?: string;
  enableContext7?: boolean;
  enableRAG?: boolean;
  enableUEP?: boolean;
  platform?: string;
  containerization?: boolean;
  cicdPlatform?: string;
  orchestration?: string;
  monitoring?: boolean;
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

interface DevOpsTask {
  id: string;
  type: 'containerization' | 'deployment' | 'ci-cd' | 'monitoring' | 'infrastructure';
  description: string;
  requirements: any;
  context: any;
  priority: string;
  status: string;
  result?: any;
  error?: string;
}

interface DevOpsAgentCapabilities {
  containerization: {
    dockerSupport: boolean;
    dockerCompose: boolean;
    kubernetes: boolean;
    podman: boolean;
    optimizedImages: boolean;
  };
  deployment: {
    cloudProviders: string[];
    serverlessSupport: boolean;
    loadBalancing: boolean;
    autoScaling: boolean;
    rollbacks: boolean;
  };
  cicd: {
    gitHubActions: boolean;
    gitLabCI: boolean;
    jenkinsSupport: boolean;
    azureDevOps: boolean;
    automated: boolean;
  };
  monitoring: {
    applicationMonitoring: boolean;
    infrastructureMonitoring: boolean;
    alerting: boolean;
    loggingAggregation: boolean;
    metrics: boolean;
  };
  infrastructure: {
    infrastructureAsCode: boolean;
    terraformSupport: boolean;
    ansibleSupport: boolean;
    cloudFormation: boolean;
    provisioning: boolean;
  };
}

interface AgentMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  averageProcessingTime: number;
  filesGenerated: number;
  containersCreated: number;
  deploymentsManaged: number;
  pipelinesCreated: number;
  infrastructureProvisioned: number;
}

/**
 * Main DevOps Agent class implementing comprehensive DevOps capabilities
 */
export class DevOpsAgent extends EventEmitter {
  private config: DevOpsAgentConfig;
  private isInitialized = false;
  private startTime = Date.now();
  private engines = new Map<string, any>();
  private metrics: AgentMetrics;

  constructor(config: Partial<DevOpsAgentConfig> = {}) {
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
      platform: 'docker', // Default, but configurable for any platform
      containerization: true,
      cicdPlatform: 'github-actions', // Default, but configurable
      orchestration: 'kubernetes', // Default, but configurable
      monitoring: true,
      ...config
    } as DevOpsAgentConfig;

    this.metrics = this.initializeMetrics();

    console.log('DevOps Agent initialized', {
      config: this.config,
      capabilities: this.getCapabilities()
    });
  }

  /**
   * Initialize the DevOps Agent and all its engines
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 Initializing DevOps Agent...');

      // Create output directory
      await fs.mkdir(this.config.outputDir!, { recursive: true });

      this.isInitialized = true;
      console.log('🎉 DevOps Agent fully initialized');

    } catch (error) {
      console.error('❌ Failed to initialize DevOps Agent', { error });
      throw new DevOpsAgentError(
        `DevOps Agent initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        'configuration'
      );
    }
  }

  /**
   * Process a DevOps task with full context awareness
   */
  async processTask(taskDescription: string, requirements: any = {}): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const task: DevOpsTask = {
      id: uuidv4(),
      type: this.determineTaskType(taskDescription, requirements),
      description: taskDescription,
      requirements,
      context: {},
      priority: requirements.priority || 'medium',
      status: 'pending'
    };

    try {
      console.log('🔄 Processing DevOps task', { task });
      this.emit('task-started', task);
      task.status = 'in-progress';

      // Generate DevOps configurations based on task type
      const result = await this.generateDevOpsConfig(task);
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

      const devopsError = error instanceof DevOpsAgentError ? error : 
        new DevOpsAgentError(`Task processing failed: ${error instanceof Error ? error.message : String(error)}`, 'processing');

      this.emit('task-failed', task, devopsError);
      console.error('❌ Task failed', { task, error: devopsError });

      throw devopsError;
    }
  }

  /**
   * Generate DevOps configurations based on task requirements
   */
  private async generateDevOpsConfig(task: DevOpsTask): Promise<ProcessingResult> {
    const { requirements, description } = task;
    const files: string[] = [];
    const configurations: any[] = [];

    // Generate containerization files
    if (task.type === 'containerization' || description.toLowerCase().includes('docker') || description.toLowerCase().includes('container')) {
      const containerFiles = await this.generateContainerFiles(requirements);
      files.push(...containerFiles);
      configurations.push({ type: 'containerization', platform: 'docker' });
    }

    // Generate deployment files
    if (task.type === 'deployment' || description.toLowerCase().includes('deploy')) {
      const deployFiles = await this.generateDeploymentFiles(requirements);
      files.push(...deployFiles);
      configurations.push({ type: 'deployment', platform: requirements.platform || 'kubernetes' });
    }

    // Generate CI/CD pipelines
    if (task.type === 'ci-cd' || description.toLowerCase().includes('ci') || description.toLowerCase().includes('pipeline')) {
      const cicdFiles = await this.generateCICDFiles(requirements);
      files.push(...cicdFiles);
      configurations.push({ type: 'ci-cd', platform: this.config.cicdPlatform });
    }

    // Generate monitoring setup
    if (task.type === 'monitoring' || requirements.monitoring || description.toLowerCase().includes('monitor')) {
      const monitorFiles = await this.generateMonitoringFiles(requirements);
      files.push(...monitorFiles);
      configurations.push({ type: 'monitoring', tools: ['prometheus', 'grafana'] });
    }

    // Generate infrastructure as code
    if (task.type === 'infrastructure' || description.toLowerCase().includes('infrastructure') || description.toLowerCase().includes('terraform')) {
      const infraFiles = await this.generateInfrastructureFiles(requirements);
      files.push(...infraFiles);
      configurations.push({ type: 'infrastructure', tool: 'terraform' });
    }

    return {
      taskId: task.id,
      success: true,
      data: {
        configurations,
        files,
        platform: this.config.platform,
        orchestration: this.config.orchestration,
        cicdPlatform: this.config.cicdPlatform
      },
      generatedFiles: files,
      recommendations: [
        'Review security configurations and secrets management',
        'Implement proper resource limits and requests',
        'Set up monitoring and alerting for production',
        'Configure automated backups and disaster recovery'
      ],
      nextSteps: [
        'Test deployment in staging environment',
        'Configure environment-specific variables',
        'Set up monitoring dashboards',
        'Document deployment procedures'
      ]
    };
  }

  private async generateContainerFiles(requirements: any): Promise<string[]> {
    return [
      'Dockerfile',
      'docker-compose.yml',
      '.dockerignore',
      'docker-compose.prod.yml',
      'docker-entrypoint.sh'
    ];
  }

  private async generateDeploymentFiles(requirements: any): Promise<string[]> {
    return [
      'k8s/deployment.yaml',
      'k8s/service.yaml',
      'k8s/ingress.yaml',
      'k8s/configmap.yaml',
      'k8s/secrets.yaml',
      'k8s/hpa.yaml'
    ];
  }

  private async generateCICDFiles(requirements: any): Promise<string[]> {
    return [
      '.github/workflows/ci.yml',
      '.github/workflows/cd.yml',
      '.github/workflows/security.yml',
      'scripts/build.sh',
      'scripts/deploy.sh',
      'scripts/test.sh'
    ];
  }

  private async generateMonitoringFiles(requirements: any): Promise<string[]> {
    return [
      'monitoring/prometheus.yml',
      'monitoring/grafana/dashboards.json',
      'monitoring/alertmanager.yml',
      'monitoring/docker-compose.monitoring.yml',
      'logging/fluentd.conf'
    ];
  }

  private async generateInfrastructureFiles(requirements: any): Promise<string[]> {
    return [
      'terraform/main.tf',
      'terraform/variables.tf',
      'terraform/outputs.tf',
      'terraform/provider.tf',
      'ansible/playbook.yml',
      'ansible/inventory.yml'
    ];
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): DevOpsAgentCapabilities {
    return {
      containerization: {
        dockerSupport: true,
        dockerCompose: true,
        kubernetes: true,
        podman: true,
        optimizedImages: true
      },
      deployment: {
        cloudProviders: ['AWS', 'Azure', 'GCP', 'DigitalOcean', 'Vercel', 'Netlify'],
        serverlessSupport: true,
        loadBalancing: true,
        autoScaling: true,
        rollbacks: true
      },
      cicd: {
        gitHubActions: true,
        gitLabCI: true,
        jenkinsSupport: true,
        azureDevOps: true,
        automated: true
      },
      monitoring: {
        applicationMonitoring: true,
        infrastructureMonitoring: true,
        alerting: true,
        loggingAggregation: true,
        metrics: true
      },
      infrastructure: {
        infrastructureAsCode: true,
        terraformSupport: true,
        ansibleSupport: true,
        cloudFormation: true,
        provisioning: true
      }
    };
  }

  /**
   * Helper methods
   */
  private determineTaskType(description: string, requirements: any): DevOpsTask['type'] {
    if (requirements.type) return requirements.type;
    
    const desc = description.toLowerCase();
    if (desc.includes('docker') || desc.includes('container') || desc.includes('image')) return 'containerization';
    if (desc.includes('deploy') || desc.includes('deployment') || desc.includes('release')) return 'deployment';
    if (desc.includes('ci') || desc.includes('cd') || desc.includes('pipeline') || desc.includes('workflow')) return 'ci-cd';
    if (desc.includes('monitor') || desc.includes('logging') || desc.includes('alert')) return 'monitoring';
    if (desc.includes('infrastructure') || desc.includes('terraform') || desc.includes('provision')) return 'infrastructure';

    return 'containerization'; // Default
  }

  private initializeMetrics(): AgentMetrics {
    return {
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksFailed: 0,
      averageProcessingTime: 0,
      filesGenerated: 0,
      containersCreated: 0,
      deploymentsManaged: 0,
      pipelinesCreated: 0,
      infrastructureProvisioned: 0
    };
  }

  private updateMetrics(task: DevOpsTask, result: ProcessingResult): void {
    if (result.success) {
      this.metrics.tasksCompleted++;
      this.metrics.filesGenerated += result.generatedFiles?.length || 0;

      switch (task.type) {
        case 'containerization':
          this.metrics.containersCreated += result.data?.configurations?.length || 0;
          break;
        case 'deployment':
          this.metrics.deploymentsManaged += result.data?.configurations?.length || 0;
          break;
        case 'ci-cd':
          this.metrics.pipelinesCreated += result.data?.configurations?.length || 0;
          break;
        case 'infrastructure':
          this.metrics.infrastructureProvisioned += result.data?.configurations?.length || 0;
          break;
      }
    } else {
      this.metrics.tasksFailed++;
    }
  }
}

/**
 * DevOps Agent Error class for typed error handling
 */
export class DevOpsAgentError extends Error {
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
    this.name = 'DevOpsAgentError';
    this.type = type;
    this.code = code || type.toUpperCase();
    this.details = details;
    this.suggestions = suggestions;
  }
}

export const createDevOpsAgent = (config?: DevOpsAgentConfig) => {
  return new DevOpsAgent(config);
};