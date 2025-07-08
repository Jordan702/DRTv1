// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DRTv2 - Decentralized Resource Token v2
/// @notice Minted based on distinct, verifiable contributions to the DRTv2 economy
contract DRTv2 is ERC20, Ownable {
    uint256 public constant MAX_MINT_PER_TX = 100 * 10**18;

    constructor(address initialOwner)
        ERC20("Decentralized Resource Token v2", "DRTv2")
        Ownable(initialOwner)
    {}

    /// @notice Mint new DRTv2 tokens to a recipient (only callable by backend owner)
    /// @param to Recipient wallet address
    /// @param amount Token amount (18 decimals)
    function mint(address to, uint256 amount) external onlyOwner {
        require(amount <= MAX_MINT_PER_TX, "Exceeds max mint limit");
        _mint(to, amount);
    }
}
