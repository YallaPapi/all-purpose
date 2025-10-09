# NATS Security Configuration

This directory contains security configurations for the NATS messaging system used by the All-Purpose Meta-Agent Factory.

## Overview

The security configuration provides:
- **TLS/SSL encryption** for all client-server communications
- **Mutual TLS (mTLS)** for bidirectional certificate authentication
- **User authentication** with username/password
- **Fine-grained authorization** with subject-based permissions
- **Separate credentials** for each meta-agent

## Quick Start

### 1. Generate Certificates

```bash
# Make the script executable
chmod +x generate-certs.sh

# Generate all certificates
./generate-certs.sh
```

This creates:
- CA certificate and key
- Server certificate with proper SANs
- Client certificates for each meta-agent

### 2. Configure Passwords

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set strong passwords for each agent
nano .env
```

**Important**: Use strong, unique passwords for each agent in production.

### 3. Start Secure NATS Server

```bash
# Start NATS with security enabled
docker-compose -f docker-compose-secure.yml up -d

# Check logs
docker logs nats-secure

# Verify health
curl http://localhost:8222/varz
```

### 4. Test Security Configuration

```bash
# Go to project root
cd ../..

# Run security test
node test-nats-security.js
```

## Configuration Files

### `nats-server-secure.conf`
Main NATS server configuration with:
- TLS settings
- User definitions and permissions
- JetStream configuration
- Monitoring endpoints

### `docker-compose-secure.yml`
Docker Compose configuration for:
- NATS server with mounted certificates
- Example meta-agent with TLS client configuration
- Persistent volumes for data and logs

### `generate-certs.sh`
Script to generate all required certificates:
- Self-signed CA (10-year validity)
- Server certificate with SANs
- Client certificates for each agent

## Security Best Practices

### 1. Certificate Management
- Store private keys securely (use Docker secrets in production)
- Rotate certificates before expiration
- Use certificates from a trusted CA in production
- Monitor certificate expiration dates

### 2. Password Management
- Use strong, unique passwords for each agent
- Store passwords in secure environment variables
- Rotate passwords regularly
- Never commit passwords to version control

### 3. Network Security
- Use TLS 1.2 or higher
- Restrict NATS ports with firewall rules
- Use private networks for agent communication
- Monitor for unauthorized connection attempts

### 4. Permission Management
- Follow principle of least privilege
- Agents can only publish/subscribe to their designated subjects
- Factory-core has elevated permissions for coordination
- Monitoring user has read-only access

## Agent Permissions

Each agent has specific publish/subscribe permissions:

### Factory Core
- **Publish**: All subjects (`>`)
- **Subscribe**: All subjects (`>`)
- **Role**: System coordinator

### Backend Agent
- **Publish**: `agent.backend.>`, `task.completed`, `task.failed`, `progress.>`
- **Subscribe**: `agent.backend.task`, `workflow.>`, `broadcast.>`
- **Role**: Backend development tasks

### Frontend Agent
- **Publish**: `agent.frontend.>`, `task.completed`, `task.failed`, `progress.>`
- **Subscribe**: `agent.frontend.task`, `workflow.>`, `broadcast.>`
- **Role**: Frontend development tasks

### DevOps Agent
- **Publish**: `agent.devops.>`, `task.completed`, `task.failed`, `progress.>`
- **Subscribe**: `agent.devops.task`, `workflow.>`, `broadcast.>`
- **Role**: Infrastructure and deployment tasks

### QA Agent
- **Publish**: `agent.qa.>`, `task.completed`, `task.failed`, `progress.>`
- **Subscribe**: `agent.qa.task`, `workflow.>`, `broadcast.>`
- **Role**: Testing and quality assurance

### Documentation Agent
- **Publish**: `agent.documentation.>`, `task.completed`, `task.failed`, `progress.>`
- **Subscribe**: `agent.documentation.task`, `workflow.>`, `broadcast.>`
- **Role**: Documentation generation

### Monitoring
- **Publish**: None (read-only)
- **Subscribe**: All subjects (`>`)
- **Role**: System monitoring and observability

## Troubleshooting

### Certificate Issues
```bash
# Verify certificate
openssl x509 -in certs/server.crt -text -noout

# Check certificate chain
openssl verify -CAfile certs/ca.crt certs/server.crt

# Test TLS connection
openssl s_client -connect localhost:4222 \
  -cert certs/backend-agent.crt \
  -key certs/backend-agent.key \
  -CAfile certs/ca.crt
```

### Connection Issues
```bash
# Check NATS server status
docker exec nats-secure nats server check

# View server configuration
docker exec nats-secure nats server report connections

# Monitor real-time activity
docker exec -it nats-secure nats sub ">"
```

### Permission Issues
```bash
# Test authentication
nats pub test.subject "Hello" \
  --server=nats://localhost:4222 \
  --user=backend-agent \
  --password=your-password

# Check user permissions
curl http://localhost:8222/connz
```

## Production Deployment

For production environments:

1. **Use Real Certificates**
   - Obtain certificates from a trusted CA
   - Use proper domain names in certificates
   - Implement certificate rotation

2. **Secure Secrets**
   - Use Docker secrets or Kubernetes secrets
   - Implement secret rotation
   - Use hardware security modules (HSM) for keys

3. **Network Isolation**
   - Deploy in private subnets
   - Use VPN or private endpoints
   - Implement network policies

4. **Monitoring**
   - Enable audit logging
   - Monitor failed authentication attempts
   - Set up alerts for certificate expiration
   - Track connection metrics

5. **High Availability**
   - Deploy NATS cluster (3+ nodes)
   - Use persistent storage for JetStream
   - Implement proper backup strategies

## References

- [NATS Security Documentation](https://docs.nats.io/running-a-nats-service/configuration/securing_nats)
- [NATS TLS Configuration](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/tls)
- [NATS Authorization](https://docs.nats.io/running-a-nats-service/configuration/securing_nats/authorization)