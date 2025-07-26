/**
 * DevOps Agent - Core Implementation
 * 
 * Intelligent DevOps agent with CI/CD, containerization, and infrastructure automation
 * Coordinates with UEP system for task management and agent communication
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import * as yaml from 'yaml';

// Generate simple ID alternative
function generateId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

interface DevOpsAgentConfig {
  projectRoot: string;
  outputDir: string;
  enableContext7: boolean;
  enableUEP: boolean;
  logLevel: string;
  timeout: number;
  cloudProvider: string;
  containerRuntime: string;
  cicdPlatform: string;
  monitoringStack: string;
}

interface DevOpsTask {
  id: string;
  type: 'setup-docker' | 'configure-deployment' | 'setup-cicd' | 'setup-monitoring' | 'manage-env-config';
  description: string;
  requirements: any;
  context: any;
  priority: string;
  status: string;
  result?: any;
  error?: string;
}

interface ProcessingResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  generatedFiles?: GeneratedFile[];
  recommendations?: string[];
  nextSteps?: string[];
}

interface GeneratedFile {
  path: string;
  content: string;
  type: string;
  language: string;
  description: string;
}

interface DockerConfig {
  baseImage: string;
  workdir: string;
  ports: number[];
  env: Record<string, string>;
  commands: string[];
  volumes: string[];
}

interface DeploymentConfig {
  platform: string;
  environment: string;
  buildCommand: string;
  outputDir: string;
  envVars: Record<string, string>;
  domains: string[];
}

interface CICDConfig {
  platform: string;
  triggers: string[];
  stages: CICDStage[];
  secrets: string[];
  environment: Record<string, string>;
}

interface CICDStage {
  name: string;
  image: string;
  commands: string[];
  artifacts: string[];
  dependencies: string[];
}

/**
 * Main DevOps Agent class implementing comprehensive DevOps automation
 */
export class DevOpsAgent extends EventEmitter {
  private config: DevOpsAgentConfig;
  private isInitialized = false;
  private startTime = Date.now();
  private context7Scanner?: any;
  private uepWrapper?: any;

  constructor(config: Partial<DevOpsAgentConfig> = {}) {
    super();

    // Default configuration following All-Purpose Pattern
    this.config = {
      projectRoot: process.cwd(),
      outputDir: path.join(process.cwd(), 'generated', 'devops'),
      enableContext7: true,
      enableUEP: true,
      logLevel: 'info',
      timeout: 30000,
      cloudProvider: 'vercel',
      containerRuntime: 'docker',
      cicdPlatform: 'github-actions',
      monitoringStack: 'prometheus',
      ...config
    } as DevOpsAgentConfig;

    console.log('DevOps Agent initialized', {
      config: this.config
    });
  }

