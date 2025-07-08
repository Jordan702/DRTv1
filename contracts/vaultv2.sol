// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./sETH.sol";

contract sETHVaultv2 is Ownable {
    sETH public token;

    // Maps token type: 1 for DRTv1, 2 for DRTv2
    mapping(uint8 => address) public sETHPoolForToken;

    event RedeemRequested(address indexed user, uint256 amount);
    event PoolRegistered(uint8 indexed tokenType, address pool);
    event BuyRecorded(address indexed buyer, uint8 indexed tokenType, uint256 ethAmount, uint256 minted);

    constructor(address _token, address initialOwner) Ownable(initialOwner) {
        token = sETH(_token);
    }

    function registerPool(uint8 tokenType, address sETHPool) external onlyOwner {
        require(tokenType == 1 || tokenType == 2, "Invalid token type");
        sETHPoolForToken[tokenType] = sETHPool;
        emit PoolRegistered(tokenType, sETHPool);
    }

    function recordBuy(address buyer, uint256 ethAmount, uint8 tokenType) external onlyOwner {
        require(sETHPoolForToken[tokenType] != address(0), "Pool not registered");

        uint256 mintAmount = ethAmount * 2;
        uint256 half = mintAmount / 2;

        token.mint(sETHPoolForToken[tokenType], half); // to pool
        token.mint(address(this), half);               // to vault

        emit BuyRecorded(buyer, tokenType, ethAmount, mintAmount);
    }

    function redeemForETH(uint256 amount) external {
        require(token.balanceOf(msg.sender) >= amount, "Not enough sETH");
        token.burnFrom(msg.sender, amount);
        emit RedeemRequested(msg.sender, amount);
    }
}
