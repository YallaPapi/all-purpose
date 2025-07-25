// Test complete conversation flow for Peak Performance Fitness
const chatApiUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/chat';
const companySlug = 'peak-performance-fitness';

async function sendMessage(message, threadId = null, isInitialize = false) {
  console.log(`\n📤 ${isInitialize ? 'INITIALIZING' : 'SENDING'}: "${message || 'INIT'}"`);
  
  try {
    const payload = {
      company: companySlug
    };
    
    if (isInitialize) {
      payload.initialize = true;
    } else {
      payload.message = message;
      if (threadId) payload.threadId = threadId;
    }
    
    const response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ HTTP ${response.status}: ${errorText}`);
      return null;
    }
    
    const result = await response.json();
    
    if (result.success === false) {
      console.log(`❌ API Error: ${result.error}`);
      return null;
    }
    
    if (result.message) {
      console.log(`📥 AI RESPONSE: "${result.message}"`);
      return {
        message: result.message,
        threadId: result.threadId
      };
    } else {
      console.log(`❌ No message in response:`, result);
      return null;
    }
    
  } catch (error) {
    console.log(`🚨 Request failed: ${error.message}`);
    return null;
  }
}

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Conversation Flow for Peak Performance Fitness');
  console.log('🏋️ Business: High-end personal training studio (weight loss, strength training, performance coaching)');
  console.log('🎯 Expected: AI should adapt questions to personal training context\n');
  
  // Step 1: Initialize conversation
  console.log('=== STEP 1: INITIALIZE CONVERSATION ===');
  const init = await sendMessage(null, null, true);
  if (!init) {
    console.log('❌ Failed to initialize conversation');
    return;
  }
  
  let threadId = init.threadId;
  
  // Step 2: Respond "yes" to first message
  console.log('\n=== STEP 2: RESPOND "YES" TO FIRST MESSAGE ===');
  const response1 = await sendMessage('yes', threadId);
  if (!response1) {
    console.log('❌ Failed to get response to "yes"');
    return;
  }
  
  threadId = response1.threadId || threadId;
  
  // Step 3: Respond "yes" again to continue
  console.log('\n=== STEP 3: RESPOND "YES" TO CONTINUE ===');
  const response2 = await sendMessage('yes', threadId);
  if (!response2) {
    console.log('❌ Failed to get second response');
    return;
  }
  
  threadId = response2.threadId || threadId;
  
  // Step 4: Respond "yes" to scheduling
  console.log('\n=== STEP 4: RESPOND "YES" TO SCHEDULING ===');
  const response3 = await sendMessage('yes', threadId);
  if (!response3) {
    console.log('❌ Failed to get scheduling response');
    return;
  }
  
  console.log('\n🎯 CONVERSATION FLOW ANALYSIS:');
  console.log('✅ Step 1: Initial message should mention fitness/training context');
  console.log('✅ Step 2: Should ask about fitness goals, weight loss, or training needs');
  console.log('✅ Step 3: Should explain how Peak Performance helps with specific fitness goals');
  console.log('✅ Step 4: Should provide calendar link for consultation booking');
  
  console.log('\n📊 CONVERSATION SUMMARY:');
  console.log('1. INIT:', init.message);
  console.log('2. YES 1:', response1.message);
  console.log('3. YES 2:', response2.message);
  console.log('4. YES 3:', response3.message);
  
  // Check if calendar link appears in final message
  const finalMessage = response3.message.toLowerCase();
  if (finalMessage.includes('calendly') || finalMessage.includes('calendar')) {
    console.log('\n✅ SUCCESS: Calendar link provided in final message');
  } else {
    console.log('\n⚠️  WARNING: No calendar link found in final message');
  }
  
  // Check for fitness-specific language
  const allMessages = [init.message, response1.message, response2.message, response3.message].join(' ').toLowerCase();
  const fitnessKeywords = ['fitness', 'training', 'weight', 'strength', 'performance', 'goals', 'workout', 'muscle', 'health'];
  const foundKeywords = fitnessKeywords.filter(keyword => allMessages.includes(keyword));
  
  if (foundKeywords.length > 0) {
    console.log(`✅ FITNESS CONTEXT: Found keywords: ${foundKeywords.join(', ')}`);
  } else {
    console.log('⚠️  FITNESS CONTEXT: No fitness-specific keywords detected');
  }
}

testCompleteFlow().catch(console.error);