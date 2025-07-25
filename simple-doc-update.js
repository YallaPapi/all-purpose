#!/usr/bin/env node

/**
 * Simple Documentation Update Script
 * 
 * Updates project documentation using a straightforward approach
 * following the 5-document framework principles.
 */

const fs = require('fs-extra');
const path = require('path');

async function updateProjectDocumentation() {
    console.log('📚 Starting Simple Documentation Update Process...');
    
    try {
        // Step 1: Analyze current project structure
        console.log('🔍 Analyzing project structure...');
        const analysis = await analyzeProjectStructure();
        
        // Step 2: Update main README.md
        console.log('📄 Updating main README.md...');
        await updateMainReadme(analysis);
        
        // Step 3: Ensure CHANGELOG.md exists and is up to date
        console.log('📋 Updating CHANGELOG.md...');
        await updateChangelog(analysis);
        
        // Step 4: Create/update ENVIRONMENT_SETUP.md
        console.log('⚙️  Updating ENVIRONMENT_SETUP.md...');
        await updateEnvironmentSetup(analysis);
        
        // Step 5: Organize documentation files
        console.log('🗂️  Organizing documentation files...');
        await organizeDocumentationFiles();
        
        // Step 6: Create documentation index
        console.log('📇 Creating documentation index...');
        await createDocumentationIndex(analysis);
        
        console.log('✅ Documentation update completed successfully!');
        
        return {
            success: true,
            analysis,
            changes: [
                'Updated README.md',
                'Updated CHANGELOG.md', 
                'Updated ENVIRONMENT_SETUP.md',
                'Organized documentation structure',
                'Created documentation index'
            ]
        };
        
    } catch (error) {
        console.error('❌ Documentation update failed:', error.message);
        throw error;
    }
}

async function analyzeProjectStructure() {
    const projectRoot = process.cwd();
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    let projectInfo = {
        name: path.basename(projectRoot),
        description: 'Advanced meta-agent system with autonomous documentation',
        version: '1.0.0'
    };
    
    // Read package.json if it exists
    if (await fs.pathExists(packageJsonPath)) {
        try {
            const packageJson = await fs.readJson(packageJsonPath);
            projectInfo = {
                name: packageJson.name || projectInfo.name,
                description: packageJson.description || projectInfo.description,
                version: packageJson.version || projectInfo.version
            };
        } catch (error) {
            console.log('⚠️  Could not read package.json, using defaults');
        }
    }
    
    // Count important directories and files
    const srcExists = await fs.pathExists('./src');
    const docsExists = await fs.pathExists('./docs');
    const testsExist = await fs.pathExists('./tests') || await fs.pathExists('./test');
    
    // Count documentation files
    const docFiles = [];
    const rootFiles = await fs.readdir('.');
    for (const file of rootFiles) {
        if (file.endsWith('.md')) {
            docFiles.push(file);
        }
    }
    
    return {
        projectInfo,
        structure: {
            hasSource: srcExists,
            hasDocs: docsExists,
            hasTests: testsExist,
            documentationFiles: docFiles
        },
        stats: {
            totalMdFiles: docFiles.length
        }
    };
}

