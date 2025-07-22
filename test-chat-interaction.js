// Test chat interaction to verify organization_short_description intelligence
const chatApiUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/chat';

const testCompanies = [
  {
    name: 'Premier Luxury Motors',
    slug: 'premier-luxury-motors',
    industry: 'automotive',
    description: 'Luxury car dealership specializing in Mercedes-Benz, BMW, and Audi vehicles',
    expectedKeywords: ['luxury', 'Mercedes', 'BMW', 'Audi', 'premium', 'high-end']
  },
  {
    name: 'Quick Fix Auto Repair',
    slug: 'quick-fix-auto-repair',
    industry: 'automotive',
    description: 'Full-service auto repair shop providing brake service, oil changes, and transmission repair',
    expectedKeywords: ['brake', 'oil change', 'transmission', 'repair', 'maintenance', 'service']
  },
  {
    name: 'Perfect Smile Cosmetic Dentistry',
    slug: 'perfect-smile-cosmetic-dentistry',
    industry: 'dental',
    description: 'Cosmetic dentistry practice specializing in veneers, teeth whitening, and smile makeovers',
    expectedKeywords: ['veneers', 'whitening', 'smile', 'cosmetic', 'makeover', 'aesthetic']
  }
];

async function testChatInteraction(company) {
  console.log(`\n🧪 Testing Chat for: ${company.name}`);
  console.log(`Industry: ${company.industry}`);
  console.log(`Description: ${company.description}`);
  console.log(`Expected keywords: ${company.expectedKeywords.join(', ')}`);
  
  try {
    // Start a new conversation to get the initial message
    const response = await fetch(chatApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        company: company.slug,
        initialize: true
      })
    });
    
    if (!response.ok) {
      console.log(`❌ HTTP Error: ${response.status}`);
      const errorText = await response.text();
      console.log(`Error details: ${errorText}`);
      return;
    }
    
    const result = await response.json();
    
    if (result.message) {
      console.log(`✅ Initial AI Message: "${result.message}"`);
      
      // Check if the message contains expected keywords for this business type
      const messageText = result.message.toLowerCase();
      const foundKeywords = company.expectedKeywords.filter(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length > 0) {
        console.log(`🎯 Found relevant keywords: ${foundKeywords.join(', ')}`);
        console.log(`✅ AI appears to be adapting to business type!`);
      } else {
        console.log(`⚠️  No specific business keywords found in initial message`);
        console.log(`   This might be expected if AI waits for user interaction first`);
      }
    } else {
      console.log(`❌ No reply received`);
      console.log(`Full response:`, result);
    }
    
  } catch (error) {
    console.log(`🚨 Request Failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🧪 Testing Chat Interactions with Organization Description Intelligence\n');
  
  for (const company of testCompanies) {
    await testChatInteraction(company);
    console.log('---');
  }
  
  console.log('\n🎯 Analysis:');
  console.log('- Luxury dealership should mention high-end vehicles or specific brands');
  console.log('- Auto repair should mention maintenance issues or specific services');
  console.log('- Cosmetic dentistry should mention aesthetic concerns or specific procedures');
  console.log('\nIf no keywords appear in initial messages, the AI might be waiting for');
  console.log('user responses before showing its specialized knowledge.');
}

// Check if running directly
if (typeof module !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testCompanies, testChatInteraction, runAllTests };