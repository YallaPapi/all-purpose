/**
 * Sample Agent Registration Data
 * Task 220.3: Example registrations for testing and documentation
 */

import { AgentRegistrationMetadata } from '../types/AgentRegistration.js';

export const samplePRDParserRegistration: AgentRegistrationMetadata = {
  agentId: '550e8400-e29b-41d4-a716-446655440001',
  agentName: 'prd-parser-001',
  agentType: 'prd-parser',
  instanceId: 'prd-parser-deployment-78d9c5f6b4-x9k2l',
  
  version: {
    major: 2,
    minor: 0,
    patch: 1,
    prerelease: 'beta.1',
    gitCommit: 'a1b2c3d4e5f6',
    buildDate: '2024-01-27T10:30:00Z'
  },
  
  capabilities: [
    {
      name: 'prd-parsing',
      version: '2.0.1',
      description: 'Parse Product Requirements Documents into structured task lists',
      inputSchema: {
        type: 'object',
        properties: {
          document: { type: 'string' },
          format: { type: 'string', enum: ['markdown', 'docx', 'pdf'] }
        },
        required: ['document']
      },
      outputSchema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] }
              }
            }
          }
        }
      },
      dependencies: ['natural-language-processing', 'document-parsing'],
      resourceRequirements: {
        cpu: { min: '100m', max: '500m', preferred: '250m' },
        memory: { min: '256Mi', max: '1Gi', preferred: '512Mi' },
        storage: { temporary: '100Mi' }
      }
    },
    {
      name: 'requirements-validation',
      version: '1.0.0',
      description: 'Validate requirements for completeness and consistency',
      inputSchema: {
        type: 'object',
        properties: {
          requirements: { type: 'array', items: { type: 'object' } }
        }
      },
      outputSchema: {
        type: 'object',
        properties: {
          isValid: { type: 'boolean' },
          errors: { type: 'array', items: { type: 'string' } },
          warnings: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  ],
  
  supportedProtocols: ['UEP/2.0', 'HTTP/1.1', 'gRPC'],
  
  network: {
    address: '10.244.1.15',
    port: 8080,
    additionalPorts: {
      'grpc': 9090,
      'metrics': 9091
    },
    protocol: 'https',
    tlsEnabled: true,
    healthCheckPort: 8080,
    metricsPort: 9091
  },
  
  resources: {
    cpu: { min: '100m', max: '500m', preferred: '250m' },
    memory: { min: '256Mi', max: '1Gi', preferred: '512Mi' },
    storage: { temporary: '100Mi', persistent: '1Gi' }
  },
  
  currentMetrics: {
    currentLoad: 25.5,
    maxCapacity: 50,
    averageResponseTime: 150.3,
    errorRate: 0.01,
    queueLength: 3,
    lastUpdated: '2024-01-27T10:29:45Z'
  },
  
  healthCheck: {
    endpoint: '/health',
    method: 'GET',
    interval: '15s',
    timeout: '5s',
    initialDelay: '30s',
    failureThreshold: 3,
    successThreshold: 1,
    expectedStatus: 200,
    expectedResponse: 'healthy'
  },
  
  monitoring: {
    metricsEnabled: true,
    metricsEndpoint: '/metrics',
    metricsFormat: 'prometheus',
    tracingEnabled: true,
    tracingEndpoint: '/trace',
    loggingLevel: 'info',
    healthMetrics: true
  },
  
  security: {
    tlsRequired: true,
    certificateFingerprint: 'SHA256:1A:2B:3C:4D:5E:6F:7A:8B:9C:0D:1E:2F:3A:4B:5C:6D',
    allowedClients: ['meta-agent-coordinator', 'uep-gateway'],
    aclTokens: {
      agent: 'uep-agent-token-123',
      service: 'uep-service-token-456'
    },
    encryptionEnabled: true,
    auditLogging: true
  },
  
  environment: 'production',
  cluster: 'uep-prod-cluster',
  namespace: 'uep-agents',
  podName: 'prd-parser-deployment-78d9c5f6b4-x9k2l',
  nodeName: 'worker-node-03',
  
  startTime: '2024-01-27T10:25:00Z',
  lastHeartbeat: '2024-01-27T10:29:45Z',
  registrationTime: '2024-01-27T10:25:30Z',
  status: 'healthy',
  
  configuration: {
    maxDocumentSize: '10MB',
    supportedFormats: ['markdown', 'docx', 'pdf'],
    cacheEnabled: true,
    cacheTTL: '1h',
    debugMode: false
  },
  
  featureFlags: {
    enhancedValidation: true,
    asyncProcessing: true,
    experimentalParser: false
  },
  
  labels: {
    'app.kubernetes.io/name': 'prd-parser',
    'app.kubernetes.io/version': '2.0.1',
    'app.kubernetes.io/component': 'meta-agent',
    'app.kubernetes.io/part-of': 'uep-factory',
    'app.kubernetes.io/managed-by': 'uep-orchestrator'
  },
  
  annotations: {
    'uep.ai/agent-description': 'Parses PRDs into structured task lists',
    'uep.ai/last-updated': '2024-01-27T10:25:30Z',
    'uep.ai/deployment-version': 'v2.0.1-beta.1',
    'prometheus.io/scrape': 'true',
    'prometheus.io/port': '9091',
    'prometheus.io/path': '/metrics'
  }
};

export const sampleScaffoldGeneratorRegistration: AgentRegistrationMetadata = {
  agentId: '550e8400-e29b-41d4-a716-446655440002',
  agentName: 'scaffold-generator-001',
  agentType: 'scaffold-generator',
  instanceId: 'scaffold-generator-deployment-65b7f8d9c-m4n8p',
  
  version: {
    major: 1,
    minor: 5,
    patch: 0,
    gitCommit: 'f6e5d4c3b2a1',
    buildDate: '2024-01-26T15:20:00Z'
  },
  
  capabilities: [
    {
      name: 'project-scaffolding',
      version: '1.5.0',
      description: 'Generate complete project structures from templates',
      inputSchema: {
        type: 'object',
        properties: {
          template: { type: 'string' },
          projectName: { type: 'string' },
          options: { type: 'object' }
        },
        required: ['template', 'projectName']
      },
      outputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string' },
          generatedFiles: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' }
        }
      },
      resourceRequirements: {
        cpu: { min: '200m', max: '1000m', preferred: '500m' },
        memory: { min: '512Mi', max: '2Gi', preferred: '1Gi' },
        storage: { temporary: '500Mi', persistent: '5Gi' }
      }
    },
    {
      name: 'template-validation',
      version: '1.0.0',
      description: 'Validate project templates for correctness',
      inputSchema: {
        type: 'object',
        properties: {
          templatePath: { type: 'string' }
        }
      }
    }
  ],
  
  supportedProtocols: ['UEP/2.0', 'HTTP/2'],
  
  network: {
    address: '10.244.2.22',
    port: 8080,
    additionalPorts: {
      'metrics': 9092
    },
    protocol: 'https',
    tlsEnabled: true,
    metricsPort: 9092
  },
  
  resources: {
    cpu: { min: '200m', max: '1000m', preferred: '500m' },
    memory: { min: '512Mi', max: '2Gi', preferred: '1Gi' },
    storage: { temporary: '500Mi', persistent: '5Gi' }
  },
  
  currentMetrics: {
    currentLoad: 45.2,
    maxCapacity: 20,
    averageResponseTime: 2500.7,
    errorRate: 0.005,
    queueLength: 2,
    lastUpdated: '2024-01-27T10:29:50Z'
  },
  
  healthCheck: {
    endpoint: '/health',
    method: 'GET',
    interval: '30s',
    timeout: '10s',
    failureThreshold: 2,
    successThreshold: 1
  },
  
  monitoring: {
    metricsEnabled: true,
    metricsEndpoint: '/metrics',
    metricsFormat: 'prometheus',
    tracingEnabled: false,
    loggingLevel: 'warn',
    healthMetrics: true
  },
  
  security: {
    tlsRequired: true,
    encryptionEnabled: true,
    auditLogging: false
  },
  
  environment: 'production',
  cluster: 'uep-prod-cluster',
  namespace: 'uep-agents',
  podName: 'scaffold-generator-deployment-65b7f8d9c-m4n8p',
  nodeName: 'worker-node-01',
  
  startTime: '2024-01-27T09:15:00Z',
  lastHeartbeat: '2024-01-27T10:29:50Z',
  registrationTime: '2024-01-27T09:15:45Z',
  status: 'healthy',
  
  configuration: {
    templatesPath: '/app/templates',
    outputPath: '/app/generated',
    maxConcurrentProjects: 5,
    cleanupAfter: '24h'
  },
  
  featureFlags: {
    advancedTemplating: true,
    incrementalGeneration: false,
    templateCaching: true
  },
  
  labels: {
    'app.kubernetes.io/name': 'scaffold-generator',
    'app.kubernetes.io/version': '1.5.0',
    'app.kubernetes.io/component': 'meta-agent'
  },
  
  annotations: {
    'uep.ai/agent-description': 'Generates project scaffolds from templates',
    'uep.ai/last-updated': '2024-01-27T09:15:45Z'
  }
};

