// Test simple language conversation
const chatApiUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/chat';
const companySlug = 'iron-gym';

async function testSimpleLanguage() {
  console.log('🧪 Testing Simple Language Conversation\n');
  
  try {
    // Initialize
    let response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: companySlug, initialize: true })
    });
    
    if (!response.ok) {
      console.log('❌ Init failed:', response.status);
      return;
    }
    
    let result = await response.json();
    console.log('1. INIT:', result.message || 'undefined');
    if (!result.message) {
      console.log('Full init result:', result);
      return;
    }
    
    let threadId = result.threadId;
    
    // First yes
    response = await fetch(chatApiUrl, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: companySlug, message: 'yes', threadId })
    });
    
    if (!response.ok) {
      console.log('❌ Yes response failed:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
      return;
    }
    
    result = await response.json();
    console.log('2. YES 1:', result.message || 'undefined');
    if (!result.message) {
      console.log('Full yes result:', result);
      return;
    }
    
    threadId = result.threadId || threadId;
    
    // Test response to being out of shape
    response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: companySlug, message: 'im out of shape and need help', threadId })
    });
    
    if (!response.ok) {
      console.log('❌ Final response failed:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
      return;
    }
    
    result = await response.json();
    console.log('3. HELP RESPONSE:', result.message || 'undefined');
    if (!result.message) {
      console.log('Full help result:', result);
      return;
    }
    
    // Check language quality
    const message = result.message.toLowerCase();
    const fancyWords = ['brilliant', 'candor', 'specialise', 'fantastic', 'wonderful'];
    const foundFancy = fancyWords.filter(word => message.includes(word));
    
    console.log('\n🎯 Language Analysis:');
    if (foundFancy.length === 0) {
      console.log('✅ No fancy words detected');
    } else {
      console.log('❌ Found fancy words:', foundFancy.join(', '));
    }
    
    console.log('✅ Response length:', message.length, 'characters');
    
  } catch (error) {
    console.log('🚨 Error:', error.message);
  }
}

testSimpleLanguage();