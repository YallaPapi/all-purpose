# UEP Client Library

TypeScript client library for UEP (Universal Execution Protocol) with comprehensive support for agent interfaces, message validation, distributed tracing, and service discovery.

## Features

- **🔧 Type-Safe Protocol**: Strict TypeScript 5.2+ interfaces for UEP protocol compliance
- **🚀 Agent Decorators**: Simple decorators for creating UEP-compliant agents
- **✅ Message Validation**: OpenAPI 3.1 schema validation with custom rules
- **🔍 Distributed Tracing**: OpenTelemetry-compliant tracing integration
- **🌐 Service Discovery**: Automatic service registration and discovery
- **⚡ High Performance**: Optimized for high-throughput message processing
- **🛡️ Reliability**: Built-in retry logic, circuit breakers, and error handling
- **📊 Observability**: Comprehensive metrics and health monitoring

## Installation

```bash
npm install @uep/client
```

## Quick Start

### Creating a UEP Agent

```typescript
import { 
  UEPAgent, 
  UEPCapability, 
  UEPEventHandler,
  UEPRequest,
  UEPEvent,
  startAllAgents,
  UEPDefaults
} from '@uep/client';

@UEPAgent({
  name: 'my-agent',
  version: '1.0.0',
  type: 'domain',
  description: 'Example UEP agent'
})
class MyAgent {
  
  @UEPCapability({
    name: 'process-data',
    description: 'Process incoming data',
    schema: {
      request: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { type: 'string' }
        }
      },
      response: {
        type: 'object',
        properties: {
          result: { type: 'string' }
        }
      }
    }
  })
  async processData(
    payload: { data: string },
    request: UEPRequest<{ data: string }>
  ): Promise<{ result: string }> {
    return {
      result: `Processed: ${payload.data}`
    };
  }

  @UEPEventHandler({
    eventType: 'data.updated',
    queue: 'my-agent-events'
  })
  async handleDataUpdate(
    payload: any,
    event: UEPEvent<any>
  ): Promise<void> {
    console.log('Data updated:', payload);
  }
}

// Start the agent
const connectionOptions = UEPDefaults.createClientOptions('my-agent', 'domain');
await startAllAgents(connectionOptions);
```

### Using the UEP Client

```typescript
import { createUEPClient } from '@uep/client';

// Create and connect client
const client = await createUEPClient('my-client', 'meta', {
  connection: {
    servers: ['nats://localhost:4222']
  }
});

await client.connect();

// Send a request
const response = await client.request('process-data', {
  data: 'Hello UEP!'
}, {
  timeout: 10000
});

console.log(response.payload); // { result: 'Processed: Hello UEP!' }

// Send an event
await client.sendEvent('data.updated', {
  id: '123',
  changes: ['field1', 'field2']
});

// Subscribe to messages
await client.subscribe('notifications.*', async (message) => {
  console.log('Received notification:', message.payload);
});

await client.disconnect();
```

## Core Concepts

### UEP Messages

All UEP communication uses structured message envelopes:

```typescript
interface UEPMessage<T> {
  readonly id: string;
  readonly timestamp: Date;
  readonly version: string;
  readonly protocol: UEPProtocolInfo;
  readonly routing: UEPRouting;
  readonly agent: UEPAgentInfo;
  readonly tracing: UEPTracingContext;
  readonly payload: T;
  readonly headers?: UEPHeaders;
}
```

### Message Types

- **Commands**: Request-response operations that expect a reply
- **Queries**: Read-only requests for information
- **Events**: Fire-and-forget notifications
- **Responses**: Replies to commands and queries

### Agent Types

- **Meta**: System-level agents for coordination
- **Domain**: Business logic agents
- **Factory**: Agent creation and management
- **Orchestrator**: Workflow coordination agents

## Advanced Usage

### Custom Validation Rules

```typescript
import { UEPMessageValidator, UEPValidationRule } from '@uep/client';

const customRule: UEPValidationRule = {
  name: 'business-logic-check',
  description: 'Validates business-specific requirements',
  severity: 'error',
  category: 'business',
  validate: (message) => {
    // Custom validation logic
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
  }
};

const validator = new UEPMessageValidator({
  enabled: true,
  strictMode: true,
  customRules: [customRule]
});
```

### Distributed Tracing

