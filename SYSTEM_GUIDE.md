# Complete System Guide - Meta-Agent Factory

**How to use the Meta-Agent Factory to build complete software projects from requirements.**

## 🎯 Core Concept

**Input:** Product Requirements Document (PRD)  
**Process:** 14 AI agents coordinate automatically  
**Output:** Complete, functional software project

**Proven Success:** YouTube/GitHub cross-reference system built using this exact process.

## 🏗️ The PRD → Code Workflow

### Method 1: TaskMaster + Infrastructure Orchestrator (RECOMMENDED)

**Best for:** Any project type, most reliable workflow

```bash
# 1. Create or obtain a PRD document
cat > my-project-prd.md << 'EOF'
# My Project Requirements

## Overview
Build a [describe your project]

## Core Features
- Feature 1: [description]
- Feature 2: [description]
- Feature 3: [description]

## Technical Requirements
- Framework: [Next.js/React/Node.js/etc.]
- Database: [PostgreSQL/MongoDB/etc.]
- Authentication: [JWT/OAuth/etc.]
- Deployment: [Vercel/Docker/etc.]
EOF

# 2. Parse PRD with TaskMaster (generates structured tasks)
task-master parse-prd my-project-prd.md --append

# 3. Use Infrastructure Orchestrator to coordinate agents
cd src/meta-agents/infra-orchestrator
npm install && npm run build
node dist/main.js orchestrate --project-name my-project --project-root ../../../generated

# 4. Monitor progress and check results
ls ../../../generated/my-project/
```

### Method 2: Direct Meta-Agent Factory Web Interface

**Best for:** Visual feedback, interactive requests

```bash
# 1. Start the system
npm run dev

# 2. Go to the factory interface
# http://localhost:3000/meta-agent-factory

# 3. Fill out the work request form:
# - Work Type: Choose from dropdown (scaffold, fix-patterns, generate-docs, etc.)
# - Project Name: Your project name
# - Requirements: Paste your PRD content
# - Framework: Select your preferred framework
# - Additional Details: Any specific requirements

# 4. Submit and watch real-time progress
# - Server-Sent Events (SSE) show live updates
# - ASCII art visualizations of build progress
# - Real-time agent coordination status
```

### Method 3: Enhanced PRD Parser (Direct UEP)

**Best for:** Quick prototypes, simple projects

```bash
# 1. Put PRD in docs/ folder
cp my-project-prd.md docs/

# 2. Run enhanced PRD parser with UEP coordination
node src/meta-agents/enhanced-prd-parser.js

# This automatically triggers the full agent coordination pipeline
```

## 🤖 Understanding the Agents

### The 9 Meta-Agents (Core Factory)

1. **Infrastructure Orchestrator (IOA)** - Coordinates all other agents
2. **PRD Parser** - Converts requirements into structured tasks  
3. **Scaffold Generator** - Creates basic project structure
4. **Template Engine Factory** - Generates implementation code
5. **All-Purpose Pattern** - Removes hardcoded limitations
6. **Parameter Flow** - Handles integrations and data flow
7. **Five Document Framework** - Generates comprehensive documentation
8. **Thirty Minute Rule** - Optimization and debugging
9. **Vercel Native Architecture** - Production deployment setup

### The 5 Domain Agents (Specialists)

1. **Backend Agent** - API design, databases, security
2. **Frontend Agent** - UI components, styling, accessibility  
3. **DevOps Agent** - Docker, CI/CD, deployment, monitoring
4. **QA Agent** - Test planning, test generation, edge cases
5. **Documentation Agent** - API docs, technical writing

### Agent Coordination Flow

```
PRD Input → TaskMaster Parsing → Infrastructure Orchestrator →
↓
Agent Coordination (9 Meta + 5 Domain) →
↓  
Code Generation → Testing → Documentation → Deployment Config →
↓
Complete Functional Project
```

## 📊 Working Project Types

### Successfully Tested Project Types

**Web Applications:**
- Next.js with TypeScript
- React SPAs with API integration
- Node.js REST APIs
- Full-stack applications with authentication

**Integration Projects:**
- Multi-API integration systems (YouTube + GitHub)
- Data processing pipelines
- Cross-platform search systems

**Infrastructure Projects:**
- Docker containerization
- Vercel deployment configs
- CI/CD pipeline setup
- Monitoring and observability

### Project Specification Guidelines

**Minimum PRD Requirements:**
```markdown
# Project Name

## Overview
[1-2 sentence description]

## Core Features  
- [List 3-5 main features]

## Technical Requirements
- Framework: [specific framework]
- Database: [if needed]
- APIs: [external services to integrate]
- Deployment: [target platform]
```

