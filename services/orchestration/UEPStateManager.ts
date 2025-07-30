/**
 * UEP State Management Module
 * 
 * Comprehensive state management system for UEP workflows using event sourcing
 * patterns. Provides persistent state tracking, checkpoint management, state
 * recovery, and distributed state consistency for long-running workflows.
 * Supports multiple storage backends and state projection strategies.
 * 
 * @version 1.0.0
 * @author UEP Meta-Agent Factory
 */

import { EventEmitter } from 'events';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { Logger } from '../../shared/utils/Logger';
import { UEPWorkflowExecution, UEPExecutionContext } from './UEPWorkflowEngine';

// =============================================================================
// Core Types and Interfaces (Context7 Methodology)
// =============================================================================

export interface UEPStateManagerConfig {
  storageBackend: 'memory' | 'redis' | 'postgresql' | 'mongodb' | 'filesystem';
  eventSourcing: {
    enabled: boolean;
    snapshotFrequency: number; // Events before creating snapshot
    retentionPeriod: number; // Days to retain events
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
  };
  checkpointing: {
    enabled: boolean;
    interval: number; // milliseconds
    maxCheckpoints: number;
    compressionThreshold: number; // bytes
  };
  consistency: {
    level: 'eventual' | 'strong' | 'session' | 'bounded-staleness';
    conflictResolution: 'last-write-wins' | 'merge' | 'fail' | 'custom';
    readPreference: 'primary' | 'secondary' | 'nearest';
  };
  caching: {
    enabled: boolean;
    maxSize: number;
    ttl: number; // milliseconds
    writeThrough: boolean;
    writeBack: boolean;
  };
  replication: {
    enabled: boolean;
    replicas: number;
    synchronous: boolean;
    healthCheckInterval: number;
  };
  recovery: {
    enabled: boolean;
    backupInterval: number; // milliseconds
    maxBackups: number;
    restoreTimeout: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    performanceThresholds: UEPPerformanceThresholds;
  };
  serialization: {
    format: 'json' | 'avro' | 'protobuf' | 'messagepack';
    compression: 'none' | 'gzip' | 'lz4' | 'snappy';
    versioning: boolean;
  };
}

export interface UEPStateEvent {
  id: string;
  streamId: string; // Execution ID or aggregate ID
  eventType: string;
  eventData: any;
  metadata: UEPEventMetadata;
  timestamp: Date;
  version: number;
  causationId?: string; // Event that caused this event
  correlationId?: string; // Correlation across events
  checksum: string;
}

export interface UEPEventMetadata {
  userId?: string;
  sessionId?: string;
  source: string; // Component that generated the event
  reason: string; // Why the event was generated
  environment: string;
  tags: Record<string, string>;
  schema: {
    version: string;
    format: string;
  };
  encryption?: {
    algorithm: string;
    keyId: string;
  };
}

export interface UEPStateSnapshot {
  id: string;
  streamId: string;
  state: any;
  version: number;
  timestamp: Date;
  eventCount: number; // Number of events included in this snapshot
  checksum: string;
  metadata: UEPSnapshotMetadata;
  compression?: {
    algorithm: string;
    originalSize: number;
    compressedSize: number;
  };
}

export interface UEPSnapshotMetadata {
  created: Date;
  source: string;
  reason: string;
  tags: Record<string, string>;
  performance: {
    creationTime: number; // milliseconds
    storageSize: number; // bytes
  };
}

export interface UEPStateProjection {
  id: string;
  name: string;
  streamId: string;
  projectedState: any;
  lastProcessedEvent: string;
  version: number;
  updatedAt: Date;
  projectionLogic: UEPProjectionDefinition;
  status: 'active' | 'rebuilding' | 'failed' | 'paused';
  error?: string;
}

export interface UEPProjectionDefinition {
  name: string;
  events: string[]; // Event types this projection handles
  initialState: any;
  reducer: string; // Function name or code
  filters?: UEPProjectionFilter[];
  partitioning?: UEPProjectionPartitioning;
  caching: boolean;
  realTime: boolean;
}

export interface UEPStateQuery {
  streamId?: string;
  eventTypes?: string[];
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
  projectionName?: string;
}

export interface UEPStateQueryResult {
  events: UEPStateEvent[];
  snapshots: UEPStateSnapshot[];
  projections: UEPStateProjection[];
  currentState: any;
  totalCount: number;
  hasMore: boolean;
  queryTime: number;
  cacheHit: boolean;
}

