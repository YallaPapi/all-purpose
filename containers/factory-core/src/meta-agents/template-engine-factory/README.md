# Template Engine Factory Agent

> The CODE BUILDER for Dynamic Systems - Converts hardcoded content into dynamic, scalable template systems

## Overview

The Template Engine Factory Agent is one of the meta-agents in the Meta-Agent Factory system. It **generates complete working code** for dynamic template systems that can create unlimited variations from templates, eliminating hardcoded content limitations.

### Core Philosophy

**Builds Entire Dynamic Systems** - Unlike other template tools that just process templates, this agent generates complete TypeScript/JavaScript systems that create, process, and manage dynamic content with unlimited scalability.

## Features

### 🏗️ Complete System Generation
- Generates working TypeScript/JavaScript code for entire template systems
- Creates context processors, variation generators, fallback handlers, and validation engines
- Builds integration units for meta-agent coordination
- Produces production-ready, scalable code

### 🔧 Multi-Engine Support
- **Handlebars** - Full support with helpers and partials
- **Mustache** - Logic-less templates with unlimited context
- **Custom** - Extensible engine architecture for any template format
- NO hardcoded limitations on template complexity

### 🎨 Dynamic Content Generation
- Context-specific variations (industry, location, persona, custom)
- Unlimited variation strategies with no hardcoded constraints
- Fallback patterns for graceful error handling
- Validation engines for content quality assurance

### 🔗 Meta-Agent Integration
- Seamless integration with All-Purpose Pattern Agent
- Infrastructure Orchestrator coordination
- Context7 integration for up-to-date best practices
- RAG System compatibility for intelligent content generation

### ⚡ All-Purpose Pattern Compliance
- **NO hardcoded limitations** on system complexity or content types
- Unlimited scalability and customization
- Dynamic configuration for any use case
- Framework-agnostic implementations

## Installation

```bash
cd src/meta-agents/template-engine-factory
npm install
```

## Quick Start

### Programmatic Usage

```typescript
import { TemplateEngineFactoryAgent } from '@meta-agents/template-engine-factory';

// Initialize agent
const agent = new TemplateEngineFactoryAgent({
  outputDirectory: './my-template-systems',
  defaultEngine: 'handlebars',
  codeGeneration: {
    targetLanguage: 'typescript',
    includeTests: true,
    includeDocumentation: true
  }
});

await agent.initialize();

// Generate a complete dynamic system
const result = await agent.generateDynamicSystem({
  requestId: 'ecommerce-templates',
  systemName: 'E-commerce Product Templates',
  description: 'Dynamic template system for product pages',
  
  specification: {
    templateEngine: 'handlebars',
    contentTypes: ['html', 'text', 'json'],
    contextTypes: ['product', 'category', 'user'],
    variationRequirements: ['industry-specific', 'location-specific'],
    fallbackRequirements: ['error-handling', 'graceful-degradation'],
    validationRequirements: ['context-validation', 'content-validation']
  },
  
  integrationRequirements: {
    metaAgents: ['all-purpose-pattern-agent'],
    context7Integration: true,
    ragSystemCompatible: true
  }
});

console.log(`System generated: ${result.systemId}`);
console.log(`Files generated: ${result.generation.filesGenerated}`);
console.log(`Lines of code: ${result.generation.linesOfCode}`);
```

### CLI Usage

```bash
# Generate a complete dynamic system
node dist/main.js generate "E-commerce Templates" \
  --content-types html,text,json \
  --context-types product,category,user \
  --variation-requirements industry-specific,location-specific \
  --engine handlebars

# Analyze existing template for conversion opportunities
node dist/main.js analyze ./templates/product.hbs --output analysis.json --verbose

# List generated systems
node dist/main.js systems --list

# Test integrations
node dist/main.js integrate --agent all-purpose-pattern-agent --test

# Check agent status
node dist/main.js status
```

## Generated System Architecture

The agent generates complete systems with this architecture:

```
Generated Template System/
├── templates/                    # Template files
│   ├── main-template.hbs
│   ├── variations/              # Context-specific variations
│   └── fallbacks/               # Error handling templates
├── src/
│   ├── processors/              # Context processing code
│   ├── generators/              # Variation generation code
│   ├── handlers/                # Fallback handling code
│   ├── validation/              # Validation engines
│   └── integrations/            # Meta-agent integrations
├── tests/                       # Generated test suites
├── docs/                        # Generated documentation
└── package.json                 # System dependencies
```

## Configuration

