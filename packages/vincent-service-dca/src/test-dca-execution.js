// Test script to manually execute a DCA transaction
import { connect } from 'mongoose';
import { Schedule } from './server/models/schedule.js';
import { executeDCATransaction } from './server/dca-processor.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://user:password@vincent-dca.dpjmn.mongodb.net/vincent-service-dca?retryWrites=true&w=majority&appName=vincent-dca';
const DB_NAME = process.env.DB_NAME || 'vincent-service-dca';

// Connect to MongoDB
async function connectToMongoDB() {
  console.log('Connecting to MongoDB...');
  console.log(`Using MongoDB URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//user:***@')}`);
  console.log(`Target database name: ${DB_NAME}`);
  
  try {
    await connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Successfully connected to MongoDB');
    console.log(`Connected to database: ${DB_NAME}`);
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    return false;
  }
}

// Main function to execute a DCA transaction
async function testDCAExecution() {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB, exiting...');
      process.exit(1);
    }
    
    // Find the first active schedule
    const schedule = await Schedule.findOne({ active: true }).lean();
    
    if (!schedule) {
      console.error('No active schedule found, exiting...');
      process.exit(1);
    }
    
    console.log(`Found active schedule: ${schedule._id}`);
    console.log(`Wallet address: ${schedule.walletAddress}`);
    console.log(`Token: ${schedule.tokenSymbol}`);
    console.log(`Amount: ${schedule.purchaseAmount} ETH`);
    
    // Execute the DCA transaction
    console.log('Executing DCA transaction...');
    await executeDCATransaction(schedule);
    
    console.log('DCA transaction executed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error executing DCA transaction:', error);
    process.exit(1);
  }
}

// Run the test
testDCAExecution();