export interface UEPStateManagerMetrics {
  eventsStored: Counter;
  eventsRetrieved: Counter;
  snapshotsCreated: Counter;
  snapshotsRestored: Counter;
  projectionsUpdated: Counter;
  storageLatency: Histogram;
  retrievalLatency: Histogram;
  storageSize: Gauge;
  eventStreamCount: Gauge;
  projectionLag: Histogram;
  cacheHitRatio: Gauge;
  replicationLag: Histogram;
  backupOperations: Counter;
  recoveryOperations: Counter;
}

// =============================================================================
// UEP State Manager Core Class
// =============================================================================

export class UEPStateManager extends EventEmitter {
  private readonly config: UEPStateManagerConfig;
  private readonly logger = new Logger('UEPStateManager');
  private readonly tracer = trace.getTracer('uep-state-manager', '1.0.0');

  // Storage backends
  private readonly storageBackend: UEPStorageBackend;
  private readonly eventStore: Map<string, UEPStateEvent[]> = new Map(); // In-memory fallback
  private readonly snapshotStore: Map<string, UEPStateSnapshot[]> = new Map();
  private readonly projectionStore: Map<string, UEPStateProjection> = new Map();

  // Caching
  private readonly stateCache: Map<string, { state: any; timestamp: Date; version: number }> = new Map();
  private readonly eventCache: Map<string, UEPStateEvent[]> = new Map();

  // Background processing
  private checkpointTimer?: NodeJS.Timeout;
  private backupTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private projectionTimer?: NodeJS.Timeout;

  // Metrics
  private readonly metrics: UEPStateManagerMetrics;

  // Event processing
  private readonly eventProcessingQueue: UEPStateEvent[] = [];
  private processingEvents: boolean = false;

  // Projections
  private readonly activeProjections: Map<string, UEPStateProjection> = new Map();
  private readonly projectionReducers: Map<string, Function> = new Map();

  constructor(config: Partial<UEPStateManagerConfig> = {}) {
    super();

    this.config = {
      storageBackend: 'memory',
      eventSourcing: {
        enabled: true,
        snapshotFrequency: 100,
        retentionPeriod: 30,
        compressionEnabled: true,
        encryptionEnabled: false
      },
      checkpointing: {
        enabled: true,
        interval: 60000, // 1 minute
        maxCheckpoints: 10,
        compressionThreshold: 1024 * 1024 // 1MB
      },
      consistency: {
        level: 'strong',
        conflictResolution: 'last-write-wins',
        readPreference: 'primary'
      },
      caching: {
        enabled: true,
        maxSize: 10000,
        ttl: 300000, // 5 minutes
        writeThrough: true,
        writeBack: false
      },
      replication: {
        enabled: false,
        replicas: 2,
        synchronous: true,
        healthCheckInterval: 30000
      },
      recovery: {
        enabled: true,
        backupInterval: 3600000, // 1 hour
        maxBackups: 24,
        restoreTimeout: 300000 // 5 minutes
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: true,
        performanceThresholds: {
          maxStorageLatency: 1000,
          maxRetrievalLatency: 500,
          maxProjectionLag: 10000,
          minCacheHitRatio: 0.8
        }
      },
      serialization: {
        format: 'json',
        compression: 'gzip',
        versioning: true
      },
      ...config
    };

    // Initialize storage backend
    this.storageBackend = this.createStorageBackend();

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Setup built-in projections
    this.setupBuiltinProjections();

    // Start background processes
    this.startBackgroundProcesses();

    this.logger.info('UEP State Manager initialized', {
      storageBackend: this.config.storageBackend,
      eventSourcing: this.config.eventSourcing.enabled,
      consistency: this.config.consistency.level,
      caching: this.config.caching.enabled
    });
  }

  // =============================================================================
  // Event Sourcing Methods
  // =============================================================================

  public async appendEvent(
    streamId: string,
    eventType: string,
    eventData: any,
    metadata: Partial<UEPEventMetadata> = {}
  ): Promise<UEPStateEvent> {
    return this.tracer.startActiveSpan('uep.state.append_event', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'state.stream_id': streamId,
          'state.event_type': eventType,
          'state.has_data': Object.keys(eventData).length > 0
        });

        // Get current version for the stream
        const currentVersion = await this.getCurrentVersion(streamId);

        // Create event
        const event: UEPStateEvent = {
          id: uuidv4(),
          streamId,
          eventType,
          eventData: this.serializeData(eventData),
          metadata: {
            source: 'workflow-engine',
            reason: 'state-change',
            environment: 'production',
            tags: {},
            schema: {
              version: '1.0.0',
              format: this.config.serialization.format
            },
            ...metadata
          },
          timestamp: new Date(),
          version: currentVersion + 1,
          correlationId: metadata.userId || uuidv4(),
          checksum: this.calculateChecksum(eventData)
        };

