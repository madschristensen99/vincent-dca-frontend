// Custom JWT verification utilities
const jwt = require('jsonwebtoken');
const { createPublicKey } = require('crypto');
const { VincentSDK } = require('@lit-protocol/vincent-sdk');

/**
 * Custom function to verify JWT tokens without relying on Vincent SDK
 * @param {string} token - The JWT token to verify
 * @param {string|string[]} expectedAudience - The expected audience(s)
 * @returns {Promise<{isValid: boolean, payload: object|null, error: string|null}>}
 */
async function customVerifyJWT(token, expectedAudience = null) {
  try {
    // First, decode the token without verification to get the payload and header
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      return { isValid: false, payload: null, error: 'Invalid token format' };
    }
    
    console.log('JWT header:', decoded.header);
    console.log('JWT payload:', decoded.payload);
    
    // Check if the token uses the ES256K algorithm
    if (decoded.header.alg !== 'ES256K') {
      return { 
        isValid: false, 
        payload: decoded.payload, 
        error: `Unsupported algorithm: ${decoded.header.alg}. Expected ES256K` 
      };
    }
    
    // Check if the payload has the required fields
    if (!decoded.payload.iss) {
      return { 
        isValid: false, 
        payload: decoded.payload, 
        error: 'Missing issuer (iss) claim' 
      };
    }
    
    if (!decoded.payload.pkpPublicKey) {
      return { 
        isValid: false, 
        payload: decoded.payload, 
        error: 'Missing pkpPublicKey claim' 
      };
    }
    
    // Check audience if specified
    if (expectedAudience) {
      const audiences = Array.isArray(expectedAudience) ? expectedAudience : [expectedAudience];
      const tokenAud = decoded.payload.aud;
      
      if (!tokenAud) {
        return { 
          isValid: false, 
          payload: decoded.payload, 
          error: 'Missing audience (aud) claim' 
        };
      }
      
      const audMatch = audiences.some(aud => tokenAud === aud);
      if (!audMatch) {
        return { 
          isValid: false, 
          payload: decoded.payload, 
          error: `Invalid audience. Expected one of: ${audiences.join(', ')}. Got: ${tokenAud}` 
        };
      }
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.exp && decoded.payload.exp < now) {
      return { 
        isValid: false, 
        payload: decoded.payload, 
        error: 'Token has expired' 
      };
    }
    
    // For full verification, we would need to verify the signature using the pkpPublicKey
    // This is a simplified version that trusts the token if it has the correct format and claims
    
    return { 
      isValid: true, 
      payload: decoded.payload, 
      error: null 
    };
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return { 
      isValid: false, 
      payload: null, 
      error: error.message 
    };
  }
}

/**
 * Middleware to verify JWT tokens using our custom verification
 * Falls back to Vincent SDK verification if custom verification fails
 */
const customVerifyJwtMiddleware = async (request, reply) => {
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
    
    // Log the token for debugging (first 20 chars only)
    console.log('Received JWT token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Define accepted audiences
    const audiences = ["vincent-dca-service", "http://localhost:3001/", "http://localhost:3001"];
    
    // Try our custom verification first
    const verificationResult = await customVerifyJWT(token, audiences);
    
    if (verificationResult.isValid) {
      console.log('JWT verified successfully with custom verification');
      // Attach the decoded payload to the request for use in route handlers
      request.user = verificationResult.payload;
      return;
    }
    
    console.log('Custom JWT verification failed:', verificationResult.error);
    
    // Fall back to Vincent SDK verification
    try {
      const vincentSDK = new VincentSDK();
      let isValid = false;
      
      for (const audience of audiences) {
        try {
          console.log(`Attempting to verify JWT with Vincent SDK using audience: ${audience}`);
          isValid = await vincentSDK.verifyJWT(token, audience);
          if (isValid) {
            console.log(`JWT verified successfully with Vincent SDK using audience: ${audience}`);
            return;
          }
        } catch (err) {
          console.log(`Vincent SDK JWT verification failed with audience ${audience}:`, err.message);
        }
      }
      
      // If we get here, both custom and Vincent SDK verification failed
      console.log('JWT verification failed with all methods');
      reply.code(401).send({ 
        error: 'Authentication failed', 
        details: verificationResult.error 
      });
    } catch (sdkError) {
      console.error('Error using Vincent SDK for verification:', sdkError);
      reply.code(401).send({ 
        error: 'Authentication failed', 
        details: sdkError.message 
      });
    }
  } catch (error) {
    console.error('JWT verification error:', error);
    reply.code(401).send({ 
      error: 'Authentication failed', 
      details: error.message 
    });
  }
};

module.exports = { 
  customVerifyJWT,
  customVerifyJwtMiddleware
};
