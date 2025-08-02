# 🔧 Docker System Fix Plan

## Current Status
✅ **Working Services (3/13)**:
- Redis (port 6380)
- NATS with JetStream (port 4222/8222)
- etcd (port 2379)

❌ **Broken Services (10/13)**:
- factory-core
- domain-agents
- uep-service
- uep-registry
- api-gateway (Traefik)
- observability (Prometheus/Grafana)
- loki
- tempo
- alertmanager
- otel-collector

## Phase 1: Core Services Fix (Priority: HIGH)

### 1. Factory-Core Issues
**Problems**:
- Missing package.json in containers/factory-core/
- Missing source files in expected locations
- No actual implementation code

**Fix Actions**:
1. Create package.json with real dependencies
2. Create placeholder implementation files
3. Add proper health check endpoint
4. Test build and startup

### 2. Domain-Agents Issues
**Problems**:
- Missing package.json
- Missing implementation files
- No agent coordination code

**Fix Actions**:
1. Create package.json
2. Create basic agent implementations
3. Connect to NATS for messaging
4. Add health checks

### 3. UEP-Service Issues
**Problems**:
- Missing package.json
- No UEP enforcement logic
- Missing protocol validation

**Fix Actions**:
1. Create package.json
2. Implement basic UEP protocol handler
3. Connect to NATS and Redis
4. Add validation middleware

### 4. UEP-Registry Issues
**Problems**:
- Missing TypeScript dependencies
- No build script in package.json
- etcd connection not configured

**Fix Actions**:
1. Fix package.json dependencies
2. Add build script
3. Configure etcd connection
4. Implement service registration

## Phase 2: Infrastructure Services (Priority: MEDIUM)

### 5. API Gateway (Traefik)
**Problems**:
- Complex routing rules
- Missing service discovery

**Fix Actions**:
1. Simplify initial routing
2. Add basic load balancing
3. Configure health checks

### 6. Observability Stack
**Problems**:
- Missing config files
- Complex multi-service setup
- Dashboard provisioning issues

**Fix Actions**:
1. Use standard Prometheus/Grafana images
2. Create minimal configs
3. Add basic dashboards

## Phase 3: Remove Demo Data (Priority: MEDIUM)

### 7. Integration Tests
**Location**: Various test files
**Issues**: 200+ tests with fake/demo data

**Fix Actions**:
1. Identify all test files
2. Replace demo data with real test cases
3. Create test data generators
4. Validate against real APIs

## Phase 4: Real Implementation (Priority: HIGH)

### 8. Actual Business Logic
**What's Needed**:
1. PRD Parser implementation
2. Scaffold Generator logic
3. Meta-agent coordination
4. Domain agent specializations
5. Real workflow engine

## Estimated Timeline

**Week 1**: Fix core services (factory-core, domain-agents, uep-service, uep-registry)
**Week 2**: Fix infrastructure services and observability
**Week 3**: Remove demo data and create real tests
**Week 4**: Implement actual business logic

## Quick Win Strategy

Instead of fixing everything, we could:
1. **Create a minimal working version** with just 3-4 services
2. **Build one real workflow** (e.g., PRD parsing)
3. **Test end-to-end** with that one workflow
4. **Expand from there**

## Next Immediate Steps

1. Create missing package.json files
2. Add minimal implementation code
3. Get factory-core running
4. Get domain-agents running
5. Test NATS communication between them