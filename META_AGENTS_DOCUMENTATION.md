# Meta-Agents Documentation & Parameter Mapping

**Complete reference for all meta-agents, their parameters, input/output formats, and usage patterns.**

---

## 📋 Quick Reference

| Agent | Purpose | Input Format | Key Parameters |
|-------|---------|--------------|----------------|
| **PRD Parser** | Watches PRD files, creates TaskMaster tasks | PRD Markdown files | `watchDir`, `outputDir`, `researchEnabled` |
| **Scaffold Generator** | Creates agent code from PRD data | PRD JSON with tasks + metadata | `outputDir`, `templatesDir`, `collisionDetection` |
| **UEP Factory** | Manages enhanced agents with UEP | Agent configurations | `enableUEP`, `enableValidation`, `logLevel` |

---

## 🔍 PRD Parser Agent

### Purpose
Watches for PRD files, parses them, and generates TaskMaster task lists with research.

### Input Format
- **File Pattern**: `docs/prd_[agent-name].md`
- **Content**: Markdown PRD files
- **Auto-trigger**: File creation/modification in watch directory

### Parameters
```javascript
{
  // File watching
  watchDir: 'docs',                    // Directory to watch for PRD files
  prdPattern: /^prd_(.+)\.md$/,       // Regex pattern for PRD files
  outputDir: '.taskmaster/tasks',      // Where to save generated tasks
  
  // Features
  researchEnabled: true,               // Enable research for each task
  contextEnabled: true,                // Enable Context7 integration
  gitEnabled: true,                    // Enable git integration
  memoryEnabled: true,                 // Enable working memory
  
  // UEP Enhancement
  uepEnabled: true,                    // Enable UEP enhancement
  enhancedValidation: true,            // Enhanced validation
  enhancedContext: true,               // Enhanced context awareness
  
  // Logging
  logLevel: 'info',                    // debug, info, warn, error
  agentId: 'prd-parser-001'           // Unique agent identifier
}
```

### Output Format
```json
{
  "agent": "agent-name",
  "generated": "2023-12-07T10:30:00Z",
  "generatedBy": "PRD-Parser-Agent",
  "version": "1.0.0",
  "tasks": [
    {
      "id": "task-1",
      "title": "Task Title",
      "description": "Task description",
      "priority": "high|medium|low",
      "dependencies": ["task-2"]
    }
  ],
  "metadata": {
    "totalTasks": 5,
    "highPriority": 2,
    "dependencies": {...}
  }
}
```

### Usage Examples
```bash
# Start PRD parser (watches for file changes)
node src/meta-agents/enhanced-prd-parser.js

# Environment configuration
PRD_WATCH_DIR=docs
TASKMASTER_OUTPUT_DIR=.taskmaster/tasks
UEP_ENABLED=true
```

### File Example
Create: `docs/prd_user-auth.md`
```markdown
# PRD: User Authentication Agent

## Description
Handles user authentication and authorization

## Tasks
1. Implement login endpoint
2. Add JWT token generation
3. Create user registration
```

---

## 🏗️ Scaffold Generator Agent

### Purpose
Generates agent code scaffolds from PRD-Parser output or structured JSON data.

### Input Format (CRITICAL - MUST MATCH EXACTLY)
```javascript
{
  "tasks": [                          // REQUIRED: Array of tasks
    {
      "id": 1,                        // REQUIRED: Number or string
      "title": "Task Title",          // REQUIRED: String
      "description": "Description",   // REQUIRED: String
      "priority": "high",             // Optional: high|medium|low (default: medium)
      "dependencies": [2, 3],         // Optional: Array of task IDs
      "status": "pending"             // Optional: pending|in-progress|completed
    }
  ],
  "metadata": {                       // REQUIRED: Metadata object
    "projectName": "Agent Name",      // REQUIRED: String (agent name)
    "description": "Agent desc",      // Optional: String
    "version": "1.0.0",              // Optional: String
    "author": "Author Name"           // Optional: String
  }
}
```

