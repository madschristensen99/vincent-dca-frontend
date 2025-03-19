// JWT Authentication Middleware
const { VincentSDK } = require('@lit-protocol/vincent-sdk');
const vincentSDK = new VincentSDK();

/**
 * Middleware to verify JWT tokens from requests
 * @param {Object} request - The request object
 * @param {Object} reply - The reply object
 */
async function verifyJwtMiddleware(request, reply) {
  try {
    // Check if authorization header exists and has correct format
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Authentication required.' });
    }

    // Extract the token
    const token = authHeader.substring(7);
    
    // Store the JWT in the SDK first (this is required before verification)
    await vincentSDK.storeJWT(token);
    
    // Get the audience from the environment or use a default value
    // The audience should match what's in the JWT's aud claim
    const audience = process.env.JWT_AUDIENCE || 'http://localhost:3001/';
    
    // Verify the JWT with the audience parameter
    const isValid = await vincentSDK.verifyJWT(audience);
    
    if (!isValid) {
      console.error('JWT verification failed');
      return reply.code(401).send({ error: 'Invalid authentication token.' });
    }
    
    // If we get here, the JWT is valid
    return;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return reply.code(401).send({ error: 'Authentication error: ' + error.message });
  }
}

module.exports = { verifyJwtMiddleware };
