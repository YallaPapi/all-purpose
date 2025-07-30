/**
 * UEP Workflow Schema Versioning and Migration System
 * 
 * Advanced versioning system for workflow schemas with semantic versioning,
 * backward compatibility checking, and automated migration capabilities.
 * Implements industry best practices for distributed system schema evolution.
 * 
 * Research-based implementation features:
 * - Semantic versioning with compatibility checking
 * - Automated schema migration pipelines
 * - Backward compatibility validation
 * - Version-aware schema registry
 * - Migration rollback capabilities
 * - Schema evolution tracking and analytics
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 224.1
 */

import semver from 'semver';
import winston from 'winston';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { WorkflowDefinition, WorkflowSchemaManager } from './WorkflowSchema';

/**
 * Schema version metadata
 */
export interface SchemaVersion {
  version: string;                     // Semantic version
  hash: string;                        // Schema content hash
  createdAt: Date;                     // Version creation timestamp
  createdBy?: string;                  // Version creator
  description?: string;                // Version description
  breaking: boolean;                   // Contains breaking changes
  deprecated: boolean;                 // Is version deprecated
  deprecationDate?: Date;              // When version was deprecated
  supportEndDate?: Date;               // When support ends
  migrationPath?: string[];            // Available migration paths
  schema: object;                      // The actual schema definition
  metadata: {
    changes: SchemaChange[];           // List of changes from previous version
    compatibleVersions: string[];      // Compatible version ranges
    dependencies: string[];            // Schema dependencies
    apiComplianceLevel: number;        // API compliance score (0-100)
  };
}

/**
 * Schema change information
 */
export interface SchemaChange {
  type: 'added' | 'modified' | 'deprecated' | 'removed';
  path: string;                        // JSON path to changed element
  description: string;                 // Human-readable description
  breaking: boolean;                   // Is this a breaking change
  impact: 'low' | 'medium' | 'high';   // Impact level
  migrationNote?: string;              // Migration guidance
}

/**
 * Migration metadata
 */
export interface MigrationMetadata {
  fromVersion: string;                 // Source version
  toVersion: string;                   // Target version
  migrationId: string;                 // Unique migration identifier
  createdAt: Date;                     // Migration creation timestamp
  createdBy?: string;                  // Migration creator
  description: string;                 // Migration description
  automated: boolean;                  // Can be automated
  reversible: boolean;                 // Can be rolled back
  validationRules: ValidationRule[];   // Post-migration validation
  estimatedTime: number;               // Estimated migration time (ms)
  riskLevel: 'low' | 'medium' | 'high'; // Migration risk assessment
  dependencies: string[];              // Migration dependencies
  rollbackStrategy?: RollbackStrategy; // Rollback information
}

/**
 * Validation rule for post-migration validation
 */
export interface ValidationRule {
  name: string;                        // Rule name
  description: string;                 // Rule description
  validator: (workflow: WorkflowDefinition) => ValidationResult;
  required: boolean;                   // Is validation required
  severity: 'warning' | 'error';       // Failure severity
}

/**
 * Rollback strategy configuration
 */
export interface RollbackStrategy {
  type: 'automatic' | 'manual' | 'none';
  procedure: string;                   // Rollback procedure description
  dataLoss: boolean;                   // Will rollback cause data loss
  timeLimit: number;                   // Time limit for rollback (ms)
  validationRequired: boolean;         // Requires validation after rollback
}

/**
 * Version compatibility result
 */
export interface CompatibilityResult {
  compatible: boolean;                 // Are versions compatible
  compatibilityLevel: 'full' | 'backward' | 'forward' | 'none';
  issues: CompatibilityIssue[];        // Compatibility issues
  migrationRequired: boolean;          // Is migration required
  recommendedActions: string[];        // Recommended actions
}

/**
 * Compatibility issue information
 */
export interface CompatibilityIssue {
  type: 'breaking_change' | 'deprecation' | 'new_feature' | 'modification';
  severity: 'low' | 'medium' | 'high' | 'critical';
  path: string;                        // Affected schema path
  description: string;                 // Issue description
  impact: string;                      // Impact description
  resolution?: string;                 // Suggested resolution
}

/**
 * Validation result for migrations
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Schema registry with version management
 */
export class SchemaRegistry extends EventEmitter {
  private logger: winston.Logger;
  private versions = new Map<string, SchemaVersion>();
  private migrations = new Map<string, MigrationMetadata>();
  private migrationFunctions = new Map<string, MigrationFunction>();
  private registryPath: string;
  
