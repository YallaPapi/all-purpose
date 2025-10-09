# Universal Execution Protocol (UEP) - Quick Start Guide

🧠 Your standardized, intelligent execution pipeline for all agents and human tasks

## 🚀 Quick Setup (30 seconds)

```bash
# 1. Compile UEP TypeScript modules
npx tsc src/uep/*.ts --outDir dist

# 2. Install missing dependencies (if needed)
npm install dotenv fs-extra

# 3. Test UEP is working
node test-uep-integration.js
```

## ✨ How to Use UEP

### For Human Prompts (Enhanced Claude Code Experience)

```bash
# Interactive mode - Enhanced prompts with context
node dist/uep/cli.js --interactive

# Non-interactive mode - Single enhanced prompt
node dist/uep/cli.js --interactive false --format enhanced "Your prompt here"

# JSON output for automation
node dist/uep/cli.js --interactive false --format json "Generate API documentation"
```

**What UEP adds to your prompts:**
- 🧠 **Memory Context** - Previous work and patterns
- 🔍 **Codebase Awareness** - Relevant files and functions
- 📚 **Documentation** - Related docs and guides
- 📋 **Task Breakdown** - Structured approach suggestions
- ⚠️ **Collision Detection** - Potential conflicts identified

### For Meta-Agents (Automated Workflows)

```javascript
// Create UEP-enhanced meta-agent factory
const { createUEPMetaAgentFactory } = require('./src/meta-agents/UEPMetaAgentFactory');

const factory = await createUEPMetaAgentFactory({
  enableUEP: true,           // Enable full UEP pipeline
  enableValidation: true,    // Enable compliance checking
  logLevel: 'minimal'        // silent, minimal, verbose, debug
});

// Create enhanced PRD parser (watches for PRD files)
const prdParser = await factory.createAgent('prd-parser', 'my-prd-parser', {
  watchDir: 'docs',           // Where to watch for PRD files
  outputDir: '.taskmaster/tasks'
});

// Create enhanced scaffold generator
const scaffoldGen = await factory.createAgent('scaffold-generator', 'my-scaffold-gen', {
  outputDir: './agents',      // Where to create new agents
  collisionDetection: true    // Check for naming conflicts
});

// Process with UEP enhancement
const result = await scaffoldGen.process(prdData, {
  sessionId: 'my-session',
  enableContextualMemory: true,
  enableCodebaseAwareness: true
});

console.log(`UEP Score: ${result.uepMetadata?.complianceScore}`);
```

## 🎯 Common Use Cases

### 1. Enhanced PRD Processing
```bash
# Put a PRD file in docs/ folder named: prd_my-agent.md
# The enhanced PRD parser will automatically:
# - Parse the PRD with UEP context
# - Generate TaskMaster tasks
# - Research each task
# - Apply memory and codebase awareness

# Start enhanced PRD parser
node src/meta-agents/enhanced-prd-parser.js
```

### 2. Context-Aware Scaffold Generation
```bash
# Generate agent with UEP enhancements
node src/meta-agents/enhanced-scaffold-generator.js generate ./my-prd.json \
  --output ./new-agents \
  --collision-detection
```

### 3. Human Prompt Enhancement
```bash
# Get enhanced prompts for development work
node dist/uep/cli.js --interactive

# Example session:
UEP> "Help me debug my React component performance issues"
# UEP will enhance with:
# - Relevant React files in your codebase
# - Performance-related documentation
# - Memory of previous debugging sessions
# - Structured debugging approach
```

## 📊 Check if UEP is Working

### Quick Health Check
```bash
# Test all UEP components
node test-uep-integration.js

# Expected output:
# ✅ UEP Meta-Agent Factory created successfully
# ✅ Enhanced PRD Parser created successfully  
# ✅ Enhanced Scaffold Generator created successfully
# ✅ Factory statistics retrieved successfully
```

