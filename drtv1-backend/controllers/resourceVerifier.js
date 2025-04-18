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

    // 🔧 TEMP BYPASS for OCR
    const extractedText = '[TEMP] Proof of teaching English to children in Poland during a summer volunteer program.';
    console.log('🧠 [TEMP] Injected extracted text:', extractedText);

    let translatedOCR = '';
    try {
      const translationPrompt = `Translate the following text to English. Return only the translated version:\n\n"${extractedText}"`;
      translatedOCR = await evaluateResourcePrompt(translationPrompt);
      console.log('🌐 Translated OCR:', translatedOCR.substring(0, 200));
    } catch (translateErr) {
      console.error('❌ Translation Error:', translateErr.message);
      return res.status(500).json({ error: 'Translation failed', details: translateErr.message });
    }

    const prompt = `Based on this description and translated contribution proof, return ONLY the estimated USD value of this resource as a number (no symbols or commentary):\n\nDescription: "${description}"\n\nProof: "${translatedOCR}"`;

    let content = '';
    try {
      console.log('📤 Sending prompt to OpenAI...');
      content = await evaluateResourcePrompt(prompt);
      console.log('🧠 OpenAI raw response:', content);
      if (!content) throw new Error('No content returned from OpenAI');
    } catch (aiErr) {
      console.error('❌ OpenAI Error:', aiErr.message);
      return res.status(500).json({ error: 'AI evaluation failed', details: aiErr.message });
    }

    let valueEstimate = 0;
    const parsedFloat = parseFloat(content.trim());
    if (!isNaN(parsedFloat)) {
      valueEstimate = parsedFloat;
    } else {
      const match = content.match(/[-+]?[0-9]*\.?[0-9]+/);
      if (match) valueEstimate = parseFloat(match[0]);
    }
    if (isNaN(valueEstimate) || valueEstimate < 0) {
      console.warn('⚠️ Invalid or negative value. Defaulting to 0.');
      valueEstimate = 0;
    }

    const tokensToMint = Math.min((valueEstimate * 1000) / 100, 100);
    const mintAmount = ethers.parseUnits(tokensToMint.toString(), 18);

    console.log(`💡 Value Estimate: $${valueEstimate}`);
    console.log(`🪙 Minting ${tokensToMint} DRT to ${walletAddress}...`);

    let tx;
    try {
      tx = await contract.mint(walletAddress, mintAmount);
      await tx.wait();
      console.log(`✅ Minted successfully. TX Hash: ${tx.hash}`);
    } catch (mintErr) {
      console.error('❌ Minting failed:', mintErr.message);
      return res.status(500).json({ error: 'Blockchain mint failed', details: mintErr.message });
    }

    // Logging the successful mint
    const logPath = path.resolve(__dirname, '../logs/submissions.json');
    const newLogEntry = {
      walletAddress,
      valueEstimate,
      tokensToMint,
      description,
      translatedProof: translatedOCR.substring(0, 1000),
      timestamp: new Date().toISOString(),
      txHash: tx.hash
    };

    try {
      const existingLogs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
      existingLogs.push(newLogEntry);
      fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2));
      console.log('📝 Submission logged');
    } catch (logErr) {
      console.error('❌ Failed to write submission log:', logErr.message);
    }

    return res.json({
      message: `✅ Minted ${tokensToMint} DRT to ${walletAddress}`,
      txHash: tx.hash,
      openAiResponse: content
    });

  } catch (err) {
    console.error('❌ verifyAndMint FATAL ERROR:', err.message || err);
    return res.status(500).json({
      error: 'Submission failed',
      details: err.message || 'Unknown error'
    });
  }
}

module.exports = { verifyAndMint };

