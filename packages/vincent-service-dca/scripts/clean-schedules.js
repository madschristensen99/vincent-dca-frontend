// Script to clean up old DCA schedules
// Usage: node scripts/clean-schedules.js [walletAddress]

import mongoose from 'mongoose';
import { config } from '@dotenvx/dotenvx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
config();
dotenv.config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vincent-service-dca';

// Schedule model (simplified version)
const scheduleSchema = new mongoose.Schema({
  walletAddress: String,
  purchaseIntervalSeconds: Number,
  purchaseAmount: String,
  active: Boolean,
  registeredAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

scheduleSchema.virtual('scheduleId').get(function() {
  return this._id.toString();
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

async function cleanSchedules(walletAddress) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // If no wallet address is provided, list all unique wallet addresses
    if (!walletAddress) {
      const addresses = await Schedule.distinct('walletAddress');
      console.log('Found wallet addresses with schedules:');
      addresses.forEach(addr => console.log(`- ${addr}`));
      console.log('\nTo clean schedules for a specific address, run:');
      console.log('node scripts/clean-schedules.js [walletAddress]');
    } else {
      // Find all schedules for the wallet address
      const schedules = await Schedule.find({ walletAddress }).sort({ registeredAt: -1 });
      
      if (schedules.length === 0) {
        console.log(`No schedules found for wallet address: ${walletAddress}`);
        return;
      }
      
      console.log(`Found ${schedules.length} schedules for wallet address: ${walletAddress}`);
      
      // Keep the most recent schedule
      const mostRecent = schedules[0];
      console.log(`Keeping most recent schedule (ID: ${mostRecent._id}) created at ${mostRecent.registeredAt}`);
      
      // Delete all other schedules
      if (schedules.length > 1) {
        const idsToDelete = schedules.slice(1).map(s => s._id);
        const result = await Schedule.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`Deleted ${result.deletedCount} old schedules`);
      } else {
        console.log('Only one schedule found, nothing to delete');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get wallet address from command line argument
const walletAddress = process.argv[2];
cleanSchedules(walletAddress);
