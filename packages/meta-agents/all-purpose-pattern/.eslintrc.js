module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    // All-Purpose Pattern: NO hardcoded limitations in rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    'prefer-template': 'error',
    'no-console': 'warn'
  },
  env: {
    node: true,
    jest: true,
    es2020: true
  },
  ignorePatterns: [
    'dist/',
    'coverage/',
    'node_modules/',
    '*.js'
  ]
};