# Meta-Agent Workflow Guide
*Complete step-by-step procedures for using each meta-agent effectively*

## Overview
This guide provides detailed, repeatable steps for using each of the 11 meta-agents in the Meta-Agent Factory. Use this as the authoritative reference to eliminate processing time and ensure consistent results.

---

## 1. PRD-Parser Agent

**Purpose**: Parse Product Requirements Documents and generate structured task breakdowns  
**Input**: PRD markdown file or text content  
**Output**: Structured JSON with tasks array and metadata  

### Step-by-Step Process:
1. **Prepare Input**: Ensure PRD is in markdown format with clear sections
2. **Use TaskMaster CLI**: `task-master parse-prd --input="path/to/prd.md" --research`
3. **Validate Output**: Check for tasks array with id, title, description, dependencies
4. **Store Results**: Save JSON output for downstream agents

### Required Input Format:
```markdown
# Project Name - PRD
## Executive Summary
## Objectives  
## Technical Requirements
## Implementation Details
```

### Expected Output Format:
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Task Title",
      "description": "Task description", 
      "details": "Implementation details",
      "testStrategy": "Testing approach",
      "priority": "high|medium|low",
      "dependencies": [],
      "status": "pending"
    }
  ],
  "metadata": {
    "projectName": "Project Name",
    "totalTasks": 10,
    "sourceFile": "prd.md"
  }
}
```

---

## 2. Scaffold Generator Agent

**Purpose**: Generate complete project scaffolding from parsed PRD tasks  
**Input**: PRD JSON with tasks array  
**Output**: Full project directory structure with files  

### Step-by-Step Process:
1. **Load PRD Results**: Read JSON output from PRD-Parser Agent
2. **Prepare Input**: Create PRD object with tasks and metadata
3. **Execute Generator**: Run via Node.js with stdin input
4. **Verify Output**: Check generated files in target directory

### CLI Usage:
```bash
node scaffold-generator/main.js
# Provide PRD JSON via stdin
```

### Expected Output Structure:
```
project-name/
├── package.json
├── README.md  
├── src/
│   ├── main.js
│   ├── config/
│   └── lib/
├── tests/
└── docs/
```

---

## 3. Infrastructure Orchestrator Agent (IOA)

**Purpose**: Coordinate and orchestrate the execution of all meta-agents  
**Input**: Work request with project requirements  
**Output**: Orchestrated execution plan and monitoring  

### Step-by-Step Process:
1. **Initialize Orchestrator**: `node infra-orchestrator/dist/main.js orchestrate`
2. **Submit Work Request**: Provide project requirements and agent sequence
3. **Monitor Execution**: Track progress through all agent stages
4. **Validate Results**: Ensure all agents completed successfully

### CLI Usage:
```bash
node dist/main.js orchestrate --enable-investigation --project-root /path/to/project
```

### Orchestration Sequence:
1. PRD-Parser → Parse requirements
2. Scaffold-Generator → Create project structure
3. Template-Engine → Generate templates
4. Parameter-Flow → Configure data flow
5. Vercel-Architecture → Setup deployment
6. All-Purpose-Pattern → Apply patterns
7. Five-Document-Framework → Generate docs
8. Thirty-Minute-Rule → Validate complexity

---

## 4. Template Engine Factory

**Purpose**: Generate templates and boilerplate code  
**Input**: Project configuration and patterns  
**Output**: Template files and configurations  

### Step-by-Step Process:
1. **Define Templates**: Specify template types needed
2. **Execute Engine**: `node template-engine/src/main.ts --action generate`
3. **Apply Context**: Use existing patterns from Context7
4. **Validate Templates**: Ensure templates are functional

---

## 5. All-Purpose Pattern Agent

**Purpose**: Apply All-Purpose Pattern methodology to eliminate hardcoded limitations  
**Input**: Existing codebase or new project  
**Output**: Refactored code with zero hardcoded limitations  

### Step-by-Step Process:
1. **Analyze Code**: Scan for hardcoded limitations
2. **Apply Pattern**: Convert fixed values to dynamic configurations
3. **Validate Flexibility**: Test with multiple use cases
4. **Document Pattern**: Record pattern applications

---

## 6. Parameter Flow Agent

**Purpose**: Design and implement data flow between system components  
**Input**: System architecture and integration requirements  
**Output**: Parameter flow diagrams and implementation  

### Step-by-Step Process:
1. **Map Data Flow**: Identify all data touchpoints
2. **Design Parameters**: Create parameter schemas
3. **Implement Flow**: Code parameter handling
4. **Test Integration**: Validate end-to-end flow

---

## 7. Vercel Native Architecture Agent

**Purpose**: Design and implement Vercel-optimized deployments  
**Input**: Project structure and deployment requirements  
**Output**: Vercel-ready configuration and setup  

### Step-by-Step Process:
1. **Analyze Project**: Assess Vercel compatibility
2. **Configure Deployment**: Setup vercel.json and functions
3. **Optimize Performance**: Apply Vercel best practices
4. **Deploy and Test**: Validate deployment works

---

## 8. Five Document Framework Agent

**Purpose**: Generate comprehensive project documentation  
**Input**: Project codebase and requirements  
**Output**: 5 essential documentation files  

### Step-by-Step Process:
1. **Generate README**: Project overview and setup
2. **Create API Docs**: Endpoint documentation
3. **Write Setup Guide**: Installation instructions  
4. **Document Architecture**: System design
5. **Create Contributing Guide**: Development workflow

---

## 9. Thirty Minute Rule Agent

**Purpose**: Validate and ensure tasks follow the 30-minute rule  
**Input**: Task breakdown and complexity analysis  
**Output**: Validated tasks under 30-minute threshold  

### Step-by-Step Process:
1. **Analyze Complexity**: Review each task for time estimation
2. **Break Down Large Tasks**: Split tasks exceeding 30 minutes
3. **Validate Dependencies**: Ensure proper task sequencing
4. **Final Review**: Confirm all tasks are manageable

---

## Complete Workflow Sequence

### Phase 1: Planning & Parsing
1. **PRD-Parser**: Generate task breakdown from requirements
2. **Thirty-Minute-Rule**: Validate task complexity

### Phase 2: Architecture & Design  
3. **Infrastructure-Orchestrator**: Plan execution strategy
4. **Parameter-Flow**: Design data architecture
5. **All-Purpose-Pattern**: Apply flexibility patterns

### Phase 3: Implementation
6. **Scaffold-Generator**: Create project structure
7. **Template-Engine**: Generate boilerplate code
8. **Vercel-Architecture**: Setup deployment

### Phase 4: Documentation & Validation
9. **Five-Document-Framework**: Generate documentation
10. **Infrastructure-Orchestrator**: Final validation
11. **Meta-Agent-Coordination**: Overall quality assurance

---

## Quick Reference Commands

### Start Meta-Agent Factory:
```bash
# 1. Parse PRD
task-master parse-prd --input="project-prd.md" --research

# 2. Orchestrate Build
node infra-orchestrator/dist/main.js orchestrate --project-root ./generated

# 3. Monitor Progress
curl http://localhost:3003/api/meta-agent-factory/status
```

### Emergency Troubleshooting:
- **Agent Fails**: Check individual agent logs in console
- **File Missing**: Verify generated directory permissions
- **API Error**: Restart Next.js server and retry
- **Build Issues**: Run `npm install` in generated project

---

## Success Criteria

✅ **PRD Parsed**: Tasks JSON generated with 10+ structured tasks  
✅ **Scaffold Created**: Project directory with package.json, src/, tests/  
✅ **Code Generated**: Functional main files and configurations  
✅ **Tests Passing**: All generated tests execute successfully  
✅ **Documentation Complete**: README and setup guides created  
✅ **Deployment Ready**: Vercel configuration functional  

This guide ensures consistent, repeatable results across all meta-agent operations.