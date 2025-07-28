# UEP Protocol Versioning System

This directory contains the comprehensive versioning system for UEP protocols, implementing semantic versioning, compatibility tracking, and automated migration planning.

## Overview

The UEP Protocol Versioning System provides:

- **Semantic Versioning** - Full support for major.minor.patch versioning with prerelease and build metadata
- **Compatibility Analysis** - Automated detection of breaking changes and compatibility issues
- **Migration Planning** - Generated migration plans with step-by-step instructions and rollback procedures
- **Policy Enforcement** - Configurable policies for different environments (development, staging, production, enterprise, open source)
- **Version Constraints** - Support for version ranges and dependency resolution
- **CLI Tools** - Command-line interface for all version management operations

## Components

### Core System
- `ProtocolVersionManager.ts` - Main version management engine
- `VersioningPolicies.ts` - Predefined policy templates for different environments
- `VersionManagerCLI.ts` - Command-line interface for version operations

### Key Features

#### 1. Semantic Versioning
```typescript
// Parse and compare versions
const version = versionManager.parseVersion('2.1.0-beta.3');
const comparison = versionManager.compareVersions('1.0.0', '2.0.0'); // -1

// Generate next versions
const nextPatch = versionManager.getNextVersion('1.0.0', 'patch');    // 1.0.1
const nextMinor = versionManager.getNextVersion('1.0.0', 'minor');    // 1.1.0
const nextMajor = versionManager.getNextVersion('1.0.0', 'major');    // 2.0.0
```

#### 2. Version Constraints and Ranges
```typescript
// Check if version satisfies constraint
const satisfies = versionManager.satisfiesConstraint('1.2.3', {
  operator: '^',
  version: '1.0.0'
}); // true (compatible within major version)

// Resolve version ranges
const availableVersions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
const matches = versionManager.resolveVersionRange(availableVersions, {
  constraints: [{ operator: '~', version: '1.1.0' }]
}); // ['1.1.0']
```

#### 3. Compatibility Analysis
```typescript
// Analyze compatibility between versions
const compatibility = await versionManager.analyzeCompatibility(oldProtocol, newProtocol);

console.log(compatibility.compatible);     // false
console.log(compatibility.issues);        // Array of compatibility issues
console.log(compatibility.suggestions);   // Recommended fixes
```

#### 4. Migration Planning
```typescript
// Generate migration plan
const migrationPlan = await versionManager.generateMigrationPlan(oldProtocol, newProtocol);

console.log(migrationPlan.complexity);    // 'simple' | 'moderate' | 'complex'
console.log(migrationPlan.automated);     // true if fully automated
console.log(migrationPlan.steps);         // Array of migration steps
console.log(migrationPlan.rollbackPlan);  // Rollback procedures
```

## Versioning Policies

The system includes predefined policies for different environments:

### Development Policy
- **Purpose**: Rapid iteration and experimentation
- **Characteristics**:
  - Allows prerelease versions
  - No migration plan requirement
  - Flexible version jumps (up to 5 major versions)
  - Short deprecation period (7 days)
  - Automatic patch/minor updates enabled

### Staging Policy  
- **Purpose**: Controlled testing and validation
- **Characteristics**:
  - Requires migration plans for changes
  - Moderate version jump limits (2 major versions)
  - 2-week deprecation period
  - Semantic versioning enforced
  - Breaking change detection enabled

### Production Policy
- **Purpose**: Stability and reliability
- **Characteristics**:
  - No prerelease versions allowed
  - Strict migration plan requirements
  - Limited version jumps (1 major version)
  - 3-month deprecation period
  - No automatic updates
  - Comprehensive breaking change prevention

### Enterprise Policy
- **Purpose**: Maximum governance and compliance
- **Characteristics**:
  - Full audit trail requirements
  - 6-month deprecation period
  - Extensive backward compatibility (10 versions)
  - Governance compliance checks
  - Approval workflow integration

### Open Source Policy
- **Purpose**: Community-focused development
- **Characteristics**:
  - Community impact assessment
  - Documentation completeness checks
  - 2-month deprecation period
  - Migration examples and guides
  - Community notification automation

## CLI Usage

### Register New Version
```bash
# Register a new protocol version
uep-version-manager register -i protocol-v2.json --policy production

# Dry run to see what would happen
uep-version-manager register -i protocol-v2.json --dry-run
```

### Version Comparison
```bash
# Compare two versions
uep-version-manager compare -p my-protocol --from-version 1.0.0 --to-version 2.0.0

# Check compatibility
uep-version-manager compatibility -p my-protocol --from-version 1.0.0 --to-version 1.1.0
```

