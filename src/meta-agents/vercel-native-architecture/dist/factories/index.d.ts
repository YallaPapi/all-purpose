/**
 * Factory Functions for Vercel-Native Architecture Agent Components
 *
 * Provides unlimited factory capabilities with no hardcoded limitations
 * Following All-Purpose Pattern: NO limits on component creation
 */
import { VercelNativeArchitectureAgent } from '../core/VercelNativeArchitectureAgent.js';
import { VercelArchitectureBuilder } from '../builders/VercelArchitectureBuilder.js';
import { ServerlessFunctionDeployer } from '../deployers/ServerlessFunctionDeployer.js';
import { ProductionDeploymentManager } from '../deployers/ProductionDeploymentManager.js';
import { PerformanceOptimizer } from '../optimizers/PerformanceOptimizer.js';
import { ProductionMonitor } from '../monitors/ProductionMonitor.js';
import { MetaAgentIntegrator } from '../integrators/MetaAgentIntegrator.js';
import { VercelNativeConfig } from '../types/index.js';
/**
 * Create Vercel Native Architecture Agent instance
 */
export declare function createVercelNativeAgent(config: VercelNativeConfig): VercelNativeArchitectureAgent;
/**
 * Create Vercel Architecture Builder instance
 */
export declare function createVercelArchitectureBuilder(config: VercelNativeConfig): VercelArchitectureBuilder;
/**
 * Create Serverless Function Deployer instance
 */
export declare function createServerlessFunctionDeployer(config: VercelNativeConfig): ServerlessFunctionDeployer;
/**
 * Create Production Deployment Manager instance
 */
export declare function createProductionDeploymentManager(config: VercelNativeConfig): ProductionDeploymentManager;
/**
 * Create Performance Optimizer instance
 */
export declare function createPerformanceOptimizer(config: VercelNativeConfig): PerformanceOptimizer;
/**
 * Create Production Monitor instance
 */
export declare function createProductionMonitor(config: VercelNativeConfig): ProductionMonitor;
/**
 * Create Meta-Agent Integrator instance
 */
export declare function createMetaAgentIntegrator(config: VercelNativeConfig): MetaAgentIntegrator;
/**
 * Create complete Vercel architecture stack
 */
export declare function createCompleteVercelStack(config: VercelNativeConfig): {
    agent: VercelNativeArchitectureAgent;
    builder: VercelArchitectureBuilder;
    functionDeployer: ServerlessFunctionDeployer;
    deploymentManager: ProductionDeploymentManager;
    optimizer: PerformanceOptimizer;
    monitor: ProductionMonitor;
    integrator: MetaAgentIntegrator;
};
/**
 * Create production-ready configuration
 */
export declare function createProductionConfig(overrides?: Partial<VercelNativeConfig>): VercelNativeConfig;
declare const _default: {
    createVercelNativeAgent: typeof createVercelNativeAgent;
    createVercelArchitectureBuilder: typeof createVercelArchitectureBuilder;
    createServerlessFunctionDeployer: typeof createServerlessFunctionDeployer;
    createProductionDeploymentManager: typeof createProductionDeploymentManager;
    createPerformanceOptimizer: typeof createPerformanceOptimizer;
    createProductionMonitor: typeof createProductionMonitor;
    createMetaAgentIntegrator: typeof createMetaAgentIntegrator;
    createCompleteVercelStack: typeof createCompleteVercelStack;
    createProductionConfig: typeof createProductionConfig;
};
export default _default;
//# sourceMappingURL=index.d.ts.map