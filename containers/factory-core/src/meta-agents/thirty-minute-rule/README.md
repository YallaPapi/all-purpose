# Thirty-Minute Rule Agent

> The Anti-Debugging-Loop Guardian - Prevents endless debugging by architecting time-bounded problem solving

## Overview

The Thirty-Minute Rule Agent is one of the 9 meta-agents in the complete Meta-Agent Factory system. It implements systematic debugging with time-bounded problem solving to prevent endless debugging loops that waste development time and reduce productivity.

### Core Philosophy

Based on the proven 30-minute debugging rule: **If you can't solve a debugging problem in 30 minutes, stop and implement a fallback approach.** This agent systematizes this rule with automation, component isolation, and alternative pathway architecture.

## Features

### ⏰ Time-Bounded Debugging Sessions
- Configurable time limits (default: 30 minutes)
- Automatic timeout handling with fallback mechanisms
- Session tracking with step-by-step progress monitoring
- Knowledge extraction from completed sessions

### 🔧 Automatic Debug Endpoint Generation
- Generates `/api/debug` endpoints for every component
- Health check endpoints for rapid component verification
- Isolation test endpoints for component testing
- Fallback mechanism endpoints for alternative implementations
- Metrics endpoints for performance monitoring

### 🧪 Component Isolation Testing
- Automatic component discovery and analysis
- Isolated testing environments with mocked dependencies
- Health checks for component and dependency status
- Support for multiple testing frameworks (Jest, Mocha, custom)
- Coverage reporting and test result analytics

### 🔄 Alternative Pathway Architecture
- Multiple fallback strategies: alternative implementations, cached responses, stub responses, redirects
- Automatic fallback trigger conditions (timeout, error, health failure)
- Custom fallback strategy support
- Fallback execution tracking and analysis

### 🤝 Meta-Agent Integration
- Coordinates with other meta-agents for systematic debugging
- Shares extracted knowledge across the meta-agent factory
- Integrates with Context7 for up-to-date documentation
- TaskMaster workflow integration for research-backed debugging

### 🎯 All-Purpose Pattern Compliance
- **NO hardcoded limitations** on project types, frameworks, or debugging scenarios
- Unlimited scalability and customization
- Dynamic configuration for any development environment
- Framework-agnostic implementation

## Installation

```bash
cd src/meta-agents/thirty-minute-rule
npm install
```

## Quick Start

### Programmatic Usage

```typescript
import { ThirtyMinuteRuleAgent } from '@meta-agents/thirty-minute-rule';

// Initialize agent
const agent = new ThirtyMinuteRuleAgent({
  defaultTimeLimit: 25 * 60 * 1000, // 25 minutes
  debugEndpointPort: 3001,
  autoGenerateEndpoints: true,
  isolationTestingEnabled: true
});

await agent.initialize();

// Start a debugging session
const sessionId = await agent.startDebuggingSession({
  description: 'Authentication service returning 401 errors',
  component: 'AuthService',
  priority: 'high',
  autoGenerateEndpoints: true,
  runIsolationTests: true
});

// Add debug steps
await agent.addDebugStep(sessionId, {
  action: 'Check JWT token validation',
  result: 'success',
  details: 'Token validation logic is working correctly',
  confidence: 0.8
});

await agent.addDebugStep(sessionId, {
  action: 'Verify database connection',
  result: 'failure',
  details: 'Database connection pool exhausted',
  confidence: 0.9
});

// Complete session
const result = await agent.completeDebuggingSession(
  sessionId, 
  'Increased database connection pool size and added connection retry logic'
);

console.log(`Session completed in ${result.performance.totalTime}ms`);
console.log(`Knowledge extracted: ${result.knowledgeExtracted.length} items`);
```

### CLI Usage

```bash
# Start a debugging session
node dist/main.js start "API returning 500 errors" --component APIService --time-limit 20

# Generate debug endpoints
node dist/main.js generate-endpoints --source-dir ./src --output-dir ./debug-endpoints

# Run isolation tests
node dist/main.js test-isolation --components auth,api,database

# Add debug step to active session
node dist/main.js step <session-id> "Check logs" success "Found error in authentication middleware"

# Complete session
node dist/main.js complete <session-id> "Fixed authentication middleware configuration"

# Check status
node dist/main.js status

# Query extracted knowledge
node dist/main.js knowledge --type solution --context authentication
```

## Configuration

### Basic Configuration

