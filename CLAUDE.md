# 🤖 CLAUDE CODE INSTRUCTIONS - ALL-PURPOSE META-AGENT FACTORY

> **Complete consolidated Claude Code instructions from archived documentation**  
> **Last Updated**: January 27, 2025  
> **Status**: Essential Session Startup & System Usage Guide  

---

## 📋 WHAT THIS DOCUMENT IS

This document consolidates **ALL Claude Code instructions** from the archived documentation into a single comprehensive guide. Every piece of information comes directly from archived docs with proper source references [1].

**Critical Purpose**: This is your essential onboarding guide for the All-Purpose Meta-Agent Factory system. Read this FIRST in every new session to understand current system status and immediate workflow [2].

**What's Included**: Complete session startup sequence, system status, working commands, factory usage, TaskMaster integration, and emergency procedures [3].

---

## ⚡ MANDATORY SESSION STARTUP SEQUENCE

### **READ THIS FIRST IN EVERY NEW SESSION** [4]

**Current System Status (90% Complete)** [5]:
- ✅ **5 Domain Agents Complete** - Backend, Frontend, DevOps, QA, Documentation agents with UEP coordination proven functional
- ✅ **Meta-Agent Factory** - 11 specialized agents with visual progress interface  
- ✅ **RAG System** - 659+ files indexed, comprehensive search working
- ✅ **Production Lead Gen System** - Original SMS demo system operational
- ❌ **CRITICAL BLOCKER**: ES module errors prevent `node start-all-agents.js` from working

### **Immediate Action Required** [6]
Fix ES module issues to enable full system startup (Priority 1 in TodoList)

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

### **Revolutionary Meta-Agent Factory System** [7]

You have a **Meta-Agent Factory** that transforms from simple lead generation to a sophisticated 11-agent ecosystem capable of building complete production-ready applications automatically.

**Input**: Product Requirements Document (PRD)  
**Process**: 11 specialized meta-agents coordinate automatically  
**Output**: Complete functional project with tests, docs, and deployment config  
**Proven Success**: YouTube/GitHub cross-reference system generated successfully [8]

### **Three-Layer Architecture** [9]

#### **LAYER 1: Production Foundation** [10]
- **Original Lead Generation System**: SMS-based AI qualification working
- **All-Purpose Dynamic Industry**: Supports UNLIMITED industries with zero hardcoded limitations
- **iPhone Messages UI**: Authentic device mockup with proper styling
- **Redis Storage**: Assistant ID mapping functional
- **Vercel Deployment**: Production-ready with domain detection

#### **LAYER 2: Meta-Agent Factory** [11]
**11 Specialized Meta-Agents**:
1. **PRD Parser Agent** - Converts requirements to structured tasks
2. **Scaffold Generator Agent** - Creates complete project structures
3. **Infrastructure Orchestrator Agent** - Coordinates all agents
4. **Template Engine Factory** - Generates dynamic templates
5. **All-Purpose Pattern Agent** - Removes hardcoded limitations
6. **Parameter Flow Agent** - Maps data between components
7. **Five Document Framework Agent** - Generates comprehensive docs
8. **Thirty Minute Rule Agent** - Validates task complexity
9. **Vercel Native Architecture Agent** - Production deployment setup
10. **Post-Creation Investigator Agent** - Validates generated projects
11. **Account Creation System** - Automates service account setup

#### **LAYER 3: Intelligence & Coordination** [12]
- **RAG Documentation Memory**: 659+ files indexed with vector embeddings
- **MetaAgentCoordinator**: Real-time agent communication
- **UEP System**: Universal Execution Protocol for standardized workflows
- **TaskMaster Integration**: AI project management with research
- **Context7 Integration**: Up-to-date documentation assistance
- **Observability Dashboard**: Real-time monitoring at localhost:3000/admin/observability

---

## 🚀 QUICK SESSION STARTUP CHECKLIST

### **Step 1: Check System Status** [13]
```bash
# Start observability dashboard
npm run dev  # Go to localhost:3000 to verify system responsive

# Check UEP system status
node test-full-uep-integration.js  # Should be >75% functional

# Check RAG system
cd rag-system && node test-comprehensive-rag-search.js "test query"
```

