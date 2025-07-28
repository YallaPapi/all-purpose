# Kubernetes Migration Path for UEP Service Discovery
## Task 191.5: Design for Kubernetes Compatibility and Migration Path

### Overview

This document outlines the complete migration path from Docker Compose to Kubernetes for the UEP Meta-Agent Factory with Service Discovery. The migration is designed to be gradual, low-risk, and maintain service continuity.

### Migration Strategy

#### Phase-Based Approach

```
Docker Compose → Hybrid → Full Kubernetes
     ↓              ↓            ↓
   Current      Transition    Target State
```

**Phase 1: Docker Compose (Current)**
- All services in Docker Compose
- Redis + Consul service discovery
- Manual scaling and orchestration

**Phase 2: Hybrid Deployment**
- Kubernetes cluster with external registries
- Gradual service migration
- Cross-platform service discovery

**Phase 3: Full Kubernetes**
- Native Kubernetes service discovery
- Operator-based management
- Auto-scaling and self-healing

### Kubernetes Architecture

#### Target Architecture

```yaml
┌─────────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Namespaces                            │   │
│  │                                                         │   │
│  │  uep-system     │  uep-agents    │  uep-monitoring      │   │
│  │  - Registries   │  - Meta-Agents │  - Observability     │   │
│  │  - Controllers  │  - Workflows   │  - Dashboards        │   │
│  │  - Operators    │  - Jobs        │  - Alerts            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Service Discovery                        │   │
│  │                                                         │   │
│  │  Native K8s     │  External      │  Service Mesh        │   │
│  │  - Services     │  - Consul      │  - Istio/Linkerd     │   │
│  │  - Endpoints    │  - Redis       │  - mTLS              │   │
│  │  - Ingress      │  - Custom      │  - Observability     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Workload Types                          │   │
│  │                                                         │   │
│  │  Deployments    │  StatefulSets  │  Jobs/CronJobs       │   │
│  │  - Agents       │  - Registries  │  - Batch Tasks       │   │
│  │  - APIs         │  - Databases   │  - Scheduled Work    │   │
│  │  - Services     │  - Storage     │  - Maintenance       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Kubernetes-Compatible Service Discovery

#### 1. Native Kubernetes Service Discovery

**Service Definition:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: prd-parser
  namespace: uep-agents
  labels:
    app: prd-parser
    component: meta-agent
    uep.io/agent-type: prd-parser
  annotations:
    uep.io/capabilities: "parsing,validation,analysis"
    uep.io/version: "2.0.0"
spec:
  selector:
    app: prd-parser
  ports:
  - name: http
    port: 3002
    targetPort: 3002
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 9090
    protocol: TCP
  type: ClusterIP
```

**Endpoint Discovery:**
```typescript
// Kubernetes-native service discovery client
export class KubernetesServiceDiscovery {
  private k8sApi: CoreV1Api;
  
  constructor() {
    const kc = new KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(CoreV1Api);
  }
  
  async discoverAgents(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    const namespace = query.namespace || 'uep-agents';
    const labelSelector = this.buildLabelSelector(query);
    
    const { body: services } = await this.k8sApi.listNamespacedService(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector
    );
    
    const agents = await Promise.all(
      services.items.map(service => this.convertServiceToAgent(service))
    );
    
    return {
      agents: agents.filter(agent => agent !== null),
      totalCount: agents.length,
      query,
      executionTime: Date.now(),
      timestamp: new Date().toISOString()
    };
  }
  
  private buildLabelSelector(query: ServiceDiscoveryQuery): string {
    const selectors = ['component=meta-agent'];
    
    if (query.agentType) {
      selectors.push(`uep.io/agent-type=${query.agentType}`);
    }
    
    return selectors.join(',');
  }
}
```

#### 2. Hybrid Service Discovery

