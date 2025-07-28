# UEP Base Agent Dockerfile Template

## Overview

This is the foundational Dockerfile template for all UEP Meta-Agent Factory agents. It provides a secure, production-ready, multi-stage build configuration optimized for Node.js applications with comprehensive health checking, signal handling, and security hardening.

## Key Features

### 🔒 Security First
- **Non-root execution**: Runs as dedicated `agent` user (UID 1000)
- **Minimal attack surface**: Alpine Linux base with only essential packages
- **Secure file permissions**: Proper ownership and access controls
- **No secrets in image**: Environment-based configuration only

### 🚀 Production Ready
- **Multi-stage builds**: Separate development and production targets
- **Layer caching optimization**: Efficient Docker layer reuse
- **Health checks**: Comprehensive HTTP-based health monitoring
- **Graceful shutdown**: Proper signal handling for clean termination
- **Resource awareness**: Configurable CPU and memory limits

### 📊 Observability
- **Structured logging**: Configurable log levels and formats
- **Health endpoints**: `/health` and `/metrics` endpoints
- **Build metadata**: OCI-compliant labels with build information
- **Debug support**: Development mode with Node.js inspector

### ⚡ Performance
- **BuildKit optimized**: Uses latest Docker BuildKit features
- **Dependency optimization**: Production-only dependencies in final image
- **Small image size**: Optimized for minimal footprint
- **Fast startup**: Efficient initialization process

## Template Structure

```
containers/templates/
├── Dockerfile.base-agent          # Main Dockerfile template
├── .dockerignore.base-agent       # Optimized build context exclusions
├── README.base-agent.md           # This documentation
└── examples/
    ├── package.json.example       # Example package.json
    └── agent-implementation.js    # Example agent implementation
```

## Quick Start

### Step 1: Copy Template Files

```bash
# Navigate to your agent directory
cd containers/my-agent/

# Copy template files
cp ../templates/Dockerfile.base-agent ./Dockerfile
cp ../templates/.dockerignore.base-agent ./.dockerignore
```

### Step 2: Customize Build Arguments

Edit the `Dockerfile` and customize these arguments:

```dockerfile
ARG AGENT_TYPE=my-agent
ARG AGENT_NAME="My Custom Agent"
ARG AGENT_VERSION=1.0.0
```

### Step 3: Build and Test

```bash
# Development build
docker build --target development --tag my-agent:dev .

# Production build
docker build --target production \
  --build-arg AGENT_TYPE=my-agent \
  --build-arg AGENT_NAME="My Custom Agent" \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg GIT_COMMIT=$(git rev-parse HEAD) \
  --tag my-agent:latest .
```

## Build Targets

### Development Target

**Purpose**: Local development and debugging
**Features**:
- Includes dev dependencies
- Node.js inspector enabled on port 9229
- Debug logging enabled
- Source maps included
- Hot reload friendly

**Usage**:
```bash
# Build development image
docker build --target development --tag my-agent:dev .

# Run with debugging
docker run -p 3000:3000 -p 9229:9229 \
  -e NODE_ENV=development \
  -v $(pwd)/src:/app/src \
  my-agent:dev
```

### Production Target

**Purpose**: Production deployment
**Features**:
- Production dependencies only
- Optimized for size and security
- Health checks enabled
- Proper signal handling
- Resource efficient

