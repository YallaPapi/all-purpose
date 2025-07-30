# UEP Agent Container Template

## Overview

The UEP Agent Container Template provides a comprehensive, production-ready foundation for building containerized microservices that comply with the Universal Execution Protocol (UEP). This template integrates automatic service registration, health checks, OpenTelemetry observability, and graceful shutdown patterns based on TaskMaster research findings and Context7 methodology.

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+ with BuildKit support
- Node.js 20+ (for local development)
- Access to UEP Registry service
- Basic understanding of TypeScript and Express.js

### 1. Create Your Agent

```bash
# Copy the template files
mkdir my-uep-agent
cd my-uep-agent
cp -r path/to/templates/* .

# Rename files
mv Dockerfile.uep-agent Dockerfile
mv package.json.uep-agent package.json
mv docker-compose.uep-agent.yml docker-compose.yml

# Install dependencies
npm install
```

### 2. Customize Configuration

Edit your agent configuration in `src/index.ts`:

```typescript
const agentConfig: Partial<UEPConfig> = {
  agentType: 'my-custom-agent',
  agentName: 'My Custom UEP Agent',
  version: '1.0.0',
  capabilities: ['http', 'health', 'metrics', 'tracing', 'custom-feature'],
  metadata: {
    description: 'My custom agent implementation',
    features: ['feature1', 'feature2'],
    maintainer: 'your-team@company.com',
  }
};
```

### 3. Build and Run

```bash
# Development build
docker build --target uep-development -t my-agent:dev .
docker run -p 3000:3000 my-agent:dev

# Production build
docker build --target uep-production -t my-agent:latest .
docker run -d --name my-agent -p 3000:3000 my-agent:latest

# Or use Docker Compose
docker-compose up -d
```

## 🏗️ Architecture

### Core Components

1. **UEP Agent Wrapper** (`src/uep-agent-wrapper.ts`)
   - Protocol validation and enforcement
   - Automatic service registration/deregistration
   - OpenTelemetry integration
   - Health check management
   - Graceful shutdown handling

2. **Docker Multi-Stage Build** (`Dockerfile.uep-agent`)
   - Security-hardened Alpine Linux base
   - Non-root user execution
   - Multi-stage optimization
   - Development and production targets

3. **Express Middleware Integration**
   - UEP protocol validation middleware
   - OpenTelemetry tracing middleware
   - Health check endpoints
   - Metrics collection endpoints

4. **Sample Implementation** (`examples/sample-uep-agent.ts`)
   - Complete working example
   - TypeScript decorators usage
   - Best practices demonstration

### Directory Structure

```
containers/templates/
├── Dockerfile.uep-agent              # UEP-enhanced Dockerfile
├── package.json.uep-agent           # Node.js dependencies
├── docker-compose.uep-agent.yml     # Full stack composition
├── tsconfig.json                    # TypeScript configuration
├── src/
│   └── uep-agent-wrapper.ts         # Core UEP integration library
├── examples/
│   └── sample-uep-agent.ts          # Complete sample implementation
└── README.uep-agent-template.md     # This documentation
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UEP_AGENT_TYPE` | `uep-agent` | Agent type identifier |
| `UEP_AGENT_NAME` | `UEP Agent` | Human-readable agent name |
| `UEP_PROTOCOL_VERSION` | `2.0.0` | UEP protocol version |
| `UEP_REGISTRY_URL` | `http://uep-registry:3000` | Registry service URL |
| `UEP_SERVICE_URL` | `http://uep-service:3001` | UEP service URL |
| `UEP_AUTO_REGISTER` | `true` | Enable automatic registration |
| `UEP_VALIDATION_ENABLED` | `true` | Enable protocol validation |
| `OTEL_COLLECTOR_URL` | `http://otel-collector:4318` | OpenTelemetry collector URL |
| `SERVICE_PORT` | `3000` | Main service port |
| `LOG_LEVEL` | `info` | Logging level |

### Docker Build Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `UEP_AGENT_TYPE` | `uep-base-agent` | Agent type for build |
| `UEP_AGENT_NAME` | `UEP Base Agent` | Agent name for build |
| `UEP_PROTOCOL_VERSION` | `2.0.0` | Protocol version |
| `BUILD_DATE` | *(unset)* | Build timestamp |
| `GIT_COMMIT` | *(unset)* | Git commit hash |

