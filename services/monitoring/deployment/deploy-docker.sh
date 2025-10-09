#!/bin/bash

# Meta-Agent Factory Monitoring Stack Deployment Script
# Task 231.5 - Complete Docker deployment automation with validation
# Production-ready deployment with health checks and validation

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOYMENT_DIR="${SCRIPT_DIR}"
COMPOSE_FILE="${DEPLOYMENT_DIR}/docker-compose.monitoring.yml"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
        log_info "Cleaning up partial deployment..."
        docker-compose -f "${COMPOSE_FILE}" down --remove-orphans 2>/dev/null || true
    fi
    exit $exit_code
}

trap cleanup EXIT

# Pre-deployment checks
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        return 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    # Check available disk space (minimum 5GB)
    local available_space=$(df "${PROJECT_ROOT}" | awk 'NR==2 {print $4}')
    local min_space=5242880 # 5GB in KB
    
    if [[ $available_space -lt $min_space ]]; then
        log_error "Insufficient disk space. Need at least 5GB, have $(($available_space / 1024 / 1024))GB"
        return 1
    fi
    
    log_success "All prerequisites met"
}

# Environment setup
setup_environment() {
    log_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f "${PROJECT_ROOT}/.env" ]]; then
        log_info "Creating .env file from template..."
        cat > "${PROJECT_ROOT}/.env" << 'EOF'
# Meta-Agent Factory Monitoring Stack Environment Configuration

# Grafana Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123!
GRAFANA_SECRET_KEY=change-this-secret-key-in-production

# SMTP Configuration for Alerts
GF_SMTP_ENABLED=false
GF_SMTP_HOST=mail.company.com:587
GF_SMTP_USER=alerts@company.com
GF_SMTP_PASSWORD=your-smtp-password
GF_SMTP_FROM_ADDRESS=alerts@company.com
GF_SMTP_FROM_NAME=Meta-Agent Factory Alerts

# Alert Notification Configuration
SMTP_PASSWORD=your-smtp-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-integration-key

# Environment Settings
ENVIRONMENT=development
LOG_LEVEL=info
EOF
        log_warning "Created default .env file. Please update with your configuration!"
    fi
    
    # Source environment variables
    if [[ -f "${PROJECT_ROOT}/.env" ]]; then
        set -a
        source "${PROJECT_ROOT}/.env"
        set +a
        log_info "Loaded environment variables from .env"
    fi
}

# Directory setup
setup_directories() {
    log_info "Setting up data directories..."
    
    local data_dirs=(
        "${PROJECT_ROOT}/data/prometheus"
        "${PROJECT_ROOT}/data/alertmanager"
        "${PROJECT_ROOT}/data/loki"
        "${PROJECT_ROOT}/data/grafana"
        "${PROJECT_ROOT}/logs"
        "${DEPLOYMENT_DIR}/mock-metrics"
        "${DEPLOYMENT_DIR}/loki"
        "${DEPLOYMENT_DIR}/promtail"
        "${DEPLOYMENT_DIR}/alerting/templates"
    )
    
    for dir in "${data_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log_info "Created directory: $dir"
        fi
    done
    
    # Set proper permissions for Grafana
    if [[ -d "${PROJECT_ROOT}/data/grafana" ]]; then
        sudo chown -R 472:472 "${PROJECT_ROOT}/data/grafana" 2>/dev/null || {
            log_warning "Could not set Grafana permissions. You may need to run: sudo chown -R 472:472 ${PROJECT_ROOT}/data/grafana"
        }
    fi
    
    log_success "Directories configured"
}

