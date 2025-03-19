import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ApproveView } from '../components/ApproveView';
import { DCAManagement } from '../components/DCAManagement';
import { storeJWT, clearJWT, JWT_AUDIENCE } from '../config';
import { jwtDecode } from "jwt-decode";
import { ethers } from 'ethers';

// Define a custom interface that extends JwtPayload
interface VincentJwtPayload {
  pkpPublicKey?: string;
  ethAddress?: string;
  aud?: string | string[];
  exp?: number;
  [key: string]: any;
}

export default function Home() {
  const router = useRouter();
  const [pkpAddress, setPkpAddress] = useState<string | null>(null);
  const [jwtVerified, setJwtVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    const checkJwt = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const jwtParam = urlParams.get('jwt');
        
        // Clear any stored JWT on initial page load if no JWT in URL
        // This ensures users always start at the welcome screen
        if (!jwtParam) {
          clearJWT();
          setJwtVerified(false);
          setLoading(false);
          return;
        }

        console.log("JWT found in URL, verifying...");
        
        try {
          // Try to decode the JWT to extract claims
          const decoded = jwtDecode<VincentJwtPayload>(jwtParam);
          console.log("Decoded JWT:", decoded);
          
          // Check if the JWT has an audience claim
          if (decoded && decoded.aud) {
            // Get the audience from the JWT
            const jwtAudience = Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud;
            
            // Get the current hostname for comparison
            const currentHostname = typeof window !== 'undefined' ? window.location.origin : '';
            console.log("Current hostname:", currentHostname);
            console.log("JWT audience:", jwtAudience);
            console.log("Expected audience from config:", JWT_AUDIENCE);
            
            // Check if the audience matches either the configured audience or the current hostname
            const audienceMatches = jwtAudience === JWT_AUDIENCE || 
                                   jwtAudience === currentHostname || 
                                   (currentHostname && jwtAudience.includes(currentHostname)) ||
                                   jwtAudience.endsWith('/') && jwtAudience.slice(0, -1) === currentHostname;
            
            if (audienceMatches) {
              // Check if the JWT has the required claims
              if (decoded && (decoded.ethAddress || decoded.pkpPublicKey)) {
                // Extract address from JWT
                if (decoded.ethAddress) {
                  // Use ethAddress from JWT if available
                  setPkpAddress(decoded.ethAddress);
                  console.log("Using ETH address from JWT:", decoded.ethAddress);
                } else if (decoded.pkpPublicKey) {
                  // For PKP public keys, we need to convert to an Ethereum address
                  const pkpKey = decoded.pkpPublicKey;
                  
                  // Properly derive Ethereum address from public key using ethers.js
                  try {
                    // Remove '0x' prefix if present
                    const cleanPkpKey = pkpKey.startsWith('0x') ? pkpKey.substring(2) : pkpKey;
                    
                    // Create a hex string of the public key
                    const publicKeyHex = `0x${cleanPkpKey}`;
                    
                    // Use ethers.js to compute the address from the public key
                    const ethAddress = ethers.utils.computeAddress(publicKeyHex).toLowerCase();
                    
                    setPkpAddress(ethAddress);
                    console.log("Derived ETH address from PKP key:", ethAddress);
                  } catch (error) {
                    console.error("Error deriving ETH address from PKP key:", error);
                    // Fallback to the old method if there's an error
                    const fallbackAddress = '0x' + pkpKey.substring(pkpKey.length - 40).toLowerCase();
                    setPkpAddress(fallbackAddress);
                    console.log("Fallback: Using last 40 chars of PKP key as ETH address:", fallbackAddress);
                  }
                } else {
                  // No valid address found in JWT
                  console.error("No valid ETH address found in JWT");
                  setError("No valid ETH address found in JWT");
                  setJwtVerified(false);
                  clearJWT();
                  return;
                }
                
                // Store the JWT for future API requests
                storeJWT(jwtParam);
                setJwtVerified(true);
                setError(null);
              } else {
                console.error("JWT missing required claims");
                setError("JWT missing required claims");
                setJwtVerified(false);
                clearJWT();
              }
            } else {
              console.error("JWT has invalid audience");
              setError("JWT has invalid audience");
              setJwtVerified(false);
              clearJWT();
            }
          } else {
            console.error("JWT has no audience claim");
            setError("JWT has no audience claim");
            setJwtVerified(false);
            clearJWT();
          }
        } catch (decodeError) {
          console.error("Error decoding JWT:", decodeError);
          setError("Error decoding JWT: " + (decodeError instanceof Error ? decodeError.message : String(decodeError)));
          setJwtVerified(false);
          clearJWT();
        }
      } catch (error) {
        console.error("Error in checkJwt:", error);
        setError("Error checking JWT: " + (error instanceof Error ? error.message : String(error)));
        setJwtVerified(false);
        clearJWT();
      } finally {
        setLoading(false);
      }
    };

    checkJwt();
  }, [router.isReady, router.query]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Verifying authentication...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f5f7fa;
          }
          .loading-spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-radius: 50%;
            border-top: 4px solid #4CAF50;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      {jwtVerified && pkpAddress ? (
        <DCAManagement walletAddress={pkpAddress} />
      ) : (
        <div className="auth-container">
          <ApproveView />
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>
      )}
      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #f5f7fa;
        }
        
        .auth-container {
          width: 100%;
          max-width: 600px;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 15px;
          border-radius: 4px;
          margin-top: 20px;
          text-align: center;
          border-left: 4px solid #c62828;
        }
      `}</style>
    </div>
  );
}