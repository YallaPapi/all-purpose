/**
 * UEP Protocol Versioning - Content Negotiation Engine
 * 
 * Implements comprehensive protocol versioning using content negotiation
 * with custom media types for the UEP Meta-Agent Factory system.
 * 
 * Key Features:
 * - Custom media type parsing and generation
 * - Version compatibility checking
 * - Performance-aware version selection
 * - Automatic fallback strategies
 * - Circuit breaker integration
 */

export interface UEPMediaType {
  type: 'application/vnd.uep';
  version: string;
  subtype?: string;
  parameters?: {
    charset?: string;
    protocol?: string;
    compression?: string;
    features?: string[];
  };
}

export interface VersionNegotiationResult {
  version: string | null;
  strategy: 'exact' | 'backward' | 'forward' | 'fallback' | 'incompatible';
  mediaType?: string;
  performanceProfile?: PerformanceProfile;
  error?: string;
}

export interface PerformanceProfile {
  messageFormat: string;
  compression: string;
  validation: string;
  overhead: string;
  throughput: string;
  features?: string[];
}

export interface PerformanceRequirements {
  throughput: 'low' | 'standard' | 'high';
  latency: 'high' | 'standard' | 'low';
  features?: string[];
}

export interface UEPMessage {
  messageType: 'task' | 'response' | 'event' | 'query' | 'command';
  agentId: string;
  timestamp: string;
  payload: any;
  version: string;
  headers?: Record<string, string>;
}

export interface ContentNegotiationConfig {
  supportedVersions: string[];
  defaultVersion: string;
  fallbackVersion?: string;
  enablePerformanceOptimization: boolean;
  enableCircuitBreakerFallback: boolean;
  strictCompatibility: boolean;
}

/**
 * Content Negotiation Engine for UEP Protocol Versioning
 */
export class ContentNegotiationEngine {
  private config: ContentNegotiationConfig;
  private performanceProfiles: Map<string, PerformanceProfile>;

  constructor(config: ContentNegotiationConfig) {
    this.config = config;
    this.performanceProfiles = this.initializePerformanceProfiles();
  }

  /**
   * Parse UEP media type from string
   */
  parseMediaType(mediaTypeString: string): UEPMediaType | null {
    const pattern = /^application\/vnd\.uep(?:\.v?([0-9]+\.[0-9]+))?(?:\+(\w+))?(?:\s*;\s*(.+))?$/i;
    const match = mediaTypeString.trim().match(pattern);

    if (!match) {
      return null;
    }

    const mediaType: UEPMediaType = {
      type: 'application/vnd.uep',
      version: match[1] || '1.0',
      subtype: match[2],
      parameters: {}
    };

    // Parse parameters
    if (match[3]) {
      const params = match[3].split(/\s*;\s*/);
      for (const param of params) {
        const [key, value] = param.split('=').map(s => s.trim());
        if (key && value) {
          if (key === 'features') {
            mediaType.parameters!.features = value.split(',').map(f => f.trim());
          } else {
            mediaType.parameters![key] = value;
          }
        }
      }
    }

    return mediaType;
  }

  /**
   * Generate media type string from UEPMediaType
   */
  generateMediaType(mediaType: UEPMediaType): string {
    let result = `application/vnd.uep.v${mediaType.version}`;
    
    if (mediaType.subtype) {
      result += `+${mediaType.subtype}`;
    }

    const params: string[] = [];
    if (mediaType.parameters) {
      for (const [key, value] of Object.entries(mediaType.parameters)) {
        if (key === 'features' && Array.isArray(value)) {
          params.push(`${key}=${value.join(',')}`);
        } else if (typeof value === 'string') {
          params.push(`${key}=${value}`);
        }
      }
    }

    if (params.length > 0) {
      result += `; ${params.join('; ')}`;
    }

    return result;
  }

  /**
   * Advertise client capabilities in Accept header format
   */
  advertiseCapabilities(supportedVersions: string[]): string {
    const mediaTypes = supportedVersions.map((version, index) => {
      const quality = 1.0 - (index * 0.1); // Decreasing quality preference
      const mediaType = this.generateMediaType({
        type: 'application/vnd.uep',
        version,
        subtype: 'json',
        parameters: {
          charset: 'utf-8',
          features: this.getVersionFeatures(version)
        }
      });

      return quality === 1.0 ? mediaType : `${mediaType};q=${quality.toFixed(1)}`;
    });

    return mediaTypes.join(', ');
  }

