#!/bin/bash
# health-check.sh
# Comprehensive health check script for Meta-Agent Factory observability stack

set -euo pipefail

# Script metadata
SCRIPT_VERSION="1.0.0"
LOG_FILE="/tmp/observability-health-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

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

# Health check functions
check_result() {
    local status=$1
    local message=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            success "✓ $message"
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            error "✗ $message"
            ;;
        "WARN")
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            warn "⚠ $message"
            ;;
    esac
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    local timeout=${4:-10}
    
    if curl -s -f --max-time $timeout -o /dev/null -w "%{http_code}" "$url" | grep -q "^$expected_status"; then
        check_result "PASS" "$name endpoint is healthy ($url)"
        return 0
    else
        check_result "FAIL" "$name endpoint is not responding ($url)"
        return 1
    fi
}

# Function to check service with custom endpoint
check_service_ready() {
    local name=$1
    local url=$2
    local timeout=${3:-10}
    
    if curl -s -f --max-time $timeout "$url" >/dev/null 2>&1; then
        check_result "PASS" "$name service is ready"
        return 0
    else
        check_result "FAIL" "$name service is not ready"
        return 1
    fi
}

# Function to check Docker container status
check_container_status() {
    local container_name=$1
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
        local uptime=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$container_name" | awk '{print $3,$4,$5}')
        check_result "PASS" "Container $container_name is running ($uptime)"
        return 0
    else
        if docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name"; then
            local status=$(docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep "$container_name" | awk '{print $2,$3,$4}')
            check_result "FAIL" "Container $container_name is not running ($status)"
        else
            check_result "FAIL" "Container $container_name not found"
        fi
        return 1
    fi
}

