#!/usr/bin/env node
/**
 * Vercel-Native Architecture Agent - Main Entry Point
 *
 * The PRODUCTION BUILDER - Complete Vercel-native architecture agent
 * that builds unlimited production deployment systems with NO hardcoded limitations
 *
 * Features:
 * - Complete Vercel-native architecture building
 * - Serverless function deployment systems
 * - Production optimization and monitoring
 * - Meta-agent coordination
 * - CLI interface for all operations
 *
 * Usage:
 *   node main.js [command] [options]
 *   node main.js build --name my-app --framework next.js
 *   node main.js deploy --project ./my-app --environment production
 *   node main.js optimize --project ./my-app --focus performance
 *   node main.js coordinate --all
 *
 * Following All-Purpose Pattern: NO limitations on deployment complexity
 */
import { EventEmitter } from 'events';
import { VercelNativeConfig } from './types/index.js';
/**
 * Main Vercel-Native Architecture Agent coordinator
 */
declare class VercelNativeMain extends EventEmitter {
    private agent;
    private cli;
    private metaAgentCoordinator;
    private isRegisteredWithCoordinator;
    constructor();
    /**
     * Initialize the agent with configuration
     */
    initialize(config?: VercelNativeConfig): Promise<void>;
    /**
     * Connect to MetaAgentCoordinator if available
     */
    private connectToCoordinator;
    /**
     * Setup coordination event listeners
     */
    private setupCoordinationListeners;
    /**
     * Handle coordination tasks from other meta-agents
     */
    private handleCoordinationTask;
    /**
     * Handle knowledge notifications from other meta-agents
     */
    private handleKnowledgeNotification;
    /**
     * Task handlers for different coordination scenarios
     */
    private handleProductionDeploymentTask;
    private handleArchitectureOptimizationTask;
    private handleVercelConfigurationTask;
    private handlePerformanceAnalysisTask;
    /**
     * Knowledge processing methods
     */
    private processArchitectureRequirements;
    private processPerformanceRequirements;
    private processSecurityRequirements;
    /**
     * Update status with coordinator
     */
    private updateCoordinatorStatus;
    /**
     * Setup event forwarding from agent to coordinator
     */
    private setupEventForwarding;
    /**
     * Run CLI interface
     */
    runCLI(args?: string[]): Promise<void>;
    /**
     * Get agent status and capabilities
     */
    getStatus(): any;
    /**
     * Graceful shutdown
     */
    private shutdown;
}
/**
 * Main execution logic
 */
declare function main(): Promise<void>;
export { VercelNativeMain, main };
export default VercelNativeMain;
//# sourceMappingURL=main.d.ts.map