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
export function createVercelNativeAgent(config: VercelNativeConfig): VercelNativeArchitectureAgent {
  return new VercelNativeArchitectureAgent(config);
}

/**
 * Create Vercel Architecture Builder instance
 */
export function createVercelArchitectureBuilder(config: VercelNativeConfig): VercelArchitectureBuilder {
  return new VercelArchitectureBuilder(config);
}

/**
 * Create Serverless Function Deployer instance
 */
export function createServerlessFunctionDeployer(config: VercelNativeConfig): ServerlessFunctionDeployer {
  return new ServerlessFunctionDeployer(config);
}

/**
 * Create Production Deployment Manager instance
 */
export function createProductionDeploymentManager(config: VercelNativeConfig): ProductionDeploymentManager {
  return new ProductionDeploymentManager(config);
}

/**
 * Create Performance Optimizer instance
 */
export function createPerformanceOptimizer(config: VercelNativeConfig): PerformanceOptimizer {
  return new PerformanceOptimizer(config);
}

/**
 * Create Production Monitor instance
 */
export function createProductionMonitor(config: VercelNativeConfig): ProductionMonitor {
  return new ProductionMonitor(config);
}

/**
 * Create Meta-Agent Integrator instance
 */
export function createMetaAgentIntegrator(config: VercelNativeConfig): MetaAgentIntegrator {
  return new MetaAgentIntegrator(config);
}

/**
 * Create complete Vercel architecture stack
 */
export function createCompleteVercelStack(config: VercelNativeConfig) {
  return {
    agent: createVercelNativeAgent(config),
    builder: createVercelArchitectureBuilder(config),
    functionDeployer: createServerlessFunctionDeployer(config),
    deploymentManager: createProductionDeploymentManager(config),
    optimizer: createPerformanceOptimizer(config),
    monitor: createProductionMonitor(config),
    integrator: createMetaAgentIntegrator(config)
  };
}

/**
 * Create production-ready configuration
 */
export function createProductionConfig(overrides: Partial<VercelNativeConfig> = {}): VercelNativeConfig {
  return {
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
    },
    ...overrides
  };
}

export default {
  createVercelNativeAgent,
  createVercelArchitectureBuilder,
  createServerlessFunctionDeployer,
  createProductionDeploymentManager,
  createPerformanceOptimizer,
  createProductionMonitor,
  createMetaAgentIntegrator,
  createCompleteVercelStack,
  createProductionConfig
};