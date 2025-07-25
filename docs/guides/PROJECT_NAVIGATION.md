# Project Navigation Guide

**Updated:** January 2025  
**Status:** Complete Reorganization

## 🎯 Quick Navigation

### **For Users (Non-Technical)**
- **Start Here**: `docs/guides/README.md` - What this project does
- **Quick Start**: `docs/guides/QUICK_START.md` - Get it running in 5 minutes
- **System Overview**: `docs/guides/SYSTEM_DOCUMENTATION.md` - Understand your system

### **For Developers**
- **Project Status**: `docs/guides/COMPREHENSIVE_PROJECT_STATUS.md` - Technical status
- **Architecture**: `docs/architecture/` - System design and meta-agents
- **API Documentation**: `docs/api/` - Endpoint references

### **Working Applications**
- **Lead Generation App**: `apps/lead-generation/` - Your main Next.js application
- **Meta-Agent Factory**: `apps/meta-agent-factory/` - UI for meta-agent management

## 📁 New Project Structure

```
all-purpose/
├── apps/                          # USER-FACING APPLICATIONS
│   ├── lead-generation/           # 🔒 Your working lead generation system
│   │   ├── app/                   # Next.js app pages and API routes
│   │   ├── lib/                   # App-specific utilities
│   │   ├── public/                # Static assets
│   │   └── package.json           # App dependencies
│   └── meta-agent-factory/        # Meta-agent management interface
│
├── packages/                      # SHARED SYSTEMS & LIBRARIES
│   ├── meta-agents/               # All 11 specialized meta-agents
│   │   ├── account-creation-system/
│   │   ├── all-purpose-pattern/
│   │   ├── five-document-framework/
│   │   ├── infra-orchestrator/
│   │   ├── parameter-flow/
│   │   ├── post-creation-investigator/
│   │   ├── prd-parser/
│   │   ├── scaffold-generator/
│   │   ├── template-engine-factory/
│   │   ├── thirty-minute-rule/
│   │   └── vercel-native-architecture/
│   ├── rag-system/                # Documentation memory system
│   ├── shared-lib/                # Common utilities and libraries
│   └── generated-outputs/         # All generated project outputs
│
├── tests/                         # CENTRALIZED TESTING
│   ├── unit/                      # Unit tests for individual components
│   ├── integration/               # Integration tests (formerly test-*.js)
│   └── e2e/                       # End-to-end tests
│
├── docs/                          # 📚 SINGLE SOURCE OF TRUTH DOCUMENTATION
│   ├── guides/                    # User guides and getting started
│   ├── architecture/              # System architecture and design
│   ├── api/                       # API documentation and references
│   └── archive/                   # Historical documentation
│
├── scripts/                       # Build and utility scripts
├── configs/                       # Configuration files (.env, docker, etc.)
└── logs/                          # Centralized logging
```

## 🚀 How to Use Different Parts

### **Lead Generation System (Your Main App)**
```bash
cd apps/lead-generation
npm run dev
# Open http://localhost:3000
```

### **Meta-Agents (Development Tools)**
```bash
# All Purpose Pattern (removes hardcoded limitations)
cd packages/meta-agents/all-purpose-pattern
npm run detect-patterns

# Five Document Framework (generates documentation)
cd packages/meta-agents/five-document-framework
npm run generate-docs

# Infrastructure Orchestrator (coordinates agents)
cd packages/meta-agents/infra-orchestrator
npm run orchestrate
```

### **RAG Documentation System (AI Memory)**
```bash
cd packages/rag-system
node context-cli.js
# Ask: "How does my lead generation system work?"

# Enhanced TaskMaster with project context
node task-master-enhanced.js research "meta-agent development"
```

### **Testing**
```bash
# Run integration tests (formerly scattered test-*.js files)
cd tests/integration
node test-complete-conversation.js

# Run unit tests
cd tests/unit
npm test
```

## 📖 Documentation Guide

### **Start Here (Choose Your Path)**

**🆕 New to this project?**
1. `docs/guides/README.md` - Project overview
2. `docs/guides/QUICK_START.md` - Get it running
3. `docs/guides/SYSTEM_DOCUMENTATION.md` - Understand the system

**🔧 Developer joining the team?**
1. `docs/guides/COMPREHENSIVE_PROJECT_STATUS.md` - Technical status
2. `docs/architecture/meta_agent_factory.md` - Meta-agent system
3. `docs/architecture/` - Browse all architecture docs

**🚀 Want to use specific features?**
1. `docs/api/` - API endpoint documentation
2. `packages/meta-agents/[agent-name]/README.md` - Individual agent guides
3. `packages/rag-system/README.md` - Documentation memory system

### **Migrated Documentation Locations**

| Old Location | New Location | Purpose |
|-------------|-------------|---------|
| `/README.md` | `docs/guides/README.md` | Project overview |
| `/SYSTEM_DOCUMENTATION.md` | `docs/guides/SYSTEM_DOCUMENTATION.md` | System explanation |
| `/QUICK_START.md` | `docs/guides/QUICK_START.md` | Getting started |
| `/docs-consolidated/*.md` | `docs/architecture/*.md` | Architecture docs |
| `/docs/*.md` | `docs/architecture/*.md` | Architecture docs |
| `/docs-archive/*.md` | `docs/archive/*.md` | Historical docs |
| `/META_AGENT_*.md` | `docs/architecture/*.md` | Meta-agent docs |

## 🔍 Finding Things

### **I want to...**

**Run the lead generation system**
→ `apps/lead-generation/` and run `npm run dev`

**Understand what this project does**
→ `docs/guides/README.md`

**Build a new feature**
→ `packages/meta-agents/` and `docs/architecture/meta_agent_factory.md`

**Fix a bug**
→ `tests/integration/` for test files, `docs/guides/COMPREHENSIVE_PROJECT_STATUS.md` for system status

**Add documentation**
→ `docs/guides/` for user docs, `docs/architecture/` for technical docs

**See generated projects**
→ `packages/generated-outputs/`

**Access AI memory system**
→ `packages/rag-system/context-cli.js`

## 🛠️ Development Workflow

### **Adding New Features**
1. Use RAG system: `cd packages/rag-system && node task-master-enhanced.js research "feature idea"`
2. Use meta-agents: `cd packages/meta-agents/scaffold-generator && node main.js`
3. Test: `cd tests/integration && node test-[feature].js`
4. Document: Add to `docs/architecture/` or `docs/guides/`

### **Working with Meta-Agents**
- Each agent is self-contained in `packages/meta-agents/[agent-name]/`
- All have their own package.json and can be run independently
- Use the Infrastructure Orchestrator for coordination

### **Testing Strategy**
- Unit tests: `tests/unit/` - Test individual components
- Integration tests: `tests/integration/` - Test system interactions (formerly test-*.js)
- E2E tests: `tests/e2e/` - Test complete user workflows

## 🚨 Important Notes

### **Protected Systems**
- **Lead Generation App**: `apps/lead-generation/` - This is your working production system
- **Original files remain**: Nothing was deleted, only reorganized
- **Backward compatibility**: All existing functionality preserved

### **Path Updates Required**
- RAG system needs re-indexing with new paths
- Documentation references need updating
- Import statements in code may need updates

### **Rollback Plan**
- Original structure preserved until validation complete
- All moves were copies first, then cleanup
- Can revert if any issues discovered

---

**This navigation guide will help you find anything in the reorganized project quickly and efficiently.**