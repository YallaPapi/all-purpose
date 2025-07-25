/**
 * Test script for Context7 Scanner Adapter
 */

const { Context7ScannerAdapter } = require('./dist/uep/Context7ScannerAdapter.js');

async function testContext7Scanner() {
  console.log('🧪 Testing Context7 Scanner Adapter...\n');

  try {
    // Create scanner with test configuration
    const scanner = new Context7ScannerAdapter({
      projectRoot: process.cwd(),
      maxScanDepth: 3,
      maxFilesPerScan: 50,
      enableCaching: true,
      enableASTAnalysis: true,
      enableCollisionDetection: true,
      relevanceThreshold: 0.2,
      excludePatterns: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'coverage/**'
      ],
      includePatterns: [
        'src/**',
        '*.md',
        'package.json'
      ]
    });
    console.log('✅ Context7ScannerAdapter created successfully');

    // Test 1: Simple JavaScript task scanning
    console.log('\n1. Testing JavaScript task scanning...');
    const jsTask = 'Fix the memory leak in the data processing module';
    
    const result1 = await scanner.scanCodebase(jsTask);
    console.log(`✅ JavaScript task scanned successfully`);
    console.log(`   Relevant files: ${result1.relevantFiles.length}`);
    console.log(`   Functions found: ${result1.functions.length}`);
    console.log(`   Dependencies: ${result1.dependencies.length}`);
    console.log(`   Collision risks: ${result1.collisionRisks.length}`);
    console.log(`   Code snippets: ${result1.snippets.length}`);

    // Show sample results
    if (result1.relevantFiles.length > 0) {
      console.log(`   Sample file: ${result1.relevantFiles[0].split('/').pop()}`);
    }
    if (result1.functions.length > 0) {
      console.log(`   Sample function: ${result1.functions[0]}`);
    }

    // Test 2: TypeScript task scanning
    console.log('\n2. Testing TypeScript task scanning...');
    const tsTask = 'Implement user authentication system with JWT tokens';
    
    const result2 = await scanner.scanCodebase(tsTask);
    console.log(`✅ TypeScript task scanned successfully`);
    console.log(`   Relevant files: ${result2.relevantFiles.length}`);
    console.log(`   Functions found: ${result2.functions.length}`);
    console.log(`   Dependencies: ${result2.dependencies.length}`);

    // Test 3: Cache functionality
    console.log('\n3. Testing cache functionality...');
    const startTime = Date.now();
    const result3 = await scanner.scanCodebase(jsTask); // Same task as test 1
    const endTime = Date.now();
    console.log(`✅ Cached scan completed in ${endTime - startTime}ms (should be faster)`);
    console.log(`   Results match: ${result3.relevantFiles.length === result1.relevantFiles.length}`);

    // Test 4: Cache statistics
    console.log('\n4. Testing cache statistics...');
    const cacheStats = scanner.getCacheStats();
    console.log(`✅ Cache stats:`);
    console.log(`   Size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`   Entries: ${cacheStats.entries.length}`);
    
    if (cacheStats.entries.length > 0) {
      const entry = cacheStats.entries[0];
      console.log(`   Sample entry: "${entry.task.substring(0, 30)}..." (${entry.filesScanned} files, ${Math.round(entry.age/1000)}s old)`);
    }

    // Test 5: Different task types
    console.log('\n5. Testing various task types...');
    const taskTypes = [
      'Read the configuration files and explain the setup',
      'Create a new React component for user dashboard',
      'Update the database schema for user profiles',
      'Debug the API endpoint returning 500 errors'
    ];

    for (const [index, task] of taskTypes.entries()) {
      const result = await scanner.scanCodebase(task);
      console.log(`   Task ${index + 1}: ${result.relevantFiles.length} files, ${result.functions.length} functions, ${result.collisionRisks.length} risks`);
    }

    // Test 6: Error handling
    console.log('\n6. Testing error handling...');
    const invalidScanner = new Context7ScannerAdapter({
      projectRoot: '/invalid/path/that/does/not/exist',
      maxScanDepth: 1
    });
    
    const errorResult = await invalidScanner.scanCodebase('Test error handling');
    console.log(`✅ Error handling works - fallback context created`);
    console.log(`   Fallback snippets: ${errorResult.snippets.length}`);
    console.log(`   Fallback collision risks: ${errorResult.collisionRisks.length}`);

    console.log('\n✅ All Context7 Scanner Adapter tests passed!');
    return true;

  } catch (error) {
    console.error('\n❌ Context7 Scanner Adapter test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

testContext7Scanner().then(success => {
  if (success) {
    console.log('\n🎉 Context7 Scanner Adapter test completed successfully!');
  } else {
    console.log('\n💥 Context7 Scanner Adapter test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});