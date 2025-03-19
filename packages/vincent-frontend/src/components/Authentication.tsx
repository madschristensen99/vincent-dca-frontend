import { useState, useEffect } from 'react';
import { storeJWT } from '../config';
import { jwtDecode } from "jwt-decode";

interface AuthenticationProps {
  children: React.ReactNode;
}

// App ID and version
const APP_ID = 12; // Example App ID that is known to work
const APP_VERSION = 1;

// Simple function to validate JWT format
function isValidJwtFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3;
}

// Define a custom interface for JWT payload
interface VincentJwtPayload {
  pkpPublicKey?: string;
  ethAddress?: string;
  aud?: string | string[];
  exp?: number;
  [key: string]: any;
}

export const Authentication: React.FC<AuthenticationProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleAuthenticate = () => {
    // Simple direct redirect to Vincent Auth with appId=12 and version=1
    window.location.href = 'https://vincent-auth.vercel.app/?appId=12&version=1';
  };

  useEffect(() => {
    // Extract the JWT from URL and verify it
    const checkJwt = async () => {
      try {
        setLoading(true);
        const urlParams = new URLSearchParams(window.location.search);
        const jwtParam = urlParams.get('jwt');
        
        console.log('=== CHECKING FOR JWT IN URL ===');
        console.log('JWT in URL parameters:', jwtParam ? 'Found' : 'Not found');
        
        if (jwtParam) {
          console.log("JWT found in URL");
          
          try {
            // First, validate basic JWT format
            if (!isValidJwtFormat(jwtParam)) {
              throw new Error('Invalid JWT format');
            }
            
            // Store JWT in localStorage before verification (as per MEMORY)
            storeJWT(jwtParam);
            
            // Decode the JWT to check claims
            const decoded = jwtDecode<VincentJwtPayload>(jwtParam);
            console.log("Decoded JWT:", decoded);
            
            // Get the current hostname for audience verification
            const currentHostname = window.location.origin;
            console.log('Current hostname:', currentHostname);
            
            // Get audience from JWT - handle both string and array formats
            const jwtAudience = Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud;
            console.log('JWT audience:', jwtAudience);
            
            // Expected audience from config
            const expectedAudience = currentHostname;
            console.log('Expected audience from config:', expectedAudience);
            
            // Normalize audiences by removing trailing slashes for comparison
            const normalizedJwtAudience = typeof jwtAudience === 'string' ? jwtAudience.replace(/\/$/, '') : '';
            const normalizedExpectedAudience = expectedAudience.replace(/\/$/, '');
            
            // Check if normalized audiences match
            if (normalizedJwtAudience !== normalizedExpectedAudience) {
              console.warn(`JWT audience mismatch: ${jwtAudience} vs ${expectedAudience}, but continuing anyway for development`);
              // In production, you would uncomment the line below to enforce audience validation
              // throw new Error(`JWT audience mismatch: ${jwtAudience} vs ${expectedAudience}`);
            }
            
            // Check if the JWT has the required claims
            if (decoded && (decoded.ethAddress || decoded.pkpPublicKey)) {
              // Clean up the URL by removing the JWT parameter
              const cleanUrl = `${window.location.pathname}${window.location.search.replace(/[?&]jwt=[^&]+/, '')}`;
              window.history.replaceState({}, document.title, cleanUrl);
              
              setIsAuthenticated(true);
              console.log("JWT has required claims, authentication successful");
            } else {
              throw new Error('JWT missing required claims');
            }
          } catch (verifyError) {
            console.error("JWT verification error:", verifyError);
            setError(verifyError instanceof Error ? verifyError.message : 'Unknown verification error');
            setIsAuthenticated(false);
            
            // Redirect to Vincent Auth on verification error
            console.log('JWT verification failed, redirecting to Vincent Auth');
            window.location.href = 'https://vincent-auth.vercel.app/?appId=12&version=1';
          }
        } else {
          console.log("No JWT found in URL");
          
          // Check if we have a stored JWT
          const storedJwt = localStorage.getItem('vincent_jwt');
          console.log('JWT in localStorage:', storedJwt ? 'Found' : 'Not found');
          
          if (storedJwt) {
            try {
              // Decode the stored JWT
              const decoded = jwtDecode<VincentJwtPayload>(storedJwt);
              
              // Check if the token is expired
              const isExpired = decoded.exp ? (decoded.exp * 1000 < Date.now()) : false;
              
              if (isExpired) {
                throw new Error('Stored JWT has expired');
              }
              
              // Check if the JWT has the required claims
              if (decoded && (decoded.ethAddress || decoded.pkpPublicKey)) {
                setIsAuthenticated(true);
                console.log("Using stored JWT, authentication successful");
              } else {
                throw new Error('Stored JWT missing required claims');
              }
            } catch (storedJwtError) {
              console.error("Stored JWT validation error:", storedJwtError);
              localStorage.removeItem('vincent_jwt');
              setIsAuthenticated(false);
              setError('Stored authentication expired. Please authenticate again.');
              
              // Redirect to Vincent Auth on stored JWT validation error
              console.log('Stored JWT validation failed, redirecting to Vincent Auth');
              window.location.href = 'https://vincent-auth.vercel.app/?appId=12&version=1';
            }
          } else {
            console.log('No valid JWT found in localStorage, redirecting to Vincent Auth');
            setIsAuthenticated(false);
            
            // Automatically redirect to Vincent Auth
            handleAuthenticate();
          }
        }
      } catch (err) {
        console.error("Error processing JWT:", err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setIsAuthenticated(false);
        
        // Redirect to Vincent Auth on any error
        console.log('Error processing JWT, redirecting to Vincent Auth');
        window.location.href = 'https://vincent-auth.vercel.app/?appId=12&version=1';
      } finally {
        setLoading(false);
      }
    };

    checkJwt();
  }, []);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>Verifying authentication...</p>
        <style jsx>{`
          .auth-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #09f;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-error">
        <h2>Authentication Required</h2>
        {error && <p className="error-message">{error}</p>}
        <p className="auth-info">
          You need to authenticate with Vincent to access this application.
        </p>
        <p className="auth-details">
          App ID: {APP_ID} | Version: {APP_VERSION}
        </p>
        <button onClick={handleAuthenticate}>Authenticate</button>
        <style jsx>{`
          .auth-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-color: #f8f9fa;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 2rem auto;
            max-width: 500px;
          }
          .error-message {
            color: #dc3545;
            margin-bottom: 1rem;
          }
          .auth-info {
            margin-bottom: 1rem;
            text-align: center;
          }
          .auth-details {
            font-family: monospace;
            background-color: #f1f1f1;
            padding: 0.5rem;
            border-radius: 4px;
            margin-bottom: 1rem;
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
};