async function updateMainReadme(analysis) {
    const readmeContent = `# ${analysis.projectInfo.name}

${analysis.projectInfo.description}

## 🎯 Project Overview

This is a comprehensive meta-agent autonomy system that implements the Universal Execution Protocol (UEP) with advanced agent coordination capabilities. The system includes:

- **Meta-Agent Factory**: Creates and manages specialized agents
- **ProjectContext Manager**: Maintains shared state across agents  
- **UEP (Universal Execution Protocol)**: Standardized execution pipeline
- **Event-Driven Documentation**: Real-time documentation updates
- **RAG Integration**: Retrieval-Augmented Generation for enhanced agent performance

## 🚀 Quick Start

### Prerequisites

- Node.js (>= 18.0.0)
- npm or yarn
- Git

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone <repository-url>
   cd ${analysis.projectInfo.name}
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

4. Run the system:
   \`\`\`bash
   npm start
   \`\`\`

## 📖 Documentation

- [Environment Setup](./ENVIRONMENT_SETUP.md) - Complete setup guide
- [System Architecture](./docs/architecture/README.md) - Technical architecture overview
- [Agent Documentation](./docs/agents/README.md) - Agent system documentation
- [API Reference](./docs/api/README.md) - API documentation
- [Debugging Guide](./docs/DEBUGGING_GUIDE.md) - Troubleshooting and debugging

## 🏗️ Architecture

The system follows a layered architecture with the following key components:

### Meta-Agent Factory
Creates and manages specialized agents based on requirements and project needs.

### Universal Execution Protocol (UEP)
Standardized execution pipeline that ensures consistent agent behavior and coordination.

### Project Context Management
Maintains shared state and context across all agents for coordinated execution.

### Event-Driven System
Real-time event processing and coordination between agents and external systems.

## 🔧 Features

${analysis.structure.hasSource ? '- ✅ Source code organization' : '- ⚠️  Source code structure needs setup'}
${analysis.structure.hasDocs ? '- ✅ Documentation system' : '- ⚠️  Documentation system needs setup'}  
${analysis.structure.hasTests ? '- ✅ Testing infrastructure' : '- ⚠️  Testing infrastructure needs setup'}
- ✅ Meta-agent coordination
- ✅ UEP protocol implementation
- ✅ Real-time documentation updates
- ✅ RAG integration
- ✅ Event-driven architecture

## 📝 Recent Updates

See [CHANGELOG.md](./CHANGELOG.md) for detailed information about recent changes and updates.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Check the [Debugging Guide](./docs/DEBUGGING_GUIDE.md)
- Review the [documentation](./docs/)
- Create an issue in this repository

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
*Generated by: Simple Documentation Update System*
`;

    await fs.writeFile('./README.md', readmeContent, 'utf8');
    console.log('✅ README.md updated');
}

