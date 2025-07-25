#!/usr/bin/env node

/**
 * UEP CLI Entry Point
 * 
 * Command-line entry point for Universal Execution Protocol CLI wrapper.
 * Provides enhanced prompt processing for human users.
 */

import { createCLIProgram } from './UEPCLIWrapper';

async function main() {
  try {
    const program = createCLIProgram();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('❌ UEP CLI Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the CLI
main().catch(error => {
  console.error('❌ CLI failed to start:', error);
  process.exit(1);
});