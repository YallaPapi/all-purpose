# Configuration Reference - Meta-Agent Factory

**Setup, environment, and configuration guide for the Meta-Agent Factory system.**

## 🚀 Initial Setup

### System Requirements
```bash
# Required versions
Node.js: v18+ (check: node --version)
npm: v9+ (check: npm --version)
Memory: 4GB RAM minimum (8GB+ recommended)
Storage: 2GB free space minimum (10GB+ recommended)
```

### Installation
```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd all-purpose

# 2. Install dependencies
npm install

# 3. Install TaskMaster globally
npm install -g task-master-ai

# 4. Verify installation
npm run dev  # Should start without errors
task-master --version  # Should show version
node test-uep-coordination-simple.js  # All agents should show ✅
```

## ⚙️ Environment Configuration

### Environment Variables
```bash
# Required for development
NODE_ENV=development
LOG_LEVEL=info

# TaskMaster AI API Keys (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key     # Claude models (recommended)
PERPLEXITY_API_KEY=your_perplexity_key   # Research features (recommended)
OPENAI_API_KEY=your_openai_key           # GPT models
GOOGLE_API_KEY=your_google_key           # Gemini models
MISTRAL_API_KEY=your_mistral_key         # Mistral models

# RAG System (optional but recommended)
UPSTASH_VECTOR_REST_URL=your_upstash_url
UPSTASH_VECTOR_REST_TOKEN=your_upstash_token

# Observability (optional)
OBSERVABILITY_REDIS_URL=redis://localhost:6379
COORDINATION_REDIS_URL=redis://localhost:6379
```

### .env File Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your actual API keys
nano .env  # or use your preferred editor
```

## 🤖 Agent Configuration

### Infrastructure Orchestrator Configuration
**File:** `src/meta-agents/infra-orchestrator/ioa.config.json`

```json
{
  "projectRoot": "C:\\Users\\Stuart\\Desktop\\Projects\\allpurp",
  "mode": "orchestrate",
  "enableRAGIntegration": true,
  "enableMetaAgentCoordination": true,
  "enableAutoComplianceEnforcement": true,
  "orchestration": {
    "enableAutoDocs": true,
    "enableAutoTasks": true,
    "agents": {
      "prd-parser": {"priority": 1, "timeout": 60000},
      "scaffold-generator": {"priority": 2, "timeout": 120000},
      "template-engine-factory": {"priority": 3, "timeout": 180000},
      "all-purpose-pattern": {"priority": 4, "timeout": 90000},
      "parameter-flow": {"priority": 5, "timeout": 120000},
      "five-document-framework": {"priority": 6, "timeout": 90000},
      "thirty-minute-rule": {"priority": 7, "timeout": 60000},
      "vercel-native-architecture": {"priority": 8, "timeout": 120000}
    }
  }
}
```

### Project-Specific Configurations
**File:** `src/meta-agents/infra-orchestrator/monitoring-dashboard.config.json`

```json
{
  "project": {
    "name": "Monitoring Dashboard for Lead Generation Factory",
    "type": "web-application",
    "description": "Comprehensive real-time monitoring dashboard...",
    "framework": "nextjs",
    "features": ["real-time-monitoring", "agent-coordination", "observability"]
  },
  "orchestration": {
    "agents": {
      "prd-parser": {
        "priority": 1,
        "task": "Parse monitoring dashboard PRD and extract requirements",
        "input": "monitoring-dashboard-prd.md",
        "output": "parsed-requirements.json"
      },
      "scaffold-generator": {
        "priority": 3,
        "task": "Generate Next.js project structure with monitoring components",
        "dependencies": ["prd-parser"],
        "framework": "nextjs",
        "features": ["monitoring", "real-time", "dashboard"]
      }
    }
  },
  "output": {
    "directory": "../../../generated/monitoring-dashboard",
    "format": "nextjs-project"
  }
}
```

## 📋 TaskMaster Configuration

### Global TaskMaster Setup
```bash
# Initialize TaskMaster in project
task-master init

# Configure AI models
task-master models --setup

# Set specific models (optional)
task-master models --set-main claude-3-5-sonnet-20241022
task-master models --set-research perplexity-llama-3.1-sonar-large-128k-online
task-master models --set-fallback gpt-4o-mini
```

### TaskMaster Config File
**File:** `.taskmaster/config.json`

```json
{
  "models": {
    "main": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "ANTHROPIC_API_KEY"
    },
    "research": {
      "provider": "perplexity",
      "model": "perplexity-llama-3.1-sonar-large-128k-online",
      "apiKey": "PERPLEXITY_API_KEY"
    },
    "fallback": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "apiKey": "OPENAI_API_KEY"
    }
  },
  "settings": {
    "maxTokens": 4000,
    "temperature": 0.1,
    "enableResearch": true,
    "enableValidation": true
  }
}
```

## 🌐 Web Interface Configuration

### Next.js Configuration
**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@upstash/vector', '@upstash/redis']
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  }
};

module.exports = nextConfig;
```

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "build:agents": "npm run build:ioa && npm run build:template-engine",
    "build:ioa": "cd src/meta-agents/infra-orchestrator && npm run build",
    "build:template-engine": "cd src/meta-agents/template-engine-factory && npm run build"
  }
}
```

## 🔧 Development Configuration

### TypeScript Configuration
**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./lib/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint Configuration
**File:** `eslint.config.js`

```javascript
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'off'
    }
  }
];

export default eslintConfig;
```

## 🚨 Troubleshooting Configuration

### Common Configuration Issues

#### Port Conflicts
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill conflicting process (Windows)
taskkill /PID <process-id> /F

# Or use different port
npm run dev -- --port 3001
```

#### Missing Dependencies
```bash
# Install common missing dependencies
npm install @types/node fs-extra dotenv zod
npm install @babel/parser @babel/traverse @babel/types

# For meta-agents
cd src/meta-agents/infra-orchestrator
npm install
```

#### ES Module Issues
```bash
# Convert CommonJS to ES modules or use .cjs extensions
# Known issue with start-all-agents.js

# Workaround: Use Infrastructure Orchestrator directly
cd src/meta-agents/infra-orchestrator
npm run build
node dist/main.js orchestrate
```

### Diagnostic Configuration
```bash
# Enable verbose logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Test configuration
node test-uep-coordination-simple.js
task-master list
npm run dev
```

## 📊 Performance Configuration

### Optimization Settings
```javascript
// next.config.js performance optimizations
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@upstash/vector', '@upstash/redis']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
};
```

### Memory Configuration
```bash
# Increase Node.js memory limit for large projects
export NODE_OPTIONS="--max-old-space-size=8192"

# For agent coordination
npm run dev -- --max-memory=4096
```

## 🔐 Security Configuration

### API Security
```javascript
// Secure API configuration
const secureApiConfig = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};
```

### Environment Security
```bash
# Secure environment variables
chmod 600 .env
echo ".env" >> .gitignore

# Use environment-specific configs
cp .env.example .env.production
cp .env.example .env.development
```

---

**This configuration reference ensures the Meta-Agent Factory runs optimally with proper security, performance, and reliability settings.**