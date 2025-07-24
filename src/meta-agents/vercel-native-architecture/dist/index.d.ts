/**
 * Vercel-Native Architecture Agent - The PRODUCTION BUILDER
 *
 * Complete Vercel deployment and production architecture system with unlimited capabilities
 * Following All-Purpose Pattern: NO hardcoded limitations on production complexity
 */
export { VercelNativeArchitectureAgent } from './core/VercelNativeArchitectureAgent.js';
export { VercelArchitectureBuilder } from './builders/VercelArchitectureBuilder.js';
export { ServerlessFunctionDeployer } from './deployers/ServerlessFunctionDeployer.js';
export { ProductionDeploymentManager } from './deployers/ProductionDeploymentManager.js';
export { PerformanceOptimizer } from './optimizers/PerformanceOptimizer.js';
export { ProductionMonitor } from './monitors/ProductionMonitor.js';
export { MetaAgentIntegrator } from './integrators/MetaAgentIntegrator.js';
export { VercelArchitectureCLI, runCLI } from './cli/VercelArchitectureCLI.js';
export * from './types/index.js';
export { createVercelNativeAgent, createVercelArchitectureBuilder, createServerlessFunctionDeployer, createProductionDeploymentManager, createPerformanceOptimizer, createProductionMonitor, createMetaAgentIntegrator } from './factories/index.js';
export { validateVercelConfig, optimizeVercelConfiguration, generateVercelProjectStructure, createVercelDeploymentPackage } from './utils/index.js';
export declare const VERCEL_NATIVE_ARCHITECTURE_VERSION = "1.0.0";
export declare const SUPPORTED_FRAMEWORKS: string[];
export declare const SUPPORTED_RUNTIMES: string[];
export declare const DEFAULT_REGIONS: string[];
export declare const AGENT_METADATA: {
    name: string;
    type: string;
    description: string;
    version: string;
    capabilities: string[];
    integrations: string[];
    patterns: string[];
    antiPatterns: string[];
    createdAt: string;
    lastUpdated: string;
};
export declare const DEFAULT_VERCEL_CONFIG: {
    agentId: string;
    version: string;
    outputDirectory: string;
    framework: {
        name: string;
        version: string;
    };
    capabilities: {
        serverlessFunctions: boolean;
        edgeFunctions: boolean;
        staticGeneration: boolean;
        serverSideRendering: boolean;
        incrementalStaticRegeneration: boolean;
        edgeMiddleware: boolean;
        analytics: boolean;
        speedInsights: boolean;
        imageOptimization: boolean;
        fontOptimization: boolean;
    };
};
export declare const DEFAULT_DEPLOYMENT_STRATEGY: {
    strategy: string;
    environments: string[];
    branchStrategies: {
        main: string;
        develop: string;
        'feature/*': string;
    };
    autoDeployment: boolean;
    rollbackEnabled: boolean;
    healthChecks: boolean;
};
export declare const DEFAULT_PERFORMANCE_TARGETS: {
    latencyTargets: {
        p95: number;
        p99: number;
    };
    throughputTargets: {
        rps: number;
    };
    availabilityTargets: {
        uptime: number;
    };
    cacheStrategy: string;
    compressionEnabled: boolean;
    bundleOptimization: boolean;
    imageOptimization: boolean;
};
export declare function createDefaultVercelArchitecture(name: string, framework: string): {
    name: string;
    framework: {
        name: string;
        version: string;
    };
    deployment: {
        strategy: string;
        environments: string[];
        branchStrategies: {
            main: string;
            develop: string;
            'feature/*': string;
        };
        autoDeployment: boolean;
        rollbackEnabled: boolean;
        healthChecks: boolean;
    };
    performance: {
        latencyTargets: {
            p95: number;
            p99: number;
        };
        throughputTargets: {
            rps: number;
        };
        availabilityTargets: {
            uptime: number;
        };
        cacheStrategy: string;
        compressionEnabled: boolean;
        bundleOptimization: boolean;
        imageOptimization: boolean;
    };
    functions: {
        apiFunctions: never[];
        edgeFunctions: never[];
        cronFunctions: never[];
        middlewareFunctions: never[];
    };
    domains: never[];
    environment: {};
    monitoring: {
        analyticsEnabled: boolean;
        speedInsightsEnabled: boolean;
    };
    security: {
        httpsEnforcement: boolean;
        corsEnabled: boolean;
    };
    integrations: never[];
};
export declare function isFrameworkSupported(framework: string): boolean;
export declare function isRuntimeSupported(runtime: string): boolean;
export declare function getOptimalRegions(globalDistribution?: boolean): string[];
export declare function registerWithMetaAgentEcosystem(): {
    agentId: string;
    agentName: string;
    agentType: string;
    version: string;
    capabilities: string[];
    endpoints: {
        build: string;
        deploy: string;
        optimize: string;
        monitor: string;
        coordinate: string;
    };
    integrations: string[];
    registeredAt: string;
};
declare const _default: {
    VercelNativeArchitectureAgent: any;
    VercelArchitectureBuilder: any;
    ServerlessFunctionDeployer: any;
    ProductionDeploymentManager: any;
    PerformanceOptimizer: any;
    ProductionMonitor: any;
    MetaAgentIntegrator: any;
    VercelArchitectureCLI: any;
    runCLI: any;
    AGENT_METADATA: {
        name: string;
        type: string;
        description: string;
        version: string;
        capabilities: string[];
        integrations: string[];
        patterns: string[];
        antiPatterns: string[];
        createdAt: string;
        lastUpdated: string;
    };
    DEFAULT_VERCEL_CONFIG: {
        agentId: string;
        version: string;
        outputDirectory: string;
        framework: {
            name: string;
            version: string;
        };
        capabilities: {
            serverlessFunctions: boolean;
            edgeFunctions: boolean;
            staticGeneration: boolean;
            serverSideRendering: boolean;
            incrementalStaticRegeneration: boolean;
            edgeMiddleware: boolean;
            analytics: boolean;
            speedInsights: boolean;
            imageOptimization: boolean;
            fontOptimization: boolean;
        };
    };
    createDefaultVercelArchitecture: typeof createDefaultVercelArchitecture;
    registerWithMetaAgentEcosystem: typeof registerWithMetaAgentEcosystem;
};
export default _default;
//# sourceMappingURL=index.d.ts.map