```typescript
const config = {
  // Time management
  defaultTimeLimit: 30 * 60 * 1000,     // 30 minutes
  maxTimeLimit: 120 * 60 * 1000,        // 2 hours max
  minTimeLimit: 5 * 60 * 1000,          // 5 minutes min
  
  // Debug endpoints
  debugEndpointPort: 3001,
  debugEndpointPrefix: '/api/debug',
  autoGenerateEndpoints: true,
  
  // Component isolation
  isolationTestingEnabled: true,
  healthCheckInterval: 30000,            // 30 seconds
  
  // Fallback mechanisms
  enableAutoFallback: true,
  fallbackTimeout: 5 * 60 * 1000,       // 5 minutes
  
  // Integration
  contextEnabled: true,                  // Context7 integration
  metaAgentCoordination: true,           // Meta-agent coordination
  
  // Project detection
  projectType: 'auto-detect',            // or 'React', 'Node.js', etc.
  framework: 'auto-detect',              // or 'Express', 'Next.js', etc.
  testingFramework: 'auto-detect'        // or 'Jest', 'Mocha', etc.
};
```

### Advanced Configuration

```typescript
const advancedConfig = {
  // Custom fallback strategies
  fallbackStrategies: [
    {
      strategyId: 'custom-cache-fallback',
      name: 'Custom Cache Fallback',
      description: 'Use Redis cache when primary service fails',
      triggers: [
        { type: 'timeout', condition: 'session_timeout', threshold: 1 },
        { type: 'error', condition: 'service_unavailable', threshold: 3 }
      ],
      action: {
        type: 'cached_response',
        implementation: 'redis_cache',
        parameters: { ttl: 300, fallbackKey: 'service_data' }
      },
      priority: 10,
      enabled: true
    }
  ],
  
  // Custom component discovery patterns
  componentDiscoveryPatterns: [
    '**/*.service.ts',
    '**/*.controller.ts',
    '**/*.component.tsx',
    '**/api/**/*.ts'
  ],
  
  // Custom debug endpoint types
  customEndpoints: [
    {
      path: '/api/debug/custom/performance',
      method: 'GET',
      handler: 'performanceAnalysisHandler',
      description: 'Custom performance analysis endpoint'
    }
  ],
  
  // Unlimited extensibility
  customPlugins: ['performance-monitor', 'security-scanner'],
  integrationHooks: {
    onSessionStart: 'notifySlack',
    onSessionComplete: 'updateJira',
    onFallbackTriggered: 'alertPagerDuty'
  }
};
```

## Architecture

### Core Components

```
ThirtyMinuteRuleAgent
├── DebuggingSessionManager     # Time-bounded session management
├── ComponentIsolationTester    # Component testing and health checks
├── DebugEndpointGenerator      # Automatic endpoint generation
└── Integration Layer           # Meta-agent coordination & Context7
```

### Debug Endpoint Architecture

Generated endpoints follow this pattern:

```
/api/debug/
├── {component}/health          # GET  - Health check
├── {component}/isolation       # POST - Isolation tests
├── {component}/fallback        # POST - Fallback execution
└── {component}/metrics         # GET  - Performance metrics
```

### Session Lifecycle

```
1. Session Start → Time Limit Set → Debug Endpoints Generated
2. Isolation Tests → Health Checks → Component Analysis
3. Debug Steps → Progress Tracking → Fallback Evaluation
4. Timeout/Complete → Knowledge Extraction → Session End
5. Knowledge Sharing → Meta-Agent Coordination → Archive
```

## Integration

### With Other Meta-Agents

```typescript
// Coordinate with All-Purpose Pattern Agent
const patternAgent = new AllPurposePatternAgent();
const thirtyMinuteAgent = new ThirtyMinuteRuleAgent({
  metaAgentCoordination: true
});

// Share debugging insights
thirtyMinuteAgent.on('knowledge:extracted', (knowledge) => {
  patternAgent.shareKnowledge(knowledge);
});
```

### With TaskMaster

```typescript
// Integration with TaskMaster workflow
const agent = new ThirtyMinuteRuleAgent({
  taskMasterIntegration: true
});

// Debugging tasks are automatically created in TaskMaster
agent.on('session:timeout', async (session) => {
  await taskMaster.createTask({
    title: `Debug timeout: ${session.description}`,
    type: 'debugging-escalation',
    priority: 'high'
  });
});
```

### With Context7

```typescript
// Context7 provides up-to-date debugging documentation
const agent = new ThirtyMinuteRuleAgent({
  contextEnabled: true
});

// Agent uses current best practices for debugging
agent.on('session:start', async (session) => {
  const context = await context7.getDebuggingContext(session.component);
  // Apply context-specific debugging strategies
});
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=ThirtyMinuteRuleAgent
```

## API Reference

### ThirtyMinuteRuleAgent

#### Methods

