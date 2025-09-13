// root/drtv1-backend/controllers/MintController.js
require("dotenv").config();
const { ethers } = require("ethers");

// Minimal DRTv1 ABI
const DRTv1_ABI = [
  "function mint(address to, uint256 amount) external"
];

// Contract address from .env
const DRTv1_ADDRESS = process.env.DRT_CONTRACT_ADDRESS;

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

    console.log(`[MintController] Preparing to mint ${amount} DRTv1 to ${recipient}...`);

    // Get wallet and provider from middleware
    const { wallet, provider } = req;
    if (!wallet || !provider) {
      console.error("[MintController] Wallet or provider not initialized");
      return res.status(500).json({ error: "Wallet or provider not initialized" });
    }

    // Connect to DRTv1 contract with wallet as signer
    const drtv1 = new ethers.Contract(DRTv1_ADDRESS, DRTv1_ABI, wallet);

    console.log("[MintController] Sending mint transaction...");
    const tx = await drtv1.mint(recipient, ethers.BigNumber.from(amount));

    console.log(`[MintController] Transaction sent. Hash: ${tx.hash}`);
    await tx.wait();
    console.log("[MintController] Transaction confirmed!");

    return res.json({ status: "ok", txHash: tx.hash });
  } catch (err) {
    console.error("[MintController] Mint error:", err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { mintDRTv1 };