## 🎯 Features

### UEP Protocol Compliance

- **Message Validation**: Automatic validation of incoming/outgoing messages
- **Protocol Enforcement**: Ensures all communications follow UEP standards
- **Version Compatibility**: Handles protocol version negotiation
- **Error Handling**: Standardized error responses for protocol violations

```typescript
@ValidateUEP
private async processMessage(req: Request, res: Response): Promise<void> {
  const message = req.body as UEPProtocolMessage;
  // Message is automatically validated by decorator
  // Your business logic here
}
```

### Automatic Service Registration

- **Registry Integration**: Connects to UEP Registry on startup
- **Health Reporting**: Periodic health status updates
- **Graceful Deregistration**: Clean removal on shutdown
- **Retry Logic**: Robust registration with exponential backoff

```typescript
// Automatic registration handled by UEPAgentWrapper
const wrapper = new UEPAgentWrapper({
  agentType: 'my-agent',
  autoRegister: true,
  registryUrl: 'http://uep-registry:3000'
});
await wrapper.initialize();
```

### Comprehensive Health Checks

- **Liveness Probe**: `/live` - Process health check
- **Readiness Probe**: `/ready` - Service readiness check
- **Health Endpoint**: `/health` - Comprehensive health status
- **UEP Health Check**: Registry connectivity validation

```bash
# Check different health endpoints
curl http://localhost:3000/live      # Liveness
curl http://localhost:3000/ready     # Readiness
curl http://localhost:3000/health    # Full health status
```

### OpenTelemetry Observability

- **Distributed Tracing**: Automatic span creation and context propagation
- **Metrics Collection**: Application and system metrics
- **Context Propagation**: UEP-compatible trace context handling
- **Custom Instrumentation**: Easy addition of custom spans and metrics

```typescript
// Automatic tracing via middleware
app.use(wrapper.getExpressMiddleware().tracing);

// Custom spans
wrapper.tracer.startActiveSpan('custom-operation', (span) => {
  // Your operation here
  span.setAttributes({ 'custom.attribute': 'value' });
  span.end();
});
```

### Graceful Shutdown

- **Signal Handling**: Proper SIGTERM/SIGINT processing
- **UEP Deregistration**: Clean removal from registry
- **Connection Cleanup**: Graceful closure of all connections
- **Timeout Management**: Configurable shutdown timeout

## 🛠️ Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

### Docker Development

```bash
# Build development image
docker build --target uep-development -t my-agent:dev .

# Run with debugging enabled
docker run -p 3000:3000 -p 9229:9229 \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  my-agent:dev
```

### Testing

```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage

# Integration tests with Docker
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 📊 Monitoring and Observability

### Metrics Endpoints

- **Prometheus Metrics**: `/metrics` - Application and system metrics
- **Health Status**: `/health` - JSON health information
- **Agent Status**: `/api/status` - Complete agent information

### Key Metrics Collected

- `agent_uptime_seconds` - Agent uptime
- `agent_memory_usage_bytes` - Memory usage by type
- `agent_registration_status` - UEP registration status
- `agent_requests_total` - Total requests processed
- `http_request_duration_seconds` - Request duration histogram

### Dashboards

The template includes Grafana dashboard configurations for:
- Agent health and status monitoring
- UEP registration tracking
- Performance metrics visualization
- Error rate and latency monitoring

## 🔒 Security Features

### Container Security

- **Non-root Execution**: Runs as user `uepagent` (UID 1000)
- **Read-only Root Filesystem**: Prevents runtime modifications
- **Minimal Base Image**: Alpine Linux for reduced attack surface
- **Security Headers**: Helmet.js for HTTP security headers
- **Resource Limits**: CPU and memory constraints

### Network Security

- **Rate Limiting**: Configurable request rate limits
- **CORS Configuration**: Customizable cross-origin settings
- **Input Validation**: UEP protocol message validation
- **TLS Support**: Ready for TLS termination at load balancer

## 🚀 Deployment

### Docker Compose Deployment

```bash
# Deploy full stack
docker-compose up -d