# Function to check Prometheus targets
check_prometheus_targets() {
    info "Checking Prometheus targets..."
    
    local targets_url="http://localhost:9090/api/v1/targets"
    local response=$(curl -s "$targets_url" 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        check_result "FAIL" "Cannot connect to Prometheus API"
        return 1
    fi
    
    local active_targets=$(echo "$response" | jq -r '.data.activeTargets | length' 2>/dev/null || echo "0")
    local healthy_targets=$(echo "$response" | jq -r '.data.activeTargets | map(select(.health == "up")) | length' 2>/dev/null || echo "0")
    
    if [ "$active_targets" -gt 0 ]; then
        check_result "PASS" "Prometheus has $active_targets active targets"
        
        if [ "$healthy_targets" -eq "$active_targets" ]; then
            check_result "PASS" "All $healthy_targets Prometheus targets are healthy"
        else
            local unhealthy=$((active_targets - healthy_targets))
            check_result "WARN" "$healthy_targets/$active_targets Prometheus targets are healthy ($unhealthy unhealthy)"
        fi
    else
        check_result "FAIL" "No active Prometheus targets found"
    fi
}

# Function to check Grafana datasources
check_grafana_datasources() {
    info "Checking Grafana datasources..."
    
    local datasources_url="http://localhost:3004/api/datasources"
    local auth="admin:${GRAFANA_ADMIN_PASSWORD:-admin123}"
    
    local response=$(curl -s -u "$auth" "$datasources_url" 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        check_result "FAIL" "Cannot connect to Grafana API"
        return 1
    fi
    
    local datasource_count=$(echo "$response" | jq '. | length' 2>/dev/null || echo "0")
    
    if [ "$datasource_count" -gt 0 ]; then
        check_result "PASS" "Grafana has $datasource_count datasources configured"
        
        # Check specific datasources
        local prometheus_ds=$(echo "$response" | jq -r '.[] | select(.type == "prometheus") | .name' 2>/dev/null || echo "")
        local loki_ds=$(echo "$response" | jq -r '.[] | select(.type == "loki") | .name' 2>/dev/null || echo "")
        local tempo_ds=$(echo "$response" | jq -r '.[] | select(.type == "tempo") | .name' 2>/dev/null || echo "")
        
        [ -n "$prometheus_ds" ] && check_result "PASS" "Prometheus datasource configured: $prometheus_ds" || check_result "WARN" "Prometheus datasource not found"
        [ -n "$loki_ds" ] && check_result "PASS" "Loki datasource configured: $loki_ds" || check_result "WARN" "Loki datasource not found"
        [ -n "$tempo_ds" ] && check_result "PASS" "Tempo datasource configured: $tempo_ds" || check_result "WARN" "Tempo datasource not found"
    else
        check_result "FAIL" "No Grafana datasources configured"
    fi
}

# Function to check Loki labels and streams
check_loki_data() {
    info "Checking Loki data availability..."
    
    local labels_url="http://localhost:3100/loki/api/v1/labels"
    local response=$(curl -s "$labels_url" 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        check_result "FAIL" "Cannot connect to Loki API"
        return 1
    fi
    
    local label_count=$(echo "$response" | jq '.data | length' 2>/dev/null || echo "0")
    
    if [ "$label_count" -gt 0 ]; then
        check_result "PASS" "Loki has $label_count labels available"
        
        # Check for expected labels
        local expected_labels=("service" "level" "environment" "team")
        for label in "${expected_labels[@]}"; do
            if echo "$response" | jq -r '.data[]' | grep -q "^$label$"; then
                check_result "PASS" "Loki has expected label: $label"
            else
                check_result "WARN" "Loki missing expected label: $label"
            fi
        done
    else
        check_result "WARN" "No Loki labels found - may indicate no log ingestion"
    fi
}

# Function to check Tempo traces
check_tempo_traces() {
    info "Checking Tempo trace data..."
    
    local search_url="http://localhost:3200/api/search"
    local response=$(curl -s "$search_url" 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        check_result "FAIL" "Cannot connect to Tempo API"
        return 1
    fi
    
    # Tempo may return empty results if no traces, which is normal for new installations
    check_result "PASS" "Tempo API is accessible"
    
    # Try to get service map
    local services_url="http://localhost:3200/api/v2/search/tags"
    local services_response=$(curl -s "$services_url" 2>/dev/null || echo "")
    
    if [ -n "$services_response" ]; then
        local service_count=$(echo "$services_response" | jq '.tagNames | length' 2>/dev/null || echo "0")
        if [ "$service_count" -gt 0 ]; then
            check_result "PASS" "Tempo has trace data with $service_count tag types"
        else
            check_result "WARN" "Tempo is running but no trace data found yet"
        fi
    fi
}

# Function to check Alertmanager alerts
check_alertmanager() {
    info "Checking Alertmanager..."
    
    local alerts_url="http://localhost:9093/api/v1/alerts"
    local response=$(curl -s "$alerts_url" 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        check_result "FAIL" "Cannot connect to Alertmanager API"
        return 1
    fi
    
    local alert_count=$(echo "$response" | jq '.data | length' 2>/dev/null || echo "0")
    check_result "PASS" "Alertmanager is running with $alert_count active alerts"
    
    # Check for critical alerts
    local critical_alerts=$(echo "$response" | jq -r '.data[] | select(.labels.severity == "critical") | .labels.alertname' 2>/dev/null || echo "")
    if [ -n "$critical_alerts" ]; then
        check_result "WARN" "Critical alerts active: $(echo "$critical_alerts" | tr '\n' ', ' | sed 's/,$//')"
    else
        check_result "PASS" "No critical alerts active"
    fi
}

# Function to check disk space
check_disk_space() {
    info "Checking disk space for observability data..."
    
    local data_dirs=(
        "/var/lib/docker"
        "$(pwd)/data/prometheus"
        "$(pwd)/data/grafana"
        "$(pwd)/data/loki"
        "$(pwd)/data/tempo"
    )
    
    for dir in "${data_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local usage=$(df -h "$dir" | awk 'NR==2 {print $5}' | sed 's/%//')
            local available=$(df -h "$dir" | awk 'NR==2 {print $4}')
            
            if [ "$usage" -lt 80 ]; then
                check_result "PASS" "Disk usage for $dir: ${usage}% (${available} available)"
            elif [ "$usage" -lt 90 ]; then
                check_result "WARN" "Disk usage for $dir: ${usage}% (${available} available)"
            else
                check_result "FAIL" "Disk usage for $dir: ${usage}% (${available} available) - critically low"
            fi
        fi
    done
}

# Function to check memory usage
check_memory_usage() {
    info "Checking memory usage for observability containers..."
    
    local containers=(
        "prometheus"
        "grafana"
        "loki"
        "tempo"
        "alertmanager"
        "otel-collector"
    )
    
    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "$container"; then
            local container_name=$(docker ps --format "{{.Names}}" | grep "$container" | head -1)
            local memory_usage=$(docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}" | grep "$container_name" | awk '{print $2}' || echo "unknown")
            
            if [ "$memory_usage" != "unknown" ]; then
                check_result "PASS" "Memory usage for $container_name: $memory_usage"
            else
                check_result "WARN" "Cannot determine memory usage for $container_name"
            fi
        fi
    done
}

# Function to check network connectivity
check_network_connectivity() {
    info "Checking network connectivity between services..."
    
    # Test internal network connectivity
    local network_tests=(
        "prometheus:prometheus:9090"
        "grafana:grafana:3000"
        "loki:loki:3100"
        "tempo:tempo:3200"
        "alertmanager:alertmanager:9093"
    )
    
    for test in "${network_tests[@]}"; do
        local container="${test%%:*}"
        local remaining="${test#*:}"
        local target="${remaining%%:*}"
        local port="${remaining#*:}"
        
        if docker ps --format "{{.Names}}" | grep -q "$container"; then
            local container_name=$(docker ps --format "{{.Names}}" | grep "$container" | head -1)
            
            if docker exec "$container_name" timeout 5 nc -z "$target" "$port" 2>/dev/null; then
                check_result "PASS" "Network connectivity: $container_name can reach $target:$port"
            else
                check_result "WARN" "Network connectivity: $container_name cannot reach $target:$port"
            fi
        fi
    done
}

# Function to check data flow
check_data_flow() {
    info "Checking data flow through observability pipeline..."
    
    # Generate test metric via Prometheus
    local test_metric_query="up"
    local prometheus_query_url="http://localhost:9090/api/v1/query?query=$test_metric_query"
    local prometheus_response=$(curl -s "$prometheus_query_url" 2>/dev/null || echo "")
    
    if [ -n "$prometheus_response" ] && echo "$prometheus_response" | jq -e '.data.result | length > 0' >/dev/null 2>&1; then
        check_result "PASS" "Prometheus is collecting metrics (found 'up' metrics)"
    else
        check_result "FAIL" "Prometheus is not collecting metrics properly"
    fi
    
    # Check if logs are flowing to Loki
    local loki_query_url="http://localhost:3100/loki/api/v1/query_range?query={job=~\".+\"}&limit=1"
    local loki_response=$(curl -s "$loki_query_url" 2>/dev/null || echo "")
    
    if [ -n "$loki_response" ] && echo "$loki_response" | jq -e '.data.result | length > 0' >/dev/null 2>&1; then
        check_result "PASS" "Loki is receiving log data"
    else
        check_result "WARN" "Loki may not be receiving log data yet"
    fi
}

# Main health check function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          Meta-Agent Factory Observability Stack             ║"
    echo "║                  Health Check Report                        ║"
    echo "║                   Version: $SCRIPT_VERSION                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    info "Starting comprehensive health check..."
    info "Log file: $LOG_FILE"
    
    # Container status checks
    info "=== Container Status Checks ==="
    check_container_status "prometheus"
    check_container_status "grafana"
    check_container_status "loki"
    check_container_status "tempo"
    check_container_status "alertmanager"
    check_container_status "promtail"
    check_container_status "otel-collector"
    
    # Service endpoint checks
    info "=== Service Endpoint Checks ==="
    check_service_ready "Prometheus" "http://localhost:9090/-/ready"
    check_service_ready "Grafana" "http://localhost:3004/api/health"
    check_service_ready "Loki" "http://localhost:3100/ready"
    check_service_ready "Tempo" "http://localhost:3200/ready"
    check_service_ready "Alertmanager" "http://localhost:9093/-/ready"
    check_http_endpoint "Jaeger UI" "http://localhost:16686"
    
    # Data and configuration checks
    info "=== Data and Configuration Checks ==="
    check_prometheus_targets
    check_grafana_datasources
    check_loki_data
    check_tempo_traces
    check_alertmanager
    
    # Resource usage checks
    info "=== Resource Usage Checks ==="
    check_disk_space
    check_memory_usage
    
    # Network connectivity checks
    info "=== Network Connectivity Checks ==="
    check_network_connectivity
    
    # Data flow validation
    info "=== Data Flow Validation ==="
    check_data_flow
    
    # Print summary
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                        HEALTH CHECK SUMMARY                 ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Total Checks:    ${BLUE}$TOTAL_CHECKS${NC}"
    echo -e "Passed:          ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Warnings:        ${YELLOW}$WARNING_CHECKS${NC}"
    echo -e "Failed:          ${RED}$FAILED_CHECKS${NC}"
    echo ""
    
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            echo -e "${GREEN}🎉 All checks passed! Observability stack is healthy.${NC}"
            exit 0
        else
            echo -e "${YELLOW}⚠️  Observability stack is mostly healthy with some warnings.${NC}"
            exit 0
        fi
    else
        echo -e "${RED}❌ Some health checks failed. Please review the issues above.${NC}"
        echo ""
        echo "Troubleshooting suggestions:"
        echo "• Check container logs: docker-compose logs [service-name]"
        echo "• Verify configuration files in containers/observability/"
        echo "• Ensure all required ports are available"
        echo "• Check system resources (disk space, memory)"
        echo "• Review deployment logs: cat $LOG_FILE"
        exit 1
    fi
}

# Run main function
main "$@"