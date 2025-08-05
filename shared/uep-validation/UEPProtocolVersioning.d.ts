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
export declare class ContentNegotiationEngine {
    private config;
    private performanceProfiles;
    constructor(config: ContentNegotiationConfig);
    /**
     * Parse UEP media type from string
     */
    parseMediaType(mediaTypeString: string): UEPMediaType | null;
    /**
     * Generate media type string from UEPMediaType
     */
    generateMediaType(mediaType: UEPMediaType): string;
    /**
     * Advertise client capabilities in Accept header format
     */
    advertiseCapabilities(supportedVersions: string[]): string;
    /**
     * Select optimal version based on client and server capabilities
     */
    selectOptimalVersion(clientCapabilities: string, serverCapabilities: string[], performanceRequirements?: PerformanceRequirements): VersionNegotiationResult;
    /**
     * Parse Accept header into UEP media types
     */
    private parseAcceptHeader;
    /**
     * Find exact version matches
     */
    private findExactMatches;
    /**
     * Find backward compatible versions
     */
    private findBackwardCompatible;
    /**
     * Find forward compatible versions
     */
    private findForwardCompatible;
    /**
     * Select optimal version from matches based on performance requirements
     */
    private selectOptimalFromMatches;
    /**
     * Calculate performance score for version selection
     */
    private calculatePerformanceScore;
    /**
     * Check if client version is backward compatible with server version
     */
    private isBackwardCompatible;
    /**
     * Check if client version is forward compatible with server version
     */
    private isForwardCompatible;
    /**
     * Compare two version strings
     */
    private compareVersions;
    /**
     * Get features available in a specific version
     */
    private getVersionFeatures;
    /**
     * Initialize performance profiles for each version
     */
    private initializePerformanceProfiles;
}
/**
 * UEP Versioning Middleware for Express.js
 */
export declare class UEPVersioningMiddleware {
    private negotiationEngine;
    constructor(config: ContentNegotiationConfig);
    /**
     * Middleware to negotiate version from Accept header
     */
    negotiateVersion(): (req: any, res: any, next: any) => any;
    /**
     * Middleware to transform request based on negotiated version
     */
    transformRequest(): (req: any, res: any, next: any) => void;
    /**
     * Middleware to require specific version
     */
    requireVersion(requiredVersion: string): (req: any, res: any, next: any) => any;
}
/**
 * UEP Versioning Client for making version-aware requests
 */
export declare class UEPVersioningClient {
    private negotiationEngine;
    private config;
    constructor(config: ContentNegotiationConfig);
    /**
     * Make a version-aware HTTP request
     */
    request(url: string, options?: any): Promise<any>;
}
//# sourceMappingURL=UEPProtocolVersioning.d.ts.map