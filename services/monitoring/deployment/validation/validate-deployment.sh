#!/bin/bash

# Meta-Agent Factory Monitoring Stack Validation Suite
# Task 231.5 - Comprehensive deployment validation and testing procedures
# Production-ready validation with health checks, performance tests, and alerting verification

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/deployment/docker-compose.monitoring.yml"

# Test configuration
GRAFANA_URL="http://localhost:3000"
PROMETHEUS_URL="http://localhost:9090"
ALERTMANAGER_URL="http://localhost:9093"
LOKI_URL="http://localhost:3100"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

log_test() {
    echo -e "${PURPLE}[TEST]${NC} $1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Utility functions
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=${3:-30}
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    return 1
}

# Test 1: Container Health Validation
test_container_health() {
    log_info "=== Testing Container Health ==="
    
    local services=("meta-agent-prometheus" "meta-agent-alertmanager" "meta-agent-grafana" "meta-agent-loki" "meta-agent-node-exporter")
    
    for service in "${services[@]}"; do
        log_test "Checking container: $service"
        
        if docker inspect "$service" &> /dev/null; then
            local status=$(docker inspect --format='{{.State.Status}}' "$service")
            local health=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "no-healthcheck")
            
            if [[ "$status" == "running" ]]; then
                if [[ "$health" == "healthy" || "$health" == "no-healthcheck" ]]; then
                    log_success "Container $service is running and healthy"
                else
                    log_error "Container $service is running but unhealthy (health: $health)"
                fi
            else
                log_error "Container $service is not running (status: $status)"
            fi
        else
            log_error "Container $service not found"
        fi
    done
}

