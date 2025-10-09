/**
 * Infra Orchestrator Agent (IOA) - Main Entry Point
 * 
 * Use context7: Main orchestrator for meta-agent factory infrastructure
 * Following All-Purpose Pattern: Configurable for ANY project structure and compliance needs
 */

import { InfraOrchestrator } from './core/InfraOrchestrator.js';
import { logger } from './utils/logger.js';
import { IOAConfig, IOAMode } from './types/config.js';

/**
 * Main entry point for IOA
 * Supports multiple modes: orchestrate, audit, compliance, status
 */
async function main(): Promise<void> {
  try {
    const mode = (process.argv[2] as IOAMode) || 'orchestrate';
    const configPath = process.argv[3] || './ioa.config.json';

    logger.info('🤖 Infra Orchestrator Agent starting', {
      mode,
      configPath,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    });

    // Initialize IOA with configuration
    const orchestrator = new InfraOrchestrator({
      projectRoot: process.cwd(),
      mode,
      configPath,
      enableRAGIntegration: true,
      enableMetaAgentCoordination: true,
      enableAutoComplianceEnforcement: true
    });

    // Execute based on mode
    switch (mode) {
      case 'orchestrate':
        await orchestrator.runFullOrchestration();
        break;
      case 'audit':
        await orchestrator.runComplianceAudit();
        break;
      case 'compliance':
        await orchestrator.runComplianceCheck();
        break;
      case 'status':
        await orchestrator.generateStatusReport();
        break;
      case 'pipeline':
        await orchestrator.runCIPipeline();
        break;
      default:
        logger.error('Invalid mode specified', { mode, validModes: ['orchestrate', 'audit', 'compliance', 'status', 'pipeline'] });
        process.exit(1);
    }

    logger.info('🎉 IOA execution completed successfully', { mode });

  } catch (error) {
    logger.error('❌ IOA execution failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Execute main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
export { InfraOrchestrator } from './core/InfraOrchestrator.js';