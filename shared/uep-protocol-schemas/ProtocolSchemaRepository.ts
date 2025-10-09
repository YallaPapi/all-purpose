/**
 * UEP Protocol Schema Repository - Git-Based Protocol Definition Storage
 * 
 * Provides a comprehensive system for storing, versioning, and managing UEP protocol 
 * definitions with Git-based version control, semantic versioning, and validation.
 * This system serves as the foundation for all UEP agent interface definitions.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { EventEmitter } from 'events';

export interface ProtocolDefinition {
  id: string;
  name: string;
  version: string;
  category: 'meta-agent' | 'domain-agent' | 'core-protocol';
  description: string;
  specification: OpenAPI31Protocol | AsyncAPI26Protocol;
  metadata: ProtocolMetadata;
  compatibility: CompatibilityRequirements;
  lifecycle: ProtocolLifecycle;
}

export interface OpenAPI31Protocol {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name: string;
      email: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  'x-uep-capability': string;
  'x-uep-version': string;
  'x-uep-metadata': UEPProtocolMetadata;
}

export interface AsyncAPI26Protocol {
  asyncapi: '2.6.0';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Record<string, any>;
  channels: Record<string, any>;
  components?: {
    messages?: Record<string, any>;
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
  };
  'x-uep-capability': string;
  'x-uep-version': string;
  'x-uep-metadata': UEPProtocolMetadata;
}

export interface UEPProtocolMetadata {
  agentType: 'meta' | 'domain' | 'core';
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  tags: string[];
  capabilities: string[];
  interactionPatterns: ('request-reply' | 'publish-subscribe' | 'streaming' | 'batch')[];
  securityRequirements: string[];
}

export interface ProtocolMetadata {
  author: string;
  createdAt: Date;
  updatedAt: Date;
  maintainers: string[];
  status: 'draft' | 'review' | 'approved' | 'deprecated';
  breaking: boolean;
  experimental: boolean;
  stability: 'alpha' | 'beta' | 'stable';
}

export interface CompatibilityRequirements {
  minVersion: string;
  maxVersion?: string;
  breakingChanges: string[];
  deprecations: string[];
  migrations: MigrationGuide[];
}

export interface MigrationGuide {
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  automated: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface MigrationStep {
  type: 'schema-change' | 'endpoint-change' | 'behavior-change' | 'data-migration';
  description: string;
  action: string;
  required: boolean;
  automation?: {
    script: string;
    validation: string;
  };
}

export interface ProtocolLifecycle {
  phase: 'development' | 'testing' | 'staging' | 'production' | 'deprecated';
  supportedUntil?: Date;
  replacedBy?: string;
  changeLog: ChangeLogEntry[];
}

export interface ChangeLogEntry {
  version: string;
  date: Date;
  type: 'major' | 'minor' | 'patch';
  changes: string[];
  author: string;
  breaking: boolean;
}

export interface RepositoryConfig {
  basePath: string;
  gitEnabled: boolean;
  validationEnabled: boolean;
  autoVersioning: boolean;
  backupEnabled: boolean;
  compressionEnabled: boolean;
  cachingEnabled: boolean;
  indexingEnabled: boolean;
}

export interface ProtocolValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  metadata: {
    validationTime: number;
    validator: string;
    schemaVersion: string;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning' | 'info';
  fixable: boolean;
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface ValidationSuggestion {
  type: 'improvement' | 'optimization' | 'best-practice';
  message: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Git-Based Protocol Schema Repository
 */
export class ProtocolSchemaRepository extends EventEmitter {
  private config: RepositoryConfig;
  private protocolCache: Map<string, ProtocolDefinition> = new Map();
  private versionIndex: Map<string, string[]> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();

  constructor(config: RepositoryConfig) {
    super();
    this.config = config;
    this.initializeRepository();
  }

