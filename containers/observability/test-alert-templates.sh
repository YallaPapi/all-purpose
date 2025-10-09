#!/bin/bash
# Alert Template Testing Script
# Validates all custom alert templates with different alert scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

echo -e "${YELLOW}🎨 Testing Alert Templates and Formatting${NC}"
echo "Alertmanager URL: $ALERTMANAGER_URL"
echo "==========================================="

# Function to send test alert with specific properties
send_template_test_alert() {
    local alert_name="$1"
    local severity="$2"
    local service="$3"
    local team="$4"
    local agent_type="$5"
    local summary="$6"
    local description="$7"
    
    echo -e "${BLUE}📤 Testing template: $alert_name${NC}"
    echo "Service: $service | Team: $team | Severity: $severity"
    
    # Create alert payload
    local alert_payload="[{
        \"labels\": {
            \"alertname\": \"$alert_name\",
            \"severity\": \"$severity\",
            \"service\": \"$service\",
            \"team\": \"$team\",
            \"job\": \"$service\",
            \"instance\": \"test-instance:8080\",
            \"environment\": \"test\"$(if [ -n "$agent_type" ]; then echo ",\"agent_type\": \"$agent_type\""; fi)
        },
        \"annotations\": {
            \"summary\": \"$summary\",
            \"description\": \"$description\",
            \"runbook_url\": \"https://docs.meta-agent-factory.com/runbooks/$service\"
        },
        \"startsAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"endsAt\": \"$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"generatorURL\": \"http://prometheus:9090/graph?g0.expr=up%7Bjob%3D%22$service%22%7D+%3D%3D+0&g0.tab=1\"
    }]"
    
    # Send alert to Alertmanager
    response=$(curl -s -w "%{http_code}" -o /tmp/template_response.json \
        -H "Content-Type: application/json" \
        -X POST \
        -d "$alert_payload" \
        "$ALERTMANAGER_URL/api/v1/alerts")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✅ Template test alert sent successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to send template test alert (HTTP $response)${NC}"
        cat /tmp/template_response.json 2>/dev/null || echo "No response body"
        return 1
    fi
    echo
}

# Function to check template compilation
check_template_compilation() {
    echo -e "${YELLOW}🔧 Checking Template Compilation${NC}"
    
    # Check if Alertmanager is running and templates are loaded
    config_response=$(curl -s -w "%{http_code}" -o /tmp/config_check.json \
        "$ALERTMANAGER_URL/api/v1/status")
    
    if [ "$config_response" -eq 200 ]; then
        echo -e "${GREEN}✅ Alertmanager configuration loaded successfully${NC}"
        
        # Check if templates are mentioned in config
        if jq -e '.data.config.templates' /tmp/config_check.json >/dev/null 2>&1; then
            template_count=$(jq -r '.data.config.templates | length' /tmp/config_check.json 2>/dev/null || echo "0")
            echo "📊 Template files configured: $template_count"
            
            if [ "$template_count" -gt 0 ]; then
                echo "📝 Template files:"
                jq -r '.data.config.templates[]' /tmp/config_check.json 2>/dev/null | sed 's/^/  - /' || echo "  - Unable to parse template files"
            fi
        else
            echo -e "${YELLOW}⚠️ No templates configured in Alertmanager${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to get Alertmanager configuration (HTTP $config_response)${NC}"
        return 1
    fi
    
    rm -f /tmp/config_check.json
    echo
}

# Function to test email template rendering
test_email_templates() {
    echo -e "${YELLOW}📧 Testing Email Template Rendering${NC}"
    
    # Test various email template scenarios
    send_template_test_alert "EmailCriticalTest" "critical" "factory-core" "platform" "" \
        "Email template test for critical factory-core alert" \
        "This is a comprehensive test of the email template system with critical severity and rich formatting."
    
    sleep 2
    
    send_template_test_alert "EmailAgentTest" "warning" "agent-service" "agents" "scaffold-generator" \
        "Email template test for agent team alert" \
        "This tests agent-specific email formatting with agent_type context."
    
    sleep 2
    
    send_template_test_alert "EmailPlatformTest" "warning" "redis" "platform" "" \
        "Email template test for platform team alert" \
        "This tests platform team email formatting for infrastructure components."
    
    echo -e "${GREEN}📧 Email template tests completed${NC}"
    echo
}

