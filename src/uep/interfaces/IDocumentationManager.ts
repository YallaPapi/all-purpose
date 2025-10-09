/**
 * Documentation Manager Interfaces
 * 
 * Defines the autonomous documentation organization system that responds
 * to agent events and project changes in real-time.
 */

export interface DocumentationEvent {
  eventId: string;
  timestamp: Date;
  eventType: DocumentationEventType;
  source: EventSource;
  projectId: string;
  agentId?: string;
  taskId?: string;
  metadata: DocumentationEventMetadata;
}

export enum DocumentationEventType {
  // Agent Events
  AGENT_CREATED = 'agent_created',
  AGENT_UPDATED = 'agent_updated',
  AGENT_COMPLETED_TASK = 'agent_completed_task',
  AGENT_FAILED = 'agent_failed',
  
  // Project Events
  PROJECT_CREATED = 'project_created',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_COMPLETED = 'project_completed',
  
  // Code Events
  CODE_COMMITTED = 'code_committed',
  FILE_CREATED = 'file_created',
  FILE_UPDATED = 'file_updated',
  FILE_DELETED = 'file_deleted',
  
  // Task Events
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  
  // Documentation Events
  DOCUMENTATION_REQUESTED = 'documentation_requested',
  DOCUMENTATION_UPDATED = 'documentation_updated',
  DOCUMENTATION_VALIDATED = 'documentation_validated'
}

export interface EventSource {
  type: 'agent' | 'human' | 'system' | 'git' | 'file_watcher';
  identifier: string;
  context?: Record<string, any>;
}

export interface DocumentationEventMetadata {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: DocumentationCategory;
  affectedFiles?: string[];
  relatedComponents?: string[];
  changes?: ChangeDescription[];
  requiredDocumentTypes?: DocumentType[];
}

export enum DocumentationCategory {
  ARCHITECTURE = 'architecture',
  API = 'api',
  SETUP = 'setup',
  DEBUGGING = 'debugging',
  INTEGRATION = 'integration',
  CHANGELOG = 'changelog',
  README = 'readme',
  PARAMETER_MAPPING = 'parameter_mapping',
  WORKFLOW = 'workflow'
}

export enum DocumentType {
  README = 'README.md',
  CHANGELOG = 'CHANGELOG.md',
  ENVIRONMENT_SETUP = 'ENVIRONMENT_SETUP.md',
  DEBUGGING_GUIDE = 'DEBUGGING_GUIDE.md',
  PARAMETER_MAPPING = 'PARAMETER_MAPPING.md',
  API_REFERENCE = 'API_REFERENCE.md',
  ARCHITECTURE = 'ARCHITECTURE.md',
  WORKFLOW = 'WORKFLOW.md'
}

export interface ChangeDescription {
  type: 'addition' | 'modification' | 'deletion' | 'refactor';
  component: string;
  description: string;
  impactLevel: 'minor' | 'major' | 'breaking';
  documentationRequired: boolean;
}

export interface DocumentationTemplate {
  templateId: string;
  documentType: DocumentType;
  category: DocumentationCategory;
  template: string;
  variables: TemplateVariable[];
  requiredSections: string[];
  optionalSections: string[];
  validationRules: ValidationRule[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'array' | 'object' | 'date' | 'boolean';
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: string; // regex pattern or validation function name
}

export interface ValidationRule {
  rule: string;
  severity: 'warning' | 'error';
  message: string;
  autoFix?: boolean;
}

export interface DocumentationFile {
  filePath: string;
  documentType: DocumentType;
  category: DocumentationCategory;
  lastUpdated: Date;
  lastUpdatedBy: EventSource;
  version: string;
  content: string;
  metadata: DocumentationFileMetadata;
  dependencies: string[]; // Files this doc depends on
  dependents: string[]; // Files that depend on this doc
}

export interface DocumentationFileMetadata {
  projectId: string;
  agentIds: string[];
  taskIds: string[];
  generatedSections: string[];
  manualSections: string[];
  autoUpdateEnabled: boolean;
  lastValidation: Date;
  validationStatus: 'valid' | 'warning' | 'error';
  validationMessages: ValidationMessage[];
}

export interface ValidationMessage {
  severity: 'info' | 'warning' | 'error';
  message: string;
  section?: string;
  line?: number;
  suggestion?: string;
}

export interface DocumentationUpdate {
  updateId: string;
  timestamp: Date;
  documentationFile: string;
  updateType: 'create' | 'update' | 'delete' | 'restructure';
  sections: SectionUpdate[];
  triggeredBy: DocumentationEvent;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  preview?: string;
  conflicts?: ConflictDescription[];
}

export interface SectionUpdate {
  sectionName: string;
  action: 'create' | 'update' | 'delete' | 'move';
  oldContent?: string;
  newContent: string;
  reason: string;
  confidence: number; // 0-1 confidence in the update
}

export interface ConflictDescription {
  type: 'content' | 'structure' | 'version';
  description: string;
  resolution: 'merge' | 'overwrite' | 'manual' | 'skip';
  details: Record<string, any>;
}

export interface DocumentationOrganizationConfig {
  enabled: boolean;
  watchDirectories: string[];
  documentationDirectory: string;
  templateDirectory: string;
  
