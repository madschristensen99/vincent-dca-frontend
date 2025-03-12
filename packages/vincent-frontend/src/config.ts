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

// Default settings
export const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute in milliseconds
