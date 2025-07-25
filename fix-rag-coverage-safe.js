const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/"/g, '');
    }
  });
}

const { ContextAPI } = require('./packages/rag-system/dist/api/contextAPI.js');

// SAFE chunking with aggressive limits
function chunkTextSafe(text, maxTokens = 3000) {
  // Conservative estimate: 1 token ≈ 3 characters (safer than 4)
  const maxChars = maxTokens * 3;
  const chunks = [];
  
  if (text.length <= maxChars) {
    return [text];
  }
  
  // Split by double newlines first
  const sections = text.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const section of sections) {
    if ((currentChunk + section).length <= maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + section;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // If section is still too big, split by lines
      if (section.length > maxChars) {
        const lines = section.split('\n');
        for (const line of lines) {
          if ((currentChunk + line).length <= maxChars) {
            currentChunk += (currentChunk ? '\n' : '') + line;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = '';
            }
            
            // If line is STILL too big, force split
            if (line.length > maxChars) {
              for (let i = 0; i < line.length; i += maxChars) {
                chunks.push(line.substring(i, i + maxChars));
              }
            } else {
              currentChunk = line;
            }
          }
        }
      } else {
        currentChunk = section;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.filter(chunk => chunk.trim().length > 10);
}

async function fixRAGCoverageSafe() {
  const contextAPI = new ContextAPI();
  
  console.log('🔧 Fixing RAG Coverage - SAFE MODE (3000 token max chunks)');
  
  const includePatterns = ['.md', '.ts', '.tsx', '.js', '.jsx', '.json'];
  const excludeDirs = ['node_modules', '.next', 'dist', '.git', '.rag-cache', 'logs', 'coverage'];
  
  // SKIP huge files that will cause problems
  const skipFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  
  function shouldProcessFile(filePath) {
    const fileName = path.basename(filePath);
    if (skipFiles.includes(fileName)) {
      console.log(`⏭️  Skipping large file: ${fileName}`);
      return false;
    }
    
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
        continue;
      }
    }
    
    return fileList;
  }
  
  const projectRoot = 'C:\\Users\\stuar\\Desktop\\Projects\\all-purpose';
  const allFiles = getAllFiles(projectRoot);
  
  console.log(`📁 Found ${allFiles.length} files to process (skipping large lock files)`);
  
  let processed = 0;
  let totalChunks = 0;
  let errors = 0;
  let skipped = 0;
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.trim().length < 10) {
        skipped++;
        continue;
      }
      
      // Skip files that are way too large (>100KB)
      if (content.length > 100000) {
        console.log(`⏭️  Skipping very large file: ${path.relative(projectRoot, filePath)} (${(content.length/1000).toFixed(0)}KB)`);
        skipped++;
        continue;
      }
      
      const relativePath = path.relative(projectRoot, filePath);
      const fileName = relativePath.replace(/\\/g, '/');
      
      // Chunk with SAFE limits
      const chunks = chunkTextSafe(content);
      
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        // Double-check chunk size before sending
        if (chunk.length > 9000) {
          console.log(`⚠️  Chunk too large for ${fileName}, splitting further...`);
          const subChunks = chunkTextSafe(chunk, 2000); // Even smaller
          
          for (let subIndex = 0; subIndex < subChunks.length; subIndex++) {
            const subChunk = subChunks[subIndex];
            const subChunkId = `${fileName}#chunk-${chunkIndex + 1}-${subIndex + 1}`;
            
            await contextAPI.addContext(subChunk, {
              fileName: subChunkId,
              contentType: path.extname(filePath).substring(1),
              filePath: relativePath,
              chunkIndex: `${chunkIndex}-${subIndex}`,
              totalChunks: chunks.length,
              originalFile: fileName
            });
            
            totalChunks++;
          }
        } else {
          const chunkId = chunks.length === 1 ? fileName : `${fileName}#chunk-${chunkIndex + 1}`;
          
          await contextAPI.addContext(chunk, {
            fileName: chunkId,
            contentType: path.extname(filePath).substring(1),
            filePath: relativePath,
            chunkIndex: chunkIndex,
            totalChunks: chunks.length,
            originalFile: fileName
          });
          
          totalChunks++;
        }
      }
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`📝 Processed ${processed}/${allFiles.length} files (${totalChunks} chunks, ${skipped} skipped)...`);
      }
      
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${path.relative(projectRoot, filePath)}:`, error.message);
    }
  }
  
  console.log(`✅ RAG Coverage Fix Complete!`);
  console.log(`   📊 Processed: ${processed} files`);
  console.log(`   🧩 Total chunks: ${totalChunks}`);
  console.log(`   ⏭️  Skipped: ${skipped} files`);
  console.log(`   ❌ Errors: ${errors} files`);
  
  // Test search
  try {
    console.log('\n🔍 Testing search...');
    const results = await contextAPI.searchContext('meta-agent factory', { maxResults: 3 });
    console.log(`🔎 Found ${results.length} results for "meta-agent factory"`);
    results.forEach((result, i) => {
      console.log(`   ${i+1}. ${result.metadata.fileName} - Score: ${result.score.toFixed(3)}`);
    });
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
  }
}

fixRAGCoverageSafe().catch(console.error);