/**
 * Test Context Injection System
 * Use context7: Verify the core context injection functionality works
 */

require('dotenv').config();

async function testContextInjection() {
  console.log('🧪 Testing Context Injection System...');

  try {
    const { createContextAPI } = require('./dist/api/contextAPI');
    const contextAPI = createContextAPI();
    
    console.log('✅ Context API initialized');

    // Test 1: Add sample documentation
    console.log('\n📝 Adding sample documentation...');
    
    const sampleDocs = [
      {
        content: `# All-Purpose Pattern

The All-Purpose Pattern is a revolutionary methodology that eliminates ALL hardcoded limitations in software systems. 

Key Principles:
- NO hardcoded arrays or lists
- ALL configuration comes from user input
- UNLIMITED scalability by design
- Works for ANY industry or use case

Example:
// WRONG - Hardcoded limitations
const industries = ['automotive', 'dental', 'legal'];

// CORRECT - All-Purpose Pattern  
const industry = userConfig.industry; // UNLIMITED possibilities`,
        fileName: 'all-purpose-pattern.md',
        section: 'Core Methodology'
      },
      {
        content: `# TaskMaster Usage

TaskMaster is the AI-powered task management system for systematic development.

Key Commands:
- task-master-ai parse-prd <file> - Parse PRD into tasks
- task-master-ai research <task> - Research task with Perplexity
- task-master-ai expand <task> - Expand task complexity
- task-master-ai next - Get next recommended task

Integration:
- CLI: task-master-ai for terminal usage
- MCP: task-master-mcp for Cursor integration
- Always use context7 for current documentation`,
        fileName: 'taskmaster-guide.md',
        section: 'Commands'
      },
      {
        content: `# Context7 Integration

Context7 is the MCP server providing up-to-date documentation in AI prompts.

Usage Pattern:
- Include "use context7" in development prompts
- Eliminates outdated code patterns and hallucinated APIs
- Provides current, version-specific documentation
- Essential for all meta-agent development

Best Practice:
Always start coding prompts with "use context7" to ensure current implementation patterns.`,
        fileName: 'context7-integration.md',
        section: 'Usage'
      }
    ];

    for (const doc of sampleDocs) {
      const success = await contextAPI.addContext(doc.content, {
        fileName: doc.fileName,
        section: doc.section,
        contentType: 'documentation'
      });
      
      if (success) {
        console.log(`  ✅ Added: ${doc.fileName}`);
      } else {
        console.log(`  ❌ Failed: ${doc.fileName}`);
      }
    }

    // Test 2: Search for context
    console.log('\n🔍 Testing context search...');
    
    const searchQueries = [
      'How to use the all-purpose pattern?',
      'TaskMaster commands',
      'context7 usage'
    ];

    for (const query of searchQueries) {
      console.log(`\nQuery: "${query}"`);
      const results = await contextAPI.searchContext({ 
        prompt: query,
        maxResults: 2 
      });
      
      console.log(`Found ${results.length} results:`);
      results.forEach(result => {
        console.log(`  - ${result.metadata.fileName} (score: ${result.relevanceScore.toFixed(3)})`);
      });
    }

    // Test 3: Prompt enhancement
    console.log('\n✨ Testing prompt enhancement...');
    
    const testPrompt = 'I need to build a new meta-agent. What patterns should I follow?';
    console.log(`Original: "${testPrompt}"`);
    
    const enhanced = await contextAPI.enhancePrompt({ 
      prompt: testPrompt,
      maxResults: 2 
    });
    
    console.log(`\nEnhanced (${enhanced.stats.contextItemsFound} context items, ${enhanced.stats.totalContextLength} chars):`);
    console.log('─'.repeat(60));
    console.log(enhanced.enhancedPrompt.substring(0, 500) + '...');
    console.log('─'.repeat(60));

    console.log('\n🎉 Context injection system test completed successfully!');
    
    // Instructions for user
    console.log('\n🚀 Next Steps:');
    console.log('1. Run: node context-cli.js');
    console.log('2. Try: search "all-purpose pattern"');
    console.log('3. Try: enhance "How do I use TaskMaster?"');
    console.log('4. Add your own documentation with: add <content>');

  } catch (error) {
    console.error('❌ Context injection test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testContextInjection();