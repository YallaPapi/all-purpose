/**
 * UEP Protocol Versioning Policies - Predefined Policy Templates
 * 
 * Provides predefined versioning policies for different organizational contexts
 * and development lifecycle stages. Policies define rules for version management,
 * compatibility requirements, and migration procedures.
 */

import { VersioningPolicy, CompatibilityRule, VersionManagerConfig } from './ProtocolVersionManager';

export interface PolicyTemplate {
  name: string;
  description: string;
  useCase: string;
  policy: VersioningPolicy;
  compatibilityRules: CompatibilityRule[];
  migrationTemplates: Map<string, string>;
  automationScripts: Map<string, string>;
}

/**
 * Development Environment Policy - Flexible for rapid iteration
 */
export const DEVELOPMENT_POLICY: PolicyTemplate = {
  name: 'Development Environment',
  description: 'Flexible versioning policy for development environments with rapid iteration',
  useCase: 'Early development phases, proof-of-concepts, internal testing',
  policy: {
    allowPrerelease: true,
    requireMigrationPlan: false,
    maxMajorVersionJump: 5,
    deprecationPeriod: 7, // 1 week
    backwardCompatibilityWindow: 2,
    automaticMinorUpdates: true,
    automaticPatchUpdates: true,
    enforceSemanticVersioning: false
  },
  compatibilityRules: [
    {
      name: 'Relaxed Endpoint Check',
      description: 'Allows endpoint changes with warnings only',
      severity: 'warning',
      check: (oldProtocol, newProtocol) => {
        return { compatible: true, issues: [], suggestions: ['Consider documenting endpoint changes'] };
      }
    }
  ],
  migrationTemplates: new Map([
    ['simple', 'development-simple-migration.hbs'],
    ['moderate', 'development-moderate-migration.hbs']
  ]),
  automationScripts: new Map([
    ['update-schema', 'scripts/dev-update-schema.js'],
    ['rollback', 'scripts/dev-rollback.js']
  ])
};

/**
 * Staging Environment Policy - Balanced approach for testing
 */
export const STAGING_POLICY: PolicyTemplate = {
  name: 'Staging Environment',
  description: 'Balanced versioning policy for staging environments with controlled changes',
  useCase: 'Integration testing, pre-production validation, QA environments',
  policy: {
    allowPrerelease: true,
    requireMigrationPlan: true,
    maxMajorVersionJump: 2,
    deprecationPeriod: 14, // 2 weeks
    backwardCompatibilityWindow: 3,
    automaticMinorUpdates: false,
    automaticPatchUpdates: true,
    enforceSemanticVersioning: true
  },
  compatibilityRules: [
    {
      name: 'Breaking Change Detection',
      description: 'Detects and flags breaking changes',
      severity: 'error',
      check: (oldProtocol, newProtocol) => {
        const issues = [];
        // Check for removed endpoints
        const oldPaths = Object.keys(oldProtocol.specification.paths || {});
        const newPaths = Object.keys(newProtocol.specification.paths || {});
        const removedPaths = oldPaths.filter(path => !newPaths.includes(path));
        
        for (const path of removedPaths) {
          issues.push({
            type: 'endpoint-removed',
            severity: 'error' as const,
            message: `Breaking change: Endpoint removed - ${path}`,
            path: `/paths${path}`,
            fixable: false
          });
        }
        
        return { compatible: issues.length === 0, issues, suggestions: [] };
      }
    },
    {
      name: 'Version Progression Check',
      description: 'Ensures proper semantic version progression',
      severity: 'error',
      check: (oldProtocol, newProtocol) => {
        // Implementation would check semantic version rules
        return { compatible: true, issues: [], suggestions: [] };
      }
    }
  ],
  migrationTemplates: new Map([
    ['simple', 'staging-simple-migration.hbs'],
    ['moderate', 'staging-moderate-migration.hbs'],
    ['complex', 'staging-complex-migration.hbs']
  ]),
  automationScripts: new Map([
    ['update-schema', 'scripts/staging-update-schema.js'],
    ['validate-changes', 'scripts/staging-validate-changes.js'],
    ['rollback', 'scripts/staging-rollback.js']
  ])
};