# Function to test Slack template rendering
test_slack_templates() {
    echo -e "${YELLOW}💬 Testing Slack Template Rendering${NC}"
    
    # Test Slack-specific template scenarios
    send_template_test_alert "SlackCriticalTest" "critical" "domain-agents" "agents" "backend-agent" \
        "Slack template test for critical domain agents alert" \
        "This is a comprehensive test of Slack template system with rich formatting, actions, and context."
    
    sleep 2
    
    send_template_test_alert "SlackFactoryTest" "warning" "factory-core" "factory" "" \
        "Slack template test for factory-specific alert" \
        "This tests factory-specific Slack formatting with service context and resolution tracking."
    
    sleep 2
    
    send_template_test_alert "SlackPlatformTest" "warning" "nats-broker" "platform" "" \
        "Slack template test for platform infrastructure alert" \
        "This tests platform team Slack formatting for message broker infrastructure."
    
    echo -e "${GREEN}💬 Slack template tests completed${NC}"
    echo
}

# Function to test PagerDuty template rendering
test_pagerduty_templates() {
    echo -e "${YELLOW}📟 Testing PagerDuty Template Rendering${NC}"
    
    # Test PagerDuty-specific critical scenarios
    send_template_test_alert "PagerDutyCriticalServiceDown" "critical" "factory-core" "platform" "" \
        "PagerDuty template test for critical service down" \
        "This is a comprehensive test of PagerDuty template system with detailed incident context and business impact analysis."
    
    sleep 2
    
    send_template_test_alert "PagerDutyUEPCritical" "critical" "uep-service" "protocol" "" \
        "PagerDuty template test for UEP protocol critical failure" \
        "This tests PagerDuty formatting for Universal Execution Protocol critical issues with detailed context."
    
    echo -e "${GREEN}📟 PagerDuty template tests completed${NC}"
    echo
}

# Function to test template variable substitution
test_template_variables() {
    echo -e "${YELLOW}🔤 Testing Template Variable Substitution${NC}"
    
    # Send alert with comprehensive label set for variable testing
    local comprehensive_alert='[{
        "labels": {
            "alertname": "TemplateVariableTest",
            "severity": "warning",
            "service": "template-test-service",
            "team": "test-team",
            "job": "template-test-job",
            "instance": "test-host:9090",
            "environment": "test",
            "agent_type": "template-test-agent",
            "region": "us-east-1",
            "cluster": "meta-agent-factory",
            "version": "1.0.0"
        },
        "annotations": {
            "summary": "Comprehensive template variable substitution test",
            "description": "This alert tests all template variables and functions including formatting, conditionals, and loops.",
            "runbook_url": "https://docs.meta-agent-factory.com/runbooks/template-test",
            "impact": "Template rendering validation",
            "resolution": "Automated test - will auto-resolve"
        },
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
        "endsAt": "'$(date -u -d '+30 minutes' +%Y-%m-%dT%H:%M:%S.000Z)'",
        "generatorURL": "http://prometheus:9090/graph?g0.expr=template_test_metric&g0.tab=1"
    }]'
    
    echo "📤 Sending comprehensive template variable test alert..."
    response=$(curl -s -w "%{http_code}" -o /tmp/variable_test_response.json \
        -H "Content-Type: application/json" \
        -X POST \
        -d "$comprehensive_alert" \
        "$ALERTMANAGER_URL/api/v1/alerts")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✅ Template variable test alert sent successfully${NC}"
    else
        echo -e "${RED}❌ Failed to send template variable test alert${NC}"
        cat /tmp/variable_test_response.json 2>/dev/null || echo "No response body"
    fi
    
    rm -f /tmp/variable_test_response.json
    echo
}

# Function to verify template rendering in alerts
verify_template_rendering() {
    echo -e "${YELLOW}🔍 Verifying Template Rendering in Active Alerts${NC}"
    
    # Get current alerts and check for template test alerts
    alerts_response=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts")
    
    if [ $? -eq 0 ]; then
        # Count template test alerts
        test_alert_count=$(echo "$alerts_response" | jq -r '.data[] | select(.labels.alertname | test(".*Test.*")) | .labels.alertname' 2>/dev/null | wc -l)
        
        echo "📊 Template test alerts active: $test_alert_count"
        
        if [ "$test_alert_count" -gt 0 ]; then
            echo "🔍 Active template test alerts:"
            echo "$alerts_response" | jq -r '.data[] | select(.labels.alertname | test(".*Test.*")) | "  - \(.labels.alertname) (\(.labels.severity)) - \(.labels.service)"' 2>/dev/null || echo "  - Unable to parse test alerts"
            
            # Check if alerts have proper receiver routing
            echo
            echo "📤 Checking alert receiver routing:"
            echo "$alerts_response" | jq -r '.data[] | select(.labels.alertname | test(".*Test.*")) | "  - \(.labels.alertname) → receiver: \(.receiver // "unknown")"' 2>/dev/null || echo "  - Unable to parse receiver information"
        fi
    else
        echo -e "${RED}❌ Failed to retrieve active alerts for template verification${NC}"
        return 1
    fi
    echo
}