export const sampleDevelopmentAgentRegistration: AgentRegistrationMetadata = {
  agentId: '550e8400-e29b-41d4-a716-446655440003',
  agentName: 'infra-orchestrator-dev',
  agentType: 'infra-orchestrator',
  instanceId: 'infra-orchestrator-dev-001',
  
  version: {
    major: 0,
    minor: 8,
    patch: 0,
    prerelease: 'alpha.2',
    gitCommit: 'dev-branch-abc123',
    buildDate: '2024-01-27T08:00:00Z'
  },
  
  capabilities: [
    {
      name: 'infrastructure-orchestration',
      version: '0.8.0-alpha.2',
      description: 'Development version of infrastructure orchestration',
      resourceRequirements: {
        cpu: { min: '50m', max: '200m', preferred: '100m' },
        memory: { min: '128Mi', max: '512Mi', preferred: '256Mi' }
      }
    }
  ],
  
  supportedProtocols: ['UEP/2.0', 'HTTP/1.1'],
  
  network: {
    address: '192.168.1.100',
    port: 3000,
    protocol: 'http',
    tlsEnabled: false
  },
  
  resources: {
    cpu: { min: '50m', max: '200m', preferred: '100m' },
    memory: { min: '128Mi', max: '512Mi', preferred: '256Mi' }
  },
  
  currentMetrics: {
    currentLoad: 10.5,
    maxCapacity: 10,
    averageResponseTime: 50.2,
    errorRate: 0.02,
    queueLength: 0,
    lastUpdated: '2024-01-27T10:29:55Z'
  },
  
  healthCheck: {
    endpoint: '/health',
    method: 'GET',
    interval: '10s',
    timeout: '3s',
    failureThreshold: 5,
    successThreshold: 1
  },
  
  monitoring: {
    metricsEnabled: true,
    metricsEndpoint: '/metrics',
    metricsFormat: 'json',
    tracingEnabled: true,
    loggingLevel: 'debug',
    healthMetrics: true
  },
  
  security: {
    tlsRequired: false,
    encryptionEnabled: false,
    auditLogging: true
  },
  
  environment: 'development',
  cluster: 'uep-dev-cluster',
  namespace: 'uep-dev',
  
  startTime: '2024-01-27T10:00:00Z',
  lastHeartbeat: '2024-01-27T10:29:55Z',
  registrationTime: '2024-01-27T10:00:30Z',
  status: 'healthy',
  
  configuration: {
    debugMode: true,
    verboseLogging: true,
    experimentalFeatures: true
  },
  
  featureFlags: {
    newOrchestrationEngine: true,
    experimentalTemplates: true,
    debugMetrics: true
  },
  
  labels: {
    'app.kubernetes.io/name': 'infra-orchestrator',
    'app.kubernetes.io/version': '0.8.0-alpha.2',
    'app.kubernetes.io/component': 'meta-agent',
    'environment': 'development'
  },
  
  annotations: {
    'uep.ai/agent-description': 'Development infrastructure orchestrator',
    'uep.ai/experimental': 'true',
    'uep.ai/debug-mode': 'enabled'
  }
};

// Sample registration update
export const sampleAgentUpdate = {
  agentId: '550e8400-e29b-41d4-a716-446655440001',
  lastHeartbeat: '2024-01-27T10:35:00Z',
  currentMetrics: {
    currentLoad: 35.8,
    maxCapacity: 50,
    averageResponseTime: 145.2,
    errorRate: 0.008,
    queueLength: 5,
    lastUpdated: '2024-01-27T10:35:00Z'
  },
  status: 'healthy' as const
};

// Sample service discovery queries
export const sampleQueries = {
  findPRDParsers: {
    agentType: 'prd-parser',
    environment: 'production',
    healthyOnly: true,
    maxLoad: 80
  },
  
  findAvailableAgents: {
    capabilities: ['project-scaffolding'],
    maxLoad: 70,
    sortBy: 'load' as const,
    sortOrder: 'asc' as const,
    limit: 5
  },
  
  findDevelopmentAgents: {
    environment: 'development',
    cluster: 'uep-dev-cluster',
    sortBy: 'registration_time' as const,
    sortOrder: 'desc' as const
  }
};

export const allSampleRegistrations = [
  samplePRDParserRegistration,
  sampleScaffoldGeneratorRegistration,
  sampleDevelopmentAgentRegistration
];