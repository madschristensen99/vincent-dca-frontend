// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../LibVincentDiamondStorage.sol";
import "../VincentBase.sol";

/**
 * @title VincentUserViewFacet
 * @dev View functions for user-related data stored in the VincentUserStorage
 */
contract VincentUserViewFacet is VincentBase {
    using VincentUserStorage for VincentUserStorage.UserStorage;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    error PkpNotPermittedForAppVersion(uint256 pkpTokenId, uint256 appId, uint256 appVersion);
    error PolicyParameterNotSetForPkp(
        uint256 pkpTokenId, uint256 appId, uint256 appVersion, string policyIpfsCid, string parameterName
    );
    error DelegateeNotAssociatedWithApp(address delegatee);

    // Struct to hold a parameter name and its value
    struct PolicyParameter {
        string name;
        string value;
    }

    // Struct to represent a policy with its parameters
    struct PolicyWithParameters {
        string policyIpfsCid;
        PolicyParameter[] parameters;
    }

    /**
     * @dev Gets all PKP tokens that are registered as agents in the system
     * @return An array of PKP token IDs that are registered as agents
     */
    function getAllRegisteredAgentPkps() external view returns (uint256[] memory) {
        VincentUserStorage.UserStorage storage us_ = VincentUserStorage.userStorage();
        return us_.registeredAgentPkps.values();
    }

    // ==================================================================================
    // PKP and App Permission Functions
    // ==================================================================================

    /**
     * @dev Gets all permitted app versions for a specific app and PKP token
     * @param pkpTokenId The PKP token ID
     * @param appId The app ID
     * @return An array of app versions that are permitted for the PKP token
     */
    function getPermittedAppVersionsForPkp(uint256 pkpTokenId, uint256 appId)
        external
        view
        returns (uint256[] memory)
    {
        VincentUserStorage.UserStorage storage us_ = VincentUserStorage.userStorage();
        return us_.agentPkpTokenIdToPermittedAppVersions[pkpTokenId][appId].values();
    }

    /**
     * @dev Gets all app IDs that have permissions for a specific PKP token
     * @param pkpTokenId The PKP token ID
     * @return An array of app IDs that have permissions for the PKP token
     */
    function getAllPermittedAppIdsForPkp(uint256 pkpTokenId) external view returns (uint256[] memory) {
        VincentUserStorage.UserStorage storage us_ = VincentUserStorage.userStorage();
        return us_.agentPkpTokenIdToPermittedApps[pkpTokenId].values();
    }

    // ==================================================================================
    // Tool Functions
    // ==================================================================================

    /**
     * @dev Get all tools permitted for a specific PKP token and app version
     * @param pkpTokenId The PKP token ID
     * @param appId The app ID
     * @param appVersion The app version
     * @return tools An array of tool IPFS CIDs
     */
    function getPermittedToolsForPkpAndAppVersion(uint256 pkpTokenId, uint256 appId, uint256 appVersion)
        external
        view
        returns (string[] memory tools)
    {
        VincentUserStorage.UserStorage storage us_ = VincentUserStorage.userStorage();
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        VincentToolStorage.ToolStorage storage ts_ = VincentToolStorage.toolStorage();

        // Check if the PKP has permissions for this app version
        if (!us_.agentPkpTokenIdToPermittedAppVersions[pkpTokenId][appId].contains(appVersion)) {
            revert PkpNotPermittedForAppVersion(pkpTokenId, appId, appVersion);
        }

        // Get all tools registered for this app version
        VincentAppStorage.VersionedApp storage versionedApp = as_.appIdToApp[appId].versionedApps[appVersion - 1];

        // Get all tool hashes
        bytes32[] memory toolHashes = versionedApp.toolIpfsCidHashes.values();
        uint256 count = toolHashes.length;

        tools = new string[](count);

        // Convert each hash to its corresponding IPFS CID
        for (uint256 i = 0; i < count; i++) {
            tools[i] = ts_.toolIpfsCidHashToIpfsCid[toolHashes[i]];
        }
    }

    /**
     * @dev Checks if a tool is permitted to be used by a delegatee with a specific PKP token
     * @param delegatee The address of the delegatee
     * @param pkpTokenId The PKP token ID that would be used for execution
     * @param toolIpfsCid The IPFS CID of the tool
     * @return True if there's any enabled app version that both the PKP has permitted and includes the tool
     * @dev Reverts with DelegateeNotAssociatedWithApp if the delegatee is not associated with any app
     */
    function isToolPermittedForDelegateeAndPkp(address delegatee, uint256 pkpTokenId, string calldata toolIpfsCid)
        external
        view
        returns (bool)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        VincentUserStorage.UserStorage storage us_ = VincentUserStorage.userStorage();

        // Get the app ID that the delegatee belongs to
        uint256 appId = as_.delegateeAddressToAppId[delegatee];

        // If appId is 0, it means the delegatee is not associated with any app
        if (appId == 0) {
            revert DelegateeNotAssociatedWithApp(delegatee);
        }

        // Hash the tool IPFS CID once to avoid repeated hashing
        bytes32 hashedToolIpfsCid = keccak256(abi.encodePacked(toolIpfsCid));

        // Get the total number of versions for this app
        uint256 totalVersions = as_.appIdToApp[appId].versionedApps.length;

        // For each app version, check if conditions are met
        for (uint256 version = 1; version <= totalVersions; version++) {
            // App versions start at 1, but the array is 0-indexed
            VincentAppStorage.VersionedApp storage versionedApp = as_.appIdToApp[appId].versionedApps[version - 1];

            // Check if the version is enabled
            if (versionedApp.enabled) {
                // Check if the PKP has permitted this app version
                if (us_.agentPkpTokenIdToPermittedAppVersions[pkpTokenId][appId].contains(version)) {
                    // Check if the tool is registered for this app version
                    if (versionedApp.toolIpfsCidHashes.contains(hashedToolIpfsCid)) {
                        return true;
                    }
                }
            }
        }

        // If we've gone through all versions and haven't found a match, return false
        return false;
    }

    // ==================================================================================
    // Policy Functions
    // ==================================================================================

    /**
     * @dev Get all parameters for all policies associated with a tool for a specific PKP token and app version
     * @param pkpTokenId The PKP token ID
     * @param appId The app ID
     * @param appVersion The app version
     * @param toolIpfsCid The IPFS CID of the tool
     * @return policies An array of policies with their parameters
     */
    function getAllPoliciesWithParametersForTool(
        uint256 pkpTokenId,
        uint256 appId,
        uint256 appVersion,
        string calldata toolIpfsCid
    ) external view returns (PolicyWithParameters[] memory policies) {
        VincentUserStorage.UserStorage storage us_ = VincentUserStorage.userStorage();
        VincentAppToolPolicyStorage.AppToolPolicyStorage storage atps_ =
            VincentAppToolPolicyStorage.appToolPolicyStorage();

        // Check if the PKP has permissions for this app version
        if (!us_.agentPkpTokenIdToPermittedAppVersions[pkpTokenId][appId].contains(appVersion)) {
            revert PkpNotPermittedForAppVersion(pkpTokenId, appId, appVersion);
        }

        bytes32 hashedToolIpfsCid = keccak256(abi.encodePacked(toolIpfsCid));

        VincentUserStorage.ToolPolicyStorage storage toolPolicyStorage =
            us_.agentPkpTokenIdToToolPolicyStorage[pkpTokenId][appId][appVersion][hashedToolIpfsCid];

        // Get all policies that have parameters set for this tool
        bytes32[] memory policyHashes = toolPolicyStorage.policyIpfsCidHashesWithParameters.values();
        uint256 policyCount = policyHashes.length;

        // Create the result array
        policies = new PolicyWithParameters[](policyCount);

        // For each policy, get all its parameters
        for (uint256 i = 0; i < policyCount; i++) {
            bytes32 policyHash = policyHashes[i];

            // Get the policy IPFS CID
            policies[i].policyIpfsCid = atps_.policyIpfsCidHashToIpfsCid[policyHash];

            // Get the policy parameters storage
            VincentUserStorage.PolicyParametersStorage storage policyParametersStorage =
                toolPolicyStorage.policyIpfsCidHashToPolicyParametersStorage[policyHash];

            // Get parameter names hashes
            bytes32[] memory paramNameHashes = policyParametersStorage.policyParameterNameHashes.values();
            uint256 paramCount = paramNameHashes.length;

            // Create the parameters array for this policy
            policies[i].parameters = new PolicyParameter[](paramCount);

            // For each parameter, get its name and value
            for (uint256 j = 0; j < paramCount; j++) {
                bytes32 paramHash = paramNameHashes[j];

                // Get parameter name and value
                policies[i].parameters[j].name = atps_.policyParameterNameHashToName[paramHash];
                policies[i].parameters[j].value = policyParametersStorage.policyParameterNameHashToValue[paramHash];
            }
        }
    }
}
