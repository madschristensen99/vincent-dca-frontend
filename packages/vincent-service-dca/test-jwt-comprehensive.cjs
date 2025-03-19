// Comprehensive test script for Vincent SDK JWT handling
const { VincentSDK } = require('@lit-protocol/vincent-sdk');
const jwt = require('jsonwebtoken');

// Sample JWT token to test
const jwtToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJpYXQiOjE3NDE5NzEzODAsImV4cCI6MTc0MTk3MzE4MCwibmFtZSI6IlVzZXIgTmFtZSIsImN1c3RvbUNsYWltIjoidmFsdWUiLCJ0aW1lc3RhbXAiOjE3NDE5NzEzODA1MDIsImlzcyI6ImRpZDpldGhyOjB4ZmMwNTc1NTNEMjI1OWM4MTJBRjYyZGQzRGM3ODk4OTIyOWFEZEZFYSIsInBrcFB1YmxpY0tleSI6IjB4MDRjOWZjYjk3ZTgxMzdiNjQ0ZDU1NmM4MGNhMWU2Y2ZkZjA1ZGM5Mjc0ZjRkMjExNDI1OGM4MzFiY2E4NmMwYmYzYzY2NTdiNDJjMDQ4YmVkMDRiMTAzYmMyY2QyY2NmMGE2ZDEzMWE2MGE0M2Y2N2U3MzMxMDZiMGZkYmU1ZGE1MyIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMS8ifQ.FPP33PCiRkjXOCKjU9S4GG2j4ksCTbFNimw52GVfdiE2x-tSUnahJdi3dBjWGolNqmy049zb-j8bSv5Peltuvw';

// Parse the JWT token to inspect its contents
function parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format: Expected 3 parts, got', parts.length);
      return null;
    }
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error parsing JWT:', e);
    return null;
  }
}

