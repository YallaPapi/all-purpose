# Commands Reference - Meta-Agent Factory

**All working commands for the Meta-Agent Factory system.**

## 🚀 System Startup

### Health Check Commands
```bash
# Start the observability dashboard
npm run dev

# Check system health
curl http://localhost:3000/admin/observability/api/health
curl http://localhost:3000/admin/observability/api/history

# Test agent coordination (most important test)
node test-uep-coordination-simple.js
```

## 📋 TaskMaster Commands

### Core Workflow
```bash
# Project Setup
task-master init                                    # Initialize Task Master in current project
task-master parse-prd .taskmaster/docs/prd.txt      # Generate tasks from PRD document
task-master models --setup                        # Configure AI models interactively

# Daily Development Workflow
task-master list                                   # Show all tasks with status
task-master next                                   # Get next available task to work on
task-master show <id>                             # View detailed task information
task-master set-status --id=<id> --status=done    # Mark task complete

# Task Management
task-master add-task --prompt="description" --research        # Add new task with AI assistance
task-master expand --id=<id> --research --force              # Break task into subtasks
task-master update-task --id=<id> --prompt="changes"         # Update specific task
task-master update --from=<id> --prompt="changes"            # Update multiple tasks from ID onwards
task-master update-subtask --id=<id> --prompt="notes"        # Add implementation notes to subtask

# Analysis & Planning
task-master analyze-complexity --research          # Analyze task complexity
task-master complexity-report                      # View complexity analysis
task-master expand --all --research               # Expand all eligible tasks
```

## 🤖 Meta-Agent Commands

### Infrastructure Orchestrator (RECOMMENDED)
```bash
# Main coordination command
cd src/meta-agents/infra-orchestrator
npm install && npm run build
node dist/main.js orchestrate --project-name <project-name> --project-root ../../../generated

# With additional options
node dist/main.js orchestrate --project-name <project> --project-root <path> --enable-investigation --verbose

# Different modes
node dist/main.js audit                           # Run compliance audit only
node dist/main.js compliance                      # Check compliance
node dist/main.js status                          # Generate status report
```

### Individual Meta-Agents
```bash
# PRD Parser
cd src/meta-agents/prd-parser
node main.js <prd-file>

# Scaffold Generator
cd src/meta-agents/scaffold-generator
node main.js <project-type>

# Template Engine Factory
cd src/meta-agents/template-engine-factory
npm run generate-template <template-type> <parameters>

# Five Document Framework
cd src/meta-agents/five-document-framework
npm run generate-docs <project-directory>

# All-Purpose Pattern (Anti-pattern detection)
cd src/meta-agents/all-purpose-pattern
npm run detect-patterns <project-directory>

# Parameter Flow Agent
cd src/meta-agents/parameter-flow
npm run design-flow <integration-spec>

# Thirty Minute Rule Agent
cd src/meta-agents/thirty-minute-rule
npm run optimize <problem-type>

# Vercel Native Architecture Agent
cd src/meta-agents/vercel-native-architecture
npm run cli build --name <app-name> --framework <framework> --interactive
npm run cli deploy --environment production
```

## 🌐 Web Interface Commands

### Meta-Agent Factory Web Interface
```bash
# Start the web interface
npm run dev

# Access factory interface
# http://localhost:3000/meta-agent-factory

# Factory API endpoints
curl -X POST http://localhost:3000/api/meta-agent-factory \
  -H "Content-Type: application/json" \
  -d '{"type": "scaffold", "description": "Build a dashboard", "requirements": {...}}'

curl http://localhost:3000/api/meta-agent-factory  # Get factory status
```

### Observability Dashboard
```bash
# Access observability interface
# http://localhost:3000/admin/observability

# API endpoints
curl http://localhost:3000/admin/observability/api/health
curl http://localhost:3000/admin/observability/api/history
curl http://localhost:3000/admin/observability/api/init
```

## 🧪 Testing Commands

