const fs = require('fs');
const path = require('path');
const { ContextAPI } = require('./packages/rag-system/dist/api/contextAPI.js');

async function comprehensiveIndexing() {
  const contextAPI = new ContextAPI();
  
  console.log('🚀 Starting comprehensive RAG indexing...');
  
  // Define file patterns to include
  const includePatterns = ['.md', '.ts', '.tsx', '.js', '.jsx', '.json'];
  
  // Define directories to exclude
  const excludeDirs = ['node_modules', '.next', 'dist', '.git', '.rag-cache', 'logs'];
  
  function shouldProcessFile(filePath) {
    // Check if file has an included extension
    const ext = path.extname(filePath);
    if (!includePatterns.includes(ext)) return false;
    
    // Check if file is in an excluded directory
    const normalizedPath = filePath.replace(/\\/g, '/');
    for (const excludeDir of excludeDirs) {
      if (normalizedPath.includes(`/${excludeDir}/`) || normalizedPath.includes(`\\${excludeDir}\\`)) {
        return false;
      }
    }
    
    return true;
  }
  
  function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!excludeDirs.includes(file)) {
          getAllFiles(filePath, fileList);
        }
      } else if (shouldProcessFile(filePath)) {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }
  
  const projectRoot = 'C:\\Users\\stuar\\Desktop\\Projects\\all-purpose';
  const allFiles = getAllFiles(projectRoot);
  
  console.log(`📁 Found ${allFiles.length} files to index`);
  
  let processed = 0;
  let errors = 0;
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip empty files or very small files
      if (content.trim().length < 10) continue;
      
      const relativePath = path.relative(projectRoot, filePath);
      const fileName = relativePath.replace(/\\/g, '/');
      
      await contextAPI.addContext(content, {
        fileName: fileName,
        contentType: path.extname(filePath).substring(1),
        filePath: relativePath
      });
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`📝 Processed ${processed}/${allFiles.length} files...`);
      }
      
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log(`✅ Indexing complete!`);
  console.log(`   📊 Processed: ${processed} files`);
  console.log(`   ❌ Errors: ${errors} files`);
  
  // Test the search functionality
  try {
    console.log('\n🔍 Testing search functionality...');
    const searchResults = await contextAPI.searchContext('meta-agent factory', { maxResults: 5 });
    console.log(`Found ${searchResults.length} relevant results for "meta-agent factory"`);
    
    searchResults.forEach((result, i) => {
      console.log(`${i+1}. ${result.metadata.fileName} (score: ${result.score.toFixed(3)})`);
    });
    
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
  }
}

comprehensiveIndexing().catch(console.error);