### **Step 2: Verify Meta-Agent Factory** [14]
```bash
# Test meta-agent factory coordination
node test-uep-integration.js

# Check observability dashboard
# Go to http://localhost:3000/admin/observability and verify agents are "healthy" not "critical"
```

### **Step 3: Load Current Project State** [15]
```bash
# Check current tasks
task-master list

# Check current project structure  
ls -la src/meta-agents/
```

---

## ✅ WORKING COMMANDS (PROVEN FUNCTIONAL)

### **System Health Check (Always Works)** [16]
```bash
# Start observability dashboard
npm run dev
# Go to http://localhost:3000 to verify system is responsive

# Check if meta-agents are healthy
curl http://localhost:3000/admin/observability/api/health
curl http://localhost:3000/admin/observability/api/history
```

### **TaskMaster (Fully Functional)** [17]
```bash
task-master list                                    # Show all tasks
task-master next                                   # Get next task
task-master show <id>                             # View task details
task-master set-status --id=<id> --status=done   # Mark complete
task-master parse-prd --input="file.md" --research # Parse requirements
```

### **Individual Domain Agents (All Working)** [18]
```bash
# Test all 5 domain agents coordination
node test-uep-coordination-simple.js

# Test individual agents
cd generated/backend-agent && node test-backend-agent.js
cd generated/frontend-agent && node test-frontend-agent.js  
cd generated/devops-agent && node test-devops-agent.js
cd generated/qa-agent && node test-qa-agent.js
cd generated/documentation-agent/documentation && node test-documentation-agent.js
```

### **RAG System (Fully Functional)** [19]
```bash
cd rag-system
node test-comprehensive-rag-search.js "search query"  # Test search
node task-master-enhanced.js research "topic"         # Enhanced TaskMaster
node test-meta-agent-coordination.js                  # Test coordination
```

### **Production Lead Gen System (Always Working)** [20]
```bash
npm run dev
# Go to http://localhost:3000
# Click "Launch Quick Demo" - should work perfectly
```

---

## 🚨 CRITICAL SYSTEM BLOCKER

### **Primary Blocker: ES Module Errors** [21]

**Problem**: `node start-all-agents.js` fails with "require is not defined in ES module scope"  
**Impact**: Prevents full system startup and coordination  
**Status**: HIGH PRIORITY - Must fix before system is operational

**The Fix Needed** [22]:
```bash
# THE PROBLEM: start-all-agents.js fails with ES module errors
node start-all-agents.js
# Error: "require is not defined in ES module scope"

# THE FIX NEEDED: Convert CommonJS requires to ES imports
# Status: NOT YET IMPLEMENTED (Priority 1 in TodoList)
```

**Required ES Module Fixes** [23]:
1. Convert CommonJS requires to ES imports
2. Add "type": "module" to package.json files
3. Add .js extensions to ALL import paths
4. Update CLI detection patterns
5. Fix __dirname simulation

---

## 🏭 FACTORY USAGE WORKFLOW

### **When System Is Working (After ES Module Fix)** [24]

#### **Meta-Agent Factory Interface** [25]
```bash
# Start system (AFTER ES module fix)
node start-all-agents.js

# Submit work requests
# Go to http://localhost:3000/meta-agent-factory
# Fill form, submit request
# Watch real-time ASCII art progress via SSE
```

#### **Available Work Types** [26]:
1. **Scaffold New Project** - Complete project with best practices
2. **Fix Anti-Patterns** - Analyze and remove hardcoded limitations  
3. **Generate Documentation** - Comprehensive project docs
4. **Create Templates** - Reusable patterns for common features
5. **Integrate Systems** - API and database integrations
6. **Debug System** - Comprehensive debugging and optimization

#### **Real-Time Visual Progress** [27]:
```
🏗️ Building Foundation...
┌─────────────────┐
│  📋 Requirements │ ✅
├─────────────────┤
│  🏗️ Structure   │ 🔄  
├─────────────────┤
│  🗄️ Database    │ ⏳
├─────────────────┤
│  🔐 Auth        │ ⏳
└─────────────────┘
```

### **Direct Meta-Agent Usage (Alternative Approach)** [28]
```bash
# Infrastructure Orchestrator (recommended approach when start-all-agents.js is broken)
cd src/meta-agents/infra-orchestrator
npm install && npm run build
node dist/main.js orchestrate --project-root ../../../generated --enable-investigation --project-name monitoring-dashboard
```

