# Module System Standards

## Overview

This project uses ES modules as the primary module system, with strategic CommonJS compatibility layers where needed. This document outlines the standardized approach for module usage across the Meta-Agent Factory codebase.

## Module System Choice

**Primary**: ES Modules (ESM)
- Default for all new files
- Provides modern JavaScript module support
- Enables tree-shaking and better static analysis
- Required for future-compatibility

**Secondary**: CommonJS (CJS) 
- Used only for legacy compatibility
- Files explicitly marked with `.cjs` extension
- Accessed via `createRequire()` from ES modules

## File Structure Standards

### Package Configuration

All package.json files must include:
```json
{
  "type": "module"
}
```

This makes `.js` files default to ES module format.

### File Extensions

- `.js` - ES modules (default)
- `.cjs` - CommonJS modules (explicit)
- `.mjs` - ES modules (explicit, rarely needed)

### Directory Structure

```
project/
├── package.json                 # "type": "module"
├── src/
│   ├── meta-agents/
│   │   ├── agent-name/
│   │   │   ├── package.json     # "type": "module" 
│   │   │   ├── main.js          # ES module
│   │   │   └── lib/
│   │   │       ├── module.cjs   # CommonJS (if needed)
│   │   │       └── helper.js    # ES module
│   │   └── UEPMetaAgentFactory.js  # ES module
│   └── uep/
│       └── agentIntegration.js  # ES module
```

## Code Standards

### ES Module Syntax

#### Imports
```javascript
// Named imports
import { functionName, ClassName } from './module.js';

// Default imports  
import DefaultExport from './module.js';

// Namespace imports
import * as utils from './utils.js';

// Dynamic imports (for conditional loading)
const module = await import('./conditional-module.js');
```

#### Exports
```javascript
// Named exports
export const functionName = () => {};
export class ClassName {}

// Default exports
export default class MainClass {}

// Re-exports
export { helperFunction } from './helpers.js';
```

#### File Extensions
- Always include `.js` extension in import paths
- Use relative paths for local modules
- Use bare specifiers for npm packages

```javascript
// ✅ Correct
import { helper } from './lib/helper.js';
import chalk from 'chalk';

// ❌ Incorrect  
import { helper } from './lib/helper';
```

### CommonJS Compatibility

When ES modules need to import CommonJS modules:

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import CommonJS module
const legacyModule = require('./legacy-module.cjs');
```

### Directory Name Simulation

ES modules don't have `__dirname`. Use this pattern:

```javascript
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### CLI Detection

Replace CommonJS CLI detection:

```javascript
// ❌ CommonJS
if (require.main === module) {
  // CLI code
}

// ✅ ES modules
if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI code
}
```

## Migration Guidelines

### Converting CommonJS to ES Modules

1. **Update package.json**:
   ```json
   {
     "type": "module"
   }
   ```

2. **Convert require statements**:
   ```javascript
   // Before
   const fs = require('fs');
   const { helper } = require('./helper');
   
   // After
   import fs from 'fs';
   import { helper } from './helper.js';
   ```

3. **Convert exports**:
   ```javascript
   // Before
   module.exports = MyClass;
   module.exports.helper = helperFunction;
   
   // After
   export default MyClass;
   export { helperFunction as helper };
   ```

4. **Update internal imports**:
   - Add `.js` extensions
   - Convert relative paths
   - Update package imports

### Handling Mixed Dependencies

For projects with mixed module dependencies:

1. **Legacy CommonJS files**: Rename to `.cjs`
2. **Import CommonJS from ESM**: Use `createRequire()`
3. **Import ESM from CommonJS**: Use dynamic `import()`

## Linting Configuration

### ESLint Configuration

```javascript
// eslint.config.js
export default [
  {
    rules: {
      // Enforce file extensions in imports
      'import/extensions': ['error', 'always', { 
        js: 'always',
        cjs: 'always' 
      }],
      
      // Prefer ES modules
      'import/no-commonjs': 'error',
      
      // Ensure consistent export style
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'off'
    }
  }
];
```

## Project-Specific Patterns

### Meta-Agent Factory

The UEPMetaAgentFactory follows these patterns:
- ES module with named and default exports
- Imports enhanced agents as ES modules
- Uses createRequire for legacy CommonJS libraries
- Implements proper error handling for module resolution

### Agent Structure

Each meta-agent should:
- Export a main agent class as default
- Export utility functions as named exports
- Include proper CLI detection for standalone execution
- Use consistent import patterns for dependencies

### Working Memory Integration

Memory integration modules:
- Export factory functions as named exports
- Use ES module syntax throughout
- Maintain backward compatibility via createRequire when needed

## Testing Standards

### Module Import Testing

```javascript
// Test ES module imports work correctly
test('module imports successfully', async () => {
  const module = await import('./module.js');
  expect(module.default).toBeDefined();
});

// Test CommonJS compatibility
test('CommonJS modules work via createRequire', () => {
  const { createRequire } = require('module');
  const require = createRequire(import.meta.url);
  const legacyModule = require('./legacy.cjs');
  expect(legacyModule).toBeDefined();
});
```

### Build Verification

All modules must pass:
1. Static import resolution
2. Dynamic import capability  
3. Circular dependency detection
4. Export/import consistency checks

## Error Handling

### Common Module Errors

1. **"require is not defined"**
   - Cause: Using require() in ES module
   - Solution: Use import or createRequire()

2. **"Cannot use import outside module"**
   - Cause: Missing "type": "module" in package.json
   - Solution: Add module type declaration

3. **"Named export not found"**
   - Cause: Importing named export from CommonJS default export
   - Solution: Import default and destructure

### Graceful Degradation

Always implement fallbacks for module loading:

```javascript
try {
  const enhancedModule = await import('./enhanced-module.js');
  return enhancedModule.default;
} catch (error) {
  console.warn('Enhanced module not available, using fallback');
  return createFallbackImplementation();
}
```

## Tooling Integration

### Build Tools

- **Node.js**: Native ES module support (v14+)
- **TypeScript**: Configure for ES modules in tsconfig.json
- **Bundlers**: Webpack 5+, Rollup, Vite support ES modules

### Development Tools

- Use ES module compatible versions of tools
- Configure test runners for ES modules
- Update CI/CD pipelines for module system

## Best Practices

1. **Consistency**: Use ES modules for all new code
2. **Explicit**: Always include file extensions in imports  
3. **Compatibility**: Use createRequire for legacy dependencies
4. **Testing**: Verify module resolution in tests
5. **Documentation**: Document any CommonJS exceptions
6. **Performance**: Prefer static imports over dynamic when possible
7. **Error Handling**: Implement robust fallbacks for module loading

## Enforcement

This document serves as the canonical reference for module usage. All code reviews should verify adherence to these standards. Automated linting rules enforce consistency across the codebase.

## Migration Status

- ✅ Core infrastructure (UEPMetaAgentFactory, setup-observability)
- ✅ Meta-agent main files (prd-parser, scaffold-generator)  
- ✅ Enhanced agents (enhanced-prd-parser, enhanced-scaffold-generator)
- ✅ UEP integration modules (agentIntegration)
- ✅ Memory integration modules (agentMemoryIntegration)
- 🔄 Legacy lib files (converted to .cjs where needed)
- ⏳ Generated agents (to be updated as needed)

---

*This document will be updated as the project evolves and new module patterns emerge.*