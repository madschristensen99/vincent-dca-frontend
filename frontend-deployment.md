# Frontend Deployment Guide

This guide will help you deploy the Vincent DCA frontend code to a separate repository.

## Option 1: Clone and Copy Approach (Recommended)

This approach involves cloning the frontend repository, copying the updated files, and then pushing the changes.

```bash
# Step 1: Clone the frontend repository
git clone git@github.com:madschristensen99/vincent-dca-frontend.git
cd vincent-dca-frontend

# Step 2: Copy the updated frontend files
cp -r /home/remsee/vincentAssemble/vincentDca/packages/vincent-frontend/* .

# Step 3: Commit and push the changes
git add .
git commit -m "Update frontend with latest changes"
git push origin main
```

## Option 2: Create a New Branch and Force Push

If you prefer to completely replace the frontend repository content with your current code:

```bash
# Step 1: Create a new branch from your current code
cd /home/remsee/vincentAssemble/vincentDca
git checkout -b frontend-only
git subtree split --prefix packages/vincent-frontend -b frontend-split

# Step 2: Force push to the frontend repository
git push -f frontend frontend-split:main

# Step 3: Clean up temporary branches
git checkout main
git branch -D frontend-only
git branch -D frontend-split
```

## Option 3: Manual File Upload

If you prefer a more manual approach:

1. Go to https://github.com/madschristensen99/vincent-dca-frontend
2. Click on "Add file" > "Upload files"
3. Drag and drop the files from `/home/remsee/vincentAssemble/vincentDca/packages/vincent-frontend/`
4. Commit the changes directly to the main branch

## Environment Configuration

Before deploying, make sure to set up the environment variables:

1. Create a `.env.local` file in the frontend project with:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   NEXT_PUBLIC_BASESCAN_API_KEY=your_basescan_api_key
   ```

2. If deploying to Vercel or Netlify, set these environment variables in their respective dashboards.

## JWT Authentication

Remember that the application uses JWT authentication for API requests. The current implementation uses a mock JWT token for development, but in production, you should use the Vincent SDK's `createSignedJWT` method as described in the documentation.

The JWT token must be included in the Authorization header with the Bearer scheme for all API requests:

```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${jwtToken}`
};
```

## Deployment Platforms

### Vercel (Recommended)
1. Connect your GitHub repository
2. Set the environment variables
3. Deploy automatically

### Netlify
1. Connect your GitHub repository
2. Set the environment variables
3. Deploy with continuous integration

## Testing the Deployment

After deploying, make sure to test:
1. Connection to the backend API
2. JWT authentication
3. DCA schedule creation and management
4. Transaction simulation and execution
