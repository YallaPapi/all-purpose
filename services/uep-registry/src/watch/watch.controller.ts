/**
 * Watch Controller
 * 
 * HTTP/REST API endpoints for managing watch subscriptions and
 * retrieving real-time agent registry information.
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UsePipes,
  ValidationPipe,
  DefaultValuePipe,
  ParseIntPipe,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { WatchService } from './watch.service';
import { AgentType, HealthStatus } from '../registry/dto/registry.dto';

// DTOs for watch operations
class CreateWatchSubscriptionDto {
  agentIds?: string[];
  agentTypes?: AgentType[];
  capabilities?: string[];
  tags?: string[];
  healthStatuses?: HealthStatus[];
  eventTypes?: string[];
  includeMetadata?: boolean;
  includeHistory?: boolean;
  batchSize?: number;
  debounceMs?: number;
}

class UpdateWatchFiltersDto {
  agentIds?: string[];
  agentTypes?: AgentType[];
  capabilities?: string[];
  tags?: string[];
  healthStatuses?: HealthStatus[];
  eventTypes?: string[];
  includeMetadata?: boolean;
  batchSize?: number;
  debounceMs?: number;
}

@ApiTags('Watch API')
@Controller('watch')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WatchController {
  constructor(private readonly watchService: WatchService) {}

  /**
   * Create a new watch subscription
   */
  @Post('subscriptions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create watch subscription',
    description: 'Create a new watch subscription for real-time agent registry events'
  })
  @ApiCreatedResponse({
    description: 'Subscription created successfully',
    schema: {
      type: 'object',
      properties: {
        subscriptionId: { type: 'string' },
        clientId: { type: 'string' },
        filters: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        websocketUrl: { type: 'string' },
        instructions: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid subscription parameters' })
  @ApiBody({ type: CreateWatchSubscriptionDto })
  async createSubscription(
    @Body() filters: CreateWatchSubscriptionDto,
    @Query('clientId') clientId?: string,
  ) {
    try {
      const actualClientId = clientId || `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const subscriptionId = await this.watchService.createSubscription(actualClientId, filters);
      
      return {
        subscriptionId,
        clientId: actualClientId,
        filters,
        createdAt: new Date().toISOString(),
        websocketUrl: '/watch',
        instructions: 'Connect to WebSocket at /watch namespace and send {"action": "subscribe", "subscriptionId": "' + subscriptionId + '"} to start receiving events',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get subscription information
   */
  @Get('subscriptions/:subscriptionId')
  @ApiOperation({
    summary: 'Get subscription info',
    description: 'Retrieve information about a specific watch subscription'
  })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription identifier' })
  @ApiOkResponse({
    description: 'Subscription information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        clientId: { type: 'string' },
        filters: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        lastActivity: { type: 'string', format: 'date-time' },
        eventCount: { type: 'number' },
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Subscription not found' })
  async getSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = this.watchService.getSubscriptionInfo(subscriptionId);
    
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    const lastActivityTime = now.getTime() - subscription.lastActivity.getTime();
    const isActive = lastActivityTime < 5 * 60 * 1000; // Active if activity within 5 minutes

    return {
      ...subscription,
      status: isActive ? 'active' : 'inactive',
    };
  }

  /**
   * Update subscription filters
   */
  @Put('subscriptions/:subscriptionId/filters')
  @ApiOperation({
    summary: 'Update subscription filters',
    description: 'Update the filters for an existing watch subscription'
  })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription identifier' })
  @ApiOkResponse({
    description: 'Filters updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        subscriptionId: { type: 'string' },
        updatedFilters: { type: 'object' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Subscription not found' })
  @ApiBody({ type: UpdateWatchFiltersDto })
  async updateSubscriptionFilters(
    @Param('subscriptionId') subscriptionId: string,
    @Body() filters: UpdateWatchFiltersDto,
  ) {
    const success = await this.watchService.updateSubscriptionFilters(subscriptionId, filters);
    
    if (!success) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      success: true,
      subscriptionId,
      updatedFilters: filters,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Delete a watch subscription
   */
  @Delete('subscriptions/:subscriptionId')
  @ApiOperation({
    summary: 'Delete subscription',
    description: 'Remove a watch subscription and stop receiving events'
  })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription identifier' })
  @ApiOkResponse({
    description: 'Subscription deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        subscriptionId: { type: 'string' },
        deletedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Subscription not found' })
  async deleteSubscription(@Param('subscriptionId') subscriptionId: string) {
    const success = await this.watchService.unsubscribe(subscriptionId);
    
    if (!success) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      success: true,
      subscriptionId,
      deletedAt: new Date().toISOString(),
    };
  }

  /**
   * List all active subscriptions
   */
  @Get('subscriptions')
  @ApiOperation({
    summary: 'List subscriptions',
    description: 'Get a list of all active watch subscriptions'
  })
  @ApiQuery({ name: 'clientId', description: 'Filter by client ID', required: false })
  @ApiQuery({ name: 'limit', description: 'Maximum results to return', required: false, type: Number })
  @ApiQuery({ name: 'offset', description: 'Results offset for pagination', required: false, type: Number })
  @ApiOkResponse({
    description: 'List of subscriptions',
    schema: {
      type: 'object',
      properties: {
        subscriptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              clientId: { type: 'string' },
              filters: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
              lastActivity: { type: 'string', format: 'date-time' },
              eventCount: { type: 'number' },
              status: { type: 'string' },
            },
          },
        },
        totalCount: { type: 'number' },
        activeCount: { type: 'number' },
      },
    },
  })
  async listSubscriptions(
    @Query('clientId') clientId?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number = 0,
  ) {
    let subscriptions = this.watchService.getActiveSubscriptions();

    // Filter by client ID if specified
    if (clientId) {
      subscriptions = subscriptions.filter(sub => sub.clientId === clientId);
    }

    const totalCount = subscriptions.length;
    const now = new Date();

    // Add status and apply pagination
    const enrichedSubscriptions = subscriptions
      .slice(offset, offset + limit)
      .map(sub => {
        const lastActivityTime = now.getTime() - sub.lastActivity.getTime();
        const isActive = lastActivityTime < 5 * 60 * 1000;
        
        return {
          ...sub,
          status: isActive ? 'active' : 'inactive',
        };
      });

    const activeCount = enrichedSubscriptions.filter(sub => sub.status === 'active').length;

    return {
      subscriptions: enrichedSubscriptions,
      totalCount,
      activeCount,
    };
  }

  /**
   * Get watch statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get watch statistics',
    description: 'Retrieve comprehensive statistics about watch subscriptions and events'
  })
  @ApiOkResponse({
    description: 'Watch statistics',
    schema: {
      type: 'object',
      properties: {
        totalSubscriptions: { type: 'number' },
        activeSubscriptions: { type: 'number' },
        totalEvents: { type: 'number' },
        eventsByType: { 
          type: 'object',
          additionalProperties: { type: 'number' }
        },
        clientCount: { type: 'number' },
        averageEventsPerSubscription: { type: 'number' },
        uptime: { type: 'number' },
        memoryUsage: { type: 'string' },
      },
    },
  })
  async getWatchStats() {
    const subscriptions = this.watchService.getActiveSubscriptions();
    const now = new Date();
    
    const activeSubscriptions = subscriptions.filter(sub => {
      const lastActivityTime = now.getTime() - sub.lastActivity.getTime();
      return lastActivityTime < 5 * 60 * 1000;
    });

    const clientCount = new Set(subscriptions.map(sub => sub.clientId)).size;
    const totalEvents = subscriptions.reduce((sum, sub) => sum + sub.eventCount, 0);
    const averageEventsPerSubscription = subscriptions.length > 0 ? totalEvents / subscriptions.length : 0;

    // This would normally come from actual event tracking
    const eventsByType = {
      agent_registered: 0,
      agent_deregistered: 0,
      agent_updated: 0,
      health_changed: 0,
      capabilities_changed: 0,
      lease_expired: 0,
    };

    const memoryUsage = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`;

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      totalEvents,
      eventsByType,
      clientCount,
      averageEventsPerSubscription: Math.round(averageEventsPerSubscription * 100) / 100,
      uptime: Math.round(process.uptime()),
      memoryUsage,
    };
  }

  /**
   * Test watch connectivity
   */
  @Post('test/connectivity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test watch connectivity',
    description: 'Test WebSocket connectivity and subscription functionality'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        testDuration: { type: 'number', description: 'Test duration in seconds', default: 10 },
        eventTypes: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiOkResponse({
    description: 'Connectivity test results',
    schema: {
      type: 'object',
      properties: {
        testId: { type: 'string' },
        websocketUrl: { type: 'string' },
        testDuration: { type: 'number' },
        instructions: { type: 'array', items: { type: 'string' } },
        expectedEvents: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async testConnectivity(@Body() body: { testDuration?: number; eventTypes?: string[] }) {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testDuration = body.testDuration || 10;
    const expectedEvents = body.eventTypes || ['agent_registered', 'health_changed'];

    return {
      testId,
      websocketUrl: '/watch',
      testDuration,
      instructions: [
        '1. Connect to WebSocket at /watch namespace',
        `2. Send: {"action": "subscribe", "filters": {"eventTypes": ${JSON.stringify(expectedEvents)}}}`,
        '3. Listen for watch_event messages',
        `4. Test will run for ${testDuration} seconds`,
        '5. Verify you receive expected event types',
      ],
      expectedEvents,
    };
  }

  /**
   * Get available event types
   */
  @Get('event-types')
  @ApiOperation({
    summary: 'Get available event types',
    description: 'Retrieve a list of all available event types for watch subscriptions'
  })
  @ApiOkResponse({
    description: 'Available event types',
    schema: {
      type: 'object',
      properties: {
        eventTypes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              description: { type: 'string' },
              source: { type: 'string' },
              frequency: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
          },
        },
        totalTypes: { type: 'number' },
      },
    },
  })
  async getEventTypes() {
    const eventTypes = [
      {
        type: 'agent_registered',
        description: 'Agent registration event',
        source: 'registry',
        frequency: 'medium',
      },
      {
        type: 'agent_deregistered',
        description: 'Agent deregistration event',
        source: 'registry',
        frequency: 'medium',
      },
      {
        type: 'agent_updated',
        description: 'Agent information update',
        source: 'registry',
        frequency: 'low',
      },
      {
        type: 'health_changed',
        description: 'Agent health status change',
        source: 'health',
        frequency: 'high',
      },
      {
        type: 'capabilities_changed',
        description: 'Agent capabilities modification',
        source: 'registry',
        frequency: 'low',
      },
      {
        type: 'lease_expired',
        description: 'Agent lease expiration',
        source: 'lifecycle',
        frequency: 'medium',
      },
      {
        type: 'status_changed',
        description: 'Agent status change',
        source: 'lifecycle',
        frequency: 'medium',
      },
      {
        type: 'metadata_updated',
        description: 'Agent metadata update',
        source: 'registry',
        frequency: 'low',
      },
    ];

    return {
      eventTypes,
      totalTypes: eventTypes.length,
    };
  }

  /**
   * Watch server-sent events endpoint
   */
  @Get('events/stream')
  @ApiOperation({
    summary: 'Server-sent events stream',
    description: 'HTTP streaming endpoint for watch events using Server-Sent Events (SSE)'
  })
  @ApiQuery({ name: 'agentIds', description: 'Filter by agent IDs (comma-separated)', required: false })
  @ApiQuery({ name: 'eventTypes', description: 'Filter by event types (comma-separated)', required: false })
  @ApiQuery({ name: 'capabilities', description: 'Filter by capabilities (comma-separated)', required: false })
  @ApiResponse({
    status: 200,
    description: 'Server-sent events stream',
    headers: {
      'Content-Type': { description: 'text/event-stream' },
      'Cache-Control': { description: 'no-cache' },
      'Connection': { description: 'keep-alive' },
    },
  })
  async streamEvents(
    @Query('agentIds') agentIds?: string,
    @Query('eventTypes') eventTypes?: string,
    @Query('capabilities') capabilities?: string,
  ) {
    // This would typically return a streaming response
    // For now, return instructions on how to use SSE
    return {
      message: 'Server-Sent Events endpoint',
      instructions: [
        'Use EventSource API to connect to this endpoint',
        'Example: const eventSource = new EventSource("/watch/events/stream?eventTypes=health_changed")',
        'Listen for "message" events to receive watch events',
        'Events will be in JSON format with event data',
      ],
      filters: {
        agentIds: agentIds?.split(','),
        eventTypes: eventTypes?.split(','),
        capabilities: capabilities?.split(','),
      },
    };
  }

  /**
   * Replay events from history
   */
  @Post('replay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replay historical events',
    description: 'Replay events from history based on time range and filters'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        startTime: { type: 'string', format: 'date-time' },
        endTime: { type: 'string', format: 'date-time' },
        agentIds: { type: 'array', items: { type: 'string' } },
        eventTypes: { type: 'array', items: { type: 'string' } },
        limit: { type: 'number', default: 100 },
      },
    },
  })
  @ApiOkResponse({
    description: 'Historical events',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              agentId: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
        totalCount: { type: 'number' },
        timeRange: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async replayEvents(@Body() body: {
    startTime?: string;
    endTime?: string;
    agentIds?: string[];
    eventTypes?: string[];
    limit?: number;
  }) {
    // This would normally query the event history
    // For now, return a mock response structure
    const startTime = body.startTime ? new Date(body.startTime) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = body.endTime ? new Date(body.endTime) : new Date();
    const limit = body.limit || 100;

    return {
      events: [], // Would contain actual historical events
      totalCount: 0,
      timeRange: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
      appliedFilters: {
        agentIds: body.agentIds,
        eventTypes: body.eventTypes,
        limit,
      },
      message: 'Event replay functionality ready - historical events would be returned here',
    };
  }
}