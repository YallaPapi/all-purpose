/**
 * Vercel-Native Architecture Agent - Type Definitions
 * 
 * The PRODUCTION BUILDER for Native Vercel Deployment Systems
 * Following All-Purpose Pattern: NO hardcoded limitations on deployment complexity
 */

import type { EventEmitter } from 'events';

// ==================== CORE CONFIGURATION ====================

export interface VercelNativeConfig {
  // Core settings
  projectRoot?: string;
  outputDirectory?: string;
  deploymentDirectory?: string;
  
  // Vercel integration settings - UNLIMITED configurations
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
  
  // Serverless architecture settings - NO limitations
  serverlessArchitecture?: {
    supportedRuntimes?: string[]; // UNLIMITED runtimes
    functionStrategies?: string[]; // UNLIMITED strategies
    edgeStrategies?: string[]; // UNLIMITED edge strategies
    cachingStrategies?: string[]; // UNLIMITED caching
    optimizationLevels?: string[]; // UNLIMITED optimizations
  };
  
  // Production deployment settings - UNLIMITED configurations
  productionDeployment?: {
    deploymentStrategies?: string[]; // UNLIMITED strategies
    environmentTypes?: string[]; // UNLIMITED environments
    domainStrategies?: string[]; // UNLIMITED domains
    certificateManagement?: string[]; // UNLIMITED certificates
    monitoringLevels?: string[]; // UNLIMITED monitoring
  };
  
  // Performance optimization - NO limitations
  performanceOptimization?: {
    maxConcurrentDeployments?: number | 'unlimited';
    maxBuildParallelism?: number | 'unlimited';
    maxOptimizationPasses?: number | 'unlimited';
    enableBundleAnalysis?: boolean;
    enablePerformanceMonitoring?: boolean;
    enableCDNOptimization?: boolean;
  };
  
  // Meta-agent coordination - UNLIMITED agents
  metaAgentCoordination?: {
    supportedAgents?: string[]; // UNLIMITED meta-agents
    coordinationPatterns?: string[]; // UNLIMITED patterns
    communicationProtocols?: string[]; // UNLIMITED protocols
    dataExchangeFormats?: string[]; // UNLIMITED formats
    errorHandlingStrategies?: string[]; // UNLIMITED strategies
  };
  
  // Custom configurations - UNLIMITED extensibility
  customConfiguration?: Record<string, any>;
  pluginConfiguration?: Record<string, any>;
  advancedSettings?: Record<string, any>;
}

// ==================== VERCEL ARCHITECTURE ====================

export interface VercelArchitecture {
  architectureId: string;
  name: string;
  description: string;
  version: string;
  
  // Project structure
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
  
  // Serverless functions
  functions: {
    apiFunctions: ApiFunction[];
    edgeFunctions: EdgeFunction[];
    cronFunctions: CronFunction[];
    middlewareFunctions: MiddlewareFunction[];
  };
  
  // Static assets and routing
  routing: {
    staticRoutes: StaticRoute[];
    dynamicRoutes: DynamicRoute[];
    redirects: RedirectRule[];
    rewrites: RewriteRule[];
    headers: HeaderRule[];
  };
  
  // Performance and optimization
  optimization: {
    buildOptimizations: BuildOptimization[];
    runtimeOptimizations: RuntimeOptimization[];
    cdnConfiguration: CDNConfiguration;
    cacheStrategies: CacheStrategy[];
    compressionSettings: CompressionSettings;
  };
  
  // Monitoring and analytics
  monitoring: {
    analyticsConfiguration: AnalyticsConfiguration;
    speedInsightsConfiguration: SpeedInsightsConfiguration;
    logConfiguration: LogConfiguration;
    alertConfiguration: AlertConfiguration[];
    performanceMetrics: PerformanceMetric[];
  };
  
  // Security and compliance
  security: {
    certificateConfiguration: CertificateConfiguration[];
    securityHeaders: SecurityHeader[];
    authenticationStrategies: AuthenticationStrategy[];
    dataProtectionSettings: DataProtectionSettings;
  };
  
  // Deployment configuration
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
  
  // Function configuration
  configuration: {
    timeout?: number; // ms, up to 300000 for Pro
    memory?: number; // MB, up to 3008 for Pro
    maxDuration?: number; // seconds
    regions?: string[]; // UNLIMITED regions
    environment?: Record<string, string>;
    secrets?: string[];
  };
  
  // Performance settings
  performance: {
    concurrency?: number;
    reservedConcurrency?: number;
    coldStartOptimization?: boolean;
    bundleOptimization?: boolean;
    treeshaking?: boolean;
    minification?: boolean;
  };
  
