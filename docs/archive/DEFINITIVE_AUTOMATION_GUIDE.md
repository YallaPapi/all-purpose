# DEFINITIVE AUTOMATION GUIDE
## From Research Document → Finished Application (Zero Manual Work)

**This is the ONLY guide you need. Follow these exact steps. No improvisation.**

---

## 📋 PHASE 1: INPUT PREPARATION

### Step 1: Prepare Research Document
- ✅ **Location**: Place research file anywhere (e.g., `Lead Gen Research.txt`)
- ✅ **Content**: Raw research, tactics, strategies (any format)
- ✅ **Size**: Any size (current: 47,490 words)

### Step 2: Create PRD From Research
**Option A: Manual PRD Creation**
- Create file: `docs/prd_[project-name].md`
- Must follow naming pattern: `prd_*.md`
- Include: Vision, requirements, technical specs
- Current example: `docs/prd_lead-generation-factory.md` ✅

**Option B: Auto-Generated PRD**
- Use: `task-master parse-prd docs/research-document.txt`
- Output: Automatically creates structured PRD
- Result: PRD file ready for processing

---

## 🚀 PHASE 2: SYSTEM ACTIVATION

### Step 3: Start All Meta-Agents
```bash
# THE ONLY COMMAND NEEDED
node start-all-agents.cjs
```

**Expected Output:**
```
🎉 ALL SYSTEMS OPERATIONAL!
📱 Dashboard: http://localhost:3000/admin/observability
🔍 API Test: http://localhost:3000/admin/test-api
📊 Working Dashboard: http://localhost:3000/admin/observability/working
```

**What Happens Automatically:**
1. **PRD Parser Agent** watches `docs/` folder
2. Detects any `prd_*.md` files
3. Auto-generates TaskMaster tasks
4. **9 Meta-Agents** coordinate via UEP
5. **5 Domain-Specific Agents** assist in building

---

## 🔄 PHASE 3: AUTOMATIC PROCESSING

### Step 4: PRD Parser Processing (AUTOMATIC)
- **Trigger**: PRD file created/modified in `docs/`
- **Process**: Converts PRD → TaskMaster tasks
- **Output**: `.taskmaster/tasks/tasks.json` updated
- **Duration**: 30-60 seconds
- **Verification**: `task-master list` shows new tasks

### Step 5: TaskMaster Coordination (AUTOMATIC)
- **Tasks Created**: All project tasks with dependencies
- **Status Tracking**: pending → in-progress → done
- **Current Example**: Tasks 21-32 for Lead Gen Factory
- **Verification**: `task-master next` shows active task

### Step 6: Meta-Agent Factory Execution (AUTOMATIC)
**Agent Coordination:**
1. **Scaffold Generator** → Creates project structure
2. **Template Engine Factory** → Generates boilerplate code
3. **All-Purpose Pattern** → Removes hardcoded limitations
4. **Parameter Flow** → Connects data systems
5. **Five Document Framework** → Creates documentation
6. **Thirty Minute Rule** → Validates complexity
7. **Vercel Native Architecture** → Sets up deployment
8. **Infrastructure Orchestrator** → Coordinates everything
9. **PRD Parser** → Manages requirements

**Domain Agents Support:**
- **Backend Agent** → API design, database, security
- **Frontend Agent** → UI components, styling
- **DevOps Agent** → Deployment, monitoring
- **QA Agent** → Testing, validation
- **Documentation Agent** → Technical writing

---

## 📂 PHASE 4: OUTPUT GENERATION

### Step 7: Generated Project Structure (AUTOMATIC)
**Expected Output Location:**
```
generated/
└── [project-name]/
    ├── src/
    ├── package.json
    ├── README.md
    ├── tests/
    └── [all project files]
```

**For Lead Gen Factory Example:**
```
generated/
└── lead-generation-factory/
    ├── agents/
    │   ├── stealth-outreach-agent/
    │   ├── intelligence-gathering-agent/
    │   ├── personalization-engine-agent/
    │   ├── psychology-mapping-agent/
    │   ├── conversion-optimization-agent/
    │   └── compliance-manager-agent/
    ├── factories/
    │   └── LeadGenFactory.js
    ├── coordination/
    │   └── UEPCoordination.js
    └── integration/
        └── RAGIntegration.js
```

### Step 8: TaskMaster Completion (AUTOMATIC)
- **Progress Tracking**: All tasks move to "done" status
- **Verification**: `task-master list` shows 100% completion
- **Final Status**: All dependencies resolved
- **Duration**: 15-45 minutes depending on complexity

---

## ✅ PHASE 5: VERIFICATION

### Step 9: Confirm Generation Success
**Check Generated Files:**
```bash
ls generated/[project-name]/
```

**Verify TaskMaster Completion:**
```bash
task-master list
# Should show all tasks as "done"
```

**Test Generated Application:**
```bash
cd generated/[project-name]/
npm install
npm start
```

### Step 10: Access Running Application
- **Development**: Usually `http://localhost:3000`
- **Admin Dashboard**: `http://localhost:3000/admin`
- **API Endpoints**: Check generated documentation
- **Observability**: Monitor via dashboard

---

## 🚨 TROUBLESHOOTING

### Common Issues & Solutions

**Issue: "No PRD files detected"**
- ✅ **Fix**: Ensure file named `prd_*.md` in `docs/` folder
- ✅ **Example**: `docs/prd_my-project.md` ✓ | `docs/my-project.md` ✗

**Issue: "Tasks not generated"**
- ✅ **Fix**: Check `.taskmaster/tasks/tasks.json` exists
- ✅ **Command**: `task-master list` to verify

**Issue: "Meta-Agents not starting"**
- ✅ **Fix**: ES module errors - use `start-all-agents.cjs`
- ✅ **Backup**: Individual agent startup if needed

**Issue: "No output generated"**
- ✅ **Check**: `generated/` directory for project folder
- ✅ **Verify**: TaskMaster tasks completion status
- ✅ **Monitor**: Observability dashboard for agent status

---

## 📊 SUCCESS CRITERIA

### ✅ System Working When:
1. **PRD Parser**: Automatically detects and processes PRD files
2. **TaskMaster**: Shows structured tasks with dependencies
3. **Meta-Agents**: Coordinate via UEP successfully
4. **Generated Output**: Project appears in `generated/` folder
5. **Application**: Runs successfully after `npm install && npm start`

### ✅ Lead Gen Factory Specific Success:
1. **6 Specialized Agents**: All generated and functional
2. **Factory Pattern**: Inherits from Meta-Agent Factory
3. **UEP Coordination**: <2s response times between agents
4. **RAG Integration**: Access to 47,490 words of research
5. **Stealth Capabilities**: Anti-detection systems operational

---

## 🎯 COMPLETE WORKFLOW SUMMARY

```
Research Document → PRD File (docs/prd_*.md) → 
PRD Parser (AUTO) → TaskMaster Tasks (AUTO) → 
Meta-Agent Coordination (AUTO) → Domain Agent Support (AUTO) → 
Generated Application (generated/project-name/) → 
Working Software (npm start)
```

**Total Time**: 15-45 minutes
**Human Input Required**: Create PRD file, run one command
**Everything Else**: Fully automated via Meta-Agent Factory

---

**THIS IS THE DEFINITIVE PROCESS. NO EXCEPTIONS. NO MANUAL WORK.**