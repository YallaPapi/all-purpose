/**
 * Vercel Architecture Builder - Builds complete Vercel-native architectures
 *
 * Constructs comprehensive Vercel deployment architectures with unlimited complexity
 * Following All-Purpose Pattern: NO hardcoded limitations on architecture scope
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig, DomainConfiguration, SecurityConfiguration } from '../types/index.js';
export declare class VercelArchitectureBuilder extends EventEmitter {
    private config;
    private isInitialized;
    constructor(config: VercelNativeConfig);
    initialize(): Promise<void>;
    /**
     * Analyze requirements for Vercel deployment
     */
    analyzeRequirements(request: any): Promise<any>;
    /**
     * Design Vercel-native architecture
     */
    designArchitecture(request: any, analysis: any): Promise<any>;
    /**
     * Configure routing for Vercel deployment
     */
    configureRouting(design: any, routingSpecs?: any): Promise<any>;
    /**
     * Configure domains for Vercel deployment
     */
    configureDomains(domains: string[]): Promise<DomainConfiguration[]>;
    /**
     * Build security configuration
     */
    buildSecurityConfiguration(design: any, requirements?: any): Promise<SecurityConfiguration>;
    /**
     * Private helper methods
     */
    private analyzeFramework;
    private getFrameworkType;
    private getFrameworkBuildStrategy;
    private getFrameworkOptimizations;
    private assessServerlessCompatibility;
    private supportsApiRoutes;
    private supportsSSR;
    private supportsISR;
    private supportsEdge;
    private assessComplexity;
    private analyzeScalingNeeds;
    private analyzePerformanceRequirements;
    private analyzeSecurityRequirements;
    private analyzeMonitoringNeeds;
    private determineArchitectureType;
    private designDeploymentStrategy;
    private designFunctionArchitecture;
    private designRoutingStrategy;
    private designOptimizationStrategy;
    private designSecurityStrategy;
    private designMonitoringStrategy;
    private buildStaticRoutes;
    private buildDynamicRoutes;
    private buildRedirects;
    private buildRewrites;
    private buildHeaders;
    private determineDomainType;
    private generateDNSRecords;
}
export default VercelArchitectureBuilder;
//# sourceMappingURL=VercelArchitectureBuilder.d.ts.map