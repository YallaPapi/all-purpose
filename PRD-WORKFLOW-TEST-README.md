# PRD Workflow Test with NATS Integration

This comprehensive test demonstrates the complete PRD processing workflow using real NATS communication between agents.

## Overview

The test simulates a complete development workflow:

1. **PRD Submission**: Submit a Product Requirements Document (PRD) to the PRD Parser Agent
2. **Requirements Parsing**: PRD Parser Agent extracts requirements and creates domain-specific tasks
3. **Task Distribution**: Tasks are distributed to appropriate domain agents:
   - Backend Agent (API development, database, authentication)
   - Frontend Agent (UI components, user interface)
   - DevOps Agent (deployment, infrastructure, CI/CD)
   - QA Agent (testing strategy, test suites)
   - Documentation Agent (API docs, user guides)
4. **Result Collection**: All agents process their tasks and report results
5. **Workflow Completion**: Coordinator verifies all tasks completed successfully

## Test Components

### Agents Implemented

1. **PRD Parser Agent** (`prd-parser-agent`)
   - Parses PRD files and extracts requirements
   - Creates domain-specific tasks based on content analysis
   - Supports technical specification extraction

2. **Domain Agents**:
   - **Backend Agent**: API development, database schemas, authentication
   - **Frontend Agent**: UI components, user interfaces
   - **DevOps Agent**: Deployment configuration, CI/CD pipelines
   - **QA Agent**: Testing strategies, test automation
   - **Documentation Agent**: API documentation, user guides

3. **Workflow Coordinator**
   - Manages agent registration and discovery
   - Orchestrates task assignment and workflow execution
   - Monitors progress and handles completion

### NATS Communication

- **Server**: localhost:4222 with username/password authentication
- **Credentials**: factory/factory-secret
- **Subjects**:
  - `agent.register` - Agent registration
  - `agent.heartbeat` - Agent health monitoring
  - `agent.{agentId}.task` - Task assignment to specific agents
  - `task.completed` - Task completion notifications
  - `task.failed` - Task failure notifications

## Prerequisites

### Option 1: Docker (Recommended)
```bash
# Install Docker and Docker Compose
# Then run NATS server:
docker-compose -f docker-compose.test.yml up -d nats-test
```

### Option 2: Native NATS Server
```bash
# Install NATS server
# macOS
brew install nats-server

# Linux
curl -L https://github.com/nats-io/nats-server/releases/download/v2.10.7/nats-server-v2.10.7-linux-amd64.zip -o nats-server.zip
unzip nats-server.zip
sudo mv nats-server-v2.10.7-linux-amd64/nats-server /usr/local/bin/

# Windows
# Download from https://github.com/nats-io/nats-server/releases
```

### Node.js Dependencies
```bash
npm install nats uuid
```

## Running the Test

### Quick Start (Automated)
```bash
# This will automatically start NATS and run the test
node run-prd-workflow-test.js
```

### Manual Steps

1. **Start NATS Server**:
```bash
# Using Docker
docker-compose -f docker-compose.test.yml up -d nats-test

# Or using native NATS server
nats-server -c nats-test.conf

# Or with inline config
nats-server --auth factory:factory-secret --port 4222 --http_port 8222 --js
```

2. **Verify NATS is Running**:
```bash
# Check NATS monitoring endpoint
curl http://localhost:8222/varz

# Should return JSON with server information
```

3. **Run the Test**:
```bash
node test-complete-prd-workflow-nats.js
```

## Expected Output

The test will show detailed progress information:

