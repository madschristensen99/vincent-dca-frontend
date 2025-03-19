// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./diamond-base/libraries/LibDiamond.sol";
import "./IPKPNftFacet.sol";

library VincentAppStorage {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 internal constant APP_STORAGE_SLOT = keccak256("lit.vincent.app.storage");

    struct VersionedApp {
        EnumerableSet.Bytes32Set toolIpfsCidHashes;
        EnumerableSet.UintSet delegatedAgentPkps;
        uint256 version;
        bool enabled;
    }

    struct App {
        EnumerableSet.AddressSet delegatees;
        EnumerableSet.Bytes32Set authorizedDomains;
        EnumerableSet.Bytes32Set authorizedRedirectUris;
        VersionedApp[] versionedApps;
        address manager;
        string name;
        string description;
    }

    struct AppStorage {
        mapping(uint256 => App) appIdToApp;
        mapping(address => EnumerableSet.UintSet) managerAddressToAppIds;
        mapping(address => uint256) delegateeAddressToAppId;
        mapping(bytes32 => string) authorizedDomainHashToDomain;
        mapping(bytes32 => string) authorizedRedirectUriHashToRedirectUri;
        EnumerableSet.UintSet registeredApps;
        EnumerableSet.AddressSet registeredManagers;
        uint256 appIdCounter;
    }

    function appStorage() internal pure returns (AppStorage storage as_) {
        bytes32 slot = APP_STORAGE_SLOT;
        assembly {
            as_.slot := slot
        }
    }
}

library VincentToolStorage {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    bytes32 internal constant TOOL_STORAGE_SLOT = keccak256("lit.vincent.tool.storage");

    struct ToolStorage {
        EnumerableSet.Bytes32Set registeredTools;
        mapping(bytes32 => string) toolIpfsCidHashToIpfsCid;
    }

    function toolStorage() internal pure returns (ToolStorage storage ts) {
        bytes32 slot = TOOL_STORAGE_SLOT;
        assembly {
            ts.slot := slot
        }
    }
}

library VincentAppToolPolicyStorage {
    bytes32 internal constant APP_TOOL_POLICY_STORAGE_SLOT = keccak256("lit.vincent.app.tool.policy.storage");

    struct VersionedToolPolicies {
        EnumerableSet.Bytes32Set policyIpfsCidHashes;
        // Policy IPFS CID Hash => Policy Parameter Name Hashes
        mapping(bytes32 => EnumerableSet.Bytes32Set) policyIpfsCidHashToParameterNameHashes;
    }

    struct AppToolPolicyStorage {
        // App ID => App Version => Tool IPFS CID Hash => Tool Policies
        mapping(uint256 => mapping(uint256 => mapping(bytes32 => VersionedToolPolicies))) appIdToVersionedToolPolicies;
        // Policy IPFS CID Hash => Policy IPFS CID
        mapping(bytes32 => string) policyIpfsCidHashToIpfsCid;
        // Policy Parameter Name Hash => Policy Parameter Name
        mapping(bytes32 => string) policyParameterNameHashToName;
    }

    function appToolPolicyStorage() internal pure returns (AppToolPolicyStorage storage atps) {
        bytes32 slot = APP_TOOL_POLICY_STORAGE_SLOT;
        assembly {
            atps.slot := slot
        }
    }
}

library VincentUserStorage {
    bytes32 internal constant USER_STORAGE_SLOT = keccak256("lit.vincent.user.storage");

    struct PolicyParametersStorage {
        // Not every Policy parameter may be required, so we keep track
        // of the ones the User has set
        EnumerableSet.Bytes32Set policyParameterNameHashes;
        // Policy Parameter Name Hash -> Policy Parameter Value
        mapping(bytes32 => string) policyParameterNameHashToValue;
    }

    struct ToolPolicyStorage {
        // Tool Policy CID Hash -> Policy Parameters Storage
        mapping(bytes32 => PolicyParametersStorage) policyIpfsCidHashToPolicyParametersStorage;
        // Set of Policy IPFS CID Hashes that have parameters set
        EnumerableSet.Bytes32Set policyIpfsCidHashesWithParameters;
    }

    struct UserStorage {
        EnumerableSet.UintSet registeredAgentPkps;
        // Agent PKP Token ID -> App ID -> Permitted App Versions
        mapping(uint256 => mapping(uint256 => EnumerableSet.UintSet)) agentPkpTokenIdToPermittedAppVersions;
        // Agent PKP Token ID -> Set of App IDs that have at least one permitted version
        mapping(uint256 => EnumerableSet.UintSet) agentPkpTokenIdToPermittedApps;
        // Agent PKP Token ID -> App ID -> App Version -> Tool IPFS CID Hash -> Tool Policy Storage
        mapping(uint256 => mapping(uint256 => mapping(uint256 => mapping(bytes32 => ToolPolicyStorage))))
            agentPkpTokenIdToToolPolicyStorage;
        // PKP NFT contract interface - set once during initialization in the diamond constructor
        IPKPNFTFacet PKP_NFT_FACET;
    }

    function userStorage() internal pure returns (UserStorage storage us) {
        bytes32 slot = USER_STORAGE_SLOT;
        assembly {
            us.slot := slot
        }
    }
}
