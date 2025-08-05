/**
 * DevOps Agent - Type Definitions
 * 
 * Complete type system for DevOps Agent with UEP integration
 */

// DevOps Agent Configuration
export interface DevOpsAgentConfig {
  projectRoot?: string;
  outputDir?: string;
  enableContext7?: boolean;
  enableRAG?: boolean;
  enableUEP?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  timeout?: number;
  cloudProvider?: string;
  containerRuntime?: string;
  cicdPlatform?: string;
  monitoringStack?: string;
}

// DevOps Agent Capabilities
export interface DevOpsAgentCapabilities {
  containerization: {
    docker: boolean;
    dockerCompose: boolean;
    kubernetes: boolean;
    podman: boolean;
    buildah: boolean;
    containerd: boolean;
  };
  deployment: {
    vercel: boolean;
    netlify: boolean;
    aws: boolean;
    gcp: boolean;
    azure: boolean;
    digitalocean: boolean;
    heroku: boolean;
    railway: boolean;
  };
  cicd: {
    githubActions: boolean;
    gitlabCI: boolean;
    jenkins: boolean;
    circleci: boolean;
    travisci: boolean;
    azuredevops: boolean;
    bitbucketpipelines: boolean;
  };
  monitoring: {
    prometheus: boolean;
    grafana: boolean;
    elk: boolean;
    datadog: boolean;
    newrelic: boolean;
    sentry: boolean;
    jaeger: boolean;
    zipkin: boolean;
  };
  infrastructure: {
    terraform: boolean;
    ansible: boolean;
    cloudformation: boolean;
    helm: boolean;
    pulumi: boolean;
    vagrant: boolean;
  };
  security: {
    secretsManagement: boolean;
    vulnerabilityScanning: boolean;
    complianceChecks: boolean;
    accessControl: boolean;
  };
}

// DevOps Task Types
export interface DevOpsTask {
  id: string;
  type: 'setup-docker' | 'configure-deployment' | 'setup-cicd' | 'setup-monitoring' | 'manage-env-config' | 'setup-infrastructure';
  description: string;
  requirements: DevOpsTaskRequirements;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context?: DevOpsTaskContext;
  createdAt?: string;
  updatedAt?: string;
  assignedAgent?: string;
}

// DevOps Task Requirements
export interface DevOpsTaskRequirements {
  // Container requirements
  baseImage?: string;
  ports?: number[];
  environment?: Record<string, string>;
  volumes?: string[];
  commands?: string[];
  
  // Deployment requirements
  platform?: string;
  buildCommand?: string;
  outputDir?: string;
  domains?: string[];
  envVars?: Record<string, string>;
  
  // CI/CD requirements
  triggers?: string[];
  stages?: any[];
  secrets?: string[];
  testCommands?: string[];
  buildCommands?: string[];
  
  // Monitoring requirements
  metrics?: string[];
  alerts?: any[];
  dashboards?: any[];
  
  // Infrastructure requirements
  environments?: string[];
  variables?: Record<string, string>;
  templates?: boolean;
  
  // General requirements
  type?: string;
  containerRuntime?: string;
  deploymentStrategy?: string;
  requiresInfrastructure?: boolean;
  deploymentDependencies?: string[];
  environmentRequirements?: Record<string, any>;
}

// DevOps Task Context
export interface DevOpsTaskContext {
  containerConfigs?: DevOpsConfigFile[];
  deploymentConfigs?: DevOpsConfigFile[];
  cicdConfigs?: DevOpsConfigFile[];
  monitoringConfigs?: DevOpsConfigFile[];
  environmentConfigs?: DevOpsConfigFile[];
  infrastructurePatterns?: DevOpsPattern[];
}

// DevOps Configuration File
export interface DevOpsConfigFile {
  file: string;
  type?: string;
  platform?: string;
  status: 'exists' | 'missing' | 'outdated';
  content?: string;
  lastModified?: string;
}

// DevOps Pattern
export interface DevOpsPattern {
  type: string;
  confidence: number;
  files?: string[];
  technologies?: string[];
  recommendations?: string[];
}

// Processing Result with DevOps-specific data
export interface ProcessingResult {
  taskId: string;
  success: boolean;
  data?: {
    dockerConfig?: any;
    deploymentConfig?: any;
    cicdConfig?: any;
    monitoringConfig?: any;
    baseImage?: string;
    platform?: string;
    environment?: string;
    ports?: number[];
    filesGenerated?: number;
    containerConfigs?: number;
    deploymentConfigs?: number;
    cicdPipelines?: number;
    monitoringSetups?: number;
    environments?: number;
    variables?: number;
    secrets?: number;
    templates?: boolean;
  };
  generatedFiles?: GeneratedFile[];
  recommendations?: string[];
  nextSteps?: string[];
  error?: string;
  processingTime?: number;
  metrics?: DevOpsAgentMetrics;
}

// Generated File
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'config' | 'script' | 'manifest' | 'documentation';
  language: string;
  description: string;
  size?: number;
  permissions?: string;
}

