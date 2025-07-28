# UEP Protocol Definition System

> **Complete UEP Protocol Definition System for Containerized Service Communication**
> 
> A comprehensive system for defining, validating, compiling, versioning, and documenting Universal Execution Protocol (UEP) compliant API specifications.

## 🌟 Overview

The UEP Protocol Definition System is a complete toolkit for managing API protocols in containerized environments. It provides end-to-end functionality from protocol definition to code generation and documentation, with built-in version management and validation.

### System Components

- **📋 Protocol Schema Repository** - Git-based storage with validation, search, and indexing
- **🔨 Protocol Compiler** - TypeScript code generation with types, validators, and clients
- **📌 Version Management** - Semantic versioning with compatibility analysis and migration planning  
- **📖 Documentation Generator** - Multi-format documentation with interactive features
- **🔧 CLI Tools** - Command-line interfaces for all system components
- **✅ End-to-End Validation** - Comprehensive testing and integration validation

## Features

- **Git-Based Storage**: Full version control with branching and merging support
- **Semantic Versioning**: Automatic version management with compatibility tracking
- **Protocol Validation**: Comprehensive validation against OpenAPI/AsyncAPI specifications
- **Template System**: Pre-built templates for common agent types
- **Documentation Generation**: Automatic documentation in multiple formats
- **Dependency Management**: Track and validate protocol dependencies
- **Migration Support**: Automated migration guidance for protocol updates
- **Backup & Recovery**: Automated backup system with configurable retention

## Directory Structure

```
uep-protocol-schemas/
├── schemas/
│   ├── meta-agents/          # Meta-agent protocol definitions
│   ├── domain-agents/        # Domain-agent protocol definitions
│   └── core-protocols/       # Core UEP protocol definitions
├── templates/                # Protocol definition templates
├── examples/                 # Example protocol definitions
├── versions/                 # Version history and metadata
├── validation/               # Validation rules and schemas
├── migrations/               # Migration scripts and guides
├── docs/                     # Generated and manual documentation
└── backups/                  # Automated backups
```

## Quick Start

### Installation

```bash
npm install @uep/protocol-schemas
```

### Basic Usage

```typescript
import { createProtocolRepository } from '@uep/protocol-schemas';

// Initialize repository
const repository = createProtocolRepository({
  basePath: './my-protocols',
  gitEnabled: true,
  validationEnabled: true
});

// Register a new protocol
const protocol = repository.createProtocolTemplate('meta-agent', {
  name: 'My Custom Agent',
  capability: 'custom-processing',
  description: 'Handles custom processing tasks',
  author: 'Development Team'
});

await repository.registerProtocol(protocol);

// Retrieve a protocol
const prdParser = await repository.getProtocol('meta-agent-prd-parser', '1.0.0');

// List all protocols
const allProtocols = await repository.listProtocols({
  category: 'meta-agent',
  status: 'approved'
});
```

### Creating Custom Protocols

```typescript
// Create from template
const customProtocol = repository.createProtocolTemplate('domain-agent', {
  name: 'Data Processing Agent',
  capability: 'data-processing',
  description: 'Processes and transforms data streams',
  author: 'Data Team'
});

// Customize the specification
customProtocol.specification.paths['/process-data'] = {
  post: {
    summary: 'Process data stream',
    operationId: 'processData',
    // ... OpenAPI specification
  }
};

// Register the protocol
await repository.registerProtocol(customProtocol);
```

## Protocol Definition Structure

Each protocol definition follows this structure:

```typescript
interface ProtocolDefinition {
  id: string;                    // Unique identifier
  name: string;                  // Human-readable name
  version: string;               // Semantic version
  category: 'meta-agent' | 'domain-agent' | 'core-protocol';
  description: string;           // Description
  specification: OpenAPI31Protocol | AsyncAPI26Protocol;
  metadata: ProtocolMetadata;    // Author, status, etc.
  compatibility: CompatibilityRequirements;
  lifecycle: ProtocolLifecycle;  // Phases and changelog
}
```

## UEP-Specific Extensions

Protocols include UEP-specific metadata:

