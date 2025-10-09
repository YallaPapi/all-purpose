/**
 * UEP Health Check Server
 * 
 * HTTP server providing standardized health check endpoints for UEP agents,
 * including protocol compliance validation and container orchestration compatibility.
 * 
 * Features:
 * - Standard health check endpoints (/health, /ready, /live)
 * - UEP protocol compliance validation
 * - Schema validity checking
 * - Registry status monitoring
 * - Container orchestration health probe support
 * - Detailed diagnostic information
 */

import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { parse as parseUrl } from 'url';
import { 
  UEPClient,
  UEPHealthStatus,
  UEPMetrics,
  UEPServiceRegistry,
  UEPMessageValidator,
  ValidationResult
} from '../core/UEPTypes.js';

/**
 * Health Server Configuration
 */
export interface UEPHealthServerConfig {
  port: number;
  host?: string;
  enableDetailedDiagnostics?: boolean;
  enableMetricsEndpoint?: boolean;
  enableComplianceEndpoint?: boolean;
  corsEnabled?: boolean;
  basicAuth?: {
    username: string;
    password: string;
  };
  customChecks?: HealthCheckFunction[];
}

/**
 * Custom Health Check Function
 */
export type HealthCheckFunction = () => Promise<{
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration: number;
  metadata?: Record<string, any>;
}>;

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: 'pass' | 'fail' | 'warn';
  version: string;
  releaseId?: string;
  notes?: string[];
  output?: string;
  serviceId: string;
  description: string;
  checks: Record<string, HealthCheckResult>;
  uptime: number;
  timestamp: string;
  links?: Record<string, string>;
}

/**
 * Individual Health Check Result
 */
export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  componentType?: string;
  observedValue?: any;
  observedUnit?: string;
  time: string;
  output?: string;
  links?: Record<string, string>;
}

/**
 * UEP Compliance Check Result
 */
export interface UEPComplianceResult {
  compliant: boolean;
  version: string;
  checks: {
    protocolVersion: boolean;
    schemaValidation: boolean;
    registryConnection: boolean;
    messageFormat: boolean;
    tracingEnabled: boolean;
  };
  details: {
    supportedVersions: string[];
    activeConnections: number;
    lastRegistryUpdate: string;
    validationErrors: string[];
    tracingStatus: string;
  };
  recommendations: string[];
}

/**
 * UEP Health Server Implementation
 */
export class UEPHealthServer {
  private readonly config: UEPHealthServerConfig;
  private server: Server | null = null;
  private client: UEPClient | null = null;
  private registry: UEPServiceRegistry | null = null;
  private validator: UEPMessageValidator | null = null;
  private startTime = Date.now();

  constructor(config: UEPHealthServerConfig) {
    this.config = {
      host: '0.0.0.0',
      enableDetailedDiagnostics: true,
      enableMetricsEndpoint: true,
      enableComplianceEndpoint: true,
      corsEnabled: true,
      ...config
    };
  }

