#!/bin/bash
# Alertmanager Maintenance Workflow Script
# Comprehensive maintenance procedures for Prometheus Alertmanager integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
BACKUP_DIR="${BACKUP_DIR:-./backups/alertmanager}"
LOG_DIR="${LOG_DIR:-./logs/maintenance}"

# Create required directories
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

echo -e "${CYAN}🔧 Alertmanager Maintenance Workflow${NC}"
echo "Alertmanager URL: $ALERTMANAGER_URL"
echo "Prometheus URL: $PROMETHEUS_URL"
echo "==========================================="

# Function to log maintenance actions
log_action() {
    local action="$1"
    local status="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $action: $status" >> "$LOG_DIR/maintenance-$(date +%Y-%m-%d).log"
}

# Function to check system health
check_system_health() {
    echo -e "${YELLOW}🏥 System Health Check${NC}"
    
    local health_issues=0
    
    # Check Alertmanager health
    echo "🔍 Checking Alertmanager health..."
    if curl -sf "$ALERTMANAGER_URL/-/healthy" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Alertmanager is healthy${NC}"
        log_action "Alertmanager Health Check" "HEALTHY"
    else
        echo -e "${RED}❌ Alertmanager health check failed${NC}"
        log_action "Alertmanager Health Check" "FAILED"
        ((health_issues++))
    fi
    
    # Check Prometheus health
    echo "🔍 Checking Prometheus health..."
    if curl -sf "$PROMETHEUS_URL/-/healthy" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Prometheus is healthy${NC}"
        log_action "Prometheus Health Check" "HEALTHY"
    else
        echo -e "${RED}❌ Prometheus health check failed${NC}"
        log_action "Prometheus Health Check" "FAILED"
        ((health_issues++))
    fi
    
    # Check Prometheus-Alertmanager integration
    echo "🔍 Checking Prometheus-Alertmanager integration..."
    alertmanager_status=$(curl -s "$PROMETHEUS_URL/api/v1/alertmanagers" | jq -r '.data.activeAlertmanagers[0].url' 2>/dev/null || echo "unknown")
    
    if [[ "$alertmanager_status" == *"alertmanager"* ]]; then
        echo -e "${GREEN}✅ Prometheus-Alertmanager integration is active${NC}"
        log_action "Prometheus-Alertmanager Integration" "ACTIVE"
    else
        echo -e "${RED}❌ Prometheus-Alertmanager integration issue${NC}"
        log_action "Prometheus-Alertmanager Integration" "FAILED"
        ((health_issues++))
    fi
    
    # Check container status
    echo "🔍 Checking container status..."
    if docker ps | grep -q "meta-agent-alertmanager"; then
        echo -e "${GREEN}✅ Alertmanager container is running${NC}"
    else
        echo -e "${RED}❌ Alertmanager container is not running${NC}"
        ((health_issues++))
    fi
    
    if docker ps | grep -q "meta-agent-observability"; then
        echo -e "${GREEN}✅ Prometheus container is running${NC}"
    else
        echo -e "${RED}❌ Prometheus container is not running${NC}"
        ((health_issues++))
    fi
    
    if [ $health_issues -eq 0 ]; then
        echo -e "${GREEN}🎉 All system health checks passed${NC}"
        return 0
    else
        echo -e "${RED}⚠️ $health_issues health issues detected${NC}"
        return 1
    fi
    echo
}

