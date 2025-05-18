// controllers/drtradeController.js

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
const drTradeContract = new ethers.Contract(DRTRADE_ADDRESS, DRTRADE_ABI, wallet);
const drTokenContract = new ethers.Contract(DRT_TOKEN_ADDRESS, DRT_ABI, provider);
const wethTokenContract = new ethers.Contract(WETH_TOKEN_ADDRESS, WETH_ABI, provider);

// Startup Debug Info
(async () => {
  try {
    console.log("✅ Loaded DRT token contract from:", DRT_TOKEN_ADDRESS);
    console.log("✅ Loaded WETH token contract from:", WETH_TOKEN_ADDRESS);
    console.log("✅ Loaded DRTrade contract from:", DRTRADE_ADDRESS);
    console.log("✅ DRTv1/WETH Liquidity Pool Address:", POOL_ADDRESS);
    console.log("✅ Signer address:", await wallet.getAddress());
  } catch (err) {
    console.error("❌ Error during startup logs:", err);
  }
})();

/**
 * Liquidity Check Function
 * - Ensures that the pool and user have sufficient balances before trading.
 * - Calls the on-chain checkLiquidity function.
 */
const liquidityCheck = async (req, res) => {
  try {
    const { walletAddress, direction, amount } = req.body;
    if (!walletAddress || !direction || !amount) {
      return res.status(400).json({ error: "Wallet address, direction, and amount are required." });
    }

    console.log("User provided wallet address:", walletAddress);

    // Convert user input amount into BigNumber format
    const amountBN = ethers.parseUnits(amount, 18);
    const isBuy = direction.toLowerCase() === 'buy';

    // Fetch balances
    const poolDRTBalance = await drTokenContract.balanceOf(POOL_ADDRESS);
    const poolWETHBalance = await wethTokenContract.balanceOf(POOL_ADDRESS);
    const userDRTBalance = await drTokenContract.balanceOf(walletAddress);
    const userWETHBalance = await wethTokenContract.balanceOf(walletAddress);

    // Convert balances to BigNumber
    const poolDRTBalanceBN = ethers.BigNumber.from(poolDRTBalance);
    const poolWETHBalanceBN = ethers.BigNumber.from(poolWETHBalance);
    const userDRTBalanceBN = ethers.BigNumber.from(userDRTBalance);
    const userWETHBalanceBN = ethers.BigNumber.from(userWETHBalance);

    // Log balances
    console.log("Pool DRT Balance:", ethers.formatUnits(poolDRTBalanceBN, 18));
    console.log("Pool WETH Balance:", ethers.formatUnits(poolWETHBalanceBN, 18));
    console.log("User's DRT Balance:", ethers.formatUnits(userDRTBalanceBN, 18));
    console.log("User's WETH Balance:", ethers.formatUnits(userWETHBalanceBN, 18));

    // Local balance checks
    if (isBuy) {
      if (poolDRTBalanceBN.lt(amountBN)) {
        return res.status(200).json({ status: "abort", message: "Insufficient DRT in pool for purchase." });
      }
      if (userWETHBalanceBN.lt(amountBN)) {
        return res.status(200).json({ status: "abort", message: "User has insufficient WETH for purchase." });
      }
    } else {
      if (poolWETHBalanceBN.lt(amountBN)) {
        return res.status(200).json({ status: "abort", message: "Insufficient WETH in pool for sale." });
      }
      if (userDRTBalanceBN.lt(amountBN)) {
        return res.status(200).json({ status: "abort", message: "User has insufficient DRT for sale." });
      }
    }

    // On-chain liquidity check
    const isLiquid = await drTradeContract.checkLiquidity(isBuy, amountBN);
    if (isLiquid) {
      console.log("On-chain liquidity check passed, trade can proceed.");
      return res.status(200).json({ status: "proceed" });
    } else {
      console.log("On-chain liquidity check failed, insufficient liquidity.");
      return res.status(200).json({ status: "abort", message: "On-chain liquidity check failed." });
    }
  } catch (error) {
    console.error("Liquidity check error:", error);
    return res.status(500).json({ error: "Liquidity check failed", details: error.message });
  }
};

/**
 * Execute Trade Function
 * - Calls the appropriate swap function depending on trade direction.
 */
const executeTrade = async (req, res) => {
  try {
    const { walletAddress, direction, amount } = req.body;
    if (!walletAddress || !direction || !amount) {
      return res.status(400).json({ error: "Wallet address, direction, and amount are required." });
    }

    const amountBN = ethers.parseUnits(amount, 18);
    const isBuy = direction.toLowerCase() === 'buy';
    let tx;

    if (isBuy) {
      // Swap WETH for DRTv1
      tx = await drTradeContract.swapExactWETHForDRTv1(amountBN);
    } else {
      // Swap DRTv1 for WETH
      tx = await drTradeContract.swapExactDRTv1ForWETH(amountBN);
    }

    await tx.wait();
    console.log("Trade executed successfully. Transaction hash:", tx.hash);
    return res.status(200).json({ status: "success", txHash: tx.hash });
  } catch (error) {
    console.error("Trade execution error:", error);
    return res.status(500).json({ error: "Trade execution failed", details: error.message });
  }
};

module.exports = { liquidityCheck, executeTrade };
