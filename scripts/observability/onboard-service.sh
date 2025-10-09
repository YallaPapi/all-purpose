#!/bin/bash
# onboard-service.sh
# Automated service onboarding script for Meta-Agent Factory observability stack

set -euo pipefail

# Script metadata
SCRIPT_VERSION="1.0.0"
LOG_FILE="/tmp/service-onboarding-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OBSERVABILITY_DIR="$PROJECT_ROOT/containers/observability"
TEMPLATES_DIR="$PROJECT_ROOT/scripts/observability/templates"

# Logging function
log() {
    local level=$1
    shift
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

info() { log "${BLUE}INFO${NC}" "$@"; }
warn() { log "${YELLOW}WARN${NC}" "$@"; }
error() { log "${RED}ERROR${NC}" "$@"; }
success() { log "${GREEN}SUCCESS${NC}" "$@"; }

# Function to print banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          Meta-Agent Factory Service Onboarding              ║"
    echo "║                 Observability Integration                   ║"
    echo "║                    Version: $SCRIPT_VERSION                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to collect service information
collect_service_info() {
    info "Collecting service information..."
    
    # Service basic information
    echo "Please provide the following information about your service:"
    echo ""
    
    while [[ -z "${SERVICE_NAME:-}" ]]; do
        read -p "Service name (e.g., new-agent-service): " SERVICE_NAME
        if [[ ! "$SERVICE_NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
            error "Service name must contain only lowercase letters, numbers, and hyphens"
            SERVICE_NAME=""
        fi
    done
    
    while [[ -z "${SERVICE_TYPE:-}" ]]; do
        echo "Service type:"
        echo "  1) meta-agent      - Meta-agent service"
        echo "  2) domain-agent    - Domain-specific agent"
        echo "  3) core-service    - Core platform service"
        echo "  4) utility-service - Utility service"
        read -p "Select service type (1-4): " choice
        case $choice in
            1) SERVICE_TYPE="meta-agent" ;;
            2) SERVICE_TYPE="domain-agent" ;;
            3) SERVICE_TYPE="core-service" ;;
            4) SERVICE_TYPE="utility-service" ;;
            *) error "Invalid choice. Please select 1-4." ;;
        esac
    done
    
    while [[ -z "${TEAM_NAME:-}" ]]; do
        echo "Team responsible for this service:"
        echo "  1) platform-engineering"
        echo "  2) agent-development"
        echo "  3) devops"
        echo "  4) other"
        read -p "Select team (1-4): " choice
        case $choice in
            1) TEAM_NAME="platform-engineering" ;;
            2) TEAM_NAME="agent-development" ;;
            3) TEAM_NAME="devops" ;;
            4) 
                read -p "Enter team name: " TEAM_NAME
                if [[ ! "$TEAM_NAME" =~ ^[a-z0-9][a-z0-9-]*[a-z0-9]$ ]]; then
                    error "Team name must contain only lowercase letters, numbers, and hyphens"
                    TEAM_NAME=""
                fi
                ;;
            *) error "Invalid choice. Please select 1-4." ;;
        esac
    done
    
    while [[ -z "${SERVICE_PORT:-}" ]]; do
        read -p "Service port (default: 3000): " SERVICE_PORT
        SERVICE_PORT=${SERVICE_PORT:-3000}
        if [[ ! "$SERVICE_PORT" =~ ^[0-9]+$ ]] || [[ "$SERVICE_PORT" -lt 1 ]] || [[ "$SERVICE_PORT" -gt 65535 ]]; then
            error "Port must be a number between 1 and 65535"
            SERVICE_PORT=""
        fi
    done
    
    while [[ -z "${METRICS_PATH:-}" ]]; do
        read -p "Metrics endpoint path (default: /metrics): " METRICS_PATH
        METRICS_PATH=${METRICS_PATH:-/metrics}
        if [[ ! "$METRICS_PATH" =~ ^/.* ]]; then
            error "Metrics path must start with /"
            METRICS_PATH=""
        fi
    done
    
    while [[ -z "${SERVICE_TIER:-}" ]]; do
        echo "Service tier:"
        echo "  1) tier-1 - Critical services"
        echo "  2) tier-2 - Important services" 
        echo "  3) tier-3 - Standard services"
        read -p "Select service tier (1-3): " choice
        case $choice in
            1) SERVICE_TIER="tier-1" ;;
            2) SERVICE_TIER="tier-2" ;;
            3) SERVICE_TIER="tier-3" ;;
            *) error "Invalid choice. Please select 1-3." ;;
        esac
    done
    
    read -p "Service description (optional): " SERVICE_DESCRIPTION
    read -p "Service version (default: 1.0.0): " SERVICE_VERSION
    SERVICE_VERSION=${SERVICE_VERSION:-1.0.0}
    
    read -p "Enable health check endpoint? (y/n, default: y): " ENABLE_HEALTH
    ENABLE_HEALTH=${ENABLE_HEALTH:-y}
    
    if [[ "$ENABLE_HEALTH" =~ ^[Yy] ]]; then
        read -p "Health check endpoint path (default: /health): " HEALTH_PATH
        HEALTH_PATH=${HEALTH_PATH:-/health}
    fi
    
    # Agent-specific configuration
    if [[ "$SERVICE_TYPE" =~ agent ]]; then
        read -p "Agent capability (e.g., template-generation): " AGENT_CAPABILITY
        read -p "UEP protocol version (default: 1.2.0): " UEP_VERSION
        UEP_VERSION=${UEP_VERSION:-1.2.0}
    fi
    
    success "Service information collected!"
}

