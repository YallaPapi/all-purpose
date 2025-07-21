// Test debug endpoint
const debugUrl = 'https://all-purpose-1pd1-git-main-stuartoden-2590s-projects.vercel.app/api/debug';

async function testDebug() {
  console.log('🧪 Testing Debug Endpoint');
  console.log('URL:', debugUrl);
  
  try {
    const response = await fetch(debugUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    
    if (response.status === 200) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ Debug Endpoint Working!');
        console.log('Response:', JSON.stringify(jsonResponse, null, 2));
      } catch (parseError) {
        console.log('Response body:', responseText.substring(0, 500));
      }
    } else {
      console.log('❌ Debug endpoint also protected');
      console.log('Response body:', responseText.substring(0, 200));
    }
    
  } catch (error) {
    console.log('🚨 Request Failed:', error.message);
  }
}

testDebug().catch(console.error);