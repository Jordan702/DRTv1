// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IRefundableSwapRouter is ISwapRouter {
    function refundETH() external;
}

interface IPair {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, address to) external returns (uint256 amountOut);
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB);
}

contract UniversalDRTSwapRouter {
    using SafeERC20 for IERC20;

    IRefundableSwapRouter public immutable swapRouter;

    address public constant DRTv1 = 0x2c899a490902352aFa33baFb7fe89c9Dd142f9D1;
    address public constant DRTv2 = 0x36C5183e972A46109A97774551328e1948AaD64b;
    address public constant SETH = 0x98C29B3A30A118351D56589DD3622b89551e2dA3;
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

    /// @notice Swap DRTv1 or DRTv2 for ETH via sETH
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

    /// @notice Swap ETH into DRTv1 or DRTv2 via sETH
    function swapETHforDRT(bool toV2, uint256 amountOutMin) external payable {
        require(msg.value > 0, "No ETH sent");

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

        swapRouter.refundETH(); // recover unused ETH
        (bool success, ) = msg.sender.call{ value: address(this).balance }("");
        require(success, "Refund failed");

        emit SwapExecuted(WETH9, tokenOut, msg.value, amountOut, msg.sender);
    }

    /// @notice Multi-hop token-to-token mesh swap
    function swapExactTokensForTokens(
        address[] calldata path,
        address[] calldata pairs,
        uint256 amountIn
    ) external returns (uint256 finalAmountOut) {
        require(path.length >= 2 && pairs.length == path.length - 1, "Bad path");

        IERC20(path[0]).safeTransferFrom(msg.sender, pairs[0], amountIn);

        uint256 amountOut;
        for (uint256 i = 0; i < pairs.length; i++) {
            address tokenIn = path[i];
            address tokenOut = path[i + 1];
            address recipient = (i == pairs.length - 1) ? msg.sender : pairs[i + 1];

            amountOut = IPair(pairs[i]).swap(tokenIn, tokenOut, amountIn, recipient);
            amountIn = amountOut;
        }

        finalAmountOut = amountOut;
        emit SwapExecuted(path[0], path[path.length - 1], amountIn, finalAmountOut, msg.sender);
    }

    /// @notice Read-only estimate of a mesh multi-hop swap
    function estimateMultiHop(
        address[] calldata path,
        address[] calldata pairs,
        uint256 amountIn
    ) external view returns (uint256 estimatedOut) {
        require(path.length >= 2 && pairs.length == path.length - 1, "Bad path");
        estimatedOut = amountIn;

        for (uint256 i = 0; i < pairs.length; i++) {
            (uint256 reserveIn, uint256 reserveOut) = IPair(pairs[i]).getReserves(path[i], path[i + 1]);
            require(reserveIn > 0 && reserveOut > 0, "Empty reserves");
            estimatedOut = (estimatedOut * reserveOut) / (reserveIn + estimatedOut);
        }
    }

    receive() external payable {}
}
