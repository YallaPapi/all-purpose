const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

console.log('🔍 Debugging Upstash Vector Authentication');
console.log('');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('UPSTASH_VECTOR_REST_URL:', process.env.UPSTASH_VECTOR_REST_URL ? '✅ Set' : '❌ Missing');
console.log('UPSTASH_VECTOR_REST_TOKEN:', process.env.UPSTASH_VECTOR_REST_TOKEN ? '✅ Set' : '❌ Missing');
console.log('');

if (process.env.UPSTASH_VECTOR_REST_URL) {
  console.log('🌐 URL Details:');
  console.log('URL:', process.env.UPSTASH_VECTOR_REST_URL);
  console.log('');
}

if (process.env.UPSTASH_VECTOR_REST_TOKEN) {
  console.log('🔑 Token Details:');
  console.log('Token length:', process.env.UPSTASH_VECTOR_REST_TOKEN.length);
  console.log('Token prefix:', process.env.UPSTASH_VECTOR_REST_TOKEN.substring(0, 20) + '...');
  console.log('');
}

// Test different authentication approaches
async function testAuthentication() {
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  
  if (!token || !url) {
    console.log('❌ Missing required environment variables');
    return;
  }
  
  console.log('🧪 Testing Authentication Methods:');
  console.log('');
  
  // Test 1: Direct REST API call with Bearer token
  try {
    console.log('1️⃣ Testing Bearer Token with fetch...');
    const response = await fetch(`${url}/info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
    if (response.status === 200) {
      console.log('✅ Bearer token authentication successful');
    } else if (response.status === 403) {
      console.log('❌ 403 Forbidden - Token may be environment-restricted or IP-blocked');
    } else if (response.status === 401) {
      console.log('❌ 401 Unauthorized - Token invalid or expired');
    } else {
      console.log('❓ Unexpected status code');
    }
    
  } catch (error) {
    console.log('❌ Fetch failed:', error.message);
  }
  
  console.log('');
  
  // Test 2: Check if it's a base64 encoded credential
  try {
    console.log('2️⃣ Testing if token is base64 encoded...');
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    console.log('Decoded length:', decoded.length);
    console.log('Decoded preview:', decoded.substring(0, 50) + '...');
    
    if (decoded.includes(':')) {
      console.log('💡 Token appears to be base64 encoded username:password');
      const [username, password] = decoded.split(':');
      console.log('Username length:', username.length);
      console.log('Password length:', password.length);
      
      // Test with Basic Auth
      console.log('3️⃣ Testing Basic Auth...');
      const basicResponse = await fetch(`${url}/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const basicResult = await basicResponse.text();
      console.log('Basic Auth Status:', basicResponse.status);
      console.log('Basic Auth Response:', basicResult);
      
      if (basicResponse.status === 200) {
        console.log('✅ Basic Auth successful - token was base64 encoded credentials');
        return true;
      }
    }
    
  } catch (error) {
    console.log('❌ Base64 decode failed:', error.message);
  }
  
  console.log('');
  
  // Test 3: Try @upstash/vector SDK
  try {
    console.log('4️⃣ Testing @upstash/vector SDK...');
    const { Index } = require('@upstash/vector');
    
    const index = new Index({
      url: url,
      token: token
    });
    
    const info = await index.info();
    console.log('✅ SDK authentication successful');
    console.log('Index info:', info);
    
  } catch (error) {
    console.log('❌ SDK failed:', error.message);
  }
  
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. If Bearer token fails but Basic Auth works, use Basic Auth format');
  console.log('2. If both fail with 403, token may be Vercel-environment restricted');
  console.log('3. Generate a new token directly from Upstash console for local development');
  console.log('4. Check if your IP needs to be allowlisted in Upstash settings');
}

testAuthentication().catch(console.error);