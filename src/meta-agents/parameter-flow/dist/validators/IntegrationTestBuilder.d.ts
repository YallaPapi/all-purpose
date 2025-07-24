/**
 * Integration Test Builder - Builds comprehensive integration testing frameworks
 *
 * Creates unlimited complexity integration test suites
 * Following All-Purpose Pattern: NO hardcoded limitations on test coverage
 */
import { EventEmitter } from 'events';
import { ParameterFlowConfig, IntegrationTestSuite, IntegrationTestResult, MockingFramework, PerformanceMonitor, ValidationEngine } from '../types/index.js';
export declare class IntegrationTestBuilder extends EventEmitter {
    private config;
    private isInitialized;
    private testSuites;
    private testExecutions;
    private testResults;
    constructor(config: ParameterFlowConfig);
    initialize(): Promise<void>;
    /**
     * Create test suites for integration
     */
    createTestSuitesForIntegration(topology: any, pipelines: any[]): Promise<IntegrationTestSuite[]>;
    /**
     * Execute tests
     */
    executeTests(request: {
        testSuiteId?: string;
        architectureId?: string;
        testScope?: 'unit' | 'integration' | 'system' | 'performance' | 'all';
        testConfiguration?: Record<string, any>;
    }): Promise<IntegrationTestResult>;
    /**
     * Build mocking frameworks for test suites
     */
    buildMockingFrameworks(testSuites: IntegrationTestSuite[]): Promise<MockingFramework[]>;
    /**
     * Build performance monitors for topology
     */
    buildPerformanceMonitors(topology: any): Promise<PerformanceMonitor[]>;
    /**
     * Build validation engines for mappings
     */
    buildValidationEngines(mappings: any[]): Promise<ValidationEngine[]>;
    /**
     * Private helper methods for test suite creation
     */
    private createComponentIntegrationTestSuite;
    private createPipelineTestSuite;
    private createEndToEndTestSuite;
    private createPerformanceTestSuite;
    private createSecurityTestSuite;
    private createComponentTestGroup;
    private createComponentTestCase;
    private createPipelineTestGroup;
    private createPipelineTestCase;
    private createEndToEndTestGroup;
    private createEndToEndTestCase;
    private createPerformanceTestGroup;
    private createPerformanceTestCase;
    private createSecurityTestGroup;
    private createSecurityTestCase;
    /**
     * Helper methods for test execution and analysis
     */
    private executeSingleTestSuite;
    private executeTestCase;
    private executeTestSteps;
    private calculateComponentCoverage;
    private calculateIntegrationCoverage;
    private calculateDataFlowCoverage;
    private calculateErrorScenarioCoverage;
    private calculateTestReliability;
    private calculateTestEffectiveness;
    private calculateDefectDetectionRate;
    private calculateFalsePositiveRate;
    private analyzeFailures;
    private analyzePerformance;
    private generateRecommendations;
}
export default IntegrationTestBuilder;
//# sourceMappingURL=IntegrationTestBuilder.d.ts.map