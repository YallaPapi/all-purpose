# Context7 MCP Integration Guide

## Overview

Context7 is an MCP (Model Context Protocol) server that provides up-to-date, version-specific code documentation and examples directly into AI prompts. It solves the critical problem of LLMs relying on outdated or hallucinated library information.

**Integration Purpose**: Enhance meta-agent factory and lead generation machine with current, accurate implementation guidance.

## Context7 Core Capabilities

### Real-Time Documentation Retrieval
- Fetches current, version-specific code documentation
- Eliminates hallucinated APIs and outdated code examples
- Provides context directly into AI prompt context
- Supports multiple programming languages and frameworks

### Multi-Platform Integration
- Compatible with Cursor, VS Code, Claude, Windsurf
- Configurable through JSON-based MCP server settings
- Supports both remote and local server configurations

## Installation & Setup

### Prerequisites
- Node.js ≥ v18.0.0
- Existing MCP server configuration
- API access to documentation sources

### Installation Options

#### Option 1: NPM Installation
```bash
npm install -g context7
```

#### Option 2: Docker Setup
```bash
docker run -p 3000:3000 upstash/context7
```

#### Option 3: Local Development
```bash
git clone https://github.com/upstash/context7
cd context7
npm install
npm start
```

### MCP Configuration
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "taskmaster-ai": {
      "command": "npx",
      "args": ["-y", "task-master-mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "context7"],
      "env": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

## Integration with Meta-Agent Factory

### Enhanced Meta-Agent Development

#### All-Purpose Pattern Agent
```typescript
// Enhanced prompt with Context7
const agentPrompt = `
Create a universal authentication system that works for any provider.
use context7

Requirements:
- Next.js 15+ middleware patterns
- TypeScript strict mode
- Vercel-native deployment
- Dynamic provider configuration (no hardcoded providers)
`;
```

#### Template Engine Factory Agent
```typescript
// Context7-enhanced template generation
const templatePrompt = `
Generate dynamic email templates using latest Mustache.js patterns.
use context7

Requirements:
- Industry-agnostic template structure
- Variable injection with type safety
- Fallback template mechanisms
- Performance-optimized rendering
`;
```

#### Vercel-Native Architecture Agent
```typescript
// Current Vercel patterns via Context7
const architecturePrompt = `
Design serverless function architecture for lead processing system.
use context7

Requirements:
- Latest Vercel API routes patterns
- Edge runtime optimization
- Environment variable management
- Monitoring and observability
`;
```

### Documentation Enhancement

#### Five-Document Framework Agent
With Context7, generated documentation references current best practices:

**ENVIRONMENT_SETUP.md Enhancement**:
```markdown
# Enhanced with Context7
## Current Framework Versions
use context7

Latest configuration patterns for:
- Next.js 15+ environment setup
- Vercel deployment optimization
- TypeScript 5+ configuration
- Modern ESM module patterns
```

**DEBUGGING_GUIDE.md Enhancement**:
```markdown
# 30-Minute Rule with Current Tools
use context7

Latest debugging patterns:
- Modern browser DevTools features
- Current VS Code debugging setup
- Latest Node.js debugging flags
- Contemporary error handling patterns
```

## Integration with Lead Generation Machine

### Agent-Specific Context7 Usage

#### Prospector Agent
```typescript
// Current web scraping patterns
const prospectorPrompt = `
Create lead scraping system using latest Playwright patterns.
use context7

Requirements:
- Modern browser automation
- Anti-detection techniques
- Performance optimization
- Error handling and retries
`;
```

#### Lead Intelligence Agent
```typescript
// Current API integration patterns
const intelligencePrompt = `
Build lead enrichment using current third-party APIs.
use context7

Requirements:
- Latest LinkedIn Sales Navigator API
- Current Clearbit/ZoomInfo patterns
- Modern rate limiting strategies
- Real-time data processing
`;
```

#### Messaging Optimization Agent
```typescript
// Current A/B testing frameworks
const messagingPrompt = `
Implement A/B testing system using latest statistical analysis libraries.
use context7

Requirements:
- Modern experimentation frameworks
- Statistical significance testing
- Real-time result processing
- Performance measurement
`;
```

### Technology Stack Updates

#### Current Framework Versions
Context7 ensures all agents use latest versions:
- **Next.js**: Latest stable version with app router
- **TypeScript**: Current strict mode patterns
- **Playwright**: Latest automation features
- **Vercel**: Current serverless function patterns
- **Upstash Redis**: Latest client libraries
- **OpenAI**: Current API patterns and SDKs

#### API Integration Patterns
```typescript
// Context7-enhanced API client
const apiPrompt = `
Create OpenAI client using latest SDK patterns.
use context7

Requirements:
- Current rate limiting strategies
- Modern error handling
- Streaming response patterns
- Token optimization techniques
`;
```

## Enhanced Development Workflow

### TaskMaster + Context7 Integration

#### Research-Backed Development
```bash
# Enhanced task generation with current documentation
task-master parse-prd --input="agent-requirements.md" --research

# Each generated task includes Context7 integration
```

#### Example Enhanced Task
```json
{
  "id": 15,
  "title": "Implement Lead Enrichment Agent",
  "description": "Build lead enrichment system using current API patterns",
  "details": "Create enrichment system. use context7\n\nRequirements:\n- Latest third-party API integration\n- Current rate limiting patterns\n- Modern error handling\n- Real-time processing",
  "testStrategy": "Test with current API documentation and examples"
}
```

### Code Generation Enhancement

#### Before Context7
```typescript
// Potentially outdated patterns
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await client.completions.create({ ... });
```

#### With Context7
```typescript
// Current, verified patterns
use context7
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await client.chat.completions.create({ ... });
```

## Quality Assurance Benefits

### Reduced Technical Debt
- No outdated library usage
- Current security patterns
- Modern performance optimizations
- Latest best practices

### Faster Development
- Immediate access to current documentation
- Reduced trial-and-error coding
- Consistent patterns across agents
- Fewer breaking changes

### Better Reliability
- Current error handling patterns
- Modern retry strategies
- Latest monitoring approaches
- Contemporary security practices

## Integration Testing

### Context7 Validation
```typescript
// Test Context7 integration
async function validateContext7Integration() {
  const testPrompt = "Create Next.js API route. use context7";
  const response = await generateCode(testPrompt);
  
  // Verify current patterns are used
  assert(response.includes('export async function'));
  assert(!response.includes('deprecated patterns'));
}
```

### Documentation Currency
```typescript
// Verify documentation stays current
async function validateDocumentationCurrency() {
  const docs = await generateDocumentation("use context7");
  
  // Check for current version references
  assert(docs.includes('latest version'));
  assert(!docs.includes('outdated syntax'));
}
```

## Monitoring & Maintenance

### Context7 Health Monitoring
```typescript
// Monitor Context7 server health
export async function checkContext7Health() {
  return {
    serverStatus: await pingContext7Server(),
    documentationFreshness: await checkDocumentationAge(),
    apiResponseTime: await measureResponseTime(),
    errorRate: await calculateErrorRate()
  };
}
```

### Update Procedures
- Regular Context7 server updates
- Documentation source monitoring
- API pattern validation
- Framework version tracking

## Troubleshooting

### Common Issues

#### Context7 Server Not Responding
```bash
# Check server status
curl -f http://localhost:3000/health

# Restart server
npm restart context7
```

#### Outdated Documentation Returned
```typescript
// Force documentation refresh
await context7.refreshDocumentation();
```

#### Integration Test Failures
```bash
# Validate MCP configuration
cursor --validate-mcp

# Test Context7 connectivity
npx context7 --test
```

## Future Enhancements

### Custom Documentation Sources
- Internal API documentation
- Company-specific patterns
- Industry-specific best practices
- Proprietary framework integration

### Advanced Context Management
- Project-specific context caching
- Smart context prioritization
- Usage analytics and optimization
- Automatic pattern learning

---

**Context7 integration ensures that every component of the meta-agent factory and lead generation machine uses current, verified implementation patterns, reducing technical debt and improving system reliability.**