```
🧪 Comprehensive PRD Workflow Test with NATS Integration

📋 This test will:
   1. Start workflow coordinator
   2. Start PRD parser agent
   3. Start domain agents (backend, frontend, devops, qa, documentation)
   4. Submit PRD for processing
   5. Monitor complete workflow execution
   6. Verify all expected outputs

🚀 Starting Workflow Coordinator...
[Coordinator] 🔌 Connecting to NATS...
[Coordinator] ✅ Connected to NATS
[Coordinator] 📥 Listening for agent events

🚀 Starting PRD Parser Agent...
[prd-parser-agent] 🔌 Connecting to NATS...
[prd-parser-agent] ✅ Connected to NATS
[prd-parser-agent] ✅ Registered as PRD Parser Agent
[prd-parser-agent] 📥 Listening for PRD parsing tasks on agent.prd-parser-agent.task
[Coordinator] 🤖 Agent registered: prd-parser-agent (prd-parser)

🚀 Starting Domain Agents...
[backend-agent-1] 🔌 Connecting to NATS...
[backend-agent-1] ✅ Connected to NATS
[backend-agent-1] ✅ Registered as backend agent
[Coordinator] 🤖 Agent registered: backend-agent-1 (backend)

[Progress] Tasks: 0/6 completed, 0 failed, 1 pending
[prd-parser-agent] 📋 Received PRD parsing task: parse-prd
[prd-parser-agent] 🔄 Parsing PRD: prd-for-test.md
[prd-parser-agent] ✅ PRD parsing completed - generated 5 domain tasks
[Coordinator] ✅ Task completed by prd-parser-agent
[Coordinator] 📤 Distributing 5 domain tasks...

[backend-agent-1] 📋 Received backend task: backend-development
[backend-agent-1] 🔄 Executing backend task: Implement backend API and database integration
[backend-agent-1] ✅ backend task completed successfully

🎉 Workflow completed successfully!
📊 Final Results:
   - Total tasks: 6
   - Completed: 6
   - Failed: 0
   - Duration: 12847ms

📄 Task Results:
   ✅ parse-prd (prd-parser-agent)
   ✅ backend-development (backend-agent-1)
      Files: server.js, routes/auth.js, routes/tasks.js...
   ✅ frontend-development (frontend-agent-1)
      Features: Task management interface, User authentication...
   ✅ deployment-setup (devops-agent-1)
      Files: Dockerfile, docker-compose.yml, .github/workflows/deploy.yml...
   ✅ testing-strategy (qa-agent-1)
      Files: tests/unit/auth.test.js, tests/integration/tasks.test.js...
   ✅ documentation (documentation-agent-1)
      Files: README.md, API.md, DEPLOYMENT.md...

✅ Comprehensive PRD Workflow Test completed successfully!
```

## Test Data

The test uses the sample PRD file `prd-for-test.md` which contains:

- **Project**: Task Management API
- **Requirements**: JWT authentication, CRUD operations, task categories, user assignment
- **Tech Stack**: Express, MongoDB, JWT, REST API
- **Deliverables**: API endpoints, database schemas, tests, documentation

## Customization

### Adding New Agent Types

To add a new domain agent:

1. Create the agent instance:
```javascript
const customAgent = new DomainAgent('custom-agent-1', 'custom', 'custom-processing');
await customAgent.connect();
```

2. Update the PRD parser to generate tasks for the new agent type:
```javascript
// In createDomainTasks method
tasks.push({
  id: `custom-${Date.now()}`,
  type: 'custom-processing',
  agentType: 'custom',
  priority: 'medium',
  description: 'Custom processing task'
});
```

### Using Different PRD Files

Replace the PRD file path in the test:
```javascript
const prdFile = path.join(__dirname, 'your-prd-file.md');
```

### Modifying NATS Configuration

Update the connection settings:
```javascript
const nc = await connect({
  servers: ['nats://localhost:4222'],
  user: 'your-username',
  pass: 'your-password'
});
```

## Troubleshooting

### NATS Connection Issues

1. **Connection Refused**:
   - Ensure NATS server is running: `docker ps` or check process
   - Verify port 4222 is available: `netstat -an | grep 4222`

2. **Authentication Failed**:
   - Check credentials match NATS server configuration
   - Verify auth configuration in NATS server

3. **Timeout Issues**:
   - Increase connection timeout in agent code
   - Check network connectivity to NATS server

### Test Issues

1. **Agents Not Registering**:
   - Check NATS connectivity for each agent
   - Verify agent registration messages are being published

2. **Tasks Not Completing**:
   - Check task timeout settings
   - Verify task assignment messages reach agents
   - Look for errors in agent task execution

3. **Workflow Hangs**:
   - Check for circular dependencies in task assignments
   - Verify all required agents are started and healthy

## Performance Notes

- **Agent Startup**: Allow 500ms between agent starts for proper registration
- **Task Processing**: Domain agents simulate 2-5 seconds of work per task
- **Heartbeat Interval**: 10 seconds for test stability
- **Workflow Timeout**: 30 seconds maximum test duration

## Integration with Real System

This test framework can be extended to work with real meta-agents:

1. Replace simulation logic in `executeTask` methods with real agent implementations
2. Add proper error handling and retry logic
3. Implement persistent storage for workflow state
4. Add monitoring and alerting for production use
5. Scale agents across multiple processes/containers

## Next Steps

1. **Real Agent Integration**: Connect to actual PRD parser and domain agents
2. **Persistent Workflows**: Add database storage for workflow state
3. **Load Testing**: Test with multiple concurrent workflows
4. **Monitoring**: Add metrics collection and dashboards
5. **Error Recovery**: Implement robust error handling and retry mechanisms