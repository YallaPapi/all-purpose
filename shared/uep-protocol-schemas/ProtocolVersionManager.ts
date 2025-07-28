/**
 * UEP Protocol Version Manager - Semantic Versioning and Compatibility
 * 
 * Comprehensive versioning system for UEP protocols with semantic versioning,
 * compatibility tracking, migration management, and version constraint resolution.
 * Enforces versioning policies and provides automated compatibility analysis.
 */

import { EventEmitter } from 'events';
import { ProtocolDefinition } from './ProtocolSchemaRepository';

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export interface VersionConstraint {
  operator: '=' | '>' | '>=' | '<' | '<=' | '~' | '^' | '||';
  version: string;
}

export interface VersionRange {
  constraints: VersionConstraint[];
  satisfiedBy?: string[];
}

export interface CompatibilityMatrix {
  protocolId: string;
  versions: Map<string, VersionCompatibility>;
  lastUpdated: Date;
}

export interface VersionCompatibility {
  version: string;
  compatibleWith: string[];
  incompatibleWith: string[];
  breakingChanges: BreakingChange[];
  deprecations: Deprecation[];
  migrationRequired: boolean;
  migrationComplexity: 'simple' | 'moderate' | 'complex';
}

export interface BreakingChange {
  type: 'endpoint-removed' | 'field-removed' | 'type-changed' | 'behavior-changed' | 'security-changed';
  description: string;
  path: string;
  affectedFeatures: string[];
  mitigation?: string;
  automated: boolean;
}

export interface Deprecation {
  feature: string;
  path: string;
  deprecatedIn: string;
  removedIn?: string;
  replacement?: string;
  reason: string;
  timeline: Date;
}

export interface MigrationPlan {
  fromVersion: string;
  toVersion: string;
  complexity: 'simple' | 'moderate' | 'complex';
  automated: boolean;
  estimatedTime: number; // hours
  steps: MigrationStep[];
  prerequisites: string[];
  rollbackPlan: RollbackStep[];
  validation: ValidationStep[];
}

export interface MigrationStep {
  id: string;
  type: 'code-change' | 'configuration-change' | 'data-migration' | 'deployment-change';
  title: string;
  description: string;
  action: string;
  automated: boolean;
  script?: string;
  validation?: string;
  rollback?: string;
  critical: boolean;
}

export interface RollbackStep {
  stepId: string;
  action: string;
  script?: string;
  verification: string;
}

export interface ValidationStep {
  type: 'functionality' | 'performance' | 'compatibility' | 'security';
  description: string;
  testScript?: string;
  expectedResult: string;
  critical: boolean;
}

export interface VersioningPolicy {
  allowPrerelease: boolean;
  requireMigrationPlan: boolean;
  maxMajorVersionJump: number;
  deprecationPeriod: number; // days
  backwardCompatibilityWindow: number; // versions
  automaticMinorUpdates: boolean;
  automaticPatchUpdates: boolean;
  enforceSemanticVersioning: boolean;
}

export interface VersionManagerConfig {
  policy: VersioningPolicy;
  migrationTemplates: Map<string, string>;
  automationScripts: Map<string, string>;
  compatibilityRules: CompatibilityRule[];
}

export interface CompatibilityRule {
  name: string;
  description: string;
  check: (oldVersion: ProtocolDefinition, newVersion: ProtocolDefinition) => CompatibilityCheckResult;
  severity: 'error' | 'warning' | 'info';
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  suggestions: string[];
}

export interface CompatibilityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  oldValue?: any;
  newValue?: any;
  fixable: boolean;
  autoFix?: string;
}

/**
 * Protocol Version Manager
 */
export class ProtocolVersionManager extends EventEmitter {
  private config: VersionManagerConfig;
  private compatibilityMatrices: Map<string, CompatibilityMatrix> = new Map();
  private migrationPlans: Map<string, MigrationPlan[]> = new Map();
  private versionHistory: Map<string, ProtocolDefinition[]> = new Map();

  constructor(config: VersionManagerConfig) {
    super();
    this.config = config;
    this.initializeCompatibilityRules();
  }

