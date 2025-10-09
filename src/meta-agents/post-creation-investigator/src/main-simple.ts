#!/usr/bin/env node

/**
 * Simple Post-Creation Investigator CLI
 * Simplified version for immediate orchestrator integration
 */

import { Command } from 'commander';
import path from 'path';
import { SimplePostCreationInvestigator } from './core/SimplePostCreationInvestigator.js';

const program = new Command();

program
  .name('simple-post-creation-investigator')
  .description('Simple Post-Creation Project Investigation Agent')
  .version('1.0.0');

program
  .command('investigate')
  .alias('inv')
  .description('Run comprehensive project investigation')
  .option('-p, --project <path>', 'Project path to investigate', process.cwd())
  .option('-t, --type <type>', 'Project type (generic, react, node, etc.)', 'generic')
  .option('-f, --format <format>', 'Output format (json, html, text)', 'text')
  .action(async (options) => {
    const investigator = new SimplePostCreationInvestigator();
    
    try {
      const projectPath = path.resolve(options.project);
      console.log(`🔍 Investigating project at: ${projectPath}`);
      
      const result = await investigator.investigate(projectPath, options.type);
      
      if (options.format === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\n📊 Investigation Results:`);
        console.log(`Status: ${result.overallStatus}`);
        console.log(`Score: ${result.score}/100`);
        console.log(`Duration: ${result.duration}ms`);
        console.log(`Files Scanned: ${result.filesScanned}`);
        
        if (result.issues.length > 0) {
          console.log(`\n⚠️  Issues Found (${result.issues.length}):`);
          result.issues.forEach((issue, i) => {
            console.log(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`);
          });
        }
        
        if (result.setupRequirements.length > 0) {
          console.log(`\n🔧 Setup Requirements:`);
          result.setupRequirements.forEach((req, i) => {
            console.log(`${i + 1}. ${req}`);
          });
        }
        
        if (result.recommendations.length > 0) {
          console.log(`\n💡 Recommendations:`);
          result.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec}`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Investigation failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('quick-check')
  .alias('check')
  .description('Run quick project validation')
  .option('-p, --project <path>', 'Project path to check', process.cwd())
  .action(async (options) => {
    const investigator = new SimplePostCreationInvestigator();
    
    try {
      const projectPath = path.resolve(options.project);
      const result = await investigator.quickCheck(projectPath);
      
      console.log(`Status: ${result.status}`);
      console.log(`Score: ${result.score}/100`);
      console.log(`Issues: ${result.issues}`);
      
    } catch (error) {
      console.error('❌ Quick check failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show investigator status')
  .action(async () => {
    const investigator = new SimplePostCreationInvestigator();
    const status = investigator.getStatus();
    
    console.log('🔍 Simple Post-Creation Investigator Status:');
    console.log(`Agent ID: ${status.agentId}`);
    console.log(`Status: ${status.status}`);
    console.log(`Investigations: ${status.investigations}`);
  });

program.parse();