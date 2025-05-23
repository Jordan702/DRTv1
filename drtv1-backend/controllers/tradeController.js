require("dotenv").config();
const { vault, ethers, signer } = require('../utils/web3');

exports.buyDRTv1 = async (req, res) => {
  try {
    const { userAddress, ethAmount } = req.body;

    // Call the smart contract's buyDRTv1 method from your signer
    const tx = await vault.connect(signer).buyDRTv1(userAddress, {
      value: ethers.parseEther(ethAmount.toString())
    });

    const receipt = await tx.wait();
    res.json({ success: true, txHash: receipt.hash });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.sellDRTv1 = async (req, res) => {
  try {
    const { userAddress, tokenAmount } = req.body;

    // Call the smart contract's sellDRTv1 method from your signer
    const tx = await vault.connect(signer).sellDRTv1(userAddress, ethers.parseUnits(tokenAmount.toString(), 18));

    const receipt = await tx.wait();
    res.json({ success: true, txHash: receipt.hash });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