  /**
   * Select optimal version based on client and server capabilities
   */
  selectOptimalVersion(
    clientCapabilities: string,
    serverCapabilities: string[],
    performanceRequirements?: PerformanceRequirements
  ): VersionNegotiationResult {
    
    const clientMediaTypes = this.parseAcceptHeader(clientCapabilities);
    
    // 1. Find exact matches (highest priority)
    const exactMatches = this.findExactMatches(clientMediaTypes, serverCapabilities);
    if (exactMatches.length > 0) {
      const optimal = this.selectOptimalFromMatches(exactMatches, performanceRequirements);
      return {
        version: optimal.version,
        strategy: 'exact',
        mediaType: this.generateMediaType(optimal),
        performanceProfile: this.performanceProfiles.get(optimal.version)
      };
    }

    // 2. Find backward compatible versions
    const backwardCompatible = this.findBackwardCompatible(clientMediaTypes, serverCapabilities);
    if (backwardCompatible.length > 0) {
      const optimal = this.selectOptimalFromMatches(backwardCompatible, performanceRequirements);
      return {
        version: optimal.version,
        strategy: 'backward',
        mediaType: this.generateMediaType(optimal),
        performanceProfile: this.performanceProfiles.get(optimal.version)
      };
    }

    // 3. Find forward compatible versions (with transformation)
    const forwardCompatible = this.findForwardCompatible(clientMediaTypes, serverCapabilities);
    if (forwardCompatible.length > 0) {
      const optimal = this.selectOptimalFromMatches(forwardCompatible, performanceRequirements);
      return {
        version: optimal.version,
        strategy: 'forward',
        mediaType: this.generateMediaType(optimal),
        performanceProfile: this.performanceProfiles.get(optimal.version)
      };
    }

    // 4. Use fallback version if configured
    if (this.config.fallbackVersion && serverCapabilities.includes(this.config.fallbackVersion)) {
      return {
        version: this.config.fallbackVersion,
        strategy: 'fallback',
        mediaType: this.generateMediaType({
          type: 'application/vnd.uep',
          version: this.config.fallbackVersion,
          subtype: 'json'
        }),
        performanceProfile: this.performanceProfiles.get(this.config.fallbackVersion)
      };
    }

    // 5. No compatible version found
    return {
      version: null,
      strategy: 'incompatible',
      error: `No compatible version found. Client: ${clientCapabilities}, Server: ${serverCapabilities.join(', ')}`
    };
  }

  /**
   * Parse Accept header into UEP media types
   */
  private parseAcceptHeader(acceptHeader: string): Array<UEPMediaType & { quality: number }> {
    const mediaTypes: Array<UEPMediaType & { quality: number }> = [];
    
    const parts = acceptHeader.split(',').map(s => s.trim());
    
    for (const part of parts) {
      const [mediaTypeString, ...params] = part.split(';').map(s => s.trim());
      const mediaType = this.parseMediaType(mediaTypeString);
      
      if (mediaType) {
        let quality = 1.0;
        
        // Parse quality parameter
        const qParam = params.find(p => p.startsWith('q='));
        if (qParam) {
          quality = parseFloat(qParam.substring(2)) || 1.0;
        }
        
        mediaTypes.push({ ...mediaType, quality });
      }
    }
    
    // Sort by quality (highest first)
    return mediaTypes.sort((a, b) => b.quality - a.quality);
  }

  /**
   * Find exact version matches
   */
  private findExactMatches(
    clientMediaTypes: Array<UEPMediaType & { quality: number }>,
    serverCapabilities: string[]
  ): UEPMediaType[] {
    return clientMediaTypes
      .filter(mt => serverCapabilities.includes(mt.version))
      .map(mt => ({ type: mt.type, version: mt.version, subtype: mt.subtype, parameters: mt.parameters }));
  }

