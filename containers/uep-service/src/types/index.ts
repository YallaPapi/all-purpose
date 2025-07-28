export interface UEPRequest {
  id: string;
  type: 'META_AGENT_CREATE' | 'META_AGENT_EXECUTE' | 'API_REQUEST' | 'RESOURCE_ACCESS';
  source: string;
  target?: string;
  payload: any;
  timestamp: Date;
  metadata?: {
    [key: string]: any;
  };
}

export interface UEPValidationResult {
  isValid: boolean;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
    remediation?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  metadata?: {
    [key: string]: any;
  };
}

export interface UEPRule {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  conditions: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'regex' | 'exists';
    value: any;
    caseSensitive?: boolean;
  }>;
  actions: Array<{
    type: 'VALIDATE' | 'TRANSFORM' | 'ENHANCE' | 'REJECT' | 'LOG';
    config: {
      [key: string]: any;
    };
  }>;
  priority: number;
  tags: string[];
}

export interface ProcessingContext {
  requestId: string;
  source: string;
  timestamp: Date;
  environment: 'development' | 'staging' | 'production';
  metadata?: {
    [key: string]: any;
  };
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  transformations?: Array<{
    type: string;
    description: string;
    before: any;
    after: any;
  }>;
  enhancements?: Array<{
    type: string;
    description: string;
    data: any;
  }>;
  logs: Array<{
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: Date;
    metadata?: any;
  }>;
}

export interface AgentWrapper {
  id: string;
  originalAgentId: string;
  wrapperVersion: string;
  interceptors: Array<{
    phase: 'before_execute' | 'after_execute' | 'on_error' | 'on_complete';
    handler: string;
    config: any;
  }>;
  monitoring: {
    enabled: boolean;
    metricsLevel: 'basic' | 'detailed' | 'full';
    alertThresholds: {
      errorRate: number;
      responseTime: number;
      resourceUsage: number;
    };
  };
  enforcement: {
    enabled: boolean;
    policies: string[];
    failureMode: 'block' | 'warn' | 'monitor';
  };
}

export interface UEPMetrics {
  requestsProcessed: number;
  validationFailures: number;
  enforcementActions: number;
  averageProcessingTime: number;
  errorRate: number;
  topViolationSources: Array<{
    source: string;
    count: number;
  }>;
  policyEffectiveness: Array<{
    policyName: string;
    triggeredCount: number;
    successRate: number;
  }>;
}

export interface EventValidationRequest {
  eventType: string;
  eventData: any;
  source: string;
  timestamp: Date;
  correlationId?: string;
}

export interface EventValidationResult {
  isValid: boolean;
  eventType: string;
  normalizedData?: any;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  metadata?: {
    schemaVersion?: string;
    validationDuration?: number;
    [key: string]: any;
  };
}

export interface UEPConfiguration {
  enforcement: {
    enabled: boolean;
    mode: 'strict' | 'permissive' | 'monitor';
    defaultPolicies: boolean;
  };
  validation: {
    enabled: boolean;
    strictMode: boolean;
    schemaValidation: boolean;
  };
  processing: {
    enabled: boolean;
    maxRulesPerRequest: number;
    timeoutMs: number;
  };
  monitoring: {
    enabled: boolean;
    metricsRetentionHours: number;
    alerting: boolean;
  };
  caching: {
    enabled: boolean;
    validationCacheTtl: number;
    ruleCacheTtl: number;
  };
}

export interface UEPHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  components: {
    validation: 'up' | 'down' | 'degraded';
    processing: 'up' | 'down' | 'degraded';
    enforcement: 'up' | 'down' | 'degraded';
    database: 'up' | 'down' | 'degraded';
  };
  metrics: UEPMetrics;
  lastCheck: Date;
}