  // Integration settings
  integration: {
    databases?: DatabaseConnection[];
    kvStores?: KVConnection[];
    blobStores?: BlobConnection[];
    queueConnections?: QueueConnection[];
    externalApis?: ExternalApiConnection[];
  };
  
  // Monitoring and debugging
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
  
  // Edge configuration
  configuration: {
    regions?: 'all' | string[]; // UNLIMITED regions
    timeout?: number; // ms, up to 30000
    memory?: number; // Limited for edge
    environment?: Record<string, string>;
  };
  
  // Edge capabilities
  capabilities: {
    geolocation?: boolean;
    userAgent?: boolean;
    ipAddress?: boolean;
    requestModification?: boolean;
    responseModification?: boolean;
    caching?: boolean;
  };
  
  // Performance optimization
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
  schedule: string; // Cron expression
  timezone?: string;
  
  // Function details
  function: {
    path: string;
    runtime: string;
    handler: string;
    timeout?: number;
    memory?: number;
    environment?: Record<string, string>;
  };
  
  // Execution settings
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
  
  // Middleware configuration
  configuration: {
    runtime: 'edge-runtime';
    regions?: 'all' | string[];
    priority?: number;
    conditions?: MiddlewareCondition[];
  };
  
  // Capabilities
  capabilities: {
    requestInterception?: boolean;
    responseModification?: boolean;
    redirectHandling?: boolean;
    headerManipulation?: boolean;
    cookieManagement?: boolean;
    authenticationIntegration?: boolean;
  };
}

// ==================== ROUTING AND DOMAINS ====================

export interface StaticRoute {
  routeId: string;
  path: string;
  filePath: string;
  
  // Route configuration
  configuration: {
    cacheControl?: string;
    compression?: boolean;
    headers?: Record<string, string>;
    mimeType?: string;
  };
  
  // Optimization
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
  
  // Route configuration
  configuration: {
    methods?: string[];
    headers?: Record<string, string>;
    middleware?: string[];
    rateLimit?: RateLimit;
  };
  
  // Performance
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
  
  // SSL/TLS configuration
  ssl: {
    certificateType: 'automatic' | 'custom' | 'letsencrypt';
    customCertificate?: CustomCertificate;
    enforceHttps?: boolean;
    minTlsVersion?: '1.0' | '1.1' | '1.2' | '1.3';
  };
  
  // DNS configuration
  dns: {
    provider?: string;
    records?: DNSRecord[];
    cdnConfiguration?: CDNConfiguration;
  };
  
  // Security
  security: {
    ddosProtection?: boolean;
    wafConfiguration?: WAFConfiguration;
    rateLimiting?: RateLimit;
    geoBlocking?: GeoBlockingConfiguration;
  };
}

// ==================== BUILD AND DEPLOYMENT ====================

export interface BuildConfiguration {
  buildId: string;
  
  // Build settings
  settings: {
    framework?: string;
    buildCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
    publicDirectory?: string;
    nodeVersion?: string;
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  };
  
  // Build optimizations
  optimizations: {
    parallelism?: number | 'unlimited';
    caching?: boolean;
    incrementalBuilds?: boolean;
    dependencyAnalysis?: boolean;
    treeShaking?: boolean;
    codesplitting?: boolean;
    bundleAnalysis?: boolean;
  };
  
  // Environment configuration
  environment: {
    variables?: Record<string, string>;
    secrets?: string[];
    buildEnvironment?: 'nodejs18.x' | 'nodejs20.x' | 'custom';
    customDockerfile?: string;
  };
  
  // Build hooks
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
  
  // Deployment configuration
  configuration: {
    autoDeployment?: boolean;
    branchPatterns?: string[];
    environmentTriggers?: string[];
    manualApproval?: boolean;
    rollbackPolicy?: RollbackPolicy;
  };
  
  // Pre-deployment checks
  preDeploymentChecks: {
    buildTests?: boolean;
    linting?: boolean;
    typeChecking?: boolean;
    securityScanning?: boolean;
    performanceTesting?: boolean;
    customChecks?: CustomCheck[];
  };
  
  // Post-deployment actions
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
  
  // Production settings
  settings: {
    domains?: string[];
    environmentVariables?: Record<string, string>;
    functionConfiguration?: FunctionConfiguration;
    cacheConfiguration?: CacheConfiguration;
    securityConfiguration?: SecurityConfiguration;
  };
  
