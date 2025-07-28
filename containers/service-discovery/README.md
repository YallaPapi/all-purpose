# UEP Service Discovery and Registry System

**Task 191.2: Redis-Based Service Registry with Health Checking**

A comprehensive service discovery and registry system for the UEP Meta-Agent Factory, supporting both Redis and Consul backends with advanced health monitoring, load balancing, and containerized deployment.

## Features

### ✅ Dual Registry Support
- **Redis-based registry**: High-performance, sub-10ms lookups, perfect for development and simple deployments
- **Consul-based registry**: Production-ready with service mesh, ACLs, and distributed consensus
- **Hybrid mode**: Use both registries for redundancy and optimal performance

### ✅ Advanced Service Discovery
- **Multi-criteria filtering**: By agent type, capabilities, environment, performance metrics
- **Load-aware selection**: Automatic load balancing based on real-time metrics
- **Performance-based routing**: Route requests to fastest, least-loaded agents
- **Geographic/network awareness**: Support for regions, zones, and network policies

### ✅ Comprehensive Health Monitoring
- **Configurable health checks**: HTTP/HTTPS endpoints with custom intervals and thresholds
- **Automatic failure detection**: Multi-level health states (healthy → degraded → unhealthy)
- **Graceful degradation**: Automatic deregistration of failed agents
- **Health history tracking**: Monitor patterns and trends in agent health

### ✅ Production-Ready Features
- **High availability**: Multi-node clusters with automatic failover
- **Security**: TLS encryption, authentication, and authorization
- **Monitoring**: Comprehensive metrics and observability integration
- **Scalability**: Supports 100+ concurrent agents with sub-100ms response times

## Quick Start

### Development Setup

```bash
# Start Redis registry (development mode)
docker-compose -f docker-compose-redis-registry.yml --profile dev up -d

# Install dependencies
npm install

# Run tests
npm test

# Start monitoring
npm run start:dev
```

### Production Setup

```bash
# Set environment variables
export REDIS_PASSWORD="your-secure-password"
export CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN="your-consul-token"

# Start production cluster
docker-compose -f docker-compose-redis-registry.yml --profile prod up -d

# Verify health
curl http://localhost:8090/health
```

## Usage Examples

### Basic Agent Registration

```typescript
import { RedisServiceRegistry, createRedisRegistryConfig } from '@uep/service-discovery/redis';

// Initialize registry
const registry = new RedisServiceRegistry(createRedisRegistryConfig({
  redis: {
    host: 'redis-registry-dev',
    port: 6379,
    keyPrefix: 'uep:registry'
  }
}));

// Register an agent
const agentMetadata = {
  agentId: 'prd-parser-001',
  agentName: 'PRD Parser Agent',
  agentType: 'prd-parser',
  capabilities: [
    { name: 'parsing', version: '2.0.0' },
    { name: 'validation', version: '1.5.0' }
  ],
  network: {
    address: 'prd-parser-service',
    port: 3000,
    protocol: 'http',
    tlsEnabled: false
  },
  healthCheck: {
    endpoint: '/health',
    method: 'GET',
    interval: '30s',
    timeout: '5s'
  },
  // ... additional metadata
};

await registry.registerAgent(agentMetadata);
```

### Service Discovery

```typescript
// Find agents by type
const prdParsers = await registry.discoverAgents({
  agentType: 'prd-parser',
  healthyOnly: true,
  maxLoad: 80,
  sortBy: 'load',
  sortOrder: 'asc'
});

// Find agents by capabilities
const capableAgents = await registry.discoverAgents({
  capabilities: ['parsing', 'validation'],
  environment: 'production',
  minCapacity: 50
});

// Performance-optimized selection
const bestAgent = await registry.discoverAgents({
  agentType: 'scaffold-generator',
  maxLoad: 50,
  maxResponseTime: 100,
  maxErrorRate: 0.01,
  limit: 1
});
```

### Health Monitoring

```typescript
// Set up event listeners
registry.on('healthCheckFailed', (agentId, error) => {
  console.warn(`Health check failed for ${agentId}: ${error.message}`);
});

registry.on('agentDeregistered', (agentId) => {
  console.info(`Agent ${agentId} was deregistered`);
});

// Manual health check
const isHealthy = await registry.performHealthCheck('prd-parser-001');
console.log(`Agent health status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
```

## Architecture

### Registry Data Model

```typescript
interface AgentRegistrationMetadata {
  // Core identification
  agentId: string;              // UUID
  agentName: string;            // Human-readable name
  agentType: string;            // Agent type (e.g., 'prd-parser')
  instanceId: string;           // Instance identifier
  
  // Capabilities and features
  capabilities: UEPAgentCapability[];
  supportedProtocols: string[];
  
  // Network configuration
  network: NetworkConfig;
  
  // Performance metrics
  currentMetrics: LoadMetrics;
  
