// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract DRTUniversalRouterV2 {
    address public immutable owner;
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; 
    address public immutable treasury;

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function multiHopSwap(
        address tokenIn,
        address tokenOut,
        uint amountIn,
        address[][] calldata paths,
        uint deadline
    ) external {
        require(paths.length > 0, "No paths");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        uint currentAmount = amountIn;

        for (uint i = 0; i < paths.length; i++) {
            address[] memory path = paths[i];
            require(path.length >= 2, "Invalid path");

            IERC20(path[0]).approve(UNISWAP_V2_ROUTER, currentAmount);

            uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
                currentAmount,
                1,
                path,
                address(this),
                deadline
            );

            currentAmount = amounts[amounts.length - 1];
        }

        IERC20(tokenOut).transfer(msg.sender, currentAmount);
    }

    function withdrawDust(address token) external onlyOwner {
        uint balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(treasury, balance);
    }
}
