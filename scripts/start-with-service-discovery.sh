#!/bin/bash

# UEP Meta-Agent Factory Startup Script with Service Discovery
# Task 191.4: Complete startup script for Docker Compose with service discovery

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose-service-discovery.yml"
ENV_FILE=".env.service-discovery"
PROJECT_NAME="uep-factory"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌${NC} $1"
}

# Print banner
print_banner() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║           UEP Meta-Agent Factory with Service Discovery        ║"
    echo "║                                                                ║"
    echo "║  🏭 Complete containerized meta-agent factory                  ║"
    echo "║  📡 Redis + Consul service discovery                           ║"
    echo "║  🔍 Real-time monitoring and observability                     ║"
    echo "║  🚀 Production-ready with health checks                        ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Validate configuration
validate_configuration() {
    log "Validating configuration..."
    
    # Check if compose file exists
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        warning "Environment file not found: $ENV_FILE"
        log "Creating default environment file..."
        cp .env.service-discovery.example "$ENV_FILE" 2>/dev/null || true
    fi
    
    # Validate compose file syntax
    if ! docker-compose -f "$COMPOSE_FILE" config -q &> /dev/null; then
        error "Docker Compose file has syntax errors"
        exit 1
    fi
    
    success "Configuration validation passed"
}

# Check available resources
check_resources() {
    log "Checking system resources..."
    
    # Check available memory (Linux)
    if command -v free &> /dev/null; then
        AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [[ $AVAILABLE_MEM -lt 4096 ]]; then
            warning "Available memory is ${AVAILABLE_MEM}MB (recommended: 4GB+)"
        else
            success "Available memory: ${AVAILABLE_MEM}MB"
        fi
    fi
    
    # Check available disk space
    AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}')
    success "Available disk space: $AVAILABLE_DISK"
    
    # Check CPU cores
    if command -v nproc &> /dev/null; then
        CPU_CORES=$(nproc)
        success "CPU cores: $CPU_CORES"
    fi
}

# Create network if it doesn't exist
create_network() {
    log "Setting up Docker network..."
    
    if ! docker network ls | grep -q "uep-network"; then
        docker network create uep-network --driver bridge --subnet=172.20.0.0/16
        success "Created Docker network: uep-network"
    else
        success "Docker network already exists: uep-network"
    fi
}

# Pull images
pull_images() {
    log "Pulling Docker images..."
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull --quiet
    success "Docker images pulled successfully"
}

# Start infrastructure services first
start_infrastructure() {
    log "Starting infrastructure services..."
    
    # Start Redis registry
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d redis-registry
    
    # Start Consul server
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d consul-server
    
    # Start NATS broker
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nats-broker
    
    # Wait for services to be ready
    log "Waiting for infrastructure services to be ready..."
    
    # Wait for Redis
    timeout 30 bash -c 'until docker exec uep-redis-registry redis-cli ping &>/dev/null; do sleep 1; done'
    success "Redis registry is ready"
    
    # Wait for Consul
    timeout 30 bash -c 'until docker exec uep-consul-server consul members &>/dev/null; do sleep 1; done'
    success "Consul server is ready"
    
    # Wait for NATS
    timeout 30 bash -c 'until curl -s http://localhost:8222/healthz &>/dev/null; do sleep 1; done'
    success "NATS broker is ready"
}

# Start monitoring services
start_monitoring() {
    log "Starting monitoring services..."
    
    # Start service discovery monitor
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d service-discovery-monitor
    
    # Start Prometheus
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d prometheus
    
    # Start Grafana
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d grafana
    
    # Start observability dashboard
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d observability
    
    success "Monitoring services started"
}

# Start core services
start_core_services() {
    log "Starting core UEP services..."
    
    # Start UEP service
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d uep-service
    
    # Start factory core
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d factory-core
    
    success "Core services started"
}

# Start agent services
start_agents() {
    log "Starting UEP agents..."
    
    # Start all agent services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d \
        infra-orchestrator \
        prd-parser \
        scaffold-generator \
        backend-agent \
        frontend-agent \
        domain-agents
    
    success "UEP agents started"
}

# Start API gateway
start_gateway() {
    log "Starting API gateway..."
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d api-gateway
    
    success "API gateway started"
}

