/**
 * Watch Service
 * 
 * Real-time watch API service for UEP agent registry changes.
 * Provides WebSocket and gRPC streaming capabilities for monitoring
 * agent registration, health changes, and capability updates.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { filter, map, takeUntil, debounceTime } from 'rxjs/operators';
import { RegisteredAgent, AgentType, HealthStatus } from '../registry/dto/registry.dto';
import { RegistryCacheService } from '../registry/registry-cache.service';
import { metricsHelpers } from '../monitoring/prometheus.setup';

interface WatchSubscription {
  id: string;
  clientId: string;
  filters: WatchFilters;
  createdAt: Date;
  lastActivity: Date;
  eventCount: number;
}

interface WatchFilters {
  agentIds?: string[];
  agentTypes?: AgentType[];
  capabilities?: string[];
  tags?: string[];
  healthStatuses?: HealthStatus[];
  eventTypes?: WatchEventType[];
  includeMetadata?: boolean;
  includeHistory?: boolean;
  batchSize?: number;
  debounceMs?: number;
}

interface WatchEvent {
  id: string;
  type: WatchEventType;
  timestamp: Date;
  agentId: string;
  agent?: RegisteredAgent;
  previousState?: any;
  newState?: any;
  metadata?: Record<string, any>;
  source: 'registry' | 'health' | 'lifecycle' | 'discovery';
}

type WatchEventType = 
  | 'agent_registered'
  | 'agent_deregistered' 
  | 'agent_updated'
  | 'health_changed'
  | 'capabilities_changed'
  | 'lease_expired'
  | 'status_changed'
  | 'metadata_updated';

interface WebSocketWatchRequest {
  action: 'subscribe' | 'unsubscribe' | 'update_filters' | 'get_status';
  subscriptionId?: string;
  filters?: WatchFilters;
}

interface WebSocketWatchResponse {
  success: boolean;
  subscriptionId?: string;
  event?: WatchEvent;
  error?: string;
  status?: {
    subscriptions: number;
    totalEvents: number;
    uptime: number;
  };
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  namespace: '/watch',
  transports: ['websocket', 'polling'],
})
export class WatchService implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(WatchService.name);
  private readonly subscriptions = new Map<string, WatchSubscription>();
  private readonly clientSockets = new Map<string, Socket>();
  private readonly eventSubjects = new Map<string, Subject<WatchEvent>>();
  private readonly globalEventStream = new BehaviorSubject<WatchEvent | null>(null);
  private readonly maxSubscriptionsPerClient: number;
  private readonly maxEventHistory: number;
  private readonly eventHistory: WatchEvent[] = [];
  private readonly cleanupInterval: NodeJS.Timer;
  private readonly shutdownSubject = new Subject<void>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: RegistryCacheService,
    private readonly configService: ConfigService,
  ) {
    this.maxSubscriptionsPerClient = this.configService.get<number>('WATCH_MAX_SUBSCRIPTIONS_PER_CLIENT', 10);
    this.maxEventHistory = this.configService.get<number>('WATCH_MAX_EVENT_HISTORY', 1000);
    
    // Cleanup inactive subscriptions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSubscriptions();
    }, 5 * 60 * 1000);

    this.logger.log(`Watch Service initialized (max subscriptions: ${this.maxSubscriptionsPerClient})`);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Watch Service starting');
    
    // Set up global event stream filtering
    this.globalEventStream.pipe(
      filter(event => event !== null),
      takeUntil(this.shutdownSubject)
    ).subscribe((event: WatchEvent) => {
      this.distributeEvent(event);
    });

    this.logger.log('Watch Service started');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Watch Service');
    
    this.shutdownSubject.next();
    this.shutdownSubject.complete();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all active subscriptions
    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      await this.unsubscribe(subscriptionId);
    }

    this.subscriptions.clear();
    this.clientSockets.clear();
    this.eventSubjects.clear();

    this.logger.log('Watch Service shutdown complete');
  }

  /**
   * WebSocket message handlers
   */

  @SubscribeMessage('watch')
  async handleWatchMessage(
    @MessageBody() data: WebSocketWatchRequest,
    @ConnectedSocket() client: Socket,
  ): Promise<WebSocketWatchResponse> {
    try {
      this.logger.debug(`WebSocket watch message: ${data.action} from ${client.id}`);

      switch (data.action) {
        case 'subscribe':
          return await this.handleSubscribe(client, data.filters || {});
        
        case 'unsubscribe':
          if (data.subscriptionId) {
            return await this.handleUnsubscribe(client, data.subscriptionId);
          }
          return { success: false, error: 'Subscription ID required' };
        
        case 'update_filters':
          if (data.subscriptionId && data.filters) {
            return await this.handleUpdateFilters(client, data.subscriptionId, data.filters);
          }
          return { success: false, error: 'Subscription ID and filters required' };
        
        case 'get_status':
          return await this.handleGetStatus(client);
        
        default:
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      this.logger.error(`WebSocket watch message error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Public API methods for creating subscriptions
   */

  async createSubscription(clientId: string, filters: WatchFilters): Promise<string> {
    // Check subscription limits
    const clientSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.clientId === clientId);

    if (clientSubscriptions.length >= this.maxSubscriptionsPerClient) {
      throw new Error(`Maximum subscriptions (${this.maxSubscriptionsPerClient}) exceeded for client`);
    }

    const subscriptionId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: WatchSubscription = {
      id: subscriptionId,
      clientId,
      filters,
      createdAt: new Date(),
      lastActivity: new Date(),
      eventCount: 0,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Create event subject for this subscription
    const eventSubject = new Subject<WatchEvent>();
    this.eventSubjects.set(subscriptionId, eventSubject);

    // Set up filtering and processing pipeline
    this.setupSubscriptionPipeline(subscriptionId, subscription, eventSubject);

    // Send historical events if requested
    if (filters.includeHistory) {
      await this.sendHistoricalEvents(subscriptionId, filters);
    }

    this.logger.log(`Created watch subscription: ${subscriptionId} for client: ${clientId}`);
    metricsHelpers.recordWatchSubscription('created', filters.eventTypes?.join(',') || 'all');

    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Complete the event subject
    const eventSubject = this.eventSubjects.get(subscriptionId);
    if (eventSubject) {
      eventSubject.complete();
      this.eventSubjects.delete(subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);

    this.logger.log(`Removed watch subscription: ${subscriptionId}`);
    metricsHelpers.recordWatchSubscription('removed', 'unsubscribe');

    return true;
  }

  async updateSubscriptionFilters(subscriptionId: string, filters: WatchFilters): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.filters = { ...subscription.filters, ...filters };
    subscription.lastActivity = new Date();

    this.logger.debug(`Updated filters for subscription: ${subscriptionId}`);
    return true;
  }

  getSubscriptionInfo(subscriptionId: string): WatchSubscription | null {
    return this.subscriptions.get(subscriptionId) || null;
  }

  getActiveSubscriptions(): WatchSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Observable streams for programmatic access
   */

  getEventStream(filters?: WatchFilters): Observable<WatchEvent> {
    return this.globalEventStream.pipe(
      filter(event => event !== null),
      filter(event => this.matchesFilters(event, filters || {})),
      takeUntil(this.shutdownSubject)
    );
  }

  getAgentEventStream(agentId: string): Observable<WatchEvent> {
    return this.getEventStream({ agentIds: [agentId] });
  }

  getCapabilityEventStream(capability: string): Observable<WatchEvent> {
    return this.getEventStream({ capabilities: [capability] });
  }

  getHealthEventStream(): Observable<WatchEvent> {
    return this.getEventStream({ eventTypes: ['health_changed'] });
  }

  /**
   * Event handlers for registry events
   */

  @OnEvent('agent.registered')
  async handleAgentRegistered(payload: { agent: RegisteredAgent; leaseId: number; registrationTime: number }): Promise<void> {
    const event: WatchEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'agent_registered',
      timestamp: new Date(),
      agentId: payload.agent.id,
      agent: payload.agent,
      metadata: {
        leaseId: payload.leaseId,
        registrationTime: payload.registrationTime,
      },
      source: 'registry',
    };

    await this.emitEvent(event);
  }

  @OnEvent('agent.deregistered')
  async handleAgentDeregistered(payload: { agent: RegisteredAgent; reason: string; deregistrationTime: number }): Promise<void> {
    const event: WatchEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'agent_deregistered',
      timestamp: new Date(),
      agentId: payload.agent.id,
      agent: payload.agent,
      metadata: {
        reason: payload.reason,
        deregistrationTime: payload.deregistrationTime,
      },
      source: 'registry',
    };

    await this.emitEvent(event);
  }

  @OnEvent('agent.updated')
  async handleAgentUpdated(payload: { agentId: string; previousAgent: RegisteredAgent; updatedAgent: RegisteredAgent }): Promise<void> {
    const event: WatchEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'agent_updated',
      timestamp: new Date(),
      agentId: payload.agentId,
      agent: payload.updatedAgent,
      previousState: this.extractRelevantState(payload.previousAgent),
      newState: this.extractRelevantState(payload.updatedAgent),
      source: 'registry',
    };

    await this.emitEvent(event);
  }

  @OnEvent('agent.health.updated')
  async handleAgentHealthUpdated(payload: { agentId: string; health: any }): Promise<void> {
    const agent = await this.cacheService.getAgent(payload.agentId);
    
    const event: WatchEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'health_changed',
      timestamp: new Date(),
      agentId: payload.agentId,
      agent: agent || undefined,
      newState: payload.health,
      source: 'health',
    };

    await this.emitEvent(event);
  }

  @OnEvent('agent.lease.expired')
  async handleLeaseExpired(payload: { agentId: string; leaseId: number; ttl: number }): Promise<void> {
    const event: WatchEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'lease_expired',
      timestamp: new Date(),
      agentId: payload.agentId,
      metadata: {
        leaseId: payload.leaseId,
        ttl: payload.ttl,
      },
      source: 'lifecycle',
    };

    await this.emitEvent(event);
  }

  /**
   * Private helper methods
   */

  private async handleSubscribe(client: Socket, filters: WatchFilters): Promise<WebSocketWatchResponse> {
    try {
      const subscriptionId = await this.createSubscription(client.id, filters);
      
      // Store client socket for direct communication
      this.clientSockets.set(client.id, client);
      
      return {
        success: true,
        subscriptionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async handleUnsubscribe(client: Socket, subscriptionId: string): Promise<WebSocketWatchResponse> {
    const success = await this.unsubscribe(subscriptionId);
    
    return {
      success,
      error: success ? undefined : 'Subscription not found',
    };
  }

  private async handleUpdateFilters(client: Socket, subscriptionId: string, filters: WatchFilters): Promise<WebSocketWatchResponse> {
    const success = await this.updateSubscriptionFilters(subscriptionId, filters);
    
    return {
      success,
      error: success ? undefined : 'Subscription not found',
    };
  }

  private async handleGetStatus(client: Socket): Promise<WebSocketWatchResponse> {
    const clientSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.clientId === client.id);

    const totalEvents = clientSubscriptions.reduce((sum, sub) => sum + sub.eventCount, 0);

    return {
      success: true,
      status: {
        subscriptions: clientSubscriptions.length,
        totalEvents,
        uptime: process.uptime(),
      },
    };
  }

  private setupSubscriptionPipeline(subscriptionId: string, subscription: WatchSubscription, eventSubject: Subject<WatchEvent>): void {
    const filters = subscription.filters;
    
    // Set up pipeline with debouncing if specified
    let stream = eventSubject.asObservable();
    
    if (filters.debounceMs && filters.debounceMs > 0) {
      stream = stream.pipe(debounceTime(filters.debounceMs));
    }

    stream.pipe(
      takeUntil(this.shutdownSubject)
    ).subscribe({
      next: (event) => {
        this.deliverEventToClient(subscriptionId, event);
      },
      error: (error) => {
        this.logger.error(`Event stream error for subscription ${subscriptionId}:`, error);
      },
      complete: () => {
        this.logger.debug(`Event stream completed for subscription ${subscriptionId}`);
      },
    });
  }

  private async sendHistoricalEvents(subscriptionId: string, filters: WatchFilters): Promise<void> {
    const historicalEvents = this.eventHistory
      .filter(event => this.matchesFilters(event, filters))
      .slice(-100); // Send last 100 matching events

    for (const event of historicalEvents) {
      await this.deliverEventToClient(subscriptionId, event);
    }
  }

  private async emitEvent(event: WatchEvent): Promise<void> {
    // Add to history
    this.eventHistory.push(event);
    
    // Trim history if needed
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxEventHistory);
    }

    // Emit to global stream
    this.globalEventStream.next(event);

    // Record metrics
    metricsHelpers.recordWatchEvent(event.type, event.source);
  }

  private distributeEvent(event: WatchEvent): void {
    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      if (this.matchesFilters(event, subscription.filters)) {
        const eventSubject = this.eventSubjects.get(subscriptionId);
        if (eventSubject) {
          eventSubject.next(event);
          subscription.eventCount++;
          subscription.lastActivity = new Date();
        }
      }
    }
  }

  private matchesFilters(event: WatchEvent, filters: WatchFilters): boolean {
    // Agent ID filter
    if (filters.agentIds && filters.agentIds.length > 0) {
      if (!filters.agentIds.includes(event.agentId)) {
        return false;
      }
    }

    // Event type filter
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      if (!filters.eventTypes.includes(event.type)) {
        return false;
      }
    }

    // Agent type filter
    if (filters.agentTypes && filters.agentTypes.length > 0 && event.agent) {
      if (!filters.agentTypes.includes(event.agent.type)) {
        return false;
      }
    }

    // Health status filter
    if (filters.healthStatuses && filters.healthStatuses.length > 0 && event.agent) {
      if (!filters.healthStatuses.includes(event.agent.health.status as HealthStatus)) {
        return false;
      }
    }

    // Capability filter
    if (filters.capabilities && filters.capabilities.length > 0 && event.agent) {
      const agentCapabilities = new Set(event.agent.capabilities.map(cap => cap.name));
      if (!filters.capabilities.some(cap => agentCapabilities.has(cap))) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0 && event.agent) {
      if (!event.agent.tags || !filters.tags.some(tag => event.agent.tags.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  private async deliverEventToClient(subscriptionId: string, event: WatchEvent): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    const client = this.clientSockets.get(subscription.clientId);
    if (!client || !client.connected) {
      // Client disconnected, remove subscription
      await this.unsubscribe(subscriptionId);
      return;
    }

    try {
      // Prepare event data based on filters
      const eventData = this.prepareEventData(event, subscription.filters);
      
      const response: WebSocketWatchResponse = {
        success: true,
        subscriptionId,
        event: eventData,
      };

      client.emit('watch_event', response);
    } catch (error) {
      this.logger.error(`Failed to deliver event to client ${subscription.clientId}:`, error);
    }
  }

  private prepareEventData(event: WatchEvent, filters: WatchFilters): WatchEvent {
    // Create a copy of the event
    const eventData = { ...event };

    // Remove agent data if not needed to reduce payload size
    if (!filters.includeMetadata) {
      delete eventData.metadata;
    }

    // Remove sensitive data if needed
    if (eventData.agent) {
      eventData.agent = this.sanitizeAgentData(eventData.agent);
    }

    return eventData;
  }

  private sanitizeAgentData(agent: RegisteredAgent): RegisteredAgent {
    // Remove potentially sensitive metadata
    const sanitized = { ...agent };
    if (sanitized.metadata) {
      const { registryVersion, lastUpdated, ...publicMetadata } = sanitized.metadata;
      sanitized.metadata = { registryVersion, lastUpdated, ...publicMetadata };
    }
    return sanitized;
  }

  private extractRelevantState(agent: RegisteredAgent): any {
    return {
      version: agent.version,
      health: agent.health,
      capabilities: agent.capabilities.map(cap => cap.name),
      tags: agent.tags,
      lastHeartbeat: agent.lastHeartbeat,
    };
  }

  private cleanupInactiveSubscriptions(): void {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes
    
    const inactiveSubscriptions: string[] = [];
    
    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      const inactiveTime = now.getTime() - subscription.lastActivity.getTime();
      
      if (inactiveTime > maxInactiveTime) {
        inactiveSubscriptions.push(subscriptionId);
      }
    }

    for (const subscriptionId of inactiveSubscriptions) {
      this.unsubscribe(subscriptionId);
      this.logger.debug(`Cleaned up inactive subscription: ${subscriptionId}`);
    }

    if (inactiveSubscriptions.length > 0) {
      this.logger.log(`Cleaned up ${inactiveSubscriptions.length} inactive subscriptions`);
    }
  }

  /**
   * Connection event handlers
   */

  async handleConnection(client: Socket): Promise<void> {
    this.logger.debug(`WebSocket client connected: ${client.id}`);
    this.clientSockets.set(client.id, client);
    
    // Send welcome message
    client.emit('welcome', {
      clientId: client.id,
      serverTime: new Date().toISOString(),
      maxSubscriptions: this.maxSubscriptionsPerClient,
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.debug(`WebSocket client disconnected: ${client.id}`);
    
    // Clean up client subscriptions
    const clientSubscriptions = Array.from(this.subscriptions.entries())
      .filter(([, sub]) => sub.clientId === client.id)
      .map(([id]) => id);

    for (const subscriptionId of clientSubscriptions) {
      await this.unsubscribe(subscriptionId);
    }

    this.clientSockets.delete(client.id);
  }
}