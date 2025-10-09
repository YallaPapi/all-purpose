/**
 * Discovery Controller
 * 
 * HTTP/REST API endpoints for UEP agent discovery and capability search.
 * Provides comprehensive discovery functionality with advanced filtering,
 * ranking, and recommendation features.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseArrayPipe,
  DefaultValuePipe,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { AgentType, HealthStatus } from '../registry/dto/registry.dto';

// DTOs for discovery operations
class DiscoveryQueryDto {
  capabilities?: string[];
  agentType?: AgentType;
  tags?: string[];
  healthStatus?: HealthStatus[];
  version?: string;
  versionRange?: string;
  location?: string;
  maxResponseTime?: number;
  minSuccessRate?: number;
  excludeAgents?: string[];
  includeAgents?: string[];
  sortBy?: 'health' | 'performance' | 'version' | 'load' | 'proximity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

class BulkCapabilityCheckDto {
  agentIds: string[];
  requiredCapabilities: string[];
}

@ApiTags('Agent Discovery')
@Controller('discovery')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /**
   * Discover agents with advanced filtering
   */
  @Get('agents')
  @ApiOperation({
    summary: 'Discover agents by capabilities and filters',
    description: 'Find agents based on capabilities, health status, performance, and other criteria with intelligent ranking'
  })
  @ApiQuery({ name: 'capabilities', description: 'Required capabilities (comma-separated)', required: false, type: String })
  @ApiQuery({ name: 'agentType', description: 'Agent type filter', required: false, enum: AgentType })
  @ApiQuery({ name: 'tags', description: 'Required tags (comma-separated)', required: false, type: String })
  @ApiQuery({ name: 'healthStatus', description: 'Health status filter (comma-separated)', required: false, type: String })
  @ApiQuery({ name: 'version', description: 'Exact version match', required: false, type: String })
  @ApiQuery({ name: 'maxResponseTime', description: 'Maximum response time in ms', required: false, type: Number })
  @ApiQuery({ name: 'minSuccessRate', description: 'Minimum success rate (0-1)', required: false, type: Number })
  @ApiQuery({ name: 'excludeAgents', description: 'Agents to exclude (comma-separated)', required: false, type: String })
  @ApiQuery({ name: 'includeAgents', description: 'Only include these agents (comma-separated)', required: false, type: String })
  @ApiQuery({ name: 'sortBy', description: 'Sort criteria', required: false, enum: ['health', 'performance', 'version', 'load', 'proximity'] })
  @ApiQuery({ name: 'sortOrder', description: 'Sort order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'limit', description: 'Maximum results to return', required: false, type: Number })
  @ApiQuery({ name: 'offset', description: 'Results offset for pagination', required: false, type: Number })
  @ApiOkResponse({
    description: 'Discovery results with ranked agents',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agent: { $ref: '#/components/schemas/RegisteredAgent' },
              score: { type: 'number', description: 'Overall matching score (0-1)' },
              matchedCapabilities: { type: 'array', items: { type: 'string' } },
              healthScore: { type: 'number' },
              performanceScore: { type: 'number' },
              availabilityScore: { type: 'number' },
              reason: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        totalCount: { type: 'number' },
        queryTime: { type: 'number', description: 'Query processing time in ms' },
        filters: { type: 'object', description: 'Applied filters' },
        suggestions: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async discoverAgents(
    @Query('capabilities') capabilities?: string,
    @Query('agentType') agentType?: AgentType,
    @Query('tags') tags?: string,
    @Query('healthStatus') healthStatus?: string,
    @Query('version') version?: string,
    @Query('maxResponseTime', new DefaultValuePipe(0), ParseIntPipe) maxResponseTime?: number,
    @Query('minSuccessRate', new DefaultValuePipe(0)) minSuccessRate?: number,
    @Query('excludeAgents') excludeAgents?: string,
    @Query('includeAgents') includeAgents?: string,
    @Query('sortBy') sortBy?: 'health' | 'performance' | 'version' | 'load' | 'proximity',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: 'asc' | 'desc',
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const query: any = {
      sortOrder,
      limit,
      offset,
    };

    // Parse comma-separated values
    if (capabilities) query.capabilities = capabilities.split(',').map(s => s.trim());
    if (agentType) query.agentType = agentType;
    if (tags) query.tags = tags.split(',').map(s => s.trim());
    if (healthStatus) query.healthStatus = healthStatus.split(',').map(s => s.trim());
    if (version) query.version = version;
    if (maxResponseTime && maxResponseTime > 0) query.maxResponseTime = maxResponseTime;
    if (minSuccessRate && minSuccessRate > 0) query.minSuccessRate = minSuccessRate;
    if (excludeAgents) query.excludeAgents = excludeAgents.split(',').map(s => s.trim());
    if (includeAgents) query.includeAgents = includeAgents.split(',').map(s => s.trim());
    if (sortBy) query.sortBy = sortBy;

    return this.discoveryService.discoverAgents(query);
  }

  /**
   * Advanced discovery with POST body
   */
  @Post('agents/advanced')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Advanced agent discovery',
    description: 'Perform complex agent discovery with detailed query parameters in request body'
  })
  @ApiBody({ type: DiscoveryQueryDto })
  @ApiOkResponse({ description: 'Discovery results' })
  async advancedDiscovery(@Body() query: DiscoveryQueryDto) {
    return this.discoveryService.discoverAgents(query);
  }

  /**
   * Get capability suggestions
   */
  @Get('capabilities/suggest')
  @ApiOperation({
    summary: 'Get capability suggestions',
    description: 'Get capability name suggestions based on partial input with popularity ranking'
  })
  @ApiQuery({ name: 'q', description: 'Partial capability name' })
  @ApiQuery({ name: 'limit', description: 'Maximum suggestions to return', required: false, type: Number })
  @ApiOkResponse({
    description: 'Capability suggestions',
    schema: {
      type: 'object',
      properties: {
        suggestions: { type: 'array', items: { type: 'string' } },
        query: { type: 'string' },
        count: { type: 'number' },
      },
    },
  })
  async getCapabilitySuggestions(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const suggestions = await this.discoveryService.getCapabilitySuggestions(query, limit);
    
    return {
      suggestions,
      query,
      count: suggestions.length,
    };
  }

  /**
   * Get detailed capability information
   */
  @Get('capabilities/:capability')
  @ApiOperation({
    summary: 'Get capability information',
    description: 'Get detailed information about a specific capability including usage statistics'
  })
  @ApiParam({ name: 'capability', description: 'Capability name' })
  @ApiOkResponse({
    description: 'Capability information',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        agentCount: { type: 'number' },
        averageResponseTime: { type: 'number' },
        successRate: { type: 'number' },
        popularTags: { type: 'array', items: { type: 'string' } },
        relatedCapabilities: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getCapabilityInfo(@Param('capability') capability: string) {
    const info = await this.discoveryService.getCapabilityInfo(capability);
    
    if (!info) {
      return {
        error: 'Capability not found',
        capability,
      };
    }
    
    return info;
  }

  /**
   * Get discovery recommendations
   */
  @Get('recommendations')
  @ApiOperation({
    summary: 'Get discovery recommendations',
    description: 'Get personalized discovery recommendations based on usage patterns'
  })
  @ApiQuery({ name: 'agentId', description: 'Get recommendations for specific agent', required: false })
  @ApiOkResponse({
    description: 'Discovery recommendations',
    schema: {
      type: 'object',
      properties: {
        recommendedCapabilities: { type: 'array', items: { type: 'string' } },
        trendingCapabilities: { type: 'array', items: { type: 'string' } },
        alternativeAgents: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getDiscoveryRecommendations(@Query('agentId') agentId?: string) {
    return this.discoveryService.getDiscoveryRecommendations(agentId);
  }

  /**
   * Bulk capability check
   */
  @Post('capabilities/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk capability check',
    description: 'Check if multiple agents have required capabilities with scoring'
  })
  @ApiBody({ type: BulkCapabilityCheckDto })
  @ApiOkResponse({
    description: 'Capability check results',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          hasAllCapabilities: { type: 'boolean' },
          missingCapabilities: { type: 'array', items: { type: 'string' } },
          score: { type: 'number', description: 'Capability match score (0-1)' },
        },
      },
    },
  })
  async bulkCapabilityCheck(@Body() body: BulkCapabilityCheckDto) {
    const results = await this.discoveryService.bulkCapabilityCheck(
      body.agentIds,
      body.requiredCapabilities
    );
    
    // Convert Map to Object for JSON response
    const responseObj: Record<string, any> = {};
    for (const [agentId, result] of results.entries()) {
      responseObj[agentId] = result;
    }
    
    return responseObj;
  }

  /**
   * Quick capability lookup
   */
  @Get('capabilities/:capability/agents')
  @ApiOperation({
    summary: 'Find agents by capability',
    description: 'Quickly find all agents that have a specific capability'
  })
  @ApiParam({ name: 'capability', description: 'Capability name' })
  @ApiQuery({ name: 'healthyOnly', description: 'Only return healthy agents', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', description: 'Maximum results', required: false, type: Number })
  @ApiOkResponse({
    description: 'Agents with the specified capability',
    schema: {
      type: 'object',
      properties: {
        capability: { type: 'string' },
        agents: { type: 'array', items: { $ref: '#/components/schemas/RegisteredAgent' } },
        totalCount: { type: 'number' },
        healthyCount: { type: 'number' },
      },
    },
  })
  async getAgentsByCapability(
    @Param('capability') capability: string,
    @Query('healthyOnly', new DefaultValuePipe(false)) healthyOnly: boolean,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    const query: any = {
      capabilities: [capability],
      limit,
    };

    if (healthyOnly) {
      query.healthStatus = [HealthStatus.HEALTHY];
    }

    const result = await this.discoveryService.discoverAgents(query);
    
    const agents = result.results.map(r => r.agent);
    const healthyCount = agents.filter(a => a.health.status === HealthStatus.HEALTHY).length;

    return {
      capability,
      agents,
      totalCount: result.totalCount,
      healthyCount,
    };
  }

  /**
   * Discovery analytics
   */
  @Get('analytics/summary')
  @ApiOperation({
    summary: 'Get discovery analytics',
    description: 'Get summary analytics about agent discovery patterns and usage'
  })
  @ApiOkResponse({
    description: 'Discovery analytics summary',
    schema: {
      type: 'object',
      properties: {
        totalCapabilities: { type: 'number' },
        totalAgents: { type: 'number' },
        averageCapabilitiesPerAgent: { type: 'number' },
        topCapabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              agentCount: { type: 'number' },
              popularity: { type: 'number' },
            },
          },
        },
        healthDistribution: {
          type: 'object',
          properties: {
            healthy: { type: 'number' },
            degraded: { type: 'number' },
            unhealthy: { type: 'number' },
            unknown: { type: 'number' },
          },
        },
      },
    },
  })
  async getDiscoveryAnalytics() {
    // This would gather analytics from the discovery service
    // For now, return a mock response structure
    return {
      totalCapabilities: 0,
      totalAgents: 0,
      averageCapabilitiesPerAgent: 0,
      topCapabilities: [],
      healthDistribution: {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0,
      },
    };
  }

  /**
   * Test discovery performance
   */
  @Post('test/performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test discovery performance',
    description: 'Run performance tests on discovery queries for optimization'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: { $ref: '#/components/schemas/DiscoveryQueryDto' },
        },
        iterations: { type: 'number', default: 10 },
      },
    },
  })
  @ApiOkResponse({
    description: 'Performance test results',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              query: { type: 'object' },
              averageTime: { type: 'number' },
              minTime: { type: 'number' },
              maxTime: { type: 'number' },
              resultCount: { type: 'number' },
              success: { type: 'boolean' },
            },
          },
        },
        totalTime: { type: 'number' },
        successRate: { type: 'number' },
      },
    },
  })
  async testDiscoveryPerformance(@Body() body: { queries: DiscoveryQueryDto[]; iterations?: number }) {
    const iterations = body.iterations || 10;
    const results = [];
    let totalTime = 0;
    let successCount = 0;

    for (const query of body.queries) {
      const times: number[] = [];
      let lastResultCount = 0;
      let success = true;

      for (let i = 0; i < iterations; i++) {
        try {
          const startTime = Date.now();
          const result = await this.discoveryService.discoverAgents(query);
          const endTime = Date.now();
          
          times.push(endTime - startTime);
          lastResultCount = result.totalCount;
        } catch (error) {
          success = false;
          break;
        }
      }

      if (success) {
        successCount++;
        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        totalTime += averageTime;

        results.push({
          query,
          averageTime,
          minTime: Math.min(...times),
          maxTime: Math.max(...times),
          resultCount: lastResultCount,
          success: true,
        });
      } else {
        results.push({
          query,
          averageTime: 0,
          minTime: 0,
          maxTime: 0,
          resultCount: 0,
          success: false,
        });
      }
    }

    return {
      results,
      totalTime,
      successRate: successCount / body.queries.length,
    };
  }
}