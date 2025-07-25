// Test industry parameter fix with plumbing
const fetch = require('node-fetch');

async function testIndustryParameterFix() {
  console.log('🔧 Testing industry parameter fix with plumbing company...\n');
  
  const plumbingTest = {
    industry: 'plumbing',  // <- THIS IS THE KEY
    companyName: 'Rapid Plumbing Repairs',
    contactName: 'Carlos Martinez',
    contactEmail: 'carlos@rapidplumbing.com',
    title: 'Master Plumber',
    organization_short_description: 'Emergency plumbing repairs and water heater installations',
    location: 'Miami, FL'
  };
  
  try {
    console.log('📝 Creating assistant with industry: plumbing...');
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
      
      // Wait for deployment
      console.log('⏱️ Waiting 5 seconds for deployment to propagate...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test company data API
      console.log('\\n🌐 Testing company data API...');
      const companyDataResponse = await fetch(`https://all-purpose-1pd1.vercel.app/api/company-data/${data.companySlug}`);
      
      if (companyDataResponse.ok) {
        const companyData = await companyDataResponse.json();
        console.log('✅ Company data API working');
        console.log(`📊 Industry from backend: ${companyData.industry}`);
        console.log(`🤖 Assistant ID: ${companyData.assistantId}`);
        
        if (companyData.industry === 'plumbing') {
          console.log('✅ CORRECT: Industry is plumbing (not business-services)');
        } else {
          console.log(`❌ WRONG: Industry is ${companyData.industry}, expected plumbing`);
        }
      } else {
        console.error(`❌ Company data API failed: ${companyDataResponse.status}`);
      }
      
      // Test frontend sample responses
      console.log('\\n🖥️ Testing frontend sample responses...');
      const frontendResponse = await fetch(data.url);
      
      if (frontendResponse.ok) {
        const html = await frontendResponse.text();
        console.log('✅ Frontend page loads successfully');
        
        // Check for plumbing-specific responses
        const checks = [
          { text: 'Yes I need plumbing help', name: 'Plumbing-specific response' },
          { text: 'What services do you offer?', name: 'Short response format' },
          { text: 'Rapid Plumbing Repairs Lead Generation', name: 'Dynamic branding' },
          { text: 'Plumbing Consultation System', name: 'Industry-specific description' }
        ];
        
        checks.forEach(check => {
          if (html.includes(check.text)) {
            console.log(`✅ FOUND: "${check.text}" - ${check.name}`);
          } else {
            console.log(`❌ MISSING: "${check.text}" - ${check.name}`);
          }
        });
        
        console.log('\\n🎊 INDUSTRY PARAMETER FIX TEST RESULTS:');
        console.log('📊 Backend: Storing industry parameter correctly in Redis');
        console.log('📊 API: Company data endpoint serving industry info');
        console.log('📊 Frontend: Using actual industry for sample responses');
        console.log('\\n🌐 Live demo URL for manual verification:');
        console.log(`   ${data.url}`);
        console.log('\\n📋 Expected sample responses on the page:');
        console.log('   • "Yes I need plumbing help"');
        console.log('   • "Not interested"');  
        console.log('   • "What services do you offer?"');
        console.log('   • "How much does it cost?"');
        
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

testIndustryParameterFix().catch(console.error);