# Configuration validation
validate_configuration() {
    log_info "Validating configuration files..."
    
    # Validate Docker Compose file
    if ! docker-compose -f "${COMPOSE_FILE}" config > /dev/null 2>&1; then
        log_error "Docker Compose file validation failed"
        return 1
    fi
    
    # Validate Prometheus configuration
    local prometheus_config="${DEPLOYMENT_DIR}/prometheus/prometheus.yml"
    if [[ -f "$prometheus_config" ]]; then
        if command -v promtool &> /dev/null; then
            if ! promtool check config "$prometheus_config" > /dev/null 2>&1; then
                log_error "Prometheus configuration validation failed"
                return 1
            fi
        else
            log_warning "promtool not available, skipping Prometheus config validation"
        fi
    fi
    
    # Validate alert rules
    local alert_rules="${PROJECT_ROOT}/alerting/meta-agent-factory-alerts.yaml"
    if [[ -f "$alert_rules" ]]; then
        if command -v promtool &> /dev/null; then
            if ! promtool check rules "$alert_rules" > /dev/null 2>&1; then
                log_error "Alert rules validation failed"
                return 1
            fi
        else
            log_warning "promtool not available, skipping alert rules validation"
        fi
    fi
    
    # Validate dashboard JSON files
    local dashboard_dirs=(
        "${PROJECT_ROOT}/dashboards/01-system-overview"
        "${PROJECT_ROOT}/dashboards/05-service-registry"
        "${PROJECT_ROOT}/dashboards/06-meta-monitoring"
    )
    
    for dir in "${dashboard_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            for json_file in "$dir"/*.json; do
                if [[ -f "$json_file" ]]; then
                    if ! python -m json.tool "$json_file" > /dev/null 2>&1; then
                        log_error "Invalid JSON in dashboard file: $json_file"
                        return 1
                    fi
                fi
            done
        fi
    done
    
    log_success "Configuration validation passed"
}

# Create mock metrics for testing
setup_mock_services() {
    log_info "Setting up mock services for testing..."
    
    # Create mock metrics endpoint
    cat > "${DEPLOYMENT_DIR}/mock-metrics/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name localhost;
        
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
        
        location /metrics {
            root /usr/share/nginx/html;
            index metrics.txt;
            add_header Content-Type text/plain;
        }
        
        location / {
            return 404;
        }
    }
}
EOF

    # Create mock Prometheus metrics
    cat > "${DEPLOYMENT_DIR}/mock-metrics/metrics.txt" << 'EOF'
# HELP meta_agent_factory_heartbeat Last heartbeat timestamp
# TYPE meta_agent_factory_heartbeat gauge
meta_agent_factory_heartbeat 1640995200

# HELP agent_coordination_success_rate Agent coordination success rate
# TYPE agent_coordination_success_rate gauge
agent_coordination_success_rate 0.95

# HELP uep_protocol_compliance_rate UEP protocol compliance rate
# TYPE uep_protocol_compliance_rate gauge
uep_protocol_compliance_rate 0.98

# HELP cpu_usage_percent CPU usage percentage
# TYPE cpu_usage_percent gauge
cpu_usage_percent 45.2

# HELP memory_usage_percent Memory usage percentage
# TYPE memory_usage_percent gauge
memory_usage_percent 67.8

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1250
http_requests_total{method="GET",status="404"} 23
http_requests_total{method="POST",status="200"} 890
http_requests_total{method="POST",status="500"} 5

# HELP agent_registration_total Total agent registrations
# TYPE agent_registration_total counter
agent_registration_total 47

# HELP agent_deregistration_total Total agent deregistrations
# TYPE agent_deregistration_total counter
agent_deregistration_total 3
EOF

    log_success "Mock services configured"
}

# Deployment execution
deploy_stack() {
    log_info "Deploying monitoring stack..."
    
    # Pull latest images
    log_info "Pulling Docker images..."
    docker-compose -f "${COMPOSE_FILE}" pull
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "${COMPOSE_FILE}" up -d
    
    log_success "Services started"
}

# Health checks
wait_for_services() {
    log_info "Waiting for services to become healthy..."
    
    local max_attempts=30
    local attempt=0
    local services=("prometheus:9090" "alertmanager:9093" "grafana:3000" "loki:3100")
    
    for service in "${services[@]}"; do
        local host_port="${service}"
        local host=$(echo "$host_port" | cut -d: -f1)
        local port=$(echo "$host_port" | cut -d: -f2)
        
        log_info "Checking $host:$port..."
        attempt=0
        
        while [[ $attempt -lt $max_attempts ]]; do
            if curl -s -f "http://localhost:$port/api/health" > /dev/null 2>&1 || \
               curl -s -f "http://localhost:$port/-/healthy" > /dev/null 2>&1 || \
               curl -s -f "http://localhost:$port/ready" > /dev/null 2>&1; then
                log_success "$host is healthy"
                break
            fi
            
            attempt=$((attempt + 1))
            log_info "Attempt $attempt/$max_attempts for $host..."
            sleep 10
        done
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "$host failed to become healthy"
            return 1
        fi
    done
    
    log_success "All services are healthy"
}

