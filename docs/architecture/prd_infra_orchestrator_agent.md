# Infra Orchestrator Agent (IOA) – PRD

## Purpose
Create a single LLM-driven "foreman" that keeps the meta-agent factory and infra healthy:
- Orchestrates TaskMaster, Context7, and RAG sync.
- Enforces debug/env/30‑Minute Rule/parameter rules.
- Auto-generates status docs.
- Audits agent hygiene (RAG usage, knowledge logging).

## Context
Building on our completed RAG system with:
- ✅ TaskMaster CLI integration with context injection
- ✅ Meta-Agent Coordination system with shared knowledge base
- ✅ Project Context Awareness with file change detection
- ✅ Conversation Memory Store with 75% test score

This IOA will be Meta-Agent #3, orchestrating the development of Meta-Agents #4-7.

## Inputs
- Repo diff / PR metadata (via GitHub Action context)
- TaskMaster outputs (`.taskmaster/tasks.json`)
- RAG system endpoints and knowledge base
- Context7 CLI/HTTP endpoints
- Env schema (`env.schema.ts`)
- Debug endpoints (`/api/debug/*`)
- PARAMETER_MAPPING.md
- Meta-Agent Coordinator knowledge base

## Outputs
- Updated scripts/tests/configs
- New/updated markdown docs (status graph, env setup)
- TaskMaster tasks / PRs when fixes are needed
- RAG knowledge entries for decisions/changes
- Meta-agent coordination tasks and status updates

## Functional Requirements

### 1. Pipeline Orchestration
- **On PR events** → dry-run TaskMaster embed + report using RAG context injection
- **On merge** → full run, commit doc changes, update RAG knowledge base, embed new docs
- **Cron** → audit RAG freshness, open coordination tasks for stale knowledge

### 2. Compliance Enforcement
- **Environment Validation**: `.env.example` vs `env.schema.ts`, fail CI on mismatch
- **Debug Contract Testing**: `/api/debug/health` for required keys
- **Parameter Drift Detection**: Code interfaces vs PARAMETER_MAPPING.md comparison
- **All-Purpose Pattern Enforcement**: Hardcode detection (regex/AST) - NO hardcoded arrays, NO limitations
- **RAG Usage Validation**: Ensure all meta-agents use enhanced TaskMaster CLI with context injection

### 3. RAG & Coordination Integration
- **Enhanced TaskMaster Hooks**: Provide `beforeRun/afterRun` agent hooks to load/save RAG knowledge
- **Meta-Agent Coordination**: Register with coordinator, share compliance findings as knowledge
- **Context7 Integration**: Pull/push documentation snippets for all agent operations
- **IOA Auditing**: Check that every meta-agent uses RAG system and logs to shared knowledge base

### 4. Status Doc Generation
- **Auto-generate** `PROJECT_STATUS_KNOWLEDGE_GRAPH.md` with Mermaid/DOT diagrams
- **Sections**: "Recently completed", "Currently building", "Next up", "RAG system health"
- **Meta-Agent Progress**: Track completion of 7 meta-agents with dependency mapping
- **Commit on merge** if documentation changed

### 5. Meta-Agent Factory Oversight
- **Quality Gates**: Each new meta-agent must pass IOA compliance before activation
- **Knowledge Validation**: Ensure agents properly use shared knowledge base
- **Performance Monitoring**: Track meta-agent coordination efficiency
- **Development Acceleration**: Auto-generate boilerplate for new meta-agents

## Non-Functional Requirements
- **Cheap**: Deterministic scripts for enforcement, LLM only when reasoning needed
- **Observable**: Logs to RAG knowledge base + CI artifacts
- **Extensible**: Easy to add new compliance checks via configuration
- **RAG-Native**: Uses context injection for all operations
- **Coordination-Aware**: Integrates with meta-agent coordination system

## Tech Stack
- **Core**: Node/TS for scripts, leveraging existing RAG system infrastructure
- **Validation**: Zod for env schema validation
- **Testing**: Jest for compliance tests
- **CI/CD**: GitHub Actions for automated triggers
- **Visualization**: Mermaid for diagrams (or DOT)
- **Integration**: 
  - Enhanced TaskMaster CLI with RAG context injection
  - Meta-Agent Coordinator for task management
  - RAG system for knowledge storage and retrieval
  - Context7 MCP server for documentation

## Integration with Existing Systems

### RAG System Integration
- **Enhanced Development**: Uses `task-master-enhanced.js` for all operations
- **Knowledge Sharing**: Stores compliance findings in shared knowledge base
- **Context Awareness**: Leverages project context tracking for change detection
- **Memory**: Uses conversation memory for maintaining development context

### Meta-Agent Coordination
- **Registration**: IOA registers as coordination agent with infrastructure oversight capabilities
- **Task Management**: Creates and manages compliance tasks for other agents
- **Knowledge Distribution**: Shares infrastructure patterns and compliance rules
- **Health Monitoring**: Monitors coordination system health and performance

## Acceptance Criteria
- ✅ CI fails if any compliance check fails
- ✅ Docs auto-update on merge using RAG system
- ✅ Meta-agents use RAG knowledge consistently (checked via coordination system)
- ✅ One command (`npm run infra:pipeline`) runs the whole orchestration locally
- ✅ IOA integrates with existing RAG system without disruption
- ✅ All-Purpose Pattern enforcement prevents hardcoded limitations
- ✅ Enhanced TaskMaster CLI used for all agent operations
- ✅ Meta-agent coordination system health monitored and maintained

## Implementation Phases

### Phase 1: Core IOA Infrastructure
- Basic IOA agent structure following All-Purpose Pattern
- Integration with RAG system and meta-agent coordinator
- Enhanced TaskMaster CLI integration
- Basic compliance checking framework

### Phase 2: Advanced Compliance
- Environment validation against schema
- Parameter mapping drift detection
- All-Purpose Pattern enforcement (hardcode detection)
- Debug endpoint contract testing

### Phase 3: Documentation Automation
- Auto-generation of status documents with Mermaid diagrams
- Integration with GitHub Actions for CI/CD
- Automated knowledge base updates

### Phase 4: Meta-Agent Oversight
- Quality gates for new meta-agent development
- Performance monitoring and optimization
- Development acceleration tools

## Open Questions
- **RAG Knowledge Schema**: Extend existing SharedKnowledge interface for infrastructure data?
- **Storage Location**: Use existing `.rag-cache/` or create `.ioa/` directory?
- **Notification Level**: How verbose should IOA be in coordination system?
- **GitHub Integration**: Use existing project GitHub setup or require additional permissions?

## Success Metrics
- **Development Velocity**: 50% faster meta-agent development with IOA oversight
- **Code Quality**: 90% compliance with All-Purpose Pattern across all agents
- **Documentation Freshness**: 100% auto-generated documentation accuracy
- **System Health**: Zero critical infrastructure issues in production
- **RAG Utilization**: 100% of meta-agents using enhanced TaskMaster CLI with context injection

---

**This IOA represents the evolution from manual meta-agent development to systematic, automated, quality-assured meta-agent factory operations with full RAG system integration.**