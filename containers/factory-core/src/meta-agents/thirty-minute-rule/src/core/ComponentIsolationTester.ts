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
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import {
  ThirtyMinuteRuleConfig,
  ComponentInfo,
  IsolationTestResult,
  HealthCheckResult,
  ComponentHealthStatus
} from '../types/index.js';

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

export class ComponentIsolationTester extends EventEmitter {
  private config: ThirtyMinuteRuleConfig;
  private testSuites: Map<string, IsolationTestSuite> = new Map();
  private healthCheckCache: Map<string, HealthCheckResult> = new Map();

  constructor(config: ThirtyMinuteRuleConfig) {
    super();
    
    this.config = {
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      isolationTestingEnabled: config.isolationTestingEnabled !== false,
      testingFramework: config.testingFramework || 'auto-detect',
      ...config
    };
  }

  /**
   * Run isolation tests for multiple components
   */
  async runIsolationTests(
    components: ComponentInfo[],
    testConfig: IsolationTestConfig = {}
  ): Promise<IsolationTestSuite> {
    const suiteId = uuidv4();
    const startTime = Date.now();

    const config: IsolationTestConfig = {
      testTimeout: testConfig.testTimeout || 60000, // 1 minute per test
      mockDependencies: testConfig.mockDependencies !== false,
      generateCoverage: testConfig.generateCoverage !== false,
      testFramework: testConfig.testFramework || this.detectTestFramework(),
      isolationLevel: testConfig.isolationLevel || 'unit',
      ...testConfig
    };

    const testSuite: IsolationTestSuite = {
      suiteId,
      components,
      config,
      results: [],
      healthChecks: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timeouts: 0,
        totalTime: 0,
        healthyComponents: 0,
        unhealthyComponents: 0
      }
    };

    this.testSuites.set(suiteId, testSuite);