### Verify Enhanced Agents
```javascript
// Check if agent is UEP-enhanced
const agent = factory.getAgent('my-agent');
const status = agent.getStatus();

console.log('UEP Enabled:', status.uep?.enabled);
console.log('Agent Enhanced:', status.enhanced);
console.log('Compliance Score:', agent.getMetrics().averageComplianceScore);
```

### Check CLI Enhancement
```bash
# Test CLI enhancement
node dist/uep/cli.js --interactive false --format json "test prompt"

# Look for:
# - "uepMetadata" in response
# - "complianceScore" > 0
# - "contextEnhancements" with data
```

## 🛠️ Configuration Options

### Environment Variables (.env)
```bash
# UEP Configuration
UEP_ENABLED=true
UEP_VALIDATION=true
UEP_CONTEXT=true

# Agent Configuration  
PRD_WATCH_DIR=docs
TASKMASTER_OUTPUT_DIR=.taskmaster/tasks
```

### Programmatic Configuration
```javascript
const config = {
  enableUEP: true,              // Master UEP switch
  enableValidation: true,       // Compliance checking
  enableMemoryIntegration: true, // Working memory
  enableCaching: true,          // Performance caching
  logLevel: 'minimal',          // silent|minimal|verbose|debug
  timeout: 180000,              // 3 minutes
  maxConcurrentAgents: 10
};
```

## 🚨 Troubleshooting

### UEP Not Working?
```bash
# 1. Check TypeScript compilation
npx tsc src/uep/*.ts --outDir dist
ls dist/uep/  # Should see .js files

# 2. Check dependencies
npm install @types/node zod @babel/parser @babel/traverse @babel/types @upstash/redis

# 3. Test fallback mode
UEP_ENABLED=false node test-uep-integration.js
```

### Redis Warnings?
```bash
# Normal if you don't have Redis setup
# UEP works with in-memory fallback
# To setup Redis, add to .env:
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Agents Not Enhanced?
```javascript
// Check agent status
const agent = factory.getAgent('agent-id');
console.log(agent.getStatus());

// Look for:
// uep: { enabled: true, enhanced: true }
```

## 📈 Monitoring & Metrics

### Factory Statistics
```javascript
const stats = factory.getStatistics();
console.log('Total Agents:', stats.factory.totalAgentsCreated);
console.log('Tasks Processed:', stats.factory.totalTasksProcessed);
console.log('Average Compliance:', stats.factory.averageComplianceScore);
```

### Agent Performance
```javascript
const metrics = agent.getMetrics();
console.log('Success Rate:', metrics.successRate);
console.log('Avg Processing Time:', metrics.averageProcessingTime);
console.log('Compliance Score:', metrics.averageComplianceScore);
```

## 🎪 Example Workflows

### Workflow 1: Enhanced Development Session
```bash
# 1. Start UEP CLI for enhanced prompts
node dist/uep/cli.js --interactive

# 2. Enhanced prompts like:
"Review my API endpoints for security issues"
"Help me implement user authentication"
"Debug my database connection problems"

# UEP will provide context-aware, structured guidance
```

### Workflow 2: Automated Agent Creation
```bash
# 1. Create PRD file: docs/prd_user-service.md
# 2. Enhanced PRD parser automatically processes it
# 3. TaskMaster creates research-backed task lists
# 4. Use enhanced scaffold generator to create agent
# 5. All steps include UEP context awareness
```

### Workflow 3: Project Health Check
```bash
# Use UEP to analyze your entire project
node dist/uep/cli.js --interactive false --format json \
  "Analyze my project structure and suggest improvements"

# UEP will scan codebase, check documentation, apply memory
```

---

## 💡 Pro Tips

1. **Use Interactive Mode** for development sessions
2. **Enable Debug Mode** when troubleshooting: `--log-level debug`
3. **Check Compliance Scores** to measure UEP effectiveness
4. **Monitor Agent Metrics** for performance insights
5. **Use JSON Format** for automation and integrations

**🎉 Your UEP system is ready! Start with the Quick Setup above.**