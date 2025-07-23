/**
 * Debug Endpoint Generator - Automatic /api/debug endpoint creation
 *
 * Generates debug endpoints for every component by:
 * 1. Analyzing project structure and identifying components
 * 2. Creating health check endpoints for each component
 * 3. Generating isolation test endpoints
 * 4. Setting up alternative approach endpoints for fallback scenarios
 * 5. Providing systematic debugging procedures with component-specific insights
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on project types or frameworks
 */
import { EventEmitter } from 'events';
import { ThirtyMinuteRuleConfig, DebugEndpointGenerationResult } from '../types/index.js';
export declare class DebugEndpointGenerator extends EventEmitter {
    private config;
    private discoveredComponents;
    private generatedEndpoints;
    constructor(config: ThirtyMinuteRuleConfig);
    /**
     * Generate debug endpoints for entire project
     */
    generateEndpoints(input?: {
        sourceDirectory?: string;
        outputDirectory?: string;
        componentFilter?: string[];
        endpointTypes?: ('health' | 'isolation' | 'fallback' | 'metrics')[];
        customConfiguration?: Record<string, any>;
    }): Promise<DebugEndpointGenerationResult>;
    /**
     * Discover components in the project
     */
    private discoverComponents;
    /**
     * Analyze a file to extract component information
     */
    private analyzeFileAsComponent;
    /**
     * Generate debug endpoints for a specific component
     */
    private generateComponentEndpoints;
    /**
     * Generate Express.js server code for debug endpoints
     */
    private generateServerCode;
    /**
     * Generate server template
     */
    private generateServerTemplate;
    /**
     * Generate handler template for a component
     */
    private generateHandlerTemplate;
    /**
     * Generate endpoint documentation
     */
    private generateEndpointDocumentation;
    /**
     * Utility methods
     */
    private shouldSkipFile;
    private detectComponentType;
    private extractDependencies;
    private detectFramework;
    private detectLanguage;
    private isTestable;
    private isCriticalComponent;
    private deduplicateComponents;
    private groupEndpointsByComponent;
    private generateWarnings;
    private generatePackageJson;
}
//# sourceMappingURL=DebugEndpointGenerator.d.ts.map