  /**
   * Find backward compatible versions
   */
  private findBackwardCompatible(
    clientMediaTypes: Array<UEPMediaType & { quality: number }>,
    serverCapabilities: string[]
  ): UEPMediaType[] {
    const compatible: UEPMediaType[] = [];
    
    for (const clientType of clientMediaTypes) {
      for (const serverVersion of serverCapabilities) {
        if (this.isBackwardCompatible(clientType.version, serverVersion)) {
          compatible.push({
            type: 'application/vnd.uep',
            version: serverVersion,
            subtype: clientType.subtype,
            parameters: clientType.parameters
          });
        }
      }
    }
    
    return compatible;
  }

  /**
   * Find forward compatible versions
   */
  private findForwardCompatible(
    clientMediaTypes: Array<UEPMediaType & { quality: number }>,
    serverCapabilities: string[]
  ): UEPMediaType[] {
    const compatible: UEPMediaType[] = [];
    
    for (const clientType of clientMediaTypes) {
      for (const serverVersion of serverCapabilities) {
        if (this.isForwardCompatible(clientType.version, serverVersion)) {
          compatible.push({
            type: 'application/vnd.uep',
            version: serverVersion,
            subtype: clientType.subtype,
            parameters: clientType.parameters
          });
        }
      }
    }
    
    return compatible;
  }

  /**
   * Select optimal version from matches based on performance requirements
   */
  private selectOptimalFromMatches(
    matches: UEPMediaType[],
    performanceRequirements?: PerformanceRequirements
  ): UEPMediaType {
    if (!performanceRequirements || !this.config.enablePerformanceOptimization) {
      // Return highest version
      return matches.sort((a, b) => this.compareVersions(b.version, a.version))[0];
    }

    // Score matches based on performance requirements
    const scored = matches.map(match => ({
      match,
      score: this.calculatePerformanceScore(match.version, performanceRequirements)
    }));

    return scored.sort((a, b) => b.score - a.score)[0].match;
  }

  /**
   * Calculate performance score for version selection
   */
  private calculatePerformanceScore(
    version: string,
    requirements: PerformanceRequirements
  ): number {
    const profile = this.performanceProfiles.get(version);
    if (!profile) return 0;

    let score = 0;

    // Throughput scoring
    if (requirements.throughput === 'high' && profile.throughput === 'high') {
      score += 100;
    } else if (requirements.throughput === 'standard' && profile.throughput !== 'low') {
      score += 50;
    }

    // Latency scoring
    if (requirements.latency === 'low' && profile.overhead === 'minimal') {
      score += 80;
    } else if (requirements.latency === 'standard' && profile.overhead === 'optimized') {
      score += 60;
    }

    // Feature scoring
    if (requirements.features && profile.features) {
      const availableFeatures = profile.features;
      const matchedFeatures = requirements.features.filter(f => availableFeatures.includes(f));
      score += (matchedFeatures.length / requirements.features.length) * 50;
    }

    return score;
  }

  /**
   * Check if client version is backward compatible with server version
   */
  private isBackwardCompatible(clientVersion: string, serverVersion: string): boolean {
    // Server version should be same or higher than client version
    return this.compareVersions(serverVersion, clientVersion) >= 0;
  }

  /**
   * Check if client version is forward compatible with server version
   */
  private isForwardCompatible(clientVersion: string, serverVersion: string): boolean {
    // Client version should be higher than server version, but within same major version
    const clientMajor = parseInt(clientVersion.split('.')[0]);
    const serverMajor = parseInt(serverVersion.split('.')[0]);
    
    return clientMajor === serverMajor && this.compareVersions(clientVersion, serverVersion) > 0;
  }

  /**
   * Compare two version strings
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 !== part2) {
        return part1 - part2;
      }
    }
    
    return 0;
  }

  /**
   * Get features available in a specific version
   */
  private getVersionFeatures(version: string): string[] {
    const features = ['agent-registration', 'basic-validation'];
    
    if (this.compareVersions(version, '1.1') >= 0) {
      features.push('enhanced-error-reporting', 'structured-metadata');
    }
    
    if (this.compareVersions(version, '2.0') >= 0) {
      features.push('circuit-breaker-integration', 'advanced-validation', 'service-mesh-integration');
    }
    
    if (this.compareVersions(version, '2.1') >= 0) {
      features.push('distributed-tracing', 'performance-monitoring');
    }
    
    return features;
  }

