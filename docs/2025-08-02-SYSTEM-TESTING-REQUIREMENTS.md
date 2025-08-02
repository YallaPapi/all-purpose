# 🧪 System Testing Requirements - All-Purpose Meta-Agent Factory

## Status: Post-Integration Testing Phase
**Generated**: August 2, 2025  
**Context**: Following massive integration push (351 files, 150k+ lines)  
**Purpose**: Document all testing required to make the system operational

---

## 🚨 CRITICAL REALITY CHECK

Despite having:
- ✅ 750+ pages of documentation
- ✅ 238 completed tasks
- ✅ Context7 integration implemented
- ✅ NATS messaging system built
- ✅ Docker containerization complete

**The system is NOT YET OPERATIONAL** due to:
- ❌ EPIPE error prevents agent startup
- ❌ Context7 using mocks instead of real MCP
- ❌ Untested container integration
- ❌ Missing validation of end-to-end workflows

---

## 📋 TESTING REQUIREMENTS BY PRIORITY

### 🔴 PRIORITY 1: BLOCKING ISSUES

#### 1.1 Fix EPIPE Error in start-all-agents.js
```bash
# Current behavior:
node start-all-agents.js
# ✅ All agents build successfully
# ❌ Fails with: Error: EPIPE: broken pipe, write

# Required fix:
# - Debug process communication
# - Check for missing stream handlers
# - Verify event emitter connections
# - Test with simplified agent startup
```

#### 1.2 NATS Server Basic Connectivity
```bash
# Test NATS is running and accessible:
docker-compose up nats-broker
nats server check
nats stream list

# Expected:
# - NATS server on port 4222
# - JetStream enabled
# - Authentication working (factory/factory-secret)
```

### 🟡 PRIORITY 2: CORE FUNCTIONALITY

#### 2.1 Docker Container Integration
```bash
# Individual container tests:
docker-compose up factory-core     # Should start on port 3001
docker-compose up domain-agents    # Should start on port 3002
docker-compose up nats-broker      # Should start on port 4222
docker-compose up observability    # Should start Grafana on 3000

# Full system test:
docker-compose up
docker-compose ps  # All should be "Up"

# Network connectivity test:
docker exec factory-core ping nats-broker
docker exec domain-agents ping factory-core
```

#### 2.2 Agent Registration & Heartbeat
```bash
# Test agent lifecycle:
node test-nats-integration.js

# Verify:
# ✓ Agents register with coordinator
# ✓ Heartbeats sent every 30 seconds
# ✓ Agent status updates (idle/busy/error)
# ✓ Timeout detection after missed heartbeats
```

#### 2.3 Simple Workflow Execution
```bash
# Single agent, single task:
node test-backend-nats-workflow.js

# Verify:
# ✓ Task assignment to available agent
# ✓ Progress updates (0%, 25%, 50%, 75%, 100%)
# ✓ Result publication
# ✓ Workflow completion
```

### 🟢 PRIORITY 3: ADVANCED FEATURES

#### 3.1 Complex Workflow with Dependencies
```javascript
// Test workflow:
// Task A and B (parallel) → Task C (depends on A,B) → Task D

// Verify:
// ✓ Parallel execution of independent tasks
// ✓ Dependency waiting
// ✓ Correct execution order
// ✓ All tasks complete successfully
```

#### 3.2 Context7 Real Integration
```javascript
// Replace mock in Context7Client.ts:
// FROM:
const mockLibraries = { /* ... */ };

// TO:
const result = await mcp__context7__resolve_library_id({ libraryName });
const docs = await mcp__context7__get_library_docs({
  context7CompatibleLibraryID: libraryId,
  topic,
  tokens: maxTokens
});
```

#### 3.3 End-to-End PRD Processing
```bash
# The ultimate test:
node test-complete-real-execution.js

# Flow:
# 1. Input: PRD document
# 2. Parser: Extract tasks
# 3. Orchestrator: Assign to agents
# 4. Agents: Generate code with Context7
# 5. Output: Working application

# Success criteria:
# ✓ Complete application generated
# ✓ Code compiles without errors
# ✓ Tests pass
# ✓ Application runs
```

---

## 🧪 DETAILED TEST SCENARIOS

### Scenario 1: Agent Failure Recovery
```bash
# 1. Start workflow with 3 tasks
# 2. Kill agent processing task 2
# 3. Verify:
#    - Timeout detection triggers
#    - Task reassigned to another agent
#    - Workflow completes successfully
```

### Scenario 2: Scale Testing
```bash
# 1. Start 10 backend agents
# 2. Submit 50 tasks
# 3. Verify:
#    - Load distributed evenly
#    - No message loss
#    - All tasks complete
#    - Memory usage stable
```

