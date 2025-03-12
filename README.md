# Vincent - Memecoin DCA Platform

Vincent is a Dollar-Cost Averaging (DCA) platform that allows users to automatically purchase cryptocurrencies at regular intervals. This approach helps reduce the impact of volatility and eliminates the need for timing the market.

## Features

- **Automated Purchases**: Schedule automatic purchases of cryptocurrencies at regular intervals
- **Flexible Scheduling**: Choose from various frequency options (10 seconds for testing, minute, hourly, daily, weekly, monthly)
- **Transaction History**: View all your DCA transactions in one place
- **Active DCA Management**: Easily activate, deactivate, or modify your DCA schedules

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Yarn package manager

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/Vincent.git
   cd Vincent
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Set up environment variables:
   ```
   cd packages/vincent-service-dca
   cp .env.example .env
   ```
   Edit the `.env` file to add your MongoDB connection string and other required variables.

### Database Setup

#### Local MongoDB
1. Start MongoDB locally:
   ```
   mongod --dbpath /path/to/data/directory
   ```

#### MongoDB Atlas (Recommended for Production)
1. Create an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (the free tier is sufficient for development)
3. Create a database user with read/write permissions
4. Add your IP address to the IP Access List (or use 0.0.0.0/0 for all IPs)
5. Get your connection string from the "Connect" button
6. Update your `.env` file with the MongoDB Atlas connection string:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/vincent-service-dca?retryWrites=true&w=majority
   ```

### Running the Application

1. Start the backend service:
   ```
   cd packages/vincent-service-dca
   node enhanced-server.cjs
   ```
   The server will run on http://localhost:3000

2. Start the frontend application:
   ```
   cd packages/vincent-frontend
   yarn dev
   ```
   The frontend will run on http://localhost:5173

### Deployment

#### GitHub Repository Setup
1. Create a new GitHub repository
2. Initialize git in your local project (if not already done):
   ```
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Add your GitHub repository as a remote:
   ```
   git remote add origin https://github.com/your-username/your-repo-name.git
   ```
4. Push your code to GitHub:
   ```
   git push -u origin main
   ```

#### Backend Deployment Options
1. **Heroku**:
   - Create a new Heroku app
   - Set up the MongoDB Atlas connection string as a config var
   - Deploy using the Heroku CLI or GitHub integration

2. **Vercel**:
   - Connect your GitHub repository
   - Set up environment variables
   - Deploy using Vercel's Node.js runtime

3. **Railway**:
   - Connect your GitHub repository
   - Set up environment variables
   - Deploy with one click

#### Frontend Deployment Options
1. **Vercel**:
   - Connect your GitHub repository
   - Set up environment variables (NEXT_PUBLIC_BACKEND_URL)
   - Deploy automatically

2. **Netlify**:
   - Connect your GitHub repository
   - Set up environment variables
   - Deploy with continuous integration

## How to Use the DCA Dashboard

### Creating a DCA Schedule

1. Navigate to the DCA Dashboard at http://localhost:5173
2. Connect your wallet using the "Connect Wallet" button
3. In the "Create DCA" tab:
   - Enter the amount in USDC you want to invest regularly
   - Select your preferred frequency (daily, weekly, etc.)
   - Click "Create DCA"
4. Approve the transaction in your wallet

### Managing Your DCA Schedules

1. Navigate to the "Active DCAs" tab to view all your active schedules
2. For each DCA schedule, you can:
   - View details (amount, frequency, creation date)
   - Activate or deactivate the schedule using the toggle button
   - Simulate a transaction to test the functionality

### Viewing Transaction History

1. Navigate to the "Transaction History" tab
2. View all your past DCA transactions, including:
   - Transaction date and time
   - Token purchased
   - Amount spent
   - Transaction status
   - Link to view the transaction on the blockchain explorer

## Technical Details

The Vincent DCA platform consists of:

1. **Backend Service (vincent-service-dca)**:
   - Built with Fastify
   - Connects to MongoDB for data storage
   - Processes DCA transactions at specified intervals
   - Provides RESTful API endpoints for the frontend

2. **Frontend Application (vincent-frontend)**:
   - Built with Next.js and React
   - Provides a user-friendly interface for managing DCA schedules
   - Connects to the backend service via HTTP

## Troubleshooting

- **MongoDB Connection Issues**: Ensure MongoDB is running on port 27017
- **Transaction Failures**: Check your wallet has sufficient funds and proper approvals
- **Server Not Starting**: Check if port 3000 is already in use by another application

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