  // Performance requirements
  performance: {
    latencyTargets?: LatencyTarget[];
    throughputTargets?: ThroughputTarget[];
    availabilityTargets?: AvailabilityTarget[];
    scalingPolicies?: ScalingPolicy[];
  };
  
  // Monitoring and alerting
  monitoring: {
    metricsCollection?: MetricsConfiguration;
    alertingRules?: AlertRule[];
    dashboardConfiguration?: DashboardConfiguration;
    logAggregation?: LogAggregationConfiguration;
  };
}

// ==================== OPTIMIZATION AND PERFORMANCE ====================

export interface BuildOptimization {
  optimizationId: string;
  name: string;
  type: 'bundle' | 'asset' | 'code' | 'dependency' | 'custom';
  
  // Optimization settings
  settings: {
    enabled?: boolean;
    priority?: number;
    conditions?: OptimizationCondition[];
    parameters?: Record<string, any>;
  };
  
  // Performance impact
  impact: {
    buildTimeReduction?: number; // percentage
    bundleSizeReduction?: number; // percentage
    runtimePerformanceGain?: number; // percentage
    memoryUsageReduction?: number; // percentage
  };
  
  // Configuration
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
  
  // Runtime settings
  settings: {
    enabled?: boolean;
    autoScaling?: boolean;
    coldStartOptimization?: boolean;
    memoryOptimization?: boolean;
    cpuOptimization?: boolean;
  };
  
  // Caching configuration
  caching: {
    functionCaching?: boolean;
    responseCaching?: boolean;
    staticAssetCaching?: boolean;
    databaseCaching?: boolean;
    customCaching?: CacheRule[];
  };
  
  // Monitoring
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
  
  // Cache configuration
  configuration: {
    ttl?: number; // seconds
    maxAge?: number; // seconds
    staleWhileRevalidate?: number; // seconds
    mustRevalidate?: boolean;
    varyHeaders?: string[];
  };
  
  // Cache rules
  rules: {
    pathPatterns?: string[];
    headerConditions?: HeaderCondition[];
    queryParamHandling?: 'ignore' | 'include' | 'custom';
    customConditions?: CacheCondition[];
  };
  
  // Performance settings
  performance: {
    compressionEnabled?: boolean;
    minificationEnabled?: boolean;
    optimizationLevel?: 'low' | 'medium' | 'high' | 'maximum';
    edgeLocationCount?: number | 'unlimited';
  };
}

// ==================== MONITORING AND ANALYTICS ====================

export interface AnalyticsConfiguration {
  configurationId: string;
  
  // Analytics settings
  settings: {
    enabled?: boolean;
    dataCollection?: 'minimal' | 'standard' | 'comprehensive' | 'unlimited';
    retentionPeriod?: number; // days
    samplingRate?: number; // percentage
  };
  
  // Tracked events
  events: {
    pageViews?: boolean;
    customEvents?: boolean;
    performanceMetrics?: boolean;
    errorTracking?: boolean;
    userJourney?: boolean;
    conversionTracking?: boolean;
  };
  
  // Data export
  dataExport: {
    exportFormats?: string[];
    exportSchedule?: string;
    exportDestinations?: ExportDestination[];
    dataWarehouseIntegration?: boolean;
  };
}

export interface SpeedInsightsConfiguration {
  configurationId: string;
  
  // Speed Insights settings
  settings: {
    enabled?: boolean;
    realUserMonitoring?: boolean;
    syntheticMonitoring?: boolean;
    performanceBudgets?: PerformanceBudget[];
  };
  
  // Metrics tracking
  metrics: {
    coreWebVitals?: boolean;
    loadingMetrics?: boolean;
    interactivityMetrics?: boolean;
    visualStabilityMetrics?: boolean;
    customMetrics?: CustomPerformanceMetric[];
  };
  
  // Alerting
  alerting: {
    performanceDegradationAlerts?: boolean;
    budgetExceededAlerts?: boolean;
    customAlerts?: PerformanceAlert[];
  };
}

export interface LogConfiguration {
  configurationId: string;
  
  // Logging settings
  settings: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    retention?: number; // days
    compression?: boolean;
    encryption?: boolean;
  };
  
  // Log sources
  sources: {
    functionLogs?: boolean;
    edgeLogs?: boolean;
    buildLogs?: boolean;
    deploymentLogs?: boolean;
    accessLogs?: boolean;
    errorLogs?: boolean;
  };
  
  // Log processing
  processing: {
    structuredLogging?: boolean;
    logParsing?: boolean;
    logEnrichment?: boolean;
    customProcessing?: LogProcessor[];
  };
  
  // Log destinations
  destinations: {
    vercelLogs?: boolean;
    externalLoggers?: ExternalLogger[];
    dataWarehouse?: boolean;
    customDestinations?: LogDestination[];
  };
}

