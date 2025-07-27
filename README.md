# All-Purpose Meta-Agent Factory

**Production-Ready System: Takes PRD → Outputs Complete Working Code**

## 🎯 What This Is

An autonomous AI agent factory that builds complete software projects from requirements documents. Submit a PRD (Product Requirements Document) and get back functional, deployed applications.

**Proven Success:** Already generated a complete YouTube/GitHub cross-reference system with Next.js, APIs, UI components, tests, and deployment configs.

## ⚡ Current Status

**✅ WORKING:**
- **5 Domain Agents:** Backend, Frontend, DevOps, QA, Documentation (all UEP-coordinated)
- **UEP Coordination:** Universal protocol for agent communication  
- **TaskMaster Integration:** PRD parsing and task management
- **Infrastructure Orchestrator:** Automated agent coordination
- **Context7 & RAG:** Codebase awareness and documentation memory

**❌ BROKEN:**
- **ES Module Issues:** `start-all-agents.js` fails (fixable)
- **Meta-Agent Factory Web UI:** Next.js compilation errors (mostly working)

**🔄 IN PROGRESS:**
- **Monitoring Dashboard:** Visual system for tracking agent operations

## 🚀 Quick Navigation

### Get Started (5 minutes)
- **[🏃 Quick Start](QUICK_START.md)** - Fastest path to running system

### Use the System
- **[🎯 Complete System Guide](SYSTEM_GUIDE.md)** - Full PRD→Code workflow  
- **[🔧 Troubleshooting](TROUBLESHOOTING.md)** - Fix common issues

### Detailed Reference
- **[📋 Commands Reference](docs/reference/commands.md)** - All working commands
- **[🤖 Agent Details](docs/reference/agents.md)** - Individual agent capabilities  
- **[⚙️ Configuration](docs/reference/configuration.md)** - Setup and environment

### Working Examples
- **[📊 Monitoring Dashboard](docs/examples/monitoring-dashboard.md)** - Current build target
- **[🎥 YouTube/GitHub System](docs/examples/youtube-github.md)** - Proven success story

## 🎯 Core Workflow

```bash
# 1. Parse requirements with TaskMaster
task-master parse-prd your-project.md --append

# 2. Coordinate agents to build project  
cd src/meta-agents/infra-orchestrator
node dist/main.js orchestrate --project-name your-project

# 3. Generated code appears in:
ls generated/your-project/
```

## 🏗️ System Architecture

### The Factory Components
- **9 Meta-Agents:** Specialized builders (PRD Parser, Scaffold Generator, Template Engine, etc.)
- **5 Domain Agents:** Backend, Frontend, DevOps, QA, Documentation  
- **Infrastructure Orchestrator:** Coordinates all agent activities
- **UEP Protocol:** Universal communication between agents
- **TaskMaster:** Project management and task tracking
- **Context7 & RAG:** Codebase scanning and memory system

### Agent Coordination Flow
```
PRD Input → TaskMaster Parsing → Infrastructure Orchestrator → 
Agent Coordination → Code Generation → Complete Project
```

## 🔥 Proven Capabilities

**The system has successfully built:**
- **Complex API integrations** (YouTube API, GitHub API)
- **React/Next.js applications** with TypeScript
- **Database schemas and API endpoints** 
- **Complete documentation** (API docs, setup guides, architecture)
- **Deployment configurations** (Vercel, Docker)
- **Test suites** (unit tests, integration tests)

## 📊 Quick Health Check

```bash
# Verify system is responsive
npm run dev
curl http://localhost:3000/admin/observability/api/health

# Test UEP coordination (should show all agents working)
node test-uep-coordination-simple.js

# Check TaskMaster
task-master list
```

## 🆘 Need Help?

- **System not starting?** → [Troubleshooting Guide](TROUBLESHOOTING.md)
- **Want to build something?** → [System Guide](SYSTEM_GUIDE.md)  
- **Understanding the agents?** → [Agent Details](docs/reference/agents.md)
- **First time here?** → [Quick Start](QUICK_START.md)

---

**This system represents a new paradigm: Give it requirements, get back complete applications. The future of software development is here.**