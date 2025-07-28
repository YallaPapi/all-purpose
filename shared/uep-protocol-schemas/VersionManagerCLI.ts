/**
 * UEP Protocol Version Manager - Command Line Interface
 * 
 * Provides command-line tools for managing protocol versions, analyzing compatibility,
 * generating migration plans, and enforcing versioning policies.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ProtocolVersionManager, VersionManagerConfig, MigrationPlan } from './ProtocolVersionManager';
import { ProtocolSchemaRepository, ProtocolDefinition } from './ProtocolSchemaRepository';
import { PolicyManager } from './VersioningPolicies';

export interface VersionCLIOptions {
  command?: string;
  protocol?: string;
  version?: string;
  fromVersion?: string;
  toVersion?: string;
  policy?: string;
  input?: string;
  output?: string;
  format?: 'json' | 'yaml' | 'markdown';
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  help?: boolean;
}

export class VersionManagerCLI {
  private versionManager: ProtocolVersionManager;
  private repository: ProtocolSchemaRepository;

  constructor(repositoryPath?: string, policyName?: string) {
    // Initialize repository
    this.repository = new ProtocolSchemaRepository({
      basePath: repositoryPath || './uep-protocol-schemas',
      gitEnabled: false,
      validationEnabled: true,
      autoVersioning: false,
      backupEnabled: false,
      compressionEnabled: false,
      cachingEnabled: false,
      indexingEnabled: false
    });

    // Initialize version manager with policy
    const policy = policyName || 'production';
    const config = PolicyManager.createConfig(policy);
    
    if (!config) {
      throw new Error(`Unknown versioning policy: ${policy}`);
    }

    this.versionManager = new ProtocolVersionManager(config);
  }

  /**
   * Main CLI entry point
   */
  async run(args: string[]): Promise<number> {
    try {
      const options = this.parseArgs(args);

      if (options.help || !options.command) {
        this.showHelp();
        return 0;
      }

      if (options.verbose) {
        console.log('UEP Protocol Version Manager CLI v1.0.0');
        console.log('Options:', options);
      }

      switch (options.command) {
        case 'register':
          return await this.registerVersion(options);
        case 'compare':
          return await this.compareVersions(options);
        case 'compatibility':
          return await this.checkCompatibility(options);
        case 'migrate':
          return await this.generateMigration(options);
        case 'history':
          return await this.showHistory(options);
        case 'next':
          return await this.suggestNextVersion(options);
        case 'validate':
          return await this.validateVersion(options);
        case 'policies':
          return await this.listPolicies(options);
        default:
          console.error(`Unknown command: ${options.command}`);
          this.showHelp();
          return 1;
      }

    } catch (error) {
      console.error('Error:', error.message);
      if (error.stack && options?.verbose) {
        console.error(error.stack);
      }
      return 1;
    }
  }

  /**
   * Register a new protocol version
   */
  private async registerVersion(options: VersionCLIOptions): Promise<number> {
    if (!options.input) {
      console.error('Protocol definition file is required (--input)');
      return 1;
    }

    if (!existsSync(options.input)) {
      console.error(`Protocol file not found: ${options.input}`);
      return 1;
    }

    try {
      const content = readFileSync(options.input, 'utf-8');
      const protocol: ProtocolDefinition = JSON.parse(content);

      if (options.verbose) {
        console.log(`Registering version ${protocol.version} for protocol ${protocol.id}`);
      }

      if (options.dryRun) {
        console.log('DRY RUN: Would register version but making no changes');
        return 0;
      }

      await this.versionManager.registerVersion(protocol);

      console.log(`✅ Successfully registered version ${protocol.version} for protocol ${protocol.id}`);
      return 0;

    } catch (error) {
      console.error(`Failed to register version: ${error.message}`);
      return 1;
    }
  }

  /**
   * Compare two protocol versions
   */
  private async compareVersions(options: VersionCLIOptions): Promise<number> {
    if (!options.protocol) {
      console.error('Protocol ID is required (--protocol)');
      return 1;
    }

    if (!options.fromVersion || !options.toVersion) {
      console.error('Both --from-version and --to-version are required');
      return 1;
    }

    try {
      const comparison = this.versionManager.compareVersions(options.fromVersion, options.toVersion);
      
      console.log(`Comparing versions: ${options.fromVersion} vs ${options.toVersion}`);
      
      if (comparison < 0) {
        console.log(`${options.fromVersion} is older than ${options.toVersion}`);
      } else if (comparison > 0) {
        console.log(`${options.fromVersion} is newer than ${options.toVersion}`);
      } else {
        console.log('Versions are identical');
      }

      return 0;

    } catch (error) {
      console.error(`Version comparison failed: ${error.message}`);
      return 1;
    }
  }

  /**
   * Check compatibility between versions
   */
  private async checkCompatibility(options: VersionCLIOptions): Promise<number> {
    if (!options.protocol) {
      console.error('Protocol ID is required (--protocol)');
      return 1;
    }

    try {
      const history = this.versionManager.getVersionHistory(options.protocol);
      
      if (history.length < 2) {
        console.log('Not enough versions to check compatibility');
        return 0;
      }

      const fromVersion = options.fromVersion || history[history.length - 2].version;
      const toVersion = options.toVersion || history[history.length - 1].version;

      const compatibility = this.versionManager.getCompatibilityInfo(options.protocol, toVersion);
      
      if (!compatibility) {
        console.error(`No compatibility information found for version ${toVersion}`);
        return 1;
      }

      console.log(`Compatibility Analysis: ${options.protocol} v${fromVersion} → v${toVersion}`);
      console.log('');

      if (compatibility.breakingChanges.length > 0) {
        console.log('🚨 Breaking Changes:');
        for (const change of compatibility.breakingChanges) {
          console.log(`  - ${change.type}: ${change.description}`);
          console.log(`    Path: ${change.path}`);
          if (change.mitigation) {
            console.log(`    Mitigation: ${change.mitigation}`);
          }
        }
        console.log('');
      }

      if (compatibility.deprecations.length > 0) {
        console.log('⚠️  Deprecations:');
        for (const deprecation of compatibility.deprecations) {
          console.log(`  - ${deprecation.feature}: ${deprecation.reason}`);
          console.log(`    Path: ${deprecation.path}`);
          if (deprecation.replacement) {
            console.log(`    Replacement: ${deprecation.replacement}`);
          }
        }
        console.log('');
      }

      console.log(`Migration Required: ${compatibility.migrationRequired ? 'Yes' : 'No'}`);
      console.log(`Migration Complexity: ${compatibility.migrationComplexity}`);

      return compatibility.migrationRequired ? 1 : 0;

    } catch (error) {
      console.error(`Compatibility check failed: ${error.message}`);
      return 1;
    }
  }

  /**
   * Generate migration plan
   */
  private async generateMigration(options: VersionCLIOptions): Promise<number> {
    if (!options.protocol) {
      console.error('Protocol ID is required (--protocol)');
      return 1;
    }

    if (!options.fromVersion || !options.toVersion) {
      console.error('Both --from-version and --to-version are required');
      return 1;
    }

    try {
      const migrationPlan = this.versionManager.getMigrationPlan(
        options.protocol,
        options.fromVersion,
        options.toVersion
      );

      if (!migrationPlan) {
        console.error(`No migration plan found for ${options.fromVersion} → ${options.toVersion}`);
        return 1;
      }

      await this.outputMigrationPlan(migrationPlan, options);
      return 0;

    } catch (error) {
      console.error(`Migration plan generation failed: ${error.message}`);
      return 1;
    }
  }

  /**
   * Show version history
   */
  private async showHistory(options: VersionCLIOptions): Promise<number> {
    if (!options.protocol) {
      console.error('Protocol ID is required (--protocol)');
      return 1;
    }

    try {
      const history = this.versionManager.getVersionHistory(options.protocol);

      if (history.length === 0) {
        console.log(`No version history found for protocol: ${options.protocol}`);
        return 0;
      }

      console.log(`Version History: ${options.protocol}`);
      console.log('');

      for (const protocol of history.reverse()) {
        console.log(`Version ${protocol.version} (${protocol.metadata.status})`);
        console.log(`  Released: ${protocol.metadata.createdAt.toISOString().split('T')[0]}`);
        console.log(`  Author: ${protocol.metadata.author}`);
        
        if (protocol.lifecycle.changeLog.length > 0) {
          const latestChange = protocol.lifecycle.changeLog[protocol.lifecycle.changeLog.length - 1];
          console.log(`  Changes: ${latestChange.changes.slice(0, 2).join(', ')}`);
        }
        
        console.log('');
      }

      return 0;

    } catch (error) {
      console.error(`Failed to show history: ${error.message}`);
      return 1;
    }
  }

  /**
   * Suggest next version
   */
  private async suggestNextVersion(options: VersionCLIOptions): Promise<number> {
    if (!options.protocol) {
      console.error('Protocol ID is required (--protocol)');
      return 1;
    }

    try {
      const history = this.versionManager.getVersionHistory(options.protocol);
      
      if (history.length === 0) {
        console.log('Suggested first version: 1.0.0');
        return 0;
      }

      const latestVersion = this.versionManager.getLatestVersion(history);
      if (!latestVersion) {
        console.log('Suggested first version: 1.0.0');
        return 0;
      }

      const current = latestVersion.version;
      
      console.log(`Current version: ${current}`);
      console.log('');
      console.log('Suggested next versions:');
      console.log(`  Patch (bug fixes): ${this.versionManager.getNextVersion(current, 'patch')}`);
      console.log(`  Minor (new features): ${this.versionManager.getNextVersion(current, 'minor')}`);
      console.log(`  Major (breaking changes): ${this.versionManager.getNextVersion(current, 'major')}`);

      return 0;

    } catch (error) {
      console.error(`Failed to suggest next version: ${error.message}`);
      return 1;
    }
  }

  /**
   * Validate version format and progression  
   */
  private async validateVersion(options: VersionCLIOptions): Promise<number> {
    if (!options.version) {
      console.error('Version is required (--version)');
      return 1;
    }

    try {
      // Validate format
      const parsed = this.versionManager.parseVersion(options.version);
      console.log(`✅ Version format is valid: ${options.version}`);
      console.log(`  Major: ${parsed.major}`);
      console.log(`  Minor: ${parsed.minor}`);
      console.log(`  Patch: ${parsed.patch}`);
      
      if (parsed.prerelease) {
        console.log(`  Prerelease: ${parsed.prerelease}`);
      }
      
      if (parsed.build) {
        console.log(`  Build: ${parsed.build}`);
      }

      return 0;

    } catch (error) {
      console.error(`❌ Invalid version format: ${error.message}`);
      return 1;
    }
  }

  /**
   * List available versioning policies
   */
  private async listPolicies(options: VersionCLIOptions): Promise<number> {
    const policies = PolicyManager.getAllPolicies();

    console.log('Available Versioning Policies:');
    console.log('');

    for (const policy of policies) {
      console.log(`${policy.name}`);
      console.log(`  Description: ${policy.description}`);
      console.log(`  Use Case: ${policy.useCase}`);
      console.log(`  Allows Prerelease: ${policy.policy.allowPrerelease ? 'Yes' : 'No'}`);
      console.log(`  Requires Migration Plan: ${policy.policy.requireMigrationPlan ? 'Yes' : 'No'}`);
      console.log(`  Deprecation Period: ${policy.policy.deprecationPeriod} days`);
      console.log('');
    }

    return 0;
  }

  /**
   * Output migration plan in specified format
   */
  private async outputMigrationPlan(plan: MigrationPlan, options: VersionCLIOptions): Promise<void> {
    const format = options.format || 'markdown';

    let output: string;

    switch (format) {
      case 'json':
        output = JSON.stringify(plan, null, 2);
        break;
      case 'yaml':
        output = this.convertToYAML(plan);
        break;
      case 'markdown':
      default:
        output = this.convertToMarkdown(plan);
        break;
    }

    if (options.output) {
      writeFileSync(options.output, output, 'utf-8');
      console.log(`Migration plan written to: ${options.output}`);
    } else {
      console.log(output);
    }
  }

  /**
   * Convert migration plan to markdown
   */
  private convertToMarkdown(plan: MigrationPlan): string {
    return `# Migration Plan: ${plan.fromVersion} → ${plan.toVersion}

## Overview
- **Complexity**: ${plan.complexity}
- **Automated**: ${plan.automated ? 'Yes' : 'No'}
- **Estimated Time**: ${plan.estimatedTime} hours

## Prerequisites
${plan.prerequisites.map(p => `- ${p}`).join('\n')}

## Migration Steps
${plan.steps.map((step, index) => `
### ${index + 1}. ${step.title}
- **Type**: ${step.type}
- **Automated**: ${step.automated ? 'Yes' : 'No'}
- **Critical**: ${step.critical ? 'Yes' : 'No'}

${step.description}

**Action**: ${step.action}
${step.script ? `**Script**: \`${step.script}\`` : ''}
${step.validation ? `**Validation**: \`${step.validation}\`` : ''}
${step.rollback ? `**Rollback**: \`${step.rollback}\`` : ''}
`).join('\n')}

## Rollback Plan
${plan.rollbackPlan.map((step, index) => `
${index + 1}. **${step.action}**
   - Script: \`${step.script || 'Manual'}\`
   - Verification: \`${step.verification}\`
`).join('\n')}

