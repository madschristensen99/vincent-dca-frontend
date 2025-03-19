// JWT Authentication utilities
import { VincentSDK } from '@lit-protocol/vincent-sdk';

/**
 * Get JWT token from localStorage
 * @returns JWT token or null if not found
 */
export const getJwtFromLocalStorage = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vincent_jwt');
};

/**
 * Store JWT token in localStorage
 * @param token JWT token to store
 */
export const storeJwtInLocalStorage = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vincent_jwt', token);
};

/**
 * Remove JWT token from localStorage
 */
export const removeJwtFromLocalStorage = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('vincent_jwt');
};

/**
 * Check if JWT token exists in localStorage
 * @returns boolean indicating if token exists
 */
export const hasJwtInLocalStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('vincent_jwt');
};

/**
 * Get authorization headers with JWT token
 * @returns Headers object with Authorization header
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getJwtFromLocalStorage();
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Verify JWT token using Vincent SDK
 * @param token JWT token to verify
 * @returns Promise resolving to boolean indicating if token is valid
 */
export const verifyJwtToken = async (token: string): Promise<boolean> => {
  try {
    const vincent = new VincentSDK();
    // Store the JWT before verification
    storeJwtInLocalStorage(token);
    // Verify the JWT - the SDK only takes one parameter
    const isValid = await vincent.verifyJWT(token);
    return isValid;
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return false;
  }
};

/**
 * Extract wallet address from JWT token
 * @param token JWT token
 * @returns Ethereum address or null if not found
 */
export const getWalletAddressFromJwt = (token: string): string | null => {
  try {
    // JWT is in format header.payload.signature
    const payload = token.split('.')[1];
    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payload));
    
    // Check if the payload contains an ethAddress claim
    if (decodedPayload.ethAddress) {
      return decodedPayload.ethAddress;
    } else if (decodedPayload.sub) {
      // If no ethAddress, try to use the subject claim which might be the address
      return decodedPayload.sub;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting wallet address from JWT:', error);
    return null;
  }
};

/**
 * Handle authentication flow
 * Checks for JWT in URL or localStorage, verifies it, and redirects to auth if needed
 * @returns Promise resolving to object with authentication status, JWT token, and wallet address
 */
export const handleAuthentication = async (): Promise<{
  isAuthenticated: boolean;
  jwtToken: string | null;
  walletAddress: string | null;
}> => {
  try {
    // Check for JWT in URL parameters
    const params = new URLSearchParams(window.location.search);
    let jwt = params.get('jwt');
    
    // If not in URL, try to get from localStorage
    if (!jwt) {
      jwt = getJwtFromLocalStorage();
    }
    
    // If we have a JWT, verify it
    if (jwt) {
      const isValid = await verifyJwtToken(jwt);
      
      if (isValid) {
        // Store the JWT in localStorage for future use
        storeJwtInLocalStorage(jwt);
        
        // Get wallet address from JWT
        const walletAddress = getWalletAddressFromJwt(jwt);
        
        return {
          isAuthenticated: true,
          jwtToken: jwt,
          walletAddress
        };
      }
    }
    
    // No valid JWT
    return {
      isAuthenticated: false,
      jwtToken: null,
      walletAddress: null
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      isAuthenticated: false,
      jwtToken: null,
      walletAddress: null
    };
  }
};

/**
 * Redirect to Vincent Auth consent page
 */
export const redirectToVincentAuth = (): void => {
  const redirectUrl = encodeURIComponent(window.location.href);
  window.location.href = `https://vincent-auth.vercel.app/?redirect=${redirectUrl}`;
};
