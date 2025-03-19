// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/VincentDiamond.sol";
import "../../src/diamond-base/facets/DiamondCutFacet.sol";
import "../../src/diamond-base/facets/DiamondLoupeFacet.sol";
import "../../src/diamond-base/facets/OwnershipFacet.sol";
import "../../src/IPKPNftFacet.sol";
import "../../src/diamond-base/interfaces/IDiamondCut.sol";
import "../../src/diamond-base/interfaces/IDiamondLoupe.sol";
import "../../src/diamond-base/interfaces/IERC165.sol";
import "../../src/diamond-base/interfaces/IERC173.sol";

/**
 * @title MockPKPNftFacet
 * @dev A mock implementation of the PKP NFT contract for testing
 */
contract MockPKPNftFacet is IPKPNFTFacet {
    function ownerOf(uint256) external pure returns (address) {
        return address(0x1);
    }
}

/**
 * @title DiamondTestHelper
 * @dev Helper contract for setting up Diamond pattern tests
 * This can be inherited by test contracts to easily set up Diamond contracts
 */
abstract contract DiamondTestHelper is Test {
    // Diamond contracts
    VincentDiamond diamond;
    DiamondCutFacet diamondCutFacet;
    DiamondLoupeFacet diamondLoupeFacet;
    OwnershipFacet ownershipFacet;

    // Mock PKP NFT contract
    MockPKPNftFacet mockPkpNft;

    /**
     * @dev Sets up the basic Diamond infrastructure with core facets
     * Does not add any Vincent-specific facets - those should be added by inheriting contracts
     */
    function setUpBaseDiamond() internal {
        // Deploy core facets
        diamondCutFacet = new DiamondCutFacet();
        diamondLoupeFacet = new DiamondLoupeFacet();
        ownershipFacet = new OwnershipFacet();

        // Deploy mock PKP NFT contract
        mockPkpNft = new MockPKPNftFacet();

        // Deploy Diamond with cut facet
        diamond = new VincentDiamond(address(this), address(diamondCutFacet), address(mockPkpNft));

        // Create facet cuts array for core facets
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](2);

        // DiamondLoupeFacet
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(diamondLoupeFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: getDiamondLoupeFacetSelectors()
        });

        // OwnershipFacet
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(ownershipFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: getOwnershipFacetSelectors()
        });

        // Execute diamond cut to add core facets
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), new bytes(0));
    }

    /**
     * @dev Add a single facet to the diamond
     * @param facetAddress Address of the facet contract
     * @param selectors Array of function selectors to add
     */
    function addFacet(address facetAddress, bytes4[] memory selectors) internal {
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);

        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: facetAddress,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });

        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), new bytes(0));
    }

    /**
     * @dev Get Diamond Loupe facet selectors
     */
    function getDiamondLoupeFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = IDiamondLoupe.facets.selector;
        selectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        selectors[2] = IDiamondLoupe.facetAddresses.selector;
        selectors[3] = IDiamondLoupe.facetAddress.selector;
        selectors[4] = IERC165.supportsInterface.selector;
        return selectors;
    }

    /**
     * @dev Get Ownership facet selectors
     */
    function getOwnershipFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = IERC173.owner.selector;
        selectors[1] = IERC173.transferOwnership.selector;
        return selectors;
    }
}