// Try all available JWT methods in the Vincent SDK
async function testAllSDKJwtMethods() {
  try {
    console.log('\n=== Testing All Vincent SDK JWT Methods ===');
    
    // Parse and log the JWT payload
    const payload = parseJwt(jwtToken);
    console.log('JWT Payload:', payload);
    
    // Create a new Vincent SDK instance
    const vincentSDK = new VincentSDK();
    console.log('Vincent SDK instance created');
    
    const results = {};
    
    // Test decodeJWT method
    try {
      console.log('\nTesting Vincent SDK decodeJWT method...');
      results.decodeJWT = vincentSDK.decodeJWT(jwtToken);
      console.log('decodeJWT result:', results.decodeJWT);
    } catch (e) {
      console.error('Error with decodeJWT:', e.message);
      results.decodeJWT = { error: e.message };
    }
    
    // Test getJWT method
    try {
      console.log('\nTesting Vincent SDK getJWT method...');
      results.getJWT = vincentSDK.getJWT();
      console.log('getJWT result:', results.getJWT);
    } catch (e) {
      console.error('Error with getJWT:', e.message);
      results.getJWT = { error: e.message };
    }
    
    // Test storeJWT method
    try {
      console.log('\nTesting Vincent SDK storeJWT method...');
      await vincentSDK.storeJWT(jwtToken);
      console.log('storeJWT completed successfully');
      results.storeJWT = { success: true };
      
      // After storing, check if getJWT now returns the stored JWT
      try {
        console.log('Checking if getJWT returns the stored JWT...');
        const storedJwt = vincentSDK.getJWT();
        console.log('getJWT after storing:', storedJwt ? storedJwt.substring(0, 20) + '...' : 'null');
        results.getJWTAfterStore = storedJwt;
      } catch (e) {
        console.error('Error with getJWT after store:', e.message);
        results.getJWTAfterStore = { error: e.message };
      }
      
      // After storing, try to verify
      try {
        console.log('\nTesting Vincent SDK verifyJWT after storing...');
        const audiences = ["vincent-dca-service", "http://localhost:3001/", "http://localhost:3001", null];
        
        for (const audience of audiences) {
          try {
            console.log(`Attempting to verify JWT with audience: ${audience || 'null'}`);
            const isValid = audience ? await vincentSDK.verifyJWT(jwtToken, audience) : await vincentSDK.verifyJWT(jwtToken);
            console.log('verifyJWT result:', isValid);
            
            if (isValid) {
              console.log('✅ JWT verified successfully with audience:', audience);
              results.verifyJWTAfterStore = { success: true, audience: audience };
              break;
            } else {
              console.log('❌ JWT verification failed with audience:', audience);
              results.verifyJWTAfterStore = { success: false, audience: audience };
            }
          } catch (err) {
            console.error('❌ Error during verification with audience', audience, ':', err.message);
            results.verifyJWTAfterStore = { error: err.message, audience: audience };
          }
        }
      } catch (e) {
        console.error('Error with verifyJWT after store:', e.message);
        results.verifyJWTAfterStore = { error: e.message };
      }
    } catch (e) {
      console.error('Error with storeJWT:', e.message);
      results.storeJWT = { error: e.message };
    }
    
    // Test clearJWT method
    try {
      console.log('\nTesting Vincent SDK clearJWT method...');
      vincentSDK.clearJWT();
      console.log('clearJWT completed successfully');
      results.clearJWT = { success: true };
      
      // After clearing, check if getJWT returns null
      try {
        console.log('Checking if getJWT returns null after clearing...');
        const clearedJwt = vincentSDK.getJWT();
        console.log('getJWT after clearing:', clearedJwt);
        results.getJWTAfterClear = clearedJwt;
      } catch (e) {
        console.error('Error with getJWT after clear:', e.message);
        results.getJWTAfterClear = { error: e.message };
      }
    } catch (e) {
      console.error('Error with clearJWT:', e.message);
      results.clearJWT = { error: e.message };
    }
    
    console.log('\n=== Test Results Summary ===');
    console.log(JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Test if the JWT is in the correct format expected by the Vincent SDK
function testJwtFormat() {
  console.log('\n=== Testing JWT Format ===');
  
  // Parse the JWT token
  const payload = parseJwt(jwtToken);
  if (!payload) {
    console.error('Failed to parse JWT token');
    return;
  }
  
  console.log('JWT has the following claims:');
  
  // Check for required claims based on Vincent SDK documentation
  const requiredClaims = ['iss', 'pkpPublicKey', 'aud'];
  const missingClaims = [];
  
  for (const claim of requiredClaims) {
    if (payload[claim]) {
      console.log(`✅ ${claim}: ${payload[claim]}`);
    } else {
      console.log(`❌ Missing required claim: ${claim}`);
      missingClaims.push(claim);
    }
  }
  
  // Check other standard JWT claims
  const standardClaims = ['iat', 'exp', 'sub', 'nbf'];
  for (const claim of standardClaims) {
    if (payload[claim]) {
      console.log(`✅ ${claim}: ${payload[claim]}`);
    } else {
      console.log(`ℹ️ Optional claim not present: ${claim}`);
    }
  }
  
  // Check JWT header
  try {
    const header = JSON.parse(Buffer.from(jwtToken.split('.')[0], 'base64').toString());
    console.log('\nJWT Header:', header);
    
    if (header.alg === 'ES256K') {
      console.log('✅ Algorithm is ES256K, which is expected for Ethereum-based signatures');
    } else {
      console.log(`❌ Algorithm is ${header.alg}, but Vincent SDK might expect ES256K`);
    }
    
    if (header.typ === 'JWT') {
      console.log('✅ Type is JWT');
    } else {
      console.log(`❌ Type is ${header.typ}, but should be JWT`);
    }
  } catch (e) {
    console.error('Error parsing JWT header:', e);
  }
  
  if (missingClaims.length > 0) {
    console.log(`\n❌ JWT is missing required claims: ${missingClaims.join(', ')}`);
  } else {
    console.log('\n✅ JWT has all required claims');
  }
}

// Main function to run all tests
async function runAllTests() {
  console.log('=== Starting Comprehensive JWT Tests ===');
  
  // Test JWT format
  testJwtFormat();
  
  // Test all SDK JWT methods
  await testAllSDKJwtMethods();
  
  console.log('\n=== All Tests Completed ===');
}

// Run all tests
runAllTests().catch(err => {
  console.error('Unhandled error in tests:', err);
});