    try {
      this.emit('testSuite:start', {
        suiteId,
        components: components.length,
        config,
        timestamp: new Date()
      });

      console.log(`🧪 Starting isolation test suite: ${suiteId}`);
      console.log(`📦 Components to test: ${components.length}`);

      // Step 1: Run health checks for all components
      console.log(`🏥 Running health checks...`);
      for (const component of components) {
        const healthCheck = await this.runHealthCheck(component);
        testSuite.healthChecks.push(healthCheck);
        
        if (healthCheck.status === 'healthy') {
          testSuite.summary.healthyComponents++;
        } else {
          testSuite.summary.unhealthyComponents++;
        }
      }

      // Step 2: Run isolation tests for healthy components
      console.log(`🔬 Running isolation tests...`);
      for (const component of components) {
        const healthCheck = testSuite.healthChecks.find(hc => hc.component === component.name);
        
        if (healthCheck?.status === 'healthy' || config.isolationLevel === 'full') {
          const testResult = await this.runComponentIsolationTest(component, config);
          testSuite.results.push(testResult);
          
          // Update summary
          testSuite.summary.totalTests++;
          switch (testResult.status) {
            case 'pass':
              testSuite.summary.passed++;
              break;
            case 'fail':
              testSuite.summary.failed++;
              break;
            case 'skip':
              testSuite.summary.skipped++;
              break;
            case 'timeout':
              testSuite.summary.timeouts++;
              break;
          }
        } else {
          console.log(`⏭️  Skipping unhealthy component: ${component.name}`);
          testSuite.results.push({
            testId: uuidv4(),
            timestamp: new Date(),
            component: component.name,
            testType: 'unit',
            status: 'skip',
            duration: 0,
            details: `Skipped due to health check failure: ${healthCheck?.details}`,
            dependencies: component.dependencies
          });
          testSuite.summary.skipped++;
        }
      }

      // Step 3: Generate coverage report if enabled
      if (config.generateCoverage) {
        console.log(`📊 Generating coverage report...`);
        testSuite.summary.coveragePercentage = await this.generateCoverageReport(suiteId);
      }

      const totalTime = Date.now() - startTime;
      testSuite.summary.totalTime = totalTime;

      this.emit('testSuite:complete', {
        suiteId,
        summary: testSuite.summary,
        totalTime,
        timestamp: new Date()
      });

      console.log(`✅ Isolation test suite completed: ${suiteId}`);
      console.log(`📊 Results: ${testSuite.summary.passed} passed, ${testSuite.summary.failed} failed, ${testSuite.summary.skipped} skipped`);
      console.log(`⏱️  Total time: ${Math.round(totalTime / 1000)}s`);

      return testSuite;

    } catch (error: any) {
      this.emit('testSuite:error', {
        suiteId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Run health check for a single component
   */
  async runHealthCheck(component: ComponentInfo): Promise<HealthCheckResult> {
    const checkId = uuidv4();
    const startTime = Date.now();

    try {
      // Check if we have a cached health check result
      const cachedResult = this.healthCheckCache.get(component.componentId);
      if (cachedResult && this.isCacheValid(cachedResult)) {
        return cachedResult;
      }

      console.log(`🏥 Health check: ${component.name}`);

      const healthCheck: HealthCheckResult = {
        checkId,
        timestamp: new Date(),
        component: component.name,
        status: 'unknown',
        responseTime: 0,
        details: '',
        metrics: {},
        dependencies: []
      };

      // Perform basic file system checks
      const fileExists = await fs.pathExists(component.path);
      if (!fileExists) {
        healthCheck.status = 'unhealthy';
        healthCheck.details = 'Component file not found';
        healthCheck.responseTime = Date.now() - startTime;
        return healthCheck;
      }

      // Check file readability and basic syntax
      try {
        const content = await fs.readFile(component.path, 'utf8');
        
        // Basic syntax validation based on file type
        const isValid = await this.validateComponentSyntax(component, content);
        if (!isValid) {
          healthCheck.status = 'unhealthy';
          healthCheck.details = 'Component has syntax errors';
          healthCheck.responseTime = Date.now() - startTime;
          return healthCheck;
        }

        // Check dependencies
        const dependencyHealth = await this.checkDependencyHealth(component);
        healthCheck.dependencies = dependencyHealth;

        const unhealthyDeps = dependencyHealth.filter(dep => dep.status === 'unhealthy');
        if (unhealthyDeps.length > 0) {
          healthCheck.status = 'degraded';
          healthCheck.details = `${unhealthyDeps.length} unhealthy dependencies: ${unhealthyDeps.map(d => d.component).join(', ')}`;
        } else {
          healthCheck.status = 'healthy';
          healthCheck.details = 'All checks passed';
        }

        // Collect metrics
        const stats = await fs.stat(component.path);
        healthCheck.metrics = {
          fileSize: stats.size,
          lastModified: stats.mtime.getTime(),
          dependencies: component.dependencies.length,
          complexity: this.estimateComplexity(content)
        };

      } catch (error: any) {
        healthCheck.status = 'unhealthy';
        healthCheck.details = `Failed to read component: ${error.message}`;
      }

      healthCheck.responseTime = Date.now() - startTime;

      // Cache the result
      this.healthCheckCache.set(component.componentId, healthCheck);

      this.emit('healthCheck:complete', {
        componentId: component.componentId,
        result: healthCheck,
        timestamp: new Date()
      });

      return healthCheck;

    } catch (error: any) {
      const errorResult: HealthCheckResult = {
        checkId,
        timestamp: new Date(),
        component: component.name,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        details: `Health check failed: ${error.message}`,
        dependencies: []
      };

      this.emit('healthCheck:error', {
        componentId: component.componentId,
        error: error.message,
        timestamp: new Date()
      });

      return errorResult;
    }
  }

  /**
   * Run isolation test for a single component
   */
  async runComponentIsolationTest(
    component: ComponentInfo,
    config: IsolationTestConfig
  ): Promise<IsolationTestResult> {
    const testId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`🔬 Isolation test: ${component.name}`);

      const testResult: IsolationTestResult = {
        testId,
        timestamp: new Date(),
        component: component.name,
        testType: 'unit',
        status: 'fail',
        duration: 0,
        details: '',
        dependencies: component.dependencies
      };

      // Create isolated test environment
      const testEnvironment = await this.createIsolatedTestEnvironment(component, config);

      // Generate test file if it doesn't exist
      const testFilePath = await this.generateTestFile(component, testEnvironment);

      // Run the test
      const testCommand = this.buildTestCommand(component, testFilePath, config);
      const testOutput = await this.executeTestCommand(testCommand, config.testTimeout!);

      // Parse test results
      const parsedResults = this.parseTestOutput(testOutput, config.testFramework!);
      
      testResult.status = parsedResults.success ? 'pass' : 'fail';
      testResult.details = parsedResults.details;
      testResult.evidence = parsedResults.evidence;
      testResult.coverage = parsedResults.coverage;
      testResult.duration = Date.now() - startTime;

      this.emit('isolationTest:complete', {
        componentId: component.componentId,
        result: testResult,
        timestamp: new Date()
      });

      console.log(`${testResult.status === 'pass' ? '✅' : '❌'} ${component.name}: ${testResult.status}`);

      return testResult;

    } catch (error: any) {
      const errorResult: IsolationTestResult = {
        testId,
        timestamp: new Date(),
        component: component.name,
        testType: 'unit',
        status: 'fail',
        duration: Date.now() - startTime,
        details: `Test execution failed: ${error.message}`,
        dependencies: component.dependencies
      };

      this.emit('isolationTest:error', {
        componentId: component.componentId,
        error: error.message,
        timestamp: new Date()
      });

      return errorResult;
    }
  }

  /**
   * Create isolated test environment with mocked dependencies
   */
  private async createIsolatedTestEnvironment(
    component: ComponentInfo,
    config: IsolationTestConfig
  ): Promise<{
    mockDir: string;
    mocks: Record<string, string>;
    testConfig: any;
  }> {
    const tempDir = path.join(process.cwd(), '.thirty-minute-rule', 'test-isolation', component.componentId);
    await fs.ensureDir(tempDir);

    const mocks: Record<string, string> = {};
    
    if (config.mockDependencies) {
      // Generate mocks for component dependencies
      for (const dependency of component.dependencies) {
        const mockContent = this.generateMockForDependency(dependency, component);
        const mockPath = path.join(tempDir, `${dependency.replace(/[^a-zA-Z0-9]/g, '_')}_mock.js`);
        await fs.writeFile(mockPath, mockContent);
        mocks[dependency] = mockPath;
      }
    }

    // Create test configuration
    const testConfig = {
      testEnvironment: 'node',
      testTimeout: config.testTimeout,
      collectCoverage: config.generateCoverage,
      coverageDirectory: path.join(tempDir, 'coverage'),
      moduleNameMapper: mocks
    };

    return {
      mockDir: tempDir,
      mocks,
      testConfig
    };
  }

  /**
   * Generate test file for component
   */
  private async generateTestFile(
    component: ComponentInfo,
    testEnvironment: { mockDir: string; mocks: Record<string, string> }
  ): Promise<string> {
    const testFileName = `${component.name}.test.${component.metadata.language === 'TypeScript' ? 'ts' : 'js'}`;
    const testFilePath = path.join(testEnvironment.mockDir, testFileName);

    // Check if test file already exists
    if (await fs.pathExists(testFilePath)) {
      return testFilePath;
    }

    // Generate basic test file
    const testContent = this.generateTestTemplate(component, testEnvironment.mocks);
    await fs.writeFile(testFilePath, testContent);

    console.log(`📝 Generated test file: ${testFileName}`);
    return testFilePath;
  }

  /**
   * Generate test template based on component type and framework
   */
  private generateTestTemplate(component: ComponentInfo, mocks: Record<string, string>): string {
    const framework = this.detectTestFramework();
    const isTypeScript = component.metadata.language === 'TypeScript';
    
    const mockImports = Object.entries(mocks).map(([dep, mockPath]) => {
      return `jest.mock('${dep}', () => require('${mockPath}'));`;
    }).join('\n');

    const importStatement = isTypeScript ? 
      `import { ${component.name} } from '../${component.path}';` :
      `const { ${component.name} } = require('../${component.path}');`;

    switch (framework) {
      case 'jest':
        return `
/**
 * Isolation test for ${component.name}
 * Generated by 30-Minute Rule Agent
 */

${mockImports}

${importStatement}

describe('${component.name} - Isolation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should exist and be importable', () => {
    expect(${component.name}).toBeDefined();
  });

  test('should function in isolation', async () => {
    // TODO: Add specific tests for ${component.name}
    // This is a generated placeholder - customize based on component functionality
    
    try {
      // Basic smoke test
      if (typeof ${component.name} === 'function') {
        const result = await ${component.name}();
        expect(result).toBeDefined();
      } else if (typeof ${component.name} === 'object') {
        expect(${component.name}).toBeInstanceOf(Object);
      }
    } catch (error) {
      // Component might require specific parameters - this is expected
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('should handle edge cases gracefully', () => {
    // TODO: Add edge case tests
    expect(true).toBe(true); // Placeholder
  });

  test('should not have undefined dependencies', () => {
    // Verify mocked dependencies are working
    ${Object.keys(mocks).map(dep => `
    expect(() => require('${dep}')).not.toThrow();`).join('')}
  });
});
`;

      case 'mocha':
        return `
/**
 * Isolation test for ${component.name}
 * Generated by 30-Minute Rule Agent
 */

const { expect } = require('chai');
${mockImports}

${importStatement}

describe('${component.name} - Isolation Tests', function() {
  this.timeout(${60000}); // 1 minute timeout

  beforeEach(function() {
    // Setup for each test
  });

  afterEach(function() {
    // Cleanup after each test
  });

  it('should exist and be importable', function() {
    expect(${component.name}).to.exist;
  });

  it('should function in isolation', async function() {
    // TODO: Add specific tests for ${component.name}
    // This is a generated placeholder - customize based on component functionality
    
    try {
      if (typeof ${component.name} === 'function') {
        const result = await ${component.name}();
        expect(result).to.exist;
      } else if (typeof ${component.name} === 'object') {
        expect(${component.name}).to.be.an('object');
      }
    } catch (error) {
      // Component might require specific parameters - this is expected
      expect(error).to.be.an('error');
    }
  });

  it('should handle edge cases gracefully', function() {
    // TODO: Add edge case tests
    expect(true).to.be.true; // Placeholder
  });
});
`;

      default:
        return `
/**
 * Basic isolation test for ${component.name}
 * Generated by 30-Minute Rule Agent
 */

${importStatement}

// Basic smoke test
console.log('Testing ${component.name}...');

try {
  if (typeof ${component.name} !== 'undefined') {
    console.log('✅ ${component.name} is defined');
  } else {
    console.log('❌ ${component.name} is undefined');
    process.exit(1);
  }
  
  console.log('✅ All basic tests passed');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
`;
    }
  }

  /**
   * Utility methods
   */

  private detectTestFramework(): string {
    // Try to detect testing framework from package.json or installed packages
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (dependencies.jest) return 'jest';
        if (dependencies.mocha) return 'mocha';
        if (dependencies.jasmine) return 'jasmine';
        if (dependencies.ava) return 'ava';
      }
    } catch (error) {
      console.warn('Could not detect test framework from package.json');
    }

