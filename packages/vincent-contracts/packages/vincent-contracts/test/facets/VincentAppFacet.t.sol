// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../helpers/VincentTestHelper.sol";

/**
 * @title VincentAppFacetTest
 * @dev Tests for the VincentAppFacet and VincentAppViewFacet contracts
 */
contract VincentAppFacetTest is VincentTestHelper {
    // Test variables
    uint256 public appId;
    uint256 public appVersion;

    function setUp() public override {
        // Call parent setup
        super.setUp();

        // Set up the test as the deployer
        vm.startPrank(deployer);
    }

    function testRegisterApp() public {
        // Set up test data
        string[] memory domains = new string[](2);
        domains[0] = TEST_DOMAIN_1;
        domains[1] = TEST_DOMAIN_2;

        string[] memory redirectUris = new string[](2);
        redirectUris[0] = TEST_REDIRECT_URI_1;
        redirectUris[1] = TEST_REDIRECT_URI_2;

        address[] memory delegatees = new address[](2);
        delegatees[0] = TEST_DELEGATEE_1;
        delegatees[1] = TEST_DELEGATEE_2;

        // Set up event expectations
        vm.expectEmit(true, false, false, false);
        emit NewManagerRegistered(deployer);

        // The appId will be 1 as it's the first app registered (changing from 0 to 1)
        vm.expectEmit(true, true, false, false);
        emit NewAppRegistered(1, deployer);

        // Register the app
        appId = wrappedAppFacet.registerApp(TEST_APP_NAME, TEST_APP_DESCRIPTION, domains, redirectUris, delegatees);

        // Verify app was registered correctly
        VincentAppViewFacet.AppView memory app = wrappedAppViewFacet.getAppById(appId);

        // Verify basic app data
        assertEq(app.name, TEST_APP_NAME, "App name doesn't match");
        assertEq(app.description, TEST_APP_DESCRIPTION, "App description doesn't match");
        assertEq(app.manager, deployer, "App manager doesn't match");
        assertEq(app.latestVersion, 0, "App latest version should be 0 since no versions were created");

        // Verify authorized domains
        assertEq(app.authorizedDomains.length, 2, "Should have 2 authorized domains");
        assertEq(app.authorizedDomains[0], TEST_DOMAIN_1, "First domain doesn't match");
        assertEq(app.authorizedDomains[1], TEST_DOMAIN_2, "Second domain doesn't match");

        // Verify authorized redirect URIs
        assertEq(app.authorizedRedirectUris.length, 2, "Should have 2 authorized redirect URIs");
        assertEq(app.authorizedRedirectUris[0], TEST_REDIRECT_URI_1, "First redirect URI doesn't match");
        assertEq(app.authorizedRedirectUris[1], TEST_REDIRECT_URI_2, "Second redirect URI doesn't match");

        // Verify delegatees
        assertEq(app.delegatees.length, 2, "Should have 2 delegatees");
        assertEq(app.delegatees[0], TEST_DELEGATEE_1, "First delegatee doesn't match");
        assertEq(app.delegatees[1], TEST_DELEGATEE_2, "Second delegatee doesn't match");
    }

    function testRegisterAppWithVersion() public {
        // Set up test data
        string[] memory domains = new string[](1);
        domains[0] = TEST_DOMAIN_1;

        string[] memory redirectUris = new string[](1);
        redirectUris[0] = TEST_REDIRECT_URI_1;

        address[] memory delegatees = new address[](1);
        delegatees[0] = TEST_DELEGATEE_1;

        string[] memory toolIpfsCids = new string[](1);
        toolIpfsCids[0] = TEST_TOOL_IPFS_CID_1;

        // Set up tool policies
        string[][] memory toolPolicies = new string[][](1);
        toolPolicies[0] = new string[](1);
        toolPolicies[0][0] = TEST_POLICY_1;

        string[][][] memory toolPolicyParameterNames = new string[][][](1);
        toolPolicyParameterNames[0] = new string[][](1);
        toolPolicyParameterNames[0][0] = new string[](1);
        toolPolicyParameterNames[0][0][0] = TEST_POLICY_PARAM_1;

        // Set up event expectations
        vm.expectEmit(true, false, false, false);
        emit NewManagerRegistered(deployer);

        // The appId will be 1 as it's the first app registered (changing from 0 to 1)
        vm.expectEmit(true, true, false, false);
        emit NewAppRegistered(1, deployer);

        // App version will be 1
        vm.expectEmit(true, true, true, false);
        emit NewAppVersionRegistered(1, 1, deployer);

        // Register the app with version
        (appId, appVersion) = wrappedAppFacet.registerAppWithVersion(
            TEST_APP_NAME,
            TEST_APP_DESCRIPTION,
            domains,
            redirectUris,
            delegatees,
            toolIpfsCids,
            toolPolicies,
            toolPolicyParameterNames
        );

        // Verify app was registered correctly
        VincentAppViewFacet.AppView memory app = wrappedAppViewFacet.getAppById(appId);

        // Verify basic app data
        assertEq(app.name, TEST_APP_NAME, "App name doesn't match");
        assertEq(app.description, TEST_APP_DESCRIPTION, "App description doesn't match");
        assertEq(app.manager, deployer, "App manager doesn't match");
        assertEq(app.latestVersion, 1, "App latest version should be 1");

        // Verify authorized domains
        assertEq(app.authorizedDomains.length, 1, "Should have 1 authorized domain");
        assertEq(app.authorizedDomains[0], TEST_DOMAIN_1, "Domain doesn't match");

        // Verify authorized redirect URIs
        assertEq(app.authorizedRedirectUris.length, 1, "Should have 1 authorized redirect URI");
        assertEq(app.authorizedRedirectUris[0], TEST_REDIRECT_URI_1, "Redirect URI doesn't match");

        // Verify delegatees
        assertEq(app.delegatees.length, 1, "Should have 1 delegatee");
        assertEq(app.delegatees[0], TEST_DELEGATEE_1, "Delegatee doesn't match");

        // Verify versioned app data
        VincentAppViewFacet.VersionedAppView memory versionedApp = wrappedAppViewFacet.getAppVersion(appId, appVersion);

        assertEq(versionedApp.version, 1, "App version should be 1");
        assertEq(versionedApp.enabled, true, "App version should be enabled by default");

        // Verify tools
        assertEq(versionedApp.toolIpfsCidHashes.length, 1, "Should have 1 tool registered");
        assertEq(versionedApp.toolIpfsCidHashes[0], TEST_TOOL_IPFS_CID_1, "Tool IPFS CID doesn't match");
    }

    function testRegisterNextAppVersion() public {
        // First register an app
        (appId,) = _registerTestAppWithVersion();

        // Set up data for the next version
        string[] memory toolIpfsCids = new string[](1);
        toolIpfsCids[0] = TEST_TOOL_IPFS_CID_2;

        // Set up tool policies
        string[][] memory toolPolicies = new string[][](1);
        toolPolicies[0] = new string[](1);
        toolPolicies[0][0] = TEST_POLICY_2;

        string[][][] memory toolPolicyParameterNames = new string[][][](1);
        toolPolicyParameterNames[0] = new string[][](1);
        toolPolicyParameterNames[0][0] = new string[](1);
        toolPolicyParameterNames[0][0][0] = TEST_POLICY_PARAM_2;

        // Register the tool first
        wrappedToolFacet.registerTool(TEST_TOOL_IPFS_CID_2);

        // Set up event expectations
        vm.expectEmit(true, true, true, false);
        emit NewAppVersionRegistered(appId, 2, deployer);

        // Register the next app version
        uint256 newVersion =
            wrappedAppFacet.registerNextAppVersion(appId, toolIpfsCids, toolPolicies, toolPolicyParameterNames);

        // Verify the new version was registered correctly
        assertEq(newVersion, 2, "New version should be 2");

        // Get the app to check its latest version
        VincentAppViewFacet.AppView memory app = wrappedAppViewFacet.getAppById(appId);
        assertEq(app.latestVersion, 2, "Latest version should be 2");

        // Verify versioned app data
        VincentAppViewFacet.VersionedAppView memory versionedApp = wrappedAppViewFacet.getAppVersion(appId, newVersion);

        assertEq(versionedApp.version, 2, "App version should be 2");
        assertEq(versionedApp.enabled, true, "App version should be enabled by default");

        // Verify tools - we can check the tools directly from the versioned app view
        assertEq(versionedApp.toolIpfsCidHashes.length, 1, "Should have 1 tool registered");
        assertEq(versionedApp.toolIpfsCidHashes[0], TEST_TOOL_IPFS_CID_2, "Tool IPFS CID doesn't match");
    }

    function testEnableAppVersion() public {
        // First register an app with a version
        (appId, appVersion) = _registerTestAppWithVersion();

        // Set up event expectations
        vm.expectEmit(true, true, true, false);
        emit AppEnabled(appId, appVersion, false);

        // Disable the app version
        wrappedAppFacet.enableAppVersion(appId, appVersion, false);

        // Verify the app version is disabled by checking the versioned app view
        VincentAppViewFacet.VersionedAppView memory versionedApp = wrappedAppViewFacet.getAppVersion(appId, appVersion);
        assertFalse(versionedApp.enabled, "App version should be disabled");

        // Re-enable the app version
        vm.expectEmit(true, true, true, false);
        emit AppEnabled(appId, appVersion, true);

        wrappedAppFacet.enableAppVersion(appId, appVersion, true);

        // Verify the app version is enabled again
        versionedApp = wrappedAppViewFacet.getAppVersion(appId, appVersion);
        assertTrue(versionedApp.enabled, "App version should be enabled");
    }

    function testAddAndRemoveAuthorizedDomain() public {
        // First register an app
        appId = _registerTestApp();

        // Set up event expectations for adding domain
        vm.expectEmit(true, true, false, false);
        emit AuthorizedDomainAdded(appId, TEST_DOMAIN_2);

        // Add an authorized domain
        wrappedAppFacet.addAuthorizedDomain(appId, TEST_DOMAIN_2);

        // Verify the domain was added by checking the app's domains
        VincentAppViewFacet.AppView memory app = wrappedAppViewFacet.getAppById(appId);
        assertEq(app.authorizedDomains.length, 2, "Should have 2 authorized domains");

        // Check if both domains are present (order may vary)
        bool foundDomain1 = false;
        bool foundDomain2 = false;
        for (uint256 i = 0; i < app.authorizedDomains.length; i++) {
            if (keccak256(abi.encodePacked(app.authorizedDomains[i])) == keccak256(abi.encodePacked(TEST_DOMAIN_1))) {
                foundDomain1 = true;
            } else if (
                keccak256(abi.encodePacked(app.authorizedDomains[i])) == keccak256(abi.encodePacked(TEST_DOMAIN_2))
            ) {
                foundDomain2 = true;
            }
        }
        assertTrue(foundDomain1, "Domain 1 should be in the list");
        assertTrue(foundDomain2, "Domain 2 should be in the list");

        // Set up event expectations for removing domain
        vm.expectEmit(true, true, false, false);
        emit AuthorizedDomainRemoved(appId, TEST_DOMAIN_2);

        // Remove the authorized domain
        wrappedAppFacet.removeAuthorizedDomain(appId, TEST_DOMAIN_2);

        // Verify the domain was removed
        app = wrappedAppViewFacet.getAppById(appId);
        assertEq(app.authorizedDomains.length, 1, "Should have 1 authorized domain");
        assertEq(app.authorizedDomains[0], TEST_DOMAIN_1, "Remaining domain should be TEST_DOMAIN_1");
    }

    function testAddAndRemoveAuthorizedRedirectUri() public {
        // First register an app
        appId = _registerTestApp();

        // Set up event expectations for adding redirect URI
        vm.expectEmit(true, true, false, false);
        emit AuthorizedRedirectUriAdded(appId, TEST_REDIRECT_URI_2);

        // Add an authorized redirect URI
        wrappedAppFacet.addAuthorizedRedirectUri(appId, TEST_REDIRECT_URI_2);

        // Verify the redirect URI was added by checking the app's redirect URIs
        VincentAppViewFacet.AppView memory app = wrappedAppViewFacet.getAppById(appId);
        assertEq(app.authorizedRedirectUris.length, 2, "Should have 2 authorized redirect URIs");

        // Check if both redirect URIs are present (order may vary)
        bool foundUri1 = false;
        bool foundUri2 = false;
        for (uint256 i = 0; i < app.authorizedRedirectUris.length; i++) {
            if (
                keccak256(abi.encodePacked(app.authorizedRedirectUris[i]))
                    == keccak256(abi.encodePacked(TEST_REDIRECT_URI_1))
            ) {
                foundUri1 = true;
            } else if (
                keccak256(abi.encodePacked(app.authorizedRedirectUris[i]))
                    == keccak256(abi.encodePacked(TEST_REDIRECT_URI_2))
            ) {
                foundUri2 = true;
            }
        }
        assertTrue(foundUri1, "Redirect URI 1 should be in the list");
        assertTrue(foundUri2, "Redirect URI 2 should be in the list");

        // Set up event expectations for removing redirect URI
        vm.expectEmit(true, true, false, false);
        emit AuthorizedRedirectUriRemoved(appId, TEST_REDIRECT_URI_2);

        // Remove the authorized redirect URI
        wrappedAppFacet.removeAuthorizedRedirectUri(appId, TEST_REDIRECT_URI_2);

        // Verify the redirect URI was removed
        app = wrappedAppViewFacet.getAppById(appId);
        assertEq(app.authorizedRedirectUris.length, 1, "Should have 1 authorized redirect URI");
        assertEq(
            app.authorizedRedirectUris[0], TEST_REDIRECT_URI_1, "Remaining redirect URI should be TEST_REDIRECT_URI_1"
        );
    }

    function testAddAndRemoveDelegatee() public {
        // First register an app
        appId = _registerTestApp();

        // Add a new delegatee
        wrappedAppFacet.addDelegatee(appId, TEST_DELEGATEE_2);

        // Verify the delegatee was added by checking the app's delegatees
        VincentAppViewFacet.AppView memory app = wrappedAppViewFacet.getAppById(appId);
        assertEq(app.delegatees.length, 2, "Should have 2 delegatees");

        // Check if both delegatees are present (order may vary)
        bool foundDelegatee1 = false;
        bool foundDelegatee2 = false;
        for (uint256 i = 0; i < app.delegatees.length; i++) {
            if (app.delegatees[i] == TEST_DELEGATEE_1) {
                foundDelegatee1 = true;
            } else if (app.delegatees[i] == TEST_DELEGATEE_2) {
                foundDelegatee2 = true;
            }
        }
        assertTrue(foundDelegatee1, "Delegatee 1 should be in the list");
        assertTrue(foundDelegatee2, "Delegatee 2 should be in the list");

        // Get app by delegatee to verify it's properly linked
        VincentAppViewFacet.AppView memory appByDelegatee = wrappedAppViewFacet.getAppByDelegatee(TEST_DELEGATEE_2);
        assertEq(appByDelegatee.name, TEST_APP_NAME, "App name doesn't match when retrieved by delegatee");

        // Remove a delegatee
        wrappedAppFacet.removeDelegatee(appId, TEST_DELEGATEE_2);

        // Verify the delegatee was removed
        app = wrappedAppViewFacet.getAppById(appId);
        assertEq(app.delegatees.length, 1, "Should have 1 delegatee");
        assertEq(app.delegatees[0], TEST_DELEGATEE_1, "Remaining delegatee should be TEST_DELEGATEE_1");

        // Get app by delegatee after removal - should return empty app
        appByDelegatee = wrappedAppViewFacet.getAppByDelegatee(TEST_DELEGATEE_2);
        assertEq(appByDelegatee.name, "", "App name should be empty for removed delegatee");
    }

    function testGetVersionToolsAndPolicies() public {
        // First register an app with a version and tools/policies
        (appId, appVersion) = _registerTestAppWithVersion();

        // Get tools directly from the versioned app view
        VincentAppViewFacet.VersionedAppView memory versionedApp = wrappedAppViewFacet.getAppVersion(appId, appVersion);

        // Verify we got the right tools
        assertEq(versionedApp.toolIpfsCidHashes.length, 1, "Should have 1 tool");
        assertEq(versionedApp.toolIpfsCidHashes[0], TEST_TOOL_IPFS_CID_1, "Tool IPFS CID doesn't match");
    }

    function testFailEnableAppVersionAsNonManager() public {
        // First register an app with a version
        (appId, appVersion) = _registerTestAppWithVersion();

        // Try to enable app version as non-manager (should revert)
        vm.stopPrank();
        vm.prank(nonOwner);

        // This should revert with NotAppManager error
        wrappedAppFacet.enableAppVersion(appId, appVersion, false);
    }

    function testFailAddDuplicateDelegatee() public {
        // First register an app
        appId = _registerTestApp();

        // Register a second app
        string[] memory domains = new string[](1);
        domains[0] = TEST_DOMAIN_2;

        string[] memory redirectUris = new string[](1);
        redirectUris[0] = TEST_REDIRECT_URI_2;

        address[] memory delegatees = new address[](1);
        delegatees[0] = TEST_DELEGATEE_1; // Already registered to the first app

        // This should revert with DelegateeAlreadyRegisteredToApp error
        wrappedAppFacet.registerApp("Test App 2", "Test App Description 2", domains, redirectUris, delegatees);
    }

    function testFailRemoveNonExistentDomain() public {
        // First register an app
        appId = _registerTestApp();

        // Try to remove a domain that doesn't exist
        // This should revert with AuthorizedDomainNotRegistered error
        wrappedAppFacet.removeAuthorizedDomain(appId, "non-existent-domain.com");
    }

    function testFailRemoveNonExistentRedirectUri() public {
        // First register an app
        appId = _registerTestApp();

        // Try to remove a redirect URI that doesn't exist
        // This should revert with AuthorizedRedirectUriNotRegistered error
        wrappedAppFacet.removeAuthorizedRedirectUri(appId, "https://non-existent.com/callback");
    }

    function testFailToolsAndPoliciesLengthMismatch() public {
        // First register an app
        appId = _registerTestApp();

        // Set up mismatched arrays
        string[] memory toolIpfsCids = new string[](2);
        toolIpfsCids[0] = TEST_TOOL_IPFS_CID_1;
        toolIpfsCids[1] = TEST_TOOL_IPFS_CID_2;

        // Only one policy for two tools (mismatch)
        string[][] memory toolPolicies = new string[][](1);
        toolPolicies[0] = new string[](1);
        toolPolicies[0][0] = TEST_POLICY_1;

        string[][][] memory toolPolicyParameterNames = new string[][][](2);
        toolPolicyParameterNames[0] = new string[][](1);
        toolPolicyParameterNames[0][0] = new string[](1);
        toolPolicyParameterNames[0][0][0] = TEST_POLICY_PARAM_1;
        toolPolicyParameterNames[1] = new string[][](1);
        toolPolicyParameterNames[1][0] = new string[](1);
        toolPolicyParameterNames[1][0][0] = TEST_POLICY_PARAM_2;

        // This should revert with ToolsAndPoliciesLengthMismatch error
        wrappedAppFacet.registerNextAppVersion(appId, toolIpfsCids, toolPolicies, toolPolicyParameterNames);
    }

    // Test simple utility functions
    function testGetTotalAppCount() public {
        // Register an app
        appId = _registerTestApp();

        // Check total app count
        uint256 totalCount = wrappedAppViewFacet.getTotalAppCount();
        assertEq(totalCount, 1, "Total app count should be 1");

        // Register a second app
        string[] memory domains = new string[](1);
        domains[0] = TEST_DOMAIN_2;

        string[] memory redirectUris = new string[](1);
        redirectUris[0] = TEST_REDIRECT_URI_2;

        address[] memory delegatees = new address[](1);
        delegatees[0] = TEST_DELEGATEE_2;

        wrappedAppFacet.registerApp("Test App 2", "Test App Description 2", domains, redirectUris, delegatees);

        // Check updated total app count
        totalCount = wrappedAppViewFacet.getTotalAppCount();
        assertEq(totalCount, 2, "Total app count should be 2 after registering second app");
    }

    // Test hash-related functions
    function testGetAuthorizedDomainByHash() public {
        // Register an app
        appId = _registerTestApp();

        // Calculate hash of the domain
        bytes32 domainHash = keccak256(abi.encodePacked(TEST_DOMAIN_1));

        // Retrieve domain using hash
        string memory domain = wrappedAppViewFacet.getAuthorizedDomainByHash(domainHash);
        assertEq(domain, TEST_DOMAIN_1, "Retrieved domain should match the original domain");
    }

    function testGetAuthorizedRedirectUriByHash() public {
        // Register an app
        appId = _registerTestApp();

        // Calculate hash of the redirect URI
        bytes32 redirectUriHash = keccak256(abi.encodePacked(TEST_REDIRECT_URI_1));

        // Retrieve redirect URI using hash
        string memory redirectUri = wrappedAppViewFacet.getAuthorizedRedirectUriByHash(redirectUriHash);
        assertEq(redirectUri, TEST_REDIRECT_URI_1, "Retrieved redirect URI should match the original redirect URI");
    }

    function testGetAuthorizedDomainsAndRedirectUrisByAppId() public {
        // Register an app
        appId = _registerTestApp();

        // Add another domain and redirect URI
        wrappedAppFacet.addAuthorizedDomain(appId, TEST_DOMAIN_2);
        wrappedAppFacet.addAuthorizedRedirectUri(appId, TEST_REDIRECT_URI_2);

        // Retrieve domains and redirect URIs
        (string[] memory domains, string[] memory redirectUris) =
            wrappedAppViewFacet.getAuthorizedDomainsAndRedirectUrisByAppId(appId);

        // Verify domains
        assertEq(domains.length, 2, "Should have 2 authorized domains");
        // Check if both domains are present (order may vary)
        bool foundDomain1 = false;
        bool foundDomain2 = false;
        for (uint256 i = 0; i < domains.length; i++) {
            if (keccak256(abi.encodePacked(domains[i])) == keccak256(abi.encodePacked(TEST_DOMAIN_1))) {
                foundDomain1 = true;
            } else if (keccak256(abi.encodePacked(domains[i])) == keccak256(abi.encodePacked(TEST_DOMAIN_2))) {
                foundDomain2 = true;
            }
        }
        assertTrue(foundDomain1, "Domain 1 should be in the list");
        assertTrue(foundDomain2, "Domain 2 should be in the list");

        // Verify redirect URIs
        assertEq(redirectUris.length, 2, "Should have 2 authorized redirect URIs");
        // Check if both redirect URIs are present (order may vary)
        bool foundUri1 = false;
        bool foundUri2 = false;
        for (uint256 i = 0; i < redirectUris.length; i++) {
            if (keccak256(abi.encodePacked(redirectUris[i])) == keccak256(abi.encodePacked(TEST_REDIRECT_URI_1))) {
                foundUri1 = true;
            } else if (keccak256(abi.encodePacked(redirectUris[i])) == keccak256(abi.encodePacked(TEST_REDIRECT_URI_2)))
            {
                foundUri2 = true;
            }
        }
        assertTrue(foundUri1, "Redirect URI 1 should be in the list");
        assertTrue(foundUri2, "Redirect URI 2 should be in the list");
    }

    function testGetToolCidFromHash() public {
        // Register a tool
        wrappedToolFacet.registerTool(TEST_TOOL_IPFS_CID_1);

        // Calculate hash of the tool IPFS CID
        bytes32 toolHash = keccak256(abi.encodePacked(TEST_TOOL_IPFS_CID_1));

        // Retrieve tool IPFS CID using hash
        string memory toolIpfsCid = wrappedToolViewFacet.getToolIpfsCidByHash(toolHash);
        assertEq(toolIpfsCid, TEST_TOOL_IPFS_CID_1, "Retrieved tool IPFS CID should match the original");
    }

    function testGetAppByDelegatee() public {
        // Register an app
        appId = _registerTestApp();

        // Get app by delegatee
        VincentAppViewFacet.AppView memory app = wrappedAppViewFacet.getAppByDelegatee(TEST_DELEGATEE_1);

        // Verify app data
        assertEq(app.name, TEST_APP_NAME, "App name doesn't match");
        assertEq(app.manager, deployer, "App manager doesn't match");

        // Test with non-delegatee address - should return an empty app with default values
        app = wrappedAppViewFacet.getAppByDelegatee(TEST_DELEGATEE_2);
        assertEq(app.name, "", "Name should be empty for non-delegatee");
    }
}