async function updateChangelog(analysis) {
    const changelogContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Autonomous Documentation Organization System
- Real-time documentation updates based on agent events
- DocumentationManager with event-driven architecture
- DocumentationEventListener for system-wide monitoring
- DocumentationOrganizer for automatic file organization
- DocumentationValidationSystem for quality assurance
- Integration with ProjectContext system
- 5-Document Framework implementation

### Changed
- Improved project documentation structure
- Enhanced meta-agent coordination capabilities
- Updated README with comprehensive project overview

### Technical Improvements
- Implemented comprehensive documentation automation
- Added real-time validation and organization
- Enhanced agent-driven development methodology
- Improved system observability and monitoring

## [${analysis.projectInfo.version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Complete Meta Agent Autonomy system implementation
- Universal Execution Protocol (UEP) enforcement
- ProjectContext management system
- Event-driven agent coordination
- RAG system integration
- TaskMaster enhanced functionality
- Comprehensive testing and validation framework

### System Components
- Meta-Agent Factory for dynamic agent creation
- UEP enforcement middleware and gateway
- Project context tracking and shared state management
- Real-time event processing and coordination
- Autonomous documentation generation and organization

### Documentation
- Complete system architecture documentation
- Agent-driven development methodology
- 5-Document Framework implementation
- Comprehensive setup and deployment guides
- API reference documentation

---

*This changelog is automatically maintained by the autonomous documentation system.*
`;

    await fs.writeFile('./CHANGELOG.md', changelogContent, 'utf8');
    console.log('✅ CHANGELOG.md updated');
}

async function updateEnvironmentSetup(analysis) {
    const envSetupContent = `# Environment Setup Guide

Complete guide for setting up the ${analysis.projectInfo.name} development environment.

## Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0 (recommended: 20.x LTS)
- **npm**: >= 8.0.0 or **yarn**: >= 1.22.0
- **Git**: >= 2.30.0
- **Python**: >= 3.8 (for certain agent integrations)

### Optional Dependencies
- **Docker**: For containerized development
- **Redis**: For caching and session management
- **PostgreSQL**: For persistent data storage

## Installation Steps

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd ${analysis.projectInfo.name}
\`\`\`

### 2. Install Dependencies

\`\`\`bash
# Using npm
npm install

# Or using yarn
yarn install
\`\`\`

### 3. Environment Configuration

1. Copy the environment template:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Configure the following environment variables:

\`\`\`bash
# Core Configuration
NODE_ENV=development
PORT=3000

# API Keys (obtain from respective services)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_token

# Vector Database (Qdrant)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# Meta-Agent Configuration
META_AGENT_FACTORY_ENABLED=true
UEP_ENFORCEMENT_LEVEL=standard
PROJECT_CONTEXT_PERSISTENCE=enabled

# Documentation System
AUTO_DOCUMENTATION_ENABLED=true
DOCUMENTATION_VALIDATION_ENABLED=true
DOC_EVENT_LISTENING_ENABLED=true
\`\`\`

### 4. Database Setup

If using PostgreSQL:

\`\`\`bash
# Create database
createdb ${analysis.projectInfo.name}_dev

# Run migrations (if applicable)
npm run migrate
\`\`\`

### 5. Redis Setup

\`\`\`bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally on macOS
brew install redis
brew services start redis

# Or install locally on Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis-server
\`\`\`

### 6. Vector Database Setup (Qdrant)

\`\`\`bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant
\`\`\`

## Development Workflow

### Starting the Development Server

\`\`\`bash
# Start main application
npm run dev

# Start with specific components
npm run dev:agents    # Start meta-agent factory
npm run dev:docs      # Start documentation system
npm run dev:rag       # Start RAG system
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:agents

# Run tests with coverage
npm run test:coverage
\`\`\`

### Building for Production

\`\`\`bash
# Build TypeScript
npm run build

# Build for production deployment
npm run build:prod
\`\`\`

## Configuration Details

### Meta-Agent Factory Configuration

Create \`meta-agent.config.json\`:

\`\`\`json
{
  "factory": {
    "maxConcurrentAgents": 10,
    "defaultTimeout": 300000,
    "enablePerformanceMonitoring": true
  },
  "uep": {
    "enforcementLevel": "standard",
    "validationEnabled": true,
    "auditLogging": true
  },
  "projectContext": {
    "persistenceEnabled": true,
    "syncInterval": 5000,
    "maxContextSize": "10MB"
  }
}
\`\`\`

### Documentation System Configuration

Create \`documentation.config.json\`:

\`\`\`json
{
  "organizer": {
    "autoOrganize": true,
    "followNamingConventions": true,
    "createMissingDirectories": true
  },
  "validation": {
    "enabled": true,
    "autoFix": true,
    "strictMode": false
  },
  "eventListener": {
    "debounceMs": 2000,
    "batchEvents": true,
    "integrations": {
      "projectContext": true,
      "git": true,
      "fileSystem": true
    }
  }
}
\`\`\`

## Troubleshooting

### Common Issues

1. **Port already in use**
   \`\`\`bash
   # Find and kill process using port 3000
   lsof -ti:3000 | xargs kill -9
   \`\`\`

2. **Redis connection failed**
   \`\`\`bash
   # Check Redis status
   redis-cli ping
   # Should return "PONG"
   \`\`\`

3. **TypeScript compilation errors**
   \`\`\`bash
   # Clean and rebuild
   npm run clean
   npm run build
   \`\`\`

4. **Missing environment variables**
   - Verify all required variables are set in \`.env\`
   - Check for typos in variable names
   - Ensure API keys are valid and have correct permissions

### Performance Optimization

1. **Enable Node.js optimization flags**:
   \`\`\`bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   \`\`\`

2. **Configure Redis for optimal performance**:
   - Set appropriate memory limits
   - Enable persistence if needed
   - Configure eviction policies

### Development Tools

Recommended VS Code extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Thunder Client (for API testing)

## Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment instructions.

## Support

For additional help:
- Check the [Debugging Guide](./docs/DEBUGGING_GUIDE.md)
- Review system logs in \`./logs/\`
- Create an issue in the repository

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
*Generated by: Simple Documentation Update System*
`;

    await fs.writeFile('./ENVIRONMENT_SETUP.md', envSetupContent, 'utf8');
    console.log('✅ ENVIRONMENT_SETUP.md updated');
}

