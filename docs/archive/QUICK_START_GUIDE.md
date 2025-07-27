# Quick Start Guide - Meta-Agent Factory
*The essential commands that should have been documented from day one*

## The One Command That Works

```bash
# Go to project root and run this:
node start-all-agents.js
```

**That's it.** This starts all 9 meta-agents with proper coordination and monitoring.

---

## What You Get

- **Dashboard**: http://localhost:3000/admin/observability
- **API Test**: http://localhost:3000/admin/test-api  
- **Working Dashboard**: http://localhost:3000/admin/observability/working
- **Real-time logs** showing all meta-agent activity
- **Automatic project generation** when you submit requests

---

## To Generate a Project

1. **Start the system**: `node start-all-agents.js`
2. **Submit a request** to the Meta-Agent Factory UI or API
3. **Watch the logs** to see agents coordinating
4. **Check `/generated`** directory for output

---

## Known Working Examples

- **YouTube/GitHub System**: Generated successfully using this exact process
- **Prospector Agent**: Ready to generate with existing config

---

## Troubleshooting

- **Redis errors**: Make sure `.env.local` has Redis credentials
- **Build failures**: Individual agents may fail but system continues
- **No output**: Check the observability dashboard for agent status

---

## The Meta-Agents

1. **All-Purpose Pattern Agent** - Removes hardcoded limitations
2. **PRD Parser Agent** - Converts requirements to structured tasks  
3. **Scaffold Generator Agent** - Creates project structure
4. **Five Document Framework Agent** - Generates documentation
5. **Template Engine Factory Agent** - Creates boilerplate code
6. **Parameter Flow Agent** - Connects data systems
7. **Thirty Minute Rule Agent** - Validates task complexity
8. **Vercel Native Architecture Agent** - Setup deployment
9. **Infrastructure Orchestrator Agent** - Coordinates everything

**This information should have been the first thing documented.**