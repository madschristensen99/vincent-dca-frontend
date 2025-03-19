// Configuration for the Vincent DCA frontend
// This file centralizes all configuration settings

// Backend API URL - use local backend for development
export const BACKEND_API_URL = '/api';

// BaseScan API settings
export const BASESCAN_API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '';
export const BASESCAN_API_URL = 'https://api.basescan.org/api';

// JWT Authentication settings
export const JWT_EXPIRATION_MINUTES = 30;
// Allow both the Vincent Auth domain and the current hostname
export const JWT_AUDIENCE = typeof window !== 'undefined' ? window.location.origin : 'vincent-auth.vercel.app';

// Default settings
export const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute in milliseconds

// Storage key for JWT in localStorage
export const JWT_STORAGE_KEY = 'vincent_dca_jwt';

// Get JWT from localStorage
export const getStoredJWT = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const jwt = localStorage.getItem(JWT_STORAGE_KEY);
    
    // Check if the JWT exists and has a valid format before returning
    if (jwt && jwt.split('.').length === 3) {
      return jwt;
    }
    
    // If JWT is invalid, remove it from localStorage
    if (jwt) {
      console.warn('Invalid JWT found in localStorage, removing it');
      localStorage.removeItem(JWT_STORAGE_KEY);
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving JWT from localStorage:', error);
    return null;
  }
};

// Store JWT in localStorage
export const storeJWT = (jwt: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(JWT_STORAGE_KEY, jwt);
  } catch (error) {
    console.error('Error storing JWT in localStorage:', error);
  }
};

// Clear JWT from localStorage
export const clearJWT = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(JWT_STORAGE_KEY);
  }
};

// Validate JWT format
export const isValidJWT = (token: string): boolean => {
  // Check if token has three parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Check if each part is base64url encoded
  try {
    for (const part of parts) {
      // Base64url uses '-' instead of '+' and '_' instead of '/'
      // and doesn't have padding ('=')
      if (!/^[A-Za-z0-9_-]+$/.test(part)) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
};

// API request helper function with JWT authentication
export const createAuthHeaders = (jwt: string | null = getStoredJWT()) => {
  if (!jwt) {
    throw new Error('No JWT token available. Please authenticate first.');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`
  };
};
