/**
 * Integration Test Setup
 * 
 * Setup specifically for integration tests
 */

const Redis = require('ioredis');

// Integration test configuration
global.integrationConfig = {
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
    db: process.env.TEST_REDIS_DB || 1 // Use separate DB for tests
  },
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    timeout: 10000
  },
  mockServices: {
    enabled: process.env.MOCK_EXTERNAL_SERVICES !== 'false'
  }
};

// Global Redis client for test utilities
global.testRedis = null;

beforeAll(async () => {
  // Initialize test Redis client
  global.testRedis = new Redis({
    ...global.integrationConfig.redis,
    lazyConnect: true
  });
  
  await global.testRedis.connect();
  
  // Select test database
  if (global.integrationConfig.redis.db) {
    await global.testRedis.select(global.integrationConfig.redis.db);
  }
  
  // Clear test database
  await global.testRedis.flushdb();
});

afterAll(async () => {
  // Clean up Redis connection
  if (global.testRedis) {
    await global.testRedis.flushdb();
    global.testRedis.disconnect();
  }
});

// Integration test helpers
global.integrationHelpers = {
  // Wait for Redis key to exist
  waitForRedisKey: async (key, timeout = 5000) => {
    return global.testUtils.waitFor(
      async () => {
        const exists = await global.testRedis.exists(key);
        return exists === 1;
      },
      timeout
    );
  },
  
  // Wait for specific Redis value
  waitForRedisValue: async (key, expectedValue, timeout = 5000) => {
    return global.testUtils.waitFor(
      async () => {
        const value = await global.testRedis.get(key);
        return value === expectedValue;
      },
      timeout
    );
  },
  
  // Clear specific test data pattern
  clearTestData: async (pattern = 'test:*') => {
    const keys = await global.testRedis.keys(pattern);
    if (keys.length > 0) {
      await global.testRedis.del(...keys);
    }
  },
  
  // Create mock service response
  mockServiceResponse: (service, endpoint, response) => {
    if (!global.integrationConfig.mockServices.enabled) {
      return;
    }
    
    // Store mock response in Redis
    const mockKey = `mock:${service}:${endpoint}`;
    return global.testRedis.set(mockKey, JSON.stringify(response), 'EX', 300);
  }
};

// Set longer timeout for integration tests
jest.setTimeout(30000);