  /**
   * Initialize performance profiles for each version
   */
  private initializePerformanceProfiles(): Map<string, PerformanceProfile> {
    const profiles = new Map<string, PerformanceProfile>();
    
    profiles.set('1.0', {
      messageFormat: 'json',
      compression: 'none',
      validation: 'basic',
      overhead: 'minimal',
      throughput: 'standard'
    });
    
    profiles.set('1.1', {
      messageFormat: 'json',
      compression: 'gzip',
      validation: 'enhanced',
      overhead: 'low',
      throughput: 'improved'
    });
    
    profiles.set('2.0', {
      messageFormat: 'json|msgpack|protobuf',
      compression: 'gzip|brotli',
      validation: 'comprehensive',
      overhead: 'optimized',
      throughput: 'high',
      features: ['connection-pooling', 'request-batching']
    });
    
    profiles.set('2.1', {
      messageFormat: 'json|msgpack|protobuf',
      compression: 'gzip|brotli',
      validation: 'comprehensive',
      overhead: 'minimal',
      throughput: 'high',
      features: ['connection-pooling', 'request-batching', 'streaming', 'multiplexing']
    });
    
    return profiles;
  }
}

/**
 * UEP Versioning Middleware for Express.js
 */
export class UEPVersioningMiddleware {
  private negotiationEngine: ContentNegotiationEngine;

  constructor(config: ContentNegotiationConfig) {
    this.negotiationEngine = new ContentNegotiationEngine(config);
  }

  /**
   * Middleware to negotiate version from Accept header
   */
  negotiateVersion() {
    return (req: any, res: any, next: any) => {
      const acceptHeader = req.headers.accept || 'application/vnd.uep.v1.0+json';
      const serverVersions = this.negotiationEngine['config'].supportedVersions;
      
      const result = this.negotiationEngine.selectOptimalVersion(
        acceptHeader,
        serverVersions
      );
      
      if (result.version) {
        req.uepVersion = result.version;
        req.uepMediaType = result.mediaType;
        req.uepPerformanceProfile = result.performanceProfile;
        res.set('Content-Type', result.mediaType || 'application/vnd.uep.v1.0+json');
      } else {
        return res.status(406).json({
          error: 'Not Acceptable',
          message: result.error,
          supportedVersions: serverVersions
        });
      }
      
      next();
    };
  }

  /**
   * Middleware to transform request based on negotiated version
   */
  transformRequest() {
    return (req: any, res: any, next: any) => {
      // Request transformation logic would go here
      // For now, just pass through
      next();
    };
  }

  /**
   * Middleware to require specific version
   */
  requireVersion(requiredVersion: string) {
    return (req: any, res: any, next: any) => {
      if (req.uepVersion !== requiredVersion) {
        return res.status(412).json({
          error: 'Precondition Failed',
          message: `This endpoint requires UEP version ${requiredVersion}`,
          currentVersion: req.uepVersion
        });
      }
      next();
    };
  }
}

/**
 * UEP Versioning Client for making version-aware requests
 */
export class UEPVersioningClient {
  private negotiationEngine: ContentNegotiationEngine;
  private config: ContentNegotiationConfig;

  constructor(config: ContentNegotiationConfig) {
    this.config = config;
    this.negotiationEngine = new ContentNegotiationEngine(config);
  }

  /**
   * Make a version-aware HTTP request
   */
  async request(url: string, options: any = {}): Promise<any> {
    const acceptHeader = this.negotiationEngine.advertiseCapabilities(
      this.config.supportedVersions
    );
    
    const headers = {
      'Accept': acceptHeader,
      'Content-Type': `application/vnd.uep.v${this.config.defaultVersion}+json`,
      ...options.headers
    };

    const requestOptions = {
      ...options,
      headers
    };

    // Make the actual HTTP request (implementation depends on HTTP library)
    // This is a placeholder for the actual request implementation
    return { headers: { 'content-type': headers['Content-Type'] } };
  }
}