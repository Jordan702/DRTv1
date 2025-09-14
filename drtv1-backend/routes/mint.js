const express = require("express");
const { ethers } = require("ethers");

const router = express.Router();

const DRTv2_ABI = [
  "function mint(address to, uint256 amount) external"
];

const DRTv2_ADDRESS = process.env.DRT_V2_CONTRACT_ADDRESS; // Your DRTv2 contract address
const TOKEN_DECIMALS = 18;

// ---------- Single Mint (Endpoint: /api/mint) ----------
router.post("/", async (req, res) => {
  try {
    const { recipient, amount } = req.body;
    if (!recipient || !amount) {
      return res.status(400).json({ error: "Recipient address and amount are required" });
    }

    console.log(`[MintController] Preparing to mint ${amount} tokens to ${recipient}...`);

    const { wallet } = req;
    if (!wallet) {
      return res.status(500).json({ error: "Wallet not initialized on server" });
    }
    
    const contract = new ethers.Contract(DRTv2_ADDRESS, DRTv2_ABI, wallet);

    // This converts the user-provided amount (e.g., "100") to the smallest unit (100 * 10^18)
    let mintAmount = ethers.parseUnits(amount.toString(), TOKEN_DECIMALS);

    const tx = await contract.mint(recipient, mintAmount);
    await tx.wait();

    console.log(`✅ Mint successful. TX Hash: ${tx.hash}`);
    return res.json({ txHash: tx.hash });

  } catch (err) {
    console.error("[MintController] Error:", err.message);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ---------- Batch Mint (Endpoint: /api/mint/batch-mint) ----------
router.post("/batch-mint", async (req, res) => {
  try {
    const { recipient, times } = req.body;
    if (!recipient || !times) {
      return res.status(400).json({ error: "Recipient and times are required" });
    }

    const { wallet } = req;
    if (!wallet) {
      return res.status(500).json({ error: "Wallet not initialized on server" });
    }

    const contract = new ethers.Contract(DRTv2_ADDRESS, DRTv2_ABI, wallet);
    
    // The amount to mint per batch, which should be within the contract's limit.
    // We are using 99 to avoid the "Exceeds max mint limit" error.
    const batchAmount = ethers.parseUnits("99", TOKEN_DECIMALS);
    const txHashes = [];

    for (let i = 0; i < times; i++) {
      console.log(`[BatchMint] Minting batch ${i + 1}/${times}...`);
      const tx = await contract.mint(recipient, batchAmount);
      const receipt = await tx.wait();
      txHashes.push(receipt.hash);
      console.log(`✅ Minted 99 tokens (batch ${i + 1}/${times}) - TxHash: ${receipt.hash}`);
    }

    return res.json({ success: true, txHashes });

  } catch (err) {
    console.error("[BatchMint] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
