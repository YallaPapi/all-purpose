# UEP Protocol Definition System - Usage Guide

This guide demonstrates how to use the complete UEP Protocol Definition System, including the schema repository, protocol compiler, version manager, and documentation generator.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Protocol Schema Repository](#protocol-schema-repository)
3. [Protocol Compiler](#protocol-compiler)
4. [Version Management](#version-management)
5. [Documentation Generation](#documentation-generation)
6. [End-to-End Workflow](#end-to-end-workflow)
7. [Integration Examples](#integration-examples)
8. [Best Practices](#best-practices)

## Quick Start

### 1. Initialize the System

```typescript
import { ProtocolSchemaRepository } from '../ProtocolSchemaRepository';
import { ProtocolCompiler } from '../ProtocolCompiler';
import { ProtocolVersionManager } from '../ProtocolVersionManager';
import { ProtocolDocumentationGenerator } from '../ProtocolDocumentationGenerator';
import { PolicyManager } from '../VersioningPolicies';

// Initialize repository
const repository = new ProtocolSchemaRepository({
  basePath: './uep-protocol-schemas',
  gitEnabled: true,
  validationEnabled: true,
  autoVersioning: true,
  backupEnabled: true,
  compressionEnabled: false,
  cachingEnabled: true,
  indexingEnabled: true
});

// Initialize version manager with production policy
const versionConfig = PolicyManager.createConfig('production');
const versionManager = new ProtocolVersionManager(versionConfig);

// Initialize compiler
const compiler = new ProtocolCompiler({
  outputPath: './generated',
  typescript: {
    target: 'es2020',
    module: 'commonjs',
    strict: true
  },
  validation: {
    generateInterfaces: true,
    generateValidators: true,
    generateUtilities: true
  }
});

// Initialize documentation generator
const docGenerator = new ProtocolDocumentationGenerator({
  outputPath: './docs',
  formats: [
    { type: 'html', filename: 'index.html' },
    { type: 'markdown', filename: 'README.md' },
    { type: 'openapi-ui', filename: 'api-docs.html' }
  ],
  theme: 'default',
  includeExamples: true,
  includeDiagrams: true,
  includeInteractive: true,
  generateTOC: true,
  enableSearch: true,
  branding: {
    title: 'My API Documentation',
    description: 'Comprehensive API documentation',
    primaryColor: '#007acc',
    secondaryColor: '#0056b3',
    fontFamily: 'Arial, sans-serif',
    organization: 'My Organization',
    contact: {
      name: 'API Team',
      email: 'api@myorg.com'
    }
  },
  templates: {
    templatePath: './templates',
    customTemplates: new Map(),
    helpers: new Map(),
    partials: new Map()
  }
});
```

### 2. Create Your First Protocol

```typescript
async function createProtocol() {
  // Define protocol specification
  const protocolSpec = {
    id: 'user-service-api',
    name: 'User Service API',
    version: '1.0.0',
    description: 'API for managing user accounts and profiles',
    specification: {
      openapi: '3.1.0',
      info: {
        title: 'User Service API',
        version: '1.0.0',
        description: 'RESTful API for user management operations',
        contact: {
          name: 'API Team',
          email: 'api@myorg.com'
        }
      },
      servers: [{
        url: 'https://api.myorg.com/v1',
        description: 'Production server'
      }],
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            summary: 'List all users',
            description: 'Retrieve a paginated list of user accounts',
            parameters: [
              {
                name: 'page',
                in: 'query',
                description: 'Page number',
                required: false,
                schema: { type: 'integer', minimum: 1, default: 1 }
              },
              {
                name: 'limit',
                in: 'query',
                description: 'Number of users per page',
                required: false,
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
              }
            ],
            responses: {
              '200': {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/UserList' }
                  }
                }
              }
            }
          },
          post: {
            operationId: 'createUser',
            summary: 'Create a new user',
            description: 'Create a new user account',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateUserRequest' }
                }
              }
            },
            responses: {
              '201': {
                description: 'User created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'email', 'createdAt'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          },
          CreateUserRequest: {
            type: 'object',
            required: ['email'],
            properties: {
              email: { type: 'string', format: 'email' },
              name: { type: 'string' }
            }
          },
          UserList: {
            type: 'object',
            required: ['users', 'pagination'],
            properties: {
              users: {
                type: 'array',
                items: { $ref: '#/components/schemas/User' }
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    },
    metadata: {
      status: 'active',
      author: 'API Team',
      maintainers: ['api-team@myorg.com'],
      tags: ['user-management', 'rest-api'],
      createdAt: new Date(),
      lastUpdated: new Date()
    },
    lifecycle: {
      phase: 'production',
      deprecationDate: null,
      changeLog: [{
        version: '1.0.0',
        timestamp: new Date(),
        author: 'API Team',
        changes: ['Initial release']
      }]
    }
  };

  // Store in repository
  await repository.storeProtocol(protocolSpec);
  console.log('✅ Protocol created and stored');
}
```

## Protocol Schema Repository

### Basic Operations

```typescript
// Store a protocol
await repository.storeProtocol(protocolDefinition);

// Retrieve a protocol
const protocol = await repository.getProtocol('user-service-api');

// List all protocols
const protocols = await repository.listProtocols();

// Search protocols
const searchResults = await repository.searchProtocols({
  query: 'user',
  filters: { status: 'active' },
  limit: 10
});

// Get protocol history
const history = await repository.getProtocolHistory('user-service-api');

// Export protocols
await repository.exportProtocols('./backup', { format: 'json', compress: true });
```

### Advanced Features

```typescript
// Enable Git integration
const gitRepo = new ProtocolSchemaRepository({
  basePath: './protocols',
  gitEnabled: true,
  gitConfig: {
    remote: 'origin',
    branch: 'main',
    autoCommit: true,
    commitMessageTemplate: 'chore: {action} protocol {protocolId} v{version}'
  }
});

// Batch operations
const batchResults = await repository.batchOperation([
  { operation: 'store', protocol: protocol1 },
  { operation: 'update', protocol: protocol2 },
  { operation: 'delete', protocolId: 'old-protocol' }
]);

// Protocol validation
const validation = await repository.validateProtocol(protocol);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Caching and indexing
await repository.rebuildIndex();
await repository.clearCache();
```

## Protocol Compiler

### Generate TypeScript Code

```typescript
// Compile a single protocol
const protocol = await repository.getProtocol('user-service-api');
const result = await compiler.compile(protocol);

if (result.success) {
  console.log('✅ Compilation successful');
  console.log('Generated files:', result.generatedFiles);
} else {
  console.error('❌ Compilation failed:', result.errors);
}
```

### Generated Code Usage

```typescript
// Generated TypeScript interfaces and validators
import { User, CreateUserRequest, UserList } from './generated/user-service-api/types';
import { validateUser, validateCreateUserRequest } from './generated/user-service-api/validators';
import { UserServiceApiClient } from './generated/user-service-api/client';

// Use generated types
const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'user@example.com',
  name: 'John Doe',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Use generated validators
const validation = validateUser(user);
if (!validation.valid) {
  console.error('User validation failed:', validation.errors);
}

// Use generated client
const client = new UserServiceApiClient('https://api.myorg.com/v1');

async function createUser(userData: CreateUserRequest) {
  try {
    const newUser = await client.createUser(userData);
    console.log('User created:', newUser);
  } catch (error) {
    console.error('Failed to create user:', error);
  }
}
```

### Batch Compilation

```typescript
// Compile multiple protocols
const protocols = await repository.listProtocols();
const results = await compiler.batchCompile(protocols);

for (const [protocolId, result] of results) {
  if (result.success) {
    console.log(`✅ ${protocolId} compiled successfully`);
  } else {
    console.error(`❌ ${protocolId} compilation failed:`, result.errors);
  }
}
```

## Version Management

### Register New Versions

```typescript
// Register a new version
const newVersion = { ...protocol, version: '1.1.0' };
await versionManager.registerVersion(newVersion);

// Check compatibility
const compatibility = await versionManager.analyzeCompatibility(
  oldProtocol, 
  newVersion
);

if (!compatibility.compatible) {
  console.warn('Breaking changes detected:', compatibility.issues);
}

// Generate migration plan
const migrationPlan = await versionManager.generateMigrationPlan(
  oldProtocol,
  newVersion
);

console.log('Migration complexity:', migrationPlan.complexity);
console.log('Migration steps:', migrationPlan.steps.length);
```

### Version Constraints and Resolution

```typescript
// Check version constraints
const satisfies = versionManager.satisfiesConstraint('1.2.3', {
  operator: '^',
  version: '1.0.0'
}); // true

// Resolve version ranges
const availableVersions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
const matches = versionManager.resolveVersionRange(availableVersions, {
  constraints: [{ operator: '~', version: '1.1.0' }]
}); // ['1.1.0']
```

### CLI Usage

```bash
# Register new version
uep-version-manager register -i protocol-v2.json --policy production

# Compare versions
uep-version-manager compare -p user-service-api --from-version 1.0.0 --to-version 2.0.0

# Generate migration plan
uep-version-manager migrate -p user-service-api --from-version 1.0.0 --to-version 2.0.0 -o migration.md

# Show version history
uep-version-manager history -p user-service-api
```

## Documentation Generation

### Single Protocol Documentation

```typescript
// Generate documentation
const protocol = await repository.getProtocol('user-service-api');
const result = await docGenerator.generateDocumentation(protocol);

if (result.success) {
  console.log('✅ Documentation generated');
  console.log('Files created:', result.generatedFiles.map(f => f.path));
} else {
  console.error('❌ Documentation generation failed:', result.errors);
}
```

### Batch Documentation

```typescript
// Generate documentation for all protocols
const protocols = await repository.listProtocols();
const results = await docGenerator.generateBatchDocumentation(protocols);

for (const [protocolId, result] of results) {
  if (result.success) {
    console.log(`📄 ${protocolId}: ${result.generatedFiles.length} files generated`);
  } else {
    console.error(`❌ ${protocolId}: Generation failed`);
  }
}
```

### CLI Usage

```bash
# Generate HTML and Markdown documentation
uep-doc-generator generate -i protocol.json -o ./docs -f html,markdown

# Generate all formats with custom theme
uep-doc-generator generate -i protocol.json --theme enterprise --include-examples

# Batch generate for all protocols
uep-doc-generator batch -i ./protocols -o ./docs

# Watch for changes
uep-doc-generator watch -i ./protocols -o ./docs
```

## End-to-End Workflow

### Complete Protocol Lifecycle

```typescript
async function protocolLifecycle() {
  // 1. Create protocol
  const protocol = createInitialProtocol();
  
  // 2. Store in repository
  await repository.storeProtocol(protocol);
  
  // 3. Generate code
  const compileResult = await compiler.compile(protocol);
  
  // 4. Generate documentation
  const docResult = await docGenerator.generateDocumentation(protocol);
  
  // 5. Version update workflow
  const updatedProtocol = createUpdatedProtocol(protocol);
  
  // 6. Check compatibility
  const compatibility = await versionManager.analyzeCompatibility(
    protocol, 
    updatedProtocol
  );
  
  if (compatibility.compatible) {
    // 7. Register new version
    await versionManager.registerVersion(updatedProtocol);
    
    // 8. Update repository
    await repository.updateProtocol(updatedProtocol.id, updatedProtocol);
    
    // 9. Regenerate code and docs
    await compiler.compile(updatedProtocol);
    await docGenerator.generateDocumentation(updatedProtocol);
    
    console.log('✅ Protocol lifecycle completed successfully');
  } else {
    // Handle breaking changes
    const migrationPlan = await versionManager.generateMigrationPlan(
      protocol,
      updatedProtocol
    );
    
    console.log('⚠️ Breaking changes detected');
    console.log('Migration plan:', migrationPlan);
  }
}
```

### Automated CI/CD Integration

```typescript
// ci-cd-integration.ts
import { execSync } from 'child_process';

async function cicdPipeline() {
  try {
    // 1. Validate all protocols
    console.log('🔍 Validating protocols...');
    const protocols = await repository.listProtocols();
    
    for (const protocol of protocols) {
      const validation = await repository.validateProtocol(protocol);
      if (!validation.valid) {
        throw new Error(`Protocol ${protocol.id} validation failed: ${validation.errors.join(', ')}`);
      }
    }
    
    // 2. Compile all protocols
    console.log('🔨 Compiling protocols...');
    const compileResults = await compiler.batchCompile(protocols);
    
    for (const [protocolId, result] of compileResults) {
      if (!result.success) {
        throw new Error(`Compilation failed for ${protocolId}: ${result.errors.join(', ')}`);
      }
    }
    
    // 3. Run generated tests
    console.log('🧪 Running tests...');
    execSync('npm test', { stdio: 'inherit' });
    
    // 4. Generate documentation
    console.log('📄 Generating documentation...');
    const docResults = await docGenerator.generateBatchDocumentation(protocols);
    
    // 5. Deploy documentation
    console.log('🚀 Deploying documentation...');
    execSync('npm run deploy-docs', { stdio: 'inherit' });
    
    console.log('✅ CI/CD pipeline completed successfully');
    
  } catch (error) {
    console.error('❌ CI/CD pipeline failed:', error.message);
    process.exit(1);
  }
}
```

## Integration Examples

### Express.js Integration

```typescript
// express-integration.ts
import express from 'express';
import { UserServiceApiClient } from './generated/user-service-api/client';
import { validateCreateUserRequest } from './generated/user-service-api/validators';

const app = express();
app.use(express.json());

// Use generated validation middleware
app.use('/api/users', (req, res, next) => {
  if (req.method === 'POST') {
    const validation = validateCreateUserRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
  }
  next();
});

// Use generated client for service-to-service communication
const userClient = new UserServiceApiClient(process.env.USER_SERVICE_URL);

app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await userClient.listUsers({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
```

### React Client Integration

```typescript
// react-client.tsx
import React, { useState, useEffect } from 'react';
import { User, CreateUserRequest } from './generated/user-service-api/types';
import { UserServiceApiClient } from './generated/user-service-api/client';

const client = new UserServiceApiClient('/api');

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await client.listUsers({ page: 1, limit: 50 });
      setUsers(result.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: CreateUserRequest) => {
    try {
      const newUser = await client.createUser(userData);
      setUsers([...users, newUser]);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>User Management</h1>
      <UserList users={users} />
      <CreateUserForm onSubmit={createUser} />
    </div>
  );
};
```

### Testing Integration

```typescript
// protocol.test.ts
import { validateUser, validateCreateUserRequest } from './generated/user-service-api/validators';
import { User, CreateUserRequest } from './generated/user-service-api/types';

describe('User Service API Protocol', () => {
  describe('User validation', () => {
    it('should validate a correct user object', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = validateUser(user);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject user with invalid email', () => {
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = validateUser(user);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });
  });

  describe('CreateUserRequest validation', () => {
    it('should validate correct create request', () => {
      const request: CreateUserRequest = {
        email: 'test@example.com',
        name: 'Test User'
      };

      const result = validateCreateUserRequest(request);
      expect(result.valid).toBe(true);
    });

    it('should require email field', () => {
      const request = {
        name: 'Test User'
      };

      const result = validateCreateUserRequest(request);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });
  });
});
```

## Best Practices

### 1. Protocol Design

```typescript
// ✅ Good: Clear, descriptive protocol definition
const goodProtocol = {
  id: 'payment-service-api',
  name: 'Payment Service API',
  version: '2.1.0',
  description: 'Secure API for processing payments and managing payment methods',
  specification: {
    // Comprehensive OpenAPI specification
    // Clear operation IDs, descriptions
    // Proper error responses
    // Security schemes defined
  }
};

// ❌ Bad: Vague, incomplete protocol definition
const badProtocol = {
  id: 'api',
  name: 'API',
  version: '1.0',
  description: 'API',
  specification: {
    // Minimal specification
    // No error handling
    // No security
  }
};
```

### 2. Version Management

```typescript
// ✅ Good: Semantic versioning with proper change tracking
await versionManager.registerVersion({
  ...protocol,
  version: '2.1.0', // Semantic version
  lifecycle: {
    changeLog: [{
      version: '2.1.0',
      timestamp: new Date(),
      author: 'API Team',
      changes: [
        'Added support for recurring payments',
        'Fixed validation for international addresses',
        'Deprecated legacy payment method endpoint'
      ]
    }]
  }
});

// ❌ Bad: Arbitrary versioning without change tracking
await versionManager.registerVersion({
  ...protocol,
  version: 'v2-final',
  // No change log
});
```

### 3. Documentation

```typescript
// ✅ Good: Comprehensive documentation configuration
const docConfig = {
  formats: ['html', 'markdown', 'openapi-ui'],
  includeExamples: true,
  includeDiagrams: true,
  includeChangelog: true,
  enableSearch: true,
  branding: {
    // Proper branding and contact info
  }
};

// ❌ Bad: Minimal documentation
const badDocConfig = {
  formats: ['html'],
  // No examples, no search, no branding
};
```

### 4. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
async function safeProtocolOperation() {
  try {
    const protocol = await repository.getProtocol('api-id');
    const result = await compiler.compile(protocol);
    
    if (!result.success) {
      console.error('Compilation errors:', result.errors);
      // Handle compilation errors appropriately
      return;
    }
    
    // Process successful result
  } catch (error) {
    console.error('Operation failed:', error);
    // Proper error logging and recovery
  }
}

// ❌ Bad: No error handling
async function unsafeOperation() {
  const protocol = await repository.getProtocol('api-id');
  await compiler.compile(protocol); // May throw
  // No error handling
}
```

### 5. Performance Optimization

```typescript
// ✅ Good: Batch operations and caching
async function efficientOperations() {
  // Enable caching
  repository.configureCaching({ enabled: true, ttl: 3600 });
  
  // Use batch operations
  const protocols = await repository.listProtocols();
  const results = await compiler.batchCompile(protocols);
  
  // Parallel documentation generation
  const docPromises = protocols.map(p => docGenerator.generateDocumentation(p));
  const docResults = await Promise.all(docPromises);
}

// ❌ Bad: Sequential operations without caching
async function inefficientOperations() {
  const protocols = await repository.listProtocols();
  
  for (const protocol of protocols) {
    await compiler.compile(protocol); // Sequential
    await docGenerator.generateDocumentation(protocol); // Sequential
  }
}
```

This comprehensive usage guide covers all aspects of the UEP Protocol Definition System, from basic operations to advanced integration patterns and best practices. Use it as a reference for implementing the system in your projects.