- `initialize()` - Initialize the agent
- `startDebuggingSession(options)` - Start a time-bounded debugging session
- `addDebugStep(sessionId, step)` - Add a debug step to active session
- `completeDebuggingSession(sessionId, resolution)` - Complete session with resolution
- `cancelDebuggingSession(sessionId, reason)` - Cancel active session
- `generateDebugEndpoints(options)` - Generate debug endpoints for components
- `runIsolationTests(components, config)` - Run component isolation tests
- `getDebuggingStatus()` - Get current debugging status
- `queryKnowledge(filters)` - Query extracted debugging knowledge
- `getCapabilities()` - Get agent capabilities

#### Events

- `session:started` - Debugging session started
- `session:completed` - Debugging session completed successfully
- `session:timeout` - Session reached time limit
- `session:stepAdded` - Debug step added to session
- `endpoints:generated` - Debug endpoints generated
- `isolation:tested` - Isolation tests completed
- `knowledge:extracted` - Knowledge extracted from session

## Examples

### React Component Debugging

```typescript
const agent = new ThirtyMinuteRuleAgent({
  projectType: 'React',
  framework: 'Next.js',
  testingFramework: 'Jest'
});

const sessionId = await agent.startDebuggingSession({
  description: 'UserProfile component not rendering user data',
  component: 'UserProfile',
  priority: 'high'
});

// The agent will automatically:
// 1. Generate debug endpoints for UserProfile component
// 2. Run isolation tests with mocked dependencies
// 3. Check health of UserProfile and its dependencies
// 4. Set up fallback mechanisms for data loading failures
```

### API Service Debugging

```typescript
const agent = new ThirtyMinuteRuleAgent({
  projectType: 'Node.js',
  framework: 'Express',
  debugEndpointPort: 3002
});

const sessionId = await agent.startDebuggingSession({
  description: 'Payment API returning 500 errors under high load',
  component: 'PaymentService',
  timeLimit: 20 * 60 * 1000, // 20 minutes
  priority: 'critical'
});

// Generated endpoints:
// GET /api/debug/paymentservice/health
// POST /api/debug/paymentservice/isolation  
// POST /api/debug/paymentservice/fallback
// GET /api/debug/paymentservice/metrics
```

### Microservice Health Monitoring

```typescript
const agent = new ThirtyMinuteRuleAgent({
  healthCheckInterval: 15000, // 15 seconds
  fallbackStrategies: [
    {
      strategyId: 'circuit-breaker',
      triggers: [{ type: 'health_failure', threshold: 3 }],
      action: { type: 'redirect', implementation: 'backup_service' }
    }
  ]
});

// Continuously monitors all services
const components = ['AuthService', 'UserService', 'PaymentService'];
await agent.runIsolationTests(components, {
  isolationLevel: 'integration',
  generateCoverage: true
});
```

## Best Practices

### 1. Time Management
- Use shorter time limits (15-20 minutes) for simple issues
- Reserve longer limits (45-60 minutes) for complex architectural problems
- Always implement fallback strategies before timeout

### 2. Component Isolation
- Mock external dependencies for true isolation
- Test components individually before integration testing
- Use health checks to verify component state before debugging

### 3. Fallback Strategies
- Implement multiple fallback levels (cached data → stub data → error handling)
- Test fallback mechanisms during normal operation
- Monitor fallback usage to identify systemic issues

### 4. Knowledge Management
- Document successful debugging patterns for reuse
- Share knowledge across team through meta-agent coordination
- Query historical knowledge before starting new debugging sessions

### 5. Integration
- Coordinate with other meta-agents for comprehensive debugging
- Use Context7 for up-to-date debugging documentation
- Integrate with monitoring and alerting systems

## Troubleshooting

### Common Issues

**Session not starting:**
```bash
# Check agent initialization
node dist/main.js status

# Verify configuration
node -e "console.log(JSON.stringify(require('./package.json').dependencies, null, 2))"
```

**Debug endpoints not generating:**
```bash
# Check source directory permissions
ls -la ./src

# Verify component discovery patterns
node dist/main.js generate-endpoints --source-dir ./src --components "*"
```

**Isolation tests failing:**
```bash
# Check testing framework installation
npm list jest mocha

# Run tests with verbose output
node dist/main.js test-isolation --components TestComponent --timeout 120
```

### Performance Optimization

- Use component filtering to reduce endpoint generation time
- Configure appropriate health check intervals
- Implement efficient fallback mechanisms
- Monitor session performance metrics

## Contributing

1. Follow the All-Purpose Pattern: NO hardcoded limitations
2. Maintain unlimited scalability in all implementations
3. Add comprehensive tests for new features
4. Update documentation for configuration changes
5. Ensure meta-agent coordination compatibility

## License

MIT License - Part of the Meta-Agent Factory System