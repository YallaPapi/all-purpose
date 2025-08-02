import { Logger } from '../utils/Logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export class AgentLoader {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('AgentLoader');
  }

  async loadAgent(agentType: string, agentPath: string): Promise<any> {
    this.logger.info(`Loading agent ${agentType} from ${agentPath}`);
    
    try {
      // Try different loading strategies
      let AgentModule: any;
      
      // Strategy 1: Direct import (for Docker)
      if (agentPath.startsWith('/app/')) {
        try {
          AgentModule = await import(agentPath);
          this.logger.info(`Loaded ${agentType} via direct import`);
          return AgentModule;
        } catch (e) {
          this.logger.warn(`Direct import failed for ${agentPath}: ${(e as Error).message}`);
        }
      }
      
      // Strategy 2: Relative import (for local development)
      try {
        const relativePath = path.relative(__dirname, agentPath.replace('/app/', path.join(__dirname, '../../../')));
        const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
        AgentModule = await import(importPath);
        this.logger.info(`Loaded ${agentType} via relative import from ${importPath}`);
        return AgentModule;
      } catch (e) {
        this.logger.warn(`Relative import failed: ${(e as Error).message}`);
      }
      
      // Strategy 3: Try CommonJS require for .js files
      if (agentPath.endsWith('.js')) {
        try {
          const requirePath = agentPath.replace('/app/', path.join(__dirname, '../../../'));
          AgentModule = require(requirePath);
          this.logger.info(`Loaded ${agentType} via require`);
          return AgentModule;
        } catch (e) {
          this.logger.warn(`Require failed: ${(e as Error).message}`);
        }
      }
      
      throw new Error(`Failed to load agent ${agentType} from any strategy`);
      
    } catch (error) {
      this.logger.error(`Failed to load agent ${agentType}:`, error);
      throw error;
    }
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