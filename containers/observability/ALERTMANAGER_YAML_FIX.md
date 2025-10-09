# Alertmanager YAML Configuration Fix: "Too Many Colons in Address"

## Problem Description

When using environment variables with default values containing colons in Alertmanager YAML configuration, you may encounter the error:

```
too many colons in address
```

This happens specifically with configurations like:
```yaml
smtp_smarthost: '${SMTP_HOST:-localhost:587}'
```

The YAML parser interprets the colon in `localhost:587` as a key-value separator, causing parsing errors.

## Root Cause

The issue occurs because:
1. YAML uses colons (`:`) as key-value separators
2. Environment variable default values like `${SMTP_HOST:-localhost:587}` contain colons
3. Even when quoted, some YAML parsers struggle with nested quoting in environment substitution

## Solutions Implemented

### Solution 1: Proper Quoting (Primary Fix)

**Fixed Configuration:**
```yaml
global:
  # Use double quotes around default values containing colons
  smtp_smarthost: '${SMTP_HOST:-"localhost:587"}'
  smtp_from: '${ALERT_EMAIL_FROM:-"alerts@meta-agent-factory.com"}'
  smtp_auth_username: '${SMTP_USERNAME:-""}'
  smtp_auth_password: '${SMTP_PASSWORD:-""}'
  smtp_require_tls: ${SMTP_REQUIRE_TLS:-true}
```

**Key Changes:**
- Wrap default values containing colons in double quotes: `"localhost:587"`
- Ensure empty string defaults are properly quoted: `""`
- Boolean values don't need inner quotes: `${SMTP_REQUIRE_TLS:-true}`

### Solution 2: Conditional Configuration (Alternative)

For completely optional SMTP, use the conditional configuration file:
```bash
# Use the conditional configuration
cp containers/observability/alertmanager-conditional.yml containers/observability/alertmanager.yml
```

This approach:
- Uses webhook receivers when SMTP is not configured
- Falls back to email receivers when SMTP is available
- Supports Slack-only notifications
- Handles missing environment variables gracefully

## Environment Variable Setup

### Option 1: Use the Setup Script
```bash
cd containers/observability
./setup-alertmanager-env.sh
```

### Option 2: Manual Configuration

Add to your `.env` file:

**For Email + Slack:**
```bash
# SMTP Configuration
SMTP_HOST="smtp.gmail.com:587"
ALERT_EMAIL_FROM="alerts@yourcompany.com"
SMTP_USERNAME="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_REQUIRE_TLS=true
DEFAULT_EMAIL="alerts@yourcompany.com"

# Slack Configuration
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

**For Slack Only (No SMTP):**
```bash
# Disable SMTP
SMTP_HOST=""
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

**For Webhook Only (No SMTP/Slack):**
```bash
# Disable SMTP and Slack
SMTP_HOST=""
SLACK_WEBHOOK_URL=""
WEBHOOK_URL="http://localhost:3000/api/alerts"
```

## Configuration Validation

### 1. Test YAML Syntax
```bash
# Using yq (recommended)
yq eval . containers/observability/alertmanager.yml

# Using python (alternative)
python -c "import yaml; yaml.safe_load(open('containers/observability/alertmanager.yml'))"
```

### 2. Validate Environment Variables
```bash
cd containers/observability
./validate-alertmanager-config.sh
```

### 3. Test Alertmanager Configuration
```bash
# Start Alertmanager with validation
docker-compose up alertmanager

# Check logs for errors
docker-compose logs alertmanager

# Test configuration endpoint
curl http://localhost:9093/api/v1/status
```

## Testing Alert Delivery

### 1. Send Test Alert
```bash
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "service": "test"
    },
    "annotations": {
      "summary": "Test alert for configuration validation",
      "description": "This is a test alert to verify Alertmanager configuration"
    }
  }]'
```

### 2. Check Alert Routing
```bash
# View active alerts
curl http://localhost:9093/api/v1/alerts

# Check receiver status
curl http://localhost:9093/api/v1/receivers
```

## Common Pitfalls and Solutions

### 1. Environment Variable Not Expanding
**Problem:** Variables like `${SMTP_HOST}` appearing literally in logs

**Solution:** Ensure environment variable substitution is enabled in your deployment:
```yaml
# In docker-compose.yml
environment:
  - SMTP_HOST=${SMTP_HOST:-"localhost:587"}
```

### 2. SMTP Authentication Failures
**Problem:** SMTP connection errors despite correct credentials

**Solutions:**
- Use app-specific passwords for Gmail
- Ensure SMTP_REQUIRE_TLS matches your provider requirements
- Test SMTP connectivity: `telnet smtp.gmail.com 587`

### 3. Slack Webhook Failures
**Problem:** Slack notifications not delivered

**Solutions:**
- Verify webhook URL format
- Test webhook manually: `curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"test"}'`
- Check Slack app permissions

## File Locations

- **Primary Config:** `containers/observability/alertmanager.yml`
- **Conditional Config:** `containers/observability/alertmanager-conditional.yml`
- **Setup Script:** `containers/observability/setup-alertmanager-env.sh`
- **Validation Script:** `containers/observability/validate-alertmanager-config.sh`
- **Environment:** `.env` (project root)

## Deployment Integration

The fix is integrated with the existing Docker Compose setup:

```yaml
# docker-compose.yml
alertmanager:
  image: prom/alertmanager:v0.26.0
  volumes:
    - ./containers/observability/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
  environment:
    - SMTP_HOST=${SMTP_HOST:-"localhost:587"}
    - ALERT_EMAIL_FROM=${ALERT_EMAIL_FROM:-"alerts@meta-agent-factory.com"}
    # ... other environment variables
```

## Summary

The "too many colons in address" error is fixed by:

1. ✅ **Proper quoting** of default values containing colons
2. ✅ **Environment variable validation** scripts
3. ✅ **Alternative conditional configuration** for optional SMTP
4. ✅ **Comprehensive testing** and validation tools

The configuration now supports flexible deployment scenarios from development (webhook-only) to production (full email + Slack integration).