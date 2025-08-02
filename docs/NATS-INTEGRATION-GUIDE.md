# NATS Integration Guide for Meta-Agent Communication

## Overview

This guide documents the implementation of NATS messaging for real-time agent communication in the All-Purpose Meta-Agent Factory system. The integration replaces stub implementations with actual distributed messaging capabilities.

## Architecture

### Components

1. **NATSEventBus** - Core NATS integration with JetStream support
2. **AgentCoordinator** - High-level workflow orchestration 
3. **NATSAgentWrapper** - Base class for NATS-enabled agents
4. **NATSBackendAgent** - Example implementation for backend agents

### Message Flow

```
┌─────────────────┐     NATS Topics      ┌─────────────────┐
│     Agent       │◄──────────────────────►│  Coordinator    │
│   (Producer)    │                        │   (Consumer)    │
└─────────────────┘                        └─────────────────┘
        │                                           │
        ▼                                           ▼
┌─────────────────┐                        ┌─────────────────┐
│   JetStream     │                        │   JetStream     │
│    Streams      │                        │   Consumers     │
└─────────────────┘                        └─────────────────┘
```

## Key Features

### 1. Real-Time Agent Communication

- Agents publish heartbeats every 30 seconds
- Task assignment via targeted subjects
- Progress updates during task execution
- Result publishing upon completion

### 2. Workflow Orchestration

- Create multi-step workflows
- Define task dependencies
- Parallel execution for independent tasks
- Sequential execution for dependent tasks

### 3. Fault Tolerance

- Automatic agent timeout detection
- Task retry capabilities
- Dead letter queue for failed messages
- Connection resilience with auto-reconnect

## Implementation Details

### NATSEventBus

```typescript
// Core configuration
const eventBus = createNATSEventBus({
  servers: ['nats://localhost:4222'],
  user: 'factory',
  pass: 'factory-secret',
  namespace: 'meta-agent'
});

// Publishing messages
await eventBus.publish('agent.status.update', {
  agentId: 'backend-agent-1',
  status: 'idle'
});

// Subscribing to topics
await eventBus.subscribe('task.assign', async (data) => {
  console.log('Received task:', data);
});
```

### Agent Implementation

```typescript
export class CustomAgent extends NATSAgentWrapper {
  protected async executeTask(task: any): Promise<any> {
    // Report progress
    await this.publishProgress(25, 'Processing started');
    
    // Do work
    const result = await this.processTask(task);
    
    // Report completion
    await this.publishProgress(100, 'Task complete');
    
    return result;
  }
}
```

### Workflow Example

```typescript
// Create coordinator
const coordinator = createAgentCoordinator({
  nats: { servers: ['nats://localhost:4222'] }
});

// Create workflow
const workflow = await coordinator.createWorkflow('Build Backend');

// Add tasks
const task1 = await coordinator.addTaskToWorkflow(
  workflow.id,
  'backend',
  { type: 'database-design', entities: [...] }
);

const task2 = await coordinator.addTaskToWorkflow(
  workflow.id,
  'backend',
  { type: 'api-generation', endpoints: [...] },
  [task1.id] // Depends on task1
);

// Execute
await coordinator.executeWorkflow(workflow.id);
```

## NATS Subjects

### Stream Structure

1. **META_AGENT_EVENTS** - For event-driven updates
   - `meta-agent.event.>` - All agent events
   
2. **META_AGENT_COMMANDS** - For command execution
   - `meta-agent.command.>` - Agent commands
   
3. **FACTORY_COORDINATION** - For factory coordination
   - `factory.>` - Factory-level events

### Subject Patterns

- `agent.{agentId}.task.assign` - Task assignment to specific agent
- `agent.heartbeat` - Agent heartbeat messages
- `task.completed` - Task completion notifications
- `task.failed` - Task failure notifications
- `workflow.created` - Workflow creation events
- `workflow.completed` - Workflow completion events

## Testing

### Prerequisites

1. NATS server running at `localhost:4222`
2. User credentials: `factory` / `factory-secret`

### Running Tests

```bash
# Test basic NATS integration
node test-nats-integration.js

# Test backend agent workflow
node test-backend-nats-workflow.js
```

### Expected Output

```
🚀 Testing Backend Agent NATS Workflow

📋 Step 1: Starting Agent Coordinator...
✅ Coordinator initialized

🤖 Step 2: Starting Backend Agents...
✅ Backend Agent 1 started
✅ Backend Agent 2 started

📊 Step 3: Creating E-commerce Backend Workflow...
✅ Created workflow: 123e4567-e89b-12d3-a456-426614174000

📝 Step 4: Adding Backend Development Tasks...
   ✅ Added Database Design task
   ✅ Added API Generation task
   ✅ Added Security task (depends on API)
   ✅ Added Test Generation task (depends on DB & API)
   ✅ Added Documentation task (depends on all)

🚀 Step 5: Executing Backend Development Workflow...
📌 10:30:45 AM - Task "backend" assigned to backend-agent-1
📌 10:30:45 AM - Task "backend" assigned to backend-agent-2
✅ 10:31:15 AM - Task "backend" completed
✅ 10:31:20 AM - Task "backend" completed
...
```

## Benefits

1. **Scalability** - Add more agents dynamically
2. **Reliability** - JetStream provides message persistence
3. **Flexibility** - Agents can run anywhere on the network
4. **Observability** - Real-time monitoring of agent activity
5. **Decoupling** - Agents don't need direct connections

## Next Steps

1. **Production Deployment**
   - Configure NATS cluster for high availability
   - Set up proper authentication and TLS
   - Configure stream retention policies

2. **Enhanced Features**
   - Implement agent pooling and load balancing
   - Add metrics collection and Prometheus integration
   - Create agent health dashboards

3. **Additional Agents**
   - Port remaining meta-agents to use NATS
   - Create specialized domain agents
   - Implement cross-agent collaboration patterns

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify NATS server is running
   - Check credentials and connection string
   - Ensure firewall allows port 4222

2. **Agent Not Receiving Tasks**
   - Verify agent subscription is active
   - Check subject naming conventions
   - Ensure agent status is 'idle'

3. **Workflow Stuck**
   - Check for failed dependencies
   - Verify agents are available
   - Review task timeout settings

### Debug Commands

```bash
# Check NATS server status
nats server check

# List streams
nats stream list

# View stream info
nats stream info META_AGENT_EVENTS

# Monitor all messages
nats sub ">"
```

## Conclusion

The NATS integration provides a robust foundation for distributed agent communication. It enables true parallel processing, fault tolerance, and scalability for the Meta-Agent Factory system.