# Post-deployment validation
validate_deployment() {
    log_info "Validating deployment..."
    
    # Check container status
    local failed_containers=$(docker-compose -f "${COMPOSE_FILE}" ps --services --filter "status=exited")
    if [[ -n "$failed_containers" ]]; then
        log_error "Some containers have exited:"
        echo "$failed_containers"
        return 1
    fi
    
    # Test Prometheus targets
    log_info "Checking Prometheus targets..."
    local targets_response=$(curl -s "http://localhost:9090/api/v1/targets")
    if [[ ! "$targets_response" =~ "up" ]]; then
        log_warning "Some Prometheus targets may be down"
    fi
    
    # Test Grafana API
    log_info "Checking Grafana API..."
    if ! curl -s -f "http://localhost:3000/api/health" > /dev/null; then
        log_error "Grafana API not responding"
        return 1
    fi
    
    # Test Alertmanager
    log_info "Checking Alertmanager..."
    if ! curl -s -f "http://localhost:9093/-/healthy" > /dev/null; then
        log_error "Alertmanager not responding"
        return 1
    fi
    
    log_success "Deployment validation passed"
}

# Generate deployment report
generate_report() {
    log_info "Generating deployment report..."
    
    local report_file="${PROJECT_ROOT}/deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
Meta-Agent Factory Monitoring Stack Deployment Report
Generated: $(date)

=== DEPLOYMENT STATUS ===
Status: SUCCESS
Deployment Time: $(date)
Docker Compose File: ${COMPOSE_FILE}

=== SERVICE ENDPOINTS ===
Grafana Dashboard: http://localhost:3000
  - Username: ${GRAFANA_ADMIN_USER:-admin}
  - Password: ${GRAFANA_ADMIN_PASSWORD:-admin}

Prometheus: http://localhost:9090
Alertmanager: http://localhost:9093
Loki: http://localhost:3100

=== CONTAINER STATUS ===
$(docker-compose -f "${COMPOSE_FILE}" ps)

=== RESOURCE USAGE ===
Disk Usage: $(du -sh "${PROJECT_ROOT}/data" 2>/dev/null || echo "N/A")
Memory Usage: $(docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}")

=== NEXT STEPS ===
1. Access Grafana at http://localhost:3000
2. Change default admin password
3. Configure notification channels
4. Import additional dashboards as needed
5. Set up backup procedures for persistent data

=== TROUBLESHOOTING ===
- View logs: docker-compose -f ${COMPOSE_FILE} logs [service]
- Restart service: docker-compose -f ${COMPOSE_FILE} restart [service]
- Stop all: docker-compose -f ${COMPOSE_FILE} down
- Check health: ./validation/health-check.sh
EOF

    log_success "Deployment report saved to: $report_file"
}

# Main deployment workflow
main() {
    log_info "Starting Meta-Agent Factory Monitoring Stack deployment..."
    
    check_prerequisites
    setup_environment
    setup_directories
    setup_mock_services
    validate_configuration
    deploy_stack
    wait_for_services
    validate_deployment
    generate_report
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Access your monitoring stack at:"
    log_info "  📊 Grafana: http://localhost:3000"
    log_info "  📈 Prometheus: http://localhost:9090"
    log_info "  🚨 Alertmanager: http://localhost:9093"
    log_info ""
    log_info "Default Grafana credentials:"
    log_info "  Username: ${GRAFANA_ADMIN_USER:-admin}"
    log_info "  Password: ${GRAFANA_ADMIN_PASSWORD:-admin}"
    log_info ""
    log_warning "⚠️  Remember to change the default password!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi