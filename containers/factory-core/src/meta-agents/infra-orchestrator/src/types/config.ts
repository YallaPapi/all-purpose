/**
 * IOA Configuration Types
 * 
 * Use context7: Configuration interfaces for All-Purpose Pattern compliance
 * Following All-Purpose Pattern: Configurable for ANY project structure
 */

export type IOAMode = 'orchestrate' | 'audit' | 'compliance' | 'status' | 'pipeline';

export interface IOAConfig {
  projectRoot: string;
  mode: IOAMode;
  configPath?: string;
  enableRAGIntegration: boolean;
  enableMetaAgentCoordination: boolean;
  enableAutoComplianceEnforcement: boolean;
  
  // Orchestration settings
  orchestration?: {
    taskMasterPath?: string;
    context7Path?: string;
    ragSystemPath?: string;
    enableAutoDocs?: boolean;
    enableAutoTasks?: boolean;
  };

  // Compliance settings
  compliance?: {
    allPurposePatternEnforcement: boolean;
    environmentValidation: boolean;
    parameterMappingValidation: boolean;
    debugEndpointValidation: boolean;
    hardcodeDetection: boolean;
    ragUsageValidation: boolean;
  };

  // CI/CD settings
  cicd?: {
    enableGitHubActions: boolean;
    enableAutoPR: boolean;
    enableAutoCommit: boolean;
    branchProtection: boolean;
  };

  // Documentation settings
  documentation?: {
    enableMermaidDiagrams: boolean;
    autoUpdateOnMerge: boolean;
    statusReportFrequency: 'hourly' | 'daily' | 'weekly';
    knowledgeGraphUpdates: boolean;
  };

  // Meta-agent oversight
  metaAgentOversight?: {
    qualityGates: boolean;
    performanceMonitoring: boolean;
    knowledgeValidation: boolean;
    coordinationHealthChecks: boolean;
  };
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  patterns?: string[];
  exclusions?: string[];
  metadata?: Record<string, any>;
}

export interface ComplianceResult {
  ruleId: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  filePath?: string;
  lineNumber?: number;
  suggestion?: string;
  metadata?: Record<string, any>;
}

export interface OrchestrationResult {
  success: boolean;
  timestamp: Date;
  duration: number;
  tasksCompleted: number;
  complianceResults: ComplianceResult[];
  documentationUpdated: boolean;
  ragKnowledgeUpdated: boolean;
  metaAgentsCoordinated: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface AuditReport {
  timestamp: Date;
  projectHealth: 'excellent' | 'good' | 'fair' | 'poor';
  complianceScore: number; // 0-100
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warnings: number;
  ragSystemHealth: 'healthy' | 'degraded' | 'failing';
  metaAgentCoordinationHealth: 'healthy' | 'degraded' | 'failing';
  recommendations: string[];
  criticalIssues: ComplianceResult[];
  detailedResults: ComplianceResult[];
}

export interface StatusReport {
  timestamp: Date;
  version: string;
  projectStatus: 'active' | 'maintenance' | 'archived';
  metaAgentFactory: {
    totalAgents: number;
    completedAgents: number;
    activeAgents: number;
    lastDeployment?: Date;
  };
  ragSystem: {
    status: 'operational' | 'degraded' | 'down';
    lastUpdate: Date;
    knowledgeItems: number;
    contextAccuracy: number;
  };
  infrastructure: {
    cicdStatus: 'passing' | 'failing' | 'unstable';
    lastBuild: Date;
    deploymentHealth: 'healthy' | 'degraded' | 'failing';
  };
  compliance: {
    overallScore: number;
    lastAudit: Date;
    criticalIssues: number;
    warnings: number;
  };
}