// Test script for industry parameter API functionality
const apiUrl = 'https://all-purpose-1pd1-rku255jxe-stuartoden-2590s-projects.vercel.app/api/create-prototype';

const testCases = [
  {
    name: 'Dental Industry',
    payload: {
      companyName: 'Bright Dental',
      contactName: 'Dr. Sarah Johnson',
      contactEmail: 'sarah@brightdental.com',
      location: 'Austin, TX',
      title: 'Lead Dentist',
      industry: 'dental'
    }
  },
  {
    name: 'Automotive Industry', 
    payload: {
      companyName: 'Austin Auto Sales',
      contactName: 'Mike Rodriguez',
      contactEmail: 'mike@austinauto.com',
      location: 'Austin, TX',
      title: 'Sales Manager',
      industry: 'automotive'
    }
  },
  {
    name: 'Business Funding',
    payload: {
      companyName: 'Growth Capital Partners',
      contactName: 'Jennifer Kim',
      contactEmail: 'jen@growthcap.com',
      location: 'Dallas, TX',
      title: 'CEO',
      industry: 'business-funding'
    }
  },
  {
    name: 'No Industry (Default)',
    payload: {
      companyName: 'Generic Services Inc',
      contactName: 'John Smith',
      contactEmail: 'john@generic.com',
      location: 'Houston, TX',
      title: 'Owner'
      // No industry field
    }
  },
  {
    name: 'Invalid Industry',
    payload: {
      companyName: 'Random Company',
      contactName: 'Jane Doe',
      contactEmail: 'jane@random.com',
      location: 'San Antonio, TX',
      title: 'Manager',
      industry: 'nonexistent-industry'
    }
  }
];

async function testAPI() {
  console.log('🧪 Testing Create-Prototype API with Industry Parameter\n');
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('Payload:', JSON.stringify(testCase.payload, null, 2));
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.payload)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Success:', result.message);
        console.log('   Assistant ID:', result.assistantId);
        console.log('   Demo URL:', result.url);
        console.log('   Company Slug:', result.companySlug);
      } else {
        console.log('❌ Error:', result.error);
        if (result.details) console.log('   Details:', result.details);
      }
      
    } catch (error) {
      console.log('🚨 Request Failed:', error.message);
    }
    
    console.log('---');
  }
}

// Check if running directly
if (typeof module !== 'undefined' && require.main === module) {
  testAPI().catch(console.error);
}

module.exports = { testCases, testAPI };