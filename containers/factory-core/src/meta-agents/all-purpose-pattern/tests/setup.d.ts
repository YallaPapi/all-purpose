/**
 * Test Setup for All-Purpose Pattern Agent
 *
 * Universal test configuration that works with ANY test scenarios
 * Following All-Purpose Pattern: NO hardcoded test limitations
 */
export {};
declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveAntiPattern(patternType: string): R;
        }
    }
    var testUtils: {
        createSampleCode: (type?: 'hardcoded' | 'universal') => string;
        createSampleFiles: () => Record<string, string>;
    };
}
//# sourceMappingURL=setup.d.ts.map