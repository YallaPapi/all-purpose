# UEP Capability Management System

Enterprise-grade capability management system for the Universal Execution Protocol (UEP) with semantic versioning, agent registration, discovery API, and comprehensive monitoring.

## Features

- **Semantic Versioning**: Full SemVer compliance with MAJOR.MINOR.PATCH versioning
- **Agent Registration**: Dynamic agent capability registration and lifecycle management
- **Discovery API**: RESTful API for capability discovery and agent lookup
- **Version Compatibility**: Advanced compatibility checking and version negotiation
- **Redis Storage**: Fast, in-memory storage with TTL support for ephemeral agents
- **Consul Integration**: Service discovery and health checks integration
- **Health Monitoring**: Real-time agent health monitoring with heartbeat management
- **Observability**: Comprehensive metrics collection and logging
- **Production Ready**: Enterprise-grade reliability and performance

## Quick Start

### Installation

```bash
npm install @uep/capability-management
```

### Basic Usage

```typescript
import { CapabilityRegistryService, CapabilityRegistryConfig } from '@uep/capability-management';

// Configure the registry service
const config: CapabilityRegistryConfig = {
  storage: {
    type: 'redis',
    connectionString: 'redis://localhost:6379',
    keyPrefix: 'uep:',
    ttl: 3600
  },
  versioning: {
    strictSemVer: true,
    allowPrerelease: false,
    deprecationWarningPeriod: 90
  },
  validation: {
    enableSchemaValidation: true,
    strictCompatibilityChecking: true
  },
  performance: {
    cacheEnabled: true,
    cacheTtl: 300,
    indexingEnabled: true
  },
  monitoring: {
    metricsEnabled: true,
    auditEnabled: false,
    healthCheckInterval: 30
  }
};

// Create and start the registry service
const registry = new CapabilityRegistryService(config);
await registry.initialize();
await registry.start(3001, 'localhost');
```

### Start as Server

```bash
# Using npm script
npm run start

# Using binary
npx capability-registry

# With environment configuration
REDIS_URL=redis://localhost:6379 \
PORT=3001 \
METRICS_ENABLED=true \
npm run start
```

## API Endpoints

### Agent Registration

#### Register Agent
```http
POST /api/v1/agents/register
Content-Type: application/json

{
  "agentId": "my-agent-001",
  "agentName": "My Processing Agent",
  "agentVersion": {
    "major": 1,
    "minor": 2,
    "patch": 3
  },
  "capabilities": [
    {
      "id": "text-processing",
      "name": "Advanced Text Processing",
      "version": {
        "major": 2,
        "minor": 1,
        "patch": 0
      },
      "description": "Advanced natural language processing capabilities",
      "category": "nlp",
      "parameters": [
        {
          "name": "text",
          "type": "string",
          "description": "Input text to process",
          "required": true
        },
        {
          "name": "language",
          "type": "string",
          "description": "Language code (ISO 639-1)",
          "required": false,
          "defaultValue": "en"
        }
      ]
    }
  ],
  "ttl": 3600
}
```

#### Update Capabilities
```http
PUT /api/v1/agents/:agentId/capabilities
Content-Type: application/json

{
  "capabilities": [...]
}
```

#### Send Heartbeat
```http
POST /api/v1/agents/:agentId/heartbeat
Content-Type: application/json

{
  "health": {
    "status": "healthy",
    "checks": {
      "cpu": true,
      "memory": true,
      "disk": true
    }
  },
  "metrics": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "requests_per_second": 12.5
  }
}
```

#### Deregister Agent
```http
DELETE /api/v1/agents/:agentId
```

### Discovery API

#### Search Capabilities
```http
GET /api/v1/capabilities?capabilityId=text-processing&includeDeprecated=false&limit=50
```