/**
 * Production Environment Policy - Strict rules for production stability
 */
export const PRODUCTION_POLICY: PolicyTemplate = {
  name: 'Production Environment',
  description: 'Strict versioning policy for production environments prioritizing stability',
  useCase: 'Production systems, customer-facing services, critical infrastructure',
  policy: {
    allowPrerelease: false,
    requireMigrationPlan: true,
    maxMajorVersionJump: 1,
    deprecationPeriod: 90, // 3 months
    backwardCompatibilityWindow: 5,
    automaticMinorUpdates: false,
    automaticPatchUpdates: false,
    enforceSemanticVersioning: true
  },
  compatibilityRules: [
    {
      name: 'Strict Breaking Change Prevention',
      description: 'Prevents any breaking changes without major version increment',
      severity: 'error',
      check: (oldProtocol, newProtocol) => {
        const issues = [];
        const suggestions = [];
        
        // Comprehensive breaking change detection
        const oldPaths = Object.keys(oldProtocol.specification.paths || {});
        const newPaths = Object.keys(newProtocol.specification.paths || {});
        
        // Check for removed endpoints
        const removedPaths = oldPaths.filter(path => !newPaths.includes(path));
        for (const path of removedPaths) {
          issues.push({
            type: 'endpoint-removed',
            severity: 'error' as const,
            message: `Breaking change: Endpoint removed - ${path}`,
            path: `/paths${path}`,
            fixable: false
          });
          suggestions.push(`Consider deprecating ${path} instead of removing it immediately`);
        }
        
        // Check for schema changes
        const oldSchemas = oldProtocol.specification.components?.schemas || {};
        const newSchemas = newProtocol.specification.components?.schemas || {};
        
        for (const [schemaName, oldSchema] of Object.entries(oldSchemas)) {
          const newSchema = newSchemas[schemaName];
          if (!newSchema) {
            issues.push({
              type: 'schema-removed',
              severity: 'error' as const,
              message: `Breaking change: Schema removed - ${schemaName}`,
              path: `/components/schemas/${schemaName}`,
              fixable: false
            });
          }
        }
        
        return { compatible: issues.length === 0, issues, suggestions };
      }
    },
    {
      name: 'Deprecation Timeline Enforcement',
      description: 'Ensures proper deprecation timelines are followed',
      severity: 'error',
      check: (oldProtocol, newProtocol) => {
        // Implementation would check deprecation timelines
        return { compatible: true, issues: [], suggestions: [] };
      }
    },
    {
      name: 'Security Impact Assessment',
      description: 'Assesses security implications of protocol changes',
      severity: 'error',
      check: (oldProtocol, newProtocol) => {
        const issues = [];
        const suggestions = [];
        
        // Check for security scheme changes
        const oldSecurity = oldProtocol.specification.components?.securitySchemes || {};
        const newSecurity = newProtocol.specification.components?.securitySchemes || {};
        
        for (const [schemeName, oldScheme] of Object.entries(oldSecurity)) {
          const newScheme = newSecurity[schemeName];
          if (!newScheme) {
            issues.push({
              type: 'security-scheme-removed',
              severity: 'error' as const,
              message: `Security risk: Security scheme removed - ${schemeName}`,
              path: `/components/securitySchemes/${schemeName}`,
              fixable: false
            });
            suggestions.push(`Security scheme removal requires security review and approval`);
          }
        }
        
        return { compatible: issues.length === 0, issues, suggestions };
      }
    }
  ],
  migrationTemplates: new Map([
    ['simple', 'production-simple-migration.hbs'],
    ['moderate', 'production-moderate-migration.hbs'],
    ['complex', 'production-complex-migration.hbs']
  ]),
  automationScripts: new Map([
    ['update-schema', 'scripts/production-update-schema.js'],
    ['validate-changes', 'scripts/production-validate-changes.js'],
    ['security-scan', 'scripts/production-security-scan.js'],
    ['rollback', 'scripts/production-rollback.js'],
    ['health-check', 'scripts/production-health-check.js']
  ])
};

/**
 * Enterprise Policy - Maximum control and governance
 */