// ==================== SECURITY AND COMPLIANCE ====================

export interface SecurityConfiguration {
  configurationId: string;
  
  // Security settings
  settings: {
    httpsEnforcement?: boolean;
    hstsEnabled?: boolean;
    corsConfiguration?: CORSConfiguration;
    cspConfiguration?: CSPConfiguration;
    rateLimiting?: RateLimit;
  };
  
  // Authentication and authorization
  authentication: {
    strategies?: AuthenticationStrategy[];
    sessionManagement?: SessionConfiguration;
    tokenManagement?: TokenConfiguration;
    multiFactorAuthentication?: MFAConfiguration;
  };
  
  // Data protection
  dataProtection: {
    encryption?: EncryptionConfiguration;
    dataRetention?: DataRetentionPolicy[];
    privacyControls?: PrivacyControl[];
    complianceStandards?: ComplianceStandard[];
  };
  
  // Threat protection
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
  
  // Certificate settings
  settings: {
    autoRenewal?: boolean;
    renewalThreshold?: number; // days before expiry
    validationMethod?: 'dns' | 'http' | 'email';
    keySize?: 2048 | 4096;
  };
  
  // Custom certificate (if type is 'custom')
  customCertificate?: {
    certificate: string;
    privateKey: string;
    intermediateChain?: string;
    passphrase?: string;
  };
  
  // Monitoring
  monitoring: {
    expirationAlerts?: boolean;
    validationMonitoring?: boolean;
    securityScanning?: boolean;
  };
}

// ==================== INTEGRATION TYPES ====================

export interface DatabaseConnection {
  connectionId: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis' | 'custom';
  provider: 'vercel' | 'planetscale' | 'supabase' | 'mongodb-atlas' | 'upstash' | 'custom';
  
  // Connection configuration
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
  
  // Performance settings
  performance: {
    connectionPoolSize?: number;
    queryTimeout?: number;
    connectionTimeout?: number;
    maxConnections?: number;
    caching?: boolean;
  };
  
  // Security
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
  
  // KV configuration
  configuration: {
    endpoint?: string;
    token?: string;
    database?: number;
    keyPrefix?: string;
    serialization?: 'json' | 'msgpack' | 'custom';
  };
  
  // Performance settings
  performance: {
    maxConnections?: number;
    commandTimeout?: number;
    pipelining?: boolean;
    compression?: boolean;
  };
  
  // Usage patterns
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
  
  // Blob configuration
  configuration: {
    endpoint?: string;
    token?: string;
    bucket?: string;
    region?: string;
    accessKey?: string;
    secretKey?: string;
  };
  
  // Storage settings
  storage: {
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    storageClass?: string;
    encryption?: boolean;
    versioning?: boolean;
  };
  
  // Access control
  access: {
    publicRead?: boolean;
    signedUrls?: boolean;
    expirationTime?: number;
    accessPolicies?: AccessPolicy[];
  };
}

// ==================== RESULT TYPES ====================

export interface VercelArchitectureResult {
  success: boolean;
  architectureId: string;
  generatedArchitecture: VercelArchitecture;
  
  // Generation details
  generation: {
    startTime: Date;
    endTime: Date;
    duration: number;
    functionsCreated: number;
    routesConfigured: number;
    optimizationsApplied: number;
  };
  
  // Quality metrics
  quality: {
    architectureScore: number;
    performanceScore: number;
    securityScore: number;
    scalabilityScore: number;
    vercelBestPracticesCompliance: number;
    allPurposePatternCompliance: number;
  };
  
  // Deployment readiness
  deployment: {
    readyForDeployment: boolean;
    deploymentInstructions: string[];
    preDeploymentChecks: DeploymentCheck[];
    estimatedDeploymentTime: number;
  };
  
  // Performance predictions
  performance: {
    expectedLatency: PerformancePrediction;
    expectedThroughput: PerformancePrediction;
    expectedCost: CostPrediction;
    scalingCapabilities: ScalingPrediction;
  };
  
  // Security assessment
  security: {
    securityAssessment: SecurityAssessment;
    vulnerabilities: SecurityVulnerability[];
    recommendations: SecurityRecommendation[];
  };
  
  // Warnings and recommendations
  warnings: VercelWarning[];
  errors: VercelError[];
  recommendations: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  deploymentUrl: string;
  