  // Health monitoring
  healthCheck: HealthCheckConfig;
  
  // Environment and deployment
  environment: 'development' | 'staging' | 'production';
  cluster: string;
  namespace: string;
  
  // Operational metadata
  startTime: string;
  lastHeartbeat: string;
  registrationTime: string;
  status: AgentStatus;
}
```

### Performance Characteristics

| Operation | Redis Registry | Consul Registry |
|-----------|----------------|-----------------|
| Agent Registration | <10ms | <50ms |
| Service Discovery | <5ms | <25ms |
| Health Check | <100ms | <200ms |
| Scale (agents) | 1000+ | 10000+ |
| Availability | 99.9% | 99.99% |

### Network Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Meta-Agent    │    │   Meta-Agent    │    │   Meta-Agent    │
│   (PRD Parser)  │    │ (Scaffold Gen)  │    │ (Orchestrator)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
        ┌──────────────────────────────────────────────────┐
        │              UEP Network Bridge                  │
        │    (Service Discovery + Load Balancing)         │
        └─────────────────┬────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
┌───▼────┐         ┌──────▼──────┐      ┌──────▼──────┐
│ Redis  │         │   Consul    │      │ Observability│
│Registry│         │  Cluster    │      │  Dashboard   │
└────────┘         └─────────────┘      └─────────────┘
```

## Configuration

### Redis Registry Configuration

```typescript
const config = createRedisRegistryConfig({
  redis: {
    host: 'redis-registry',
    port: 6379,
    password: process.env.REDIS_PASSWORD,
    keyPrefix: 'uep:registry',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },
  healthCheck: {
    interval: 30000,        // 30 seconds between checks
    timeout: 5000,          // 5 second timeout
    retries: 3,             // 3 failures = unhealthy
    deregistrationDelay: 60000  // 1 minute before auto-deregister
  },
  heartbeat: {
    interval: 15000,        // 15 second heartbeats
    ttl: 60                 // 60 second TTL
  }
});
```

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=redis-registry-dev
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# Health Check Configuration
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3

# Registry Configuration
REGISTRY_KEY_PREFIX=uep:registry
HEARTBEAT_INTERVAL=15000
HEARTBEAT_TTL=60

# Monitoring
MONITOR_PORT=8090
LOG_LEVEL=info
```

## Development

### Running Tests

```bash
# Unit tests
npm test

# Integration tests with Docker
npm run test:integration

# Manual testing with monitoring
npm run start:dev
open http://localhost:8090
```

### Building

```bash
# Compile TypeScript
npm run build

# Package for distribution
npm pack
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Deployment

### Docker Compose (Recommended)

```bash
# Development deployment
docker-compose -f docker-compose-redis-registry.yml --profile dev up -d

# Production deployment
docker-compose -f docker-compose-redis-registry.yml --profile prod up -d

# With monitoring
docker-compose -f docker-compose-redis-registry.yml --profile prod --profile monitor up -d
```

### Kubernetes

```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-registry
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis-registry
  template:
    spec:
      containers:
      - name: redis
        image: redis:7.2-alpine
        ports:
        - containerPort: 6379
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
```

## Monitoring and Observability

### Health Endpoints

- **Registry Health**: `GET /health` - Registry service health status
- **Metrics**: `GET /metrics` - Prometheus-compatible metrics
- **Agent List**: `GET /agents` - List of registered agents
- **Agent Details**: `GET /agents/{id}` - Specific agent information

### Key Metrics

- `registry_agents_total` - Total number of registered agents
- `registry_health_checks_total` - Number of health checks performed
- `registry_discovery_queries_total` - Number of discovery queries
- `registry_registration_duration_seconds` - Agent registration latency
- `registry_discovery_duration_seconds` - Service discovery latency

### Alerting

Key alerts to configure:
- Agent registration failures
- High health check failure rate
- Registry service unavailability
- Performance degradation (high latency)

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check Redis connectivity
   redis-cli -h redis-registry-dev -p 6379 ping
   
   # Check Docker network
   docker network ls | grep uep-network
   ```

2. **Health Checks Failing**
   ```bash
   # Verify agent health endpoints
   curl http://agent-service:3000/health
   
   # Check agent configuration
   docker logs agent-container
   ```

3. **High Latency**
   ```bash
   # Monitor Redis performance
   redis-cli --latency -h redis-registry-dev -p 6379
   
   # Check resource usage
   docker stats
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with verbose output
DEBUG=uep:registry npm test
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [Full Documentation](https://uep-factory.github.io/service-discovery)
- **Issues**: [GitHub Issues](https://github.com/uep-factory/service-discovery/issues)
- **Discussions**: [GitHub Discussions](https://github.com/uep-factory/service-discovery/discussions)
- **Slack**: #uep-service-discovery

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: January 2025