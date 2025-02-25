import {
  //   getUniswapQuoterRouter,
  getVincentAgentRegistryContract,
  getPkpInfo,
} from './utils/index.mts';

declare global {
  // Injected By Lit
  const Lit: any;
  const LitAuth: any;
  const ethers: any;
  const jsParams: {
    pkpEthAddress: string;
    rpcUrl: string;
    chainId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
  };
}

(async () => {
  const LIT_NETWORK = 'datil';
  const VINCENT_AGENT_REGISTRY_ADDRESS =
    '0xaE7C442E8d8A6dc07C02A6f41333C2480F28b430';
  //   const PUBKEY_ROUTER_ADDRESS = '0x0000000000000000000000000000000000000000';

  console.log(`Using Lit Network: ${LIT_NETWORK}`);
  console.log(
    `Using Vincent Agent Registry Address: ${VINCENT_AGENT_REGISTRY_ADDRESS}`
  );
  //   console.log(`Using Pubkey Router Address: ${PUBKEY_ROUTER_ADDRESS}`);

  //   const { UNISWAP_V3_QUOTER, UNISWAP_V3_ROUTER } = getUniswapQuoterRouter(
  //     jsParams.chainId
  //   );
  // const toolIpfsCid = LitAuth.actionIpfsIds[0];

  const delegateeAddress = ethers.utils.getAddress(LitAuth.authSigAddress);
  const vincentAgentRegistryContract = await getVincentAgentRegistryContract(
    VINCENT_AGENT_REGISTRY_ADDRESS
  );

  const pkp = await getPkpInfo(jsParams.pkpEthAddress);

  const app = await vincentAgentRegistryContract.getAppByDelegateeForAgentPkp(
    delegateeAddress,
    pkp.tokenId
  );

  console.log(app);
})();
