/**
 * Frontend Agent - Main Entry Point
 * 
 * Exports all public interfaces and classes for the Frontend Agent
 */

// Core classes
export { FrontendAgent, FrontendAgentError } from './core/FrontendAgent.js';
export { UEPWrapper } from './core/UEPWrapper.js';
export { RealUEPWrapper } from './core/RealUEPWrapper.js';

// Adapters
export { Context7ScannerAdapter } from './adapters/Context7ScannerAdapter.js';

// Types
export * from './types/index.js';

// Utilities
export { createLogger } from './utils/logger.js';

// Default export
export { FrontendAgent as default } from './core/FrontendAgent.js';