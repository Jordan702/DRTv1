require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");

const DRTv2_ABI = [
  "function mint(address to, uint256 amount) external"
];

const DRTv2_ADDRESS = process.env.DRT_V2_CONTRACT_ADDRESS; 
const TOKEN_DECIMALS = 18;

// Handler for the single mint endpoint
const mintsETH = async (req, res) => {
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
    let mintAmount = ethers.parseUnits(amount.toString(), TOKEN_DECIMALS);

    const tx = await contract.mint(recipient, mintAmount);
    await tx.wait();

    console.log(`✅ Mint successful. TX Hash: ${tx.hash}`);
    return res.json({ txHash: tx.hash });

  } catch (err) {
    console.error("[MintController] Error:", err.message);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

// Handler for the batch mint endpoint
const doBatchMint = async (req, res) => {
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
};

module.exports = { mintsETH, doBatchMint };