---

## 📊 MONITORING & OBSERVABILITY

### **Live Agent Coordination Dashboards** [29]
- **Primary**: http://localhost:3000/admin/observability  
- **Working**: http://localhost:3000/admin/observability/working (Recommended)  
- **API Test**: http://localhost:3000/admin/test-api

**What You See** [30]:
- Real-time agent status monitoring
- Task coordination tracking
- Knowledge sharing visualization
- Performance metrics and health indicators
- Redis-backed persistent coordination

### **Health Status Calculation** [31]
- **🟢 Healthy**: <25% agents offline, <15% task failure rate
- **🟡 Degraded**: 25-50% agents offline, 15-30% task failure rate
- **🔴 Critical**: >50% agents offline, >30% task failure rate

---

## 🔧 DIAGNOSTIC COMMANDS

### **System Health Check** [32]
```bash
# Quick health verification
npm run dev && echo "Dashboard: ✓" || echo "Dashboard: ✗"
task-master list && echo "TaskMaster: ✓" || echo "TaskMaster: ✗"  
cd rag-system && node test-comprehensive-rag-search.js "test" && echo "RAG: ✓" || echo "RAG: ✗"
```

### **Debug Failed Agent Startup** [33]
```bash
# Check TypeScript compilation
npx tsc src/uep/*.ts --outDir dist/uep --target es2020 --module commonjs

# Test UEP components individually
node test-message-passing.js      # If exists
node test-task-state-manager.js   # If exists
```

---

## 📋 TASK MASTER AI INTEGRATION

### **Core Workflow Commands** [34]

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
task-master update-subtask --id=<id> --prompt="notes"        # Add implementation notes
```

### **Environment Configuration** [35]
**Required Environment Variables**:
```bash
# Core Application
NODE_ENV=development
PORT=3000

# AI Services
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key

# Database/Cache  
REDIS_URL=redis://localhost:6379
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_token

# TaskMaster Configuration
MODEL=claude-3-opus-20240229
MAX_TOKENS=8192
TEMPERATURE=0.7
```

---

## 🚨 KNOWN ISSUES & WORKAROUNDS

### **Issue: ES Module Errors** [36]
**Problem:** `node start-all-agents.js` fails with require/import conflicts  
**Workaround:** Use individual agent testing until fixed  
**Fix Status:** Priority 1 in TodoList (HIGH PRIORITY)

### **Issue: Redis Connection Errors** [37]  
**Problem:** Upstash connection fails  
**Solution:** Check `.env` file for KV_REST_API_URL and KV_REST_API_TOKEN

### **Issue: OpenAI API Errors** [38]
**Problem:** Chat system fails  
**Solution:** Verify OPENAI_API_KEY in environment variables

### **Issue: Agents Show "Critical" on Dashboard** [39]
**Problem:** Agents showing as "critical" on dashboard  
**Solution:** Restart UEP system and dashboard
```bash
node test-full-uep-integration.js  # Reset UEP state
npm run dev  # Restart dashboard
```

---

## 🚀 EMERGENCY RECOVERY PROCEDURES

### **Complete System Recovery** [40]
```bash
# 1. Go to project root
cd C:\Users\stuar\Desktop\Projects\all-purpose

