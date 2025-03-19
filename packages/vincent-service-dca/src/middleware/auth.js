// JWT Authentication Middleware
import { VincentSDK } from '@lit-protocol/vincent-sdk';

/**
 * Middleware to verify JWT tokens from requests
 * Uses the Vincent SDK's verifyJWT method to validate tokens
 */
export const verifyJwtMiddleware = async (request, reply) => {
  try {
    // Get the authorization header
    const authHeader = request.headers.authorization;
    
    // Check if the authorization header exists and has the correct format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth header missing or invalid format:', authHeader);
      reply.code(401).send({ error: 'Authentication required. Please provide a valid JWT token.' });
      return;
    }
    
    // Extract the JWT token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Initialize the Vincent SDK
    const vincentSDK = new VincentSDK();
    
    // Log the token for debugging (first 20 chars only)
    console.log('Received JWT token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('Token length:', token.length);
    console.log('Token format check:', token.split('.').length === 3 ? 'Valid (3 parts)' : 'Invalid (not 3 parts)');
    
    try {
      // Try to decode the token to see if it's valid JWT format
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        try {
          const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log('JWT header:', header);
          console.log('JWT payload:', payload);
          
          // Check if the payload has an audience
          if (payload.aud) {
            console.log('JWT audience:', payload.aud);
          } else {
            console.log('JWT has no audience claim');
          }
        } catch (decodeError) {
          console.error('Error decoding JWT parts:', decodeError.message);
        }
      }
    } catch (err) {
      console.error('Error parsing JWT token:', err.message);
    }
    
    // Verify the JWT token with multiple possible audience values
    // This allows for different environments and configurations
    const audiences = ["vincent-dca-service", "http://localhost:3001/", "http://localhost:3001"];
    let isValid = false;
    
    for (const audience of audiences) {
      try {
        console.log(`Attempting to verify JWT with audience: ${audience}`);
        isValid = await vincentSDK.verifyJWT(token, audience);
        if (isValid) {
          console.log(`JWT verified successfully with audience: ${audience}`);
          break;
        }
      } catch (err) {
        console.log(`JWT verification failed with audience ${audience}:`, err.message);
      }
    }
    
    if (!isValid) {
      console.log('JWT verification failed with all audiences');
      reply.code(401).send({ error: 'Authentication failed', details: 'No JWT found' });
      return;
    }
    
    // If the token is valid, continue to the route handler
  } catch (error) {
    console.error('Error in JWT verification middleware:', error.message);
    reply.code(401).send({ error: 'Authentication failed', details: error.message });
  }
};
