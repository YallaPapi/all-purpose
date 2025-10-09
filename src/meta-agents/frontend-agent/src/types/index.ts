/**
 * Frontend Agent Types
 * Comprehensive type definitions for frontend development agent
 */

import { EventEmitter } from 'events';

// Core Frontend Agent Types
export interface FrontendAgentConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timeout: number;
  projectRoot: string;
  outputDir: string;
  enableContext7: boolean;
  enableRAG: boolean;
  enableUEP: boolean;
  uiFramework: 'react' | 'vue' | 'angular' | 'svelte' | 'solid';
  cssFramework: 'tailwind' | 'bootstrap' | 'bulma' | 'chakra' | 'emotion' | 'styled-components';
  stateManagement: 'redux' | 'zustand' | 'mobx' | 'context' | 'jotai' | 'valtio';
  testFramework: 'jest' | 'vitest' | 'cypress' | 'playwright';
}

export interface FrontendAgentCapabilities {
  componentGeneration: {
    reactComponents: boolean;
    vueComponents: boolean;
    angularComponents: boolean;
    svelteComponents: boolean;
    customHooks: boolean;
    storybook: boolean;
  };
  uiDesign: {
    responsiveDesign: boolean;
    themingSystem: boolean;
    designTokens: boolean;
    componentLibrary: boolean;
    accessibilityCompliance: boolean;
  };
  stateManagement: {
    globalState: boolean;
    localState: boolean;
    asyncDataFetching: boolean;
    caching: boolean;
    optimisticUpdates: boolean;
  };
  performance: {
    codesplitting: boolean;
    lazyLoading: boolean;
    bundleOptimization: boolean;
    imageOptimization: boolean;
    criticalCss: boolean;
  };
  testing: {
    unitTests: boolean;
    integrationTests: boolean;
    e2eTests: boolean;
    visualRegression: boolean;
    accessibilityTests: boolean;
  };
}

// UEP Integration Types
export interface UEPMessage {
  id: string;
  type: 'request' | 'response' | 'event';
  agentId: string;
  payload: any;
  timestamp: string;
  sessionId?: string;
}

export interface UEPContext {
  sessionId: string;
  memory: any;
  codebaseContext: any;
  validationResults: any;
}

// Context7 Integration Types
export interface Context7ScanRequest {
  taskDescription: string;
  scanPatterns: string[];
  ignorePatterns: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface Context7ScanResult {
  relevantFiles: FileContext[];
  codePatterns: CodePattern[];
  apiEndpoints: APIEndpoint[];
  databaseSchemas: DatabaseSchema[];
  middlewarePatterns: MiddlewarePattern[];
  securityPatterns: SecurityPattern[];
  testingPatterns: TestingPattern[];
}

export interface FileContext {
  filePath: string;
  content: string;
  language: string;
  relevanceScore: number;
  lastModified: string;
  size: number;
}

export interface CodePattern {
  type: 'api-endpoint' | 'middleware' | 'model' | 'service' | 'utility';
  pattern: string;
  description: string;
  examples: string[];
  filePath: string;
  lineNumber: number;
}

// API Design Types
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  middleware: string[];
  validation: ValidationSchema;
  documentation: string;
  parameters: Parameter[];
  responses: Response[];
}

export interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  location: 'path' | 'query' | 'body' | 'header';
  required: boolean;
  description: string;
  validation?: any;
}

export interface Response {
  statusCode: number;
  description: string;
  schema?: any;
  examples?: any[];
}

export interface ValidationSchema {
  schema: any;
  options: any;
}