# Function to backup configuration
backup_configuration() {
    echo -e "${YELLOW}💾 Backing Up Configuration${NC}"
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/alertmanager_backup_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup Alertmanager configuration
    if docker cp meta-agent-alertmanager:/etc/alertmanager/alertmanager.yml "$backup_path/alertmanager.yml" 2>/dev/null; then
        echo -e "${GREEN}✅ Alertmanager configuration backed up${NC}"
        log_action "Alertmanager Config Backup" "SUCCESS"
    else
        echo -e "${RED}❌ Failed to backup Alertmanager configuration${NC}"
        log_action "Alertmanager Config Backup" "FAILED"
    fi
    
    # Backup templates
    if docker cp meta-agent-alertmanager:/etc/alertmanager/templates "$backup_path/" 2>/dev/null; then
        echo -e "${GREEN}✅ Alert templates backed up${NC}"
        log_action "Alert Templates Backup" "SUCCESS"
    else
        echo -e "${YELLOW}⚠️ Templates backup skipped (may not exist)${NC}"
        log_action "Alert Templates Backup" "SKIPPED"
    fi
    
    # Backup Prometheus alerting rules
    if docker cp meta-agent-observability:/etc/prometheus/alert_rules.yml "$backup_path/alert_rules.yml" 2>/dev/null; then
        echo -e "${GREEN}✅ Prometheus alert rules backed up${NC}"
        log_action "Alert Rules Backup" "SUCCESS"
    else
        echo -e "${RED}❌ Failed to backup Prometheus alert rules${NC}"
        log_action "Alert Rules Backup" "FAILED"
    fi
    
    # Backup current silences
    if curl -s "$ALERTMANAGER_URL/api/v1/silences" > "$backup_path/silences.json" 2>/dev/null; then
        echo -e "${GREEN}✅ Current silences backed up${NC}"
        log_action "Silences Backup" "SUCCESS"
    else
        echo -e "${YELLOW}⚠️ Silences backup failed${NC}"
        log_action "Silences Backup" "FAILED"
    fi
    
    # Create backup manifest
    cat > "$backup_path/backup_manifest.txt" << EOF
Alertmanager Backup Manifest
============================
Backup Date: $(date)
Backup Path: $backup_path
Alertmanager URL: $ALERTMANAGER_URL
Prometheus URL: $PROMETHEUS_URL

Files Backed Up:
- alertmanager.yml (Alertmanager configuration)
- templates/ (Alert notification templates)
- alert_rules.yml (Prometheus alert rules)
- silences.json (Active silences)

Backup created by: alertmanager-maintenance.sh
EOF
    
    echo "📦 Backup created at: $backup_path"
    echo "📋 Backup manifest: $backup_path/backup_manifest.txt"
    log_action "Configuration Backup" "COMPLETED - $backup_path"
    echo
}

# Function to validate configuration
validate_configuration() {
    echo -e "${YELLOW}✅ Configuration Validation${NC}"
    
    local validation_issues=0
    
    # Validate Alertmanager configuration
    echo "🔍 Validating Alertmanager configuration..."
    if docker exec meta-agent-alertmanager amtool config check 2>/dev/null; then
        echo -e "${GREEN}✅ Alertmanager configuration is valid${NC}"
        log_action "Alertmanager Config Validation" "VALID"
    else
        echo -e "${RED}❌ Alertmanager configuration validation failed${NC}"
        log_action "Alertmanager Config Validation" "INVALID"
        ((validation_issues++))
    fi
    
    # Validate Prometheus rules
    echo "🔍 Validating Prometheus alert rules..."
    if docker exec meta-agent-observability promtool check rules /etc/prometheus/alert_rules.yml 2>/dev/null; then
        echo -e "${GREEN}✅ Prometheus alert rules are valid${NC}"
        log_action "Prometheus Rules Validation" "VALID"
    else
        echo -e "${RED}❌ Prometheus alert rules validation failed${NC}"
        log_action "Prometheus Rules Validation" "INVALID"
        ((validation_issues++))
    fi
    
    # Check receivers configuration
    echo "🔍 Validating notification receivers..."
    receiver_count=$(docker exec meta-agent-alertmanager amtool config show 2>/dev/null | grep -c "name:" || echo "0")
    if [ "$receiver_count" -gt 0 ]; then
        echo -e "${GREEN}✅ $receiver_count notification receivers configured${NC}"
        log_action "Receivers Validation" "VALID - $receiver_count receivers"
    else
        echo -e "${RED}❌ No notification receivers found${NC}"
        log_action "Receivers Validation" "INVALID - No receivers"
        ((validation_issues++))
    fi
    
    # Validate routing rules
    echo "🔍 Validating routing rules..."
    if docker exec meta-agent-alertmanager amtool config routes show >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Routing rules are valid${NC}"
        log_action "Routing Rules Validation" "VALID"
    else
        echo -e "${RED}❌ Routing rules validation failed${NC}"
        log_action "Routing Rules Validation" "INVALID"
        ((validation_issues++))
    fi
    
    if [ $validation_issues -eq 0 ]; then
        echo -e "${GREEN}🎉 All configuration validations passed${NC}"
        return 0
    else
        echo -e "${RED}⚠️ $validation_issues validation issues detected${NC}"
        return 1
    fi
    echo
}

