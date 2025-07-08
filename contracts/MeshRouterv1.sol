// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV2Pair {
    function getReserves() external view returns (
        uint112 reserve0,
        uint112 reserve1,
        uint32
    );
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

interface IERC20 {
    function transferFrom(address sender, address recipient, uint amount) external returns (bool);
    function transfer(address recipient, uint amount) external returns (bool);
    function balanceOf(address account) external view returns (uint);
}

interface IERC20Permit {
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
}

contract MeshRouter {
    address public immutable owner;
    address public immutable treasury;

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint amountIn,
        uint amountOut,
        address[] path,
        address[] pools
    );
    event DustWithdrawn(address indexed token, uint amount, address indexed to);

    constructor(address _treasury) {
        require(_treasury != address(0), "Mesh: Invalid treasury address");
        owner = msg.sender;
        treasury = _treasury;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Mesh: Not owner");
        _;
    }

    function _swapExactTokens(
        uint amountIn,
        uint[] calldata minAmountsOut,
        address[] calldata path,
        address[] calldata pools
    ) internal {
        require(path.length >= 2, "Mesh: Path too short");
        require(pools.length == path.length - 1, "Mesh: Mismatched path/pools length");
        require(minAmountsOut.length == pools.length, "Mesh: Mismatched minAmountsOut/pools length");

        uint amountInput = amountIn;

        for (uint i = 0; i < pools.length; i++) {
            address inputToken = path[i];
            address outputToken = path[i + 1];
            IUniswapV2Pair pair = IUniswapV2Pair(pools[i]);

            (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
            address token0 = pair.token0();
            (uint reserveIn, uint reserveOut) = inputToken == token0
                ? (reserve0, reserve1)
                : (reserve1, reserve0);

            uint amountInWithFee = amountInput * 997;
            uint numerator = amountInWithFee * reserveOut;
            uint denominator = reserveIn * 1000 + amountInWithFee;
            uint amountOut = numerator / denominator;

            require(amountOut >= minAmountsOut[i], "Mesh: Slippage too high for hop");

            IERC20(inputToken).transfer(address(pair), amountInput);

            (uint amount0Out, uint amount1Out) = inputToken == token0
                ? (uint(0), amountOut)
                : (amountOut, uint(0));

            address to = i < pools.length - 1 ? address(this) : msg.sender;
            pair.swap(amount0Out, amount1Out, to, new bytes(0));

            amountInput = amountOut;
        }

        require(IERC20(path[path.length - 1]).balanceOf(msg.sender) >= minAmountsOut[pools.length - 1], "Mesh: Insufficient final output");

        emit SwapExecuted(msg.sender, path[0], path[path.length - 1], amountIn, amountInput, path, pools);
    }

    function swapExactTokens(
        uint amountIn,
        uint[] calldata minAmountsOut,
        address[] calldata path,
        address[] calldata pools
    ) external {
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        _swapExactTokens(amountIn, minAmountsOut, path, pools);
    }

    function swapExactTokensWithPermit(
        uint amountIn,
        uint[] calldata minAmountsOut,
        address[] calldata path,
        address[] calldata pools,
        uint permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IERC20Permit(path[0]).permit(msg.sender, address(this), amountIn, permitDeadline, v, r, s);
        _swapExactTokens(amountIn, minAmountsOut, path, pools);
    }

    function withdrawDust(address token) external onlyOwner {
        uint bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "Mesh: No balance to withdraw");
        IERC20(token).transfer(treasury, bal);
        emit DustWithdrawn(token, bal, treasury);
    }
}
