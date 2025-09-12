// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function allowance(address, address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Digitize is IERC20 {
    string public constant name = "Digitized USD";
    string public constant symbol = "dUSD";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balance;
    mapping(address => mapping(address => uint256)) private _allowance;

    address public owner;
    address public vault;

    uint256 public constant FEE_BPS = 100; // 1% = 100 basis points
    uint256 public constant HALF = 50;     // 0.5%

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _vault) {
        owner = msg.sender;
        vault = _vault;
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balance[account];
    }

    function allowance(address a, address b) external view override returns (uint256) {
        return _allowance[a][b];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(_allowance[from][msg.sender] >= amount, "Not allowed");
        _allowance[from][msg.sender] -= amount;
        _transfer(from, to, amount);
        return true;
    }

    /// @notice User digitizes $X, gets (X - 1%) dUSD
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Zero addr");
        uint256 fee = amount * FEE_BPS / 10000;
        uint256 userAmount = amount - fee;

        uint256 half = fee / 2;

        // Mint user share
        _mint(to, userAmount);
        // Mint fee shares
        _mint(owner, half); // protocol fee
        _mint(vault, fee - half); // vault rebate pool
    }

    function _mint(address to, uint256 amount) internal {
        _totalSupply += amount;
        _balance[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(_balance[from] >= amount, "Balance low");
        _balance[from] -= amount;
        _balance[to] += amount;
        emit Transfer(from, to, amount);
    }
}
