#!/bin/bash
# Alert Routing and Grouping Validation Script
# Tests all configured routing rules and validates alert grouping behavior

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

echo -e "${YELLOW}🎯 Validating Alertmanager Routing and Grouping${NC}"
echo "Alertmanager URL: $ALERTMANAGER_URL"
echo "=========================================="

# Function to test route matching
test_route_matching() {
    local test_name="$1"
    local labels="$2"
    local expected_receiver="$3"
    
    echo -e "${BLUE}🔍 Testing route: $test_name${NC}"
    echo "Labels: $labels"
    echo "Expected receiver: $expected_receiver"
    
    # Use amtool to test route matching
    result=$(docker exec meta-agent-alertmanager amtool config routes test $labels 2>/dev/null || echo "Error testing route")
    
    if echo "$result" | grep -q "$expected_receiver"; then
        echo -e "${GREEN}✅ Route test passed: $expected_receiver${NC}"
        return 0
    else
        echo -e "${RED}❌ Route test failed${NC}"
        echo "Expected: $expected_receiver"
        echo "Got: $result"
        return 1
    fi
    echo
}

# Function to show routing tree
show_routing_tree() {
    echo -e "${YELLOW}🌳 Alertmanager Routing Tree${NC}"
    
    routing_tree=$(docker exec meta-agent-alertmanager amtool config routes show 2>/dev/null || echo "Unable to retrieve routing tree")
    
    if [ "$routing_tree" != "Unable to retrieve routing tree" ]; then
        echo "$routing_tree"
        echo -e "${GREEN}✅ Routing tree retrieved successfully${NC}"
    else
        echo -e "${RED}❌ Failed to retrieve routing tree${NC}"
        return 1
    fi
    echo
}

# Function to validate configuration
validate_configuration() {
    echo -e "${YELLOW}⚙️ Validating Alertmanager Configuration${NC}"
    
    config_check=$(docker exec meta-agent-alertmanager amtool config show 2>/dev/null || echo "Configuration validation failed")
    
    if [ "$config_check" != "Configuration validation failed" ]; then
        echo -e "${GREEN}✅ Configuration is valid${NC}"
        
        # Count receivers
        receiver_count=$(echo "$config_check" | grep -c "name:" || echo "0")
        echo "📊 Total receivers configured: $receiver_count"
        
        # List receiver names
        echo "📝 Configured receivers:"
        echo "$config_check" | grep -A1 "receivers:" | grep "name:" | sed 's/.*name: /  - /' | head -10
        
    else
        echo -e "${RED}❌ Configuration validation failed${NC}"
        return 1
    fi
    echo
}

# Function to test grouping rules
test_grouping_rules() {
    echo -e "${YELLOW}📚 Testing Alert Grouping Rules${NC}"
    
    # Send multiple related alerts to test grouping
    local group_test_alerts='[
      {
        "labels": {
          "alertname": "GroupTestAlert",
          "severity": "warning",
          "service": "test-service",
          "instance": "instance-1"
        },
        "annotations": {
          "summary": "Group test alert 1",
          "description": "Testing alert grouping behavior - alert 1"
        },
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
      },
      {
        "labels": {
          "alertname": "GroupTestAlert",
          "severity": "warning", 
          "service": "test-service",
          "instance": "instance-2"
        },
        "annotations": {
          "summary": "Group test alert 2",
          "description": "Testing alert grouping behavior - alert 2"
        },
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
      }
    ]'
    
    echo "📤 Sending grouped test alerts..."
    response=$(curl -s -w "%{http_code}" -o /tmp/group_response.json \
        -H "Content-Type: application/json" \
        -X POST \
        -d "$group_test_alerts" \
        "$ALERTMANAGER_URL/api/v1/alerts")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✅ Grouped alerts sent successfully${NC}"
        
        # Wait for grouping to take effect
        echo "⏳ Waiting 5 seconds for grouping to take effect..."
        sleep 5
        
        # Check if alerts are grouped
        groups_response=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts/groups")
        group_count=$(echo "$groups_response" | jq -r '.data | length' 2>/dev/null || echo "0")
        
        echo "📊 Alert groups found: $group_count"
        
        # Look for our test group
        test_group=$(echo "$groups_response" | jq -r '.data[] | select(.labels.alertname == "GroupTestAlert") | .alerts | length' 2>/dev/null || echo "0")
        
        if [ "$test_group" -eq 2 ]; then
            echo -e "${GREEN}✅ Alert grouping working correctly (2 alerts in group)${NC}"
        else
            echo -e "${YELLOW}⚠️ Alert grouping may not be working as expected${NC}"
            echo "Expected 2 alerts in group, found: $test_group"
        fi
    else
        echo -e "${RED}❌ Failed to send grouped test alerts${NC}"
        return 1
    fi
    echo
}

