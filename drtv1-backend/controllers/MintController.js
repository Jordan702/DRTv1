// controllers/MintController.js
require("dotenv").config();
const { ethers } = require("ethers");

const DRTv1_ABI = [
  "function mint(address to, uint256 amount) external"
];

const DRTv1_ADDRESS = process.env.DRT_CONTRACT_ADDRESS; // Your deployed DRTv1 address

/**
 * Handles minting DRTv1 tokens
 * @param {Request} req 
 * @param {Response} res 
 */
async function mintDRTv1(req, res) {
  try {
    const { recipient, amount } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: "Recipient address and amount are required" });
    }

    // Get wallet and provider from middleware
    const { wallet, provider } = req;

    if (!wallet || !provider) {
      console.error("[MintController] Wallet or provider not initialized!");
      return res.status(500).json({ error: "Wallet or provider not initialized" });
    }

    console.log("[MintController] Wallet address:", wallet.address);
    console.log("[MintController] Preparing to mint", amount, "DRTv1 tokens to", recipient);

    // Connect to DRTv1 contract with signer
    const drtv1 = new ethers.Contract(DRTv1_ADDRESS, DRTv1_ABI, wallet);

    // Convert amount to BigNumber (assume 18 decimals)
    const mintAmount = ethers.BigNumber.from(amount.toString());

    console.log("[MintController] Sending mint transaction...");
    const tx = await drtv1.mint(recipient, mintAmount);

    console.log("[MintController] Transaction sent! Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("[MintController] Mint successful! TxHash:", receipt.transactionHash);
    res.json({ status: "ok", txHash: receipt.transactionHash });
  } catch (err) {
    console.error("[MintController] Minting error:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { mintDRTv1 };