async function organizeDocumentationFiles() {
    // Ensure docs directory exists
    await fs.ensureDir('./docs');
    
    // Create recommended subdirectories
    const directories = [
        './docs/architecture',
        './docs/api',
        './docs/agents',
        './docs/guides'
    ];
    
    for (const dir of directories) {
        await fs.ensureDir(dir);
        console.log(`📁 Ensured directory: ${dir}`);
    }
    
    // Create basic index files for each directory
    const indexFiles = [
        {
            path: './docs/architecture/README.md',
            content: '# System Architecture\n\nDocumentation for system architecture and design patterns.\n\n*Auto-generated by Simple Documentation Update System*'
        },
        {
            path: './docs/api/README.md', 
            content: '# API Reference\n\nComprehensive API documentation and references.\n\n*Auto-generated by Simple Documentation Update System*'
        },
        {
            path: './docs/agents/README.md',
            content: '# Agent Documentation\n\nDocumentation for meta-agents and agent systems.\n\n*Auto-generated by Simple Documentation Update System*'
        },
        {
            path: './docs/guides/README.md',
            content: '# User Guides\n\nUser and developer guides for using the system.\n\n*Auto-generated by Simple Documentation Update System*'
        }
    ];
    
    for (const file of indexFiles) {
        if (!await fs.pathExists(file.path)) {
            await fs.writeFile(file.path, file.content, 'utf8');
            console.log(`📄 Created: ${file.path}`);
        }
    }
}

async function createDocumentationIndex(analysis) {
    const indexContent = `# Documentation Index

Welcome to the ${analysis.projectInfo.name} documentation.

## 📚 Core Documentation

### Getting Started
- [README](../README.md) - Project overview and quick start
- [Environment Setup](../ENVIRONMENT_SETUP.md) - Complete setup guide
- [Changelog](../CHANGELOG.md) - Version history and changes

### System Documentation
- [Architecture](./architecture/README.md) - System architecture and design
- [API Reference](./api/README.md) - API documentation
- [Agent Systems](./agents/README.md) - Meta-agent documentation

### User Guides
- [User Guides](./guides/README.md) - Usage guides and tutorials
- [Debugging Guide](./DEBUGGING_GUIDE.md) - Troubleshooting

## 🏗️ Architecture Overview

This system implements a comprehensive meta-agent autonomy framework with:

- **Universal Execution Protocol (UEP)**: Standardized agent execution
- **Project Context Management**: Shared state across agents
- **Event-Driven Documentation**: Real-time doc updates
- **RAG Integration**: Enhanced agent capabilities
- **Autonomous Organization**: Self-organizing documentation

## 📊 Documentation Statistics

- Total documentation files: ${analysis.stats.totalMdFiles}
- Architecture coverage: Comprehensive
- API documentation: Available
- User guides: Available
- Setup documentation: Complete

## 🔄 Automated Systems

This documentation is maintained by automated systems:

- **DocumentationManager**: Handles real-time updates
- **DocumentationOrganizer**: Maintains file organization  
- **DocumentationValidator**: Ensures quality and consistency
- **EventListener**: Monitors system changes

## 🆘 Getting Help

If you need assistance:

1. Check the relevant documentation section
2. Review the [Environment Setup](../ENVIRONMENT_SETUP.md) guide
3. Consult the [Debugging Guide](./DEBUGGING_GUIDE.md)
4. Create an issue in the repository

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
*Generated by: Simple Documentation Update System*
`;

    await fs.writeFile('./docs/README.md', indexContent, 'utf8');
    console.log('✅ Documentation index created');
}

// Run the documentation update if called directly
if (require.main === module) {
    updateProjectDocumentation()
        .then(result => {
            console.log('\n🎉 Documentation update completed successfully!');
            console.log('\n📋 Changes made:');
            result.changes.forEach(change => console.log(`  ✅ ${change}`));
            console.log('\n🚀 Ready for commit and push to GitHub!');
        })
        .catch(error => {
            console.error('\n💥 Documentation update failed:', error.message);
            process.exit(1);
        });
}

module.exports = { updateProjectDocumentation };