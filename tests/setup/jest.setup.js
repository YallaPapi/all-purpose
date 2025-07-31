/**
 * Jest Global Setup
 * 
 * Common setup for all test types
 */

// Extend test timeout for CI environments
if (process.env.CI) {
  jest.setTimeout(60000);
}

// Global test utilities
global.testUtils = {
  // Generate unique test IDs
  generateTestId: (prefix = 'test') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Wait for condition with timeout
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Timeout waiting for condition');
  },
  
  // Retry function with backoff
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }
};

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toContainObject(received, expected) {
    const pass = received.some(item => 
      Object.keys(expected).every(key => item[key] === expected[key])
    );
    
    if (pass) {
      return {
        message: () =>
          `expected array not to contain object matching ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected array to contain object matching ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  }
});

// Mock console methods in test environment
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console errors/warnings unless DEBUG is set
  if (!process.env.DEBUG) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in test:', error);
  throw error;
});