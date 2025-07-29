#!/bin/bash
# validate-configs.sh
# Configuration validation script for Meta-Agent Factory observability stack

set -euo pipefail

# Script metadata
SCRIPT_VERSION="1.0.0"
LOG_FILE="/tmp/config-validation-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OBSERVABILITY_DIR="$PROJECT_ROOT/containers/observability"

# Validation results
TOTAL_VALIDATIONS=0
PASSED_VALIDATIONS=0
FAILED_VALIDATIONS=0
WARNING_VALIDATIONS=0

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

# Validation result function
validation_result() {
    local status=$1
    local message=$2
    
    TOTAL_VALIDATIONS=$((TOTAL_VALIDATIONS + 1))
    
    case $status in
        "PASS")
            PASSED_VALIDATIONS=$((PASSED_VALIDATIONS + 1))
            success "✓ $message"
            ;;
        "FAIL")
            FAILED_VALIDATIONS=$((FAILED_VALIDATIONS + 1))
            error "✗ $message"
            ;;
        "WARN")
            WARNING_VALIDATIONS=$((WARNING_VALIDATIONS + 1))
            warn "⚠ $message"
            ;;
    esac
}

# Function to check if required tools are available
check_tools() {
    info "Checking required validation tools..."
    
    local required_tools=("yq" "jq" "docker" "docker-compose")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
        validation_result "PASS" "All required tools are available"
    else
        validation_result "FAIL" "Missing required tools: ${missing_tools[*]}"
        error "Please install missing tools and try again"
        exit 1
    fi
}

# Function to validate YAML syntax
validate_yaml_syntax() {
    local file=$1
    local description=$2
    
    if [ ! -f "$file" ]; then
        validation_result "FAIL" "$description - file not found: $file"
        return 1
    fi
    
    if command -v yq >/dev/null 2>&1; then
        if yq eval . "$file" >/dev/null 2>&1; then
            validation_result "PASS" "$description - YAML syntax is valid"
            return 0
        else
            validation_result "FAIL" "$description - YAML syntax is invalid"
            return 1
        fi
    else
        # Fallback to basic check
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            validation_result "PASS" "$description - YAML syntax is valid (basic check)"
            return 0
        else
            validation_result "FAIL" "$description - YAML syntax is invalid (basic check)"
            return 1
        fi
    fi
}

# Function to validate JSON syntax
validate_json_syntax() {
    local file=$1
    local description=$2
    
    if [ ! -f "$file" ]; then
        validation_result "FAIL" "$description - file not found: $file"
        return 1
    fi
    
    if jq . "$file" >/dev/null 2>&1; then
        validation_result "PASS" "$description - JSON syntax is valid"
        return 0
    else
        validation_result "FAIL" "$description - JSON syntax is invalid"
        return 1
    fi
}

# Function to validate Prometheus configuration
validate_prometheus_config() {
    info "Validating Prometheus configuration..."
    
    local config_file="$OBSERVABILITY_DIR/prometheus-enhanced.yml"
    
    # Basic YAML syntax
    if ! validate_yaml_syntax "$config_file" "Prometheus configuration"; then
        return 1
    fi
    
    # Check required sections
    local required_sections=("global" "scrape_configs" "rule_files")
    for section in "${required_sections[@]}"; do
        if yq eval "has(\"$section\")" "$config_file" | grep -q "true"; then
            validation_result "PASS" "Prometheus config has required section: $section"
        else
            validation_result "FAIL" "Prometheus config missing required section: $section"
        fi
    done
    
    # Check scrape targets
    local scrape_jobs=$(yq eval '.scrape_configs | length' "$config_file" 2>/dev/null || echo "0")
    if [ "$scrape_jobs" -gt 0 ]; then
        validation_result "PASS" "Prometheus has $scrape_jobs scrape job(s) configured"
    else
        validation_result "WARN" "No scrape jobs configured in Prometheus"
    fi
    
    # Check for essential targets
    local essential_targets=("factory-core" "domain-agents" "uep-service")
    for target in "${essential_targets[@]}"; do
        if yq eval '.scrape_configs[].job_name' "$config_file" | grep -q "$target"; then
            validation_result "PASS" "Essential target configured: $target"
        else
            validation_result "WARN" "Essential target not found: $target"
        fi
    done
}

