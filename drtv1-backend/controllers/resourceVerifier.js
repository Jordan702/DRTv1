// backend/controllers/resourceVerifier.js

require('dotenv').config({ path: './.env' });

const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { ethers } = require('ethers');
const { evaluateResourcePrompt } = require('../services/openaiService');

const DRT_ABI = require('../DRT_abi.json');

const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const signer = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.DRT_CONTRACT_ADDRESS, DRT_ABI, signer);

// Async startup logs for debugging
(async () => {
  try {
    console.log("✅ Loaded contract from:", process.env.DRT_CONTRACT_ADDRESS);
    console.log("✅ Contract target address:", contract.target);
    console.log("✅ Signer address:", await signer.getAddress());
  } catch (err) {
    console.error("❌ Error during startup logs:", err);
  }
})();

async function verifyAndMint(req, res) {
  try {
    const { walletAddress, description } = req.body;
    const proofFile = req.file;

    if (!walletAddress || !description || !proofFile) {
      return res.status(400).json({ error: 'Missing required fields or file.' });
    }

    // Run OCR
    const proofPath = path.resolve(__dirname, '..', proofFile.path);
    const ocrResult = await Tesseract.recognize(proofPath, 'eng');
    const extractedText = ocrResult.data.text;
    fs.unlinkSync(proofPath); // Clean up uploaded file

    // Build and evaluate prompt
    const prompt = `Estimate the real-world contribution value (USD) based on this description: ${description}\n\n${extractedText}`;
    const content = await evaluateResourcePrompt(prompt);

    let valueEstimate = parseFloat(content?.trim());
    if (isNaN(valueEstimate)) valueEstimate = 0;

    const tokensToMint = Math.min((valueEstimate * 1000) / 100, 100); // Cap at 100 DRT
    const mintAmount = ethers.parseUnits(tokensToMint.toString(), 18);

    console.log(`🔍 Description: ${description}`);
    console.log(`📄 Extracted Text: ${extractedText.substring(0, 100)}...`);
    console.log(`💡 Estimated Value: $${valueEstimate}`);
    console.log(`🪙 Minting ${tokensToMint} DRT to ${walletAddress}`);

    const tx = await contract.mint(walletAddress, mintAmount);
    await tx.wait();

    return res.json({
      message: `✅ Minted ${tokensToMint} DRT to ${walletAddress}`,
      txHash: tx.hash
    });

  } catch (err) {
    console.error('❌ verifyAndMint ERROR:', err);
    return res.status(500).json({
      error: 'Submission failed',
      details: err?.message || 'Unknown error'
    });
  }
}

module.exports = { verifyAndMint };