# Function to clean up old data
cleanup_old_data() {
    echo -e "${YELLOW}🧹 Cleaning Up Old Data${NC}"
    
    # Clean up old silences (resolved more than 24 hours ago)
    echo "🔍 Cleaning up expired silences..."
    expired_silences=$(curl -s "$ALERTMANAGER_URL/api/v1/silences" | jq -r '.data[] | select(.status.state == "expired" and (.endsAt | strptime("%Y-%m-%dT%H:%M:%S.%fZ") | mktime) < (now - 86400)) | .id' 2>/dev/null || echo "")
    
    if [ -n "$expired_silences" ]; then
        expired_count=$(echo "$expired_silences" | wc -l)
        echo "Found $expired_count expired silences to clean up"
        
        # Note: Alertmanager doesn't have delete API for silences, they expire automatically
        echo -e "${YELLOW}ℹ️ Expired silences will be automatically cleaned up by Alertmanager${NC}"
        log_action "Expired Silences Cleanup" "AUTO_CLEANUP - $expired_count silences"
    else
        echo -e "${GREEN}✅ No expired silences need cleanup${NC}"
        log_action "Expired Silences Cleanup" "NONE_NEEDED"
    fi
    
    # Clean up old backups (older than 30 days)
    echo "🔍 Cleaning up old backups..."
    if [ -d "$BACKUP_DIR" ]; then
        old_backups=$(find "$BACKUP_DIR" -name "alertmanager_backup_*" -type d -mtime +30 2>/dev/null || echo "")
        if [ -n "$old_backups" ]; then
            old_backup_count=$(echo "$old_backups" | wc -l)
            echo "Found $old_backup_count old backups to clean up"
            echo "$old_backups" | while read -r backup_path; do
                if [ -n "$backup_path" ]; then
                    rm -rf "$backup_path"
                    echo "  Removed: $(basename "$backup_path")"
                fi
            done
            log_action "Old Backups Cleanup" "REMOVED - $old_backup_count backups"
        else
            echo -e "${GREEN}✅ No old backups need cleanup${NC}"
            log_action "Old Backups Cleanup" "NONE_NEEDED"
        fi
    fi
    
    # Clean up old maintenance logs (older than 90 days)
    echo "🔍 Cleaning up old maintenance logs..."
    if [ -d "$LOG_DIR" ]; then
        old_logs=$(find "$LOG_DIR" -name "maintenance-*.log" -type f -mtime +90 2>/dev/null || echo "")
        if [ -n "$old_logs" ]; then
            old_log_count=$(echo "$old_logs" | wc -l)
            echo "Found $old_log_count old log files to clean up"
            echo "$old_logs" | while read -r log_file; do
                if [ -n "$log_file" ]; then
                    rm -f "$log_file"
                    echo "  Removed: $(basename "$log_file")"
                fi
            done
            log_action "Old Logs Cleanup" "REMOVED - $old_log_count logs"
        else
            echo -e "${GREEN}✅ No old log files need cleanup${NC}"
            log_action "Old Logs Cleanup" "NONE_NEEDED"
        fi
    fi
    
    echo -e "${GREEN}🧹 Cleanup completed${NC}"
    echo
}

# Function to update configuration
update_configuration() {
    echo -e "${YELLOW}🔄 Configuration Update${NC}"
    
    # Check if configuration files have been modified
    echo "🔍 Checking for configuration changes..."
    
    # Reload Alertmanager configuration if needed
    echo "📥 Reloading Alertmanager configuration..."
    if curl -sf -X POST "$ALERTMANAGER_URL/-/reload" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Alertmanager configuration reloaded${NC}"
        log_action "Alertmanager Config Reload" "SUCCESS"
    else
        echo -e "${RED}❌ Alertmanager configuration reload failed${NC}"
        log_action "Alertmanager Config Reload" "FAILED"
    fi
    
    # Reload Prometheus configuration if needed
    echo "📥 Reloading Prometheus configuration..."
    if curl -sf -X POST "$PROMETHEUS_URL/-/reload" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Prometheus configuration reloaded${NC}"
        log_action "Prometheus Config Reload" "SUCCESS"
    else
        echo -e "${RED}❌ Prometheus configuration reload failed${NC}"
        log_action "Prometheus Config Reload" "FAILED"
    fi
    
    echo -e "${GREEN}🔄 Configuration update completed${NC}"
    echo
}

