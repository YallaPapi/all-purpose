# Test Agent Simulator - E2E Testing Framework

## Overview

The Test Agent Simulator is a comprehensive testing framework for the All-Purpose Meta-Agent Factory's agent discovery and coordination system. It provides realistic agent simulation capabilities for end-to-end testing, performance validation, and chaos engineering scenarios.

## Features

### Core Capabilities
- **Agent Registration**: Simulates real agent registration with configurable capabilities
- **Service Discovery**: Responds to discovery queries based on capabilities and type
- **Health Monitoring**: Periodic health reporting with customizable states
- **Task Execution**: Simulates task processing with configurable success rates
- **Failure Scenarios**: Controlled failure simulation for resilience testing

### Advanced Features
- **Configurable Response Delays**: Simulate network latency and processing time
- **Failure Rate Configuration**: Control random failure probability
- **Multiple Health States**: healthy, degraded, offline
- **Event-Driven Architecture**: Full pub/sub support via Redis
- **Metrics Tracking**: Task completion rates, response times, uptime

## Installation

```bash
cd tests
npm install
```

## Usage

### Running a Single Test Agent

```bash
npm run test:agent-simulator
```

Or directly:

```bash
node e2e/test-agent-simulator.js
```

### Running Multi-Agent Simulation

```bash
npm run test:multi-agents
```

This runs a comprehensive simulation with:
- 5 different agent types
- Automatic task distribution
- Discovery query testing
- Health monitoring
- Failure scenario injection
- Load pattern simulation

### Running E2E Test Suite

```bash
npm run test:e2e
```

## Test Agent Configuration

```javascript
const agent = new TestAgentSimulator({
  agentId: 'custom-agent-001',              // Default: auto-generated
  agentName: 'Custom Test Agent',           // Default: 'Test Agent Simulator'
  agentType: 'processor',                   // Default: 'test-simulator'
  capabilities: ['processing', 'analytics'], // Default: ['test', 'simulation']
  version: '2.0.0',                         // Default: '1.0.0'
  initialHealthState: 'healthy',            // Default: 'healthy'
  responseDelay: 100,                       // Default: 0 (milliseconds)
  failureRate: 0.1,                         // Default: 0 (0-1 probability)
  redisUrl: 'redis://localhost:6379'        // Default: from env or localhost
});
```

## Failure Scenarios

The simulator supports various failure scenarios for chaos testing:

### 1. Crash Simulation
```javascript
await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
  type: 'simulate_failure',
  failureType: 'crash'
}));
```
- Agent stops responding immediately
- Removed from active agents list
- No graceful shutdown

### 2. Slow Response
```javascript
await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
  type: 'simulate_failure',
  failureType: 'slow_response'
}));
```
- Increases response delay to 5 seconds
- Simulates performance degradation

### 3. Degraded State
```javascript
await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
  type: 'simulate_failure',
  failureType: 'degraded'
}));
```
- Changes health state to 'degraded'
- Agent continues operating but reports degraded health

### 4. Network Partition
```javascript
await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
  type: 'simulate_failure',
  failureType: 'network_partition'
}));
```
- Disconnects from Redis
- Simulates network isolation

### 5. Memory Leak
```javascript
await pub.publish(`agent:${agentId}:commands`, JSON.stringify({
  type: 'simulate_failure',
  failureType: 'memory_leak'
}));
```
- Progressively allocates memory
- Simulates memory leak scenario

## E2E Test Scenarios

The test suite covers:

1. **Agent Registration**
   - Single agent registration
   - Concurrent multi-agent registration
   - Registration data validation

2. **Service Discovery**
   - Discovery by capabilities
   - Discovery by agent type
   - Multi-criteria queries

3. **Health Monitoring**
   - Periodic health reporting
   - Health state transitions
   - Metrics collection

4. **Task Execution**
   - Task distribution
   - Success/failure tracking
   - Performance metrics

5. **Failure Handling**
   - Agent crash recovery
   - Performance degradation
   - Network partitions

6. **System-wide Operations**
   - Broadcast messaging
   - Coordinated shutdown
   - Load balancing

## Monitoring and Metrics

The simulation tracks:
- Tasks issued/completed/failed
- Discovery query count and response times
- Health check frequency
- Agent failure incidents
- Task success rates

## Redis Data Structure

The simulator uses these Redis keys:

- `agent:{agentId}` - Hash containing agent data and health
- `agents:active` - Set of active agent IDs
- `agent:discovery` - Channel for discovery queries
- `agent:{agentId}:commands` - Channel for agent-specific commands
- `agent:broadcast` - Channel for system-wide broadcasts
- `agent:events` - Channel for agent lifecycle events
- `task:events` - Channel for task execution events
- `health:reports` - Channel for health status updates
- `discovery:response:{queryId}` - Temporary list for discovery responses

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd tests && npm install
      - run: cd tests && npm run test:e2e
```

## Best Practices

1. **Test Isolation**: Each test should clean up its agents and data
2. **Timeout Configuration**: Set appropriate timeouts for async operations
3. **Resource Management**: Properly disconnect Redis clients after tests
4. **Error Handling**: Catch and log errors during agent shutdown
5. **Realistic Delays**: Configure response delays to match production

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis is running: `redis-cli ping`
   - Check connection URL in environment variables
   - Verify network connectivity

2. **Tests Timing Out**
   - Increase test timeout: `jest --testTimeout=60000`
   - Check for blocking operations
   - Verify Redis pub/sub subscriptions

3. **Agent Registration Failures**
   - Check for duplicate agent IDs
   - Verify Redis write permissions
   - Ensure proper cleanup between tests

## Performance Testing

For performance testing, adjust the simulation parameters:

```javascript
const AGENT_COUNT = 50;              // Increase agent count
const SIMULATION_DURATION = 300000;  // 5 minutes
const TASK_INTERVAL = 100;           // Issue tasks every 100ms
```

Monitor Redis performance:
```bash
redis-cli --stat
```

## Future Enhancements

- [ ] WebSocket support for real-time monitoring
- [ ] Prometheus metrics export
- [ ] Grafana dashboard integration
- [ ] Load testing scenarios
- [ ] Security testing capabilities
- [ ] Multi-region simulation

## Contributing

When adding new test scenarios:
1. Follow the existing test structure
2. Add appropriate cleanup in afterEach/afterAll
3. Document new failure scenarios
4. Update this README with new capabilities