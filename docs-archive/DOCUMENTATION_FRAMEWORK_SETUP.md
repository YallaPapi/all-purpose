# Documentation Framework Setup Guide

This guide walks you through setting up the proven documentation framework from the solar-lead-clean project. These 5 core documents form the backbone of enterprise-grade project management and development.

## 📋 Overview - The 5 Core Documents

1. **CHANGELOG.md** - Track all changes with semantic versioning
2. **ENVIRONMENT_SETUP.md** - Document all environment variables, API keys, and setup steps  
3. **DEBUGGING_GUIDE.md** - Systematic debugging patterns, 30-minute rule, common issues
4. **PARAMETER_MAPPING.md** - Master reference for all system integrations and variable mappings
5. **README-task-master.md** - TaskMaster workflow and command reference

---

## 1. CHANGELOG.md Setup

**Purpose**: Track all project changes following semantic versioning principles.

### Template Structure:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
### Changed  
### Deprecated
### Removed
### Fixed
### Security

## [1.0.0] - 2024-01-01

### Added
- Initial project setup
- Core functionality implementation
- Documentation framework

### Implementation Notes:
- Started tracking changes
- Established release process
```

### Best Practices:
- **ALWAYS update before each commit**
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Group changes by type (Added, Changed, Fixed, etc.)
- Include implementation impact notes
- Reference TaskMaster task IDs when relevant

---

## 2. ENVIRONMENT_SETUP.md Setup

**Purpose**: Complete guide for environment configuration, API keys, and deployment setup.

### Template Structure:
```markdown
# Environment Setup Guide

## Required Environment Variables

### Core Application
```bash
# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourapp.com
PROJECT_NAME=your-project-name
PROJECT_VERSION=1.0.0

# Database/Cache
REDIS_URL=your-redis-url
KV_REST_API_URL=your-upstash-url
KV_REST_API_TOKEN=your-upstash-token

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
PERPLEXITY_API_KEY=your-perplexity-key

# TaskMaster Configuration
MODEL=claude-3-opus-20240229
MAX_TOKENS=8192
TEMPERATURE=0.7
DEBUG=false
LOG_LEVEL=info
DEFAULT_SUBTASKS=5
DEFAULT_PRIORITY=medium
```

### Local Development Setup
1. Copy `.env.example` to `.env.local`
2. Fill in all required values
3. Run `npm install`
4. Test with `npm run dev`

### Production Deployment
- Set all environment variables in your hosting platform
- Verify Redis connectivity
- Test API integrations
- Monitor logs for initialization issues

### Security Notes
- Never commit `.env` files to git
- Use separate keys for development/production
- Rotate API keys regularly
- Monitor API usage and rate limits
```

### Implementation Checklist:
- [ ] List ALL environment variables used in project
- [ ] Document where to obtain each API key
- [ ] Include setup verification steps
- [ ] Add troubleshooting section for common issues
- [ ] Document deployment-specific configurations

---

## 3. DEBUGGING_GUIDE.md Setup

**Purpose**: Systematic approach to debugging with proven patterns and time-saving techniques.

### Template Structure:
```markdown
# Debugging Guide

## 🕒 The 30-Minute Rule
**If you're stuck on a bug for 30 minutes, STOP and follow this process:**

1. **Document the issue** (what you expected vs what happened)
2. **Check the basics** (environment, dependencies, API keys)
3. **Review recent changes** (git log, changelog)
4. **Ask for help** or **take a break**

This prevents endless debugging loops and maintains productivity.

## 🔍 Systematic Debugging Process

### Step 1: Issue Classification
- [ ] **Frontend Issue** (UI, user interactions)
- [ ] **Backend Issue** (API, server-side logic)  
- [ ] **Integration Issue** (external APIs, workflows)
- [ ] **Environment Issue** (configuration, deployment)
- [ ] **Data Issue** (database, cache, inconsistencies)

### Step 2: Data Collection
- Check browser console logs
- Review server logs  
- Examine network requests
- Verify environment variables
- Test API endpoints directly

### Step 3: Reproduce and Isolate
- Create minimal reproduction case
- Test in different environments
- Isolate the specific component/function
- Document exact steps to trigger issue

## 🚨 Common Issues & Solutions

### API Integration Issues
**Symptoms**: 401/403 errors, timeouts, malformed responses
**Check**: API keys, request format, rate limits, endpoint URLs
**Solution**: Verify parameter mapping, test with curl/Postman

### Environment Configuration
**Symptoms**: "Cannot find module", undefined variables
**Check**: .env files, environment variable names, spelling
**Solution**: Compare with ENVIRONMENT_SETUP.md, restart services

### Variable Mapping Issues  
**Symptoms**: Wrong data in UI, assistant responses incorrect
**Check**: PARAMETER_MAPPING.md for inconsistencies
**Solution**: Audit parameter flow, verify transformations

### TaskMaster Issues
**Symptoms**: Command failures, file not found errors
**Check**: Current directory, task file structure, dependencies
**Solution**: Run task-master validate, check README-task-master.md

## 🔧 Debugging Tools

### Local Development
- Browser DevTools (Network, Console, Application tabs)
- VS Code debugger with breakpoints
- Node.js debugging with --inspect flag
- Redis CLI for cache inspection

### Production
- Vercel function logs
- Upstash Redis monitoring
- OpenAI API usage dashboard
- Custom logging with structured data

## 📝 Issue Documentation Template

When reporting bugs, include:

```
**Issue Description:**
Brief description of the problem

**Expected Behavior:**
What should happen

**Actual Behavior:**  
What actually happens

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Environment:**
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 120]
- Node Version: [e.g., 18.17.0]
- Project Version: [e.g., 1.2.3]

**Additional Context:**
- Recent changes made
- Error messages (full stack trace)
- Screenshots if applicable
- Related TaskMaster task IDs
```

## ⚡ Quick Fixes Checklist

Before deep debugging, try these:
- [ ] Restart development server
- [ ] Clear browser cache
- [ ] Verify environment variables are loaded
- [ ] Check for typos in recent changes
- [ ] Test API endpoints independently
- [ ] Review recent git commits
- [ ] Check system resource usage
- [ ] Verify internet connectivity for external APIs
```

### Implementation Checklist:
- [ ] Customize common issues for your tech stack
- [ ] Add project-specific debugging commands
- [ ] Include screenshots of debugging tools setup
- [ ] Document your specific logging patterns
- [ ] Add emergency contact procedures

---

## 4. PARAMETER_MAPPING.md Setup

**Purpose**: Master reference ensuring all system components speak the same language.

### Template Structure:
```markdown
# System-Wide Parameter Mapping

## Overview
This document serves as the master reference for all variable names, data formats, and parameter mappings across system components. It prevents integration errors and ensures consistency.

## 🎯 Critical Integration Points

### Frontend ↔ Backend API
| Frontend Variable | API Parameter | Data Type | Required | Notes |
|------------------|---------------|-----------|----------|-------|
| companyName | companyName | string | Yes | Company identifier |
| contactEmail | contactEmail | string | Yes | Lead email address |
| contactName | contactName | string | Yes | Lead first name |
| location | location | string | No | "City, State" format |

### Backend ↔ External APIs
| Backend Field | External API | Parameter Name | Transformation | Notes |
|--------------|--------------|----------------|----------------|-------|
| organization_name | OpenAI Assistant | {{company}} | Direct mapping | Used in prompts |
| lead_email | N8N Workflow | lead_email | Direct mapping | Email processing |

### Database/Cache Patterns
| Entity | Redis Key Pattern | Data Type | Example |
|--------|------------------|-----------|---------|
| Company Assistant | `company:{slug}` | string | `company:tesla-energy` |
| User Session | `session:{userId}` | hash | `session:user_123` |

## 🔄 Data Transformations

### Location Field Processing
```javascript
// N8N sends combined field
location: "Austin, TX"

// Backend splits into components  
city: "Austin"
state: "TX"
```

### Name Field Normalization
```javascript
// Input variations
contactName: "John Smith" 
name: "John Smith"
first_name: "John"

// Standardized output
name: "John" (first name only for personalization)
```

## ⚠️ Known Inconsistencies

Document any temporary inconsistencies with resolution plans:

1. **Issue**: N8N workflow uses `jobTitle` but API expects `title`
   **Status**: Resolved in v1.2.0
   **Solution**: Backend now handles both formats

2. **Issue**: Date formats vary between components
   **Status**: In Progress  
   **Solution**: Standardizing on ISO 8601 format

## 🧪 Validation Tests

### Parameter Consistency Checks
- [ ] Frontend form data matches API expectations
- [ ] External API responses map correctly to internal format
- [ ] Database queries use correct field names
- [ ] Cache keys follow established patterns

### Integration Test Scenarios
1. **End-to-end data flow**: Form submission → API → Database → External API
2. **Error handling**: Invalid data formats, missing required fields
3. **Edge cases**: Special characters, long strings, null values

## 📋 Maintenance Checklist