# Function to validate recording rules
validate_recording_rules() {
    info "Validating Prometheus recording rules..."
    
    local rules_file="$OBSERVABILITY_DIR/recording_rules.yml"
    
    if ! validate_yaml_syntax "$rules_file" "Recording rules"; then
        return 1
    fi
    
    # Check groups structure
    if yq eval 'has("groups")' "$rules_file" | grep -q "true"; then
        validation_result "PASS" "Recording rules have groups structure"
        
        local groups_count=$(yq eval '.groups | length' "$rules_file" 2>/dev/null || echo "0")
        if [ "$groups_count" -gt 0 ]; then
            validation_result "PASS" "Recording rules have $groups_count group(s)"
        else
            validation_result "WARN" "No recording rule groups found"
        fi
    else
        validation_result "FAIL" "Recording rules missing groups structure"
    fi
    
    # Check for essential recording rules
    local essential_rules=("golden_signals" "meta_agent")
    for rule_pattern in "${essential_rules[@]}"; do
        if yq eval '.groups[].name' "$rules_file" | grep -q "$rule_pattern"; then
            validation_result "PASS" "Essential rule group found: $rule_pattern"
        else
            validation_result "WARN" "Essential rule group not found: $rule_pattern"
        fi
    done
}

# Function to validate alert rules
validate_alert_rules() {
    info "Validating Prometheus alert rules..."
    
    local alert_file="$OBSERVABILITY_DIR/alert_rules.yml"
    
    if ! validate_yaml_syntax "$alert_file" "Alert rules"; then
        return 1
    fi
    
    # Check groups structure
    if yq eval 'has("groups")' "$alert_file" | grep -q "true"; then
        validation_result "PASS" "Alert rules have groups structure"
        
        local groups_count=$(yq eval '.groups | length' "$alert_file" 2>/dev/null || echo "0")
        if [ "$groups_count" -gt 0 ]; then
            validation_result "PASS" "Alert rules have $groups_count group(s)"
        else
            validation_result "WARN" "No alert rule groups found"
        fi
    else
        validation_result "FAIL" "Alert rules missing groups structure"
    fi
    
    # Check for critical alerts
    local critical_alerts=("ServiceDown" "HighErrorRate" "SystemHealthCritical")
    for alert in "${critical_alerts[@]}"; do
        if yq eval '.groups[].rules[].alert' "$alert_file" | grep -q "$alert"; then
            validation_result "PASS" "Critical alert configured: $alert"
        else
            validation_result "WARN" "Critical alert not found: $alert"
        fi
    done
    
    # Validate alert severity levels
    local severities=$(yq eval '.groups[].rules[].labels.severity' "$alert_file" | sort | uniq | grep -v "null" | wc -l)
    if [ "$severities" -gt 0 ]; then
        validation_result "PASS" "Alert rules have severity labels configured"
    else
        validation_result "WARN" "No severity labels found in alert rules"
    fi
}

# Function to validate Loki configuration
validate_loki_config() {
    info "Validating Loki configuration..."
    
    local config_file="$OBSERVABILITY_DIR/loki.yml"
    
    if ! validate_yaml_syntax "$config_file" "Loki configuration"; then
        return 1
    fi
    
    # Check required sections
    local required_sections=("server" "ingester" "schema_config" "storage_config")
    for section in "${required_sections[@]}"; do
        if yq eval "has(\"$section\")" "$config_file" | grep -q "true"; then
            validation_result "PASS" "Loki config has required section: $section"
        else
            validation_result "FAIL" "Loki config missing required section: $section"
        fi
    done
    
    # Check schema configuration
    if yq eval '.schema_config.configs | length' "$config_file" | grep -qE '^[1-9]'; then
        validation_result "PASS" "Loki has schema configuration"
    else
        validation_result "FAIL" "Loki missing schema configuration"
    fi
}

# Function to validate Promtail configuration
validate_promtail_config() {
    info "Validating Promtail configuration..."
    
    local config_file="$OBSERVABILITY_DIR/promtail.yml"
    
    if ! validate_yaml_syntax "$config_file" "Promtail configuration"; then
        return 1
    fi
    
    # Check required sections
    local required_sections=("server" "positions" "clients" "scrape_configs")
    for section in "${required_sections[@]}"; do
        if yq eval "has(\"$section\")" "$config_file" | grep -q "true"; then
            validation_result "PASS" "Promtail config has required section: $section"
        else
            validation_result "FAIL" "Promtail config missing required section: $section"
        fi
    done
    
    # Check Loki client configuration
    if yq eval '.clients | length' "$config_file" | grep -qE '^[1-9]'; then
        validation_result "PASS" "Promtail has Loki client configuration"
    else
        validation_result "FAIL" "Promtail missing Loki client configuration"
    fi
    
    # Check scrape configurations
    local scrape_jobs=$(yq eval '.scrape_configs | length' "$config_file" 2>/dev/null || echo "0")
    if [ "$scrape_jobs" -gt 0 ]; then
        validation_result "PASS" "Promtail has $scrape_jobs scrape job(s) configured"
    else
        validation_result "WARN" "No scrape jobs configured in Promtail"
    fi
}

# Function to validate Tempo configuration
validate_tempo_config() {
    info "Validating Tempo configuration..."
    
    local config_file="$OBSERVABILITY_DIR/tempo.yml"
    
    if ! validate_yaml_syntax "$config_file" "Tempo configuration"; then
        return 1
    fi
    
    # Check required sections
    local required_sections=("server" "distributor" "ingester" "storage")
    for section in "${required_sections[@]}"; do
        if yq eval "has(\"$section\")" "$config_file" | grep -q "true"; then
            validation_result "PASS" "Tempo config has required section: $section"
        else
            validation_result "FAIL" "Tempo config missing required section: $section"
        fi
    done
    
    # Check storage backend
    if yq eval '.storage.trace.backend' "$config_file" | grep -qE '(local|s3|gcs|azure)'; then
        validation_result "PASS" "Tempo has valid storage backend configured"
    else
        validation_result "WARN" "Tempo storage backend not clearly configured"
    fi
}

# Function to validate OpenTelemetry Collector configuration
validate_otel_config() {
    info "Validating OpenTelemetry Collector configuration..."
    
    local config_file="$OBSERVABILITY_DIR/otel-collector.yml"
    
    if ! validate_yaml_syntax "$config_file" "OpenTelemetry Collector configuration"; then
        return 1
    fi
    
    # Check required sections
    local required_sections=("receivers" "processors" "exporters" "service")
    for section in "${required_sections[@]}"; do
        if yq eval "has(\"$section\")" "$config_file" | grep -q "true"; then
            validation_result "PASS" "OTel Collector config has required section: $section"
        else
            validation_result "FAIL" "OTel Collector config missing required section: $section"
        fi
    done
    
    # Check OTLP receiver
    if yq eval '.receivers | has("otlp")' "$config_file" | grep -q "true"; then
        validation_result "PASS" "OTel Collector has OTLP receiver configured"
    else
        validation_result "WARN" "OTel Collector missing OTLP receiver"
    fi
    
    # Check service pipelines
    local pipelines=$(yq eval '.service.pipelines | keys | length' "$config_file" 2>/dev/null || echo "0")
    if [ "$pipelines" -gt 0 ]; then
        validation_result "PASS" "OTel Collector has $pipelines pipeline(s) configured"
    else
        validation_result "FAIL" "OTel Collector has no pipelines configured"
    fi
}

# Function to validate Alertmanager configuration
validate_alertmanager_config() {
    info "Validating Alertmanager configuration..."
    
    local config_file="$OBSERVABILITY_DIR/alertmanager.yml"
    
    if ! validate_yaml_syntax "$config_file" "Alertmanager configuration"; then
        return 1
    fi
    
    # Check required sections
    local required_sections=("global" "route" "receivers")
    for section in "${required_sections[@]}"; do
        if yq eval "has(\"$section\")" "$config_file" | grep -q "true"; then
            validation_result "PASS" "Alertmanager config has required section: $section"
        else
            validation_result "FAIL" "Alertmanager config missing required section: $section"
        fi
    done
    
    # Check receivers
    local receivers_count=$(yq eval '.receivers | length' "$config_file" 2>/dev/null || echo "0")
    if [ "$receivers_count" -gt 0 ]; then
        validation_result "PASS" "Alertmanager has $receivers_count receiver(s) configured"
    else
        validation_result "WARN" "No receivers configured in Alertmanager"
    fi
    
    # Check route configuration
    if yq eval '.route | has("receiver")' "$config_file" | grep -q "true"; then
        validation_result "PASS" "Alertmanager has default route configured"
    else
        validation_result "FAIL" "Alertmanager missing default route configuration"
    fi
}

