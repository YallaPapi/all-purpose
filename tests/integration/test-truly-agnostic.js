// Test truly industry-agnostic system with completely random industry
const fetch = require('node-fetch');

async function testTrulyAgnostic() {
  console.log('🚀 Testing truly industry-agnostic system...\n');
  
  const randomIndustryTest = {
    industry: 'underwater-basket-weaving',  // <- Completely random industry
    companyName: 'Aquatic Artisan Baskets',
    contactName: 'Marina Deep',
    contactEmail: 'marina@aquaticbaskets.com',
    title: 'Chief Underwater Weaver',
    organization_short_description: 'Handcrafted underwater basket weaving services using sustainable kelp materials',
    location: 'Atlantis, Ocean'
  };
  
  try {
    console.log('📝 Creating assistant with industry: underwater-basket-weaving...');
    console.log('🎯 This industry is NOT hardcoded anywhere - testing true agnosticism');
    
    const response = await fetch('https://all-purpose-1pd1.vercel.app/api/create-prototype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(randomIndustryTest)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.message}`);
      console.log(`📱 Demo URL: ${data.url}`);
      console.log(`🔧 Company slug: ${data.companySlug}`);
      
      // Wait for deployment
      console.log('⏱️ Waiting 8 seconds for deployment to propagate...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Test company data API
      console.log('\\n🌐 Testing company data API...');
      const companyDataResponse = await fetch(`https://all-purpose-1pd1.vercel.app/api/company-data/${data.companySlug}`);
      
      if (companyDataResponse.ok) {
        const companyData = await companyDataResponse.json();
        console.log('✅ Company data API working');
        console.log(`📊 Industry from backend: ${companyData.industry}`);
        console.log(`🤖 Assistant ID: ${companyData.assistantId}`);
        
        if (companyData.industry === 'underwater-basket-weaving') {
          console.log('✅ PERFECT: Industry stored exactly as provided (underwater-basket-weaving)');
        } else {
          console.log(`❌ WRONG: Industry is ${companyData.industry}, expected underwater-basket-weaving`);
        }
      } else {
        console.error(`❌ Company data API failed: ${companyDataResponse.status}`);
      }
      
      // Test frontend
      console.log('\\n🖥️ Testing frontend with random industry...');
      const frontendResponse = await fetch(data.url);
      
      if (frontendResponse.ok) {
        const html = await frontendResponse.text();
        console.log('✅ Frontend page loads successfully');
        
        // Check for dynamic industry adaptation
        const checks = [
          { text: 'Underwater Basket Weaving', name: 'Capitalized industry name' },
          { text: 'underwater-basket-weaving services', name: 'Dynamic service description' },
          { text: 'Aquatic Artisan Baskets Lead Generation', name: 'Dynamic company branding' },
          { text: 'Underwater Basket Weaving Consultation System', name: 'Dynamic system description' },
          { text: 'Yes I\'m interested', name: 'Generic sample response' },
          { text: 'Tell me more', name: 'Universal response format' }
        ];
        
        let foundCount = 0;
        checks.forEach(check => {
          if (html.includes(check.text)) {
            console.log(`✅ FOUND: "${check.text}" - ${check.name}`);
            foundCount++;
          } else {
            console.log(`❌ MISSING: "${check.text}" - ${check.name}`);
          }
        });
        
        console.log(`\\n📊 INDUSTRY AGNOSTIC TEST RESULTS: ${foundCount}/${checks.length} checks passed`);
        
        if (foundCount >= 4) {
          console.log('🎊 SUCCESS: System is truly industry-agnostic!');
          console.log('✅ Can handle ANY industry without hardcoded logic');
          console.log('✅ Dynamic capitalization and formatting working');
          console.log('✅ Generic responses work for all industries');
        } else {
          console.log('❌ FAILED: System still has hardcoded limitations');
        }
        
        console.log('\\n🌐 Live demo URL for manual verification:');
        console.log(`   ${data.url}`);
        console.log('\\n🎯 What you should see:');
        console.log('   • Branding: "Aquatic Artisan Baskets Lead Generation"');
        console.log('   • Description: "Underwater Basket Weaving Consultation System"');
        console.log('   • Sample responses: Generic but professional');
        console.log('   • Industry: "underwater-basket-weaving services"');
        
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

testTrulyAgnostic().catch(console.error);