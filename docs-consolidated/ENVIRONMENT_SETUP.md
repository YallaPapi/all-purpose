# 🌟 All-Purpose Lead System - Environment Setup Guide

> **Complete setup instructions for development and production environments**  
> **NOW SUPPORTS ANY INDUSTRY**: Dental, Automotive, Legal, Chiropractic, Business Funding, etc.

---

## 🔑 REQUIRED ENVIRONMENT VARIABLES

### **OpenAI Configuration**
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```
- **Source**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Required for**: Chat API, Assistant creation, Thread management
- **Note**: Must have Assistants API access enabled

### **Redis/Upstash Configuration**
```bash
KV_REST_API_URL=https://your-redis-url.upstash.io
KV_REST_API_TOKEN=your-redis-token-here
```
- **Source**: [Upstash Console](https://upstash.com/)
- **Required for**: Assistant ID mapping, Company slug storage
- **Note**: Free tier sufficient for development

### **Domain Configuration**
```bash
NEXT_PUBLIC_ROOT_DOMAIN=solarbookers.com  # Current production domain
VERCEL_URL=auto-populated-by-vercel
```
- **NEXT_PUBLIC_ROOT_DOMAIN**: Production domain for URL generation
- **VERCEL_URL**: Auto-populated by Vercel for preview deployments
- **Domain Detection**: Uses dynamic domain detection via lib/domain-utils.ts

---

## 🛠️ SETUP INSTRUCTIONS

### **1. Development Setup**
1. Copy environment variables template:
   ```bash
   # Create .env.local file with:
   OPENAI_API_KEY=sk-your-key-here
   KV_REST_API_URL=https://your-url.upstash.io
   KV_REST_API_TOKEN=your-token-here
   NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
   NODE_ENV=development
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test configuration:
   ```bash
   npm run dev
   # Visit: http://localhost:3000/api/debug
   ```

### **2. Vercel Production Setup**
1. **Domain Configuration**:
   - Assign `solarbookers.com` to production branch
   - Set up redirects: `www.solarbookers.com` → `solarbookers.com`

2. **Environment Variables** (in Vercel Dashboard):
   ```
   OPENAI_API_KEY (All environments)
   KV_REST_API_URL (All environments)
   KV_REST_API_TOKEN (All environments)
   NEXT_PUBLIC_ROOT_DOMAIN=solarbookers.com (Production only)
   ```

3. **Preview Environment Variables**:
   ```
   NEXT_PUBLIC_ROOT_DOMAIN=vercel-preview-domain (Preview only)
   ```

### **3. n8n Workflow Configuration**
Update webhook URLs in n8n workflow:
```
Production: https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/create-prototype
Preview: https://[preview-url].vercel.app/api/create-prototype
```

**IMPORTANT**: Include `industry` parameter in N8N requests:
```json
{
  "companyName": "Bright Dental",
  "contactName": "Dr. Sarah Johnson", 
  "contactEmail": "sarah@brightdental.com",
  "industry": "dental"
}
```

---

## 📋 VERIFICATION CHECKLIST

### **✅ Development Environment**
- [ ] `npm run dev` starts without errors
- [ ] `/api/debug` shows all green checkmarks
- [ ] OpenAI API key validated
- [ ] Redis connection successful
- [ ] Domain detection working

### **✅ Production Environment**
- [ ] Production domain resolves to latest deployment
- [ ] All environment variables set in Vercel
- [ ] `/api/debug` accessible on production
- [ ] n8n workflow webhooks updated with industry parameter
- [ ] End-to-end demo creation working for multiple industries
- [ ] Industry parameter correctly generates dynamic assistants

### **✅ Preview Environment**
- [ ] Preview URLs working with dynamic domain detection
- [ ] Chat API functional on preview deployments
- [ ] Environment variables correctly scoped

---

## 🚨 TROUBLESHOOTING

### **Common Issues & Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Vercel Preview/Auth Protection | Disable protection in Vercel dashboard project settings |
| `Chat API fails` | Invalid OpenAI key | Check key validity at OpenAI |
| `Assistant not found` | Redis connection issue | Verify KV_REST_API_* variables |
| `Domain detection fails` | Missing environment vars | Use actual deployment URL, not hardcoded domains |
| `n8n webhook fails` | Missing industry parameter | Ensure N8N passes industry field in payload |
| `Industry validation fails` | Unsupported industry value | Check industry mapping in validateIndustry function |

### **Vercel Authentication Protection Issue**
If API endpoints return 401 "Authentication Required" with SSO redirect page:

1. **In Vercel Dashboard**: Go to Project Settings → Security
2. **Disable "Deployment Protection"** for the environment
3. **Wait 2-3 minutes** for settings to propagate
4. **Test endpoints** - they should now return JSON instead of HTML
5. **Secret Key**: If available, may be used for bypassing protection (implementation varies)

### **Debug Endpoints**
- **System Status**: `/api/debug`
- **Domain Detection**: `/api/domain-info` (if available)
- **Company Assistant Lookup**: `/api/company-assistant?company=test`

### **Logs to Check**
- Vercel Function logs in dashboard
- Browser console for frontend errors
- OpenAI API usage in OpenAI dashboard
- Redis command logs in Upstash console

---

## 🔄 DEPLOYMENT WORKFLOW

### **1. Development → Preview**
```bash
git push origin feature-branch
# Vercel auto-deploys to preview URL
# Test via /api/debug on preview domain
```

### **2. Preview → Production**
```bash
git push origin main
# Vercel deploys to solarbookers.com
# Verify production functionality
```

### **3. Environment Variable Updates**
1. Update in Vercel Dashboard
2. Redeploy affected environments
3. Test via debug endpoints
4. Update n8n webhooks if domain changed

---

## 🎯 NEXT STEPS AFTER SETUP

1. **Test Full Workflow**:
   - Create demo via n8n → API → Chat functionality
   
2. **Monitor Performance**:
   - Check Vercel Analytics
   - Monitor OpenAI usage
   - Watch Redis memory usage

3. **Scale Considerations**:
   - OpenAI rate limits
   - Redis connection limits
   - Vercel function timeouts

---

**Last Updated**: 2025-07-23  
**Environment**: Development, Preview, Production  
**Dependencies**: OpenAI, Upstash Redis, Vercel, n8n 