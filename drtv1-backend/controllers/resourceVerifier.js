require('dotenv').config({ path: './.env' });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ethers } = require('ethers');
const { evaluateResourcePrompt } = require('../services/openaiService');
const DRT_ABI = require('../DRT_abi.json');


const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const signer = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.DRT_CONTRACT_ADDRESS, DRT_ABI, signer);
// Track last submission per wallet (in-memory)
const lastSubmissionTime = {};
const SUBMISSION_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

// AI-based ETH converter
async function getEthValueOfDRT_AI(usdAmount) {
  const ethPrompt = `Return only the amount of ETH equivalent to $${usdAmount} using current real-world exchange rates. Return only the ETH number, no commentary.`;
  try {
    const ethEstimate = await evaluateResourcePrompt(ethPrompt);
    const match = ethEstimate.match(/[-+]?[0-9]*\.?[0-9]+/);
    return match ? ethers.parseEther(match[0]) : ethers.parseEther("0");
  } catch (err) {
    console.error("❌ AI ETH Conversion Failed:", err.message);
    return ethers.parseEther("0");
  }
}

// AI-based DRT token type resolver
async function getTokenTypeFromAI(description) {
  const tokenPrompt = `Based on the following description, return ONLY the token type: 1 for DRTv1 (direct labor), 2 for DRTv2 (impactful structures, large-scale, legacy projects). Description: "${description}"`;
  try {
    const typeResponse = await evaluateResourcePrompt(tokenPrompt);
    return typeResponse.includes("2") ? 2 : 1;
  } catch {
    return 1;
  }
}

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

    let fileHash;
    try {
      const fileBuffer = fs.readFileSync(proofPath);
      fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      console.log('🧬 File Hash:', fileHash);
    } catch (hashErr) {
      console.error('❌ Failed to hash uploaded file:', hashErr.message);
      return res.status(500).json({ error: 'Proof file processing failed', details: hashErr.message });
    }

    const logPath = path.resolve(__dirname, '../logs/submissions.json');
    let existingLogs = [];
    if (fs.existsSync(logPath)) {
      try {
        existingLogs = JSON.parse(fs.readFileSync(logPath));
        const duplicate = existingLogs.find(entry => entry.fileHash === fileHash);
        if (duplicate) {
          return res.status(400).json({ error: 'Duplicate submission detected. This proof has already been used.' });
        }
      } catch (logErr) {
        console.error('❌ Failed to read logs:', logErr.message);
        return res.status(500).json({ error: 'Server log read error', details: logErr.message });
      }
    }

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
    const DOLLAR_TO_WETH_RATIO = 1;
    const tokensToMint = Math.min(valueEstimate / DOLLAR_TO_WETH_RATIO, 100);
    const mintAmount = ethers.parseUnits(tokensToMint.toString(), 18);

    console.log(`💡 Value Estimate: $${valueEstimate}`);
    console.log(`🪙 Minting ${tokensToMint} WETH to ${walletAddress}...`);

    let tx;
    try {
      tx = await contract.mint(walletAddress, mintAmount);
      await tx.wait();
      console.log(`✅ Minted successfully. TX Hash: ${tx.hash}`);
    } catch (mintErr) {
      console.error('❌ Minting failed:', mintErr.message);
      return res.status(500).json({ error: 'Blockchain mint failed', details: mintErr.message });
    }

    // 🧠 AI-based ETH equivalent + token type
    const ethValue = await getEthValueOfDRT_AI(valueEstimate);
    const drtTokenType = await getTokenTypeFromAI(description);

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
