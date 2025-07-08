// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract DRTrade {
    using SafeMath for uint256;

    IERC20 public drtToken;
    IERC20 public ethToken; // Assuming ETH representation (e.g., WETH)

    constructor(address _drt, address _eth) payable { // Allow owner to fund with initial ETH
        drtToken = IERC20(_drt);
        ethToken = IERC20(_eth);
        owner = msg.sender;
        if (msg.value > 0) {
            require(ethToken.transfer(address(this), msg.value), "Initial ETH transfer failed");
        }
    }

    function swapDRTForETH(uint256 _drtAmount) external payable {
        require(_drtAmount > 0, "DRT amount must be positive");

        uint256 drtBalance = drtToken.balanceOf(address(this));
        uint256 ethBalance = ethToken.balanceOf(address(this));

        require(drtBalance > 0 && ethBalance > 0, "Insufficient pool liquidity");
        require(IERC20(drtToken).transferFrom(msg.sender, address(this), _drtAmount), "DRT transfer failed");

        uint256 ethOut = ethBalance.mul(_drtAmount).div(drtBalance);

        require(IERC20(ethToken).transfer(msg.sender, ethOut), "ETH transfer failed");
    }

    function swapETHForDRT(uint256 _ethAmount) external {
        require(_ethAmount > 0, "ETH amount must be positive");

        uint256 drtBalance = drtToken.balanceOf(address(this));
        uint256 ethBalance = ethToken.balanceOf(address(this));

        require(drtBalance > 0 && ethBalance > 0, "Insufficient pool liquidity");
        require(IERC20(ethToken).transferFrom(msg.sender, address(this), _ethAmount), "ETH transfer failed");

        uint256 drtOut = drtBalance.mul(_ethAmount).div(ethBalance);

        require(IERC20(drtToken).transfer(msg.sender, drtOut), "DRT transfer failed");
    }

    // To allow adding initial liquidity (for simplicity, sender provides both tokens)
    function addLiquidity(uint256 _drtAmount, uint256 _ethAmount) external {
        require(_drtAmount > 0 && _ethAmount > 0, "Amounts must be positive");
        require(IERC20(drtToken).transferFrom(msg.sender, address(this), _drtAmount), "DRT transfer failed");
        require(IERC20(ethToken).transferFrom(msg.sender, address(this), _ethAmount), "ETH transfer failed");
    }

    // To allow withdrawing all liquidity (for simplicity, only owner)
    function withdrawLiquidity() external onlyOwner {
        uint256 drtBalance = IERC20(drtToken).balanceOf(address(this));
        uint256 ethBalance = IERC20(ethToken).balanceOf(address(this));
        require(IERC20(drtToken).transfer(owner, drtBalance), "DRT withdraw failed");
        require(IERC20(ethToken).transfer(owner, ethBalance), "ETH withdraw failed");
    }

    address public owner;
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    receive() external payable {}
}
