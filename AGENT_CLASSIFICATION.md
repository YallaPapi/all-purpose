# AGENT CLASSIFICATION ANALYSIS

Based on start-all-agents.js output:

## CLI TOOL AGENTS (show help and exit):
- Template Engine Factory Agent (exit code 1, shows help)
- Parameter Flow Agent (exit code 1, shows help) 
- Thirty Minute Rule Agent (exit code 1, shows help)
- Vercel Native Architecture Agent (has dependency/build issues)

## TASK-RUNNER AGENTS (complete task and exit):
- All-Purpose Pattern Agent (runs pattern detection, exits code 0)
- PRD Parser Agent (loads env, exits code 0)
- Scaffold Generator Agent (shows 'development in progress', exits code 0)
- Five Document Framework Agent (exits code 0)
- Infrastructure Orchestrator Agent (exits code 0)

## DISCOVERY:
The agents are designed as COMMAND-LINE TOOLS that expect arguments, not long-running services\!

## SOLUTION NEEDED:
Redesign start-all-agents.js to:
1. Pass appropriate commands to CLI agents
2. Run task-runner agents with specific tasks  
3. Set up proper coordination between agents

