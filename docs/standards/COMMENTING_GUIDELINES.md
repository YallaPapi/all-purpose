# Commenting Guidelines

*Formal coding standards for the All-Purpose Project*

## Overview

This document establishes consistent commenting standards across all meta-agents, applications, and shared libraries in the All-Purpose Project. These guidelines ensure code maintainability, team collaboration, and knowledge transfer.

## Core Principles

### 1. **Purpose-Driven Comments**
- Explain **WHY**, not **WHAT**
- Focus on business logic, design decisions, and complex algorithms
- Avoid redundant comments that simply restate the code

```typescript
// ❌ Bad: Redundant
let count = 0; // Initialize count to zero

// ✅ Good: Explains purpose
let retryCount = 0; // Track failed attempts for exponential backoff
```

### 2. **All-Purpose Pattern Compliance**
- Document configuration points and extensibility
- Explain how hardcoded limitations were eliminated
- Note where the pattern enables unlimited scalability

```typescript
// ✅ All-Purpose Pattern documentation
interface AgentConfig {
  // Unlimited agent types supported - no hardcoded restrictions
  supportedTypes: string[];
  
  // Configurable limits prevent hardcoded constraints
  maxConcurrency: number;
  
  // Extension point for future agent capabilities
  customHandlers?: Record<string, AgentHandler>;
}
```

## File-Level Documentation

### Header Comments
Every file must include a header comment with:

```typescript
/**
 * [Component Name] - [Brief Purpose]
 * 
 * [Detailed description of the component's role in the system]
 * 
 * Key Features:
 * - [Feature 1]
 * - [Feature 2]
 * 
 * Integration Points:
 * - [System A]: [How it integrates]
 * - [System B]: [How it integrates]
 * 
 * Following All-Purpose Pattern: [How this eliminates limitations]
 * 
 * @example
 * ```typescript
 * // Basic usage example
 * const agent = new MyAgent({ config });
 * ```
 */
```

### Meta-Agent Specific Headers
Meta-agents require additional context:

```typescript
/**
 * [Agent Name] - The [ROLE] Builder
 * 
 * Agent-Driven Development (ADD) Implementation
 * 
 * Core Capabilities:
 * - [Primary function]
 * - [Secondary functions]
 * 
 * Coordination:
 * - Input: [What this agent receives]
 * - Output: [What this agent produces]
 * - Dependencies: [Other agents this works with]
 * 
 * All-Purpose Pattern: [Specific unlimited capabilities]
 * 
 * Architecture Pattern: [e.g., Prompt Chaining, Tool-Using Agent]
 */
```

## Function Documentation

### JSDoc Standards
Use comprehensive JSDoc for all exported functions:

```typescript
/**
 * Processes work requests through the meta-agent coordination system
 * 
 * Implements the All-Purpose Pattern by accepting unlimited request types
 * and dynamically routing them to appropriate agents based on capability
 * matching rather than hardcoded rules.
 * 
 * @param request - Work request with flexible structure
 * @param context - Execution context with unlimited custom fields
 * @param options - Processing options (unlimited configuration)
 * @returns Promise resolving to coordination result
 * 
 * @throws {ValidationError} When request format is invalid
 * @throws {CapacityError} When system is at maximum load
 * 
 * @example
 * ```typescript
 * const result = await processWorkRequest({
 *   type: 'custom-workflow',
 *   data: { /* unlimited structure */ }
 * }, context);
 * ```
 * 
 * @see {@link MetaAgentCoordinator} for routing logic
 * @see {@link WorkRequest} for request structure
 */
async function processWorkRequest(
  request: WorkRequest,
  context: ExecutionContext,
  options?: ProcessingOptions
): Promise<CoordinationResult> {
  // Implementation...
}
```

### Method Documentation
Document public methods with context:

```typescript
class MetaAgentFactory {
  /**
   * Registers a new meta-agent with unlimited capability expansion
   * 
   * Following All-Purpose Pattern: Agents can declare any capabilities
   * without requiring factory modifications or hardcoded type lists.
   * 
   * @param agent - Agent instance with self-declared capabilities
   * @param capabilities - Unlimited capability declarations
   */
  registerAgent(agent: MetaAgent, capabilities: AgentCapabilities): void {
    // Validation ensures no hardcoded limitations
    if (this.hasConflicts(capabilities)) {
      throw new Error('Capability conflicts detected');
    }
    
    // Dynamic registration - no predefined agent types
    this.agents.set(agent.id, { agent, capabilities });
  }
}
```

## Inline Comments

### Complex Logic
Document complex algorithms and business rules:

```typescript
// Multi-phase embedding generation for optimal vector storage
// Phase 1: Content validation and preprocessing
const validTexts = texts.filter(text => {
  // OpenAI API rejects empty strings and null values
  if (!text || typeof text !== 'string') return false;
  return text.trim().length > 0;
});

// Phase 2: Batch processing with rate limiting
// All-Purpose Pattern: Configurable batch sizes, no hardcoded limits
for (let i = 0; i < validTexts.length; i += this.config.batchSize) {
  const batch = validTexts.slice(i, i + this.config.batchSize);
  
  // Rate limiting prevents API throttling
  if (i > 0) await this.delay(this.config.requestDelay);
  
  const batchResults = await this.processBatch(batch);
  results.push(...batchResults.results);
}
```

### Configuration Points
Document where All-Purpose Pattern is applied:

```typescript
interface SystemConfig {
  // All-Purpose Pattern: No hardcoded environment restrictions
  environments: string[]; // ['dev', 'staging', 'prod', ...unlimited]
  
  // Configurable limits prevent hardcoded constraints
  maxRetries: number; // Default: 3, configurable per environment
  
  // Unlimited custom handlers
  customMiddleware: MiddlewareConfig[];
}
```

### Error Handling
Document error scenarios and recovery:

```typescript
try {
  await this.processRequest(request);
} catch (error) {
  // Categorize errors for appropriate handling
  if (error instanceof ValidationError) {
    // Client error - return detailed feedback
    return this.createErrorResponse(400, error.message);
  } else if (error instanceof RateLimitError) {
    // Temporary issue - implement exponential backoff
    await this.scheduleRetry(request, error.retryAfter);
  } else {
    // Unknown error - log for investigation
    this.logger.error('Unexpected processing error', { 
      error, 
      requestId: request.id 
    });
    throw error; // Re-throw for upstream handling
  }
}
```

## API Documentation

### Route Documentation
Document API endpoints thoroughly:

```typescript
/**
 * POST /api/meta-agent-factory
 * 
 * Submits work requests to the Meta-Agent Factory for processing
 * 
 * Following All-Purpose Pattern: Accepts unlimited request types
 * and dynamically routes to appropriate meta-agents.
 * 
 * @route POST /api/meta-agent-factory
 * @param {WorkRequest} request - Work request with flexible structure
 * @returns {WorkResponse} Coordination result with tracking info
 * 
 * @example Request
 * ```json
 * {
 *   "type": "scaffold",
 *   "description": "Create Next.js app with TypeScript",
 *   "requirements": {
 *     "framework": "nextjs",
 *     "features": ["typescript", "tailwind"]
 *   }
 * }
 * ```
 * 
 * @example Response
 * ```json
 * {
 *   "success": true,
 *   "requestId": "req-1234567890",
 *   "assignedAgents": ["scaffold-generator", "template-engine-factory"],
 *   "estimatedCompletion": "15 minutes"
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  // Implementation...
}
```

## Configuration Documentation

### Environment Variables
Document all environment variables:

```typescript
/**
 * Environment Configuration
 * 
 * All-Purpose Pattern: No hardcoded environment restrictions
 * System adapts to any environment with proper configuration.
 */
interface EnvironmentConfig {
  /** OpenAI API key for embedding generation */
  OPENAI_API_KEY: string;
  
  /** Upstash Vector database URL - supports any vector DB */
  UPSTASH_VECTOR_REST_URL: string;
  
  /** Redis connection for caching - configurable provider */
  REDIS_URL?: string;
  
  /** Maximum concurrent agents - unlimited theoretical capacity */
  MAX_CONCURRENT_AGENTS?: number; // Default: 10
  
  /** Custom agent discovery patterns - unlimited extensibility */
  AGENT_DISCOVERY_PATTERNS?: string[]; // Default: ['**/*Agent.ts']
}
```

## Testing Documentation

### Test Comments
Document test purpose and setup:

```typescript
describe('MetaAgentFactory', () => {
  /**
   * Tests the All-Purpose Pattern implementation:
   * - Unlimited agent types
   * - Dynamic capability registration
   * - No hardcoded routing rules
   */
  describe('Agent Registration', () => {
    it('should accept unlimited agent types without modification', async () => {
      // Test that factory accepts any agent type
      const customAgent = new CustomAgent('unique-capability');
      
      // No hardcoded type validation - All-Purpose Pattern
      expect(() => {
        factory.registerAgent(customAgent, {
          type: 'never-seen-before-type',
          capabilities: ['custom-processing']
        });
      }).not.toThrow();
    });
  });
});
```

## Documentation Standards

### README Files
Each component needs a comprehensive README:

```markdown
# Component Name

Brief description of the component's purpose and role.

## Features

- **All-Purpose Pattern**: How this eliminates limitations
- **Feature 1**: Description
- **Feature 2**: Description

## Installation

\`\`\`bash
npm install
\`\`\`

## Configuration

\`\`\`typescript
interface Config {
  // Document all configuration options
}
\`\`\`

## Usage

\`\`\`typescript
// Provide clear usage examples
\`\`\`

## Integration

- **System A**: How it integrates
- **System B**: How it integrates

## Architecture

Explain the design patterns and architectural decisions.
```

## Quality Standards

### Comment Quality Checklist
- [ ] Explains WHY, not WHAT
- [ ] Documents All-Purpose Pattern applications
- [ ] Includes usage examples
- [ ] Notes integration points
- [ ] Explains error conditions
- [ ] Documents configuration options
- [ ] Provides architectural context

### Review Guidelines
- Comments should be reviewed alongside code
- Outdated comments must be updated with code changes
- Missing documentation blocks code approval
- All public APIs require comprehensive documentation

## Enforcement

### Linting Rules
Configure ESLint to enforce documentation:

```json
{
  "rules": {
    "jsdoc/require-jsdoc": ["error", {
      "require": {
        "FunctionDeclaration": true,
        "ClassDeclaration": true,
        "MethodDefinition": true
      }
    }],
    "jsdoc/require-description": "error",
    "jsdoc/require-example": ["error", {
      "exemptedBy": ["private", "internal"]
    }]
  }
}
```

### Pre-commit Hooks
Ensure documentation quality before commits:

```bash
# Check for missing documentation
npm run lint:docs

# Validate JSDoc syntax
npm run validate:jsdoc

# Check for All-Purpose Pattern documentation
npm run check:pattern-docs
```

---

*Following the All-Purpose Pattern: These guidelines scale to unlimited project complexity without requiring modifications to the commenting system itself.*