### Migration Planning
```bash
# Generate migration plan in markdown
uep-version-manager migrate -p my-protocol --from-version 1.0.0 --to-version 2.0.0 -o migration.md

# Generate in JSON format
uep-version-manager migrate -p my-protocol --from-version 1.0.0 --to-version 2.0.0 -f json -o migration.json
```

### Version History
```bash
# Show version history
uep-version-manager history -p my-protocol

# Suggest next version
uep-version-manager next -p my-protocol

# Validate version format
uep-version-manager validate --version 2.1.0-beta.1
```

### Policy Management
```bash
# List available policies
uep-version-manager policies

# Use specific policy
uep-version-manager register -i protocol.json --policy enterprise
```

## Integration Examples

### With Repository System
```typescript
import { ProtocolSchemaRepository } from './ProtocolSchemaRepository';
import { ProtocolVersionManager } from './ProtocolVersionManager';
import { PolicyManager } from './VersioningPolicies';

// Initialize with production policy
const config = PolicyManager.createConfig('production');
const versionManager = new ProtocolVersionManager(config);
const repository = new ProtocolSchemaRepository(repositoryConfig);

// Register new version with automatic compatibility checking
const protocol = await repository.getProtocol('my-protocol');
await versionManager.registerVersion(protocol);
```

### With Validation System
```typescript
import { UEPValidationMiddleware } from '@uep/validation';

// Validate version compatibility in middleware
app.use((req, res, next) => {
  const requestVersion = req.headers['x-protocol-version'];
  const compatibility = versionManager.validateCompatibility(requestVersion);
  
  if (!compatibility.compatible) {
    return res.status(400).json({
      error: 'Version incompatible',
      message: compatibility.message
    });
  }
  
  next();
});
```

## Migration Plan Structure

Generated migration plans include:

### Migration Steps
```typescript
interface MigrationStep {
  id: string;
  type: 'code-change' | 'configuration-change' | 'data-migration' | 'deployment-change';
  title: string;
  description: string;
  action: string;
  automated: boolean;
  script?: string;        // Automation script
  validation?: string;    // Validation script
  rollback?: string;      // Rollback script
  critical: boolean;      // Whether step is critical for success
}
```

### Rollback Procedures
```typescript
interface RollbackStep {
  stepId: string;         // References migration step
  action: string;         // Rollback action description
  script?: string;        // Rollback automation script
  verification: string;   // Verification script
}
```

### Validation Steps
```typescript
interface ValidationStep {
  type: 'functionality' | 'performance' | 'compatibility' | 'security';
  description: string;
  testScript?: string;    // Test automation script
  expectedResult: string; // Expected outcome
  critical: boolean;      // Whether validation is critical
}
```

## Best Practices

### Version Management
1. **Use semantic versioning** consistently across all protocols
2. **Plan breaking changes** carefully with proper deprecation periods
3. **Generate migration plans** for all non-trivial version changes
4. **Test migrations** thoroughly in staging environments
5. **Maintain backward compatibility** within policy windows

### Policy Selection
- **Development**: Use for experimentation and rapid prototyping
- **Staging**: Use for integration testing and validation
- **Production**: Use for stable, customer-facing services
- **Enterprise**: Use for regulated or mission-critical systems
- **Open Source**: Use for community-driven projects

### Automation Integration
1. **CI/CD Integration**: Automate version validation in build pipelines
2. **Approval Workflows**: Integrate with existing approval processes
3. **Notification Systems**: Alert stakeholders of breaking changes
4. **Monitoring**: Track version adoption and migration success rates

## Environment Variables

```bash
# Repository configuration
export UEP_REPOSITORY_PATH="./uep-protocol-schemas"
export UEP_VERSIONING_POLICY="production"

# CLI configuration
export UEP_VERSION_MANAGER_VERBOSE="true"
export UEP_VERSION_MANAGER_DRY_RUN="false"
```

## Troubleshooting

### Common Issues

**Version Parsing Errors**
- Ensure versions follow semantic versioning format (x.y.z)
- Check for invalid characters in prerelease/build metadata

**Compatibility Check Failures**
- Review breaking changes in compatibility analysis
- Consider using migration plans for complex changes
- Check if policy allows the type of change being made

**Migration Plan Generation Failures**
- Ensure both old and new protocol definitions are valid
- Check that required metadata is present in protocols
- Verify policy allows the requested version progression

**Policy Violations**
- Review policy requirements for current environment
- Consider using a more flexible policy for development
- Ensure proper approval workflows for strict policies

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
uep-version-manager --verbose <command> [options]
```

## Support

For issues with the versioning system:

1. Check version format compliance with semantic versioning
2. Verify policy requirements match your use case
3. Review migration plan steps for manual intervention needs
4. Check compatibility analysis for breaking changes

For more information, see the main [Protocol Schema Repository documentation](../README.md).