// DevOps Agent Metrics
export interface DevOpsAgentMetrics {
  tasksCompleted: number;
  filesGenerated: number;
  containerConfigsCreated: number;
  deploymentConfigsGenerated: number;
  cicdPipelinesSetup: number;
  monitoringSystemsConfigured: number;
  secretsManaged: number;
  environmentsConfigured: number;
  infrastructureDeployed: number;
  securityChecksPerformed: number;
  performanceOptimizations: number;
  errorRate: number;
  averageProcessingTime: number;
  successRate: number;
}

// DevOps Engine Interface
export interface DevOpsEngine {
  name: string;
  type: 'containerization' | 'deployment' | 'cicd' | 'monitoring' | 'infrastructure' | 'security';
  version: string;
  capabilities: string[];
  
  initialize(): Promise<void>;
  processTask(task: DevOpsTask): Promise<ProcessingResult>;
  generateConfiguration(requirements: DevOpsTaskRequirements): Promise<GeneratedFile[]>;
  validateConfiguration(config: any): Promise<boolean>;
  shutdown(): Promise<void>;
}

// Context7 Scanner for DevOps patterns
export interface DevOpsContext7Scanner {
  initialize(): Promise<void>;
  scanForDevOpsPatterns(): Promise<DevOpsTaskContext>;
  scanContainerConfigurations(projectPath: string): Promise<DevOpsConfigFile[]>;
  scanDeploymentConfigurations(projectPath: string): Promise<DevOpsConfigFile[]>;
  scanCICDConfigurations(projectPath: string): Promise<DevOpsConfigFile[]>;
  scanMonitoringConfigurations(projectPath: string): Promise<DevOpsConfigFile[]>;
  scanInfrastructurePatterns(projectPath: string): Promise<DevOpsPattern[]>;
  shutdown(): Promise<void>;
}

// UEP Message Types for DevOps Agent
export interface UEPMessage {
  id: string;
  type: 'command' | 'response' | 'event' | 'request';
  agentId: string;
  payload: any;
  timestamp: string;
  sessionId: string;
}

// UEP Context for DevOps coordination
export interface UEPContext {
  sessionId: string;
  memory: Record<string, any>;
  codebaseContext: Record<string, any>;
  validationResults: Record<string, any>;
}

// Agent Status
export interface AgentStatus {
  name: string;
  version: string;
  initialized: boolean;
  uptime: number;
  config: DevOpsAgentConfig;
  capabilities: DevOpsAgentCapabilities;
  metrics: DevOpsAgentMetrics;
  engines: DevOpsEngine[];
  timestamp: string;
}

// Docker Configuration
export interface DockerConfig {
  baseImage: string;
  workdir: string;
  ports: number[];
  env: Record<string, string>;
  commands: string[];
  volumes: string[];
  healthCheck?: {
    interval: string;
    timeout: string;
    retries: number;
    startPeriod: string;
    cmd: string;
  };
}

// Deployment Configuration
export interface DeploymentConfig {
  platform: string;
  environment: string;
  buildCommand: string;
  outputDir: string;
  envVars: Record<string, string>;
  domains: string[];
  regions?: string[];
  scaling?: {
    minInstances: number;
    maxInstances: number;
    targetCPU: number;
    targetMemory: number;
  };
}

// CI/CD Configuration
export interface CICDConfig {
  platform: string;
  triggers: string[];
  stages: CICDStage[];
  secrets: string[];
  environment: Record<string, string>;
  notifications?: {
    slack?: string;
    email?: string[];
    webhook?: string;
  };
}

// CI/CD Stage
export interface CICDStage {
  name: string;
  image: string;
  commands: string[];
  artifacts: string[];
  dependencies: string[];
  environment?: Record<string, string>;
  conditions?: string[];
}

// Monitoring Configuration
export interface MonitoringConfig {
  stack: string;
  metrics: string[];
  alerts: MonitoringAlert[];
  dashboards: MonitoringDashboard[];
  retention?: {
    metrics: string;
    logs: string;
    traces: string;
  };
}

// Monitoring Alert
export interface MonitoringAlert {
  name: string;
  threshold: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: string[];
  actions: string[];
}

// Monitoring Dashboard
export interface MonitoringDashboard {
  name: string;
  panels: string[];
  timeRange?: string;
  refreshInterval?: string;
  tags?: string[];
}

// Environment Configuration
export interface EnvironmentConfig {
  environments: string[];
  variables: Record<string, string>;
  secrets: string[];
  templates: EnvironmentTemplate[];
}

// Environment Template
export interface EnvironmentTemplate {
  environment: string;
  template: string;
  variables: string[];
  required: boolean;
  description?: string;
}

// Export all types
export type {
  DevOpsAgentConfig,
  DevOpsAgentCapabilities,
  DevOpsTask,
  DevOpsTaskRequirements,
  DevOpsTaskContext,
  DevOpsConfigFile,
  DevOpsPattern,
  ProcessingResult,
  GeneratedFile,
  DevOpsAgentMetrics,
  DevOpsEngine,
  DevOpsContext7Scanner,
  UEPMessage,
  UEPContext,
  AgentStatus,
  DockerConfig,
  DeploymentConfig,
  CICDConfig,
  CICDStage,
  MonitoringConfig,
  MonitoringAlert,
  MonitoringDashboard,
  EnvironmentConfig,
  EnvironmentTemplate
};