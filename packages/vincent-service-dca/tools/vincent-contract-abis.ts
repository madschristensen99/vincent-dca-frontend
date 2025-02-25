export const VINCENT_APP_DELEGATION_REGISTRY_ABI = [
  // Constructor - Initializes the contract with PKP NFT contract
  'constructor(address pkpNftFacet)',

  // Delegatee Management Functions
  // Functions to manage delegatees who can act on behalf of app managers
  'function addDelegatee(address delegatee)',
  'function removeDelegatee(address delegatee)',
  'function isDelegatee(address appManager, address delegatee) view returns (bool)',
  'function getDelegatees(address appManager) view returns (address[])',
  'function getAppManagerByDelegatee(address delegatee) view returns (address)',

  // Events
  // Events emitted when delegatee relationships change
  'event DelegateeAdded(address indexed appManager, address indexed delegatee)',
  'event DelegateeRemoved(address indexed appManager, address indexed delegatee)',

  // App Permission Events
  // Events emitted when app permissions are modified
  'event AppPermitted(address indexed appManager, uint256 indexed agentPkpTokenId)',
  'event AppUnpermitted(address indexed appManager, uint256 indexed agentPkpTokenId)',
];

export const VINCENT_AGENT_REGISTRY_ABI = [
  // Constructor
  'constructor(address pkpContract_, address appDelegationRegistry_)',

  // Agent PKP Management
  'function hasAgentPkp(uint256 agentPkpTokenId) view returns (bool)',
  'function getAllAgentPkps() view returns (uint256[])',

  // Role Management
  'function addRole(uint256 agentPkpTokenId, address appManager, bytes32 roleId, string roleVersion, string[] toolIpfsCids, string[][] policyParamNames, bytes[][] policyValues)',
  'function hasRole(uint256 agentPkpTokenId, address appManager, bytes32 roleId) view returns (bool)',
  'function getRoleVersion(uint256 agentPkpTokenId, address appManager, bytes32 roleId) view returns (string)',
  'function getRolesWithVersions(uint256 agentPkpTokenId, address appManager) view returns (bytes32[] roleIds, string[] versions)',
  'function getRolesPermittedForApp(uint256 agentPkpTokenId, address appManager) view returns (bytes32[])',

  // App Management
  'function setAppEnabled(uint256 agentPkpTokenId, address appManager, bool enabled)',
  'function isAppPermittedForAgentPkp(address appManager, uint256 agentPkpTokenId) view returns (bool)',
  'function getPermittedAgentPkpsForApp(address appManager) view returns (uint256[])',
  'function getAppsPermittedForAgentPkp(uint256 agentPkpTokenId) view returns (address[])',
  'function isAppEnabled(uint256 agentPkpTokenId, address appManager) view returns (bool)',
  'function getAppByDelegateeForAgentPkp(address delegatee, uint256 agentPkpTokenId) view returns (address appManager, bool isEnabled, string[] toolIpfsCids, bool[] toolEnabled, string[][] policyParamNames, bytes[][] policyValues)',

  // Tool Management
  'function setToolsEnabled(uint256 agentPkpTokenId, address appManager, string[] toolIpfsCids, bool enabled)',
  'function getToolsPermittedForApp(uint256 agentPkpTokenId, address appManager) view returns (bytes32[])',
  'function hasTool(uint256 agentPkpTokenId, address appManager, bytes32 toolId) view returns (bool)',
  'function isToolEnabled(uint256 agentPkpTokenId, address appManager, bytes32 toolId) view returns (bool)',
  'function getToolIpfsCid(uint256 agentPkpTokenId, address appManager, bytes32 toolId) view returns (string)',
  'function getToolsWithIpfsCids(uint256 agentPkpTokenId, address appManager) view returns (bytes32[] toolIds, string[] ipfsCids)',
  'function getToolId(string toolIpfsCid) pure returns (bytes32)',
  'function getToolIpfsCidByHash(bytes32 toolId) view returns (string)',

  // Policy Management
  'function updateToolPolicyValue(uint256 agentPkpTokenId, address appManager, string toolIpfsCid, bytes32 paramId, bytes value)',
  'function getPolicyParamsForTool(uint256 agentPkpTokenId, address appManager, string toolIpfsCid) view returns (bytes32[])',
  'function getPolicyValue(uint256 agentPkpTokenId, address appManager, bytes32 toolId, bytes32 paramId) view returns (bytes)',
  'function getPolicyParamsWithValues(uint256 agentPkpTokenId, address appManager, string toolIpfsCid) view returns (bytes32[] paramIds, bytes[] values)',
  'function getPolicyParamName(bytes32 paramId) view returns (string)',

  // Events
  'event AppAdded(uint256 indexed agentPkpTokenId, address indexed appManager, bool enabled)',
  'event AppEnabled(uint256 indexed agentPkpTokenId, address indexed appManager, bool enabled)',
  'event RoleAdded(uint256 indexed agentPkpTokenId, address indexed appManager, bytes32 indexed roleId, string version)',
  'event ToolPolicyAdded(uint256 indexed agentPkpTokenId, address indexed appManager, bytes32 indexed toolId, string ipfsCid)',
  'event ToolEnabled(uint256 indexed agentPkpTokenId, address indexed appManager, bytes32 indexed toolId, bool enabled)',
  'event PolicyValueSet(uint256 indexed agentPkpTokenId, address indexed appManager, bytes32 indexed toolId, bytes32 paramId, bytes value)',
];
