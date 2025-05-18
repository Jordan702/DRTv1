const { ethers } = require("ethers");
require("dotenv").config();

const POOL_ADDRESS = "0xe1c76fbf1b373165822b564c6f3accf78c5a344a";
const DRT_TOKEN_ADDRESS = process.env.DRT_CONTRACT_ADDRESS;
const WETH_TOKEN_ADDRESS = process.env.WETH_CONTRACT_ADDRESS;
const DRTRADE_ADDRESS = process.env.DRTRADE_CONTRACT_ADDRESS;
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);

// Create contract instances
const drTokenContract = new ethers.Contract(DRT_TOKEN_ADDRESS, DRT_ABI, provider);
const wethTokenContract = new ethers.Contract(WETH_TOKEN_ADDRESS, WETH_ABI, provider);
const drTradeContract = new ethers.Contract(DRTRADE_ADDRESS, DRTRADE_ABI, provider);

// Liquidity Cache
let liquidityCache = { drt: "0", weth: "0" };

// Function to update liquidity balances
const updateLiquidity = async () => {
  try {
    const poolDRTBalance = await drTokenContract.balanceOf(POOL_ADDRESS);
    const poolWETHBalance = await wethTokenContract.balanceOf(POOL_ADDRESS);

    liquidityCache = {
      drt: ethers.formatUnits(poolDRTBalance, 18),
      weth: ethers.formatUnits(poolWETHBalance, 18),
    };

    console.log("✅ Liquidity Pool Updated:", liquidityCache);
  } catch (error) {
    console.error("❌ Error updating liquidity:", error);
  }
};

// Schedule updates every 10 seconds
setInterval(updateLiquidity, 10000);

// Function to check liquidity before executing a trade
const checkLiquidity = (amount, isBuy) => {
  const amountBN = ethers.parseUnits(amount, 18);
  return isBuy
    ? liquidityCache.drt >= amountBN // Check if pool has enough DRTv1
    : liquidityCache.weth >= amountBN; // Check if pool has enough WETH
};

module.exports = { checkLiquidity, executeTrade };
