#!/usr/bin/env node

/**
 * Post-Creation Investigator Agent - CLI Interface
 * 
 * Use context7: Command-line interface for project investigation
 * Following All-Purpose Pattern: Configurable for ANY project type
 */

import { Command } from 'commander';
import path from 'path';
import { PostCreationInvestigator } from './core/PostCreationInvestigator.js';
import { InvestigatorMetaAgentConfig, InvestigationConfig } from './types/index.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('post-creation-investigator')
  .description('Automated project validation and setup requirements investigation')
  .version('1.0.0');

program
  .command('investigate')
  .description('Run comprehensive project investigation')
  .requiredOption('-p, --project-path <path>', 'Path to the project to investigate')
  .option('-t, --type <type>', 'Project type (next.js, express, react, node, python, generic)', 'generic')
  .option('-f, --format <format>', 'Report format (json, html, markdown)', 'html')
  .option('--skip-tests <tests>', 'Comma-separated list of tests to skip')
  .option('--parallel', 'Run checks in parallel', true)
  .option('--timeout <ms>', 'Timeout in milliseconds', '300000')
  .action(async (options) => {
    try {
      logger.info('🔍 Starting project investigation...', {
        projectPath: options.projectPath,
        projectType: options.type
      });

      // Validate project path
      const projectPath = path.resolve(options.projectPath);
      
      // Create investigator configuration
      const config: InvestigatorMetaAgentConfig = {
        agentId: 'post-creation-investigator',
        enableMetaAgentCoordination: false, // CLI mode
        enableRAGIntegration: false,
        knowledgeSharing: false,
        reportStorage: 'file',
        reportFormat: options.format,
        enableCaching: true,
        cacheDirectory: path.join(projectPath, '.investigation-cache'),
        parallelism: options.parallel ? 3 : 1,
        timeout: parseInt(options.timeout)
      };

      // Create investigation configuration
      const investigationConfig: InvestigationConfig = {
        projectPath,
        projectType: options.type,
        skipTests: options.skipTests ? options.skipTests.split(',') : [],
        timeout: parseInt(options.timeout),
        parallel: options.parallel
      };

      // Initialize investigator
      const investigator = new PostCreationInvestigator(config);

      // Run investigation
      const result = await investigator.investigate(investigationConfig);

      // Display results
      console.log('\n📊 Investigation Results');
      console.log('========================');
      console.log(`Overall Status: ${result.overallStatus}`);
      console.log(`Score: ${result.score}/100`);
      console.log(`Duration: ${result.duration}ms`);
      console.log(`Total Checks: ${result.summary.totalChecks}`);
      console.log(`Passed: ${result.summary.passed}`);
      console.log(`Failed: ${result.summary.failed}`);
      console.log(`Warnings: ${result.summary.warnings}`);
      console.log(`Critical Issues: ${result.summary.critical}`);

      if (result.setupRequirements.length > 0) {
        console.log('\n🔧 Setup Requirements:');
        result.setupRequirements.slice(0, 5).forEach((req, index) => {
          console.log(`${index + 1}. [${req.priority.toUpperCase()}] ${req.title}`);
          console.log(`   ${req.description}`);
        });
      }

      if (result.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
          console.log(`   ${rec.description}`);
        });
      }

      console.log(`\n📄 Report saved to: ${projectPath}/investigation-report.${options.format}`);

      if (result.overallStatus === 'FAIL') {
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Investigation failed', { error });
      console.error('Investigation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('quick-check')
  .description('Run quick validation check')
  .requiredOption('-p, --project-path <path>', 'Path to the project to check')
  .option('-t, --type <type>', 'Project type', 'generic')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      
      const config: InvestigatorMetaAgentConfig = {
        agentId: 'post-creation-investigator-quick',
        enableMetaAgentCoordination: false,
        enableRAGIntegration: false,
        knowledgeSharing: false,
        reportStorage: 'file',
        reportFormat: 'json',
        enableCaching: false,
        cacheDirectory: '',
        parallelism: 1,
        timeout: 30000
      };

      const investigator = new PostCreationInvestigator(config);
      const result = await investigator.quickValidation(projectPath, options.type);

      console.log('\n⚡ Quick Check Results');
      console.log('=====================');
      console.log(`Status: ${result.status}`);
      console.log(`Score: ${result.score}/100`);
      console.log(`Critical Issues: ${result.criticalIssues.length}`);

      if (result.criticalIssues.length > 0) {
        console.log('\n🚨 Critical Issues:');
        result.criticalIssues.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue.title}`);
          console.log(`   ${issue.description}`);
        });
      }

      if (result.status === 'FAIL') {
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Quick check failed', { error });
      console.error('Quick check failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('setup-guide')
  .description('Generate setup requirements guide')
  .requiredOption('-p, --project-path <path>', 'Path to the project')
  .option('-t, --type <type>', 'Project type', 'generic')
  .action(async (options) => {
    try {
      const projectPath = path.resolve(options.projectPath);
      
      const config: InvestigatorMetaAgentConfig = {
        agentId: 'post-creation-investigator-guide',
        enableMetaAgentCoordination: false,
        enableRAGIntegration: false,
        knowledgeSharing: false,
        reportStorage: 'file',
        reportFormat: 'markdown',
        enableCaching: true,
        cacheDirectory: path.join(projectPath, '.investigation-cache'),
        parallelism: 2,
        timeout: 180000
      };

      const investigator = new PostCreationInvestigator(config);
      const setupGuide = await investigator.generateSetupGuide(projectPath, options.type);

      console.log('\n📋 Setup Guide Generated');
      console.log('========================');
      console.log(`Guide saved to: ${projectPath}/SETUP_GUIDE.md`);
      console.log('\nPreview:');
      console.log(setupGuide.substring(0, 500) + '...');

    } catch (error) {
      logger.error('❌ Setup guide generation failed', { error });
      console.error('Setup guide generation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();