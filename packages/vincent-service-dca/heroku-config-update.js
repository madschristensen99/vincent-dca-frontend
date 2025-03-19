// Script to generate Heroku CLI commands with URL-encoded password
const password = encodeURIComponent('5DseMfsz7UpgOGrC');
const encodedUri = `mongodb+srv://mads:${password}@vincent-dca.dpjmn.mongodb.net/vincent-service-dca?retryWrites=true&w=majority`;

console.log('Run these commands to update your Heroku environment variables:');
console.log(`\nheroku config:set MONGODB_URI="${encodedUri}" --app vincent-dca-4e2200eeaaa1`);
console.log('\nheroku config:set NODE_ENV="production" --app vincent-dca-4e2200eeaaa1');
console.log('\nTo verify your environment variables:');
console.log('heroku config --app vincent-dca-4e2200eeaaa1');

console.log('\n\nURL-encoded connection string:');
console.log(encodedUri);
