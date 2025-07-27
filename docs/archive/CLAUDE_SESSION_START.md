# READ THIS FIRST - CLAUDE SESSION STARTUP

## ⚡ INSTANT SYSTEM STATUS

**Current Working State:**
- ✅ **5 Domain Agents Complete** - Backend, Frontend, DevOps, QA, Documentation agents with UEP coordination proven functional
- ✅ **Meta-Agent Factory** - 10+ meta-agents built with visual progress interface
- ✅ **RAG System** - 659+ files indexed, comprehensive search working
- ✅ **Production Lead Gen System** - Original SMS demo system still working
- ❌ **CRITICAL BLOCKER:** ES module errors prevent `node start-all-agents.js` from working

**Immediate Action Required:**
Fix ES module issues to enable full system startup (Task #1 in TodoList)

## 🚀 FACTORY USAGE WORKFLOW

**When System Is Working:**
1. **Health Check:** `npm run dev` → Dashboard at http://localhost:3000
2. **Start Meta-Agents:** `node start-all-agents.js` (CURRENTLY BROKEN - needs ES module fix)
3. **Submit Work:** http://localhost:3000/meta-agent-factory 
4. **Monitor Progress:** Real-time ASCII art + SSE visual feedback
5. **Verify Output:** Generated code in `/generated` directory

**What You Can Do Right Now:**
- Test individual domain agents: `cd generated/[agent-name] && node test-[agent]-agent.js`
- Use TaskMaster: `task-master list`, `task-master next`
- Test RAG system: `cd rag-system && node test-comprehensive-rag-search.js`

## 🎯 THE FACTORY PURPOSE

**Input:** Requirements document or work request via web form
**Process:** 10+ meta-agents coordinate to build complete systems
**Output:** Production-ready code with tests, docs, deployment configs

**Proven Success:** YouTube/GitHub cross-reference system was successfully generated using this exact process.

## 📖 MANDATORY NEXT READS (IN ORDER)

1. **[QUICK_COMMANDS.md](./QUICK_COMMANDS.md)** - Working commands only, ES module fixes
2. **[FACTORY_USAGE_GUIDE.md](./FACTORY_USAGE_GUIDE.md)** - Step-by-step factory usage
3. **[SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)** - Complete architecture overview

## 🚨 CURRENT PRIORITY TASKS

From TodoList:
1. **[IN PROGRESS]** Fix ES module issues preventing start-all-agents.js from working
2. **[PENDING]** Test start-all-agents.js and verify system works  
3. **[PENDING]** Use working UEP system to build monitoring dashboard

**Your Mission:** Use TaskMaster research and Context7 to fix ES module issues, then use the working UEP/Meta-Agent system to build the monitoring dashboard as originally requested.

---

**⚡ TL;DR:** System is 90% complete but blocked by ES module errors. Fix that first, then you can use the factory exactly as intended.