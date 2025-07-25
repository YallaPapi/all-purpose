#!/usr/bin/env node

/**
 * TaskMaster Enhanced CLI
 * 
 * Use context7: TaskMaster with automatic context injection from RAG system
 * Following All-Purpose Pattern: Works with ANY TaskMaster commands
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function main() {
  try {
    // Import the TaskMaster integration
    const { runTaskMasterWithContext } = require('./dist/integrations/taskMasterIntegration');
    
    // Get command line arguments (skip node and script name)
    const args = process.argv.slice(2);
    
    console.log('🧠 TaskMaster Enhanced - Context-Aware Task Management');
    
    if (args.length === 0) {
      console.log('Usage: node task-master-enhanced.js <command> [options]');
      console.log('\nAvailable commands:');
      console.log('  research <prompt>       - Research with project context');
      console.log('  expand --id=<id>        - Expand tasks with patterns');
      console.log('  parse-prd <file>        - Parse PRD with methodologies');
      console.log('  add-task --prompt=<p>   - Add task with frameworks');
      console.log('  update --from=<id>      - Update with architecture');
      console.log('  list, next, show        - Standard TaskMaster commands');
      console.log('\nEnhanced commands automatically include relevant project context.');
      process.exit(0);
    }
    
    // Execute TaskMaster with context enhancement
    const exitCode = await runTaskMasterWithContext(args);
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ TaskMaster Enhanced failed to start:', error.message);
    console.error('Make sure you have built the project with: npm run build');
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n👋 TaskMaster Enhanced interrupted');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the CLI
main().catch(error => {
  console.error('❌ TaskMaster Enhanced failed:', error.message);
  process.exit(1);
});