#!/bin/bash
# deploy-observability-stack.sh
# Automated deployment script for complete Meta-Agent Factory observability stack

set -euo pipefail

# Script metadata
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="Meta-Agent Factory Observability Stack Deployment"
LOG_FILE="/tmp/observability-deploy-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Banner
print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          Meta-Agent Factory Observability Stack             ║"
    echo "║              Automated Deployment Script                    ║"
    echo "║                    Version: $SCRIPT_VERSION                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OBSERVABILITY_DIR="$PROJECT_ROOT/containers/observability"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.logging.yml"
CONFIGS_DIR="$OBSERVABILITY_DIR"

# Default environment variables
DEFAULT_ENVIRONMENT="development"
DEFAULT_CLUSTER_NAME="meta-agent-factory"
DEFAULT_REGION="us-west-2"

# Function to check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing_tools+=("docker-compose")
    command -v jq >/dev/null 2>&1 || missing_tools+=("jq")
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        error "Please install the missing tools and try again."
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    
    success "All prerequisites met!"
}

# Function to setup environment variables
setup_environment() {
    info "Setting up environment variables..."
    
    # Create .env file if it doesn't exist
    local env_file="$PROJECT_ROOT/.env.observability"
    
    if [ ! -f "$env_file" ]; then
        info "Creating observability environment file..."
        cat > "$env_file" << EOF
# Meta-Agent Factory Observability Configuration
# Generated on $(date)

# Core Infrastructure
DEPLOYMENT_ENVIRONMENT=${DEPLOYMENT_ENVIRONMENT:-$DEFAULT_ENVIRONMENT}
DEPLOYMENT_CLUSTER=${DEPLOYMENT_CLUSTER:-$DEFAULT_CLUSTER_NAME}
DEPLOYMENT_REGION=${DEPLOYMENT_REGION:-$DEFAULT_REGION}
SERVICE_NAMESPACE=meta-agent-factory

# Build Information
BUILD_VERSION=${BUILD_VERSION:-1.0.0}
BUILD_COMMIT=${BUILD_COMMIT:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Team and Business Context
TEAM=platform-engineering
BUSINESS_UNIT=product-development
COST_CENTER=engineering
SERVICE_TIER=tier-1

# Observability Stack Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin123}
PROMETHEUS_RETENTION=${PROMETHEUS_RETENTION:-15d}
LOKI_RETENTION=${LOKI_RETENTION:-720h}
TEMPO_RETENTION=${TEMPO_RETENTION:-168h}

# Alert Configuration
ALERT_EMAIL_FROM=${ALERT_EMAIL_FROM:-alerts@meta-agent-factory.com}
SMTP_HOST=${SMTP_HOST:-smtp.gmail.com:587}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-}
PAGERDUTY_INTEGRATION_KEY=${PAGERDUTY_INTEGRATION_KEY:-}

# External URLs
EXTERNAL_PROMETHEUS_URL=${EXTERNAL_PROMETHEUS_URL:-http://localhost:9090}
EXTERNAL_GRAFANA_URL=${EXTERNAL_GRAFANA_URL:-http://localhost:3004}
EXTERNAL_ALERTMANAGER_URL=${EXTERNAL_ALERTMANAGER_URL:-http://localhost:9093}

# Feature Flags
ENABLE_JAEGER_UI=${ENABLE_JAEGER_UI:-true}
ENABLE_TRACE_SAMPLING=${ENABLE_TRACE_SAMPLING:-true}
ENABLE_ALERT_ROUTING=${ENABLE_ALERT_ROUTING:-true}

EOF
        success "Created observability environment file: $env_file"
    else
        info "Using existing environment file: $env_file"
    fi
    
    # Source the environment file
    set -a  # Automatically export all variables
    source "$env_file"
    set +a
    
    success "Environment variables configured!"
}

# Function to validate configuration files
validate_configurations() {
    info "Validating observability configuration files..."
    
    local config_files=(
        "$CONFIGS_DIR/prometheus-enhanced.yml"
        "$CONFIGS_DIR/loki.yml"
        "$CONFIGS_DIR/tempo.yml"
        "$CONFIGS_DIR/alertmanager.yml"
        "$CONFIGS_DIR/otel-collector.yml"
        "$CONFIGS_DIR/grafana-datasources.yml"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ ! -f "$config_file" ]; then
            error "Configuration file not found: $config_file"
            return 1
        fi
        
        # Basic YAML validation
        if command -v yq >/dev/null 2>&1; then
            if ! yq eval . "$config_file" >/dev/null 2>&1; then
                error "Invalid YAML syntax in: $config_file"
                return 1
            fi
        fi
        
        info "✓ Validated: $(basename "$config_file")"
    done
    
    success "All configuration files validated!"
}

# Function to create necessary directories
create_directories() {
    info "Creating necessary directories..."
    
    local directories=(
        "$PROJECT_ROOT/data/prometheus"
        "$PROJECT_ROOT/data/grafana"
        "$PROJECT_ROOT/data/loki"
        "$PROJECT_ROOT/data/tempo"
        "$PROJECT_ROOT/data/alertmanager"
        "$PROJECT_ROOT/logs/observability"
        "$PROJECT_ROOT/backups/observability"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            info "Created directory: $dir"
        fi
        
        # Set appropriate permissions
        chmod 755 "$dir"
    done
    
    success "Directories created and configured!"
}

# Function to deploy observability stack
deploy_stack() {
    info "Deploying observability stack..."
    
    # Pull latest images
    info "Pulling latest container images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Stop existing containers if running
    info "Stopping existing observability containers..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true
    
    # Start the observability stack
    info "Starting observability stack..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    wait_for_services
    
    success "Observability stack deployed successfully!"
}

# Function to wait for services to be ready
wait_for_services() {
    info "Waiting for services to be ready..."
    
    local services=(
        "http://localhost:9090/-/ready:Prometheus"
        "http://localhost:3004/api/health:Grafana"
        "http://localhost:3100/ready:Loki"
        "http://localhost:3200/ready:Tempo"
        "http://localhost:9093/-/ready:Alertmanager"
    )
    
    local max_attempts=30
    local attempt=0
    
    for service in "${services[@]}"; do
        local url="${service%:*}"
        local name="${service#*:}"
        
        attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s -f "$url" >/dev/null 2>&1; then
                success "✓ $name is ready"
                break
            fi
            
            attempt=$((attempt + 1))
            if [ $attempt -eq $max_attempts ]; then
                error "✗ $name failed to start after $max_attempts attempts"
                return 1
            fi
            
            info "Waiting for $name... (attempt $attempt/$max_attempts)"
            sleep 10
        done
    done
    
    success "All services are ready!"
}

# Function to configure Grafana dashboards
configure_grafana() {
    info "Configuring Grafana dashboards..."
    
    local grafana_url="http://localhost:3004"
    local dashboard_dir="$OBSERVABILITY_DIR"
    
    # Wait for Grafana to be fully ready
    sleep 30
    
    # Import dashboards
    local dashboards=(
        "grafana-dashboard-system-overview.json"
        "grafana-dashboard-service-health.json"
        "grafana-dashboard-agent-coordination.json"
        "grafana-dashboard-logs.json"
    )
    
    for dashboard in "${dashboards[@]}"; do
        local dashboard_file="$dashboard_dir/$dashboard"
        
        if [ -f "$dashboard_file" ]; then
            info "Importing dashboard: $dashboard"
            
            # Create the dashboard import payload
            local import_payload=$(jq -n \
                --slurpfile dashboard "$dashboard_file" \
                '{
                    dashboard: $dashboard[0],
                    overwrite: true,
                    inputs: [
                        {
                            name: "DS_PROMETHEUS",
                            type: "datasource",
                            pluginId: "prometheus",
                            value: "Prometheus"
                        },
                        {
                            name: "DS_LOKI",
                            type: "datasource", 
                            pluginId: "loki",
                            value: "Loki"
                        }
                    ]
                }')
            
            # Import dashboard via API
            local response=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -d "$import_payload" \
                "$grafana_url/api/dashboards/import" \
                -u "admin:${GRAFANA_ADMIN_PASSWORD}")
            
            if echo "$response" | jq -e '.id' >/dev/null 2>&1; then
                success "✓ Dashboard imported: $dashboard"
            else
                warn "⚠ Failed to import dashboard: $dashboard"
                info "Response: $response"
            fi
        else
            warn "Dashboard file not found: $dashboard_file"
        fi
    done
    
    success "Grafana configuration completed!"
}

# Function to run health checks
run_health_checks() {
    info "Running comprehensive health checks..."
    
    local health_check_script="$PROJECT_ROOT/scripts/observability/health-check.sh"
    
    if [ -f "$health_check_script" ]; then
        bash "$health_check_script"
    else
        # Basic health checks
        info "Running basic health checks..."
        
        # Check Prometheus targets
        local prometheus_targets=$(curl -s "http://localhost:9090/api/v1/targets" | jq -r '.data.activeTargets | length')
        info "Prometheus active targets: $prometheus_targets"
        
        # Check Grafana datasources
        local grafana_datasources=$(curl -s -u "admin:${GRAFANA_ADMIN_PASSWORD}" "http://localhost:3004/api/datasources" | jq -r 'length')
        info "Grafana datasources: $grafana_datasources"
        
        # Check Loki labels
        local loki_labels=$(curl -s "http://localhost:3100/loki/api/v1/labels" | jq -r '.data | length')
        info "Loki labels: $loki_labels"
        
        success "Basic health checks completed!"
    fi
}

# Function to print deployment summary
print_deployment_summary() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    DEPLOYMENT SUCCESSFUL                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo "📊 Observability Stack Access URLs:"
    echo "   • Grafana Dashboard:    http://localhost:3004 (admin/${GRAFANA_ADMIN_PASSWORD})"
    echo "   • Prometheus:           http://localhost:9090"
    echo "   • Alertmanager:         http://localhost:9093"
    echo "   • Loki:                 http://localhost:3100"
    echo "   • Tempo:                http://localhost:3200"
    echo "   • Jaeger UI:            http://localhost:16686"
    echo ""
    echo "📋 Quick Commands:"
    echo "   • View logs:            docker-compose -f $COMPOSE_FILE logs -f"
    echo "   • Check status:         docker-compose -f $COMPOSE_FILE ps"
    echo "   • Stop stack:           docker-compose -f $COMPOSE_FILE down"
    echo "   • Health check:         bash $PROJECT_ROOT/scripts/observability/health-check.sh"
    echo ""
    echo "📖 Documentation:"
    echo "   • Configuration:        $OBSERVABILITY_DIR/"
    echo "   • Deployment logs:      $LOG_FILE"
    echo "   • Environment config:   $PROJECT_ROOT/.env.observability"
    echo ""
    success "Meta-Agent Factory Observability Stack is ready for monitoring!"
}

# Function to handle cleanup on script exit
cleanup() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        error "Deployment failed with exit code $exit_code"
        error "Check the deployment log: $LOG_FILE"
        echo ""
        echo "🔧 Troubleshooting steps:"
        echo "   1. Check Docker daemon status: docker info"
        echo "   2. Verify configuration files in: $OBSERVABILITY_DIR"
        echo "   3. Check port availability: netstat -tulpn | grep -E ':9090|:3004|:3100|:3200|:9093'"
        echo "   4. Review deployment logs: cat $LOG_FILE"
    fi
}

# Main deployment function
main() {
    print_banner
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    info "Starting observability stack deployment..."
    info "Log file: $LOG_FILE"
    
    # Execute deployment steps
    check_prerequisites
    setup_environment
    validate_configurations
    create_directories
    deploy_stack
    configure_grafana
    run_health_checks
    
    print_deployment_summary
}

# Command line argument handling
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "health-check")
        run_health_checks
        ;;
    "stop")
        info "Stopping observability stack..."
        docker-compose -f "$COMPOSE_FILE" down
        success "Observability stack stopped!"
        ;;
    "restart")
        info "Restarting observability stack..."
        docker-compose -f "$COMPOSE_FILE" down
        docker-compose -f "$COMPOSE_FILE" up -d
        wait_for_services
        success "Observability stack restarted!"
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy       Deploy the complete observability stack (default)"
        echo "  health-check Run health checks on the deployed stack"
        echo "  stop         Stop the observability stack"
        echo "  restart      Restart the observability stack"
        echo "  logs [service] Show logs for all services or specific service"
        echo "  help         Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy the stack"
        echo "  $0 deploy            # Deploy the stack"
        echo "  $0 health-check      # Check stack health"
        echo "  $0 logs prometheus   # Show Prometheus logs"
        echo "  $0 stop              # Stop the stack"
        ;;
    *)
        error "Unknown command: $1"
        error "Use '$0 help' to see available commands"
        exit 1
        ;;
esac