# 🚨 SOLAR LEAD SYSTEM - DEBUGGING GUIDE
**⚠️ READ THIS FIRST BEFORE DEBUGGING ANYTHING ⚠️**

---

## 🎯 THE 30-MINUTE RULE (SAVES YOUR LIFE)

### When You See TypeScript Parameter Errors:
```
"Argument of type 'string' is not assignable to parameter of type 'SomeObjectType'"
```

**IMMEDIATELY START 30-MINUTE TIMER**

1. ⏰ **Try obvious fixes for 30 minutes**:
   - Object vs string format
   - Different parameter structure
   - Check latest SDK docs

2. ⏰ **Timer goes off? STOP FIXING**

3. 🤔 **Ask: "What am I actually trying to achieve?"**

4. 🛤️ **Find alternative path to same result**

**Example**: Instead of fixing `runs.retrieve()`, just poll messages directly.

---

## 🚀 PROMPT FOR FASTEST WORKING SOLUTION

**Copy this to any helper/AI when debugging:**

```
This is a Next.js + OpenAI Assistants API project with n8n workflow integration. 

DEBUGGING RULES:
1. Always create /api/debug endpoints to test components in isolation
2. Trust the browser console errors - they show the exact failure point
3. Use direct fetch() calls to OpenAI API instead of the SDK (typing issues)
4. Check Vercel deployment protection (causes 401s) before debugging code
5. Test domain detection explicitly - Vercel preview URLs change frequently

WORKING PATTERNS:
- Domain: request.headers.get('x-vercel-deployment-url') || request.headers.get('host')
- OpenAI: Direct HTTP calls with Authorization Bearer headers
- Redis: Simple get/set with explicit error handling
- Errors: Return specific error messages, not generic ones

CODEBASE STRUCTURE:
- /api/chat - Main chat endpoint (expects assistantId, message, threadId)
- /api/company-assistant - Maps company slugs to assistant IDs via Redis
- /api/create-prototype - Creates new assistants and demos
- lib/domain-utils.ts - Domain detection utilities
- app/[company]/page.tsx - Frontend chat interface

COMMON FAILURES:
- 'Failed to check run status' = OpenAI SDK typing issue (use fetch instead)
- 401 Unauthorized = Vercel preview protection (not code issue)
- 'undefined threadId' = Frontend not persisting threadId between messages
- Assistant not found = Redis mapping missing or wrong company slug

TESTING APPROACH:
1. Test /api/debug first to verify infrastructure
2. Test specific assistant ID from Redis directly  
3. Test chat API with known good assistantId
4. Only then test full frontend flow

Always fix the ROOT CAUSE shown in console errors, not symptoms.
```

---

## 🔧 PATTERNS THAT WORK IN THIS CODEBASE

### ✅ Domain Detection (Vercel Preview URLs)
```javascript
const domain = request.headers.get('x-vercel-deployment-url') ||
               request.headers.get('x-vercel-forwarded-host') ||
               request.headers.get('host') ||
               process.env.VERCEL_URL;
```

### ✅ OpenAI API Calls (Avoid SDK Issues)
```javascript
// THIS WORKS
const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
  headers: { 
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'OpenAI-Beta': 'assistants=v1'
  }
});

// THIS BREAKS (typing issues)
await openai.beta.threads.runs.retrieve(threadId, runId);
```

### ✅ Error Handling (Be Specific)
```javascript
// Good - specific errors
if (!apiKey) return { error: 'Missing OpenAI API key' };
if (!threadId) return { error: 'Thread creation failed' };

// Bad - generic errors
return { error: 'Something went wrong' };
```

### ✅ Chat API Pattern (Skip Run Status)
```javascript
// Create run
const run = await openai.beta.threads.runs.create(threadId, { assistant_id });

// Poll messages directly (not run status)
while (attempts < 30) {
  const messages = await openai.beta.threads.messages.list(threadId);
  const newResponse = messages.data.find(msg => 
    msg.role === 'assistant' && 
    new Date(msg.created_at * 1000) > new Date(run.created_at * 1000)
  );
  if (newResponse) return newResponse;
  await sleep(1000);
}
```

---

## 🚨 ANTI-PATTERNS (AVOID THESE)

❌ **Complex utility functions that hide real errors**  
❌ **Fixing multiple things at once**  
❌ **Assuming infrastructure when it's actually code**  
❌ **Using SDK abstractions that have typing issues**  
❌ **Testing full flow before testing individual components**

---

## 🛠️ DEBUG WORKFLOW

### 1. Infrastructure Check
- Hit `/api/debug` first
- Verify OpenAI key, Redis, environment variables
- Check specific assistant ID exists

### 2. Isolate the Problem
- Create debug endpoints for each component
- Test with known good data
- Read exact console error messages

### 3. Quick Fixes First
- Check Vercel deployment protection (causes 401s)
- Verify domain detection on preview URLs
- Test with simple hard-coded values

### 4. If Still Broken → 30-Minute Rule
- Try obvious fixes for 30 minutes max
- Then find alternative approach
- Don't fight external API changes

---

## 🎯 COMMON ISSUES & SOLUTIONS

| Error | Root Cause | Solution |
|-------|------------|----------|
| `401 Unauthorized` | Vercel preview protection | Disable in Vercel settings |
| `Failed to check run status` | OpenAI SDK typing | Skip status, poll messages |
| `undefined threadId` | Frontend state issue | Check threadId persistence |
| `Assistant not found` | Redis mapping missing | Verify company slug correct |
| Domain issues | Hardcoded URLs | Use dynamic domain detection |

---

## 📋 TESTING CHECKLIST

Before declaring anything "fixed":

- [ ] Test `/api/debug` shows all green
- [ ] Test specific assistant ID works
- [ ] Test chat with known good data
- [ ] Test on actual Vercel preview URL
- [ ] Check browser console for errors
- [ ] Test thread persistence across messages

---

## ⚠️ CRITICAL REMINDERS

1. **READ THIS FILE BEFORE DEBUGGING ANYTHING**
2. **Console errors are gospel - don't guess**
3. **30-minute rule for external API issues**
4. **Test components in isolation first**
5. **Vercel preview protection causes mysterious 401s**
6. **When in doubt, create debug endpoints**

---

**Last Updated**: After the "Failed to check run status" marathon debugging session  
**Next Review**: When anything breaks again (check this file first!) 