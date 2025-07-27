# UEP Meta-Agent Factory - Complete Usage Guide

## 🏭 Overview

The UEP Meta-Agent Factory transforms Product Requirements Documents (PRDs) into complete working software projects automatically.

**Simple workflow**: 
```
PRD file → Factory → Complete Project
```

## 📋 Quick Start (30 seconds)

### 1. Create a PRD File
Create a file in `docs/` folder named `prd_your-project-name.md`:

```bash
# Example: docs/prd_task-manager.md
```

### 2. Write Your Requirements
Write what you want built in plain English:

```markdown
# Task Manager Application

Build a task management system with:
- User authentication 
- Create/edit/delete tasks
- Due date tracking
- Team collaboration
- Email notifications
- Mobile responsive design
```

### 3. Run the Factory
```bash
node autonomous-factory-simple.js --prd=task-manager.md
```

### 4. Get Your Project
```bash
cd generated/your-project-name
npm install
npm start
```

**That's it!** You now have a complete working project.

## 📂 File Naming Rules

PRD files **MUST** follow this naming pattern:
```
docs/prd_project-name.md
```

✅ **Correct Examples**:
- `docs/prd_task-manager.md`
- `docs/prd_monitoring-dashboard.md` 
- `docs/prd_lead-generation-system.md`

❌ **Wrong Examples**:
- `task-manager-prd.md` (wrong prefix)
- `docs/monitoring-dashboard.md` (missing prd_ prefix)
- `prd_task_manager.txt` (wrong extension)

## 🎯 Complete Commands Reference

### Essential Commands
```bash
# 1. List available PRDs
node autonomous-factory-simple.js

# 2. Build specific project (REQUIRED)
node autonomous-factory-simple.js --prd=monitoring-dashboard.md
node autonomous-factory-simple.js --prd=lead-generation-factory.md
node autonomous-factory-simple.js --prd=your-project.md

# 3. Show help
node autonomous-factory-simple.js --help
```

### TaskMaster Commands (Optional)
```bash
# View generated tasks after PRD parsing
task-master list

# Expand specific task into subtasks
task-master expand --id=150 --research

# View task details
task-master show 150
```

## 🔧 What The Factory Does

### Step 1: PRD Parsing
- Reads your PRD file from `docs/`
- Parses requirements using TaskMaster AI
- Generates 10-15 structured development tasks

### Step 2: Project Generation  
- Uses Scaffold Generator agent
- Creates complete project structure
- Generates 7+ working files in 4+ directories
- Includes package.json, tests, configs

### Step 3: Validation
- Verifies project structure is correct
- Checks package.json exists
- Confirms all files generated properly

## 📁 Output Structure

Generated projects include:
```
generated/your-project-name/
├── package.json          # Dependencies and scripts
├── main.js               # Entry point
├── README.md             # Project documentation
├── config/
│   └── default.json      # Configuration files
├── templates/            # Template files
├── tests/
│   └── *.test.js        # Test files
└── eslint.config.js     # Code quality config
```

## 🚀 Project Features

Every generated project includes:
- ✅ **Working CLI executable** (`npm start`)
- ✅ **Test suite** with Jest (`npm test`)
- ✅ **Linting** with ESLint (`npm run lint`)
- ✅ **Coverage reports** (`npm run test:coverage`)
- ✅ **Development mode** (`npm run dev`)
- ✅ **Node.js 18+ compatibility**

## 📝 PRD Writing Best Practices

### Good PRD Structure
```markdown
# Project Name

## Overview
Brief description of what you want built.

## Core Features
- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Technical Requirements
- Technology stack preferences
- Integration requirements
- Performance goals

## Success Criteria
- How you'll know it's working
- Key metrics or behaviors
```

### Example PRD Sections
```markdown
# E-commerce Platform

## Overview
Build a full-featured e-commerce platform for small businesses.

## Core Features
- Product catalog with search
- Shopping cart and checkout
- User accounts and profiles
- Order management system
- Payment processing integration
- Admin dashboard
- Email notifications

## Technical Requirements
- React frontend
- Node.js backend
- PostgreSQL database
- Stripe payment integration
- Mobile responsive design

## Success Criteria
- Users can browse and purchase products
- Admins can manage inventory
- Payment processing works reliably
- Site loads in under 3 seconds
```