export const ENTERPRISE_POLICY: PolicyTemplate = {
  name: 'Enterprise Environment',
  description: 'Maximum control versioning policy for enterprise environments with full governance',
  useCase: 'Large enterprises, regulated industries, mission-critical systems',
  policy: {
    allowPrerelease: false,
    requireMigrationPlan: true,
    maxMajorVersionJump: 1,
    deprecationPeriod: 180, // 6 months
    backwardCompatibilityWindow: 10,
    automaticMinorUpdates: false,
    automaticPatchUpdates: false,
    enforceSemanticVersioning: true
  },
  compatibilityRules: [
    {
      name: 'Enterprise Governance Check',
      description: 'Ensures all changes comply with enterprise governance policies',
      severity: 'error',
      check: (oldProtocol, newProtocol) => {
        const issues = [];
        const suggestions = [];
        
        // Check for proper documentation
        if (!newProtocol.metadata.author || !newProtocol.metadata.maintainers?.length) {
          issues.push({
            type: 'governance-violation',
            severity: 'error' as const,
            message: 'Enterprise policy requires proper authorship and maintainer information',
            path: '/metadata',
            fixable: true,
            autoFix: 'Add required metadata fields'
          });
        }
        
        // Check for proper lifecycle phase
        if (!newProtocol.lifecycle.phase || newProtocol.lifecycle.phase === 'development') {
          issues.push({
            type: 'lifecycle-violation',
            severity: 'error' as const,
            message: 'Enterprise protocols must be in testing, staging, or production phase',
            path: '/lifecycle/phase',
            fixable: true
          });
        }
        
        return { compatible: issues.length === 0, issues, suggestions };
      }
    },
    {
      name: 'Compliance Audit Trail',
      description: 'Ensures proper audit trail for compliance',
      severity: 'error',
      check: (oldProtocol, newProtocol) => {
        const issues = [];
        
        // Check for changelog entries
        if (!newProtocol.lifecycle.changeLog?.length) {
          issues.push({
            type: 'audit-trail-missing',
            severity: 'error' as const,
            message: 'Enterprise policy requires detailed changelog for audit trail',
            path: '/lifecycle/changeLog',
            fixable: false
          });
        }
        
        return { compatible: issues.length === 0, issues, suggestions: [] };
      }
    }
  ],
  migrationTemplates: new Map([
    ['simple', 'enterprise-simple-migration.hbs'],
    ['moderate', 'enterprise-moderate-migration.hbs'],
    ['complex', 'enterprise-complex-migration.hbs']
  ]),
  automationScripts: new Map([
    ['update-schema', 'scripts/enterprise-update-schema.js'],
    ['validate-changes', 'scripts/enterprise-validate-changes.js'],
    ['security-scan', 'scripts/enterprise-security-scan.js'],
    ['compliance-check', 'scripts/enterprise-compliance-check.js'],
    ['approval-workflow', 'scripts/enterprise-approval-workflow.js'],
    ['rollback', 'scripts/enterprise-rollback.js'],
    ['audit-log', 'scripts/enterprise-audit-log.js']
  ])
};

/**
 * Open Source Policy - Community-focused with transparency
 */