### Agent Testing
```bash
# Test all domain agents with UEP coordination
node test-uep-coordination-simple.js

# Test individual agent types
cd generated/backend-agent && node test-backend-agent.js
cd generated/frontend-agent && node test-frontend-agent.js
cd generated/devops-agent && node test-devops-agent.js
cd generated/qa-agent && node test-qa-agent.js
cd generated/documentation-agent && node test-documentation-agent.js

# Test UEP integration
node test-uep-integration.js
node test-uep-enforcement.js
node test-protocol-logic.js
```

### System Integration Tests
```bash
# Test final integration
node test-final-integration.js

# Test agent memory integration
node test-agent-memory-integration.js

# Test Context7 scanner
node test-context7-scanner.js

# Test RAG adapter
node test-rag-adapter.js
```

## 🔧 Development Commands

### Building and Compilation
```bash
# Compile TypeScript for UEP system
npx tsc src/uep/*.ts --outDir dist

# Build specific meta-agents
cd src/meta-agents/infra-orchestrator
npm run build

cd src/meta-agents/template-engine-factory
npm run build

# Install dependencies for meta-agents
npm install dotenv fs-extra @types/node zod @babel/parser @babel/traverse @babel/types
```

### Context7 and RAG Commands
```bash
# RAG system testing
cd rag-system
node test-comprehensive-rag.js
node test-context-injection.js
node test-conversation-memory.js

# Context7 integration
node context-cli.js
node task-master-enhanced.js research "query"
```

## 📁 File Management Commands

### Project Generation
```bash
# Check generated projects
ls generated/
ls generated/<project-name>/

# Clean up generated files
rm -rf generated/<project-name>/
mkdir -p generated/
```

### Log Management
```bash
# View system logs
cat logs/combined.log
cat logs/error.log
cat logs/ioa-combined.log
cat logs/ioa-error.log

# RAG system logs
cat rag-system/logs/combined.log
cat rag-system/logs/error.log
```

## 🚨 Emergency Commands

### System Reset
```bash
# Stop all processes (Ctrl+C in terminals)

# Clean installation
rm -rf node_modules/
rm -rf .next/
npm install

# Rebuild meta-agents
cd src/meta-agents/infra-orchestrator
rm -rf dist/
npm install
npm run build
cd ../../..

# Test basic functionality
npm run dev
node test-uep-coordination-simple.js
```

### Diagnostic Commands
```bash
# Check system status
node --version  # Should be v18+
npm --version   # Should be v9+
task-master --version

# Check ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Check file permissions
ls -la generated/
ls -la src/meta-agents/
```

## ⚠️ Commands That Don't Work (Known Issues)

### Broken Commands
```bash
# DON'T USE - Has ES module issues
node start-all-agents.js

# DON'T USE - May have compilation errors
# Some Meta-Agent Factory web interface features
```

### Workarounds
```bash
# Instead of start-all-agents.js, use:
cd src/meta-agents/infra-orchestrator
node dist/main.js orchestrate

# Instead of broken web interface, use:
task-master parse-prd <file> --append
# Then use Infrastructure Orchestrator
```

## 📖 Command Examples

### Complete Project Build Example
```bash
# 1. Create PRD
echo "# My Project\nBuild a REST API with authentication" > my-project.md

# 2. Parse with TaskMaster
task-master parse-prd my-project.md --append

# 3. Coordinate agents
cd src/meta-agents/infra-orchestrator
npm run build
node dist/main.js orchestrate --project-name my-project --project-root ../../../generated

# 4. Check results
ls ../../../generated/my-project/
```

### Monitoring Dashboard Build (Current Example)
```bash
# Using the actual monitoring dashboard PRD
task-master parse-prd monitoring-dashboard-prd.md --append
cd src/meta-agents/infra-orchestrator
node dist/main.js orchestrate --project-name monitoring-dashboard
```

---

**These commands represent the working interface to the Meta-Agent Factory. Use the Infrastructure Orchestrator approach for most reliable results.**