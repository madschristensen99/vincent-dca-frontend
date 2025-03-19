// Test script to debug Vincent SDK's verifyJWT function
const { VincentSDK } = require('@lit-protocol/vincent-sdk');

// Sample JWT token to test
const jwtToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJpYXQiOjE3NDE5NjkwMDQsImV4cCI6MTc0MTk3MDgwNCwibmFtZSI6IlVzZXIgTmFtZSIsImN1c3RvbUNsYWltIjoidmFsdWUiLCJ0aW1lc3RhbXAiOjE3NDE5NjkwMDQwNDYsImlzcyI6ImRpZDpldGhyOjB4RDI2Mzg5ZUI3QjIxM2NBNzAzMjhBNWNlYTFhOTc3RTVkNEZCYjM2NyIsInBrcFB1YmxpY0tleSI6IjB4MDQ0Mjc5MzMxM2IxOWRjNmVjNjQ0MWY2MTRjOGVjZGNkYTFhZWFkNTQ0ZWUyNzU2NzJiZTZlY2M5YzcyNzY0YzNmMDkwNjlhMTE3YTIyNjg5NzRjZjQ1N2VmODE1ODU4NzJlMzM0YWE0MWQ3MmRmNWNhMDE0OTZlYTgzZmI5YWM0OCIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMS8ifQ.MjTMi_ynnfH2jcL8lB2JQhJ4hgy7HV6hmumtpvCjqq0nQuoHMuZgk31iWXtptySO8mtImeCn1CZWgfbvli81qg';

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

// Examine the Vincent SDK object
function inspectSDK() {
  const vincentSDK = new VincentSDK();
  
  // Get all properties and methods of the SDK
  console.log('\n=== Vincent SDK Properties and Methods ===');
  const properties = Object.getOwnPropertyNames(Object.getPrototypeOf(vincentSDK));
  properties.forEach(prop => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(vincentSDK), prop);
    if (typeof descriptor.value === 'function') {
      console.log(`Method: ${prop}`);
      
      // Get function parameters
      const funcStr = descriptor.value.toString();
      const paramMatch = funcStr.match(/\(([^)]*)\)/);
      if (paramMatch && paramMatch[1]) {
        console.log(`  Parameters: ${paramMatch[1]}`);
      } else {
        console.log('  Parameters: none or could not determine');
      }
    } else {
      console.log(`Property: ${prop}`);
    }
  });
}

// Main test function
async function testSDKJWT() {
  try {
    console.log('=== Testing Vincent SDK JWT Handling ===');
    
    // Parse and log the JWT payload
    const payload = parseJwt(jwtToken);
    console.log('JWT Payload:', payload);
    
    // Create a new Vincent SDK instance
    const vincentSDK = new VincentSDK();
    console.log('Vincent SDK instance created');
    
    // Inspect the SDK
    inspectSDK();
    
    // Test with the audience from the token
    const audience = payload.aud;
    console.log(`\nTesting with audience from token: "${audience}"`);
    
    try {
      // Try to access the verifyJWT method directly
      console.log('Vincent SDK verifyJWT method:', typeof vincentSDK.verifyJWT);
      
      // Check if we can modify the method for debugging
      const originalVerifyJWT = vincentSDK.verifyJWT;
      vincentSDK.verifyJWT = async function(token, aud) {
        console.log('Custom verifyJWT called with token:', token.substring(0, 20) + '...');
        console.log('Custom verifyJWT called with audience:', aud);
        try {
          return await originalVerifyJWT.call(this, token, aud);
        } catch (error) {
          console.error('Error in original verifyJWT:', error.message);
          throw error;
        }
      };
      
      // Call the modified method
      console.log('Calling modified vincentSDK.verifyJWT...');
      const isValid = await vincentSDK.verifyJWT(jwtToken, audience);
      console.log('JWT verification result:', isValid);
    } catch (error) {
      console.error('Error during verification:', error.message);
      console.error('Error stack:', error.stack);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testSDKJWT().then(() => {
  console.log('\nTest completed');
}).catch(err => {
  console.error('Unhandled error in test:', err);
});
