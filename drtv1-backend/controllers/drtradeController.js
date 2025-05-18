// controllers/drtradeController.js

require('dotenv').config();
const { ethers } = require('ethers');

// Addresses and ABI definitions
const DRTRADE_ADDRESS = "0xD0DC7f8935A661010D56A470eA81572a4a84EED4"; // DRTrade.sol contract address
// Note: The pool address (DRTv1/WETH) is embedded in the smart contract logic.
// Example DRTrade ABI (only the liquidity check function and swap functions are included here)
const DRTRADE_ABI = [
  // This function should be implemented in your DRTrade.sol.
  "function checkLiquidity(bool isBuy, uint256 amount) external view returns (bool)",
  // Swap functions (not used in this snippet but available for trade execution)
  "function swapExactDRTv1ForWETH(uint256 amountIn) external returns (uint256)",
  "function swapExactWETHForDRTv1(uint256 amountIn) external returns (uint256)"
];

// Setup a provider and a wallet to interact with the blockchain.
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);

// Create an instance of the DRTrade contract.
const drTradeContract = new ethers.Contract(DRTRADE_ADDRESS, DRTRADE_ABI, wallet);

/**
 * liquidityCheck - checks if the user's requested amount of DRTv1 is available for trade.
 *
 * Expected input (via req.body):
 *   - walletAddress: the user's manual input wallet address (used for logging/recordkeeping)
 *   - direction: either "buy" or "sell"
 *   - amount: the DRTv1 token amount (in human-readable format) the user wishes to trade
 *
 * If the on-chain liquidity check passes, the endpoint responds with { status: "proceed" }.
 * Otherwise, it responds with { status: "abort", message: "Insufficient liquidity, please try again later." }.
 */
const liquidityCheck = async (req, res) => {
  try {
    const { walletAddress, direction, amount } = req.body;

    if (!walletAddress || !direction || !amount) {
      return res.status(400).json({ error: "Wallet address, direction and amount are required." });
    }

    // Using ethers, parse the human-readable 'amount' into a BigNumber (assuming 18 decimals).
    const amountBN = ethers.parseUnits(amount, 18);

    // Determine if the user is buying or selling.
    // For buying: we expect the pool to have enough DRTv1 tokens available.
    // For selling: we need to verify that the pool holds enough ETH (routed from WETH).
    const isBuy = direction.toLowerCase() === 'buy';

    // Perform the trustless liquidity check by invoking the on-chain 'checkLiquidity' function.
    const isLiquid = await drTradeContract.checkLiquidity(isBuy, amountBN);

    if (isLiquid) {
      return res.status(200).json({ status: "proceed" });
    } else {
      return res.status(200).json({ status: "abort", message: "Insufficient liquidity, please try again later." });
    }
  } catch (error) {
    console.error("Liquidity check error:", error);
    return res.status(500).json({ error: "Liquidity check failed", details: error.message });
  }
};

module.exports = { liquidityCheck };
