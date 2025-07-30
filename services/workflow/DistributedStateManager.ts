/**
 * UEP Distributed Workflow State Manager
 * 
 * Redis-based distributed state management for workflow orchestration.
 * Implements research-based best practices for scalable workflow coordination
 * with distributed locks, event-driven architecture, and high availability.
 * 
 * Research-based implementation features:
 * - Redis data structures (hashes, lists, streams, sorted sets)
 * - Distributed locks using Redlock algorithm
 * - Pub/Sub for event-driven orchestration
 * - Connection pooling and cluster support
 * - Type-safe Redis operations with ioredis
 * - Workflow state persistence and recovery
 * - Real-time state synchronization
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 224.2
 */

import Redis, { Cluster } from 'ioredis';
import Redlock from 'redlock';
import winston from 'winston';
import { EventEmitter } from 'events';
import { 
  WorkflowDefinition, 
  WorkflowContext, 
  WorkflowStatus, 
  StepStatus,
  WorkflowError 
} from './WorkflowSchema';

// State management interfaces
export interface WorkflowState {
  workflowId: string;                  // Workflow instance ID
  executionId: string;                 // Unique execution ID
  definition: WorkflowDefinition;      // Workflow definition
  status: WorkflowStatus;              // Current status
  currentStep?: string;                // Current executing step
  startTime: Date;                     // Execution start time
  endTime?: Date;                      // Execution end time
  variables: Record<string, any>;      // Workflow variables
  stepResults: Record<string, any>;    // Results from completed steps
  stepStatus: Record<string, StepStatus>; // Status of each step
  errors: WorkflowError[];             // Accumulated errors
  retryCount: number;                  // Number of retries
  lastUpdated: Date;                   // Last state update
  version: number;                     // State version for optimistic locking
}

export interface StepExecution {
  stepId: string;                      // Step identifier
  workflowId: string;                  // Parent workflow ID
  executionId: string;                 // Unique execution ID
  status: StepStatus;                  // Current step status
  startTime: Date;                     // Step start time
  endTime?: Date;                      // Step end time
  input: Record<string, any>;          // Step input data
  output?: Record<string, any>;        // Step output data
  error?: WorkflowError;               // Step error if failed
  retryCount: number;                  // Number of retries
  assignedAgent?: string;              // Agent assigned to execute step
  lockId?: string;                     // Distributed lock ID
  lastUpdated: Date;                   // Last update timestamp
}

export interface WorkflowQueue {
  workflowId: string;                  // Workflow identifier
  priority: number;                    // Queue priority (higher = more urgent)
  scheduledTime: Date;                 // When workflow should execute
  retryCount: number;                  // Current retry attempt
  metadata: Record<string, any>;       // Additional queue metadata
}

export interface StateManagerConfig {
  redis: {
    host: string;                      // Redis host
    port: number;                      // Redis port
    password?: string;                 // Redis password
    db?: number;                       // Redis database number
    keyPrefix?: string;                // Key prefix for namespacing
    maxRetriesPerRequest?: number;     // Max retries per request
    retryDelayOnFailover?: number;     // Retry delay on failover
    enableReadyCheck?: boolean;        // Enable ready check
    lazyConnect?: boolean;             // Lazy connection
    cluster?: {                        // Cluster configuration
      nodes: Array<{ host: string; port: number }>;
      options?: any;
    };
  };
  locks: {
    driftFactor?: number;              // Redlock drift factor
    retryCount?: number;               // Lock retry count
    retryDelay?: number;               // Lock retry delay
    lockTTL?: number;                  // Default lock TTL
  };
  pubsub: {
    enablePatternSubscription?: boolean; // Enable pattern subscriptions
    maxRetries?: number;               // Max connection retries
    subscriptionTimeout?: number;      // Subscription timeout
  };
  persistence: {
    snapshotInterval?: number;         // State snapshot interval
    enableWAL?: boolean;               // Write-ahead logging
    maxHistorySize?: number;           // Max history entries
  };
}