```json
{
  "x-uep-capability": "prd-parsing",
  "x-uep-version": "1.0.0",
  "x-uep-metadata": {
    "agentType": "meta",
    "complexity": "medium",
    "dependencies": ["other-capability"],
    "tags": ["parsing", "analysis"],
    "capabilities": ["prd-parsing", "requirements-extraction"],
    "interactionPatterns": ["request-reply", "publish-subscribe"],
    "securityRequirements": ["authentication", "authorization"]
  }
}
```

## Protocol Templates

Available templates:
- `meta-agent-protocol-template.json` - Meta-agent protocols
- `domain-agent-protocol-template.json` - Domain-agent protocols  
- `core-protocol-template.json` - Core system protocols

Templates use Handlebars syntax with variables like:
- `{{AGENT_NAME}}` - Agent display name
- `{{CAPABILITY_NAME}}` - Primary capability
- `{{DESCRIPTION}}` - Agent description
- `{{AUTHOR}}` - Protocol author

## Validation

The repository validates protocols against:
- OpenAPI 3.1 / AsyncAPI 2.6 specifications
- UEP-specific metadata requirements
- Semantic versioning rules
- Dependency consistency
- Breaking change detection

## Example Protocols

### PRD Parser Agent
- **File**: `examples/prd-parser-protocol.json`
- **Capability**: `prd-parsing`
- **Features**: PRD content parsing, requirements extraction, task generation

### Infrastructure Orchestrator Agent
- **File**: `examples/infrastructure-orchestrator-protocol.json`
- **Capability**: `infrastructure-orchestration`
- **Features**: Multi-agent workflow coordination, project generation

## API Reference

### ProtocolSchemaRepository

Main repository class:

```typescript
class ProtocolSchemaRepository {
  // Register new protocol
  async registerProtocol(protocol: ProtocolDefinition): Promise<void>
  
  // Retrieve protocol by ID and version
  async getProtocol(id: string, version?: string): Promise<ProtocolDefinition | null>
  
  // Update existing protocol
  async updateProtocol(id: string, updates: Partial<ProtocolDefinition>): Promise<void>
  
  // List protocols with filtering
  async listProtocols(filter?: FilterOptions): Promise<ProtocolDefinition[]>
  
  // Get protocol versions
  async getProtocolVersions(id: string): Promise<string[]>
  
  // Validate compatibility
  async validateCompatibility(old: ProtocolDefinition, new: ProtocolDefinition): Promise<CompatibilityResult>
  
  // Export protocols
  async exportProtocols(format: 'json' | 'yaml' | 'markdown' | 'html'): Promise<string>
  
  // Search protocols
  async searchProtocols(query: SearchQuery): Promise<ProtocolDefinition[]>
  
  // Create template
  createProtocolTemplate(type: AgentType, options: TemplateOptions): ProtocolDefinition
}
```

## Configuration

Repository behavior is controlled by `repository.config.json`:

```json
{
  "configuration": {
    "basePath": "./",
    "gitEnabled": true,
    "validationEnabled": true,
    "autoVersioning": true,
    "backupEnabled": true,
    "cachingEnabled": true
  },
  "validation": {
    "openapi": { "version": "3.1.0", "strictMode": true },
    "uep": { "enforceCapabilityNaming": true }
  },
  "versioning": {
    "semanticVersioning": true,
    "compatibilityChecks": true
  }
}
```

## Integration

### With UEP Validation System

```typescript
import { UEPSchemaRegistry } from '@uep/validation';

const schemaRegistry = new UEPSchemaRegistry(config);
const repository = createProtocolRepository();

// Load protocols into validation system
const protocols = await repository.listProtocols();
for (const protocol of protocols) {
  await schemaRegistry.registerSchema(
    protocol.specification['x-uep-capability'],
    protocol.specification
  );
}
```

### With TaskMaster

```typescript
// Generate tasks from protocol changes
repository.on('protocol-updated', async (event) => {
  const tasks = await generateValidationTasks(event.old, event.new);
  await taskMaster.addTasks(tasks);
});
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Validation

```bash
npm run validate-schemas
```

### Documentation Generation

```bash
npm run generate-docs
```

## License

UEP Protocol License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and add tests
4. Validate all protocols pass
5. Submit a pull request

## Support

For issues and questions:
- GitHub Issues: [uep/protocol-schemas/issues](https://github.com/uep/protocol-schemas/issues)
- Documentation: [UEP Protocol Docs](https://docs.uep.local/protocols)
- Email: protocols@uep.local