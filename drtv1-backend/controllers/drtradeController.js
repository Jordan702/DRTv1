require('dotenv').config();
const { ethers } = require('ethers');
const { evaluateLiquidity } = require('../services/uniswapService.js');

// Initialize provider and wallet using ethers v6 syntax
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

// Contract addresses and ABIs
const DRTV1_ADDRESS = '0x2c899a490902352aFa33baFb7fe89c9Dd142f9D1';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const PAIR_ADDRESS = '0xe1c76fbf1b373165822b564c6f3accf78c5a344a';
const DRTRADE_ADDRESS = '0xD0DC7f8935A661010D56A470eA81572a4a84EED4';

// Standard ERC20 ABI remains the same.
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

// Updated ABI for a Uniswap V3 pool.
const PAIR_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() external view returns (uint128)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

// Trade contract ABI remains unchanged.
const DRTRADE_ABI = [
  "function swapExactDRTv1ForWETH(uint256 amountIn) external returns (uint256)",
  "function swapExactWETHForDRTv1(uint256 amountIn) external returns (uint256)"
];

// Create contract instances
const drtv1Contract = new ethers.Contract(DRTV1_ADDRESS, ERC20_ABI, wallet);
const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, wallet);
const pairContract = new ethers.Contract(PAIR_ADDRESS, PAIR_ABI, provider);
const drTradeContract = new ethers.Contract(DRTRADE_ADDRESS, DRTRADE_ABI, wallet);

// Utility: fetch pool data from a Uniswap V3 pool
async function getPoolData() {
  const slot0 = await pairContract.slot0();
  const currentLiquidity = await pairContract.liquidity();
  const token0 = await pairContract.token0();
  const token1 = await pairContract.token1();
  return { slot0, currentLiquidity, token0, token1 };
}

// Function: Checks liquidity without executing a trade
const liquidityCheck = async (req, res) => {
  try {
    const { direction, amount } = req.body;
    if (!direction || !amount) {
      return res.status(400).json({ error: "Direction and amount are required." });
    }
    
    // Retrieve pool data from a Uniswap V3 pool.
    const { slot0, currentLiquidity, token0, token1 } = await getPoolData();

    // Convert the human-readable amount into the smallest unit (assume 18 decimals)
    const amountBN = ethers.parseUnits(amount, 18);

    // Construct liquidity data for AI evaluation.
    const liquidityData = {
      direction,
      amount: amountBN.toString(),
      liquidity: currentLiquidity.toString(),
      sqrtPriceX96: slot0.sqrtPriceX96.toString(),
      tick: slot0.tick.toString(),
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase()
    };

    const aiDecision = await evaluateLiquidity(liquidityData);

    if (aiDecision === 'proceed') {
      return res.status(200).json({ status: "proceed" });
    } else {
      return res.status(200).json({ status: "abort" });
    }
  } catch (error) {
    console.error("Liquidity check error:", error);
    return res.status(500).json({ error: "Liquidity check failed", details: error.message });
  }
};

// Function: Executes the trade (swap) if liquidity is sufficient
const executeTrade = async (req, res) => {
  try {
    const { direction, amount } = req.body;
    if (!direction || !amount) {
      return res.status(400).json({ error: "Direction and amount are required." });
    }
    // Convert the amount to BigNumber using ethers.parseUnits with 18 decimals.
    const amountBN = ethers.parseUnits(amount, 18);
    let swapTx;
    if (direction === 'buy') {
      // For buying DRTv1 with ETH, use swapExactWETHForDRTv1.
      swapTx = await drTradeContract.swapExactWETHForDRTv1(amountBN);
    } else if (direction === 'sell') {
      // For selling DRTv1 for ETH, use swapExactDRTv1ForWETH.
      swapTx = await drTradeContract.swapExactDRTv1ForWETH(amountBN);
    } else {
      return res.status(400).json({ error: "Invalid trade direction." });
    }
    await swapTx.wait();
    return res.status(200).json({ status: "success", txHash: swapTx.hash });
  } catch (error) {
    console.error("Trade execution error:", error);
    return res.status(500).json({ error: "Trade execution failed", details: error.message });
  }
};

module.exports = { liquidityCheck, executeTrade };
