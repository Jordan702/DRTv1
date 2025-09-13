// root/drtv1-backend/controllers/MintController.js
require("dotenv").config();
const { ethers } = require("ethers");

const DRTv1_ABI = [
  "function mint(address to, uint256 amount) external"
];

const DRTv1_ADDRESS = process.env.DRTV1_ADDRESS; // Your deployed DRTv1 contract address

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

    // Get wallet and provider from req (attached in index.js middleware)
    const { wallet, provider } = req;
    if (!wallet || !provider) {
      return res.status(500).json({ error: "Wallet or provider not initialized" });
    }

    // Connect to the DRTv1 contract
    const drtv1 = new ethers.Contract(DRTv1_ADDRESS, DRTv1_ABI, wallet);

    // Send mint transaction
    const tx = await drtv1.mint(recipient, ethers.BigNumber.from(amount));
    console.log(`[MintController] Mint transaction sent. TxHash: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`[MintController] Mint transaction confirmed. BlockNumber: ${receipt.blockNumber}`);

    return res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      message: `Minted ${amount} DRTv1 to ${recipient}`
    });
  } catch (err) {
    console.error("[MintController] Minting error:", err);
    return res.status(500).json({ error: err.message || "Mint failed" });
  }
}

module.exports = { mintDRTv1 };
