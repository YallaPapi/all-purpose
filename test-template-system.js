// Test the new template system
const fetch = require('node-fetch');

async function testTemplateSystem() {
  console.log('Testing new template system integration...');
  
  const testPayloads = [
    {
      industry: 'dental',
      companyName: 'Bright Smile Dental',
      contactName: 'Dr. Sarah Johnson',
      contactEmail: 'sarah@brightsmile.com',
      organization_short_description: 'Family dental practice specializing in preventive care and cosmetic dentistry',
      location: 'Austin, TX'
    },
    {
      industry: 'automotive',
      companyName: 'Premium Auto Dealership',
      contactName: 'Mike Thompson',
      contactEmail: 'mike@premiumauto.com',
      organization_short_description: 'Luxury car dealership specializing in BMW and Mercedes',
      location: 'Dallas, TX'
    },
    {
      industry: 'fitness',
      companyName: 'Elite Fitness Studio',
      contactName: 'Jake Martinez',
      contactEmail: 'jake@elitefitness.com',
      organization_short_description: 'Personal training studio focused on strength and conditioning',
      location: 'Houston, TX'
    }
  ];
  
  for (const payload of testPayloads) {
    console.log(`\n--- Testing ${payload.industry} industry ---`);
    
    try {
      const response = await fetch('http://localhost:3000/api/create-prototype', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        continue;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ ${data.message}`);
        console.log(`📱 Demo URL: ${data.url}`);
        console.log(`🤖 Assistant ID: ${data.assistantId}`);
      } else {
        console.error(`❌ API Error: ${data.error}`);
      }
      
    } catch (error) {
      console.error(`❌ Request failed for ${payload.industry}:`, error.message);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Run the test
testTemplateSystem().catch(console.error);