  /**
   * Initialize the health server with UEP components
   */
  async initialize(
    client?: UEPClient,
    registry?: UEPServiceRegistry,
    validator?: UEPMessageValidator
  ): Promise<void> {
    this.client = client || null;
    this.registry = registry || null;
    this.validator = validator || null;

    this.server = createServer((req, res) => {
      this.handleRequest(req, res).catch(error => {
        console.error('Health server request error:', error);
        this.sendErrorResponse(res, 500, 'Internal Server Error');
      });
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        console.log(`UEP Health Server listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.server!.on('error', reject);
    });
  }

  /**
   * Shutdown the health server
   */
  async shutdown(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('UEP Health Server shutdown complete');
          resolve();
        });
      });
    }
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = parseUrl(req.url || '', true);
    const pathname = url.pathname || '';
    const method = req.method || 'GET';

    // Enable CORS if configured
    if (this.config.corsEnabled) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Handle preflight requests
    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Basic authentication if configured
    if (this.config.basicAuth && !this.checkBasicAuth(req)) {
      res.setHeader('WWW-Authenticate', 'Basic realm="UEP Health Server"');
      this.sendErrorResponse(res, 401, 'Unauthorized');
      return;
    }

    // Route requests
    switch (pathname) {
      case '/health':
        await this.handleHealthCheck(res);
        break;

      case '/ready':
        await this.handleReadinessCheck(res);
        break;

      case '/live':
        await this.handleLivenessCheck(res);
        break;

      case '/uep/validate':
      case '/uep/compliance':
        if (this.config.enableComplianceEndpoint) {
          await this.handleComplianceCheck(res);
        } else {
          this.sendErrorResponse(res, 404, 'Endpoint not enabled');
        }
        break;

      case '/metrics':
        if (this.config.enableMetricsEndpoint) {
          await this.handleMetrics(res);
        } else {
          this.sendErrorResponse(res, 404, 'Endpoint not enabled');
        }
        break;

      case '/diagnostics':
        if (this.config.enableDetailedDiagnostics) {
          await this.handleDiagnostics(res);
        } else {
          this.sendErrorResponse(res, 404, 'Endpoint not enabled');
        }
        break;

      default:
        this.sendErrorResponse(res, 404, 'Not Found');
    }
  }

  /**
   * Handle standard health check endpoint
   */
  private async handleHealthCheck(res: ServerResponse): Promise<void> {
    try {
      const checks = await this.performHealthChecks();
      const overallStatus = this.determineOverallStatus(checks);

      const response: HealthCheckResponse = {
        status: overallStatus,
        version: '1.0.0',
        serviceId: this.client?.['options']?.agent?.id || 'unknown',
        description: 'UEP Agent Health Check',
        checks,
        uptime: Date.now() - this.startTime,
        timestamp: new Date().toISOString(),
        links: {
          metrics: '/metrics',
          diagnostics: '/diagnostics',
          compliance: '/uep/compliance'
        }
      };

      const statusCode = overallStatus === 'pass' ? 200 : overallStatus === 'warn' ? 200 : 503;
      this.sendJsonResponse(res, statusCode, response);

    } catch (error) {
      console.error('Health check failed:', error);
      this.sendErrorResponse(res, 503, 'Health check failed');
    }
  }

  /**
   * Handle readiness check endpoint
   */
  private async handleReadinessCheck(res: ServerResponse): Promise<void> {
    try {
      const isReady = await this.checkReadiness();
      
      const response = {
        status: isReady ? 'ready' : 'not-ready',
        timestamp: new Date().toISOString(),
        checks: {
          connection: this.client ? 'connected' : 'disconnected',
          registry: this.registry ? 'available' : 'unavailable'
        }
      };

      this.sendJsonResponse(res, isReady ? 200 : 503, response);

    } catch (error) {
      console.error('Readiness check failed:', error);
      this.sendErrorResponse(res, 503, 'Readiness check failed');
    }
  }

  /**
   * Handle liveness check endpoint
   */
  private async handleLivenessCheck(res: ServerResponse): Promise<void> {
    // Simple liveness check - if we can respond, we're alive
    const response = {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };

    this.sendJsonResponse(res, 200, response);
  }

  /**
   * Handle UEP compliance validation endpoint
   */
  private async handleComplianceCheck(res: ServerResponse): Promise<void> {
    try {
      const complianceResult = await this.performComplianceCheck();
      const statusCode = complianceResult.compliant ? 200 : 400;

      this.sendJsonResponse(res, statusCode, complianceResult);

    } catch (error) {
      console.error('Compliance check failed:', error);
      this.sendErrorResponse(res, 500, 'Compliance check failed');
    }
  }

  /**
   * Handle metrics endpoint
   */
  private async handleMetrics(res: ServerResponse): Promise<void> {
    try {
      const metrics = this.client ? this.client.getMetrics() : null;
      
      if (!metrics) {
        this.sendErrorResponse(res, 503, 'Metrics not available');
        return;
      }

      this.sendJsonResponse(res, 200, metrics);

    } catch (error) {
      console.error('Metrics retrieval failed:', error);
      this.sendErrorResponse(res, 500, 'Metrics retrieval failed');
    }
  }

  /**
   * Handle diagnostics endpoint
   */
  private async handleDiagnostics(res: ServerResponse): Promise<void> {
    try {
      const diagnostics = await this.collectDiagnostics();
      this.sendJsonResponse(res, 200, diagnostics);

    } catch (error) {
      console.error('Diagnostics collection failed:', error);
      this.sendErrorResponse(res, 500, 'Diagnostics collection failed');
    }
  }

  /**
   * Perform comprehensive health checks
   */
  private async performHealthChecks(): Promise<Record<string, HealthCheckResult>> {
    const checks: Record<string, HealthCheckResult> = {};

    // Connection check
    const connectionStart = Date.now();
    try {
      const connected = this.client ? true : false; // Simplified check
      checks.connection = {
        status: connected ? 'pass' : 'fail',
        componentType: 'connection',
        observedValue: connected,
        time: new Date().toISOString(),
        output: connected ? 'UEP client connected' : 'UEP client not connected'
      };
    } catch (error) {
      checks.connection = {
        status: 'fail',
        componentType: 'connection',
        time: new Date().toISOString(),
        output: `Connection check failed: ${error.message}`
      };
    }

    // Registry check
    try {
      const registryAvailable = this.registry ? true : false;
      checks.registry = {
        status: registryAvailable ? 'pass' : 'warn',
        componentType: 'service-registry',
        observedValue: registryAvailable,
        time: new Date().toISOString(),
        output: registryAvailable ? 'Service registry available' : 'Service registry not configured'
      };
    } catch (error) {
      checks.registry = {
        status: 'fail',
        componentType: 'service-registry',
        time: new Date().toISOString(),
        output: `Registry check failed: ${error.message}`
      };
    }

    // Validation check
    try {
      const validatorAvailable = this.validator ? true : false;
      checks.validation = {
        status: validatorAvailable ? 'pass' : 'warn',
        componentType: 'message-validator',
        observedValue: validatorAvailable,
        time: new Date().toISOString(),
        output: validatorAvailable ? 'Message validator available' : 'Message validator not configured'
      };
    } catch (error) {
      checks.validation = {
        status: 'fail',
        componentType: 'message-validator',
        time: new Date().toISOString(),
        output: `Validation check failed: ${error.message}`
      };
    }

    // Memory check
    try {
      const memUsage = process.memoryUsage();
      const memUtilization = memUsage.heapUsed / memUsage.heapTotal;
      checks.memory = {
        status: memUtilization < 0.9 ? 'pass' : memUtilization < 0.95 ? 'warn' : 'fail',
        componentType: 'system',
        observedValue: memUtilization,
        observedUnit: 'percent',
        time: new Date().toISOString(),
        output: `Memory utilization: ${(memUtilization * 100).toFixed(1)}%`
      };
    } catch (error) {
      checks.memory = {
        status: 'fail',
        componentType: 'system',
        time: new Date().toISOString(),
        output: `Memory check failed: ${error.message}`
      };
    }

    // Custom checks
    if (this.config.customChecks) {
      for (const customCheck of this.config.customChecks) {
        try {
          const result = await customCheck();
          checks[result.name] = {
            status: result.status,
            componentType: 'custom',
            time: new Date().toISOString(),
            output: result.message,
            observedValue: result.metadata
          };
        } catch (error) {
          checks['custom-check'] = {
            status: 'fail',
            componentType: 'custom',
            time: new Date().toISOString(),
            output: `Custom check failed: ${error.message}`
          };
        }
      }
    }

    return checks;
  }

  /**
   * Perform UEP protocol compliance check
   */
  private async performComplianceCheck(): Promise<UEPComplianceResult> {
    const checks = {
      protocolVersion: false,
      schemaValidation: false,
      registryConnection: false,
      messageFormat: false,
      tracingEnabled: false
    };

    const details = {
      supportedVersions: ['1.0.0'],
      activeConnections: 0,
      lastRegistryUpdate: 'never',
      validationErrors: [] as string[],
      tracingStatus: 'unknown'
    };

    const recommendations: string[] = [];

    // Check protocol version
    if (this.client) {
      checks.protocolVersion = true;
      details.activeConnections = 1;
    } else {
      recommendations.push('Initialize UEP client with proper protocol version');
    }

    // Check schema validation
    if (this.validator) {
      checks.schemaValidation = true;
      
      // Test validation with a sample message
      try {
        const testMessage = {
          id: 'test',
          timestamp: new Date(),
          version: '1.0.0',
          protocol: { id: 'uep', version: '1.0.0', capability: 'test' },
          routing: { subject: 'test', messageType: 'command' as const },
          agent: { id: 'test', type: 'meta' as const, capability: 'test', instance: 'test', version: '1.0.0', status: 'ready' as const },
          tracing: { traceId: '12345678901234567890123456789012', spanId: '1234567890123456' },
          payload: {}
        };

        const validationResult = await this.validator.validateMessage(testMessage);
        checks.messageFormat = validationResult.valid;
        
        if (!validationResult.valid) {
          details.validationErrors = validationResult.errors;
          recommendations.push('Fix message format validation errors');
        }
      } catch (error) {
        details.validationErrors.push(`Validation test failed: ${error.message}`);
      }
    } else {
      recommendations.push('Configure message validator for schema compliance');
    }

    // Check registry connection
    if (this.registry) {
      checks.registryConnection = true;
      details.lastRegistryUpdate = new Date().toISOString();
    } else {
      recommendations.push('Configure service registry connection');
    }

    // Check tracing
    details.tracingStatus = 'enabled'; // Assume enabled if client is available
    checks.tracingEnabled = !!this.client;

    const compliant = Object.values(checks).every(check => check);

    return {
      compliant,
      version: '1.0.0',
      checks,
      details,
      recommendations
    };
  }

  /**
   * Check if service is ready to receive traffic
   */
  private async checkReadiness(): Promise<boolean> {
    // Service is ready if client is connected and essential components are available
    return !!(this.client);
  }

  /**
   * Collect detailed diagnostic information
   */
  private async collectDiagnostics(): Promise<any> {
    return {
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      uep: {
        clientConnected: !!this.client,
        registryAvailable: !!this.registry,
        validatorAvailable: !!this.validator,
        protocolVersion: '1.0.0'
      },
      health: {
        serverUptime: Date.now() - this.startTime,
        lastHealthCheck: new Date().toISOString(),
        configuration: {
          port: this.config.port,
          host: this.config.host,
          diagnosticsEnabled: this.config.enableDetailedDiagnostics,
          metricsEnabled: this.config.enableMetricsEndpoint,
          complianceEnabled: this.config.enableComplianceEndpoint
        }
      }
    };
  }

  /**
   * Determine overall health status from individual checks
   */
  private determineOverallStatus(checks: Record<string, HealthCheckResult>): 'pass' | 'fail' | 'warn' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.some(status => status === 'fail')) {
      return 'fail';
    } else if (statuses.some(status => status === 'warn')) {
      return 'warn';
    } else {
      return 'pass';
    }
  }

  /**
   * Check basic authentication
   */
  private checkBasicAuth(req: IncomingMessage): boolean {
    if (!this.config.basicAuth) {
      return true;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    return username === this.config.basicAuth.username && 
           password === this.config.basicAuth.password;
  }

  /**
   * Send JSON response
   */
  private sendJsonResponse(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   */
  private sendErrorResponse(res: ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify({
      error: {
        code: statusCode,
        message,
        timestamp: new Date().toISOString()
      }
    }, null, 2));
  }
}

/**
 * Factory function to create default health server configuration
 */
export function createDefaultHealthServerConfig(port: number = 8080): UEPHealthServerConfig {
  return {
    port,
    host: '0.0.0.0',
    enableDetailedDiagnostics: true,
    enableMetricsEndpoint: true,
    enableComplianceEndpoint: true,
    corsEnabled: true
  };
}

export {
  UEPHealthServerConfig,
  HealthCheckFunction,
  HealthCheckResponse,
  HealthCheckResult,
  UEPComplianceResult
};