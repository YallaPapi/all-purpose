#!/bin/sh
# Consul Production Entrypoint Script
# Handles TLS setup, ACL initialization, and secure startup

set -e

# Environment variables with defaults
CONSUL_DATACENTER=${CONSUL_DATACENTER:-uep-prod}
CONSUL_DOMAIN=${CONSUL_DOMAIN:-consul}
CONSUL_NODE_NAME=${CONSUL_NODE_NAME:-consul-prod-server}
CONSUL_BOOTSTRAP_EXPECT=${CONSUL_BOOTSTRAP_EXPECT:-3}
CONSUL_LOG_LEVEL=${CONSUL_LOG_LEVEL:-WARN}

# TLS Configuration
TLS_DIR="/consul/tls"
CA_FILE="${TLS_DIR}/ca.pem"
CERT_FILE="${TLS_DIR}/consul.pem"
KEY_FILE="${TLS_DIR}/consul-key.pem"

# ACL Configuration
ACL_DIR="/consul/config"
ACL_POLICY_FILE="${ACL_DIR}/acl-policy.hcl"

echo "Starting Consul Production Server..."
echo "Datacenter: ${CONSUL_DATACENTER}"
echo "Node Name: ${CONSUL_NODE_NAME}"
echo "Bootstrap Expect: ${CONSUL_BOOTSTRAP_EXPECT}"

# Function to wait for file
wait_for_file() {
    local file_path="$1"
    local timeout="${2:-60}"
    local count=0
    
    echo "Waiting for file: ${file_path}"
    while [ ! -f "${file_path}" ] && [ ${count} -lt ${timeout} ]; do
        sleep 1
        count=$((count + 1))
    done
    
    if [ ! -f "${file_path}" ]; then
        echo "ERROR: File ${file_path} not found after ${timeout} seconds"
        return 1
    fi
    
    echo "File ${file_path} found"
    return 0
}

