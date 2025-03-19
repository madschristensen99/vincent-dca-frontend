// Database connection module
import mongoose from 'mongoose';

// Get database name from URI
function getDatabaseName(uri) {
  try {
    // Extract database name from URI
    const matches = uri.match(/\/([^/?]+)(\?|$)/);
    return matches ? matches[1] : 'vincent-service-dca';
  } catch (e) {
    return 'vincent-service-dca';
  }
}

// Track connection status
let isConnected = false;

// Connect to MongoDB
export async function connectToDatabase() {
  // Prevent multiple connections
  if (isConnected) {
    console.log('Already connected to MongoDB, reusing existing connection');
    return true;
  }
  
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vincent-service-dca';
  
  // Log connection string with hidden password
  console.log(`Using MongoDB URI: ${dbUri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://user:***@')}`);
  
  // Get database name from URI
  const dbName = getDatabaseName(dbUri);
  console.log(`Target database name: ${dbName}`);
  
  // Prepare connection options
  const mongooseOptions = {
    serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    retryWrites: true,
    w: 'majority',
    authSource: 'admin' // Explicitly set auth source to admin for Atlas
  };
  
  try {
    await mongoose.connect(dbUri, mongooseOptions);
    console.log('Successfully connected to MongoDB');
    console.log(`Connected to database: ${dbName}`);
    isConnected = true;
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}
