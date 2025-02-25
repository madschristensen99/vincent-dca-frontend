import { config } from '@dotenvx/dotenvx';

config();

import { LIT_RPC } from '@lit-protocol/constants';
import { ethers } from 'ethers';

import {
  VINCENT_AGENT_REGISTRY_ABI,
  VINCENT_APP_DELEGATION_REGISTRY_ABI,
} from './vincent-contract-abis';

const VINCENT_APP_DELEGATION_REGISTRY_ADDRESS =
  process.env.VINCENT_APP_DELEGATION_REGISTRY_ADDRESS;
const VINCENT_AGENT_REGISTRY_ADDRESS =
  process.env.VINCENT_AGENT_REGISTRY_ADDRESS;
const VINCENT_APP_MANAGER_PRIVATE_KEY =
  process.env.VINCENT_APP_MANAGER_PRIVATE_KEY;
const VINCENT_DELEGATEE_PRIVATE_KEY = process.env.VINCENT_DELEGATEE_PRIVATE_KEY;
const VINCENT_USER_PRIVATE_KEY = process.env.VINCENT_USER_PRIVATE_KEY;
const VINCENT_TOOL_UNISWAP_SWAP_IPFS_ID =
  process.env.VINCENT_TOOL_UNISWAP_SWAP_IPFS_ID;
const VINCENT_USER_PKP_TOKEN_ID = process.env.VINCENT_USER_PKP_TOKEN_ID;

const ethersProvider = new ethers.providers.JsonRpcProvider(
  LIT_RPC.CHRONICLE_YELLOWSTONE
);

const ethersSignerAppManager = new ethers.Wallet(
  VINCENT_APP_MANAGER_PRIVATE_KEY as string,
  ethersProvider
);

const ethersSignerDelegatee = new ethers.Wallet(
  VINCENT_DELEGATEE_PRIVATE_KEY as string,
  ethersProvider
);

const ethersSignerUser = new ethers.Wallet(
  VINCENT_USER_PRIVATE_KEY as string,
  ethersProvider
);

// Validate required environment variables
if (!VINCENT_APP_DELEGATION_REGISTRY_ADDRESS) {
  throw new Error('VINCENT_APP_DELEGATION_REGISTRY_ADDRESS is not set');
}
if (!VINCENT_APP_MANAGER_PRIVATE_KEY) {
  throw new Error('VINCENT_APP_MANAGER_PRIVATE_KEY is not set');
}
if (!VINCENT_DELEGATEE_PRIVATE_KEY) {
  throw new Error('VINCENT_DELEGATEE_PRIVATE_KEY is not set');
}

const roleNameHash = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('Uniswap Swap')
);
const roleVersion = '1.0.0';
const toolIpfsCids = [VINCENT_TOOL_UNISWAP_SWAP_IPFS_ID as string];
const policyParamNames = [['maxAmount']];
const policyValues = [
  [
    ethers.utils.defaultAbiCoder.encode(
      ['uint256'],
      [ethers.utils.parseEther('1')]
    ),
  ],
];

// const vincentAppDelegationRegistryContract = new ethers.Contract(
//   VINCENT_APP_DELEGATION_REGISTRY_ADDRESS as string,
//   VINCENT_APP_DELEGATION_REGISTRY_ABI,
//   ethersProvider
// );

// const vincentAgentRegistryContract = new ethers.Contract(
//   VINCENT_AGENT_REGISTRY_ADDRESS as string,
//   VINCENT_AGENT_REGISTRY_ABI,
//   ethersProvider
// );

async function addDelegatee() {
  const vincentAppDelegationRegistryContract = new ethers.Contract(
    VINCENT_APP_DELEGATION_REGISTRY_ADDRESS as string,
    VINCENT_APP_DELEGATION_REGISTRY_ABI,
    ethersSignerAppManager
  );

  const tx = await vincentAppDelegationRegistryContract.addDelegatee(
    ethersSignerDelegatee.address
  );
  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for transaction confirmation...');

  const receipt = await tx.wait();
  console.log('addDelegatee receipt:', JSON.stringify(receipt, null, 2));
}

async function addRole() {
  const vincentAgentRegistryContract = new ethers.Contract(
    VINCENT_AGENT_REGISTRY_ADDRESS as string,
    VINCENT_AGENT_REGISTRY_ABI,
    ethersSignerUser
  );

  const tx = await vincentAgentRegistryContract.addRole(
    VINCENT_USER_PKP_TOKEN_ID,
    ethersSignerAppManager.address,
    roleNameHash,
    roleVersion,
    toolIpfsCids,
    policyParamNames,
    policyValues
  );
  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for transaction confirmation...');

  const receipt = await tx.wait();
  console.log('addRole receipt:', JSON.stringify(receipt, null, 2));
}

(async () => {
  // await addDelegatee();
  await addRole();
})();