## Validation Steps
${plan.validation.map((step, index) => `
${index + 1}. **${step.description}** (${step.type})
   - Critical: ${step.critical ? 'Yes' : 'No'}
   - Expected: ${step.expectedResult}
   ${step.testScript ? `- Test Script: \`${step.testScript}\`` : ''}
`).join('\n')}
`;
  }

  /**
   * Convert migration plan to YAML (simplified)
   */
  private convertToYAML(plan: MigrationPlan): string {
    // Simplified YAML conversion - in production would use a proper YAML library
    return `migration_plan:
  from_version: "${plan.fromVersion}"
  to_version: "${plan.toVersion}"
  complexity: "${plan.complexity}"
  automated: ${plan.automated}
  estimated_time: ${plan.estimatedTime}
  
prerequisites:
${plan.prerequisites.map(p => `  - "${p}"`).join('\n')}

steps:
${plan.steps.map(step => `  - id: "${step.id}"
    title: "${step.title}"
    type: "${step.type}"
    automated: ${step.automated}
    critical: ${step.critical}
    description: "${step.description}"
    action: "${step.action}"`).join('\n')}
`;
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[]): VersionCLIOptions {
    const options: VersionCLIOptions = {};

    if (args.length > 0) {
      options.command = args[0];
    }

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--protocol':
        case '-p':
          options.protocol = nextArg;
          i++;
          break;
        case '--version':
        case '-v':
          options.version = nextArg;
          i++;
          break;
        case '--from-version':
          options.fromVersion = nextArg;
          i++;
          break;
        case '--to-version':
          options.toVersion = nextArg;
          i++;
          break;
        case '--policy':
          options.policy = nextArg;
          i++;
          break;
        case '--input':
        case '-i':
          options.input = nextArg;
          i++;
          break;
        case '--output':
        case '-o':
          options.output = nextArg;
          i++;
          break;
        case '--format':
        case '-f':
          if (['json', 'yaml', 'markdown'].includes(nextArg)) {
            options.format = nextArg as any;
            i++;
          }
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--force':
          options.force = true;
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  private showHelp(): void {
    console.log(`
UEP Protocol Version Manager CLI v1.0.0

USAGE:
  uep-version-manager <command> [OPTIONS]

COMMANDS:
  register              Register a new protocol version
  compare               Compare two protocol versions
  compatibility         Check compatibility between versions
  migrate               Generate migration plan
  history               Show version history
  next                  Suggest next version number
  validate              Validate version format
  policies              List available versioning policies

OPTIONS:
  -p, --protocol <id>          Protocol ID
  -v, --version <version>      Version number
  --from-version <version>     Source version for comparison/migration
  --to-version <version>       Target version for comparison/migration
  --policy <name>              Versioning policy (development, staging, production, enterprise, opensource)
  -i, --input <file>           Input protocol definition file
  -o, --output <file>          Output file for generated content
  -f, --format <format>        Output format: json|yaml|markdown (default: markdown)
  --verbose                    Enable verbose output
  --dry-run                    Show what would be done without making changes
  --force                      Force operation even with warnings
  -h, --help                   Show this help message

EXAMPLES:
  # Register new protocol version
  uep-version-manager register -i protocol-v2.json --policy production

  # Compare versions
  uep-version-manager compare -p my-protocol --from-version 1.0.0 --to-version 2.0.0

  # Check compatibility
  uep-version-manager compatibility -p my-protocol --from-version 1.0.0 --to-version 1.1.0

  # Generate migration plan
  uep-version-manager migrate -p my-protocol --from-version 1.0.0 --to-version 2.0.0 -o migration.md

  # Show version history
  uep-version-manager history -p my-protocol

  # Suggest next version
  uep-version-manager next -p my-protocol

  # Validate version format
  uep-version-manager validate --version 2.1.0-beta.1

  # List versioning policies
  uep-version-manager policies

VERSIONING POLICIES:
  development    - Flexible for rapid iteration
  staging        - Balanced for testing environments
  production     - Strict for production stability  
  enterprise     - Maximum control and governance
  opensource     - Community-focused with transparency

MORE INFO:
  Documentation: https://docs.uep.local/version-manager
  Repository: https://github.com/uep/protocol-schemas
`);
  }
}

/**
 * CLI entry point for direct execution
 */
export async function main(): Promise<void> {
  const repositoryPath = process.env.UEP_REPOSITORY_PATH;
  const policy = process.env.UEP_VERSIONING_POLICY || 'production';
  
  const cli = new VersionManagerCLI(repositoryPath, policy);
  const exitCode = await cli.run(process.argv.slice(2));
  process.exit(exitCode);
}

// Allow direct execution
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}