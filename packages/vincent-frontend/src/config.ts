// Configuration for the Vincent DCA frontend
// This file centralizes all configuration settings

// Backend API URL - use Heroku deployed backend
export const BACKEND_API_URL = 'https://vincent-dca-4e2200eeaaa1.herokuapp.com';

// BaseScan API settings
export const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '';
export const BASESCAN_API_URL = 'https://api.basescan.org/api';

// JWT Authentication settings
export const JWT_EXPIRATION_MINUTES = 30;
export const JWT_AUDIENCE = 'vincent-dca-app';

// Mock JWT token for development - will be replaced with actual JWT in production
export const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Default settings
export const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute in milliseconds

// API request helper function with JWT authentication
export const createAuthHeaders = (jwt: string = MOCK_JWT) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`
  };
};
