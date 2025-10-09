import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config/environment.js';
import { RealMetaAgentFactory } from './core/RealMetaAgentFactory.js';
import { HealthCheckService } from './services/HealthCheckService.js';
import { AuthService } from './services/AuthService.js';
import { MetricsService } from './services/MetricsService.js';
import { Logger } from './utils/Logger.js';
import { EventBus } from './utils/EventBus.js';

// Import RAG system for enhanced PRD processing
async function ragSearch(query: string, maxResults = 3): Promise<any[]> {
  try {
    // Use dynamic import to avoid build issues
    const { contextHelpers } = await import('../../../rag-system/dist/api/contextAPI.js');
    const results = await contextHelpers.search(query, maxResults);
    return results.map(result => ({
      id: result.id,
      content: result.content,
      relevanceScore: result.relevanceScore,
      snippet: result.snippet,
      metadata: result.metadata
    }));
  } catch (error) {
    console.error('RAG search error:', error);
    return [];
  }
}

// AI-Enhanced PRD processing functions
function inferPriority(text: string): string {
  const highPriorityTerms = ['critical', 'essential', 'must', 'required', 'urgent', 'core', 'primary'];
  const mediumPriorityTerms = ['should', 'important', 'recommended', 'preferred'];
  const lowPriorityTerms = ['could', 'nice', 'optional', 'future', 'enhancement'];
  
  const lowerText = text.toLowerCase();
  
  if (highPriorityTerms.some(term => lowerText.includes(term))) return 'high';
  if (mediumPriorityTerms.some(term => lowerText.includes(term))) return 'medium';
  if (lowPriorityTerms.some(term => lowerText.includes(term))) return 'low';
  
  return 'medium'; // default
}

function inferComplexity(text: string): string {
  const highComplexityTerms = ['algorithm', 'machine learning', 'ai', 'real-time', 'distributed', 'microservice', 'blockchain', 'encryption'];
  const mediumComplexityTerms = ['integration', 'api', 'database', 'authentication', 'search', 'notification'];
  const lowComplexityTerms = ['display', 'form', 'list', 'basic', 'simple', 'crud'];
  
  const lowerText = text.toLowerCase();
  
  if (highComplexityTerms.some(term => lowerText.includes(term))) return 'high';
  if (mediumComplexityTerms.some(term => lowerText.includes(term))) return 'medium';
  if (lowComplexityTerms.some(term => lowerText.includes(term))) return 'low';
  
  return 'medium'; // default
}

function estimateHours(text: string): number {
  const complexity = inferComplexity(text);
  const wordCount = text.split(' ').length;
  
  let baseHours = 4;
  if (complexity === 'high') baseHours = 12;
  else if (complexity === 'medium') baseHours = 8;
  else baseHours = 4;
  
  // Adjust for requirement length
  const lengthMultiplier = Math.max(1, Math.min(3, wordCount / 10));
  return Math.round(baseHours * lengthMultiplier);
}

const app = express();
const server = createServer(app);
const logger = new Logger('factory-core');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP'
});
app.use(limiter);

const eventBus = new EventBus(config.nats.url);
const metaAgentFactory = new RealMetaAgentFactory(eventBus);
const healthService = new HealthCheckService();
const authService = new AuthService();
const metricsService = new MetricsService();

app.get('/health', (req, res) => {
  const health = healthService.getHealthStatus();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/metrics', (req, res) => {
  const metrics = metricsService.getPrometheusMetrics();
  res.set('Content-Type', 'text/plain').send(metrics);
});

app.post('/auth/validate', authService.validateToken.bind(authService));