  // Event configuration
  eventSources: EventSourceConfig[];
  eventFilters: EventFilter[];
  
  // Update configuration
  autoUpdateEnabled: boolean;
  batchUpdates: boolean;
  batchTimeoutMs: number;
  conflictResolution: 'manual' | 'automatic' | 'interactive';
  
  // Validation configuration
  validationEnabled: boolean;
  validationOnUpdate: boolean;
  validationStrict: boolean;
  
  // Backup configuration
  backupEnabled: boolean;
  backupDirectory: string;
  maxBackups: number;
}

export interface EventSourceConfig {
  type: EventSource['type'];
  enabled: boolean;
  config: Record<string, any>;
  priority: number;
}

export interface EventFilter {
  eventType?: DocumentationEventType;
  source?: EventSource['type'];
  priority?: DocumentationEventMetadata['priority'];
  category?: DocumentationCategory;
  condition?: string; // JavaScript expression for complex filtering
}

export interface IDocumentationManager {
  // Core functionality
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Event handling
  registerEventListener(eventType: DocumentationEventType, handler: DocumentationEventHandler): void;
  unregisterEventListener(eventType: DocumentationEventType, handler: DocumentationEventHandler): void;
  processEvent(event: DocumentationEvent): Promise<DocumentationUpdate[]>;
  
  // Documentation management
  createDocumentation(template: DocumentationTemplate, data: Record<string, any>): Promise<DocumentationFile>;
  updateDocumentation(filePath: string, updates: SectionUpdate[]): Promise<DocumentationFile>;
  deleteDocumentation(filePath: string): Promise<void>;
  validateDocumentation(filePath: string): Promise<ValidationMessage[]>;
  
  // Template management
  registerTemplate(template: DocumentationTemplate): void;
  getTemplate(documentType: DocumentType, category: DocumentationCategory): DocumentationTemplate | null;
  listTemplates(): DocumentationTemplate[];
  
  // Organization
  organizeDocumentation(): Promise<void>;
  analyzeDocumentationStructure(): Promise<DocumentationStructureAnalysis>;
  generateMissingDocumentation(): Promise<DocumentationFile[]>;
  
  // Integration
  integrateWithProjectContext(projectContextManager: any): Promise<void>;
  getProjectDocumentation(projectId: string): Promise<DocumentationFile[]>;
  getAgentDocumentation(agentId: string): Promise<DocumentationFile[]>;
  
  // Monitoring and metrics
  getMetrics(): DocumentationMetrics;
  getHealthStatus(): DocumentationHealthStatus;
}

export type DocumentationEventHandler = (event: DocumentationEvent) => Promise<void>;

export interface DocumentationStructureAnalysis {
  totalFiles: number;
  filesByType: Record<DocumentType, number>;
  filesByCategory: Record<DocumentationCategory, number>;
  missingDocuments: MissingDocumentInfo[];
  outdatedDocuments: OutdatedDocumentInfo[];
  inconsistencies: InconsistencyInfo[];
  coverage: DocumentationCoverage;
}

export interface MissingDocumentInfo {
  documentType: DocumentType;
  category: DocumentationCategory;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  suggestedPath: string;  
}

export interface OutdatedDocumentInfo {
  filePath: string;
  lastUpdated: Date;
  suggestedUpdates: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface InconsistencyInfo {
  type: 'naming' | 'structure' | 'content' | 'format';
  description: string;
  affectedFiles: string[];
  suggestion: string;
}

export interface DocumentationCoverage {
  overallCoverage: number; // 0-1
  coverageByCategory: Record<DocumentationCategory, number>;
  coverageByProject: Record<string, number>;
  coverageByAgent: Record<string, number>;
}

export interface DocumentationMetrics {
  totalDocuments: number;
  totalUpdates: number;
  lastUpdate: Date;
  averageUpdateFrequency: number; // updates per day
  validationPassRate: number; // 0-1
  autoUpdateSuccessRate: number; // 0-1
  conflictRate: number; // 0-1
  coverage: DocumentationCoverage;
  performanceMetrics: {
    averageEventProcessingTime: number; // ms
    averageUpdateTime: number; // ms
    averageValidationTime: number; // ms
  };
}

export interface DocumentationHealthStatus {
  status: 'healthy' | 'warning' | 'error';
  issues: HealthIssue[];
  lastCheck: Date;
  uptime: number; // ms
  eventBacklog: number;
  updateBacklog: number;
}

export interface HealthIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
  component: string;
  suggestion?: string;
  autoResolvable: boolean;
}