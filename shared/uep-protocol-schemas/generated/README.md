# Generated Protocol Code

This directory contains automatically generated TypeScript code from UEP protocol definitions using the Protocol Compiler.

## Overview

The Protocol Compiler reads protocol definitions from the UEP Protocol Schema Repository and generates:

- **Type Definitions** - TypeScript interfaces for requests, responses, and schemas
- **Validation Functions** - Runtime validation with detailed error reporting
- **Agent Interfaces** - Standard interfaces for implementing agents
- **Utility Functions** - Helper functions for common operations
- **Test Files** - Generated tests for validation and integration
- **Documentation** - Auto-generated documentation

## Directory Structure

Each protocol gets its own directory named after the protocol ID:

```
generated/
├── meta-agent-prd-parser/
│   ├── types.ts              # TypeScript type definitions
│   ├── validators.ts         # Validation functions
│   ├── interfaces.ts         # Agent and client interfaces
│   ├── utils.ts              # Utility functions
│   ├── protocol.test.ts      # Generated tests
│   ├── index.ts              # Main exports
│   └── README.md             # Protocol-specific documentation
├── meta-agent-infrastructure-orchestrator/
│   └── ...
└── domain-agent-example/
    └── ...
```

## Usage

Import generated code in your agent implementations:

```typescript
import { 
  ParsePrdRequest, 
  ParsePrdResponse200, 
  validateParsePrd,
  validateUEPCompliance 
} from './meta-agent-prd-parser';

// Use generated types
const request: ParsePrdRequest = {
  content: "# My PRD\n\nProject description...",
  format: "markdown",
  options: {
    enableValidation: true,
    extractRequirements: true
  }
};

// Use generated validators
const validation = validateParsePrd(request);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Use UEP compliance validation
const uepValidation = validateUEPCompliance({
  method: 'parse-prd',
  data: request,
  metadata: {
    traceId: 'trace_123',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    requestId: 'req_456',
    agentId: 'prd-parser-01'
  }
});
```

## Integration with UEP Middleware

Generated validators integrate seamlessly with UEP validation middleware:

```typescript
import { UEPValidationMiddleware } from '@uep/validation';
import { validateCompleteRequest } from './meta-agent-prd-parser';

const middleware = new UEPValidationMiddleware({
  protocolValidators: {
    'meta-agent-prd-parser': validateCompleteRequest
  }
});

// Middleware automatically validates requests using generated code
```

## Example Generated Files

### Types Example (`meta-agent-prd-parser/types.ts`)

```typescript
export interface ParsePrdRequest {
  content: string;
  format?: 'markdown' | 'text' | 'structured' | 'html';
  options?: {
    enableValidation?: boolean;
    extractRequirements?: boolean;
    generateArchitecture?: boolean;
  };
  context?: {
    projectType?: 'web-app' | 'mobile-app' | 'api';
    techStack?: string[];
  };
}

export interface ParsePrdResponse200 {
  status: 'success';
  data: {
    prdId: string;
    requirements: { /* ... */ };
    architecture?: { /* ... */ };
    complexity: 'low' | 'medium' | 'high' | 'very-high';
  };
}
```

### Validators Example (`meta-agent-prd-parser/validators.ts`)

```typescript
export function validateParsePrd(data: any): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (!data.content) {
    errors.push({
      field: 'content',
      message: 'PRD content is required',
      code: 'REQUIRED_FIELD_MISSING'
    });
  }
  
  // Additional validation logic...
  
  return { valid: errors.length === 0, errors };
}
```

## Compiler Configuration

Generated code reflects the compiler configuration used:

```typescript
const config: CompilerConfig = {
  outputPath: './generated',
  targetLanguage: 'typescript',
  includeTypes: true,
  includeValidators: true,
  includeInterfaces: true,
  includeUtilities: true,
  includeTests: true,
  strictMode: true,
  generateDocs: true
};
```

## Regeneration

**Important**: All files in this directory are automatically generated. Changes will be overwritten when protocols are recompiled.

To regenerate code:

```bash
# Compile single protocol
uep-protocol-compiler -p meta-agent-prd-parser -o ./generated

# Batch compile all protocols
uep-protocol-compiler --batch -o ./generated

# Compile from file
uep-protocol-compiler -i ./examples/my-protocol.json -o ./generated
```

## Version Management

Each generated directory includes version information:

- Generated code is tied to specific protocol versions
- Breaking changes in protocols result in new generated code
- Backward compatibility is maintained through versioning

## Testing Generated Code

Generated test files can be run using your preferred test runner:

```bash
# Using Jest
npm test generated/meta-agent-prd-parser/protocol.test.ts

# Using Node.js test runner
node --test generated/meta-agent-prd-parser/protocol.test.ts
```

## Development Workflow

1. **Define Protocol** - Create or update protocol definition
2. **Compile** - Run Protocol Compiler to generate code
3. **Implement** - Use generated types and validators in agent code
4. **Test** - Run generated tests and your own integration tests
5. **Deploy** - Deploy agent with validated protocol compliance

## Support

For issues with generated code:

1. Check the source protocol definition for correctness
2. Verify Protocol Compiler configuration
3. Review compilation logs for warnings or errors
4. Regenerate code after making protocol changes

## More Information

- [Protocol Compiler Documentation](../README.md)
- [UEP Protocol Schema Repository](../README.md)
- [UEP Validation Middleware](../../uep-validation/README.md)