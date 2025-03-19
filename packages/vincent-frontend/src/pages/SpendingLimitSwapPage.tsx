import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, TextField, Button, Typography, CircularProgress } from '@mui/material';
import SpendingLimitSwap from '../components/SpendingLimitSwap';
import { getJwtFromLocalStorage, verifyJwtToken, getWalletAddressFromJwt, redirectToVincentAuth } from '../utils/auth';

const SpendingLimitSwapPage: React.FC = () => {
  // State for contract configuration
  const [contractAddress, setContractAddress] = useState('0xdAAe7CE713313b2C62eC5284DD3f3F7f4bA95332'); // Default to the deployed contract
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
            setJwtToken(jwt);
            setIsAuthenticated(true);
            
            // Get wallet address from JWT
            const address = getWalletAddressFromJwt(jwt);
            if (address) {
              console.log(`Getting JWT token for Ethereum address: ${address}`);
              setWalletAddress(address);
            } else {
              console.warn('No Ethereum address found in JWT');
            }
          } else {
            // Invalid JWT, redirect to auth
            redirectToVincentAuth();
          }
        } else {
          // No JWT, redirect to auth
          redirectToVincentAuth();
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Authentication error:', error);
        redirectToVincentAuth();
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!contractAddress || !walletAddress) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Save values to localStorage for convenience
    localStorage.setItem('spending_limits_contract', contractAddress);
    localStorage.setItem('spending_limits_wallet', walletAddress);
  };
  
  // Load saved values from localStorage
  useEffect(() => {
    const savedContract = localStorage.getItem('spending_limits_contract');
    const savedWallet = localStorage.getItem('spending_limits_wallet');
    
    if (savedContract) setContractAddress(savedContract);
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
        <Button variant="contained" onClick={redirectToVincentAuth}>
          Authenticate with Vincent
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Token Swap with Spending Limits
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            Contract Configuration
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Spending Limits Contract Address"
              fullWidth
              value={contractAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContractAddress(e.target.value)}
              required
              margin="normal"
              placeholder="0x..."
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Your Wallet Address"
              fullWidth
              value={walletAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalletAddress(e.target.value)}
              required
              margin="normal"
              placeholder="0x..."
            />
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              fullWidth
            >
              Save Configuration
            </Button>
          </Box>
        </form>
      </Paper>
      
      {walletAddress && contractAddress && (
        <SpendingLimitSwap
          jwtToken={jwtToken}
          walletAddress={walletAddress}
          spendingLimitContractAddress={contractAddress}
        />
      )}
    </Container>
  );
};

export default SpendingLimitSwapPage;
