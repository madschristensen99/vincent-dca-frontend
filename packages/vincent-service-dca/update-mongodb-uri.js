// Script to generate Heroku CLI command with the correct MongoDB URI
const password = encodeURIComponent('5DseMfsz7UpgOGrC');
const encodedUri = `mongodb+srv://mads:${password}@vincent-dca.dpjmn.mongodb.net/vincent-service-dca?retryWrites=true&w=majority`;

console.log('Run this command to update your MongoDB URI in Heroku:');
console.log(`\nheroku config:set MONGODB_URI="${encodedUri}" --app vincent-dca-4e2200eeaaa1`);
console.log('\nTo verify your environment variables:');
console.log('heroku config --app vincent-dca-4e2200eeaaa1');

console.log('\n\nURL-encoded connection string for reference:');
console.log(encodedUri);