Query Parameters:
- `capabilityId`: Exact capability ID match
- `namePattern`: Name pattern (regex)
- `category`: Capability category
- `tags`: Comma-separated required tags
- `includeDeprecated`: Include deprecated capabilities
- `maxLatency`: Maximum acceptable latency (ms)
- `minThroughput`: Minimum required throughput (req/s)
- `limit`: Maximum results to return
- `sortBy`: Sort criteria (name, version, performance, reliability)
- `sortOrder`: Sort order (asc, desc)

#### Get Capability Details
```http
GET /api/v1/capabilities/:capabilityId
```

#### Get Capability Versions
```http
GET /api/v1/capabilities/:capabilityId/versions
```

#### List Agents
```http
GET /api/v1/agents
```

#### Get Agent Details
```http
GET /api/v1/agents/:agentId
```

### Health and Monitoring

#### Service Health Check
```http
GET /health
```

#### Agent Health Status
```http
GET /api/v1/health/agents
```

#### Registry Metrics
```http
GET /api/v1/metrics
```

#### Registry Statistics
```http
GET /api/v1/admin/stats
```

#### Cleanup Stale Agents
```http
POST /api/v1/admin/cleanup
```

## Semantic Versioning

The system uses semantic versioning (SemVer) for capability versions:

- **MAJOR**: Incompatible API/capability changes
- **MINOR**: Backward-compatible additions or improvements
- **PATCH**: Backward-compatible bug fixes or minor changes

### Version Compatibility

```typescript
import { 
  checkCapabilityCompatibility, 
  parseVersionRange 
} from '@uep/capability-management';

// Check if a capability satisfies requirements
const provided = {
  id: 'text-processing',
  version: { major: 2, minor: 1, patch: 0 },
  // ... other capability properties
};

const required = {
  capabilityId: 'text-processing',
  versionRange: parseVersionRange('^2.0.0')
};

const compatibility = checkCapabilityCompatibility(provided, required);
console.log(compatibility.compatible); // true
console.log(compatibility.score); // 0.95
```

### Version Range Operators

- `=1.2.3`: Exact version match
- `>1.2.3`: Greater than version
- `>=1.2.3`: Greater than or equal
- `<1.2.3`: Less than version
- `<=1.2.3`: Less than or equal
- `~1.2.3`: Tilde range (allows patch-level changes)
- `^1.2.3`: Caret range (allows minor and patch changes)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `REDIS_KEY_PREFIX` | Redis key prefix | `uep:` |
| `DEFAULT_TTL` | Default agent TTL (seconds) | `3600` |
| `PORT` | HTTP server port | `3001` |
| `HOST` | HTTP server host | `localhost` |
| `CONSUL_HOST` | Consul server host | `localhost` |
| `CONSUL_PORT` | Consul server port | `8500` |
| `METRICS_ENABLED` | Enable metrics collection | `true` |
| `AUDIT_ENABLED` | Enable audit logging | `false` |
| `STRICT_SEMVER` | Enforce strict semantic versioning | `false` |
| `ALLOW_PRERELEASE` | Allow pre-release versions | `true` |
| `CACHE_ENABLED` | Enable capability caching | `true` |
| `CACHE_TTL` | Cache TTL (seconds) | `300` |

### Configuration Object

```typescript
const config: CapabilityRegistryConfig = {
  storage: {
    type: 'redis',
    connectionString: 'redis://localhost:6379',
    keyPrefix: 'uep:',
    ttl: 3600
  },
  versioning: {
    strictSemVer: true,
    allowPrerelease: false,
    deprecationWarningPeriod: 90
  },
  validation: {
    enableSchemaValidation: true,
    customValidators: [],
    strictCompatibilityChecking: false
  },
  performance: {
    cacheEnabled: true,
    cacheTtl: 300,
    indexingEnabled: true,
    batchSize: 100
  },
  monitoring: {
    metricsEnabled: true,
    auditEnabled: false,
    healthCheckInterval: 30
  }
};
```

## Data Model

### Agent Capability Schema

