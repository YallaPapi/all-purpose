/**
 * Documentation Organizer
 * 
 * Automatically organizes documentation files based on project structure,
 * following established patterns and the 5-document framework.
 * 
 * Integrates with Meta Agent Autonomy system for intelligent organization.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import {
  DocumentationType,
  DocumentationCategory,
  DocumentType
} from './interfaces/IDocumentationManager';

export interface OrganizationConfig {
  projectRoot: string;
  documentationRoot: string;
  preserveExisting: boolean;
  createMissingDirectories: boolean;
  followNamingConventions: boolean;
  enableBackups: boolean;
  backupDirectory: string;
  dryRun: boolean;
  logLevel: 'silent' | 'minimal' | 'verbose';
}

export interface ProjectStructureAnalysis {
  rootDirectory: string;
  sourceDirectories: string[];
  testDirectories: string[];
  configurationFiles: string[];
  documentationFiles: string[];
  packageFiles: string[];
  buildDirectories: string[];
  assetDirectories: string[];
  agentDirectories: string[];
  integrationPoints: IntegrationPoint[];
  complexityScore: number;
  recommendedStructure: RecommendedStructure;
}

export interface IntegrationPoint {
  type: 'api' | 'database' | 'service' | 'agent' | 'ui' | 'config';
  path: string;
  description: string;
  documentationRequired: DocumentType[];
  priority: 'low' | 'medium' | 'high';
}

export interface RecommendedStructure {
  directories: DirectoryRecommendation[];
  fileOrganization: FileOrganization[];
  namingConventions: NamingConvention[];
  templateSuggestions: TemplateSuggestion[];
}

export interface DirectoryRecommendation {
  path: string;
  purpose: string;
  priority: 'essential' | 'recommended' | 'optional';
  contentTypes: DocumentationType[];
}

export interface FileOrganization {
  currentPath: string;
  recommendedPath: string;
  reason: string;
  action: 'move' | 'copy' | 'merge' | 'create' | 'delete';
  confidence: number; // 0-1
}

export interface NamingConvention {
  pattern: string;
  description: string;
  examples: string[];
  enforce: boolean;
}

export interface TemplateSuggestion {
  documentType: DocumentType;
  path: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface OrganizationResult {
  success: boolean;
  changes: OrganizationChange[];
  errors: OrganizationError[];
  summary: OrganizationSummary;
}

export interface OrganizationChange {
  type: 'create' | 'move' | 'copy' | 'merge' | 'delete' | 'rename';
  from?: string;
  to: string;
  reason: string;
  timestamp: Date;
}

export interface OrganizationError {
  type: 'permission' | 'conflict' | 'missing' | 'format';
  path: string;
  message: string;
  suggestion?: string;
}

export interface OrganizationSummary {
  totalFiles: number;
  filesProcessed: number;
  filesCreated: number;
  filesMoved: number;
  directoriesCreated: number;
  errorsCount: number;
  duration: number;
  improvementScore: number; // 0-1
}

export class DocumentationOrganizer {
  private config: OrganizationConfig;
  private projectAnalysis?: ProjectStructureAnalysis;
  private changes: OrganizationChange[];
  private errors: OrganizationError[];

  constructor(config: Partial<OrganizationConfig> = {}) {
    this.config = {
      projectRoot: process.cwd(),
      documentationRoot: './docs',
      preserveExisting: true,
      createMissingDirectories: true,
      followNamingConventions: true,
      enableBackups: true,
      backupDirectory: './.docs-backups',
      dryRun: false,
      logLevel: 'minimal',
      ...config
    };

    this.changes = [];
    this.errors = [];
  }

  async organizeDocumentation(): Promise<OrganizationResult> {
    const startTime = Date.now();
    this.log('🗂️  Starting automatic documentation organization...', 'info');

    try {
      // Step 1: Analyze current project structure
      this.projectAnalysis = await this.analyzeProjectStructure();
      this.log(`📊 Project analysis complete: ${this.projectAnalysis.complexityScore.toFixed(2)} complexity score`, 'info');

      // Step 2: Create backup if enabled
      if (this.config.enableBackups && !this.config.dryRun) {
        await this.createBackup();
      }

      // Step 3: Create recommended directory structure
      await this.createDirectoryStructure();

      // Step 4: Organize existing documentation files
      await this.organizeExistingFiles();

      // Step 5: Create missing documentation from templates
      await this.createMissingDocumentation();

      // Step 6: Apply naming conventions
      await this.applyNamingConventions();

      // Step 7: Validate organization
      const validation = await this.validateOrganization();

      const duration = Date.now() - startTime;
      const summary: OrganizationSummary = {
        totalFiles: this.projectAnalysis.documentationFiles.length,
        filesProcessed: this.changes.length,
        filesCreated: this.changes.filter(c => c.type === 'create').length,
        filesMoved: this.changes.filter(c => c.type === 'move').length,
        directoriesCreated: this.changes.filter(c => c.type === 'create' && c.to.endsWith('/')).length,
        errorsCount: this.errors.length,
        duration,
        improvementScore: validation.score
      };

      this.log(`✅ Documentation organization complete in ${duration}ms`, 'info');
      this.log(`📈 Organization improvement score: ${(summary.improvementScore * 100).toFixed(1)}%`, 'info');

      return {
        success: this.errors.length === 0,
        changes: this.changes,
        errors: this.errors,
        summary
      };

    } catch (error) {
      this.log(`❌ Documentation organization failed: ${error.message}`, 'error');
      
      return {
        success: false,
        changes: this.changes,
        errors: [{
          type: 'format',
          path: this.config.projectRoot,
          message: error.message
        }],
        summary: {
          totalFiles: 0,
          filesProcessed: 0,
          filesCreated: 0,
          filesMoved: 0,
          directoriesCreated: 0,
          errorsCount: 1,
          duration: Date.now() - startTime,
          improvementScore: 0
        }
      };
    }
  }

  async analyzeProjectStructure(): Promise<ProjectStructureAnalysis> {
    this.log('🔍 Analyzing project structure...', 'verbose');

    const analysis: ProjectStructureAnalysis = {
      rootDirectory: this.config.projectRoot,
      sourceDirectories: [],
      testDirectories: [],
      configurationFiles: [],
      documentationFiles: [],
      packageFiles: [],
      buildDirectories: [],
      assetDirectories: [],
      agentDirectories: [],
      integrationPoints: [],
      complexityScore: 0,
      recommendedStructure: {
        directories: [],
        fileOrganization: [],
        namingConventions: [],
        templateSuggestions: []
      }
    };

    try {
      // Scan for different types of directories and files
      const allFiles = await glob('**/*', { 
        cwd: this.config.projectRoot,
        ignore: ['node_modules/**', '.git/**', 'dist/**', '.next/**']
      });

      // Categorize files and directories
      for (const file of allFiles) {
        const fullPath = path.join(this.config.projectRoot, file);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
          this.categorizeDirectory(file, analysis);
        } else {
          this.categorizeFile(file, analysis);
        }
      }

      // Analyze integration points
      analysis.integrationPoints = await this.identifyIntegrationPoints(analysis);

      // Calculate complexity score
      analysis.complexityScore = this.calculateComplexityScore(analysis);

      // Generate recommendations
      analysis.recommendedStructure = await this.generateRecommendations(analysis);

      this.log(`📊 Found ${analysis.sourceDirectories.length} source dirs, ${analysis.documentationFiles.length} docs`, 'verbose');

    } catch (error) {
      this.log(`❌ Error analyzing project structure: ${error.message}`, 'error');
      throw error;
    }

    return analysis;
  }

  private categorizeDirectory(dirPath: string, analysis: ProjectStructureAnalysis): void {
    const dirName = path.basename(dirPath).toLowerCase();
    
    // Source directories
    if (['src', 'lib', 'app', 'pages', 'components'].includes(dirName)) {
      analysis.sourceDirectories.push(dirPath);
    }
    
    // Test directories
    else if (['test', 'tests', '__tests__', 'spec', 'e2e'].includes(dirName)) {
      analysis.testDirectories.push(dirPath);
    }
    
    // Build directories
    else if (['dist', 'build', 'out', '.next', 'public'].includes(dirName)) {
      analysis.buildDirectories.push(dirPath);
    }
    
    // Asset directories
    else if (['assets', 'static', 'images', 'styles', 'css'].includes(dirName)) {
      analysis.assetDirectories.push(dirPath);
    }
    
    // Agent directories (specific to this project)
    else if (['meta-agents', 'agents', 'uep'].includes(dirName) || dirPath.includes('agent')) {
      analysis.agentDirectories.push(dirPath);
    }
  }

  private categorizeFile(filePath: string, analysis: ProjectStructureAnalysis): void {
    const fileName = path.basename(filePath).toLowerCase();
    const ext = path.extname(filePath).toLowerCase();
    
    // Documentation files
    if (ext === '.md' || ext === '.txt' || ext === '.rst') {
      analysis.documentationFiles.push(filePath);
    }
    
    // Configuration files
    else if (['package.json', 'tsconfig.json', '.env', 'config.js', 'next.config.js', 'vercel.json'].includes(fileName) ||
             ['.json', '.yml', '.yaml', '.toml', '.ini'].includes(ext)) {
      analysis.configurationFiles.push(filePath);
    }
    
    // Package files
    else if (['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].includes(fileName)) {
      analysis.packageFiles.push(filePath);
    }
  }

  private async identifyIntegrationPoints(analysis: ProjectStructureAnalysis): Promise<IntegrationPoint[]> {
    const integrationPoints: IntegrationPoint[] = [];

    // API endpoints
    for (const dir of analysis.sourceDirectories) {
      if (dir.includes('api') || dir.includes('routes')) {
        integrationPoints.push({
          type: 'api',
          path: dir,
          description: 'API endpoints requiring documentation',
          documentationRequired: [DocumentType.API_REFERENCE],
          priority: 'high'
        });
      }
    }

    // Agent systems
    for (const dir of analysis.agentDirectories) {
      integrationPoints.push({
        type: 'agent',
        path: dir,
        description: 'Agent systems requiring comprehensive documentation',
        documentationRequired: [DocumentType.API_REFERENCE, DocumentType.DEBUGGING_GUIDE],
        priority: 'high'
      });
    }

    // Configuration systems
    if (analysis.configurationFiles.length > 5) {
      integrationPoints.push({
        type: 'config',
        path: 'configuration',
        description: 'Complex configuration requiring environment setup docs',
        documentationRequired: [DocumentType.ENVIRONMENT_SETUP],
        priority: 'medium'
      });
    }

    return integrationPoints;
  }

  private calculateComplexityScore(analysis: ProjectStructureAnalysis): number {
    let score = 0;
    
    // Base complexity from directory count
    score += analysis.sourceDirectories.length * 0.1;
    score += analysis.agentDirectories.length * 0.2; // Agents add more complexity
    score += analysis.integrationPoints.length * 0.15;
    
    // File complexity
    score += analysis.configurationFiles.length * 0.05;
    score += Math.min(analysis.documentationFiles.length * 0.02, 0.5); // Cap documentation bonus
    
    // Integration complexity
    const hasAPI = analysis.integrationPoints.some(p => p.type === 'api');
    const hasAgents = analysis.integrationPoints.some(p => p.type === 'agent');
    const hasDB = analysis.integrationPoints.some(p => p.type === 'database');
    
    if (hasAPI) score += 0.3;
    if (hasAgents) score += 0.4;
    if (hasDB) score += 0.2;
    
    return Math.min(score, 10); // Cap at 10
  }

  private async generateRecommendations(analysis: ProjectStructureAnalysis): Promise<RecommendedStructure> {
    const structure: RecommendedStructure = {
      directories: [],
      fileOrganization: [],
      namingConventions: [],
      templateSuggestions: []
    };

    // Standard directory structure recommendations
    structure.directories = [
      {
        path: 'docs',
        purpose: 'Main documentation directory',
        priority: 'essential',
        contentTypes: [DocumentationType.DOCUMENTATION_REQUESTED]
      },
      {
        path: 'docs/api',
        purpose: 'API documentation and references',
        priority: analysis.integrationPoints.some(p => p.type === 'api') ? 'essential' : 'optional',
        contentTypes: [DocumentationType.DOCUMENTATION_REQUESTED]
      },
      {
        path: 'docs/agents',
        purpose: 'Agent-specific documentation',
        priority: analysis.agentDirectories.length > 0 ? 'essential' : 'optional',
        contentTypes: [DocumentationType.DOCUMENTATION_REQUESTED]
      },
      {
        path: 'docs/architecture',
        purpose: 'System architecture and design documents',
        priority: analysis.complexityScore > 3 ? 'recommended' : 'optional',
        contentTypes: [DocumentationType.DOCUMENTATION_REQUESTED]
      },
      {
        path: 'docs/guides',
        purpose: 'User and developer guides',
        priority: 'recommended',
        contentTypes: [DocumentationType.DOCUMENTATION_REQUESTED]
      }
    ];

    // File organization recommendations
    for (const docFile of analysis.documentationFiles) {
      const recommendation = this.generateFileOrganizationRecommendation(docFile, analysis);
      if (recommendation) {
        structure.fileOrganization.push(recommendation);
      }
    }

    // Naming conventions
    structure.namingConventions = [
      {
        pattern: 'README.md',
        description: 'Main project README at root level',
        examples: ['README.md'],
        enforce: true
      },
      {
        pattern: 'CHANGELOG.md',
        description: 'Project changelog at root level',
        examples: ['CHANGELOG.md'],
        enforce: true
      },
      {
        pattern: 'docs/**/*.md',
        description: 'All documentation files in docs directory',
        examples: ['docs/api/overview.md', 'docs/guides/setup.md'],
        enforce: false
      }
    ];

    // Template suggestions based on missing documentation
    structure.templateSuggestions = await this.generateTemplateSuggestions(analysis);

    return structure;
  }

  private generateFileOrganizationRecommendation(filePath: string, analysis: ProjectStructureAnalysis): FileOrganization | null {
    const fileName = path.basename(filePath);
    const currentDir = path.dirname(filePath);
    
    // README files should be organized by scope
    if (fileName.toLowerCase().includes('readme')) {
      if (currentDir === '.' || currentDir === '') {
        // Root README is fine
        return null;
      } else {
        // Component/module READMEs should stay with their components
        return null;
      }
    }

    // API documentation should be in docs/api
    if (fileName.toLowerCase().includes('api') || filePath.includes('api')) {
      return {
        currentPath: filePath,
        recommendedPath: path.join('docs/api', fileName),
        reason: 'API documentation should be centralized in docs/api',
        action: 'move',
        confidence: 0.8
      };
    }

    // Agent documentation should be in docs/agents
    if (filePath.includes('agent') || filePath.includes('meta-agent')) {
      return {
        currentPath: filePath,
        recommendedPath: path.join('docs/agents', fileName),
        reason: 'Agent documentation should be organized in docs/agents',
        action: 'move',
        confidence: 0.9
      };
    }

    // Architecture documentation
    if (fileName.toLowerCase().includes('architecture') || fileName.toLowerCase().includes('design')) {
      return {
        currentPath: filePath,
        recommendedPath: path.join('docs/architecture', fileName),
        reason: 'Architecture documentation should be in docs/architecture',
        action: 'move',
        confidence: 0.8
      };
    }

    return null;
  }

  private async generateTemplateSuggestions(analysis: ProjectStructureAnalysis): Promise<TemplateSuggestion[]> {
    const suggestions: TemplateSuggestion[] = [];
    
    // Check for missing 5-document framework files
    const rootDocs = analysis.documentationFiles.filter(f => path.dirname(f) === '.' || path.dirname(f) === '');
    
    if (!rootDocs.some(f => f.toLowerCase().includes('readme'))) {
      suggestions.push({
        documentType: DocumentType.README,
        path: 'README.md',
        reason: 'Main project README is missing',
        priority: 'high'
      });
    }

    if (!rootDocs.some(f => f.toLowerCase().includes('changelog'))) {
      suggestions.push({
        documentType: DocumentType.CHANGELOG,
        path: 'CHANGELOG.md',
        reason: 'Project changelog is missing',
        priority: 'high'
      });
    }

    if (!rootDocs.some(f => f.toLowerCase().includes('environment') || f.toLowerCase().includes('setup'))) {
      suggestions.push({
        documentType: DocumentType.ENVIRONMENT_SETUP,
        path: 'ENVIRONMENT_SETUP.md',
        reason: 'Environment setup guide is missing',
        priority: 'medium'
      });
    }

    // Agent-specific documentation
    if (analysis.agentDirectories.length > 0) {
      suggestions.push({
        documentType: DocumentType.API_REFERENCE,
        path: 'docs/agents/API_REFERENCE.md',
        reason: 'Agent API reference documentation needed',
        priority: 'high'
      });
    }

    return suggestions;
  }

  private async createBackup(): Promise<void> {
    this.log('💾 Creating documentation backup...', 'verbose');

    try {
      await fs.ensureDir(this.config.backupDirectory);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.config.backupDirectory, `docs-backup-${timestamp}`);
      
      // Copy existing documentation
      if (await fs.pathExists(this.config.documentationRoot)) {
        await fs.copy(this.config.documentationRoot, backupPath);
      }

      // Copy root-level documentation files
      const rootDocs = await glob('*.md', { cwd: this.config.projectRoot });
      for (const doc of rootDocs) {
        const sourcePath = path.join(this.config.projectRoot, doc);
        const backupDocPath = path.join(backupPath, 'root', doc);
        await fs.ensureDir(path.dirname(backupDocPath));
        await fs.copy(sourcePath, backupDocPath);
      }

      this.log(`✅ Backup created: ${backupPath}`, 'verbose');

    } catch (error) {
      this.log(`⚠️  Backup creation failed: ${error.message}`, 'error');
    }
  }

  private async createDirectoryStructure(): Promise<void> {
    if (!this.projectAnalysis) return;

    this.log('📁 Creating recommended directory structure...', 'verbose');

    for (const dirRec of this.projectAnalysis.recommendedStructure.directories) {
      if (dirRec.priority === 'essential' || 
          (dirRec.priority === 'recommended' && this.config.createMissingDirectories)) {
        
        const fullPath = path.join(this.config.projectRoot, dirRec.path);
        
        if (!await fs.pathExists(fullPath)) {
          if (!this.config.dryRun) {
            await fs.ensureDir(fullPath);
          }
          
          this.changes.push({
            type: 'create',
            to: dirRec.path + '/',
            reason: dirRec.purpose,
            timestamp: new Date()
          });
          
          this.log(`📁 Created directory: ${dirRec.path}`, 'verbose');
        }
      }
    }
  }

  private async organizeExistingFiles(): Promise<void> {
    if (!this.projectAnalysis) return;

    this.log('🗂️  Organizing existing documentation files...', 'verbose');

    for (const fileOrg of this.projectAnalysis.recommendedStructure.fileOrganization) {
      if (fileOrg.confidence >= 0.7) { // Only high-confidence moves
        const sourcePath = path.join(this.config.projectRoot, fileOrg.currentPath);
        const targetPath = path.join(this.config.projectRoot, fileOrg.recommendedPath);
        
        if (await fs.pathExists(sourcePath)) {
          // Check if target already exists
          if (await fs.pathExists(targetPath) && this.config.preserveExisting) {
            this.log(`⚠️  Skipping move - target exists: ${fileOrg.recommendedPath}`, 'verbose');
            continue;
          }
          
          if (!this.config.dryRun) {
            await fs.ensureDir(path.dirname(targetPath));
            await fs.move(sourcePath, targetPath);
          }
          
          this.changes.push({
            type: 'move',
            from: fileOrg.currentPath,
            to: fileOrg.recommendedPath,
            reason: fileOrg.reason,
            timestamp: new Date()
          });
          
          this.log(`📋 Moved: ${fileOrg.currentPath} → ${fileOrg.recommendedPath}`, 'verbose');
        }
      }
    }
  }

  private async createMissingDocumentation(): Promise<void> {
    if (!this.projectAnalysis) return;

    this.log('📄 Creating missing documentation from templates...', 'verbose');

    for (const templateSugg of this.projectAnalysis.recommendedStructure.templateSuggestions) {
      if (templateSugg.priority === 'high') {
        const targetPath = path.join(this.config.projectRoot, templateSugg.path);
        
        if (!await fs.pathExists(targetPath)) {
          const content = await this.generateDocumentContent(templateSugg);
          
          if (!this.config.dryRun) {
            await fs.ensureDir(path.dirname(targetPath));
            await fs.writeFile(targetPath, content, 'utf8');
          }
          
          this.changes.push({
            type: 'create',
            to: templateSugg.path,
            reason: templateSugg.reason,
            timestamp: new Date()
          });
          
          this.log(`📄 Created: ${templateSugg.path}`, 'verbose');
        }
      }
    }
  }

  private async applyNamingConventions(): Promise<void> {
    if (!this.config.followNamingConventions || !this.projectAnalysis) return;

    this.log('🏷️  Applying naming conventions...', 'verbose');

    // This would implement naming convention enforcement
    // For now, we'll just log what would be done
    for (const convention of this.projectAnalysis.recommendedStructure.namingConventions) {
      if (convention.enforce) {
        this.log(`🏷️  Would enforce: ${convention.pattern} - ${convention.description}`, 'verbose');
      }
    }
  }

  private async validateOrganization(): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = [];
    let score = 1.0;

    // Check if essential directories exist
    const essentialDirs = ['docs'];
    for (const dir of essentialDirs) {
      const dirPath = path.join(this.config.projectRoot, dir);
      if (!await fs.pathExists(dirPath)) {
        issues.push(`Missing essential directory: ${dir}`);
        score -= 0.2;
      }
    }

    // Check for 5-document framework compliance
    const requiredDocs = ['README.md', 'CHANGELOG.md'];
    for (const doc of requiredDocs) {
      const docPath = path.join(this.config.projectRoot, doc);
      if (!await fs.pathExists(docPath)) {
        issues.push(`Missing required document: ${doc}`);
        score -= 0.1;
      }
    }

    return { score: Math.max(score, 0), issues };
  }

  private async generateDocumentContent(templateSugg: TemplateSuggestion): Promise<string> {
    // Generate basic content based on document type
    switch (templateSugg.documentType) {
      case DocumentType.README:
        return this.generateReadmeContent();
      
      case DocumentType.CHANGELOG:
        return this.generateChangelogContent();
      
      case DocumentType.ENVIRONMENT_SETUP:
        return this.generateEnvironmentSetupContent();
      
      case DocumentType.API_REFERENCE:
        return this.generateAPIReferenceContent();
      
      default:
        return `# ${path.basename(templateSugg.path, '.md')}\n\n${templateSugg.reason}\n\n<!-- Auto-generated by Documentation Organizer -->\n`;
    }
  }

  private generateReadmeContent(): string {
    const projectName = path.basename(this.config.projectRoot);
    return `# ${projectName}

Auto-generated project README.

## Quick Start

<!-- Add quick start instructions here -->

## Features

<!-- List main features here -->

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

<!-- Add usage examples here -->

## Documentation

- [Environment Setup](./ENVIRONMENT_SETUP.md)
- [API Reference](./docs/api/README.md)
- [Architecture](./docs/architecture/README.md)

## Contributing

<!-- Add contributing guidelines here -->

---

*Auto-generated by Documentation Organizer*
`;
  }

  private generateChangelogContent(): string {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure
- Documentation organization system

### Changed
- Organized documentation structure

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

---

*Auto-generated by Documentation Organizer*
`;
  }

  private generateEnvironmentSetupContent(): string {
    return `# Environment Setup

Complete guide for setting up the development environment.

## Prerequisites

- Node.js (>= 18.0.0)
- npm or yarn
- Git

## Installation

1. Clone the repository:
   \`\`\`bash
   git clone <repository-url>
   cd ${path.basename(this.config.projectRoot)}
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Copy environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Configure environment variables in \`.env\`

## Development

Start the development server:
\`\`\`bash
npm run dev
\`\`\`

## Testing

Run tests:
\`\`\`bash
npm test
\`\`\`

## Troubleshooting

<!-- Add common issues and solutions here -->

---

*Auto-generated by Documentation Organizer*
`;
  }

  private generateAPIReferenceContent(): string {
    return `# API Reference

Comprehensive API documentation.

## Overview

<!-- Add API overview here -->

## Authentication

<!-- Add authentication details here -->

## Endpoints

<!-- Add endpoint documentation here -->

## Examples

<!-- Add usage examples here -->

## Error Codes

<!-- Add error code documentation here -->

---

*Auto-generated by Documentation Organizer*
`;
  }

  private log(message: string, level: 'verbose' | 'info' | 'error' = 'info'): void {
    if (this.config.logLevel === 'silent') return;
    if (this.config.logLevel === 'minimal' && level === 'verbose') return;

    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'verbose' ? '🔍' : 'ℹ️';
    console.log(`${timestamp} ${prefix} [DocumentationOrganizer] ${message}`);
  }

  // Public API methods

  public async getProjectAnalysis(): Promise<ProjectStructureAnalysis | undefined> {
    if (!this.projectAnalysis) {
      this.projectAnalysis = await this.analyzeProjectStructure();
    }
    return this.projectAnalysis;
  }

  public getOrganizationChanges(): OrganizationChange[] {
    return [...this.changes];
  }

  public getOrganizationErrors(): OrganizationError[] {
    return [...this.errors];
  }

  public async previewOrganization(): Promise<OrganizationResult> {
    const originalDryRun = this.config.dryRun;
    this.config.dryRun = true;
    
    try {
      return await this.organizeDocumentation();
    } finally {
      this.config.dryRun = originalDryRun;
    }
  }
}

export default DocumentationOrganizer;