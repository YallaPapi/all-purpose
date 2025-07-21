# TaskMaster-AI Setup Guide for Cursor
*Based on real implementation experience*

## Overview
TaskMaster-AI is an MCP (Model Context Protocol) server that provides AI-powered project management directly in Cursor. This guide shows you exactly how to set it up based on successful implementation.

## Prerequisites

### 1. Required API Keys
You **MUST** have these API keys:
- **ANTHROPIC_API_KEY** (Required) - Your Claude API key
- **PERPLEXITY_API_KEY** (Optional but recommended) - For research features

### 2. Environment Setup
Create or update your environment variables. You can set these:
- In Windows: System Properties → Environment Variables  
- In `.env` file in your project root
- Directly in Cursor's MCP configuration

## Step-by-Step Setup

### Step 1: Configure MCP in Cursor

Create or edit `.cursor/mcp.json` in your project root:

```json
{
	"mcpServers": {
		"task-master-ai": {
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

**Critical Notes:**
- The `"task-master-ai"` name is what you'll see in Cursor's MCP tools
- `"npx -y task-master-mcp"` downloads and runs the latest version automatically
- API keys use `${API_KEY_NAME}` syntax to reference environment variables

### Step 2: Restart Cursor
After creating/modifying `.cursor/mcp.json`:
1. **Completely close Cursor**
2. **Reopen Cursor**
3. **Wait 30-60 seconds** for MCP to initialize

### Step 3: Verify Installation
In Cursor's chat, you should see TaskMaster tools available:
- `mcp_taskmaster-ai_initialize_project`
- `mcp_taskmaster-ai_get_tasks`  
- `mcp_taskmaster-ai_parse_prd`
- And many others...

If you don't see these tools, the MCP server isn't working.

### Step 4: Initialize Your Project

Run this in Cursor chat:
```
Initialize TaskMaster in this project
```

Or use the tool directly. This creates:
- `.taskmaster/` directory
- `config.json` with your settings
- `docs/`, `tasks/`, `reports/` subdirectories
- `state.json` for tracking

### Step 5: Create Your First Tasks

**Option A: Use a PRD (Recommended)**
1. Create `.taskmaster/docs/prd.txt` with your project requirements
2. Ask Cursor to parse it: "Parse the PRD and create tasks"
3. This generates tasks.json with AI-analyzed tasks

**Option B: Manual Task Creation**
Ask Cursor to add tasks individually using the add-task tool.

## Directory Structure (After Setup)
```
your-project/
├── .cursor/
│   └── mcp.json                 ← MCP configuration
├── .taskmaster/
│   ├── config.json             ← TaskMaster settings  
│   ├── state.json              ← Current state
│   ├── docs/
│   │   └── prd.txt             ← Your project requirements
│   ├── tasks/
│   │   └── tasks.json          ← All your tasks
│   └── reports/                ← Analysis reports
└── ... (your project files)
```

## Common Issues & Solutions

### Issue 1: "No TaskMaster tools showing in Cursor"
**Cause:** MCP server not connecting
**Fix:** 
1. Check `.cursor/mcp.json` syntax is valid JSON
2. Verify API keys are set in environment
3. Restart Cursor completely
4. Wait 60 seconds for initialization

### Issue 2: "API key not found" errors  
**Cause:** Environment variables not accessible
**Fix:**
1. Set ANTHROPIC_API_KEY in system environment variables
2. Or add to project `.env` file
3. Restart Cursor after setting keys

### Issue 3: "task-master-mcp not found"
**Cause:** NPX can't download the package
**Fix:**
1. Check internet connection
2. Try running `npx task-master-mcp` manually in terminal
3. If persistent, install globally: `npm install -g task-master-mcp`

### Issue 4: Tasks not saving/loading
**Cause:** File permissions or directory issues
**Fix:**
1. Ensure `.taskmaster/` directory is writable
2. Check if tasks.json exists and has valid JSON
3. Re-initialize the project if needed

## Features You Get

### Core Task Management
- Create and manage tasks with dependencies
- Break down complex tasks into subtasks  
- Track progress and status
- Generate detailed reports

### AI-Powered Features  
- Parse PRDs into structured tasks
- Complexity analysis using AI research
- Automatic task expansion based on complexity
- Research-backed task updates

### Advanced Workflow
- Tag-based task organization
- Multi-industry template support
- Dependency validation and fixing
- Integration with development workflow

## Pro Tips

1. **Always set both API keys** - Perplexity makes task analysis much better
2. **Use PRDs** - Much better than manual task creation  
3. **Restart Cursor after config changes** - MCP needs a restart to reload
4. **Check the tools list** - If TaskMaster tools aren't showing, something's wrong
5. **Use research flag** - Add `--research` to get better AI analysis

## Example Workflow

1. Create `.cursor/mcp.json` with API keys
2. Restart Cursor
3. Initialize project: "Initialize TaskMaster in this project"  
4. Create PRD: Write your requirements in `.taskmaster/docs/prd.txt`
5. Generate tasks: "Parse the PRD and create tasks"
6. Analyze complexity: "Analyze task complexity with research"
7. Expand tasks: "Expand all tasks into subtasks"
8. Start working: "Show me the next task to work on"

This setup has been tested and works reliably. The key is getting the MCP configuration right and having valid API keys.

## Troubleshooting Checklist

- [ ] `.cursor/mcp.json` exists and has valid JSON
- [ ] ANTHROPIC_API_KEY is set in environment
- [ ] Cursor was restarted after config changes  
- [ ] TaskMaster tools appear in Cursor's tool list
- [ ] `.taskmaster/` directory was created after initialization
- [ ] `tasks.json` contains your project tasks

If all boxes are checked, TaskMaster should be working perfectly. 