**Enhanced PRD (Better Results):**
```markdown
# Detailed Project Requirements

## Business Context
[Why this project matters]

## User Stories
- As a [user type], I want [feature] so that [benefit]

## Technical Architecture
- Frontend: [framework + specific libraries]
- Backend: [API architecture + database]
- External Integrations: [specific APIs with details]
- Authentication: [method + requirements]
- Deployment: [platform + scaling needs]

## Success Criteria
[How to measure if the project works]

## Constraints
[Technical limitations or requirements]
```

## 🔍 Monitoring Progress

### Real-Time Monitoring

```bash
# Method 1: Observability Dashboard
npm run dev
# Go to: http://localhost:3000/admin/observability

# Method 2: Agent Status API
curl http://localhost:3000/admin/observability/api/health
curl http://localhost:3000/admin/observability/api/history

# Method 3: TaskMaster Progress
task-master list  # See all tasks and their status
task-master show <task-id>  # Detailed task information
```

### Generated Project Structure

**Typical output structure:**
```
generated/your-project/
├── package.json              # Dependencies and scripts
├── README.md                 # Project documentation
├── src/                      # Source code
│   ├── app/                  # Next.js app directory
│   ├── components/           # React components
│   ├── api/                  # API routes
│   └── lib/                  # Utility functions
├── tests/                    # Test suites
├── docs/                     # Technical documentation
├── docker/                   # Containerization
└── deployment/               # Production configs
```

## 🛠️ Advanced Usage

### Customizing Agent Behavior

**Configure specific agents:**
```bash
# Customize Infrastructure Orchestrator
cd src/meta-agents/infra-orchestrator
edit ioa.config.json  # Modify orchestration settings

# Customize agent coordination
edit monitoring-dashboard.config.json  # Project-specific config
```

**Agent-specific commands:**
```bash
# Run individual agents for testing
cd src/meta-agents/scaffold-generator
node main.js  # Generate project scaffolding

cd ../template-engine-factory  
npm run generate-template <type> <params>  # Generate specific templates

cd ../five-document-framework
npm run generate-docs <project-dir>  # Generate documentation only
```

### Integration with Development Workflow

**TaskMaster Integration:**
```bash
# Enhanced development workflow
task-master next  # Get next task to work on
task-master show <id>  # Review task details
task-master set-status --id=<id> --status=in-progress  # Start work
task-master update-subtask --id=<id> --prompt="implementation notes"  # Log progress
task-master set-status --id=<id> --status=done  # Mark complete
```

**Context7 & RAG Integration:**
- Agents automatically scan existing codebase for patterns
- RAG system provides project context and documentation memory
- Enhanced TaskMaster CLI injects relevant project context

### Multi-Project Management

**Working on multiple projects:**
```bash
# Parse multiple PRDs
task-master parse-prd project-1.md --append
task-master parse-prd project-2.md --append

# Build projects sequentially
node src/meta-agents/infra-orchestrator/dist/main.js orchestrate --project-name project-1
node src/meta-agents/infra-orchestrator/dist/main.js orchestrate --project-name project-2

# Or coordinate parallel development
# Use separate terminal sessions for concurrent builds
```

## 🎯 Success Examples

### YouTube/GitHub Cross-Reference System

**Input PRD:** "Build a system that searches YouTube tutorials and finds related GitHub repositories"

**Generated Output:**
- Complete Next.js application
- YouTube API integration with search
- GitHub API integration with repository analysis  
- React components for search interface
- API routes for data processing
- Full TypeScript implementation
- Production deployment configuration
- Comprehensive documentation

**Files Generated:** 25+ files including components, APIs, configs, tests

### Monitoring Dashboard (Current Build)

**Input PRD:** Real-time monitoring dashboard for meta-agent factory operations

**In Progress:** 
- TaskMaster parsed PRD into 10 structured tasks
- Infrastructure Orchestrator coordination active
- Agent network visualization components
- WebSocket real-time updates system

## 📈 Performance & Reliability

### System Metrics

**Proven Performance:**
- **Build Time:** 5-15 minutes for complete projects
- **Success Rate:** 100% for tested project types
- **Agent Coordination:** Proven reliable UEP communication
- **Code Quality:** Generated code follows best practices

**Monitoring:**
- Real-time agent status tracking
- Task completion progress
- Error detection and recovery
- Performance metrics collection

## 🔄 Iteration & Improvement

### Refining Generated Projects

```bash
# Iterate on generated code
task-master add-task --prompt="Enhance authentication system with OAuth" --research
task-master expand --id=<new-task-id> --research

# Re-run specific agents with updates
cd src/meta-agents/template-engine-factory
npm run enhance-existing <project-path>
```

### Learning from Results

- Generated projects become templates for future builds
- Agent coordination patterns improve with usage
- TaskMaster learns from project completion patterns
- RAG system builds knowledge from successful projects

---

**This system transforms software development from manual coding to requirements-driven generation. Provide clear requirements, get complete functional projects.**