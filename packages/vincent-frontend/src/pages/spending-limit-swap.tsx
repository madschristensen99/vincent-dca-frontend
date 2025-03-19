import React from 'react';
import SpendingLimitSwapPage from '../components/SpendingLimitSwapPage';
import { Container, Typography, Link, Box } from '@mui/material';

const SpendingLimitSwap = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Vincent DCA - Token Swap with Spending Limits
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Execute token swaps with spending limits enforced through Lit Actions
        </Typography>
        <Box sx={{ mt: 2, mb: 4 }}>
          <Link href="/" color="primary" sx={{ mr: 2 }}>
            Home
          </Link>
          <Link href="/tools" color="primary" sx={{ mr: 2 }}>
            Tools
          </Link>
          <Link href="/spending-limits-test" color="primary">
            Spending Limits Test
          </Link>
        </Box>
      </Box>
      
      <SpendingLimitSwapPage />
    </Container>
  );
};

export default SpendingLimitSwap;
