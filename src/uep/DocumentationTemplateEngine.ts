/**
 * Documentation Template Engine
 * 
 * Comprehensive template system for auto-generating intelligent documentation
 * based on project structure, agent behavior, and established patterns.
 * 
 * Follows the 5-document framework and Agent-Driven Development methodology.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Mustache } from 'mustache';
import {
  DocumentationType,
  DocumentationTemplate,
  DocumentType,
  DocumentationCategory,
  TemplateVariable,
  ValidationRule
} from './interfaces/IDocumentationManager';

export interface TemplateEngineConfig {
  templatesDirectory: string;
  outputDirectory: string;
  enableIntelligentGeneration: boolean;
  useProjectAnalysis: boolean;
  followAgentMethodology: boolean;
  include5DocumentFramework: boolean;
  customTemplatesEnabled: boolean;
  templateCaching: boolean;
  validationEnabled: boolean;
  logLevel: 'silent' | 'minimal' | 'verbose' | 'debug';
}

export interface TemplateGenerationContext {
  // Project context
  projectId: string;
  projectName: string;
  projectDescription: string;
  projectType: 'agent-system' | 'web-app' | 'api' | 'library' | 'tool';
  complexityScore: number;
  
  // Agent context
  agents?: AgentContext[];
  agentTypes?: string[];
  agentCapabilities?: string[];
  
  // Task context
  tasks?: TaskContext[];
  completedTasks?: number;
  totalTasks?: number;
  progressPercentage?: number;
  
  // Technical context
  technologies?: string[];
  frameworks?: string[];
  languages?: string[];
  databases?: string[];
  apis?: APIContext[];
  
  // Environment context
  environments?: string[];
  deploymentPlatform?: string;
  configurationComplexity?: 'simple' | 'moderate' | 'complex';
  
  // Custom context
  customVariables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  agentId: string;
  agentType: string;
  description: string;
  capabilities: string[];
  status: string;
  workload: number;
  metadata: Record<string, any>;
}

export interface TaskContext {
  taskId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  agentId: string;
  duration?: number;
  complexity?: string;
}

export interface APIContext {
  name: string;
  version: string;
  baseUrl: string;
  description: string;
  endpoints: APIEndpoint[];
}

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: APIParameter[];
  responses?: APIResponse[];
}

export interface APIParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface APIResponse {
  status: number;
  description: string;
  schema?: string;
}

export interface TemplateGenerationResult {
  success: boolean;
  templateId: string;
  outputPath: string;
  content: string;
  variables: Record<string, any>;
  warnings: string[];
  errors: string[];
  generationTime: number;
}

export class DocumentationTemplateEngine {
  private config: TemplateEngineConfig;
  private templates: Map<string, DocumentationTemplate>;
  private templateCache: Map<string, string>;
  private builtInTemplates: Map<string, DocumentationTemplate>;

  constructor(config: Partial<TemplateEngineConfig> = {}) {
    this.config = {
      templatesDirectory: './src/uep/documentation/templates',
      outputDirectory: './docs',
      enableIntelligentGeneration: true,
      useProjectAnalysis: true,
      followAgentMethodology: true,
      include5DocumentFramework: true,
      customTemplatesEnabled: true,
      templateCaching: true,
      validationEnabled: true,
      logLevel: 'minimal',
      ...config
    };

    this.templates = new Map();
    this.templateCache = new Map();
    this.builtInTemplates = new Map();

    this.initializeBuiltInTemplates();
  }

  async initialize(): Promise<void> {
    this.log('🎨 Initializing Documentation Template Engine...', 'info');

    try {
      // Ensure directories exist
      await fs.ensureDir(this.config.templatesDirectory);
      await fs.ensureDir(this.config.outputDirectory);

      // Load built-in templates
      await this.loadBuiltInTemplates();

      // Load custom templates if enabled
      if (this.config.customTemplatesEnabled) {
        await this.loadCustomTemplates();
      }

      this.log(`✅ Template Engine initialized with ${this.templates.size} templates`, 'info');

    } catch (error) {
      this.log(`❌ Failed to initialize Template Engine: ${error.message}`, 'error');
      throw error;
    }
  }

  async generateDocumentation(
    templateId: string,
    context: TemplateGenerationContext,
    outputPath?: string
  ): Promise<TemplateGenerationResult> {
    const startTime = Date.now();
    this.log(`📝 Generating documentation with template: ${templateId}`, 'debug');

    const result: TemplateGenerationResult = {
      success: false,
      templateId,
      outputPath: outputPath || '',
      content: '',
      variables: {},
      warnings: [],
      errors: [],
      generationTime: 0
    };

    try {
      // Get template
      const template = this.getTemplate(templateId);
      if (!template) {
        result.errors.push(`Template not found: ${templateId}`);
        return result;
      }

      // Prepare generation context
      const enrichedContext = await this.enrichContext(context, template);
      result.variables = enrichedContext;

      // Validate required variables
      const validationResult = this.validateTemplateVariables(template, enrichedContext);
      result.warnings.push(...validationResult.warnings);
      result.errors.push(...validationResult.errors);

      if (result.errors.length > 0) {
        return result;
      }

      // Generate content
      result.content = await this.renderTemplate(template, enrichedContext);

      // Determine output path if not provided
      if (!outputPath) {
        result.outputPath = this.determineOutputPath(template, context);
      } else {
        result.outputPath = outputPath;
      }

      // Validate generated content if enabled
      if (this.config.validationEnabled) {
        const contentValidation = await this.validateGeneratedContent(result.content, template);
        result.warnings.push(...contentValidation.warnings);
        result.errors.push(...contentValidation.errors);
      }

      result.success = result.errors.length === 0;
      result.generationTime = Date.now() - startTime;

      this.log(`${result.success ? '✅' : '⚠️'} Template generation complete: ${templateId} (${result.generationTime}ms)`, 'info');

    } catch (error) {
      result.errors.push(error.message);
      result.generationTime = Date.now() - startTime;
      this.log(`❌ Template generation failed: ${error.message}`, 'error');
    }

    return result;
  }

  async generateAll5Documents(context: TemplateGenerationContext): Promise<TemplateGenerationResult[]> {
    if (!this.config.include5DocumentFramework) {
      return [];
    }

    this.log('📚 Generating complete 5-document framework...', 'info');

    const results: TemplateGenerationResult[] = [];
    const frameworkTemplates = [
      'readme_comprehensive',
      'changelog_standard',
      'environment_setup_detailed',
      'debugging_guide_systematic',
      'parameter_mapping_complete'
    ];

    for (const templateId of frameworkTemplates) {
      try {
        const result = await this.generateDocumentation(templateId, context);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          templateId,
          outputPath: '',
          content: '',
          variables: {},
          warnings: [],
          errors: [error.message],
          generationTime: 0
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.log(`📚 5-document framework generation complete: ${successCount}/${results.length} successful`, 'info');

    return results;
  }

  // Built-in template initialization

  private initializeBuiltInTemplates(): void {
    this.log('🏗️  Initializing built-in templates...', 'debug');

    // README Template - Comprehensive
    this.builtInTemplates.set('readme_comprehensive', {
      templateId: 'readme_comprehensive',
      documentType: DocumentType.README,
      category: DocumentationCategory.README,
      template: this.getReadmeTemplate(),
      variables: this.getReadmeVariables(),
      requiredSections: ['Overview', 'Quick Start', 'Features', 'Installation'],
      optionalSections: ['Usage', 'API Reference', 'Contributing', 'License'],
      validationRules: this.getReadmeValidationRules()
    });

    // CHANGELOG Template - Standard
    this.builtInTemplates.set('changelog_standard', {
      templateId: 'changelog_standard',
      documentType: DocumentType.CHANGELOG,
      category: DocumentationCategory.CHANGELOG,
      template: this.getChangelogTemplate(),
      variables: this.getChangelogVariables(),
      requiredSections: ['Unreleased', 'Released Versions'],
      optionalSections: ['Security', 'Migration Guide'],
      validationRules: this.getChangelogValidationRules()
    });

    // Environment Setup Template - Detailed
    this.builtInTemplates.set('environment_setup_detailed', {
      templateId: 'environment_setup_detailed',
      documentType: DocumentType.ENVIRONMENT_SETUP,
      category: DocumentationCategory.SETUP,
      template: this.getEnvironmentSetupTemplate(),
      variables: this.getEnvironmentSetupVariables(),
      requiredSections: ['Prerequisites', 'Installation', 'Configuration'],
      optionalSections: ['Troubleshooting', 'Advanced Setup', 'Docker'],
      validationRules: this.getEnvironmentSetupValidationRules()
    });

    // Debugging Guide Template - Systematic
    this.builtInTemplates.set('debugging_guide_systematic', {
      templateId: 'debugging_guide_systematic',
      documentType: DocumentType.DEBUGGING_GUIDE,
      category: DocumentationCategory.DEBUGGING,
      template: this.getDebuggingGuideTemplate(),
      variables: this.getDebuggingGuideVariables(),
      requiredSections: ['30-Minute Rule', 'Debug Endpoints', 'Common Issues'],
      optionalSections: ['Advanced Debugging', 'Performance', 'Monitoring'],
      validationRules: this.getDebuggingGuideValidationRules()
    });

    // Parameter Mapping Template - Complete
    this.builtInTemplates.set('parameter_mapping_complete', {
      templateId: 'parameter_mapping_complete',
      documentType: DocumentType.PARAMETER_MAPPING,
      category: DocumentationCategory.PARAMETER_MAPPING,
      template: this.getParameterMappingTemplate(),
      variables: this.getParameterMappingVariables(),
      requiredSections: ['Parameter Flow', 'Integration Points', 'Validation'],
      optionalSections: ['Transformations', 'Error Handling', 'Testing'],
      validationRules: this.getParameterMappingValidationRules()
    });

    // API Reference Template
    this.builtInTemplates.set('api_reference_detailed', {
      templateId: 'api_reference_detailed',
      documentType: DocumentType.API_REFERENCE,
      category: DocumentationCategory.API,
      template: this.getAPIReferenceTemplate(),
      variables: this.getAPIReferenceVariables(),
      requiredSections: ['Overview', 'Authentication', 'Endpoints'],
      optionalSections: ['SDKs', 'Rate Limiting', 'Webhooks'],
      validationRules: this.getAPIReferenceValidationRules()
    });

    // Agent Documentation Template
    this.builtInTemplates.set('agent_documentation', {
      templateId: 'agent_documentation',
      documentType: DocumentType.API_REFERENCE,
      category: DocumentationCategory.API,
      template: this.getAgentDocumentationTemplate(),
      variables: this.getAgentDocumentationVariables(),
      requiredSections: ['Overview', 'Capabilities', 'Usage'],
      optionalSections: ['Performance', 'Configuration', 'Troubleshooting'],
      validationRules: this.getAgentDocumentationValidationRules()
    });

    this.log(`🏗️  Initialized ${this.builtInTemplates.size} built-in templates`, 'debug');
  }

  // Template content generators

  private getReadmeTemplate(): string {
    return `# {{projectName}}

{{#projectDescription}}
{{projectDescription}}
{{/projectDescription}}

{{#agents}}
## System Overview

This project implements a {{projectType}} system with {{agents.length}} specialized agents:

{{#agents}}
- **{{agentType}}** ({{agentId}}): {{description}}
{{/agents}}

### System Metrics
- **Complexity Score**: {{complexityScore}}/10
- **Active Agents**: {{agents.length}}
- **Completion Rate**: {{progressPercentage}}%
{{/agents}}

## 🚀 Quick Start

{{#configurationComplexity}}
{{#equals configurationComplexity "simple"}}
### Simple Setup (2 minutes)

\`\`\`bash
# Clone and install
git clone <repository-url>
cd {{projectName}}
npm install

# Start development
npm run dev
\`\`\`
{{/equals}}

{{#equals configurationComplexity "moderate"}}
### Standard Setup (5 minutes)

\`\`\`bash
# Clone repository
git clone <repository-url>
cd {{projectName}}

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development
npm run dev
\`\`\`
{{/equals}}

{{#equals configurationComplexity "complex"}}
### Advanced Setup (10-15 minutes)

Please see [Environment Setup Guide](./ENVIRONMENT_SETUP.md) for detailed configuration instructions.

Quick setup:
\`\`\`bash
git clone <repository-url>
cd {{projectName}}
npm install
\`\`\`
{{/equals}}
{{/configurationComplexity}}

## ✨ Features

{{#agents}}
### Agent Capabilities
{{#agents}}
- **{{agentType}}**: {{capabilities.join(', ')}}
{{/agents}}
{{/agents}}

{{#apis}}
### API Features
{{#apis}}
- **{{name}} v{{version}}**: {{description}}
{{/apis}}
{{/apis}}

{{#technologies}}
### Technology Stack
{{technologies.join(', ')}}
{{/technologies}}

## 📖 Documentation

{{#include5DocumentFramework}}
### Core Documentation (5-Document Framework)
- [Environment Setup](./ENVIRONMENT_SETUP.md) - Complete configuration guide
- [Debugging Guide](./DEBUGGING_GUIDE.md) - 30-minute rule and systematic debugging
- [Parameter Mapping](./PARAMETER_MAPPING.md) - Integration and data flow reference
- [Changelog](./CHANGELOG.md) - Version history and changes
{{/include5DocumentFramework}}

### Additional Documentation
{{#agents}}
- [Agent Documentation](./docs/agents/) - Individual agent guides
{{/agents}}
{{#apis}}
- [API Reference](./docs/api/) - Complete API documentation
{{/apis}}
- [Architecture](./docs/architecture/) - System design and patterns

## 🔧 Development

{{#followAgentMethodology}}
### Agent-Driven Development Methodology

This project follows the [Agent-Driven Development (ADD)](./docs/agent_driven_development_methodology.md) methodology:

1. **All-Purpose Pattern**: No hardcoded limitations - works for ANY industry/context
2. **30-Minute Rule**: Systematic debugging with time limits and fallback approaches
3. **5-Document Framework**: Complete documentation preventing development chaos
4. **Parameter Flow Discipline**: Bulletproof integration through mapped data flows
5. **Production-First**: Vercel-native architecture ready for deployment

{{/followAgentMethodology}}

### Commands

\`\`\`bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code

{{#agents}}
# Agent Management
npm run agents:list  # List all agents
npm run agents:test  # Test agent functionality
{{/agents}}
\`\`\`

## 🏗️ Architecture

{{#projectType}}
{{#equals projectType "agent-system"}}
### Agent System Architecture

This system implements a meta-agent factory pattern where agents create and manage other agents:

1. **Meta-Agent Factory**: Creates specialized agents based on requirements
2. **ProjectContext Manager**: Maintains shared state across all agents
3. **UEP (Universal Execution Protocol)**: Standardized execution pipeline
4. **Event-Driven Coordination**: Real-time synchronization between agents

```
+-------------------------------------------------------------+
|                    {{projectName}} System                   |
|  {{agents.length}} Specialized Agents + Meta-Agent Factory |
+-------------------------------------------------------------+
|                  Meta-Agent Factory                         |
|     Creates, Manages, and Coordinates Agents               |
+-------------------------------------------------------------+
|                  Foundation Layer                           |
|    ProjectContext + UEP + Event System                     |
+-------------------------------------------------------------+
```

{{/equals}}

{{#equals projectType "web-app"}}
### Web Application Architecture

{{#deploymentPlatform}}
**Deployment Platform**: {{deploymentPlatform}}
{{/deploymentPlatform}}

{{#frameworks}}
**Framework Stack**: {{frameworks.join(', ')}}
{{/frameworks}}
{{/equals}}

{{#equals projectType "api"}}
### API Architecture

{{#apis}}
**API Version**: {{apis.0.version}}
**Base URL**: {{apis.0.baseUrl}}
{{/apis}}
{{/equals}}
{{/projectType}}

## 🤝 Contributing

{{#followAgentMethodology}}
### Agent-Driven Development Guidelines

When contributing to this project, please follow the ADD methodology:

1. **No Hardcoded Limitations**: Ensure all code follows the All-Purpose Pattern
2. **Debug Infrastructure**: Include debug endpoints and 30-minute rule compliance
3. **Documentation Updates**: Update relevant documentation from the 5-document framework
4. **Parameter Mapping**: Document all data transformations and integration points

{{/followAgentMethodology}}

### Development Process

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature-name\`
3. Make your changes following the established patterns
4. Add tests and update documentation
5. Submit a pull request

## 📊 Status

{{#tasks}}
### Current Progress
- **Total Tasks**: {{totalTasks}}
- **Completed**: {{completedTasks}}
- **Progress**: {{progressPercentage}}%

### Recent Activity
{{#tasks}}
- {{title}} ({{status}}) - {{agentId}}
{{/tasks}}
{{/tasks}}

{{#agents}}
### Agent Status
{{#agents}}
- **{{agentId}}**: {{status}} ({{workload}}% workload)
{{/agents}}
{{/agents}}

## 📝 License

{{license}}

---

{{#followAgentMethodology}}
*Built with [Agent-Driven Development](./docs/agent_driven_development_methodology.md) methodology*
{{/followAgentMethodology}}

*Last updated: {{lastUpdated}}*
{{#metadata.autoGenerated}}
*Auto-generated by Documentation Template Engine*
{{/metadata.autoGenerated}}`;
  }

  private getChangelogTemplate(): string {
    return `# Changelog

All notable changes to {{projectName}} will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

{{#pendingChanges}}
### Added
{{#pendingChanges.added}}
- {{.}}
{{/pendingChanges.added}}

### Changed
{{#pendingChanges.changed}}
- {{.}}
{{/pendingChanges.changed}}

### Fixed
{{#pendingChanges.fixed}}
- {{.}}
{{/pendingChanges.fixed}}
{{/pendingChanges}}

{{#releases}}
## [{{version}}] - {{date}}

{{#changes}}
### Added
{{#added}}
- {{description}} {{#pr}}([#{{pr}}]({{prUrl}})){{/pr}}
{{/added}}

### Changed
{{#changed}}
- {{description}} {{#pr}}([#{{pr}}]({{prUrl}})){{/pr}}
{{/changed}}

### Deprecated
{{#deprecated}}
- {{description}} {{#pr}}([#{{pr}}]({{prUrl}})){{/pr}}
{{/deprecated}}

### Removed
{{#removed}}
- {{description}} {{#pr}}([#{{pr}}]({{prUrl}})){{/pr}}
{{/removed}}

### Fixed
{{#fixed}}
- {{description}} {{#pr}}([#{{pr}}]({{prUrl}})){{/pr}}
{{/fixed}}

### Security
{{#security}}
- {{description}} {{#pr}}([#{{pr}}]({{prUrl}})){{/pr}}
{{/security}}
{{/changes}}

{{/releases}}

{{#followAgentMethodology}}
## Agent Development Changes

{{#agentChanges}}
### {{agentType}} Agent Updates
{{#changes}}
- {{date}}: {{description}} ({{changeType}})
{{/changes}}
{{/agentChanges}}

## Meta-Agent Factory Changes

{{#factoryChanges}}
- {{date}}: {{description}} ({{impactLevel}} impact)
{{/factoryChanges}}
{{/followAgentMethodology}}

---

{{#metadata.autoGenerated}}
*Auto-generated by Documentation Template Engine*
{{/metadata.autoGenerated}}

*For more detailed information about changes, see the [commit history]({{repositoryUrl}}/commits).*`;
  }

  private getEnvironmentSetupTemplate(): string {
    return `# Environment Setup Guide

Complete setup guide for {{projectName}} development environment.

{{#configurationComplexity}}
**Configuration Complexity**: {{configurationComplexity}}
{{/configurationComplexity}}

## 📋 Prerequisites

{{#prerequisites}}
### Required Software
{{#required}}
- **{{name}}** ({{version}}{{#reason}} - {{reason}}{{/reason}})
{{/required}}

### Optional Software
{{#optional}}
- **{{name}}** ({{version}}{{#reason}} - {{reason}}{{/reason}})
{{/optional}}
{{/prerequisites}}

{{#followAgentMethodology}}
### Agent-Driven Development Requirements

This project follows the ADD methodology, which requires:

- **Context7 MCP Server**: For up-to-date documentation integration
- **TaskMaster CLI**: For research-backed development tasks
- **Redis/Upstash**: For agent state management and coordination

{{/followAgentMethodology}}

## 🚀 Installation

### 1. Clone Repository

\`\`\`bash
git clone {{repositoryUrl}}
cd {{projectName}}
\`\`\`

### 2. Install Dependencies

{{#packageManager}}
{{#equals packageManager "npm"}}
\`\`\`bash
npm install
\`\`\`
{{/equals}}

{{#equals packageManager "yarn"}}
\`\`\`bash
yarn install
\`\`\`
{{/equals}}

{{#equals packageManager "pnpm"}}
\`\`\`bash
pnpm install
\`\`\`
{{/equals}}
{{/packageManager}}

### 3. Environment Configuration

{{#configurationComplexity}}
{{#equals configurationComplexity "simple"}}
#### Simple Configuration

\`\`\`bash
# Copy environment template
cp .env.example .env

# Edit basic settings
nano .env
\`\`\`

Required variables:
\`\`\`bash
NODE_ENV=development
PORT=3000
{{#basicEnvVars}}
{{name}}={{defaultValue}}{{#description}} # {{description}}{{/description}}
{{/basicEnvVars}}
\`\`\`
{{/equals}}

{{#equals configurationComplexity "moderate"}}
#### Standard Configuration

\`\`\`bash
# Copy environment template
cp .env.example .env
\`\`\`

Configure the following sections:

**Basic Settings**
\`\`\`bash
NODE_ENV=development
PORT=3000
{{#basicEnvVars}}
{{name}}={{defaultValue}}{{#description}} # {{description}}{{/description}}
{{/basicEnvVars}}
\`\`\`

{{#databases}}
**Database Configuration**
\`\`\`bash
{{#databases}}
{{name.toUpperCase}}_URL={{defaultUrl}}{{#description}} # {{description}}{{/description}}
{{/databases}}
\`\`\`
{{/databases}}

{{#apis}}
**API Keys**
\`\`\`bash
{{#apis}}
{{name.toUpperCase}}_API_KEY=your_{{name}}_key_here{{#description}} # {{description}}{{/description}}
{{/apis}}
\`\`\`
{{/apis}}
{{/equals}}

{{#equals configurationComplexity "complex"}}
#### Advanced Configuration

This project requires extensive configuration. Please follow these steps carefully:

\`\`\`bash
# Copy environment template
cp .env.example .env
\`\`\`

**1. Core Application Settings**
\`\`\`bash
NODE_ENV=development
PORT=3000
{{#coreEnvVars}}
{{name}}={{defaultValue}}{{#description}} # {{description}}{{/description}}
{{/coreEnvVars}}
\`\`\`

{{#agents}}
**2. Agent System Configuration**
\`\`\`bash
# Redis/Upstash for agent coordination
KV_REST_API_URL=https://your-redis-url
KV_REST_API_TOKEN=your-redis-token

# Agent-specific API keys
{{#agentConfigs}}
{{name.toUpperCase}}_API_KEY=your_{{name}}_key
{{/agentConfigs}}
\`\`\`
{{/agents}}

{{#apis}}
**3. External API Configuration**
\`\`\`bash
{{#apis}}
# {{description}}
{{name.toUpperCase}}_API_KEY=your_{{name}}_key
{{name.toUpperCase}}_BASE_URL={{baseUrl}}
{{/apis}}
\`\`\`
{{/apis}}

{{#databases}}
**4. Database Configuration**
\`\`\`bash
{{#databases}}
# {{description}}
{{name.toUpperCase}}_URL={{connectionString}}
{{/databases}}
\`\`\`
{{/databases}}

**5. Advanced Settings**
\`\`\`bash
{{#advancedEnvVars}}
{{name}}={{defaultValue}}{{#description}} # {{description}}{{/description}}
{{/advancedEnvVars}}
\`\`\`
{{/equals}}
{{/configurationComplexity}}

## 🔧 Development Setup

### 4. Verify Installation

\`\`\`bash
{{#verificationCommands}}
# {{description}}
{{command}}
{{/verificationCommands}}
\`\`\`

Expected output:
\`\`\`
{{#expectedOutputs}}
{{command}}: {{output}}
{{/expectedOutputs}}
\`\`\`

### 5. Start Development Server

\`\`\`bash
{{startCommand}}
\`\`\`

{{#developmentUrls}}
The application will be available at:
{{#urls}}
- {{description}}: [{{url}}]({{url}})
{{/urls}}
{{/developmentUrls}}

{{#followAgentMethodology}}
## 🤖 Agent System Setup

### TaskMaster Integration

\`\`\`bash
# Install TaskMaster globally
npm install -g task-master-cli

# Configure with your API keys
task-master config set anthropic-key YOUR_ANTHROPIC_KEY
task-master config set perplexity-key YOUR_PERPLEXITY_KEY
\`\`\`

### Context7 MCP Server

\`\`\`bash
# Install Context7 MCP server
npm install -g context7-mcp

# Add to your IDE MCP configuration
# See Context7 documentation for IDE-specific setup
\`\`\`

### Verify Agent System

\`\`\`bash
# Test agent system
npm run test:agents

# Check agent status
npm run agents:status
\`\`\`
{{/followAgentMethodology}}

## 🐳 Docker Setup (Optional)

{{#dockerSupport}}
### Docker Development

\`\`\`bash
# Build development container
docker-compose -f docker-compose.dev.yml up --build

# Run specific services
docker-compose -f docker-compose.dev.yml up {{primaryService}}
\`\`\`

### Docker Production

\`\`\`bash
# Build production container
docker build -t {{projectName}}:latest .

# Run production container
docker run -p 3000:3000 --env-file .env {{projectName}}:latest
\`\`\`
{{/dockerSupport}}

## 🔍 Troubleshooting

### Common Issues

{{#commonIssues}}
#### {{issue}}

**Symptoms**: {{symptoms}}

**Solution**:
{{#solutions}}
{{step}}. {{description}}
   \`\`\`bash
   {{command}}
   \`\`\`
{{/solutions}}
{{/commonIssues}}

{{#followAgentMethodology}}
### Agent System Issues

#### Agents Not Responding
- Check Redis connection: \`npm run test:redis\`
- Verify API keys are configured
- Check agent logs: \`npm run logs:agents\`

#### Context7 Integration Issues
- Verify MCP server is running
- Check IDE integration configuration
- Test connection: \`context7 --test\`

#### TaskMaster Issues
- Verify API keys: \`task-master config list\`
- Test connection: \`task-master test-connection\`
- Update TaskMaster: \`npm update -g task-master-cli\`
{{/followAgentMethodology}}

### Debug Endpoints

{{#debugEndpoints}}
The following debug endpoints are available in development:

{{#endpoints}}
- **{{method}} {{path}}**: {{description}}
{{/endpoints}}

Example usage:
\`\`\`bash
curl http://localhost:{{port}}{{debugEndpoints.0.path}}
\`\`\`
{{/debugEndpoints}}

### Performance Issues

{{#performanceChecks}}
**System Requirements Check**:
{{#checks}}
- {{requirement}}: {{checkCommand}}
{{/checks}}
{{/performanceChecks}}

## 🚀 Production Deployment

{{#deploymentPlatform}}
{{#equals deploymentPlatform "vercel"}}
### Vercel Deployment

1. Install Vercel CLI:
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. Configure environment variables in Vercel dashboard

3. Deploy:
   \`\`\`bash
   vercel --prod
   \`\`\`
{{/equals}}

{{#equals deploymentPlatform "netlify"}}
### Netlify Deployment

1. Connect repository to Netlify
2. Configure build settings:
   - Build command: \`{{buildCommand}}\`
   - Publish directory: \`{{publishDirectory}}\`
3. Set environment variables in Netlify dashboard
{{/equals}}

{{#equals deploymentPlatform "aws"}}
### AWS Deployment

See [AWS Deployment Guide](./docs/deployment/aws.md) for detailed instructions.
{{/equals}}
{{/deploymentPlatform}}

## 📚 Next Steps

1. **Read the Documentation**: Start with [README.md](./README.md)
2. **Check the Architecture**: Review [docs/architecture/](./docs/architecture/)
{{#followAgentMethodology}}
3. **Understand ADD Methodology**: Read [Agent-Driven Development](./docs/agent_driven_development_methodology.md)
{{/followAgentMethodology}}
4. **Explore Examples**: Check [examples/](./examples/) directory
5. **Join the Community**: See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

{{#metadata.autoGenerated}}
*Auto-generated by Documentation Template Engine*
{{/metadata.autoGenerated}}

*Last updated: {{lastUpdated}}*`;
  }

  private getDebuggingGuideTemplate(): string {
    return `# Debugging Guide

Systematic debugging approach for {{projectName}} following the 30-minute rule.

{{#followAgentMethodology}}
## 🕐 The 30-Minute Rule

As per Agent-Driven Development methodology:

> **Any debugging session lasting more than 30 minutes must trigger an alternative approach.**

### Process:
1. ⏰ Set explicit 30-minute timer
2. 🔍 Debug systematically (not randomly)
3. ⏱️ After 30 minutes: STOP and find alternative approach
4. 📝 Document the issue and chosen alternative
5. 🏗️ Build systems with debug endpoints and fallback mechanisms
{{/followAgentMethodology}}

## 🔧 Debug Infrastructure

### Debug Endpoints

{{#debugEndpoints}}
The system includes built-in debug endpoints:

{{#endpoints}}
#### {{method}} {{path}}
{{description}}

**Response Format**:
\`\`\`json
{{responseExample}}
\`\`\`

**Usage**:
\`\`\`bash
curl -X {{method}} http://localhost:{{../port}}{{path}}
\`\`\`
{{/endpoints}}
{{/debugEndpoints}}

### Component Isolation Testing

{{#components}}
Each system component can be tested in isolation:

{{#components}}
#### {{name}} Component

**Health Check**:
\`\`\`bash
{{healthCheckCommand}}
\`\`\`

**Isolation Test**:
\`\`\`bash
{{isolationTestCommand}}
\`\`\`

**Common Issues**:
{{#commonIssues}}
- **{{issue}}**: {{solution}}
{{/commonIssues}}
{{/components}}
{{/components}}

{{#agents}}
## 🤖 Agent System Debugging

### Agent Status Monitoring

\`\`\`bash
# Check all agents
npm run agents:status

# Check specific agent
npm run agents:status {{agents.0.agentId}}

# View agent logs
npm run agents:logs {{agents.0.agentId}}
\`\`\`

### Agent Performance Debugging

{{#agents}}
#### {{agentType}} Agent ({{agentId}})

**Debug Commands**:
\`\`\`bash
# Test agent connectivity
curl http://localhost:{{../port}}/api/debug/agents/{{agentId}}/ping

# Get agent metrics
curl http://localhost:{{../port}}/api/debug/agents/{{agentId}}/metrics

# Check agent workload
curl http://localhost:{{../port}}/api/debug/agents/{{agentId}}/workload
\`\`\`

**Performance Thresholds**:
- Response time: < 2000ms
- Success rate: > 95%
- Workload: < 80%

**Failure Indicators**:
{{#failureIndicators}}
- {{indicator}}: {{action}}
{{/failureIndicators}}
{{/agents}}

### ProjectContext Debugging

\`\`\`bash
# Check project context health
curl http://localhost:{{port}}/api/debug/project-context/health

# View shared state
curl http://localhost:{{port}}/api/debug/project-context/state/{{projectId}}

# Check task coordination
curl http://localhost:{{port}}/api/debug/project-context/tasks/{{projectId}}
\`\`\`
{{/agents}}

## 🔍 Common Issues & Solutions

{{#commonProblems}}
### {{category}}

{{#problems}}
#### {{title}}

**Symptoms**:
{{#symptoms}}
- {{.}}
{{/symptoms}}

**30-Minute Debugging Steps**:
{{#debuggingSteps}}
{{step}}. **{{action}}** ({{timeEstimate}} min)
   \`\`\`bash
   {{command}}
   \`\`\`
   Expected: {{expected}}
{{/debuggingSteps}}

**Alternative Approaches** (if 30-min exceeded):
{{#alternatives}}
- **{{approach}}**: {{description}}
  \`\`\`bash
  {{command}}
  \`\`\`
{{/alternatives}}

**Prevention**:
{{#prevention}}
- {{.}}
{{/prevention}}
{{/problems}}
{{/commonProblems}}

## 🚨 Emergency Procedures

### System Unresponsive

1. **Immediate Actions** (< 5 minutes):
   \`\`\`bash
   # Check system health
   curl http://localhost:{{port}}/health
   
   # Check critical services
   {{#criticalServices}}
   curl http://localhost:{{../port}}/api/debug/{{service}}/health
   {{/criticalServices}}
   \`\`\`

2. **Recovery Steps**:
   \`\`\`bash
   # Restart development server
   npm run dev:restart
   
   # Clear caches
   npm run cache:clear
   
   # Reset database (development only)
   npm run db:reset
   \`\`\`

3. **Fallback Approach**:
   \`\`\`bash
   # Switch to minimal mode
   npm run dev:minimal
   \`\`\`

{{#agents}}
### Agent System Failure

1. **Quick Assessment**:
   \`\`\`bash
   # Check Redis connectivity
   npm run test:redis
   
   # Verify agent factory
   npm run test:agent-factory
   
   # Check UEP system
   npm run test:uep
   \`\`\`

2. **Recovery Sequence**:
   \`\`\`bash
   # Restart agent system
   npm run agents:restart
   
   # Reinitialize project context
   npm run project-context:reset
   
   # Verify system integrity
   npm run system:validate
   \`\`\`

3. **Fallback Mode**:
   \`\`\`bash
   # Run without agents (manual mode)
   npm run dev:no-agents
   \`\`\`
{{/agents}}

## 🔬 Advanced Debugging

### Performance Profiling

\`\`\`bash
# CPU profiling
npm run profile:cpu

# Memory profiling
npm run profile:memory

# Network profiling
npm run profile:network
\`\`\`

### Database Debugging

{{#databases}}
{{#databases}}
#### {{name}} Database

\`\`\`bash
# Check connection
{{connectionTestCommand}}

# Query performance
{{performanceTestCommand}}

# Data integrity
{{integrityCheckCommand}}
\`\`\`
{{/databases}}
{{/databases}}

### API Debugging

{{#apis}}
{{#apis}}
#### {{name}} API

\`\`\`bash
# Test connectivity
curl -H "Authorization: Bearer ${{name.toUpperCase()}}_API_KEY" {{baseUrl}}/health

# Check rate limits
curl -I {{baseUrl}}/{{endpoints.0.path}}

# Validate responses
{{validationCommand}}
\`\`\`
{{/apis}}
{{/apis}}

## 📊 Monitoring & Observability

### Logging

**Log Levels**:
\`\`\`bash
# Set debug logging
export LOG_LEVEL=debug

# Component-specific logging
export AGENT_LOG_LEVEL=verbose
export DB_LOG_LEVEL=info
\`\`\`

**Log Locations**:
- Application: \`logs/app.log\`
{{#agents}}
- Agents: \`logs/agents/\`
{{/agents}}
- Errors: \`logs/errors.log\`

### Metrics Collection

\`\`\`bash
# Enable metrics
export ENABLE_METRICS=true

# View metrics
curl http://localhost:{{port}}/metrics

# Export metrics
npm run metrics:export
\`\`\`

## 🛠️ Development Tools

### Useful Commands

\`\`\`bash
# Full system health check
npm run health-check

# Component test suite
npm run test:components

# Integration test suite
npm run test:integration

# Performance benchmarks
npm run benchmark

# Code analysis
npm run analyze
\`\`\`

### IDE Configuration

{{#ideConfigurations}}
#### {{ide}}

**Debugging Configuration**:
\`\`\`json
{{debugConfig}}
\`\`\`

**Recommended Extensions**:
{{#extensions}}
- {{name}}: {{description}}
{{/extensions}}
{{/ideConfigurations}}

## 📝 Debugging Checklist

Before starting any debugging session:

- [ ] ⏰ Set 30-minute timer
- [ ] 📝 Document the issue clearly
- [ ] 🔍 Check system health endpoints
- [ ] 📊 Verify metrics and logs
- [ ] 🧪 Reproduce issue in isolation
- [ ] 📋 Have alternative approaches ready

During debugging:

- [ ] 🎯 Focus on systematic approach (not random changes)
- [ ] 📊 Monitor metrics continuously
- [ ] 📝 Document findings and attempts
- [ ] ⏰ Check timer regularly
- [ ] 🚦 Stop at 30 minutes regardless of progress

After debugging:

- [ ] 📝 Document solution or alternative chosen
- [ ] 🧪 Add tests to prevent recurrence
- [ ] 📊 Update monitoring if needed
- [ ] 🔄 Share learnings with team

---

{{#followAgentMethodology}}
*Following the 30-Minute Rule from [Agent-Driven Development](./docs/agent_driven_development_methodology.md)*
{{/followAgentMethodology}}

{{#metadata.autoGenerated}}
*Auto-generated by Documentation Template Engine*
{{/metadata.autoGenerated}}

*Last updated: {{lastUpdated}}*`;
  }

  private getParameterMappingTemplate(): string {
    return `# Parameter Mapping Reference

Complete parameter flow documentation for {{projectName}} integration points.

{{#followAgentMethodology}}
## 📋 Parameter Flow Principle

As per Agent-Driven Development methodology:

> **All data transformations and integration points must be explicitly documented and validated.**

This document maps ALL parameters between system components to ensure bulletproof integration.
{{/followAgentMethodology}}

## 🔄 System Architecture Overview

{{#systemComponents}}
\`\`\`
{{#components}}
┌─{{name}}─┐
{{#connections}}
│ {{direction}} {{targetComponent}}
{{/connections}}
└─────────────┘
{{/components}}
\`\`\`
{{/systemComponents}}

## 📊 Parameter Flow Maps

{{#parameterFlows}}
### {{flowName}}

**Flow**: {{sourceComponent}} → {{transformations.length}} transformations → {{targetComponent}}

{{#transformations}}
#### Step {{@index}}: {{name}}

**Input Parameters**:
{{#inputParameters}}
- **{{name}}** ({{type}}){{#required}} *required*{{/required}}
  - Description: {{description}}
  - Validation: {{validation}}
  - Example: \`{{example}}\`
{{/inputParameters}}

**Transformation Logic**:
\`\`\`{{language}}
{{transformationCode}}
\`\`\`

**Output Parameters**:
{{#outputParameters}}
- **{{name}}** ({{type}}){{#required}} *required*{{/required}}
  - Description: {{description}}
  - Validation: {{validation}}
  - Example: \`{{example}}\`
{{/outputParameters}}

**Error Handling**:
{{#errorHandling}}
- **{{errorType}}**: {{description}}
  - Action: {{action}}
  - Fallback: {{fallback}}
{{/errorHandling}}
{{/transformations}}
{{/parameterFlows}}

{{#agents}}
## 🤖 Agent Parameter Mappings

{{#agents}}
### {{agentType}} Agent ({{agentId}})

#### Input Parameters
{{#inputParameters}}
| Parameter | Type | Required | Source | Validation | Example |
|-----------|------|----------|---------|------------|---------|
{{#parameters}}
| {{name}} | {{type}} | {{required}} | {{source}} | {{validation}} | \`{{example}}\` |
{{/parameters}}
{{/inputParameters}}

#### Output Parameters
{{#outputParameters}}
| Parameter | Type | Always Present | Target | Format | Example |
|-----------|------|----------------|--------|--------|---------|
{{#parameters}}
| {{name}} | {{type}} | {{alwaysPresent}} | {{target}} | {{format}} | \`{{example}}\` |
{{/parameters}}
{{/outputParameters}}

#### Agent-Specific Transformations
{{#transformations}}
**{{name}}**:
\`\`\`typescript
{{code}}
\`\`\`
{{/transformations}}
{{/agents}}
{{/agents}}

{{#apis}}
## 🔌 API Integration Mappings

{{#apis}}
### {{name}} API

**Base URL**: {{baseUrl}}
**Version**: {{version}}

{{#endpoints}}
#### {{method}} {{path}}

**Request Mapping**:
{{#requestMapping}}
- **Frontend Parameter**: \`{{frontendParam}}\`
- **API Parameter**: \`{{apiParam}}\`
- **Transformation**: {{transformation}}
- **Validation**: {{validation}}
{{/requestMapping}}

**Response Mapping**:
{{#responseMapping}}
- **API Response**: \`{{apiParam}}\`
- **Frontend Parameter**: \`{{frontendParam}}\`
- **Transformation**: {{transformation}}
- **Default Value**: {{defaultValue}}
{{/responseMapping}}

**Error Mapping**:
{{#errorMapping}}
- **API Error**: {{apiError}} ({{statusCode}})
- **User Message**: "{{userMessage}}"
- **Internal Code**: {{internalCode}}
- **Recovery Action**: {{recoveryAction}}
{{/errorMapping}}
{{/endpoints}}
{{/apis}}
{{/apis}}

{{#databases}}
## 🗄️ Database Parameter Mappings

{{#databases}}
### {{name}} Database

{{#tables}}
#### {{tableName}} Table

**Schema Mapping**:
{{#fields}}
| Database Field | Application Property | Type | Transformation | Validation |
|----------------|---------------------|------|----------------|------------|
{{#mappings}}
| {{dbField}} | {{appProperty}} | {{type}} | {{transformation}} | {{validation}} |
{{/mappings}}
{{/fields}}

**Query Parameter Mappings**:
{{#queryMappings}}
**{{queryName}}**:
\`\`\`sql
{{sqlQuery}}
\`\`\`

Input Parameters:
{{#inputParams}}
- \`{{param}}\`: {{description}} ({{validation}})
{{/inputParams}}

Result Mapping:
{{#resultMapping}}
- \`{{dbColumn}}\` → \`{{appProperty}}\`: {{transformation}}
{{/resultMapping}}
{{/queryMappings}}
{{/tables}}
{{/databases}}
{{/databases}}

## 🔒 Validation Rules

### Universal Validation Rules

{{#universalValidationRules}}
{{#rules}}
#### {{name}}

**Applies to**: {{appliesTo.join(', ')}}

**Rule**: {{rule}}

**Implementation**:
\`\`\`{{language}}
{{implementation}}
\`\`\`

**Error Message**: "{{errorMessage}}"

**Examples**:
{{#examples}}
- Valid: \`{{validExample}}\`
- Invalid: \`{{invalidExample}}\` → {{errorMessage}}
{{/examples}}
{{/rules}}
{{/universalValidationRules}}

### Component-Specific Validation

{{#componentValidation}}
{{#components}}
#### {{componentName}}

{{#validationRules}}
**{{ruleName}}**:
- Pattern: \`{{pattern}}\`
- Message: "{{message}}"
- Severity: {{severity}}
{{/validationRules}}
{{/components}}
{{/componentValidation}}

## 🧪 Integration Testing

### Parameter Flow Tests

{{#integrationTests}}
{{#tests}}
#### {{testName}}

**Test Flow**: {{flow}}

**Test Cases**:
\`\`\`{{language}}
{{testCode}}
\`\`\`

**Expected Results**:
{{#expectedResults}}
- Input: \`{{input}}\`
- Expected Output: \`{{expectedOutput}}\`
- Validation: {{validation}}
{{/expectedResults}}
{{/tests}}
{{/integrationTests}}

### Automated Testing Commands

\`\`\`bash
# Run all parameter mapping tests
npm run test:parameter-mapping

# Test specific component integration
npm run test:integration {{componentName}}

# Validate parameter transformations
npm run test:transformations

# End-to-end parameter flow testing
npm run test:e2e-parameters
\`\`\`

## 🚨 Error Handling Matrix

{{#errorHandlingMatrix}}
| Error Type | Component | Parameter | Error Code | User Message | Recovery Action |
|------------|-----------|-----------|------------|--------------|-----------------|
{{#errorMappings}}
| {{errorType}} | {{component}} | {{parameter}} | {{errorCode}} | {{userMessage}} | {{recoveryAction}} |
{{/errorMappings}}
{{/errorHandlingMatrix}}

## 📈 Performance Considerations

### Parameter Size Limits

{{#performanceConstraints}}
{{#components}}
#### {{componentName}}

{{#constraints}}
- **{{parameterName}}**: Max {{maxSize}} {{unit}} ({{reason}})
{{/constraints}}
{{/components}}
{{/performanceConstraints}}

### Optimization Guidelines

{{#optimizationGuidelines}}
{{#guidelines}}
#### {{category}}

{{#rules}}
- **{{rule}}**: {{description}}
  - Implementation: {{implementation}}
  - Performance Impact: {{performanceImpact}}
{{/rules}}
{{/guidelines}}
{{/optimizationGuidelines}}

## 🔍 Debugging Parameter Issues

### Debug Commands

\`\`\`bash
# Trace parameter flow for specific request
npm run debug:trace-params --request-id=<id>

# Validate current parameter mappings
npm run debug:validate-mappings

# Check parameter transformation performance
npm run debug:param-performance

# Generate parameter flow diagram
npm run debug:flow-diagram
\`\`\`

### Debug Endpoints

{{#debugEndpoints}}
{{#endpoints}}
#### {{method}} {{path}}

**Purpose**: {{purpose}}

**Example**:
\`\`\`bash
curl -X {{method}} http://localhost:{{../port}}{{path}}?{{exampleParams}}
\`\`\`

**Response**:
\`\`\`json
{{exampleResponse}}
\`\`\`
{{/endpoints}}
{{/debugEndpoints}}

## 📚 Reference

### Type Definitions

\`\`\`typescript
{{typeDefinitions}}
\`\`\`

### Utility Functions

\`\`\`typescript
{{utilityFunctions}}
\`\`\`

## ✅ Validation Checklist

When adding new parameter mappings:

- [ ] 📝 Document input parameters with types and validation
- [ ] 🔄 Define transformation logic clearly
- [ ] 📤 Document output parameters with examples
- [ ] 🚨 Define error handling and fallback behavior
- [ ] 🧪 Add integration tests for the parameter flow
- [ ] 📊 Consider performance implications
- [ ] 🔍 Add debug endpoints if needed
- [ ] 📋 Update this documentation

---

{{#followAgentMethodology}}
*Following Parameter Flow Discipline from [Agent-Driven Development](./docs/agent_driven_development_methodology.md)*
{{/followAgentMethodology}}

{{#metadata.autoGenerated}}
*Auto-generated by Documentation Template Engine*
{{/metadata.autoGenerated}}

*Last updated: {{lastUpdated}}*`;
  }

  private getAPIReferenceTemplate(): string {
    return `# API Reference

Complete API documentation for {{projectName}}.

{{#apis}}
{{#apis}}
## {{name}} API

**Version**: {{version}}
**Base URL**: {{baseUrl}}

{{description}}

### Authentication

{{#authentication}}
{{#type}}
{{#equals type "bearer"}}
Use Bearer token in the Authorization header:

\`\`\`http
Authorization: Bearer YOUR_API_TOKEN
\`\`\`
{{/equals}}

{{#equals type "api-key"}}
Use API key in the {{header}} header:

\`\`\`http
{{header}}: YOUR_API_KEY
\`\`\`
{{/equals}}

{{#equals type "oauth"}}
OAuth 2.0 authentication required. See [Authentication Guide](./auth.md) for details.
{{/equals}}
{{/type}}
{{/authentication}}

### Rate Limiting

{{#rateLimiting}}
- **Requests per minute**: {{requestsPerMinute}}
- **Requests per hour**: {{requestsPerHour}}
- **Burst limit**: {{burstLimit}}

Rate limit headers:
- \`X-RateLimit-Limit\`: Request limit
- \`X-RateLimit-Remaining\`: Remaining requests
- \`X-RateLimit-Reset\`: Reset time (Unix timestamp)
{{/rateLimiting}}

### Endpoints

{{#endpoints}}
#### {{method}} {{path}}

{{description}}

{{#parameters}}
**Parameters**:

{{#pathParameters}}
##### Path Parameters
{{#pathParameters}}
- **{{name}}** ({{type}}) - {{description}}
{{/pathParameters}}
{{/pathParameters}}

{{#queryParameters}}
##### Query Parameters
{{#queryParameters}}
- **{{name}}** ({{type}}){{#required}} *required*{{/required}} - {{description}}
  {{#example}}Example: \`{{example}}\`{{/example}}
{{/queryParameters}}
{{/queryParameters}}

{{#bodyParameters}}
##### Request Body
{{#bodyParameters}}
\`\`\`json
{{schema}}
\`\`\`

{{#fields}}
- **{{name}}** ({{type}}){{#required}} *required*{{/required}} - {{description}}
{{/fields}}
{{/bodyParameters}}
{{/bodyParameters}}
{{/parameters}}

**Example Request**:
\`\`\`http
{{method}} {{../baseUrl}}{{path}}{{#queryExample}}?{{queryExample}}{{/queryExample}}
{{#authHeader}}{{authHeader}}{{/authHeader}}
Content-Type: application/json

{{#bodyExample}}
{{bodyExample}}
{{/bodyExample}}
\`\`\`

**Responses**:

{{#responses}}
##### {{status}} {{statusText}}

{{description}}

\`\`\`json
{{example}}
\`\`\`

{{#schema}}
**Schema**:
\`\`\`json
{{schema}}
\`\`\`
{{/schema}}
{{/responses}}

**Example Response**:
\`\`\`http
HTTP/1.1 {{responses.0.status}} {{responses.0.statusText}}
Content-Type: application/json

{{responses.0.example}}
\`\`\`
{{/endpoints}}
{{/apis}}
{{/apis}}

{{#agents}}
## Agent API Reference

{{#agents}}
### {{agentType}} Agent

**Agent ID**: {{agentId}}
**Status**: {{status}}
**Capabilities**: {{capabilities.join(', ')}}

#### Agent Endpoints

##### POST /api/agents/{{agentId}}/execute

Execute a task with this agent.

**Request Body**:
\`\`\`json
{
  "taskId": "string",
  "description": "string",
  "priority": "high|medium|low",
  "context": {
    "projectId": "string",
    "sessionId": "string",
    "previousTasks": ["string"]
  },
  "parameters": {}
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "taskId": "string",
  "agentId": "{{agentId}}",
  "result": {},
  "performance": {
    "duration": 1500,
    "complianceScore": 0.95
  },
  "metadata": {}
}
\`\`\`

##### GET /api/agents/{{agentId}}/status

Get current agent status and metrics.

**Response**:
\`\`\`json
{
  "agentId": "{{agentId}}",
  "agentType": "{{agentType}}",
  "status": "{{status}}",
  "workload": {{workload}},
  "currentTask": "string|null",
  "capabilities": {{json capabilities}},
  "performance": {
    "totalTasks": 150,
    "successRate": 0.96,
    "averageResponseTime": 1200
  },
  "lastActivity": "2023-12-07T10:30:00Z"
}
\`\`\`

##### GET /api/agents/{{agentId}}/metrics

Get detailed performance metrics for this agent.

**Response**:
\`\`\`json
{
  "agentId": "{{agentId}}",
  "metrics": {
    "usageCount": 150,
    "successRate": 0.96,
    "averageProcessingTime": 1200,
    "averageComplianceScore": 0.91,
    "uptime": 3600000,
    "workloadHistory": [
      {
        "timestamp": "2023-12-07T10:00:00Z",
        "workload": 75
      }
    ]
  },
  "lastUpdated": "2023-12-07T10:30:00Z"
}
\`\`\`
{{/agents}}
{{/agents}}

## Error Handling

### Error Response Format

All API errors follow this format:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details",
      "suggestion": "How to fix this error"
    },
    "timestamp": "2023-12-07T10:30:00Z",
    "requestId": "req_123456789"
  }
}
\`\`\`

### Common Error Codes

{{#errorCodes}}
| Code | Status | Description | Resolution |
|------|--------|-------------|------------|
{{#codes}}
| {{code}} | {{status}} | {{description}} | {{resolution}} |
{{/codes}}
{{/errorCodes}}

### Error Examples

{{#errorExamples}}
#### {{title}}

**Request**:
\`\`\`http
{{request}}
\`\`\`

**Response**:
\`\`\`http
HTTP/1.1 {{status}}
Content-Type: application/json

{{response}}
\`\`\`
{{/errorExamples}}

## SDKs and Libraries

{{#sdks}}
### {{language}} SDK

**Installation**:
\`\`\`{{packageManager}}
{{installCommand}}
\`\`\`

**Usage**:
\`\`\`{{language}}
{{usageExample}}
\`\`\`

**Documentation**: [{{language}} SDK Docs]({{docsUrl}})
{{/sdks}}

## Code Examples

{{#codeExamples}}
### {{title}}

{{description}}

{{#examples}}
#### {{language}}

\`\`\`{{language}}
{{code}}
\`\`\`
{{/examples}}
{{/codeExamples}}

## Webhooks

{{#webhooks}}
### {{eventType}} Event

Triggered when {{description}}.

**Payload**:
\`\`\`json
{{payloadExample}}
\`\`\`

**Headers**:
- \`X-{{projectName}}-Event\`: {{eventType}}
- \`X-{{projectName}}-Signature\`: HMAC signature for verification

**Example Handler**:
\`\`\`javascript
{{handlerExample}}
\`\`\`
{{/webhooks}}

## Testing

### Postman Collection

Import our Postman collection for easy API testing:

[Download Postman Collection](./{{projectName}}.postman_collection.json)

### API Testing Tools

\`\`\`bash
# Test API endpoints
npm run test:api

# Load testing
npm run test:load

# Integration testing
npm run test:integration
\`\`\`

## Changelog

See [API Changelog](./API_CHANGELOG.md) for version history and breaking changes.

---

{{#metadata.autoGenerated}}
*Auto-generated by Documentation Template Engine*
{{/metadata.autoGenerated}}

*Last updated: {{lastUpdated}}*`;
  }

  private getAgentDocumentationTemplate(): string {
    return `# Agent Documentation

{{#agents}}
{{#agents}}
# {{agentType}} Agent

**Agent ID**: {{agentId}}
**Status**: {{status}}
**Current Workload**: {{workload}}%

## Overview

{{description}}

### Capabilities

{{#capabilities}}
- **{{.}}**
{{/capabilities}}

### Current Status

- **Status**: {{status}}
- **Current Task**: {{#currentTaskId}}{{currentTaskId}}{{/currentTaskId}}{{^currentTaskId}}None{{/currentTaskId}}
- **Session**: {{sessionId}}
- **Started**: {{startedAt}}
- **Last Activity**: {{lastActivity}}

## Usage

### Basic Usage

\`\`\`javascript
const agent = await agentFactory.getAgent('{{agentId}}');

const result = await agent.execute({
  taskId: 'task-123',
  description: 'Task description',
  priority: 'high',
  context: {
    projectId: 'project-456',
    sessionId: 'session-789'
  }
});
\`\`\`

### Advanced Configuration

\`\`\`javascript
const agent = await agentFactory.createAgent('{{agentType}}', 'custom-agent-id', {
  capabilities: {{json capabilities}},
  workloadThreshold: 80,
  timeout: 30000,
  metadata: {
    customProperty: 'value'
  }
});
\`\`\`

## API Reference

### Execute Task

Execute a task with this agent.

**Method**: \`POST /api/agents/{{agentId}}/execute\`

**Request**:
\`\`\`json
{
  "taskId": "string",
  "description": "string",
  "priority": "high|medium|low",
  "context": {
    "projectId": "string",
    "sessionId": "string"
  },
  "parameters": {}
}
\`\`\`

**Response**:
\`\`\`json
{
  "success": true,
  "taskId": "string",
  "result": {},
  "performance": {
    "duration": 1500,
    "complianceScore": 0.95
  }
}
\`\`\`

### Get Status

Get current agent status.

**Method**: \`GET /api/agents/{{agentId}}/status\`

**Response**:
\`\`\`json
{
  "agentId": "{{agentId}}",
  "status": "{{status}}",
  "workload": {{workload}},
  "capabilities": {{json capabilities}},
  "lastActivity": "{{lastActivity}}"
}
\`\`\`

## Performance Metrics

{{#performanceMetrics}}
### Current Performance

- **Total Tasks**: {{totalTasks}}
- **Success Rate**: {{successRate}}%
- **Average Response Time**: {{averageResponseTime}}ms
- **Compliance Score**: {{complianceScore}}

### Performance History

\`\`\`
Recent Performance (Last 10 Tasks):
{{#recentTasks}}
{{timestamp}}: {{duration}}ms ({{success}})
{{/recentTasks}}
\`\`\`
{{/performanceMetrics}}

## Configuration

### Agent Configuration

\`\`\`json
{{json metadata}}
\`\`\`

### Environment Variables

{{#environmentVariables}}
- **{{name}}**: {{description}}
  - Default: \`{{defaultValue}}\`
  - Required: {{required}}
{{/environmentVariables}}

## Troubleshooting

### Common Issues

{{#commonIssues}}
#### {{issue}}

**Symptoms**: {{symptoms}}

**Solution**:
{{#solutions}}
{{step}}. {{description}}
   \`\`\`bash
   {{command}}
   \`\`\`
{{/solutions}}

**Prevention**: {{prevention}}
{{/commonIssues}}

### Debug Commands

\`\`\`bash
# Check agent health
curl http://localhost:3000/api/debug/agents/{{agentId}}/health

# View agent logs
npm run logs:agent {{agentId}}

# Test agent isolation
npm run test:agent {{agentId}}

# Reset agent state
npm run agents:reset {{agentId}}
\`\`\`

### Performance Tuning

{{#performanceTuning}}
#### {{category}}

{{#recommendations}}
- **{{recommendation}}**: {{description}}
  - Configuration: \`{{configuration}}\`
  - Expected Improvement: {{improvement}}
{{/recommendations}}
{{/performanceTuning}}

## Examples

### Example 1: Basic Task Execution

\`\`\`javascript
// Execute a simple task
const result = await agent.execute({
  taskId: 'example-task-1',
  description: 'Process user data',
  parameters: {
    userId: '12345',
    action: 'validate'
  }
});

console.log('Task completed:', result.success);
console.log('Result:', result.result);
\`\`\`

### Example 2: Complex Workflow

\`\`\`javascript
// Execute with context and dependencies
const result = await agent.execute({
  taskId: 'complex-workflow',
  description: 'Multi-step data processing',
  context: {
    projectId: 'proj-789',
    sessionId: 'sess-456',
    previousTasks: ['task-1', 'task-2']
  },
  parameters: {
    inputData: {
      source: 'database',
      filters: ['active', 'verified']
    },
    outputFormat: 'json'
  }
});
\`\`\`

### Example 3: Error Handling

\`\`\`javascript
try {
  const result = await agent.execute({
    taskId: 'error-example',
    description: 'Task that might fail',
    parameters: { /* parameters */ }
  });
  
  if (!result.success) {
    console.error('Task failed:', result.error);
    // Handle failure case
  }
} catch (error) {
  console.error('Agent execution error:', error);
  // Handle system error
}
\`\`\`

## Integration

### With ProjectContext

\`\`\`javascript
// Register agent with project context
await projectContext.registerAgent('{{agentId}}', {
  agentType: '{{agentType}}',
  capabilities: {{json capabilities}},
  metadata: { /* agent metadata */ }
});

// Agent automatically receives project events
agent.on('projectEvent', (event) => {
  console.log('Received project event:', event.type);
});
\`\`\`

### With Other Agents

\`\`\`javascript
// Coordinate with other agents
const coordination = await agentFactory.coordinate([
  '{{agentId}}',
  'other-agent-id'
], {
  task: 'collaborative-task',
  strategy: 'parallel'
});
\`\`\`

## Testing

### Unit Tests

\`\`\`bash
# Run agent-specific tests
npm run test:agent {{agentId}}

# Run capability tests
npm run test:capabilities {{agentId}}

# Run performance tests
npm run test:performance {{agentId}}
\`\`\`

### Integration Tests

\`\`\`bash
# Test agent integration
npm run test:integration:agent {{agentId}}

# Test with project context
npm run test:integration:context {{agentId}}

# Test coordination with other agents
npm run test:coordination {{agentId}}
\`\`\`

## Changelog

### Recent Changes

{{#changelog}}
- **{{date}}**: {{description}} ({{changeType}})
{{/changelog}}

See [Full Agent Changelog](./AGENT_CHANGELOG.md) for complete history.

---

{{#metadata.autoGenerated}}
*Auto-generated by Documentation Template Engine*
{{/metadata.autoGenerated}}

*Last updated: {{lastUpdated}}*
{{/agents}}
{{/agents}}`;
  }

  // Template variable definitions and validation rules would continue...
  // This is a comprehensive template system with all the necessary components

  private getReadmeVariables(): TemplateVariable[] {
    return [
      { name: 'projectName', type: 'string', required: true, description: 'Project name' },
      { name: 'projectDescription', type: 'string', required: false, description: 'Project description' },
      { name: 'projectType', type: 'string', required: false, description: 'Type of project' },
      { name: 'agents', type: 'array', required: false, description: 'List of agents' },
      { name: 'technologies', type: 'array', required: false, description: 'Technology stack' },
      { name: 'followAgentMethodology', type: 'boolean', required: false, description: 'Follow ADD methodology' }
    ];
  }

  private getReadmeValidationRules(): ValidationRule[] {
    return [
      { rule: 'hasTitle', severity: 'error', message: 'README must have a title' },
      { rule: 'hasDescription', severity: 'warning', message: 'README should have a description' },
      { rule: 'hasQuickStart', severity: 'warning', message: 'README should have quick start section' }
    ];
  }

  // ... Additional variable and validation rule methods would be implemented here

  // Helper methods for template operations

  private async loadBuiltInTemplates(): Promise<void> {
    for (const [id, template] of this.builtInTemplates.entries()) {
      this.templates.set(id, template);
    }
    this.log(`📚 Loaded ${this.builtInTemplates.size} built-in templates`, 'debug');
  }

  private async loadCustomTemplates(): Promise<void> {
    try {
      const templateFiles = await fs.readdir(this.config.templatesDirectory);
      
      for (const file of templateFiles) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(this.config.templatesDirectory, file);
          const templateData = await fs.readJson(templatePath);
          this.templates.set(templateData.templateId, templateData);
        }
      }

      this.log(`📁 Loaded custom templates from ${this.config.templatesDirectory}`, 'debug');

    } catch (error) {
      this.log(`⚠️  Could not load custom templates: ${error.message}`, 'debug');
    }
  }

  private getTemplate(templateId: string): DocumentationTemplate | null {
    return this.templates.get(templateId) || null;
  }

  private async enrichContext(context: TemplateGenerationContext, template: DocumentationTemplate): Promise<Record<string, any>> {
    const enriched = { ...context };

    // Add intelligent generation if enabled
    if (this.config.enableIntelligentGeneration) {
      // Add computed properties based on context
      enriched.lastUpdated = new Date().toISOString();
      enriched.metadata = { ...enriched.metadata, autoGenerated: true };
      
      // Add framework compliance flags
      if (this.config.include5DocumentFramework) {
        enriched.include5DocumentFramework = true;
      }
      
      if (this.config.followAgentMethodology) {
        enriched.followAgentMethodology = true;
      }
    }

    return enriched;
  }

  private validateTemplateVariables(template: DocumentationTemplate, context: Record<string, any>): { warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const variable of template.variables) {
      if (variable.required && !(variable.name in context)) {
        errors.push(`Required variable missing: ${variable.name}`);
      }
      
      if (variable.name in context) {
        const value = context[variable.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (actualType !== variable.type) {
          warnings.push(`Variable ${variable.name} expected type ${variable.type}, got ${actualType}`);
        }
      }
    }

    return { warnings, errors };
  }

  private async renderTemplate(template: DocumentationTemplate, context: Record<string, any>): Promise<string> {
    // Use Mustache for template rendering
    return Mustache.render(template.template, context);
  }

  private determineOutputPath(template: DocumentationTemplate, context: TemplateGenerationContext): string {
    const filename = template.documentType;
    return path.join(this.config.outputDirectory, filename);
  }

  private async validateGeneratedContent(content: string, template: DocumentationTemplate): Promise<{ warnings: string[]; errors: string[] } > {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Basic content validation
    if (content.length < 100) {
      warnings.push('Generated content is very short');
    }

    // Check for required sections
    for (const section of template.requiredSections) {
      if (!content.includes(section)) {
        warnings.push(`Required section missing: ${section}`);
      }
    }

    return { warnings, errors };
  }

  private log(message: string, level: 'debug' | 'info' | 'error' = 'info'): void {
    if (this.config.logLevel === 'silent') return;
    if (this.config.logLevel === 'minimal' && level === 'debug') return;
    if (this.config.logLevel === 'verbose' && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'debug' ? '🔍' : 'ℹ️';
    console.log(`${timestamp} ${prefix} [DocumentationTemplateEngine] ${message}`);
  }

  // Additional helper methods for the complete template system...
  private getChangelogVariables(): TemplateVariable[] { return []; }
  private getChangelogValidationRules(): ValidationRule[] { return []; }
  private getEnvironmentSetupVariables(): TemplateVariable[] { return []; }
  private getEnvironmentSetupValidationRules(): ValidationRule[] { return []; }
  private getDebuggingGuideVariables(): TemplateVariable[] { return []; }
  private getDebuggingGuideValidationRules(): ValidationRule[] { return []; }
  private getParameterMappingVariables(): TemplateVariable[] { return []; }
  private getParameterMappingValidationRules(): ValidationRule[] { return []; }
  private getAPIReferenceVariables(): TemplateVariable[] { return []; }
  private getAPIReferenceValidationRules(): ValidationRule[] { return []; }
  private getAgentDocumentationVariables(): TemplateVariable[] { return []; }
  private getAgentDocumentationValidationRules(): ValidationRule[] { return []; }
}

export default DocumentationTemplateEngine;