/**
 * Registry Data Transfer Objects
 * 
 * DTOs for UEP agent registration, updates, and responses.
 * Includes validation decorators and type definitions.
 */

import { 
  IsString, 
  IsArray, 
  IsObject, 
  IsOptional, 
  IsEnum, 
  IsUrl, 
  IsNumber, 
  IsBoolean,
  IsDate,
  ValidateNested,
  ArrayNotEmpty,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Agent Types
 */
export enum AgentType {
  META = 'meta',
  DOMAIN = 'domain',
  SYSTEM = 'system',
}

/**
 * Health Status Types
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown',
}

/**
 * Agent Capability DTO
 */
export class AgentCapabilityDto {
  @ApiProperty({ description: 'Capability name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Capability version' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  version?: string;

  @ApiPropertyOptional({ description: 'Capability description' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'Schema URL for capability validation' })
  @IsOptional()
  @IsUrl()
  schemaUrl?: string;

  @ApiPropertyOptional({ description: 'Endpoint path for capability' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Request timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({ description: 'Rate limit per minute' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Additional capability metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Agent Registration DTO
 */
export class AgentRegistrationDto {
  @ApiProperty({ description: 'Unique agent identifier' })
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-zA-Z0-9\-_]+$/, { message: 'Agent ID must contain only alphanumeric characters, hyphens, and underscores' })
  id: string;

  @ApiProperty({ description: 'Human-readable agent name' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiProperty({ description: 'Agent version' })
  @IsString()
  @Length(1, 50)
  @Matches(/^\d+\.\d+\.\d+(-[a-zA-Z0-9\-]+)?$/, { message: 'Version must follow semantic versioning (e.g., 1.0.0)' })
  version: string;

  @ApiProperty({ description: 'Agent type', enum: AgentType })
  @IsEnum(AgentType)
  type: AgentType;

  @ApiProperty({ description: 'UEP protocol version supported' })
  @IsString()
  @Length(1, 20)
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'UEP version must follow semantic versioning (e.g., 1.2.0)' })
  uepVersion: string;

  @ApiPropertyOptional({ description: 'Agent description' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @ApiProperty({ description: 'Agent capabilities', type: [AgentCapabilityDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AgentCapabilityDto)
  capabilities: AgentCapabilityDto[];

  @ApiPropertyOptional({ description: 'Health check endpoint URL' })
  @IsOptional()
  @IsUrl()
  healthEndpoint?: string;

  @ApiPropertyOptional({ description: 'Metrics endpoint URL' })
  @IsOptional()
  @IsUrl()
  metricsEndpoint?: string;

  @ApiPropertyOptional({ description: 'Agent tags for discovery' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Network endpoints for agent communication' })
  @IsOptional()
  @IsObject()
  endpoints?: {
    http?: string;
    grpc?: string;
    websocket?: string;
  };

  @ApiPropertyOptional({ description: 'Resource requirements and limits' })
  @IsOptional()
  @IsObject()
  resources?: {
    memory?: string;
    cpu?: string;
    storage?: string;
  };

  @ApiPropertyOptional({ description: 'Additional agent metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Agent Update DTO
 */
export class AgentUpdateDto {
  @ApiPropertyOptional({ description: 'Updated agent name' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ description: 'Updated agent version' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^\d+\.\d+\.\d+(-[a-zA-Z0-9\-]+)?$/, { message: 'Version must follow semantic versioning' })
  version?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Updated capabilities', type: [AgentCapabilityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentCapabilityDto)
  capabilities?: AgentCapabilityDto[];

  @ApiPropertyOptional({ description: 'Updated health endpoint' })
  @IsOptional()
  @IsUrl()
  healthEndpoint?: string;

  @ApiPropertyOptional({ description: 'Updated metrics endpoint' })
  @IsOptional()
  @IsUrl()
  metricsEndpoint?: string;

  @ApiPropertyOptional({ description: 'Updated tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Updated endpoints' })
  @IsOptional()
  @IsObject()
  endpoints?: {
    http?: string;
    grpc?: string;
    websocket?: string;
  };

  @ApiPropertyOptional({ description: 'Updated resource requirements' })
  @IsOptional()
  @IsObject()
  resources?: {
    memory?: string;
    cpu?: string;
    storage?: string;
  };

  @ApiPropertyOptional({ description: 'Updated metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Agent Health Status DTO
 */
export class AgentHealthStatus {
  @ApiProperty({ description: 'Current health status', enum: HealthStatus })
  @IsEnum(HealthStatus)
  status: HealthStatus;

  @ApiPropertyOptional({ description: 'Health check response time in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  responseTime?: number;

  @ApiPropertyOptional({ description: 'Consecutive health check failures' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consecutiveFailures?: number;

  @ApiPropertyOptional({ description: 'Last health check timestamp' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastChecked?: Date;

  @ApiPropertyOptional({ description: 'Health check message or error details' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  message?: string;

  @ApiPropertyOptional({ description: 'Additional health metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Registered Agent (Full object stored in registry)
 */
export class RegisteredAgent extends AgentRegistrationDto {
  @ApiProperty({ description: 'Registration timestamp' })
  @IsDate()
  @Type(() => Date)
  registeredAt: Date;

  @ApiProperty({ description: 'Last heartbeat timestamp' })
  @IsDate()
  @Type(() => Date)
  lastHeartbeat: Date;

  @ApiProperty({ description: 'Current health status' })
  @ValidateNested()
  @Type(() => AgentHealthStatus)
  health: AgentHealthStatus;

  @ApiProperty({ description: 'Registry metadata' })
  @IsObject()
  metadata: Record<string, any> & {
    registryVersion: string;
    lastUpdated: Date;
  };
}

/**
 * Registration Response DTO
 */
export class RegistrationResponse {
  @ApiProperty({ description: 'Registration success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Registered agent ID' })
  @IsString()
  agentId: string;

  @ApiPropertyOptional({ description: 'etcd lease ID for TTL management' })
  @IsOptional()
  @IsNumber()
  leaseId?: number;

  @ApiProperty({ description: 'Registration TTL in seconds' })
  @IsNumber()
  ttl: number;

  @ApiProperty({ description: 'Registration success message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Registration timestamp' })
  @IsDate()
  @Type(() => Date)
  registeredAt: Date;

  @ApiProperty({ description: 'Recommended heartbeat interval in seconds' })
  @IsNumber()
  heartbeatInterval: number;
}

/**
 * Deregistration Response DTO
 */
export class DeregistrationResponse {
  @ApiProperty({ description: 'Deregistration success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Deregistered agent ID' })
  @IsString()
  agentId: string;

  @ApiProperty({ description: 'Deregistration success message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Deregistration timestamp' })
  @IsDate()
  @Type(() => Date)
  deregisteredAt: Date;

  @ApiProperty({ description: 'Deregistration reason' })
  @IsString()
  reason: string;
}

/**
 * Heartbeat Request DTO
 */
export class HeartbeatRequestDto {
  @ApiProperty({ description: 'Agent ID sending heartbeat' })
  @IsString()
  @Length(1, 100)
  agentId: string;

  @ApiPropertyOptional({ description: 'Optional health status update' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AgentHealthStatus)
  health?: AgentHealthStatus;

  @ApiPropertyOptional({ description: 'Optional metadata update' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Heartbeat Response DTO
 */
export class HeartbeatResponse {
  @ApiProperty({ description: 'Heartbeat success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Remaining TTL in seconds' })
  @IsNumber()
  ttl: number;

  @ApiPropertyOptional({ description: 'Server message or instructions' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Next heartbeat recommended time' })
  @IsDate()
  @Type(() => Date)
  nextHeartbeat: Date;
}

/**
 * Registry Statistics DTO
 */
export class RegistryStatistics {
  @ApiProperty({ description: 'Total number of registered agents' })
  @IsNumber()
  totalAgents: number;

  @ApiProperty({ description: 'Number of agents by type' })
  @IsObject()
  agentsByType: Record<string, number>;

  @ApiProperty({ description: 'Number of healthy agents' })
  @IsNumber()
  healthyAgents: number;

  @ApiProperty({ description: 'Number of unhealthy agents' })
  @IsNumber()
  unhealthyAgents: number;

  @ApiProperty({ description: 'Average health check response time' })
  @IsNumber()
  averageResponseTime: number;

  @ApiProperty({ description: 'Registry uptime in seconds' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ description: 'Statistics generation timestamp' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}