#!/bin/bash
# Alertmanager Environment Configuration Script
# This script helps configure Alertmanager with optional SMTP settings

echo "🚨 Alertmanager Configuration Setup 🚨"
echo "========================================="
echo

# Check if .env file exists
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating $ENV_FILE file..."
    touch "$ENV_FILE"
fi

echo "Choose your notification setup:"
echo "1) Email only (requires SMTP)"
echo "2) Slack only (no SMTP required)"
echo "3) Email + Slack (full setup)"
echo "4) Webhook only (minimal setup)"
echo

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "📧 Setting up Email notifications..."
        read -p "SMTP Host (e.g., smtp.gmail.com:587): " smtp_host
        read -p "Email From address: " email_from
        read -p "SMTP Username: " smtp_user
        read -s -p "SMTP Password: " smtp_pass
        echo
        
        # Add to .env file
        echo "# Alertmanager SMTP Configuration" >> "$ENV_FILE"
        echo "SMTP_HOST=\"$smtp_host\"" >> "$ENV_FILE"
        echo "ALERT_EMAIL_FROM=\"$email_from\"" >> "$ENV_FILE"
        echo "SMTP_USERNAME=\"$smtp_user\"" >> "$ENV_FILE"
        echo "SMTP_PASSWORD=\"$smtp_pass\"" >> "$ENV_FILE"
        echo "SMTP_REQUIRE_TLS=true" >> "$ENV_FILE"
        echo "DEFAULT_EMAIL=\"$email_from\"" >> "$ENV_FILE"
        echo
        ;;
    2)
        echo "💬 Setting up Slack notifications..."
        read -p "Slack Webhook URL: " slack_url
        
        echo "# Alertmanager Slack Configuration" >> "$ENV_FILE"
        echo "SLACK_WEBHOOK_URL=\"$slack_url\"" >> "$ENV_FILE"
        echo "# SMTP disabled for Slack-only setup" >> "$ENV_FILE"
        echo "SMTP_HOST=\"\"" >> "$ENV_FILE"
        echo
        ;;
    3)
        echo "📧💬 Setting up Email + Slack notifications..."
        read -p "SMTP Host (e.g., smtp.gmail.com:587): " smtp_host
        read -p "Email From address: " email_from
        read -p "SMTP Username: " smtp_user
        read -s -p "SMTP Password: " smtp_pass
        echo
        read -p "Slack Webhook URL: " slack_url
        
        echo "# Alertmanager Full Configuration" >> "$ENV_FILE"
        echo "SMTP_HOST=\"$smtp_host\"" >> "$ENV_FILE"
        echo "ALERT_EMAIL_FROM=\"$email_from\"" >> "$ENV_FILE"
        echo "SMTP_USERNAME=\"$smtp_user\"" >> "$ENV_FILE"
        echo "SMTP_PASSWORD=\"$smtp_pass\"" >> "$ENV_FILE"
        echo "SMTP_REQUIRE_TLS=true" >> "$ENV_FILE"
        echo "DEFAULT_EMAIL=\"$email_from\"" >> "$ENV_FILE"
        echo "SLACK_WEBHOOK_URL=\"$slack_url\"" >> "$ENV_FILE"
        echo
        ;;
    4)
        echo "🔗 Setting up Webhook notifications..."
        read -p "Webhook URL (default: http://localhost:3000/api/alerts): " webhook_url
        webhook_url=${webhook_url:-"http://localhost:3000/api/alerts"}
        
        echo "# Alertmanager Webhook Configuration" >> "$ENV_FILE"
        echo "WEBHOOK_URL=\"$webhook_url\"" >> "$ENV_FILE"
        echo "# SMTP disabled for webhook-only setup" >> "$ENV_FILE"
        echo "SMTP_HOST=\"\"" >> "$ENV_FILE"
        echo
        ;;
    *)
        echo "Invalid choice. Exiting..."
        exit 1
        ;;
esac

echo "✅ Configuration added to $ENV_FILE"
echo
echo "🔧 Next steps:"
echo "1. Review the .env file to ensure settings are correct"
echo "2. Restart your Docker containers:"
echo "   docker-compose restart alertmanager"
echo "3. Test your configuration:"
echo "   docker-compose logs alertmanager"
echo
echo "🚨 To test alerts, you can use:"
echo "   curl -X POST http://localhost:9093/api/v1/alerts -d '[{\"labels\":{\"alertname\":\"TestAlert\",\"severity\":\"warning\"},\"annotations\":{\"summary\":\"Test alert\"}}]'"
echo

# Create a test configuration validation script
cat > validate-alertmanager-config.sh << 'EOF'
#!/bin/bash
echo "🔍 Validating Alertmanager configuration..."

# Check if config file exists
if [ ! -f "containers/observability/alertmanager.yml" ]; then
    echo "❌ alertmanager.yml not found"
    exit 1
fi

# Test YAML syntax
if command -v yq &> /dev/null; then
    if yq eval . containers/observability/alertmanager.yml > /dev/null 2>&1; then
        echo "✅ YAML syntax is valid"
    else
        echo "❌ YAML syntax error"
        yq eval . containers/observability/alertmanager.yml
        exit 1
    fi
else
    echo "⚠️  yq not found, skipping YAML validation"
fi

# Check environment variable substitution
echo "🔍 Checking environment variables..."
source .env 2>/dev/null || true

if [ -n "$SMTP_HOST" ]; then
    echo "✅ SMTP_HOST configured: $SMTP_HOST"
else
    echo "ℹ️  SMTP_HOST not configured (webhook/Slack mode)"
fi

if [ -n "$SLACK_WEBHOOK_URL" ]; then
    echo "✅ SLACK_WEBHOOK_URL configured"
else
    echo "ℹ️  SLACK_WEBHOOK_URL not configured"
fi

echo "✅ Configuration validation complete"
EOF

chmod +x validate-alertmanager-config.sh
echo "📝 Created validate-alertmanager-config.sh for testing"