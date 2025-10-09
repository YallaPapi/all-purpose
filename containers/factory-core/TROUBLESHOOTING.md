# Factory Core Container Troubleshooting Guide

## Module Loading Issues

### Problem: "Cannot find module '/app/src/memory/agentMemoryIntegration.js'"

**Root Cause**: The container is trying to load ES modules with hardcoded paths that don't exist in the container filesystem.

**Solutions**:

1. **Check Environment Detection**:
   ```bash
   docker exec -it factory-core-container node -e "console.log('Container:', process.env.DOCKER_CONTAINER); console.log('CWD:', process.cwd());"
   ```

2. **Verify File Structure**:
   ```bash
   docker exec -it factory-core-container find /app -name "*.js" -type f | head -20
   ```

3. **Check AgentLoader Logs**:
   ```bash
   docker logs factory-core-container | grep "AgentLoader"
   ```

### Problem: "Direct import failed" or "Relative import failed"

**Root Cause**: Path resolution strategies are not finding the correct files.

**Solutions**:

1. **Enable Debug Logging**:
   ```bash
   docker run -e DEBUG=factory-core:* -e LOG_LEVEL=debug meta-agent-factory-core:latest
   ```

2. **Verify Build Output**:
   ```bash
   # Check that TypeScript compiled correctly
   docker run --rm meta-agent-factory-core:latest ls -la /app/dist/
   ```

3. **Test Path Resolution**:
   ```bash
   docker exec -it container node -e "
   const { AgentLoader } = require('./dist/core/AgentLoader.js');
   const loader = new AgentLoader();
   console.log('Container detected:', loader.isContainer);
   "
   ```

## ES Module Best Practices

### 1. File Extensions
- Always use `.js` extensions in import statements, even for TypeScript source
- TypeScript compiler should output `.js` files with correct extensions

### 2. Path Resolution
- Use relative imports: `import { foo } from './foo.js'`
- Avoid absolute imports unless using a proper module resolver
- Test both development and container environments

### 3. Container Environment
```dockerfile
# Ensure proper environment detection
ENV DOCKER_CONTAINER=true
ENV NODE_ENV=production

# Copy both source and compiled files
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
```

## Container Debugging Commands

### Check Module Loading
```bash
# Test import resolution
docker exec -it factory-core-container node -e "
import('./dist/core/AgentLoader.js').then(m => {
  console.log('✅ AgentLoader loaded successfully');
}).catch(e => {
  console.error('❌ AgentLoader failed:', e.message);
});
"
```

### Check File Permissions
```bash
docker exec -it factory-core-container ls -la /app/dist/
docker exec -it factory-core-container whoami
```

### Test Agent Loading
```bash
docker exec -it factory-core-container node -e "
const { RealMetaAgentFactory } = require('./dist/core/RealMetaAgentFactory.js');
const factory = new RealMetaAgentFactory({ isConnected: () => false });
console.log('Available agents:', factory.getAvailableAgentTypes());
"
```

## Performance Optimization

### 1. Multi-stage Builds
- Use separate build and production stages
- Only copy necessary files to production stage
- Clean npm cache after installs

### 2. Module Caching
- Pre-compile all TypeScript modules
- Use node_modules caching in Docker layers
- Implement module resolution caching

### 3. Memory Management
```typescript
// Example: Implement proper cleanup
export class AgentLoader {
  private moduleCache = new Map<string, any>();
  
  async loadAgent(type: string, path: string) {
    if (this.moduleCache.has(path)) {
      return this.moduleCache.get(path);
    }
    
    const module = await import(path);
    this.moduleCache.set(path, module);
    return module;
  }
  
  clearCache() {
    this.moduleCache.clear();
  }
}
```

## Health Checks

### Container Health
```bash
# Manual health check
docker exec factory-core-container node dist/health-check.js

# Check all endpoints
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

### Agent System Health
```bash
# Test agent creation
curl -X POST http://localhost:3000/api/factory/meta-agents \
  -H "Content-Type: application/json" \
  -d '{"agentType": "prd-parser", "config": {}}'

# List active agents  
curl http://localhost:3000/api/factory/meta-agents
```

## Common Error Codes

| Error | Description | Solution |
|-------|-------------|----------|
| `MODULE_NOT_FOUND` | File doesn't exist | Check file path and Docker COPY commands |
| `EPIPE` | Broken pipe | Check process communication and event handlers |
| `ENOENT` | No such file | Verify build process copied all required files |
| `ERR_REQUIRE_ESM` | CommonJS/ESM mismatch | Ensure consistent module type configuration |

## Emergency Recovery

### Reset Container State
```bash
docker stop factory-core-container
docker rm factory-core-container
docker rmi meta-agent-factory-core:latest
./scripts/build-and-deploy.sh
```

### Fallback Mode
The AgentLoader includes fallback implementations for critical modules like memory integration. If primary loading fails, the system will attempt to use these fallbacks to maintain basic functionality.

### Debug Container Startup
```bash
# Run with shell for debugging
docker run -it --entrypoint /bin/sh meta-agent-factory-core:latest

# Inside container, test imports manually
node -e "import('./dist/factory-core.js').then(() => console.log('OK')).catch(console.error)"
```