// Test script for the updated authentication middleware
const { verifyJwtMiddleware } = require('./src/middleware/auth.cjs');

// Sample JWT token to test
const jwtToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJpYXQiOjE3NDE5NjkwMDQsImV4cCI6MTc0MTk3MDgwNCwibmFtZSI6IlVzZXIgTmFtZSIsImN1c3RvbUNsYWltIjoidmFsdWUiLCJ0aW1lc3RhbXAiOjE3NDE5NjkwMDQwNDYsImlzcyI6ImRpZDpldGhyOjB4RDI2Mzg5ZUI3QjIxM2NBNzAzMjhBNWNlYTFhOTc3RTVkNEZCYjM2NyIsInBrcFB1YmxpY0tleSI6IjB4MDQ0Mjc5MzMxM2IxOWRjNmVjNjQ0MWY2MTRjOGVjZGNkYTFhZWFkNTQ0ZWUyNzU2NzJiZTZlY2M5YzcyNzY0YzNmMDkwNjlhMTE3YTIyNjg5NzRjZjQ1N2VmODE1ODU4NzJlMzM0YWE0MWQ3MmRmNWNhMDE0OTZlYTgzZmI5YWM0OCIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMS8ifQ.MjTMi_ynnfH2jcL8lB2JQhJ4hgy7HV6hmumtpvCjqq0nQuoHMuZgk31iWXtptySO8mtImeCn1CZWgfbvli81qg';

// Mock request and reply objects
function createMockRequest(headers = {}) {
  return {
    headers: headers
  };
}

function createMockReply() {
  const reply = {
    statusCode: 200,
    sentPayload: null,
    code: function(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    send: function(payload) {
      this.sentPayload = payload;
      return this;
    }
  };
  return reply;
}

// Test cases
async function runTests() {
  console.log('=== Testing Updated Authentication Middleware ===\n');
  
  // Test 1: Valid JWT token
  console.log('Test 1: Valid JWT token with correct audience');
  const validRequest = createMockRequest({
    authorization: `Bearer ${jwtToken}`
  });
  const validReply = createMockReply();
  
  try {
    await verifyJwtMiddleware(validRequest, validReply);
    if (validReply.statusCode === 200) {
      console.log('✅ Test passed: JWT was verified successfully');
    } else {
      console.log(`❌ Test failed: Expected status code 200, got ${validReply.statusCode}`);
      console.log('Error:', validReply.sentPayload);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
  
  // Test 2: Missing authorization header
  console.log('\nTest 2: Missing authorization header');
  const noAuthRequest = createMockRequest({});
  const noAuthReply = createMockReply();
  
  try {
    await verifyJwtMiddleware(noAuthRequest, noAuthReply);
    if (noAuthReply.statusCode === 401) {
      console.log('✅ Test passed: Returned 401 for missing authorization header');
    } else {
      console.log(`❌ Test failed: Expected status code 401, got ${noAuthReply.statusCode}`);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
  
  // Test 3: Invalid authorization format
  console.log('\nTest 3: Invalid authorization format (missing Bearer prefix)');
  const invalidFormatRequest = createMockRequest({
    authorization: jwtToken
  });
  const invalidFormatReply = createMockReply();
  
  try {
    await verifyJwtMiddleware(invalidFormatRequest, invalidFormatReply);
    if (invalidFormatReply.statusCode === 401) {
      console.log('✅ Test passed: Returned 401 for invalid authorization format');
    } else {
      console.log(`❌ Test failed: Expected status code 401, got ${invalidFormatReply.statusCode}`);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
  
  // Test 4: Invalid JWT token
  console.log('\nTest 4: Invalid JWT token');
  const invalidTokenRequest = createMockRequest({
    authorization: 'Bearer invalid.jwt.token'
  });
  const invalidTokenReply = createMockReply();
  
  try {
    await verifyJwtMiddleware(invalidTokenRequest, invalidTokenReply);
    if (invalidTokenReply.statusCode === 401) {
      console.log('✅ Test passed: Returned 401 for invalid JWT token');
    } else {
      console.log(`❌ Test failed: Expected status code 401, got ${invalidTokenReply.statusCode}`);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
  
  console.log('\n=== Authentication Middleware Tests Completed ===');
}

// Run the tests
runTests().catch(err => {
  console.error('Unhandled error in tests:', err);
});
