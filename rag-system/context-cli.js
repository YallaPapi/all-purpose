#!/usr/bin/env node

/**
 * Context CLI Tool
 * 
 * Use context7: Simple CLI for testing context injection and adding documentation
 * Following All-Purpose Pattern: Works with ANY documentation types
 */

require('dotenv').config();

const readline = require('readline');

async function main() {
  console.log('🧠 RAG Context CLI - All-Purpose Documentation Assistant');
  console.log('Commands: search <query>, enhance <prompt>, add <content>, help, exit\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'context> '
  });

  let contextAPI;
  
  try {
    // Initialize after env vars are loaded
    const { createContextAPI } = require('./dist/api/contextAPI');
    contextAPI = createContextAPI();
    console.log('✅ Context API initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize Context API:', error.message);
    console.error('Make sure you have built the project with: npm run build\n');
    process.exit(1);
  }

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    
    if (!input) {
      rl.prompt();
      return;
    }

    const [command, ...args] = input.split(' ');
    const arg = args.join(' ');

    try {
      switch (command.toLowerCase()) {
        case 'search':
          if (!arg) {
            console.log('Usage: search <query>');
            break;
          }
          await handleSearch(contextAPI, arg);
          break;

        case 'enhance':
          if (!arg) {
            console.log('Usage: enhance <prompt>');
            break;
          }
          await handleEnhance(contextAPI, arg);
          break;

        case 'add':
          if (!arg) {
            console.log('Usage: add <content>');
            break;
          }
          await handleAdd(contextAPI, arg);
          break;

        case 'help':
          showHelp();
          break;

        case 'exit':
        case 'quit':
          console.log('👋 Goodbye!');
          rl.close();
          return;

        default:
          console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
          break;
      }
    } catch (error) {
      console.error('❌ Command failed:', error.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

async function handleSearch(contextAPI, query) {
  console.log(`🔍 Searching for: "${query}"`);
  
  const results = await contextAPI.searchContext({ 
    prompt: query,
    maxResults: 3,
    scoreThreshold: 0.6 
  });

  if (results.length === 0) {
    console.log('No relevant context found.');
    return;
  }

  console.log(`\n📚 Found ${results.length} relevant items:\n`);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.metadata.fileName || 'Unknown'} (score: ${result.relevanceScore.toFixed(3)})`);
    console.log(`   ${result.snippet.substring(0, 200)}...\n`);
  });
}

async function handleEnhance(contextAPI, prompt) {
  console.log(`✨ Enhancing prompt: "${prompt.substring(0, 100)}..."`);
  
  const enhanced = await contextAPI.enhancePrompt({ 
    prompt,
    maxResults: 3,
    scoreThreshold: 0.6 
  });

  console.log(`\n📈 Context items found: ${enhanced.stats.contextItemsFound}`);
  console.log(`📏 Context length: ${enhanced.stats.totalContextLength} chars`);
  console.log(`⏱️  Enhancement time: ${enhanced.stats.enhancementTime}ms\n`);

  if (enhanced.stats.contextItemsFound === 0) {
    console.log('No context found - returning original prompt.');
    return;
  }

  console.log('🔧 Enhanced Prompt:');
  console.log('─'.repeat(80));
  console.log(enhanced.enhancedPrompt);
  console.log('─'.repeat(80));
}

async function handleAdd(contextAPI, content) {
  console.log(`📝 Adding content to knowledge base...`);
  
  // Simple interactive addition
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const fileName = await question(rl, 'File name (optional): ');
  const section = await question(rl, 'Section (optional): ');
  
  rl.close();

  const success = await contextAPI.addContext(content, {
    fileName: fileName || undefined,
    section: section || undefined,
    contentType: 'documentation'
  });

  if (success) {
    console.log('✅ Content added successfully!');
  } else {
    console.log('❌ Failed to add content.');
  }
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function showHelp() {
  console.log(`
📖 Available Commands:

search <query>     - Search for relevant documentation
enhance <prompt>   - Enhance a prompt with relevant context  
add <content>      - Add new content to knowledge base
help              - Show this help message
exit              - Exit the CLI

🎯 Examples:

search "all-purpose pattern"
enhance "How do I use TaskMaster?"
add "The All-Purpose Pattern eliminates hardcoded limitations"

💡 Tips:

- Use specific queries for better results
- Enhanced prompts include relevant project context
- Add key documentation pieces manually for better coverage
`);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

// Run CLI
main().catch(error => {
  console.error('❌ CLI failed to start:', error.message);
  process.exit(1);
});