# Function to generate self-signed certificates if not provided
generate_tls_certificates() {
    echo "Generating self-signed TLS certificates..."
    
    # Create TLS directory if it doesn't exist
    mkdir -p "${TLS_DIR}"
    
    # Generate CA private key
    openssl genrsa -out "${TLS_DIR}/ca-key.pem" 4096
    
    # Generate CA certificate
    openssl req -new -x509 -days 3650 -key "${TLS_DIR}/ca-key.pem" \
        -out "${CA_FILE}" \
        -subj "/C=US/ST=CA/L=SF/O=UEP/OU=MetaAgentFactory/CN=consul-ca"
    
    # Generate server private key
    openssl genrsa -out "${KEY_FILE}" 4096
    
    # Generate server certificate signing request
    openssl req -new -key "${KEY_FILE}" \
        -out "${TLS_DIR}/consul.csr" \
        -subj "/C=US/ST=CA/L=SF/O=UEP/OU=MetaAgentFactory/CN=consul-server"
    
    # Create certificate extensions file
    cat > "${TLS_DIR}/cert_extensions.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = consul-server
DNS.2 = consul-server.consul.svc.cluster.local
DNS.3 = localhost
DNS.4 = *.consul-server.consul.svc.cluster.local
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
    
    # Generate server certificate
    openssl x509 -req -in "${TLS_DIR}/consul.csr" \
        -CA "${CA_FILE}" \
        -CAkey "${TLS_DIR}/ca-key.pem" \
        -CAcreateserial \
        -out "${CERT_FILE}" \
        -days 365 \
        -extensions v3_req \
        -extfile "${TLS_DIR}/cert_extensions.conf"
    
    # Set proper permissions
    chmod 600 "${TLS_DIR}"/*.pem
    chmod 600 "${TLS_DIR}"/*.key
    
    echo "TLS certificates generated successfully"
}

# Function to initialize ACLs
initialize_acls() {
    echo "Initializing Consul ACLs..."
    
    # Wait for Consul to be ready
    local max_attempts=30
    local attempt=0
    
    while [ ${attempt} -lt ${max_attempts} ]; do
        if consul members > /dev/null 2>&1; then
            echo "Consul is ready"
            break
        fi
        
        echo "Waiting for Consul to be ready... (attempt $((attempt + 1))/${max_attempts})"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ ${attempt} -eq ${max_attempts} ]; then
        echo "WARNING: Consul not ready after ${max_attempts} attempts, skipping ACL initialization"
        return 1
    fi
    
    # Bootstrap ACL system
    if [ -z "${CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN}" ]; then
        echo "Bootstrapping ACL system..."
        local bootstrap_output
        bootstrap_output=$(consul acl bootstrap 2>/dev/null) || {
            echo "ACL system may already be bootstrapped"
            return 0
        }
        
        # Extract the management token
        CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN=$(echo "${bootstrap_output}" | grep "SecretID:" | awk '{print $2}')
        export CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN
        
        echo "ACL system bootstrapped"
        echo "Management Token: ${CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN}"
        echo "IMPORTANT: Save this token securely!"
    fi
    
    # Create policies if they don't exist
    if [ -f "${ACL_POLICY_FILE}" ]; then
        echo "Creating ACL policies from ${ACL_POLICY_FILE}"
        # This would require parsing the HCL file and creating policies
        # For now, we'll create basic policies programmatically
        
        # Create UEP Registry policy
        consul acl policy create \
            -token="${CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN}" \
            -name="uep-registry-policy" \
            -description="Policy for UEP Registry service" \
            -rules='
service_prefix "uep-" { policy = "write" }
service_prefix "meta-agent-" { policy = "write" }
service_prefix "domain-agent-" { policy = "write" }
node_prefix "" { policy = "read" }
key_prefix "uep/" { policy = "write" }
key_prefix "agents/" { policy = "write" }
session_prefix "" { policy = "write" }
event_prefix "uep-" { policy = "write" }
' 2>/dev/null || echo "UEP Registry policy may already exist"
        
        # Create Meta-Agent policy
        consul acl policy create \
            -token="${CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN}" \
            -name="meta-agent-policy" \
            -description="Policy for Meta-Agents" \
            -rules='
service_prefix "meta-agent-" { policy = "write" }
service_prefix "uep-" { policy = "read" }
node_prefix "" { policy = "read" }
key_prefix "uep/config/" { policy = "read" }
key_prefix "agents/" { policy = "write" }
session_prefix "" { policy = "write" }
event_prefix "coord-" { policy = "write" }
' 2>/dev/null || echo "Meta-Agent policy may already exist"
        
        echo "ACL policies created"
    fi
}

# Function to setup encryption key
setup_encryption() {
    if [ -z "${CONSUL_ENCRYPT_KEY}" ]; then
        echo "Generating Consul encryption key..."
        CONSUL_ENCRYPT_KEY=$(consul keygen)
        export CONSUL_ENCRYPT_KEY
        echo "Encryption Key: ${CONSUL_ENCRYPT_KEY}"
        echo "IMPORTANT: Use this key for all Consul agents in the cluster!"
    fi
}

# Function to handle shutdown
cleanup() {
    echo "Received shutdown signal, performing cleanup..."
    consul leave || true
    exit 0
}

# Set up signal handlers
trap cleanup TERM INT

# Main initialization
echo "=== Consul Production Initialization ==="

# Check if TLS certificates exist, generate if not
if [ ! -f "${CA_FILE}" ] || [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    echo "TLS certificates not found, generating..."
    generate_tls_certificates
else
    echo "TLS certificates found"
fi

# Setup encryption
setup_encryption

# Start Consul in background for ACL initialization if production
if [ "${CONSUL_DATACENTER}" = "uep-prod" ] && [ "${CONSUL_BOOTSTRAP_EXPECT}" -gt 0 ]; then
    echo "Starting Consul for ACL initialization..."
    consul agent -config-dir=/consul/config -data-dir=/consul/data &
    CONSUL_PID=$!
    
    # Wait a bit for startup
    sleep 10
    
    # Initialize ACLs
    initialize_acls
    
    # Stop the background process
    kill ${CONSUL_PID} 2>/dev/null || true
    wait ${CONSUL_PID} 2>/dev/null || true
    
    echo "ACL initialization complete"
fi

echo "=== Starting Consul Server ==="

# Export environment variables for configuration template substitution
export CONSUL_DATACENTER
export CONSUL_DOMAIN
export CONSUL_NODE_NAME
export CONSUL_BOOTSTRAP_EXPECT
export CONSUL_LOG_LEVEL
export CONSUL_ENCRYPT_KEY
export CONSUL_ACL_INITIAL_MANAGEMENT_TOKEN

# Execute the command passed to the entrypoint
exec "$@"