# Function to create service configuration templates
create_service_templates() {
    info "Creating service configuration templates..."
    
    local service_dir="$PROJECT_ROOT/containers/$SERVICE_NAME"
    mkdir -p "$service_dir/src/middleware"
    mkdir -p "$service_dir/config"
    
    # Create package.json template
    cat > "$service_dir/package.json" << EOF
{
  "name": "$SERVICE_NAME",
  "version": "$SERVICE_VERSION",
  "description": "${SERVICE_DESCRIPTION:-$SERVICE_NAME service}",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "lint": "eslint src/",
    "metrics": "node src/metrics-test.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "prom-client": "^15.1.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    "@opentelemetry/exporter-otlp-http": "^0.45.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "eslint": "^8.55.0"
  },
  "keywords": ["meta-agent", "observability", "$SERVICE_TYPE"],
  "author": "$TEAM_NAME",
  "license": "MIT"
}
EOF
    
    # Create basic Express server with observability
    cat > "$service_dir/src/index.js" << EOF
const express = require('express');
const { register } = require('prom-client');
const { trace } = require('@opentelemetry/api');

// Import observability middleware
const { initializeTracing } = require('./middleware/tracing');
const { metricsMiddleware } = require('./middleware/metrics');
const { loggingMiddleware } = require('./middleware/logging');

// Initialize OpenTelemetry tracing
initializeTracing('$SERVICE_NAME', '$SERVICE_VERSION');

const app = express();
const port = process.env.PORT || $SERVICE_PORT;

// Global middleware
app.use(express.json());
app.use(loggingMiddleware);
app.use(metricsMiddleware);

