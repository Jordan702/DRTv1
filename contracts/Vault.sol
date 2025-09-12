// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDigitize {
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

contract Vault {
    address public owner;
    IDigitize public dUSD;

    mapping(address => uint256) public rebates;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _dUSD) {
        owner = msg.sender;
        dUSD = IDigitize(_dUSD);
    }

    /// @notice Log rebate amounts owed (called by Digitize.sol internally or manually by owner)
    function creditRebate(address collector, uint256 amount) external onlyOwner {
        rebates[collector] += amount;
    }

    /// @notice Collector withdraws their rebates
    function claimRebate() external {
        uint256 amt = rebates[msg.sender];
        require(amt > 0, "Nothing to claim");
        rebates[msg.sender] = 0;
        require(dUSD.transfer(msg.sender, amt), "Transfer failed");
    }
}
