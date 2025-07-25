# Environment Setup Guide

Complete guide for setting up the allpurp development environment.

## Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0 (recommended: 20.x LTS)
- **npm**: >= 8.0.0 or **yarn**: >= 1.22.0
- **Git**: >= 2.30.0
- **Python**: >= 3.8 (for certain agent integrations)

### Optional Dependencies
- **Docker**: For containerized development
- **Redis**: For caching and session management
- **PostgreSQL**: For persistent data storage

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd allpurp
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Environment Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Configure the following environment variables:

```bash
# Core Configuration
NODE_ENV=development
PORT=3000

# API Keys (obtain from respective services)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379
KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_token

# Vector Database (Qdrant)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key

# Meta-Agent Configuration
META_AGENT_FACTORY_ENABLED=true
UEP_ENFORCEMENT_LEVEL=standard
PROJECT_CONTEXT_PERSISTENCE=enabled

# Documentation System
AUTO_DOCUMENTATION_ENABLED=true
DOCUMENTATION_VALIDATION_ENABLED=true
DOC_EVENT_LISTENING_ENABLED=true
```

### 4. Database Setup

If using PostgreSQL:

```bash
# Create database
createdb allpurp_dev

# Run migrations (if applicable)
npm run migrate
```

### 5. Redis Setup

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally on macOS
brew install redis
brew services start redis

# Or install locally on Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### 6. Vector Database Setup (Qdrant)

```bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant
```

## Development Workflow

### Starting the Development Server

```bash
# Start main application
npm run dev

# Start with specific components
npm run dev:agents    # Start meta-agent factory
npm run dev:docs      # Start documentation system
npm run dev:rag       # Start RAG system
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:agents

# Run tests with coverage
npm run test:coverage
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Build for production deployment
npm run build:prod
```

## Configuration Details

### Meta-Agent Factory Configuration

Create `meta-agent.config.json`:

```json
{
  "factory": {
    "maxConcurrentAgents": 10,
    "defaultTimeout": 300000,
    "enablePerformanceMonitoring": true
  },
  "uep": {
    "enforcementLevel": "standard",
    "validationEnabled": true,
    "auditLogging": true
  },
  "projectContext": {
    "persistenceEnabled": true,
    "syncInterval": 5000,
    "maxContextSize": "10MB"
  }
}
```

### Documentation System Configuration

Create `documentation.config.json`:

```json
{
  "organizer": {
    "autoOrganize": true,
    "followNamingConventions": true,
    "createMissingDirectories": true
  },
  "validation": {
    "enabled": true,
    "autoFix": true,
    "strictMode": false
  },
  "eventListener": {
    "debounceMs": 2000,
    "batchEvents": true,
    "integrations": {
      "projectContext": true,
      "git": true,
      "fileSystem": true
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find and kill process using port 3000
   lsof -ti:3000 | xargs kill -9
   ```

2. **Redis connection failed**
   ```bash
   # Check Redis status
   redis-cli ping
   # Should return "PONG"
   ```

3. **TypeScript compilation errors**
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build
   ```

4. **Missing environment variables**
   - Verify all required variables are set in `.env`
   - Check for typos in variable names
   - Ensure API keys are valid and have correct permissions

### Performance Optimization

1. **Enable Node.js optimization flags**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Configure Redis for optimal performance**:
   - Set appropriate memory limits
   - Enable persistence if needed
   - Configure eviction policies

### Development Tools

Recommended VS Code extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens
- Thunder Client (for API testing)

## Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment instructions.

## Support

For additional help:
- Check the [Debugging Guide](./docs/DEBUGGING_GUIDE.md)
- Review system logs in `./logs/`
- Create an issue in the repository

---

*Last updated: 2025-07-25*
*Generated by: Simple Documentation Update System*