### Parameters
```javascript
{
  // Directories
  outputDir: process.cwd(),           // Where to create agent directories
  templatesDir: 'src/meta-agents/scaffold-generator/templates', // Template location
  
  // Generation options
  includeTests: true,                 // Generate test files
  includeGitignore: true,            // Generate .gitignore
  overwrite: false,                  // Overwrite existing directories
  
  // UEP Enhancement
  uepEnabled: true,                   // Enable UEP enhancement
  enhancedValidation: true,           // Enhanced validation
  collisionDetection: true,           // Check for naming conflicts
  enhancedContext: true,              // Enhanced context awareness
  
  // Agent configuration
  agentId: 'scaffold-generator-001',  // Unique agent identifier
  memoryEnabled: true,                // Enable working memory
  logLevel: 'info'                    // debug, info, warn, error
}
```

### Output
- Creates directory: `outputDir/[agent-name]/`
- Generates files: `main.js`, `package.json`, `README.md`, tests, etc.
- Returns metadata about generated files

### Usage Examples
```bash
# Generate from PRD file
node src/meta-agents/enhanced-scaffold-generator.js generate ./prd-output.json

# Programmatic usage
const generator = new EnhancedScaffoldGenerator({
  outputDir: './agents',
  collisionDetection: true
});
await generator.initialize();
const result = await generator.process(prdData);
```

### Template Structure
```
src/meta-agents/scaffold-generator/templates/
├── main.js.hbs          # Main agent file template
├── package.json.hbs     # Package.json template
├── README.md.hbs        # README template
└── config/              # Configuration templates
    └── default.json.hbs
```

---

## 🧠 UEP Meta-Agent Factory

### Purpose
Creates and manages UEP-enhanced meta-agents with standardized execution, validation, and monitoring.

### Parameters
```javascript
{
  // UEP Configuration
  enableUEP: true,                    // Master UEP switch
  enableValidation: true,             // Compliance checking
  enableMemoryIntegration: true,      // Working memory integration
  enableCaching: true,                // Performance caching
  enableDebugMode: false,             // Debug mode
  
  // Performance
  timeout: 180000,                    // 3 minutes default timeout
  maxConcurrentAgents: 10,            // Max simultaneous agents
  enablePerformanceMonitoring: true, // Performance tracking
  
  // Logging
  logLevel: 'minimal',                // silent, minimal, verbose, debug
  enableAuditLogging: true,           // Audit trail
  
  // Directories
  workingDirectory: process.cwd(),    // Working directory
  agentsDirectory: 'src/meta-agents', // Agents location
  outputDirectory: '.taskmaster',     // Output location
  
  // Agent defaults
  agentDefaults: {
    'prd-parser': {
      watchDir: 'docs',
      outputDir: '.taskmaster/tasks'
    },
    'scaffold-generator': {
      outputDir: process.cwd(),
      templatesDir: 'templates',
      collisionDetection: true
    }
  }
}
```

### Usage Examples
```javascript
// Create factory
const factory = await createUEPMetaAgentFactory({
  enableUEP: true,
  logLevel: 'minimal'
});

// Create enhanced PRD parser
const prdParser = await factory.createAgent('prd-parser', 'my-parser', {
  watchDir: 'docs',
  researchEnabled: true
});

// Create enhanced scaffold generator
const scaffoldGen = await factory.createAgent('scaffold-generator', 'my-generator', {
  outputDir: './agents',
  collisionDetection: true
});

// Process with UEP enhancement
const result = await scaffoldGen.process(prdData, {
  sessionId: 'session-123',
  enableContextualMemory: true,
  enableCodebaseAwareness: true
});

// Get metrics
const stats = factory.getStatistics();
const agentMetrics = scaffoldGen.getMetrics();

// Cleanup
await factory.cleanup();
```

---

## 🔧 Configuration Files

### Environment Variables (.env)
```bash
# Redis/Memory
KV_REST_API_URL=https://your-redis-url
KV_REST_API_TOKEN=your-redis-token

# API Keys
ANTHROPIC_API_KEY=your-anthropic-key
PERPLEXITY_API_KEY=your-perplexity-key
OPENAI_API_KEY=your-openai-key

# TaskMaster
MODEL=claude-3-7-sonnet-20250219
MAX_TOKENS=64000
TEMPERATURE=0.2

# UEP Settings
UEP_ENABLED=true
UEP_VALIDATION=true
UEP_CONTEXT=true
```

---

## 📊 Error Handling & Validation

### Common Input Errors