## 🐛 Troubleshooting

### Common Issues

**Error: "No PRD files found"**
```bash
# Solution: Check file naming
ls docs/prd_*.md
# Should show your PRD files
```

**Error: "Agent directory already exists"**
```bash
# Solution: Remove existing generated project
rm -rf generated/your-project-name
# Then run factory again
```

**Error: "TaskMaster parsing failed"**
```bash
# Solution: Check PRD content is valid markdown
# Make sure file is saved with UTF-8 encoding
```

**Factory runs but no output**
```bash
# Check if generated folder exists
ls -la generated/
# Check TaskMaster tasks were created
cat .taskmaster/tasks/tasks.json
```

### Performance Issues

**Slow PRD parsing**
- PRDs with 1000+ words may take 30-60 seconds
- This is normal - TaskMaster is processing requirements

**Factory timeout**
- Large/complex PRDs may need 2-3 minutes
- Check terminal for progress messages

## 🔍 Validation

### How to verify your project works:
```bash
# 1. Check generated files
ls -la generated/your-project-name/

# 2. Verify package.json exists
cat generated/your-project-name/package.json

# 3. Install and test
cd generated/your-project-name
npm install
npm test
npm start
```

### Success indicators:
- ✅ Project directory created
- ✅ 7+ files generated  
- ✅ package.json with correct dependencies
- ✅ Tests run successfully
- ✅ Main executable works (`npm start`)

## 📊 Advanced Usage

### Multiple Projects
```bash
# Create multiple PRDs
docs/prd_project1.md
docs/prd_project2.md
docs/prd_project3.md

# Factory will use the first one found
# To build specific project, rename others temporarily
```

### Custom Configuration
Edit `autonomous-factory-simple.js` to customize:
- Output directory (default: `./generated`)
- Log level (default: `info`)
- Overwrite behavior (default: `true`)

### Integration with Existing Systems
Generated projects can be:
- Deployed to Vercel/Netlify
- Integrated with existing codebases
- Extended with additional features
- Used as starting templates

## 💡 Tips and Tricks

### Writing Better PRDs
1. **Be specific** - "User authentication" vs "JWT-based auth with password reset"
2. **Include examples** - Show what the end result should look like
3. **Mention integrations** - APIs, databases, external services
4. **Define success** - How will you know it's working?

### Factory Optimization
1. **Keep PRDs focused** - 1 project per PRD works best
2. **Use descriptive names** - Project names become directory names
3. **Test incrementally** - Build simple projects first

### Development Workflow
```bash
# 1. Write PRD
vim docs/prd_my-app.md

# 2. Generate project
node autonomous-factory-simple.js

# 3. Develop and test
cd generated/my-app
npm install
npm run dev

# 4. Iterate
# Edit PRD, regenerate, repeat
```

## 🏆 Success Examples

Projects successfully built with the factory:
- ✅ Task management applications
- ✅ Monitoring dashboards  
- ✅ Lead generation systems
- ✅ E-commerce platforms
- ✅ Content management systems
- ✅ API gateways
- ✅ Data processing pipelines

## 📞 Getting Help

### Debug Mode
```bash
# Enable debug output
DEBUG=true node autonomous-factory-simple.js
```

### Log Files
Check these files for detailed logs:
- `.taskmaster/tasks/tasks.json` - Generated tasks
- `rag-system/logs/combined.log` - System logs

### Common Questions

**Q: Can I edit generated projects?**
A: Yes! Generated projects are fully editable starting points.

**Q: How do I add new features?**
A: Edit the PRD and regenerate, or modify the generated code directly.

**Q: Can I use TypeScript?**
A: Yes, mention TypeScript in your PRD requirements.

**Q: What about databases?**
A: Specify database requirements in your PRD (PostgreSQL, MongoDB, etc.)

---

**🎉 You're ready to build anything with the UEP Meta-Agent Factory!**

Create your PRD, run the factory, get working software. It's that simple.