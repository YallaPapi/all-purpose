# Consul Cluster Deployment Guide
## Task 220.2: Cluster Topology and Security Model Implementation

### Overview

This guide provides step-by-step instructions for deploying a secure, production-ready Consul cluster in Kubernetes with the UEP Meta-Agent Factory integration.

### Architecture Overview

#### Cluster Topology
- **3-node Consul server cluster** for high availability
- **StatefulSet deployment** with persistent storage
- **Pod anti-affinity** to ensure servers run on different nodes
- **Service mesh enabled** with Consul Connect
- **TLS encryption** for all communications
- **ACL security** with least privilege access

#### Security Model
- **Zero-trust architecture** with deny-by-default ACL policy
- **Mutual TLS** for service-to-service communication
- **Network policies** to restrict traffic flow
- **Pod security policies** to prevent privilege escalation
- **RBAC** for Kubernetes API access
- **Encrypted gossip** for cluster communication

### Prerequisites

1. **Kubernetes cluster** (v1.20+) with:
   - CSI driver for persistent storage
   - Network policy support
   - Load balancer support

2. **kubectl** configured with cluster admin access

3. **Required tools**:
   ```bash
   # Install Consul CLI
   curl -fsSL https://releases.hashicorp.com/consul/1.18.0/consul_1.18.0_linux_amd64.zip -o consul.zip
   unzip consul.zip && sudo mv consul /usr/local/bin/
   
   # Install jq for JSON processing
   sudo apt-get install jq
   ```

### Step 1: Generate Security Materials

#### 1.1 Generate Gossip Encryption Key
```bash
# Generate 32-byte base64 encoded key
CONSUL_ENCRYPT_KEY=$(consul keygen)
echo "Consul Encrypt Key: $CONSUL_ENCRYPT_KEY"
```

#### 1.2 Generate ACL Tokens
```bash
# Generate management token (UUID format)
MANAGEMENT_TOKEN=$(uuidgen)
echo "Management Token: $MANAGEMENT_TOKEN"

# Generate agent token
AGENT_TOKEN=$(uuidgen)
echo "Agent Token: $AGENT_TOKEN"
```

#### 1.3 Generate TLS Certificates

**Option A: Self-signed certificates (development)**
```bash
# Create CA private key
openssl genrsa -out ca-key.pem 4096

# Create CA certificate
openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -out ca.pem -subj "/C=US/ST=CA/L=SF/O=UEP/OU=Consul/CN=consul-ca"

# Create server private key
openssl genrsa -out consul-key.pem 4096

# Create certificate signing request
openssl req -subj "/C=US/ST=CA/L=SF/O=UEP/OU=Consul/CN=consul-server" -sha256 -new -key consul-key.pem -out consul.csr

# Create server certificate
cat > consul-server.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = CA
L = SF
O = UEP
OU = Consul
CN = consul-server

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = consul-server
DNS.2 = consul-server.consul.svc.cluster.local
DNS.3 = consul-server-0.consul-server.consul.svc.cluster.local
DNS.4 = consul-server-1.consul-server.consul.svc.cluster.local
DNS.5 = consul-server-2.consul-server.consul.svc.cluster.local
DNS.6 = localhost
IP.1 = 127.0.0.1
EOF

openssl x509 -req -in consul.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out consul.pem -days 365 -extensions v3_req -extfile consul-server.conf
```

**Option B: cert-manager (production)**
```yaml
# Use cert-manager for automatic certificate management
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: consul-server-tls
  namespace: consul
spec:
  secretName: consul-server-tls
  issuerRef:
    name: ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - consul-server.consul.svc.cluster.local
  - "*.consul-server.consul.svc.cluster.local"
```

### Step 2: Update Security Manifests

#### 2.1 Update consul-security.yaml with generated values
```bash
# Base64 encode the gossip encryption key
CONSUL_ENCRYPT_KEY_B64=$(echo -n "$CONSUL_ENCRYPT_KEY" | base64 -w 0)

# Base64 encode the ACL tokens
MANAGEMENT_TOKEN_B64=$(echo -n "$MANAGEMENT_TOKEN" | base64 -w 0)
AGENT_TOKEN_B64=$(echo -n "$AGENT_TOKEN" | base64 -w 0)

# Base64 encode the certificates
CA_CERT_B64=$(base64 -w 0 < ca.pem)
CONSUL_CERT_B64=$(base64 -w 0 < consul.pem)
CONSUL_KEY_B64=$(base64 -w 0 < consul-key.pem)

# Update the security manifest
sed -i "s/WElYTU4yWmpUeWFzQ2dLWkV5Z1J3V0ZmMkRXVzFKWDFZOFE=/$CONSUL_ENCRYPT_KEY_B64/g" consul-security.yaml
sed -i "s/ZTNjOGU4ZGUtZjQ2Zi00NzI4LWEzOWEtOWVkNGJjOTk0Mjc2/$MANAGEMENT_TOKEN_B64/g" consul-security.yaml
sed -i "s/YjRhNzhlOWQtOTFiOC00MjY5LWE4ZTMtN2Y4MDUyYjY5MzQy/$AGENT_TOKEN_B64/g" consul-security.yaml
```

### Step 3: Deploy Consul Cluster

#### 3.1 Deploy Security Components
```bash
# Apply namespace and security configurations
kubectl apply -f consul-security.yaml

# Verify secrets are created
kubectl get secrets -n consul
kubectl get configmaps -n consul
```