export const OPEN_SOURCE_POLICY: PolicyTemplate = {
  name: 'Open Source Project',
  description: 'Community-focused versioning policy for open source projects',
  useCase: 'Open source projects, community-driven development, public APIs',
  policy: {
    allowPrerelease: true,
    requireMigrationPlan: true,
    maxMajorVersionJump: 2,
    deprecationPeriod: 60, // 2 months
    backwardCompatibilityWindow: 5,
    automaticMinorUpdates: false,
    automaticPatchUpdates: true,
    enforceSemanticVersioning: true
  },
  compatibilityRules: [
    {
      name: 'Community Impact Assessment',
      description: 'Assesses impact on community and downstream users',
      severity: 'warning',
      check: (oldProtocol, newProtocol) => {
        const issues = [];
        const suggestions = [];
        
        // Check for breaking changes
        const oldPaths = Object.keys(oldProtocol.specification.paths || {});
        const newPaths = Object.keys(newProtocol.specification.paths || {});
        const removedPaths = oldPaths.filter(path => !newPaths.includes(path));
        
        if (removedPaths.length > 0) {
          suggestions.push('Consider announcing breaking changes to the community in advance');
          suggestions.push('Provide migration examples and documentation');
          suggestions.push('Consider maintaining backward compatibility layer for one major version');
        }
        
        return { compatible: true, issues, suggestions };
      }
    },
    {
      name: 'Documentation Completeness',
      description: 'Ensures proper documentation for community usage',
      severity: 'warning',
      check: (oldProtocol, newProtocol) => {
        const issues = [];
        const suggestions = [];
        
        if (!newProtocol.specification.info.description || newProtocol.specification.info.description.length < 50) {
          suggestions.push('Add comprehensive description for community understanding');
        }
        
        return { compatible: true, issues, suggestions };
      }
    }
  ],
  migrationTemplates: new Map([
    ['simple', 'opensource-simple-migration.hbs'],
    ['moderate', 'opensource-moderate-migration.hbs'],
    ['complex', 'opensource-complex-migration.hbs']
  ]),
  automationScripts: new Map([
    ['update-schema', 'scripts/opensource-update-schema.js'],
    ['validate-changes', 'scripts/opensource-validate-changes.js'],
    ['generate-changelog', 'scripts/opensource-generate-changelog.js'],
    ['community-notification', 'scripts/opensource-community-notification.js'],
    ['rollback', 'scripts/opensource-rollback.js']
  ])
};

/**
 * Utility functions for policy management
 */
export class PolicyManager {
  private static policies: Map<string, PolicyTemplate> = new Map([
    ['development', DEVELOPMENT_POLICY],
    ['staging', STAGING_POLICY],
    ['production', PRODUCTION_POLICY],
    ['enterprise', ENTERPRISE_POLICY],
    ['opensource', OPEN_SOURCE_POLICY]
  ]);

  /**
   * Get policy template by name
   */
  static getPolicy(name: string): PolicyTemplate | null {
    return this.policies.get(name) || null;
  }

  /**
   * Get all available policies
   */
  static getAllPolicies(): PolicyTemplate[] {
    return Array.from(this.policies.values());
  }

  /**
   * Create version manager config from policy template
   */
  static createConfig(policyName: string): VersionManagerConfig | null {
    const policy = this.getPolicy(policyName);
    if (!policy) return null;

    return {
      policy: policy.policy,
      migrationTemplates: policy.migrationTemplates,
      automationScripts: policy.automationScripts,
      compatibilityRules: policy.compatibilityRules
    };
  }

  /**
   * Create custom policy by merging existing policies
   */
  static createCustomPolicy(
    basePolicyName: string,
    overrides: Partial<VersioningPolicy>
  ): PolicyTemplate | null {
    const basePolicy = this.getPolicy(basePolicyName);
    if (!basePolicy) return null;

    return {
      ...basePolicy,
      name: `Custom (${basePolicy.name})`,
      description: `Custom policy based on ${basePolicy.name}`,
      policy: {
        ...basePolicy.policy,
        ...overrides
      }
    };
  }

  /**
   * Validate policy configuration
   */
  static validatePolicy(policy: VersioningPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (policy.maxMajorVersionJump < 1) {
      errors.push('Maximum major version jump must be at least 1');
    }

    if (policy.deprecationPeriod < 1) {
      errors.push('Deprecation period must be at least 1 day');
    }

    if (policy.backwardCompatibilityWindow < 1) {
      errors.push('Backward compatibility window must be at least 1 version');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended policy for environment type
   */
  static getRecommendedPolicy(environmentType: 'dev' | 'test' | 'staging' | 'prod' | 'enterprise'): string {
    const recommendations = {
      'dev': 'development',
      'test': 'development',
      'staging': 'staging', 
      'prod': 'production',
      'enterprise': 'enterprise'
    };

    return recommendations[environmentType] || 'production';
  }
}

export default {
  DEVELOPMENT_POLICY,
  STAGING_POLICY,
  PRODUCTION_POLICY,
  ENTERPRISE_POLICY,
  OPEN_SOURCE_POLICY,
  PolicyManager
};