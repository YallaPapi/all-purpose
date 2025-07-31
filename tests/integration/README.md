# Integration Test Suites

## Overview

Comprehensive integration test suites for the All-Purpose Meta-Agent Factory, covering:

- **Service Registry**: Agent registration, deregistration, and registry operations
- **Agent Discovery**: Capability-based discovery, load balancing, and selection strategies
- **Health Monitoring**: Real-time health tracking, aggregation, and alerting
- **Workflow Execution**: Orchestration, error recovery, and long-running workflows
- **Audit System**: Compliance tracking, audit logging, and violation monitoring

## Test Structure

```
integration/
├── service-registry.test.js      # Registry operations and resilience
├── agent-discovery.test.js       # Discovery mechanisms and caching
├── health-monitoring.test.js     # Health tracking and alerting
├── workflow-execution.test.js    # Workflow orchestration and recovery
├── audit-system.test.js          # Audit logging and compliance
└── README.md                     # This file
```

## Running Integration Tests

### Prerequisites

1. **Redis**: Must be running on localhost:6379 (or configure TEST_REDIS_URL)
2. **Node.js**: Version 18+ recommended
3. **Dependencies**: Run `npm install` in the tests directory

### Environment Variables

```bash
# Optional - defaults provided
export TEST_REDIS_URL=redis://localhost:6379
export TEST_REDIS_DB=1                    # Separate DB for tests
export API_BASE_URL=http://localhost:3000
export TEST_MODE=local                    # or 'remote'
export MOCK_EXTERNAL_SERVICES=true
```

### Running All Integration Tests

```bash
# From project root
npm test -- --selectProjects=integration

# Or directly with Jest
jest tests/integration --config tests/jest.config.js

# With coverage
npm test -- --selectProjects=integration --coverage
```

### Running Specific Test Suites

```bash
# Service Registry tests only
npm test tests/integration/service-registry.test.js

# Agent Discovery tests only
npm test tests/integration/agent-discovery.test.js

# Health Monitoring tests only
npm test tests/integration/health-monitoring.test.js

# Workflow Execution tests only
npm test tests/integration/workflow-execution.test.js

# Audit System tests only
npm test tests/integration/audit-system.test.js
```

### Running with Filters

```bash
# Run tests matching pattern
npm test -- --selectProjects=integration -t "should register"

# Run specific describe block
npm test -- --selectProjects=integration -t "Service Registry"
```

## Test Categories

### 1. Service Registry Tests (38 tests)
- Agent registration with validation
- Duplicate registration prevention
- Concurrent registration handling
- Agent deregistration
- Health status updates
- Registry queries and filtering
- Resilience and retry logic
- Stale entry cleanup

### 2. Agent Discovery Tests (42 tests)
- Capability-based discovery (AND/OR logic)
- Agent type filtering
- Health status filtering
- Response time sorting
- Real-time discovery updates
- Load balancing strategies (round-robin, least-loaded, performance-based)
- Sticky session support
- Discovery result caching

### 3. Health Monitoring Tests (35 tests)
- Real-time health metrics collection
- Health state transitions
- Health score calculations
- Server-Sent Events (SSE) streaming
- WebSocket health updates
- Health aggregation by type
- Alert triggering for critical states
- Performance metrics
- Data retention policies

### 4. Workflow Execution Tests (40 tests)
- Sequential workflow execution
- Parallel step coordination
- Conditional branching
- Error handling and retry logic
- Compensation on failure
- Timeout handling
- Long-running workflow persistence
- Workflow suspension/resumption
- Execution metrics and audit trails

### 5. Audit System Tests (38 tests)
- Event logging for all operations
- Protocol violation tracking
- Security event auditing
- Multi-criteria filtering
- Full-text search
- Compliance reporting (GDPR)
- Data export (JSON/CSV)
- High-volume performance
- Alert rules and aggregation

## Test Patterns

### Service Virtualization
Tests use the TestAgentSimulator to create realistic agent behaviors without requiring actual microservices:

```javascript
const agent = new TestAgentSimulator({
  agentName: 'Test Agent',
  capabilities: ['processing', 'analytics'],
  responseDelay: 100,
  failureRate: 0.1
});
```

### Asynchronous Testing
Proper handling of async operations with timeouts:

```javascript
await waitForWorkflowCompletion(workflowId, executionId, 10000);
```

### Event Collection
Helper classes for monitoring events during tests:

```javascript
const collector = new WorkflowEventCollector(redisSub);
await collector.start();
// ... test operations ...
const events = collector.getEvents('workflow:events');
```

### Test Isolation
Each test cleans up its data:

```javascript
beforeEach(async () => {
  await clearTestData();
});

afterEach(async () => {
  for (const agent of agents) {
    await agent.shutdown();
  }
});
```

## Debugging Tests

### Enable Debug Logging

```bash
DEBUG=* npm test tests/integration/service-registry.test.js
```

### Run Single Test

```javascript
test.only('should register a new agent successfully', async () => {
  // Test implementation
});
```

### Increase Timeout

```javascript
test('long running test', async () => {
  // Test implementation
}, 60000); // 60 second timeout
```

### Check Redis State

```bash
# Connect to test Redis DB
redis-cli -n 1

# List all keys
KEYS *

# Monitor commands
MONITOR
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd tests
          npm ci
          
      - name: Run integration tests
        run: |
          cd tests
          npm test -- --selectProjects=integration --coverage
        env:
          TEST_REDIS_URL: redis://localhost:6379
          CI: true
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./tests/coverage
```

## Performance Considerations

1. **Parallel Execution**: Tests run in parallel by default. Use `--maxWorkers=1` for sequential execution.

2. **Redis Connection Pooling**: Tests reuse Redis connections where possible.

3. **Mock Data Generation**: Large datasets are generated efficiently using streams.

4. **Timeout Configuration**: Adjust timeouts based on system performance:
   ```javascript
   const TEST_TIMEOUT = process.env.CI ? 60000 : 30000;
   ```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```
   Error: Redis connection failed
   ```
   - Ensure Redis is running: `redis-cli ping`
   - Check connection URL
   - Verify firewall settings

2. **Port Already in Use**
   ```
   Error: listen EADDRINUSE :::3000
   ```
   - Kill existing process: `lsof -ti:3000 | xargs kill`
   - Use different port: `PORT=3001 npm test`

3. **Timeout Errors**
   ```
   Timeout - Async callback was not invoked within 30000ms
   ```
   - Increase test timeout
   - Check for hanging operations
   - Verify service health

4. **Flaky Tests**
   - Add retry logic for network operations
   - Increase delays between operations
   - Use `waitFor` helpers

## Best Practices

1. **Test Independence**: Each test should be runnable in isolation
2. **Descriptive Names**: Use clear test descriptions
3. **Proper Cleanup**: Always clean up resources in afterEach/afterAll
4. **Meaningful Assertions**: Test behavior, not implementation
5. **Error Scenarios**: Test both success and failure paths
6. **Performance Awareness**: Monitor test execution time

## Contributing

When adding new integration tests:

1. Follow existing patterns and structure
2. Add appropriate setup and teardown
3. Document any special requirements
4. Update this README with new test categories
5. Ensure tests pass in CI environment