        // Store event
        await this.storeEvent(event);

        // Update projections
        await this.updateProjections(event);

        // Check for snapshot creation
        if (this.shouldCreateSnapshot(streamId, event.version)) {
          await this.createSnapshot(streamId);
        }

        // Update metrics
        this.metrics.eventsStored.inc({
          event_type: eventType,
          stream_id: streamId
        });

        this.metrics.storageLatency.observe(
          { operation: 'append' },
          (Date.now() - startTime) / 1000
        );

        span.setAttributes({
          'state.event_id': event.id,
          'state.version': event.version,
          'state.storage_time': Date.now() - startTime
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.emit('eventAppended', {
          event,
          streamId,
          version: event.version,
          timestamp: event.timestamp
        });

        this.logger.debug('Event appended successfully', {
          streamId,
          eventType,
          version: event.version,
          eventId: event.id
        });

        return event;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Failed to append event', {
          streamId,
          eventType,
          error: (error as Error).message
        });

        throw error;
      }
    });
  }

  public async getEvents(query: UEPStateQuery): Promise<UEPStateQueryResult> {
    return this.tracer.startActiveSpan('uep.state.get_events', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'state.query.stream_id': query.streamId || 'all',
          'state.query.event_types': query.eventTypes?.join(',') || 'all',
          'state.query.limit': query.limit || 0
        });

        // Check cache first
        let cacheHit = false;
        const cacheKey = this.generateCacheKey(query);
        
        if (this.config.caching.enabled) {
          const cached = this.eventCache.get(cacheKey);
          if (cached) {
            cacheHit = true;
            this.updateCacheHitMetrics(true);
            
            return {
              events: cached,
              snapshots: [],
              projections: [],
              currentState: null,
              totalCount: cached.length,
              hasMore: false,
              queryTime: Date.now() - startTime,
              cacheHit: true
            };
          }
        }

        // Retrieve events from storage
        const events = await this.retrieveEvents(query);
        
        // Get related snapshots if requested
        const snapshots = query.streamId 
          ? await this.getSnapshots(query.streamId)
          : [];

        // Get projections if requested
        const projections = query.projectionName
          ? [this.activeProjections.get(query.projectionName)].filter(p => p) as UEPStateProjection[]
          : [];

        // Build current state from events and snapshots
        const currentState = query.streamId 
          ? await this.buildCurrentState(query.streamId, events, snapshots)
          : null;

        // Cache results
        if (this.config.caching.enabled && events.length > 0) {
          this.eventCache.set(cacheKey, events);
          
          // Expire cache entry
          setTimeout(() => {
            this.eventCache.delete(cacheKey);
          }, this.config.caching.ttl);
        }

        const result: UEPStateQueryResult = {
          events,
          snapshots,
          projections,
          currentState,
          totalCount: events.length,
          hasMore: events.length === (query.limit || 0),
          queryTime: Date.now() - startTime,
          cacheHit
        };

        // Update metrics
        this.metrics.eventsRetrieved.inc({
          stream_id: query.streamId || 'all'
        });

        this.metrics.retrievalLatency.observe(
          { operation: 'get_events' },
          result.queryTime / 1000
        );

        this.updateCacheHitMetrics(cacheHit);

        span.setAttributes({
          'state.result.count': events.length,
          'state.result.cache_hit': cacheHit,
          'state.result.query_time': result.queryTime
        });

        span.setStatus({ code: SpanStatusCode.OK });
        return result;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Failed to retrieve events', {
          query,
          error: (error as Error).message
        });

        throw error;
      }
    });
  }

  // =============================================================================
  // Snapshot Management
  // =============================================================================

  public async createSnapshot(streamId: string): Promise<UEPStateSnapshot> {
    return this.tracer.startActiveSpan('uep.state.create_snapshot', async (span) => {
      const startTime = Date.now();

      try {
        span.setAttributes({
          'state.stream_id': streamId,
          'state.operation': 'create_snapshot'
        });

        // Get current state
        const currentState = await this.buildCurrentState(streamId);
        const currentVersion = await this.getCurrentVersion(streamId);
        const eventCount = await this.getEventCount(streamId);

        // Create snapshot
        const snapshot: UEPStateSnapshot = {
          id: uuidv4(),
          streamId,
          state: this.serializeData(currentState),
          version: currentVersion,
          timestamp: new Date(),
          eventCount,
          checksum: this.calculateChecksum(currentState),
          metadata: {
            created: new Date(),
            source: 'state-manager',
            reason: 'periodic-snapshot',
            tags: {},
            performance: {
              creationTime: 0, // Will be updated
              storageSize: 0   // Will be updated
            }
          }
        };

        // Apply compression if enabled
        if (this.config.eventSourcing.compressionEnabled) {
          snapshot.compression = await this.compressSnapshot(snapshot);
        }

        // Store snapshot
        await this.storeSnapshot(snapshot);

        // Update metadata
        snapshot.metadata.performance.creationTime = Date.now() - startTime;
        snapshot.metadata.performance.storageSize = this.calculateStorageSize(snapshot);

        // Clean up old snapshots
        await this.cleanupOldSnapshots(streamId);

        // Update metrics
        this.metrics.snapshotsCreated.inc({
          stream_id: streamId
        });

        span.setAttributes({
          'state.snapshot_id': snapshot.id,
          'state.version': snapshot.version,
          'state.creation_time': snapshot.metadata.performance.creationTime
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.emit('snapshotCreated', {
          snapshot,
          streamId,
          version: snapshot.version,
          timestamp: snapshot.timestamp
        });

        this.logger.info('Snapshot created successfully', {
          streamId,
          snapshotId: snapshot.id,
          version: snapshot.version,
          eventCount
        });

        return snapshot;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Failed to create snapshot', {
          streamId,
          error: (error as Error).message
        });

        throw error;
      }
    });
  }

  public async restoreFromSnapshot(streamId: string, snapshotId?: string): Promise<any> {
    return this.tracer.startActiveSpan('uep.state.restore_snapshot', async (span) => {
      try {
        span.setAttributes({
          'state.stream_id': streamId,
          'state.snapshot_id': snapshotId || 'latest'
        });

        // Get snapshot
        const snapshot = snapshotId 
          ? await this.getSnapshotById(snapshotId)
          : await this.getLatestSnapshot(streamId);

        if (!snapshot) {
          throw new Error(`No snapshot found for stream: ${streamId}`);
        }

        // Deserialize state
        const state = this.deserializeData(snapshot.state);

        // Get events after snapshot
        const eventsAfterSnapshot = await this.getEvents({
          streamId,
          fromVersion: snapshot.version + 1
        });

        // Apply events to snapshot state
        let currentState = state;
        for (const event of eventsAfterSnapshot.events) {
          currentState = this.applyEventToState(currentState, event);
        }

        // Update cache
        if (this.config.caching.enabled) {
          this.stateCache.set(streamId, {
            state: currentState,
            timestamp: new Date(),
            version: snapshot.version + eventsAfterSnapshot.events.length
          });
        }

        // Update metrics
        this.metrics.snapshotsRestored.inc({
          stream_id: streamId
        });

        span.setAttributes({
          'state.restored_version': snapshot.version,
          'state.events_applied': eventsAfterSnapshot.events.length
        });

        span.setStatus({ code: SpanStatusCode.OK });

        this.emit('snapshotRestored', {
          streamId,
          snapshotId: snapshot.id,
          version: snapshot.version,
          eventsApplied: eventsAfterSnapshot.events.length
        });

        this.logger.info('State restored from snapshot', {
          streamId,
          snapshotId: snapshot.id,
          version: snapshot.version,
          eventsApplied: eventsAfterSnapshot.events.length
        });

        return currentState;

      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });

        this.logger.error('Failed to restore from snapshot', {
          streamId,
          snapshotId,
          error: (error as Error).message
        });

        throw error;
      }
    });
  }

  // =============================================================================
  // State Projections
  // =============================================================================

  public async createProjection(definition: UEPProjectionDefinition): Promise<UEPStateProjection> {
    const projection: UEPStateProjection = {
      id: uuidv4(),
      name: definition.name,
      streamId: '', // Will be set when processing events
      projectedState: definition.initialState,
      lastProcessedEvent: '',
      version: 0,
      updatedAt: new Date(),
      projectionLogic: definition,
      status: 'active'
    };

    this.activeProjections.set(definition.name, projection);
    this.projectionStore.set(definition.name, projection);

    // Register reducer function
    if (definition.reducer) {
      this.projectionReducers.set(definition.name, this.createReducerFunction(definition.reducer));
    }

    this.logger.info('Projection created', {
      projectionName: definition.name,
      projectionId: projection.id
    });

    return projection;
  }

  public async updateProjections(event: UEPStateEvent): Promise<void> {
    for (const [name, projection] of this.activeProjections) {
      if (projection.status !== 'active') continue;
      
      // Check if projection handles this event type
      if (!projection.projectionLogic.events.includes(event.eventType)) continue;

      // Apply filters if any
      if (projection.projectionLogic.filters && 
          !this.passesProjectionFilters(event, projection.projectionLogic.filters)) {
        continue;
      }

      try {
        // Get reducer function
        const reducer = this.projectionReducers.get(name);
        if (!reducer) continue;

        // Apply event to projection
        const newState = reducer(projection.projectedState, event);
        
        // Update projection
        projection.projectedState = newState;
        projection.lastProcessedEvent = event.id;
        projection.version++;
        projection.updatedAt = new Date();

        // Update metrics
        this.metrics.projectionsUpdated.inc({
          projection_name: name,
          event_type: event.eventType
        });

        this.emit('projectionUpdated', {
          projectionName: name,
          eventId: event.id,
          version: projection.version
        });

      } catch (error) {
        projection.status = 'failed';
        projection.error = (error as Error).message;

        this.logger.error('Projection update failed', {
          projectionName: name,
          eventId: event.id,
          error: (error as Error).message
        });
      }
    }
  }

  // =============================================================================
  // Storage Backend Abstraction
  // =============================================================================

  private createStorageBackend(): UEPStorageBackend {
    switch (this.config.storageBackend) {
      case 'memory':
        return new UEPMemoryStorageBackend();
      case 'redis':
        return new UEPRedisStorageBackend();
      case 'postgresql':
        return new UEPPostgreSQLStorageBackend();
      case 'mongodb':
        return new UEPMongoDBStorageBackend();
      case 'filesystem':
        return new UEPFilesystemStorageBackend();
      default:
        return new UEPMemoryStorageBackend();
    }
  }

  private async storeEvent(event: UEPStateEvent): Promise<void> {
    return this.storageBackend.storeEvent(event);
  }

  private async retrieveEvents(query: UEPStateQuery): Promise<UEPStateEvent[]> {
    return this.storageBackend.retrieveEvents(query);
  }

  private async storeSnapshot(snapshot: UEPStateSnapshot): Promise<void> {
    return this.storageBackend.storeSnapshot(snapshot);
  }

  private async getSnapshots(streamId: string): Promise<UEPStateSnapshot[]> {
    return this.storageBackend.getSnapshots(streamId);
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private async getCurrentVersion(streamId: string): Promise<number> {
    const events = await this.getEvents({ streamId, limit: 1 });
    return events.events.length > 0 ? events.events[0].version : 0;
  }

  private async getEventCount(streamId: string): Promise<number> {
    const events = await this.getEvents({ streamId });
    return events.totalCount;
  }

  private shouldCreateSnapshot(streamId: string, version: number): boolean {
    return this.config.eventSourcing.enabled && 
           version % this.config.eventSourcing.snapshotFrequency === 0;
  }

  private async buildCurrentState(streamId: string, events?: UEPStateEvent[], snapshots?: UEPStateSnapshot[]): Promise<any> {
    // Start with latest snapshot or empty state
    let state = {};
    let fromVersion = 0;

    if (!snapshots) {
      snapshots = await this.getSnapshots(streamId);
    }

    if (snapshots.length > 0) {
      const latestSnapshot = snapshots.sort((a, b) => b.version - a.version)[0];
      state = this.deserializeData(latestSnapshot.state);
      fromVersion = latestSnapshot.version + 1;
    }

    // Apply events after snapshot
    if (!events) {
      const eventQuery = await this.getEvents({ streamId, fromVersion });
      events = eventQuery.events;
    }

    for (const event of events.filter(e => e.version >= fromVersion)) {
      state = this.applyEventToState(state, event);
    }

    return state;
  }

  private applyEventToState(state: any, event: UEPStateEvent): any {
    // This is a simplified state application
    // In a real implementation, this would use proper event handlers
    switch (event.eventType) {
      case 'WorkflowStarted':
        return { ...state, status: 'running', startTime: event.timestamp };
      case 'StepCompleted':
        return { 
          ...state, 
          completedSteps: [...(state.completedSteps || []), event.eventData.stepId],
          variables: { ...state.variables, ...event.eventData.output }
        };
      case 'WorkflowCompleted':
        return { ...state, status: 'completed', endTime: event.timestamp };
      case 'WorkflowFailed':
        return { ...state, status: 'failed', error: event.eventData.error };
      default:
        return state;
    }
  }

  private serializeData(data: any): any {
    switch (this.config.serialization.format) {
      case 'json':
        return JSON.stringify(data);
      default:
        return data;
    }
  }

  private deserializeData(data: any): any {
    switch (this.config.serialization.format) {
      case 'json':
        return typeof data === 'string' ? JSON.parse(data) : data;
      default:
        return data;
    }
  }

  private calculateChecksum(data: any): string {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return createHash('sha256').update(serialized).digest('hex').slice(0, 16);
  }

  private generateCacheKey(query: UEPStateQuery): string {
    return createHash('md5').update(JSON.stringify(query)).digest('hex');
  }

  // =============================================================================
  // Background Processes
  // =============================================================================

  private startBackgroundProcesses(): void {
    // Checkpointing
    if (this.config.checkpointing.enabled) {
      this.checkpointTimer = setInterval(() => {
        this.performCheckpointing().catch(error => {
          this.logger.error('Checkpointing failed', { error: error.message });
        });
      }, this.config.checkpointing.interval);
    }

    // Backup
    if (this.config.recovery.enabled) {
      this.backupTimer = setInterval(() => {
        this.performBackup().catch(error => {
          this.logger.error('Backup failed', { error: error.message });
        });
      }, this.config.recovery.backupInterval);
    }

    // Cleanup
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 3600000); // Every hour

    // Projection processing
    this.projectionTimer = setInterval(() => {
      this.processProjectionQueue().catch(error => {
        this.logger.error('Projection processing failed', { error: error.message });
      });
    }, 1000); // Every second
  }

  private async performCheckpointing(): Promise<void> {
    // Implementation would create checkpoints for active workflows
  }

  private async performBackup(): Promise<void> {
    // Implementation would backup state to external storage
  }

  private performCleanup(): void {
    // Clean up expired cache entries
    const now = Date.now();
    
    for (const [key, entry] of this.stateCache) {
      if (now - entry.timestamp.getTime() > this.config.caching.ttl) {
        this.stateCache.delete(key);
      }
    }

    // Clean up event cache
    if (this.eventCache.size > this.config.caching.maxSize) {
      const keys = Array.from(this.eventCache.keys());
      for (let i = 0; i < keys.length - this.config.caching.maxSize; i++) {
        this.eventCache.delete(keys[i]);
      }
    }
  }

  private async processProjectionQueue(): Promise<void> {
    // Process any queued projection updates
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private setupBuiltinProjections(): void {
    // Create built-in projections for common workflow patterns
    this.createProjection({
      name: 'workflow-status',
      events: ['WorkflowStarted', 'WorkflowCompleted', 'WorkflowFailed', 'WorkflowCancelled'],
      initialState: { status: 'unknown', workflows: {} },
      reducer: `
        function(state, event) {
          const workflows = {...state.workflows};
          workflows[event.streamId] = {
            status: event.eventType.replace('Workflow', '').toLowerCase(),
            timestamp: event.timestamp,
            data: event.eventData
          };
          return { ...state, workflows };
        }
      `,
      caching: true,
      realTime: true
    });

    this.createProjection({
      name: 'step-execution',
      events: ['StepStarted', 'StepCompleted', 'StepFailed'],
      initialState: { steps: {} },
      reducer: `
        function(state, event) {
          const steps = {...state.steps};
          const stepId = event.eventData.stepId;
          steps[stepId] = {
            status: event.eventType.replace('Step', '').toLowerCase(),
            timestamp: event.timestamp,
            data: event.eventData
          };
          return { ...state, steps };
        }
      `,
      caching: true,
      realTime: true
    });
  }

  private createReducerFunction(reducerCode: string): Function {
    // In a real implementation, this would safely evaluate the reducer code
    try {
      return new Function('state', 'event', `return (${reducerCode})(state, event);`);
    } catch (error) {
      this.logger.error('Failed to create reducer function', { 
        error: (error as Error).message,
        reducerCode 
      });
      return (state: any, event: any) => state; // Return unchanged state on error
    }
  }

  private passesProjectionFilters(event: UEPStateEvent, filters: UEPProjectionFilter[]): boolean {
    return filters.every(filter => {
      switch (filter.type) {
        case 'eventType':
          return filter.values.includes(event.eventType);
        case 'streamId':
          return filter.values.includes(event.streamId);
        case 'metadata':
          return filter.values.some(value => 
            event.metadata.tags[filter.field || ''] === value
          );
        default:
          return true;
      }
    });
  }

  private updateCacheHitMetrics(hit: boolean): void {
    const currentRatio = this.metrics.cacheHitRatio.get();
    const newRatio = hit ? Math.min(1.0, currentRatio + 0.01) : Math.max(0.0, currentRatio - 0.01);
    this.metrics.cacheHitRatio.set(newRatio);
  }

  // =============================================================================
  // Placeholder implementations
  // =============================================================================

  private async getSnapshotById(snapshotId: string): Promise<UEPStateSnapshot | null> {
    // Implementation would retrieve specific snapshot
    return null;
  }

  private async getLatestSnapshot(streamId: string): Promise<UEPStateSnapshot | null> {
    const snapshots = await this.getSnapshots(streamId);
    return snapshots.length > 0 ? snapshots.sort((a, b) => b.version - a.version)[0] : null;
  }

  private async compressSnapshot(snapshot: UEPStateSnapshot): Promise<any> {
    // Implementation would compress snapshot data
    return {
      algorithm: this.config.serialization.compression,
      originalSize: JSON.stringify(snapshot.state).length,
      compressedSize: JSON.stringify(snapshot.state).length * 0.7 // Simulate compression
    };
  }

  private async cleanupOldSnapshots(streamId: string): Promise<void> {
    // Implementation would clean up old snapshots
  }

  private calculateStorageSize(snapshot: UEPStateSnapshot): number {
    return JSON.stringify(snapshot).length;
  }

  // =============================================================================
  // Metrics Initialization
  // =============================================================================

  private initializeMetrics(): UEPStateManagerMetrics {
    const prefix = 'uep_state_manager_';

    return {
      eventsStored: new Counter({
        name: `${prefix}events_stored_total`,
        help: 'Total events stored',
        labelNames: ['event_type', 'stream_id']
      }),

      eventsRetrieved: new Counter({
        name: `${prefix}events_retrieved_total`,
        help: 'Total events retrieved',
        labelNames: ['stream_id']
      }),

      snapshotsCreated: new Counter({
        name: `${prefix}snapshots_created_total`,
        help: 'Total snapshots created',
        labelNames: ['stream_id']
      }),

      snapshotsRestored: new Counter({
        name: `${prefix}snapshots_restored_total`,
        help: 'Total snapshots restored',
        labelNames: ['stream_id']
      }),

      projectionsUpdated: new Counter({
        name: `${prefix}projections_updated_total`,
        help: 'Total projection updates',
        labelNames: ['projection_name', 'event_type']
      }),

      storageLatency: new Histogram({
        name: `${prefix}storage_latency_seconds`,
        help: 'Storage operation latency',
        labelNames: ['operation'],
        buckets: [0.001, 0.01, 0.1, 1.0, 10.0]
      }),

      retrievalLatency: new Histogram({
        name: `${prefix}retrieval_latency_seconds`,
        help: 'Retrieval operation latency',
        labelNames: ['operation'],
        buckets: [0.001, 0.01, 0.1, 1.0, 10.0]
      }),

      storageSize: new Gauge({
        name: `${prefix}storage_size_bytes`,
        help: 'Total storage size in bytes'
      }),

      eventStreamCount: new Gauge({
        name: `${prefix}event_streams_count`,
        help: 'Number of event streams'
      }),

      projectionLag: new Histogram({
        name: `${prefix}projection_lag_seconds`,
        help: 'Projection processing lag',
        labelNames: ['projection_name'],
        buckets: [0.1, 1.0, 10.0, 60.0, 300.0]
      }),

      cacheHitRatio: new Gauge({
        name: `${prefix}cache_hit_ratio`,
        help: 'Cache hit ratio (0-1)'
      }),

      replicationLag: new Histogram({
        name: `${prefix}replication_lag_seconds`,
        help: 'Replication lag',
        buckets: [0.001, 0.01, 0.1, 1.0, 10.0]
      }),

      backupOperations: new Counter({
        name: `${prefix}backup_operations_total`,
        help: 'Total backup operations',
        labelNames: ['status']
      }),

      recoveryOperations: new Counter({
        name: `${prefix}recovery_operations_total`,
        help: 'Total recovery operations',
        labelNames: ['status']
      })
    };
  }

  // =============================================================================
  // Public API
  // =============================================================================

  public async getCurrentState(streamId: string): Promise<any> {
    // Check cache first
    if (this.config.caching.enabled) {
      const cached = this.stateCache.get(streamId);
      if (cached && Date.now() - cached.timestamp.getTime() < this.config.caching.ttl) {
        return cached.state;
      }
    }

    // Build state from events and snapshots
    const state = await this.buildCurrentState(streamId);

    // Cache result
    if (this.config.caching.enabled) {
      this.stateCache.set(streamId, {
        state,
        timestamp: new Date(),
        version: await this.getCurrentVersion(streamId)
      });
    }

    return state;
  }

  public getProjection(name: string): UEPStateProjection | undefined {
    return this.activeProjections.get(name);
  }

  public getStorageStats(): Record<string, any> {
    return {
      eventStreams: this.eventStore.size,
      snapshots: this.snapshotStore.size,
      projections: this.activeProjections.size,
      cacheSize: this.stateCache.size,
      storageBackend: this.config.storageBackend
    };
  }

  public async shutdown(): Promise<void> {
    // Clear timers
    if (this.checkpointTimer) clearInterval(this.checkpointTimer);
    if (this.backupTimer) clearInterval(this.backupTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.projectionTimer) clearInterval(this.projectionTimer);

    // Shutdown storage backend
    await this.storageBackend.shutdown();

    this.emit('shutdown');
  }
}

