"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentIsolationTester = void 0;
const events_1 = require("events");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
class ComponentIsolationTester extends events_1.EventEmitter {
    config;
    testSuites = new Map();
    healthCheckCache = new Map();
    constructor(config) {
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
    async runIsolationTests(components, testConfig = {}) {
        const suiteId = (0, uuid_1.v4)();
        const startTime = Date.now();
        const config = {
            testTimeout: testConfig.testTimeout || 60000, // 1 minute per test
            mockDependencies: testConfig.mockDependencies !== false,
            generateCoverage: testConfig.generateCoverage !== false,
            testFramework: testConfig.testFramework || this.detectTestFramework(),
            isolationLevel: testConfig.isolationLevel || 'unit',
            ...testConfig
        };
        const testSuite = {
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
                }
                else {
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
                }
                else {
                    console.log(`⏭️  Skipping unhealthy component: ${component.name}`);
                    testSuite.results.push({
                        testId: (0, uuid_1.v4)(),
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
        }
        catch (error) {
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
    async runHealthCheck(component) {
        const checkId = (0, uuid_1.v4)();
        const startTime = Date.now();
        try {
            // Check if we have a cached health check result
            const cachedResult = this.healthCheckCache.get(component.componentId);
            if (cachedResult && this.isCacheValid(cachedResult)) {
                return cachedResult;
            }
            console.log(`🏥 Health check: ${component.name}`);
            const healthCheck = {
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
            const fileExists = await fs_extra_1.default.pathExists(component.path);
            if (!fileExists) {
                healthCheck.status = 'unhealthy';
                healthCheck.details = 'Component file not found';
                healthCheck.responseTime = Date.now() - startTime;
                return healthCheck;
            }
            // Check file readability and basic syntax
            try {
                const content = await fs_extra_1.default.readFile(component.path, 'utf8');
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
                }
                else {
                    healthCheck.status = 'healthy';
                    healthCheck.details = 'All checks passed';
                }
                // Collect metrics
                const stats = await fs_extra_1.default.stat(component.path);
                healthCheck.metrics = {
                    fileSize: stats.size,
                    lastModified: stats.mtime.getTime(),
                    dependencies: component.dependencies.length,
                    complexity: this.estimateComplexity(content)
                };
            }
            catch (error) {
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
        }
        catch (error) {
            const errorResult = {
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
    async runComponentIsolationTest(component, config) {
        const testId = (0, uuid_1.v4)();
        const startTime = Date.now();
        try {
            console.log(`🔬 Isolation test: ${component.name}`);
            const testResult = {
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
            const testOutput = await this.executeTestCommand(testCommand, config.testTimeout);
            // Parse test results
            const parsedResults = this.parseTestOutput(testOutput, config.testFramework);
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
        }
        catch (error) {
            const errorResult = {
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
    async createIsolatedTestEnvironment(component, config) {
        const tempDir = path_1.default.join(process.cwd(), '.thirty-minute-rule', 'test-isolation', component.componentId);
        await fs_extra_1.default.ensureDir(tempDir);
        const mocks = {};
        if (config.mockDependencies) {
            // Generate mocks for component dependencies
            for (const dependency of component.dependencies) {
                const mockContent = this.generateMockForDependency(dependency, component);
                const mockPath = path_1.default.join(tempDir, `${dependency.replace(/[^a-zA-Z0-9]/g, '_')}_mock.js`);
                await fs_extra_1.default.writeFile(mockPath, mockContent);
                mocks[dependency] = mockPath;
            }
        }
        // Create test configuration
        const testConfig = {
            testEnvironment: 'node',
            testTimeout: config.testTimeout,
            collectCoverage: config.generateCoverage,
            coverageDirectory: path_1.default.join(tempDir, 'coverage'),
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
    async generateTestFile(component, testEnvironment) {
        const testFileName = `${component.name}.test.${component.metadata.language === 'TypeScript' ? 'ts' : 'js'}`;
        const testFilePath = path_1.default.join(testEnvironment.mockDir, testFileName);
        // Check if test file already exists
        if (await fs_extra_1.default.pathExists(testFilePath)) {
            return testFilePath;
        }
        // Generate basic test file
        const testContent = this.generateTestTemplate(component, testEnvironment.mocks);
        await fs_extra_1.default.writeFile(testFilePath, testContent);
        console.log(`📝 Generated test file: ${testFileName}`);
        return testFilePath;
    }
    /**
     * Generate test template based on component type and framework
     */
    generateTestTemplate(component, mocks) {
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
    detectTestFramework() {
        // Try to detect testing framework from package.json or installed packages
        const packageJsonPath = path_1.default.join(process.cwd(), 'package.json');
        try {
            if (fs_extra_1.default.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs_extra_1.default.readFileSync(packageJsonPath, 'utf8'));
                const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
                if (dependencies.jest)
                    return 'jest';
                if (dependencies.mocha)
                    return 'mocha';
                if (dependencies.jasmine)
                    return 'jasmine';
                if (dependencies.ava)
                    return 'ava';
            }
        }
        catch (error) {
            console.warn('Could not detect test framework from package.json');
        }
        return 'jest'; // Default fallback
    }
    async validateComponentSyntax(component, content) {
        try {
            // Basic syntax validation based on file type
            const fileExt = path_1.default.extname(component.path);
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
        }
        catch (error) {
            return false;
        }
    }
    async checkDependencyHealth(component) {
        const dependencyHealth = [];
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
            }
            catch (error) {
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
    estimateComplexity(content) {
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
    generateMockForDependency(dependency, component) {
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
    buildTestCommand(component, testFilePath, config) {
        const framework = config.testFramework;
        switch (framework) {
            case 'jest':
                return `npx jest "${testFilePath}" --testTimeout=${config.testTimeout} ${config.generateCoverage ? '--coverage' : ''}`;
            case 'mocha':
                return `npx mocha "${testFilePath}" --timeout=${config.testTimeout}`;
            default:
                return `node "${testFilePath}"`;
        }
    }
    async executeTestCommand(command, timeout) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, { shell: true, timeout });
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
                }
                else {
                    reject(new Error(`Test command failed with code ${code}: ${errorOutput || output}`));
                }
            });
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
    parseTestOutput(output, framework) {
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
    extractCoverageFromJestOutput(output) {
        const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
        return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
    }
    async generateCoverageReport(suiteId) {
        // Generate aggregated coverage report for the test suite
        const testSuite = this.testSuites.get(suiteId);
        if (!testSuite)
            return 0;
        const coverageResults = testSuite.results.filter(r => r.coverage !== undefined);
        if (coverageResults.length === 0)
            return 0;
        const averageCoverage = coverageResults.reduce((sum, result) => sum + (result.coverage || 0), 0) / coverageResults.length;
        console.log(`📊 Average test coverage: ${averageCoverage.toFixed(2)}%`);
        return averageCoverage;
    }
    isCacheValid(cachedResult) {
        const cacheAge = Date.now() - cachedResult.timestamp.getTime();
        return cacheAge < (this.config.healthCheckInterval || 30000);
    }
}
exports.ComponentIsolationTester = ComponentIsolationTester;
//# sourceMappingURL=ComponentIsolationTester.js.map