  /**
   * Initialize the repository structure
   */
  private initializeRepository(): void {
    const requiredDirs = [
      'schemas/meta-agents',
      'schemas/domain-agents',
      'schemas/core-protocols', 
      'templates',
      'versions',
      'validation',
      'examples',
      'migrations',
      'docs'
    ];

    for (const dir of requiredDirs) {
      const fullPath = join(this.config.basePath, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }

    this.createRepositoryMetadata();
    this.loadExistingProtocols();
    this.buildVersionIndex();
    this.analyzeDependencies();

    if (this.config.gitEnabled) {
      this.initializeGitRepository();
    }

    console.log('UEP Protocol Schema Repository initialized');
  }

  /**
   * Register a new protocol definition
   */
  async registerProtocol(protocol: ProtocolDefinition): Promise<void> {
    // Validate protocol definition
    const validation = await this.validateProtocol(protocol);
    if (!validation.valid) {
      throw new Error(`Protocol validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for version conflicts
    await this.checkVersionConflicts(protocol);

    // Store protocol
    const filePath = this.getProtocolPath(protocol);
    this.ensureDirectoryExists(dirname(filePath));
    
    writeFileSync(filePath, JSON.stringify(protocol, null, 2), 'utf-8');

    // Update cache and indexes
    this.protocolCache.set(protocol.id, protocol);
    this.updateVersionIndex(protocol);
    this.updateDependencyGraph(protocol);

    // Git commit if enabled
    if (this.config.gitEnabled) {
      await this.commitProtocolChange(protocol, 'register');
    }

    this.emit('protocol-registered', protocol);
    console.log(`Protocol registered: ${protocol.id} v${protocol.version}`);
  }

  /**
   * Retrieve protocol by ID and version
   */
  async getProtocol(id: string, version?: string): Promise<ProtocolDefinition | null> {
    const cacheKey = version ? `${id}@${version}` : id;
    
    // Check cache first
    if (this.protocolCache.has(cacheKey)) {
      return this.protocolCache.get(cacheKey)!;
    }

    // Determine version to load
    const targetVersion = version || await this.getLatestVersion(id);
    if (!targetVersion) {
      return null;
    }

    // Load from file system
    const protocol = await this.loadProtocolFromFile(id, targetVersion);
    if (protocol) {
      this.protocolCache.set(cacheKey, protocol);
    }

    return protocol;
  }

  /**
   * Update existing protocol
   */
  async updateProtocol(
    id: string,
    updates: Partial<ProtocolDefinition>,
    options?: {
      incrementVersion?: boolean;
      createBackup?: boolean;
      validateCompatibility?: boolean;
    }
  ): Promise<void> {
    const existingProtocol = await this.getProtocol(id);
    if (!existingProtocol) {
      throw new Error(`Protocol not found: ${id}`);
    }

    // Create backup if requested
    if (options?.createBackup) {
      await this.createBackup(existingProtocol);
    }

    // Merge updates
    const updatedProtocol: ProtocolDefinition = {
      ...existingProtocol,
      ...updates,
      metadata: {
        ...existingProtocol.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    // Increment version if requested
    if (options?.incrementVersion) {
      updatedProtocol.version = this.incrementVersion(existingProtocol.version, 'minor');
    }

    // Validate compatibility if requested
    if (options?.validateCompatibility) {
      await this.validateCompatibility(existingProtocol, updatedProtocol);
    }

    // Re-register the updated protocol
    await this.registerProtocol(updatedProtocol);

    this.emit('protocol-updated', { old: existingProtocol, new: updatedProtocol });
  }

  /**
   * List all protocols with filtering
   */
  async listProtocols(filter?: {
    category?: string;
    status?: string;
    tag?: string;
    capability?: string;
  }): Promise<ProtocolDefinition[]> {
    const protocols: ProtocolDefinition[] = [];

    // Scan all protocol directories
    const categories = ['meta-agents', 'domain-agents', 'core-protocols'];
    for (const category of categories) {
      const categoryPath = join(this.config.basePath, 'schemas', category);
      if (existsSync(categoryPath)) {
        const protocolFiles = this.scanProtocolFiles(categoryPath);
        for (const file of protocolFiles) {
          const protocol = await this.loadProtocolFromPath(file);
          if (protocol && this.matchesFilter(protocol, filter)) {
            protocols.push(protocol);
          }
        }
      }
    }

    return protocols.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get protocol versions
   */
  async getProtocolVersions(id: string): Promise<string[]> {
    return this.versionIndex.get(id) || [];
  }

  /**
   * Get protocol dependencies
   */
  async getProtocolDependencies(id: string, version?: string): Promise<{
    dependencies: string[];
    dependents: string[];
    circular: string[];
  }> {
    const protocol = await this.getProtocol(id, version);
    if (!protocol) {
      throw new Error(`Protocol not found: ${id}`);
    }

    const dependencies = protocol.specification['x-uep-metadata']?.dependencies || [];
    const dependents = this.findDependents(id);
    const circular = this.detectCircularDependencies(id);

    return { dependencies, dependents, circular };
  }

  /**
   * Validate protocol compatibility
   */
  async validateCompatibility(
    oldProtocol: ProtocolDefinition,
    newProtocol: ProtocolDefinition
  ): Promise<{
    compatible: boolean;
    breakingChanges: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const breakingChanges: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Version compatibility check
    if (this.isBreakingVersionChange(oldProtocol.version, newProtocol.version)) {
      breakingChanges.push(`Version change from ${oldProtocol.version} to ${newProtocol.version} is breaking`);
    }

    // Schema compatibility check
    const schemaChanges = this.analyzeSchemaChanges(
      oldProtocol.specification,
      newProtocol.specification
    );
    breakingChanges.push(...schemaChanges.breaking);
    warnings.push(...schemaChanges.warnings);

    // Dependency compatibility check
    const depChanges = this.analyzeDependencyChanges(
      oldProtocol.specification['x-uep-metadata']?.dependencies || [],
      newProtocol.specification['x-uep-metadata']?.dependencies || []
    );
    warnings.push(...depChanges);

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
      warnings,
      suggestions
    };
  }

  /**
   * Export protocols to different formats
   */
  async exportProtocols(
    format: 'json' | 'yaml' | 'markdown' | 'html',
    options?: {
      includeExamples?: boolean;
      includeMetadata?: boolean;
      filter?: any;
    }
  ): Promise<string> {
    const protocols = await this.listProtocols(options?.filter);
    
    switch (format) {
      case 'json':
        return JSON.stringify(protocols, null, 2);
      case 'yaml':
        return this.convertToYAML(protocols);
      case 'markdown':
        return this.generateMarkdownDocs(protocols, options);
      case 'html':
        return this.generateHTMLDocs(protocols, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Search protocols
   */
  async searchProtocols(query: {
    text?: string;
    capability?: string;
    tag?: string;
    author?: string;
    version?: string;
  }): Promise<ProtocolDefinition[]> {
    const allProtocols = await this.listProtocols();
    
    return allProtocols.filter(protocol => {
      if (query.text && !this.matchesTextQuery(protocol, query.text)) {
        return false;
      }
      if (query.capability && !protocol.specification['x-uep-metadata']?.capabilities?.includes(query.capability)) {
        return false;
      }
      if (query.tag && !protocol.specification['x-uep-metadata']?.tags?.includes(query.tag)) {
        return false;
      }
      if (query.author && protocol.metadata.author !== query.author) {
        return false;
      }
      if (query.version && protocol.version !== query.version) {
        return false;
      }
      return true;
    });
  }

  /**
   * Create protocol template
   */
  createProtocolTemplate(
    type: 'meta-agent' | 'domain-agent' | 'core-protocol',
    options: {
      name: string;
      capability: string;
      description: string;
      author: string;
    }
  ): ProtocolDefinition {
    const baseTemplate: ProtocolDefinition = {
      id: this.generateProtocolId(options.name, type),
      name: options.name,
      version: '1.0.0',
      category: type,
      description: options.description,
      specification: this.createBaseSpecification(type, options),
      metadata: {
        author: options.author,
        createdAt: new Date(),
        updatedAt: new Date(),
        maintainers: [options.author],
        status: 'draft',
        breaking: false,
        experimental: true,
        stability: 'alpha'
      },
      compatibility: {
        minVersion: '1.0.0',
        breakingChanges: [],
        deprecations: [],
        migrations: []
      },
      lifecycle: {
        phase: 'development',
        changeLog: [{
          version: '1.0.0',
          date: new Date(),
          type: 'major',
          changes: ['Initial protocol definition'],
          author: options.author,
          breaking: false
        }]
      }
    };

    return baseTemplate;
  }

  /**
   * Private helper methods
   */
  private createRepositoryMetadata(): void {
    const metadataPath = join(this.config.basePath, 'repository.json');
    if (!existsSync(metadataPath)) {
      const metadata = {
        name: 'UEP Protocol Schema Repository',
        version: '1.0.0',
        created: new Date().toISOString(),
        description: 'Git-based repository for UEP protocol definitions',
        config: this.config
      };
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }
  }

  private loadExistingProtocols(): void {
    // Implementation for loading existing protocols from disk
  }

  private buildVersionIndex(): void {
    // Implementation for building version index
  }

  private analyzeDependencies(): void {
    // Implementation for dependency analysis
  }

  private initializeGitRepository(): void {
    // Implementation for Git repository initialization
  }

  private async validateProtocol(protocol: ProtocolDefinition): Promise<ProtocolValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Basic validation
    if (!protocol.id || !protocol.name || !protocol.version) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Protocol must have id, name, and version',
        path: '/',
        severity: 'error',
        fixable: false
      });
    }

    // Version format validation
    if (!this.isValidSemanticVersion(protocol.version)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version must follow semantic versioning (x.y.z)',
        path: '/version',
        severity: 'error',
        fixable: true,
        suggestion: 'Use format like 1.0.0'
      });
    }

    // Specification validation
    if (protocol.specification.openapi && protocol.specification.openapi !== '3.1.0') {
      warnings.push({
        code: 'UNSUPPORTED_OPENAPI_VERSION',
        message: 'Only OpenAPI 3.1.0 is fully supported',
        path: '/specification/openapi',
        impact: 'medium',
        recommendation: 'Update to OpenAPI 3.1.0'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      metadata: {
        validationTime: Date.now(),
        validator: 'UEP-Protocol-Validator-v1.0.0',
        schemaVersion: '1.0.0'
      }
    };
  }

  private async checkVersionConflicts(protocol: ProtocolDefinition): Promise<void> {
    const existingVersions = await this.getProtocolVersions(protocol.id);
    if (existingVersions.includes(protocol.version)) {
      throw new Error(`Protocol version ${protocol.version} already exists for ${protocol.id}`);
    }
  }

  private getProtocolPath(protocol: ProtocolDefinition): string {
    const categoryDir = protocol.category === 'meta-agent' ? 'meta-agents' : 
                      protocol.category === 'domain-agent' ? 'domain-agents' : 'core-protocols';
    return join(this.config.basePath, 'schemas', categoryDir, `${protocol.id}.json`);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  private updateVersionIndex(protocol: ProtocolDefinition): void {
    const versions = this.versionIndex.get(protocol.id) || [];
    if (!versions.includes(protocol.version)) {
      versions.push(protocol.version);
      versions.sort(this.compareVersions);
      this.versionIndex.set(protocol.id, versions);
    }
  }

  private updateDependencyGraph(protocol: ProtocolDefinition): void {
    const dependencies = protocol.specification['x-uep-metadata']?.dependencies || [];
    this.dependencyGraph.set(protocol.id, new Set(dependencies));
  }

  private async commitProtocolChange(protocol: ProtocolDefinition, action: string): Promise<void> {
    // Git commit implementation would go here
    console.log(`Git commit: ${action} protocol ${protocol.id} v${protocol.version}`);
  }

  private async getLatestVersion(id: string): Promise<string | null> {
    const versions = await this.getProtocolVersions(id);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  private async loadProtocolFromFile(id: string, version: string): Promise<ProtocolDefinition | null> {
    // Implementation for loading protocol from file system
    return null;
  }

  private async loadProtocolFromPath(filePath: string): Promise<ProtocolDefinition | null> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ProtocolDefinition;
    } catch (error) {
      console.error(`Failed to load protocol from ${filePath}:`, error);
      return null;
    }
  }

  private scanProtocolFiles(directory: string): string[] {
    const files: string[] = [];
    if (existsSync(directory)) {
      const entries = readdirSync(directory);
      for (const entry of entries) {
        const fullPath = join(directory, entry);
        const stat = statSync(fullPath);
        if (stat.isFile() && extname(entry) === '.json') {
          files.push(fullPath);
        } else if (stat.isDirectory()) {
          files.push(...this.scanProtocolFiles(fullPath));
        }
      }
    }
    return files;
  }

  private matchesFilter(protocol: ProtocolDefinition, filter?: any): boolean {
    if (!filter) return true;

    if (filter.category && protocol.category !== filter.category) return false;
    if (filter.status && protocol.metadata.status !== filter.status) return false;
    if (filter.tag && !protocol.specification['x-uep-metadata']?.tags?.includes(filter.tag)) return false;
    if (filter.capability && !protocol.specification['x-uep-metadata']?.capabilities?.includes(filter.capability)) return false;

    return true;
  }

  private findDependents(protocolId: string): string[] {
    const dependents: string[] = [];
    for (const [id, deps] of this.dependencyGraph) {
      if (deps.has(protocolId)) {
        dependents.push(id);
      }
    }
    return dependents;
  }

  private detectCircularDependencies(protocolId: string): string[] {
    // Implementation for circular dependency detection
    return [];
  }

  private isBreakingVersionChange(oldVersion: string, newVersion: string): boolean {
    const oldMajor = parseInt(oldVersion.split('.')[0]);
    const newMajor = parseInt(newVersion.split('.')[0]);
    return newMajor > oldMajor;
  }

  private analyzeSchemaChanges(oldSpec: any, newSpec: any): { breaking: string[]; warnings: string[] } {
    return { breaking: [], warnings: [] };
  }

  private analyzeDependencyChanges(oldDeps: string[], newDeps: string[]): string[] {
    const warnings: string[] = [];
    const removed = oldDeps.filter(dep => !newDeps.includes(dep));
    const added = newDeps.filter(dep => !oldDeps.includes(dep));

    if (removed.length > 0) {
      warnings.push(`Removed dependencies: ${removed.join(', ')}`);
    }
    if (added.length > 0) {
      warnings.push(`Added dependencies: ${added.join(', ')}`);
    }

    return warnings;
  }

  private convertToYAML(protocols: ProtocolDefinition[]): string {
    // YAML conversion implementation
    return '';
  }

  private generateMarkdownDocs(protocols: ProtocolDefinition[], options?: any): string {
    // Markdown documentation generation
    return '';
  }

  private generateHTMLDocs(protocols: ProtocolDefinition[], options?: any): string {
    // HTML documentation generation
    return '';
  }

  private matchesTextQuery(protocol: ProtocolDefinition, query: string): boolean {
    const searchText = `${protocol.name} ${protocol.description} ${protocol.specification['x-uep-metadata']?.tags?.join(' ') || ''}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  }

  private generateProtocolId(name: string, type: string): string {
    return `${type}-${name.toLowerCase().replace(/\s+/g, '-')}`;
  }

  private createBaseSpecification(type: string, options: any): OpenAPI31Protocol {
    return {
      openapi: '3.1.0',
      info: {
        title: options.name,
        version: '1.0.0',
        description: options.description
      },
      paths: {},
      'x-uep-capability': options.capability,
      'x-uep-version': '1.0.0',
      'x-uep-metadata': {
        agentType: type === 'meta-agent' ? 'meta' : type === 'domain-agent' ? 'domain' : 'core',
        complexity: 'medium',
        dependencies: [],
        tags: [],
        capabilities: [options.capability],
        interactionPatterns: ['request-reply'],
        securityRequirements: []
      }
    };
  }

  private isValidSemanticVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  private incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
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
  }

  private async createBackup(protocol: ProtocolDefinition): Promise<void> {
    const backupPath = join(this.config.basePath, 'backups', `${protocol.id}-${protocol.version}-${Date.now()}.json`);
    this.ensureDirectoryExists(dirname(backupPath));
    writeFileSync(backupPath, JSON.stringify(protocol, null, 2));
  }

  /**
   * Shutdown repository
   */
  async shutdown(): Promise<void> {
    this.protocolCache.clear();
    this.versionIndex.clear();
    this.dependencyGraph.clear();
    this.removeAllListeners();
  }
}