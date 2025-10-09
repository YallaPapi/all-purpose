#!/bin/bash

# Meta-Agent Factory Grafana Dashboard Deployment Script
# Task 231.3 - Implement Dashboards and Panels
# Automated deployment script for comprehensive Grafana dashboard infrastructure

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MONITORING_DIR="${SCRIPT_DIR}"
DEPLOYMENT_METHOD="${DEPLOYMENT_METHOD:-kubernetes}"
ENVIRONMENT="${ENVIRONMENT:-production}"
GRAFANA_NAMESPACE="${GRAFANA_NAMESPACE:-grafana-monitoring}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
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

# Helper functions
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    case "${DEPLOYMENT_METHOD}" in
        "kubernetes")
            if ! command -v kubectl &> /dev/null; then
                log_error "kubectl is required but not installed"
                exit 1
            fi
            
            if ! kubectl cluster-info &> /dev/null; then
                log_error "kubectl is not connected to a cluster"
                exit 1
            fi
            ;;
        "grizzly")
            if ! command -v grr &> /dev/null; then
                log_error "grizzly (grr) is required but not installed"
                log_info "Install with: go install github.com/grafana/grizzly/cmd/grr@latest"
                exit 1
            fi
            ;;
        "terraform")
            if ! command -v terraform &> /dev/null; then
                log_error "terraform is required but not installed"
                exit 1
            fi
            ;;
        *)
            log_error "Unknown deployment method: ${DEPLOYMENT_METHOD}"
            log_info "Valid methods: kubernetes, grizzly, terraform"
            exit 1
            ;;
    esac
    
    log_success "Prerequisites check passed"
}

