#!/bin/bash

# =============================================================================
# UEP Dockerfile Template Validator
# =============================================================================
# 
# This script validates Dockerfile templates against UEP best practices,
# security requirements, and production readiness standards.
#
# Usage:
#   ./validate-template.sh [dockerfile-path]
#   ./validate-template.sh Dockerfile.base-agent
#
# Exit codes:
#   0 - All validations passed
#   1 - Validation failures found
#   2 - Script error or missing dependencies
#
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Default Dockerfile to validate
DOCKERFILE="${1:-Dockerfile.base-agent}"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

log_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
    echo ""
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_fail "Required command '$1' not found"
        exit 2
    fi
}

# =============================================================================
# Validation Functions
# =============================================================================

validate_file_exists() {
    log_header "File Validation"
    
    if [[ -f "$DOCKERFILE" ]]; then
        log_pass "Dockerfile exists: $DOCKERFILE"
    else
        log_fail "Dockerfile not found: $DOCKERFILE"
        exit 2
    fi
    
    # Check for corresponding .dockerignore
    local dockerignore_file="${DOCKERFILE%/*}/.dockerignore.base-agent"
    if [[ -f "$dockerignore_file" ]]; then
        log_pass ".dockerignore template exists"
    else
        log_warn ".dockerignore template not found: $dockerignore_file"
    fi
}

validate_dockerfile_syntax() {
    log_header "Dockerfile Syntax Validation"
    
    # Check if hadolint is available
    if command -v hadolint &> /dev/null; then
        log_info "Running hadolint syntax check..."
        if hadolint "$DOCKERFILE"; then
            log_pass "Dockerfile syntax is valid (hadolint)"
        else
            log_fail "Dockerfile syntax issues found (hadolint)"
        fi
    else
        log_warn "hadolint not available for syntax checking"
    fi
    
    # Basic syntax checks
    if grep -q "^FROM " "$DOCKERFILE"; then
        log_pass "Contains FROM instruction"
    else
        log_fail "Missing FROM instruction"
    fi
}

validate_security_practices() {
    log_header "Security Best Practices"
    
    # Check for non-root user
    if grep -q "USER.*agent" "$DOCKERFILE"; then
        log_pass "Uses non-root user (agent)"
    else
        log_fail "Does not specify non-root user"
    fi
    
    # Check for specific UID/GID
    if grep -q "adduser.*1000" "$DOCKERFILE"; then
        log_pass "Uses specific UID (1000) for security"
    else
        log_warn "Should specify explicit UID for consistency"
    fi
    
    # Check for Alpine base image
    if grep -q "FROM.*alpine" "$DOCKERFILE"; then
        log_pass "Uses Alpine Linux base image"
    else
        log_warn "Consider using Alpine Linux for smaller attack surface"
    fi
    
    # Check that secrets are not copied
    if grep -E "COPY.*\.(env|key|pem|crt|secret)" "$DOCKERFILE"; then
        log_fail "Appears to copy secret files (security risk)"
    else
        log_pass "Does not copy secret files"
    fi
    
    # Check for security updates
    if grep -q "apk.*upgrade" "$DOCKERFILE"; then
        log_pass "Includes security updates (apk upgrade)"
    else
        log_warn "Should include security updates"
    fi
}

validate_multi_stage_build() {
    log_header "Multi-stage Build Validation"
    
    # Count FROM instructions
    local from_count=$(grep -c "^FROM " "$DOCKERFILE")
    if [[ $from_count -gt 1 ]]; then
        log_pass "Uses multi-stage build ($from_count stages)"
    else
        log_fail "Should use multi-stage build for optimization"
    fi
    
    # Check for named stages
    if grep -q "FROM.*AS " "$DOCKERFILE"; then
        log_pass "Uses named build stages"
    else
        log_warn "Consider using named stages for clarity"
    fi
    
    # Check for production stage
    if grep -q "AS production" "$DOCKERFILE"; then
        log_pass "Has production build stage"
    else
        log_fail "Missing production build stage"
    fi
    
    # Check for development stage
    if grep -q "AS development" "$DOCKERFILE"; then
        log_pass "Has development build stage"
    else
        log_warn "Consider adding development build stage"
    fi
}

