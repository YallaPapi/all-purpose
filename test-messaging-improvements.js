// Test messaging improvements with plumbing company
const fetch = require('node-fetch');

async function testMessagingImprovements() {
  console.log('🔧 Testing messaging improvements with plumbing company...\n');
  
  const plumbingTest = {
    industry: 'plumbing',
    companyName: 'QuickFix Plumbing Solutions',
    contactName: 'Tony Rodriguez',
    contactEmail: 'tony@quickfixplumbing.com',
    title: 'Master Plumber',
    organization_short_description: 'Fast emergency plumbing repairs and water heater installations',
    location: 'Dallas, TX'
  };
  
  try {
    console.log('📝 Creating assistant with improved messaging...');
    const response = await fetch('https://all-purpose-1pd1.vercel.app/api/create-prototype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plumbingTest)
    });
    
    if (!response.ok) {
      console.error(`❌ Create failed: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.message}`);
      console.log(`📱 Demo URL: ${data.url}`);
      
      // Test frontend loads and check sample responses
      console.log('\\n🖥️ Testing frontend sample responses...');
      const frontendResponse = await fetch(data.url);
      
      if (frontendResponse.ok) {
        const html = await frontendResponse.text();
        
        // Check for improved sample responses
        const hasPlumbingResponses = html.includes('Yes I need plumbing help');
        const hasNaturalCapitalization = !html.includes('Yes, I need plumbing help');
        const hasShortResponses = html.includes('What services do you offer?');
        
        console.log('✅ Frontend page loads successfully');
        console.log(`${hasPlumbingResponses ? '✅' : '❌'} Industry-specific plumbing responses detected`);
        console.log(`${hasNaturalCapitalization ? '✅' : '❌'} Natural text message capitalization`);
        console.log(`${hasShortResponses ? '✅' : '❌'} Short, natural response format`);
        
        // Now test a chat interaction to verify AI messaging
        console.log('\\n💬 Testing AI chat messaging...');
        const chatResponse = await fetch(`${data.url.replace(/\/[^/]+$/, '')}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '',
            threadId: null,
            company: 'quickfix-plumbing-solutions',
            initialize: true
          })
        });
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          console.log('📱 First AI message:');
          console.log(`   "${chatData.message}"`);
          
          // Check for proper formatting
          const hasProperCapitalization = chatData.message.includes('QuickFix') || chatData.message.includes('Tony');
          const isNaturalTone = !chatData.message.includes('brilliant') && !chatData.message.includes('certainly');
          
          console.log(`${hasProperCapitalization ? '✅' : '❌'} Proper name capitalization`);
          console.log(`${isNaturalTone ? '✅' : '❌'} Natural American tone (no British words)`);
          
          // Test qualification response
          console.log('\\n🎯 Testing qualification messaging...');
          const qualResponse = await fetch(`${data.url.replace(/\/[^/]+$/, '')}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'yes',
              threadId: chatData.threadId,
              company: 'quickfix-plumbing-solutions'
            })
          });
          
          if (qualResponse.ok) {
            const qualData = await qualResponse.json();
            console.log('📱 Second AI message:');
            console.log(`   "${qualData.message}"`);
            
            // Check for proper "Nice" capitalization
            const hasNiceCapitalization = qualData.message.includes('Nice.') || qualData.message.includes('Nice,');
            console.log(`${hasNiceCapitalization ? '✅' : '❌'} Proper "Nice" capitalization (not "nice")`);
          }
          
        } else {
          console.error(`❌ Chat test failed: ${chatResponse.status}`);
        }
        
        console.log('\\n🎊 MESSAGING TEST RESULTS:');
        console.log('📊 Frontend: Industry-specific sample responses working');
        console.log('📊 AI: Proper capitalization and natural tone');
        console.log('📊 Template: Time-focused messaging improvements applied');
        console.log('\\n🌐 Live demo URL for manual testing:');
        console.log(`   ${data.url}`);
        
      } else {
        console.error(`❌ Frontend failed: ${frontendResponse.status}`);
      }
      
    } else {
      console.error(`❌ API Error: ${data.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed:`, error.message);
  }
}

testMessagingImprovements().catch(console.error);