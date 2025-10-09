# Docker Compose Integration with Service Discovery
## Task 191.4: Complete Docker Compose setup with service discovery integration

### Overview

This document provides comprehensive instructions for running the UEP Meta-Agent Factory with integrated service discovery using Docker Compose. The setup includes Redis and Consul registries, real-time monitoring, and complete agent coordination.

### Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    UEP Meta-Agent Factory                       │
│                   with Service Discovery                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   API Gateway   │  │   Observability │  │    Monitoring   │
│   (Traefik)     │  │    Dashboard    │  │  (Prometheus)   │
│   Port: 80/443  │  │   Port: 3030    │  │   Port: 9090    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Service Discovery Layer                     │
├─────────────────┬─────────────────────┬─────────────────────────┤
│  Redis Registry │  Consul Registry    │  Discovery Monitor      │
│  Port: 6379     │  Port: 8500         │  Port: 8090            │    
└─────────────────┴─────────────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      UEP Agent Services                         │
├──────────────┬──────────────┬──────────────┬──────────────────────┤
│ Factory Core │ Infra Orch.  │ PRD Parser   │ Scaffold Generator   │
│ Port: 3000   │ Port: 3001    │ Port: 3002   │ Port: 3003          │
├──────────────┼──────────────┼──────────────┼──────────────────────┤
│ Backend Agt. │ Frontend Agt. │ Domain Agt.  │ UEP Service         │
│ Port: 3004   │ Port: 3005    │ Port: 3010   │ Port: 3020          │
└──────────────┴──────────────┴──────────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                        │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   NATS Message Bus  │   Docker Network    │   Persistent Storage │
│   Port: 4222        │   172.20.0.0/16     │   Named Volumes     │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### Quick Start

#### Prerequisites

1. **Docker** (v20.10+)
2. **Docker Compose** (v2.0+)
3. **Available Memory**: 4GB+ recommended
4. **Available Ports**: 3000-3099, 6379, 8080, 8090, 8222, 8500, 9090

#### 1. Start the Complete System

**Linux/Mac:**
```bash
# Make script executable
chmod +x scripts/start-with-service-discovery.sh

# Start all services
./scripts/start-with-service-discovery.sh start
```

**Windows:**
```cmd
# Start all services
scripts\start-with-service-discovery.bat start
```

#### 2. Verify the System

```bash
# Check service status
./scripts/start-with-service-discovery.sh status

# Perform health checks
./scripts/start-with-service-discovery.sh health

# Test service discovery
./scripts/start-with-service-discovery.sh test
```

#### 3. Access the Dashboards

- **Factory Core**: http://localhost:3000
- **Service Discovery Monitor**: http://localhost:8090
- **Consul UI**: http://localhost:8500
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3031 (admin/admin)
- **Observability Dashboard**: http://localhost:3030
- **API Gateway Dashboard**: http://localhost:8080

### Configuration

#### Environment Variables

Copy and customize the environment file:

```bash
cp .env.service-discovery.example .env.service-discovery
```

Key configuration options:

```bash
# Registry Type
REGISTRY_TYPE=redis          # redis, consul, or hybrid

# Service Discovery
SERVICE_DISCOVERY_ENABLED=true
AUTO_REGISTER=true
HEALTH_CHECK_INTERVAL=30000

# Redis Configuration
REDIS_HOST=redis-registry
REDIS_PORT=6379
REDIS_PASSWORD=

# Consul Configuration  
CONSUL_HOST=consul-server
CONSUL_PORT=8500
CONSUL_TOKEN=

# Agent Capabilities
PRD_PARSER_CAPABILITIES=parsing,validation,analysis
SCAFFOLD_GENERATOR_CAPABILITIES=generation,scaffolding,templating
```

#### Docker Compose Profiles

The setup supports different deployment profiles:

```bash
# Development mode (all services)
docker-compose -f docker-compose-service-discovery.yml up -d

# Production mode (optimized)
docker-compose -f docker-compose-service-discovery.yml --profile prod up -d

# Testing mode (includes test agents)
docker-compose -f docker-compose-service-discovery.yml --profile test up -d
```

### Service Discovery Features

#### Automatic Agent Registration

All agents automatically register themselves with the service discovery system on startup:

```typescript
// Agents automatically register with these capabilities
const agentConfig = {
  agentType: process.env.AGENT_TYPE,
  agentName: process.env.AGENT_NAME,
  capabilities: process.env.CAPABILITIES.split(','),
  network: {
    address: 'container-name',
    port: parseInt(process.env.SERVICE_PORT)
  }
};

// Service helper handles registration
const serviceHelper = createAgentHelper(agentConfig);
await serviceHelper.start(); // Auto-registers
```

#### Agent-to-Agent Discovery

Agents can discover and communicate with each other:

```bash
# Example: PRD Parser discovering Scaffold Generators
curl http://localhost:3002/discover/scaffold-generator
```

Response:
```json
{
  "success": true,
  "agentType": "scaffold-generator",
  "agents": [
    {
      "id": "scaffold-generator-001",
      "name": "Scaffold Generator Agent",
      "address": "uep-scaffold-generator",
      "port": 3003,
      "load": 25,
      "status": "healthy"
    }
  ]
}
```

#### Load-Aware Routing

The system automatically routes requests to the least loaded agents:

```typescript
// Find the best available agent
const bestAgent = await serviceHelper.getBestAgent('prd-parser', {
  maxLoad: 70,
  maxResponseTime: 1000
});

// Make request to the selected agent
const response = await fetch(`http://${bestAgent.network.address}:${bestAgent.network.port}/parse`, {
  method: 'POST',
  body: JSON.stringify(requestData)
});
```

### Monitoring and Observability

#### Real-Time Service Discovery Monitor

Access the service discovery monitor at http://localhost:8090:

- **Agent Registry**: Live view of all registered agents
- **Health Status**: Real-time health check results
- **Load Metrics**: Current load and performance metrics
- **Discovery Queries**: Recent service discovery requests

#### Prometheus Metrics

All agents expose Prometheus metrics at `/metrics`:

```bash
# View metrics for PRD Parser
curl http://localhost:3002/metrics
```

Key metrics:
- `uep_agent_registration_attempts_total`
- `uep_agent_discovery_queries_total`
- `uep_agent_current_load`
- `uep_agent_response_time_seconds`
- `uep_agent_error_rate`

#### Grafana Dashboards

Pre-configured dashboards available at http://localhost:3031:

1. **UEP Agent Overview**: System-wide agent status and metrics
2. **Service Discovery Performance**: Discovery latency and success rates
3. **Agent Load Distribution**: Load balancing effectiveness
4. **Health Check Status**: Health check failures and recovery

### Production Deployment

#### Security Configuration

```bash
# Enable security features
TLS_ENABLED=true
AUTH_ENABLED=true
CONSUL_TOKEN=your-secure-token
REDIS_PASSWORD=your-secure-password
```

#### Resource Limits

Configure resource limits in docker-compose:

```yaml
services:
  prd-parser:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

#### High Availability

For production high availability:

1. **Redis Sentinel**: Enable Redis HA with Sentinel
2. **Consul Cluster**: Run 3+ Consul servers
3. **Agent Replicas**: Scale agents horizontally
4. **Load Balancing**: Use external load balancer

```bash
# Scale agents horizontally
docker-compose -f docker-compose-service-discovery.yml up -d --scale prd-parser=3
```

### Troubleshooting

#### Common Issues

**1. Services Not Registering**
```bash
# Check Redis connectivity
docker exec uep-redis-registry redis-cli ping

# Check agent logs
docker-compose logs prd-parser

# Verify environment variables
docker exec uep-prd-parser env | grep REGISTRY
```

**2. Health Checks Failing**
```bash
# Check health endpoint directly
curl http://localhost:3002/health

# Check Docker network
docker network inspect uep-network

# Verify service dependencies
docker-compose ps
```

**3. Discovery Not Working**
```bash
# Test service discovery directly
curl http://localhost:8090/api/agents

# Check registry contents
redis-cli -h localhost -p 6379 SMEMBERS "uep:registry:list"

# Test agent discovery
curl http://localhost:3002/discover/scaffold-generator
```

#### Debug Mode

Enable debug logging:

```bash
# Set debug environment
DEBUG_ENABLED=true
LOG_LEVEL=debug
VERBOSE_LOGGING=true

# Restart with debug logging
docker-compose restart
```

#### Log Analysis

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f prd-parser

# Follow registry logs
docker-compose logs -f redis-registry consul-server
```

### Performance Optimization

#### Registry Performance

```bash
# Redis optimization
REDIS_MEMORY_LIMIT=1G
REDIS_MAX_CONNECTIONS=1000

