import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * 2025 Enhanced Testing Configuration
 * Context7-enhanced Vitest setup for comprehensive meta-agent testing
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'rag-system/node_modules/',
        'src/meta-agents/*/node_modules/'
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        // Agent-specific thresholds
        'src/meta-agents/all-purpose-pattern/': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'rag-system/src/': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Concurrent testing for performance
    concurrent: true,
    maxConcurrency: 4,
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/test-results.json',
      html: './test-results/test-results.html'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@rag': resolve(__dirname, './rag-system/src'),
      '@meta-agents': resolve(__dirname, './src/meta-agents'),
      '@app': resolve(__dirname, './app'),
      '@lib': resolve(__dirname, './lib')
    }
  },
  // Define test patterns
  define: {
    __TEST_ENV__: '"test"',
    __AGENT_COUNT__: '9',
    __RAG_SYSTEM_VERSION__: '"1.0.0"'
  }
});