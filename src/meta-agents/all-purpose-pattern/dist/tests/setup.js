"use strict";
/**
 * Test Setup for All-Purpose Pattern Agent
 *
 * Universal test configuration that works with ANY test scenarios
 * Following All-Purpose Pattern: NO hardcoded test limitations
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Global test configuration
beforeAll(() => {
    // Set up global test environment
    process.env.NODE_ENV = 'test';
    // Suppress console output during tests unless debugging
    if (!process.env.DEBUG_TESTS) {
        global.console = {
            ...console,
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
    }
});
afterAll(() => {
    // Clean up any global resources
});
// Global test utilities
global.testUtils = {
    createSampleCode: (type = 'hardcoded') => {
        if (type === 'hardcoded') {
            return `
        // WRONG: Hardcoded industry logic (FORBIDDEN)
        const industries = ['automotive', 'dental', 'legal']; // NEVER DO THIS
        const maxIndustries = 50; // NO LIMITS ALLOWED
        if (industry === 'automotive') {
          console.log('Car dealers only');
        }
      `;
        }
        else {
            return `
        // CORRECT: Universal pattern with UNLIMITED scope
        const industry = userInput.industry; // UNLIMITED - from user config only
        const location = userInput.location; // UNLIMITED - from user targeting
        const message = \`\${industry} in \${location}\`; // Works for ANY industry/location
      `;
        }
    },
    createSampleFiles: () => ({
        javascript: 'const x = 1; console.log(x);',
        typescript: 'const x: number = 1; console.log(x);',
        jsx: 'const Component = () => <div>Hello</div>;',
        tsx: 'const Component: React.FC = () => <div>Hello</div>;'
    })
};
// Extend Jest matchers if needed
expect.extend({
    toHaveAntiPattern(received, patternType) {
        const pass = received.antiPatterns?.some((p) => p.type === patternType);
        if (pass) {
            return {
                message: () => `Expected not to have anti-pattern of type "${patternType}"`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `Expected to have anti-pattern of type "${patternType}"`,
                pass: false,
            };
        }
    }
});
//# sourceMappingURL=setup.js.map