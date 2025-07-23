/**
 * Types for 30-Minute Rule Agent
 * Following All-Purpose Pattern: NO hardcoded limitations on project types or debugging scenarios
 */
export interface ThirtyMinuteRuleConfig {
    defaultTimeLimit?: number;
    maxTimeLimit?: number;
    minTimeLimit?: number;
    debugEndpointPort?: number;
    debugEndpointPrefix?: string;
    autoGenerateEndpoints?: boolean;
    customEndpoints?: DebugEndpointConfig[];
    isolationTestingEnabled?: boolean;
    healthCheckInterval?: number;
    componentDiscoveryPatterns?: string[];
    fallbackStrategies?: FallbackStrategyConfig[];
    enableAutoFallback?: boolean;
    fallbackTimeout?: number;
    contextEnabled?: boolean;
    metaAgentCoordination?: boolean;
    coordinatorEndpoint?: string;
    projectType?: string;
    framework?: string;
    testingFramework?: string;
    customConfiguration?: Record<string, any>;
    [key: string]: any;
}
export interface DebugSession {
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    timeLimit: number;
    status: 'active' | 'completed' | 'timeout' | 'cancelled' | 'fallback';
    description: string;
    component?: string;
    debugSteps: DebugStep[];
    healthChecks: HealthCheckResult[];
    fallbacksTriggered: FallbackExecution[];
    metadata: {
        projectType?: string;
        framework?: string;
        initiatedBy?: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        tags?: string[];
        configuration?: Record<string, any>;
    };
}
export interface DebugStep {
    stepId: string;
    timestamp: Date;
    duration: number;
    action: string;
    result: 'success' | 'failure' | 'partial' | 'timeout';
    details: string;
    evidence?: any;
    nextActions?: string[];
    confidence?: number;
}
export interface DebugEndpointConfig {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handler: string;
    description: string;
    component?: string;
    healthCheck?: boolean;
    isolationTest?: boolean;
    parameters?: EndpointParameter[];
    middleware?: string[];
    authentication?: boolean;
    rateLimit?: number;
}
export interface EndpointParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    description: string;
    validation?: string;
    defaultValue?: any;
}
export interface ComponentInfo {
    componentId: string;
    name: string;
    type: string;
    path: string;
    dependencies: string[];
    healthEndpoint?: string;
    isolationTestPath?: string;
    fallbackImplementation?: string;
    debugEndpoints: DebugEndpointConfig[];
    metadata: {
        framework?: string;
        language?: string;
        testable?: boolean;
        critical?: boolean;
        configuration?: Record<string, any>;
    };
}
export interface HealthCheckResult {
    checkId: string;
    timestamp: Date;
    component: string;
    status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
    responseTime: number;
    details: string;
    metrics?: Record<string, number>;
    dependencies?: ComponentHealthStatus[];
}
export interface ComponentHealthStatus {
    component: string;
    status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
    lastChecked: Date;
    issues?: string[];
}
export interface FallbackStrategyConfig {
    strategyId: string;
    name: string;
    description: string;
    triggers: FallbackTrigger[];
    action: FallbackAction;
    priority: number;
    enabled: boolean;
    configuration?: Record<string, any>;
}
export interface FallbackTrigger {
    type: 'timeout' | 'error' | 'health_failure' | 'custom';
    condition: string;
    threshold?: number;
    customCheck?: string;
}
export interface FallbackAction {
    type: 'alternative_implementation' | 'cached_response' | 'stub_response' | 'redirect' | 'custom';
    implementation: string;
    parameters?: Record<string, any>;
    timeoutMs?: number;
}
export interface FallbackExecution {
    executionId: string;
    timestamp: Date;
    strategyId: string;
    trigger: FallbackTrigger;
    action: FallbackAction;
    result: 'success' | 'failure' | 'partial';
    details: string;
    fallbackTime: number;
    originalError?: string;
    fallbackResponse?: any;
}
export interface IsolationTestResult {
    testId: string;
    timestamp: Date;
    component: string;
    testType: 'unit' | 'integration' | 'health' | 'dependency' | 'custom';
    status: 'pass' | 'fail' | 'skip' | 'timeout';
    duration: number;
    details: string;
    evidence?: any;
    coverage?: number;
    dependencies?: string[];
}
export interface DebugEndpointGenerationResult {
    success: boolean;
    endpointsGenerated: DebugEndpointConfig[];
    componentsAnalyzed: ComponentInfo[];
    errors: GenerationError[];
    warnings: string[];
    performance: {
        totalTime: number;
        componentsProcessed: number;
        endpointsCreated: number;
    };
}
export interface GenerationError {
    component?: string;
    endpoint?: string;
    error: string;
    severity: 'error' | 'warning' | 'info';
    suggestion?: string;
}
export interface DebuggingSessionResult {
    sessionId: string;
    success: boolean;
    completedInTime: boolean;
    session: DebugSession;
    resolution?: string;
    fallbacksUsed: FallbackExecution[];
    knowledgeExtracted: ExtractedKnowledge[];
    nextActions: string[];
    performance: {
        totalTime: number;
        debugSteps: number;
        healthChecks: number;
        fallbacksTriggered: number;
    };
}
export interface ExtractedKnowledge {
    type: 'pattern' | 'solution' | 'anti-pattern' | 'best-practice';
    title: string;
    description: string;
    applicableContexts: string[];
    confidence: number;
    evidence: any;
    metadata?: Record<string, any>;
}
export interface ThirtyMinuteRuleAgentCapabilities {
    name: string;
    version: string;
    features: string[];
    supportedProjectTypes: string[];
    supportedFrameworks: string[];
    debugEndpointGeneration: {
        automatic: boolean;
        customizable: boolean;
        projectTypes: string[];
    };
    componentIsolation: {
        testingSupported: boolean;
        healthChecksSupported: boolean;
        frameworkSupport: string[];
    };
    fallbackMechanisms: {
        strategiesSupported: string[];
        autoTrigger: boolean;
        customStrategies: boolean;
    };
    integration: {
        metaAgentCoordination: boolean;
        context7Support: boolean;
        externalTools: string[];
    };
    performance: {
        maxConcurrentSessions: number | 'unlimited';
        maxComponents: number | 'unlimited';
        maxEndpoints: number | 'unlimited';
    };
}
export interface MetaAgentIntegration {
    coordinatorId: string;
    agentRegistration: {
        agentId: string;
        agentName: string;
        agentType: 'thirty-minute-rule';
        capabilities: string[];
        status: 'initializing' | 'idle' | 'working' | 'error' | 'offline';
    };
    sharedKnowledge: {
        subscribe: string[];
        publish: string[];
    };
    taskCoordination: {
        acceptedTaskTypes: string[];
        priority: number;
    };
}
//# sourceMappingURL=index.d.ts.map