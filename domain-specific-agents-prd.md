# Meta-Agent Factory v2 — Domain-Specific Agent Extension PRD

## 1. Summary

The Meta-Agent Factory is expanding to include a modular suite of domain-specific agents (frontend, backend, DevOps, QA, documentation), which operate in tandem with your 11 existing meta-agents. These agents are coordinated through a central execution layer—the UEP (Universal Execution Protocol)—which handles communication, task routing, and context sharing across all agents.

## 2. Goals

- Automate domain-specific engineering work via AI agents
- Speed up and unify the software development lifecycle  
- Maintain tech-agnostic flexibility across stacks and projects
- Enable seamless agent-to-agent communication through a shared protocol
- Ensure future extensibility with minimal friction

## 3. Who It's For

- Developers (frontend, backend, full-stack)
- QA and SRE teams
- DevOps engineers
- Technical leaders and AI-native teams

## 4. What's Being Built

### 4.1. New Domain Agents

| Agent | Responsibilities |
|-------|------------------|
| Frontend | UI scaffolding, code review, accessibility and performance checks, UI testing |
| Backend | API design, logic, security review, DB modeling, backend testing |
| DevOps | CI/CD setup, infra-as-code generation, observability hooks |
| QA | Test plan writing, edge case discovery, regression tracking |
| Docs | Auto-generated markdown docs, codebase wikis, user onboarding content |

### 4.2. Agent Behavior

- Accept structured tasks from the Meta-Agent Factory
- Communicate via UEP for real-time coordination and handoffs
- Share memory/context, logs, and intermediate outputs
- Trigger sub-agents or escalate when blocked

## 5. Integration with Existing Meta-Agents

| Meta-Agent | Function |
|------------|----------|
| PRD Parser | Converts product specs into structured tasks |
| 30-Minute Rule Agent | Detects long-running tasks and initiates recovery/debug |
| Parameter-Flow Agent | Routes env/config data between agents |
| Scaffold Generator | Seeds project skeletons and base files |
| Vercel Architecture Agent | Ensures deploy-ready frontend/backend output |
| RAG System Agent | Provides contextual info from knowledge base or past code |
| TaskMaster CLI | CLI for invoking full agent workflows |
| Context7 | Keeps API and schema documentation up-to-date |
| Debugging Agent | Helps resolve bugs using shared logs and stack traces |
| Lead Gen Agent | Turns shipped features into outbound demo content |
| Simple PRD Agent | Handles micro-tasks or test requests with minimal orchestration |

## 6. System Architecture

- **Meta-Agent Factory Core**: Task routing and orchestration layer
- **Domain Agent Modules**: Individual vertical specialists
- **Shared Context Layer**: Persistent memory across all agents
- **UEP (Universal Execution Protocol)**: The core inter-agent communication layer
  - Handles:
    - Message passing
    - Task chaining
    - Event logging
    - Real-time status updates
- **Agent Interface Layer**: CLI / API / GUI to trigger and monitor flows
- **Observability Stack**: Logs, alerts, and time-series traces of agent actions

## 7. Functional Requirements

- Agents communicate through UEP, not hardcoded links
- Each agent is independently executable, but also callable via shared workflows
- Outputs must follow common schema and support versioning
- Handoff latency must stay under 1s per agent hop

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Real-time or batch execution under 1s per agent |
| Resilience | UEP retries, fallback routes, and failover logic |
| Extensibility | Easily plug in new agents or tools |
| Security | Sandboxed execution, secure message passing in UEP |
| Neutrality | Tech-agnostic by default, agent-configurable for stack-specific features |

## 9. Example Workflow

**Use Case: Build a "Contact Form" feature**

1. PRD Parser extracts tasks and passes them via UEP to relevant agents
2. Scaffold Generator lays down frontend/backend structure
3. Backend Agent defines routes and logic, using RAG for existing patterns
4. Frontend Agent builds the form UI and links to backend
5. QA Agent writes unit and integration tests
6. Docs Agent generates API usage and onboarding docs
7. DevOps Agent prepares deployment infrastructure
8. UEP handles all communications, context sharing, and task state updates

## 10. Success Metrics

- Agent-to-agent latency stays below 1s (via UEP)
- Agents generate shippable code, tests, or docs >90% of the time
- System scales to dozens of agents without manual routing logic
- New agents integrate in <1 day with no major architecture changes

## 11. Implementation Requirements

### Frontend Agent Implementation
- React/Next.js component generation
- Tailwind CSS styling automation
- Accessibility compliance checking
- Performance optimization recommendations
- UI testing with Playwright/Jest

### Backend Agent Implementation  
- Express/Fastify API endpoint generation
- Database schema design and migration scripts
- Authentication/authorization middleware
- API documentation generation
- Backend testing with Jest/Supertest

### DevOps Agent Implementation
- Docker containerization setup
- Vercel/AWS deployment configurations
- CI/CD pipeline automation (GitHub Actions)
- Infrastructure monitoring setup
- Environment configuration management

### QA Agent Implementation
- Test plan generation from requirements
- Automated test case creation
- Edge case identification and testing
- Regression test suite maintenance
- Bug tracking and reporting integration

### Documentation Agent Implementation
- API documentation from code analysis
- User guide generation
- Technical specification writing
- Changelog automation
- Knowledge base maintenance