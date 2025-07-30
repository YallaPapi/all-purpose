#!/bin/sh
# UEP Health Monitoring Service Docker Entrypoint
# 
# Production-ready entrypoint script with:
# - Environment validation
# - Consul connectivity checks
# - Graceful shutdown handling
# - Health monitoring service initialization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Environment validation
validate_environment() {
    log_info "Validating environment configuration..."
    
    # Required environment variables
    REQUIRED_VARS="NODE_ENV PORT CONSUL_HOST CONSUL_PORT"
    
    for var in $REQUIRED_VARS; do
        eval value=\$$var
        if [ -z "$value" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
        log_info "$var=$value"
    done
    
    # Validate port numbers
    if ! echo "$PORT" | grep -qE '^[0-9]+$' || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        log_error "Invalid PORT: $PORT (must be 1-65535)"
        exit 1
    fi
    
    if ! echo "$CONSUL_PORT" | grep -qE '^[0-9]+$' || [ "$CONSUL_PORT" -lt 1 ] || [ "$CONSUL_PORT" -gt 65535 ]; then
        log_error "Invalid CONSUL_PORT: $CONSUL_PORT (must be 1-65535)"
        exit 1
    fi
    
    log_info "Environment validation completed successfully"
}

# Wait for Consul to be available
wait_for_consul() {
    log_info "Waiting for Consul at $CONSUL_HOST:$CONSUL_PORT..."
    
    MAX_RETRIES=30
    RETRY_INTERVAL=2
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if nc -z "$CONSUL_HOST" "$CONSUL_PORT" 2>/dev/null; then
            log_info "Consul is available"
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_warn "Consul not available (attempt $RETRY_COUNT/$MAX_RETRIES), retrying in ${RETRY_INTERVAL}s..."
        sleep $RETRY_INTERVAL
    done
    
    log_error "Consul is not available after $MAX_RETRIES attempts"
    exit 1
}

# Test Consul API connectivity
test_consul_api() {
    log_info "Testing Consul API connectivity..."
    
    CONSUL_URL="http://$CONSUL_HOST:$CONSUL_PORT"
    
    # Test Consul leader endpoint
    if curl -f -s "$CONSUL_URL/v1/status/leader" > /dev/null; then
        log_info "Consul API is responding correctly"
    else
        log_error "Consul API is not responding"
        exit 1
    fi
}

# Setup signal handlers for graceful shutdown
setup_signal_handlers() {
    log_info "Setting up signal handlers for graceful shutdown..."
    
    # Create a temporary file to track the main process
    echo $$ > /tmp/health-monitoring.pid
    
    # Trap signals and forward to main process
    trap 'log_info "Received shutdown signal, gracefully stopping..."; kill -TERM $(cat /tmp/health-monitoring.pid 2>/dev/null || echo $$); wait' TERM INT
}

# Pre-flight checks
preflight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check if application files exist
    if [ ! -f "dist/UEPHealthMonitoringService.js" ]; then
        log_error "Application file not found: dist/UEPHealthMonitoringService.js"
        exit 1
    fi
    
    # Check if logs directory is writable
    if ! touch logs/startup.log 2>/dev/null; then
        log_error "Cannot write to logs directory"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    log_info "Node.js version: $NODE_VERSION"
    
    # Check available memory
    if [ -f /proc/meminfo ]; then
        AVAILABLE_MEMORY=$(grep MemAvailable /proc/meminfo | awk '{print int($2/1024)}')
        log_info "Available memory: ${AVAILABLE_MEMORY}MB"
        
        if [ "$AVAILABLE_MEMORY" -lt 100 ]; then
            log_warn "Low available memory: ${AVAILABLE_MEMORY}MB"
        fi
    fi
    
    log_info "Pre-flight checks completed successfully"
}

# Initialize monitoring
initialize_monitoring() {
    log_info "Initializing health monitoring service..."
    
    # Create startup timestamp
    date > logs/startup.log
    
    # Log startup configuration
    cat << EOF >> logs/startup.log
UEP Health Monitoring Service Startup Configuration:
- Node Environment: $NODE_ENV
- Service Port: $PORT
- Consul Host: $CONSUL_HOST
- Consul Port: $CONSUL_PORT
- Health Monitoring Port: ${HEALTH_MONITORING_PORT:-$PORT}
- Log Level: ${LOG_LEVEL:-info}
- PID: $$
- Startup Time: $(date)
EOF
    
    log_info "Health monitoring service initialization completed"
}

# Main execution
main() {
    log_info "Starting UEP Health Monitoring Service..."
    log_info "Container startup initiated at $(date)"
    
    # Run all initialization steps
    validate_environment
    preflight_checks
    wait_for_consul
    test_consul_api
    setup_signal_handlers
    initialize_monitoring
    
    log_info "All initialization steps completed successfully"
    log_info "Starting main application process..."
    
    # Execute the main command
    exec "$@"
}

# Handle special commands
case "$1" in
    "bash"|"sh")
        log_info "Starting interactive shell..."
        exec "$@"
        ;;
    "test")
        log_info "Running tests..."
        exec npm test
        ;;
    "health-check")
        log_info "Running health check..."
        if curl -f -s "http://localhost:${PORT}/health" > /dev/null; then
            log_info "Health check passed"
            exit 0
        else
            log_error "Health check failed"
            exit 1
        fi
        ;;
    *)
        # Run main initialization and start the application
        main "$@"
        ;;
esac