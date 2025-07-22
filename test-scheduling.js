// Test the scheduling response specifically
const chatApiUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/chat';
const companySlug = 'elite-fitness-lab';

async function testScheduling() {
  console.log('🧪 Testing Scheduling Response\n');
  
  try {
    // Start fresh conversation 
    let response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: companySlug, initialize: true })
    });
    let result = await response.json();
    let threadId = result.threadId;
    
    // Skip to the scheduling part
    response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        company: companySlug, 
        message: 'I train 3 times a week with weights. I want to get a six pack. Can we schedule a call?', 
        threadId 
      })
    });
    
    if (!response.ok) {
      console.log('❌ HTTP Error:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return;
    }
    
    result = await response.json();
    
    if (result.error) {
      console.log('❌ API Error:', result.error);
      console.log('Full result:', result);
      return;
    }
    
    console.log('✅ SCHEDULING RESPONSE:', result.message);
    
    // Check if it matches expected format
    const message = result.message || '';
    if (message.includes('calendly')) {
      console.log('✅ Calendar link included');
    } else {
      console.log('⚠️ No calendar link found');
    }
    
    if (message.length < 150) {
      console.log('✅ Message is short enough (' + message.length + ' chars)');
    } else {
      console.log('⚠️ Message might be too long:', message.length, 'characters');
    }
    
  } catch (error) {
    console.log('🚨 Error:', error.message);
  }
}

testScheduling();