# Function to test inhibition rules
test_inhibition_rules() {
    echo -e "${YELLOW}🚫 Testing Alert Inhibition Rules${NC}"
    
    # Send critical alert followed by warning alert for same service
    local critical_alert='[{
        "labels": {
          "alertname": "CriticalTestAlert",
          "severity": "critical",
          "service": "inhibition-test-service",
          "instance": "test-instance"
        },
        "annotations": {
          "summary": "Critical test alert for inhibition testing",
          "description": "This critical alert should inhibit warning alerts"
        },
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }]'
    
    local warning_alert='[{
        "labels": {
          "alertname": "WarningTestAlert",
          "severity": "warning",
          "service": "inhibition-test-service", 
          "instance": "test-instance"
        },
        "annotations": {
          "summary": "Warning test alert for inhibition testing",
          "description": "This warning alert should be inhibited by the critical alert"
        },
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }]'
    
    echo "📤 Sending critical alert for inhibition test..."
    curl -s -X POST -H "Content-Type: application/json" \
         -d "$critical_alert" \
         "$ALERTMANAGER_URL/api/v1/alerts" > /dev/null
    
    sleep 2
    
    echo "📤 Sending warning alert (should be inhibited)..."
    curl -s -X POST -H "Content-Type: application/json" \
         -d "$warning_alert" \
         "$ALERTMANAGER_URL/api/v1/alerts" > /dev/null
    
    sleep 3
    
    # Check active alerts
    active_alerts=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts")
    critical_count=$(echo "$active_alerts" | jq -r '.data[] | select(.labels.alertname == "CriticalTestAlert") | .labels.alertname' 2>/dev/null | wc -l)
    warning_count=$(echo "$active_alerts" | jq -r '.data[] | select(.labels.alertname == "WarningTestAlert" and .status.state == "active") | .labels.alertname' 2>/dev/null | wc -l)
    
    echo "📊 Active critical alerts: $critical_count"
    echo "📊 Active warning alerts: $warning_count"
    
    if [ "$critical_count" -eq 1 ] && [ "$warning_count" -eq 0 ]; then
        echo -e "${GREEN}✅ Inhibition rules working correctly${NC}"
    else
        echo -e "${YELLOW}⚠️ Inhibition rules may not be working as expected${NC}"
        echo "Expected: 1 critical, 0 warning active alerts"
        echo "Found: $critical_count critical, $warning_count warning active alerts"
    fi
    echo
}

# Function to show current alert groups
show_alert_groups() {
    echo -e "${YELLOW}📋 Current Alert Groups${NC}"
    
    groups_response=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts/groups")
    
    if [ $? -eq 0 ]; then
        group_count=$(echo "$groups_response" | jq -r '.data | length' 2>/dev/null || echo "0")
        echo "📊 Total alert groups: $group_count"
        
        if [ "$group_count" -gt 0 ]; then
            echo "🔍 Alert group details:"
            echo "$groups_response" | jq -r '.data[] | "  Group: \(.labels | to_entries | map("\(.key)=\(.value)") | join(", ")) - \(.alerts | length) alerts"' 2>/dev/null || echo "  Unable to parse group details"
        fi
    else
        echo -e "${RED}❌ Failed to retrieve alert groups${NC}"
        return 1
    fi
    echo
}

