# GitHub Actions Cloud Deployment Setup

## 🚀 Quick Start (5 minutes)

### Step 1: Enable GitHub Packages
1. Go to your GitHub repo Settings
2. Under "Actions" → "General", enable workflows
3. Your images will automatically publish to `ghcr.io/YallaPapi/all-purpose/*`

### Step 2: Run Your First Build
1. Go to Actions tab in your repo
2. Click "Quick Build Core Services"
3. Click "Run workflow"
4. Wait ~3-5 minutes for build to complete

### Step 3: Deploy to Cloud (Pick One)

#### Option A: Railway (Easiest - No Docker knowledge needed)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Option B: Google Cloud Run (Free tier available)
1. [Create GCP account](https://cloud.google.com/free)
2. Install gcloud CLI
3. Run:
```bash
gcloud run deploy meta-agent \
  --image ghcr.io/yallapapi/all-purpose/lead-generator:latest \
  --port 3000 \
  --allow-unauthenticated
```

#### Option C: DigitalOcean App Platform ($5/month)
1. [Create DO account](https://www.digitalocean.com/)
2. Go to App Platform
3. Deploy from Container Registry
4. Use image: `ghcr.io/yallapapi/all-purpose/lead-generator:latest`

## 🔐 Environment Variables to Set

In your cloud platform, set these:

```env
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Redis (use cloud Redis like Upstash)
KV_REST_API_URL=https://...upstash.io
KV_REST_API_TOKEN=...

# Optional
PERPLEXITY_API_KEY=pplx-...
PORT=3000
```

## 📊 Access Your System

After deployment, you'll get a URL like:
- Railway: `https://your-app.up.railway.app`
- GCP: `https://your-app-xyz.run.app`
- DO: `https://your-app.ondigitalocean.app`

Visit `/admin/observability` to see your dashboard!

## 🆘 Troubleshooting

**Build fails?**
- Check Actions tab for error logs
- Ensure Dockerfile exists in your repo

**Can't access ghcr.io images?**
- Make sure repo is public OR
- Set up image pull secrets in your cloud platform

**Application won't start?**
- Check you set all required environment variables
- Look at cloud platform logs for errors

## 🎯 Next Steps

1. **Deploy Observability Dashboard**: 
   ```bash
   # Deploy the dashboard separately for monitoring
   # Use image: ghcr.io/yallapapi/all-purpose/observability:latest
   ```

2. **Set up Agents**: Once core is running, deploy individual agents

3. **Configure Service Discovery**: Set up Consul or use cloud-native service discovery

---

**Need help?** The quick-build.yml workflow is the simplest path. Start there!