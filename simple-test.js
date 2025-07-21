// Simple test to see API response
const apiUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/create-prototype';

async function simpleTest() {
  console.log('🧪 Simple API Test');
  console.log('URL:', apiUrl);
  
  const payload = {
    companyName: "Test Company",
    contactName: "John Test",
    industry: "dental"
  };
  
  try {
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body (first 500 chars):', responseText.substring(0, 500));
    
    // Try to parse as JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('✅ JSON Response:', jsonResponse);
    } catch (parseError) {
      console.log('❌ Failed to parse as JSON:', parseError.message);
      console.log('Raw response:', responseText);
    }
    
  } catch (error) {
    console.log('🚨 Request Failed:', error.message);
  }
}

simpleTest().catch(console.error);