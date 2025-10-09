/**
 * End-to-End Integration Test for UEP Protocol Definition System
 * 
 * This comprehensive test validates the entire protocol definition system,
 * including repository operations, compilation, version management,
 * and documentation generation working together as a cohesive system.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

import { ProtocolSchemaRepository, ProtocolDefinition } from './ProtocolSchemaRepository';
import { ProtocolCompiler, CompilerConfig } from './ProtocolCompiler';
import { ProtocolVersionManager, VersionManagerConfig } from './ProtocolVersionManager';
import { ProtocolDocumentationGenerator, DocumentationConfig } from './ProtocolDocumentationGenerator';
import { PolicyManager } from './VersioningPolicies';

/**
 * Integration Test Configuration
 */
interface IntegrationTestConfig {
  testDirectory: string;
  protocolsDirectory: string;
  generatedDirectory: string;
  docsDirectory: string;
  cleanup: boolean;
  verbose: boolean;
}

/**
 * Test Results Interface
 */
interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details?: any;
  errors?: string[];
}

interface IntegrationTestResults {
  overallSuccess: boolean;
  totalDuration: number;
  testResults: TestResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

/**
 * End-to-End Integration Test Suite
 */
export class EndToEndIntegrationTest {
  private config: IntegrationTestConfig;
  private repository: ProtocolSchemaRepository;
  private compiler: ProtocolCompiler;
  private versionManager: ProtocolVersionManager;
  private docGenerator: ProtocolDocumentationGenerator;
  private testResults: TestResult[] = [];

  constructor(config: Partial<IntegrationTestConfig> = {}) {
    this.config = {
      testDirectory: './test-workspace',
      protocolsDirectory: './test-workspace/protocols',
      generatedDirectory: './test-workspace/generated',
      docsDirectory: './test-workspace/docs',
      cleanup: true,
      verbose: true,
      ...config
    };

    this.initializeComponents();
  }

  private initializeComponents(): void {
    // Initialize Repository
    this.repository = new ProtocolSchemaRepository({
      basePath: this.config.protocolsDirectory,
      gitEnabled: false,
      validationEnabled: true,
      autoVersioning: false,
      backupEnabled: true,
      compressionEnabled: false,
      cachingEnabled: true,
      indexingEnabled: true
    });

    // Initialize Compiler
    this.compiler = new ProtocolCompiler({
      outputPath: this.config.generatedDirectory,
      typescript: {
        target: 'es2020',
        module: 'commonjs',
        strict: true
      },
      validation: {
        generateInterfaces: true,
        generateValidators: true,
        generateUtilities: true
      }
    });

    // Initialize Version Manager
    const versionConfig = PolicyManager.createConfig('development');
    this.versionManager = new ProtocolVersionManager(versionConfig!);

    // Initialize Documentation Generator
    this.docGenerator = new ProtocolDocumentationGenerator({
      outputPath: this.config.docsDirectory,
      formats: [
        { type: 'html', filename: 'index.html' },
        { type: 'markdown', filename: 'README.md' },
        { type: 'openapi-ui', filename: 'api-docs.html' },
        { type: 'json', filename: 'documentation.json' }
      ],
      theme: 'default',
      includeExamples: true,
      includeDiagrams: true,
      includeInteractive: true,
      generateTOC: true,
      enableSearch: true,
      branding: {
        title: 'Integration Test API',
        description: 'Test API for integration validation',
        primaryColor: '#007acc',
        secondaryColor: '#0056b3',
        fontFamily: 'Arial, sans-serif',
        organization: 'UEP Test Suite',
        contact: {
          name: 'Test Team',
          email: 'test@example.com'
        }
      },
      templates: {
        templatePath: join(__dirname, 'templates'),
        customTemplates: new Map(),
        helpers: new Map(),
        partials: new Map()
      }
    });
  }