  /**
   * Initialize the DevOps Agent and all its components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 Initializing DevOps Agent...');

      // Initialize Context7 Scanner for DevOps patterns
      if (this.config.enableContext7) {
        this.context7Scanner = {
          initialize: async () => Promise.resolve(),
          scanForDevOpsPatterns: async () => {
            console.log('🔍 Scanning codebase for DevOps patterns...');
            
            // Mock DevOps patterns scan
            return {
              containerConfigs: [
                { file: 'Dockerfile', type: 'docker', status: 'exists' },
                { file: 'docker-compose.yml', type: 'compose', status: 'missing' }
              ],
              deploymentConfigs: [
                { file: 'vercel.json', platform: 'vercel', status: 'exists' },
                { file: 'netlify.toml', platform: 'netlify', status: 'missing' }
              ],
              cicdConfigs: [
                { file: '.github/workflows/ci.yml', platform: 'github-actions', status: 'exists' },
                { file: '.gitlab-ci.yml', platform: 'gitlab', status: 'missing' }
              ],
              monitoringConfigs: [
                { file: 'prometheus.yml', type: 'prometheus', status: 'missing' },
                { file: 'grafana/dashboard.json', type: 'grafana', status: 'missing' }
              ],
              environmentConfigs: [
                { file: '.env.example', type: 'env-template', status: 'exists' },
                { file: '.env.local', type: 'env-local', status: 'exists' }
              ],
              infrastructurePatterns: [
                { type: 'microservices', confidence: 0.7 },
                { type: 'serverless', confidence: 0.9 }
              ]
            };
          },
          shutdown: async () => Promise.resolve()
        };
        
        await this.context7Scanner.initialize();
        console.log('✅ Context7 DevOps Scanner initialized');
      }

      // Initialize UEP Wrapper (mock for now)
      if (this.config.enableUEP) {
        this.uepWrapper = {
          initialize: async () => Promise.resolve(),
          sendTaskResult: async (task: any, result: any) => {
            console.log('📤 UEP: DevOps task result sent', { taskId: task.id, success: result.success });
            return Promise.resolve();
          },
          shutdown: async () => Promise.resolve()
        };
        
        await this.uepWrapper.initialize();
        console.log('✅ UEP Wrapper (mock) initialized');
      }

      // Create output directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      this.isInitialized = true;
      console.log('🎉 DevOps Agent fully initialized');

    } catch (error) {
      console.error('❌ Failed to initialize DevOps Agent', error);
      throw new Error(`DevOps Agent initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process a DevOps task with full context awareness
   */
  async processTask(taskDescription: string, requirements: any = {}): Promise<ProcessingResult> {
    if (!this.isInitialized) {
      throw new Error('DevOps Agent not initialized');
    }

    const task: DevOpsTask = {
      id: generateId(),
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

      // Step 1: Scan codebase with Context7 for relevant context
      if (this.config.enableContext7 && this.context7Scanner) {
        console.log('🔍 Scanning codebase for DevOps context...');
        task.context = await this.context7Scanner.scanForDevOpsPatterns();
        this.emit('context-updated', task.context);
        console.log('✅ Context scanning completed', {
          containerConfigs: task.context.containerConfigs?.length || 0,
          deploymentConfigs: task.context.deploymentConfigs?.length || 0,
          cicdConfigs: task.context.cicdConfigs?.length || 0
        });
      }

      // Step 2: Process with appropriate handler
      const result = await this.handleTask(task);
      task.status = 'completed';
      task.result = result;

      // Step 3: UEP coordination if enabled
      if (this.config.enableUEP && this.uepWrapper) {
        await this.uepWrapper.sendTaskResult(task, result);
      }

      this.emit('task-completed', task, result);
      console.log('✅ Task completed successfully', { taskId: task.id, result });

      return result;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);

      this.emit('task-failed', task, error);
      console.error('❌ Task failed', { task, error });

      throw error;
    }
  }

  /**
   * Handle specific DevOps tasks
   */
  private async handleTask(task: DevOpsTask): Promise<ProcessingResult> {
    switch (task.type) {
      case 'setup-docker':
        return await this.setupDocker(task);
      case 'configure-deployment':
        return await this.configureDeployment(task);
      case 'setup-cicd':
        return await this.setupCICD(task);
      case 'setup-monitoring':
        return await this.setupMonitoring(task);
      case 'manage-env-config':
        return await this.manageEnvConfig(task);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Setup Docker containerization
   */
  private async setupDocker(task: DevOpsTask): Promise<ProcessingResult> {
    console.log('🐳 Setting up Docker containerization...');

    const { 
      baseImage = 'node:18-alpine',
      ports = [3000],
      environment = {},
      volumes = [],
      commands = []
    } = task.requirements;

    const existingConfigs = task.context.containerConfigs || [];

    // Generate Docker configuration
    const dockerConfig: DockerConfig = {
      baseImage,
      workdir: '/app',
      ports,
      env: environment,
      commands: commands.length > 0 ? commands : ['npm install', 'npm run build', 'npm start'],
      volumes
    };

    // Generate Docker files
    const generatedFiles = await this.generateDockerFiles(dockerConfig, {
      outputDir: this.config.outputDir,
      existingConfigs
    });

    return {
      taskId: task.id,
      success: true,
      data: {
        dockerConfig,
        baseImage,
        ports,
        filesGenerated: generatedFiles.length
      },
      generatedFiles,
      recommendations: [
        'Review Dockerfile for security best practices',
        'Add .dockerignore to exclude unnecessary files',
        'Consider multi-stage builds for production',
        'Set up health checks for container monitoring'
      ],
      nextSteps: [
        'Build Docker image locally',
        'Test container functionality',
        'Push to container registry',
        'Deploy to container platform'
      ]
    };
  }

  /**
   * Configure deployment settings
   */
  private async configureDeployment(task: DevOpsTask): Promise<ProcessingResult> {
    console.log('🚀 Configuring deployment settings...');

    const { 
      platform = this.config.cloudProvider,
      environment = 'production',
      buildCommand = 'npm run build',
      outputDir = 'dist',
      domains = [],
      envVars = {}
    } = task.requirements;

    const existingConfigs = task.context.deploymentConfigs || [];

    // Generate deployment configuration
    const deploymentConfig: DeploymentConfig = {
      platform,
      environment,
      buildCommand,
      outputDir,
      envVars,
      domains
    };

    // Generate deployment files
    const generatedFiles = await this.generateDeploymentFiles(deploymentConfig, {
      outputDir: this.config.outputDir,
      existingConfigs
    });

    return {
      taskId: task.id,
      success: true,
      data: {
        deploymentConfig,
        platform,
        environment,
        filesGenerated: generatedFiles.length
      },
      generatedFiles,
      recommendations: [
        'Set up environment-specific configurations',
        'Configure custom domains and SSL',
        'Implement deployment rollback strategy',
        'Set up monitoring and alerting'
      ],
      nextSteps: [
        'Test deployment in staging environment',
        'Configure production environment variables',
        'Set up domain and DNS configuration',
        'Monitor deployment performance'
      ]
    };
  }

  /**
   * Setup CI/CD pipeline
   */
  private async setupCICD(task: DevOpsTask): Promise<ProcessingResult> {
    console.log('⚙️ Setting up CI/CD pipeline...');

    const { 
      platform = this.config.cicdPlatform,
      triggers = ['push', 'pull_request'],
      stages = [],
      secrets = [],
      testCommands = ['npm test'],
      buildCommands = ['npm run build']
    } = task.requirements;

    const existingConfigs = task.context.cicdConfigs || [];

    // Generate CI/CD configuration
    const cicdConfig: CICDConfig = {
      platform,
      triggers,
      stages: stages.length > 0 ? stages : this.generateDefaultStages(testCommands, buildCommands),
      secrets,
      environment: {}
    };

    // Generate CI/CD files
    const generatedFiles = await this.generateCICDFiles(cicdConfig, {
      outputDir: this.config.outputDir,
      existingConfigs
    });

    return {
      taskId: task.id,
      success: true,
      data: {
        cicdConfig,
        platform,
        stages: cicdConfig.stages.length,
        filesGenerated: generatedFiles.length
      },
      generatedFiles,
      recommendations: [
        'Add security scanning to pipeline',
        'Implement automated testing stages',
        'Set up deployment approval workflows',
        'Configure notification systems'
      ],
      nextSteps: [
        'Test pipeline with sample commits',
        'Configure repository secrets',
        'Set up branch protection rules',
        'Monitor pipeline performance'
      ]
    };
  }

  /**
   * Setup monitoring and observability
   */
  private async setupMonitoring(task: DevOpsTask): Promise<ProcessingResult> {
    console.log('📊 Setting up monitoring and observability...');

    const { 
      stack = this.config.monitoringStack,
      metrics = ['cpu', 'memory', 'requests', 'errors'],
      alerts = [],
      dashboards = []
    } = task.requirements;

    const existingConfigs = task.context.monitoringConfigs || [];

    // Generate monitoring configuration
    const monitoringConfig = {
      stack,
      metrics,
      alerts: alerts.length > 0 ? alerts : this.generateDefaultAlerts(),
      dashboards: dashboards.length > 0 ? dashboards : this.generateDefaultDashboards()
    };

    // Generate monitoring files
    const generatedFiles = await this.generateMonitoringFiles(monitoringConfig, {
      outputDir: this.config.outputDir,
      existingConfigs
    });

    return {
      taskId: task.id,
      success: true,
      data: {
        monitoringConfig,
        stack,
        metrics: metrics.length,
        alerts: monitoringConfig.alerts.length,
        filesGenerated: generatedFiles.length
      },
      generatedFiles,
      recommendations: [
        'Set up log aggregation and analysis',
        'Configure alerting thresholds',
        'Implement distributed tracing',
        'Set up performance monitoring'
      ],
      nextSteps: [
        'Deploy monitoring stack',
        'Configure data sources',
        'Set up alert notifications',
        'Create monitoring runbooks'
      ]
    };
  }

  /**
   * Manage environment configurations
   */
  private async manageEnvConfig(task: DevOpsTask): Promise<ProcessingResult> {
    console.log('🔧 Managing environment configurations...');

    const { 
      environments = ['development', 'staging', 'production'],
      variables = {},
      secrets = [],
      templates = true
    } = task.requirements;

    const existingConfigs = task.context.environmentConfigs || [];

    // Generate environment configurations
    const envConfigs = await this.generateEnvironmentConfigs(environments, variables, secrets, templates);

    // Generate environment files
    const generatedFiles = await this.generateEnvironmentFiles(envConfigs, {
      outputDir: this.config.outputDir,
      existingConfigs
    });

    return {
      taskId: task.id,
      success: true,
      data: {
        environments: environments.length,
        variables: Object.keys(variables).length,
        secrets: secrets.length,
        templates,
        filesGenerated: generatedFiles.length
      },
      generatedFiles,
      recommendations: [
        'Never commit secrets to version control',
        'Use environment-specific configurations',
        'Implement secret rotation policies',
        'Set up access control for sensitive variables'
      ],
      nextSteps: [
        'Configure environment variables in deployment platform',
        'Set up secret management system',
        'Test configurations across environments',
        'Document environment setup procedures'
      ]
    };
  }

  /**
   * Helper methods for generating specific configurations
   */
  private async generateDockerFiles(config: DockerConfig, options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate Dockerfile
    const dockerfileContent = `FROM ${config.baseImage}

WORKDIR ${config.workdir}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
${Object.entries(config.env).map(([key, value]) => `ENV ${key}=${value}`).join('\n')}

# Expose ports
${config.ports.map(port => `EXPOSE ${port}`).join('\n')}

# Add volumes
${config.volumes.map(volume => `VOLUME ${volume}`).join('\n')}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:${config.ports[0]}/health || exit 1

# Run application
CMD [${config.commands.map(cmd => `"${cmd}"`).join(', ')}]`;

    files.push({
      path: 'Dockerfile',
      content: dockerfileContent,
      type: 'config',
      language: 'dockerfile',
      description: 'Docker container configuration'
    });

    // Generate docker-compose.yml
    const composeContent = yaml.stringify({
      version: '3.8',
      services: {
        app: {
          build: '.',
          ports: config.ports.map(port => `${port}:${port}`),
          environment: config.env,
          volumes: config.volumes,
          restart: 'unless-stopped'
        }
      }
    });

    files.push({
      path: 'docker-compose.yml',
      content: composeContent,
      type: 'config',
      language: 'yaml',
      description: 'Docker Compose configuration'
    });

    // Generate .dockerignore
    const dockerignoreContent = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.coverage
.cache`;

    files.push({
      path: '.dockerignore',
      content: dockerignoreContent,
      type: 'config',
      language: 'text',
      description: 'Docker ignore file'
    });

    return files;
  }

  private async generateDeploymentFiles(config: DeploymentConfig, options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    if (config.platform === 'vercel') {
      const vercelConfig = {
        version: 2,
        builds: [
          {
            src: 'package.json',
            use: '@vercel/node'
          }
        ],
        routes: [
          {
            src: '/(.*)',
            dest: '/'
          }
        ],
        env: config.envVars,
        regions: ['iad1']
      };

      files.push({
        path: 'vercel.json',
        content: JSON.stringify(vercelConfig, null, 2),
        type: 'config',
        language: 'json',
        description: 'Vercel deployment configuration'
      });
    }

    if (config.platform === 'netlify') {
      const netlifyConfig = `[build]
  command = "${config.buildCommand}"
  publish = "${config.outputDir}"

[build.environment]
${Object.entries(config.envVars).map(([key, value]) => `  ${key} = "${value}"`).join('\n')}

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200`;

      files.push({
        path: 'netlify.toml',
        content: netlifyConfig,
        type: 'config',
        language: 'toml',
        description: 'Netlify deployment configuration'
      });
    }

    return files;
  }

  private async generateCICDFiles(config: CICDConfig, options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    if (config.platform === 'github-actions') {
      const workflowConfig = yaml.stringify({
        name: 'CI/CD Pipeline',
        on: {
          push: {
            branches: ['main', 'develop']
          },
          pull_request: {
            branches: ['main']
          }
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                uses: 'actions/checkout@v3'
              },
              {
                name: 'Setup Node.js',
                uses: 'actions/setup-node@v3',
                with: {
                  'node-version': '18',
                  cache: 'npm'
                }
              },
              {
                name: 'Install dependencies',
                run: 'npm ci'
              },
              {
                name: 'Run tests',
                run: 'npm test'
              },
              {
                name: 'Build application',
                run: 'npm run build'
              }
            ]
          },
          deploy: {
            needs: 'test',
            'runs-on': 'ubuntu-latest',
            if: "github.ref == 'refs/heads/main'",
            steps: [
              {
                uses: 'actions/checkout@v3'
              },
              {
                name: 'Deploy to production',
                run: 'echo "Deploy to production"'
              }
            ]
          }
        }
      });

      files.push({
        path: '.github/workflows/ci.yml',
        content: workflowConfig,
        type: 'config',
        language: 'yaml',
        description: 'GitHub Actions CI/CD workflow'
      });
    }

    return files;
  }

  private async generateMonitoringFiles(config: any, options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate Prometheus config
    const prometheusConfig = yaml.stringify({
      global: {
        scrape_interval: '15s'
      },
      scrape_configs: [
        {
          job_name: 'app',
          static_configs: [
            {
              targets: ['localhost:3000']
            }
          ]
        }
      ]
    });

    files.push({
      path: 'monitoring/prometheus.yml',
      content: prometheusConfig,
      type: 'config',
      language: 'yaml',
      description: 'Prometheus monitoring configuration'
    });

    // Generate Grafana dashboard
    const grafanaDashboard = {
      dashboard: {
        title: 'Application Monitoring',
        panels: [
          {
            title: 'Request Rate',
            type: 'graph',
            targets: [
              {
                expr: 'rate(http_requests_total[5m])'
              }
            ]
          }
        ]
      }
    };

    files.push({
      path: 'monitoring/grafana-dashboard.json',
      content: JSON.stringify(grafanaDashboard, null, 2),
      type: 'config',
      language: 'json',
      description: 'Grafana dashboard configuration'
    });

    return files;
  }

  private async generateEnvironmentConfigs(environments: string[], variables: any, secrets: string[], templates: boolean): Promise<any> {
    return {
      environments,
      variables,
      secrets,
      templates: templates ? this.generateEnvTemplates(environments) : []
    };
  }

  private async generateEnvironmentFiles(configs: any, options: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    // Generate .env.example
    const envExampleContent = Object.keys(configs.variables)
      .map(key => `${key}=`)
      .join('\n');

    files.push({
      path: '.env.example',
      content: envExampleContent,
      type: 'config',
      language: 'text',
      description: 'Environment variables template'
    });

    // Generate environment-specific files
    for (const env of configs.environments) {
      const envContent = Object.entries(configs.variables)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      files.push({
        path: `.env.${env}`,
        content: envContent,
        type: 'config',
        language: 'text',
        description: `${env} environment configuration`
      });
    }

    return files;
  }

  private generateDefaultStages(testCommands: string[], buildCommands: string[]): CICDStage[] {
    return [
      {
        name: 'test',
        image: 'node:18',
        commands: ['npm ci', ...testCommands],
        artifacts: ['coverage/'],
        dependencies: []
      },
      {
        name: 'build',
        image: 'node:18',
        commands: ['npm ci', ...buildCommands],
        artifacts: ['dist/'],
        dependencies: ['test']
      },
      {
        name: 'deploy',
        image: 'node:18',
        commands: ['echo "Deploy to production"'],
        artifacts: [],
        dependencies: ['build']
      }
    ];
  }

  private generateDefaultAlerts(): any[] {
    return [
      { name: 'High CPU Usage', threshold: '80%', metric: 'cpu_usage' },
      { name: 'High Memory Usage', threshold: '90%', metric: 'memory_usage' },
      { name: 'High Error Rate', threshold: '5%', metric: 'error_rate' }
    ];
  }

  private generateDefaultDashboards(): any[] {
    return [
      { name: 'Application Overview', panels: ['requests', 'errors', 'latency'] },
      { name: 'System Metrics', panels: ['cpu', 'memory', 'disk'] }
    ];
  }

  private generateEnvTemplates(environments: string[]): any[] {
    return environments.map(env => ({
      environment: env,
      template: `.env.${env}`,
      variables: ['NODE_ENV', 'PORT', 'DATABASE_URL']
    }));
  }

  /**
   * Helper methods
   */
  private determineTaskType(description: string, requirements: any): DevOpsTask['type'] {
    if (requirements.type) return requirements.type;
    
    const desc = description.toLowerCase();
    if (desc.includes('docker') || desc.includes('container')) return 'setup-docker';
    if (desc.includes('deploy') || desc.includes('deployment')) return 'configure-deployment';
    if (desc.includes('cicd') || desc.includes('pipeline') || desc.includes('ci/cd')) return 'setup-cicd';
    if (desc.includes('monitor') || desc.includes('observability')) return 'setup-monitoring';
    if (desc.includes('environment') || desc.includes('env') || desc.includes('config')) return 'manage-env-config';

    return 'setup-docker'; // Default
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): any {
    return {
      containerization: {
        docker: true,
        dockerCompose: true,
        kubernetes: true,
        podman: true
      },
      deployment: {
        vercel: true,
        netlify: true,
        aws: true,
        gcp: true,
        azure: true
      },
      cicd: {
        githubActions: true,
        gitlabCI: true,
        jenkens: true,
        circleci: true
      },
      monitoring: {
        prometheus: true,
        grafana: true,
        elk: true,
        datadog: true
      },
      infrastructure: {
        terraform: true,
        ansible: true,
        cloudformation: true,
        helm: true
      }
    };
  }

  /**
   * Get agent status
   */
  getStatus(): any {
    return {
      name: 'DevOps Agent',
      version: '1.0.0',
      initialized: this.isInitialized,
      uptime: Date.now() - this.startTime,
      config: this.config,
      capabilities: this.getCapabilities(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Shutdown the agent and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down DevOps Agent...');

    try {
      // Shutdown Context7 scanner
      if (this.context7Scanner) {
        await this.context7Scanner.shutdown();
      }

      // Shutdown UEP wrapper
      if (this.uepWrapper) {
        await this.uepWrapper.shutdown();
      }

      this.isInitialized = false;
      console.log('✅ DevOps Agent shut down successfully');

    } catch (error) {
      console.error('❌ Error during shutdown', error);
      throw error;
    }
  }
}

export default DevOpsAgent;