- [ ] Update after any API changes
- [ ] Verify during integration testing
- [ ] Review monthly for inconsistencies
- [ ] Document new parameters immediately
- [ ] Cross-reference with code changes
```

### Implementation Checklist:
- [ ] Map ALL parameters between system components
- [ ] Document every data transformation
- [ ] Include examples for complex mappings
- [ ] Add validation test procedures
- [ ] Create update maintenance schedule

---

## 5. README-task-master.md Setup

**Purpose**: Complete reference for TaskMaster workflow and command usage.

### Template Structure:
```markdown
# TaskMaster Workflow Guide

## 🚀 Quick Start

### Initial Setup
```bash
# Install TaskMaster globally
npm install -g task-master-ai

# Initialize project
task-master init --name="project-name" --description="Project description"

# Parse requirements into tasks
task-master parse-prd --input="requirements.txt"
```

## 📋 Daily Workflow

### 1. Start Work Session
```bash
# See current project status
task-master list

# Get next task to work on
task-master next

# Break down complex tasks
task-master expand --id=5 --research
```

### 2. During Development
```bash
# Update task status
task-master set-status --id=5 --status=in-progress

# Add implementation notes
task-master update-subtask --id=5.2 --prompt="Implementation details..."

# Mark completed tasks
task-master set-status --id=5 --status=done
```

### 3. End of Session
```bash
# Generate task files
task-master generate

# Review progress
task-master list --status=done
```

## 🔧 Advanced Commands

### Task Management
```bash
# Add new task
task-master add-task --prompt="Description" --priority=high

# Update multiple tasks
task-master update --from=10 --prompt="Architecture change details"

# Remove unnecessary tasks
task-master remove-task --id=15 --yes
```

### Analysis & Reporting
```bash
# Analyze task complexity
task-master analyze-complexity --research

# View complexity report
task-master complexity-report

# Validate dependencies
task-master validate-dependencies
```

## 🎯 Best Practices

### Task Breakdown Strategy
- Use complexity analysis before expanding tasks
- Aim for 3-5 subtasks per main task
- Include test strategy in task details
- Document implementation decisions

### Status Management
- Use 'in-progress' sparingly (only current work)
- Mark tasks 'done' only after testing
- Use 'deferred' for postponed work
- Add 'blocked' status with dependency info

### Documentation Integration
- Reference TaskMaster IDs in git commits
- Update CHANGELOG.md with completed tasks
- Link task outcomes to DEBUGGING_GUIDE.md
- Update PARAMETER_MAPPING.md when tasks affect integrations

## 🔄 Integration with Other Tools

### Git Integration
```bash
# Reference tasks in commits
git commit -m "feat: Implement user auth (task #5)"

# Create feature branches
git checkout -b "task-5-user-authentication"
```

### Environment Variables
```bash
# Configure TaskMaster behavior
ANTHROPIC_API_KEY=your-key
PERPLEXITY_API_KEY=your-key  
MODEL=claude-3-opus-20240229
DEBUG=true
```

## 🚨 Troubleshooting

### Common Issues
- **Command not found**: Install globally with npm
- **API errors**: Check ANTHROPIC_API_KEY in environment
- **File not found**: Run from project root directory
- **Invalid JSON**: Run task-master validate-dependencies

### Emergency Recovery
```bash
# Reset corrupted task file
cp tasks/backup/tasks.json tasks/tasks.json

# Regenerate all task files
task-master generate --force
```
```

### Implementation Checklist:
- [ ] Customize commands for your project workflow
- [ ] Add project-specific task categories
- [ ] Document integration with your git workflow
- [ ] Include team collaboration guidelines
- [ ] Add backup and recovery procedures

---

## 🚀 Implementation Priority

### Phase 1 (Essential)
1. **CHANGELOG.md** - Start tracking changes immediately
2. **ENVIRONMENT_SETUP.md** - Critical for team onboarding
3. **README-task-master.md** - Essential for workflow adoption

### Phase 2 (System Maturity)  
4. **DEBUGGING_GUIDE.md** - As issues patterns emerge
5. **PARAMETER_MAPPING.md** - When integrations become complex

### Phase 3 (Continuous Improvement)
- Regular updates based on team feedback
- Integration with CI/CD processes
- Automation of documentation updates
- Team training and adoption monitoring

## ✅ Success Metrics

**Documentation Framework is working when:**
- New team members can set up environment in <30 minutes
- Debugging follows systematic process, not random trial-and-error
- Integration issues caught early through parameter mapping
- TaskMaster adoption reduces project management overhead
- Changelog provides clear project evolution story

---

**This framework transforms chaotic development into systematic, documented, and reproducible processes that scale with your team and project complexity.** 