validate_dashboards() {
    log_info "Validating dashboard JSON files..."
    
    local dashboard_dirs=(
        "01-system-overview"
        "02-service-health"
        "03-agent-coordination"
        "04-service-mesh"
        "05-troubleshooting"
        "06-meta-monitoring"
    )
    
    local validation_errors=0
    
    for dir in "${dashboard_dirs[@]}"; do
        local dashboard_path="${MONITORING_DIR}/dashboards/${dir}"
        
        if [[ -d "${dashboard_path}" ]]; then
            log_info "Validating dashboards in ${dir}..."
            
            for dashboard_file in "${dashboard_path}"/*.json; do
                if [[ -f "${dashboard_file}" ]]; then
                    if ! python3 -m json.tool "${dashboard_file}" > /dev/null 2>&1; then
                        log_error "Invalid JSON in ${dashboard_file}"
                        ((validation_errors++))
                    else
                        log_info "✓ $(basename "${dashboard_file}")"
                    fi
                fi
            done
        else
            log_warning "Dashboard directory ${dashboard_path} not found"
        fi
    done
    
    if [[ ${validation_errors} -gt 0 ]]; then
        log_error "Dashboard validation failed with ${validation_errors} errors"
        exit 1
    fi
    
    log_success "Dashboard validation passed"
}

deploy_kubernetes() {
    log_info "Deploying dashboards using Kubernetes Grafana Operator..."
    
    # Create namespace if it doesn't exist
    if ! kubectl get namespace "${GRAFANA_NAMESPACE}" &> /dev/null; then
        log_info "Creating namespace ${GRAFANA_NAMESPACE}..."
        if [[ "${DRY_RUN}" == "true" ]]; then
            log_info "[DRY RUN] Would create namespace ${GRAFANA_NAMESPACE}"
        else
            kubectl create namespace "${GRAFANA_NAMESPACE}"
        fi
    fi
    
    # Apply Grafana Operator configuration
    log_info "Applying Grafana Operator configuration..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would apply:"
        kubectl apply --dry-run=client -f "${MONITORING_DIR}/provisioning/kubernetes-grafana-operator.yaml"
    else
        kubectl apply -f "${MONITORING_DIR}/provisioning/kubernetes-grafana-operator.yaml"
    fi
    
    # Wait for Grafana to be ready
    if [[ "${DRY_RUN}" != "true" ]]; then
        log_info "Waiting for Grafana to be ready..."
        kubectl wait --for=condition=available --timeout=300s deployment/grafana -n "${GRAFANA_NAMESPACE}" || {
            log_error "Grafana deployment failed to become ready"
            exit 1
        }
    fi
    
    # Create ConfigMaps for dashboard JSON files
    log_info "Creating dashboard ConfigMaps..."
    local dashboard_dirs=(
        "01-system-overview"
        "02-service-health"
    )
    
    for dir in "${dashboard_dirs[@]}"; do
        local dashboard_path="${MONITORING_DIR}/dashboards/${dir}"
        local configmap_name="dashboards-${dir}"
        
        if [[ -d "${dashboard_path}" ]]; then
            log_info "Creating ConfigMap ${configmap_name}..."
            if [[ "${DRY_RUN}" == "true" ]]; then
                log_info "[DRY RUN] Would create ConfigMap ${configmap_name}"
            else
                kubectl create configmap "${configmap_name}" \
                    --from-file="${dashboard_path}" \
                    --namespace="${GRAFANA_NAMESPACE}" \
                    --dry-run=client -o yaml | kubectl apply -f -
            fi
        fi
    done
    
    log_success "Kubernetes deployment completed"
}

deploy_grizzly() {
    log_info "Deploying dashboards using Grizzly..."
    
    # Check if Grafana is accessible
    if ! curl -s "${GRAFANA_URL:-http://localhost:3000}/api/health" &> /dev/null; then
        log_error "Grafana is not accessible at ${GRAFANA_URL:-http://localhost:3000}"
        log_info "Please ensure Grafana is running and accessible"
        exit 1
    fi
    
    # Set Grizzly configuration
    export GRIZZLY_CONFIG="${MONITORING_DIR}/provisioning/grizzly-config.yaml"
    
    # Apply configuration
    log_info "Applying Grizzly configuration..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would apply Grizzly configuration"
        grr plan "${MONITORING_DIR}/provisioning/grizzly-config.yaml"
    else
        grr apply "${MONITORING_DIR}/provisioning/grizzly-config.yaml"
    fi
    
    log_success "Grizzly deployment completed"
}

deploy_terraform() {
    log_info "Deploying dashboards using Terraform..."
    
    local terraform_dir="${MONITORING_DIR}/provisioning/terraform"
    
    if [[ ! -d "${terraform_dir}" ]]; then
        log_error "Terraform configuration not found at ${terraform_dir}"
        exit 1
    fi
    
    cd "${terraform_dir}"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY RUN] Would initialize Terraform"
    else
        terraform init
    fi
    
    # Plan deployment
    log_info "Planning Terraform deployment..."
    if [[ "${DRY_RUN}" == "true" ]]; then
        terraform plan -var="environment=${ENVIRONMENT}"
    else
        terraform plan -var="environment=${ENVIRONMENT}" -out=tfplan
    fi
    
    # Apply deployment
    if [[ "${DRY_RUN}" != "true" ]]; then
        log_info "Applying Terraform deployment..."
        terraform apply tfplan
        rm -f tfplan
    fi
    
    cd "${SCRIPT_DIR}"
    log_success "Terraform deployment completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    case "${DEPLOYMENT_METHOD}" in
        "kubernetes")
            # Check Grafana pods
            if kubectl get pods -n "${GRAFANA_NAMESPACE}" -l app=grafana | grep -q Running; then
                log_success "Grafana pods are running"
            else
                log_error "Grafana pods are not running"
                kubectl get pods -n "${GRAFANA_NAMESPACE}" -l app=grafana
                return 1
            fi
            
            # Check folders
            local folders=("system-overview" "service-health")
            for folder in "${folders[@]}"; do
                if kubectl get grafanafolder "${folder}-folder" -n "${GRAFANA_NAMESPACE}" &> /dev/null; then
                    log_success "Folder ${folder} created successfully"
                else
                    log_error "Folder ${folder} not found"
                    return 1
                fi
            done
            ;;
        "grizzly")
            # Verify using Grizzly
            if grr list | grep -q "Dashboard"; then
                log_success "Dashboards deployed successfully"
            else
                log_error "No dashboards found"
                return 1
            fi
            ;;
        "terraform")
            # Verify using Terraform
            cd "${MONITORING_DIR}/provisioning/terraform"
            if terraform show | grep -q "grafana_dashboard"; then
                log_success "Terraform resources deployed successfully"
            else
                log_error "Terraform resources not found"
                return 1
            fi
            cd "${SCRIPT_DIR}"
            ;;
    esac
    
    log_success "Deployment verification completed"
}

setup_monitoring() {
    log_info "Setting up dashboard monitoring..."
    
    # Create monitoring script
    cat > "${MONITORING_DIR}/monitor-dashboards.sh" << 'EOF'
#!/bin/bash
# Dashboard Health Monitoring Script

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

check_dashboard_health() {
    local dashboard_uid="$1"
    local dashboard_name="$2"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" "${GRAFANA_URL}/api/dashboards/uid/${dashboard_uid}")
    
    if [[ "${response}" == "200" ]]; then
        echo "✓ ${dashboard_name}: Healthy"
        return 0
    else
        echo "✗ ${dashboard_name}: Unhealthy (HTTP ${response})"
        return 1
    fi
}

log_info "Checking dashboard health..."

dashboards=(
    "meta-agent-factory-overview:Meta-Agent Factory System Overview"
    "service-registry-health:Service Registry Health"
)

failed_dashboards=0

for dashboard in "${dashboards[@]}"; do
    IFS=':' read -r uid name <<< "${dashboard}"
    if ! check_dashboard_health "${uid}" "${name}"; then
        ((failed_dashboards++))
    fi
done

if [[ ${failed_dashboards} -gt 0 ]]; then
    echo "Dashboard health check failed: ${failed_dashboards} dashboards are unhealthy"
    exit 1
else
    echo "All dashboards are healthy"
fi
EOF
    
    chmod +x "${MONITORING_DIR}/monitor-dashboards.sh"
    log_success "Dashboard monitoring setup completed"
}

cleanup() {
    log_info "Cleaning up deployment resources..."
    
    case "${DEPLOYMENT_METHOD}" in
        "kubernetes")
            if [[ "${DRY_RUN}" == "true" ]]; then
                log_info "[DRY RUN] Would delete namespace ${GRAFANA_NAMESPACE}"
            else
                kubectl delete namespace "${GRAFANA_NAMESPACE}" --ignore-not-found=true
            fi
            ;;
        "grizzly")
            if [[ "${DRY_RUN}" == "true" ]]; then
                log_info "[DRY RUN] Would remove Grizzly resources"
            else
                grr remove "${MONITORING_DIR}/provisioning/grizzly-config.yaml"
            fi
            ;;
        "terraform")
            cd "${MONITORING_DIR}/provisioning/terraform"
            if [[ "${DRY_RUN}" == "true" ]]; then
                log_info "[DRY RUN] Would destroy Terraform resources"
            else
                terraform destroy -auto-approve -var="environment=${ENVIRONMENT}"
            fi
            cd "${SCRIPT_DIR}"
            ;;
    esac
    
    log_success "Cleanup completed"
}

show_usage() {
    cat << EOF
Meta-Agent Factory Grafana Dashboard Deployment Script

Usage: $0 [OPTIONS] COMMAND

Commands:
    deploy      Deploy dashboards and infrastructure
    verify      Verify deployment status
    monitor     Setup dashboard health monitoring
    cleanup     Remove deployed resources
    validate    Validate dashboard JSON files

Options:
    -m, --method METHOD     Deployment method (kubernetes|grizzly|terraform)
    -e, --environment ENV   Environment (production|staging|development)
    -n, --namespace NS      Kubernetes namespace (default: grafana-monitoring)
    -d, --dry-run          Perform dry run without making changes
    -h, --help             Show this help message

Environment Variables:
    DEPLOYMENT_METHOD       Deployment method
    ENVIRONMENT            Target environment
    GRAFANA_NAMESPACE      Kubernetes namespace
    GRAFANA_URL           Grafana URL (for grizzly)
    GRAFANA_TOKEN         Grafana API token
    DRY_RUN               Enable dry run mode

Examples:
    $0 deploy                                    # Deploy using default method
    $0 -m kubernetes deploy                      # Deploy using Kubernetes
    $0 -m grizzly -e staging deploy             # Deploy to staging using Grizzly
    $0 -d deploy                                # Dry run deployment
    $0 verify                                   # Verify deployment
    $0 cleanup                                  # Remove deployed resources

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--method)
            DEPLOYMENT_METHOD="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            GRAFANA_NAMESPACE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        deploy|verify|monitor|cleanup|validate)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate command
if [[ -z "${COMMAND:-}" ]]; then
    log_error "No command specified"
    show_usage
    exit 1
fi

# Main execution
main() {
    case "${COMMAND}" in
        "deploy")
            check_prerequisites
            validate_dashboards
            
            case "${DEPLOYMENT_METHOD}" in
                "kubernetes")
                    deploy_kubernetes
                    ;;
                "grizzly")
                    deploy_grizzly
                    ;;
                "terraform")
                    deploy_terraform
                    ;;
            esac
            
            if [[ "${DRY_RUN}" != "true" ]]; then
                verify_deployment
                setup_monitoring
            fi
            ;;
        "verify")
            check_prerequisites
            verify_deployment
            ;;
        "monitor")
            setup_monitoring
            ;;
        "cleanup")
            check_prerequisites
            cleanup
            ;;
        "validate")
            validate_dashboards
            ;;
        *)
            log_error "Unknown command: ${COMMAND}"
            show_usage
            exit 1
            ;;
    esac
}

# Signal handlers
trap 'log_error "Script interrupted"; exit 130' INT
trap 'log_error "Script terminated"; exit 143' TERM

# Execute main function
main

log_success "Dashboard deployment script completed successfully"