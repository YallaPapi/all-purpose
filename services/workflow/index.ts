/**
 * UEP Workflow Schema System - Main Entry Point
 * 
 * Export all workflow schema components for external use.
 * Provides comprehensive workflow definition, validation, and versioning capabilities.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 224.1
 */

// Core workflow schema exports
export {
  WorkflowSchemaManager,
  createWorkflowSchemaManager,
  WorkflowDefinitionZodSchema
} from './WorkflowSchema';

// Schema versioning exports
export {
  SchemaRegistry,
  createSchemaRegistry
} from './SchemaVersioning';

// Type exports for workflow definitions
export type {
  WorkflowDefinition,
  WorkflowStep,
  ActionDefinition,
  ErrorStrategy,
  CoordinationConfig,
  MonitoringConfig,
  InputMapping,
  OutputMapping,
  ConditionalExpression,
  RetryPolicy,
  RetryStrategy,
  ValidationRules,
  StepMonitoringConfig,
  AlertThreshold,
  TransformationRule,
  AuthConfig,
  WorkflowContext,
  WorkflowError,
  RecoveryAction,
  WorkflowMetrics,
  ValidationResult,
  MigrationFunction
} from './WorkflowSchema';

// Type exports for versioning
export type {
  SchemaVersion,
  SchemaChange,
  MigrationMetadata,
  ValidationRule,
  RollbackStrategy,
  CompatibilityResult,
  CompatibilityIssue
} from './SchemaVersioning';

// Enum and constant exports
export { ActionType, WorkflowStatus, StepStatus } from './WorkflowSchema';

// Version information
export const VERSION = '1.0.0';
export const SCHEMA_VERSION = '1.0.0';

// Default configurations
export const DEFAULT_WORKFLOW_CONFIG = {
  timeout: 300000, // 5 minutes
  retryPolicy: {
    maxAttempts: 3,
    backoffStrategy: 'exponential' as const,
    initialDelay: 1000
  },
  coordination: {
    mode: 'sequential' as const,
    communicationTimeout: 30000,
    heartbeatInterval: 5000,
    failureThreshold: 3
  },
  monitoring: {
    enableAuditTrail: true,
    enableMetrics: true,
    enableRealTimeUpdates: true,
    auditLevel: 'detailed' as const
  }
};

export const DEFAULT_REGISTRY_CONFIG = {
  maxVersionHistory: 50,
  deprecationWarningPeriod: 90,
  supportEndWarningPeriod: 30,
  autoCleanupEnabled: true,
  migrationValidationRequired: true,
  backupBeforeMigration: true
};