# Health check
perform_health_check() {
    log "Performing health checks..."
    
    local failed_services=()
    
    # Define services and their health check URLs
    declare -A health_checks=(
        ["redis-registry"]="redis-cli -h localhost -p 6379 ping"
        ["consul-server"]="curl -s http://localhost:8500/v1/status/leader"
        ["service-discovery-monitor"]="curl -f http://localhost:8090/health"
        ["factory-core"]="curl -f http://localhost:3000/health"
        ["infra-orchestrator"]="curl -f http://localhost:3001/health"
        ["prd-parser"]="curl -f http://localhost:3002/health"
        ["scaffold-generator"]="curl -f http://localhost:3003/health"
        ["prometheus"]="curl -f http://localhost:9090/-/healthy"
        ["grafana"]="curl -f http://localhost:3031/api/health"
    )
    
    for service in "${!health_checks[@]}"; do
        log "Checking health of $service..."
        
        if eval "${health_checks[$service]}" &>/dev/null; then
            success "$service is healthy"
        else
            warning "$service health check failed"
            failed_services+=("$service")
        fi
    done
    
    if [[ ${#failed_services[@]} -eq 0 ]]; then
        success "All services are healthy!"
    else
        warning "Some services failed health checks: ${failed_services[*]}"
        log "Check logs with: docker-compose -f $COMPOSE_FILE logs <service-name>"
    fi
}

# Show service status
show_status() {
    log "Service status:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo ""
    log "Access URLs:"
    echo "🏭 Factory Core:              http://localhost:3000"
    echo "📊 Service Discovery Monitor: http://localhost:8090"
    echo "🔍 Consul UI:                http://localhost:8500"
    echo "📈 Prometheus:               http://localhost:9090"
    echo "📊 Grafana:                  http://localhost:3031"
    echo "🎛️  Observability Dashboard:  http://localhost:3030"
    echo "🚪 API Gateway (Traefik):    http://localhost:8080"
    echo "📡 NATS Monitoring:          http://localhost:8222"
    
    echo ""
    log "Quick commands:"
    echo "📋 View logs:    docker-compose -f $COMPOSE_FILE logs -f [service]"
    echo "🔄 Restart:      docker-compose -f $COMPOSE_FILE restart [service]"
    echo "🛑 Stop all:     docker-compose -f $COMPOSE_FILE down"
    echo "🧹 Clean up:     docker-compose -f $COMPOSE_FILE down -v"
}

# Test service discovery
test_service_discovery() {
    log "Testing service discovery functionality..."
    
    # Wait a bit for services to register
    sleep 10
    
    # Test Redis registry
    if command -v redis-cli &> /dev/null; then
        REGISTERED_AGENTS=$(redis-cli -h localhost -p 6379 SMEMBERS "uep:registry:list" 2>/dev/null | wc -l)
        success "Found $REGISTERED_AGENTS registered agents in Redis"
    fi
    
    # Test service discovery monitor
    if curl -s http://localhost:8090/api/agents &>/dev/null; then
        DISCOVERED_AGENTS=$(curl -s http://localhost:8090/api/agents | jq length 2>/dev/null || echo "N/A")
        success "Service discovery monitor shows $DISCOVERED_AGENTS agents"
    fi
    
    # Test agent discovery
    if curl -s http://localhost:3000/discover/prd-parser &>/dev/null; then
        success "Agent-to-agent discovery is working"
    else
        warning "Agent-to-agent discovery may not be working properly"
    fi
}

# Cleanup function for graceful shutdown
cleanup() {
    log "Cleaning up..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
}

# Main execution
main() {
    print_banner
    
    # Parse command line arguments
    case "${1:-start}" in
        "start")
            check_prerequisites
            validate_configuration
            check_resources
            create_network
            pull_images
            start_infrastructure
            start_monitoring
            start_core_services
            start_agents
            start_gateway
            sleep 5
            perform_health_check
            test_service_discovery
            show_status
            ;;
        "stop")
            log "Stopping all services..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
            success "All services stopped"
            ;;
        "restart")
            log "Restarting all services..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
            success "All services restarted"
            ;;
        "status")
            show_status
            ;;
        "health")
            perform_health_check
            ;;
        "test")
            test_service_discovery
            ;;
        "logs")
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "${2:-}"
            ;;
        "clean")
            log "Cleaning up all resources..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans
            docker system prune -f
            success "Cleanup complete"
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|status|health|test|logs [service]|clean}"
            echo ""
            echo "Commands:"
            echo "  start   - Start all services"
            echo "  stop    - Stop all services"
            echo "  restart - Restart all services"
            echo "  status  - Show service status"
            echo "  health  - Perform health checks"
            echo "  test    - Test service discovery"
            echo "  logs    - Show logs (optionally for specific service)"
            echo "  clean   - Clean up all resources"
            exit 1
            ;;
    esac
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Run main function
main "$@"