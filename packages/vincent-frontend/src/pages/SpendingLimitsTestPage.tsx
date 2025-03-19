import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, TextField, Button, Typography, CircularProgress } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import SpendingLimitsTest from '../components/SpendingLimitsTest';
import { VincentSDK } from '@lit-protocol/vincent-sdk';
import { getJwtFromLocalStorage } from '../utils/auth';

const SpendingLimitsTestPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for contract configuration
  const [contractAddress, setContractAddress] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [chainId, setChainId] = useState(1); // Default to Ethereum mainnet
  const [walletAddress, setWalletAddress] = useState('');
  
  // JWT state
  const [jwtToken, setJwtToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Check for JWT in URL or localStorage on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check for JWT in URL parameters
        const params = new URLSearchParams(location.search);
        let jwt = params.get('jwt');
        
        // If not in URL, try to get from localStorage
        if (!jwt) {
          jwt = getJwtFromLocalStorage();
        }
        
        // If we have a JWT, verify it
        if (jwt) {
          const vincent = new VincentSDK();
          const isValid = await vincent.verifyJWT(jwt, "vincent-dca-service");
          
          if (isValid) {
            // Store the JWT in localStorage for future use
            localStorage.setItem('vincent_jwt', jwt);
            setJwtToken(jwt);
            setIsAuthenticated(true);
            
            // Decode the JWT to get the user's Ethereum address
            try {
              // JWT is in format header.payload.signature
              const payload = jwt.split('.')[1];
              // Decode the base64 payload
              const decodedPayload = JSON.parse(atob(payload));
              
              // Check if the payload contains an ethAddress claim
              if (decodedPayload.ethAddress) {
                console.log(`Getting JWT token for Ethereum address: ${decodedPayload.ethAddress}`);
                setWalletAddress(decodedPayload.ethAddress);
              } else if (decodedPayload.sub) {
                // If no ethAddress, try to use the subject claim which might be the address
                console.log(`No ethAddress in JWT, using subject: ${decodedPayload.sub}`);
                setWalletAddress(decodedPayload.sub);
              } else {
                console.warn('No Ethereum address found in JWT');
              }
            } catch (error) {
              console.error('Error decoding JWT:', error);
            }
          } else {
            // Invalid JWT, redirect to auth
            redirectToAuth();
          }
        } else {
          // No JWT, redirect to auth
          redirectToAuth();
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Authentication error:', error);
        redirectToAuth();
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [location]);
  
  // Redirect to Vincent Auth consent page
  const redirectToAuth = () => {
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://vincent-auth.vercel.app/?redirect=${redirectUrl}`;
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!contractAddress || !rpcUrl || !walletAddress) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Save values to localStorage for convenience
    localStorage.setItem('spending_limits_contract', contractAddress);
    localStorage.setItem('spending_limits_rpc', rpcUrl);
    localStorage.setItem('spending_limits_chain_id', chainId.toString());
    localStorage.setItem('spending_limits_wallet', walletAddress);
  };
  
  // Load saved values from localStorage
  useEffect(() => {
    const savedContract = localStorage.getItem('spending_limits_contract');
    const savedRpc = localStorage.getItem('spending_limits_rpc');
    const savedChainId = localStorage.getItem('spending_limits_chain_id');
    const savedWallet = localStorage.getItem('spending_limits_wallet');
    
    if (savedContract) setContractAddress(savedContract);
    if (savedRpc) setRpcUrl(savedRpc);
    if (savedChainId) setChainId(parseInt(savedChainId));
    if (savedWallet && !walletAddress) setWalletAddress(savedWallet);
  }, [walletAddress]);
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Checking authentication...
        </Typography>
      </Container>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Authentication Required
        </Typography>
        <Button variant="contained" onClick={redirectToAuth}>
          Authenticate with Vincent
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Spending Limits Test
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            Contract Configuration
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Contract Address"
              fullWidth
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              required
              margin="normal"
              placeholder="0x..."
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              label="RPC URL"
              fullWidth
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              required
              margin="normal"
              placeholder="https://..."
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Chain ID"
              type="number"
              fullWidth
              value={chainId}
              onChange={(e) => setChainId(parseInt(e.target.value))}
              required
              margin="normal"
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Your Wallet Address"
              fullWidth
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              required
              margin="normal"
              placeholder="0x..."
            />
          </Box>
          
          <Button type="submit" variant="contained" color="primary">
            Save Configuration
          </Button>
        </form>
      </Paper>
      
      {contractAddress && rpcUrl && walletAddress && (
        <SpendingLimitsTest
          contractAddress={contractAddress}
          rpcUrl={rpcUrl}
          chainId={chainId}
          walletAddress={walletAddress}
          jwtToken={jwtToken}
        />
      )}
    </Container>
  );
};

export default SpendingLimitsTestPage;
