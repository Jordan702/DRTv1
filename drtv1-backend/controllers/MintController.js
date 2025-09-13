require("dotenv").config();
const { ethers } = require("ethers");

const DRTv1_ABI = [
  "function mint(address to, uint256 amount) external"
];

const DRTv1_ADDRESS = process.env.DRT_CONTRACT_ADDRESS;

async function mintDRTv1(req, res) {
  try {
    const { recipient, amount } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: "Recipient address and amount are required" });
    }

    console.log(`[MintController] Preparing to mint ${amount} DRTv1 to ${recipient}...`);

    // ✅ Get wallet from middleware
    const { wallet } = req;
    if (!wallet) {
      return res.status(500).json({ error: "Wallet not initialized" });
    }

    // ✅ Connect contract with wallet (signer)
    const drtv1 = new ethers.Contract(DRTv1_ADDRESS, DRTv1_ABI, wallet);

    // ✅ Send mint transaction
    const tx = await drtv1.mint(recipient, ethers.BigNumber.from(amount));
    console.log("[MintController] Transaction sent:", tx.hash);

    // ✅ Wait for confirmation
    const receipt = await tx.wait();
    console.log("[MintController] Mint confirmed:", receipt.transactionHash);

    return res.json({ status: "ok", txHash: receipt.transactionHash });
  } catch (err) {
    console.error("[MintController] Minting error:", err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { mintDRTv1 };
