// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DRTv4 is ERC20 {
    constructor() ERC20("Decentralized Resource Token v4", "DRTv4") {
        _mint(msg.sender, 1 ether);
    }
}
