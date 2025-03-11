// Script to clean up all DCA schedules, keeping only the most recent one per wallet address
// Usage: node scripts/cleanup-all-schedules.js

import mongoose from 'mongoose';
import { config } from '@dotenvx/dotenvx';
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

async function cleanupAllSchedules() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all unique wallet addresses
    const addresses = await Schedule.distinct('walletAddress');
    console.log(`Found ${addresses.length} unique wallet addresses with schedules`);

    let totalDeleted = 0;
    let totalKept = 0;

    // Process each wallet address
    for (const address of addresses) {
      // Find all schedules for this wallet address, sorted by registeredAt in descending order
      const schedules = await Schedule.find({ walletAddress: address }).sort({ registeredAt: -1 });
      
      if (schedules.length === 0) {
        continue;
      }
      
      console.log(`\nProcessing wallet address: ${address}`);
      console.log(`Found ${schedules.length} schedules`);
      
      if (schedules.length === 1) {
        console.log('Only one schedule found, nothing to delete');
        totalKept++;
        continue;
      }
      
      // Keep the most recent schedule
      const mostRecent = schedules[0];
      console.log(`Keeping most recent schedule (ID: ${mostRecent._id}) created at ${mostRecent.registeredAt}`);
      totalKept++;
      
      // Delete all other schedules
      const idsToDelete = schedules.slice(1).map(s => s._id);
      const result = await Schedule.deleteMany({ _id: { $in: idsToDelete } });
      console.log(`Deleted ${result.deletedCount} old schedules`);
      totalDeleted += result.deletedCount;
    }

    console.log('\nCleanup Summary:');
    console.log(`Total schedules kept: ${totalKept}`);
    console.log(`Total schedules deleted: ${totalDeleted}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the cleanup
cleanupAllSchedules();