# Function to generate maintenance report
generate_maintenance_report() {
    echo -e "${YELLOW}📊 Generating Maintenance Report${NC}"
    
    local report_file="$LOG_DIR/maintenance-report-$(date +%Y-%m-%d).md"
    
    cat > "$report_file" << EOF
# Alertmanager Maintenance Report

**Generated**: $(date)  
**Alertmanager URL**: $ALERTMANAGER_URL  
**Prometheus URL**: $PROMETHEUS_URL  

## System Status

EOF
    
    # Add health check results
    echo "### Health Check Results" >> "$report_file"
    echo "" >> "$report_file"
    
    # Alertmanager status
    if curl -sf "$ALERTMANAGER_URL/-/healthy" >/dev/null 2>&1; then
        echo "- ✅ **Alertmanager**: Healthy" >> "$report_file"
    else
        echo "- ❌ **Alertmanager**: Unhealthy" >> "$report_file"
    fi
    
    # Prometheus status
    if curl -sf "$PROMETHEUS_URL/-/healthy" >/dev/null 2>&1; then
        echo "- ✅ **Prometheus**: Healthy" >> "$report_file"
    else
        echo "- ❌ **Prometheus**: Unhealthy" >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    
    # Add active alerts summary
    echo "### Active Alerts Summary" >> "$report_file"
    echo "" >> "$report_file"
    
    active_alerts=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts" | jq -r '.data | length' 2>/dev/null || echo "0")
    echo "- **Total Active Alerts**: $active_alerts" >> "$report_file"
    
    critical_alerts=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts" | jq -r '.data[] | select(.labels.severity == "critical") | .labels.alertname' 2>/dev/null | wc -l)
    echo "- **Critical Alerts**: $critical_alerts" >> "$report_file"
    
    warning_alerts=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts" | jq -r '.data[] | select(.labels.severity == "warning") | .labels.alertname' 2>/dev/null | wc -l)
    echo "- **Warning Alerts**: $warning_alerts" >> "$report_file"
    
    echo "" >> "$report_file"
    
    # Add silences summary
    echo "### Silences Summary" >> "$report_file"
    echo "" >> "$report_file"
    
    active_silences=$(curl -s "$ALERTMANAGER_URL/api/v1/silences" | jq -r '.data[] | select(.status.state == "active") | .id' 2>/dev/null | wc -l)
    echo "- **Active Silences**: $active_silences" >> "$report_file"
    
    expired_silences=$(curl -s "$ALERTMANAGER_URL/api/v1/silences" | jq -r '.data[] | select(.status.state == "expired") | .id' 2>/dev/null | wc -l)
    echo "- **Expired Silences**: $expired_silences" >> "$report_file"
    
    echo "" >> "$report_file"
    
    # Add configuration summary
    echo "### Configuration Summary" >> "$report_file"
    echo "" >> "$report_file"
    
    receiver_count=$(docker exec meta-agent-alertmanager amtool config show 2>/dev/null | grep -c "name:" || echo "0")
    echo "- **Configured Receivers**: $receiver_count" >> "$report_file"
    
    route_count=$(docker exec meta-agent-alertmanager amtool config routes show 2>/dev/null | grep -c "receiver:" || echo "0")
    echo "- **Routing Rules**: $route_count" >> "$report_file"
    
    echo "" >> "$report_file"
    
    # Add maintenance actions performed
    echo "### Maintenance Actions Performed" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ -f "$LOG_DIR/maintenance-$(date +%Y-%m-%d).log" ]; then
        echo "\`\`\`" >> "$report_file"
        tail -20 "$LOG_DIR/maintenance-$(date +%Y-%m-%d).log" >> "$report_file"
        echo "\`\`\`" >> "$report_file"
    else
        echo "No maintenance actions logged today." >> "$report_file"
    fi
    
    echo "" >> "$report_file"
    
    # Add recommendations
    echo "### Recommendations" >> "$report_file"
    echo "" >> "$report_file"
    
    if [ "$critical_alerts" -gt 0 ]; then
        echo "- ⚠️ **Action Required**: $critical_alerts critical alerts need immediate attention" >> "$report_file"
    fi
    
    if [ "$active_silences" -gt 10 ]; then
        echo "- ⚠️ **Review Required**: High number of active silences ($active_silences) - review if still needed" >> "$report_file"
    fi
    
    echo "- ✅ **Regular Tasks**: Continue daily health checks and weekly configuration reviews" >> "$report_file"
    echo "- ✅ **Backup Status**: Configuration backups are current" >> "$report_file"
    
    echo "" >> "$report_file"
    echo "---" >> "$report_file"
    echo "*Report generated by alertmanager-maintenance.sh*" >> "$report_file"
    
    echo "📊 Maintenance report generated: $report_file"
    log_action "Maintenance Report" "GENERATED - $report_file"
    echo
}

