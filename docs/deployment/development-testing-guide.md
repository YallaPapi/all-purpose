# 🚀 **Development and Testing Guide**

## **All-Purpose Meta-Agent Factory Developer Manual**

**Version**: 1.0.0  
**Last Updated**: August 1, 2025  
**Target Audience**: Software Developers, DevOps Engineers, Contributors  
**Tech Stack**: Node.js, TypeScript, Docker, Jest, Redis, WebSocket

---

## 📚 **Table of Contents**

1. [Local Development Setup](#local-development-setup)
   - [Prerequisites](#prerequisites)
   - [Environment Configuration](#environment-configuration)
   - [Quick Start](#quick-start)
   - [Development Workflow](#development-workflow)
2. [Testing Framework](#testing-framework)
   - [Test Structure](#test-structure)
   - [Unit Testing](#unit-testing)
   - [Integration Testing](#integration-testing)
   - [E2E Testing](#e2e-testing)
   - [Test Coverage](#test-coverage)
3. [Agent Development Guide](#agent-development-guide)
   - [Agent Architecture](#agent-architecture)
   - [Creating New Agents](#creating-new-agents)
   - [Agent Interfaces](#agent-interfaces)
   - [Capability Management](#capability-management)
4. [Contributing Guidelines](#contributing-guidelines)
   - [Code Standards](#code-standards)
   - [Pull Request Process](#pull-request-process)
   - [Documentation Requirements](#documentation-requirements)
5. [Best Practices](#best-practices)

---

## 💻 **Local Development Setup**

### **Prerequisites**

Ensure you have the following installed:

```bash
# Check Node.js version (20.x LTS required)
node --version  # Should output v20.x.x

# Check npm version (10.x required)
npm --version   # Should output 10.x.x

# Check Docker and Docker Compose
docker --version         # Should output Docker version 24.x
docker compose version   # Should output v2.20+

# Check Git
git --version   # Should output git version 2.x
```

### **Environment Configuration**

1. **Clone the repository**:
```bash
git clone https://github.com/your-org/all-purpose-meta-agent-factory.git
cd all-purpose-meta-agent-factory
```

2. **Install dependencies**:
```bash
# Install root dependencies
npm install

# Install agent dependencies
npm run install:agents
```

3. **Configure environment**:
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Required: API keys, Redis password, WebSocket secret
```

4. **Setup Git hooks**:
```bash
# Install Husky for pre-commit hooks
npm run prepare

# This enables:
# - Linting on commit
# - Type checking
# - Test running
```

### **Quick Start**

```bash
# 1. Start infrastructure (Redis, monitoring)
docker compose up -d redis-master redis-sentinel-1 redis-sentinel-2 redis-sentinel-3

# 2. Start development servers
npm run dev

# 3. In separate terminals, start individual agents
npm run dev:orchestrator
npm run dev:parameter-flow
npm run dev:scaffold

# 4. Access services
# - Web UI: http://localhost:3000
# - Orchestrator: http://localhost:3001
# - WebSocket Hub: http://localhost:8080
# - Prometheus: http://localhost:9090
```

### **Development Workflow**

#### **1. TypeScript Watch Mode**
```bash
# Compile TypeScript with watch mode
npm run build:watch

# Or for specific agent
cd agents/infrastructure-orchestrator
npm run build:watch
```

#### **2. Debugging with VS Code**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Orchestrator",
      "program": "${workspaceFolder}/agents/infrastructure-orchestrator/src/index.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/agents/infrastructure-orchestrator/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      }
    }
  ]
}
```

#### **3. Hot Reload Development**
```bash
# Using nodemon for hot reload
npm run dev:hot

# Or manually with nodemon
nodemon --watch src --ext ts --exec 'npm run build && npm start'
```

---

## 🧪 **Testing Framework**

### **Test Structure**

```
tests/
├── unit/                    # Unit tests
│   ├── agents/             # Agent-specific tests
│   ├── services/           # Service tests
│   └── utils/              # Utility tests
├── integration/            # Integration tests
│   ├── redis/             # Redis integration
│   ├── websocket/         # WebSocket tests
│   └── api/               # API endpoint tests
├── e2e/                   # End-to-end tests
│   └── workflows/         # Complete workflow tests
└── fixtures/              # Test data and mocks
    ├── mocks/            # Mock implementations
    └── data/             # Test data files
```

### **Unit Testing**

#### **Basic Test Example**
```typescript
// agents/infrastructure-orchestrator/src/services/task-queue.test.ts
import { TaskQueue } from './task-queue';
import { jest } from '@jest/globals';

describe('TaskQueue', () => {
  let taskQueue: TaskQueue;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Setup mocks
    mockRedis = {
      lpush: jest.fn().mockResolvedValue(1),
      rpop: jest.fn().mockResolvedValue(null),
      llen: jest.fn().mockResolvedValue(0),
    } as any;

    taskQueue = new TaskQueue(mockRedis);
  });

  describe('enqueue', () => {
    it('should add task to queue', async () => {
      const task = { id: 'task-1', type: 'scaffold', payload: {} };
      
      await taskQueue.enqueue(task);
      
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'task:queue:pending',
        JSON.stringify(task)
      );
    });

    it('should handle Redis errors', async () => {
      mockRedis.lpush.mockRejectedValueOnce(new Error('Redis error'));
      
      const task = { id: 'task-1', type: 'scaffold', payload: {} };
      
      await expect(taskQueue.enqueue(task)).rejects.toThrow('Redis error');
    });
  });

  describe('dequeue', () => {
    it('should return null when queue is empty', async () => {
      mockRedis.rpop.mockResolvedValueOnce(null);
      
      const result = await taskQueue.dequeue();
      
      expect(result).toBeNull();
    });

    it('should return parsed task when available', async () => {
      const task = { id: 'task-1', type: 'scaffold', payload: {} };
      mockRedis.rpop.mockResolvedValueOnce(JSON.stringify(task));
      
      const result = await taskQueue.dequeue();
      
      expect(result).toEqual(task);
    });
  });
});
```

#### **Mocking Dependencies**
```typescript
// __mocks__/ioredis.ts
export const Redis = jest.fn().mockImplementation(() => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
}));
```

#### **Testing Async Code**
```typescript
// Testing promises and async/await
describe('AgentRegistry', () => {
  it('should register agent with TTL', async () => {
    const agent = {
      id: 'agent-1',
      name: 'test-agent',
      capabilities: ['scaffold', 'template'],
    };

    await agentRegistry.register(agent);

    expect(mockRedis.hset).toHaveBeenCalledWith(
      'agents:registry',
      agent.id,
      JSON.stringify(agent)
    );
    expect(mockRedis.expire).toHaveBeenCalledWith(
      `agents:registry:${agent.id}`,
      30
    );
  });

  it('should handle registration failures', async () => {
    mockRedis.hset.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(
      agentRegistry.register({ id: 'agent-1' })
    ).rejects.toThrow('Connection failed');
  });
});
```

### **Integration Testing**

#### **Testing with Real Services**
```typescript
// tests/integration/redis/connection.test.ts
import { Redis } from 'ioredis';
import { RedisService } from '../../../src/services/redis';

describe('Redis Integration', () => {
  let redisService: RedisService;

  beforeAll(async () => {
    redisService = new RedisService({
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
    });
    await redisService.connect();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it('should perform basic operations', async () => {
    const key = 'test:key';
    const value = 'test-value';

    await redisService.set(key, value);
    const result = await redisService.get(key);

    expect(result).toBe(value);

    await redisService.del(key);
  });

  it('should handle pub/sub', async (done) => {
    const channel = 'test:channel';
    const message = { type: 'test', data: 'hello' };

    redisService.subscribe(channel, (received) => {
      expect(received).toEqual(message);
      done();
    });

    setTimeout(() => {
      redisService.publish(channel, message);
    }, 100);
  });
});
```

#### **Docker Compose for Testing**
```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    environment:
      - REDIS_PASSWORD=test-password
    command: redis-server --requirepass test-password

  test-db:
    image: postgres:15-alpine
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_PASSWORD=test-password
      - POSTGRES_DB=test_db
```

```bash
# Run integration tests
docker compose -f docker-compose.test.yml up -d
npm run test:integration
docker compose -f docker-compose.test.yml down
```

### **E2E Testing**

#### **Complete Workflow Test**
```typescript
// tests/e2e/workflows/project-generation.test.ts
import { MetaAgentFactory } from '../../../src/factory';
import { waitForCompletion } from '../../helpers/async';

describe('Project Generation E2E', () => {
  let factory: MetaAgentFactory;

  beforeAll(async () => {
    factory = new MetaAgentFactory();
    await factory.initialize();
  }, 30000);

  afterAll(async () => {
    await factory.shutdown();
  });

  it('should generate complete project from PRD', async () => {
    const prd = {
      name: 'test-api',
      description: 'Simple REST API with health check',
      requirements: [
        'Express.js server',
        'Health endpoint',
        'Docker support',
      ],
    };

    const result = await factory.generateProject(prd);

    expect(result.status).toBe('completed');
    expect(result.artifacts).toContain('package.json');
    expect(result.artifacts).toContain('Dockerfile');
    expect(result.artifacts).toContain('src/index.js');
    
    // Verify generated code works
    const { stdout } = await exec('npm test', {
      cwd: result.outputPath,
    });
    expect(stdout).toContain('All tests passed');
  }, 60000);
});
```

### **Test Coverage**

#### **Jest Configuration**
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

#### **Running Tests with Coverage**
```bash
# Run all tests with coverage
npm run test:coverage

# Run specific test file
npm test -- task-queue.test.ts

# Run tests in watch mode
npm run test:watch

# Generate HTML coverage report
npm run test:coverage -- --coverageReporters=html
# Open coverage/index.html
```

---

## 🏗️ **Agent Development Guide**

### **Agent Architecture**

#### **Base Agent Interface**
```typescript
// src/interfaces/agent.interface.ts
export interface IAgent {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  capabilities: Capability[];
  status: AgentStatus;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Health checks
  healthCheck(): Promise<HealthStatus>;
  
  // Task handling
  canHandle(task: Task): boolean;
  handleTask(task: Task): Promise<TaskResult>;
}

export interface Capability {
  id: string;
  name: string;
  version: string; // SemVer
  description: string;
  parameters?: Record<string, unknown>;
  deprecated?: boolean;
}

export interface AgentRegistration {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  endpoint: string;
  capabilities: Capability[];
  metadata?: Record<string, unknown>;
  lastHeartbeat: number;
}
```

#### **Base Agent Class**
```typescript
// src/agents/base-agent.ts
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { io, Socket } from 'socket.io-client';
import { IAgent, AgentConfig, Task, TaskResult } from '../interfaces';

export abstract class BaseAgent extends EventEmitter implements IAgent {
  protected redis: Redis;
  protected websocket: Socket;
  protected config: AgentConfig;
  protected heartbeatInterval?: NodeJS.Timer;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.id = config.id || `${config.type}-${Date.now()}`;
    this.name = config.name;
    this.type = config.type;
    this.version = config.version || '1.0.0';
    this.status = 'initializing';
  }

  async initialize(): Promise<void> {
    // Connect to Redis
    this.redis = new Redis({
      host: this.config.redisHost,
      port: this.config.redisPort,
      password: this.config.redisPassword,
    });

    // Connect to WebSocket hub
    this.websocket = io(this.config.websocketUrl, {
      auth: {
        agentId: this.id,
        secret: this.config.websocketSecret,
      },
    });

    // Setup event handlers
    this.setupEventHandlers();

    // Register with service registry
    await this.register();

    // Start heartbeat
    this.startHeartbeat();
  }

  protected async register(): Promise<void> {
    const registration = {
      id: this.id,
      name: this.name,
      type: this.type,
      status: 'healthy',
      endpoint: `http://${this.config.host}:${this.config.port}`,
      capabilities: this.capabilities,
      metadata: {
        version: this.version,
        startTime: Date.now(),
      },
      lastHeartbeat: Date.now(),
    };

    await this.redis.hset(
      'agents:registry',
      this.id,
      JSON.stringify(registration)
    );

    await this.redis.expire(`agents:registry:${this.id}`, 30);
    
    // Publish registration event
    await this.redis.publish('agent:registered', JSON.stringify({
      agentId: this.id,
      type: this.type,
      capabilities: this.capabilities,
    }));
  }

  protected startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.redis.expire(`agents:registry:${this.id}`, 30);
        this.websocket.emit('heartbeat', {
          agentId: this.id,
          status: this.status,
          timestamp: Date.now(),
        });
      } catch (error) {
        this.emit('error', error);
      }
    }, 10000); // Every 10 seconds
  }

  protected setupEventHandlers(): void {
    // Redis Pub/Sub
    this.redis.subscribe('task:assigned', 'config:updated');
    this.redis.on('message', this.handleRedisMessage.bind(this));

    // WebSocket events
    this.websocket.on('task:execute', this.handleWebSocketTask.bind(this));
    this.websocket.on('health:check', this.handleHealthCheck.bind(this));
  }

  abstract canHandle(task: Task): boolean;
  abstract handleTask(task: Task): Promise<TaskResult>;
}
```

### **Creating New Agents**

#### **Step 1: Define Agent Specification**
```typescript
// agents/new-agent/src/interfaces/new-agent.interface.ts
export interface NewAgentConfig extends AgentConfig {
  specificOption: string;
  customSetting: number;
}

export interface NewAgentCapability extends Capability {
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}
```

#### **Step 2: Implement Agent Class**
```typescript
// agents/new-agent/src/new-agent.ts
import { BaseAgent } from '@all-purpose/core';
import { Task, TaskResult } from '@all-purpose/interfaces';
import { NewAgentConfig } from './interfaces';

export class NewAgent extends BaseAgent {
  capabilities = [
    {
      id: 'new-capability',
      name: 'New Capability',
      version: '1.0.0',
      description: 'Does something new',
      parameters: {
        requiredParam: { type: 'string', required: true },
        optionalParam: { type: 'number', required: false },
      },
    },
  ];

  constructor(config: NewAgentConfig) {
    super(config);
    // Additional initialization
  }

  canHandle(task: Task): boolean {
    return task.type === 'new-task-type' && 
           task.capability === 'new-capability';
  }

  async handleTask(task: Task): Promise<TaskResult> {
    try {
      // Validate task
      this.validateTask(task);

      // Process task
      const result = await this.processTask(task);

      // Return result
      return {
        taskId: task.id,
        status: 'completed',
        output: result,
        metrics: {
          duration: Date.now() - task.startTime,
          resourceUsage: process.memoryUsage(),
        },
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: 'failed',
        error: error.message,
        stack: error.stack,
      };
    }
  }

  private async processTask(task: Task): Promise<any> {
    // Your agent logic here
    return { success: true };
  }

  async healthCheck(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkRedisConnection(),
      this.checkWebSocketConnection(),
      this.checkCustomHealth(),
    ]);

    const allHealthy = checks.every(c => c.healthy);
    
    return {
      healthy: allHealthy,
      checks,
      timestamp: Date.now(),
    };
  }
}
```

#### **Step 3: Add Tests**
```typescript
// agents/new-agent/tests/new-agent.test.ts
import { NewAgent } from '../src/new-agent';
import { mockTask, mockConfig } from './fixtures';

describe('NewAgent', () => {
  let agent: NewAgent;

  beforeEach(async () => {
    agent = new NewAgent(mockConfig);
    await agent.initialize();
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  describe('canHandle', () => {
    it('should handle new-task-type tasks', () => {
      const task = { ...mockTask, type: 'new-task-type' };
      expect(agent.canHandle(task)).toBe(true);
    });

    it('should reject other task types', () => {
      const task = { ...mockTask, type: 'other-type' };
      expect(agent.canHandle(task)).toBe(false);
    });
  });

  describe('handleTask', () => {
    it('should process task successfully', async () => {
      const result = await agent.handleTask(mockTask);
      
      expect(result.status).toBe('completed');
      expect(result.output).toHaveProperty('success', true);
    });

    it('should handle errors gracefully', async () => {
      const badTask = { ...mockTask, payload: null };
      const result = await agent.handleTask(badTask);
      
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    });
  });
});
```

#### **Step 4: Create Dockerfile**
```dockerfile
# agents/new-agent/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

#### **Step 5: Add to Docker Compose**
```yaml
# docker-compose.yml additions
new-agent:
  build:
    context: ./agents/new-agent
    dockerfile: Dockerfile
  ports:
    - "3020:3000"
  environment:
    <<: *common-variables
    PORT: 3000
    AGENT_ID: new-agent
    AGENT_TYPE: new-agent
    SPECIFIC_OPTION: ${NEW_AGENT_OPTION}
  networks:
    - agent-network
  depends_on:
    redis-master:
      condition: service_healthy
    websocket-hub:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
```

### **Agent Interfaces**

#### **Task Interface**
```typescript
export interface Task {
  id: string;
  type: TaskType;
  capability: string;
  priority: Priority;
  payload: Record<string, any>;
  metadata: {
    createdAt: number;
    createdBy: string;
    correlationId: string;
    timeout?: number;
  };
  constraints?: {
    deadline?: number;
    resources?: ResourceConstraints;
    dependencies?: string[];
  };
}
```

#### **Event-Driven Communication**
```typescript
// Event patterns for Redis Pub/Sub
export const EventPatterns = {
  // Task events
  TASK_CREATED: 'task:created',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STARTED: 'task:started',
  TASK_PROGRESS: 'task:progress',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',

  // Agent events  
  AGENT_REGISTERED: 'agent:registered',
  AGENT_UPDATED: 'agent:updated',
  AGENT_OFFLINE: 'agent:offline',
  AGENT_ONLINE: 'agent:online',

  // System events
  CONFIG_UPDATED: 'config:updated',
  LEADER_ELECTED: 'leader:elected',
  SYSTEM_ALERT: 'system:alert',
};
```

### **Capability Management**

#### **Dynamic Capability Registration**
```typescript
export class CapabilityManager {
  private capabilities: Map<string, Capability> = new Map();

  register(capability: Capability): void {
    const key = `${capability.id}@${capability.version}`;
    this.capabilities.set(key, capability);
    
    // Publish capability update
    this.publishUpdate('capability:registered', capability);
  }

  deprecate(capabilityId: string, version: string): void {
    const key = `${capabilityId}@${version}`;
    const capability = this.capabilities.get(key);
    
    if (capability) {
      capability.deprecated = true;
      this.publishUpdate('capability:deprecated', capability);
    }
  }

  findCompatible(requirement: CapabilityRequirement): Capability[] {
    return Array.from(this.capabilities.values())
      .filter(cap => 
        cap.id === requirement.id &&
        semver.satisfies(cap.version, requirement.versionRange) &&
        !cap.deprecated
      )
      .sort((a, b) => semver.rcompare(a.version, b.version));
  }
}
```

---

## 📝 **Contributing Guidelines**

### **Code Standards**

#### **TypeScript Style Guide**
```typescript
// ✅ Good
export class AgentService {
  private readonly redis: Redis;
  private readonly config: AgentConfig;

  constructor(
    redis: Redis,
    config: AgentConfig,
  ) {
    this.redis = redis;
    this.config = config;
  }

  async processTask(task: Task): Promise<TaskResult> {
    // Use early returns
    if (!this.canProcess(task)) {
      return { status: 'skipped', reason: 'Cannot process task type' };
    }

    try {
      const result = await this.executeTask(task);
      return { status: 'completed', output: result };
    } catch (error) {
      // Proper error handling
      logger.error('Task processing failed', { task, error });
      return { status: 'failed', error: error.message };
    }
  }
}

// ❌ Bad
export class agentservice {
  redis;
  config;

  constructor(redis, config) {
    this.redis = redis
    this.config = config
  }

  async processtask(task) {
    if (this.canProcess(task)) {
      try {
        const result = await this.executeTask(task)
        return { status: 'completed', output: result }
      } catch (e) {
        console.log(e)
        return { status: 'failed' }
      }
    } else {
      return { status: 'skipped' }
    }
  }
}
```

#### **Naming Conventions**
- **Files**: `kebab-case.ts` (e.g., `task-queue.ts`)
- **Classes**: `PascalCase` (e.g., `TaskQueue`)
- **Interfaces**: `I` prefix (e.g., `ITaskQueue`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Functions**: `camelCase` (e.g., `processTask`)
- **Private methods**: `_` prefix (e.g., `_validateTask`)

### **Pull Request Process**

#### **1. Branch Naming**
```bash
# Feature branches
feature/add-new-agent
feature/improve-task-queue

# Bug fixes
fix/redis-connection-leak
fix/websocket-reconnect

# Documentation
docs/update-api-reference
docs/add-deployment-guide

# Refactoring
refactor/simplify-agent-registry
refactor/extract-common-interfaces
```

#### **2. Commit Messages**
```bash
# Format: <type>(<scope>): <subject>

# Examples
feat(orchestrator): add task prioritization support
fix(redis): handle connection timeout gracefully
docs(api): update endpoint documentation
test(agent): add integration tests for registration
refactor(core): extract base agent class
chore(deps): update dependencies
```

#### **3. PR Template**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
```

### **Documentation Requirements**

#### **Code Documentation**
```typescript
/**
 * Manages task distribution across available agents
 * 
 * @example
 * ```typescript
 * const orchestrator = new TaskOrchestrator(redis, agentRegistry);
 * await orchestrator.distributeTask(task);
 * ```
 */
export class TaskOrchestrator {
  /**
   * Creates a new TaskOrchestrator instance
   * 
   * @param redis - Redis client for state management
   * @param agentRegistry - Registry for agent discovery
   * @param options - Optional configuration
   */
  constructor(
    private readonly redis: Redis,
    private readonly agentRegistry: AgentRegistry,
    private readonly options?: OrchestratorOptions,
  ) {}

  /**
   * Distributes a task to the most suitable agent
   * 
   * @param task - The task to distribute
   * @returns Promise resolving to the assigned agent ID
   * @throws {NoAgentAvailableError} When no suitable agent is found
   */
  async distributeTask(task: Task): Promise<string> {
    // Implementation
  }
}
```

#### **API Documentation**
```typescript
/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskResponse'
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
```

---

## 🎯 **Best Practices**

### **1. Dependency Injection**
```typescript
// Use dependency injection for testability
export class AgentService {
  constructor(
    private readonly redis: Redis,
    private readonly websocket: Socket,
    private readonly config: AgentConfig,
    private readonly logger: Logger = defaultLogger,
  ) {}
}

// In tests, inject mocks
const mockRedis = createMockRedis();
const mockWebsocket = createMockWebsocket();
const service = new AgentService(mockRedis, mockWebsocket, testConfig);
```

### **2. Error Handling**
```typescript
// Define custom error types
export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

// Use error boundaries
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof AgentError) {
    // Handle known errors
    logger.warn('Agent error occurred', { code: error.code, details: error.details });
    return handleAgentError(error);
  }
  
  // Log and re-throw unknown errors
  logger.error('Unexpected error', { error });
  throw error;
}
```

### **3. Resource Management**
```typescript
// Always clean up resources
export class AgentConnection {
  private resources: Resource[] = [];

  async connect(): Promise<void> {
    const redis = new Redis(this.config);
    this.resources.push(redis);
    
    const websocket = io(this.websocketUrl);
    this.resources.push(websocket);
  }

  async disconnect(): Promise<void> {
    await Promise.all(
      this.resources.map(resource => resource.close())
    );
    this.resources = [];
  }
}
```

### **4. Performance Optimization**
```typescript
// Use caching for expensive operations
export class CapabilityCache {
  private cache = new Map<string, CachedCapability>();
  private readonly TTL = 60000; // 1 minute

  async getCapability(id: string): Promise<Capability> {
    const cached = this.cache.get(id);
    
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.capability;
    }

    const capability = await this.fetchCapability(id);
    this.cache.set(id, {
      capability,
      timestamp: Date.now(),
    });

    return capability;
  }
}
```

### **5. Monitoring and Observability**
```typescript
// Add metrics and tracing
import { metrics, trace } from '@all-purpose/telemetry';

export class TaskProcessor {
  private readonly taskCounter = metrics.createCounter('tasks_processed_total');
  private readonly taskDuration = metrics.createHistogram('task_duration_seconds');

  async processTask(task: Task): Promise<TaskResult> {
    const span = trace.startSpan('processTask', {
      attributes: {
        'task.id': task.id,
        'task.type': task.type,
      },
    });

    const timer = this.taskDuration.startTimer();

    try {
      const result = await this._processTask(task);
      
      this.taskCounter.inc({
        status: 'success',
        type: task.type,
      });

      return result;
    } catch (error) {
      this.taskCounter.inc({
        status: 'error',
        type: task.type,
      });
      
      span.recordException(error);
      throw error;
    } finally {
      timer();
      span.end();
    }
  }
}
```

---

## 🚀 **Quick Reference**

### **Common Commands**
```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build TypeScript
npm run build:watch           # Build with watch mode
npm run lint                  # Run ESLint
npm run lint:fix              # Fix linting issues
npm run format                # Format with Prettier

# Testing
npm test                      # Run all tests
npm run test:unit            # Run unit tests only
npm run test:integration     # Run integration tests
npm run test:e2e             # Run E2E tests
npm run test:coverage        # Generate coverage report
npm run test:watch           # Run tests in watch mode

# Docker
docker compose up -d          # Start all services
docker compose logs -f        # View logs
docker compose ps            # List services
docker compose down          # Stop all services

# Agent specific
npm run dev:orchestrator     # Start orchestrator in dev mode
npm run dev:agents           # Start all agents in dev mode
npm run build:agents         # Build all agents
```

### **Debugging Tips**
```bash
# Enable debug logging
export LOG_LEVEL=debug
export DEBUG=all-purpose:*

# Node.js debugging
node --inspect dist/index.js
node --inspect-brk dist/index.js

# Docker debugging
docker compose exec [service] node --inspect=0.0.0.0:9229 dist/index.js

# Memory profiling
node --expose-gc --max-old-space-size=512 dist/index.js

# CPU profiling
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt
```

---

**This development and testing guide provides comprehensive instructions for contributing to the All-Purpose Meta-Agent Factory. Follow these guidelines to ensure code quality, maintainability, and successful collaboration.**