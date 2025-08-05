# Health Check Guide for NATS Worker Services

This guide provides comprehensive health check solutions for NATS-based worker services that don't expose HTTP endpoints.

## Quick Fix for Your Current Issue

Your current health check is failing because it's trying to access an HTTP endpoint that doesn't exist:

```bash
# ❌ Current failing health check
wget --no-verbose --tries=1 --spider http://localhost:3001/health
```

## Recommended Solutions

### 1. **NATS Connectivity Health Check (Best for Production)**

Use the dedicated NATS health check script:

```dockerfile
# In your Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node /app/src/nats-health-check.js || exit 1
```

**Pros:**
- ✅ Tests actual NATS connectivity
- ✅ Verifies publish/subscribe functionality
- ✅ Fast execution (5-second timeout)
- ✅ Comprehensive error handling

**Best for:** Production NATS workers where connectivity is critical

### 2. **Simple Process Health Check (Fastest)**

Use a basic process check for lightweight monitoring:

```dockerfile
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=2 \
  CMD pgrep -f "simple-domain-agent" > /dev/null || exit 1
```

**Pros:**
- ✅ Very fast execution
- ✅ Low resource usage
- ✅ Simple to debug

**Cons:**
- ⚠️ Doesn't verify NATS connectivity
- ⚠️ Process might be running but not functional

**Best for:** Development environments or when NATS is highly reliable

### 3. **Combined Health Check (Most Comprehensive)**

Use the combined health check for complete coverage:

```dockerfile
HEALTHCHECK --interval=45s --timeout=15s --start-period=30s --retries=3 \
  CMD node /app/health-checks/combined-health-check.js || exit 1
```

**Pros:**
- ✅ Process + NATS + Memory checks
- ✅ Detailed logging and diagnostics
- ✅ Configurable thresholds

**Cons:**
- ⚠️ Longer execution time
- ⚠️ More resource intensive

**Best for:** Critical production services with comprehensive monitoring needs

## Implementation Examples

### For Pure NATS Workers (No HTTP)

```yaml
# docker-compose.yml
services:
  backend-agent-worker:
    build:
      context: ./containers/domain-agents
      dockerfile: Dockerfile.nats-worker
    environment:
      - AGENT_TYPE=backend
      - NATS_URL=nats://nats-broker:4222
    depends_on:
      nats-broker:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "/app/health-checks/nats-health-check.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    # No exposed ports - pure worker
```

### For Hybrid Services (HTTP + NATS)

```yaml
# docker-compose.yml
services:
  domain-agents:
    build:
      context: ./containers/domain-agents
      dockerfile: Dockerfile.working
    ports:
      - "3002:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    command: ["node", "dist/domain-agents.js"]  # HTTP + NATS service
```

## Health Check Script Files

The following health check scripts are available:

1. **`nats-health-check.js`** - NATS connectivity check
2. **`process-health-check.sh`** - Simple process check
3. **`combined-health-check.js`** - Comprehensive multi-check

## Troubleshooting

### Common Issues and Solutions

**Issue: "NATS connection timeout"**
```bash
# Check NATS broker status
docker logs meta-agent-nats-broker

# Verify network connectivity
docker exec <container> ping nats-broker
```

**Issue: "Process not found"**
```bash
# Check if the correct process is running
docker exec <container> ps aux | grep node

# Verify the command matches the process name
docker exec <container> pgrep -f "simple-domain-agent"
```

**Issue: "Health check timeout"**
```bash
# Run health check manually for debugging
docker exec <container> node /app/health-checks/nats-health-check.js

# Check logs for detailed error messages
docker logs <container> --tail 50
```

## Best Practices

1. **Choose the Right Interval**: 
   - Development: 15-30s intervals
   - Production: 30-60s intervals

2. **Set Appropriate Timeouts**:
   - NATS checks: 5-10s
   - Process checks: 2-5s
   - Combined checks: 10-15s

3. **Use Proper Start Period**:
   - Simple workers: 10-20s
   - Complex workers: 30-60s

4. **Configure Retries Wisely**:
   - Stable environments: 2-3 retries
   - Unstable networks: 3-5 retries

## Migration Path

To fix your current setup:

1. **Immediate Fix**: Update your Docker Compose health check:
   ```yaml
   healthcheck:
     test: ["CMD", "node", "/app/src/nats-health-check.js"]
   ```

2. **Long-term**: Choose the appropriate Dockerfile and health check strategy based on your service type (pure NATS worker vs hybrid HTTP+NATS).

## Environment Variables

Configure these environment variables for optimal health checking:

```bash
# Required
NATS_URL=nats://nats-broker:4222
AGENT_TYPE=backend

# Optional (with defaults)
HEALTH_CHECK_TIMEOUT=5000
MEMORY_THRESHOLD=90
```