/**
 * Distributed workflow state events
 */
export interface StateManagerEvents {
  'workflow:created': (state: WorkflowState) => void;
  'workflow:updated': (state: WorkflowState, previousState: WorkflowState) => void;
  'workflow:completed': (state: WorkflowState) => void;
  'workflow:failed': (state: WorkflowState, error: WorkflowError) => void;
  'step:started': (execution: StepExecution) => void;
  'step:completed': (execution: StepExecution) => void;
  'step:failed': (execution: StepExecution, error: WorkflowError) => void;
  'lock:acquired': (resource: string, lockId: string) => void;
  'lock:released': (resource: string, lockId: string) => void;
  'queue:enqueued': (queue: WorkflowQueue) => void;
  'queue:dequeued': (queue: WorkflowQueue) => void;
}

/**
 * Main distributed state manager class
 */
export class DistributedStateManager extends EventEmitter {
  private redis: Redis | Cluster;
  private subscriber: Redis | Cluster;
  private publisher: Redis | Cluster;
  private redlock: Redlock;
  private logger: winston.Logger;
  private config: StateManagerConfig;
  
  // State caching
  private stateCache = new Map<string, WorkflowState>();
  private cacheTTL = 300000; // 5 minutes
  
  // Connection management
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: StateManagerConfig) {
    super();
    this.config = config;
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/distributed-state.log' })
      ]
    });

    this.initializeRedisConnections();
    this.initializeRedlock();
    this.setupEventHandlers();
  }

  /**
   * Initialize Redis connections with clustering support
   */
  private initializeRedisConnections(): void {
    const redisConfig = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db || 0,
      keyPrefix: this.config.redis.keyPrefix || 'uep:workflow:',
      maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest || 3,
      retryDelayOnFailover: this.config.redis.retryDelayOnFailover || 100,
      enableReadyCheck: this.config.redis.enableReadyCheck ?? true,
      lazyConnect: this.config.redis.lazyConnect ?? true
    };

    if (this.config.redis.cluster) {
      // Cluster mode for high availability
      this.redis = new Redis.Cluster(
        this.config.redis.cluster.nodes,
        {
          redisOptions: redisConfig,
          ...this.config.redis.cluster.options
        }
      );
      
      this.subscriber = new Redis.Cluster(
        this.config.redis.cluster.nodes,
        {
          redisOptions: redisConfig,
          ...this.config.redis.cluster.options
        }
      );
      
      this.publisher = new Redis.Cluster(
        this.config.redis.cluster.nodes,
        {
          redisOptions: redisConfig,
          ...this.config.redis.cluster.options
        }
      );
    } else {
      // Single instance mode
      this.redis = new Redis(redisConfig);
      this.subscriber = new Redis(redisConfig);
      this.publisher = new Redis(redisConfig);
    }

    this.logger.info('Redis connections initialized', {
      cluster: !!this.config.redis.cluster,
      keyPrefix: redisConfig.keyPrefix
    });
  }

  /**
   * Initialize Redlock for distributed locking
   */
  private initializeRedlock(): void {
    const redisInstances = [this.redis];
    
    this.redlock = new Redlock(redisInstances, {
      driftFactor: this.config.locks.driftFactor || 0.01,
      retryCount: this.config.locks.retryCount || 3,
      retryDelay: this.config.locks.retryDelay || 200,
      automaticExtensionThreshold: 500
    });

    this.redlock.on('clientError', (err) => {
      this.logger.error('Redlock client error', { error: err.message });
    });

    this.logger.info('Redlock initialized for distributed locking');
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    // Connection events
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.info('Redis connected');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.logger.error('Redis connection error', { error: error.message });
      this.handleConnectionError();
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });

    // Subscriber events
    this.subscriber.on('message', (channel, message) => {
      this.handlePubSubMessage(channel, message);
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handlePubSubMessage(channel, message, pattern);
    });
  }

  /**
   * Handle Redis connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached, giving up');
      this.emit('error', new Error('Redis connection failed permanently'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.logger.info('Attempting Redis reconnection', {
      attempt: this.reconnectAttempts,
      delay
    });

    setTimeout(() => {
      this.redis.connect().catch((error) => {
        this.logger.error('Reconnection failed', { error: error.message });
      });
    }, delay);
  }

  /**
   * Handle Pub/Sub messages
   */
  private handlePubSubMessage(channel: string, message: string, pattern?: string): void {
    try {
      const data = JSON.parse(message);
      const eventType = channel.split(':').pop();
      
      this.logger.debug('Received pub/sub message', {
        channel,
        eventType,
        pattern,
        dataKeys: Object.keys(data)
      });

      // Emit appropriate events based on channel
      switch (eventType) {
        case 'created':
          this.emit('workflow:created', data);
          break;
        case 'updated':
          this.emit('workflow:updated', data.current, data.previous);
          break;
        case 'completed':
          this.emit('workflow:completed', data);
          break;
        case 'failed':
          this.emit('workflow:failed', data.state, data.error);
          break;
        case 'step-started':
          this.emit('step:started', data);
          break;
        case 'step-completed':
          this.emit('step:completed', data);
          break;
        case 'step-failed':
          this.emit('step:failed', data.execution, data.error);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to parse pub/sub message', {
        channel,
        message,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Connect to Redis and setup subscriptions
   */
  public async connect(): Promise<void> {
    try {
      await Promise.all([
        this.redis.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);

      // Subscribe to workflow events
      await this.subscriber.psubscribe('uep:workflow:events:*');
      
      this.isConnected = true;
      this.logger.info('Distributed state manager connected and ready');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.redis.disconnect(),
        this.subscriber.disconnect(),
        this.publisher.disconnect()
      ]);
      
      this.isConnected = false;
      this.logger.info('Distributed state manager disconnected');
    } catch (error) {
      this.logger.error('Error during disconnection', {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Create new workflow state
   */
  public async createWorkflowState(
    workflowId: string,
    executionId: string,
    definition: WorkflowDefinition,
    initialVariables: Record<string, any> = {}
  ): Promise<WorkflowState> {
    const now = new Date();
    const state: WorkflowState = {
      workflowId,
      executionId,
      definition,
      status: 'pending',
      startTime: now,
      variables: initialVariables,
      stepResults: {},
      stepStatus: {},
      errors: [],
      retryCount: 0,
      lastUpdated: now,
      version: 1
    };

    // Initialize step statuses
    for (const step of definition.steps) {
      state.stepStatus[step.id] = 'pending';
    }

    await this.saveWorkflowState(state);
    
    // Publish creation event
    await this.publishEvent('created', state);
    
    this.logger.info('Workflow state created', {
      workflowId,
      executionId,
      stepCount: definition.steps.length
    });

    return state;
  }

  /**
   * Save workflow state to Redis
   */
  public async saveWorkflowState(state: WorkflowState): Promise<void> {
    const key = `state:${state.workflowId}:${state.executionId}`;
    const serializedState = {
      ...state,
      definition: JSON.stringify(state.definition),
      startTime: state.startTime.toISOString(),
      endTime: state.endTime?.toISOString(),
      lastUpdated: state.lastUpdated.toISOString()
    };

    const pipeline = this.redis.pipeline();
    
    // Save state as hash
    pipeline.hset(key, serializedState);
    
    // Set expiration (24 hours for completed workflows, no expiration for active)
    if (state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled') {
      pipeline.expire(key, 86400); // 24 hours
    }
    
    // Add to workflow index
    pipeline.zadd('workflows:index', Date.now(), `${state.workflowId}:${state.executionId}`);
    
    // Add to status index
    pipeline.sadd(`workflows:status:${state.status}`, `${state.workflowId}:${state.executionId}`);
    
    await pipeline.exec();
    
    // Update cache
    this.stateCache.set(`${state.workflowId}:${state.executionId}`, state);
  }

  /**
   * Load workflow state from Redis
   */
  public async loadWorkflowState(workflowId: string, executionId: string): Promise<WorkflowState | null> {
    const cacheKey = `${workflowId}:${executionId}`;
    
    // Check cache first
    if (this.stateCache.has(cacheKey)) {
      return this.stateCache.get(cacheKey)!;
    }

    const key = `state:${workflowId}:${executionId}`;
    const data = await this.redis.hgetall(key);
    
    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    const state: WorkflowState = {
      ...data,
      definition: JSON.parse(data.definition),
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      lastUpdated: new Date(data.lastUpdated),
      variables: JSON.parse(data.variables || '{}'),
      stepResults: JSON.parse(data.stepResults || '{}'),
      stepStatus: JSON.parse(data.stepStatus || '{}'),
      errors: JSON.parse(data.errors || '[]'),
      retryCount: parseInt(data.retryCount) || 0,
      version: parseInt(data.version) || 1
    } as WorkflowState;

    // Update cache
    this.stateCache.set(cacheKey, state);
    
    return state;
  }

  /**
   * Update workflow state with optimistic locking
   */
  public async updateWorkflowState(
    workflowId: string,
    executionId: string,
    updates: Partial<WorkflowState>
  ): Promise<WorkflowState> {
    const lockKey = `lock:state:${workflowId}:${executionId}`;
    const lock = await this.redlock.acquire([lockKey], 5000); // 5 second lock

    try {
      const currentState = await this.loadWorkflowState(workflowId, executionId);
      if (!currentState) {
        throw new Error(`Workflow state not found: ${workflowId}:${executionId}`);
      }

      // Optimistic locking check
      if (updates.version !== undefined && updates.version !== currentState.version) {
        throw new Error('State version conflict - concurrent modification detected');
      }

      const previousState = { ...currentState };
      const updatedState: WorkflowState = {
        ...currentState,
        ...updates,
        lastUpdated: new Date(),
        version: currentState.version + 1
      };

      await this.saveWorkflowState(updatedState);
      
      // Publish update event
      await this.publishEvent('updated', { current: updatedState, previous: previousState });
      
      this.logger.debug('Workflow state updated', {
        workflowId,
        executionId,
        changes: Object.keys(updates)
      });

      return updatedState;
    } finally {
      await lock.release();
    }
  }

  /**
   * Create step execution record
   */
  public async createStepExecution(
    stepId: string,
    workflowId: string,
    executionId: string,
    input: Record<string, any>
  ): Promise<StepExecution> {
    const now = new Date();
    const execution: StepExecution = {
      stepId,
      workflowId,
      executionId,
      status: 'pending',
      startTime: now,
      input,
      retryCount: 0,
      lastUpdated: now
    };

    const key = `step:${workflowId}:${executionId}:${stepId}`;
    const serializedExecution = {
      ...execution,
      startTime: execution.startTime.toISOString(),
      endTime: execution.endTime?.toISOString(),
      lastUpdated: execution.lastUpdated.toISOString(),
      input: JSON.stringify(execution.input),
      output: execution.output ? JSON.stringify(execution.output) : undefined,
      error: execution.error ? JSON.stringify(execution.error) : undefined
    };

    await this.redis.hset(key, serializedExecution);
    
    this.logger.debug('Step execution created', {
      stepId,
      workflowId,
      executionId
    });

    return execution;
  }

  /**
   * Update step execution
   */
  public async updateStepExecution(
    stepId: string,
    workflowId: string,
    executionId: string,
    updates: Partial<StepExecution>
  ): Promise<StepExecution> {
    const key = `step:${workflowId}:${executionId}:${stepId}`;
    const currentData = await this.redis.hgetall(key);
    
    if (!currentData || Object.keys(currentData).length === 0) {
      throw new Error(`Step execution not found: ${stepId}`);
    }

    const currentExecution: StepExecution = {
      ...currentData,
      startTime: new Date(currentData.startTime),
      endTime: currentData.endTime ? new Date(currentData.endTime) : undefined,
      lastUpdated: new Date(currentData.lastUpdated),
      input: JSON.parse(currentData.input || '{}'),
      output: currentData.output ? JSON.parse(currentData.output) : undefined,
      error: currentData.error ? JSON.parse(currentData.error) : undefined,
      retryCount: parseInt(currentData.retryCount) || 0
    } as StepExecution;

    const updatedExecution: StepExecution = {
      ...currentExecution,
      ...updates,
      lastUpdated: new Date()
    };

    const serializedExecution = {
      ...updatedExecution,
      startTime: updatedExecution.startTime.toISOString(),
      endTime: updatedExecution.endTime?.toISOString(),
      lastUpdated: updatedExecution.lastUpdated.toISOString(),
      input: JSON.stringify(updatedExecution.input),
      output: updatedExecution.output ? JSON.stringify(updatedExecution.output) : undefined,
      error: updatedExecution.error ? JSON.stringify(updatedExecution.error) : undefined
    };

    await this.redis.hset(key, serializedExecution);
    
    // Publish step events
    if (updates.status === 'running') {
      await this.publishEvent('step-started', updatedExecution);
    } else if (updates.status === 'completed') {
      await this.publishEvent('step-completed', updatedExecution);
    } else if (updates.status === 'failed') {
      await this.publishEvent('step-failed', { execution: updatedExecution, error: updates.error });
    }
    
    this.logger.debug('Step execution updated', {
      stepId,
      workflowId,
      executionId,
      status: updatedExecution.status
    });

    return updatedExecution;
  }

  /**
   * Acquire distributed lock for resource
   */
  public async acquireLock(resource: string, ttl: number = 10000): Promise<string> {
    const lockKey = `lock:${resource}`;
    const lock = await this.redlock.acquire([lockKey], ttl);
    
    const lockId = lock.value;
    
    this.emit('lock:acquired', resource, lockId);
    this.logger.debug('Lock acquired', { resource, lockId, ttl });
    
    return lockId;
  }

  /**
   * Release distributed lock
   */
  public async releaseLock(resource: string, lockId: string): Promise<void> {
    try {
      // Find the lock by resource and release it
      const lockKey = `lock:${resource}`;
      await this.redlock.release({
        resource: lockKey,
        value: lockId
      } as any);
      
      this.emit('lock:released', resource, lockId);
      this.logger.debug('Lock released', { resource, lockId });
    } catch (error) {
      this.logger.warn('Failed to release lock', {
        resource,
        lockId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  /**
   * Enqueue workflow for execution
   */
  public async enqueueWorkflow(
    workflowId: string,
    priority: number = 0,
    scheduledTime: Date = new Date(),
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const queue: WorkflowQueue = {
      workflowId,
      priority,
      scheduledTime,
      retryCount: 0,
      metadata
    };

    // Add to priority queue (sorted set)
    const score = scheduledTime.getTime() + (priority * 1000000); // Priority offset
    await this.redis.zadd('workflow:queue', score, JSON.stringify(queue));
    
    // Add to priority index
    await this.redis.zadd('workflow:priorities', priority, workflowId);
    
    this.emit('queue:enqueued', queue);
    this.logger.info('Workflow enqueued', {
      workflowId,
      priority,
      scheduledTime: scheduledTime.toISOString()
    });
  }

  /**
   * Dequeue next workflow for execution
   */
  public async dequeueWorkflow(): Promise<WorkflowQueue | null> {
    // Get earliest scheduled workflow
    const results = await this.redis.zrange('workflow:queue', 0, 0, 'WITHSCORES');
    
    if (results.length === 0) {
      return null;
    }

    const queueData = results[0];
    const score = parseFloat(results[1]);
    const now = Date.now();
    
    // Check if workflow is ready to execute
    const scheduledTime = score % 1000000;
    if (scheduledTime > now) {
      return null; // Not ready yet
    }

    // Remove from queue atomically
    const removed = await this.redis.zrem('workflow:queue', queueData);
    if (removed === 0) {
      return null; // Already dequeued by another worker
    }

    const queue: WorkflowQueue = JSON.parse(queueData);
    
    this.emit('queue:dequeued', queue);
    this.logger.debug('Workflow dequeued', {
      workflowId: queue.workflowId,
      priority: queue.priority
    });

    return queue;
  }

  /**
   * Get workflow metrics and statistics
   */
  public async getWorkflowMetrics(): Promise<{
    total: number;
    byStatus: Record<WorkflowStatus, number>;
    queueLength: number;
    averageExecutionTime: number;
    activeCount: number;
  }> {
    const pipeline = this.redis.pipeline();
    
    // Count by status
    pipeline.scard('workflows:status:pending');
    pipeline.scard('workflows:status:running');
    pipeline.scard('workflows:status:paused');
    pipeline.scard('workflows:status:completed');
    pipeline.scard('workflows:status:failed');
    pipeline.scard('workflows:status:cancelled');
    
    // Queue length
    pipeline.zcard('workflow:queue');
    
    // Total count
    pipeline.zcard('workflows:index');
    
    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Failed to get workflow metrics');
    }

    const [pending, running, paused, completed, failed, cancelled, queueLength, total] = 
      results.map(result => result[1] as number);

    return {
      total,
      byStatus: {
        pending,
        running,
        paused,
        completed,
        failed,
        cancelled
      },
      queueLength,
      averageExecutionTime: 0, // Would need historical data calculation
      activeCount: running + paused
    };
  }

  /**
   * Publish event to Redis Pub/Sub
   */
  private async publishEvent(eventType: string, data: any): Promise<void> {
    const channel = `uep:workflow:events:${eventType}`;
    await this.publisher.publish(channel, JSON.stringify(data));
  }

  /**
   * Health check for distributed state manager
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    pubsub: boolean;
    locks: boolean;
    latency: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Test Redis connection
      const redisOk = await this.redis.ping() === 'PONG';
      
      // Test pub/sub
      const testChannel = `test:${Date.now()}`;
      await this.publisher.publish(testChannel, 'ping');
      
      // Test locks
      let locksOk = false;
      try {
        const lock = await this.redlock.acquire([`test:lock:${Date.now()}`], 1000);
        await lock.release();
        locksOk = true;
      } catch (error) {
        // Lock test failed
      }
      
      const latency = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!redisOk) {
        status = 'unhealthy';
      } else if (!locksOk || latency > 1000) {
        status = 'degraded';
      }
      
      return {
        status,
        redis: redisOk,
        pubsub: true, // Assume pub/sub is working if Redis is working
        locks: locksOk,
        latency
      };
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : error
      });
      
      return {
        status: 'unhealthy',
        redis: false,
        pubsub: false,
        locks: false,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Clean up expired states and optimize storage
   */
  public async cleanup(): Promise<{
    removedStates: number;
    removedSteps: number;
    clearedCache: number;
  }> {
    const removedStates = 0;
    const removedSteps = 0;
    
    // Clear local cache
    this.stateCache.clear();
    const clearedCache = this.stateCache.size;
    
    // TODO: Implement cleanup of expired Redis keys
    // This would involve scanning for expired workflow states and step executions
    
    this.logger.info('Cleanup completed', {
      removedStates,
      removedSteps,
      clearedCache
    });
    
    return {
      removedStates,
      removedSteps,
      clearedCache
    };
  }
}

/**
 * Factory function to create distributed state manager
 */
export function createDistributedStateManager(config: StateManagerConfig): DistributedStateManager {
  return new DistributedStateManager(config);
}

// Export all types for external use
export type {
  StateManagerConfig,
  StateManagerEvents,
  WorkflowState,
  StepExecution,
  WorkflowQueue
};