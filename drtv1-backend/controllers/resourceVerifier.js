const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { ethers } = require('ethers');
const { evaluateResourcePrompt } = require('../services/openaiService');

const DRT_ABI = require('../DRT_abi.json');

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.DRT_CONTRACT_ADDRESS, DRT_ABI, signer);

async function verifyAndMint(req, res) {
  const { walletAddress, description } = req.body;
  const proofFile = req.file;

  try {
    if (!walletAddress || !description || !proofFile) {
      return res.status(400).json({ error: 'Missing required fields or file' });
    }

    const proofPath = path.resolve(__dirname, '../', proofFile.path);
    const ocrResult = await Tesseract.recognize(proofPath, 'eng');
    const extractedText = ocrResult.data.text;
    fs.unlinkSync(proofPath); // Clean up uploaded file

    const prompt = `Estimate the real-world contribution value (USD) based on this:
    Description: ${description}
    Document Data: ${extractedText}
    Value:`;

    const content = await evaluateResourcePrompt(prompt);
    let valueEstimate = parseFloat(content?.trim());
    if (isNaN(valueEstimate)) valueEstimate = 0;

    const tokensToMint = Math.min(valueEstimate / 1000, 100); // Cap at 100 DRT
    const mintAmount = ethers.parseUnits(tokensToMint.toString(), 18);

    const tx = await contract.mint(walletAddress, mintAmount);
    await tx.wait();

    res.json({
      message: `✅ Minted ${tokensToMint} DRT to ${walletAddress}`,
      txHash: tx.hash,
    });

  } catch (err) {
    console.error('❌ verifyAndMint error:', err);
    res.status(500).json({ error: 'Submission failed', details: err.message });
  }
}

module.exports = { verifyAndMint };
