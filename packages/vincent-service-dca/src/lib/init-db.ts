import mongoose from 'mongoose';

async function initializeDatabase() {
  try {
    const dbUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vincent-service-dca';
    await mongoose.connect(dbUri);
    console.log('Successfully connected to MongoDB');

    // Only drop the database in development mode
    if (process.env.NODE_ENV !== 'production') {
      await mongoose.connection.dropDatabase();
      console.log('Existing database dropped (development mode only)');
    }

    await mongoose.disconnect();
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