# Scale agents
docker-compose up -d --scale my-agent=3

# View status
docker-compose ps
docker-compose logs -f my-agent
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-uep-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-uep-agent
  template:
    metadata:
      labels:
        app: my-uep-agent
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: agent
        image: my-agent:latest
        ports:
        - containerPort: 3000
        env:
        - name: UEP_REGISTRY_URL
          value: "http://uep-registry:3000"
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 🔧 Customization

### Adding Custom Endpoints

```typescript
// In your agent class
@UEPAgent(agentConfig)
class MyCustomAgent {
  private setupRoutes(): void {
    // Add custom business logic endpoints
    this.app.post('/api/custom', this.handleCustomRequest.bind(this));
  }

  @ValidateUEP
  private async handleCustomRequest(req: Request, res: Response): Promise<void> {
    const message = req.body as UEPProtocolMessage;
    // Your custom logic here
  }
}
```

### Custom Health Checks

```typescript
// Override health check logic
public async getCustomHealthStatus(): Promise<UEPHealthStatus> {
  const baseHealth = await this.uepWrapper.getHealthStatus();
  
  // Add custom health checks
  const customChecks = await this.performCustomHealthChecks();
  
  return {
    ...baseHealth,
    dependencies: customChecks
  };
}
```

### Custom Metrics

```typescript
// Add custom metrics to the wrapper
const customMetrics = {
  customCounter: new Counter({
    name: 'custom_operations_total',
    help: 'Total custom operations performed'
  })
};

// Use in your code
customMetrics.customCounter.inc();
```

## 🔍 Troubleshooting

### Common Issues

1. **Registration Failures**
   ```bash
   # Check registry connectivity
   docker exec my-agent curl http://uep-registry:3000/health
   
   # Check agent logs
   docker logs my-agent
   ```

2. **Health Check Failures**
   ```bash
   # Test health check manually
   docker exec my-agent /app/uep-health-check.sh
   
   # Check endpoint directly
   curl http://localhost:3000/health
   ```

3. **OpenTelemetry Issues**
   ```bash
   # Verify collector connectivity
   docker exec my-agent curl http://otel-collector:4318/health
   
   # Check trace export
   docker logs otel-collector
   ```

### Debug Mode

```bash
# Enable debug logging
docker run -e LOG_LEVEL=debug -e NODE_ENV=development my-agent:dev

# Access container shell
docker exec -it my-agent /bin/sh

# Check configuration
docker exec my-agent env | grep UEP
```

## 📚 API Reference

### UEPAgentWrapper Class

#### Methods

- `initialize()`: Initialize the wrapper and register with UEP Registry
- `shutdown()`: Graceful shutdown with deregistration
- `getHealthStatus()`: Get current health status
- `validateUEPMessage(message)`: Validate UEP protocol message
- `getExpressMiddleware()`: Get Express middleware functions

#### Events

- `initialized`: Emitted when wrapper is fully initialized
- `registered`: Emitted when successfully registered with registry
- `registrationFailed`: Emitted when registration fails
- `healthCheck`: Emitted on each health check
- `shutdown`: Emitted when shutdown is complete

### TypeScript Decorators

- `@UEPAgent(config)`: Class decorator for UEP integration
- `@ValidateUEP`: Method decorator for protocol validation

### Utility Functions

- `createUEPMessage()`: Create standardized UEP protocol message
- `withUEPLifecycle()`: Higher-order function for lifecycle management
- `createUEPMessageHandler()`: Create UEP-compliant message handler

## 🤝 Contributing

### Development Setup

```bash
git clone <repository>
cd uep-agent-template
npm install
npm run build
npm test
```

### Code Standards

- Follow TypeScript strict mode
- Use ESLint configuration provided
- Maintain test coverage above 80%
- Follow semantic versioning for releases

### Submitting Changes

1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation if needed
4. Submit pull request with clear description

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: [UEP Agent Documentation](../README.md)
- **Issues**: Report issues in the main repository
- **Security**: Report security issues privately to security@uep-factory.com

---

**Template Version**: 1.0.0  
**UEP Protocol Version**: 2.0.0  
**Last Updated**: January 29, 2025