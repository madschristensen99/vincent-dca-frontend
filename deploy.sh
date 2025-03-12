#!/bin/bash

# Vincent DCA Deployment Script
# This script helps deploy the Vincent DCA application to separate repositories
# for backend and frontend code.

echo "===== Vincent DCA Deployment Script ====="
echo "This script will help you deploy the Vincent DCA application to GitHub."
echo ""

# Check if MongoDB Atlas connection string is set
echo "Step 1: Setting up MongoDB Atlas"
echo "-------------------------------"
echo "To set up MongoDB Atlas:"
echo "1. Create an account at https://www.mongodb.com/cloud/atlas"
echo "2. Create a new cluster (the free tier is sufficient for development)"
echo "3. Create a database user with read/write permissions"
echo "4. Add your IP address to the IP Access List (or use 0.0.0.0/0 for all IPs)"
echo "5. Get your connection string from the 'Connect' button"
echo ""
echo "Once you have your MongoDB Atlas connection string, add it to your .env file:"
echo "MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/vincent-service-dca?retryWrites=true&w=majority"
echo ""

read -p "Have you set up MongoDB Atlas and updated your .env file? (y/n): " mongodb_ready
if [ "$mongodb_ready" != "y" ]; then
  echo "Please set up MongoDB Atlas before continuing."
  exit 1
fi

# Deploy backend
echo ""
echo "Step 2: Deploying Backend to GitHub"
echo "-------------------------------"
echo "This will push the backend code to https://github.com/madschristensen99/vincent-dca"
echo ""

read -p "Do you want to deploy the backend code? (y/n): " deploy_backend
if [ "$deploy_backend" = "y" ]; then
  echo "Pushing backend code to vincent-dca repository..."
  git push origin main
  echo "Backend code deployed successfully!"
else
  echo "Skipping backend deployment."
fi

# Deploy frontend
echo ""
echo "Step 3: Deploying Frontend to GitHub"
echo "-------------------------------"
echo "This will push the frontend code to https://github.com/madschristensen99/vincent-dca-frontend"
echo ""

read -p "Do you want to deploy the frontend code? (y/n): " deploy_frontend
if [ "$deploy_frontend" = "y" ]; then
  echo "Creating a subtree for the frontend code..."
  git subtree push --prefix packages/vincent-frontend frontend main
  echo "Frontend code deployed successfully!"
else
  echo "Skipping frontend deployment."
fi

echo ""
echo "===== Deployment Complete ====="
echo ""
echo "Next steps:"
echo "1. Set up your hosting platform for the backend (Heroku, Vercel, Railway, etc.)"
echo "2. Set up your hosting platform for the frontend (Vercel, Netlify, etc.)"
echo "3. Update the frontend environment variables to point to your deployed backend"
echo ""
echo "For more information, refer to the README.md file."