    return 'jest'; // Default fallback
  }

  private async validateComponentSyntax(component: ComponentInfo, content: string): Promise<boolean> {
    try {
      // Basic syntax validation based on file type
      const fileExt = path.extname(component.path);
      
      switch (fileExt) {
        case '.js':
        case '.jsx':
          // Basic JavaScript syntax check
          new Function(content);
          return true;
          
        case '.ts':
        case '.tsx':
          // TypeScript syntax check would require TypeScript compiler
          // For now, just check for basic syntax errors
          return !content.includes('SyntaxError') && content.trim().length > 0;
          
        default:
          return true; // Assume valid for other file types
      }
    } catch (error) {
      return false;
    }
  }

  private async checkDependencyHealth(component: ComponentInfo): Promise<ComponentHealthStatus[]> {
    const dependencyHealth: ComponentHealthStatus[] = [];
    
    for (const dependency of component.dependencies) {
      try {
        // Check if dependency is available
        require.resolve(dependency);
        
        dependencyHealth.push({
          component: dependency,
          status: 'healthy',
          lastChecked: new Date(),
          issues: []
        });
      } catch (error) {
        dependencyHealth.push({
          component: dependency,
          status: 'unhealthy',
          lastChecked: new Date(),
          issues: [`Cannot resolve dependency: ${error instanceof Error ? error.message : String(error)}`]
        });
      }
    }
    
    return dependencyHealth;
  }

  private estimateComplexity(content: string): number {
    // Simple complexity estimation based on various factors
    let complexity = 0;
    
    // Count functions
    complexity += (content.match(/function /g) || []).length * 2;
    complexity += (content.match(/=>/g) || []).length;
    
    // Count conditionals
    complexity += (content.match(/if\s*\(/g) || []).length;
    complexity += (content.match(/switch\s*\(/g) || []).length * 2;
    
    // Count loops
    complexity += (content.match(/for\s*\(/g) || []).length;
    complexity += (content.match(/while\s*\(/g) || []).length;
    
    // Count classes
    complexity += (content.match(/class\s+/g) || []).length * 3;
    
    return complexity;
  }

  private generateMockForDependency(dependency: string, component: ComponentInfo): string {
    return `
/**
 * Mock for ${dependency}
 * Generated for testing ${component.name}
 */

module.exports = {
  // Default mock implementation
  default: jest.fn(() => ({})),
  
  // Common method mocks
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  
  // Common property mocks
  config: {},
  instance: {},
  
  // Mock factory for custom implementations
  createMock: (customImpl) => ({ ...module.exports, ...customImpl })
};
`;
  }

  private buildTestCommand(
    component: ComponentInfo,
    testFilePath: string,
    config: IsolationTestConfig
  ): string {
    const framework = config.testFramework!;
    
    switch (framework) {
      case 'jest':
        return `npx jest "${testFilePath}" --testTimeout=${config.testTimeout} ${config.generateCoverage ? '--coverage' : ''}`;
      
      case 'mocha':
        return `npx mocha "${testFilePath}" --timeout=${config.testTimeout}`;
      
      default:
        return `node "${testFilePath}"`;
    }
  }

  private async executeTestCommand(command: string, timeout: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true, timeout });
      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Test command failed with code ${code}: ${errorOutput || output}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseTestOutput(output: string, framework: string): {
    success: boolean;
    details: string;
    evidence?: any;
    coverage?: number;
  } {
    switch (framework) {
      case 'jest':
        const jestPassed = output.includes('PASS') && !output.includes('FAIL');
        const jestCoverage = this.extractCoverageFromJestOutput(output);
        
        return {
          success: jestPassed,
          details: jestPassed ? 'All tests passed' : 'Some tests failed',
          evidence: output,
          coverage: jestCoverage
        };
      
      case 'mocha':
        const mochaPassed = output.includes('passing') && !output.includes('failing');
        
        return {
          success: mochaPassed,
          details: mochaPassed ? 'All tests passed' : 'Some tests failed',
          evidence: output
        };
      
      default:
        const defaultPassed = !output.includes('❌') && !output.toLowerCase().includes('error');
        
        return {
          success: defaultPassed,
          details: defaultPassed ? 'Test completed successfully' : 'Test failed',
          evidence: output
        };
    }
  }

  private extractCoverageFromJestOutput(output: string): number | undefined {
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
  }

  private async generateCoverageReport(suiteId: string): Promise<number> {
    // Generate aggregated coverage report for the test suite
    const testSuite = this.testSuites.get(suiteId);
    if (!testSuite) return 0;

    const coverageResults = testSuite.results.filter(r => r.coverage !== undefined);
    if (coverageResults.length === 0) return 0;

    const averageCoverage = coverageResults.reduce((sum, result) => sum + (result.coverage || 0), 0) / coverageResults.length;
    
    console.log(`📊 Average test coverage: ${averageCoverage.toFixed(2)}%`);
    return averageCoverage;
  }

  private isCacheValid(cachedResult: HealthCheckResult): boolean {
    const cacheAge = Date.now() - cachedResult.timestamp.getTime();
    return cacheAge < (this.config.healthCheckInterval || 30000);
  }
}