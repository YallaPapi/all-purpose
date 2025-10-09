#!/bin/bash

# NATS Certificate Generation Script
# Generates CA, server, and client certificates for secure NATS communication

set -e

# Configuration
CERT_DIR="./certs"
CA_DAYS=3650  # 10 years
CERT_DAYS=365 # 1 year
RSA_BITS=4096

# Create certificate directory
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

echo "🔐 Generating NATS certificates..."

# 1. Generate CA private key and certificate
echo "📋 Creating Certificate Authority..."
openssl req -x509 -nodes -newkey rsa:$RSA_BITS -sha256 \
  -subj "/C=US/ST=State/L=City/O=AllPurpose/CN=AllPurpose-NATS-CA" \
  -keyout ca.key -out ca.crt -days $CA_DAYS

# 2. Generate server certificate
echo "🖥️ Creating server certificate..."
openssl req -nodes -newkey rsa:$RSA_BITS -sha256 \
  -keyout server.key -out server.csr \
  -subj "/C=US/ST=State/L=City/O=AllPurpose/CN=nats-server"

# Create SAN configuration for server
cat > server-ext.cnf << EOF
[req]
distinguished_name = req_distinguished_name
[req_distinguished_name]
[v3_req]
subjectAltName = @alt_names
[alt_names]
DNS.1 = nats-server
DNS.2 = nats
DNS.3 = localhost
DNS.4 = *.nats.local
IP.1 = 127.0.0.1
IP.2 = 172.17.0.1
IP.3 = 10.0.0.0
EOF

# Sign server certificate
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days $CERT_DAYS -sha256 -extfile server-ext.cnf -extensions v3_req

# 3. Generate client certificates for each meta-agent
AGENTS=("factory-core" "backend-agent" "frontend-agent" "devops-agent" "qa-agent" "documentation-agent")

for agent in "${AGENTS[@]}"; do
  echo "🤖 Creating certificate for $agent..."
  
  openssl req -nodes -newkey rsa:$RSA_BITS -sha256 \
    -keyout "$agent.key" -out "$agent.csr" \
    -subj "/C=US/ST=State/L=City/O=AllPurpose/CN=$agent"
  
  openssl x509 -req -in "$agent.csr" -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out "$agent.crt" -days $CERT_DAYS -sha256
  
  # Clean up CSR
  rm "$agent.csr"
done

# Clean up server CSR and extensions file
rm server.csr server-ext.cnf

# Set appropriate permissions
chmod 600 *.key
chmod 644 *.crt

echo "✅ Certificate generation complete!"
echo ""
echo "📁 Generated files:"
ls -la *.crt *.key
echo ""
echo "🔍 Verify certificates:"
echo "   openssl x509 -in server.crt -text -noout"
echo "   openssl verify -CAfile ca.crt server.crt"