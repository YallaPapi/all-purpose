# Troubleshooting Guide - Meta-Agent Factory

**Quick fixes for common issues in the Meta-Agent Factory system.**

## 🚨 Critical Known Issues

### ❌ ES Module Errors in start-all-agents.js

**Problem:** `node start-all-agents.js` fails with "require is not defined in ES module scope"

**Status:** BROKEN - Known issue  
**Impact:** Can't start all agents with single command  
**Workaround:** Use individual agent coordination

```bash
# DON'T USE THIS (broken):
node start-all-agents.js

# USE THIS INSTEAD (working):
cd src/meta-agents/infra-orchestrator
npm run build
node dist/main.js orchestrate --project-name <your-project>
```

**Root Cause:** Mixed ES modules and CommonJS in the startup script

### ❌ Meta-Agent Factory Web UI Compilation Errors

**Problem:** Next.js compilation errors in `/api/meta-agent-factory/route.tsx`

**Status:** MOSTLY WORKING with known issues  
**Impact:** Web interface may show errors but API endpoints work  
**Workaround:** Use Infrastructure Orchestrator directly

```bash
# If web interface fails, use direct approach:
task-master parse-prd your-project.md --append
cd src/meta-agents/infra-orchestrator
node dist/main.js orchestrate --project-name your-project
```

## 🔧 Quick Diagnostics

### System Health Check

```bash
# 1. Verify basic system responsiveness
npm run dev
curl http://localhost:3000/admin/observability/api/health

# Expected: {"status": "healthy", "timestamp": "..."}
```

```bash
# 2. Test agent coordination (most important test)
node test-uep-coordination-simple.js

# Expected output (all should show ✅):
# ✅ Backend Agent: UEP coordination WORKING
# ✅ Frontend Agent: UEP coordination WORKING  
# ✅ DevOps Agent: UEP coordination WORKING
# ✅ QA Agent: UEP coordination WORKING
# ✅ Documentation Agent: UEP coordination WORKING
```

```bash
# 3. Verify TaskMaster is working
task-master list
task-master next

# Should show tasks without errors
```

```bash
# 4. Test Infrastructure Orchestrator compilation
cd src/meta-agents/infra-orchestrator
npm run build

# Should compile without TypeScript errors
```

## 🛠️ Common Problems & Solutions

### Problem: TaskMaster Command Not Found

**Error:** `task-master: command not found`

**Solution:**
```bash
# Install TaskMaster globally
npm install -g task-master-ai

# Verify installation
task-master --version

# If still failing, check PATH or use npx
npx task-master-ai list
```

### Problem: No Generated Files After Agent Coordination

**Symptoms:** Agents run but no files appear in `generated/` directory

**Debugging Steps:**
```bash
# 1. Check if project directory was created
ls generated/

# 2. Run with verbose output
cd src/meta-agents/infra-orchestrator
node dist/main.js orchestrate --project-name test --project-root ../../../generated --verbose

# 3. Check agent logs
ls logs/
cat logs/ioa-combined.log
```

**Common Causes:**
- Infrastructure Orchestrator didn't compile properly
- Project name contains invalid characters
- File permissions issues

**Solutions:**
```bash
# Ensure clean compilation
cd src/meta-agents/infra-orchestrator
rm -rf dist/
npm run build

# Use simple project names (no spaces, special chars)
node dist/main.js orchestrate --project-name simple-test

# Check file permissions
ls -la ../../../generated/
```

### Problem: Agents Show "Mock" Results

**Symptoms:** Agents report success but generate placeholder/mock content

**Status:** NORMAL - This is expected behavior

**Explanation:**
- Agents have proven architecture and coordination
- Some components use mock implementations for demonstration
- Real implementations can replace mock components as needed

**Not a Problem If:**
- Agents coordinate successfully (UEP working)
- Files are generated (structure proven)
- TaskMaster integration works
- Agent communication flows correctly

### Problem: TypeScript Compilation Errors

**Common Errors:**
```
Cannot find module '@types/node'
Property 'xyz' does not exist on type
Module not found: Can't resolve 'fs-extra'
```