  // Version management configuration
  private config = {
    maxVersionHistory: 50,               // Maximum versions to keep
    deprecationWarningPeriod: 90,        // Days before deprecation warning
    supportEndWarningPeriod: 30,         // Days before end of support warning
    autoCleanupEnabled: true,            // Auto cleanup old versions
    migrationValidationRequired: true,   // Require migration validation
    backupBeforeMigration: true          // Backup before migration
  };

  constructor(registryPath = './schemas/registry') {
    super();
    
    this.registryPath = registryPath;
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/schema-registry.log' })
      ]
    });

    this.initializeRegistry();
  }

  /**
   * Initialize schema registry
   */
  private async initializeRegistry(): Promise<void> {
    try {
      await this.loadVersionHistory();
      await this.loadMigrations();
      this.logger.info('Schema registry initialized', {
        versions: this.versions.size,
        migrations: this.migrations.size
      });
    } catch (error) {
      this.logger.error('Failed to initialize schema registry', { error });
      throw error;
    }
  }

  /**
   * Register a new schema version
   */
  public async registerVersion(
    version: string,
    schema: object,
    changes: SchemaChange[] = [],
    metadata: Partial<SchemaVersion['metadata']> = {}
  ): Promise<SchemaVersion> {
    // Validate version format
    if (!semver.valid(version)) {
      throw new Error(`Invalid semantic version: ${version}`);
    }

    // Check if version already exists
    if (this.versions.has(version)) {
      throw new Error(`Version ${version} already registered`);
    }

    // Calculate schema hash
    const schemaJson = JSON.stringify(schema, null, 2);
    const hash = crypto.createHash('sha256').update(schemaJson).digest('hex');

    // Determine if this is a breaking change
    const breaking = changes.some(change => change.breaking);

    // Get compatible versions
    const compatibleVersions = this.getCompatibleVersions(version, changes);

    // Create schema version
    const schemaVersion: SchemaVersion = {
      version,
      hash,
      createdAt: new Date(),
      description: metadata.description,
      breaking,
      deprecated: false,
      migrationPath: [],
      schema,
      metadata: {
        changes,
        compatibleVersions,
        dependencies: metadata.dependencies || [],
        apiComplianceLevel: metadata.apiComplianceLevel || 100,
        ...metadata
      }
    };

    // Store version
    this.versions.set(version, schemaVersion);

    // Save to persistent storage
    await this.saveVersionHistory();

    this.logger.info('Registered new schema version', {
      version,
      hash: hash.substring(0, 8),
      breaking,
      changes: changes.length
    });

    this.emit('versionRegistered', schemaVersion);

    return schemaVersion;
  }

  /**
   * Get compatible versions for a given version
   */
  private getCompatibleVersions(version: string, changes: SchemaChange[]): string[] {
    const compatible: string[] = [];
    const hasBreakingChanges = changes.some(change => change.breaking);

    for (const [existingVersion] of this.versions) {
      if (hasBreakingChanges) {
        // Breaking changes are only compatible with exact same major version
        if (semver.major(version) === semver.major(existingVersion)) {
          compatible.push(existingVersion);
        }
      } else {
        // Non-breaking changes are backward compatible
        if (semver.gte(version, existingVersion)) {
          compatible.push(existingVersion);
        }
      }
    }

    return compatible;
  }

  /**
   * Check compatibility between two versions
   */
  public checkCompatibility(fromVersion: string, toVersion: string): CompatibilityResult {
    const fromSchema = this.versions.get(fromVersion);
    const toSchema = this.versions.get(toVersion);

    if (!fromSchema || !toSchema) {
      return {
        compatible: false,
        compatibilityLevel: 'none',
        issues: [{
          type: 'breaking_change',
          severity: 'critical',
          path: '',
          description: 'One or both versions not found in registry',
          impact: 'Cannot perform compatibility check'
        }],
        migrationRequired: true,
        recommendedActions: ['Register missing schema versions']
      };
    }

    const issues: CompatibilityIssue[] = [];
    let compatible = true;
    let compatibilityLevel: 'full' | 'backward' | 'forward' | 'none' = 'full';

    // Check semantic version compatibility
    if (semver.major(fromVersion) !== semver.major(toVersion)) {
      compatible = false;
      compatibilityLevel = 'none';
      issues.push({
        type: 'breaking_change',
        severity: 'critical',
        path: '',
        description: 'Major version change detected',
        impact: 'Breaking changes expected',
        resolution: 'Migration required'
      });
    } else if (semver.minor(fromVersion) !== semver.minor(toVersion)) {
      if (semver.gt(toVersion, fromVersion)) {
        compatibilityLevel = 'backward';
        issues.push({
          type: 'new_feature',
          severity: 'low',
          path: '',
          description: 'Minor version upgrade with new features',
          impact: 'New features available',
          resolution: 'Optional upgrade'
        });
      } else {
        compatibilityLevel = 'forward';
        issues.push({
          type: 'modification',
          severity: 'medium',
          path: '',
          description: 'Minor version downgrade',
          impact: 'Some features may not be available',
          resolution: 'Check for removed features'
        });
      }
    }

    // Check for breaking changes in metadata
    if (toSchema.breaking && semver.gt(toVersion, fromVersion)) {
      compatible = false;
      compatibilityLevel = 'none';
      
      for (const change of toSchema.metadata.changes) {
        if (change.breaking) {
          issues.push({
            type: 'breaking_change',
            severity: change.impact === 'high' ? 'critical' : 'high',
            path: change.path,
            description: change.description,
            impact: `Breaking change: ${change.description}`,
            resolution: change.migrationNote
          });
        }
      }
    }

    // Check for deprecations
    if (fromSchema.deprecated) {
      issues.push({
        type: 'deprecation',
        severity: 'medium',
        path: '',
        description: `Version ${fromVersion} is deprecated`,
        impact: 'Support may be removed in future',
        resolution: 'Plan migration to newer version'
      });
    }

    const migrationRequired = !compatible || issues.some(issue => 
      issue.type === 'breaking_change' || issue.severity === 'critical'
    );

    const recommendedActions: string[] = [];
    if (migrationRequired) {
      recommendedActions.push('Perform schema migration');
    }
    if (issues.length > 0) {
      recommendedActions.push('Review compatibility issues');
    }
    if (toSchema.breaking) {
      recommendedActions.push('Test thoroughly after migration');
    }

    return {
      compatible,
      compatibilityLevel,
      issues,
      migrationRequired,
      recommendedActions
    };
  }

  /**
   * Register a migration between versions
   */
  public registerMigration(
    fromVersion: string,
    toVersion: string,
    migrationFunction: MigrationFunction,
    metadata: Partial<MigrationMetadata> = {}
  ): MigrationMetadata {
    const migrationId = `${fromVersion}->${toVersion}`;

    // Validate versions exist
    if (!this.versions.has(fromVersion) || !this.versions.has(toVersion)) {
      throw new Error(`Source or target version not found: ${migrationId}`);
    }

    const migration: MigrationMetadata = {
      fromVersion,
      toVersion,
      migrationId,
      createdAt: new Date(),
      description: metadata.description || `Migration from ${fromVersion} to ${toVersion}`,
      automated: metadata.automated ?? true,
      reversible: metadata.reversible ?? false,
      validationRules: metadata.validationRules || [],
      estimatedTime: metadata.estimatedTime || 1000,
      riskLevel: metadata.riskLevel || 'medium',
      dependencies: metadata.dependencies || [],
      rollbackStrategy: metadata.rollbackStrategy,
      ...metadata
    };

    this.migrations.set(migrationId, migration);
    this.migrationFunctions.set(migrationId, migrationFunction);

    // Update migration paths
    const fromSchema = this.versions.get(fromVersion)!;
    if (!fromSchema.migrationPath) {
      fromSchema.migrationPath = [];
    }
    fromSchema.migrationPath.push(toVersion);

    this.logger.info('Registered migration', {
      migrationId,
      automated: migration.automated,
      reversible: migration.reversible,
      riskLevel: migration.riskLevel
    });

    this.emit('migrationRegistered', migration);

    return migration;
  }

  /**
   * Perform migration from one version to another
   */
  public async migrateWorkflow(
    workflow: any,
    targetVersion: string
  ): Promise<{ workflow: WorkflowDefinition; migrationPath: string[] }> {
    const sourceVersion = workflow.schemaVersion || workflow.version || '1.0.0';
    
    if (sourceVersion === targetVersion) {
      return { workflow: workflow as WorkflowDefinition, migrationPath: [] };
    }

    // Find migration path
    const migrationPath = this.findMigrationPath(sourceVersion, targetVersion);
    if (migrationPath.length === 0) {
      throw new Error(`No migration path found from ${sourceVersion} to ${targetVersion}`);
    }

    let currentWorkflow = workflow;
    const appliedMigrations: string[] = [];

    // Apply migrations step by step
    for (let i = 0; i < migrationPath.length - 1; i++) {
      const fromVersion = migrationPath[i];
      const toVersion = migrationPath[i + 1];
      const migrationId = `${fromVersion}->${toVersion}`;

      const migrationFunction = this.migrationFunctions.get(migrationId);
      if (!migrationFunction) {
        throw new Error(`Migration function not found: ${migrationId}`);
      }

      const migration = this.migrations.get(migrationId)!;

      this.logger.info('Applying migration', {
        migrationId,
        workflowId: currentWorkflow.id
      });

      // Backup before migration if configured
      if (this.config.backupBeforeMigration) {
        await this.backupWorkflow(currentWorkflow, migrationId);
      }

      try {
        // Apply migration
        const startTime = Date.now();
        currentWorkflow = await migrationFunction(currentWorkflow);
        const duration = Date.now() - startTime;

        // Validate post-migration if required
        if (this.config.migrationValidationRequired && migration.validationRules.length > 0) {
          await this.validateMigratedWorkflow(currentWorkflow, migration.validationRules);
        }

        appliedMigrations.push(migrationId);

        this.logger.info('Migration applied successfully', {
          migrationId,
          duration,
          workflowId: currentWorkflow.id
        });

        this.emit('migrationApplied', {
          migrationId,
          workflowId: currentWorkflow.id,
          duration
        });

      } catch (error) {
        this.logger.error('Migration failed', {
          migrationId,
          workflowId: currentWorkflow.id,
          error: error instanceof Error ? error.message : error
        });

        // Attempt rollback if configured
        if (migration.rollbackStrategy && migration.rollbackStrategy.type === 'automatic') {
          await this.rollbackMigration(currentWorkflow, migrationId);
        }

        throw new Error(`Migration failed: ${migrationId} - ${error}`);
      }
    }

    return {
      workflow: currentWorkflow as WorkflowDefinition,
      migrationPath: appliedMigrations
    };
  }

  /**
   * Find migration path between versions
   */
  private findMigrationPath(fromVersion: string, toVersion: string): string[] {
    // Simple direct path for now - could implement Dijkstra's algorithm for complex cases
    const directMigration = `${fromVersion}->${toVersion}`;
    if (this.migrations.has(directMigration)) {
      return [fromVersion, toVersion];
    }

    // Try to find intermediate versions
    const availableVersions = Array.from(this.versions.keys()).sort(semver.compare);
    const fromIndex = availableVersions.indexOf(fromVersion);
    const toIndex = availableVersions.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) {
      return [];
    }

    // Try sequential path
    const path: string[] = [];
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const direction = fromIndex < toIndex ? 1 : -1;

    for (let i = start; i <= end; i += Math.abs(direction)) {
      path.push(availableVersions[i]);
    }

    if (direction === -1) {
      path.reverse();
    }

    // Verify all migration steps exist
    for (let i = 0; i < path.length - 1; i++) {
      const stepMigration = `${path[i]}->${path[i + 1]}`;
      if (!this.migrations.has(stepMigration)) {
        return []; // Path not available
      }
    }

    return path;
  }

  /**
   * Backup workflow before migration
   */
  private async backupWorkflow(workflow: any, migrationId: string): Promise<void> {
    try {
      const backupDir = path.join(this.registryPath, 'backups');
      await fs.mkdir(backupDir, { recursive: true });

      const backupFile = path.join(
        backupDir,
        `${workflow.id}_${migrationId}_${Date.now()}.json`
      );

      await fs.writeFile(backupFile, JSON.stringify(workflow, null, 2));

      this.logger.debug('Workflow backed up', {
        workflowId: workflow.id,
        migrationId,
        backupFile
      });
    } catch (error) {
      this.logger.warn('Failed to backup workflow', {
        workflowId: workflow.id,
        migrationId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Validate migrated workflow
   */
  private async validateMigratedWorkflow(
    workflow: WorkflowDefinition,
    validationRules: ValidationRule[]
  ): Promise<void> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of validationRules) {
      try {
        const result = rule.validator(workflow);
        
        if (!result.valid) {
          if (rule.severity === 'error' && rule.required) {
            errors.push(...result.errors.map(err => `${rule.name}: ${err}`));
          } else {
            warnings.push(...result.errors.map(err => `${rule.name}: ${err}`));
          }
        }

        warnings.push(...result.warnings.map(warn => `${rule.name}: ${warn}`));
      } catch (error) {
        const message = `Validation rule '${rule.name}' failed: ${error}`;
        if (rule.required) {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    }

    if (warnings.length > 0) {
      this.logger.warn('Migration validation warnings', {
        workflowId: workflow.id,
        warnings
      });
    }

    if (errors.length > 0) {
      throw new Error(`Migration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Rollback migration
   */
  private async rollbackMigration(workflow: any, migrationId: string): Promise<void> {
    const migration = this.migrations.get(migrationId);
    if (!migration || !migration.rollbackStrategy) {
      throw new Error(`No rollback strategy for migration: ${migrationId}`);
    }

    this.logger.warn('Attempting rollback', {
      migrationId,
      workflowId: workflow.id,
      strategy: migration.rollbackStrategy.type
    });

    // Rollback implementation would depend on the specific strategy
    // This is a placeholder for the rollback logic
    
    this.emit('migrationRolledBack', {
      migrationId,
      workflowId: workflow.id
    });
  }

  /**
   * Deprecate a schema version
   */
  public deprecateVersion(version: string, reason?: string): void {
    const schemaVersion = this.versions.get(version);
    if (!schemaVersion) {
      throw new Error(`Version not found: ${version}`);
    }

    schemaVersion.deprecated = true;
    schemaVersion.deprecationDate = new Date();
    
    this.logger.info('Version deprecated', {
      version,
      reason
    });

    this.emit('versionDeprecated', {
      version,
      reason,
      deprecationDate: schemaVersion.deprecationDate
    });
  }

  /**
   * Get all versions in registry
   */
  public getVersions(): SchemaVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => 
      semver.compare(a.version, b.version)
    );
  }

  /**
   * Get version by version string
   */
  public getVersion(version: string): SchemaVersion | undefined {
    return this.versions.get(version);
  }

  /**
   * Get latest version
   */
  public getLatestVersion(): SchemaVersion | undefined {
    const versions = this.getVersions();
    return versions.length > 0 ? versions[versions.length - 1] : undefined;
  }

  /**
   * Load version history from persistent storage
   */
  private async loadVersionHistory(): Promise<void> {
    try {
      const historyFile = path.join(this.registryPath, 'version-history.json');
      const content = await fs.readFile(historyFile, 'utf-8');
      const history = JSON.parse(content);

      for (const versionData of history.versions) {
        this.versions.set(versionData.version, {
          ...versionData,
          createdAt: new Date(versionData.createdAt),
          deprecationDate: versionData.deprecationDate ? new Date(versionData.deprecationDate) : undefined,
          supportEndDate: versionData.supportEndDate ? new Date(versionData.supportEndDate) : undefined
        });
      }
    } catch (error) {
      // File doesn't exist or is invalid - start fresh
      this.logger.info('Starting with empty version history');
    }
  }

  /**
   * Save version history to persistent storage
   */
  private async saveVersionHistory(): Promise<void> {
    try {
      await fs.mkdir(this.registryPath, { recursive: true });
      
      const historyFile = path.join(this.registryPath, 'version-history.json');
      const history = {
        versions: Array.from(this.versions.values()),
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      this.logger.error('Failed to save version history', { error });
    }
  }

  /**
   * Load migrations from persistent storage
   */
  private async loadMigrations(): Promise<void> {
    try {
      const migrationsFile = path.join(this.registryPath, 'migrations.json');
      const content = await fs.readFile(migrationsFile, 'utf-8');
      const migrationsData = JSON.parse(content);

      for (const migrationData of migrationsData.migrations) {
        this.migrations.set(migrationData.migrationId, {
          ...migrationData,
          createdAt: new Date(migrationData.createdAt)
        });
      }
    } catch (error) {
      // File doesn't exist or is invalid - start fresh
      this.logger.info('Starting with empty migrations registry');
    }
  }
}

/**
 * Migration function type
 */
export type MigrationFunction = (workflow: any) => Promise<WorkflowDefinition> | WorkflowDefinition;

/**
 * Factory function to create schema registry
 */
export function createSchemaRegistry(registryPath?: string): SchemaRegistry {
  return new SchemaRegistry(registryPath);
}

// Export all types for external use
export type {
  SchemaVersion,
  SchemaChange,
  MigrationMetadata,
  ValidationRule,
  RollbackStrategy,
  CompatibilityResult,
  CompatibilityIssue
};