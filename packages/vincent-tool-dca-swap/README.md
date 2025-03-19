# Vincent DCA Tool with Spending Limit Schema

This package contains the Lit Actions for the Vincent DCA (Dollar-Cost Averaging) tool with proper spending limit contract schema implementation.

## Overview

The DCA tool allows users to perform token swaps with spending limits enforced through a smart contract. The implementation follows the required schema structure:

```solidity
struct Tool {
    string toolIpfsCid;
    Policy[] policies;
}

struct Policy {
    string policyIpfsCid;
    string policySchemaIpfsCid;
    string[] parameterNames;
}
```

## Deployment

The Lit Actions are deployed to IPFS using Pinata. The IPFS hashes are stored in the `ipfs-ids.json` file.

To deploy the Lit Actions:

```bash
# Set the Pinata JWT environment variable
export PINATA_JWT=your_pinata_jwt

# Run the deployment script
node src/deploy-to-pinata.js
```

## Testing

### Test Schema Structure

To validate the schema structure:

```bash
node src/test-schema.js
```

This will construct the Tool and Policy objects according to the required schema and simulate encoding a contract call to verify the format.

### Test Lit Actions

To test the Lit Actions:

```bash
node src/test-lit-action.js
```

This will execute both the Tool and Policy Lit Actions with test parameters and log the results.

## Registering with Spending Limits Contract

To register the Tool and Policy with the spending limits contract:

1. Create a `.env` file with the following variables:
   ```
   PRIVATE_KEY=your_private_key
   RPC_URL=your_rpc_url (optional, defaults to Base Mainnet)
   SPENDING_LIMIT_CONTRACT_ADDRESS=contract_address (optional)
   POLICY_SCHEMA_IPFS_CID=your_policy_schema_ipfs_cid (optional)
   ```

2. Run the registration script:
   ```bash
   node src/register-tool-schema.js
   ```

## Lit Action Parameters

The Lit Actions expect the following parameters:

```javascript
{
  "privateKey": "0x...", // Private key for the wallet
  "rpcUrl": "https://mainnet.base.org", // RPC URL for the chain
  "chainId": "8453", // Chain ID (e.g., 8453 for Base Mainnet)
  "tokenIn": "eth", // Input token address or "eth" for ETH
  "tokenOut": "0x...", // Output token address
  "amountIn": "0.001", // Amount of input token to swap
  "spendingLimitContractAddress": "0x..." // Optional, address of the spending limits contract
}
```

## Current IPFS Hashes

- **Tool IPFS Hash**: `QmUHkcZ6xhiyn362kHKDkNJxudspBjrX5j3XiG5LZaUZB5`
- **Policy IPFS Hash**: `QmYD9Lf2XrrTUePMhbJc9bQhHbwJ6N3DuNbU7hSzj78tTF`

## Changes from Previous Version

- Replaced PKP address functionality with private key usage
- Implemented proper schema structure for Tool and Policy
- Updated ABI for the spending limits contract
- Added support for recording and checking spending limits
