/**
 * Test file discovery patterns
 */

const { glob } = require('glob');
const path = require('path');

async function testFileDiscovery() {
  console.log('🔍 Testing file discovery patterns...');
  
  const sourceDir = path.join(__dirname, '..');
  console.log('Source directory:', sourceDir);
  
  // Use context7: Cross-platform path patterns
  const patterns = [
    'docs-consolidated/*.md',
    'docs/*.md',
    '*.md',
    'src/meta-agents/*/*.md',
    'src/meta-agents/*/*/*.ts'
  ];
  
  for (const pattern of patterns) {
    try {
      // Use context7: Don't use path.join for glob patterns, use forward slashes
      const fullPattern = sourceDir.replace(/\\/g, '/') + '/' + pattern;
      console.log(`\nTesting pattern: ${pattern}`);
      console.log(`Full pattern: ${fullPattern}`);
      
      const files = await glob(fullPattern, {
        ignore: ['**/node_modules/**', '**/dist/**'],
        absolute: true,
        nodir: true
      });
      
      console.log(`Found ${files.length} files:`);
      files.slice(0, 5).forEach(file => {
        console.log(`  - ${path.relative(sourceDir, file)}`);
      });
      
      if (files.length > 5) {
        console.log(`  ... and ${files.length - 5} more`);
      }
      
    } catch (error) {
      console.error(`❌ Pattern ${pattern} failed:`, error.message);
    }
  }
}

testFileDiscovery();