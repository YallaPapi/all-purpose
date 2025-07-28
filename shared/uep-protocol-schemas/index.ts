/**
 * UEP Protocol Schema Repository
 * 
 * Main entry point for the UEP Protocol Schema Repository system.
 * Provides Git-based protocol definition storage, versioning, and validation.
 */

export {
  ProtocolSchemaRepository,
  type ProtocolDefinition,
  type OpenAPI31Protocol,
  type AsyncAPI26Protocol,
  type UEPProtocolMetadata,
  type ProtocolMetadata,
  type CompatibilityRequirements,
  type MigrationGuide,
  type MigrationStep,
  type ProtocolLifecycle,
  type ChangeLogEntry,
  type RepositoryConfig,
  type ProtocolValidationResult,
  type ValidationError,
  type ValidationWarning,
  type ValidationSuggestion
} from './ProtocolSchemaRepository';

export { ProtocolTemplateEngine } from './ProtocolTemplateEngine';
export { ProtocolVersionManager } from './ProtocolVersionManager';
export { ProtocolValidator } from './ProtocolValidator';
export { GitRepositoryManager } from './GitRepositoryManager';

/**
 * Default configuration for the Protocol Schema Repository
 */
export const DEFAULT_REPOSITORY_CONFIG: RepositoryConfig = {
  basePath: './uep-protocol-schemas',
  gitEnabled: true,
  validationEnabled: true,
  autoVersioning: true,
  backupEnabled: true,
  compressionEnabled: false,
  cachingEnabled: true,
  indexingEnabled: true
};

/**
 * Create a new Protocol Schema Repository instance with default configuration
 */
export function createProtocolRepository(config?: Partial<RepositoryConfig>): ProtocolSchemaRepository {
  const finalConfig = { ...DEFAULT_REPOSITORY_CONFIG, ...config };
  return new ProtocolSchemaRepository(finalConfig);
}

/**
 * Utility functions for protocol management
 */
export const ProtocolUtils = {
  /**
   * Validate semantic version format
   */
  isValidSemanticVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  },

  /**
   * Compare two semantic versions
   */
  compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  },

  /**
   * Increment semantic version
   */
  incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const parts = version.split('.').map(Number);
    
    switch (type) {
      case 'major':
        return `${parts[0] + 1}.0.0`;
      case 'minor':
        return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch':
        return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      default:
        return version;
    }
  },

  /**
   * Generate protocol ID from name and type
   */
  generateProtocolId(name: string, type: 'meta-agent' | 'domain-agent' | 'core-protocol'): string {
    const cleanName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${type}-${cleanName}`;
  },

  /**
   * Extract capability name from protocol ID
   */
  extractCapabilityFromId(id: string): string {
    const parts = id.split('-');
    return parts.slice(2).join('-'); // Remove 'meta-agent' or 'domain-agent' prefix
  },

  /**
   * Validate protocol definition structure
   */
  validateProtocolStructure(protocol: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!protocol.id) errors.push('Missing required field: id');
    if (!protocol.name) errors.push('Missing required field: name');
    if (!protocol.version) errors.push('Missing required field: version');
    if (!protocol.category) errors.push('Missing required field: category');
    if (!protocol.specification) errors.push('Missing required field: specification');
    if (!protocol.metadata) errors.push('Missing required field: metadata');

    if (protocol.version && !this.isValidSemanticVersion(protocol.version)) {
      errors.push('Invalid semantic version format');
    }

    if (protocol.category && !['meta-agent', 'domain-agent', 'core-protocol'].includes(protocol.category)) {
      errors.push('Invalid category - must be meta-agent, domain-agent, or core-protocol');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};

/**
 * Protocol specification constants
 */
export const PROTOCOL_CONSTANTS = {
  SUPPORTED_OPENAPI_VERSIONS: ['3.1.0'],
  SUPPORTED_ASYNCAPI_VERSIONS: ['2.6.0'],
  SUPPORTED_CATEGORIES: ['meta-agent', 'domain-agent', 'core-protocol'],
  SUPPORTED_COMPLEXITIES: ['low', 'medium', 'high'],
  SUPPORTED_INTERACTION_PATTERNS: ['request-reply', 'publish-subscribe', 'streaming', 'batch'],
  SUPPORTED_LIFECYCLE_PHASES: ['development', 'testing', 'staging', 'production', 'deprecated'],
  SUPPORTED_STABILITY_LEVELS: ['alpha', 'beta', 'stable']
};

console.log('UEP Protocol Schema Repository: Module loaded successfully');