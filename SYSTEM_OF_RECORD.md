
# SYSTEM OF RECORD - ALL-PURPOSE META-AGENT FACTORY

> **Version**: 1.0
> **Last Updated**: 2025-07-27
> **Status**: Consolidated from 266 project documents. This is the definitive guide.

## 1. Executive Summary

This document is the single source of truth for the **All-Purpose Meta-Agent Factory**, a revolutionary system designed to automate software development. The project consists of two main parts: a **fully operational lead-generation system** and the **meta-agent factory** intended to build similar systems autonomously.

The primary goal is to make the Meta-Agent Factory fully operational. The main blocker is a systemic conflict between **ES Modules (ESM)** and **CommonJS (CJS)** module systems, preventing the core orchestration script (`start-all-agents.js`) from running.

This document synthesizes all existing documentation to provide a unified vision and a clear path forward.

## 2. Core Philosophy: The All-Purpose Pattern

The foundational principle of this project is the **All-Purpose Pattern**. This methodology dictates that all systems must be designed to be universally applicable, with **ZERO hardcoded limitations**.

- **NO** hardcoded industry lists (e.g., `['dental', 'automotive']`).
- **NO** hardcoded geographical constraints.
- **NO** hardcoded business logic.

All system behavior must be driven by dynamic, user-provided configuration. This ensures that any generated system is infinitely scalable and adaptable to any context.

## 3. System Architecture: A Multi-Layered Ecosystem

The project is a sophisticated, multi-layered ecosystem designed for autonomous operation.

### Layer 1: The Production Lead-Generation System
- **Status**: ✅ Fully Operational
- **Purpose**: A live, SMS-based AI lead qualification system.
- **Key Feature**: It embodies the **All-Purpose Pattern**, dynamically adapting its conversation based on the lead's industry.

### Layer 2: The UEP Meta-Agent Factory
- **Status**: 🚧 Partially Operational (Blocked by module issues)
- **Purpose**: A factory of specialized AI agents that work together to build complete software projects from a Product Requirements Document (PRD).
- **Core Components**:
    - **UEP (Universal Execution Protocol)**: The nervous system that allows all agents to communicate and coordinate tasks.
    - **Meta-Agents (9 total)**: Each performs a specific function in the software development lifecycle (e.g., parsing requirements, generating code, setting up infrastructure).
    - **Domain-Specific Agents (5 total)**: Specialized agents for frontend, backend, DevOps, QA, and documentation.

### Layer 3: Intelligence and Coordination
- **RAG (Retrieval-Augmented Generation)**: The project's "memory." An indexed knowledge base of over 659 files, providing context to agents.
- **Taskmaster**: An AI-powered project management tool that breaks down PRDs into actionable tasks and orchestrates their execution.
- **Context7**: A code-scanning tool that gives agents awareness of the existing codebase to ensure consistency and avoid redundant work.
- **Observability Dashboard**: A real-time monitoring UI to visualize the status and interactions of all agents.

## 4. The Critical Blocker: Module System Conflict

The entire Meta-Agent Factory is currently stalled by a fundamental technical issue:

- **The Problem**: The project's `package.json` is configured for **ES Modules**, but the majority of the core agent scripts are written in **CommonJS**.
- **The Impact**: When `start-all-agents.js` attempts to load the agent files, Node.js throws an error because it encounters `require()` statements in files it expects to be ESM.
- **The Solution**: A systematic conversion of all CommonJS files to the ES Module standard is required. This involves:
    1.  Changing `require()` to `import`.
    2.  Changing `module.exports` to `export`.
    3.  Ensuring all relative import paths include the `.js` extension.

## 5. The Path Forward: A Phased Approach

To get the Meta-Agent Factory fully operational, we will follow the plan outlined in our initial discussion:

### Phase 1: Discovery and Consolidation (This Document)
- **Action**: Synthesize all 266 documentation files into this single `SYSTEM_OF_RECORD.md`.
- **Outcome**: A unified, consistent understanding of the project's architecture, goals, and challenges.

### Phase 2: Blueprinting the Factory
- **Action**: Draft a "Master PRD" for the Meta-Agent Factory itself, defining its inputs, outputs, and behavior.
- **Action**: Create a detailed workflow diagram illustrating the end-to-end process from PRD to deployed application.

### Phase 3: Implementation and Refinement
- **Action**: Systematically fix the ESM/CJS module conflicts.
- **Action**: Refine the RAG system using the consolidated knowledge base.
- **Action**: Implement a "dry run" mode for the factory to simulate a full build without executing it.

### Phase 4: Validation and Iteration
- **Action**: Test the factory with a simple "Hello World" project.
- **Action**: Gradually increase the complexity of the projects, iterating and refining the system with each build.

## 6. Key Tools and How to Use Them

### **Taskmaster**
- **Purpose**: The primary tool for project management and task orchestration.
- **Key Commands**:
    - `task-master parse-prd <file>`: Generate tasks from a PRD.
    - `task-master list`: View all tasks.
    - `task-master next`: See the next available task.
    - `task-master expand <id>`: Break down a complex task.
- **Your Role**: Use Taskmaster to guide the development process. The `dev_workflow.md` files in the `.clinerules` and other directories provide detailed instructions.

### **Context7**
- **Purpose**: Provides code-awareness to the agents.
- **Usage**: Integrated into the UEP, it automatically scans the codebase to provide relevant context for each task.

### **RAG System**
- **Purpose**: The long-term memory of the project.
- **Usage**: Automatically queried by the UEP to provide documentation and historical context for tasks.

## 7. Conclusion

This project is incredibly ambitious and well-architected. The current roadblock, while critical, is a common issue in large JavaScript projects and is solvable with a systematic approach. By following the plan outlined above and using this document as the single source of truth, we can get the UEP Meta-Agent Factory fully operational and realize your vision of an autonomous software development pipeline.
