# 🚀 All-Purpose Meta-Agent Factory - Quick Reference Card

## Immediate Session Commands

```bash
# System Health Check (run first)
npm run dev                           # Start observability dashboard
node test-full-uep-integration.js    # Test UEP system (should be >75%)
task-master list                      # Check current tasks

# Current Focus: Domain-Specific Agents
task-master show 32                   # Frontend agent (in-progress)
task-master show 33                   # Backend agent  
task-master set-status --id=32 --status=done  # Mark tasks complete
```

## System Status (Latest)
- **UEP System**: ✅ 75% functional (Message Passing + Task State Management working)
- **Meta-Agent Factory**: ✅ 11 agents operational 
- **TaskMaster**: ✅ Full task management
- **RAG System**: ✅ 659+ files indexed
- **Observability Dashboard**: ✅ Real-time monitoring
- **Current Goal**: Build 5 domain-specific agents

## Emergency Reset Commands
```bash
# If UEP system broken:
npx tsc && node test-full-uep-integration.js

# If agents show "critical":
npm run dev  # Restart dashboard

# If TaskMaster broken:
task-master models  # Check API keys
```

## Key File Locations
- `CLAUDE_QUICK_START.md` - Complete system guide
- `src/meta-agents/infra-orchestrator/` - Main orchestration agent
- `.taskmaster/tasks/tasks.json` - Current project tasks
- `dist/uep/` - UEP system modules

**Remember:** Use Infrastructure Orchestrator for coordination, not manual building!