/**
 * Post-Creation Investigator Agent Types
 * 
 * Use context7: Types for comprehensive project validation and investigation
 * Following All-Purpose Pattern: Configurable for ANY project type and framework
 */

export interface InvestigationConfig {
  projectPath: string;
  projectType: 'next.js' | 'express' | 'react' | 'node' | 'python' | 'generic';
  framework?: string;
  skipTests?: string[];
  customChecks?: CustomCheck[];
  environmentFile?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm';
  timeout?: number;
  parallel?: boolean;
}

export interface CustomCheck {
  id: string;
  name: string;
  description: string;
  type: 'file-exists' | 'command' | 'api-call' | 'database-connection' | 'custom';
  target: string;
  expectedResult?: any;
  critical?: boolean;
}

export interface InvestigationResult {
  projectPath: string;
  timestamp: Date;
  duration: number;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  score: number; // 0-100
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
    critical: number;
  };
  categories: {
    structure: CategoryResult;
    dependencies: CategoryResult;
    environment: CategoryResult;
    api: CategoryResult;
    database: CategoryResult;
    security: CategoryResult;
    performance: CategoryResult;
    deployment: CategoryResult;
  };
  setupRequirements: SetupRequirement[];
  recommendations: Recommendation[];
  detailedResults: DetailedResult[];
}

export interface CategoryResult {
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  score: number;
  checks: number;
  passed: number;
  failed: number;
  warnings: number;
  issues: Issue[];
}

export interface SetupRequirement {
  id: string;
  category: 'environment' | 'api-key' | 'database' | 'service' | 'dependency';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  instructions: string[];
  links?: string[];
  estimatedTime?: string;
  resolved?: boolean;
}

export interface Recommendation {
  id: string;
  type: 'security' | 'performance' | 'maintainability' | 'deployment' | 'testing';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  instructions: string[];
}

export interface Issue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface DetailedResult {
  checkId: string;
  checkName: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  duration: number;
  description: string;
  expected?: any;
  actual?: any;
  error?: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  expectedStatus?: number[];
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface DatabaseConnection {
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'sqlite' | 'custom';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  testQuery?: string;
}

export interface EnvironmentVariable {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  description?: string;
  defaultValue?: string;
  validation?: RegExp | string;
  sensitive?: boolean;
}

export interface DependencyCheck {
  name: string;
  version?: string;
  type: 'production' | 'development';
  optional?: boolean;
  alternatives?: string[];
}

export interface PerformanceMetrics {
  buildTime?: number;
  bundleSize?: number;
  startupTime?: number;
  memoryUsage?: number;
  lighthouseScore?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

export interface SecurityScan {
  vulnerabilities: SecurityVulnerability[];
  sensitiveFiles: string[];
  exposedSecrets: ExposedSecret[];
  permissions: PermissionIssue[];
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  cve?: string;
  package?: string;
  version?: string;
  fixAvailable?: boolean;
  recommendation?: string;
}

export interface ExposedSecret {
  file: string;
  line: number;
  type: 'api-key' | 'password' | 'token' | 'private-key' | 'database-url';
  value: string;
  confidence: number;
}

export interface PermissionIssue {
  file: string;
  current: string;
  recommended: string;
  risk: 'high' | 'medium' | 'low';
  description: string;
}

export interface InvestigatorMetaAgentConfig {
  agentId: string;
  coordinatorEndpoint?: string;
  enableMetaAgentCoordination: boolean;
  enableRAGIntegration: boolean;
  knowledgeSharing: boolean;
  reportStorage: 'file' | 'database' | 'api';
  reportFormat: 'json' | 'html' | 'markdown' | 'pdf';
  enableCaching: boolean;
  cacheDirectory: string;
  parallelism: number;
  timeout: number;
}