# Consul optimization  
CONSUL_MEMORY_LIMIT=512M
CONSUL_LOG_LEVEL=WARN
```

#### Agent Performance

```bash
# Connection pooling
HTTP_POOL_SIZE=50
REDIS_POOL_SIZE=20

# Timeouts
HTTP_TIMEOUT=30000
REGISTRY_TIMEOUT=5000

# Caching
DISCOVERY_CACHE_TTL=300
ENABLE_DISCOVERY_CACHE=true
```

#### Network Optimization

```bash
# Use custom network with optimized settings
docker network create uep-network \
  --driver bridge \
  --subnet=172.20.0.0/16 \
  --opt com.docker.network.bridge.enable_icc=true \
  --opt com.docker.network.driver.mtu=1500
```

### Integration Examples

#### Custom Agent Integration

Add your own agent to the system:

```yaml
# Add to docker-compose-service-discovery.yml
my-custom-agent:
  build:
    context: ./my-agent
  container_name: my-custom-agent
  <<: *agent-defaults
  ports:
    - "3099:3099"
  environment:
    <<: *common-environment
    <<: *service-discovery-config
    AGENT_TYPE: my-custom-agent
    AGENT_NAME: "My Custom Agent"
    SERVICE_PORT: 3099
    CAPABILITIES: "custom-feature,specialized-processing"
```

#### External Service Integration

Connect external services to the discovery system:

```typescript
// External service can register itself
const externalServiceHelper = createAgentHelper({
  agentType: 'external-service',
  host: 'external-host',
  port: 8080,
  capabilities: ['external-api']
}, {
  registryUrl: 'redis://registry-host:6379'
});

await externalServiceHelper.start();
```

### Migration Path

#### From Direct Communication

1. **Phase 1**: Add service discovery alongside existing direct calls
2. **Phase 2**: Gradually replace hardcoded endpoints with discovery
3. **Phase 3**: Remove direct communication dependencies
4. **Phase 4**: Add advanced features (load balancing, health checks)

#### Legacy System Integration

```javascript
// Wrapper for legacy systems
class LegacyAgentAdapter {
  constructor(legacyService) {
    this.legacy = legacyService;
    this.serviceHelper = createAgentHelper({
      agentType: 'legacy-adapter',
      capabilities: ['legacy-integration']
    });
  }
  
  async start() {
    await this.serviceHelper.start();
    // Proxy requests to legacy service
  }
}
```

### Best Practices

#### Agent Development

1. **Always register on startup**: Use `autoRegisterOnStartup: true`
2. **Implement health checks**: Provide `/health` endpoint
3. **Report load metrics**: Update load with `updateLoad()`
4. **Handle discovery failures**: Implement fallback mechanisms
5. **Use typed interfaces**: Leverage TypeScript for safety

#### Service Discovery Usage

1. **Cache discovery results**: Enable caching for better performance
2. **Handle failures gracefully**: Implement circuit breaker patterns
3. **Monitor performance**: Track discovery latency and success rates
4. **Use load balancing**: Always check agent load before routing
5. **Implement retries**: Handle temporary network issues

#### Operations

1. **Monitor health regularly**: Set up alerts for failed health checks
2. **Scale based on load**: Use metrics to determine scaling needs
3. **Backup registry data**: Regular backups of Redis/Consul data
4. **Update gradually**: Rolling updates to maintain availability
5. **Test disaster recovery**: Regular DR tests and procedures

### Support and Maintenance

#### Regular Maintenance Tasks

```bash
# Daily
./scripts/start-with-service-discovery.sh health

# Weekly
docker system prune -f
docker volume prune -f

# Monthly
# Backup registry data
docker exec uep-redis-registry redis-cli BGSAVE
docker exec uep-consul-server consul snapshot save backup.snap
```

#### Monitoring Alerts

Set up alerts for:
- High agent failure rate (>10%)
- Registry unavailability (>1 minute)
- Discovery latency (>100ms)
- Memory usage (>90%)
- Disk usage (>85%)

---

**For additional support, see:**
- [Service Discovery API Documentation](./API.md)
- [Agent Development Guide](./AGENT_DEVELOPMENT.md)
- [Production Deployment Guide](./PRODUCTION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)