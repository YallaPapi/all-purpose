/**
 * UEP Grafana Dashboards Management System
 * 
 * Comprehensive Grafana dashboard management for UEP protocol monitoring,
 * including compliance visualization, performance metrics, agent coordination
 * patterns, and distributed tracing correlation.
 * 
 * Features:
 * - Grafana API integration for dashboard management
 * - UEP protocol compliance visualization
 * - Prometheus metrics integration
 * - Jaeger trace correlation panels
 * - Custom panel development for agent coordination
 * - Dashboard-as-code with version control
 * - Real-time alerting and notification
 * 
 * @version 1.0.0
 * @author All-Purpose Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { 
  UEPMessage, 
  UEPMessageMetadata, 
  AgentIdentifier,
  UEPPerformanceReport,
  UEPComplianceReport 
} from '../types/UEPTypes';

// =====================================================
// Dashboard Configuration and Interfaces
// =====================================================

export interface UEPGrafanaConfig {
  enabled: boolean;
  grafana: {
    url: string;
    apiKey: string;
    orgId?: number;
    timeout: number;
  };
  dashboards: {
    autoCreate: boolean;
    updateMode: 'replace' | 'merge' | 'preserve';
    folder: string;
    tags: string[];
  };
  dataSources: {
    prometheus: {
      name: string;
      url: string;
      type: 'prometheus';
      access: 'proxy' | 'direct';
    };
    jaeger: {
      name: string;
      url: string;
      type: 'jaeger';
      access: 'proxy' | 'direct';
    };
    loki?: {
      name: string;
      url: string;
      type: 'loki';
      access: 'proxy' | 'direct';
    };
  };
  panels: {
    refreshInterval: string;
    timeRange: {
      from: string;
      to: string;
    };
    alerting: {
      enabled: boolean;
      notificationChannels: string[];
    };
  };
}

export interface UEPDashboardDefinition {
  id?: number;
  uid?: string;
  title: string;
  tags: string[];
  timezone: string;
  panels: UEPPanelDefinition[];
  templating: {
    list: UEPTemplateVariable[];
  };
  time: {
    from: string;
    to: string;
  };
  refresh: string;
  schemaVersion: number;
  version: number;
}

export interface UEPPanelDefinition {
  id: number;
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'heatmap' | 'stat' | 'gauge' | 'bargauge' | 'text' | 'logs';
  targets: UEPQueryTarget[];
  gridPos: {
    h: number;
    w: number;
    x: number;
    y: number;
  };
  options?: any;
  fieldConfig?: any;
  alert?: UEPAlertDefinition;
}

export interface UEPQueryTarget {
  datasource: string;
  expr?: string; // Prometheus query
  query?: string; // Jaeger/Loki query
  legendFormat?: string;
  interval?: string;
  refId: string;
}

export interface UEPTemplateVariable {
  name: string;
  type: 'query' | 'datasource' | 'interval' | 'custom';
  query?: string;
  datasource?: string;
  options?: Array<{ text: string; value: string }>;
  current: { text: string; value: string };
  hide: number;
  includeAll: boolean;
  multi: boolean;
}

export interface UEPAlertDefinition {
  name: string;
  message: string;
  frequency: string;
  conditions: Array<{
    query: { params: string[] };
    reducer: { type: string; params: any[] };
    evaluator: { params: number[]; type: string };
  }>;
  executionErrorState: 'alerting' | 'keep_state';
  noDataState: 'no_data' | 'keep_state' | 'ok';
  for: string;
}

// =====================================================
// UEP Grafana Dashboards Manager
// =====================================================

export class UEPGrafanaDashboards extends EventEmitter {
  private config: UEPGrafanaConfig;
  private grafanaClient: AxiosInstance;
  private isInitialized: boolean = false;
  private dashboardCache: Map<string, UEPDashboardDefinition> = new Map();
  private dataSourceIds: Map<string, number> = new Map();

  constructor(config: UEPGrafanaConfig) {
    super();
    this.config = this.validateConfig(config);
    this.grafanaClient = this.createGrafanaClient();
  }

  // =====================================================
  // Initialization and Setup
  // =====================================================

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('UEP Grafana Dashboards already initialized');
    }

    try {
      // Test Grafana connection
      await this.testConnection();

      // Setup data sources
      await this.setupDataSources();

      // Create folder if needed
      await this.ensureFolderExists();

      // Create default dashboards if enabled
      if (this.config.dashboards.autoCreate) {
        await this.createDefaultDashboards();
      }

      this.isInitialized = true;
      this.emit('dashboards:initialized');

      console.log('UEP Grafana Dashboards initialized successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Clear cache
      this.dashboardCache.clear();
      this.dataSourceIds.clear();

      this.isInitialized = false;
      this.emit('dashboards:shutdown');

      console.log('UEP Grafana Dashboards shutdown successfully');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // Dashboard Management
  // =====================================================

  public async createUEPOverviewDashboard(): Promise<UEPDashboardDefinition> {
    const dashboard: UEPDashboardDefinition = {
      title: 'UEP System Overview',
      tags: ['uep', 'overview', 'system'],
      timezone: 'browser',
      panels: [
        // System Health Panel
        {
          id: 1,
          title: 'UEP System Health',
          type: 'stat',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'uep_agent_status{status="active"}',
            legendFormat: 'Active Agents',
            refId: 'A'
          }],
          gridPos: { h: 8, w: 6, x: 0, y: 0 },
          options: {
            reduceOptions: {
              values: false,
              calcs: ['lastNotNull'],
              fields: ''
            },
            orientation: 'auto',
            textMode: 'auto',
            colorMode: 'value',
            graphMode: 'area',
            justifyMode: 'auto'
          },
          fieldConfig: {
            defaults: {
              color: { mode: 'thresholds' },
              thresholds: {
                mode: 'absolute',
                steps: [
                  { color: 'red', value: 0 },
                  { color: 'yellow', value: 5 },
                  { color: 'green', value: 10 }
                ]
              }
            }
          }
        },

        // Protocol Compliance Rate
        {
          id: 2,
          title: 'Protocol Compliance Rate',
          type: 'gauge',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'avg(uep_compliance_rate)',
            legendFormat: 'Compliance Rate',
            refId: 'B'
          }],
          gridPos: { h: 8, w: 6, x: 6, y: 0 },
          options: {
            reduceOptions: {
              values: false,
              calcs: ['lastNotNull'],
              fields: ''
            },
            orientation: 'auto',
            textMode: 'auto'
          },
          fieldConfig: {
            defaults: {
              min: 0,
              max: 1,
              unit: 'percentunit',
              thresholds: {
                mode: 'absolute',
                steps: [
                  { color: 'red', value: 0 },
                  { color: 'yellow', value: 0.9 },
                  { color: 'green', value: 0.95 }
                ]
              }
            }
          }
        },

        // Message Throughput
        {
          id: 3,
          title: 'Message Throughput',
          type: 'graph',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'rate(uep_messages_total[5m])',
            legendFormat: 'Messages/sec - {{agent_id}}',
            refId: 'C'
          }],
          gridPos: { h: 8, w: 12, x: 12, y: 0 },
          options: {
            legend: {
              displayMode: 'table',
              placement: 'bottom'
            },
            tooltip: { mode: 'multi' }
          }
        },

        // Error Rate
        {
          id: 4,
          title: 'Error Rate by Agent',
          type: 'bargauge',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'rate(uep_errors_total[5m]) by (agent_id)',
            legendFormat: '{{agent_id}}',
            refId: 'D'
          }],
          gridPos: { h: 8, w: 12, x: 0, y: 8 },
          options: {
            orientation: 'horizontal',
            displayMode: 'gradient'
          },
          fieldConfig: {
            defaults: {
              color: { mode: 'continuous-GrYlRd' },
              thresholds: {
                mode: 'absolute',
                steps: [
                  { color: 'green', value: 0 },
                  { color: 'yellow', value: 0.01 },
                  { color: 'red', value: 0.05 }
                ]
              }
            }
          }
        },

        // Coordination Patterns
        {
          id: 5,
          title: 'Agent Coordination Patterns',
          type: 'table',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'sum by (pattern, status) (uep_coordinations_total)',
            legendFormat: '{{pattern}} - {{status}}',
            refId: 'E'
          }],
          gridPos: { h: 8, w: 12, x: 12, y: 8 }
        }
      ],
      templating: {
        list: [
          {
            name: 'agent_id',
            type: 'query',
            query: 'label_values(uep_agent_status, agent_id)',
            datasource: this.config.dataSources.prometheus.name,
            current: { text: 'All', value: '$__all' },
            hide: 0,
            includeAll: true,
            multi: true
          }
        ]
      },
      time: {
        from: this.config.panels.timeRange.from,
        to: this.config.panels.timeRange.to
      },
      refresh: this.config.panels.refreshInterval,
      schemaVersion: 30,
      version: 1
    };

    return this.createDashboard(dashboard);
  }

  public async createUEPComplianceDashboard(): Promise<UEPDashboardDefinition> {
    const dashboard: UEPDashboardDefinition = {
      title: 'UEP Protocol Compliance',
      tags: ['uep', 'compliance', 'protocol'],
      timezone: 'browser',
      panels: [
        // Compliance Heatmap
        {
          id: 1,
          title: 'Compliance Heatmap by Agent and Time',
          type: 'heatmap',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'uep_compliance_rate by (agent_id)',
            refId: 'A'
          }],
          gridPos: { h: 8, w: 24, x: 0, y: 0 },
          options: {
            calculate: true,
            cellGap: 2,
            cellRadius: 0,
            color: {
              exponent: 0.5,
              fill: 'dark-orange',
              mode: 'spectrum',
              reverse: false,
              scale: 'exponential',
              scheme: 'RdYlGn'
            }
          }
        },

        // Violation Types
        {
          id: 2,
          title: 'Protocol Violations by Type',
          type: 'bargauge',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'sum by (error_type) (uep_errors_total{error_type=~".*VIOLATION.*"})',
            legendFormat: '{{error_type}}',
            refId: 'B'
          }],
          gridPos: { h: 8, w: 12, x: 0, y: 8 },
          alert: {
            name: 'High Protocol Violations',
            message: 'Protocol violations exceed threshold',
            frequency: '10s',
            conditions: [{
              query: { params: ['B', '5m', 'now'] },
              reducer: { type: 'avg', params: [] },
              evaluator: { params: [10], type: 'gt' }
            }],
            executionErrorState: 'alerting',
            noDataState: 'no_data',
            for: '5m'
          }
        },

        // Agent Compliance Ranking
        {
          id: 3,
          title: 'Agent Compliance Ranking',
          type: 'table',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'sort_desc(uep_compliance_rate)',
            refId: 'C'
          }],
          gridPos: { h: 8, w: 12, x: 12, y: 8 }
        }
      ],
      templating: {
        list: [
          {
            name: 'compliance_threshold',
            type: 'custom',
            options: [
              { text: '90%', value: '0.9' },
              { text: '95%', value: '0.95' },
              { text: '99%', value: '0.99' }
            ],
            current: { text: '95%', value: '0.95' },
            hide: 0,
            includeAll: false,
            multi: false
          }
        ]
      },
      time: {
        from: this.config.panels.timeRange.from,
        to: this.config.panels.timeRange.to
      },
      refresh: this.config.panels.refreshInterval,
      schemaVersion: 30,
      version: 1
    };

    return this.createDashboard(dashboard);
  }

  public async createUEPPerformanceDashboard(): Promise<UEPDashboardDefinition> {
    const dashboard: UEPDashboardDefinition = {
      title: 'UEP Performance Metrics',
      tags: ['uep', 'performance', 'metrics'],
      timezone: 'browser',
      panels: [
        // Latency Distribution
        {
          id: 1,
          title: 'Message Processing Latency Distribution',
          type: 'heatmap',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'histogram_quantile(0.95, rate(uep_message_duration_seconds_bucket[5m]))',
            refId: 'A'
          }],
          gridPos: { h: 8, w: 24, x: 0, y: 0 }
        },

        // Throughput by Agent Type
        {
          id: 2,
          title: 'Throughput by Agent Type',
          type: 'graph',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'sum by (agent_type) (rate(uep_messages_total[5m]))',
            legendFormat: '{{agent_type}}',
            refId: 'B'
          }],
          gridPos: { h: 8, w: 12, x: 0, y: 8 }
        },

        // Resource Utilization
        {
          id: 3,
          title: 'Agent Resource Utilization',
          type: 'graph',
          targets: [
            {
              datasource: this.config.dataSources.prometheus.name,
              expr: 'avg by (agent_id) (uep_agent_resource_utilization{resource_type="cpu"})',
              legendFormat: 'CPU - {{agent_id}}',
              refId: 'C'
            },
            {
              datasource: this.config.dataSources.prometheus.name,
              expr: 'avg by (agent_id) (uep_agent_resource_utilization{resource_type="memory"})',
              legendFormat: 'Memory - {{agent_id}}',
              refId: 'D'
            }
          ],
          gridPos: { h: 8, w: 12, x: 12, y: 8 }
        }
      ],
      templating: {
        list: [
          {
            name: 'percentile',
            type: 'custom',
            options: [
              { text: '50th', value: '0.5' },
              { text: '95th', value: '0.95' },
              { text: '99th', value: '0.99' }
            ],
            current: { text: '95th', value: '0.95' },
            hide: 0,
            includeAll: false,
            multi: false
          }
        ]
      },
      time: {
        from: this.config.panels.timeRange.from,
        to: this.config.panels.timeRange.to
      },
      refresh: this.config.panels.refreshInterval,
      schemaVersion: 30,
      version: 1
    };

    return this.createDashboard(dashboard);
  }

  public async createUEPTracingDashboard(): Promise<UEPDashboardDefinition> {
    const dashboard: UEPDashboardDefinition = {
      title: 'UEP Distributed Tracing',
      tags: ['uep', 'tracing', 'jaeger'],
      timezone: 'browser',
      panels: [
        // Trace Overview
        {
          id: 1,
          title: 'Trace Statistics',
          type: 'stat',
          targets: [{
            datasource: this.config.dataSources.jaeger.name,
            query: '{service="uep-service"} | count() by (operation)',
            refId: 'A'
          }],
          gridPos: { h: 4, w: 24, x: 0, y: 0 }
        },

        // Service Map would require custom panel or integration
        {
          id: 2,
          title: 'UEP Service Dependencies',
          type: 'text',
          gridPos: { h: 8, w: 12, x: 0, y: 4 },
          options: {
            content: 'Service dependency visualization would be implemented here using Jaeger service map or custom visualization.'
          }
        },

        // Trace Duration Distribution
        {
          id: 3,
          title: 'Trace Duration Distribution',
          type: 'graph',
          targets: [{
            datasource: this.config.dataSources.prometheus.name,
            expr: 'histogram_quantile(0.95, rate(jaeger_trace_duration_seconds_bucket[5m]))',
            refId: 'B'
          }],
          gridPos: { h: 8, w: 12, x: 12, y: 4 }
        }
      ],
      templating: {
        list: [
          {
            name: 'service',
            type: 'query',
            query: 'label_values(jaeger_spans_total, service)',
            datasource: this.config.dataSources.jaeger.name,
            current: { text: 'All', value: '$__all' },
            hide: 0,
            includeAll: true,
            multi: true
          }
        ]
      },
      time: {
        from: this.config.panels.timeRange.from,
        to: this.config.panels.timeRange.to
      },
      refresh: this.config.panels.refreshInterval,
      schemaVersion: 30,
      version: 1
    };

    return this.createDashboard(dashboard);
  }

  // =====================================================
  // Dashboard Operations
  // =====================================================

  public async createDashboard(dashboard: UEPDashboardDefinition): Promise<UEPDashboardDefinition> {
    try {
      const response = await this.grafanaClient.post('/api/dashboards/db', {
        dashboard,
        folderId: await this.getFolderId(),
        overwrite: this.config.dashboards.updateMode === 'replace'
      });

      const createdDashboard = response.data.dashboard;
      this.dashboardCache.set(createdDashboard.uid, createdDashboard);

      this.emit('dashboard:created', { uid: createdDashboard.uid, title: createdDashboard.title });

      console.log(`Created dashboard: ${createdDashboard.title} (${createdDashboard.uid})`);
      return createdDashboard;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async updateDashboard(uid: string, dashboard: Partial<UEPDashboardDefinition>): Promise<UEPDashboardDefinition> {
    try {
      const existing = await this.getDashboard(uid);
      const updated = { ...existing, ...dashboard, uid };

      const response = await this.grafanaClient.post('/api/dashboards/db', {
        dashboard: updated,
        folderId: await this.getFolderId(),
        overwrite: true
      });

      const updatedDashboard = response.data.dashboard;
      this.dashboardCache.set(uid, updatedDashboard);

      this.emit('dashboard:updated', { uid, title: updatedDashboard.title });

      return updatedDashboard;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async getDashboard(uid: string): Promise<UEPDashboardDefinition> {
    try {
      // Check cache first
      if (this.dashboardCache.has(uid)) {
        return this.dashboardCache.get(uid)!;
      }

      const response = await this.grafanaClient.get(`/api/dashboards/uid/${uid}`);
      const dashboard = response.data.dashboard;

      this.dashboardCache.set(uid, dashboard);
      return dashboard;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async deleteDashboard(uid: string): Promise<void> {
    try {
      await this.grafanaClient.delete(`/api/dashboards/uid/${uid}`);
      this.dashboardCache.delete(uid);

      this.emit('dashboard:deleted', { uid });
      console.log(`Deleted dashboard: ${uid}`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async listDashboards(): Promise<Array<{ uid: string; title: string; tags: string[] }>> {
    try {
      const response = await this.grafanaClient.get('/api/search', {
        params: {
          type: 'dash-db',
          tag: this.config.dashboards.tags.join(',')
        }
      });

      return response.data.map((item: any) => ({
        uid: item.uid,
        title: item.title,
        tags: item.tags
      }));
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // Alerting Management
  // =====================================================

  public async createAlert(dashboardUid: string, panelId: number, alert: UEPAlertDefinition): Promise<void> {
    try {
      const dashboard = await this.getDashboard(dashboardUid);
      const panel = dashboard.panels.find(p => p.id === panelId);
      
      if (!panel) {
        throw new Error(`Panel ${panelId} not found in dashboard ${dashboardUid}`);
      }

      panel.alert = alert;
      await this.updateDashboard(dashboardUid, dashboard);

      this.emit('alert:created', { dashboardUid, panelId, alertName: alert.name });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  public async exportDashboard(uid: string): Promise<string> {
    try {
      const dashboard = await this.getDashboard(uid);
      return JSON.stringify(dashboard, null, 2);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  public async importDashboard(dashboardJson: string): Promise<UEPDashboardDefinition> {
    try {
      const dashboard = JSON.parse(dashboardJson);
      delete dashboard.id; // Remove ID to create new
      delete dashboard.uid; // Remove UID to create new

      return this.createDashboard(dashboard);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // =====================================================
  // Private Implementation Methods
  // =====================================================

  private validateConfig(config: UEPGrafanaConfig): UEPGrafanaConfig {
    if (!config.enabled) {
      throw new Error('UEP Grafana Dashboards must be enabled');
    }

    if (!config.grafana.url || !config.grafana.apiKey) {
      throw new Error('Grafana URL and API key are required');
    }

    return {
      ...config,
      dashboards: {
        autoCreate: true,
        updateMode: 'replace',
        folder: 'UEP Monitoring',
        tags: ['uep'],
        ...config.dashboards
      },
      panels: {
        refreshInterval: '5s',
        timeRange: { from: 'now-1h', to: 'now' },
        alerting: { enabled: true, notificationChannels: [] },
        ...config.panels
      }
    };
  }

  private createGrafanaClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.grafana.url,
      timeout: this.config.grafana.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.grafana.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.grafanaClient.get('/api/health');
      if (response.status !== 200) {
        throw new Error(`Grafana health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to Grafana: ${error.message}`);
    }
  }

  private async setupDataSources(): Promise<void> {
    try {
      // Setup Prometheus data source
      await this.createOrUpdateDataSource({
        name: this.config.dataSources.prometheus.name,
        type: this.config.dataSources.prometheus.type,
        url: this.config.dataSources.prometheus.url,
        access: this.config.dataSources.prometheus.access,
        isDefault: true
      });

      // Setup Jaeger data source
      await this.createOrUpdateDataSource({
        name: this.config.dataSources.jaeger.name,
        type: this.config.dataSources.jaeger.type,
        url: this.config.dataSources.jaeger.url,
        access: this.config.dataSources.jaeger.access
      });

      // Setup Loki data source if configured
      if (this.config.dataSources.loki) {
        await this.createOrUpdateDataSource({
          name: this.config.dataSources.loki.name,
          type: this.config.dataSources.loki.type,
          url: this.config.dataSources.loki.url,
          access: this.config.dataSources.loki.access
        });
      }
    } catch (error) {
      console.warn('Failed to setup some data sources:', error.message);
    }
  }

  private async createOrUpdateDataSource(dataSource: any): Promise<void> {
    try {
      // Try to get existing data source
      const existingResponse = await this.grafanaClient.get(`/api/datasources/name/${dataSource.name}`);
      const existingId = existingResponse.data.id;

      // Update existing
      await this.grafanaClient.put(`/api/datasources/${existingId}`, {
        ...dataSource,
        id: existingId
      });

      this.dataSourceIds.set(dataSource.name, existingId);
    } catch (error) {
      if (error.response?.status === 404) {
        // Create new data source
        const response = await this.grafanaClient.post('/api/datasources', dataSource);
        this.dataSourceIds.set(dataSource.name, response.data.id);
      } else {
        throw error;
      }
    }
  }

  private async ensureFolderExists(): Promise<void> {
    try {
      const response = await this.grafanaClient.get('/api/folders', {
        params: { query: this.config.dashboards.folder }
      });

      const folder = response.data.find((f: any) => f.title === this.config.dashboards.folder);
      if (!folder) {
        await this.grafanaClient.post('/api/folders', {
          title: this.config.dashboards.folder,
          uid: this.config.dashboards.folder.toLowerCase().replace(/\s+/g, '-')
        });
      }
    } catch (error) {
      console.warn('Failed to ensure folder exists:', error.message);
    }
  }

  private async getFolderId(): Promise<number | undefined> {
    try {
      const response = await this.grafanaClient.get('/api/folders', {
        params: { query: this.config.dashboards.folder }
      });

      const folder = response.data.find((f: any) => f.title === this.config.dashboards.folder);
      return folder?.id;
    } catch (error) {
      return undefined;
    }
  }

  private async createDefaultDashboards(): Promise<void> {
    try {
      await this.createUEPOverviewDashboard();
      await this.createUEPComplianceDashboard();
      await this.createUEPPerformanceDashboard();
      await this.createUEPTracingDashboard();

      console.log('Created default UEP dashboards');
    } catch (error) {
      console.warn('Failed to create some default dashboards:', error.message);
    }
  }
}

// =====================================================
// Factory Function
// =====================================================

export function createUEPGrafanaDashboards(config: Partial<UEPGrafanaConfig> = {}): UEPGrafanaDashboards {
  const defaultConfig: UEPGrafanaConfig = {
    enabled: true,
    grafana: {
      url: 'http://localhost:3000',
      apiKey: process.env.GRAFANA_API_KEY || '',
      orgId: 1,
      timeout: 30000
    },
    dashboards: {
      autoCreate: true,
      updateMode: 'replace',
      folder: 'UEP Monitoring',
      tags: ['uep', 'monitoring', 'observability']
    },
    dataSources: {
      prometheus: {
        name: 'UEP Prometheus',
        url: 'http://localhost:9090',
        type: 'prometheus',
        access: 'proxy'
      },
      jaeger: {
        name: 'UEP Jaeger',
        url: 'http://localhost:16686',
        type: 'jaeger',
        access: 'proxy'
      }
    },
    panels: {
      refreshInterval: '5s',
      timeRange: {
        from: 'now-1h',
        to: 'now'
      },
      alerting: {
        enabled: true,
        notificationChannels: ['default']
      }
    }
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    grafana: { ...defaultConfig.grafana, ...config.grafana },
    dashboards: { ...defaultConfig.dashboards, ...config.dashboards },
    dataSources: {
      prometheus: { ...defaultConfig.dataSources.prometheus, ...config.dataSources?.prometheus },
      jaeger: { ...defaultConfig.dataSources.jaeger, ...config.dataSources?.jaeger },
      ...(config.dataSources?.loki && { loki: config.dataSources.loki })
    },
    panels: { ...defaultConfig.panels, ...config.panels }
  };

  return new UEPGrafanaDashboards(mergedConfig);
}

export default UEPGrafanaDashboards;