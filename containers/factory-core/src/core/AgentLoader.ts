import { Logger } from '../utils/Logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export class AgentLoader {
  private logger: Logger;
  private isContainer: boolean;
  private rootPath: string;
  
  constructor() {
    this.logger = new Logger('AgentLoader');
    // Detect if running in container
    this.isContainer = process.env.NODE_ENV === 'production' || 
                       process.cwd().startsWith('/app') ||
                       process.env.DOCKER_CONTAINER === 'true';
    
    // Set root path based on environment
    this.rootPath = this.isContainer ? '/app' : path.resolve(__dirname, '../../../..');
    this.logger.info(`AgentLoader initialized - Container: ${this.isContainer}, Root: ${this.rootPath}`);
  }

  async loadAgent(agentType: string, agentPath: string): Promise<any> {
    this.logger.info(`Loading agent ${agentType} from ${agentPath}`);
    
    try {
      // Resolve the correct import path
      const resolvedPath = await this.resolveAgentPath(agentType, agentPath);
      this.logger.info(`Resolved path: ${resolvedPath}`);
      
      // Use dynamic import with proper error handling
      const AgentModule = await import(resolvedPath);
      this.logger.info(`Successfully loaded ${agentType} from ${resolvedPath}`);
      
      return AgentModule;
      
    } catch (error) {
      this.logger.error(`Failed to load agent ${agentType}:`, error);
      
      // Fallback: Try to load from memory integration if it's the specific failing case
      if (agentPath.includes('agentMemoryIntegration.js')) {
        return await this.loadMemoryIntegration();
      }
      
      throw error;
    }
  }

  private async resolveAgentPath(agentType: string, originalPath: string): Promise<string> {
    const possiblePaths = await this.generatePossiblePaths(agentType, originalPath);
    
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        this.logger.info(`Found valid path: ${testPath}`);
        return testPath;
      } catch {
        // Path doesn't exist, continue
      }
    }
    
    throw new Error(`No valid path found for ${agentType}. Tried: ${possiblePaths.join(', ')}`);
  }

  private async generatePossiblePaths(agentType: string, originalPath: string): Promise<string[]> {
    const paths: string[] = [];
    
    if (this.isContainer) {
      // Container environment - all files should be compiled and in /app/dist
      
      // 1. Try compiled JS version in dist
      if (originalPath.includes('/src/')) {
        const distPath = originalPath.replace('/src/', '/dist/').replace('.ts', '.js');
        paths.push(distPath);
      }
      
      // 2. Try original path as-is (for JS files)
      paths.push(originalPath);
      
      // 3. Try with file extension fixes
      if (!originalPath.endsWith('.js') && !originalPath.endsWith('.ts')) {
        paths.push(originalPath + '.js');
      }
      
      // 4. Memory integration special case
      if (originalPath.includes('memory/agentMemoryIntegration')) {
        paths.push('/app/dist/memory/agentMemoryIntegration.js');
        paths.push('/app/src/memory/agentMemoryIntegration.js');
      }
      
    } else {
      // Development environment
      const localPath = originalPath.replace('/app/', this.rootPath + '/');
      
      // 1. Try compiled version first
      if (localPath.includes('/src/')) {
        const distPath = localPath.replace('/src/', '/dist/').replace('.ts', '.js');
        paths.push(distPath);
      }
      
      // 2. Try source TypeScript
      paths.push(localPath);
      
      // 3. Try with relative imports
      const relativePath = path.relative(__dirname, localPath);
      const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
      paths.push(importPath);
    }
    
    return paths;
  }

  private async loadMemoryIntegration(): Promise<any> {
    // Fallback implementation for agent memory integration
    this.logger.warn('Loading fallback memory integration');
    
    return {
      AgentMemory: class AgentMemory {
        constructor(public agentId: string) {
          this.memory = new Map();
          this.contextHistory = [];
        }
        
        private memory: Map<string, any>;
        private contextHistory: any[];
        
        async store(key: string, value: any) {
          this.memory.set(key, {
            value,
            timestamp: new Date().toISOString(),
            agentId: this.agentId
          });
        }
        
        async retrieve(key: string) {
          const entry = this.memory.get(key);
          return entry ? entry.value : null;
        }
        
        async addContext(context: any) {
          this.contextHistory.push({
            context,
            timestamp: new Date().toISOString()
          });
          if (this.contextHistory.length > 100) {
            this.contextHistory.shift();
          }
        }
        
        async getRecentContext(limit = 10) {
          return this.contextHistory.slice(-limit);
        }
        
        async clear() {
          this.memory.clear();
          this.contextHistory = [];
        }
      },
      createMemory: (agentId: string) => new this.AgentMemory(agentId),
      createMemoryEnhancedAgent: (agentId: string, baseAgent: any) => ({
        memory: new this.AgentMemory(agentId),
        async executeWithMemory(taskDescription: string, executeFn: Function) {
          return await executeFn(taskDescription, '');
        }
      })
    };
  }

  instantiateAgent(agentType: string, AgentModule: any, config: any): any {
    this.logger.info(`Instantiating agent ${agentType}`);
    
    switch(agentType) {
      case 'prd-parser':
        // PRD Parser exports as default
        if (AgentModule.default) {
          return new AgentModule.default(config);
        }
        break;
        
      case 'scaffold-generator':
        // Scaffold generator has a class
        if (AgentModule.ScaffoldGeneratorAgent) {
          return new AgentModule.ScaffoldGeneratorAgent(config);
        } else if (AgentModule.default?.ScaffoldGeneratorAgent) {
          return new AgentModule.default.ScaffoldGeneratorAgent(config);
        }
        // Return module itself as it exports functions
        return AgentModule;
        
      case 'all-purpose-pattern':
      case 'backend-agent':
      case 'frontend-agent':
        // These export functions directly
        return AgentModule;
        
      default:
        // Try to find a class with the agent name
        const className = this.getClassName(agentType);
        
        if (AgentModule[className]) {
          return new AgentModule[className](config);
        } else if (AgentModule.default && typeof AgentModule.default === 'function') {
          return new AgentModule.default(config);
        } else if (AgentModule.default?.[className]) {
          return new AgentModule.default[className](config);
        }
        
        // If no class found, return the module itself
        return AgentModule;
    }
  }

  private getClassName(agentType: string): string {
    return agentType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') + 'Agent';
  }
}