#!/usr/bin/env node
/**
 * Vercel-Native Architecture Agent - The PRODUCTION BUILDER
 *
 * This meta-agent builds native Vercel production deployment systems by:
 * 1. Building complete Vercel-native architectures with unlimited complexity
 * 2. Generating serverless function systems optimized for Vercel
 * 3. Creating production deployment pipelines with unlimited scalability
 * 4. Building comprehensive monitoring and analytics systems
 * 5. Coordinating with all meta-agents for complete production readiness
 * 6. Generating bulletproof production code for Vercel deployment
 *
 * Architecture Pattern: Analyze → Design → Build → Optimize → Deploy → Monitor
 * Integration: All Meta-Agents, Vercel Platform, Production Systems
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on deployment complexity
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig, VercelNativeCapabilities, VercelArchitecture, VercelArchitectureResult, DeploymentResult, OptimizationResult } from '../types/index.js';
/**
 * Vercel-Native Architecture Agent - Builds complete production deployment systems
 * NO limitations on deployment complexity, scaling, or optimization depth
 */
export declare class VercelNativeArchitectureAgent extends EventEmitter {
    private config;
    private architectureBuilder;
    private functionDeployer;
    private deploymentManager;
    private performanceOptimizer;
    private productionMonitor;
    private metaAgentIntegrator;
    private isInitialized;
    private builtArchitectures;
    private deploymentResults;
    private optimizationResults;
    private monitoringConfigurations;
    private activeDeployments;
    constructor(config?: VercelNativeConfig);
    /**
     * Initialize the agent - Vercel-native enhanced setup
     */
    initialize(): Promise<void>;
    /**
     * Build complete Vercel-native architecture - main entry point
     */
    buildVercelArchitecture(request: {
        architectureName: string;
        description: string;
        framework: string;
        functions?: {
            apiFunctions?: any[];
            edgeFunctions?: any[];
            cronFunctions?: any[];
            middlewareFunctions?: any[];
        };
        routing?: {
            staticRoutes?: any[];
            dynamicRoutes?: any[];
            redirects?: any[];
            rewrites?: any[];
            headers?: any[];
        };
        domains?: string[];
        environment?: Record<string, string>;
        buildConfiguration?: any;
        deploymentStrategy?: string;
        performanceRequirements?: Record<string, any>;
        securityRequirements?: Record<string, any>;
        monitoringRequirements?: Record<string, any>;
        customRequirements?: Record<string, any>;
    }): Promise<VercelArchitectureResult>;
    /**
     * Deploy architecture to Vercel
     */
    deployToVercel(architectureId: string, deploymentOptions?: {
        environment?: 'production' | 'preview' | 'development';
        target?: string;
        force?: boolean;
        skipBuild?: boolean;
        regions?: string[];
        alias?: string[];
    }): Promise<DeploymentResult>;
    /**
     * Optimize existing deployment
     */
    optimizeDeployment(deploymentId: string, optimizationOptions?: {
        types?: string[];
        aggressiveness?: 'low' | 'medium' | 'high' | 'maximum';
        focus?: 'performance' | 'cost' | 'security' | 'all';
    }): Promise<OptimizationResult>;
    /**
     * Get built architectures
     */
    getBuiltArchitectures(): VercelArchitecture[];
    /**
     * Get specific architecture by ID
     */
    getArchitecture(architectureId: string): VercelArchitecture | undefined;
    /**
     * Get deployment results
     */
    getDeploymentResults(): DeploymentResult[];
    /**
     * Get optimization results
     */
    getOptimizationResults(): OptimizationResult[];
    /**
     * Get active deployments
     */
    getActiveDeployments(): any[];
    /**
     * Get agent capabilities
     */
    getCapabilities(): VercelNativeCapabilities;
    /**
     * Private helper methods
     */
    private setupEventForwarding;
    private initializeVercelIntegration;
    private initializeVercelSDK;
    private initializeMetaAgentIntegrations;
    private analyzeRequirements;
    private designArchitecture;
    private buildServerlessFunctions;
    private configureRouting;
    private configureDomains;
    private applyPerformanceOptimizations;
    private configureMonitoring;
    private buildSecurityConfiguration;
    private createDeploymentConfiguration;
    private buildEnvironmentVariables;
    private generateDeploymentFiles;
    private generateVercelConfig;
    private calculateArchitectureScore;
    private calculatePerformanceScore;
    private calculateSecurityScore;
    private calculateScalabilityScore;
    private calculateVercelCompliance;
    private generateDeploymentInstructions;
    private generatePreDeploymentChecks;
    private estimateDeploymentTime;
    private predictLatency;
    private predictThroughput;
    private predictCost;
    private assessScalingCapabilities;
    private assessSecurity;
    private scanForVulnerabilities;
    private generateSecurityRecommendations;
    private generateArchitectureRecommendations;
    private setupDeploymentMonitoring;
    private generateBuilds;
    private generateRoutes;
    private generateEnvConfig;
    private generateFunctionConfig;
    private generateHeaders;
    private generateRedirects;
    private generateRewrites;
    private generateCrons;
}
export default VercelNativeArchitectureAgent;
//# sourceMappingURL=VercelNativeArchitectureAgent.d.ts.map