# Test 2: Service Endpoint Availability
test_service_endpoints() {
    log_info "=== Testing Service Endpoints ==="
    
    local endpoints=(
        "$GRAFANA_URL/api/health:Grafana"
        "$PROMETHEUS_URL/-/healthy:Prometheus"
        "$ALERTMANAGER_URL/-/healthy:Alertmanager"
        "$LOKI_URL/ready:Loki"
        "http://localhost:9100/metrics:Node Exporter"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_info" | cut -d: -f1)
        local service_name=$(echo "$endpoint_info" | cut -d: -f2)
        
        log_test "Testing endpoint: $endpoint ($service_name)"
        
        if wait_for_service "$endpoint" "$service_name" 10; then
            log_success "$service_name endpoint is accessible"
        else
            log_error "$service_name endpoint is not accessible"
        fi
    done
}

# Test 3: Dashboard Validation
test_dashboards() {
    log_info "=== Testing Dashboard Availability ==="
    
    local dashboard_paths=(
        "/api/dashboards/db/meta-agent-factory-overview:System Overview"
        "/api/dashboards/db/service-registry-health:Service Registry"
        "/api/dashboards/db/observability-stack-health:Meta-Monitoring"
    )
    
    for dashboard_info in "${dashboard_paths[@]}"; do
        local path=$(echo "$dashboard_info" | cut -d: -f1)
        local name=$(echo "$dashboard_info" | cut -d: -f2)
        
        log_test "Testing dashboard: $name"
        
        local response=$(curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL$path")
        if [[ "$response" == "200" ]]; then
            log_success "Dashboard '$name' is accessible"
        else
            log_warning "Dashboard '$name' returned HTTP $response (may not be imported yet)"
        fi
    done
}

# Test 4: Prometheus Targets Validation
test_prometheus_targets() {
    log_info "=== Testing Prometheus Targets ==="
    
    log_test "Checking Prometheus targets status"
    
    local targets_response=$(curl -s "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null)
    if [[ $? -eq 0 && -n "$targets_response" ]]; then
        local active_targets=$(echo "$targets_response" | jq -r '.data.activeTargets[]? | select(.health=="up") | .job' 2>/dev/null || echo "")
        local unhealthy_targets=$(echo "$targets_response" | jq -r '.data.activeTargets[]? | select(.health!="up") | .job' 2>/dev/null || echo "")
        
        if [[ -n "$active_targets" ]]; then
            log_success "Active targets found: $(echo "$active_targets" | tr '\n' ' ')"
        else
            log_warning "No active targets found"
        fi
        
        if [[ -n "$unhealthy_targets" ]]; then
            log_warning "Unhealthy targets: $(echo "$unhealthy_targets" | tr '\n' ' ')"
        fi
    else
        log_error "Failed to retrieve Prometheus targets"
    fi
}

# Test 5: Alert Rules Validation
test_alert_rules() {
    log_info "=== Testing Alert Rules ==="
    
    log_test "Checking alert rules loading"
    
    local rules_response=$(curl -s "$PROMETHEUS_URL/api/v1/rules" 2>/dev/null)
    if [[ $? -eq 0 && -n "$rules_response" ]]; then
        local rule_groups=$(echo "$rules_response" | jq -r '.data.groups[]?.name' 2>/dev/null || echo "")
        local total_rules=$(echo "$rules_response" | jq -r '.data.groups[]?.rules | length' 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
        
        if [[ -n "$rule_groups" && "$total_rules" -gt 0 ]]; then
            log_success "Alert rules loaded: $total_rules rules in groups: $(echo "$rule_groups" | tr '\n' ' ')"
        else
            log_error "No alert rules found or failed to load"
        fi
    else
        log_error "Failed to retrieve alert rules"
    fi
}

# Test 6: Alertmanager Configuration
test_alertmanager_config() {
    log_info "=== Testing Alertmanager Configuration ==="
    
    log_test "Checking Alertmanager configuration"
    
    local config_response=$(curl -s "$ALERTMANAGER_URL/api/v1/status" 2>/dev/null)
    if [[ $? -eq 0 && -n "$config_response" ]]; then
        local config_hash=$(echo "$config_response" | jq -r '.data.configYAML' 2>/dev/null | sha256sum | cut -d' ' -f1)
        if [[ -n "$config_hash" && "$config_hash" != "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" ]]; then
            log_success "Alertmanager configuration loaded (hash: ${config_hash:0:8}...)"
        else
            log_error "Alertmanager configuration appears empty or invalid"
        fi
    else
        log_error "Failed to retrieve Alertmanager configuration"
    fi
}

# Test 7: Metrics Collection Validation
test_metrics_collection() {
    log_info "=== Testing Metrics Collection ==="
    
    local test_metrics=(
        "up:Service Up Status"
        "prometheus_tsdb_samples_appended_total:Prometheus Ingestion"
        "node_cpu_seconds_total:Node Exporter CPU Metrics"
        "grafana_api_response_time_seconds:Grafana Metrics"
    )
    
    for metric_info in "${test_metrics[@]}"; do
        local metric=$(echo "$metric_info" | cut -d: -f1)
        local description=$(echo "$metric_info" | cut -d: -f2)
        
        log_test "Checking metric collection: $description"
        
        local query_response=$(curl -s "$PROMETHEUS_URL/api/v1/query?query=$metric" 2>/dev/null)
        if [[ $? -eq 0 && -n "$query_response" ]]; then
            local result_count=$(echo "$query_response" | jq -r '.data.result | length' 2>/dev/null || echo "0")
            if [[ "$result_count" -gt 0 ]]; then
                log_success "Metric '$metric' has $result_count series"
            else
                log_warning "No data found for metric '$metric'"
            fi
        else
            log_error "Failed to query metric '$metric'"
        fi
    done
}

# Test 8: Log Collection Validation (Loki)
test_log_collection() {
    log_info "=== Testing Log Collection ==="
    
    log_test "Checking Loki log ingestion"
    
    # Check if Loki has received any logs
    local query='%7Bcontainer_name%3D~%22.*%22%7D' # URL encoded {container_name=~".*"}
    local loki_response=$(curl -s "$LOKI_URL/loki/api/v1/query?query=$query&limit=1" 2>/dev/null)
    
    if [[ $? -eq 0 && -n "$loki_response" ]]; then
        local stream_count=$(echo "$loki_response" | jq -r '.data.result | length' 2>/dev/null || echo "0")
        if [[ "$stream_count" -gt 0 ]]; then
            log_success "Loki is collecting logs ($stream_count streams found)"
        else
            log_warning "No log streams found in Loki (may be normal for new deployment)"
        fi
    else
        log_warning "Failed to query Loki for logs"
    fi
}

# Test 9: Performance and Resource Usage
test_performance() {
    log_info "=== Testing Performance and Resource Usage ==="
    
    log_test "Checking container resource usage"
    
    local resource_stats=$(docker stats --no-stream --format "json" 2>/dev/null | jq -r '[.Name, .CPUPerc, .MemUsage] | @tsv' 2>/dev/null)
    
    if [[ -n "$resource_stats" ]]; then
        log_success "Resource usage collected:"
        echo "$resource_stats" | while read -r line; do
            echo "  $line"
        done
    else
        log_warning "Failed to collect resource usage statistics"
    fi
    
    # Check disk usage
    log_test "Checking disk usage"
    local disk_usage=$(du -sh "$PROJECT_ROOT/data" 2>/dev/null || echo "N/A")
    log_success "Data directory size: $disk_usage"
}

# Test 10: Network Connectivity
test_network_connectivity() {
    log_info "=== Testing Network Connectivity ==="
    
    log_test "Checking inter-service connectivity"
    
    # Test if Grafana can reach Prometheus
    local grafana_container="meta-agent-grafana"
    if docker exec "$grafana_container" wget -qO- "http://prometheus:9090/api/v1/label/__name__/values" &>/dev/null; then
        log_success "Grafana can reach Prometheus"
    else
        log_error "Grafana cannot reach Prometheus"
    fi
    
    # Test if Prometheus can reach Alertmanager
    local prometheus_container="meta-agent-prometheus"
    if docker exec "$prometheus_container" wget -qO- "http://alertmanager:9093/-/healthy" &>/dev/null; then
        log_success "Prometheus can reach Alertmanager"
    else
        log_error "Prometheus cannot reach Alertmanager"
    fi
}

# Test 11: Alert Testing (Synthetic Alert)
test_alerting_system() {
    log_info "=== Testing Alerting System ==="
    
    log_test "Sending test alert to Alertmanager"
    
    local test_alert='[{
        "labels": {
            "alertname": "TestAlert",
            "severity": "warning",
            "app": "meta-agent-factory",
            "team": "platform",
            "service": "test"
        },
        "annotations": {
            "summary": "This is a test alert",
            "description": "Validation test alert for monitoring stack"
        },
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "endsAt": "'$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }]'
    
    local alert_response=$(curl -s -X POST "$ALERTMANAGER_URL/api/v1/alerts" \
        -H "Content-Type: application/json" \
        -d "$test_alert" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        log_success "Test alert sent to Alertmanager"
        sleep 5
        
        # Check if alert was received
        local alerts_response=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts" 2>/dev/null)
        local test_alert_count=$(echo "$alerts_response" | jq -r '.data[]? | select(.labels.alertname=="TestAlert") | .labels.alertname' 2>/dev/null | wc -l)
        
        if [[ "$test_alert_count" -gt 0 ]]; then
            log_success "Test alert processed by Alertmanager"
        else
            log_warning "Test alert not found in Alertmanager (may have been resolved quickly)"
        fi
    else
        log_error "Failed to send test alert to Alertmanager"
    fi
}

# Generate validation report
generate_validation_report() {
    local report_file="${PROJECT_ROOT}/validation-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$report_file" << EOF
Meta-Agent Factory Monitoring Stack Validation Report
Generated: $(date)

=== VALIDATION SUMMARY ===
Total Tests: $TOTAL_TESTS
Passed: $PASSED_TESTS
Failed: $FAILED_TESTS
Warnings: $WARNINGS
Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%

=== TEST RESULTS ===
Status: $(if [[ $FAILED_TESTS -eq 0 ]]; then echo "PASSED"; else echo "FAILED"; fi)
Critical Issues: $FAILED_TESTS
Non-Critical Issues: $WARNINGS

=== RECOMMENDATIONS ===
$(if [[ $FAILED_TESTS -gt 0 ]]; then
    echo "❌ CRITICAL: $FAILED_TESTS tests failed. Review logs and fix issues before production use."
elif [[ $WARNINGS -gt 0 ]]; then
    echo "⚠️  WARNING: $WARNINGS warnings found. Consider addressing before production use."
else
    echo "✅ SUCCESS: All tests passed. System is ready for production use."
fi)

=== NEXT STEPS ===
$(if [[ $FAILED_TESTS -eq 0 ]]; then
    cat << 'NEXTSTEPS'
1. Configure production notification channels
2. Set up backup procedures for persistent data
3. Configure proper SSL/TLS certificates
4. Set up monitoring for the monitoring stack itself
5. Create operational runbooks
NEXTSTEPS
else
    cat << 'FAILSTEPS'
1. Review failed tests in the validation output
2. Check container logs: docker-compose logs [service]
3. Verify configuration files
4. Ensure all required environment variables are set
5. Re-run validation after fixes
FAILSTEPS
fi)

=== SYSTEM INFORMATION ===
Docker Version: $(docker --version)
Docker Compose Version: $(docker-compose --version)
Host OS: $(uname -a)
Available Disk Space: $(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
System Load: $(uptime)
EOF

    log_info "Validation report saved to: $report_file"
}

# Main validation workflow
main() {
    log_info "🔍 Starting Meta-Agent Factory Monitoring Stack Validation..."
    echo
    
    # Run all validation tests
    test_container_health
    echo
    test_service_endpoints
    echo
    test_dashboards
    echo
    test_prometheus_targets
    echo
    test_alert_rules
    echo
    test_alertmanager_config
    echo
    test_metrics_collection
    echo
    test_log_collection
    echo
    test_performance
    echo
    test_network_connectivity
    echo
    test_alerting_system
    echo
    
    # Generate summary
    log_info "=== VALIDATION SUMMARY ==="
    log_info "Total Tests: $TOTAL_TESTS"
    log_success "Passed: $PASSED_TESTS"
    if [[ $FAILED_TESTS -gt 0 ]]; then
        log_error "Failed: $FAILED_TESTS"
    fi
    if [[ $WARNINGS -gt 0 ]]; then
        log_warning "Warnings: $WARNINGS"
    fi
    
    local success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    log_info "Success Rate: ${success_rate}%"
    
    # Generate report
    generate_validation_report
    
    # Final status
    if [[ $FAILED_TESTS -eq 0 ]]; then
        log_success "🎉 Validation completed successfully! System is ready for use."
        return 0
    else
        log_error "❌ Validation failed. Please address the issues and run validation again."
        return 1
    fi
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi