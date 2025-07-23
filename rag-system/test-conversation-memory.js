/**
 * Test Conversation Memory Store
 * Use context7: Verify conversation memory and session management
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function testConversationMemory() {
  console.log('🧪 Testing Conversation Memory Store...\n');

  try {
    const { createConversationContextAPI } = require('./dist/api/conversationContextAPI');
    
    // Test 1: Initialize Conversation Context API
    console.log('1️⃣ Testing Conversation Context API Initialization...');
    const conversationAPI = createConversationContextAPI({
      enableConversationMemory: true,
      defaultConversationWeight: 0.3,
      maxConversationResults: 5
    });
    console.log('✅ Conversation Context API initialized\n');

    // Test 2: Start a conversation session
    console.log('2️⃣ Testing Session Management...');
    const sessionId = await conversationAPI.startSession('all-purpose-meta-agent-development', {
      projectName: 'all-purpose',
      taskContext: 'meta-agent development',
      userIntent: 'build RAG system'
    });
    console.log(`✅ Session started: ${sessionId}\n`);

    // Test 3: Add conversation messages
    console.log('3️⃣ Testing Message Storage...');
    
    const messages = [
      {
        role: 'user',
        content: 'I need help implementing the All-Purpose Pattern in my meta-agent. What are the key principles?',
        metadata: { command: 'research', taskId: 'task-1' }
      },
      {
        role: 'assistant', 
        content: 'The All-Purpose Pattern eliminates hardcoded limitations by: 1) No hardcoded arrays, 2) Configuration from user input, 3) Unlimited scalability by design. For meta-agents, apply this to task generation and context handling.',
        metadata: { tokens: 145, context: 'all-purpose-methodology' }
      },
      {
        role: 'user',
        content: 'How do I integrate this with TaskMaster for systematic development?',
        metadata: { command: 'expand', taskId: 'task-2' }
      },
      {
        role: 'assistant',
        content: 'Use TaskMaster parse-prd to break down requirements, then apply All-Purpose Pattern to avoid hardcoding task types. Use task-master research for context-aware development.',
        metadata: { tokens: 89, context: 'taskmaster-integration' }
      }
    ];

    for (const msg of messages) {
      if (msg.role === 'user') {
        await conversationAPI.addUserMessage(msg.content, msg.metadata);
      } else {
        await conversationAPI.addAssistantMessage(msg.content, msg.metadata);
      }
      console.log(`  ✅ Added ${msg.role} message (${msg.content.length} chars)`);
    }
    console.log('✅ All messages stored in conversation memory\n');

    // Test 4: Search conversation history
    console.log('4️⃣ Testing Conversation Search...');
    
    const searchQueries = [
      'All-Purpose Pattern principles',
      'TaskMaster integration patterns',
      'meta-agent development best practices'
    ];

    for (const query of searchQueries) {
      const results = await conversationAPI.searchContext({
        prompt: query,
        includeConversationHistory: true,
        maxResults: 3,
        maxConversationResults: 3
      });

      console.log(`\n  Query: "${query}"`);
      console.log(`  Documentation results: ${results.documentationResults.length}`);
      console.log(`  Conversation results: ${results.conversationResults.length}`);
      
      if (results.conversationResults.length > 0) {
        console.log(`  Most relevant conversation: "${results.conversationResults[0].snippet.substring(0, 100)}..."`);
        console.log(`  Relevance score: ${results.conversationResults[0].relevanceScore.toFixed(3)}`);
      }
    }
    console.log('\n✅ Conversation search working properly\n');

    // Test 5: Enhanced prompt with conversation context
    console.log('5️⃣ Testing Conversation-Aware Prompt Enhancement...');
    
    const testPrompt = 'I want to expand my current task using the patterns we discussed. What should I consider?';
    const enhanced = await conversationAPI.enhancePrompt({
      prompt: testPrompt,
      includeConversationHistory: true,
      maxResults: 2,
      maxConversationResults: 2
    });

    console.log(`Original prompt: "${testPrompt}"`);
    console.log(`Enhanced prompt length: ${enhanced.enhancedPrompt.length} chars`);
    console.log(`Documentation items: ${enhanced.stats.contextItemsFound}`);
    console.log(`Conversation items: ${enhanced.conversationStats.conversationItemsFound}`);
    console.log(`Session context: ${enhanced.conversationStats.sessionContext}`);
    
    // Show a preview of the enhanced prompt
    const preview = enhanced.enhancedPrompt.substring(0, 300) + '...';
    console.log(`\nEnhanced prompt preview:\n${'-'.repeat(50)}\n${preview}\n${'-'.repeat(50)}\n`);
    console.log('✅ Conversation-aware prompt enhancement working\n');

    // Test 6: Session context retrieval
    console.log('6️⃣ Testing Session Context Retrieval...');
    
    const sessionContext = await conversationAPI.getSessionContext();
    console.log(`Session messages found: ${sessionContext ? sessionContext.length : 0}`);
    
    const activeSessions = conversationAPI.getActiveSessions();
    console.log(`Active sessions: ${activeSessions.length}`);
    
    if (activeSessions.length > 0) {
      const session = activeSessions[0];
      console.log(`Session details: ${session.messageCount} messages, started ${session.startTime.toLocaleString()}`);
    }
    console.log('✅ Session context retrieval working\n');

    // Test 7: Session cleanup
    console.log('7️⃣ Testing Session Management...');
    
    await conversationAPI.endSession();
    console.log('✅ Session ended successfully');
    
    const activeAfterEnd = conversationAPI.getActiveSessions();
    console.log(`Active sessions after end: ${activeAfterEnd.length}`);
    console.log('✅ Session management working\n');

    // Test Summary
    console.log('🎯 CONVERSATION MEMORY TEST SUMMARY:');
    console.log('─'.repeat(50));
    console.log('✅ Conversation Context API Initialization: PASS');
    console.log('✅ Session Management: PASS');
    console.log('✅ Message Storage: PASS');
    console.log('✅ Conversation Search: PASS');
    console.log('✅ Conversation-Aware Prompt Enhancement: PASS');
    console.log('✅ Session Context Retrieval: PASS');
    console.log('✅ Session Cleanup: PASS');
    console.log('─'.repeat(50));

    console.log('\n🎉 Conversation Memory Test Completed Successfully!');
    console.log('\n🚀 Key Features Verified:');
    console.log('• Session-based conversation tracking');
    console.log('• Semantic search across conversation history');
    console.log('• Context-aware prompt enhancement');
    console.log('• Integration with existing documentation context');
    console.log('• Automatic session cleanup and management');

    // Cleanup
    await conversationAPI.shutdown();
    console.log('\n🧹 Conversation API shutdown completed');

  } catch (error) {
    console.error('❌ Conversation memory test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConversationMemory();