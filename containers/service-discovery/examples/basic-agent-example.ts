/**
 * Basic Agent Integration Example
 * Task 191.3: Example showing how to integrate service discovery into a UEP agent
 */

import express from 'express';
import { createAgentHelper, createHealthEndpoint, createMetricsEndpoint } from '../AgentServiceHelper.js';

// Example: PRD Parser Agent with Service Discovery Integration
class PRDParserAgent {
  private app: express.Application;
  private serviceHelper;
  private server?: any;

  constructor() {
    this.app = express();
    
    // Create the service helper
    this.serviceHelper = createAgentHelper({
      agentType: 'prd-parser',
      agentName: 'PRD Parser Agent v2.0',
      version: '2.0.0',
      host: process.env.HOST || 'localhost',
      port: parseInt(process.env.PORT || '3000'),
      capabilities: ['parsing', 'validation', 'analysis'],
      environment: (process.env.NODE_ENV as any) || 'development',
      cluster: process.env.CLUSTER_NAME || 'default',
      namespace: process.env.NAMESPACE || 'uep',
      labels: {
        team: 'uep-core',
        component: 'prd-parser'
      }
    }, {
      registryUrl: process.env.REGISTRY_URL || 'redis://localhost:6379',
      autoRegisterOnStartup: true,
      autoDeregisterOnShutdown: true,
      autoHealthReporting: true,
      enableDiscoveryCache: true
    });

    this.setupRoutes();
    this.setupServiceDiscovery();
  }

  private setupRoutes(): void {
    // Health check endpoint (required for service discovery)
    this.app.get('/health', createHealthEndpoint());
    
    // Metrics endpoint
    this.app.get('/metrics', createMetricsEndpoint(this.serviceHelper));
    
    // Main parsing endpoint
    this.app.post('/parse', async (req, res) => {
      const startTime = Date.now();
      
      try {
        // Simulate parsing work
        const result = await this.parsePRD(req.body.content);
        
        // Update load metrics
        const responseTime = Date.now() - startTime;
        await this.serviceHelper.updateLoad(25, { responseTime });
        
        res.json({ success: true, result });
        
      } catch (error) {
        // Report error and increased load
        await this.serviceHelper.updateLoad(50, { 
          responseTime: Date.now() - startTime,
          errorRate: 0.1 
        });
        
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Coordination endpoint - demonstrates service discovery usage
    this.app.post('/coordinate', async (req, res) => {
      try {
        // Find scaffold generator agents
        const scaffoldAgents = await this.serviceHelper.findAgents('scaffold-generator', {
          healthy: true,
          maxLoad: 70,
          limit: 1
        });

        if (scaffoldAgents.length === 0) {
          return res.status(503).json({ 
            error: 'No available scaffold generator agents' 
          });
        }

        const scaffoldAgent = scaffoldAgents[0];
        
        // Make request to the scaffold agent
        const response = await fetch(`http://${scaffoldAgent.network.address}:${scaffoldAgent.network.port}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        });

        const result = await response.json();
        res.json(result);

      } catch (error) {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : 'Coordination failed' 
        });
      }
    });
  }

  private setupServiceDiscovery(): void {
    // Example of discovering other services on startup
    this.serviceHelper.findCapableAgents(['orchestration']).then(agents => {
      console.log(`Found ${agents.length} orchestration agents`);
    });
  }

  private async parsePRD(content: string): Promise<any> {
    // Simulate parsing work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      sections: ['requirements', 'architecture', 'implementation'],
      complexity: 'medium',
      estimatedHours: 24
    };
  }

  async start(): Promise<void> {
    try {
      // Start the service discovery helper
      await this.serviceHelper.start();
      
      // Start the HTTP server
      const port = parseInt(process.env.PORT || '3000');
      this.server = this.app.listen(port, () => {
        console.log(`PRD Parser Agent listening on port ${port}`);
      });
      
    } catch (error) {
      console.error('Failed to start PRD Parser Agent:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping PRD Parser Agent...');
    
    // Stop HTTP server
    if (this.server) {
      this.server.close();
    }
    
    // Stop service discovery helper
    await this.serviceHelper.stop('Agent shutdown');
    
    console.log('PRD Parser Agent stopped');
  }
}

// Example usage
async function main() {
  const agent = new PRDParserAgent();
  
  try {
    await agent.start();
    console.log('PRD Parser Agent started successfully');
  } catch (error) {
    console.error('Failed to start agent:', error);
    process.exit(1);
  }
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await agent.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await agent.stop();
    process.exit(0);
  });
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { PRDParserAgent };