// Test API with secret key
const apiUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/create-prototype';
const secretKey = '5UVV8pX8IlADxk6Hb2P0SiKGEQXBIlNW';

async function testWithKey() {
  console.log('🧪 Testing API with Secret Key');
  console.log('URL:', apiUrl);
  
  const payload = {
    companyName: "Test Company",
    contactName: "John Test",
    industry: "dental"
  };
  
  // Try different ways to include the secret key
  const testCases = [
    {
      name: 'Authorization Header',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`
      }
    },
    {
      name: 'X-API-Key Header',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': secretKey
      }
    },
    {
      name: 'X-Secret-Key Header',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': secretKey
      }
    },
    {
      name: 'Query Parameter',
      headers: {
        'Content-Type': 'application/json'
      },
      url: `${apiUrl}?key=${secretKey}`
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch(testCase.url || apiUrl, {
        method: 'POST',
        headers: testCase.headers,
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      
      if (response.status !== 401) {
        console.log('✅ Success! Auth bypassed');
        const responseText = await response.text();
        try {
          const jsonResponse = JSON.parse(responseText);
          console.log('JSON Response:', jsonResponse);
          return; // Success, stop testing other methods
        } catch (parseError) {
          console.log('Response body:', responseText.substring(0, 200));
        }
      } else {
        console.log('❌ Still getting 401');
      }
      
    } catch (error) {
      console.log('🚨 Request Failed:', error.message);
    }
  }
}

testWithKey().catch(console.error);