/**
 * Vercel-Native Architecture Agent - Type Definitions
 *
 * The PRODUCTION BUILDER for Native Vercel Deployment Systems
 * Following All-Purpose Pattern: NO hardcoded limitations on deployment complexity
 */
export interface VercelNativeConfig {
    projectRoot?: string;
    outputDirectory?: string;
    deploymentDirectory?: string;
    vercelIntegration?: {
        teamId?: string;
        projectId?: string;
        token?: string;
        apiEndpoint?: string;
        maxDeploymentSize?: number | 'unlimited';
        maxFunctionSize?: number | 'unlimited';
        maxFunctionDuration?: number | 'unlimited';
        enableAnalytics?: boolean;
        enableSpeedInsights?: boolean;
        enableEdgeFunctions?: boolean;
        enableCronJobs?: boolean;
    };
    serverlessArchitecture?: {
        supportedRuntimes?: string[];
        functionStrategies?: string[];
        edgeStrategies?: string[];
        cachingStrategies?: string[];
        optimizationLevels?: string[];
    };
    productionDeployment?: {
        deploymentStrategies?: string[];
        environmentTypes?: string[];
        domainStrategies?: string[];
        certificateManagement?: string[];
        monitoringLevels?: string[];
    };
    performanceOptimization?: {
        maxConcurrentDeployments?: number | 'unlimited';
        maxBuildParallelism?: number | 'unlimited';
        maxOptimizationPasses?: number | 'unlimited';
        enableBundleAnalysis?: boolean;
        enablePerformanceMonitoring?: boolean;
        enableCDNOptimization?: boolean;
    };
    metaAgentCoordination?: {
        supportedAgents?: string[];
        coordinationPatterns?: string[];
        communicationProtocols?: string[];
        dataExchangeFormats?: string[];
        errorHandlingStrategies?: string[];
    };
    customConfiguration?: Record<string, any>;
    pluginConfiguration?: Record<string, any>;
    advancedSettings?: Record<string, any>;
}
export interface VercelArchitecture {
    architectureId: string;
    name: string;
    description: string;
    version: string;
    project: {
        projectId: string;
        teamId?: string;
        name: string;
        framework: string;
        buildCommand?: string;
        outputDirectory?: string;
        installCommand?: string;
        devCommand?: string;
        environment: EnvironmentVariable[];
        domains: DomainConfiguration[];
    };
    functions: {
        apiFunctions: ApiFunction[];
        edgeFunctions: EdgeFunction[];
        cronFunctions: CronFunction[];
        middlewareFunctions: MiddlewareFunction[];
    };
    routing: {
        staticRoutes: StaticRoute[];
        dynamicRoutes: DynamicRoute[];
        redirects: RedirectRule[];
        rewrites: RewriteRule[];
        headers: HeaderRule[];
    };
    optimization: {
        buildOptimizations: BuildOptimization[];
        runtimeOptimizations: RuntimeOptimization[];
        cdnConfiguration: CDNConfiguration;
        cacheStrategies: CacheStrategy[];
        compressionSettings: CompressionSettings;
    };
    monitoring: {
        analyticsConfiguration: AnalyticsConfiguration;
        speedInsightsConfiguration: SpeedInsightsConfiguration;
        logConfiguration: LogConfiguration;
        alertConfiguration: AlertConfiguration[];
        performanceMetrics: PerformanceMetric[];
    };
    security: {
        certificateConfiguration: CertificateConfiguration[];
        securityHeaders: SecurityHeader[];
        authenticationStrategies: AuthenticationStrategy[];
        dataProtectionSettings: DataProtectionSettings;
    };
    deployment: {
        deploymentStrategies: DeploymentStrategy[];
        buildConfiguration: BuildConfiguration;
        previewConfiguration: PreviewConfiguration;
        productionConfiguration: ProductionConfiguration;
        rollbackConfiguration: RollbackConfiguration;
    };
}
export interface ApiFunction {
    functionId: string;
    name: string;
    path: string;
    runtime: 'nodejs18.x' | 'nodejs20.x' | 'python3.9' | 'python3.11' | 'go1.x' | 'custom';
    handler: string;
    configuration: {
        timeout?: number;
        memory?: number;
        maxDuration?: number;
        regions?: string[];
        environment?: Record<string, string>;
        secrets?: string[];
    };
    performance: {
        concurrency?: number;
        reservedConcurrency?: number;
        coldStartOptimization?: boolean;
        bundleOptimization?: boolean;
        treeshaking?: boolean;
        minification?: boolean;
    };
    integration: {
        databases?: DatabaseConnection[];
        kvStores?: KVConnection[];
        blobStores?: BlobConnection[];
        queueConnections?: QueueConnection[];
        externalApis?: ExternalApiConnection[];
    };
    monitoring: {
        loggingLevel?: 'debug' | 'info' | 'warn' | 'error';
        tracing?: boolean;
        metrics?: string[];
        alerts?: AlertRule[];
    };
}
export interface EdgeFunction {
    functionId: string;
    name: string;
    path: string;
    runtime: 'edge-runtime';
    configuration: {
        regions?: 'all' | string[];
        timeout?: number;
        memory?: number;
        environment?: Record<string, string>;
    };
    capabilities: {
        geolocation?: boolean;
        userAgent?: boolean;
        ipAddress?: boolean;
        requestModification?: boolean;
        responseModification?: boolean;
        caching?: boolean;
    };
    optimization: {
        minimumBundle?: boolean;
        streamingResponse?: boolean;
        edgeCache?: boolean;
        compressionLevel?: number;
    };
}
export interface CronFunction {
    functionId: string;
    name: string;
    schedule: string;
    timezone?: string;
    function: {
        path: string;
        runtime: string;
        handler: string;
        timeout?: number;
        memory?: number;
        environment?: Record<string, string>;
    };
    execution: {
        maxConcurrency?: number;
        retryPolicy?: RetryPolicy;
        failureHandling?: FailureHandling;
        monitoringEnabled?: boolean;
    };
}
export interface MiddlewareFunction {
    functionId: string;
    name: string;
    matcher: string | string[];
    configuration: {
        runtime: 'edge-runtime';
        regions?: 'all' | string[];
        priority?: number;
        conditions?: MiddlewareCondition[];
    };
    capabilities: {
        requestInterception?: boolean;
        responseModification?: boolean;
        redirectHandling?: boolean;
        headerManipulation?: boolean;
        cookieManagement?: boolean;
        authenticationIntegration?: boolean;
    };
}
export interface StaticRoute {
    routeId: string;
    path: string;
    filePath: string;
    configuration: {
        cacheControl?: string;
        compression?: boolean;
        headers?: Record<string, string>;
        mimeType?: string;
    };
    optimization: {
        minification?: boolean;
        compression?: 'gzip' | 'brotli' | 'both';
        cdnCaching?: boolean;
        edgeCaching?: boolean;
    };
}
export interface DynamicRoute {
    routeId: string;
    pattern: string;
    functionPath: string;
    configuration: {
        methods?: string[];
        headers?: Record<string, string>;
        middleware?: string[];
        rateLimit?: RateLimit;
    };
    performance: {
        caching?: CacheConfiguration;
        prerendering?: boolean;
        incrementalStaticRegeneration?: ISRConfiguration;
    };
}
export interface DomainConfiguration {
    domainId: string;
    domain: string;
    type: 'apex' | 'subdomain' | 'wildcard';
    ssl: {
        certificateType: 'automatic' | 'custom' | 'letsencrypt';
        customCertificate?: CustomCertificate;
        enforceHttps?: boolean;
        minTlsVersion?: '1.0' | '1.1' | '1.2' | '1.3';
    };
    dns: {
        provider?: string;
        records?: DNSRecord[];
        cdnConfiguration?: CDNConfiguration;
    };
    security: {
        ddosProtection?: boolean;
        wafConfiguration?: WAFConfiguration;
        rateLimiting?: RateLimit;
        geoBlocking?: GeoBlockingConfiguration;
    };
}
export interface BuildConfiguration {
    buildId: string;
    settings: {
        framework?: string;
        buildCommand?: string;
        installCommand?: string;
        outputDirectory?: string;
        publicDirectory?: string;
        nodeVersion?: string;
        packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
    };
    optimizations: {
        parallelism?: number | 'unlimited';
        caching?: boolean;
        incrementalBuilds?: boolean;
        dependencyAnalysis?: boolean;
        treeShaking?: boolean;
        codesplitting?: boolean;
        bundleAnalysis?: boolean;
    };
    environment: {
        variables?: Record<string, string>;
        secrets?: string[];
        buildEnvironment?: 'nodejs18.x' | 'nodejs20.x' | 'custom';
        customDockerfile?: string;
    };
    hooks: {
        preBuild?: BuildHook[];
        postBuild?: BuildHook[];
        preInstall?: BuildHook[];
        postInstall?: BuildHook[];
    };
}
export interface DeploymentStrategy {
    strategyId: string;
    name: string;
    type: 'production' | 'preview' | 'development';
    configuration: {
        autoDeployment?: boolean;
        branchPatterns?: string[];
        environmentTriggers?: string[];
        manualApproval?: boolean;
        rollbackPolicy?: RollbackPolicy;
    };
    preDeploymentChecks: {
        buildTests?: boolean;
        linting?: boolean;
        typeChecking?: boolean;
        securityScanning?: boolean;
        performanceTesting?: boolean;
        customChecks?: CustomCheck[];
    };
    postDeploymentActions: {
        healthChecks?: HealthCheck[];
        smokeTesting?: boolean;
        performanceValidation?: boolean;
        monitoringSetup?: boolean;
        notificationSending?: boolean;
        customActions?: CustomAction[];
    };
}
export interface ProductionConfiguration {
    configurationId: string;
    settings: {
        domains?: string[];
        environmentVariables?: Record<string, string>;
        functionConfiguration?: FunctionConfiguration;
        cacheConfiguration?: CacheConfiguration;
        securityConfiguration?: SecurityConfiguration;
    };
    performance: {
        latencyTargets?: LatencyTarget[];
        throughputTargets?: ThroughputTarget[];
        availabilityTargets?: AvailabilityTarget[];
        scalingPolicies?: ScalingPolicy[];
    };
    monitoring: {
        metricsCollection?: MetricsConfiguration;
        alertingRules?: AlertRule[];
        dashboardConfiguration?: DashboardConfiguration;
        logAggregation?: LogAggregationConfiguration;
    };
}
export interface BuildOptimization {
    optimizationId: string;
    name: string;
    type: 'bundle' | 'asset' | 'code' | 'dependency' | 'custom';
    settings: {
        enabled?: boolean;
        priority?: number;
        conditions?: OptimizationCondition[];
        parameters?: Record<string, any>;
    };
    impact: {
        buildTimeReduction?: number;
        bundleSizeReduction?: number;
        runtimePerformanceGain?: number;
        memoryUsageReduction?: number;
    };
    configuration: {
        aggressiveness?: 'low' | 'medium' | 'high' | 'maximum';
        compatibilityMode?: boolean;
        fallbackStrategy?: string;
        customRules?: OptimizationRule[];
    };
}
export interface RuntimeOptimization {
    optimizationId: string;
    name: string;
    type: 'function' | 'edge' | 'static' | 'database' | 'custom';
    settings: {
        enabled?: boolean;
        autoScaling?: boolean;
        coldStartOptimization?: boolean;
        memoryOptimization?: boolean;
        cpuOptimization?: boolean;
    };
    caching: {
        functionCaching?: boolean;
        responseCaching?: boolean;
        staticAssetCaching?: boolean;
        databaseCaching?: boolean;
        customCaching?: CacheRule[];
    };
    monitoring: {
        performanceTracking?: boolean;
        errorTracking?: boolean;
        resourceMonitoring?: boolean;
        customMetrics?: CustomMetric[];
    };
}
export interface CacheStrategy {
    strategyId: string;
    name: string;
    type: 'static' | 'dynamic' | 'function' | 'edge' | 'custom';
    configuration: {
        ttl?: number;
        maxAge?: number;
        staleWhileRevalidate?: number;
        mustRevalidate?: boolean;
        varyHeaders?: string[];
    };
    rules: {
        pathPatterns?: string[];
        headerConditions?: HeaderCondition[];
        queryParamHandling?: 'ignore' | 'include' | 'custom';
        customConditions?: CacheCondition[];
    };
    performance: {
        compressionEnabled?: boolean;
        minificationEnabled?: boolean;
        optimizationLevel?: 'low' | 'medium' | 'high' | 'maximum';
        edgeLocationCount?: number | 'unlimited';
    };
}
export interface AnalyticsConfiguration {
    configurationId: string;
    settings: {
        enabled?: boolean;
        dataCollection?: 'minimal' | 'standard' | 'comprehensive' | 'unlimited';
        retentionPeriod?: number;
        samplingRate?: number;
    };
    events: {
        pageViews?: boolean;
        customEvents?: boolean;
        performanceMetrics?: boolean;
        errorTracking?: boolean;
        userJourney?: boolean;
        conversionTracking?: boolean;
    };
    dataExport: {
        exportFormats?: string[];
        exportSchedule?: string;
        exportDestinations?: ExportDestination[];
        dataWarehouseIntegration?: boolean;
    };
}
export interface SpeedInsightsConfiguration {
    configurationId: string;
    settings: {
        enabled?: boolean;
        realUserMonitoring?: boolean;
        syntheticMonitoring?: boolean;
        performanceBudgets?: PerformanceBudget[];
    };
    metrics: {
        coreWebVitals?: boolean;
        loadingMetrics?: boolean;
        interactivityMetrics?: boolean;
        visualStabilityMetrics?: boolean;
        customMetrics?: CustomPerformanceMetric[];
    };
    alerting: {
        performanceDegradationAlerts?: boolean;
        budgetExceededAlerts?: boolean;
        customAlerts?: PerformanceAlert[];
    };
}
export interface LogConfiguration {
    configurationId: string;
    settings: {
        level?: 'debug' | 'info' | 'warn' | 'error';
        retention?: number;
        compression?: boolean;
        encryption?: boolean;
    };
    sources: {
        functionLogs?: boolean;
        edgeLogs?: boolean;
        buildLogs?: boolean;
        deploymentLogs?: boolean;
        accessLogs?: boolean;
        errorLogs?: boolean;
    };
    processing: {
        structuredLogging?: boolean;
        logParsing?: boolean;
        logEnrichment?: boolean;
        customProcessing?: LogProcessor[];
    };
    destinations: {
        vercelLogs?: boolean;
        externalLoggers?: ExternalLogger[];
        dataWarehouse?: boolean;
        customDestinations?: LogDestination[];
    };
}
export interface SecurityConfiguration {
    configurationId: string;
    settings: {
        httpsEnforcement?: boolean;
        hstsEnabled?: boolean;
        corsConfiguration?: CORSConfiguration;
        cspConfiguration?: CSPConfiguration;
        rateLimiting?: RateLimit;
    };
    authentication: {
        strategies?: AuthenticationStrategy[];
        sessionManagement?: SessionConfiguration;
        tokenManagement?: TokenConfiguration;
        multiFactorAuthentication?: MFAConfiguration;
    };
    dataProtection: {
        encryption?: EncryptionConfiguration;
        dataRetention?: DataRetentionPolicy[];
        privacyControls?: PrivacyControl[];
        complianceStandards?: ComplianceStandard[];
    };
    threatProtection: {
        ddosProtection?: DDoSProtectionConfiguration;
        wafConfiguration?: WAFConfiguration;
        botProtection?: BotProtectionConfiguration;
        vulnerabilityScanning?: VulnerabilityScanning;
    };
}
export interface CertificateConfiguration {
    certificateId: string;
    type: 'automatic' | 'custom' | 'letsencrypt';
    domains: string[];
    settings: {
        autoRenewal?: boolean;
        renewalThreshold?: number;
        validationMethod?: 'dns' | 'http' | 'email';
        keySize?: 2048 | 4096;
    };
    customCertificate?: {
        certificate: string;
        privateKey: string;
        intermediateChain?: string;
        passphrase?: string;
    };
    monitoring: {
        expirationAlerts?: boolean;
        validationMonitoring?: boolean;
        securityScanning?: boolean;
    };
}
export interface DatabaseConnection {
    connectionId: string;
    type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'custom';
    provider: 'vercel' | 'planetscale' | 'supabase' | 'mongodb-atlas' | 'upstash' | 'custom';
    configuration: {
        connectionString?: string;
        host?: string;
        port?: number;
        database?: string;
        username?: string;
        password?: string;
        ssl?: boolean;
        pooling?: PoolingConfiguration;
    };
    performance: {
        connectionPoolSize?: number;
        queryTimeout?: number;
        connectionTimeout?: number;
        maxConnections?: number;
        caching?: boolean;
    };
    security: {
        encryption?: boolean;
        authenticationMethod?: string;
        certificateValidation?: boolean;
        ipWhitelist?: string[];
    };
}
export interface KVConnection {
    connectionId: string;
    provider: 'vercel-kv' | 'upstash' | 'redis' | 'custom';
    configuration: {
        endpoint?: string;
        token?: string;
        database?: number;
        keyPrefix?: string;
        serialization?: 'json' | 'msgpack' | 'custom';
    };
    performance: {
        maxConnections?: number;
        commandTimeout?: number;
        pipelining?: boolean;
        compression?: boolean;
    };
    usage: {
        caching?: boolean;
        sessionStorage?: boolean;
        rateLimit?: boolean;
        featureFlags?: boolean;
        customUsage?: string[];
    };
}
export interface BlobConnection {
    connectionId: string;
    provider: 'vercel-blob' | 's3' | 'gcs' | 'azure-blob' | 'custom';
    configuration: {
        endpoint?: string;
        token?: string;
        bucket?: string;
        region?: string;
        accessKey?: string;
        secretKey?: string;
    };
    storage: {
        maxFileSize?: number;
        allowedMimeTypes?: string[];
        storageClass?: string;
        encryption?: boolean;
        versioning?: boolean;
    };
    access: {
        publicRead?: boolean;
        signedUrls?: boolean;
        expirationTime?: number;
        accessPolicies?: AccessPolicy[];
    };
}
export interface VercelArchitectureResult {
    success: boolean;
    architectureId: string;
    generatedArchitecture: VercelArchitecture;
    generation: {
        startTime: Date;
        endTime: Date;
        duration: number;
        functionsCreated: number;
        routesConfigured: number;
        optimizationsApplied: number;
    };
    quality: {
        architectureScore: number;
        performanceScore: number;
        securityScore: number;
        scalabilityScore: number;
        vercelBestPracticesCompliance: number;
        allPurposePatternCompliance: number;
    };
    deployment: {
        readyForDeployment: boolean;
        deploymentInstructions: string[];
        preDeploymentChecks: DeploymentCheck[];
        estimatedDeploymentTime: number;
    };
    performance: {
        expectedLatency: PerformancePrediction;
        expectedThroughput: PerformancePrediction;
        expectedCost: CostPrediction;
        scalingCapabilities: ScalingPrediction;
    };
    security: {
        securityAssessment: SecurityAssessment;
        vulnerabilities: SecurityVulnerability[];
        recommendations: SecurityRecommendation[];
    };
    warnings: VercelWarning[];
    errors: VercelError[];
    recommendations: string[];
}
export interface DeploymentResult {
    success: boolean;
    deploymentId: string;
    deploymentUrl: string;
    deployment: {
        startTime: Date;
        endTime: Date;
        duration: number;
        strategy: string;
        environment: string;
        version: string;
    };
    build: {
        buildId: string;
        buildTime: number;
        optimizationsApplied: string[];
        bundleSize: number;
        warnings: BuildWarning[];
        errors: BuildError[];
    };
    functions: {
        deployed: FunctionDeployment[];
        failed: FailedFunctionDeployment[];
        totalCount: number;
        successRate: number;
    };
    performance: {
        coldStartTime: number;
        firstResponseTime: number;
        buildPerformance: BuildPerformance;
        runtimePerformance: RuntimePerformance;
    };
    monitoring: {
        analyticsEnabled: boolean;
        loggingEnabled: boolean;
        alertsConfigured: number;
        dashboardsCreated: number;
    };
}
export interface OptimizationResult {
    success: boolean;
    optimizationId: string;
    optimization: {
        type: string;
        startTime: Date;
        endTime: Date;
        duration: number;
        optimizationsApplied: OptimizationApplication[];
    };
    improvements: {
        buildTimeReduction: number;
        bundleSizeReduction: number;
        runtimePerformanceGain: number;
        memoryUsageReduction: number;
        coldStartReduction: number;
    };
    costImpact: {
        buildCostReduction: number;
        runtimeCostReduction: number;
        bandwidthCostReduction: number;
        totalCostReduction: number;
    };
    quality: {
        codeQualityScore: number;
        performanceScore: number;
        maintainabilityScore: number;
        reliabilityScore: number;
    };
}
export interface VercelNativeCapabilities {
    name: string;
    version: string;
    coreCapabilities: {
        vercelDeployment: string[];
        serverlessArchitecture: string[];
        productionOptimization: string[];
        performanceMonitoring: string[];
    };
    vercelCapabilities: {
        maxDeploymentComplexity: 'unlimited';
        supportedRuntimes: string[];
        supportedFrameworks: string[];
        supportedOptimizations: string[];
    };
    productionCapabilities: {
        maxScalingCapacity: 'unlimited';
        maxPerformanceOptimization: 'unlimited';
        maxMonitoringComplexity: 'unlimited';
        supportedDeploymentStrategies: string[];
    };
    metaAgentCoordination: {
        supportedAgents: string[];
        coordinationPatterns: string[];
        communicationProtocols: string[];
        dataExchangeFormats: string[];
    };
    performance: {
        maxConcurrentDeployments: 'unlimited';
        maxOptimizationPasses: 'unlimited';
        maxMonitoringMetrics: 'unlimited';
        scalingSupport: string[];
    };
    qualityAssurance: {
        validationLevels: string[];
        testingStrategies: string[];
        monitoringCapabilities: string[];
        alertingCapabilities: string[];
    };
    extensibility: {
        customDeployments: boolean;
        customOptimizations: boolean;
        customMonitoring: boolean;
        pluginSupport: boolean;
        apiExtensions: string[];
    };
}
export interface EnvironmentVariable {
    key: string;
    value: string;
    type: 'plain' | 'secret' | 'system';
    target: 'production' | 'preview' | 'development' | 'all';
}
export interface RedirectRule {
    source: string;
    destination: string;
    statusCode?: 301 | 302 | 307 | 308;
    permanent?: boolean;
}
export interface RewriteRule {
    source: string;
    destination: string;
    locale?: boolean;
    has?: RouteCondition[];
}
export interface HeaderRule {
    source: string;
    headers: Header[];
    has?: RouteCondition[];
}
export interface Header {
    key: string;
    value: string;
}
export interface RouteCondition {
    type: 'header' | 'cookie' | 'query' | 'host';
    key: string;
    value?: string;
}
export interface RetryPolicy {
    maxRetries: number;
    backoffStrategy: 'fixed' | 'exponential' | 'linear';
    initialDelay: number;
    maxDelay: number;
    retryableErrors: string[];
}
export interface FailureHandling {
    strategy: 'fail-fast' | 'retry' | 'skip' | 'fallback';
    fallbackFunction?: string;
    alertOnFailure?: boolean;
    maxFailureRate?: number;
}
export interface MiddlewareCondition {
    type: 'path' | 'header' | 'cookie' | 'query' | 'method';
    key?: string;
    value?: string;
    operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
}
export interface RateLimit {
    requests: number;
    window: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: string;
}
export interface ISRConfiguration {
    revalidate: number;
    fallback?: boolean | 'blocking';
    tags?: string[];
}
export interface CustomCertificate {
    certificate: string;
    privateKey: string;
    chain?: string;
}
export interface DNSRecord {
    type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV';
    name: string;
    value: string;
    ttl?: number;
    priority?: number;
}
export interface CDNConfiguration {
    provider: 'vercel' | 'cloudflare' | 'aws' | 'custom';
    caching: CacheConfiguration;
    compression: boolean;
    minification: boolean;
    edgeLocations: string[] | 'all';
}
export interface WAFConfiguration {
    enabled: boolean;
    rulesets: string[];
    customRules: WAFRule[];
    blockingMode: boolean;
    logMode: boolean;
}
export interface GeoBlockingConfiguration {
    enabled: boolean;
    allowedCountries: string[];
    blockedCountries: string[];
    fallbackBehavior: 'block' | 'allow';
}
export interface CacheConfiguration {
    enabled: boolean;
    ttl: number;
    maxAge?: number;
    staleWhileRevalidate?: number;
    tags?: string[];
    varyBy?: string[];
}
export interface BuildHook {
    command: string;
    workingDirectory?: string;
    environment?: Record<string, string>;
    timeout?: number;
    continueOnError?: boolean;
}
export interface RollbackPolicy {
    enabled: boolean;
    automaticRollback: boolean;
    rollbackTriggers: string[];
    maxRollbackAttempts: number;
    rollbackTimeout: number;
}
export interface CustomCheck {
    name: string;
    command: string;
    workingDirectory?: string;
    timeout?: number;
    failOnError: boolean;
}
export interface CustomAction {
    name: string;
    command: string;
    workingDirectory?: string;
    timeout?: number;
    environment?: Record<string, string>;
}
export interface HealthCheck {
    path: string;
    method?: 'GET' | 'POST' | 'HEAD';
    expectedStatus?: number;
    expectedBody?: string;
    timeout?: number;
    interval?: number;
}
export interface FunctionConfiguration {
    runtime?: string;
    memory?: number;
    timeout?: number;
    environment?: Record<string, string>;
    regions?: string[];
}
export interface LatencyTarget {
    metric: string;
    percentile: number;
    target: number;
    tolerance: number;
}
export interface ThroughputTarget {
    metric: string;
    target: number;
    tolerance: number;
}
export interface AvailabilityTarget {
    target: number;
    measurement: 'uptime' | 'successful-requests';
    window: number;
}
export interface ScalingPolicy {
    metric: string;
    threshold: number;
    action: 'scale-up' | 'scale-down';
    cooldown: number;
}
export interface MetricsConfiguration {
    enabled: boolean;
    retention: number;
    granularity: number;
    customMetrics: string[];
}
export interface AlertRule {
    name: string;
    condition: string;
    threshold: number;
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
    duration: number;
    channels: string[];
}
export interface DashboardConfiguration {
    name: string;
    widgets: DashboardWidget[];
    refreshInterval: number;
    timeRange: string;
}
export interface LogAggregationConfiguration {
    enabled: boolean;
    sources: string[];
    filters: LogFilter[];
    destinations: string[];
}
export interface OptimizationCondition {
    type: 'file-size' | 'build-time' | 'bundle-size' | 'runtime-performance';
    operator: 'gt' | 'lt' | 'gte' | 'lte';
    value: number;
}
export interface OptimizationRule {
    name: string;
    condition: OptimizationCondition;
    action: string;
    parameters: Record<string, any>;
}
export interface CacheRule {
    pattern: string;
    ttl: number;
    maxAge?: number;
    conditions?: CacheCondition[];
}
export interface CustomMetric {
    name: string;
    type: 'counter' | 'gauge' | 'histogram' | 'summary';
    description: string;
    labels?: string[];
}
export interface HeaderCondition {
    header: string;
    value: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
}
export interface CacheCondition {
    type: 'path' | 'header' | 'query' | 'method' | 'status';
    key?: string;
    value?: string;
    operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
}
export interface ExportDestination {
    type: 'webhook' | 's3' | 'gcs' | 'azure-blob' | 'custom';
    endpoint: string;
    authentication?: Record<string, string>;
    format: 'json' | 'csv' | 'parquet';
}
export interface PerformanceBudget {
    metric: string;
    budget: number;
    unit: string;
    alertThreshold?: number;
}
export interface CustomPerformanceMetric {
    name: string;
    description: string;
    unit: string;
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}
export interface PerformanceAlert {
    name: string;
    condition: string;
    threshold: number;
    duration: number;
    channels: string[];
}
export interface LogProcessor {
    name: string;
    type: 'parser' | 'filter' | 'enricher' | 'transformer';
    configuration: Record<string, any>;
}
export interface ExternalLogger {
    name: string;
    type: 'datadog' | 'newrelic' | 'splunk' | 'elastic' | 'custom';
    endpoint: string;
    authentication: Record<string, string>;
    format: string;
}
export interface LogDestination {
    name: string;
    type: 'webhook' | 'syslog' | 'database' | 'file' | 'custom';
    configuration: Record<string, any>;
}
export interface CORSConfiguration {
    origin: string | string[] | boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge?: number;
}
export interface CSPConfiguration {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
    reportUri?: string;
}
export interface AuthenticationStrategy {
    name: string;
    type: 'oauth' | 'jwt' | 'basic' | 'api-key' | 'custom';
    configuration: Record<string, any>;
    providers?: string[];
}
export interface SessionConfiguration {
    storage: 'memory' | 'database' | 'redis' | 'jwt';
    expiration: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
}
export interface TokenConfiguration {
    algorithm: string;
    expiration: number;
    issuer?: string;
    audience?: string;
    secretRotation?: boolean;
}
export interface MFAConfiguration {
    enabled: boolean;
    methods: string[];
    required: boolean;
    backupCodes: boolean;
}
export interface EncryptionConfiguration {
    algorithm: string;
    keySize: number;
    atRest: boolean;
    inTransit: boolean;
    keyRotation: boolean;
}
export interface DataRetentionPolicy {
    dataType: string;
    retention: number;
    archiving: boolean;
    anonymization: boolean;
}
export interface PrivacyControl {
    type: string;
    enabled: boolean;
    configuration: Record<string, any>;
}
export interface ComplianceStandard {
    name: string;
    version: string;
    requirements: string[];
    assessmentDate?: Date;
}
export interface DDoSProtectionConfiguration {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    customRules: DDoSRule[];
    rateLimits: RateLimit[];
}
export interface BotProtectionConfiguration {
    enabled: boolean;
    challenge: 'captcha' | 'javascript' | 'invisible';
    whitelist: string[];
    blacklist: string[];
}
export interface VulnerabilityScanning {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    scope: string[];
    alerts: boolean;
}
export interface PoolingConfiguration {
    minConnections: number;
    maxConnections: number;
    acquireTimeout: number;
    idleTimeout: number;
    reapInterval: number;
}
export interface AccessPolicy {
    principal: string;
    actions: string[];
    resources: string[];
    conditions?: Record<string, any>;
}
export interface PerformancePrediction {
    min: number;
    max: number;
    average: number;
    percentile95: number;
    percentile99: number;
    unit: string;
}
export interface CostPrediction {
    monthly: CostBreakdown;
    perRequest: number;
    scalingCosts: ScalingCost[];
}
export interface CostBreakdown {
    functions: number;
    bandwidth: number;
    builds: number;
    monitoring: number;
    storage: number;
    total: number;
}
export interface ScalingCost {
    scale: string;
    monthlyCost: number;
    costPerRequest: number;
}
export interface ScalingPrediction {
    horizontal: ScalingCapability;
    vertical: ScalingCapability;
    geographic: ScalingCapability;
}
export interface ScalingCapability {
    supported: boolean;
    maxScale: number | 'unlimited';
    scaleTime: number;
    limitations: string[];
}
export interface SecurityAssessment {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    categories: SecurityCategory[];
}
export interface SecurityCategory {
    name: string;
    score: number;
    issues: number;
    recommendations: string[];
}
export interface SecurityVulnerability {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    remediation: string;
}
export interface SecurityRecommendation {
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    implementation: string;
}
export interface VercelWarning {
    warningId: string;
    message: string;
    component?: string;
    severity: 'low' | 'medium' | 'high';
    recommendation?: string;
}
export interface VercelError {
    errorId: string;
    message: string;
    component?: string;
    severity: 'recoverable' | 'fatal';
    stackTrace?: string;
    resolution?: string;
}
export interface DeploymentCheck {
    name: string;
    status: 'passed' | 'failed' | 'warning';
    message: string;
    duration: number;
}
export interface FunctionDeployment {
    functionId: string;
    name: string;
    runtime: string;
    size: number;
    regions: string[];
    status: 'deployed' | 'failed';
}
export interface FailedFunctionDeployment {
    functionId: string;
    name: string;
    error: string;
    reason: string;
    suggestions: string[];
}
export interface BuildWarning {
    warningId: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
}
export interface BuildError {
    errorId: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    stack?: string;
}
export interface BuildPerformance {
    totalTime: number;
    installTime: number;
    buildTime: number;
    optimizationTime: number;
    cacheHitRate: number;
}
export interface RuntimePerformance {
    coldStartTime: number;
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
}
export interface OptimizationApplication {
    type: string;
    name: string;
    applied: boolean;
    impact: OptimizationImpact;
    duration: number;
}
export interface OptimizationImpact {
    buildTime?: number;
    bundleSize?: number;
    runtime?: number;
    memory?: number;
}
export interface DashboardWidget {
    type: 'chart' | 'metric' | 'table' | 'text';
    title: string;
    query: string;
    visualization: Record<string, any>;
}
export interface LogFilter {
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
    exclude?: boolean;
}
export interface WAFRule {
    name: string;
    condition: string;
    action: 'allow' | 'block' | 'log';
    priority: number;
}
export interface DDoSRule {
    name: string;
    threshold: number;
    window: number;
    action: 'block' | 'challenge' | 'log';
}
export default VercelNativeConfig;
//# sourceMappingURL=index.d.ts.map