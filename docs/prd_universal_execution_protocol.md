# Universal Execution Protocol for Meta Agents and Human Users - PRD

## Executive Summary

The Universal Execution Protocol (UEP) is a standardized, intelligent execution pipeline that all agents and manual users must follow before performing any task. This middleware system ensures consistent behavior, context-awareness, and usage of all required internal tooling (TaskMaster, Context7, working memory, RAG) to eliminate repeated instructions, hallucinated work, broken code, and inefficient reasoning.

## Problem Statement

Current meta-agents and human users often forget or skip important context, tools, or memory when starting tasks. This leads to:
- Repeated instructions and explanations
- Hallucinated work that doesn't consider existing codebase
- Broken code due to lack of context awareness
- Inefficient reasoning without proper memory recall
- Inconsistent tool usage despite building TaskMaster and Context7

The system lacks a pre-task enforcement layer that guarantees structured reasoning, memory recall, documentation reference, and codebase awareness, resulting in chaotic workflows and unreliable outputs.

## Objectives

### Primary Goal
Create a middleware "traffic cop" that halts or rewrites incomplete tasks before execution, ensuring every task follows a standardized protocol.

### Success Criteria
- 100% of tasks executed through full protocol
- >90% success rate in pulling relevant memory, docs, or tools
- Reduction in hallucinated or redundant work
- Increase in agent and prompt reliability
- Faster execution with richer prefilled context

## Technical Requirements

### Core Components

#### 1. Execution Protocol Enforcement
**Description**: Pre-task processor that validates all required components are present
**Requirements**:
- Check for TaskMaster task breakdown
- Verify Context7 codebase scan completion
- Confirm memory retrieval from Redis
- Validate document RAG search execution
- Enforce protocol compliance

**Validation Matrix**:
- TaskMaster Plan: Required=Yes, Fallback=Retry or Clarify, Result on Failure=Halt
- Context7 Code Awareness: Required=Yes, Fallback=Notify, Result on Failure=Block execution
- Memory Retrieval: Required=Yes, Fallback=Retry from cache, Result on Failure=Proceed with warning
- Doc Lookup (RAG): Required=Yes, Fallback=Warn, Result on Failure=Soft-fail allowed
- Protocol Compliance: Required=Yes, Fallback=None, Result on Failure=Must be enforced

#### 2. Persistent Memory Access
**Description**: Redis-based working memory for agent task continuity
**Requirements**:
- Store working memory per agent, per task, per input hash
- Support short-term task memory and long-term session memory
- Implement relevance scoring for memory retrieval
- Memory keys format: `agent_id + task_type + hash_of_input`
- Integration with existing working memory system

#### 3. Task Breakdown via TaskMaster
**Description**: Mandatory TaskMaster integration for all tasks
**Requirements**:
- Run TaskMaster parse-prd or research for every task
- Generate subtasks, timeline, dependencies
- Use output for both agent chains and humans
- Follow subtasks sequentially unless overridden
- Research-backed task generation

#### 4. Contextual Codebase Awareness via Context7
**Description**: Automatic codebase scanning before execution
**Requirements**:
- Scan repository to identify relevant code blocks
- Return filenames, functions, reusable code snippets
- Detect collision risks and dependencies
- Inject results into task context
- Cache results for performance

#### 5. Document Retrieval (RAG)
**Description**: Search internal documentation for task-relevant information
**Requirements**:
- Search Upstash vector store for documentation
- Match task context with internal docs
- Add relevant instructions, examples, agent definitions
- Warning prompt for missing documentation
- Fallback to task clarification

#### 6. Protocol Logic Layer
**Description**: Universal reasoning patterns enforcement
**Requirements**:
- Implement pattern: Clarify → Research → Plan → Execute → Review → Report
- Customizable per agent type
- Reject vague tasks that fail protocol requirements
- Require: Goal, Success Metrics, Fallbacks, Completion Criteria

## Implementation Details

### Architecture

#### Middleware Components
1. **Protocol Processor**: Main enforcement engine
2. **Memory Manager**: Redis integration for persistence
3. **TaskMaster Adapter**: Task breakdown automation
4. **Context7 Scanner**: Codebase awareness injection
5. **RAG Interface**: Document retrieval system
6. **Validation Engine**: Protocol compliance checker

#### Integration Points
- **Meta-Agent Factory**: Integration with existing agent orchestration
- **Agent Memory System**: Extension of working memory implementation
- **RAG System**: Connection to existing vector store
- **Start-All-Agents Script**: Middleware initialization

### Technical Specifications

#### Protocol Flow
1. **Input Reception**: Agent or human task input
2. **Protocol Check**: Validate required components
3. **Component Execution**: Run TaskMaster, Context7, Memory, RAG
4. **Context Assembly**: Combine all retrieved information
5. **Task Enhancement**: Enrich original task with context
6. **Execution Approval**: Allow or block task execution
7. **Result Tracking**: Log execution trace

#### API Design
```typescript
interface UniversalExecutionRequest {
  taskDescription: string;
  requesterType: 'agent' | 'human';
  agentId?: string;
  context?: Record<string, any>;
}

interface ExecutionProtocolResult {
  approved: boolean;
  enhancedTask: string;
  context: {
    memory: string;
    codebase: CodebaseContext;
    documentation: DocumentationResult[];
    taskBreakdown: TaskMasterResult;
  };
  executionTrace: ExecutionStep[];
}
```