#### Scaffold Generator
```javascript
// ❌ WRONG - Missing metadata.projectName
{
  tasks: [...],
  metadata: { version: "1.0.0" }  // Missing projectName!
}

// ✅ CORRECT
{
  tasks: [
    { id: 1, title: "Task", description: "Description" }
  ],
  metadata: {
    projectName: "My Agent"  // REQUIRED!
  }
}
```

#### PRD Parser
```bash
# ❌ WRONG - Incorrect file pattern
docs/my-agent.md

# ✅ CORRECT - Must match pattern
docs/prd_my-agent.md
```

### Validation Rules
1. **Scaffold Generator**: Requires `tasks` array and `metadata.projectName`
2. **PRD Parser**: Files must match pattern `prd_*.md` in watch directory
3. **UEP Factory**: Agent IDs must be unique within factory instance

---

## 🚀 Integration Patterns

### Pattern 1: Automated PRD-to-Agent Workflow
```bash
# 1. Create PRD file
echo "# PRD: User Service" > docs/prd_user-service.md

# 2. Start enhanced PRD parser (auto-processes)
node src/meta-agents/enhanced-prd-parser.js

# 3. Use generated tasks for scaffold generation
node src/meta-agents/enhanced-scaffold-generator.js generate .taskmaster/tasks/tasks_user-service.json
```

### Pattern 2: Factory-Managed Agents
```javascript
// Create factory with UEP enhancement
const factory = await createUEPMetaAgentFactory();

// Create multiple agents
const parser = await factory.createAgent('prd-parser', 'parser-1');
const generator = await factory.createAgent('scaffold-generator', 'gen-1');

// Agents automatically have UEP enhancement
const result = await generator.process(data); // Includes compliance scoring, context awareness
```

### Pattern 3: CLI Human Enhancement
```bash
# Enhanced prompts with context
node dist/uep/cli.js --interactive

# Non-interactive with structured output
node dist/uep/cli.js --interactive false --format json "Generate API documentation"
```

---

## 📈 Monitoring & Metrics

### Factory Statistics
```javascript
const stats = factory.getStatistics();
// Returns:
{
  factory: {
    totalAgentsCreated: 5,
    totalTasksProcessed: 23,
    averageComplianceScore: 0.87
  },
  performance: {
    averageProcessingTime: 1500
  }
}
```

### Agent Metrics
```javascript
const metrics = agent.getMetrics();
// Returns:
{
  usageCount: 10,
  successRate: 0.95,
  averageProcessingTime: 2300,
  averageComplianceScore: 0.91,
  uptime: 3600000
}
```

---

## 🔍 Troubleshooting

### Issue: "Templates directory not found"
**Solution**: Ensure templates directory exists:
```bash
ls src/meta-agents/scaffold-generator/templates/
# Should show: main.js.hbs, package.json.hbs, etc.
```

### Issue: "metadata.projectName is required"
**Solution**: Check input format for scaffold generator:
```javascript
// Must include metadata.projectName
{
  tasks: [...],
  metadata: { projectName: "Agent Name" }  // Required!
}
```

### Issue: "No PRD files detected"
**Solution**: Check file naming pattern:
```bash
# Files must match: prd_*.md
docs/prd_my-agent.md  ✅
docs/my-agent.md      ❌
```

### Issue: Redis warnings
**Normal**: UEP works with in-memory fallback if Redis not configured.
**To fix**: Add Redis credentials to .env:
```bash
KV_REST_API_URL=your-redis-url
KV_REST_API_TOKEN=your-token
```

---

## ✅ Verification Commands

```bash
# 1. Verify UEP system
node verify-uep.js

# 2. Test scaffold generator format
node -e "
const { parseInput } = require('./src/meta-agents/scaffold-generator/lib/inputParser');
console.log(parseInput({
  tasks: [{id: 1, title: 'Test', description: 'Test task'}],
  metadata: {projectName: 'Test Agent'}
}));
"

# 3. Test factory creation
node -e "
const { createUEPMetaAgentFactory } = require('./src/meta-agents/UEPMetaAgentFactory');
createUEPMetaAgentFactory({logLevel: 'silent'}).then(f => {
  console.log('Factory created:', f.isInitialized);
  return f.cleanup();
});
"
```

---

**This documentation eliminates the need to reverse-engineer parameters and formats. Bookmark this file for all meta-agent development.**