import axios from 'axios';

// Test script for the DCA swap endpoints
async function testDcaSwapEndpoints() {
  console.log('Testing DCA swap endpoints...');
  
  // Test data
  const testData = {
    pkpEthAddress: '0x1234567890123456789012345678901234567890',
    rpcUrl: 'https://sepolia.base.org',
    chainId: '84532', // Base Sepolia
    tokenIn: 'ETH',
    tokenOut: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', // BDOGE on Base Sepolia
    amountIn: '0.01',
    scheduleId: 'test-schedule-id',
    toolIpfsId: 'QmTestToolIpfsId',
    policyIpfsId: 'QmTestPolicyIpfsId'
  };
  
  // Mock JWT token for testing
  const mockJwt = "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiJwa3AtYWRkcmVzcyIsImF1ZCI6InZpbmNlbnQtZGNhIiwicGtwUHVibGljS2V5IjoicGstYWRkcmVzcyIsImV4cCI6MTcxNjI4OTAxNX0.mock-signature";
  
  // Test the no-auth endpoint first
  try {
    console.log('Testing no-auth DCA swap endpoint...');
    const noAuthResponse = await axios.post('http://localhost:3000/api/tools/execute-dca-swap-no-auth', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('No-auth DCA swap response:');
    console.log(JSON.stringify(noAuthResponse.data, null, 2));
    console.log('No-auth DCA swap test: SUCCESS ');
  } catch (error) {
    console.error('No-auth DCA swap test failed:');
    console.error(error.response?.data || error.message);
    console.log('No-auth DCA swap test: FAILED ');
  }
  
  // Test the authenticated endpoint
  try {
    console.log('\nTesting authenticated DCA swap endpoint...');
    const authResponse = await axios.post('http://localhost:3000/api/tools/execute-dca-swap', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockJwt}`
      }
    });
    
    console.log('Authenticated DCA swap response:');
    console.log(JSON.stringify(authResponse.data, null, 2));
    console.log('Authenticated DCA swap test: SUCCESS ');
  } catch (error) {
    console.error('Authenticated DCA swap test failed:');
    console.error(error.response?.data || error.message);
    console.log('Authenticated DCA swap test: FAILED ');
  }
  
  // Test the authenticated endpoint with missing JWT
  try {
    console.log('\nTesting authenticated DCA swap endpoint with missing JWT...');
    const missingJwtResponse = await axios.post('http://localhost:3000/api/tools/execute-dca-swap', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Missing JWT response:');
    console.log(JSON.stringify(missingJwtResponse.data, null, 2));
    console.log('This should have failed but succeeded: UNEXPECTED ');
  } catch (error) {
    console.log('Missing JWT appropriately rejected:');
    console.log(error.response?.data || error.message);
    console.log('Missing JWT test: SUCCESS ');
  }
}

// Run the tests
testDcaSwapEndpoints().catch(console.error);
