#!/bin/bash

# Script to run the Vincent DCA service with MongoDB Atlas connection

# Directly set the MongoDB URI to avoid parsing issues
export MONGODB_URI="mongodb+srv://mads:zGScNFlVTm3pKUnI@vincent-dca.dpjmn.mongodb.net/vincent-service-dca?retryWrites=true&w=majority&appName=vincent-dca"

echo "Starting Vincent DCA service with MongoDB Atlas connection..."
echo "MongoDB URI: $MONGODB_URI"

# Navigate to the root directory and start the server
cd ..
node enhanced-server.cjs
