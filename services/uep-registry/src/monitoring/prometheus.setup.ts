/**
 * Prometheus Metrics Setup
 * 
 * Configures Prometheus metrics collection for the UEP Registry Service
 * including custom metrics for registry operations and etcd performance.
 */

import { INestApplication } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import * as promApiMetrics from 'prometheus-api-metrics';

// Custom metrics for UEP Registry
export const registryMetrics = {
  // Agent registration metrics
  agentRegistrations: new Counter({
    name: 'uep_registry_agent_registrations_total',
    help: 'Total number of agent registrations',
    labelNames: ['agent_type', 'agent_name', 'status'],
  }),

  agentDeregistrations: new Counter({
    name: 'uep_registry_agent_deregistrations_total',
    help: 'Total number of agent deregistrations',
    labelNames: ['agent_type', 'agent_name', 'reason'],
  }),

  activeAgents: new Gauge({
    name: 'uep_registry_active_agents',
    help: 'Number of currently active agents',
    labelNames: ['agent_type'],
  }),

  // Discovery metrics
  discoveryRequests: new Counter({
    name: 'uep_registry_discovery_requests_total',
    help: 'Total number of discovery requests',
    labelNames: ['query_type', 'status'],
  }),

  discoveryDuration: new Histogram({
    name: 'uep_registry_discovery_duration_seconds',
    help: 'Duration of discovery requests',
    labelNames: ['query_type'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
  }),

  // Health check metrics
  healthChecks: new Counter({
    name: 'uep_registry_health_checks_total',
    help: 'Total number of health checks performed',
    labelNames: ['agent_id', 'status'],
  }),

  healthCheckDuration: new Histogram({
    name: 'uep_registry_health_check_duration_seconds',
    help: 'Duration of health checks',
    labelNames: ['agent_id'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
  }),

  // etcd metrics
  etcdOperations: new Counter({
    name: 'uep_registry_etcd_operations_total',
    help: 'Total number of etcd operations',
    labelNames: ['operation', 'status'],
  }),

  etcdOperationDuration: new Histogram({
    name: 'uep_registry_etcd_operation_duration_seconds',
    help: 'Duration of etcd operations',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
  }),

  etcdConnections: new Gauge({
    name: 'uep_registry_etcd_connections',
    help: 'Number of active etcd connections',
  }),

  // Watch metrics
  activeWatches: new Gauge({
    name: 'uep_registry_active_watches',
    help: 'Number of active watch connections',
    labelNames: ['watch_type'],
  }),

  watchEvents: new Counter({
    name: 'uep_registry_watch_events_total',
    help: 'Total number of watch events',
    labelNames: ['event_type', 'watch_type'],
  }),

  // Cache metrics
  cacheHits: new Counter({
    name: 'uep_registry_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  }),

  cacheMisses: new Counter({
    name: 'uep_registry_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  }),

  cacheSize: new Gauge({
    name: 'uep_registry_cache_size',
    help: 'Current cache size',
    labelNames: ['cache_type'],
  }),

  // Protocol compatibility metrics
  protocolVersions: new Gauge({
    name: 'uep_registry_protocol_versions',
    help: 'Number of agents by UEP protocol version',
    labelNames: ['protocol_version'],
  }),

  incompatibleRequests: new Counter({
    name: 'uep_registry_incompatible_requests_total',
    help: 'Total number of incompatible protocol requests',
    labelNames: ['client_version', 'required_version'],
  }),
};

export function setupPrometheusMetrics(app: INestApplication): void {
  // Collect default Node.js metrics
  collectDefaultMetrics({
    register,
    prefix: 'uep_registry_',
  });

  // Setup API metrics middleware
  app.use(promApiMetrics({
    metricsPath: '/metrics',
    defaultMetricsInterval: 5000,
    requestDurationBuckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
    requestSizeBuckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    responseSizeBuckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    excludeRoutes: ['/health', '/metrics'],
  }));

  // Register custom metrics
  register.registerMetric(registryMetrics.agentRegistrations);
  register.registerMetric(registryMetrics.agentDeregistrations);
  register.registerMetric(registryMetrics.activeAgents);
  register.registerMetric(registryMetrics.discoveryRequests);
  register.registerMetric(registryMetrics.discoveryDuration);
  register.registerMetric(registryMetrics.healthChecks);
  register.registerMetric(registryMetrics.healthCheckDuration);
  register.registerMetric(registryMetrics.etcdOperations);
  register.registerMetric(registryMetrics.etcdOperationDuration);
  register.registerMetric(registryMetrics.etcdConnections);
  register.registerMetric(registryMetrics.activeWatches);
  register.registerMetric(registryMetrics.watchEvents);
  register.registerMetric(registryMetrics.cacheHits);
  register.registerMetric(registryMetrics.cacheMisses);
  register.registerMetric(registryMetrics.cacheSize);
  register.registerMetric(registryMetrics.protocolVersions);
  register.registerMetric(registryMetrics.incompatibleRequests);

  console.log('✅ Prometheus metrics configured');
}

// Helper functions for metric collection
export const metricsHelpers = {
  recordAgentRegistration: (agentType: string, agentName: string, status: 'success' | 'failure') => {
    registryMetrics.agentRegistrations.inc({ agent_type: agentType, agent_name: agentName, status });
  },

  recordAgentDeregistration: (agentType: string, agentName: string, reason: string) => {
    registryMetrics.agentDeregistrations.inc({ agent_type: agentType, agent_name: agentName, reason });
  },

  setActiveAgents: (agentType: string, count: number) => {
    registryMetrics.activeAgents.set({ agent_type: agentType }, count);
  },

  recordDiscoveryRequest: (queryType: string, status: 'success' | 'failure', duration: number) => {
    registryMetrics.discoveryRequests.inc({ query_type: queryType, status });
    registryMetrics.discoveryDuration.observe({ query_type: queryType }, duration);
  },

  recordHealthCheck: (agentId: string, status: 'success' | 'failure', duration: number) => {
    registryMetrics.healthChecks.inc({ agent_id: agentId, status });
    registryMetrics.healthCheckDuration.observe({ agent_id: agentId }, duration);
  },

  recordEtcdOperation: (operation: string, status: 'success' | 'failure', duration: number) => {
    registryMetrics.etcdOperations.inc({ operation, status });
    registryMetrics.etcdOperationDuration.observe({ operation }, duration);
  },

  setEtcdConnections: (count: number) => {
    registryMetrics.etcdConnections.set(count);
  },

  setActiveWatches: (watchType: string, count: number) => {
    registryMetrics.activeWatches.set({ watch_type: watchType }, count);
  },

  recordWatchEvent: (eventType: string, watchType: string) => {
    registryMetrics.watchEvents.inc({ event_type: eventType, watch_type: watchType });
  },

  recordCacheHit: (cacheType: string) => {
    registryMetrics.cacheHits.inc({ cache_type: cacheType });
  },

  recordCacheMiss: (cacheType: string) => {
    registryMetrics.cacheMisses.inc({ cache_type: cacheType });
  },

  setCacheSize: (cacheType: string, size: number) => {
    registryMetrics.cacheSize.set({ cache_type: cacheType }, size);
  },

  setProtocolVersionCount: (version: string, count: number) => {
    registryMetrics.protocolVersions.set({ protocol_version: version }, count);
  },

  recordIncompatibleRequest: (clientVersion: string, requiredVersion: string) => {
    registryMetrics.incompatibleRequests.inc({ client_version: clientVersion, required_version: requiredVersion });
  },
};