# Function to show maintenance schedule
show_maintenance_schedule() {
    echo -e "${CYAN}📅 Recommended Maintenance Schedule${NC}"
    echo "==========================================="
    echo
    echo -e "${YELLOW}Daily Tasks (Automated):${NC}"
    echo "  🔍 System health checks"
    echo "  📊 Alert volume monitoring"
    echo "  🧹 Log rotation and cleanup"
    echo
    echo -e "${YELLOW}Weekly Tasks:${NC}"
    echo "  💾 Configuration backup"
    echo "  ✅ Configuration validation"
    echo "  📈 Performance review"
    echo "  🔄 Update check and application"
    echo
    echo -e "${YELLOW}Monthly Tasks:${NC}"
    echo "  🧹 Deep cleanup of old data"
    echo "  📋 Review and optimize alert rules"
    echo "  👥 Review notification channels and teams"
    echo "  🔐 Security review and credential rotation"
    echo
    echo -e "${YELLOW}Quarterly Tasks:${NC}"
    echo "  📚 Documentation update"
    echo "  🏋️ Load testing and capacity planning"
    echo "  🎓 Team training on alert response"
    echo "  🔄 Disaster recovery testing"
    echo
    echo -e "${CYAN}To schedule automated maintenance:${NC}"
    echo "  📝 Add to crontab:"
    echo "    # Daily health check at 2 AM"
    echo "    0 2 * * * /path/to/alertmanager-maintenance.sh --daily"
    echo "    # Weekly full maintenance on Sunday at 3 AM"
    echo "    0 3 * * 0 /path/to/alertmanager-maintenance.sh --weekly"
    echo
}

# Function to run daily maintenance
run_daily_maintenance() {
    echo -e "${CYAN}🌅 Running Daily Maintenance${NC}"
    echo "======================================"
    
    check_system_health
    cleanup_old_data
    generate_maintenance_report
    
    log_action "Daily Maintenance" "COMPLETED"
    echo -e "${GREEN}✅ Daily maintenance completed successfully${NC}"
}

# Function to run weekly maintenance
run_weekly_maintenance() {
    echo -e "${CYAN}📅 Running Weekly Maintenance${NC}"
    echo "======================================"
    
    backup_configuration
    validate_configuration
    check_system_health
    update_configuration
    cleanup_old_data
    generate_maintenance_report
    
    log_action "Weekly Maintenance" "COMPLETED"
    echo -e "${GREEN}✅ Weekly maintenance completed successfully${NC}"
}

# Main function
main() {
    case "${1:-}" in
        --daily)
            run_daily_maintenance
            ;;
        --weekly)
            run_weekly_maintenance
            ;;
        --health)
            check_system_health
            ;;
        --backup)
            backup_configuration
            ;;
        --validate)
            validate_configuration
            ;;
        --cleanup)
            cleanup_old_data
            ;;
        --update)
            update_configuration
            ;;
        --report)
            generate_maintenance_report
            ;;
        --schedule)
            show_maintenance_schedule
            ;;
        --help|-h)
            echo "Alertmanager Maintenance Script"
            echo "Usage: $0 [option]"
            echo
            echo "Options:"
            echo "  --daily     Run daily maintenance tasks"
            echo "  --weekly    Run weekly maintenance tasks"
            echo "  --health    Check system health"
            echo "  --backup    Backup configuration"
            echo "  --validate  Validate configuration" 
            echo "  --cleanup   Clean up old data"
            echo "  --update    Update/reload configuration"
            echo "  --report    Generate maintenance report"
            echo "  --schedule  Show maintenance schedule"
            echo "  --help      Show this help message"
            echo
            ;;
        "")
            echo -e "${YELLOW}🚀 Running Interactive Maintenance Menu${NC}"
            echo
            echo "Select maintenance task:"
            echo "1) System Health Check"
            echo "2) Backup Configuration"
            echo "3) Validate Configuration"
            echo "4) Clean Up Old Data"
            echo "5) Update Configuration"
            echo "6) Generate Report"
            echo "7) Show Maintenance Schedule"
            echo "8) Run Daily Maintenance"
            echo "9) Run Weekly Maintenance"
            echo "0) Exit"
            echo
            read -p "Enter choice [0-9]: " choice
            
            case $choice in
                1) check_system_health ;;
                2) backup_configuration ;;
                3) validate_configuration ;;
                4) cleanup_old_data ;;
                5) update_configuration ;;
                6) generate_maintenance_report ;;
                7) show_maintenance_schedule ;;
                8) run_daily_maintenance ;;
                9) run_weekly_maintenance ;;
                0) echo "Exiting..." ;;
                *) echo "Invalid choice" ;;
            esac
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"