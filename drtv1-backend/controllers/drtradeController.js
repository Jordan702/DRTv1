require('dotenv').config();
const { ethers } = require('ethers');

// Load contract ABIs from JSON files
const DRTRADE_ABI = require('../abi/DRTrade_abi.json');
const DRT_ABI = require('../abi/DRT_abi.json');
const WETH_ABI = require('../abi/WETH_abi.json');

// Contract addresses
const DRTRADE_ADDRESS = process.env.DRTRADE_CONTRACT_ADDRESS || "0xD0DC7f8935A661010D56A470eA81572a4a84EED4";
const DRT_TOKEN_ADDRESS = process.env.DRT_CONTRACT_ADDRESS || "0xYourDRTTokenAddress"; // Update this
const WETH_TOKEN_ADDRESS = process.env.WETH_CONTRACT_ADDRESS || "0xYourWETHTokenAddress"; // Update this
const POOL_ADDRESS = "0xe1c76fbf1b373165822b564c6f3accf78c5a344a"; // DRTv1/WETH Liquidity Pool address

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

// Create contract instances
console.log("🔄 Syncing contract instances...");
const drTradeContract = new ethers.Contract(DRTRADE_ADDRESS, DRTRADE_ABI, wallet);
const drTokenContract = new ethers.Contract(DRT_TOKEN_ADDRESS, DRT_ABI, provider);
const wethTokenContract = new ethers.Contract(WETH_TOKEN_ADDRESS, WETH_ABI, provider);

console.log("✅ Synced contracts:");
console.log("🔹 DRTrade.sol Contract Address:", DRTRADE_ADDRESS);
console.log("🔹 DRT Token Contract Address:", DRT_TOKEN_ADDRESS);
console.log("🔹 WETH Token Contract Address:", WETH_TOKEN_ADDRESS);
console.log("🔹 Liquidity Pool Address:", POOL_ADDRESS);

// Liquidity Cache
let liquidityCache = { drt: "0", weth: "0" };

// Periodic Liquidity Update
const updateLiquidity = async () => {
  try {
    console.log("🔄 Checking liquidity pool balances...");
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

setInterval(updateLiquidity, 60000);

/**
 * Liquidity Check Function
 */
const liquidityCheck = async (req, res) => {
  try {
    const { walletAddress, direction, amount } = req.body;
    console.log(`🔎 Received request from wallet: ${walletAddress}`);
    
    const isBuy = direction.toLowerCase() === "buy";
    const amountBN = ethers.parseUnits(amount, 18);

    const sufficientLiquidity = isBuy
      ? liquidityCache.drt >= amountBN
      : liquidityCache.weth >= amountBN;

    if (!sufficientLiquidity) {
      console.log(`❌ Liquidity insufficient for ${isBuy ? "buy" : "sell"}.`);
      return res.status(400).json({ error: "❌ Insufficient liquidity." });
    }

    console.log("✅ Liquidity check passed.");
    return res.status(200).json({ status: "proceed" });
  } catch (error) {
    console.error("🚨 Liquidity check error:", error);
    return res.status(500).json({ error: "Liquidity check failed", details: error.message });
  }
};

/**
 * Execute Trade Function
 */
const executeTrade = async (req, res) => {
  try {
    const { walletAddress, direction, amount } = req.body;
    console.log(`🔄 Trade execution request from wallet: ${walletAddress}`);
    
    const isBuy = direction.toLowerCase() === "buy";
    const amountBN = ethers.parseUnits(amount, 18);

    if (!liquidityCheck(req, res)) {
      return res.status(400).json({ error: "❌ Trade aborted due to insufficient liquidity." });
    }

    let tx;
    console.log(`🚀 Executing ${isBuy ? "buy" : "sell"} trade...`);

    if (isBuy) {
      tx = await drTradeContract.swapExactWETHForDRTv1(amountBN);
    } else {
      tx = await drTradeContract.swapExactDRTv1ForWETH(amountBN);
    }

    await tx.wait();
    console.log("✅ Trade executed successfully! Tx Hash:", tx.hash);
    return res.status(200).json({ status: "success", txHash: tx.hash });
  } catch (error) {
    console.error("🚨 Trade execution error:", error);
    return res.status(500).json({ error: "Trade execution failed", details: error.message });
  }
};

module.exports = { liquidityCheck, executeTrade };
