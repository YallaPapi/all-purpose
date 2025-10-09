#!/usr/bin/env node

/**
 * Simple UEP Agent with Capability Advertisement
 * 
 * Example demonstrating how to integrate capability advertisement
 * in agent registration using the UEP Capability Management System.
 * 
 * @version 1.0.0
 * @author TaskMaster Research Implementation - Task 226.3
 */

import { createCapabilityAdvertisement, AgentCapability } from '../src/index.js';
import chalk from 'chalk';

// Define agent capabilities
const capabilities: AgentCapability[] = [
  {
    id: 'text-processing',
    name: 'Advanced Text Processing',
    version: { major: 1, minor: 2, patch: 0 },
    description: 'Natural language processing with sentiment analysis and entity extraction',
    category: 'nlp',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'Input text to process',
        required: true
      },
      {
        name: 'options',
        type: 'object',
        description: 'Processing options',
        required: false,
        defaultValue: { sentiment: true, entities: true }
      }
    ],
    returns: {
      type: 'object',
      description: 'Processing results with sentiment and entities',
      schema: {
        sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
        entities: { type: 'array', items: { type: 'object' } },
        confidence: { type: 'number', minimum: 0, maximum: 1 }
      }
    },
    examples: [
      {
        name: 'Basic sentiment analysis',
        description: 'Analyze sentiment of a simple text',
        input: { text: 'I love this product!', options: { sentiment: true } },
        output: { sentiment: 'positive', confidence: 0.95, entities: [] }
      }
    ],
    performance: {
      averageLatency: 150,
      maxLatency: 500,
      throughput: 100
    },
    tags: ['nlp', 'sentiment', 'entities', 'text']
  },
  {
    id: 'image-classification',
    name: 'Image Classification Service',
    version: { major: 2, minor: 0, patch: 1 },
    description: 'Deep learning-based image classification with multiple model support',
    category: 'computer-vision',
    parameters: [
      {
        name: 'image',
        type: 'string | Buffer',
        description: 'Image data as base64 string or buffer',
        required: true
      },
      {
        name: 'model',
        type: 'string',
        description: 'Classification model to use',
        required: false,
        defaultValue: 'resnet50',
        validation: {
          enum: ['resnet50', 'mobilenet', 'inception']
        }
      }
    ],
    returns: {
      type: 'object',
      description: 'Classification results with confidence scores',
      schema: {
        predictions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              confidence: { type: 'number' }
            }
          }
        }
      }
    },
    performance: {
      averageLatency: 300,
      maxLatency: 1000,
      throughput: 50
    },
    tags: ['computer-vision', 'classification', 'deep-learning']
  }
];

async function main() {
  try {
    console.log(chalk.blue('🤖 Starting Simple UEP Agent...'));
    
    // Create capability advertisement factory
    const factory = createCapabilityAdvertisement(
      'simple-agent-001',
      capabilities,
      'http://localhost:3001' // Registry URL
    );
    
    // Setup event listeners
    factory.on('initialized', () => {
      console.log(chalk.green('✅ Agent initialized'));
    });
    
    factory.on('registered', (data) => {
      console.log(chalk.green(`✅ Agent registered: ${data.agentId} [${data.registrationId}]`));
    });
    
    factory.on('capabilityAdded', (event) => {
      console.log(chalk.blue(`📋 Capability added: ${event.capability.id} v${event.capability.version.major}.${event.capability.version.minor}.${event.capability.version.patch}`));
    });
    
    factory.on('heartbeat', () => {
      console.log(chalk.cyan('💓 Heartbeat sent'));
    });
    
    factory.on('error', (error) => {
      console.error(chalk.red('❌ Agent error:'), error);
    });
    
    // Initialize and start the agent
    await factory.initialize();
    
    // Simulate some capability invocations for performance tracking
    setTimeout(() => {
      // Simulate successful text processing
      factory.recordInvocation('text-processing', 120, true);
      factory.recordInvocation('text-processing', 180, true);
      factory.recordInvocation('text-processing', 95, true);
      
      // Simulate some image classification calls
      factory.recordInvocation('image-classification', 250, true);
      factory.recordInvocation('image-classification', 400, true);
      factory.recordInvocation('image-classification', 320, false, new Error('Model timeout'));
      
      console.log(chalk.cyan('📊 Recorded some capability invocations for performance tracking'));
    }, 5000);
    
    // Simulate adding a new capability after 10 seconds
    setTimeout(async () => {
      const newCapability: AgentCapability = {
        id: 'data-transformation',
        name: 'Data Transformation Service',
        version: { major: 1, minor: 0, patch: 0 },
        description: 'Transform data between different formats (JSON, XML, CSV)',
        category: 'data-processing',
        parameters: [
          {
            name: 'data',
            type: 'any',
            description: 'Input data to transform',
            required: true
          },
          {
            name: 'from',
            type: 'string',
            description: 'Source format',
            required: true,
            validation: { enum: ['json', 'xml', 'csv'] }
          },
          {
            name: 'to',
            type: 'string',
            description: 'Target format',
            required: true,
            validation: { enum: ['json', 'xml', 'csv'] }
          }
        ],
        tags: ['data', 'transformation', 'conversion']
      };
      
      await factory.addCapability(newCapability);
      console.log(chalk.green('🆕 Added new data transformation capability'));
    }, 10000);
    
    // Display status every 30 seconds
    const statusInterval = setInterval(() => {
      const status = factory.getStatus();
      console.log(chalk.magenta('\n📊 Agent Status:'));
      console.log(chalk.magenta(`   Registered: ${status.registered}`));
      console.log(chalk.magenta(`   Capabilities: ${status.capabilitiesCount}`));
      console.log(chalk.magenta(`   Health: ${status.health.status}`));
      console.log(chalk.magenta(`   Uptime: ${status.uptime}s`));
      console.log(chalk.magenta(`   Last Heartbeat: ${status.lastHeartbeat?.toISOString() || 'None'}`));
    }, 30000);
    
    console.log(chalk.green('🚀 Simple UEP Agent is running with capability advertisement'));
    console.log(chalk.blue('Press Ctrl+C to stop the agent gracefully'));
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to start agent:'), error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🔄 Graceful shutdown initiated...'));
  // The factory handles graceful shutdown automatically
});

// Start the agent
main().catch(console.error);