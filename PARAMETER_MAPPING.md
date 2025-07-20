# 🔗 SYSTEM-WIDE PARAMETER MAPPING DOCUMENTATION

> **Master reference for all variables, parameters, and data formats across all system components**  
> **Last Updated**: {DATE}  
> **Status**: 🚧 In Progress

---

## 📋 TABLE OF CONTENTS

1. [Frontend API Calls](#frontend-api-calls)
2. [Backend API Endpoints](#backend-api-endpoints)
3. [N8N Workflow Parameters](#n8n-workflow-parameters)
4. [OpenAI Assistant API](#openai-assistant-api)
5. [Redis Storage](#redis-storage)
6. [Environment Variables](#environment-variables)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Known Issues & Discrepancies](#known-issues--discrepancies)

---

## 🌐 FRONTEND API CALLS

### `/api/chat` - Chat Communication
**File**: `app/[company]/page.tsx`

#### Call #1: Initialize Chat
```typescript
// Lines 50-61
await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '',           // Empty string for initialization
    threadId: null,        // null for new thread
    company: company,      // string from URL params
    initialize: true       // boolean flag
  })
});
```

#### Call #2: Send Message
```typescript
// Lines 108-119
await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: inputMessage.trim(),  // string - user message
    threadId: threadId,           // string - existing thread
    company: company              // string from URL params
  })
});
```

**Expected Response Format**:
```typescript
{
  success: boolean,
  message: string,     // AI response
  threadId: string     // Thread ID for persistence
}
```

---

## 🔧 BACKEND API ENDPOINTS

### `/api/chat` - POST
**File**: `app/api/chat/route.tsx`

#### Expected Parameters:
```typescript
{
  assistantId?: string,    // Direct assistant ID (optional)
  message?: string,        // User message (optional for init)
  threadId?: string,       // OpenAI thread ID (optional)
  company?: string,        // Company slug for Redis lookup
  initialize?: boolean     // Flag for first message
}
```

#### Internal Processing:
1. **Assistant ID Resolution**:
   - If `assistantId` provided → use directly
   - If `company` provided → lookup from Redis: `company:${company}`
   - Fallback → error

2. **Thread Management**:
   - If `threadId` provided → use existing
   - If null/undefined → create new thread

3. **Message Handling**:
   - If `initialize: true` → skip user message addition
   - Otherwise → add user message to thread

#### Response Format:
```typescript
{
  success: boolean,
  message: string,      // AI assistant response
  threadId: string      // Thread ID
}
```

### `/api/create-prototype` - POST
**File**: `app/api/create-prototype/route.tsx`

#### Expected Parameters (N8N Format):
```typescript
{
  // Lead Information
  name?: string,                    // Lead first name
  lead_email?: string,             // Lead email
  organization_name?: string,       // Company name
  title?: string,                  // Lead job title
  city?: string,                   // Lead city
  state?: string,                  // Lead state
  organization_short_description?: string,
  industry?: string,
  
  // Alternative Format (current test format)
  contactName?: string,            // Alternative to 'name'
  contactEmail?: string,           // Alternative to 'lead_email'
  companyName?: string,            // Alternative to 'organization_name'
  location?: string,               // "City, State" format
  
  // Client Information
  client_company_name?: string,    // Default: 'Solar Bookers'
  client_website?: string,         // Default: 'https://solarbookers.com'
  service_type?: string            // Default: 'Solar installation...'
}
```

#### Internal Processing:
1. **Parameter Normalization**:
   ```typescript
   name = body.name || (body.contactName || 'Prospect').split(' ')[0];
   email = body.lead_email || body.email || body.contactEmail || '';
   organization_name = body.organization_name || body.companyName || '';
   // ... etc
   ```

2. **Company Slug Generation**:
   ```typescript
   function createCompanySlug(companyName: string): string {
     return (companyName || 'demo').toLowerCase()
       .replace(/\b(llc|inc|corp|ltd|co)\b/g, '')
       .replace(/[^a-z0-9\s-]/g, '')
       .replace(/\s+/g, '-')
       .replace(/-+/g, '-')
       .replace(/^-|-$/g, '');
   }
   ```

3. **Calendar Link Generation**:
   ```typescript
   const dynamicCalendarLink = `https://calendly.com/${companySlug}`;
   ```

#### OpenAI Assistant Creation Parameters:
```typescript
{
  name: `${organization_name} Solar Assistant`,
  instructions: `Complex prompt with variables:
    - Name: ${name}
    - Company: ${organization_name}
    - Title: ${title}
    - Location: ${city}, ${state}
    - FIRST Message: "It's Sarah from ${client_company_name} here..."
  `,
  model: "gpt-4-1106-preview",
  tools: [{ type: "code_interpreter" }]
}
```

#### Response Format:
```typescript
{
  success: boolean,
  assistantId: string,
  url: string,              // Demo URL (N8N expects this field)
  demoUrl: string,          // Backward compatibility
  companySlug: string,
  calendarLink: string,
  message: string
}
```

### `/api/company-assistant` - GET/POST
**File**: `app/api/company-assistant/route.tsx`

#### GET - Retrieve Assistant ID:
**Query Parameters**:
```typescript
?company=string  // Company slug
```

**Response**:
```typescript
{
  success: boolean,
  assistantId: string
}
```

#### POST - Store Assistant ID:
**Body Parameters**:
```typescript
{
  companySlug: string,
  assistantId: string
}
```

### `/api/debug` - GET
**File**: `app/api/debug/route.tsx`

#### Query Parameters:
```typescript
?action=string  // Optional: 'redis', 'openai', 'environment', 'urlGeneration', 'companies'
```

#### Response Format:
```typescript
{
  status: string,
  timestamp: string,
  checks: {
    openai: boolean,
    redis: boolean,
    environment: boolean,
    // ... other checks
  },
  details: object  // Varies by action
}
```

---

## 🔄 N8N WORKFLOW PARAMETERS

### Workflow File: `AI SDR (direct approach)(3).json`

#### 1. Webhook Input (Incoming Lead Data):
```typescript
{
  // Webhook: database-reactivation-webhook
  name: string,                    // Lead full name
  lead_email: string,             // Lead email address
  organization_name: string,       // Company name
  title?: string,                 // Job title
  city?: string,                  // Lead city
  state?: string,                 // Lead state
  organization_short_description?: string,
  industry?: string,
  email_account?: string,         // Sending email account
  reply_text?: string,           // Lead's reply text
  email_id?: string,             // Email thread ID
  reply_subject?: string         // Email subject
}
```

#### 2. Data Passthrough Node Transformations:
```javascript
// Node: "Data passthrough"
// Extracts and normalizes data from webhook body
{
  // Input processing:
  companyName: data.organization_name || '',
  firstName: (data.name || 'there').split(' ')[0],
  leadEmail: data.lead_email || '',
  eaccount: data.email_account || '',
  replyText: data.reply_text || '',
  
  // Slug generation for demo URL:
  demoSlug: companyName.toLowerCase()
    .replace(/\b(llc|inc|corp|ltd|co)\b/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, ''),
  
  // Output format:
  lead_email: string,
  clean_lead_reply_text: string,  // Cleaned reply text
  first_name: string,
  organization_name: string,
  eaccount: string,
  sendingaccountfirstname: string,
  demo_url: string,              // Provisional demo URL
  execution_log: string[]
}
```

#### 3. OpenAI Assistant Call:
```typescript
// Node: "Qualify lead"
// Assistant ID: asst_Mg778qKZlXbo7jARcq4ppSv6
{
  assistantId: "asst_Mg778qKZlXbo7jARcq4ppSv6",
  prompt: `Complex prompt with variables:
    - First Name: {{$json.first_name}}
    - Title: {{$json.title}}
    - Company: {{$json.organization_name}}
    - Description: {{$json.organization_short_description}}
    - Industry: {{$json.industry}}
    - City: {{$json.city}}, {{$json.state}}
    - Lead's Message: {{$json.clean_lead_reply_text}}
    - Demo URL: {{$json.demo_url}}
  `,
  
  // Expected response format:
  output: {
    interested: "YES" | "NO",
    message: string
  }
}
```

#### 4. Demo Creation API Call:
```javascript
// Node: "Build Instantly payload"
// Conditional API call if lead is interested
{
  method: 'POST',
  url: 'https://solarbookers.com/api/create-prototype',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  body: {
    companyName: companyName,      // Mapped from organization_name
    location: `${city}, ${state}`, // Combined from city/state
    contactEmail: leadEmail,       // Mapped from lead_email
    contactName: contactName,      // Mapped from first_name
    title: jobTitle               // Mapped from title
  }
}
```

#### 5. API Response Processing:
```typescript
// Expected response from create-prototype:
{
  success: boolean,
  url: string,              // CRITICAL: N8N looks for 'url' field
  assistantId: string,
  calendarLink: string
}

// Error handling:
// If API fails, generates fallback URL:
// `https://solarbookers.com/${demoSlug}`
```

#### 6. Email Composition:
```typescript
// Node: "Build Instantly payload" output
{
  eaccount: string,           // Sending email account
  reply_to_uuid: string,      // Email thread ID
  subject: string,            // Email subject
  to_address_email_list: string, // Lead email
  body: {
    html: string,             // HTML email content + demo link
    text: string              // Plain text version
  },
  workflow_meta: {
    lead_qualified: boolean,
    demo_attempted: boolean,
    demo_created: boolean,
    demo_url: string,
    company_name: string,
    execution_logs: string[]
  }
}
```

#### 7. Instantly.ai API Call:
```typescript
// Node: "Send via Instantly1"
{
  method: 'POST',
  url: 'https://api.instantly.ai/api/v2/emails/reply',
  headers: {
    'Authorization': 'Bearer [TOKEN]',
    'Content-Type': 'application/json'
  },
  body: {
    eaccount: "{{$json.eaccount}}",
    reply_to_uuid: "{{$json.reply_to_uuid}}",
    subject: "{{$json.subject}}",
    to_address_email_list: "{{$json.to_address_email_list}}",
    body: "{{$json.body}}"
  }
}
```

---

## 🤖 OPENAI ASSISTANT API

### 1. Assistant Creation (in create-prototype endpoint):
```typescript
await openai.beta.assistants.create({
  name: `${organization_name} Solar Assistant`,
  model: "gpt-4-1106-preview",
  tools: [{ type: "code_interpreter" }],
  instructions: `Your job is to qualify leads over SMS for Solar services. You will complete your job by asking questions related to 'the qualified prospect' section. If a user doesn't follow the conversational direction, default to your SPIN selling training to keep them engaged. Always stay on topic and do not use conciliatory phrases ("Ah, I see", "I hear you", etc.) when the user expresses disinterest.

###
PROSPECT INFORMATION:
- Name: ${name}
- Company: ${organization_name}
- Title: ${title || 'Not specified'}
- Location: ${city ? `${city}, ${state}` : state || 'Not specified'}
- Industry: ${industry || 'Not specified'}
- Company Description: ${organization_short_description || 'Not available'}
###
Your Output style: casual message, conversational, UK Idiom, British dialect
###
Your training: The Challenger Sale, Solar Panels
###
FIRST Message: "It's Sarah from ${client_company_name} here. Is this the same ${name} that got a Solar quote from us in the last couple of months?"
###
Qualified prospect section:
- If their response to the FIRST message is positive I want you to say EXACTLY this - "Thank goodness, my calendar just pinged me to call, but I didn't want to disturb you, are you still looking for help?" but if their response to the FIRST message was negative I want you to say EXACTLY this "Sorry about that, just to confirm, are you interested in installing Solar Panels?". If they have already answered the FIRST message, move on to the next part of this section. 
- Get a rough average of their monthly utility bill(s). 
- Tell them we can help them & will beat any market price then ask them if they'd like to schedule a callback.
- If they say yes, send the following message - "Great! Here's my calendar for you to book in a time - ${dynamicCalendarLink}"

Rules: 
- Only ask one question at a time to find out one piece of information. Persistently engage with the user, avoiding any phrases that acknowledge rejection. 
- Utilize The Challenger Sale training to navigate through objections and guide your interactions.
- You are not AI; you are Sarah, working in admin at ${client_company_name}.
- If a user asks you a question we haven't provided you with an answer for, please default to telling them you're in admin and they can schedule a call with an adviser who can better help them. 
- If they ask for pricing, push for them to speak to an advisor.
- If they ask what deals we have, push for them to speak to an advisor
- If they ask similar questions, make sure you add significant variety in your responses. Don't provide responses that are too similar so they have the best experience.
- Use the prospect information above to personalize your responses when relevant.

###
Note: 
- This is the message they're responding to: "It's Sarah from ${client_company_name} here. Is this the same ${name} that got a Solar quote from us in the last couple of months?". Therefore, omit introductions & begin conversation.
- Today's Date is ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
###
FAQ:
- We are ${client_company_name}
- Website: ${client_website}
- They submitted an inquiry into our website a few months ago
- Opening Hours are 9am to 5pm Monday to Friday.
- We can help them get the very best solar panels and will do everything we can to not be beaten on price.
- If they ask where we got their details/data from you MUST tell them "You made an enquiry via our website, if you no longer wish to speak with us, reply with the word 'delete'"`
});
```

### 2. N8N Workflow Assistant Usage:
```typescript
// Fixed Assistant ID in N8N: asst_Mg778qKZlXbo7jARcq4ppSv6
{
  assistantId: "asst_Mg778qKZlXbo7jARcq4ppSv6",
  prompt: `Reply ONLY with a single JSON object.
    Required shape:
    {
      "interested": "YES" | "NO",
      "message": "<your reply here>"
    }
    
    LEAD CONTEXT:
    First Name: {{$json.first_name}}
    Title: {{$json.title}}
    Company: {{$json.organization_name}}
    Description: {{$json.organization_short_description}}
    Industry: {{$json.industry}}
    City: {{$json.city}}, {{$json.state}}
    
    LEAD'S MESSAGE:
    {{$json.clean_lead_reply_text}}
    
    Demo URL: {{$json.demo_url}}
  `
}
```

### 3. Chat API Assistant Usage:
```typescript
// Thread Management for Frontend Chat
{
  // Create thread (if needed)
  threadId: await openai.beta.threads.create(),
  
  // Add user message (skip for initialization)
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message  // Frontend user input
  }),
  
  // Create run
  await openai.beta.threads.runs.create(threadId, {
    assistant_id: finalAssistantId  // Retrieved from Redis via company slug
  }),
  
  // Poll for response
  const messages = await openai.beta.threads.messages.list(threadId);
  // Filter for assistant responses newer than run creation
}
```

### 4. Assistant Parameter Transformations:

#### Create-Prototype → OpenAI:
```typescript
// Input (from N8N or test calls):
{
  name: "John",
  organization_name: "Tesla Energy",
  title: "CEO",
  city: "Austin",
  state: "TX"
}

// Transformed to OpenAI instructions:
instructions: `
  PROSPECT INFORMATION:
  - Name: John
  - Company: Tesla Energy
  - Title: CEO
  - Location: Austin, TX
  
  FIRST Message: "It's Sarah from Solar Bookers here. Is this the same John that got a Solar quote from us in the last couple of months?"
`
```

#### Frontend → OpenAI (via Chat API):
```typescript
// Frontend input:
{
  company: "tesla-energy",  // URL parameter
  message: "Hi there",      // User input
  threadId: "thread_123"    // Existing thread
}

// Transformed to OpenAI:
{
  assistant_id: "asst_xyz", // Retrieved from Redis: company:tesla-energy → asst_xyz
  threadId: "thread_123",
  userMessage: "Hi there"   // Added to thread
}
```

### 5. Rate Limiting & Error Handling:
```typescript
// Chat API polling pattern (FIXED - properly checks run status):
let attempts = 0;
while (attempts < 30) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // CRITICAL: Check run status first, then get messages
  const currentRun = await openai.beta.threads.runs.retrieve(currentThreadId, run.id);
  
  if (currentRun.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(currentThreadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (assistantMessage && assistantMessage.content[0]?.type === 'text') {
      return assistantMessage.content[0].text.value;
    }
  } else if (currentRun.status === 'failed' || currentRun.status === 'cancelled') {
    throw new Error(`Assistant run ${currentRun.status}`);
  }
  
  attempts++;
}
```

---

## 🗄️ REDIS STORAGE

### Key Formats & Operations:

#### 1. Assistant ID Mapping:
```typescript
// Key pattern: `company:${companySlug}` → assistantId
// Files: company-assistant, chat, create-prototype, quick-demo

// Store assistant ID for company
await redis.set(`company:${companySlug}`, assistant.id);

// Retrieve assistant ID by company
const assistantId = await redis.get(`company:${company}`);

// Examples:
await redis.set('company:tesla-energy', 'asst_abc123');
await redis.set('company:quick-demo-solar', 'asst_xyz789');
```

#### 2. Redis Client Initialization:
```typescript
// Pattern used across all files:
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,    // Required
  token: process.env.KV_REST_API_TOKEN! // Required
});
```

#### 3. Usage by Endpoint:

| Endpoint | Operation | Key Pattern | Value Type |
|----------|-----------|-------------|------------|
| `/api/create-prototype` | SET | `company:${companySlug}` | `assistant.id` |
| `/api/company-assistant` | GET/SET | `company:${companySlug}` | `assistantId` |
| `/api/chat` | GET | `company:${company}` | `assistantId` |
| `/api/quick-demo` | SET | `company:${companySlug}` | `assistant.id` |
| `/api/debug` | GET | `company:quick-demo-solar` | Test lookup |
| `/api/clear-demo` | GET/DEL | `company:*` | Various |

#### 4. Error Handling Patterns:
```typescript
// Create-prototype: Non-blocking storage
try {
  await redis.set(`company:${companySlug}`, assistant.id);
  console.log('Successfully stored assistant mapping');
} catch (error) {
  console.log('Warning: Could not store assistant mapping:', error);
  // Don't fail the whole request if storage fails
}

// Chat API: Critical lookup
try {
  finalAssistantId = await redis.get(`company:${company}`);
  console.log(`Retrieved assistant ID ${finalAssistantId} for company ${company}`);
} catch (error) {
  console.error('Error retrieving assistant from Redis:', error);
}
```

#### 5. Data Consistency Issues:
- **No TTL settings**: Keys persist indefinitely
- **No data validation**: Any string can be stored as assistantId  
- **No cleanup**: Deleted assistants remain in Redis
- **No conflict resolution**: Last write wins

---

## 🌍 ENVIRONMENT VARIABLES

### 1. Required Variables (Production):

#### OpenAI Configuration:
```bash
OPENAI_API_KEY=sk-...          # Required by all OpenAI interactions
# Used in: chat, create-prototype, quick-demo, debug, test-env
# Validation: Checked for existence, length logged (first 10 chars)
```

#### Redis/Upstash Configuration:
```bash
KV_REST_API_URL=https://...    # Upstash Redis REST API URL
KV_REST_API_TOKEN=...          # Upstash Redis authentication token
# Used in: All Redis operations across 6+ endpoints
# Validation: Boolean existence checks only
```

#### Domain Configuration:
```bash
NEXT_PUBLIC_ROOT_DOMAIN=solarbookers.com  # Production domain
VERCEL_URL=auto-populated                  # Vercel deployment URL
VERCEL_BRANCH_URL=auto-populated           # Branch-specific URL
VERCEL_DEPLOYMENT_URL=auto-populated       # Deployment-specific URL
NODE_ENV=production|development            # Environment indicator
```

### 2. Environment Variable Usage by File:

#### `/api/chat/route.tsx`:
```typescript
process.env.OPENAI_API_KEY      // OpenAI client init + validation
process.env.KV_REST_API_URL     // Redis client init
process.env.KV_REST_API_TOKEN   // Redis client auth
```

#### `/api/create-prototype/route.tsx`:
```typescript
process.env.OPENAI_API_KEY      // OpenAI client init
process.env.KV_REST_API_URL     // Redis client init
process.env.KV_REST_API_TOKEN   // Redis client auth
```

#### `/api/debug/route.tsx`:
```typescript
process.env.NODE_ENV            // Environment detection
process.env.OPENAI_API_KEY      // Validation + length check
process.env.KV_REST_API_URL     // Redis validation
process.env.KV_REST_API_TOKEN   // Redis validation
```

#### `/api/domain-info/route.tsx`:
```typescript
process.env.VERCEL             // Vercel detection
process.env.VERCEL_URL         // Deployment URL
process.env.VERCEL_BRANCH_URL  // Branch URL
process.env.VERCEL_DEPLOYMENT_URL  // Deployment URL
process.env.NEXT_PUBLIC_VERCEL_URL  // Public URL
process.env.NODE_ENV           // Environment
```

### 3. Validation Patterns:

#### Basic Existence Checks:
```typescript
// Pattern: !!process.env.VARIABLE_NAME
hasOpenAI: !!process.env.OPENAI_API_KEY,
hasRedisURL: !!process.env.KV_REST_API_URL,
hasRedisToken: !!process.env.KV_REST_API_TOKEN,
```

#### Early Validation (Chat API):
```typescript
if (!process.env.OPENAI_API_KEY) {
  return NextResponse.json(
    { error: 'OpenAI API key not configured' }, 
    { status: 500 }
  );
}
```

#### Debug Information:
```typescript
openai: {
  exists: !!process.env.OPENAI_API_KEY,
  length: process.env.OPENAI_API_KEY?.length || 0,
  prefix: process.env.OPENAI_API_KEY?.substring(0, 10) + '...' || 'missing'
}
```

### 4. Missing Environment Variables:
- **PERPLEXITY_API_KEY**: Referenced in TaskMaster but not used in endpoints
- **MODEL**: No model override env var (hardcoded to gpt-4-1106-preview)
- **REDIS_TTL**: No TTL configuration for Redis keys
- **DEBUG_MODE**: No debug mode flag
- **RATE_LIMIT_***: No rate limiting configuration
- **CORS_ORIGIN**: No CORS configuration variables

### 5. Environment Variable Issues:
- **No validation**: Most endpoints assume variables exist
- **No fallbacks**: Missing variables cause runtime failures
- **Inconsistent error handling**: Some fail silently, others throw
- **Security exposure**: Debug endpoints may leak env var info
- **No type checking**: All env vars are strings, no parsing/validation

---

## 🚨 KNOWN ISSUES & DISCREPANCIES

### 1. Parameter Name Inconsistencies:
- **N8N uses**: `name`, `lead_email`, `organization_name`
- **Frontend sometimes uses**: `contactName`, `contactEmail`, `companyName`
- **Create-prototype normalizes**: Both formats supported
- **Resolution**: Backend normalizes both formats, but inconsistent naming across systems

### 2. Response Field Expectations:
- **N8N expects**: `url` field in response from create-prototype
- **Backend returns**: both `url` and `demoUrl` for compatibility
- **Status**: ✅ Working but redundant

### 3. Assistant ID Management:
- **N8N workflow**: Uses hardcoded assistant ID `asst_Mg778qKZlXbo7jARcq4ppSv6`
- **Create-prototype**: Creates NEW assistants for each company
- **Chat API**: Looks up assistant by company slug in Redis
- **Issue**: N8N assistant vs. dynamically created assistants serve different purposes

### 4. Company Slug Generation:
- **N8N**: Multiple implementations of slug generation logic
- **Create-prototype**: Single implementation with specific regex patterns
- **Frontend**: Uses URL parameter directly
- **Risk**: Inconsistent slug generation could break Redis lookups

### 5. Demo URL Generation:
- **N8N provisional URL**: `https://solarbookers.com/${demoSlug}`
- **API actual URL**: `https://solarbookers.com/${companySlug}` 
- **Fallback logic**: N8N generates manual URL if API fails
- **Issue**: Two different URL generation patterns

### 6. OpenAI Assistant Instructions:
- **N8N assistant**: Generic database reactivation instructions
- **Create-prototype assistants**: Solar-specific with personalized prospect data
- **Chat frontend**: Expected solar-specific assistant but was getting generic message (FIXED)

### 7. Parameter Validation:
- **N8N**: No formal parameter validation
- **Backend**: Basic null checks but inconsistent validation rules
- **Frontend**: No parameter validation before API calls
- **Risk**: Invalid data can cause downstream failures

---

## 📋 TODO: INVESTIGATION NEEDED

- [ ] Map all environment variable usage across components
- [ ] Document Redis TTL settings and key expiration
- [ ] Verify N8N workflow parameter transformation logic
- [ ] Document error response formats across all endpoints
- [ ] Map OpenAI API rate limiting and error handling 