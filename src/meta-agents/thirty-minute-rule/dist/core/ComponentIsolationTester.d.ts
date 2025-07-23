/**
 * Component Isolation Tester - Systematic component testing in isolation
 *
 * Implements component isolation testing by:
 * 1. Identifying component dependencies and boundaries
 * 2. Creating isolated test environments with mocked dependencies
 * 3. Running health checks for individual components
 * 4. Generating test reports with actionable insights
 * 5. Supporting multiple testing frameworks and project types
 *
 * Following All-Purpose Pattern: NO hardcoded limitations on testing frameworks or component types
 */
import { EventEmitter } from 'events';
import { ThirtyMinuteRuleConfig, ComponentInfo, IsolationTestResult, HealthCheckResult } from '../types/index.js';
export interface IsolationTestConfig {
    testTimeout?: number;
    mockDependencies?: boolean;
    generateCoverage?: boolean;
    testFramework?: string;
    customTestCommand?: string;
    isolationLevel?: 'unit' | 'integration' | 'full';
}
export interface IsolationTestSuite {
    suiteId: string;
    components: ComponentInfo[];
    config: IsolationTestConfig;
    results: IsolationTestResult[];
    healthChecks: HealthCheckResult[];
    summary: TestSuiteSummary;
}
export interface TestSuiteSummary {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    timeouts: number;
    totalTime: number;
    coveragePercentage?: number;
    healthyComponents: number;
    unhealthyComponents: number;
}
export declare class ComponentIsolationTester extends EventEmitter {
    private config;
    private testSuites;
    private healthCheckCache;
    constructor(config: ThirtyMinuteRuleConfig);
    /**
     * Run isolation tests for multiple components
     */
    runIsolationTests(components: ComponentInfo[], testConfig?: IsolationTestConfig): Promise<IsolationTestSuite>;
    /**
     * Run health check for a single component
     */
    runHealthCheck(component: ComponentInfo): Promise<HealthCheckResult>;
    /**
     * Run isolation test for a single component
     */
    runComponentIsolationTest(component: ComponentInfo, config: IsolationTestConfig): Promise<IsolationTestResult>;
    /**
     * Create isolated test environment with mocked dependencies
     */
    private createIsolatedTestEnvironment;
    /**
     * Generate test file for component
     */
    private generateTestFile;
    /**
     * Generate test template based on component type and framework
     */
    private generateTestTemplate;
    /**
     * Utility methods
     */
    private detectTestFramework;
    private validateComponentSyntax;
    private checkDependencyHealth;
    private estimateComplexity;
    private generateMockForDependency;
    private buildTestCommand;
    private executeTestCommand;
    private parseTestOutput;
    private extractCoverageFromJestOutput;
    private generateCoverageReport;
    private isCacheValid;
}
//# sourceMappingURL=ComponentIsolationTester.d.ts.map