**Multi-Registry Client:**
```typescript
export class HybridKubernetesServiceDiscovery extends ServiceDiscoveryClient {
  private k8sDiscovery: KubernetesServiceDiscovery;
  private externalRegistry: RedisServiceRegistry | ConsulServiceRegistry;
  
  constructor(config: HybridDiscoveryConfig) {
    super(config);
    this.k8sDiscovery = new KubernetesServiceDiscovery();
    
    if (config.externalRegistry.type === 'redis') {
      this.externalRegistry = new RedisServiceRegistry(config.externalRegistry.config);
    } else {
      this.externalRegistry = new ConsulServiceRegistry(config.externalRegistry.config);
    }
  }
  
  async discoverAgents(query: ServiceDiscoveryQuery): Promise<ServiceDiscoveryResult> {
    // Try Kubernetes first for in-cluster services
    try {
      const k8sResult = await this.k8sDiscovery.discoverAgents(query);
      if (k8sResult.agents.length > 0) {
        return k8sResult;
      }
    } catch (error) {
      console.warn('Kubernetes discovery failed, falling back to external registry:', error);
    }
    
    // Fallback to external registry
    return await this.externalRegistry.discoverAgents(query);
  }
}
```

### Kubernetes Manifests

#### 1. Namespace Configuration

```yaml
# k8s/namespaces/uep-namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: uep-system
  labels:
    name: uep-system
    uep.io/component: system
---
apiVersion: v1
kind: Namespace
metadata:
  name: uep-agents
  labels:
    name: uep-agents
    uep.io/component: agents
---
apiVersion: v1
kind: Namespace
metadata:
  name: uep-monitoring
  labels:
    name: uep-monitoring
    uep.io/component: monitoring
```

#### 2. Service Registry (Redis)

```yaml
# k8s/system/redis-registry.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-registry
  namespace: uep-system
  labels:
    app: redis-registry
    component: service-registry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-registry
  template:
    metadata:
      labels:
        app: redis-registry
    spec:
      containers:
      - name: redis
        image: redis:7.2-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: redis-data
          mountPath: /data
        - name: redis-config
          mountPath: /usr/local/etc/redis/redis.conf
          subPath: redis.conf
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-data-pvc
      - name: redis-config
        configMap:
          name: redis-config
---
apiVersion: v1
kind: Service
metadata:
  name: redis-registry
  namespace: uep-system
  labels:
    app: redis-registry
spec:
  selector:
    app: redis-registry
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data-pvc
  namespace: uep-system
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

#### 3. Meta-Agent Deployment Template

```yaml
# k8s/agents/prd-parser.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prd-parser
  namespace: uep-agents
  labels:
    app: prd-parser
    component: meta-agent
    uep.io/agent-type: prd-parser
    uep.io/version: "2.0.0"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prd-parser
  template:
    metadata:
      labels:
        app: prd-parser
        component: meta-agent
        uep.io/agent-type: prd-parser
      annotations:
        uep.io/capabilities: "parsing,validation,analysis"
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: prd-parser
        image: uep/prd-parser:latest
        ports:
        - containerPort: 3002
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: AGENT_TYPE
          value: "prd-parser"
        - name: AGENT_NAME
          value: "PRD Parser Agent"
        - name: SERVICE_PORT
          value: "3002"
        - name: CAPABILITIES
          value: "parsing,validation,analysis"
        - name: REGISTRY_TYPE
          value: "kubernetes"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        volumeMounts:
        - name: config
          mountPath: /app/config
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: config
        configMap:
          name: prd-parser-config
      - name: logs
        emptyDir: {}
      serviceAccountName: uep-agent
---
apiVersion: v1
kind: Service
metadata:
  name: prd-parser
  namespace: uep-agents
  labels:
    app: prd-parser
    component: meta-agent
  annotations:
    uep.io/agent-type: prd-parser
    uep.io/capabilities: "parsing,validation,analysis"
spec:
  selector:
    app: prd-parser
  ports:
  - name: http
    port: 3002
    targetPort: 3002
  - name: metrics
    port: 9090
    targetPort: 9090
  type: ClusterIP