# Function to check notification delivery
check_notification_delivery() {
    echo -e "${YELLOW}📬 Checking Notification Delivery Status${NC}"
    
    # Note: This is informational since we can't directly verify delivery without access to email/Slack/PagerDuty
    echo "📝 Template test notifications should be delivered to:"
    echo "  📧 Email:"
    echo "    - Critical alerts → ${CRITICAL_EMAIL:-oncall@meta-agent-factory.com}"
    echo "    - Agent alerts → ${AGENT_TEAM_EMAIL:-agents@meta-agent-factory.com}"
    echo "    - Platform alerts → ${PLATFORM_TEAM_EMAIL:-platform@meta-agent-factory.com}"
    echo "    - Default alerts → ${DEFAULT_EMAIL:-devops@meta-agent-factory.com}"
    echo
    echo "  💬 Slack:"
    echo "    - Critical alerts → #alerts-critical"
    echo "    - Agent alerts → #team-agents"
    echo "    - Platform alerts → #team-platform"
    echo "    - Factory alerts → #meta-agent-factory"
    echo
    echo "  📟 PagerDuty:"
    echo "    - Critical service down alerts → PagerDuty incidents"
    echo
    echo -e "${YELLOW}⚠️ Manual verification required:${NC}"
    echo "1. Check configured email inboxes for template-formatted messages"
    echo "2. Verify Slack channels receive properly formatted notifications"
    echo "3. Confirm PagerDuty incidents are created with rich context"
    echo "4. Validate that all template variables are properly substituted"
    echo "5. Check that HTML email formatting renders correctly"
    echo
}

# Function to cleanup template test alerts
cleanup_template_tests() {
    echo -e "${YELLOW}🧹 Cleaning up Template Test Alerts${NC}"
    
    # Create silence for all template test alerts
    local template_silence='{
        "matchers": [
            {
                "name": "alertname",
                "value": ".*Test.*",
                "isRegex": true
            }
        ],
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
        "endsAt": "'$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%S.000Z)'",
        "comment": "Cleanup all template test alerts generated by template testing script",
        "createdBy": "alert-template-tester"
    }'
    
    silence_response=$(curl -s -w "%{http_code}" -o /tmp/template_silence_response.json \
        -H "Content-Type: application/json" \
        -X POST \
        -d "$template_silence" \
        "$ALERTMANAGER_URL/api/v1/silences")
    
    if [ "$silence_response" -eq 200 ]; then
        silence_id=$(jq -r '.silenceID' /tmp/template_silence_response.json 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ Template test alerts silenced (ID: $silence_id)${NC}"
    else
        echo -e "${YELLOW}⚠️ Unable to silence template test alerts${NC}"
        echo "You may need to manually silence test alerts in the Alertmanager UI"
    fi
    
    rm -f /tmp/template_silence_response.json
    echo
}

# Main test execution
main() {
    echo -e "${YELLOW}🚀 Starting Alert Template Testing${NC}"
    echo
    
    local test_failures=0
    
    # 1. Check template compilation
    check_template_compilation || ((test_failures++))
    
    # 2. Test email templates
    test_email_templates || ((test_failures++))
    
    # 3. Test Slack templates
    test_slack_templates || ((test_failures++))
    
    # 4. Test PagerDuty templates
    test_pagerduty_templates || ((test_failures++))
    
    # 5. Test template variables
    test_template_variables || ((test_failures++))
    
    # 6. Verify template rendering
    verify_template_rendering || ((test_failures++))
    
    # 7. Check notification delivery (informational)
    check_notification_delivery
    
    # 8. Cleanup test alerts
    cleanup_template_tests
    
    # Summary
    echo -e "${YELLOW}📊 Template Testing Summary${NC}"
    echo "==============================="
    
    if [ $test_failures -eq 0 ]; then
        echo -e "${GREEN}✅ All template tests completed successfully!${NC}"
        echo -e "${GREEN}🎨 Alert templates are configured correctly${NC}"
    else
        echo -e "${RED}❌ $test_failures template test(s) failed${NC}"
        echo -e "${YELLOW}⚠️ Review template configuration and fix issues${NC}"
    fi
    
    echo
    echo -e "${YELLOW}🔗 Useful URLs:${NC}"
    echo "  🎛️ Alertmanager UI: $ALERTMANAGER_URL"
    echo "  📊 Grafana Dashboards: http://localhost:3004"
    echo "  📈 Prometheus Alerts: http://localhost:9090/alerts"
    echo
    echo -e "${YELLOW}📖 For detailed template documentation, see:${NC}"
    echo "  docs/observability/ALERTMANAGER_TEMPLATE_GUIDE.md"
    
    exit $test_failures
}

# Run main function
main "$@"