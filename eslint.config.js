/**
 * ESLint Configuration for Module System Standards
 * Enforces ES module usage patterns and consistency across the project
 */

import importPlugin from 'eslint-plugin-import';

export default [
  {
    files: ['**/*.js'],
    plugins: {
      import: importPlugin
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        clearInterval: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: {
      // Module System Rules
      'import/extensions': ['error', 'always', {
        js: 'always',
        cjs: 'always',
        mjs: 'always'
      }],
      
      // Prefer ES modules over CommonJS
      'import/no-commonjs': ['error', {
        allowRequire: false,
        allowPrimitiveModules: false
      }],
      
      // Consistent export patterns
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'off',
      
      // Prevent dynamic requires (use dynamic import instead)
      'import/no-dynamic-require': 'error',
      
      // General ES6+ Rules
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',
      
      // Error Prevention
      'no-undef': 'error',
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      
      // Code Quality
      'no-console': 'off', // Allow console for agent logging
      'no-debugger': 'error',
      'no-alert': 'error',
      
      // ES Module Specific
      'import/no-unresolved': ['error', {
        ignore: [
          // Allow unresolved paths for dynamic content
          '^\\./templates/',
          '^\\./config/'
        ]
      }],
      
      // Async/Await Best Practices
      'prefer-promise-reject-errors': 'error',
      'no-async-promise-executor': 'error',
      'require-await': 'error'
    }
  },
  
  // Special rules for CommonJS files (.cjs)
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'script'
    },
    rules: {
      // Allow CommonJS in .cjs files
      'import/no-commonjs': 'off',
      '@typescript-eslint/no-var-requires': 'off'
    }
  },
  
  // Configuration files can use CommonJS patterns
  {
    files: [
      '**/jest.config.js',
      '**/webpack.config.js', 
      '**/rollup.config.js',
      '**/.eslintrc.js'
    ],
    languageOptions: {
      sourceType: 'script'
    },
    rules: {
      'import/no-commonjs': 'off'
    }
  },
  
  // Test files have relaxed rules
  {
    files: ['**/*.test.js', '**/tests/**/*.js'],
    rules: {
      'no-unused-expressions': 'off',
      'import/no-extraneous-dependencies': 'off'
    }
  }
];