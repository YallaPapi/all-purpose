# Contributing Guidelines

## Module System Standards

This project uses **ES modules** as the primary module system. Please follow the [Module System Standards](./MODULE_SYSTEM_STANDARDS.md) when contributing.

### Quick Reference

#### ✅ Correct ES Module Patterns
```javascript
// Imports with file extensions
import { helper } from './lib/helper.js';
import DefaultClass from './DefaultClass.js';

// Exports
export const namedFunction = () => {};
export default class MainClass {}

// CLI detection
if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI code
}

// __dirname simulation
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

#### ❌ Avoid CommonJS Patterns
```javascript
// Don't use require() in .js files
const module = require('./module'); // ❌

// Don't use module.exports in .js files  
module.exports = MyClass; // ❌

// Don't omit file extensions
import { helper } from './helper'; // ❌
```

#### 🔄 CommonJS Compatibility (when needed)
```javascript
// For legacy CommonJS modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const legacyModule = require('./legacy.cjs');
```

### Pre-commit Checklist

- [ ] All imports include file extensions
- [ ] ES module syntax used (import/export)
- [ ] No CommonJS patterns in .js files
- [ ] Package.json includes "type": "module"
- [ ] ESLint passes without module-related errors
- [ ] Tests verify module imports work correctly

### File Structure

- **New files**: Use `.js` with ES modules
- **Legacy files**: Rename to `.cjs` if they must stay CommonJS
- **Package files**: Include `"type": "module"` in package.json

### Development Workflow

1. **Code**: Follow ES module standards
2. **Lint**: Run `npm run lint` to check compliance
3. **Test**: Verify module imports work in tests
4. **Review**: Ensure consistency with module standards

### Getting Help

- Review [MODULE_SYSTEM_STANDARDS.md](./MODULE_SYSTEM_STANDARDS.md) for detailed guidelines
- Check existing code examples in `src/meta-agents/`
- Ask questions in PR reviews if module patterns are unclear

## Code Quality Standards

### General Principles

1. **Consistency**: Follow established patterns in the codebase
2. **Clarity**: Write self-documenting code with clear names
3. **Robustness**: Include proper error handling
4. **Testing**: Write tests for new functionality
5. **Documentation**: Update docs for significant changes

### Meta-Agent Development

When creating new meta-agents:

1. **Extend base classes**: Inherit from existing agent patterns
2. **Memory integration**: Use `createMemoryEnhancedAgent()` 
3. **UEP compliance**: Follow Universal Execution Protocol patterns
4. **Export patterns**: Use consistent import/export structure
5. **CLI support**: Include proper CLI detection and argument handling

### Testing Requirements

- Unit tests for core functionality
- Integration tests for agent interactions
- Module import/export verification
- Error handling validation
- Performance benchmarks for critical paths

### Documentation Updates

When making changes:

- Update relevant README files
- Add inline code documentation
- Update API documentation
- Include migration notes for breaking changes
- Document any new patterns or conventions

## Pull Request Process

1. **Fork and branch**: Create feature branch from main
2. **Develop**: Follow coding standards and module guidelines
3. **Test**: Ensure all tests pass and add new tests
4. **Lint**: Fix any ESLint errors related to module usage
5. **Document**: Update documentation as needed
6. **Submit**: Create PR with clear description of changes

### PR Review Criteria

- [ ] Follows ES module standards
- [ ] Passes all existing tests
- [ ] Includes tests for new functionality  
- [ ] Documentation updated appropriately
- [ ] No breaking changes without migration path
- [ ] Code style consistent with project

## Development Environment

### Required Tools

- Node.js 18+ (for ES module support)
- npm or yarn for package management
- ESLint for code quality
- Jest for testing (configured for ES modules)

### Setup Commands

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run tests  
npm test

# Build (if applicable)
npm run build
```

### Recommended Extensions (VS Code)

- ESLint
- ES6 string formatters
- Auto import helpers
- JavaScript/TypeScript intellisense

---

Thank you for contributing to the Meta-Agent Factory project! Your adherence to these guidelines helps maintain code quality and consistency across the project.