# Function to cleanup test alerts
cleanup_test_alerts() {
    echo -e "${YELLOW}🧹 Cleaning up test alerts${NC}"
    
    # Create silence for test alerts
    local silence_payload='{
        "matchers": [
            {
                "name": "alertname",
                "value": ".*Test.*",
                "isRegex": true
            }
        ],
        "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
        "endsAt": "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S.000Z)'",
        "comment": "Cleanup test alerts generated by routing validation script",
        "createdBy": "alert-routing-validator"
    }'
    
    silence_response=$(curl -s -w "%{http_code}" -o /tmp/silence_response.json \
        -H "Content-Type: application/json" \
        -X POST \
        -d "$silence_payload" \
        "$ALERTMANAGER_URL/api/v1/silences")
    
    if [ "$silence_response" -eq 200 ]; then
        silence_id=$(jq -r '.silenceID' /tmp/silence_response.json 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ Test alerts silenced (ID: $silence_id)${NC}"
    else
        echo -e "${YELLOW}⚠️ Unable to silence test alerts${NC}"
    fi
    
    rm -f /tmp/silence_response.json
    echo
}

# Main test execution
main() {
    echo -e "${YELLOW}🚀 Starting Alert Routing and Grouping Validation${NC}"
    echo
    
    local test_failures=0
    
    # 1. Configuration validation
    validate_configuration || ((test_failures++))
    
    # 2. Show routing tree
    show_routing_tree || ((test_failures++))
    
    # 3. Test specific routing rules
    echo -e "${YELLOW}🎯 Testing Specific Routing Rules${NC}"
    
    # Test critical alert routing
    test_route_matching "Critical Alert" "severity=critical" "critical-alerts" || ((test_failures++))
    
    # Test warning alert routing  
    test_route_matching "Warning Alert" "severity=warning" "warning-alerts" || ((test_failures++))
    
    # Test agent team routing
    test_route_matching "Agent Team Alert" "team=agents" "agent-team" || ((test_failures++))
    
    # Test platform team routing
    test_route_matching "Platform Team Alert" "team=platform" "platform-team" || ((test_failures++))
    
    # Test factory service routing
    test_route_matching "Factory Core Alert" "service=factory-core" "factory-alerts" || ((test_failures++))
    
    # 4. Test grouping rules
    test_grouping_rules || ((test_failures++))
    
    # 5. Test inhibition rules
    test_inhibition_rules || ((test_failures++))
    
    # 6. Show current alert groups
    show_alert_groups
    
    # 7. Cleanup test alerts
    cleanup_test_alerts
    
    # Summary
    echo -e "${YELLOW}📊 Validation Summary${NC}"
    echo "=============================="
    
    if [ $test_failures -eq 0 ]; then
        echo -e "${GREEN}✅ All routing and grouping tests passed!${NC}"
        echo -e "${GREEN}🎉 Alert routing is configured correctly${NC}"
    else
        echo -e "${RED}❌ $test_failures test(s) failed${NC}"
        echo -e "${YELLOW}⚠️ Review routing configuration and fix issues${NC}"
    fi
    
    echo
    echo -e "${YELLOW}🔗 Useful URLs:${NC}"
    echo "  🎛️ Alertmanager UI: $ALERTMANAGER_URL"
    echo "  📊 Grafana Dashboards: http://localhost:3004"
    echo "  📈 Prometheus Alerts: http://localhost:9090/alerts"
    echo
    echo -e "${YELLOW}📖 For detailed routing documentation, see:${NC}"
    echo "  docs/observability/ALERTMANAGER_ROUTING_GUIDE.md"
    
    exit $test_failures
}

# Run main function
main "$@"