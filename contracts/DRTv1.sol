// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DRTv1 is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address initialMinter) ERC20("Decentralized Resource Token v1", "DRTv1") {
        // Grant the deployer the admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Grant the specified address the minter role
        _grantRole(MINTER_ROLE, initialMinter);
    }

    function mint(address to, uint256 amount) external {
        require(hasRole(MINTER_ROLE, msg.sender), "DRTv1: Not authorized to mint");
        _mint(to, amount);
    }
}