// Health check endpoint
app.get('${HEALTH_PATH:-/health}', (req, res) => {
  res.json({
    status: 'healthy',
    service: '$SERVICE_NAME',
    version: '$SERVICE_VERSION',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint
app.get('$METRICS_PATH', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Service-specific routes
app.get('/', (req, res) => {
  res.json({
    service: '$SERVICE_NAME',
    type: '$SERVICE_TYPE',
    version: '$SERVICE_VERSION',
    team: '$TEAM_NAME',
    tier: '$SERVICE_TIER'
  });
});

EOF

    # Add agent-specific routes if applicable
    if [[ "$SERVICE_TYPE" =~ agent ]]; then
        cat >> "$service_dir/src/index.js" << EOF
// Agent capability endpoint
app.post('/capability', (req, res) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes({
      'agent.type': '$SERVICE_NAME',
      'agent.capability': '$AGENT_CAPABILITY',
      'uep.protocol_version': '$UEP_VERSION'
    });
  }
  
  // TODO: Implement capability logic
  res.json({
    capability: '$AGENT_CAPABILITY',
    status: 'available',
    version: '$UEP_VERSION'
  });
});

EOF
    fi
    
    cat >> "$service_dir/src/index.js" << EOF
// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(\`$SERVICE_NAME listening on port \${port}\`);
  console.log(\`Health check: http://localhost:\${port}${HEALTH_PATH:-/health}\`);
  console.log(\`Metrics: http://localhost:\${port}$METRICS_PATH\`);
});

module.exports = app;
EOF
    
    success "Created basic service template in $service_dir"
}

# Function to create observability middleware
create_observability_middleware() {
    info "Creating observability middleware..."
    
    local service_dir="$PROJECT_ROOT/containers/$SERVICE_NAME"
    
    # Create tracing middleware
    cat > "$service_dir/src/middleware/tracing.js" << EOF
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

function initializeTracing(serviceName, serviceVersion) {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'meta-agent-factory',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    
    // Business context
    'business.team': '$TEAM_NAME',
    'business.tier': '$SERVICE_TIER',
    'service.type': '$SERVICE_TYPE',
    
    // Build information
    'build.version': serviceVersion,
    'build.commit': process.env.BUILD_COMMIT || 'unknown',
    
    // Container context
    'container.name': process.env.HOSTNAME || 'unknown',
    'container.id': process.env.CONTAINER_ID || 'unknown'
  });

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces'
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false // Disable file system instrumentation for performance
      }
    })]
  });

  sdk.start();
  console.log('OpenTelemetry tracing initialized for', serviceName);
}

module.exports = { initializeTracing };
EOF
    
    # Create metrics middleware
    cat > "$service_dir/src/middleware/metrics.js" << EOF
const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Set default labels
register.setDefaultLabels({
  service: '$SERVICE_NAME',
  version: '$SERVICE_VERSION',
  environment: process.env.NODE_ENV || 'development',
  team: '$TEAM_NAME',
  tier: '$SERVICE_TIER',
  type: '$SERVICE_TYPE'
});

// HTTP request metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

EOF

    # Add agent-specific metrics if applicable
    if [[ "$SERVICE_TYPE" =~ agent ]]; then
        cat >> "$service_dir/src/middleware/metrics.js" << EOF
// Agent-specific metrics
const agentOperations = new client.Counter({
  name: 'agent_operations_total',
  help: 'Total number of agent operations',
  labelNames: ['capability', 'status']
});

const agentResponseTime = new client.Histogram({
  name: 'agent_response_time_seconds',
  help: 'Agent operation response time',
  labelNames: ['capability'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

register.registerMetric(agentOperations);
register.registerMetric(agentResponseTime);

EOF
    fi
    
    cat >> "$service_dir/src/middleware/metrics.js" << EOF
// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });
  
  next();
};

module.exports = { 
  metricsMiddleware,
  register: register
};
EOF
    
    # Create logging middleware
    cat > "$service_dir/src/middleware/logging.js" << EOF
const { trace } = require('@opentelemetry/api');

const loggingMiddleware = (req, res, next) => {
  const start = Date.now();
  const span = trace.getActiveSpan();
  
  // Enhanced request context
  const requestContext = {
    timestamp: new Date().toISOString(),
    service: '$SERVICE_NAME',
    version: '$SERVICE_VERSION',
    team: '$TEAM_NAME',
    tier: '$SERVICE_TIER',
    type: '$SERVICE_TYPE',
    method: req.method,
    path: req.path,
    user_agent: req.get('User-Agent'),
    request_id: req.headers['x-request-id'] || generateRequestId(),
    trace_id: span?.spanContext().traceId,
    span_id: span?.spanContext().spanId
  };
  
  // Add context to request object
  req.logContext = requestContext;
  
  // Log request
  console.log(JSON.stringify({
    ...requestContext,
    level: 'INFO',
    message: \`\${req.method} \${req.path} - Request started\`,
    event: 'request_start'
  }));
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      ...requestContext,
      level: 'INFO',
      message: \`\${req.method} \${req.path} - \${res.statusCode} (\${duration}ms)\`,
      event: 'request_complete',
      status_code: res.statusCode,
      duration_ms: duration
    }));
  });
  
  next();
};

function generateRequestId() {
  return \`req_\${Date.now()}_\${Math.random().toString(36).substring(2, 8)}\`;
}

module.exports = { loggingMiddleware };
EOF
    
    success "Created observability middleware!"
}

# Function to create Dockerfile
create_dockerfile() {
    info "Creating Dockerfile..."
    
    local service_dir="$PROJECT_ROOT/containers/$SERVICE_NAME"
    
    cat > "$service_dir/Dockerfile" << EOF
FROM node:22-alpine

# Set metadata labels
LABEL meta-agent-factory.service.name="$SERVICE_NAME" \\
      meta-agent-factory.service.type="$SERVICE_TYPE" \\
      meta-agent-factory.service.tier="$SERVICE_TIER" \\
      meta-agent-factory.team="$TEAM_NAME" \\
      meta-agent-factory.version="$SERVICE_VERSION" \\
      prometheus.scrape="true" \\
      prometheus.port="$SERVICE_PORT" \\
      prometheus.path="$METRICS_PATH"

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Expose port
EXPOSE $SERVICE_PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:$SERVICE_PORT${HEALTH_PATH:-/health} || exit 1

# Start the application
CMD ["npm", "start"]
EOF
    
    success "Created Dockerfile!"
}

# Function to update Prometheus configuration
update_prometheus_config() {
    info "Updating Prometheus configuration..."
    
    local prometheus_config="$OBSERVABILITY_DIR/prometheus-enhanced.yml"
    local temp_config="/tmp/prometheus-enhanced-temp.yml"
    
    # Backup original config
    cp "$prometheus_config" "$prometheus_config.backup"
    
    # Create new scrape job
    local scrape_job=$(cat << EOF

  # $SERVICE_NAME service
  - job_name: '$SERVICE_NAME'
    static_configs:
      - targets: ['$SERVICE_NAME:$SERVICE_PORT']
    metrics_path: '$METRICS_PATH'
    scrape_interval: 30s
    relabel_configs:
      - source_labels: [__meta_docker_container_label_meta_agent_factory_service_tier]
        target_label: service_tier
      - source_labels: [__meta_docker_container_label_meta_agent_factory_team]
        target_label: team
      - source_labels: [__meta_docker_container_label_meta_agent_factory_version]
        target_label: version
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: '${SERVICE_NAME}_(.*)'
        target_label: 'component'
        replacement: '$SERVICE_TYPE'
EOF
)
    
    # Add scrape job to prometheus config
    if grep -q "scrape_configs:" "$prometheus_config"; then
        sed '/scrape_configs:/a\'"$scrape_job" "$prometheus_config" > "$temp_config"
        mv "$temp_config" "$prometheus_config"
        success "Added $SERVICE_NAME to Prometheus scrape configuration"
    else
        error "Could not find scrape_configs section in Prometheus configuration"
        return 1
    fi
}

# Function to create alert rules
create_alert_rules() {
    info "Creating alert rules for $SERVICE_NAME..."
    
    local alert_rules_file="$OBSERVABILITY_DIR/alert_rules_${SERVICE_NAME}.yml"
    
    cat > "$alert_rules_file" << EOF
groups:
  - name: ${SERVICE_NAME}_alerts
    rules:
      # Service down alert
      - alert: ${SERVICE_NAME^}ServiceDown
        expr: up{job="$SERVICE_NAME"} == 0
        for: 30s
        labels:
          severity: critical
          team: $TEAM_NAME
          service: $SERVICE_NAME
          tier: $SERVICE_TIER
        annotations:
          summary: "$SERVICE_NAME service is down"
          description: |
            $SERVICE_NAME service has been down for 30 seconds.
            
            Service Details:
            - Type: $SERVICE_TYPE
            - Team: $TEAM_NAME  
            - Tier: $SERVICE_TIER
            - Port: $SERVICE_PORT
          runbook_url: "https://runbooks.meta-agent-factory.com/$TEAM_NAME/$SERVICE_NAME"

      # High error rate alert
      - alert: ${SERVICE_NAME^}HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{job="$SERVICE_NAME",status_code=~"5.."}[5m])) /
            sum(rate(http_requests_total{job="$SERVICE_NAME"}[5m]))
          ) * 100 > 5
        for: 2m
        labels:
          severity: warning
          team: $TEAM_NAME
          service: $SERVICE_NAME
          tier: $SERVICE_TIER
        annotations:
          summary: "High error rate for $SERVICE_NAME"
          description: |
            $SERVICE_NAME is experiencing {{ \$value | printf "%.1f" }}% error rate.
            
            This exceeds the 5% threshold for $SERVICE_TIER services.

      # High response time alert
      - alert: ${SERVICE_NAME^}HighResponseTime
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket{job="$SERVICE_NAME"}[5m])) by (le)
          ) > 1
        for: 5m
        labels:
          severity: warning
          team: $TEAM_NAME
          service: $SERVICE_NAME
          tier: $SERVICE_TIER
        annotations:
          summary: "High response time for $SERVICE_NAME"
          description: |
            $SERVICE_NAME 95th percentile response time is {{ \$value | printf "%.2f" }}s.
            
            This exceeds the 1s threshold for acceptable performance.
EOF

    # Add agent-specific alerts if applicable
    if [[ "$SERVICE_TYPE" =~ agent ]]; then
        cat >> "$alert_rules_file" << EOF

      # Agent capability failure alert
      - alert: ${SERVICE_NAME^}CapabilityFailure
        expr: |
          rate(agent_operations_total{job="$SERVICE_NAME",status="error"}[5m]) > 0.1
        for: 1m
        labels:
          severity: warning
          team: $TEAM_NAME
          service: $SERVICE_NAME
          capability: $AGENT_CAPABILITY
        annotations:
          summary: "$SERVICE_NAME agent capability failures"
          description: |
            $SERVICE_NAME agent is experiencing capability failures at {{ \$value | printf "%.2f" }} failures/minute.
            
            Capability: $AGENT_CAPABILITY
            UEP Version: $UEP_VERSION
EOF
    fi
    
    success "Created alert rules in $alert_rules_file"
}

# Function to add service to Docker Compose
add_to_docker_compose() {
    info "Adding $SERVICE_NAME to Docker Compose configuration..."
    
    local compose_file="$PROJECT_ROOT/docker-compose.yml"
    local logging_compose="$PROJECT_ROOT/docker-compose.logging.yml"
    
    # Check if main docker-compose.yml exists
    if [ ! -f "$compose_file" ]; then
        warn "Main docker-compose.yml not found, creating basic structure..."
        cat > "$compose_file" << EOF
version: '3.8'

services:
  # Existing services will be here
  
networks:
  meta-agent-factory:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  tempo_data:
EOF
    fi
    
    # Create service definition
    local service_definition=$(cat << EOF

  $SERVICE_NAME:
    build:
      context: ./containers/$SERVICE_NAME
      dockerfile: Dockerfile
    container_name: meta-agent-factory-$SERVICE_NAME
    environment:
      - NODE_ENV=\${NODE_ENV:-development}
      - PORT=$SERVICE_PORT
      - SERVICE_NAME=$SERVICE_NAME
      - SERVICE_VERSION=$SERVICE_VERSION
      - SERVICE_TYPE=$SERVICE_TYPE
      - TEAM=$TEAM_NAME
      - SERVICE_TIER=$SERVICE_TIER
      - DEPLOYMENT_ENVIRONMENT=\${DEPLOYMENT_ENVIRONMENT:-development}
      - BUILD_COMMIT=\${BUILD_COMMIT:-unknown}
      - OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces
      - OTEL_RESOURCE_ATTRIBUTES=service.name=$SERVICE_NAME,service.version=$SERVICE_VERSION
    ports:
      - "$SERVICE_PORT:$SERVICE_PORT"
    networks:
      - meta-agent-factory
    depends_on:
      - observability
    labels:
      - "meta-agent-factory.service.name=$SERVICE_NAME"
      - "meta-agent-factory.service.type=$SERVICE_TYPE"
      - "meta-agent-factory.team=$TEAM_NAME"
      - "meta-agent-factory.tier=$SERVICE_TIER"
      - "prometheus.scrape=true"
      - "prometheus.port=$SERVICE_PORT"
      - "prometheus.path=$METRICS_PATH"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:$SERVICE_PORT${HEALTH_PATH:-/health}"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped
EOF
)
    
    # Add service to main compose file
    echo "$service_definition" >> "$compose_file"
    
    success "Added $SERVICE_NAME to Docker Compose configuration"
}

# Function to create service documentation
create_service_documentation() {
    info "Creating service documentation..."
    
    local service_dir="$PROJECT_ROOT/containers/$SERVICE_NAME"
    
    cat > "$service_dir/README.md" << EOF
# $SERVICE_NAME

${SERVICE_DESCRIPTION:-$SERVICE_NAME service for Meta-Agent Factory}

## Service Information

- **Name**: $SERVICE_NAME
- **Type**: $SERVICE_TYPE
- **Version**: $SERVICE_VERSION
- **Team**: $TEAM_NAME
- **Tier**: $SERVICE_TIER
- **Port**: $SERVICE_PORT

$(if [[ "$SERVICE_TYPE" =~ agent ]]; then
echo "## Agent Information

- **Capability**: $AGENT_CAPABILITY
- **UEP Protocol Version**: $UEP_VERSION"
fi)

## Endpoints

- **Health Check**: \`GET ${HEALTH_PATH:-/health}\`
- **Metrics**: \`GET $METRICS_PATH\`
- **Service Info**: \`GET /\`
$(if [[ "$SERVICE_TYPE" =~ agent ]]; then
echo "- **Agent Capability**: \`POST /capability\`"
fi)

## Development

### Prerequisites

- Node.js 22+
- Docker
- Docker Compose

### Setup

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Check metrics
npm run metrics
\`\`\`

### Docker

\`\`\`bash
# Build image
docker build -t $SERVICE_NAME .

# Run container
docker run -p $SERVICE_PORT:$SERVICE_PORT $SERVICE_NAME
\`\`\`

### Docker Compose

\`\`\`bash
# Start with observability stack
docker-compose up -d $SERVICE_NAME

# View logs
docker-compose logs -f $SERVICE_NAME

# Stop service
docker-compose stop $SERVICE_NAME
\`\`\`

## Observability

### Metrics

The service exposes Prometheus metrics at \`$METRICS_PATH\`:

- \`http_requests_total\` - Total HTTP requests
- \`http_request_duration_seconds\` - Request duration histogram
$(if [[ "$SERVICE_TYPE" =~ agent ]]; then
echo "- \`agent_operations_total\` - Total agent operations
- \`agent_response_time_seconds\` - Agent response time histogram"
fi)

### Logging

Structured JSON logging with OpenTelemetry trace correlation:

\`\`\`json
{
  "timestamp": "2025-01-28T10:30:00.000Z",
  "level": "INFO",
  "service": "$SERVICE_NAME",
  "version": "$SERVICE_VERSION",
  "team": "$TEAM_NAME",
  "tier": "$SERVICE_TIER",
  "trace_id": "abc123...",
  "span_id": "def456...",
  "message": "Request completed"
}
\`\`\`

### Tracing

OpenTelemetry distributed tracing with automatic instrumentation for:

- HTTP requests/responses
- Database operations
- External API calls
$(if [[ "$SERVICE_TYPE" =~ agent ]]; then
echo "- Agent capability operations"
fi)

### Alerts

Configured alerts in Prometheus/Alertmanager:

- Service down (critical)
- High error rate >5% (warning)
- High response time >1s (warning)
$(if [[ "$SERVICE_TYPE" =~ agent ]]; then
echo "- Agent capability failures (warning)"
fi)

## Monitoring Dashboards

- **Grafana Dashboard**: http://localhost:3004
- **Prometheus**: http://localhost:9090
- **Service Metrics**: http://localhost:9090/graph?g0.expr=up{job="$SERVICE_NAME"}

## Support

- **Team**: $TEAM_NAME
- **Runbook**: https://runbooks.meta-agent-factory.com/$TEAM_NAME/$SERVICE_NAME
- **Alerts**: Slack #team-$TEAM_NAME

## License

MIT
EOF
    
    success "Created service documentation"
}

# Function to validate service onboarding
validate_onboarding() {
    info "Validating service onboarding..."
    
    local service_dir="$PROJECT_ROOT/containers/$SERVICE_NAME"
    local validation_errors=()
    
    # Check required files
    local required_files=(
        "$service_dir/package.json"
        "$service_dir/Dockerfile"
        "$service_dir/src/index.js"
        "$service_dir/src/middleware/tracing.js"
        "$service_dir/src/middleware/metrics.js"
        "$service_dir/src/middleware/logging.js"
        "$service_dir/README.md"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            validation_errors+=("Missing file: $file")
        fi
    done
    
    # Check Prometheus configuration
    if ! grep -q "$SERVICE_NAME" "$OBSERVABILITY_DIR/prometheus-enhanced.yml"; then
        validation_errors+=("Service not added to Prometheus configuration")
    fi
    
    # Check alert rules
    if [ ! -f "$OBSERVABILITY_DIR/alert_rules_${SERVICE_NAME}.yml" ]; then
        validation_errors+=("Alert rules not created")
    fi
    
    # Check Docker Compose
    if ! grep -q "$SERVICE_NAME:" "$PROJECT_ROOT/docker-compose.yml"; then
        validation_errors+=("Service not added to Docker Compose")
    fi
    
    if [ ${#validation_errors[@]} -eq 0 ]; then
        success "Service onboarding validation passed!"
        return 0
    else
        error "Service onboarding validation failed:"
        for error in "${validation_errors[@]}"; do
            error "  - $error"
        done
        return 1
    fi
}

# Function to print onboarding summary
print_onboarding_summary() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                  ONBOARDING SUCCESSFUL                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "🎉 Service '$SERVICE_NAME' has been successfully onboarded!"
    echo ""
    echo "📁 Created Files:"
    echo "   • Service code:         containers/$SERVICE_NAME/src/"
    echo "   • Dockerfile:           containers/$SERVICE_NAME/Dockerfile"
    echo "   • Package.json:         containers/$SERVICE_NAME/package.json"
    echo "   • Documentation:        containers/$SERVICE_NAME/README.md"
    echo "   • Alert rules:          containers/observability/alert_rules_${SERVICE_NAME}.yml"
    echo ""
    echo "⚙️ Updated Configurations:"
    echo "   • Prometheus scraping:  containers/observability/prometheus-enhanced.yml"
    echo "   • Docker Compose:       docker-compose.yml"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Build and test the service:"
    echo "      cd containers/$SERVICE_NAME && npm install && npm run dev"
    echo ""
    echo "   2. Start with observability stack:"
    echo "      docker-compose up -d $SERVICE_NAME"
    echo ""
    echo "   3. Verify metrics collection:"
    echo "      curl http://localhost:$SERVICE_PORT$METRICS_PATH"
    echo ""
    echo "   4. Check service health:"
    echo "      curl http://localhost:$SERVICE_PORT${HEALTH_PATH:-/health}"
    echo ""
    echo "📊 Monitoring URLs:"
    echo "   • Service metrics:      http://localhost:$SERVICE_PORT$METRICS_PATH"
    echo "   • Health check:         http://localhost:$SERVICE_PORT${HEALTH_PATH:-/health}"
    echo "   • Prometheus targets:   http://localhost:9090/targets"
    echo "   • Grafana dashboards:   http://localhost:3004"
    echo ""
    success "Service onboarding completed successfully!"
}

# Main function
main() {
    print_banner
    
    info "Starting service onboarding process..."
    info "Log file: $LOG_FILE"
    
    # Collect service information
    collect_service_info
    
    # Create service templates and configuration
    create_service_templates
    create_observability_middleware
    create_dockerfile
    create_service_documentation
    
    # Update observability configuration
    update_prometheus_config
    create_alert_rules
    add_to_docker_compose
    
    # Validate onboarding
    if validate_onboarding; then
        print_onboarding_summary
    else
        error "Service onboarding failed validation. Please check the errors above."
        exit 1
    fi
}

# Handle command line arguments
case "${1:-onboard}" in
    "onboard")
        main
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  onboard      Onboard a new service to the observability stack (default)"
        echo "  help         Show this help message"
        echo ""
        echo "This script will guide you through onboarding a new service to the"
        echo "Meta-Agent Factory observability stack, including:"
        echo "  • Service template creation"
        echo "  • Observability middleware setup"
        echo "  • Prometheus configuration"
        echo "  • Alert rule creation"
        echo "  • Docker Compose integration"
        echo "  • Documentation generation"
        ;;
    *)
        error "Unknown command: $1"
        error "Use '$0 help' to see available commands"
        exit 1
        ;;
esac