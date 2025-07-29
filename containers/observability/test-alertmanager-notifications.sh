#!/bin/bash
# Alertmanager Notification Channel Testing Script
# Tests all configured notification channels with sample alerts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

echo -e "${YELLOW}🧪 Testing Alertmanager Notification Channels${NC}"
echo "Alertmanager URL: $ALERTMANAGER_URL"
echo "----------------------------------------"

# Function to send test alert
send_test_alert() {
    local alert_name="$1"
    local severity="$2"
    local summary="$3"
    local description="$4"
    local team="${5:-platform}"
    
    echo -e "${YELLOW}📤 Sending test alert: $alert_name${NC}"
    
    # Create alert payload
    cat << EOF > /tmp/test_alert.json
[
  {
    "labels": {
      "alertname": "$alert_name",
      "severity": "$severity",
      "team": "$team",
      "service": "test-service",
      "instance": "test-instance",
      "job": "test-job",
      "environment": "test"
    },
    "annotations": {
      "summary": "$summary",
      "description": "$description",
      "runbook_url": "https://docs.meta-agent-factory.com/runbooks/test"
    },
    "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
    "endsAt": "$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)",
    "generatorURL": "http://prometheus:9090/graph?g0.expr=up%7Bjob%3D%22test-job%22%7D+%3D%3D+0&g0.tab=1"
  }
]
EOF

    # Send alert to Alertmanager
    response=$(curl -s -w "%{http_code}" -o /tmp/alert_response.json \
        -H "Content-Type: application/json" \
        -X POST \
        -d @/tmp/test_alert.json \
        "$ALERTMANAGER_URL/api/v1/alerts")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✅ Alert sent successfully${NC}"
    else
        echo -e "${RED}❌ Failed to send alert (HTTP $response)${NC}"
        cat /tmp/alert_response.json
        return 1
    fi
    
    # Clean up
    rm -f /tmp/test_alert.json /tmp/alert_response.json
}

# Function to check Alertmanager health
check_alertmanager_health() {
    echo -e "${YELLOW}🏥 Checking Alertmanager health${NC}"
    
    health_response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json \
        "$ALERTMANAGER_URL/-/healthy")
    
    if [ "$health_response" -eq 200 ]; then
        echo -e "${GREEN}✅ Alertmanager is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Alertmanager health check failed (HTTP $health_response)${NC}"
        cat /tmp/health_response.json 2>/dev/null || echo "No response body"
        rm -f /tmp/health_response.json
        return 1
    fi
}

# Function to check configuration
check_alertmanager_config() {
    echo -e "${YELLOW}⚙️ Checking Alertmanager configuration${NC}"
    
    config_response=$(curl -s -w "%{http_code}" -o /tmp/config_response.json \
        "$ALERTMANAGER_URL/api/v1/status")
    
    if [ "$config_response" -eq 200 ]; then
        echo -e "${GREEN}✅ Configuration loaded successfully${NC}"
        
        # Extract receiver count
        receivers=$(jq -r '.data.config.receivers | length' /tmp/config_response.json 2>/dev/null || echo "unknown")
        echo "📊 Number of configured receivers: $receivers"
        
        # List receiver names
        echo "📝 Configured receivers:"
        jq -r '.data.config.receivers[].name' /tmp/config_response.json 2>/dev/null | sed 's/^/  - /' || echo "  - Unable to parse receivers"
        
    else
        echo -e "${RED}❌ Failed to get configuration (HTTP $config_response)${NC}"
        cat /tmp/config_response.json 2>/dev/null || echo "No response body"
        rm -f /tmp/config_response.json
        return 1
    fi
    
    rm -f /tmp/config_response.json
}

# Function to list active alerts
list_active_alerts() {
    echo -e "${YELLOW}📋 Listing active alerts${NC}"
    
    alerts_response=$(curl -s -w "%{http_code}" -o /tmp/alerts_response.json \
        "$ALERTMANAGER_URL/api/v1/alerts")
    
    if [ "$alerts_response" -eq 200 ]; then
        alert_count=$(jq -r '.data | length' /tmp/alerts_response.json 2>/dev/null || echo "0")
        echo "📊 Active alerts: $alert_count"
        
        if [ "$alert_count" -gt 0 ]; then
            echo "🔥 Current active alerts:"
            jq -r '.data[] | "  - \(.labels.alertname) (\(.labels.severity)) - \(.annotations.summary)"' /tmp/alerts_response.json 2>/dev/null || echo "  - Unable to parse alerts"
        fi
    else
        echo -e "${RED}❌ Failed to get alerts (HTTP $alerts_response)${NC}"
        return 1
    fi
    
    rm -f /tmp/alerts_response.json
}

# Main test execution
main() {
    echo -e "${YELLOW}🚀 Starting Alertmanager notification tests${NC}"
    echo
    
    # 1. Health check
    if ! check_alertmanager_health; then
        echo -e "${RED}❌ Alertmanager is not healthy. Aborting tests.${NC}"
        exit 1
    fi
    echo
    
    # 2. Configuration check
    check_alertmanager_config
    echo
    
    # 3. List current alerts
    list_active_alerts
    echo
    
    # 4. Test different notification channels
    echo -e "${YELLOW}📤 Testing notification channels with sample alerts${NC}"
    echo
    
    # Test 1: Warning alert (should go to warning-alerts receiver)
    send_test_alert "TestWarningAlert" "warning" \
        "Test warning alert for notification validation" \
        "This is a test warning alert to validate notification channels are working correctly."
    sleep 2
    
    # Test 2: Critical alert (should go to critical-alerts receiver)
    send_test_alert "TestCriticalAlert" "critical" \
        "Test critical alert for notification validation" \
        "This is a test critical alert to validate critical notification channels including email and Slack."
    sleep 2
    
    # Test 3: Agent team alert (should go to agent-team receiver)
    send_test_alert "TestAgentAlert" "warning" \
        "Test agent alert for team notification validation" \
        "This is a test alert for the agent team to validate team-specific notification routing." \
        "agents"
    sleep 2
    
    # Test 4: Platform team alert (should go to platform-team receiver)
    send_test_alert "TestPlatformAlert" "warning" \
        "Test platform alert for team notification validation" \
        "This is a test alert for the platform team to validate infrastructure notification routing." \
        "platform"
    sleep 2
    
    echo
    echo -e "${GREEN}✅ All test alerts sent successfully!${NC}"
    echo
    echo -e "${YELLOW}📬 Check your configured notification channels for test alerts:${NC}"
    echo "  📧 Email: Check configured email addresses"
    echo "  💬 Slack: Check configured Slack channels"
    echo "  📟 PagerDuty: Check PagerDuty service (critical alerts only)"
    echo
    echo -e "${YELLOW}🔗 View alerts in Alertmanager UI:${NC} $ALERTMANAGER_URL"
    echo -e "${YELLOW}🎛️ View alerts in Grafana:${NC} http://localhost:3004"
    echo
    echo -e "${YELLOW}⚠️ Note: Test alerts will auto-resolve in 1 hour${NC}"
    echo "To silence test alerts immediately, use: $ALERTMANAGER_URL/#/silences"
}

# Run main function
main "$@"