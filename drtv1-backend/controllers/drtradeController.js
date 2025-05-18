// controllers/drtradeController.js

require('dotenv').config();
const { ethers } = require('ethers');

// Load contract ABIs from JSON files (located in root/drtv1-backend/abi/)
const DRTRADE_ABI = require('../abi/DRTrade_abi.json');
const DRT_ABI = require('../abi/DRT_abi.json');
const WETH_ABI = require('../abi/WETH_abi.json');

// Contract addresses (from environment variables or fallback defaults)
const DRTRADE_ADDRESS = process.env.DRTRADE_CONTRACT_ADDRESS || "0xD0DC7f8935A661010D56A470eA81572a4a84EED4";
const DRT_TOKEN_ADDRESS = process.env.DRT_CONTRACT_ADDRESS || "0xYourDRTTokenAddress"; // Replace with your actual DRTv1 token address
const WETH_TOKEN_ADDRESS = process.env.WETH_CONTRACT_ADDRESS || "0xYourWETHTokenAddress"; // Replace with your actual WETH address
const POOL_ADDRESS = "0xe1c76fbf1b373165822b564c6f3accf78c5a344a"; // DRTv1/WETH Liquidity Pool address

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

// Create contract instances:
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
 * liquidityCheck - checks whether the user's requested amount of DRTv1 is available for trade.
 *
 * Expected input via req.body:
 *   - walletAddress: User's manually entered wallet address.
 *   - direction: "buy" or "sell".
 *   - amount: The DRTv1 token amount (human readable, e.g. "10.0") the user wishes to trade.
 *
 * This function logs:
 *   - The user-provided wallet address.
 *   - The pool's DRT and WETH balances (using the on-chain contracts).
 *   - The user's DRT and WETH balances.
 *
 * Local balance checks:
 *   - If buying: verifies that the pool has enough DRT AND the user has sufficient WETH.
 *   - If selling: verifies that the pool has enough WETH AND the user has sufficient DRT.
 *
 * Finally, it calls the on-chain `checkLiquidity` function on the DRTrade.sol contract.
 */
const liquidityCheck = async (req, res) => {
  try {
    const { walletAddress, direction, amount } = req.body;
    if (!walletAddress || !direction || !amount) {
      return res.status(400).json({ error: "Wallet address, direction and amount are required." });
    }
    
    console.log("User provided wallet address:", walletAddress);
    
    // Parse the human-readable amount into a BigNumber (assuming 18 decimals)
    const amountBN = ethers.parseUnits(amount, 18);
    const isBuy = direction.toLowerCase() === 'buy';
    
    // Retrieve and log pool balances
    const poolDRTBalance = await drTokenContract.balanceOf(POOL_ADDRESS);
    const poolWETHBalance = await wethTokenContract.balanceOf(POOL_ADDRESS);
    console.log("Pool DRT Balance:", ethers.formatUnits(poolDRTBalance, 18));
    console.log("Pool WETH Balance:", ethers.formatUnits(poolWETHBalance, 18));
    
    // Retrieve and log user's balances
    const userDRTBalance = await drTokenContract.balanceOf(walletAddress);
    const userWETHBalance = await wethTokenContract.balanceOf(walletAddress);
    console.log("User's DRT Balance:", ethers.formatUnits(userDRTBalance, 18));
    console.log("User's WETH Balance:", ethers.formatUnits(userWETHBalance, 18));
    
    // Local checks before calling the on-chain liquidity function.
    if (isBuy) {
      if (poolDRTBalance.lt(amountBN)) {
        return res.status(200).json({ status: "abort", message: "Insufficient DRT in pool for purchase." });
      }
      if (userWETHBalance.lt(amountBN)) { 
        return res.status(200).json({ status: "abort", message: "User has insufficient WETH for purchase." });
      }
    } else {
      if (poolWETHBalance.lt(amountBN)) {
        return res.status(200).json({ status: "abort", message: "Insufficient WETH in pool for sale." });
      }
      if (userDRTBalance.lt(amountBN)) {
        return res.status(200).json({ status: "abort", message: "User has insufficient DRT for sale." });
      }
    }
    
    // Perform on-chain liquidity check.
    const isLiquid = await drTradeContract.checkLiquidity(isBuy, amountBN);
    if (isLiquid) {
      console.log("On-chain check passed, liquidity is sufficient for trade.");
      return res.status(200).json({ status: "proceed" });
    } else {
      console.log("On-chain check failed, insufficient liquidity.");
      return res.status(200).json({ status: "abort", message: "On-chain liquidity check failed." });
    }
  } catch (error) {
    console.error("Liquidity check error:", error);
    return res.status(500).json({ error: "Liquidity check failed", details: error.message });
  }
};

/**
 * executeTrade - Executes the trade by calling the appropriate function on the DRTrade.sol contract.
 *
 * Expected input via req.body:
 *   - walletAddress: User's wallet address (for logging/recordkeeping)
 *   - direction: "buy" or "sell"
 *   - amount: The DRTv1 token amount (human-readable) to trade.
 *
 * Depending on the direction, it calls the corresponding swap function.
 */
const executeTrade = async (req, res) => {
  try {
    const { walletAddress, direction, amount } = req.body;
    if (!walletAddress || !direction || !amount) {
      return res.status(400).json({ error: "Wallet address, direction and amount are required." });
    }
    const amountBN = ethers.parseUnits(amount, 18);
    const isBuy = direction.toLowerCase() === 'buy';
    let tx;
    
    if (isBuy) {
      // For buying DRTv1, swap WETH for DRTv1.
      tx = await drTradeContract.swapExactWETHForDRTv1(amountBN);
    } else {
      // For selling DRTv1, swap DRTv1 for WETH.
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
