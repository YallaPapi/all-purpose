/**
 * Docker Health Check Script
 * 
 * Standalone health check script for Docker containers that validates
 * UEP agent health and protocol compliance for container orchestration.
 * 
 * Features:
 * - Container orchestration compatibility
 * - Exit code-based health reporting
 * - Configurable timeout and retry logic
 * - Detailed logging for troubleshooting
 * - Support for different health check modes
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Health Check Configuration
 */
interface DockerHealthCheckConfig {
  healthEndpoint: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  mode: 'basic' | 'detailed' | 'compliance';
  verbose: boolean;
  expectedStatus?: number;
}

/**
 * Health Check Result
 */
interface HealthCheckResult {
  success: boolean;
  status: number;
  message: string;
  data?: any;
  duration: number;
}

/**
 * Docker-compatible health check implementation
 */
class DockerHealthCheck {
  private readonly config: DockerHealthCheckConfig;

  constructor(config: Partial<DockerHealthCheckConfig> = {}) {
    this.config = {
      healthEndpoint: process.env.HEALTH_ENDPOINT || 'http://localhost:8080/health',
      timeout: parseInt(process.env.HEALTH_TIMEOUT || '5000'),
      retries: parseInt(process.env.HEALTH_RETRIES || '3'),
      retryDelay: parseInt(process.env.HEALTH_RETRY_DELAY || '1000'),
      mode: (process.env.HEALTH_MODE as any) || 'basic',
      verbose: process.env.HEALTH_VERBOSE === 'true',
      expectedStatus: parseInt(process.env.HEALTH_EXPECTED_STATUS || '200'),
      ...config
    };

    if (this.config.verbose) {
      console.log('Docker Health Check Config:', JSON.stringify(this.config, null, 2));
    }
  }

  /**
   * Run health check with retries
   */
  async run(): Promise<void> {
    let lastResult: HealthCheckResult | null = null;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      if (this.config.verbose) {
        console.log(`Health check attempt ${attempt}/${this.config.retries}`);
      }

      try {
        lastResult = await this.performHealthCheck();
        
        if (lastResult.success) {
          this.logSuccess(lastResult);
          process.exit(0); // Healthy
        } else {
          this.logFailure(lastResult, attempt);
        }
      } catch (error) {
        lastResult = {
          success: false,
          status: 0,
          message: `Health check error: ${error.message}`,
          duration: 0
        };
        
        this.logError(error, attempt);
      }

      // Wait before retry (except on last attempt)
      if (attempt < this.config.retries) {
        if (this.config.verbose) {
          console.log(`Waiting ${this.config.retryDelay}ms before retry...`);
        }
        await this.sleep(this.config.retryDelay);
      }
    }

