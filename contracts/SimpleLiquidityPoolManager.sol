// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ILiquidityPoolManager.sol"; // Make sure this file exists

contract SimpleLiquidityPoolManager is ILiquidityPoolManager {
    address public owner;
    mapping(address => uint256) public reserves;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addLiquidity(address token, uint256 amount) external override onlyOwner {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        reserves[token] += amount;
    }

    function removeLiquidity(address token, uint256 amount) external override onlyOwner {
        require(reserves[token] >= amount, "Not enough reserve");
        reserves[token] -= amount;
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
    }

    function getReserves(address token) external view override returns (uint256) {
        return reserves[token];
    }
}