**Usage**:
```bash
# Build production image
docker build --target production --tag my-agent:prod .

# Run in production mode
docker run -d --name my-agent \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  --restart unless-stopped \
  my-agent:prod
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment mode |
| `AGENT_TYPE` | `base-agent` | Type identifier for the agent |
| `AGENT_NAME` | `UEP Base Agent` | Human-readable agent name |
| `SERVICE_PORT` | `3000` | Main service port |
| `HEALTH_CHECK_PORT` | `3000` | Health check endpoint port |
| `HEALTH_CHECK_PATH` | `/health` | Health check endpoint path |
| `METRICS_PORT` | `3000` | Metrics endpoint port |
| `METRICS_PATH` | `/metrics` | Metrics endpoint path |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `SHUTDOWN_TIMEOUT` | `30000` | Graceful shutdown timeout (ms) |
| `STARTUP_TIMEOUT` | `60000` | Startup timeout (ms) |

### Build Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `NODE_VERSION` | `20.11.1` | Node.js version |
| `ALPINE_VERSION` | `alpine3.19` | Alpine Linux version |
| `AGENT_TYPE` | `base-agent` | Agent type identifier |
| `AGENT_NAME` | `UEP Base Agent` | Agent display name |
| `AGENT_VERSION` | `1.0.0` | Agent version |
| `BUILD_DATE` | *(unset)* | Build timestamp |
| `GIT_COMMIT` | *(unset)* | Git commit hash |
| `BUILD_NUMBER` | *(unset)* | CI build number |

## Health Checks

The template includes a comprehensive health check system:

### Health Check Script (`/app/health-check.sh`)

The health check script performs:
1. HTTP GET request to the health endpoint
2. 5-second timeout for responsiveness
3. Proper exit codes for Docker health status
4. Logging for debugging

### Health Endpoint Requirements

Your agent must implement a `/health` endpoint that returns:

```javascript
// Example health endpoint response
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "uptime": 45231,
  "memory": {
    "used": 123456789,
    "total": 512000000
  },
  "version": "1.0.0",
  "agent": {
    "type": "my-agent",
    "name": "My Custom Agent"
  }
}
```

### Health Check Configuration

```dockerfile
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=60s \
            --retries=3 \
            CMD ["/app/health-check.sh"]
```

## Security Hardening

### Container Security Features

1. **Non-root User**
   ```dockerfile
   USER agent  # UID 1000, GID 1000
   ```

2. **Minimal Base Image**
   ```dockerfile
   FROM node:20-alpine3.19  # Minimal attack surface
   ```

3. **Secure File Permissions**
   ```bash
   # Files: 644 (read-write for owner, read for group/others)
   # Directories: 755 (full for owner, read-execute for group/others)
   # Executables: 755 (executable scripts)
   ```

4. **No Secrets in Image**
   ```dockerfile
   # All sensitive data via environment variables
   # Never COPY or ADD secret files
   ```

### Security Scanning

```bash
# Scan for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v $HOME/Library/Caches:/root/.cache/ \
  aquasec/trivy image my-agent:latest

# Check for best practices
docker run --rm -i hadolint/hadolint < Dockerfile
```

## Signal Handling and Graceful Shutdown

The template implements proper signal handling for graceful shutdowns:

### Signal Flow

1. **SIGTERM/SIGINT received** → Startup script catches signal
2. **Forward to Node.js process** → Child process receives TERM signal
3. **Application cleanup** → Your app handles graceful shutdown
4. **Process termination** → Clean exit after timeout

### Implementation in Your Agent

```javascript
// Example graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  
  // Close server
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connections
  await database.close();
  
  // Clean up resources
  await cleanup();
  
  process.exit(0);
});
```

## Performance Optimization

### Build Performance

1. **Layer Caching**
   ```dockerfile
   # Dependencies copied first for better caching
   COPY package*.json ./
   RUN npm ci --only=production
   
   # Source code copied after dependencies
   COPY src/ ./src/
   ```

2. **BuildKit Features**
   ```dockerfile
   # syntax=docker/dockerfile:1.7-labs
   # Enables latest BuildKit optimizations
   ```

3. **Multi-stage Efficiency**
   ```dockerfile
   # Separate stages minimize final image size
   FROM base AS dependencies
   FROM dependencies AS production
   ```

### Runtime Performance

1. **Process Management**
   ```dockerfile
   ENTRYPOINT ["/sbin/tini", "--"]  # Proper PID 1 handling
   ```

2. **Resource Awareness**
   ```dockerfile
   ENV MEMORY_LIMIT=512M
   ENV CPU_LIMIT=1000m
   ```

## Monitoring and Observability

### Metrics Endpoint

Your agent should implement a `/metrics` endpoint compatible with Prometheus:

```javascript
// Example metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = [
    '# HELP agent_requests_total Total number of requests',
    '# TYPE agent_requests_total counter',
    `agent_requests_total ${requestCount}`,
    '',
    '# HELP agent_uptime_seconds Agent uptime in seconds',
    '# TYPE agent_uptime_seconds gauge',
    `agent_uptime_seconds ${Math.floor(process.uptime())}`
  ].join('\\n');
  
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