    // All retries failed
    console.error(`Health check failed after ${this.config.retries} attempts`);
    if (lastResult) {
      console.error(`Final result: ${lastResult.message}`);
    }
    process.exit(1); // Unhealthy
  }

  /**
   * Perform the actual health check
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let endpoint = this.config.healthEndpoint;

    // Adjust endpoint based on mode
    switch (this.config.mode) {
      case 'detailed':
        endpoint = endpoint.replace('/health', '/diagnostics');
        break;
      case 'compliance':
        endpoint = endpoint.replace('/health', '/uep/compliance');
        break;
      default:
        // Keep basic /health endpoint
        break;
    }

    if (this.config.verbose) {
      console.log(`Checking endpoint: ${endpoint}`);
    }

    try {
      // Use fetch if available, otherwise use a simple HTTP client
      const response = await this.makeRequest(endpoint);
      const duration = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(`Response status: ${response.status}, Duration: ${duration}ms`);
      }

      const isSuccess = this.config.expectedStatus 
        ? response.status === this.config.expectedStatus
        : response.status >= 200 && response.status < 300;

      let data: any = null;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        if (this.config.verbose) {
          console.log('Response is not JSON, treating as text');
        }
      }

      return {
        success: isSuccess,
        status: response.status,
        message: isSuccess 
          ? `Health check passed (${response.status})` 
          : `Health check failed with status ${response.status}`,
        data,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        status: 0,
        message: `Request failed: ${error.message}`,
        duration
      };
    }
  }

  /**
   * Make HTTP request (compatible with different Node.js environments)
   */
  private async makeRequest(url: string): Promise<any> {
    // Try to use fetch if available (Node.js 18+)
    if (typeof fetch !== 'undefined') {
      return await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Docker-Health-Check/1.0',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });
    }

    // Fallback to http/https modules
    const { URL } = require('url');
    const urlObj = new URL(url);
    const httpModule = urlObj.protocol === 'https:' ? require('https') : require('http');

    return new Promise((resolve, reject) => {
      const request = httpModule.request({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Docker-Health-Check/1.0',
          'Accept': 'application/json'
        },
        timeout: this.config.timeout
      }, (response: any) => {
        let data = '';
        
        response.on('data', (chunk: any) => {
          data += chunk;
        });

        response.on('end', () => {
          resolve({
            status: response.statusCode,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      });

      request.end();
    });
  }

  /**
   * Log successful health check
   */
  private logSuccess(result: HealthCheckResult): void {
    if (this.config.verbose) {
      console.log(`✓ Health check passed in ${result.duration}ms`);
      if (result.data) {
        console.log('Response data:', JSON.stringify(result.data, null, 2));
      }
    } else {
      console.log(result.message);
    }
  }

  /**
   * Log failed health check
   */
  private logFailure(result: HealthCheckResult, attempt: number): void {
    if (this.config.verbose) {
      console.error(`✗ Health check failed (attempt ${attempt}): ${result.message}`);
      if (result.data) {
        console.error('Response data:', JSON.stringify(result.data, null, 2));
      }
    } else {
      console.error(`Health check failed: ${result.message}`);
    }
  }

  /**
   * Log health check error
   */
  private logError(error: any, attempt: number): void {
    if (this.config.verbose) {
      console.error(`✗ Health check error (attempt ${attempt}):`, error);
    } else {
      console.error(`Health check error: ${error.message}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * CLI interface for Docker health checks
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config: Partial<DockerHealthCheckConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--endpoint':
        config.healthEndpoint = value;
        break;
      case '--timeout':
        config.timeout = parseInt(value);
        break;
      case '--retries':
        config.retries = parseInt(value);
        break;
      case '--retry-delay':
        config.retryDelay = parseInt(value);
        break;
      case '--mode':
        config.mode = value as any;
        break;
      case '--verbose':
        config.verbose = true;
        i--; // No value for this flag
        break;
      case '--expected-status':
        config.expectedStatus = parseInt(value);
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  const healthCheck = new DockerHealthCheck(config);
  await healthCheck.run();
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
Docker Health Check for UEP Agents

Usage: node DockerHealthCheck.js [options]

Options:
  --endpoint <url>        Health check endpoint (default: http://localhost:8080/health)
  --timeout <ms>          Request timeout in milliseconds (default: 5000)
  --retries <count>       Number of retry attempts (default: 3)
  --retry-delay <ms>      Delay between retries in milliseconds (default: 1000)
  --mode <mode>           Health check mode: basic|detailed|compliance (default: basic)
  --verbose               Enable verbose logging
  --expected-status <code> Expected HTTP status code (default: 200)
  --help                  Show this help message

Environment Variables:
  HEALTH_ENDPOINT         Same as --endpoint
  HEALTH_TIMEOUT          Same as --timeout
  HEALTH_RETRIES          Same as --retries
  HEALTH_RETRY_DELAY      Same as --retry-delay
  HEALTH_MODE             Same as --mode
  HEALTH_VERBOSE          Set to 'true' to enable verbose logging
  HEALTH_EXPECTED_STATUS  Same as --expected-status

Exit Codes:
  0 - Health check passed
  1 - Health check failed

Examples:
  # Basic health check
  node DockerHealthCheck.js

  # Verbose health check with custom endpoint
  node DockerHealthCheck.js --endpoint http://localhost:3000/health --verbose

  # Compliance check with custom timeout
  node DockerHealthCheck.js --mode compliance --timeout 10000

  # Use in Dockerfile
  HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD node /app/DockerHealthCheck.js
`);
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Health check script error:', error);
    process.exit(1);
  });
}

export {
  DockerHealthCheck,
  DockerHealthCheckConfig,
  HealthCheckResult
};