```typescript
import { UEPTracing, createDefaultTracingConfig } from '@uep/client';

const tracingConfig = createDefaultTracingConfig('my-service');
tracingConfig.exporters = {
  jaeger: {
    enabled: true,
    endpoint: 'http://localhost:14268/api/traces'
  }
};

const tracing = new UEPTracing(tracingConfig);
await tracing.initialize();

// Tracing is automatically integrated with UEP messages
```

### Service Discovery

```typescript
import { UEPServiceRegistry } from '@uep/client';

const registry = new UEPServiceRegistry({
  connection: connectionConfig,
  updateInterval: 30000
});

await registry.initialize(connection);

// Find services by capability
const services = await registry.findByCapability('process-data');

// Register your service
await registry.register({
  id: 'my-service-1',
  name: 'my-service',
  version: '1.0.0',
  endpoint: 'domain.my-service',
  status: 'healthy',
  capabilities: [/* ... */]
});
```

### Error Handling

```typescript
import { 
  UEPClientError, 
  UEPValidationError, 
  UEPConnectionError 
} from '@uep/client';

try {
  const response = await client.request('some-capability', payload);
} catch (error) {
  if (error instanceof UEPValidationError) {
    console.log('Validation failed:', error.violations);
  } else if (error instanceof UEPConnectionError) {
    console.log('Connection error - retryable:', error.retryable);
  } else if (error instanceof UEPClientError) {
    console.log('UEP error:', error.code, error.message);
  }
}
```

## Configuration

### Client Options

```typescript
const clientOptions: UEPClientOptions = {
  connection: {
    servers: ['nats://localhost:4222'],
    namespace: 'uep',
    authentication: {
      type: 'token',
      token: 'your-token'
    },
    tls: {
      enabled: true,
      verifyHost: true
    },
    timeouts: {
      connect: 10000,
      request: 30000,
      keepAlive: 60000
    },
    retry: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      maxDelay: 30000
    }
  },
  agent: {
    id: 'my-agent',
    type: 'domain',
    capability: 'data-processing',
    version: '1.0.0'
  },
  tracing: {
    enabled: true,
    serviceName: 'my-service',
    sampleRate: 1.0
  },
  validation: {
    enabled: true,
    strictMode: false,
    schemaValidation: true
  },
  performance: {
    maxConcurrentRequests: 100,
    messageBufferSize: 1000,
    compressionEnabled: false
  },
  monitoring: {
    metricsEnabled: true,
    healthCheckEnabled: true,
    loggingLevel: 'info'
  }
};
```

## Monitoring and Observability

### Health Checks

```typescript
const health = await client.getHealthStatus();
console.log('Status:', health.status);
console.log('Uptime:', health.uptime);
console.log('Checks:', health.checks);
```

### Metrics

```typescript
const metrics = client.getMetrics();
console.log('Messages sent:', metrics.messages.sent);
console.log('Average latency:', metrics.latency.average);
console.log('Memory usage:', metrics.memory.utilization);
```

### Events

```typescript
client.on('connected', () => console.log('Connected to UEP'));
client.on('disconnected', () => console.log('Disconnected from UEP'));
client.on('error', (error) => console.error('UEP error:', error));
client.on('metrics', (metrics) => console.log('Metrics:', metrics));
client.on('health', (health) => console.log('Health:', health));
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Examples

See the `examples/` directory for complete working examples:

- **ExampleAgent.ts**: Full agent implementation with decorators
- **ClientExample.ts**: UEP client usage patterns
- **ServiceDiscovery.ts**: Service registration and discovery
- **TracingExample.ts**: Distributed tracing integration

## API Reference

### Classes

- **UEPClient**: Main client for UEP communication
- **UEPMessageValidator**: Message validation engine
- **UEPTracing**: Distributed tracing integration
- **UEPServiceRegistry**: Service discovery and registration

### Decorators

- **@UEPAgent**: Mark a class as a UEP agent
- **@UEPCapability**: Expose a method as a UEP capability
- **@UEPEventHandler**: Handle UEP events
- **@UEPValidate**: Add validation to methods
- **@UEPRateLimit**: Apply rate limiting
- **@UEPTrace**: Add distributed tracing

### Utilities

- **createUEPClient**: Quick client factory
- **createUEPMessage**: Create UEP messages
- **validateUEPMessage**: Validate messages
- **startAllAgents**: Start all decorated agents
- **stopAllAgents**: Stop all agents

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [https://uep-docs.com](https://uep-docs.com)
- **Issues**: [GitHub Issues](https://github.com/uep/client-library/issues)
- **Discussions**: [GitHub Discussions](https://github.com/uep/client-library/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.