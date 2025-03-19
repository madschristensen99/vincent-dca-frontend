// Script to generate Heroku CLI commands to set up environment variables
console.log('Run these commands to set up your Heroku environment variables:');
console.log('\nheroku config:set MONGODB_URI="mongodb+srv://mads:5DseMfsz7UpgOGrC@vincent-dca.dpjmn.mongodb.net/vincent-service-dca?retryWrites=true&w=majority" --app vincent-dca-4e2200eeaaa1');
console.log('\nheroku config:set NODE_ENV="production" --app vincent-dca-4e2200eeaaa1');
console.log('\nTo verify your environment variables:');
console.log('heroku config --app vincent-dca-4e2200eeaaa1');