  // Deployment details
  deployment: {
    startTime: Date;
    endTime: Date;
    duration: number;
    strategy: string;
    environment: string;
    version: string;
  };
  
  // Build information
  build: {
    buildId: string;
    buildTime: number;
    optimizationsApplied: string[];
    bundleSize: number;
    warnings: BuildWarning[];
    errors: BuildError[];
  };
  
  // Function deployment
  functions: {
    deployed: FunctionDeployment[];
    failed: FailedFunctionDeployment[];
    totalCount: number;
    successRate: number;
  };
  
  // Performance metrics
  performance: {
    coldStartTime: number;
    firstResponseTime: number;
    buildPerformance: BuildPerformance;
    runtimePerformance: RuntimePerformance;
  };
  
  // Monitoring setup
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
  
  // Optimization details
  optimization: {
    type: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    optimizationsApplied: OptimizationApplication[];
  };
  
  // Performance improvements
  improvements: {
    buildTimeReduction: number; // percentage
    bundleSizeReduction: number; // percentage
    runtimePerformanceGain: number; // percentage
    memoryUsageReduction: number; // percentage
    coldStartReduction: number; // percentage
  };
  
  // Cost impact
  costImpact: {
    buildCostReduction: number; // percentage
    runtimeCostReduction: number; // percentage
    bandwidthCostReduction: number; // percentage
    totalCostReduction: number; // percentage
  };
  
  // Quality metrics
  quality: {
    codeQualityScore: number;
    performanceScore: number;
    maintainabilityScore: number;
    reliabilityScore: number;
  };
}

// ==================== AGENT CAPABILITIES ====================

export interface VercelNativeCapabilities {
  name: string;
  version: string;
  
  // Core capabilities
  coreCapabilities: {
    vercelDeployment: string[];
    serverlessArchitecture: string[];
    productionOptimization: string[];
    performanceMonitoring: string[];
  };
  
  // Vercel platform capabilities - UNLIMITED
  vercelCapabilities: {
    maxDeploymentComplexity: 'unlimited';
    supportedRuntimes: string[];
    supportedFrameworks: string[];
    supportedOptimizations: string[];
  };
  
  // Production capabilities - NO limitations
  productionCapabilities: {
    maxScalingCapacity: 'unlimited';
    maxPerformanceOptimization: 'unlimited';
    maxMonitoringComplexity: 'unlimited';
    supportedDeploymentStrategies: string[];
  };
  
  // Meta-agent coordination
  metaAgentCoordination: {
    supportedAgents: string[];
    coordinationPatterns: string[];
    communicationProtocols: string[];
    dataExchangeFormats: string[];
  };
  
  // Performance capabilities - UNLIMITED
  performance: {
    maxConcurrentDeployments: 'unlimited';
    maxOptimizationPasses: 'unlimited';
    maxMonitoringMetrics: 'unlimited';
    scalingSupport: string[];
  };
  
  // Quality assurance capabilities
  qualityAssurance: {
    validationLevels: string[];
    testingStrategies: string[];
    monitoringCapabilities: string[];
    alertingCapabilities: string[];
  };
  
  // Extensibility - UNLIMITED
  extensibility: {
    customDeployments: boolean;
    customOptimizations: boolean;
    customMonitoring: boolean;
    pluginSupport: boolean;
    apiExtensions: string[];
  };
}

// ==================== HELPER TYPES ====================

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
  window: number; // seconds
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: string;
}

export interface ISRConfiguration {
  revalidate: number; // seconds
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
  target: number; // milliseconds
  tolerance: number; // percentage
}

export interface ThroughputTarget {
  metric: string;
  target: number; // requests per second
  tolerance: number; // percentage
}

export interface AvailabilityTarget {
  target: number; // percentage (e.g., 99.9)
  measurement: 'uptime' | 'successful-requests';
  window: number; // seconds
}

export interface ScalingPolicy {
  metric: string;
  threshold: number;
  action: 'scale-up' | 'scale-down';
  cooldown: number; // seconds
}

export interface MetricsConfiguration {
  enabled: boolean;
  retention: number; // days
  granularity: number; // seconds
  customMetrics: string[];
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  duration: number; // seconds
  channels: string[];
}

export interface DashboardConfiguration {
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number; // seconds
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
  expiration: number; // seconds
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export interface TokenConfiguration {
  algorithm: string;
  expiration: number; // seconds
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
  retention: number; // days
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

// Performance and monitoring types
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
  scaleTime: number; // seconds
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
  window: number; // seconds
  action: 'block' | 'challenge' | 'log';
}

// ==================== EXPORT DEFAULT ====================

export default VercelNativeConfig;