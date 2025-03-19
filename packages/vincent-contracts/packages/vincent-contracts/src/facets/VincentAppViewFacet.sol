// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../LibVincentDiamondStorage.sol";

/**
 * @title VincentAppViewFacet
 * @notice Provides view functions for accessing app-related data
 * @dev Read-only facet for the Vincent Diamond contract
 */
contract VincentAppViewFacet {
    using VincentAppStorage for VincentAppStorage.AppStorage;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // Add error declarations here
    error AppNotRegistered(uint256 appId);
    error InvalidAppVersion(uint256 appId, uint256 appVersion);

    // ==================================================================================
    // Data Structures
    // ==================================================================================

    /**
     * @notice Represents basic app information including metadata and relationships
     * @dev Used for returning app data in view functions
     */
    struct AppView {
        string name;
        string description;
        address manager;
        uint256 latestVersion;
        address[] delegatees;
        string[] authorizedDomains;
        string[] authorizedRedirectUris;
    }

    /**
     * @notice Represents a specific version of an app with all associated data
     * @dev Extends AppView with version-specific information
     */
    struct VersionedAppView {
        string name;
        string description;
        address manager;
        uint256 version;
        bool enabled;
        string[] authorizedDomains;
        string[] authorizedRedirectUris;
        string[] toolIpfsCidHashes;
        uint256[] delegatedAgentPkpTokenIds;
    }

    // ==================================================================================
    // App Registry and Enumeration Functions
    // ==================================================================================

    /**
     * @notice Returns the total count of registered apps
     * @return The current app ID counter value
     */
    function getTotalAppCount() external view returns (uint256) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        return as_.appIdCounter;
    }

    /**
     * @notice Returns all registered manager addresses
     * @return managers Array of all registered app manager addresses
     */
    function getRegisteredManagers() external view returns (address[] memory managers) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        managers = as_.registeredManagers.values();
    }

    // ==================================================================================
    // App Data Retrieval Functions
    // ==================================================================================

    /**
     * @notice Retrieves detailed information about an app
     * @param appId ID of the app to retrieve
     * @return appView Detailed view of the app
     */
    function getAppById(uint256 appId) public view returns (AppView memory appView) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        VincentAppStorage.App storage app = as_.appIdToApp[appId];

        appView.name = app.name;
        appView.description = app.description;
        appView.manager = app.manager;
        appView.latestVersion = app.versionedApps.length;
        appView.delegatees = app.delegatees.values();

        // Convert authorized domains from bytes32 hashes to strings
        uint256 domainCount = app.authorizedDomains.length();
        appView.authorizedDomains = new string[](domainCount);
        for (uint256 i = 0; i < domainCount; i++) {
            bytes32 domainHash = app.authorizedDomains.at(i);
            appView.authorizedDomains[i] = as_.authorizedDomainHashToDomain[domainHash];
        }

        // Convert authorized redirect URIs from bytes32 hashes to strings
        uint256 redirectUriCount = app.authorizedRedirectUris.length();
        appView.authorizedRedirectUris = new string[](redirectUriCount);
        for (uint256 i = 0; i < redirectUriCount; i++) {
            bytes32 redirectUriHash = app.authorizedRedirectUris.at(i);
            appView.authorizedRedirectUris[i] = as_.authorizedRedirectUriHashToRedirectUri[redirectUriHash];
        }
    }

    /**
     * @notice Retrieves detailed information about a specific version of an app
     * @param appId ID of the app to retrieve
     * @param version Version number of the app to retrieve
     * @return versionedAppView Detailed view of the app version
     */
    function getAppVersion(uint256 appId, uint256 version)
        external
        view
        returns (VersionedAppView memory versionedAppView)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        VincentAppStorage.App storage app = as_.appIdToApp[appId];

        AppView memory appView = getAppById(appId);

        versionedAppView.name = appView.name;
        versionedAppView.description = appView.description;
        versionedAppView.manager = appView.manager;
        versionedAppView.authorizedDomains = appView.authorizedDomains;
        versionedAppView.authorizedRedirectUris = appView.authorizedRedirectUris;

        // App versions start at 1, but the appVersions array is 0-indexed
        VincentAppStorage.VersionedApp storage versionedApp = app.versionedApps[version - 1];

        versionedAppView.version = versionedApp.version;
        versionedAppView.enabled = versionedApp.enabled;
        versionedAppView.delegatedAgentPkpTokenIds = versionedApp.delegatedAgentPkps.values();

        VincentToolStorage.ToolStorage storage ts = VincentToolStorage.toolStorage();

        uint256 toolIpfsCidHashesLength = versionedApp.toolIpfsCidHashes.length();
        versionedAppView.toolIpfsCidHashes = new string[](toolIpfsCidHashesLength);
        for (uint256 i = 0; i < toolIpfsCidHashesLength; i++) {
            versionedAppView.toolIpfsCidHashes[i] = ts.toolIpfsCidHashToIpfsCid[versionedApp.toolIpfsCidHashes.at(i)];
        }
    }

    // ==================================================================================
    // Manager-Related Functions
    // ==================================================================================

    /**
     * @notice Retrieves all apps managed by a specific address
     * @param manager Address of the manager
     * @return appViews Array of apps managed by the specified address
     */
    function getAppsByManager(address manager) external view returns (AppView[] memory appViews) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        uint256[] memory appIds = as_.managerAddressToAppIds[manager].values();
        uint256 appCount = appIds.length;
        appViews = new AppView[](appCount);

        for (uint256 i = 0; i < appCount; i++) {
            appViews[i] = getAppById(appIds[i]);
        }
    }

    // ==================================================================================
    // Delegatee-Related Functions
    // ==================================================================================

    /**
     * @notice Retrieves the app by a delegatee address
     * @param delegatee Address of the delegatee
     * @return appView Detailed view of the app
     */
    function getAppByDelegatee(address delegatee) external view returns (AppView memory appView) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        uint256 appId = as_.delegateeAddressToAppId[delegatee];
        appView = getAppById(appId);
    }

    // ==================================================================================
    // Domain and Redirect URI Functions
    // ==================================================================================

    /**
     * @notice Retrieves a domain from its hash
     * @param domainHash Hash of the domain
     * @return domain Domain string
     */
    function getAuthorizedDomainByHash(bytes32 domainHash) external view returns (string memory domain) {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        return as_.authorizedDomainHashToDomain[domainHash];
    }

    /**
     * @notice Retrieves a redirect URI from its hash
     * @param redirectUriHash Hash of the redirect URI
     * @return redirectUri Redirect URI string
     */
    function getAuthorizedRedirectUriByHash(bytes32 redirectUriHash)
        external
        view
        returns (string memory redirectUri)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();
        return as_.authorizedRedirectUriHashToRedirectUri[redirectUriHash];
    }

    /**
     * @notice Retrieves both authorized domains and redirect URIs for a specific app
     * @param appId ID of the app
     * @return domains Array of authorized domain strings
     * @return redirectUris Array of authorized redirect URI strings
     */
    function getAuthorizedDomainsAndRedirectUrisByAppId(uint256 appId)
        external
        view
        returns (string[] memory domains, string[] memory redirectUris)
    {
        VincentAppStorage.AppStorage storage as_ = VincentAppStorage.appStorage();

        // Get domains
        uint256 domainCount = as_.appIdToApp[appId].authorizedDomains.length();
        domains = new string[](domainCount);
        for (uint256 i = 0; i < domainCount; i++) {
            domains[i] = as_.authorizedDomainHashToDomain[as_.appIdToApp[appId].authorizedDomains.at(i)];
        }

        // Get redirect URIs
        uint256 redirectUriCount = as_.appIdToApp[appId].authorizedRedirectUris.length();
        redirectUris = new string[](redirectUriCount);
        for (uint256 i = 0; i < redirectUriCount; i++) {
            redirectUris[i] =
                as_.authorizedRedirectUriHashToRedirectUri[as_.appIdToApp[appId].authorizedRedirectUris.at(i)];
        }
    }
}
