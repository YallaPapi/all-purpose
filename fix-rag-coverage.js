const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Set required Upstash variables
process.env.UPSTASH_VECTOR_REST_URL = 'https://rapid-fox-24961-us1-vector.upstash.io';
process.env.UPSTASH_VECTOR_REST_TOKEN = 'ABMFMHJhcGlkLWZveC0yNDk2MS11czFhZG1pbk5tSmxNakJqTnpFdE9EWmxNUzAwTm1JNExUbGlNMkV0TXpFeU5qQXhNREF5WTJGbA==';

const { ContextAPI } = require('./packages/rag-system/dist/api/contextAPI.js');

async function fixRAGCoverage() {
  const contextAPI = new ContextAPI();
  
  console.log('🔧 Fixing RAG Coverage - AST-based extraction and comprehensive indexing');
  
  // Get current vector count
  try {
    const vectorInfo = await contextAPI.vectorDb.info();
    console.log(`📊 Current vectors: ${vectorInfo.totalVectorCount}`);
  } catch (error) {
    console.log('📊 Current vectors: Unable to fetch (proceeding anyway)');
  }
  
  // Define file patterns and exclusions per TaskMaster research
  const includePatterns = ['.md', '.ts', '.tsx', '.js', '.jsx', '.json'];
  const excludeDirs = ['node_modules', '.next', 'dist', '.git', '.rag-cache', 'logs', 'coverage'];
  
  function shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    if (!includePatterns.includes(ext)) return false;
    
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
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(file)) {
            getAllFiles(filePath, fileList);
          }
        } else if (shouldProcessFile(filePath)) {
          fileList.push(filePath);
        }
      } catch (error) {
        // Skip files we can't access
        continue;
      }
    }
    
    return fileList;
  }
  
  // AST-based extraction for code files
  function extractCodeBlocks(content, filePath) {
    const ext = path.extname(filePath);
    const blocks = [];
    
    if (['.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
      // Simple AST-like extraction - functions, classes, interfaces
      const lines = content.split('\n');
      let currentBlock = '';
      let blockStart = 0;
      let inBlock = false;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Function/class/interface detection
        if (line.match(/^(export\s+)?(async\s+)?function\s+\w+|^(export\s+)?class\s+\w+|^(export\s+)?interface\s+\w+|^(export\s+)?const\s+\w+\s*=/)) {
          if (inBlock && currentBlock.trim()) {
            blocks.push({
              content: currentBlock.trim(),
              lineStart: blockStart + 1,
              lineEnd: i,
              type: 'code-block'
            });
          }
          currentBlock = line + '\n';
          blockStart = i;
          inBlock = true;
          braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        } else if (inBlock) {
          currentBlock += line + '\n';
          braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          
          if (braceCount <= 0 && line.trim() === '') {
            blocks.push({
              content: currentBlock.trim(),
              lineStart: blockStart + 1,
              lineEnd: i + 1,
              type: 'code-block'
            });
            currentBlock = '';
            inBlock = false;
          }
        }
      }
      
      // Add final block if exists
      if (inBlock && currentBlock.trim()) {
        blocks.push({
          content: currentBlock.trim(),
          lineStart: blockStart + 1,
          lineEnd: lines.length,
          type: 'code-block'
        });
      }
    }
    
    // If no blocks found or non-code file, use whole file
    if (blocks.length === 0) {
      blocks.push({
        content: content,
        lineStart: 1,
        lineEnd: content.split('\n').length,
        type: ext === '.md' ? 'documentation' : 'full-file'
      });
    }
    
    return blocks;
  }
  
  const projectRoot = 'C:\\Users\\stuar\\Desktop\\Projects\\all-purpose';
  const allFiles = getAllFiles(projectRoot);
  
  console.log(`📁 Found ${allFiles.length} files to process (vs 559 expected)`);
  console.log(`📊 Gap Analysis: ${559 - allFiles.length} files filtered out`);
  
  let processed = 0;
  let totalBlocks = 0;
  let errors = 0;
  const fileMapping = [];
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip empty or very small files
      if (content.trim().length < 10) {
        console.log(`⏭️  Skipping empty file: ${path.relative(projectRoot, filePath)}`);
        continue;
      }
      
      const relativePath = path.relative(projectRoot, filePath);
      const fileName = relativePath.replace(/\\/g, '/');
      
      // Extract code blocks using AST-like approach
      const blocks = extractCodeBlocks(content, filePath);
      
      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        const block = blocks[blockIndex];
        
        const blockId = blocks.length === 1 ? fileName : `${fileName}#block-${blockIndex + 1}`;
        
        await contextAPI.addContext(block.content, {
          fileName: blockId,
          contentType: path.extname(filePath).substring(1),
          filePath: relativePath,
          lineStart: block.lineStart,
          lineEnd: block.lineEnd,
          blockType: block.type,
          originalFile: fileName
        });
        
        fileMapping.push({
          file: fileName,
          blockId: blockId,
          lineStart: block.lineStart,
          lineEnd: block.lineEnd,
          type: block.type,
          size: block.content.length
        });
        
        totalBlocks++;
      }
      
      processed++;
      if (processed % 25 === 0) {
        console.log(`📝 Processed ${processed}/${allFiles.length} files (${totalBlocks} blocks total)...`);
      }
      
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  // Save file mapping for auditing
  fs.writeFileSync(
    path.join(projectRoot, 'rag-coverage-mapping.json'),
    JSON.stringify(fileMapping, null, 2)
  );
  
  console.log(`✅ RAG Coverage Fix Complete!`);
  console.log(`   📊 Processed: ${processed} files`);
  console.log(`   🧩 Total blocks: ${totalBlocks} (was 468 vectors)`);
  console.log(`   ❌ Errors: ${errors} files`);
  console.log(`   📋 Coverage mapping saved to: rag-coverage-mapping.json`);
  
  // Test enhanced search functionality
  try {
    console.log('\n🔍 Testing enhanced search...');
    const testQueries = [
      'meta-agent factory implementation',
      'All-Purpose Pattern methodology',
      'TaskMaster integration',
      'observability dashboard'
    ];
    
    for (const query of testQueries) {
      const results = await contextAPI.searchContext(query, { maxResults: 3 });
      console.log(`🔎 "${query}": Found ${results.length} results`);
      if (results.length > 0) {
        results.forEach((result, i) => {
          const metadata = result.metadata;
          const location = metadata.lineStart ? `(lines ${metadata.lineStart}-${metadata.lineEnd})` : '';
          console.log(`   ${i+1}. ${metadata.fileName} ${location} - Score: ${result.score.toFixed(3)}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
  }
  
  console.log('\n🎯 Next steps: Use the coverage mapping to audit any remaining gaps');
}

fixRAGCoverage().catch(console.error);