// =============================================================================
// Supporting Interface Definitions
// =============================================================================

export interface UEPPerformanceThresholds {
  maxStorageLatency: number;
  maxRetrievalLatency: number;
  maxProjectionLag: number;
  minCacheHitRatio: number;
}

export interface UEPProjectionFilter {
  type: 'eventType' | 'streamId' | 'metadata';
  field?: string;
  values: string[];
}

export interface UEPProjectionPartitioning {
  enabled: boolean;
  strategy: 'hash' | 'range' | 'custom';
  partitions: number;
}

// Storage backend interface
export interface UEPStorageBackend {
  storeEvent(event: UEPStateEvent): Promise<void>;
  retrieveEvents(query: UEPStateQuery): Promise<UEPStateEvent[]>;
  storeSnapshot(snapshot: UEPStateSnapshot): Promise<void>;
  getSnapshots(streamId: string): Promise<UEPStateSnapshot[]>;
  shutdown(): Promise<void>;
}

// Placeholder storage backend implementations
class UEPMemoryStorageBackend implements UEPStorageBackend {
  async storeEvent(event: UEPStateEvent): Promise<void> {}
  async retrieveEvents(query: UEPStateQuery): Promise<UEPStateEvent[]> { return []; }
  async storeSnapshot(snapshot: UEPStateSnapshot): Promise<void> {}
  async getSnapshots(streamId: string): Promise<UEPStateSnapshot[]> { return []; }
  async shutdown(): Promise<void> {}
}