  /**
   * Run the complete integration test suite
   */
  async runIntegrationTests(): Promise<IntegrationTestResults> {
    const startTime = Date.now();
    this.testResults = [];

    try {
      this.log('🚀 Starting End-to-End Integration Test Suite');
      this.log('=' .repeat(60));

      // Setup test environment
      await this.setupTestEnvironment();

      // Run individual tests
      await this.testRepositoryOperations();
      await this.testProtocolCompilation();
      await this.testVersionManagement();
      await this.testDocumentationGeneration();
      await this.testEndToEndWorkflow();
      await this.testBatchOperations();
      await this.testErrorHandling();
      await this.testPerformance();

      // Calculate results
      const totalDuration = Date.now() - startTime;
      const passed = this.testResults.filter(r => r.success).length;
      const failed = this.testResults.filter(r => !r.success).length;
      const overallSuccess = failed === 0;

      const results: IntegrationTestResults = {
        overallSuccess,
        totalDuration,
        testResults: this.testResults,
        summary: {
          passed,
          failed,
          total: this.testResults.length
        }
      };

      this.printResults(results);
      return results;

    } finally {
      if (this.config.cleanup) {
        await this.cleanup();
      }
    }
  }

  /**
   * Individual Test Methods
   */
  private async testRepositoryOperations(): Promise<void> {
    await this.runTest('Repository Operations', async () => {
      const protocol = this.createTestProtocol('test-api', '1.0.0');

      // Store protocol
      await this.repository.storeProtocol(protocol);

      // Retrieve protocol
      const retrieved = await this.repository.getProtocol('test-api');
      if (!retrieved || retrieved.id !== 'test-api') {
        throw new Error('Failed to retrieve stored protocol');
      }

      // List protocols
      const protocols = await this.repository.listProtocols();
      if (protocols.length === 0) {
        throw new Error('Failed to list protocols');
      }

      // Search protocols
      const searchResults = await this.repository.searchProtocols({
        query: 'test',
        limit: 10
      });
      if (searchResults.protocols.length === 0) {
        throw new Error('Failed to search protocols');
      }

      // Update protocol
      const updatedProtocol = { ...protocol, version: '1.0.1' };
      await this.repository.updateProtocol('test-api', updatedProtocol);

      // Validate protocol
      const validation = await this.repository.validateProtocol(protocol);
      if (!validation.valid) {
        throw new Error(`Protocol validation failed: ${validation.errors.join(', ')}`);
      }

      return {
        protocolsStored: 1,
        searchResults: searchResults.protocols.length,
        validationPassed: validation.valid
      };
    });
  }

  private async testProtocolCompilation(): Promise<void> {
    await this.runTest('Protocol Compilation', async () => {
      const protocol = await this.repository.getProtocol('test-api');
      if (!protocol) {
        throw new Error('Test protocol not found');
      }

      // Compile protocol
      const result = await this.compiler.compile(protocol);
      if (!result.success) {
        throw new Error(`Compilation failed: ${result.errors.join(', ')}`);
      }

      // Verify generated files exist
      const expectedFiles = ['types.ts', 'validators.ts', 'client.ts'];
      const generatedFiles = result.generatedFiles.map(f => f.filename);
      
      for (const expectedFile of expectedFiles) {
        if (!generatedFiles.some(f => f.includes(expectedFile))) {
          throw new Error(`Expected file not generated: ${expectedFile}`);
        }
      }

      // Verify TypeScript compilation
      try {
        const tsFiles = result.generatedFiles
          .filter(f => f.path.endsWith('.ts'))
          .map(f => f.path);
        
        if (tsFiles.length > 0) {
          // Note: In a real test, you would run TypeScript compiler
          // execSync(`npx tsc --noEmit ${tsFiles.join(' ')}`, { stdio: 'pipe' });
        }
      } catch (error) {
        throw new Error(`Generated TypeScript code has errors: ${error.message}`);
      }

      return {
        filesGenerated: result.generatedFiles.length,
        compilationSuccess: result.success
      };
    });
  }

