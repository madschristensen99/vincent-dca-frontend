// Script to test Vincent Auth with the Example App parameters

// Example App parameters (known to work)
const EXAMPLE_APP_ID = 'my-example-app';
const EXAMPLE_APP_VERSION = '1';
const EXAMPLE_TOOL_IPFS_HASH = 'QmZ9mydsUQf3K7JvSDyZn7v9Fv5ZRzNrLMcuLCTdi4JE8h';

// Vincent DCA App parameters
const DCA_APP_ID = 'vincent-dca-app';
const DCA_APP_VERSION = '1';

// Get the Vincent Auth URL with appId parameter
const getVincentAuthUrl = (appId, version, redirectUrl) => {
  const baseUrl = 'https://vincent-auth.vercel.app/';
  const url = new URL(baseUrl);
  
  // Add required parameters
  url.searchParams.set('appId', appId);
  url.searchParams.set('version', version);
  url.searchParams.set('redirectUrl', redirectUrl);
  
  return url.toString();
};

// Generate URLs for Example App
const exampleLocalUrl = getVincentAuthUrl(EXAMPLE_APP_ID, EXAMPLE_APP_VERSION, 'http://localhost:3001');
const exampleProdUrl = getVincentAuthUrl(EXAMPLE_APP_ID, EXAMPLE_APP_VERSION, 'https://vincent-dca-4e2200eeaaa1.herokuapp.com');

// Generate URLs for Vincent DCA App
const dcaLocalUrl = getVincentAuthUrl(DCA_APP_ID, DCA_APP_VERSION, 'http://localhost:3001');
const dcaProdUrl = getVincentAuthUrl(DCA_APP_ID, DCA_APP_VERSION, 'https://vincent-dca-4e2200eeaaa1.herokuapp.com');

console.log('========== EXAMPLE APP URLS ==========');
console.log('Example App URL for local development:');
console.log(exampleLocalUrl);
console.log('\nExample App URL for production:');
console.log(exampleProdUrl);

console.log('\n========== VINCENT DCA APP URLS ==========');
console.log('Vincent DCA URL for local development:');
console.log(dcaLocalUrl);
console.log('\nVincent DCA URL for production:');
console.log(dcaProdUrl);

console.log('\n========== TESTING INSTRUCTIONS ==========');
console.log('1. Try the Example App URL first to confirm it works');
console.log('2. Then try the Vincent DCA URL to see if it works with the same format');
console.log('3. If the Example App works but Vincent DCA does not, the issue is likely with the app registration');
console.log('4. If neither works, the issue might be with the Vincent Auth service itself');