# Function to validate Grafana datasources
validate_grafana_datasources() {
    info "Validating Grafana datasources configuration..."
    
    local datasources_file="$OBSERVABILITY_DIR/grafana-datasources.yml"
    
    if ! validate_yaml_syntax "$datasources_file" "Grafana datasources"; then
        return 1
    fi
    
    # Check datasources structure
    if yq eval 'has("datasources")' "$datasources_file" | grep -q "true"; then
        validation_result "PASS" "Grafana datasources have correct structure"
        
        local datasources_count=$(yq eval '.datasources | length' "$datasources_file" 2>/dev/null || echo "0")
        if [ "$datasources_count" -gt 0 ]; then
            validation_result "PASS" "Grafana has $datasources_count datasource(s) configured"
        else
            validation_result "WARN" "No datasources configured in Grafana"
        fi
    else
        validation_result "FAIL" "Grafana datasources missing correct structure"
    fi
    
    # Check for essential datasources
    local essential_datasources=("prometheus" "loki" "tempo")
    for datasource in "${essential_datasources[@]}"; do
        if yq eval '.datasources[].type' "$datasources_file" | grep -q "$datasource"; then
            validation_result "PASS" "Essential datasource configured: $datasource"
        else
            validation_result "WARN" "Essential datasource not found: $datasource"
        fi
    done
}

