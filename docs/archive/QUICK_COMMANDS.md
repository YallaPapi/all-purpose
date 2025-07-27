# Commands That Actually Work Right Now

## 🚀 SYSTEM STARTUP

### Health Check (Always Works)
```bash
# Start observability dashboard
npm run dev
# Go to http://localhost:3000 to verify system is responsive

# Check if meta-agents are healthy
curl http://localhost:3000/admin/observability/api/health
curl http://localhost:3000/admin/observability/api/history
```

### ES Module Fix (CRITICAL - CURRENTLY BROKEN)
```bash
# THE PROBLEM: start-all-agents.js fails with ES module errors
node start-all-agents.js
# Error: "require is not defined in ES module scope"

# THE FIX NEEDED: Convert CommonJS requires to ES imports
# Status: NOT YET IMPLEMENTED (Task #1 in TodoList)
```

## ✅ WORKING COMMANDS

### TaskMaster (Fully Functional)
```bash
task-master list                                    # Show all tasks
task-master next                                   # Get next task
task-master show <id>                             # View task details
task-master set-status --id=<id> --status=done   # Mark complete
task-master parse-prd --input="file.md" --research # Parse requirements
```

### Individual Domain Agents (All Working)
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

### RAG System (Fully Functional)
```bash
cd rag-system
node test-comprehensive-rag-search.js "search query"  # Test search
node task-master-enhanced.js research "topic"         # Enhanced TaskMaster
node test-meta-agent-coordination.js                  # Test coordination
```

### Production Lead Gen System (Always Working)
```bash
npm run dev
# Go to http://localhost:3000
# Click "Launch Quick Demo" - should work perfectly
```

## 🔧 DIAGNOSTIC COMMANDS

### System Health Check
```bash
# Quick health verification
npm run dev && echo "Dashboard: ✓" || echo "Dashboard: ✗"
task-master list && echo "TaskMaster: ✓" || echo "TaskMaster: ✗"  
cd rag-system && node test-comprehensive-rag-search.js "test" && echo "RAG: ✓" || echo "RAG: ✗"
```

### Debug Failed Agent Startup
```bash
# Check TypeScript compilation
npx tsc src/uep/*.ts --outDir dist/uep --target es2020 --module commonjs

# Test UEP components individually
node test-message-passing.js      # If exists
node test-task-state-manager.js   # If exists
```

## 🚨 KNOWN ISSUES & WORKAROUNDS

### Issue: ES Module Errors
**Problem:** `node start-all-agents.js` fails with require/import conflicts
**Workaround:** Use individual agent testing until fixed
**Fix Status:** Task #1 in TodoList (HIGH PRIORITY)

### Issue: Redis Connection Errors  
**Problem:** Upstash connection fails
**Solution:** Check `.env` file for KV_REST_API_URL and KV_REST_API_TOKEN

### Issue: OpenAI API Errors
**Problem:** Chat system fails
**Solution:** Verify OPENAI_API_KEY in environment variables

## 🎯 FACTORY USAGE (When Working)

### Meta-Agent Factory Interface
```bash
# Start system (AFTER ES module fix)
node start-all-agents.js

# Submit work requests
# Go to http://localhost:3000/meta-agent-factory
# Fill form, submit request
# Watch real-time ASCII art progress via SSE
```

### Direct Meta-Agent Usage
```bash
# Infrastructure Orchestrator (recommended approach)
cd src/meta-agents/infra-orchestrator
npm install && npm run build
node dist/main.js orchestrate --project-root ../../../generated --enable-investigation
```

---

**🎯 Priority:** Fix ES module issues first, then all commands will work as intended.