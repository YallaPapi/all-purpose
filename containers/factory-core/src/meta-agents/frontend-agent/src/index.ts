/**
 * Backend Agent - Main Entry Point
 * 
 * Exports all public interfaces and classes for the Backend Agent
 */

// Core classes
export { BackendAgent, BackendAgentError } from './core/BackendAgent.js';
export { UEPWrapper } from './core/UEPWrapper.js';

// Adapters
export { Context7ScannerAdapter } from './adapters/Context7ScannerAdapter.js';

// Types
export * from './types/index.js';

// Utilities
export { createLogger } from './utils/logger.js';

// Default export
export { BackendAgent as default } from './core/BackendAgent.js';