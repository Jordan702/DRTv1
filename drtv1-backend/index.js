// backend/index.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { ethers } = require('ethers');
const { Configuration, OpenAIApi } = require('openai');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.json());

// OpenAI setup
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

// Ethers setup
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);
const DRT_ABI = require('./DRT_abi.json');
const contract = new ethers.Contract(process.env.DRT_CONTRACT_ADDRESS, DRT_ABI, signer);

// POST endpoint for submission
app.post('/api/submit', upload.single('proof'), async (req, res) => {
  const { name, walletAddress, description } = req.body;
  const proofFile = req.file;

  try {
    if (!walletAddress || !description || !proofFile) {
      return res.status(400).json({ error: 'Missing required fields or file' });
    }

    // OCR on uploaded file
    const proofPath = path.resolve(__dirname, proofFile.path);
    const ocrResult = await Tesseract.recognize(proofPath, 'eng');
    const extractedText = ocrResult.data.text;
    fs.unlinkSync(proofPath); // Clean up uploaded file

    // Combine input for OpenAI
    const prompt = `Estimate the real-world contribution value (USD) based on this:
Description: ${description}
Document Data: ${extractedText}
Value:`;

    const aiResponse = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 10,
      temperature: 0.5,
    });

    let valueEstimate = parseFloat(aiResponse.data.choices[0].text.trim());
    if (isNaN(valueEstimate)) valueEstimate = 0;

    let tokensToMint = Math.min(valueEstimate / 1000, 100); // Cap at 100 DRT
    const mintAmount = ethers.parseUnits(tokensToMint.toString(), 18);

    const tx = await contract.mint(walletAddress, mintAmount);
    await tx.wait();

    res.json({
      message: `Minted ${tokensToMint} DRT to ${walletAddress}`,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Submission failed' });
  }
});

app.listen(3000, () => console.log('DRTv1 backend running on port 3000'));