# Function to validate Grafana dashboards
validate_grafana_dashboards() {
    info "Validating Grafana dashboards..."
    
    local dashboard_files=(
        "$OBSERVABILITY_DIR/grafana-dashboard-system-overview.json"
        "$OBSERVABILITY_DIR/grafana-dashboard-service-health.json"
        "$OBSERVABILITY_DIR/grafana-dashboard-agent-coordination.json"
        "$OBSERVABILITY_DIR/grafana-dashboard-logs.json"
    )
    
    local valid_dashboards=0
    for dashboard_file in "${dashboard_files[@]}"; do
        local dashboard_name=$(basename "$dashboard_file" .json | sed 's/grafana-dashboard-//')
        
        if validate_json_syntax "$dashboard_file" "Dashboard: $dashboard_name"; then
            valid_dashboards=$((valid_dashboards + 1))
            
            # Check dashboard structure
            if jq -e '.dashboard.title' "$dashboard_file" >/dev/null 2>&1; then
                validation_result "PASS" "Dashboard '$dashboard_name' has valid structure"
            else
                validation_result "WARN" "Dashboard '$dashboard_name' may have invalid structure"
            fi
        fi
    done
    
    if [ $valid_dashboards -eq ${#dashboard_files[@]} ]; then
        validation_result "PASS" "All $valid_dashboards dashboard(s) are valid"
    elif [ $valid_dashboards -gt 0 ]; then
        validation_result "WARN" "$valid_dashboards/${#dashboard_files[@]} dashboard(s) are valid"
    else
        validation_result "FAIL" "No valid dashboards found"
    fi
}

# Function to validate Docker Compose configuration
validate_docker_compose() {
    info "Validating Docker Compose configuration..."
    
    local compose_file="$PROJECT_ROOT/docker-compose.logging.yml"
    
    if ! validate_yaml_syntax "$compose_file" "Docker Compose"; then
        return 1
    fi
    
    # Check with docker-compose config command
    if docker-compose -f "$compose_file" config >/dev/null 2>&1; then
        validation_result "PASS" "Docker Compose configuration is valid"
    else
        validation_result "FAIL" "Docker Compose configuration is invalid"
    fi
    
    # Check for essential services
    local essential_services=("prometheus" "grafana" "loki" "tempo" "alertmanager" "otel-collector")
    for service in "${essential_services[@]}"; do
        if yq eval ".services | has(\"$service\")" "$compose_file" | grep -q "true"; then
            validation_result "PASS" "Essential service configured: $service"
        else
            validation_result "WARN" "Essential service not found: $service"
        fi
    done
    
    # Check network configuration
    if yq eval '.networks | has("observability")' "$compose_file" | grep -q "true"; then
        validation_result "PASS" "Observability network is configured"
    else
        validation_result "WARN" "Observability network not configured"
    fi
}

# Function to validate environment variables
validate_environment_vars() {
    info "Validating environment variables..."
    
    local env_file="$PROJECT_ROOT/.env.observability"
    
    if [ -f "$env_file" ]; then
        validation_result "PASS" "Observability environment file exists"
        
        # Check for required variables
        local required_vars=(
            "DEPLOYMENT_ENVIRONMENT"
            "DEPLOYMENT_CLUSTER"
            "GRAFANA_ADMIN_PASSWORD"
            "PROMETHEUS_RETENTION"
        )
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" "$env_file"; then
                validation_result "PASS" "Required environment variable configured: $var"
            else
                validation_result "WARN" "Required environment variable not found: $var"
            fi
        done
    else
        validation_result "WARN" "Observability environment file not found"
        info "Run deploy-observability-stack.sh to create the environment file"
    fi
}

# Function to validate directory structure
validate_directory_structure() {
    info "Validating directory structure..."
    
    local required_dirs=(
        "$PROJECT_ROOT/containers/observability"
        "$PROJECT_ROOT/scripts/observability"
        "$PROJECT_ROOT/data"
        "$PROJECT_ROOT/logs"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            validation_result "PASS" "Required directory exists: $(basename "$dir")"
        else
            validation_result "WARN" "Required directory missing: $(basename "$dir")"
        fi
    done
    
    # Check data directories
    local data_dirs=(
        "$PROJECT_ROOT/data/prometheus"
        "$PROJECT_ROOT/data/grafana"
        "$PROJECT_ROOT/data/loki"
        "$PROJECT_ROOT/data/tempo"
        "$PROJECT_ROOT/data/alertmanager"
    )
    
    local existing_data_dirs=0
    for dir in "${data_dirs[@]}"; do
        if [ -d "$dir" ]; then
            existing_data_dirs=$((existing_data_dirs + 1))
        fi
    done
    
    if [ $existing_data_dirs -eq ${#data_dirs[@]} ]; then
        validation_result "PASS" "All data directories exist"
    elif [ $existing_data_dirs -gt 0 ]; then
        validation_result "WARN" "$existing_data_dirs/${#data_dirs[@]} data directories exist"
    else
        validation_result "WARN" "No data directories exist - will be created on deployment"
    fi
}

# Function to print validation summary
print_validation_summary() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    VALIDATION SUMMARY                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Total Validations:  ${BLUE}$TOTAL_VALIDATIONS${NC}"
    echo -e "Passed:            ${GREEN}$PASSED_VALIDATIONS${NC}"
    echo -e "Warnings:          ${YELLOW}$WARNING_VALIDATIONS${NC}"
    echo -e "Failed:            ${RED}$FAILED_VALIDATIONS${NC}"
    echo ""
    
    local success_rate=$((PASSED_VALIDATIONS * 100 / TOTAL_VALIDATIONS))
    
    if [ $FAILED_VALIDATIONS -eq 0 ]; then
        if [ $WARNING_VALIDATIONS -eq 0 ]; then
            echo -e "${GREEN}🎉 All validations passed! Configuration is ready for deployment.${NC}"
            exit 0
        else
            echo -e "${YELLOW}⚠️  Configuration is mostly valid with some warnings.${NC}"
            echo -e "${YELLOW}   Review warnings above before deployment.${NC}"
            exit 0
        fi
    else
        echo -e "${RED}❌ Some validations failed. Please fix the issues above.${NC}"
        echo ""
        echo "Common fixes:"
        echo "• Check YAML/JSON syntax in configuration files"
        echo "• Ensure all required configuration sections are present"
        echo "• Verify file paths and permissions"
        echo "• Run deploy-observability-stack.sh to create missing files"
        echo ""
        echo "Validation log: $LOG_FILE"
        exit 1
    fi
}

# Main validation function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║         Meta-Agent Factory Observability Configuration      ║"
    echo "║                    Validation Report                        ║"
    echo "║                    Version: $SCRIPT_VERSION                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    info "Starting configuration validation..."
    info "Project root: $PROJECT_ROOT"
    info "Log file: $LOG_FILE"
    
    # Run all validations
    check_tools
    validate_directory_structure
    validate_environment_vars
    validate_docker_compose
    
    # Validate observability configurations
    validate_prometheus_config
    validate_recording_rules
    validate_alert_rules
    validate_loki_config
    validate_promtail_config
    validate_tempo_config
    validate_otel_config
    validate_alertmanager_config
    
    # Validate Grafana configurations
    validate_grafana_datasources
    validate_grafana_dashboards
    
    # Print summary
    print_validation_summary
}

# Handle command line arguments
case "${1:-validate}" in
    "validate")
        main
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  validate     Validate all observability configurations (default)"
        echo "  help         Show this help message"
        echo ""
        echo "This script validates all observability stack configurations including:"
        echo "  • Prometheus configuration and rules"
        echo "  • Loki and Promtail configuration"
        echo "  • Tempo and OpenTelemetry Collector configuration"
        echo "  • Alertmanager configuration"
        echo "  • Grafana datasources and dashboards"
        echo "  • Docker Compose configuration"
        echo "  • Environment variables and directory structure"
        ;;
    *)
        error "Unknown command: $1"
        error "Use '$0 help' to see available commands"
        exit 1
        ;;
esac