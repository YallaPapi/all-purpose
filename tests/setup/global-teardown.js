/**
 * Jest Global Teardown
 * 
 * Runs once after all test suites
 */

const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

module.exports = async () => {
  console.log('\n🧹 Running global test teardown...\n');
  
  // Clean up test database
  await cleanupTestDatabase();
  
  // Generate test report summary
  await generateTestSummary();
  
  // Clean up temporary files
  await cleanupTempFiles();
  
  console.log('✅ Global teardown completed\n');
};

async function cleanupTestDatabase() {
  console.log('Cleaning up test database...');
  
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: process.env.TEST_REDIS_DB || 1,
    lazyConnect: true,
    retryStrategy: () => null
  });
  
  try {
    await redis.connect();
    
    // Clear all test data
    const testPatterns = [
      'test:*',
      'test-*',
      'e2e:*',
      'integration:*',
      'mock:*'
    ];
    
    for (const pattern of testPatterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`  Cleared ${keys.length} keys matching ${pattern}`);
      }
    }
    
    console.log('✓ Test database cleaned');
  } catch (error) {
    console.warn('⚠️  Could not clean test database:', error.message);
  } finally {
    redis.disconnect();
  }
}

async function generateTestSummary() {
  console.log('Generating test summary...');
  
  try {
    // Check if test results exist
    const junitPath = path.resolve(process.cwd(), 'test-results/junit.xml');
    const coveragePath = path.resolve(process.cwd(), 'coverage/coverage-summary.json');
    
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        ci: process.env.CI === 'true'
      },
      results: {},
      coverage: {}
    };
    
    // Read test results if available
    try {
      const junitContent = await fs.readFile(junitPath, 'utf8');
      // Parse basic metrics from JUnit XML (simplified)
      const testsMatch = junitContent.match(/tests="(\d+)"/);
      const failuresMatch = junitContent.match(/failures="(\d+)"/);
      const timeMatch = junitContent.match(/time="([\d.]+)"/);
      
      summary.results = {
        total: testsMatch ? parseInt(testsMatch[1]) : 0,
        failures: failuresMatch ? parseInt(failuresMatch[1]) : 0,
        duration: timeMatch ? parseFloat(timeMatch[1]) : 0
      };
    } catch (error) {
      // Test results not available
    }
    
    // Read coverage if available
    try {
      const coverageContent = await fs.readFile(coveragePath, 'utf8');
      const coverage = JSON.parse(coverageContent);
      summary.coverage = coverage.total || {};
    } catch (error) {
      // Coverage not available
    }
    
    // Write summary
    const summaryPath = path.resolve(process.cwd(), 'test-results/summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Log summary
    console.log('\n📊 Test Summary:');
    if (summary.results.total) {
      console.log(`   Tests: ${summary.results.total} total, ${summary.results.failures} failed`);
      console.log(`   Duration: ${summary.results.duration}s`);
    }
    if (summary.coverage.lines) {
      console.log(`   Coverage: ${summary.coverage.lines.pct}% lines`);
    }
    
  } catch (error) {
    console.warn('⚠️  Could not generate test summary:', error.message);
  }
}

async function cleanupTempFiles() {
  console.log('Cleaning up temporary files...');
  
  const tempPatterns = [
    'tmp-test-*',
    'test-*.tmp',
    '*.test.log'
  ];
  
  try {
    const tempDir = path.resolve(process.cwd(), 'temp');
    const files = await fs.readdir(tempDir).catch(() => []);
    
    for (const file of files) {
      for (const pattern of tempPatterns) {
        if (file.match(new RegExp(pattern.replace('*', '.*')))) {
          await fs.unlink(path.join(tempDir, file)).catch(() => {});
        }
      }
    }
    
    console.log('✓ Temporary files cleaned');
  } catch (error) {
    // Temp directory may not exist
  }
}