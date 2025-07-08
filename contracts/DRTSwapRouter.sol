// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IRefundableSwapRouter is ISwapRouter {
    function refundETH() external;
}

contract DRTSwapRouter {
    using SafeERC20 for IERC20;

    IRefundableSwapRouter public immutable swapRouter;

    address public constant DRTv1 = 0x2c899a490902352aFa33baFb7fe89c9Dd142f9D1;
    address public constant DRTv2 = 0x36C5183e972A46109A97774551328e1948AaD64b;
    address public constant SETH  = 0x98C29B3A30A118351D56589DD3622b89551e2dA3;
    address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    uint24 public constant FEE_0_3 = 3000;

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed recipient
    );

    constructor(IRefundableSwapRouter _router) {
        swapRouter = _router;
    }

    /// @notice Swap an exact amount of DRTv1 or DRTv2 into ETH (WETH) via sETH.
    function swapDRTforETH(bool fromV2, uint256 amountIn, uint256 amountOutMin) external {
        address tokenIn = fromV2 ? DRTv2 : DRTv1;

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(address(swapRouter), amountIn);

        bytes memory path = abi.encodePacked(tokenIn, FEE_0_3, SETH, FEE_0_3, WETH9);

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin
        });

        uint256 amountOut = swapRouter.exactInput(params);

        emit SwapExecuted(tokenIn, WETH9, amountIn, amountOut, msg.sender);
    }

    /// @notice Swap ETH into DRTv1 or DRTv2 via sETH.
    function swapETHforDRT(bool toV2, uint256 amountOutMin) external payable {
        require(msg.value > 0, "Must send ETH");

        address tokenOut = toV2 ? DRTv2 : DRTv1;
        bytes memory path = abi.encodePacked(WETH9, FEE_0_3, SETH, FEE_0_3, tokenOut);

        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: path,
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountIn: msg.value,
            amountOutMinimum: amountOutMin
        });

        uint256 amountOut = swapRouter.exactInput{ value: msg.value }(params);

        swapRouter.refundETH();

        (bool success, ) = msg.sender.call{ value: address(this).balance }("");
        require(success, "ETH refund failed");

        emit SwapExecuted(WETH9, tokenOut, msg.value, amountOut, msg.sender);
    }

    receive() external payable {}
}
