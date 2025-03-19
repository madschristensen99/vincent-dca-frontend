// Comprehensive test script for ERC20 transfer endpoints
const fetch = require('node-fetch');

// Sample JWT token for testing
const jwtToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJpYXQiOjE3NDE5NzEzODAsImV4cCI6MTc0MTk3MzE4MCwibmFtZSI6IlVzZXIgTmFtZSIsImN1c3RvbUNsYWltIjoidmFsdWUiLCJ0aW1lc3RhbXAiOjE3NDE5NzEzODA1MDIsImlzcyI6ImRpZDpldGhyOjB4ZmMwNTc1NTNEMjI1OWM4MTJBRjYyZGQzRGM3ODk4OTIyOWFEZEZFYSIsInBrcFB1YmxpY0tleSI6IjB4MDRjOWZjYjk3ZTgxMzdiNjQ0ZDU1NmM4MGNhMWU2Y2ZkZjA1ZGM5Mjc0ZjRkMjExNDI1OGM4MzFiY2E4NmMwYmYzYzY2NTdiNDJjMDQ4YmVkMDRiMTAzYmMyY2QyY2NmMGE2ZDEzMWE2MGE0M2Y2N2U3MzMxMDZiMGZkYmU1ZGE1MyIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMS8ifQ.FPP33PCiRkjXOCKjU9S4GG2j4ksCTbFNimw52GVfdiE2x-tSUnahJdi3dBjWGolNqmy049zb-j8bSv5Peltuvw';

// Sample request body for ERC20 transfer
const requestBody = {
  tokenAddress: '0x1234567890123456789012345678901234567890',
  recipientAddress: '0x0987654321098765432109876543210987654321',
  amount: '0.01',
  decimals: 18
};

async function testErc20Endpoints() {
  console.log('=== Testing ERC20 Transfer Endpoints ===\n');
  
  // Test the no-auth endpoint first
  console.log('1. Testing /api/tools/execute-erc20-transfer-no-auth endpoint:');
  try {
    const noAuthResponse = await fetch('http://localhost:3000/api/tools/execute-erc20-transfer-no-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Status:', noAuthResponse.status);
    const noAuthResult = await noAuthResponse.json();
    console.log('Response:', JSON.stringify(noAuthResult, null, 2));
    
    if (noAuthResponse.status === 200) {
      console.log('✅ No-auth endpoint working correctly\n');
    } else {
      console.log('❌ No-auth endpoint returned an error\n');
    }
  } catch (error) {
    console.error('Error testing no-auth endpoint:', error.message, '\n');
  }
  
  // Test the authenticated endpoint
  console.log('2. Testing /api/tools/execute-erc20-transfer endpoint with JWT:');
  try {
    const authResponse = await fetch('http://localhost:3000/api/tools/execute-erc20-transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Status:', authResponse.status);
    const authResult = await authResponse.json();
    console.log('Response:', JSON.stringify(authResult, null, 2));
    
    if (authResponse.status === 200) {
      console.log('✅ Authenticated endpoint working correctly\n');
    } else {
      console.log('❌ Authenticated endpoint returned an error\n');
    }
  } catch (error) {
    console.error('Error testing authenticated endpoint:', error.message, '\n');
  }
  
  // Test the /test-jwt endpoint to verify JWT handling
  console.log('3. Testing /test-jwt endpoint:');
  try {
    const jwtResponse = await fetch('http://localhost:3000/test-jwt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log('Status:', jwtResponse.status);
    const jwtResult = await jwtResponse.json();
    console.log('Response:', JSON.stringify(jwtResult, null, 2));
    
    if (jwtResponse.status === 200) {
      console.log('✅ JWT verification working correctly\n');
    } else {
      console.log('❌ JWT verification returned an error\n');
    }
  } catch (error) {
    console.error('Error testing JWT verification:', error.message, '\n');
  }
}

// Run the tests
testErc20Endpoints().catch(console.error);
