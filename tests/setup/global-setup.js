/**
 * Jest Global Setup
 * 
 * Runs once before all test suites
 */

const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

module.exports = async () => {
  console.log('\n🔧 Running global test setup...\n');
  
  // Check environment
  validateEnvironment();
  
  // Setup test directories
  await setupTestDirectories();
  
  // Initialize test database
  await initializeTestDatabase();
  
  // Set global test flags
  process.env.NODE_ENV = 'test';
  process.env.JEST_WORKER_ID = '1';
  
  console.log('✅ Global setup completed\n');
};

function validateEnvironment() {
  console.log('Validating test environment...');
  
  // Check for required environment variables
  const required = [];
  const optional = [
    'REDIS_URL',
    'API_BASE_URL',
    'TEST_REDIS_URL',
    'TEST_REDIS_DB'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Log optional variables
  optional.forEach(key => {
    if (!process.env[key]) {
      console.log(`ℹ️  Optional env var ${key} not set, using defaults`);
    }
  });
}

async function setupTestDirectories() {
  console.log('Setting up test directories...');
  
  const directories = [
    'test-results',
    'coverage',
    'logs/test'
  ];
  
  for (const dir of directories) {
    const fullPath = path.resolve(process.cwd(), dir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error) {
      // Directory may already exist
    }
  }
}

async function initializeTestDatabase() {
  console.log('Initializing test database...');
  
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: process.env.TEST_REDIS_DB || 1,
    lazyConnect: true,
    retryStrategy: () => null
  });
  
  try {
    await redis.connect();
    
    // Clear test database
    await redis.flushdb();
    
    // Set test marker
    await redis.set('test:initialized', new Date().toISOString());
    
    console.log('✓ Test database initialized');
  } catch (error) {
    console.warn('⚠️  Could not initialize test database:', error.message);
    console.warn('   Tests will continue but may fail if Redis is required');
  } finally {
    redis.disconnect();
  }
}