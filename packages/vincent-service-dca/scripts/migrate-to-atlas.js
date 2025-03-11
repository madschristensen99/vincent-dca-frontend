// Script to migrate data from local MongoDB to MongoDB Atlas
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const LOCAL_DB_URI = 'mongodb://localhost:27017/vincent-service-dca';
// Replace with your actual Atlas connection string
const ATLAS_DB_URI = 'mongodb+srv://mads:zGScNFlVTm3pKUnI@vincent-dca.dpjmn.mongodb.net/vincent-service-dca?retryWrites=true&w=majority&appName=vincent-dca';
const COLLECTIONS = ['schedules', 'purchasedcoins', 'agendaJobs']; // Add all collections you need to migrate

// Temporary directory for data dumps
const TEMP_DIR = path.join(__dirname, 'temp_migration');

async function main() {
  console.log('Starting migration from local MongoDB to MongoDB Atlas...');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  
  try {
    // Connect to local MongoDB
    const localClient = new MongoClient(LOCAL_DB_URI);
    await localClient.connect();
    console.log('Connected to local MongoDB');
    
    const localDb = localClient.db();
    
    // Connect to Atlas MongoDB
    const atlasClient = new MongoClient(ATLAS_DB_URI);
    await atlasClient.connect();
    console.log('Connected to MongoDB Atlas');
    
    const atlasDb = atlasClient.db();
    
    // Migrate each collection
    for (const collectionName of COLLECTIONS) {
      console.log(`Migrating collection: ${collectionName}`);
      
      // Get data from local collection
      const localCollection = localDb.collection(collectionName);
      const documents = await localCollection.find({}).toArray();
      
      if (documents.length === 0) {
        console.log(`  No documents found in ${collectionName}, skipping...`);
        continue;
      }
      
      console.log(`  Found ${documents.length} documents in ${collectionName}`);
      
      // Write to temp file (optional, for backup)
      const tempFile = path.join(TEMP_DIR, `${collectionName}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(documents, null, 2));
      console.log(`  Backed up to ${tempFile}`);
      
      // Insert into Atlas collection
      const atlasCollection = atlasDb.collection(collectionName);
      
      // Drop existing data in the Atlas collection if it exists
      try {
        await atlasCollection.drop();
        console.log(`  Dropped existing collection in Atlas`);
      } catch (err) {
        // Collection might not exist yet, which is fine
        console.log(`  No existing collection to drop in Atlas`);
      }
      
      // Insert the documents
      if (documents.length > 0) {
        const result = await atlasCollection.insertMany(documents);
        console.log(`  Inserted ${result.insertedCount} documents into Atlas`);
      }
    }
    
    console.log('Migration completed successfully!');
    
    // Close connections
    await localClient.close();
    await atlasClient.close();
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

main().catch(console.error);
