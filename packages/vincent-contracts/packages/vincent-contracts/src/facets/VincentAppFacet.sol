// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../LibVincentDiamondStorage.sol";
import "../VincentBase.sol";

interface IVincentToolFacet {
    function registerTool(string calldata toolIpfsCid) external;
}

contract VincentAppFacet is VincentBase {
    using VincentAppStorage for VincentAppStorage.AppStorage;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    event NewManagerRegistered(address indexed manager);
    event NewAppRegistered(uint256 indexed appId, address indexed manager);
    event NewAppVersionRegistered(uint256 indexed appId, uint256 indexed appVersion, address indexed manager);
    event AppEnabled(uint256 indexed appId, uint256 indexed appVersion, bool indexed enabled);
    event AuthorizedDomainAdded(uint256 indexed appId, string indexed domain);
    event AuthorizedRedirectUriAdded(uint256 indexed appId, string indexed redirectUri);
    event AuthorizedDomainRemoved(uint256 indexed appId, string indexed domain);
    event AuthorizedRedirectUriRemoved(uint256 indexed appId, string indexed redirectUri);

    error NotAppManager(uint256 appId, address msgSender);
    error ToolsAndPoliciesLengthMismatch();
    error DelegateeAlreadyRegisteredToApp(uint256 appId, address delegatee);
    error DelegateeNotRegisteredToApp(uint256 appId, address delegatee);
    error AuthorizedDomainNotRegistered(uint256 appId, bytes32 hashedDomain);
    error AuthorizedRedirectUriNotRegistered(uint256 appId, bytes32 hashedRedirectUri);

    modifier onlyAppManager(uint256 appId) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        if (as_.appIdToApp[appId].manager != msg.sender) revert NotAppManager(appId, msg.sender);
        _;
    }

    function registerApp(
        string calldata name,
        string calldata description,
        string[] calldata authorizedDomains,
        string[] calldata authorizedRedirectUris,
        address[] calldata delegatees
    ) public returns (uint256 newAppId) {
        newAppId = _registerApp(name, description, authorizedDomains, authorizedRedirectUris, delegatees);

        // Add the manager to the list of registered managers
        // if they are not already in the list
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        if (!as_.registeredManagers.contains(msg.sender)) {
            as_.registeredManagers.add(msg.sender);
            emit NewManagerRegistered(msg.sender);
        }

        emit NewAppRegistered(newAppId, msg.sender);
    }

    function registerAppWithVersion(
        string calldata name,
        string calldata description,
        string[] calldata authorizedDomains,
        string[] calldata authorizedRedirectUris,
        address[] calldata delegatees,
        string[] calldata toolIpfsCids,
        string[][] calldata toolPolicies,
        string[][][] calldata toolPolicyParameterNames
    ) public returns (uint256 newAppId, uint256 newAppVersion) {
        newAppId = _registerApp(name, description, authorizedDomains, authorizedRedirectUris, delegatees);
        newAppVersion = _registerNextAppVersion(newAppId, toolIpfsCids, toolPolicies, toolPolicyParameterNames);

        // Add the manager to the list of registered managers
        // if they are not already in the list
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        if (!as_.registeredManagers.contains(msg.sender)) {
            as_.registeredManagers.add(msg.sender);
            emit NewManagerRegistered(msg.sender);
        }

        emit NewAppRegistered(newAppId, msg.sender);
        emit NewAppVersionRegistered(newAppId, newAppVersion, msg.sender);
    }

    function registerNextAppVersion(
        uint256 appId,
        string[] calldata toolIpfsCids,
        string[][] calldata toolPolicies,
        string[][][] calldata toolPolicyParameterNames
    ) public onlyAppManager(appId) onlyRegisteredApp(appId) returns (uint256 newAppVersion) {
        newAppVersion = _registerNextAppVersion(appId, toolIpfsCids, toolPolicies, toolPolicyParameterNames);

        emit NewAppVersionRegistered(appId, newAppVersion, msg.sender);
    }

    function enableAppVersion(uint256 appId, uint256 appVersion, bool enabled)
        external
        onlyAppManager(appId)
        onlyRegisteredApp(appId)
        onlyRegisteredAppVersion(appId, appVersion)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        // App versions start at 1, but the appVersions array is 0-indexed
        as_.appIdToApp[appId].versionedApps[appVersion - 1].enabled = enabled;
        emit AppEnabled(appId, appVersion, enabled);
    }

    function addAuthorizedDomain(uint256 appId, string calldata domain)
        external
        onlyAppManager(appId)
        onlyRegisteredApp(appId)
    {
        _addAuthorizedDomain(appId, domain);
    }

    function removeAuthorizedDomain(uint256 appId, string calldata domain)
        external
        onlyAppManager(appId)
        onlyRegisteredApp(appId)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        bytes32 hashedDomain = keccak256(abi.encodePacked(domain));

        if (!as_.appIdToApp[appId].authorizedDomains.contains(hashedDomain)) {
            revert AuthorizedDomainNotRegistered(appId, hashedDomain);
        }

        as_.appIdToApp[appId].authorizedDomains.remove(hashedDomain);
        delete as_.authorizedDomainHashToDomain[hashedDomain];

        emit AuthorizedDomainRemoved(appId, domain);
    }

    function addAuthorizedRedirectUri(uint256 appId, string calldata redirectUri)
        external
        onlyAppManager(appId)
        onlyRegisteredApp(appId)
    {
        _addAuthorizedRedirectUri(appId, redirectUri);
    }

    function removeAuthorizedRedirectUri(uint256 appId, string calldata redirectUri)
        external
        onlyAppManager(appId)
        onlyRegisteredApp(appId)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        bytes32 hashedRedirectUri = keccak256(abi.encodePacked(redirectUri));

        if (!as_.appIdToApp[appId].authorizedRedirectUris.contains(hashedRedirectUri)) {
            revert AuthorizedRedirectUriNotRegistered(appId, hashedRedirectUri);
        }

        as_.appIdToApp[appId].authorizedRedirectUris.remove(hashedRedirectUri);
        delete as_.authorizedRedirectUriHashToRedirectUri[hashedRedirectUri];

        emit AuthorizedRedirectUriRemoved(appId, redirectUri);
    }

    function addDelegatee(uint256 appId, address delegatee) external onlyAppManager(appId) onlyRegisteredApp(appId) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        // Check if the delegatee is already registered to any app
        uint256 delegateeAppId = as_.delegateeAddressToAppId[delegatee];
        if (delegateeAppId != 0) {
            revert DelegateeAlreadyRegisteredToApp(delegateeAppId, delegatee);
        }

        as_.appIdToApp[appId].delegatees.add(delegatee);
        as_.delegateeAddressToAppId[delegatee] = appId;
    }

    function removeDelegatee(uint256 appId, address delegatee)
        external
        onlyAppManager(appId)
        onlyRegisteredApp(appId)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        if (as_.delegateeAddressToAppId[delegatee] != appId) revert DelegateeNotRegisteredToApp(appId, delegatee);

        as_.appIdToApp[appId].delegatees.remove(delegatee);
        as_.delegateeAddressToAppId[delegatee] = 0;
    }

    function _registerApp(
        string calldata name,
        string calldata description,
        string[] calldata authorizedDomains,
        string[] calldata authorizedRedirectUris,
        address[] calldata delegatees
    ) internal returns (uint256 newAppId) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        newAppId = ++as_.appIdCounter;

        // Add the app to the list of registered apps
        as_.registeredApps.add(newAppId);

        // Add the app to the manager's list of apps
        as_.managerAddressToAppIds[msg.sender].add(newAppId);

        // Register the app
        VincentAppStorage.App storage app = as_.appIdToApp[newAppId];
        app.manager = msg.sender;
        app.name = name;
        app.description = description;

        for (uint256 i = 0; i < authorizedDomains.length; i++) {
            _addAuthorizedDomain(newAppId, authorizedDomains[i]);
        }

        for (uint256 i = 0; i < authorizedRedirectUris.length; i++) {
            _addAuthorizedRedirectUri(newAppId, authorizedRedirectUris[i]);
        }

        // Add the delegatees to the app
        for (uint256 i = 0; i < delegatees.length; i++) {
            uint256 existingAppId = as_.delegateeAddressToAppId[delegatees[i]];
            if (existingAppId != 0) {
                revert DelegateeAlreadyRegisteredToApp(existingAppId, delegatees[i]);
            }

            app.delegatees.add(delegatees[i]);
            as_.delegateeAddressToAppId[delegatees[i]] = newAppId;
        }
    }

    /**
     * @dev Registers a new version of an app, associating tools and policies with it.
     * This function ensures that all provided tools, policies, and parameters are correctly stored
     * and linked to the new app version.
     *
     * @notice This function is used internally to register a new app version and its associated tools and policies.
     *
     * @param appId The ID of the app for which a new version is being registered.
     * @param toolIpfsCids An array of IPFS CIDs representing the tools associated with this version.
     * @param toolPolicies A 2D array mapping each tool to a list of associated policies.
     * @param toolPolicyParameterNames A 3D array mapping each policy to a list of associated parameter names.
     * @return newAppVersion The newly created version number for the app.
     */
    function _registerNextAppVersion(
        uint256 appId,
        string[] calldata toolIpfsCids,
        string[][] calldata toolPolicies,
        string[][][] calldata toolPolicyParameterNames
    ) internal returns (uint256 newAppVersion) {
        // Step 1: Validate input array lengths to ensure all tools have corresponding policies and parameters.
        uint256 toolCount = toolIpfsCids.length;
        if (toolCount != toolPolicies.length || toolCount != toolPolicyParameterNames.length) {
            revert ToolsAndPoliciesLengthMismatch();
        }

        // Step 2: Fetch necessary storage references.
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        VincentAppStorage.App storage app = as_.appIdToApp[appId];

        // Step 3: Create a new app version.
        app.versionedApps.push();
        newAppVersion = app.versionedApps.length;

        // App versions start at 1, but the `versionedApps` array is 0-indexed.
        VincentAppStorage.VersionedApp storage versionedApp = app.versionedApps[newAppVersion - 1];
        versionedApp.version = newAppVersion;
        versionedApp.enabled = true; // App versions are enabled by default

        // Step 4: Fetch tool policy storage.
        VincentAppToolPolicyStorage.AppToolPolicyStorage storage atps_ =
            VincentAppToolPolicyStorage.appToolPolicyStorage();

        // Step 5: Iterate through each tool to register it with the new app version.
        for (uint256 i = 0; i < toolCount; i++) {
            string memory toolIpfsCid = toolIpfsCids[i]; // Cache calldata value
            bytes32 hashedToolCid = keccak256(abi.encodePacked(toolIpfsCid));

            // Step 5.1: Register the tool IPFS CID globally if it hasn't been added already.
            if (!versionedApp.toolIpfsCidHashes.contains(hashedToolCid)) {
                versionedApp.toolIpfsCidHashes.add(hashedToolCid);
                IVincentToolFacet(address(this)).registerTool(toolIpfsCid);
            }

            // Step 5.2: Fetch the policy storage for this tool.
            VincentAppToolPolicyStorage.VersionedToolPolicies storage versionedToolPolicies =
                atps_.appIdToVersionedToolPolicies[appId][newAppVersion][hashedToolCid];

            // Step 6: Iterate through policies linked to this tool.
            uint256 policyCount = toolPolicies[i].length;
            for (uint256 j = 0; j < policyCount; j++) {
                string memory policyIpfsCid = toolPolicies[i][j]; // Cache calldata value
                bytes32 hashedToolPolicy = keccak256(abi.encodePacked(policyIpfsCid));

                // Step 6.1: Register the policy hash.
                versionedToolPolicies.policyIpfsCidHashes.add(hashedToolPolicy);

                // Step 6.2: Store the policy IPFS CID globally if it's not already stored.
                if (bytes(atps_.policyIpfsCidHashToIpfsCid[hashedToolPolicy]).length == 0) {
                    atps_.policyIpfsCidHashToIpfsCid[hashedToolPolicy] = policyIpfsCid;
                }

                // Step 7: Fetch parameter storage for this policy.
                EnumerableSet.Bytes32Set storage policyParameterNameHashes =
                    versionedToolPolicies.policyIpfsCidHashToParameterNameHashes[hashedToolPolicy];

                // Step 8: Iterate through policy parameters.
                uint256 paramCount = toolPolicyParameterNames[i][j].length;
                for (uint256 k = 0; k < paramCount; k++) {
                    string memory paramName = toolPolicyParameterNames[i][j][k]; // Cache calldata value
                    bytes32 hashedPolicyParameterName = keccak256(abi.encodePacked(paramName));

                    // Step 8.1: Register the policy parameter.
                    policyParameterNameHashes.add(hashedPolicyParameterName);

                    // Step 8.2: Store the parameter name if not already stored.
                    if (bytes(atps_.policyParameterNameHashToName[hashedPolicyParameterName]).length == 0) {
                        atps_.policyParameterNameHashToName[hashedPolicyParameterName] = paramName;
                    }
                }
            }
        }
    }

    function _addAuthorizedDomain(uint256 appId, string calldata domain) internal {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        bytes32 hashedDomain = keccak256(abi.encodePacked(domain));

        as_.appIdToApp[appId].authorizedDomains.add(hashedDomain);
        as_.authorizedDomainHashToDomain[hashedDomain] = domain;

        emit AuthorizedDomainAdded(appId, domain);
    }

    function _addAuthorizedRedirectUri(uint256 appId, string calldata redirectUri) internal {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        bytes32 hashedRedirectUri = keccak256(abi.encodePacked(redirectUri));

        as_.appIdToApp[appId].authorizedRedirectUris.add(hashedRedirectUri);
        as_.authorizedRedirectUriHashToRedirectUri[hashedRedirectUri] = redirectUri;

        emit AuthorizedRedirectUriAdded(appId, redirectUri);
    }
}