```typescript
const config = {
  // Template engines - ALL supported
  supportedEngines: ['mustache', 'handlebars', 'custom'],
  defaultEngine: 'handlebars',
  
  // Code generation settings
  codeGeneration: {
    targetLanguage: 'typescript',      // or 'javascript'
    outputFormat: 'esm',               // or 'cjs'
    includeTypes: true,
    includeTests: true,
    includeDocumentation: true
  },
  
  // Dynamic system settings - UNLIMITED
  dynamicSystems: {
    contextTypes: [],                  // NO hardcoded limitations
    variationStrategies: [],           // UNLIMITED strategies
    fallbackPatterns: [],              // UNLIMITED patterns
    validationRules: []                // UNLIMITED rules
  },
  
  // Integration settings
  integration: {
    allPurposePatternAgent: true,
    infrastructureOrchestrator: true,
    fiveDocumentFramework: true,
    context7Integration: true,
    ragSystemIntegration: true
  },
  
  // Performance - NO limitations
  performance: {
    maxConcurrentGenerations: 'unlimited',
    maxTemplateSize: 'unlimited',
    maxOutputFiles: 'unlimited',
    cacheStrategy: 'memory'
  }
};
```

## Integration with Meta-Agents

### All-Purpose Pattern Agent
```typescript
// Receives anti-pattern detection results
agent.on('pattern-detection', async (detectionResults) => {
  // Generate template systems to replace hardcoded content
  const systems = await generateReplacementSystems(detectionResults);
});
```

### Infrastructure Orchestrator Agent
```typescript
// Reports system generation status
agent.on('system:generation:completed', (result) => {
  orchestrator.reportSystemGeneration(result);
});
```

### Context7 Integration
```typescript
// Uses current best practices
const bestPractices = await context7.getBestPractices('template-generation');
// Apply practices to generated code
```

## API Reference

### TemplateEngineFactoryAgent

#### Methods
- `initialize()` - Initialize the agent
- `generateDynamicSystem(request)` - Generate complete dynamic template system
- `analyzeTemplate(templatePath)` - Analyze template for conversion opportunities
- `getGeneratedSystems()` - Get list of generated systems
- `getGeneratedSystem(systemId)` - Get specific generated system
- `getActiveGenerations()` - Get active generation requests
- `getCapabilities()` - Get agent capabilities

#### Events
- `agent:initialized` - Agent initialized successfully
- `system:generation:started` - System generation started
- `system:generation:progress` - Generation progress update
- `system:generation:completed` - System generation completed
- `system:generation:failed` - System generation failed
- `template:analysis:completed` - Template analysis completed
- `integration:connected` - Integration established
- `integration:error` - Integration error

## Examples

### React Component Templates
```typescript
const result = await agent.generateDynamicSystem({
  systemName: 'React Component Templates',
  specification: {
    templateEngine: 'handlebars',
    contentTypes: ['jsx', 'typescript'],
    contextTypes: ['component', 'props', 'state'],
    variationRequirements: ['component-type-specific', 'framework-specific']
  }
});
```

### Email Template System
```typescript
const result = await agent.generateDynamicSystem({
  systemName: 'Email Templates',
  specification: {
    templateEngine: 'mustache',
    contentTypes: ['html', 'text'],
    contextTypes: ['user', 'campaign', 'product'],
    variationRequirements: ['personalization', 'localization'],
    fallbackRequirements: ['text-fallback', 'image-fallback']
  }
});
```

### API Documentation Generator
```typescript
const result = await agent.generateDynamicSystem({
  systemName: 'API Documentation',
  specification: {
    templateEngine: 'handlebars',
    contentTypes: ['markdown', 'html', 'json'],
    contextTypes: ['api', 'endpoint', 'schema'],
    validationRequirements: ['schema-validation', 'example-validation']
  }
});
```

## Best Practices

### 1. System Design
- Start with clear context types and variation requirements
- Design fallback strategies before implementing primary templates
- Plan for unlimited scalability from the beginning

### 2. Template Organization
- Use meaningful template names and directory structures
- Implement proper template inheritance and partials
- Design templates for maximum reusability

### 3. Context Processing
- Validate all context data before template rendering
- Implement context enrichment for better template rendering
- Design context processors for performance and scalability

### 4. Integration
- Coordinate with other meta-agents for comprehensive solutions
- Use Context7 for up-to-date best practices
- Leverage RAG system for intelligent content generation

### 5. Quality Assurance
- Generate comprehensive test suites for all systems
- Implement validation at multiple levels
- Monitor system performance and optimize continuously

## Troubleshooting

### Common Issues

**System generation fails:**
```bash
# Check agent status
node dist/main.js status

# Verify configuration
node dist/main.js integrate --list
```

**Template analysis issues:**
```bash
# Analyze with verbose output
node dist/main.js analyze template.hbs --verbose

# Check template format compatibility
```

**Integration problems:**
```bash
# Test specific integration
node dist/main.js integrate --agent all-purpose-pattern-agent --test

# List all integrations
node dist/main.js integrate --list
```

## Contributing

1. Follow the All-Purpose Pattern: NO hardcoded limitations
2. Maintain unlimited scalability in all implementations
3. Add comprehensive tests for new features
4. Update documentation for configuration changes
5. Ensure meta-agent coordination compatibility

## License

MIT License - Part of the Meta-Agent Factory System