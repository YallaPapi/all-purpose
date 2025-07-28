/**
 * Registry Validation Service
 * 
 * Validates agent registration data, UEP protocol compatibility,
 * and business rules for registry operations.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentRegistrationDto, AgentUpdateDto, AgentType } from './dto/registry.dto';
import * as semver from 'semver';

@Injectable()
export class RegistryValidationService {
  private readonly logger = new Logger(RegistryValidationService.name);
  private readonly supportedUepVersions: string[];
  private readonly maxCapabilities: number;
  private readonly maxTagsPerAgent: number;
  private readonly reservedAgentIds: Set<string>;

  constructor(private readonly configService: ConfigService) {
    this.supportedUepVersions = ['1.0.0', '1.1.0', '1.2.0'];
    this.maxCapabilities = 50;
    this.maxTagsPerAgent = 20;
    this.reservedAgentIds = new Set([
      'registry',
      'discovery',
      'health',
      'system',
      'admin',
      'metrics',
      'monitoring',
    ]);
  }

  /**
   * Validate agent registration data
   */
  async validateRegistration(registration: AgentRegistrationDto): Promise<void> {
    this.logger.debug(`Validating registration for agent: ${registration.id}`);

    // Validate agent ID
    this.validateAgentId(registration.id);

    // Validate UEP protocol version
    this.validateUepVersion(registration.uepVersion);

    // Validate agent type and capabilities compatibility  
    this.validateAgentTypeCapabilities(registration.type, registration.capabilities);

    // Validate capabilities
    this.validateCapabilities(registration.capabilities);

    // Validate endpoints
    if (registration.endpoints) {
      this.validateEndpoints(registration.endpoints);
    }

    // Validate resource requirements
    if (registration.resources) {
      this.validateResources(registration.resources);
    }

    // Validate tags
    if (registration.tags) {
      this.validateTags(registration.tags);
    }

    // Validate metadata size
    if (registration.metadata) {
      this.validateMetadataSize(registration.metadata);
    }

    this.logger.debug(`Registration validation passed for agent: ${registration.id}`);
  }

  /**
   * Validate agent update data
   */
  async validateUpdate(update: AgentUpdateDto): Promise<void> {
    this.logger.debug('Validating agent update data');

    // Validate capabilities if provided
    if (update.capabilities) {
      this.validateCapabilities(update.capabilities);
    }

    // Validate endpoints if provided
    if (update.endpoints) {
      this.validateEndpoints(update.endpoints);
    }

    // Validate resource requirements if provided
    if (update.resources) {
      this.validateResources(update.resources);
    }

    // Validate tags if provided
    if (update.tags) {
      this.validateTags(update.tags);
    }

    // Validate metadata size if provided
    if (update.metadata) {
      this.validateMetadataSize(update.metadata);
    }

    this.logger.debug('Agent update validation passed');
  }

  /**
   * Validate agent ID
   */
  private validateAgentId(agentId: string): void {
    // Check if agent ID is reserved
    if (this.reservedAgentIds.has(agentId.toLowerCase())) {
      throw new BadRequestException(`Agent ID '${agentId}' is reserved and cannot be used`);
    }

    // Validate length
    if (agentId.length < 3 || agentId.length > 100) {
      throw new BadRequestException('Agent ID must be between 3 and 100 characters');
    }

    // Validate format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9\-_]+$/.test(agentId)) {
      throw new BadRequestException('Agent ID must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Must start with letter or number
    if (!/^[a-zA-Z0-9]/.test(agentId)) {
      throw new BadRequestException('Agent ID must start with a letter or number');
    }

    // Must end with letter or number
    if (!/[a-zA-Z0-9]$/.test(agentId)) {
      throw new BadRequestException('Agent ID must end with a letter or number');
    }

    // Cannot have consecutive special characters
    if (/[-_]{2,}/.test(agentId)) {
      throw new BadRequestException('Agent ID cannot have consecutive hyphens or underscores');
    }
  }

  /**
   * Validate UEP protocol version
   */
  private validateUepVersion(uepVersion: string): void {
    // Check if version is supported
    const isSupported = this.supportedUepVersions.some(supportedVersion => 
      semver.satisfies(uepVersion, `^${supportedVersion}`)
    );

    if (!isSupported) {
      throw new BadRequestException(
        `UEP version '${uepVersion}' is not supported. Supported versions: ${this.supportedUepVersions.join(', ')}`
      );
    }

    // Check if version is valid semver
    if (!semver.valid(uepVersion)) {
      throw new BadRequestException(`UEP version '${uepVersion}' is not a valid semantic version`);
    }
  }

  /**
   * Validate agent type and capabilities compatibility
   */
  private validateAgentTypeCapabilities(type: AgentType, capabilities: any[]): void {
    // Define type-specific capability restrictions
    const typeCapabilityRules = {
      [AgentType.META]: {
        allowedPrefixes: ['orchestrate', 'coordinate', 'manage', 'monitor'],
        forbiddenPrefixes: ['execute', 'process-data', 'transform'],
        maxCapabilities: 20,
      },
      [AgentType.DOMAIN]: {
        allowedPrefixes: ['process', 'transform', 'analyze', 'execute', 'generate'],
        forbiddenPrefixes: ['orchestrate', 'coordinate'],
        maxCapabilities: 30,
      },
      [AgentType.SYSTEM]: {
        allowedPrefixes: ['monitor', 'log', 'health', 'metrics', 'backup'],
        forbiddenPrefixes: ['process-business', 'generate-content'],
        maxCapabilities: 15,
      },
    };

    const rules = typeCapabilityRules[type];
    if (!rules) {
      throw new BadRequestException(`Unknown agent type: ${type}`);
    }

    // Check capability count
    if (capabilities.length > rules.maxCapabilities) {
      throw new BadRequestException(
        `Agent type '${type}' cannot have more than ${rules.maxCapabilities} capabilities`
      );
    }

    // Validate capability names against type rules
    for (const capability of capabilities) {
      const capabilityName = capability.name.toLowerCase();

      // Check if capability name starts with allowed prefix
      const hasAllowedPrefix = rules.allowedPrefixes.some(prefix => 
        capabilityName.startsWith(prefix.toLowerCase())
      );

      // Check if capability name starts with forbidden prefix
      const hasForbiddenPrefix = rules.forbiddenPrefixes.some(prefix =>
        capabilityName.startsWith(prefix.toLowerCase())
      );

      if (hasForbiddenPrefix) {
        throw new BadRequestException(
          `Capability '${capability.name}' is not allowed for agent type '${type}'. ` +
          `Forbidden prefixes: ${rules.forbiddenPrefixes.join(', ')}`
        );
      }

      // For stricter validation, uncomment this to require allowed prefixes
      // if (!hasAllowedPrefix) {
      //   throw new BadRequestException(
      //     `Capability '${capability.name}' does not match allowed patterns for agent type '${type}'. ` +
      //     `Allowed prefixes: ${rules.allowedPrefixes.join(', ')}`
      //   );
      // }
    }
  }

  /**
   * Validate capabilities array
   */
  private validateCapabilities(capabilities: any[]): void {
    if (capabilities.length === 0) {
      throw new BadRequestException('Agent must have at least one capability');
    }

    if (capabilities.length > this.maxCapabilities) {
      throw new BadRequestException(`Agent cannot have more than ${this.maxCapabilities} capabilities`);
    }

    const capabilityNames = new Set<string>();

    for (const capability of capabilities) {
      // Check for duplicate capability names
      if (capabilityNames.has(capability.name)) {
        throw new BadRequestException(`Duplicate capability name: ${capability.name}`);
      }
      capabilityNames.add(capability.name);

      // Validate capability name format
      if (!/^[a-zA-Z0-9\-_]+$/.test(capability.name)) {
        throw new BadRequestException(
          `Capability name '${capability.name}' must contain only alphanumeric characters, hyphens, and underscores`
        );
      }

      // Validate timeout if provided
      if (capability.timeout !== undefined) {
        if (capability.timeout < 100 || capability.timeout > 300000) {
          throw new BadRequestException(
            `Capability '${capability.name}' timeout must be between 100ms and 300000ms (5 minutes)`
          );
        }
      }

      // Validate rate limit if provided
      if (capability.rateLimit !== undefined) {
        if (capability.rateLimit < 1 || capability.rateLimit > 10000) {
          throw new BadRequestException(
            `Capability '${capability.name}' rate limit must be between 1 and 10000 requests per minute`
          );
        }
      }

      // Validate schema URL if provided
      if (capability.schemaUrl) {
        try {
          new URL(capability.schemaUrl);
        } catch {
          throw new BadRequestException(
            `Capability '${capability.name}' has invalid schema URL`
          );
        }
      }
    }
  }

  /**
   * Validate network endpoints
   */
  private validateEndpoints(endpoints: any): void {
    const allowedProtocols = ['http:', 'https:', 'grpc:', 'ws:', 'wss:'];

    for (const [protocol, url] of Object.entries(endpoints)) {
      if (typeof url !== 'string') {
        continue;
      }

      try {
        const parsedUrl = new URL(url as string);
        
        // Check if protocol is allowed
        if (!allowedProtocols.includes(parsedUrl.protocol)) {
          throw new BadRequestException(
            `Endpoint protocol '${parsedUrl.protocol}' is not allowed. ` +
            `Allowed protocols: ${allowedProtocols.join(', ')}`
          );
        }

        // Validate port range
        if (parsedUrl.port) {
          const port = parseInt(parsedUrl.port);
          if (port < 1024 || port > 65535) {
            throw new BadRequestException(
              `Endpoint port ${port} is not in allowed range (1024-65535)`
            );
          }
        }

      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(`Invalid endpoint URL for ${protocol}: ${url}`);
      }
    }
  }

  /**
   * Validate resource requirements
   */
  private validateResources(resources: any): void {
    // Validate memory format (e.g., "256Mi", "1Gi")
    if (resources.memory) {
      if (!/^\d+[KMGT]i?$/.test(resources.memory)) {
        throw new BadRequestException(
          'Memory resource must be in format like "256Mi", "1Gi", "512M", etc.'
        );
      }
    }

    // Validate CPU format (e.g., "0.5", "1", "2000m")  
    if (resources.cpu) {
      if (!/^\d+(\.\d+)?$|^\d+m$/.test(resources.cpu)) {
        throw new BadRequestException(
          'CPU resource must be in format like "0.5", "1", "1000m", etc.'
        );
      }
    }

    // Validate storage format (e.g., "1Gi", "500Mi")
    if (resources.storage) {
      if (!/^\d+[KMGT]i?$/.test(resources.storage)) {
        throw new BadRequestException(
          'Storage resource must be in format like "1Gi", "500Mi", "10G", etc.'
        );
      }
    }
  }

  /**
   * Validate tags array
   */
  private validateTags(tags: string[]): void {
    if (tags.length > this.maxTagsPerAgent) {
      throw new BadRequestException(`Agent cannot have more than ${this.maxTagsPerAgent} tags`);
    }

    const uniqueTags = new Set<string>();

    for (const tag of tags) {
      // Check for empty or whitespace-only tags
      if (!tag.trim()) {
        throw new BadRequestException('Tags cannot be empty or contain only whitespace');
      }

      // Check tag length
      if (tag.length > 50) {
        throw new BadRequestException('Tag length cannot exceed 50 characters');
      }

      // Check for duplicate tags
      const normalizedTag = tag.toLowerCase().trim();
      if (uniqueTags.has(normalizedTag)) {
        throw new BadRequestException(`Duplicate tag: ${tag}`);
      }
      uniqueTags.add(normalizedTag);

      // Validate tag format (alphanumeric, hyphens, underscores, dots)
      if (!/^[a-zA-Z0-9\-_.]+$/.test(tag)) {
        throw new BadRequestException(
          `Tag '${tag}' must contain only alphanumeric characters, hyphens, underscores, and dots`
        );
      }
    }
  }

  /**
   * Validate metadata size
   */
  private validateMetadataSize(metadata: Record<string, any>): void {
    const metadataString = JSON.stringify(metadata);
    const metadataSizeBytes = Buffer.byteLength(metadataString, 'utf8');
    const maxSizeBytes = 64 * 1024; // 64KB

    if (metadataSizeBytes > maxSizeBytes) {
      throw new BadRequestException(
        `Metadata size (${metadataSizeBytes} bytes) exceeds maximum allowed size (${maxSizeBytes} bytes)`
      );
    }

    // Check for deeply nested objects (max 5 levels)
    const maxDepth = 5;
    const depth = this.getObjectDepth(metadata);
    if (depth > maxDepth) {
      throw new BadRequestException(
        `Metadata nesting depth (${depth}) exceeds maximum allowed depth (${maxDepth})`
      );
    }
  }

  /**
   * Calculate object nesting depth
   */
  private getObjectDepth(obj: any, currentDepth: number = 1): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        const depth = this.getObjectDepth(value, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  /**
   * Check if UEP versions are compatible
   */
  isUepVersionCompatible(clientVersion: string, requiredVersion: string): boolean {
    try {
      return semver.satisfies(clientVersion, `^${requiredVersion}`);
    } catch {
      return false;
    }
  }

  /**
   * Get supported UEP versions
   */
  getSupportedUepVersions(): string[] {
    return [...this.supportedUepVersions];
  }
}