### Logging Best Practices

```javascript
// Structured logging example
const logger = require('winston');

logger.info('Agent started', {
  agent_type: process.env.AGENT_TYPE,
  agent_version: process.env.AGENT_VERSION,
  node_version: process.version,
  environment: process.env.NODE_ENV
});
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build context size
   docker build --no-cache --progress=plain .
   
   # Verify .dockerignore is working
   docker build --no-cache . 2>&1 | grep "COPY"
   ```

2. **Permission Issues**
   ```bash
   # Verify user setup
   docker run --rm my-agent:latest id
   # Should output: uid=1000(agent) gid=1000(agent)
   ```

3. **Health Check Failures**
   ```bash
   # Test health check manually
   docker run --rm my-agent:latest /app/health-check.sh
   
   # Check health endpoint
   docker exec container-name curl -f http://localhost:3000/health
   ```

4. **Signal Handling Issues**
   ```bash
   # Test graceful shutdown
   docker run -d --name test-agent my-agent:latest
   docker stop test-agent  # Should shutdown gracefully
   docker logs test-agent  # Check for graceful shutdown messages
   ```

### Debug Mode

```bash
# Run with debug logging
docker run -e LOG_LEVEL=debug -e NODE_ENV=development my-agent:dev

# Access with shell for debugging
docker run -it --entrypoint /bin/sh my-agent:latest
```

## Advanced Usage

### Custom Entrypoints

```dockerfile
# Override default entrypoint
COPY custom-entrypoint.sh /app/
ENTRYPOINT ["/sbin/tini", "--", "/app/custom-entrypoint.sh"]
```

### Volume Mounts

```bash
# Persistent data
docker run -v agent-data:/app/data my-agent:latest

# Configuration files
docker run -v ./config:/app/config:ro my-agent:latest

# Logs
docker run -v ./logs:/app/logs my-agent:latest
```

### Network Configuration

```bash
# Custom network
docker network create uep-network
docker run --network uep-network my-agent:latest

# Port binding
docker run -p 8080:3000 my-agent:latest
```

## Best Practices

### Development Workflow

1. **Use development target for local development**
2. **Mount source code for hot reloading**
3. **Enable debug logging and inspector**
4. **Use volume mounts for persistent data**

### Production Deployment

1. **Always use production target**
2. **Set appropriate resource limits**
3. **Use secrets management for sensitive data**
4. **Implement proper monitoring and alerting**
5. **Regular security scanning**

### Image Management

1. **Tag images with semantic versions**
2. **Push to secure registries only**
3. **Implement image scanning in CI/CD**
4. **Regular base image updates**

## Integration Examples

### Docker Compose

```yaml
version: '3.8'
services:
  my-agent:
    build:
      context: .
      target: production
      args:
        AGENT_TYPE: my-agent
        AGENT_NAME: "My Custom Agent"
        BUILD_DATE: "2025-01-27T10:30:00Z"
    environment:
      NODE_ENV: production
      LOG_LEVEL: info
      SERVICE_PORT: 3000
    ports:
      - "3000:3000"
    volumes:
      - agent-data:/app/data
      - agent-logs:/app/logs
    healthcheck:
      test: ["CMD", "/app/health-check.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    restart: unless-stopped

volumes:
  agent-data:
  agent-logs:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-agent
  template:
    metadata:
      labels:
        app: my-agent
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: my-agent
        image: my-agent:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Support and Contributing

- **Documentation**: [UEP Agent Documentation](../README.md)
- **Issues**: Report template issues in the main repository
- **Contributing**: Follow the contribution guidelines
- **Security**: Report security issues privately

## Template Changelog

### Version 1.0.0 (2025-01-27)
- Initial release
- Multi-stage build support
- Security hardening
- Health check implementation
- Signal handling
- Production optimizations
- Development debugging support