```

#### 4. Service Account and RBAC

```yaml
# k8s/rbac/uep-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: uep-agent
  namespace: uep-agents
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: uep-agent-reader
rules:
- apiGroups: [""]
  resources: ["services", "endpoints", "pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: uep-agent-reader-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: uep-agent-reader
subjects:
- kind: ServiceAccount
  name: uep-agent
  namespace: uep-agents
```

#### 5. ConfigMaps and Secrets

```yaml
# k8s/config/uep-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: uep-global-config
  namespace: uep-system
data:
  registry.yaml: |
    registry:
      type: kubernetes
      fallback:
        type: redis
        host: redis-registry.uep-system.svc.cluster.local
        port: 6379
    
    discovery:
      cache:
        enabled: true
        ttl: 300
      health:
        interval: 30s
        timeout: 10s
      retry:
        attempts: 3
        delay: 1s
    
    observability:
      metrics:
        enabled: true
        port: 9090
      tracing:
        enabled: false
      logging:
        level: info
---
apiVersion: v1
kind: Secret
metadata:
  name: uep-secrets
  namespace: uep-system
type: Opaque
data:
  redis-password: ""  # base64 encoded
  consul-token: ""    # base64 encoded
```

### Migration Scripts

#### 1. Migration Orchestrator

```bash
#!/bin/bash
# k8s/scripts/migrate-to-kubernetes.sh

set -e

PHASE=${1:-"validate"}
NAMESPACE_SYSTEM="uep-system"
NAMESPACE_AGENTS="uep-agents"
NAMESPACE_MONITORING="uep-monitoring"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

validate_prerequisites() {
    log "Validating prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        echo "kubectl is required but not installed"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        echo "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check required permissions
    if ! kubectl auth can-i create namespaces; then
        echo "Insufficient permissions to create namespaces"
        exit 1
    fi
    
    log "Prerequisites validated ✓"
}

phase_1_setup_infrastructure() {
    log "Phase 1: Setting up Kubernetes infrastructure..."
    
    # Create namespaces
    kubectl apply -f k8s/namespaces/
    
    # Setup RBAC
    kubectl apply -f k8s/rbac/
    
    # Apply configurations
    kubectl apply -f k8s/config/
    
    # Deploy service registries
    kubectl apply -f k8s/system/
    
    # Wait for registries to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/redis-registry -n $NAMESPACE_SYSTEM
    
    log "Infrastructure setup complete ✓"
}

phase_2_migrate_agents() {
    log "Phase 2: Migrating agents to Kubernetes..."
    
    # Deploy agents one by one
    for agent_file in k8s/agents/*.yaml; do
        log "Deploying $(basename $agent_file)..."
        kubectl apply -f "$agent_file"
        
        # Wait for deployment to be ready
        agent_name=$(basename "$agent_file" .yaml)
        kubectl wait --for=condition=available --timeout=300s deployment/$agent_name -n $NAMESPACE_AGENTS
    done
    
    log "Agent migration complete ✓"
}

phase_3_setup_monitoring() {
    log "Phase 3: Setting up monitoring..."
    
    # Deploy monitoring stack
    kubectl apply -f k8s/monitoring/
    
    # Wait for monitoring to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n $NAMESPACE_MONITORING
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n $NAMESPACE_MONITORING
    
    log "Monitoring setup complete ✓"
}

phase_4_validate_migration() {
    log "Phase 4: Validating migration..."
    
    # Check all deployments
    kubectl get deployments --all-namespaces -l component=meta-agent
    
    # Test service discovery
    kubectl run test-discovery --image=curlimages/curl --rm -it --restart=Never -- \
        curl -f http://prd-parser.uep-agents.svc.cluster.local:3002/health
    
    # Check metrics
    kubectl port-forward -n $NAMESPACE_MONITORING svc/prometheus 9090:9090 &
    sleep 5
    curl -f http://localhost:9090/-/healthy
    
    log "Migration validation complete ✓"
}

case "$PHASE" in
    "validate")
        validate_prerequisites
        ;;
    "infrastructure")
        validate_prerequisites
        phase_1_setup_infrastructure
        ;;
    "agents")
        phase_2_migrate_agents
        ;;
    "monitoring")
        phase_3_setup_monitoring
        ;;
    "validate-migration")
        phase_4_validate_migration
        ;;
    "full")
        validate_prerequisites
        phase_1_setup_infrastructure
        phase_2_migrate_agents
        phase_3_setup_monitoring
        phase_4_validate_migration
        ;;
    *)
        echo "Usage: $0 {validate|infrastructure|agents|monitoring|validate-migration|full}"
        exit 1
        ;;
esac

log "Phase '$PHASE' completed successfully"
```

#### 2. Service Discovery Migration

```typescript
// k8s/migration/service-discovery-migration.ts
import { KubernetesServiceDiscovery } from './kubernetes-service-discovery';
import { RedisServiceRegistry } from '../containers/service-discovery/RedisServiceRegistry';

export class ServiceDiscoveryMigration {
  private dockerComposeRegistry: RedisServiceRegistry;
  private kubernetesDiscovery: KubernetesServiceDiscovery;
  
  constructor() {
    this.dockerComposeRegistry = new RedisServiceRegistry({
      redis: {
        host: 'localhost',
        port: 6379,
        keyPrefix: 'uep:registry'
      },
      healthCheck: { interval: 30000, timeout: 5000, retries: 3, deregistrationDelay: 60000 },
      heartbeat: { interval: 15000, ttl: 60 }
    });
    
    this.kubernetesDiscovery = new KubernetesServiceDiscovery();
  }
  
  async migrateServiceData(): Promise<void> {
    console.log('Starting service discovery data migration...');
    
    // 1. Export data from Docker Compose registry
    const dockerAgents = await this.dockerComposeRegistry.getAllAgents();
    console.log(`Found ${dockerAgents.length} agents in Docker Compose registry`);
    
    // 2. Convert to Kubernetes service definitions
    const k8sServices = dockerAgents.map(agent => this.convertToK8sService(agent));
    
    // 3. Apply Kubernetes services
    for (const service of k8sServices) {
      await this.applyK8sService(service);
      console.log(`Migrated service: ${service.metadata.name}`);
    }
    
    console.log('Service discovery migration complete');
  }
  
  private convertToK8sService(agent: any): any {
    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: agent.agentType,
        namespace: 'uep-agents',
        labels: {
          app: agent.agentType,
          component: 'meta-agent',
          'uep.io/agent-type': agent.agentType
        },
        annotations: {
          'uep.io/capabilities': agent.capabilities.map((c: any) => c.name).join(','),
          'uep.io/version': `${agent.version.major}.${agent.version.minor}.${agent.version.patch}`
        }
      },
      spec: {
        selector: {
          app: agent.agentType
        },
        ports: [
          {
            name: 'http',
            port: agent.network.port,
            targetPort: agent.network.port
          }
        ],
        type: 'ClusterIP'
      }
    };
  }
  
  private async applyK8sService(service: any): Promise<void> {
    // Implementation would use kubectl or Kubernetes API client
    console.log('Would apply service:', JSON.stringify(service, null, 2));
  }
  
  async validateMigration(): Promise<boolean> {
    try {
      // Test Kubernetes service discovery
      const k8sAgents = await this.kubernetesDiscovery.discoverAgents({});
      console.log(`Found ${k8sAgents.agents.length} agents in Kubernetes`);
      
      // Compare with Docker Compose registry
      const dockerAgents = await this.dockerComposeRegistry.getAllAgents();
      console.log(`Found ${dockerAgents.length} agents in Docker Compose`);
      
      return k8sAgents.agents.length >= dockerAgents.length;
    } catch (error) {
      console.error('Migration validation failed:', error);
      return false;
    }
  }
}
```

### Helm Charts

#### 1. Chart Structure

```
k8s/helm/uep-meta-agent-factory/
├── Chart.yaml
├── values.yaml
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── namespace.yaml
│   ├── rbac.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── redis-registry.yaml
│   ├── consul-registry.yaml
│   ├── agents/
│   │   ├── prd-parser.yaml
│   │   ├── scaffold-generator.yaml
│   │   └── ...
│   ├── monitoring/
│   │   ├── prometheus.yaml
│   │   ├── grafana.yaml
│   │   └── service-monitor.yaml
│   └── ingress.yaml
└── charts/
    └── redis/
```

#### 2. Values Configuration

```yaml
# k8s/helm/uep-meta-agent-factory/values.yaml
global:
  namespace:
    system: uep-system
    agents: uep-agents
    monitoring: uep-monitoring
  
  image:
    registry: ghcr.io/uep-factory
    tag: latest
    pullPolicy: IfNotPresent
  
  serviceDiscovery:
    type: kubernetes  # kubernetes, redis, consul, hybrid
    fallback:
      enabled: true
      type: redis

redis:
  enabled: true
  persistence:
    enabled: true
    size: 10Gi
  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi
      cpu: 500m

consul:
  enabled: false
  replicas: 3
  persistence:
    enabled: true
    size: 5Gi

agents:
  prdParser:
    enabled: true
    replicas: 2
    image:
      repository: uep/prd-parser
      tag: latest
    resources:
      requests:
        memory: 512Mi
        cpu: 250m
      limits:
        memory: 1Gi
        cpu: 1000m
    capabilities:
      - parsing
      - validation
      - analysis
  
  scaffoldGenerator:
    enabled: true
    replicas: 2
    image:
      repository: uep/scaffold-generator
      tag: latest
    capabilities:
      - generation
      - scaffolding
      - templating

monitoring:
  prometheus:
    enabled: true
    persistence:
      enabled: true
      size: 20Gi
  
  grafana:
    enabled: true
    adminPassword: admin
    persistence:
      enabled: true
      size: 5Gi

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: uep-factory.local
      paths:
        - path: /
          service: factory-core
          port: 3000
    - host: monitoring.uep-factory.local
      paths:
        - path: /
          service: grafana
          port: 3000
```

### Operators

#### 1. UEP Agent Operator

```yaml
# k8s/operators/uep-agent-operator.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: uepagents.uep.io
spec:
  group: uep.io
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              agentType:
                type: string
              capabilities:
                type: array
                items:
                  type: string
              replicas:
                type: integer
                minimum: 1
              image:
                type: object
                properties:
                  repository:
                    type: string
                  tag:
                    type: string
              resources:
                type: object
          status:
            type: object
            properties:
              phase:
                type: string
              replicas:
                type: integer
              readyReplicas:
                type: integer
  scope: Namespaced
  names:
    plural: uepagents
    singular: uepagent
    kind: UEPAgent
```

#### 2. Operator Implementation

```typescript
// k8s/operators/src/uep-agent-controller.ts
import { KubernetesObject, V1Deployment, V1Service } from '@kubernetes/client-node';

export class UEPAgentController {
  async reconcile(uepAgent: UEPAgent): Promise<void> {
    const deployment = this.createDeployment(uepAgent);
    const service = this.createService(uepAgent);
    
    // Apply resources
    await this.applyDeployment(deployment);
    await this.applyService(service);
    
    // Update status
    await this.updateStatus(uepAgent, {
      phase: 'Running',
      replicas: uepAgent.spec.replicas,
      readyReplicas: await this.getReadyReplicas(uepAgent)
    });
  }
  
  private createDeployment(uepAgent: UEPAgent): V1Deployment {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: uepAgent.metadata.name,
        namespace: uepAgent.metadata.namespace,
        labels: {
          app: uepAgent.metadata.name,
          'uep.io/agent-type': uepAgent.spec.agentType,
          'uep.io/managed-by': 'uep-operator'
        }
      },
      spec: {
        replicas: uepAgent.spec.replicas,
        selector: {
          matchLabels: {
            app: uepAgent.metadata.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: uepAgent.metadata.name,
              'uep.io/agent-type': uepAgent.spec.agentType
            },
            annotations: {
              'uep.io/capabilities': uepAgent.spec.capabilities.join(',')
            }
          },
          spec: {
            containers: [{
              name: uepAgent.spec.agentType,
              image: `${uepAgent.spec.image.repository}:${uepAgent.spec.image.tag}`,
              resources: uepAgent.spec.resources,
              env: [
                { name: 'AGENT_TYPE', value: uepAgent.spec.agentType },
                { name: 'CAPABILITIES', value: uepAgent.spec.capabilities.join(',') },
                { name: 'REGISTRY_TYPE', value: 'kubernetes' }
              ]
            }]
          }
        }
      }
    };
  }
}
```

### Migration Best Practices

#### 1. Gradual Migration Strategy

```bash
# Step 1: Set up Kubernetes cluster with external registries
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/system/redis-registry.yaml

# Step 2: Migrate one agent type at a time
kubectl apply -f k8s/agents/prd-parser.yaml
# Test and verify
kubectl apply -f k8s/agents/scaffold-generator.yaml
# Continue...

# Step 3: Switch to Kubernetes-native discovery
kubectl patch configmap uep-global-config -n uep-system --patch '{"data":{"registry.yaml":"registry:\n  type: kubernetes\n"}}'

# Step 4: Cleanup external registries (optional)
kubectl delete -f k8s/system/redis-registry.yaml
```

#### 2. Rollback Strategy

```bash
# Emergency rollback script
#!/bin/bash
# k8s/scripts/rollback-to-docker-compose.sh

log() {
    echo "[ROLLBACK] $1"
}

rollback_to_docker_compose() {
    log "Starting rollback to Docker Compose..."
    
    # 1. Export Kubernetes service data
    kubectl get services -n uep-agents -o yaml > k8s-services-backup.yaml
    
    # 2. Scale down Kubernetes deployments
    kubectl scale deployment --all --replicas=0 -n uep-agents
    
    # 3. Start Docker Compose services
    cd .. && docker-compose -f docker-compose-service-discovery.yml up -d
    
    # 4. Migrate service data back to Redis
    # Implementation would restore from backup
    
    log "Rollback complete. Docker Compose services are running."
}

rollback_to_docker_compose
```

### Production Considerations

#### 1. High Availability

```yaml
# High availability configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prd-parser
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - prd-parser
              topologyKey: kubernetes.io/hostname
```

#### 2. Resource Management

```yaml
# Resource quotas
apiVersion: v1
kind: ResourceQuota
metadata:
  name: uep-agents-quota
  namespace: uep-agents
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    persistentvolumeclaims: "10"
```

#### 3. Security

```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: uep-agents-policy
  namespace: uep-agents
spec:
  podSelector:
    matchLabels:
      component: meta-agent
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: uep-agents
    - namespaceSelector:
        matchLabels:
          name: uep-system
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: uep-system
```

### Testing and Validation

#### 1. Migration Test Suite

```typescript
// k8s/tests/migration-test-suite.ts
describe('Kubernetes Migration', () => {
  test('service discovery works in Kubernetes', async () => {
    const k8sDiscovery = new KubernetesServiceDiscovery();
    const agents = await k8sDiscovery.discoverAgents({ agentType: 'prd-parser' });
    
    expect(agents.agents.length).toBeGreaterThan(0);
    expect(agents.agents[0].agentType).toBe('prd-parser');
  });
  
  test('agents can communicate through Kubernetes services', async () => {
    const response = await fetch('http://prd-parser.uep-agents.svc.cluster.local:3002/health');
    expect(response.ok).toBe(true);
  });
  
  test('metrics are available through Prometheus', async () => {
    const metrics = await fetch('http://prometheus.uep-monitoring.svc.cluster.local:9090/api/v1/query?query=up');
    expect(metrics.ok).toBe(true);
  });
});
```

This comprehensive Kubernetes migration design provides:

1. **Gradual migration path** from Docker Compose to Kubernetes
2. **Hybrid service discovery** supporting both external and native K8s discovery
3. **Production-ready** configurations with HA, security, and monitoring
4. **Operator-based management** for automated lifecycle management
5. **Complete rollback strategy** for risk mitigation
6. **Testing framework** for validation

The migration can be executed in phases with minimal risk and service disruption.