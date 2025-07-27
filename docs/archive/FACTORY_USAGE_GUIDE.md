# How to Actually Use the Meta-Agent Factory

## 🎯 Overview

The Meta-Agent Factory is a system where you submit work requests and 10+ specialized agents coordinate to build complete, production-ready projects with real-time visual feedback.

**Proven Success:** Already generated a complete YouTube/GitHub cross-reference system using this exact process.

## 🚀 Step-by-Step Usage

### Step 1: Start the System
```bash
# Start observability dashboard
npm run dev

# Start all meta-agents (AFTER ES module fix)
node start-all-agents.js

# Verify agents are running
# Go to http://localhost:3000/admin/observability
# Should show all agents as "healthy" not "critical"
```

### Step 2: Submit Work Request
```bash
# Go to the factory interface
http://localhost:3000/meta-agent-factory
```

**Available Work Types:**
1. **Scaffold New Project** - Generate complete project structure with best practices
2. **Fix Anti-Patterns** - Analyze and fix hardcoded limitations in existing code  
3. **Generate Documentation** - Create comprehensive project documentation
4. **Create Templates** - Build reusable templates for common patterns
5. **Integrate Systems** - Design and implement system integrations
6. **Debug System** - Comprehensive debugging and issue resolution

**Fill Out Form:**
- **Work Type:** Choose from dropdown
- **Project Name:** What to call your project
- **Requirements:** Describe what you want built
- **Framework:** React, Next.js, Node.js, etc.
- **Additional Details:** Any specific requirements

### Step 3: Watch Real-Time Progress

**How Real-Time Progress Works:**
1. System generates unique request ID (req-[timestamp]-[random])
2. Server-Sent Events (SSE) stream begins immediately
3. ASCII art visualizations show build progress:
   - 📋 Requirements parsing with emoji sequences
   - 🏗️ Project structure trees in ASCII  
   - 🔐 JWT authentication flow diagrams
   - 🧪 Test results with coverage percentages
   - 🚀 Deployment status and final architecture

**Example Visual Output:**
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

🔐 JWT Authentication Flow
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ Client  │───▶│  Auth   │───▶│Database │
   │         │◀───│Service  │◀───│         │
   └─────────┘    └─────────┘    └─────────┘
```

### Step 4: Monitor Agent Coordination

**Observability Dashboard:**
```bash
# Primary dashboard
http://localhost:3000/admin/observability

# Working dashboard  
http://localhost:3000/admin/observability/working

# API test endpoint
http://localhost:3000/admin/test-api
```

**What You'll See:**
- Live agent status monitoring
- Real task coordination tracking  
- Knowledge sharing visualization
- Performance metrics and health indicators
- Redis-backed persistent coordination

### Step 5: Verify Output

**Generated Output Location:**
```bash
# Check generated project
ls -la ./generated/[project-name]/

# Typical output includes:
# - Complete project structure
# - All source code files
# - Tests and documentation  
# - Deployment configurations
# - README with setup instructions
```

**Quality Verification:**
```bash
# Navigate to generated project
cd ./generated/[project-name]/

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev

# Deploy (if Vercel config included)
vercel deploy
```

## 🔄 How the Meta-Agents Coordinate

### The Builder Chain:
1. **PRD-Parser** → Analyzes requirements (📋➡️🤖➡️📝)
2. **Scaffold Generator** → Creates project structure (🏗️ ASCII trees)
3. **All-Purpose Pattern Agent** → Removes hardcoded limitations
4. **Template Engine Factory** → Builds dynamic content (🌐🛠️📡✨)

### The Integration Chain:
1. **Parameter Flow Agent** → Maps data connections (🗄️🔗⚡📊)
2. **Infrastructure Orchestrator** → Prevents anti-patterns
3. **Vercel-Native Architecture** → Handles deployment (🚀☁️🌍✨)

### The Quality Chain:
1. **Thirty-Minute Rule Agent** → Runs comprehensive tests (🧪 with coverage %)
2. **Five-Document Framework** → Generates docs (📚📖📋✅)
3. **Final validation** → Ensures production readiness

## 📊 Success Metrics

**Factory is working correctly when:**
- ✅ All agents register with MetaAgentCoordinator within 30 seconds
- ✅ Real-time visual progress shows without errors
- ✅ Generated output compiles and runs without issues
- ✅ Tests pass with good coverage
- ✅ Documentation is comprehensive and accurate
- ✅ Deployment succeeds on first attempt

## 🚨 Troubleshooting

### Factory Interface Not Loading
```bash
# Check if dashboard is running
npm run dev
curl http://localhost:3000/meta-agent-factory
```

### Agents Not Coordinating
```bash
# Check agent health
http://localhost:3000/admin/observability
# Should show agents as "healthy" not "critical"

# Restart coordination system
node test-meta-agent-coordination.js
```

### Generated Output Has Errors
```bash
# Check build logs in real-time progress
# Look for specific agent that failed
# Use Thirty-Minute Rule Agent debug endpoints
```

### Real-Time Progress Stops
```bash
# Check SSE connection
curl http://localhost:3000/api/meta-agent-factory/progress/[requestId]?format=sse

# Check Redis coordination
http://localhost:3000/admin/observability/api/history
```

## 🎯 Advanced Usage

### Using TaskMaster for Complex Projects
```bash
# Create detailed PRD first
echo "Build monitoring dashboard for lead generation system" > monitoring-prd.md

# Parse with TaskMaster research
task-master parse-prd monitoring-prd.md --research

# Submit to factory with structured requirements
# Go to http://localhost:3000/meta-agent-factory
# Use TaskMaster output as requirements input
```

### Direct Agent Orchestration
```bash
# Use Infrastructure Orchestrator directly
cd src/meta-agents/infra-orchestrator
npm run build
node dist/main.js orchestrate --project-root ../../../generated --enable-investigation --project-name [name]
```

---

**🎯 Result:** Complete, functional projects generated automatically with real-time visual feedback and comprehensive documentation.