// Database Design Types
export interface DatabaseSchema {
  tableName: string;
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
  constraints: Constraint[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  primaryKey: boolean;
  unique: boolean;
  description: string;
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface Constraint {
  name: string;
  type: 'CHECK' | 'UNIQUE' | 'NOT NULL';
  definition: string;
}

// Security Types
export interface SecurityPattern {
  type: 'authentication' | 'authorization' | 'input-validation' | 'rate-limiting' | 'encryption';
  pattern: string;
  description: string;
  implementation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string[];
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    filePath: string;
    lineNumber: number;
    column: number;
  };
  recommendation: string;
  cweId?: string;
  owaspCategory?: string;
}

// Testing Types
export interface TestingPattern {
  type: 'unit' | 'integration' | 'e2e' | 'load' | 'security';
  framework: string;
  pattern: string;
  description: string;
  examples: string[];
}

export interface TestSuite {
  name: string;
  type: TestingPattern['type'];
  tests: TestCase[];
  setup?: string;
  teardown?: string;
  fixtures?: any[];
}

export interface TestCase {
  name: string;
  description: string;
  code: string;
  expectedResult: any;
  mocks?: MockData[];
}

export interface MockData {
  name: string;
  type: 'database' | 'api' | 'service';
  data: any;
}

// Middleware Types
export interface MiddlewarePattern {
  name: string;
  type: 'authentication' | 'authorization' | 'validation' | 'logging' | 'error-handling' | 'cors' | 'rate-limiting';
  implementation: string;
  configuration: any;
  dependencies: string[];
}

// Task and Processing Types
export interface BackendTask {
  id: string;
  type: 'api-design' | 'database-design' | 'security-analysis' | 'test-generation' | 'documentation';
  description: string;
  requirements: any;
  context: Context7ScanResult;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface ProcessingResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  generatedFiles?: GeneratedFile[];
  recommendations?: string[];
  nextSteps?: string[];
  processingTime?: number;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'source' | 'test' | 'config' | 'documentation';
  language: string;
  description: string;
}

// Engine Interface Types
export interface BackendEngine extends EventEmitter {
  name: string;
  initialize(config: any): Promise<void>;
  process(task: BackendTask): Promise<ProcessingResult>;
  getCapabilities(): any;
  getStatus(): any;
  shutdown(): Promise<void>;
}

// Agent Status and Metrics
export interface BackendAgentStatus {
  name: string;
  version: string;
  initialized: boolean;
  uptime: number;
  config: Partial<BackendAgentConfig>;
  capabilities: BackendAgentCapabilities;
  engines: EngineStatus[];
  metrics: AgentMetrics;
  timestamp: string;
}

export interface EngineStatus {
  name: string;
  initialized: boolean;
  status: 'active' | 'idle' | 'error';
  lastActivity: string;
  processedTasks: number;
  errors: number;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  averageProcessingTime: number;
  filesGenerated: number;
  apiEndpointsCreated: number;
  databaseSchemasDesigned: number;
  securityIssuesFound: number;
  testsGenerated: number;
  componentsCreated: number;
  layoutsDesigned: number;
  performanceOptimizations: number;
  accessibilityImprovements: number;
}

// Template and Generation Types
export interface TemplateContext {
  projectName: string;
  framework: string;
  databaseType: string;
  authStrategy: string;
  apiEndpoints: APIEndpoint[];
  databaseSchemas: DatabaseSchema[];
  middlewarePatterns: MiddlewarePattern[];
  securityPatterns: SecurityPattern[];
  customData: Record<string, any>;
}

export interface TemplateFile {
  name: string;
  content: string;
  context: TemplateContext;
  outputPath: string;
}

// RAG Integration Types
export interface RAGContext {
  query: string;
  relevantDocuments: Document[];
  contextScore: number;
  lastUpdated: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'documentation' | 'example' | 'pattern' | 'tutorial';
  tags: string[];
  relevanceScore: number;
}

// Error Types
export interface BackendAgentError extends Error {
  code: string;
  type: 'configuration' | 'processing' | 'validation' | 'integration' | 'template';
  details?: any;
  suggestions?: string[];
}

// Event Types
export interface BackendAgentEvents {
  'task-started': (task: BackendTask) => void;
  'task-completed': (task: BackendTask, result: ProcessingResult) => void;
  'task-failed': (task: BackendTask, error: BackendAgentError) => void;
  'engine-initialized': (engineName: string) => void;
  'engine-error': (engineName: string, error: Error) => void;
  'context-updated': (context: Context7ScanResult) => void;
  'files-generated': (files: GeneratedFile[]) => void;
}

// Backend Types (for compatibility with mixed engines)
export interface BackendAgentConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timeout: number;
  projectRoot: string;
  outputDir: string;
  enableContext7: boolean;
  enableRAG: boolean;
  enableUEP: boolean;
  apiFramework: string;
  databaseType: string;
  authStrategy: string;
  testFramework: string;
}

