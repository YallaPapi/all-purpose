# Phase 2: Enhanced Messaging & Gateway - Complete Guide

## 🚀 PHASE 2 COMPLETE ✅

Phase 2 has successfully implemented event-driven architecture with production-ready messaging and enhanced gateway capabilities.

## 🏗️ Architecture Overview

### Event-Driven Messaging System ✅
- **NATS JetStream** with 4 dedicated streams
- **Event persistence** and replay capabilities  
- **Schema validation** for all event types
- **Inter-service coordination** via events

### Enhanced API Gateway ✅
- **Advanced Traefik configuration** with production middleware
- **Security headers** and rate limiting
- **Circuit breakers** and retry mechanisms
- **A/B testing** and weighted routing support

### CI/CD Pipeline Enhancement ✅
- **Docker Hub publishing** automation
- **Multi-image builds** for all 5 containers
- **Security scanning** with Trivy
- **Production deployment** ready

---

## 📡 NATS JetStream Streams

### Stream Configuration

1. **META_AGENT_EVENTS** - Meta-agent lifecycle events
   - Subjects: `meta.agent.created`, `meta.agent.started`, `meta.agent.completed`, `meta.agent.failed`, `meta.agent.deleted`
   - Retention: 30 days, 100K messages max
   - Storage: File-based persistence

2. **DOMAIN_AGENT_EVENTS** - Domain-specific agent operations  
   - Subjects: `domain.lead-generation.*`, `domain.documentation.*`, `domain.qa-testing.*`, `domain.devops.*`, `domain.prospector.*`
   - Retention: 14 days, 50K messages max
   - Storage: File-based persistence

3. **FACTORY_COORDINATION** - Factory-level orchestration
   - Subjects: `factory.task.assigned`, `factory.task.progress`, `factory.task.completed`, `factory.workflow.*`, `factory.error.reported`
   - Retention: 7 days, 25K messages max
   - Storage: File-based persistence

4. **SYSTEM_METRICS** - Performance and health metrics
   - Subjects: `metrics.performance.*`, `metrics.health.*`, `metrics.resource.*`, `alerts.*`
   - Retention: 3 days, 10K messages max
   - Storage: Memory-based for speed

### Consumer Configuration

Each stream has dedicated consumers:
- **factory-core-consumer** - Processes meta-agent events
- **coordination-consumer** - Handles cross-domain coordination
- **orchestrator-consumer** - Manages factory workflows
- **observability-consumer** - Consumes metrics for monitoring

---

## 🎯 Event-Driven Coordination

### EventBus Implementation

```typescript
// Connect to messaging system
const eventBus = new EventBus('nats://nats-broker:4222');
await eventBus.connect();

// Publish events
await eventBus.publish('meta.agent.created', {
  agentId: 'agent-001',
  type: 'all-purpose-pattern',
  status: 'created'
}, { source: 'factory-core' });

// Subscribe to events
await eventBus.subscribe('factory.task.assigned', async (message) => {
  console.log('Task assigned:', message.data);
});
```

### Message Persistence & Replay

```typescript
// Query historical messages
const messages = persistence.query({
  subject: 'meta.agent.completed',
  fromTime: '2025-01-01T00:00:00Z',
  limit: 100
});

// Replay messages from specific position
const replayMessages = persistence.replay('META_AGENT_EVENTS', 1000, 2000);
```

### Schema Validation

All events are validated against TypeScript schemas:
- **MetaAgentCreatedEvent** - Agent creation validation
- **FactoryTaskAssignedEvent** - Task assignment validation  
- **DomainAgentEvent** - Domain-specific event validation
- **Performance/Health/Alert Events** - Metrics validation

---

## 🛡️ Enhanced API Gateway

### Advanced Middleware Stack

1. **Authentication & Authorization**
   ```yaml
   auth-factory:
     forwardAuth:
       address: "http://factory-core:3000/auth/validate"
       authResponseHeaders:
         - "X-Auth-User"
         - "X-Auth-Roles"
   ```

2. **Rate Limiting & Protection**
   ```yaml
   rate-limit-api:
     rateLimit:
       average: 100
       burst: 200
       period: "1m"
   ```

3. **Security Headers**
   ```yaml
   security-headers:
     headers:
       customResponseHeaders:
         X-Frame-Options: "DENY"
         Strict-Transport-Security: "max-age=31536000"
   ```

4. **Circuit Breaker**
   ```yaml
   circuit-breaker:
     circuitBreaker:
       expression: "NetworkErrorRatio() > 0.3"
       fallbackDuration: "30s"
   ```

