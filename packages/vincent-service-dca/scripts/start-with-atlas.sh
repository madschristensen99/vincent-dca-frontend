#!/bin/bash

# Script to start the Vincent DCA service with MongoDB Atlas connection
# Make sure to update your .env file with the correct MongoDB Atlas URI before running this script

# Check if .env file exists
if [ ! -f ../.env ]; then
  echo "Error: .env file not found. Please create one based on .env.example"
  exit 1
fi

# Export MongoDB Atlas URI from .env file
export $(grep -v '^#' ../.env | xargs)

# Verify that MONGODB_URI is set
if [ -z "$MONGODB_URI" ]; then
  echo "Error: MONGODB_URI is not set in your .env file"
  exit 1
fi

echo "Starting Vincent DCA service with MongoDB Atlas connection..."
echo "MongoDB URI: $MONGODB_URI"

# Start the service
cd ..
node enhanced-server.cjs