export interface BackendAgentCapabilities {
  apiDesign: any;
  database: any;
  security: any;
  testing: any;
  documentation: any;
}

// Frontend Agent Types
export interface FrontendAgentConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  timeout: number;
  projectRoot: string;
  outputDir: string;
  enableContext7: boolean;
  enableRAG: boolean;
  enableUEP: boolean;
  uiFramework: 'react' | 'vue' | 'angular' | 'svelte' | 'solid';
  cssFramework: 'tailwind' | 'bootstrap' | 'bulma' | 'chakra' | 'emotion' | 'styled-components';
  stateManagement: 'redux' | 'zustand' | 'mobx' | 'context' | 'jotai' | 'valtio';
  testFramework: 'jest' | 'vitest' | 'cypress' | 'playwright';
}

export interface FrontendAgentCapabilities {
  componentGeneration: {
    reactComponents: boolean;
    vueComponents: boolean;
    angularComponents: boolean;
    svelteComponents: boolean;
    customHooks: boolean;
    storybook: boolean;
  };
  uiDesign: {
    responsiveDesign: boolean;
    themingSystem: boolean;
    designTokens: boolean;
    componentLibrary: boolean;
    accessibilityCompliance: boolean;
  };
  stateManagement: {
    globalState: boolean;
    localState: boolean;
    asyncDataFetching: boolean;
    caching: boolean;
    optimisticUpdates: boolean;
  };
  performance: {
    codesplitting: boolean;
    lazyLoading: boolean;
    bundleOptimization: boolean;
    imageOptimization: boolean;
    criticalCss: boolean;
  };
  testing: {
    unitTests: boolean;
    integrationTests: boolean;
    e2eTests: boolean;
    visualRegression: boolean;
    accessibilityTests: boolean;
  };
}

export interface FrontendTask {
  id: string;
  type: 'component-generation' | 'ui-design' | 'state-management' | 'performance-optimization' | 'accessibility' | 'generate-component' | 'design-ui' | 'setup-state' | 'optimize-performance' | 'write-tests';
  description: string;
  requirements: any;
  context: Context7ScanResult;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface FrontendEngine extends EventEmitter {
  name: string;
  initialize(config: any): Promise<void>;
  process(task: FrontendTask): Promise<ProcessingResult>;
  getCapabilities(): any;
  getStatus(): any;
  shutdown(): Promise<void>;
}

export interface FrontendAgentStatus {
  name: string;
  version: string;
  initialized: boolean;
  uptime: number;
  config: Partial<FrontendAgentConfig>;
  capabilities: FrontendAgentCapabilities;
  engines: EngineStatus[];
  metrics: AgentMetrics;
  timestamp: string;
}

export interface FrontendAgentEvents {
  'task-started': (task: FrontendTask) => void;
  'task-completed': (task: FrontendTask, result: ProcessingResult) => void;
  'task-failed': (task: FrontendTask, error: FrontendAgentError) => void;  
  'engine-initialized': (engineName: string) => void;
  'engine-error': (engineName: string, error: Error) => void;
  'context-updated': (context: Context7ScanResult) => void;
  'files-generated': (files: GeneratedFile[]) => void;
}

export interface FrontendAgentError extends Error {
  code: string;
  type: 'configuration' | 'processing' | 'validation' | 'integration' | 'template';
  details?: any;
  suggestions?: string[];
}