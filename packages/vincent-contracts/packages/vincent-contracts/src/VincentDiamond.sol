// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Diamond Cut Interface
 * @author Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
 * @dev EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
 */
import {LibDiamond} from "./diamond-base/libraries/LibDiamond.sol";
import {IDiamondCut} from "./diamond-base/interfaces/IDiamondCut.sol";
import "./LibVincentDiamondStorage.sol";
import "./diamond-base/interfaces/IDiamondLoupe.sol";
import "./diamond-base/interfaces/IERC165.sol";
import "./diamond-base/interfaces/IERC173.sol";

/// @title Vincent Diamond
/// @notice Main diamond contract for Vincent system
/// @dev Implements EIP-2535 Diamond Standard
contract VincentDiamond {
    error InvalidPKPNFTContract();

    /// @notice Initialize the diamond with the contract owner, diamondCut facet, and PKP NFT contract
    /// @param _contractOwner Address of the contract owner
    /// @param _diamondCutFacet Address of the DiamondCutFacet
    /// @param _pkpNFTContract Address of the PKP NFT contract
    constructor(address _contractOwner, address _diamondCutFacet, address _pkpNFTContract) payable {
        // Validate PKP NFT contract address
        if (_pkpNFTContract == address(0)) revert InvalidPKPNFTContract();

        // Set the contract owner
        LibDiamond.setContractOwner(_contractOwner);

        // Initialize ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        // Add the diamondCut external function from the diamondCutFacet
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        bytes4[] memory functionSelectors = new bytes4[](1);
        functionSelectors[0] = IDiamondCut.diamondCut.selector;
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: _diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: functionSelectors
        });
        LibDiamond.diamondCut(cut, address(0), "");

        // Initialize Vincent storage with PKP NFT contract (inlined)
        VincentUserStorage.UserStorage storage us = VincentUserStorage.userStorage();
        us.PKP_NFT_FACET = IPKPNFTFacet(_pkpNFTContract);
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        assembly {
            ds.slot := position
        }
        // get facet from function selector
        address facet = address(bytes20(ds.facets[msg.sig]));
        require(facet != address(0), "Diamond: Function does not exist");
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {
        revert("Diamond: Does not accept direct ETH transfers");
    }
}
