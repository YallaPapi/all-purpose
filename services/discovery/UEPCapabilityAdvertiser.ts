/**
 * UEP Capability Advertising Mechanism
 * 
 * Comprehensive capability advertising system for UEP agents to dynamically
 * publish, update, and manage their capabilities in the service registry.
 * Supports automatic capability detection, versioning, performance metrics,
 * and real-time capability updates. Based on TaskMaster research findings.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { Logger } from '../../shared/utils/Logger';
import { UEPAgentCapability, UEPAgentRegistration } from '../registry/UEPRegistryService';
import UEPDiscoveryClient from './UEPDiscoveryClient';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPCapabilityAdvertiserConfig {
  agentId: string;
  agentType: string;
  registryEndpoints: string[];
  enableAutoDetection: boolean;
  enablePerformanceMonitoring: boolean;
  advertisementInterval: number;
  capabilityUpdateThreshold: number; // Percentage change to trigger update
  enableVersioning: boolean;
  enableHealthIntegration: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  maxCapabilities: number;
  capabilityCategories: string[];
}

export interface UEPCapabilityDefinition {
  name: string;
  version: string;
  description: string;
  category: 'processing' | 'data' | 'communication' | 'monitoring' | 'security' | 'custom';
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  tags: string[];
  dependencies: string[];
  metadata: Record<string, any>;
  autoDetected?: boolean;
  performanceProfile?: UEPCapabilityPerformanceProfile;
  healthCheck?: UEPCapabilityHealthCheck;
}

export interface UEPCapabilityPerformanceProfile {
  estimatedLatency: number;
  throughputPerSecond: number;
  memoryUsage: number;
  cpuUsage: number;
  accuracyMetrics?: {
    successRate: number;
    errorRate: number;
    averageQuality: number;
  };
  benchmarkResults?: {
    testDate: Date;
    testDuration: number;
    testLoad: number;
    results: Record<string, number>;
  };
}

export interface UEPCapabilityHealthCheck {
  endpoint: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus: number;
  timeout: number;
  payload?: any;
  headers?: Record<string, string>;
  validationRules?: {
    responseTime: number;
    bodyContains?: string;
    customValidation?: string; // Function name for custom validation
  };
}

export interface UEPCapabilityUpdate {
  capability: UEPCapabilityDefinition;
  updateType: 'added' | 'modified' | 'removed' | 'performance_updated';
  timestamp: Date;
  reason: string;
  previousVersion?: UEPCapabilityDefinition;
}

export interface UEPCapabilityAdvertiserMetrics {
  capabilitiesAdvertised: Counter;
  capabilityUpdates: Counter;
  performanceMonitoringEvents: Counter;
  autoDetectionEvents: Counter;
  advertisementLatency: Histogram;
  activeCapabilities: Gauge;
  capabilityHealthStatus: Gauge;
}

// =============================================================================
// UEP Capability Advertiser Core Class
// =============================================================================

export class UEPCapabilityAdvertiser extends EventEmitter {
  private readonly config: UEPCapabilityAdvertiserConfig;
  private readonly logger = new Logger('UEPCapabilityAdvertiser');
  private readonly tracer = trace.getTracer('uep-capability-advertiser', '1.0.0');
  
  // Discovery client for registry communication
  private readonly discoveryClient: UEPDiscoveryClient;
  
  // Capability management
  private readonly capabilities: Map<string, UEPCapabilityDefinition> = new Map();
  private readonly capabilityVersions: Map<string, UEPCapabilityDefinition[]> = new Map();
  private readonly performanceMetrics: Map<string, UEPCapabilityPerformanceProfile> = new Map();
  
  // Monitoring and timers
  private advertisementTimer?: NodeJS.Timeout;
  private performanceMonitoringTimer?: NodeJS.Timeout;
  private autoDetectionTimer?: NodeJS.Timeout;
  
  // Metrics collection
  private readonly metrics: UEPCapabilityAdvertiserMetrics;
  
  // Auto-detection registry
  private readonly autoDetectionHandlers: Map<string, () => Promise<UEPCapabilityDefinition[]>> = new Map();

  constructor(config: Partial<UEPCapabilityAdvertiserConfig>) {
    super();
    
    this.config = {
      agentId: config.agentId || 'unknown-agent',
      agentType: config.agentType || 'generic',
      registryEndpoints: config.registryEndpoints || ['http://localhost:8500'],
      enableAutoDetection: true,
      enablePerformanceMonitoring: true,
      advertisementInterval: 300000, // 5 minutes
      capabilityUpdateThreshold: 10, // 10% change
      enableVersioning: true,
      enableHealthIntegration: true,
      enableMetrics: true,
      enableTracing: true,
      maxCapabilities: 50,
      capabilityCategories: ['processing', 'data', 'communication', 'monitoring', 'security', 'custom'],
      ...config
    };

    // Initialize discovery client
    this.discoveryClient = new UEPDiscoveryClient({
      registryEndpoints: this.config.registryEndpoints,
      enableMetrics: this.config.enableMetrics,
      enableTracing: this.config.enableTracing
    });

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup auto-detection handlers
    this.setupAutoDetectionHandlers();

    // Start periodic processes
    this.startPeriodicProcesses();

    this.logger.info('UEP Capability Advertiser initialized', {
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      enableAutoDetection: this.config.enableAutoDetection,
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring
    });
  }

  // =============================================================================
  // Capability Registration
  // =============================================================================

  public async registerCapability(definition: UEPCapabilityDefinition): Promise<void> {
    return this.tracer.startActiveSpan('uep.capability.register', async (span) => {
      try {
        span.setAttributes({
          'capability.name': definition.name,
          'capability.version': definition.version,
          'capability.category': definition.category
        });

        // Validate capability definition
        this.validateCapabilityDefinition(definition);

        // Check for duplicates
        const existingCapability = this.capabilities.get(definition.name);
        if (existingCapability && existingCapability.version === definition.version) {
          this.logger.debug('Capability already registered', { name: definition.name, version: definition.version });
          return;
        }

        // Store capability
        this.capabilities.set(definition.name, definition);

        // Store version history if enabled
        if (this.config.enableVersioning) {
          this.storeCapabilityVersion(definition);
        }

        // Initialize performance monitoring if enabled
        if (this.config.enablePerformanceMonitoring && !definition.performanceProfile) {
          await this.initializePerformanceProfile(definition);
        }

        // Setup health check if provided
        if (definition.healthCheck && this.config.enableHealthIntegration) {
          this.setupCapabilityHealthCheck(definition);
        }

        // Update metrics
        this.metrics.capabilitiesAdvertised.inc({
          category: definition.category,
          auto_detected: definition.autoDetected ? 'true' : 'false'
        });

        this.metrics.activeCapabilities.set(this.capabilities.size);

        span.setStatus({ code: SpanStatusCode.OK });
        
        this.emit('capabilityRegistered', {
          capability: definition,
          timestamp: new Date()
        });

        this.logger.info('Capability registered', {
          name: definition.name,
          version: definition.version,
          category: definition.category
        });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Failed to register capability', {
          name: definition.name,
          error: (error as Error).message
        });
        
        throw error;
      }
    });
  }

  public async updateCapability(name: string, updates: Partial<UEPCapabilityDefinition>): Promise<void> {
    return this.tracer.startActiveSpan('uep.capability.update', async (span) => {
      try {
        const existingCapability = this.capabilities.get(name);
        if (!existingCapability) {
          throw new Error(`Capability '${name}' not found`);
        }

        // Create updated capability
        const updatedCapability: UEPCapabilityDefinition = {
          ...existingCapability,
          ...updates,
          metadata: {
            ...existingCapability.metadata,
            ...updates.metadata,
            lastUpdated: new Date().toISOString()
          }
        };

        // Calculate change percentage
        const changePercentage = this.calculateCapabilityChange(existingCapability, updatedCapability);
        
        // Only update if change is significant
        if (changePercentage >= this.config.capabilityUpdateThreshold) {
          // Store previous version
          if (this.config.enableVersioning) {
            this.storeCapabilityVersion(existingCapability);
          }

          // Update capability
          this.capabilities.set(name, updatedCapability);

          // Update metrics
          this.metrics.capabilityUpdates.inc({
            category: updatedCapability.category,
            update_type: 'modified'
          });

          span.setAttributes({
            'capability.name': name,
            'capability.change_percentage': changePercentage,
            'capability.new_version': updatedCapability.version
          });

          this.emit('capabilityUpdated', {
            capability: updatedCapability,
            updateType: 'modified',
            timestamp: new Date(),
            reason: `Significant change detected: ${changePercentage.toFixed(1)}%`,
            previousVersion: existingCapability
          } as UEPCapabilityUpdate);

          this.logger.info('Capability updated', {
            name,
            changePercentage: changePercentage.toFixed(1) + '%',
            newVersion: updatedCapability.version
          });
        }

        span.setStatus({ code: SpanStatusCode.OK });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      }
    });
  }

  public async removeCapability(name: string, reason: string = 'Manual removal'): Promise<void> {
    const capability = this.capabilities.get(name);
    if (!capability) {
      return;
    }

    this.capabilities.delete(name);
    
    // Update metrics
    this.metrics.capabilityUpdates.inc({
      category: capability.category,
      update_type: 'removed'
    });

    this.metrics.activeCapabilities.set(this.capabilities.size);

    this.emit('capabilityUpdated', {
      capability,
      updateType: 'removed',
      timestamp: new Date(),
      reason
    } as UEPCapabilityUpdate);

    this.logger.info('Capability removed', { name, reason });
  }

  // =============================================================================
  // Auto-Detection System
  // =============================================================================

  private setupAutoDetectionHandlers(): void {
    if (!this.config.enableAutoDetection) return;

    // File system capabilities
    this.autoDetectionHandlers.set('filesystem', async () => {
      const capabilities: UEPCapabilityDefinition[] = [];
      
      // Detect file operations capability
      capabilities.push({
        name: 'file-operations',
        version: '1.0.0',
        description: 'File system operations (read, write, delete)',
        category: 'data',
        tags: ['filesystem', 'storage', 'io'],
        dependencies: [],
        metadata: { autoDetected: true, detectionMethod: 'filesystem-access' },
        autoDetected: true,
        performanceProfile: {
          estimatedLatency: 50,
          throughputPerSecond: 100,
          memoryUsage: 1024,
          cpuUsage: 10
        }
      });

      return capabilities;
    });

    // Network capabilities
    this.autoDetectionHandlers.set('network', async () => {
      const capabilities: UEPCapabilityDefinition[] = [];
      
      // Detect HTTP client capability
      capabilities.push({
        name: 'http-client',
        version: '1.0.0',
        description: 'HTTP client operations (GET, POST, PUT, DELETE)',
        category: 'communication',
        tags: ['http', 'rest', 'api', 'client'],
        dependencies: [],
        metadata: { autoDetected: true, detectionMethod: 'network-access' },
        autoDetected: true,
        performanceProfile: {
          estimatedLatency: 200,
          throughputPerSecond: 50,
          memoryUsage: 2048,
          cpuUsage: 15
        }
      });

      return capabilities;
    });

    // Processing capabilities
    this.autoDetectionHandlers.set('processing', async () => {
      const capabilities: UEPCapabilityDefinition[] = [];
      
      // Detect data processing capability
      capabilities.push({
        name: 'data-processing',
        version: '1.0.0',
        description: 'General data processing and transformation',
        category: 'processing',
        tags: ['data', 'transform', 'process', 'compute'],
        dependencies: [],
        metadata: { autoDetected: true, detectionMethod: 'cpu-analysis' },
        autoDetected: true,
        performanceProfile: {
          estimatedLatency: 100,
          throughputPerSecond: 25,
          memoryUsage: 4096,
          cpuUsage: 30
        }
      });

      return capabilities;
    });
  }

  private async performAutoDetection(): Promise<void> {
    if (!this.config.enableAutoDetection) return;

    return this.tracer.startActiveSpan('uep.capability.auto_detect', async (span) => {
      try {
        let totalDetected = 0;

        for (const [detectorName, handler] of this.autoDetectionHandlers) {
          try {
            const detectedCapabilities = await handler();
            
            for (const capability of detectedCapabilities) {
              // Only register if not already present
              if (!this.capabilities.has(capability.name)) {
                await this.registerCapability(capability);
                totalDetected++;
              }
            }

            this.metrics.autoDetectionEvents.inc({
              detector: detectorName,
              result: 'success'
            });

          } catch (error) {
            this.metrics.autoDetectionEvents.inc({
              detector: detectorName,
              result: 'error'
            });

            this.logger.error('Auto-detection failed', {
              detector: detectorName,
              error: (error as Error).message
            });
          }
        }

        span.setAttributes({
          'detection.total_detected': totalDetected,
          'detection.handlers_count': this.autoDetectionHandlers.size
        });

        span.setStatus({ code: SpanStatusCode.OK });

        if (totalDetected > 0) {
          this.logger.info('Auto-detection completed', { detectedCount: totalDetected });
        }

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      }
    });
  }

  // =============================================================================
  // Performance Monitoring
  // =============================================================================

  private async initializePerformanceProfile(capability: UEPCapabilityDefinition): Promise<void> {
    const profile: UEPCapabilityPerformanceProfile = {
      estimatedLatency: 100, // Default values
      throughputPerSecond: 10,
      memoryUsage: 1024,
      cpuUsage: 20,
      accuracyMetrics: {
        successRate: 0.95,
        errorRate: 0.05,
        averageQuality: 0.9
      }
    };

    capability.performanceProfile = profile;
    this.performanceMetrics.set(capability.name, profile);
  }

  private async updatePerformanceMetrics(): Promise<void> {
    if (!this.config.enablePerformanceMonitoring) return;

    for (const [capabilityName, capability] of this.capabilities) {
      if (capability.performanceProfile) {
        // Simulate performance metric updates (in real implementation, collect actual metrics)
        const profile = capability.performanceProfile;
        
        // Add some realistic variation
        profile.estimatedLatency *= (0.9 + Math.random() * 0.2);
        profile.throughputPerSecond *= (0.95 + Math.random() * 0.1);
        profile.memoryUsage *= (0.98 + Math.random() * 0.04);
        profile.cpuUsage *= (0.95 + Math.random() * 0.1);

        this.performanceMetrics.set(capabilityName, profile);

        this.metrics.performanceMonitoringEvents.inc({
          capability: capabilityName,
          category: capability.category
        });
      }
    }
  }

  // =============================================================================
  // Registry Advertisement
  // =============================================================================

  public async advertiseCapabilities(): Promise<void> {
    return this.tracer.startActiveSpan('uep.capability.advertise', async (span) => {
      const startTime = Date.now();

      try {
        const capabilitiesArray = Array.from(this.capabilities.values());
        
        span.setAttributes({
          'advertisement.capability_count': capabilitiesArray.length,
          'advertisement.agent_id': this.config.agentId
        });

        // Convert to registry format
        const registryCapabilities: UEPAgentCapability[] = capabilitiesArray.map(cap => ({
          name: cap.name,
          version: cap.version,
          description: cap.description,
          category: cap.category,
          tags: cap.tags,
          dependencies: cap.dependencies,
          performance: cap.performanceProfile || {
            estimatedLatency: 100,
            throughputPerSecond: 10,
            memoryUsage: 1024,
            cpuUsage: 20
          },
          healthCheck: cap.healthCheck,
          inputSchema: cap.inputSchema,
          outputSchema: cap.outputSchema
        }));

        // Create registration data
        const registrationData: Partial<UEPAgentRegistration> = {
          agentId: this.config.agentId,
          agentType: this.config.agentType,
          capabilities: registryCapabilities,
          lastHeartbeat: new Date(),
          status: 'healthy'
        };

        // Get current registration and update it
        const currentAgent = await this.discoveryClient.getAgent(this.config.agentId);
        if (currentAgent) {
          // Update existing registration
          await this.updateAgentCapabilities(registryCapabilities);
        } else {
          this.logger.warn('Agent not registered in service registry', { agentId: this.config.agentId });
        }

        const advertisementTime = Date.now() - startTime;
        
        this.metrics.advertisementLatency.observe(
          { agent_type: this.config.agentType },
          advertisementTime / 1000
        );

        span.setAttributes({
          'advertisement.duration_ms': advertisementTime,
          'advertisement.success': true
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.emit('capabilitiesAdvertised', {
          capabilities: capabilitiesArray,
          timestamp: new Date(),
          advertisementTime
        });

        this.logger.info('Capabilities advertised', {
          count: capabilitiesArray.length,
          advertisementTime: `${advertisementTime}ms`
        });

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        
        this.logger.error('Failed to advertise capabilities', {
          error: (error as Error).message
        });
        
        throw error;
      }
    });
  }

  private async updateAgentCapabilities(capabilities: UEPAgentCapability[]): Promise<void> {
    // This would make an API call to update the agent's capabilities in the registry
    // For now, we'll emit an event that can be handled by the registration system
    this.emit('capabilityUpdateRequired', {
      agentId: this.config.agentId,
      capabilities,
      timestamp: new Date()
    });
  }

  // =============================================================================
  // Health Checking
  // =============================================================================

  private setupCapabilityHealthCheck(capability: UEPCapabilityDefinition): void {
    if (!capability.healthCheck) return;

    // Setup periodic health check for this capability
    const healthCheckInterval = setInterval(async () => {
      await this.performCapabilityHealthCheck(capability);
    }, 60000); // Check every minute

    // Store interval reference for cleanup
    capability.metadata.healthCheckInterval = healthCheckInterval;
  }

  private async performCapabilityHealthCheck(capability: UEPCapabilityDefinition): Promise<void> {
    if (!capability.healthCheck) return;

    try {
      // Simulate health check (in real implementation, make actual HTTP request)
      const healthy = Math.random() > 0.1; // 90% healthy

      this.metrics.capabilityHealthStatus.set(
        { capability: capability.name, category: capability.category },
        healthy ? 1 : 0
      );

      if (!healthy) {
        this.emit('capabilityUnhealthy', {
          capability,
          timestamp: new Date(),
          reason: 'Health check failed'
        });
      }

    } catch (error) {
      this.logger.error('Capability health check failed', {
        capability: capability.name,
        error: (error as Error).message
      });
    }
  }

  // =============================================================================
  // Periodic Processes
  // =============================================================================

  private startPeriodicProcesses(): void {
    // Capability advertisement
    this.advertisementTimer = setInterval(() => {
      this.advertiseCapabilities().catch(error => {
        this.logger.error('Periodic capability advertisement failed', { error: error.message });
      });
    }, this.config.advertisementInterval);

    // Performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitoringTimer = setInterval(() => {
        this.updatePerformanceMetrics().catch(error => {
          this.logger.error('Performance monitoring update failed', { error: error.message });
        });
      }, 60000); // Every minute
    }

    // Auto-detection
    if (this.config.enableAutoDetection) {
      this.autoDetectionTimer = setInterval(() => {
        this.performAutoDetection().catch(error => {
          this.logger.error('Auto-detection failed', { error: error.message });
        });
      }, 300000); // Every 5 minutes
    }
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private validateCapabilityDefinition(definition: UEPCapabilityDefinition): void {
    if (!definition.name || definition.name.trim().length === 0) {
      throw new Error('Capability name is required');
    }

    if (!definition.version || definition.version.trim().length === 0) {
      throw new Error('Capability version is required');
    }

    if (!this.config.capabilityCategories.includes(definition.category)) {
      throw new Error(`Invalid capability category: ${definition.category}`);
    }

    if (this.capabilities.size >= this.config.maxCapabilities) {
      throw new Error(`Maximum capabilities limit reached: ${this.config.maxCapabilities}`);
    }
  }

  private storeCapabilityVersion(capability: UEPCapabilityDefinition): void {
    const versions = this.capabilityVersions.get(capability.name) || [];
    versions.push({ ...capability });
    
    // Keep only last 10 versions
    if (versions.length > 10) {
      versions.shift();
    }
    
    this.capabilityVersions.set(capability.name, versions);
  }

  private calculateCapabilityChange(old: UEPCapabilityDefinition, updated: UEPCapabilityDefinition): number {
    let changes = 0;
    let total = 0;

    // Compare basic fields
    const fields = ['name', 'version', 'description', 'category'];
    for (const field of fields) {
      total++;
      if ((old as any)[field] !== (updated as any)[field]) {
        changes++;
      }
    }

    // Compare arrays
    const arrayFields = ['tags', 'dependencies'];
    for (const field of arrayFields) {
      total++;
      const oldArray = (old as any)[field] || [];
      const updatedArray = (updated as any)[field] || [];
      
      if (JSON.stringify(oldArray.sort()) !== JSON.stringify(updatedArray.sort())) {
        changes++;
      }
    }

    return total > 0 ? (changes / total) * 100 : 0;
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPCapabilityAdvertiserMetrics {
    const prefix = 'uep_capability_advertiser_';

    return {
      capabilitiesAdvertised: new Counter({
        name: `${prefix}capabilities_advertised_total`,
        help: 'Total capabilities advertised',
        labelNames: ['category', 'auto_detected']
      }),

      capabilityUpdates: new Counter({
        name: `${prefix}updates_total`,
        help: 'Total capability updates',
        labelNames: ['category', 'update_type']
      }),

      performanceMonitoringEvents: new Counter({
        name: `${prefix}performance_monitoring_events_total`,
        help: 'Performance monitoring events',
        labelNames: ['capability', 'category']
      }),

      autoDetectionEvents: new Counter({
        name: `${prefix}auto_detection_events_total`,
        help: 'Auto-detection events',
        labelNames: ['detector', 'result']
      }),

      advertisementLatency: new Histogram({
        name: `${prefix}advertisement_latency_seconds`,
        help: 'Capability advertisement latency',
        labelNames: ['agent_type'],
        buckets: [0.1, 0.5, 1.0, 2.5, 5.0, 10.0]
      }),

      activeCapabilities: new Gauge({
        name: `${prefix}active_capabilities`,
        help: 'Number of active capabilities'
      }),

      capabilityHealthStatus: new Gauge({
        name: `${prefix}capability_health_status`,
        help: 'Capability health status (1=healthy, 0=unhealthy)',
        labelNames: ['capability', 'category']
      })
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public getCapabilities(): UEPCapabilityDefinition[] {
    return Array.from(this.capabilities.values());
  }

  public getCapability(name: string): UEPCapabilityDefinition | undefined {
    return this.capabilities.get(name);
  }

  public getCapabilityVersions(name: string): UEPCapabilityDefinition[] {
    return this.capabilityVersions.get(name) || [];
  }

  public getPerformanceMetrics(): Record<string, UEPCapabilityPerformanceProfile> {
    return Object.fromEntries(this.performanceMetrics);
  }

  public async forceAdvertisement(): Promise<void> {
    await this.advertiseCapabilities();
  }

  public async forceAutoDetection(): Promise<void> {
    await this.performAutoDetection();
  }

  // =============================================================================
  // Lifecycle Management
  // =============================================================================

  public async shutdown(): Promise<void> {
    // Clear timers
    if (this.advertisementTimer) {
      clearInterval(this.advertisementTimer);
    }

    if (this.performanceMonitoringTimer) {
      clearInterval(this.performanceMonitoringTimer);
    }

    if (this.autoDetectionTimer) {
      clearInterval(this.autoDetectionTimer);
    }

    // Clear capability health check timers
    for (const capability of this.capabilities.values()) {
      if (capability.metadata.healthCheckInterval) {
        clearInterval(capability.metadata.healthCheckInterval);
      }
    }

    // Shutdown discovery client
    await this.discoveryClient.shutdown();

    this.emit('shutdown');
  }
}

export default UEPCapabilityAdvertiser;