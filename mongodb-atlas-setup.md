# MongoDB Atlas Setup Guide for Vincent DCA

This guide will help you set up MongoDB Atlas for your Vincent DCA application. MongoDB Atlas is a fully-managed cloud database service that handles all the complexity of deploying, managing, and healing your deployments on the cloud service provider of your choice.

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account if you don't already have one.
2. After signing up, you'll be prompted to create your first cluster.

## Step 2: Create a Cluster

1. Choose the "FREE" tier for your cluster.
2. Select your preferred cloud provider (AWS, Google Cloud, or Azure) and region (choose one close to your users for better performance).
3. Keep the default cluster tier (M0 Sandbox - Free).
4. Name your cluster (e.g., "vincent-dca-cluster").
5. Click "Create Cluster" and wait for the cluster to be provisioned (this may take a few minutes).

## Step 3: Create a Database User

1. In the left sidebar, click on "Database Access" under the Security section.
2. Click the "Add New Database User" button.
3. Choose "Password" as the authentication method.
4. Enter a username and a secure password.
5. Under "Database User Privileges", select "Atlas admin" for simplicity (you can set more granular permissions later if needed).
6. Click "Add User" to create the database user.

## Step 4: Configure Network Access

1. In the left sidebar, click on "Network Access" under the Security section.
2. Click the "Add IP Address" button.
3. For development, you can click "Allow Access from Anywhere" (this adds 0.0.0.0/0).
   - For production, you should restrict access to specific IP addresses.
4. Click "Confirm" to save the IP address.

## Step 5: Get Your Connection String

1. Go back to the "Database" section in the left sidebar.
2. Click "Connect" on your cluster.
3. Select "Connect your application".
4. Choose "Node.js" as your driver and the latest version.
5. Copy the connection string provided.
6. Replace `<password>` with your database user's password.
7. Replace `<dbname>` with `vincent-service-dca`.

## Step 6: Update Your Application

1. Create a `.env` file in your `packages/vincent-service-dca` directory if it doesn't exist already.
2. Add the following line to your `.env` file:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/vincent-service-dca?retryWrites=true&w=majority
   ```
   Replace `<username>`, `<password>`, and `<cluster-name>` with your actual values.
3. Make sure to add `NODE_ENV=production` to your `.env` file for production deployments.

## Step 7: Initialize Your Database (Optional)

If you need to initialize your database with some data:

1. Make sure your `.env` file is properly configured.
2. Run the initialization script:
   ```
   cd packages/vincent-service-dca
   node src/lib/init-db.js
   ```
   Note: In production mode, this script will not drop the database.

## Step 8: Test Your Connection

1. Start your application to test the connection:
   ```
   cd packages/vincent-service-dca
   node enhanced-server.cjs
   ```
2. Check the logs to ensure that the connection to MongoDB Atlas is successful.

## Troubleshooting

- If you encounter connection issues, verify that your IP address is allowed in the Network Access settings.
- Double-check your username, password, and connection string.
- Ensure that your database user has the appropriate permissions.
- Check if your firewall is blocking outgoing connections to MongoDB Atlas.

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver Documentation](https://docs.mongodb.com/drivers/node/)
- [MongoDB Connection String URI Format](https://docs.mongodb.com/manual/reference/connection-string/)
