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

// Track last submission per wallet (in-memory)
const lastSubmissionTime = {};
const SUBMISSION_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

// Startup Debug Info
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
  console.log('🛂 verifyAndMint called');
  try {
    const { walletAddress, description } = req.body;
    const proofFile = req.file;

    console.log('🧾 Incoming Data:', { walletAddress, description, file: proofFile?.path });

    if (!walletAddress || !description || !proofFile) {
      return res.status(400).json({ error: 'Missing required fields or file.' });
    }

    // Cooldown check
    const now = Date.now();
    if (
      lastSubmissionTime[walletAddress] &&
      now - lastSubmissionTime[walletAddress] < SUBMISSION_COOLDOWN_MS
    ) {
      const waitTime = Math.ceil((SUBMISSION_COOLDOWN_MS - (now - lastSubmissionTime[walletAddress])) / 1000);
      return res.status(429).json({ error: `⏳ Please wait ${waitTime} seconds before submitting again.` });
    }
    lastSubmissionTime[walletAddress] = now;

    const proofPath = path.resolve(__dirname, '..', proofFile.path);
    console.log('📎 Proof path:', proofPath);

    let extractedText = '';
    try {
      const ocrResult = await Tesseract.recognize(proofPath, 'eng');
      extractedText = ocrResult.data.text;
      console.log('🧠 Extracted Text:', extractedText.substring(0, 200));
    } catch (ocrErr) {
      console.error('❌ OCR Error:', ocrErr);
      return res.status(500).json({ error: 'OCR failed', details: ocrErr.message });
    }

    const prompt = `Given this description and extracted text, return a single number (no symbols, no commentary). Description: "${description}"\n\nExtracted OCR: "${extractedText}"`;

    let content;
    try {
      console.log('📤 Sending prompt to OpenAI...');
      content = await evaluateResourcePrompt(prompt);
      console.log('🧠 OpenAI response:', content);
      if (!content) throw new Error('No content returned from OpenAI');
    } catch (aiErr) {
      console.error('❌ OpenAI Error:', aiErr);
      return res.status(500).json({ error: 'AI evaluation failed', details: aiErr.message });
    }

    let valueEstimate = parseFloat(content.trim());
    if (isNaN(valueEstimate) || valueEstimate < 0) {
      console.warn('⚠️ Invalid or negative value. Defaulting to 0.');
      valueEstimate = 0;
    }

    const tokensToMint = Math.min((valueEstimate * 1000) / 100, 100); // Cap at 100 DRT
    const mintAmount = ethers.parseUnits(tokensToMint.toString(), 18);

    console.log(`💡 Value Estimate: $${valueEstimate}`);
    console.log(`🪙 Minting ${tokensToMint} DRT to ${walletAddress}...`);

    try {
      const tx = await contract.mint(walletAddress, mintAmount);
      await tx.wait();
      console.log(`✅ Minted successfully. TX Hash: ${tx.hash}`);

      // Log submission to JSON file
      const logPath = path.resolve(__dirname, '../logs/submissions.json');
      const newLogEntry = {
        walletAddress,
        valueEstimate,
        tokensToMint,
        description,
        extractedText: extractedText.substring(0, 1000),
        timestamp: new Date().toISOString(),
        txHash: tx.hash
      };

      try {
        const existingLogs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
        existingLogs.push(newLogEntry);
        fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2));
        console.log('📝 Submission logged');
      } catch (logErr) {
        console.error('❌ Failed to write submission log:', logErr);
      }

      return res.json({
        message: `✅ Minted ${tokensToMint} DRT to ${walletAddress}`,
        txHash: tx.hash,
        openAiResponse: content
      });
    } catch (mintErr) {
      console.error('❌ Minting failed:', mintErr);
      return res.status(500).json({ error: 'Blockchain mint failed', details: mintErr.message });
    }

  } catch (err) {
    console.error('❌ verifyAndMint FATAL ERROR:', err);
    return res.status(500).json({
      error: 'Submission failed',
      details: err.message || 'Unknown error'
    });
  }
}

module.exports = { verifyAndMint };

