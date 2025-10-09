#!/usr/bin/env node

/**
 * Frontend Agent - CLI Entry Point
 * 
 * Command-line interface for the Frontend Agent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { FrontendAgent } from './core/FrontendAgent.js';
import { createLogger } from './utils/logger.js';

const program = new Command();
const logger = createLogger('frontend-agent-cli');

program
  .name('frontend-agent')
  .description('Intelligent frontend development agent with Context7 integration')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Backend Agent in current project')
  .option('-f, --framework <framework>', 'API framework (express, fastify, koa)', 'express')
  .option('-d, --database <database>', 'Database type (postgresql, mysql, mongodb)', 'postgresql')
  .option('-a, --auth <auth>', 'Authentication strategy (jwt, oauth, session)', 'jwt')
  .option('--no-context7', 'Disable Context7 integration')
  .option('--no-rag', 'Disable RAG integration')
  .option('--no-uep', 'Disable UEP integration')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Initializing Backend Agent...'));
      
      const agent = new FrontendAgent({
        projectRoot: process.cwd(),
        uiFramework: options.framework || 'react',
        cssFramework: options.css || 'tailwind',
        stateManagement: options.state || 'redux',
        testFramework: options.tests || 'jest',
        enableContext7: options.context7,
        enableRAG: options.rag,
        enableUEP: options.uep,
        logLevel: 'info'
      });

      await agent.initialize();
      
      console.log(chalk.green('✅ Backend Agent initialized successfully!'));
      console.log(chalk.yellow('\nNext steps:'));
      console.log('1. Run "backend-agent generate api" to create API endpoints');
      console.log('2. Run "backend-agent analyze security" to scan for security issues');
      console.log('3. Run "backend-agent generate tests" to create test suites');
      
      await agent.shutdown();
      
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate backend code')
  .argument('<type>', 'Generation type (api, database, tests, docs)')
  .option('-r, --requirements <file>', 'Requirements file (JSON)')
  .option('-o, --output <dir>', 'Output directory', './generated')
  .action(async (type, options) => {
    try {
      console.log(chalk.blue('🔄 Generating ' + type + '...'));
      
      const agent = new FrontendAgent({
        projectRoot: process.cwd(),
        outputDir: options.output,
        logLevel: 'info'
      });

      await agent.initialize();

      let result;
      switch (type.toLowerCase()) {
        case 'api':
          result = await agent.generateComponents({
            framework: 'react',
            components: []
          });
          break;
        case 'database':
          result = await agent.designUI({
            layouts: [],
            responsive: true
          });
          break;
        case 'tests':
          result = await agent.processTask('Generate comprehensive frontend tests', {
            testTypes: ['unit', 'integration'],
            coverage: 80
          });
          break;
        case 'docs':
          result = await agent.processTask('Generate comprehensive frontend documentation', {
            format: 'openapi',
            includeExamples: true
          });
          break;
        default:
          throw new Error('Unknown generation type: ' + type);
      }

      if (result.success) {
        console.log(chalk.green('✅ ' + type + ' generation completed!'));
        console.log(chalk.blue('📁 Files generated: ' + (result.generatedFiles?.length || 0)));
        
        if (result.recommendations) {
          console.log(chalk.yellow('\nRecommendations:'));
          result.recommendations.forEach((rec: any) => console.log('• ' + rec));
        }
        
        if (result.nextSteps) {
          console.log(chalk.yellow('\nNext steps:'));
          result.nextSteps.forEach((step: any) => console.log('• ' + step));
        }
      } else {
        console.error(chalk.red('❌ ' + type + ' generation failed:'), result.error);
        process.exit(1);
      }

      await agent.shutdown();
      
    } catch (error) {
      console.error(chalk.red('❌ Generation failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze codebase')
  .argument('<type>', 'Analysis type (security, performance, patterns)')
  .option('-p, --path <paths...>', 'Paths to analyze', ['.'])
  .option('-s, --severity <level>', 'Minimum severity level (low, medium, high, critical)', 'medium')
  .action(async (type, options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing ' + type + '...'));
      
      const agent = new FrontendAgent({
        projectRoot: process.cwd(),
        logLevel: 'info'
      });

      await agent.initialize();

      let result;
      switch (type.toLowerCase()) {
        case 'security':
          result = await agent.implementAccessibility({
            wcagLevel: 'AA',
            screenReader: true
          });
          break;
        default:
          throw new Error('Unknown analysis type: ' + type);
      }

      if (result.success) {
        console.log(chalk.green('✅ ' + type + ' analysis completed!'));
        
        if (result.data?.vulnerabilities) {
          const vulns = result.data.vulnerabilities;
          console.log(chalk.yellow('🔒 Security issues found: ' + vulns.length));
          
          const critical = vulns.filter((v: any) => v.severity === 'critical').length;
          const high = vulns.filter((v: any) => v.severity === 'high').length;
          const medium = vulns.filter((v: any) => v.severity === 'medium').length;
          const low = vulns.filter((v: any) => v.severity === 'low').length;
          
          if (critical > 0) console.log(chalk.red('  Critical: ' + critical));
          if (high > 0) console.log(chalk.red('  High: ' + high));
          if (medium > 0) console.log(chalk.yellow('  Medium: ' + medium));
          if (low > 0) console.log(chalk.blue('  Low: ' + low));
        }
      } else {
        console.error(chalk.red('❌ ' + type + ' analysis failed:'), result.error);
        process.exit(1);
      }

      await agent.shutdown();
      
    } catch (error) {
      console.error(chalk.red('❌ Analysis failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show Backend Agent status')
  .action(async () => {
    try {
      const agent = new FrontendAgent({
        projectRoot: process.cwd(),
        logLevel: 'warn'
      });

      await agent.initialize();
      const status = agent.getStatus();
      
      console.log(chalk.blue('🤖 Backend Agent Status'));
      console.log(chalk.blue('━'.repeat(40)));
      console.log('Name: ' + status.name);
      console.log('Version: ' + status.version);
      console.log('Initialized: ' + (status.initialized ? '✅' : '❌'));
      console.log('Uptime: ' + Math.round(status.uptime / 1000) + 's');
      console.log('Engines: ' + status.engines.length);
      
      console.log(chalk.blue('\n📊 Metrics:'));
      console.log('Tasks Completed: ' + status.metrics.tasksCompleted);
      console.log('Files Generated: ' + status.metrics.filesGenerated);
      console.log('API Endpoints Created: ' + status.metrics.apiEndpointsCreated);
      console.log('Database Schemas Designed: ' + status.metrics.databaseSchemasDesigned);
      console.log('Security Issues Found: ' + status.metrics.securityIssuesFound);
      console.log('Tests Generated: ' + status.metrics.testsGenerated);
      
      console.log(chalk.blue('\n🔧 Capabilities:'));
      const caps = status.capabilities;
      console.log('Component Generation: ' + (caps.componentGeneration.reactComponents ? '✅' : '❌') + ' React, ' + (caps.componentGeneration.vueComponents ? '✅' : '❌') + ' Vue');
      console.log('UI Design: ' + (caps.uiDesign.responsiveDesign ? '✅' : '❌') + ' Responsive Design, ' + (caps.uiDesign.themingSystem ? '✅' : '❌') + ' Theming');
      console.log('State Management: ' + (caps.stateManagement.globalState ? '✅' : '❌') + ' Global State, ' + (caps.stateManagement.localState ? '✅' : '❌') + ' Local State');
      console.log('Testing: ' + (caps.testing.unitTests ? '✅' : '❌') + ' Unit Tests, ' + (caps.testing.integrationTests ? '✅' : '❌') + ' Integration Tests');
      
      await agent.shutdown();
      
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  console.error(chalk.red('❌ Uncaught exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  console.error(chalk.red('❌ Unhandled rejection:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();

export default program;