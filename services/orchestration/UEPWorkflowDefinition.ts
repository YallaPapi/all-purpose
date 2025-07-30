/**
 * UEP Workflow Definition Format
 * 
 * Comprehensive workflow definition format for UEP multi-agent orchestration.
 * Supports declarative workflow definition with agent coordination patterns,
 * state management, error handling, and compensation mechanisms. Designed
 * for complex distributed workflows with full UEP protocol compliance.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { JSONSchema7 } from 'json-schema';

// =============================================================================
// Core Workflow Definition Types (Context7 Methodology)
// =============================================================================

export interface UEPWorkflowDefinition {
  metadata: UEPWorkflowMetadata;
  specification: UEPWorkflowSpecification;
  agents: UEPWorkflowAgentDefinition[];
  steps: UEPWorkflowStep[];
  flows: UEPWorkflowFlow[];
  errorHandling: UEPWorkflowErrorHandling;
  compensation: UEPWorkflowCompensation;
  monitoring: UEPWorkflowMonitoring;
  security: UEPWorkflowSecurity;
  validation?: UEPWorkflowValidation;
}

export interface UEPWorkflowMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  created: string; // ISO 8601 timestamp
  modified: string; // ISO 8601 timestamp
  tags: string[];
  category: 'data-processing' | 'communication' | 'monitoring' | 'coordination' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeout: number; // Total workflow timeout in milliseconds
  retryPolicy: UEPRetryPolicy;
  deprecationWarning?: string;
  documentationUrl?: string;
}

export interface UEPWorkflowSpecification {
  format: '1.0'; // Workflow definition format version
  runtime: 'temporal' | 'conductor' | 'native' | 'custom';
  executionMode: 'sequential' | 'parallel' | 'conditional' | 'event-driven';
  stateManagement: 'stateless' | 'event-sourced' | 'persistent' | 'distributed';
  durability: 'none' | 'at-least-once' | 'exactly-once' | 'idempotent';
  consistency: 'eventual' | 'strong' | 'session' | 'bounded-staleness';
  isolation: 'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable';
  resourceRequirements: UEPResourceRequirements;
  scalingPolicy: UEPScalingPolicy;
}

export interface UEPWorkflowAgentDefinition {
  id: string;
  type: string;
  version?: string;
  role: 'initiator' | 'participant' | 'coordinator' | 'observer' | 'compensator';
  requirements: {
    capabilities: string[];
    resources?: UEPResourceRequirements;
    placement?: UEPPlacementConstraints;
    sla?: UEPServiceLevelAgreement;
  };
  configuration: Record<string, any>;
  healthCheck?: UEPAgentHealthCheck;
  lifecycle: UEPAgentLifecycle;
}

export interface UEPWorkflowStep {
  id: string;
  name: string;
  type: 'agent-task' | 'decision' | 'parallel' | 'loop' | 'sub-workflow' | 'wait' | 'notification';
  agentId: string;
  action: string;
  input: UEPStepInput;
  output: UEPStepOutput;
  conditions: UEPStepConditions;
  timeout: number;
  retryPolicy: UEPRetryPolicy;
  compensation?: UEPStepCompensation;
  monitoring: UEPStepMonitoring;
  dependencies: string[]; // IDs of prerequisite steps
  optional: boolean;
  parallel: boolean;
}

export interface UEPWorkflowFlow {
  id: string;
  name: string;
  type: 'sequential' | 'parallel' | 'conditional' | 'loop' | 'saga' | 'choreography';
  steps: string[]; // Step IDs in execution order
  conditions?: UEPFlowConditions;
  loopConfiguration?: UEPLoopConfiguration;
  sagaConfiguration?: UEPSagaConfiguration;
  choreographyConfiguration?: UEPChoreographyConfiguration;
  errorBehavior: 'fail-fast' | 'continue' | 'compensate' | 'retry' | 'skip';
  monitoring: UEPFlowMonitoring;
}

// =============================================================================
// Configuration and Policy Types
// =============================================================================

export interface UEPRetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[]; // Error types/codes that should trigger retry
  nonRetryableErrors: string[]; // Error types/codes that should not retry
  jitterEnabled: boolean;
}

export interface UEPResourceRequirements {
  cpu: number; // CPU cores
  memory: number; // MB
  storage: number; // MB
  network: number; // Mbps
  gpu?: number; // GPU units
  customResources?: Record<string, number>;
}

export interface UEPScalingPolicy {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetCpuUtilization: number; // Percentage
  targetMemoryUtilization: number; // Percentage
  scaleUpCooldown: number; // seconds
  scaleDownCooldown: number; // seconds
  metrics: UEPScalingMetrics[];
}

export interface UEPPlacementConstraints {
  region?: string;
  zone?: string;
  nodeSelector?: Record<string, string>;
  affinity?: UEPAffinityRules;
  antiAffinity?: UEPAffinityRules;
  tolerations?: UEPToleration[];
}

export interface UEPServiceLevelAgreement {
  availability: number; // Percentage (e.g., 99.9)
  responseTime: number; // milliseconds
  throughput: number; // requests per second
  errorRate: number; // Percentage
  mttr: number; // Mean Time To Recovery in minutes
  penalties?: UEPSLAPenalty[];
}

// =============================================================================
// Step and Flow Configuration Types
// =============================================================================

export interface UEPStepInput {
  parameters: Record<string, UEPParameter>;
  dataMapping: UEPDataMapping[];
  validation: UEPInputValidation;
  transformation?: UEPDataTransformation;
  encryption?: UEPEncryptionConfig;
}

export interface UEPStepOutput {
  resultMapping: UEPDataMapping[];
  validation: UEPOutputValidation;
  transformation?: UEPDataTransformation;
  storage?: UEPOutputStorage;
  notification?: UEPOutputNotification;
}

export interface UEPStepConditions {
  preconditions: UEPCondition[];
  postconditions: UEPCondition[];
  skipConditions: UEPCondition[];
  terminationConditions: UEPCondition[];
}

export interface UEPStepCompensation {
  enabled: boolean;
  action: string;
  parameters: Record<string, any>;
  timeout: number;
  order: number; // Compensation execution order (higher numbers execute first)
  idempotent: boolean;
}

export interface UEPStepMonitoring {
  metricsCollection: boolean;
  tracingEnabled: boolean;
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  alerting: UEPAlertingConfig;
  dashboard?: UEPDashboardConfig;
}

export interface UEPFlowConditions {
  startCondition?: UEPCondition;
  continueCondition?: UEPCondition;
  terminationCondition?: UEPCondition;
  branchingLogic?: UEPBranchingLogic[];
}

export interface UEPLoopConfiguration {
  type: 'for' | 'while' | 'until' | 'foreach';
  maxIterations: number;
  condition: UEPCondition;
  iterationData?: UEPIterationData;
  parallelExecution: boolean;
  batchSize?: number;
}

export interface UEPSagaConfiguration {
  pattern: 'orchestrator' | 'choreography';
  compensationOrder: 'reverse' | 'custom';
  isolationLevel: 'read-committed' | 'snapshot';
  timeout: number;
  compensationTimeout: number;
}

export interface UEPChoreographyConfiguration {
  eventBus: string;
  eventTypes: string[];
  correlationId: string;
  choreographyTimeout: number;
  deadLetterHandling: UEPDeadLetterConfig;
}

// =============================================================================
// Error Handling and Compensation Types
// =============================================================================

export interface UEPWorkflowErrorHandling {
  globalErrorBehavior: 'fail-fast' | 'continue' | 'compensate' | 'retry' | 'escalate';
  errorClassification: UEPErrorClassification[];
  escalationPolicy: UEPEscalationPolicy;
  deadLetterHandling: UEPDeadLetterConfig;
  errorNotification: UEPErrorNotification;
  forensics: UEPForensicsConfig;
}

export interface UEPWorkflowCompensation {
  enabled: boolean;
  strategy: 'automatic' | 'manual' | 'hybrid';
  timeout: number;
  maxAttempts: number;
  partialCompensation: boolean;
  compensationOrder: 'reverse' | 'priority' | 'custom';
  stateRecovery: UEPStateRecoveryConfig;
  auditTrail: boolean;
}

export interface UEPWorkflowMonitoring {
  enabled: boolean;
  realTimeMetrics: boolean;
  historicalData: boolean;
  alerting: UEPAlertingConfig;
  dashboard: UEPDashboardConfig;
  performance: UEPPerformanceMonitoring;
  security: UEPSecurityMonitoring;
  compliance: UEPComplianceMonitoring;
}

export interface UEPWorkflowSecurity {
  authentication: UEPAuthenticationConfig;
  authorization: UEPAuthorizationConfig;
  encryption: UEPEncryptionConfig;
  auditLog: UEPAuditLogConfig;
  dataPrivacy: UEPDataPrivacyConfig;
  networkSecurity: UEPNetworkSecurityConfig;
}

// =============================================================================
// Supporting Configuration Types
// =============================================================================

export interface UEPParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'binary';
  required: boolean;
  default?: any;
  validation?: UEPParameterValidation;
  sensitive: boolean; // Whether parameter contains sensitive data
  source?: 'input' | 'environment' | 'secret' | 'computed';
}

export interface UEPDataMapping {
  source: string; // JSONPath expression
  target: string; // JSONPath expression
  transformation?: string; // Transformation function name
  validation?: UEPMappingValidation;
  encryption?: boolean;
}

export interface UEPCondition {
  type: 'expression' | 'script' | 'external-check' | 'data-validation';
  expression: string;
  language?: 'jsonpath' | 'javascript' | 'python' | 'custom';
  timeout?: number;
  errorBehavior: 'fail' | 'continue' | 'default-true' | 'default-false';
}

export interface UEPAgentHealthCheck {
  enabled: boolean;
  endpoint: string;
  interval: number; // seconds
  timeout: number; // milliseconds
  retries: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface UEPAgentLifecycle {
  initialization: UEPLifecyclePhase;
  execution: UEPLifecyclePhase;
  termination: UEPLifecyclePhase;
  cleanup: UEPLifecyclePhase;
}

export interface UEPLifecyclePhase {
  hooks: UEPLifecycleHook[];
  timeout: number;
  retryPolicy: UEPRetryPolicy;
  rollbackEnabled: boolean;
}

export interface UEPLifecycleHook {
  name: string;
  type: 'pre' | 'post' | 'on-success' | 'on-failure';
  action: string;
  parameters: Record<string, any>;
  timeout: number;
  critical: boolean; // Whether hook failure should fail the phase
}

// =============================================================================
// Validation and Schema Types
// =============================================================================

export interface UEPWorkflowValidation {
  enabled: boolean;
  strictMode: boolean;
  schema: JSONSchema7;
  customValidators: UEPCustomValidator[];
  validationRules: UEPValidationRule[];
  errorHandling: UEPValidationErrorHandling;
}

export interface UEPCustomValidator {
  name: string;
  type: 'function' | 'script' | 'external-service';
  implementation: string;
  parameters: Record<string, any>;
  timeout: number;
  cacheable: boolean;
}

export interface UEPValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'structural' | 'semantic' | 'business' | 'security' | 'performance';
  severity: 'error' | 'warning' | 'info';
  condition: UEPCondition;
  message: string;
  remediation?: string;
}

export interface UEPValidationErrorHandling {
  onError: 'fail' | 'warn' | 'continue' | 'fix';
  autoFix: boolean;
  reporting: UEPValidationReporting;
}

export interface UEPValidationReporting {
  enabled: boolean;
  destination: 'log' | 'metrics' | 'external' | 'all';
  format: 'json' | 'structured' | 'plain';
  includeSuggestions: boolean;
}

// =============================================================================
// Complex Configuration Types
// =============================================================================

export interface UEPScalingMetrics {
  name: string;
  type: 'cpu' | 'memory' | 'custom';
  target: number;
  aggregation: 'average' | 'max' | 'min' | 'sum';
  window: number; // seconds
}

export interface UEPAffinityRules {
  nodeAffinity?: UEPNodeAffinity;
  podAffinity?: UEPPodAffinity;
  podAntiAffinity?: UEPPodAffinity;
}

export interface UEPNodeAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: UEPNodeSelector;
  preferredDuringSchedulingIgnoredDuringExecution?: UEPPreferredSchedulingTerm[];
}

export interface UEPPodAffinity {
  requiredDuringSchedulingIgnoredDuringExecution?: UEPPodAffinityTerm[];
  preferredDuringSchedulingIgnoredDuringExecution?: UEPWeightedPodAffinityTerm[];
}

export interface UEPToleration {
  key: string;
  operator: 'Equal' | 'Exists';
  value?: string;
  effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  tolerationSeconds?: number;
}

export interface UEPSLAPenalty {
  condition: UEPCondition;
  penalty: 'warning' | 'financial' | 'termination';
  amount?: number;
  currency?: string;
  description: string;
}

export interface UEPInputValidation {
  enabled: boolean;
  schema?: JSONSchema7;
  customRules: UEPValidationRule[];
  sanitization: UEPDataSanitization;
}

export interface UEPOutputValidation {
  enabled: boolean;
  schema?: JSONSchema7;
  qualityChecks: UEPQualityCheck[];
  confidenceThreshold: number;
}

export interface UEPDataTransformation {
  type: 'map' | 'filter' | 'reduce' | 'custom';
  function: string;
  parameters: Record<string, any>;
  async: boolean;
  caching: boolean;
}

export interface UEPEncryptionConfig {
  enabled: boolean;
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'RSA-OAEP';
  keyManagement: 'envelope' | 'direct' | 'kms';
  keyRotation: boolean;
  keyRotationInterval: number; // days
}

export interface UEPOutputStorage {
  enabled: boolean;
  type: 'database' | 'file' | 'cache' | 'message-queue';
  configuration: Record<string, any>;
  retention: UEPRetentionPolicy;
  encryption: boolean;
}

export interface UEPOutputNotification {
  enabled: boolean;
  channels: UEPNotificationChannel[];
  conditions: UEPCondition[];
  templates: Record<string, string>;
}

export interface UEPBranchingLogic {
  condition: UEPCondition;
  target: string; // Flow or step ID
  weight?: number; // For weighted routing
}

export interface UEPIterationData {
  source: string; // Data source for iteration
  itemVariable: string; // Variable name for current item
  indexVariable?: string; // Variable name for current index
  batchVariable?: string; // Variable name for current batch
}

export interface UEPErrorClassification {
  category: 'system' | 'business' | 'network' | 'security' | 'data' | 'timeout';
  patterns: string[]; // Error message patterns or codes
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  escalate: boolean;
  compensation: boolean;
}

export interface UEPEscalationPolicy {
  enabled: boolean;
  levels: UEPEscalationLevel[];
  timeout: number; // Time before escalating to next level
  notifications: UEPNotificationChannel[];
}

export interface UEPEscalationLevel {
  level: number;
  contacts: string[];
  actions: string[];
  timeout: number;
  autoResolve: boolean;
}

// =============================================================================
// Monitoring and Observability Types
// =============================================================================

export interface UEPAlertingConfig {
  enabled: boolean;
  rules: UEPAlertRule[];
  channels: UEPNotificationChannel[];
  grouping: UEPAlertGrouping;
  suppression: UEPAlertSuppression;
}

export interface UEPDashboardConfig {
  enabled: boolean;
  template: string;
  customPanels: UEPDashboardPanel[];
  refreshInterval: number; // seconds
  sharing: UEPDashboardSharing;
}

export interface UEPPerformanceMonitoring {
  enabled: boolean;
  metrics: string[]; // Metric names to collect
  sampling: UEPSamplingConfig;
  thresholds: UEPPerformanceThreshold[];
  profiling: UEPProfilingConfig;
}

export interface UEPSecurityMonitoring {
  enabled: boolean;
  threatDetection: boolean;
  anomalyDetection: boolean;
  complianceChecks: string[];
  incidentResponse: UEPIncidentResponseConfig;
}

export interface UEPComplianceMonitoring {
  enabled: boolean;
  frameworks: string[]; // e.g., SOX, GDPR, HIPAA
  auditRequirements: UEPAuditRequirement[];
  reporting: UEPComplianceReporting;
}

// =============================================================================
// Security Configuration Types
// =============================================================================

export interface UEPAuthenticationConfig {
  required: boolean;
  methods: ('oauth2' | 'jwt' | 'api-key' | 'mutual-tls' | 'saml')[];
  tokenValidation: UEPTokenValidation;
  sessionManagement: UEPSessionManagement;
}

export interface UEPAuthorizationConfig {
  enabled: boolean;
  model: 'rbac' | 'abac' | 'custom';
  policies: UEPAuthorizationPolicy[];
  enforcement: 'strict' | 'permissive';
}

export interface UEPAuditLogConfig {
  enabled: boolean;
  events: string[]; // Event types to audit
  retention: UEPRetentionPolicy;
  encryption: boolean;
  integrity: UEPIntegrityConfig;
}

export interface UEPDataPrivacyConfig {
  enabled: boolean;
  classification: UEPDataClassification[];
  anonymization: UEPAnonymizationConfig;
  rightToErasure: boolean;
  consentManagement: UEPConsentManagement;
}

export interface UEPNetworkSecurityConfig {
  tlsEnabled: boolean;
  tlsVersion: '1.2' | '1.3';
  certificateValidation: boolean;
  allowlistEnabled: boolean;
  allowedHosts: string[];
  firewallRules: UEPFirewallRule[];
}

// =============================================================================
// Additional Supporting Types
// =============================================================================

export interface UEPDeadLetterConfig {
  enabled: boolean;
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  destination: string;
  analysis: boolean;
}

export interface UEPErrorNotification {
  enabled: boolean;
  channels: UEPNotificationChannel[];
  severity: ('low' | 'medium' | 'high' | 'critical')[];
  throttling: UEPNotificationThrottling;
}

export interface UEPForensicsConfig {
  enabled: boolean;
  dataCapture: boolean;
  snapshotFrequency: number; // seconds
  retention: UEPRetentionPolicy;
  analysis: UEPForensicsAnalysis;
}

export interface UEPStateRecoveryConfig {
  enabled: boolean;
  checkpointFrequency: number; // seconds
  recoveryStrategies: UEPRecoveryStrategy[];
  dataConsistency: UEPConsistencyConfig;
}

export interface UEPNotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  configuration: Record<string, any>;
  filters: UEPNotificationFilter[];
}

export interface UEPRetentionPolicy {
  duration: number; // days
  archiving: boolean;
  compression: boolean;
  deletion: UEPDeletionPolicy;
}

// Remaining interface definitions would continue...
// This is a comprehensive type system for UEP workflow definitions

// =============================================================================
// JSON Schema for Workflow Definition Validation
// =============================================================================

export const UEP_WORKFLOW_SCHEMA: JSONSchema7 = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'UEP Workflow Definition Schema',
  description: 'Schema for validating UEP workflow definitions',
  required: ['metadata', 'specification', 'agents', 'steps', 'flows', 'errorHandling'],
  properties: {
    metadata: {
      type: 'object',
      required: ['id', 'name', 'version', 'description', 'author', 'created', 'timeout'],
      properties: {
        id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
        description: { type: 'string', minLength: 1, maxLength: 500 },
        author: { type: 'string', minLength: 1 },
        created: { type: 'string', format: 'date-time' },
        modified: { type: 'string', format: 'date-time' },
        tags: { type: 'array', items: { type: 'string' } },
        category: { 
          type: 'string', 
          enum: ['data-processing', 'communication', 'monitoring', 'coordination', 'custom'] 
        },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        timeout: { type: 'number', minimum: 1000 }
      }
    },
    specification: {
      type: 'object',
      required: ['format', 'runtime', 'executionMode', 'stateManagement'],
      properties: {
        format: { type: 'string', const: '1.0' },
        runtime: { type: 'string', enum: ['temporal', 'conductor', 'native', 'custom'] },
        executionMode: { 
          type: 'string', 
          enum: ['sequential', 'parallel', 'conditional', 'event-driven'] 
        },
        stateManagement: { 
          type: 'string', 
          enum: ['stateless', 'event-sourced', 'persistent', 'distributed'] 
        }
      }
    },
    agents: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'type', 'role', 'requirements'],
        properties: {
          id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
          type: { type: 'string', minLength: 1 },
          role: { 
            type: 'string', 
            enum: ['initiator', 'participant', 'coordinator', 'observer', 'compensator'] 
          },
          requirements: {
            type: 'object',
            required: ['capabilities'],
            properties: {
              capabilities: {
                type: 'array',
                minItems: 1,
                items: { type: 'string' }
              }
            }
          }
        }
      }
    },
    steps: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'name', 'type', 'agentId', 'action', 'timeout'],
        properties: {
          id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
          name: { type: 'string', minLength: 1 },
          type: { 
            type: 'string', 
            enum: ['agent-task', 'decision', 'parallel', 'loop', 'sub-workflow', 'wait', 'notification'] 
          },
          agentId: { type: 'string' },
          action: { type: 'string', minLength: 1 },
          timeout: { type: 'number', minimum: 1000 }
        }
      }
    },
    flows: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'type', 'steps'],
        properties: {
          id: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
          name: { type: 'string', minLength: 1 },
          type: { 
            type: 'string', 
            enum: ['sequential', 'parallel', 'conditional', 'loop', 'saga', 'choreography'] 
          },
          steps: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' }
          }
        }
      }
    }
  }
};

// =============================================================================
// Workflow Definition Templates and Examples
// =============================================================================

export const UEP_WORKFLOW_TEMPLATES = {
  
  SIMPLE_SEQUENTIAL: {
    metadata: {
      id: 'simple-sequential-template',
      name: 'Simple Sequential Workflow Template',
      version: '1.0.0',
      description: 'Basic template for sequential agent coordination',
      author: 'UEP Meta-Agent Factory',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: ['template', 'sequential', 'basic'],
      category: 'coordination' as const,
      priority: 'medium' as const,
      timeout: 300000 // 5 minutes
    }
  },

  PARALLEL_PROCESSING: {
    metadata: {
      id: 'parallel-processing-template',
      name: 'Parallel Processing Workflow Template',
      version: '1.0.0',
      description: 'Template for parallel agent task execution',
      author: 'UEP Meta-Agent Factory',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: ['template', 'parallel', 'performance'],
      category: 'data-processing' as const,
      priority: 'high' as const,
      timeout: 600000 // 10 minutes
    }
  },

  SAGA_COMPENSATION: {
    metadata: {
      id: 'saga-compensation-template',
      name: 'Saga Pattern with Compensation Template',
      version: '1.0.0',
      description: 'Template for distributed transactions with compensation',
      author: 'UEP Meta-Agent Factory',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      tags: ['template', 'saga', 'compensation', 'distributed'],
      category: 'coordination' as const,
      priority: 'high' as const,
      timeout: 900000 // 15 minutes
    }
  }

};

export default {
  UEP_WORKFLOW_SCHEMA,
  UEP_WORKFLOW_TEMPLATES
};