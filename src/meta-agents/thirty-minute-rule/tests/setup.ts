/**
 * Jest setup file for Thirty-Minute Rule Agent tests
 */

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockComponent: (overrides = {}) => ({
    componentId: 'test-component-id',
    name: 'TestComponent',
    type: 'React Component',
    path: '/test/TestComponent.tsx',
    dependencies: ['react', 'axios'],
    debugEndpoints: [],
    metadata: {
      framework: 'React',
      language: 'TypeScript',
      testable: true,
      critical: false,
      configuration: {}
    },
    ...overrides
  }),

  createMockDebugSession: (overrides = {}) => ({
    sessionId: 'test-session-id',
    startTime: new Date(),
    timeLimit: 30 * 60 * 1000,
    status: 'active',
    description: 'Test debugging session',
    debugSteps: [],
    healthChecks: [],
    fallbacksTriggered: [],
    metadata: {
      projectType: 'test',
      framework: 'test',
      priority: 'medium',
      tags: [],
      configuration: {}
    },
    ...overrides
  })
};

// Type declarations for global utilities
declare global {
  var testUtils: {
    createMockComponent: (overrides?: any) => any;
    createMockDebugSession: (overrides?: any) => any;
  };
}