### Scenario 3: Network Partition
```bash
# 1. Start full system
# 2. Block network between factory-core and agents
# 3. Verify:
#    - Heartbeat timeout detection
#    - Agents marked offline
#    - Recovery when network restored
```

---

## 📊 VALIDATION METRICS

### Performance Benchmarks
- Agent startup time: < 5 seconds
- Task assignment latency: < 100ms
- Message throughput: > 1000 msg/sec
- Memory per agent: < 256MB
- Workflow completion: < 5 min for 10 tasks

### Reliability Metrics
- Agent registration success: 100%
- Task completion rate: > 95%
- Message delivery: 100% (with JetStream)
- Recovery from failure: < 30 seconds

---

## 🔧 DEBUGGING COMMANDS

### Check NATS Health
```bash
# Stream status
nats stream info META_AGENT_EVENTS
nats stream info META_AGENT_COMMANDS
nats stream info FACTORY_COORDINATION

# Monitor all messages
nats sub ">"

# Check specific subjects
nats sub "agent.*.heartbeat"
nats sub "task.completed"
```

### Check Container Logs
```bash
# Individual service logs
docker-compose logs factory-core
docker-compose logs domain-agents
docker-compose logs nats-broker

# Follow all logs
docker-compose logs -f

# Check for errors
docker-compose logs | grep ERROR
```

### Test Endpoints
```bash
# Factory health
curl http://localhost:3001/health

# Observability API
curl http://localhost:3000/api/observability

# Agent status
curl http://localhost:3001/api/agents

# Submit test workflow
curl -X POST http://localhost:3001/api/workflow \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "tasks": [...]}'
```

---

## 🚀 QUICK START VALIDATION

Run these commands in order to validate basic functionality:

```bash
# 1. Start infrastructure
docker-compose up -d nats-broker
sleep 5

# 2. Setup NATS streams
node containers/nats-broker/setup-streams.js

# 3. Start core services
docker-compose up -d factory-core domain-agents

# 4. Check health
docker-compose ps
curl http://localhost:3001/health

# 5. Run basic test
node test-nats-integration.js

# 6. Check logs for errors
docker-compose logs | grep -E "ERROR|FAIL"
```

---

## 📝 TESTING CHECKLIST

### Infrastructure Layer
- [ ] NATS server starts successfully
- [ ] JetStream streams created
- [ ] Authentication working
- [ ] Docker containers all running
- [ ] Inter-container networking works
- [ ] Health endpoints responding

### Agent Layer
- [ ] Agents can register
- [ ] Heartbeats sent/received
- [ ] Task assignment works
- [ ] Progress updates flow
- [ ] Results published
- [ ] Timeout detection works

### Workflow Layer
- [ ] Simple workflow executes
- [ ] Parallel tasks work
- [ ] Dependencies respected
- [ ] Workflow completes
- [ ] Error handling works
- [ ] Metrics captured

### Integration Layer
- [ ] PRD parser integration
- [ ] Context7 integration (real MCP)
- [ ] Code generation works
- [ ] Generated code compiles
- [ ] End-to-end flow works

---

## 🎯 DEFINITION OF "WORKING"

The system is considered operational when:

1. **Basic Flow Works**
   - Input PRD → Parse tasks → Assign agents → Generate code → Output works

2. **Reliability Proven**
   - 10 consecutive successful workflows
   - Recovery from agent failure demonstrated
   - No memory leaks over 1 hour

3. **Performance Acceptable**
   - Can handle 5+ concurrent workflows
   - Agent response time < 1 second
   - System remains responsive under load

4. **Observability Functional**
   - Metrics visible in Grafana
   - Logs aggregated in Loki
   - Real-time status dashboard works

---

## 🔴 KNOWN BLOCKERS

1. **EPIPE Error** - Prevents agent startup (start-all-agents.js)
2. **Context7 Mocks** - Need real MCP integration
3. **Factory-Agent Link** - Connection not fully implemented
4. **Missing Glue Code** - Some integration points incomplete

---

## 📅 RECOMMENDED TESTING SEQUENCE

### Day 1: Fix Blockers
1. Debug and fix EPIPE error
2. Verify basic NATS connectivity
3. Ensure containers can start

### Day 2: Core Validation
1. Test agent registration
2. Simple workflow execution
3. Basic error recovery

### Day 3: Advanced Testing
1. Complex workflows with dependencies
2. Scale testing with multiple agents
3. Failure scenario testing

### Day 4: Integration
1. Connect Context7 to real MCP
2. End-to-end PRD processing
3. Performance benchmarking

### Day 5: Production Readiness
1. Observability validation
2. Security configuration
3. Documentation updates

---

This testing requirements document should be used as the primary reference when resuming work on making the system operational.