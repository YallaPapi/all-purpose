/**
 * Vercel-Native Architecture Agent - The PRODUCTION BUILDER
 * 
 * Complete Vercel deployment and production architecture system with unlimited capabilities
 * Following All-Purpose Pattern: NO hardcoded limitations on production complexity
 */

// Core Agent
export { VercelNativeArchitectureAgent } from './core/VercelNativeArchitectureAgent.js';

// Builders
export { VercelArchitectureBuilder } from './builders/VercelArchitectureBuilder.js';

// Deployers
export { ServerlessFunctionDeployer } from './deployers/ServerlessFunctionDeployer.js';
export { ProductionDeploymentManager } from './deployers/ProductionDeploymentManager.js';

// Optimizers
export { PerformanceOptimizer } from './optimizers/PerformanceOptimizer.js';

// Monitors
export { ProductionMonitor } from './monitors/ProductionMonitor.js';

// Integrators
export { MetaAgentIntegrator } from './integrators/MetaAgentIntegrator.js';

// CLI
export { VercelArchitectureCLI, runCLI } from './cli/VercelArchitectureCLI.js';

// Types
export * from './types/index.js';

// Factory Functions
export {
  createVercelNativeAgent,
  createVercelArchitectureBuilder,
  createServerlessFunctionDeployer,
  createProductionDeploymentManager,
  createPerformanceOptimizer,
  createProductionMonitor,
  createMetaAgentIntegrator
} from './factories/index.js';

// Utilities
export { 
  validateVercelConfig,
  optimizeVercelConfiguration,
  generateVercelProjectStructure,
  createVercelDeploymentPackage
} from './utils/index.js';

// Constants
export const VERCEL_NATIVE_ARCHITECTURE_VERSION = '1.0.0';
export const SUPPORTED_FRAMEWORKS = [
  'next.js',
  'react',
  'vue', 
  'angular',
  'svelte',
  'nuxt',
  'gatsby',
  'astro',
  'custom'
];

export const SUPPORTED_RUNTIMES = [
  'nodejs18.x',
  'nodejs20.x',
  'python3.9',
  'python3.11',
  'go1.x',
  'custom',
  'edge-runtime'
];

export const DEFAULT_REGIONS = [
  'iad1', // US East (Virginia)
  'sfo1', // US West (San Francisco)
  'lhr1', // Europe (London)
  'hnd1', // Asia (Tokyo)
  'sin1', // Asia (Singapore)
  'syd1'  // Oceania (Sydney)
];

// Meta-Agent Information
export const AGENT_METADATA = {
  name: 'Vercel-Native Architecture Agent',
  type: 'PRODUCTION BUILDER',
  description: 'Complete Vercel deployment and production architecture system with unlimited capabilities',
  version: '1.0.0',
  capabilities: [
    'Unlimited Vercel architecture design',
    'Comprehensive serverless function deployment',
    'Production-grade performance optimization',
    'Real-time monitoring and analytics',
    'Meta-agent coordination and integration',
    'Zero-limitation scalability',
    'Complete DevOps automation',
    'Enterprise security configuration'
  ],
  integrations: [
    'Template Engine Factory Agent',
    'Parameter Flow Agent',
    'IOA (Infrastructure Orchestration Agent)',
    '5-Document Framework Agent',
    'PRD-Parser Agent',
    '30-Minute Rule Agent'
  ],
  patterns: ['All-Purpose Pattern'],
  antiPatterns: ['No hardcoded limitations', 'No fixed constraints'],
  createdAt: new Date().toISOString(),
  lastUpdated: new Date().toISOString()
};

// Default Configurations
export const DEFAULT_VERCEL_CONFIG = {
  agentId: 'vercel-native-architecture',
  version: '1.0.0',
  outputDirectory: './vercel-architecture',
  framework: {
    name: 'auto-detect',
    version: 'latest'
  },
  capabilities: {
    serverlessFunctions: true,
    edgeFunctions: true,
    staticGeneration: true,
    serverSideRendering: true,
    incrementalStaticRegeneration: true,
    edgeMiddleware: true,
    analytics: true,
    speedInsights: true,
    imageOptimization: true,
    fontOptimization: true
  }
};

export const DEFAULT_DEPLOYMENT_STRATEGY = {
  strategy: 'blue-green',
  environments: ['development', 'preview', 'production'],
  branchStrategies: {
    'main': 'production',
    'develop': 'preview',
    'feature/*': 'preview'
  },
  autoDeployment: true,
  rollbackEnabled: true,
  healthChecks: true
};

export const DEFAULT_PERFORMANCE_TARGETS = {
  latencyTargets: { p95: 100, p99: 200 },
  throughputTargets: { rps: 1000 },
  availabilityTargets: { uptime: 99.9 },
  cacheStrategy: 'aggressive',
  compressionEnabled: true,
  bundleOptimization: true,
  imageOptimization: true
};

// Helper Functions
export function createDefaultVercelArchitecture(name: string, framework: string) {
  return {
    name,
    framework: { name: framework, version: 'latest' },
    deployment: DEFAULT_DEPLOYMENT_STRATEGY,
    performance: DEFAULT_PERFORMANCE_TARGETS,
    functions: { apiFunctions: [], edgeFunctions: [], cronFunctions: [], middlewareFunctions: [] },
    domains: [],
    environment: {},
    monitoring: { analyticsEnabled: true, speedInsightsEnabled: true },
    security: { httpsEnforcement: true, corsEnabled: true },
    integrations: []
  };
}

export function isFrameworkSupported(framework: string): boolean {
  return SUPPORTED_FRAMEWORKS.includes(framework.toLowerCase());
}

export function isRuntimeSupported(runtime: string): boolean {
  return SUPPORTED_RUNTIMES.includes(runtime);
}

export function getOptimalRegions(globalDistribution: boolean = true): string[] {
  return globalDistribution ? DEFAULT_REGIONS : ['iad1'];
}

// Agent Registration for Meta-Agent Ecosystem
export function registerWithMetaAgentEcosystem() {
  return {
    agentId: 'vercel-native-architecture',
    agentName: 'Vercel-Native Architecture Agent',
    agentType: 'PRODUCTION BUILDER',
    version: VERCEL_NATIVE_ARCHITECTURE_VERSION,
    capabilities: AGENT_METADATA.capabilities,
    endpoints: {
      build: '/api/vercel/build',
      deploy: '/api/vercel/deploy',
      optimize: '/api/vercel/optimize',
      monitor: '/api/vercel/monitor',
      coordinate: '/api/vercel/coordinate'
    },
    integrations: AGENT_METADATA.integrations,
    registeredAt: new Date().toISOString()
  };
}

export default {
  VercelNativeArchitectureAgent,
  VercelArchitectureBuilder,
  ServerlessFunctionDeployer,
  ProductionDeploymentManager,
  PerformanceOptimizer,
  ProductionMonitor,
  MetaAgentIntegrator,
  VercelArchitectureCLI,
  runCLI,
  AGENT_METADATA,
  DEFAULT_VERCEL_CONFIG,
  createDefaultVercelArchitecture,
  registerWithMetaAgentEcosystem
};