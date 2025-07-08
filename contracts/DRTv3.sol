// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DRTv3 is ERC20 {
    address public immutable minter;

    constructor() ERC20("Decentralized Resource Token v3", "DRTv3") {
        minter = msg.sender;
        _mint(msg.sender, 1e18); // Mint exactly 1 DRTv3 to deployer's wallet
    }
}