  /**
   * Parse semantic version string
   */
  parseVersion(version: string): SemanticVersion {
    const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9\-\.]+))?(?:\+([a-zA-Z0-9\-\.]+))?$/;
    const match = version.match(versionRegex);

    if (!match) {
      throw new Error(`Invalid semantic version: ${version}`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4],
      build: match[5]
    };
  }

  /**
   * Compare two semantic versions
   */
  compareVersions(a: string, b: string): number {
    const versionA = this.parseVersion(a);
    const versionB = this.parseVersion(b);

    // Compare major version
    if (versionA.major !== versionB.major) {
      return versionA.major - versionB.major;
    }

    // Compare minor version
    if (versionA.minor !== versionB.minor) {
      return versionA.minor - versionB.minor;
    }

    // Compare patch version
    if (versionA.patch !== versionB.patch) {
      return versionA.patch - versionB.patch;
    }

    // Compare prerelease
    if (versionA.prerelease && !versionB.prerelease) return -1;
    if (!versionA.prerelease && versionB.prerelease) return 1;
    if (versionA.prerelease && versionB.prerelease) {
      return versionA.prerelease.localeCompare(versionB.prerelease);
    }

    return 0;
  }

  /**
   * Get next version based on change type
   */
  getNextVersion(currentVersion: string, changeType: 'major' | 'minor' | 'patch', prerelease?: string): string {
    const version = this.parseVersion(currentVersion);

    switch (changeType) {
      case 'major':
        return `${version.major + 1}.0.0${prerelease ? `-${prerelease}` : ''}`;
      case 'minor':
        return `${version.major}.${version.minor + 1}.0${prerelease ? `-${prerelease}` : ''}`;
      case 'patch':
        return `${version.major}.${version.minor}.${version.patch + 1}${prerelease ? `-${prerelease}` : ''}`;
      default:
        throw new Error(`Invalid change type: ${changeType}`);
    }
  }

  /**
   * Check if version satisfies constraint
   */
  satisfiesConstraint(version: string, constraint: VersionConstraint): boolean {
    const versionParsed = this.parseVersion(version);
    const constraintParsed = this.parseVersion(constraint.version);
    const comparison = this.compareVersions(version, constraint.version);

    switch (constraint.operator) {
      case '=':
        return comparison === 0;
      case '>':
        return comparison > 0;
      case '>=':
        return comparison >= 0;
      case '<':
        return comparison < 0;
      case '<=':
        return comparison <= 0;
      case '~':
        // ~1.2.3 := >=1.2.3 <1.(2+1).0
        return versionParsed.major === constraintParsed.major &&
               versionParsed.minor === constraintParsed.minor &&
               versionParsed.patch >= constraintParsed.patch;
      case '^':
        // ^1.2.3 := >=1.2.3 <2.0.0
        return versionParsed.major === constraintParsed.major &&
               (versionParsed.minor > constraintParsed.minor ||
                (versionParsed.minor === constraintParsed.minor && versionParsed.patch >= constraintParsed.patch));
      default:
        return false;
    }
  }

  /**
   * Find versions that satisfy version range
   */
  resolveVersionRange(availableVersions: string[], range: VersionRange): string[] {
    return availableVersions.filter(version => {
      return range.constraints.every(constraint => {
        if (constraint.operator === '||') {
          // OR operator - version must satisfy at least one constraint
          const orConstraints = constraint.version.split('||').map(v => ({ operator: '=' as const, version: v.trim() }));
          return orConstraints.some(orConstraint => this.satisfiesConstraint(version, orConstraint));
        }
        return this.satisfiesConstraint(version, constraint);
      });
    });
  }

  /**
   * Register protocol version
   */
  async registerVersion(protocol: ProtocolDefinition): Promise<void> {
    const protocolId = protocol.id;
    
    // Validate version format
    this.validateVersionFormat(protocol.version);

    // Get version history
    const history = this.versionHistory.get(protocolId) || [];
    
    // Check for version conflicts
    const existingVersion = history.find(p => p.version === protocol.version);
    if (existingVersion) {
      throw new Error(`Version ${protocol.version} already exists for protocol ${protocolId}`);
    }

    // Find previous version for comparison
    const previousVersion = this.getLatestVersion(history);
    
    // Validate version progression
    if (previousVersion) {
      this.validateVersionProgression(previousVersion.version, protocol.version);
    }

    // Perform compatibility analysis
    if (previousVersion) {
      const compatibility = await this.analyzeCompatibility(previousVersion, protocol);
      await this.updateCompatibilityMatrix(protocolId, protocol.version, compatibility);
      
      // Generate migration plan if needed
      if (!compatibility.compatible || compatibility.issues.some(i => i.severity === 'error')) {
        const migrationPlan = await this.generateMigrationPlan(previousVersion, protocol);
        this.storeMigrationPlan(protocolId, migrationPlan);
      }
    }

    // Add to version history
    history.push(protocol);
    history.sort((a, b) => this.compareVersions(a.version, b.version));
    this.versionHistory.set(protocolId, history);

    this.emit('version-registered', { protocol, previousVersion });
  }

  /**
   * Analyze compatibility between two protocol versions
   */
  async analyzeCompatibility(
    oldProtocol: ProtocolDefinition,
    newProtocol: ProtocolDefinition
  ): Promise<CompatibilityCheckResult> {
    const issues: CompatibilityIssue[] = [];
    const suggestions: string[] = [];

    // Run all compatibility rules
    for (const rule of this.config.compatibilityRules) {
      try {
        const result = rule.check(oldProtocol, newProtocol);
        issues.push(...result.issues);
        suggestions.push(...result.suggestions);
      } catch (error) {
        issues.push({
          type: 'rule-execution-error',
          severity: 'error',
          message: `Compatibility rule "${rule.name}" failed: ${error.message}`,
          path: '/',
          fixable: false
        });
      }
    }

    // Analyze version number progression
    const versionIssues = this.analyzeVersionProgression(oldProtocol.version, newProtocol.version, issues);
    issues.push(...versionIssues);

    return {
      compatible: !issues.some(issue => issue.severity === 'error'),
      issues,
      suggestions
    };
  }

  /**
   * Generate migration plan between versions
   */
  async generateMigrationPlan(
    fromProtocol: ProtocolDefinition,
    toProtocol: ProtocolDefinition
  ): Promise<MigrationPlan> {
    const fromVersion = fromProtocol.version;
    const toVersion = toProtocol.version;
    
    // Determine migration complexity
    const complexity = this.determineMigrationComplexity(fromProtocol, toProtocol);
    
    // Generate migration steps
    const steps = await this.generateMigrationSteps(fromProtocol, toProtocol);
    
    // Generate rollback plan
    const rollbackPlan = this.generateRollbackPlan(steps);
    
    // Generate validation steps
    const validation = this.generateValidationSteps(fromProtocol, toProtocol);

    const plan: MigrationPlan = {
      fromVersion,
      toVersion,
      complexity,
      automated: steps.every(s => s.automated),
      estimatedTime: this.estimateMigrationTime(steps, complexity),
      steps,
      prerequisites: this.identifyPrerequisites(fromProtocol, toProtocol),
      rollbackPlan,
      validation
    };

    return plan;
  }

  /**
   * Get compatibility information for protocol version
   */
  getCompatibilityInfo(protocolId: string, version: string): VersionCompatibility | null {
    const matrix = this.compatibilityMatrices.get(protocolId);
    return matrix?.versions.get(version) || null;
  }

  /**
   * Get migration plan between versions
   */
  getMigrationPlan(protocolId: string, fromVersion: string, toVersion: string): MigrationPlan | null {
    const plans = this.migrationPlans.get(protocolId) || [];
    return plans.find(p => p.fromVersion === fromVersion && p.toVersion === toVersion) || null;
  }

  /**
   * Get version history for protocol
   */
  getVersionHistory(protocolId: string): ProtocolDefinition[] {
    return this.versionHistory.get(protocolId) || [];
  }

  /**
   * Get latest version of protocol
   */
  getLatestVersion(history: ProtocolDefinition[]): ProtocolDefinition | null {
    if (history.length === 0) return null;
    return history.reduce((latest, current) => 
      this.compareVersions(current.version, latest.version) > 0 ? current : latest
    );
  }

  /**
   * Private helper methods
   */
  private validateVersionFormat(version: string): void {
    try {
      this.parseVersion(version);
    } catch (error) {
      throw new Error(`Invalid version format: ${version}. Must follow semantic versioning (x.y.z)`);
    }
  }

  private validateVersionProgression(oldVersion: string, newVersion: string): void {
    const comparison = this.compareVersions(newVersion, oldVersion);
    
    if (comparison <= 0) {
      throw new Error(`New version ${newVersion} must be greater than current version ${oldVersion}`);
    }

    // Check for major version jump limit
    const oldParsed = this.parseVersion(oldVersion);
    const newParsed = this.parseVersion(newVersion);
    const majorJump = newParsed.major - oldParsed.major;

    if (majorJump > this.config.policy.maxMajorVersionJump) {
      throw new Error(`Major version jump of ${majorJump} exceeds policy limit of ${this.config.policy.maxMajorVersionJump}`);
    }

    // Check prerelease policy
    if (newParsed.prerelease && !this.config.policy.allowPrerelease) {
      throw new Error('Prerelease versions are not allowed by current policy');
    }
  }

  private async updateCompatibilityMatrix(
    protocolId: string,
    version: string,
    compatibility: CompatibilityCheckResult
  ): Promise<void> {
    let matrix = this.compatibilityMatrices.get(protocolId);
    
    if (!matrix) {
      matrix = {
        protocolId,
        versions: new Map(),
        lastUpdated: new Date()
      };
      this.compatibilityMatrices.set(protocolId, matrix);
    }

    const versionCompatibility: VersionCompatibility = {
      version,
      compatibleWith: [], // Would be populated based on compatibility analysis
      incompatibleWith: [], // Would be populated based on compatibility analysis
      breakingChanges: this.extractBreakingChanges(compatibility.issues),
      deprecations: [], // Would be extracted from protocol analysis
      migrationRequired: !compatibility.compatible,
      migrationComplexity: this.determineMigrationComplexityFromIssues(compatibility.issues)
    };

    matrix.versions.set(version, versionCompatibility);
    matrix.lastUpdated = new Date();
  }

  private storeMigrationPlan(protocolId: string, plan: MigrationPlan): void {
    const plans = this.migrationPlans.get(protocolId) || [];
    
    // Remove existing plan for same version pair
    const existingIndex = plans.findIndex(p => 
      p.fromVersion === plan.fromVersion && p.toVersion === plan.toVersion
    );
    
    if (existingIndex !== -1) {
      plans[existingIndex] = plan;
    } else {
      plans.push(plan);
    }
    
    this.migrationPlans.set(protocolId, plans);
  }

  private analyzeVersionProgression(oldVersion: string, newVersion: string, existingIssues: CompatibilityIssue[]): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const oldParsed = this.parseVersion(oldVersion);
    const newParsed = this.parseVersion(newVersion);

    // Check if version number matches breaking changes
    const hasBreakingChanges = existingIssues.some(issue => issue.severity === 'error');
    const isMajorVersionBump = newParsed.major > oldParsed.major;

    if (hasBreakingChanges && !isMajorVersionBump) {
      issues.push({
        type: 'version-progression-error',
        severity: 'error',
        message: 'Breaking changes detected but major version was not incremented',
        path: '/version',
        fixable: true,
        autoFix: this.getNextVersion(oldVersion, 'major')
      });
    }

    if (isMajorVersionBump && !hasBreakingChanges) {
      issues.push({
        type: 'version-progression-warning',
        severity: 'warning',
        message: 'Major version incremented but no breaking changes detected',
        path: '/version',
        fixable: true,
        autoFix: this.getNextVersion(oldVersion, 'minor')
      });
    }

    return issues;
  }

  private determineMigrationComplexity(oldProtocol: ProtocolDefinition, newProtocol: ProtocolDefinition): 'simple' | 'moderate' | 'complex' {
    const oldParsed = this.parseVersion(oldProtocol.version);
    const newParsed = this.parseVersion(newProtocol.version);

    // Major version change = complex migration
    if (newParsed.major > oldParsed.major) {
      return 'complex';
    }

    // Minor version change = moderate migration
    if (newParsed.minor > oldParsed.minor) {
      return 'moderate';
    }

    // Patch version change = simple migration
    return 'simple';
  }

  private determineMigrationComplexityFromIssues(issues: CompatibilityIssue[]): 'simple' | 'moderate' | 'complex' {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    if (errorCount > 5 || warningCount > 15) return 'complex';
    if (errorCount > 2 || warningCount > 5) return 'moderate';
    return 'simple';
  }

  private async generateMigrationSteps(oldProtocol: ProtocolDefinition, newProtocol: ProtocolDefinition): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = [];
    
    // Generate update schema step
    steps.push({
      id: 'update-schema',
      type: 'code-change',
      title: 'Update Protocol Schema',
      description: `Update protocol schema from ${oldProtocol.version} to ${newProtocol.version}`,
      action: 'Replace protocol definition file with new version',
      automated: true,
      script: 'update-protocol-schema.js',
      validation: 'validate-protocol-schema.js',
      rollback: 'rollback-protocol-schema.js',
      critical: true
    });

    // Generate validation code update step
    steps.push({
      id: 'update-validation-code',
      type: 'code-change',
      title: 'Update Validation Code',
      description: 'Regenerate validation code from updated protocol',
      action: 'Run protocol compiler to generate new validation code',
      automated: true,
      script: 'regenerate-validation-code.js',
      validation: 'test-validation-code.js',
      rollback: 'restore-old-validation-code.js',
      critical: true
    });

    // Generate configuration update step if needed
    if (this.hasConfigurationChanges(oldProtocol, newProtocol)) {
      steps.push({
        id: 'update-configuration',
        type: 'configuration-change',
        title: 'Update Agent Configuration',
        description: 'Update agent configuration to match new protocol requirements',
        action: 'Modify agent configuration files',
        automated: false,
        critical: false
      });
    }

    // Generate testing step
    steps.push({
      id: 'run-tests',
      type: 'code-change',
      title: 'Run Integration Tests',
      description: 'Execute full test suite to verify migration success',
      action: 'Run all tests including new protocol validation tests',
      automated: true,
      script: 'run-migration-tests.js',
      critical: true
    });

    return steps;
  }

  private generateRollbackPlan(steps: MigrationStep[]): RollbackStep[] {
    return steps
      .filter(step => step.critical && step.rollback)
      .reverse() // Rollback in reverse order
      .map(step => ({
        stepId: step.id,
        action: `Rollback: ${step.title}`,
        script: step.rollback,
        verification: `verify-rollback-${step.id}.js`
      }));
  }

  private generateValidationSteps(oldProtocol: ProtocolDefinition, newProtocol: ProtocolDefinition): ValidationStep[] {
    return [
      {
        type: 'functionality',
        description: 'Verify all protocol endpoints function correctly',
        testScript: 'test-protocol-functionality.js',
        expectedResult: 'All endpoints respond correctly with valid data',
        critical: true
      },
      {
        type: 'compatibility',
        description: 'Verify backward compatibility where expected',
        testScript: 'test-backward-compatibility.js',
        expectedResult: 'Legacy clients can still communicate successfully',
        critical: true
      },
      {
        type: 'performance',
        description: 'Verify performance meets requirements',
        testScript: 'test-protocol-performance.js',
        expectedResult: 'Response times within acceptable limits',
        critical: false
      }
    ];
  }

  private estimateMigrationTime(steps: MigrationStep[], complexity: 'simple' | 'moderate' | 'complex'): number {
    const baseTime = steps.reduce((total, step) => {
      switch (step.type) {
        case 'code-change': return total + (step.automated ? 0.5 : 2);
        case 'configuration-change': return total + 1;
        case 'data-migration': return total + 4;
        case 'deployment-change': return total + 2;
        default: return total + 1;
      }
    }, 0);

    const complexityMultiplier = {
      'simple': 1,
      'moderate': 1.5, 
      'complex': 2.5
    }[complexity];

    return Math.ceil(baseTime * complexityMultiplier);
  }

  private identifyPrerequisites(oldProtocol: ProtocolDefinition, newProtocol: ProtocolDefinition): string[] {
    const prerequisites: string[] = [];
    
    // Check for dependency changes
    const oldDeps = oldProtocol.specification['x-uep-metadata']?.dependencies || [];
    const newDeps = newProtocol.specification['x-uep-metadata']?.dependencies || [];
    
    const addedDeps = newDeps.filter(dep => !oldDeps.includes(dep));
    if (addedDeps.length > 0) {
      prerequisites.push(`Update dependencies: ${addedDeps.join(', ')}`);
    }

    // Check for major version changes
    const oldVersion = this.parseVersion(oldProtocol.version);
    const newVersion = this.parseVersion(newProtocol.version);
    
    if (newVersion.major > oldVersion.major) {
      prerequisites.push('Backup current system state');
      prerequisites.push('Notify dependent services of breaking changes');
      prerequisites.push('Schedule maintenance window');
    }

    return prerequisites;
  }

  private extractBreakingChanges(issues: CompatibilityIssue[]): BreakingChange[] {
    return issues
      .filter(issue => issue.severity === 'error')
      .map(issue => ({
        type: this.mapIssueTypeToBreakingChangeType(issue.type),
        description: issue.message,
        path: issue.path,
        affectedFeatures: [], // Would be populated based on impact analysis
        mitigation: issue.autoFix,
        automated: issue.fixable
      }));
  }

  private mapIssueTypeToBreakingChangeType(issueType: string): BreakingChange['type'] {
    const mapping: Record<string, BreakingChange['type']> = {
      'endpoint-removed': 'endpoint-removed',
      'field-removed': 'field-removed',
      'type-changed': 'type-changed',
      'behavior-changed': 'behavior-changed',
      'security-changed': 'security-changed'
    };
    
    return mapping[issueType] || 'behavior-changed';
  }

  private hasConfigurationChanges(oldProtocol: ProtocolDefinition, newProtocol: ProtocolDefinition): boolean {
    // Simple check - in production would do deeper analysis
    const oldMetadata = oldProtocol.specification['x-uep-metadata'];
    const newMetadata = newProtocol.specification['x-uep-metadata'];
    
    return JSON.stringify(oldMetadata) !== JSON.stringify(newMetadata);
  }

  private initializeCompatibilityRules(): void {
    // Initialize with default compatibility rules
    this.config.compatibilityRules = this.config.compatibilityRules || [];
    
    // Add default rules if none provided
    if (this.config.compatibilityRules.length === 0) {
      this.config.compatibilityRules.push(...this.getDefaultCompatibilityRules());
    }
  }

  private getDefaultCompatibilityRules(): CompatibilityRule[] {
    return [
      {
        name: 'Endpoint Removal Check',
        description: 'Detects removed API endpoints',
        severity: 'error',
        check: (oldProtocol, newProtocol) => {
          const issues: CompatibilityIssue[] = [];
          const oldPaths = Object.keys(oldProtocol.specification.paths || {});
          const newPaths = Object.keys(newProtocol.specification.paths || {});
          
          const removedPaths = oldPaths.filter(path => !newPaths.includes(path));
          
          for (const path of removedPaths) {
            issues.push({
              type: 'endpoint-removed',
              severity: 'error',
              message: `Endpoint removed: ${path}`,
              path: `/paths${path}`,
              fixable: false
            });
          }
          
          return { compatible: issues.length === 0, issues, suggestions: [] };
        }
      },
      {
        name: 'Required Field Check',
        description: 'Detects newly required fields that break backward compatibility',
        severity: 'error',
        check: (oldProtocol, newProtocol) => {
          const issues: CompatibilityIssue[] = [];
          // Implementation would analyze schema changes for new required fields
          return { compatible: true, issues, suggestions: [] };
        }
      }
    ];
  }

  /**
   * Shutdown version manager
   */
  async shutdown(): Promise<void> {
    this.compatibilityMatrices.clear();
    this.migrationPlans.clear();
    this.versionHistory.clear();
    this.removeAllListeners();
  }
}