#!/usr/bin/env node

/**
 * Parameter Flow Agent - CLI Interface
 * 
 * Command-line interface for the INTEGRATION BUILDER
 * Following All-Purpose Pattern: NO hardcoded limitations on CLI functionality
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

import { ParameterFlowAgent } from './core/ParameterFlowAgent.js';
import { ParameterFlowConfig } from './types/index.js';

const program = new Command();

// CLI Configuration
program
  .name('parameter-flow-agent')
  .description('The INTEGRATION BUILDER for System Architecture - Ensures bulletproof data flow between all system components')
  .version('1.0.0');

// Global options
program
  .option('-c, --config <path>', 'Configuration file path')
  .option('-o, --output <path>', 'Output directory for generated files')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--dry-run', 'Show what would be done without executing');

/**
 * Build Integration Architecture Command
 */
program
  .command('build-architecture')
  .description('Build complete integration architecture from specification')
  .option('-n, --name <name>', 'Architecture name', 'Integration Architecture')
  .option('-d, --description <desc>', 'Architecture description')
  .option('-f, --file <path>', 'Architecture specification file')
  .option('--components <components>', 'Components JSON string or file path')
  .option('--requirements <requirements>', 'Integration requirements JSON string or file path')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🏗️  Parameter Flow Agent - Building Integration Architecture'));
      console.log(chalk.gray('=' .repeat(60)));

      const config = await loadConfiguration(program.opts());
      const agent = new ParameterFlowAgent(config);
      await agent.initialize();

      // Parse architecture specification
      let architectureSpec;
      
      if (options.file) {
        console.log(chalk.blue(`📁 Loading architecture specification from: ${options.file}`));
        architectureSpec = await fs.readJSON(options.file);
      } else {
        // Build specification from command options
        architectureSpec = {
          architectureName: options.name,
          description: options.description || 'Generated integration architecture',
          components: await parseJsonOption(options.components, 'components'),
          integrationRequirements: await parseJsonOption(options.requirements, 'requirements')
        };
      }

      // Validate specification
      if (!architectureSpec.components || architectureSpec.components.length === 0) {
        throw new Error('At least one component must be specified');
      }

      if (!architectureSpec.integrationRequirements) {
        architectureSpec.integrationRequirements = {
          dataFlowPatterns: ['request-response'],
          synchronizationNeeds: ['eventual-consistency'],
          performanceTargets: { latency: 100, throughput: 1000 },
          reliabilityRequirements: { availability: '99.9%' }
        };
      }

      // Build architecture
      console.log(chalk.blue(`🚀 Building architecture: ${architectureSpec.architectureName}`));
      const result = await agent.buildIntegrationArchitecture(architectureSpec);

      // Display results
      displayArchitectureResult(result);
      
      // Save results if output directory specified
      if (config.outputDirectory) {
        await saveArchitectureResult(result, config.outputDirectory);
      }

      console.log(chalk.green.bold('\n✅ Integration architecture built successfully!'));

    } catch (error: any) {
      console.error(chalk.red.bold('\n❌ Failed to build integration architecture:'));
      console.error(chalk.red(error.message));
      if (program.opts().verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * Generate Parameter Mapping Command
 */
program
  .command('generate-mapping')
  .description('Generate parameter mapping between components')
  .requiredOption('-n, --name <name>', 'Mapping name')
  .requiredOption('-s, --source <component>', 'Source component ID')
  .requiredOption('-t, --target <component>', 'Target component ID')
  .option('--source-schema <schema>', 'Source schema JSON string or file path')
  .option('--target-schema <schema>', 'Target schema JSON string or file path')
  .option('--rules <rules>', 'Custom mapping rules JSON string or file path')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🗺️  Parameter Flow Agent - Generating Parameter Mapping'));
      console.log(chalk.gray('=' .repeat(60)));

      const config = await loadConfiguration(program.opts());
      const agent = new ParameterFlowAgent(config);
      await agent.initialize();

      // Parse schemas and rules
      const sourceSchema = await parseJsonOption(options.sourceSchema, 'source schema') || {};
      const targetSchema = await parseJsonOption(options.targetSchema, 'target schema') || {};
      const mappingRules = await parseJsonOption(options.rules, 'mapping rules');

      const mappingRequest = {
        mappingName: options.name,
        sourceComponent: options.source,
        targetComponent: options.target,
        sourceSchema,
        targetSchema,
        mappingRules
      };

      console.log(chalk.blue(`🚀 Generating mapping: ${options.name}`));
      const result = await agent.generateParameterMapping(mappingRequest);

      // Display results
      displayMappingResult(result);

      console.log(chalk.green.bold('\n✅ Parameter mapping generated successfully!'));

    } catch (error: any) {
      console.error(chalk.red.bold('\n❌ Failed to generate parameter mapping:'));
      console.error(chalk.red(error.message));
      if (program.opts().verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * Run Integration Tests Command
 */
program
  .command('run-tests')
  .description('Run comprehensive integration tests')
  .option('-s, --suite <suiteId>', 'Specific test suite ID to run')
  .option('-a, --architecture <architectureId>', 'Architecture ID to test')
  .option('--scope <scope>', 'Test scope: unit, integration, system, performance, all', 'all')
  .option('--config <config>', 'Test configuration JSON string or file path')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🧪 Parameter Flow Agent - Running Integration Tests'));
      console.log(chalk.gray('=' .repeat(60)));

      const config = await loadConfiguration(program.opts());
      const agent = new ParameterFlowAgent(config);
      await agent.initialize();

      const testConfiguration = await parseJsonOption(options.config, 'test configuration');

      const testRequest = {
        testSuiteId: options.suite,
        architectureId: options.architecture,
        testScope: options.scope,
        testConfiguration
      };

      console.log(chalk.blue(`🚀 Running integration tests (scope: ${options.scope})`));
      const result = await agent.runIntegrationTests(testRequest);

      // Display results
      displayTestResult(result);

      if (!result.success) {
        console.log(chalk.red.bold('\n❌ Some integration tests failed!'));
        process.exit(1);
      }

      console.log(chalk.green.bold('\n✅ All integration tests passed!'));

    } catch (error: any) {
      console.error(chalk.red.bold('\n❌ Failed to run integration tests:'));
      console.error(chalk.red(error.message));
      if (program.opts().verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * Status Command
 */
program
  .command('status')
  .description('Show Parameter Flow Agent status and capabilities')
  .action(async () => {
    try {
      console.log(chalk.blue.bold('📊 Parameter Flow Agent - Status'));
      console.log(chalk.gray('=' .repeat(60)));

      const config = await loadConfiguration(program.opts());
      const agent = new ParameterFlowAgent(config);
      await agent.initialize();

      // Get agent capabilities
      const capabilities = agent.getCapabilities();
      const builtArchitectures = agent.getBuiltArchitectures();
      const parameterMappings = agent.getParameterMappings();
      const transformationPipelines = agent.getTransformationPipelines();
      const activeIntegrations = agent.getActiveIntegrations();

      // Display status
      displayAgentStatus(capabilities, {
        builtArchitectures: builtArchitectures.length,
        parameterMappings: parameterMappings.length,
        transformationPipelines: transformationPipelines.length,
        activeIntegrations: activeIntegrations.length
      });

    } catch (error: any) {
      console.error(chalk.red.bold('\n❌ Failed to get agent status:'));
      console.error(chalk.red(error.message));
      if (program.opts().verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * List Command
 */
program
  .command('list')
  .description('List built architectures, mappings, and pipelines')
  .option('-t, --type <type>', 'Resource type: architectures, mappings, pipelines, integrations, all', 'all')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('📋 Parameter Flow Agent - Resource List'));
      console.log(chalk.gray('=' .repeat(60)));

      const config = await loadConfiguration(program.opts());
      const agent = new ParameterFlowAgent(config);
      await agent.initialize();

      // Get resources
      const resources = {
        architectures: agent.getBuiltArchitectures(),
        mappings: agent.getParameterMappings(),
        pipelines: agent.getTransformationPipelines(),
        integrations: agent.getActiveIntegrations()
      };

      // Display resources
      displayResourceList(resources, options.type);

    } catch (error: any) {
      console.error(chalk.red.bold('\n❌ Failed to list resources:'));
      console.error(chalk.red(error.message));
      if (program.opts().verbose) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * Helper Functions
 */

async function loadConfiguration(globalOptions: any): Promise<ParameterFlowConfig> {
  let config: ParameterFlowConfig = {};

  // Load from config file if specified
  if (globalOptions.config) {
    if (await fs.pathExists(globalOptions.config)) {
      console.log(chalk.blue(`📄 Loading configuration from: ${globalOptions.config}`));
      config = await fs.readJSON(globalOptions.config);
    } else {
      throw new Error(`Configuration file not found: ${globalOptions.config}`);
    }
  }

  // Override with command line options
  if (globalOptions.output) {
    config.outputDirectory = path.resolve(globalOptions.output);
  }

  // Set defaults
  config.projectRoot = config.projectRoot || process.cwd();
  config.outputDirectory = config.outputDirectory || './generated-integrations';
  config.mappingDirectory = config.mappingDirectory || './parameter-mappings';

  if (globalOptions.verbose) {
    console.log(chalk.gray('Configuration:'));
    console.log(chalk.gray(JSON.stringify(config, null, 2)));
  }

  return config;
}

async function parseJsonOption(option: string | undefined, optionName: string): Promise<any> {
  if (!option) return undefined;

  try {
    // Try to parse as JSON string first
    return JSON.parse(option);
  } catch {
    // If that fails, try to read as file path
    if (await fs.pathExists(option)) {
      console.log(chalk.blue(`📁 Loading ${optionName} from file: ${option}`));
      return await fs.readJSON(option);
    } else {
      throw new Error(`Invalid ${optionName}: not valid JSON and file does not exist`);
    }
  }
}

function displayArchitectureResult(result: any): void {
  console.log(chalk.green('\n📊 Architecture Build Results:'));
  console.log(chalk.white(`  Architecture ID: ${result.architectureId}`));
  console.log(chalk.white(`  Components Integrated: ${result.generation.componentsIntegrated}`));
  console.log(chalk.white(`  Connections Created: ${result.generation.connectionsCreated}`));
  console.log(chalk.white(`  Test Suites Generated: ${result.generation.testSuitesGenerated}`));
  console.log(chalk.white(`  Build Duration: ${Math.round(result.generation.duration / 1000)}s`));
  
  console.log(chalk.green('\n📈 Quality Scores:'));
  console.log(chalk.white(`  Architecture Score: ${result.quality.architectureScore}%`));
  console.log(chalk.white(`  Reliability Score: ${result.quality.reliabilityScore}%`));
  console.log(chalk.white(`  Performance Score: ${result.quality.performanceScore}%`));
  console.log(chalk.white(`  Maintainability Score: ${result.quality.maintainabilityScore}%`));
  console.log(chalk.white(`  All-Purpose Pattern Compliance: ${result.quality.allPurposePatternCompliance}%`));

  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    result.warnings.forEach((warning: any) => {
      console.log(chalk.yellow(`  - ${warning.message}`));
    });
  }

  if (result.recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Recommendations:'));
    result.recommendations.forEach((recommendation: string) => {
      console.log(chalk.blue(`  - ${recommendation}`));
    });
  }
}

function displayMappingResult(result: any): void {
  console.log(chalk.green('\n📊 Parameter Mapping Results:'));
  console.log(chalk.white(`  Mapping ID: ${result.mappingId}`));
  console.log(chalk.white(`  Execution Time: ${result.execution.executionTime}ms`));
  console.log(chalk.white(`  Transformation Steps: ${result.execution.transformationSteps}`));
  console.log(chalk.white(`  Validations Passed: ${result.execution.validationsPassed}`));
  
  console.log(chalk.green('\n📈 Quality Scores:'));
  console.log(chalk.white(`  Accuracy Score: ${result.quality.accuracyScore}%`));
  console.log(chalk.white(`  Completeness Score: ${result.quality.completenessScore}%`));
  console.log(chalk.white(`  Consistency Score: ${result.quality.consistencyScore}%`));
  console.log(chalk.white(`  Performance Score: ${result.quality.performanceScore}%`));
  
  console.log(chalk.green('\n✅ Validation Results:'));
  console.log(chalk.white(`  Schema Validation: ${result.validation.schemaValidation ? '✓' : '✗'}`));
  console.log(chalk.white(`  Data Validation: ${result.validation.dataValidation ? '✓' : '✗'}`));
  console.log(chalk.white(`  Constraint Validation: ${result.validation.constraintValidation ? '✓' : '✗'}`));
  console.log(chalk.white(`  Business Rule Validation: ${result.validation.businessRuleValidation ? '✓' : '✗'}`));
}

function displayTestResult(result: any): void {
  console.log(chalk.green('\n📊 Integration Test Results:'));
  console.log(chalk.white(`  Test Suite ID: ${result.testSuiteId}`));
  console.log(chalk.white(`  Total Tests: ${result.execution.totalTests}`));
  console.log(chalk.white(`  Passed Tests: ${chalk.green(result.execution.passedTests)}`));
  console.log(chalk.white(`  Failed Tests: ${result.execution.failedTests > 0 ? chalk.red(result.execution.failedTests) : result.execution.failedTests}`));
  console.log(chalk.white(`  Skipped Tests: ${result.execution.skippedTests}`));
  console.log(chalk.white(`  Execution Time: ${Math.round(result.execution.executionTime / 1000)}s`));
  
  console.log(chalk.green('\n📈 Coverage Results:'));
  console.log(chalk.white(`  Component Coverage: ${result.coverage.componentCoverage}%`));
  console.log(chalk.white(`  Integration Coverage: ${result.coverage.integrationCoverage}%`));
  console.log(chalk.white(`  Data Flow Coverage: ${result.coverage.dataFlowCoverage}%`));
  console.log(chalk.white(`  Error Scenario Coverage: ${result.coverage.errorScenarioCoverage}%`));
  
  console.log(chalk.green('\n📊 Quality Metrics:'));
  console.log(chalk.white(`  Test Reliability: ${result.quality.testReliability}%`));
  console.log(chalk.white(`  Test Effectiveness: ${result.quality.testEffectiveness}%`));
  console.log(chalk.white(`  Defect Detection Rate: ${result.quality.defectDetectionRate}%`));
  console.log(chalk.white(`  False Positive Rate: ${result.quality.falsePositiveRate}%`));

  if (result.detailedResults.recommendedActions.length > 0) {
    console.log(chalk.blue('\n💡 Recommended Actions:'));
    result.detailedResults.recommendedActions.forEach((action: string) => {
      console.log(chalk.blue(`  - ${action}`));
    });
  }
}

function displayAgentStatus(capabilities: any, stats: any): void {
  console.log(chalk.green(`\n🤖 ${capabilities.name} v${capabilities.version}`));
  console.log(chalk.white('   The INTEGRATION BUILDER for System Architecture'));
  
  console.log(chalk.green('\n🔧 Core Capabilities:'));
  Object.entries(capabilities.coreCapabilities).forEach(([capability, value]) => {
    console.log(chalk.white(`  ${capability}: ${Array.isArray(value) ? value.join(', ') : value}`));
  });
  
  console.log(chalk.green('\n🔗 Integration Capabilities:'));
  console.log(chalk.white(`  Max Integration Complexity: ${capabilities.integrationCapabilities.maxIntegrationComplexity}`));
  console.log(chalk.white(`  Supported Protocols: ${capabilities.integrationCapabilities.supportedProtocols.slice(0, 5).join(', ')}${capabilities.integrationCapabilities.supportedProtocols.length > 5 ? '...' : ''}`));
  console.log(chalk.white(`  Supported Data Formats: ${capabilities.integrationCapabilities.supportedDataFormats.slice(0, 5).join(', ')}${capabilities.integrationCapabilities.supportedDataFormats.length > 5 ? '...' : ''}`));
  
  console.log(chalk.green('\n⚡ Performance:'));
  console.log(chalk.white(`  Max Concurrent Integrations: ${capabilities.performance.maxConcurrentIntegrations}`));
  console.log(chalk.white(`  Max Data Throughput: ${capabilities.performance.maxDataThroughput}`));
  console.log(chalk.white(`  Max Transformation Complexity: ${capabilities.performance.maxTransformationComplexity}`));
  
  console.log(chalk.green('\n📊 Current Statistics:'));
  console.log(chalk.white(`  Built Architectures: ${stats.builtArchitectures}`));
  console.log(chalk.white(`  Parameter Mappings: ${stats.parameterMappings}`));
  console.log(chalk.white(`  Transformation Pipelines: ${stats.transformationPipelines}`));
  console.log(chalk.white(`  Active Integrations: ${stats.activeIntegrations}`));
}

function displayResourceList(resources: any, type: string): void {
  if (type === 'all' || type === 'architectures') {
    console.log(chalk.green('\n🏗️  Built Architectures:'));
    if (resources.architectures.length === 0) {
      console.log(chalk.gray('  No architectures built yet'));
    } else {
      resources.architectures.forEach((arch: any) => {
        console.log(chalk.white(`  📋 ${arch.name} (${arch.architectureId})`));
        console.log(chalk.gray(`     Version: ${arch.version}, Components: ${arch.topology.components.length}`));
      });
    }
  }

  if (type === 'all' || type === 'mappings') {
    console.log(chalk.green('\n🗺️  Parameter Mappings:'));
    if (resources.mappings.length === 0) {
      console.log(chalk.gray('  No parameter mappings generated yet'));
    } else {
      resources.mappings.forEach((mapping: any) => {
        console.log(chalk.white(`  🔄 ${mapping.name} (${mapping.schemaId})`));
        console.log(chalk.gray(`     Type: ${mapping.metadata.mappingType}, Complexity: ${mapping.metadata.complexity}`));
      });
    }
  }

  if (type === 'all' || type === 'pipelines') {
    console.log(chalk.green('\n⚡ Transformation Pipelines:'));
    if (resources.pipelines.length === 0) {
      console.log(chalk.gray('  No transformation pipelines built yet'));
    } else {
      resources.pipelines.forEach((pipeline: any) => {
        console.log(chalk.white(`  🔧 ${pipeline.name} (${pipeline.pipelineId})`));
        console.log(chalk.gray(`     Steps: ${pipeline.pipeline.transformationSteps.length}, Execution: ${pipeline.execution.executionMode}`));
      });
    }
  }

  if (type === 'all' || type === 'integrations') {
    console.log(chalk.green('\n🔗 Active Integrations:'));
    if (resources.integrations.length === 0) {
      console.log(chalk.gray('  No active integrations'));
    } else {
      resources.integrations.forEach((integration: any) => {
        console.log(chalk.white(`  🌐 ${integration.architectureName || 'Integration'}`));
        console.log(chalk.gray(`     Components: ${integration.components?.length || 0}, Status: Active`));
      });
    }
  }
}

async function saveArchitectureResult(result: any, outputDirectory: string): Promise<void> {
  const outputPath = path.join(outputDirectory, result.architectureId);
  await fs.ensureDir(outputPath);
  
  // Save full result
  await fs.writeJSON(path.join(outputPath, 'result.json'), result, { spaces: 2 });
  
  // Save architecture only
  await fs.writeJSON(path.join(outputPath, 'architecture.json'), result.generatedArchitecture, { spaces: 2 });
  
  console.log(chalk.blue(`\n💾 Results saved to: ${outputPath}`));
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse();

export default program;