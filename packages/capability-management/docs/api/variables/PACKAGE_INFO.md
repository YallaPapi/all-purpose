[**UEP Capability Management API v1.0.0**](../README.md)

***

[UEP Capability Management API](../globals.md) / PACKAGE\_INFO

# Variable: PACKAGE\_INFO

> `const` **PACKAGE\_INFO**: `object`

Defined in: [src/index.ts:122](https://github.com/your-org/allpurp/blob/main/packages/capability-management/src/index.ts#L122)

## Type declaration

### description

> `readonly` **description**: `"UEP Agent Capability Management System with Registry Service, Discovery API, and Semantic Versioning"` = `'UEP Agent Capability Management System with Registry Service, Discovery API, and Semantic Versioning'`

### endpoints

> `readonly` **endpoints**: `object`

#### endpoints.discovery

> `readonly` **discovery**: readonly \[`"GET /api/v1/capabilities"`, `"GET /api/v1/capabilities/:capabilityId"`, `"GET /api/v1/capabilities/:capabilityId/versions"`, `"GET /api/v1/agents"`, `"GET /api/v1/agents/:agentId"`\]

#### endpoints.health

> `readonly` **health**: readonly \[`"GET /health"`, `"GET /api/v1/health/agents"`, `"GET /api/v1/health/capabilities"`\]

#### endpoints.monitoring

> `readonly` **monitoring**: readonly \[`"GET /api/v1/metrics"`, `"GET /api/v1/admin/stats"`, `"POST /api/v1/admin/cleanup"`\]

#### endpoints.registration

> `readonly` **registration**: readonly \[`"POST /api/v1/agents/register"`, `"PUT /api/v1/agents/:agentId/capabilities"`, `"POST /api/v1/agents/:agentId/heartbeat"`, `"DELETE /api/v1/agents/:agentId"`\]

### features

> `readonly` **features**: readonly \[`"Semantic versioning with SemVer compliance"`, `"Agent capability registration and discovery"`, `"Version compatibility checking and negotiation"`, `"Redis-based storage with TTL support"`, `"Express.js REST API with comprehensive endpoints"`, `"Consul integration for service discovery"`, `"Real-time health monitoring and heartbeat management"`, `"Comprehensive observability with metrics and logging"`, `"Enterprise-grade production readiness"`\]

### name

> `readonly` **name**: `"@uep/capability-management"` = `'@uep/capability-management'`

### version

> `readonly` **version**: `"1.0.0"` = `'1.0.0'`
