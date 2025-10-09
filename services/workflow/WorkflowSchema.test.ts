/**
 * UEP Workflow Schema Tests
 * 
 * Comprehensive test suite for workflow schema definition and versioning system.
 * Tests schema validation, migration capabilities, semantic versioning,
 * and compatibility checking functionality.
 * 
 * Research-based testing following 2024 best practices:
 * - JSON Schema validation testing
 * - Semantic versioning compliance
 * - Migration path validation
 * - Compatibility matrix testing
 * - Performance and memory testing
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 224.1
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { 
  WorkflowSchemaManager, 
  createWorkflowSchemaManager,
  WorkflowDefinition,
  WorkflowStep,
  ActionDefinition,
  ErrorStrategy,
  CoordinationConfig,
  MonitoringConfig
} from './WorkflowSchema';
import { 
  SchemaRegistry, 
  createSchemaRegistry,
  SchemaVersion,
  MigrationMetadata,
  CompatibilityResult
} from './SchemaVersioning';

// Mock fs for testing
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('UEP Workflow Schema Manager', () => {
  let schemaManager: WorkflowSchemaManager;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = './test-schemas';
    schemaManager = createWorkflowSchemaManager(tempDir);
  });

  afterEach(() => {
    schemaManager?.['logger']?.close?.();
  });

  describe('Schema Validation', () => {
    it('should validate a complete workflow definition', () => {
      const validWorkflow: WorkflowDefinition = {
        id: 'test-workflow-1',
        name: 'Test Workflow',
        description: 'A test workflow for validation',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        tags: ['test', 'validation'],
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            description: 'Initial processing step',
            requiredCapabilities: ['processing', 'data-validation'],
            preferredAgents: ['agent-1'],
            action: {
              type: 'http',
              endpoint: 'https://api.example.com/process',
              method: 'POST',
              parameters: { timeout: 30000 },
              headers: { 'Content-Type': 'application/json' },
              authentication: {
                type: 'bearer',
                token: 'test-token'
              }
            },
            compensation: {
              type: 'http',
              endpoint: 'https://api.example.com/rollback',
              method: 'POST'
            },
            input: [
              {
                source: 'workflow.input.data',
                target: 'request.payload',
                required: true
              }
            ],
            output: [
              {
                source: 'response.processedData',
                target: 'step1.result',
                publishToContext: true
              }
            ],
            retryStrategy: {
              maxAttempts: 3,
              backoffStrategy: 'exponential',
              initialDelay: 1000,
              maxDelay: 10000,
              backoffMultiplier: 2
            },
            timeout: 60000,
            parallel: false,
            condition: {
              expression: 'workflow.input.enabled === true',
              language: 'javascript'
            },
            validation: {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'string' }
                }
              },
              strictMode: true
            }
          }
        ],
        errorHandling: {
          strategy: 'retry-then-compensate',
          maxRetries: 3,
          retryDelay: 5000,
          notificationChannels: ['email', 'slack']
        },
        timeout: 300000,
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000
        },
        coordination: {
          mode: 'sequential',
          maxConcurrentSteps: 1,
          coordinatorId: 'coordinator-1',
          communicationTimeout: 30000,
          heartbeatInterval: 5000,
          failureThreshold: 3
        },
        monitoring: {
          enableAuditTrail: true,
          enableMetrics: true,
          enableRealTimeUpdates: true,
          notificationChannels: ['webhook'],
          metricsLabels: { environment: 'test' },
          auditLevel: 'detailed'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'test-user',
        metadata: { testFlag: true }
      };

      const result = schemaManager.validateWorkflow(validWorkflow);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject workflow with missing required fields', () => {
      const invalidWorkflow = {
        id: 'test-workflow-2',
        name: 'Incomplete Workflow',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        steps: [],
        // Missing required fields: errorHandling, coordination, monitoring, createdAt, updatedAt
      };

      const result = schemaManager.validateWorkflow(invalidWorkflow);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('errorHandling'))).toBe(true);
      expect(result.errors.some(error => error.includes('coordination'))).toBe(true);
      expect(result.errors.some(error => error.includes('monitoring'))).toBe(true);
    });

    it('should validate semantic version format', () => {
      const workflowWithInvalidVersion = {
        id: 'test-workflow-3',
        name: 'Invalid Version Workflow',
        version: 'not-a-version',
        schemaVersion: '1.0.0',
        steps: [{
          id: 'step-1',
          name: 'Test Step',
          requiredCapabilities: ['test'],
          action: { type: 'internal' as const },
          input: [],
          output: []
        }],
        errorHandling: { strategy: 'fail-fast' as const },
        coordination: { mode: 'sequential' as const },
        monitoring: {
          enableAuditTrail: true,
          enableMetrics: true,
          enableRealTimeUpdates: true,
          auditLevel: 'minimal' as const
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const result = schemaManager.validateWorkflow(workflowWithInvalidVersion);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('version'))).toBe(true);
    });

    it('should perform semantic validation for step dependencies', () => {
      const workflowWithCircularDeps: WorkflowDefinition = {
        id: 'circular-deps-workflow',
        name: 'Circular Dependencies Workflow',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            requiredCapabilities: ['test'],
            action: { type: 'internal' },
            input: [],
            output: [],
            dependencies: ['step-2'] // Circular dependency
          },
          {
            id: 'step-2',
            name: 'Second Step',
            requiredCapabilities: ['test'],
            action: { type: 'internal' },
            input: [],
            output: [],
            dependencies: ['step-1'] // Circular dependency
          }
        ],
        errorHandling: { strategy: 'fail-fast' },
        coordination: { mode: 'sequential' },
        monitoring: {
          enableAuditTrail: true,
          enableMetrics: true,
          enableRealTimeUpdates: true,
          auditLevel: 'minimal'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const result = schemaManager.validateWorkflow(workflowWithCircularDeps);
      
      expect(result.valid).toBe(true); // Schema validation passes
      expect(result.warnings.length).toBeGreaterThan(0); // But semantic validation catches issues
      expect(result.warnings.some(warning => warning.includes('unreachable'))).toBe(true);
    });

    it('should validate action types and required fields', () => {
      const stepWithHttpAction: WorkflowStep = {
        id: 'http-step',
        name: 'HTTP Action Step',
        requiredCapabilities: ['http'],
        action: {
          type: 'http',
          endpoint: 'https://api.example.com/data',
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        },
        input: [],
        output: []
      };

      const stepWithShellAction: WorkflowStep = {
        id: 'shell-step',
        name: 'Shell Action Step',
        requiredCapabilities: ['shell'],
        action: {
          type: 'shell',
          command: 'echo "Hello World"'
        },
        input: [],
        output: []
      };

      const workflow: WorkflowDefinition = {
        id: 'action-types-workflow',
        name: 'Action Types Workflow',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        steps: [stepWithHttpAction, stepWithShellAction],
        errorHandling: { strategy: 'continue' },
        coordination: { mode: 'parallel' },
        monitoring: {
          enableAuditTrail: true,
          enableMetrics: true,
          enableRealTimeUpdates: true,
          auditLevel: 'minimal'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const result = schemaManager.validateWorkflow(workflow);
      expect(result.valid).toBe(true);
    });
  });

  describe('Workflow Creation and Management', () => {
    it('should create workflow definition with defaults', () => {
      const steps: Omit<WorkflowStep, 'id'>[] = [
        {
          name: 'Process Data',
          requiredCapabilities: ['data-processing'],
          action: {
            type: 'internal',
            parameters: { operation: 'transform' }
          },
          input: [
            { source: 'input.data', target: 'processing.input' }
          ],
          output: [
            { source: 'processing.result', target: 'output.data' }
          ]
        }
      ];

      const workflow = schemaManager.createWorkflowDefinition(
        'auto-generated-workflow',
        'Auto Generated Workflow',
        steps
      );

      expect(workflow.id).toBe('auto-generated-workflow');
      expect(workflow.name).toBe('Auto Generated Workflow');
      expect(workflow.version).toBe('1.0.0');
      expect(workflow.schemaVersion).toBe('1.0.0');
      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].id).toBe('process-data');
      expect(workflow.errorHandling.strategy).toBe('retry-then-compensate');
      expect(workflow.coordination.mode).toBe('sequential');
      expect(workflow.monitoring.enableAuditTrail).toBe(true);
    });

    it('should handle file operations correctly', async () => {
      const workflow: WorkflowDefinition = schemaManager.createWorkflowDefinition(
        'file-ops-test',
        'File Operations Test',
        [{
          name: 'Test Step',
          requiredCapabilities: ['test'],
          action: { type: 'internal' },
          input: [],
          output: []
        }]
      );

      // Mock successful file read
      mockFs.readFile.mockResolvedValue(JSON.stringify(workflow));

      const loadedWorkflow = await schemaManager.loadWorkflowFromFile('./test-workflow.json');
      
      expect(loadedWorkflow.id).toBe('file-ops-test');
      expect(mockFs.readFile).toHaveBeenCalledWith('./test-workflow.json', 'utf-8');

      // Mock successful file write
      mockFs.writeFile.mockResolvedValue();

      await schemaManager.saveWorkflowToFile(workflow, './output-workflow.json');
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        './output-workflow.json',
        expect.stringContaining('"id": "file-ops-test"'),
        'utf-8'
      );
    });

    it('should handle file operation errors gracefully', async () => {
      // Mock file read error
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(
        schemaManager.loadWorkflowFromFile('./nonexistent.json')
      ).rejects.toThrow('File not found');

      // Mock file write error
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const workflow = schemaManager.createWorkflowDefinition('test', 'Test', []);
      
      await expect(
        schemaManager.saveWorkflowToFile(workflow, './readonly.json')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Schema Versioning and Migration', () => {
    it('should migrate workflow to latest version', async () => {
      const oldWorkflow = {
        id: 'migration-test',
        name: 'Migration Test Workflow',
        version: '1.0.0',
        schemaVersion: '0.9.0', // Old version
        executionMode: 'sequential', // Old field name
        maxConcurrency: 5, // Old field name
        steps: [{
          id: 'test-step',
          name: 'Test Step',
          requiredCapabilities: ['test'],
          action: { type: 'internal' },
          input: [],
          output: []
        }],
        errorHandling: { strategy: 'fail-fast' },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const migratedWorkflow = await schemaManager.migrateWorkflow(oldWorkflow);
      
      expect(migratedWorkflow.schemaVersion).toBe('1.0.0');
      expect(migratedWorkflow.coordination).toBeDefined();
      expect(migratedWorkflow.coordination.mode).toBe('sequential');
      expect(migratedWorkflow.coordination.maxConcurrentSteps).toBe(5);
      expect(migratedWorkflow.monitoring).toBeDefined();
    });

    it('should return workflow unchanged if already latest version', async () => {
      const currentWorkflow = schemaManager.createWorkflowDefinition(
        'current-version-test',
        'Current Version Test',
        []
      );

      const result = await schemaManager.migrateWorkflow(currentWorkflow);
      
      expect(result).toEqual(currentWorkflow);
    });

    it('should get supported versions', () => {
      const versions = schemaManager.getSupportedVersions();
      
      expect(Array.isArray(versions)).toBe(true);
      expect(versions).toContain('1.0.0');
      expect(versions.every(v => /^\d+\.\d+\.\d+$/.test(v))).toBe(true);
    });

    it('should get current version', () => {
      const currentVersion = schemaManager.getCurrentVersion();
      
      expect(currentVersion).toBe('1.0.0');
      expect(/^\d+\.\d+\.\d+$/.test(currentVersion)).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large workflow definitions efficiently', () => {
      const startTime = Date.now();
      
      // Create a large workflow with many steps
      const steps: Omit<WorkflowStep, 'id'>[] = [];
      for (let i = 0; i < 100; i++) {
        steps.push({
          name: `Step ${i}`,
          requiredCapabilities: [`capability-${i % 10}`],
          action: {
            type: 'http',
            endpoint: `https://api.example.com/step-${i}`,
            method: 'POST'
          },
          input: [
            { source: `input.step${i}`, target: `processing.step${i}` }
          ],
          output: [
            { source: `result.step${i}`, target: `output.step${i}` }
          ],
          dependencies: i > 0 ? [`step-${i - 1}`] : undefined
        });
      }

      const largeWorkflow = schemaManager.createWorkflowDefinition(
        'large-workflow-test',
        'Large Workflow Test',
        steps
      );

      const validation = schemaManager.validateWorkflow(largeWorkflow);
      const duration = Date.now() - startTime;

      expect(validation.valid).toBe(true);
      expect(largeWorkflow.steps).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple validation calls without memory leaks', () => {
      const workflow = schemaManager.createWorkflowDefinition(
        'memory-test',
        'Memory Test',
        [{
          name: 'Test Step',
          requiredCapabilities: ['test'],
          action: { type: 'internal' },
          input: [],
          output: []
        }]
      );

      // Run validation many times
      const startMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 1000; i++) {
        const result = schemaManager.validateWorkflow(workflow);
        expect(result.valid).toBe(true);
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = endMemory - startMemory;

      // Memory growth should be minimal (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      await expect(
        schemaManager.loadWorkflowFromFile('./malformed.json')
      ).rejects.toThrow();
    });

    it('should handle unknown schema versions', () => {
      const workflowWithUnknownVersion = {
        id: 'unknown-version-test',
        name: 'Unknown Version Test',
        version: '1.0.0',
        schemaVersion: '999.0.0', // Unknown version
        steps: [],
        errorHandling: { strategy: 'fail-fast' },
        coordination: { mode: 'sequential' },
        monitoring: {
          enableAuditTrail: true,
          enableMetrics: true,
          enableRealTimeUpdates: true,
          auditLevel: 'minimal'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      const result = schemaManager.validateWorkflow(workflowWithUnknownVersion);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Unknown schema version'))).toBe(true);
    });

    it('should reject invalid workflow definitions for saving', async () => {
      const invalidWorkflow = {
        id: 'invalid-save-test',
        name: 'Invalid Save Test',
        // Missing required fields
      } as any;

      mockFs.writeFile.mockResolvedValue();

      await expect(
        schemaManager.saveWorkflowToFile(invalidWorkflow, './invalid.json')
      ).rejects.toThrow('Cannot save invalid workflow');
    });
  });
});

describe('UEP Schema Registry and Versioning', () => {
  let registry: SchemaRegistry;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = './test-registry';
    registry = createSchemaRegistry(tempDir);
  });

  afterEach(() => {
    registry?.removeAllListeners();
  });

  describe('Version Registration', () => {
    it('should register new schema version successfully', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id', 'name']
      };

      const changes = [
        {
          type: 'added' as const,
          path: '/properties/name',
          description: 'Added name field',
          breaking: false,
          impact: 'low' as const
        }
      ];

      const version = await registry.registerVersion('1.1.0', schema, changes);

      expect(version.version).toBe('1.1.0');
      expect(version.breaking).toBe(false);
      expect(version.metadata.changes).toEqual(changes);
      expect(version.hash).toBeDefined();
      expect(version.createdAt).toBeInstanceOf(Date);
    });

    it('should reject duplicate version registration', async () => {
      const schema = { type: 'object' };
      
      await registry.registerVersion('1.0.0', schema);
      
      await expect(
        registry.registerVersion('1.0.0', schema)
      ).rejects.toThrow('Version 1.0.0 already registered');
    });

    it('should reject invalid semantic versions', async () => {
      const schema = { type: 'object' };
      
      await expect(
        registry.registerVersion('not-a-version', schema)
      ).rejects.toThrow('Invalid semantic version');
    });

    it('should detect breaking changes correctly', async () => {
      const schema = { type: 'object' };
      const breakingChanges = [
        {
          type: 'removed' as const,
          path: '/properties/oldField',
          description: 'Removed old field',
          breaking: true,
          impact: 'high' as const
        }
      ];

      const version = await registry.registerVersion('2.0.0', schema, breakingChanges);

      expect(version.breaking).toBe(true);
    });
  });

  describe('Compatibility Checking', () => {
    beforeEach(async () => {
      // Register some test versions
      await registry.registerVersion('1.0.0', { type: 'object', properties: { id: { type: 'string' } } });
      await registry.registerVersion('1.1.0', { 
        type: 'object', 
        properties: { 
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }, [{
        type: 'added',
        path: '/properties/name',
        description: 'Added name field',
        breaking: false,
        impact: 'low'
      }]);
      await registry.registerVersion('2.0.0', { 
        type: 'object',
        properties: { 
          id: { type: 'string' },
          title: { type: 'string' }
        }
      }, [{
        type: 'removed',
        path: '/properties/name',
        description: 'Removed name field',
        breaking: true,
        impact: 'high'
      }]);
    });

    it('should check compatibility between minor versions', () => {
      const compatibility = registry.checkCompatibility('1.0.0', '1.1.0');

      expect(compatibility.compatible).toBe(true);
      expect(compatibility.compatibilityLevel).toBe('backward');
      expect(compatibility.migrationRequired).toBe(false);
    });

    it('should detect breaking changes in major versions', () => {
      const compatibility = registry.checkCompatibility('1.1.0', '2.0.0');

      expect(compatibility.compatible).toBe(false);
      expect(compatibility.compatibilityLevel).toBe('none');
      expect(compatibility.migrationRequired).toBe(true);
      expect(compatibility.issues.some(issue => issue.type === 'breaking_change')).toBe(true);
    });

    it('should handle downgrade scenarios', () => {
      const compatibility = registry.checkCompatibility('1.1.0', '1.0.0');

      expect(compatibility.compatibilityLevel).toBe('forward');
      expect(compatibility.issues.some(issue => issue.description.includes('downgrade'))).toBe(true);
    });

    it('should handle missing versions', () => {
      const compatibility = registry.checkCompatibility('1.0.0', '999.0.0');

      expect(compatibility.compatible).toBe(false);
      expect(compatibility.compatibilityLevel).toBe('none');
      expect(compatibility.issues.some(issue => issue.description.includes('not found'))).toBe(true);
    });
  });

  describe('Migration Management', () => {
    beforeEach(async () => {
      await registry.registerVersion('1.0.0', { type: 'object' });
      await registry.registerVersion('1.1.0', { type: 'object' });
    });

    it('should register migration successfully', () => {
      const migrationFunction = (workflow: any) => ({
        ...workflow,
        version: '1.1.0',
        schemaVersion: '1.1.0'
      });

      const migration = registry.registerMigration(
        '1.0.0',
        '1.1.0',
        migrationFunction,
        {
          description: 'Upgrade to version 1.1.0',
          automated: true,
          reversible: false,
          riskLevel: 'low'
        }
      );

      expect(migration.migrationId).toBe('1.0.0->1.1.0');
      expect(migration.automated).toBe(true);
      expect(migration.riskLevel).toBe('low');
    });

    it('should reject migration for non-existent versions', () => {
      const migrationFunction = (workflow: any) => workflow;

      expect(() => {
        registry.registerMigration('999.0.0', '1.1.0', migrationFunction);
      }).toThrow('Source or target version not found');
    });

    it('should perform workflow migration', async () => {
      const migrationFunction = jest.fn((workflow: any) => ({
        ...workflow,
        version: '1.1.0',
        schemaVersion: '1.1.0',
        newField: 'added in migration'
      }));

      registry.registerMigration('1.0.0', '1.1.0', migrationFunction);

      const originalWorkflow = {
        id: 'test-migration',
        version: '1.0.0',
        schemaVersion: '1.0.0',
        name: 'Test Workflow'
      };

      const result = await registry.migrateWorkflow(originalWorkflow, '1.1.0');

      expect(result.workflow.version).toBe('1.1.0');
      expect(result.workflow.schemaVersion).toBe('1.1.0');
      expect((result.workflow as any).newField).toBe('added in migration');
      expect(migrationFunction).toHaveBeenCalledWith(originalWorkflow);
    });

    it('should return unchanged workflow if already target version', async () => {
      const workflow = {
        id: 'test-workflow',
        version: '1.1.0',
        schemaVersion: '1.1.0'
      };

      const result = await registry.migrateWorkflow(workflow, '1.1.0');

      expect(result.workflow).toEqual(workflow);
      expect(result.migrationPath).toHaveLength(0);
    });

    it('should handle migration failures gracefully', async () => {
      const failingMigration = jest.fn(() => {
        throw new Error('Migration failed');
      });

      registry.registerMigration('1.0.0', '1.1.0', failingMigration);

      const workflow = {
        id: 'test-fail',
        version: '1.0.0',
        schemaVersion: '1.0.0'
      };

      await expect(
        registry.migrateWorkflow(workflow, '1.1.0')
      ).rejects.toThrow('Migration failed');
    });
  });

  describe('Version Management', () => {
    it('should deprecate version successfully', async () => {
      await registry.registerVersion('1.0.0', { type: 'object' });
      
      const deprecationSpy = jest.fn();
      registry.on('versionDeprecated', deprecationSpy);

      registry.deprecateVersion('1.0.0', 'Replaced by version 1.1.0');

      const version = registry.getVersion('1.0.0');
      expect(version?.deprecated).toBe(true);
      expect(version?.deprecationDate).toBeInstanceOf(Date);
      expect(deprecationSpy).toHaveBeenCalledWith({
        version: '1.0.0',
        reason: 'Replaced by version 1.1.0',
        deprecationDate: expect.any(Date)
      });
    });

    it('should get versions sorted by semantic version', async () => {
      await registry.registerVersion('2.0.0', { type: 'object' });
      await registry.registerVersion('1.0.0', { type: 'object' });
      await registry.registerVersion('1.1.0', { type: 'object' });

      const versions = registry.getVersions();

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe('1.0.0');
      expect(versions[1].version).toBe('1.1.0');
      expect(versions[2].version).toBe('2.0.0');
    });

    it('should get latest version', async () => {
      await registry.registerVersion('1.0.0', { type: 'object' });
      await registry.registerVersion('2.0.0', { type: 'object' });
      await registry.registerVersion('1.5.0', { type: 'object' });

      const latest = registry.getLatestVersion();

      expect(latest?.version).toBe('2.0.0');
    });

    it('should return undefined for latest version when no versions exist', () => {
      const emptyRegistry = createSchemaRegistry('./empty-registry');
      const latest = emptyRegistry.getLatestVersion();

      expect(latest).toBeUndefined();
    });
  });

  describe('Event Emission', () => {
    it('should emit version registration events', async () => {
      const registrationSpy = jest.fn();
      registry.on('versionRegistered', registrationSpy);

      const schema = { type: 'object' };
      await registry.registerVersion('1.0.0', schema);

      expect(registrationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '1.0.0',
          schema
        })
      );
    });

    it('should emit migration registration events', async () => {
      const migrationSpy = jest.fn();
      registry.on('migrationRegistered', migrationSpy);

      await registry.registerVersion('1.0.0', { type: 'object' });
      await registry.registerVersion('1.1.0', { type: 'object' });

      const migrationFunction = (workflow: any) => workflow;
      registry.registerMigration('1.0.0', '1.1.0', migrationFunction);

      expect(migrationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          migrationId: '1.0.0->1.1.0'
        })
      );
    });

    it('should emit migration applied events', async () => {
      const appliedSpy = jest.fn();
      registry.on('migrationApplied', appliedSpy);

      await registry.registerVersion('1.0.0', { type: 'object' });
      await registry.registerVersion('1.1.0', { type: 'object' });

      const migrationFunction = (workflow: any) => workflow;
      registry.registerMigration('1.0.0', '1.1.0', migrationFunction);

      const workflow = { id: 'test', version: '1.0.0', schemaVersion: '1.0.0' };
      await registry.migrateWorkflow(workflow, '1.1.0');

      expect(appliedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          migrationId: '1.0.0->1.1.0',
          workflowId: 'test'
        })
      );
    });
  });
});

describe('Integration Tests', () => {
  let schemaManager: WorkflowSchemaManager;
  let registry: SchemaRegistry;

  beforeEach(() => {
    schemaManager = createWorkflowSchemaManager();
    registry = createSchemaRegistry();
  });

  it('should integrate schema validation with version management', async () => {
    // Create a workflow with the schema manager
    const workflow = schemaManager.createWorkflowDefinition(
      'integration-test',
      'Integration Test Workflow',
      [{
        name: 'Integration Step',
        requiredCapabilities: ['integration'],
        action: { type: 'internal' },
        input: [],
        output: []
      }]
    );

    // Validate the workflow
    const validation = schemaManager.validateWorkflow(workflow);
    expect(validation.valid).toBe(true);

    // Register the schema version in the registry
    const schemaVersion = await registry.registerVersion(
      '1.0.0',
      { /* schema definition */ },
      [],
      { description: 'Initial schema version' }
    );

    expect(schemaVersion.version).toBe('1.0.0');
    expect(workflow.schemaVersion).toBe('1.0.0');
  });

  it('should handle end-to-end migration workflow', async () => {
    // Register multiple versions
    await registry.registerVersion('1.0.0', { type: 'object' });
    await registry.registerVersion('1.1.0', { type: 'object' });
    await registry.registerVersion('2.0.0', { type: 'object' });

    // Register migrations
    registry.registerMigration('1.0.0', '1.1.0', (w: any) => ({ ...w, schemaVersion: '1.1.0' }));
    registry.registerMigration('1.1.0', '2.0.0', (w: any) => ({ ...w, schemaVersion: '2.0.0' }));

    // Create workflow with old version
    const oldWorkflow = {
      id: 'e2e-migration',
      name: 'End-to-End Migration Test',
      version: '1.0.0',
      schemaVersion: '1.0.0'
    };

    // Migrate to latest version
    const result = await registry.migrateWorkflow(oldWorkflow, '2.0.0');

    expect(result.workflow.schemaVersion).toBe('2.0.0');
    expect(result.migrationPath).toHaveLength(2);
  });
});