```typescript
interface AgentCapability {
  id: string;                              // Unique capability identifier
  name: string;                            // Human-readable capability name
  version: SemVer;                         // Semantic version
  description: string;                     // Detailed description
  category?: string;                       // Capability category
  parameters?: ParameterDefinition[];      // Input parameters
  returns?: ReturnTypeDefinition;          // Return type
  examples?: CapabilityExample[];          // Usage examples
  deprecated?: boolean;                    // Deprecation flag
  constraints?: CapabilityConstraints;     // Capability constraints
  performance?: PerformanceMetrics;        // Performance characteristics
  documentation?: {                        // Extended documentation
    detailedDescription?: string;
    useCases?: string[];
    limitations?: string[];
    changelog?: ChangelogEntry[];
  };
  metadata?: Record<string, any>;          // Custom metadata
  tags?: string[];                         // Searchable tags
}
```

### Agent Registration Schema

```typescript
interface AgentRegistration {
  agentId: string;                         // Unique agent identifier
  agentName?: string;                      // Human-readable agent name
  agentVersion: SemVer;                    // Agent version
  capabilities: AgentCapability[];         // Advertised capabilities
  description?: string;                    // Agent description
  endpoints?: {                            // Agent endpoints
    health?: string;
    metrics?: string;
    api?: string;
  };
  registrationTime: Date;                  // Registration timestamp
  ttl?: number;                            // Time to live in seconds
  environment?: {                          // Runtime environment
    platform?: string;
    runtime?: string;
    location?: string;
  };
}
```

## Redis Data Model

The registry uses Redis for storage with the following key patterns:

- `uep:agent:{agentId}`: Agent registration data
- `uep:capability:{capabilityId}:{version}`: Capability details
- `uep:capability:agents:{capabilityId}`: Set of agents providing capability
- `uep:agent:health:{agentId}`: Agent health status
- `uep:agent:heartbeat:{agentId}`: Last heartbeat timestamp
- `uep:registry:active_agents`: Set of active agent IDs
- `uep:registry:metrics`: Registry metrics data

## Consul Integration

When enabled, the service integrates with Consul for:

- **Service Registration**: Automatic service registration with health checks
- **Health Monitoring**: TTL-based health checks with automatic deregistration
- **Service Discovery**: Integration with Consul service discovery

## Performance and Scalability

- **Redis Storage**: In-memory storage for sub-millisecond response times
- **Connection Pooling**: Efficient Redis connection management
- **Caching**: Configurable caching for frequently accessed data
- **Indexing**: Optimized indexing for fast capability lookups
- **Batch Operations**: Efficient bulk operations for large datasets

## Monitoring and Observability

### Metrics

The service exposes comprehensive metrics:

- **Agent Metrics**: Total, healthy, degraded, unhealthy agents
- **Capability Metrics**: Total capabilities, registrations per hour
- **Performance Metrics**: Average response time, throughput
- **Health Metrics**: Service health status, dependency status

### Logging

Structured logging with:

- **Request Logging**: All API requests with timing and status
- **Error Logging**: Detailed error information with stack traces
- **Health Logging**: Agent health status changes
- **Registry Logging**: Registration, deregistration, and cleanup events

### Health Checks

Multi-level health checks:

- **Service Health**: Overall service status
- **Dependency Health**: Redis, Consul status
- **Agent Health**: Individual agent health monitoring
- **Capability Health**: Capability availability and performance

## Error Handling

The service provides comprehensive error handling:

- **Validation Errors**: Detailed validation error messages
- **Network Errors**: Retry logic with exponential backoff
- **Storage Errors**: Graceful degradation with error recovery
- **Service Errors**: Proper HTTP status codes and error responses

## Security Considerations

- **Input Validation**: Comprehensive input validation and sanitization
- **CORS Configuration**: Configurable CORS settings
- **Rate Limiting**: Request rate limiting capabilities
- **Authentication**: Authentication middleware support
- **Audit Trails**: Optional audit logging for compliance

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
npm run test:coverage
```

### Development Server

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## License

MIT License - see LICENSE file for details.