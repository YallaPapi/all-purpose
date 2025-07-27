/**
 * Test Context7 scanner for task state management implementation
 */

const { createContext7ScannerAdapter } = require('./dist/uep/Context7ScannerAdapter');

async function scanForTaskStateManagement() {
  console.log('🔍 Using Context7 to scan codebase for task state management patterns...\n');

  try {
    // Create Context7 scanner
    const context7 = createContext7ScannerAdapter({
      projectRoot: process.cwd(),
      enableCaching: false,
      maxFilesPerScan: 50,
      enableASTAnalysis: true,
      enableCollisionDetection: true
    });

    // Scan for task state management patterns
    const taskDescription = "task state management module lifecycle pending in-progress completed failed atomic updates";
    
    console.log('📋 Scanning codebase with Context7...');
    const context = await context7.scanCodebase(taskDescription);
    
    console.log('\n📊 Context7 Scan Results:');
    console.log('═'.repeat(60));
    console.log(`Relevant files found: ${context.relevantFiles.length}`);
    console.log(`Functions discovered: ${context.functions.length}`);
    console.log(`Code snippets: ${context.snippets.length}`);
    console.log(`Collision risks: ${context.collisionRisks.length}`);
    console.log(`Dependencies: ${context.dependencies.length}`);

    // Show relevant files
    if (context.relevantFiles.length > 0) {
      console.log('\n📁 Most Relevant Files:');
      context.relevantFiles.slice(0, 10).forEach((file, index) => {
        const fileName = file.split('\\').pop() || file.split('/').pop();
        console.log(`   ${index + 1}. ${fileName}`);
        console.log(`      ${file}`);
      });
    }

    // Show relevant functions
    if (context.functions.length > 0) {
      console.log('\n🔧 Relevant Functions Found:');
      context.functions.slice(0, 15).forEach((func, index) => {
        console.log(`   ${index + 1}. ${func}`);
      });
    }

    // Show code snippets
    if (context.snippets.length > 0) {
      console.log('\n💡 Relevant Code Snippets:');
      context.snippets.slice(0, 5).forEach((snippet, index) => {
        console.log(`\n   Snippet ${index + 1}:`);
        console.log('   ' + '─'.repeat(40));
        console.log(snippet.split('\n').map(line => `   ${line}`).join('\n'));
        console.log('   ' + '─'.repeat(40));
      });
    }

    // Show collision risks
    if (context.collisionRisks.length > 0) {
      console.log('\n⚠️ Potential Collision Risks:');
      context.collisionRisks.forEach((risk, index) => {
        console.log(`   ${index + 1}. ${risk}`);
      });
    }

    // Show dependencies
    if (context.dependencies.length > 0) {
      console.log('\n📦 Related Dependencies:');
      context.dependencies.slice(0, 10).forEach((dep, index) => {
        console.log(`   ${index + 1}. ${dep}`);
      });
    }

    console.log('\n✅ Context7 scan completed successfully!');
    console.log('🎯 Using this context to implement Task State Management Module');
    
    return context;

  } catch (error) {
    console.error('❌ Context7 scan failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return null;
  }
}

// Run Context7 scan
scanForTaskStateManagement().then(context => {
  if (context) {
    console.log('\n🚀 Ready to implement task state management with Context7 insights!');
    process.exit(0);
  } else {
    console.log('\n💥 Context7 scan failed - implementing without full context');
    process.exit(1);
  }
}).catch(error => {
  console.error('Context7 test execution failed:', error);
  process.exit(1);
});