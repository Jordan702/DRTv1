require("dotenv").config();
const { vault, ethers } = require('../utils/web3');

// Buy DRTv1
exports.buyDRTv1 = async (req, res) => {
  try {
    const { userAddress, ethAmount } = req.body;

    // Validate input
    if (!ethAmount || isNaN(ethAmount) || parseFloat(ethAmount) <= 0) {
      return res.status(400).json({ success: false, error: "Invalid ETH amount" });
    }

    // Convert ETH amount to BigNumberish
    const parsedAmount = ethers.parseEther(ethAmount.toString());

    // Send transaction from backend signer
    const tx = await vault.buyDRTv1({ value: parsedAmount });
    const receipt = await tx.wait();

    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error("Buy error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Sell DRTv1
exports.sellDRTv1 = async (req, res) => {
  try {
    const { userAddress, tokenAmount } = req.body;

    if (!tokenAmount || isNaN(tokenAmount) || parseFloat(tokenAmount) <= 0) {
      return res.status(400).json({ success: false, error: "Invalid token amount" });
    }

    const parsedAmount = ethers.parseUnits(tokenAmount.toString(), 18);

    const tx = await vault.sellDRTv1(parsedAmount);
    const receipt = await tx.wait();

    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error("Sell error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