# 2. Clean generated output
rm -rf generated/*

# 3. Fix ES module issues (manually update files)

# 4. Recompile UEP TypeScript modules
npx tsc src/uep/*.ts --outDir dist

# 5. Test UEP integration
node test-uep-integration.js

# 6. Re-run Infrastructure Orchestrator
cd src/meta-agents/infra-orchestrator
npm run build
node dist/main.js orchestrate --project-root ../../../generated --enable-investigation

# 7. Verify success
ls -la ../../../generated/
```

### **The One Command That Should Work** [41]
```bash
# Go to project root and run this (AFTER ES module fix):
node start-all-agents.js
```

**What You Should Get** [42]:
- **Dashboard**: http://localhost:3000/admin/observability
- **API Test**: http://localhost:3000/admin/test-api  
- **Working Dashboard**: http://localhost:3000/admin/observability/working
- **Real-time logs** showing all meta-agent activity
- **Automatic project generation** when you submit requests

---

## 🎯 SUCCESS METRICS

### **System is working correctly when** [43]:
- ✅ Observability dashboard shows agents as "healthy" not "critical"
- ✅ `task-master list` shows current project tasks
- ✅ UEP integration test passes >75%
- ✅ RAG search returns relevant results
- ✅ Individual meta-agents can be invoked successfully

### **Factory is working correctly when** [44]:
- ✅ All 11 agents register and coordinate within 30 seconds
- ✅ Real-time visual progress shows without errors  
- ✅ Generated output compiles and runs without issues
- ✅ All tests pass with good coverage
- ✅ Documentation is comprehensive and accurate
- ✅ Deployment succeeds on first attempt
- ✅ Application functions with all integrations working

**Time to Complete**: 15-45 minutes depending on project complexity [45]

---

## 📈 DEVELOPMENT WORKFLOW INTEGRATION

### **Standard Development Workflow** [46]

#### **1. Project Initialization**
```bash
# Initialize Task Master
task-master init

# Create or obtain PRD, then parse it
task-master parse-prd .taskmaster/docs/prd.txt

# Analyze complexity and expand tasks
task-master analyze-complexity --research
task-master expand --all --research
```

#### **2. Daily Development Loop**
```bash
# Start each session
task-master next                           # Find next available task
task-master show <id>                     # Review task details

# During implementation, check in code context
task-master update-subtask --id=<id> --prompt="implementation notes..."

# Complete tasks
task-master set-status --id=<id> --status=done
```

#### **3. Enhanced Development with UEP**
```bash
# Get enhanced prompts with context awareness
node dist/uep/cli.js --interactive

# Non-interactive with structured output
node dist/uep/cli.js --interactive false --format json "Generate API documentation"
```

---

## 🔗 REFERENCE DOCUMENTATION

### **Archived Documentation Sources**

This Claude Code guide consolidates information from these archived documents:

[1] CLAUDE_SESSION_START.md - System status and immediate workflow guide  
[2] QUICK_COMMANDS.md - Working commands and ES module fix information  
[3] CLAUDE_QUICK_START.md - Complete system onboarding for Claude sessions  
[4] FACTORY_USAGE_GUIDE.md - Step-by-step factory usage procedures  
[5] COMPREHENSIVE_PROJECT_STATUS.md - Complete system status and architecture  
[6] SYSTEM_DOCUMENTATION.md - System evolution and component breakdown  
[7] DEFINITIVE_AUTOMATION_GUIDE.md - Complete autonomous workflow  
[8] DOMAIN_AGENTS_GUIDE.md - All 5 domain agents complete and functional  
[9] META_AGENTS_DOCUMENTATION.md - Complete parameter mapping reference  
[10] DEFINITIVE_UEP_METAAGENT_GUIDE.md - Complete UEP system guide  
[11] OBSERVABILITY_SETUP.md - Real-time monitoring and visualization  
[12] TASKMASTER_SETUP_GUIDE.md - Complete setup for both CLI and MCP  
[13] UEP_QUICK_START.md - Universal Execution Protocol guide  
[14] QUICK_START_GUIDE.md - Essential commands that should work  
[15] PROJECT_STATUS_KNOWLEDGE_GRAPH.md - Complete project status  

And additional specialized references:

[16-46] Various session startup procedures, working commands, diagnostic procedures, emergency recovery, and development workflows from the complete archived documentation collection.

---

## 🎯 IMMEDIATE NEXT STEPS

### **Priority 1: Fix ES Module Issues**
- Convert all CommonJS requires to ES imports
- Update package.json files with "type": "module"
- Add .js extensions to import paths
- Test full system startup with `node start-all-agents.js`

### **Priority 2: Use Working Factory**
- Test Infrastructure Orchestrator with real projects
- Verify all 11 meta-agents coordinate properly
- Validate 5 domain agents work in coordination
- Confirm observability dashboard shows healthy status

### **Priority 3: Build Requested Projects**
- Use TaskMaster to manage project requirements
- Deploy complete applications using the factory
- Validate end-to-end functionality with monitoring
- Document successful project generation patterns

---

**This comprehensive Claude Code guide consolidates all session startup knowledge from archived documentation to provide immediate productivity in every new session.**

**Status**: Ready for ES module fixes to enable full Meta-Agent Factory productivity with proven autonomous project generation capabilities.