validate_build_optimization() {
    log_header "Build Optimization"
    
    # Check for BuildKit syntax
    if grep -q "syntax=docker/dockerfile" "$DOCKERFILE"; then
        log_pass "Uses BuildKit syntax for optimization"
    else
        log_warn "Consider using BuildKit syntax for better builds"
    fi
    
    # Check for layer caching (package.json copied before source)
    if grep -n "COPY.*package" "$DOCKERFILE" | head -1 | cut -d: -f1 | read -r pkg_line && \
       grep -n "COPY.*src" "$DOCKERFILE" | head -1 | cut -d: -f1 | read -r src_line; then
        if [[ $pkg_line -lt $src_line ]]; then
            log_pass "Package files copied before source (good for caching)"
        else
            log_warn "Consider copying package files before source code"
        fi
    fi
    
    # Check for npm ci usage
    if grep -q "npm ci" "$DOCKERFILE"; then
        log_pass "Uses 'npm ci' for reproducible builds"
    else
        log_warn "Consider using 'npm ci' instead of 'npm install'"
    fi
    
    # Check for cleaning package manager cache
    if grep -q "npm cache clean" "$DOCKERFILE"; then
        log_pass "Cleans npm cache to reduce image size"
    else
        log_warn "Consider cleaning npm cache to reduce image size"
    fi
}

validate_runtime_configuration() {
    log_header "Runtime Configuration"
    
    # Check for health check
    if grep -q "HEALTHCHECK" "$DOCKERFILE"; then
        log_pass "Includes health check configuration"
    else
        log_fail "Missing HEALTHCHECK instruction"
    fi
    
    # Check for proper entrypoint
    if grep -q "ENTRYPOINT.*tini" "$DOCKERFILE"; then
        log_pass "Uses tini as init system"
    else
        log_warn "Consider using tini as init system for proper signal handling"
    fi
    
    # Check for exposed ports
    if grep -q "EXPOSE " "$DOCKERFILE"; then
        log_pass "Exposes application ports"
    else
        log_warn "Consider documenting exposed ports with EXPOSE"
    fi
    
    # Check for working directory
    if grep -q "WORKDIR " "$DOCKERFILE"; then
        log_pass "Sets working directory"
    else
        log_fail "Should set WORKDIR"
    fi
    
    # Check for signal handling script
    if grep -q "start.sh" "$DOCKERFILE"; then
        log_pass "Includes startup script (likely with signal handling)"
    else
        log_warn "Consider using startup script for proper signal handling"
    fi
}

validate_labels_and_metadata() {
    log_header "Labels and Metadata"
    
    # Check for OCI labels
    if grep -q "org.opencontainers.image" "$DOCKERFILE"; then
        log_pass "Uses OCI-compliant labels"
    else
        log_warn "Consider adding OCI-compliant labels"
    fi
    
    # Check for UEP-specific labels
    if grep -q "uep.agent" "$DOCKERFILE"; then
        log_pass "Includes UEP-specific labels"
    else
        log_warn "Consider adding UEP-specific labels"
    fi
    
    # Check for build args
    if grep -q "ARG.*BUILD_DATE" "$DOCKERFILE"; then
        log_pass "Includes build date argument"
    else
        log_warn "Consider adding BUILD_DATE argument"
    fi
    
    if grep -q "ARG.*GIT_COMMIT" "$DOCKERFILE"; then
        log_pass "Includes git commit argument"
    else
        log_warn "Consider adding GIT_COMMIT argument"
    fi
}

