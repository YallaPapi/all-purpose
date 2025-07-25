# PRD: All-Purpose Pattern Agent

## Overview
Create a meta-agent that systematically transforms any hardcoded system into a truly universal, industry-agnostic system with NO limitations. This agent embodies the core breakthrough pattern that made the all-purpose lead generation system successful.

## Requirements

### Core Features
- Analyze existing code for hardcoded elements (industry lists, location restrictions, business type limits)
- Systematically replace hardcoded values with dynamic parameters from user configuration
- Ensure UNLIMITED scope - NO hardcoded industry lists, location limits, or business type restrictions
- Generate universal template systems that work for ANY context
- Validate that generated systems have zero hardcoded constraints

### Technical Specifications
- Use Node.js with AST parsing for code analysis
- Implement pattern detection for common hardcoding anti-patterns
- Build template generation system using Handlebars
- Create validation system to ensure no hardcoded limitations remain
- Support TypeScript and JavaScript codebases
- Generate Context7-enhanced code using current best practices

### Core Transformation Patterns
```javascript
// WRONG: Hardcoded industry logic (FORBIDDEN)
const industries = ['automotive', 'dental', 'legal']; // NEVER DO THIS
const message = "Car dealers in Miami";

// WRONG: Hardcoded limitations (ABSOLUTELY FORBIDDEN)  
const maxIndustries = 50; // NO LIMITS ALLOWED
if (industry === 'automotive') { /* hardcoded logic */ }

// CORRECT: Universal pattern with UNLIMITED scope
const industry = userInput.industry; // UNLIMITED - from user config only
const location = userInput.location; // UNLIMITED - from user targeting
const message = `${industry} in ${location}`; // Works for ANY industry/location
```

### Agent-Driven Development Integration
- Apply All-Purpose Pattern methodology from agent_driven_development_methodology.md
- Use Context7 integration for current implementation patterns  
- Follow 30-Minute Rule for debugging and alternative approaches
- Generate 5-document framework for created systems
- Ensure Vercel-native architecture patterns

### Pattern Detection Capabilities
- Identify hardcoded industry/location/business type references
- Detect hardcoded limitation constants (maxItems, industryLists, etc.)
- Find conditional logic based on hardcoded values
- Locate hardcoded API endpoints or configuration
- Detect hardcoded UI text and messaging

### Template Generation Features
- Create dynamic prompt templates (like lib/prompt-template-manager.ts)
- Generate universal API parameter handling
- Build industry-agnostic UI components
- Create configuration-driven behavior systems
- Generate fallback and validation patterns

### Validation System
- Verify NO hardcoded industry lists exist in generated code
- Ensure NO location limitations are present
- Confirm NO business type restrictions remain
- Validate unlimited scalability of generated systems
- Test that all behavior comes from user configuration only

### Integration Requirements
- Work with existing PRD-Parser and Scaffold-Generator agents
- Support TaskMaster task generation and research integration
- Use Context7 for current documentation and patterns
- Follow established meta-agent factory architecture
- Generate agents that can be further processed by other meta-agents

### Performance Goals
- Analyze codebases with 10,000+ files efficiently
- Transform hardcoded systems in under 5 minutes
- Generate universal templates with 99.9% pattern coverage
- Validate unlimited scope with zero false positives
- Support concurrent transformation of multiple systems

## Implementation Notes
This agent embodies the foundational principle that made the all-purpose lead generation system successful: the complete elimination of hardcoded limitations. It should work for ANY industry, location, business type, or context without requiring code changes.

The agent must ensure that all generated systems follow the All-Purpose Pattern: NO hardcoded assumptions, limits, or constraints anywhere in the codebase.

## Testing Strategy
- Unit tests for pattern detection algorithms
- Integration tests with sample hardcoded codebases
- Validation tests ensuring no limitations remain in output
- Performance tests with large codebases
- End-to-end tests creating universal systems from hardcoded ones