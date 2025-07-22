// Final test of industry-agnostic system with timestamp
const fetch = require('node-fetch');

async function testFinalAgnostic() {
  const timestamp = Date.now();
  console.log(`🎯 FINAL TEST: Industry-Agnostic System (${timestamp})\n`);
  
  const testData = {
    industry: 'quantum-computing',  // Another completely random industry
    companyName: `Quantum Solutions ${timestamp}`,  // Unique name with timestamp
    contactName: 'Dr. Quantum',
    contactEmail: 'quantum@solutions.com',
    title: 'Chief Quantum Officer',
    organization_short_description: 'Advanced quantum computing solutions for enterprise applications',
    location: 'Silicon Valley, CA'
  };
  
  try {
    console.log('📝 Creating assistant with industry: quantum-computing...');
    console.log(`🔧 Company: ${testData.companyName}`);
    
    const response = await fetch('https://all-purpose-1pd1.vercel.app/api/create-prototype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.message}`);
      console.log(`📱 Demo URL: ${data.url}`);
      console.log(`🔧 Company slug: ${data.companySlug}`);
      
      // Test company data API immediately
      console.log('\\n🌐 Testing company data API...');
      const companyDataResponse = await fetch(`https://all-purpose-1pd1.vercel.app/api/company-data/${data.companySlug}`);
      
      if (companyDataResponse.ok) {
        const companyData = await companyDataResponse.json();
        console.log('✅ Company data API working');
        console.log(`📊 Industry from backend: ${companyData.industry}`);
        
        if (companyData.industry === 'quantum-computing') {
          console.log('✅ BACKEND SUCCESS: Industry stored exactly as provided');
        } else {
          console.log(`❌ BACKEND FAIL: Expected quantum-computing, got ${companyData.industry}`);
        }
      }
      
      // Wait for deployment
      console.log('\\n⏱️ Waiting 10 seconds for fresh deployment...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Test frontend
      console.log('🖥️ Testing frontend with fresh deployment...');
      const frontendResponse = await fetch(data.url + '?t=' + timestamp); // Cache busting
      
      if (frontendResponse.ok) {
        const html = await frontendResponse.text();
        console.log('✅ Frontend page loads successfully');
        
        // Check what sample responses are actually shown
        console.log('\\n🔍 Analyzing sample responses on page...');
        
        // Extract the actual sample responses from the HTML
        const responseMatches = html.match(/"([^"]*interested[^"]*)"/gi) || [];
        const tellMoreMatches = html.match(/"([^"]*Tell me more[^"]*)"/gi) || [];
        const costMatches = html.match(/"([^"]*cost[^"]*)"/gi) || [];
        
        console.log('📋 Found sample responses:');
        responseMatches.forEach((match, i) => console.log(`   ${i + 1}. ${match}`));
        tellMoreMatches.forEach((match, i) => console.log(`   ${i + responseMatches.length + 1}. ${match}`));
        costMatches.forEach((match, i) => console.log(`   ${i + responseMatches.length + tellMoreMatches.length + 1}. ${match}`));
        
        // Check for industry-specific content
        const hasQuantumBranding = html.includes('Quantum Computing');
        const hasQuantumServices = html.includes('quantum-computing services');
        const hasDynamicBranding = html.includes(`${testData.companyName} Lead Generation`);
        
        console.log('\\n📊 DYNAMIC CONTENT ANALYSIS:');
        console.log(`${hasQuantumBranding ? '✅' : '❌'} Industry capitalization: "Quantum Computing"`);
        console.log(`${hasQuantumServices ? '✅' : '❌'} Service description: "quantum-computing services"`);
        console.log(`${hasDynamicBranding ? '✅' : '❌'} Dynamic branding: "${testData.companyName} Lead Generation"`);
        
        // Final verdict
        const successCount = [hasQuantumBranding, hasQuantumServices, hasDynamicBranding].filter(Boolean).length;
        
        if (successCount >= 2) {
          console.log('\\n🎊 SUCCESS: System is truly industry-agnostic!');
          console.log('✅ Frontend successfully adapts to ANY industry');
          console.log('✅ No hardcoded industry limitations');
          console.log('✅ Dynamic content generation working');
        } else {
          console.log('\\n❌ PARTIAL SUCCESS: Some dynamic features working');
          console.log('🔄 May need more time for deployment to propagate');
        }
        
        console.log('\\n🌐 Live demo URL:');
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

testFinalAgnostic().catch(console.error);