validate_environment_variables() {
    log_header "Environment Variables"
    
    # Check for NODE_ENV
    if grep -q "NODE_ENV" "$DOCKERFILE"; then
        log_pass "Configures NODE_ENV"
    else
        log_warn "Consider setting NODE_ENV"
    fi
    
    # Check for agent identification variables
    if grep -q "AGENT_TYPE" "$DOCKERFILE"; then
        log_pass "Includes AGENT_TYPE environment variable"
    else
        log_warn "Consider adding AGENT_TYPE environment variable"
    fi
    
    # Check for port configuration
    if grep -q "SERVICE_PORT" "$DOCKERFILE"; then
        log_pass "Configures SERVICE_PORT"
    else
        log_warn "Consider adding SERVICE_PORT environment variable"
    fi
}

validate_resource_configuration() {
    log_header "Resource Configuration"
    
    # Check for resource limit documentation
    if grep -q "MEMORY_LIMIT\|CPU_LIMIT" "$DOCKERFILE"; then
        log_pass "Documents resource limits"
    else
        log_warn "Consider documenting resource limits"
    fi
    
    # Check for volume definitions
    if grep -q "VOLUME " "$DOCKERFILE"; then
        log_pass "Defines volume mount points"
    else
        log_warn "Consider defining volume mount points"
    fi
}

validate_build_test() {
    log_header "Build Test"
    
    log_info "Testing if Dockerfile can be built..."
    
    # Create a temporary directory for build test
    local temp_dir=$(mktemp -d)
    local dockerfile_name=$(basename "$DOCKERFILE")
    
    # Copy Dockerfile to temp directory
    cp "$DOCKERFILE" "$temp_dir/Dockerfile"
    
    # Create minimal package.json for build test
    cat > "$temp_dir/package.json" << 'EOF'
{
  "name": "test-agent",
  "version": "1.0.0",
  "main": "src/index.js",
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF
    
    # Create minimal source file
    mkdir -p "$temp_dir/src"
    cat > "$temp_dir/src/index.js" << 'EOF'
const express = require('express');
const app = express();
const port = process.env.SERVICE_PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Test agent running on port ${port}`);
});
EOF
    
    # Create .dockerignore
    cat > "$temp_dir/.dockerignore" << 'EOF'
node_modules
*.log
.git
EOF
    
    # Test build
    if cd "$temp_dir" && docker build --target production -t test-dockerfile-validation . &> /dev/null; then
        log_pass "Dockerfile builds successfully"
        # Clean up test image
        docker rmi test-dockerfile-validation &> /dev/null || true
    else
        log_fail "Dockerfile fails to build"
    fi
    
    # Clean up
    rm -rf "$temp_dir"
}

# =============================================================================
# Main Validation Flow
# =============================================================================

main() {
    log_info "UEP Dockerfile Template Validator"
    log_info "Validating: $DOCKERFILE"
    
    # Check dependencies
    check_command "docker"
    
    # Run all validations
    validate_file_exists
    validate_dockerfile_syntax
    validate_security_practices
    validate_multi_stage_build
    validate_build_optimization
    validate_runtime_configuration
    validate_labels_and_metadata
    validate_environment_variables
    validate_resource_configuration
    
    # Optional build test (can be slow)
    if [[ "${BUILD_TEST:-false}" == "true" ]]; then
        validate_build_test
    fi
    
    # Summary
    log_header "Validation Summary"
    echo -e "✅ ${GREEN}Passed${NC}: $PASS_COUNT"
    echo -e "❌ ${RED}Failed${NC}: $FAIL_COUNT"
    echo -e "⚠️  ${YELLOW}Warnings${NC}: $WARN_COUNT"
    
    if [[ $FAIL_COUNT -eq 0 ]]; then
        echo ""
        log_info "🎉 All critical validations passed!"
        if [[ $WARN_COUNT -gt 0 ]]; then
            log_info "💡 Consider addressing warnings for optimal results"
        fi
        exit 0
    else
        echo ""
        log_info "❌ $FAIL_COUNT critical issues found. Please fix before using this template."
        exit 1
    fi
}

# Run main function
main "$@"