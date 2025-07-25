# Agent Orchestration System - How It Actually Should Work
*Sequential agent triggering with IOA coordination*

## The Problem We Just Discovered

❌ **Wrong Approach**: Manually running agents one by one  
✅ **Correct Approach**: Automated sequential orchestration with IOA coordination

## How Sequential Agent Triggering Should Work

### 1. Infrastructure Orchestrator Agent (IOA) - Constant Runner
```bash
# IOA should run constantly and coordinate everything
cd src/meta-agents/infra-orchestrator
node dist/main.js orchestrate --mode=continuous --project=prospector-agent
```

**IOA Responsibilities**:
- Monitor for new project requests
- Coordinate sequential agent execution
- Handle agent-to-agent communication
- Track progress and completion status
- Trigger next agent when previous completes

### 2. Sequential Agent Pipeline

**Sequence**:
1. **PRD-Parser** → Parses requirements, outputs structured tasks
2. **Scaffold-Generator** → Creates basic structure, signals completion to IOA
3. **Template-Engine-Factory** → Generates actual implementation code
4. **All-Purpose-Pattern** → Applies zero-limitation methodology  
5. **Parameter-Flow** → Configures API integrations and data flow
6. **Vercel-Native-Architecture** → Sets up deployment configuration
7. **Five-Document-Framework** → Generates comprehensive documentation
8. **Thirty-Minute-Rule** → Validates implementation complexity

### 3. Agent Communication Protocol

Each agent should:
- **Signal Start**: Notify IOA when beginning work
- **Report Progress**: Send status updates during execution
- **Signal Completion**: Notify IOA when finished + output location
- **Trigger Next**: IOA automatically starts next agent in sequence

## Implementation Plan

### Phase 1: Fix IOA Coordination
```javascript
// IOA should have a project queue and agent pipeline
class InfraOrchestrator {
  async processProject(projectConfig) {
    const pipeline = [
      'prd-parser',
      'scaffold-generator', 
      'template-engine-factory',
      'all-purpose-pattern',
      'parameter-flow',
      'vercel-native-architecture',
      'five-document-framework',
      'thirty-minute-rule'
    ];
    
    for (const agentType of pipeline) {
      await this.executeAgent(agentType, projectConfig);
      await this.waitForCompletion(agentType);
      projectConfig = this.updateConfigWithOutput(agentType);
    }
  }
}
```

### Phase 2: Agent Event System
```javascript
// Each agent emits events that IOA listens for
agent.emit('started', { agentType, projectId, timestamp });
agent.emit('progress', { agentType, projectId, progress, details });
agent.emit('completed', { agentType, projectId, outputPath, results });
agent.emit('failed', { agentType, projectId, error });
```

### Phase 3: Fix Agent CLI Interfaces

**Current Problem**: Inconsistent CLI interfaces across agents

**Solution**: Standardize all agents to accept:
```bash
node dist/main.js --project-id=<id> --input-path=<path> --output-path=<path> --notify-ioa
```

## Working Commands (Updated)

### Start Complete Orchestration
```bash
# Method 1: Use IOA with proper orchestration
cd C:/Users/Stuart/Desktop/Projects/allpurp/src/meta-agents/infra-orchestrator
node dist/main.js orchestrate --project=prospector-agent --mode=continuous

# Method 2: Use the full startup script (runs all agents + coordination)
cd C:/Users/Stuart/Desktop/Projects/allpurp
node start-all-agents.js
```

### Submit Project Request
```bash
# Submit to running IOA coordination system
curl -X POST http://localhost:3000/api/meta-agent-coordination \
  -H "Content-Type: application/json" \
  -d '{
    "projectType": "api-service",
    "projectName": "prospector-agent",
    "requirements": { /* PRD data */ }
  }'
```

### Monitor Progress
```bash
# Real-time monitoring dashboard
http://localhost:3000/admin/observability/working

# Agent status and pipeline progress
curl http://localhost:3000/api/agent-status
```

## The Missing Pieces We Need to Implement

1. **Event-Driven Agent Communication**
2. **IOA Project Queue Management** 
3. **Standardized Agent CLI Interfaces**
4. **Completion Detection and Triggering**
5. **Error Handling and Retry Logic**
6. **Real-time Progress Monitoring**

## Current Status: What Works vs What Doesn't

✅ **Works**: Individual agents can run and process input  
✅ **Works**: IOA can coordinate basic tasks  
✅ **Works**: Meta-agent startup script launches all agents  

❌ **Broken**: Sequential triggering (agents don't auto-start next agent)  
❌ **Broken**: Completion detection (no way to know when agent finished)  
❌ **Broken**: State passing (output from agent 1 doesn't feed to agent 2)  
❌ **Broken**: Error recovery (if one agent fails, pipeline stops)  

## Next Steps

1. **Fix IOA orchestration logic** to handle sequential pipeline
2. **Implement agent event system** for completion signaling
3. **Standardize agent CLI interfaces** for consistent execution
4. **Test complete pipeline** with Prospector Agent
5. **Update documentation** with working orchestration commands

This system should work like an assembly line - each agent completes its work and automatically triggers the next agent, with IOA managing the whole process.