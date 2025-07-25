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

// Chunking function to handle large files
function chunkText(text, maxTokens = 6000) {
  // Rough estimate: 1 token ≈ 4 characters for English text
  const maxChars = maxTokens * 4;
  const chunks = [];
  
  if (text.length <= maxChars) {
    return [text];
  }
  
  // Split by paragraphs first, then by sentences if needed
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length <= maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      
      // If paragraph itself is too long, split by sentences
      if (paragraph.length > maxChars) {
        const sentences = paragraph.split(/[.!?]+/);
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= maxChars) {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = '';
            }
            
            // If sentence itself is too long, force split
            if (sentence.length > maxChars) {
              const parts = [];
              for (let i = 0; i < sentence.length; i += maxChars) {
                parts.push(sentence.substring(i, i + maxChars));
              }
              chunks.push(...parts);
            } else {
              currentChunk = sentence;
            }
          }
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks.filter(chunk => chunk.trim().length > 10);
}

async function fixRAGCoverageChunked() {
  const contextAPI = new ContextAPI();
  
  console.log('🔧 Fixing RAG Coverage - Chunked for token limits');
  
  // Get current vector count
  try {
    const vectorInfo = await contextAPI.vectorDb.info();
    console.log(`📊 Current vectors: ${vectorInfo.totalVectorCount}`);
  } catch (error) {
    console.log('📊 Current vectors: Unable to fetch (proceeding anyway)');
  }
  
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
        continue;
      }
    }
    
    return fileList;
  }
  
  const projectRoot = 'C:\\Users\\stuar\\Desktop\\Projects\\all-purpose';
  const allFiles = getAllFiles(projectRoot);
  
  console.log(`📁 Found ${allFiles.length} files to process`);
  
  let processed = 0;
  let totalChunks = 0;
  let errors = 0;
  const fileMapping = [];
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.trim().length < 10) {
        console.log(`⏭️  Skipping empty file: ${path.relative(projectRoot, filePath)}`);
        continue;
      }
      
      const relativePath = path.relative(projectRoot, filePath);
      const fileName = relativePath.replace(/\\/g, '/');
      
      // Chunk the content
      const chunks = chunkText(content);
      
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        
        const chunkId = chunks.length === 1 ? fileName : `${fileName}#chunk-${chunkIndex + 1}`;
        
        await contextAPI.addContext(chunk, {
          fileName: chunkId,
          contentType: path.extname(filePath).substring(1),
          filePath: relativePath,
          chunkIndex: chunkIndex,
          totalChunks: chunks.length,
          originalFile: fileName
        });
        
        fileMapping.push({
          file: fileName,
          chunkId: chunkId,
          chunkIndex: chunkIndex,
          totalChunks: chunks.length,
          size: chunk.length
        });
        
        totalChunks++;
      }
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`📝 Processed ${processed}/${allFiles.length} files (${totalChunks} chunks total)...`);
      }
      
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  // Save file mapping for auditing
  fs.writeFileSync(
    path.join(projectRoot, 'rag-coverage-mapping-chunked.json'),
    JSON.stringify(fileMapping, null, 2)
  );
  
  console.log(`✅ RAG Coverage Fix Complete!`);
  console.log(`   📊 Processed: ${processed} files`);
  console.log(`   🧩 Total chunks: ${totalChunks} (was 468 vectors)`);
  console.log(`   ❌ Errors: ${errors} files`);
  console.log(`   📋 Coverage mapping saved to: rag-coverage-mapping-chunked.json`);
  
  // Test enhanced search functionality
  try {
    console.log('\n🔍 Testing enhanced search...');
    const testQueries = [
      'meta-agent factory implementation',
      'All-Purpose Pattern methodology',
      'TaskMaster integration'
    ];
    
    for (const query of testQueries) {
      const results = await contextAPI.searchContext(query, { maxResults: 3 });
      console.log(`🔎 "${query}": Found ${results.length} results`);
      if (results.length > 0) {
        results.forEach((result, i) => {
          const metadata = result.metadata;
          console.log(`   ${i+1}. ${metadata.fileName} - Score: ${result.score.toFixed(3)}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
  }
}

fixRAGCoverageChunked().catch(console.error);