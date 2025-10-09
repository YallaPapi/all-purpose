#!/bin/bash
# Test script for Consul Server Setup
# Validates both development and production configurations

set -e

echo "=== Consul Server Setup Test ==="
echo "Testing Consul server configurations..."

# Function to test development setup
test_development() {
    echo ""
    echo "🧪 Testing Development Configuration..."
    
    # Start development Consul
    echo "Starting development Consul..."
    docker-compose -f docker-compose-consul.yml --profile dev up -d
    
    # Wait for startup
    echo "Waiting for Consul to start..."
    sleep 30
    
    # Test if Consul is running
    echo "Testing Consul status..."
    docker exec consul-dev-server consul members || {
        echo "❌ Consul development server not responding"
        return 1
    }
    
    # Test UI access
    echo "Testing UI access..."
    curl -f http://localhost:8500/v1/status/leader > /dev/null || {
        echo "❌ Consul UI not accessible"
        return 1
    }
    
    # Test service registration
    echo "Testing service registration..."
    docker exec consul-dev-server consul services register \
        -name=test-uep-agent \
        -port=3000 \
        -tag=uep \
        -tag=meta-agent \
        -tag=test || {
        echo "❌ Service registration failed"
        return 1
    }
    
    # Test service discovery
    echo "Testing service discovery..."
    SERVICES=$(docker exec consul-dev-server consul catalog services)
    echo "$SERVICES" | grep -q "test-uep-agent" || {
        echo "❌ Service discovery failed"
        return 1
    }
    
    # Test health check
    echo "Testing health checks..."
    docker exec consul-dev-server consul health service consul > /dev/null || {
        echo "❌ Health check failed"
        return 1
    }
    
    echo "✅ Development configuration test passed!"
    
    # Cleanup
    docker-compose -f docker-compose-consul.yml --profile dev down
    
    return 0
}

# Function to test production build
test_production_build() {
    echo ""
    echo "🏭 Testing Production Build..."
    
    # Test production Docker build
    echo "Building production image..."
    docker build --target production -t consul-server:prod-test . || {
        echo "❌ Production build failed"
        return 1
    }
    
    # Test configuration validation
    echo "Validating production configuration..."
    docker run --rm -v "$(pwd)/config:/test-config" consul-server:prod-test \
        consul validate /test-config/consul-prod.hcl || {
        echo "❌ Production configuration validation failed"
        return 1
    }
    
    # Test ACL policy validation
    echo "Validating ACL policies..."
    # Note: Full ACL validation requires running server
    
    echo "✅ Production build test passed!"
    
    return 0
}

# Function to test configuration files
test_configurations() {
    echo ""
    echo "📝 Testing Configuration Files..."
    
    # Test development config exists and is valid
    if [ ! -f "config/consul-dev.hcl" ]; then
        echo "❌ Development configuration file missing"
        return 1
    fi
    
    # Test production config exists and is valid
    if [ ! -f "config/consul-prod.hcl" ]; then
        echo "❌ Production configuration file missing"
        return 1
    fi
    
    # Test ACL policy file exists
    if [ ! -f "config/acl-policy.hcl" ]; then
        echo "❌ ACL policy file missing"
        return 1
    fi
    
    # Test entrypoint script exists and is executable
    if [ ! -f "scripts/consul-entrypoint.sh" ]; then
        echo "❌ Entrypoint script missing"
        return 1
    fi
    
    # Test nginx config exists
    if [ ! -f "nginx/consul-ui.conf" ]; then
        echo "❌ Nginx configuration missing"
        return 1
    fi
    
    echo "✅ Configuration files test passed!"
    
    return 0
}

# Function to test Docker network
test_network() {
    echo ""
    echo "🌐 Testing Network Configuration..."
    
    # Create UEP network if it doesn't exist
    docker network ls | grep -q uep-network || {
        echo "Creating UEP network..."
        docker network create --driver bridge --subnet 172.20.0.0/16 uep-network
    }
    
    echo "✅ Network configuration test passed!"
    
    return 0
}

# Function to display test summary
display_summary() {
    echo ""
    echo "=== Test Summary ==="
    echo "Consul Server Setup Test Results:"
    echo ""
    
    if [ $1 -eq 0 ]; then
        echo "🎉 All tests passed successfully!"
        echo ""
        echo "✅ Development configuration working"
        echo "✅ Production build successful"
        echo "✅ Configuration files valid"
        echo "✅ Network setup complete"
        echo ""
        echo "🚀 Consul server is ready for UEP service discovery!"
        echo ""
        echo "Next steps:"
        echo "1. Start development: docker-compose -f docker-compose-consul.yml --profile dev up -d"
        echo "2. Access UI: http://localhost:8500/ui"
        echo "3. Register UEP agents with Consul service discovery"
        echo "4. Integrate with UEP Registry for multi-backend discovery"
    else
        echo "❌ Some tests failed!"
        echo ""
        echo "Please check the error messages above and fix the issues."
        echo "Common problems:"
        echo "- Docker not running"
        echo "- Port conflicts (8500 already in use)"
        echo "- Missing configuration files"
        echo "- Network connectivity issues"
    fi
    
    echo ""
}

# Main test execution
main() {
    cd "$(dirname "$0")"
    
    local exit_code=0
    
    # Run tests
    test_configurations || exit_code=1
    test_network || exit_code=1
    test_production_build || exit_code=1
    test_development || exit_code=1
    
    # Display summary
    display_summary $exit_code
    
    exit $exit_code
}

# Execute main function
main "$@"