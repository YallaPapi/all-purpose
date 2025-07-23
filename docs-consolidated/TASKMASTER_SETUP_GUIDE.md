# TaskMaster Complete Setup Guide
*Updated with PROVEN working solutions for both Cursor MCP and CLI usage*

## Overview
TaskMaster provides AI-powered project management in two modes:
1. **MCP Server** - For Cursor IDE integration
2. **CLI Tool** - For terminal/command line usage (including Claude Code)

## 🚨 CRITICAL: Two Different Packages
**This is the KEY issue that causes confusion:**

- `task-master-ai` = MCP server ONLY (for Cursor)
- `claude-task-master` = CLI tool (for terminal/Claude Code)

**Most setup problems come from using the wrong package for your environment.**

---

## Method 1: Cursor MCP Integration

### Prerequisites
- **ANTHROPIC_API_KEY** (Required) - Your Claude API key
- **PERPLEXITY_API_KEY** (Optional but recommended) - For research features

### Step 1: Configure MCP in Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
	"mcpServers": {
		"taskmaster-ai": {
			"command": "npx",
			"args": ["-y", "task-master-mcp"],
			"env": {
				"ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
				"PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}",
				"MODEL": "claude-3-7-sonnet-20250219",
				"PERPLEXITY_MODEL": "sonar-pro",
				"MAX_TOKENS": "64000",
				"TEMPERATURE": "0.2",
				"DEFAULT_SUBTASKS": "5",
				"DEFAULT_PRIORITY": "medium"
			}
		}
	}
}
```

### Step 2: Restart Cursor
1. **Completely close Cursor**
2. **Reopen Cursor**
3. **Wait 30-60 seconds** for MCP to initialize

### Step 3: Verify MCP Installation
In Cursor's chat, you should see TaskMaster tools available:
- `mcp_taskmaster-ai_initialize_project`
- `mcp_taskmaster-ai_get_tasks`  
- `mcp_taskmaster-ai_parse_prd`

---

## Method 2: CLI Tool (Terminal/Claude Code)

### Step 1: Install CLI Package
```bash
npm install -g claude-task-master
```

**CRITICAL:** Use `claude-task-master` NOT `task-master-ai`

### Step 2: Set Environment Variables

**Option A: Export in terminal session**
```bash
export ANTHROPIC_API_KEY="your-anthropic-key-here"
export PERPLEXITY_API_KEY="your-perplexity-key-here"
```

**Option B: Add to your shell profile (.bashrc, .zshrc, etc.)**
```bash
echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.bashrc
echo 'export PERPLEXITY_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc
```

**Option C: Windows System Environment Variables**
1. System Properties → Environment Variables
2. Add ANTHROPIC_API_KEY and PERPLEXITY_API_KEY
3. Restart terminal

### Step 3: Verify CLI Installation
```bash
task-master --help
```

You should see the full TaskMaster CLI help with all commands.

### Step 4: Test CLI Functionality
```bash
# Test basic functionality
task-master list

# Test API connectivity
task-master models
```

---

## Common Setup Issues & Solutions

### Issue 1: "MCP session missing required sampling capabilities"
**Cause:** Using `task-master-ai` package in CLI mode
**Solution:** This error means you're trying to use the MCP package as CLI tool
- For Cursor: Use `task-master-mcp` in MCP config
- For CLI: Install `claude-task-master` instead

### Issue 2: "Command not found: task-master"
**Cause:** CLI package not installed or wrong package name
**Solution:** 
```bash
npm install -g claude-task-master
# NOT: npm install -g task-master-ai
```

### Issue 3: "API key not configured"
**Cause:** Environment variables not set or accessible
**Solution:** 
1. Set environment variables properly
2. Test with: `echo $ANTHROPIC_API_KEY`
3. Restart terminal after setting

### Issue 4: "No TaskMaster tools in Cursor"
**Cause:** MCP server not connecting
**Solution:**
1. Check `.cursor/mcp.json` syntax is valid JSON
2. Use `task-master-mcp` in args (not `task-master-ai`)
3. Restart Cursor completely
4. Wait 60 seconds for initialization

---

## Usage Examples

### CLI Workflow
```bash
# Set environment variables
export ANTHROPIC_API_KEY="your-key"
export PERPLEXITY_API_KEY="your-key"

# Parse a PRD with research
task-master parse-prd --input="docs/requirements.txt" --research

# List all tasks
task-master list

# Analyze complexity with research
task-master analyze-complexity --research

# Expand complex tasks
task-master expand --id=5 --research

# Show next task to work on
task-master next
```

### Cursor MCP Workflow
In Cursor chat:
```
Initialize TaskMaster in this project
Parse the PRD and create tasks with research
Analyze task complexity with research
Expand all tasks into subtasks
Show me the next task to work on
```

---

## Troubleshooting Checklist

### For Cursor MCP:
- [ ] `.cursor/mcp.json` exists and has valid JSON
- [ ] Uses `task-master-mcp` in args (not `task-master-ai`)
- [ ] ANTHROPIC_API_KEY is set in environment
- [ ] Cursor was restarted after config changes  
- [ ] TaskMaster tools appear in Cursor's tool list
- [ ] `.taskmaster/` directory was created after initialization

### For CLI:
- [ ] `claude-task-master` package installed globally
- [ ] Environment variables set and accessible
- [ ] `task-master --help` shows full command list
- [ ] `task-master models` connects to AI services
- [ ] Terminal has proper permissions

---

## The KEY Insight

**The confusion happens because there are TWO separate packages:**

1. **For Cursor (MCP):** Uses `task-master-mcp` package
2. **For Terminal (CLI):** Uses `claude-task-master` package

**The `task-master-ai` package is ONLY an MCP server and will ALWAYS show those JSON error messages when used in CLI mode.**

Once you use the right package for your environment, TaskMaster works perfectly with all its AI-powered features including research-backed task generation.

---

## Verified Working Commands

### CLI (Terminal/Claude Code)
```bash
# Install
npm install -g claude-task-master

# Basic usage
task-master parse-prd --input="file.txt" --research
task-master list
task-master next
task-master analyze-complexity --research
```

### MCP (Cursor)
```json
{
  "mcpServers": {
    "taskmaster-ai": {
      "command": "npx",
      "args": ["-y", "task-master-mcp"]
    }
  }
}
```

This guide represents the definitive solution to TaskMaster setup issues that have been plaguing users. The key is understanding you need different packages for different environments.