**Solutions:**
```bash
# Install missing dependencies
npm install @types/node fs-extra dotenv zod

# For specific meta-agents
cd src/meta-agents/infra-orchestrator
npm install

# Compile with explicit config
npx tsc --project tsconfig.json
```

### Problem: Agent Coordination Fails

**Symptoms:** Test shows ❌ or agents timeout

**Debugging:**
```bash
# 1. Test individual agents
cd generated/backend-agent
node test-backend-agent.js

# 2. Check UEP integration
node test-uep-integration.js

# 3. Verify Context7 scanning
node test-context7-scanner.js
```

**Common Fixes:**
```bash
# Rebuild agent dependencies
cd generated/backend-agent
npm install

# Check for missing dependencies
npm install @types/node typescript ts-node
```

### Problem: Port Already in Use

**Error:** `Port 3000 is already in use`

**Solutions:**
```bash
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <process-id> /F

# Or use different port
npm run dev -- --port 3001
```

## 🔍 Advanced Debugging

### Enable Verbose Logging

```bash
# Infrastructure Orchestrator verbose mode
cd src/meta-agents/infra-orchestrator
node dist/main.js orchestrate --project-name debug-test --verbose

# Check all log files
ls logs/
cat logs/ioa-combined.log | tail -20
cat logs/ioa-error.log
```

### Debug Agent Communication

```bash
# Test UEP protocol directly
node test-uep-enforcement.js
node test-protocol-logic.js

# Test individual agent creation
node test-final-integration.js
```

### Memory and Performance Issues

```bash
# Check system resources
# Task Manager (Windows) or top (Linux/Mac)

# Clear temporary files
rm -rf temp/
rm -rf .next/

# Restart with clean state
npm run dev
```

### Database Connection Issues

**For projects using databases:**

```bash
# Check Redis connection (if using observability)
redis-cli ping

# Check environment variables
cat .env
printenv | grep -i redis
```

## 📋 System Requirements

### Minimum Requirements

- **Node.js:** v18+ (check: `node --version`)
- **npm:** v9+ (check: `npm --version`)  
- **Memory:** 4GB RAM minimum
- **Storage:** 2GB free space
- **OS:** Windows 10+, macOS 10.15+, or Linux

### Recommended Setup

- **Node.js:** v20+
- **Memory:** 8GB+ RAM
- **Storage:** 10GB+ free space
- **Terminal:** PowerShell (Windows) or Terminal (Mac/Linux)

## 🆘 Emergency Fixes

### Complete System Reset

```bash
# 1. Stop all processes
# Ctrl+C any running npm/node processes

# 2. Clean installation
rm -rf node_modules/
rm -rf .next/
npm install

# 3. Rebuild meta-agents
cd src/meta-agents/infra-orchestrator
rm -rf dist/
npm install
npm run build

# 4. Test basic functionality
cd ../../..
npm run dev
```

### Restore to Working State

```bash
# If everything is broken, get back to basics:

# 1. Verify core system works
npm run dev  # Should start without errors

# 2. Test agent coordination (most critical)
node test-uep-coordination-simple.js  # All agents should show ✅

# 3. If agents work, coordination works
# 4. Individual components can be fixed without breaking the whole system
```

## 📞 Getting Help

### Self-Diagnosis Checklist

Before asking for help:
- [ ] Ran `npm run dev` successfully
- [ ] Tested `node test-uep-coordination-simple.js` (all ✅)
- [ ] Verified `task-master list` works
- [ ] Checked `generated/` directory exists
- [ ] Tried Infrastructure Orchestrator direct approach

### Information to Provide

When reporting issues:
1. **Exact error message** (copy/paste full output)
2. **Command that failed** (exact command you ran)
3. **System info** (`node --version`, `npm --version`, OS)
4. **Output of health check** (`test-uep-coordination-simple.js`)
5. **Generated files status** (`ls generated/`)

### Known Working Commands

**If nothing else works, these should always work:**
```bash
npm run dev                                    # Start system
node test-uep-coordination-simple.js          # Test agents  
task-master list                              # Show tasks
curl http://localhost:3000/api/health         # Health check
```

---

**Remember: The system is designed to be resilient. If agent coordination works (test shows all ✅), the core system is functional and specific issues can be resolved without breaking everything.**