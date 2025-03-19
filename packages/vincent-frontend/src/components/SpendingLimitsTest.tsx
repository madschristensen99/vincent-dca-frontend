import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Box, Button, Card, CardContent, CircularProgress, Divider, FormControl, Grid, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { BACKEND_API_URL } from '../config';

// ABI for the SpendingLimits contract (minimal version for the UI)
const SPENDING_LIMITS_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "_limit", "type": "uint256"},
      {"internalType": "uint256", "name": "_period", "type": "uint256"}
    ],
    "name": "setPolicy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "delegatee", "type": "address"},
      {"internalType": "bool", "name": "status", "type": "bool"}
    ],
    "name": "setDelegateeAuthorization",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getCurrentSpent",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getPolicy",
    "outputs": [
      {"internalType": "uint256", "name": "limit", "type": "uint256"},
      {"internalType": "uint256", "name": "period", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Token options for testing
const TOKEN_OPTIONS = [
  { symbol: 'ETH', address: 'eth', decimals: 18 },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
];

interface SpendingLimitsTestProps {
  contractAddress: string;
  rpcUrl: string;
  chainId: number;
  walletAddress: string;
  jwtToken: string;
}

const SpendingLimitsTest: React.FC<SpendingLimitsTestProps> = ({
  contractAddress,
  rpcUrl,
  chainId,
  walletAddress,
  jwtToken
}) => {
  // State variables
  const [selectedToken, setSelectedToken] = useState(TOKEN_OPTIONS[0]);
  const [amount, setAmount] = useState('0.1');
  const [spendingLimit, setSpendingLimit] = useState('100');
  const [period, setPeriod] = useState('86400'); // 1 day in seconds
  const [currentSpent, setCurrentSpent] = useState('0');
  const [policyActive, setPolicyActive] = useState(false);
  const [delegateeAddress, setDelegateeAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize provider and contract
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  // Initialize on component mount
  useEffect(() => {
    const initProvider = async () => {
      try {
        const newProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        setProvider(newProvider);

        // Create contract instance (read-only)
        const newContract = new ethers.Contract(
          contractAddress,
          SPENDING_LIMITS_ABI,
          newProvider
        );
        setContract(newContract);

        // Load current policy and spending
        await loadUserData(newContract);
      } catch (err) {
        console.error('Error initializing provider:', err);
        setError('Failed to connect to blockchain');
      }
    };

    if (contractAddress && rpcUrl) {
      initProvider();
    }
  }, [contractAddress, rpcUrl]);

  // Load user's policy and current spending
  const loadUserData = async (contractInstance: ethers.Contract) => {
    try {
      setLoading(true);
      
      // Get user's policy
      const policy = await contractInstance.getPolicy(walletAddress);
      setPolicyActive(policy.isActive);
      
      if (policy.isActive) {
        setSpendingLimit(ethers.utils.formatUnits(policy.limit, 18));
        setPeriod(policy.period.toString());
        
        // Get current spent amount
        const spent = await contractInstance.getCurrentSpent(walletAddress);
        setCurrentSpent(ethers.utils.formatUnits(spent, 18));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  // Set or update spending policy
  const handleSetPolicy = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      };
      
      const response = await fetch(`${BACKEND_API_URL}/spending-limits/policy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          limit: spendingLimit,
          period,
          walletAddress
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to set policy');
      }
      
      setResult(data);
      setPolicyActive(true);
      
      // Reload user data
      if (contract) {
        await loadUserData(contract);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error setting policy:', err);
      setError(err.message || 'Failed to set policy');
      setLoading(false);
    }
  };

  // Simulate a transaction
  const handleSimulateTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      };
      
      const response = await fetch(`${BACKEND_API_URL}/spending-limits/check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userWalletAddress: walletAddress,
          tokenAddress: selectedToken.address,
          tokenAmount: amount,
          tokenDecimals: selectedToken.decimals
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to simulate transaction');
      }
      
      setResult(data);
      
      // Reload user data after transaction
      if (contract) {
        await loadUserData(contract);
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error simulating transaction:', err);
      setError(err.message || 'Failed to simulate transaction');
      setLoading(false);
    }
  };

  // Authorize a delegatee
  const handleAuthorizeDelegatee = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!delegateeAddress) {
        throw new Error('Delegatee address is required');
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      };
      
      const response = await fetch(`${BACKEND_API_URL}/spending-limits/authorize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userWalletAddress: walletAddress,
          delegateeAddress,
          status: true
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authorize delegatee');
      }
      
      setResult(data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error authorizing delegatee:', err);
      setError(err.message || 'Failed to authorize delegatee');
      setLoading(false);
    }
  };

  return (
    <Card sx={{ minWidth: 275, mb: 4 }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          Spending Limits Test
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Contract: {contractAddress}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            User: {walletAddress}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Current Spending: ${currentSpent} {policyActive ? `/ $${spendingLimit}` : '(No active policy)'}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Set Spending Policy
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Daily Limit (USD)"
              type="number"
              fullWidth
              value={spendingLimit}
              onChange={(e) => setSpendingLimit(e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Period (seconds)"
              type="number"
              fullWidth
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              InputProps={{ inputProps: { min: 0 } }}
              helperText="86400 = 1 day"
            />
          </Grid>
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleSetPolicy}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Set Policy'}
            </Button>
          </Grid>
        </Grid>
        
        <Divider sx={{ mb: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Authorize Delegatee
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <TextField
              label="Delegatee Address"
              fullWidth
              value={delegateeAddress}
              onChange={(e) => setDelegateeAddress(e.target.value)}
              placeholder="0x..."
            />
          </Grid>
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleAuthorizeDelegatee}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Authorize Delegatee'}
            </Button>
          </Grid>
        </Grid>
        
        <Divider sx={{ mb: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Simulate Transaction
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Token</InputLabel>
              <Select
                value={selectedToken.symbol}
                label="Token"
                onChange={(e) => {
                  const token = TOKEN_OPTIONS.find(t => t.symbol === e.target.value);
                  if (token) setSelectedToken(token);
                }}
              >
                {TOKEN_OPTIONS.map((token) => (
                  <MenuItem key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label={`Amount (${selectedToken.symbol})`}
              type="number"
              fullWidth
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.000001 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              onClick={handleSimulateTransaction}
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : 'Simulate Transaction'}
            </Button>
          </Grid>
        </Grid>
        
        {error && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        
        {result && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>Result:</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SpendingLimitsTest;