#### 3.2 Deploy Consul Cluster
```bash
# Apply cluster configuration
kubectl apply -f consul-cluster.yaml

# Monitor deployment
kubectl get pods -n consul -w
kubectl get statefulset -n consul
kubectl get pvc -n consul
```

#### 3.3 Verify Cluster Health
```bash
# Check cluster members
kubectl exec -n consul consul-server-0 -- consul members

# Check cluster leader
kubectl exec -n consul consul-server-0 -- consul operator autopilot get-config

# Check service registration
kubectl exec -n consul consul-server-0 -- consul catalog services
```

### Step 4: Bootstrap ACL System

#### 4.1 Run ACL Bootstrap Job
```bash
# Monitor bootstrap job
kubectl logs -n consul job/consul-acl-bootstrap -f

# Verify ACL policies are created
kubectl exec -n consul consul-server-0 -- consul acl policy list

# Verify ACL tokens are created
kubectl exec -n consul consul-server-0 -- consul acl token list
```

#### 4.2 Create UEP Agent Tokens
```bash
# Create additional tokens for UEP agents
kubectl exec -n consul consul-server-0 -- consul acl token create \
  -description "UEP Meta-Agent Factory Token" \
  -policy-name "uep-agent-policy" \
  -format=json
```

### Step 5: Configure External Access

#### 5.1 Configure Ingress (Optional)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: consul-ui
  namespace: consul
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  tls:
  - hosts:
    - consul.example.com
    secretName: consul-ui-tls
  rules:
  - host: consul.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: consul-ui
            port:
              number: 443
```

#### 5.2 Configure LoadBalancer Access
```bash
# Get LoadBalancer IP
kubectl get service consul-ui -n consul

# Access Consul UI (replace with actual LoadBalancer IP)
echo "Consul UI: https://<LOADBALANCER-IP>"
```

### Step 6: Configure UEP Agent Integration

#### 6.1 Create UEP Agent Service Account
```bash
# Create service account for UEP agents
kubectl create serviceaccount uep-agents -n uep-agents

# Create cluster role for service discovery
kubectl apply -f - << EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: uep-agent-consul-access
rules:
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: uep-agent-consul-access
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: uep-agent-consul-access
subjects:
- kind: ServiceAccount
  name: uep-agents
  namespace: uep-agents
EOF
```

#### 6.2 Create UEP Agent Configuration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: uep-consul-config
  namespace: uep-agents
data:
  consul.json: |
    {
      "datacenter": "uep-prod",
      "server": false,
      "log_level": "INFO",
      "enable_syslog": false,
      "addresses": {
        "http": "0.0.0.0",
        "https": "0.0.0.0"
      },
      "ports": {
        "http": 8500,
        "https": 8501
      },
      "connect": {
        "enabled": true
      },
      "retry_join": [
        "consul-server.consul.svc.cluster.local"
      ],
      "acl": {
        "enabled": true,
        "default_policy": "deny",
        "tokens": {
          "agent": "${CONSUL_ACL_TOKEN}"
        }
      },
      "tls": {
        "defaults": {
          "verify_incoming": false,
          "verify_outgoing": true,
          "ca_file": "/consul/tls/ca.pem"
        }
      }
    }
```

### Step 7: Monitoring and Troubleshooting

#### 7.1 Health Checks
```bash
# Check cluster health
kubectl exec -n consul consul-server-0 -- consul members -detailed

# Check service health
kubectl exec -n consul consul-server-0 -- consul catalog services

# Check ACL status
kubectl exec -n consul consul-server-0 -- consul acl token list
```

#### 7.2 Common Issues

**Issue**: Pods stuck in pending state
```bash
# Check node resources
kubectl describe nodes
kubectl get pvc -n consul
```

**Issue**: TLS certificate errors
```bash
# Verify certificate validity
kubectl exec -n consul consul-server-0 -- openssl x509 -in /consul/tls/consul.pem -text -noout
```

**Issue**: ACL token permissions
```bash
# Test token permissions
kubectl exec -n consul consul-server-0 -- consul acl token read -id <token-id>
```

### Step 8: Backup and Disaster Recovery

#### 8.1 Configure Automated Snapshots
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: consul-snapshot
  namespace: consul
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: consul-snapshot
            image: hashicorp/consul:1.18.0
            env:
            - name: CONSUL_HTTP_ADDR
              value: "https://consul-server.consul.svc.cluster.local:8501"
            - name: CONSUL_HTTP_TOKEN
              valueFrom:
                secretKeyRef:
                  name: consul-acl-token
                  key: management-token
            command:
            - "/bin/sh"
            - "-c"
            - |
              consul snapshot save /backup/consul-snapshot-$(date +%Y%m%d-%H%M%S).snap
              # Upload to cloud storage if configured
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: consul-backup-pvc
          restartPolicy: OnFailure
```

### Success Criteria

✅ **Cluster Formation**: 3 Consul servers form a healthy cluster  
✅ **Security**: ACL system activated with appropriate policies  
✅ **TLS**: All communications encrypted with valid certificates  
✅ **High Availability**: Cluster survives single node failure  
✅ **Service Registration**: UEP agents can register/deregister services  
✅ **Monitoring**: Health checks and metrics collection working  
✅ **Backup**: Automated snapshot system operational  

### Next Steps

1. **Task 220.3**: Implement agent registration data model
2. **Task 220.4**: Develop service registration patterns
3. **Task 220.5**: Set up monitoring and visualization tools

The cluster topology and security model provides a robust foundation for the UEP Meta-Agent Factory service registry implementation.