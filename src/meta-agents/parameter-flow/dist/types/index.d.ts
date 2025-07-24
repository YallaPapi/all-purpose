/**
 * Parameter Flow Agent - Type Definitions
 *
 * The INTEGRATION BUILDER for System Architecture
 * Following All-Purpose Pattern: NO hardcoded limitations on integration complexity
 */
export interface ParameterFlowConfig {
    projectRoot?: string;
    outputDirectory?: string;
    mappingDirectory?: string;
    integrationArchitecture?: {
        maxIntegrationDepth?: number | 'unlimited';
        maxParameterComplexity?: number | 'unlimited';
        maxTransformationChain?: number | 'unlimited';
        enableCaching?: boolean;
        enablePersistence?: boolean;
        enableRealTimeSync?: boolean;
    };
    parameterMapping?: {
        supportedTypes?: string[];
        mappingStrategies?: string[];
        validationLevels?: string[];
        transformationMethods?: string[];
        serializationFormats?: string[];
    };
    dataFlow?: {
        flowPatterns?: string[];
        synchronizationMethods?: string[];
        conflictResolutionStrategies?: string[];
        dataIntegrityChecks?: string[];
        performanceOptimizations?: string[];
    };
    integrationTesting?: {
        testingFrameworks?: string[];
        testingStrategies?: string[];
        coverageTargets?: Record<string, number>;
        performanceThresholds?: Record<string, number>;
        enableMocking?: boolean;
        enableStubbing?: boolean;
    };
    metaAgentCoordination?: {
        supportedAgents?: string[];
        coordinationPatterns?: string[];
        communicationProtocols?: string[];
        dataExchangeFormats?: string[];
        errorHandlingStrategies?: string[];
    };
    performance?: {
        maxConcurrentIntegrations?: number | 'unlimited';
        maxDataThroughput?: number | 'unlimited';
        maxTransformationOps?: number | 'unlimited';
        cachingStrategy?: 'memory' | 'disk' | 'distributed' | 'custom';
        loadBalancing?: boolean;
        horizontalScaling?: boolean;
    };
    customConfiguration?: Record<string, any>;
    pluginConfiguration?: Record<string, any>;
    advancedSettings?: Record<string, any>;
}
export interface IntegrationArchitecture {
    architectureId: string;
    name: string;
    description: string;
    version: string;
    topology: {
        components: IntegrationComponent[];
        connections: IntegrationConnection[];
        dataFlowPaths: DataFlowPath[];
        dependencies: ComponentDependency[];
        criticalPaths: string[];
    };
    parameterMapping: {
        mappingSchemas: ParameterMappingSchema[];
        transformationPipelines: TransformationPipeline[];
        validationChains: ValidationChain[];
        serializationHandlers: SerializationHandler[];
    };
    dataFlow: {
        flowControllers: DataFlowController[];
        synchronizationPoints: SynchronizationPoint[];
        conflictResolvers: ConflictResolver[];
        integrityCheckers: IntegrityChecker[];
    };
    testing: {
        testSuites: IntegrationTestSuite[];
        mockingFrameworks: MockingFramework[];
        performanceMonitors: PerformanceMonitor[];
        validationEngines: ValidationEngine[];
    };
    quality: {
        reliabilityScore: number;
        performanceScore: number;
        maintainabilityScore: number;
        scalabilityScore: number;
        allPurposePatternCompliance: number;
    };
    deployment: {
        deploymentStrategies: string[];
        rollbackProcedures: string[];
        monitoringSetup: Record<string, any>;
        alertingRules: Record<string, any>;
    };
}
export interface IntegrationComponent {
    componentId: string;
    name: string;
    type: 'meta-agent' | 'external-service' | 'data-store' | 'processing-unit' | 'custom';
    version: string;
    interface: {
        inputParameters: ParameterDefinition[];
        outputParameters: ParameterDefinition[];
        events: EventDefinition[];
        methods: MethodDefinition[];
        protocols: string[];
    };
    capabilities: {
        supportedDataTypes: string[];
        supportedOperations: string[];
        supportedProtocols: string[];
        scalingCapabilities: string[];
        reliabilityLevel: string;
    };
    configuration: {
        endpointUrl?: string;
        authentication?: Record<string, any>;
        rateLimit?: Record<string, any>;
        timeout?: number;
        retryPolicy?: Record<string, any>;
        customSettings?: Record<string, any>;
    };
    health: {
        healthCheckEndpoint?: string;
        healthCheckInterval?: number;
        healthThresholds?: Record<string, any>;
        monitoringMetrics?: string[];
        alertingRules?: Record<string, any>;
    };
}
export interface IntegrationConnection {
    connectionId: string;
    name: string;
    description: string;
    source: {
        componentId: string;
        outputPort: string;
        dataFormat: string;
        protocol: string;
    };
    destination: {
        componentId: string;
        inputPort: string;
        expectedFormat: string;
        protocol: string;
    };
    transformation: {
        transformationId: string;
        transformationSteps: TransformationStep[];
        validationRules: ValidationRule[];
        errorHandling: ErrorHandlingStrategy[];
    };
    properties: {
        connectionType: 'synchronous' | 'asynchronous' | 'streaming' | 'batch';
        reliability: 'at-most-once' | 'at-least-once' | 'exactly-once';
        ordering: 'strict' | 'loose' | 'none';
        durability: boolean;
        encryption: boolean;
    };
    performance: {
        expectedThroughput: number;
        expectedLatency: number;
        maxRetries: number;
        backoffStrategy: string;
        circuitBreakerThreshold: number;
    };
}
export interface DataFlowPath {
    pathId: string;
    name: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    path: {
        startComponent: string;
        endComponent: string;
        intermediateSteps: DataFlowStep[];
        totalLatency: number;
        reliabilityScore: number;
    };
    dataCharacteristics: {
        dataTypes: string[];
        dataVolume: number;
        dataVelocity: number;
        dataComplexity: string;
        dataSensitivity: string;
    };
    flowControl: {
        flowControlStrategy: string;
        bufferingStrategy: string;
        backpressureHandling: string;
        overflowBehavior: string;
    };
    monitoring: {
        metrics: string[];
        alerts: string[];
        dashboards: string[];
        logging: string[];
    };
}
export interface ParameterMappingSchema {
    schemaId: string;
    name: string;
    description: string;
    version: string;
    schema: {
        sourceSchema: ParameterSchema;
        targetSchema: ParameterSchema;
        mappingRules: MappingRule[];
        transformationLogic: TransformationLogic[];
    };
    metadata: {
        mappingType: 'direct' | 'computed' | 'conditional' | 'aggregated' | 'custom';
        complexity: 'simple' | 'medium' | 'complex' | 'unlimited';
        reliability: number;
        performance: Record<string, any>;
    };
    validation: {
        validationRules: ValidationRule[];
        testCases: MappingTestCase[];
        qualityMetrics: QualityMetric[];
    };
    usage: {
        usageCount: number;
        lastUsed: Date;
        averagePerformance: number;
        errorRate: number;
        successRate: number;
    };
}
export interface ParameterSchema {
    schemaType: 'json-schema' | 'graphql' | 'protobuf' | 'avro' | 'custom';
    schemaDefinition: Record<string, any>;
    parameters: ParameterDefinition[];
    constraints: SchemaConstraint[];
    extensions: Record<string, any>;
}
export interface ParameterDefinition {
    parameterId: string;
    name: string;
    description: string;
    type: {
        baseType: string;
        subType?: string;
        format?: string;
        constraints?: Record<string, any>;
        nullable?: boolean;
        optional?: boolean;
    };
    validation: {
        required: boolean;
        validationRules: ValidationRule[];
        customValidators: string[];
        sanitization?: string[];
    };
    values: {
        defaultValue?: any;
        exampleValues?: any[];
        allowedValues?: any[];
        forbiddenValues?: any[];
    };
    metadata: {
        tags: string[];
        category: string;
        sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
        documentation: string;
        deprecation?: {
            deprecated: boolean;
            deprecationDate?: Date;
            replacementParameter?: string;
            migrationGuide?: string;
        };
    };
}
export interface MappingRule {
    ruleId: string;
    name: string;
    description: string;
    rule: {
        sourceParameter: string;
        targetParameter: string;
        mappingType: 'direct' | 'transform' | 'conditional' | 'aggregate' | 'custom';
        transformationExpression?: string;
        conditions?: ConditionExpression[];
    };
    execution: {
        executionOrder: number;
        dependencies: string[];
        errorHandling: ErrorHandlingStrategy;
        performance: {
            expectedLatency: number;
            memoryUsage: number;
            cpuUsage: number;
        };
    };
    validation: {
        preConditions: ValidationRule[];
        postConditions: ValidationRule[];
        invariants: ValidationRule[];
        testCases: RuleTestCase[];
    };
}
export interface TransformationPipeline {
    pipelineId: string;
    name: string;
    description: string;
    version: string;
    pipeline: {
        inputSchema: ParameterSchema;
        outputSchema: ParameterSchema;
        transformationSteps: TransformationStep[];
        parallelizable: boolean;
        stateful: boolean;
    };
    execution: {
        executionMode: 'sequential' | 'parallel' | 'streaming' | 'batch';
        retryPolicy: RetryPolicy;
        errorHandling: ErrorHandlingStrategy[];
        monitoring: MonitoringConfiguration;
    };
    optimization: {
        caching: CachingStrategy;
        partitioning: PartitioningStrategy;
        loadBalancing: LoadBalancingStrategy;
        resourceAllocation: ResourceAllocation;
    };
    quality: {
        correctnessScore: number;
        performanceScore: number;
        reliabilityScore: number;
        maintainabilityScore: number;
        testCoverage: number;
    };
}
export interface TransformationStep {
    stepId: string;
    name: string;
    description: string;
    stepType: 'filter' | 'map' | 'reduce' | 'validate' | 'enrich' | 'custom';
    definition: {
        inputParameters: string[];
        outputParameters: string[];
        transformationLogic: TransformationLogic;
        dependencies: string[];
        sideEffects: boolean;
    };
    execution: {
        executionOrder: number;
        canRunInParallel: boolean;
        resourceRequirements: ResourceRequirements;
        timeout: number;
        retryable: boolean;
    };
    validation: {
        preConditions: ValidationRule[];
        postConditions: ValidationRule[];
        invariants: ValidationRule[];
        testCases: StepTestCase[];
    };
}
export interface TransformationLogic {
    logicType: 'expression' | 'function' | 'lookup' | 'ml-model' | 'custom';
    implementation: {
        sourceCode?: string;
        functionName?: string;
        lookupTable?: Record<string, any>;
        modelEndpoint?: string;
        customHandler?: string;
    };
    configuration: {
        parameters: Record<string, any>;
        environment: Record<string, any>;
        dependencies: string[];
        resourceLimits: ResourceLimits;
    };
    validation: {
        unitTests: UnitTest[];
        integrationTests: IntegrationTest[];
        performanceTests: PerformanceTest[];
        securityTests: SecurityTest[];
    };
}
export interface IntegrationTestSuite {
    suiteId: string;
    name: string;
    description: string;
    version: string;
    structure: {
        testGroups: TestGroup[];
        testDependencies: TestDependency[];
        testExecution: TestExecution;
        testReporting: TestReporting;
    };
    coverage: {
        componentCoverage: ComponentCoverage[];
        integrationCoverage: IntegrationCoverage[];
        dataFlowCoverage: DataFlowCoverage[];
        errorScenarioCoverage: ErrorScenarioCoverage[];
    };
    quality: {
        testReliability: number;
        testMaintainability: number;
        executionTime: number;
        resourceUsage: ResourceUsage;
    };
    automation: {
        cicdIntegration: boolean;
        automaticTriggers: string[];
        testScheduling: TestScheduling;
        resultAnalysis: ResultAnalysis;
    };
}
export interface TestGroup {
    groupId: string;
    name: string;
    description: string;
    groupType: 'unit' | 'integration' | 'system' | 'performance' | 'security' | 'custom';
    testCases: TestCase[];
    configuration: {
        setUp: TestSetUp;
        tearDown: TestTearDown;
        environment: TestEnvironment;
        mockingStrategy: MockingStrategy;
    };
    execution: {
        executionOrder: number;
        parallelizable: boolean;
        timeout: number;
        retryPolicy: RetryPolicy;
    };
}
export interface TestCase {
    testCaseId: string;
    name: string;
    description: string;
    testType: 'positive' | 'negative' | 'boundary' | 'stress' | 'security';
    definition: {
        given: TestPreconditions;
        when: TestActions;
        then: TestAssertions;
        cleanup: TestCleanup;
    };
    testData: {
        inputData: Record<string, any>;
        expectedOutput: Record<string, any>;
        testDoubles: TestDouble[];
        fixtures: TestFixture[];
    };
    execution: {
        executionHistory: TestExecution[];
        lastResult: TestResult;
        performance: TestPerformance;
        reliability: TestReliability;
    };
}
export interface IntegrationArchitectureResult {
    success: boolean;
    architectureId: string;
    generatedArchitecture: IntegrationArchitecture;
    generation: {
        startTime: Date;
        endTime: Date;
        duration: number;
        componentsIntegrated: number;
        connectionsCreated: number;
        testSuitesGenerated: number;
    };
    quality: {
        architectureScore: number;
        reliabilityScore: number;
        performanceScore: number;
        maintainabilityScore: number;
        allPurposePatternCompliance: number;
    };
    integrations: {
        metaAgentConnections: string[];
        externalSystemConnections: string[];
        dataFlowValidation: boolean;
        performanceValidation: boolean;
    };
    validation: {
        architectureValidation: ValidationResult[];
        integrationValidation: ValidationResult[];
        performanceValidation: ValidationResult[];
        securityValidation: ValidationResult[];
    };
    deployment: {
        readyForDeployment: boolean;
        deploymentInstructions: string[];
        monitoringSetup: Record<string, any>;
        rollbackPlan: string[];
    };
    warnings: ValidationWarning[];
    errors: ValidationError[];
    recommendations: string[];
}
export interface ParameterMappingResult {
    success: boolean;
    mappingId: string;
    mappingSchema: ParameterMappingSchema;
    execution: {
        executionTime: number;
        transformationSteps: number;
        validationsPassed: number;
        validationsFailed: number;
    };
    quality: {
        accuracyScore: number;
        completenessScore: number;
        consistencyScore: number;
        performanceScore: number;
    };
    validation: {
        schemaValidation: boolean;
        dataValidation: boolean;
        constraintValidation: boolean;
        businessRuleValidation: boolean;
    };
    performance: {
        latency: number;
        throughput: number;
        memoryUsage: number;
        cpuUsage: number;
    };
}
export interface IntegrationTestResult {
    success: boolean;
    testSuiteId: string;
    execution: {
        totalTests: number;
        passedTests: number;
        failedTests: number;
        skippedTests: number;
        executionTime: number;
    };
    coverage: {
        componentCoverage: number;
        integrationCoverage: number;
        dataFlowCoverage: number;
        errorScenarioCoverage: number;
    };
    quality: {
        testReliability: number;
        testEffectiveness: number;
        defectDetectionRate: number;
        falsePositiveRate: number;
    };
    detailedResults: {
        testGroupResults: TestGroupResult[];
        failureAnalysis: FailureAnalysis[];
        performanceAnalysis: PerformanceAnalysis[];
        recommendedActions: string[];
    };
}
export interface ParameterFlowCapabilities {
    name: string;
    version: string;
    coreCapabilities: {
        integrationArchitecture: string[];
        parameterMapping: string[];
        dataTransformation: string[];
        integrationTesting: string[];
    };
    integrationCapabilities: {
        maxIntegrationComplexity: 'unlimited';
        supportedProtocols: string[];
        supportedDataFormats: string[];
        supportedTransformations: string[];
    };
    metaAgentCoordination: {
        supportedAgents: string[];
        coordinationPatterns: string[];
        communicationProtocols: string[];
        dataExchangeFormats: string[];
    };
    performance: {
        maxConcurrentIntegrations: number | 'unlimited';
        maxDataThroughput: number | 'unlimited';
        maxTransformationComplexity: number | 'unlimited';
        scalingSupport: string[];
    };
    qualityAssurance: {
        validationLevels: string[];
        testingFrameworks: string[];
        monitoringCapabilities: string[];
        alertingCapabilities: string[];
    };
    extensibility: {
        customIntegrations: boolean;
        customTransformations: boolean;
        customValidations: boolean;
        pluginSupport: boolean;
        apiExtensions: string[];
    };
}
export interface ValidationRule {
    ruleId: string;
    name: string;
    description: string;
    ruleType: 'schema' | 'business' | 'constraint' | 'custom';
    severity: 'error' | 'warning' | 'info';
    condition: string;
    errorMessage: string;
    autoCorrection?: string;
}
export interface ValidationResult {
    valid: boolean;
    ruleId?: string;
    message?: string;
    severity?: 'error' | 'warning' | 'info';
    details?: Record<string, any>;
}
export interface ValidationWarning {
    warningId: string;
    message: string;
    component?: string;
    severity: 'low' | 'medium' | 'high';
    recommendation?: string;
}
export interface ValidationError {
    errorId: string;
    message: string;
    component?: string;
    severity: 'recoverable' | 'fatal';
    stackTrace?: string;
    resolution?: string;
}
export interface ErrorHandlingStrategy {
    strategyId: string;
    name: string;
    errorTypes: string[];
    handlingProcedure: string;
    recoveryActions: string[];
    escalationRules: string[];
}
export interface ResourceRequirements {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    customResources?: Record<string, any>;
}
export interface ResourceLimits {
    maxCpu: number;
    maxMemory: number;
    maxStorage: number;
    maxNetwork: number;
    timeout: number;
}
export interface DataFlowStep {
    stepId: string;
    componentId: string;
    operation: string;
    latency: number;
    reliability: number;
}
export interface ComponentDependency {
    dependentComponent: string;
    dependsOnComponent: string;
    dependencyType: 'strong' | 'weak' | 'optional';
    criticality: 'low' | 'medium' | 'high' | 'critical';
}
export interface ValidationChain {
    chainId: string;
    validators: string[];
    executionOrder: 'sequential' | 'parallel';
    stopOnError: boolean;
}
export interface SerializationHandler {
    handlerId: string;
    format: string;
    serializer: string;
    deserializer: string;
    configuration: Record<string, any>;
}
export interface DataFlowController {
    controllerId: string;
    controlType: 'rate-limit' | 'circuit-breaker' | 'load-balancer' | 'custom';
    configuration: Record<string, any>;
}
export interface SynchronizationPoint {
    pointId: string;
    syncType: 'barrier' | 'checkpoint' | 'commit' | 'rollback';
    components: string[];
    timeout: number;
}
export interface ConflictResolver {
    resolverId: string;
    resolutionStrategy: 'last-write-wins' | 'first-write-wins' | 'merge' | 'custom';
    configuration: Record<string, any>;
}
export interface IntegrityChecker {
    checkerId: string;
    checkType: 'checksum' | 'hash' | 'signature' | 'custom';
    configuration: Record<string, any>;
}
export interface MockingFramework {
    frameworkId: string;
    frameworkType: 'stub' | 'mock' | 'spy' | 'fake';
    configuration: Record<string, any>;
}
export interface PerformanceMonitor {
    monitorId: string;
    monitorType: 'latency' | 'throughput' | 'memory' | 'cpu' | 'custom';
    configuration: Record<string, any>;
}
export interface ValidationEngine {
    engineId: string;
    validationType: 'schema' | 'business' | 'constraint' | 'custom';
    configuration: Record<string, any>;
}
export interface EventDefinition {
    eventId: string;
    eventName: string;
    eventType: string;
    payload: Record<string, any>;
}
export interface MethodDefinition {
    methodId: string;
    methodName: string;
    parameters: ParameterDefinition[];
    returnType: string;
    documentation: string;
}
export interface UnitTest {
    testId: string;
    testName: string;
    testLogic: string;
    expectedResult: any;
}
export interface IntegrationTest {
    testId: string;
    testName: string;
    components: string[];
    testScenario: string;
    expectedResult: any;
}
export interface PerformanceTest {
    testId: string;
    testName: string;
    performanceTarget: Record<string, any>;
    testDuration: number;
}
export interface SecurityTest {
    testId: string;
    testName: string;
    securityScenario: string;
    expectedSecurityLevel: string;
}
export interface TestSetUp {
    setupSteps: string[];
    requiredResources: string[];
    configuration: Record<string, any>;
}
export interface TestTearDown {
    tearDownSteps: string[];
    cleanupActions: string[];
    resourceRelease: string[];
}
export interface TestEnvironment {
    environmentId: string;
    environmentType: 'local' | 'staging' | 'production' | 'custom';
    configuration: Record<string, any>;
}
export interface MockingStrategy {
    strategyId: string;
    mockingLevel: 'none' | 'partial' | 'full';
    mockingTargets: string[];
    configuration: Record<string, any>;
}
export interface TestPreconditions {
    preconditions: string[];
    requiredState: Record<string, any>;
    dependencies: string[];
}
export interface TestActions {
    actions: string[];
    parameters: Record<string, any>;
    sequence: number[];
}
export interface TestAssertions {
    assertions: string[];
    expectedResults: Record<string, any>;
    tolerances: Record<string, any>;
}
export interface TestCleanup {
    cleanupActions: string[];
    stateReset: Record<string, any>;
    resourceCleanup: string[];
}
export interface TestDouble {
    doubleId: string;
    doubleType: 'stub' | 'mock' | 'spy' | 'fake';
    target: string;
    behavior: Record<string, any>;
}
export interface TestFixture {
    fixtureId: string;
    fixtureType: 'data' | 'configuration' | 'environment';
    content: Record<string, any>;
}
export interface TestExecution {
    executionId: string;
    startTime: Date;
    endTime: Date;
    result: 'passed' | 'failed' | 'skipped' | 'error';
    details: Record<string, any>;
}
export interface TestResult {
    result: 'passed' | 'failed' | 'skipped' | 'error';
    message?: string;
    duration: number;
    details?: Record<string, any>;
}
export interface TestPerformance {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput?: number;
}
export interface TestReliability {
    successRate: number;
    failureRate: number;
    flakiness: number;
    stability: number;
}
export interface TestGroupResult {
    groupId: string;
    result: 'passed' | 'failed' | 'partial';
    details: TestResult[];
    duration: number;
}
export interface FailureAnalysis {
    failureId: string;
    failureType: string;
    rootCause: string;
    impact: string;
    resolution: string;
}
export interface PerformanceAnalysis {
    metricName: string;
    actualValue: number;
    expectedValue: number;
    threshold: number;
    status: 'good' | 'warning' | 'critical';
}
export interface CachingStrategy {
    strategyType: 'none' | 'memory' | 'disk' | 'distributed' | 'custom';
    configuration: Record<string, any>;
    ttl?: number;
    maxSize?: number;
}
export interface PartitioningStrategy {
    strategyType: 'none' | 'hash' | 'range' | 'round-robin' | 'custom';
    configuration: Record<string, any>;
    partitionCount?: number;
}
export interface LoadBalancingStrategy {
    strategyType: 'round-robin' | 'weighted' | 'least-connections' | 'custom';
    configuration: Record<string, any>;
    weights?: Record<string, number>;
}
export interface ResourceAllocation {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    customResources: Record<string, any>;
}
export interface RetryPolicy {
    maxRetries: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear' | 'custom';
    initialDelay: number;
    maxDelay: number;
    retryableErrors: string[];
}
export interface MonitoringConfiguration {
    metricsCollection: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    alerting: boolean;
    dashboards: string[];
}
export interface SchemaConstraint {
    constraintId: string;
    constraintType: 'required' | 'unique' | 'format' | 'range' | 'custom';
    definition: Record<string, any>;
}
export interface ConditionExpression {
    expressionId: string;
    condition: string;
    parameters: Record<string, any>;
    evaluation: 'boolean' | 'numeric' | 'string' | 'custom';
}
export interface MappingTestCase {
    testCaseId: string;
    input: Record<string, any>;
    expectedOutput: Record<string, any>;
    description: string;
}
export interface QualityMetric {
    metricId: string;
    metricName: string;
    value: number;
    target: number;
    status: 'good' | 'warning' | 'critical';
}
export interface RuleTestCase {
    testCaseId: string;
    input: Record<string, any>;
    expectedOutput: Record<string, any>;
    conditions: Record<string, any>;
}
export interface StepTestCase {
    testCaseId: string;
    stepInput: Record<string, any>;
    stepOutput: Record<string, any>;
    stepState: Record<string, any>;
}
export interface ComponentCoverage {
    componentId: string;
    coveragePercentage: number;
    testedMethods: string[];
    untestedMethods: string[];
}
export interface IntegrationCoverage {
    integrationId: string;
    coveragePercentage: number;
    testedPaths: string[];
    untestedPaths: string[];
}
export interface DataFlowCoverage {
    flowId: string;
    coveragePercentage: number;
    testedScenarios: string[];
    untestedScenarios: string[];
}
export interface ErrorScenarioCoverage {
    scenarioId: string;
    coveragePercentage: number;
    testedErrors: string[];
    untestedErrors: string[];
}
export interface ResourceUsage {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
    duration: number;
}
export interface TestScheduling {
    scheduleType: 'manual' | 'automatic' | 'periodic' | 'event-driven';
    configuration: Record<string, any>;
    triggers: string[];
}
export interface ResultAnalysis {
    analysisType: 'automatic' | 'manual' | 'hybrid';
    reportGeneration: boolean;
    trendAnalysis: boolean;
    configuration: Record<string, any>;
}
export interface TestDependency {
    dependentTest: string;
    dependsOnTest: string;
    dependencyType: 'hard' | 'soft' | 'optional';
}
export interface TestReporting {
    reportFormats: string[];
    reportTargets: string[];
    reportSchedule: string;
    configuration: Record<string, any>;
}
export default ParameterFlowConfig;
//# sourceMappingURL=index.d.ts.map