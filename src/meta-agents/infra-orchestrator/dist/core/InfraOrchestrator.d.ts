/**
 * Infrastructure Orchestrator Agent - Core Implementation
 *
 * Use context7: Main orchestrator for meta-agent factory infrastructure oversight
 * Following All-Purpose Pattern: Configurable orchestration for ANY project structure
 */
import { IOAConfig, OrchestrationResult, AuditReport, StatusReport } from '../types/config.js';
export declare class InfraOrchestrator {
    private config;
    private patternEngine;
    private classifier;
    constructor(config: IOAConfig);
    /**
     * Run full orchestration cycle - main operational mode
     */
    runFullOrchestration(): Promise<OrchestrationResult>;
    /**
     * Run compliance audit - analyze codebase for anti-patterns
     */
    runComplianceAudit(): Promise<AuditReport>;
    /**
     * Run quick compliance check - focused analysis
     */
    runComplianceCheck(): Promise<void>;
    /**
     * Generate comprehensive status report
     */
    generateStatusReport(): Promise<StatusReport>;
    /**
     * Run CI/CD pipeline integration
     */
    runCIPipeline(): Promise<void>;
    private calculateComplianceScore;
    private determineProjectHealth;
    private generateRecommendations;
    private convertToComplianceResults;
    private updateDocumentation;
    private updateRAGKnowledge;
    private coordinateMetaAgents;
    private generateAutomaticTasks;
    /**
     * Generate status documentation with Mermaid diagrams
     */
    private generateStatusDocumentation;
    /**
     * Update environment documentation based on audit findings
     */
    private updateEnvironmentDocs;
}
//# sourceMappingURL=InfraOrchestrator.d.ts.map