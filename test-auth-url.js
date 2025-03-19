// Simple script to generate and test the Vincent Auth URL

// App ID for Vincent DCA - registered on all environments
const APP_ID = 'vincent-dca-app';
const APP_VERSION = '1';

// Get the Vincent Auth URL with appId parameter
const getVincentAuthUrl = (redirectUrl) => {
  const baseUrl = 'https://vincent-auth.vercel.app/';
  const url = new URL(baseUrl);
  
  // Add required parameters
  url.searchParams.set('appId', APP_ID);
  url.searchParams.set('version', APP_VERSION);
  url.searchParams.set('redirectUrl', redirectUrl);
  
  return url.toString();
};

// Generate URLs for different environments
const localUrl = getVincentAuthUrl('http://localhost:3001');
const prodUrl = getVincentAuthUrl('https://vincent-dca-4e2200eeaaa1.herokuapp.com');

console.log('Vincent Auth URL for local development:');
console.log(localUrl);
console.log('\nVincent Auth URL for production:');
console.log(prodUrl);
console.log('\nTo test the authentication flow:');
console.log('1. Copy one of the URLs above');
console.log('2. Open it in your browser');
console.log('3. Complete the consent flow');
console.log('4. You should be redirected back to the application with a JWT in the URL');
