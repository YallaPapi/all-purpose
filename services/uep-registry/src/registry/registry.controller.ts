/**
 * Registry Controller
 * 
 * HTTP/REST API endpoints for UEP agent registration and management.
 * Provides comprehensive agent lifecycle operations with full validation.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { RegistryService } from './registry.service';
import {
  AgentRegistrationDto,
  AgentUpdateDto,
  RegisteredAgent,
  RegistrationResponse,
  DeregistrationResponse,
  HeartbeatRequestDto,
  HeartbeatResponse,
  RegistryStatistics,
  AgentType,
} from './dto/registry.dto';

@ApiTags('Agent Registry')
@Controller('registry/agents')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  /**
   * Register a new UEP agent
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register new UEP agent',
    description: 'Register a new UEP agent in the service registry with complete validation and lifecycle management'
  })
  @ApiCreatedResponse({ 
    description: 'Agent registered successfully',
    type: RegistrationResponse 
  })
  @ApiBadRequestResponse({ description: 'Invalid registration data or validation failed' })
  @ApiConflictResponse({ description: 'Agent ID already exists' })
  @ApiBody({ type: AgentRegistrationDto })
  async registerAgent(
    @Body() registrationDto: AgentRegistrationDto,
  ): Promise<RegistrationResponse> {
    return this.registryService.registerAgent(registrationDto);
  }

  /**
   * Get agent by ID
   */
  @Get(':agentId')
  @ApiOperation({ 
    summary: 'Get agent by ID',
    description: 'Retrieve detailed information about a registered UEP agent'
  })
  @ApiParam({ name: 'agentId', description: 'Unique agent identifier' })
  @ApiOkResponse({ 
    description: 'Agent found',
    type: RegisteredAgent 
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async getAgent(@Param('agentId') agentId: string): Promise<RegisteredAgent> {
    const agent = await this.registryService.getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent;
  }

  /**
   * Update agent information
   */
  @Put(':agentId')
  @ApiOperation({ 
    summary: 'Update agent information',
    description: 'Update registration information for an existing UEP agent'
  })
  @ApiParam({ name: 'agentId', description: 'Unique agent identifier' })
  @ApiOkResponse({ 
    description: 'Agent updated successfully',
    type: RegisteredAgent 
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiBody({ type: AgentUpdateDto })
  async updateAgent(
    @Param('agentId') agentId: string,
    @Body() updateDto: AgentUpdateDto,
  ): Promise<RegisteredAgent> {
    return this.registryService.updateAgent(agentId, updateDto);
  }

  /**
   * Deregister agent
   */
  @Delete(':agentId')
  @ApiOperation({ 
    summary: 'Deregister agent',
    description: 'Remove an agent from the service registry and cancel all monitoring'
  })
  @ApiParam({ name: 'agentId', description: 'Unique agent identifier' })
  @ApiQuery({ name: 'reason', description: 'Deregistration reason', required: false })
  @ApiOkResponse({ 
    description: 'Agent deregistered successfully',
    type: DeregistrationResponse 
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async deregisterAgent(
    @Param('agentId') agentId: string,
    @Query('reason') reason?: string,
  ): Promise<DeregistrationResponse> {
    return this.registryService.deregisterAgent(agentId, reason || 'manual');
  }

  /**
   * Agent heartbeat
   */
  @Post(':agentId/heartbeat')
  @ApiOperation({ 
    summary: 'Send agent heartbeat',
    description: 'Send a heartbeat to keep the agent registration alive and update health status'
  })
  @ApiParam({ name: 'agentId', description: 'Unique agent identifier' })
  @ApiOkResponse({ 
    description: 'Heartbeat processed successfully',
    type: HeartbeatResponse 
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  @ApiBody({ type: HeartbeatRequestDto })
  async sendHeartbeat(
    @Param('agentId') agentId: string,
    @Body() heartbeatDto: HeartbeatRequestDto,
  ): Promise<HeartbeatResponse> {
    // Update health if provided
    if (heartbeatDto.health) {
      await this.registryService.updateAgentHealth(agentId, heartbeatDto.health);
    }

    // Process heartbeat
    const result = await this.registryService.heartbeat(agentId);
    
    // Calculate next heartbeat time (30 seconds from now)
    const nextHeartbeat = new Date();
    nextHeartbeat.setSeconds(nextHeartbeat.getSeconds() + 30);

    return {
      success: result.success,
      ttl: result.ttl,
      message: 'Heartbeat processed successfully',
      nextHeartbeat,
    };
  }

  /**
   * Get all agents
   */
  @Get()
  @ApiOperation({ 
    summary: 'Get all registered agents',
    description: 'Retrieve a list of all registered UEP agents with optional filtering'
  })
  @ApiQuery({ 
    name: 'type', 
    description: 'Filter by agent type',
    enum: AgentType,
    required: false 
  })
  @ApiQuery({ 
    name: 'healthy', 
    description: 'Filter by health status',
    type: Boolean,
    required: false 
  })
  @ApiOkResponse({ 
    description: 'List of registered agents',
    type: [RegisteredAgent] 
  })
  async getAllAgents(
    @Query('type') type?: AgentType,
    @Query('healthy') healthy?: boolean,
  ): Promise<RegisteredAgent[]> {
    let agents: RegisteredAgent[];

    // Filter by type if specified
    if (type) {
      agents = await this.registryService.getAgentsByType(type);
    } else {
      agents = await this.registryService.getAllAgents();
    }

    // Filter by health status if specified
    if (healthy !== undefined) {
      agents = agents.filter(agent => {
        const isHealthy = agent.health.status === 'healthy';
        return healthy ? isHealthy : !isHealthy;
      });
    }

    return agents;
  }

  /**
   * Get agents by type
   */
  @Get('type/:type')
  @ApiOperation({ 
    summary: 'Get agents by type',
    description: 'Retrieve all agents of a specific type (meta, domain, or system)'
  })
  @ApiParam({ 
    name: 'type', 
    description: 'Agent type',
    enum: AgentType 
  })
  @ApiOkResponse({ 
    description: 'List of agents by type',
    type: [RegisteredAgent] 
  })
  async getAgentsByType(
    @Param('type', new ParseEnumPipe(AgentType)) type: AgentType,
  ): Promise<RegisteredAgent[]> {
    return this.registryService.getAgentsByType(type);
  }

  /**
   * Get registry statistics
   */
  @Get('stats/summary')
  @ApiOperation({ 
    summary: 'Get registry statistics',
    description: 'Retrieve comprehensive statistics about the agent registry'
  })
  @ApiOkResponse({ 
    description: 'Registry statistics',
    type: RegistryStatistics 
  })
  async getRegistryStats(): Promise<RegistryStatistics> {
    const stats = await this.registryService.getRegistryStats();
    
    return {
      ...stats,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  /**
   * Health check endpoint
   */
  @Get('health/check')
  @ApiOperation({ 
    summary: 'Registry health check',
    description: 'Check the health and connectivity of the registry service'
  })
  @ApiOkResponse({ 
    description: 'Registry is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: 'Service uptime in seconds' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    uptime: number;
    version: string;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  /**
   * Get agent capabilities
   */
  @Get(':agentId/capabilities')
  @ApiOperation({ 
    summary: 'Get agent capabilities',
    description: 'Retrieve the capabilities of a specific agent'
  })
  @ApiParam({ name: 'agentId', description: 'Unique agent identifier' })
  @ApiOkResponse({ 
    description: 'Agent capabilities',
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        capabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string' },
              endpoint: { type: 'string' },
              timeout: { type: 'number' },
              rateLimit: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async getAgentCapabilities(@Param('agentId') agentId: string): Promise<{
    agentId: string;
    capabilities: any[];
  }> {
    const agent = await this.registryService.getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return {
      agentId,
      capabilities: agent.capabilities,
    };
  }

  /**
   * Get agent health status
   */
  @Get(':agentId/health')
  @ApiOperation({ 
    summary: 'Get agent health status',
    description: 'Retrieve the current health status of a specific agent'
  })
  @ApiParam({ name: 'agentId', description: 'Unique agent identifier' })
  @ApiOkResponse({ 
    description: 'Agent health status',
    schema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        health: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded', 'unknown'] },
            responseTime: { type: 'number' },
            consecutiveFailures: { type: 'number' },
            lastChecked: { type: 'string', format: 'date-time' },
            message: { type: 'string' },
          },
        },
        lastHeartbeat: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Agent not found' })
  async getAgentHealth(@Param('agentId') agentId: string): Promise<{
    agentId: string;
    health: any;
    lastHeartbeat: Date;
  }> {
    const agent = await this.registryService.getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return {
      agentId,
      health: agent.health,
      lastHeartbeat: agent.lastHeartbeat,
    };
  }
}