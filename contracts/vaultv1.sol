// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./sETH.sol";
contract sETHVault is Ownable {
    sETH public token;
    address public ethReceiver;
    event RedeemRequested(address indexed user, uint256 amount);
    constructor(address _token, address _ethReceiver) Ownable(msg.sender) {
        token = sETH(_token);
        ethReceiver = _ethReceiver;
    }
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    function recordBuy(address user, uint256 ethAmount) external onlyOwner {
        uint256 mintAmount = ethAmount * 2;
        token.mint(address(this), mintAmount / 2);
        token.mint(user, mintAmount / 2);
        // ETH is routed to liquidity pools by backend
    }
    function redeemForETH(uint256 amount) external {
        require(token.balanceOf(msg.sender) >= amount, "Not enough sETH");
        token.burnFrom(msg.sender, amount);
        emit RedeemRequested(msg.sender, amount);
        // AI/backend listens and retrieves ETH from the pool
    }
}