#### Storage Schema
```typescript
// Redis Memory Keys
agent:mem:{agentId} // Working memory
uep:cache:{hashId} // Protocol result cache
uep:trace:{sessionId} // Execution traces

// Protocol Validation Cache
uep:validation:{taskHash} // Cached validation results
```

### Security and Performance

#### Security Requirements
- Input sanitization and validation
- Access control for memory retrieval
- Audit logging for all protocol decisions
- Rate limiting for API calls

#### Performance Requirements
- <2 second response time for protocol validation
- Caching for repeated Context7 scans
- Optimized memory retrieval
- Batch processing for multiple task requests

## Usage Scenarios

### For Meta Agents
1. Agent startup triggers UEP initialization
2. Each agent task passes through protocol processor
3. Agent receives enriched context and enhanced task
4. Agent execution follows approved protocol
5. Results stored in memory for future context

### For Human Users (Claude Code, etc.)
1. Manual prompt intercepted by UEP middleware
2. Prompt analyzed and enhanced through full protocol
3. User receives structured task breakdown
4. Execution guided by TaskMaster subtasks
5. Results integrated into project memory

### Integration Examples

#### Meta-Agent Integration
```javascript
// Before UEP
await agent.process(task);

// After UEP
const protocolResult = await uep.processTask({
  taskDescription: task,
  requesterType: 'agent',
  agentId: 'prd-parser-001'
});

if (protocolResult.approved) {
  await agent.process(protocolResult.enhancedTask, protocolResult.context);
}
```

#### Human Prompt Enhancement
```javascript
// Human input: "Write a new feature for user authentication"
const uepResult = await uep.processTask({
  taskDescription: "Write a new feature for user authentication",
  requesterType: 'human'
});

// Enhanced output includes:
// - TaskMaster breakdown of authentication tasks
// - Context7 scan of existing auth code
// - Memory of previous auth implementations
// - Documentation about security best practices
```

## Implementation Phases

### Phase 1: Core Protocol Engine (Week 1)
- Build protocol processor and validation engine
- Integrate with existing working memory system
- Create basic TaskMaster adapter
- Implement execution trace logging

### Phase 2: Context Integration (Week 2)
- Integrate Context7 scanning
- Connect to RAG system for documentation
- Build caching layer for performance
- Add protocol validation matrix

### Phase 3: Agent Integration (Week 3)
- Integrate with meta-agent factory
- Update existing agents to use UEP
- Test with agent orchestration
- Performance optimization

### Phase 4: Human Interface (Week 4)
- Create CLI wrapper for human prompts
- Integrate with Claude Code workflow
- Build debugging and override modes
- Comprehensive testing and validation

## Testing Strategy

### Unit Testing
- Protocol validation logic
- Memory retrieval functions
- TaskMaster integration
- Context7 scanning
- RAG document retrieval

### Integration Testing
- End-to-end protocol flow
- Agent orchestration with UEP
- Human prompt enhancement
- Performance under load
- Error handling and fallbacks

### Validation Testing
- Protocol compliance enforcement
- Context accuracy and relevance
- Memory consistency
- Documentation retrieval accuracy
- Task breakdown quality

## Success Metrics

### Technical Metrics
- Protocol enforcement rate: 100%
- Average response time: <2 seconds
- Memory retrieval accuracy: >90%
- Context relevance score: >85%
- Documentation match rate: >80%

### Business Impact
- Reduction in repeated instructions: >70%
- Decrease in hallucinated work: >80%
- Increase in task completion rate: >60%
- Improvement in code quality: >50%
- Time to task completion: -40%

## Deliverables

### Core Implementation
1. **Protocol Processor Middleware**: Central enforcement engine
2. **Memory Integration Module**: Redis-based persistence
3. **TaskMaster Interface**: Automated task breakdown
4. **Context7 Adapter**: Codebase awareness injection
5. **RAG Integration**: Document retrieval system
6. **Validation Engine**: Compliance checking

### Supporting Infrastructure
1. **CLI Wrapper**: Human prompt interface
2. **Agent Integration Kit**: Meta-agent adaptation layer
3. **Configuration Management**: Protocol customization
4. **Monitoring Dashboard**: Execution tracking
5. **Debug Mode**: Override and troubleshooting tools

### Documentation
1. **Implementation Guide**: Technical specifications
2. **Integration Manual**: Agent adaptation instructions
3. **User Guide**: Human interface documentation
4. **API Reference**: Complete protocol API
5. **Troubleshooting Guide**: Common issues and solutions

## Risk Mitigation

### Technical Risks
- **Performance Impact**: Mitigate with caching and optimization
- **Integration Complexity**: Phase rollout and thorough testing
- **Memory Overhead**: Implement efficient storage and cleanup
- **System Dependencies**: Build fallback mechanisms

### Operational Risks
- **User Adoption**: Provide clear benefits and training
- **Backward Compatibility**: Gradual migration strategy
- **Maintenance Overhead**: Automate monitoring and updates

## Future Enhancements

### Advanced Features
- Machine learning for context relevance scoring
- Predictive pre-loading of likely contexts
- Cross-agent learning and pattern recognition
- Integration with external agent ecosystems

### Scalability Improvements
- Distributed processing for large codebases
- Advanced caching strategies
- Load balancing for high-volume usage
- Multi-tenant support for team environments

---

**Status**: Ready for implementation  
**Priority**: High  
**Estimated Timeline**: 4 weeks  
**Team Size**: 1 developer (Claude Code)  
**Dependencies**: TaskMaster, Context7, Working Memory System, RAG System