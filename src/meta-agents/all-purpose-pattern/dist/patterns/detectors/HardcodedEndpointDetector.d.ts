/**
 * Hardcoded Endpoint Detector
 *
 * Detects hardcoded URLs, API endpoints, and service endpoints that create limitations
 * Following All-Purpose Pattern: Identifies ANY hardcoded service dependencies
 * Context7-enhanced with intelligent endpoint pattern recognition
 */
import { Node } from '@babel/types';
import { NodePath } from '@babel/traverse';
import { BasePatternDetector, DetectionResult, DetectionContext, PatternDetectorConfig } from '../types';
export interface HardcodedEndpointDetectorConfig extends PatternDetectorConfig {
    endpointPatterns?: RegExp[];
    excludePatterns?: RegExp[];
    includeLocalhost?: boolean;
    includeRelativePaths?: boolean;
    checkVariableNames?: boolean;
    minimumSuspicionScore?: number;
    protocolWhitelist?: string[];
}
/**
 * Detects hardcoded endpoints that impose service limitations
 * Examples: 'https://api.stripe.com', 'wss://pusher.example.com', '/api/specific-service'
 */
export declare class HardcodedEndpointDetector extends BasePatternDetector {
    readonly name = "HardcodedEndpointDetector";
    readonly description = "Detects hardcoded URLs and API endpoints that create service dependencies and limitations";
    readonly version = "1.0.0";
    readonly supportedNodeTypes: string[];
    protected config: HardcodedEndpointDetectorConfig;
    detect(node: Node, path: NodePath, context: DetectionContext): DetectionResult[];
    /**
     * Detect hardcoded endpoints in variable declarations
     * Example: const API_URL = 'https://api.stripe.com/v1';
     */
    private detectVariableEndpoint;
    /**
     * Detect hardcoded endpoints in object properties
     * Example: { baseURL: 'https://api.example.com' }
     */
    private detectPropertyEndpoint;
    /**
     * Detect hardcoded endpoints in assignments
     * Example: this.apiUrl = 'https://api.service.com';
     */
    private detectAssignmentEndpoint;
    /**
     * Detect hardcoded endpoints in string literals (function calls, etc.)
     * Example: fetch('https://api.example.com/data')
     */
    private detectStringEndpoint;
    /**
     * Detect hardcoded endpoints in template literals
     * Example: `https://api.${domain}.com/v1/users`
     */
    private detectTemplateEndpoint;
    /**
     * Extract endpoint information from various AST value nodes
     */
    private extractEndpointFromValue;
    /**
     * Parse an endpoint string to extract components
     */
    private parseEndpoint;
    /**
     * Determine if an endpoint should be analyzed based on configuration
     */
    private shouldAnalyzeEndpoint;
    /**
     * Calculate suspicion score for an endpoint
     */
    private calculateSuspicionScore;
    /**
     * Check if variable name suggests it contains an endpoint
     */
    private isEndpointVariable;
    /**
     * Check if parent context suggests this is likely an endpoint
     */
    private isLikelyEndpointContext;
    /**
     * Identify service provider from endpoint
     */
    private identifyServiceProvider;
    /**
     * Assess the impact of a hardcoded endpoint
     */
    private assessImpact;
    /**
     * Convert camelCase to config key (snake_case)
     */
    private camelToConfigKey;
    /**
     * Convert camelCase to environment variable key (UPPER_SNAKE_CASE)
     */
    private camelToEnvKey;
    /**
     * Convert endpoint value to config key
     */
    private valueToConfigKey;
}
//# sourceMappingURL=HardcodedEndpointDetector.d.ts.map