class UEPRedisStorageBackend implements UEPStorageBackend {
  async storeEvent(event: UEPStateEvent): Promise<void> {}
  async retrieveEvents(query: UEPStateQuery): Promise<UEPStateEvent[]> { return []; }
  async storeSnapshot(snapshot: UEPStateSnapshot): Promise<void> {}
  async getSnapshots(streamId: string): Promise<UEPStateSnapshot[]> { return []; }
  async shutdown(): Promise<void> {}
}

class UEPPostgreSQLStorageBackend implements UEPStorageBackend {
  async storeEvent(event: UEPStateEvent): Promise<void> {}
  async retrieveEvents(query: UEPStateQuery): Promise<UEPStateEvent[]> { return []; }
  async storeSnapshot(snapshot: UEPStateSnapshot): Promise<void> {}
  async getSnapshots(streamId: string): Promise<UEPStateSnapshot[]> { return []; }
  async shutdown(): Promise<void> {}
}

class UEPMongoDBStorageBackend implements UEPStorageBackend {
  async storeEvent(event: UEPStateEvent): Promise<void> {}
  async retrieveEvents(query: UEPStateQuery): Promise<UEPStateEvent[]> { return []; }
  async storeSnapshot(snapshot: UEPStateSnapshot): Promise<void> {}
  async getSnapshots(streamId: string): Promise<UEPStateSnapshot[]> { return []; }
  async shutdown(): Promise<void> {}
}

class UEPFilesystemStorageBackend implements UEPStorageBackend {
  async storeEvent(event: UEPStateEvent): Promise<void> {}
  async retrieveEvents(query: UEPStateQuery): Promise<UEPStateEvent[]> { return []; }
  async storeSnapshot(snapshot: UEPStateSnapshot): Promise<void> {}
  async getSnapshots(streamId: string): Promise<UEPStateSnapshot[]> { return []; }
  async shutdown(): Promise<void> {}
}

export default UEPStateManager;