### Production Routes

- **factory.localhost** - Factory Core API with full middleware stack
- **agents.localhost** - Domain Agents with rate limiting
- **admin.localhost** - Admin interface with IP whitelisting
- **metrics.localhost** - Observability dashboard (admin only)
- **ws.localhost** - WebSocket support for real-time events

---

## 🐳 Docker Hub Publishing

### Automated CI/CD Pipeline

The GitHub Actions workflow now automatically:

1. **Builds 5 containers** on every main branch push
2. **Publishes to Docker Hub** with proper tagging
3. **Runs security scans** with Trivy
4. **Creates production configs** 
5. **Validates orchestration** 

### Published Images

```bash
# Pull production images
docker pull yourusername/meta-agent-factory-gateway:latest
docker pull yourusername/meta-agent-factory-core:latest  
docker pull yourusername/meta-agent-factory-agents:latest
docker pull yourusername/meta-agent-factory-nats:latest
docker pull yourusername/meta-agent-factory-observability:latest
```

### Required Secrets

Add to GitHub repository secrets:
```
DOCKER_USERNAME=your-docker-hub-username
DOCKER_PASSWORD=your-docker-hub-password-or-token
```

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Core Services
NODE_ENV=production
JWT_SECRET="your-super-secure-jwt-secret-key-here"

# Messaging  
NATS_URL="nats://nats-broker:4222"
NATS_USER="factory"
NATS_PASSWORD="factory-secret"

# Gateway
TRAEFIK_ACME_EMAIL="admin@yourdomain.com"
DOMAIN="yourdomain.com"

# Observability
GRAFANA_PASSWORD="admin"
PROMETHEUS_RETENTION="15d"
```

### Quick Start Commands

```bash
# Start enhanced MVS stack
npm run mvs:start

# View real-time logs
npm run docker:logs

# Check messaging status
curl http://localhost:8222/varz

# Access services
open http://factory.localhost    # Factory Core API
open http://agents.localhost     # Domain Agents
open http://metrics.localhost    # Grafana Dashboard  
open http://traefik.localhost:8080  # Gateway Dashboard
```

---

## 📊 Monitoring & Observability

### Event Stream Monitoring

- **NATS Dashboard**: http://localhost:8222
- **Stream Statistics**: Message counts, consumer lag, storage usage
- **Consumer Health**: Active subscriptions, processing rates
- **Replay Capabilities**: Historical message recovery

### Gateway Metrics

- **Request/Response Rates**: Per-service traffic analysis
- **Error Rates**: 4xx/5xx monitoring with alerting
- **Circuit Breaker Status**: Service health indicators
- **Rate Limiting**: Throttling effectiveness

### Message Persistence Stats

```typescript
const stats = persistence.getStats();
// {
//   totalMessages: 15420,
//   messagesPerStream: {
//     "META_AGENT_EVENTS": 8500,
//     "FACTORY_COORDINATION": 4200, 
//     "DOMAIN_AGENT_EVENTS": 2320,
//     "SYSTEM_METRICS": 400
//   },
//   storageSize: 52428800
// }
```

---

## 🚦 Health Checks

### Service Health Endpoints

- Factory Core: `curl http://localhost:3000/health`
- Domain Agents: `curl http://localhost:3001/health`  
- NATS Broker: `curl http://localhost:8222/healthz`
- API Gateway: `curl http://localhost:8080/ping`

### EventBus Connection Status

```typescript
const status = eventBus.getConnectionStatus();
// {
//   connected: true,
//   subscriptions: ["factory.task.assigned", "meta.agent.created"],
//   natsUrl: "nats://nats-broker:4222"  
// }
```

---

## 🎯 Next Steps

Phase 2 is **COMPLETE** ✅

**Ready to proceed to:**
- **Phase 3**: Service Extraction (Individual microservice containers)
- **Phase 4**: Observability & Scaling (Production monitoring & auto-scaling)

## 📋 Production Deployment Checklist

- [ ] Set up Docker Hub account and configure CI secrets
- [ ] Configure domain DNS for production routes
- [ ] Generate production JWT secrets  
- [ ] Set up SSL certificates (auto via Let's Encrypt)
- [ ] Configure monitoring alerts and thresholds
- [ ] Test event replay and message persistence
- [ ] Validate circuit breaker and rate limiting
- [ ] Set up backup procedures for message persistence

**Status**: Phase 2 Enhanced Messaging & Gateway - ✅ COMPLETE