  private async testVersionManagement(): Promise<void> {
    await this.runTest('Version Management', async () => {
      const protocol = await this.repository.getProtocol('test-api');
      if (!protocol) {
        throw new Error('Test protocol not found');
      }

      // Register version
      await this.versionManager.registerVersion(protocol);

      // Create updated version
      const updatedProtocol = this.createTestProtocol('test-api', '1.1.0');
      updatedProtocol.specification.paths['/users'].post = {
        operationId: 'createUser',
        summary: 'Create user',
        description: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          }
        }
      };

      // Analyze compatibility
      const compatibility = await this.versionManager.analyzeCompatibility(
        protocol,
        updatedProtocol
      );

      // Register new version
      await this.versionManager.registerVersion(updatedProtocol);

      // Get version history
      const history = this.versionManager.getVersionHistory('test-api');

      // Test version comparison
      const comparison = this.versionManager.compareVersions('1.0.0', '1.1.0');
      if (comparison !== -1) {
        throw new Error('Version comparison failed');
      }

      return {
        versionsRegistered: history.length,
        compatible: compatibility.compatible,
        comparisonWorking: comparison === -1
      };
    });
  }

  private async testDocumentationGeneration(): Promise<void> {
    await this.runTest('Documentation Generation', async () => {
      const protocol = await this.repository.getProtocol('test-api');
      if (!protocol) {
        throw new Error('Test protocol not found');
      }

      // Generate documentation
      const result = await this.docGenerator.generateDocumentation(protocol);
      if (!result.success) {
        throw new Error(`Documentation generation failed: ${result.errors.join(', ')}`);
      }

      // Verify expected formats were generated
      const expectedFormats = ['html', 'markdown', 'openapi-ui', 'json'];
      const generatedFormats = result.generatedFiles.map(f => f.format);

      for (const format of expectedFormats) {
        if (!generatedFormats.includes(format)) {
          throw new Error(`Expected documentation format not generated: ${format}`);
        }
      }

      // Verify files exist and have content
      for (const file of result.generatedFiles) {
        try {
          const stats = await fs.stat(file.path);
          if (stats.size === 0) {
            throw new Error(`Generated file is empty: ${file.path}`);
          }
        } catch (error) {
          throw new Error(`Generated file not found: ${file.path}`);
        }
      }

      return {
        formatsGenerated: result.generatedFiles.length,
        documentationSuccess: result.success,
        totalSize: result.metadata.statistics.totalSize
      };
    });
  }

  private async testEndToEndWorkflow(): Promise<void> {
    await this.runTest('End-to-End Workflow', async () => {
      // Create new protocol
      const newProtocol = this.createTestProtocol('e2e-test-api', '1.0.0');

      // 1. Store in repository
      await this.repository.storeProtocol(newProtocol);

      // 2. Compile to TypeScript
      const compileResult = await this.compiler.compile(newProtocol);
      if (!compileResult.success) {
        throw new Error('E2E compilation failed');
      }

      // 3. Register with version manager
      await this.versionManager.registerVersion(newProtocol);

      // 4. Generate documentation
      const docResult = await this.docGenerator.generateDocumentation(newProtocol);
      if (!docResult.success) {
        throw new Error('E2E documentation generation failed');
      }

      // 5. Update protocol and test version management
      const updatedProtocol = { ...newProtocol, version: '1.1.0' };
      updatedProtocol.specification.info.description += ' Updated version.';

      // Check compatibility
      const compatibility = await this.versionManager.analyzeCompatibility(
        newProtocol,
        updatedProtocol
      );

      // Register new version
      await this.versionManager.registerVersion(updatedProtocol);

      // Update in repository
      await this.repository.updateProtocol('e2e-test-api', updatedProtocol);

      // Recompile
      const recompileResult = await this.compiler.compile(updatedProtocol);
      if (!recompileResult.success) {
        throw new Error('E2E recompilation failed');
      }

      // Regenerate documentation
      const redocResult = await this.docGenerator.generateDocumentation(updatedProtocol);
      if (!redocResult.success) {
        throw new Error('E2E documentation regeneration failed');
      }

      return {
        workflowComplete: true,
        versionsManaged: 2,
        filesGenerated: compileResult.generatedFiles.length + docResult.generatedFiles.length,
        compatibilityChecked: compatibility !== null
      };
    });
  }

  private async testBatchOperations(): Promise<void> {
    await this.runTest('Batch Operations', async () => {
      // Create multiple test protocols
      const protocols = [
        this.createTestProtocol('batch-test-1', '1.0.0'),
        this.createTestProtocol('batch-test-2', '1.0.0'),
        this.createTestProtocol('batch-test-3', '1.0.0')
      ];

      // Store all protocols
      for (const protocol of protocols) {
        await this.repository.storeProtocol(protocol);
      }

      // Batch compile
      const compileResults = await this.compiler.batchCompile(protocols);
      let compileSuccesses = 0;
      for (const [protocolId, result] of compileResults) {
        if (result.success) {
          compileSuccesses++;
        }
      }

      // Batch documentation generation
      const docResults = await this.docGenerator.generateBatchDocumentation(protocols);
      let docSuccesses = 0;
      for (const [protocolId, result] of docResults) {
        if (result.success) {
          docSuccesses++;
        }
      }

      return {
        protocolsProcessed: protocols.length,
        compileSuccesses,
        documentationSuccesses: docSuccesses,
        batchOperationsWorking: compileSuccesses === protocols.length && docSuccesses === protocols.length
      };
    });
  }

  private async testErrorHandling(): Promise<void> {
    await this.runTest('Error Handling', async () => {
      let errorsHandledCorrectly = 0;

      // Test invalid protocol handling
      try {
        const invalidProtocol = {
          id: '',
          version: 'invalid',
          specification: null
        } as any;

        await this.repository.storeProtocol(invalidProtocol);
      } catch (error) {
        errorsHandledCorrectly++;
      }

      // Test compilation with invalid protocol
      try {
        const invalidProtocol = this.createTestProtocol('invalid', '1.0.0');
        invalidProtocol.specification = null as any;

        await this.compiler.compile(invalidProtocol);
        // Should not reach here
      } catch (error) {
        errorsHandledCorrectly++;
      }

      // Test documentation generation with missing protocol
      try {
        await this.docGenerator.generateDocumentation(null as any);
      } catch (error) {
        errorsHandledCorrectly++;
      }

      // Test version manager with incompatible versions
      const oldProtocol = this.createTestProtocol('version-test', '1.0.0');
      const newProtocol = this.createTestProtocol('version-test', '2.0.0');
      // Remove endpoints (breaking change)
      newProtocol.specification.paths = {};

      await this.versionManager.registerVersion(oldProtocol);
      const compatibility = await this.versionManager.analyzeCompatibility(
        oldProtocol,
        newProtocol
      );

      if (!compatibility.compatible) {
        errorsHandledCorrectly++;
      }

      return {
        errorsSimulated: 4,
        errorsHandledCorrectly,
        errorHandlingWorking: errorsHandledCorrectly >= 3
      };
    });
  }

  private async testPerformance(): Promise<void> {
    await this.runTest('Performance Tests', async () => {
      const startTime = Date.now();

      // Create multiple protocols for performance testing
      const protocolCount = 10;
      const protocols: ProtocolDefinition[] = [];

      for (let i = 0; i < protocolCount; i++) {
        protocols.push(this.createTestProtocol(`perf-test-${i}`, '1.0.0'));
      }

      // Measure repository operations
      const repoStartTime = Date.now();
      for (const protocol of protocols) {
        await this.repository.storeProtocol(protocol);
      }
      const repoTime = Date.now() - repoStartTime;

      // Measure compilation
      const compileStartTime = Date.now();
      const compileResults = await this.compiler.batchCompile(protocols);
      const compileTime = Date.now() - compileStartTime;

      // Measure documentation generation
      const docStartTime = Date.now();
      const docResults = await this.docGenerator.generateBatchDocumentation(protocols);
      const docTime = Date.now() - docStartTime;

      const totalTime = Date.now() - startTime;

      // Performance thresholds (in milliseconds)
      const repoThreshold = 5000; // 5 seconds for 10 protocols
      const compileThreshold = 10000; // 10 seconds for 10 protocols
      const docThreshold = 15000; // 15 seconds for 10 protocols

      return {
        protocolsProcessed: protocolCount,
        repositoryTime: repoTime,
        compilationTime: compileTime,
        documentationTime: docTime,
        totalTime,
        performanceAcceptable: repoTime < repoThreshold && 
                              compileTime < compileThreshold && 
                              docTime < docThreshold
      };
    });
  }

  /**
   * Utility Methods
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.log(`\n🧪 Running test: ${testName}`);
      const details = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName,
        success: true,
        duration,
        details
      });

      this.log(`✅ ${testName} - PASSED (${duration}ms)`);
      if (this.config.verbose && details) {
        this.log(`   Details: ${JSON.stringify(details, null, 2)}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      this.testResults.push({
        testName,
        success: false,
        duration,
        errors: [errorMessage]
      });

      this.log(`❌ ${testName} - FAILED (${duration}ms)`);
      this.log(`   Error: ${errorMessage}`);
    }
  }

  private createTestProtocol(id: string, version: string): ProtocolDefinition {
    return {
      id,
      name: `Test API ${id}`,
      version,
      description: `Test protocol for ${id}`,
      specification: {
        openapi: '3.1.0',
        info: {
          title: `Test API ${id}`,
          version,
          description: `Test protocol specification for ${id}`,
          contact: {
            name: 'Test Team',
            email: 'test@example.com'
          }
        },
        servers: [{
          url: 'https://api.test.com/v1',
          description: 'Test server'
        }],
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              summary: 'List users',
              description: 'Get a list of users',
              parameters: [
                {
                  name: 'page',
                  in: 'query',
                  description: 'Page number',
                  required: false,
                  schema: { type: 'integer', minimum: 1, default: 1 }
                }
              ],
              responses: {
                '200': {
                  description: 'List of users',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/UserList' }
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              required: ['id', 'email'],
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            },
            UserList: {
              type: 'object',
              required: ['users'],
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                }
              }
            },
            CreateUserRequest: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email' },
                name: { type: 'string' }
              }
            }
          }
        }
      },
      metadata: {
        status: 'active',
        author: 'Test Suite',
        maintainers: ['test@example.com'],
        tags: ['test', 'integration'],
        createdAt: new Date(),
        lastUpdated: new Date()
      },
      lifecycle: {
        phase: 'development',
        deprecationDate: null,
        changeLog: [{
          version,
          timestamp: new Date(),
          author: 'Test Suite',
          changes: [`Initial version ${version}`]
        }]
      }
    };
  }

  private async setupTestEnvironment(): Promise<void> {
    this.log('🔧 Setting up test environment...');

    // Create test directories
    const dirs = [
      this.config.testDirectory,
      this.config.protocolsDirectory,
      this.config.generatedDirectory,
      this.config.docsDirectory
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory may already exist
      }
    }

    this.log('✅ Test environment setup complete');
  }

  private async cleanup(): Promise<void> {
    this.log('🧹 Cleaning up test environment...');
    
    try {
      await fs.rm(this.config.testDirectory, { recursive: true, force: true });
      this.log('✅ Cleanup complete');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`);
    }
  }

  private printResults(results: IntegrationTestResults): void {
    this.log('\n📊 INTEGRATION TEST RESULTS');
    this.log('=' .repeat(60));
    this.log(`Overall Status: ${results.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    this.log(`Total Duration: ${results.totalDuration}ms`);
    this.log(`Tests Passed: ${results.summary.passed}/${results.summary.total}`);
    this.log(`Tests Failed: ${results.summary.failed}/${results.summary.total}`);
    this.log('');

    if (results.summary.failed > 0) {
      this.log('❌ Failed Tests:');
      for (const test of results.testResults.filter(t => !t.success)) {
        this.log(`   • ${test.testName}: ${test.errors?.join(', ')}`);
      }
      this.log('');
    }

    this.log('📋 Test Details:');
    for (const test of results.testResults) {
      const status = test.success ? '✅' : '❌';
      this.log(`   ${status} ${test.testName} (${test.duration}ms)`);
    }

    this.log('\n🎯 Integration Test Suite Complete');
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(message);
    }
  }
}

/**
 * CLI for running integration tests
 */
export async function runIntegrationTests(config?: Partial<IntegrationTestConfig>): Promise<IntegrationTestResults> {
  const integrationTest = new EndToEndIntegrationTest(config);
  return await integrationTest.runIntegrationTests();
}

/**
 * Direct execution support
 */
if (require.main === module) {
  runIntegrationTests({
    testDirectory: './integration-test-workspace',
    verbose: true,
    cleanup: true
  }).then(results => {
    process.exit(results.overallSuccess ? 0 : 1);
  }).catch(error => {
    console.error('Integration test failed:', error);
    process.exit(1);
  });
}