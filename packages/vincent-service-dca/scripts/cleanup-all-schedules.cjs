// Script to clean up all DCA schedules, keeping only the most recent one per wallet address
// Usage: node scripts/cleanup-all-schedules.cjs

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/vincent-service-dca';

async function cleanupAllSchedules() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the schedules collection directly
    const schedules = mongoose.connection.collection('schedules');
    
    // Get all unique wallet addresses
    const addresses = await schedules.distinct('walletAddress');
    console.log(`Found ${addresses.length} unique wallet addresses with schedules`);

    let totalDeleted = 0;
    let totalKept = 0;

    // Process each wallet address
    for (const address of addresses) {
      // Find all schedules for this wallet address, sorted by registeredAt in descending order
      const walletSchedules = await schedules.find({ walletAddress: address })
        .sort({ registeredAt: -1 })
        .toArray();
      
      if (walletSchedules.length === 0) {
        continue;
      }
      
      console.log(`\nProcessing wallet address: ${address}`);
      console.log(`Found ${walletSchedules.length} schedules`);
      
      if (walletSchedules.length === 1) {
        console.log('Only one schedule found, nothing to delete');
        totalKept++;
        continue;
      }
      
      // Keep the most recent schedule
      const mostRecent = walletSchedules[0];
      console.log(`Keeping most recent schedule (ID: ${mostRecent._id}) created at ${mostRecent.registeredAt}`);
      totalKept++;
      
      // Delete all other schedules
      const idsToDelete = walletSchedules.slice(1).map(s => s._id);
      const result = await schedules.deleteMany({ _id: { $in: idsToDelete } });
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