app.post('/api/factory/meta-agents', async (req, res) => {
  try {
    const { agentType, config: agentConfig } = req.body;
    const result = await metaAgentFactory.createMetaAgent(agentType, agentConfig);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Meta-agent creation failed:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.get('/api/factory/meta-agents', async (req, res) => {
  try {
    const agents = await metaAgentFactory.listActiveAgents();
    res.json({ success: true, data: agents });
  } catch (error) {
    logger.error('Failed to list meta-agents:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

app.post('/api/factory/meta-agents/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { task } = req.body;
    const result = await metaAgentFactory.executeAgentTask(id, task);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Meta-agent execution failed:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ===== AUTONOMOUS PRD-TO-SOFTWARE ENDPOINT =====
app.post('/api/factory/projects', async (req, res) => {
  try {
    const { prd, projectName } = req.body;

    if (!prd) {
      return res.status(400).json({
        success: false,
        error: 'PRD content is required'
      });
    }

    const name = projectName || 'Generated Project';
    logger.info(`🏗️ Processing autonomous PRD project: ${name}`);

    // Step 1: Enhanced PRD Processing with RAG
    logger.info('🔍 Enhancing PRD analysis with RAG search...');
    const ragResults = await ragSearch(prd.substring(0, 500)); // Search first 500 chars
    logger.info(`📚 Found ${ragResults.length} relevant documentation matches`);

    // Step 2: Create PRD Parser agent with enhanced capabilities
    const prdParser = await metaAgentFactory.createMetaAgent('prd-parser', { 
      verbose: true, 
      generateTasks: true,
      ragContext: ragResults
    });
    
    // Step 3: Parse PRD content with AI enhancement
    const parseTask = await metaAgentFactory.executeAgentTask(prdParser.id, {
      content: prd,
      options: {
        generateTasks: true,
        includeBreakdown: true,
        estimateComplexity: true,
        verbose: true,
        ragEnhanced: true,
        ragContext: ragResults
      }
    });

    logger.info(`📊 Parsed ${parseTask.result.requirements.length} requirements`);

    // Step 4: AI-Enhanced requirement processing
    const enhancedRequirements = parseTask.result.requirements.map((req: any, index: number) => ({
      ...req,
      priority: inferPriority(req.description),
      complexity: inferComplexity(req.description),
      estimatedHours: estimateHours(req.description),
      aiEnhanced: true,
      order: index + 1
    }));

    logger.info(`🧠 AI-enhanced ${enhancedRequirements.length} requirements with priority/complexity inference`);

    // Step 5: Create Scaffold Generator agent  
    const scaffoldGenerator = await metaAgentFactory.createMetaAgent('scaffold-generator', {
      framework: 'fullstack',
      includeTests: true,
      outputDir: '/app/generated',
      memoryEnabled: false,
      overwrite: true,
      aiEnhanced: true
    });

    // Step 6: Generate project with enhanced requirements
    const projectTask = await metaAgentFactory.executeAgentTask(scaffoldGenerator.id, {
      tasks: enhancedRequirements.map((req: any) => ({
        title: req.title,
        description: req.description,
        type: req.type || 'general',
        priority: req.priority,
        complexity: req.complexity,
        estimatedHours: req.estimatedHours,
        aiEnhanced: true
      })),
      metadata: {
        projectName: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: `AI-Enhanced PRD Generation: ${prd.split('\n')[0].replace('#', '').trim()}`,
        technologies: ['Node.js', 'Express', 'React', 'TypeScript'],
        architecture: {
          type: 'fullstack-application',
          framework: 'express'
        },
        aiEnhanced: true,
        ragContext: ragResults.length > 0,
        totalEstimatedHours: enhancedRequirements.reduce((sum: number, req: any) => sum + req.estimatedHours, 0)
      }
    });

    // Step 7: Dispatch to domain agents via NATS (if EventBus connected)
    let natsDispatched = false;
    if (eventBus.isConnected()) {
      try {
        logger.info('🚀 Dispatching enhanced tasks to domain agents via NATS...');
        
        for (const req of enhancedRequirements.slice(0, 3)) { // Dispatch first 3 tasks
          await eventBus.publish('domain.agent.task.assigned', {
            taskId: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            projectId: `project-${Date.now()}`,
            title: req.title,
            description: req.description,
            priority: req.priority,
            complexity: req.complexity,
            estimatedHours: req.estimatedHours,
            type: req.type,
            assignedAt: new Date().toISOString()
          });
        }
        
        natsDispatched = true;
        logger.info(`✅ Dispatched ${Math.min(3, enhancedRequirements.length)} tasks to domain agents`);
      } catch (natsError) {
        logger.error('NATS dispatch failed:', natsError);
      }
    }

    logger.info(`🎉 Successfully generated AI-enhanced project: ${name}`);

    return res.json({
      success: true,
      project: {
        id: `project-${Date.now()}`,
        name,
        status: 'completed',
        aiEnhanced: true,
        ragContext: ragResults.length > 0,
        natsDispatched,
        totalEstimatedHours: enhancedRequirements.reduce((sum: number, req: any) => sum + req.estimatedHours, 0),
        requirements: enhancedRequirements,
        generated: projectTask.result,
        ragResults: ragResults.slice(0, 2), // Include top 2 RAG matches
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Autonomous project generation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const gracefulShutdown = () => {
  logger.info('Received shutdown signal, gracefully closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(config.port, async () => {
  logger.info(`Factory Core server running on port ${config.port}`);
  logger.info('Available Meta-Agents:', metaAgentFactory.getAvailableAgentTypes());
  
  // Initialize EventBus
  try {
    await eventBus.connect();
    logger.info('✅ EventBus connected successfully');
    
    // Set up event subscriptions
    await eventBus.subscribe('factory.task.assigned', async (message) => {
      logger.info('📋 Task assigned:', message.data);
      metricsService.incrementCounter('factory_tasks_assigned_total');
    });

    await eventBus.subscribe('meta.agent.created', async (message) => {
      logger.info('🤖 Meta-agent created:', message.data);
      metricsService.incrementCounter('factory_agents_created_total');
    });

  } catch (error) {
    logger.error('❌ EventBus connection failed:', error);
  }
});