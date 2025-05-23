require("dotenv").config();
const { vault, ethers } = require('../utils/web3');

exports.buyDRTv1 = async (req, res) => {
  try {
    const { userAddress, ethAmount } = req.body;
    const tx = await vault.connect(userAddress).buyDRTv1({ value: ethers.parseEther(ethAmount) });
    const receipt = await tx.wait();
    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.sellDRTv1 = async (req, res) => {
  try {
    const { userAddress, tokenAmount } = req.body;
    const tx = await vault.connect(userAddress).sellDRTv1(ethers.parseUnits(tokenAmount, 18));
    const receipt = await tx.wait();
    res.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
