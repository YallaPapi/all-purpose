// Test with obvious plumbing company name
const fetch = require('node-fetch');

async function testObviousPlumbing() {
  console.log('🔧 Testing with obvious plumbing company name...\n');
  
  const plumbingTest = {
    industry: 'plumbing',
    companyName: 'Elite Plumbing Experts',
    contactName: 'Jake Wilson',
    contactEmail: 'jake@eliteplumbing.com',
    title: 'Lead Plumber',
    organization_short_description: 'Emergency plumbing repairs and installations',
    location: 'Houston, TX'
  };
  
  try {
    console.log('📝 Creating assistant...');
    const response = await fetch('https://all-purpose-1pd1.vercel.app/api/create-prototype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plumbingTest)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.message}`);
      console.log(`📱 Demo URL: ${data.url}`);
      console.log(`🔧 Company slug: ${data.companySlug}`);
      
      // Wait a moment for deployment
      console.log('⏱️ Waiting 3 seconds for deployment...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test frontend
      console.log('🖥️ Testing frontend sample responses...');
      const frontendResponse = await fetch(data.url);
      
      if (frontendResponse.ok) {
        const html = await frontendResponse.text();
        console.log('✅ Frontend loads successfully');
        
        // Check for plumbing-specific responses
        if (html.includes('Yes I need plumbing help')) {
          console.log('✅ FOUND: "Yes I need plumbing help" - plumbing detection working!');
        } else {
          console.log('❌ MISSING: "Yes I need plumbing help"');
        }
        
        if (html.includes('What services do you offer?')) {
          console.log('✅ FOUND: "What services do you offer?" - short format working!');
        } else {
          console.log('❌ MISSING: "What services do you offer?"');
        }
        
        // Test AI conversation
        console.log('\\n💬 Testing conversation flow...');
        
        // Step 1: Initialize
        const initResponse = await fetch(`https://all-purpose-1pd1.vercel.app/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '',
            threadId: null,
            company: 'elite-plumbing-experts',
            initialize: true
          })
        });
        
        if (initResponse.ok) {
          const initData = await initResponse.json();
          console.log('📱 AI First Message:');
          console.log(`   "${initData.message}"`);
          
          // Step 2: Say yes to trigger second response
          const yesResponse = await fetch(`https://all-purpose-1pd1.vercel.app/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'yes',
              threadId: initData.threadId,
              company: 'elite-plumbing-experts'
            })
          });
          
          if (yesResponse.ok) {
            const yesData = await yesResponse.json();
            console.log('📱 AI Second Message:');
            console.log(`   "${yesData.message}"`);
            
            // Step 3: Say yes again to trigger qualification
            const qualResponse = await fetch(`https://all-purpose-1pd1.vercel.app/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: 'yes',
                threadId: yesData.threadId,
                company: 'elite-plumbing-experts'
              })
            });
            
            if (qualResponse.ok) {
              const qualData = await qualResponse.json();
              console.log('📱 AI Qualification Message:');
              console.log(`   "${qualData.message}"`);
              
              // Check for proper "Nice" capitalization
              if (qualData.message.includes('Nice.') || qualData.message.includes('Nice ')) {
                console.log('✅ FOUND: "Nice" with proper capitalization!');
              } else if (qualData.message.includes('nice.') || qualData.message.includes('nice ')) {
                console.log('❌ FOUND: "nice" with bad capitalization');
              } else {
                console.log('ℹ️ No "Nice/nice" found in this message');
              }
              
              // Step 4: Respond to trigger closing
              const closeResponse = await fetch(`https://all-purpose-1pd1.vercel.app/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: 'trying to install a water heater',
                  threadId: qualData.threadId,
                  company: 'elite-plumbing-experts'
                })
              });
              
              if (closeResponse.ok) {
                const closeData = await closeResponse.json();
                console.log('📱 AI Closing Message:');
                console.log(`   "${closeData.message}"`);
                
                // Check for time-focused messaging
                if (closeData.message.includes('in ') && (closeData.message.includes('time') || closeData.message.includes('hour') || closeData.message.includes('day') || closeData.message.includes('week'))) {
                  console.log('✅ FOUND: Time-focused messaging!');
                } else {
                  console.log('❌ MISSING: Time-focused messaging');
                }
                
                if (closeData.message.includes('calendly.com/elite-plumbing-experts')) {
                  console.log('✅ FOUND: Correct calendar link!');
                } else {
                  console.log('❌ MISSING: Expected calendar link');
                }
              }
            }
          }
        }
        
        console.log('\\n🌐 Manual test URL:');
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

testObviousPlumbing().catch(console.error);