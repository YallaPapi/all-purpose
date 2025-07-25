# PRD: Scaffold Generator Agent

## Overview
Create an agent that generates consistent directory structures and base files for new agents based on parsed task lists from the PRD-Parser.

## Requirements

### Core Features
- Take parsed task lists as input from PRD-Parser
- Create appropriate `src/<agent-name>/` directories  
- Generate standard files (main.js, README.md, package.json)
- Update CHANGELOG.md with new agent entries
- Follow established naming conventions and patterns

### Technical Specifications
- Use Node.js with file system operations
- Implement template engine for standard files
- Build CHANGELOG updater functionality
- Add validation for naming conventions
- Ensure proper linking to existing documentation
- Support multiple agent types and patterns

### File Structure Generation
```
src/<agent-name>/
  ├── main.js
  ├── README.md  
  ├── package.json
  ├── config/
  │   └── default.json
  ├── templates/
  └── tests/
```

### Template Engine Requirements
- Dynamic template rendering based on agent specifications
- Support for variable substitution in templates
- Template validation and error handling
- Standard template library for common patterns

### Integration Requirements  
- Integrate with PRD-Parser output format
- Support TaskMaster task list input
- Generate appropriate Git commit messages
- Update project documentation automatically

### Performance Goals
- Process agent scaffolding in under 30 seconds
- Support concurrent scaffold generation
- Memory-efficient template processing
- Reliable file system operations

## Implementation Notes
This agent should follow the All-Purpose Pattern, working for ANY agent domain with no hardcoded limitations. It should use the established meta-agent factory methodologies and integrate with the 5-Document Framework.

## Testing Strategy
- Unit tests for directory creation and file generation
- Template rendering tests with various inputs  
- CHANGELOG update verification
- Integration test with sample agent specifications
- Validation against existing agent structures for consistency